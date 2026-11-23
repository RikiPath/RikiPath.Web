// Lightweight original SVG glyphs for the Sakura learning journey (no external media, no copied assets).
import { cx } from '@/components/ui';

export function ToriiGlyph({ className }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cx('h-6 w-6', className)}>
      <path d="M4 11.5c7 2.6 33 2.6 40 0l-1.6 5.2H5.6z" fill="currentColor" />
      <rect x="9" y="20" width="30" height="3.2" rx="1.2" fill="currentColor" />
      <rect x="12.5" y="16" width="3.6" height="27" rx="1" fill="currentColor" />
      <rect x="31.9" y="16" width="3.6" height="27" rx="1" fill="currentColor" />
      <rect x="22.4" y="16" width="3.2" height="7" rx="0.8" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

export function FujiGlyph({ className }) {
  return (
    <svg viewBox="0 0 120 48" aria-hidden="true" focusable="false" className={cx('h-12 w-28', className)}>
      <path d="M0 48 L44 10 Q60 -2 76 10 L120 48 Z" fill="currentColor" opacity="0.16" />
      <path d="M44 10 Q60 -2 76 10 L68 17 L62 13 L56 18 L50 14 Z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function SakuraPetal({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={cx('h-3 w-3', className)} style={style}>
      <path d="M12 2c3.5 3 5 6.2 4.4 9.4C15.8 14.6 13.8 17 12 22c-1.8-5-3.8-7.4-4.4-10.6C7 8.2 8.5 5 12 2z" fill="currentColor" />
    </svg>
  );
}
