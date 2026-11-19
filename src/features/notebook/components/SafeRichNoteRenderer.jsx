import { sanitizeNotebookText } from '@/features/notebook/utils/notebookModel.js';

/**
 * Safe structured rich-text renderer for RikiPath Note Pages.
 * Parses headings (# / ##), bullets (- / *), numbered lists (1.), **bold**, *italic*, ==highlight==,
 * Japanese inline `[ja:text]` tokens and clean URLs into React elements (zero dangerouslySetInnerHTML).
 */
function renderInlineTokens(line, keyPrefix) {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==|`[^`]+`)/g;
  const parts = String(line || '').split(tokenRegex);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key} className="font-bold text-rp-text">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key} className="italic text-rp-text-2">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
      return (
        <mark key={key} className="rounded bg-[#FCE8EF] px-1 py-0.5 text-[#8C2D4B]">
          {part.slice(2, -2)}
        </mark>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <span key={key} lang="ja" className="rp-jp rounded bg-rp-brand-tint/80 px-1.5 py-0.5 font-medium text-rp-brand-strong">
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

export default function SafeRichNoteRenderer({ content = '', emptyText = 'Chưa có nội dung ghi chú cho trang này.' }) {
  const safe = sanitizeNotebookText(content);
  if (!safe) {
    return <p className="text-[13px] italic text-rp-text-muted">{emptyText}</p>;
  }

  const lines = safe.split(/\r?\n/);
  const blocks = [];
  let listBuffer = null;

  const flushList = () => {
    if (!listBuffer) return;
    blocks.push(listBuffer);
    listBuffer = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [], key: `ul-${idx}` };
      }
      listBuffer.items.push(line.replace(/^\s*[-*]\s+/, ''));
      return;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [], key: `ol-${idx}` };
      }
      listBuffer.items.push(line.replace(/^\s*\d+\.\s+/, ''));
      return;
    }

    flushList();
    if (!line.trim()) {
      blocks.push({ type: 'spacer', key: `sp-${idx}` });
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4), key: `h3-${idx}` });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3), key: `h2-${idx}` });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2), key: `h1-${idx}` });
    } else {
      blocks.push({ type: 'p', text: line, key: `p-${idx}` });
    }
  });
  flushList();

  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-rp-text">
      {blocks.map((block) => {
        if (block.type === 'spacer') return <div key={block.key} className="h-1" />;
        if (block.type === 'h1') return <h2 key={block.key} className="text-[17px] font-bold text-rp-text">{renderInlineTokens(block.text, block.key)}</h2>;
        if (block.type === 'h2') return <h3 key={block.key} className="text-[15px] font-bold text-rp-text">{renderInlineTokens(block.text, block.key)}</h3>;
        if (block.type === 'h3') return <h4 key={block.key} className="text-[13.5px] font-bold text-rp-brand-strong">{renderInlineTokens(block.text, block.key)}</h4>;
        if (block.type === 'ul') {
          return (
            <ul key={block.key} className="list-disc space-y-1 pl-5">
              {block.items.map((item, idx) => <li key={`${block.key}-${idx}`}>{renderInlineTokens(item, `${block.key}-${idx}`)}</li>)}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={block.key} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, idx) => <li key={`${block.key}-${idx}`}>{renderInlineTokens(item, `${block.key}-${idx}`)}</li>)}
            </ol>
          );
        }
        return <p key={block.key}>{renderInlineTokens(block.text, block.key)}</p>;
      })}
    </div>
  );
}
