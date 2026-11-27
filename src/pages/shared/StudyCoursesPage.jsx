import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminShell, MentorShell, LearnerShell } from '@/layouts';
import { ContextualEmptyState, ContextualErrorState, CustomSelect, DateInput, FeatureIcon, Input, RefreshButton, RefreshingIndicator, SakuraLoader, Select, Textarea, notify } from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { recordDiagnostic } from '@/api/diagnostics.js';
import HoldCountdown from '@/features/checkout/components/HoldCountdown.jsx';
import {
  courseGet,
  coursePost,
  getCohortHomework,
  getCohorts,
  getCourseCompletionSummary,
  getMentorLearnerSkillProfile,
  getMyEntitlements,
  openRetakeEvidence,
  reconcileCoursePayment,
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
import CohortMentorReviewSection from '@/features/cohorts/components/CohortMentorReviewSection.jsx';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel';
import CohortScheduleRequestPanel from '@/features/scheduling/components/CohortScheduleRequestPanel';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import LearnerCohortDiscoveryPanel from '@/features/cohorts/components/LearnerCohortDiscoveryPanel';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import './studyCourses.css';
import { useLocale, translateText } from '@/locales/locale.js';

const labels = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Chờ mở khóa',
  Active: 'Đang học',
  Completed: 'Đã chốt khóa',
  Cancelled: 'Đã hủy',
  PaymentFailed: 'Thanh toán không thành công',
  PaymentExpired: 'Thanh toán hết hạn',
  PaymentReview: 'Đã nhận thanh toán – chờ Quản trị viên xử lý',
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
const errText = (e) => describeApiError(e).message;

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
  const [mentors, setMentors] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [myEntitlements, setMyEntitlements] = useState([]);
  const [cohortHomework, setCohortHomework] = useState([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState(null);
  const [homeworkTick, setHomeworkTick] = useState(0);
  const [skillProfile, setSkillProfile] = useState(null);
  const [skillProfileError, setSkillProfileError] = useState(null);
  const [selected, setSelected] = useState(() => (initialPayOsReturn.courseId > 0 ? initialPayOsReturn.courseId : null));
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
  const [sessionUserId] = useState(() => getSession()?.userId ?? null);

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
    const [c, ch, m, ent] = await Promise.all([
      courseGet(),
      getCohorts(),
      admin ? courseGet('/mentors') : Promise.resolve([]),
      learner ? getMyEntitlements() : Promise.resolve([]),
    ]);
    return { c, ch, m, ent };
  }

  function applySnapshot({ c, ch, m, ent }) {
    setCourses(c);
    setCohorts(ch);
    setMentors(m);
    setMyEntitlements(ent);
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
      getCohorts(),
      admin ? courseGet('/mentors') : Promise.resolve([]),
      learner ? getMyEntitlements() : Promise.resolve([]),
    ])
      .then(([c, ch, m, ent]) => {
        if (!alive) return;
        setLoadError(null);
        setCourses(c);
        setCohorts(ch);
        setMentors(m);
        setMyEntitlements(ent);
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

  return (
    <Shell breadcrumb={learner ? tr('Lớp học nhóm') : mentor ? tr('Quản lý lớp nhóm') : tr('Gói học, lớp & ghi danh')}>
      <main className="course-page">
        {learner ? (
          <IllustratedPageHeader
            icon="group"
            tone="sky"
            className="mb-3"
            eyebrow={tr('Lớp học nhóm cố định theo chính sách hiện hành')}
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
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rp-brand">{tr('Lớp học nhóm cố định theo chính sách hiện hành')}</p>
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
                  cohorts={cohorts}
                  courses={courses}
                  groupPolicy={groupPolicy}
                  busy={busy}
                />
                <AdminCohortScheduleRequestsPanel busy={busy} onRun={action} />
                <AdminCohortTransferQueuePanel busy={busy} onRun={action} />
                <AdminCohortComplaintsPanel busy={busy} onRun={action} />
                <AdminMentorReplacementPanel cohorts={cohorts} mentors={mentors} busy={busy} onRun={action} />
              </>
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
                    <div className="max-w-[520px] pt-1">
                      <CustomSelect
                        label={tr('Chọn hồ sơ khóa / lớp')}
                        value={current?.id != null ? String(current.id) : ''}
                        onChange={(val) => setSelected(Number(val) || null)}
                        options={courses.map((c) => ({
                          value: String(c.id),
                          label: `${c.name} (${c.level}) · ${c.learnerName} · ${show(c.status)}`,
                        }))}
                      />
                    </div>
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

                      {mentor && current.status === 'Transferred' && (
                        <p className="course-notice">{tr('Học viên đã chuyển sang lớp khác; buổi đã học và bài tập cũ vẫn được lưu trong hồ sơ này.')}</p>
                      )}

                      <h3 style={{ marginTop: 18 }}>{tr('Tiến độ bài tập & điều kiện ôn lại')}</h3>
                      <p>
                        {tr('Bài tập đạt đúng hạn:')}{' '}<strong>{current.eligibility.passedOnTimeHomework}/{current.eligibility.requiredHomework}</strong>{' '}{tr('· Vắng:')}{' '}<strong>{current.eligibility.absentSessions}/{current.eligibility.countedSessions}</strong>{' '}{tr('buổi')}
                      </p>
                      <p className="course-meta">
                        {current.eligibility.canClaim
                          ? tr('Đủ điều kiện nộp minh chứng trượt JLPT chính thức để Quản trị viên xem xét hỗ trợ.')
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

                    {learner && current.cohortId && (activeCompletion?.data?.isClassCompleted || current.status === 'Completed') && (
                      <CohortCompletionSummary
                        summary={activeCompletion?.data || null}
                        error={activeCompletion?.error || ''}
                      />
                    )}

                    {learner && current.cohortId && (
                      <CohortMentorReviewSection
                        courseId={current.id}
                        summary={activeCompletion?.data || null}
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
                              {sk.skillLabel || tr(sk.skill)}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : tr('Chưa có mẫu')}
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
                                  <Select native name="status" label={tr('Trạng thái')}>
                                    {['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'].map((x) => (
                                      <option value={x} key={x}>{show(x)}</option>
                                    ))}
                                  </Select>
                                  <Input required name="note" maxLength={1000} label={tr('Ghi chú điểm danh')} />
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
                        {tr('Quản trị viên duyệt minh chứng và điều kiện nộp bài tập. Sau khi Quản trị viên duyệt, Giáo viên lập kế hoạch hỗ trợ ôn lại (không tự cấp buổi học miễn phí).')}
                      </p>
                      {learner && current.status === 'Completed' && !current.requests.some((r) => r.status === 'Pending') && (
                        <Form
                          title={tr('Gửi yêu cầu hỗ trợ & minh chứng trượt JLPT chính thức')}
                          busy={busy}
                          button={tr('Gửi Quản trị viên xét duyệt')}
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
                            }, 'Đã gửi yêu cầu hỗ trợ JLPT lên Quản trị viên.')
                          }
                        >
                          <DateInput name="examDate" label={tr('Ngày thi JLPT')} required />
                          <DateInput name="resultPublishedAt" label={tr('Ngày công bố kết quả')} required />
                          <Textarea
                            name="reason"
                            label={tr('Lý do / Tường trình kết quả thi (bắt buộc với lớp nhóm)')}
                            required
                            maxLength={1000}
                            placeholder={tr('Nêu rõ điểm các kỹ năng hoặc phần cần Giáo viên hỗ trợ ôn lại...')}
                          />
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
                            {r.response && <p className="course-pre"><strong>{tr('Quyết định của Quản trị viên:')}</strong> {r.response}</p>}
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
                                title={tr('Quyết định của Quản trị viên')}
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
                                <Select native name="decision" label={tr('Quyết định')}>
                                  <option value="reject">{tr('Từ chối')}</option>
                                  <option value="approve" disabled={!current.eligibility.canClaim}>{tr('Duyệt hỗ trợ ôn lại')}</option>
                                </Select>
                                {current.sessionType === 'Group' && (
                                  <Select
                                    name="nextCohortId"
                                    label={tr('Lớp nhóm kế tiếp (nếu duyệt)')}
                                    clearable
                                    options={cohorts
                                      .filter((x) => x.id !== current.cohortId)
                                      .map((x) => ({
                                        value: String(x.id),
                                        label: `${x.name} (${formatJlptLevel(x.level)})`,
                                      }))}
                                  />
                                )}
                                <label><input type="checkbox" name="verified" />{' '}{tr('Đã xác minh minh chứng trượt JLPT chính thức')}</label>
                                <Textarea name="response" label={tr('Lý do quyết định')} required maxLength={2000} />
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
                                <fieldset disabled={busy} className="space-y-3">
                                  <Textarea
                                    label={tr('Kế hoạch ôn luyện (chỉ mở sau khi Quản trị viên đã duyệt)')}
                                    required
                                    maxLength={2000}
                                    value={supportDrafts[r.id] ?? r.mentorSupportPlan ?? ''}
                                    onChange={(e) => setSupportDrafts((cur) => ({ ...cur, [r.id]: e.target.value }))}
                                  />
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
