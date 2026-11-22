import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Repeat } from 'lucide-react';
import { getAdminMentorShiftTemplate, getAdminMentors, unwrapApiList, unwrapApiResult } from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS } from '@/features/admin/api/adminQueryKeys.js';
import { AdminShell } from '@/layouts';
import {
  Badge,
  Banner,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  FeatureIcon,
  Field,
  PageHeader,
  SakuraLoader,
} from '@/components/ui';
import { translateTemplate, useLocale } from '@/locales/locale.js';

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

function mentorName(mentor) {
  return (
    mentor.fullName ||
    mentor.name ||
    [mentor.lastName, mentor.firstName].filter(Boolean).join(' ') ||
    mentor.email ||
    translateTemplate('Giáo viên #{0}', { 0: mentor.id })
  );
}

function clock(value) {
  return String(value || '').slice(0, 5);
}

function dayText(value) {
  const text = String(value || '').slice(0, 10);
  const [year, month, day] = text.split('-');
  return day && month && year ? `${day}/${month}/${year}` : '—';
}

export default function AdminMentorTemplate() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const [mentorId, setMentorId] = useState('');

  const mentors = useQuery({
    queryKey: ADMIN_KEYS.mentorProfiles,
    queryFn: async () => unwrapApiList(await getAdminMentors()),
  });

  const template = useQuery({
    queryKey: [...ADMIN_KEYS.mentorTemplates, mentorId],
    queryFn: async () => unwrapApiResult(await getAdminMentorShiftTemplate(mentorId)),
    enabled: Boolean(mentorId),
  });

  const mentorOptions = useMemo(
    () =>
      (mentors.data || []).map((m) => ({
        value: String(m.id || m.mentorId || m.userId),
        label: mentorName(m),
      })),
    [mentors.data],
  );

  const rules = template.data?.rules || [];

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Lịch cố định tuần')}>
      <main data-page="AdminMentorTemplate" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Vận hành & lịch dạy')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="calendar" icon={Repeat} size="lg" />
              <span>{tr('Lịch cố định tuần (mẫu ca tham khảo)')}</span>
            </span>
          }
          description={tr('Xem khung ca cố định hàng tuần do Giáo viên khai báo. Để phê duyệt các buổi dạy thực tế, hãy mở Duyệt lịch dạy.')}
          actions={
            <Link
              to="/admin/mentor-schedules/"
              className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
            >
              <CalendarDays className="h-4 w-4" />
              <span>{tr('Mở Duyệt lịch dạy')}</span>
            </Link>
          }
        />

        <Banner tone="info" title={tr('Phân biệt Mẫu ca & Lịch dạy chính thức')}>
          {tr('Mẫu ca chỉ phản ánh khung thời gian đăng ký lặp lại tham khảo. Chỉ các khung giờ đã được Admin duyệt tại mục Duyệt lịch dạy mới dùng để mở lớp.')}
        </Banner>

        <Card className="p-4">
          <div className="max-w-md">
            <Field label={tr('Chọn Giáo viên')}>
              <CustomSelect
                value={mentorId}
                aria-label={tr('Chọn Giáo viên')}
                onChange={setMentorId}
                options={[{ value: '', label: tr('Chọn Giáo viên để xem mẫu ca') }, ...mentorOptions]}
              />
            </Field>
          </div>
          {mentors.isError && (
            <div className="mt-3">
              <ContextualErrorState
                compact
                error={mentors.error}
                title={tr('Chưa tải được danh sách Giáo viên')}
                onRetry={() => mentors.refetch()}
              />
            </div>
          )}
          {mentors.isPending && (
            <div className="mt-3">
              <SakuraLoader variant="inline" size={16} context="profile" label={tr('Đang tải danh sách Giáo viên')} delay={140} />
            </div>
          )}
        </Card>

        {!mentorId ? (
          <ContextualEmptyState
            icon={Repeat}
            title={tr('Chưa chọn Giáo viên')}
            description={tr('Chọn một Giáo viên ở trên để xem cấu hình lịch cố định tuần hiện tại.')}
          />
        ) : template.isPending ? (
          <SakuraLoader variant="section" context="cohort" label={tr('Đang tải mẫu ca')} delay={140} />
        ) : template.isError ? (
          <ContextualErrorState
            compact
            error={template.error}
            title={tr('Chưa tải được mẫu ca Giáo viên')}
            onRetry={() => template.refetch()}
          />
        ) : template.data ? (
          <Card className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: tr('Giáo viên'), value: template.data.mentorName || trf('Giáo viên #{0}', { 0: template.data.mentorId }) },
                { label: tr('Múi giờ'), value: template.data.timeZoneId || 'Asia/Ho_Chi_Minh' },
                { label: tr('Chế độ sinh ca'), value: template.data.autoPublish ? tr('Tự động') : tr('Thủ công') },
                { label: tr('Đã sinh đến'), value: template.data.generatedThrough ? dayText(template.data.generatedThrough) : tr('Chưa sinh') },
              ].map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-rp-line bg-rp-brand-tint/40 px-3.5 py-3">
                  <p className="text-xs text-rp-text-muted">{fact.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-rp-text">{fact.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
              {WEEK.map(([weekday, label]) => {
                const dayRules = rules.filter((rule) => Number(rule.weekday) === weekday);
                return (
                  <article key={weekday} className="flex min-h-[140px] flex-col rounded-2xl border border-rp-line bg-rp-bg-2/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rp-brand-strong">{tr(label)}</span>
                      {dayRules.length > 0 && <Badge tone="brand" size="sm" icon={false}>{dayRules.length}</Badge>}
                    </div>
                    <div className="mt-2 flex flex-1 flex-col gap-2">
                      {dayRules.map((rule) => (
                        <div key={rule.id} className="rounded-xl border border-rp-line bg-white px-2.5 py-2">
                          <p className="tabular-nums text-xs font-bold text-rp-text">
                            {clock(rule.localStart)}–{clock(rule.localEnd)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-rp-text-muted">
                            {tr(DAYPART[rule.daypartCode] || rule.daypartCode)}
                          </p>
                        </div>
                      ))}
                      {!dayRules.length && (
                        <p className="flex flex-1 items-center text-xs text-rp-text-muted">{tr('Trống')}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>
        ) : null}
      </main>
    </AdminShell>
  );
}
