import { useMemo, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { cx } from '@/components/ui';
import './dashboard.css';
import { useLocale } from '@/locales/locale.js';
import { useStreakCelebration } from './useStreakCelebration.js';
import StreakDialog from './StreakDialog.jsx';
import {
  buildCurrentWeekStrip,
  buildVerifiedActivityDateSet,
  computeStreakProgress,
  toVnDateKey,
} from './learnerTokens.js';

function MiniFlameSvg({ active }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx(
        'rp-mini-flame h-[72%] w-[72%] drop-shadow-[0_1px_2px_rgba(224,83,36,0.25)]',
      )}
      aria-hidden="true"
    >
      <path
        d="M12.5 2.2c.8 3.6 5.2 5.6 5.2 10.6a5.8 5.8 0 0 1-11.6 0c0-3 1.5-5.3 3.1-7 .3 1.7 1.2 2.4 2.2 2.6-.6-2.3 0-4.3 1.1-6.2z"
        fill={active ? '#F2643A' : '#C9BFC2'}
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
          'rp-streak-card relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-rp-peach-line/80 bg-white p-4 shadow-rp-xs',
          className,
        )}
      >
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Chuỗi ngày học')}</p>
          {/* T2–CN: studied days carry a small flame on a soft sakura-peach disc; today is ringed; others stay neutral */}
          <div className="mt-2 flex items-center gap-[clamp(6px,1.1vw,14px)]" role="list" aria-label={tr('Các ngày học trong tuần')}>
            {weekDays.map((day) => {
              const isDone = day.active;
              return (
                <div key={day.key} role="listitem" className="flex flex-col items-center gap-1.5">
                  <span
                    title={
                      isDone
                        ? `${day.label} (${day.dateKey}): ${tr('Đã có hoạt động học')}`
                        : day.isToday
                          ? `${day.label} (${day.dateKey}): ${tr('Hôm nay')}`
                          : `${day.label} (${day.dateKey})`
                    }
                    className="rp-streak-day"
                    data-done={isDone ? 'true' : 'false'}
                    data-today={day.isToday ? 'true' : 'false'}
                  >
                    {isDone ? <MiniFlameSvg active isToday={day.isToday} /> : <span className="h-2 w-2 rounded-full bg-rp-line-strong/80" />}
                  </span>
                  <span className={cx('text-[12.5px] leading-none', day.isToday ? 'font-extrabold text-rp-brand-strong' : 'font-semibold text-rp-text-2')}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Compact text badge under the week */}
          <button
            type="button"
            onClick={() => !loading && setModalOpen(true)}
            disabled={loading}
            className="rp-focus rp-press mt-3 inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-rp-peach-line bg-rp-peach-bg px-3 py-1 text-[14px] font-extrabold text-rp-peach transition-colors hover:brightness-95 disabled:opacity-75"
          >
            <Flame aria-hidden="true" className={cx('h-4 w-4 text-rp-streak', !loading && info.days > 0 && 'rp-badge-flame')} />
            {loading
              ? tr('Đang đồng bộ chuỗi…')
              : info.days > 0
                ? (locale === 'ja' ? `${info.days} 日連続` : trf('{0} ngày liên tiếp', { 0: info.days }))
                : tr('Bắt đầu chuỗi 1 ngày')}
          </button>
        </div>

        {/* Next milestone · remaining days · progress · record — all from the real streak */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rp-line/70 pt-3 text-[13px]">
          <span className="font-semibold text-rp-text-2">
            {info.nextMilestone != null ? (
              <>
                {tr('Mốc tiếp theo:')} <strong className="font-extrabold text-rp-navy">{trf('{0} ngày', { 0: info.nextMilestone })}</strong>
                <span className="text-rp-text-muted"> · {trf('Còn {0} ngày', { 0: remainingForNext })}</span>
              </>
            ) : (
              <strong className="font-extrabold text-rp-navy">{tr('Đã đạt mốc cao nhất')}</strong>
            )}
          </span>
          <span
            className="h-2 min-w-[56px] flex-1 overflow-hidden rounded-full bg-rp-muted-strong"
            role="progressbar"
            aria-label={tr('Tiến độ tới mốc tiếp theo')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={info.progressPercent}
          >
            <span
              className="block h-full origin-left rounded-full bg-gradient-to-r from-rp-streak to-rp-brand transition-transform duration-500"
              style={{ transform: `scaleX(${Math.max(info.days > 0 ? 0.08 : 0.04, info.progressPercent / 100)})` }}
            />
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-rp-navy" title={tr('Các mốc streak')}>
            <Trophy aria-hidden="true" className="h-4 w-4 text-rp-warning" />
            {trf('Kỷ lục {0}d', { 0: longestDays })}
          </span>
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
