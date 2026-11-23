import { useId, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Clock, Keyboard, Layers, ListChecks, Play, Shuffle } from 'lucide-react';
import { Button, Field, Input, Modal, Switch, cx } from '@/components/ui';
import { getSrsCards } from '@/features/srs/api/reviewApi.js';
import { useLocale } from '@/locales/locale.js';

const PRACTICE_MODES = [
  { id: 'flip', label: 'Lật thẻ', Icon: Layers },
  { id: 'typing', label: 'Gõ đáp án', Icon: Keyboard },
  { id: 'mcq', label: 'Trắc nghiệm', Icon: ListChecks },
  { id: 'mixed', label: 'Hỗn hợp', Icon: Shuffle },
];

const CARD_TYPES = [
  { id: '', label: 'Tất cả thẻ' },
  { id: 'Vocabulary', label: 'Từ vựng' },
  { id: 'Kanji', label: 'Kanji' },
];

const SESSION_CAP = 100;

/**
 * "Tạo phiên ôn tập" for Free Practice from Thẻ của tôi. Opening it never starts a session; "Bắt đầu ôn"
 * hands the exact config to the shared free-practice view (the same engine the sidebar modes use).
 * No external card selection: the pool is all active personal cards, optionally narrowed by card type.
 */
export default function CreatePracticeModal({ open, onClose, defaultMode = 'flip', totalActiveCards = 0, submitting = false, onStart }) {
  const { tr, trf } = useLocale();
  const formId = useId();
  const safeDefault = PRACTICE_MODES.some((m) => m.id === defaultMode) ? defaultMode : 'flip';

  const [studyMode, setStudyMode] = useState(safeDefault);
  const [cardType, setCardType] = useState('');
  const [maxCards, setMaxCards] = useState('');
  const [shuffle, setShuffle] = useState(true);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('10');
  const [submitted, setSubmitted] = useState(false);

  // Real per-type counts of active cards; only types that actually have cards are offered.
  const typeCounts = useQueries({
    queries: CARD_TYPES.filter((t) => t.id).map((t) => ({
      queryKey: ['srs-library', { search: '', cardType: t.id, page: 1, meta: 'typeCount' }],
      queryFn: () => getSrsCards({ status: 'Active', cardType: t.id, page: 1, pageSize: 1 }),
      enabled: open,
      staleTime: 15_000,
    })),
  });
  const countOf = (typeId) => {
    if (!typeId) return totalActiveCards;
    const idx = CARD_TYPES.filter((t) => t.id).findIndex((t) => t.id === typeId);
    return typeCounts[idx]?.data?.totalCount ?? null;
  };
  const typeOptions = CARD_TYPES.filter((t) => !t.id || (countOf(t.id) ?? 0) > 0);
  const poolCount = countOf(cardType) ?? 0;
  const maxAllowed = Math.min(SESSION_CAP, poolCount);

  const fallbackCount = Math.max(1, Math.min(20, maxAllowed || 1));
  const effectiveMax = maxCards === '' ? String(fallbackCount) : maxCards;
  const parsedMax = Number.parseInt(effectiveMax, 10);
  const parsedMinutes = Number.parseInt(timeLimitMinutes, 10);
  const countInvalid = !Number.isInteger(parsedMax) || parsedMax < 1 || parsedMax > Math.max(1, maxAllowed);
  const timeInvalid = timeLimitEnabled && (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 180);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    if (poolCount === 0 || countInvalid || timeInvalid) return;
    onStart?.({
      studyMode,
      cardType,
      maxCards: parsedMax,
      shuffle,
      timeLimitEnabled,
      // A stale minutes value never limits the round while the switch is OFF.
      timeLimitMinutes: timeLimitEnabled ? parsedMinutes : Number(timeLimitMinutes) || 10,
    });
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={tr('Tạo phiên ôn tập')}
      description={tr('Luyện tập theo cách của bạn mà không ảnh hưởng lịch ôn.')}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="md" disabled={submitting} onClick={onClose}>{tr('Hủy')}</Button>
          <Button type="submit" form={formId} variant="primary" size="md" icon={Play} loading={submitting} disabled={submitting || poolCount === 0}>
            {tr('Bắt đầu ôn')}
          </Button>
        </>
      )}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-rp-text-muted">{tr('Chế độ ôn tập')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={tr('Chế độ ôn tập')}>
            {PRACTICE_MODES.map(({ id, label, Icon }) => {
              const selected = studyMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setStudyMode(id)}
                  className={cx(
                    'rp-focus flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-bold transition-colors duration-200',
                    selected
                      ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-[#EAE3E4] bg-white text-rp-navy hover:border-rp-brand-border hover:bg-[#FFF9FA]',
                  )}
                >
                  <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  <span>{tr(label)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-rp-text-muted">{tr('Chọn thẻ')}</legend>
          <div className="space-y-2" role="radiogroup" aria-label={tr('Chọn thẻ')}>
            {typeOptions.map((opt) => {
              const selected = cardType === opt.id;
              const n = countOf(opt.id);
              return (
                <button
                  key={opt.id || 'all'}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setCardType(opt.id);
                    setMaxCards('');
                  }}
                  className={cx(
                    'rp-focus flex min-h-[44px] w-full items-center justify-between rounded-2xl border px-3.5 py-2 text-left text-sm font-semibold transition-colors duration-200',
                    selected ? 'border-rp-brand bg-rp-brand-tint/60 text-rp-navy' : 'border-[#EAE3E4] bg-white text-rp-navy hover:border-rp-brand-border',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'flex h-4.5 w-4.5 items-center justify-center rounded-full border-2',
                        selected ? 'border-rp-brand-pressed' : 'border-rp-line-strong',
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-rp-brand-pressed" />}
                    </span>
                    {tr(opt.label)}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-rp-text-muted">{n == null ? '…' : trf('{0} thẻ', { 0: n })}</span>
                </button>
              );
            })}
          </div>
          {submitted && poolCount === 0 && (
            <p className="mt-1.5 text-xs font-medium text-rp-danger">{tr('Vui lòng chọn ít nhất một thẻ hợp lệ để bắt đầu ôn.')}</p>
          )}
        </fieldset>

        <div className="space-y-3 rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-3.5">
          <Field
            label={tr('Số thẻ mỗi phiên')}
            hint={maxAllowed > 0 ? trf('Tối đa {0} thẻ khả dụng', { 0: maxAllowed }) : undefined}
            error={submitted && countInvalid ? trf('Số thẻ mỗi phiên phải từ 1 đến {0}.', { 0: Math.max(1, maxAllowed) }) : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, maxAllowed)}
                value={effectiveMax}
                onChange={(e) => setMaxCards(e.target.value)}
                invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <div className="border-t border-[#EAE3E4]/80 pt-1">
            <Switch
              fullWidth
              className="flex-row-reverse justify-between"
              checked={shuffle}
              onCheckedChange={setShuffle}
              label={tr('Xáo trộn thẻ')}
              description={tr('Đổi thứ tự thẻ ngẫu nhiên.')}
            />
          </div>

          <div className="space-y-2 border-t border-[#EAE3E4]/80 pt-1">
            <Switch
              fullWidth
              className="flex-row-reverse justify-between"
              checked={timeLimitEnabled}
              onCheckedChange={setTimeLimitEnabled}
              label={tr('Giới hạn thời gian')}
              description={tr('Đếm ngược cho lượt luyện.')}
            />
            {timeLimitEnabled && (
              <Field
                label={tr('Thời lượng (phút)')}
                error={submitted && timeInvalid ? tr('Thời lượng phải là số nguyên từ 1 đến 180 phút.') : undefined}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={180}
                    icon={Clock}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                    invalid={invalid}
                    aria-describedby={describedBy}
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
