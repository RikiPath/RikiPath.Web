import { useState } from 'react';
import { cx } from './cx.js';
import {
  getAvatarInitials,
  isExternalAvatarUrl,
  normalizeAvatarUrl,
  resolveAvatarDimension,
} from './userAvatarLogic.js';

const ROUNDED_CLASSES = Object.freeze({
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
});

/**
 * Unified user avatar with fixed box sizing (zero CLS), skeleton loading shimmer,
 * safe external referrerPolicy (for Google OAuth CDN photos), and accessible initials fallback.
 */
export default function UserAvatar({
  src,
  name,
  alt,
  size = 40,
  rounded = 'full',
  loading = false,
  eager = false,
  decorative = false,
  className,
  imgClassName,
}) {
  const px = resolveAvatarDimension(size);
  const normalizedSrc = normalizeAvatarUrl(src);
  const [failedSrc, setFailedSrc] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);

  const hasValidSrc = Boolean(normalizedSrc) && failedSrc !== normalizedSrc;
  const isImageReady = hasValidSrc && loadedSrc === normalizedSrc;
  const external = hasValidSrc && isExternalAvatarUrl(normalizedSrc);
  const initials = getAvatarInitials(name);
  const roundedCls = ROUNDED_CLASSES[rounded] || ROUNDED_CLASSES.full;
  const displayAlt = decorative ? '' : (alt ?? String(name || '').trim()) || '';

  const boxStyle = {
    width: px,
    height: px,
    fontSize: Math.max(11, Math.round(px * 0.34)),
  };

  return (
    <span
      style={boxStyle}
      aria-hidden={decorative ? 'true' : undefined}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-rp-brand-tint font-bold text-rp-brand-strong select-none',
        roundedCls,
        loading && !hasValidSrc && 'animate-pulse',
        className,
      )}
    >
      {loading && !hasValidSrc ? (
        <span aria-hidden="true" className="h-full w-full bg-rp-brand-tint/80" />
      ) : (
        <span aria-hidden={hasValidSrc ? 'true' : undefined} className="leading-none">
          {initials}
        </span>
      )}

      {hasValidSrc && (
        <img
          src={normalizedSrc}
          alt={displayAlt}
          width={px}
          height={px}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy={external ? 'no-referrer' : undefined}
          onLoad={() => setLoadedSrc(normalizedSrc)}
          onError={() => setFailedSrc(normalizedSrc)}
          className={cx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-150',
            isImageReady ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </span>
  );
}
