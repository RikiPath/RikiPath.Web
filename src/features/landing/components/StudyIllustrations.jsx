import { useId } from 'react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/*
 * RikiPath "Sakura clay" illustration set — original SVG, no external assets.
 * Recipe (keep it consistent when adding new ones):
 *   1. contact shadow  — radial gradient ellipse under the object (no blur filter → cheap to paint)
 *   2. extrusion       — the same silhouette 4–6px lower in the tone's deep colour
 *   3. face            — linear gradient light (top-left) → tone (bottom-right)
 *   4. gloss           — white 35–55% highlight stroke/ellipse top-left
 *   5. accents         — sakura pink #F28DA8 / ivory #FFF8EC details, Japanese glyphs in `font-jp`
 * Sizes: `sm` 40px (UI chips), `md` 72px (feature cards), `lg` 120px (hero/section objects).
 * Every illustration is decorative (aria-hidden); the surrounding card carries the text.
 */

const SIZES = { sm: 40, md: 72, lg: 120 };

const PALETTE = {
  vocabulary: ['#BFF0D4', '#2FA56A', '#1E824C'],
  grammar: ['#FFE0BF', '#F08A2C', '#B65A06'],
  kanji: ['#E7DAF2', '#9A75B8', '#74558A'],
  kana: ['#FFD6E0', '#E8668A', '#B23A5E'],
  srs: ['#E9DBFF', '#9B62E6', '#7E2FD0'],
  srs_flip: ['#FFD9E6', '#E56B92', '#B53D5C'],
  srs_typing: ['#E6DCFF', '#8D69E8', '#5E3BC2'],
  srs_mcq: ['#D8ECFF', '#5897E8', '#2864B8'],
  srs_mixed: ['#F4DCFF', '#B562E8', '#7C2EB5'],
  listening: ['#E2D8FF', '#7B6CF0', '#5543C8'],
  reading: ['#D3E6FF', '#4A8BE0', '#1F64B5'],
  writing: ['#FFE9C7', '#D49A3A', '#8A5A16'],
  speaking: ['#CDEFEA', '#3EA89C', '#2E7872'],
  mock: ['#DCE3F3', '#6F84B5', '#4F628C'],
  roadmap: ['#FFD9E3', '#E4708F', '#C24362'],
  group: ['#FFE3D6', '#F0907A', '#C9584A'],
  progress: ['#D7F3E8', '#45B48C', '#1F8A63'],
  notebook: ['#FFE4EC', '#EE7C9C', '#C24362'],
  calendar: ['#E3F0FF', '#5B9BE6', '#2C6CC0'],
  ai: ['#FCE3F1', '#D86AAE', '#A23E80'],
};

function Base({ id, tone, children, size, className, title }) {
  const { tr } = useLocale();
  const [light, mid, deep] = PALETTE[tone] || PALETTE.roadmap;
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  return (
    <svg
      viewBox="0 0 120 120"
      width={px}
      height={px}
      className={cx('rp-clay shrink-0 overflow-visible', className)}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      data-tone={tone}
    >
      {title && <title>{tr(title)}</title>}
      <defs>
        <linearGradient id={`${id}-face`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <linearGradient id={`${id}-deep`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={deep} stopOpacity="0.35" />
          <stop offset="1" stopColor={deep} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFF4EC" />
        </linearGradient>
      </defs>
      <ellipse className="rp-clay-shadow" cx="60" cy="108" rx="40" ry="7" fill={`url(#${id}-shadow)`} />
      <g className="rp-clay-body">{children({ face: `url(#${id}-face)`, deep: `url(#${id}-deep)`, paper: `url(#${id}-paper)`, light, mid, dark: deep })}</g>
    </svg>
  );
}

const gloss = 'rgba(255,255,255,0.55)';
const sakura = '#F28DA8';
const jp = { fontFamily: 'var(--font-jp, "Noto Sans JP", sans-serif)', fontWeight: 700 };

const DRAW = {
  vocabulary: ({ face, deep, paper, dark }) => (
    <>
      <rect x="30" y="26" width="58" height="70" rx="14" fill={deep} transform="rotate(10 59 61)" />
      <rect x="22" y="22" width="58" height="70" rx="14" fill={deep} transform="rotate(-8 51 57)" />
      <rect x="22" y="16" width="58" height="70" rx="14" fill={face} transform="rotate(-8 51 51)" />
      <rect x="30" y="26" width="42" height="40" rx="9" fill={paper} transform="rotate(-8 51 46)" />
      <text x="51" y="56" textAnchor="middle" fontSize="24" fill={dark} style={jp} transform="rotate(-8 51 46)">語</text>
      <path d="M30 76c6 2 22 0 34-4" stroke={gloss} strokeWidth="4" strokeLinecap="round" fill="none" transform="rotate(-8 51 51)" />
      <circle cx="84" cy="24" r="7" fill={sakura} />
      <circle cx="84" cy="24" r="2.4" fill="#FFF8EC" />
    </>
  ),
  grammar: ({ face, deep, paper, dark }) => (
    <>
      <rect x="18" y="34" width="84" height="56" rx="16" fill={deep} />
      <rect x="18" y="28" width="84" height="56" rx="16" fill={face} />
      <rect x="27" y="38" width="22" height="18" rx="6" fill={paper} />
      <rect x="53" y="38" width="16" height="18" rx="6" fill="#FFF8EC" opacity="0.85" />
      <rect x="73" y="38" width="20" height="18" rx="6" fill={paper} />
      <text x="38" y="52" textAnchor="middle" fontSize="12" fill={dark} style={jp}>私</text>
      <text x="61" y="52" textAnchor="middle" fontSize="12" fill={sakura} style={jp}>は</text>
      <text x="83" y="52" textAnchor="middle" fontSize="12" fill={dark} style={jp}>学生</text>
      <path d="M30 66h60M30 74h38" stroke="#FFF8EC" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <path d="M26 32c10-3 30-3 46-1" stroke={gloss} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  ),
  kanji: ({ face, deep, paper, dark }) => (
    <>
      <rect x="20" y="22" width="66" height="72" rx="16" fill={deep} />
      <rect x="20" y="16" width="66" height="72" rx="16" fill={face} />
      <rect x="29" y="25" width="48" height="52" rx="10" fill={paper} />
      <path d="M53 25v52M29 51h48" stroke="#F0D6DD" strokeWidth="1.2" strokeDasharray="3 3" />
      <text x="53" y="64" textAnchor="middle" fontSize="34" fill={dark} style={jp}>書</text>
      <g transform="rotate(38 90 54)">
        <rect x="84" y="20" width="10" height="56" rx="5" fill="#7A4A2A" />
        <rect x="84" y="20" width="4" height="56" rx="2" fill="rgba(255,255,255,0.3)" />
        <path d="M84 76h10l-2 12c-1 4-5 4-6 0z" fill="#2D282A" />
        <rect x="83" y="70" width="12" height="6" rx="2" fill="#C9A24A" />
      </g>
    </>
  ),
  kana: ({ face, deep, paper, dark }) => (
    <>
      <circle cx="58" cy="62" r="38" fill={deep} />
      <circle cx="58" cy="56" r="38" fill={face} />
      <circle cx="58" cy="56" r="27" fill={paper} />
      <text x="58" y="68" textAnchor="middle" fontSize="32" fill={dark} style={jp}>あ</text>
      <path d="M32 36c6-8 18-12 28-12" stroke={gloss} strokeWidth="4" strokeLinecap="round" fill="none" />
      <g transform="translate(86 26)">
        <circle r="10" fill="#FFF8EC" />
        <text y="5" textAnchor="middle" fontSize="13" fill={sakura} style={jp}>ア</text>
      </g>
    </>
  ),
  srs: ({ face, deep, paper, dark, light }) => (
    <>
      <rect x="34" y="20" width="56" height="44" rx="12" fill={light} transform="rotate(12 62 42)" />
      <rect x="28" y="30" width="56" height="44" rx="12" fill={deep} transform="rotate(4 56 52)" />
      <rect x="24" y="38" width="60" height="48" rx="13" fill={deep} />
      <rect x="24" y="32" width="60" height="48" rx="13" fill={face} />
      <rect x="31" y="39" width="46" height="30" rx="8" fill={paper} />
      <text x="54" y="60" textAnchor="middle" fontSize="16" fill={dark} style={jp}>復習</text>
      <g transform="translate(88 78)">
        <circle r="15" fill="#FFF8EC" />
        <path d="M-7 -1a8 8 0 1 1 2 6" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M-9 -6l2 6 6-2" stroke={dark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </>
  ),
  srs_flip: ({ face, deep, paper, dark }) => (
    <>
      <rect x="20" y="24" width="54" height="64" rx="14" fill="#9B62E6" transform="rotate(-10 47 56)" />
      <rect x="20" y="20" width="54" height="64" rx="14" fill="#DEC9FF" transform="rotate(-10 47 52)" />
      <rect x="34" y="26" width="58" height="68" rx="15" fill={deep} transform="rotate(6 63 60)" />
      <rect x="34" y="20" width="58" height="68" rx="15" fill={face} transform="rotate(6 63 54)" />
      <rect x="42" y="29" width="42" height="44" rx="10" fill={paper} transform="rotate(6 63 51)" />
      <text x="63" y="59" textAnchor="middle" fontSize="24" fill={dark} style={jp} transform="rotate(6 63 51)">表</text>
      <path d="M44 26c10-2 24-1 34 2" stroke={gloss} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <g transform="translate(88 80)">
        <circle r="16" cy="3" fill={dark} opacity="0.35" />
        <circle r="16" fill="#FFF8EC" />
        <path d="M-7 -3h12l-3.5-3.5M7 3H-5l3.5 3.5" stroke={dark} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </>
  ),
  srs_typing: ({ face, deep, paper, dark }) => (
    <>
      <rect x="26" y="16" width="68" height="34" rx="11" fill={deep} />
      <rect x="26" y="12" width="68" height="34" rx="11" fill={paper} />
      <text x="48" y="35" textAnchor="middle" fontSize="18" fill={dark} style={jp}>あ</text>
      <rect x="62" y="20" width="3" height="18" rx="1.5" fill={sakura} />
      <rect x="16" y="56" width="88" height="40" rx="14" fill={deep} />
      <rect x="16" y="50" width="88" height="40" rx="14" fill={face} />
      {[26, 42, 58, 74, 90].map((x) => (
        <rect key={`r1-${x}`} x={x - 5} y="58" width="11" height="9" rx="3" fill="#FFF8EC" />
      ))}
      {[28, 44, 60].map((x) => (
        <rect key={`r2-${x}`} x={x - 5} y="71" width="11" height="9" rx="3" fill="#FFF8EC" />
      ))}
      <rect x="71" y="71" width="24" height="9" rx="3.5" fill={sakura} />
      <path d="M24 55c16-2 44-2 64 0" stroke={gloss} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  srs_mcq: ({ face, deep, paper, dark }) => (
    <>
      <rect x="20" y="22" width="72" height="76" rx="16" fill={deep} />
      <rect x="20" y="16" width="72" height="76" rx="16" fill={face} />
      <rect x="28" y="25" width="56" height="58" rx="11" fill={paper} />
      <rect x="34" y="32" width="44" height="11" rx="5.5" fill="#EFE8EC" />
      <rect x="34" y="48" width="44" height="13" rx="6.5" fill="#FFE3EC" stroke={sakura} strokeWidth="2" />
      <circle cx="41" cy="54.5" r="3.5" fill="#E05A7A" />
      <path d="M50 54.5h20" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      <rect x="34" y="66" width="44" height="11" rx="5.5" fill="#EFE8EC" />
      <path d="M28 21c14-2 34-2 48 0" stroke={gloss} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <g transform="translate(88 76)">
        <circle r="16" cy="3" fill="#1E824C" opacity="0.35" />
        <circle r="16" fill="#2FA56A" />
        <path d="M-6 0l4 4 8-8" stroke="#FFF8EC" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </>
  ),
  srs_mixed: ({ face, deep, paper, dark }) => (
    <>
      <rect x="16" y="28" width="46" height="58" rx="12" fill="#F28DA8" transform="rotate(-14 39 57)" />
      <rect x="58" y="28" width="46" height="58" rx="12" fill="#64A8EE" transform="rotate(14 81 57)" />
      <rect x="32" y="24" width="56" height="66" rx="15" fill={deep} />
      <rect x="32" y="18" width="56" height="66" rx="15" fill={face} />
      <rect x="40" y="27" width="40" height="38" rx="9" fill={paper} />
      <text x="60" y="53" textAnchor="middle" fontSize="21" fill={dark} style={jp}>混</text>
      <path d="M40 23c12-2 26-2 38 0" stroke={gloss} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <g transform="translate(88 78)">
        <circle r="16" cy="3" fill={dark} opacity="0.35" />
        <circle r="16" fill="#FFF8EC" />
        <path d="M-7 -4h4l10 8h4M-7 4h4l10-8h4" stroke={dark} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </>
  ),
  listening: ({ face, deep, dark }) => (
    <>
      <path d="M26 66a34 34 0 0 1 68 0" stroke={deep} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M26 62a34 34 0 0 1 68 0" stroke={face} strokeWidth="10" strokeLinecap="round" fill="none" />
      <rect x="16" y="58" width="24" height="34" rx="11" fill={deep} />
      <rect x="16" y="54" width="24" height="34" rx="11" fill={face} />
      <rect x="80" y="58" width="24" height="34" rx="11" fill={deep} />
      <rect x="80" y="54" width="24" height="34" rx="11" fill={face} />
      <rect x="21" y="60" width="7" height="20" rx="3.5" fill={gloss} />
      <rect x="85" y="60" width="7" height="20" rx="3.5" fill={gloss} />
      <path d="M50 72v8M56 66v20M62 70v12M68 74v4" stroke={dark} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="60" cy="30" r="5" fill={sakura} />
    </>
  ),
  reading: ({ face, deep, paper, dark }) => (
    <>
      <path d="M12 44c16-8 32-8 48 2 16-10 32-10 48-2v46c-16-8-32-8-48 2-16-10-32-10-48-2z" fill={deep} />
      <path d="M12 38c16-8 32-8 48 2 16-10 32-10 48-2v46c-16-8-32-8-48 2-16-10-32-10-48-2z" fill={face} />
      <path d="M18 42c13-6 27-6 39 2v38c-12-7-26-7-39-2z" fill={paper} />
      <path d="M63 44c12-8 26-8 39-2v38c-13-5-27-5-39 2z" fill={paper} />
      <text x="38" y="66" textAnchor="middle" fontSize="15" fill={dark} style={jp}>読む</text>
      <path d="M72 56h22M72 64h18M72 72h20" stroke="#E7D7CF" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 40v48" stroke={dark} strokeOpacity="0.25" strokeWidth="2" />
    </>
  ),
  writing: ({ face, deep, paper, dark }) => (
    <>
      <rect x="18" y="30" width="64" height="66" rx="12" fill={deep} />
      <rect x="18" y="24" width="64" height="66" rx="12" fill={paper} />
      <path d="M28 40h44M28 52h44M28 64h30" stroke="#EFDCCF" strokeWidth="3" strokeLinecap="round" />
      <text x="40" y="82" fontSize="13" fill={dark} style={jp}>日本</text>
      <g transform="rotate(35 86 48)">
        <rect x="80" y="10" width="13" height="64" rx="6.5" fill={face} />
        <rect x="80" y="10" width="5" height="64" rx="2.5" fill={gloss} />
        <path d="M80 74h13l-6.5 16z" fill="#FBE1C0" />
        <path d="M84.5 84l2 6 2-6z" fill={dark} />
        <rect x="80" y="10" width="13" height="10" rx="5" fill={sakura} />
      </g>
    </>
  ),
  speaking: ({ face, deep, dark }) => (
    <>
      <rect x="40" y="18" width="40" height="60" rx="20" fill={deep} />
      <rect x="40" y="14" width="40" height="60" rx="20" fill={face} />
      <path d="M48 30h24M48 40h24M48 50h24" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
      <rect x="45" y="20" width="8" height="34" rx="4" fill={gloss} />
      <path d="M30 60a30 30 0 0 0 60 0" stroke={dark} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M60 90v8M46 100h28" stroke={dark} strokeWidth="5" strokeLinecap="round" />
      <path d="M94 30c4 4 4 12 0 16M100 24c8 8 8 20 0 28" stroke={sakura} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  ),
  mock: ({ face, deep, paper, dark }) => (
    <>
      <rect x="16" y="26" width="64" height="74" rx="12" fill={deep} />
      <rect x="16" y="20" width="64" height="74" rx="12" fill={paper} />
      <rect x="16" y="20" width="64" height="16" rx="12" fill={face} />
      <text x="48" y="32" textAnchor="middle" fontSize="10" fill="#fff" style={jp}>JLPT</text>
      <path d="M26 48l4 4 7-8M26 64l4 4 7-8" stroke="#2FA56A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M42 48h28M42 64h22M26 80h40" stroke="#E5DCE6" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(86 74)">
        <circle r="20" fill={dark} />
        <circle r="20" cy="-3" fill={face} />
        <circle r="14" cy="-3" fill="#FFF8EC" />
        <path d="M0 -3V-12M0 -3l6 4" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      </g>
    </>
  ),
  roadmap: ({ face, deep, dark }) => (
    <>
      <path d="M18 92c18-2 20-26 40-28s22-26 44-30" stroke={deep} strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M18 88c18-2 20-26 40-28s22-26 44-30" stroke={face} strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M18 88c18-2 20-26 40-28s22-26 44-30" stroke="#FFF8EC" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" fill="none" />
      {[[22, 88, 'N5'], [58, 60, 'N4'], [96, 32, 'N3']].map(([x, y, l]) => (
        <g key={l} transform={`translate(${x} ${y})`}>
          <circle r="11" cy="3" fill={dark} />
          <circle r="11" fill="#FFF8EC" />
          <text y="4" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={dark}>{l}</text>
        </g>
      ))}
      <g transform="translate(96 12)">
        <path d="M0 20V-2" stroke={dark} strokeWidth="2.5" />
        <path d="M0 -2l14 5-14 5z" fill={sakura} />
      </g>
    </>
  ),
  group: ({ face, deep, dark, light }) => (
    <>
      <rect x="14" y="70" width="92" height="22" rx="11" fill={deep} />
      <rect x="14" y="66" width="92" height="22" rx="11" fill={face} />
      {[[30, '#F2A2B8'], [50, '#9CC4E8'], [70, '#B9DDB0'], [90, '#F6D49A']].map(([x, c]) => (
        <g key={x}>
          <circle cx={x} cy="54" r="9" fill={c} />
          <path d={`M${x - 11} 70a11 9 0 0 1 22 0`} fill={c} />
          <circle cx={x - 3} cy="51" r="2.5" fill={gloss} />
        </g>
      ))}
      <circle cx="60" cy="26" r="12" fill={dark} />
      <circle cx="60" cy="24" r="12" fill={light} />
      <text x="60" y="29" textAnchor="middle" fontSize="12" fill={dark} style={jp}>先</text>
    </>
  ),
  progress: ({ face, deep, dark }) => (
    <>
      <rect x="18" y="70" width="18" height="24" rx="6" fill={deep} />
      <rect x="44" y="52" width="18" height="42" rx="6" fill={deep} />
      <rect x="70" y="34" width="18" height="60" rx="6" fill={deep} />
      <rect x="18" y="66" width="18" height="24" rx="6" fill={face} />
      <rect x="44" y="48" width="18" height="42" rx="6" fill={face} />
      <rect x="70" y="30" width="18" height="60" rx="6" fill={face} />
      <rect x="21" y="69" width="5" height="16" rx="2.5" fill={gloss} />
      <rect x="47" y="51" width="5" height="32" rx="2.5" fill={gloss} />
      <rect x="73" y="33" width="5" height="50" rx="2.5" fill={gloss} />
      <path d="M96 22l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#F6C453" stroke={dark} strokeOpacity="0.2" />
    </>
  ),
  notebook: ({ face, deep, paper, dark }) => (
    <>
      <rect x="26" y="20" width="66" height="80" rx="12" fill={deep} />
      <rect x="22" y="16" width="66" height="80" rx="12" fill={face} />
      <rect x="34" y="28" width="46" height="56" rx="7" fill={paper} />
      <path d="M42 44h30M42 54h26M42 64h30" stroke="#F0D6DD" strokeWidth="3" strokeLinecap="round" />
      <text x="57" y="80" textAnchor="middle" fontSize="11" fill={dark} style={jp}>ノート</text>
      {[30, 44, 58, 72, 86].map((y) => <rect key={y} x="17" y={y - 3} width="10" height="5" rx="2.5" fill="#E8E1E4" />)}
      <path d="M78 16v18l5-4 5 4V16z" fill={sakura} />
    </>
  ),
  calendar: ({ face, deep, paper, dark }) => (
    <>
      <rect x="16" y="28" width="88" height="70" rx="14" fill={deep} />
      <rect x="16" y="22" width="88" height="70" rx="14" fill={paper} />
      <rect x="16" y="22" width="88" height="20" rx="14" fill={face} />
      <rect x="16" y="34" width="88" height="8" fill={face} />
      <rect x="34" y="14" width="7" height="16" rx="3.5" fill={dark} />
      <rect x="79" y="14" width="7" height="16" rx="3.5" fill={dark} />
      {[0, 1, 2, 3].map((c) => [0, 1].map((r) => (
        <rect key={`${c}-${r}`} x={26 + c * 18} y={50 + r * 18} width="12" height="12" rx="3.5" fill={(c === 1 && r === 0) || (c === 3 && r === 1) ? sakura : '#EFE6EA'} />
      )))}
    </>
  ),
  ai: ({ face, deep, dark }) => (
    <>
      <rect x="22" y="30" width="76" height="62" rx="22" fill={deep} />
      <rect x="22" y="24" width="76" height="62" rx="22" fill={face} />
      <rect x="32" y="38" width="56" height="30" rx="15" fill="#FFF8EC" />
      <circle cx="48" cy="53" r="5" fill={dark} />
      <circle cx="72" cy="53" r="5" fill={dark} />
      <path d="M54 62c3 3 9 3 12 0" stroke={dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M60 24V12" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="10" r="5" fill={sakura} />
      <path d="M96 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#F6C453" />
    </>
  ),
};

/** Original RikiPath clay illustration. `name` ∈ keys of PALETTE. */
export function StudyIllustration({ name, size = 'md', className, title }) {
  const id = useId().replace(/:/g, '');
  const draw = DRAW[name];
  if (!draw) return null;
  return <Base id={`rpc${id}`} tone={name} size={size} className={className} title={title}>{(p) => draw(p)}</Base>;
}

// Illustration names are the keys of DRAW (not exported: this module only exports components for fast refresh).
