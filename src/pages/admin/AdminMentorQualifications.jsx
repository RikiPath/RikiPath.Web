import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, GraduationCap, Plus, ShieldOff, X } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  Modal,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  Textarea,
  notify,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import {
  getAdminMentorQualifications,
  grantAdminMentorQualification,
  revokeAdminMentorQualification,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

export default function AdminMentorQualifications({ fillHeight = false } = {}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [grantTarget, setGrantTarget] = useState(null); // mentor summary row
  const [grantLevelId, setGrantLevelId] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantError, setGrantError] = useState('');

  const [revokeTarget, setRevokeTarget] = useState(null); // { mentor, badge }
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState('');

  const qualQuery = useQuery({
    queryKey: ADMIN_KEYS.mentorQualifications,
    queryFn: getAdminMentorQualifications,
  });

  const grantMutation = useMutation({
    mutationFn: ({ mentorId, certificateLevelId, reason }) =>
      grantAdminMentorQualification(mentorId, {
        certificateLevelId: Number(certificateLevelId),
        reason: reason || null,
      }),
    onSuccess: async () => {
      setGrantTarget(null);
      setGrantLevelId('');
      setGrantReason('');
      setGrantError('');
      notify.success(tr('Đã cấp quyền giảng dạy JLPT cho Giáo viên.'), '', { key: 'admin-qual-grant', replace: true });
      await Promise.allSettled([invalidateAdminDomains(queryClient, ['mentors'])]);
    },
    onError: (err) => {
      const msg = describeApiError(err)?.message || tr('Chưa thể cấp quyền giảng dạy.');
      setGrantError(msg);
      notify.apiError(err, tr('Chưa thể cấp quyền giảng dạy'), { key: 'admin-qual-grant-err', replace: true });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ mentorId, certificateLevelId, reason }) =>
      revokeAdminMentorQualification(mentorId, certificateLevelId, { reason }),
    onSuccess: async () => {
      setRevokeTarget(null);
      setRevokeReason('');
      setRevokeError('');
      notify.success(tr('Đã thu hồi quyền giảng dạy (dữ liệu lớp lịch sử được giữ nguyên).'), '', {
        key: 'admin-qual-revoke',
        replace: true,
      });
      await Promise.allSettled([invalidateAdminDomains(queryClient, ['mentors'])]);
    },
    onError: (err) => {
      const msg = describeApiError(err)?.message || tr('Không thu hồi được quyền giảng dạy.');
      setRevokeError(msg);
      notify.apiError(err, tr('Không thu hồi được quyền giảng dạy'), { key: 'admin-qual-revoke-err', replace: true });
    },
  });

  const levels = useMemo(() => qualQuery.data?.levels || [], [qualQuery.data]);
  const mentors = useMemo(() => qualQuery.data?.mentors || [], [qualQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mentors.filter((m) => {
      if (q && !`${m.fullName} ${m.email} ${m.declaredJlptLevel || ''}`.toLowerCase().includes(q)) return false;
      if (levelFilter === 'NONE') return (m.activeQualifications || []).length === 0;
      if (levelFilter !== 'ALL') {
        return (m.activeQualifications || []).some((b) => String(b.certificateLevelId) === levelFilter);
      }
      return true;
    });
  }, [mentors, search, levelFilter]);

  const hasFilters = search.trim() !== '' || levelFilter !== 'ALL';

  function openGrantModal(mentor) {
    const activeIds = new Set((mentor.activeQualifications || []).map((q) => Number(q.certificateLevelId)));
    const firstAvailable = levels.find((l) => !activeIds.has(Number(l.id)));
    setGrantTarget(mentor);
    setGrantLevelId(firstAvailable ? String(firstAvailable.id) : '');
    setGrantReason('');
    setGrantError('');
  }

  function submitGrant(e) {
    e.preventDefault();
    if (!grantLevelId) {
      setGrantError(tr('Vui lòng chọn cấp độ cần cấp quyền.'));
      return;
    }
    setGrantError('');
    grantMutation.mutate({
      mentorId: grantTarget.mentorId,
      certificateLevelId: Number(grantLevelId),
      reason: grantReason.trim(),
    });
  }

  function submitRevoke(e) {
    e.preventDefault();
    if (revokeReason.trim().length < 3) {
      setRevokeError(tr('Vui lòng nhập lý do thu hồi (ít nhất 3 ký tự).'));
      return;
    }
    setRevokeError('');
    revokeMutation.mutate({
      mentorId: revokeTarget.mentor.mentorId,
      certificateLevelId: revokeTarget.badge.certificateLevelId,
      reason: revokeReason.trim(),
    });
  }

  const columns = [
    {
      key: 'fullName',
      header: tr('Giáo viên'),
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-rp-text">{row.fullName}</p>
          <p className="truncate text-xs text-rp-text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: tr('Hồ sơ & Chứng chỉ'),
      render: (row) => (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Badge tone={row.verificationStatus === 'Approved' ? 'success' : 'warning'} size="sm" icon={false}>
            {row.verificationStatus === 'Approved' ? tr('Đã duyệt hồ sơ') : tr(row.verificationStatus)}
          </Badge>
          {row.declaredJlptLevel && (
            <Badge tone="neutral" size="sm" icon={false}>
              {tr('Chứng chỉ')}: {row.declaredJlptLevel}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'activeQualifications',
      header: tr('Quyền giảng dạy hiện tại'),
      render: (row) => (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {row.activeQualifications?.length ? (
            row.activeQualifications.map((badge) => (
              <span
                key={badge.certificateLevelId}
                className="inline-flex items-center gap-1 rounded-full border border-rp-brand-border bg-rp-brand-tint px-2.5 py-0.5 text-xs font-semibold text-rp-brand-strong"
                title={`${tr('Cấp bởi')}: ${badge.verifiedByAdminName} (${formatVnDateTime(badge.verifiedAtUtc)})`}
              >
                <span>{badge.levelCode}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRevokeTarget({ mentor: row, badge });
                    setRevokeReason('');
                    setRevokeError('');
                  }}
                  className="rp-focus ml-0.5 rounded-full p-0.5 text-rp-text-muted hover:bg-white hover:text-rp-brand-strong"
                  aria-label={trf('Thu hồi quyền {0}', { 0: badge.levelCode })}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-rp-text-muted">{tr('Chưa cấp quyền nào')}</span>
          )}
        </div>
      ),
    },
  ];

  const availableGrantLevels = useMemo(() => {
    if (!grantTarget) return [];
    const owned = new Set((grantTarget.activeQualifications || []).map((q) => Number(q.certificateLevelId)));
    return levels.filter((l) => !owned.has(Number(l.id)));
  }, [grantTarget, levels]);

  return (
    <div data-page="AdminMentorQualifications" className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {qualQuery.isSuccess && mentors.length > 0 && <AdminToolbar
        refresh={{
          onRefresh: () => qualQuery.refetch({ cancelRefetch: true }),
          refreshing: qualQuery.isFetching && !qualQuery.isPending,
        }}
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Tìm Giáo viên, email, chứng chỉ…"
          aria-label={tr('Tìm Giáo viên')}
          className="w-full sm:w-[240px]"
        />

        <CustomSelect
          fitContent
          value={levelFilter}
          aria-label={tr('Lọc theo quyền giảng dạy')}
          onChange={setLevelFilter}
          options={[
            { value: 'ALL', label: tr('Mọi cấp độ phân quyền') },
            { value: 'NONE', label: tr('Chưa cấp quyền nào') },
            ...levels.map((lvl) => ({
              value: String(lvl.id),
              label: `${lvl.certificateCode} · ${lvl.code}`,
            })),
          ]}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); setLevelFilter('ALL'); }}>
            {tr('Xóa bộ lọc')}
          </Button>
        )}
      </AdminToolbar>}

      {qualQuery.isFetching && !qualQuery.isPending && (
        <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-end overflow-visible">
          <div className="mr-1 mt-1">
            <RefreshingIndicator active delay={60} />
          </div>
        </div>
      )}

      {qualQuery.isPending ? (
        <SakuraLoader variant="section" context="data" label={tr('Đang tải dữ liệu phân quyền')} delay={140} />
      ) : qualQuery.isError ? (
        <ContextualErrorState
          error={qualQuery.error}
          title={tr('Chưa tải được danh sách phân quyền JLPT')}
          onRetry={() => qualQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <ContextualEmptyState
          variant={mentors.length > 0 && hasFilters ? 'search' : 'default'}
          illustration={mentors.length > 0 && hasFilters ? 'search' : 'mentor'}
          title={mentors.length > 0 && hasFilters ? tr('Không có Giáo viên nào khớp bộ lọc') : tr('Chưa có Giáo viên nào')}
          description={mentors.length > 0 ? tr('Hãy kiểm tra hồ sơ Giáo viên hoặc bỏ bộ lọc để xem toàn bộ danh sách.') : ''}
          action={
            mentors.length > 0 && hasFilters ? (
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setLevelFilter('ALL'); }}>
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null
          }
        />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.mentorId}
          itemLabel="Giáo viên"
          fillHeight={fillHeight}
          rowActions={(row) => (
            <AdminRowActions>
              {row.verificationStatus === 'Approved' ? (
                <AdminIconAction
                  icon={Plus}
                  tone="brand"
                  tooltip="Cấp quyền giảng dạy JLPT"
                  disabled={levels.length === 0 || (row.activeQualifications?.length || 0) >= levels.length}
                  onClick={() => openGrantModal(row)}
                />
              ) : (
                <AdminIconAction
                  icon={BadgeCheck}
                  tone="warning"
                  tooltip="Mở xét duyệt hồ sơ Giáo viên"
                  onClick={() => window.location.assign(`/admin/mentor-verifications/?mentorId=${row.mentorId}`)}
                />
              )}
            </AdminRowActions>
          )}
        />
      )}

      {/* Grant Qualification Modal */}
      <Modal
        open={Boolean(grantTarget)}
        onClose={() => !grantMutation.isPending && setGrantTarget(null)}
        title={grantTarget ? `${tr('Cấp quyền giảng dạy')}: ${grantTarget.fullName}` : ''}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={grantMutation.isPending} onClick={() => setGrantTarget(null)}>
              {tr('Hủy')}
            </Button>
            <Button
              icon={GraduationCap}
              loading={grantMutation.isPending}
              disabled={!availableGrantLevels.length}
              onClick={submitGrant}
            >
              {tr('Xác nhận cấp quyền')}
            </Button>
          </div>
        }
      >
        {grantTarget && (
          <form onSubmit={submitGrant} className="space-y-4">
            {grantError && <Banner tone="danger">{grantError}</Banner>}
            <p className="text-xs text-rp-text-muted">
              {tr('Chứng chỉ JLPT đã khai báo')}: <strong>{grantTarget.declaredJlptLevel || tr('Chưa khai báo')}</strong>
            </p>
            <Field label={tr('Cấp độ được phép giảng dạy')} required>
              <CustomSelect
                value={grantLevelId}
                aria-label={tr('Chọn cấp độ JLPT')}
                onChange={setGrantLevelId}
                options={availableGrantLevels.map((l) => ({
                  value: String(l.id),
                  label: `${l.certificateCode} · ${l.code}`,
                }))}
              />
            </Field>
            <Field label={tr('Ghi chú kiểm duyệt (tùy chọn)')}>
              <Textarea
                rows={3}
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder={tr('Ví dụ: Đã đối chiếu chứng chỉ N1 bản gốc…')}
              />
            </Field>
          </form>
        )}
      </Modal>

      {/* Revoke Qualification Modal */}
      <Modal
        open={Boolean(revokeTarget)}
        onClose={() => !revokeMutation.isPending && setRevokeTarget(null)}
        title={
          revokeTarget
            ? trf('Thu hồi quyền {0} của {1}', { 0: revokeTarget.badge.levelCode, 1: revokeTarget.mentor.fullName })
            : ''
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={revokeMutation.isPending} onClick={() => setRevokeTarget(null)}>
              {tr('Hủy')}
            </Button>
            <Button variant="danger" icon={ShieldOff} loading={revokeMutation.isPending} onClick={submitRevoke}>
              {tr('Xác nhận thu hồi')}
            </Button>
          </div>
        }
      >
        <form onSubmit={submitRevoke} className="space-y-4">
          {revokeError && <Banner tone="danger">{revokeError}</Banner>}
          <Banner tone="warning">
            {tr('Thu hồi quyền chỉ ngăn mở lớp mới ở cấp độ này. Các lớp và buổi học lịch sử của Giáo viên vẫn được bảo toàn nguyên vẹn.')}
          </Banner>
          <Field label={tr('Lý do thu hồi')} required error={revokeError}>
            <Textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder={tr('Nhập lý do thu hồi quyền giảng dạy…')}
              invalid={Boolean(revokeError)}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
