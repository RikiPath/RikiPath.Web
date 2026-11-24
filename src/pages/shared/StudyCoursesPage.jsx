import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminShell, MentorShell, LearnerShell } from '@/layouts';
import { ContextualEmptyState, ContextualErrorState, FeatureIcon, RefreshButton, RefreshingIndicator, SakuraLoader, notify } from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { recordDiagnostic } from '@/api/diagnostics.js';
import HoldCountdown from '@/features/checkout/components/HoldCountdown.jsx';
import {
  cancelCohortEnrollment,
  courseGet,
  coursePost,
  getAdminAvailabilitySlots,
  getCohortHomework,
  getCohorts,
  getCourseCompletionSummary,
  getMentorLearnerSkillProfile,
  getMyEntitlements,
  INTENSITY_OPTIONS,
  openRetakeEvidence,
  reconcileCoursePayment,
  saveCoursePlan,
  saveRetakeSupportPlan,
  uploadRetakeEvidence,
} from '@/features/cohorts/api/cohortApi';
import { getCurrentMentorGroupPolicy } from '@/features/admin/api/adminApi.js';
import { describeApiError, paymentStateMessage } from '@/api/apiErrors';
import { getSession } from '@/app/auth/session.js';
import AdminCohortConsolePanel from '@/features/cohorts/components/AdminCohortConsolePanel';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel';
import AdminMentorReplacementPanel from '@/features/cohorts/components/AdminMentorReplacementPanel';
import LearnerCohortTransferPanel from '@/features/cohorts/components/LearnerCohortTransferPanel';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel';
import CohortCompletionSummary from '@/features/cohorts/components/CohortCompletionSummary';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel';
import CohortScheduleRequestPanel from '@/features/scheduling/components/CohortScheduleRequestPanel';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import LearnerCohortDiscoveryPanel from '@/features/cohorts/components/LearnerCohortDiscoveryPanel';
import { courseHasStarted } from '@/features/cohorts/utils/completionHelpers';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import './studyCourses.css';
import { useLocale, currentIntlTag, translateText } from '@/locales/locale.js';

const labels = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Chờ mở khóa',
  Active: 'Đang học',
  Completed: 'Đã chốt khóa',
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
const show = (value) => translateText(labels[value] || value);
const date = (value) => (value ? formatVnDateTime(value, '—') : '—');
const utc = (value) => new Date(value).toISOString();
const money = (value) => `${Number(value || 0).toLocaleString(currentIntlTag())} ₫`;
const DEFAULT_COURSE_WEEKS = 10;
const DEFAULT_SESSION_MINUTES = 90;
const errText = (e) => describeApiError(e).message;
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

function Field({ title, children }) {
  const { tr } = useLocale();
  return (
    <label className="course-field">
      <span>{tr(title)}</span>
      {children}
    </label>
  );
}

function Form({ title, children, submit, busy, button = 'Lưu' }) {
  const { tr } = useLocale();
  return (
    <form
      className="course-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget), event.currentTarget);
      }}
    >
      <h3>{tr(title)}</h3>
      <fieldset disabled={busy}>
        {children}
        <button className="course-primary" type="submit">
          {button}
        </button>
      </fieldset>
    </form>
  );
}

function findRoomId(session, cohort) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohort?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohort?.sessions?.[0];
  return match?.roomId || null;
}

const PAYOS_RETURN_KEYS = ['code', 'id', 'cancel', 'status', 'orderCode'];
const COHORT_ORDER_PREFIX = 700_000_000;

function parseReturnedCohortCourseId(params) {
  const raw = params?.get('orderCode') ?? '';
  if (!/^[0-9]+$/.test(raw)) return 0;
  const orderCode = Number(raw);
  return Number.isSafeInteger(orderCode) && orderCode > COHORT_ORDER_PREFIX
    ? orderCode - COHORT_ORDER_PREFIX
    : 0;
}

export default function StudyCoursesPage({ role = 'Learner' }) {
  const { tr, trf } = useLocale();
  const admin = role === 'Admin';
  const mentor = role === 'Mentor';
  const learner = role === 'Learner';
  const Shell = admin ? AdminShell : mentor ? MentorShell : LearnerShell;
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialPayOsReturn] = useState(() => ({
    courseId: parseReturnedCohortCourseId(searchParams),
    hasCallback: PAYOS_RETURN_KEYS.some((key) => searchParams.has(key)),
  }));

  const [tab, setTab] = useState(learner ? (initialPayOsReturn.hasCallback ? 'my-courses' : 'cohorts') : 'manage');
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [levels, setLevels] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [myEntitlements, setMyEntitlements] = useState([]);
  const [adminSlots, setAdminSlots] = useState([]);
  const [cohortHomework, setCohortHomework] = useState([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState(null);
  const [homeworkTick, setHomeworkTick] = useState(0);
  const [skillProfile, setSkillProfile] = useState(null);
  const [skillProfileError, setSkillProfileError] = useState(null);
  const [selected, setSelected] = useState(() => (initialPayOsReturn.courseId > 0 ? initialPayOsReturn.courseId : null));
  const [plan, setPlan] = useState(blankPlan);
  const [cancelReason, setCancelReason] = useState('');
  const [supportDrafts, setSupportDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const refreshSeqRef = useRef(0);
  const inFlightRefreshRef = useRef(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState('');
  const [groupPolicy, setGroupPolicy] = useState(null);
  const [policyError, setPolicyError] = useState(null);
  const [completion, setCompletion] = useState(null); // { courseId, data, error }
  const [nowMs, setNowMs] = useState(0);
  const [sessionUserId] = useState(() => getSession()?.userId ?? null);

  // Đồng hồ cập nhật ngoài render (tránh Date.now() trong render).
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!admin) return undefined;
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setPolicyError(null);
        return getCurrentMentorGroupPolicy();
      })
      .then((p) => {
        if (!alive || p === null) return;
        setGroupPolicy(p || null);
      })
      .catch((e) => {
        if (!alive) return;
        setGroupPolicy(null);
        setPolicyError(e);
      });
    return () => {
      alive = false;
    };
  }, [admin]);

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

  const current = courses.find((c) => c.id === selected) || courses[0] || null;
  const currentCohort = useMemo(
    () => (current?.cohortId ? cohorts.find((g) => g.id === current.cohortId) || null : null),
    [cohorts, current]
  );
  const cohortCourses = useMemo(
    () => (current?.cohortId ? courses.filter((c) => c.cohortId === current.cohortId && c.status !== 'Cancelled') : []),
    [courses, current]
  );

  async function fetchSnapshot() {
    const [c, p, l, ch, m, ent, slots] = await Promise.all([
      courseGet(),
      courseGet('/plans'),
      courseGet('/catalog'),
      getCohorts(),
      admin ? courseGet('/mentors') : Promise.resolve([]),
      learner ? getMyEntitlements() : Promise.resolve([]),
      admin ? getAdminAvailabilitySlots() : Promise.resolve([]),
    ]);
    return { c, p, l, ch, m, ent, slots };
  }

  function applySnapshot({ c, p, l, ch, m, ent, slots }) {
    setCourses(c);
    setPlans(p);
    setLevels(l);
    setCohorts(ch);
    setMentors(m);
    setMyEntitlements(ent);
    setAdminSlots(slots);
    setSelected((cur) => (cur && c.some((x) => x.id === cur) ? cur : c[0]?.id || null));
  }

  async function load() {
    applySnapshot(await fetchSnapshot());
    setLoadError(null);
  }

  useEffect(() => {
    let alive = true;
    Promise.all([
      courseGet(),
      courseGet('/plans'),
      courseGet('/catalog'),
      getCohorts(),
      admin ? courseGet('/mentors') : Promise.resolve([]),
      learner ? getMyEntitlements() : Promise.resolve([]),
      admin ? getAdminAvailabilitySlots() : Promise.resolve([]),
    ])
      .then(([c, p, l, ch, m, ent, slots]) => {
        if (!alive) return;
        setLoadError(null);
        setCourses(c);
        setPlans(p);
        setLevels(l);
        setCohorts(ch);
        setMentors(m);
        setMyEntitlements(ent);
        setAdminSlots(slots);
        setSelected((cur) => (cur && c.some((x) => x.id === cur) ? cur : c[0]?.id || null));
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(e);
        setError(errText(e));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [admin, learner]);

  useEffect(() => {
    if (!current?.cohortId || admin) return;
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setHomeworkLoading(true);
        setHomeworkError(null);
        return getCohortHomework(current.cohortId);
      })
      .then((rows) => {
        if (!alive || !rows) return;
        setCohortHomework(rows);
        setHomeworkError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setHomeworkError(e);
      })
      .finally(() => alive && setHomeworkLoading(false));
    if (mentor && current.learnerId) {
      Promise.resolve()
        .then(() => {
          if (!alive) return null;
          setSkillProfileError(null);
          return getMentorLearnerSkillProfile(current.learnerId, current.cohortId);
        })
        .then((prof) => {
          if (!alive || !prof) return;
          setSkillProfile(prof);
          setSkillProfileError(null);
        })
        .catch((e) => {
          if (!alive) return;
          setSkillProfile(null);
          setSkillProfileError(e);
        });
    }
    return () => {
      alive = false;
    };
  }, [current?.id, current?.cohortId, current?.learnerId, admin, mentor, homeworkTick]);

  // Tổng kết khóa (Mentor lịch sử, điểm danh, BTVN, nhận xét) cho học viên lớp nhóm.
  useEffect(() => {
    if (!learner || !current?.id || !current?.cohortId) return undefined;
    let alive = true;
    const courseId = current.id;
    getCourseCompletionSummary(courseId)
      .then((data) => alive && setCompletion({ courseId, data, error: '' }))
      .catch((e) => alive && setCompletion({ courseId, data: null, error: errText(e) }));
    return () => {
      alive = false;
    };
  }, [learner, current?.id, current?.cohortId, current?.status]);

  const activeCompletion = completion && current && completion.courseId === current.id ? completion : null;
  const completionMentors = activeCompletion?.data?.mentors || (current?.mentorId ? [{ mentorId: current.mentorId, mentorName: current.mentorName }] : []);
  const currentStarted = courseHasStarted(current, nowMs);
  const mentorCohorts = useMemo(() => {
    if (!mentor) return [];
    const ids = new Set(courses.map((c) => c.cohortId).filter(Boolean));
    return cohorts.filter((c) => ids.has(c.id) || (sessionUserId && String(c.mentorId) === String(sessionUserId)));
  }, [mentor, courses, cohorts, sessionUserId]);
  const initialRequestCohortId = searchParams.get('cohortId');

  const hasAwaitingPayment = learner && courses.some((c) => c.paymentState === 'AwaitingPayment');
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const coursesRef = useRef(courses);
  useEffect(() => {
    coursesRef.current = courses;
  });
  const reconciledOnMount = useRef(false);

  // Xác nhận bất đồng bộ: nếu quay lại từ PayOS thì đối chiếu trực tiếp đơn vừa thanh toán, sau đó poll + khi quay lại tab.
  useEffect(() => {
    if (!learner || reconciledOnMount.current) return;
    if (!initialPayOsReturn.hasCallback && !hasAwaitingPayment) return;
    reconciledOnMount.current = true;

    const targetIds = new Set(
      coursesRef.current.filter((c) => c.paymentState === 'AwaitingPayment').map((c) => c.id)
    );
    if (initialPayOsReturn.courseId > 0) {
      targetIds.add(initialPayOsReturn.courseId);
    }

    if (initialPayOsReturn.hasCallback) {
      const cleaned = new URLSearchParams(searchParams);
      PAYOS_RETURN_KEYS.forEach((key) => cleaned.delete(key));
      setSearchParams(cleaned, { replace: true });
    }

    if (!targetIds.size) return;
    Promise.all([...targetIds].map((id) => reconcileCoursePayment(id).catch((err) => {
      recordDiagnostic({ scope: 'payment-reconcile', component: 'StudyCoursesPage', endpoint: `/study-courses/${id}/payment/reconcile`, status: err?.status ?? null, code: err?.errorCode ?? null, technicalDetail: err?.message });
      return null;
    })))
      .then((results) => {
        if (initialPayOsReturn.courseId > 0) {
          setSelected(initialPayOsReturn.courseId);
        }
        const returned = initialPayOsReturn.courseId > 0
          ? results.find((r) => r?.id === initialPayOsReturn.courseId) || results[0]
          : null;
        if (returned?.paymentState === 'Confirmed' || returned?.paymentStatus === 'Paid') {
          const msg = 'Thanh toán đã được xác nhận. Bạn đã ghi danh thành công!';
          setNotice(msg);
          notify.success(msg, '', { key: 'cohort-payos-return' });
        } else if (returned?.paymentState && paymentStateMessage(returned.paymentState)) {
          const msg = paymentStateMessage(returned.paymentState);
          setNotice(msg);
          notify.info(msg, '', { key: 'cohort-payos-return' });
        }
        return loadRef.current();
      })
      .catch((err) => recordDiagnostic({ scope: 'payment-reconcile', component: 'StudyCoursesPage', technicalDetail: err?.message }));
  }, [learner, hasAwaitingPayment, initialPayOsReturn, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hasAwaitingPayment) return undefined;
    let count = 0;
    const refresh = () => {
      loadRef.current().catch((err) => {
        recordDiagnostic({ scope: 'payment-poll', component: 'StudyCoursesPage', technicalDetail: err?.message });
      });
    };
    const timer = setInterval(() => {
      count += 1;
      if (count > 20) {
        clearInterval(timer);
        return;
      }
      refresh();
    }, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [hasAwaitingPayment]);

  const visibleCohortHomework =current?.cohortId && !admin ? cohortHomework : [];
  const visibleSkillProfile = current?.cohortId && mentor ? skillProfile : null;

  async function action(fn, message = 'Đã lưu thay đổi.', opts = {}) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const key = opts.key || 'study-course-action';
    const toastId = opts.silentLoading ? null : notify.loading(opts.loading || 'Đang xử lý…', '', { key });
    try {
      const result = await fn();
      await load();
      if (current?.cohortId && !admin) {
        const hw = await getCohortHomework(current.cohortId);
        setCohortHomework(hw);
      }
      const resolved = typeof message === 'function' ? message(result) : message;
      setNotice(resolved || '');
      if (resolved) {
        const tone = opts.tone ? (typeof opts.tone === 'function' ? opts.tone(result) : opts.tone) : 'success';
        notify[tone](resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
    } catch (e) {
      const info = describeApiError(e);
      setError(info.message);
      notify.apiError(e, opts.errorTitle || 'Chưa thực hiện được', { id: toastId || undefined, key, replace: true });
      if (info.code === 'CONCURRENCY_CONFLICT' || info.code === 'COHORT_SCHEDULE_REVISION_CONFLICT' || info.code === 'COHORT_FULL') {
        load().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  function handleRefresh() {
    if (inFlightRefreshRef.current) return inFlightRefreshRef.current;
    const seq = ++refreshSeqRef.current;
    setRefreshing(true);
    setError('');
    const job = Promise.all([
      load(),
      current?.cohortId && !admin
        ? getCohortHomework(current.cohortId)
            .then((hw) => { if (refreshSeqRef.current === seq) setCohortHomework(hw); })
            .catch(() => {})
        : Promise.resolve(),
    ])
      .catch((e) => {
        if (refreshSeqRef.current === seq) {
          setError(describeApiError(e).message);
        }
      })
      .finally(() => {
        if (inFlightRefreshRef.current === job) inFlightRefreshRef.current = null;
        if (refreshSeqRef.current === seq) setRefreshing(false);
      });
    inFlightRefreshRef.current = job;
    return job;
  }

  const post = (path, body, message) => action(() => coursePost(`/${current.id}${path}`, body), message);
  const changePlan = (key, value) =>
    setPlan((p) => {
      if (key !== 'sessionsPerWeek') return { ...p, [key]: value };
      const match = INTENSITY_OPTIONS.find((o) => o.sessionsPerWeek === Number(value));
      return { ...p, sessionsPerWeek: value, intensity: match ? match.value : 'Custom' };
    });

  return (
    <Shell breadcrumb={learner ? tr('Lớp học nhóm') : mentor ? tr('Quản lý lớp nhóm') : tr('Gói học, lớp & ghi danh')}>
      <main className="course-page">
        {learner ? (
          <IllustratedPageHeader
            icon="group"
            tone="sky"
            className="mb-3"
            eyebrow={tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
            title={tr('Lớp ôn JLPT & Khóa học của tôi')}
            description={tr('Học theo lớp nhóm cố định · Điểm danh, bài tập chung và bài tập cá nhân, hỗ trợ ôn lại JLPT minh bạch.')}
            actions={
              !loading && !(loadError && courses.length === 0 && cohorts.length === 0)
                && (tab === 'cohorts' ? cohorts.length > 0 : courses.length > 0) ? (
                  <RefreshButton
                    size="md"
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    disabled={loading}
                  />
                ) : null
            }
          />
        ) : (
          <header>
            <div className="flex items-start gap-3">
              <FeatureIcon feature="mentor" size="lg" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rp-brand">{tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}</p>
                <h1>{admin ? tr('Quản lý Lớp nhóm, Quyền & Khóa JLPT') : tr('Lớp phụ trách & bài tập về nhà')}</h1>
                <p className="course-meta">{tr('Học theo lớp nhóm cố định · Điểm danh, bài tập chung và bài tập cá nhân, hỗ trợ ôn lại JLPT minh bạch.')}</p>
              </div>
            </div>
            {!loading && !(loadError && courses.length === 0 && cohorts.length === 0) && courses.length > 0 && (
              <RefreshButton
                onRefresh={handleRefresh}
                refreshing={refreshing}
                disabled={loading}
              />
            )}
          </header>
        )}

        {refreshing && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}

        {learner && (
          <nav className="course-tabs" aria-label={tr('Điều hướng học tập')}>
            <button type="button" className={`course-tab ${tab === 'cohorts' ? 'active' : ''}`} onClick={() => setTab('cohorts')}>
             {trf('Lớp ôn JLPT ({0})', { 0: cohorts.length })}
            </button>
            <button type="button" className={`course-tab ${tab === 'my-courses' ? 'active' : ''}`} onClick={() => setTab('my-courses')}>
             {trf('Lớp đang học của tôi ({0})', { 0: courses.length })}
            </button>
          </nav>
        )}

        {error && <p role="alert" className="course-error">{error}</p>}
        {notice && <p role="status" className="course-notice">{notice}</p>}

        {loading ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : loadError && courses.length === 0 && cohorts.length === 0 ? (
          <section className="course-box">
            <ContextualErrorState
              error={loadError}
              title={tr('Chưa tải được dữ liệu lớp học nhóm')}
              onRetry={() => action(load, '', { silentLoading: true })}
              retrying={busy}
            />
          </section>
        ) : (
          <>
            {admin && policyError && (
              <section className="course-box">
                <ContextualErrorState
                  variant="inline"
                  error={policyError}
                  title={tr('Chưa tải được chính sách lớp nhóm hiện hành')}
                  onRetry={() => getCurrentMentorGroupPolicy().then((p) => { setGroupPolicy(p || null); setPolicyError(null); }).catch(setPolicyError)}
                />
              </section>
            )}
            {learner && tab === 'cohorts' && (
              <LearnerCohortDiscoveryPanel
                cohorts={cohorts}
                enrolledCourses={courses}
                myEntitlements={myEntitlements}
                busy={busy}
                onRun={action}
                initialMentorId={searchParams.get('mentorId') || ''}
                onEnrolled={(courseId) => {
                  setSelected(courseId);
                  setTab('my-courses');
                }}
              />
            )}

            {admin && (
              <>
                <AdminCohortConsolePanel
                  plans={plans}
                  cohorts={cohorts}
                  mentors={mentors}
                  adminSlots={adminSlots}
                  busy={busy}
                  onRun={action}
                />
                <AdminCohortScheduleRequestsPanel busy={busy} onRun={action} />
                <AdminCohortTransferQueuePanel busy={busy} onRun={action} />
                <AdminCohortComplaintsPanel busy={busy} onRun={action} />
                <AdminMentorReplacementPanel cohorts={cohorts} mentors={mentors} busy={busy} onRun={action} />
                <section className="course-box">
                  <h2>{tr('Cấu hình gói khóa học')}</h2>
                  <Form
                    title={plan.id ? trf('Sửa gói #{0}', { 0: plan.id }) : tr('Tạo gói mới')}
                    busy={busy}
                    submit={() =>
                      action(async () => {
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
                      })
                    }
                  >
                    <Field title={tr('Tên gói')}><input required maxLength={200} value={plan.name} onChange={(e) => changePlan('name', e.target.value)} /></Field>
                    <Field title={tr('Loại lớp')}>
                      <select value="Group" onChange={() => changePlan('sessionType', 'Group')}>
                        <option value="Group">{tr('Lớp nhóm')}</option>
                      </select>
                    </Field>
                    <Field title={tr('Cường độ học')}>
                      <select value={plan.intensity || 'Custom'} onChange={(e) => applyIntensity(e.target.value)}>
                        {intensityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {tr(o.label)} · {o.sessionsPerWeek}{' '}{tr('buổi/tuần')}{o.sessionsPerWeek === recommendedSpw ? tr(' (khuyến nghị)') : ''}
                          </option>
                        ))}
                        <option value="Custom">{tr('Tùy chỉnh')}</option>
                      </select>
                    </Field>
                    <p className="course-meta" style={{ flexBasis: '100%' }}>
                      {tr('Khóa')}{' '}{courseWeeks}{' '}{tr('tuần ·')}{' '}{plan.sessionsPerWeek || '—'}{' '}{tr('buổi/tuần ·')}{' '}{plan.totalSessions || '—'}{' '}{tr('buổi ·')}{' '}
                      {plan.sessionMinutes || '—'}{' '}{tr('phút/buổi')}
                      {plan.totalSessions && plan.sessionMinutes ? trf(' · tổng {0} giờ', { 0: Math.round((Number(plan.totalSessions) * Number(plan.sessionMinutes)) / 6) / 10 }) : ''}
                      {' '}{tr('(máy chủ kiểm tra lại theo chính sách hiện hành)')}
                    </p>
                    <Field title={tr('Sĩ số tối đa')}>
                      <input type="number" min={1} max={20} value={plan.capacity ?? 1} onChange={(e) => changePlan('capacity', e.target.value)} />
                    </Field>
                    <Field title={tr('Cấp độ JLPT')}>
                      <select required value={plan.certificateLevelId} onChange={(e) => changePlan('certificateLevelId', e.target.value)}>
                        <option value="">{tr('Chọn cấp độ')}</option>
                        {levels.map((l) => <option key={l.id} value={l.id}>{l.certificateType} · {l.code}</option>)}
                      </select>
                    </Field>
                    {[
                      ['durationMonths', 'Số tháng', 1, 36],
                      ['sessionsPerWeek', 'Buổi/tuần', 1, 7],
                      ['sessionMinutes', 'Phút/buổi', 15, 240],
                      ['totalSessions', 'Tổng buổi', 1, 500],
                      ['retakeClaimDays', 'Hạn yêu cầu JLPT (ngày)', 1, 730],
                      ['price', 'Học phí (VND)', 0, 2147483647],
                    ].map(([key, title, min, max]) => (
                      <Field key={key} title={title}>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          required={key === 'durationMonths' || key === 'sessionsPerWeek'}
                          value={plan[key] ?? ''}
                          onChange={(e) => changePlan(key, e.target.value)}
                        />
                      </Field>
                    ))}
                    <label><input type="checkbox" checked={plan.isPublished} onChange={(e) => changePlan('isPublished', e.target.checked)} />{' '}{tr('Mở bán')}</label>
                  </Form>
                </section>
              </>
            )}

            {admin && (
              <section className="course-box">
                <h2>{tr('Danh sách gói đã cấu hình')}</h2>
                <div className="course-grid">
                  {plans.map((p) => (
                    <article className="course-box" key={p.id}>
                      <span className="course-badge">{p.sessionType === 'Group' ? tr('Học nhóm') : p.sessionType} · {p.level}</span>{' '}
                      {p.intensityLabel && <span className="course-badge">{p.intensityLabel}</span>}{' '}
                      {p.isRecommendedIntensity && <span className="course-badge ok">{tr('Khuyến nghị')}</span>}
                      <h3 style={{ marginTop: 8 }}>{p.name}</h3>
                      <p>
                        {p.durationMonths}{' '}{tr('tháng ·')}{' '}{p.sessionsPerWeek}{' '}{tr('buổi/tuần ·')}{' '}{p.totalSessions ?? '—'}{' '}{tr('buổi')}
                        {p.totalTeachingHours != null ? trf(' · {0} giờ học', { 0: p.totalTeachingHours }) : ''}{' '}{tr('· sĩ số')}{' '}{p.capacity}
                      </p>
                      <strong>{money(p.price)}</strong>
                      <div style={{ marginTop: 10 }}>
                        <button
                          disabled={busy}
                          onClick={() =>
                            setPlan({
                              ...p,
                              intensity: p.intensity || 'Custom',
                              sessionMinutes: p.sessionMinutes ?? '',
                              totalSessions: p.totalSessions ?? '',
                              retakeClaimDays: p.retakeClaimDays ?? '',
                            })
                          }
                        >
                          {p.isPublished ? tr('Đang mở') : tr('Nháp')}{' '}{tr('· Sửa')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {(!learner || tab === 'my-courses') && (
              <>
                <section className="course-box">
                  <h2>
                    {admin
                      ? trf('Hồ sơ ghi danh ({0}) · {1} yêu cầu JLPT chờ duyệt', { 0: courses.length, 1: courses.reduce((n, c) => n + c.requests.filter((r) => r.status === 'Pending').length, 0) })
                      : mentor
                        ? trf('Học viên & lớp phụ trách ({0})', { 0: courses.length })
                        : trf('Lớp & khóa học của tôi ({0})', { 0: courses.length })}
                  </h2>
                  {loadError ? (
                    <ContextualErrorState
                      compact
                      error={loadError}
                      title={tr('Chưa tải được danh sách lớp của bạn')}
                      onRetry={() => action(load, '', { silentLoading: true })}
                      retrying={busy}
                    />
                  ) : courses.length === 0 ? (
                    <ContextualEmptyState
                      variant="compact"
                      context="groupLearning"
                      illustration="classroom"
                      action={learner && <button type="button" className="course-primary" onClick={() => setTab('cohorts')}>{tr('Xem lớp ôn JLPT')}</button>}
                    />
                  ) : (
                    <label className="course-field" style={{ maxWidth: 520 }}>
                      <span>{tr('Chọn hồ sơ khóa / lớp')}</span>
                      <select value={current?.id ?? ''} onChange={(e) => setSelected(Number(e.target.value) || null)}>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level}) · {c.learnerName} · {show(c.status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </section>

                {mentor && (
                  <>
                    <CohortComplaintPanel role="Mentor" busy={busy} onRun={action} />
                    <CohortScheduleRequestPanel
                      cohorts={mentorCohorts}
                      initialCohortId={initialRequestCohortId}
                      busy={busy}
                      onRun={action}
                    />
                  </>
                )}

                {current && (
                  <div key={current.id} className="space-y-4">
                    <section className="course-box">
                      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <span className="course-badge">{current.level} · {current.sessionType === 'Group' ? tr('Học nhóm') : current.sessionType}</span>{' '}
                          <span className={`course-badge ${current.status === 'Active' ? 'ok' : current.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                            {show(current.status)}
                          </span>
                        </div>
                        <span className="course-meta">
                          {currentCohort?.name || tr('Lớp học nhóm')}
                        </span>
                      </div>
                      <h2 style={{ marginTop: 10 }}>{current.name}</h2>
                      <p className="course-meta">
                        {tr('Học viên:')}{' '}<strong>{current.learnerName}</strong> · {tr('Giáo viên:')} <strong>{current.mentorName || tr('Chưa phân công')}</strong>
                      </p>
                      <p className="course-meta">
                       {trf('{0} buổi · {1} phút/buổi · Bắt đầu: {2}', { 0: current.totalSessions, 1: current.sessionMinutes, 2: date(current.startsAt) })}
                      </p>

                      {learner && current.paymentState === 'AwaitingPayment' && (
                        <div className="mt-3 rounded-rp-input border border-rp-warning-line bg-rp-warning-bg p-4" role="status">
                          <strong className="text-rp-warning">{paymentStateMessage('AwaitingPayment')}</strong>
                          <HoldCountdown expiresAt={current.paymentExpiresAt} className="mt-2 flex" />
                          <p className="course-meta">
                           {trf('Chỗ được giữ đến: {0}. Ghi danh chỉ có hiệu lực sau khi hệ thống xác minh thanh toán thành công.', { 0: date(current.paymentExpiresAt) })}
                          </p>
                          <div className="course-buttons">
                            {typeof current.checkoutUrl === 'string' && current.checkoutUrl.startsWith('https://') && (
                              <a className="course-pill-link" href={current.checkoutUrl}>{tr('Tiếp tục thanh toán')}</a>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                action(
                                  () => reconcileCoursePayment(current.id),
                                  (res) => (res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid'
                                    ? 'Thanh toán đã được xác nhận. Bạn đã ghi danh thành công!'
                                    : paymentStateMessage(res?.paymentState) || 'Đã kiểm tra trạng thái thanh toán: đang chờ xác nhận.'),
                                  {
                                    loading: 'Đang đối chiếu thanh toán với máy chủ…',
                                    tone: (res) => (res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid' ? 'success' : res?.paymentState === 'Expired' || res?.paymentState === 'Failed' ? 'warning' : 'info'),
                                  },
                                )
                              }
                            >
                              {tr('Kiểm tra trạng thái thanh toán')}
                            </button>
                          </div>
                        </div>
                      )}
                      {learner && (current.paymentState === 'Expired' || current.paymentState === 'Failed') && (
                        <p className="course-error" role="status">
                          {paymentStateMessage(current.paymentState)}
                        </p>
                      )}
                      {learner && current.paymentState === 'Cancelled' && (
                        <p className="course-meta" role="status">{paymentStateMessage('Cancelled')}</p>
                      )}
                      {learner && current.paymentState === 'PaidUnderReview' && (
                        <p className="course-notice" role="status">
                          {paymentStateMessage('PaidUnderReview')}
                        </p>
                      )}
                      {learner && current.paymentState === 'Confirmed' && (
                        <p className="course-notice" role="status">
                          {tr('Đã xác nhận thanh toán')}{current.paymentConfirmedAtUtc ? trf(' lúc {0}', { 0: date(current.paymentConfirmedAtUtc) }) : ''}.
                        </p>
                      )}

                      {learner && current.cohortId && current.status === 'Active' && currentStarted && (
                        <p className="course-meta">
                          {tr('Khóa học đã bắt đầu nên không thể tự hủy ghi danh. Nếu gặp vấn đề, vui lòng gửi khiếu nại ở mục bên dưới.')}
                        </p>
                      )}
                      {learner && current.cohortId && current.status === 'Active' && nowMs > 0 && !currentStarted && (
                        <div className="course-form">
                          <div className="course-buttons">
                            <input
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              maxLength={1000}
                              placeholder={tr('Lý do xin rời lớp trước giờ khóa (chỉ hủy cho cá nhân bạn)')}
                              style={{ maxWidth: 380 }}
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                action(
                                  () => cancelCohortEnrollment(current.id, cancelReason),
                                  'Đã hủy ghi danh cá nhân và giải phóng 1 chỗ trong lớp.'
                                )
                              }
                            >
                              {tr('Hủy ghi danh cá nhân')}
                            </button>
                          </div>
                        </div>
                      )}

                      {mentor && current.status === 'Transferred' && (
                        <p className="course-notice">{tr('Học viên đã chuyển sang lớp khác; buổi đã học và bài tập cũ vẫn được lưu trong hồ sơ này.')}</p>
                      )}

                      <h3 style={{ marginTop: 18 }}>{tr('Tiến độ bài tập & điều kiện ôn lại')}</h3>
                      <p>
                        {tr('Bài tập đạt đúng hạn:')}{' '}<strong>{current.eligibility.passedOnTimeHomework}/{current.eligibility.requiredHomework}</strong>{' '}{tr('· Vắng:')}{' '}<strong>{current.eligibility.absentSessions}/{current.eligibility.countedSessions}</strong>{' '}{tr('buổi')}
                      </p>
                      <p className="course-meta">
                        {current.eligibility.canClaim
                          ? tr('Đủ điều kiện nộp minh chứng trượt JLPT chính thức để Admin xem xét hỗ trợ.')
                          : current.eligibility.reasons.join(' ')}
                      </p>

                      {admin && current.status === 'Active' && (
                        <Form
                          title={tr('Chốt hoàn thành khóa')}
                          busy={busy}
                          button={tr('Chốt dữ liệu khóa')}
                          submit={() => post('/complete', {}, 'Đã chốt hoàn thành khóa học.')}
                        >
                          <label><input type="checkbox" required />{' '}{tr('Xác nhận đủ buổi cam kết và hoàn tất kiểm tra.')}</label>
                        </Form>
                      )}
                    </section>

                    {learner && current.cohortId && current.status !== 'Completed' && (
                      <LearnerCohortTransferPanel course={current} cohorts={cohorts} busy={busy} onRun={action} />
                    )}

                    {learner && current.cohortId && (
                      <CohortCompletionSummary
                        courseId={current.id}
                        summary={activeCompletion?.data || null}
                        error={activeCompletion?.error || ''}
                        busy={busy}
                        onRun={action}
                      />
                    )}

                    {learner && (
                      <CohortComplaintPanel role="Learner" course={current} mentors={completionMentors} busy={busy} onRun={action} />
                    )}

                    {mentor && skillProfileError && (
                      <section className="course-box">
                        <ContextualErrorState
                          variant="inline"
                          error={skillProfileError}
                          title={tr('Chưa tải được hồ sơ năng lực học viên')}
                          onRetry={() => getMentorLearnerSkillProfile(current.learnerId, current.cohortId).then((prof) => { setSkillProfile(prof); setSkillProfileError(null); }).catch(setSkillProfileError)}
                        />
                      </section>
                    )}

                    {mentor && visibleSkillProfile && (
                      <section className="course-box">
                        <h2>{trf('Hồ sơ năng lực học viên: {0}', { 0: visibleSkillProfile.learnerName })}</h2>
                        <p className="course-meta">
                          {tr('Phạm vi:')}{' '}{visibleSkillProfile.scopeType}{' '}{tr('· Trình độ đánh giá:')}{' '}<strong>{visibleSkillProfile.assessedJlptLevel || current.level}</strong>{' '}{tr('· Bài tập đúng hạn:')}{' '}{visibleSkillProfile.homeworkStats?.onTimeCount ?? 0}/{visibleSkillProfile.homeworkStats?.assignedCount ?? 0}
                          {visibleSkillProfile.homeworkStats?.onTimePercent != null ? ` (${visibleSkillProfile.homeworkStats.onTimePercent}%)` : ''}
                        </p>
                        <div className="course-buttons">
                          {(visibleSkillProfile.skills || []).map((sk) => (
                            <span className="course-badge" key={sk.skill}>
                              {sk.skill}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : tr('Chưa có mẫu')}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    <CohortSessionsCalendar course={current} cohort={currentCohort}>
                      {current.sessions.length === 0 ? (
                        <ContextualEmptyState
                          variant="inline"
                          size="sm"
                          illustration="calendar"
                          title={tr('Chưa có buổi học nào.')}
                        />
                      ) : (
                        current.sessions.map((s) => {
                          const roomId = findRoomId(s, currentCohort);
                          return (
                            <article className="course-row" key={s.id}>
                              <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                                <div>
                                  <strong>{tr('Buổi')}{' '}{s.number}{s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}</strong> · {date(s.scheduledAt)} ·{' '}
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
                              {(admin || mentor) && current.status === 'Active' && s.status === 'Scheduled' && (
                                <Form
                                  title={tr('Điểm danh buổi học')}
                                  busy={busy}
                                  submit={(f) => post(`/sessions/${s.id}/attendance`, { status: f.get('status'), note: f.get('note') })}
                                >
                                  <Field title={tr('Trạng thái')}>
                                    <select name="status">
                                      {['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'].map((x) => (
                                        <option value={x} key={x}>{show(x)}</option>
                                      ))}
                                    </select>
                                  </Field>
                                  <Field title={tr('Ghi chú điểm danh')}><input required name="note" maxLength={1000} /></Field>
                                </Form>
                              )}
                            </article>
                          );
                        })
                      )}
                    </CohortSessionsCalendar>

                    {!admin && current.cohortId && (
                      homeworkLoading && visibleCohortHomework.length === 0 ? (
                        <section className="course-box">
                          <SakuraLoader variant="section" context="homework" className="min-h-[120px]" delay={160} />
                        </section>
                      ) : homeworkError ? (
                        <section className="course-box">
                          <ContextualErrorState
                            compact
                            error={homeworkError}
                            title={tr('Chưa tải được bài tập nhóm')}
                            onRetry={() => setHomeworkTick((t) => t + 1)}
                            retrying={homeworkLoading}
                          />
                        </section>
                      ) : (
                        <CohortHomeworkPanel
                          cohortId={current.cohortId}
                          cohortName={currentCohort?.name || ''}
                          coursesInCohort={cohortCourses}
                          items={visibleCohortHomework}
                          role={role}
                          busy={busy}
                          onRun={action}
                        />
                      )
                    )}

                    <section className="course-box">
                      <h2>{tr('Hỗ trợ ôn lại khi trượt JLPT chính thức')}</h2>
                      <p className="course-meta">
                        {tr('Admin duyệt minh chứng và điều kiện nộp bài tập. Sau khi Admin duyệt, Giáo viên lập kế hoạch hỗ trợ ôn lại (không tự cấp buổi học miễn phí).')}
                      </p>
                      {learner && current.status === 'Completed' && !current.requests.some((r) => r.status === 'Pending') && (
                        <Form
                          title={tr('Gửi yêu cầu hỗ trợ & minh chứng trượt JLPT chính thức')}
                          busy={busy}
                          button={tr('Gửi Admin xét duyệt')}
                          submit={(f, formEl) =>
                            action(async () => {
                              const form = new FormData();
                              form.append('examDate', utc(f.get('examDate')));
                              form.append('resultPublishedAt', utc(f.get('resultPublishedAt')));
                              form.append('reason', String(f.get('reason') || '').trim());
                              const file = f.get('evidence');
                              if (file && file.size > 0) form.append('evidence', file);
                              await uploadRetakeEvidence(current.id, form);
                              formEl.reset();
                            }, 'Đã gửi yêu cầu hỗ trợ JLPT lên Admin.')
                          }
                        >
                          <Field title={tr('Ngày thi JLPT')}><input name="examDate" type="date" required /></Field>
                          <Field title={tr('Ngày công bố kết quả')}><input name="resultPublishedAt" type="date" required /></Field>
                          <Field title={tr('Lý do / Tường trình kết quả thi (bắt buộc với lớp nhóm)')}>
                            <textarea name="reason" required maxLength={1000} placeholder={tr('Nêu rõ điểm các kỹ năng hoặc phần cần Giáo viên hỗ trợ ôn lại...')} />
                          </Field>
                          <Field title={tr('Minh chứng chính thức (PDF/PNG/JPG ≤ 10 MB)')}>
                            <input name="evidence" type="file" accept="application/pdf,image/png,image/jpeg" />
                          </Field>
                        </Form>
                      )}

                      {current.requests.length === 0 ? (
                        <div className="mt-2.5">
                          <ContextualEmptyState
                            variant="inline"
                            size="sm"
                            illustration="certificate"
                            title={tr('Chưa có yêu cầu hỗ trợ JLPT nào.')}
                          />
                        </div>
                      ) : (
                        current.requests.map((r) => (
                          <article className="course-row" key={r.id}>
                            <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                              <h3>{trf('Yêu cầu #{0} · {1}', { 0: r.id, 1: show(r.status) })}</h3>
                              <span className="course-meta">{trf('Thi: {0} · Công bố: {1}', { 0: date(r.examDate), 1: date(r.resultPublishedAt) })}</span>
                            </div>
                            {r.reason && <p className="course-pre"><strong>{tr('Lý do học viên:')}</strong> {tr(r.reason)}</p>}
                            {r.response && <p className="course-pre"><strong>{tr('Quyết định của Admin:')}</strong> {r.response}</p>}
                            {r.mentorSupportPlan && (
                              <div className="course-notice" style={{ marginTop: 8 }}>
                                <strong>{trf('Lộ trình hỗ trợ từ Giáo viên ({0}):', { 0: date(r.mentorSupportPlanAtUtc) })}</strong>
                                <p className="course-pre">{r.mentorSupportPlan}</p>
                              </div>
                            )}
                            {(admin || learner) && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => action(() => openRetakeEvidence(current.id, r.id), 'Đã tải minh chứng riêng tư.')}
                              >
                                {tr('Tải minh chứng riêng tư')}
                              </button>
                            )}
                            {admin && r.status === 'Pending' && (
                              <Form
                                title={tr('Quyết định của Admin')}
                                busy={busy}
                                button={tr('Xác nhận')}
                                submit={(f) =>
                                  post(`/retake/${r.id}/review`, {
                                    approve: f.get('decision') === 'approve',
                                    officialFailureVerified: f.get('verified') === 'on',
                                    onTimeHomeworkEvidenceVerified: current.eligibility.homeworkMet,
                                    cohortId: f.get('nextCohortId') ? Number(f.get('nextCohortId')) : null,
                                    response: f.get('response'),
                                  })
                                }
                              >
                                <Field title={tr('Quyết định')}>
                                  <select name="decision">
                                    <option value="reject">{tr('Từ chối')}</option>
                                    <option value="approve" disabled={!current.eligibility.canClaim}>{tr('Duyệt hỗ trợ ôn lại')}</option>
                                  </select>
                                </Field>
                                {current.sessionType === 'Group' && (
                                  <Field title={tr('Lớp nhóm kế tiếp (nếu duyệt)')}>
                                    <select name="nextCohortId">
                                      <option value="">{tr('Chọn lớp kế tiếp')}</option>
                                      {cohorts.filter((x) => x.id !== current.cohortId).map((x) => (
                                        <option key={x.id} value={x.id}>{x.name} ({x.level})</option>
                                      ))}
                                    </select>
                                  </Field>
                                )}
                                <label><input type="checkbox" name="verified" />{' '}{tr('Đã xác minh minh chứng trượt JLPT chính thức')}</label>
                                <Field title={tr('Lý do quyết định')}><textarea name="response" required maxLength={2000} /></Field>
                              </Form>
                            )}
                            {mentor && r.status === 'Approved' && (
                              <form
                                className="course-form"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const val = (supportDrafts[r.id] ?? r.mentorSupportPlan ?? '').trim();
                                  action(() => saveRetakeSupportPlan(current.id, r.id, val), 'Đã lưu kế hoạch hỗ trợ ôn lại cho học viên.');
                                }}
                              >
                                <h3>{tr('Lộ trình hỗ trợ ôn lại JLPT của Giáo viên')}</h3>
                                <fieldset disabled={busy}>
                                  <Field title={tr('Kế hoạch ôn luyện (chỉ mở sau khi Admin đã duyệt)')}>
                                    <textarea
                                      required
                                      maxLength={2000}
                                      value={supportDrafts[r.id] ?? r.mentorSupportPlan ?? ''}
                                      onChange={(e) => setSupportDrafts((cur) => ({ ...cur, [r.id]: e.target.value }))}
                                    />
                                  </Field>
                                  <button className="course-primary" type="submit" disabled={busy}>
                                    {tr('Lưu lộ trình hỗ trợ')}
                                  </button>
                                </fieldset>
                              </form>
                            )}
                          </article>
                        ))
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
