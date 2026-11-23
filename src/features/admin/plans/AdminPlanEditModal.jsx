import { useMemo } from 'react';
import { Eye } from 'lucide-react';

import { Badge, Banner, Button, Checkbox, CustomSelect, Field, Input, Modal, Switch, Textarea } from '@/components/ui';
import PlanGroupCard from '@/features/checkout/components/PlanGroupCard.jsx';
import { PLAN_GROUP_META, featureDisplayName } from '@/features/checkout/planGroups.js';
import { useLocale } from '@/locales/locale.js';
import { PLAN_CATEGORY_OPTIONS, toCatalogPlan } from './adminPlansModel.js';

const DRAFT_PREVIEW_ID = -1;

function isCreditCategory(category) {
  return Boolean(PLAN_CATEGORY_OPTIONS.find((o) => o.value === category)?.creditOnly);
}

/** Fields compared to tell "unsaved draft" from "what learners currently see". */
function draftSignature(d) {
  return JSON.stringify([
    String(d.name || '').trim(), String(d.description || '').trim(), d.planCategory, String(d.durationDays), String(d.price),
    String(d.aiGradingQuota), String(d.sortOrder), Boolean(d.isPopular), Boolean(d.isActive), [...(d.featureIds || [])].sort(),
  ]);
}

/**
 * Create / edit one plan variant. Header and footer stay fixed; on desktop only the form column scrolls and the
 * learner card preview stays in view. On tablet/mobile the dialog is one column and the preview follows the form.
 */
export default function AdminPlanEditModal({
  open, draft, original, setDraft, errors, features, plans, saving, onSubmit, onClose,
}) {
  const { tr, trf } = useLocale();
  const creditOnly = isCreditCategory(draft.planCategory);
  const featuresById = useMemo(() => new Map(features.map((f) => [f.id, f])), [features]);
  const dirty = !original || draftSignature(draft) !== draftSignature(original);

  // The preview is the real Learner card: this draft among the group's other variants that learners can buy.
  const previewGroup = useMemo(() => {
    const draftPlan = toCatalogPlan({
      id: draft.id ?? DRAFT_PREVIEW_ID,
      name: String(draft.name || '').trim() || tr('Tên gói học'),
      description: draft.description,
      planCategory: draft.planCategory,
      price: Number(draft.price) || 0,
      durationDays: creditOnly ? 0 : Number(draft.durationDays) || 0,
      aiGradingQuota: Number(draft.aiGradingQuota) || 0,
      isPopular: draft.isPopular,
      isActive: draft.isActive,
      featureIds: draft.featureIds,
    }, featuresById);
    const siblings = plans
      .filter((p) => p.planCategory === draft.planCategory && p.isActive && p.id !== draft.id)
      .map((p) => toCatalogPlan(p, featuresById));
    const variants = [...siblings, draftPlan].sort((a, b) => a.durationDays - b.durationDays || a.aiUses - b.aiUses || a.price - b.price);
    return { key: draft.planCategory, kind: draft.planCategory, meta: PLAN_GROUP_META[draft.planCategory] ?? null, variants, defaultPlanId: draftPlan.id };
  }, [draft, plans, featuresById, creditOnly, tr]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      dismissible={!saving}
      title={draft.id ? tr('Chỉnh sửa gói học') : tr('Thêm gói học mới')}
      description={tr('Điều chỉnh thông tin và quyền lợi. Thay đổi chỉ áp dụng cho đơn mua mới sau khi lưu.')}
      size="xl"
      className="lg:h-[min(860px,92vh)] lg:[&>div:nth-child(2)]:overflow-hidden lg:[&>div:nth-child(2)]:p-0"
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>{tr('Hủy')}</Button>
          <Button onClick={onSubmit} loading={saving} data-testid="save-subscription-plan-btn">
            {draft.id ? tr('Lưu thay đổi') : tr('Tạo gói học')}
          </Button>
        </div>
      )}
    >
      <div className="lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.9fr)]">
        <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-5 lg:py-4" data-testid="plan-edit-form">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">{tr('Thông tin gói học')}</p>
          {draft.paidPurchaseCount > 0 && (
            <Banner tone="info" title={tr('Bảo vệ đơn đã mua')}>
              {trf('Gói này đã có {0} đơn thanh toán thành công. Học viên đã mua vẫn giữ giá, thời hạn và lượt AI tại thời điểm mua.', {
                0: draft.paidPurchaseCount,
              })}
            </Banner>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label={tr('Tên gói học')} required error={errors.name} className="sm:col-span-2">
              <Input
                value={draft.name}
                maxLength={150}
                invalid={Boolean(errors.name)}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={tr('Ví dụ: Tự học tiếng Nhật - 6 tháng')}
              />
            </Field>

            <Field label={tr('Nhóm gói')} required hint={draft.paidPurchaseCount > 0 ? tr('Không đổi nhóm của gói đã có đơn mua.') : undefined}>
              <CustomSelect
                value={draft.planCategory}
                disabled={draft.paidPurchaseCount > 0}
                onChange={(val) => {
                  const nextCredit = isCreditCategory(val);
                  setDraft((d) => ({
                    ...d,
                    planCategory: val,
                    durationDays: nextCredit ? '0' : Number(d.durationDays) > 0 ? d.durationDays : '30',
                    aiGradingQuota: val !== 'self_study' && Number(d.aiGradingQuota) < 1 ? '1' : d.aiGradingQuota,
                  }));
                }}
                options={PLAN_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
              />
            </Field>

            <Field label={tr('Giá bán (VND)')} required error={errors.price}>
              <Input type="number" min={0} step={1000} value={draft.price} invalid={Boolean(errors.price)} onChange={(e) => set({ price: e.target.value })} />
            </Field>

            <Field
              label={tr('Thời hạn sử dụng (ngày)')}
              required
              hint={creditOnly ? tr('Gói mua theo lượt không có thời hạn.') : undefined}
              error={errors.durationDays}
            >
              <Input
                type="number"
                min={creditOnly ? 0 : 1}
                max={1095}
                disabled={creditOnly}
                value={draft.durationDays}
                invalid={Boolean(errors.durationDays)}
                onChange={(e) => set({ durationDays: e.target.value })}
              />
            </Field>

            <Field label={tr('Số lượt AI đi kèm')} required error={errors.aiGradingQuota}>
              <Input type="number" min={0} max={5000} value={draft.aiGradingQuota} invalid={Boolean(errors.aiGradingQuota)} onChange={(e) => set({ aiGradingQuota: e.target.value })} />
            </Field>

            <Field label={tr('Thứ tự hiển thị')} required error={errors.sortOrder}>
              <Input type="number" min={1} value={draft.sortOrder} invalid={Boolean(errors.sortOrder)} onChange={(e) => set({ sortOrder: e.target.value })} />
            </Field>

            <Field label={tr('Lý do thay đổi')} hint={tr('Ghi vào lịch sử thay đổi.')}>
              <Input maxLength={300} value={draft.reason} onChange={(e) => set({ reason: e.target.value })} placeholder={tr('Ví dụ: Điều chỉnh giá quý IV')} />
            </Field>

            <Field label={tr('Mô tả hiển thị cho học viên')} error={errors.description} className="sm:col-span-2">
              <Textarea
                rows={2}
                maxLength={500}
                value={draft.description}
                invalid={Boolean(errors.description)}
                onChange={(e) => set({ description: e.target.value })}
                placeholder={tr('Tóm tắt quyền lợi và đối tượng phù hợp…')}
              />
            </Field>
          </div>

          {features.length > 0 && (
            <fieldset className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">{tr('Quyền lợi của gói học')}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <Checkbox
                    key={f.id}
                    checked={draft.featureIds.includes(f.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDraft((d) => ({
                        ...d,
                        featureIds: checked ? [...d.featureIds, f.id] : d.featureIds.filter((id) => id !== f.id),
                      }));
                    }}
                    label={tr(featureDisplayName(f))}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-3 rounded-xl border border-rp-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Switch
                checked={draft.isActive}
                onChange={(e) => set({ isActive: e.target.checked })}
                label={tr('Cho phép học viên mua gói này')}
              />
              <Badge tone={draft.isActive ? 'success' : 'neutral'} size="sm" icon={false}>
                {draft.isActive ? tr('Đang mở bán') : tr('Đã ngừng bán')}
              </Badge>
            </div>
            {!draft.isActive && (
              <p className="text-xs leading-5 text-rp-text-muted">
                {tr('Học viên sẽ không thể mua mới gói này; các gói đã kích hoạt vẫn giữ nguyên quyền lợi.')}
              </p>
            )}
            <Switch checked={draft.isPopular} onChange={(e) => set({ isPopular: e.target.checked })} label={tr('Gắn nhãn "Phổ biến"')} />
          </div>
        </div>

        <aside
          className="mt-5 border-t border-rp-line pt-4 lg:mt-0 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:bg-rp-bg-2/50 lg:px-5 lg:py-4"
          aria-label={tr('Xem trước gói học')}
        >
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
              {tr('Xem trước gói học')}
            </p>
            <Badge tone={dirty ? 'warning' : 'success'} size="sm" icon={false}>
              {dirty ? tr('Bản xem trước — Chưa lưu') : tr('Đang áp dụng cho học viên')}
            </Badge>
          </div>
          {!draft.isActive && (
            <p className="mb-2.5 rounded-xl bg-rp-muted px-3 py-2 text-xs text-rp-text-2">
              {tr('Gói đã ngừng bán sẽ không hiển thị trên trang Gói học của học viên.')}
            </p>
          )}
          <div className={draft.isActive ? '' : 'opacity-70'}>
            <PlanGroupCard
              group={previewGroup}
              selectedPlanId={previewGroup.defaultPlanId}
              onSelect={() => {}}
              onBuy={() => {}}
              readOnly
              ctaLabel={tr('Chọn mua gói')}
            />
          </div>
        </aside>
      </div>
    </Modal>
  );
}
