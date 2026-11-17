import { useEffect, useState } from 'react';
import { AdminShell } from '../../components/shells';
import { api } from '../../api/client';
import { courseGet } from '../../api/studyCourses';
import '../studyCourses.css';

const empty = { name: '', code: '', certificateTypeId: '', description: '', sortOrder: 0, isActive: true };
export default function AdminStudyCatalog() {
  const [data, setData] = useState({ types: [], levels: [] }), [kind, setKind] = useState('certificates'), [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = async () => setData(await courseGet('/admin-catalog'));
  useEffect(() => { let alive = true; courseGet('/admin-catalog').then(d => alive && setData(d)).catch(e => alive && setError(e.message)); return () => { alive = false; }; }, []);
  const change = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const body = { ...draft, sortOrder: Number(draft.sortOrder), certificateTypeId: Number(draft.certificateTypeId) };
      const path = `/study-courses/${kind}${draft.id ? `/${draft.id}` : ''}`;
      await (draft.id ? api.put(path, body) : api.post(path, body));
      await load(); setDraft(empty); setNotice('Đã lưu danh mục.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const field = (title, key, type = 'text') => <label className="course-field"><span>{title}</span><input required={key === 'name' || key === 'code'} maxLength={key === 'code' ? 50 : 100} type={type} value={draft[key]} onChange={e => change(key, e.target.value)} disabled={key === 'code' && Boolean(draft.id)} /></label>;
  return <AdminShell breadcrumb="Chứng chỉ & cấp độ"><main className="course-page"><h1>Chứng chỉ & cấp độ</h1><p>Danh mục được lấy từ database. Vô hiệu hóa sẽ ngừng đăng ký mới và giữ dữ liệu lịch sử.</p>{error && <p className="course-error" role="alert">{error}</p>}{notice && <p className="course-notice" role="status">{notice}</p>}
    <div className="course-buttons"><button onClick={() => { setKind('certificates'); setDraft(empty); }}>Chứng chỉ</button><button onClick={() => { setKind('levels'); setDraft(empty); }}>Cấp độ</button><button onClick={() => setDraft(empty)}>Tạo mới</button></div>
    <form onSubmit={save} className="course-form course-box"><h2>{draft.id ? `Sửa #${draft.id}` : 'Tạo mới'} · {kind === 'levels' ? 'Cấp độ' : 'Chứng chỉ'}</h2><fieldset disabled={busy}>{kind === 'certificates' ? field('Tên chứng chỉ', 'name') : <><label className="course-field"><span>Chứng chỉ</span><select required disabled={Boolean(draft.id)} value={draft.certificateTypeId} onChange={e => change('certificateTypeId', e.target.value)}><option value="">Chọn chứng chỉ</option>{data.types.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>{field('Mã cấp độ (giữ nguyên sau khi tạo)', 'code')}</>}
      <label className="course-field"><span>Mô tả</span><textarea maxLength={2000} value={draft.description || ''} onChange={e => change('description', e.target.value)} /></label>{field('Thứ tự hiển thị', 'sortOrder', 'number')}<label><input type="checkbox" checked={draft.isActive} onChange={e => change('isActive', e.target.checked)} /> Hoạt động</label><button className="course-primary">Lưu</button></fieldset></form>
    <section className="course-box"><h2>Danh sách {kind === 'levels' ? 'cấp độ' : 'chứng chỉ'}</h2>{(kind === 'levels' ? data.levels : data.types).map(row => <article key={row.id} className="course-row"><h3>{row.name || row.code}{row.certificateTypeId ? ` · ${data.types.find(t => t.id === row.certificateTypeId)?.name || ''}` : ''}</h3><p>{row.description} · {row.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</p><button disabled={busy} onClick={() => setDraft({ ...empty, ...row })}>Sửa</button></article>)}</section>
  </main></AdminShell>;
}
