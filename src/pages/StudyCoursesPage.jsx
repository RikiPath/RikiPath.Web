import { useEffect, useRef, useState } from 'react';
import { AdminShell, ConsultShell, LearnerShell } from '../components/shells';
import { courseGet, coursePost, saveCoursePlan, uploadRetakeEvidence, openRetakeEvidence } from '../api/studyCourses';
import './studyCourses.css';

const labels = { PendingPayment: 'Chờ thanh toán', Ready: 'Chờ Admin mở khóa', Active: 'Đang học', Completed: 'Đã chốt khóa', PaymentFailed: 'Thanh toán không thành công', Scheduled: 'Chờ học', Present: 'Có mặt', Absent: 'Vắng', ExcusedAbsent: 'Vắng có phép', CancelledByMentor: 'Mentor hủy', Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối' };
const show = value => labels[value] || value;
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
const utc = value => new Date(value).toISOString();
const money = value => Number(value).toLocaleString('vi-VN') + ' ₫';
const blankPlan = { name: '', certificateLevelId: '', durationMonths: 3, sessionsPerWeek: 3, sessionMinutes: '', totalSessions: '', retakeClaimDays: '', price: '', isPublished: false, revision: 1 };
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
  return <Shell breadcrumb="Khóa học 1–1"><main className="course-page">
    <header><div><h1>{admin ? 'Quản lý khóa học 1–1' : mentor ? 'Khóa học phụ trách' : 'Khóa học của tôi'}</h1><p>Học cùng một Mentor · Lịch học, BTVN và quyền học lại rõ ràng.</p></div><button disabled={busy || loading} onClick={() => action(load, 'Đã tải lại dữ liệu.')}>Tải lại</button></header>
    {error && <p role="alert" className="course-error">{error}</p>}{notice && <p role="status" className="course-notice">{notice}</p>}
    <aside className="course-policy">Học lại miễn phí tối đa 1 lần cho khóa đã mua: ít nhất 90% BTVN bắt buộc được Mentor xác nhận đạt và nộp đúng hạn; nghỉ không quá 20%; trượt JLPT chính thức và được Admin duyệt minh chứng. Nghỉ có phép vẫn tính vắng; Mentor hủy không tính; học bù đã xác nhận không đếm trùng. Khóa miễn phí không phát sinh quyền học lại tiếp.</aside>
    {loading ? <p>Đang tải khóa học…</p> : <>
      {admin && <section className="course-box"><h2>Cấu hình gói dài hạn</h2><p>Giữ nháp khi chưa chốt thời lượng, tổng buổi hoặc giá. Hạn yêu cầu học lại để trống nghĩa là chưa giới hạn.</p>
        <div className="course-buttons"><button onClick={() => setPlan({ ...blankPlan })}>Gói mới: 3 tháng · 3 buổi/tuần</button><button onClick={() => setPlan({ ...blankPlan, durationMonths: 5, sessionsPerWeek: 2 })}>Gói mới: 5 tháng · 2 buổi/tuần</button></div>
        <Form title={plan.id ? `Sửa gói #${plan.id}` : 'Gói mới'} busy={busy} submit={() => action(async () => {
          await saveCoursePlan({ ...plan, certificateLevelId: Number(plan.certificateLevelId), durationMonths: Number(plan.durationMonths), sessionsPerWeek: Number(plan.sessionsPerWeek), sessionMinutes: plan.sessionMinutes === '' ? null : Number(plan.sessionMinutes), totalSessions: plan.totalSessions === '' ? null : Number(plan.totalSessions), retakeClaimDays: plan.retakeClaimDays === '' ? null : Number(plan.retakeClaimDays), price: Number(plan.price || 0) }); setPlan({ ...blankPlan });
        })}>
          <Field title="Tên gói"><input required maxLength={200} value={plan.name} onChange={e => changePlan('name', e.target.value)} /></Field>
          <Field title="Cấp độ từ danh mục"><select required value={plan.certificateLevelId} onChange={e => changePlan('certificateLevelId', e.target.value)}><option value="">Chọn cấp độ</option>{levels.map(l => <option key={l.id} value={l.id}>{l.certificateType} · {l.code}</option>)}</select></Field>
          {[['durationMonths', 'Số tháng', 1, 36], ['sessionsPerWeek', 'Buổi/tuần', 1, 7], ['sessionMinutes', 'Phút/buổi (chưa chốt: để trống)', 15, 240], ['totalSessions', 'Tổng buổi cam kết (chưa chốt: để trống)', 1, 500], ['retakeClaimDays', 'Hạn gửi yêu cầu từ ngày công bố kết quả (ngày)', 1, 730], ['price', 'Giá VND', 0, 2147483647]].map(([key, title, min, max]) => <Field key={key} title={title}><input type="number" min={min} max={max} step="1" required={key === 'durationMonths' || key === 'sessionsPerWeek'} value={plan[key] ?? ''} onChange={e => changePlan(key, e.target.value)} /></Field>)}
          <label><input type="checkbox" checked={plan.isPublished} onChange={e => changePlan('isPublished', e.target.checked)} /> Mở bán (phải đủ thông số)</label>
        </Form>
      </section>}
      {(admin || learner) && <section><h2>{admin ? 'Các gói đã tạo' : 'Gói đang mở bán'}</h2><div className="course-grid">{plans.map(p => <article className="course-box" key={p.id}><h3>{p.name} · {p.level}</h3><p>{p.durationMonths} tháng · {p.sessionsPerWeek} buổi/tuần</p><p>{p.sessionMinutes ? `${p.sessionMinutes} phút/buổi` : 'Chưa chốt thời lượng'} · {p.totalSessions ?? 'Chưa chốt'} buổi</p><strong>{money(p.price)}</strong><p>{p.retakeClaimDays ? `Gửi yêu cầu trong ${p.retakeClaimDays} ngày từ ngày công bố kết quả` : 'Hạn yêu cầu học lại: chưa giới hạn'}</p>{admin ? <button disabled={busy} onClick={() => setPlan({ ...p, sessionMinutes: p.sessionMinutes ?? '', totalSessions: p.totalSessions ?? '', retakeClaimDays: p.retakeClaimDays ?? '' })}>{p.isPublished ? 'Đang mở bán' : 'Bản nháp'} · Sửa</button> : <button disabled={busy} className="course-primary" onClick={() => purchase(p)}>Đăng ký và thanh toán</button>}</article>)}</div>{plans.length === 0 && <p>Chưa có gói phù hợp để hiển thị.</p>}</section>}
      <section className="course-box"><h2>{admin ? `Khóa đã đăng ký (${courses.length}) · ${courses.reduce((n, c) => n + c.requests.filter(r => r.status === 'Pending').length, 0)} yêu cầu học lại chờ duyệt` : 'Danh sách khóa học'}</h2>
        <label>Chọn khóa <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value) || null)}><option value="">Chọn khóa để xem chi tiết</option>{courses.map(c => <option key={c.id} value={c.id}>#{c.id} · {c.name} · {c.learnerName} · {show(c.status)}</option>)}</select></label>
        {courses.length === 0 && <p>Chưa có khóa học.</p>}
      </section>
      {current && <>
        <section className="course-box"><h2>#{current.id} · {current.name} · {current.level}</h2><p>{show(current.status)} · {current.retakeOfId ? `Học lại miễn phí của khóa #${current.retakeOfId}` : money(current.amount)}</p><p>Học viên: {current.learnerName} · Mentor: {current.mentorName || 'Chưa phân công'}</p><p>{current.totalSessions} buổi · {current.sessionMinutes} phút/buổi · {current.sessionsPerWeek} buổi/tuần · {date(current.startsAt)} → {date(current.endsAt)}</p>
          {learner && current.status === 'PendingPayment' && current.checkoutUrl && new Date(current.paymentExpiresAt) > new Date() && <a className="course-primary" href={current.checkoutUrl}>Tiếp tục thanh toán</a>}
          <h3>Điều kiện học lại</h3><p>BTVN đạt đúng hạn: {current.eligibility.passedOnTimeHomework}/{current.eligibility.requiredHomework} · Vắng: {current.eligibility.absentSessions}/{current.eligibility.countedSessions} buổi được tính</p><p>{current.eligibility.canClaim ? 'Đủ điều kiện gửi minh chứng JLPT để Admin xét duyệt.' : current.eligibility.reasons.join(' ')}</p>
          {admin && current.status === 'Ready' && <Form title="Phân công Mentor và mở khóa" busy={busy} button="Mở khóa" submit={f => post('/activate', { mentorId: Number(f.get('mentorId')), startsAt: utc(f.get('startsAt')) })}><Field title="Mentor do Admin xét chọn"><select name="mentorId" required><option value="">Chọn Mentor</option>{mentors.map(m => <option key={m.id} value={m.id}>{m.name} · #{m.id}</option>)}</select></Field><Field title="Bắt đầu (giờ địa phương)"><input type="datetime-local" name="startsAt" required /></Field></Form>}
          {admin && current.status === 'Active' && <Form title="Chốt hoàn thành khóa" busy={busy} button="Chốt dữ liệu khóa" submit={() => post('/complete', {}, 'Đã chốt khóa. BTVN và điểm danh được khóa để xét học lại.')}><p>Chỉ chốt khi đủ buổi, không còn lịch chờ học và BTVN đã hết hạn, chấm xong. Sau khi chốt sẽ không thể sửa BTVN hoặc điểm danh.</p><label><input type="checkbox" required /> Tôi đã kiểm tra dữ liệu khóa.</label></Form>}
        </section>
        <section className="course-box"><h2>Lịch học và điểm danh</h2>
          {admin && current.status === 'Active' && <Form title="Đặt lịch / học bù" busy={busy} button="Thêm lịch" submit={f => post('/sessions', { number: Number(f.get('number')), scheduledAt: utc(f.get('scheduledAt')), meetingUrl: f.get('meetingUrl') || null })}><Field title={`Buổi gốc số (1–${current.totalSessions}); học bù dùng cùng số`}><input name="number" type="number" required min="1" max={current.totalSessions} /></Field><Field title="Thời gian (giờ địa phương)"><input name="scheduledAt" type="datetime-local" required /></Field><Field title="Link học HTTPS"><input name="meetingUrl" type="url" placeholder="https://…" /></Field></Form>}
          {current.sessions.length === 0 && <p>Chưa có lịch học.</p>}{current.sessions.map(s => <article className="course-row" key={s.id}><h3>Buổi {s.number}{s.attempt > 1 ? ` · học bù lần ${s.attempt - 1}` : ''} · {date(s.scheduledAt)}</h3><p>{show(s.status)} · {s.note}</p>{s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noreferrer">Mở phòng học</a>}
            {(admin || mentor) && current.status === 'Active' && s.status === 'Scheduled' && <Form title="Xác nhận buổi học" busy={busy} submit={f => post(`/sessions/${s.id}/attendance`, { status: f.get('status'), note: f.get('note') })}><Field title="Trạng thái"><select name="status">{['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'].map(x => <option value={x} key={x}>{show(x)}</option>)}</select></Field><Field title="Ghi chú xác nhận"><input required name="note" maxLength={1000} /></Field></Form>}</article>)}
        </section>
        <section className="course-box"><h2>Bài tập về nhà</h2>
          {mentor && current.status === 'Active' && <Form title="Giao BTVN" busy={busy} button="Giao bài" submit={f => post('/homework', { title: f.get('title'), instructions: f.get('instructions'), required: f.get('required') === 'on', dueAt: utc(f.get('dueAt')) })}><Field title="Tên bài"><input name="title" required maxLength={200} /></Field><Field title="Yêu cầu"><textarea name="instructions" maxLength={10000} required /></Field><Field title="Hạn nộp (giờ địa phương)"><input name="dueAt" type="datetime-local" required /></Field><label><input name="required" type="checkbox" defaultChecked /> Bắt buộc</label></Form>}
          {current.homework.length === 0 && <p>Chưa có BTVN. Chưa đủ cơ sở xét điều kiện 90%.</p>}{current.homework.map(h => <article className="course-row" key={h.id}><h3>{h.title} · {h.required ? 'Bắt buộc' : 'Tự chọn'}</h3><p className="course-pre">{h.instructions}</p><p>Hạn: {date(h.dueAt)} · Nộp: {date(h.submittedAt)} {h.submittedAt && new Date(h.submittedAt) > new Date(h.dueAt) ? '· Nộp trễ' : ''}</p><p>Kết quả: {h.passed === true ? 'Đạt' : h.passed === false ? 'Chưa đạt' : 'Chưa xác nhận'} · {h.feedback}</p>{h.submission && <details><summary>Xem bài nộp</summary><p className="course-pre">{h.submission}</p></details>}
            {learner && current.status === 'Active' && h.passed !== true && <Form title={h.submission ? 'Nộp lại (thay thời điểm nộp)' : 'Nộp bài'} busy={busy} button="Nộp bài" submit={f => post(`/homework/${h.id}/submit`, { content: f.get('content') })}><Field title="Nội dung bài làm"><textarea required name="content" maxLength={20000} defaultValue={h.submission || ''} /></Field></Form>}
            {mentor && current.status === 'Active' && h.submittedAt && <Form title="Nhận xét của Mentor" busy={busy} submit={f => post(`/homework/${h.id}/grade`, { passed: f.get('passed') === 'true', feedback: f.get('feedback') })}><Field title="Kết quả"><select name="passed"><option value="true">Đạt</option><option value="false">Chưa đạt</option></select></Field><Field title="Nhận xét"><textarea name="feedback" required maxLength={2000} defaultValue={h.feedback || ''} /></Field></Form>}</article>)}
        </section>
        <section className="course-box"><h2>Yêu cầu học lại miễn phí</h2>
          {learner && current.eligibility.canClaim && !current.requests.some(r => r.status === 'Pending') && <Form title="Gửi minh chứng trượt JLPT chính thức" busy={busy} button="Gửi Admin xét duyệt" submit={f => action(() => { const form = new FormData(); form.append('examDate', utc(f.get('examDate'))); form.append('resultPublishedAt', utc(f.get('resultPublishedAt'))); form.append('evidence', f.get('evidence')); return uploadRetakeEvidence(current.id, form); })}><Field title="Ngày thi"><input name="examDate" type="date" required /></Field><Field title="Ngày công bố kết quả"><input name="resultPublishedAt" type="date" required /></Field><Field title="PDF / PNG / JPG, tối đa 10 MB"><input name="evidence" type="file" required accept="application/pdf,image/png,image/jpeg" /></Field></Form>}
          {current.requests.length === 0 && <p>Chưa có yêu cầu.</p>}{current.requests.map(r => <article className="course-row" key={r.id}><h3>Yêu cầu #{r.id} · {show(r.status)}</h3><p>Ngày thi: {date(r.examDate)} · Công bố: {date(r.resultPublishedAt)}</p><p>{r.response}</p>{(admin || learner) && <button disabled={busy} onClick={() => action(() => openRetakeEvidence(current.id, r.id), 'Đã tải minh chứng.')}>Tải minh chứng riêng tư</button>}
            {admin && r.status === 'Pending' && <Form title="Quyết định của Admin" busy={busy} button="Xác nhận quyết định" submit={f => post(`/retake/${r.id}/review`, { approve: f.get('decision') === 'approve', officialFailureVerified: f.get('verified') === 'on', response: f.get('response') })}><Field title="Quyết định"><select name="decision"><option value="reject">Từ chối</option><option value="approve" disabled={!current.eligibility.canClaim}>Duyệt 1 khóa học lại miễn phí</option></select></Field><label><input type="checkbox" name="verified" /> Đã đối chiếu JLPT chính thức: danh tính, cấp độ, kết quả trượt và ngày công bố.</label><Field title="Lý do"><textarea name="response" required maxLength={2000} /></Field></Form>}</article>)}
        </section>
        <details className="course-box"><summary>Lịch sử xử lý</summary>{current.audit.map((a, i) => <p key={i}>{date(a.at)} · Người xử lý #{a.actorId} · {a.detail}</p>)}</details>
      </>}
    </>}
  </main></Shell>;
}
