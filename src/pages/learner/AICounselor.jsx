import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, FeatureIcon, cx } from '@/components/ui';
import SakuraFox3DActor from '@/features/companion/SakuraFox3DActor.jsx';
import { COMPANION_REACTIONS, COMPANION_STATES } from '@/features/companion/companionMachine.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import Icon from '@/components/ui/Icon.jsx';

const PRACTICE_OPTIONS = [
  {
    id: 'vocabulary',
    label: 'Từ vựng',
    japanese: '語彙',
    icon: 'style',
    title: 'Ôn lại từ, nhớ thêm một chút',
    description:
      'Bắt đầu bằng những từ đến hạn ôn, sau đó xem lại các từ bạn còn dễ nhầm.',
    steps: [
      'Ôn các thẻ đến hạn trong SRS.',
      'Đọc lại ví dụ của những từ chưa nhớ.',
      'Kết thúc khi bạn vẫn còn tập trung.',
    ],
    to: '/daily-srs',
    action: 'Ôn từ hôm nay',
    secondaryTo: '/kanji-notebook?tab=vocab-bank',
    secondaryLabel: 'Mở Sổ tay cá nhân',
  },
  {
    id: 'reading',
    label: 'Đọc hiểu',
    japanese: '読解',
    icon: 'menu_book',
    title: 'Đọc chậm một đoạn, hiểu rõ hơn',
    description:
      'Chọn một bài đọc vừa sức. Đọc để nắm ý chính trước khi xem lại từng câu.',
    steps: [
      'Đọc lướt để nhận ra chủ đề.',
      'Tìm thông tin liên quan đến câu hỏi.',
      'Xem lại câu trả lời và từ chưa rõ.',
    ],
    to: '/riki/reading',
    action: 'Luyện đọc hiểu',
    secondaryTo: '/kanji-notebook?tab=vocab-bank',
    secondaryLabel: 'Tra lại từ vựng',
  },
  {
    id: 'listening',
    label: 'Nghe hiểu',
    japanese: '聴解',
    icon: 'headphones',
    title: 'Nghe lại, bắt thêm một ý',
    description:
      'Luyện với một đoạn ngắn và nghe lại phần chưa rõ, thay vì chuyển bài quá nhanh.',
    steps: [
      'Nghe lần đầu để nắm tình huống.',
      'Nghe lại và ghi những ý nhận ra.',
      'Đối chiếu phần giải thích nếu có.',
    ],
    to: '/riki/listening',
    action: 'Luyện nghe hiểu',
    secondaryTo: '/speech',
    secondaryLabel: 'Thử luyện nói',
  },
  {
    id: 'writing',
    label: 'Luyện viết',
    japanese: '作文',
    icon: 'edit_note',
    title: 'Viết ngắn, diễn đạt rõ',
    description:
      'Chọn một chủ đề quen thuộc và viết vài câu bằng những mẫu câu bạn đã biết.',
    steps: [
      'Chọn một ý bạn muốn diễn đạt.',
      'Viết câu ngắn trước khi mở rộng.',
      'Đọc lại từ vựng và cách nối câu.',
    ],
    to: '/riki/essay',
    action: 'Bắt đầu luyện viết',
    secondaryTo: '/speech',
    secondaryLabel: 'Chuyển sang luyện nói',
  },
];

const QUICK_LINKS = [
  {
    to: '/roadmap',
    icon: 'route',
    title: 'Lộ trình ôn tập',
    description: 'Xem lại hướng ôn của bạn',
  },
  {
    to: '/exam-result',
    icon: 'assignment',
    title: 'Kết quả làm bài',
    description: 'Xem lại những lần luyện trước',
  },
  {
    to: '/mentors',
    icon: 'groups',
    title: 'Học nhóm cùng Giáo viên',
    description: 'Lớp nhỏ trực tuyến theo lịch cố định cùng Giáo viên',
  },
];


const FEATURE_OF = { vocabulary: 'vocabulary', reading: 'reading', listening: 'listening', writing: 'writing' };

/**
 * Haru study guide. Backend has no conversational AI endpoint, so this page guides practice
 * by skill; AI grading itself lives in Writing (/riki/essay) and Speaking (/speech).
 */
export default function AICounselor() {
  const { tr } = useLocale();
  const [focusId, setFocusId] = useState('vocabulary');
  const [foxState, setFoxState] = useState(COMPANION_STATES.IDLE);
  const [foxReaction, setFoxReaction] = useState(COMPANION_REACTIONS.NONE);
  const focus = PRACTICE_OPTIONS.find((item) => item.id === focusId) || PRACTICE_OPTIONS[0];

  return (
    <LearnerShell breadcrumb="Haru AI">
      <div data-page="AICounselor" className="rp-container rp-cq py-[var(--rp-space-page-y)]">
        <section className="relative overflow-hidden rounded-rp-card-lg border border-rp-line bg-white shadow-rp-xs">
          <div className="relative flex items-center gap-6 p-6 sm:p-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tone-haru">Riki · {tr('gợi ý ôn tập')}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-rp-text sm:text-[28px]">{tr('Hôm nay mình ôn gì?')}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-rp-text-2">
                {tr('Chọn một kỹ năng, bắt đầu từ một phần nhỏ. Chạm vào cáo Sakura hoặc dùng trợ lý ở góc màn hình để trò chuyện và tra cứu ngay.')}
              </p>
            </div>
            <button
              type="button"
              onPointerEnter={() => {
                setFoxState(COMPANION_STATES.HOVER);
                setFoxReaction(COMPANION_REACTIONS.WAVING);
              }}
              onPointerLeave={() => {
                setFoxState(COMPANION_STATES.IDLE);
                setFoxReaction(COMPANION_REACTIONS.NONE);
              }}
              onClick={() => {
                setFoxState(COMPANION_STATES.CELEBRATING);
                setFoxReaction(COMPANION_REACTIONS.JUMPING);
                window.setTimeout(() => {
                  setFoxState(COMPANION_STATES.IDLE);
                  setFoxReaction(COMPANION_REACTIONS.NONE);
                }, 1100);
              }}
              aria-label={tr('Chạm để tương tác với cáo Sakura')}
              className="rp-focus hidden shrink-0 rounded-full p-1 sm:block"
            >
              <SakuraFox3DActor state={foxState} reaction={foxReaction} size={132} interactive />
            </button>
          </div>
        </section>

        <div className="mt-[var(--rp-space-section)] grid gap-[var(--rp-space-section)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <div role="radiogroup" aria-label={tr('Chọn kỹ năng')} className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-1">
            {PRACTICE_OPTIONS.map((item) => {
              const active = item.id === focus.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFocusId(item.id)}
                  className={cx(
                    'rp-focus flex items-center gap-3 rounded-rp-card border bg-rp-surface p-3 text-left transition-[border-color,box-shadow,transform] duration-150',
                    active ? 'border-rp-brand shadow-rp-card' : 'border-rp-line hover:-translate-y-0.5 hover:border-rp-brand-border',
                  )}
                >
                  <FeatureIcon feature={FEATURE_OF[item.id] || 'neutral'} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-rp-text">{tr(item.label)}</span>
                    <span lang="ja" className="rp-jp block text-xs text-rp-text-muted">{item.japanese}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <Card className="rp-anim-fade p-6" key={focus.id} aria-live="polite">
            <div className="flex items-start gap-4">
              <FeatureIcon feature={FEATURE_OF[focus.id] || 'neutral'} size="lg" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-rp-text">{tr(focus.title)}</h2>
                <p className="mt-1 text-sm leading-6 text-rp-text-2">{tr(focus.description)}</p>
              </div>
            </div>
            <ol className="mt-5 space-y-3">
              {focus.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rp-brand-tint text-xs font-bold text-rp-brand-strong">{index + 1}</span>
                  <span className="pt-1 text-sm leading-6 text-rp-text">{tr(step)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to={focus.to} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong rp-press">
                {tr(focus.action)} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              {focus.secondaryTo && (
                <Link to={focus.secondaryTo} className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border">
                  {tr(focus.secondaryLabel)}
                </Link>
              )}
            </div>
          </Card>
        </div>

        <section aria-labelledby="haru-more" className="mt-6">
          <h2 id="haru-more" className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Tiếp tục hành trình')}</h2>
          <ul style={{ '--rp-grid-min': '14.5rem' }} className="rp-fluid-grid-fill">
            {QUICK_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="rp-focus group flex items-center gap-3 rounded-rp-card border border-rp-line bg-rp-surface p-4 transition-colors hover:border-rp-brand-border">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-rp-muted text-[20px] text-rp-text-2"><Icon name={item.icon} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-rp-text">{tr(item.title)}</span>
                    <span className="block text-xs text-rp-text-muted">{tr(item.description)}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-rp-text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </LearnerShell>
  );
}
