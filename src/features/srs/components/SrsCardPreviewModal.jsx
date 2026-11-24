import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge, Collapsible, Modal } from '@/components/ui';
import { formatSrsCardTypeLabel } from '@/features/srs/utils/srsLabels.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Unified flashcard preview shared by Content Author, Admin, and Learner Library.
 * Displays vocabulary/kanji fields directly (term, reading, meaning) and defaults optional examples to collapsed.
 */
export function SrsCardPreviewContent({ item, statusBadge = null, versionLabel = '' }) {
  const { tr } = useLocale();
  const [exampleOpen, setExampleOpen] = useState(false);
  const exampleId = useId();

  if (!item) return null;

  const frontText = item.frontText || item.term || '—';
  const reading = item.reading || '';
  const meaning = item.meaning || item.backText || '—';
  const exampleSentence = item.exampleSentence || '';
  const exampleMeaning = item.exampleMeaning || '';
  const hasExample = Boolean(exampleSentence || exampleMeaning);
  const cardTypeLabel = formatSrsCardTypeLabel(item.cardType || item.contentType, tr);

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

      <div className="space-y-2 rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] px-5 py-6 text-center">
        <p className="rp-jp text-2xl font-extrabold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
          {frontText}
        </p>
        {reading && (
          <p className="rp-jp text-sm font-semibold text-rp-brand-strong [overflow-wrap:anywhere]" lang="ja">
            {reading}
          </p>
        )}
        <p className="pt-1 text-base font-bold text-rp-text [overflow-wrap:anywhere]">
          {meaning}
        </p>
      </div>

      {hasExample && (
        <div className="rounded-xl border border-[#EAE3E4] bg-white">
          <button
            type="button"
            aria-expanded={exampleOpen}
            aria-controls={exampleId}
            onClick={() => setExampleOpen((prev) => !prev)}
            className="rp-focus flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-rp-navy hover:bg-[#FFFCF8]"
          >
            <span>{tr('Câu ví dụ')}</span>
            <ChevronDown aria-hidden="true" className="rp-disclosure-chevron h-4 w-4 text-rp-text-muted" />
          </button>
          <Collapsible open={exampleOpen} id={exampleId}>
            <div className="space-y-1 rounded-b-xl border-t border-rp-line/80 bg-[#FFFCF8] px-3.5 py-2.5">
              {exampleSentence && (
                <p className="rp-jp text-sm font-semibold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
                  {exampleSentence}
                </p>
              )}
              {exampleMeaning && (
                <p className="text-xs text-rp-text-2 [overflow-wrap:anywhere]">{exampleMeaning}</p>
              )}
            </div>
          </Collapsible>
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
