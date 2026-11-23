import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, Flame, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, ContextualErrorState, EmptyState, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import WebClayIcon from './WebClayIcon.jsx';
import {
  buildMonthCalendarMatrix,
  buildVerifiedActivityDateSet,
  toVnDateKey,
} from './learnerTokens.js';

const SKILL_TONE_BAR = {
  vocab: { bar: 'bg-rp-brand-pressed', pill: 'text-rp-brand-strong bg-rp-brand-tint border-rp-brand-border' },
  vocabulary: { bar: 'bg-rp-brand-pressed', pill: 'text-rp-brand-strong bg-rp-brand-tint border-rp-brand-border' },
  'từ vựng': { bar: 'bg-rp-brand-pressed', pill: 'text-rp-brand-strong bg-rp-brand-tint border-rp-brand-border' },
  grammar: { bar: 'bg-rp-peach', pill: 'text-rp-peach bg-rp-peach-bg border-rp-peach-line' },
  'ngữ pháp': { bar: 'bg-rp-peach', pill: 'text-rp-peach bg-rp-peach-bg border-rp-peach-line' },
  reading: { bar: 'bg-rp-brand-strong', pill: 'text-rp-brand-strong bg-rp-brand-soft border-rp-brand-border' },
  'đọc hiểu': { bar: 'bg-rp-brand-strong', pill: 'text-rp-brand-strong bg-rp-brand-soft border-rp-brand-border' },
  listening: { bar: 'bg-rp-lavender', pill: 'text-rp-lavender bg-rp-lavender-bg border-rp-lavender-line' },
  'nghe hiểu': { bar: 'bg-rp-lavender', pill: 'text-rp-lavender bg-rp-lavender-bg border-rp-lavender-line' },
};

function localizeSkillName(name = '', tr) {
  const key = String(name || '').trim().toLowerCase();
  if (key.includes('vocab') || key.includes('từ vựng')) return tr('Từ vựng');
  if (key.includes('grammar') || key.includes('ngữ pháp')) return tr('Ngữ pháp');
  if (key.includes('reading') || key.includes('đọc')) return tr('Đọc hiểu');
  if (key.includes('listening') || key.includes('nghe')) return tr('Nghe hiểu');
  if (key.includes('writing') || key.includes('viết')) return tr('Luyện viết');
  if (key.includes('speaking') || key.includes('nói')) return tr('Luyện nói');
  if (key.includes('kanji') || key.includes('hán')) return tr('Hán tự');
  return tr(name);
}

function getBarStyle(name = '') {
  const k = String(name).toLowerCase().trim();
  for (const [token, style] of Object.entries(SKILL_TONE_BAR)) {
    if (k.includes(token)) return style;
  }
  return { bar: 'bg-rp-brand', pill: 'text-rp-brand-strong bg-rp-brand-tint border-rp-brand-border' };
}

function formatMonthLabel(year, monthIndex, locale) {
  if (locale === 'ja') return `${year}年${monthIndex + 1}月`;
  return `Tháng ${monthIndex + 1}, ${year}`;
}

function formatShortDate(dateValue, locale) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
    }).format(d);
  } catch {
    return toVnDateKey(d);
  }
}

/**
 * Learning Analytics & Activity History panel.
 * Strictly consumes real Backend data:
 * - Study calendar uses verified dates from Streak window, MockTest/history, PracticeSubmission/my-history & Homework.
 * - Skill bars use Analytics/skill-breakdown & Analytics/skill-monthly.
 * - Activity Timeline merges timestamped real history items.
 */
export default function LearningAnalytics({
  streak,
  skills = [],
  skillsQuery = null,
  skillMonthly = null,
  mockHistory = [],
  practiceHistory = [],
  homeworkList = [],
  className,
}) {
  const { tr, trf, locale } = useLocale();
  const todayKey = useMemo(() => toVnDateKey(new Date()), []);
  const initialYear = Number(todayKey.slice(0, 4)) || 2026;
  const initialMonth = (Number(todayKey.slice(5, 7)) || 1) - 1;
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth });

  const verifiedDates = useMemo(
    () => buildVerifiedActivityDateSet({ streak, mockHistory, practiceHistory, homeworkList, todayKey }),
    [streak, mockHistory, practiceHistory, homeworkList, todayKey],
  );

  const monthMatrix = useMemo(
    () => buildMonthCalendarMatrix(cursor.year, cursor.month, verifiedDates, todayKey),
    [cursor.year, cursor.month, verifiedDates, todayKey],
  );

  const monthActiveCount = useMemo(() => {
    let count = 0;
    for (const wk of monthMatrix) {
      for (const day of wk.days) {
        if (day.inMonth && day.active) count += 1;
      }
    }
    return count;
  }, [monthMatrix]);

  const monthlyBySkill = useMemo(() => {
    const map = new Map();
    for (const s of skillMonthly?.skills || []) {
      if (s?.languageSkillName) map.set(s.languageSkillName.toLowerCase(), s);
    }
    return map;
  }, [skillMonthly]);

  // Combine Analytics/skill-breakdown with Placement+Mock skill-monthly so skills don't read empty when Placement is scored
  const effectiveSkills = useMemo(() => {
    if (Array.isArray(skills) && skills.length > 0) return skills;
    const fromMonthly = (skillMonthly?.skills || []).filter(
      (s) => s?.languageSkillName && s?.currentScorePercent != null && Number.isFinite(Number(s.currentScorePercent)),
    );
    return fromMonthly.map((s) => ({
      languageSkillName: s.languageSkillName,
      averageScore: Number(s.currentScorePercent),
      attemptCount: s.totalAttempts || 1,
    }));
  }, [skills, skillMonthly]);

  const weekHeaders = locale === 'ja' ? ['月', '火', '水', '木', '金', '土', '日'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const recentFeed = useMemo(() => {
    const items = [];
    for (const m of Array.isArray(mockHistory) ? mockHistory : []) {
      const ts = m?.submittedAt || m?.completedAt || m?.startedAt;
      if (!ts) continue;
      items.push({
        id: `mock-${m.attemptId || m.id || ts}`,
        icon: m.attemptKind === 'Placement' ? 'placement' : 'mock',
        title: m.mockTestTitle || m.title || (m.attemptKind === 'Placement' ? tr('Đánh giá năng lực JLPT') : tr('Thi thử JLPT')),
        meta: m.scorePercent != null ? `${Math.round(Number(m.scorePercent))}%` : m.correctCount != null ? `${m.correctCount}/${m.totalQuestions || '?'}` : tr('Đã nộp'),
        date: ts,
        to: m.attemptKind === 'Placement' ? `/app/placement-test/?attemptId=${m.attemptId}` : '/exam-result/',
      });
    }
    for (const p of Array.isArray(practiceHistory) ? practiceHistory : []) {
      const ts = p?.submittedAt || p?.createdAt;
      if (!ts) continue;
      const isSpeak = String(p.type || '').toLowerCase() === 'speaking';
      items.push({
        id: `practice-${p.submissionId || p.id || ts}`,
        icon: isSpeak ? 'speaking' : 'writing',
        title: isSpeak ? tr('Luyện nói AI') : tr('Luyện viết AI'),
        meta: p.score != null ? `${p.score}đ` : tr('Đã nộp bài'),
        date: ts,
        to: isSpeak ? '/speaking/' : '/riki/essay/',
      });
    }
    for (const hw of Array.isArray(homeworkList) ? homeworkList : []) {
      const ts = hw?.submittedAt || hw?.submissionDate;
      if (!ts) continue;
      items.push({
        id: `hw-${hw.assignmentId || hw.id || ts}`,
        icon: 'homework',
        title: hw.title || tr('Bài tập lớp nhóm'),
        meta: hw.statusLabel || tr('Đã nộp'),
        date: ts,
        to: '/homework/',
      });
    }
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [mockHistory, practiceHistory, homeworkList, tr]);

  function stepMonth(delta) {
    setCursor((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  return (
    <section aria-label={tr('Phân tích học tập')} className={cx('grid gap-4 lg:grid-cols-12', className)} data-section="LearningAnalytics">
      {/* 1. Monthly Activity Calendar (IELTSWithHarry Biểu đồ chăm chỉ style) */}
      <Card className="border-rp-line bg-white p-4 shadow-rp-sm sm:p-5 lg:col-span-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong">
              <Flame aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-[15px] font-extrabold text-rp-text">{tr('Biểu đồ hoạt động')}</h3>
              <p className="text-[11.5px] text-rp-text-muted">
                {trf('{0} ngày ghi nhận trong tháng', { 0: monthActiveCount })}
              </p>
            </div>
          </div>
        </div>

        {/* Month switcher */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-rp-brand-border/70 bg-rp-brand-tint/40 px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            aria-label={tr('Tháng trước')}
            className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text transition hover:bg-white hover:text-rp-brand-strong"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="text-xs font-extrabold text-rp-text">
            {formatMonthLabel(cursor.year, cursor.month, locale)}
          </span>
          <button
            type="button"
            onClick={() => stepMonth(1)}
            aria-label={tr('Tháng sau')}
            className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text transition hover:bg-white hover:text-rp-brand-strong"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Week matrix */}
        <div className="mt-3 space-y-1.5" role="grid" aria-label={tr('Lịch hoạt động theo tuần')}>
          <div className="grid grid-cols-[36px_repeat(7,1fr)] items-center gap-1 text-center text-[10.5px] font-bold text-rp-text-muted">
            <span>{tr('Tuần')}</span>
            {weekHeaders.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          {monthMatrix.map((wk) => (
            <div key={wk.weekNumber} className="grid grid-cols-[36px_repeat(7,1fr)] items-center gap-1">
              <span className="mx-auto inline-flex h-6 w-7 items-center justify-center rounded-lg border border-rp-line bg-rp-bg-2 text-[10.5px] font-bold text-rp-text-2">
                {wk.weekNumber}
              </span>
              {wk.days.map((d) => (
                <span
                  key={d.dateKey}
                  title={d.dateKey}
                  className={cx(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition',
                    !d.inMonth && 'opacity-30',
                    d.active
                      ? 'bg-rp-brand-pressed text-white shadow-rp-xs'
                      : d.isToday
                        ? 'bg-rp-brand-tint text-rp-brand-strong'
                        : 'bg-rp-bg-2 text-rp-text-muted',
                    d.isToday && 'ring-2 ring-rp-brand-deep ring-offset-1',
                  )}
                >
                  {d.dayNumber}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Legend + Honest Scope Note */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rp-line/70 pt-2.5 text-[11px] text-rp-text-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rp-brand-pressed" /> {tr('Có hoạt động')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-rp-line bg-rp-bg-2" /> {tr('Chưa ghi nhận')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-rp-brand-deep bg-white" /> {tr('Hôm nay')}
          </span>
        </div>
        <p className="mt-1.5 text-[10.5px] leading-4 text-rp-text-muted">
          {tr('Tổng hợp từ chuỗi streak liên tiếp, đề thi thử & bài nộp đã ghi nhận.')}
        </p>
      </Card>

      {/* 2. Skill Progress Chart */}
      <Card className="border-rp-line bg-white p-4 shadow-rp-sm sm:p-5 lg:col-span-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <WebClayIcon name="progress" size="sm" tone="sakura" hover className="-my-1" />
            <div>
              <h3 className="text-[15px] font-extrabold text-rp-text">{tr('Tiến độ theo kỹ năng')}</h3>
              <p className="text-[11.5px] text-rp-text-muted">
                {tr('Từ đánh giá năng lực & thi thử JLPT')}
              </p>
            </div>
          </div>
          {effectiveSkills.length > 0 && skillMonthly?.currentOverallScorePercent != null && (
            <Badge tone="brand" size="sm" icon={TrendingUp}>
              {Math.round(skillMonthly.currentOverallScorePercent)}%
            </Badge>
          )}
        </div>

        {skillsQuery?.isError && effectiveSkills.length === 0 ? (
          <div className="mt-4">
            <ContextualErrorState
              variant="inline"
              error={skillsQuery.error}
              title={tr('Tạm chưa tải được năng lực theo kỹ năng')}
              onRetry={() => skillsQuery.refetch?.()}
              retrying={Boolean(skillsQuery.isFetching)}
            />
          </div>
        ) : effectiveSkills.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              variant="compact"
              illustration="progress"
              title={tr('Chưa có điểm phân tích kỹ năng')}
              description={tr('Hoàn thành bài đánh giá năng lực hoặc một đề thi thử để xem biểu đồ 4 kỹ năng.')}
              action={
                <Button as={Link} to="/app/placement-test/" variant="primary" size="sm" iconRight={ArrowRight}>
                  {tr('Làm đánh giá năng lực')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {effectiveSkills.slice(0, 5).map((item) => {
              const score = Math.max(0, Math.min(100, Math.round(Number(item.averageScore) || 0)));
              const monthly = monthlyBySkill.get(String(item.languageSkillName || '').toLowerCase());
              const delta = monthly?.changeFromPreviousRecordedMonth;
              const style = getBarStyle(item.languageSkillName);

              return (
                <div key={item.languageSkillName} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-rp-navy">{localizeSkillName(item.languageSkillName, tr)}</span>
                    <div className="flex items-center gap-1.5">
                      {delta != null && delta !== 0 && (
                        <span className={cx('rounded-full border px-1.5 py-0.5 text-[10px] font-bold', style.pill)}>
                          {delta > 0 ? `+${Math.round(delta)}%` : `${Math.round(delta)}%`}
                        </span>
                      )}
                      <span className="font-extrabold text-rp-navy">{score}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-rp-brand-soft/65">
                    <div
                      className={cx('h-full rounded-full transition-all duration-500', style.bar)}
                      style={{ width: `${Math.max(4, score)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-rp-text-muted">
                    {trf('{0} lượt làm bài', { 0: item.attemptCount || 1 })}
                    {monthly?.currentAssessment ? ` · ${tr(monthly.currentAssessment)}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 3. Recent Activity Timeline */}
      <Card className="border-rp-line bg-white p-4 shadow-rp-sm sm:p-5 lg:col-span-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <WebClayIcon name="calendar" size="sm" tone="lavender" hover className="-my-1" />
            <div>
              <h3 className="text-[15px] font-extrabold text-rp-navy">{tr('Hoạt động gần đây')}</h3>
              <p className="text-[11.5px] text-rp-text-muted">
                {tr('Lịch sử thi thử & bài nộp mới nhất')}
              </p>
            </div>
          </div>
          <Button as={Link} to="/exam-result/" variant="ghost" size="sm" iconRight={ArrowRight}>
            {tr('Tất cả')}
          </Button>
        </div>

        {recentFeed.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              variant="compact"
              illustration="calendar"
              title={tr('Chưa có lượt nộp gần đây')}
              description={tr('Khi bạn làm đề thi thử, luyện viết/nói AI hoặc nộp bài tập, mốc thời gian sẽ hiện tại đây.')}
              action={
                <Button as={Link} to="/mock-tests/" variant="secondary" size="sm" iconRight={CalendarDays}>
                  {tr('Xem đề thi thử')}
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-rp-line/70">
            {recentFeed.map((ev) => (
              <li key={ev.id}>
                <Link
                  to={ev.to}
                  className="rp-focus group flex items-center gap-3 py-2.5 transition hover:bg-rp-bg-2/60"
                >
                  <WebClayIcon name={ev.icon} size="xs" hover />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-rp-navy group-hover:text-rp-brand-strong">
                      {ev.title}
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-rp-text-muted">
                      <Clock aria-hidden="true" className="h-3 w-3" />
                      <span>{formatShortDate(ev.date, locale)}</span>
                      <span>·</span>
                      <span className="font-semibold text-rp-text-2">{ev.meta}</span>
                    </p>
                  </div>
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted group-hover:text-rp-brand-strong" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
