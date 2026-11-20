import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Eye,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  getAdminMentorAvailabilities,
  getPendingMentorSlots,
  reviewMentorSlot,
  reviewMentorSlotCancels,
  reviewMentorSlots,
  unwrapApiList,
} from '@/features/admin/api/adminApi.js';
import { resolveSlotChange } from '@/features/scheduling/api/mentorScheduleApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { AdminShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  Drawer,
  FeatureIcon,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  Tabs,
  Textarea,
  notify,
} from '@/components/ui';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

const TABS = [
  { id: 'review', label: 'Chờ duyệt' },
  { id: 'cancel', label: 'Xin hủy' },
  { id: 'change', label: 'Xin đổi tiết' },
];

function formatSlotTime(value) {
  if (!value) return '—';
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSlotReview() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('review');
  const [search, setSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState('ALL');
  const [picked, setPicked] = useState([]);
  const [detailSlot, setDetailSlot] = useState(null);
  const [modalAction, setModalAction] = useState(null); // { mode: 'reject-one' | 'reject-batch' | 'reject-cancel' | 'resolve-change', ids: [], cancelSlot?: bool }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const pending = useQuery({ queryKey: ADMIN_KEYS.pendingSlots, queryFn: getPendingMentorSlots });
  const all = useQuery({
    queryKey: ADMIN_KEYS.mentorSlots,
    queryFn: async () => unwrapApiList(await getAdminMentorAvailabilities()),
  });

  const refreshAll = async () => {
    setPicked([]);
    setDetailSlot(null);
    await invalidateAdminDomains(queryClient, ['schedules']);
  };

  const reviewOne = useMutation({
    mutationFn: ({ id, approve, note }) => reviewMentorSlot(id, approve, note),
    onSuccess: async (_, vars) => {
      setModalAction(null);
      setReason('');
      await refreshAll();
      notify.success(vars.approve ? tr('Đã phê duyệt khung giờ.') : tr('Đã từ chối khung giờ.'), '', { key: 'admin-slot-review-one', replace: true });
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được khung giờ'), { key: 'admin-slot-review-one-err', replace: true }),
  });

  const reviewBatch = useMutation({
    mutationFn: ({ ids, approve, note }) => reviewMentorSlots(ids, approve, note),
    onSuccess: async (_, vars) => {
      setModalAction(null);
      setReason('');
      await refreshAll();
      notify.success(
        vars.approve ? tr('Đã phê duyệt các khung giờ đã chọn.') : tr('Đã từ chối các khung giờ đã chọn.'),
        '',
        { key: 'admin-slot-review-batch', replace: true },
      );
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được khung giờ chờ duyệt'), { key: 'admin-slot-review-batch-err', replace: true }),
  });

  const cancelBatch = useMutation({
    mutationFn: ({ ids, approve, note }) => reviewMentorSlotCancels(ids, approve, note),
    onSuccess: async (_, vars) => {
      setModalAction(null);
      setReason('');
      await refreshAll();
      notify.success(
        vars.approve ? tr('Đã chấp thuận yêu cầu hủy khung giờ.') : tr('Đã từ chối yêu cầu hủy khung giờ.'),
        '',
        { key: 'admin-slot-cancel-review', replace: true },
      );
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được yêu cầu hủy'), { key: 'admin-slot-cancel-review-err', replace: true }),
  });

  const changeResolve = useMutation({
    mutationFn: ({ id, cancelSlot, note }) => resolveSlotChange(id, { cancelSlot, reason: note }),
    onSuccess: async () => {
      setModalAction(null);
      setReason('');
      await refreshAll();
      notify.success(tr('Đã phản hồi yêu cầu đổi tiết.'), '', { key: 'admin-slot-change-review', replace: true });
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được yêu cầu đổi tiết'), { key: 'admin-slot-change-review-err', replace: true }),
  });

  const pendingRows = useMemo(() => (Array.isArray(pending.data) ? pending.data : []), [pending.data]);
  const allRows = useMemo(() => (Array.isArray(all.data) ? all.data : []), [all.data]);
  const cancelRows = useMemo(() => allRows.filter((row) => row.cancelRequestedAt && !row.cancelRejectedAt), [allRows]);
  const changeRows = useMemo(() => allRows.filter((row) => row.changeRequestedAt && !row.changeResolution), [allRows]);

  const tabRows = tab === 'review' ? pendingRows : tab === 'cancel' ? cancelRows : changeRows;
  const mentorOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      if (r.mentorId && !map.has(String(r.mentorId))) {
        map.set(String(r.mentorId), r.mentorName || trf('Giáo viên #{0}', { 0: r.mentorId }));
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [tabRows, trf]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabRows.filter((r) => {
      if (mentorFilter !== 'ALL' && String(r.mentorId) !== mentorFilter) return false;
      if (!q) return true;
      return `${r.mentorName || ''} ${r.cancelReason || ''} ${r.changeReason || ''}`.toLowerCase().includes(q);
    });
  }, [tabRows, mentorFilter, search]);

  const counts = { review: pendingRows.length, cancel: cancelRows.length, change: changeRows.length };
  const busy = reviewBatch.isPending || reviewOne.isPending || cancelBatch.isPending || changeResolve.isPending;
  const listLoading = tab === 'review' ? pending.isPending : all.isPending;
  const listError = tab === 'review' ? pending.error : all.error;
  const hasFilters = search.trim() !== '' || mentorFilter !== 'ALL';

  const togglePick = (id) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const toggleAllVisible = () => {
    if (visibleRows.length > 0 && visibleRows.every((r) => picked.includes(r.id))) {
      setPicked([]);
    } else {
      setPicked(visibleRows.map((r) => r.id));
    }
  };

  function submitModalReason(e) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(tr('Vui lòng nhập lý do xử lý.'));
      return;
    }
    setReasonError('');
    if (modalAction.mode === 'reject-one') {
      reviewOne.mutate({ id: modalAction.ids[0], approve: false, note: trimmed });
    } else if (modalAction.mode === 'reject-batch') {
      reviewBatch.mutate({ ids: modalAction.ids, approve: false, note: trimmed });
    } else if (modalAction.mode === 'reject-cancel') {
      cancelBatch.mutate({ ids: modalAction.ids, approve: false, note: trimmed });
    } else if (modalAction.mode === 'resolve-change') {
      changeResolve.mutate({ id: modalAction.ids[0], cancelSlot: false, note: trimmed });
    }
  }

  const columns = [
    ...(tab !== 'change'
      ? [
          {
            key: 'select',
            header: (
              <Checkbox
                checked={visibleRows.length > 0 && visibleRows.every((r) => picked.includes(r.id))}
                onChange={toggleAllVisible}
                aria-label={tr('Chọn tất cả')}
              />
            ),
            render: (row) => (
              <Checkbox
                checked={picked.includes(row.id)}
                onChange={() => togglePick(row.id)}
                aria-label={trf('Chọn khung giờ #{0}', { 0: row.id })}
              />
            ),
          },
        ]
      : []),
    {
      key: 'mentorName',
      header: tr('Giáo viên'),
      render: (row) => (
        <span className="font-semibold text-rp-text">
          {row.mentorName || trf('Giáo viên #{0}', { 0: row.mentorId })}
        </span>
      ),
    },
    {
      key: 'startTime',
      header: tr('Thời gian (GMT+7)'),
      render: (row) => (
        <span className="whitespace-nowrap text-xs font-medium text-rp-text-2">
          {formatSlotTime(row.startTime)}
        </span>
      ),
    },
    {
      key: 'kind',
      header: tr('Loại yêu cầu'),
      render: (row) => (
        <Badge tone={tab === 'cancel' ? 'danger' : tab === 'change' ? 'warning' : 'brand'} size="sm" icon={false}>
          {tab === 'cancel' ? tr('Xin hủy khung giờ') : tab === 'change' ? tr('Xin đổi giờ dạy') : tr('Đăng ký khung giờ')}
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: tr('Lý do / Ghi chú'),
      render: (row) => (
        <span className="line-clamp-2 max-w-[260px] text-xs text-rp-text-muted">
          {row.cancelReason || row.changeReason || tr('Đăng ký lịch mới')}
        </span>
      ),
    },
  ];

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Yêu cầu đổi/hủy lịch')}>
      <main data-page="AdminSlotReview" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Vận hành & lịch dạy')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="calendar" icon={CalendarClock} size="lg" />
              <span>{tr('Yêu cầu đổi / hủy & duyệt khung giờ')}</span>
            </span>
          }
          description={tr('Kiểm tra xung đột lịch, khoảng nghỉ giữa buổi và phê duyệt hoặc phản hồi yêu cầu từ Giáo viên.')}
          actions={<RefreshingIndicator active={pending.isFetching || all.isFetching} />}
        />

        <Tabs
          variant="pill"
          label={tr('Phân loại yêu cầu lịch')}
          value={tab}
          onChange={(nextTab) => {
            setTab(nextTab);
            setPicked([]);
            setMentorFilter('ALL');
            setSearch('');
          }}
          tabs={TABS.map((t) => ({ value: t.id, label: tr(t.label), count: counts[t.id] }))}
        />

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[200px] flex-1">
              <Input
                type="search"
                icon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Tìm theo tên Giáo viên hoặc lý do yêu cầu…')}
                aria-label={tr('Tìm kiếm yêu cầu')}
              />
            </div>

            <div className="w-full sm:w-[210px]">
              <CustomSelect
                value={mentorFilter}
                aria-label={tr('Lọc theo Giáo viên')}
                onChange={setMentorFilter}
                options={[{ value: 'ALL', label: tr('Tất cả Giáo viên') }, ...mentorOptions]}
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); setMentorFilter('ALL'); }}>
                {tr('Xóa bộ lọc')}
              </Button>
            )}

            {picked.length > 0 && tab === 'review' && (
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={CheckCircle2}
                  disabled={busy}
                  onClick={() => reviewBatch.mutate({ ids: picked, approve: true })}
                >
                  {trf('Duyệt ({0})', { 0: picked.length })}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={XCircle}
                  disabled={busy}
                  onClick={() => {
                    setReason('');
                    setReasonError('');
                    setModalAction({ mode: 'reject-batch', ids: picked });
                  }}
                >
                  {trf('Từ chối ({0})', { 0: picked.length })}
                </Button>
              </div>
            )}

            {picked.length > 0 && tab === 'cancel' && (
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={CheckCircle2}
                  disabled={busy}
                  onClick={() => cancelBatch.mutate({ ids: picked, approve: true })}
                >
                  {trf('Chấp thuận hủy ({0})', { 0: picked.length })}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={XCircle}
                  disabled={busy}
                  onClick={() => {
                    setReason('');
                    setReasonError('');
                    setModalAction({ mode: 'reject-cancel', ids: picked });
                  }}
                >
                  {trf('Từ chối hủy ({0})', { 0: picked.length })}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {listLoading ? (
          <SakuraLoader variant="section" context="cohort" delay={140} />
        ) : listError ? (
          <ContextualErrorState
            error={listError}
            title={tr('Chưa tải được danh sách yêu cầu')}
            onRetry={() => (tab === 'review' ? pending.refetch() : all.refetch())}
          />
        ) : visibleRows.length === 0 ? (
          <ContextualEmptyState
            title={hasFilters ? tr('Không có yêu cầu nào khớp bộ lọc') : tr('Hiện không có yêu cầu nào trong mục này')}
            description={tr('Mọi khung giờ hoặc yêu cầu mới từ Giáo viên sẽ tự động hiển thị tại đây.')}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={visibleRows}
            rowKey={(r) => r.id}
            rowActions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                <IconButton
                  icon={Eye}
                  size="sm"
                  variant="ghost"
                  label={tr('Xem chi tiết')}
                  onClick={() => setDetailSlot(row)}
                />
                {tab === 'review' && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => reviewOne.mutate({ id: row.id, approve: true })}
                    >
                      {tr('Duyệt')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setModalAction({ mode: 'reject-one', ids: [row.id] });
                      }}
                    >
                      {tr('Từ chối')}
                    </Button>
                  </>
                )}
                {tab === 'cancel' && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => cancelBatch.mutate({ ids: [row.id], approve: true })}
                    >
                      {tr('Duyệt hủy')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setModalAction({ mode: 'reject-cancel', ids: [row.id] });
                      }}
                    >
                      {tr('Từ chối')}
                    </Button>
                  </>
                )}
                {tab === 'change' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setReason('');
                      setReasonError('');
                      setModalAction({ mode: 'resolve-change', ids: [row.id] });
                    }}
                  >
                    {tr('Phản hồi đổi tiết')}
                  </Button>
                )}
              </div>
            )}
          />
        )}

        {/* Slot Detail Drawer */}
        <Drawer
          open={Boolean(detailSlot)}
          onClose={() => setDetailSlot(null)}
          title={detailSlot ? `${tr('Chi tiết khung giờ')} #${detailSlot.id}` : ''}
          description={detailSlot?.mentorName || ''}
          size="md"
        >
          {detailSlot && (
            <div className="space-y-4 text-sm">
              <Card className="space-y-2 bg-rp-bg-2/40 p-4">
                <p><strong>{tr('Giáo viên')}:</strong> {detailSlot.mentorName || `#${detailSlot.mentorId}`}</p>
                <p><strong>{tr('Bắt đầu')}:</strong> {formatSlotTime(detailSlot.startTime)}</p>
                <p><strong>{tr('Kết thúc')}:</strong> {formatSlotTime(detailSlot.endTime)}</p>
                {detailSlot.cohortName && <p><strong>{tr('Lớp gắn kèm')}:</strong> {detailSlot.cohortName}</p>}
              </Card>
              {(detailSlot.cancelReason || detailSlot.changeReason) && (
                <Banner tone="warning" title={tr('Lý do Giáo viên gửi')}>
                  {detailSlot.cancelReason || detailSlot.changeReason}
                </Banner>
              )}
            </div>
          )}
        </Drawer>

        {/* Reason Modal */}
        <Modal
          open={Boolean(modalAction)}
          onClose={() => !busy && setModalAction(null)}
          title={
            modalAction?.mode === 'resolve-change'
              ? tr('Phản hồi yêu cầu đổi tiết')
              : modalAction?.mode === 'reject-cancel'
                ? tr('Từ chối yêu cầu hủy khung giờ')
                : tr('Từ chối khung giờ dạy')
          }
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setModalAction(null)}>
                {tr('Hủy')}
              </Button>
              <Button variant="danger" loading={busy} onClick={submitModalReason}>
                {tr('Xác nhận')}
              </Button>
            </div>
          }
        >
          <form onSubmit={submitModalReason}>
            <Field label={tr('Lý do / ghi chú gửi Giáo viên')} required error={reasonError}>
              <Textarea
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr('Nhập lý do rõ ràng để Giáo viên điều chỉnh lại lịch…')}
                invalid={Boolean(reasonError)}
              />
            </Field>
          </form>
        </Modal>
      </main>
    </AdminShell>
  );
}
