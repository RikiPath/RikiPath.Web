/*
 * Small spot illustrations (empty states, results, system states) and JLPT
 * level thumbnails. Original vector art in the RikiPath Web art direction:
 * soft pastel, subtle Japanese motifs, no embedded copy text.
 */

const INK = '#2D282A';
const PINK = '#E05A7A';
const PINK_SOFT = '#FFE3EA';
const PINK_PETAL = '#F8A8BB';
const LINE = '#E5E0E2';
const PAPER = '#FBF7F8';
const MUTED = '#8F8488';

function Petal({ x, y, r = 0, s = 1, fill = PINK_PETAL }) {
  return <ellipse cx={x} cy={y} rx={4.5 * s} ry={2.6 * s} fill={fill} transform={`rotate(${r} ${x} ${y})`} />;
}

const ART = {
  // Classroom / cohort whiteboard & study desks (replaces generic box/calendar on class views)
  classroom: (
    <>
      <ellipse cx="80" cy="128" rx="52" ry="7" fill={INK} opacity="0.07" />
      <rect x="28" y="30" width="104" height="62" rx="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M28 40 a10 10 0 0 1 10 -10 h84 a10 10 0 0 1 10 10 v6 h-104 z" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" />
      <path d="M50 30 v-7 M110 30 v-7" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="40" y="56" width="38" height="6" rx="3" fill={LINE} />
      <rect x="40" y="68" width="26" height="6" rx="3" fill={LINE} />
      <circle cx="106" cy="66" r="11" fill="#FFF7F9" stroke={PINK} strokeWidth="2.2" />
      <path d="M101 66 h10 M106 61 v10" stroke={PINK} strokeWidth="2" strokeLinecap="round" />
      <rect x="42" y="92" width="76" height="6" rx="3" fill={PAPER} stroke={INK} strokeWidth="2" />
      <g stroke={INK} strokeWidth="2.2" fill="#fff">
        <circle cx="54" cy="108" r="7" fill={PINK_SOFT} />
        <path d="M40 124 c0 -7 28 -7 28 0 z" />
        <circle cx="106" cy="108" r="7" fill="#fff" />
        <path d="M92 124 c0 -7 28 -7 28 0 z" />
      </g>
    </>
  ),
  // Schedule empty: Sakura calendar page with check stamp
  calendar: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="34" y="36" width="92" height="84" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M34 48 a12 12 0 0 1 12 -12 h68 a12 12 0 0 1 12 12 v12 h-92 z" fill={PINK} stroke={INK} strokeWidth="2.5" />
      <path d="M58 28 v16 M102 28 v16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2, 3].map((c) => [0, 1].map((r) => (
        <rect key={`${c}${r}`} x={46 + c * 18} y={72 + r * 20} width="12" height="10" rx="3" fill={LINE} />
      )))}
      <circle cx="108" cy="102" r="11" fill={PINK_SOFT} stroke={PINK} strokeWidth="2.2" />
      <path d="M103 102 l4 4 7 -8" stroke={PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Booking / appointment / transfer / schedule queue: Calendar paired with a clock badge
  appointment: (
    <>
      <ellipse cx="80" cy="128" rx="52" ry="7" fill={INK} opacity="0.07" />
      <rect x="30" y="34" width="84" height="78" rx="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M30 45 a11 11 0 0 1 11 -11 h62 a11 11 0 0 1 11 11 v10 h-84 z" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" />
      <path d="M52 26 v14 M92 26 v14" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      {[0, 1, 2].map((c) => [0, 1].map((r) => (
        <rect key={`${c}${r}`} x={42 + c * 18} y={66 + r * 17} width="11" height="9" rx="2.5" fill={LINE} />
      )))}
      <circle cx="108" cy="96" r="22" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="108" cy="96" r="16" fill="#FFF7F9" />
      <path d="M108 86 v10 l7 4" stroke={PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="108" cy="96" r="2.5" fill={INK} />
    </>
  ),
  // Homework / essay / assignment: Open exercise notebook & pen
  homework: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="34" y="28" width="76" height="92" rx="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <rect x="34" y="28" width="14" height="92" rx="4" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" />
      <path d="M30 46 h9 M30 64 h9 M30 82 h9 M30 100 h9" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M58 46 h38 M58 60 h34 M58 74 h28 M58 88 h20" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="90" cy="46" r="6" fill={PINK_SOFT} />
      <g transform="translate(114 82) rotate(32)">
        <rect x="-6" y="-34" width="12" height="58" rx="4" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <rect x="-6" y="-34" width="12" height="12" rx="3" fill={PINK} stroke={INK} strokeWidth="2.5" />
        <path d="M-6 24 l6 12 6 -12 z" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      </g>
    </>
  ),
  // No search / filter results: magnifier over Japanese card
  search: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="30" y="38" width="66" height="68" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <text x="63" y="83" textAnchor="middle" fontSize="34" fontFamily="Noto Serif JP, serif" fill="#C9BEC2">字</text>
      <circle cx="98" cy="70" r="24" fill="#FFF7F9" fillOpacity="0.88" stroke={INK} strokeWidth="3" />
      <path d="M115 88 l18 18" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M89 61 q9 -6 17 0" stroke={PINK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </>
  ),
  // Vocabulary / SRS / notebook: Stacked Japanese flashcards
  flashcard: (
    <>
      <ellipse cx="80" cy="128" rx="52" ry="7" fill={INK} opacity="0.07" />
      <g transform="rotate(-7 80 78)">
        <rect x="32" y="38" width="84" height="72" rx="11" fill={PAPER} stroke={INK} strokeWidth="2.3" />
      </g>
      <rect x="42" y="34" width="86" height="76" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M104 34 v22 l-7 -5 -7 5 v-22 z" fill={PINK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <text x="72" y="74" textAnchor="middle" fontSize="28" fontFamily="Noto Serif JP, serif" fill={INK}>あ</text>
      <path d="M56 88 h54 M64 98 h38" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      <Petal x={32} y={42} r={-25} s={0.9} />
    </>
  ),
  // Lesson / curriculum / textbook: Open Japanese textbook with Sakura bookmark
  book: (
    <>
      <ellipse cx="80" cy="128" rx="54" ry="7" fill={INK} opacity="0.07" />
      <path d="M26 40 q27 -6 54 6 q27 -12 54 -6 v68 q-27 -6 -54 6 q-27 -12 -54 -6 z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M80 46 v68" stroke={INK} strokeWidth="2.3" />
      <path d="M38 56 q16 -2 30 3 M38 70 q16 -2 30 3 M38 84 q14 -2 24 2" stroke={LINE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M92 59 q14 -5 30 -3 M92 73 q14 -5 30 -3 M92 87 q12 -4 24 -3" stroke={LINE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M98 42 v34 l6 -5 6 5 v-36 z" fill={PINK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  // Kanji / Kana writing practice grid (genkouyoushi) + calligraphy brush/pen
  kanji: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="34" y="30" width="76" height="84" rx="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <rect x="44" y="42" width="56" height="58" rx="4" fill="#FFFDFD" stroke={LINE} strokeWidth="2" />
      <path d="M72 42 v58 M44 71 h56" stroke={PINK_SOFT} strokeWidth="2" strokeDasharray="4 4" />
      <text x="72" y="83" textAnchor="middle" fontSize="34" fontFamily="Noto Serif JP, serif" fill="#C9BEC2">漢</text>
      <g transform="translate(114 82) rotate(28)">
        <rect x="-5" y="-36" width="10" height="54" rx="4" fill={PINK_SOFT} stroke={INK} strokeWidth="2.4" />
        <path d="M-4 18 c0 9 4 16 4 16 s4 -7 4 -16 z" fill={PINK} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    </>
  ),
  // Notifications empty: Rounded Sakura notification bell
  bell: (
    <>
      <ellipse cx="80" cy="128" rx="42" ry="6" fill={INK} opacity="0.07" />
      <path d="M50 86 c0 -22 10 -40 30 -40 s30 18 30 40 l8 12 h-76 z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M74 46 v-6 a6 6 0 0 1 12 0 v6" stroke={INK} strokeWidth="2.5" fill="none" />
      <path d="M71 98 a9 9 0 0 0 18 0" fill={PINK} stroke={INK} strokeWidth="2.4" />
      <circle cx="106" cy="52" r="8" fill={PINK_SOFT} stroke={PINK} strokeWidth="2" />
      <path d="M36 62 q-6 10 -2 20 M124 62 q6 10 2 20" stroke={PINK_PETAL} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  // History / transactions / receipts / audit log: Timeline sheet + clock dial
  clock: (
    <>
      <ellipse cx="80" cy="128" rx="52" ry="7" fill={INK} opacity="0.07" />
      <rect x="28" y="30" width="76" height="86" rx="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M46 46 v52" stroke={PINK_SOFT} strokeWidth="2.5" strokeLinecap="round" />
      {[50, 70, 90].map((cy, idx) => (
        <g key={cy}>
          <circle cx="46" cy={cy} r="4.5" fill={idx === 0 ? PINK : PINK_SOFT} stroke={PINK} strokeWidth="2" />
          <rect x="58" y={cy - 3} width={idx === 2 ? 26 : 34} height="6" rx="3" fill={LINE} />
        </g>
      ))}
      <circle cx="106" cy="90" r="24" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="106" cy="90" r="18" fill="#FFF7F9" />
      <path d="M106 79 v11 l8 5" stroke={PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="106" cy="90" r="2.5" fill={INK} />
    </>
  ),
  // Mentor / users empty: Minimalist 2D Japanese mentor portrait + badge
  mentor: (
    <>
      <ellipse cx="80" cy="128" rx="48" ry="7" fill={INK} opacity="0.07" />
      <rect x="34" y="28" width="92" height="90" rx="14" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="80" cy="60" r="15" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" />
      <path d="M52 104 c2 -16 14 -24 28 -24 s26 8 28 24" fill={PAPER} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M72 80 l8 10 8 -10" fill="none" stroke={PINK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="122" cy="40" r="11" fill={PINK_SOFT} stroke={PINK} strokeWidth="2.2" />
      <path d="M117 40 l3.5 3.5 6.5 -7" stroke={PINK} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Analytics / progress / KPI empty: Chart frame with bars & trend curve
  chart: (
    <>
      <ellipse cx="80" cy="128" rx="52" ry="7" fill={INK} opacity="0.07" />
      <rect x="28" y="30" width="104" height="84" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M42 98 h76" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="46" y="74" width="14" height="24" rx="4" fill={LINE} />
      <rect x="70" y="60" width="14" height="38" rx="4" fill={PINK_SOFT} stroke={PINK} strokeWidth="2" />
      <rect x="94" y="48" width="14" height="50" rx="4" fill={PINK} />
      <path d="M48 64 l24 -14 26 -10" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="64" r="3" fill={INK} />
      <circle cx="72" cy="50" r="3" fill={INK} />
      <circle cx="98" cy="40" r="3.5" fill={PINK} stroke={INK} strokeWidth="1.8" />
    </>
  ),
  // Reviews / feedback empty: Review card with star row & comment bars
  review: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <rect x="30" y="34" width="100" height="80" rx="12" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <g transform="translate(80 58)">
        {[-24, 0, 24].map((dx, i) => (
          <path
            key={dx}
            d={`M${dx} -9 l2.6 5.2 5.7 .8 -4.1 4 1 5.7 -5.2 -2.7 -5.2 2.7 1 -5.7 -4.1 -4 5.7 -.8 z`}
            fill={i === 1 ? PINK : i === 0 ? '#FFE7AE' : LINE}
            stroke={i < 2 ? INK : MUTED}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ))}
      </g>
      <rect x="46" y="78" width="68" height="7" rx="3.5" fill={LINE} />
      <rect x="54" y="92" width="52" height="7" rx="3.5" fill={PINK_SOFT} />
    </>
  ),
  // Certificate / plans / mock exam / policy empty: Folded document with Sakura seal
  certificate: (
    <>
      <ellipse cx="80" cy="128" rx="48" ry="7" fill={INK} opacity="0.07" />
      <path d="M38 26 h62 l22 22 v68 a8 8 0 0 1 -8 8 h-76 a8 8 0 0 1 -8 -8 v-82 a8 8 0 0 1 8 -8 z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M100 26 v22 h22" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="48" y="46" width="38" height="6" rx="3" fill={PINK} />
      <rect x="48" y="60" width="56" height="6" rx="3" fill={LINE} />
      <rect x="48" y="72" width="44" height="6" rx="3" fill={LINE} />
      <circle cx="96" cy="96" r="13" fill={PINK_SOFT} stroke={PINK} strokeWidth="2.2" />
      <path d="M90 107 l-2 13 8 -4 8 4 -2 -13" fill={PINK} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),
  // Messages / complaints / meeting chat empty: Crisp layered speech bubbles
  message: (
    <>
      <ellipse cx="80" cy="128" rx="50" ry="7" fill={INK} opacity="0.07" />
      <path d="M52 34 h64 a10 10 0 0 1 10 10 v32 a10 10 0 0 1 -10 10 h-12 l-10 10 -4 -10 h-38 a10 10 0 0 1 -10 -10 v-32 a10 10 0 0 1 10 -10 z" fill={PINK_SOFT} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M36 52 h60 a10 10 0 0 1 10 10 v32 a10 10 0 0 1 -10 10 h-36 l-12 12 v-12 h-12 a10 10 0 0 1 -10 -10 v-32 a10 10 0 0 1 10 -10 z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="40" y="68" width="46" height="6" rx="3" fill={LINE} />
      <rect x="40" y="81" width="32" height="6" rx="3" fill={LINE} />
      <circle cx="90" cy="64" r="4" fill={PINK} />
    </>
  ),
  // Structured data table / Excel import / question bank empty (also replaces generic box)
  table: (
    <>
      <ellipse cx="80" cy="128" rx="52" ry="7" fill={INK} opacity="0.07" />
      <rect x="30" y="34" width="100" height="82" rx="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M30 45 a11 11 0 0 1 11 -11 h78 a11 11 0 0 1 11 11 v10 h-100 z" fill={PINK_SOFT} stroke={INK} strokeWidth="2.5" />
      <circle cx="44" cy="44" r="2.5" fill={PINK} />
      <circle cx="53" cy="44" r="2.5" fill={PINK_PETAL} />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="42" y={66 + r * 14} width="18" height="6" rx="3" fill={r === 0 ? PINK : LINE} />
          <rect x="66" y={66 + r * 14} width="52" height="6" rx="3" fill={LINE} />
        </g>
      ))}
      <Petal x={122} y={24} r={25} s={1.1} />
    </>
  ),
  // Backwards-compatible alias for generic 'empty' — renders crisp Sakura sheet instead of cardboard box
  empty: null,
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

ART.empty = ART.table;

export function SpotArt({ name = 'table', size = 140, className, title }) {
  const artwork = ART[name] || ART.table;
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
      {artwork}
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
