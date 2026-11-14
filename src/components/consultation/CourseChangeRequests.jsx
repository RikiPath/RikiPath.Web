import { backendUtcDate } from '../../utils/mentorSchedule';
import { useEffect, useState } from 'react';
import { courseGet, coursePost } from '../../api/studyCourses';

export default function CourseChangeRequests({ admin = false, current, refresh = async () => {} }) {
  const [rows, setRows] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { let alive = true; courseGet('/change-requests').then(r => alive && setRows(r)).catch(e => alive && setError(e.message)); return () => { alive = false; }; }, [current?.id]);
  async function action(fn) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await fn(); setRows(await courseGet('/change-requests')); await refresh(); setNotice('Đã ghi nhận xử lý. Hoàn tiền nếu có cần được Admin đối soát riêng.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="course-box"><h2>Yêu cầu hủy / dời buổi học</h2>
    {error && <p className="course-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!admin && current?.status === 'Active' && <form className="course-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => coursePost(`/${current.id}/change-requests`, { sessionId: Number(f.get('session')), kind: f.get('kind'), reason: f.get('reason') })); }}>
      <fieldset disabled={busy}><label>Buổi học <select name="session" required><option value="">Chọn buổi</option>{current.sessions.filter(s => s.status === 'Scheduled' && backendUtcDate(s.scheduledAt) > new Date()).map(s => <option key={s.id} value={s.id}>Buổi {s.number} · {backendUtcDate(s.scheduledAt).toLocaleString('vi-VN')}</option>)}</select></label>
        <label>Yêu cầu <select name="kind"><option value="Cancel">Hủy buổi</option><option value="Move">Đề nghị dời lịch</option></select></label><label>Lý do <textarea name="reason" required maxLength={1000} /></label><button>Gửi Admin xử lý</button></fieldset>
    </form>}
    {rows.filter(r => admin || r.courseId === current?.id).map(r => <article className="course-row" key={r.id}><p>#{r.id} · {r.courseName} · Buổi #{r.sessionId} · {r.kind === 'Move' ? 'Dời' : 'Hủy'} · {r.status}</p><p>{r.reason}</p><p>{r.response}</p>
      {admin && r.status === 'Pending' && <form className="course-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => coursePost(`/${r.courseId}/change-requests/${r.id}/review`, { approve: f.get('decision') === 'approve', response: f.get('response'), newAvailabilityId: f.get('slot') ? Number(f.get('slot')) : null, restoreSessionCredit: f.get('credit') === 'on', entireClassConfirmed: f.get('entireClass') === 'on' })); }}>
        <fieldset disabled={busy}><label>Quyết định <select name="decision"><option value="reject">Từ chối</option><option value="approve">Duyệt</option></select></label>
          {r.kind === 'Move' && <label>Mã lịch rảnh thay thế đã duyệt (gói 1–1) <input type="number" name="slot" min="1" /></label>}
          {r.sessionType === 'Group' && <label><input type="checkbox" name="entireClass" /> Tôi xác nhận dời lịch cho cả lớp và đã thông báo các học viên.</label>}
          <label><input type="checkbox" name="credit" /> Hoàn lượt học khi duyệt hủy</label><label>Lý do xử lý <textarea name="response" maxLength={1000} required /></label><button>Xác nhận</button></fieldset>
      </form>}
    </article>)}
  </section>;
}
