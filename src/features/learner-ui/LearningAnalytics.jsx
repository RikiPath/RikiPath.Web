import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, ContextualErrorState, EmptyState, Popover, cx } from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import WebClayIcon from './WebClayIcon.jsx';
import {
  buildMonthCalendarMatrix,
  buildVerifiedActivityDateSet,
  shiftDateKey,
  toVnDateKey,
} from './learnerTokens.js';
import './dashboard.css';

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

/** "Thứ Ba, 24/11" style label for a VN calendar day key (yyyy-MM-dd); the key is already a Vietnam date. */
function formatLongDate(dateKey) {
  try {
    return new Intl.DateTimeFormat(currentIntlTag(), { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dateKey}T00:00:00Z`));
  } catch {
    return dateKey;
  }
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

/** Month/year control in the calendar header: one button that opens a compact year + month picker. */
function MonthPicker({ cursor, locale, onPick, onToday, tr }) {
  const [year, setYear] = useState(cursor.year);
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(currentIntlTag(), { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))),
  );
  return (
    <Popover
      align="end"
      label={tr('Chọn tháng')}
      onOpenChange={(open) => open && setYear(cursor.year)}
      trigger={({ toggle, props, open }) => (
        <button
          {...props}
          type="button"
          onClick={toggle}
          className={cx(
            'rp-focus inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[12px] font-extrabold transition-colors',
            open ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong' : 'border-rp-line bg-white text-rp-text hover:border-rp-brand-border hover:text-rp-brand-strong',
          )}
        >
          {formatMonthLabel(cursor.year, cursor.month, locale)}
          <ChevronDown aria-hidden="true" className={cx('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      )}
    >
      {({ close }) => (
        <div className="w-[236px] p-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setYear((y) => y - 1)} aria-label={tr('Năm trước')} className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong">
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-extrabold tabular-nums text-rp-navy">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} aria-label={tr('Năm sau')} className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong">
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1" role="listbox" aria-label={tr('Chọn tháng')}>
            {monthNames.map((name, i) => {
              const active = year === cursor.year && i === cursor.month;
              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onPick(year, i);
                    close();
                  }}
                  className={cx(
                    'rp-focus h-8 rounded-lg text-[12px] font-bold transition-colors',
                    active ? 'border border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong' : 'text-rp-text-2 hover:bg-rp-bg-2 hover:text-rp-text',
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onToday();
              close();
            }}
            className="rp-focus mt-2 w-full rounded-lg py-1.5 text-[12px] font-bold text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            {tr('Về hôm nay')}
          </button>
        </div>
      )}
    </Popover>
  );
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
  feedLoading = false,
  className,
}) {
  const { tr, trf, locale } = useLocale();
  const todayKey = useMemo(() => toVnDateKey(new Date()), []);
  const initialYear = Number(todayKey.slice(0, 4)) || 2026;
  const initialMonth = (Number(todayKey.slice(5, 7)) || 1) - 1;
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthDir, setMonthDir] = useState('none');
  const dayRefs = useRef(new Map());
  const focusAfterMove = useRef(false);

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
      const sc = m?.scoring;
      const metaText =
        sc?.scoreType === 'PRACTICE_SCALE_10'
          ? `${sc.normalizedScore}/10 điểm`
          : sc?.scoreType === 'JLPT_MOCK_180'
            ? `${sc.normalizedScore}/180 điểm`
            : m.totalScore != null && Number.isFinite(Number(m.totalScore))
              ? `${Math.round(Number(m.totalScore))}%`
              : m.scorePercent != null
                ? `${Math.round(Number(m.scorePercent))}%`
                : m.correctCount != null
                  ? `${m.correctCount}/${m.totalQuestions || '?'}`
                  : tr('Đã nộp');
      items.push({
        id: `mock-${m.attemptId || m.id || ts}`,
        icon: m.attemptKind === 'Placement' ? 'placement' : 'mock',
        title: m.mockTestTitle || m.title || (m.attemptKind === 'Placement' ? tr('Đánh giá năng lực JLPT') : tr('Thi thử JLPT')),
        meta: metaText,
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

  function selectDay(key) {
    setSelectedKey(key);
    const y = Number(key.slice(0, 4));
    const mo = Number(key.slice(5, 7)) - 1;
    if (y !== cursor.year || mo !== cursor.month) {
      setMonthDir(y * 12 + mo > cursor.year * 12 + cursor.month ? 'next' : 'prev');
      setCursor({ year: y, month: mo });
    }
  }

  function goToday() {
    selectDay(todayKey);
  }

  // Arrow keys move the selection by a day / week (crossing months), Home/End jump within the week.
  function onGridKeyDown(e) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step == null) return;
    e.preventDefault();
    const next = shiftDateKey(selectedKey, step);
    if (!next) return;
    focusAfterMove.current = true;
    selectDay(next);
  }

  useEffect(() => {
    if (!focusAfterMove.current) return;
    focusAfterMove.current = false;
    dayRefs.current.get(selectedKey)?.focus();
  }, [selectedKey, cursor]);

  function dayAriaLabel(d, future) {
    const parts = [formatLongDate(d.dateKey)];
    if (d.isToday) parts.push(tr('Hôm nay'));
    if (d.active) parts.push(tr('Có hoạt động'));
    else if (future) parts.push(tr('Ngày trong tương lai'));
    else parts.push(tr('Chưa ghi nhận'));
    return parts.join(', ');
  }

  return (
    <section aria-label={tr('Phân tích học tập')} className={cx('grid gap-4 lg:grid-cols-12', className)} data-section="LearningAnalytics">
      {/* 1. Interactive activity calendar — real verified dates; selecting a day shows what was recorded that day */}
      <Card className="flex flex-col border-rp-line bg-white p-4 shadow-rp-sm sm:p-5 lg:col-span-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <WebClayIcon name="calendar" size="sm" hover className="-my-1 shrink-0" />
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-extrabold text-rp-text">{tr('Biểu đồ hoạt động')}</h3>
              <p className="truncate text-[11.5px] text-rp-text-muted">{trf('{0} ngày ghi nhận trong tháng', { 0: monthActiveCount })}</p>
            </div>
          </div>
          <MonthPicker
            cursor={cursor}
            locale={locale}
            onPick={(year, month) => {
              setMonthDir(year * 12 + month >= cursor.year * 12 + cursor.month ? 'next' : 'prev');
              setCursor({ year, month });
            }}
            onToday={goToday}
            tr={tr}
          />
        </div>

        <div className="mt-3 overflow-hidden">
          <div
            key={`${cursor.year}-${cursor.month}`}
            className="rp-cal-month space-y-1"
            data-dir={monthDir}
            role="grid"
            aria-label={tr('Lịch hoạt động theo tuần')}
            onKeyDown={onGridKeyDown}
          >
            <div role="row" className="grid grid-cols-7 items-center gap-1 text-center text-[10.5px] font-bold text-rp-text-muted">
              {weekHeaders.map((w) => (
                <span key={w} role="columnheader">{w}</span>
              ))}
            </div>
            {monthMatrix.map((wk) => (
              <div key={wk.weekNumber} role="row" className="grid grid-cols-7 items-center gap-1">
                {wk.days.map((d) => {
                  const selected = d.dateKey === selectedKey;
                  const future = d.dateKey > todayKey;
                  return (
                    <span key={d.dateKey} role="gridcell" aria-selected={selected} className="flex justify-center">
                      <button
                        ref={(el) => {
                          if (el) dayRefs.current.set(d.dateKey, el);
                          else dayRefs.current.delete(d.dateKey);
                        }}
                        type="button"
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectDay(d.dateKey)}
                        aria-label={dayAriaLabel(d, future)}
                        className="rp-focus rp-cal-day"
                        data-active={d.active ? 'true' : 'false'}
                        data-today={d.isToday ? 'true' : 'false'}
                        data-selected={selected ? 'true' : 'false'}
                        data-outside={d.inMonth ? 'false' : 'true'}
                        data-future={future ? 'true' : 'false'}
                      >
                        {d.dayNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-rp-text-2">
          <span className="inline-flex items-center gap-1.5"><span className="rp-cal-legend" data-kind="active" /> {tr('Có hoạt động')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="rp-cal-legend" data-kind="selected" /> {tr('Đang chọn')}</span>
        </div>
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
                  <div className="h-2 w-full overflow-hidden rounded-full bg-rp-brand-soft/65" role="progressbar" aria-label={localizeSkillName(item.languageSkillName, tr)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
                    <div
                      className={cx('rp-grow-x h-full origin-left rounded-full transition-[width] duration-500 ease-out', style.bar)}
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
            <WebClayIcon name="history" size="sm" hover className="-my-1" />
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

        {recentFeed.length === 0 && feedLoading ? (
          <ul className="mt-4 space-y-3" aria-busy="true" aria-label={tr('Đang tải hoạt động gần đây')}>
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="rp-skeleton h-9 w-9 rounded-xl" />
                <span className="flex-1 space-y-1.5">
                  <span className="rp-skeleton block h-3 w-3/4 rounded" />
                  <span className="rp-skeleton block h-2.5 w-1/3 rounded" />
                </span>
              </li>
            ))}
          </ul>
        ) : recentFeed.length === 0 ? (
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
          <ul className="mt-4 divide-y divide-rp-line/70 rp-anim-fade">
            {recentFeed.slice(0, 4).map((ev) => (
              <li key={ev.id}>
                <Link
                  to={ev.to}
                  className="rp-focus rp-activity-row group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5"
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
