import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkPlus, Check, Copy, ExternalLink, Highlighter, NotebookPen, Trash2, X } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { notify } from '@/components/ui/feedbackStore.js';
import {
  getHighlightColorMeta,
  HIGHLIGHT_COLORS,
  suggestKindForSelection,
} from '@/features/notebook/utils/notebookModel.js';
import { useOptionalSmartNotebook } from '@/features/notebook/context/smartNotebookState.js';
import NotebookQuickSavePopover from './NotebookQuickSavePopover.jsx';

function isNodeBlockedForCapture(node) {
  let el = node?.nodeType === 1 ? node : node?.parentElement;
  while (el) {
    const tag = el.tagName?.toUpperCase();
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      tag === 'OPTION' ||
      tag === 'BUTTON' ||
      tag === 'LABEL' ||
      el.isContentEditable ||
      el.getAttribute?.('data-notebook-ignore') === 'true' ||
      el.getAttribute?.('role') === 'dialog' ||
      el.closest?.('#rp-main') === null
    ) {
      return el.closest?.('#rp-main') === null ? true : el.getAttribute?.('data-notebook-ignore') === 'true' || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON', 'LABEL'].includes(tag) || el.isContentEditable || el.getAttribute?.('role') === 'dialog';
    }
    el = el.parentElement;
  }
  return false;
}

function findCaptureMetadata(node) {
  let el = node?.nodeType === 1 ? node : node?.parentElement;
  let contentId = '';
  let sourceTitle = '';
  let contentTextForVersion = '';
  while (el) {
    if (!contentId && el.getAttribute?.('data-notebook-content-id')) {
      contentId = el.getAttribute('data-notebook-content-id');
    }
    if (!sourceTitle && el.getAttribute?.('data-notebook-source-title')) {
      sourceTitle = el.getAttribute('data-notebook-source-title');
    }
    if (!contentTextForVersion && el.getAttribute?.('data-notebook-raw-text')) {
      contentTextForVersion = el.getAttribute('data-notebook-raw-text');
    }
    el = el.parentElement;
  }
  return { contentId, sourceTitle, contentTextForVersion };
}

export default function LearnerSelectionCaptureLayer() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const nb = useOptionalSmartNotebook();
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [copied, setCopied] = useState(false);

  // Highlight detail edit state
  const detail = nb?.activeHighlightDetail || null;
  const detailEntryId = detail?.entry?.noteEntryId ?? null;
  const detailPersonalNote = detail?.entry?.personalNote || '';
  const [editingNote, setEditingNote] = useState('');
  const [lastDetail, setLastDetail] = useState({ id: detailEntryId, note: detailPersonalNote });
  if (lastDetail.id !== detailEntryId || lastDetail.note !== detailPersonalNote) {
    setLastDetail({ id: detailEntryId, note: detailPersonalNote });
    setEditingNote(detailPersonalNote);
  }

  useEffect(() => {
    if (!nb?.isLearner || !nb?.notebookAvailable || !nb?.policy?.selectionAllowed) {
      return undefined;
    }

    const inspectSelection = () => {
      const sel = window.getSelection?.();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectionPopup(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text || text.length < 1 || text.length > 500) {
        setSelectionPopup(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const anchorNode = range.commonAncestorContainer;
      if (isNodeBlockedForCapture(anchorNode)) {
        setSelectionPopup(null);
        return;
      }

      const mainEl = document.getElementById('rp-main');
      if (!mainEl || !mainEl.contains(anchorNode)) {
        setSelectionPopup(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setSelectionPopup(null);
        return;
      }

      const meta = findCaptureMetadata(anchorNode);
      let prefix = '';
      let suffix = '';
      if (meta.contentTextForVersion) {
        const idx = meta.contentTextForVersion.indexOf(text);
        if (idx >= 0) {
          prefix = meta.contentTextForVersion.slice(Math.max(0, idx - 32), idx);
          suffix = meta.contentTextForVersion.slice(idx + text.length, idx + text.length + 32);
        }
      }

      const top = rect.top > 74 ? rect.top - 52 : rect.bottom + 10;
      const centerX = Math.max(165, Math.min(window.innerWidth - 165, rect.left + rect.width / 2));

      setCopied(false);
      setSelectionPopup({
        selectedText: text,
        top,
        left: centerX,
        sourcePath: nb.currentUrlKey,
        sourceTitle: meta.sourceTitle || document.title?.replace(/\s*\|\s*RikiPath.*$/, '') || 'Bài học hiện tại',
        contentId: meta.contentId,
        contentTextForVersion: meta.contentTextForVersion,
        anchorPrefix: prefix,
        anchorSuffix: suffix,
      });
    };

    const handleMouseUp = () => window.setTimeout(inspectSelection, 10);
    const handleKeyUp = (e) => {
      if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        window.setTimeout(inspectSelection, 10);
      }
    };
    const handleScroll = () => setSelectionPopup(null);

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [nb?.isLearner, nb?.notebookAvailable, nb?.policy?.selectionAllowed, nb?.currentUrlKey]);

  if (!nb?.isLearner || !nb?.notebookAvailable) return null;

  async function quickHighlightWithColor(colorId) {
    if (!selectionPopup || nb.quickSaveCapture.isPending) return;
    const snap = selectionPopup;
    setSelectionPopup(null);
    window.getSelection?.()?.removeAllRanges?.();

    try {
      await nb.quickSaveCapture.mutateAsync({
        targetNoteId: nb.notePages[0]?.id || null,
        newNoteTitle: nb.notePages.length === 0 ? 'Ghi chú bài học' : '',
        kind: 'highlight',
        term: snap.selectedText,
        meaning: 'Đoạn đánh dấu từ bài học',
        color: colorId,
        sourcePath: snap.sourcePath,
        sourceTitle: snap.sourceTitle,
        contentId: snap.contentId,
        contentTextForVersion: snap.contentTextForVersion,
        anchorPrefix: snap.anchorPrefix,
        anchorSuffix: snap.anchorSuffix,
        enrollSrs: false,
      });
      notify.success(tr('Đã đánh dấu nội dung vào Sổ tay'), '', { key: 'nb-highlight-ok' });
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được highlight'), { key: 'nb-highlight-err' });
    }
  }

  function openQuickSaveWithKind(explicitKind = null) {
    if (!selectionPopup) return;
    const snap = selectionPopup;
    setSelectionPopup(null);
    window.getSelection?.()?.removeAllRanges?.();
    nb.setQuickSaveRequest({
      ...snap,
      kind: explicitKind || suggestKindForSelection(snap.selectedText),
    });
  }

  async function copySelectedText() {
    if (!selectionPopup?.selectedText) return;
    try {
      await navigator.clipboard.writeText(selectionPopup.selectedText);
      setCopied(true);
      setTimeout(() => setSelectionPopup(null), 650);
    } catch {
      notify.error(tr('Không sao chép được văn bản'), '');
    }
  }

  return (
    <>
      {/* Floating Selection Toolbar */}
      {selectionPopup && !nb.quickSaveRequest && (
        <div
          role="toolbar"
          aria-label={tr('Lưu nội dung đang chọn vào Sổ tay')}
          data-notebook-ignore="true"
          style={{ top: selectionPopup.top, left: selectionPopup.left }}
          onMouseDown={(e) => e.preventDefault()}
          className="rp-anim-pop fixed z-[125] flex -translate-x-1/2 items-center gap-1 rounded-full border border-rp-brand-border bg-white/98 px-2 py-1.5 shadow-[0_12px_32px_rgba(181,61,92,0.22)] backdrop-blur-md"
        >
          {/* 4 Light Highlight Swatches */}
          <div className="flex items-center gap-1 border-r border-rp-line pr-1.5">
            <Highlighter className="h-3.5 w-3.5 text-rp-brand-strong" aria-hidden="true" />
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={tr(`Đánh dấu ${c.label}`)}
                aria-label={tr(`Đánh dấu ${c.label}`)}
                onClick={() => quickHighlightWithColor(c.id)}
                style={{ backgroundColor: c.markBg, borderColor: c.markBorder }}
                className="h-4.5 w-4.5 rounded-full border transition-transform hover:scale-115"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => openQuickSaveWithKind(null)}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-rp-brand-pressed px-2.5 text-[11.5px] font-semibold text-white hover:bg-rp-brand-strong"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>{tr('Lưu vào Sổ tay')}</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickSaveWithKind('note')}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-rp-line bg-white px-2.5 text-[11.5px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            <span>{tr('Ghi chú')}</span>
          </button>

          <button
            type="button"
            title={tr('Sao chép')}
            aria-label={tr('Sao chép')}
            onClick={copySelectedText}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* Quick Save Modal Popover */}
      {nb.quickSaveRequest && (
        <NotebookQuickSavePopover
          request={nb.quickSaveRequest}
          onClose={() => nb.setQuickSaveRequest(null)}
        />
      )}

      {/* Active Highlight Detail Popover */}
      {detail && (
        <div
          role="dialog"
          aria-label={tr('Chi tiết đánh dấu')}
          data-notebook-ignore="true"
          style={{
            top: Math.max(16, Math.min(window.innerHeight - 280, (detail.rect?.bottom || 120) + 8)),
            left: Math.max(16, Math.min(window.innerWidth - 340, (detail.rect?.left || 40))),
          }}
          className="rp-anim-pop fixed z-[126] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-rp-brand-border bg-white p-3.5 shadow-[0_18px_45px_-12px_rgba(45,40,42,0.22)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className={`inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${getHighlightColorMeta(detail.entry.color).bgClass} ${getHighlightColorMeta(detail.entry.color).borderClass} ${getHighlightColorMeta(detail.entry.color).textClass}`}>
                {detail.entry.notePageTitle || tr('Đánh dấu')}
              </span>
              <p className="mt-1.5 text-[13.5px] font-bold text-rp-text">{detail.entry.term}</p>
            </div>
            <button
              type="button"
              aria-label={tr('Đóng')}
              onClick={() => nb.setActiveHighlightDetail(null)}
              className="rounded-lg p-1 text-rp-text-muted hover:bg-rp-bg-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Color switcher */}
          <div className="mt-2.5 flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={tr(c.label)}
                onClick={async () => {
                  try {
                    await nb.updateEntry.mutateAsync({
                      noteEntryId: detail.entry.noteEntryId,
                      personalNote: editingNote,
                      meta: { ...detail.entry, color: c.id },
                    });
                    nb.setActiveHighlightDetail({ ...detail, entry: { ...detail.entry, color: c.id } });
                  } catch (err) {
                    notify.apiError(err, tr('Chưa đổi được màu highlight'));
                  }
                }}
                style={{ backgroundColor: c.markBg, borderColor: c.markBorder }}
                className={`h-5 w-5 rounded-full border ${detail.entry.color === c.id ? 'ring-2 ring-rp-brand-pressed ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
              />
            ))}
          </div>

          <textarea
            rows={2}
            value={editingNote}
            onChange={(e) => setEditingNote(e.target.value)}
            placeholder={tr('Thêm hoặc sửa ghi chú cho phần này…')}
            className="mt-2.5 w-full rounded-xl border border-rp-line px-2.5 py-2 text-[12.5px]"
          />

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                title={tr('Mở trong Sổ tay')}
                onClick={() => {
                  const eId = detail.entry.noteEntryId;
                  const nId = detail.entry.learnerNoteId;
                  nb.setActiveHighlightDetail(null);
                  navigate(`/kanji-notebook/?noteId=${nId}&entryId=${eId}`);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rp-line px-2.5 text-[11.5px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{tr('Mở sổ')}</span>
              </button>
              <button
                type="button"
                title={tr('Xóa highlight')}
                disabled={nb.deleteEntry.isPending}
                onClick={async () => {
                  try {
                    await nb.deleteEntry.mutateAsync(detail.entry.noteEntryId);
                    nb.setActiveHighlightDetail(null);
                    notify.success(tr('Đã xóa highlight'), '');
                  } catch (err) {
                    notify.apiError(err, tr('Chưa xóa được highlight'));
                  }
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              disabled={nb.updateEntry.isPending}
              onClick={async () => {
                try {
                  await nb.updateEntry.mutateAsync({
                    noteEntryId: detail.entry.noteEntryId,
                    personalNote: editingNote,
                    meta: detail.entry,
                  });
                  notify.success(tr('Đã lưu ghi chú'), '');
                  nb.setActiveHighlightDetail(null);
                } catch (err) {
                  notify.apiError(err, tr('Chưa lưu được ghi chú'));
                }
              }}
              className="inline-flex h-8 items-center rounded-lg bg-rp-brand-pressed px-3 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
            >
              {nb.updateEntry.isPending ? tr('Đang lưu…') : tr('Lưu ghi chú')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
