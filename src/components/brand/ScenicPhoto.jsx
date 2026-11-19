import { useState } from 'react';
import { PHOTOS } from '@/assets/photos.js';
import { cx } from '@/components/ui';

/**
 * Responsive photograph: WebP srcset with JPG fallback, explicit intrinsic size (no layout shift),
 * lazy by default, and a soft Sakura gradient if the file cannot load.
 */
export default function ScenicPhoto({ name, sizes = '100vw', priority = false, decorative = false, className, imgClassName, position = 'center' }) {
  const photo = PHOTOS[name];
  const [failed, setFailed] = useState(false);
  if (!photo || failed) {
    return <div aria-hidden="true" className={cx('bg-gradient-to-br from-rp-brand-tint via-rp-bg-2 to-rp-info-bg', className)} />;
  }
  return (
    <picture className={cx('block overflow-hidden', className)}>
      <source type="image/webp" srcSet={photo.webp.map(([src, w]) => `${src} ${w}w`).join(', ')} sizes={sizes} />
      <img
        src={photo.jpg}
        width={photo.width}
        height={photo.height}
        alt={decorative ? '' : photo.alt}
        aria-hidden={decorative || undefined}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        onError={() => setFailed(true)}
        className={cx('h-full w-full object-cover', imgClassName)}
        style={{ objectPosition: position }}
      />
    </picture>
  );
}
