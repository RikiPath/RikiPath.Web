import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/layouts';
import { api } from '@/api/client';
import { describeApiError } from '@/api/apiErrors.js';
import { courseGet } from '@/features/cohorts/api/cohortApi';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

const empty = { name: '', code: '', certificateTypeId: '', description: '', sortOrder: 0, isActive: true };
export default function AdminStudyCatalog() {
  const { trf, tr } = useLocale();
  const [data, setData] = useState({ types: [], levels: [] }), [kind, setKind] = useState('certificates'), [draft, setDraft] = useState(empty);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await courseGet('/admin-catalog');
      setData(d || { types: [], levels: [] });
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return null;
      setLoading(true);
      setLoadError(null);
      return courseGet('/admin-catalog');
    })
      .then((d) => { if (alive && d !== undefined) setData(d || { types: [], levels: [] }); })
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);
  const change = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    const toastKey = 'admin-study-catalog-save';
    notify.loading('Đang lưu danh mục JLPT…', '', { key: toastKey, maxWaitMs: 30000 });
    try {
      const body = { ...draft, sortOrder: Number(draft.sortOrder), certificateTypeId: Number(draft.certificateTypeId) };
      const path = `/study-courses/${kind}${draft.id ? `/${draft.id}` : ''}`;
      await (draft.id ? api.put(path, body) : api.post(path, body));
      await load();
      const msg = draft.id ? 'Đã cập nhật danh mục JLPT.' : 'Đã thêm mới vào danh mục JLPT.';
      setDraft(empty);
      setNotice(msg);
      notify.success(msg, '', { key: toastKey, replace: true });
    } catch (err) {
      setError(describeApiError(err).message);
      notify.apiError(err, 'Chưa lưu được danh mục JLPT', { key: toastKey, replace: true });
    } finally { setBusy(false); }
  }
  const list = kind === 'levels' ? (data.levels || []) : (data.types || []);
  const field = (title, key, type = 'text') => <label className="course-field"><span>{tr(title)}</span><input required={key === 'name' || key === 'code'} maxLength={key === 'code' ? 50 : 100} type={type} value={draft[key]} onChange={e => change(key, e.target.value)} disabled={key === 'code' && Boolean(draft.id)} /></label>;
  return <AdminShell breadcrumb={tr('Chứng chỉ & cấp độ')}><main className="course-page"><h1>{tr('Chứng chỉ & cấp độ')}</h1><p>{tr('Danh mục được lấy từ database. Vô hiệu hóa sẽ ngừng đăng ký mới và giữ dữ liệu lịch sử.')}</p>{error && <p className="course-error" role="alert">{error}</p>}{notice && <p className="course-notice" role="status">{notice}</p>}
    <div className="course-buttons"><button onClick={() => { setKind('certificates'); setDraft(empty); }}>{tr('Chứng chỉ')}</button><button onClick={() => { setKind('levels'); setDraft(empty); }}>{tr('Cấp độ')}</button><button onClick={() => setDraft(empty)}>{tr('Tạo mới')}</button></div>
    <form onSubmit={save} className="course-form course-box"><h2>{draft.id ? trf('Sửa #{0}', { 0: draft.id }) : tr('Tạo mới')} · {kind === 'levels' ? tr('Cấp độ') : tr('Chứng chỉ')}</h2><fieldset disabled={busy || Boolean(loadError)}>{kind === 'certificates' ? field('Tên chứng chỉ', 'name') : <><label className="course-field"><span>{tr('Chứng chỉ')}</span><select required disabled={Boolean(draft.id)} value={draft.certificateTypeId} onChange={e => change('certificateTypeId', e.target.value)}><option value="">{tr('Chọn chứng chỉ')}</option>{data.types.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>{field('Mã cấp độ (giữ nguyên sau khi tạo)', 'code')}</>}
      <label className="course-field"><span>{tr('Mô tả')}</span><textarea maxLength={2000} value={draft.description || ''} onChange={e => change('description', e.target.value)} /></label>{field('Thứ tự hiển thị', 'sortOrder', 'number')}<label><input type="checkbox" checked={draft.isActive} onChange={e => change('isActive', e.target.checked)} />{' '}{tr('Hoạt động')}</label><button className="course-primary">{tr('Lưu')}</button></fieldset></form>
    <section className="course-box"><h2>{tr('Danh sách')}{' '}{kind === 'levels' ? tr('cấp độ') : tr('chứng chỉ')}</h2>
      {loading && <SakuraLoader variant="section" context="data" label={tr('Đang tải danh mục JLPT')} delay={160} />}
      {loadError && !loading && <ContextualErrorState compact error={loadError} title={tr('Chưa tải được danh mục JLPT')} onRetry={load} retrying={loading} />}
      {!loading && !loadError && list.length === 0 && <ContextualEmptyState compact title={tr('Chưa có dữ liệu danh mục.')} />}
      {!loading && !loadError && list.map(row => <article key={row.id} className="course-row"><h3>{row.name || row.code}{row.certificateTypeId ? ` · ${data.types.find(t => t.id === row.certificateTypeId)?.name || ''}` : ''}</h3><p>{tr(row.description)} · {row.isActive ? tr('Hoạt động') : tr('Ngừng hoạt động')}</p><button disabled={busy} onClick={() => setDraft({ ...empty, ...row })}>{tr('Sửa')}</button></article>)}
    </section>
  </main></AdminShell>;
}
