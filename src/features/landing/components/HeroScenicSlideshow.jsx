import { useCallback, useEffect, useRef, useState } from 'react';
import { PHOTOS } from '@/assets/photos.js';
import { cx } from '@/components/ui';

// Invisible full-bleed background slideshow: no dots, arrows, counter or indicator UI of any kind.
//
// Why the photo used to vanish: each new slide mounted a fresh lazy <img> and faded in on mount, while the
// outgoing layer was dropped on a fixed timer. When the incoming file was not decoded yet, the fade played on
// an empty <picture>, the old layer was removed, and the pink fallback surface showed through (a "flash").
// Now the next photo is fetched + decoded off-DOM first, the switch only happens once it is ready, the
// incoming layer fades in only after its own `load`, and the outgoing layer stays underneath until the
// crossfade has finished. Layers are stacked with explicit z-order so nothing above can hide them.
//
// `position` keeps each photo's subject in frame per breakpoint (mobile / desktop) — see landing.css.
const SCENES = [
  { name: 'fuji', pos: ['62% 50%', '64% 46%'], kb: 'a' },
  { name: 'bannerPagodaSunrise', pos: ['50% 45%', '58% 42%'], kb: 'b' },
  { name: 'bannerFujiLake', pos: ['55% 50%', '60% 48%'], kb: 'c' },
  { name: 'bannerKyotoStreet', pos: ['50% 50%', '62% 50%'], kb: 'a' },
  { name: 'bannerJapaneseGarden', pos: ['45% 50%', '58% 50%'], kb: 'b' },
];
const INTERVAL_MS = 7000;
const FADE_MS = 1600;

function srcSetOf(photo) {
  return photo.webp.map(([src, w]) => `${src} ${w}w`).join(', ');
}

/** Fetch + decode a scene off-DOM so its crossfade can never reveal a blank frame. Resolves false on error. */
function preloadScene(name, sizes) {
  const photo = PHOTOS[name];
  if (!photo || typeof Image === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.sizes = sizes;
    img.srcset = srcSetOf(photo);
    img.src = photo.jpg;
    const done = () => (img.decode ? img.decode().then(() => resolve(true), () => resolve(img.complete && img.naturalWidth > 0)) : resolve(true));
    if (img.complete && img.naturalWidth > 0) done();
    else {
      img.onload = done;
      img.onerror = () => resolve(false);
    }
  });
}

function Slide({ scene, sizes, priority, entering, onShown, onError }) {
  const photo = PHOTOS[scene.name];
  const [loaded, setLoaded] = useState(false);
  if (!photo) return null;
  return (
    <picture
      className={cx('lp-slide', entering ? 'lp-slide-enter' : 'lp-slide-base', loaded && 'is-loaded')}
      style={{ '--pos-sm': scene.pos[0], '--pos-lg': scene.pos[1] }}
      onAnimationEnd={(event) => { if (event.animationName === 'lp-slide-fade') onShown?.(); }}
    >
      <source type="image/webp" srcSet={srcSetOf(photo)} sizes={sizes} />
      <img
        src={photo.jpg}
        width={photo.width}
        height={photo.height}
        alt=""
        aria-hidden="true"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
        draggable={false}
        data-kb={scene.kb}
        onLoad={() => setLoaded(true)}
        onError={onError}
      />
    </picture>
  );
}

export default function HeroScenicSlideshow({ className, sizes = '100vw' }) {
  const rootRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState(null);
  const state = useRef({ current: 0, incoming: null, busy: false, failed: new Set() });

  const startFade = useCallback((next) => {
    state.current.incoming = next;
    setIncoming(next);
  }, []);
  const finishFade = useCallback(() => {
    const s = state.current;
    if (s.incoming === null) return;
    s.current = s.incoming;
    s.incoming = null;
    s.busy = false;
    setCurrent(s.current);
    setIncoming(null);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer = null;
    let visible = true;
    let alive = true;

    const nextIndex = () => {
      const s = state.current;
      for (let step = 1; step <= SCENES.length; step += 1) {
        const i = (s.current + step) % SCENES.length;
        if (!s.failed.has(i) && i !== s.current) return i;
      }
      return null;
    };
    const paused = () => document.hidden || !visible;
    const syncPaused = () => root.toggleAttribute('data-paused', paused());

    const advance = async () => {
      const s = state.current;
      const target = nextIndex();
      if (target === null || s.busy) return;
      s.busy = true;
      const ok = await preloadScene(SCENES[target].name, sizes);
      if (!alive) return;
      if (!ok) {
        s.failed.add(target);
        s.busy = false;
        schedule();
        return;
      }
      if (paused()) { s.busy = false; return; } // resume() reschedules
      startFade(target);
      // Safety net if animationend never fires (e.g. tab throttled mid-fade).
      window.setTimeout(() => { if (alive) finishFade(); }, FADE_MS + 600);
      schedule();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      syncPaused();
      if (paused()) return;
      timer = window.setTimeout(advance, INTERVAL_MS);
    };
    // Warm the cache for the 2nd scene right away (idle), so the first switch is instant.
    const warm = window.setTimeout(() => { preloadScene(SCENES[1].name, sizes); }, 2500);

    // Gentle scroll parallax (desktop only): one CSS variable written inside rAF, transform-only in CSS.
    let frame = 0;
    const wide = window.matchMedia?.('(min-width: 1024px)');
    const onScroll = () => {
      if (frame || !visible || !wide?.matches) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = root.getBoundingClientRect();
        const scrolled = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
        root.style.setProperty('--lp-par', `${(scrolled * 60).toFixed(1)}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onVisibility = () => schedule();
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.02 })
      : null;
    io?.observe(root);
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(warm);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sizes, startFade, finishFade]);

  const markFailed = useCallback((index) => {
    state.current.failed.add(index);
    if (state.current.incoming === index) finishFade();
  }, [finishFade]);

  return (
    <div ref={rootRef} aria-hidden="true" className={cx('lp-slides', className)}>
      <div className="lp-slides-track">
        <Slide key={`s-${current}`} scene={SCENES[current]} sizes={sizes} priority={current === 0} onError={() => markFailed(current)} />
        {incoming !== null && (
          <Slide key={`s-${incoming}`} scene={SCENES[incoming]} sizes={sizes} entering onShown={finishFade} onError={() => markFailed(incoming)} />
        )}
      </div>
    </div>
  );
}
