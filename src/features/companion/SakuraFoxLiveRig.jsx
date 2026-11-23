import { useEffect, useId, useRef, useState } from 'react';
import { cx } from '@/components/ui/cx.js';
import { prefersReducedMotion } from '@/components/ui/celebrationLogic.js';
import { COMPANION_REACTIONS, COMPANION_STATES } from './companionMachine.js';

/**
 * Interactive Multi-Part Rigged Sakura Kitsune Fox (`SakuraFoxLiveRig`).
 *
 * Asset note: The 8 raster sprites (`riki-*.webp`) are single-frame editorial portraits
 * retained for static cards/hero banners. This articulated layered vector rig preserves the exact
 * RikiPath Sakura Fox character, pastel kimono/hakama palette, hairclip tassel, and Soft-3D shading
 * while enabling real independent bone-level GPU motion (`breathing`, `blinking`, `tail wagging`,
 * `ear twitch`, `head tilt`, `waving`, `jumping`, `celebrating`, `thinking`, `listening`, `sleepy`)
 * and zero-rerender pupil tracking via `requestAnimationFrame` + CSS custom properties.
 */
export function SakuraFoxLiveRig({
  state = COMPANION_STATES.IDLE,
  reaction = COMPANION_REACTIONS.NONE,
  size = 84,
  interactive = true,
  className,
  alt = '',
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rootRef = useRef(null);
  const rafRef = useRef(0);
  const pendingCoordsRef = useRef(null);
  const [paused, setPaused] = useState(false);

  // Pause continuous animations off-screen or when tab is hidden (INTERACTION_AND_MOTION Rule 3).
  useEffect(() => {
    if (typeof document === 'undefined' && typeof window === 'undefined') return undefined;
    let hidden = typeof document !== 'undefined' ? document.hidden : false;
    let offscreen = false;

    const syncPaused = () => setPaused(hidden || offscreen);

    const onVisibility = () => {
      hidden = Boolean(document.hidden);
      syncPaused();
    };
    document?.addEventListener('visibilitychange', onVisibility);

    let observer;
    if (typeof IntersectionObserver !== 'undefined' && rootRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          offscreen = entries.some((entry) => !entry.isIntersecting);
          syncPaused();
        },
        { threshold: 0.05 },
      );
      observer.observe(rootRef.current);
    }

    return () => {
      document?.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  // Zero-rerender pointer tracking writing CSS vars inside requestAnimationFrame.
  useEffect(() => {
    if (!interactive || typeof window === 'undefined' || prefersReducedMotion()) return undefined;
    const node = rootRef.current;
    if (!node) return undefined;

    const flush = () => {
      rafRef.current = 0;
      const coords = pendingCoordsRef.current;
      if (!coords || !rootRef.current) return;
      rootRef.current.style.setProperty('--riki-look-x', `${coords.x.toFixed(2)}px`);
      rootRef.current.style.setProperty('--riki-look-y', `${coords.y.toFixed(2)}px`);
    };

    const onPointerMove = (event) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const cxPos = rect.left + rect.width / 2;
      const cyPos = rect.top + rect.height * 0.42;
      const dx = Math.max(-1, Math.min(1, (event.clientX - cxPos) / 140));
      const dy = Math.max(-1, Math.min(1, (event.clientY - cyPos) / 140));
      pendingCoordsRef.current = { x: dx * 2.2, y: dy * 1.6 };
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flush);
      }
    };

    const onPointerLeave = () => {
      pendingCoordsRef.current = { x: 0, y: 0 };
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flush);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    node.addEventListener('pointerleave', onPointerLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerleave', onPointerLeave);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [interactive]);

  const isCelebrating = state === COMPANION_STATES.CELEBRATING;
  const isSleepy = state === COMPANION_STATES.SLEEPY;
  const isThinking = state === COMPANION_STATES.THINKING;
  const isListening = state === COMPANION_STATES.LISTENING;
  const isSpeaking = state === COMPANION_STATES.SPEAKING;
  const isHappyHover = state === COMPANION_STATES.HOVER || reaction === COMPANION_REACTIONS.WAVING;

  const numericSize = Number(size) || 84;
  const gFur = `${uid}-fur`;
  const gFurDark = `${uid}-furd`;
  const gCream = `${uid}-cream`;
  const gKimono = `${uid}-kimono`;
  const gHakama = `${uid}-hakama`;
  const gSakura = `${uid}-sakura`;
  const gScarf = `${uid}-scarf`;
  const gEarInner = `${uid}-eari`;

  return (
    <span
      ref={rootRef}
      data-state={state}
      data-reaction={reaction}
      data-paused={paused ? 'true' : undefined}
      style={{ width: numericSize, height: numericSize }}
      className={cx('riki-fox-rig relative inline-flex shrink-0 select-none items-center justify-center', className)}
    >
      <svg
        viewBox="0 0 180 180"
        fill="none"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className="h-full w-full overflow-visible drop-shadow-[0_6px_12px_rgba(140,42,74,0.16)]"
      >
        <defs>
          <radialGradient id={gFur} cx="42%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFA95C" />
            <stop offset="65%" stopColor="#EC823D" />
            <stop offset="100%" stopColor="#CE5E24" />
          </radialGradient>
          <linearGradient id={gFurDark} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A64419" />
            <stop offset="100%" stopColor="#DC6D2E" />
          </linearGradient>
          <radialGradient id={gCream} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFDFB" />
            <stop offset="72%" stopColor="#FFF1E4" />
            <stop offset="100%" stopColor="#F5DEC9" />
          </radialGradient>
          <linearGradient id={gKimono} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF6F0" />
            <stop offset="100%" stopColor="#F8E2D8" />
          </linearGradient>
          <linearGradient id={gHakama} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E46B8B" />
            <stop offset="100%" stopColor="#BF4467" />
          </linearGradient>
          <linearGradient id={gScarf} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F392AA" />
            <stop offset="50%" stopColor="#E26D8C" />
            <stop offset="100%" stopColor="#CE5577" />
          </linearGradient>
          <linearGradient id={gSakura} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD2DF" />
            <stop offset="100%" stopColor="#F07B9D" />
          </linearGradient>
          <linearGradient id={gEarInner} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FAD2DE" />
            <stop offset="100%" stopColor="#FCEEE8" />
          </linearGradient>
        </defs>

        {/* Ground contact cushion shadow */}
        <ellipse cx="90" cy="166" rx="44" ry="7" fill="rgba(160, 74, 100, 0.14)" />

        <g className="riki-rig-jump-stage">
          {/* Independent Bushy Tail */}
          <g className="riki-rig-tail">
            <path
              d="M66 138 C32 146 14 114 25 84 C32 68 48 64 46 80 C55 83 68 106 72 126 Z"
              fill={`url(#${gFur})`}
              stroke="#9C4D2A"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Cream zig-zag tail tip */}
            <path
              d="M25 84 C20 94 18 106 23 116 L32 108 L38 114 L44 102 L48 90 C49 77 48 68 46 79 C38 72 29 75 25 84 Z"
              fill={`url(#${gCream})`}
            />
          </g>

          {/* Torso & Kimono/Hakama Breathing Group */}
          <g className="riki-rig-torso">
            {/* Feet / Socks / Wooden Geta */}
            <g>
              <rect x="70" y="146" width="13" height="11" rx="4" fill="#FFF7F2" stroke="#C8ABA0" strokeWidth="0.9" />
              <rect x="68" y="156" width="18" height="6" rx="2.5" fill="#8C5845" />
              <path d="M71 156 Q77 151 83 156" stroke="#D95E7E" strokeWidth="2.4" strokeLinecap="round" fill="none" />

              <rect x="97" y="146" width="13" height="11" rx="4" fill="#FFF7F2" stroke="#C8ABA0" strokeWidth="0.9" />
              <rect x="95" y="156" width="18" height="6" rx="2.5" fill="#8C5845" />
              <path d="M98 156 Q104 151 110 156" stroke="#D95E7E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </g>

            {/* Rose Hakama Pleated Skirt */}
            <path
              d="M65 117 L115 117 L122 149 Q90 154 58 149 Z"
              fill={`url(#${gHakama})`}
              stroke="#993452"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path d="M76 122 L73 149 M90 123 L90 150 M104 122 L107 149" stroke="#993452" strokeWidth="1" strokeOpacity="0.32" />

            {/* Left Arm (screen-left = character right paw) */}
            <g className="riki-rig-arm-l">
              <path
                d="M68 97 C55 103 48 117 55 127 C61 131 69 125 71 115 Z"
                fill={`url(#${gKimono})`}
                stroke="#B67A68"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <circle cx="57" cy="126" r="6.5" fill={`url(#${gFur})`} stroke="#9C4D2A" strokeWidth="1" />
              <circle cx="57" cy="126.5" r="2.2" fill="#F69BAE" opacity="0.85" />
            </g>

            {/* Right Arm (screen-right = character left paw, waves/cheers/listens) */}
            <g className="riki-rig-arm-r">
              <path
                d="M112 97 C125 103 132 117 125 127 C119 131 111 125 109 115 Z"
                fill={`url(#${gKimono})`}
                stroke="#B67A68"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <circle cx="123" cy="126" r="6.5" fill={`url(#${gFur})`} stroke="#9C4D2A" strokeWidth="1" />
              <circle cx="123" cy="126.5" r="2.2" fill="#F69BAE" opacity="0.85" />
            </g>

            {/* Cream Sakura Kimono Top */}
            <path
              d="M66 92 Q90 88 114 92 L117 120 Q90 124 63 120 Z"
              fill={`url(#${gKimono})`}
              stroke="#B67A68"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Kimono collar overlap */}
            <path d="M77 92 L92 114 L103 92" fill="none" stroke="#BA5671" strokeWidth="2.2" strokeLinecap="round" />
            {/* Tiny pink sakura flower prints on kimono */}
            <g fill="#EE87A3" opacity="0.85">
              <circle cx="75" cy="108" r="2.2" />
              <circle cx="78" cy="106" r="1.4" />
              <circle cx="72" cy="106" r="1.4" />
              <circle cx="105" cy="110" r="2.3" />
              <circle cx="108" cy="108" r="1.4" />
              <circle cx="102" cy="108" r="1.4" />
            </g>

            {/* Obi Sash & Bow Ribbon */}
            <rect x="64" y="114" width="52" height="7" rx="3.5" fill={`url(#${gScarf})`} stroke="#A83A5A" strokeWidth="0.9" />
            <g transform="translate(90 118)">
              <path d="M0 0 L-12 -5 Q-14 0 -10 5 Z" fill="#F184A1" stroke="#A83A5A" strokeWidth="0.9" />
              <path d="M0 0 L12 -5 Q14 0 10 5 Z" fill="#F184A1" stroke="#A83A5A" strokeWidth="0.9" />
              <path d="M-2 2 L-7 13 L-2 11 Z M2 2 L7 13 L2 11 Z" fill="#DA5A7E" />
              <circle cx="0" cy="0" r="3.2" fill="#E46B8B" stroke="#A83A5A" strokeWidth="0.9" />
            </g>

            {/* Pink Neck Scarf */}
            <path
              d="M66 86 Q90 98 114 86 Q116 95 109 98 Q90 106 71 98 Q64 95 66 86 Z"
              fill={`url(#${gScarf})`}
              stroke="#A83A5A"
              strokeWidth="1.1"
            />
          </g>

          {/* Articulated Head Group */}
          <g className="riki-rig-head">
            {/* Left Fox Ear */}
            <g className="riki-rig-ear-l">
              <path
                d="M54 50 C43 27 45 14 55 12 C66 11 75 23 78 39 Z"
                fill={`url(#${gFur})`}
                stroke="#9C4D2A"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Dark fox ear tip */}
              <path d="M47 22 C49 14 54 12 60 14 C57 18 52 21 47 22 Z" fill={`url(#${gFurDark})`} />
              {/* Inner ear */}
              <path d="M56 44 C51 31 52 22 57 21 C63 21 69 29 72 39 Z" fill={`url(#${gEarInner})`} />
            </g>

            {/* Right Fox Ear + Signature Sakura Hairclip & Braided Tassel */}
            <g className="riki-rig-ear-r">
              <path
                d="M126 50 C137 27 135 14 125 12 C114 11 105 23 102 39 Z"
                fill={`url(#${gFur})`}
                stroke="#9C4D2A"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path d="M133 22 C131 14 126 12 120 14 C123 18 128 21 133 22 Z" fill={`url(#${gFurDark})`} />
              <path d="M124 44 C129 31 128 22 123 21 C117 21 111 29 108 39 Z" fill={`url(#${gEarInner})`} />

              {/* Dangling braided cord & tassel */}
              <g className="riki-rig-tassel" transform="translate(119 42)">
                <path d="M0 0 Q4 8 1 15 Q-1 20 2 24" stroke="#E26486" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                <path d="M2 22 L-2 33 L6 33 Z" fill="#EB7292" stroke="#AD3E5D" strokeWidth="0.7" />
              </g>

              {/* 5-Petal Pink Sakura Blossom Hairclip */}
              <g transform="translate(115 36) rotate(12)">
                {[0, 72, 144, 216, 288].map((deg) => (
                  <path
                    key={deg}
                    transform={`rotate(${deg})`}
                    d="M0 0 C-5 -6 -4 -12 0 -13 C4 -12 5 -6 0 0 Z"
                    fill={`url(#${gSakura})`}
                    stroke="#D66284"
                    strokeWidth="0.65"
                  />
                ))}
                <circle cx="0" cy="0" r="2.6" fill="#FCE08B" stroke="#DF9F2B" strokeWidth="0.6" />
              </g>
            </g>

            {/* Plump Fox Head Base */}
            <path
              d="M52 66 C48 45 64 31 90 31 C116 31 132 45 128 66 C133 74 128 86 116 90 C106 94 98 94 90 94 C82 94 74 94 64 90 C52 86 47 74 52 66 Z"
              fill={`url(#${gFur})`}
              stroke="#9C4D2A"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Cream Fox Cheeks & Muzzle Curve */}
            <path
              d="M52 72 C61 68 74 71 84 65 C88 63 92 63 96 65 C106 71 119 68 128 72 C131 80 124 89 112 92 C102 94 96 95 90 95 C84 95 78 94 68 92 C56 89 49 80 52 72 Z"
              fill={`url(#${gCream})`}
            />

            {/* Cream Eyebrow Spots (iconic Kitsune detail) */}
            <ellipse cx="75" cy="49" rx="4.2" ry="2.4" transform="rotate(-12 75 49)" fill="#FFF4EA" />
            <ellipse cx="105" cy="49" rx="4.2" ry="2.4" transform="rotate(12 105 49)" fill="#FFF4EA" />

            {/* Soft Rosy Cheek Blushes */}
            <ellipse cx="63" cy="79" rx="6.2" ry="3.4" fill="#F794AD" opacity="0.58" />
            <ellipse cx="117" cy="79" rx="6.2" ry="3.4" fill="#F794AD" opacity="0.58" />

            {/* Nose & Expressive Mouth */}
            <ellipse cx="90" cy="74.5" rx="3" ry="2" fill="#4A281D" />
            {isCelebrating || isHappyHover || isSpeaking ? (
              <path d="M84 78.5 Q90 86 96 78.5 Z" fill="#E3677E" stroke="#5C2D22" strokeWidth="1.1" strokeLinejoin="round" />
            ) : isThinking ? (
              <circle cx="91.5" cy="80.5" r="2" fill="#D56279" />
            ) : (
              <path d="M84.5 78.8 Q87.5 81.5 90 79 Q92.5 81.5 95.5 78.8" stroke="#5C2D22" strokeWidth="1.35" strokeLinecap="round" fill="none" />
            )}

            {/* Eyes & Eyelids by Expression */}
            {isCelebrating ? (
              <g>
                <path d="M66 66 Q73 59 80 66" stroke="#3F2117" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <path d="M100 66 Q107 59 114 66" stroke="#3F2117" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              </g>
            ) : isSleepy ? (
              <g>
                <path d="M66 65 Q73 70 80 65" stroke="#4D2B20" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                <path d="M100 65 Q107 70 114 65" stroke="#4D2B20" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                {/* Open Chibi Glossy Eyes + Cursor-tracked Pupils */}
                <ellipse cx="73" cy="64" rx="7.2" ry="7.8" fill="#3B2118" />
                <ellipse cx="107" cy="64" rx="7.2" ry="7.8" fill="#3B2118" />

                <g className="riki-rig-pupils">
                  <circle cx="73" cy="64.5" r="4.8" fill="#7A4428" />
                  <circle cx="107" cy="64.5" r="4.8" fill="#7A4428" />
                  <circle cx="71.2" cy="61.6" r="2.3" fill="#FFFFFF" />
                  <circle cx="105.2" cy="61.6" r="2.3" fill="#FFFFFF" />
                  <circle cx="75.2" cy="66.5" r="1.1" fill="#FFFFFF" opacity="0.88" />
                  <circle cx="109.2" cy="66.5" r="1.1" fill="#FFFFFF" opacity="0.88" />
                </g>

                {/* Real blinking upper eyelids */}
                <g className="riki-rig-eyelids">
                  <ellipse cx="73" cy="64" rx="7.6" ry="8.2" fill="#EC823D" />
                  <path d="M66 65 Q73 68.5 80 65" stroke="#4A281D" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <ellipse cx="107" cy="64" rx="7.6" ry="8.2" fill="#EC823D" />
                  <path d="M100 65 Q107 68.5 114 65" stroke="#4A281D" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                </g>
              </g>
            )}
          </g>
        </g>

        {/* Contextual Expressive Props */}
        {isCelebrating && (
          <g aria-hidden="true" className="riki-prop-float">
            <path d="M26 42 C31 38 35 42 32 47 C28 50 24 46 26 42 Z" fill="#F7A8BD" />
            <path d="M150 38 C155 34 159 38 156 43 C152 46 148 42 150 38 Z" fill="#FAD4DE" />
            <path d="M40 20 L42 25 L47 27 L42 29 L40 34 L38 29 L33 27 L38 25 Z" fill="#F4B740" />
            <path d="M144 58 L145.5 62 L149.5 63.5 L145.5 65 L144 69 L142.5 65 L138.5 63.5 L142.5 62 Z" fill="#E05A7A" />
          </g>
        )}

        {isThinking && (
          <g aria-hidden="true" className="riki-prop-float">
            <circle cx="144" cy="40" r="3" fill="#FAD4DE" stroke="#E05A7A" strokeWidth="0.9" />
            <circle cx="151" cy="29" r="4.2" fill="#FAD4DE" stroke="#E05A7A" strokeWidth="0.9" />
            <text
              x="148"
              y="22"
              fill="#CC4B6B"
              fontSize="15"
              fontWeight="800"
              fontFamily="system-ui, sans-serif"
            >
              ?
            </text>
          </g>
        )}

        {isSleepy && (
          <g aria-hidden="true" className="riki-prop-float" fill="#9E6278" fontFamily="system-ui, sans-serif" fontWeight="700">
            <text x="135" y="45" fontSize="11" opacity="0.72">z</text>
            <text x="145" y="34" fontSize="14" opacity="0.86">Z</text>
          </g>
        )}

        {isListening && (
          <g aria-hidden="true">
            <circle cx="139" cy="36" r="7" stroke="#E05A7A" strokeWidth="1.6" fill="none" className="riki-sound-ring" />
            <circle cx="139" cy="36" r="12" stroke="#F7B6C8" strokeWidth="1.3" fill="none" className="riki-sound-ring" style={{ animationDelay: '450ms' }} />
          </g>
        )}
      </svg>
    </span>
  );
}

export default SakuraFoxLiveRig;
