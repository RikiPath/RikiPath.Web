import { useState } from 'react';
import { CalendarCheck2, CalendarClock, CalendarOff, Check, ChevronRight } from 'lucide-react';
import { jlptExamDate } from '@/features/learning-path/utils/learningGoal.js';
import { Input, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const MONTHS = [
  { value: '07', label: 'Tháng 7', tag: 'Kỳ mùa hè' },
  { value: '12', label: 'Tháng 12', tag: 'Kỳ cuối năm' },
];

function diffDays(fromIso, toIso) {
  const fromMs = Date.parse(`${fromIso}T00:00:00Z`);
  const toMs = Date.parse(`${toIso}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return null;
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

function buildYearSessions(yearStr, today) {
  return MONTHS.map((month) => {
    const date = jlptExamDate(yearStr, month.value);
    const isFuture = Boolean(date && date > today);
    const daysLeft = isFuture ? diffDays(today, date) : null;
    return { ...month, year: yearStr, date, isFuture, daysLeft };
  });
}

export default function JlptExamDatePicker({
  value,
  today,
  onChange,
  requiredForAssessment = false,
  disabled = false,
}) {
  const { tr, trf } = useLocale();
  const baseYear = Number(today.slice(0, 4)) || new Date().getFullYear();

  const availableYears = [];
  for (let y = baseYear; y <= baseYear + 4; y += 1) {
    const yStr = String(y);
    if (buildYearSessions(yStr, today).some((s) => s.isFuture)) {
      availableYears.push(yStr);
    }
  }

  const valueYear = /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.slice(0, 4) : '';
  const defaultYear = (valueYear && availableYears.includes(valueYear))
    ? valueYear
    : (availableYears[0] || String(baseYear));

  const [draftYear, setDraftYear] = useState(defaultYear);
  const [prevValueYear, setPrevValueYear] = useState(valueYear);
  if (valueYear !== prevValueYear) {
    setPrevValueYear(valueYear);
    if (valueYear && availableYears.includes(valueYear)) {
      setDraftYear(valueYear);
    }
  }

  const activeYear = /^\d{4}$/.test(draftYear) ? draftYear : defaultYear;
  const sessions = buildYearSessions(activeYear, today);
  const selectedSession = sessions.find((s) => s.isFuture && s.date === value) || null;
  const futureCount = sessions.filter((s) => s.isFuture).length;
  const existingDateUnavailable = Boolean(
    value
    && (
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || value <= today
      || !buildYearSessions(value.slice(0, 4), today).some((s) => s.isFuture && s.date === value)
    ),
  );

  function handleYearSelect(nextYear) {
    setDraftYear(nextYear);
    if (value) {
      const nextSessions = buildYearSessions(nextYear, today);
      const currentMonth = value.slice(5, 7);
      const matchingFuture = nextSessions.find((s) => s.value === currentMonth && s.isFuture);
      if (matchingFuture?.date) {
        onChange(matchingFuture.date);
      }
    }
  }

  function handleToggleSession(session) {
    if (!session.isFuture || disabled) return;
    if (value === session.date) {
      onChange('');
      return;
    }
    onChange(session.date);
  }

  return (
    <div className="space-y-4" role="group" aria-labelledby="target-exam-date-label">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p id="target-exam-date-label" className="text-[13px] font-semibold text-rp-text">
            {tr('Chọn năm & kỳ thi JLPT')}
            <span className="ml-1.5 font-normal text-rp-text-muted">
              {requiredForAssessment ? tr('(cần để làm bài đánh giá)') : tr('(không bắt buộc)')}
            </span>
          </p>
        </div>

        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="rp-underline rp-focus rounded text-xs font-semibold text-rp-brand-strong disabled:opacity-50"
          >
            {tr('Xóa ngày thi')}
          </button>
        )}
      </div>

      {/* Quick year selector pills + manual year input */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-rp-line bg-rp-bg-2 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('Chọn năm dự thi')}>
          <span className="px-1.5 text-[12px] font-medium text-rp-text-muted">{tr('Năm')}:</span>
          {availableYears.slice(0, 4).map((yr) => {
            const isActiveYr = activeYear === yr;
            return (
              <button
                key={yr}
                type="button"
                disabled={disabled}
                aria-pressed={isActiveYr}
                onClick={() => handleYearSelect(yr)}
                className={cx(
                  'rp-focus h-8 rounded-xl px-3 text-[13px] font-semibold transition-all duration-150',
                  isActiveYr
                    ? 'bg-rp-brand-pressed text-white shadow-xs'
                    : 'bg-white text-rp-text-2 border border-rp-line hover:border-rp-brand-border hover:text-rp-brand-strong',
                )}
              >
                {yr}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-[12px] text-rp-text-muted">
          <span>{tr('Năm khác')}</span>
          <Input
            type="number"
            min={baseYear}
            max={baseYear + 10}
            step="1"
            inputMode="numeric"
            disabled={disabled}
            value={draftYear}
            onChange={(event) => {
              const raw = event.target.value.slice(0, 4);
              setDraftYear(raw);
              if (/^\d{4}$/.test(raw) && Number(raw) >= baseYear) {
                handleYearSelect(raw);
              }
            }}
            aria-label={tr('Nhập năm dự thi')}
            className="h-8 w-20 px-2.5 text-center text-[13px] font-semibold tabular-nums"
          />
        </label>
      </div>

      {/* Exam Session Cards (Mobile _ExamSessionSheet adaptation for Desktop) */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={tr('Kỳ thi')}>
        {sessions.map((session) => {
          const isSelected = Boolean(selectedSession && selectedSession.value === session.value);
          const formattedDate = session.date
            ? `${session.date.slice(8)}/${session.value}/${session.year}`
            : '';

          return (
            <button
              key={session.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!session.isFuture || disabled}
              onClick={() => handleToggleSession(session)}
              className={cx(
                'rp-focus group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200',
                !session.isFuture
                  ? 'cursor-not-allowed border-rp-line bg-rp-muted/60 opacity-60'
                  : isSelected
                    ? 'border-rp-brand bg-rp-brand-tint shadow-rp-xs'
                    : 'border-rp-line bg-white hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/45',
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isSelected
                        ? 'bg-rp-brand-pressed text-white shadow-xs'
                        : session.isFuture
                          ? 'bg-rp-brand-soft text-rp-brand-strong'
                          : 'bg-rp-muted-strong text-rp-text-muted',
                    )}
                  >
                    {isSelected ? <CalendarCheck2 className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[15px] font-semibold text-rp-text">
                        {tr(session.label)} · {session.year}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-rp-text-muted">
                      {tr(session.tag)}
                    </p>
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                    isSelected
                      ? 'rp-onboarding-check-pop bg-rp-brand-pressed text-white'
                      : 'border border-[#DCD1D6] bg-white',
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                </span>
              </div>

              <div className="mt-3.5 flex w-full items-center justify-between border-t border-rp-line/70 pt-2.5 text-[12px]">
                <span className={cx('font-medium', isSelected ? 'text-rp-brand-strong' : 'text-rp-text-2')}>
                  {formattedDate ? trf('Chủ nhật · {0}', { 0: formattedDate }) : ''}
                </span>
                {session.isFuture && session.daysLeft != null ? (
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong ring-1 ring-rp-brand-border/60">
                    {trf('Còn {0} ngày', { 0: session.daysLeft })}
                  </span>
                ) : (
                  <span className="rounded-full bg-rp-muted px-2 py-0.5 text-[11px] font-medium text-rp-text-muted">
                    {tr('Đã qua')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explicit "Skip / Unspecified" option card */}
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!value}
        onClick={() => onChange('')}
        className={cx(
          'rp-focus flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-150',
          !value
            ? 'border-rp-brand-border bg-rp-brand-tint/70 text-rp-brand-strong'
            : 'border-rp-line bg-rp-bg-2 text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/35',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              !value ? 'bg-rp-brand-pressed text-white' : 'bg-white text-rp-text-muted border border-rp-line',
            )}
          >
            <CalendarOff className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-rp-text">
              {tr('Chưa xác định ngày thi (Để sau)')}
            </p>
            <p className="text-[12px] text-rp-text-muted">
              {tr('Bạn vẫn có thể tạo kế hoạch học ngay và bổ sung kỳ thi bất cứ lúc nào.')}
            </p>
          </div>
        </div>
        <ChevronRight aria-hidden="true" className={cx('h-4 w-4 shrink-0', !value ? 'text-rp-brand-pressed' : 'text-rp-text-disabled')} />
      </button>

      {futureCount === 0 && /^\d{4}$/.test(activeYear) && (
        <p className="text-xs text-rp-warning">{tr('Năm này đã hết kỳ thi. Hãy chọn năm sau.')}</p>
      )}

      {existingDateUnavailable && (
        <div className="rp-onboarding-reveal flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-danger-line bg-rp-danger-bg px-3.5 py-2.5 text-xs text-rp-danger">
          <span>{tr('Ngày thi đã lưu không còn hợp lệ. Hãy chọn lại hoặc xóa ngày thi.')}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="rp-underline font-semibold text-rp-danger"
          >
            {tr('Xóa ngày thi')}
          </button>
        </div>
      )}

      <p className="text-[12px] leading-5 text-rp-text-muted">
        {tr('Ngày thi được điền theo Chủ nhật đầu tiên của tháng 7 hoặc tháng 12.')}
      </p>
    </div>
  );
}
