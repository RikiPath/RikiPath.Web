import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { translateTemplate, useLocale } from '@/locales/locale.js';
import { FeatureLink } from '@/features/entitlements/components/StudyUnlock.jsx';
import { useStudyUnlock } from '@/features/entitlements/studyUnlock.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import Icon from '@/components/ui/Icon.jsx';

// Supplementary self-review resources per JLPT level (static navigation to existing study areas).
// Collapsed by default so the Journey Map stays the primary content of /roadmap.
const LEVELS = {
  N5: {
    label: 'Nền tảng',
    description: 'Ôn kiến thức cơ bản và làm quen cách làm đề.',
    vocabulary: 'Từ vựng quen thuộc và chữ Hán cơ bản.',
    grammar: 'Trợ từ, chia động từ và mẫu câu đơn giản.',
    reading: 'Câu ngắn, thông báo và hội thoại thường ngày.',
    listening: 'Nghe thông tin đơn giản và ý chính.',
  },
  N4: {
    label: 'Sơ cấp',
    description: 'Củng cố kiến thức sơ cấp và luyện theo từng kỹ năng.',
    vocabulary: 'Từ vựng đời sống và chữ Hán thường gặp.',
    grammar: 'Các dạng động từ và mẫu câu sơ cấp.',
    reading: 'Đoạn văn ngắn và thông tin trong đời sống.',
    listening: 'Hội thoại quen thuộc và thông tin cần thiết.',
  },
  N3: {
    label: 'Trung cấp',
    description: 'Ôn có trọng tâm, luyện đọc nghe và kiểm tra qua đề thi.',
    vocabulary: 'Từ vựng theo chủ đề và các chữ Hán dễ nhầm.',
    grammar: 'Phân biệt mẫu câu gần nghĩa và cách dùng.',
    reading: 'Đoạn văn, thông báo và tìm kiếm thông tin.',
    listening: 'Nắm ý chính và theo dõi diễn biến hội thoại.',
  },
  N2: {
    label: 'Nâng cao',
    description: 'Luyện xử lý nội dung dài và phân bổ thời gian làm đề.',
    vocabulary: 'Từ ghép, cách kết hợp từ và sắc thái nghĩa.',
    grammar: 'Mẫu câu nâng cao và quan hệ giữa các ý.',
    reading: 'Văn bản dài, lập luận và quan điểm tác giả.',
    listening: 'Thông tin chi tiết và ý định người nói.',
  },
};

function getStages(level) {
  const content = LEVELS[level];

  return [
    {
      id: 'knowledge',
      number: '01',
      japanese: '語彙・文法',
      title: 'Củng cố kiến thức',
      description: 'Từ vựng, Hán tự và ngữ pháp theo cấp độ.',
      tasks: [
        {
          icon: 'translate',
          title: 'Từ vựng',
          description: content.vocabulary,
          to: '/kanji-notebook?tab=vocab-bank',
        },
        {
          icon: 'draw',
          title: 'Hán tự',
          description: 'Ôn cách đọc, nghĩa và phân biệt mặt chữ.',
          to: '/kanji-writing?type=kanji',
        },
        {
          icon: 'menu_book',
          title: 'Bài luyện tập',
          description: 'Một bài đã duyệt gồm từ vựng, Kanji và ngữ pháp.',
          to: '/lessons',
        },
      ],
    },
    {
      id: 'skills',
      number: '02',
      japanese: '読解・聴解',
      title: 'Luyện đọc và nghe',
      description: 'Luyện từng kỹ năng trước khi làm đề tổng hợp.',
      tasks: [
        {
          icon: 'auto_stories',
          title: 'Đọc hiểu',
          description: content.reading,
          to: '/riki/reading',
        },
        {
          icon: 'headphones',
          title: 'Nghe hiểu',
          description: content.listening,
          to: '/riki/listening',
        },
      ],
    },
    {
      id: 'exam',
      number: '03',
      japanese: '模擬試験',
      title: 'Luyện đề thi thử',
      description: 'Làm đề và rèn cách phân bổ thời gian.',
      tasks: [
        {
          icon: 'quiz',
          title: translateTemplate('Thi thử JLPT {0}', { 0: level }),
          description: 'Chọn đề và làm bài có giới hạn thời gian.',
          to: '/mock-tests/?level=' + level,
        },
        {
          icon: 'fact_check',
          title: 'Xem kết quả thi thử',
          description: 'Xem lại các lượt thi đã thực hiện.',
          to: '/exam-result/',
        },
      ],
    },
    {
      id: 'review',
      number: '04',
      japanese: '復習',
      title: 'Ôn lại và điều chỉnh',
      description: 'Quay lại nội dung cần củng cố sau mỗi lần luyện.',
      tasks: [
        {
          icon: 'history',
          title: 'Ôn tập đến hạn',
          description: 'Ôn lại từ vựng và Hán tự theo lịch nhắc lại.',
          to: '/daily-srs',
        },
        {
          icon: 'bookmarks',
          title: 'Sổ tay cá nhân',
          description: 'Xem lại những nội dung bạn đã lưu.',
          to: '/kanji-notebook',
        },
        {
          icon: 'groups',
          title: 'Học nhóm cùng Giáo viên',
          description: 'Luyện giao tiếp và sửa bài trực tiếp cùng Giáo viên.',
          to: '/mentors',
        },
      ],
    },
  ];
}


function TaskRow({ task }) {
  const { locale, tr } = useLocale();
  const unlock = useStudyUnlock();
  const locked = Boolean(task.to && unlock?.access.lockStateFor(task.to) === 'locked');
  const title = task.title.startsWith('Thi thử JLPT ')
    ? (locale === 'ja' ? `JLPT ${task.title.slice('Thi thử JLPT '.length)} 模擬試験` : task.title)
    : tr(task.title);
  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center
                   justify-center rounded-lg bg-rp-brand-tint
                   text-rp-brand-strong"
      >
        <Icon name={task.icon} className="text-[20px]" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-rp-text-2">
          {tr(title)}
        </span>

        <span className="mt-1 block text-[12px] leading-5 text-rp-text-muted">
          {tr(task.description)}
        </span>
      </span>

      {task.to && (locked ? (
        <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
      ) : (
        <Icon
          name="arrow_forward"
          className="shrink-0 text-[17px] text-rp-brand"
        />
      ))}
    </>
  );

  const className =
    'flex items-center gap-3 rounded-xl px-3 py-3 text-left ' +
    'transition-colors ' +
    (task.to
      ? 'rp-interactive hover:bg-rp-brand-tint focus-visible:outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-rp-brand-strong/25'
      : 'bg-rp-bg-2');

  return task.to ? (
    <FeatureLink to={task.to} label={title} className={className} showLock={false}>
      {content}
    </FeatureLink>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function SupplementaryResources({ preferredLevel }) {
  const { trf, locale, tr } = useLocale();
  const [selectedLevel, setLevel] = useState(null);
  const level = selectedLevel ?? (Object.hasOwn(LEVELS, preferredLevel) ? preferredLevel : 'N3');
  const [openStage, setOpenStage] = useState('knowledge');
  const stages = getStages(level);
  const currentIndex = stages.findIndex((stage) => stage.id === openStage);

  function chooseLevel(value) {
    setLevel(value);
    setOpenStage('knowledge');
  }

  return (
        <details className="group mt-6 rounded-xl border border-rp-line bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-rp-text hover:text-rp-brand-strong">
            <span>{tr('Tài nguyên tự ôn bổ trợ theo cấp độ N5–N2')}</span>
            <span className="text-xs font-normal text-rp-text-muted group-open:hidden">{tr('Mở xem thêm')}</span>
            <span className="hidden text-xs font-normal text-rp-text-muted group-open:inline">{tr('Thu gọn')}</span>
          </summary>
          <div className="border-t border-rp-line p-4 sm:p-5">

        {/* Chọn cấp độ */}
        <section
          aria-label={tr('Chọn cấp độ tài nguyên ôn luyện')}
          className="mb-5 rounded-xl border border-rp-line
                     bg-white px-4 py-3.5"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[12px] text-rp-text-muted">
              {tr('Cấp độ')}
            </span>

            <div className="flex flex-wrap gap-2">
              {Object.entries(LEVELS).map(([key, value]) => {
                const active = level === key;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseLevel(key)}
                    className={[
                      'inline-flex min-h-9 items-center gap-2',
                      'rounded-lg border px-3 text-[12px]',
                      'transition-colors focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-rp-brand-strong/25',
                      active
                        ? 'border-rp-brand-border bg-rp-brand-soft text-rp-brand-strong'
                        : 'border-rp-line text-rp-text-muted hover:bg-rp-brand-tint',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{key}</span>
                    <span className="hidden sm:inline">{tr(value.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-5 text-rp-text-muted">
            {tr(LEVELS[level].description)}
          </p>
        </section>

        <div className="space-y-5">
          {/* Lộ trình tài nguyên chính dạng sơ đồ nhánh ngang (Left -> Right) */}
          <section aria-labelledby="roadmap-stages-title" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2
                id="roadmap-stages-title"
                className="text-[16px] font-semibold text-rp-text"
              >
                {tr('Tài nguyên ôn luyện theo chặng')}
              </h2>
              <span className="text-[11px] font-medium text-rp-text-muted">
                {locale === 'ja' ? `4ステップ · JLPT ${level}` : trf('4 chặng · JLPT {0}', { 0: level })}
              </span>
            </div>

            <div className="overflow-x-auto pb-3 scroll-smooth snap-x snap-proximity">
              <ol className="inline-flex min-w-max items-start pt-1">
                {stages.map((stage, index) => {
                  const active = openStage === stage.id;
                  const hasNext = index < stages.length - 1;

                  return (
                    <li
                      key={stage.id}
                      className="w-[292px] shrink-0 snap-start pr-4 last:pr-0"
                    >
                      {/* Horizontal Left -> Right Connector Spine + Circular Stage Node */}
                      <div className="flex items-center">
                        <span
                          aria-hidden="true"
                          className={[
                            'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
                            active
                              ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white ring-4 ring-rp-brand-tint shadow-xs'
                              : 'border-rp-line bg-white text-rp-brand-strong',
                          ].join(' ')}
                        >
                          {stage.number}
                        </span>
                        <span
                          aria-hidden="true"
                          className={[
                            'h-[2px] flex-1',
                            hasNext
                              ? active
                                ? 'bg-rp-brand-border'
                                : 'bg-[#EAD7E0]'
                              : 'bg-transparent',
                          ].join(' ')}
                        />
                      </div>

                      {/* Stage Header Card */}
                      <div
                        className={[
                          'mt-2.5 overflow-hidden rounded-xl border bg-white shadow-rp-xs transition-colors',
                          active ? 'border-rp-brand-border ring-1 ring-rp-brand-tint' : 'border-rp-line',
                        ].join(' ')}
                      >
                        <h3>
                          <button
                            type="button"
                            aria-expanded={active}
                            aria-controls={`stage-${stage.id}`}
                            onClick={() => setOpenStage(stage.id)}
                            className={[
                              'rp-focus flex w-full items-start justify-between gap-2 px-3.5 py-3 text-left transition-colors',
                              active ? 'bg-white' : 'hover:bg-rp-row-hover',
                            ].join(' ')}
                          >
                            <span className="min-w-0">
                              <span
                                lang="ja"
                                className="block font-['Noto_Sans_JP',sans-serif] text-[10px] tracking-wider text-rp-brand"
                              >
                                {stage.japanese}
                              </span>
                              <span className="mt-0.5 block text-[14px] font-bold text-rp-text">
                                {tr(stage.title)}
                              </span>
                              <span className="mt-1 block text-[11.5px] leading-4 text-rp-text-muted">
                                {tr(stage.description)}
                              </span>
                            </span>
                            {hasNext && (
                              <Icon
                                name="arrow_forward"
                                className="mt-1 shrink-0 text-[16px] text-rp-brand-border"
                              />
                            )}
                          </button>
                        </h3>
                      </div>

                      {/* Sub-Branches hanging neatly from each Stage Node */}
                      <div id={`stage-${stage.id}`} className="ml-[15px]">
                        <ul className="space-y-2 border-l-2 border-[#EAD7E0] pl-3 pt-2.5">
                          {stage.tasks.map((task) => (
                            <li key={task.title} className="relative">
                              <span
                                aria-hidden="true"
                                className="absolute -left-3 top-6 h-[2px] w-3 bg-[#EAD7E0]"
                              />
                              <span
                                aria-hidden="true"
                                className="absolute -left-[16px] top-[21px] h-2 w-2 rounded-full border border-rp-brand-border bg-white"
                              />
                              <div className="overflow-hidden rounded-xl border border-rp-line bg-white shadow-rp-xs">
                                <TaskRow task={task} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Hàng thông tin hỗ trợ gọn ngang bên dưới cây lộ trình */}
          <div className="grid gap-3 md:grid-cols-3">
            <section className="rounded-xl border border-rp-line bg-white p-4">
              <h2 className="text-[13px] font-semibold text-rp-text-muted">
                {tr('Đang xem')}
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rp-brand-soft text-[17px] font-semibold text-rp-brand-strong">
                  {level}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-rp-text">
                    {formatJlptLevel(level)} · {tr(LEVELS[level].label)}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-rp-text-muted">
                    {currentIndex >= 0
                      ? (locale === 'ja'
                        ? `ステップ ${currentIndex + 1}: ${tr(stages[currentIndex].title)}`
                        : trf('Chặng {0}: {1}', { 0: currentIndex + 1, 1: stages[currentIndex].title }))
                      : tr('Chọn một chặng để xem nội dung.')}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-rp-line bg-white p-4">
              <div className="flex items-center gap-2">
                <Icon name="history" className="text-[19px] text-rp-brand-strong" />
                <h2 className="text-[13px] font-semibold text-rp-text">
                  {tr('Duy trì ôn tập')}
                </h2>
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-rp-text-muted">
                {tr('Xen kẽ luyện đề với ôn lại nội dung đã lưu để việc ôn tập có trọng tâm.')}
              </p>
              <Link
                to="/daily-srs"
                className="rp-link mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold"
              >
                {tr('Ôn tập đến hạn')}
                <Icon name="arrow_forward" className="text-[15px]" />
              </Link>
            </section>

            <Link
              to="/mentors"
              className="rp-card-hover rp-interactive flex items-center gap-3 rounded-xl border border-rp-line bg-white p-4 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
            >
              <Icon name="support_agent" className="rp-icon-tilt text-[22px] text-rp-brand" />
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-rp-text">
                  {tr('Cần hướng dẫn thêm?')}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-rp-text-muted">
                  {tr('Học nhóm cùng Giáo viên')}
                </span>
              </span>
              <Icon name="chevron_right" className="text-[18px] text-rp-brand" />
            </Link>
          </div>
        </div>
              </div>
            </details>
  );
}
