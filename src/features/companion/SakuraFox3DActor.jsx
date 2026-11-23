import { Component, useEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui';
import {
  canUseWebGL,
  getRegisteredFox3DAdapter,
  renderRegisteredFox3D,
  resolveFoxPoseConfig,
} from './fox3dContract.js';

class Fox3DErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden));
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  return visible;
}

function Soft3DSpriteActor({ state = 'idle', reaction = 'none', size = 64, interactive = true, paused = false, className }) {
  const rootRef = useRef(null);
  const frameRef = useRef(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, lightX: 50, lightY: 32 });
  const visible = usePageVisible();

  const pose = resolveFoxPoseConfig(state);
  const effectivePaused = paused || !visible;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function handlePointerMove(event) {
    if (!interactive || reducedMotion || effectivePaused || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const clampedX = Math.max(-1, Math.min(1, nx));
    const clampedY = Math.max(-1, Math.min(1, ny));

    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      setTilt({
        rx: Number((-clampedY * 7).toFixed(2)),
        ry: Number((clampedX * 8).toFixed(2)),
        lightX: Math.round(50 + clampedX * 26),
        lightY: Math.round(32 + clampedY * 22),
      });
    });
  }

  function handlePointerLeave() {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    setTilt({ rx: 0, ry: 0, lightX: 50, lightY: 32 });
  }

  const pxSize = Math.max(32, Number(size) || 64);
  const stageScaleStyle = {
    width: `${pxSize}px`,
    height: `${pxSize}px`,
    perspective: '720px',
    '--riki-3d-rx': `${tilt.rx}deg`,
    '--riki-3d-ry': `${tilt.ry}deg`,
    '--riki-3d-aura': pose.aura,
  };

  return (
    <span
      ref={rootRef}
      data-fox-renderer="webp-3d-sprite"
      data-state={pose.state}
      data-reaction={reaction}
      data-paused={effectivePaused ? 'true' : 'false'}
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={stageScaleStyle}
      className={cx(
        'riki-3d-actor relative inline-flex shrink-0 items-center justify-center select-none',
        className,
      )}
    >
      {/* Ambient volumetric halo + ground contact shadow */}
      <span
        className="riki-3d-aura pointer-events-none absolute inset-[8%] rounded-full transition-[background] duration-300"
        style={{
          background: `radial-gradient(circle at ${tilt.lightX}% ${tilt.lightY}%, ${pose.aura} 0%, rgba(255,255,255,0) 74%)`,
        }}
      />

      {/* 3D Perspective Tilt Card Stage */}
      <span
        className={cx(
          'riki-3d-stage relative flex h-full w-full items-center justify-center',
          pose.motionClass,
          reaction === 'jumping' && 'riki-3d-reaction-jump',
          reaction === 'waving' && 'riki-3d-reaction-wave',
        )}
      >
        <img
          src={pose.src}
          alt=""
          draggable={false}
          width={pxSize}
          height={pxSize}
          className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(125,40,65,0.22)] transition-[filter,transform] duration-200"
        />
      </span>

      {/* Crisp state cue badges (non-intrusive overlay) */}
      {pose.cue === 'sleepy' || pose.cue === 'zzz' ? (
        <span className="riki-prop-float pointer-events-none absolute -right-0.5 -top-0.5 text-[10px] font-extrabold text-rp-brand-strong">
          Zzz
        </span>
      ) : null}

      {pose.cue === '?' ? (
        <span className="riki-prop-float pointer-events-none absolute -right-0.5 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-rp-brand-strong shadow-xs ring-1 ring-rp-brand-border">
          ?
        </span>
      ) : null}

      {pose.cue === 'dots' ? (
        <span className="riki-prop-float pointer-events-none absolute -right-0.5 top-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-rp-brand-strong shadow-xs ring-1 ring-rp-brand-border">
          •••
        </span>
      ) : null}

      {pose.cue === 'wave' ? (
        <span className="riki-sound-ring pointer-events-none absolute inset-[6%] rounded-full border border-rp-teal-400/55" />
      ) : null}

      {pose.cue === 'sparkles' && pxSize >= 56 ? (
        <span className="riki-prop-float pointer-events-none absolute -right-0.5 -top-0.5 text-[11px] leading-none text-amber-500">
          ✦
        </span>
      ) : null}
    </span>
  );
}

/**
 * Unified Chibi 3D Sakura Fox Actor (`SakuraFox3DActor`).
 * Renders live WebGL `.glb` via `registerFox3DAdapter()` when configured + WebGL-capable,
 * and falls back honestly & crisply to the 14-state Soft-3D `.webp` Chibi Fox rig (`riki-*.webp`).
 */
export default function SakuraFox3DActor(props) {
  const externalNode = getRegisteredFox3DAdapter() && canUseWebGL()
    ? renderRegisteredFox3D(props)
    : null;

  const fallbackNode = <Soft3DSpriteActor {...props} />;

  if (externalNode) {
    return (
      <Fox3DErrorBoundary fallback={fallbackNode}>
        {externalNode}
      </Fox3DErrorBoundary>
    );
  }

  return fallbackNode;
}
