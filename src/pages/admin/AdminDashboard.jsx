import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, CalendarCheck, CreditCard, GraduationCap, Layers, School, ShieldCheck, UserCog, UsersRound } from 'lucide-react';
import { getAdminDashboard } from '@/features/admin/api/adminApi.js';
import { getSession } from '@/app/auth/session.js';
import { AdminShell } from '@/layouts';
import { Card, CardHeader, ErrorState, PageHeader, RefreshingIndicator, SakuraLoader } from '@/components/ui';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

// Figures come only from GET /admin/dashboard (AdminDashboardResponse). No payout, revenue
// or invented trend data. The legacy 1-1 booking count is intentionally not shown.
const ATTENTION = [
  { key: 'pendingContent', label: 'Nội dung chờ duyệt', hint: 'Bài học, từ vựng, câu hỏi đã gửi', to: '/admin/content-review/', icon: ShieldCheck },
  { key: 'pendingMentorSchedules', label: 'Khung giờ dạy chờ duyệt', hint: 'Mentor đăng ký lịch dạy lớp nhóm', to: '/admin/mentor-schedules/', icon: CalendarCheck },
];

const FIGURES = [
  { key: 'totalUsers', label: 'Tài khoản hoạt động', to: '/admin/users/', icon: UserCog, tone: 'bg-tone-reading-bg text-tone-reading' },
  { key: 'learners', label: 'Học viên', to: '/admin/users/', icon: GraduationCap, tone: 'bg-tone-vocab-bg text-tone-vocab' },
  { key: 'mentors', label: 'Mentor', to: '/admin/mentors/', icon: UsersRound, tone: 'bg-tone-mentor-bg text-tone-mentor' },
  { key: 'activePlans', label: 'Gói tự học mở bán', to: '/admin/study-courses/', icon: Layers, tone: 'bg-tone-grammar-bg text-tone-grammar' },
  { key: 'paidSubscriptions', label: 'Lượt mua đã thanh toán', to: '/admin/study-courses/', icon: CreditCard, tone: 'bg-rp-brand-tint text-rp-brand-strong' },
];

const SHORTCUTS = [
  { to: '/admin/study-courses/', label: 'Gói học, lớp & ghi danh', icon: School },
  { to: '/admin/mentor-verifications/', label: 'Xét duyệt hồ sơ Mentor', icon: BadgeCheck },
  { to: '/admin/slot-review/', label: 'Yêu cầu đổi/hủy lịch', icon: CalendarCheck },
];

function fmt(n) {
  return Number.isFinite(n) ? n.toLocaleString(currentIntlTag()) : '—';
}

export default function AdminDashboard() {
  const { tr } = useLocale();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const query = useQuery({
    queryKey: ['admin-dashboard', uid, session?.isPreview ? 'preview' : 'live'],
    queryFn: async () => {
      if (session?.isPreview) {
        return {
          totalUsers: 0,
          learners: 0,
          mentors: 0,
          activePlans: 0,
          paidSubscriptions: 0,
          pendingContent: 0,
          pendingMentorSchedules: 0,
        };
      }
      const data = await getAdminDashboard();
      return data?.result ?? data;
    },
  });
  const stats = query.data || {};
  const value = (key) => (typeof stats[key] === 'number' ? stats[key] : null);

  return (
    <AdminShell breadcrumb={tr('Tổng quan')}>
      <div className="rp-container rp-cq py-[var(--rp-space-page-y)]">
        <PageHeader
          title={tr('Tổng quan hệ thống')}
          description={tr('Việc cần xử lý và số liệu hiện tại lấy trực tiếp từ máy chủ.')}
          actions={<RefreshingIndicator active={query.isFetching && !query.isPending} />}
        />

        {query.isPending ? (
          <SakuraLoader variant="section" context="dashboard" label={tr('Đang tải tổng quan hệ thống')} delay={160} />
        ) : query.isError ? (
          <Card><ErrorState error={query.error} title={tr('Chưa tải được số liệu')} onRetry={() => query.refetch()} retrying={query.isFetching} /></Card>
        ) : (
          <>
            <section aria-label={tr('Việc cần xử lý')} style={{ '--rp-grid-min': '18rem' }} className="rp-fluid-grid">
              {ATTENTION.map((card) => {
                const n = value(card.key);
                return (
                  <Link key={card.key} to={card.to} className="rp-focus rp-card-hover rp-interactive group flex min-w-0 items-center gap-4 rounded-rp-card border border-rp-line bg-rp-surface p-[var(--rp-space-card-pad)] transition-colors hover:border-rp-brand-border">
                    <span aria-hidden="true" className="rp-icon-tilt flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint text-rp-brand-strong"><card.icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block rp-type-card text-rp-text">{tr(card.label)}</span>
                      <span className="block rp-type-caption text-rp-text-muted">{tr(card.hint)}</span>
                    </span>
                    <span className={`rp-type-kpi ${n > 0 ? 'text-rp-brand-strong' : 'text-rp-text-muted'}`}>{fmt(n)}</span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </section>

            <div className="mt-[var(--rp-space-section)] rp-cq-two-col">
              <Card>
                <CardHeader title={tr('Số liệu')} description={tr('Tổng hợp tại thời điểm tải trang')} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {FIGURES.map((f) => (
                    <Link
                      key={f.key}
                      to={f.to}
                      className="rp-focus rp-card-hover rp-interactive group flex flex-col justify-between rounded-rp-input border border-rp-line bg-rp-surface p-4 transition-all hover:border-rp-brand-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rp-type-caption font-medium text-rp-text-muted">{tr(f.label)}</span>
                        <span aria-hidden="true" className={`rp-icon-tilt flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${f.tone}`}>
                          <f.icon className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-3 rp-type-kpi text-rp-text">{fmt(value(f.key))}</p>
                    </Link>
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader title={tr('Lối tắt')} />
                <ul className="space-y-1">
                  {SHORTCUTS.map((s) => (
                    <li key={s.to}>
                      <Link to={s.to} className="rp-focus flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-rp-text-2 hover:bg-rp-muted hover:text-rp-text">
                        <s.icon aria-hidden="true" className="h-4 w-4" /> {tr(s.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
