import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  Headphones,
  LockKeyhole,
  Mic,
  NotebookPen,
  PenLine,
  RefreshCcw,
  Route,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { useFocusTrap } from '@/components/ui';
import { cx } from '@/components/ui/cx.js';
import { useLocale } from '@/locales/locale.js';
import './learningMoments.css';

const ANIMATION_MS = 2600;

// Converging charge particles (start offsets) — 6 nodes.
const CHARGE = [
  { x: '-78px', y: '-34px', d: 470 },
  { x: '70px', y: '-52px', d: 540 },
  { x: '84px', y: '28px', d: 610 },
  { x: '-64px', y: '58px', d: 580 },
  { x: '8px', y: '-86px', d: 650 },
  { x: '-12px', y: '84px', d: 700 },
];
// Seal shards flying out at impact — 7 nodes, different distance/spin/lifetime for depth.
const SHARDS = [
  { dx: '-86px', dy: '-40px', r: '-160deg', t: '760ms' },
  { dx: '74px', dy: '-66px', r: '210deg', t: '680ms' },
  { dx: '96px', dy: '22px', r: '140deg', t: '820ms' },
  { dx: '42px', dy: '84px', r: '-120deg', t: '640ms' },
  { dx: '-40px', dy: '88px', r: '190deg', t: '720ms' },
  { dx: '-98px', dy: '30px', r: '-220deg', t: '860ms' },
  { dx: '6px', dy: '-98px', r: '120deg', t: '700ms' },
];
const CRACKS = [
  { d: 'M60 14 L56 30 L64 40', delay: 960 },
  { d: 'M104 60 L90 58 L84 68', delay: 1000 },
  { d: 'M24 82 L38 76 L40 90', delay: 1030 },
];

function benefitIcon(benefit) {
  const key = `${benefit?.code || ''} ${benefit?.category || ''}`.toLowerCase();
  if (/listen|nghe/.test(key)) return Headphones;
  if (/speak|noi/.test(key)) return Mic;
  if (/writ|essay|viet/.test(key)) return PenLine;
  if (/srs|review|flash/.test(key)) return RefreshCcw;
  if (/note/.test(key)) return NotebookPen;
  if (/mock|exam|test/.test(key)) return ClipboardCheck;
  if (/path|roadmap|journey/.test(key)) return Route;
  if (/credit|grading/.test(key)) return Ticket;
  if (/ai/.test(key)) return Sparkles;
  if (/lesson|study|kanji|grammar|vocab/.test(key)) return BookOpen;
  return Sparkles;
}

/** Lock with gradient body, highlight, keyhole glow; the shackle springs open at impact (CSS). */
function PremiumLock() {
  return (
    <svg viewBox="0 0 92 92" className="h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
      <defs>
        <linearGradient id="rp-pu-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCE7A6" />
          <stop offset="0.45" stopColor="#F2C25A" />
          <stop offset="1" stopColor="#C98B12" />
        </linearGradient>
        <linearGradient id="rp-pu-shackle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B9C0CC" />
          <stop offset="0.5" stopColor="#F4F6FA" />
          <stop offset="1" stopColor="#9AA3B2" />
        </linearGradient>
      </defs>
      <path
        className="rp-pu-shackle"
        d="M30 44 V31 a16 16 0 0 1 32 0 V44"
        fill="none"
        stroke="url(#rp-pu-shackle)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="18" y="40" width="56" height="44" rx="12" fill="url(#rp-pu-body)" />
      <rect x="18" y="40" width="56" height="44" rx="12" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M24 47 h44" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
      <circle className="rp-pu-keyglow" cx="46" cy="60" r="11" fill="rgba(255,255,255,0.65)" />
      <circle cx="46" cy="58" r="5" fill="#7A4E05" />
      <path d="M46 61 V71" stroke="#7A4E05" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function SuccessBadge() {
  return (
    <svg viewBox="0 0 88 88" className="h-full w-full">
      <defs>
        <linearGradient id="rp-pu-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE9B" />
          <stop offset="1" stopColor="#0F8A4E" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r="40" fill="url(#rp-pu-badge)" />
      <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <path d="M18 30 a30 30 0 0 1 40 -14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeLinecap="round" />
      <path
        className="rp-pu-badge-check"
        pathLength="1"
        d="M27 45 L39 57 L62 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Premium Unlock — payment success celebration (shown only for a server-verified, activated order).
 *
 * Phases (CSS, ~2.4s, transform/opacity/stroke only): cinematic entrance → energy charge (ring, converging
 * particles, lock shake) → unlock impact (shackle spring, seal cracks + shards, shockwave, flash) → success badge +
 * plan name shine → benefits unlock one by one → CTA. "Bỏ qua hiệu ứng", Escape, X and backdrop all work at any
 * moment; reduced motion shows the final state immediately. `variant="renew"` (renewal / credit top-up) skips the
 * lock-breaking because nothing new is being unlocked.
 */
export default function PremiumUnlockDialog({
  open,
  variant = 'unlock',
  eyebrow,
  planName,
  title,
  description,
  chips = [],
  benefits = [],
  ctaLabel,
  secondaryLabel,
  onSecondary,
  onCta,
  onClose,
}) {
  const { tr } = useLocale();
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const [skipped, setSkipped] = useState(false);
  const [settled, setSettled] = useState(false);
  useFocusTrap(panelRef, { open, onEscape: onClose });

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => setSettled(true), ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const unlocking = variant === 'unlock';
  // Text timing (ms) — the renew variant settles faster.
  const t0 = unlocking ? 1320 : 520;
  const rowsStart = t0 + 420;
  const ctaAt = rowsStart + Math.min(benefits.length, 6) * 130 + 160;

  return createPortal(
    <div className="rp-pu fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4" data-skip={skipped ? 'true' : undefined}>
      <div aria-hidden="true" className="rp-pu-backdrop absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="rp-pu-panel rp-pu-panel-body relative flex max-h-[96dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--rp-popup-border)] bg-[var(--rp-popup-bg)] text-rp-text shadow-[var(--rp-popup-shadow)] outline-none sm:rounded-[28px]"
      >
        {/* Hero stage */}
        <div className="rp-pu-hero shrink-0 px-5 pb-5 pt-7" aria-hidden="true">
          <div className="rp-pu-stage">
            <span className="rp-pu-aura" />
            {unlocking && (
              <>
                <svg viewBox="0 0 136 136" className="rp-pu-ring">
                  <circle cx="68" cy="68" r="62" fill="none" stroke="rgba(253,230,138,0.85)" strokeWidth="2.5" strokeDasharray="22 14 6 14" strokeLinecap="round" />
                  <circle cx="68" cy="68" r="54" fill="none" stroke="rgba(167,243,208,0.55)" strokeWidth="1.5" strokeDasharray="4 10" />
                </svg>
                {CHARGE.map((p) => (
                  <span key={p.d} className="rp-pu-in" style={{ '--x': p.x, '--y': p.y, '--d': `${p.d}ms` }} />
                ))}
                <svg viewBox="0 0 120 120" className="rp-pu-seal">
                  <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.04)" stroke="rgba(253,230,138,0.6)" strokeWidth="1.5" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 5" />
                  {CRACKS.map((c) => (
                    <path key={c.d} className="rp-pu-crack" pathLength="1" d={c.d} fill="none" stroke="#FFF7D6" strokeWidth="2" strokeLinecap="round" style={{ '--d': `${c.delay}ms` }} />
                  ))}
                </svg>
                <span className="rp-pu-lock">
                  <PremiumLock />
                </span>
                <span className="rp-pu-flash" />
                <span className="rp-pu-wave" />
                {SHARDS.map((s) => (
                  <span key={s.dx} className="rp-pu-shard" style={{ '--dx': s.dx, '--dy': s.dy, '--r': s.r, '--t': s.t }} />
                ))}
              </>
            )}
            {!unlocking && <span className="rp-pu-wave" style={{ animationDelay: '320ms' }} />}
            <span className="rp-pu-badge-halo" style={{ '--badge-d': unlocking ? '1380ms' : '160ms' }} />
            <span className="rp-pu-badge" style={{ '--badge-d': unlocking ? '1380ms' : '160ms', '--check-d': unlocking ? '1640ms' : '420ms' }}>
              <SuccessBadge />
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Đóng')}
          className="rp-focus absolute right-3.5 top-3.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/85 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        {!skipped && !settled && (
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="rp-focus absolute left-3.5 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            {tr('Bỏ qua hiệu ứng')}
          </button>
        )}

        {/* Body */}
        <div className="rp-no-scrollbar min-h-0 overflow-y-auto px-5 pb-5 pt-4 text-center sm:px-7">
          <p className="rp-mh-rise text-[12px] font-extrabold uppercase tracking-[0.16em] text-rp-success" style={{ '--d': `${t0}ms` }}>
            {eyebrow}
          </p>
          {planName && (
            <p className="rp-mh-rise mt-1.5 flex justify-center" style={{ '--d': `${t0 + 60}ms` }}>
              <span
                className="rp-pu-name inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#F2D58A] bg-[#FFF8E4] px-3 py-1 text-[13px] font-bold text-[#7A5306]"
                style={{ '--d': `${t0 + 300}ms` }}
              >
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{planName}</span>
              </span>
            </p>
          )}
          <h2 id={titleId} className="rp-mh-rise mt-2 text-[21px] font-black leading-tight text-rp-text sm:text-[23px]" style={{ '--d': `${t0 + 120}ms` }}>
            {title}
          </h2>
          <p id={descId} className="rp-mh-rise mx-auto mt-2 max-w-[390px] text-[14.5px] leading-6 text-rp-text-2" style={{ '--d': `${t0 + 200}ms` }}>
            {description}
          </p>

          {chips.length > 0 && (
            <ul className="mt-3 flex flex-wrap justify-center gap-2" aria-label={tr('Thông tin gói')}>
              {chips.map((chip, i) => {
                const ChipIcon = chip.icon;
                return (
                  <li
                    key={chip.label}
                    className="rp-mh-fact inline-flex items-center gap-1.5 rounded-full border border-rp-line bg-rp-bg-2 px-3 py-1.5 text-[13px] font-bold text-rp-text"
                    style={{ '--d': `${t0 + 280 + i * 80}ms` }}
                  >
                    {ChipIcon && <ChipIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />}
                    <span>{chip.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {benefits.length > 0 && (
            <ul className="mt-4 space-y-2 text-left" aria-label={tr('Quyền lợi của gói')}>
              {benefits.map((b, i) => {
                const Icon = benefitIcon(b);
                const d = `${rowsStart + i * 130}ms`;
                const fresh = b.isNew !== false;
                return (
                  <li
                    key={b.code || b.name}
                    className={cx(
                      'rp-pu-row flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                      fresh
                        ? 'border-rp-success-line/70 bg-rp-success-bg/50'
                        : 'border-rp-line bg-rp-bg-2/60',
                    )}
                    style={{ '--d': d }}
                  >
                    <span
                      className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rp-surface shadow-rp-xs',
                        fresh ? 'text-rp-success' : 'text-rp-text-2',
                      )}
                    >
                      <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold leading-5 text-rp-text">{tr(b.name)}</span>
                      {b.description && <span className="block text-[12.5px] leading-5 text-rp-text-muted">{tr(b.description)}</span>}
                    </span>
                    {fresh && (
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center" aria-label={tr('Đã mở khóa')}>
                        {unlocking && (
                          <span className="rp-pu-row-lock absolute inset-0 flex items-center justify-center rounded-full bg-rp-muted text-rp-text-muted" style={{ '--d': d }}>
                            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="rp-pu-row-ok flex h-7 w-7 items-center justify-center rounded-full bg-rp-success text-white" style={{ '--d': d }}>
                          <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rp-mh-rise" style={{ '--d': `${ctaAt}ms` }}>
            <button
              type="button"
              onClick={onCta}
              className="rp-focus rp-pu-cta mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rp-brand-pressed px-4 py-2.5 text-[16px] font-extrabold text-white shadow-[0_4px_0_#9E3350,0_14px_24px_-14px_rgba(158,51,80,0.8)] hover:bg-rp-brand-strong"
              style={{ '--shine-d': `${ctaAt + 300}ms` }}
            >
              <span>{ctaLabel}</span>
              <ArrowRight aria-hidden="true" className="h-4.5 w-4.5" />
            </button>
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
