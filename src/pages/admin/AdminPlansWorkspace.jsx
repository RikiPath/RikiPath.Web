import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, History, Package, Pencil, Plus, Search, Sparkles } from 'lucide-react';
import { AdminShell } from '@/layouts';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  FeatureIcon,
  Field,
  Input,
  Modal,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  Switch,
  Tabs,
  Textarea,
  notify,
} from '@/components/ui';
import {
  createAdminSubscriptionPlan,
  getAdminAuditLogs,
  getAdminSubscriptionPlans,
  getCurrentMentorGroupPolicy,
  updateAdminSubscriptionPlan,
} from '@/features/admin/api/adminApi.js';
import { courseGet, INTENSITY_OPTIONS, saveCoursePlan } from '@/features/cohorts/api/cohortApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const PLAN_CATEGORY_META = {
  self_study: { label: 'Gói tự học', tone: 'brand', creditOnly: false },
  speaking: { label: 'Luyện nói AI', tone: 'success', creditOnly: false },
  writing: { label: 'Luyện viết AI', tone: 'info', creditOnly: false },
  ai_grading: { label: 'Lượt chấm AI', tone: 'warning', creditOnly: true },
  learning_path: { label: 'Lượt lộ trình AI', tone: 'neutral', creditOnly: true },
};

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

const EMPTY_COHORT_DRAFT = {
  id: null,
  name: '',
  certificateLevelId: '',
  intensity: 'Standard',
  durationMonths: 3,
  sessionsPerWeek: 3,
  sessionMinutes: 90,
  totalSessions: 30,
  capacity: 4,
  retakeClaimDays: 30,
  price: 1500000,
  isPublished: false,
  revision: 1,
};

const money = (amount) => `${Number(amount || 0).toLocaleString(currentIntlTag())} ₫`;

function collapseSpaces(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function formatDurationLabel(plan, tr, trf) {
  const isCredit = PLAN_CATEGORY_META[plan.planCategory]?.creditOnly || Number(plan.durationDays || 0) === 0;
  if (isCredit) {
    return trf('Theo lượt · {0} lượt AI', { 0: plan.aiGradingQuota ?? 0 });
  }
  return plan.aiGradingQuota > 0
    ? trf('{0} ngày · {1} lượt AI', { 0: plan.durationDays, 1: plan.aiGradingQuota })
    : trf('{0} ngày', { 0: plan.durationDays });
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
  const [subSubmitted, setSubSubmitted] = useState(false);
  const [confirmRiskySave, setConfirmRiskySave] = useState(false);

  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [cohortDraft, setCohortDraft] = useState(EMPTY_COHORT_DRAFT);

  const subQuery = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: getAdminSubscriptionPlans,
  });

  const courseQuery = useQuery({
    queryKey: ['admin-course-plans-snapshot'],
    queryFn: () => courseGet(),
  });

  const policyQuery = useQuery({
    queryKey: ['admin-group-policy-current-for-plans'],
    queryFn: getCurrentMentorGroupPolicy,
    retry: false,
  });

  const auditQuery = useQuery({
    queryKey: ['admin-plans-audit-logs'],
    queryFn: () => getAdminAuditLogs({ take: 40 }),
    enabled: activeTab === 'audit',
  });

  const plans = useMemo(() => subQuery.data?.plans || [], [subQuery.data]);
  const features = useMemo(() => subQuery.data?.features || [], [subQuery.data]);
  const cohortPlans = useMemo(() => courseQuery.data?.plans || [], [courseQuery.data]);
  const levels = useMemo(() => courseQuery.data?.levels || [], [courseQuery.data]);

  const groupPolicy = policyQuery.data || null;
  const courseWeeks = Number(groupPolicy?.courseDurationWeeks) || 10;
  const policySessionMinutes = Number(groupPolicy?.sessionMinutes) || 90;
  const maxCohortLearners = Number(groupPolicy?.maxLearners) || 4;
  const recommendedSpw = Number(groupPolicy?.defaultSessionsPerWeek) || 3;
  const allowedSpw = useMemo(() => {
    const parsed = String(groupPolicy?.allowedSessionsPerWeekCsv || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return parsed.length ? parsed : [2, 3, 4];
  }, [groupPolicy]);
  const intensityOptions = useMemo(
    () => INTENSITY_OPTIONS.filter((o) => allowedSpw.includes(o.sessionsPerWeek)),
    [allowedSpw],
  );

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (categoryFilter !== 'ALL' && p.planCategory !== categoryFilter) return false;
      if (statusFilter === 'ACTIVE' && !p.isActive) return false;
      if (statusFilter === 'INACTIVE' && p.isActive) return false;
      if (!q) return true;
      return (
        String(p.name || '').toLowerCase().includes(q)
        || String(p.description || '').toLowerCase().includes(q)
      );
    });
  }, [plans, search, categoryFilter, statusFilter]);

  const subValidation = useMemo(() => {
    const errors = {};
    const name = collapseSpaces(subDraft.name);
    if (!name) errors.name = tr('Vui lòng nhập tên gói học.');
    else if (name.length > 150) errors.name = tr('Tên gói tối đa 150 ký tự.');
    else if (plans.some((p) => Number(p.id) !== Number(subDraft.id) && collapseSpaces(p.name).toLowerCase() === name.toLowerCase())) {
      errors.name = tr('Tên gói học đã tồn tại.');
    }

    if (String(subDraft.description || '').trim().length > 500) {
      errors.description = tr('Mô tả gói tối đa 500 ký tự.');
    }

    const priceNum = Number(subDraft.price);
    if (!Number.isInteger(priceNum) || priceNum < 0) {
      errors.price = tr('Giá bán phải là số nguyên VND không âm.');
    } else if (subDraft.isActive && priceNum <= 0) {
      errors.price = tr('Gói đang mở bán phải có giá lớn hơn 0 VND.');
    }

    const isCredit = Boolean(PLAN_CATEGORY_META[subDraft.planCategory]?.creditOnly);
    const durNum = Number(subDraft.durationDays);
    if (isCredit) {
      if (durNum !== 0) errors.durationDays = tr('Gói mua theo lượt AI có thời hạn cố định là 0 ngày.');
    } else if (!Number.isInteger(durNum) || durNum < 1 || durNum > 1095) {
      errors.durationDays = tr('Thời hạn gói phải từ 1 đến 1095 ngày.');
    }

    const quotaNum = Number(subDraft.aiGradingQuota);
    if (!Number.isInteger(quotaNum) || quotaNum < 0 || quotaNum > 5000) {
      errors.aiGradingQuota = tr('Số lượt AI phải từ 0 đến 5000.');
    } else if (subDraft.planCategory !== 'self_study' && quotaNum < 1) {
      errors.aiGradingQuota = tr('Gói kỹ năng hoặc lượt AI cần tối thiểu 1 lượt AI.');
    }

    const sortNum = Number(subDraft.sortOrder);
    if (!Number.isInteger(sortNum) || sortNum < 1) {
      errors.sortOrder = tr('Thứ tự hiển thị phải từ 1 trở lên.');
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }, [subDraft, plans, tr]);

  const saveSubMutation = useMutation({
    mutationFn: (payload) =>
      subDraft.id ? updateAdminSubscriptionPlan(subDraft.id, payload) : createAdminSubscriptionPlan(payload),
    onSuccess: async (_, variables) => {
      setSubModalOpen(false);
      setConfirmRiskySave(false);
      notify.success(subDraft.id ? tr('Đã cập nhật gói học.') : tr('Đã tạo gói học mới.'), variables.name);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-plans-audit-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['study-plans'] }),
      ]);
    },
    onError: (err) => {
      setConfirmRiskySave(false);
      notify.apiError(err, tr('Chưa lưu được gói học'));
    },
  });

  const saveCohortMutation = useMutation({
    mutationFn: (payload) => saveCoursePlan(payload),
    onSuccess: async () => {
      setCohortModalOpen(false);
      notify.success(tr('Đã lưu cấu hình gói học nhóm.'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-course-plans-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-plans-audit-logs'] }),
      ]);
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa lưu được gói lớp nhóm'));
    },
  });

  function openCreateSubModal() {
    const nextOrder = plans.length > 0 ? Math.max(...plans.map((p) => Number(p.sortOrder) || 0)) + 1 : 1;
    setSubDraft({
      ...EMPTY_SUB_DRAFT,
      sortOrder: String(nextOrder),
      featureIds: features.filter((f) => f.id <= 6).map((f) => f.id),
    });
    setSubSubmitted(false);
    setSubModalOpen(true);
  }

  function openEditSubModal(plan) {
    setSubDraft({
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
    });
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

    const isCredit = Boolean(PLAN_CATEGORY_META[subDraft.planCategory]?.creditOnly);
    saveSubMutation.mutate({
      name: collapseSpaces(subDraft.name),
      description: subDraft.description.trim() || null,
      planCategory: subDraft.planCategory,
      durationDays: isCredit ? 0 : Number(subDraft.durationDays),
      price: Number(subDraft.price),
      aiGradingQuota: Number(subDraft.aiGradingQuota),
      sortOrder: Number(subDraft.sortOrder),
      isPopular: Boolean(subDraft.isPopular),
      isActive: Boolean(subDraft.isActive),
      expectedRevision: subDraft.revision ?? undefined,
      featureIds: subDraft.featureIds,
      reason: subDraft.reason.trim() || null,
    });
  }

  function openCreateCohortModal() {
    setCohortDraft({
      ...EMPTY_COHORT_DRAFT,
      certificateLevelId: levels[0]?.id ? String(levels[0].id) : '',
      sessionsPerWeek: recommendedSpw,
      sessionMinutes: policySessionMinutes,
      totalSessions: courseWeeks * recommendedSpw,
      capacity: Math.min(4, maxCohortLearners),
    });
    setCohortModalOpen(true);
  }

  function openEditCohortModal(plan) {
    setCohortDraft({
      id: plan.id,
      name: plan.name || '',
      certificateLevelId: String(plan.certificateLevelId || ''),
      intensity: plan.intensity || 'Custom',
      durationMonths: plan.durationMonths ?? 3,
      sessionsPerWeek: plan.sessionsPerWeek ?? recommendedSpw,
      sessionMinutes: plan.sessionMinutes ?? policySessionMinutes,
      totalSessions: plan.totalSessions ?? courseWeeks * (plan.sessionsPerWeek ?? recommendedSpw),
      capacity: plan.capacity ?? Math.min(4, maxCohortLearners),
      retakeClaimDays: plan.retakeClaimDays ?? '',
      price: plan.price ?? 0,
      isPublished: Boolean(plan.isPublished),
      revision: plan.revision ?? 1,
    });
    setCohortModalOpen(true);
  }

  function applyCohortIntensity(value) {
    const opt = INTENSITY_OPTIONS.find((o) => o.value === value);
    setCohortDraft((prev) => {
      if (!opt) return { ...prev, intensity: value };
      return {
        ...prev,
        intensity: value,
        sessionsPerWeek: opt.sessionsPerWeek,
        sessionMinutes: policySessionMinutes,
        totalSessions: courseWeeks * opt.sessionsPerWeek,
      };
    });
  }

  const subColumns = [
    {
      key: 'sortOrder',
      header: tr('TT'),
      sortValue: (row) => Number(row.sortOrder),
      render: (row) => <span className="font-semibold tabular-nums text-rp-text-2">{row.sortOrder}</span>,
    },
    {
      key: 'name',
      header: tr('Tên gói học'),
      render: (row) => (
        <div className="min-w-[200px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-rp-text">{row.name}</span>
            {row.isPopular && <Badge tone="brand" size="sm" icon={false}>{tr('Phổ biến')}</Badge>}
          </div>
          {row.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-rp-text-muted">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'planCategory',
      header: tr('Phân loại'),
      render: (row) => {
        const meta = PLAN_CATEGORY_META[row.planCategory] || PLAN_CATEGORY_META.self_study;
        return <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>;
      },
    },
    {
      key: 'price',
      header: tr('Giá bán'),
      align: 'right',
      sortValue: (row) => Number(row.price),
      render: (row) => <span className="whitespace-nowrap font-bold tabular-nums text-rp-brand-strong">{money(row.price)}</span>,
    },
    {
      key: 'durationDays',
      header: tr('Quyền lợi & hạn'),
      render: (row) => <span className="text-xs text-rp-text-2">{formatDurationLabel(row, tr, trf)}</span>,
    },
    {
      key: 'paidPurchaseCount',
      header: tr('Đơn mua'),
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-rp-text-2">
          {trf('{0} đã TT / {1}', { 0: row.paidPurchaseCount ?? 0, 1: row.totalPurchaseCount ?? 0 })}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: tr('Trạng thái'),
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'} size="sm" icon={false}>
          {row.isActive ? tr('Đang mở bán') : tr('Ngừng bán')}
        </Badge>
      ),
    },
  ];

  const cohortColumns = [
    {
      key: 'name',
      header: tr('Gói khóa học nhóm'),
      render: (row) => (
        <div className="min-w-[200px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-rp-text">{row.name}</span>
            {row.isRecommendedIntensity && <Badge tone="success" size="sm" icon={false}>{tr('Khuyến nghị')}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-rp-text-muted">
            {row.level || 'JLPT'} · {row.intensityLabel || tr('Chuẩn nhóm')} · {trf('Sĩ số tối đa {0}', { 0: row.capacity })}
          </p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: tr('Lộ trình lớp'),
      render: (row) => (
        <span className="text-xs text-rp-text-2">
          {trf('{0} tháng · {1} buổi/tuần · {2} buổi ({3}p)', {
            0: row.durationMonths,
            1: row.sessionsPerWeek,
            2: row.totalSessions ?? '—',
            3: row.sessionMinutes ?? '—',
          })}
        </span>
      ),
    },
    {
      key: 'price',
      header: tr('Học phí'),
      align: 'right',
      sortValue: (row) => Number(row.price),
      render: (row) => <span className="font-bold tabular-nums text-rp-brand-strong">{money(row.price)}</span>,
    },
    {
      key: 'isPublished',
      header: tr('Trạng thái'),
      render: (row) => (
        <Badge tone={row.isPublished ? 'success' : 'neutral'} size="sm" icon={false}>
          {row.isPublished ? tr('Đang mở') : tr('Nháp')}
        </Badge>
      ),
    },
  ];

  const isCreditCategory = Boolean(PLAN_CATEGORY_META[subDraft.planCategory]?.creditOnly);
  const previewPrice = Number.isFinite(Number(subDraft.price)) ? money(subDraft.price) : '0 ₫';

  return (
    <AdminShell breadcrumb={tr('Gói học & bảng giá')}>
      <main className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Cấu hình kinh doanh')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="payment" size="lg" />
              <span>{tr('Gói học & bảng giá')}</span>
            </span>
          }
          description={tr('Quản lý bảng giá gói tự học, lượt AI và gói lớp nhóm trực tiếp từ máy chủ. Thay đổi giá hoặc ngừng bán không làm thay đổi quyền lợi và lịch sử các đơn đã mua.')}
          actions={<RefreshingIndicator active={subQuery.isFetching || courseQuery.isFetching} />}
        />

        <Tabs
          variant="pill"
          value={activeTab}
          onChange={setActiveTab}
          label={tr('Phân loại bảng giá')}
          tabs={[
            { value: 'subscription', label: tr('Gói tự học & Lượt AI'), icon: Package, count: plans.length },
            { value: 'cohort', label: tr('Gói học cùng Giáo viên'), icon: Sparkles, count: cohortPlans.length },
            { value: 'audit', label: tr('Lịch sử thay đổi'), icon: History },
          ]}
        />

        {activeTab === 'subscription' && (
          <div className="min-w-0 space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                  <div className="w-full min-w-0 flex-1 sm:min-w-[220px] sm:max-w-[300px]">
                    <Input
                      type="search"
                      icon={Search}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={tr('Tìm theo tên hoặc mô tả gói…')}
                      aria-label={tr('Tìm theo tên hoặc mô tả gói')}
                    />
                  </div>
                  <div className="w-full sm:w-[190px]">
                    <CustomSelect
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      aria-label={tr('Lọc theo phân loại gói')}
                      options={[
                        { value: 'ALL', label: tr('Tất cả phân loại') },
                        ...Object.entries(PLAN_CATEGORY_META).map(([value, meta]) => ({
                          value,
                          label: tr(meta.label),
                        })),
                      ]}
                    />
                  </div>
                  <div className="w-full sm:w-[170px]">
                    <CustomSelect
                      value={statusFilter}
                      onChange={setStatusFilter}
                      aria-label={tr('Lọc theo trạng thái')}
                      options={[
                        { value: 'ALL', label: tr('Tất cả trạng thái') },
                        { value: 'ACTIVE', label: tr('Đang mở bán') },
                        { value: 'INACTIVE', label: tr('Ngừng bán') },
                      ]}
                    />
                  </div>
                </div>
                <Button icon={Plus} onClick={openCreateSubModal} data-testid="add-subscription-plan-btn">
                  {tr('Thêm gói mới')}
                </Button>
              </div>
            </Card>

            {subQuery.isPending ? (
              <SakuraLoader variant="section" context="payment" label={tr('Đang tải bảng giá…')} delay={120} />
            ) : subQuery.isError ? (
              <Card>
                <ContextualErrorState
                  error={subQuery.error}
                  title={tr('Chưa tải được danh sách gói học')}
                  onRetry={() => subQuery.refetch()}
                  retrying={subQuery.isFetching}
                />
              </Card>
            ) : (
              <DataTable
                columns={subColumns}
                rows={filteredPlans}
                minTableWidth="min-w-full"
                pageSize={12}
                itemLabel={tr('gói')}
                caption={tr('Bảng giá gói tự học và lượt AI')}
                empty={
                  <ContextualEmptyState
                    compact
                    title={tr('Chưa có gói học phù hợp bộ lọc.')}
                    description={tr('Điều chỉnh bộ lọc hoặc thêm gói học mới cho học viên.')}
                    actionLabel={tr('Thêm gói mới')}
                    onAction={openCreateSubModal}
                  />
                }
                rowActions={(row) => (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Pencil}
                    onClick={() => openEditSubModal(row)}
                    data-testid={`edit-sub-plan-${row.id}`}
                  >
                    {tr('Sửa')}
                  </Button>
                )}
              />
            )}
          </div>
        )}

        {activeTab === 'cohort' && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-rp-text-2">
                  {trf('Tuân thủ chính sách lớp nhóm hiện hành: khóa {0} tuần · mỗi buổi {1} phút · tối đa {2} học viên.', {
                    0: courseWeeks,
                    1: policySessionMinutes,
                    2: maxCohortLearners,
                  })}
                </p>
                <Button icon={Plus} onClick={openCreateCohortModal} data-testid="add-cohort-plan-btn">
                  {tr('Thêm gói lớp nhóm')}
                </Button>
              </div>
            </Card>

            {courseQuery.isPending ? (
              <SakuraLoader variant="section" context="cohort" label={tr('Đang tải gói lớp nhóm…')} delay={120} />
            ) : courseQuery.isError ? (
              <Card>
                <ContextualErrorState
                  error={courseQuery.error}
                  title={tr('Chưa tải được gói học lớp nhóm')}
                  onRetry={() => courseQuery.refetch()}
                  retrying={courseQuery.isFetching}
                />
              </Card>
            ) : (
              <DataTable
                columns={cohortColumns}
                rows={cohortPlans}
                minTableWidth="min-w-full"
                pageSize={10}
                itemLabel={tr('gói lớp nhóm')}
                caption={tr('Bảng giá gói học cùng Giáo viên')}
                empty={
                  <ContextualEmptyState
                    compact
                    title={tr('Chưa có gói lớp nhóm nào.')}
                    description={tr('Nhấn "Thêm gói lớp nhóm" để tạo gói khóa học 10 tuần theo chính sách hiện hành.')}
                    actionLabel={tr('Thêm gói lớp nhóm')}
                    onAction={openCreateCohortModal}
                  />
                }
                rowActions={(row) => (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Pencil}
                    onClick={() => openEditCohortModal(row)}
                  >
                    {tr('Sửa')}
                  </Button>
                )}
              />
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <Card>
            {auditQuery.isPending ? (
              <SakuraLoader variant="section" context="data" label={tr('Đang tải nhật ký thay đổi…')} delay={120} />
            ) : auditQuery.isError ? (
              <ContextualErrorState
                error={auditQuery.error}
                title={tr('Chưa tải được lịch sử thay đổi')}
                onRetry={() => auditQuery.refetch()}
                retrying={auditQuery.isFetching}
              />
            ) : (auditQuery.data || []).length === 0 ? (
              <ContextualEmptyState
                compact
                title={tr('Chưa ghi nhận thay đổi cấu hình nào.')}
                description={tr('Mọi cập nhật bảng giá, danh mục hoặc chính sách sẽ được lưu vết tự động tại đây.')}
              />
            ) : (
              <div className="divide-y divide-rp-line">
                {(auditQuery.data || []).map((log) => (
                  <div key={log.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand" size="sm" icon={false}>{log.entityType}</Badge>
                        <span className="font-semibold text-rp-text">#{log.entityId}</span>
                        <Badge tone="neutral" size="sm" icon={false}>{log.action}</Badge>
                        {log.reason && <span className="text-xs text-rp-text-2">“{log.reason}”</span>}
                      </div>
                      <p className="text-xs text-rp-text-muted">
                        {tr('Thực hiện bởi')}: <strong className="text-rp-text-2">{log.actorName}</strong> · {formatVnDateTime(log.createdAtUtc)}
                      </p>
                    </div>
                    {log.afterJson && (
                      <details className="w-full rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2 text-xs text-rp-text-2">
                        <summary className="cursor-pointer font-medium text-rp-brand-strong">{tr('Xem dữ liệu thay đổi')}</summary>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">{log.afterJson}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>

      {/* Create / Edit Subscription Plan Modal */}
      <Modal
        open={subModalOpen}
        onClose={() => !saveSubMutation.isPending && setSubModalOpen(false)}
        title={subDraft.id ? tr('Chỉnh sửa gói học & giá') : tr('Thêm gói học mới')}
        description={tr('Mọi thay đổi giá hoặc thời hạn chỉ áp dụng cho đơn đặt hàng mới sau khi lưu.')}
        size="xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setSubModalOpen(false)} disabled={saveSubMutation.isPending}>
              {tr('Hủy')}
            </Button>
            <Button
              onClick={() => submitSubscriptionPlan(false)}
              loading={saveSubMutation.isPending}
              data-testid="save-subscription-plan-btn"
            >
              {subDraft.id ? tr('Lưu thay đổi') : tr('Tạo gói học')}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
          <div className="space-y-4">
            {subDraft.paidPurchaseCount > 0 && (
              <Banner tone="info" title={tr('Bảo vệ dữ liệu đơn đã mua')}>
                {trf('Gói này đã có {0} đơn thanh toán thành công. Chỉnh sửa giá hoặc ngừng mở bán sẽ không ảnh hưởng đến hạn dùng của các đơn cũ.', {
                  0: subDraft.paidPurchaseCount,
                })}
              </Banner>
            )}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label={tr('Tên gói học')} required error={subSubmitted ? subValidation.errors.name : undefined} className="sm:col-span-2">
                <Input
                  value={subDraft.name}
                  maxLength={150}
                  invalid={subSubmitted && Boolean(subValidation.errors.name)}
                  onChange={(e) => setSubDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder={tr('Ví dụ: Tự học tiếng Nhật - 6 tháng')}
                />
              </Field>

              <Field label={tr('Phân loại gói')} required>
                <CustomSelect
                  value={subDraft.planCategory}
                  onChange={(val) => {
                    const nextIsCredit = Boolean(PLAN_CATEGORY_META[val]?.creditOnly);
                    setSubDraft((d) => ({
                      ...d,
                      planCategory: val,
                      durationDays: nextIsCredit ? '0' : Number(d.durationDays) > 0 ? d.durationDays : '30',
                      aiGradingQuota: val !== 'self_study' && Number(d.aiGradingQuota) < 1 ? '1' : d.aiGradingQuota,
                    }));
                  }}
                  options={Object.entries(PLAN_CATEGORY_META).map(([value, meta]) => ({
                    value,
                    label: tr(meta.label),
                  }))}
                />
              </Field>

              <Field label={tr('Giá bán (VND)')} required error={subSubmitted ? subValidation.errors.price : undefined}>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={subDraft.price}
                  invalid={subSubmitted && Boolean(subValidation.errors.price)}
                  onChange={(e) => setSubDraft((d) => ({ ...d, price: e.target.value }))}
                />
              </Field>

              <Field
                label={tr('Thời hạn sử dụng (ngày)')}
                required
                hint={isCreditCategory ? tr('Cố định 0 ngày cho gói mua lượt lẻ') : undefined}
                error={subSubmitted ? subValidation.errors.durationDays : undefined}
              >
                <Input
                  type="number"
                  min={isCreditCategory ? 0 : 1}
                  max={1095}
                  disabled={isCreditCategory}
                  value={subDraft.durationDays}
                  invalid={subSubmitted && Boolean(subValidation.errors.durationDays)}
                  onChange={(e) => setSubDraft((d) => ({ ...d, durationDays: e.target.value }))}
                />
              </Field>

              <Field label={tr('Số lượt AI đi kèm')} required error={subSubmitted ? subValidation.errors.aiGradingQuota : undefined}>
                <Input
                  type="number"
                  min={0}
                  max={5000}
                  value={subDraft.aiGradingQuota}
                  invalid={subSubmitted && Boolean(subValidation.errors.aiGradingQuota)}
                  onChange={(e) => setSubDraft((d) => ({ ...d, aiGradingQuota: e.target.value }))}
                />
              </Field>

              <Field label={tr('Thứ tự hiển thị')} required error={subSubmitted ? subValidation.errors.sortOrder : undefined}>
                <Input
                  type="number"
                  min={1}
                  value={subDraft.sortOrder}
                  invalid={subSubmitted && Boolean(subValidation.errors.sortOrder)}
                  onChange={(e) => setSubDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                />
              </Field>

              <Field label={tr('Ghi chú cập nhật (tùy chọn)')}>
                <Input
                  maxLength={300}
                  value={subDraft.reason}
                  onChange={(e) => setSubDraft((d) => ({ ...d, reason: e.target.value }))}
                  placeholder={tr('Ví dụ: Điều chỉnh giá quý IV')}
                />
              </Field>

              <Field label={tr('Mô tả hiển thị cho học viên')} error={subSubmitted ? subValidation.errors.description : undefined} className="sm:col-span-2">
                <Textarea
                  rows={2}
                  maxLength={500}
                  value={subDraft.description}
                  invalid={subSubmitted && Boolean(subValidation.errors.description)}
                  onChange={(e) => setSubDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder={tr('Tóm tắt quyền lợi và đối tượng phù hợp…')}
                />
              </Field>
            </div>

            {features.length > 0 && (
              <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">
                  {tr('Quyền lợi đi kèm (Features)')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {features.map((f) => (
                    <Checkbox
                      key={f.id}
                      checked={subDraft.featureIds.includes(f.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSubDraft((d) => ({
                          ...d,
                          featureIds: checked
                            ? [...d.featureIds, f.id]
                            : d.featureIds.filter((id) => id !== f.id),
                        }));
                      }}
                      label={f.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-6 pt-1">
              <Switch
                checked={subDraft.isActive}
                onChange={(e) => setSubDraft((d) => ({ ...d, isActive: e.target.checked }))}
                label={tr('Đang mở bán trên Web/Mobile')}
              />
              <Switch
                checked={subDraft.isPopular}
                onChange={(e) => setSubDraft((d) => ({ ...d, isPopular: e.target.checked }))}
                label={tr('Nhãn "Phổ biến"')}
              />
            </div>
          </div>

          {/* Learner Card Live Preview */}
          <div className="space-y-2.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">
              <Eye className="h-3.5 w-3.5" />
              <span>{tr('Xem trước thẻ trang Mua gói')}</span>
            </p>
            <div
              className={`rounded-rp-card border bg-rp-surface p-5 shadow-rp-card ${
                subDraft.isPopular ? 'border-rp-brand-strong' : 'border-rp-line'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[16px] font-bold text-rp-text">{collapseSpaces(subDraft.name) || tr('Tên gói học')}</h4>
                {subDraft.isPopular && <Badge tone="brand" size="sm" icon={false}>{tr('Phổ biến')}</Badge>}
              </div>
              <p className="mt-2 text-[24px] font-bold tabular-nums text-rp-brand-strong">{previewPrice}</p>
              <p className="mt-1 text-xs text-rp-text-muted">
                {formatDurationLabel(
                  {
                    planCategory: subDraft.planCategory,
                    durationDays: Number(subDraft.durationDays || 0),
                    aiGradingQuota: Number(subDraft.aiGradingQuota || 0),
                  },
                  tr,
                  trf,
                )}
              </p>
              {subDraft.description?.trim() && (
                <p className="mt-3 text-[13px] leading-6 text-rp-text-2">{subDraft.description.trim()}</p>
              )}
              <div className="mt-4">
                <div className="inline-flex h-10 w-full items-center justify-center rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white opacity-95">
                  {subDraft.isActive ? tr('Mua gói') : tr('Ngừng bán (ẩn với học viên)')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Risky Price/Deactivate Confirmation */}
      <AlertDialog
        open={confirmRiskySave}
        onClose={() => setConfirmRiskySave(false)}
        onConfirm={() => submitSubscriptionPlan(true)}
        confirmLabel={tr('Xác nhận cập nhật')}
        cancelLabel={tr('Kiểm tra lại')}
        loading={saveSubMutation.isPending}
        title={tr('Xác nhận cập nhật gói đang có học viên sử dụng')}
        description={tr('Gói học này đã có giao dịch thành công. Cập nhật giá hoặc ngừng bán chỉ áp dụng cho đơn mới, các gói đã kích hoạt của học viên vẫn giữ nguyên hạn dùng và quyền lợi đã mua.')}
      />

      {/* Cohort Plan Modal */}
      <Modal
        open={cohortModalOpen}
        onClose={() => !saveCohortMutation.isPending && setCohortModalOpen(false)}
        title={cohortDraft.id ? tr('Chỉnh sửa gói lớp nhóm') : tr('Thêm gói lớp nhóm mới')}
        description={tr('Các thông số tuần/buổi học được đối chiếu tự động với chính sách lớp nhóm hiện hành.')}
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setCohortModalOpen(false)} disabled={saveCohortMutation.isPending}>
              {tr('Hủy')}
            </Button>
            <Button
              loading={saveCohortMutation.isPending}
              onClick={() =>
                saveCohortMutation.mutate({
                  ...cohortDraft,
                  certificateLevelId: Number(cohortDraft.certificateLevelId),
                  durationMonths: Number(cohortDraft.durationMonths),
                  sessionsPerWeek: Number(cohortDraft.sessionsPerWeek),
                  sessionMinutes: cohortDraft.sessionMinutes === '' ? null : Number(cohortDraft.sessionMinutes),
                  totalSessions: cohortDraft.totalSessions === '' ? null : Number(cohortDraft.totalSessions),
                  retakeClaimDays: cohortDraft.retakeClaimDays === '' ? null : Number(cohortDraft.retakeClaimDays),
                  price: Number(cohortDraft.price || 0),
                  capacity: Number(cohortDraft.capacity || 1),
                  sessionType: 'Group',
                })
              }
            >
              {tr('Lưu gói lớp nhóm')}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label={tr('Tên gói khóa học')} required className="sm:col-span-2">
            <Input
              maxLength={200}
              value={cohortDraft.name}
              onChange={(e) => setCohortDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={tr('Ví dụ: Lớp nhóm N4 Chuyên sâu 3 buổi/tuần')}
            />
          </Field>

          <Field label={tr('Cấp độ chứng chỉ')} required>
            <CustomSelect
              value={String(cohortDraft.certificateLevelId || '')}
              onChange={(val) => setCohortDraft((d) => ({ ...d, certificateLevelId: val }))}
              options={levels.map((l) => ({ value: String(l.id), label: `${l.certificateType} · ${l.code}` }))}
            />
          </Field>

          <Field label={tr('Cường độ theo chính sách')}>
            <CustomSelect
              value={cohortDraft.intensity || 'Custom'}
              onChange={applyCohortIntensity}
              options={[
                ...intensityOptions.map((o) => ({
                  value: o.value,
                  label: `${tr(o.label)} · ${o.sessionsPerWeek} ${tr('buổi/tuần')}${o.sessionsPerWeek === recommendedSpw ? tr(' (khuyến nghị)') : ''}`,
                })),
                { value: 'Custom', label: tr('Tùy chỉnh') },
              ]}
            />
          </Field>

          <Field label={tr('Học phí (VND)')} required>
            <Input
              type="number"
              min={0}
              step={1000}
              value={cohortDraft.price}
              onChange={(e) => setCohortDraft((d) => ({ ...d, price: e.target.value }))}
            />
          </Field>

          <Field label={tr('Sĩ số tối đa')}>
            <Input
              type="number"
              min={1}
              max={maxCohortLearners}
              value={cohortDraft.capacity}
              onChange={(e) => setCohortDraft((d) => ({ ...d, capacity: e.target.value }))}
            />
          </Field>

          <Field label={tr('Số tháng')}>
            <Input
              type="number"
              min={1}
              max={36}
              value={cohortDraft.durationMonths}
              onChange={(e) => setCohortDraft((d) => ({ ...d, durationMonths: e.target.value }))}
            />
          </Field>

          <Field label={tr('Buổi/tuần')}>
            <Input
              type="number"
              min={1}
              max={7}
              value={cohortDraft.sessionsPerWeek}
              onChange={(e) => setCohortDraft((d) => ({ ...d, sessionsPerWeek: e.target.value, intensity: 'Custom' }))}
            />
          </Field>

          <Field label={tr('Phút/buổi')}>
            <Input
              type="number"
              min={15}
              max={240}
              value={cohortDraft.sessionMinutes}
              onChange={(e) => setCohortDraft((d) => ({ ...d, sessionMinutes: e.target.value }))}
            />
          </Field>

          <Field label={tr('Tổng số buổi')}>
            <Input
              type="number"
              min={1}
              max={500}
              value={cohortDraft.totalSessions}
              onChange={(e) => setCohortDraft((d) => ({ ...d, totalSessions: e.target.value }))}
            />
          </Field>

          <Field label={tr('Hạn yêu cầu JLPT (ngày)')}>
            <Input
              type="number"
              min={1}
              max={730}
              value={cohortDraft.retakeClaimDays}
              onChange={(e) => setCohortDraft((d) => ({ ...d, retakeClaimDays: e.target.value }))}
            />
          </Field>

          <div className="flex items-end pb-2">
            <Switch
              checked={cohortDraft.isPublished}
              onChange={(e) => setCohortDraft((d) => ({ ...d, isPublished: e.target.checked }))}
              label={tr('Mở bán cho học viên')}
            />
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
