import { StudyIllustration } from '@/features/landing/components/StudyIllustrations.jsx';
import { cx } from '@/components/ui';

const STUDY_KEYS = new Set([
  'vocabulary',
  'grammar',
  'kanji',
  'kana',
  'srs',
  'srs_flip',
  'srs_typing',
  'srs_mcq',
  'srs_mixed',
  'listening',
  'reading',
  'writing',
  'speaking',
  'mock',
  'roadmap',
  'group',
  'progress',
  'notebook',
  'calendar',
  'ai',
]);

const ALIAS_MAP = {
  flashcards: 'srs',
  vocab: 'vocabulary',
  lesson: 'reading',
  lessons: 'reading',
  kanji_brush: 'kanji',
  essay_writing: 'writing',
  speech: 'speaking',
  conversation: 'speaking',
  mock_exam: 'mock',
  quiz: 'mock',
  classroom: 'group',
  mentor: 'group',
  streak_flame: 'streak',
  trophy: 'achievement',
  assessment: 'placement',
  // Compass sticker = "find your direction": setup / journey headings.
  journey: 'dashboard',
  compass: 'dashboard',
};

const SIZE_PX = {
  xs: 44,
  sm: 52,
  md: 64,
  lg: 78,
  xl: 96,
};

function ExtraClaySvg({ name, px }) {
  const s = px;
  switch (name) {
    case 'streak':
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="30" ry="6" fill="#E05324" opacity="0.16" />
          <path
            d="M62 12c4 18 28 28 28 54a30 30 0 0 1-60 0c0-15 8-27 16-36 1 9 6 13 11 14-3-12 0-22 5-32z"
            fill="#DC4E1E"
          />
          <path
            d="M60 10c4 17 27 27 27 52a28 28 0 0 1-56 0c0-14 8-26 16-34 1 8 6 12 10 13-3-12 0-21 3-31z"
            fill="#FF7A38"
          />
          <path
            d="M60 44c6 12 16 17 16 30a16 16 0 0 1-32 0c0-9 4-16 10-22 2 5 4 7 6 7-1-5-1-10 0-15z"
            fill="#FFE082"
          />
          <path
            d="M44 52c-5 8-6 18-3 25"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'achievement':
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="32" ry="6" fill="#B65A06" opacity="0.15" />
          <rect x="38" y="90" width="44" height="14" rx="7" fill="#C97316" />
          <rect x="38" y="86" width="44" height="12" rx="6" fill="#F29E38" />
          <rect x="53" y="68" width="14" height="22" rx="6" fill="#E38922" />
          <path d="M30 30c-12 0-16 20-2 28l8 4" stroke="#E38922" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M90 30c12 0 16 20 2 28l-8 4" stroke="#E38922" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M32 22h56v24c0 17-12 29-28 29S32 63 32 46V22z" fill="#D97E18" />
          <path d="M32 18h56v24c0 17-12 29-28 29S32 59 32 42V18z" fill="#F8B44C" />
          <path d="M42 26v14c0 8 4 14 9 18" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M60 30l4 8 9 1-6 6 1 9-8-4-8 4 1-9-6-6 9-1z" fill="#FFF8EC" />
        </svg>
      );
    case 'placement':
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="34" ry="6" fill="#1D62AB" opacity="0.14" />
          <rect x="20" y="24" width="80" height="76" rx="18" fill="#2A6FB8" />
          <rect x="20" y="18" width="80" height="76" rx="18" fill="#64A8EE" />
          <rect x="30" y="28" width="60" height="56" rx="12" fill="#FFFDF9" />
          <circle cx="60" cy="56" r="20" fill="#EEF6FD" stroke="#64A8EE" strokeWidth="3" />
          <circle cx="60" cy="56" r="10" fill="#E05A7A" />
          <circle cx="60" cy="56" r="4" fill="#FFFDF9" />
          <path d="M74 34l12-10-4 14z" fill="#E05A7A" />
        </svg>
      );
    case 'lesson_catalog':
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="38" ry="6" fill="#C24362" opacity="0.14" />
          {/* Back sky book */}
          <rect x="26" y="20" width="66" height="46" rx="13" fill="#2A6FB8" transform="rotate(-7 59 43)" />
          <rect x="26" y="15" width="66" height="46" rx="13" fill="#64A8EE" transform="rotate(-7 59 38)" />
          <rect x="34" y="21" width="50" height="32" rx="8" fill="#FFFDF9" transform="rotate(-7 59 37)" />
          {/* Front sakura book */}
          <rect x="20" y="44" width="76" height="52" rx="15" fill="#C24362" />
          <rect x="20" y="38" width="76" height="52" rx="15" fill="#F28DA8" />
          <rect x="30" y="46" width="56" height="34" rx="10" fill="#FFFDF9" />
          <path d="M40 57h28M40 66h22" stroke="#D78098" strokeWidth="3.5" strokeLinecap="round" />
          {/* Warm pastel gloss & star badge */}
          <path d="M30 43c14-2 34-2 52 0" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <g transform="translate(88 76)">
            <circle r="15" cy="3" fill="#B65A06" opacity="0.24" />
            <circle r="15" fill="#F6C453" />
            <path d="M0-7l2.2 4.5 5 .7-3.6 3.5.9 5L0 4.3-4.5 6.7l.9-5-3.6-3.5 5-.7z" fill="#FFFDF9" />
          </g>
        </svg>
      );
    case 'homework':
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="34" ry="6" fill="#B65A06" opacity="0.14" />
          <rect x="24" y="22" width="72" height="80" rx="14" fill="#C97316" />
          <rect x="24" y="16" width="72" height="80" rx="14" fill="#F5A64B" />
          <rect x="33" y="27" width="54" height="58" rx="9" fill="#FFFDF9" />
          <rect x="44" y="10" width="32" height="12" rx="6" fill="#25304D" />
          <path d="M41 44l4 4 8-8M41 60l4 4 8-8" stroke="#167C53" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M58 45h20M58 61h16M41 75h34" stroke="#E6DCD3" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 'lesson_done':
      // Completed lesson: closed sakura book with a mint check seal (distinct from the open reading book).
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="58" cy="108" rx="34" ry="6" fill="#0F6E4A" opacity="0.14" />
          <rect x="22" y="28" width="66" height="72" rx="14" fill="#C24362" />
          <rect x="22" y="22" width="66" height="72" rx="14" fill="#F28DA8" />
          <rect x="30" y="22" width="8" height="72" fill="#E06F8D" />
          <rect x="44" y="34" width="36" height="22" rx="6" fill="#FFFDF9" />
          <path d="M50 42h24M50 49h16" stroke="#D78098" strokeWidth="3" strokeLinecap="round" />
          <path d="M42 30c12-2 26-2 38 0" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <g transform="translate(86 80)">
            <circle r="18" cy="3" fill="#0F6E4A" opacity="0.25" />
            <circle r="18" fill="#2FB27A" />
            <circle r="13" fill="#4FCB94" />
            <path d="M-6.5 0.5l4.5 4.5L7-4.5" stroke="#FFFDF9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </svg>
      );
    case 'pass':
      // Premium learning pass: lavender ticket with sakura seal and a gold star.
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="106" rx="38" ry="6" fill="#5B3FA0" opacity="0.15" />
          <g transform="rotate(-8 60 62)">
            <path d="M18 40a8 8 0 0 1 8-8h68a8 8 0 0 1 8 8v8a10 10 0 0 0 0 20v8a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8v-8a10 10 0 0 0 0-20z" fill="#6A4BB8" transform="translate(0 6)" />
            <path d="M18 40a8 8 0 0 1 8-8h68a8 8 0 0 1 8 8v8a10 10 0 0 0 0 20v8a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8v-8a10 10 0 0 0 0-20z" fill="#A58BEA" />
            <path d="M78 34v50" stroke="#FFFDF9" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" opacity="0.8" />
            <rect x="28" y="44" width="38" height="7" rx="3.5" fill="#FFFDF9" />
            <rect x="28" y="57" width="26" height="6" rx="3" fill="#E9E0FF" />
            <circle cx="90" cy="58" r="8" fill="#F28DA8" />
            <circle cx="90" cy="58" r="3" fill="#FFF8EC" />
            <path d="M28 38c14-2 30-2 44 0" stroke="rgba(255,255,255,0.55)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </g>
          <path d="M94 16l3.2 6.6 7.2 1-5.2 5 1.2 7.2-6.4-3.4-6.4 3.4 1.2-7.2-5.2-5 7.2-1z" fill="#F6C453" />
        </svg>
      );
    case 'history':
      // Recent activity: clay clock with a rewind arrow (distinct from the calendar).
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="34" ry="6" fill="#1D62AB" opacity="0.14" />
          <circle cx="60" cy="64" r="38" fill="#2A6FB8" />
          <circle cx="60" cy="58" r="38" fill="#7DB6F0" />
          <circle cx="60" cy="58" r="28" fill="#FFFDF9" />
          <path d="M60 40v19l12 8" stroke="#25304D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="60" cy="59" r="3.5" fill="#E05A7A" />
          <path d="M22 40a42 42 0 0 1 18-20" stroke="#F28DA8" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M14 34l9 10 8-12z" fill="#F28DA8" />
          <path d="M40 30c8-5 18-7 28-5" stroke="rgba(255,255,255,0.65)" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'dashboard':
    default:
      return (
        <svg viewBox="0 0 120 120" width={s} height={s} aria-hidden="true" className="rp-clay-sticker shrink-0">
          <ellipse cx="60" cy="108" rx="36" ry="6" fill="#B53D5C" opacity="0.15" />
          <circle cx="60" cy="62" r="40" fill="#C84666" />
          <circle cx="60" cy="56" r="40" fill="#EE839F" />
          <circle cx="60" cy="56" r="29" fill="#FFF8EC" />
          <path d="M60 32l8 22-8 24-8-24z" fill="#25304D" opacity="0.2" />
          <path d="M60 32l8 24H52z" fill="#E05A7A" />
          <path d="M60 80l8-24H52z" fill="#64A8EE" />
          <circle cx="60" cy="56" r="5" fill="#FFF8EC" stroke="#25304D" strokeWidth="2.5" />
          <path d="M36 32c7-7 17-10 26-9" stroke="rgba(255,255,255,0.65)" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      );
  }
}

/**
 * Unified Web 2.5D/Clay SVG Icon System for RikiPath V5.
 * Vector-only (sharp at every DPI), aligned to Sakura & Pastel tokens, never imports Mobile PNG/WebP icons.
 * Always renders as a standalone 3D illustrated object directly on the surface without white frames or card boxes.
 */
export default function WebClayIcon({
  name = 'roadmap',
  size = 'md',
  hover = false,
  className,
  title,
}) {
  const normalized = ALIAS_MAP[name] || name;
  const px = SIZE_PX[size] || SIZE_PX.md;
  const studySize = px <= 48 ? 'sm' : px <= 72 ? 'md' : 'lg';

  const iconEl = STUDY_KEYS.has(normalized) ? (
    <StudyIllustration
      name={normalized}
      size={studySize}
      title={title}
      className={cx('rp-clay-sticker shrink-0', hover && 'rp-icon-3d-hover')}
    />
  ) : (
    <ExtraClaySvg name={normalized} px={px} />
  );

  // Match requested pixel size cleanly when StudyIllustration presets differ slightly
  const sizedEl = STUDY_KEYS.has(normalized) ? (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full', hover && 'rp-icon-3d-hover')}
      style={{ width: px, height: px }}
    >
      <StudyIllustration name={normalized} size={studySize} title={title} className="rp-clay-sticker" />
    </span>
  ) : (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center', hover && 'rp-icon-3d-hover')}
      style={{ width: px, height: px }}
    >
      {iconEl}
    </span>
  );

  return (
    <span
      data-clay-icon={normalized}
      data-clay-size={size}
      className={cx('inline-flex shrink-0 items-center justify-center', className)}
      aria-hidden={title ? undefined : 'true'}
    >
      {sizedEl}
    </span>
  );
}
