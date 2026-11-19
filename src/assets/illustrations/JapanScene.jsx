import { useId } from 'react';
import { SCENE_PALETTES } from './scenes.js';

/*
 * Wide Japanese landscape for the Web (hero, dashboard welcome, auth panel).
 * Original vector artwork: layered sky, Mt Fuji, lake, torii, pagoda and a
 * Sakura branch. Text is never baked in — overlay real HTML text instead.
 *
 * time: 'dawn' | 'day' | 'dusk' | 'night'   (see sceneForHour)
 * variant: 'banner' (wide, 1200×320) | 'panel' (portrait-friendly, 800×900)
 */

function Blossom({ x, y, r = 9, fill = '#F8A8BB', center = '#F2B84B' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.42} ry={r * 0.6} fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.2} fill={center} />
    </g>
  );
}

const PETALS = [
  [120, 60, 0], [260, 140, 1], [420, 40, 2], [610, 110, 3], [780, 70, 1], [930, 150, 2], [1060, 50, 0], [520, 190, 3], [340, 230, 2], [880, 240, 0],
];

export default function JapanScene({ time = 'day', variant = 'banner', className, petals = true, title }) {
  const p = SCENE_PALETTES[time] || SCENE_PALETTES.day;
  const id = useId().replace(/:/g, '');
  const wide = variant === 'banner';
  const W = wide ? 1200 : 800;
  const H = wide ? 320 : 900;
  // Horizon sits low on banners, mid on panels.
  const hz = wide ? 232 : 620;
  const fx = wide ? 760 : 430;
  const fujiW = wide ? 520 : 640;
  const fujiH = wide ? 170 : 380;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={wide ? 'xMidYMax slice' : 'xMidYMid slice'}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[2]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[0]} />
        </linearGradient>
        <linearGradient id={`${id}-lake`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.lake} />
          <stop offset="1" stopColor={p.sky[1]} stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.sun} />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-snow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1ECF6" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${id}-sky)`} />

      {/* sun / moon */}
      <circle cx={wide ? 300 : 600} cy={wide ? 92 : 210} r={wide ? 120 : 200} fill={`url(#${id}-sun)`} />
      <circle cx={wide ? 300 : 600} cy={wide ? 92 : 210} r={wide ? 34 : 56} fill={p.sun} opacity={time === 'night' ? 0.95 : 0.9} />
      {time === 'night' && (
        <g fill="#FFFFFF">
          {[[90, 40], [180, 110], [460, 60], [560, 26], [980, 44], [1110, 120], [700, 90]].map(([x, y], i) => (
            <circle key={i} cx={wide ? x : (x * 0.66)} cy={wide ? y : y * 2} r={i % 2 ? 1.4 : 2} opacity="0.85" />
          ))}
        </g>
      )}

      {/* clouds */}
      <g fill="#FFFFFF" opacity={time === 'night' ? 0.12 : 0.65}>
        <path d={`M${wide ? 60 : 40} ${wide ? 120 : 330} q30 -26 64 -8 q22 -22 54 -4 q30 -4 34 22 z`} />
        <path d={`M${wide ? 960 : 520} ${wide ? 84 : 120} q26 -22 56 -6 q20 -18 46 -2 q26 -2 30 18 z`} />
      </g>

      {/* far hills */}
      <path
        d={`M0 ${hz - 30} C ${W * 0.12} ${hz - 64}, ${W * 0.26} ${hz - 40}, ${W * 0.36} ${hz - 52} S ${W * 0.62} ${hz - 30}, ${W * 0.74} ${hz - 46} S ${W * 0.92} ${hz - 36}, ${W} ${hz - 54} V ${hz} H0 Z`}
        fill={p.hillFar}
        opacity="0.8"
      />

      {/* Mt Fuji */}
      <g>
        <path d={`M${fx - fujiW / 2} ${hz} L${fx - 46} ${hz - fujiH} Q${fx} ${hz - fujiH - 8} ${fx + 46} ${hz - fujiH} L${fx + fujiW / 2} ${hz} Z`} fill={p.fuji} />
        <path d={`M${fx} ${hz - fujiH - 6} L${fx + 46} ${hz - fujiH} L${fx + fujiW / 2} ${hz} L${fx + 40} ${hz} Z`} fill={p.fujiShade} opacity="0.55" />
        <path
          d={`M${fx - 46} ${hz - fujiH} Q${fx} ${hz - fujiH - 8} ${fx + 46} ${hz - fujiH} L${fx + 92} ${hz - fujiH * 0.68} l-20 10 -18 -14 -16 16 -18 -18 -20 14 -14 -12 -22 16 -18 -14 -20 12 Z`}
          fill={`url(#${id}-snow)`}
        />
      </g>

      {/* near hills with pagoda */}
      <path
        d={`M0 ${hz - 6} C ${W * 0.1} ${hz - 30}, ${W * 0.2} ${hz - 8}, ${W * 0.3} ${hz - 20} S ${W * 0.5} ${hz}, ${W * 0.6} ${hz - 8} V ${hz} H0 Z`}
        fill={p.hillNear}
      />
      <g transform={`translate(${wide ? 230 : 120} ${hz - 22})`} fill={p.hillNear} stroke={p.fujiShade} strokeWidth="0">
        <rect x="-5" y="-56" width="10" height="56" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${-22 + i * 4} ${-14 - i * 16} h${44 - i * 8} l-6 -6 h${-32 + i * 8} z`} fill={p.fujiShade} />
        ))}
        <path d="M0 -70 v-12" stroke={p.fujiShade} strokeWidth="2" />
      </g>

      {/* lake */}
      <rect x="0" y={hz} width={W} height={H - hz} fill={`url(#${id}-lake)`} />
      <path d={`M${fx - fujiW / 3} ${hz} L${fx} ${hz + fujiH * 0.38} L${fx + fujiW / 3} ${hz} Z`} fill={p.fuji} opacity="0.18" />
      <g stroke="#FFFFFF" strokeLinecap="round" opacity="0.55">
        <path d={`M${W * 0.18} ${hz + 18} h70`} strokeWidth="2" />
        <path d={`M${W * 0.52} ${hz + 34} h110`} strokeWidth="2" />
        <path d={`M${W * 0.78} ${hz + 22} h60`} strokeWidth="2" />
      </g>

      {/* torii in the water */}
      <g transform={`translate(${wide ? 1010 : 640} ${hz + (wide ? 18 : 40)}) scale(${wide ? 0.62 : 1})`}>
        <rect x="-44" y="-96" width="9" height="104" fill="#D6455F" />
        <rect x="35" y="-96" width="9" height="104" fill="#D6455F" />
        <path d="M-66 -104 q66 -14 132 0 l-4 10 q-62 -10 -124 0 z" fill="#C23651" />
        <rect x="-56" y="-84" width="112" height="8" fill="#D6455F" />
        <rect x="-5" y="-94" width="10" height="12" fill="#C23651" />
        <rect x="-44" y="10" width="9" height="40" fill="#D6455F" opacity="0.18" />
        <rect x="35" y="10" width="9" height="40" fill="#D6455F" opacity="0.18" />
      </g>

      {/* sakura branch framing the top-left */}
      <g>
        <path d={`M-10 ${wide ? 20 : 40} C 80 ${wide ? 40 : 90}, 150 ${wide ? 30 : 70}, 230 ${wide ? 70 : 150} M120 ${wide ? 36 : 82} C 150 ${wide ? 70 : 140}, 160 ${wide ? 90 : 190}, 200 ${wide ? 112 : 250}`} stroke="#6E4A55" strokeWidth="6" strokeLinecap="round" fill="none" />
        {[[40, 30], [96, 46], [150, 38], [206, 62], [236, 84], [140, 74], [170, 100], [196, 116], [70, 52]].map(([x, y], i) => (
          <Blossom key={i} x={x} y={wide ? y : y * 2} r={i % 3 === 0 ? 13 : 10} fill={i % 2 ? '#FFC7D5' : p.petal} />
        ))}
      </g>

      {/* falling petals */}
      {petals && (
        <g className="rp-scene-petals" fill={p.petal}>
          {PETALS.map(([x, y, d], i) => (
            <ellipse
              key={i}
              cx={wide ? x : x * 0.66}
              cy={wide ? y : y * 3}
              rx="4.5"
              ry="2.6"
              transform={`rotate(${(i * 37) % 180} ${wide ? x : x * 0.66} ${wide ? y : y * 3})`}
              style={{ animationDelay: `${d * 1.4}s` }}
              opacity="0.85"
            />
          ))}
        </g>
      )}
    </svg>
  );
}
