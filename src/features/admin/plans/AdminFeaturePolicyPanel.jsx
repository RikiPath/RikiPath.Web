import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, PauseCircle, ShieldCheck } from 'lucide-react';

import {
  AlertDialog, Badge, Card, CountBadge, CustomSelect, ErrorState, Field, Input, RefreshingIndicator, SakuraLoader, Button, cx, notify,
} from '@/components/ui';
import { getAdminEntitlementPreview, updateAdminFeaturePolicy } from '@/features/admin/api/adminApi.js';
import { formatVnd } from '@/features/checkout/planGroups.js';
import { useLocale } from '@/locales/locale.js';
import {
  ACCESS_POLICY_LABELS,
  ACCESS_POLICY_TONES,
  AVAILABILITY,
  AVAILABILITY_LABELS,
  EFFECTIVE_STATE_META,
  adminVariantLabel,
  featureDisplayName,
  featurePolicyState,
  featureScopeText,
  groupFeaturesByLearnerSidebar,
} from './adminPlansModel.js';
import { ROLE_NAV } from '@/layouts/appNav.js';

const POLICY_OPTIONS = ['FREE', 'PLAN_REQUIRED', 'CREDIT_REQUIRED', 'PLAN_AND_CREDIT'];

/** Effective state when an older API omits `state` (same rules as the Backend `EffectiveState`). */
function previewState(item) {
  if (item.state) return item.state;
  if (item.allowed) return 'AVAILABLE';
  const mode = String(item.accessMode || '').toUpperCase();
  if (item.accessSource === 'DISABLED' || mode === 'DISABLED') return 'ADMIN_DISABLED';
  if (mode === 'CREDIT_REQUIRED') return 'CREDIT_LOCKED';
  if (mode === 'PLAN_AND_CREDIT') return 'PLAN_AND_CREDIT_LOCKED';
  return 'PLAN_LOCKED';
}

/**
 * "Chính sách tính năng": per feature, availability (active / suspended by an Admin) and access policy are edited
 * separately — suspending keeps the policy, re-opening restores it. The Backend enforces both (`[RequireFeature]`,
 * `/subscriptions/me`); this panel only edits the single configuration source.
 */
export default function AdminFeaturePolicyPanel({ features, groups }) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const [confirm, setConfirm] = useState(null); // { feature, payload }
  const [reasonErrors, setReasonErrors] = useState({});

  // Preview scenario: free account, or one group + one of its variants.
  const [previewGroupKey, setPreviewGroupKey] = useState('');
  const [previewPlanByGroup, setPreviewPlanByGroup] = useState({});
  const previewGroup = groups.find((g) => g.key === previewGroupKey) ?? null;
  const previewPlanId = previewGroup
    ? (previewPlanByGroup[previewGroup.key] ?? (previewGroup.variants.find((v) => v.isActive) ?? previewGroup.variants[0])?.id ?? null)
    : null;
  const previewPlan = previewGroup?.variants.find((v) => v.id === previewPlanId) ?? null;

  const previewQuery = useQuery({
    queryKey: ['admin-entitlement-preview', previewPlanId || 'free'],
    queryFn: () => getAdminEntitlementPreview(previewPlanId),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAdminFeaturePolicy(id, payload),
    onSuccess: async (updated, { id }) => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setConfirm(null);
      notify.success(tr('Đã lưu cấu hình tính năng.'), featureDisplayName(updated) || '');
      // Learner surfaces read `study-subscription`; plans/preview/history read the admin queries.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-entitlement-preview'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-plans-audit-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['study-subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['study-plans'] }),
      ]);
    },
    onError: (err) => {
      setConfirm(null);
      notify.apiError(err, tr('Chưa lưu được cấu hình tính năng'));
    },
  });

  function draftFor(feature) {
    const current = featurePolicyState(feature);
    const draft = drafts[feature.id] || {};
    return {
      current,
      availability: draft.availability ?? current.availability,
      policy: draft.policy ?? current.policy ?? 'PLAN_REQUIRED',
      reason: draft.reason ?? '',
    };
  }

  function patchDraft(id, patch) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    if (patch.reason !== undefined) setReasonErrors((prev) => ({ ...prev, [id]: undefined }));
  }

  function save(feature) {
    const { current, availability, policy, reason } = draftFor(feature);
    const availabilityChanged = availability !== current.availability;
    // Same rule as the Backend: confirm + reason when learners lose access they have today.
    const losesFreeAccess = current.policy === 'FREE' && policy !== 'FREE';
    const sensitive = (availabilityChanged && availability === AVAILABILITY.DISABLED) || losesFreeAccess;
    const payload = {
      accessMode: policy,
      availability,
      reason: reason.trim() || null,
      expectedState: feature.storedState ?? undefined,
    };
    if (sensitive) {
      if (!reason.trim()) {
        setReasonErrors((prev) => ({ ...prev, [feature.id]: tr('Vui lòng nhập lý do cho thay đổi này.') }));
        return;
      }
      setConfirm({ feature, payload: { ...payload, confirmImpact: true } });
      return;
    }
    saveMutation.mutate({ id: feature.id, payload });
  }

  const previewItems = useMemo(() => previewQuery.data?.features || [], [previewQuery.data]);
  // Cards follow the Learner sidebar (group order, then item order) so a feature is found where learners see it.
  const featureGroups = useMemo(() => groupFeaturesByLearnerSidebar(features, ROLE_NAV.Learner), [features]);

  return (
    <div className="relative grid min-h-0 flex-1 items-start gap-4 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-rp-text">{tr('Chính sách truy cập tính năng')}</h2>
            <p className="mt-0.5 text-xs text-rp-text-muted">
              {tr('Bật hoặc tạm ngừng cung cấp từng tính năng và chọn điều kiện truy cập. Tạm ngừng không làm mất điều kiện truy cập đã cấu hình.')}
            </p>
          </div>
          <Badge tone="neutral" size="sm" icon={false}>{trf('{0} tính năng', { 0: features.length })}</Badge>
        </div>

        <div className="space-y-5" data-testid="admin-feature-policies-list">
          {featureGroups.map((group) => (
          <section key={group.label} aria-label={tr(group.label)} className="space-y-3">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-rp-text-muted">
              {tr(group.label)}
              <CountBadge count={group.features.length} size="sm" showZero />
            </h3>
          {group.features.map((feat) => {
            const { current, availability, policy, reason } = draftFor(feat);
            const dirty = availability !== current.availability || policy !== (current.policy ?? policy) || Boolean(reason.trim())
              || (!current.policyKnown && availability === AVAILABILITY.ACTIVE);
            const saving = saveMutation.isPending && saveMutation.variables?.id === feat.id;
            const suspended = current.availability === AVAILABILITY.DISABLED;
            const scope = featureScopeText(feat);
            return (
              <div
                key={feat.id}
                data-testid={`feature-policy-row-${feat.code}`}
                className={cx('rounded-xl border bg-white p-3.5 shadow-rp-xs', suspended ? 'border-rp-line bg-rp-bg-2/40' : 'border-rp-line')}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-rp-text">{tr(featureDisplayName(feat))}</span>
                  <Badge tone={suspended ? 'neutral' : 'success'} size="sm" icon={false}>{tr(AVAILABILITY_LABELS[current.availability])}</Badge>
                  {current.policy && (
                    <Badge tone={ACCESS_POLICY_TONES[current.policy] || 'neutral'} size="sm" icon={false}>{tr(ACCESS_POLICY_LABELS[current.policy])}</Badge>
                  )}
                </div>
                {feat.description && <p className="mt-1 text-xs text-rp-text-2">{feat.description}</p>}
                <p className="mt-1 text-[11px] text-rp-text-muted">
                  {scope ? tr(scope) : ''}
                  {scope ? ' · ' : ''}
                  {trf('{0} gói học bao gồm', { 0: feat.linkedPlanCount ?? 0 })}
                </p>

                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <CustomSelect
                    fitContent
                    aria-label={trf('Trạng thái cung cấp của {0}', { 0: featureDisplayName(feat) })}
                    disabled={saving}
                    value={availability}
                    onChange={(val) => patchDraft(feat.id, { availability: val })}
                    options={[AVAILABILITY.ACTIVE, AVAILABILITY.DISABLED].map((value) => ({ value, label: tr(AVAILABILITY_LABELS[value]) }))}
                  />
                  <CustomSelect
                    fitContent
                    aria-label={trf('Điều kiện truy cập của {0}', { 0: featureDisplayName(feat) })}
                    disabled={saving}
                    value={policy}
                    onChange={(val) => patchDraft(feat.id, { policy: val })}
                    options={POLICY_OPTIONS.map((value) => ({ value, label: tr(ACCESS_POLICY_LABELS[value]) }))}
                  />
                  <div className="min-w-[200px] flex-1">
                    <Input
                      maxLength={250}
                      disabled={saving}
                      value={reason}
                      invalid={Boolean(reasonErrors[feat.id])}
                      aria-label={trf('Lý do thay đổi cho {0}', { 0: featureDisplayName(feat) })}
                      placeholder={tr('Lý do thay đổi')}
                      onChange={(e) => patchDraft(feat.id, { reason: e.target.value })}
                    />
                    {reasonErrors[feat.id] && <p role="alert" className="mt-1 text-xs text-rp-danger">{reasonErrors[feat.id]}</p>}
                  </div>
                  <Button
                    size="md"
                    disabled={!dirty || saving}
                    loading={saving}
                    data-testid={`save-feature-policy-${feat.id}`}
                    onClick={() => save(feat)}
                  >
                    {tr('Lưu')}
                  </Button>
                </div>
                {!current.policyKnown && (
                  <p className="mt-1.5 text-[11px] text-rp-warning">
                    {tr('Chưa ghi nhận điều kiện truy cập trước khi tạm ngừng. Hãy chọn điều kiện phù hợp trước khi mở lại.')}
                  </p>
                )}
              </div>
            );
          })}
          </section>
          ))}
        </div>
      </Card>

      {/* Sticky inside the tab's own scroll area, so the offset follows the real header/toolbar height. */}
      <Card className="p-4 sm:p-5 lg:sticky lg:top-4" data-testid="admin-entitlement-preview">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold text-rp-text">{tr('Xem trước quyền lợi theo gói')}</h2>
              <p className="mt-0.5 text-xs text-rp-text-muted">
                {tr('Kết quả truy cập thực tế theo cấu hình đang áp dụng cho học viên.')}
              </p>
            </div>
            <RefreshingIndicator active={previewQuery.isFetching && !previewQuery.isPending} />
          </div>

          <Field label={tr('Nhóm gói')}>
            <CustomSelect
              aria-label={tr('Chọn nhóm gói để xem trước')}
              value={previewGroupKey}
              onChange={setPreviewGroupKey}
              options={[
                { value: '', label: tr('Tài khoản miễn phí') },
                ...groups.map((g) => ({ value: g.key, label: g.meta ? tr(g.meta.title) : (g.variants[0]?.name ?? g.key) })),
              ]}
            />
          </Field>

          {previewGroup && previewGroup.variants.length > 1 && (
            <div role="radiogroup" aria-label={tr('Chọn thời hạn')} className="flex flex-wrap gap-1.5">
              {previewGroup.variants.map((variant) => {
                const checked = variant.id === previewPlanId;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setPreviewPlanByGroup((prev) => ({ ...prev, [previewGroup.key]: variant.id }))}
                    className={cx(
                      'rp-focus h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                      checked ? 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong' : 'border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border',
                      !variant.isActive && 'opacity-60',
                    )}
                  >
                    {adminVariantLabel(variant, { tr, trf })}
                  </button>
                );
              })}
            </div>
          )}

          {previewPlan && (
            <div className="rounded-xl border border-rp-brand-border bg-rp-brand-tint/40 px-3 py-2 text-xs text-rp-text-2">
              <span className="font-semibold text-rp-brand-strong">{previewPlan.name}</span>
              {' · '}{formatVnd(previewPlan.price)}
              {' · '}{Number(previewPlan.durationDays) > 0 ? trf('{0} ngày', { 0: previewPlan.durationDays }) : tr('Theo lượt')}
              {' · '}{trf('{0} lượt AI', { 0: previewPlan.aiGradingQuota ?? 0 })}
              {previewPlan.isPopular ? ` · ${tr('Phổ biến')}` : ''}
              {' · '}{previewPlan.isActive ? tr('Đang mở bán') : tr('Đã ngừng bán')}
            </div>
          )}

          {previewQuery.isPending ? (
            <SakuraLoader variant="section" context="data" label={tr('Đang mô phỏng quyền lợi…')} delay={80} />
          ) : previewQuery.isError ? (
            <ErrorState error={previewQuery.error} onRetry={() => previewQuery.refetch()} retrying={previewQuery.isFetching} compact />
          ) : (
            <ul className="max-h-[min(60vh,560px)] divide-y divide-rp-line overflow-y-auto rounded-xl border border-rp-line bg-white">
              {previewItems.map((item) => {
                const state = previewState(item);
                const meta = EFFECTIVE_STATE_META[state] || EFFECTIVE_STATE_META.PLAN_LOCKED;
                const Icon = state === 'AVAILABLE' ? ShieldCheck : state === 'ADMIN_DISABLED' ? PauseCircle : LockKeyhole;
                return (
                  <li key={item.featureId ?? item.code} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Icon aria-hidden="true" className={cx('h-3.5 w-3.5 shrink-0', state === 'AVAILABLE' ? 'text-rp-mint-text' : 'text-rp-text-muted')} />
                      <span className="truncate font-semibold text-rp-text">{tr(featureDisplayName(item))}</span>
                    </span>
                    <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <AlertDialog
        open={Boolean(confirm)}
        tone="warning"
        title={confirm?.payload?.availability === AVAILABILITY.DISABLED ? tr('Tạm ngừng cung cấp tính năng?') : tr('Chuyển tính năng miễn phí sang trả phí?')}
        description={confirm?.payload?.availability === AVAILABILITY.DISABLED
          ? tr('Học viên sẽ không mở được tính năng này, kể cả người đã mua gói có quyền lợi này, cho tới khi bạn mở lại. Dữ liệu và phiên đang làm dở không bị xóa; điều kiện truy cập hiện tại được giữ nguyên.')
          : tr('Học viên đang dùng miễn phí sẽ cần gói học hoặc lượt AI để tiếp tục. Thay đổi áp dụng ngay sau khi lưu.')}
        confirmLabel={confirm?.payload?.availability === AVAILABILITY.DISABLED ? tr('Tạm ngừng cung cấp') : tr('Xác nhận thay đổi')}
        cancelLabel={tr('Kiểm tra lại')}
        loading={saveMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && saveMutation.mutate({ id: confirm.feature.id, payload: confirm.payload })}
      >
        {confirm && (
          <p className="text-xs text-rp-text-2">
            {tr('Tính năng')}: <strong>{tr(featureDisplayName(confirm.feature))}</strong>
            {' · '}{tr('Lý do')}: {confirm.payload.reason}
          </p>
        )}
      </AlertDialog>
    </div>
  );
}
