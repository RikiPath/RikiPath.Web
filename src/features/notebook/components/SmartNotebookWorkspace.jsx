import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Plus,
  Repeat,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  Drawer,
  Popover,
  SakuraLoader,
  Tabs,
  confirmAction,
  notify,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { getNotebookPage, updateNotebookPage } from '@/features/notebook/api/notebookApi.js';
import { NOTEBOOK_PAGE_QUERY_KEY, NOTEBOOK_TREE_QUERY_KEY, useSmartNotebook } from '@/features/notebook/hooks/useSmartNotebook.js';
import {
  countChecklistInDoc,
  getEntryKindLabel,
  getHighlightColorMeta,
  mapSavedItemDto,
  normalizeRichDocument,
  serializeRichDocument,
} from '@/features/notebook/utils/notebookModel.js';
import NotebookNavTree from './NotebookNavTree.jsx';
import NotebookRichEditor from './NotebookRichEditor.jsx';
import NotebookVocabLookupSection from './NotebookVocabLookupSection.jsx';
import {
  AllSavedItemsView,
  FavoritePagesView,
  FileContextView,
  FolderContextView,
  NotebookSearchView,
} from './NotebookContextualViews.jsx';
import SavedItemDetailDrawer from './SavedItemDetailDrawer.jsx';
import {
  NotebookCreateModal,
  NotebookLookupDrawer,
  NotebookRenameMoveModal,
} from './NotebookModals.jsx';

/**
 * Keyed per-page Editor & Saved Items workspace pane so switching pages or reloading latest revision
 * cleanly mounts isolated draft state without synchronous `useEffect` setState cascades.
 */
function ActivePageEditorPane({
  pageDetail,
  uid,
  nb,
  flushRef,
  onNavigateSelection,
  onOpenRenameMove,
  onDeletePage,
  onOpenLookup,
  onOpenCreateItem,
  onOpenItemDrawer,
  onReloadLatest,
}) {
  const { tr } = useLocale();
  const queryClient = useQueryClient();

  const [editorMode, setEditorMode] = useState('write'); // 'write' | 'preview'
  const [titleDraft, setTitleDraft] = useState(pageDetail.title || '');
  const [docDraft, setDocDraft] = useState(() =>
    normalizeRichDocument(pageDetail.contentJson || pageDetail.contentPlainText || '', { ensureNonEmpty: true }),
  );
  const [dirty, setDirty] = useState(false);
  const [localSaveState, setLocalSaveState] = useState({ status: 'saved', error: '', errorCode: '' });
  const [savedItemsExpanded, setSavedItemsExpanded] = useState(true);

  const autoSaveTimerRef = useRef(null);
  const saveSeqRef = useRef(0);
  const serverRevisionRef = useRef(pageDetail.revision ?? 1);
  const snapshotRef = useRef({ title: titleDraft, doc: docDraft, dirty: false });

  useEffect(() => {
    snapshotRef.current = { title: titleDraft, doc: docDraft, dirty };
  }, [titleDraft, docDraft, dirty]);

  const persistCurrentPage = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const snap = snapshotRef.current;
    if (!snap.dirty) return true;

    const cleanTitle = snap.title.trim() || tr('Trang không tiêu đề');
    const seq = ++saveSeqRef.current;
    setLocalSaveState({ status: 'saving', error: '', errorCode: '' });

    try {
      const updated = await updateNotebookPage(pageDetail.id, {
        title: cleanTitle,
        contentJson: serializeRichDocument(snap.doc),
        expectedRevision: serverRevisionRef.current,
      });

      if (updated) {
        serverRevisionRef.current = updated.revision ?? (serverRevisionRef.current + 1);
        queryClient.setQueryData([NOTEBOOK_PAGE_QUERY_KEY, uid, Number(pageDetail.id)], updated);
        queryClient.invalidateQueries({ queryKey: [NOTEBOOK_TREE_QUERY_KEY, uid] });
      }

      if (seq === saveSeqRef.current) {
        setDirty(false);
        setLocalSaveState({ status: 'saved', error: '', errorCode: '' });
      }
      return true;
    } catch (err) {
      const code = err?.data?.errorCode || err?.errorCode || '';
      if (seq === saveSeqRef.current) {
        setLocalSaveState({
          status: 'error',
          errorCode: code,
          error: err?.message || tr('Chưa lưu được thay đổi. Nội dung vẫn được giữ an toàn trên màn hình.'),
        });
      }
      return false;
    }
  }, [pageDetail.id, queryClient, tr, uid]);

  useEffect(() => {
    flushRef.current = () => (snapshotRef.current.dirty ? persistCurrentPage() : Promise.resolve(true));
    return () => {
      flushRef.current = null;
    };
  }, [flushRef, persistCurrentPage]);

  useEffect(() => {
    if (!dirty) return undefined;
    autoSaveTimerRef.current = setTimeout(() => {
      persistCurrentPage();
    }, 900);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [dirty, titleDraft, docDraft, persistCurrentPage]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const pageSavedItems = useMemo(
    () => (Array.isArray(pageDetail?.savedItems) ? pageDetail.savedItems : []).map(mapSavedItemDto).filter(Boolean),
    [pageDetail],
  );
  const checklistProgress = useMemo(() => countChecklistInDoc(docDraft), [docDraft]);

  return (
    <div className="space-y-4">
      {localSaveState.status === 'error' && localSaveState.errorCode === 'NOTEBOOK_REVISION_CONFLICT' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>{tr('Trang này vừa được cập nhật từ nơi khác. Tải bản mới nhất để tránh ghi đè.')}</span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onReloadLatest}>
            {tr('Tải bản mới nhất')}
          </Button>
        </div>
      )}

      {/* Page Editor Header */}
      <div className="rounded-2xl border border-rp-line bg-white px-5 py-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-rp-text-muted">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {pageDetail.folderId ? (
              <button
                type="button"
                onClick={() => onNavigateSelection('folder', pageDetail.folderId)}
                className="rp-focus inline-flex items-center gap-1 rounded hover:text-rp-brand-strong"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="truncate max-w-[140px]">{pageDetail.folderName}</span>
              </button>
            ) : (
              <span>{pageDetail.folderName}</span>
            )}
            <span>›</span>
            <button
              type="button"
              onClick={() => onNavigateSelection('file', pageDetail.fileId)}
              className="rp-focus truncate max-w-[160px] rounded font-medium text-rp-text-2 hover:text-rp-brand-strong"
            >
              {pageDetail.fileName}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SaveStatusIndicator
              status={localSaveState.status}
              dirty={dirty}
              onRetry={() => persistCurrentPage()}
            />

            {checklistProgress.total > 0 && (
              <Badge tone={checklistProgress.completed === checklistProgress.total ? 'success' : 'sakura'} size="sm">
                {checklistProgress.completed}/{checklistProgress.total}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={titleDraft}
            maxLength={200}
            aria-label={tr('Tiêu đề trang ghi chú')}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              setDirty(true);
              setLocalSaveState({ status: 'dirty', error: '', errorCode: '' });
            }}
            placeholder={tr('Tiêu đề trang…')}
            className="rp-focus rp-jp min-w-[200px] flex-1 rounded-xl border border-transparent bg-transparent px-1.5 py-1 text-[21px] font-bold text-rp-text transition-colors hover:bg-rp-bg-2 focus:border-rp-brand-border focus:bg-white"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              title={pageDetail.isFavorite ? tr('Bỏ yêu thích') : tr('Đánh dấu yêu thích')}
              aria-label={pageDetail.isFavorite ? tr('Bỏ yêu thích') : tr('Đánh dấu yêu thích')}
              onClick={() => nb.toggleFavoritePage.mutateAsync({ pageId: pageDetail.id, isFavorite: !pageDetail.isFavorite })}
              className={`rp-focus inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                pageDetail.isFavorite
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : 'border-rp-line bg-white text-rp-text-muted hover:border-rp-brand-border hover:text-amber-500'
              }`}
            >
              <Star className={`h-4 w-4 ${pageDetail.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            <Tabs
              variant="pill"
              tone="segmented"
              value={editorMode}
              onChange={setEditorMode}
              tabs={[
                { id: 'write', label: tr('Soạn') },
                { id: 'preview', label: tr('Xem') },
              ]}
            />

            <Popover
              align="end"
              label={tr('Tùy chọn trang')}
              trigger={
                <button
                  type="button"
                  aria-label={tr('Tùy chọn trang')}
                  className="rp-focus inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2 hover:text-rp-text"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            >
              {({ close }) => (
                <div className="min-w-[195px] space-y-0.5 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      persistCurrentPage();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{tr('Lưu ngay (Ctrl+S)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onOpenRenameMove(pageDetail);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>{tr('Đổi tên / Di chuyển trang')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onOpenLookup();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{tr('Tra cứu từ vựng / Hán tự')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onDeletePage(pageDetail);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rp-danger hover:bg-rp-danger-bg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{tr('Xóa trang')}</span>
                  </button>
                </div>
              )}
            </Popover>
          </div>
        </div>
      </div>

      {/* Focused Modern Rich Note Editor */}
      <NotebookRichEditor
        pageId={pageDetail.id}
        valueDoc={docDraft}
        readOnly={editorMode === 'preview'}
        onChangeDoc={(nextDoc) => {
          setDocDraft(nextDoc);
          setDirty(true);
          setLocalSaveState({ status: 'dirty', error: '', errorCode: '' });
        }}
        onManualSave={() => persistCurrentPage()}
      />

      {/* Collapsible Saved Items Inside Current Page */}
      <section className="rounded-2xl border border-rp-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setSavedItemsExpanded((v) => !v)}
            className="rp-focus flex items-center gap-2 rounded-lg py-0.5 text-left"
          >
            {savedItemsExpanded ? (
              <ChevronUp className="h-4 w-4 text-rp-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-rp-text-muted" />
            )}
            <h3 className="text-[14.5px] font-bold text-rp-text">
              {tr('Mục đã lưu')} ({pageSavedItems.length})
            </h3>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={BookOpen}
              onClick={onOpenLookup}
            >
              {tr('Tra cứu thêm')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={onOpenCreateItem}
            >
              {tr('Thêm mục')}
            </Button>
          </div>
        </div>

        {savedItemsExpanded && (
          <div className="border-t border-rp-line px-4 py-3.5">
            {pageSavedItems.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-rp-line bg-rp-bg-2/70 px-4 py-3">
                <p className="text-[13px] text-rp-text-muted">
                  {tr('Trang này chưa có mục đã lưu nào. Bấm “+ Thêm mục” hoặc bôi đen chữ khi học để lưu vào đây.')}
                </p>
                <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={onOpenCreateItem}>
                  {tr('Thêm mục')}
                </Button>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {pageSavedItems.map((item) => {
                  const tone = item.highlightColor ? getHighlightColorMeta(item.highlightColor) : null;
                  return (
                    <div
                      key={item.noteEntryId}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-rp-line bg-white p-3.5 transition-colors hover:border-rp-brand-border hover:bg-rp-row-hover"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenItemDrawer(item)}
                        className="rp-focus text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="rp-jp text-[16px] font-bold text-rp-text">{item.term}</span>
                            {item.reading && (
                              <span className="rp-jp ml-2 text-[12.5px] font-medium text-rp-brand-strong">{item.reading}</span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {tone && <span className={`h-2.5 w-2.5 rounded-full ${tone.dotClass}`} />}
                            <Badge tone="neutral" size="sm">{tr(getEntryKindLabel(item.kind))}</Badge>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] text-rp-text-2">{item.meaning}</p>
                      </button>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line/60 pt-2 text-[11.5px]">
                        <div className="flex items-center gap-2">
                          {item.vocabularyId && (
                            <Link
                              to={`/vocabulary-detail/?id=${item.vocabularyId}`}
                              className="rp-link inline-flex items-center gap-1 font-medium text-rp-brand-strong"
                            >
                              <span>{tr('Từ điển')}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          )}
                          {item.hasSrs && (
                            <Link
                              to="/daily-srs/"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <Repeat className="h-2.5 w-2.5" />
                              <span>{tr('Ôn tập SRS')}</span>
                            </Link>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenItemDrawer(item)}
                          className="rp-focus rp-link text-[12px] font-semibold text-rp-brand-strong"
                        >
                          {tr('Chi tiết')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function SmartNotebookWorkspace() {
  const { tr, trf } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const nb = useSmartNotebook();
  const queryClient = useQueryClient();

  const paramPageId = searchParams.get('pageId');
  const paramNoteId = searchParams.get('noteId');
  const paramEntryId = searchParams.get('entryId');
  const paramTab = searchParams.get('tab');

  const [navSearch, setNavSearch] = useState('');
  const [explicitSelection, setExplicitSelection] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [expandedFiles, setExpandedFiles] = useState({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [createModal, setCreateModal] = useState({ open: false, kind: 'page', folderId: null, fileId: null, pageId: null });
  const [renameMoveTarget, setRenameMoveTarget] = useState(null);
  const [activeItemDrawer, setActiveItemDrawer] = useState(null);
  const [dismissedEntryParam, setDismissedEntryParam] = useState(false);
  const [lookupDrawer, setLookupDrawer] = useState({ open: false, mode: 'vocab-bank' });
  const [dismissedTabParam, setDismissedTabParam] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const flushActivePageRef = useRef(null);

  // Derive current view selection cleanly without useEffect-triggered cascading state updates
  const selection = useMemo(() => {
    if (explicitSelection) {
      if (explicitSelection.view === 'all-items' || explicitSelection.view === 'favorites') return explicitSelection;
      if (explicitSelection.view === 'folder' && nb.folders.some((f) => f.id === explicitSelection.id)) return explicitSelection;
      if (explicitSelection.view === 'file' && nb.allFiles.some((f) => f.id === explicitSelection.id)) return explicitSelection;
      if (explicitSelection.view === 'page' && nb.notePages.some((p) => p.id === explicitSelection.id)) return explicitSelection;
    }
    if (paramPageId) {
      const m = nb.notePages.find((p) => p.id === Number(paramPageId));
      if (m) return { view: 'page', id: m.id };
      // A deep link (e.g. from Sổ tay nhanh) to a page that is deleted or not owned by this learner
      // must not silently open some other page.
      if (nb.treeQuery.isSuccess) return { view: 'all-items', id: null, missingPageId: Number(paramPageId) };
    }
    if (paramNoteId) {
      const m = nb.notePages.find((p) => p.fileId === Number(paramNoteId));
      if (m) return { view: 'page', id: m.id };
    }
    if (nb.notePages[0]) return { view: 'page', id: nb.notePages[0].id };
    if (nb.allFiles[0]) return { view: 'file', id: nb.allFiles[0].id };
    if (nb.folders[0]) return { view: 'folder', id: nb.folders[0].id };
    return { view: 'all-items', id: null };
  }, [explicitSelection, nb.folders, nb.allFiles, nb.notePages, paramPageId, paramNoteId, nb.treeQuery.isSuccess]);

  const missingPageNotifiedRef = useRef(null);
  useEffect(() => {
    const missing = selection.missingPageId;
    if (!missing || missingPageNotifiedRef.current === missing) return;
    missingPageNotifiedRef.current = missing;
    notify.info(tr('Không tìm thấy trang ghi chú này'), tr('Trang có thể đã bị xóa hoặc không còn trong Sổ tay của bạn.'), { key: 'nb-missing-page' });
  }, [selection.missingPageId, tr]);

  const activePageId = selection.view === 'page' ? selection.id : null;

  const pageDetailQuery = useQuery({
    queryKey: [NOTEBOOK_PAGE_QUERY_KEY, nb.uid, activePageId],
    queryFn: () => getNotebookPage(activePageId),
    enabled: Boolean(nb.active && activePageId),
    staleTime: 20_000,
  });

  const activePageDetail = pageDetailQuery.data;
  const pageSavedItems = useMemo(
    () => (Array.isArray(activePageDetail?.savedItems) ? activePageDetail.savedItems : []).map(mapSavedItemDto).filter(Boolean),
    [activePageDetail],
  );
  const hasEntriesInScope = (nb.stats?.totalSavedItems ?? 0) > 0 || pageSavedItems.length > 0;

  const lookupOpen = lookupDrawer.open || (!dismissedTabParam && (paramTab === 'vocab-bank' || paramTab === 'kanji-bank'));
  const lookupMode = lookupDrawer.open ? lookupDrawer.mode : (paramTab === 'kanji-bank' ? 'kanji-bank' : 'vocab-bank');

  const resolvedItemDrawer = useMemo(() => {
    if (activeItemDrawer) return activeItemDrawer;
    if (paramEntryId && !dismissedEntryParam && pageSavedItems.length > 0) {
      return pageSavedItems.find((x) => x.noteEntryId === Number(paramEntryId)) || null;
    }
    return null;
  }, [activeItemDrawer, paramEntryId, dismissedEntryParam, pageSavedItems]);

  const navigateSelection = useCallback(async (nextView, nextId = null) => {
    if (flushActivePageRef.current) {
      const ok = await flushActivePageRef.current();
      if (!ok) {
        const leave = await confirmAction({
          title: tr('Thay đổi chưa kịp lưu lên máy chủ'),
          message: tr('Không thể tự động lưu trang hiện tại ngay lúc này. Bạn muốn thử lưu lại hay chuyển trang?'),
          confirmText: tr('Vẫn chuyển trang'),
          cancelText: tr('Ở lại thử lại'),
          danger: true,
        });
        if (!leave) return;
      }
    }

    if (nextView === 'page' && nextId) {
      const match = nb.notePages.find((p) => p.id === nextId);
      if (match) {
        setExpandedFolders((prev) => ({ ...prev, [match.folderId]: true }));
        setExpandedFiles((prev) => ({ ...prev, [match.fileId]: true }));
      }
    } else if (nextView === 'file' && nextId) {
      const matchFile = nb.allFiles.find((f) => f.id === nextId);
      if (matchFile?.folderId) {
        setExpandedFolders((prev) => ({ ...prev, [matchFile.folderId]: true }));
      }
      setExpandedFiles((prev) => ({ ...prev, [nextId]: true }));
    } else if (nextView === 'folder' && nextId) {
      setExpandedFolders((prev) => ({ ...prev, [nextId]: true }));
    }

    setExplicitSelection({ view: nextView, id: nextId });
    setMobileNavOpen(false);
  }, [nb.allFiles, nb.notePages, tr]);

  const activeFolder = useMemo(
    () => (selection.view === 'folder' ? nb.folders.find((f) => f.id === selection.id) : null),
    [selection, nb.folders],
  );
  const activeFile = useMemo(
    () => (selection.view === 'file' ? nb.allFiles.find((f) => f.id === selection.id) : null),
    [selection, nb.allFiles],
  );
  const activePageSummary = useMemo(
    () => (selection.view === 'page' ? nb.notePages.find((p) => p.id === selection.id) : null),
    [selection, nb.notePages],
  );

  function handleBannerCreate() {
    if (selection.view === 'folder' && selection.id) {
      setCreateModal({ open: true, kind: 'file', folderId: selection.id, fileId: null, pageId: null });
    } else if (selection.view === 'file' && selection.id) {
      const file = nb.allFiles.find((f) => f.id === selection.id);
      setCreateModal({ open: true, kind: 'page', folderId: file?.folderId || null, fileId: selection.id, pageId: null });
    } else if (selection.view === 'page' && selection.id) {
      const page = nb.notePages.find((p) => p.id === selection.id);
      setCreateModal({ open: true, kind: 'item', folderId: page?.folderId || null, fileId: page?.fileId || null, pageId: selection.id });
    } else {
      setCreateModal({ open: true, kind: 'folder', folderId: null, fileId: null, pageId: null });
    }
  }

  async function handleDeleteNode({ kind, item }) {
    if (!item) return;

    if (kind === 'folder') {
      const fileCount = item.fileCount ?? item.files?.length ?? 0;
      const confirmed = await confirmAction({
        title: tr('Xóa thư mục này?'),
        message: fileCount > 0
          ? trf('Thư mục “{0}” đang chứa {1} tệp ghi chú. Khi xác nhận, toàn bộ tệp và trang bên trong sẽ bị xóa khỏi sổ tay (thẻ ôn tập SRS đã tạo vẫn được giữ nguyên).', { 0: item.name, 1: fileCount })
          : trf('Xóa thư mục trống “{0}” khỏi sổ tay?', { 0: item.name }),
        confirmText: tr('Xóa thư mục'),
        cancelText: tr('Hủy'),
        danger: true,
      });
      if (!confirmed) return;

      try {
        await nb.removeFolder.mutateAsync({ folderId: item.id, cascade: fileCount > 0 });
        notify.success(tr('Đã xóa thư mục'), '', { key: 'nb-del-folder' });
        if (selection.view === 'folder' && selection.id === item.id) {
          setExplicitSelection({ view: 'all-items', id: null });
        }
      } catch (err) {
        notify.apiError(err, tr('Không thể xóa thư mục'));
      }
      return;
    }

    if (kind === 'file') {
      const pageCount = item.pageCount ?? item.pages?.length ?? 0;
      const confirmed = await confirmAction({
        title: tr('Xóa tệp ghi chú này?'),
        message: pageCount > 0
          ? trf('Tệp “{0}” đang có {1} trang ghi chú. Thẻ SRS đã lưu trước đây sẽ không bị mất khi xóa tệp.', { 0: item.name, 1: pageCount })
          : trf('Xóa tệp “{0}” khỏi sổ tay?', { 0: item.name }),
        confirmText: tr('Xóa tệp'),
        cancelText: tr('Hủy'),
        danger: true,
      });
      if (!confirmed) return;

      try {
        await nb.removeFile.mutateAsync({ fileId: item.id, cascade: pageCount > 0 });
        notify.success(tr('Đã xóa tệp ghi chú'), '', { key: 'nb-del-file' });
        if ((selection.view === 'file' && selection.id === item.id) || (selection.view === 'page' && activePageSummary?.fileId === item.id)) {
          if (item.folderId) setExplicitSelection({ view: 'folder', id: item.folderId });
          else setExplicitSelection({ view: 'all-items', id: null });
        }
      } catch (err) {
        notify.apiError(err, tr('Không thể xóa tệp ghi chú'));
      }
      return;
    }

    if (kind === 'page') {
      const confirmed = await confirmAction({
        title: tr('Xóa trang ghi chú này?'),
        message: trf('Trang “{0}” và các mục đã lưu trong trang sẽ bị xóa khỏi sổ tay. Các thẻ ôn tập SRS đã tạo vẫn được giữ nguyên.', { 0: item.title }),
        confirmText: tr('Xóa trang'),
        cancelText: tr('Hủy'),
        danger: true,
      });
      if (!confirmed) return;

      // Leave the page before it disappears so the editor never refetches a deleted page:
      // prefer a sibling page in the same file, otherwise the file view (or All saved items).
      const wasActive = selection.view === 'page' && selection.id === item.id;
      const previousSelection = wasActive ? selection : null;
      if (wasActive) {
        const siblings = nb.notePages.filter((p) => p.fileId === item.fileId);
        const idx = siblings.findIndex((p) => p.id === item.id);
        const fallback = siblings[idx + 1] || siblings[idx - 1] || null;
        if (fallback) setExplicitSelection({ view: 'page', id: fallback.id });
        else if (item.fileId) setExplicitSelection({ view: 'file', id: item.fileId });
        else setExplicitSelection({ view: 'all-items', id: null });
      }

      try {
        await nb.removePage.mutateAsync(item.id);
        notify.success(tr('Đã xóa trang ghi chú'), '', { key: 'nb-del-page' });
      } catch (err) {
        if (previousSelection) setExplicitSelection(previousSelection);
        notify.apiError(err, tr('Không thể xóa trang ghi chú'));
      }
    }
  }

  // Renaming the page that is open in the editor: flush pending edits first, send the freshest
  // revision, then remount the editor so its title draft and revision match the server.
  async function handleUpdatePage(payload) {
    const isOpenInEditor = activePageId && Number(payload.pageId) === Number(activePageId);
    let expectedRevision = payload.expectedRevision;
    if (isOpenInEditor) {
      if (flushActivePageRef.current) await flushActivePageRef.current();
      const cached = queryClient.getQueryData([NOTEBOOK_PAGE_QUERY_KEY, nb.uid, Number(payload.pageId)]);
      if (cached?.revision != null) expectedRevision = cached.revision;
    }
    const updated = await nb.updatePage.mutateAsync({ ...payload, expectedRevision });
    if (isOpenInEditor) setReloadNonce((n) => n + 1);
    return updated;
  }

  async function handleReloadLatestAfterConflict() {
    await pageDetailQuery.refetch();
    setReloadNonce((n) => n + 1);
  }

  if (nb.treeQuery.isPending) {
    return <SakuraLoader variant="page" context="writing" />;
  }

  if (nb.treeQuery.isError) {
    return (
      <ContextualErrorState
        error={nb.treeQuery.error}
        title={tr('Chưa tải được Sổ tay cá nhân')}
        onRetry={() => nb.treeQuery.refetch()}
        retrying={nb.treeQuery.isFetching}
      />
    );
  }

  const navTreeProps = {
    searchQuery: navSearch,
    onSearchChange: setNavSearch,
    stats: nb.stats,
    folders: nb.folders,
    selection,
    expandedFolders,
    expandedFiles,
    onToggleFolderExpand: (fid) => setExpandedFolders((prev) => ({ ...prev, [fid]: !(prev[fid] ?? true) })),
    onToggleFileExpand: (flId) => setExpandedFiles((prev) => ({ ...prev, [flId]: !(prev[flId] ?? true) })),
    onSelectView: navigateSelection,
    onRequestCreate: ({ kind, folderId = null, fileId = null, pageId = null }) => {
      setMobileNavOpen(false);
      setCreateModal({ open: true, kind, folderId, fileId, pageId });
    },
    onRequestRenameOrMove: ({ kind, item, renameOnly = false }) => {
      setMobileNavOpen(false);
      setRenameMoveTarget({ kind, item, renameOnly });
    },
    onRequestDelete: handleDeleteNode,
  };

  return (
    <div className="space-y-4">
      <IllustratedPageHeader
        compact
        icon="notebook"
        eyebrow={tr('Góc học tập của tôi')}
        title={tr('Sổ tay cá nhân')}
        description={tr('Ghi lại và tổ chức kiến thức của bạn.')}
        actions={(
          <Button type="button" variant="primary" size="md" icon={Plus} onClick={handleBannerCreate}>
            {tr('Tạo mới')}
          </Button>
        )}
      />

      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={PanelLeft}
          onClick={() => setMobileNavOpen(true)}
        >
          {tr('Cây sổ tay')}
        </Button>
        <span className="truncate text-[12.5px] font-medium text-rp-text-muted">
          {selection.view === 'page' && activePageSummary
            ? `${activePageSummary.folderName} › ${activePageSummary.fileName}`
            : selection.view === 'file' && activeFile
              ? `${activeFile.folderName} › ${activeFile.name}`
              : selection.view === 'folder' && activeFolder
                ? activeFolder.name
                : selection.view === 'favorites'
                  ? tr('Trang yêu thích')
                  : tr('Tất cả mục đã lưu')}
        </span>
      </div>

      {/* Two-Panel Workspace Layout (Left 280px Nav + Right Focused Workspace) */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-4 hidden rounded-2xl border border-rp-line bg-white p-3.5 shadow-[0_2px_10px_-6px_rgba(45,40,42,0.06)] lg:block lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
          <NotebookNavTree {...navTreeProps} />
        </aside>

        <main className="min-w-0 space-y-4">
          {navSearch.trim().length > 0 ? (
            <NotebookSearchView
              uid={nb.uid}
              query={navSearch}
              onClearSearch={() => setNavSearch('')}
              onSelectFolder={(fid) => navigateSelection('folder', fid)}
              onSelectFile={(flId) => navigateSelection('file', flId)}
              onSelectPage={(pid) => navigateSelection('page', pid)}
              onSelectItem={(item) => setActiveItemDrawer(item)}
            />
          ) : selection.view === 'all-items' ? (
            <AllSavedItemsView
              uid={nb.uid}
              totalGlobalItems={nb.stats?.totalSavedItems ?? 0}
              onSelectItem={(item) => setActiveItemDrawer(item)}
              onSelectPage={(pid) => navigateSelection('page', pid)}
              onAddItem={() => setCreateModal({ open: true, kind: 'item', folderId: null, fileId: null, pageId: nb.notePages[0]?.id || null })}
              onOpenLookup={() => setLookupDrawer({ open: true, mode: 'vocab-bank' })}
            />
          ) : selection.view === 'favorites' ? (
            <FavoritePagesView
              pages={nb.favoritePages}
              isLoading={nb.favoritesQuery.isPending}
              error={nb.favoritesQuery.error}
              onRetry={() => nb.favoritesQuery.refetch()}
              onSelectPage={(pid) => navigateSelection('page', pid)}
              onToggleFavorite={(pid, nextFav) => nb.toggleFavoritePage.mutateAsync({ pageId: pid, isFavorite: nextFav })}
            />
          ) : selection.view === 'folder' && activeFolder ? (
            <FolderContextView
              folder={activeFolder}
              onSelectFile={(flId) => navigateSelection('file', flId)}
              onCreateFile={(fid) => setCreateModal({ open: true, kind: 'file', folderId: fid, fileId: null, pageId: null })}
              onRenameFolder={(f) => setRenameMoveTarget({ kind: 'folder', item: f })}
              onDeleteFolder={(f) => handleDeleteNode({ kind: 'folder', item: f })}
              onRenameMoveFile={(file) => setRenameMoveTarget({ kind: 'file', item: file })}
              onDeleteFile={(file) => handleDeleteNode({ kind: 'file', item: file })}
            />
          ) : selection.view === 'file' && activeFile ? (
            <FileContextView
              file={activeFile}
              onSelectFolder={(fid) => navigateSelection('folder', fid)}
              onSelectPage={(pid) => navigateSelection('page', pid)}
              onCreatePage={(flId) => setCreateModal({ open: true, kind: 'page', folderId: activeFile.folderId, fileId: flId, pageId: null })}
              onRenameMoveFile={(file) => setRenameMoveTarget({ kind: 'file', item: file })}
              onDeleteFile={(file) => handleDeleteNode({ kind: 'file', item: file })}
              onToggleFavorite={(pid, nextFav) => nb.toggleFavoritePage.mutateAsync({ pageId: pid, isFavorite: nextFav })}
              onDeletePage={(page) => handleDeleteNode({ kind: 'page', item: page })}
            />
          ) : selection.view === 'page' && selection.id ? (
            pageDetailQuery.isPending ? (
              <SakuraLoader variant="section" context="writing" />
            ) : pageDetailQuery.isError ? (
              <ContextualErrorState
                error={pageDetailQuery.error}
                title={tr('Chưa tải được trang ghi chú')}
                onRetry={() => pageDetailQuery.refetch()}
                retrying={pageDetailQuery.isFetching}
              />
            ) : activePageDetail ? (
              <ActivePageEditorPane
                key={`${activePageDetail.id}-${reloadNonce}`}
                pageDetail={activePageDetail}
                uid={nb.uid}
                nb={nb}
                flushRef={flushActivePageRef}
                onNavigateSelection={navigateSelection}
                onOpenRenameMove={(detail) => setRenameMoveTarget({ kind: 'page', item: detail })}
                onDeletePage={(detail) => handleDeleteNode({ kind: 'page', item: detail })}
                onOpenLookup={() => setLookupDrawer({ open: true, mode: 'vocab-bank' })}
                onOpenCreateItem={() => setCreateModal({
                  open: true,
                  kind: 'item',
                  folderId: activePageDetail.folderId,
                  fileId: activePageDetail.fileId,
                  pageId: activePageDetail.id,
                })}
                onOpenItemDrawer={(item) => setActiveItemDrawer(item)}
                onReloadLatest={handleReloadLatestAfterConflict}
              />
            ) : null
          ) : (
            <div className="rounded-2xl border border-rp-line bg-white p-6">
              <ContextualEmptyState
                variant="compact"
                framed={false}
                illustration="flashcard"
                title={hasEntriesInScope ? tr('Chọn một trang hoặc mục để xem') : tr('Bắt đầu cuốn sổ tay đầu tiên của bạn')}
                description={tr('Tạo thư mục, tệp ghi chú và trang mới để viết bài học hoặc lưu kiến thức trọng tâm.')}
                action={(
                  <Button type="button" variant="primary" size="md" icon={Plus} onClick={handleBannerCreate}>
                    {tr('Tạo mới')}
                  </Button>
                )}
              />
            </div>
          )}
        </main>
      </div>

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        side="left"
        size="sm"
        title={tr('Sổ tay cá nhân')}
      >
        <NotebookNavTree {...navTreeProps} />
      </Drawer>

      <NotebookCreateModal
        open={createModal.open}
        onClose={() => setCreateModal((prev) => ({ ...prev, open: false }))}
        initialKind={createModal.kind}
        initialFolderId={createModal.folderId}
        initialFileId={createModal.fileId}
        initialPageId={createModal.pageId}
        folders={nb.folders}
        allFiles={nb.allFiles}
        allPages={nb.notePages}
        onCreateFolder={(payload) => nb.createFolder.mutateAsync(payload)}
        onCreateFile={(payload) => nb.createFile.mutateAsync(payload)}
        onCreatePage={(payload) => nb.createPage.mutateAsync(payload)}
        onAddSavedItem={(payload) => nb.addSavedItem.mutateAsync(payload)}
        onSuccessCreated={({ kind, created }) => {
          if (kind === 'folder' && created?.id) {
            setExpandedFolders((prev) => ({ ...prev, [created.id]: true }));
            setExplicitSelection({ view: 'folder', id: created.id });
          } else if (kind === 'file' && created?.id) {
            if (created.folderId) setExpandedFolders((prev) => ({ ...prev, [created.folderId]: true }));
            setExpandedFiles((prev) => ({ ...prev, [created.id]: true }));
            if (created.pages?.[0]?.id) {
              setExplicitSelection({ view: 'page', id: created.pages[0].id });
            } else {
              setExplicitSelection({ view: 'file', id: created.id });
            }
          } else if (kind === 'page' && created?.id) {
            if (created.folderId) setExpandedFolders((prev) => ({ ...prev, [created.folderId]: true }));
            if (created.fileId) setExpandedFiles((prev) => ({ ...prev, [created.fileId]: true }));
            setExplicitSelection({ view: 'page', id: created.id });
          } else if (kind === 'item' && created?.notebookPageId) {
            setExplicitSelection({ view: 'page', id: created.notebookPageId });
          }
        }}
      />

      <NotebookRenameMoveModal
        target={renameMoveTarget}
        onClose={() => setRenameMoveTarget(null)}
        folders={nb.folders}
        allFiles={nb.allFiles}
        onRenameFolder={(payload) => nb.renameFolder.mutateAsync(payload)}
        onUpdateFile={(payload) => nb.updateFile.mutateAsync(payload)}
        onUpdatePage={handleUpdatePage}
      />

      <SavedItemDetailDrawer
        item={resolvedItemDrawer}
        open={Boolean(resolvedItemDrawer)}
        onClose={() => {
          setActiveItemDrawer(null);
          if (paramEntryId) {
            setDismissedEntryParam(true);
            const next = new URLSearchParams(searchParams);
            next.delete('entryId');
            setSearchParams(next, { replace: true });
          }
        }}
        allPages={nb.notePages}
        folders={nb.folders}
        onOpenPage={(pid) => navigateSelection('page', pid)}
        onUpdateItem={async (payload) => {
          const updated = await nb.updateEntry.mutateAsync(payload);
          if (updated) setActiveItemDrawer(mapSavedItemDto(updated));
        }}
        onMoveItem={async (entryId, nextPageId, revision) => {
          const updated = await nb.updateEntry.mutateAsync({
            noteEntryId: entryId,
            notebookPageId: nextPageId,
            expectedRevision: revision,
          });
          if (updated) setActiveItemDrawer(mapSavedItemDto(updated));
        }}
        onEnrollSrs={async (entryId) => {
          const updated = await nb.enrollToSrs.mutateAsync(entryId);
          if (updated) setActiveItemDrawer(mapSavedItemDto(updated));
        }}
        onDeleteItem={(entryId) => nb.deleteEntry.mutateAsync(entryId)}
        updating={nb.updateEntry.isPending}
        enrolling={nb.enrollToSrs.isPending}
        deleting={nb.deleteEntry.isPending}
      />

      <NotebookLookupDrawer
        open={lookupOpen}
        onClose={() => {
          setLookupDrawer((prev) => ({ ...prev, open: false }));
          if (paramTab) {
            setDismissedTabParam(true);
            const next = new URLSearchParams(searchParams);
            next.delete('tab');
            setSearchParams(next, { replace: true });
          }
        }}
        initialMode={lookupMode}
        nb={nb}
        activePage={activePageDetail || activePageSummary || null}
        notePages={nb.notePages}
      />
    </div>
  );
}

export { NotebookVocabLookupSection };

function SaveStatusIndicator({ status, dirty, onRetry }) {
  const { tr } = useLocale();

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rp-bg-2 px-2.5 py-0.5 text-[11.5px] font-medium text-rp-text-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{tr('Đang lưu…')}</span>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rp-danger-bg px-2.5 py-0.5 text-[11.5px] font-semibold text-rp-danger">
        <AlertCircle className="h-3 w-3" />
        <span>{tr('Lưu thất bại')}</span>
        <button type="button" onClick={onRetry} className="underline hover:no-underline">
          {tr('Thử lại')}
        </button>
      </span>
    );
  }

  if (dirty || status === 'dirty') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11.5px] font-medium text-amber-800">
        <span>{tr('Chưa lưu…')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      <span>{tr('Đã lưu')}</span>
    </span>
  );
}
