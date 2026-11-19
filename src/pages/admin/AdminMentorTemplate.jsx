import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { getAdminMentorShiftTemplate, getAdminMentors, unwrapApiList, unwrapApiResult } from '@/features/admin/api/adminApi.js';
import { AdminShell } from '@/layouts';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import { useLocale, translateTemplate } from '@/locales/locale.js';

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

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

function mentorName(mentor) {
  return mentor.fullName || mentor.name || [mentor.lastName, mentor.firstName].filter(Boolean).join(' ') || mentor.email || translateTemplate('Cố vấn #{0}', { 0: mentor.id });
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
  const { tr } = useLocale();
  return (
    <div className="rounded-2xl bg-rp-brand-tint px-3 py-3">
      <p className="text-[11px] text-rp-text-muted">{tr(label)}</p>
      <p className="mt-1 truncate text-[14px] font-semibold">{value || '—'}</p>
    </div>
  );
}

export default function AdminMentorTemplate() {
  const { trf, tr } = useLocale();
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
    <AdminShell pathname={pathname} breadcrumb={tr('Mẫu ca cố vấn')}>
      <main className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text">
        <header className="mb-5">
          <p className="rp-type-caption font-semibold tracking-[0.16em] text-rp-brand-strong">{tr('LỊCH')}</p>
          <h1 className="rp-type-page-title mt-1">{tr('Mẫu ca làm việc')}</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-rp-text-muted">
            {tr('Bảy cột bằng nhau, từ thứ Hai đến Chủ nhật. Lịch đã công bố nằm ở mục Lịch tuần.')}
          </p>
        </header>

        <section className="rounded-[22px] border border-rp-line bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:p-5">
          <label className="block text-[12px] font-medium text-rp-text-2">
            {tr('Cố vấn')}
            <select
              value={mentorId}
              onChange={(event) => setMentorId(event.target.value)}
              className={`mt-1.5 h-11 w-full rounded-2xl border border-rp-line bg-white px-3 text-[13px] ${focus}`}
            >
              <option value="">{tr('Chọn cố vấn')}</option>
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
          {mentors.isError && (
            <ContextualErrorState
              variant="inline"
              compact
              className="mt-3"
              error={mentors.error}
              title={tr('Chưa tải được danh sách cố vấn')}
              onRetry={() => mentors.refetch()}
              retrying={mentors.isFetching}
            />
          )}
          {mentors.isPending && <SakuraLoader variant="inline" size={16} context="profile" label={tr('Đang tải danh sách cố vấn')} delay={160} className="mt-3" />}
        </section>

        {mentorId && template.isPending && <SakuraLoader variant="section" context="cohort" label={tr('Đang tải mẫu ca')} delay={160} className="mt-4" />}
        {template.isError && (
          <div className="mt-4 rounded-[22px] border border-rp-line bg-white px-5">
            <ContextualErrorState
              compact
              error={template.error}
              title={tr('Chưa tải được mẫu ca cố vấn')}
              onRetry={() => template.refetch()}
              retrying={template.isFetching}
            />
          </div>
        )}

        {template.data && (
          <section className="mt-4 rounded-[22px] border border-rp-line bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:p-5">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Fact label={tr('Cố vấn')} value={template.data.mentorName || trf('Cố vấn #{0}', { 0: template.data.mentorId })} />
              <Fact label={tr('Múi giờ')} value={template.data.timeZoneId || 'Asia/Ho_Chi_Minh'} />
              <Fact label={tr('Công bố')} value={template.data.autoPublish ? 'Tự động' : 'Thủ công'} />
              <Fact label={tr('Đã sinh đến')} value={template.data.generatedThrough ? dayText(template.data.generatedThrough) : 'Chưa sinh'} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
              {WEEK.map(([weekday, label]) => {
                const dayRules = rules.filter((rule) => Number(rule.weekday) === weekday);
                return (
                  <article key={weekday} className="flex min-h-[148px] flex-col rounded-2xl border border-rp-line bg-rp-brand-tint p-3">
                    <p className="text-[12px] font-semibold tracking-wide text-rp-brand-strong">{tr(label)}</p>
                    <div className="mt-2 flex flex-1 flex-col gap-2">
                      {dayRules.map((rule) => (
                        <div key={rule.id} className="rounded-xl bg-white px-2.5 py-2">
                          <p className="text-[13px] font-semibold">{clock(rule.localStart)}–{clock(rule.localEnd)}</p>
                          <p className="mt-0.5 text-[11px] text-rp-text-muted">{tr(DAYPART[rule.daypartCode] || rule.daypartCode)}</p>
                        </div>
                      ))}
                      {!dayRules.length && (
                        <p className="flex flex-1 items-center text-[12px] text-rp-text-muted">{tr('Trống')}</p>
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
