import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Badge, Modal, cx } from '@/components/ui';
import { formatSrsCardTypeLabel } from '@/features/srs/utils/srsLabels.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Unified interactive flashcard preview shared by Content Author, Admin, and Learner Library.
 * Keeps card fields concise (front, reading, meaning) and defaults optional examples to collapsed.
 */
export function SrsCardPreviewContent({ item, statusBadge = null, versionLabel = '' }) {
  const { tr } = useLocale();
  const [flipped, setFlipped] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);

  if (!item) return null;

  const frontText = item.frontText || item.term || '—';
  const reading = item.reading || '';
  const meaning = item.meaning || item.backText || '—';
  const exampleSentence = item.exampleSentence || '';
  const exampleMeaning = item.exampleMeaning || '';
  const hasExample = Boolean(exampleSentence || exampleMeaning);
  const cardTypeLabel = formatSrsCardTypeLabel(item.cardType || item.contentType, tr);

  const toggleFlip = () => setFlipped((prev) => !prev);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusBadge}
          <Badge tone="brand" size="sm" icon={false}>
            {cardTypeLabel}
          </Badge>
        </div>
        {versionLabel && (
          <span className="text-[11px] font-semibold text-rp-text-muted">{versionLabel}</span>
        )}
      </div>

      <button
        type="button"
        aria-pressed={flipped}
        onClick={toggleFlip}
        className={cx(
          'rp-focus group flex min-h-[168px] w-full flex-col items-center justify-center rounded-2xl border px-5 py-6 text-center transition-colors',
          flipped
            ? 'border-rp-brand-border bg-[#FFF7F9]'
            : 'border-[#EAE3E4] bg-[#FFFCF8] hover:border-rp-brand-border',
        )}
      >
        {!flipped ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
              {tr('Mặt trước')}
            </p>
            <p className="rp-jp text-2xl font-extrabold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
              {frontText}
            </p>
            <span className="inline-flex items-center gap-1.5 pt-2 text-xs font-medium text-rp-text-muted group-hover:text-rp-brand-strong">
              <RotateCcw className="h-3.5 w-3.5" />
              {tr('Nhấn thẻ để lật xem mặt sau')}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rp-brand-strong">
              {tr('Mặt sau')}
            </p>
            <p className="rp-jp text-base font-bold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
              {frontText}
            </p>
            {reading && (
              <p className="rp-jp text-sm font-semibold text-rp-brand-strong [overflow-wrap:anywhere]" lang="ja">
                {reading}
              </p>
            )}
            <p className="text-lg font-extrabold text-rp-text [overflow-wrap:anywhere]">
              {meaning}
            </p>
            <span className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-rp-text-muted group-hover:text-rp-brand-strong">
              <RotateCcw className="h-3.5 w-3.5" />
              {tr('Nhấn lại để xem mặt trước')}
            </span>
          </div>
        )}
      </button>

      {hasExample && (
        <div className="rounded-xl border border-[#EAE3E4] bg-white">
          <button
            type="button"
            aria-expanded={exampleOpen}
            onClick={() => setExampleOpen((prev) => !prev)}
            className="rp-focus flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-rp-navy hover:bg-[#FFFCF8]"
          >
            <span>{tr('Câu ví dụ')}</span>
            {exampleOpen ? (
              <ChevronUp className="h-4 w-4 text-rp-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-rp-text-muted" />
            )}
          </button>
          {exampleOpen && (
            <div className="space-y-1 border-t border-[#EAE3E4]/80 bg-[#FFFCF8] px-3.5 py-2.5 rounded-b-xl">
              {exampleSentence && (
                <p className="rp-jp text-sm font-semibold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
                  {exampleSentence}
                </p>
              )}
              {exampleMeaning && (
                <p className="text-xs text-rp-text-2 [overflow-wrap:anywhere]">{exampleMeaning}</p>
              )}
            </div>
          )}
        </div>
      )}

      {item.note && (
        <p className="text-xs leading-5 text-rp-text-2 [overflow-wrap:anywhere]">
          <strong>{tr('Ghi chú')}:</strong> {item.note}
        </p>
      )}
    </div>
  );
}

export default function SrsCardPreviewModal({
  open,
  item,
  title,
  description,
  statusBadge = null,
  versionLabel = '',
  footer = null,
  onClose,
}) {
  const { tr } = useLocale();
  const cardKey = item
    ? `${item.id ?? item.reviewCardId ?? 'preview'}:${item.frontText ?? item.term ?? ''}:${item.modifiedDate ?? ''}`
    : 'empty';

  return (
    <Modal
      open={Boolean(open && item)}
      onClose={onClose}
      title={title || item?.frontText || item?.term || tr('Xem trước thẻ')}
      description={description}
      size="sm"
      footer={footer}
    >
      {item && (
        <SrsCardPreviewContent
          key={cardKey}
          item={item}
          statusBadge={statusBadge}
          versionLabel={versionLabel}
        />
      )}
    </Modal>
  );
}
