import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';

/*
 * Dữ liệu mẫu lấy từ giao diện cũ.
 * Thay bằng dữ liệu API sổ tay khi tích hợp.
 */
const SAMPLE_KANJI = [
  {
    id: 'saku',
    character: '咲',
    meaning: 'Nở hoa',
    onyomi: 'ショウ',
    kunyomi: 'さ.く',
    strokes: 9,
    radical: '口',
    words: [
      {
        word: '咲く',
        reading: 'さく',
        meaning: 'Nở hoa',
      },
      {
        word: '咲き乱れる',
        reading: 'さきみだれる',
        meaning: 'Nở rộ khắp nơi',
      },
      {
        word: '返り咲き',
        reading: 'かえりざき',
        meaning: 'Nở lại; trở lại vị trí trước đây',
      },
    ],
  },
];

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

function ReadingBlock({ label, value }) {
  return (
    <div className="rounded-lg bg-[#FCF7F9] px-3 py-3">
      <p className="text-[11px] text-[#A08A95]">
        {label}
      </p>
      <p
        lang="ja"
        className="mt-2 font-['Noto_Sans_JP',sans-serif]
                   text-[20px] text-[#795563]"
      >
        {value || '—'}
      </p>
    </div>
  );
}

export default function KanjiNotebook() {
  const { pathname } = useLocation();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(SAMPLE_KANJI[0].id);
  const [notes, setNotes] = useState({});
  const [showMeaning, setShowMeaning] = useState(true);

  const keyword = search.trim().toLocaleLowerCase('vi-VN');

  const visibleItems = SAMPLE_KANJI.filter((item) => {
    const searchable = [
      item.character,
      item.meaning,
      item.onyomi,
      item.kunyomi,
      ...item.words.flatMap((word) => [
        word.word,
        word.reading,
        word.meaning,
      ]),
    ]
      .join(' ')
      .toLocaleLowerCase('vi-VN');

    return searchable.includes(keyword);
  });

  const selected = SAMPLE_KANJI.find(
    (item) => item.id === selectedId,
  );

  function selectKanji(id) {
    setSelectedId(id);
    setShowMeaning(true);
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb="Sổ tay Hán tự">
      <main
        data-page="KanjiNotebook"
        className="mx-auto max-w-[1240px] px-5 py-6
                   font-['Be_Vietnam_Pro',sans-serif]
                   text-[#49353F] lg:px-7"
      >
        {/* Tiêu đề */}
        <header
          className="mb-5 flex flex-wrap items-start
                     justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                lang="ja"
                className="font-['Noto_Serif_JP',serif]
                           text-[14px] text-[#B88A9E]"
              >
                漢字
              </span>
              <span className="text-[11px] text-[#AA8D9B]">
                Ôn lại từng chữ
              </span>
            </div>

            <h1
              className="mt-2 text-[25px] font-semibold
                         leading-tight tracking-tight"
            >
              Sổ tay Hán tự
            </h1>

            <p className="mt-1.5 text-[13px] text-[#967F8A]">
              Xem cách đọc, từ vựng và ghi chú của bạn.
            </p>
          </div>

          <Link
            to="/daily-srs"
            className="inline-flex min-h-9 items-center gap-2
                       rounded-lg border border-[#E7D7DF]
                       bg-white px-3 text-[12px] text-[#A47186]
                       hover:bg-[#FFF3F7]"
          >
            <Icon name="history" className="text-[17px]" />
            Ôn tập đến hạn
          </Link>
        </header>

        <div
          className="mb-4 flex items-start gap-2 rounded-lg
                     bg-[#F7EFF3] px-3 py-2.5
                     text-[11px] leading-5 text-[#A0808E]"
        >
          <Icon
            name="info"
            className="mt-0.5 shrink-0 text-[16px]"
          />
          <p>
            Nội dung minh họa. Ghi chú chưa được lưu vào tài khoản.
          </p>
        </div>

        <div
          className="grid items-start gap-4
                     lg:grid-cols-[230px_minmax(0,1fr)]"
        >
          {/* Danh sách */}
          <aside
            aria-label="Danh sách Hán tự"
            className="overflow-hidden rounded-xl border
                       border-[#EADFE5] bg-white
                       lg:sticky lg:top-[84px]"
          >
            <div className="border-b border-[#F0E7EC] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-[13px] font-medium">
                  Danh sách chữ
                </h2>
                <span className="text-[11px] text-[#B08E9E]">
                  {visibleItems.length}
                </span>
              </div>

              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute
                             left-2.5 top-1/2 -translate-y-1/2
                             text-[17px] text-[#B29DA7]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm chữ hoặc nghĩa..."
                  aria-label="Tìm Hán tự"
                  className="h-9 w-full rounded-lg border
                             border-[#EADFE5] bg-[#FDFBFC]
                             pl-8 pr-2 text-[12px] outline-none
                             focus:border-[#D6A2B5]
                             focus:ring-2
                             focus:ring-[#AD3155]/10"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {visibleItems.length ? (
                visibleItems.map((item) => {
                  const active = item.id === selectedId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectKanji(item.id)}
                      aria-pressed={active}
                      className={[
                        'flex w-full items-center gap-3',
                        'rounded-lg px-3 py-3 text-left',
                        'transition-colors',
                        active
                          ? 'bg-[#FCEAF2]'
                          : 'hover:bg-[#FFFAFC]',
                      ].join(' ')}
                    >
                      <span
                        lang="ja"
                        className="font-['Noto_Serif_JP',serif]
                                   text-[30px] text-[#A45B78]"
                      >
                        {item.character}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">
                          {item.meaning}
                        </span>
                        <span
                          lang="ja"
                          className="mt-1 block text-[12px]
                                     text-[#AE95A1]"
                        >
                          {item.kunyomi}
                        </span>
                      </span>

                      <Icon
                        name="chevron_right"
                        className="text-[17px] text-[#BE98A8]"
                      />
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-[12px] text-[#A08A95]">
                  Không tìm thấy chữ phù hợp.
                </p>
              )}
            </div>
          </aside>

          {/* Chi tiết */}
          {selected && (
            <div className="min-w-0 space-y-4">
              <section
                aria-label={`Chi tiết chữ ${selected.character}`}
                className="overflow-hidden rounded-2xl border
                           border-[#EADFE5] bg-white"
              >
                <header
                  className="flex flex-wrap items-center
                             justify-between gap-2
                             border-b border-[#F0E7EC]
                             px-5 py-3.5"
                >
                  <h2 className="text-[14px] font-medium">
                    Chữ và cách đọc
                  </h2>

                  <span className="text-[11px] text-[#AA8D9B]">
                    {selected.strokes} nét · Bộ {selected.radical}
                  </span>
                </header>

                <div
                  className="grid items-center gap-6 p-5
                             sm:grid-cols-[220px_minmax(0,1fr)]
                             sm:p-6"
                >
                  {/* Ô chữ Nhật làm điểm nhấn */}
                  <div
                    className="relative mx-auto flex aspect-square
                               w-full max-w-[220px] items-center
                               justify-center overflow-hidden
                               rounded-xl border border-[#ECD8E2]
                               bg-[#FFFAFC]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 220 220"
                      className="pointer-events-none absolute inset-0
                                 h-full w-full text-[#EBD7E0]"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M110 0V220 M0 110H220"
                        strokeDasharray="4 5"
                      />
                      <path
                        d="M0 0L220 220 M220 0L0 220"
                        strokeDasharray="3 6"
                        opacity="0.6"
                      />
                    </svg>

                    <span
                      lang="ja"
                      className="relative select-none
                                 font-['Noto_Serif_JP',serif]
                                 text-[140px] leading-none
                                 text-[#A95173]"
                    >
                      {selected.character}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] text-[#AE95A1]">
                      Nghĩa
                    </p>

                    <h3
                      className="mt-2 min-h-[34px]
                                 text-[25px] font-semibold
                                 text-[#795563]"
                    >
                      {showMeaning ? selected.meaning : '•••'}
                    </h3>

                    <button
                      type="button"
                      aria-pressed={!showMeaning}
                      onClick={() => setShowMeaning((current) => !current)}
                      className="mt-2 inline-flex items-center gap-1
                                 text-[11px] text-[#AE7C92]
                                 hover:text-[#AD3155]"
                    >
                      <Icon
                        name={showMeaning ? 'visibility_off' : 'visibility'}
                        className="text-[15px]"
                      />
                      {showMeaning ? 'Ẩn nghĩa để tự ôn' : 'Hiện nghĩa'}
                    </button>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <ReadingBlock
                        label="Âm On"
                        value={selected.onyomi}
                      />
                      <ReadingBlock
                        label="Âm Kun"
                        value={selected.kunyomi}
                      />
                    </div>

                    <Link
                      to="/kanji-writing?type=kanji"
                      className="mt-4 inline-flex min-h-9
                                 items-center gap-1.5 rounded-lg
                                 bg-[#AD3155] px-3.5 py-2
                                 text-[12px] font-medium text-white
                                 hover:bg-[#982B4B]"
                    >
                      <Icon name="draw" className="text-[17px]" />
                      Mở trang luyện viết Hán tự
                    </Link>
                  </div>
                </div>
              </section>

              {/* Từ vựng */}
              <section
                className="overflow-hidden rounded-xl
                           border border-[#EADFE5] bg-white"
              >
                <header
                  className="border-b border-[#F0E7EC]
                             px-5 py-3.5"
                >
                  <h2 className="text-[14px] font-medium">
                    Từ vựng đi kèm
                  </h2>
                </header>

                <div className="divide-y divide-[#F3EBEF]">
                  {selected.words.map((word) => (
                    <div
                      key={word.word}
                      className="grid gap-2 px-5 py-3.5
                                 sm:grid-cols-[1fr_1fr]"
                    >
                      <div>
                        <p
                          lang="ja"
                          className="font-['Noto_Sans_JP',sans-serif]
                                     text-[18px] text-[#795563]"
                        >
                          {word.word}
                        </p>
                        <p
                          lang="ja"
                          className="mt-1 text-[12px] text-[#AE95A1]"
                        >
                          {word.reading}
                        </p>
                      </div>

                      <p
                        className="self-center text-[13px]
                                   leading-6 text-[#967F8A]"
                      >
                        {word.meaning}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ghi chú */}
              <section
                className="rounded-xl border border-[#EADFE5]
                           bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="kanji-note"
                    className="text-[14px] font-medium"
                  >
                    Ghi chú của bạn
                  </label>

                  <span className="text-[10px] text-[#B39AA5]">
                    Chưa lưu vào tài khoản
                  </span>
                </div>

                <textarea
                  id="kanji-note"
                  rows={3}
                  maxLength={2000}
                  value={notes[selected.id] || ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNotes((current) => ({
                      ...current,
                      [selected.id]: value,
                    }));
                  }}
                  placeholder="Ghi cách nhớ hoặc đặt một câu ví dụ..."
                  className="mt-3 block w-full resize-y
                             rounded-lg border border-[#EBDDE5]
                             bg-[#FFFCFD] px-3 py-3
                             text-[13px] leading-6
                             text-[#795D6B] outline-none
                             placeholder:text-[#B7A1AC]
                             focus:border-[#D6A2B5]
                             focus:ring-2 focus:ring-[#AD3155]/10"
                />

                <p className="mt-2 text-[11px] text-[#AE95A1]">
                  Ghi chú sẽ mất khi tải lại hoặc rời trang.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
    </LearnerShell>
  );
}
