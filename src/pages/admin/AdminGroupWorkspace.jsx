import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
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
  FeatureIcon,
  Field,
  Input,
  Modal,
  PageHeader,
  SakuraLoader,
  Tabs,
  Textarea,
  notify,
} from '@/components/ui';
import {
  courseGet,
  coursePost,
  getAdminAvailabilitySlots,
  getCohorts,
  INTENSITY_OPTIONS,
  openRetakeEvidence,
  saveCoursePlan,
} from '@/features/cohorts/api/cohortApi.js';
import { getCurrentMentorGroupPolicy } from '@/features/admin/api/adminApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import AdminCohortConsolePanel from '@/features/cohorts/components/AdminCohortConsolePanel.jsx';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import AdminMentorReplacementPanel from '@/features/cohorts/components/AdminMentorReplacementPanel.jsx';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import '@/pages/shared/studyCourses.css';
import { useLocale, currentIntlTag, translateText } from '@/locales/locale.js';

function RetakeDecisionForm({ busy, canClaim, cohorts, excludeCohortId, onSubmit }) {
  const { tr } = useLocale();
  const [decision, setDecision] = useState('reject');
  const [nextCohortId, setNextCohortId] = useState('');
  const [verified, setVerified] = useState(false);
  const [response, setResponse] = useState('');

  return (
    <form
      className="space-y-3 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!response.trim()) return;
        onSubmit({
          approve: decision === 'approve',
          officialFailureVerified: verified,
          cohortId: nextCohortId ? Number(nextCohortId) : null,
          response: response.trim(),
        });
      }}
    >
      <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Quyết định của Admin')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr('Quyết định')}>
          <CustomSelect
            value={decision}
            aria-label={tr('Quyết định hỗ trợ')}
            onChange={setDecision}
            options={[
              { value: 'reject', label: tr('Từ chối') },
              ...(canClaim ? [{ value: 'approve', label: tr('Duyệt hỗ trợ ôn lại') }] : []),
            ]}
          />
        </Field>
        <Field label={tr('Lớp nhóm kế tiếp (nếu duyệt)')}>
          <CustomSelect
            value={nextCohortId}
            aria-label={tr('Lớp nhóm kế tiếp')}
            onChange={setNextCohortId}
            options={[
              { value: '', label: tr('Chọn lớp kế tiếp') },
              ...cohorts.filter((x) => x.id !== excludeCohortId).map((x) => ({
                value: String(x.id),
                label: `${x.name} (${x.level})`,
              })),
            ]}
          />
        </Field>
      </div>
      <Checkbox
        checked={verified}
        onChange={(e) => setVerified(e.target.checked)}
        label={tr('Đã xác minh minh chứng trượt JLPT chính thức')}
      />
      <Field label={tr('Lý do quyết định')} required>
        <Textarea
          rows={3}
          required
          maxLength={2000}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !response.trim()}>{tr('Xác nhận')}</Button>
      </div>
    </form>
  );
}

const LABELS = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Chờ mở khóa',
  Active: 'Đang học',
  Completed: 'Đã chốt khóa',
  Published: 'Đang mở đăng ký',
  Draft: 'Bản nháp',
  Archived: 'Đã lưu trữ',
  Cancelled: 'Đã hủy',
  PaymentFailed: 'Thanh toán không thành công',
  PaymentExpired: 'Thanh toán hết hạn',
  PaymentReview: 'Đã nhận thanh toán – chờ Admin xử lý',
  Scheduled: 'Chờ học',
  Present: 'Có mặt',
  Absent: 'Vắng',
  ExcusedAbsent: 'Vắng có phép',
  CancelledByMentor: 'Giáo viên hủy',
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Transferred: 'Đã chuyển lớp',
  TransferredOut: 'Đã chuyển sang lớp khác',
  Withdrawn: 'Đã rút',
};

const WORKSPACE_TABS = [
  { id: 'cohorts', label: 'Lớp học & Quyền ghi danh' },
  { id: 'plans', label: 'Gói khóa học' },
  { id: 'enrollments', label: 'Ghi danh & Ôn lại JLPT' },
  { id: 'requests', label: 'Dời lịch & Đổi Giáo viên' },
  { id: 'cases', label: 'Chuyển lớp & Khiếu nại' },
];

const DEFAULT_COURSE_WEEKS = 10;
const DEFAULT_SESSION_MINUTES = 90;
const show = (value) => translateText(LABELS[value] || value || '');
const fmtDate = (value) => (value ? formatVnDateTime(value, '—') : '—');
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

function findRoomId(session, cohort) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohort?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohort?.sessions?.[0];
  return match?.roomId || null;
}

async function fetchAdminGroupSnapshot() {
  return Promise.all([
    courseGet(),
    courseGet('/plans'),
    courseGet('/catalog'),
    getCohorts(),
    courseGet('/mentors'),
    getAdminAvailabilitySlots(),
  ]);
}

export default function AdminGroupWorkspace() {
  const { tr, trf } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const courseIdParam = searchParams.get('courseId');
  const scheduleReqIdParam = searchParams.get('cohortScheduleRequestId');
  const transferReqIdParam = searchParams.get('transferRequestId');
  const complaintIdParam = searchParams.get('complaintId');
  const rawSection = searchParams.get('section');

  const activeSection = WORKSPACE_TABS.some((t) => t.id === rawSection)
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
  const [selectedCourseId, setSelectedCourseId] = useState(() => (courseIdParam ? Number(courseIdParam) : null));
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [retakeOnly, setRetakeOnly] = useState(false);

  const [plan, setPlan] = useState(blankPlan);
  const [groupPolicy, setGroupPolicy] = useState(null);
  const [policyError, setPolicyError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const initialAppliedRef = useRef(false);

  function applySnapshot([c, p, l, ch, m, slots]) {
    const list = Array.isArray(c) ? c : [];
    setCourses(list);
    setPlans(Array.isArray(p) ? p : []);
    setLevels(Array.isArray(l) ? l : []);
    setCohorts(Array.isArray(ch) ? ch : []);
    setMentors(Array.isArray(m) ? m : []);
    setAdminSlots(Array.isArray(slots) ? slots : []);
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

  const pendingRetakeTotal = useMemo(
    () => courses.reduce((n, c) => n + (c.requests || []).filter((r) => r.status === 'Pending').length, 0),
    [courses],
  );

  const filteredEnrollments = useMemo(() => {
    const q = enrollmentSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (retakeOnly && !(c.requests || []).some((r) => r.status === 'Pending')) return false;
      if (!q) return true;
      return (
        String(c.name || '').toLowerCase().includes(q)
        || String(c.learnerName || '').toLowerCase().includes(q)
        || String(c.mentorName || '').toLowerCase().includes(q)
        || String(c.level || '').toLowerCase().includes(q)
      );
    });
  }, [courses, enrollmentSearch, retakeOnly]);

  const currentCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || filteredEnrollments[0] || courses[0] || null,
    [courses, filteredEnrollments, selectedCourseId],
  );
  const currentCohort = useMemo(
    () => (currentCourse?.cohortId ? cohorts.find((g) => g.id === currentCourse.cohortId) || null : null),
    [cohorts, currentCourse],
  );

  return (
    <AdminShell breadcrumb={tr('Gói học, lớp & ghi danh')}>
      <main className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={trf('Học nhóm · {0} tuần · {1} phút/buổi · 1–{2} học viên', {
            0: courseWeeks,
            1: policySessionMinutes,
            2: groupPolicy?.maxLearners ?? 4,
          })}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="mentor" size="lg" />
              <span>{tr('Điều phối lớp học nhóm')}</span>
            </span>
          }
          description={tr('Tổ chức lớp học nhóm cố định, quản lý gói khóa học, ghi danh và xử lý các yêu cầu phát sinh theo chính sách.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/admin/policies/"
                className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                {tr('Chính sách học tập')}
              </Link>
              <Button
                variant="outline"
                icon={RefreshCw}
                disabled={busy || loading}
                onClick={() => runAction(loadSnapshot, '', { silentLoading: true })}
              >
                {tr('Tải lại')}
              </Button>
            </div>
          }
        />

        <Tabs
          variant="pill"
          className="sm:flex-wrap"
          value={activeSection}
          onChange={switchSection}
          label={tr('Không gian quản trị học nhóm')}
          tabs={WORKSPACE_TABS.map((t) => ({
            value: t.id,
            label: tr(t.label),
            count: t.id === 'cohorts'
              ? cohorts.length
              : t.id === 'plans'
                ? plans.length
                : t.id === 'enrollments'
                  ? (pendingRetakeTotal || courses.length)
                  : undefined,
          }))}
        />

        {policyError && (
          <ContextualErrorState
            compact
            error={policyError}
            title={tr('Chưa tải được chính sách lớp nhóm hiện hành')}
            onRetry={() => getCurrentMentorGroupPolicy().then((p) => { setGroupPolicy(p || null); setPolicyError(null); }).catch(setPolicyError)}
          />
        )}

        {loading ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : loadError && courses.length === 0 && cohorts.length === 0 ? (
          <ContextualErrorState
            error={loadError}
            title={tr('Chưa tải được dữ liệu lớp học nhóm')}
            onRetry={() => runAction(loadSnapshot, '', { silentLoading: true })}
            retrying={busy}
          />
        ) : (
          <>
            {/* ---------- TAB 1: COHORTS & ENTITLEMENTS ---------- */}
            {activeSection === 'cohorts' && (
              <div className="space-y-5">
                <AdminCohortConsolePanel
                  plans={plans}
                  cohorts={cohorts}
                  mentors={mentors}
                  adminSlots={adminSlots}
                  groupPolicy={groupPolicy}
                  busy={busy}
                  onRun={runAction}
                />
              </div>
            )}

            {/* ---------- TAB 2: PLANS ---------- */}
            {activeSection === 'plans' && (
              <div className="space-y-4">
                <Banner
                  tone="info"
                  title={tr('Quản lý gói học & bảng giá tập trung')}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/admin/plans/"
                        className="rp-focus inline-flex h-8 items-center rounded-lg border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text"
                      >
                        {tr('Mở Gói học & bảng giá')}
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPlan({ ...blankPlan, capacity: groupPolicy?.maxLearners ?? 4, sessionMinutes: policySessionMinutes });
                          setPlanModalOpen(true);
                        }}
                      >
                        {tr('Tạo gói mới')}
                      </Button>
                    </div>
                  }
                >
                  {tr('Tạo hoặc chỉnh sửa nhanh gói khóa học nhóm ngay tại đây, hoặc chuyển sang Gói học & bảng giá để xem lịch sử kiểm toán đầy đủ.')}
                </Banner>

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
                  title={plan.id ? trf('Sửa gói #{0}', { 0: plan.id }) : tr('Tạo gói khóa học nhóm mới')}
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

            {/* ---------- TAB 3: ENROLLMENTS & RETAKE SUPPORT ---------- */}
            {activeSection === 'enrollments' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.42fr)_minmax(0,0.58fr)] lg:items-start">
                <section className="course-box space-y-3">
                  <div>
                    <h2 className="m-0">
                      {trf('Hồ sơ ghi danh ({0}) · {1} yêu cầu JLPT chờ duyệt', { 0: courses.length, 1: pendingRetakeTotal })}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="min-w-[180px] flex-1">
                      <Input
                        type="search"
                        icon={Search}
                        value={enrollmentSearch}
                        onChange={(e) => setEnrollmentSearch(e.target.value)}
                        placeholder={tr('Tìm học viên, lớp, Giáo viên…')}
                        aria-label={tr('Tìm hồ sơ ghi danh')}
                      />
                    </div>
                    <Checkbox
                      checked={retakeOnly}
                      onChange={(e) => setRetakeOnly(e.target.checked)}
                      label={tr('Chờ duyệt JLPT')}
                    />
                  </div>

                  {filteredEnrollments.length === 0 ? (
                    <ContextualEmptyState compact title={tr('Không có hồ sơ ghi danh phù hợp.')} />
                  ) : (
                    <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                      {filteredEnrollments.map((c) => {
                        const selected = currentCourse?.id === c.id;
                        const pendingReqs = (c.requests || []).filter((r) => r.status === 'Pending').length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCourseId(c.id)}
                            className={`block w-full rounded-xl border p-3 text-left transition ${selected ? 'border-rp-brand-strong bg-rp-brand-tint/35' : 'border-rp-line bg-white hover:border-rp-brand-border'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="truncate text-sm text-rp-text">{c.learnerName || tr('Học viên')}</strong>
                              <span className={`course-badge ${c.status === 'Active' ? 'ok' : c.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                                {show(c.status)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-rp-text-2">{c.name} ({c.level})</p>
                            <p className="mt-0.5 text-[11.5px] text-rp-text-muted">
                              {tr('Giáo viên:')} {c.mentorName || tr('Chưa phân công')}
                              {pendingReqs > 0 ? ` · ${trf('{0} yêu cầu JLPT', { 0: pendingReqs })}` : ''}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="min-w-0 space-y-4">
                  {!currentCourse ? (
                    <section className="course-box">
                      <ContextualEmptyState compact title={tr('Chọn một hồ sơ ghi danh bên trái để xem chi tiết')} />
                    </section>
                  ) : (
                    <>
                      <section className="course-box space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="course-badge">{currentCourse.level} · {tr('Học nhóm')}</span>{' '}
                            <span className={`course-badge ${currentCourse.status === 'Active' ? 'ok' : currentCourse.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                              {show(currentCourse.status)}
                            </span>
                          </div>
                          <span className="course-meta">{currentCohort?.name || tr('Lớp học nhóm')}</span>
                        </div>
                        <h2 className="m-0">{currentCourse.name}</h2>
                        <p className="course-meta m-0">
                          {tr('Học viên:')}{' '}<strong>{currentCourse.learnerName}</strong> · {tr('Giáo viên:')} <strong>{currentCourse.mentorName || tr('Chưa phân công')}</strong>
                        </p>
                        <p className="course-meta m-0">
                          {trf('{0} buổi · {1} phút/buổi · Bắt đầu: {2}', { 0: currentCourse.totalSessions, 1: currentCourse.sessionMinutes, 2: fmtDate(currentCourse.startsAt) })}
                        </p>
                        <div>
                          <h3 className="m-0">{tr('Tiến độ bài tập & điều kiện ôn lại')}</h3>
                          <p className="mt-1 text-sm">
                            {tr('Bài tập đạt đúng hạn:')}{' '}<strong>{currentCourse.eligibility.passedOnTimeHomework}/{currentCourse.eligibility.requiredHomework}</strong>{' '}{tr('· Vắng:')}{' '}<strong>{currentCourse.eligibility.absentSessions}/{currentCourse.eligibility.countedSessions}</strong>{' '}{tr('buổi')}
                          </p>
                          <p className="course-meta m-0">
                            {currentCourse.eligibility.canClaim
                              ? tr('Đủ điều kiện nộp minh chứng trượt JLPT chính thức để Admin xem xét hỗ trợ.')
                              : currentCourse.eligibility.reasons.join(' ')}
                          </p>
                        </div>
                        {currentCourse.status === 'Active' && (
                          <form
                            className="space-y-2.5 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-3.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              runAction(() => coursePost(`/${currentCourse.id}/complete`, {}), 'Đã chốt hoàn thành khóa học.');
                            }}
                          >
                            <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Chốt hoàn thành khóa')}</h3>
                            <Checkbox required label={tr('Xác nhận đủ buổi cam kết và hoàn tất kiểm tra.')} />
                            <div>
                              <Button size="sm" type="submit" disabled={busy}>{tr('Chốt dữ liệu khóa')}</Button>
                            </div>
                          </form>
                        )}
                      </section>

                      <CohortSessionsCalendar course={currentCourse} cohort={currentCohort}>
                        {(currentCourse.sessions || []).length === 0 ? (
                          <p className="course-meta">{tr('Chưa có buổi học nào.')}</p>
                        ) : (
                          currentCourse.sessions.map((s) => {
                            const roomId = findRoomId(s, currentCohort);
                            return (
                              <article className="course-row" key={s.id}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <strong>{tr('Buổi')}{' '}{s.number}{s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}</strong> · {fmtDate(s.scheduledAt)} ·{' '}
                                    <span className={`course-badge ${s.status === 'Present' ? 'ok' : s.status === 'Scheduled' ? 'warn' : 'muted'}`}>
                                      {show(s.status)}
                                    </span>
                                  </div>
                                  {roomId && (
                                    <Link className="course-pill-link" to={`/meeting-room/${roomId}`}>
                                      {tr('Vào phòng học chung')}
                                    </Link>
                                  )}
                                </div>
                                {s.note && <p className="course-meta">{tr(s.note)}</p>}
                              </article>
                            );
                          })
                        )}
                      </CohortSessionsCalendar>

                      <section className="course-box space-y-3">
                        <h2 className="m-0">{tr('Hỗ trợ ôn lại khi trượt JLPT chính thức')}</h2>
                        {currentCourse.requests.length === 0 ? (
                          <p className="course-meta m-0">{tr('Chưa có yêu cầu hỗ trợ JLPT nào.')}</p>
                        ) : (
                          currentCourse.requests.map((r) => (
                            <article className="course-row space-y-2" key={r.id}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3>{trf('Yêu cầu #{0} · {1}', { 0: r.id, 1: show(r.status) })}</h3>
                                <span className="course-meta">{trf('Thi: {0} · Công bố: {1}', { 0: fmtDate(r.examDate), 1: fmtDate(r.resultPublishedAt) })}</span>
                              </div>
                              {r.reason && <p className="course-pre"><strong>{tr('Lý do học viên:')}</strong> {tr(r.reason)}</p>}
                              {r.response && <p className="course-pre"><strong>{tr('Quyết định của Admin:')}</strong> {r.response}</p>}
                              {r.mentorSupportPlan && (
                                <div className="course-notice">
                                  <strong>{trf('Lộ trình hỗ trợ từ Giáo viên ({0}):', { 0: fmtDate(r.mentorSupportPlanAtUtc) })}</strong>
                                  <p className="course-pre">{r.mentorSupportPlan}</p>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => runAction(() => openRetakeEvidence(currentCourse.id, r.id), 'Đã tải minh chứng riêng tư.')}
                              >
                                {tr('Tải minh chứng riêng tư')}
                              </Button>
                              {r.status === 'Pending' && (
                                <RetakeDecisionForm
                                  busy={busy}
                                  canClaim={currentCourse.eligibility.canClaim}
                                  cohorts={cohorts}
                                  excludeCohortId={currentCourse.cohortId}
                                  onSubmit={(payload) =>
                                    runAction(() => coursePost(`/${currentCourse.id}/retake/${r.id}/review`, {
                                      ...payload,
                                      onTimeHomeworkEvidenceVerified: currentCourse.eligibility.homeworkMet,
                                    }))
                                  }
                                />
                              )}
                            </article>
                          ))
                        )}
                      </section>
                    </>
                  )}
                </div>
              </div>
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
      </main>
    </AdminShell>
  );
}
