import { useMemo } from 'react';
import { useOptionalSmartNotebook } from '@/features/notebook/context/SmartNotebookContext.jsx';
import {
  getHighlightColorMeta,
  matchHighlightAnchorInText,
} from '@/features/notebook/utils/notebookModel.js';

/**
 * Renders original educational text cleanly while overlaying persisted Learner highlights
 * matched safely via ContentId + ContentVersion + AnchorPrefix/Suffix.
 * Never alters original lesson text or renders raw untrusted HTML.
 */
export default function HighlightableText({
  text,
  contentId = '',
  sourceTitle = '',
  as: Component = 'span',
  className = '',
  style,
  lang,
}) {
  const nb = useOptionalSmartNotebook();
  const strText = text == null ? '' : String(text);

  const segments = useMemo(() => {
    if (!strText || !nb?.isLearner || !nb?.pageHighlights?.length) {
      return [{ type: 'text', value: strText }];
    }

    const candidates = nb.pageHighlights.filter((h) => {
      if (!contentId || !h.contentId) return true;
      return h.contentId === contentId;
    });

    const ranges = [];
    for (const entry of candidates) {
      const match = matchHighlightAnchorInText(strText, entry);
      if (!match.matched || match.length <= 0) continue;
      ranges.push({
        start: match.index,
        end: match.index + match.length,
        entry,
      });
    }

    if (ranges.length === 0) return [{ type: 'text', value: strText }];

    // Sort & drop overlapping segments deterministically
    ranges.sort((a, b) => (a.start !== b.start ? a.start - b.start : b.end - a.end));
    const nonOverlapping = [];
    let cursor = 0;
    for (const r of ranges) {
      if (r.start < cursor) continue;
      nonOverlapping.push(r);
      cursor = r.end;
    }

    const parts = [];
    let pos = 0;
    for (const r of nonOverlapping) {
      if (r.start > pos) {
        parts.push({ type: 'text', value: strText.slice(pos, r.start) });
      }
      parts.push({
        type: 'mark',
        value: strText.slice(r.start, r.end),
        entry: r.entry,
      });
      pos = r.end;
    }
    if (pos < strText.length) {
      parts.push({ type: 'text', value: strText.slice(pos) });
    }
    return parts;
  }, [strText, nb?.isLearner, nb?.pageHighlights, contentId]);

  if (!strText) return null;

  return (
    <Component
      className={className}
      style={style}
      lang={lang}
      data-notebook-content-id={contentId || undefined}
      data-notebook-source-title={sourceTitle || undefined}
      data-notebook-raw-text={strText}
    >
      {segments.map((seg, idx) => {
        if (seg.type === 'text') return seg.value;
        const tone = getHighlightColorMeta(seg.entry.color);
        return (
          <mark
            key={`${seg.entry.noteEntryId}-${idx}`}
            role="button"
            tabIndex={0}
            title={seg.entry.personalNote || seg.entry.meaning || seg.entry.term}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              nb?.setActiveHighlightDetail({
                entry: seg.entry,
                rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
              });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                nb?.setActiveHighlightDetail({
                  entry: seg.entry,
                  rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
                });
              }
            }}
            style={{
              backgroundColor: tone.markBg,
              borderBottom: `2px solid ${tone.markBorder}`,
            }}
            className="cursor-pointer rounded px-0.5 text-inherit transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-rp-brand-strong/40"
          >
            {seg.value}
          </mark>
        );
      })}
    </Component>
  );
}
