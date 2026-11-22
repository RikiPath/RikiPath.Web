import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { useLearnerHome } from '@/features/dashboard/hooks/useLearnerHome.js';
import {
  addNotebookEntry,
  createNotebookList,
  deleteNotebookList,
  updateNotebookList,
  getNotebookEntries,
  getNotebookLists,
  removeNotebookEntry,
} from '@/features/notebook/api/notebookApi.js';
import { confirmAction, notify } from '@/components/ui/feedbackStore.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';

const NOTEBOOK_LISTS_KEY = ['notebook-lists'];

const TYPES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'kanji', label: 'Hán tự' },
  { id: 'manual', label: 'Tự thêm' },
];


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
  const { trf, locale, tr } = useLocale();
  const { pathname } = useLocation();
  const { profile, streak, srs, srsQuery, session } = useLearnerHome();
  const uid = session?.userId ?? 'anon';
  const searchRef = useRef(null);

  const queryClient = useQueryClient();
  const listsKey = [...NOTEBOOK_LISTS_KEY, uid];
  const listsQuery = useQuery({ queryKey: listsKey, queryFn: getNotebookLists });
  const lists = useMemo(() => listsQuery.data ?? [], [listsQuery.data]);
  const loadingLists = listsQuery.isPending;
  const [pickedListId, setListId] = useState(null);
  // The picked list falls back to the first list when it no longer exists (deleted elsewhere).
  const listId = lists.some((list) => list.id === pickedListId) ? pickedListId : (lists[0]?.id ?? null);
  const entriesKey = ['notebook-entries', uid, listId];
  const entriesQuery = useQuery({
    queryKey: entriesKey,
    queryFn: () => getNotebookEntries(listId),
    enabled: Boolean(listId),
  });
  const entries = useMemo(() => (listId ? entriesQuery.data ?? [] : []), [listId, entriesQuery.data]);
  const loadingEntries = Boolean(listId) && entriesQuery.isPending;
  const setLists = (update) => queryClient.setQueryData(listsKey, (current = []) => (typeof update === 'function' ? update(current) : update));
  const setEntries = (rows) => queryClient.setQueryData(entriesKey, rows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [adding, setAdding] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [listDraft, setListDraft] = useState({ name: '', description: '' });
  const [draft, setDraft] = useState({ word: '', reading: '', meaning: '', note: '' });

  const streakDays = streak?.currentStreakDays;
  const dueCount = Number(srs?.totalDue ?? srs?.items?.length);
  const selectedList = lists.find((list) => list.id === listId) || null;

  async function loadLists(preferredId) {
    setError('');
    setListId(preferredId);
    await listsQuery.refetch();
  }

  const queryError = listsQuery.isError
    ? listsQuery.error
    : entriesQuery.isError
      ? entriesQuery.error
      : null;
  const queryErrorTitle = listsQuery.isError
    ? tr('Chưa tải được danh sách sổ từ')
    : tr('Chưa tải được từ trong sổ');
  const retryQuery = () => (listsQuery.isError ? listsQuery.refetch() : entriesQuery.refetch());

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
      notify.success(tr('Đã tạo sổ từ mới.'), '', { key: 'nb-create-list' });
    } catch (err) {
      setError(err.message);
      notify.apiError(err, tr('Không tạo được sổ từ'), { key: 'nb-create-list-err' });
    } finally {
      setSaving(false);
    }
  }

  async function renameList(event) {
    event.preventDefault();
    const name = listDraft.name.trim();
    if (!listId || !name || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateNotebookList(listId, {
        name,
        description: listDraft.description.trim() || null,
      });
      setRenaming(false);
      setListDraft({ name: '', description: '' });
      await loadLists(listId);
      notify.success(tr('Đã cập nhật sổ từ.'), '', { key: 'nb-rename-list' });
    } catch (err) {
      setError(err.message);
      notify.apiError(err, tr('Không cập nhật được sổ từ'), { key: 'nb-rename-list-err' });
    } finally {
      setSaving(false);
    }
  }

  async function removeList() {
    if (!listId || saving) return;
    if (!(await confirmAction({ title: tr('Xóa sổ từ này?'), description: tr('Sổ và toàn bộ mục bên trong sẽ bị xóa, không thể khôi phục.'), confirmLabel: tr('Xóa sổ') }))) return;
    setSaving(true);
    setError('');
    try {
      await deleteNotebookList(listId);
      await loadLists(null);
      notify.success(tr('Đã xóa sổ từ.'), '', { key: 'nb-delete-list' });
    } catch (err) {
      setError(err.message);
      notify.apiError(err, tr('Không xóa được sổ từ'), { key: 'nb-delete-list-err' });
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
      notify.success(tr('Đã thêm từ vào sổ.'), '', { key: 'nb-add-word' });
    } catch (err) {
      setError(err.message);
      notify.apiError(err, tr('Không thêm được từ'), { key: 'nb-add-word-err' });
    } finally {
      setSaving(false);
    }
  }

  async function removeWord(entry) {
    if (!(await confirmAction({ title: tr('Xóa từ này khỏi sổ?'), confirmLabel: tr('Xóa từ') }))) return;
    setError('');
    try {
      await removeNotebookEntry(entry.noteEntryId);
      const rows = entries.filter((item) => item.noteEntryId !== entry.noteEntryId);
      setEntries(rows);
      setLists((current) => current.map((list) => (
        list.id === listId ? { ...list, entryCount: rows.length } : list
      )));
      notify.success(tr('Đã xóa từ khỏi sổ.'), '', { key: 'nb-remove-word' });
    } catch (err) {
      setError(err.message);
      notify.apiError(err, tr('Không xóa được từ'), { key: 'nb-remove-word-err' });
    }
  }

  const reviewLabel = Number.isFinite(dueCount)
    ? (locale === 'ja' ? `復習を始める（${dueCount}語）` : trf('Bắt đầu ôn tập ({0} từ)', { 0: dueCount }))
    : tr('Bắt đầu ôn tập');

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Sổ từ')}>
      <main
        data-page="VocabularyNotebook"
        className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text"
      >
        <section className="rounded-2xl border border-rp-line bg-white p-[var(--rp-space-card-pad)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint text-rp-brand-strong">
                <Icon name="menu_book" className="text-[26px]" filled />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="rp-type-section tracking-normal">{tr('Sổ tay Từ vựng')}</h1>
                  {profile?.targetJlptLevelName ? (
                    <span className="rounded-full bg-rp-brand-tint px-2.5 py-0.5 text-[11px] font-medium text-rp-brand-strong">
                      {profile.targetJlptLevelName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-rp-text-muted">{tr('Từ trong sổ được lưu vào tài khoản.')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-brand-tint px-3 py-2">
                <Icon name="local_florist" className="text-[20px] text-rp-brand-strong" filled />
                <span>
                  <span className="block text-[12px] font-medium leading-tight text-rp-brand-strong">
                    {typeof streakDays === 'number'
                      ? (locale === 'ja' ? `${streakDays}日連続` : trf('Chuỗi {0} ngày', { 0: streakDays }))
                      : tr('Chuỗi học')}
                  </span>
                  <span className="block text-[11px] leading-tight text-rp-text-muted">
                    {srsQuery?.isError
                      ? tr('Chưa tải được số thẻ đến hạn')
                      : Number.isFinite(dueCount)
                        ? (locale === 'ja' ? `今日は期限のカードが${dueCount}枚` : trf('Hôm nay còn {0} thẻ đến hạn', { 0: dueCount }))
                        : tr('Số thẻ đến hạn đang tải')}
                  </span>
                </span>
              </div>
              <Link
                to="/daily-srs"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep rp-press"
              >
                <Icon name="play_arrow" className="text-[16px]" />
                {reviewLabel}
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">{error}</p>
        ) : null}
        {queryError ? (
          <ContextualErrorState
            variant="inline"
            className="mt-4"
            error={queryError}
            title={queryErrorTitle}
            onRetry={retryQuery}
            retrying={listsQuery.isFetching || entriesQuery.isFetching}
          />
        ) : null}

        <section className="mt-4 rounded-2xl border border-rp-line bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold">{tr('Từ trong sổ')}</h2>
              <span className="rounded-full bg-rp-brand-tint px-2.5 py-0.5 text-[12px] font-medium text-rp-brand-strong">
                {locale === 'ja' ? `${visible.length}語` : trf('{0} từ', { 0: visible.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreatingList((open) => !open)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-tint px-3 text-[13px] text-rp-text-2"
              >
                <Icon name="library_add" className="text-[18px]" />{tr('Tạo sổ')}
              </button>
              <button
                type="button"
                disabled={!listId}
                onClick={() => {
                  setCreatingList(false);
                  setRenaming((open) => !open);
                  setListDraft({ name: selectedList?.name || '', description: selectedList?.description || '' });
                }}
                className="inline-flex h-9 items-center rounded-full border border-rp-line px-4 text-[13px] text-rp-text-muted hover:text-rp-brand-strong disabled:opacity-40"
              >
                {tr('Đổi tên')}
              </button>
              <button
                type="button"
                disabled={!listId || saving}
                onClick={removeList}
                className="inline-flex h-9 items-center rounded-full border border-rp-line px-4 text-[13px] text-rp-text-muted hover:text-rp-brand-strong disabled:opacity-40"
              >
                {tr('Xóa sổ')}
              </button>
              <button
                type="button"
                disabled={!listId}
                onClick={() => setAdding((open) => !open)}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-40 rp-press"
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
                      active ? 'bg-rp-brand-soft font-medium text-rp-brand-strong' : 'bg-rp-brand-tint text-rp-text-muted'
                    }`}
                  >
                    {list.name} ({list.entryCount ?? 0})
                  </button>
                );
              })}
            </div>
          ) : null}

          {renaming && listId ? (
            <form onSubmit={renameList} className="mt-4 grid gap-2 rounded-xl bg-rp-brand-tint p-3 sm:grid-cols-[1fr_1fr_auto]">
              <input required value={listDraft.name} onChange={(event) => setListDraft({ ...listDraft, name: event.target.value })} placeholder={tr('Tên sổ')} aria-label={tr('Tên sổ')} className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong" />
              <input value={listDraft.description} onChange={(event) => setListDraft({ ...listDraft, description: event.target.value })} placeholder={tr('Mô tả')} aria-label={tr('Mô tả')} className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong" />
              <button type="submit" disabled={saving} className="h-9 rounded-lg bg-rp-brand-strong px-3 text-[13px] font-medium text-white disabled:opacity-50 rp-press">{saving ? tr('Đang lưu…') : tr('Lưu tên')}</button>
            </form>
          ) : null}
          {creatingList ? (
            <form onSubmit={createList} className="mt-4 grid gap-2 rounded-xl bg-rp-brand-tint p-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                required
                value={listDraft.name}
                onChange={(event) => setListDraft({ ...listDraft, name: event.target.value })}
                placeholder={tr('Tên sổ')}
                aria-label={tr('Tên sổ')}
                className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong"
              />
              <input
                value={listDraft.description}
                onChange={(event) => setListDraft({ ...listDraft, description: event.target.value })}
                placeholder={tr('Mô tả')}
                aria-label={tr('Mô tả')}
                className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong"
              />
              <button type="submit" disabled={saving} className="h-9 rounded-lg bg-rp-brand-strong px-3 text-[13px] font-medium text-white disabled:opacity-50 rp-press">
                {saving ? tr('Đang lưu…') : tr('Tạo sổ')}
              </button>
            </form>
          ) : null}

          {adding && listId ? (
            <form onSubmit={addWord} className="mt-4 grid gap-2 rounded-xl bg-rp-brand-tint p-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                required
                value={draft.word}
                onChange={(event) => setDraft({ ...draft, word: event.target.value })}
                placeholder={tr('Từ')}
                aria-label={tr('Từ')}
                className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong"
              />
              <input
                value={draft.reading}
                onChange={(event) => setDraft({ ...draft, reading: event.target.value })}
                placeholder={tr('Cách đọc')}
                aria-label={tr('Cách đọc')}
                className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong"
              />
              <input
                required
                value={draft.meaning}
                onChange={(event) => setDraft({ ...draft, meaning: event.target.value })}
                placeholder={tr('Nghĩa')}
                aria-label={tr('Nghĩa')}
                className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong"
              />
              <input
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                placeholder={tr('Ghi chú')}
                aria-label={tr('Ghi chú')}
                className="h-9 rounded-lg border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong"
              />
              <div className="sm:col-span-2 lg:col-span-4">
                <button type="submit" disabled={saving} className="h-9 rounded-lg bg-rp-brand-strong px-4 text-[13px] font-medium text-white disabled:opacity-50 rp-press">
                  {saving ? tr('Đang lưu…') : tr('Lưu')}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="relative min-w-0 flex-1 basis-[210px]">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-rp-brand-strong" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tr('Tìm Kanji, cách đọc, Hán Việt, nghĩa')}
                className="h-10 w-full rounded-xl bg-rp-brand-tint pl-10 pr-3 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-rp-brand-strong/20"
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
                      active ? 'bg-white font-medium text-rp-brand-strong shadow-sm' : 'bg-rp-brand-tint text-rp-text-muted'
                    }`}
                  >
                    {tr(item.label)}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section data-density="compact" className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-rp-line bg-white">
          <div className="rp-scroll-x">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-rp-brand-tint text-[12px] text-rp-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{tr('Từ')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Nghĩa')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Ghi chú')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Loại')}</th>
                  <th className="px-3 py-3 font-medium">{tr('Ngày thêm')}</th>
                  <th className="py-3 pr-4 text-right font-medium">{tr('Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-line text-[13px]">
                {loadingLists || loadingEntries ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <SakuraLoader variant="section" context="vocabulary" className="min-h-[120px] py-4" delay={160} />
                    </td>
                  </tr>
                ) : null}
                {!loadingLists && !listsQuery.isError && !lists.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-rp-text-muted">
                      <p className="font-medium text-rp-text-2">{tr('Chưa có sổ từ')}</p>
                      <p className="mt-1">{tr('Tạo một sổ để bắt đầu lưu từ.')}</p>
                    </td>
                  </tr>
                ) : null}
                {!loadingLists && !loadingEntries && !listsQuery.isError && !entriesQuery.isError && lists.length > 0 && visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-rp-text-muted">
                      {entries.length ? tr('Không có từ khớp tìm kiếm.') : tr('Sổ từ đang trống.')}
                    </td>
                  </tr>
                ) : null}
                {!loadingEntries && visible.map((entry) => (
                  <tr key={entry.noteEntryId} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          {entry.reading ? <p className="text-[11px] text-rp-brand-strong">{entry.reading}</p> : null}
                          <p lang="ja" className="font-['Noto_Sans_JP',sans-serif] text-[22px] leading-tight">{entry.term}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`${tr('Nghe')} ${entry.term}`}
                          onClick={() => speakJapanese(entry.term)}
                          className="mt-4 text-rp-brand-strong hover:text-rp-brand-strong"
                        >
                          <Icon name="volume_up" className="text-[18px]" />
                        </button>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-3 py-3">
                      <p className="line-clamp-2">{entry.meaning}</p>
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-rp-text-muted">
                      <p className="line-clamp-2">{entry.note || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-rp-brand-tint px-2 py-0.5 text-[11px] text-rp-text-muted">
                        {tr(TYPES.find((item) => item.id === entry.contentType)?.label || entry.contentType)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-rp-text-muted">{formatAdded(entry.addedAt, locale)}</td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeWord(entry)}
                        className="inline-flex h-8 items-center rounded-lg px-2 text-[12px] text-rp-brand-strong hover:bg-rp-brand-tint"
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
            <p className="border-t border-rp-line px-4 py-3 text-[12px] text-rp-text-muted">{tr(selectedList.description)}</p>
          ) : null}
        </section>
      </main>
    </LearnerShell>
  );
}
