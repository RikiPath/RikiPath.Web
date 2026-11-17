import { backendUtcDate, vietnamInputValue } from '../utils/mentorSchedule';
import { useEffect, useRef, useState } from 'react';
import { AdminShell, ConsultShell, LearnerShell } from '../components/shells';
import { courseGet, coursePost, saveCoursePlan, uploadRetakeEvidence, openRetakeEvidence } from '../api/studyCourses';
import './studyCourses.css';
import CourseBookingPanel from '../components/consultation/CourseBookingPanel';
import JlptExamDrafts from '../components/consultation/JlptExamDrafts';
import CourseChangeRequests from '../components/consultation/CourseChangeRequests';

const labels = { PaymentReview: 'Cần Admin đối soát thanh toán', Cancelled: 'Đã hủy', PendingPayment: 'Chờ thanh toán', Ready: 'Chờ Admin mở khóa', Active: 'Đang học', Completed: 'Đã chốt khóa', PaymentFailed: 'Thanh toán không thành công', Scheduled: 'Chờ học', Present: 'Có mặt', Absent: 'Vắng', ExcusedAbsent: 'Vắng có phép', CancelledByMentor: 'Mentor hủy', Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối' };
const show = value => labels[value] || value;
const date = value => value ? backendUtcDate(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const utc = value => new Date(value).toISOString();
const money = value => Number(value).toLocaleString('vi-VN') + ' ₫';
const blankPlan = { name: '', certificateLevelId: '', durationMonths: 3, sessionsPerWeek: 3, sessionMinutes: '', totalSessions: '', retakeClaimDays: '', price: '', isPublished: false, revision: 1, sessionType: 'Individual', capacity: 1, targetExamDate: '' };
function Field({ title, children }) { return <label className="course-field"><span>{title}</span>{children}</label>; }
function Form({ title, children, submit, busy, button = 'Lưu' }) {
  return <form className="course-form" onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget), event.currentTarget); }}><h3>{title}</h3><fieldset disabled={busy}>{children}<button className="course-primary" type="submit">{button}</button></fieldset></form>;
}

export default function StudyCoursesPage({ role = 'Learner' }) {
  const admin = role === 'Admin', mentor = role === 'Mentor', learner = role === 'Learner';
  const Shell = admin ? AdminShell : mentor ? ConsultShell : LearnerShell;
  const [courses, setCourses] = useState([]), [plans, setPlans] = useState([]), [levels, setLevels] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [selected, setSelected] = useState(null), [plan, setPlan] = useState(blankPlan);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const purchaseKeys = useRef({});
  const current = courses.find(c => c.id === selected);
  async function load() {
    const [c, p, l, m] = await Promise.all([courseGet(), courseGet('/plans'), courseGet('/catalog'), admin ? courseGet('/mentors') : Promise.resolve([])]);
    setCourses(c); setPlans(p); setLevels(l); setMentors(m);
  }
  useEffect(() => {
    let alive = true;
    Promise.all([courseGet(), courseGet('/plans'), courseGet('/catalog'), admin ? courseGet('/mentors') : Promise.resolve([])]).then(([c, p, l, m]) => {
      if (alive) { setCourses(c); setPlans(p); setLevels(l); setMentors(m); }
    }).catch(e => alive && setError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [admin]);
  async function action(fn, message = 'Đã lưu thay đổi.') {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await fn(); await load(); setNotice(message); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const post = (path, body, message) => action(() => coursePost(`/${current.id}${path}`, body), message);
  const changePlan = (key, value) => setPlan(p => ({ ...p, [key]: value }));
  const purchase = p => action(async () => {
    const key = purchaseKeys.current[p.id] ||= crypto.randomUUID();
    const result = await coursePost('/purchase', { planId: p.id, idempotencyKey: key });
    setSelected(result.id);
    if (result.checkoutUrl && /^https:\/\//.test(result.checkoutUrl)) window.location.assign(result.checkoutUrl);
  }, 'Đã tạo đơn mua khóa.');
  return <Shell breadcrumb="Khóa học"><main className="course-page">
    <header><div><h1>{admin ? 'Quản lý gói học và lớp' : mentor ? 'Khóa học phụ trách' : 'Khóa học của tôi'}</h1><p>Học 1–1 đặt lịch linh hoạt · Lớp nhóm theo lịch cố định.</p></div><button disabled={busy || loading} onClick={() => action(load, 'Đã tải lại dữ liệu.')}>Tải lại</button></header>
    {error && <p role="alert" className="course-error">{error}</p>}{notice && <p role="status" className="course-notice">{notice}</p>}
    <aside className="course-policy">Học lại miễn phí một gói tương đương cùng cấp độ ở đợt kế tiếp khi trượt JLPT và có ít nhất 90% BTVN nộp đúng hạn. Admin kiểm tra minh chứng và duyệt yêu cầu; không xét tỷ lệ nghỉ. BTVN cá nhân sẽ được bổ sung sau.</aside>
    {loading ? <p>Đang tải khóa học…</p> : <>
      {admin && <section className="course-box"><h2>Cấu hình gói dài hạn</h2><p>Giữ nháp khi chưa chốt thời lượng, tổng buổi hoặc giá. Hạn yêu cầu học lại để trống nghĩa là chưa giới hạn.</p>
        <div className="course-buttons"><button onClick={() => setPlan({ ...blankPlan })}>Gói mới: 3 tháng · 3 buổi/tuần</button><button onClick={() => setPlan({ ...blankPlan, durationMonths: 5, sessionsPerWeek: 2 })}>Gói mới: 5 tháng · 2 buổi/tuần</button></div>
        <Form title={plan.id ? `Sửa gói #${plan.id}` : 'Gói mới'} busy={busy} submit={() => action(async () => {
          await saveCoursePlan({ ...plan, certificateLevelId: Number(plan.certificateLevelId), durationMonths: Number(plan.durationMonths), sessionsPerWeek: Number(plan.sessionsPerWeek), sessionMinutes: plan.sessionMinutes === '' ? null : Number(plan.sessionMinutes), totalSessions: plan.totalSessions === '' ? null : Number(plan.totalSessions), retakeClaimDays: plan.retakeClaimDays === '' ? null : Number(plan.retakeClaimDays), price: Number(plan.price || 0), capacity: plan.sessionType === 'Group' ? Number(plan.capacity) : 1, targetExamDate: plan.targetExamDate ? utc(plan.targetExamDate) : null }); setPlan({ ...blankPlan });
        })}>
          <Field title="Hình thức"><select value={plan.sessionType || 'Individual'} onChange={e => changePlan('sessionType', e.target.value)}><option value="Individual">1–1: mua gói rồi đặt dần</option><option value="Group">1–N: lớp theo lịch cố định</option></select></Field>
          {plan.sessionType === 'Group' && <Field title="Sĩ số tối đa"><input type="number" min="2" max="100" required value={plan.capacity} onChange={e => changePlan('capacity', e.target.value)} /></Field>}
          <Field title="Ngày thi JLPT mục tiêu"><input type="datetime-local" value={(plan.targetExamDate || '').slice(0, 16)} onChange={e => changePlan('targetExamDate', e.target.value)} /></Field>
          <Field title="Tên gói"><input required maxLength={200} value={plan.name} onChange={e => changePlan('name', e.target.value)} /></Field>
          <Field title="Cấp độ từ danh mục"><select required value={plan.certificateLevelId} onChange={e => changePlan('certificateLevelId', e.target.value)}><option value="">Chọn cấp độ</option>{levels.map(l => <option key={l.id} value={l.id}>{l.certificateType} · {l.code}</option>)}</select></Field>
          {[['durationMonths', 'Số tháng', 1, 36], ['sessionsPerWeek', 'Buổi/tuần', 1, 7], ['sessionMinutes', 'Phút/buổi (chưa chốt: để trống)', 15, 240], ['totalSessions', 'Tổng buổi cam kết (chưa chốt: để trống)', 1, 500], ['retakeClaimDays', 'Hạn gửi yêu cầu từ ngày công bố kết quả (ngày)', 1, 730], ['price', 'Giá VND', 0, 2147483647]].map(([key, title, min, max]) => <Field key={key} title={title}><input type="number" min={min} max={max} step="1" required={key === 'durationMonths' || key === 'sessionsPerWeek'} value={plan[key] ?? ''} onChange={e => changePlan(key, e.target.value)} /></Field>)}
          <label><input type="checkbox" checked={plan.isPublished} onChange={e => changePlan('isPublished', e.target.checked)} /> Mở bán (phải đủ thông số)</label>
        </Form>
      </section>}
      {(admin || learner) && <section><h2>{admin ? 'Các gói đã tạo' : 'Gói đang mở bán'}</h2><div className="course-grid">{plans.map(p => <article className="course-box" key={p.id}><h3>{p.name} · {p.level}</h3><p>{p.sessionType === 'Group' ? `Lớp nhóm · tối đa ${p.capacity} học viên` : 'Học 1–1 · tự đặt lịch'}</p><p>{p.durationMonths} tháng · {p.sessionsPerWeek} buổi/tuần</p><p>{p.sessionMinutes ? `${p.sessionMinutes} phút/buổi` : 'Chưa chốt thời lượng'} · {p.totalSessions ?? 'Chưa chốt'} buổi</p><strong>{money(p.price)}</strong><p>{p.retakeClaimDays ? `Gửi yêu cầu trong ${p.retakeClaimDays} ngày từ ngày công bố kết quả` : 'Hạn yêu cầu học lại: chưa giới hạn'}</p>{admin ? <button disabled={busy} onClick={() => setPlan({ ...p, targetExamDate: p.targetExamDate ? vietnamInputValue(p.targetExamDate) : '', sessionMinutes: p.sessionMinutes ?? '', totalSessions: p.totalSessions ?? '', retakeClaimDays: p.retakeClaimDays ?? '' })}>{p.isPublished ? 'Đang mở bán' : 'Bản nháp'} · Sửa</button> : p.sessionType === 'Group' ? <p>Chọn lớp đang mở bên dưới để đăng ký.</p> : <button disabled={busy} className="course-primary" onClick={() => purchase(p)}>Mua gói 1–1</button>}</article>)}</div>{plans.length === 0 && <p>Chưa có gói phù hợp để hiển thị.</p>}</section>}
      {admin && <JlptExamDrafts />}
      <CourseBookingPanel role={role} plans={plans} mentors={mentors} current={current} refresh={load} />
      <section className="course-box"><h2>{admin ? `Khóa đã đăng ký (${courses.length}) · ${courses.reduce((n, c) => n + c.requests.filter(r => r.status === 'Pending').length, 0)} yêu cầu học lại chờ duyệt` : 'Danh sách khóa học'}</h2>
        <label>Chọn khóa <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value) || null)}><option value="">Chọn khóa để xem chi tiết</option>{courses.map(c => <option key={c.id} value={c.id}>#{c.id} · {c.name} · {c.learnerName} · {show(c.status)}</option>)}</select></label>
        {courses.length === 0 && <p>Chưa có khóa học.</p>}
      </section>
      {current && <>
        <section className="course-box"><h2>#{current.id} · {current.name} · {current.level}</h2><p>{show(current.status)} · {current.retakeOfId ? `Học lại miễn phí của khóa #${current.retakeOfId}` : money(current.amount)}</p><p>Học viên: {current.learnerName} · Mentor: {current.mentorName || 'Chưa phân công'}</p><p>{current.totalSessions} buổi · {current.sessionMinutes} phút/buổi · {current.sessionsPerWeek} buổi/tuần · {date(current.startsAt)} → {date(current.endsAt)}</p>
          {learner && current.status === 'PendingPayment' && current.checkoutUrl && backendUtcDate(current.paymentExpiresAt) > new Date() && <a className="course-primary" href={current.checkoutUrl}>Tiếp tục thanh toán</a>}
          <h3>Điều kiện học lại</h3><p>BTVN chưa triển khai trong đợt này. Admin kiểm tra minh chứng nộp đúng hạn khi duyệt học lại.</p><p>{current.eligibility.canClaim ? 'Đủ điều kiện gửi minh chứng JLPT để Admin xét duyệt.' : current.eligibility.reasons.join(' ')}</p>
          {admin && current.status === 'Ready' && !current.cohortId && <Form title="Phân công Mentor và mở khóa" busy={busy} button="Mở khóa" submit={f => post('/activate', { mentorId: Number(f.get('mentorId')), startsAt: utc(f.get('startsAt')) })}><Field title="Mentor do Admin xét chọn"><select name="mentorId" required><option value="">Chọn Mentor</option>{mentors.map(m => <option key={m.id} value={m.id}>{m.name} · #{m.id}</option>)}</select></Field><Field title="Bắt đầu (giờ địa phương)"><input type="datetime-local" name="startsAt" required /></Field></Form>}
          {admin && current.status === 'Active' && <Form title="Chốt hoàn thành khóa" busy={busy} button="Chốt dữ liệu khóa" submit={() => post('/complete', {}, 'Đã chốt khóa. BTVN và điểm danh được khóa để xét học lại.')}><p>Chỉ chốt khi đủ buổi và đã xác nhận thực tế. Không tự động hoàn thành theo thời gian, không tính lương.</p><label><input type="checkbox" required /> Tôi đã kiểm tra dữ liệu khóa.</label></Form>}
        </section>
        <section className="course-box"><h2>Lịch học và điểm danh</h2>
          {admin && current.status === 'Active' && !current.cohortId && <Form title="Đặt lịch / học bù" busy={busy} button="Thêm lịch" submit={f => post('/sessions', { number: Number(f.get('number')), scheduledAt: utc(f.get('scheduledAt')), meetingUrl: f.get('meetingUrl') || null })}><Field title={`Buổi gốc số (1–${current.totalSessions}); học bù dùng cùng số`}><input name="number" type="number" required min="1" max={current.totalSessions} /></Field><Field title="Thời gian (giờ địa phương)"><input name="scheduledAt" type="datetime-local" required /></Field><Field title="Link học HTTPS"><input name="meetingUrl" type="url" placeholder="https://…" /></Field></Form>}
          {current.sessions.length === 0 && <p>Chưa có lịch học.</p>}{current.sessions.map(s => <article className="course-row" key={s.id}><h3>Buổi {s.number}{s.attempt > 1 ? ` · học bù lần ${s.attempt - 1}` : ''} · {date(s.scheduledAt)}</h3><p>{show(s.status)} · {s.note}</p>{s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noreferrer">Mở phòng học</a>}
            {(admin || mentor) && current.status === 'Active' && s.status === 'Scheduled' && <Form title="Xác nhận buổi học" busy={busy} submit={f => post(`/sessions/${s.id}/attendance`, { status: f.get('status'), note: f.get('note') })}><Field title="Trạng thái"><select name="status">{['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'].map(x => <option value={x} key={x}>{show(x)}</option>)}</select></Field><Field title="Ghi chú xác nhận"><input required name="note" maxLength={1000} /></Field></Form>}</article>)}
        </section>
        <CourseChangeRequests admin={admin} current={current} refresh={load} />
        <section className="course-box"><h2>Bài tập về nhà</h2><p>Sẽ bổ sung sau theo yêu cầu của nhóm.</p></section>
        <section className="course-box"><h2>Yêu cầu học lại miễn phí</h2>
          {learner && current.status === 'Completed' && current.paymentStatus === 'Paid' && !current.retakeOfId && !current.requests.some(r => r.status === 'Pending') && <Form title="Gửi minh chứng trượt JLPT chính thức" busy={busy} button="Gửi Admin xét duyệt" submit={f => action(() => { const form = new FormData(); form.append('examDate', utc(f.get('examDate'))); form.append('resultPublishedAt', utc(f.get('resultPublishedAt'))); form.append('evidence', f.get('evidence')); return uploadRetakeEvidence(current.id, form); })}><Field title="Ngày thi"><input name="examDate" type="date" required /></Field><Field title="Ngày công bố kết quả"><input name="resultPublishedAt" type="date" required /></Field><Field title="PDF / PNG / JPG, tối đa 10 MB"><input name="evidence" type="file" required accept="application/pdf,image/png,image/jpeg" /></Field></Form>}
          {current.requests.length === 0 && <p>Chưa có yêu cầu.</p>}{current.requests.map(r => <article className="course-row" key={r.id}><h3>Yêu cầu #{r.id} · {show(r.status)}</h3><p>Ngày thi: {date(r.examDate)} · Công bố: {date(r.resultPublishedAt)}</p><p>{r.response}</p>{(admin || learner) && <button disabled={busy} onClick={() => action(() => openRetakeEvidence(current.id, r.id), 'Đã tải minh chứng.')}>Tải minh chứng riêng tư</button>}
            {admin && r.status === 'Pending' && <Form title="Quyết định của Admin" busy={busy} button="Xác nhận quyết định" submit={f => post(`/retake/${r.id}/review`, { approve: f.get('decision') === 'approve', officialFailureVerified: f.get('verified') === 'on', onTimeHomeworkEvidenceVerified: f.get('homeworkVerified') === 'on', cohortId: f.get('cohortId') ? Number(f.get('cohortId')) : null, response: f.get('response') })}><Field title="Quyết định"><select name="decision"><option value="reject">Từ chối</option><option value="approve">Duyệt 1 khóa học lại miễn phí</option></select></Field><label><input type="checkbox" name="verified" /> Đã đối chiếu JLPT chính thức: danh tính, cấp độ, kết quả trượt và ngày công bố.</label><label><input type="checkbox" name="homeworkVerified" /> Đã đối chiếu minh chứng ít nhất 90% BTVN nộp đúng hạn.</label>{current.sessionType === 'Group' && <Field title="Mã lớp nhóm đợt kế tiếp (cùng cấp độ, đủ số buổi/thời lượng)"><input type="number" name="cohortId" min="1" /></Field>}<Field title="Lý do"><textarea name="response" required maxLength={2000} /></Field></Form>}</article>)}
        </section>
        <details className="course-box"><summary>Lịch sử xử lý</summary>{current.audit.map((a, i) => <p key={i}>{date(a.at)} · Người xử lý #{a.actorId} · {a.detail}</p>)}</details>
      </>}
    </>}
  </main></Shell>;
}
