import { useLocale, translateTemplate } from '@/locales/locale.js';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '@/layouts';
import { LockKeyhole } from 'lucide-react';
import { FeatureLink } from '@/features/entitlements/components/StudyUnlock.jsx';
import { useStudyUnlock } from '@/features/entitlements/studyUnlock.js';
import { useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import StandardAssessmentRoadmap from './StandardAssessmentRoadmap.jsx';
import { StaleDataBar } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';

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
          to: '/vocabulary',
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
          title: 'Học nhóm cùng Mentor',
          description: 'Lớp 1–4 học viên, 10 tuần, chọn cường độ phù hợp.',
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

export default function RoadmapJLPT() {
  const { trf, locale, tr } = useLocale();
  const location = useLocation();
  const { pathname } = location;
  const { data: profile, isError: profileError, isFetching: profileFetching, refetch: retryProfile } = useLearnerProfile();
  const [selectedLevel, setLevel] = useState(null);
  const preferredLevel = profile?.targetJlptLevelName;
  const level = selectedLevel ?? (Object.hasOwn(LEVELS, preferredLevel) ? preferredLevel : 'N3');
  const [openStage, setOpenStage] = useState('knowledge');

  useEffect(() => {
    if (location.hash === '#self-study-roadmap-title' || location.hash === '#ai-roadmap-title') {
      document.getElementById('self-study-roadmap-title')?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash]);

  const stages = getStages(level);
  const currentIndex = stages.findIndex(
    (stage) => stage.id === openStage,
  );

  function chooseLevel(value) {
    setLevel(value);
    setOpenStage('knowledge');
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Lộ trình ôn luyện')}>
      <main
        data-page="RoadmapJLPT"
        className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text"
      >
        {/* Tiêu đề gọn */}
        <header
          className="mb-5 flex flex-wrap items-start
                     justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                lang="ja"
                className="font-['Noto_Serif_JP',serif]
                           text-[15px] text-rp-brand-strong"
              >
                道
              </span>
              <span className="text-[11px] text-rp-text-muted">
                {tr('Từng bước ôn luyện')}
              </span>
            </div>

            <h1
              className="mt-2 rp-type-page-title"
            >
              {tr('Lộ trình ôn thi JLPT')}
            </h1>

            <p className="mt-2 rp-type-secondary text-rp-text-muted">
              {tr('Ôn kiến thức, luyện kỹ năng và xem lại kết quả.')}
            </p>
          </div>

          <Link
            to="/onboarding"
            className="inline-flex min-h-9 items-center gap-1.5
                       rounded-lg border border-rp-line
                       bg-white px-3 text-[12px] text-rp-brand-strong
                       hover:bg-rp-brand-tint"
          >
            <Icon name="flag" className="text-[16px]" />
            {tr('Đổi mục tiêu')}
          </Link>
        </header>

        {profileError && (
          <StaleDataBar
            className="mb-5"
            label={tr('Chưa tải được mục tiêu JLPT cá nhân — đang hiển thị lộ trình tham khảo.')}
            onRetry={() => retryProfile()}
            retrying={profileFetching}
          />
        )}

        <StandardAssessmentRoadmap targetLevelId={profile?.targetJlptLevelId} />

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

        <div
          className="rp-cq-two-col items-start"
        >
          {/* Lộ trình chính */}
          <section aria-labelledby="roadmap-stages-title" className="min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="roadmap-stages-title"
                className="text-[16px] font-semibold"
              >
                {tr('Tài nguyên ôn luyện')}
              </h2>
              <span className="text-[11px] text-rp-text-muted">
                {locale === 'ja' ? `4ステップ · JLPT ${level}` : trf('4 chặng · JLPT {0}', { 0: level })}
              </span>
            </div>

            <ol className="space-y-3">
              {stages.map((stage, index) => {
                const open = openStage === stage.id;

                return (
                  <li key={stage.id} className="relative flex gap-3">
                    {/* Đường dẫn nối các chặng */}
                    <div className="relative flex w-9 shrink-0 justify-center">
                      {index < stages.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-[-12px] top-9
                                     w-px bg-[#EAD7E0]"
                        />
                      )}

                      <span
                        aria-hidden="true"
                        className={[
                          'relative z-10 mt-3 flex h-8 w-8',
                          'items-center justify-center rounded-full',
                          'border text-[11px] font-medium',
                          open
                            ? 'border-rp-brand-strong bg-rp-brand-strong text-white'
                            : 'border-rp-line bg-rp-brand-tint text-rp-brand-strong',
                        ].join(' ')}
                      >
                        {stage.number}
                      </span>
                    </div>

                    <div
                      className={[
                        'min-w-0 flex-1 overflow-hidden rounded-xl',
                        'border bg-white',
                        open ? 'border-rp-brand-border' : 'border-rp-line',
                      ].join(' ')}
                    >
                      <h3>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`stage-${stage.id}`}
                          onClick={() =>
                            setOpenStage(open ? null : stage.id)
                          }
                          className={[
                            'flex w-full items-center justify-between',
                            'gap-3 px-4 py-4 text-left',
                            'focus-visible:outline-none',
                            'focus-visible:ring-2 focus-visible:ring-inset',
                            'focus-visible:ring-rp-brand-strong/25',
                            open ? 'bg-rp-brand-tint' : 'hover:bg-rp-brand-tint',
                          ].join(' ')}
                        >
                          <span className="min-w-0">
                            <span
                              lang="ja"
                              className="block font-['Noto_Sans_JP',sans-serif]
                                         text-[10px] tracking-wider text-rp-brand"
                            >
                              {stage.japanese}
                            </span>

                            <span
                              className="mt-1 block text-[15px]
                                         font-medium text-rp-text-2"
                            >
                              {tr(stage.title)}
                            </span>

                            {!open && (
                              <span
                                className="mt-1 block text-[12px]
                                           leading-5 text-rp-text-muted"
                              >
                                {tr(stage.description)}
                              </span>
                            )}
                          </span>

                          <Icon
                            name="expand_more"
                            className={`shrink-0 text-[20px] text-rp-brand
                                        transition-transform ${
                                          open ? 'rotate-180' : ''
                                        }`}
                          />
                        </button>
                      </h3>

                      {open && (
                        <div id={`stage-${stage.id}`} className="px-3 pb-3">
                          <p className="px-1 pb-2 pt-3 text-[12px] text-rp-text-muted">
                            {tr(stage.description)}
                          </p>

                          <div className="divide-y divide-rp-line">
                            {stage.tasks.map((task) => (
                              <TaskRow key={task.title} task={task} />
                            ))}
                          </div>

                          {index < stages.length - 1 && (
                            <div
                              className="mt-2 flex justify-end
                                         border-t border-rp-line pt-3"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenStage(stages[index + 1].id)
                                }
                                className="inline-flex items-center gap-1
                                           rounded px-2 py-1 text-[12px]
                                           text-rp-brand-strong hover:text-rp-brand-strong"
                              >
                                {tr('Xem chặng tiếp')}
                                <Icon name="arrow_forward" className="text-[15px]" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Thông tin hỗ trợ */}
          <aside className="space-y-4 xl:sticky xl:top-[84px]">
            <section
              className="rounded-xl border border-rp-line
                         bg-white p-4"
            >
              <h2 className="text-[14px] font-medium">
                {tr('Đang xem')}
              </h2>

              <div className="mt-4 flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center
                             justify-center rounded-xl bg-rp-brand-soft
                             text-[17px] font-semibold text-rp-brand-strong"
                >
                  {level}
                </span>
                <div>
                  <p className="text-[13px] font-medium">
                    JLPT {level}
                  </p>
                  <p className="mt-1 text-[11px] text-rp-text-muted">
                    {tr(LEVELS[level].label)}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-rp-line pt-3">
                <p className="text-[12px] text-rp-text-muted">
                  {currentIndex >= 0
                    ? (locale === 'ja'
                      ? `ステップ ${currentIndex + 1}: ${tr(stages[currentIndex].title)}`
                      : trf('Chặng {0}: {1}', { 0: currentIndex + 1, 1: stages[currentIndex].title }))
                    : tr('Chọn một chặng để xem nội dung.')}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-rp-text-muted">
                  {tr('Chọn chặng để mở tài nguyên theo cấp độ.')}
                </p>
              </div>
            </section>

            <section
              className="rounded-xl border border-rp-line
                         bg-rp-brand-tint p-4"
            >
              <div className="flex items-center gap-2">
                <Icon
                  name="history"
                  className="text-[19px] text-rp-brand-strong"
                />
                <h2 className="text-[13px] font-medium">
                  {tr('Duy trì ôn tập')}
                </h2>
              </div>

              <p className="mt-2 text-[12px] leading-6 text-rp-text-muted">
                {tr('Xen kẽ luyện đề với ôn lại nội dung đã lưu để việc ôn tập có trọng tâm.')}
              </p>

              <Link
                to="/daily-srs"
                className="mt-3 inline-flex items-center gap-1
                           text-[12px] font-medium text-rp-brand-strong"
              >
                {tr('Ôn tập đến hạn')}
                <Icon name="arrow_forward" className="text-[15px]" />
              </Link>
            </section>

            <Link
              to="/mentors"
              className="flex items-center gap-3 rounded-xl
                         border border-rp-line bg-white p-4
                         transition-colors hover:bg-rp-brand-tint"
            >
              <Icon
                name="support_agent"
                className="text-[22px] text-rp-brand"
              />
              <span className="flex-1">
                <span className="block text-[13px] font-medium">
                  {tr('Cần hướng dẫn thêm?')}
                </span>
                <span className="mt-1 block text-[11px] text-rp-text-muted">
                  {tr('Học nhóm cùng Mentor')}
                </span>
              </span>
              <Icon
                name="chevron_right"
                className="text-[18px] text-rp-brand"
              />
            </Link>
          </aside>
        </div>
      </main>
    </LearnerShell>
  );
}
