import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  CONTENT_IMPORT_TYPES, getAuthorImportBatches, getAuthorImportBatch, submitAuthorImportBatch,
} from '../../api/contentImportApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { CmsShell } from '../../components/shells';
import { AUTHOR_LEVELS } from './authorLevels.js';
import { ContentForm, normalizeKeys, statuses } from './ManualContentPage.jsx';

const card = 'rounded-xl border border-[#EADFE5] bg-white p-4';
const action = 'rounded-lg border border-[#E7D7DF] px-3 py-2 text-sm font-semibold text-[#9E2A4B] disabled:opacity-50';
const primary = 'rounded-lg bg-[#AD3155] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const muted = 'text-sm text-[#765E6B]';
const labels = Object.fromEntries(CONTENT_IMPORT_TYPES.map(({ value, label }) => [value, label.split(' (')[0]]));
const endpoint = '/content-author/manual';
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

function savedDate(value) {
  return dateTime.format(new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z'));
}

function ErrorMessage({ error, retry }) {
  if (!error) return null;
  return <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
    {error.message}
    {retry && <button type="button" className="ml-2 underline" onClick={retry}>Thử lại</button>}
  </div>;
}

function BatchContents({ batchId, batch, userId }) {
  const [activeItem, setActiveItem] = useState(null);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const batchKey = ['author-import-batch', userId, batchId];
  const items = useQuery({ queryKey: batchKey, queryFn: () => getAuthorImportBatch(batchId), retry: false });
  const lookups = useQuery({
    queryKey: ['manual-content-lookups'], queryFn: () => api.get(endpoint + '/lookups'),
  });
  const detailKey = ['manual-content-detail', userId, activeItem?.id];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: async () => normalizeKeys((await api.get(endpoint + '/items/detail/' + activeItem.id)).result),
    enabled: Boolean(activeItem),
    retry: false,
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: batchKey }),
    queryClient.invalidateQueries({ queryKey: ['author-import-batches', userId] }),
    queryClient.invalidateQueries({ queryKey: ['manual-content-items', userId] }),
  ]);
  const save = useMutation({
    mutationFn: data => api.put(endpoint + '/items/' + activeItem.entityType + '/' + activeItem.id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailKey });
      setActiveItem(null);
      await refresh();
    },
  });
  const submit = useMutation({
    mutationFn: () => submitAuthorImportBatch(batchId),
    onSuccess: async () => {
      setConfirming(false);
      await refresh();
    },
  });

  const levels = lookups.data?.levels ?? [];
  const formLookups = lookups.data && {
    ...lookups.data,
    levels: AUTHOR_LEVELS.map(code => levels.find(level =>
      level.code === code && level.certificate?.trim().toUpperCase() === 'JLPT')).filter(Boolean),
  };
  const counts = items.data?.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {}) ?? {};
  const draftCount = counts.Draft ?? 0;
  const busy = save.isPending || submit.isPending;
  const query = search.trim().toLocaleLowerCase('vi');
  const types = CONTENT_IMPORT_TYPES.filter(option => items.data?.some(item => item.entityType === option.value));
  const visibleItems = items.data?.filter(item => (!type || type === item.entityType) &&
    item.rowKey.toLocaleLowerCase('vi').includes(query)) ?? [];

  function openItem(item) {
    save.reset();
    setConfirming(false);
    setActiveItem(item);
  }

  return <>
    <section className={card + ' space-y-3'}>
      <h2 className="break-words text-lg font-bold">{batch?.sourceFileName ?? items.data?.[0]?.sourceFileName ?? 'Chi tiết lô Excel'}</h2>
      {items.data && <div className={muted + ' flex flex-wrap gap-x-4 gap-y-1'}>
        {Object.entries(statuses).filter(([status]) => counts[status]).map(([status, meta]) =>
          <span key={status}>{meta.label} · {counts[status]}</span>)}
      </div>}
      {draftCount > 0 && !confirming && <button type="button" className={primary} disabled={busy || Boolean(activeItem)}
        onClick={() => { submit.reset(); setConfirming(true); }}>Gửi lô cho Admin duyệt</button>}
      {confirming && <div className="flex flex-wrap items-center gap-2">
        <p className={muted}>Gửi {draftCount} bản nháp trong lô này?</p>
        <button type="button" className={primary} disabled={busy} onClick={() => submit.mutate()}>
          {submit.isPending ? 'Đang gửi…' : 'Xác nhận gửi'}
        </button>
        <button type="button" className={action} disabled={busy} onClick={() => { setConfirming(false); submit.reset(); }}>Hủy</button>
      </div>}
      {submit.isSuccess && <p role="status" className="text-sm text-emerald-800">
        {submit.data > 0 ? 'Đã gửi ' + submit.data + ' nội dung cho Admin duyệt.' : 'Lô này đã được gửi duyệt.'}
      </p>}
      <ErrorMessage error={submit.error} />
      <ErrorMessage error={items.error} retry={items.refetch} />
      {items.isPending && <p role="status" className={muted}>Đang tải nội dung lô…</p>}
    </section>
    {activeItem && <section aria-label="Chi tiết học liệu" className="space-y-3">
      <ErrorMessage error={detail.error || lookups.error} retry={detail.error ? detail.refetch : lookups.refetch} />
      {(detail.isPending || lookups.isPending) && <p role="status" className={muted}>Đang tải chi tiết…</p>}
      {detail.data && formLookups && <ContentForm key={activeItem.id} type={activeItem.entityType}
        initial={detail.data} record={activeItem} lookups={formLookups} save={save} close={() => openItem(null)}
        viewOnly={activeItem.status !== 'Draft' || !formLookups.levels.some(level => level.id === detail.data.certificateLevelId)} />}
      {(detail.isError || lookups.isError) && <button type="button" className={action} onClick={() => openItem(null)}>Đóng chi tiết</button>}
    </section>}
    {items.data && <section className="space-y-3">
      <div className={card + ' grid gap-3 sm:grid-cols-2'}>
        <label className="block space-y-1 text-sm font-medium">Loại học liệu
          <select className={action + ' block w-full'} value={type} onChange={event => setType(event.target.value)}>
            <option value="">Tất cả loại học liệu</option>
            {types.map(option => <option key={option.value} value={option.value}>{labels[option.value]}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm font-medium">Tìm trong lô
          <input type="search" className={action + ' block w-full'} value={search} onChange={event => setSearch(event.target.value)} />
        </label>
      </div>
      {visibleItems.length === 0 && <p className={card + ' ' + muted}>Không tìm thấy nội dung phù hợp.</p>}
      <ul className="space-y-2">
        {visibleItems.map(item => {
          const level = levels.find(level => level.id === item.certificateLevelId);
          const status = statuses[item.status];
          return <li key={item.id} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-0 break-words">
              <p className="font-semibold">{item.rowKey}</p>
              <div className={muted + ' mt-1 flex flex-wrap items-center gap-2'}>
                <span>{labels[item.entityType]}{level ? ' · ' + level.code : ''}{item.sourceRowNumber > 0 ? ' · Dòng ' + item.sourceRowNumber : ''}</span>
                <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + (status?.style ?? '')}>
                  {status?.label ?? item.status}
                </span>
              </div>
              {item.reviewNote && <p className={muted + ' mt-2'}>Phản hồi của Admin · {item.reviewNote}</p>}
            </div>
            <button type="button" className={action} disabled={busy} aria-expanded={activeItem?.id === item.id}
              onClick={() => openItem(activeItem?.id === item.id ? null : item)}>Mở nội dung</button>
          </li>;
        })}
      </ul>
    </section>}
  </>;
}

export default function AuthorImportHistory() {
  const [params] = useSearchParams();
  const batchId = params.get('batchId');
  const { user } = useAuth();
  const userId = user?.userId;
  const history = useQuery({ queryKey: ['author-import-batches', userId], queryFn: getAuthorImportBatches, retry: false });
  return <CmsShell breadcrumb="Lô Excel đã lưu">
    <main className="mx-auto max-w-5xl space-y-4 px-5 py-6 text-[#49353F]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lô Excel đã lưu</h1>
          {batchId && <Link to="?view=history" className="mt-1 inline-block text-sm font-semibold text-[#9E2A4B] underline">Về danh sách lô</Link>}
        </div>
        <Link to="/bulk-import/" className={action}>Nhập Excel</Link>
      </header>
      {batchId ? <BatchContents key={batchId} batchId={batchId} userId={userId}
        batch={history.data?.find(batch => batch.batchId === batchId)} /> : <>
        {history.isPending && <p role="status" className={muted}>Đang tải các lô đã lưu…</p>}
        <ErrorMessage error={history.error} retry={history.refetch} />
        {history.data?.length === 0 && <p className={card + ' ' + muted}>Bạn chưa lưu lô Excel nào.</p>}
        <ul className="space-y-2">
          {history.data?.map(batch => <li key={batch.batchId} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-0 break-words">
              <h2 className="font-semibold">{batch.sourceFileName}</h2>
              <p className={muted}>{savedDate(batch.savedAt)} · {batch.itemCount} nội dung</p>
              <p className={muted}>{batch.draftCount} bản nháp · {batch.pendingCount} chờ duyệt · {batch.approvedCount} đã duyệt · {batch.rejectedCount} bị từ chối</p>
            </div>
            <Link to={'?view=history&batchId=' + batch.batchId} className={action}>Mở lô</Link>
          </li>)}
        </ul>
      </>}
    </main>
  </CmsShell>;
}
