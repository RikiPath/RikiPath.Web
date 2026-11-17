import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { getAdminMentorShiftTemplate, getAdminMentors, unwrapApiList, unwrapApiResult } from '../../api/admin.js';
import { AdminShell } from '../../components/shells';

const WEEK = [
  [1, 'T2'],
  [2, 'T3'],
  [3, 'T4'],
  [4, 'T5'],
  [5, 'T6'],
  [6, 'T7'],
  [0, 'CN'],
];

const DAYPART = {
  Morning: 'Sáng',
  Noon: 'Trưa',
  Afternoon: 'Chiều',
  Evening: 'Tối',
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function mentorName(mentor) {
  return mentor.fullName || mentor.name || [mentor.lastName, mentor.firstName].filter(Boolean).join(' ') || mentor.email || `Cố vấn #${mentor.id}`;
}

function clock(value) {
  return String(value || '').slice(0, 5);
}

function dayText(value) {
  const text = String(value || '').slice(0, 10);
  const [year, month, day] = text.split('-');
  return day && month && year ? `${day}/${month}/${year}` : '—';
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#FDF2F5] px-3 py-3">
      <p className="text-[11px] text-[#967F8A]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-semibold">{value || '—'}</p>
    </div>
  );
}

export default function AdminMentorTemplate() {
  const { pathname } = useLocation();
  const [mentorId, setMentorId] = useState('');
  const mentors = useQuery({
    queryKey: ['admin-mentors'],
    queryFn: async () => unwrapApiList(await getAdminMentors()),
  });
  const template = useQuery({
    queryKey: ['admin-mentor-template', mentorId],
    queryFn: async () => unwrapApiResult(await getAdminMentorShiftTemplate(mentorId)),
    enabled: Boolean(mentorId),
  });
  const rules = template.data?.rules || [];

  return (
    <AdminShell pathname={pathname} breadcrumb="Mẫu ca cố vấn">
      <main className="mx-auto max-w-[1080px] px-4 py-6 text-[#49353F] sm:px-6">
        <header className="mb-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">LỊCH</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Mẫu ca làm việc</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#8C7782]">
            Bảy cột bằng nhau, từ thứ Hai đến Chủ nhật. Lịch đã công bố nằm ở mục Lịch tuần.
          </p>
        </header>

        <section className="rounded-[22px] border border-[#F0E4E9] bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:p-5">
          <label className="block text-[12px] font-medium text-[#6E5360]">
            Cố vấn
            <select
              value={mentorId}
              onChange={(event) => setMentorId(event.target.value)}
              className={`mt-1.5 h-11 w-full rounded-2xl border border-[#EADFE5] bg-white px-3 text-[13px] ${focus}`}
            >
              <option value="">Chọn cố vấn</option>
              {(mentors.data || []).map((mentor) => {
                const id = mentor.id || mentor.mentorId || mentor.userId;
                return (
                  <option key={id} value={id}>
                    {mentorName(mentor)}
                  </option>
                );
              })}
            </select>
          </label>
          {mentors.isError && <p role="alert" className="mt-3 text-[13px] text-[#A33357]">{mentors.error.message}</p>}
          {mentors.isPending && <p className="mt-3 text-[13px] text-[#A08B96]">Đang tải danh sách cố vấn…</p>}
        </section>

        {mentorId && template.isPending && <p className="mt-4 text-[13px] text-[#A08B96]">Đang tải mẫu ca…</p>}
        {template.isError && (
          <p role="alert" className="mt-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{template.error.message}</p>
        )}

        {template.data && (
          <section className="mt-4 rounded-[22px] border border-[#F0E4E9] bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:p-5">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Fact label="Cố vấn" value={template.data.mentorName || `Cố vấn #${template.data.mentorId}`} />
              <Fact label="Múi giờ" value={template.data.timeZoneId || 'Asia/Ho_Chi_Minh'} />
              <Fact label="Công bố" value={template.data.autoPublish ? 'Tự động' : 'Thủ công'} />
              <Fact label="Đã sinh đến" value={template.data.generatedThrough ? dayText(template.data.generatedThrough) : 'Chưa sinh'} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {WEEK.map(([weekday, label]) => {
                const dayRules = rules.filter((rule) => Number(rule.weekday) === weekday);
                return (
                  <article key={weekday} className="flex min-h-[148px] flex-col rounded-2xl border border-[#F3E7EC] bg-[#FFFBFC] p-3">
                    <p className="text-[12px] font-semibold tracking-wide text-[#AD3155]">{label}</p>
                    <div className="mt-2 flex flex-1 flex-col gap-2">
                      {dayRules.map((rule) => (
                        <div key={rule.id} className="rounded-xl bg-white px-2.5 py-2">
                          <p className="text-[13px] font-semibold">{clock(rule.localStart)}–{clock(rule.localEnd)}</p>
                          <p className="mt-0.5 text-[11px] text-[#8C7782]">{DAYPART[rule.daypartCode] || rule.daypartCode}</p>
                        </div>
                      ))}
                      {!dayRules.length && (
                        <p className="flex flex-1 items-center text-[12px] text-[#C4B0B8]">Trống</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </AdminShell>
  );
}
