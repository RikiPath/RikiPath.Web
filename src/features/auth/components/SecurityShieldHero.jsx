import { cx } from '@/components/ui';

/**
 * Lightweight layered 3D CSS + SVG Security Emblem: Shield + Padlock + Soft Sakura Glow.
 * Uses GPU-composited transform/opacity transitions only and respects `prefers-reduced-motion`.
 */
export default function SecurityShieldHero({ mood = 'idle', className }) {
  const isTyping = mood === 'typing';
  const isStrong = mood === 'strong';
  const isSuccess = mood === 'success';

  const cardTransform = isSuccess
    ? '[transform:rotateY(0deg)_rotateX(0deg)_scale(1.04)]'
    : isStrong
      ? '[transform:rotateY(6deg)_rotateX(4deg)_translateY(-3px)]'
      : isTyping
        ? '[transform:rotateY(-6deg)_rotateX(3deg)_translateY(-2px)]'
        : '[transform:rotateY(-4deg)_rotateX(2deg)_translateY(0px)]';

  const glowColor = isSuccess
    ? 'bg-emerald-300/45'
    : isStrong
      ? 'bg-teal-200/45'
      : 'bg-[#F8B4C6]/45';

  return (
    <div
      aria-hidden="true"
      className={cx(
        'relative flex h-28 w-28 shrink-0 select-none items-center justify-center sm:h-32 sm:w-32',
        '[perspective:720px]',
        className,
      )}
    >
      {/* Ambient Sakura / Security Glow */}
      <div
        className={cx(
          'pointer-events-none absolute inset-1 rounded-full blur-xl transition-[background-color,transform,opacity] duration-300 motion-reduce:transition-none',
          glowColor,
          isSuccess ? 'scale-110 opacity-95' : isStrong ? 'scale-105 opacity-85' : 'scale-100 opacity-75',
        )}
      />

      {/* 3D tilted badge card */}
      <div
        className={cx(
          'relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/15 shadow-[0_18px_36px_-14px_rgba(74,20,38,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] backdrop-blur-sm transition-transform duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none sm:h-28 sm:w-28',
          cardTransform,
        )}
      >
        <svg viewBox="0 0 96 96" className="h-20 w-20 sm:h-24 sm:w-24">
          <defs>
            <linearGradient id="rp-shield-grad" x1="16" y1="8" x2="80" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isSuccess ? '#34D399' : isStrong ? '#FFE4EC' : '#FFF7FA'} />
              <stop offset="100%" stopColor={isSuccess ? '#059669' : '#F4BACB'} />
            </linearGradient>
            <linearGradient id="rp-lock-grad" x1="34" y1="42" x2="62" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isSuccess ? '#FFFFFF' : '#C24362'} />
              <stop offset="100%" stopColor={isSuccess ? '#ECFDF5' : '#952745'} />
            </linearGradient>
          </defs>

          {/* Back Shield Depth Layer */}
          <path
            d="M48 11 L78 23 V47 C78 65.5 64.5 79.5 48 86 C31.5 79.5 18 65.5 18 47 V23 Z"
            fill="rgba(255,255,255,0.22)"
            transform="translate(2 3)"
          />

          {/* Main 3D Shield Surface */}
          <path
            d="M48 11 L78 23 V47 C78 65.5 64.5 79.5 48 86 C31.5 79.5 18 65.5 18 47 V23 Z"
            fill="url(#rp-shield-grad)"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
          />

          {/* Lock Shackle (lifts gently while typing/ready, drops shut cleanly on success) */}
          <path
            d="M38 45 V37 C38 31.5 42.5 27 48 27 C53.5 27 58 31.5 58 37 V45"
            fill="none"
            stroke={isSuccess ? '#FFFFFF' : '#A93251'}
            strokeWidth="4.2"
            strokeLinecap="round"
            className="transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              transform: isSuccess
                ? 'translateY(1px)'
                : isTyping
                  ? 'translateY(-2.5px)'
                  : 'translateY(-1px)',
            }}
          />

          {/* Lock Body */}
          <rect
            x="33"
            y="43"
            width="30"
            height="24"
            rx="6"
            fill="url(#rp-lock-grad)"
          />

          {/* Keyhole / Checkmark inside Lock Body */}
          {isSuccess ? (
            <path
              d="M41.5 55 L46.2 59.5 L55 50.5"
              fill="none"
              stroke="#059669"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <g fill="#FFF5F8">
              <circle cx="48" cy="53" r="3" />
              <rect x="46.7" y="54.5" width="2.6" height="5.5" rx="1.2" />
            </g>
          )}
        </svg>

        {/* Strong / Success Corner Seal Badge */}
        <span
          className={cx(
            'absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md transition-[transform,opacity,background-color] duration-200 motion-reduce:transition-none',
            isSuccess
              ? 'scale-100 bg-emerald-500 text-white opacity-100'
              : isStrong
                ? 'scale-100 bg-teal-500 text-white opacity-100'
                : 'scale-75 bg-transparent opacity-0',
          )}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M3.5 8.2 L6.5 11.2 L12.5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
