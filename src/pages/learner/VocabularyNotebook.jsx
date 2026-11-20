import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { ExternalLink, Eye, Flame, FolderPlus, Pencil, Play, Plus, Trash2, Volume2 } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { useLearnerHome } from '@/features/dashboard/hooks/useLearnerHome.js';
import {
  addNotebookEntry,
  createNotebookList,
  deleteNotebookList,
  getNotebookEntries,
  getNotebookLists,
  removeNotebookEntry,
  updateNotebookList,
} from '@/features/notebook/api/notebookApi.js';
import { confirmAction, notify } from '@/components/ui/feedbackStore.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  Drawer,
  FeatureIcon,
  Field,
  Input,
  Modal,
  PageContainer,
  SakuraLoader,
  SearchInput,
  Tabs,
} from '@/components/ui';

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

function formatAdded(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
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
  const [inspectEntry, setInspectEntry] = useState(null);
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
    const keyword = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (type !== 'all' && entry.contentType !== type) return false;
      if (!keyword) return true;
      return [entry.term, entry.reading, entry.meaning, entry.note]
        .join(' ')
        .toLowerCase()
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
      if (inspectEntry?.noteEntryId === entry.noteEntryId) setInspectEntry(null);
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
      <PageContainer data-page="VocabularyNotebook" width="default" density="comfortable" className="space-y-4 text-rp-text">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <FeatureIcon feature="vocabulary" size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="rp-type-section text-rp-text">{tr('Sổ tay Từ vựng')}</h1>
                {profile?.targetJlptLevelName && (
                  <Badge tone="brand" icon={false} size="sm">JLPT {profile.targetJlptLevelName}</Badge>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-5 text-rp-text-muted">{tr('Từ trong sổ được lưu đồng bộ vào tài khoản để ôn tập SRS.')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-brand-tint/70 px-3 py-2">
              <Flame aria-hidden="true" className="h-5 w-5 text-rp-brand-strong" />
              <span>
                <span className="block text-xs font-semibold leading-tight text-rp-brand-strong">
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
            <Link to="/daily-srs">
              <Button variant="primary" icon={Play}>{reviewLabel}</Button>
            </Link>
          </div>
        </Card>

        {error && <Banner tone="danger" onDismiss={() => setError('')}>{error}</Banner>}
        {queryError && (
          <ContextualErrorState
            variant="inline"
            error={queryError}
            title={queryErrorTitle}
            onRetry={retryQuery}
            retrying={listsQuery.isFetching || entriesQuery.isFetching}
          />
        )}

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-rp-text">{tr('Từ trong sổ')}</h2>
              <Badge tone="brand" icon={false} size="sm">
                {locale === 'ja' ? `${visible.length}語` : trf('{0} từ', { 0: visible.length })}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="soft"
                size="sm"
                icon={FolderPlus}
                onClick={() => {
                  setListDraft({ name: '', description: '' });
                  setCreatingList(true);
                }}
              >
                {tr('Tạo sổ')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Pencil}
                disabled={!listId}
                onClick={() => {
                  setListDraft({ name: selectedList?.name || '', description: selectedList?.description || '' });
                  setRenaming(true);
                }}
              >
                {tr('Đổi tên')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Trash2}
                disabled={!listId || saving}
                onClick={removeList}
              >
                {tr('Xóa sổ')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                disabled={!listId}
                onClick={() => {
                  setDraft({ word: '', reading: '', meaning: '', note: '' });
                  setAdding(true);
                }}
              >
                {tr('Thêm từ')}
              </Button>
            </div>
          </div>

          {lists.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Chọn sổ từ')}>
              {lists.map((list) => {
                const active = list.id === listId;
                return (
                  <Button
                    key={list.id}
                    variant={active ? 'soft' : 'secondary'}
                    size="sm"
                    aria-pressed={active}
                    onClick={() => setListId(list.id)}
                  >
                    {list.name} ({list.entryCount ?? 0})
                  </Button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-[210px]">
              <SearchInput
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClear={() => setSearch('')}
                placeholder="Tìm Kanji, cách đọc, Hán Việt, nghĩa…"
              />
            </div>
            <Tabs
              variant="pill"
              label={tr('Lọc loại từ')}
              value={type}
              onChange={setType}
              tabs={TYPES}
            />
          </div>
        </Card>

        <Card padded={false} data-density="compact" className="min-w-0 overflow-hidden">
          <div className="rp-scroll-x hidden md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-rp-table-head text-xs text-rp-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tr('Từ')}</th>
                  <th className="px-3 py-3 font-semibold">{tr('Nghĩa')}</th>
                  <th className="px-3 py-3 font-semibold">{tr('Ghi chú')}</th>
                  <th className="px-3 py-3 font-semibold">{tr('Loại')}</th>
                  <th className="px-3 py-3 font-semibold">{tr('Ngày thêm')}</th>
                  <th className="py-3 pr-4 text-right font-semibold">{tr('Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-line text-[13px]">
                {(loadingLists || loadingEntries) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <SakuraLoader variant="section" context="vocabulary" className="min-h-[120px] py-4" delay={160} />
                    </td>
                  </tr>
                )}
                {!loadingLists && !listsQuery.isError && !lists.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-rp-text-muted">
                      <p className="font-medium text-rp-text-2">{tr('Chưa có sổ từ')}</p>
                      <p className="mt-1">{tr('Tạo một sổ để bắt đầu lưu từ.')}</p>
                    </td>
                  </tr>
                )}
                {!loadingLists && !loadingEntries && !listsQuery.isError && entriesQuery.isError && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-rp-danger">
                      {tr('Chưa tải được danh sách từ trong sổ.')}{' '}
                      <Button variant="link" size="sm" onClick={() => entriesQuery.refetch()}>{tr('Thử lại')}</Button>
                    </td>
                  </tr>
                )}
                {!loadingLists && !loadingEntries && !listsQuery.isError && !entriesQuery.isError && lists.length > 0 && visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-rp-text-muted">
                      {entries.length ? tr('Không có từ khớp tìm kiếm.') : tr('Sổ từ đang trống.')}
                    </td>
                  </tr>
                )}
                {!loadingEntries && visible.map((entry) => (
                  <tr key={entry.noteEntryId} className="bg-rp-surface hover:bg-rp-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          {entry.reading && <p className="text-[11px] text-rp-brand-strong">{entry.reading}</p>}
                          {entry.vocabularyId ? (
                            <Link to={`/vocabulary-detail?id=${entry.vocabularyId}`} className="rp-kanji text-[22px] leading-tight text-rp-text hover:text-rp-brand-strong">
                              {entry.term}
                            </Link>
                          ) : (
                            <p lang="ja" className="rp-kanji text-[22px] leading-tight text-rp-text">{entry.term}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`${tr('Nghe')} ${entry.term}`}
                          onClick={() => speakJapanese(entry.term)}
                          className="rp-focus mt-3 rounded-lg p-1 text-rp-brand-strong hover:bg-rp-brand-tint"
                        >
                          <Volume2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-3 py-3"><p className="line-clamp-2">{entry.meaning}</p></td>
                    <td className="max-w-[200px] px-3 py-3 text-rp-text-muted"><p className="line-clamp-2">{entry.note || '—'}</p></td>
                    <td className="px-3 py-3">
                      <Badge tone="neutral" icon={false} size="sm">
                        {tr(TYPES.find((item) => item.id === entry.contentType)?.label || entry.contentType)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-rp-text-muted">{formatAdded(entry.addedAt)}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setInspectEntry(entry)}>
                          {tr('Xem')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeWord(entry)}>
                          {tr('Xóa')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 p-3 md:hidden">
            {(loadingLists || loadingEntries) && (
              <SakuraLoader variant="section" context="vocabulary" className="min-h-[100px] py-4" delay={160} />
            )}
            {!loadingEntries && visible.length === 0 && lists.length > 0 && !entriesQuery.isError && (
              <p className="py-8 text-center text-sm text-rp-text-muted">
                {entries.length ? tr('Không có từ khớp tìm kiếm.') : tr('Sổ từ đang trống.')}
              </p>
            )}
            {!loadingEntries && visible.map((entry) => (
              <div key={entry.noteEntryId} className="rounded-xl border border-rp-line bg-rp-bg-2 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {entry.reading && <p className="text-[11px] text-rp-brand-strong">{entry.reading}</p>}
                    <p lang="ja" className="rp-kanji text-xl font-semibold text-rp-text">{entry.term}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${tr('Nghe')} ${entry.term}`}
                      onClick={() => speakJapanese(entry.term)}
                      className="rp-focus rounded-lg p-1.5 text-rp-brand-strong hover:bg-rp-brand-tint"
                    >
                      <Volume2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <Badge tone="neutral" icon={false} size="sm">
                      {tr(TYPES.find((item) => item.id === entry.contentType)?.label || entry.contentType)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-rp-text">{entry.meaning}</p>
                {entry.note && <p className="text-xs text-rp-text-muted">{entry.note}</p>}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <span className="text-rp-text-muted">{formatAdded(entry.addedAt)}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setInspectEntry(entry)}>{tr('Xem')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => removeWord(entry)}>{tr('Xóa')}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedList?.description && (
            <p className="border-t border-rp-line px-4 py-3 text-xs text-rp-text-muted">{selectedList.description}</p>
          )}
        </Card>

        {/* Modal Tạo sổ / Đổi tên sổ */}
        <Modal
          open={creatingList || renaming}
          onClose={() => !saving && (setCreatingList(false), setRenaming(false))}
          title={renaming ? 'Đổi tên sổ từ' : 'Tạo sổ từ mới'}
          size="sm"
          footer={(
            <>
              <Button variant="secondary" onClick={() => (setCreatingList(false), setRenaming(false))} disabled={saving}>
                {tr('Hủy')}
              </Button>
              <Button type="submit" form="notebook-list-form" variant="primary" loading={saving} disabled={!listDraft.name.trim()}>
                {renaming ? tr('Lưu tên') : tr('Tạo sổ')}
              </Button>
            </>
          )}
        >
          <form id="notebook-list-form" onSubmit={renaming ? renameList : createList} className="space-y-4">
            <Field label="Tên sổ" required>
              <Input
                required
                disabled={saving}
                value={listDraft.name}
                onChange={(event) => setListDraft({ ...listDraft, name: event.target.value })}
                placeholder={tr('Ví dụ: Từ vựng N3')}
              />
            </Field>
            <Field label="Mô tả (không bắt buộc)">
              <Input
                disabled={saving}
                value={listDraft.description}
                onChange={(event) => setListDraft({ ...listDraft, description: event.target.value })}
                placeholder={tr('Ghi chú ngắn về chủ đề của sổ')}
              />
            </Field>
          </form>
        </Modal>

        {/* Modal Thêm từ */}
        <Modal
          open={adding && Boolean(listId)}
          onClose={() => !saving && setAdding(false)}
          title="Thêm từ vào sổ"
          size="md"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setAdding(false)} disabled={saving}>{tr('Hủy')}</Button>
              <Button
                type="submit"
                form="notebook-add-word-form"
                variant="primary"
                loading={saving}
                disabled={!draft.word.trim() || !draft.meaning.trim()}
              >
                {tr('Lưu')}
              </Button>
            </>
          )}
        >
          <form id="notebook-add-word-form" onSubmit={addWord} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Từ / Kanji" required>
                <Input required disabled={saving} value={draft.word} onChange={(e) => setDraft({ ...draft, word: e.target.value })} placeholder={tr('Từ')} />
              </Field>
              <Field label="Cách đọc (Hiragana / Katakana)">
                <Input disabled={saving} value={draft.reading} onChange={(e) => setDraft({ ...draft, reading: e.target.value })} placeholder={tr('Cách đọc')} />
              </Field>
            </div>
            <Field label="Nghĩa" required>
              <Input required disabled={saving} value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} placeholder={tr('Nghĩa')} />
            </Field>
            <Field label="Ghi chú">
              <Input disabled={saving} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={tr('Ghi chú')} />
            </Field>
          </form>
        </Modal>

        {/* Drawer Chi tiết mục */}
        <Drawer
          open={Boolean(inspectEntry)}
          onClose={() => setInspectEntry(null)}
          title={inspectEntry?.term || tr('Chi tiết từ vựng')}
          width="w-[min(420px,100vw)]"
        >
          {inspectEntry && (
            <div className="space-y-4">
              <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-4 space-y-2">
                {inspectEntry.reading && <p lang="ja" className="text-sm font-medium text-rp-brand-strong">{inspectEntry.reading}</p>}
                <div className="flex items-center justify-between gap-2">
                  <p lang="ja" className="rp-kanji text-3xl font-bold text-rp-text">{inspectEntry.term}</p>
                  <Button variant="soft" size="sm" icon={Volume2} onClick={() => speakJapanese(inspectEntry.term)}>
                    {tr('Nghe')}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Nghĩa')}</p>
                <p className="mt-1 text-sm text-rp-text">{inspectEntry.meaning}</p>
              </div>
              {inspectEntry.note && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Ghi chú')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-rp-text-2">{inspectEntry.note}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-rp-line pt-4">
                {inspectEntry.vocabularyId && (
                  <Link to={`/vocabulary-detail?id=${inspectEntry.vocabularyId}`}>
                    <Button variant="primary" size="sm" iconRight={ExternalLink}>{tr('Mở trang chi tiết từ')}</Button>
                  </Link>
                )}
                <Button variant="secondary" size="sm" icon={Trash2} onClick={() => removeWord(inspectEntry)}>
                  {tr('Xóa khỏi sổ')}
                </Button>
              </div>
            </div>
          )}
        </Drawer>
      </PageContainer>
    </LearnerShell>
  );
}
