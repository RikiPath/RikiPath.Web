import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Badge, Button, Card, cx } from '@/components/ui';
import { FeatureLink } from '@/features/entitlements/components/StudyUnlock.jsx';
import { useStudyUnlock } from '@/features/entitlements/studyUnlock.js';
import { useLocale } from '@/locales/locale.js';
import WebClayIcon from './WebClayIcon.jsx';

const SKILL_ITEMS = [
  {
    key: 'vocabulary',
    icon: 'vocabulary',
    tone: 'mint',
    title: 'Từ vựng',
    sub: 'Sổ tay & flashcard JLPT',
    to: '/kanji-notebook/',
    cardBg: 'border-rp-mint-line/80 bg-rp-mint-bg/55 hover:bg-rp-mint-bg',
    titleColor: 'text-rp-mint',
  },
  {
    key: 'grammar',
    icon: 'grammar',
    tone: 'peach',
    title: 'Ngữ pháp',
    sub: 'Cấu trúc N5–N2 & ví dụ',
    to: '/grammar/',
    cardBg: 'border-rp-peach-line/80 bg-rp-peach-bg/55 hover:bg-rp-peach-bg',
    titleColor: 'text-rp-peach',
  },
  {
    key: 'kanji',
    icon: 'kanji',
    tone: 'lavender',
    title: 'Hán tự Kanji',
    sub: 'Âm On/Kun, nét & nhận diện',
    to: '/kanji-writing/',
    cardBg: 'border-rp-lavender-line/80 bg-rp-lavender-bg/55 hover:bg-rp-lavender-bg',
    titleColor: 'text-rp-lavender',
  },
  {
    key: 'kana',
    icon: 'kana',
    tone: 'sakura',
    title: 'Bảng Kana',
    sub: 'Hiragana & Katakana cơ bản',
    to: '/kanji-writing/?type=hiragana',
    cardBg: 'border-rp-brand-border/80 bg-rp-brand-tint/65 hover:bg-rp-brand-tint',
    titleColor: 'text-rp-brand-strong',
  },
  {
    key: 'listening',
    icon: 'listening',
    tone: 'sky',
    title: 'Nghe hiểu',
    sub: 'Hội thoại & audio theo bài',
    to: '/riki/listening/',
    gated: true,
    cardBg: 'border-rp-sky-line/80 bg-rp-sky-bg/55 hover:bg-rp-sky-bg',
    titleColor: 'text-rp-sky',
  },
  {
    key: 'reading',
    icon: 'reading',
    tone: 'navy',
    title: 'Đọc hiểu',
    sub: 'Đọc đoạn văn & câu hỏi',
    to: '/riki/reading/',
    gated: true,
    cardBg: 'border-rp-navy-line/80 bg-rp-navy-bg/55 hover:bg-rp-navy-bg',
    titleColor: 'text-rp-navy',
  },
  {
    key: 'writing',
    icon: 'writing',
    tone: 'peach',
    title: 'Luyện viết AI',
    sub: 'Chấm câu & bài viết tiếng Nhật',
    to: '/riki/essay/',
    gated: true,
    cardBg: 'border-rp-peach-line/80 bg-rp-peach-bg/45 hover:bg-rp-peach-bg/85',
    titleColor: 'text-rp-peach',
  },
  {
    key: 'speaking',
    icon: 'speaking',
    tone: 'mint',
    title: 'Luyện nói AI',
    sub: 'Phát âm & phản xạ hội thoại',
    to: '/speech',
    gated: true,
    cardBg: 'border-rp-mint-line/80 bg-rp-mint-bg/45 hover:bg-rp-mint-bg/85',
    titleColor: 'text-rp-mint',
  },
];

/**
 * Skill Explorer ("Khám phá & luyện tập"): 8 skills, each with its own clay icon, entitlement-aware links.
 * `compact` is the dashboard variant that shares a row with Group Learning (2 columns, smaller icons, tighter tiles).
 */
export default function SkillExplorer({ className, listClassName = 'rp-cq-practice', compact = false }) {
  const { tr } = useLocale();
  const unlock = useStudyUnlock();

  return (
    <Card className={cx('w-full border-rp-line bg-white p-4 shadow-rp-sm sm:p-5', compact && 'rp-cq flex flex-col', className)} data-section="SkillExplorer">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <WebClayIcon name="lesson_catalog" size="sm" hover className="-my-1" />
          <div>
            <h2 className="text-[17px] font-extrabold tracking-tight text-rp-navy">
              {tr('Khám phá & luyện tập')}
            </h2>
            <p className="text-xs text-rp-text-2">
              {tr('8 kỹ năng trọng tâm theo cấu trúc JLPT & thực hành AI')}
            </p>
          </div>
        </div>

        <Button as={Link} to="/lessons/" variant="secondary" size="sm" iconRight={ArrowRight}>
          {tr('Tất cả bài học')}
        </Button>
      </div>

      <ul className={cx('grid grid-cols-1', compact ? 'rp-discovery-grid mt-3 flex-1' : 'mt-4 gap-3 sm:grid-cols-2 lg:grid-cols-4', listClassName)}>
        {SKILL_ITEMS.map((item) => {
          const isLocked = Boolean(item.gated && unlock?.access?.lockStateFor?.(item.to) === 'locked');
          const tileContent = (
            <div className={cx('flex w-full items-center', compact ? 'gap-3' : 'gap-3.5')}>
              <span className={cx('shrink-0 transition-opacity', isLocked && 'opacity-55 grayscale-[60%]')}>
                <WebClayIcon name={item.icon} size={compact ? 'xs' : 'md'} tone={item.tone} hover={!isLocked} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cx(
                      'truncate font-extrabold',
                      compact ? 'text-[13.5px]' : 'text-[14px]',
                      isLocked ? 'text-rp-text-muted' : item.titleColor,
                    )}
                  >
                    {tr(item.title)}
                  </span>
                  {isLocked && (
                    <Badge
                      tone="neutral"
                      size="sm"
                      icon={LockKeyhole}
                      className="shrink-0 whitespace-nowrap !border-rp-line !bg-rp-muted-strong/90 !text-rp-text-2"
                    >
                      {tr('Mở khóa')}
                    </Badge>
                  )}
                </div>
                <p className={cx('mt-0.5 truncate text-[12px]', isLocked ? 'text-rp-text-disabled' : 'text-rp-text-2')}>
                  {tr(item.sub)}
                </p>
              </div>
            </div>
          );

          const tileClass = cx(
            'rp-focus rp-skill-tile group flex h-full w-full items-center rounded-2xl border text-left transition-colors',
            compact ? 'px-3 py-1.5' : 'p-3.5',
            isLocked
              ? 'border-rp-line/85 bg-rp-muted/55 hover:border-rp-line-strong hover:bg-rp-muted/80'
              : cx('rp-interactive', item.cardBg),
          );

          return (
            <li key={item.key}>
              {item.gated ? (
                <FeatureLink to={item.to} showLock={false} className={tileClass} label={tr(item.title)}>
                  {tileContent}
                </FeatureLink>
              ) : (
                <Link to={item.to} className={tileClass}>
                  {tileContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
