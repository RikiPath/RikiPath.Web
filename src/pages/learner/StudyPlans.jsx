import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  History,
  Info,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  PageContainer,
  RefreshingIndicator,
  SakuraLoader,
  notify,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell, PublicShell } from '@/layouts';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { getStudyPlans } from '@/features/checkout/api/subscriptionApi.js';
import PlanGroupCard from '@/features/checkout/components/PlanGroupCard.jsx';
import StudyCheckoutModal from '@/features/checkout/components/StudyCheckoutModal.jsx';
import { CHECKOUT_PLAN_PARAM, findGroupOfPlan, groupStudyPlans, parsePlanIdParam } from '@/features/checkout/planGroups.js';

const COMPARISON_ROWS = [
  {
    feature: 'Sổ tay cá nhân, SRS, Viết Hán tự, Ngữ pháp & Đề thi thử',
    free: 'Miễn phí vĩnh viễn',
    selfStudy: 'Miễn phí vĩnh viễn',
    aiPack: 'Miễn phí vĩnh viễn',
  },
  {
    feature: 'Lộ trình chuẩn JLPT theo cấp độ',
    free: 'Miễn phí vĩnh viễn',
    selfStudy: 'Miễn phí vĩnh viễn',
    aiPack: 'Miễn phí vĩnh viễn',
  },
  {
    feature: 'Toàn bộ Bài học JLPT, Nghe hiểu & Đọc hiểu chuyên sâu',
    free: 'Cần Gói tự học',
    selfStudy: 'Mở khóa toàn bộ',
    aiPack: 'Theo gói tự học',
  },
  {
    feature: 'Lượt chấm AI Nói/Viết & Lộ trình AI cá nhân hóa',
    free: 'Theo lượt hiện có',
    selfStudy: 'Tặng kèm theo gói',
    aiPack: 'Bổ sung theo lượt',
  },
];

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

function purchaseStatusBadge(order, tr) {
  const payStatus = String(order?.paymentStatus || '').toLowerCase();
  if (payStatus === 'pending') return { tone: 'warning', label: tr('Chờ thanh toán') };
  if (payStatus === 'cancelled' || payStatus === 'failed') return { tone: 'neutral', label: tr('Đã hủy') };
  if (payStatus === 'expired') return { tone: 'neutral', label: tr('Quá hạn thanh toán') };
  if (order?.active) return { tone: 'success', label: tr('Đang hiệu lực') };
  return { tone: 'neutral', label: tr('Đã hết hạn') };
}

export default function StudyPlans() {
  const { trf, tr } = useLocale();
  const { pathname } = useLocation();
  const session = getSession();
  const [searchParams, setSearchParams] = useSearchParams();
  // Selected variant per group (plan id); groups without an entry show their default variant.
  const [selectedByGroup, setSelectedByGroup] = useState({});
  // The plan being confirmed; kept as a fallback if it disappears from a refreshed catalog while open.
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [benefitsModalOpen, setBenefitsModalOpen] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['study-plans'],
    queryFn: getStudyPlans,
    retry: false,
  });

  const studyAccess = useStudyAccess({ freshness: 'strict' });
  const mineQuery = studyAccess.query;
  const current = studyAccess.data;

  const groups = useMemo(() => groupStudyPlans(plansQuery.data), [plansQuery.data]);
  const livePlanById = useMemo(() => {
    const map = new Map();
    for (const group of groups) for (const variant of group.variants) map.set(variant.id, variant);
    return map;
  }, [groups]);
  const modalPlan = checkoutPlan ? (livePlanById.get(checkoutPlan.id) ?? checkoutPlan) : null;

  function selectVariant(groupKey, planId) {
    setSelectedByGroup((prev) => (prev[groupKey] === planId ? prev : { ...prev, [groupKey]: planId }));
  }

  function openCheckout(planId) {
    const plan = livePlanById.get(planId);
    if (plan) setCheckoutPlan(plan);
  }

  // Deep link `/plans?checkoutPlan=6` (and the legacy `/study-payment?planId=6` redirect): select the variant and
  // open its confirmation once the catalog is loaded, then drop the param so refresh/back never reopen it.
  const deepLinkParam = searchParams.get(CHECKOUT_PLAN_PARAM);
  const [consumedDeepLink, setConsumedDeepLink] = useState(null);
  const deepLinkReady = deepLinkParam !== null && !plansQuery.isPending;
  const deepLinkPlanId = parsePlanIdParam(deepLinkParam);
  const deepLinkPlan = deepLinkPlanId ? livePlanById.get(deepLinkPlanId) ?? null : null;
  // Applied while rendering (React's "adjust state on input change" pattern), once per distinct param value.
  if (deepLinkReady && consumedDeepLink !== deepLinkParam) {
    setConsumedDeepLink(deepLinkParam);
    const group = deepLinkPlan ? findGroupOfPlan(groups, deepLinkPlan.id) : null;
    if (deepLinkPlan && group) {
      setSelectedByGroup((prev) => ({ ...prev, [group.key]: deepLinkPlan.id }));
      setCheckoutPlan(deepLinkPlan);
    }
  } else if (deepLinkParam === null && consumedDeepLink !== null) {
    setConsumedDeepLink(null);
  }
  const deepLinkMissing = deepLinkReady && !deepLinkPlan && !plansQuery.isError;
  useEffect(() => {
    if (!deepLinkReady) return;
    if (deepLinkMissing) {
      notify.warning(tr('Gói này hiện không còn mở bán'), tr('Vui lòng chọn một gói khác trong danh sách.'), { key: 'checkout-deeplink-missing' });
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(CHECKOUT_PLAN_PARAM);
      return next;
    }, { replace: true });
  }, [deepLinkReady, deepLinkMissing, setSearchParams, tr]);

  const purchases = Array.isArray(current?.purchases) ? current.purchases : [];
  const showAccountOverview = Boolean(
    session?.accessToken && (mineQuery.isError || current),
  );
  const Shell = session?.accessToken ? LearnerShell : PublicShell;

  return (
    <Shell pathname={pathname} breadcrumb={tr('Gói học & quyền lợi')}>
      <PageContainer data-page="StudyPlans" width="default" className="space-y-5">
        <IllustratedPageHeader
          icon="ai"
          tone="sakura"
          eyebrow={tr('GÓI TỰ HỌC & LƯỢT AI')}
          title={tr('Gói tự học & quyền lợi học tập')}
          description={tr('Gói tự học mở khóa bài học JLPT. Bổ sung Lượt AI khi cần chấm bài hoặc tạo lộ trình cá nhân hóa.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBenefitsModalOpen(true)}
                aria-label={tr('So sánh nhanh quyền lợi')}
                title={tr('So sánh nhanh quyền lợi')}
                className="rp-focus rp-press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rp-line bg-rp-surface text-rp-brand-strong shadow-rp-xs transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint"
              >
                <Info aria-hidden="true" className="h-5 w-5" />
              </button>
              <RefreshingIndicator active={plansQuery.isFetching && !plansQuery.isPending} />
            </div>
          }
        />

        {/* Account Overview & AI Credits */}
        {showAccountOverview && (
          <Card className="p-4 sm:p-5">
            {mineQuery.isError ? (
              <ErrorState
                error={mineQuery.error}
                onRetry={() => mineQuery.refetch()}
                retrying={mineQuery.isFetching}
                compact
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-0 md:divide-x md:divide-rp-line">
                {/* Left Column: Subscription State */}
                <div className="flex flex-col justify-between gap-3 md:pr-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rp-navy">
                        {tr('GÓI ĐANG SỬ DỤNG')}
                      </p>
                      <Badge tone={current?.active ? 'success' : 'neutral'} size="sm" icon={false}>
                        {current?.active ? tr('Đang hiệu lực') : tr('Tài khoản miễn phí')}
                      </Badge>
                    </div>

                    {current?.active ? (
                      <div className="mt-2 space-y-1 text-sm text-rp-text">
                        <p className="text-[16px] font-extrabold text-rp-navy">
                          {current.planName || tr('Gói tự học')}
                        </p>
                        {current.selfStudyExpiresAt && (
                          <p className="text-xs leading-5 text-rp-text-2">
                            {trf('Còn {0} ngày tự học · Hết hạn lúc {1} (giờ Việt Nam)', {
                              0: current.selfStudyDaysRemaining ?? 0,
                              1: formatExpiry(current.selfStudyExpiresAt),
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm font-bold text-rp-navy">
                          {tr('Bạn đang dùng đầy đủ các công cụ học tập miễn phí')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      icon={History}
                      onClick={() => setHistoryModalOpen(true)}
                      data-testid="open-purchase-history-btn"
                    >
                      {trf('Lịch sử gói đã mua ({0})', { 0: purchases.length })}
                    </Button>
                    <Button
                      as={Link}
                      to="/app"
                      variant={current?.active ? 'primary' : 'outline'}
                      size="md"
                      iconRight={ArrowRight}
                    >
                      {tr('Vào trang ôn luyện')}
                    </Button>
                  </div>
                </div>

                {/* Right Column: AI Credits */}
                <div className="border-t border-rp-line pt-4 md:border-t-0 md:pl-6 md:pt-0">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rp-brand-strong">
                      {tr('LƯỢT AI HIỆN CÓ')}
                    </p>
                    <dl className="mt-2.5 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-brand-border/70 bg-rp-brand-tint/45 px-3 py-2.5">
                        <dt className="font-medium text-rp-text-2">{tr('Lượt chấm AI nói/viết:')}</dt>
                        <dd className="text-sm font-extrabold tabular-nums text-rp-brand-strong">
                          {current?.aiGradingUsesRemaining ?? 0}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-lavender-line/80 bg-rp-lavender-bg/50 px-3 py-2.5">
                        <dt className="font-medium text-rp-text-2">{tr('Lượt tạo lộ trình AI:')}</dt>
                        <dd className="text-sm font-extrabold tabular-nums text-rp-navy">
                          {current?.learningPathUsesRemaining ?? 0}
                        </dd>
                      </div>
                      {(current?.speakingUsesRemaining > 0 || current?.writingUsesRemaining > 0) && (
                        <>
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-sky-line/80 bg-rp-sky-bg/50 px-3 py-2">
                            <dt className="font-medium text-rp-text-2">{tr('Lượt luyện nói riêng:')}</dt>
                            <dd className="text-sm font-extrabold tabular-nums text-rp-navy">
                              {current?.speakingUsesRemaining ?? 0}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-peach-line/80 bg-rp-peach-bg/50 px-3 py-2">
                            <dt className="font-medium text-rp-text-2">{tr('Lượt luyện viết riêng:')}</dt>
                            <dd className="text-sm font-extrabold tabular-nums text-rp-navy">
                              {current?.writingUsesRemaining ?? 0}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Plans Grid */}
        {plansQuery.isPending && groups.length === 0 && (
          <SakuraLoader variant="section" context="payment" label={tr('Đang tải các gói tự học')} delay={160} />
        )}

        {plansQuery.isError && (
          <Card>
            <ErrorState
              error={plansQuery.error}
              onRetry={() => plansQuery.refetch()}
              retrying={plansQuery.isFetching}
              compact
            />
          </Card>
        )}

        {!plansQuery.isPending && !plansQuery.isError && groups.length === 0 && (
          <Card>
            <EmptyState variant="compact" illustration="certificate" title={tr('Chưa có gói tự học đang mở.')} />
          </Card>
        )}

        {groups.length > 0 && (
          <section aria-labelledby="plans-catalog-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="plans-catalog-heading" className="text-[16px] font-bold text-rp-text">
                {tr('Chọn gói phù hợp với mục tiêu của bạn')}
              </h2>
              <p className="text-xs text-rp-text-muted">{tr('Chọn thời hạn ngay trên thẻ gói; giá và quyền lợi cập nhật theo lựa chọn.')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <PlanGroupCard
                  key={group.key}
                  group={group}
                  selectedPlanId={selectedByGroup[group.key] ?? group.defaultPlanId}
                  onSelect={(planId) => selectVariant(group.key, planId)}
                  onBuy={openCheckout}
                  activePlanName={current?.active ? current?.planName : null}
                  hasActiveSelfStudy={Boolean(current?.active)}
                />
              ))}
            </div>
          </section>
        )}

        {modalPlan && <StudyCheckoutModal key={modalPlan.id} plan={modalPlan} onClose={() => setCheckoutPlan(null)} />}

        <Modal
          open={benefitsModalOpen}
          onClose={() => setBenefitsModalOpen(false)}
          title={tr('So sánh nhanh quyền lợi')}
          size="xl"
          footer={<Button variant="secondary" onClick={() => setBenefitsModalOpen(false)}>{tr('Đóng')}</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-rp-line text-rp-text-muted">
                  <th scope="col" className="py-3 pr-4 font-semibold">{tr('Tính năng')}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{tr('Miễn phí')}</th>
                  <th scope="col" className="px-3 py-3 font-semibold text-rp-brand-strong">{tr('Gói tự học')}</th>
                  <th scope="col" className="pl-3 py-3 font-semibold text-rp-navy">{tr('Gói lượt AI')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-line/70">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row" className="py-3 pr-4 font-medium text-rp-text">{tr(row.feature)}</th>
                    <td className="px-3 py-3 text-rp-text-2">{tr(row.free)}</td>
                    <td className="px-3 py-3 font-semibold text-rp-brand-strong">{tr(row.selfStudy)}</td>
                    <td className="pl-3 py-3 text-rp-navy">{tr(row.aiPack)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>

        {/* Purchase History Modal */}
        <Modal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={trf('Lịch sử gói đã mua ({0})', { 0: purchases.length })}
          size="md"
        >
          {mineQuery.isPending ? (
            <div className="py-6">
              <SakuraLoader variant="section" context="payment" label={tr('Đang tải lịch sử gói đã mua…')} delay={60} />
            </div>
          ) : mineQuery.isError ? (
            <ErrorState
              error={mineQuery.error}
              onRetry={() => mineQuery.refetch()}
              retrying={mineQuery.isFetching}
              compact
            />
          ) : purchases.length === 0 ? (
            <EmptyState
              variant="compact"
              illustration="certificate"
              title={tr('Chưa có giao dịch mua gói')}
              description={tr('Các gói tự học và gói lượt chấm AI bạn đã đăng ký sẽ hiển thị tại đây.')}
            />
          ) : (
            <ul className="max-h-[60vh] divide-y divide-rp-line overflow-y-auto pr-1">
              {purchases.map((order) => {
                const timestamp = order.purchasedAt || order.createdAt || order.paidAt || order.endDate || order.expiresAt;
                const badge = purchaseStatusBadge(order, tr);
                return (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-rp-navy">{order.planName}</p>
                      <p className="mt-0.5 text-xs text-rp-text-2">
                        <span className="font-semibold text-rp-brand-strong">{money(order.amountPaid)}</span>
                        {timestamp ? ` · ${formatExpiry(timestamp)}` : ''}
                        {order.endDate ? ` · ${tr('Hạn')}: ${formatExpiry(order.endDate)}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-rp-text-muted">
                        {trf('Mã đơn #{0}', { 0: order.id })}
                        {order.startDate ? ` · ${tr('Kích hoạt')}: ${formatExpiry(order.startDate)}` : ''}
                        {order.aiUsesRemaining > 0 ? ` · ${trf('{0} lượt AI còn lại', { 0: order.aiUsesRemaining })}` : ''}
                      </p>
                    </div>
                    <Badge tone={badge.tone} size="sm" icon={false}>
                      {badge.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Modal>
      </PageContainer>
    </Shell>
  );
}
