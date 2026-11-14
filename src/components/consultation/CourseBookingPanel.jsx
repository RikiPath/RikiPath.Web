import { backendUtcDate } from '../../utils/mentorSchedule';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { courseGet, coursePost } from '../../api/studyCourses';

const date = value => backendUtcDate(value).toLocaleString('vi-VN');
export default function CourseBookingPanel({ role, plans, mentors, current, refresh }) {
  const admin = role === 'Admin', learner = role === 'Learner';
  const [cohorts, setCohorts] = useState([]), [slots, setSlots] = useState([]), [available, setAvailable] = useState([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [mentorId, setMentorId] = useState(''), [planId, setPlanId] = useState(''), [selectedSlots, setSelectedSlots] = useState([]);
  const keys = useRef({});
  const courseId = current?.id;
  const canBook = learner && current?.sessionType === 'Individual' && current?.paymentStatus === 'Paid' && ['Ready', 'Active'].includes(current?.status);
  const load = useCallback(async () => {
    const [c, s, a] = await Promise.all([courseGet('/cohorts'), admin ? api.get('/admin/mentor-availabilities').then(r => r.result) : [],
      canBook ? courseGet(`/${courseId}/available-slots`) : []]);
    setCohorts(c); setSlots(s); setAvailable(a);
  }, [admin, canBook, courseId]);
  useEffect(() => { let alive = true; Promise.resolve().then(load).catch(e => alive && setError(e.message)); return () => { alive = false; }; }, [load]);
  async function action(fn, message) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await fn(); await refresh(); await load(); setNotice(message || 'Đã lưu.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const plan = plans.find(p => p.id === Number(planId));
  const usable = slots.filter(s => s.mentorId === Number(mentorId) && s.isApproved && !s.rejectedAt && !s.changeRequestedAt
    && s.bookedCount === 0 && backendUtcDate(s.startTime) > new Date() && (!plan?.sessionMinutes || (backendUtcDate(s.endTime) - backendUtcDate(s.startTime)) / 60000 === plan.sessionMinutes));
  return <section className="course-box"><h2>{admin ? 'Mở lớp nhóm' : 'Lớp nhóm theo lịch cố định'}</h2>
    {error && <p role="alert" className="course-error">{error}</p>}{notice && <p role="status" className="course-notice">{notice}</p>}
    {admin && <form className="course-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget);
      action(() => coursePost('/cohorts', { name: f.get('name'), planId: Number(planId), mentorId: Number(mentorId), capacity: Number(f.get('capacity')),
        availabilityIds: selectedSlots, publish: f.get('publish') === 'on' }), 'Đã tạo lớp.'); }}>
      <fieldset disabled={busy}><label>Tên lớp <input name="name" required maxLength={200} /></label>
        <label>Gói nhóm <select required value={planId} onChange={e => { setPlanId(e.target.value); setSelectedSlots([]); }}><option value="">Chọn gói</option>{plans.filter(p => p.sessionType === 'Group').map(p => <option key={p.id} value={p.id}>{p.name} · {p.level}</option>)}</select></label>
        <label>Mentor <select required value={mentorId} onChange={e => { setMentorId(e.target.value); setSelectedSlots([]); }}><option value="">Phân công Mentor</option>{mentors.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label>
        <label>Sĩ số tối đa <input name="capacity" type="number" min="2" max="100" required key={planId} defaultValue={plan?.capacity || 2} /></label>
        <p>Chọn đủ {plan?.totalSessions || '…'} buổi cố định từ lịch rảnh đã duyệt. Không yêu cầu sĩ số tối thiểu.</p>
        <div style={{ maxHeight: 280, overflow: 'auto' }}>{usable.map(s => <label className="course-row" key={s.id}><input type="checkbox" checked={selectedSlots.includes(s.id)} onChange={e => setSelectedSlots(e.target.checked ? [...selectedSlots, s.id] : selectedSlots.filter(x => x !== s.id))} />{date(s.startTime)} → {date(s.endTime)}</label>)}</div>
        <p>Đã chọn {selectedSlots.length} buổi</p><label><input type="checkbox" name="publish" /> Công bố và mở đăng ký</label><button className="course-primary">Tạo lớp</button>
      </fieldset>
    </form>}
    <div className="course-grid">{cohorts.map(c => <article className="course-box" key={c.id}><h3>#{c.id} · {c.name} · {c.level}</h3><p>Mentor: {c.mentorName}</p><p>{date(c.startsAt)} → {date(c.endsAt)}</p><p>Còn {c.seatsAvailable}/{c.capacity} chỗ · {Number(c.price).toLocaleString('vi-VN')} ₫</p><details><summary>Lịch cố định ({c.sessions.length} buổi)</summary>{c.sessions.map(s => <p key={s.number}>Buổi {s.number}: {date(s.startTime)}</p>)}</details>
      {admin && <p>{c.status === 'Published' ? 'Đã công bố' : 'Bản nháp'}</p>}
      {admin && c.status === 'Draft' && <button disabled={busy} onClick={() => action(() => api.put(`/study-courses/cohorts/${c.id}`, { planId: c.planId, name: c.name, mentorId: c.mentorId, capacity: c.capacity, availabilityIds: c.sessions.map(s => s.availabilityId), publish: true, revision: c.revision }))}>Công bố lớp</button>}
      {learner && <button className="course-primary" disabled={busy || c.seatsAvailable <= 0 || backendUtcDate(c.startsAt) <= new Date()} onClick={() => action(async () => {
        const key = keys.current[c.id] ||= crypto.randomUUID(); const order = await coursePost('/purchase', { planId: c.planId, cohortId: c.id, idempotencyKey: key });
        if (order.checkoutUrl) window.location.assign(order.checkoutUrl);
      }, 'Đã tạo đơn giữ chỗ 15 phút.')}>Đăng ký lớp · Giữ chỗ 15 phút</button>}
    </article>)}</div>{cohorts.length === 0 && <p>Chưa có lớp đang mở.</p>}
    {canBook && <><h2>Đặt buổi học từ gói 1–1 của bạn</h2><p>Chọn lịch đã được Admin duyệt. Buổi đầu tiên xác định Mentor phụ trách gói.</p>
      {available.length === 0 && <p>Chưa có lịch đúng thời lượng của gói.</p>}
      <div style={{ maxHeight: 320, overflow: 'auto' }}>{available.map(s => <article className="course-row" key={s.id}><p>{s.mentorName} · {date(s.startTime)} → {date(s.endTime)}</p><button disabled={busy} onClick={() => action(() => coursePost(`/${courseId}/book-slot`, { availabilityId: s.id }), 'Đã đặt buổi học.')}>Chọn lịch</button></article>)}</div>
    </>}
  </section>;
}
