import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertDialog,
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
  Input,
  Modal,
  SakuraLoader,
  SearchInput,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatusBadge,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import {
  getCohortEntitlements,
  grantCohortEntitlement,
  previewCohortSchedule,
  revokeCohortEntitlement,
  saveCohort,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import ScheduleConflictList from '@/features/scheduling/components/ScheduleConflictList';
import { formatVnDateTime, formatVnSlotWindow, parseUtcDate } from '@/utils/vnDateTime.js';
import { translateTemplate, useLocale } from '@/locales/locale.js';

const PREVIEW_DEBOUNCE_MS = 400;

const ENTITLEMENT_STATUS_META = Object.freeze({
  Active: { label: 'Đang hiệu lực', tone: 'success' },
  Consumed: { label: 'Đã sử dụng', tone: 'warning' },
  Revoked: { label: 'Đã thu hồi', tone: 'danger' },
  Expired: { label: 'Hết hạn', tone: 'neutral' },
});

const ENTITLEMENT_SOURCE_LABELS = Object.freeze({
  AdminManualGrant: 'Admin cấp quyền trực tiếp',
  OfficialJlptSupport: 'Hỗ trợ sau JLPT',
  PlacementTopScore: 'Đặc cách xếp lớp',
  ScholarshipGrant: 'Học bổng / Tài trợ nhóm',
  RemediationApproved: 'Quyền ôn lại JLPT đã duyệt',
  PartnerSponsor: 'Đối tác tài trợ',
});

const SOURCE_TYPES = [
  { value: 'AdminManualGrant', label: 'Admin cấp quyền trực tiếp' },
  { value: 'ScholarshipGrant', label: 'Học bổng / Tài trợ nhóm' },
  { value: 'RemediationApproved', label: 'Quyền ôn lại JLPT đã duyệt' },
  { value: 'PartnerSponsor', label: 'Đối tác tài trợ' },
];

const planLabel = (p) =>
  [
    p.name,
    `${p.level}`,
    p.intensityLabel ? `${p.intensityLabel}${p.isRecommendedIntensity ? ' ★ khuyến nghị' : ''}` : null,
    p.sessionsPerWeek ? translateTemplate('{0} buổi/tuần', { 0: p.sessionsPerWeek }) : null,
    translateTemplate('{0} buổi', { 0: p.totalSessions ?? '?' }),
    p.totalTeachingHours != null ? translateTemplate('{0} giờ', { 0: p.totalTeachingHours }) : null,
    `tối đa ${p.capacity}`,
  ]
    .filter(Boolean)
    .join(' · ');

const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');

export default function AdminCohortConsolePanel({
  plans = [],
  cohorts = [],
  mentors = [],
  adminSlots = [],
  approvedProposals = [],
  initialProposalId = null,
  groupPolicy = null,
  toolbarTabs = null,
  onRefresh = null,
  refreshing = false,
  busy = false,
  fillHeight = false,
  onRun,
}) {
  const { tr, trf } = useLocale();
  const groupPlans = useMemo(() => plans.filter((p) => p.sessionType === 'Group'), [plans]);
  const defaultPolicyCap = Number(groupPolicy?.maxLearners) || 4;

  const [cohortSearch, setCohortSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [sourceProposalId, setSourceProposalId] = useState('');
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [capacity, setCapacity] = useState(defaultPolicyCap);
  const [publish, setPublish] = useState(false);
  const [pickedSlots, setPickedSlots] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [appliedInitialProposal, setAppliedInitialProposal] = useState(false);

  const [entitlementCohort, setEntitlementCohort] = useState(null);
  const [entitlements, setEntitlements] = useState([]);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [entitlementsError, setEntitlementsError] = useState(null);
  const [entitlementTick, setEntitlementTick] = useState(0);
  const [learnerId, setLearnerId] = useState('');
  const [sourceType, setSourceType] = useState('AdminManualGrant');
  const [note, setNote] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);

  const availableMentorSlots = useMemo(() => {
    const selectedPlan = groupPlans.find((p) => String(p.id) === String(planId));
    const editingSlotIds = new Set(
      (editingCohort?.sessions || []).map((s) => s.availabilityId).filter(Boolean),
    );
    return adminSlots.filter((s) => {
      const ownedByEditing = editingCohort && editingSlotIds.has(s.id);
      if (!ownedByEditing && (!s.isApproved || s.rejectedAt || s.isInCohort || s.bookedCount > 0)) return false;
      const start = parseUtcDate(s.startTime);
      const end = parseUtcDate(s.endTime);
      if (!ownedByEditing && (!start || start <= new Date())) return false;
      if (mentorId && String(s.mentorId) !== String(mentorId)) return false;
      if (!ownedByEditing && selectedPlan?.sessionMinutes && end && start) {
        const mins = Math.round((end - start) / 60000);
        if (mins !== selectedPlan.sessionMinutes) return false;
      }
      return true;
    });
  }, [adminSlots, mentorId, planId, groupPlans, editingCohort]);

  const filteredCohorts = useMemo(() => {
    const q = cohortSearch.trim().toLowerCase();
    return cohorts.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.level || '').toLowerCase().includes(q) ||
        String(c.mentorName || '').toLowerCase().includes(q)
      );
    });
  }, [cohorts, cohortSearch, statusFilter]);

  function applyApprovedProposal(proposal) {
    if (!proposal) {
      setSourceProposalId('');
      return;
    }
    setSourceProposalId(String(proposal.id));
    setMentorId(String(proposal.mentorId));
    const matchedPlan = (proposal.coursePlanId && groupPlans.find((p) => Number(p.id) === Number(proposal.coursePlanId)))
      || groupPlans.find((p) => String(p.level) === String(proposal.jlptLevelCode) && Number(p.sessionsPerWeek) === Number(proposal.weeklySessionCount))
      || null;
    if (matchedPlan) {
      setPlanId(String(matchedPlan.id));
      if (matchedPlan.capacity) setCapacity(Math.min(Number(matchedPlan.capacity), defaultPolicyCap));
    } else {
      setPlanId('');
      setCapacity(defaultPolicyCap);
    }
    setName(
      proposal.courseTitle?.trim()
      || `${proposal.jlptLevelCode ? `JLPT ${proposal.jlptLevelCode}` : 'Lớp nhóm'} – ${proposal.mentorName || `#${proposal.mentorId}`}`
    );
    const validSlotIds = new Set(
      adminSlots
        .filter((s) => s.isApproved && !s.rejectedAt && !s.isInCohort && Number(s.bookedCount || 0) === 0)
        .map((s) => s.id)
    );
    const proposalSlots = (proposal.generatedAvailabilityIds || []).filter((id) => validSlotIds.has(id));
    setPickedSlots(proposalSlots);
    setPublish(false);
    setFormErrors({});
  }

  useEffect(() => {
    if (!initialProposalId || appliedInitialProposal || approvedProposals.length === 0) return undefined;
    const match = approvedProposals.find((p) => String(p.id) === String(initialProposalId));
    if (!match) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setAppliedInitialProposal(true);
      setEditingCohort(null);
      applyApprovedProposal(match);
      setCohortModalOpen(true);
    });
    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProposalId, appliedInitialProposal, approvedProposals]);

  function openFromProposal(proposal) {
    if (!proposal) return;
    setEditingCohort(null);
    applyApprovedProposal(proposal);
    setCohortModalOpen(true);
  }

  function startEditCohort(c) {
    setEditingCohort(c);
    setSourceProposalId(c.sourceProposalId ? String(c.sourceProposalId) : '');
    setPlanId(c.planId ? String(c.planId) : '');
    setName(c.name || '');
    setMentorId(c.mentorId ? String(c.mentorId) : '');
    setCapacity(c.capacity ?? defaultPolicyCap);
    setPublish(c.status === 'Published');
    setPickedSlots((c.sessions || []).map((s) => s.availabilityId).filter(Boolean));
    setFormErrors({});
    setCohortModalOpen(true);
  }

  const selectedCohortId = entitlementCohort?.id;
  useEffect(() => {
    if (!selectedCohortId) return undefined;
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setEntitlementsLoading(true);
        setEntitlementsError(null);
        return getCohortEntitlements(Number(selectedCohortId));
      })
      .then((rows) => {
        if (!alive || !rows) return;
        setEntitlements(rows);
        setEntitlementsError(null);
      })
      .catch((e) => alive && setEntitlementsError(e))
      .finally(() => alive && setEntitlementsLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedCohortId, cohorts, entitlementTick]);

  const previewKey =
    cohortModalOpen && mentorId && pickedSlots.length
      ? `${mentorId}|${editingCohort?.id || ''}|${[...pickedSlots].sort((a, b) => a - b).join(',')}`
      : '';
  const [scheduleReport, setScheduleReport] = useState(null);
  useEffect(() => {
    if (!previewKey) return undefined;
    let alive = true;
    const [mid, cid, ids] = previewKey.split('|');
    const timer = setTimeout(() => {
      previewCohortSchedule({
        mentorId: Number(mid),
        availabilityIds: ids.split(',').map(Number),
        cohortId: cid ? Number(cid) : undefined,
      })
        .then((report) => alive && setScheduleReport({ key: previewKey, isValid: report?.isValid !== false, conflicts: report?.conflicts || [], error: '' }))
        .catch((err) => alive && setScheduleReport({ key: previewKey, isValid: true, conflicts: [], error: describeApiError(err).message }));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [previewKey]);

  const activeReport = previewKey && scheduleReport?.key === previewKey ? scheduleReport : null;
  const scheduleConflicts = activeReport?.conflicts || [];
  const hasScheduleConflict = scheduleConflicts.length > 0 || activeReport?.isValid === false;
  const checkingSchedule = Boolean(previewKey) && !activeReport;
  const selectedPlan = groupPlans.find((p) => String(p.id) === String(planId)) || null;
  const requiredSessionCount = selectedPlan?.totalSessions ? Number(selectedPlan.totalSessions) : null;

  const slotMaxCap = useMemo(() => {
    const pickedMax = availableMentorSlots
      .filter((s) => pickedSlots.includes(s.id) && Number(s.maxLearners) > 0)
      .map((s) => Number(s.maxLearners));
    if (pickedMax.length > 0) return Math.min(...pickedMax);
    return Number(selectedPlan?.capacity) || defaultPolicyCap;
  }, [availableMentorSlots, pickedSlots, selectedPlan, defaultPolicyCap]);

  const sessionCountMismatch = Boolean(requiredSessionCount && pickedSlots.length !== requiredSessionCount);
  const capacityInvalid = Boolean(Number(capacity) < 1 || Number(capacity) > slotMaxCap);

  const toggleSlot = (id) => {
    setPickedSlots((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  function handleSaveCohort(e) {
    e.preventDefault();
    const errs = {};
    if (!planId) errs.planId = tr('Vui lòng chọn gói học nhóm.');
    if (!name.trim()) errs.name = tr('Vui lòng nhập tên lớp học.');
    if (!mentorId) errs.mentorId = tr('Vui lòng chọn Giáo viên phụ trách.');
    if (capacityInvalid) errs.capacity = trf('Sĩ số lớp phải từ 1 đến {0}.', { 0: slotMaxCap });
    if (pickedSlots.length === 0) errs.slots = tr('Hãy chọn khung giờ học đã duyệt cho lớp.');
    else if (sessionCountMismatch) errs.slots = trf('Cần chọn đúng {0} buổi theo cấu hình gói.', { 0: requiredSessionCount });
    setFormErrors(errs);
    if (Object.keys(errs).length > 0 || (publish && hasScheduleConflict)) return;

    onRun(async () => {
      await saveCohort({
        id: editingCohort?.id,
        planId: Number(planId),
        name: name.trim(),
        mentorId: Number(mentorId),
        capacity: Number(capacity),
        availabilityIds: pickedSlots,
        publish,
        revision: editingCohort?.revision ?? 1,
        sourceProposalId: !editingCohort && sourceProposalId ? Number(sourceProposalId) : null,
      });
      setCohortModalOpen(false);
      setEditingCohort(null);
    }, editingCohort ? 'Đã cập nhật thông tin lớp nhóm.' : publish ? 'Đã lưu và công bố lớp nhóm.' : 'Đã lưu nháp lớp nhóm.');
  }

  const refreshSelectedEntitlements = async (cid) => {
    const rows = await getCohortEntitlements(cid);
    setEntitlements(rows);
  };

  const columns = [
    {
      key: 'name',
      header: tr('Tên lớp'),
      render: (row) => <span className="font-semibold text-rp-text">{row.name}</span>,
    },
    {
      key: 'level',
      header: tr('Cấp độ'),
      compact: true,
      render: (row) => <AdminStatusBadge tone="brand" withDot={false} label={row.level} />,
    },
    {
      key: 'mentorName',
      header: tr('Giáo viên'),
      render: (row) => <span className="text-sm text-rp-text-2">{row.mentorName || `#${row.mentorId}`}</span>,
    },
    {
      key: 'capacity',
      header: tr('Sĩ số'),
      compact: true,
      render: (row) => (
        <span className="tabular-nums text-sm font-medium text-rp-text">
          {row.enrolledCount ?? 0}/{row.capacity}
        </span>
      ),
    },
    {
      key: 'startsAt',
      header: tr('Khai giảng'),
      compact: true,
      render: (row) => <span className="whitespace-nowrap text-xs text-rp-text-2">{fmtDate(row.startsAt)}</span>,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => (
        <AdminStatusBadge
          tone={row.status === 'Published' ? 'success' : 'neutral'}
          label={row.status === 'Published' ? 'Đang mở' : row.status === 'Draft' ? 'Bản nháp' : row.status}
        />
      ),
    },
  ];

  const hasFilters = cohortSearch.trim() !== '' || statusFilter !== 'ALL';
  const hasAnyCohorts = cohorts.length > 0;

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {/* Unified Toolbar (Tabs left when provided + Search/Filter/Refresh right) */}
      {(toolbarTabs || hasAnyCohorts) && (
        <AdminToolbar
          tabs={toolbarTabs}
          refresh={
            onRefresh
              ? {
                  onRefresh,
                  refreshing,
                  disabled: busy,
                }
              : undefined
          }
        >
          {hasAnyCohorts && (
            <>
              <SearchInput
                value={cohortSearch}
                onChange={(e) => setCohortSearch(e.target.value)}
                onClear={() => setCohortSearch('')}
                placeholder="Tìm lớp, cấp độ, Giáo viên…"
                aria-label={tr('Tìm lớp nhóm')}
                className="w-full sm:w-[245px]"
              />

              <CustomSelect
                fitContent
                value={statusFilter}
                aria-label={tr('Lọc theo trạng thái lớp')}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: tr('Tất cả trạng thái') },
                  { value: 'Published', label: tr('Đang mở'), dotClass: 'bg-[#16A34A]' },
                  { value: 'Draft', label: tr('Bản nháp'), dotClass: 'bg-[#94A3B8]' },
                ]}
              />

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  icon={X}
                  onClick={() => {
                    setCohortSearch('');
                    setStatusFilter('ALL');
                  }}
                >
                  {tr('Xóa bộ lọc')}
                </Button>
              )}
            </>
          )}
        </AdminToolbar>
      )}

      {approvedProposals.length > 0 && (
        <Banner
          tone="info"
          title={trf('Có {0} đề xuất mở lớp đã duyệt từ Giáo viên sẵn sàng điều phối', { 0: approvedProposals.length })}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => openFromProposal(approvedProposals[0])}>
                {tr('Mở lớp từ đề xuất đã duyệt')}
              </Button>
              <Button as={Link} to="/admin/mentor-schedules/" size="sm" variant="outline">
                {tr('Xem đề xuất mở lớp')}
              </Button>
            </div>
          }
        >
          {tr('Lớp học được khởi tạo theo lịch cố định và đề xuất do Giáo viên đăng ký và đã được phê duyệt.')}
        </Banner>
      )}

      {/* Cohorts Table */}
      {filteredCohorts.length === 0 ? (
        <ContextualEmptyState
          variant={hasAnyCohorts && hasFilters ? 'search' : 'default'}
          illustration={hasAnyCohorts && hasFilters ? 'search' : 'classroom'}
          title={hasAnyCohorts && hasFilters ? tr('Không có lớp nhóm nào khớp bộ lọc') : tr('Chưa có lớp nhóm nào')}
          description={
            hasAnyCohorts && hasFilters
              ? tr('Thử thay đổi trạng thái hoặc xóa từ khóa tìm kiếm.')
              : tr('Các lớp nhóm sẽ được tạo sau khi Giáo viên gửi đề xuất lịch dạy và được Admin phê duyệt.')
          }
          action={
            hasAnyCohorts && hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCohortSearch('');
                  setStatusFilter('ALL');
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : (
              <Button as={Link} to="/admin/mentor-schedules/" variant="outline">
                {tr('Đi tới Duyệt lịch dạy')}
              </Button>
            )
          }
        />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={filteredCohorts}
          rowKey={(r) => r.id}
          itemLabel="lớp nhóm"
          fillHeight={fillHeight}
          rowActions={(row) => (
            <AdminRowActions>
              <AdminIconAction
                kind="edit"
                tone="brand"
                tooltip="Chỉnh sửa lớp nhóm"
                onClick={() => startEditCohort(row)}
              />
              <AdminIconAction
                icon={KeyRound}
                tone="neutral"
                tooltip="Quản lý quyền ghi danh"
                onClick={() => setEntitlementCohort(row)}
              />
            </AdminRowActions>
          )}
        />
      )}

      {/* Proposal-based Create / Edit Cohort Modal */}
      <Modal
        open={cohortModalOpen}
        onClose={() => !busy && setCohortModalOpen(false)}
        title={editingCohort ? trf('Sửa lớp nhóm: {0}', { 0: editingCohort.name }) : tr('Mở lớp từ đề xuất đã duyệt')}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setCohortModalOpen(false)}>
              {tr('Hủy')}
            </Button>
            <Button
              loading={busy}
              disabled={busy || (publish && hasScheduleConflict)}
              onClick={handleSaveCohort}
            >
              {editingCohort ? tr('Lưu thay đổi') : publish ? tr('Lưu và mở lớp') : tr('Lưu bản nháp')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveCohort} className="space-y-4">
          {!editingCohort && approvedProposals.length > 0 && (
            <div className="rounded-2xl border border-[#F2CCD7] bg-[#FFF5F7]/60 p-3.5 space-y-2">
              <Field
                label={tr('Đề xuất mở lớp đã duyệt từ Giáo viên')}
                hint={tr('Tự động điền Giáo viên, gói phù hợp và các buổi học 10 tuần đã duyệt.')}
              >
                <CustomSelect
                  value={sourceProposalId}
                  aria-label={tr('Chọn đề xuất mở lớp đã duyệt')}
                  onChange={(val) => {
                    const found = approvedProposals.find((p) => String(p.id) === String(val));
                    if (found) applyApprovedProposal(found);
                  }}
                  options={approvedProposals.map((p) => ({
                    value: String(p.id),
                    label: `#${p.id} · ${p.jlptLevelCode || 'JLPT'} · ${p.mentorName} · ${p.courseTitle?.trim() || trf('{0} buổi/tuần', { 0: p.weeklySessionCount })} (${p.generatedAvailabilityIds?.length || 0} buổi)`,
                  }))}
                />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Gói học nhóm')} required error={formErrors.planId}>
              <CustomSelect
                value={planId}
                aria-label={tr('Chọn gói lớp nhóm')}
                onChange={(nextPlanId) => {
                  setPlanId(nextPlanId);
                  setPickedSlots([]);
                  const p = groupPlans.find((item) => String(item.id) === String(nextPlanId));
                  if (p?.capacity) setCapacity(Math.min(Number(p.capacity), defaultPolicyCap));
                }}
                options={[
                  { value: '', label: tr('Chọn gói lớp nhóm') },
                  ...groupPlans.map((p) => ({ value: String(p.id), label: planLabel(p) })),
                ]}
              />
            </Field>

            <Field label={tr('Tên lớp học')} required error={formErrors.name}>
              <Input
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr('Ví dụ: JLPT N4 Tối thứ 2-4')}
                invalid={Boolean(formErrors.name)}
              />
            </Field>

            <Field label={tr('Giáo viên phụ trách')} required error={formErrors.mentorId}>
              <CustomSelect
                value={mentorId}
                disabled={Boolean(editingCohort)}
                aria-label={tr('Chọn Giáo viên')}
                onChange={(val) => {
                  setMentorId(val);
                  setPickedSlots([]);
                }}
                options={[
                  { value: '', label: tr('Chọn Giáo viên') },
                  ...mentors.map((m) => ({ value: String(m.id), label: m.name || m.fullName || m.email })),
                ]}
              />
            </Field>

            <Field label={trf('Sĩ số lớp (1–{0})', { 0: slotMaxCap })} required error={formErrors.capacity}>
              <Input
                type="number"
                min={1}
                max={slotMaxCap}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                invalid={Boolean(formErrors.capacity)}
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-rp-text">
                {trf('Chọn khung giờ rảnh đã duyệt ({0}/{1} buổi)', { 0: pickedSlots.length, 1: requiredSessionCount || '?' })}
              </p>
              {formErrors.slots && <span className="text-xs font-medium text-rp-brand-strong">{formErrors.slots}</span>}
            </div>

            {availableMentorSlots.length === 0 ? (
              <p className="text-xs text-rp-text-muted">
                {tr('Chưa có khung giờ trống phù hợp cho Giáo viên và thời lượng buổi của gói đã chọn.')}
              </p>
            ) : (
              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {availableMentorSlots.map((s) => {
                  const checked = pickedSlots.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-colors ${
                        checked ? 'border-rp-brand-strong bg-white' : 'border-rp-line bg-white/70 hover:border-rp-brand-border'
                      }`}
                    >
                      <Checkbox checked={checked} onChange={() => toggleSlot(s.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-rp-text">
                          {formatVnSlotWindow(s.startTime, s.endTime)}
                        </span>
                        <span className="block text-rp-text-muted">{s.mentorName}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {checkingSchedule && <Banner tone="info">{tr('Đang kiểm tra xung đột lịch của Giáo viên…')}</Banner>}
          {activeReport?.error && <Banner tone="warning">{activeReport.error}</Banner>}
          {activeReport && !checkingSchedule && !hasScheduleConflict && !activeReport.error && (
            <Banner tone="success" icon={CheckCircle2}>
              {tr('Không phát hiện xung đột với lịch dạy hiện có của Giáo viên.')}
            </Banner>
          )}
          {hasScheduleConflict && (
            <Banner tone="danger" icon={ShieldAlert} title={tr('Phát hiện xung đột lịch')}>
              <ScheduleConflictList conflicts={scheduleConflicts} compact />
            </Banner>
          )}

          <Checkbox
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            label={tr('Mở lớp ngay sau khi lưu (cần chọn đủ tổng buổi và không xung đột lịch)')}
          />
        </form>
      </Modal>

      {/* Entitlements Drawer */}
      <Drawer
        open={Boolean(entitlementCohort)}
        onClose={() => setEntitlementCohort(null)}
        title={entitlementCohort ? `${tr('Quyền ghi danh')}: ${entitlementCohort.name}` : ''}
        width="w-[min(560px,100vw)]"
      >
        {entitlementCohort && (
          <div className="space-y-5">
            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold text-rp-text">{tr('Cấp quyền ghi danh mới')}</h3>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const cid = Number(entitlementCohort.id);
                  if (!learnerId) return;
                  onRun(async () => {
                    await grantCohortEntitlement(cid, {
                      learnerId: Number(learnerId),
                      sourceType,
                      note: note.trim() || null,
                    });
                    setLearnerId('');
                    setNote('');
                    await refreshSelectedEntitlements(cid);
                  }, 'Đã cấp quyền ghi danh lớp nhóm cho học viên.');
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={tr('Mã học viên (ID)')} required>
                    <Input
                      type="number"
                      min={1}
                      value={learnerId}
                      onChange={(e) => setLearnerId(e.target.value)}
                      placeholder={tr('Ví dụ: 900001')}
                    />
                  </Field>
                  <Field label={tr('Nguồn quyền ghi danh')}>
                    <CustomSelect
                      value={sourceType}
                      aria-label={tr('Nguồn quyền ghi danh')}
                      onChange={setSourceType}
                      options={SOURCE_TYPES.map((t) => ({ value: t.value, label: tr(t.label) }))}
                    />
                  </Field>
                </div>
                <Field label={tr('Ghi chú')}>
                  <Input
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={tr('VD: Đủ điều kiện khai giảng đợt mới')}
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" disabled={busy || !learnerId}>
                    {tr('Cấp quyền ghi danh')}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-rp-text">{tr('Danh sách quyền đã cấp')}</h3>
              {entitlementsLoading && entitlements.length === 0 ? (
                <SakuraLoader variant="section" context="cohort" delay={140} />
              ) : entitlementsError ? (
                <ContextualErrorState
                  compact
                  error={entitlementsError}
                  title={tr('Chưa tải được danh sách quyền ghi danh')}
                  onRetry={() => setEntitlementTick((t) => t + 1)}
                />
              ) : entitlements.length === 0 ? (
                <ContextualEmptyState variant="compact" illustration="certificate" title={tr('Chưa có quyền ghi danh nào được cấp cho lớp này.')} />
              ) : (
                <div className="space-y-2.5">
                  {entitlements.map((ent) => {
                    const meta = ENTITLEMENT_STATUS_META[ent.status] || ENTITLEMENT_STATUS_META.Expired;
                    return (
                      <Card key={ent.id} className="space-y-2 p-3.5 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-rp-text">
                              {ent.learnerName || tr('Học viên')} <span className="text-xs font-normal text-rp-text-muted">({ent.learnerEmail})</span>
                            </p>
                            <p className="text-xs text-rp-text-muted">
                              {tr(ENTITLEMENT_SOURCE_LABELS[ent.sourceType] || ent.sourceType)} · {fmtDate(ent.grantedAtUtc)}
                            </p>
                          </div>
                          <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>
                        </div>
                        {ent.revocationReason && (
                          <p className="text-xs text-rose-700">{tr('Lý do thu hồi')}: {ent.revocationReason}</p>
                        )}
                        {ent.status === 'Active' && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              disabled={busy}
                              onClick={() => setRevokeTarget(ent)}
                            >
                              {tr('Thu hồi quyền')}
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <AlertDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          const target = revokeTarget;
          setRevokeTarget(null);
          if (!target || !entitlementCohort) return;
          onRun(async () => {
            await revokeCohortEntitlement(target.id, 'Thu hồi bởi quản trị viên.');
            await refreshSelectedEntitlements(Number(entitlementCohort.id));
          }, 'Đã thu hồi quyền ghi danh.');
        }}
        tone="danger"
        title={tr('Thu hồi quyền ghi danh này?')}
        description={revokeTarget ? trf('Học viên "{0}" sẽ không còn sử dụng được mã quyền này.', { 0: revokeTarget.learnerName || revokeTarget.learnerEmail }) : ''}
        confirmLabel={tr('Thu hồi quyền')}
      />
    </div>
  );
}
