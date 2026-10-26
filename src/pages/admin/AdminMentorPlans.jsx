import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client.js';

const empty = { name: '', description: '', meetingSessionCount: 1, price: '', isActive: true };
export default function AdminMentorPlans() {
  const [form, setForm] = useState(empty); const [editId, setEditId] = useState(null);
  const query = useQuery({ queryKey: ['admin-mentor-plans'], queryFn: async () => (await api.get('/admin/mentor-plans')).result || [] });
  const save = useMutation({ mutationFn: () => editId ? api.put(`/admin/mentor-plans/${editId}`, { ...form, price: Number(form.price) }) : api.post('/admin/mentor-plans', { ...form, price: Number(form.price) }),
    onSuccess: async () => { setEditId(null); setForm(empty); await query.refetch(); } });
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  return <section className="space-y-5"><header><h2 className="text-xl font-bold">Gói tư vấn 1–1</h2><p className="mt-2 text-sm">Gói 1 buổi có hạn 14 ngày; gói 3 buổi có hạn 35 ngày. Mỗi buổi 50 phút, dùng cùng mentor. Giá do admin đặt; không thay đổi giá và hạn của gói đã mua.</p></header>
    {(query.error || save.error) && <p role="alert" className="text-red-700">{(query.error || save.error).message}</p>}
    <form onSubmit={e => { e.preventDefault(); if (!save.isPending) save.mutate(); }} className="rounded-2xl border bg-white p-5 grid gap-4 md:grid-cols-2"><h3 className="font-bold md:col-span-2">{editId ? 'Chỉnh sửa gói' : 'Tạo gói tư vấn'}</h3>
      <label>Tên gói<input required maxLength={200} className="block w-full border rounded-lg p-2 mt-1" value={form.name} onChange={e => update('name', e.target.value)}/></label>
      <label>Số buổi<select className="block w-full border rounded-lg p-2 mt-1" value={form.meetingSessionCount} onChange={e => update('meetingSessionCount', Number(e.target.value))}><option value={1}>1 buổi · 14 ngày</option><option value={3}>3 buổi · 35 ngày</option></select></label>
      <label>Giá trọn gói (VND)<input required type="number" min={1} max={2147483647} step={1} className="block w-full border rounded-lg p-2 mt-1" value={form.price} onChange={e => update('price', e.target.value)}/></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)}/>Mở bán</label>
      <label className="md:col-span-2">Mô tả<textarea maxLength={2000} className="block w-full border rounded-lg p-2 mt-1" value={form.description} onChange={e => update('description', e.target.value)}/></label>
      <div className="flex gap-4"><button disabled={save.isPending} className="rounded-full bg-[#9E2A4B] px-5 py-2 text-white">{save.isPending ? 'Đang lưu…' : 'Lưu gói'}</button>{editId && <button type="button" onClick={() => { setEditId(null); setForm(empty); }}>Hủy sửa</button>}</div>
    </form>
    {query.isPending && <p>Đang tải gói…</p>}
    {(query.data || []).map(p => <article key={p.id} className="rounded-xl border bg-white p-4 flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{p.name}</h3><p className="text-sm">{p.meetingSessionCount} buổi · {p.durationDays} ngày · {new Intl.NumberFormat('vi-VN').format(p.price)}đ · {p.isActive ? 'Đang mở bán' : 'Đã tắt'}</p>{![1,3].includes(p.meetingSessionCount) && <p className="text-sm text-amber-800">Gói lịch sử, không mở cho lượt mua mới.</p>}</div>{[1,3].includes(p.meetingSessionCount) && <button onClick={() => { setEditId(p.id); setForm({ name: p.name, description: p.description || '', meetingSessionCount: p.meetingSessionCount, price: p.price, isActive: p.isActive }); }}>Chỉnh sửa / tắt mở bán</button>}</article>)}
  </section>;
}
