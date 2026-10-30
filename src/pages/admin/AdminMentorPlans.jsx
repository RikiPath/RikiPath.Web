import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

const empty = { name: '', description: '', meetingSessionCount: 1, price: '', isActive: true };
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const fieldClass =
  'mt-1.5 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30';

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function sellable(plan) {
  return [1, 3].includes(Number(plan.meetingSessionCount));
}

function planBody(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    meetingSessionCount: Number(form.meetingSessionCount),
    price: Number(form.price),
    isActive: form.isActive,
  };
}

export default function AdminMentorPlans() {
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['admin-mentor-plans'],
    queryFn: async () => {
      const data = await api.get('/admin/mentor-plans');
      return Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];
    },
  });
  const plans = query.data || [];
  const current = plans.filter(sellable);
  const legacy = plans.filter((plan) => !sellable(plan));
  const save = useMutation({
    mutationFn: () => (editId ? api.put(`/admin/mentor-plans/${editId}`, planBody(form)) : api.post('/admin/mentor-plans', planBody(form))),
    onSuccess: async () => {
      setNotice(editId ? 'Đã cập nhật gói.' : 'Đã tạo gói.');
      setEditId(null);
      setForm(empty);
      setOpen(false);
      await query.refetch();
    },
  });
  const toggleSale = useMutation({
    mutationFn: (plan) => api.put(`/admin/mentor-plans/${plan.id}`, {
      name: plan.name,
      description: plan.description || '',
      meetingSessionCount: plan.meetingSessionCount,
      price: plan.price,
      isActive: !plan.isActive,
    }),
    onSuccess: async (_, plan) => {
      setNotice(plan.isActive ? 'Đã tắt bán gói.' : 'Đã mở bán gói.');
      await query.refetch();
    },
  });
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const closeForm = () => {
    setEditId(null);
    setForm(empty);
    setOpen(false);
  };
  const edit = (plan) => {
    setNotice('');
    setEditId(plan.id);
    setOpen(true);
    setForm({
      name: plan.name,
      description: plan.description || '',
      meetingSessionCount: plan.meetingSessionCount,
      price: plan.price,
      isActive: plan.isActive,
    });
  };
  const perSession = Number(form.meetingSessionCount) > 1 && Number(form.price) > 0
    ? Number(form.price) / Number(form.meetingSessionCount)
    : null;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">Gói tư vấn</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[#82737B]">
            1 buổi hạn 14 ngày, 3 buổi hạn 35 ngày. Mỗi buổi 50 phút, cùng một mentor. Giá gói đã mua không đổi.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => { setNotice(''); setEditId(null); setForm(empty); setOpen(true); }}
            className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}
          >
            Tạo gói
          </button>
        )}
      </header>

      {(query.error || save.error || toggleSale.error) && (
        <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
          {(query.error || save.error || toggleSale.error).message}
        </p>
      )}
      {notice && <p className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#2F6B45]">{notice}</p>}

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate();
          }}
          className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white shadow-[0_8px_24px_rgba(80,40,55,0.04)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#F3EDF0] px-5 py-4">
            <div>
              <h3 className="text-[16px] font-semibold">{editId ? 'Sửa gói' : 'Gói mới'}</h3>
              <p className="mt-0.5 text-[12px] text-[#8C7782]">Điền bên trái, thẻ bên phải là thứ học viên sẽ thấy.</p>
            </div>
            <button type="button" onClick={closeForm} className={`h-8 rounded-lg px-2.5 text-[12px] text-[#8C6070] hover:bg-[#F8F3F5] ${focus}`}>Đóng</button>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4 px-5 py-4">
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Tên gói
                <input required maxLength={200} value={form.name} placeholder="Ví dụ: Tư vấn N5" onChange={(event) => update('name', event.target.value)} className={fieldClass} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset>
                  <legend className="text-[12px] font-medium text-[#6E5360]">Số buổi</legend>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {[{ count: 1, days: 14 }, { count: 3, days: 35 }].map((option) => {
                      const on = Number(form.meetingSessionCount) === option.count;
                      return (
                        <button
                          key={option.count}
                          type="button"
                          aria-pressed={on}
                          onClick={() => update('meetingSessionCount', option.count)}
                          className={`rounded-xl border px-3 py-2 text-left ${focus} ${on ? 'border-[#AD3155] bg-[#FCEEF3]' : 'border-[#E7DAE1] bg-white hover:border-[#E7C9D6]'}`}
                        >
                          <span className={`block text-[13px] font-semibold ${on ? 'text-[#AD3155]' : 'text-[#49353F]'}`}>{option.count} buổi</span>
                          <span className="mt-0.5 block text-[11px] text-[#8C7782]">Hạn {option.days} ngày</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="block text-[12px] font-medium text-[#6E5360]">
                  Giá trọn gói
                  <span className="relative mt-1.5 block">
                    <input required type="number" min={1} max={2147483647} step={1} value={form.price} placeholder="150000" onChange={(event) => update('price', event.target.value)} className="h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 pr-8 text-[13px] text-[#352C31] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#A08B96]">đ</span>
                  </span>
                  <span className="mt-1.5 block min-h-4 text-[12px] text-[#AD3155]">{form.price ? money(form.price) : ''}{perSession ? ` · ${money(perSession)} / buổi` : ''}</span>
                </label>
              </div>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Mô tả
                <textarea rows={3} maxLength={2000} value={form.description} placeholder="Buổi 50 phút, đặt lịch với mentor đã chọn." onChange={(event) => update('description', event.target.value)} className={`${fieldClass} h-auto py-2 leading-5`} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl bg-[#FCFAFB] px-3 py-3">
                <span>
                  <span className="block text-[13px] font-medium text-[#49353F]">Mở bán</span>
                  <span className="mt-0.5 block text-[12px] text-[#8C7782]">Học viên thấy gói này ở trang mua.</span>
                </span>
                <input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} className="h-4 w-4 accent-[#AD3155]" />
              </label>
              <div className="flex justify-end">
                <button disabled={save.isPending} className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}>
                  {save.isPending ? 'Đang lưu…' : editId ? 'Lưu thay đổi' : 'Tạo gói'}
                </button>
              </div>
            </div>
            <aside className="border-t border-[#F3EDF0] bg-[#FCF8FA] px-5 py-4 lg:border-t-0 lg:border-l">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#A08B96]">Xem trước</p>
              <div className="mt-3 rounded-2xl border border-[#F0E4EA] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] text-[#8C7782]">{form.meetingSessionCount} buổi · {Number(form.meetingSessionCount) === 1 ? 14 : 35} ngày</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${form.isActive ? 'bg-[#E7F6EC] text-[#1E5C36]' : 'bg-[#F4EEF1] text-[#8C7782]'}`}>
                    {form.isActive ? 'Mở bán' : 'Đã tắt'}
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-6">{form.name.trim() || 'Tên gói'}</p>
                <p className="mt-3 text-[20px] font-semibold text-[#AD3155]">{form.price ? money(form.price) : '—'}</p>
                <p className="mt-0.5 text-[12px] text-[#A08B96]">{perSession ? `${money(perSession)} / buổi` : 'Giá trọn gói'}</p>
                {form.description.trim() ? <p className="mt-3 line-clamp-3 text-[12px] leading-5 text-[#82737B]">{form.description.trim()}</p> : null}
              </div>
            </aside>
          </div>
        </form>
      )}

      {query.isPending && <p className="text-[13px] text-[#82737B]">Đang tải gói…</p>}
      {!query.isPending && !current.length && (
        <p className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-6 text-[13px] text-[#82737B]">Chưa có gói 1 buổi hoặc 3 buổi. Bấm Tạo gói để thêm.</p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {current.map((plan) => {
          const sessions = Number(plan.meetingSessionCount);
          const unit = sessions > 1 ? Number(plan.price) / sessions : null;
          const active = Boolean(plan.isActive);
          return (
            <article key={plan.id} className={`rounded-2xl border bg-white p-4 ${editId === plan.id ? 'border-[#AD3155]' : 'border-[#EADFE5]'}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] text-[#8C7782]">{sessions} buổi · {plan.durationDays} ngày</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${active ? 'bg-[#E7F6EC] text-[#1E5C36]' : 'bg-[#F4EEF1] text-[#8C7782]'}`}>
                  {active ? 'Mở bán' : 'Đã tắt'}
                </span>
              </div>
              <h3 className="mt-2 text-[16px] font-semibold leading-6">{plan.name}</h3>
              <p className="mt-3 text-[22px] font-semibold tracking-tight text-[#AD3155]">{money(plan.price)}</p>
              <p className="mt-0.5 text-[12px] text-[#A08B96]">{unit ? `${money(unit)} / buổi` : 'Giá trọn gói'}</p>
              {plan.description ? <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[#82737B]">{plan.description}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => edit(plan)} className={`h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] text-[#6E5360] hover:bg-[#FDFAFC] ${focus}`}>Sửa</button>
                <button
                  type="button"
                  disabled={toggleSale.isPending}
                  onClick={() => { setNotice(''); toggleSale.mutate(plan); }}
                  className={`h-9 rounded-lg px-3 text-[12px] font-medium ${focus} ${active ? 'text-[#8A5A10] hover:bg-[#FFF6E8]' : 'text-[#1E5C36] hover:bg-[#E7F6EC]'}`}
                >
                  {toggleSale.isPending && toggleSale.variables?.id === plan.id ? 'Đang lưu…' : active ? 'Tắt bán' : 'Mở bán'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {legacy.length > 0 && (
        <details className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-3">
          <summary className={`cursor-pointer text-[13px] font-medium text-[#6E5360] ${focus}`}>Gói cũ ({legacy.length})</summary>
          <div className="mt-3 space-y-2">
            {legacy.map((plan) => (
              <p key={plan.id} className="text-[12px] leading-5 text-[#82737B]">
                <span className="font-medium text-[#49353F]">{plan.name}</span>
                {' · '}{plan.meetingSessionCount} buổi · {money(plan.price)} · không mở cho lượt mua mới
              </p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
