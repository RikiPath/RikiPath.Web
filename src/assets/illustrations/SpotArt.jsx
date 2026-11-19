/*
 * Small spot illustrations (empty states, results, system states) and JLPT
 * level thumbnails. Original vector art in the RikiPath Web art direction:
 * soft pastel, subtle Japanese motifs, no embedded copy text.
 */

const INK = '#2D282A';
const PINK = '#E05A7A';
const PINK_SOFT = '#FFE3EA';
const LINE = '#E5E0E2';

function Petal({ x, y, r = 0, s = 1, fill = '#F8A8BB' }) {
  return <ellipse cx={x} cy={y} rx={5 * s} ry={3 * s} fill={fill} transform={`rotate(${r} ${x} ${y})`} />;
}

const ART = {
  // Empty list / inbox: an open furoshiki-wrapped box with a petal
  empty: (
    <>
      <ellipse cx="80" cy="128" rx="54" ry="7" fill={INK} opacity="0.07" />
      <path d="M34 70 h92 v50 a6 6 0 0 1 -6 6 h-80 a6 6 0 0 1 -6 -6 z" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M34 70 l14 -22 h64 l14 22" fill="#FBF7F8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M58 70 v14 a6 6 0 0 0 6 6 h32 a6 6 0 0 0 6 -6 v-14" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" />
      <Petal x={118} y={32} r={-20} s={1.4} />
      <Petal x={46} y={40} r={30} />
      <Petal x={96} y={20} r={60} s={0.9} fill="#FFC7D5" />
    </>
  ),
  // No search results: magnifier over a kanji tile
  search: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="30" y="40" width="64" height="64" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <text x="62" y="84" textAnchor="middle" fontSize="34" fontFamily="Noto Serif JP, serif" fill="#C9BEC2">字</text>
      <circle cx="98" cy="70" r="24" fill="#FFF7F9" fillOpacity="0.85" stroke={INK} strokeWidth="3" />
      <path d="M115 88 l18 18" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M90 62 q8 -6 16 0" stroke={PINK} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  // Schedule empty: calendar page with a sakura stamp
  calendar: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="34" y="36" width="92" height="84" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M34 48 a12 12 0 0 1 12 -12 h68 a12 12 0 0 1 12 12 v12 h-92 z" fill={PINK} />
      <path d="M58 28 v16 M102 28 v16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2, 3].map((c) => [0, 1].map((r) => (
        <rect key={`${c}${r}`} x={46 + c * 18} y={72 + r * 20} width="12" height="10" rx="3" fill={LINE} />
      )))}
      <circle cx="108" cy="102" r="11" fill={PINK_SOFT} stroke={PINK} strokeWidth="2" />
      <path d="M103 102 l4 4 7 -8" stroke={PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Offline: paper lantern with a dimmed flame
  offline: (
    <>
      <ellipse cx="80" cy="130" rx="40" ry="6" fill={INK} opacity="0.07" />
      <path d="M80 16 v10" stroke={INK} strokeWidth="2.5" />
      <rect x="64" y="26" width="32" height="8" rx="3" fill={INK} />
      <path d="M58 34 q-12 40 0 80 h44 q12 -40 0 -80 z" fill="#FFF1E3" stroke={INK} strokeWidth="2.5" />
      <path d="M58 54 h44 M54 74 h52 M58 94 h44" stroke="#E8C9A8" strokeWidth="2" />
      <rect x="64" y="114" width="32" height="8" rx="3" fill={INK} />
      <path d="M44 60 l72 44" stroke="#C62828" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </>
  ),
  // Locked / forbidden: shoji door with a lock
  locked: (
    <>
      <ellipse cx="80" cy="130" rx="46" ry="6" fill={INK} opacity="0.07" />
      <rect x="36" y="24" width="88" height="100" rx="6" fill="#FFFBF7" stroke={INK} strokeWidth="2.5" />
      <path d="M80 24 v100 M36 57 h88 M36 90 h88 M58 24 v100 M102 24 v100" stroke="#E8DCCF" strokeWidth="2" />
      <rect x="64" y="70" width="32" height="26" rx="6" fill={PINK} stroke={INK} strokeWidth="2.5" />
      <path d="M70 70 v-8 a10 10 0 0 1 20 0 v8" stroke={INK} strokeWidth="2.5" fill="none" />
      <circle cx="80" cy="82" r="3" fill="#fff" />
    </>
  ),
  // Done / success: ribbon medal with a sakura
  done: (
    <>
      <ellipse cx="80" cy="132" rx="40" ry="6" fill={INK} opacity="0.07" />
      <path d="M62 20 l-12 44 18 -6 8 16 10 -42 z" fill="#F8A8BB" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M98 20 l12 44 -18 -6 -8 16 -10 -42 z" fill={PINK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="80" cy="88" r="36" fill="#F2B84B" stroke={INK} strokeWidth="2.5" />
      <circle cx="80" cy="88" r="27" fill="#FFE7AE" />
      <g transform="translate(80 88)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-10" rx="6.5" ry="9" fill={PINK} transform={`rotate(${a})`} />
        ))}
        <circle r="4.5" fill="#F2B84B" />
      </g>
    </>
  ),
  // Error: broken scroll
  error: (
    <>
      <ellipse cx="80" cy="128" rx="48" ry="7" fill={INK} opacity="0.07" />
      <path d="M36 36 h40 l-6 22 8 18 -8 22 4 20 h-38 z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M124 36 h-36 l-6 22 8 18 -8 22 4 20 h38 z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M46 54 h20 M46 70 h16 M98 54 h16 M100 88 h14" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="22" r="10" fill="#FDEDED" stroke="#C62828" strokeWidth="2" />
      <path d="M80 16 v7 M80 27 v.5" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
};

export function SpotArt({ name = 'empty', size = 140, className, title }) {
  return (
    <svg
      viewBox="0 0 160 140"
      width={size}
      height={(size * 140) / 160}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <circle cx="80" cy="72" r="62" fill="#FFF5F7" />
      {ART[name] || ART.empty}
    </svg>
  );
}

/* ---------------------------------------------------------------- JLPT thumbnails */

const LEVELS = {
  N5: { from: '#FFF1F4', to: '#FFD9E3', accent: '#E05A7A', motif: 'bud' },
  N4: { from: '#FFF6E8', to: '#FFE2BE', accent: '#B65A06', motif: 'kana' },
  N3: { from: '#EEF6F2', to: '#CFE8DB', accent: '#1E824C', motif: 'torii' },
  N2: { from: '#EEF2FA', to: '#D3DDF1', accent: '#4F628C', motif: 'fuji' },
  N1: { from: '#F4EFF7', to: '#E0D3EB', accent: '#74558A', motif: 'crane' },
};

function Motif({ motif, accent }) {
  switch (motif) {
    case 'bud':
      return (
        <g transform="translate(200 70)">
          <path d="M0 50 q-4 -26 0 -40" stroke="#6E4A55" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M0 14 q-18 -4 -14 -24 q14 2 14 24 q0 -22 14 -24 q4 20 -14 24z" fill={accent} opacity="0.9" />
          <path d="M-2 34 q-14 -2 -18 -12 q12 -2 18 12z" fill="#8FB9A6" />
        </g>
      );
    case 'kana':
      return <text x="196" y="112" textAnchor="middle" fontSize="70" fontFamily="Noto Serif JP, serif" fill={accent} opacity="0.85">か</text>;
    case 'torii':
      return (
        <g transform="translate(200 116)" fill={accent}>
          <rect x="-30" y="-60" width="7" height="62" />
          <rect x="23" y="-60" width="7" height="62" />
          <path d="M-46 -66 q46 -10 92 0 l-3 8 q-43 -8 -86 0z" />
          <rect x="-38" y="-50" width="76" height="6" />
        </g>
      );
    case 'fuji':
      return (
        <g transform="translate(200 120)">
          <path d="M-62 0 L-14 -66 Q0 -70 14 -66 L62 0 Z" fill={accent} opacity="0.85" />
          <path d="M-14 -66 Q0 -70 14 -66 L28 -46 l-10 6 -8 -8 -10 8 -8 -8 -10 6z" fill="#fff" />
        </g>
      );
    case 'crane':
      return (
        <g transform="translate(200 84)" fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round">
          <path d="M-40 10 L0 -26 L40 10 L0 0 Z" fill="#fff" />
          <path d="M0 0 L-8 30 L0 22 L8 30 Z" fill="#fff" />
          <path d="M40 10 l14 -18 4 4" />
          <circle cx="56" cy="-10" r="3" fill={accent} stroke="none" />
        </g>
      );
    default:
      return null;
  }
}

/** Decorative course/level cover. The level label is real text in the parent, not in the art. */
export function JlptThumb({ level = 'N5', className }) {
  const key = String(level || 'N5').toUpperCase().replace(/^JLPT\s*/, '');
  const l = LEVELS[key] || LEVELS.N5;
  const gid = `jlpt-${key}`;
  return (
    <svg viewBox="0 0 280 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={l.from} />
          <stop offset="1" stopColor={l.to} />
        </linearGradient>
      </defs>
      <rect width="280" height="150" fill={`url(#${gid})`} />
      {/* seigaiha waves bottom-left */}
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="2">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${i * 36} 150)`}>
            <circle r="30" />
            <circle r="20" />
            <circle r="10" />
          </g>
        ))}
      </g>
      <circle cx="200" cy="80" r="56" fill="#FFFFFF" opacity="0.45" />
      <Motif motif={l.motif} accent={l.accent} />
    </svg>
  );
}
