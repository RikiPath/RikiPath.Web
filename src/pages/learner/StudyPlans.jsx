import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Crown,
  GraduationCap,
  History,
  Info,
  Layers,
} from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Modal,
  PageContainer,
  RefreshingIndicator,
  Skeleton,
  Tooltip,
  UnifiedToolbar,
  CustomSelect,
  cx,
  notify,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell, PublicShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getStudyPlans } from '@/features/checkout/api/subscriptionApi.js';
import ActiveSubscriptionsModal from '@/features/checkout/components/ActiveSubscriptionsModal.jsx';
import PlanBenefitsModal from '@/features/checkout/components/PlanBenefitsModal.jsx';
import PlanGroupCard from '@/features/checkout/components/PlanGroupCard.jsx';
import PurchaseHistoryModal from '@/features/checkout/components/PurchaseHistoryModal.jsx';
import StudyCheckoutModal from '@/features/checkout/components/StudyCheckoutModal.jsx';
import {
  CHECKOUT_PLAN_PARAM,
  buildAiWalletItems,
  buildUnifiedProductCatalog,
  computeRemainingDays,
  findGroupOfPlan,
  formatPlanDate,
  groupStudyPlans,
  isUnlimitedSubscription,
  matchesDurationBucket,
  parsePlanIdParam,
  summarizeSubscriptions,
} from '@/features/checkout/planGroups.js';
import { AI_CREDIT_ICON, PLAN_GROUP_ICONS } from '@/features/checkout/planIcons.js';

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

const SORT_OPTIONS = [
  { value: 'default', label: 'Thứ tự mặc định' },
  { value: 'popular', label: 'Phổ biến nhất' },
  { value: 'price_asc', label: 'Giá: Thấp đến cao' },
  { value: 'price_desc', label: 'Giá: Cao đến thấp' },
];

const SHORT_WALLET_LABELS = {
  aiGradingUsesRemaining: 'Lượt chấm AI',
  learningPathUsesRemaining: 'Lượt tạo lộ trình',
  speakingUsesRemaining: 'Lượt luyện nói',
  writingUsesRemaining: 'Lượt luyện viết',
};

function PlansCatalogSkeleton({ showAccount }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {showAccount && <Skeleton className="h-[68px] w-full" rounded="rounded-rp-card" />}
      <Skeleton className="h-[54px] w-full" rounded="rounded-rp-card" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Skeleton key={n} className="h-56 w-full" rounded="rounded-rp-card" />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact Account Status + Inline AI Wallet Strip matching the single-bar executive layout.
 */
function AccountStatusWalletBar({ access, summary, groups, mineQuery, onOpenActive, tr, trf }) {
  const walletItems = useMemo(() => buildAiWalletItems(access, groups), [access, groups]);
  const activeOrders = summary.activeOrders;
  const upcomingOrders = summary.upcomingOrders;
  const primaryOrder = activeOrders[0] ?? null;

  let statusContent;
  if (mineQuery.isPending && !access) {
    statusContent = <Skeleton className="h-10 w-60" rounded="rounded-xl" />;
  } else if (mineQuery.isError) {
    statusContent = (
      <div className="flex items-center gap-2.5 text-xs">
        <Badge tone="warning" size="sm" icon={false}>{tr('Tạm gián đoạn')}</Badge>
        <span className="text-rp-text-2">{tr('Chưa tải được trạng thái gói.')}</span>
        <button
          type="button"
          onClick={() => mineQuery.refetch()}
          className="rp-focus font-semibold text-rp-brand-strong hover:underline"
        >
          {tr('Thử lại')}
        </button>
      </div>
    );
  } else if (primaryOrder) {
    const unlimited = isUnlimitedSubscription(primaryOrder.endDate, undefined);
    const remainingDays = computeRemainingDays(primaryOrder.endDate);
    const expiringSoon = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
    const statusBadge = unlimited
      ? { tone: 'brand', label: tr('Không giới hạn') }
      : expiringSoon
        ? { tone: 'warning', label: tr('Sắp hết hạn') }
        : { tone: 'success', label: tr('Đang hiệu lực') };

    statusContent = (
      <button
        type="button"
        onClick={onOpenActive}
        data-testid="account-summary-trigger"
        className="rp-focus group flex w-full items-center gap-3 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-rp-bg-2/70 lg:w-auto"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-success/25 bg-rp-success-bg text-rp-success">
          <Crown aria-hidden="true" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rp-text-muted">{tr('Gói hiện tại')}</span>
            <Badge tone={statusBadge.tone} size="sm" icon={false}>{statusBadge.label}</Badge>
          </div>
          <p className="mt-0.5 truncate text-[13.5px] font-bold text-rp-text">
            {activeOrders.length > 1
              ? trf('Đang sử dụng {0} gói', { 0: activeOrders.length })
              : primaryOrder.planName}
          </p>
          <p className="truncate text-[11.5px] text-rp-text-muted">
            {activeOrders.length > 1
              ? `${primaryOrder.planName} · +${activeOrders.length - 1} ${tr('gói khác')}`
              : unlimited
                ? tr('Không giới hạn thời hạn')
                : remainingDays !== null
                  ? trf('Còn {0} ngày (hết hạn: {1})', {
                    0: Math.max(0, remainingDays),
                    1: formatPlanDate(primaryOrder.endDate),
                  })
                  : trf('Còn {0} lượt AI', { 0: primaryOrder.aiUsesRemaining ?? 0 })}
          </p>
        </div>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-rp-brand-strong" />
      </button>
    );
  } else if (upcomingOrders.length > 0) {
    statusContent = (
      <button
        type="button"
        onClick={onOpenActive}
        data-testid="account-summary-trigger"
        className="rp-focus group flex w-full items-center gap-3 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-rp-bg-2/70 lg:w-auto"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2 text-rp-text-2">
          <GraduationCap aria-hidden="true" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rp-text-muted">{tr('Gói hiện tại')}</span>
            <Badge tone="info" size="sm" icon={false}>{tr('Chờ kích hoạt')}</Badge>
          </div>
          <p className="mt-0.5 text-[13.5px] font-bold text-rp-text">{upcomingOrders[0].planName}</p>
        </div>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
      </button>
    );
  } else {
    statusContent = (
      <button
        type="button"
        onClick={onOpenActive}
        data-testid="account-summary-trigger"
        className="rp-focus group flex w-full items-center gap-3 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-rp-bg-2/70 lg:w-auto"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2 text-rp-text-muted">
          <GraduationCap aria-hidden="true" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rp-text-muted">{tr('Gói hiện tại')}</span>
            <Badge tone="neutral" size="sm" icon={false}>{tr('Miễn phí cơ bản')}</Badge>
          </div>
          <p className="mt-0.5 text-[13px] font-semibold text-rp-text">{tr('Chưa kích hoạt gói trả phí')}</p>
        </div>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
      </button>
    );
  }

  return (
    <section
      aria-label={tr('Tài khoản và ví lượt AI')}
      data-testid="account-summary-bar"
      className="flex flex-col gap-3 rounded-rp-card border border-rp-line bg-rp-surface px-3.5 py-2.5 shadow-rp-xs lg:flex-row lg:items-center lg:justify-between lg:gap-4 sm:px-4"
    >
      <div className="min-w-0 lg:max-w-[40%] lg:shrink-0 lg:border-r lg:border-rp-line/80 lg:pr-5">
        {statusContent}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-rp-line/70 pt-2.5 sm:flex-row sm:items-center sm:justify-between lg:border-t-0 lg:pt-0">
        <span className="shrink-0 text-[11.5px] font-semibold text-rp-text-muted">
          {tr('Ví lượt AI của bạn')}
        </span>

        {walletItems.length > 0 ? (
          <div
            data-testid="ai-wallet-strip"
            className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-0 sm:divide-x sm:divide-rp-line/75"
          >
            {walletItems.map((item, idx) => {
              const Icon = PLAN_GROUP_ICONS[item.icon] ?? AI_CREDIT_ICON;
              const shortLabel = SHORT_WALLET_LABELS[item.key] || item.label;
              return (
                <div
                  key={item.key}
                  className={cx(
                    'flex items-center gap-2',
                    idx > 0 && 'sm:pl-4',
                    idx < walletItems.length - 1 && 'sm:pr-4',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', item.accent.iconTile)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-extrabold leading-4 tabular-nums text-rp-text">
                      {item.remaining}
                    </p>
                    <p className="truncate text-[11px] font-medium leading-4 text-rp-text-muted">
                      {tr(shortLabel)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-rp-text-muted">{tr('Đang đồng bộ số dư lượt AI…')}</span>
        )}
      </div>
    </section>
  );
}

export default function StudyPlans() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const session = getSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedByGroup, setSelectedByGroup] = useState({});
  const [selectedSection, setSelectedSection] = useState('all');
  const [durationFilter, setDurationFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');

  // Strict single-modal orchestration: opening one modal closes all others so modals never stack.
  const [activeModal, setActiveModal] = useState(null); // null | 'active' | 'history' | 'comparison' | 'preview' | 'checkout'
  const [previewTarget, setPreviewTarget] = useState(null); // { group, planId }
  const [checkoutPlan, setCheckoutPlan] = useState(null);

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

  const sellablePlanIds = useMemo(() => new Set(livePlanById.keys()), [livePlanById]);
  const subscriptionSummary = useMemo(() => summarizeSubscriptions(current), [current]);

  const rawCatalog = useMemo(
    () => buildUnifiedProductCatalog(groups, { search: searchTerm, sortBy, selectedSection, durationFilter }),
    [groups, searchTerm, sortBy, selectedSection, durationFilter],
  );
  const activeTabExists = rawCatalog.tabs.some((tab) => tab.value === selectedSection);
  const effectiveSelectedSection = activeTabExists ? selectedSection : 'all';
  const durationExists = rawCatalog.durationOptions.some((opt) => opt.value === durationFilter);
  const effectiveDurationFilter = durationExists ? durationFilter : 'ALL';

  const catalog = useMemo(
    () =>
      effectiveSelectedSection === selectedSection && effectiveDurationFilter === durationFilter
        ? rawCatalog
        : buildUnifiedProductCatalog(groups, {
          search: searchTerm,
          sortBy,
          selectedSection: effectiveSelectedSection,
          durationFilter: effectiveDurationFilter,
        }),
    [rawCatalog, groups, searchTerm, sortBy, effectiveSelectedSection, selectedSection, effectiveDurationFilter, durationFilter],
  );

  function closeAllModals() {
    setActiveModal(null);
    setPreviewTarget(null);
    setCheckoutPlan(null);
  }

  function openModal(kind) {
    setCheckoutPlan(null);
    setPreviewTarget(null);
    setActiveModal(kind);
  }

  function openBenefitsPreview(group, plan) {
    setCheckoutPlan(null);
    setPreviewTarget({ groupKey: group.key, planId: plan.id });
    setActiveModal('preview');
  }

  function openCheckout(planId) {
    const plan = livePlanById.get(planId);
    if (!plan) return;
    setPreviewTarget(null);
    setCheckoutPlan(plan);
    setActiveModal('checkout');
  }

  function selectVariant(groupKey, planId) {
    setSelectedByGroup((prev) => (prev[groupKey] === planId ? prev : { ...prev, [groupKey]: planId }));
  }

  function resetCatalogFilters() {
    setSelectedSection('all');
    setDurationFilter('ALL');
    setSearchTerm('');
    setSortBy('default');
  }

  // Deep link `/plans?checkoutPlan=6`
  const deepLinkParam = searchParams.get(CHECKOUT_PLAN_PARAM);
  const [consumedDeepLink, setConsumedDeepLink] = useState(null);
  const deepLinkReady = deepLinkParam !== null && !plansQuery.isPending;
  const deepLinkPlanId = parsePlanIdParam(deepLinkParam);
  const deepLinkPlan = deepLinkPlanId ? livePlanById.get(deepLinkPlanId) ?? null : null;

  if (deepLinkReady && consumedDeepLink !== deepLinkParam) {
    setConsumedDeepLink(deepLinkParam);
    const group = deepLinkPlan ? findGroupOfPlan(groups, deepLinkPlan.id) : null;
    if (deepLinkPlan && group) {
      setSelectedByGroup((prev) => ({ ...prev, [group.key]: deepLinkPlan.id }));
      setPreviewTarget(null);
      setCheckoutPlan(deepLinkPlan);
      setActiveModal('checkout');
    }
  } else if (deepLinkParam === null && consumedDeepLink !== null) {
    setConsumedDeepLink(null);
  }

  const deepLinkMissing = deepLinkReady && !deepLinkPlan && !plansQuery.isError;
  useEffect(() => {
    if (!deepLinkReady) return;
    if (deepLinkMissing) {
      notify.warning(tr('Gói này hiện không còn mở bán'), tr('Vui lòng chọn một gói khác trong danh sách.'), {
        key: 'checkout-deeplink-missing',
      });
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(CHECKOUT_PLAN_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [deepLinkReady, deepLinkMissing, setSearchParams, tr]);

  const isAuthenticated = Boolean(session?.accessToken && !session?.isPreview);
  const Shell = session?.accessToken ? LearnerShell : PublicShell;

  const sortOptions = useMemo(() => SORT_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) })), [tr]);
  const localizedDurationOptions = useMemo(
    () => catalog.durationOptions.map((o) => ({ value: o.value, label: tr(o.label) })),
    [catalog.durationOptions, tr],
  );
  const localizedTabs = useMemo(
    () => catalog.tabs.map((tab) => ({ value: tab.value, label: tr(tab.label) })),
    [catalog.tabs, tr],
  );

  const hasActiveFilters = effectiveSelectedSection !== 'all' || effectiveDurationFilter !== 'ALL' || Boolean(searchTerm.trim());
  // Auto-surface keyword search as catalog grows (>= 8 product families) while keeping compact 6-card view clean.
  const showCatalogSearch = groups.length >= 8 || Boolean(searchTerm.trim());

  const modalPlan = activeModal === 'checkout' && checkoutPlan ? (livePlanById.get(checkoutPlan.id) ?? checkoutPlan) : null;
  const previewGroup = previewTarget ? (groups.find((g) => g.key === previewTarget.groupKey) ?? null) : null;
  const previewPlan = previewGroup && previewTarget
    ? (previewGroup.variants.find((v) => v.id === previewTarget.planId) ?? previewGroup.variants[0])
    : null;

  const activeOwnedCount = subscriptionSummary.activeOrders.length + subscriptionSummary.upcomingOrders.length;

  return (
    <Shell pathname={pathname} breadcrumb={tr('Gói học & quyền lợi')}>
      <PageContainer data-page="StudyPlans" width="wide" className="space-y-4">
        <IllustratedPageHeader
          icon="ai"
          tone="sakura"
          title={tr('Gói học & quyền lợi học tập')}
          description={tr('Khám phá các gói học phù hợp với mục tiêu của bạn.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RefreshingIndicator active={(plansQuery.isFetching || mineQuery.isFetching) && !plansQuery.isPending} />

              <Tooltip content={tr('So sánh quyền lợi miễn phí & gói trả phí')}>
                {isAuthenticated ? (
                  <IconButton
                    size="md"
                    variant="outline"
                    icon={Info}
                    label={tr('So sánh quyền lợi')}
                    onClick={() => openModal('comparison')}
                    data-testid="btn-compare-benefits"
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="md"
                    icon={Info}
                    onClick={() => openModal('comparison')}
                    data-testid="btn-compare-benefits"
                  >
                    {tr('So sánh quyền lợi')}
                  </Button>
                )}
              </Tooltip>

              {isAuthenticated && (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={Layers}
                    onClick={() => openModal('active')}
                    data-testid="btn-active-subscriptions"
                  >
                    <span>{tr('Gói đang sử dụng')}</span>
                    {activeOwnedCount > 0 && (
                      <Badge tone="brand" size="sm" icon={false} className="ml-0.5">
                        {activeOwnedCount}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    icon={History}
                    onClick={() => openModal('history')}
                    data-testid="btn-purchase-history"
                  >
                    {tr('Lịch sử mua gói')}
                  </Button>
                </>
              )}
            </div>
          }
        />

        {plansQuery.isPending && groups.length === 0 ? (
          <PlansCatalogSkeleton showAccount={isAuthenticated} />
        ) : (
          <>
            {isAuthenticated && (
              <AccountStatusWalletBar
                access={current}
                summary={subscriptionSummary}
                groups={groups}
                mineQuery={mineQuery}
                onOpenActive={() => openModal('active')}
                tr={tr}
                trf={trf}
              />
            )}

            {plansQuery.isError && groups.length === 0 ? (
              <ErrorState
                error={plansQuery.error}
                title={tr('Chưa tải được danh sách gói học')}
                onRetry={() => plansQuery.refetch()}
                retrying={plansQuery.isFetching}
              />
            ) : groups.length === 0 ? (
              <EmptyState
                illustration="card"
                title={tr('Chưa có gói học nào đang mở bán')}
                description={tr('Các gói học và lượt AI sẽ hiển thị tại đây ngay khi được mở bán.')}
              />
            ) : (
              <>
                <UnifiedToolbar
                  ariaLabel={tr('Bộ lọc danh sách gói học')}
                  tabs={{
                    value: effectiveSelectedSection,
                    onChange: setSelectedSection,
                    items: localizedTabs,
                    size: 'sm',
                  }}
                  search={
                    showCatalogSearch
                      ? {
                        value: searchTerm,
                        onChange: setSearchTerm,
                        placeholder: tr('Tìm gói học, kỹ năng AI...'),
                        size: 'md',
                      }
                      : undefined
                  }
                  filters={
                    <div className="flex flex-wrap items-center gap-2">
                      {localizedDurationOptions.length > 1 && (
                        <CustomSelect
                          value={effectiveDurationFilter}
                          onChange={setDurationFilter}
                          options={localizedDurationOptions}
                          size="md"
                          fitContent
                          aria-label={tr('Thời hạn')}
                        />
                      )}
                      <CustomSelect
                        value={sortBy}
                        onChange={setSortBy}
                        options={sortOptions}
                        size="md"
                        fitContent
                        aria-label={tr('Sắp xếp')}
                      />
                    </div>
                  }
                />

                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-rp-text-muted">
                    <span>
                      {trf('Đang hiển thị {0}/{1} nhóm gói học', {
                        0: catalog.totalFilteredCount,
                        1: catalog.totalCatalogCount,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={resetCatalogFilters}
                      className="rp-focus font-semibold text-rp-brand-strong hover:underline"
                    >
                      {tr('Đặt lại bộ lọc')}
                    </button>
                  </div>
                )}

                {catalog.items.length === 0 ? (
                  <EmptyState
                    illustration="search"
                    title={tr('Không tìm thấy gói học phù hợp')}
                    description={tr('Thử đổi nhóm sản phẩm, thời hạn hoặc xóa từ khóa tìm kiếm để xem tất cả gói đang mở bán.')}
                    action={
                      <Button variant="secondary" onClick={resetCatalogFilters}>
                        {tr('Xem tất cả gói học')}
                      </Button>
                    }
                  />
                ) : (
                  <div
                    data-testid="plans-product-grid"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {catalog.items.map((group) => {
                      const storedId = selectedByGroup[group.key];
                      const storedPlan = group.variants.find((v) => v.id === storedId) ?? null;
                      const matchingVariant = effectiveDurationFilter !== 'ALL'
                        ? (storedPlan && matchesDurationBucket(storedPlan, effectiveDurationFilter)
                          ? storedPlan
                          : group.variants.find((v) => matchesDurationBucket(v, effectiveDurationFilter)))
                        : storedPlan;
                      const activePlanId = matchingVariant?.id ?? group.defaultPlanId;

                      return (
                        <PlanGroupCard
                          key={group.key}
                          group={group}
                          selectedPlanId={activePlanId}
                          onSelect={(planId) => selectVariant(group.key, planId)}
                          onBuy={openCheckout}
                          onViewBenefits={openBenefitsPreview}
                          activePlanName={current?.planName}
                          hasActiveSelfStudy={Boolean(current?.active)}
                          activeCategories={subscriptionSummary.activeCategories}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageContainer>

      {/* Modal 1: Active Subscriptions ("Gói đang sử dụng") */}
      <ActiveSubscriptionsModal
        open={activeModal === 'active'}
        onClose={closeAllModals}
        access={current}
        summary={subscriptionSummary}
        accessQuery={mineQuery}
        catalogByPlanId={livePlanById}
        sellablePlanIds={sellablePlanIds}
        onRenewPlan={openCheckout}
        onOpenHistory={() => openModal('history')}
      />

      {/* Modal 2: Purchase History ("Lịch sử mua gói") */}
      <PurchaseHistoryModal
        open={activeModal === 'history'}
        onClose={closeAllModals}
      />

      {/* Modal 3: Selected Variant Benefits Preview ("Xem quyền lợi") */}
      <PlanBenefitsModal
        open={activeModal === 'preview'}
        onClose={closeAllModals}
        group={previewGroup}
        plan={previewPlan}
        onBuy={openCheckout}
      />

      {/* Modal 4: Comparison Guide ("So sánh quyền lợi") */}
      <Modal
        open={activeModal === 'comparison'}
        onClose={closeAllModals}
        size="lg"
        title={tr('So sánh quyền lợi miễn phí & gói trả phí')}
        description={tr('Các công cụ nền tảng luôn miễn phí; gói học và lượt AI mở rộng phần nội dung chuyên sâu và AI.')}
        footer={
          <Button variant="secondary" onClick={closeAllModals}>
            {tr('Đóng')}
          </Button>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-rp-line">
          <table className="w-full min-w-[540px] border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-rp-brand-border/80 bg-rp-table-head text-[12.5px] font-semibold text-rp-brand-strong">
                <th className="px-3.5 py-2.5 text-left align-middle">{tr('Tính năng')}</th>
                <th className="px-3.5 py-2.5 text-center align-middle whitespace-nowrap">{tr('Miễn phí')}</th>
                <th className="px-3.5 py-2.5 text-center align-middle whitespace-nowrap">{tr('Gói tự học')}</th>
                <th className="px-3.5 py-2.5 text-center align-middle whitespace-nowrap">{tr('Gói AI')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rp-line/70">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-rp-row-hover">
                  <td className="px-3.5 py-2.5 text-left align-middle font-semibold text-rp-text">{tr(row.feature)}</td>
                  <td className="px-3.5 py-2.5 text-center align-middle text-rp-text-2">{tr(row.free)}</td>
                  <td className="px-3.5 py-2.5 text-center align-middle font-medium text-rp-brand-strong">{tr(row.selfStudy)}</td>
                  <td className="px-3.5 py-2.5 text-center align-middle text-rp-text-2">{tr(row.aiPack)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Modal 5: PayOS Checkout Flow */}
      {activeModal === 'checkout' && modalPlan && (
        <StudyCheckoutModal
          plan={modalPlan}
          currentAccess={current}
          onClose={closeAllModals}
        />
      )}
    </Shell>
  );
}
