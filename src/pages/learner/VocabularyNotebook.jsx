import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';
import { useLearnerHome } from '../../hooks/useLearnerHome.js';

const LEVELS = ['N5', 'N4', 'N3', 'N2'];

const STATUS = {
  due: { label: 'Cần ôn', tone: 'due' },
  review: { label: 'Đang ôn', tone: 'review' },
  known: { label: 'Nhớ sâu', tone: 'known' },
  new: { label: 'Mới lưu', tone: 'new' },
};

const SAMPLE_WORDS = [
  {
    id: 'keiken',
    word: '経験',
    reading: 'けいけん',
    hanviet: 'Kinh nghiệm',
    meaning: 'Kinh nghiệm, trải nghiệm đã tích lũy',
    level: 'N3',
    tag: 'Công việc',
    status: 'review',
    stage: 3,
    lastReview: 'Hôm qua',
  },
  {
    id: 'kaizen',
    word: '改善',
    reading: 'かいぜん',
    hanviet: 'Cải thiện',
    meaning: 'Cải tiến, làm cho tốt hơn',
    level: 'N3',
    tag: 'Công việc',
    status: 'due',
    stage: 1,
    lastReview: '4 ngày trước',
  },
  {
    id: 'annai',
    word: '案内する',
    reading: 'あんないする',
    hanviet: 'Án nội',
    meaning: 'Hướng dẫn, dẫn đường',
    level: 'N4',
    tag: 'Giao thông',
    status: 'known',
    stage: 4,
    lastReview: '3 ngày trước',
  },
  {
    id: 'yakusoku',
    word: '約束',
    reading: 'やくそく',
    hanviet: 'Ước thúc',
    meaning: 'Lời hứa, cuộc hẹn',
    level: 'N4',
    tag: 'Đời sống',
    status: 'due',
    stage: 2,
    lastReview: '6 ngày trước',
  },
  {
    id: 'junbi',
    word: '準備',
    reading: 'じゅんび',
    hanviet: 'Chuẩn bị',
    meaning: 'Chuẩn bị, sắp xếp',
    level: 'N4',
    tag: 'Cơ bản',
    status: 'new',
    stage: 0,
    lastReview: '12 giờ trước',
  },
];

function Icon({ name, className = '', filled = false }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

function speakJapanese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function downloadCsv(rows) {
  const header = ['Từ', 'Cách đọc', 'Hán Việt', 'Nghĩa', 'Cấp độ', 'Trạng thái'];
  const lines = [
    header,
    ...rows.map((word) => [
      word.word,
      word.reading,
      word.hanviet,
      word.meaning,
      word.level,
      STATUS[word.status]?.label ?? word.status,
    ]),
  ];
  const csv = lines
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'so-tu-minh-hoa.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function StageDots({ stage }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 w-1.5 rounded-full ${
            index < stage ? 'bg-[#AD3155]' : 'bg-[#E7D5DC]'
          }`}
        />
      ))}
    </span>
  );
}

export default function VocabularyNotebook() {
  const { pathname } = useLocation();
  const { profile, streak, srs } = useLearnerHome();
  const searchRef = useRef(null);

  const [words, setWords] = useState(SAMPLE_WORDS);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    word: '',
    reading: '',
    hanviet: '',
    meaning: '',
    level: 'N3',
  });

  const streakDays = streak?.currentStreakDays;
  const dueCount = Number(srs?.totalDue ?? srs?.items?.length);
  const levelName = profile?.targetJlptLevelName;

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const keyword = search.trim().toLocaleLowerCase('vi-VN');

  const searched = useMemo(() => {
    return words.filter((word) => {
      if (level !== 'all' && word.level !== level) return false;
      if (!keyword) return true;
      return [word.word, word.reading, word.hanviet, word.meaning, word.tag]
        .join(' ')
        .toLocaleLowerCase('vi-VN')
        .includes(keyword);
    });
  }, [words, level, keyword]);

  const counts = useMemo(() => {
    return searched.reduce((map, word) => {
      map[word.status] = (map[word.status] ?? 0) + 1;
      return map;
    }, {});
  }, [searched]);

  const visible = status === 'all'
    ? searched
    : searched.filter((word) => word.status === status);

  const visibleIds = visible.map((word) => word.id);
  const allVisibleSelected = visibleIds.length > 0
    && visibleIds.every((id) => selected.has(id));

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function addWord(event) {
    event.preventDefault();
    const word = draft.word.trim();
    const reading = draft.reading.trim();
    if (!word || !reading) return;
    setWords((current) => [
      {
        id: `local-${Date.now()}`,
        word,
        reading,
        hanviet: draft.hanviet.trim() || '—',
        meaning: draft.meaning.trim() || 'Chưa có nghĩa',
        level: draft.level,
        tag: 'Vừa thêm',
        status: 'new',
        stage: 0,
        lastReview: 'Vừa thêm',
      },
      ...current,
    ]);
    setDraft({ word: '', reading: '', hanviet: '', meaning: '', level: 'N3' });
    setAdding(false);
    setStatus('all');
    setLevel('all');
  }

  const reviewLabel = Number.isFinite(dueCount)
    ? `Bắt đầu ôn tập (${dueCount} từ)`
    : 'Bắt đầu ôn tập';

  return (
    <LearnerShell pathname={pathname} breadcrumb="Sổ từ">
      <main
        data-page="VocabularyNotebook"
        className="mx-auto max-w-[1180px] px-5 py-6
                   font-['Be_Vietnam_Pro',sans-serif]
                   text-[#49353F] lg:px-7"
      >
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEEF4] text-[#AD3155]">
                <Icon name="menu_book" className="text-[26px]" filled />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[18px] font-semibold tracking-normal">
                    Sổ tay Từ vựng
                  </h1>
                  <span className="rounded-full bg-[#FCEEF4] px-2.5 py-0.5 text-[11px] font-medium text-[#AD3155]">
                    {levelName || 'Minh họa'}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-5 text-[#8C7782]">
                  Danh sách mẫu để xem sổ từ. Từ chưa được lưu vào tài khoản.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#F0DDE5] bg-[#FFF8FA] px-3 py-2">
                <Icon name="local_florist" className="text-[20px] text-[#AD3155]" filled />
                <span>
                  <span className="block text-[12px] font-medium leading-tight text-[#AD3155]">
                    {typeof streakDays === 'number'
                      ? `Chuỗi ${streakDays} ngày`
                      : 'Chuỗi học'}
                  </span>
                  <span className="block text-[11px] leading-tight text-[#967F8A]">
                    {Number.isFinite(dueCount)
                      ? `Hôm nay còn ${dueCount} thẻ đến hạn`
                      : 'Số thẻ đến hạn đang tải'}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => searchRef.current?.focus()}
                className="hidden h-10 items-center gap-2 rounded-xl border border-[#EADFE5] bg-white px-3 text-[13px] text-[#8C7782] sm:inline-flex"
              >
                <Icon name="search" className="text-[16px]" />
                Tìm nhanh
                <kbd className="rounded bg-[#F7EEF2] px-1.5 py-0.5 text-[10px] text-[#8C7782]">
                  Ctrl K
                </kbd>
              </button>

              <Link
                to="/daily-srs"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B]"
              >
                <Icon name="play_circle" className="text-[18px]" filled />
                {reviewLabel}
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold">Từ trong sổ</h2>
              <span className="rounded-full bg-[#FCEEF4] px-2.5 py-0.5 text-[12px] font-medium text-[#AD3155]">
                {visible.length} từ
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleVisible}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#F7F1F3] px-3 text-[13px] text-[#6F5C66]"
              >
                <Icon name="checklist" className="text-[18px]" />
                Chọn hàng loạt
              </button>
              <button
                type="button"
                onClick={() => downloadCsv(visible)}
                disabled={visible.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#F7F1F3] px-3 text-[13px] text-[#6F5C66] disabled:opacity-50"
              >
                <Icon name="ios_share" className="text-[18px]" />
                Xuất CSV
              </button>
              <button
                type="button"
                onClick={() => setAdding((open) => !open)}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B]"
              >
                <Icon name="add" className="text-[18px]" />
                Thêm từ
              </button>
            </div>
          </div>

          {adding && (
            <form
              onSubmit={addWord}
              className="mt-4 grid gap-2 rounded-xl bg-[#FFF8FA] p-3 sm:grid-cols-6"
            >
              <input
                value={draft.word}
                onChange={(event) => setDraft({ ...draft, word: event.target.value })}
                placeholder="Từ"
                aria-label="Từ"
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155] sm:col-span-1"
              />
              <input
                value={draft.reading}
                onChange={(event) => setDraft({ ...draft, reading: event.target.value })}
                placeholder="Cách đọc"
                aria-label="Cách đọc"
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <input
                value={draft.hanviet}
                onChange={(event) => setDraft({ ...draft, hanviet: event.target.value })}
                placeholder="Hán Việt"
                aria-label="Hán Việt"
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <input
                value={draft.meaning}
                onChange={(event) => setDraft({ ...draft, meaning: event.target.value })}
                placeholder="Nghĩa"
                aria-label="Nghĩa"
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155] sm:col-span-2"
              />
              <div className="flex gap-2">
                <select
                  value={draft.level}
                  aria-label="Cấp độ"
                  onChange={(event) => setDraft({ ...draft, level: event.target.value })}
                  className="h-9 flex-1 rounded-lg border border-[#EADFE5] bg-white px-2 text-[13px]"
                >
                  {LEVELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-[#AD3155] px-3 text-[13px] font-medium text-white"
                >
                  Lưu
                </button>
              </div>
              <p className="text-[11px] text-[#967F8A] sm:col-span-6">
                Từ thêm ở đây chỉ hiện trên trình duyệt này.
              </p>
            </form>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[240px] flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#B07A90]"
              />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm Kanji, cách đọc, Hán Việt, nghĩa"
                className="h-10 w-full rounded-xl bg-[#F7F1F3] pl-10 pr-3 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#AD3155]/20"
              />
            </label>

            <div className="flex rounded-xl bg-[#F7F1F3] p-1">
              {['N5', 'N4', 'N3', 'all'].map((item) => {
                const active = level === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLevel(item)}
                    className={`h-8 min-w-10 rounded-lg px-2.5 text-[12px] ${
                      active ? 'bg-white font-medium text-[#AD3155] shadow-sm' : 'text-[#8C7782]'
                    }`}
                  >
                    {item === 'all' ? 'Tất cả' : item}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                ['due', `Cần ôn (${counts.due ?? 0})`],
                ['known', `Nhớ sâu (${counts.known ?? 0})`],
                ['new', `Mới lưu (${counts.new ?? 0})`],
              ].map(([id, label]) => {
                const active = status === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatus(active ? 'all' : id)}
                    className={`h-8 rounded-lg px-2.5 text-[12px] ${
                      active
                        ? 'bg-[#F8D5DE] font-medium text-[#9E2A4B]'
                        : 'bg-[#F7F1F3] text-[#8C7782]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#FBF6F8] text-[12px] text-[#967F8A]">
                <tr>
                  <th className="w-12 py-3 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Chọn các từ đang hiện"
                      checked={allVisibleSelected}
                      onChange={toggleVisible}
                      className="accent-[#AD3155]"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Từ</th>
                  <th className="px-3 py-3 font-medium">Hán Việt và nghĩa</th>
                  <th className="px-3 py-3 font-medium">Cấp độ</th>
                  <th className="px-3 py-3 font-medium">SRS</th>
                  <th className="px-3 py-3 font-medium">Lần ôn</th>
                  <th className="py-3 pr-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3E7EC] text-[13px]">
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#967F8A]">
                      Không có từ khớp bộ lọc.
                    </td>
                  </tr>
                )}
                {visible.map((word) => {
                  const checked = selected.has(word.id);
                  const state = STATUS[word.status];
                  return (
                    <tr key={word.id} className={checked ? 'bg-[#FFF5F8]' : 'bg-white'}>
                      <td className="py-3 pl-4">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${word.word}`}
                          checked={checked}
                          onChange={() => toggle(word.id)}
                          className="accent-[#AD3155]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="text-[11px] text-[#AD3155]">{word.reading}</p>
                            {word.id === 'keiken' ? (
                              <Link
                                to="/vocabulary-detail"
                                lang="ja"
                                className="font-['Noto_Sans_JP',sans-serif] text-[22px] leading-tight hover:text-[#AD3155]"
                              >
                                {word.word}
                              </Link>
                            ) : (
                              <p lang="ja" className="font-['Noto_Sans_JP',sans-serif] text-[22px] leading-tight">
                                {word.word}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={`Nghe ${word.word}`}
                            onClick={() => speakJapanese(word.word)}
                            className="mt-4 text-[#B07A90] hover:text-[#AD3155]"
                          >
                            <Icon name="volume_up" className="text-[18px]" />
                          </button>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#A08B93]">
                          {word.hanviet}
                        </p>
                        <p className="mt-0.5 truncate">{word.meaning}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-full bg-[#FCEEF4] px-2 py-0.5 text-[11px] font-medium text-[#9E2A4B]">
                            {word.level}
                          </span>
                          <span className="rounded-full bg-[#F7F1F3] px-2 py-0.5 text-[11px] text-[#8C7782]">
                            {word.tag}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <StageDots stage={word.stage} />
                          <span className={`text-[11px] ${state?.tone === 'due' ? 'font-medium text-[#9E2A4B]' : 'text-[#8C7782]'}`}>
                            {state?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[#8C7782]">{word.lastReview}</td>
                      <td className="py-3 pr-4 text-right">
                        {word.id === 'keiken' && (
                          <Link
                            to="/vocabulary-detail"
                            aria-label="Xem chi tiết 経験"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7782] hover:bg-[#F7F1F3] hover:text-[#49353F]"
                          >
                            <Icon name="visibility" className="text-[18px]" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-2xl bg-[#3F3038] px-4 py-3 text-white shadow-lg">
          <p className="text-[13px]">
            Đã chọn <strong>{selected.size}</strong> từ mẫu
          </p>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-[12px]"
          >
            Bỏ chọn
          </button>
          <Link
            to="/daily-srs"
            className="inline-flex items-center gap-1 rounded-xl bg-[#AD3155] px-3 py-1.5 text-[12px] font-medium"
          >
            <Icon name="bolt" className="text-[16px]" filled />
            Ôn tập đến hạn
          </Link>
        </div>
      )}
    </LearnerShell>
  );
}
