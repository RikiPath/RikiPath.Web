import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkPlus,
  ExternalLink,
  Languages,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { notify } from '@/components/ui';
import {
  computeContentVersionHash,
  getHighlightColorMeta,
  HIGHLIGHT_COLORS,
  isActiveExamAttemptInDom,
  matchHighlightAnchorInText,
  suggestKindForSelection,
} from '@/features/notebook/utils/notebookModel.js';
import { useOptionalSmartNotebook } from '@/features/notebook/context/smartNotebookState.js';
import NotebookQuickSavePopover from './NotebookQuickSavePopover.jsx';
import SelectionSrsModal from './SelectionSrsModal.jsx';
import SelectionTranslatePopover from './SelectionTranslatePopover.jsx';

function isNodeBlockedForCapture(node) {
  if (!node) return true;
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
      tag === 'CODE' ||
      tag === 'PRE' ||
      el.isContentEditable ||
      el.hasAttribute?.('disabled') ||
      el.getAttribute?.('aria-disabled') === 'true' ||
      el.getAttribute?.('role') === 'dialog' ||
      el.getAttribute?.('data-notebook-ignore') === 'true' ||
      el.getAttribute?.('data-exam-attempt-active') === 'true' ||
      el.getAttribute?.('data-notebook-capture-ignore') === 'true' ||
      el.getAttribute?.('data-no-capture') === 'true'
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function findNotebookHost(node) {
  let el = node?.nodeType === 1 ? node : node?.parentElement;
  while (el) {
    if (el.getAttribute?.('data-notebook-content-id')) return el;
    el = el.parentElement;
  }
  return null;
}

function getAutoContentPath(host, root) {
  const positions = [];
  let el = host;
  while (el && el !== root) {
    const parent = el.parentElement;
    if (!parent) return '';
    positions.unshift(Array.prototype.indexOf.call(parent.children, el));
    el = parent;
  }
  return el === root ? `auto:${positions.join('.')}` : '';
}

function getAutoContentHost(range) {
  const root = document.getElementById('rp-main');
  if (!root || !root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  let el = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  let compactTextHost = null;
  while (el && el !== root) {
    if (/^(P|LI|BLOCKQUOTE|TD|TH|H[1-6])$/.test(el.tagName) && el.textContent?.trim().length <= 2000) {
      return el;
    }
    if (!compactTextHost && /^(SPAN|DIV|ARTICLE|SECTION)$/.test(el.tagName)
      && el.textContent?.trim().length <= 2000) {
      compactTextHost = el;
    }
    el = el.parentElement;
  }
  return compactTextHost;
}

function resolveAutoContentHost(contentId) {
  if (!contentId?.startsWith('auto:')) return null;
  let el = document.getElementById('rp-main');
  const path = contentId.slice(5).split('.');
  for (const index of path) {
    if (!/^\d+$/.test(index)) return null;
    el = el?.children[Number(index)];
  }
  return el || null;
}

function rangeForTextOffset(host, start, length) {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node = walker.nextNode();
  let position = 0;
  let started = false;
  while (node) {
    const next = position + node.textContent.length;
    if (!started && start >= position && start < next) {
      range.setStart(node, start - position);
      started = true;
    }
    if (started && start + length <= next) {
      range.setEnd(node, start + length - position);
      return range;
    }
    position = next;
    node = walker.nextNode();
  }
  return null;
}

function resolveTargetMetadata(pathname, contentId) {
  const clean = String(pathname || '');
  const lessonMatch = clean.match(/\/(?:lessons|lesson-player)\/(\d+)/) || contentId.match(/lesson-(\d+)/);
  if (lessonMatch) return { targetType: 'Lesson', targetId: Number(lessonMatch[1]) || null };
  if (clean.includes('/grammar') || contentId.startsWith('grammar')) return { targetType: 'Grammar', targetId: null };
  if (clean.includes('/vocabulary') || contentId.startsWith('vocab')) return { targetType: 'Vocabulary', targetId: null };
  if (clean.includes('/kanji') || contentId.startsWith('kanji')) return { targetType: 'Kanji', targetId: null };
  if (clean.includes('/reading')) return { targetType: 'Reading', targetId: null };
  return { targetType: 'Reading', targetId: null };
}

function extractSelectionSnapshot() {
  if (typeof window === 'undefined' || isActiveExamAttemptInDom()) return null;
  const sel = window.getSelection?.();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const rawSelection = String(sel.toString() || '');
  const text = rawSelection.trim();
  if (!text || text.length > 1000) return null;

  const range = sel.getRangeAt(0);
  if (isNodeBlockedForCapture(range.startContainer) || isNodeBlockedForCapture(range.endContainer)) {
    return null;
  }

  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;

  const explicitHost = findNotebookHost(range.startContainer);
  const host = explicitHost && explicitHost === findNotebookHost(range.endContainer)
    ? explicitHost
    : getAutoContentHost(range);
  if (!host) return null;
  const fullText = host.getAttribute('data-notebook-raw-text') || host.textContent || '';
  const contentId = host.getAttribute('data-notebook-content-id')
    || getAutoContentPath(host, document.getElementById('rp-main'));
  if (!contentId) return null;
  const sourceTitle =
    host?.getAttribute('data-notebook-source-title') ||
    (typeof document !== 'undefined' ? document.title.replace(/\s*\|\s*RikiPath.*$/, '') : '');

  let anchorPrefix = '';
  let anchorSuffix = '';
  let startOffset = null;
  let endOffset = null;
  if (fullText) {
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(host);
      preRange.setEnd(range.startContainer, range.startOffset);
      const offsetGuess = preRange.toString().length + rawSelection.length - rawSelection.trimStart().length;
      if (offsetGuess >= 0 && fullText.slice(offsetGuess, offsetGuess + text.length) === text) {
        startOffset = offsetGuess;
        endOffset = offsetGuess + text.length;
        anchorPrefix = fullText.slice(Math.max(0, offsetGuess - 32), offsetGuess);
        anchorSuffix = fullText.slice(offsetGuess + text.length, offsetGuess + text.length + 32);
      }
    } catch { /* An unverified anchor must never be guessed from another occurrence. */ }
  }

  let contextSentence = '';
  if (fullText) {
    const pos = startOffset;
    if (pos != null && pos >= 0) {
      contextSentence = fullText.slice(Math.max(0, pos - 40), pos + text.length + 40).trim();
    }
  }

  const top = rect.top > 72 ? rect.top - 52 : rect.bottom + 10;
  const centerX = rect.left + rect.width / 2;

  return {
    selectedText: text,
    contentId,
    contentTextForVersion: fullText,
    contentVersionHash: fullText ? computeContentVersionHash(fullText) : '',
    sourceTitle,
    anchorPrefix,
    anchorSuffix,
    startOffset,
    endOffset,
    contextSentence,
    kind: suggestKindForSelection(text),
    rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
    pos: { top, left: centerX },
  };
}

export default function LearnerSelectionCaptureLayer() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const nb = useOptionalSmartNotebook();

  const [toolbar, setToolbar] = useState(null);
  const [srsModalReq, setSrsModalReq] = useState(null);
  const [translateReq, setTranslateReq] = useState(null);
  const [editingNote, setEditingNote] = useState('');
  const [lastDetailId, setLastDetailId] = useState(null);

  const detail = nb?.activeHighlightDetail || null;
  const detailKey = detail?.entry?.highlightId || detail?.entry?.noteEntryId || null;
  if (detailKey !== lastDetailId) {
    setLastDetailId(detailKey);
    setEditingNote(detail?.entry?.personalNote || '');
  }

  useEffect(() => {
    if (!nb?.isLearner || !nb?.policy?.selectionAllowed) {
      return undefined;
    }

    let timerId = null;
    const evaluateSelection = (delayMs = 50) => {
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        const snap = extractSelectionSnapshot();
        setToolbar(snap);
      }, delayMs);
    };

    const onMouseUp = (event) => {
      if (!event.target.closest?.('[data-selection-toolbar="true"]')) evaluateSelection(40);
    };
    const onTouchEnd = (event) => {
      if (!event.target.closest?.('[data-selection-toolbar="true"]')) evaluateSelection(180);
    };
    const onKeyUp = (e) => {
      if (e.key === 'Escape') {
        setToolbar(null);
        setTranslateReq(null);
        setSrsModalReq(null);
        nb?.setActiveHighlightDetail?.(null);
        return;
      }
      if (e.shiftKey || e.key?.startsWith('Arrow')) {
        evaluateSelection(60);
      }
    };
    const onSelectionChange = () => {
      const sel = window.getSelection?.();
      if (!sel || sel.isCollapsed) {
        setToolbar((prev) => (prev ? null : prev));
      }
    };
    const onPointerDown = (event) => {
      if (!event.target.closest?.('[data-selection-toolbar="true"]')) {
        setToolbar(null);
        window.getSelection?.()?.removeAllRanges?.();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      if (timerId) window.clearTimeout(timerId);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [nb]);

  useEffect(() => {
    if (!nb?.isLearner || !nb?.policy?.selectionAllowed || !window.CSS?.highlights || typeof Highlight !== 'function') {
      return undefined;
    }
    const names = HIGHLIGHT_COLORS.map((color) => `rp-auto-highlight-${color.id}`);
    const autoEntries = (nb.pageHighlights || []).filter((entry) => entry.contentId?.startsWith('auto:'));
    if (!autoEntries.length) {
      for (const name of names) window.CSS.highlights.delete(name);
      return undefined;
    }
    let frame = 0;
    const paint = () => {
      frame = 0;
      const groups = new Map(HIGHLIGHT_COLORS.map((color) => [color.id, []]));
      for (const entry of autoEntries) {
        const host = resolveAutoContentHost(entry.contentId);
        if (!host) continue;
        const match = matchHighlightAnchorInText(host.textContent || '', entry);
        if (!match.matched) continue;
        const range = rangeForTextOffset(host, match.index, match.length);
        if (range) groups.get(getHighlightColorMeta(entry.color).id)?.push(range);
      }
      for (const color of HIGHLIGHT_COLORS) {
        const name = `rp-auto-highlight-${color.id}`;
        const ranges = groups.get(color.id);
        if (ranges.length) window.CSS.highlights.set(name, new Highlight(...ranges));
        else window.CSS.highlights.delete(name);
      }
    };
    const schedulePaint = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const onClick = (event) => {
      if (!window.getSelection?.()?.isCollapsed || isNodeBlockedForCapture(event.target)) return;
      const caret = document.caretRangeFromPoint?.(event.clientX, event.clientY);
      if (!caret) return;
      const host = getAutoContentHost(caret);
      if (!host) return;
      const contentId = getAutoContentPath(host, document.getElementById('rp-main'));
      const before = document.createRange();
      before.selectNodeContents(host);
      before.setEnd(caret.startContainer, caret.startOffset);
      const offset = before.toString().length;
      const entry = autoEntries.find((item) => {
        if (item.contentId !== contentId) return false;
        const match = matchHighlightAnchorInText(host.textContent || '', item);
        return match.matched && offset >= match.index && offset <= match.index + match.length;
      });
      if (!entry) return;
      const match = matchHighlightAnchorInText(host.textContent || '', entry);
      const rect = rangeForTextOffset(host, match.index, match.length)?.getBoundingClientRect();
      nb.setActiveHighlightDetail?.({ entry, rect });
    };
    schedulePaint();
    const root = document.getElementById('rp-main');
    const observer = root ? new MutationObserver(schedulePaint) : null;
    if (root) observer.observe(root, { childList: true, characterData: true, subtree: true });
    document.addEventListener('click', onClick);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener('click', onClick);
      for (const name of names) window.CSS.highlights.delete(name);
    };
  }, [nb]);

  if (!nb?.isLearner || !nb?.policy?.selectionAllowed || isActiveExamAttemptInDom()) {
    return null;
  }

  async function handleColorHighlight(colorId) {
    if (!toolbar) return;
    const snap = toolbar;
    if (snap.contentId.startsWith('auto:') && (!window.CSS?.highlights || typeof Highlight !== 'function')) {
      notify.warning(tr('Trình duyệt chưa hỗ trợ tô màu đoạn văn này'));
      return;
    }
    if (snap.startOffset == null || snap.endOffset == null) {
      notify.warning(tr('Không xác định được vị trí đoạn đã chọn'), tr('Vui lòng chọn lại đoạn văn trong nội dung bài học.'));
      return;
    }
    try {
      const existing = nb.pageHighlights?.find((entry) =>
        entry.isBackendHighlight && entry.contentId === snap.contentId
        && entry.selectedText === snap.selectedText
        && entry.startOffset === snap.startOffset && entry.endOffset === snap.endOffset
        && entry.contentVersionHash === snap.contentVersionHash
      );
      const meta = resolveTargetMetadata(nb.currentUrlKey, snap.contentId);
      if (existing) {
        await nb.patchHighlight.mutateAsync({ id: existing.highlightId, color: colorId });
      } else await nb.saveHighlight.mutateAsync({
        targetType: meta.targetType,
        targetId: meta.targetId,
        targetKey: snap.contentId || undefined,
        sourcePath: nb.currentUrlKey || '',
        sourceTitle: snap.sourceTitle || '',
        selectedText: snap.selectedText,
        color: colorId,
        anchorPrefix: snap.anchorPrefix || undefined,
        anchorSuffix: snap.anchorSuffix || undefined,
        startOffset: snap.startOffset ?? undefined,
        endOffset: snap.endOffset ?? undefined,
        contentVersionHash: snap.contentVersionHash || undefined,
      });
      window.getSelection?.()?.removeAllRanges?.();
      setToolbar(null);
      const tone = getHighlightColorMeta(colorId);
      notify.success(tr(`Đã đánh dấu màu ${tone.label}`), '', { key: 'sel-hl-ok' });
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được highlight'));
    }
  }

  function handleOpenNotebook() {
    if (!toolbar) return;
    const snap = toolbar;
    setToolbar(null);
    if (nb.notebookLocked) {
      notify.warning(tr('Cần gói Tự học để lưu vào Sổ tay'), '', { key: 'sel-nb-lock' });
      return;
    }
    nb.setQuickSaveRequest?.({
      ...snap,
      sourcePath: nb.currentUrlKey || '',
    });
  }

  function handleOpenSrs() {
    if (!toolbar) return;
    const snap = toolbar;
    const meta = resolveTargetMetadata(nb.currentUrlKey, snap.contentId);
    setToolbar(null);
    setSrsModalReq({
      ...snap,
      sourceType: 'Reading',
      lessonId: meta.targetType === 'Lesson' ? meta.targetId : null,
    });
  }

  function handleOpenTranslate() {
    if (!toolbar) return;
    const snap = toolbar;
    setToolbar(null);
    setTranslateReq({ ...snap });
  }

  const activeToolbar = nb?.isLearner && nb?.policy?.selectionAllowed ? toolbar : null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const toolbarWidth = Math.min(390, vw - 24);
  const toolbarLeft = activeToolbar ? Math.max(12, Math.min(activeToolbar.pos.left - toolbarWidth / 2, vw - toolbarWidth - 12)) : 12;
  const toolbarTop = activeToolbar ? Math.max(12, Math.min(activeToolbar.pos.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 54)) : 12;

  return (
    <>
      {activeToolbar && (
        <div
          role="toolbar"
          data-selection-toolbar="true"
          aria-label={tr('Công cụ học nhanh từ đoạn đã chọn')}
          data-notebook-capture-ignore="true"
          onMouseDown={(e) => e.preventDefault()}
          className="fixed z-[90] flex max-w-[calc(100vw-24px)] items-center gap-0.5 rounded-full border border-[#EAE3E4] bg-[#1D243B] px-1.5 py-1.5 text-white shadow-xl sm:gap-1 sm:px-2.5"
          style={{ left: `${toolbarLeft}px`, top: `${toolbarTop}px` }}
        >
          {/* 3 Highlight Colors ONLY (#F6D56D Cream Yellow, #8EDAC4 Mint Green, #F5A9C4 Sakura Pink) */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-white/15 sm:gap-1.5 sm:pr-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={tr(`Tô màu ${c.label}`)}
                aria-label={tr(`Tô màu ${c.label}`)}
                onClick={() => handleColorHighlight(c.id)}
                style={{ backgroundColor: c.hex }}
                className="h-5 w-5 shrink-0 rounded-full border-2 border-white/85 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenNotebook}
            aria-label={tr('Lưu vào Sổ tay')}
            className="inline-flex h-8 items-center gap-1 border-r border-white/15 px-1.5 text-[12px] font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white sm:px-2.5"
          >
            <BookmarkPlus className="h-3.5 w-3.5 text-[#F5A9C4]" aria-hidden="true" />
            <span>{tr('Sổ tay')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSrs}
            aria-label={tr('Thêm hoặc quản lý Thẻ SRS')}
            className="inline-flex h-8 items-center gap-1 border-r border-white/15 px-1.5 text-[12px] font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white sm:px-2.5"
          >
            <Repeat className="h-3.5 w-3.5 text-[#8EDAC4]" aria-hidden="true" />
            <span>{tr('Thẻ SRS')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenTranslate}
            aria-label={tr('Dịch Nhật → Việt')}
            className="inline-flex h-8 items-center gap-1 rounded-full px-1.5 text-[12px] font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white sm:px-2.5"
          >
            <Languages className="h-3.5 w-3.5 text-[#F6D56D]" aria-hidden="true" />
            <span>{tr('Dịch')}</span>
          </button>

        </div>
      )}

      {/* Existing Highlight Detail Popover */}
      {detail?.entry && (
        <div
          role="dialog"
          aria-label={tr('Chi tiết highlight')}
          data-notebook-capture-ignore="true"
          className="fixed z-[91] w-[min(92vw,340px)] rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-3.5 shadow-2xl"
          style={{
            left: `${Math.max(12, Math.min((detail.rect?.left ?? 160), vw - 356))}px`,
            top: `${Math.min((detail.rect?.bottom ?? 200) + 10, (typeof window !== 'undefined' ? window.innerHeight : 800) - 290)}px`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="rp-jp truncate text-[14.5px] font-bold text-rp-navy">
                {detail.entry.selectedText || detail.entry.term}
              </p>
              {detail.entry.meaning && (
                <p className="mt-0.5 text-[12px] text-rp-text-2">{detail.entry.meaning}</p>
              )}
            </div>
            <button
              type="button"
              aria-label={tr('Đóng')}
              onClick={() => nb.setActiveHighlightDetail(null)}
              className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-[#FFF0F4]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-rp-text-muted">{tr('Đổi màu')}:</span>
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => {
                const active = getHighlightColorMeta(detail.entry.color).id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={tr(c.label)}
                    onClick={async () => {
                      try {
                        if (detail.entry.isBackendHighlight && detail.entry.highlightId) {
                          await nb.patchHighlight.mutateAsync({ id: detail.entry.highlightId, color: c.id });
                        } else {
                          await nb.updateEntry.mutateAsync({
                            noteEntryId: detail.entry.noteEntryId,
                            note: editingNote,
                            highlightColor: c.id,
                          });
                        }
                        nb.setActiveHighlightDetail({ ...detail, entry: { ...detail.entry, color: c.id } });
                      } catch (err) {
                        notify.apiError(err, tr('Chưa đổi được màu'));
                      }
                    }}
                    style={{ backgroundColor: c.hex }}
                    className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${active ? 'border-rp-navy scale-110' : 'border-white'}`}
                  />
                );
              })}
            </div>
          </div>

          <textarea
            rows={2}
            value={editingNote}
            onChange={(e) => setEditingNote(e.target.value)}
            placeholder={tr('Thêm ghi chú cho highlight này…')}
            className="mt-2.5 w-full rounded-xl border border-[#EAE3E4] bg-white px-2.5 py-1.5 text-[12px] text-rp-text focus:border-rp-brand-strong focus:outline-none"
          />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={nb.removeHighlight.isPending || nb.deleteEntry.isPending}
                onClick={async () => {
                  try {
                    if (detail.entry.isBackendHighlight && detail.entry.highlightId) {
                      await nb.removeHighlight.mutateAsync(detail.entry.highlightId);
                    } else {
                      await nb.deleteEntry.mutateAsync(detail.entry.noteEntryId);
                    }
                    nb.setActiveHighlightDetail(null);
                    notify.success(tr('Đã bỏ highlight'), '');
                  } catch (err) {
                    notify.apiError(err, tr('Chưa bỏ được highlight'));
                  }
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11.5px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{tr('Bỏ')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = detail.entry;
                  nb.setActiveHighlightDetail(null);
                  setSrsModalReq({
                    selectedText: target.selectedText || target.term,
                    personalNote: target.personalNote || '',
                    linkedReviewCardId: target.linkedReviewCardId || null,
                    sourceTitle: target.sourceTitle || '',
                  });
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#EAE3E4] bg-white px-2.5 text-[11.5px] font-semibold text-rp-navy hover:bg-[#FFF0F4]"
              >
                <Repeat className="h-3.5 w-3.5 text-rp-brand-strong" />
                <span>{detail.entry.linkedReviewCardId ? tr('Đã thêm') : tr('Thẻ SRS')}</span>
              </button>

              {detail.entry.learnerNoteId && (
                <button
                  type="button"
                  title={tr('Mở trong Sổ tay')}
                  onClick={() => {
                    const eId = detail.entry.noteEntryId;
                    const nId = detail.entry.learnerNoteId;
                    nb.setActiveHighlightDetail(null);
                    navigate(`/kanji-notebook/?noteId=${nId}&entryId=${eId}`);
                  }}
                  className="inline-flex h-8 items-center rounded-lg border border-[#EAE3E4] bg-white px-2 text-rp-text-2 hover:bg-[#FFF0F4]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  if (detail.entry.isBackendHighlight && detail.entry.highlightId) {
                    await nb.patchHighlight.mutateAsync({ id: detail.entry.highlightId, note: editingNote });
                  } else {
                    await nb.updateEntry.mutateAsync({
                      noteEntryId: detail.entry.noteEntryId,
                      note: editingNote,
                    });
                  }
                  notify.success(tr('Đã lưu ghi chú'), '');
                  nb.setActiveHighlightDetail(null);
                } catch (err) {
                  notify.apiError(err, tr('Chưa lưu được ghi chú'));
                }
              }}
              className="inline-flex h-8 items-center rounded-lg bg-rp-brand-pressed px-3 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
            >
              {tr('Lưu')}
            </button>
          </div>
        </div>
      )}

      {nb.quickSaveRequest && (
        <NotebookQuickSavePopover
          request={nb.quickSaveRequest}
          onClose={() => nb.setQuickSaveRequest(null)}
        />
      )}

      {srsModalReq && (
        <SelectionSrsModal
          request={srsModalReq}
          onClose={() => setSrsModalReq(null)}
        />
      )}

      {translateReq && (
        <SelectionTranslatePopover
          request={translateReq}
          onClose={() => setTranslateReq(null)}
        />
      )}
    </>
  );
}
