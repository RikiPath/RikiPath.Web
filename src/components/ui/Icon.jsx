import { FALLBACK_ICON, MATERIAL_ICONS } from './iconMap.js';
import { cx } from './cx.js';

/**
 * Name-based icon for screens migrated from the Material Symbols font.
 * Renders a lucide SVG at 1em, so existing `text-[Npx]` size classes keep working.
 */
export default function Icon({ name, className = '', filled = false, strokeWidth = 2, ...rest }) {
  const Glyph = MATERIAL_ICONS[name] || FALLBACK_ICON;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      size="1em"
      strokeWidth={strokeWidth}
      fill={filled ? 'currentColor' : 'none'}
      className={cx('inline-block shrink-0 align-[-0.125em]', name === 'progress_activity' && 'animate-spin', className)}
      {...rest}
    />
  );
}
