import { Fragment } from 'react';
import { Check } from 'lucide-react';
import {
  getHighlightColorMeta,
  normalizeRichDocument,
} from '@/features/notebook/utils/notebookModel.js';

function renderInlineRuns(runs = []) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return null;
  }

  return runs.map((run, idx) => {
    let node = <Fragment key={idx}>{run.text}</Fragment>;

    if (run.italic) {
      node = <em className="italic">{node}</em>;
    }
    if (run.bold) {
      node = <strong className="font-bold text-rp-text">{node}</strong>;
    }
    if (run.highlight) {
      const tone = getHighlightColorMeta(run.highlight);
      node = (
        <mark
          className="rounded px-1 py-0.5 text-rp-text"
          style={{
            backgroundColor: tone.markBg,
            boxShadow: `inset 0 -1px 0 ${tone.markBorder}`,
          }}
        >
          {node}
        </mark>
      );
    }

    return <Fragment key={idx}>{node}</Fragment>;
  });
}

/**
 * Zero-dangerouslySetInnerHTML Safe Rich Note Renderer.
 * Accepts either V3 structured JSON AST (`{ type: 'doc', version: 1, blocks: [...] }`)
 * or legacy plain/markdown note strings, rendering clean React elements with interactive optional checklist callbacks.
 */
export default function SafeRichNoteRenderer({
  content,
  doc: docProp = null,
  className = '',
  emptyText = '',
  onToggleChecklist = null,
}) {
  const doc = docProp
    ? normalizeRichDocument(docProp, { ensureNonEmpty: false })
    : normalizeRichDocument(content, { ensureNonEmpty: false });

  const hasVisibleContent = doc.blocks.some(
    (b) => b.runs.length > 0 || b.type === 'checklist_item' || b.type === 'heading',
  );

  if (!hasVisibleContent) {
    return emptyText ? (
      <p className={`text-[13.5px] italic text-rp-text-muted ${className}`}>{emptyText}</p>
    ) : null;
  }

  // Group consecutive bullet_item / ordered_item blocks into proper <ul> / <ol> lists for clean semantics.
  const elements = [];
  let i = 0;
  while (i < doc.blocks.length) {
    const block = doc.blocks[i];

    if (block.type === 'bullet_item') {
      const listItems = [];
      while (i < doc.blocks.length && doc.blocks[i].type === 'bullet_item') {
        listItems.push(doc.blocks[i]);
        i += 1;
      }
      elements.push(
        <ul key={`ul-${listItems[0].id}`} className="my-1.5 list-disc space-y-1 pl-5 text-[14.5px] leading-relaxed text-rp-text">
          {listItems.map((item) => (
            <li key={item.id} className="rp-jp break-words">
              {item.runs.length > 0 ? renderInlineRuns(item.runs) : <span className="text-rp-text-muted">&nbsp;</span>}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (block.type === 'ordered_item') {
      const listItems = [];
      while (i < doc.blocks.length && doc.blocks[i].type === 'ordered_item') {
        listItems.push(doc.blocks[i]);
        i += 1;
      }
      elements.push(
        <ol key={`ol-${listItems[0].id}`} className="my-1.5 list-decimal space-y-1 pl-5 text-[14.5px] leading-relaxed text-rp-text">
          {listItems.map((item) => (
            <li key={item.id} className="rp-jp break-words">
              {item.runs.length > 0 ? renderInlineRuns(item.runs) : <span className="text-rp-text-muted">&nbsp;</span>}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (block.type === 'checklist_item') {
      const checked = Boolean(block.checked);
      elements.push(
        <div key={block.id} className="my-1 flex items-start gap-2.5">
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={!onToggleChecklist}
            onClick={() => onToggleChecklist?.(block.id)}
            className={`rp-focus mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
              checked
                ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white'
                : 'border-rp-line-strong bg-white text-transparent hover:border-rp-brand'
            } ${onToggleChecklist ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <Check className="h-3 w-3 stroke-[2.6]" />
          </button>
          <div
            className={`rp-jp min-w-0 flex-1 break-words text-[14.5px] leading-relaxed ${
              checked ? 'text-rp-text-muted line-through' : 'text-rp-text'
            }`}
          >
            {block.runs.length > 0 ? renderInlineRuns(block.runs) : <span className="text-rp-text-muted">&nbsp;</span>}
          </div>
        </div>,
      );
      i += 1;
      continue;
    }

    if (block.type === 'heading') {
      const level = block.level || 2;
      const cls = level === 1
        ? 'mt-3 mb-1.5 text-[20px] font-bold tracking-tight text-rp-text'
        : level === 2
          ? 'mt-2.5 mb-1 text-[17px] font-bold text-rp-text'
          : 'mt-2 mb-1 text-[15px] font-bold text-rp-brand-strong';
      elements.push(
        <div key={block.id} className={`rp-jp break-words ${cls}`}>
          {block.runs.length > 0 ? renderInlineRuns(block.runs) : null}
        </div>,
      );
      i += 1;
      continue;
    }

    if (block.type === 'quote') {
      elements.push(
        <blockquote
          key={block.id}
          className="rp-jp my-1.5 rounded-r-xl border-l-3 border-rp-brand bg-rp-bg-2 px-3 py-2 text-[14px] leading-relaxed text-rp-text-2 break-words"
        >
          {block.runs.length > 0 ? renderInlineRuns(block.runs) : null}
        </blockquote>,
      );
      i += 1;
      continue;
    }

    if (block.runs.length === 0) {
      elements.push(<div key={block.id} className="h-2.5" aria-hidden="true" />);
    } else {
      elements.push(
        <p key={block.id} className="rp-jp my-1 break-words text-[14.5px] leading-[1.7] text-rp-text">
          {renderInlineRuns(block.runs)}
        </p>,
      );
    }
    i += 1;
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}
