import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  Badge,
  Banner,
  Card,
  EmptyState,
  ErrorState,
  FeatureIcon,
  PageContainer,
  RefreshingIndicator,
  SakuraLoader,
  Tabs,
} from '@/components/ui';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell, PublicShell } from '@/layouts';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { getMySubscription, getStudyPlans } from '@/features/checkout/api/subscriptionApi.js';

function money(value) {
  return new Intl.NumberFormat(currentIntlTag(), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatExpiry(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

function isCreditPack(plan) {
  const kind = String(plan?.kind || '').toLowerCase();
  return kind.includes('ai') || kind.includes('credit') || Number(plan?.durationDays || 0) <= 0;
}

export default function StudyPlans() {
  const { trf, tr } = useLocale();
  const { pathname } = useLocation();
  const session = getSession();
  const [groupTab, setGroupTab] = useState('all');

  const fromPath = state?.from?.pathname
    ? `${state.from.pathname}${state.from.search || ''}`
    : '';
  const requiredLabel = state?.requiredFeatureLabel || '';

  const plansQuery = useQuery({
    queryKey: ['study-plans'],
    queryFn: getStudyPlans,
    retry: false,
  });

  const mineQuery = useQuery({
    queryKey: ['study-subscription', session?.userId],
    enabled: Boolean(session?.accessToken),
    refetchInterval: (query) =>
      query.state.data?.active ? 60000 : false,
    queryFn: getMySubscription,
    retry: false,
  });

  const plans = useMemo(
    () => (plansQuery.data ?? []).filter((p) => p?.kind !== 'mentor'),
    [plansQuery.data],
  );

  const studyPlans = useMemo(() => plans.filter((p) => !isCreditPack(p)), [plans]);
  const aiPlans = useMemo(() => plans.filter((p) => isCreditPack(p)), [plans]);
  const hasBothGroups = studyPlans.length > 0 && aiPlans.length > 0;
  const visiblePlans =
    groupTab === 'study' ? studyPlans : groupTab === 'ai' ? aiPlans : plans;

  const current = mineQuery.data;
  const hasQuotaOrPurchases = Boolean(
    current &&
      (current.active ||
        (current.aiGradingUsesRemaining ?? 0) > 0 ||
        (current.speakingUsesRemaining ?? 0) > 0 ||
        (current.writingUsesRemaining ?? 0) > 0 ||
        (current.learningPathUsesRemaining ?? 0) > 0 ||
        (current.purchases?.length ?? 0) > 0),
  );
  const Shell = session?.accessToken ? LearnerShell : PublicShell;

  return (
    <Shell pathname={pathname} breadcrumb={tr('Gói tự học')}>
      <PageContainer data-page="StudyPlans" width="default">
        {fromPath && (
          <Banner tone="info" className="mb-5">
            <span>
              {tr('Bạn vừa mở')}{' '}
              <strong>{requiredLabel || tr('tính năng có yêu cầu gói')}</strong>
              {tr('. Chọn gói phù hợp bên dưới hoặc')}{' '}
              <Link to={fromPath} className="rp-link font-semibold">
                {tr('quay lại trang trước')}
              </Link>
              .
            </span>
          </Banner>
        )}

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <FeatureIcon feature="haru" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rp-brand-strong">
                {tr('GÓI TỰ HỌC & LƯỢT AI')}
              </p>
              <h1 className="mt-1 text-[22px] font-bold text-rp-text sm:text-2xl">
                {tr('Gói tự học & lượt chấm AI')}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-rp-text-2">
                {tr('Chọn gói tự học theo ngày, luyện kỹ năng JLPT và lượt chấm Haru AI. Lớp học nhóm cùng Giáo viên được đăng ký riêng theo khóa 10 tuần tại mục Tìm Giáo viên.')}
              </p>
            </div>
          </div>

          {mineQuery.isError && (
            <ErrorState
              error={mineQuery.error}
              onRetry={() => mineQuery.refetch()}
              retrying={mineQuery.isFetching}
              compact
              className="mt-4"
            />
          )}

          {hasQuotaOrPurchases && (
            <div className="mt-5 space-y-3 rounded-rp-input border border-rp-line bg-rp-bg-2 p-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {(current.aiGradingUsesRemaining ?? 0) > 0 && (
                  <Badge tone="brand" icon={false}>
                    {tr('AI nói/viết:')}{' '}{current.aiGradingUsesRemaining}
                  </Badge>
                )}
                {(current.speakingUsesRemaining ?? 0) > 0 && (
                  <Badge tone="info" icon={false}>
                    {tr('Riêng nói:')}{' '}{current.speakingUsesRemaining}
                  </Badge>
                )}
                {(current.writingUsesRemaining ?? 0) > 0 && (
                  <Badge tone="neutral" icon={false}>
                    {tr('Riêng viết:')}{' '}{current.writingUsesRemaining}
                  </Badge>
                )}
                {(current.learningPathUsesRemaining ?? 0) > 0 && (
                  <Badge tone="neutral" icon={false}>
                    {tr('Lộ trình AI:')}{' '}{current.learningPathUsesRemaining}
                  </Badge>
                )}
              </div>

              {current.purchases?.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-[13px] font-semibold text-rp-text">
                    {trf('Lịch sử gói đã mua ({0})', { 0: current.purchases.length })}
                  </summary>
                  <ul className="mt-2 space-y-1 text-[13px] text-rp-text-2">
                    {current.purchases.map((order) => (
                      <li key={order.id}>
                        {order.planName} · {money(order.amountPaid)} ·{' '}
                        {order.active ? tr('Đang hiệu lực') : tr('Đã hết hạn')}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {current?.active && (
            <div className="mt-4 rounded-rp-input border border-rp-brand-soft bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">
              {tr('Bạn đang dùng')}{' '}
              <strong>{current.planName || tr('một gói')}</strong>.
              {current.selfStudyExpiresAt && (
                <span className="mt-1 block">
                  {trf('Còn {0} ngày tự học · Hết hạn lúc {1} (giờ Việt Nam)', {
                    0: current.selfStudyDaysRemaining,
                    1: formatExpiry(current.selfStudyExpiresAt),
                  })}
                </span>
              )}
              <Link to="/app" className="rp-link mt-1 inline-block font-semibold">
                {tr('Vào trang ôn luyện')}
              </Link>
            </div>
          )}
        </Card>

        {hasBothGroups && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              variant="pill"
              className="flex-wrap sm:flex-nowrap"
              value={groupTab}
              onChange={setGroupTab}
              tabs={[
                { value: 'all', label: tr('Tất cả gói') },
                { value: 'study', label: tr('Gói tự học theo ngày') },
                { value: 'ai', label: tr('Gói lượt chấm AI') },
              ]}
            />
            <RefreshingIndicator active={plansQuery.isFetching && !plansQuery.isPending} />
          </div>
        )}

        {!hasBothGroups && (
          <div className="mt-3 flex justify-end">
            <RefreshingIndicator active={plansQuery.isFetching && !plansQuery.isPending} />
          </div>
        )}

        {plansQuery.isPending && plans.length === 0 && (
          <SakuraLoader
            variant="section"
            context="payment"
            label={tr('Đang tải các gói tự học')}
            delay={160}
          />
        )}

        {plansQuery.isError && (
          <Card className="mt-5">
            <ErrorState
              error={plansQuery.error}
              onRetry={() => plansQuery.refetch()}
              retrying={plansQuery.isFetching}
              compact
            />
          </Card>
        )}

        {!plansQuery.isPending && !plansQuery.isError && visiblePlans.length === 0 && (
          <Card className="mt-5">
            <EmptyState compact title={tr('Chưa có gói tự học đang mở.')} />
          </Card>
        )}

        <div style={{ '--rp-grid-min': '18rem' }} className="rp-fluid-grid mt-[var(--rp-space-section)]">
          {visiblePlans.map((plan) => (
            <article
              key={plan.id}
              className={`rp-card-hover flex flex-col rounded-rp-card border bg-rp-surface p-5 ${
                plan.isPopular
                  ? 'border-rp-brand-strong shadow-rp-card'
                  : 'border-rp-line'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[16px] font-bold text-rp-text">{plan.name}</h2>
                {plan.isPopular && (
                  <Badge tone="brand" size="sm" icon={false}>
                    {tr('Phổ biến')}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-[24px] font-bold tabular-nums text-rp-brand-strong">
                {money(plan.price)}
              </p>
              <p className="mt-1 text-xs text-rp-text-muted">
                {plan.durationDays > 0
                  ? trf('{0} ngày', { 0: plan.durationDays })
                  : trf('{0} lượt dùng', { 0: plan.aiUses || 1 })}
                {plan.durationDays > 0 && plan.aiUses > 0 ? trf(' · {0} lượt AI', { 0: plan.aiUses }) : ''}
              </p>
              {plan.description && (
                <p className="mt-3 text-[13px] leading-6 text-rp-text-2">
                  {tr(plan.description)}
                </p>
              )}

              {Array.isArray(plan.features) &&
                plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-rp-text-muted">
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                )}

              <div className="mt-auto pt-4">
                <Link
                  to={session?.accessToken ? `/study-payment?planId=${plan.id}` : '/auth'}
                  state={
                    session?.accessToken
                      ? { plan }
                      : {
                          from: { pathname: '/study-payment', search: `?planId=${plan.id}` },
                          plan,
                        }
                  }
                  className="rp-focus inline-flex h-10 w-full items-center justify-center rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand transition-colors hover:bg-rp-brand-strong rp-press"
                >
                  {tr('Mua gói')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </PageContainer>
    </Shell>
  );
}
