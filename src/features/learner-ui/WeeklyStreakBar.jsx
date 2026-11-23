import { useMemo, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { useStreakCelebration } from './useStreakCelebration.js';
import StreakDialog from './StreakDialog.jsx';
import {
  STREAK_MILESTONES,
  buildCurrentWeekStrip,
  buildVerifiedActivityDateSet,
  computeStreakProgress,
  toVnDateKey,
} from './learnerTokens.js';

function MiniFlameSvg({ active, isToday }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx(
        'h-5 w-5 drop-shadow-[0_1px_2px_rgba(224,83,36,0.25)]',
        isToday && active && 'rp-streak-flame-pulse',
      )}
      aria-hidden="true"
    >
      <path
        d="M12.5 2.2c.8 3.6 5.2 5.6 5.2 10.6a5.8 5.8 0 0 1-11.6 0c0-3 1.5-5.3 3.1-7 .3 1.7 1.2 2.4 2.2 2.6-.6-2.3 0-4.3 1.1-6.2z"
        fill={active ? '#FF6B2B' : '#C9BFC2'}
      />
      {active && (
        <path
          d="M12 9.4c1.3 2.4 3.1 3.3 3.1 5.9a3.1 3.1 0 0 1-6.2 0c0-1.7.8-3.1 1.9-4.3.4.9.8 1.3 1.2 1.3z"
          fill="#FFE082"
        />
      )}
    </svg>
  );
}

/**
 * Weekly horizontal streak bar (T2–CN) + Milestone Tracker + One-Time Celebration Modal.
 * Strictly reads real backend study-streak & activity dates. Never invents inactive days.
 */
export default function WeeklyStreakBar({
  streak,
  loading = false,
  verifiedDates: verifiedDatesProp,
  mockHistory = [],
  practiceHistory = [],
  homeworkList = [],
  dueCards = 0,
  className,
}) {
  const { tr, trf, locale } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

  const info = useMemo(
    () => computeStreakProgress(streak?.currentStreakDays, streak?.isActiveToday),
    [streak?.currentStreakDays, streak?.isActiveToday],
  );
  const longestDays = Math.max(Number(streak?.longestStreakDays) || 0, info.days);
  const todayKey = useMemo(() => toVnDateKey(new Date()), []);

  const verifiedDates = useMemo(() => {
    if (verifiedDatesProp instanceof Set) return verifiedDatesProp;
    return buildVerifiedActivityDateSet({ streak, mockHistory, practiceHistory, homeworkList, todayKey });
  }, [verifiedDatesProp, streak, mockHistory, practiceHistory, homeworkList, todayKey]);

  const weekDays = useMemo(() => {
    const days = buildCurrentWeekStrip(verifiedDates, todayKey);
    const jaDays = ['月', '火', '水', '木', '金', '土', '日'];
    return locale === 'ja' ? days.map((d, i) => ({ ...d, label: jaDays[i] || d.label })) : days;
  }, [verifiedDates, todayKey, locale]);

  // Event-driven celebration: opens only for a server-confirmed, not-yet-claimed streak event of today.
  // Visiting the dashboard, F5, re-login, other tabs/devices never re-open it (claim is atomic server-side).
  const { event, celebration, dismiss } = useStreakCelebration({ enabled: !loading });
  const autoOpen = Boolean(celebration);
  const showModal = modalOpen || autoOpen;

  const modalInfo = useMemo(
    () => (celebration
      ? computeStreakProgress(celebration.currentStreakDays, celebration.isActiveToday)
      : info),
    [celebration, info],
  );
  const modalWeekDays = useMemo(() => {
    if (!celebration?.weekActivityDates?.length) return weekDays;
    // Server dates are already Asia/Ho_Chi_Minh calendar days: keep the yyyy-MM-dd part, never re-zone them.
    const serverDays = new Set(celebration.weekActivityDates.map((d) => String(d).slice(0, 10)));
    return weekDays.map((d) => ({ ...d, active: d.active || serverDays.has(d.dateKey) }));
  }, [celebration, weekDays]);

  const remainingForNext = info.nextMilestone != null ? Math.max(0, info.nextMilestone - info.days) : 0;

  // Auto-open follows the server event kind; a manual open reflects today's state.
  const dialogVariant = celebration
    ? (celebration.eventType === 'atRisk' ? 'atRisk' : 'celebrate')
    : modalInfo.isActiveToday
      ? 'celebrate'
      : modalInfo.days > 0 ? 'atRisk' : 'start';

  function closeModal() {
    setModalOpen(false);
    if (autoOpen) dismiss();
  }

  return (
    <>
      <section
        aria-label={tr('Chuỗi ngày học trong tuần')}
        data-section="WeeklyStreakBar"
        className={cx(
          'relative flex flex-col justify-between overflow-hidden rounded-2xl border border-rp-brand-border/80 bg-rp-brand-tint/60 px-4 py-3 shadow-rp-xs sm:px-5',
          className,
        )}
      >
        <div aria-hidden="true" className="rp-dot-paper-bg pointer-events-none absolute inset-0 opacity-50" />

        {/* Row 1: T2–CN Day Circles + Prominent Consecutive Days Flame Pill */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2" role="list" aria-label={tr('Các ngày học trong tuần')}>
            {weekDays.map((day) => {
              const isDone = day.active;
              return (
                <div key={day.key} role="listitem" className="flex flex-col items-center gap-1">
                  <span
                    title={
                      isDone
                        ? `${day.label} (${day.dateKey}): ${tr('Đã có hoạt động học')}`
                        : day.isToday
                          ? `${day.label} (${day.dateKey}): ${tr('Hôm nay')}`
                          : `${day.label} (${day.dateKey})`
                    }
                    className={cx(
                      'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                      isDone && day.isToday
                        ? 'border-2 border-rp-streak bg-white text-rp-streak shadow-[0_0_0_3px_rgba(224,83,36,0.18)]'
                        : isDone
                          ? 'border-2 border-rp-brand bg-rp-brand-tint text-rp-brand-strong shadow-rp-xs'
                          : day.isToday
                            ? 'border-2 border-dashed border-rp-brand bg-white text-rp-brand-strong'
                            : 'border border-dashed border-rp-line-strong/80 bg-white/80 text-rp-text-muted',
                    )}
                  >
                    {isDone ? (
                      <MiniFlameSvg active isToday={day.isToday} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-rp-line-strong/80" />
                    )}
                  </span>
                  <span
                    className={cx(
                      'text-[11px] leading-none',
                      day.isToday ? 'font-extrabold text-rp-navy' : 'font-semibold text-rp-text-2',
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => !loading && setModalOpen(true)}
            disabled={loading}
            className="rp-focus rp-press inline-flex min-h-[36px] items-center gap-2 rounded-full border border-rp-peach-line bg-rp-peach-bg px-3.5 py-1 text-[13px] font-extrabold text-rp-peach shadow-rp-xs transition hover:brightness-95 disabled:opacity-75"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-rp-xs">
              <Flame
                aria-hidden="true"
                className={cx(
                  'h-5 w-5 text-rp-streak drop-shadow-[0_1px_2px_rgba(224,83,36,0.3)]',
                  info.isActiveToday && 'rp-streak-flame-pulse',
                )}
              />
            </span>
            <span>
              {loading
                ? tr('Đang đồng bộ chuỗi…')
                : info.days > 0
                  ? (locale === 'ja' ? `${info.days} 日連続` : trf('{0} ngày liên tiếp', { 0: info.days }))
                  : tr('Bắt đầu chuỗi 1 ngày')}
            </span>
          </button>
        </div>

        {/* Row 2: Next Milestone + Remaining Days + Compact Progress Bar + Milestones (3·7·14·30) + Record */}
        <div className="relative z-10 mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-rp-brand-border/50 pt-2.5">
          <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="font-semibold text-rp-text-2">
                {info.nextMilestone != null ? (
                  <>
                    {tr('Mốc tiếp theo:')}{' '}
                    <strong className="font-extrabold text-rp-navy">
                      {trf('{0} ngày', { 0: info.nextMilestone })}
                    </strong>
                  </>
                ) : (
                  <strong className="font-extrabold text-rp-navy">{tr('Đã đạt mốc cao nhất')}</strong>
                )}
              </span>
              {info.nextMilestone != null && (
                <>
                  <span aria-hidden="true" className="text-rp-line-strong">·</span>
                  <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-rp-brand-strong">
                    {trf('Còn {0} ngày', { 0: remainingForNext })}
                  </span>
                </>
              )}
            </div>

            <div className="h-1.5 min-w-[44px] max-w-[96px] flex-1 overflow-hidden rounded-full bg-rp-muted-strong">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rp-streak to-rp-brand transition-all duration-500"
                style={{ width: `${Math.max(info.days > 0 ? 14 : 6, info.progressPercent)}%` }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1" aria-label={tr('Các mốc streak')}>
              {STREAK_MILESTONES.map((ms) => {
                const hit = info.days >= ms;
                return (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setModalOpen(true)}
                    title={trf('Mốc {0} ngày học liên tiếp', { 0: ms })}
                    className={cx(
                      'inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border px-1.5 text-[11px] font-bold transition',
                      hit
                        ? 'border-rp-brand-border bg-rp-brand-soft text-rp-brand-strong'
                        : 'border-rp-line bg-white/90 text-rp-text-muted hover:border-rp-brand-border/60',
                    )}
                  >
                    {ms}
                  </button>
                );
              })}
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-rp-line bg-white/95 px-2 py-0.5 text-[11px] font-bold text-rp-navy">
              <Trophy aria-hidden="true" className="h-3.5 w-3.5 text-rp-warning" />
              {trf('Kỷ lục {0}d', { 0: longestDays })}
            </span>
          </div>
        </div>
      </section>

      {/* Streak dialog: auto-opens once per server event (keep-streak reminder or celebration); also opened from the pill */}
      <StreakDialog
        open={showModal}
        onClose={closeModal}
        variant={dialogVariant}
        days={modalInfo.days}
        nextMilestone={modalInfo.nextMilestone}
        isMilestone={celebration?.eventType === 'milestone' || (dialogVariant === 'celebrate' && modalInfo.isMilestoneHit)}
        weekDays={modalWeekDays}
        longestDays={Math.max(longestDays, Number(celebration?.longestStreakDays) || 0)}
        dayEndsAtUtc={celebration?.studyDayEndsAtUtc ?? event?.studyDayEndsAtUtc ?? null}
        animate={autoOpen || modalOpen}
        dueCards={dueCards}
      />
    </>
  );
}
