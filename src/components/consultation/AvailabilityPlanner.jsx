import { backendUtcDate } from '../../utils/mentorSchedule';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { AdminShell, ConsultShell } from '../shells';
import { api } from '../../api/client';
import WeekTimeGrid from './WeekTimeGrid';
import '../../pages/studyCourses.css';
import './availabilityPlanner.css';
import { CalendarDays, Clock, Repeat, ChevronLeft, ChevronRight, RefreshCw, Send, Info, Link2, ChevronDown, Trash2, AlertCircle } from 'lucide-react';

const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(backendUtcDate(value));
const clock = value => backendUtcDate(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const addDays = (key, n) => new Date(new Date(`${key}T12:00:00+07:00`).getTime() + n * 86400000);
const monday = () => { const today = dayKey(new Date()); const d = new Date(`${today}T12:00:00+07:00`); return dayKey(addDays(today, -((d.getUTCDay() + 6) % 7))); };

export default function AvailabilityPlanner({ admin = false, embedded = false }) {
  const Shell = embedded ? Fragment : admin ? AdminShell : ConsultShell;
  const [slots, setSlots] = useState([]), [selected, setSelected] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [week, setWeek] = useState(monday), [days, setDays] = useState([1, 3, 5]);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [repeating, setRepeating] = useState(true), [reason, setReason] = useState('');
  const load = useCallback(async () => {
    const response = await api.get(admin ? '/admin/mentor-availabilities' : '/mentor/availability');
    setSlots(response.result || []); setSelected([]);
    if (!admin) {
      const query = new URLSearchParams(window.location.search);
      if (query.has('code') && query.has('state')) {
        const payload = { code: query.get('code'), state: query.get('state') };
        query.delete('code'); query.delete('state'); query.delete('scope');
        window.history.replaceState(null, '', window.location.pathname + (query.size ? '?' + query.toString() : ''));
        await api.post('/mentor/calendar/callback', payload);
      }
      const status = await api.get('/mentor/calendar'); setCalendar(status.result);
    }
  }, [admin]);
  useEffect(() => { Promise.resolve().then(load).catch(e => setError(e.message)); }, [load]);
  async function action(work, message = 'Đã cập nhật lịch.') {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await work(); await load(); setNotice(message); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const pending = slots.filter(s => !s.isApproved && !s.rejectedAt && backendUtcDate(s.startTime) > new Date());
  const visible = slots.filter(s => dayKey(s.startTime) >= week && dayKey(s.startTime) <= dayKey(addDays(week, 6)));
  const calendarDays = Array.from({ length: 7 }, (_, i) => { const key = dayKey(addDays(week, i)); return { key, name: labels[(i + 1) % 7], date: Number(key.slice(-2)), today: key === dayKey(new Date()) }; });
  const events = visible.map(s => {
    const a = clock(s.startTime).split(':').map(Number), b = clock(s.endTime).split(':').map(Number);
    return { id: s.id, dayKey: dayKey(s.startTime), startHour: a[0], startMinute: a[1], endHour: b[0], endMinute: b[1],
      title: admin ? (s.mentorName || `Mentor #${s.mentorId}`) : `${clock(s.startTime)}–${clock(s.endTime)}`,
      detail: s.rejectedAt ? `Từ chối: ${s.rejectionReason}` : s.changeRequestedAt ? 'Chờ điều chỉnh' : s.maxLearners > 1 ? 'Lịch lớp nhóm' : s.isApproved ? 'Đã duyệt' : 'Chờ duyệt',
      tone: s.rejectedAt ? 'ghost' : (s.bookedCount > 0 || s.maxLearners > 1) ? 'booked' : s.isApproved ? 'open' : 'pending' };
  });
  const review = (approve, ids) => action(async () => { for (let i = 0; i < ids.length; i += 50) await api.post(`/admin/mentor-availabilities/review?approve=${approve}${approve ? '' : `&rejectionReason=${encodeURIComponent(reason)}`}`, ids.slice(i, i + 50)); });
  const weekEnd = dayKey(addDays(week, 6));
  const shortDate = key => key.split('-').reverse().slice(0, 2).join('/');
  const monthTitle = addDays(week, 0).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
  const statusOf = s => s.rejectedAt ? { label: 'Đã từ chối', tone: 'rejected' }
    : s.changeRequestedAt ? { label: 'Chờ điều chỉnh', tone: 'pending' }
    : !s.isApproved ? { label: 'Chờ duyệt', tone: 'pending' }
    : s.maxLearners > 1 ? { label: 'Lớp nhóm', tone: 'booked' }
    : s.bookedCount > 0 ? { label: 'Đã có học viên', tone: 'booked' }
    : { label: 'Đã duyệt', tone: 'approved' };
  const now = new Date();
  const nowClock = clock(now).split(':').map(Number);
  return <Shell {...(embedded ? {} : { breadcrumb: 'Lịch Mentor' })}><main className="availability-page">
    <header className="av-page-header">
      <div><span className="av-eyebrow">QUẢN LÝ LỊCH</span><h1>{admin ? 'Duyệt lịch Mentor' : 'Lịch rảnh của tôi'}</h1>
        <p>{admin ? 'Kiểm tra đăng ký và sắp xếp khung giờ dạy cho Mentor.' : 'Chủ động sắp xếp thời gian rảnh và theo dõi lịch đã đăng ký.'}</p>
      </div>
      <span className="av-timezone"><Clock size={15} /> Giờ Việt Nam <span>GMT+7</span></span>
    </header>
    {error && <div className="av-alert av-alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
    {notice && <div className="av-alert av-alert-success" role="status"><Info size={18} /><span>{notice}</span></div>}
    {!admin && <form className="av-card av-register" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget);
      action(() => api.post('/mentor/availability', { startTime: new Date(`${f.get('date')}T${f.get('from')}:00+07:00`).toISOString(),
        endTime: new Date(`${f.get('date')}T${f.get('to')}:00+07:00`).toISOString(), repeatUntil: repeating ? f.get('until') : null, weekdays: repeating ? days : null }), 'Đã gửi đăng ký. Vui lòng chờ Admin duyệt.'); }}>
      <div className="av-card-heading"><span className="av-icon"><CalendarDays size={21} /></span><div><h2>Đăng ký lịch rảnh</h2><p>Chọn một khung giờ hoặc đăng ký lặp lại trong nhiều tuần.</p></div></div>
      <fieldset disabled={busy} className="av-register-fields">
        <div className="av-register-grid">
          <div className="av-time-block">
            <h3>Thời gian rảnh</h3>
            <div className="av-date-time-grid">
              <label className="av-field"><span>Ngày bắt đầu</span><input name="date" type="date" min={dayKey(new Date())} required /></label>
              <label className="av-field"><span>Từ giờ</span><input name="from" type="time" required /></label>
              <label className="av-field"><span>Đến giờ</span><input name="to" type="time" required /></label>
            </div>
            <div className="av-inline-tip"><Info size={15} /><p>Khung giờ chỉ mở đặt lịch sau khi được Admin duyệt.</p></div>
          </div>
          <div className="av-repeat-block">
            <label className="av-toggle"><input type="checkbox" checked={repeating} onChange={e => setRepeating(e.target.checked)} /><span className="av-toggle-track" aria-hidden="true" /><span><Repeat size={16} /> Lặp theo tuần</span></label>
            {repeating ? <div className="av-repeat-options">
              <div className="av-presets"><span>Chọn nhanh</span>{[[1, 3, 5], [2, 4, 6]].map((preset, i) => <button type="button" key={i} className={days.length === 3 && preset.every(d => days.includes(d)) ? 'is-selected' : ''} aria-pressed={days.length === 3 && preset.every(d => days.includes(d))} onClick={() => setDays(preset)}>{i === 0 ? 'T2 · T4 · T6' : 'T3 · T5 · T7'}</button>)}</div>
              <div className="av-weekdays" role="group" aria-label="Các thứ lặp lại">{[1, 2, 3, 4, 5, 6, 0].map(d => <label key={d} className={days.includes(d) ? 'is-selected' : ''}><input type="checkbox" checked={days.includes(d)} onChange={e => setDays(e.target.checked ? [...days, d] : days.filter(x => x !== d))} /><span>{labels[d]}</span></label>)}</div>
              <label className="av-field av-until"><span>Lặp đến ngày</span><input type="date" name="until" required /></label>
            </div> : <p className="av-repeat-off">Chỉ đăng ký khung giờ trong ngày đã chọn.</p>}
          </div>
        </div>
        <div className="av-form-footer"><span><span className="av-dot av-dot-pending" /> Đăng ký mới sẽ ở trạng thái chờ duyệt</span><button className="av-button av-button-primary" disabled={busy || (repeating && days.length === 0)}><Send size={16} />{busy ? 'Đang gửi…' : 'Gửi đăng ký'}</button></div>
      </fieldset>
    </form>}
    <section className="av-card av-calendar" aria-label="Lịch theo tuần">
      <div className="av-calendar-toolbar">
        <div className="av-week-controls"><button type="button" className="av-button av-today" onClick={() => setWeek(monday())}>Hôm nay</button><div className="av-arrows"><button type="button" className="av-icon-button" aria-label="Tuần trước" onClick={() => setWeek(dayKey(addDays(week, -7)))}><ChevronLeft size={19} /></button><button type="button" className="av-icon-button" aria-label="Tuần sau" onClick={() => setWeek(dayKey(addDays(week, 7)))}><ChevronRight size={19} /></button></div>
          <div className="av-week-label"><h2>{monthTitle}</h2><span>{shortDate(week)} – {shortDate(weekEnd)}</span></div>
        </div>
        <div className="av-calendar-actions"><span className="av-week-count">{visible.length} khung giờ</span><span className="av-view-label"><CalendarDays size={15} /> Tuần</span><button type="button" className="av-icon-button" aria-label="Tải lại lịch" title="Tải lại lịch" disabled={busy} onClick={() => action(load, 'Đã tải lại lịch.')}><RefreshCw size={17} className={busy ? 'av-spinning' : ''} /></button></div>
      </div>
      <div className="av-calendar-meta"><div className="av-legend"><span><i className="av-dot av-dot-pending" />Chờ duyệt</span><span><i className="av-dot av-dot-approved" />Đã duyệt</span><span><i className="av-dot av-dot-booked" />Đã có lịch học</span><span><i className="av-dot av-dot-rejected" />Từ chối</span></div><span className="av-calendar-zone">GMT+7</span></div>
      {visible.length === 0 && <p className="av-calendar-empty"><CalendarDays size={16} />Tuần này chưa có lịch đăng ký.</p>}
      <div className="av-calendar-scroll"><WeekTimeGrid days={calendarDays} events={events} startHour={7} endHour={22} nowKey={dayKey(now)} nowMinutes={nowClock[0] * 60 + nowClock[1]} /></div>
    </section>
    {admin && <section className="course-box"><h2>Lịch chờ duyệt ({pending.length})</h2>
      <p>Duyệt tất cả áp dụng các lịch đang chờ hiển thị bên dưới, từng đợt tối đa 50 lịch.</p>
      <label>Lý do từ chối <input value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></label>
      <div className="course-buttons"><button disabled={busy || !selected.length} onClick={() => review(true, selected)}>Duyệt đã chọn</button><button disabled={busy || !selected.length || !reason.trim()} onClick={() => review(false, selected)}>Từ chối đã chọn</button>
        <button disabled={busy || !pending.length} onClick={() => action(async () => { for (let i = 0; i < pending.length; i += 50) await api.post('/admin/mentor-availabilities/review?approve=true', pending.slice(i, i + 50).map(s => s.id)); })}>Duyệt tất cả ({pending.length})</button></div>
      {pending.map(s => <label className="course-row" key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(e.target.checked ? [...selected, s.id] : selected.filter(x => x !== s.id))} /> {s.mentorName || `Mentor #${s.mentorId}`} · {dayKey(s.startTime)} · {clock(s.startTime)}–{clock(s.endTime)}</label>)}
    </section>}
    {admin && <section className="course-box"><h2>Chia khung rảnh theo thời lượng gói</h2><p>Ví dụ khung 08:00–12:00 chia thành các buổi 60 phút. Chỉ chia khung đã duyệt và chưa đặt/gán lớp; phần lẻ được giữ lại.</p>
      {visible.filter(s => s.isApproved && !s.rejectedAt && s.bookedCount === 0 && s.maxLearners === 1 && backendUtcDate(s.startTime) > new Date()).map(s => <form className="course-row course-form" key={s.id} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => api.post('/admin/mentor-availabilities/' + s.id + '/split', { sessionMinutes: Number(f.get('minutes')) })); }}>
        <p>#{s.id} · {s.mentorName} · {dayKey(s.startTime)} · {clock(s.startTime)}–{clock(s.endTime)}</p><label>Phút/buổi theo gói <input name="minutes" type="number" required min="15" max="240" /></label><button disabled={busy}>Chia khung rảnh</button>
      </form>)}
    </section>}
    {!admin && <section className="av-card av-registrations"><div className="av-section-title"><div><h2>Đăng ký trong tuần</h2><p>Theo dõi trạng thái và gửi yêu cầu điều chỉnh khi cần.</p></div><span className="av-count">{visible.length}</span></div>
      {visible.length === 0 ? <div className="av-empty-list">Chưa có đăng ký trong tuần đang xem.</div> : <div className="av-registration-list">{visible.map(s => { const status = statusOf(s); return <article className="av-registration" key={s.id}>
        <div className="av-registration-top"><span className="av-list-icon"><CalendarDays size={18} /></span><div className="av-registration-date"><strong>{shortDate(dayKey(s.startTime))} <span>·</span> {clock(s.startTime)} – {clock(s.endTime)}</strong>{s.rejectionReason && <p>{s.rejectionReason}</p>}{s.changeRequestedAt && <p>Yêu cầu điều chỉnh đang chờ Admin xử lý.</p>}</div><span className={`av-status av-status-${status.tone}`}>{status.label}</span>
          {!s.isApproved && s.bookedCount === 0 && <button type="button" className="av-icon-button av-delete" aria-label="Xóa đăng ký" title="Xóa đăng ký" disabled={busy} onClick={() => action(() => api.delete(`/mentor/availability/${s.id}`), 'Đã xóa đăng ký.')}><Trash2 size={16} /></button>}
        </div>
        {s.isApproved && !s.changeRequestedAt && backendUtcDate(s.startTime) > new Date() && <details className="av-change"><summary>Yêu cầu điều chỉnh <ChevronDown size={14} /></summary><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => api.post(`/mentor-schedule/slots/${s.id}/change`, { reason: f.get('reason') }), 'Đã gửi yêu cầu điều chỉnh cho Admin.'); }}><label className="av-field"><span>Lý do điều chỉnh</span><input name="reason" maxLength={1000} required placeholder="Nhập lý do cần hủy hoặc dời lịch" /></label><button className="av-button" disabled={busy}>Gửi yêu cầu</button></form></details>}
      </article>; })}</div>}
    </section>}
    {!admin && <section className="av-card av-google"><span className="av-google-icon"><CalendarDays size={23} /></span><div className="av-google-copy"><h2>Google Calendar <span className={`av-status ${calendar?.connected ? 'av-status-approved' : 'av-status-neutral'}`}>{calendar?.connected ? 'Đã kết nối' : 'Chưa kết nối'}</span></h2><p>{!calendar?.configured ? 'Chưa thiết lập kết nối. Bạn vẫn có thể đăng ký và quản lý lịch tại RikiPath.' : calendar.connected ? 'Lịch dạy tự động đồng bộ một chiều từ RikiPath.' : 'Kết nối để theo dõi lịch dạy ngay trên lịch cá nhân của bạn.'}</p>{calendar?.connected && calendar.lastSyncedAt && <span className="av-sync-time">Đồng bộ gần nhất: {backendUtcDate(calendar.lastSyncedAt).toLocaleString('vi-VN')}</span>}</div>
      {calendar?.configured && <div className="av-google-actions">{calendar.connected ? <><button className="av-button" disabled={busy} onClick={() => action(() => api.post('/mentor/calendar/sync'), 'Đã đồng bộ Google Calendar.')}><RefreshCw size={15} />Đồng bộ</button><button className="av-text-button" disabled={busy} onClick={() => action(() => api.delete('/mentor/calendar'), 'Đã ngắt kết nối Google Calendar.')}>Ngắt kết nối</button></> : <button className="av-button" disabled={busy} onClick={() => action(async () => { const r = await api.post('/mentor/calendar/connect'); window.location.assign(r.result.url); })}><Link2 size={15} />Kết nối</button>}</div>}
    </section>}
  </main></Shell>;
}
