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
