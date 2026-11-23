import { useId, useRef } from 'react';
import { ArrowRight, CheckCircle2, GraduationCap, Mic, PenLine, Route, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { featureDisplayName, formatVnd, isUsageBased, variantLabels } from '../planGroups.js';

const GROUP_ICONS = { study: GraduationCap, speaking: Mic, writing: PenLine, credit: Sparkles, path: Route };

function featureLabel(feature) {
  return featureDisplayName(feature);
}

/**
 * One product card per plan category. The duration chips are the category's real active plans;
 * everything shown (price, days, AI uses, benefits) and the CTA's plan id come from the selected plan.
 */
export default function PlanGroupCard({ group, selectedPlanId, onSelect, onBuy, activePlanName, hasActiveSelfStudy, readOnly = false, ctaLabel }) {
  const { tr, trf } = useLocale();
  const labelId = useId();
  const chipRefs = useRef([]);
  const variants = group.variants;
  const selected = variants.find((v) => v.id === selectedPlanId) ?? variants.find((v) => v.id === group.defaultPlanId) ?? variants[0];
  const labels = variantLabels(variants, { tr, trf });
  const meta = group.meta;
  const Icon = GROUP_ICONS[meta?.icon] ?? Sparkles;
  const title = meta ? tr(meta.title) : selected.name;
  const features = Array.isArray(selected.features) ? selected.features.filter((f) => featureLabel(f)) : [];
  const isCurrent = Boolean(activePlanName && variants.some((v) => v.name === activePlanName));
  const usageBased = isUsageBased(selected);
  const selectedIndex = Math.max(0, variants.findIndex((v) => v.id === selected.id));

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

  return (
    <article
      data-plan-group={group.key}
      className={`rp-card-hover flex h-full flex-col rounded-rp-card border bg-rp-surface p-5 ${
        selected.isPopular ? 'border-rp-brand-border shadow-rp-card' : 'border-rp-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint text-rp-brand-strong">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
            {meta ? tr(meta.eyebrow) : tr('Gói học')}
          </p>
          <h3 className="mt-0.5 text-[16px] font-bold leading-6 text-rp-text">{title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {selected.isPopular && <Badge tone="brand" size="sm" icon={false}>{tr('Phổ biến')}</Badge>}
          {isCurrent && <Badge tone="success" size="sm" icon={false}>{tr('Đang dùng')}</Badge>}
        </div>
      </div>

      {meta?.description && <p className="mt-2.5 text-[13px] leading-5 text-rp-text-2">{tr(meta.description)}</p>}

      {variants.length > 1 && (
        <div className="mt-3.5">
          <p id={labelId} className="mb-1.5 text-xs font-semibold text-rp-text-2">{tr('Chọn thời hạn')}</p>
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
                  className={`rp-focus h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 ${
                    checked
                      ? 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border hover:text-rp-text'
                  }`}
                >
                  {labels[index]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4" aria-live="polite" aria-atomic="true">
        <p key={selected.id} className="rp-anim-fade text-[26px] font-extrabold leading-8 tabular-nums text-rp-brand-strong">
          {formatVnd(selected.price)}
        </p>
        <p className="mt-1 text-xs font-medium text-rp-text-muted">
          {usageBased ? tr('Theo lượt sử dụng, không giới hạn ngày') : trf('{0} ngày truy cập', { 0: selected.durationDays })}
          {selected.aiUses > 0 ? trf(' · +{0} lượt AI', { 0: selected.aiUses }) : ''}
        </p>
      </div>

      {features.length > 0 && (
        <ul className="mt-3.5 space-y-1.5 border-t border-rp-line/70 pt-3 text-xs text-rp-text-2">
          {features.slice(0, 5).map((feature, index) => (
            <li key={typeof feature === 'object' ? (feature.id ?? feature.code ?? index) : feature} className="flex items-start gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
              <span>{tr(featureLabel(feature))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={readOnly ? undefined : () => onBuy(selected.id)}
          aria-disabled={readOnly || undefined}
          tabIndex={readOnly ? -1 : undefined}
          data-testid={readOnly ? undefined : `buy-plan-${selected.id}`}
          className="rp-focus rp-press inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand transition-colors hover:bg-rp-brand-strong"
        >
          <span>{ctaLabel ?? (hasActiveSelfStudy && group.kind === 'self_study' ? tr('Gia hạn / Nâng cấp') : tr('Chọn mua gói'))}</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
