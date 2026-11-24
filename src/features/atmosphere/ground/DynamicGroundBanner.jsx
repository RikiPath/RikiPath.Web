import { useEffect, useMemo, useRef } from 'react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { useSharedAtmosphere } from '../atmosphereContext.js';
import GroundSceneRenderer from './GroundSceneRenderer.jsx';
import { GROUND_LAYOUT_LABEL, resolveGroundScene } from './groundScene.js';
import './ground.css';

/** Few CSS-driven particles (transform/opacity only), synced with the header's weather and season. */
function GroundParticles({ particles }) {
  if (!particles) return null;
  return (
    <div className="rp-ground-particles" data-kind={particles.kind} aria-hidden="true">
      {Array.from({ length: particles.count }, (_, i) => (
        <span key={i} style={{ '--i': i, left: `${(i * 37 + 11) % 100}%`, animationDelay: `${-((i * 1.37) % 9).toFixed(2)}s` }} />
      ))}
    </div>
  );
}

/**
 * Dynamic Ground Banner — the ground half of the shell's sky. Reads the SAME atmosphere object as the Dynamic Sky
 * header (via AtmosphereContext), resolves a vector Japanese landscape for it, and renders: scene layers, weather /
 * seasonal motion, a readability scrim and the caller's content. `children(ground)` receives the resolved scene
 * (e.g. `ground.tone` for text colours).
 */
export default function DynamicGroundBanner({ learning, className, children, labelledBy, aside = null }) {
  const { tr } = useLocale();
  const atmosphere = useSharedAtmosphere();
  const ground = useMemo(
    () => resolveGroundScene(atmosphere, learning),
    // The resolver reads only the scene + motion preferences; atmosphere's identity changes on every shell render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atmosphere?.scene, atmosphere?.prefs?.mode, atmosphere?.effectiveIntensity, atmosphere?.reducedMotion, atmosphere?.lowPower, learning?.completedLessons, learning?.completionPct],
  );
  const ref = useRef(null);

  // Pause every loop while the banner is off-screen (no work for an unseen scene).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.visible = entry.isIntersecting ? 'true' : 'false';
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby={labelledBy}
      data-ground-layout={ground.layout}
      data-ground-tone={ground.tone}
      data-ground-motion={ground.motion ? 'on' : 'off'}
      data-ground-foliage={ground.foliageKey}
      className={cx('rp-ground relative isolate overflow-hidden rounded-rp-card-lg border border-rp-line shadow-rp-card', className)}
    >
      <div className="rp-ground-scene absolute inset-0 -z-10" aria-hidden="false">
        <GroundSceneRenderer ground={ground} title={tr(GROUND_LAYOUT_LABEL[ground.layout])} />
        <GroundParticles particles={ground.particles} />
      </div>
      <div aria-hidden="true" className="rp-ground-scrim absolute inset-0 -z-10" data-tone={ground.tone} />
      {children(ground)}
      {aside}
    </section>
  );
}
