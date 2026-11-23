import { useId, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Clock, Keyboard, Layers, ListChecks, Play, Shuffle } from 'lucide-react';
import { Button, Field, Input, Modal, Switch, cx } from '@/components/ui';
import { getDailyReviewQueue } from '@/features/srs/api/reviewApi.js';
import { useLocale } from '@/locales/locale.js';

const REVIEW_MODES = [
  { id: 'flip', label: 'Lật thẻ', Icon: Layers },
  { id: 'typing', label: 'Gõ đáp án', Icon: Keyboard },
  { id: 'mcq', label: 'Trắc nghiệm', Icon: ListChecks },
  { id: 'mixed', label: 'Hỗn hợp', Icon: Shuffle },
];

const SESSION_CAP = 100;

/**
 * "Bắt đầu ôn" for Scheduled (due) review. The system picks the due cards; the learner only chooses
 * the mode and session options. Per-mode availability comes from the same server due queue that the
 * session start uses, so the number shown is the number the session can really contain.
 */
export default function StartReviewSessionModal({
  open,
  onClose,
  defaultMode = 'flip',
  defaultMaxCards = 25,
  totalDueCards = 0,
  submitting = false,
  onStart,
}) {
  const { tr, trf } = useLocale();
  const formId = useId();
  const safeDefault = REVIEW_MODES.some((m) => m.id === defaultMode) ? defaultMode : 'flip';

  const [studyMode, setStudyMode] = useState(safeDefault);
  const [shuffle, setShuffle] = useState(false);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('10');
  const [maxCards, setMaxCards] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const availabilityQueries = useQueries({
    queries: REVIEW_MODES.map((m) => ({
      queryKey: ['srs-queue', { studyMode: m.id }],
      queryFn: () => getDailyReviewQueue({ mode: m.id }),
      enabled: open,
      staleTime: 15_000,
    })),
  });
  const availabilityOf = (modeId) => {
    const idx = REVIEW_MODES.findIndex((m) => m.id === modeId);
    const data = availabilityQueries[idx]?.data;
    return data ? Number(data.modeEligibleCount ?? (data.items || []).length) : null;
  };
  const selectedIdx = REVIEW_MODES.findIndex((m) => m.id === studyMode);
  const selectedQuery = availabilityQueries[selectedIdx];
  const available = availabilityOf(studyMode);
  const maxAllowed = Math.min(SESSION_CAP, Math.max(0, available ?? 0));

  // Default count follows preferences and stays inside the live available range when the pool changes.
  const fallbackCount = Math.max(1, Math.min(Number(defaultMaxCards) || 25, maxAllowed || 1));
  const effectiveMaxCards = maxCards === '' ? String(fallbackCount) : maxCards;
  const parsedMaxCards = Number.parseInt(effectiveMaxCards, 10);
  const parsedMinutes = Number.parseInt(timeLimitMinutes, 10);

  const countInvalid = !Number.isInteger(parsedMaxCards) || parsedMaxCards < 1 || parsedMaxCards > Math.max(1, maxAllowed);
  const timeInvalid = timeLimitEnabled && (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 180);
  const countError = submitted && countInvalid ? trf('Số thẻ mỗi phiên phải từ 1 đến {0}.', { 0: Math.max(1, maxAllowed) }) : undefined;
  const timeError = submitted && timeInvalid ? tr('Thời lượng phải là số nguyên từ 1 đến 180 phút.') : undefined;
  const unavailable = available === 0;

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    if (unavailable || available == null || countInvalid || timeInvalid) return;
    onStart?.({
      studyMode,
      shuffle,
      // Only send a deadline while the switch is ON — a stale minutes value never limits silently.
      timeLimitMinutes: timeLimitEnabled ? parsedMinutes : null,
      maxCards: parsedMaxCards,
    });
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={tr('Bắt đầu ôn thẻ đến hạn')}
      description={trf('{0} thẻ đến hạn · Kết quả được ghi vào lịch ôn của bạn.', { 0: totalDueCards })}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="md" disabled={submitting} onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            size="md"
            icon={Play}
            loading={submitting}
            disabled={submitting || unavailable || available == null}
          >
            {tr('Bắt đầu ôn')}
          </Button>
        </>
      )}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-rp-text-muted">{tr('Chế độ ôn tập')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={tr('Chế độ ôn tập')}>
            {REVIEW_MODES.map(({ id, label, Icon }) => {
              const selected = studyMode === id;
              const count = availabilityOf(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setStudyMode(id);
                    setMaxCards('');
                  }}
                  className={cx(
                    'rp-focus flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2.5 text-xs font-bold transition-colors duration-200',
                    selected
                      ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-[#EAE3E4] bg-white text-rp-navy hover:border-rp-brand-border hover:bg-[#FFF9FA]',
                  )}
                >
                  <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  <span>{tr(label)}</span>
                  <span className={cx('text-[11px] font-semibold tabular-nums', selected ? 'text-rp-brand-strong' : 'text-rp-text-muted')}>
                    {count == null ? '…' : trf('{0} thẻ', { 0: count })}
                  </span>
                </button>
              );
            })}
          </div>
          {available != null && available < totalDueCards && available > 0 && (
            <p className="text-xs text-rp-text-muted">
              {studyMode === 'mcq'
                ? trf('{0} thẻ chưa đủ phương án trắc nghiệm thật nên không dùng được ở chế độ này.', { 0: totalDueCards - available })
                : studyMode === 'typing'
                  ? trf('{0} thẻ chưa đủ cách đọc hoặc nghĩa để chấm Gõ đáp án.', { 0: totalDueCards - available })
                  : trf('{0} thẻ đến hạn chưa thể dùng ở chế độ này.', { 0: totalDueCards - available })}
            </p>
          )}
          {unavailable && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              {selectedQuery?.data?.emptyReason === 'DailyLimitReached'
                ? tr('Bạn đã đạt giới hạn thẻ mới hôm nay. Có thể tăng giới hạn trong Cài đặt.')
                : tr('Chế độ này chưa có thẻ đến hạn phù hợp. Hãy chọn chế độ khác.')}
            </p>
          )}
        </fieldset>

        <div className="space-y-3 rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-3.5">
          <Field
            label={tr('Số thẻ mỗi phiên')}
            hint={maxAllowed > 0 ? trf('Tối đa {0} thẻ khả dụng', { 0: maxAllowed }) : undefined}
            error={countError}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, maxAllowed)}
                value={effectiveMaxCards}
                disabled={unavailable || available == null}
                onChange={(e) => setMaxCards(e.target.value)}
                invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <div className="border-t border-[#EAE3E4]/80 pt-1">
            <Switch
              fullWidth
              checked={shuffle}
              onCheckedChange={setShuffle}
              label={tr('Xáo trộn thẻ')}
              description={tr('Đảo thứ tự các thẻ được chọn cho phiên này.')}
              className="flex-row-reverse justify-between"
            />
          </div>

          <div className="space-y-2 border-t border-[#EAE3E4]/80 pt-1">
            <Switch
              fullWidth
              checked={timeLimitEnabled}
              onCheckedChange={setTimeLimitEnabled}
              label={tr('Giới hạn thời gian')}
              description={tr('Đếm ngược cho phiên này. Thẻ chưa trả lời khi hết giờ vẫn được giữ đến hạn.')}
              className="flex-row-reverse justify-between"
            />
            {timeLimitEnabled && (
              <Field label={tr('Thời lượng (phút)')} error={timeError}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={180}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    icon={Clock}
                  />
                )}
              </Field>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
