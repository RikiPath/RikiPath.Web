import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, ClipboardCheck, Clock, Flame, Layers, Medal, Sparkles, Trophy, X } from 'lucide-react';
import { cx, useFocusTrap } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import ConfettiBurst from '@/features/learning-moments/ConfettiBurst.jsx';

/* ------------------------------------------------------------------ Cute 3D flame mascot */

function StreakFlameMascot({ variant, gid }) {
  const dim = variant === 'start';
  return (
    <svg viewBox="0 0 160 180" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id={`${gid}-outer`} cx="50%" cy="72%" r="70%">
          <stop offset="0" stopColor={dim ? '#FFD9B0' : '#FFC24A'} />
          <stop offset="0.55" stopColor={dim ? '#FFB27A' : '#FF9A2E'} />
          <stop offset="1" stopColor={dim ? '#F08A5D' : '#FF6A1A'} />
        </radialGradient>
        <radialGradient id={`${gid}-inner`} cx="50%" cy="70%" r="65%">
          <stop offset="0" stopColor="#FFF8D6" />
          <stop offset="0.6" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#FFC23D" />
        </radialGradient>
        <linearGradient id={`${gid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* ground shadow */}
      <ellipse className="rp-flame-shadow" cx="80" cy="168" rx="34" ry="7" fill="#F28C3A" opacity="0.22" />
      <g className="rp-flame-body">
        {/* outer flame */}
        <path
          d="M84 6c4 22 22 32 36 52 14 20 20 40 14 62-7 26-30 42-54 42S33 146 26 120c-6-22 0-40 12-56 6 10 12 14 20 16-6-22 2-40 12-54 4 10 8 15 14 17-6-14-6-26 0-37z"
          fill={`url(#${gid}-outer)`}
        />
        {/* inner flame (flickers) */}
        <path
          className="rp-flame-core"
          d="M80 62c10 16 30 26 30 54 0 20-14 34-30 34s-30-14-30-34c0-14 7-25 16-33 2 8 6 12 11 13-3-12-2-24 3-34z"
          fill={`url(#${gid}-inner)`}
        />
        {/* gloss highlight */}
        <path d="M46 92c-6 12-7 26-2 38" stroke={`url(#${gid}-gloss)`} strokeWidth="7" strokeLinecap="round" fill="none" />
        {/* face */}
        <g className="rp-flame-face">
          <ellipse cx="66" cy="118" rx="6.5" ry="7.5" fill="#3A1D10" />
          <ellipse cx="94" cy="118" rx="6.5" ry="7.5" fill="#3A1D10" />
          <circle cx="68.5" cy="115" r="2.4" fill="#FFFFFF" />
          <circle cx="96.5" cy="115" r="2.4" fill="#FFFFFF" />
          <path d="M70 131c5 6 15 6 20 0" stroke="#3A1D10" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <ellipse cx="54" cy="130" rx="7" ry="4.5" fill="#FF7A8A" opacity="0.55" />
          <ellipse cx="106" cy="130" rx="7" ry="4.5" fill="#FF7A8A" opacity="0.55" />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ helpers */

function useCountUp(target, enabled) {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const t = window.setTimeout(() => setValue(target), 0);
      return () => window.clearTimeout(t);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 700);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, enabled]);
  return enabled ? value : target;
}

/** Fallback end of today's study day in Asia/Ho_Chi_Minh (UTC+7, no DST) when the server value is absent. */
function vnDayEndMs(nowMs) {
  const offset = 7 * 3600 * 1000;
  const local = new Date(nowMs + offset);
  local.setUTCHours(24, 0, 0, 0);
  return local.getTime() - offset;
}

function parseUtc(value) {
  if (!value) return null;
  const raw = String(value);
  const ms = Date.parse(/Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`);
  return Number.isFinite(ms) ? ms : null;
}

function useTimeLeft(endsAtUtc, enabled) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);
  const end = parseUtc(endsAtUtc) ?? vnDayEndMs(now);
  const mins = Math.max(0, Math.floor((end - now) / 60_000));
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}

/* ------------------------------------------------------------------ dialog */

/** Milestone wording grows with the achievement (3 · 7 · 14 · 30 · 60 · 100) instead of only swapping the number. */
const MILESTONE_COPY = {
  3: 'Khởi đầu thật tốt! Ba ngày liên tiếp là bước đầu của một thói quen học đều đặn.',
  7: 'Một tuần kiên trì trọn vẹn! Việc học tiếng Nhật đã trở thành thói quen mỗi ngày của bạn.',
  14: 'Hai tuần duy trì không ngắt quãng. Sự đều đặn này giúp kiến thức của bạn vững hơn mỗi ngày.',
  30: 'Một tháng bền bỉ! Giữ được nhịp độ này là điều không hề dễ — bạn đang làm rất tốt.',
  60: 'Sáu mươi ngày liên tiếp — một cột mốc thật đáng tự hào trên hành trình JLPT của bạn.',
  100: 'Một trăm ngày học liên tiếp! Đây là thành tựu lớn, minh chứng cho sự kiên trì phi thường của bạn.',
};

const RING_R = 64;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Streak dialog in three variants:
 * - "atRisk": live streak, nothing studied yet today → keep-the-streak reminder with countdown + quick activities;
 * - "celebrate": today already studied → celebration (milestone-aware);
 * - "start": no streak yet → invite to start one.
 * Only activities that really count for the streak (SRS due review, lessons, mock tests) are suggested.
 */
export default function StreakDialog({
  open,
  onClose,
  variant = 'celebrate',
  days = 0,
  nextMilestone = null,
  isMilestone = false,
  weekDays = [],
  longestDays = 0,
  dayEndsAtUtc = null,
  animate = true,
  dueCards = 0,
}) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const titleId = useId();
  const gid = useId().replace(/:/g, '');
  useFocusTrap(panelRef, { open, onEscape: onClose });

  const shownDays = useCountUp(days, open && animate);
  const atRisk = variant === 'atRisk';
  const start = variant === 'start';
  const timeLeft = useTimeLeft(dayEndsAtUtc, open && (atRisk || start));
  const toBadge = nextMilestone != null ? Math.max(0, nextMilestone - days) : null;

  if (!open || typeof document === 'undefined') return null;

  const oneDayToMilestone = atRisk && nextMilestone === days + 1;
  const milestoneCelebration = !atRisk && !start && isMilestone;
  const bigMilestone = milestoneCelebration && days >= 7;
  const headline = atRisk
    ? (oneDayToMilestone
      ? trf('Chỉ còn 1 ngày nữa để đạt mốc {0} ngày!', { 0: nextMilestone })
      : trf('Giữ vững chuỗi {0} ngày!', { 0: days }))
    : start
      ? tr('Bắt đầu chuỗi ngày học!')
      : isMilestone
        ? trf('Chúc mừng! Bạn đã đạt chuỗi {0} ngày học liên tiếp!', { 0: days })
        : days === 1
          ? tr('Ngày đầu tiên rực rỡ!')
          : trf('Tuyệt vời! Chuỗi {0} ngày', { 0: days });
  const description = oneDayToMilestone
    ? trf('Bạn đang rất gần với huy hiệu chuỗi {0} ngày. Tiếp tục học để chạm mốc tiếp theo!', { 0: nextMilestone })
    : atRisk
      ? tr('Hoàn thành một hoạt động học hôm nay để duy trì chuỗi ngày học của bạn.')
      : start
        ? tr('Hoàn thành một hoạt động học hợp lệ hôm nay để bắt đầu hành trình duy trì thói quen.')
        : isMilestone
          ? tr(MILESTONE_COPY[days] || 'Một cột mốc mới trên hành trình học tiếng Nhật của bạn. Tiếp tục giữ lửa nhé!')
          : tr('Hôm nay bạn đã học rồi. Quay lại vào ngày mai để giữ lửa nhé!');
  // Progress towards the next badge (ring around the flame) only when the learner is one step away.
  const ringProgress = oneDayToMilestone && nextMilestone ? Math.min(1, days / nextMilestone) : null;

  const activities = [
    ...(dueCards > 0 ? [{ id: 'srs', icon: Layers, title: tr('Ôn thẻ đến hạn'), time: tr('~3 phút'), to: '/daily-srs/due/' }] : []),
    { id: 'lesson', icon: BookOpenText, title: tr('Học 1 bài học'), time: tr('~10 phút'), to: '/lessons/' },
    { id: 'mock', icon: ClipboardCheck, title: tr('Làm 1 đề thi thử'), time: tr('~20 phút'), to: '/mock-test/' },
  ];

  function go(to) {
    onClose?.();
    navigate(to);
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden="true" className="rp-anim-fade rp-backdrop absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'rp-streak-dialog relative flex max-h-[96dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_80px_-24px_rgba(120,60,10,0.45)] outline-none sm:rounded-[32px]',
          animate && 'rp-streak-dialog-in',
        )}
      >
        {bigMilestone && animate && <ConfettiBurst colors={['#FFB347', '#FF7A1A', '#FFD36B', '#F7B6C8']} />}
        {/* warm halo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(ellipse_at_50%_30%,#FFF1D6_0%,#FFF8EC_45%,rgba(255,255,255,0)_75%)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Đóng')}
          className="rp-focus absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#F3EFEA] text-[#5B5550] transition-colors hover:bg-[#ECE5DD]"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="rp-no-scrollbar relative min-h-0 overflow-y-auto px-5 pb-3.5 pt-4 sm:px-7">
          {/* Flame — the streak's own symbol; size and companions follow the state */}
          <div className={cx('relative mx-auto', start ? 'h-[92px] w-[84px]' : 'h-[112px] w-[102px]')}>
            {ringProgress != null && (
              <svg aria-hidden="true" viewBox="0 0 144 144" className="absolute left-1/2 top-1/2 h-[144px] w-[144px] -translate-x-1/2 -translate-y-1/2 -rotate-90">
                <circle cx="72" cy="72" r={RING_R} fill="none" stroke="#FCE9D2" strokeWidth="7" />
                <circle
                  cx="72"
                  cy="72"
                  r={RING_R}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - ringProgress)}
                  className="rp-streak-ring-progress"
                />
              </svg>
            )}
            <div className={cx('relative h-full w-full', animate && 'rp-flame-enter')}>
              <StreakFlameMascot variant={variant} gid={gid} />
            </div>
            {atRisk && !oneDayToMilestone && (
              <span aria-hidden="true" className="rp-hourglass absolute -right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#E8780E] shadow-[0_4px_10px_-4px_rgba(180,90,10,0.45)] ring-2 ring-[#FFE3BF]">
                <Clock className="h-5 w-5" strokeWidth={2.4} />
              </span>
            )}
            {oneDayToMilestone && (
              <span aria-hidden="true" className="absolute -right-5 bottom-1 flex h-9 min-w-9 items-center justify-center gap-0.5 rounded-full bg-gradient-to-b from-[#FFD36B] to-[#F2A516] px-2 text-[12px] font-black text-white shadow-[0_3px_0_#C98606]">
                <Medal className="h-3.5 w-3.5" strokeWidth={2.6} />
                {nextMilestone}
              </span>
            )}
            {milestoneCelebration && (
              <span aria-hidden="true" className="rp-cel-pop absolute -right-5 bottom-0 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD36B] to-[#F2A516] text-white shadow-[0_4px_0_#C98606] ring-4 ring-white">
                <Medal className="h-6 w-6" strokeWidth={2.4} />
              </span>
            )}
            {!atRisk && !start && animate && (
              <>
                <Sparkles aria-hidden="true" className="rp-sparkle absolute -left-3 top-6 h-5 w-5 text-[#F5B23B]" />
                <Sparkles aria-hidden="true" className="rp-sparkle rp-sparkle-2 absolute -right-3 top-10 h-4 w-4 text-[#F5B23B]" />
              </>
            )}
          </div>

          {/* Count — hidden before a streak exists (a "0" is not an achievement) */}
          {!start && (
            <>
              <p className="rp-streak-number mt-0.5 text-center text-[56px] font-black leading-none tabular-nums" aria-live="polite">
                {shownDays}
              </p>
              <p className="mt-1.5 text-center text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#5E6B85]">
                {tr('Ngày liên tiếp')}
              </p>
            </>
          )}

          <h2 id={titleId} className="mt-3 text-center text-[22px] font-black leading-tight text-[#14213D] sm:text-[24px]">
            {headline}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[400px] text-center text-[15px] leading-6 text-[#4A5368]">
            {description}
          </p>

          {atRisk && (
            <div className="mx-auto mt-3.5 flex w-fit items-baseline gap-1.5 rounded-full bg-[#FFF3D9] px-5 py-2.5 text-[15px] font-bold text-[#2B2A35]">
              <span>{tr('Còn')}</span>
              <span className="text-[22px] font-black tabular-nums">{timeLeft.hours}</span>
              <span className="text-xs font-semibold text-[#8A8170]">{tr('giờ')}</span>
              <span className="text-[22px] font-black tabular-nums">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-xs font-semibold text-[#8A8170]">{tr('phút')}</span>
              <span>{atRisk ? tr('để giữ chuỗi') : tr('trong hôm nay')}</span>
            </div>
          )}

          {/* Week */}
          <div className="mt-3.5 grid grid-cols-7 gap-1.5 rounded-3xl border border-[#EFE8DE] bg-[#FBF8F3] px-2 py-3" role="list" aria-label={tr('Các ngày học trong tuần')}>
            {weekDays.map((day, idx) => {
              const done = day.active;
              const today = day.isToday;
              return (
                <div
                  key={day.key}
                  role="listitem"
                  className={cx('flex flex-col items-center gap-1.5', animate && 'rp-anim-pop')}
                  style={animate ? { animationDelay: `${160 + idx * 45}ms`, animationFillMode: 'both' } : undefined}
                >
                  <span
                    title={day.dateKey}
                    className={cx(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      done
                        ? cx('bg-gradient-to-b from-[#FFB347] to-[#FF7A1A] shadow-[0_3px_0_#E0601A]', today && 'rp-today-done')
                        : today
                          ? 'rp-today-ring border-[2.5px] border-dashed border-[#FF8A2B] bg-white shadow-[0_0_0_4px_rgba(255,138,43,0.14)]'
                          : 'border-2 border-dashed border-[#E2DBD0] bg-white',
                    )}
                  >
                    {done && <Flame aria-hidden="true" className="h-[18px] w-[18px] fill-white text-white" strokeWidth={2} />}
                  </span>
                  <span className={cx('text-[13px] font-bold', today ? 'text-[#FF7A1A]' : 'text-[#8A93A6]')}>{day.label}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-3.5 text-center text-[15px] text-[#2B2A35]">
            {toBadge != null && nextMilestone != null ? (
              <span className="inline-flex flex-wrap items-center justify-center gap-1">
                <Medal aria-hidden="true" className="h-4 w-4 text-[#E59A12]" />
                {tr('Thêm')} <strong>{trf('{0} ngày', { 0: toBadge })}</strong> {tr('nữa là đạt huy hiệu')}{' '}
                <strong>{trf('{0} ngày', { 0: nextMilestone })}</strong>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1">
                <Trophy aria-hidden="true" className="h-4 w-4 text-[#E59A12]" />
                {trf('Kỷ lục của bạn: {0} ngày', { 0: longestDays })}
              </span>
            )}
          </p>

          {(atRisk || start) && (
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
              {activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => go(a.to)}
                  className="rp-focus rp-streak-activity flex items-center gap-2 rounded-2xl border border-[#EFE8DE] bg-white px-2.5 py-2.5 text-left shadow-[0_2px_0_#EFE8DE]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF1D6] text-[#F07A1A]">
                    <a.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold leading-tight text-[#14213D]">{a.title}</span>
                    <span className="mt-1 block text-xs font-medium text-[#8A93A6]">{a.time}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => (atRisk || start ? go(dueCards > 0 ? '/daily-srs/due/' : '/lessons/') : onClose?.())}
            className="rp-focus rp-streak-cta relative mt-3.5 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF9A3D] to-[#FF7A1A] text-[17px] font-extrabold text-white shadow-[0_5px_0_#D9601A]"
          >
            <span aria-hidden="true" className="rp-streak-cta-shine absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-white/0 via-white/45 to-white/0" />
            <span className="relative">{start ? tr('Bắt đầu học') : atRisk ? tr('Giữ chuỗi ngay') : tr('Tiếp tục học')}</span>
          </button>
          {(atRisk || start) && (
            <button type="button" onClick={onClose} className="rp-focus rp-streak-later mx-auto mt-2 block rounded-full px-5 py-2 text-[15px] font-bold text-[#6B7590] transition-[background-color,color,transform] duration-200 hover:-translate-y-px hover:bg-[#F3EFEA] hover:text-[#14213D] active:translate-y-0 active:bg-[#ECE5DD] motion-reduce:transform-none">
              {tr('Để sau')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
