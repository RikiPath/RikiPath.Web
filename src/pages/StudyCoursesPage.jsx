import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminShell, ConsultShell, LearnerShell } from '../components/shells';
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
} from '../api/studyCourses';
import { getCurrentMentorGroupPolicy } from '../api/admin.js';
import { describeApiError, paymentStateMessage } from '../api/apiErrors';
import { getSession } from '../auth/session.js';
import AdminCohortConsolePanel from '../components/studyCourses/AdminCohortConsolePanel';
import AdminCohortTransferQueuePanel from '../components/studyCourses/AdminCohortTransferQueuePanel';
import AdminCohortScheduleRequestsPanel from '../components/studyCourses/AdminCohortScheduleRequestsPanel';
import AdminCohortComplaintsPanel from '../components/studyCourses/AdminCohortComplaintsPanel';
import AdminMentorReplacementPanel from '../components/studyCourses/AdminMentorReplacementPanel';
import LearnerCohortTransferPanel from '../components/studyCourses/LearnerCohortTransferPanel';
import CohortHomeworkPanel from '../components/studyCourses/CohortHomeworkPanel';
import CohortCompletionSummary from '../components/studyCourses/CohortCompletionSummary';
import CohortComplaintPanel from '../components/studyCourses/CohortComplaintPanel';
import CohortScheduleRequestPanel from '../components/studyCourses/CohortScheduleRequestPanel';
import LearnerCohortDiscoveryPanel from '../components/studyCourses/LearnerCohortDiscoveryPanel';
import { courseHasStarted } from '../components/studyCourses/completionHelpers';
import './studyCourses.css';

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
  CancelledByMentor: 'Mentor hủy',
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Transferred: 'Đã chuyển lớp',
  TransferredOut: 'Đã chuyển sang lớp khác',
  Withdrawn: 'Đã rút',
};
const show = (value) => labels[value] || value;
const date = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');
const utc = (value) => new Date(value).toISOString();
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
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
  return (
    <label className="course-field">
      <span>{title}</span>
      {children}
    </label>
  );
}

function Form({ title, children, submit, busy, button = 'Lưu' }) {
  return (
    <form
      className="course-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget), event.currentTarget);
      }}
    >
      <h3>{title}</h3>
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

export default function StudyCoursesPage({ role = 'Learner' }) {
  const admin = role === 'Admin';
  const mentor = role === 'Mentor';
  const learner = role === 'Learner';
  const Shell = admin ? AdminShell : mentor ? ConsultShell : LearnerShell;

  const [tab, setTab] = useState(learner ? 'cohorts' : 'manage');
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [levels, setLevels] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [myEntitlements, setMyEntitlements] = useState([]);
  const [adminSlots, setAdminSlots] = useState([]);
  const [cohortHomework, setCohortHomework] = useState([]);
  const [skillProfile, setSkillProfile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [plan, setPlan] = useState(blankPlan);
  const [cancelReason, setCancelReason] = useState('');
  const [supportDrafts, setSupportDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [groupPolicy, setGroupPolicy] = useState(null);
  const [completion, setCompletion] = useState(null); // { courseId, data, error }
  const [nowMs, setNowMs] = useState(0);
  const [searchParams] = useSearchParams();
  const [sessionUserId] = useState(() => getSession()?.userId ?? null);
  const purchaseKeys = useRef({});

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
    getCurrentMentorGroupPolicy()
      .then((p) => alive && setGroupPolicy(p || null))
      .catch(() => alive && setGroupPolicy(null));
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
        setCourses(c);
        setPlans(p);
        setLevels(l);
        setCohorts(ch);
        setMentors(m);
        setMyEntitlements(ent);
        setAdminSlots(slots);
        setSelected((cur) => (cur && c.some((x) => x.id === cur) ? cur : c[0]?.id || null));
      })
      .catch((e) => alive && setError(errText(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [admin, learner]);

  useEffect(() => {
    if (!current?.cohortId || admin) return;
    let alive = true;
    getCohortHomework(current.cohortId)
      .then((rows) => alive && setCohortHomework(rows))
      .catch(() => alive && setCohortHomework([]));
    if (mentor && current.learnerId) {
      getMentorLearnerSkillProfile(current.learnerId, current.cohortId)
        .then((prof) => alive && setSkillProfile(prof))
        .catch(() => alive && setSkillProfile(null));
    }
    return () => {
      alive = false;
    };
  }, [current?.id, current?.cohortId, current?.learnerId, admin, mentor]);

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

  // Xác nhận bất đồng bộ: reconcile một lần khi mở trang, sau đó poll + khi quay lại tab.
  useEffect(() => {
    if (!hasAwaitingPayment || reconciledOnMount.current) return;
    reconciledOnMount.current = true;
    const pending = coursesRef.current.filter((c) => c.paymentState === 'AwaitingPayment');
    Promise.all(pending.map((c) => reconcileCoursePayment(c.id).catch(() => null)))
      .then(() => loadRef.current())
      .catch(() => {});
  }, [hasAwaitingPayment]);

  useEffect(() => {
    if (!hasAwaitingPayment) return undefined;
    let count = 0;
    const refresh = () => {
      loadRef.current().catch(() => {});
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

  async function action(fn, message = 'Đã lưu thay đổi.') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await fn();
      await load();
      if (current?.cohortId && !admin) {
        const hw = await getCohortHomework(current.cohortId);
        setCohortHomework(hw);
      }
      setNotice(typeof message === 'function' ? message(result) : message);
    } catch (e) {
      const info = describeApiError(e);
      setError(info.message);
      if (info.code === 'CONCURRENCY_CONFLICT' || info.code === 'COHORT_SCHEDULE_REVISION_CONFLICT' || info.code === 'COHORT_FULL') {
        load().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  const post = (path, body, message) => action(() => coursePost(`/${current.id}${path}`, body), message);
  const changePlan = (key, value) =>
    setPlan((p) => {
      if (key !== 'sessionsPerWeek') return { ...p, [key]: value };
      const match = INTENSITY_OPTIONS.find((o) => o.sessionsPerWeek === Number(value));
      return { ...p, sessionsPerWeek: value, intensity: match ? match.value : 'Custom' };
    });
  const purchase = (p) =>
    action(async () => {
      const key = (purchaseKeys.current[p.id] ||= crypto.randomUUID());
      const result = await coursePost('/purchase', { planId: p.id, idempotencyKey: key });
      setSelected(result.id);
      if (result.checkoutUrl && /^https:\/\//.test(result.checkoutUrl)) window.location.assign(result.checkoutUrl);
    }, 'Đã tạo đơn mua khóa.');

  return (
    <Shell breadcrumb={learner ? 'Lớp học & Khóa JLPT' : mentor ? 'Lớp học & BTVN' : 'Quản lý lớp học & học lại'}>
      <main className="course-page">
        <header>
          <div>
            <h1>{admin ? 'Quản lý Lớp nhóm, Quyền & Khóa JLPT' : mentor ? 'Lớp phụ trách & BTVN' : 'Lớp ôn JLPT & Khóa học của tôi'}</h1>
            <p className="course-meta">Học theo lớp nhóm cố định hoặc 1-1 · Điểm danh, BTVN chung/riêng và hỗ trợ ôn lại JLPT minh bạch.</p>
          </div>
          <button disabled={busy || loading} onClick={() => action(load, 'Đã tải lại dữ liệu.')}>
            Tải lại
          </button>
        </header>

        {learner && (
          <nav className="course-tabs" aria-label="Điều hướng học tập">
            <button type="button" className={`course-tab ${tab === 'cohorts' ? 'active' : ''}`} onClick={() => setTab('cohorts')}>
              Lớp ôn JLPT ({cohorts.length})
            </button>
            <button type="button" className={`course-tab ${tab === 'my-courses' ? 'active' : ''}`} onClick={() => setTab('my-courses')}>
              Lớp đang học của tôi ({courses.length})
            </button>
            <button type="button" className={`course-tab ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>
              Gói dài hạn 1-1 ({plans.filter((p) => p.sessionType === 'Individual').length})
            </button>
          </nav>
        )}

        {error && <p role="alert" className="course-error">{error}</p>}
        {notice && <p role="status" className="course-notice">{notice}</p>}

        {loading ? (
          <p>Đang tải dữ liệu lớp học…</p>
        ) : (
          <>
            {learner && tab === 'cohorts' && (
              <LearnerCohortDiscoveryPanel
                cohorts={cohorts}
                myEntitlements={myEntitlements}
                busy={busy}
                onRun={action}
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
                  <h2>Cấu hình gói khóa học</h2>
                  <Form
                    title={plan.id ? `Sửa gói #${plan.id}` : 'Tạo gói mới'}
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
                    <Field title="Tên gói"><input required maxLength={200} value={plan.name} onChange={(e) => changePlan('name', e.target.value)} /></Field>
                    <Field title="Loại lớp">
                      <select value={plan.sessionType} onChange={(e) => changePlan('sessionType', e.target.value)}>
                        <option value="Group">Lớp nhóm (Group)</option>
                        <option value="Individual">Kèm 1-1 (Individual)</option>
                      </select>
                    </Field>
                    <Field title="Cường độ học">
                      <select value={plan.intensity || 'Custom'} onChange={(e) => applyIntensity(e.target.value)}>
                        {intensityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label} · {o.sessionsPerWeek} buổi/tuần{o.sessionsPerWeek === recommendedSpw ? ' (khuyến nghị)' : ''}
                          </option>
                        ))}
                        <option value="Custom">Tùy chỉnh</option>
                      </select>
                    </Field>
                    <p className="course-meta" style={{ flexBasis: '100%' }}>
                      Khóa {courseWeeks} tuần · {plan.sessionsPerWeek || '—'} buổi/tuần · {plan.totalSessions || '—'} buổi ·{' '}
                      {plan.sessionMinutes || '—'} phút/buổi
                      {plan.totalSessions && plan.sessionMinutes ? ` · tổng ${Math.round((Number(plan.totalSessions) * Number(plan.sessionMinutes)) / 6) / 10} giờ` : ''}
                      {' '}(máy chủ kiểm tra lại theo chính sách hiện hành)
                    </p>
                    <Field title="Sĩ số tối đa">
                      <input type="number" min={1} max={20} value={plan.capacity ?? 1} onChange={(e) => changePlan('capacity', e.target.value)} />
                    </Field>
                    <Field title="Cấp độ JLPT">
                      <select required value={plan.certificateLevelId} onChange={(e) => changePlan('certificateLevelId', e.target.value)}>
                        <option value="">Chọn cấp độ</option>
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
                    <label><input type="checkbox" checked={plan.isPublished} onChange={(e) => changePlan('isPublished', e.target.checked)} /> Mở bán</label>
                  </Form>
                </section>
              </>
            )}

            {(admin || (learner && tab === 'plans')) && (
              <section className="course-box">
                <h2>{admin ? 'Danh sách gói đã cấu hình' : 'Gói dài hạn 1-1 đang mở bán'}</h2>
                <div className="course-grid">
                  {plans
                    .filter((p) => admin || p.sessionType === 'Individual')
                    .map((p) => (
                      <article className="course-box" key={p.id}>
                        <span className="course-badge">{p.sessionType} · {p.level}</span>{' '}
                        {p.intensityLabel && <span className="course-badge">{p.intensityLabel}</span>}{' '}
                        {p.isRecommendedIntensity && <span className="course-badge ok">Khuyến nghị</span>}
                        <h3 style={{ marginTop: 8 }}>{p.name}</h3>
                        <p>
                          {p.durationMonths} tháng · {p.sessionsPerWeek} buổi/tuần · {p.totalSessions ?? '—'} buổi
                          {p.totalTeachingHours != null ? ` · ${p.totalTeachingHours} giờ học` : ''} · sĩ số {p.capacity}
                        </p>
                        <strong>{money(p.price)}</strong>
                        <div style={{ marginTop: 10 }}>
                          {admin ? (
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
                              {p.isPublished ? 'Đang mở' : 'Nháp'} · Sửa
                            </button>
                          ) : (
                            <button disabled={busy} className="course-primary" onClick={() => purchase(p)}>
                              Đăng ký gói 1-1
                            </button>
                          )}
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
                      ? `Hồ sơ ghi danh (${courses.length}) · ${courses.reduce((n, c) => n + c.requests.filter((r) => r.status === 'Pending').length, 0)} yêu cầu JLPT chờ duyệt`
                      : mentor
                        ? `Học viên & lớp phụ trách (${courses.length})`
                        : `Lớp & khóa học của tôi (${courses.length})`}
                  </h2>
                  {courses.length === 0 ? (
                    <p className="course-meta">Bạn chưa tham gia lớp học nào. Chuyển sang tab "Lớp ôn JLPT" để xem lớp đang mở.</p>
                  ) : (
                    <label className="course-field" style={{ maxWidth: 520 }}>
                      <span>Chọn hồ sơ khóa / lớp</span>
                      <select value={current?.id ?? ''} onChange={(e) => setSelected(Number(e.target.value) || null)}>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.id} · {c.name} ({c.level} · {c.sessionType}) · {c.learnerName} · {show(c.status)}
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
                  <>
                    <section className="course-box">
                      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <span className="course-badge">{current.level} · {current.sessionType}</span>{' '}
                          <span className={`course-badge ${current.status === 'Active' ? 'ok' : current.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                            {show(current.status)}
                          </span>
                        </div>
                        <span className="course-meta">
                          {current.cohortId ? `Lớp nhóm #${current.cohortId}` : 'Khóa 1-1'}
                        </span>
                      </div>
                      <h2 style={{ marginTop: 10 }}>#{current.id} · {current.name}</h2>
                      <p className="course-meta">
                        Học viên: <strong>{current.learnerName}</strong> · Mentor: <strong>{current.mentorName || 'Chưa phân công'}</strong>
                      </p>
                      <p className="course-meta">
                        {current.totalSessions} buổi · {current.sessionMinutes} phút/buổi · Bắt đầu: {date(current.startsAt)}
                      </p>

                      {learner && current.paymentState === 'AwaitingPayment' && (
                        <div className="course-notice" role="status">
                          <strong>{paymentStateMessage('AwaitingPayment')}</strong>
                          <p className="course-meta">
                            Chỗ được giữ đến: {date(current.paymentExpiresAt)}. Ghi danh chỉ có hiệu lực sau khi máy chủ xác minh thanh toán với PayOS.
                          </p>
                          <div className="course-buttons">
                            {typeof current.checkoutUrl === 'string' && current.checkoutUrl.startsWith('https://') && (
                              <a className="course-pill-link" href={current.checkoutUrl}>Tiếp tục thanh toán</a>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                action(() => reconcileCoursePayment(current.id), 'Đã kiểm tra lại trạng thái thanh toán với máy chủ.')
                              }
                            >
                              Kiểm tra trạng thái thanh toán
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
                          Đã xác nhận thanh toán{current.paymentConfirmedAtUtc ? ` lúc ${date(current.paymentConfirmedAtUtc)}` : ''}.
                        </p>
                      )}

                      {learner && current.cohortId && current.status === 'Active' && currentStarted && (
                        <p className="course-meta">
                          Khóa học đã bắt đầu nên không thể tự hủy ghi danh. Nếu gặp vấn đề, vui lòng gửi khiếu nại ở mục bên dưới.
                        </p>
                      )}
                      {learner && current.cohortId && current.status === 'Active' && nowMs > 0 && !currentStarted && (
                        <div className="course-form">
                          <div className="course-buttons">
                            <input
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              maxLength={1000}
                              placeholder="Lý do xin rời lớp trước giờ khóa (chỉ hủy cho cá nhân bạn)"
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
                              Hủy ghi danh cá nhân
                            </button>
                          </div>
                        </div>
                      )}

                      {mentor && current.status === 'Transferred' && (
                        <p className="course-notice">Học viên đã chuyển sang lớp khác; buổi đã học và BTVN cũ vẫn được lưu trong hồ sơ này.</p>
                      )}

                      <h3>Tiến độ BTVN & Điều kiện ôn lại</h3>
                      <p>
                        BTVN đạt đúng hạn: <strong>{current.eligibility.passedOnTimeHomework}/{current.eligibility.requiredHomework}</strong> · Vắng: <strong>{current.eligibility.absentSessions}/{current.eligibility.countedSessions}</strong> buổi
                      </p>
                      <p className="course-meta">
                        {current.eligibility.canClaim
                          ? 'Đủ điều kiện nộp minh chứng trượt JLPT chính thức để Admin xem xét hỗ trợ.'
                          : current.eligibility.reasons.join(' ')}
                      </p>

                      {admin && current.status === 'Ready' && !current.cohortId && (
                        <Form
                          title="Phân công Mentor và mở khóa 1-1"
                          busy={busy}
                          button="Mở khóa"
                          submit={(f) => post('/activate', { mentorId: Number(f.get('mentorId')), startsAt: utc(f.get('startsAt')) })}
                        >
                          <Field title="Mentor">
                            <select name="mentorId" required>
                              <option value="">Chọn Mentor</option>
                              {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>)}
                            </select>
                          </Field>
                          <Field title="Bắt đầu"><input type="datetime-local" name="startsAt" required /></Field>
                        </Form>
                      )}

                      {admin && current.status === 'Active' && (
                        <Form
                          title="Chốt hoàn thành khóa"
                          busy={busy}
                          button="Chốt dữ liệu khóa"
                          submit={() => post('/complete', {}, 'Đã chốt hoàn thành khóa học.')}
                        >
                          <label><input type="checkbox" required /> Xác nhận đủ buổi cam kết và hoàn tất kiểm tra.</label>
                        </Form>
                      )}
                    </section>

                    {learner && current.cohortId && (
                      <LearnerCohortTransferPanel key={current.id} course={current} cohorts={cohorts} busy={busy} onRun={action} />
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

                    {mentor && visibleSkillProfile && (
                      <section className="course-box">
                        <h2>Hồ sơ năng lực học viên: {visibleSkillProfile.learnerName}</h2>
                        <p className="course-meta">
                          Phạm vi: {visibleSkillProfile.scopeType} · Trình độ đánh giá: <strong>{visibleSkillProfile.assessedJlptLevel || current.level}</strong> ·
                          BTVN đúng hạn: {visibleSkillProfile.homeworkStats?.onTimeCount ?? 0}/{visibleSkillProfile.homeworkStats?.assignedCount ?? 0}
                          {visibleSkillProfile.homeworkStats?.onTimePercent != null ? ` (${visibleSkillProfile.homeworkStats.onTimePercent}%)` : ''}
                        </p>
                        <div className="course-buttons">
                          {(visibleSkillProfile.skills || []).map((sk) => (
                            <span className="course-badge" key={sk.skill}>
                              {sk.skill}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : 'Chưa có mẫu'}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="course-box">
                      <h2>Lịch buổi học & Phòng học chung</h2>
                      {current.sessions.length === 0 ? (
                        <p className="course-meta">Chưa có buổi học nào.</p>
                      ) : (
                        current.sessions.map((s) => {
                          const roomId = findRoomId(s, currentCohort);
                          return (
                            <article className="course-row" key={s.id}>
                              <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                                <div>
                                  <strong>Buổi {s.number}{s.attempt > 1 ? ` (học bù ${s.attempt - 1})` : ''}</strong> · {date(s.scheduledAt)} ·{' '}
                                  <span className={`course-badge ${s.status === 'Present' ? 'ok' : s.status === 'Scheduled' ? 'warn' : 'muted'}`}>
                                    {show(s.status)}
                                  </span>
                                </div>
                                {roomId && (
                                  <Link className="course-pill-link" to={`/meeting-room/${roomId}`}>
                                    Vào phòng học chung
                                  </Link>
                                )}
                              </div>
                              {s.note && <p className="course-meta">{s.note}</p>}
                              {(admin || mentor) && current.status === 'Active' && s.status === 'Scheduled' && (
                                <Form
                                  title="Điểm danh buổi học"
                                  busy={busy}
                                  submit={(f) => post(`/sessions/${s.id}/attendance`, { status: f.get('status'), note: f.get('note') })}
                                >
                                  <Field title="Trạng thái">
                                    <select name="status">
                                      {['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'].map((x) => (
                                        <option value={x} key={x}>{show(x)}</option>
                                      ))}
                                    </select>
                                  </Field>
                                  <Field title="Ghi chú điểm danh"><input required name="note" maxLength={1000} /></Field>
                                </Form>
                              )}
                            </article>
                          );
                        })
                      )}
                    </section>

                    {!admin && current.cohortId && (
                      <CohortHomeworkPanel
                        cohortId={current.cohortId}
                        coursesInCohort={cohortCourses}
                        items={visibleCohortHomework}
                        role={role}
                        busy={busy}
                        onRun={action}
                      />
                    )}

                    <section className="course-box">
                      <h2>Hỗ trợ ôn lại khi trượt JLPT chính thức</h2>
                      <p className="course-meta">
                        Admin duyệt minh chứng & chính sách BTVN. Sau khi Admin duyệt, Mentor lập kế hoạch hỗ trợ ôn lại (không tự cấp buổi học miễn phí).
                      </p>
                      {learner && current.status === 'Completed' && !current.requests.some((r) => r.status === 'Pending') && (
                        <Form
                          title="Gửi yêu cầu hỗ trợ & minh chứng trượt JLPT chính thức"
                          busy={busy}
                          button="Gửi Admin xét duyệt"
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
                          <Field title="Ngày thi JLPT"><input name="examDate" type="date" required /></Field>
                          <Field title="Ngày công bố kết quả"><input name="resultPublishedAt" type="date" required /></Field>
                          <Field title="Lý do / Tường trình kết quả thi (bắt buộc với lớp nhóm)">
                            <textarea name="reason" required maxLength={1000} placeholder="Nêu rõ điểm các kỹ năng hoặc phần cần Mentor hỗ trợ ôn lại..." />
                          </Field>
                          <Field title="Minh chứng chính thức (PDF/PNG/JPG ≤ 10 MB)">
                            <input name="evidence" type="file" accept="application/pdf,image/png,image/jpeg" />
                          </Field>
                        </Form>
                      )}

                      {current.requests.length === 0 ? (
                        <p className="course-meta" style={{ marginTop: 10 }}>Chưa có yêu cầu hỗ trợ JLPT nào.</p>
                      ) : (
                        current.requests.map((r) => (
                          <article className="course-row" key={r.id}>
                            <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                              <h3>Yêu cầu #{r.id} · {show(r.status)}</h3>
                              <span className="course-meta">Thi: {date(r.examDate)} · Công bố: {date(r.resultPublishedAt)}</span>
                            </div>
                            {r.reason && <p className="course-pre"><strong>Lý do học viên:</strong> {r.reason}</p>}
                            {r.response && <p className="course-pre"><strong>Quyết định của Admin:</strong> {r.response}</p>}
                            {r.mentorSupportPlan && (
                              <div className="course-notice" style={{ marginTop: 8 }}>
                                <strong>Lộ trình hỗ trợ từ Mentor ({date(r.mentorSupportPlanAtUtc)}):</strong>
                                <p className="course-pre">{r.mentorSupportPlan}</p>
                              </div>
                            )}
                            {(admin || learner) && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => action(() => openRetakeEvidence(current.id, r.id), 'Đã tải minh chứng riêng tư.')}
                              >
                                Tải minh chứng riêng tư
                              </button>
                            )}
                            {admin && r.status === 'Pending' && (
                              <Form
                                title="Quyết định của Admin"
                                busy={busy}
                                button="Xác nhận"
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
                                <Field title="Quyết định">
                                  <select name="decision">
                                    <option value="reject">Từ chối</option>
                                    <option value="approve" disabled={!current.eligibility.canClaim}>Duyệt hỗ trợ ôn lại</option>
                                  </select>
                                </Field>
                                {current.sessionType === 'Group' && (
                                  <Field title="Lớp nhóm kế tiếp (nếu duyệt)">
                                    <select name="nextCohortId">
                                      <option value="">Chọn lớp kế tiếp</option>
                                      {cohorts.filter((x) => x.id !== current.cohortId).map((x) => (
                                        <option key={x.id} value={x.id}>{x.name} ({x.level})</option>
                                      ))}
                                    </select>
                                  </Field>
                                )}
                                <label><input type="checkbox" name="verified" /> Đã xác minh minh chứng trượt JLPT chính thức</label>
                                <Field title="Lý do quyết định"><textarea name="response" required maxLength={2000} /></Field>
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
                                <h3>Lộ trình hỗ trợ ôn lại JLPT của Mentor</h3>
                                <fieldset disabled={busy}>
                                  <Field title="Kế hoạch ôn luyện (chỉ mở sau khi Admin đã duyệt)">
                                    <textarea
                                      required
                                      maxLength={2000}
                                      value={supportDrafts[r.id] ?? r.mentorSupportPlan ?? ''}
                                      onChange={(e) => setSupportDrafts((cur) => ({ ...cur, [r.id]: e.target.value }))}
                                    />
                                  </Field>
                                  <button className="course-primary" type="submit" disabled={busy}>
                                    Lưu lộ trình hỗ trợ
                                  </button>
                                </fieldset>
                              </form>
                            )}
                          </article>
                        ))
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
