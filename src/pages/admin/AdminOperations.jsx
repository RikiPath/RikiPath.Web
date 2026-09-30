import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import {
  getAdminPlans, createAdminPlan, updateAdminPlan, disableAdminPlan,
  getAdminFeatures, createAdminFeature, updateAdminFeature, disableAdminFeature,
  getAdminMentorBookings, updateAdminMentorBooking,
  getAdminMentorAvailabilities, createAdminMentorAvailability, updateAdminMentorAvailability, deleteAdminMentorAvailability,
  unwrapApiList,
} from '../../api/admin.js';

const RESOURCES = {
  plans: { label: 'Gói đăng ký', list: getAdminPlans, create: createAdminPlan, update: updateAdminPlan, remove: disableAdminPlan },
  features: { label: 'Tính năng', list: getAdminFeatures, create: createAdminFeature, update: updateAdminFeature, remove: disableAdminFeature },
  bookings: { label: 'Mentor bookings', list: getAdminMentorBookings, update: updateAdminMentorBooking },
  availabilities: { label: 'Lịch Mentor', list: getAdminMentorAvailabilities, create: createAdminMentorAvailability, update: updateAdminMentorAvailability, remove: deleteAdminMentorAvailability },
};
const INITIAL_BODY = '{\n  \n}';

export default function AdminOperations() {
  const { pathname } = useLocation();
  const [resourceKey, setResourceKey] = useState('plans');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [body, setBody] = useState(INITIAL_BODY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resource = useMemo(() => RESOURCES[resourceKey], [resourceKey]);
  const refresh = async () => {
    setBusy(true); setError('');
    try { setRows(unwrapApiList(await resource.list())); }
    catch (e) { setRows([]); setError(e.message || 'Không tải được dữ liệu.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { setSelectedId(''); setBody(INITIAL_BODY); setNotice(''); refresh(); }, [resourceKey]);
  const parseBody = () => {
    try { return JSON.parse(body); }
    catch { throw new Error('Nội dung gửi phải là JSON hợp lệ.'); }
  };
  const run = async (action) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'create') await resource.create(parseBody());
      if (action === 'update') {
        if (!selectedId) throw new Error('Hãy chọn bản ghi cần cập nhật.');
        await resource.update(selectedId, parseBody());
      }
      if (action === 'remove') {
        if (!selectedId) throw new Error('Hãy chọn bản ghi cần xóa/vô hiệu hóa.');
        await resource.remove(selectedId);
      }
      setNotice('Đã gửi thao tác thành công.');
      await refresh();
    } catch (e) { setError(e.message || 'Thao tác thất bại.'); }
    finally { setBusy(false); }
  };
  const idOf = (row) => row?.id ?? row?.bookingId ?? row?.availabilityId ?? row?.mentorBookingId;
  return <AdminShell pathname={pathname} breadcrumb="Quản lý vận hành">
    <div className="min-h-screen bg-[#FAF7F5] p-6 md:p-8 text-[#30282B]">
      <header className="mb-6"><h1 className="text-2xl font-bold">Gói, tính năng &amp; lịch Mentor</h1><p className="mt-1 text-sm text-[#6F6669]">Tra cứu và cập nhật dữ liệu quản trị qua API.</p></header>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold">Nhóm dữ liệu <select value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} className="ml-2 rounded-lg border border-[#eadfd9] bg-white px-3 py-2">{Object.entries(RESOURCES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
        <button onClick={refresh} disabled={busy} className="rounded-lg border border-[#eadfd9] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Tải lại</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#eadfd9] bg-white">
          <div className="border-b border-[#eadfd9] px-5 py-4 font-bold">{resource.label} · {rows.length}</div>
          {busy && rows.length === 0 ? <p className="p-5 text-sm text-[#6F6669]">Đang tải…</p> : rows.length === 0 ? <p className="p-5 text-sm text-[#6F6669]">Chưa có dữ liệu hoặc API chưa trả kết quả.</p> : <div className="max-h-[70vh] overflow-auto divide-y divide-[#f0e8e4]">{rows.map((row, i) => {
            const id = idOf(row) ?? `row-${i}`;
            return <button key={id} onClick={() => { setSelectedId(String(id)); setBody(JSON.stringify(row, null, 2)); }} className={`block w-full p-4 text-left hover:bg-[#fff8f8] ${String(id) === selectedId ? 'bg-[#fff8f8]' : ''}`}><span className="block font-semibold">{row.name || row.title || row.mentorName || row.userName || `${resource.label} #${id}`}</span><span className="mt-1 block text-xs text-[#6F6669]">ID: {String(id)}{row.status ? ` · ${row.status}` : ''}{row.isActive != null ? ` · ${row.isActive ? 'Đang hoạt động' : 'Đã tắt'}` : ''}</span></button>;
          })}</div>}
        </section>
        <section className="rounded-2xl border border-[#eadfd9] bg-white p-5">
          <h2 className="font-bold">Thao tác API</h2>
          <label className="mt-4 block text-sm font-medium">ID bản ghi<input value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-2 w-full rounded-lg border border-[#eadfd9] p-2" placeholder="Chọn từ danh sách hoặc nhập ID" /></label>
          <label className="mt-4 block text-sm font-medium">Request body JSON<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} spellCheck="false" className="mt-2 w-full rounded-lg border border-[#eadfd9] p-3 font-mono text-xs" /></label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {resource.create && <button disabled={busy} onClick={() => run('create')} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Tạo mới</button>}
            {resource.update && <button disabled={busy} onClick={() => run('update')} className="rounded-lg border border-[#eadfd9] px-3 py-2 text-sm font-semibold disabled:opacity-50">Cập nhật</button>}
            {resource.remove && <button disabled={busy} onClick={() => run('remove')} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Xóa / vô hiệu hóa</button>}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#6F6669]">Các trường JSON cần theo đúng schema API. Booking chỉ hỗ trợ cập nhật trạng thái/thông tin; lịch Mentor hỗ trợ tạo, sửa và xóa mềm.</p>
        </section>
      </div>
    </div>
  </AdminShell>;
}
