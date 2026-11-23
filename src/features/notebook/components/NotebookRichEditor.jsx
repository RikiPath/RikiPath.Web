import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Check,
  CheckSquare,
  Eraser,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  HIGHLIGHT_COLORS,
  getHighlightColorMeta,
  nextBlockId,
  normalizeRichDocument,
  sanitizePlainFragment,
} from '@/features/notebook/utils/notebookModel.js';
import SafeRichNoteRenderer from './SafeRichNoteRenderer.jsx';

function runsToPlainText(runs = []) {
  return runs.map((r) => r.text || '').join('');
}

function mergeAdjacentRuns(runs = []) {
  const out = [];
  for (const r of runs) {
    if (!r?.text) continue;
    const prev = out[out.length - 1];
    const hl = r.highlight || null;
    if (prev && Boolean(prev.bold) === Boolean(r.bold) && Boolean(prev.italic) === Boolean(r.italic) && (prev.highlight || null) === hl) {
      prev.text += r.text;
    } else {
      const next = { text: r.text };
      if (r.bold) next.bold = true;
      if (r.italic) next.italic = true;
      if (hl) next.highlight = hl;
      out.push(next);
    }
  }
  return out;
}

function splitRunsAtOffset(runs = [], offset = 0) {
  const before = [];
  const after = [];
  let cursor = 0;

  for (const r of runs) {
    const txt = r.text || '';
    const end = cursor + txt.length;
    if (end <= offset) {
      before.push({ ...r });
    } else if (cursor >= offset) {
      after.push({ ...r });
    } else {
      const splitPoint = offset - cursor;
      const leftTxt = txt.slice(0, splitPoint);
      const rightTxt = txt.slice(splitPoint);
      if (leftTxt) before.push({ ...r, text: leftTxt });
      if (rightTxt) after.push({ ...r, text: rightTxt });
    }
    cursor = end;
  }

  return [mergeAdjacentRuns(before), mergeAdjacentRuns(after)];
}

function insertTextIntoRuns(runs = [], offset = 0, textToInsert = '') {
  if (!textToInsert) return runs;
  const [before, after] = splitRunsAtOffset(runs, offset);
  const templateRun = before[before.length - 1] || after[0] || {};
  const middle = {
    text: textToInsert,
    ...(templateRun.bold ? { bold: true } : {}),
    ...(templateRun.italic ? { italic: true } : {}),
    ...(templateRun.highlight ? { highlight: templateRun.highlight } : {}),
  };
  return mergeAdjacentRuns([...before, middle, ...after]);
}

function toggleMarkInRuns(runs = [], startOffset = 0, endOffset = 0, markKey, markValue = true) {
  const totalLen = runsToPlainText(runs).length;
  if (totalLen === 0) return runs;

  const from = startOffset === endOffset ? 0 : Math.max(0, Math.min(startOffset, totalLen));
  const to = startOffset === endOffset ? totalLen : Math.max(from, Math.min(endOffset, totalLen));
  if (from === to) return runs;

  // Determine whether the entire target range already holds this mark
  let cursor = 0;
  let allActive = true;
  for (const r of runs) {
    const len = (r.text || '').length;
    const end = cursor + len;
    if (end > from && cursor < to) {
      if (markKey === 'highlight') {
        if ((r.highlight || null) !== markValue) {
          allActive = false;
          break;
        }
      } else if (!r[markKey]) {
        allActive = false;
        break;
      }
    }
    cursor = end;
  }

  const nextRuns = [];
  cursor = 0;
  for (const r of runs) {
    const txt = r.text || '';
    const end = cursor + txt.length;
    if (end <= from || cursor >= to) {
      nextRuns.push({ ...r });
    } else {
      const a = Math.max(cursor, from) - cursor;
      const b = Math.min(end, to) - cursor;
      if (a > 0) nextRuns.push({ ...r, text: txt.slice(0, a) });
      const mid = { ...r, text: txt.slice(a, b) };
      if (markKey === 'highlight') {
        if (allActive) delete mid.highlight;
        else mid.highlight = markValue;
      } else if (allActive) {
        delete mid[markKey];
      } else {
        mid[markKey] = true;
      }
      if (mid.text) nextRuns.push(mid);
      if (b < txt.length) nextRuns.push({ ...r, text: txt.slice(b) });
    }
    cursor = end;
  }

  return mergeAdjacentRuns(nextRuns);
}

function domNodeToRuns(rootEl) {
  const collected = [];

  function walk(node, activeMarks) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const val = sanitizePlainFragment(node.nodeValue || '').replace(/\r?\n/g, '');
      if (val) {
        const entry = { text: val };
        if (activeMarks.bold) entry.bold = true;
        if (activeMarks.italic) entry.italic = true;
        if (activeMarks.highlight) entry.highlight = activeMarks.highlight;
        collected.push(entry);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'BR') return;

    const nextMarks = { ...activeMarks };
    if (tag === 'STRONG' || tag === 'B') nextMarks.bold = true;
    if (tag === 'EM' || tag === 'I') nextMarks.italic = true;
    if (tag === 'MARK' || node.getAttribute?.('data-hl')) {
      nextMarks.highlight = node.getAttribute?.('data-hl') || activeMarks.highlight || 'yellow';
    }

    for (const child of node.childNodes) {
      walk(child, nextMarks);
    }
  }

  for (const child of rootEl.childNodes) {
    walk(child, { bold: false, italic: false, highlight: null });
  }
  return mergeAdjacentRuns(collected);
}

function writeRunsToDom(rootEl, runs = []) {
  rootEl.textContent = '';
  for (const r of runs) {
    if (!r?.text) continue;
    let node = document.createTextNode(r.text);
    if (r.italic) {
      const em = document.createElement('em');
      em.className = 'italic';
      em.appendChild(node);
      node = em;
    }
    if (r.bold) {
      const strong = document.createElement('strong');
      strong.className = 'font-bold text-rp-text';
      strong.appendChild(node);
      node = strong;
    }
    if (r.highlight) {
      const mark = document.createElement('mark');
      const tone = getHighlightColorMeta(r.highlight);
      mark.setAttribute('data-hl', tone.id);
      mark.className = 'rounded px-1 py-0.5 text-rp-text';
      mark.style.backgroundColor = tone.markBg;
      mark.style.boxShadow = `inset 0 -1px 0 ${tone.markBorder}`;
      mark.appendChild(node);
      node = mark;
    }
    rootEl.appendChild(node);
  }
}

function getCaretOffsetsInElement(rootEl) {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!rootEl.contains(range.startContainer) || !rootEl.contains(range.endContainer)) {
    return null;
  }

  function offsetAt(targetNode, targetOffset) {
    const r = document.createRange();
    r.setStart(rootEl, 0);
    try {
      r.setEnd(targetNode, targetOffset);
    } catch {
      return rootEl.textContent?.length || 0;
    }
    return r.toString().length;
  }

  const start = offsetAt(range.startContainer, range.startOffset);
  const end = range.collapsed ? start : offsetAt(range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function setCaretOffsetsInElement(rootEl, startOffset, endOffset = startOffset) {
  const sel = window.getSelection?.();
  if (!sel || !rootEl) return;

  function locatePoint(targetOffset) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    let remaining = Math.max(0, targetOffset);
    let current = walker.nextNode();
    let lastText = null;
    while (current) {
      lastText = current;
      const len = current.nodeValue?.length || 0;
      if (remaining <= len) {
        return { node: current, offset: remaining };
      }
      remaining -= len;
      current = walker.nextNode();
    }
    if (lastText) {
      return { node: lastText, offset: lastText.nodeValue?.length || 0 };
    }
    return { node: rootEl, offset: 0 };
  }

  const startPos = locatePoint(startOffset);
  const endPos = locatePoint(endOffset);
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  sel.removeAllRanges();
  sel.addRange(range);
}

function EditableBlock({
  block,
  index,
  orderedNumber = null,
  domSyncKey,
  isFocused,
  placeholder,
  registerRef,
  onFocusBlock,
  onInputRuns,
  onKeyDown,
  onPastePlain,
  onToggleCheck,
}) {
  const editableRef = useRef(null);
  const composingRef = useRef(false);

  useEffect(() => {
    registerRef?.(block.id, editableRef.current);
    return () => registerRef?.(block.id, null);
  }, [block.id, registerRef]);

  useEffect(() => {
    const el = editableRef.current;
    if (!el || composingRef.current) return;
    writeRunsToDom(el, block.runs || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domSyncKey, block.id]);

  const plainText = runsToPlainText(block.runs);
  const showPlaceholder = index === 0 && !plainText && block.type === 'paragraph';

  let textStyleClass = 'rp-jp text-[15px] leading-[1.72] text-rp-text';
  if (block.type === 'heading') {
    textStyleClass = block.level === 1
      ? 'rp-jp text-[21px] font-bold tracking-tight leading-snug text-rp-text'
      : block.level === 3
        ? 'rp-jp text-[15.5px] font-bold leading-snug text-rp-brand-strong'
        : 'rp-jp text-[17.5px] font-bold leading-snug text-rp-text';
  } else if (block.type === 'quote') {
    textStyleClass = 'rp-jp text-[14.5px] leading-relaxed text-rp-text-2';
  } else if (block.type === 'checklist_item' && block.checked) {
    textStyleClass = 'rp-jp text-[15px] leading-[1.65] text-rp-text-muted line-through';
  }

  const editableSurface = (
    <div className="relative min-w-0 flex-1">
      {showPlaceholder && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none text-[15px] leading-[1.72] text-rp-text-muted/70"
        >
          {placeholder}
        </span>
      )}
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-block-id={block.id}
        data-block-type={block.type}
        onFocus={() => onFocusBlock(block.id, editableRef.current)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          onInputRuns(block.id, domNodeToRuns(e.currentTarget));
        }}
        onInput={(e) => {
          if (composingRef.current) return;
          onInputRuns(block.id, domNodeToRuns(e.currentTarget));
        }}
        onKeyDown={(e) => onKeyDown(e, block, editableRef.current, composingRef.current)}
        onPaste={(e) => onPastePlain(e, block.id, editableRef.current)}
        className={`min-h-[1.6em] w-full break-words outline-none ${textStyleClass} ${
          isFocused ? '' : ''
        }`}
      />
    </div>
  );

  if (block.type === 'bullet_item') {
    return (
      <div className="flex items-start gap-2.5 py-0.5 pl-1">
        <span aria-hidden="true" className="mt-[0.58em] h-1.5 w-1.5 shrink-0 rounded-full bg-rp-brand-strong/70" />
        {editableSurface}
      </div>
    );
  }

  if (block.type === 'ordered_item') {
    return (
      <div className="flex items-start gap-2 py-0.5 pl-0.5">
        <span aria-hidden="true" className="w-5 shrink-0 select-none pt-0.5 text-right text-[13.5px] font-semibold text-rp-text-muted">
          {orderedNumber || 1}.
        </span>
        {editableSurface}
      </div>
    );
  }

  if (block.type === 'checklist_item') {
    const checked = Boolean(block.checked);
    return (
      <div className="flex items-start gap-2.5 py-0.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onToggleCheck(block.id)}
          className={`rp-focus mt-[5px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
            checked
              ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white'
              : 'border-rp-line-strong bg-white text-transparent hover:border-rp-brand'
          }`}
        >
          <Check className="h-3 w-3 stroke-[2.6]" />
        </button>
        {editableSurface}
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div className="my-1 rounded-r-xl border-l-3 border-rp-brand bg-rp-bg-2 px-3 py-1.5">
        {editableSurface}
      </div>
    );
  }

  return <div className="py-0.5">{editableSurface}</div>;
}

/**
 * Focused Modern Note Editor for Personal Notebook V3.
 * Supports Heading, Bold, Italic, Bullet/Numbered/Checklist, Highlight, Undo/Redo, Japanese & Vietnamese IME,
 * and strict XSS-free JSON AST serialization without external rich-editor lock-in.
 */
export default function NotebookRichEditor({
  valueDoc,
  onChangeDoc,
  onManualSave,
  readOnly = false,
}) {
  const { tr } = useLocale();
  const normalizedDoc = useMemo(() => normalizeRichDocument(valueDoc, { ensureNonEmpty: true }), [valueDoc]);

  const [domSyncKey, setDomSyncKey] = useState(1);
  const [activeBlockId, setActiveBlockId] = useState(normalizedDoc.blocks[0]?.id || null);
  const [highlightColorMenu, setHighlightColorMenu] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });

  const blockRefs = useRef(new Map());
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastSelectionRef = useRef(null);

  const registerRef = useCallback((id, el) => {
    if (el) blockRefs.current.set(id, el);
    else blockRefs.current.delete(id);
  }, []);

  const focusBlockAt = useCallback((blockId, offset = 0, endOffset = offset) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current.get(blockId);
      if (!el) return;
      el.focus();
      setCaretOffsetsInElement(el, offset, endOffset);
      setActiveBlockId(blockId);
    });
  }, []);

  const commitDocChange = useCallback((nextDoc, { syncDom = false, recordHistory = true } = {}) => {
    if (recordHistory) {
      undoStackRef.current = [...undoStackRef.current.slice(-39), normalizedDoc];
      redoStackRef.current = [];
      setHistoryCounts({ undo: undoStackRef.current.length, redo: 0 });
    }
    onChangeDoc(normalizeRichDocument(nextDoc, { ensureNonEmpty: true }));
    if (syncDom) {
      setDomSyncKey((k) => k + 1);
    }
  }, [normalizedDoc, onChangeDoc]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current.slice(-39), normalizedDoc];
    setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
    onChangeDoc(normalizeRichDocument(previous, { ensureNonEmpty: true }));
    setDomSyncKey((k) => k + 1);
  }, [normalizedDoc, onChangeDoc]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current.slice(-39), normalizedDoc];
    setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
    onChangeDoc(normalizeRichDocument(next, { ensureNonEmpty: true }));
    setDomSyncKey((k) => k + 1);
  }, [normalizedDoc, onChangeDoc]);

  const activeBlock = useMemo(
    () => normalizedDoc.blocks.find((b) => b.id === activeBlockId) || normalizedDoc.blocks[0],
    [normalizedDoc.blocks, activeBlockId],
  );

  const captureCurrentSelection = useCallback(() => {
    if (!activeBlock) return null;
    const el = blockRefs.current.get(activeBlock.id);
    if (!el) return lastSelectionRef.current;
    const offsets = getCaretOffsetsInElement(el);
    if (offsets) {
      lastSelectionRef.current = { blockId: activeBlock.id, ...offsets };
      return lastSelectionRef.current;
    }
    return lastSelectionRef.current?.blockId === activeBlock.id ? lastSelectionRef.current : null;
  }, [activeBlock]);

  const applyInlineMark = useCallback((markKey, markValue = true) => {
    const targetBlock = activeBlock;
    if (!targetBlock) return;
    const sel = captureCurrentSelection();
    const start = sel?.blockId === targetBlock.id ? sel.start : 0;
    const end = sel?.blockId === targetBlock.id ? sel.end : 0;

    const updatedBlocks = normalizedDoc.blocks.map((b) => (
      b.id === targetBlock.id
        ? { ...b, runs: toggleMarkInRuns(b.runs, start, end, markKey, markValue) }
        : b
    ));
    commitDocChange({ ...normalizedDoc, blocks: updatedBlocks }, { syncDom: true, recordHistory: true });
    focusBlockAt(targetBlock.id, start, end);
  }, [activeBlock, captureCurrentSelection, commitDocChange, focusBlockAt, normalizedDoc]);

  const applyBlockType = useCallback((nextType, level = null) => {
    const targetBlock = activeBlock;
    if (!targetBlock) return;
    const sel = captureCurrentSelection();

    const updatedBlocks = normalizedDoc.blocks.map((b) => {
      if (b.id !== targetBlock.id) return b;
      const toggleBack = b.type === nextType && (nextType !== 'heading' || b.level === level);
      const finalType = toggleBack ? 'paragraph' : nextType;
      const updated = { id: b.id, type: finalType, runs: b.runs };
      if (finalType === 'heading') updated.level = level || 2;
      if (finalType === 'checklist_item') updated.checked = Boolean(b.checked);
      return updated;
    });

    commitDocChange({ ...normalizedDoc, blocks: updatedBlocks }, { syncDom: true, recordHistory: true });
    if (sel?.blockId === targetBlock.id) {
      focusBlockAt(targetBlock.id, sel.start, sel.end);
    }
  }, [activeBlock, captureCurrentSelection, commitDocChange, focusBlockAt, normalizedDoc]);

  const clearBlockFormatting = useCallback(() => {
    const targetBlock = activeBlock;
    if (!targetBlock) return;
    const plain = runsToPlainText(targetBlock.runs);
    const updatedBlocks = normalizedDoc.blocks.map((b) => (
      b.id === targetBlock.id
        ? { id: b.id, type: 'paragraph', runs: plain ? [{ text: plain }] : [] }
        : b
    ));
    commitDocChange({ ...normalizedDoc, blocks: updatedBlocks }, { syncDom: true, recordHistory: true });
    setMoreMenuOpen(false);
    focusBlockAt(targetBlock.id, plain.length);
  }, [activeBlock, commitDocChange, focusBlockAt, normalizedDoc]);

  const handleToggleCheck = useCallback((blockId) => {
    const updatedBlocks = normalizedDoc.blocks.map((b) => (
      b.id === blockId && b.type === 'checklist_item'
        ? { ...b, checked: !b.checked }
        : b
    ));
    commitDocChange({ ...normalizedDoc, blocks: updatedBlocks }, { syncDom: false, recordHistory: true });
  }, [commitDocChange, normalizedDoc]);

  const handleInputRuns = useCallback((blockId, nextRuns) => {
    const el = blockRefs.current.get(blockId);
    if (el) {
      const offs = getCaretOffsetsInElement(el);
      if (offs) lastSelectionRef.current = { blockId, ...offs };
    }
    const updatedBlocks = normalizedDoc.blocks.map((b) => (
      b.id === blockId ? { ...b, runs: nextRuns } : b
    ));
    commitDocChange({ ...normalizedDoc, blocks: updatedBlocks }, { syncDom: false, recordHistory: true });
  }, [commitDocChange, normalizedDoc]);

  const handleKeyDown = useCallback((e, block, el, isComposing) => {
    if (isComposing) return;
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyInlineMark('bold');
      return;
    }
    if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyInlineMark('italic');
      return;
    }
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onManualSave?.();
      return;
    }
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if ((mod && e.key.toLowerCase() === 'y') || (mod && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    const idx = normalizedDoc.blocks.findIndex((b) => b.id === block.id);
    if (idx < 0) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const offsets = getCaretOffsetsInElement(el) || { start: runsToPlainText(block.runs).length, end: runsToPlainText(block.runs).length };
      const plain = runsToPlainText(block.runs);

      // Pressing Enter on an empty list/checklist/quote line converts it back cleanly to a paragraph.
      if (!plain.trim() && (block.type === 'bullet_item' || block.type === 'ordered_item' || block.type === 'checklist_item' || block.type === 'quote')) {
        const nextBlocks = normalizedDoc.blocks.map((b) => (b.id === block.id ? { id: b.id, type: 'paragraph', runs: [] } : b));
        commitDocChange({ ...normalizedDoc, blocks: nextBlocks }, { syncDom: true, recordHistory: true });
        focusBlockAt(block.id, 0);
        return;
      }

      const [beforeRuns, afterRuns] = splitRunsAtOffset(block.runs, offsets.start);
      const nextBlockType = block.type === 'bullet_item' || block.type === 'ordered_item' || block.type === 'checklist_item'
        ? block.type
        : 'paragraph';
      const newBlock = {
        id: nextBlockId(),
        type: nextBlockType,
        runs: afterRuns,
        ...(nextBlockType === 'checklist_item' ? { checked: false } : {}),
      };

      const nextBlocks = [
        ...normalizedDoc.blocks.slice(0, idx),
        { ...block, runs: beforeRuns },
        newBlock,
        ...normalizedDoc.blocks.slice(idx + 1),
      ];
      commitDocChange({ ...normalizedDoc, blocks: nextBlocks }, { syncDom: true, recordHistory: true });
      focusBlockAt(newBlock.id, 0);
      return;
    }

    if (e.key === 'Backspace') {
      const offsets = getCaretOffsetsInElement(el);
      if (offsets && offsets.start === 0 && offsets.end === 0) {
        if (block.type !== 'paragraph') {
          e.preventDefault();
          const nextBlocks = normalizedDoc.blocks.map((b) => (b.id === block.id ? { id: b.id, type: 'paragraph', runs: b.runs } : b));
          commitDocChange({ ...normalizedDoc, blocks: nextBlocks }, { syncDom: true, recordHistory: true });
          focusBlockAt(block.id, 0);
          return;
        }
        if (idx > 0) {
          e.preventDefault();
          const prevBlock = normalizedDoc.blocks[idx - 1];
          const prevLen = runsToPlainText(prevBlock.runs).length;
          const mergedBlock = {
            ...prevBlock,
            runs: mergeAdjacentRuns([...prevBlock.runs, ...block.runs]),
          };
          const nextBlocks = [
            ...normalizedDoc.blocks.slice(0, idx - 1),
            mergedBlock,
            ...normalizedDoc.blocks.slice(idx + 1),
          ];
          commitDocChange({ ...normalizedDoc, blocks: nextBlocks }, { syncDom: true, recordHistory: true });
          focusBlockAt(prevBlock.id, prevLen);
          return;
        }
      }
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      const offsets = getCaretOffsetsInElement(el);
      if (offsets && offsets.start === 0 && offsets.end === 0) {
        e.preventDefault();
        const prevBlock = normalizedDoc.blocks[idx - 1];
        focusBlockAt(prevBlock.id, runsToPlainText(prevBlock.runs).length);
      }
    } else if (e.key === 'ArrowDown' && idx < normalizedDoc.blocks.length - 1) {
      const offsets = getCaretOffsetsInElement(el);
      const len = runsToPlainText(block.runs).length;
      if (offsets && offsets.start === len && offsets.end === len) {
        e.preventDefault();
        focusBlockAt(normalizedDoc.blocks[idx + 1].id, 0);
      }
    }
  }, [applyInlineMark, commitDocChange, focusBlockAt, handleRedo, handleUndo, normalizedDoc, onManualSave]);

  const handlePastePlain = useCallback((e, blockId, el) => {
    const rawText = e.clipboardData?.getData('text/plain');
    if (typeof rawText !== 'string') return;
    e.preventDefault();

    const clean = sanitizePlainFragment(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = clean.split('\n');
    const idx = normalizedDoc.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;

    const current = normalizedDoc.blocks[idx];
    const offsets = getCaretOffsetsInElement(el) || { start: runsToPlainText(current.runs).length, end: runsToPlainText(current.runs).length };

    if (lines.length === 1) {
      const [left] = splitRunsAtOffset(current.runs, offsets.start);
      const [, right] = splitRunsAtOffset(current.runs, offsets.end);
      const updatedRuns = insertTextIntoRuns(mergeAdjacentRuns([...left, ...right]), offsets.start, lines[0]);
      const nextBlocks = normalizedDoc.blocks.map((b) => (b.id === blockId ? { ...b, runs: updatedRuns } : b));
      commitDocChange({ ...normalizedDoc, blocks: nextBlocks }, { syncDom: true, recordHistory: true });
      focusBlockAt(blockId, offsets.start + lines[0].length);
      return;
    }

    const [beforeRuns] = splitRunsAtOffset(current.runs, offsets.start);
    const [, afterRuns] = splitRunsAtOffset(current.runs, offsets.end);
    const firstBlock = { ...current, runs: mergeAdjacentRuns([...beforeRuns, ...(lines[0] ? [{ text: lines[0] }] : [])]) };
    const middleBlocks = lines.slice(1, -1).map((line) => ({
      id: nextBlockId(),
      type: 'paragraph',
      runs: line ? [{ text: line }] : [],
    }));
    const lastLine = lines[lines.length - 1];
    const lastBlock = {
      id: nextBlockId(),
      type: 'paragraph',
      runs: mergeAdjacentRuns([...(lastLine ? [{ text: lastLine }] : []), ...afterRuns]),
    };

    const nextBlocks = [
      ...normalizedDoc.blocks.slice(0, idx),
      firstBlock,
      ...middleBlocks,
      lastBlock,
      ...normalizedDoc.blocks.slice(idx + 1),
    ];
    commitDocChange({ ...normalizedDoc, blocks: nextBlocks }, { syncDom: true, recordHistory: true });
    focusBlockAt(lastBlock.id, lastLine.length);
  }, [commitDocChange, focusBlockAt, normalizedDoc]);

  const orderedNumbers = useMemo(() => {
    const numbers = [];
    for (let index = 0; index < normalizedDoc.blocks.length; index += 1) {
      if (normalizedDoc.blocks[index].type === 'ordered_item') {
        const previous = index > 0 && numbers[index - 1] != null ? numbers[index - 1] : 0;
        numbers.push(previous + 1);
      } else {
        numbers.push(null);
      }
    }
    return numbers;
  }, [normalizedDoc.blocks]);

  if (readOnly) {
    return (
      <div className="min-h-[340px] rounded-2xl border border-rp-line bg-white p-5 sm:p-6">
        <SafeRichNoteRenderer
          doc={normalizedDoc}
          onToggleChecklist={handleToggleCheck}
          emptyText={tr('Trang này chưa có nội dung ghi chú. Hãy chuyển sang chế độ Soạn để bắt đầu viết.')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-rp-line bg-white shadow-[0_2px_10px_-6px_rgba(45,40,42,0.08)]">
      {/* Focused Compact Rich Formatting Toolbar */}
      <div className="relative flex flex-wrap items-center gap-1 border-b border-rp-line bg-[#FCFAFB] px-3 py-2 rounded-t-2xl">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <ToolbarBtn
            active={activeBlock?.type === 'heading' && activeBlock?.level === 1}
            label={tr('Tiêu đề lớn (H1)')}
            onClick={() => applyBlockType('heading', 1)}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={activeBlock?.type === 'heading' && activeBlock?.level === 2}
            label={tr('Tiêu đề vừa (H2)')}
            onClick={() => applyBlockType('heading', 2)}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarBtn>

          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-rp-line" />

          <ToolbarBtn label={tr('In đậm (Ctrl+B)')} onClick={() => applyInlineMark('bold')}>
            <Bold className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn label={tr('In nghiêng (Ctrl+I)')} onClick={() => applyInlineMark('italic')}>
            <Italic className="h-4 w-4" />
          </ToolbarBtn>

          <div className="relative shrink-0">
            <ToolbarBtn
              active={highlightColorMenu}
              label={tr('Đánh dấu văn bản')}
              onClick={() => {
                setHighlightColorMenu((v) => !v);
                setMoreMenuOpen(false);
              }}
            >
              <Highlighter className="h-4 w-4" />
            </ToolbarBtn>
            {highlightColorMenu && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute left-0 top-9 z-30 flex items-center gap-1.5 rounded-xl border border-rp-line bg-white p-1.5 shadow-lg"
              >
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={tr(c.label)}
                    aria-label={tr(c.label)}
                    onClick={() => {
                      applyInlineMark('highlight', c.id);
                      setHighlightColorMenu(false);
                    }}
                    style={{ backgroundColor: c.hex }}
                    className="rp-focus h-5.5 w-5.5 rounded-full border border-black/15 transition-transform hover:scale-110"
                  />
                ))}
              </div>
            )}
          </div>

          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-rp-line" />

          <ToolbarBtn
            active={activeBlock?.type === 'bullet_item'}
            label={tr('Danh sách gạch đầu dòng')}
            onClick={() => applyBlockType('bullet_item')}
          >
            <List className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={activeBlock?.type === 'ordered_item'}
            label={tr('Danh sách đánh số')}
            onClick={() => applyBlockType('ordered_item')}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={activeBlock?.type === 'checklist_item'}
            label={tr('Checklist việc cần nhớ')}
            onClick={() => applyBlockType('checklist_item')}
          >
            <CheckSquare className="h-4 w-4" />
          </ToolbarBtn>

          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-rp-line" />

          <ToolbarBtn
            disabled={historyCounts.undo === 0}
            label={tr('Hoàn tác (Ctrl+Z)')}
            onClick={handleUndo}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            disabled={historyCounts.redo === 0}
            label={tr('Làm lại (Ctrl+Y)')}
            onClick={handleRedo}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarBtn>

          <div className="relative shrink-0">
            <ToolbarBtn
              active={moreMenuOpen}
              label={tr('Công cụ thêm')}
              onClick={() => {
                setMoreMenuOpen((v) => !v);
                setHighlightColorMenu(false);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </ToolbarBtn>
            {moreMenuOpen && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-0 top-9 z-30 min-w-[175px] rounded-xl border border-rp-line bg-white p-1.5 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    applyBlockType('quote');
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                >
                  <Quote className="h-3.5 w-3.5" />
                  <span>{tr('Trích dẫn')}</span>
                </button>
                <button
                  type="button"
                  onClick={clearBlockFormatting}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>{tr('Đưa về đoạn thường')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacious Focused Editor Canvas */}
      <div
        data-testid="notebook-rich-editor-canvas"
        onClick={(e) => {
          setHighlightColorMenu(false);
          setMoreMenuOpen(false);
          if (e.target === e.currentTarget && normalizedDoc.blocks.length > 0) {
            const last = normalizedDoc.blocks[normalizedDoc.blocks.length - 1];
            focusBlockAt(last.id, runsToPlainText(last.runs).length);
          }
        }}
        className="min-h-[360px] cursor-text space-y-1 p-5 sm:min-h-[420px] sm:px-7 sm:py-6"
      >
        {normalizedDoc.blocks.map((block, index) => (
            <EditableBlock
              key={block.id}
              block={block}
              index={index}
              orderedNumber={orderedNumbers[index]}
              domSyncKey={domSyncKey}
              isFocused={activeBlockId === block.id}
              placeholder={tr('Viết từ mới, câu tiếng Nhật, giải thích ngữ pháp hoặc checklist cá nhân…')}
              registerRef={registerRef}
              onFocusBlock={(bid, el) => {
                setActiveBlockId(bid);
                if (el) {
                  const offs = getCaretOffsetsInElement(el);
                  if (offs) lastSelectionRef.current = { blockId: bid, ...offs };
                }
              }}
              onInputRuns={handleInputRuns}
              onKeyDown={handleKeyDown}
              onPastePlain={handlePastePlain}
              onToggleCheck={handleToggleCheck}
            />
        ))}
      </div>
    </div>
  );
}

function ToolbarBtn({ active = false, disabled = false, label, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rp-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[12.5px] font-semibold transition-colors ${
        active
          ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
          : 'border-transparent bg-transparent text-rp-text-2 hover:border-rp-line hover:bg-white hover:text-rp-text'
      } disabled:pointer-events-none disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
