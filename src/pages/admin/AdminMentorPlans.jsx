import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client.js';

const empty = { name: '', description: '', meetingSessionCount: 1, price: '', isActive: true };

const fieldClass =
  'mt-1.5 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-[#AD3155]/30';

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function AdminMentorPlans() {
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const query = useQuery({
    queryKey: ['admin-mentor-plans'],
    queryFn: async () => {
      const data = await api.get('/admin/plans');
      const plans = Array.isArray(data) ? data : data?.result || [];
      return plans.filter((plan) => Number(plan.meetingSessionCount) > 0);
    },
  });
  const save = useMutation({
    mutationFn: () => {
      const current = (query.data || []).find((plan) => plan.id === editId);
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        durationDays: Number(form.meetingSessionCount) === 3 ? 35 : 14,
        price: Number(form.price),
        aiGradingQuota: current?.aiGradingQuota || 0,
        meetingSessionCount: Number(form.meetingSessionCount),
        isPopular: Boolean(current?.isPopular),
        isTrial: Boolean(current?.isTrial),
        isActive: form.isActive,
        sortOrder: current?.sortOrder || 0,
        featureIds: (current?.features || []).map((feature) => feature.id).filter(Boolean),
      };
      return editId ? api.put(`/admin/plans/${editId}`, body) : api.post('/admin/plans', body);
    },
    onSuccess: async () => {
      setEditId(null);
      setForm(empty);
      await query.refetch();
    },
  });
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-[18px] font-semibold tracking-tight">Gói tư vấn 1–1</h2>
        <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#82737B]">
          Gói 1 buổi có hạn 14 ngày; gói 3 buổi có hạn 35 ngày. Mỗi buổi 50 phút, dùng cùng mentor. Giá do admin đặt; không thay đổi giá và hạn của gói đã mua.
        </p>
      </header>

      {(query.error || save.error) && (
        <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
          {(query.error || save.error).message}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!save.isPending) save.mutate();
        }}
        className="rounded-2xl border border-[#EADFE5] bg-white p-4 sm:p-5"
      >
        <h3 className="text-[15px] font-semibold text-[#4A3640]">
          {editId ? 'Chỉnh sửa gói' : 'Tạo gói tư vấn'}
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block text-[12px] text-[#8C7782]">
            Tên gói
            <input
              required
              maxLength={200}
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-[12px] text-[#8C7782]">
            Số buổi
            <select
              value={form.meetingSessionCount}
              onChange={(event) => update('meetingSessionCount', Number(event.target.value))}
              className={fieldClass}
            >
              <option value={1}>1 buổi · 14 ngày</option>
              <option value={3}>3 buổi · 35 ngày</option>
            </select>
          </label>
          <label className="block text-[12px] text-[#8C7782]">
            Giá trọn gói (VND)
            <input
              required
              type="number"
              min={1}
              max={2147483647}
              step={1}
              value={form.price}
              onChange={(event) => update('price', event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="mt-6 flex h-10 items-center gap-2 text-[13px] text-[#5A4550]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update('isActive', event.target.checked)}
              className="h-4 w-4 accent-[#AD3155]"
            />
            Mở bán
          </label>
          <label className="block text-[12px] text-[#8C7782] md:col-span-2">
            Mô tả
            <textarea
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              className={`${fieldClass} h-auto py-2`}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            disabled={save.isPending}
            className="h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50"
          >
            {save.isPending ? 'Đang lưu…' : 'Lưu gói'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setForm(empty); }}
              className="h-10 rounded-xl px-3 text-[13px] text-[#8C6070]"
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      {query.isPending && <p className="text-[13px] text-[#82737B]">Đang tải gói…</p>}
      {(query.data || []).map((plan) => (
        <article
          key={plan.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-white px-4 py-3"
        >
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold">{plan.name}</h3>
            <p className="mt-1 text-[12px] text-[#82737B]">
              {plan.meetingSessionCount} buổi · {plan.durationDays} ngày · {money(plan.price)}đ · {plan.isActive ? 'Đang mở bán' : 'Đã tắt'}
            </p>
            {plan.description ? (
              <p className="mt-1 text-[12px] leading-5 text-[#8C7782]">{plan.description}</p>
            ) : null}
            {![1, 3].includes(plan.meetingSessionCount) && (
              <p className="mt-1 text-[12px] text-[#9A6A2F]">Gói lịch sử, không mở cho lượt mua mới.</p>
            )}
          </div>
          {[1, 3].includes(plan.meetingSessionCount) && (
            <button
              type="button"
              onClick={() => {
                setEditId(plan.id);
                setForm({
                  name: plan.name,
                  description: plan.description || '',
                  meetingSessionCount: plan.meetingSessionCount,
                  price: plan.price,
                  isActive: plan.isActive,
                });
              }}
              className="h-9 rounded-xl border border-[#E7DAE1] px-3 text-[12px] text-[#8C6070]"
            >
              Chỉnh sửa / tắt mở bán
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
