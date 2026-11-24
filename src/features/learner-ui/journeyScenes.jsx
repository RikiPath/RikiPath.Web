// RikiPath Roadmap World — seven original 2.5D Japanese landscapes drawn as layered vector art (no raster assets:
// nothing to download, sharp at every resolution). Layers, back → front: sky · far range · mid hills & water ·
// landmarks · foreground · ambient motion. The learning path and checkpoints are NOT part of this art; they are
// rendered on top by the journey map, so changing a landscape never changes a lesson's state or interaction.
//
// Coordinates come from a 900 × 250 art box anchored to the bottom of the scene: ground layers stretch with the
// width (sx), objects keep their proportions and are only re-positioned, so wide maps stay crisp and undistorted.

const PALETTES = {
  sakura_garden: { sky: ['#FFD9E4', '#FFEFF3', '#E8F6EC'], glow: '#FFE9B8', far: ['#B8B3E0', '#CFC9EE'], hills: ['#A9DDB9', '#8FCFA3', '#C4EACF'], ground: '#9ED4AE', water: '#8FCBEF' },
  village: { sky: ['#FFE3C9', '#FFF1E6', '#E6F3EC'], glow: '#FFDCA8', far: ['#A8B8DC', '#C3CDE8'], hills: ['#B9E0B2', '#9FD39A', '#CDEBC7'], ground: '#ABD8A2', water: '#93CCEB' },
  momiji: { sky: ['#FFD3B8', '#FFE7D8', '#F7EADB'], glow: '#FFD08A', far: ['#C08AA8', '#D8AFC0'], hills: ['#E9B27A', '#DC915A', '#F2CC98'], ground: '#E2B07C', water: '#9CC9E4' },
  lakeside: { sky: ['#C9E6FB', '#E9F3FD', '#E3F3EE'], glow: '#FFF0C2', far: ['#8FA9D6', '#B3C6E6'], hills: ['#A6D8BC', '#86C9A6', '#C2E6D1'], ground: '#9BD2B3', water: '#7DBDE8' },
  snowy: { sky: ['#C9D7F2', '#E6ECF8', '#F4F6FB'], glow: '#FFF6DC', far: ['#9FB0D6', '#C0CCE6'], hills: ['#E8EEF8', '#D5DFEF', '#F6F8FC'], ground: '#EEF2F9', water: '#A9CBEB' },
  festival: { sky: ['#FFBFA6', '#F9C7D2', '#EBD5E8'], glow: '#FFD59A', far: ['#9C86B8', '#B9A6CF'], hills: ['#C7B2D6', '#B39BC8', '#DCCBE6'], ground: '#D6C2DE', water: '#A3BFE6' },
  bamboo: { sky: ['#DDF1D8', '#EEF7E8', '#E2F1DB'], glow: '#FFF5C8', far: ['#9CC59A', '#B9D8B4'], hills: ['#8DC584', '#74B36C', '#A8D69F'], ground: '#93C98A', water: '#93CDE6' },
};

const AMBIENT = { sakura_garden: 'petals', village: 'petals', momiji: 'leaves', lakeside: 'shimmer', snowy: 'snow', festival: 'lanterns', bamboo: 'sway' };

/* ------------------------------------------------------------------ reusable pieces (drawn at their own origin) */
function Mountain({ x, base = 200, w = 260, h = 150, fill, cap = '#FFFFFF', capDepth = 0.32 }) {
  const top = base - h;
  const cx = x + w / 2;
  const capY = top + h * capDepth;
  return (
    <g>
      <path d={`M${x} ${base} L${cx - 10} ${top + 6} Q${cx} ${top - 4} ${cx + 10} ${top + 6} L${x + w} ${base} Z`} fill={fill} />
      <path d={`M${cx - 10} ${top + 6} Q${cx} ${top - 4} ${cx + 10} ${top + 6} L${cx + (w / 2) * capDepth} ${capY} L${cx + 8} ${capY - 8} L${cx} ${capY + 2} L${cx - 9} ${capY - 7} L${cx - (w / 2) * capDepth} ${capY} Z`} fill={cap} opacity="0.95" />
      <path d={`M${cx} ${top} L${x + w} ${base} L${cx + 18} ${base} Z`} fill="rgba(37,48,77,0.08)" />
    </g>
  );
}

function SakuraTree({ x, y, s = 1, tones = ['#F59AB5', '#F7B8CB', '#FBD3DF'] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="44" rx="20" ry="4" fill="rgba(37,48,77,0.12)" />
      <path d="M-2 44 C-3 30 -1 22 0 12 M0 24 C6 20 10 16 14 10 M0 20 C-6 16 -10 12 -14 8" stroke="#7A4E4C" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <circle cx="-12" cy="6" r="13" fill={tones[0]} />
      <circle cx="12" cy="4" r="14" fill={tones[0]} />
      <circle cx="0" cy="-6" r="16" fill={tones[1]} />
      <circle cx="-4" cy="10" r="11" fill={tones[1]} />
      <circle cx="8" cy="-10" r="8" fill={tones[2]} />
      <circle cx="-10" cy="-2" r="6" fill={tones[2]} />
    </g>
  );
}

function RoundTree({ x, y, s = 1, tones }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="40" rx="16" ry="3.5" fill="rgba(37,48,77,0.12)" />
      <rect x="-2.2" y="18" width="4.4" height="22" rx="2" fill="#7A4E4C" />
      <circle cx="0" cy="6" r="17" fill={tones[0]} />
      <circle cx="-8" cy="12" r="11" fill={tones[1]} />
      <circle cx="7" cy="-2" r="9" fill={tones[2]} />
    </g>
  );
}

function Pine({ x, y, s = 1, fill = '#5E8C7E', snow = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="30" width="4" height="12" fill="#6B4B45" />
      <path d="M0 -14 L16 12 H8 L20 32 H-20 L-8 12 H-16 Z" fill={fill} />
      {snow && <path d="M0 -14 L9 1 L3 -1 L0 4 L-3 -1 L-9 1 Z M-11 16 L-6 12 L0 16 L6 12 L11 16 L8 12 H-8 Z" fill="#FFFFFF" />}
    </g>
  );
}

function Torii({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-24" y="0" width="48" height="6" rx="2.5" fill="#C93C4D" />
      <rect x="-20" y="10" width="40" height="4" rx="1.5" fill="#D94E5C" />
      <rect x="-16" y="4" width="5" height="34" rx="2" fill="#B8323F" />
      <rect x="11" y="4" width="5" height="34" rx="2" fill="#B8323F" />
      <rect x="-26" y="-2" width="52" height="3" rx="1.5" fill="#3B3340" />
    </g>
  );
}

function House({ x, y, s = 1, roof = '#4E5C7C', wall = '#FFF6EA' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="30" rx="30" ry="4" fill="rgba(37,48,77,0.12)" />
      <rect x="-22" y="6" width="44" height="24" fill={wall} />
      <rect x="-6" y="14" width="12" height="16" fill="#B7926B" />
      <rect x="-18" y="12" width="8" height="7" fill="#E8D3B4" />
      <rect x="10" y="12" width="8" height="7" fill="#E8D3B4" />
      <path d="M-32 8 Q0 -14 32 8 L26 10 Q0 -6 -26 10 Z" fill={roof} />
      <path d="M-26 10 Q0 -4 26 10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function Pagoda({ x, y, s = 1 }) {
  const tier = (yy, w) => (
    <g key={yy}>
      <rect x={-w / 2 + 6} y={yy} width={w - 12} height="10" fill="#C94254" />
      <path d={`M${-w / 2 - 6} ${yy + 1} Q0 ${yy - 10} ${w / 2 + 6} ${yy + 1} L${w / 2} ${yy + 3} Q0 ${yy - 5} ${-w / 2} ${yy + 3} Z`} fill="#3E4766" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1" y="-52" width="2" height="12" fill="#3E4766" />
      {tier(-40, 22)}
      {tier(-26, 30)}
      {tier(-12, 38)}
      {tier(2, 46)}
      <rect x="-14" y="12" width="28" height="12" fill="#C94254" />
    </g>
  );
}

function ArchBridge({ x, y, w = 90, color = '#D8505F' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 10 Q${w / 2} -18 ${w} 10`} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={`M2 4 Q${w / 2} -24 ${w - 2} 4`} stroke={color} strokeWidth="2.5" fill="none" />
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <line key={t} x1={w * t} y1={-12 + Math.abs(t - 0.5) * 30} x2={w * t} y2={-2 + Math.abs(t - 0.5) * 30} stroke={color} strokeWidth="2" />
      ))}
    </g>
  );
}

function Lantern({ x, y, s = 1, color = '#E8533F' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="rp-world-lantern">
      <circle r="11" fill="rgba(255,190,110,0.35)" />
      <rect x="-5" y="-8" width="10" height="2.5" rx="1" fill="#3B3340" />
      <ellipse rx="6.5" ry="7.5" fill={color} />
      <path d="M-6 0 H6 M-5.5 -3.5 H5.5 M-5.5 3.5 H5.5" stroke="rgba(255,230,190,0.7)" strokeWidth="0.8" />
      <rect x="-5" y="6" width="10" height="2.5" rx="1" fill="#3B3340" />
    </g>
  );
}

function BambooCluster({ x, y, s = 1 }) {
  const stalk = (dx, h, c) => (
    <g key={`${dx}-${h}`}>
      <rect x={dx - 2.5} y={-h} width="5" height={h} rx="2.5" fill={c} />
      {[0.25, 0.5, 0.75].map((t) => (
        <rect key={t} x={dx - 3} y={-h * t} width="6" height="1.6" fill="rgba(37,60,40,0.35)" />
      ))}
      <path d={`M${dx} ${-h + 10} q10 -4 16 2 q-8 0 -16 -2 M${dx} ${-h + 22} q-11 -3 -16 3 q8 -1 16 -3`} fill="#6FB067" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="rp-world-sway">
      {stalk(-10, 120, '#7CB874')}
      {stalk(0, 150, '#5FA457')}
      {stalk(11, 108, '#8CC47F')}
      {stalk(20, 132, '#6BAD62')}
    </g>
  );
}

function Shrine({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-24" y="4" width="48" height="22" fill="#FFF4E6" />
      <rect x="-24" y="4" width="4" height="22" fill="#C93C4D" />
      <rect x="20" y="4" width="4" height="22" fill="#C93C4D" />
      <rect x="-6" y="12" width="12" height="14" fill="#C93C4D" />
      <path d="M-34 6 L0 -16 L34 6 L28 8 L0 -8 L-28 8 Z" fill="#3E4766" />
      <path d="M-30 4 L0 -14 L30 4" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.9" />
    </g>
  );
}

function Cloud({ x, y, s = 1, slow = false }) {
  return (
    <g className="rp-journey-cloud" data-slow={slow ? 'true' : undefined}>
      <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 26h70a14 14 0 0 0 0-28h-6a21 21 0 0 0-40-4 14 14 0 0 0-24 16z" fill="rgba(255,255,255,0.88)" />
    </g>
  );
}

/* ------------------------------------------------------------------ depth rows (spread across the real width) */
const ROW_TONES = {
  sakura_garden: ['#F7B4C8', '#F29AB3', '#FBD0DC'],
  village: ['#9ACB92', '#F4B3C5', '#86BF7E'],
  momiji: ['#E8763F', '#F2A04E', '#D95A3A'],
  lakeside: ['#6FA88F', '#86BBA2', '#5E9A82'],
  snowy: ['#7F9CB2', '#9DB5C8', '#6E8EA6'],
  festival: ['#B7A0CC', '#C9B5DA', '#A58DBF'],
  bamboo: ['#6FAE66', '#86BE79', '#5D9E56'],
};

/** Distant tree line on the hill crest + foreground shrubs: density follows the width, positions are seeded. */
function DepthRows({ variant, width, r }) {
  const tones = ROW_TONES[variant];
  const far = [];
  const step = 58;
  for (let x = 20, i = 0; x < width - 10; x += step, i += 1) {
    const j = ((Math.sin((i + 1) * 12.9898 + r * 78.233) * 43758.5453) % 1 + 1) % 1;
    const xx = x + j * 22;
    const y = 142 + Math.sin(i * 0.9 + r * 6) * 8;
    const size = 7 + j * 5;
    far.push(
      variant === 'snowy' || variant === 'lakeside' ? (
        <path key={i} d={`M${xx} ${y - size * 1.6} L${xx + size} ${y + 2} H${xx - size} Z`} fill={tones[i % 3]} opacity="0.85" />
      ) : variant === 'bamboo' ? (
        <rect key={i} x={xx - 1.5} y={y - size * 3} width="3" height={size * 3 + 2} rx="1.5" fill={tones[i % 3]} opacity="0.7" />
      ) : (
        <g key={i} opacity="0.88">
          <circle cx={xx} cy={y - size * 0.6} r={size} fill={tones[i % 3]} />
          <circle cx={xx + size * 0.8} cy={y - size * 0.2} r={size * 0.7} fill={tones[(i + 1) % 3]} />
        </g>
      ),
    );
  }
  const near = [];
  for (let x = 30, i = 0; x < width; x += 140, i += 1) {
    const j = ((Math.sin((i + 3) * 7.13 + r * 19.1) * 9631.7) % 1 + 1) % 1;
    const xx = x + j * 60;
    near.push(
      <g key={i} opacity="0.95">
        <ellipse cx={xx} cy={244} rx={16 + j * 8} ry={9} fill={tones[(i + 2) % 3]} />
        <ellipse cx={xx + 12} cy={246} rx={11} ry={7} fill={tones[i % 3]} />
      </g>,
    );
  }
  return { far: <g className="rp-world-far">{far}</g>, near: <g className="rp-world-near">{near}</g> };
}

/* ------------------------------------------------------------------ landscapes */
function Layers({ variant, sx, width, r, r2, gid }) {
  const p = PALETTES[variant];
  const X = (x) => x * sx; // re-position objects without stretching them
  const right = (x) => width - (900 - x); // anchor to the right edge
  const rows = DepthRows({ variant, width, r });
  const hillsBase = (
    <g transform={`scale(${sx} 1)`}>
      <path d={`M0 ${150 - r * 14} C150 ${112 + r2 * 18} 300 ${150 - r * 10} 470 ${128 + r2 * 10} S760 ${118 + r * 14} 900 ${136 - r2 * 10} V250 H0 Z`} fill={p.hills[2]} />
      <path d={`M0 ${182 - r2 * 8} C180 ${150 + r * 16} 360 ${178 - r * 8} 540 ${160 + r2 * 10} S800 ${170 - r * 10} 900 ${160 + r * 8} V250 H0 Z`} fill={`url(#${gid}Hill)`} />
    </g>
  );
  const hills = (
    <>
      {rows.far}
      {hillsBase}
    </>
  );
  const ground = (
    <>
      <g transform={`scale(${sx} 1)`}>
        <path d="M0 226 C200 214 420 230 620 218 S860 224 900 220 V250 H0 Z" fill={p.ground} />
      </g>
      {rows.near}
    </>
  );
  switch (variant) {
    case 'sakura_garden':
      return (
        <>
          <Mountain x={right(600)} base={190} w={300} h={150} fill={p.far[0]} />
          <g transform={`scale(${sx} 1)`}><path d="M0 170 C120 150 220 166 340 150 V250 H0 Z" fill={p.far[1]} opacity="0.7" /></g>
          {hills}
          <g transform={`scale(${sx} 1)`}>
            <path d={`M${120 + r * 80} 250 C${200 + r * 60} 220 ${300 + r2 * 40} 214 ${420 + r * 60} 206 S640 196 760 190`} stroke={p.water} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.85" />
          </g>
          <SakuraTree x={X(70)} y={150} s={1.15} />
          <SakuraTree x={X(250 + r * 60)} y={168} s={0.8} />
          <SakuraTree x={X(520 + r2 * 60)} y={160} s={0.9} />
          <SakuraTree x={right(860)} y={150} s={1.1} />
          {ground}
        </>
      );
    case 'village':
      return (
        <>
          <Mountain x={X(80)} base={170} w={240} h={110} fill={p.far[0]} capDepth={0.25} />
          <Mountain x={right(560)} base={176} w={280} h={128} fill={p.far[1]} />
          {hills}
          <House x={X(210 + r * 40)} y={150} s={0.95} />
          <House x={X(300 + r * 40)} y={158} s={0.75} roof="#6A5A7C" />
          <Pagoda x={right(720)} y={132} s={0.95} />
          <g transform={`scale(${sx} 1)`}><path d="M380 250 C420 226 480 214 560 206" stroke={p.water} strokeWidth="14" fill="none" opacity="0.8" /></g>
          <ArchBridge x={X(430)} y={214} w={70} />
          <Torii x={X(120)} y={150} s={0.85} />
          <SakuraTree x={X(40)} y={160} s={0.85} />
          <SakuraTree x={right(860)} y={160} s={0.9} />
          {ground}
        </>
      );
    case 'momiji':
      return (
        <>
          <Mountain x={X(40)} base={180} w={300} h={140} fill={p.far[0]} cap="#F6E2E8" capDepth={0.2} />
          <Mountain x={right(520)} base={176} w={330} h={150} fill={p.far[1]} cap="#F8E9EE" capDepth={0.22} />
          {hills}
          <g transform={`scale(${sx} 1)`}><path d={`M${60 + r * 40} 250 C220 222 320 210 ${470 + r2 * 40} 200 S760 186 880 176`} stroke="#F7E3C8" strokeWidth="9" fill="none" strokeDasharray="2 10" strokeLinecap="round" /></g>
          <RoundTree x={X(60)} y={154} s={1.15} tones={['#E8643C', '#F08A4B', '#F6B866']} />
          <RoundTree x={X(180 + r * 60)} y={168} s={0.85} tones={['#D9533A', '#EE7A45', '#F4A65A']} />
          <RoundTree x={X(430 + r2 * 80)} y={160} s={0.95} tones={['#F08A4B', '#F4A65A', '#F9CD7C']} />
          <RoundTree x={right(790)} y={160} s={1} tones={['#E8643C', '#F08A4B', '#F6B866']} />
          <RoundTree x={right(870)} y={150} s={1.2} tones={['#D9533A', '#EE7A45', '#F4A65A']} />
          <Torii x={X(330 + r * 40)} y={150} s={0.75} />
          {ground}
        </>
      );
    case 'lakeside':
      return (
        <>
          <Mountain x={X(470 + r * 60)} base={180} w={320} h={160} fill={p.far[0]} />
          <Mountain x={X(110)} base={182} w={260} h={110} fill={p.far[1]} capDepth={0.2} />
          {hills}
          <g transform={`scale(${sx} 1)`}>
            <path d="M140 214 C260 194 520 192 720 206 C640 232 300 236 140 214 Z" fill={p.water} />
            <path d="M220 210 H300 M380 205 H470 M540 212 H620" stroke="rgba(255,255,255,0.75)" strokeWidth="2.2" strokeLinecap="round" className="rp-world-shimmer" />
          </g>
          <ArchBridge x={X(620)} y={204} w={88} />
          <Pine x={X(60)} y={150} s={1.05} fill="#4F8A78" />
          <Pine x={X(95)} y={162} s={0.8} fill="#5E9A86" />
          <SakuraTree x={right(860)} y={152} s={1} />
          <House x={right(770)} y={168} s={0.7} />
          {ground}
        </>
      );
    case 'snowy':
      return (
        <>
          <Mountain x={X(30)} base={186} w={320} h={160} fill={p.far[0]} capDepth={0.5} />
          <Mountain x={right(500)} base={180} w={360} h={170} fill={p.far[1]} capDepth={0.55} />
          {hills}
          <g transform={`scale(${sx} 1)`}><path d="M0 200 C160 190 300 204 460 196 S760 188 900 198" stroke="#C9D6EC" strokeWidth="3" fill="none" opacity="0.8" /></g>
          <Shrine x={right(700)} y={150} s={1} />
          <Torii x={right(610)} y={160} s={0.8} />
          <Pine x={X(70)} y={150} s={1.1} fill="#5D7F95" snow />
          <Pine x={X(110)} y={162} s={0.85} fill="#6C8EA3" snow />
          <Pine x={X(330 + r * 60)} y={168} s={0.8} fill="#5D7F95" snow />
          <Pine x={right(860)} y={152} s={1.05} fill="#6C8EA3" snow />
          {ground}
        </>
      );
    case 'festival':
      return (
        <>
          <Mountain x={X(320 + r * 80)} base={170} w={300} h={130} fill={p.far[0]} capDepth={0.28} />
          {hills}
          <House x={X(120)} y={150} s={1.05} roof="#3E4766" wall="#FFEBD9" />
          <House x={X(220)} y={156} s={0.9} roof="#5A4A70" wall="#FFF1E2" />
          <House x={right(700)} y={152} s={1} roof="#3E4766" wall="#FFEBD9" />
          <House x={right(800)} y={146} s={1.1} roof="#5A4A70" wall="#FFF1E2" />
          <Pagoda x={X(470 + r2 * 40)} y={128} s={0.85} />
          <g transform={`scale(${sx} 1)`}><path d="M40 92 Q240 128 440 100 T880 96" stroke="#3B3340" strokeWidth="1.2" fill="none" opacity="0.6" /></g>
          {[80, 180, 280, 380, 520, 620, 720, 820].map((x, i) => (
            <Lantern key={x} x={X(x)} y={100 + Math.sin(i * 1.3) * 9 + 6} s={0.9} color={i % 2 ? '#F07A3E' : '#E8533F'} />
          ))}
          {ground}
        </>
      );
    case 'bamboo':
    default:
      return (
        <>
          <g transform={`scale(${sx} 1)`}><path d="M0 160 C150 140 300 158 450 144 S750 150 900 140 V250 H0 Z" fill={p.far[1]} opacity="0.8" /></g>
          {hills}
          <BambooCluster x={X(50)} y={210} s={1.1} />
          <BambooCluster x={X(160 + r * 40)} y={214} s={0.85} />
          <BambooCluster x={right(830)} y={210} s={1.15} />
          <BambooCluster x={right(720 - r2 * 40)} y={216} s={0.8} />
          <g transform={`scale(${sx} 1)`}>
            {[260, 330, 400, 470, 540, 610].map((x, i) => (
              <ellipse key={x} cx={x} cy={230 - (i % 2) * 4} rx="16" ry="4.5" fill="#C9D3C1" />
            ))}
          </g>
          <Torii x={X(440 + r * 40)} y={150} s={0.8} />
          {ground}
        </>
      );
  }
}

function Ambient({ variant, sx, width, r }) {
  const kind = AMBIENT[variant];
  const X = (x) => x * sx;
  if (kind === 'petals' || kind === 'leaves' || kind === 'snow') {
    const fill = kind === 'petals' ? '#F7AFC4' : kind === 'leaves' ? '#E8763F' : '#FFFFFF';
    const shape =
      kind === 'snow'
        ? <circle r="2.6" />
        : kind === 'leaves'
          ? <path d="M0 -5 L1.5 -1.5 L5 -2 L2.5 1 L3.5 5 L0 3 L-3.5 5 L-2.5 1 L-5 -2 L-1.5 -1.5 Z" />
          : <path d="M0 -5 C3 -2.5 4 0 4 2 C4 4 2 5 0 5 S-4 4 -4 2 C-4 0 -3 -2.5 0 -5 Z" />;
    return (
      <g className={`rp-world-fall rp-world-${kind}`} fill={fill} stroke={kind === 'snow' ? 'rgba(120,140,170,0.35)' : 'none'} strokeWidth="0.6">
        {[0.18, 0.42, 0.63, 0.86].map((t, i) => (
          <g key={t} transform={`translate(${X(900 * t + r * 30)} ${14 + i * 9})`}>{shape}</g>
        ))}
      </g>
    );
  }
  if (kind === 'lanterns' || kind === 'shimmer' || kind === 'sway') return null; // animated inside their layers
  void width;
  return null;
}

/**
 * Background landscape for one roadmap scene.
 * @param {{ variant: string, width: number, height: number, seed: number, seed2: number, gid: string }} props
 */
export default function SceneBackdrop({ variant, width, height, seed = 0.5, seed2 = 0.5, gid }) {
  const v = PALETTES[variant] ? variant : 'sakura_garden';
  const p = PALETTES[v];
  const sx = width / 900;
  const artTop = height - 250;
  return (
    <g className="rp-world" data-landscape={v}>
      <defs>
        <linearGradient id={`${gid}Sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="58%" stopColor={p.sky[1]} />
          <stop offset="100%" stopColor={p.sky[2]} />
        </linearGradient>
        <linearGradient id={`${gid}Hill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.hills[0]} />
          <stop offset="100%" stopColor={p.hills[1]} />
        </linearGradient>
        <radialGradient id={`${gid}Glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.95" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#${gid}Sky)`} />
      <g transform={`translate(0 ${artTop})`}>
        {/* soft light source + atmospheric clouds */}
        <circle cx={(110 + seed2 * 80) * sx} cy="48" r="46" fill={`url(#${gid}Glow)`} />
        <circle cx={(110 + seed2 * 80) * sx} cy="48" r="16" fill={v === 'festival' ? '#FFC36E' : '#FFE08A'} opacity={v === 'snowy' ? 0.7 : 0.9} />
        <Cloud x={(230 + seed * 160) * sx} y={20} s={0.9} />
        <Cloud x={(560 + seed2 * 180) * sx} y={36} s={0.7} slow />
        <Layers variant={v} sx={sx} width={width} r={seed} r2={seed2} gid={gid} />
        <Ambient variant={v} sx={sx} width={width} r={seed} />
      </g>
    </g>
  );
}
