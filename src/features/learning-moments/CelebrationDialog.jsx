import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { CELEBRATION_ACCENTS } from './momentCatalog.js';
import CelebrationVisual from './CelebrationVisual.jsx';
import ConfettiBurst from './ConfettiBurst.jsx';

/**
 * Shared Learning Moment dialog shell. The hero is a context-aware badge (CelebrationVisual: check for purchases,
 * medal/trophy for achievements, book/target/result/compass/unlock for learning events) — no mascot. Big moments add a
 * short confetti burst. Bottom sheet on phones, centered card from `sm`. Focus-trapped; Escape/backdrop close;
 * reduced-motion aware (all animation presets are CSS and disabled under prefers-reduced-motion).
 */
export default function CelebrationDialog({
  open,
  level = 'milestone',
  accent = 'sakura',
  visual = 'verified',
  animation = 'badge-pop',
  confetti = false,
  eyebrow,
  title,
  description,
  chips = [],
  ctaLabel,
  onCta,
  onClose,
}) {
  const { tr } = useLocale();
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(panelRef, { open, onEscape: onClose });
  const a = CELEBRATION_ACCENTS[accent] || CELEBRATION_ACCENTS.sakura;
  void level;

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
        className="rp-streak-dialog rp-streak-dialog-in relative flex max-h-[96dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_80px_-24px_rgba(40,30,60,0.4)] outline-none sm:rounded-[32px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[240px]"
          style={{ background: `radial-gradient(ellipse at 50% 28%, ${a.halo} 0%, ${a.soft} 42%, rgba(255,255,255,0) 74%)` }}
        />
        {confetti && <ConfettiBurst />}

        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Đóng')}
          className="rp-focus absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#F3EFEA] text-[#5B5550] transition-colors hover:bg-[#ECE5DD]"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="rp-no-scrollbar relative min-h-0 overflow-y-auto px-6 pb-5 pt-6 text-center sm:px-8">
          <CelebrationVisual visual={visual} accent={a} animation={animation} size="lg" className="mt-2" />

          {eyebrow && (
            <p className="mt-4 text-[12.5px] font-extrabold uppercase tracking-[0.16em]" style={{ color: a.text }}>{eyebrow}</p>
          )}
          <h2 id={titleId} className="mt-1.5 text-[22px] font-black leading-tight text-[#14213D] sm:text-[24px]">{title}</h2>
          <p id={descId} className="mx-auto mt-2 max-w-[360px] text-[15px] leading-6 text-[#4A5368]">{description}</p>

          {chips.length > 0 && (
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              {chips.map((c) => (
                <span key={c} className="rp-jp rp-moment-chip max-w-full truncate rounded-full px-3.5 py-1.5 text-[13.5px] font-bold" style={{ background: a.soft, color: a.text }}>
                  {c}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onCta}
            className="rp-focus rp-streak-cta relative mt-5 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-[17px] font-extrabold text-white"
            style={{ backgroundImage: `linear-gradient(90deg, ${a.from}, ${a.to})`, boxShadow: `0 5px 0 ${a.edge}`, '--rp-cta-edge': a.edge }}
          >
            <span aria-hidden="true" className="rp-streak-cta-shine absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-white/0 via-white/45 to-white/0" />
            <span className="relative">{ctaLabel}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rp-focus mx-auto mt-2 block rounded-full px-5 py-2 text-[15px] font-bold text-[#6B7590] transition-[background-color,color,transform] duration-200 hover:-translate-y-px hover:bg-[#F3EFEA] hover:text-[#14213D] motion-reduce:transform-none"
          >
            {tr('Để sau')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
