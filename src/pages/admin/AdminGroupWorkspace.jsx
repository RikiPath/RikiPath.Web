import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminShell } from '@/layouts';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ContextualErrorState,
  CustomSelect,
  DataRefreshBoundary,
  Field,
  GroupClassIcon,
  Input,
  Modal,
  RefreshButton,
  UnifiedToolbar,
  notify,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import {
  courseGet,
  getAdminAvailabilitySlots,
  getCohorts,
  INTENSITY_OPTIONS,
  saveCoursePlan,
} from '@/features/cohorts/api/cohortApi.js';
import { getCurrentMentorGroupPolicy } from '@/features/admin/api/adminApi.js';
import { getApprovedProposalsForCohort } from '@/features/scheduling/api/teachingProposalApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import AdminCohortConsolePanel from '@/features/cohorts/components/AdminCohortConsolePanel.jsx';
import AdminRetakeSupportPanel from '@/features/cohorts/components/AdminRetakeSupportPanel.jsx';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import AdminMentorReplacementPanel from '@/features/cohorts/components/AdminMentorReplacementPanel.jsx';
import '@/pages/shared/studyCourses.css';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const PRIMARY_TABS = [
  { id: 'cohorts', label: 'Lớp học & Quyền ghi danh' },
  { id: 'plans', label: 'Gói khóa học' },
];

const ALL_SECTION_IDS = ['cohorts', 'plans', 'enrollments', 'requests', 'cases'];

const DEFAULT_COURSE_WEEKS = 10;
const DEFAULT_SESSION_MINUTES = 90;
const money = (value) => `${Number(value || 0).toLocaleString(currentIntlTag())} ₫`;

const blankPlan = {
  name: '',
  certificateLevelId: '',
  durationMonths: 3,
  intensity: 'Standard',
  sessionsPerWeek: 3,
  sessionMinutes: DEFAULT_SESSION_MINUTES,
  totalSessions: DEFAULT_COURSE_WEEKS * 3,
  retakeClaimDays: '',
  price: '',
  isPublished: false,
  revision: 1,
  sessionType: 'Group',
  capacity: 4,
};

async function fetchAdminGroupSnapshot() {
  return Promise.all([
    courseGet(),
    courseGet('/plans'),
    courseGet('/catalog'),
    getCohorts(),
    courseGet('/mentors'),
    getAdminAvailabilitySlots(),
    getApprovedProposalsForCohort().catch(() => []),
  ]);
}

export default function AdminGroupWorkspace() {
  const { tr, trf } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const courseIdParam = searchParams.get('courseId');
  const proposalIdParam = searchParams.get('proposalId');
  const scheduleReqIdParam = searchParams.get('cohortScheduleRequestId');
  const transferReqIdParam = searchParams.get('transferRequestId');
  const complaintIdParam = searchParams.get('complaintId');
  const rawSection = searchParams.get('section');

  const activeSection = ALL_SECTION_IDS.includes(rawSection)
    ? rawSection
    : courseIdParam
      ? 'enrollments'
      : scheduleReqIdParam
        ? 'requests'
        : transferReqIdParam || complaintIdParam
          ? 'cases'
          : 'cohorts';

  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [levels, setLevels] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [adminSlots, setAdminSlots] = useState([]);
  const [approvedProposals, setApprovedProposals] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(() => (courseIdParam ? Number(courseIdParam) : null));
  const [plan, setPlan] = useState(blankPlan);
  const [groupPolicy, setGroupPolicy] = useState(null);
  const [policyError, setPolicyError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const initialAppliedRef = useRef(false);
  const refreshSeqRef = useRef(0);

  function applySnapshot([c, p, l, ch, m, slots, proposals]) {
    const list = Array.isArray(c) ? c : [];
    setCourses(list);
    setPlans(Array.isArray(p) ? p : []);
    setLevels(Array.isArray(l) ? l : []);
    setCohorts(Array.isArray(ch) ? ch : []);
    setMentors(Array.isArray(m) ? m : []);
    setAdminSlots(Array.isArray(slots) ? slots : []);
    setApprovedProposals(Array.isArray(proposals) ? proposals : []);
    setLoadError(null);

    if (!initialAppliedRef.current && courseIdParam) {
      initialAppliedRef.current = true;
      const cid = Number(courseIdParam);
      if (list.some((x) => x.id === cid)) setSelectedCourseId(cid);
    } else {
      setSelectedCourseId((cur) => (cur && list.some((x) => x.id === cur) ? cur : list[0]?.id || null));
    }
  }

  async function loadSnapshot() {
    applySnapshot(await fetchAdminGroupSnapshot());
  }

  async function refreshSnapshot() {
    if (refreshing || loading) return;
    const seq = ++refreshSeqRef.current;
    setRefreshing(true);
    try {
      const [snapshotData, policyData] = await Promise.all([
        fetchAdminGroupSnapshot(),
        getCurrentMentorGroupPolicy().catch(() => groupPolicy),
      ]);
      if (seq !== refreshSeqRef.current) return;
      applySnapshot(snapshotData);
      if (policyData !== undefined) {
        setGroupPolicy(policyData || null);
        setPolicyError(null);
      }
    } catch (e) {
      if (seq === refreshSeqRef.current) {
        setLoadError(e);
      }
    } finally {
      if (seq === refreshSeqRef.current) {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchAdminGroupSnapshot().then((data) => { if (alive) applySnapshot(data); }),
      getCurrentMentorGroupPolicy()
        .then((p) => { if (alive) { setGroupPolicy(p || null); setPolicyError(null); } })
        .catch((e) => { if (alive) { setGroupPolicy(null); setPolicyError(e); } }),
    ])
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchSection(section) {
    const next = new URLSearchParams(searchParams);
    next.set('section', section);
    setSearchParams(next, { replace: true });
  }

  async function runAction(fn, message = 'Đã lưu thay đổi.', opts = {}) {
    if (busy) return;
    setBusy(true);
    const key = opts.key || 'admin-group-action';
    const toastId = opts.silentLoading ? null : notify.loading(opts.loading || 'Đang xử lý…', '', { key });
    try {
      const result = await fn();
      await loadSnapshot();
      const resolved = typeof message === 'function' ? message(result) : message;
      if (resolved) {
        notify.success(resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
    } catch (e) {
      const info = describeApiError(e);
      notify.apiError(e, opts.errorTitle || 'Chưa thực hiện được', { id: toastId || undefined, key, replace: true });
      if (info.code === 'CONCURRENCY_CONFLICT' || info.code === 'COHORT_SCHEDULE_REVISION_CONFLICT' || info.code === 'COHORT_FULL') {
        loadSnapshot().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  const courseWeeks = Number(groupPolicy?.courseDurationWeeks) || DEFAULT_COURSE_WEEKS;
  const policySessionMinutes = Number(groupPolicy?.sessionMinutes) || DEFAULT_SESSION_MINUTES;
  const allowedSpw = useMemo(() => {
    const parsed = String(groupPolicy?.allowedSessionsPerWeekCsv || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return parsed.length ? parsed : [2, 3, 4];
  }, [groupPolicy]);
  const intensityOptions = INTENSITY_OPTIONS.filter((o) => allowedSpw.includes(o.sessionsPerWeek));
  const recommendedSpw = Number(groupPolicy?.defaultSessionsPerWeek) || 3;

  const changePlan = (key, value) =>
    setPlan((p) => {
      if (key !== 'sessionsPerWeek') return { ...p, [key]: value };
      const match = INTENSITY_OPTIONS.find((o) => o.sessionsPerWeek === Number(value));
      return { ...p, sessionsPerWeek: value, intensity: match ? match.value : 'Custom' };
    });

  const applyIntensity = (intensity) =>
    setPlan((p) => {
      const opt = INTENSITY_OPTIONS.find((o) => o.value === intensity);
      if (!opt) return { ...p, intensity };
      return {
        ...p,
        intensity,
        sessionsPerWeek: opt.sessionsPerWeek,
        totalSessions: courseWeeks * opt.sessionsPerWeek,
        sessionMinutes: policySessionMinutes,
      };
    });

  const lockViewport = activeSection === 'cohorts' && !loading && !(loadError && courses.length === 0 && cohorts.length === 0);

  const primaryToolbarTabs = (activeSection === 'cohorts' || activeSection === 'plans')
    ? {
        label: tr('Lớp học & gói khóa học'),
        value: activeSection,
        onChange: switchSection,
        tabs: PRIMARY_TABS.map((t) => ({
          value: t.id,
          label: tr(t.label),
          count: t.id === 'cohorts' ? cohorts.length : plans.length,
        })),
      }
    : null;

  const hasLoadedSnapshot = !loading && !(loadError && courses.length === 0 && cohorts.length === 0);
  const toolbarOwnsRefresh = hasLoadedSnapshot && (activeSection === 'cohorts' || activeSection === 'plans');
  const activeHeaderHasData =
    activeSection === 'retake'
      ? courses.length > 0
      : activeSection === 'replace'
        ? cohorts.length > 0
        : hasLoadedSnapshot;

  return (
    <AdminShell breadcrumb={tr('Lớp học & ghi danh')}>
      <AdminWorkspace viewportLocked={lockViewport}>
        <AdminPageHeader
          icon={GroupClassIcon}
          title="Lớp học & ghi danh"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {hasLoadedSnapshot && !toolbarOwnsRefresh && activeHeaderHasData && (
                <RefreshButton
                  onRefresh={refreshSnapshot}
                  refreshing={refreshing}
                  disabled={busy || loading}
                />
              )}
            </div>
          }
        />

        {policyError && (
          <ContextualErrorState
            compact
            error={policyError}
            title={tr('Chưa tải được chính sách lớp nhóm hiện hành')}
            onRetry={() => getCurrentMentorGroupPolicy().then((p) => { setGroupPolicy(p || null); setPolicyError(null); }).catch(setPolicyError)}
          />
        )}

        <DataRefreshBoundary
          fillHeight
          loading={loading}
          refreshing={refreshing}
          error={loadError}
          hasData={hasLoadedSnapshot}
          isEmpty={false}
          loadingContext="cohort"
          loadingLabel={tr('Đang tải dữ liệu lớp học nhóm')}
          loadingDelay={160}
          errorTitle={tr('Chưa tải được dữ liệu lớp học nhóm')}
          onRetry={refreshSnapshot}
        >
          {hasLoadedSnapshot && (
            <>
              {/* ---------- TAB 1: COHORTS & ENTITLEMENTS ---------- */}
              {activeSection === 'cohorts' && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <AdminCohortConsolePanel
                    plans={plans}
                    cohorts={cohorts}
                    mentors={mentors}
                    adminSlots={adminSlots}
                    approvedProposals={approvedProposals}
                    initialProposalId={proposalIdParam}
                    groupPolicy={groupPolicy}
                    toolbarTabs={primaryToolbarTabs}
                    onRefresh={refreshSnapshot}
                    refreshing={refreshing}
                    busy={busy}
                    fillHeight
                    onRun={runAction}
                  />
                </div>
              )}

              {/* ---------- TAB 2: PLANS ---------- */}
              {activeSection === 'plans' && (
                <div className="space-y-4">
                  <UnifiedToolbar
                    tabs={primaryToolbarTabs}
                    refresh={{
                      onRefresh: refreshSnapshot,
                      refreshing,
                      disabled: busy,
                    }}
                    actions={
                      <>
                        <Button
                          as={Link}
                          variant="secondary"
                          to="/admin/plans/"
                        >
                          {tr('Mở Gói học & bảng giá')}
                        </Button>
                        <Button
                          onClick={() => {
                            setPlan({ ...blankPlan, capacity: groupPolicy?.maxLearners ?? 4, sessionMinutes: policySessionMinutes });
                            setPlanModalOpen(true);
                          }}
                        >
                          {tr('Tạo gói mới')}
                        </Button>
                      </>
                    }
                  />

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((p) => (
                    <Card key={p.id} className="flex flex-col justify-between gap-3 p-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand" size="sm" icon={false}>
                            {p.sessionType === 'Group' ? tr('Học nhóm') : p.sessionType} · {p.level}
                          </Badge>
                          {p.intensityLabel && <Badge tone="neutral" size="sm" icon={false}>{p.intensityLabel}</Badge>}
                          {p.isRecommendedIntensity && <Badge tone="success" size="sm" icon={false}>{tr('Khuyến nghị')}</Badge>}
                          <Badge tone={p.isPublished ? 'success' : 'neutral'} size="sm" icon={false}>
                            {p.isPublished ? tr('Đang mở') : tr('Nháp')}
                          </Badge>
                        </div>
                        <h3 className="text-sm font-bold text-rp-text">{p.name}</h3>
                        <p className="text-xs text-rp-text-muted">
                          {p.durationMonths} {tr('tháng ·')} {p.sessionsPerWeek} {tr('buổi/tuần ·')} {p.totalSessions ?? '—'} {tr('buổi')}
                          {p.totalTeachingHours != null ? trf(' · {0} giờ học', { 0: p.totalTeachingHours }) : ''} {tr('· sĩ số')} {p.capacity}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-rp-line pt-3">
                        <strong className="text-sm font-bold text-rp-brand-strong">{money(p.price)}</strong>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setPlan({
                              ...p,
                              intensity: p.intensity || 'Custom',
                              sessionMinutes: p.sessionMinutes ?? '',
                              totalSessions: p.totalSessions ?? '',
                              retakeClaimDays: p.retakeClaimDays ?? '',
                            });
                            setPlanModalOpen(true);
                          }}
                        >
                          {tr('Chỉnh sửa')}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <Modal
                  open={planModalOpen}
                  onClose={() => !busy && setPlanModalOpen(false)}
                  title={plan.id ? (plan.name ? trf('Sửa gói: {0}', { 0: plan.name }) : tr('Sửa gói khóa học nhóm')) : tr('Tạo gói khóa học nhóm mới')}
                  size="lg"
                >
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runAction(async () => {
                        await saveCoursePlan({
                          ...plan,
                          intensity: plan.intensity || 'Custom',
                          certificateLevelId: Number(plan.certificateLevelId),
                          durationMonths: Number(plan.durationMonths),
                          sessionsPerWeek: Number(plan.sessionsPerWeek),
                          sessionMinutes: plan.sessionMinutes === '' ? null : Number(plan.sessionMinutes),
                          totalSessions: plan.totalSessions === '' ? null : Number(plan.totalSessions),
                          retakeClaimDays: plan.retakeClaimDays === '' ? null : Number(plan.retakeClaimDays),
                          price: Number(plan.price || 0),
                          capacity: Number(plan.capacity || 1),
                        });
                        setPlan({ ...blankPlan });
                        setPlanModalOpen(false);
                      });
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={tr('Tên gói')} required>
                        <Input required maxLength={200} value={plan.name} onChange={(e) => changePlan('name', e.target.value)} />
                      </Field>
                      <Field label={tr('Cường độ học')}>
                        <CustomSelect
                          value={plan.intensity || 'Custom'}
                          aria-label={tr('Cường độ học')}
                          onChange={applyIntensity}
                          options={[
                            ...intensityOptions.map((o) => ({
                              value: o.value,
                              label: `${tr(o.label)} · ${o.sessionsPerWeek} ${tr('buổi/tuần')}${o.sessionsPerWeek === recommendedSpw ? tr(' (khuyến nghị)') : ''}`,
                            })),
                            { value: 'Custom', label: tr('Tùy chỉnh') },
                          ]}
                        />
                      </Field>
                      <Field label={tr('Sĩ số tối đa')} required>
                        <Input
                          type="number"
                          min={1}
                          max={groupPolicy?.maxLearners ?? 20}
                          value={plan.capacity ?? 1}
                          onChange={(e) => changePlan('capacity', e.target.value)}
                        />
                      </Field>
                      <Field label={tr('Cấp độ JLPT')} required>
                        <CustomSelect
                          value={String(plan.certificateLevelId || '')}
                          aria-label={tr('Chọn cấp độ JLPT')}
                          onChange={(val) => changePlan('certificateLevelId', val)}
                          options={[
                            { value: '', label: tr('Chọn cấp độ') },
                            ...levels.map((l) => ({ value: String(l.id), label: `${l.certificateType} · ${l.code}` })),
                          ]}
                        />
                      </Field>
                      {[
                        ['durationMonths', 'Số tháng', 1, 36],
                        ['sessionsPerWeek', 'Buổi/tuần', 1, 7],
                        ['sessionMinutes', 'Phút/buổi', 15, 240],
                        ['totalSessions', 'Tổng buổi', 1, 500],
                        ['retakeClaimDays', 'Hạn yêu cầu JLPT (ngày)', 1, 730],
                        ['price', 'Học phí (VND)', 0, 2147483647],
                      ].map(([key, title, min, max]) => (
                        <Field key={key} label={tr(title)}>
                          <Input
                            type="number"
                            min={min}
                            max={max}
                            required={key === 'durationMonths' || key === 'sessionsPerWeek'}
                            value={plan[key] ?? ''}
                            onChange={(e) => changePlan(key, e.target.value)}
                          />
                        </Field>
                      ))}
                    </div>
                    <Checkbox
                      checked={Boolean(plan.isPublished)}
                      onChange={(e) => changePlan('isPublished', e.target.checked)}
                      label={tr('Mở bán ngay sau khi lưu')}
                    />
                    <div className="flex justify-end gap-2 border-t border-rp-line pt-3">
                      <Button variant="ghost" disabled={busy} onClick={() => setPlanModalOpen(false)}>{tr('Hủy')}</Button>
                      <Button type="submit" loading={busy}>{tr('Lưu gói học')}</Button>
                    </div>
                  </form>
                </Modal>
              </div>
            )}

            {/* ---------- LEGACY DEEP-LINK: ENROLLMENTS & RETAKE SUPPORT ---------- */}
            {activeSection === 'enrollments' && (
              <AdminRetakeSupportPanel
                courses={courses}
                cohorts={cohorts}
                selectedCourseId={selectedCourseId}
                onSelectCourse={setSelectedCourseId}
                busy={busy}
                onRun={runAction}
              />
            )}

            {/* ---------- TAB 4: SCHEDULE REQUESTS & MENTOR REPLACEMENT ---------- */}
            {activeSection === 'requests' && (
              <div className="space-y-5">
                <AdminCohortScheduleRequestsPanel busy={busy} initialRequestId={scheduleReqIdParam} onRun={runAction} />
                <AdminMentorReplacementPanel cohorts={cohorts} mentors={mentors} busy={busy} onRun={runAction} />
              </div>
            )}

            {/* ---------- TAB 5: TRANSFERS & COMPLAINTS ---------- */}
            {activeSection === 'cases' && (
              <div className="space-y-5">
                <AdminCohortTransferQueuePanel busy={busy} initialTransferId={transferReqIdParam} onRun={runAction} />
                <AdminCohortComplaintsPanel busy={busy} initialComplaintId={complaintIdParam} onRun={runAction} />
              </div>
            )}
            </>
          )}
        </DataRefreshBoundary>
      </AdminWorkspace>
    </AdminShell>
  );
}
