import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  GraduationCap,
  Layers,
  School,
  ShieldCheck,
  UserCog,
  UsersRound,
} from 'lucide-react';
import { getAdminDashboard } from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS } from '@/features/admin/api/adminQueryKeys.js';
import { AdminShell } from '@/layouts';
import {
  Badge,
  Card,
  ContextualErrorState,
  FeatureIcon,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
} from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

const ACTION_QUEUES = [
  {
    key: 'pendingVerifications',
    label: 'Hồ sơ Giáo viên chờ duyệt',
    hint: 'Xem hồ sơ, chứng chỉ và phê duyệt',
    to: '/admin/mentor-verifications/?status=Pending',
    icon: BadgeCheck,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'pendingMentorSchedules',
    label: 'Lịch dạy chờ duyệt',
    hint: 'Khung giờ Giáo viên đăng ký mở lớp',
    to: '/admin/mentor-schedules/',
    icon: CalendarCheck,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    key: 'pendingContent',
    label: 'Học liệu chờ phê duyệt',
    hint: 'Bài học, từ vựng, Hán tự, ngữ pháp và đề thi',
    to: '/admin/content-review/',
    icon: ShieldCheck,
    tone: 'bg-rp-brand-tint text-rp-brand-strong',
  },
  {
    key: 'openComplaints',
    label: 'Khiếu nại đang mở',
    hint: 'Cần xem xét và ra quyết định',
    to: '/admin/mentor-cases/',
    icon: AlertTriangle,
    tone: 'bg-rose-50 text-rose-700',
  },
  {
    key: 'pendingTransferRequests',
    label: 'Yêu cầu chuyển lớp',
    hint: 'Kiểm tra điều kiện và lịch học',
    to: '/admin/mentor-cases/?tab=transfers',
    icon: ArrowLeftRight,
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    key: 'slotChangeTotal',
    label: 'Yêu cầu đổi / hủy lịch',
    hint: 'Đổi giờ hoặc hủy khung rảnh & lịch lớp',
    to: '/admin/slot-review/',
    icon: CalendarClock,
    tone: 'bg-emerald-50 text-emerald-700',
  },
];

const SYSTEM_SNAPSHOT = [
  { key: 'totalUsers', label: 'Tài khoản hoạt động', to: '/admin/users/', icon: UserCog, tone: 'bg-rp-brand-tint text-rp-brand-strong' },
  { key: 'learners', label: 'Học viên', to: '/admin/users/?role=Learner', icon: GraduationCap, tone: 'bg-sky-50 text-sky-700' },
  { key: 'mentors', label: 'Giáo viên', to: '/admin/mentors/', icon: UsersRound, tone: 'bg-emerald-50 text-emerald-700' },
  { key: 'publishedCohorts', label: 'Lớp nhóm đang mở', to: '/admin/study-courses/', icon: School, tone: 'bg-violet-50 text-violet-700' },
  { key: 'activePlans', label: 'Gói học đang bán', to: '/admin/plans/', icon: Layers, tone: 'bg-amber-50 text-amber-700' },
  { key: 'paidSubscriptions', label: 'Gói đã thanh toán', to: '/admin/payments/', icon: CreditCard, tone: 'bg-rose-50 text-rose-700' },
];

function fmt(n) {
  return Number.isFinite(n) ? n.toLocaleString(currentIntlTag()) : '—';
}

export default function AdminDashboard() {
  const { tr, trf } = useLocale();
  const query = useQuery({
    queryKey: ADMIN_KEYS.dashboard,
    queryFn: async () => {
      const data = await getAdminDashboard();
      const raw = data?.result ?? data ?? {};
      return {
        ...raw,
        slotChangeTotal:
          (raw.pendingSlotCancelRequests || 0) +
          (raw.pendingSlotChangeRequests || 0) +
          (raw.pendingCohortScheduleRequests || 0),
      };
    },
  });

  const stats = query.data || {};
  const val = (key) => (typeof stats[key] === 'number' ? stats[key] : null);
  const totalAttention = ACTION_QUEUES.reduce((sum, q) => sum + (val(q.key) || 0), 0);

  return (
    <AdminShell breadcrumb={tr('Tổng quan')}>
      <main data-page="AdminDashboard" className="rp-container py-[var(--rp-space-page-y)] space-y-6 text-rp-text">
        <PageHeader
          eyebrow={tr('Trung tâm điều hành')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="stats" size="lg" />
              <span>{tr('Tổng quan vận hành')}</span>
            </span>
          }
          description={tr('Theo dõi nhanh các hàng đợi cần Admin xử lý và tình trạng vận hành trực tiếp từ máy chủ.')}
          actions={<RefreshingIndicator active={query.isFetching && !query.isPending} />}
        />

        {query.isPending ? (
          <SakuraLoader variant="section" context="dashboard" label={tr('Đang tải tổng quan hệ thống')} delay={140} />
        ) : query.isError ? (
          <ContextualErrorState
            error={query.error}
            title={tr('Chưa tải được số liệu điều hành')}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            {/* Priority Action Queues */}
            <section aria-label={tr('Cần xử lý')} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-rp-text">{tr('Cần xử lý')}</h2>
                  <Badge tone={totalAttention > 0 ? 'warning' : 'success'} size="sm" icon={false}>
                    {totalAttention > 0 ? trf('{0} đầu việc', { 0: totalAttention }) : tr('Không có tồn đọng')}
                  </Badge>
                </div>
                {val('paymentReviewCourses') > 0 && (
                  <Link
                    to="/admin/payments/?status=PaymentReview"
                    className="rp-link text-xs font-semibold text-rp-brand-strong"
                  >
                    {trf('{0} đơn đang kiểm tra thanh toán', { 0: val('paymentReviewCourses') })} →
                  </Link>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ACTION_QUEUES.map((queue) => {
                  const count = val(queue.key);
                  const QueueIcon = queue.icon;
                  const urgent = (count || 0) > 0;
                  return (
                    <Link key={queue.key} to={queue.to} className="rp-focus group block rounded-rp-card">
                      <Card
                        className={`flex h-full items-center gap-3.5 p-4 transition-colors ${
                          urgent ? 'border-rp-brand-border bg-white hover:border-rp-brand-strong' : 'hover:border-rp-brand-border'
                        }`}
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${queue.tone}`}>
                          <QueueIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-rp-text">{tr(queue.label)}</p>
                          <p className="mt-0.5 truncate text-xs text-rp-text-muted">{tr(queue.hint)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`text-xl font-bold tabular-nums ${urgent ? 'text-rp-brand-strong' : 'text-rp-text-muted'}`}>
                            {fmt(count)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-rp-text-muted transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Real-time System Snapshot */}
            <section aria-label={tr('Quy mô vận hành')} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-rp-text">{tr('Quy mô hệ thống')}</h2>
                {(val('draftCohorts') || 0) > 0 && (
                  <Link to="/admin/study-courses/" className="rp-link text-xs font-medium text-rp-text-2">
                    {trf('{0} lớp nháp chưa mở bán', { 0: val('draftCohorts') })} →
                  </Link>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {SYSTEM_SNAPSHOT.map((tile) => {
                  const TileIcon = tile.icon;
                  return (
                    <Link key={tile.key} to={tile.to} className="rp-focus block rounded-rp-card">
                      <Card className="flex h-full items-center justify-between gap-3 p-4 transition-colors hover:border-rp-brand-border">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-rp-text-muted">{tr(tile.label)}</p>
                          <p className="mt-1 text-xl font-bold tabular-nums text-rp-text">{fmt(val(tile.key))}</p>
                        </div>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tile.tone}`}>
                          <TileIcon className="h-4 w-4" />
                        </span>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </AdminShell>
  );
}
