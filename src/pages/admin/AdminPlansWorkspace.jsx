import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, History, Package, Plus, ShieldCheck } from 'lucide-react';
import { useSmartRefresh } from '@/hooks/useSmartRefresh.js';
import { AdminShell } from '@/layouts';
import {
  AlertDialog,
  Button,
  ContextualEmptyState,
  CustomSelect,
  DataRefreshBoundary,
  Field,
  Input,
  UnifiedToolbar,
  notify,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import AdminMentorGroupPolicy from '@/pages/admin/AdminMentorGroupPolicy.jsx';
import {
  createAdminSubscriptionPlan,
  getAdminAuditLogs,
  getAdminSubscriptionPlans,
  updateAdminSubscriptionPlan,
} from '@/features/admin/api/adminApi.js';
import AdminPlanGroupsPanel from '@/features/admin/plans/AdminPlanGroupsPanel.jsx';
import AdminPlanEditModal from '@/features/admin/plans/AdminPlanEditModal.jsx';
import AdminFeaturePolicyPanel from '@/features/admin/plans/AdminFeaturePolicyPanel.jsx';
import AdminPlansAuditPanel from '@/features/admin/plans/AdminPlansAuditPanel.jsx';
import { PLAN_CATEGORY_OPTIONS, PLANS_AUDIT_SCOPE, groupAdminPlans } from '@/features/admin/plans/adminPlansModel.js';
import { useLocale } from '@/locales/locale.js';

const EMPTY_SUB_DRAFT = {
  id: null,
  name: '',
  description: '',
  planCategory: 'self_study',
  durationDays: '30',
  price: '49000',
  aiGradingQuota: '5',
  sortOrder: '1',
  isPopular: false,
  isActive: true,
  featureIds: [],
  reason: '',
  revision: null,
  paidPurchaseCount: 0,
  originalPrice: null,
  originalActive: null,
};

function collapseSpaces(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isCreditCategory(category) {
  return Boolean(PLAN_CATEGORY_OPTIONS.find((o) => o.value === category)?.creditOnly);
}

function draftFromPlan(plan) {
  return {
    id: plan.id,
    name: plan.name || '',
    description: plan.description || '',
    planCategory: plan.planCategory || 'self_study',
    durationDays: String(plan.durationDays ?? 0),
    price: String(plan.price ?? 0),
    aiGradingQuota: String(plan.aiGradingQuota ?? 0),
    sortOrder: String(plan.sortOrder ?? 1),
    isPopular: Boolean(plan.isPopular),
    isActive: Boolean(plan.isActive),
    featureIds: Array.isArray(plan.featureIds) ? [...plan.featureIds] : [],
    reason: '',
    revision: plan.revision ?? 1,
    paidPurchaseCount: plan.paidPurchaseCount ?? 0,
    originalPrice: Number(plan.price ?? 0),
    originalActive: Boolean(plan.isActive),
  };
}

/** Full save payload for a plan (the update endpoint replaces every field). */
function payloadFromPlan(plan, overrides = {}) {
  return {
    name: collapseSpaces(plan.name),
    description: plan.description || null,
    planCategory: plan.planCategory,
    durationDays: Number(plan.durationDays) || 0,
    price: Number(plan.price) || 0,
    aiGradingQuota: Number(plan.aiGradingQuota) || 0,
    sortOrder: Number(plan.sortOrder) || 1,
    isPopular: Boolean(plan.isPopular),
    isActive: Boolean(plan.isActive),
    expectedRevision: plan.revision ?? undefined,
    featureIds: Array.isArray(plan.featureIds) ? plan.featureIds : [],
    reason: null,
    ...overrides,
  };
}

export default function AdminPlansWorkspace() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('subscription');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subDraft, setSubDraft] = useState(EMPTY_SUB_DRAFT);
  const [subOriginal, setSubOriginal] = useState(null);
  const [subSubmitted, setSubSubmitted] = useState(false);
  const [confirmRiskySave, setConfirmRiskySave] = useState(false);
  const [saleTarget, setSaleTarget] = useState(null);
  const [saleReason, setSaleReason] = useState('');

  const subQuery = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: getAdminSubscriptionPlans,
  });

  const auditQuery = useQuery({
    queryKey: ['admin-plans-audit-logs'],
    // Only plan / variant / feature-policy events belong to this page's history.
    queryFn: () => getAdminAuditLogs({ take: 60, entityType: PLANS_AUDIT_SCOPE }),
    enabled: activeTab === 'audit',
  });

  const plans = useMemo(() => subQuery.data?.plans || [], [subQuery.data]);
  const features = useMemo(() => subQuery.data?.features || [], [subQuery.data]);
  const allGroups = useMemo(() => groupAdminPlans(plans), [plans]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = plans.filter((p) => {
      if (categoryFilter !== 'ALL' && p.planCategory !== categoryFilter) return false;
      if (statusFilter === 'ACTIVE' && !p.isActive) return false;
      if (statusFilter === 'INACTIVE' && p.isActive) return false;
      if (!q) return true;
      return String(p.name || '').toLowerCase().includes(q) || String(p.description || '').toLowerCase().includes(q);
    });
    return groupAdminPlans(matching);
  }, [plans, search, categoryFilter, statusFilter]);

  const subValidation = useMemo(() => {
    const errors = {};
    const name = collapseSpaces(subDraft.name);
    if (!name) errors.name = tr('Vui lòng nhập tên gói học.');
    else if (name.length > 150) errors.name = tr('Tên gói tối đa 150 ký tự.');
    else if (plans.some((p) => Number(p.id) !== Number(subDraft.id) && collapseSpaces(p.name).toLowerCase() === name.toLowerCase())) {
      errors.name = tr('Tên gói học đã tồn tại.');
    }
    if (String(subDraft.description || '').trim().length > 500) errors.description = tr('Mô tả gói tối đa 500 ký tự.');

    const priceNum = Number(subDraft.price);
    if (!Number.isInteger(priceNum) || priceNum < 0) errors.price = tr('Giá bán phải là số nguyên VND không âm.');
    else if (subDraft.isActive && priceNum <= 0) errors.price = tr('Gói đang mở bán phải có giá lớn hơn 0 VND.');

    const credit = isCreditCategory(subDraft.planCategory);
    const durNum = Number(subDraft.durationDays);
    if (credit) {
      if (durNum !== 0) errors.durationDays = tr('Gói mua theo lượt AI có thời hạn cố định là 0 ngày.');
    } else if (!Number.isInteger(durNum) || durNum < 1 || durNum > 1095) {
      errors.durationDays = tr('Thời hạn gói phải từ 1 đến 1095 ngày.');
    } else if (plans.some((p) => p.id !== subDraft.id && p.planCategory === subDraft.planCategory
      && Number(p.durationDays) === durNum && Number(p.aiGradingQuota) === Number(subDraft.aiGradingQuota))) {
      errors.durationDays = tr('Nhóm gói này đã có thời hạn và số lượt AI giống hệt. Vui lòng chọn thời hạn khác.');
    }

    const quotaNum = Number(subDraft.aiGradingQuota);
    if (!Number.isInteger(quotaNum) || quotaNum < 0 || quotaNum > 5000) errors.aiGradingQuota = tr('Số lượt AI phải từ 0 đến 5000.');
    else if (subDraft.planCategory !== 'self_study' && quotaNum < 1) errors.aiGradingQuota = tr('Gói kỹ năng hoặc lượt AI cần tối thiểu 1 lượt AI.');

    const sortNum = Number(subDraft.sortOrder);
    if (!Number.isInteger(sortNum) || sortNum < 1) errors.sortOrder = tr('Thứ tự hiển thị phải từ 1 trở lên.');

    return { valid: Object.keys(errors).length === 0, errors };
  }, [subDraft, plans, tr]);

  async function invalidatePlans() {
    // Learner catalog (`study-plans`), entitlements (`study-subscription`) and admin views all refresh after a save.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-plans-audit-logs'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-entitlement-preview'] }),
      queryClient.invalidateQueries({ queryKey: ['study-plans'] }),
      queryClient.invalidateQueries({ queryKey: ['study-subscription'] }),
    ]);
  }

  const saveSubMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateAdminSubscriptionPlan(id, payload) : createAdminSubscriptionPlan(payload)),
    onSuccess: async (_, { id, payload }) => {
      setSubModalOpen(false);
      setConfirmRiskySave(false);
      notify.success(id ? tr('Đã cập nhật gói học.') : tr('Đã tạo gói học mới.'), payload.name);
      await invalidatePlans();
    },
    onError: (err) => {
      setConfirmRiskySave(false);
      notify.apiError(err, tr('Chưa lưu được gói học'));
    },
  });

  const saleMutation = useMutation({
    mutationFn: ({ plan, isActive, reason }) => updateAdminSubscriptionPlan(plan.id, payloadFromPlan(plan, { isActive, reason: reason || null })),
    onSuccess: async (_, { plan, isActive }) => {
      setSaleTarget(null);
      setSaleReason('');
      notify.success(isActive ? tr('Đã mở bán trở lại gói học.') : tr('Đã ngừng bán gói học.'), plan.name);
      await invalidatePlans();
    },
    onError: (err) => {
      setSaleTarget(null);
      notify.apiError(err, tr('Chưa cập nhật được trạng thái bán'));
    },
  });

  function openCreateSubModal(category = 'self_study') {
    const nextOrder = plans.length > 0 ? Math.max(...plans.map((p) => Number(p.sortOrder) || 0)) + 1 : 1;
    const credit = isCreditCategory(category);
    setSubDraft({
      ...EMPTY_SUB_DRAFT,
      planCategory: category,
      durationDays: credit ? '0' : EMPTY_SUB_DRAFT.durationDays,
      aiGradingQuota: category !== 'self_study' ? '1' : EMPTY_SUB_DRAFT.aiGradingQuota,
      sortOrder: String(nextOrder),
      // Start from the benefits the group's existing variants already grant (no hard-coded feature ids).
      featureIds: [...new Set(plans.filter((p) => p.planCategory === category).flatMap((p) => p.featureIds || []))],
    });
    setSubOriginal(null);
    setSubSubmitted(false);
    setSubModalOpen(true);
  }

  function openEditSubModal(plan) {
    const draft = draftFromPlan(plan);
    setSubDraft(draft);
    setSubOriginal(draft);
    setSubSubmitted(false);
    setSubModalOpen(true);
  }

  function submitSubscriptionPlan(force = false) {
    setSubSubmitted(true);
    if (!subValidation.valid) return;

    const priceChanged = subDraft.id && Number(subDraft.price) !== Number(subDraft.originalPrice);
    const deactivated = subDraft.id && subDraft.originalActive && !subDraft.isActive;
    if (!force && subDraft.paidPurchaseCount > 0 && (priceChanged || deactivated)) {
      setConfirmRiskySave(true);
      return;
    }

    const credit = isCreditCategory(subDraft.planCategory);
    saveSubMutation.mutate({
      id: subDraft.id,
      payload: {
        name: collapseSpaces(subDraft.name),
        description: subDraft.description.trim() || null,
        planCategory: subDraft.planCategory,
        durationDays: credit ? 0 : Number(subDraft.durationDays),
        price: Number(subDraft.price),
        aiGradingQuota: Number(subDraft.aiGradingQuota),
        sortOrder: Number(subDraft.sortOrder),
        isPopular: Boolean(subDraft.isPopular),
        isActive: Boolean(subDraft.isActive),
        expectedRevision: subDraft.revision ?? undefined,
        featureIds: subDraft.featureIds,
        reason: subDraft.reason.trim() || null,
      },
    });
  }

  function requestToggleSale(plan) {
    if (plan.isActive) {
      setSaleReason('');
      setSaleTarget(plan);
      return;
    }
    saleMutation.mutate({ plan, isActive: true, reason: null });
  }

  const { refresh: refreshPlans, isRefreshing: plansRefreshing } = useSmartRefresh({
    queries: [subQuery, activeTab === 'audit' ? auditQuery : null],
  });

  const hasPlans = subQuery.isSuccess && plans.length > 0;

  return (
    <AdminShell breadcrumb={tr('Gói học & học phí')}>
      <AdminWorkspace viewportLocked page="AdminPlansWorkspace">
        <AdminPageHeader icon={Package} title="Gói học & học phí" className="mb-0 shrink-0" />

        <UnifiedToolbar
          divider={false}
          className="lg:flex-wrap!"
          leftClassName="lg:flex-none!"
          rightClassName="lg:flex-[1_0_auto]! lg:justify-between!"
          tabs={{
            label: tr('Phân loại bảng giá'),
            value: activeTab,
            onChange: setActiveTab,
            tabs: [
              { value: 'subscription', label: tr('Gói học & Lượt AI'), icon: Package, count: allGroups.length },
              { value: 'tuition', label: tr('Học phí lớp học nhóm'), icon: GraduationCap },
              { value: 'features', label: tr('Chính sách tính năng'), icon: ShieldCheck, count: features.length },
              { value: 'audit', label: tr('Lịch sử thay đổi'), icon: History },
            ],
          }}
          search={
            activeTab === 'subscription' && hasPlans
              ? {
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  onClear: () => setSearch(''),
                  placeholder: 'Tìm theo tên hoặc mô tả gói…',
                  ariaLabel: tr('Tìm theo tên hoặc mô tả gói'),
                  fitContent: false,
                  className: 'sm:flex-[1_1_320px] sm:max-w-none!',
                }
              : undefined
          }
          filters={
            activeTab === 'subscription' && hasPlans ? (
              <>
                <CustomSelect
                  fitContent
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  aria-label={tr('Nhóm gói')}
                  options={[
                    { value: 'ALL', label: tr('Tất cả') },
                    ...PLAN_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) })),
                  ]}
                />
                <CustomSelect
                  fitContent
                  value={statusFilter}
                  onChange={setStatusFilter}
                  aria-label={tr('Trạng thái')}
                  options={[
                    { value: 'ALL', label: tr('Tất cả') },
                    { value: 'ACTIVE', label: tr('Đang mở bán') },
                    { value: 'INACTIVE', label: tr('Đã ngừng bán') },
                  ]}
                />
              </>
            ) : undefined
          }
          refresh={{
            when: activeTab === 'tuition' ? false : (activeTab === 'audit' ? (auditQuery.data || []).length > 0 : plans.length > 0),
            onRefresh: refreshPlans,
            refreshing: plansRefreshing,
          }}
          actions={
            activeTab === 'subscription' && hasPlans ? (
              <Button size="md" icon={Plus} onClick={() => openCreateSubModal()} data-testid="add-subscription-plan-btn">
                {tr('Thêm gói mới')}
              </Button>
            ) : undefined
          }
        />

        {activeTab === 'subscription' && (
          <DataRefreshBoundary
            fillHeight
            queries={[subQuery]}
            loading={subQuery.isPending && !subQuery.data}
            refreshing={subQuery.isFetching && !subQuery.isPending}
            error={subQuery.error}
            hasData={Boolean(subQuery.data)}
            isEmpty={false}
            loadingContext="payment"
            loadingLabel={tr('Đang tải bảng giá…')}
            loadingDelay={120}
            errorTitle={tr('Chưa tải được danh sách gói học')}
            onRetry={() => subQuery.refetch()}
          >
            {plans.length === 0 ? (
              <ContextualEmptyState variant="compact" illustration="certificate" title={tr('Chưa có gói học nào.')} description="" action={<Button size="sm" icon={Plus} onClick={() => openCreateSubModal()}>{tr('Thêm gói mới')}</Button>} />
            ) : filteredGroups.length === 0 ? (
              <ContextualEmptyState variant="search" illustration="certificate" title={tr('Chưa có gói học phù hợp bộ lọc.')} description="" action={<Button size="sm" variant="outline" onClick={() => { setSearch(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); }}>{tr('Xóa bộ lọc')}</Button>} />
            ) : (
              <AdminPlanGroupsPanel
                groups={filteredGroups}
                features={features}
                onEdit={openEditSubModal}
                onCreateInGroup={openCreateSubModal}
                onToggleSale={requestToggleSale}
                savingPlanId={saleMutation.isPending ? saleMutation.variables?.plan?.id : null}
              />
            )}
          </DataRefreshBoundary>
        )}

        {activeTab === 'tuition' && (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
            <AdminMentorGroupPolicy section="tuition" />
          </div>
        )}

        {activeTab === 'features' && (
          <DataRefreshBoundary
            fillHeight
            queries={[subQuery]}
            loading={subQuery.isPending && !subQuery.data}
            refreshing={subQuery.isFetching && !subQuery.isPending}
            error={subQuery.error}
            hasData={Boolean(subQuery.data)}
            isEmpty={features.length === 0}
            loadingContext="data"
            loadingLabel={tr('Đang tải chính sách tính năng…')}
            loadingDelay={120}
            errorTitle={tr('Chưa tải được danh sách tính năng')}
            onRetry={() => subQuery.refetch()}
            empty={<ContextualEmptyState variant="compact" illustration="certificate" title={tr('Chưa có tính năng nào được cấu hình.')} />}
          >
            <AdminFeaturePolicyPanel features={features} groups={allGroups} />
          </DataRefreshBoundary>
        )}

        {activeTab === 'audit' && (
          <DataRefreshBoundary
            fillHeight
            queries={[auditQuery]}
            loading={auditQuery.isPending && !auditQuery.data}
            refreshing={auditQuery.isFetching && !auditQuery.isPending}
            error={auditQuery.error}
            hasData={Boolean(auditQuery.data)}
            isEmpty={(auditQuery.data || []).length === 0}
            loadingContext="data"
            loadingLabel={tr('Đang tải lịch sử thay đổi…')}
            loadingDelay={120}
            errorTitle={tr('Chưa tải được lịch sử thay đổi')}
            onRetry={() => auditQuery.refetch()}
            empty={<ContextualEmptyState variant="compact" illustration="clock" title={tr('Chưa ghi nhận thay đổi nào về gói học hoặc tính năng.')} />}
          >
            <AdminPlansAuditPanel logs={auditQuery.data || []} plans={plans} features={features} />
          </DataRefreshBoundary>
        )}
      </AdminWorkspace>

      <AdminPlanEditModal
        open={subModalOpen}
        draft={subDraft}
        original={subOriginal}
        setDraft={setSubDraft}
        errors={subSubmitted ? subValidation.errors : {}}
        features={features}
        plans={plans}
        saving={saveSubMutation.isPending}
        onSubmit={() => submitSubscriptionPlan(false)}
        onClose={() => setSubModalOpen(false)}
      />

      <AlertDialog
        open={confirmRiskySave}
        tone="warning"
        onClose={() => setConfirmRiskySave(false)}
        onConfirm={() => submitSubscriptionPlan(true)}
        confirmLabel={tr('Xác nhận cập nhật')}
        cancelLabel={tr('Kiểm tra lại')}
        loading={saveSubMutation.isPending}
        title={tr('Cập nhật gói đã có học viên mua?')}
        description={tr('Thay đổi giá hoặc trạng thái bán chỉ áp dụng cho đơn mua mới. Học viên đã kích hoạt vẫn giữ nguyên giá, thời hạn và quyền lợi đã mua.')}
      />

      <AlertDialog
        open={Boolean(saleTarget)}
        tone="warning"
        onClose={() => setSaleTarget(null)}
        onConfirm={() => saleTarget && saleMutation.mutate({ plan: saleTarget, isActive: false, reason: saleReason.trim() })}
        confirmLabel={tr('Ngừng bán gói')}
        cancelLabel={tr('Hủy')}
        loading={saleMutation.isPending}
        title={saleTarget ? trf('Ngừng bán "{0}"?', { 0: saleTarget.name }) : ''}
        description={tr('Bạn có chắc muốn ngừng bán gói này? Học viên sẽ không thể mua mới, nhưng các gói đã kích hoạt vẫn giữ nguyên quyền lợi.')}
      >
        <Field label={tr('Lý do thay đổi')}>
          <Input maxLength={300} value={saleReason} onChange={(e) => setSaleReason(e.target.value)} placeholder={tr('Ví dụ: Tạm ngưng chương trình khuyến mãi')} />
        </Field>
      </AlertDialog>
    </AdminShell>
  );
}
