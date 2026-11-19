import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAdminMentorAvailabilities, getPendingMentorSlots, reviewMentorSlot, reviewMentorSlotCancels, reviewMentorSlots, unwrapApiList } from '@/features/admin/api/adminApi.js';
import { resolveSlotChange } from '@/features/scheduling/api/mentorScheduleApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { AdminShell } from '@/layouts';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const TABS = [
  { id: 'review', label: 'Chờ duyệt' },
  { id: 'cancel', label: 'Xin hủy' },
  { id: 'change', label: 'Xin đổi tiết' },
];

function when(value) {
  if (!value) return '';
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSlotReview() {
  const { trf, tr } = useLocale();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('review');
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useQuery({ queryKey: ['admin-pending-slots'], queryFn: getPendingMentorSlots });
  const all = useQuery({
    queryKey: ['admin-mentor-slots'],
    queryFn: async () => unwrapApiList(await getAdminMentorAvailabilities()),
  });
  const refresh = () => {
    setPicked([]);
    queryClient.invalidateQueries({ queryKey: ['admin-pending-slots'] });
    queryClient.invalidateQueries({ queryKey: ['admin-mentor-slots'] });
  };
  const reviewOne = useMutation({
    mutationFn: ({ id, approve }) => reviewMentorSlot(id, approve, approve ? undefined : reason.trim()),
    onSuccess: (_, vars) => {
      const msg = vars.approve ? 'Đã phê duyệt khung giờ.' : 'Đã từ chối khung giờ.';
      setNotice(msg);
      notify.success(msg, '', { key: 'admin-slot-review-one' });
      setReason('');
      refresh();
    },
    onError: (err) => notify.apiError(err, 'Chưa xử lý được khung giờ', { key: 'admin-slot-review-one-err' }),
  });
  const review = useMutation({
    mutationFn: ({ ids, approve }) => reviewMentorSlots(ids, approve, approve ? undefined : reason.trim()),
    onSuccess: (_, vars) => {
      const msg = vars.approve ? 'Đã phê duyệt các khung giờ đã chọn.' : 'Đã từ chối các khung giờ đã chọn.';
      setNotice(msg);
      notify.success(msg, '', { key: 'admin-slot-review-batch' });
      setReason('');
      refresh();
    },
    onError: (err) => notify.apiError(err, 'Chưa xử lý được khung giờ chờ duyệt', { key: 'admin-slot-review-batch-err' }),
  });
  const cancel = useMutation({
    mutationFn: ({ ids, approve }) => reviewMentorSlotCancels(ids, approve, approve ? undefined : reason.trim()),
    onSuccess: (_, vars) => {
      const msg = vars.approve ? 'Đã chấp thuận yêu cầu hủy khung giờ.' : 'Đã từ chối yêu cầu hủy khung giờ.';
      setNotice(msg);
      notify.success(msg, '', { key: 'admin-slot-cancel-review' });
      setReason('');
      refresh();
    },
    onError: (err) => notify.apiError(err, 'Chưa xử lý được yêu cầu hủy', { key: 'admin-slot-cancel-review-err' }),
  });
  const change = useMutation({
    mutationFn: ({ id, cancelSlot }) => resolveSlotChange(id, { cancelSlot, reason: reason.trim() }),
    onSuccess: (_, vars) => {
      const msg = vars.cancelSlot ? 'Đã chấp thuận hủy tiết theo yêu cầu.' : 'Đã từ chối yêu cầu đổi tiết.';
      setNotice(msg);
      notify.success(msg, '', { key: 'admin-slot-change-review' });
      setReason('');
      refresh();
    },
    onError: (err) => notify.apiError(err, 'Chưa xử lý được yêu cầu đổi tiết', { key: 'admin-slot-change-review-err' }),
  });
  const pendingRows = Array.isArray(pending.data) ? pending.data : [];
  const allRows = Array.isArray(all.data) ? all.data : [];
  const cancelRows = allRows.filter((row) => row.cancelRequestedAt && !row.cancelRejectedAt);
  const changeRows = allRows.filter((row) => row.changeRequestedAt && !row.changeResolution);
  const rows = tab === 'review' ? pendingRows : tab === 'cancel' ? cancelRows : changeRows;
  const counts = { review: pendingRows.length, cancel: cancelRows.length, change: changeRows.length };
  const busy = review.isPending || reviewOne.isPending || cancel.isPending || change.isPending;
  const actionError = review.error || reviewOne.error || cancel.error || change.error;
  const listLoading = tab === 'review' ? pending.isLoading : all.isLoading;
  const listError = tab === 'review' ? pending.error : all.error;
  const retryTab = () => (tab === 'review' ? pending.refetch() : all.refetch());
  const listFetching = tab === 'review' ? pending.isFetching : all.isFetching;
  const toggle = (id) => setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Duyệt khung giờ')}>
      <main className="rp-container-reading rp-cq py-[var(--rp-space-page-y)] text-rp-text">
        <h1 className="rp-type-page-title">{tr('Duyệt khung giờ')}</h1>
        <p className="rp-type-secondary mt-1 text-rp-text-muted">{tr('Khung giờ giảng dạy theo chính sách Admin chờ phê duyệt hoặc điều chỉnh.')}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((item) => {
            const tabFailed = item.id === 'review' ? pending.isError : all.isError;
            const tabLoading = item.id === 'review' ? pending.isPending : all.isPending;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setTab(item.id); setPicked([]); setReason(''); }}
                className={`h-9 rounded-lg px-3 text-[13px] ${tab === item.id ? 'bg-rp-brand-tint font-medium text-rp-brand-strong' : 'bg-white text-rp-text-2 hover:bg-rp-brand-tint'}`}
              >
                {tr(item.label)}
                {!tabFailed && !tabLoading && <span className="ml-1.5 text-[12px]">{counts[item.id]}</span>}
              </button>
            );
          })}
        </div>

        {actionError && (
          <p role="alert" className="mt-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">
            {tr(describeApiError(actionError).message)}
          </p>
        )}
        {notice && <p className="mt-4 rounded-xl bg-rp-success-bg px-4 py-3 text-[13px] text-rp-success">{notice}</p>}

        <section className="mt-4 overflow-hidden rounded-2xl border border-rp-line bg-white">
          {listLoading && <SakuraLoader variant="section" context="cohort" delay={160} />}
          {listError && !listLoading && (
            <ContextualErrorState
              compact
              error={listError}
              title={tr('Chưa tải được danh sách yêu cầu')}
              onRetry={retryTab}
              retrying={listFetching}
            />
          )}
          {!listLoading && !listError && rows.length === 0 && (
            <ContextualEmptyState compact title={tr('Không có yêu cầu trong mục này.')} />
          )}
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 border-b border-rp-line px-5 py-3 last:border-b-0">
              {tab !== 'change' && (
                <input type="checkbox" className="mt-1" checked={picked.includes(row.id)} onChange={() => toggle(row.id)} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{row.mentorName || trf('Cố vấn #{0}', { 0: row.mentorId })}</span>
                <span className="mt-0.5 block text-[12px] text-rp-text-muted">{when(row.startTime)} – {when(row.endTime)}</span>
                {(row.cancelReason || row.changeRequestReason) && (
                  <span className="mt-1 block text-[12px] leading-5 text-rp-text-2">{row.cancelReason || row.changeRequestReason}</span>
                )}
              </span>
              {tab === 'review' && (
                <span className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy} onClick={() => reviewOne.mutate({ id: row.id, approve: true })} className="h-8 rounded-lg bg-rp-brand-strong px-3 text-[12px] text-white disabled:opacity-50 rp-press">{tr('Duyệt')}</button>
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => reviewOne.mutate({ id: row.id, approve: false })} className="h-8 rounded-lg border border-rp-line px-3 text-[12px] disabled:opacity-50">{tr('Từ chối')}</button>
                </span>
              )}
              {tab === 'change' && (
                <span className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => change.mutate({ id: row.id, cancelSlot: false })} className="h-8 rounded-lg bg-rp-brand-strong px-3 text-[12px] text-white disabled:opacity-50 rp-press">{tr('Giữ')}</button>
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => change.mutate({ id: row.id, cancelSlot: true })} className="h-8 rounded-lg border border-rp-line px-3 text-[12px] disabled:opacity-50">{tr('Hủy tiết')}</button>
                </span>
              )}
            </div>
          ))}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-end gap-2 border-t border-rp-line bg-rp-brand-tint px-5 py-3">
              <label className="min-w-0 flex-1 basis-[200px] text-[12px] font-medium text-rp-text-2">
                {tab === 'change' ? tr('Lý do xử lý') : tr('Lý do khi từ chối')}
                <input maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-rp-line bg-white px-3 text-[13px] font-normal outline-none focus:border-rp-brand-strong" />
              </label>
              {tab !== 'change' && (
                <>
                  <button type="button" disabled={busy || picked.length === 0} onClick={() => (tab === 'review' ? review : cancel).mutate({ ids: picked, approve: true })} className="h-10 rounded-lg bg-rp-brand-strong px-4 text-[13px] font-medium text-white disabled:opacity-50 rp-press">
                    {tr('Duyệt')}{' '}{picked.length || ''}
                  </button>
                  <button type="button" disabled={busy || picked.length === 0 || !reason.trim()} onClick={() => (tab === 'review' ? review : cancel).mutate({ ids: picked, approve: false })} className="h-10 rounded-lg border border-rp-line bg-white px-4 text-[13px] disabled:opacity-50">
                    {tr('Từ chối')}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </AdminShell>
  );
}
