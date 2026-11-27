import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { useFocusTrap } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { CELEBRATION_ACCENTS } from './momentCatalog.js';
import CelebrationVisual from './CelebrationVisual.jsx';
import ConfettiBurst from './ConfettiBurst.jsx';
import './learningMoments.css';

/**
 * Shared Learning Moment dialog shell (goal confirmed, roadmap ready, placement, lessons, SRS, checkpoints).
 * - `hero` replaces the default badge (GoalHero / JourneyHero); no mascot.
 * - `chips` are strings or `{ label, icon }`; `children` renders extra facts above the actions.
 * - Copy rises in with a short stagger after the hero. Bottom sheet on phones, centered card from `sm`.
 * Focus-trapped; Escape/backdrop/X close ("Để sau" semantics); reduced-motion shows the final state.
 */
export default function CelebrationDialog({
  open,
  accent = 'sakura',
  visual = 'verified',
  animation = 'badge-pop',
  confetti = false,
  hero = null,
  eyebrow,
  title,
  description,
  chips = [],
  children,
  ctaLabel,
  ctaIcon = ArrowRight,
  secondaryLabel,
  onSecondary,
  extraAction,
  onCta,
  onClose,
}) {
  const { tr } = useLocale();
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(panelRef, { open, onEscape: onClose });
  const a = CELEBRATION_ACCENTS[accent] || CELEBRATION_ACCENTS.sakura;
  const CtaIcon = ctaIcon;
  // Copy follows the hero; heroes with a longer intro push the text a little later.
  const base = hero ? 520 : 260;

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden="true" className="rp-anim-fade rp-backdrop absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="rp-mh-dialog-in rp-pu-panel-body relative flex max-h-[96dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--rp-popup-border)] bg-[var(--rp-popup-bg)] text-rp-text shadow-[var(--rp-popup-shadow)] outline-none sm:rounded-[28px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[220px] dark:opacity-25"
          style={{ background: `radial-gradient(ellipse at 50% 22%, ${a.halo} 0%, ${a.soft} 38%, rgba(255,255,255,0) 72%)`, opacity: 0.75 }}
        />
        {confetti && <ConfettiBurst />}

        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Đóng')}
          className="rp-focus absolute right-3.5 top-3.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-rp-muted/80 text-rp-text-2 transition-colors hover:bg-rp-muted hover:text-rp-text"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="rp-no-scrollbar relative min-h-0 overflow-y-auto px-5 pb-5 pt-6 text-center sm:px-7">
          {hero || <CelebrationVisual visual={visual} accent={a} animation={animation} size="lg" className="mt-2" />}

          {eyebrow && (
            <p className="rp-mh-rise mt-4 text-[12px] font-extrabold uppercase tracking-[0.16em]" style={{ color: a.text, '--d': `${base}ms` }}>
              {eyebrow}
            </p>
          )}
          <h2 id={titleId} className="rp-mh-rise mt-1.5 text-[21px] font-black leading-tight text-rp-text sm:text-[23px]" style={{ '--d': `${base + 80}ms` }}>
            {title}
          </h2>
          <p id={descId} className="rp-mh-rise mx-auto mt-2 max-w-[380px] text-[14.5px] leading-6 text-rp-text-2" style={{ '--d': `${base + 160}ms` }}>
            {description}
          </p>

          {chips.length > 0 && (
            <ul className="mt-3.5 flex flex-wrap justify-center gap-2" aria-label={tr('Thông tin tóm tắt')}>
              {chips.map((chip, i) => {
                const item = typeof chip === 'string' ? { label: chip } : chip;
                const ChipIcon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="rp-mh-fact rp-jp inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold"
                    style={{ background: a.soft, color: a.text, borderColor: `${a.from}33`, '--d': `${base + 260 + i * 90}ms` }}
                  >
                    {ChipIcon && <ChipIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                    <span className="min-w-0 break-words">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {children}

          <div className="rp-mh-rise" style={{ '--d': `${base + 420 + chips.length * 60}ms` }}>
            <button
              type="button"
              onClick={onCta}
              className="rp-focus rp-pu-cta mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[16px] font-extrabold text-white"
              style={{
                backgroundImage: `linear-gradient(90deg, ${a.from}, ${a.to})`,
                boxShadow: `0 4px 0 ${a.edge}, 0 12px 22px -14px ${a.edge}`,
                '--shine-d': `${base + 900}ms`,
              }}
            >
              <span>{ctaLabel}</span>
              {CtaIcon && <CtaIcon aria-hidden="true" className="h-4.5 w-4.5" />}
            </button>
            {extraAction && (
              <button
                type="button"
                onClick={extraAction.onClick}
                className="rp-focus mt-2 flex min-h-11 w-full items-center justify-center rounded-2xl border border-rp-line bg-rp-surface px-4 text-[15px] font-bold text-rp-text transition-colors hover:border-rp-brand-border hover:text-rp-brand-strong"
              >
                {extraAction.label}
              </button>
            )}
            <button
              type="button"
              onClick={onSecondary || onClose}
              className="rp-focus mx-auto mt-2 block rounded-full px-5 py-2 text-[14.5px] font-bold text-rp-text-muted transition-[background-color,color] duration-200 hover:bg-rp-muted hover:text-rp-text"
            >
              {secondaryLabel || tr('Để sau')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
