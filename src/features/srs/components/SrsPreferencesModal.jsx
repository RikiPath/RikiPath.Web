import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, Sparkles } from 'lucide-react';
import {
  Banner,
  Button,
  ContextualErrorState,
  CustomSelect,
  Input,
  Modal,
  SakuraLoader,
  Switch,
  TimeInput,
  WeekdayPicker,
  notify,
} from '@/components/ui';
import {
  getSrsPreferences,
  updateSrsPreferences,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import { useLocale } from '@/locales/locale.js';

function parseStrictNonNegativeInt(raw) {
  const s = String(raw ?? '').trim();
  if (!/^\d+$/.test(s)) return null;
  const num = Number(s);
  return Number.isSafeInteger(num) ? num : null;
}

export default function SrsPreferencesModal({ open, onClose }) {
  const { tr } = useLocale();
  const queryClient = useQueryClient();

  const prefQuery = useQuery({
    queryKey: ['srs-preferences'],
    queryFn: getSrsPreferences,
    enabled: open,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const baseForm = useMemo(() => {
    const p = prefQuery.data || {};
    return {
      autoEnrollAfterLesson: Boolean(p.autoEnrollAfterLesson),
      dailyNewLimit: p.dailyNewLimit ?? 20,
      dailyReviewLimit: p.dailyReviewLimit ?? 100,
      preferredReviewMode: p.preferredReviewMode || 'flip',
      autoPlayAudio: p.autoPlayAudio ?? true,
      showFuriganaHint: p.showFuriganaHint ?? true,
      dailyReminderEnabled: p.dailyReminderEnabled ?? true,
      reminderHour: Number(p.reminderHour ?? 20),
      reminderMinute: Number(p.reminderMinute ?? 0),
      reminderFrequency: p.reminderFrequency || 'Daily',
      reminderDays: Array.isArray(p.reminderDays) ? p.reminderDays : [],
      emailReminderEnabled: Boolean(p.emailReminderEnabled),
      emailProviderConfigured: p.emailProviderConfigured ?? false,
      emailVerified: p.emailVerified ?? true,
      timezoneId: p.timezoneId || 'Asia/Ho_Chi_Minh',
      preferredLocale: p.preferredLocale || 'vi',
      updatedAtUtc: p.updatedAtUtc || null,
    };
  }, [prefQuery.data]);

  const [draftForm, setDraftForm] = useState(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const form = draftForm || baseForm;
  const setForm = (updater) => {
    setDraftForm((prev) => {
      const current = prev || baseForm;
      return typeof updater === 'function' ? updater(current) : updater;
    });
  };

  const parsedNewLimit = parseStrictNonNegativeInt(form.dailyNewLimit);
  const invalidNewLimit =
    parsedNewLimit === null
    || parsedNewLimit < 0
    || parsedNewLimit > 200;

  const parsedReviewLimit = parseStrictNonNegativeInt(form.dailyReviewLimit);
  const invalidReviewLimit =
    parsedReviewLimit === null
    || parsedReviewLimit < 5
    || parsedReviewLimit > 500;

  const missingCustomDays =
    form.dailyReminderEnabled
    && form.reminderFrequency === 'CustomDays'
    && form.reminderDays.length === 0;

  const handleClose = () => {
    if (saveMut.isPending) return;
    setDraftForm(null);
    setAttemptedSave(false);
    setConflictMessage('');
    onClose?.();
  };

  const saveMut = useMutation({
    mutationFn: () =>
      updateSrsPreferences({
        ...form,
        dailyNewLimit: parsedNewLimit,
        dailyReviewLimit: parsedReviewLimit,
        reminderHour: Math.max(0, Math.min(23, Number(form.reminderHour || 0))),
        reminderMinute: Math.max(0, Math.min(59, Number(form.reminderMinute || 0))),
        expectedUpdatedAtUtc: form.updatedAtUtc || undefined,
      }),
    onSuccess: async () => {
      setConflictMessage('');
      notify.success(tr('Đã lưu cài đặt ôn tập.'));
      await queryClient.invalidateQueries({ queryKey: ['srs-preferences'] });
      await queryClient.refetchQueries({ queryKey: ['srs-preferences'], type: 'active' });
      await invalidateSrsAndCalendarCaches(queryClient);
      setDraftForm(null);
      setAttemptedSave(false);
      onClose?.();
    },
    onError: (err) => {
      if (err?.status === 409) {
        const msg = err?.message || tr('Cài đặt vừa được cập nhật từ tab hoặc thiết bị khác. Vui lòng tải lại bản mới nhất trước khi lưu.');
        setConflictMessage(msg);
        notify.warning(msg);
        return;
      }
      notify.apiError(err, tr('Không thể lưu cài đặt ôn tập'));
    },
  });

  async function handleReloadLatest() {
    setConflictMessage('');
    setDraftForm(null);
    setAttemptedSave(false);
    await prefQuery.refetch();
  }

  const handleSave = () => {
    if (saveMut.isPending || prefQuery.isLoading || prefQuery.isError) return;
    setConflictMessage('');
    setAttemptedSave(true);
    if (invalidNewLimit) {
      notify.warning(tr('Thẻ mới mỗi ngày phải là số nguyên từ 0 đến 200.'));
      return;
    }
    if (invalidReviewLimit) {
      notify.warning(tr('Mục tiêu ôn mỗi ngày phải là số nguyên từ 5 đến 500.'));
      return;
    }
    if (missingCustomDays) {
      notify.warning(tr('Vui lòng chọn ít nhất 1 ngày nhắc học hoặc đổi tần suất.'));
      return;
    }
    saveMut.mutate();
  };

  const timeString = `${String(form.reminderHour).padStart(2, '0')}:${String(form.reminderMinute).padStart(2, '0')}`;

  function handleTimeChange(value) {
    const [hh, mm] = String(value || '20:00').split(':').map((n) => Number(n));
    setForm((prev) => ({
      ...prev,
      reminderHour: Number.isFinite(hh) ? hh : 20,
      reminderMinute: Number.isFinite(mm) ? mm : 0,
    }));
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={tr('Cài đặt ôn tập')}
      description={tr('Tuỳ chỉnh chế độ ôn mặc định, hạn mức mỗi ngày và lịch nhắc ôn tập.')}
      size="lg"
      footer={(
        <>
          <Button type="button" variant="secondary" disabled={saveMut.isPending} onClick={handleClose}>
            {tr('Huỷ')}
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={Save}
            loading={saveMut.isPending}
            disabled={saveMut.isPending || prefQuery.isLoading || prefQuery.isError}
            onClick={handleSave}
          >
            {tr('Lưu cài đặt')}
          </Button>
        </>
      )}
    >
      {prefQuery.isLoading ? (
        <SakuraLoader variant="inline" />
      ) : prefQuery.isError ? (
        <ContextualErrorState
          compact
          error={prefQuery.error}
          title={tr('Không tải được cài đặt ôn tập')}
          onRetry={() => prefQuery.refetch()}
          retrying={prefQuery.isFetching}
        />
      ) : (
        <div className="space-y-5">
          {conflictMessage && (
            <Banner tone="warning" title={tr('Cài đặt vừa thay đổi ở nơi khác')}>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-xs text-rp-text-2">{conflictMessage}</p>
                <Button type="button" size="sm" variant="secondary" onClick={handleReloadLatest}>
                  {tr('Tải bản mới nhất')}
                </Button>
              </div>
            </Banner>
          )}
          {/* Review limits & defaults */}
          <div className="rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-rp-navy">
              <Sparkles className="h-4 w-4 text-rp-brand-strong" />
              <span>{tr('Ôn tập')}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CustomSelect
                label={tr('Chế độ mặc định')}
                value={form.preferredReviewMode}
                onChange={(val) => setForm((p) => ({ ...p, preferredReviewMode: val }))}
                options={[
                  { value: 'flip', label: tr('Lật thẻ') },
                  { value: 'typing', label: tr('Gõ đáp án') },
                  { value: 'mcq', label: tr('Trắc nghiệm') },
                  { value: 'mixed', label: tr('Hỗn hợp') },
                ]}
              />
              <div>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  invalid={attemptedSave && invalidNewLimit}
                  label={tr('Thẻ mới mỗi ngày')}
                  value={form.dailyNewLimit}
                  onChange={(e) => setForm((p) => ({ ...p, dailyNewLimit: e.target.value }))}
                />
                {attemptedSave && invalidNewLimit && (
                  <p className="mt-1 text-xs font-medium text-rp-danger">
                    {tr('Nhập số nguyên từ 0 đến 200.')}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type="number"
                  min={5}
                  max={500}
                  step={1}
                  invalid={attemptedSave && invalidReviewLimit}
                  label={tr('Mục tiêu ôn mỗi ngày')}
                  value={form.dailyReviewLimit}
                  onChange={(e) => setForm((p) => ({ ...p, dailyReviewLimit: e.target.value }))}
                />
                {attemptedSave && invalidReviewLimit && (
                  <p className="mt-1 text-xs font-medium text-rp-danger">
                    {tr('Nhập số nguyên từ 5 đến 500.')}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] leading-4 text-rp-text-muted">
              {tr('Thẻ mới mỗi ngày là giới hạn cứng. Mục tiêu ôn mỗi ngày giúp theo dõi tiến độ mà không khóa thẻ đến hạn.')}
            </p>

            <div className="space-y-1.5 pt-1">
              <Switch
                checked={form.autoPlayAudio}
                onChange={(e) => setForm((p) => ({ ...p, autoPlayAudio: e.target.checked }))}
                label="Tự phát âm"
                description="Tự động phát âm tiếng Nhật khi mở thẻ."
              />
              <Switch
                checked={form.showFuriganaHint}
                onChange={(e) => setForm((p) => ({ ...p, showFuriganaHint: e.target.checked }))}
                label="Hiện cách đọc khi lật"
                description="Tự hiện Hiragana/Katakana ở mặt sau sau khi lật thẻ."
              />
              <Switch
                checked={form.autoEnrollAfterLesson}
                onChange={(e) => setForm((p) => ({ ...p, autoEnrollAfterLesson: e.target.checked }))}
                label="Tự thêm thẻ sau bài học"
                description="Tự lưu các thẻ của bài học vào Thẻ của tôi khi bạn hoàn thành bài học."
              />
            </div>
          </div>

          {/* Reminders */}
          <div className="rounded-2xl border border-[#EAE3E4] bg-white p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-rp-navy">
              <Bell className="h-4 w-4 text-rp-brand-strong" />
              <span>{tr('Nhắc ôn tập')}</span>
            </div>

            <Switch
              checked={form.dailyReminderEnabled}
              onChange={(e) => setForm((p) => ({ ...p, dailyReminderEnabled: e.target.checked }))}
              label="Nhắc khi có thẻ cần ôn"
              description="Chỉ gửi thông báo khi bạn có thẻ đến hạn chưa hoàn thành trong ngày."
            />

            {form.dailyReminderEnabled && (
              <div className="space-y-3 pl-1 pt-1">
                <div className="grid gap-3 sm:grid-cols-3">
                  <TimeInput
                    required
                    step={60}
                    value={timeString}
                    label={tr('Giờ nhắc')}
                    onChange={(e) => handleTimeChange(e.target.value)}
                  />
                  <CustomSelect
                    label={tr('Tần suất')}
                    value={form.reminderFrequency}
                    onChange={(val) => setForm((p) => ({ ...p, reminderFrequency: val }))}
                    options={[
                      { value: 'Daily', label: tr('Mỗi ngày') },
                      { value: 'Weekdays', label: tr('Thứ 2 – Thứ 6') },
                      { value: 'CustomDays', label: tr('Chọn ngày') },
                    ]}
                  />
                  <CustomSelect
                    label={tr('Ngôn ngữ')}
                    value={form.preferredLocale}
                    onChange={(val) => setForm((p) => ({ ...p, preferredLocale: val }))}
                    options={[
                      { value: 'vi', label: 'Tiếng Việt' },
                      { value: 'ja', label: '日本語' },
                    ]}
                  />
                </div>

                {form.reminderFrequency === 'CustomDays' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-rp-text-2">
                      {tr('Các ngày nhận nhắc học')}
                    </p>
                    <WeekdayPicker
                      value={form.reminderDays}
                      invalid={attemptedSave && form.reminderDays.length === 0}
                      aria-label={tr('Các ngày nhận nhắc học')}
                      onChange={(nextDays) => setForm((p) => ({ ...p, reminderDays: nextDays }))}
                    />
                    {form.reminderDays.length === 0 && (
                      <p className={attemptedSave ? 'text-xs font-medium text-rp-danger' : 'text-xs text-rp-text-muted'}>
                        {attemptedSave
                          ? tr('Vui lòng chọn ít nhất 1 ngày nhắc học hoặc đổi tần suất.')
                          : tr('Chưa chọn ngày nào. Nhấn vào từng ngày để bật hoặc tắt lịch nhắc.')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Switch
                    checked={form.emailReminderEnabled}
                    onChange={(e) => setForm((p) => ({ ...p, emailReminderEnabled: e.target.checked }))}
                    label="Nhắc qua email"
                    description="Gửi thêm email nhắc học tới hộp thư tài khoản của bạn."
                  />
                  {form.emailReminderEnabled && form.emailProviderConfigured === false && (
                    <p className="pl-[52px] text-xs leading-5 text-rp-text-muted">
                      {tr('Dịch vụ gửi email hiện chưa được kích hoạt trên môi trường này. Tuỳ chọn của bạn vẫn được lưu và nhắc học trong ứng dụng vẫn hoạt động bình thường.')}
                    </p>
                  )}
                  {form.emailReminderEnabled && form.emailProviderConfigured !== false && form.emailVerified === false && (
                    <p className="pl-[52px] text-xs leading-5 text-rp-warning">
                      {tr('Email tài khoản của bạn chưa được xác minh nên email nhắc học tạm chưa được gửi.')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
