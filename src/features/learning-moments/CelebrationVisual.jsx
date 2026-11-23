import {
  BadgeCheck,
  BookCheck,
  CalendarCheck2,
  ClipboardCheck,
  Compass,
  LockOpen,
  Medal,
  Target,
  Trophy,
} from 'lucide-react';
import { cx } from '@/components/ui';

/**
 * Context-aware hero visual for Learning Moments (replaces the mascot). One badge shell, an icon per event family,
 * colours from the moment's accent. Purchase success draws its own check mark instead of using an icon.
 *
 * `animation`: 'success-reveal' | 'badge-pop' | 'none' — all CSS (tokens.css `rp-cel-*`), disabled under
 * prefers-reduced-motion.
 */
const ICONS = {
  medal: Medal,
  trophy: Trophy,
  book: BookCheck,
  compass: Compass,
  unlock: LockOpen,
  target: Target,
  result: ClipboardCheck,
  calendar: CalendarCheck2,
  verified: BadgeCheck,
};

function SuccessCheck({ color }) {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true" className="h-[58%] w-[58%]">
      <path
        className="rp-cel-check-path"
        d="M14 27.5 22.5 36 39 17"
        fill="none"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CelebrationVisual({ visual = 'verified', accent, animation = 'badge-pop', size = 'lg', centered = true, className }) {
  const dims = size === 'xs' ? 'h-5 w-5' : size === 'sm' ? 'h-11 w-11' : size === 'md' ? 'h-[96px] w-[96px]' : 'h-[120px] w-[120px]';
  const Icon = ICONS[visual] || BadgeCheck;
  const isSuccess = visual === 'success';
  const small = size === 'sm' || size === 'xs';

  return (
    <div className={cx('relative shrink-0', centered && 'mx-auto', dims, className)} aria-hidden="true">
      {/* Soft outer ring (static on small badges) */}
      {!small && (
        <span
          className={cx('absolute inset-0 rounded-full', animation !== 'none' && 'rp-cel-ring')}
          style={{ background: accent.soft }}
        />
      )}
      <span
        className={cx(
          'absolute flex items-center justify-center rounded-full',
          small ? 'inset-0' : 'inset-[12%]',
          animation === 'success-reveal' && 'rp-cel-success',
          animation === 'badge-pop' && 'rp-cel-pop',
        )}
        style={{
          background: isSuccess ? '#FFFFFF' : `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
          boxShadow: small
            ? 'none'
            : `0 12px 26px -12px ${accent.edge}, inset 0 -4px 0 rgba(0,0,0,0.08)${isSuccess ? `, 0 0 0 5px ${accent.to}` : ''}`,
        }}
      >
        {isSuccess ? (
          <SuccessCheck color={accent.to} />
        ) : (
          <Icon className={size === 'xs' ? 'h-3 w-3 text-white' : small ? 'h-5 w-5 text-white' : 'h-[46%] w-[46%] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]'} strokeWidth={2.2} />
        )}
      </span>
    </div>
  );
}
