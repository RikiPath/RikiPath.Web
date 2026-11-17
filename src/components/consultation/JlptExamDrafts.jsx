import { useEffect, useState } from 'react';
import { courseGet, coursePost } from '../../api/studyCourses';

export default function JlptExamDrafts() {
  const [rows, setRows] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  useEffect(() => { let alive = true; courseGet('/exam-schedules').then(r => alive && setRows(r)).catch(e => alive && setError(e.message)); return () => { alive = false; }; }, []);
  async function action(fn) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await fn(); setRows(await courseGet('/exam-schedules')); setNotice('Đã xử lý. Chỉ lịch được Admin duyệt mới được công bố.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="course-box"><h2>Lịch thi JLPT</h2><p>Lấy ngày thi chính thức về bản nháp. Admin cần đối chiếu đơn vị tổ chức và địa điểm trước khi duyệt; không tự suy đoán ngày thi.</p>
    {error && <p role="alert" className="course-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button disabled={busy} onClick={() => action(() => coursePost('/exam-schedules/import'))}>Lấy lịch JLPT về bản nháp</button>
    {rows.map(r => <article key={r.id} className="course-row"><p>JLPT · {r.examDate} · {r.status} · {r.location}</p><a href={r.sourceUrl} target="_blank" rel="noreferrer">Xem nguồn chính thức</a>
      {r.status === 'Draft' && <form className="course-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget);
        action(() => coursePost(`/exam-schedules/${r.id}/review`, { examDate: f.get('date'), location: f.get('location'), approve: f.get('decision') === 'approve', note: f.get('note') })); }}>
        <fieldset disabled={busy}><label>Ngày thi <input type="date" name="date" required defaultValue={r.examDate} /></label><label>Địa điểm / Đơn vị tổ chức <input name="location" maxLength={200} required /></label>
          <label>Quyết định <select name="decision"><option value="approve">Duyệt</option><option value="reject">Từ chối</option></select></label><label>Ghi chú đối chiếu <input name="note" required maxLength={1000} /></label><button>Xác nhận</button></fieldset>
      </form>}
    </article>)}
  </section>;
}
