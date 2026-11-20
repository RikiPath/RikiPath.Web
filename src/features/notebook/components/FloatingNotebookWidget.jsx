import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Highlighter,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { CustomSelect, notify } from '@/components/ui';
import {
  computeContentVersionHash,
  DEFAULT_FOLDER_NAME,
  getHighlightColorMeta,
  groupNotePagesByFolder,
} from '@/features/notebook/utils/notebookModel.js';
import { useOptionalSmartNotebook } from '@/features/notebook/context/smartNotebookState.js';
import { SakuraNotebookBubbleIcon } from './SakuraNotebookIcons.jsx';

/**
 * Global Floating Notebook Bubble & Quick Panel for Learner Workspace.
 * Positioned at bottom-right cleanly clear of top-right Toasts and left Sidebar.
 * Never renders for non-Learner roles, public routes, or restricted timed Exam pages.
 */
export default function FloatingNotebookWidget() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const nb = useOptionalSmartNotebook();

  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'highlights' | 'recent'
  const [compactMinimized, setCompactMinimized] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickBody, setQuickBody] = useState('');
  const [targetFolder, setTargetFolder] = useState(DEFAULT_FOLDER_NAME);
  const [targetNoteId, setTargetNoteId] = useState('');

  const notePages = useMemo(() => nb?.notePages || [], [nb?.notePages]);
  const folders = useMemo(() => groupNotePagesByFolder(notePages), [notePages]);
  const selectedPageId = targetNoteId || (notePages[0]?.id ? String(notePages[0].id) : '');

  const recentEntries = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    const items = nb?.allEntries || [];
    if (!q) return items.slice(0, 12);
    return items.filter((e) =>
      [e.term, e.reading, e.meaning, e.personalNote, e.sourceTitle, e.notePageTitle]
        .join(' ')
        .toLowerCase()
        .includes(q)
    ).slice(0, 18);
  }, [nb?.allEntries, quickSearch]);

  // Detect any highlights on current page whose content version drifted
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
      const versionStale = Boolean(h.contentVersion && liveHash && liveHash !== h.contentVersion);
      return { ...h, versionStale };
    });
  }, [nb?.pageHighlights]);

  if (!nb?.isLearner || !nb?.notebookAvailable || !nb?.policy?.bubbleAllowed) return null;

  // Hide inside Full Notebook itself so we don't float over the workspace
  const cleanPath = String(pathname || '').replace(/\/+$/, '') || '/';
  if (cleanPath === '/kanji-notebook' || cleanPath === '/vocabulary') return null;

  const isOpen = Boolean(nb.drawerOpen);

  async function handleQuickSaveNote(e) {
    e.preventDefault();
    if (!quickBody.trim() && !quickTitle.trim()) return;
    try {
      await nb.quickSaveCapture.mutateAsync({
        targetNoteId: selectedPageId ? Number(selectedPageId) : null,
        newNoteTitle: selectedPageId ? '' : (quickTitle.trim() || 'Ghi chú nhanh'),
        folderName: targetFolder || DEFAULT_FOLDER_NAME,
        kind: 'note',
        term: (quickTitle.trim() || quickBody.trim().split('\n')[0]).slice(0, 120),
        meaning: 'Ghi chú học tập',
        personalNote: quickBody.trim(),
        color: 'rose',
        sourcePath: nb.currentUrlKey,
        sourceTitle: document.title?.replace(/\s*\|\s*RikiPath.*$/, '') || 'Trang học hiện tại',
        enrollSrs: false,
      });
      setQuickTitle('');
      setQuickBody('');
      notify.success(tr('Đã lưu ghi chú vào Sổ tay'), '', { key: 'nb-floating-save' });
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được ghi chú'), { key: 'nb-floating-err' });
    }
  }

  return (
    <div
      data-notebook-ignore="true"
      className="pointer-events-none fixed bottom-4 right-4 z-[65] flex flex-col items-end gap-2.5 sm:bottom-5 sm:right-5"
    >
      {/* Quick Panel (Desktop Popover / Mobile Drawer-like Panel) */}
      {isOpen && (
        <section
          role="dialog"
          aria-label={tr('Sổ tay nhanh')}
          className={`rp-anim-pop pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-rp-brand-border bg-white shadow-[0_24px_64px_-16px_rgba(181,61,92,0.28)] transition-all ${
            compactMinimized
              ? 'w-[300px]'
              : 'h-[min(540px,78vh)] w-[min(410px,calc(100vw-2rem))]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-rp-line bg-[#FFF5F7] px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <SakuraNotebookBubbleIcon className="h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-rp-text">{tr('Sổ tay thông minh')}</p>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {nb.saveState.status === 'saving' ? (
                    <span className="inline-flex items-center gap-1 text-rp-brand-strong">
                      <Loader2 className="h-3 w-3 animate-spin" /> {tr('Đang lưu…')}
                    </span>
                  ) : nb.saveState.status === 'error' ? (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-3 w-3" /> {tr('Lỗi khi lưu')}
                    </span>
                  ) : nb.saveState.status === 'saved' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> {tr('Đã lưu đồng bộ')}
                    </span>
                  ) : (
                    <span className="text-rp-text-muted">{trf('{0} mục đã lưu', { 0: nb.allEntries.length })}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                to="/kanji-notebook/"
                onClick={() => nb.setDrawerOpen(false)}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-rp-brand-border bg-white px-2 text-[11px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
              >
                <ExternalLink className="h-3 w-3" />
                <span>{tr('Mở toàn bộ')}</span>
              </Link>
              <button
                type="button"
                aria-label={compactMinimized ? tr('Mở rộng') : tr('Thu gọn')}
                onClick={() => setCompactMinimized((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
              >
                {compactMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                aria-label={tr('Đóng')}
                onClick={() => nb.setDrawerOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!compactMinimized && (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-rp-line bg-[#FCFAFB] px-3 py-1.5 text-[12px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('quick')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'quick' ? 'bg-white text-rp-brand-strong shadow-2xs border border-rp-brand-border/60' : 'text-rp-text-2 hover:bg-white/70'
                  }`}
                >
                  {tr('Ghi chú nhanh')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('highlights')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'highlights' ? 'bg-white text-rp-brand-strong shadow-2xs border border-rp-brand-border/60' : 'text-rp-text-2 hover:bg-white/70'
                  }`}
                >
                  {tr('Highlight')} ({currentHighlights.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('recent')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    activeTab === 'recent' ? 'bg-white text-rp-brand-strong shadow-2xs border border-rp-brand-border/60' : 'text-rp-text-2 hover:bg-white/70'
                  }`}
                >
                  {tr('Gần đây')}
                </button>
              </div>

              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto p-3.5 text-[13px]">
                {activeTab === 'quick' && (
                  <form onSubmit={handleQuickSaveNote} className="space-y-3">
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-[11.5px] text-rp-text-2">
                      {tr('Mẹo: Bôi đen bất kỳ từ hoặc câu nào trong bài học để Highlight hoặc Lưu từ ngay tại chỗ.')}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold text-rp-text-muted">{tr('Thư mục')}</span>
                        <CustomSelect
                          size="sm"
                          value={targetFolder}
                          onChange={(f) => {
                            setTargetFolder(f);
                            const first = folders.find((x) => x.name === f)?.pages?.[0];
                            setTargetNoteId(first?.id ? String(first.id) : '');
                          }}
                          options={folders.map((f) => ({ value: f.name, label: tr(f.name) }))}
                        />
                      </div>
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold text-rp-text-muted">{tr('Trang ghi chú')}</span>
                        <CustomSelect
                          size="sm"
                          value={selectedPageId}
                          onChange={(val) => setTargetNoteId(val)}
                          options={notePages.map((p) => ({ value: String(p.id), label: p.title }))}
                        />
                      </div>
                    </div>

                    <input
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      maxLength={120}
                      placeholder={tr('Tiêu đề / Từ khóa cần nhớ (tùy chọn)…')}
                      className="h-9 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px]"
                    />

                    <textarea
                      rows={5}
                      value={quickBody}
                      onChange={(e) => setQuickBody(e.target.value)}
                      placeholder={tr('Viết ghi chú nhanh tại bài học này (không mất vị trí cuộn)…')}
                      className="w-full rounded-xl border border-rp-line bg-white px-3 py-2 text-[13px] leading-relaxed"
                    />

                    <button
                      type="submit"
                      disabled={nb.quickSaveCapture.isPending || (!quickBody.trim() && !quickTitle.trim())}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white hover:bg-rp-brand-strong disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{nb.quickSaveCapture.isPending ? tr('Đang lưu…') : tr('Lưu ghi chú nhanh')}</span>
                    </button>
                  </form>
                )}

                {activeTab === 'highlights' && (
                  <div className="space-y-2.5">
                    {currentHighlights.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-rp-line bg-[#FCFAFB] px-4 py-6 text-center text-[12.5px] text-rp-text-muted">
                        <Highlighter className="mx-auto mb-2 h-5 w-5 text-rp-brand-strong/70" />
                        <p>{tr('Chưa có highlight nào trong bài học hiện tại.')}</p>
                        <p className="mt-1 text-[11.5px]">{tr('Hãy bôi đen từ hoặc câu trong bài để đánh dấu.')}</p>
                      </div>
                    ) : currentHighlights.map((h) => {
                      const tone = getHighlightColorMeta(h.color);
                      return (
                        <div key={h.noteEntryId} className="rounded-xl border border-rp-line bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${tone.bgClass} ${tone.borderClass} ${tone.textClass}`}>
                              {h.term}
                            </span>
                            <button
                              type="button"
                              title={tr('Xóa highlight')}
                              onClick={() => nb.deleteEntry.mutate(h.noteEntryId)}
                              className="rounded p-1 text-rp-text-muted hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {h.versionStale && (
                            <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                              {tr('Nội dung bài học gốc vừa thay đổi; giữ lại bản lưu an toàn trong Sổ tay.')}
                            </p>
                          )}
                          {h.personalNote && (
                            <p className="mt-1.5 text-[12px] text-rp-text-2">{h.personalNote}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'recent' && (
                  <div className="space-y-2.5">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rp-text-muted" />
                      <input
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.target.value)}
                        placeholder={tr('Tìm từ, ghi chú hoặc nguồn…')}
                        className="h-8.5 w-full rounded-xl border border-rp-line bg-[#FCFAFB] pl-8.5 pr-3 text-[12.5px]"
                      />
                    </label>
                    <div className="space-y-1.5">
                      {recentEntries.map((item) => (
                        <div key={item.noteEntryId} className="flex items-start justify-between gap-2 rounded-xl border border-rp-line bg-white px-3 py-2 hover:border-rp-brand-border">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-bold text-rp-text">{item.term}</span>
                              {item.reading && <span className="truncate text-[11.5px] text-rp-brand-strong">{item.reading}</span>}
                            </div>
                            <p className="truncate text-[12px] text-rp-text-2">{item.meaning}</p>
                            {item.sourcePath && (
                              <Link
                                to={item.sourcePath}
                                onClick={() => nb.setDrawerOpen(false)}
                                className="rp-link mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-rp-brand-strong"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                <span className="truncate">{item.sourceTitle || tr('Mở nguồn bài học')}</span>
                              </Link>
                            )}
                          </div>
                          <Link
                            to={`/kanji-notebook/?noteId=${item.learnerNoteId}&entryId=${item.noteEntryId}`}
                            onClick={() => nb.setDrawerOpen(false)}
                            className="shrink-0 rounded-lg border border-rp-line px-2 py-1 text-[11px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                          >
                            {tr('Xem')}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* Sakura Smart Notebook Floating Bubble */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          data-testid="floating-notebook-bubble"
          aria-expanded={isOpen}
          aria-label={tr('Mở Sổ tay thông minh')}
          onClick={() => {
            setCompactMinimized(false);
            nb.setDrawerOpen(!isOpen);
          }}
          className={`group relative flex h-12 items-center gap-2 rounded-full border px-3.5 shadow-[0_10px_28px_-6px_rgba(204,75,107,0.38)] transition-all duration-200 hover:-translate-y-0.5 ${
            isOpen
              ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white'
              : 'border-rp-brand-border bg-white/98 text-rp-text hover:border-rp-brand-pressed hover:bg-[#FFF5F7]'
          }`}
        >
          <SakuraNotebookBubbleIcon className="h-6 w-6 transition-transform duration-200 group-hover:scale-105" />
          <span className="hidden text-[12.5px] font-bold sm:inline">{tr('Sổ tay')}</span>
          {currentHighlights.length > 0 && (
            <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ${
              isOpen ? 'bg-white text-rp-brand-pressed' : 'bg-rp-brand-pressed text-white'
            }`}>
              {currentHighlights.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
