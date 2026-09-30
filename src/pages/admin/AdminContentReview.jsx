import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import { getAdminPendingContent, getAdminContentDetails, reviewAdminContent, unwrapApiList } from '../../api/admin.js';

const TYPES = ['Lesson', 'Vocabulary', 'Kanji', 'Grammar', 'MockTest', 'PracticeExercise'];

export default function AdminContentReview() {
  const { pathname } = useLocation();
  const [type, setType] = useState(TYPES[0]);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError('');
    try { setItems(unwrapApiList(await getAdminPendingContent(type))); setSelected(null); setDetails(null); }
    catch (e) { setError(e.message || 'Không tải được hàng chờ duyệt.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [type]);
  const openItem = async (item) => {
    const id = item.id ?? item.entityId;
    setSelected(item); setDetails(null); setBusy(true); setError('');
    try { setDetails(await getAdminContentDetails(type, id)); }
    catch (e) { setError(e.message || 'Không tải được chi tiết nội dung.'); }
    finally { setBusy(false); }
  };
  const submitReview = async (approved) => {
    const id = selected?.id ?? selected?.entityId;
    if (id == null) return;
    setBusy(true); setError('');
    try {
      await reviewAdminContent(type, id, { isApproved: approved, rejectionReason: approved ? null : reason.trim() });
      await load();
    } catch (e) { setError(e.message || 'Không gửi được quyết định kiểm duyệt.'); }
    finally { setBusy(false); }
  };
  const value = (obj, keys) => keys.map((key) => obj?.[key]).find((v) => v != null && v !== '');
  return <AdminShell pathname={pathname} breadcrumb="Duyệt nội dung">
    <div className="min-h-screen bg-[#FAF7F5] p-6 md:p-8 text-[#30282B]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Hàng chờ kiểm duyệt</h1><p className="mt-1 text-sm text-[#6F6669]">Nội dung đang chờ Admin xem xét.</p></div>
        <label className="text-sm font-medium">Loại nội dung <select className="ml-2 rounded-lg border border-[#eadfd9] bg-white px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
      </header>
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#eadfd9] bg-white">
          <div className="border-b border-[#eadfd9] px-5 py-4 font-bold">Đang chờ ({items.length})</div>
          {busy && !selected ? <p className="p-6 text-sm text-[#6F6669]">Đang tải…</p> : items.length === 0 ? <p className="p-6 text-sm text-[#6F6669]">Không có nội dung đang chờ.</p> : <ul className="divide-y divide-[#f0e8e4]">{items.map((item, index) => {
            const id = item.id ?? item.entityId ?? index;
            return <li key={id}><button onClick={() => openItem(item)} className={`w-full p-4 text-left hover:bg-[#fff8f8] ${selected === item ? 'bg-[#fff8f8]' : ''}`}><span className="block font-semibold">{value(item, ['title', 'name', 'contentTitle']) || `${type} #${id}`}</span><span className="mt-1 block text-xs text-[#6F6669]">{value(item, ['authorName', 'createdByName', 'email']) || 'Tác giả'} · {value(item, ['submittedAt', 'createdAt']) || ''}</span></button></li>;
          })}</ul>}
        </section>
        <section className="rounded-2xl border border-[#eadfd9] bg-white p-5">
          <h2 className="font-bold">Chi tiết nội dung</h2>
          {!selected ? <p className="py-8 text-sm text-[#6F6669]">Chọn một mục trong hàng chờ để xem.</p> : <>
            <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl bg-[#faf7f5] p-4 text-xs leading-5">{JSON.stringify(details ?? selected, null, 2)}</pre>
            <label className="mt-4 block text-sm font-medium">Lý do từ chối<textarea className="mt-2 w-full rounded-lg border border-[#eadfd9] p-3" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập góp ý khi từ chối" /></label>
            <div className="mt-4 flex justify-end gap-3"><button disabled={busy || !reason.trim()} onClick={() => submitReview(false)} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Từ chối</button><button disabled={busy} onClick={() => submitReview(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Phê duyệt</button></div>
          </>}
        </section>
      </div>
    </div>
  </AdminShell>;
}
