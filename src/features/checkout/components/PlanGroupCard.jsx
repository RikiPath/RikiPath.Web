import { useId, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Ticket,
} from 'lucide-react';

import { Badge, Button, Modal, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  featureDisplayName,
  formatVnd,
  isUsageBased,
  productAccentOf,
  variantLabels,
} from '../planGroups.js';
import { AI_CREDIT_ICON, PLAN_GROUP_ICONS } from '../planIcons.js';

/**
 * Compact Product Card inside the Unified Dynamic Product Grid (also shared with AdminPlanEditModal preview).
 * Keeps every card balanced in height, switches variant chips dynamically ("Chọn thời hạn" vs "Chọn số lượt"),
 * and delegates full feature details of the selected variant to the shared Product Benefits Modal.
 */
export default function PlanGroupCard({
  group,
  selectedPlanId,
  onSelect,
  onBuy,
  onViewBenefits,
  activePlanName,
  hasActiveSelfStudy,
  activeCategories,
  readOnly = false,
  ctaLabel,
}) {
  const { tr, trf } = useLocale();
  const labelId = useId();
  const chipRefs = useRef([]);
  const [fallbackModalOpen, setFallbackModalOpen] = useState(false);

  const variants = group.variants;
  const selected = variants.find((v) => v.id === selectedPlanId)
    ?? variants.find((v) => v.id === group.defaultPlanId)
    ?? variants[0];
  const labels = variantLabels(variants, { tr, trf });
  const meta = group.meta;
  const accent = productAccentOf(group.kind);
  const Icon = PLAN_GROUP_ICONS[meta?.icon] ?? AI_CREDIT_ICON;
  const title = group.customTitle ? group.title : (meta ? tr(meta.title) : selected.name);
  const features = Array.isArray(selected.features) ? selected.features.filter((f) => featureDisplayName(f)) : [];
  const usageBased = isUsageBased(selected);
  const isCurrent = Boolean(
    (activePlanName && variants.some((v) => v.name === activePlanName))
    || (activeCategories?.has(group.kind) && !usageBased),
  );
  const selectedIndex = Math.max(0, variants.findIndex((v) => v.id === selected.id));
  const description = (group.customTitle ? selected.description : (meta?.description || selected.description)) || '';
  const isUpgradeCandidate = Boolean(hasActiveSelfStudy && group.kind === 'combo' && !activeCategories?.has('combo'));

  function moveSelection(event) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = null;
    if (event.key in keys) next = (selectedIndex + keys[event.key] + variants.length) % variants.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = variants.length - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect(variants[next].id);
    chipRefs.current[next]?.focus();
  }

  const resolvedCta = ctaLabel ?? (() => {
    if (usageBased || group.kind === 'ai_grading' || group.kind === 'learning_path') return tr('Bổ sung lượt AI');
    if (isCurrent) return tr('Gia hạn gói');
    if (isUpgradeCandidate) return tr('Nâng cấp gói');
    return tr('Chọn mua gói');
  })();

  function handleOpenBenefits() {
    if (onViewBenefits) {
      onViewBenefits(group, selected);
      return;
    }
    setFallbackModalOpen(true);
  }

  const variantPickerLabel = usageBased || group.kind === 'ai_grading' || group.kind === 'learning_path'
    ? tr('Chọn số lượt')
    : tr('Chọn thời hạn');

  return (
    <>
      <article
        data-plan-group={group.key}
        className={cx(
          'rp-card-hover flex h-full flex-col rounded-rp-card border bg-rp-surface p-4 transition-colors sm:p-4.5',
          selected.isPopular ? 'border-rp-brand-border/90 shadow-rp-soft' : cx('border-rp-line', accent.hoverBorder),
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', accent.iconTile)}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cx('text-[10.5px] font-bold uppercase tracking-[0.06em]', accent.eyebrow)}>
              {meta ? tr(meta.eyebrow) : tr('Gói học')}
            </p>
            <h3 className="mt-0.5 break-words text-[15px] font-bold leading-5 text-rp-text">{title}</h3>
          </div>
          {(selected.isPopular || isCurrent) && (
            <div className="flex shrink-0 flex-col items-end gap-1">
              {selected.isPopular && <Badge tone="brand" size="sm" icon={false}>{tr('Phổ biến')}</Badge>}
              {isCurrent && <Badge tone="success" size="sm" icon={false}>{tr('Đang dùng')}</Badge>}
            </div>
          )}
        </div>

        {/* Description (kept concise 1-2 lines) */}
        {description && (
          <p className="mt-2 line-clamp-2 min-h-[2.375rem] text-[12.5px] leading-[19px] text-rp-text-2">{tr(description)}</p>
        )}

        {/* Dynamic Variants */}
        {variants.length > 1 && (
          <div className="mt-2.5">
            <p id={labelId} className="mb-1.5 text-[11.5px] font-semibold text-rp-text-2">{variantPickerLabel}</p>
            <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5" onKeyDown={moveSelection}>
              {variants.map((variant, index) => {
                const checked = variant.id === selected.id;
                return (
                  <button
                    key={variant.id}
                    ref={(node) => { chipRefs.current[index] = node; }}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    data-plan-variant={variant.id}
                    onClick={() => onSelect(variant.id)}
                    className={cx(
                      'rp-focus h-7 rounded-full border px-2.5 text-[12px] font-semibold transition-colors duration-150',
                      checked
                        ? accent.chipSelected
                        : 'border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border hover:text-rp-text',
                    )}
                  >
                    {labels[index]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price + Single-line commercial summary */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1" aria-live="polite" aria-atomic="true">
          <p key={selected.id} className="rp-anim-fade text-[22px] font-extrabold leading-7 tabular-nums text-rp-brand-strong">
            {formatVnd(selected.price)}
          </p>
          <p className="inline-flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
            {!usageBased && (
              <span className="inline-flex items-center gap-1">
                <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
                {trf('{0} ngày truy cập', { 0: selected.durationDays })}
              </span>
            )}
            {selected.aiUses > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rp-brand-border/70 bg-rp-brand-tint/60 px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong">
                <Ticket aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                {trf('+{0} lượt AI', { 0: selected.aiUses })}
              </span>
            )}
            {usageBased && selected.aiUses <= 0 && tr('Không giới hạn ngày sử dụng')}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-rp-line/70 pt-3">
          <button
            type="button"
            onClick={handleOpenBenefits}
            data-testid={`view-benefits-${selected.id}`}
            className="rp-focus inline-flex items-center gap-1 rounded-lg px-1 py-1 text-[12.5px] font-semibold text-rp-text-2 transition-colors hover:text-rp-brand-strong"
          >
            <span>{tr('Xem quyền lợi')}</span>
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={readOnly ? undefined : () => onBuy(selected.id)}
            aria-disabled={readOnly || undefined}
            tabIndex={readOnly ? -1 : undefined}
            data-testid={readOnly ? undefined : `buy-plan-${selected.id}`}
            className="rp-focus rp-press inline-flex h-9 items-center justify-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-3.5 text-[13px] font-semibold text-white shadow-rp-brand transition-colors hover:bg-rp-brand-strong"
          >
            <span>{resolvedCta}</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>

      {fallbackModalOpen && (
        <Modal
          open={fallbackModalOpen}
          onClose={() => setFallbackModalOpen(false)}
          title={title}
          size="md"
          footer={<Button variant="secondary" onClick={() => setFallbackModalOpen(false)}>{tr('Đóng')}</Button>}
        >
          {features.length > 0 ? (
            <ul className="space-y-2 text-sm text-rp-text-2">
              {features.map((f, idx) => (
                <li key={f.id ?? f.code ?? idx}>{tr(featureDisplayName(f))}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-rp-text-2">{tr(description)}</p>
          )}
        </Modal>
      )}
    </>
  );
}
