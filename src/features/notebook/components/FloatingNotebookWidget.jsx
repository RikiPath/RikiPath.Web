import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ExternalLink,
  FilePenLine,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  Button,
  ContextualErrorState,
  EmptyState,
  Field,
  IconButton,
  Input,
  SearchInput,
  SkeletonText,
  Tabs,
  Textarea,
  confirmAction,
  cx,
  notify,
  useDebouncedValue,
  useUnsavedGuard,
} from '@/components/ui';
import { DraggableFloatingDock, useOptionalFloatingWidgets } from '@/features/floating-widgets';
import { StudyIllustration } from '@/features/landing/components/StudyIllustrations.jsx';
import { getNotebookPage, searchNotebook } from '@/features/notebook/api/notebookApi.js';
import { NOTEBOOK_PAGE_QUERY_KEY } from '@/features/notebook/hooks/useSmartNotebook.js';
import {
  computeContentVersionHash,
  getHighlightColorMeta,
  isActiveExamAttemptInDom,
  normalizeRichDocument,
  serializeRichDocument,
} from '@/features/notebook/utils/notebookModel.js';
import { useOptionalSmartNotebook } from '@/features/notebook/context/smartNotebookState.js';
import CascadingLocationPicker from './CascadingLocationPicker.jsx';
import NotebookRichEditor from './NotebookRichEditor.jsx';

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 640;
const PANEL_EXIT_MS = 180;
const RECENT_LIMIT = 6;
const EMPTY_COMPOSE = { fileId: null, title: '', body: '', error: '' };
const EMPTY_PAGE_DRAFT = { pageId: null, title: '', doc: null, dirty: false, baseRevision: null };

function byRecent(a, b) {
  return String(b.modifiedDate || b.lastAutosavedAtUtc || b.createdDate || '')
    .localeCompare(String(a.modifiedDate || a.lastAutosavedAtUtc || a.createdDate || ''));
}

/** Pages always open the existing Notebook V3 page by id — never a copy. */
function notebookPageHref(pageId) {
  return `/kanji-notebook/?pageId=${encodeURIComponent(pageId)}`;
}

function errorCodeOf(err) {
  return String(err?.data?.errorCode || err?.errorCode || '');
}

const NARROW_QUERY = '(max-width: 639px)';
function subscribeNarrow(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useIsNarrow() {
  return useSyncExternalStore(
    subscribeNarrow,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(NARROW_QUERY).matches : false),
    () => false,
  );
}

/**
 * Global Floating "Sổ tay nhanh" for Learner pages: a compact surface over the SAME Notebook V3 data
 * (Folder → File → Page → Saved Item) and the SAME queries/mutations as Sổ tay cá nhân, so both views
 * stay in sync without F5. Views: home (search, recent, favourites, highlights) → compose (new page) →
 * page (view & edit with the shared rich editor, revision-checked save).
 */
export default function FloatingNotebookWidget() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nb = useOptionalSmartNotebook();
  const widgetManager = useOptionalFloatingWidgets();
  const isNarrow = useIsNarrow();
  const panelId = useId();

  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  const [view, setView] = useState({ name: 'home', pageId: null });
  const [activeTab, setActiveTab] = useState('recent');
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState(EMPTY_COMPOSE);
  const [pageDraft, setPageDraft] = useState(EMPTY_PAGE_DRAFT);

  const isOpen = Boolean(nb?.drawerOpen);
  const composeDirty = Boolean(compose.title.trim() || compose.body.trim());
  const dirty = composeDirty || pageDraft.dirty;
  const { confirmLeave } = useUnsavedGuard(dirty, {
    title: tr('Bỏ ghi chú chưa lưu?'),
    description: tr('Nội dung bạn đang viết trong Sổ tay nhanh chưa được lưu.'),
    confirmLabel: tr('Bỏ thay đổi'),
    cancelLabel: tr('Tiếp tục viết'),
  });

  // Keep the panel mounted briefly after closing so it fades/scales out instead of vanishing.
  const [rendered, setRendered] = useState(isOpen);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setRendered(true);
  }
  useEffect(() => {
    if (isOpen || !rendered) return undefined;
    const t = window.setTimeout(() => setRendered(false), PANEL_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [isOpen, rendered]);

  const folders = useMemo(() => nb?.folders || [], [nb?.folders]);
  const notePages = useMemo(() => nb?.notePages || [], [nb?.notePages]);
  const recentPages = useMemo(() => [...notePages].sort(byRecent).slice(0, RECENT_LIMIT), [notePages]);
  const favoritePages = useMemo(
    () => notePages
      .filter((p) => p.isFavorite)
      .sort((a, b) => String(b.favoritedAtUtc || '').localeCompare(String(a.favoritedAtUtc || ''))),
    [notePages],
  );

  // Default save location: "Sổ tay chung" default file, else the file of the most recently edited page.
  const defaultFileId = useMemo(() => {
    const files = nb?.allFiles || [];
    return (files.find((f) => f.isDefault) || files.find((f) => f.id === recentPages[0]?.fileId) || null)?.id ?? null;
  }, [nb?.allFiles, recentPages]);

  const currentHighlights = useMemo(() => {
    const rawElements = typeof document !== 'undefined'
      ? [...document.querySelectorAll('[data-notebook-content-id]')].reduce((acc, el) => {
          const cid = el.getAttribute('data-notebook-content-id');
          const txt = el.getAttribute('data-notebook-raw-text') || '';
          if (cid && txt) acc.set(cid, computeContentVersionHash(txt));
          return acc;
        }, new Map())
      : new Map();
    return (nb?.pageHighlights || []).map((h) => {
      const liveHash = h.contentId ? rawElements.get(h.contentId) : null;
      return { ...h, versionStale: Boolean(h.contentVersion && liveHash && liveHash !== h.contentVersion) };
    });
  }, [nb?.pageHighlights]);

  const panelPlacement = useMemo(() => {
    if (!rendered || !widgetManager || isNarrow) return null;
    return widgetManager.getPanelPlacement('notebook', { width: PANEL_WIDTH, height: PANEL_HEIGHT });
  }, [rendered, widgetManager, isNarrow]);

  const setOpen = nb?.setDrawerOpen;

  // Closing keeps drafts in memory (reopening restores them); only an explicit close asks first.
  const guardedClose = useCallback(async ({ returnFocus = true } = {}) => {
    if (!setOpen) return;
    if (dirty && !(await confirmLeave())) return;
    if (dirty) {
      setCompose(EMPTY_COMPOSE);
      setPageDraft(EMPTY_PAGE_DRAFT);
      setView({ name: 'home', pageId: null });
    }
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, [dirty, confirmLeave, setOpen]);

  // Focus enters the panel once per opening only (never again while the learner is typing).
  useEffect(() => {
    if (!isOpen) return undefined;
    const focusTimer = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  // Escape / click-outside close (popover rules), guarded against losing unsaved text.
  useEffect(() => {
    if (!isOpen || !setOpen) return undefined;
    const blockingLayer = '[role="dialog"][aria-modal="true"], [role="alertdialog"]';
    const onKey = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector(blockingLayer)) return;
      guardedClose({ returnFocus: true });
    };
    const onDown = (event) => {
      const target = event.target;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      if (target?.closest?.(`[data-rp-floating-portal="true"], ${blockingLayer}, [data-rp-toast]`)) return;
      guardedClose({ returnFocus: false });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [isOpen, setOpen, guardedClose]);

  if (!nb?.isLearner || !nb?.notebookAvailable || !nb?.policy?.bubbleAllowed || isActiveExamAttemptInDom()) return null;

  // Hide inside Sổ tay cá nhân itself so we don't float over the full workspace.
  const cleanPath = String(pathname || '').replace(/\/+$/, '') || '/';
  if (cleanPath === '/kanji-notebook') return null;


  async function goHome() {
    if (view.name === 'page' && pageDraft.dirty && !(await confirmLeave())) return;
    if (view.name === 'compose' && composeDirty && !(await confirmLeave())) return;
    if (view.name === 'page') setPageDraft(EMPTY_PAGE_DRAFT);
    if (view.name === 'compose') setCompose(EMPTY_COMPOSE);
    setView({ name: 'home', pageId: null });
  }

  function openPage(pageId) {
    if (pageDraft.pageId !== pageId) setPageDraft(EMPTY_PAGE_DRAFT);
    setView({ name: 'page', pageId });
  }

  function startCompose() {
    setCompose((c) => (c.fileId ? c : { ...c, fileId: defaultFileId }));
    setView({ name: 'compose', pageId: null });
  }

  async function openInFullNotebook(pageId) {
    if (dirty && !(await confirmLeave())) return;
    setCompose(EMPTY_COMPOSE);
    setPageDraft(EMPTY_PAGE_DRAFT);
    setView({ name: 'home', pageId: null });
    nb.setDrawerOpen(false);
    navigate(pageId ? notebookPageHref(pageId) : '/kanji-notebook/');
  }

  const headerTitle = view.name === 'compose' ? tr('Ghi chú mới') : view.name === 'page' ? tr('Trang ghi chú') : tr('Sổ tay nhanh');
  const panelStyle = panelPlacement ? {
    position: 'fixed',
    left: `${panelPlacement.left}px`,
    top: `${panelPlacement.top}px`,
    width: `${panelPlacement.width}px`,
    height: `${Math.min(PANEL_HEIGHT, panelPlacement.maxHeight)}px`,
    zIndex: 68,
  } : undefined;

  return (
    <div data-notebook-ignore="true">
      {rendered && (
        <section
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={tr('Sổ tay nhanh')}
          tabIndex={-1}
          style={panelStyle}
          className={cx(
            'pointer-events-auto flex flex-col overflow-hidden border border-[var(--rp-popup-border)] bg-[var(--rp-popup-bg)] text-rp-text shadow-[var(--rp-popup-shadow)] outline-none',
            isOpen ? 'rp-anim-mini-panel-in' : 'rp-anim-mini-panel-out pointer-events-none',
            panelPlacement
              ? 'rounded-2xl'
              : isNarrow
                ? 'fixed inset-x-2 bottom-2 z-[68] h-[min(640px,86dvh)] rounded-2xl'
                : 'fixed bottom-28 right-5 z-[68] h-[min(640px,80vh)] w-[420px] rounded-2xl',
          )}
        >
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--rp-popup-divider)] bg-[var(--rp-popup-header-bg)] px-3">
            {view.name !== 'home' ? (
              <IconButton size="sm" icon={ArrowLeft} label={tr('Quay lại')} onClick={goHome} />
            ) : (
              <span className="ml-1 shrink-0"><StudyIllustration name="notebook" size={30} /></span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[14.5px] font-bold text-rp-text">{headerTitle}</h2>
              {view.name === 'home' && (
                <p className="truncate text-[11.5px] text-rp-text-muted">
                  {trf('{0} trang · {1} mục đã lưu', {
                    0: nb.stats?.totalPages ?? notePages.length,
                    1: nb.stats?.totalSavedItems ?? 0,
                  })}
                </p>
              )}
            </div>
            {widgetManager && view.name === 'home' && !isNarrow && (
              <IconButton size="sm" icon={RotateCcw} label={tr('Đặt lại vị trí')} onClick={() => widgetManager.resetPositions()} />
            )}
            <IconButton size="sm" icon={X} label={tr('Đóng')} onClick={() => guardedClose({ returnFocus: true })} />
          </header>

          {view.name === 'home' && (
            <MiniHome
              nb={nb}
              search={search}
              onSearch={setSearch}
              activeTab={activeTab}
              onTab={setActiveTab}
              recentPages={recentPages}
              favoritePages={favoritePages}
              highlights={currentHighlights}
              onCompose={startCompose}
              onOpenPage={openPage}
              onOpenFull={() => openInFullNotebook(null)}
            />
          )}
          {view.name === 'compose' && (
            <MiniCompose
              nb={nb}
              folders={folders}
              hasFiles={(nb.allFiles || []).length > 0}
              compose={compose}
              onChange={setCompose}
              onCancel={goHome}
              onCreated={(page) => {
                setCompose(EMPTY_COMPOSE);
                if (page?.id) openPage(page.id);
                else setView({ name: 'home', pageId: null });
              }}
              onOpenFull={() => openInFullNotebook(null)}
            />
          )}
          {view.name === 'page' && view.pageId && (
            <MiniPageEditor
              nb={nb}
              pageId={view.pageId}
              draft={pageDraft}
              onDraft={setPageDraft}
              onOpenFull={() => openInFullNotebook(view.pageId)}
              onMissing={() => {
                setPageDraft(EMPTY_PAGE_DRAFT);
                setView({ name: 'home', pageId: null });
              }}
            />
          )}
        </section>
      )}

      {/* Draggable Sakura 3D Notebook bubble */}
      <DraggableFloatingDock
        widgetId="notebook"
        order={0}
        zIndex={65}
        fallbackClassName="fixed bottom-4 right-4 sm:bottom-5 sm:right-5"
        ariaLabel={tr('Kéo để di chuyển nút Sổ tay')}
        onDragStateChange={(isDragging) => {
          if (isDragging && isOpen) nb.setDrawerOpen(false);
        }}
      >
        {({ dragging }) => (
          <button
            ref={triggerRef}
            type="button"
            data-testid="floating-notebook-bubble"
            aria-label={tr('Mở Sổ tay nhanh')}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            aria-haspopup="dialog"
            onClick={() => (isOpen ? guardedClose({ returnFocus: false }) : nb.setDrawerOpen(true))}
            className={cx(
              'rp-focus group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border bg-white transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none sm:h-[72px] sm:w-[72px]',
              isOpen ? 'border-rp-brand-border ring-2 ring-rp-brand-border/70' : 'border-rp-brand-border/50',
              dragging
                ? 'scale-105 shadow-[0_18px_36px_-10px_rgba(204,75,107,0.45)]'
                : 'shadow-[0_10px_26px_-10px_rgba(204,75,107,0.38)] hover:scale-105 hover:shadow-[0_16px_34px_-10px_rgba(204,75,107,0.48)] active:scale-95',
            )}
          >
            {/* Soft Sakura glow that blooms behind the notebook on hover/focus */}
            <span aria-hidden="true" className="rp-notebook-bubble-glow pointer-events-none absolute inset-1 rounded-full" />
            <StudyIllustration
              name="notebook"
              size={62}
              className="rp-notebook-bubble-icon pointer-events-none relative h-12 w-12 select-none sm:h-[62px] sm:w-[62px]"
            />
            {dirty && !isOpen && (
              <span aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500" />
            )}
          </button>
        )}
      </DraggableFloatingDock>
    </div>
  );
}

/* ------------------------------------------------------------------ Home */

function PageRow({ page, onOpen }) {
  const { tr, trf } = useLocale();
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(page.id)}
        className="rp-focus group flex w-full items-start gap-3 rounded-xl border border-rp-line bg-white px-3 py-2.5 text-left transition-colors hover:border-rp-brand-border hover:bg-[#FFF8FA]"
      >
        <FilePenLine aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-pressed" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="rp-jp truncate text-[13.5px] font-semibold text-rp-text">{page.title}</span>
            {page.isFavorite && <Star aria-label={tr('Trang yêu thích')} className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />}
          </span>
          <span className="block truncate text-[11.5px] text-rp-text-muted">
            {page.fileName}
            {(page.savedItemCount ?? 0) > 0 ? ` · ${trf('{0} mục đã lưu', { 0: page.savedItemCount })}` : ''}
          </span>
          {page.excerpt && <span className="rp-jp mt-0.5 block truncate text-[12px] text-rp-text-2">{page.excerpt}</span>}
        </span>
        <ArrowRight aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </button>
    </li>
  );
}

function MiniHome({ nb, search, onSearch, activeTab, onTab, recentPages, favoritePages, highlights, onCompose, onOpenPage, onOpenFull }) {
  const { tr } = useLocale();
  const debounced = useDebouncedValue(search.trim(), 300);
  const searching = debounced.length > 0;

  const searchQuery = useQuery({
    queryKey: ['notebook-search', nb.uid, debounced],
    queryFn: () => searchNotebook(debounced, 20),
    enabled: searching,
    staleTime: 15_000,
  });

  const tabs = [
    { id: 'recent', label: tr('Gần đây') },
    { id: 'favorites', label: tr('Yêu thích'), count: favoritePages.length },
    ...(highlights.length > 0 ? [{ id: 'highlights', label: tr('Highlight'), count: highlights.length }] : []),
  ];
  const tab = tabs.some((t) => t.id === activeTab) ? activeTab : 'recent';
  const treeLoading = nb.treeQuery?.isPending;
  const treeError = nb.treeQuery?.isError ? nb.treeQuery.error : null;
  const listPages = tab === 'favorites' ? favoritePages : recentPages;

  return (
    <>
      <div className="shrink-0 space-y-3 border-b border-rp-line px-4 py-3">
        <SearchInput
          value={search}
          onChange={(e) => onSearch(typeof e === 'string' ? e : (e?.target?.value ?? ''))}
          onClear={() => onSearch('')}
          placeholder={tr('Tìm trang hoặc mục đã lưu…')}
          aria-label={tr('Tìm trong Sổ tay')}
        />
        {!searching && (
          <Button type="button" variant="primary" size="md" icon={Plus} className="w-full" onClick={onCompose}>
            {tr('Ghi chú mới')}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {searching ? (
          <MiniSearchResults query={searchQuery} onOpenPage={onOpenPage} />
        ) : (
          <div className="space-y-3">
            <Tabs variant="pill" tone="segmented" size="sm" fullWidth label={tr('Sổ tay nhanh')} value={tab} onChange={onTab} tabs={tabs} />
            {treeLoading ? (
              <SkeletonText lines={4} />
            ) : treeError ? (
              <ContextualErrorState
                variant="inline"
                compact
                error={treeError}
                title={tr('Chưa tải được Sổ tay cá nhân')}
                onRetry={() => nb.treeQuery.refetch()}
              />
            ) : tab === 'highlights' ? (
              <ul className="space-y-2">
                {highlights.map((h) => (
                  <HighlightRow key={h.isBackendHighlight && h.highlightId ? `hl-${h.highlightId}` : h.noteEntryId} h={h} nb={nb} />
                ))}
              </ul>
            ) : listPages.length === 0 ? (
              <EmptyState
                variant="inline"
                size="sm"
                illustration="flashcard"
                title={tab === 'favorites' ? tr('Chưa có trang yêu thích nào') : tr('Chưa có trang ghi chú nào')}
                description={tab === 'favorites'
                  ? tr('Nhấn biểu tượng ngôi sao ở đầu trang ghi chú để ghim trang quan trọng tại đây.')
                  : tr('Bấm “Ghi chú mới” để tạo trang đầu tiên.')}
                className="w-full border border-dashed border-rp-line"
              />
            ) : (
              <ul className="space-y-2">
                {listPages.map((page) => <PageRow key={page.id} page={page} onOpen={onOpenPage} />)}
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-rp-line px-4 py-3">
        <Button type="button" variant="secondary" size="md" iconRight={ExternalLink} className="w-full" onClick={onOpenFull}>
          {tr('Mở Sổ tay đầy đủ')}
        </Button>
      </footer>
    </>
  );
}

function MiniSearchResults({ query, onOpenPage }) {
  const { tr } = useLocale();
  if (query.isPending) return <SkeletonText lines={4} />;
  if (query.isError) {
    return (
      <ContextualErrorState variant="inline" compact error={query.error} title={tr('Không thể tìm kiếm lúc này')} onRetry={() => query.refetch()} />
    );
  }
  const pages = query.data?.pages || [];
  const items = (query.data?.savedItems || []).filter((it) => it.notebookPageId);
  if (pages.length === 0 && items.length === 0) {
    return (
      <EmptyState
        variant="inline"
        size="sm"
        illustration="search"
        title={tr('Không tìm thấy kết quả phù hợp')}
        description={tr('Thử từ khóa ngắn hơn hoặc tên trang khác.')}
        className="w-full border border-dashed border-rp-line"
      />
    );
  }
  return (
    <div className="space-y-4">
      {pages.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11.5px] font-bold uppercase tracking-wide text-rp-text-muted">{tr('Trang')}</h3>
          <ul className="space-y-2">{pages.map((p) => <PageRow key={p.id} page={p} onOpen={onOpenPage} />)}</ul>
        </section>
      )}
      {items.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11.5px] font-bold uppercase tracking-wide text-rp-text-muted">{tr('Mục đã lưu')}</h3>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.noteEntryId || it.id}>
                <button
                  type="button"
                  onClick={() => onOpenPage(it.notebookPageId)}
                  className="rp-focus flex w-full items-start gap-3 rounded-xl border border-rp-line bg-white px-3 py-2.5 text-left hover:border-rp-brand-border hover:bg-[#FFF8FA]"
                >
                  <Bookmark aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-pressed" />
                  <span className="min-w-0 flex-1">
                    <span className="rp-jp block truncate text-[13.5px] font-semibold text-rp-text">{it.word || it.term}</span>
                    <span className="block truncate text-[12px] text-rp-text-2">{it.meaning}</span>
                    {it.notebookPageTitle && <span className="block truncate text-[11.5px] text-rp-text-muted">{it.notebookPageTitle}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Compose */

function MiniCompose({ nb, folders, hasFiles, compose, onChange, onCancel, onCreated, onOpenFull }) {
  const { tr } = useLocale();
  const pending = nb.createPage.isPending;
  const patch = (next) => onChange((c) => ({ ...c, ...next }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const title = compose.title.trim();
    const body = compose.body.trim();
    if (!compose.fileId) {
      patch({ error: tr('Vui lòng chọn tệp ghi chú.') });
      return;
    }
    if (!title && !body) {
      patch({ error: tr('Hãy nhập tiêu đề hoặc nội dung ghi chú.') });
      return;
    }
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      const created = await nb.createPage.mutateAsync({
        fileId: Number(compose.fileId),
        title: (title || `${tr('Ghi chú nhanh')} ${stamp}`).slice(0, 200),
        contentJson: body ? serializeRichDocument(normalizeRichDocument(body)) : null,
        sourcePath: nb.currentUrlKey || null,
        sourceTitle: document.title?.replace(/\s*\|\s*RikiPath.*$/, '') || null,
      });
      notify.success(tr('Đã lưu ghi chú vào Sổ tay'), created?.title || title, { key: 'nb-floating-save' });
      onCreated(created);
    } catch (err) {
      if (errorCodeOf(err) === 'NOTEBOOK_PAGE_DUPLICATE') {
        patch({ error: tr('Tên này đã tồn tại ở cùng vị trí. Hãy chọn tên khác.') });
        return;
      }
      notify.apiError(err, tr('Chưa lưu được ghi chú'), { key: 'nb-floating-err' });
    }
  }

  if (!hasFiles) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <EmptyState
          variant="inline"
          size="sm"
          illustration="flashcard"
          title={tr('Chưa có tệp ghi chú để lưu')}
          description={tr('Hãy mở Sổ tay và tạo tệp trước.')}
          className="w-full"
        />
        <Button type="button" variant="primary" size="md" onClick={onOpenFull}>{tr('Mở Sổ tay')}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4">
        <Field label={tr('Lưu vào tệp')} required>
          {({ id }) => (
            <CascadingLocationPicker
              id={id}
              folders={folders}
              level="file"
              value={compose.fileId}
              onChange={(fileId) => patch({ fileId, error: '' })}
            />
          )}
        </Field>
        <Field label={tr('Tiêu đề trang')} error={compose.error}>
          {({ id }) => (
            <Input
              id={id}
              value={compose.title}
              maxLength={200}
              autoFocus
              onChange={(e) => patch({ title: e.target.value, error: '' })}
              placeholder={tr('Ví dụ: Bài 1 – Từ vựng')}
            />
          )}
        </Field>
        <Field label={tr('Nội dung')}>
          {({ id }) => (
            <Textarea
              id={id}
              rows={7}
              value={compose.body}
              maxLength={4000}
              onChange={(e) => patch({ body: e.target.value, error: '' })}
              placeholder={tr('Viết ghi chú nhanh tại bài học này (không mất vị trí cuộn)…')}
              className="min-h-[160px] resize-y"
            />
          )}
        </Field>
      </div>
      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-rp-line px-4 py-3">
        <Button type="button" variant="secondary" size="md" disabled={pending} onClick={onCancel}>{tr('Hủy')}</Button>
        <Button type="submit" variant="primary" size="md" icon={Save} loading={pending} disabled={pending}>{tr('Lưu ghi chú')}</Button>
      </footer>
    </form>
  );
}

/* ------------------------------------------------------------------ Page view / edit */

function MiniPageEditor({ nb, pageId, draft, onDraft, onOpenFull, onMissing }) {
  const { tr } = useLocale();
  const [conflict, setConflict] = useState(false);
  const pageQuery = useQuery({
    queryKey: [NOTEBOOK_PAGE_QUERY_KEY, nb.uid, Number(pageId)],
    queryFn: () => getNotebookPage(pageId),
    enabled: Boolean(pageId),
    staleTime: 20_000,
  });
  const detail = pageQuery.data;
  const ownDraft = draft.pageId === pageId && draft.dirty;
  const title = ownDraft ? draft.title : (detail?.title || '');
  const doc = ownDraft ? draft.doc : (detail ? normalizeRichDocument(detail.contentJson || detail.contentPlainText || '', { ensureNonEmpty: true }) : null);
  const baseRevision = ownDraft ? draft.baseRevision : detail?.revision;
  const saving = nb.updatePage.isPending;

  function edit(next) {
    onDraft({
      pageId,
      title: next.title ?? title,
      doc: next.doc ?? doc,
      dirty: true,
      baseRevision: ownDraft ? draft.baseRevision : detail?.revision ?? null,
    });
  }

  async function save() {
    if (!ownDraft || saving) return;
    try {
      await nb.updatePage.mutateAsync({
        pageId,
        title: title.trim() || tr('Trang không tiêu đề'),
        contentJson: serializeRichDocument(doc),
        expectedRevision: draft.baseRevision,
      });
      setConflict(false);
      onDraft({ pageId: null, title: '', doc: null, dirty: false, baseRevision: null });
      notify.success(tr('Đã lưu thay đổi'), '', { key: 'nb-mini-page-saved' });
    } catch (err) {
      const code = errorCodeOf(err);
      if (code === 'NOTEBOOK_REVISION_CONFLICT') {
        setConflict(true);
        return;
      }
      if (code === 'NOTEBOOK_PAGE_DUPLICATE') {
        notify.error(tr('Tên này đã tồn tại ở cùng vị trí. Hãy chọn tên khác.'), '', { key: 'nb-mini-page-dup' });
        return;
      }
      notify.apiError(err, tr('Chưa lưu được thay đổi'));
    }
  }

  async function reloadLatest() {
    const ok = await confirmAction({
      title: tr('Tải bản mới nhất?'),
      description: tr('Thay đổi chưa lưu trong Sổ tay nhanh sẽ bị thay thế bằng nội dung mới nhất.'),
      confirmLabel: tr('Tải bản mới nhất'),
      cancelLabel: tr('Hủy'),
      tone: 'warning',
    });
    if (!ok) return;
    onDraft({ pageId: null, title: '', doc: null, dirty: false, baseRevision: null });
    setConflict(false);
    await pageQuery.refetch();
  }

  if (pageQuery.isPending) {
    return <div className="flex-1 px-4 py-4"><SkeletonText lines={6} /></div>;
  }
  if (pageQuery.isError || !detail) {
    const notFound = pageQuery.error?.status === 404;
    return (
      <div className="flex-1 space-y-3 px-4 py-4">
        <ContextualErrorState
          variant="inline"
          compact
          error={pageQuery.error}
          title={notFound ? tr('Không tìm thấy trang ghi chú này') : tr('Chưa tải được trang ghi chú')}
          onRetry={notFound ? undefined : () => pageQuery.refetch()}
        />
        <Button type="button" variant="secondary" size="md" className="w-full" onClick={onMissing}>{tr('Quay lại')}</Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <p className="mb-1 truncate text-[11.5px] text-rp-text-muted">{`${detail.folderName} › ${detail.fileName}`}</p>
        <div className="flex items-start gap-2">
          <input
            type="text"
            value={title}
            maxLength={200}
            aria-label={tr('Tiêu đề trang ghi chú')}
            onChange={(e) => edit({ title: e.target.value })}
            placeholder={tr('Tiêu đề trang…')}
            className="rp-focus rp-jp h-10 min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 text-[17px] font-bold text-rp-text transition-colors hover:bg-rp-bg-2 focus:border-rp-brand-border focus:bg-white"
          />
          <IconButton
            size="md"
            variant="outline"
            icon={Star}
            label={detail.isFavorite ? tr('Bỏ yêu thích') : tr('Đánh dấu yêu thích')}
            onClick={() => nb.toggleFavoritePage.mutateAsync({ pageId: detail.id, isFavorite: !detail.isFavorite })}
            className={detail.isFavorite ? 'border-amber-200 bg-amber-50 text-amber-600 [&>svg]:fill-amber-400' : ''}
          />
        </div>

        {conflict && (
          <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            <span className="flex items-center gap-1.5">
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {tr('Trang này vừa được cập nhật từ nơi khác. Tải bản mới nhất để tránh ghi đè.')}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={reloadLatest}>{tr('Tải bản mới nhất')}</Button>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-rp-line">
          <NotebookRichEditor
            // Remount only when the server revision changes (save / reload), never when local edits start.
            key={`${pageId}-${baseRevision ?? 0}`}
            valueDoc={doc}
            onChangeDoc={(nextDoc) => edit({ doc: nextDoc })}
            onManualSave={save}
          />
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-rp-line px-4 py-3">
        <Button type="button" variant="secondary" size="md" iconRight={ExternalLink} onClick={onOpenFull} className="min-w-0 flex-1">
          {tr('Mở trong Sổ tay')}
        </Button>
        <Button type="button" variant="primary" size="md" icon={Save} loading={saving} disabled={!ownDraft || saving} onClick={save} className="min-w-0 flex-1">
          {ownDraft ? tr('Lưu thay đổi') : tr('Đã lưu')}
        </Button>
      </footer>
    </>
  );
}

function HighlightRow({ h, nb }) {
  const { tr } = useLocale();
  const tone = getHighlightColorMeta(h.color);
  const isDeleting = nb.removeHighlight.isPending || nb.deleteEntry.isPending;
  return (
    <li className="rounded-xl border border-rp-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-block min-w-0 break-words rounded-md border px-2 py-0.5 text-[12px] font-semibold ${tone.bgClass} ${tone.borderClass} ${tone.textClass}`}>
          {h.term}
        </span>
        <IconButton
          size="sm"
          icon={Trash2}
          label={tr('Xóa highlight')}
          disabled={isDeleting}
          onClick={async () => {
            try {
              if (h.isBackendHighlight && h.highlightId) await nb.removeHighlight.mutateAsync(h.highlightId);
              else await nb.deleteEntry.mutateAsync(h.noteEntryId);
              if (
                (h.highlightId && nb.activeHighlightDetail?.entry?.highlightId === h.highlightId)
                || (h.noteEntryId && nb.activeHighlightDetail?.entry?.noteEntryId === h.noteEntryId)
              ) {
                nb.setActiveHighlightDetail(null);
              }
              notify.success(tr('Đã bỏ highlight'), '');
            } catch (err) {
              notify.apiError(err, tr('Chưa bỏ được highlight'));
            }
          }}
        />
      </div>
      {h.versionStale && (
        <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
          {tr('Nội dung bài học gốc vừa thay đổi; giữ lại bản lưu an toàn trong Sổ tay.')}
        </p>
      )}
      {h.personalNote && <p className="mt-1.5 text-[12px] text-rp-text-2">{h.personalNote}</p>}
    </li>
  );
}
