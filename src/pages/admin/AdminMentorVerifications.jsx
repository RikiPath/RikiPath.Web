import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  MessageSquarePlus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  Input,
  Modal,
  Pagination,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
  Textarea,
  notify,
} from '@/components/ui';
import { usePagination } from '@/hooks/usePagination.js';
import {
  getAdminMentorProfile,
  getAdminMentorVerificationDocument,
  getAdminMentorVerifications,
  unwrapApiList,
  unwrapApiResult,
  verifyAdminMentor,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS_META = {
  Pending: { label: 'Chờ xét duyệt', tone: 'warning', dot: '#f59e0b' },
  ChangesRequested: { label: 'Cần bổ sung thông tin', tone: 'info', dot: '#0284c7' },
  Rejected: { label: 'Không được phê duyệt', tone: 'danger', dot: '#ef4444' },
  Approved: { label: 'Đã phê duyệt', tone: 'success', dot: '#22c55e' },
  Unverified: { label: 'Chưa gửi hồ sơ', tone: 'neutral', dot: '#94a3b8' },
};

const fullName = (row) =>
  row?.fullName?.trim() || [row?.firstName, row?.lastName].filter(Boolean).join(' ') || 'Giáo viên chưa cập nhật tên';

export default function AdminMentorVerifications() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const selectedId = Number(params.get('mentorId')) || null;
  const initialStatus = params.get('status');
  const [status, setStatus] = useState(
    initialStatus && (initialStatus === 'All' || Object.hasOwn(STATUS_META, initialStatus)) ? initialStatus : 'Pending',
  );
  const [search, setSearch] = useState('');

  const [actionModal, setActionModal] = useState(null); // { decision: 'Approve' | 'Reject' | 'RequestChanges' }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [documentState, setDocumentState] = useState(null);

  const listQuery = useQuery({
    queryKey: ADMIN_KEYS.mentorVerifications,
    queryFn: async () => unwrapApiList(await getAdminMentorVerifications()),
    refetchInterval: 30000,
  });

  const detailQuery = useQuery({
    queryKey: ['admin-mentor-verification', selectedId],
    queryFn: async () => unwrapApiResult(await getAdminMentorProfile(selectedId)),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    const onNew = () => {
      invalidateAdminDomains(queryClient, ['mentors']);
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
    };
    window.addEventListener('rikipath:mentor-verification', onNew);
    return () => window.removeEventListener('rikipath:mentor-verification', onNew);
  }, [queryClient, selectedId]);

  useEffect(() => {
    return () => {
      if (documentState?.url) URL.revokeObjectURL(documentState.url);
    };
  }, [documentState]);

  const docMutation = useMutation({
    mutationFn: () => getAdminMentorVerificationDocument(selectedId),
    onSuccess: (blob) => {
      setDocumentState((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          mentorId: selectedId,
          url: URL.createObjectURL(blob),
          isPdf: String(blob?.type || '').toLowerCase().includes('pdf'),
        };
      });
    },
    onError: (err) => notify.apiError(err, tr('Không mở được tài liệu xác minh'), { key: 'admin-doc-err', replace: true }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ decision, note }) =>
      verifyAdminMentor(selectedId, {
        decision,
        rejectionReason: decision === 'Reject' ? note : null,
        reviewNotes: decision === 'RequestChanges' || decision === 'Approve' ? note || null : null,
      }),
    onSuccess: async () => {
      setActionModal(null);
      setReason('');
      setReasonError('');
      await invalidateAdminDomains(queryClient, ['mentors']);
      if (selectedId) await queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
      notify.success(tr('Đã lưu quyết định xét duyệt hồ sơ Giáo viên.'), '', {
        key: `admin-mentor-verify-${selectedId}`,
        replace: true,
      });
    },
    onError: async (err) => {
      await invalidateAdminDomains(queryClient, ['mentors']);
      if (selectedId) await queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
      notify.apiError(err, tr('Không thể xét duyệt hồ sơ'), {
        key: `admin-mentor-verify-err-${selectedId}`,
        replace: true,
      });
    },
  });

  const rows = useMemo(() => listQuery.data || [], [listQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi-VN');
    return rows.filter((row) => {
      const matchesStatus = status === 'All' || row.verificationStatus === status;
      const text = `${fullName(row)} ${row.email || ''} ${row.expertise || ''}`.toLocaleLowerCase('vi-VN');
      return matchesStatus && text.includes(q);
    });
  }, [rows, status, search]);

  const pagination = usePagination(filtered, { initialPageSize: 10 });
  const detail = detailQuery.data;
  const activeDocUrl = documentState?.mentorId === selectedId ? documentState.url : '';
  const hasFilters = status !== 'Pending' || search.trim() !== '';

  const selectMentor = (id) => {
    const next = new URLSearchParams(params);
    next.set('mentorId', String(id));
    setParams(next, { replace: true });
  };

  function submitDecision() {
    if (!actionModal) return;
    const trimmed = reason.trim();
    if ((actionModal.decision === 'Reject' || actionModal.decision === 'RequestChanges') && !trimmed) {
      setReasonError(tr('Vui lòng nhập lý do hoặc nội dung cần Giáo viên bổ sung.'));
      return;
    }
    setReasonError('');
    reviewMutation.mutate({ decision: actionModal.decision, note: trimmed });
  }

  return (
    <div data-page="AdminMentorVerifications" className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-[200px] flex-1">
            <Input
              type="search"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr('Tìm tên, email hoặc chuyên môn Giáo viên…')}
              aria-label={tr('Tìm Giáo viên')}
            />
          </div>

          <div className="w-full sm:w-[220px]">
            <CustomSelect
              value={status}
              aria-label={tr('Lọc theo trạng thái hồ sơ')}
              onChange={(val) => {
                setStatus(val);
                const next = new URLSearchParams(params);
                next.set('status', val);
                setParams(next, { replace: true });
              }}
              options={[
                { value: 'All', label: tr('Tất cả trạng thái') },
                ...Object.entries(STATUS_META).map(([value, meta]) => ({
                  value,
                  label: tr(meta.label),
                  dot: meta.dot,
                })),
              ]}
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => { setStatus('Pending'); setSearch(''); }}>
              {tr('Mặc định')}
            </Button>
          )}
          <RefreshingIndicator active={listQuery.isFetching && !listQuery.isPending} />
        </div>
      </Card>

      {listQuery.isError && listQuery.data && (
        <StaleDataBar onRetry={() => listQuery.refetch()} retrying={listQuery.isFetching} />
      )}

      {listQuery.isPending ? (
        <SakuraLoader variant="section" context="profile" label={tr('Đang tải danh sách hồ sơ')} delay={140} />
      ) : listQuery.isError && !listQuery.data ? (
        <ContextualErrorState
          error={listQuery.error}
          title={tr('Không thể tải danh sách hồ sơ')}
          onRetry={() => listQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <ContextualEmptyState
          title={tr('Không có hồ sơ nào khớp bộ lọc')}
          description={
            status === 'Pending'
              ? tr('Hiện không có hồ sơ Giáo viên nào đang chờ xét duyệt.')
              : tr('Thử chuyển bộ lọc trạng thái sang Tất cả để xem các hồ sơ đã xử lý.')
          }
          action={
            status !== 'All' ? (
              <Button variant="outline" onClick={() => setStatus('All')}>{tr('Xem tất cả trạng thái')}</Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Queue List */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-rp-text">{trf('Danh sách hồ sơ ({0})', { 0: filtered.length })}</h2>
            </div>

            <div className="space-y-2">
              {pagination.paginatedData.map((row) => {
                const active = selectedId === row.mentorId;
                const st = STATUS_META[row.verificationStatus] || STATUS_META.Unverified;
                return (
                  <button
                    key={row.mentorId}
                    type="button"
                    onClick={() => selectMentor(row.mentorId)}
                    className={`rp-focus w-full rounded-2xl border p-3.5 text-left transition-colors ${
                      active
                        ? 'border-rp-brand-strong bg-rp-brand-tint/50'
                        : 'border-rp-line bg-white hover:border-rp-brand-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-rp-text">{fullName(row)}</p>
                        <p className="truncate text-xs text-rp-text-muted">{row.email}</p>
                      </div>
                      <Badge tone={st.tone} size="sm" icon={false}>{tr(st.label)}</Badge>
                    </div>
                    {(row.jlptLevel || row.submittedAt) && (
                      <p className="mt-2 text-xs text-rp-text-2">
                        {[
                          row.jlptLevel && `JLPT: ${row.jlptLevel}`,
                          row.submittedAt && `${tr('Nộp')}: ${formatVnDateTime(row.submittedAt)}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={filtered.length}
                showPageSize={false}
                showTotal={false}
                onPageChange={pagination.setCurrentPage}
              />
            )}
          </Card>

          {/* Detail Card */}
          <Card className="space-y-4 p-5">
            {!selectedId ? (
              <ContextualEmptyState
                compact
                title={tr('Chọn một hồ sơ bên trái để kiểm tra')}
                description={tr('Xem thông tin chuyên môn, mở chứng chỉ bảo vệ và ra quyết định xét duyệt.')}
              />
            ) : detailQuery.isPending ? (
              <SakuraLoader variant="section" context="profile" delay={120} />
            ) : detailQuery.isError ? (
              <ContextualErrorState
                compact
                error={detailQuery.error}
                title={tr('Chưa tải được chi tiết hồ sơ')}
                onRetry={() => detailQuery.refetch()}
              />
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rp-line pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-rp-text">{fullName(detail)}</h2>
                    <p className="text-xs text-rp-text-muted">{detail.email}</p>
                  </div>
                  <Badge
                    tone={(STATUS_META[detail.verificationStatus] || STATUS_META.Unverified).tone}
                    size="sm"
                    icon={false}
                  >
                    {tr((STATUS_META[detail.verificationStatus] || STATUS_META.Unverified).label)}
                  </Badge>
                </div>

                {detail.rejectionReason && (
                  <Banner tone="danger" title={tr('Lý do từ chối gần nhất')}>
                    {detail.rejectionReason}
                  </Banner>
                )}
                {detail.reviewNotes && (
                  <Banner tone="info" title={tr('Ghi chú xét duyệt')}>
                    {detail.reviewNotes}
                  </Banner>
                )}

                <dl className="grid gap-3 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Trình độ JLPT khai báo')}</dt>
                    <dd className="mt-0.5 font-semibold text-rp-text">{detail.jlptLevel || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Kinh nghiệm')}</dt>
                    <dd className="mt-0.5 font-semibold text-rp-text">
                      {detail.yearsOfExperience != null ? `${detail.yearsOfExperience} ${tr('năm')}` : '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-rp-text-muted">{tr('Chuyên môn / nơi công tác')}</dt>
                    <dd className="mt-0.5 font-medium text-rp-text">
                      {[detail.expertise, detail.workplace].filter(Boolean).join(' · ') || '—'}
                    </dd>
                  </div>
                  {detail.bio && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-rp-text-muted">{tr('Giới thiệu')}</dt>
                      <dd className="mt-0.5 whitespace-pre-line text-rp-text-2">{detail.bio}</dd>
                    </div>
                  )}
                </dl>

                {/* Verification Document Viewer */}
                <div className="space-y-2 rounded-2xl border border-rp-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-rp-text">{tr('Chứng chỉ / tài liệu xác minh')}</span>
                    {detail.hasVerificationDocument ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={FileText}
                        loading={docMutation.isPending}
                        onClick={() => docMutation.mutate()}
                      >
                        {activeDocUrl ? tr('Tải lại tài liệu') : tr('Mở tài liệu bảo vệ')}
                      </Button>
                    ) : (
                      <Badge tone="danger" size="sm" icon={false}>{tr('Chưa có tài liệu')}</Badge>
                    )}
                  </div>
                  {activeDocUrl && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-rp-line bg-white">
                      {documentState?.isPdf ? (
                        <iframe title={tr('Chứng chỉ xác minh')} src={activeDocUrl} className="h-72 w-full" />
                      ) : (
                        <img src={activeDocUrl} alt={tr('Chứng chỉ xác minh')} className="max-h-72 w-full object-contain" />
                      )}
                    </div>
                  )}
                </div>

                {detail.verificationStatus === 'Pending' && (
                  <div className="flex flex-wrap justify-end gap-2 border-t border-rp-line pt-4">
                    <Button
                      variant="outline"
                      icon={MessageSquarePlus}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setActionModal({ decision: 'RequestChanges' });
                      }}
                    >
                      {tr('Yêu cầu bổ sung')}
                    </Button>
                    <Button
                      variant="danger"
                      icon={XCircle}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setActionModal({ decision: 'Reject' });
                      }}
                    >
                      {tr('Từ chối')}
                    </Button>
                    <Button
                      icon={CheckCircle2}
                      onClick={() => {
                        setReason('');
                        setReasonError('');
                        setActionModal({ decision: 'Approve' });
                      }}
                    >
                      {tr('Phê duyệt hồ sơ')}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* Decision Modal / Confirm */}
      {actionModal?.decision === 'Approve' ? (
        <AlertDialog
          open
          onClose={() => setActionModal(null)}
          onConfirm={() => reviewMutation.mutate({ decision: 'Approve', note: reason.trim() })}
          loading={reviewMutation.isPending}
          title={tr('Phê duyệt hồ sơ Giáo viên?')}
          description={tr('Giáo viên sau khi duyệt sẽ được mở khóa quyền giảng dạy và đăng ký lịch dạy lớp nhóm.')}
          confirmLabel={tr('Xác nhận phê duyệt')}
        />
      ) : (
        <Modal
          open={Boolean(actionModal)}
          onClose={() => !reviewMutation.isPending && setActionModal(null)}
          title={
            actionModal?.decision === 'Reject'
              ? tr('Từ chối hồ sơ Giáo viên')
              : tr('Yêu cầu Giáo viên bổ sung hồ sơ')
          }
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={reviewMutation.isPending} onClick={() => setActionModal(null)}>
                {tr('Hủy')}
              </Button>
              <Button
                variant={actionModal?.decision === 'Reject' ? 'danger' : 'primary'}
                loading={reviewMutation.isPending}
                onClick={submitDecision}
              >
                {actionModal?.decision === 'Reject' ? tr('Xác nhận từ chối') : tr('Gửi yêu cầu bổ sung')}
              </Button>
            </div>
          }
        >
          <Field
            label={actionModal?.decision === 'Reject' ? tr('Lý do từ chối') : tr('Nội dung cần bổ sung')}
            required
            error={reasonError}
          >
            <Textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionModal?.decision === 'Reject'
                  ? tr('Nêu rõ lý do để Giáo viên nắm thông tin…')
                  : tr('Nêu rõ tài liệu hoặc thông tin Giáo viên cần bổ sung…')
              }
              invalid={Boolean(reasonError)}
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
