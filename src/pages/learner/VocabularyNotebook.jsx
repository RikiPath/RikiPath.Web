import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { useLearnerHome } from '../../hooks/useLearnerHome.js';
import {
  addNotebookEntry,
  createNotebookList,
  getNotebookEntries,
  getNotebookLists,
  removeNotebookEntry,
} from '../../api/notebookApi.js';

const TYPES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'kanji', label: 'Hán tự' },
  { id: 'manual', label: 'Tự thêm' },
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
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function formatAdded(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function VocabularyNotebook() {
  const { locale, tr } = useLocale();
  const { pathname } = useLocation();
  const { profile, streak, srs } = useLearnerHome();
  const searchRef = useRef(null);

  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [adding, setAdding] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [listDraft, setListDraft] = useState({ name: '', description: '' });
  const [draft, setDraft] = useState({ word: '', reading: '', meaning: '', note: '' });

  const streakDays = streak?.currentStreakDays;
  const dueCount = Number(srs?.totalDue ?? srs?.items?.length);
  const selectedList = lists.find((list) => list.id === listId) || null;

  async function loadLists(preferredId) {
    setLoadingLists(true);
    setError('');
    try {
      const next = await getNotebookLists();
      setLists(next);
      const stillThere = next.some((list) => list.id === preferredId);
      setListId(stillThere ? preferredId : (next[0]?.id ?? null));
    } catch (err) {
      setError(err.status === 401 ? tr('Phiên đăng nhập đã hết hạn. Đăng nhập lại để xem sổ từ.') : err.message);
    } finally {
      setLoadingLists(false);
    }
  }

  useEffect(() => {
    loadLists(null);
  }, []);

  useEffect(() => {
    if (!listId) {
      setEntries([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingEntries(true);
    setError('');
    getNotebookEntries(listId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingEntries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listId]);

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

  const visible = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    return entries.filter((entry) => {
      if (type !== 'all' && entry.contentType !== type) return false;
      if (!keyword) return true;
      return [entry.term, entry.reading, entry.meaning, entry.note]
        .join(' ')
        .toLocaleLowerCase('vi-VN')
        .includes(keyword);
    });
  }, [entries, search, type]);

  async function createList(event) {
    event.preventDefault();
    const name = listDraft.name.trim();
    if (!name || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await createNotebookList({
        name,
        description: listDraft.description.trim() || null,
      });
      setListDraft({ name: '', description: '' });
      setCreatingList(false);
      await loadLists(created?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addWord(event) {
    event.preventDefault();
    const word = draft.word.trim();
    const meaning = draft.meaning.trim();
    if (!listId || !word || !meaning || saving) return;
    setSaving(true);
    setError('');
    try {
      await addNotebookEntry({
        learnerNoteId: listId,
        word,
        reading: draft.reading.trim() || null,
        meaning,
        note: draft.note.trim() || null,
      });
      setDraft({ word: '', reading: '', meaning: '', note: '' });
      setAdding(false);
      const rows = await getNotebookEntries(listId);
      setEntries(rows);
      setLists((current) => current.map((list) => (
        list.id === listId ? { ...list, entryCount: rows.length } : list
      )));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeWord(entry) {
    if (!window.confirm(tr('Xóa từ này khỏi sổ?'))) return;
    setError('');
    try {
      await removeNotebookEntry(entry.noteEntryId);
      const rows = entries.filter((item) => item.noteEntryId !== entry.noteEntryId);
      setEntries(rows);
      setLists((current) => current.map((list) => (
        list.id === listId ? { ...list, entryCount: rows.length } : list
      )));
    } catch (err) {
      setError(err.message);
    }
  }

  const reviewLabel = Number.isFinite(dueCount)
    ? (locale === 'ja' ? `復習を始める（${dueCount}語）` : `Bắt đầu ôn tập (${dueCount} từ)`)
    : tr('Bắt đầu ôn tập');

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Sổ từ')}>
      <main
        data-page="VocabularyNotebook"
        className="mx-auto max-w-[1180px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7"
      >
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEEF4] text-[#AD3155]">
                <Icon name="menu_book" className="text-[26px]" filled />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[18px] font-semibold tracking-normal">{tr('Sổ tay Từ vựng')}</h1>
                  {profile?.targetJlptLevelName ? (
                    <span className="rounded-full bg-[#FCEEF4] px-2.5 py-0.5 text-[11px] font-medium text-[#AD3155]">
                      {profile.targetJlptLevelName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-[#8C7782]">{tr('Từ trong sổ được lưu vào tài khoản.')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#F0DDE5] bg-[#FFF8FA] px-3 py-2">
                <Icon name="local_florist" className="text-[20px] text-[#AD3155]" filled />
                <span>
                  <span className="block text-[12px] font-medium leading-tight text-[#AD3155]">
                    {typeof streakDays === 'number'
                      ? (locale === 'ja' ? `${streakDays}日連続` : `Chuỗi ${streakDays} ngày`)
                      : tr('Chuỗi học')}
                  </span>
                  <span className="block text-[11px] leading-tight text-[#967F8A]">
                    {Number.isFinite(dueCount)
                      ? (locale === 'ja' ? `今日は期限のカードが${dueCount}枚` : `Hôm nay còn ${dueCount} thẻ đến hạn`)
                      : tr('Số thẻ đến hạn đang tải')}
                  </span>
                </span>
              </div>
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

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-[#FFF0F4] px-4 py-3 text-[13px] text-[#A33357]">{error}</p>
        ) : null}

        <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold">{tr('Từ trong sổ')}</h2>
              <span className="rounded-full bg-[#FCEEF4] px-2.5 py-0.5 text-[12px] font-medium text-[#AD3155]">
                {locale === 'ja' ? `${visible.length}語` : `${visible.length} từ`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreatingList((open) => !open)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#F7F1F3] px-3 text-[13px] text-[#6F5C66]"
              >
                <Icon name="library_add" className="text-[18px]" />{tr('Tạo sổ')}
              </button>
              <button
                type="button"
                disabled={!listId}
                onClick={() => setAdding((open) => !open)}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40"
              >
                <Icon name="add" className="text-[18px]" />{tr('Thêm từ')}
              </button>
            </div>
          </div>

          {lists.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {lists.map((list) => {
                const active = list.id === listId;
                return (
                  <button
                    key={list.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setListId(list.id)}
                    className={`h-8 rounded-lg px-2.5 text-[12px] ${
                      active ? 'bg-[#F8D5DE] font-medium text-[#9E2A4B]' : 'bg-[#F7F1F3] text-[#8C7782]'
                    }`}
                  >
                    {list.name} ({list.entryCount ?? 0})
                  </button>
                );
              })}
            </div>
          ) : null}

          {creatingList ? (
            <form onSubmit={createList} className="mt-4 grid gap-2 rounded-xl bg-[#FFF8FA] p-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                required
                value={listDraft.name}
                onChange={(event) => setListDraft({ ...listDraft, name: event.target.value })}
                placeholder={tr('Tên sổ')}
                aria-label={tr('Tên sổ')}
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <input
                value={listDraft.description}
                onChange={(event) => setListDraft({ ...listDraft, description: event.target.value })}
                placeholder={tr('Mô tả')}
                aria-label={tr('Mô tả')}
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <button type="submit" disabled={saving} className="h-9 rounded-lg bg-[#AD3155] px-3 text-[13px] font-medium text-white disabled:opacity-50">
                {saving ? tr('Đang lưu…') : tr('Tạo sổ')}
              </button>
            </form>
          ) : null}

          {adding && listId ? (
            <form onSubmit={addWord} className="mt-4 grid gap-2 rounded-xl bg-[#FFF8FA] p-3 sm:grid-cols-4">
              <input
                required
                value={draft.word}
                onChange={(event) => setDraft({ ...draft, word: event.target.value })}
                placeholder={tr('Từ')}
                aria-label={tr('Từ')}
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <input
                value={draft.reading}
                onChange={(event) => setDraft({ ...draft, reading: event.target.value })}
                placeholder={tr('Cách đọc')}
                aria-label={tr('Cách đọc')}
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <input
                required
                value={draft.meaning}
                onChange={(event) => setDraft({ ...draft, meaning: event.target.value })}
                placeholder={tr('Nghĩa')}
                aria-label={tr('Nghĩa')}
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <input
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                placeholder={tr('Ghi chú')}
                aria-label={tr('Ghi chú')}
                className="h-9 rounded-lg border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155]"
              />
              <div className="sm:col-span-4">
                <button type="submit" disabled={saving} className="h-9 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white disabled:opacity-50">
                  {saving ? tr('Đang lưu…') : tr('Lưu')}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[240px] flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#B07A90]" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tr('Tìm Kanji, cách đọc, Hán Việt, nghĩa')}
                className="h-10 w-full rounded-xl bg-[#F7F1F3] pl-10 pr-3 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#AD3155]/20"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((item) => {
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(item.id)}
                    className={`h-8 rounded-lg px-2.5 text-[12px] ${
                      active ? 'bg-white font-medium text-[#AD3155] shadow-sm' : 'bg-[#F7F1F3] text-[#8C7782]'
                    }`}
                  >
                    {tr(item.label)}
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
                  <th className="px-4 py-3 font-medium">{tr('Từ')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Nghĩa')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Ghi chú')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Loại')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Ngày thêm')}</th>
                  <th className="py-3 pr-4 text-right font-medium">{tr('Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3E7EC] text-[13px]">
                {loadingLists || loadingEntries ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#967F8A]">{tr('Đang tải sổ từ…')}</td>
                  </tr>
                ) : null}
                {!loadingLists && !lists.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#967F8A]">
                      <p className="font-medium text-[#6F5C66]">{tr('Chưa có sổ từ')}</p>
                      <p className="mt-1">{tr('Tạo một sổ để bắt đầu lưu từ.')}</p>
                    </td>
                  </tr>
                ) : null}
                {!loadingLists && !loadingEntries && lists.length > 0 && visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#967F8A]">
                      {entries.length ? tr('Không có từ khớp tìm kiếm.') : tr('Sổ từ đang trống.')}
                    </td>
                  </tr>
                ) : null}
                {!loadingEntries && visible.map((entry) => (
                  <tr key={entry.noteEntryId} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          {entry.reading ? <p className="text-[11px] text-[#AD3155]">{entry.reading}</p> : null}
                          <p lang="ja" className="font-['Noto_Sans_JP',sans-serif] text-[22px] leading-tight">{entry.term}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`${tr('Nghe')} ${entry.term}`}
                          onClick={() => speakJapanese(entry.term)}
                          className="mt-4 text-[#B07A90] hover:text-[#AD3155]"
                        >
                          <Icon name="volume_up" className="text-[18px]" />
                        </button>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-3 py-3">
                      <p className="line-clamp-2">{entry.meaning}</p>
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-[#8C7782]">
                      <p className="line-clamp-2">{entry.note || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-[#F7F1F3] px-2 py-0.5 text-[11px] text-[#8C7782]">
                        {tr(TYPES.find((item) => item.id === entry.contentType)?.label || entry.contentType)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#8C7782]">{formatAdded(entry.addedAt, locale)}</td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeWord(entry)}
                        className="inline-flex h-8 items-center rounded-lg px-2 text-[12px] text-[#A33357] hover:bg-[#FFF0F4]"
                      >
                        {tr('Xóa')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedList?.description ? (
            <p className="border-t border-[#F3E7EC] px-4 py-3 text-[12px] text-[#8C7782]">{selectedList.description}</p>
          ) : null}
        </section>
      </main>
    </LearnerShell>
  );
}
