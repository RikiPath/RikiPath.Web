import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  MessageSquareReply,
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
import { getAdminTeachingProposals } from '@/features/scheduling/api/teachingProposalApi.js';
import AdminTeachingProposalReviewPanel from '@/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminToolbar,
  AdminWorkspace,
} from '@/features/admin/components/AdminPrimitives.jsx';
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
  Drawer,
  Field,
  Modal,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  Textarea,
  notify,
} from '@/components/ui';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';
import { formatDateTime } from '@/utils/dateTimeFormat.js';

const TABS = [
  { id: 'proposals', label: 'Đề xuất mở lớp' },
  { id: 'review', label: 'Khung giờ chờ duyệt' },
  { id: 'cancel', label: 'Xin hủy' },
  { id: 'change', label: 'Xin đổi tiết' },
];

function formatSlotTime(value) {
  return formatDateTime(value, '—');
}

export default function AdminSlotReview({
  embedded = false,
  fillHeight = false,
  allowedTabs = null,
  initialTabOverride = null,
  toolbarTabsOverride = null,
} = {}) {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const visibleTabs = useMemo(
    () => (Array.isArray(allowedTabs) && allowedTabs.length > 0 ? TABS.filter((t) => allowedTabs.includes(t.id)) : TABS),
    [allowedTabs],
  );
  const urlTab = searchParams.get('tab');
  const initialTab = (urlTab && visibleTabs.some((t) => t.id === urlTab) ? urlTab : null) || initialTabOverride;
  const initialProposalId = searchParams.get('proposalId');
  const [tab, setTab] = useState(() => (
    visibleTabs.some((t) => t.id === initialTab) ? initialTab : (visibleTabs[0]?.id || 'proposals')
  ));
  const [search, setSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState('ALL');
  const [picked, setPicked] = useState([]);
  const [detailSlot, setDetailSlot] = useState(null);
  const [modalAction, setModalAction] = useState(null); // { mode: 'reject-one' | 'reject-batch' | 'reject-cancel' | 'resolve-change', ids: [], cancelSlot?: bool }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const pendingProposals = useQuery({
    queryKey: [...ADMIN_KEYS.teachingProposals, 'PendingReview'],
    queryFn: () => getAdminTeachingProposals({ status: 'PendingReview' }),
    enabled: visibleTabs.some((item) => item.id === 'proposals'),
  });
  const pending = useQuery({
    queryKey: ADMIN_KEYS.pendingSlots,
    queryFn: getPendingMentorSlots,
    enabled: visibleTabs.some((item) => item.id === 'review'),
  });
  const all = useQuery({
    queryKey: ADMIN_KEYS.mentorSlots,
    queryFn: async () => unwrapApiList(await getAdminMentorAvailabilities()),
    enabled: visibleTabs.some((item) => item.id === 'cancel' || item.id === 'change'),
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
      notify.success(vars.approve ? tr('Đã phê duyệt khung giờ.') : tr('Đã từ chối khung giờ.'), '', { key: 'admin-slot-review-one', replace: true });
      await Promise.allSettled([refreshAll()]);
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được khung giờ'), { key: 'admin-slot-review-one-err', replace: true }),
  });

  const reviewBatch = useMutation({
    mutationFn: ({ ids, approve, note }) => reviewMentorSlots(ids, approve, note),
    onSuccess: async (_, vars) => {
      setModalAction(null);
      setReason('');
      notify.success(
        vars.approve ? tr('Đã phê duyệt các khung giờ đã chọn.') : tr('Đã từ chối các khung giờ đã chọn.'),
        '',
        { key: 'admin-slot-review-batch', replace: true },
      );
      await Promise.allSettled([refreshAll()]);
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được khung giờ chờ duyệt'), { key: 'admin-slot-review-batch-err', replace: true }),
  });

  const cancelBatch = useMutation({
    mutationFn: ({ ids, approve, note }) => reviewMentorSlotCancels(ids, approve, note),
    onSuccess: async (_, vars) => {
      setModalAction(null);
      setReason('');
      notify.success(
        vars.approve ? tr('Đã chấp thuận yêu cầu hủy khung giờ.') : tr('Đã từ chối yêu cầu hủy khung giờ.'),
        '',
        { key: 'admin-slot-cancel-review', replace: true },
      );
      await Promise.allSettled([refreshAll()]);
    },
    onError: (err) => notify.apiError(err, tr('Chưa xử lý được yêu cầu hủy'), { key: 'admin-slot-cancel-review-err', replace: true }),
  });

  const changeResolve = useMutation({
    mutationFn: ({ id, cancelSlot, note }) => resolveSlotChange(id, { cancelSlot, reason: note }),
    onSuccess: async () => {
      setModalAction(null);
      setReason('');
      notify.success(tr('Đã phản hồi yêu cầu đổi tiết.'), '', { key: 'admin-slot-change-review', replace: true });
      await Promise.allSettled([refreshAll()]);
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

  const counts = {
    proposals: Array.isArray(pendingProposals.data) ? pendingProposals.data.length : 0,
    review: pendingRows.length,
    cancel: cancelRows.length,
    change: changeRows.length,
  };
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
            compact: true,
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
      align: 'left',
      render: (row) => (
        <span className="font-semibold text-rp-text">
          {row.mentorName || trf('Giáo viên #{0}', { 0: row.mentorId })}
        </span>
      ),
    },
    {
      key: 'startTime',
      header: tr('Thời gian'),
      align: 'center',
      compact: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs font-medium text-rp-text-2">
          {formatSlotTime(row.startTime)}
        </span>
      ),
    },
    {
      key: 'kind',
      header: tr('Loại yêu cầu'),
      align: 'center',
      compact: true,
      render: () => (
        <Badge tone={tab === 'cancel' ? 'danger' : tab === 'change' ? 'warning' : 'brand'} size="sm" icon={false}>
          {tab === 'cancel' ? tr('Xin hủy khung giờ') : tab === 'change' ? tr('Xin đổi giờ dạy') : tr('Đăng ký khung giờ')}
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: tr('Lý do / Ghi chú'),
      align: 'left',
      render: (row) => {
        const text = row.cancelReason || row.changeReason || tr('Đăng ký lịch mới');
        return (
          <span title={text} className="line-clamp-2 max-w-[360px] text-xs text-rp-text-muted">
            {text}
          </span>
        );
      },
    },
  ];

  const useFill = (!embedded && tab !== 'proposals') || fillHeight;

  const toolbarTabs = toolbarTabsOverride || (visibleTabs.length > 1
    ? {
        label: tr('Phân loại yêu cầu lịch'),
        value: tab,
        onChange: (nextTab) => {
          setTab(nextTab);
          setPicked([]);
          setMentorFilter('ALL');
          setSearch('');
        },
        tabs: visibleTabs.map((t) => ({ value: t.id, label: tr(t.label), count: counts[t.id] })),
      }
    : null);

  const batchActions = picked.length > 0 && tab === 'review' ? (
    <>
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
    </>
  ) : picked.length > 0 && tab === 'cancel' ? (
    <>
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
    </>
  ) : null;

  const activeQuery = tab === 'review' ? pending : all;
  const isTabRefreshing = tab === 'proposals' ? pendingProposals.isFetching : activeQuery.isFetching && !activeQuery.isPending;
  const refreshActiveTab = () =>
    (tab === 'review' ? pending.refetch({ cancelRefetch: true }) : all.refetch({ cancelRefetch: true }));

  const showNonProposalToolbar = Boolean(toolbarTabs || (!listLoading && !listError && tabRows.length > 0));

  const bodyContent = (
    <div className={useFill ? 'flex min-h-0 flex-1 flex-col gap-4 text-rp-text' : 'space-y-4 text-rp-text'}>
      {!embedded && (
        <AdminPageHeader
          icon={CalendarClock}
          title="Yêu cầu đổi/hủy lịch"
        />
      )}

      {tab === 'proposals' ? (
        <AdminTeachingProposalReviewPanel initialProposalId={initialProposalId} toolbarTabs={toolbarTabs} fillHeight={useFill} />
      ) : (
        <>
          {showNonProposalToolbar && (
            <AdminToolbar
              tabs={toolbarTabs}
              refresh={{
                when: !listLoading && !listError && tabRows.length > 0,
                onRefresh: refreshActiveTab,
                refreshing: isTabRefreshing,
              }}
              actions={batchActions}
            >
              {!listLoading && !listError && tabRows.length > 0 && (
                <>
                  <SearchInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClear={() => setSearch('')}
                    placeholder="Tìm Giáo viên hoặc lý do…"
                    aria-label={tr('Tìm kiếm yêu cầu')}
                    className="w-full sm:w-[245px]"
                  />

                  <CustomSelect
                    fitContent
                    value={mentorFilter}
                    aria-label={tr('Giáo viên')}
                    onChange={setMentorFilter}
                    options={[{ value: 'ALL', label: tr('Tất cả') }, ...mentorOptions]}
                  />

                  {hasFilters && (
                    <Button variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); setMentorFilter('ALL'); }}>
                      {tr('Xóa bộ lọc')}
                    </Button>
                  )}
                </>
              )}
            </AdminToolbar>
          )}

        {isTabRefreshing && (
          <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-end overflow-visible">
            <div className="mr-1 mt-1">
              <RefreshingIndicator active delay={60} />
            </div>
          </div>
        )}

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
            variant={tabRows.length > 0 && hasFilters ? 'search' : 'default'}
            illustration={tabRows.length > 0 && hasFilters ? 'search' : 'appointment'}
            title={tabRows.length > 0 && hasFilters ? tr('Không có yêu cầu nào khớp bộ lọc') : tr('Hiện không có yêu cầu nào trong mục này')}
            description={tabRows.length > 0 && hasFilters ? tr('Thử thay đổi bộ lọc để xem các yêu cầu khác.') : ''}
            action={tabRows.length > 0 && hasFilters ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); setMentorFilter('ALL'); }}>{tr('Xóa bộ lọc')}</Button> : null}
          />
        ) : (
          <AdminDataTable
            columns={columns}
            rows={visibleRows}
            rowKey={(r) => r.id}
            itemLabel="yêu cầu"
            fillHeight={useFill}
            rowActions={(row) => (
              <AdminRowActions>
                <AdminIconAction
                  kind="view"
                  tooltip="Xem chi tiết khung giờ"
                  onClick={() => setDetailSlot(row)}
                />
                {tab === 'review' && (
                  <>
                    <AdminIconAction
                      icon={CheckCircle2}
                      tone="success"
                      tooltip="Phê duyệt khung giờ dạy"
                      disabled={busy}
                      onClick={() => reviewOne.mutate({ id: row.id, approve: true })}
                    />
                    <AdminIconAction
                      icon={XCircle}
                      tone="danger"
                      tooltip="Từ chối khung giờ dạy"
                      disabled={busy}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setModalAction({ mode: 'reject-one', ids: [row.id] });
                      }}
                    />
                  </>
                )}
                {tab === 'cancel' && (
                  <>
                    <AdminIconAction
                      icon={CheckCircle2}
                      tone="success"
                      tooltip="Chấp thuận hủy khung giờ"
                      disabled={busy}
                      onClick={() => cancelBatch.mutate({ ids: [row.id], approve: true })}
                    />
                    <AdminIconAction
                      icon={XCircle}
                      tone="danger"
                      tooltip="Từ chối yêu cầu hủy khung giờ"
                      disabled={busy}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setModalAction({ mode: 'reject-cancel', ids: [row.id] });
                      }}
                    />
                  </>
                )}
                {tab === 'change' && (
                  <AdminIconAction
                    icon={MessageSquareReply}
                    tone="brand"
                    tooltip="Phản hồi yêu cầu đổi tiết"
                    disabled={busy}
                    onClick={() => {
                      setReason('');
                      setReasonError('');
                      setModalAction({ mode: 'resolve-change', ids: [row.id] });
                    }}
                  />
                )}
              </AdminRowActions>
            )}
          />
        )}
          </>
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
    </div>
  );

  if (embedded) return bodyContent;
  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Yêu cầu đổi/hủy lịch')}>
      <AdminWorkspace data-page="AdminSlotReview" viewportLocked>
        {bodyContent}
      </AdminWorkspace>
    </AdminShell>
  );
}
