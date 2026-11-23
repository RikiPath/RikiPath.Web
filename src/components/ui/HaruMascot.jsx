import { cx } from './cx.js';
import { RIKI_MASCOT_ASSETS, RIKI_POSE_MAP } from './mascotAssets.js';

/**
 * Riki, RikiPath's Soft-3D Chibi Sakura Kitsune study companion.
 * Decorative unless `alt` is provided.
 */
export function HaruMascot({
  pose = 'welcome',
  size = 120,
  className,
  alt = '',
  halo = false,
}) {
  const key = RIKI_POSE_MAP[pose] || 'welcome';
  const src = RIKI_MASCOT_ASSETS[key] || RIKI_MASCOT_ASSETS.welcome;
  const numericSize = Number(size) || 120;

  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 select-none items-center justify-center',
        className,
      )}
      style={{ width: numericSize, height: numericSize }}
    >
      {halo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-6%] rounded-full bg-[radial-gradient(circle,rgba(255,244,247,0.92)_0%,rgba(250,212,222,0.45)_54%,transparent_76%)]"
        />
      )}
      <img
        src={src}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        draggable={false}
        loading="eager"
        decoding="async"
        className="relative h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(140,42,74,0.12)]"
      />
    </span>
  );
}

export default HaruMascot;
