import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client.js';
import {
  CONTENT_IMPORT_TYPES, getAuthorImportBatches, getAuthorImportBatch, submitAuthorImportBatch,
} from '@/features/content-author/api/contentImportApi.js';
import { useAuth } from '@/app/auth/authContext.js';
import { ContentAuthorShell } from '@/layouts';
import { SakuraLoader } from '@/components/ui';
import { AUTHOR_LEVELS } from '@/features/content-author/constants/authorLevels.js';
import { ContentForm } from './ManualContentPage.jsx';
import { notify } from '@/components/ui/feedbackStore.js';
import { normalizeKeys, statuses } from '@/features/content-author/utils/contentModel.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const card = 'rounded-xl border border-rp-line bg-white p-4';
const action = 'rounded-lg border border-rp-line px-3 py-2 text-sm font-semibold text-rp-brand-strong disabled:opacity-50';
const primary = 'rounded-lg bg-rp-brand-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const muted = 'text-sm text-rp-text-2';
const labels = Object.fromEntries(CONTENT_IMPORT_TYPES.map(({ value, label }) => [value, label.split(' (')[0]]));
const endpoint = '/content-author/manual';
const dateTime = { format: (v) => new Intl.DateTimeFormat(currentIntlTag(), {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
}).format(v) };

function savedDate(value) {
  return dateTime.format(new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z'));
}

function ErrorMessage({ error, retry }) {
  const { tr } = useLocale();
  if (!error) return null;
  return <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
    {tr(error.message)}
    {retry && <button type="button" className="ml-2 underline" onClick={retry}>{tr('Thử lại')}</button>}
  </div>;
}

function BatchContents({ batchId, batch, userId }) {
  const { tr, trf } = useLocale();
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
      notify.success('Đã lưu chỉnh sửa mục nội dung.', '', { key: 'author-batch-item-save' });
      await queryClient.invalidateQueries({ queryKey: detailKey });
      setActiveItem(null);
      await refresh();
    },
    onError: (err) => notify.apiError(err, 'Không lưu được chỉnh sửa mục nội dung', { key: 'author-batch-item-save-err' }),
  });
  const submit = useMutation({
    mutationFn: () => {
      notify.loading('Đang gửi lô nội dung để xét duyệt…', '', { key: `author-batch-submit-${batchId}`, maxWaitMs: 30000 });
      return submitAuthorImportBatch(batchId);
    },
    onSuccess: async () => {
      notify.success('Đã gửi lô nội dung để Admin xét duyệt.', '', { key: `author-batch-submit-${batchId}`, replace: true });
      setConfirming(false);
      await refresh();
    },
    onError: (err) => notify.apiError(err, 'Không gửi được lô nội dung để duyệt', {
      key: `author-batch-submit-${batchId}`,
      replace: true,
    }),
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
      <h2 className="break-words text-lg font-bold">{batch?.sourceFileName ?? items.data?.[0]?.sourceFileName ?? tr('Chi tiết lô Excel')}</h2>
      {items.data && <div className={muted + ' flex flex-wrap gap-x-4 gap-y-1'}>
        {Object.entries(statuses).filter(([status]) => counts[status]).map(([status, meta]) =>
          <span key={status}>{tr(meta.label)} · {counts[status]}</span>)}
      </div>}
      {draftCount > 0 && !confirming && <button type="button" className={primary} disabled={busy || Boolean(activeItem)}
        onClick={() => { submit.reset(); setConfirming(true); }}>{tr('Gửi lô cho Admin duyệt')}</button>}
      {confirming && <div className="flex flex-wrap items-center gap-2">
        <p className={muted}>{trf('Gửi {0} bản nháp trong lô này?', { 0: draftCount })}</p>
        <button type="button" className={primary} disabled={busy} onClick={() => submit.mutate()}>
          {submit.isPending ? tr('Đang gửi…') : tr('Xác nhận gửi')}
        </button>
        <button type="button" className={action} disabled={busy} onClick={() => { setConfirming(false); submit.reset(); }}>{tr('Hủy')}</button>
      </div>}
      {submit.isSuccess && <p role="status" className="text-sm text-emerald-800">
        {submit.data > 0 ? 'Đã gửi ' + submit.data + ' nội dung cho Admin duyệt.' : tr('Lô này đã được gửi duyệt.')}
      </p>}
      <ErrorMessage error={submit.error} />
      <ErrorMessage error={items.error} retry={items.refetch} />
      {items.isPending && <SakuraLoader variant="section" context="data" label={tr('Đang tải nội dung lô')} delay={160} />}
    </section>
    {activeItem && <section aria-label={tr('Chi tiết học liệu')} className="space-y-3">
      <ErrorMessage error={detail.error || lookups.error} retry={detail.error ? detail.refetch : lookups.refetch} />
      {(detail.isPending || lookups.isPending) && <SakuraLoader variant="section" context="data" label={tr('Đang tải chi tiết')} delay={160} />}
      {detail.data && formLookups && <ContentForm key={activeItem.id} type={activeItem.entityType}
        initial={detail.data} record={activeItem} lookups={formLookups} save={save} close={() => openItem(null)}
        viewOnly={activeItem.status !== 'Draft' || !formLookups.levels.some(level => level.id === detail.data.certificateLevelId)} />}
      {(detail.isError || lookups.isError) && <button type="button" className={action} onClick={() => openItem(null)}>{tr('Đóng chi tiết')}</button>}
    </section>}
    {items.data && <section className="space-y-3">
      <div className={card + ' grid gap-3 sm:grid-cols-2'}>
        <label className="block space-y-1 text-sm font-medium">{tr('Loại học liệu')}
          <select className={action + ' block w-full'} value={type} onChange={event => setType(event.target.value)}>
            <option value="">{tr('Tất cả loại học liệu')}</option>
            {types.map(option => <option key={option.value} value={option.value}>{labels[option.value]}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm font-medium">{tr('Tìm trong lô')}
          <input type="search" className={action + ' block w-full'} value={search} onChange={event => setSearch(event.target.value)} />
        </label>
      </div>
      {visibleItems.length === 0 && <p className={card + ' ' + muted}>{tr('Không tìm thấy nội dung phù hợp.')}</p>}
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
              {item.reviewNote && <p className={muted + ' mt-2'}>{trf('Phản hồi của Admin · {0}', { 0: item.reviewNote })}</p>}
            </div>
            <button type="button" className={action} disabled={busy} aria-expanded={activeItem?.id === item.id}
              onClick={() => openItem(activeItem?.id === item.id ? null : item)}>{tr('Mở nội dung')}</button>
          </li>;
        })}
      </ul>
    </section>}
  </>;
}

export default function AuthorImportHistory() {
  const { tr, trf } = useLocale();
  const [params] = useSearchParams();
  const batchId = params.get('batchId');
  const { user } = useAuth();
  const userId = user?.userId;
  const history = useQuery({ queryKey: ['author-import-batches', userId], queryFn: getAuthorImportBatches, retry: false });
  return <ContentAuthorShell breadcrumb={tr('Lô Excel đã lưu')}>
    <main className="rp-container space-y-4 py-6 text-rp-text lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tr('Lô Excel đã lưu')}</h1>
          {batchId && <Link to="?view=history" className="mt-1 inline-block text-sm font-semibold text-rp-brand-strong underline">{tr('Về danh sách lô')}</Link>}
        </div>
        <Link to="/bulk-import/" className={action}>{tr('Nhập Excel')}</Link>
      </header>
      {batchId ? <BatchContents key={batchId} batchId={batchId} userId={userId}
        batch={history.data?.find(batch => batch.batchId === batchId)} /> : <>
        {history.isPending && <SakuraLoader variant="section" context="data" label={tr('Đang tải các lô đã lưu')} delay={160} />}
        <ErrorMessage error={history.error} retry={history.refetch} />
        {history.data?.length === 0 && <p className={card + ' ' + muted}>{tr('Bạn chưa lưu lô Excel nào.')}</p>}
        <ul className="space-y-2">
          {history.data?.map(batch => <li key={batch.batchId} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-0 break-words">
              <h2 className="font-semibold">{batch.sourceFileName}</h2>
              <p className={muted}>{trf('{0} · {1} nội dung', { 0: savedDate(batch.savedAt), 1: batch.itemCount })}</p>
              <p className={muted}>{trf('{0} bản nháp · {1} chờ duyệt · {2} đã duyệt · {3} bị từ chối', { 0: batch.draftCount, 1: batch.pendingCount, 2: batch.approvedCount, 3: batch.rejectedCount })}</p>
            </div>
            <Link to={'?view=history&batchId=' + batch.batchId} className={action}>{tr('Mở lô')}</Link>
          </li>)}
        </ul>
      </>}
    </main>
  </ContentAuthorShell>;
}
