import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  SUPPORTED_JLPT_LEVELS,
  createAdminMentorPlan,
  formatVnd,
  getAdminMentorPlans,
  isSupportedJlptLevel,
  normalizeJlptLevel,
  updateAdminMentorPlan,
} from '../../api/mentorCompensationApi.js';

const empty = {
  name: '',
  description: '',
  jlptLevel: 'N3',
  meetingSessionCount: 1,
  price: '',
  isActive: true,
};

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const fieldClass =
  'mt-1.5 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30';

function sellable(plan) {
  return [1, 3].includes(Number(plan.meetingSessionCount));
}

function durationForSessions(count, fallback) {
  const num = Number(count);
  if (num === 1) return 30;
  if (num === 3 || num === 5) return 90;
  return fallback || 30;
}

function planBody(form) {
  const jlptLevel = normalizeJlptLevel(form.jlptLevel || 'N3');
  if (!isSupportedJlptLevel(jlptLevel)) {
    throw new Error('Gói tư vấn chỉ hỗ trợ trình độ JLPT N5, N4, N3 và N2 (không hỗ trợ N1).');
  }
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    jlptLevel,
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
  const [levelFilter, setLevelFilter] = useState('ALL');

  const query = useQuery({
    queryKey: ['admin-mentor-plans'],
    queryFn: getAdminMentorPlans,
  });

  const plans = query.data || [];
  const filteredPlans = plans.filter((plan) => {
    if (levelFilter === 'ALL') return true;
    return normalizeJlptLevel(plan.jlptLevel) === levelFilter;
  });

  const current = filteredPlans.filter(sellable);
  const legacy = filteredPlans.filter((plan) => !sellable(plan));

  const save = useMutation({
    mutationFn: () =>
      editId
        ? updateAdminMentorPlan(editId, planBody(form))
        : createAdminMentorPlan(planBody(form)),
    onSuccess: async () => {
      setNotice(editId ? 'Đã cập nhật gói tư vấn theo trình độ JLPT.' : 'Đã tạo gói tư vấn mới.');
      setEditId(null);
      setForm(empty);
      setOpen(false);
      await query.refetch();
    },
  });

  const toggleSale = useMutation({
    mutationFn: (plan) =>
      updateAdminMentorPlan(plan.id, {
        name: plan.name,
        description: plan.description || '',
        jlptLevel: plan.jlptLevel || 'N3',
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
      jlptLevel: normalizeJlptLevel(plan.jlptLevel) || 'N3',
      meetingSessionCount: plan.meetingSessionCount,
      price: plan.price,
      isActive: plan.isActive,
    });
  };

  const perSession =
    Number(form.meetingSessionCount) > 1 && Number(form.price) > 0
      ? Number(form.price) / Number(form.meetingSessionCount)
      : null;

  return (
    <section className="space-y-4" data-testid="admin-mentor-plans">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">
            Gói tư vấn theo trình độ JLPT (N5–N2)
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[#82737B]">
            1 buổi hạn 30 ngày, 3 buổi hạn 90 ngày (và gói lịch sử 5 buổi hạn 90 ngày). Mỗi buổi tư vấn 1-1 kéo dài 90 phút theo trình độ JLPT N5–N2 (không hỗ trợ N1). Giá gói đã mua không thay đổi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-[#E7DAE1] bg-white p-1">
            {['ALL', ...SUPPORTED_JLPT_LEVELS].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                  levelFilter === lvl
                    ? 'bg-[#AD3155] text-white'
                    : 'text-[#6E5360] hover:bg-[#FAF4F7]'
                }`}
              >
                {lvl === 'ALL' ? 'Tất cả (N5–N2)' : lvl}
              </button>
            ))}
          </div>
          {!open && (
            <button
              type="button"
              onClick={() => {
                setNotice('');
                setEditId(null);
                setForm(empty);
                setOpen(true);
              }}
              className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}
            >
              Tạo gói
            </button>
          )}
        </div>
      </header>

      {(query.error || save.error || toggleSale.error) && (
        <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
          {(query.error || save.error || toggleSale.error).message}
        </p>
      )}
      {notice && (
        <p className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#2F6B45]">{notice}</p>
      )}

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
              <h3 className="text-[16px] font-semibold">
                {editId ? 'Sửa gói tư vấn' : 'Tạo gói tư vấn mới'}
              </h3>
              <p className="mt-0.5 text-[12px] text-[#8C7782]">
                Cấu hình trình độ JLPT (N5–N2), số buổi và đơn giá trọn gói VND.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className={`h-8 rounded-lg px-2.5 text-[12px] text-[#8C6070] hover:bg-[#F8F3F5] ${focus}`}
            >
              Đóng
            </button>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[12px] font-medium text-[#6E5360]">
                  Tên gói
                  <input
                    required
                    maxLength={200}
                    value={form.name}
                    placeholder="Ví dụ: Gói 3 buổi tư vấn JLPT N3"
                    onChange={(event) => update('name', event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <fieldset>
                  <legend className="text-[12px] font-medium text-[#6E5360]">
                    Trình độ JLPT áp dụng (chỉ N5–N2)
                  </legend>
                  <div className="mt-1.5 grid grid-cols-4 gap-2">
                    {SUPPORTED_JLPT_LEVELS.map((lvl) => {
                      const activeLvl = normalizeJlptLevel(form.jlptLevel) === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          aria-pressed={activeLvl}
                          onClick={() => update('jlptLevel', lvl)}
                          className={`h-10 rounded-xl border text-[13px] font-semibold transition ${focus} ${
                            activeLvl
                              ? 'border-[#AD3155] bg-[#FCEEF3] text-[#AD3155]'
                              : 'border-[#E7DAE1] bg-white text-[#49353F] hover:border-[#E7C9D6]'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset>
                  <legend className="text-[12px] font-medium text-[#6E5360]">Số buổi (90 phút/buổi)</legend>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {[
                      { count: 1, days: 30 },
                      { count: 3, days: 90 },
                    ].map((option) => {
                      const on = Number(form.meetingSessionCount) === option.count;
                      return (
                        <button
                          key={option.count}
                          type="button"
                          aria-pressed={on}
                          onClick={() => update('meetingSessionCount', option.count)}
                          className={`rounded-xl border px-3 py-2 text-left ${focus} ${
                            on
                              ? 'border-[#AD3155] bg-[#FCEEF3]'
                              : 'border-[#E7DAE1] bg-white hover:border-[#E7C9D6]'
                          }`}
                        >
                          <span
                            className={`block text-[13px] font-semibold ${
                              on ? 'text-[#AD3155]' : 'text-[#49353F]'
                            }`}
                          >
                            {option.count} buổi
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#8C7782]">
                            Hạn {option.days} ngày
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="block text-[12px] font-medium text-[#6E5360]">
                  Giá trọn gói (VND)
                  <span className="relative mt-1.5 block">
                    <input
                      required
                      type="number"
                      min={1}
                      max={2147483647}
                      step={1}
                      value={form.price}
                      placeholder="300000"
                      onChange={(event) => update('price', event.target.value)}
                      className="h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 pr-8 text-[13px] text-[#352C31] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#A08B96]">
                      đ
                    </span>
                  </span>
                  <span className="mt-1.5 block min-h-4 text-[12px] text-[#AD3155]">
                    {form.price ? formatVnd(form.price) : ''}
                    {perSession ? ` · ${formatVnd(perSession)} / buổi` : ''}
                  </span>
                </label>
              </div>

              <label className="block text-[12px] font-medium text-[#6E5360]">
                Mô tả
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  placeholder="Buổi tư vấn 1-1 thời lượng 90 phút theo trình độ JLPT với cố vấn đạt chuẩn."
                  onChange={(event) => update('description', event.target.value)}
                  className={`${fieldClass} h-auto py-2 leading-5`}
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl bg-[#FCFAFB] px-3 py-3">
                <span>
                  <span className="block text-[13px] font-medium text-[#49353F]">Mở bán</span>
                  <span className="mt-0.5 block text-[12px] text-[#8C7782]">
                    Học viên thấy gói này ở danh mục mua vé tư vấn.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => update('isActive', event.target.checked)}
                  className="h-4 w-4 accent-[#AD3155]"
                />
              </label>

              <div className="flex justify-end">
                <button
                  disabled={save.isPending}
                  className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
                >
                  {save.isPending ? 'Đang lưu…' : editId ? 'Lưu thay đổi' : 'Tạo gói'}
                </button>
              </div>
            </div>

            <aside className="border-t border-[#F3EDF0] bg-[#FCF8FA] px-5 py-4 lg:border-t-0 lg:border-l">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#A08B96]">
                Xem trước thẻ học viên
              </p>
              <div className="mt-3 rounded-2xl border border-[#F0E4EA] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-[#FCEEF3] px-2 py-0.5 text-[11px] font-bold text-[#AD3155]">
                      JLPT {form.jlptLevel || 'N3'}
                    </span>
                    <span className="text-[12px] text-[#8C7782]">
                      {form.meetingSessionCount} buổi · {durationForSessions(form.meetingSessionCount)} ngày
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      form.isActive
                        ? 'bg-[#E7F6EC] text-[#1E5C36]'
                        : 'bg-[#F4EEF1] text-[#8C7782]'
                    }`}
                  >
                    {form.isActive ? 'Mở bán' : 'Đã tắt'}
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-6">
                  {form.name.trim() || 'Tên gói'}
                </p>
                <p className="mt-3 text-[20px] font-semibold text-[#AD3155]">
                  {form.price ? formatVnd(form.price) : '—'}
                </p>
                <p className="mt-0.5 text-[12px] text-[#A08B96]">
                  {perSession ? `${formatVnd(perSession)} / buổi (90 phút)` : 'Giá trọn gói (90 phút/buổi)'}
                </p>
                {form.description.trim() ? (
                  <p className="mt-3 line-clamp-3 text-[12px] leading-5 text-[#82737B]">
                    {form.description.trim()}
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </form>
      )}

      {query.isPending && <p className="text-[13px] text-[#82737B]">Đang tải gói…</p>}
      {!query.isPending && !current.length && (
        <p className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-6 text-[13px] text-[#82737B]">
          Chưa có gói 1 buổi hoặc 3 buổi cho bộ lọc hiện tại. Bấm Tạo gói để thêm.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {current.map((plan) => {
          const sessions = Number(plan.meetingSessionCount);
          const unit = sessions > 1 ? Number(plan.price) / sessions : null;
          const active = Boolean(plan.isActive);
          const level = normalizeJlptLevel(plan.jlptLevel) || 'N5–N2';
          const days = durationForSessions(sessions, plan.durationDays);
          return (
            <article
              key={plan.id}
              className={`rounded-2xl border bg-white p-4 ${
                editId === plan.id ? 'border-[#AD3155]' : 'border-[#EADFE5]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#FCEEF3] px-2 py-0.5 text-[11px] font-bold text-[#AD3155]">
                    JLPT {level}
                  </span>
                  <p className="text-[12px] text-[#8C7782]">
                    {sessions} buổi · {days} ngày · 90 phút/buổi
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    active ? 'bg-[#E7F6EC] text-[#1E5C36]' : 'bg-[#F4EEF1] text-[#8C7782]'
                  }`}
                >
                  {active ? 'Mở bán' : 'Đã tắt'}
                </span>
              </div>
              <h3 className="mt-2 text-[16px] font-semibold leading-6">{plan.name}</h3>
              <p className="mt-3 text-[22px] font-semibold tracking-tight text-[#AD3155]">
                {formatVnd(plan.price)}
              </p>
              <p className="mt-0.5 text-[12px] text-[#A08B96]">
                {unit ? `${formatVnd(unit)} / buổi` : 'Giá trọn gói'}
              </p>
              {plan.description ? (
                <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[#82737B]">
                  {plan.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => edit(plan)}
                  className={`h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] text-[#6E5360] hover:bg-[#FDFAFC] ${focus}`}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  disabled={toggleSale.isPending}
                  onClick={() => {
                    setNotice('');
                    toggleSale.mutate(plan);
                  }}
                  className={`h-9 rounded-lg px-3 text-[12px] font-medium ${focus} ${
                    active
                      ? 'text-[#8A5A10] hover:bg-[#FFF6E8]'
                      : 'text-[#1E5C36] hover:bg-[#E7F6EC]'
                  }`}
                >
                  {toggleSale.isPending && toggleSale.variables?.id === plan.id
                    ? 'Đang lưu…'
                    : active
                      ? 'Tắt bán'
                      : 'Mở bán'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {legacy.length > 0 && (
        <details className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-3">
          <summary className={`cursor-pointer text-[13px] font-medium text-[#6E5360] ${focus}`}>
            Gói 5 buổi / Gói lịch sử ({legacy.length})
          </summary>
          <div className="mt-3 space-y-2">
            {legacy.map((plan) => (
              <p key={plan.id} className="text-[12px] leading-5 text-[#82737B]">
                <span className="font-medium text-[#49353F]">{plan.name}</span>
                {plan.jlptLevel ? ` · JLPT ${plan.jlptLevel}` : ''}
                {' · '}
                {plan.meetingSessionCount} buổi ({durationForSessions(plan.meetingSessionCount, plan.durationDays)} ngày) · {formatVnd(plan.price)} · chỉ áp dụng cho quyền lợi đã cấp
              </p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
