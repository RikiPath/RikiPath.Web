import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  Highlighter,
  Loader2,
  MapPin,
  NotebookPen,
  Pencil,
  Plus,
  Repeat,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  Button,
  ContextualErrorState,
  CustomSelect,
  Drawer,
  SakuraLoader,
  confirmAction,
  notify,
} from '@/components/ui';
import { searchKanji } from '@/features/content-author/api/sharedBankApi.js';
import { useSmartNotebook } from '@/features/notebook/hooks/useSmartNotebook.js';
import {
  DEFAULT_FOLDER_NAME,
  getHighlightColorMeta,
  groupNotePagesByFolder,
  HIGHLIGHT_COLORS,
  NOTEBOOK_CONTENT_KINDS,
} from '@/features/notebook/utils/notebookModel.js';
import { SakuraFolderIcon, SakuraNotebookBubbleIcon, SakuraNotePageIcon } from './SakuraNotebookIcons.jsx';
import SafeRichNoteRenderer from './SafeRichNoteRenderer.jsx';

const KANJI_SAMPLES = ['日', '水', '学', '人', '月'];

function speakJapanese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * Unified 3-column Smart Learning Notebook Workspace for RikiPath Web V6.5.
 * Replaces Kanji-only notebook experience while keeping Kanji dictionary search/save intact.
 */
export default function SmartNotebookWorkspace() {
  const { tr, trf } = useLocale();
  const [params] = useSearchParams();
  const nb = useSmartNotebook({ enabled: true });

  const requestedNoteId = Number(params.get('noteId')) || null;
  const requestedEntryId = Number(params.get('entryId')) || null;

  const [mode, setMode] = useState('workspace'); // 'workspace' | 'kanji-bank'
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('__ALL__');
  const [pickedNoteId, setPickedNoteId] = useState(requestedNoteId);
  const [pickedEntryId, setPickedEntryId] = useState(requestedEntryId);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'alpha' | 'srs'

  // Folder / Note Page creation & rename state
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingNoteTitle, setCreatingNoteTitle] = useState('');
  const [renamingNoteId, setRenamingNoteId] = useState(null);
  const [renamingNoteValue, setRenamingNoteValue] = useState('');

  // Quick manual entry form
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickDraft, setQuickDraft] = useState({ word: '', reading: '', meaning: '', note: '', kind: 'vocabulary', enrollSrs: false });

  // Rich Note Page Editor state (protected against overwrite on save error)
  const notePages = nb.notePages;
  const activeNotePage = useMemo(() => {
    if (pickedNoteId && notePages.some((p) => p.id === pickedNoteId)) {
      return notePages.find((p) => p.id === pickedNoteId) || null;
    }
    return notePages[0] || null;
  }, [pickedNoteId, notePages]);

  const [editorPageId, setEditorPageId] = useState(null);
  const [editorBody, setEditorBody] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorTags, setEditorTags] = useState('');
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorMode, setEditorMode] = useState('split'); // 'write' | 'preview' | 'split'
  const textareaRef = useRef(null);

  if (activeNotePage?.id != null && activeNotePage.id !== editorPageId) {
    setEditorPageId(activeNotePage.id);
    setEditorBody(activeNotePage.body || '');
    setEditorSummary(activeNotePage.summary || '');
    setEditorTags((activeNotePage.tags || []).join(', '));
    setEditorDirty(false);
  }

  // Debounced auto-save for Rich Note Page (only when user changed text; preserves dirty text on error!)
  useEffect(() => {
    if (!activeNotePage || !editorDirty) return undefined;
    const timer = window.setTimeout(() => {
      void nb.updateNotePage.mutateAsync({
        id: activeNotePage.id,
        title: activeNotePage.title,
        folder: activeNotePage.folder,
        summary: editorSummary,
        body: editorBody,
        tags: editorTags.split(',').map((t) => t.trim()).filter(Boolean),
        favorite: activeNotePage.favorite,
        sourcePath: activeNotePage.sourcePath,
        sourceTitle: activeNotePage.sourceTitle,
      }).then(() => setEditorDirty(false)).catch(() => {
        // Keep editorDirty = true so user edits are NEVER overwritten on error!
      });
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [activeNotePage, editorBody, editorSummary, editorTags, editorDirty, nb.updateNotePage]);

  // Folder groups
  const folderGroups = useMemo(() => groupNotePagesByFolder(notePages), [notePages]);

  // Visible entries across selected scope (specific Note Page, Special filter Favorite/All/Folder)
  const visibleEntries = useMemo(() => {
    let base;
    if (selectedFolderFilter === '__ALL__' && !pickedNoteId) {
      base = nb.allEntries;
    } else if (selectedFolderFilter === '__FAVORITES__') {
      const favPageIds = new Set(notePages.filter((p) => p.favorite).map((p) => p.id));
      base = nb.allEntries.filter((e) => e.favorite || favPageIds.has(e.learnerNoteId));
    } else if (activeNotePage) {
      base = (nb.entriesByPageId.get(activeNotePage.id) || []).map((e) => ({
        ...e,
        notePageTitle: activeNotePage.title,
        folderName: activeNotePage.folder,
      }));
    } else {
      base = nb.allEntries;
    }

    const q = search.trim().toLowerCase();
    const filtered = base.filter((e) => {
      if (kindFilter !== 'all' && e.kind !== kindFilter) return false;
      if (!q) return true;
      return [e.term, e.reading, e.meaning, e.personalNote, e.sourceTitle, e.notePageTitle, ...(e.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    if (sortBy === 'alpha') {
      return [...filtered].sort((a, b) => a.term.localeCompare(b.term, 'ja'));
    }
    if (sortBy === 'srs') {
      return [...filtered].sort((a, b) => Number(b.hasSrs) - Number(a.hasSrs));
    }
    return [...filtered].sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
  }, [selectedFolderFilter, pickedNoteId, activeNotePage, nb.allEntries, nb.entriesByPageId, notePages, search, kindFilter, sortBy]);

  const activeEntry = useMemo(
    () => visibleEntries.find((e) => e.noteEntryId === pickedEntryId) || visibleEntries[0] || null,
    [visibleEntries, pickedEntryId]
  );

  // Entry personal note edit buffer
  const [entryEditId, setEntryEditId] = useState(null);
  const [entryPersonalNoteDraft, setEntryPersonalNoteDraft] = useState('');
  const [entryMeaningDraft, setEntryMeaningDraft] = useState('');

  if (activeEntry?.noteEntryId != null && activeEntry.noteEntryId !== entryEditId) {
    setEntryEditId(activeEntry.noteEntryId);
    setEntryPersonalNoteDraft(activeEntry.personalNote || '');
    setEntryMeaningDraft(activeEntry.meaning || '');
  }

  // Kanji Search & Save integration inside "Tra cứu Kanji" mode
  const [kanjiKeyword, setKanjiKeyword] = useState('');
  const [kanjiSubmitted, setKanjiSubmitted] = useState('');
  const [selectedKanjiDetail, setSelectedKanjiDetail] = useState(null);
  const kanjiSearchQuery = useQuery({
    queryKey: ['kanji-search', kanjiSubmitted],
    queryFn: () => searchKanji(kanjiSubmitted),
    enabled: mode === 'kanji-bank' && kanjiSubmitted.length > 0,
  });
  const savedKanjiIds = useMemo(
    () => new Set(nb.allEntries.map((e) => e.kanjiId).filter(Boolean)),
    [nb.allEntries]
  );

  const saveKanjiBookmark = useMutation({
    mutationFn: async (kanjiItem) => {
      const targetId = activeNotePage?.id || notePages[0]?.id || null;
      return nb.quickSaveCapture.mutateAsync({
        targetNoteId: targetId,
        newNoteTitle: targetId ? '' : 'Kanji đã lưu',
        folderName: activeNotePage?.folder || 'Kanji',
        kind: 'kanji',
        term: kanjiItem.character,
        reading: [kanjiItem.onYomi, kanjiItem.kunYomi].filter(Boolean).join(' · '),
        meaning: kanjiItem.meaning,
        kanjiId: kanjiItem.id,
        enrollSrs: true,
      });
    },
    onSuccess: () => notify.success(tr('Đã lưu Hán tự vào Sổ tay'), '', { key: 'nb-kanji-save' }),
    onError: (err) => notify.apiError(err, tr('Chưa lưu được Hán tự')),
  });

  function applyEditorFormat(prefix, suffix = '', placeholder = '') {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? editorBody.length;
    const end = el.selectionEnd ?? editorBody.length;
    const selected = editorBody.slice(start, end) || placeholder;
    const next = `${editorBody.slice(0, start)}${prefix}${selected}${suffix}${editorBody.slice(end)}`;
    setEditorBody(next);
    setEditorDirty(true);
    window.setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  async function handleManualSavePage() {
    if (!activeNotePage) return;
    try {
      await nb.updateNotePage.mutateAsync({
        id: activeNotePage.id,
        title: activeNotePage.title,
        folder: activeNotePage.folder,
        summary: editorSummary,
        body: editorBody,
        tags: editorTags.split(',').map((t) => t.trim()).filter(Boolean),
        favorite: activeNotePage.favorite,
        sourcePath: activeNotePage.sourcePath,
        sourceTitle: activeNotePage.sourceTitle,
      });
      setEditorDirty(false);
      notify.success(tr('Đã lưu trang ghi chú'), '', { key: 'nb-page-save-ok' });
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được trang ghi chú'));
    }
  }

  async function handleCreateFolderAndPage(e) {
    e.preventDefault();
    const fname = newFolderName.trim();
    if (!fname) return;
    try {
      const created = await nb.createNotePage.mutateAsync({
        title: 'Ghi chú tổng quan',
        folder: fname,
      });
      setNewFolderName('');
      setNewFolderModal(false);
      if (created?.id) {
        setSelectedFolderFilter(fname);
        setPickedNoteId(created.id);
      }
      notify.success(tr('Đã tạo thư mục mới'), '', { key: 'nb-create-folder' });
    } catch (err) {
      notify.apiError(err, tr('Không tạo được thư mục'));
    }
  }

  async function handleCreateNotePage(e, folderName) {
    e.preventDefault();
    const title = creatingNoteTitle.trim();
    if (!title) return;
    try {
      const created = await nb.createNotePage.mutateAsync({
        title,
        folder: folderName || DEFAULT_FOLDER_NAME,
      });
      setCreatingNoteTitle('');
      if (created?.id) setPickedNoteId(created.id);
      notify.success(tr('Đã tạo trang ghi chú mới'), '', { key: 'nb-create-page' });
    } catch (err) {
      notify.apiError(err, tr('Không tạo được trang ghi chú'));
    }
  }

  async function handleDeleteNotePage(page) {
    const ok = await confirmAction({
      title: trf('Xóa trang "{0}"?', { 0: page.title }),
      description: tr('Toàn bộ mục đã lưu bên trong trang này cũng sẽ bị xóa.'),
      confirmLabel: tr('Xóa trang'),
    });
    if (!ok) return;
    try {
      await nb.removeNotePage.mutateAsync(page.id);
      if (pickedNoteId === page.id) setPickedNoteId(null);
      notify.success(tr('Đã xóa trang ghi chú'), '');
    } catch (err) {
      notify.apiError(err, tr('Không xóa được trang ghi chú'));
    }
  }

  async function handleQuickAddEntry(e) {
    e.preventDefault();
    if (!quickDraft.word.trim()) return;
    try {
      await nb.quickSaveCapture.mutateAsync({
        targetNoteId: activeNotePage?.id || null,
        newNoteTitle: activeNotePage ? '' : 'Sổ tay của tôi',
        kind: quickDraft.kind,
        term: quickDraft.word.trim(),
        reading: quickDraft.reading.trim(),
        meaning: quickDraft.meaning.trim(),
        personalNote: quickDraft.note.trim(),
        enrollSrs: quickDraft.enrollSrs,
      });
      setQuickDraft({ word: '', reading: '', meaning: '', note: '', kind: 'vocabulary', enrollSrs: false });
      setShowQuickAdd(false);
      notify.success(tr('Đã thêm mục mới vào Sổ tay'), '');
    } catch (err) {
      notify.apiError(err, tr('Chưa thêm được mục mới'));
    }
  }

  if (nb.listsQuery.isPending) {
    return <SakuraLoader variant="section" context="writing" label={tr('Đang tải Sổ tay thông minh…')} delay={150} />;
  }

  if (nb.listsQuery.isError || (nb.entriesError && !nb.allEntries.length)) {
    return (
      <ContextualErrorState
        error={nb.listsQuery.error || nb.entriesError}
        title={tr('Chưa tải được dữ liệu Sổ tay')}
        onRetry={() => nb.refetchAll()}
      />
    );
  }

  return (
    <div data-page="SmartNotebookWorkspace" className="space-y-3">
      {/* Top Header Strip */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white px-4 py-3 shadow-[0_6px_24px_-8px_rgba(181,61,92,0.08)]">
        <div className="flex min-w-0 items-center gap-3">
          <SakuraNotebookBubbleIcon className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[19px] font-bold tracking-tight text-rp-text">{tr('Sổ tay học tập thông minh')}</h1>
              {nb.saveState.status === 'saving' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rp-brand-tint px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong">
                  <Loader2 className="h-3 w-3 animate-spin" /> {tr('Đang lưu…')}
                </span>
              )}
              {nb.saveState.status === 'saved' && !editorDirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> {tr('Đã lưu đồng bộ')}
                </span>
              )}
              {nb.saveState.status === 'error' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  <AlertCircle className="h-3 w-3" /> {nb.saveState.error || tr('Lỗi khi lưu')}
                </span>
              )}
            </div>
            <p className="text-[12px] text-rp-text-muted">
              {trf('{0} trang ghi chú · {1} mục đã lưu (từ vựng, ngữ pháp, Hán tự & highlight bài học)', {
                0: notePages.length,
                1: nb.allEntries.length,
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-rp-line bg-[#FCFAFB] p-0.5 text-[12px]">
            <button
              type="button"
              onClick={() => setMode('workspace')}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-semibold transition-colors ${
                mode === 'workspace' ? 'bg-white text-rp-brand-strong shadow-2xs' : 'text-rp-text-2 hover:text-rp-text'
              }`}
            >
              <NotebookPen className="h-3.5 w-3.5" />
              <span>{tr('Sổ tay')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('kanji-bank')}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-semibold transition-colors ${
                mode === 'kanji-bank' ? 'bg-white text-rp-brand-strong shadow-2xs' : 'text-rp-text-2 hover:text-rp-text'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>{tr('Tra cứu Kanji')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickAdd((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tr('Thêm nhanh')}</span>
          </button>
        </div>
      </header>

      {/* Quick Add Inline Drawer */}
      {showQuickAdd && (
        <form onSubmit={handleQuickAddEntry} className="rounded-2xl border border-rp-brand-border bg-[#FFF9FB] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-rp-text">
              {tr('Thêm mục mới vào trang')} {activeNotePage ? `“${activeNotePage.title}”` : ''}
            </h2>
            <button type="button" onClick={() => setShowQuickAdd(false)} className="text-[12px] font-semibold text-rp-text-muted hover:text-rp-text">
              {tr('Đóng')}
            </button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-4">
            <CustomSelect
              size="sm"
              value={quickDraft.kind}
              onChange={(val) => setQuickDraft((d) => ({ ...d, kind: val }))}
              options={NOTEBOOK_CONTENT_KINDS.filter((k) => k.id !== 'all').map((k) => ({
                value: k.id,
                label: tr(k.label),
              }))}
            />
            <input
              required
              placeholder={tr('Từ / Nội dung *')}
              value={quickDraft.word}
              onChange={(e) => setQuickDraft((d) => ({ ...d, word: e.target.value }))}
              className="h-9 rounded-xl border border-rp-line bg-white px-3 text-[12.5px]"
            />
            <input
              placeholder={tr('Cách đọc (Furigana)')}
              value={quickDraft.reading}
              onChange={(e) => setQuickDraft((d) => ({ ...d, reading: e.target.value }))}
              className="h-9 rounded-xl border border-rp-line bg-white px-3 text-[12.5px]"
            />
            <input
              placeholder={tr('Nghĩa tiếng Việt')}
              value={quickDraft.meaning}
              onChange={(e) => setQuickDraft((d) => ({ ...d, meaning: e.target.value }))}
              className="h-9 rounded-xl border border-rp-line bg-white px-3 text-[12.5px]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              placeholder={tr('Ghi chú cá nhân…')}
              value={quickDraft.note}
              onChange={(e) => setQuickDraft((d) => ({ ...d, note: e.target.value }))}
              className="h-9 min-w-[240px] flex-1 rounded-xl border border-rp-line bg-white px-3 text-[12.5px]"
            />
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-rp-text-2">
              <input
                type="checkbox"
                checked={quickDraft.enrollSrs}
                onChange={(e) => setQuickDraft((d) => ({ ...d, enrollSrs: e.target.checked }))}
                className="accent-rp-brand-pressed"
              />
              {tr('Thêm vào SRS')}
            </label>
            <button type="submit" disabled={nb.quickSaveCapture.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-[12px] font-semibold text-white hover:bg-rp-brand-strong">
              {tr('Lưu mục')}
            </button>
          </div>
        </form>
      )}

      {/* Kanji Search Mode (preserves original Sổ Kanji functionality cleanly) */}
      {mode === 'kanji-bank' ? (
        <section className="rounded-2xl border border-rp-line bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-rp-text">{tr('Tra cứu & lưu Hán tự từ kho dùng chung')}</h2>
              <p className="text-[12.5px] text-rp-text-muted">{tr('Lưu trực tiếp vào Sổ tay hiện tại và đồng bộ với hàng chờ ôn tập SRS.')}</p>
            </div>
            <button type="button" onClick={() => setMode('workspace')} className="rounded-xl border border-rp-line px-3 py-1.5 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint">
              {tr('← Về Sổ tay')}
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setKanjiSubmitted(kanjiKeyword.trim());
            }}
          >
            <input
              value={kanjiKeyword}
              onChange={(e) => setKanjiKeyword(e.target.value)}
              placeholder={tr('Gõ chữ Hán, âm đọc hoặc nghĩa…')}
              className="h-10 flex-1 rounded-xl border border-rp-line bg-rp-bg-2 px-3.5 text-[13.5px]"
            />
            <button type="submit" className="h-10 rounded-xl bg-rp-brand-pressed px-5 text-[13px] font-semibold text-white hover:bg-rp-brand-strong">
              {tr('Tìm')}
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-rp-text-muted">{tr('Gợi ý')}:</span>
            {KANJI_SAMPLES.map((s) => (
              <button key={s} type="button" onClick={() => { setKanjiKeyword(s); setKanjiSubmitted(s); }} className="h-7.5 rounded-full bg-rp-brand-tint px-3 text-[13px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft">
                {s}
              </button>
            ))}
          </div>

          {kanjiSearchQuery.isPending && kanjiSubmitted && <SakuraLoader variant="section" context="writing" delay={140} />}
          {kanjiSearchQuery.isError && (
            <ContextualErrorState
              variant="inline"
              compact
              error={kanjiSearchQuery.error}
              title={tr('Chưa tìm được dữ liệu Kanji')}
              onRetry={() => kanjiSearchQuery.refetch()}
              retrying={kanjiSearchQuery.isFetching}
            />
          )}
          {kanjiSearchQuery.isSuccess && (kanjiSearchQuery.data?.items || []).length === 0 && (
            <p className="py-4 text-center text-sm text-rp-text-muted">{tr('Không tìm thấy chữ Kanji phù hợp.')}</p>
          )}
          {kanjiSearchQuery.isSuccess && (kanjiSearchQuery.data?.items || []).length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(kanjiSearchQuery.data?.items || []).map((item) => {
                const stored = savedKanjiIds.has(item.id);
                return (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-rp-line p-3.5">
                    <button
                      type="button"
                      onClick={() => setSelectedKanjiDetail(item)}
                      className="rp-focus flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint text-[32px] font-bold text-rp-brand-deep hover:bg-rp-brand-soft"
                      aria-label={trf('Xem chi tiết chữ {0}', { 0: item.character })}
                    >
                      {item.character}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-rp-text">{item.meaning}</p>
                      <p className="mt-0.5 truncate text-[12px] text-rp-text-muted">
                        {[item.onYomi && `On: ${item.onYomi}`, item.kunYomi && `Kun: ${item.kunYomi}`].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedKanjiDetail(item)}>
                          {tr('Chi tiết')}
                        </Button>
                        <button
                          type="button"
                          disabled={stored || saveKanjiBookmark.isPending}
                          onClick={() => saveKanjiBookmark.mutate(item)}
                          className={`h-7.5 rounded-full px-3 text-[11.5px] font-semibold ${
                            stored ? 'bg-emerald-50 text-emerald-700' : 'border border-rp-brand-border text-rp-brand-strong hover:bg-rp-brand-tint'
                          }`}
                        >
                          {stored ? tr('Đã có trong sổ') : tr('Lưu Kanji')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Drawer
            open={Boolean(selectedKanjiDetail)}
            onClose={() => setSelectedKanjiDetail(null)}
            title={selectedKanjiDetail ? `Kanji: ${selectedKanjiDetail.character}` : ''}
            width="w-[min(420px,100vw)]"
          >
            {selectedKanjiDetail && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-rp-line bg-rp-bg-2 p-4">
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint text-5xl font-bold text-rp-brand-deep">
                    {selectedKanjiDetail.character}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-bold text-rp-text">{selectedKanjiDetail.meaning}</p>
                    {selectedKanjiDetail.sinoVietnamese && (
                      <p className="text-xs text-rp-text-2">{tr('Hán Việt')}: {selectedKanjiDetail.sinoVietnamese}</p>
                    )}
                    {selectedKanjiDetail.jlptLevelName && (
                      <span className="inline-block rounded-full bg-rp-brand-tint px-2 py-0.5 text-xs font-semibold text-rp-brand-strong">
                        JLPT {selectedKanjiDetail.jlptLevelName}
                      </span>
                    )}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
                    <dt className="text-rp-text-muted">Onyomi</dt>
                    <dd className="mt-0.5 font-semibold text-rp-text">{selectedKanjiDetail.onYomi || '—'}</dd>
                  </div>
                  <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
                    <dt className="text-rp-text-muted">Kunyomi</dt>
                    <dd className="mt-0.5 font-semibold text-rp-text">{selectedKanjiDetail.kunYomi || '—'}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savedKanjiIds.has(selectedKanjiDetail.id) || saveKanjiBookmark.isPending}
                    onClick={() => saveKanjiBookmark.mutate(selectedKanjiDetail)}
                  >
                    {savedKanjiIds.has(selectedKanjiDetail.id) ? tr('Đã có trong sổ') : tr('Lưu vào Sổ tay')}
                  </Button>
                  <Button variant="secondary" size="sm" icon={Volume2} onClick={() => speakJapanese(selectedKanjiDetail.character)}>
                    {tr('Nghe')}
                  </Button>
                </div>
              </div>
            )}
          </Drawer>
        </section>
      ) : (
        /* 3-Column Smart Notebook Workspace */
        <div className="grid items-start gap-3 lg:grid-cols-[260px_minmax(280px,360px)_minmax(0,1fr)]">
          {/* LEFT: Folder -> Note Page Navigator */}
          <aside className="rounded-2xl border border-rp-line bg-white p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">{tr('Thư mục & Trang')}</span>
              <button
                type="button"
                onClick={() => setNewFolderModal((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg bg-rp-brand-tint px-2 py-1 text-[11px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft"
              >
                <FolderPlus className="h-3 w-3" /> {tr('Thư mục')}
              </button>
            </div>

            {newFolderModal && (
              <form onSubmit={handleCreateFolderAndPage} className="flex gap-1.5">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={tr('Tên thư mục (VD: JLPT N4)')}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-rp-line px-2.5 text-[12px]"
                />
                <button type="submit" className="h-8 rounded-lg bg-rp-brand-pressed px-2.5 text-[11.5px] font-semibold text-white">
                  {tr('Tạo')}
                </button>
              </form>
            )}

            {/* Special views */}
            <div className="space-y-1 text-[12.5px]">
              <button
                type="button"
                onClick={() => { setSelectedFolderFilter('__ALL__'); setPickedNoteId(null); }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-semibold transition-colors ${
                  selectedFolderFilter === '__ALL__' && !pickedNoteId ? 'bg-rp-brand-tint text-rp-brand-strong' : 'text-rp-text-2 hover:bg-rp-bg-2'
                }`}
              >
                <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> {tr('Tất cả mục đã lưu')}</span>
                <span className="text-[11px] opacity-75">{nb.allEntries.length}</span>
              </button>
              <button
                type="button"
                onClick={() => { setSelectedFolderFilter('__FAVORITES__'); setPickedNoteId(null); }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-semibold transition-colors ${
                  selectedFolderFilter === '__FAVORITES__' ? 'bg-rp-brand-tint text-rp-brand-strong' : 'text-rp-text-2 hover:bg-rp-bg-2'
                }`}
              >
                <span className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-amber-500" /> {tr('Trang yêu thích')}</span>
                <span className="text-[11px] opacity-75">{notePages.filter((p) => p.favorite).length}</span>
              </button>
            </div>

            {/* Folders tree */}
            <div className="space-y-2 border-t border-rp-line pt-2.5">
              {folderGroups.map((folder) => (
                <div key={folder.name} className="space-y-1">
                  <div className="flex items-center justify-between px-1.5 py-1 text-[12px] font-bold text-rp-text">
                    <span className="flex items-center gap-1.5 truncate">
                      <SakuraFolderIcon open className="h-4 w-4 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="text-[10.5px] font-medium text-rp-text-muted">{folder.totalEntries}</span>
                  </div>
                  <div className="space-y-0.5 pl-3">
                    {folder.pages.map((page) => {
                      const active = pickedNoteId === page.id || (!pickedNoteId && selectedFolderFilter === folder.name && activeNotePage?.id === page.id);
                      return (
                        <div key={page.id} className="group flex items-center gap-1">
                          {renamingNoteId === page.id ? (
                            <form
                              className="flex flex-1 gap-1"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!renamingNoteValue.trim()) return;
                                await nb.updateNotePage.mutateAsync({ ...page, title: renamingNoteValue.trim() });
                                setRenamingNoteId(null);
                              }}
                            >
                              <input
                                autoFocus
                                value={renamingNoteValue}
                                onChange={(e) => setRenamingNoteValue(e.target.value)}
                                className="h-7 min-w-0 flex-1 rounded-lg border border-rp-brand-border px-2 text-[12px]"
                              />
                              <button type="submit" className="rounded-lg bg-rp-brand-pressed px-2 text-[11px] font-semibold text-white">{tr('Lưu')}</button>
                            </form>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFolderFilter(folder.name);
                                  setPickedNoteId(page.id);
                                }}
                                className={`flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors ${
                                  active ? 'bg-[#FFF0F4] font-semibold text-rp-brand-strong' : 'text-rp-text-2 hover:bg-rp-bg-2'
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <SakuraNotePageIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{page.title}</span>
                                </span>
                                <span className="shrink-0 text-[11px] text-rp-text-muted">{page.entryCount}</span>
                              </button>
                              <button
                                type="button"
                                title={tr('Đổi tên trang')}
                                onClick={() => { setRenamingNoteId(page.id); setRenamingNoteValue(page.title); }}
                                className="hidden rounded p-1 text-rp-text-muted hover:bg-rp-bg-2 group-hover:inline-flex"
                              >
                                <Pencil className="h-3 w-3" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                title={tr('Xóa trang')}
                                onClick={() => handleDeleteNotePage(page)}
                                className="hidden rounded p-1 text-rp-text-muted hover:bg-red-50 hover:text-red-700 group-hover:inline-flex"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* New Note Page inline form */}
              <form
                onSubmit={(e) => handleCreateNotePage(e, activeNotePage?.folder || DEFAULT_FOLDER_NAME)}
                className="flex gap-1.5 pt-2"
              >
                <input
                  value={creatingNoteTitle}
                  onChange={(e) => setCreatingNoteTitle(e.target.value)}
                  placeholder={tr('+ Trang mới (VD: Từ mới bài 3)')}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-rp-line bg-[#FCFAFB] px-2.5 text-[12px]"
                />
                {creatingNoteTitle.trim() && (
                  <button type="submit" className="h-8 rounded-lg bg-rp-brand-pressed px-2.5 text-[11.5px] font-semibold text-white">
                    {tr('Tạo')}
                  </button>
                )}
              </form>
            </div>
          </aside>

          {/* MIDDLE: Search, Filter & Saved Entries */}
          <section className="rounded-2xl border border-rp-line bg-white p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rp-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr('Tìm từ, ghi chú, nguồn học…')}
                  className="h-9 w-full rounded-xl border border-rp-line bg-[#FCFAFB] pl-8.5 pr-3 text-[12.5px]"
                />
              </label>
              <div className="w-32 shrink-0">
                <CustomSelect
                  size="sm"
                  aria-label={tr('Sắp xếp')}
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'recent', label: tr('Mới nhất') },
                    { value: 'alpha', label: tr('Theo chữ') },
                    { value: 'srs', label: tr('Ưu tiên SRS') },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {NOTEBOOK_CONTENT_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKindFilter(k.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    kindFilter === k.id ? 'bg-rp-brand-pressed text-white' : 'bg-rp-bg-2 text-rp-text-2 hover:bg-rp-brand-tint'
                  }`}
                >
                  {tr(k.label)}
                </button>
              ))}
            </div>

            <div className="max-h-[540px] space-y-1.5 overflow-y-auto pr-0.5">
              {visibleEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-rp-line bg-[#FCFAFB] px-4 py-8 text-center text-[12.5px] text-rp-text-muted">
                  <Sparkles className="mx-auto mb-2 h-5 w-5 text-rp-brand-strong/70" />
                  <p>{tr('Chưa có mục nào khớp bộ lọc.')}</p>
                  <p className="mt-1 text-[11.5px]">{tr('Bấm "Thêm nhanh" hoặc bôi đen chữ khi đọc bài học để lưu.')}</p>
                </div>
              ) : visibleEntries.map((entry) => {
                const selected = activeEntry?.noteEntryId === entry.noteEntryId;
                const tone = getHighlightColorMeta(entry.color);
                return (
                  <button
                    key={entry.noteEntryId}
                    type="button"
                    onClick={() => setPickedEntryId(entry.noteEntryId)}
                    className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                      selected
                        ? 'border-rp-brand-pressed bg-[#FFF5F7]'
                        : 'border-rp-line bg-white hover:border-rp-brand-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-rp-text">{entry.term}</span>
                        {entry.reading && <span className="ml-1.5 text-[11.5px] text-rp-brand-strong">{entry.reading}</span>}
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.bgClass} ${tone.borderClass} ${tone.textClass}`}>
                        {tr(NOTEBOOK_CONTENT_KINDS.find((k) => k.id === entry.kind)?.label || entry.kind)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-rp-text-2">{entry.meaning}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-rp-text-muted">
                      {entry.hasSrs && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          <Repeat className="h-2.5 w-2.5" /> SRS
                        </span>
                      )}
                      {entry.sourceTitle && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{entry.sourceTitle}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* RIGHT: Rich Note Page Editor & Selected Entry Inspector */}
          <main className="space-y-3">
            {/* Active Note Page Editor */}
            {activeNotePage && (
              <section className="rounded-2xl border border-rp-line bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line pb-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <SakuraNotePageIcon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-bold text-rp-text">{activeNotePage.title}</h2>
                      <p className="text-[11.5px] text-rp-text-muted">
                        <FolderOpen className="mr-1 inline h-3 w-3" />
                        {activeNotePage.folder}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title={activeNotePage.favorite ? tr('Bỏ yêu thích') : tr('Đánh dấu yêu thích')}
                      onClick={() => nb.updateNotePage.mutate({ ...activeNotePage, summary: editorSummary, body: editorBody, favorite: !activeNotePage.favorite })}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                        activeNotePage.favorite ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-rp-line text-rp-text-muted hover:bg-rp-bg-2'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-40 shrink-0">
                      <CustomSelect
                        size="sm"
                        aria-label={tr('Di chuyển trang sang thư mục')}
                        value={activeNotePage.folder}
                        onChange={(val) => nb.updateNotePage.mutate({ ...activeNotePage, summary: editorSummary, body: editorBody, folder: val })}
                        options={folderGroups.map((f) => ({ value: f.name, label: `${tr('Thư mục')}: ${f.name}` }))}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={nb.updateNotePage.isPending}
                      onClick={handleManualSavePage}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-rp-brand-pressed px-3 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{editorDirty ? tr('Lưu ngay*') : tr('Lưu trang')}</span>
                    </button>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-[#FCFAFB] px-2.5 py-1.5 text-[11.5px]">
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => applyEditorFormat('## ', '', 'Tiêu đề')} className="rounded px-2 py-1 font-bold hover:bg-white">H2</button>
                    <button type="button" onClick={() => applyEditorFormat('**', '**', 'chữ đậm')} className="rounded px-2 py-1 font-bold hover:bg-white">B</button>
                    <button type="button" onClick={() => applyEditorFormat('*', '*', 'chữ nghiêng')} className="rounded px-2 py-1 italic hover:bg-white">I</button>
                    <button type="button" title={tr('Đánh dấu nổi bật')} aria-label={tr('Đánh dấu nổi bật')} onClick={() => applyEditorFormat('==', '==', 'nội dung quan trọng')} className="inline-flex items-center gap-1 rounded bg-[#FCE8EF] px-2 py-1 font-semibold text-[#8C2D4B] hover:brightness-95"><Highlighter className="h-3 w-3" aria-hidden="true" /><span>{tr('Đánh dấu')}</span></button>
                    <button type="button" onClick={() => applyEditorFormat('`', '`', '日本語')} className="rounded px-2 py-1 font-semibold text-rp-brand-strong hover:bg-white">あ/漢</button>
                    <button type="button" onClick={() => applyEditorFormat('- ', '', 'Ý chính')} className="rounded px-2 py-1 hover:bg-white">• List</button>
                    <button type="button" onClick={() => applyEditorFormat('1. ', '', 'Bước 1')} className="rounded px-2 py-1 hover:bg-white">1. List</button>
                  </div>
                  <div className="inline-flex rounded-lg border border-rp-line bg-white p-0.5 text-[11px]">
                    {['write', 'split', 'preview'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditorMode(m)}
                        className={`rounded px-2 py-0.5 font-semibold ${editorMode === m ? 'bg-rp-brand-tint text-rp-brand-strong' : 'text-rp-text-muted'}`}
                      >
                        {m === 'write' ? tr('Soạn') : m === 'preview' ? tr('Xem') : tr('Song song')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor + Safe Preview */}
                <div className={`grid gap-3 ${editorMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                  {editorMode !== 'preview' && (
                    <textarea
                      ref={textareaRef}
                      rows={6}
                      value={editorBody}
                      onChange={(e) => { setEditorBody(e.target.value); setEditorDirty(true); }}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                          e.preventDefault();
                          applyEditorFormat('**', '**', 'chữ đậm');
                        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                          e.preventDefault();
                          applyEditorFormat('*', '*', 'chữ nghiêng');
                        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                          e.preventDefault();
                          void handleManualSavePage();
                        }
                      }}
                      placeholder={tr('Viết tóm tắt bài học, cấu trúc ngữ pháp, ví dụ tiếng Nhật (`日本語`) và ghi chú cá nhân tại đây…')}
                      className="w-full rounded-xl border border-rp-line bg-white p-3 text-[13px] leading-relaxed"
                    />
                  )}
                  {editorMode !== 'write' && (
                    <div className="max-h-[210px] overflow-y-auto rounded-xl border border-rp-line bg-[#FCFAFB] p-3">
                      <SafeRichNoteRenderer content={editorBody} />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Selected Saved Entry Inspector */}
            {activeEntry && (
              <section className="rounded-2xl border border-rp-line bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[20px] font-bold text-rp-text">{activeEntry.term}</h3>
                      {activeEntry.reading && <span className="rounded-full bg-rp-brand-tint px-2.5 py-0.5 text-[12px] font-semibold text-rp-brand-strong">{activeEntry.reading}</span>}
                      <button
                        type="button"
                        onClick={() => speakJapanese(activeEntry.term)}
                        title={tr('Nghe phát âm')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rp-line text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {activeEntry.sourcePath && (
                      <Link
                        to={activeEntry.sourcePath}
                        className="rp-link mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-rp-brand-strong"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{tr('Quay lại nguồn học')}: {activeEntry.sourceTitle || activeEntry.sourcePath}</span>
                      </Link>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeEntry.hasSrs ? (
                      <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> {tr('Đã có trong SRS')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={nb.enrollToSrs.isPending}
                        onClick={async () => {
                          await nb.enrollToSrs.mutateAsync(activeEntry.noteEntryId);
                          notify.success(tr('Đã thêm vào hàng chờ ôn tập SRS'), '');
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-rp-brand-border bg-rp-brand-tint px-3 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft"
                      >
                        <Repeat className="h-3.5 w-3.5" /> {tr('Thêm vào ôn tập SRS')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirmAction({ title: tr('Xóa mục này khỏi Sổ tay?'), confirmLabel: tr('Xóa') });
                        if (ok) await nb.deleteEntry.mutateAsync(activeEntry.noteEntryId);
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 text-[12px] font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Read-only shared vocabulary notice if linked to shared bank */}
                {(activeEntry.vocabularyId || activeEntry.kanjiId) ? (
                  <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-[12.5px]">
                    <span className="font-semibold text-rp-text">{tr('Nghĩa từ điển gốc')}:</span> {activeEntry.meaning}
                    <span className="ml-2 text-[11px] text-rp-text-muted">({tr('Dữ liệu từ điển chung được bảo toàn; bạn chỉ chỉnh ghi chú cá nhân bên dưới')})</span>
                  </div>
                ) : (
                  <label className="block text-[12px] font-semibold text-rp-text-2">
                    {tr('Nghĩa / Nội dung chính')}
                    <input
                      value={entryMeaningDraft}
                      onChange={(e) => setEntryMeaningDraft(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-rp-line px-3 text-[13px] font-normal"
                    />
                  </label>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-semibold text-rp-text-muted">{tr('Màu highlight')}:</span>
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => nb.updateEntry.mutate({
                          noteEntryId: activeEntry.noteEntryId,
                          personalNote: entryPersonalNoteDraft,
                          meta: { ...activeEntry, color: c.id },
                        })}
                        style={{ backgroundColor: c.markBg, borderColor: c.markBorder }}
                        className={`h-5 w-5 rounded-full border ${activeEntry.color === c.id ? 'ring-2 ring-rp-brand-pressed ring-offset-1' : 'opacity-80'}`}
                      />
                    ))}
                  </div>

                  <div className="w-56 shrink-0">
                    <CustomSelect
                      size="sm"
                      aria-label={tr('Chuyển sang trang ghi chú khác')}
                      value={String(activeNotePage?.id || activeEntry.learnerNoteId || '')}
                      onChange={(val) => nb.updateEntry.mutate({
                        noteEntryId: activeEntry.noteEntryId,
                        learnerNoteId: Number(val),
                        personalNote: entryPersonalNoteDraft,
                        meta: activeEntry,
                      })}
                      options={notePages.map((p) => ({
                        value: String(p.id),
                        label: `${tr('Chuyển tới')}: ${p.folder} / ${p.title}`,
                      }))}
                    />
                  </div>
                </div>

                <label className="block text-[12px] font-semibold text-rp-text-2">
                  {tr('Ghi chú cá nhân')}
                  <textarea
                    rows={3}
                    value={entryPersonalNoteDraft}
                    onChange={(e) => setEntryPersonalNoteDraft(e.target.value)}
                    placeholder={tr('Ghi lại cách dùng, mẹo nhớ hoặc ví dụ riêng của bạn…')}
                    className="mt-1 w-full rounded-xl border border-rp-line p-2.5 text-[13px] font-normal"
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={nb.updateEntry.isPending}
                    onClick={async () => {
                      await nb.updateEntry.mutateAsync({
                        noteEntryId: activeEntry.noteEntryId,
                        meaning: activeEntry.vocabularyId || activeEntry.kanjiId ? null : entryMeaningDraft,
                        personalNote: entryPersonalNoteDraft,
                        meta: activeEntry,
                      });
                      notify.success(tr('Đã cập nhật ghi chú cá nhân'), '');
                    }}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{tr('Lưu thay đổi mục')}</span>
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
