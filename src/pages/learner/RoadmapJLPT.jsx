import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';

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
          description: content.grammar,
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
      tasks:
        level === 'N3'
          ? [
              {
                icon: 'quiz',
                title: 'Thi thử JLPT N3',
                description: 'Thử sức với đề N3 và xem kết quả bài làm.',
                to: '/exam-n3',
              },
              {
                icon: 'fact_check',
                title: 'Xem kết quả',
                description: 'Đối chiếu kết quả qua các lần làm đề.',
                to: '/exam-result',
              },
            ]
          : [
              {
                icon: 'quiz',
                title: `Thi thử JLPT ${level}`,
                description:
                  'Chưa cấu hình đường dẫn danh sách đề cho cấp độ này.',
                to: null,
              },
              {
                icon: 'fact_check',
                title: 'Xem kết quả',
                description: 'Xem lại các bài thi đã thực hiện.',
                to: '/exam-result',
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
          icon: 'support_agent',
          title: 'Tư vấn Mentor',
          description: 'Trao đổi khi cần điều chỉnh kế hoạch ôn luyện.',
          to: '/mentor',
        },
      ],
    },
  ];
}

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

function TaskRow({ task }) {
  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center
                   justify-center rounded-lg bg-[#FAF0F5]
                   text-[#B47F95]"
      >
        <Icon name={task.icon} className="text-[20px]" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-[#62505A]">
          {task.title}
        </span>

        <span className="mt-1 block text-[12px] leading-5 text-[#967F8A]">
          {task.description}
        </span>
      </span>

      {task.to && (
        <Icon
          name="arrow_forward"
          className="shrink-0 text-[17px] text-[#BE98A8]"
        />
      )}
    </>
  );

  const className =
    'flex items-center gap-3 rounded-xl px-3 py-3 text-left ' +
    'transition-colors ' +
    (task.to
      ? 'hover:bg-[#FCF5F8] focus-visible:outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-[#AD3155]/25'
      : 'bg-[#FCFAFB]');

  return task.to ? (
    <Link to={task.to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function RoadmapJLPT() {
  const { pathname } = useLocation();

  const [level, setLevel] = useState('N3');
  const [openStage, setOpenStage] = useState('knowledge');

  const stages = getStages(level);
  const currentIndex = stages.findIndex(
    (stage) => stage.id === openStage,
  );

  function chooseLevel(value) {
    setLevel(value);
    setOpenStage('knowledge');
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb="Lộ trình ôn luyện">
      <main
        data-page="RoadmapJLPT"
        className="mx-auto max-w-[1240px] px-5 py-6
                   font-['Be_Vietnam_Pro',sans-serif]
                   text-[#49353F] lg:px-7"
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
                           text-[15px] text-[#B47F95]"
              >
                道
              </span>
              <span className="text-[11px] text-[#AA8D9B]">
                Từng bước ôn luyện
              </span>
            </div>

            <h1
              className="mt-2 text-[26px] font-semibold
                         leading-tight tracking-tight"
            >
              Lộ trình ôn thi JLPT
            </h1>

            <p className="mt-2 text-[13px] text-[#967F8A]">
              Ôn kiến thức, luyện kỹ năng và xem lại kết quả.
            </p>
          </div>

          <Link
            to="/onboarding"
            className="inline-flex min-h-9 items-center gap-1.5
                       rounded-lg border border-[#E7D7DF]
                       bg-white px-3 text-[12px] text-[#A47186]
                       hover:bg-[#FFF3F7]"
          >
            <Icon name="flag" className="text-[16px]" />
            Đổi mục tiêu
          </Link>
        </header>

        {/* Chọn cấp độ */}
        <section
          aria-label="Chọn cấp độ xem lộ trình"
          className="mb-5 rounded-xl border border-[#EADFE5]
                     bg-white px-4 py-3.5"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[12px] text-[#A08A95]">
              Cấp độ
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
                      'focus-visible:ring-[#AD3155]/25',
                      active
                        ? 'border-[#E8B8CB] bg-[#FCEAF2] text-[#A33E61]'
                        : 'border-[#EFE5EA] text-[#967F8A] hover:bg-[#FFF7FA]',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{key}</span>
                    <span className="hidden sm:inline">{value.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-5 text-[#A08A95]">
            {LEVELS[level].description}
          </p>
        </section>

        <div
          className="grid items-start gap-5
                     xl:grid-cols-[minmax(0,1fr)_260px]"
        >
          {/* Lộ trình chính */}
          <section aria-labelledby="roadmap-stages-title" className="min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="roadmap-stages-title"
                className="text-[16px] font-semibold"
              >
                Các chặng ôn luyện
              </h2>
              <span className="text-[11px] text-[#AA8D9B]">
                4 chặng · JLPT {level}
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
                            ? 'border-[#AD3155] bg-[#AD3155] text-white'
                            : 'border-[#E7D7DF] bg-[#FAF4F7] text-[#AF8698]',
                        ].join(' ')}
                      >
                        {stage.number}
                      </span>
                    </div>

                    <div
                      className={[
                        'min-w-0 flex-1 overflow-hidden rounded-xl',
                        'border bg-white',
                        open ? 'border-[#E4B8C9]' : 'border-[#EADFE5]',
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
                            'focus-visible:ring-[#AD3155]/25',
                            open ? 'bg-[#FFF7FA]' : 'hover:bg-[#FFFBFD]',
                          ].join(' ')}
                        >
                          <span className="min-w-0">
                            <span
                              lang="ja"
                              className="block font-['Noto_Sans_JP',sans-serif]
                                         text-[10px] tracking-wider text-[#BD8FA2]"
                            >
                              {stage.japanese}
                            </span>

                            <span
                              className="mt-1 block text-[15px]
                                         font-medium text-[#62505A]"
                            >
                              {stage.title}
                            </span>

                            {!open && (
                              <span
                                className="mt-1 block text-[12px]
                                           leading-5 text-[#A08A95]"
                              >
                                {stage.description}
                              </span>
                            )}
                          </span>

                          <Icon
                            name="expand_more"
                            className={`shrink-0 text-[20px] text-[#B99AA8]
                                        transition-transform ${
                                          open ? 'rotate-180' : ''
                                        }`}
                          />
                        </button>
                      </h3>

                      {open && (
                        <div id={`stage-${stage.id}`} className="px-3 pb-3">
                          <p className="px-1 pb-2 pt-3 text-[12px] text-[#A08A95]">
                            {stage.description}
                          </p>

                          <div className="divide-y divide-[#F3EBEF]">
                            {stage.tasks.map((task) => (
                              <TaskRow key={task.title} task={task} />
                            ))}
                          </div>

                          {index < stages.length - 1 && (
                            <div
                              className="mt-2 flex justify-end
                                         border-t border-[#F3EBEF] pt-3"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenStage(stages[index + 1].id)
                                }
                                className="inline-flex items-center gap-1
                                           rounded px-2 py-1 text-[12px]
                                           text-[#AE6C87] hover:text-[#AD3155]"
                              >
                                Xem chặng tiếp
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
              className="rounded-xl border border-[#EADFE5]
                         bg-white p-4"
            >
              <h2 className="text-[14px] font-medium">
                Đang xem
              </h2>

              <div className="mt-4 flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center
                             justify-center rounded-xl bg-[#F9E8F0]
                             text-[17px] font-semibold text-[#A84466]"
                >
                  {level}
                </span>
                <div>
                  <p className="text-[13px] font-medium">
                    JLPT {level}
                  </p>
                  <p className="mt-1 text-[11px] text-[#A08A95]">
                    {LEVELS[level].label}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[#F0E7EC] pt-3">
                <p className="text-[12px] text-[#947584]">
                  {currentIndex >= 0
                    ? `Chặng ${currentIndex + 1}: ${stages[currentIndex].title}`
                    : 'Chọn một chặng để xem nội dung.'}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[#AE95A1]">
                  Đây là thứ tự ôn tập gợi ý. Bạn có thể mở
                  bất kỳ chặng nào.
                </p>
              </div>
            </section>

            <section
              className="rounded-xl border border-[#EEDCE5]
                         bg-[#FCF2F6] p-4"
            >
              <div className="flex items-center gap-2">
                <Icon
                  name="history"
                  className="text-[19px] text-[#B77E95]"
                />
                <h2 className="text-[13px] font-medium">
                  Duy trì ôn tập
                </h2>
              </div>

              <p className="mt-2 text-[12px] leading-6 text-[#A0808E]">
                Xen kẽ luyện đề với ôn lại nội dung đã lưu
                để việc ôn tập có trọng tâm.
              </p>

              <Link
                to="/daily-srs"
                className="mt-3 inline-flex items-center gap-1
                           text-[12px] font-medium text-[#A84466]"
              >
                Ôn tập đến hạn
                <Icon name="arrow_forward" className="text-[15px]" />
              </Link>
            </section>

            <Link
              to="/mentor"
              className="flex items-center gap-3 rounded-xl
                         border border-[#EADFE5] bg-white p-4
                         transition-colors hover:bg-[#FFFAFC]"
            >
              <Icon
                name="support_agent"
                className="text-[22px] text-[#B48A9C]"
              />
              <span className="flex-1">
                <span className="block text-[13px] font-medium">
                  Cần hướng dẫn thêm?
                </span>
                <span className="mt-1 block text-[11px] text-[#A08A95]">
                  Trao đổi cùng Mentor
                </span>
              </span>
              <Icon
                name="chevron_right"
                className="text-[18px] text-[#B99AA8]"
              />
            </Link>
          </aside>
        </div>
      </main>
    </LearnerShell>
  );
}
