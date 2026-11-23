import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PHOTOS } from '@/assets/photos.js';
import { cx } from '@/components/ui';
import { AUTH_SLIDES } from '../constants/authSlides.js';
import { useLocale } from '@/locales/locale.js';

export const SLIDE_INTERVAL_MS = 6000;
export const SLIDE_FADE_MS = 1150;
const DESKTOP_SIZES = '(min-width: 1024px) 58vw, 100vw';
const MOBILE_SIZES = '100vw';

const MOTION_CLASS = {
  'zoom-in': 'rp-kb-zoom-in',
  'pan-right': 'rp-kb-pan-right',
  'zoom-out': 'rp-kb-zoom-out',
  'pan-left': 'rp-kb-pan-left',
};

function srcSet(photo) {
  return (photo?.webp || []).map(([src, w]) => `${src} ${w}w`).join(', ');
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function SlideImage({ slide, compact, animationPaused, priority, onError }) {
  const photo = PHOTOS[slide.photo];
  if (!photo) return null;
  const sizes = compact ? MOBILE_SIZES : DESKTOP_SIZES;
  const motionClass = MOTION_CLASS[slide.motion] || 'rp-kb-zoom-in';
  const objectPosition = compact ? (slide.mobilePosition || slide.position) : slide.position;

  return (
    <picture className="absolute inset-0 block">
      {photo.webp?.length > 0 && <source type="image/webp" srcSet={srcSet(photo)} sizes={sizes} />}
      <img
        src={photo.jpg}
        width={photo.width}
        height={photo.height}
        alt=""
        decoding="async"
        loading="eager"
        fetchPriority={priority ? 'high' : undefined}
        onError={onError}
        className={cx('h-full w-full select-none object-cover', motionClass)}
        style={{
          objectPosition,
          animationPlayState: animationPaused ? 'paused' : 'running',
        }}
      />
    </picture>
  );
}

function SlideCopy({ slide, compact, tr }) {
  const titleLines = slide.titleLines?.length ? slide.titleLines : [slide.caption];

  return (
    <div
      className={cx('rp-auth-copy', compact && 'rp-auth-copy-compact')}
      data-layout={slide.layout || 'left'}
      data-reveal={slide.reveal || 'rise'}
      data-title-size={slide.titleSize || 'default'}
    >
      {slide.eyebrow && <p className="rp-auth-copy-eyebrow rp-auth-reveal">{tr(slide.eyebrow)}</p>}
      <h2 className="rp-auth-copy-title" aria-label={titleLines.map(tr).join(' ')}>
        {titleLines.map((line) => (
          <span className="rp-auth-copy-line rp-auth-reveal" key={line}>{tr(line)}</span>
        ))}
      </h2>
      {!compact && slide.description && (
        <p className="rp-auth-copy-description rp-auth-reveal">{tr(slide.description)}</p>
      )}
    </div>
  );
}

/**
 * Scenic auth banner: crossfade + subtle Ken Burns, preloaded WebP/JPG,
 * refined manual prev/next & dots controls, responsive desktop + mobile strip,
 * paused when tab hidden / off-screen, and reduced-motion compliant.
 */
export default function AuthScenicCarousel({
  slides = AUTH_SLIDES,
  compact = false,
  className,
}) {
  const { trf, tr } = useLocale();
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(null);
  const [failed, setFailed] = useState(() => new Set());
  const [hidden, setHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  const [interacting, setInteracting] = useState(false);
  const rootRef = useRef(null);
  const preloadedRef = useRef(new Set());
  const reduced = useReducedMotion();

  const animationPaused = hidden || reduced;
  const autoPaused = animationPaused || interacting || slides.length < 2;

  const goTo = useCallback(
    (next) => {
      if (slides.length < 2) return;
      const target = ((next % slides.length) + slides.length) % slides.length;
      if (target === index) return;
      setPrevious(index);
      setIndex(target);
    },
    [index, slides.length],
  );

  const stepBy = useCallback(
    (delta) => goTo(index + delta),
    [goTo, index],
  );

  // Remove outgoing layer once crossfade finishes cleanly.
  useEffect(() => {
    if (previous == null) return undefined;
    const timer = window.setTimeout(() => setPrevious(null), SLIDE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [previous]);

  // Pause both timer & CSS motion when document is hidden or breakpoint hides element.
  useEffect(() => {
    let onScreen = true;
    const update = () => {
      const tabHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      setHidden(tabHidden || !onScreen);
    };
    document.addEventListener('visibilitychange', update);
    let observer;
    if (rootRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        update();
      });
      observer.observe(rootRef.current);
    }
    return () => {
      document.removeEventListener('visibilitychange', update);
      observer?.disconnect();
    };
  }, []);

  // Preload next slide WebP/JPG and decode before crossfade.
  useEffect(() => {
    if (hidden || slides.length < 2) return;
    const nextIdx = (index + 1) % slides.length;
    const photo = PHOTOS[slides[nextIdx]?.photo];
    if (!photo || preloadedRef.current.has(photo.jpg)) return;
    preloadedRef.current.add(photo.jpg);

    const warm = new Image();
    warm.sizes = compact ? MOBILE_SIZES : DESKTOP_SIZES;
    const set = srcSet(photo);
    if (set) warm.srcset = set;
    warm.src = photo.jpg;
    warm.decode?.().catch(() => {});
  }, [compact, hidden, index, slides]);

  // Auto-advance every 6s when visible, active, and motion allowed.
  useEffect(() => {
    if (autoPaused) return undefined;
    const timer = window.setTimeout(() => {
      goTo((index + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [autoPaused, goTo, index, slides.length]);

  const layers = previous == null ? [index] : [previous, index];
  const markFailed = (i) => () => setFailed((current) => new Set(current).add(i));
  const currentSlide = slides[index] || slides[0];

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepBy(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepBy(1);
    }
  };

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label={tr('Phong cảnh Nhật Bản')}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setInteracting(false);
        }
      }}
      onKeyDown={handleKeyDown}
      data-paused={animationPaused}
      className={cx('relative isolate overflow-hidden bg-[#2A1520]', className)}
    >
      {layers.map((i) => {
        const isIncoming = i === index && previous != null;
        return (
          <div
            key={i}
            aria-hidden="true"
            style={{ zIndex: i === index ? 2 : 1 }}
            className={cx('absolute inset-0', isIncoming && 'rp-crossfade-in')}
          >
            {!failed.has(i) && slides[i] && (
              <SlideImage
                slide={slides[i]}
                compact={compact}
                animationPaused={animationPaused}
                priority={i === 0}
                onError={markFailed(i)}
              />
            )}
          </div>
        );
      })}

      {/* Contrast scrims: rich bottom plum gradient + soft top-left corner vignette */}
      <div
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute inset-0 z-[3]',
          compact
            ? 'bg-gradient-to-t from-[rgba(22,10,18,0.68)] via-[rgba(22,10,18,0.16)] to-transparent'
            : 'bg-gradient-to-t from-[rgba(22,10,18,0.9)] via-[rgba(28,12,22,0.44)] via-55% to-transparent',
        )}
      />
      {!compact && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-36 bg-gradient-to-r from-[rgba(22,10,18,0.48)] via-[rgba(22,10,18,0.14)] to-transparent"
        />
      )}

      {/* Vertical Japanese tagline (tategaki) on desktop */}
      {!compact && (
        <div key={currentSlide?.id || index} aria-hidden="true" className="rp-auth-vertical pointer-events-none absolute left-7 top-8 z-[4] hidden flex-col items-center gap-3 sm:flex xl:left-10 xl:top-10">
          <span lang="ja" className="rp-kanji text-[22px] leading-[1.25] tracking-[0.18em] text-white drop-shadow-[0_2px_10px_rgba(16,6,12,0.7)] [writing-mode:vertical-rl]">
            {currentSlide?.verticalLabel}
          </span>
          <span className="h-10 w-px bg-white/55" />
          <svg viewBox="0 0 20 20" className="h-6 w-6 text-[#F7B6C8] drop-shadow" aria-hidden="true">
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} cx="10" cy="5" rx="3" ry="4.4" fill="currentColor" transform={`rotate(${r} 10 10)`} />
            ))}
            <circle cx="10" cy="10" r="1.8" fill="#FFE7AE" />
          </svg>
        </div>
      )}

      {/* Foreground content + subtle navigation dots & prev/next controls */}
      <div
        className={cx(
          'relative z-[5] flex h-full flex-col',
          compact ? 'justify-between' : 'justify-end',
          compact ? 'p-3' : 'p-6 sm:p-8 xl:p-11',
        )}
      >
        {currentSlide && <SlideCopy key={currentSlide.id || index} slide={currentSlide} compact={compact} tr={tr} />}

        {slides.length > 1 && (
          <div
            className={cx(
              'relative flex items-center justify-between gap-3',
              compact ? '' : 'mt-6 border-t border-white/15 pt-4',
            )}
          >
            {compact ? (
              <span className="sr-only">{tr(currentSlide?.caption || '')}</span>
            ) : (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="tabular-nums text-xs font-semibold tracking-wider text-white/85">
                  {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                </span>
                <span aria-hidden="true" className="h-3 w-px bg-white/25" />
                <span className="truncate text-xs font-medium text-white/75">
                  {tr(currentSlide?.caption || '')}
                </span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <div
                role="tablist"
                aria-label={tr('Chọn ảnh nền')}
                className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur-md ring-1 ring-white/15"
              >
                {slides.map((slide, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={slide.id || slide.photo || i}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={trf('Ảnh {0}: {1}', { 0: i + 1, 1: tr(slide.caption) })}
                      onClick={() => goTo(i)}
                      className={cx(
                        'rp-focus h-1.5 rounded-full transition-all duration-300',
                        active ? 'w-5 bg-[#F7B6C8]' : 'w-1.5 bg-white/45 hover:bg-white/80',
                      )}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={tr('Ảnh banner trước')}
                  onClick={() => stepBy(-1)}
                  className={cx(
                    'rp-focus inline-flex items-center justify-center rounded-full border border-white/25 bg-black/25 text-white/90 backdrop-blur-md transition hover:bg-white/20 hover:text-white',
                    compact ? 'h-7 w-7' : 'h-8 w-8',
                  )}
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={tr('Ảnh banner tiếp theo')}
                  onClick={() => stepBy(1)}
                  className={cx(
                    'rp-focus inline-flex items-center justify-center rounded-full border border-white/25 bg-black/25 text-white/90 backdrop-blur-md transition hover:bg-white/20 hover:text-white',
                    compact ? 'h-7 w-7' : 'h-8 w-8',
                  )}
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
