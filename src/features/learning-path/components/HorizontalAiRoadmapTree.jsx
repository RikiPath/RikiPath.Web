import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Flag,
  Lock,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Badge, Button, Collapsible, ProgressBar, cx } from '@/components/ui';
import { WebClayIcon } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';
import {
  buildAiRoadmapTree,
  pickPreviewBranchDays,
} from '../roadmapTreeModel.js';

function nodeCircleClass(status) {
  if (status === 'completed') {
    return 'border-rp-success bg-rp-success text-white shadow-rp-xs';
  }
  if (status === 'active' || status === 'ready') {
    return 'border-rp-brand-pressed bg-rp-brand-pressed text-white ring-4 ring-rp-brand-tint shadow-rp-xs';
  }
  return 'border-[#EAD7E0] bg-white text-rp-text-muted';
}

function spineSegmentClass(status) {
  if (status === 'completed') return 'bg-rp-success-line';
  if (status === 'active' || status === 'ready') return 'bg-rp-brand-border';
  return 'bg-[#EAD7E0]';
}

function stemBorderClass(status) {
  if (status === 'completed') return 'border-rp-success-line';
  if (status === 'active' || status === 'ready') return 'border-rp-brand-border';
  return 'border-[#EAD7E0]';
}

function dayDotClass(status) {
  if (status === 'completed') return 'border-rp-success bg-rp-success';
  if (status === 'active' || status === 'ready') return 'border-rp-brand-pressed bg-rp-brand-pressed';
  return 'border-[#DEC9CE] bg-white';
}

function DayBranchNode({
  dayItem,
  stemColorClass,
  isDraftPreview,
  onStartDay,
  onCompleteDay,
  startDayMutation,
  completeDayMutation,
  tr,
  trf,
}) {
  const status = dayItem.status;
  const lessons = dayItem.normalizedLessons || [];
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isReady = status === 'ready';

  return (
    <li id={`ai-day-${dayItem.day}`} className="relative pl-4 scroll-mt-6">
      {/* Horizontal branch arm from phase stem into the day leaf card */}
      <span
        aria-hidden="true"
        className={cx(
          'absolute left-0 top-4 h-[2px] w-4',
          isCompleted ? 'bg-rp-success-line' : isActive || isReady ? 'bg-rp-brand-border' : 'bg-[#EAD7E0]',
        )}
      />
      <span
        aria-hidden="true"
        className={cx(
          'absolute -left-[5px] top-[12px] h-2.5 w-2.5 rounded-full border-2',
          dayDotClass(status),
        )}
      />

      <div
        className={cx(
          'rounded-xl border bg-white p-3 shadow-rp-xs transition-[border-color,box-shadow]',
          isCompleted
            ? 'border-rp-success-line/90'
            : isActive || isReady
              ? 'border-rp-brand-border ring-1 ring-rp-brand-tint'
              : 'border-rp-line opacity-90',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Badge
              tone={isCompleted ? 'success' : isActive || isReady ? 'brand' : 'neutral'}
              size="sm"
              icon={false}
            >
              {trf('Ngày {0}', { 0: dayItem.day })}
            </Badge>
            {dayItem.coreStudyMinutes > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rp-text-muted tabular-nums">
                <Clock3 aria-hidden="true" className="h-3 w-3" />
                {dayItem.coreStudyMinutes}p
              </span>
            )}
          </div>

          <span
            className={cx(
              'inline-flex items-center gap-1 text-[11px] font-semibold',
              isCompleted
                ? 'text-rp-success'
                : isActive
                  ? 'text-rp-brand-strong'
                  : isReady
                    ? 'text-rp-brand-strong'
                    : 'text-rp-text-muted',
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                {tr('Đã hoàn thành')}
              </>
            ) : isActive ? (
              <>
                <CircleDot aria-hidden="true" className="h-3.5 w-3.5" />
                {tr('Đang học')}
              </>
            ) : isReady ? (
              tr('Sẵn sàng')
            ) : (
              <>
                <Lock aria-hidden="true" className="h-3 w-3" />
                {tr('Chờ mở khóa')}
              </>
            )}
          </span>
        </div>

        <p className="mt-1.5 text-[13px] font-bold leading-snug text-rp-text">
          {dayItem.title}
        </p>
        {dayItem.focus && (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-4 text-rp-text-2">
            {dayItem.focus}
          </p>
        )}

        {lessons.length > 0 && (
          <ul
            className={cx(
              'mt-2 space-y-1 border-l-2 pl-2.5',
              stemColorClass,
            )}
          >
            {lessons.map((lesson, lIdx) => (
              <li key={`${dayItem.day}-l-${lesson.lessonId ?? lIdx}`} className="text-[11.5px]">
                {lesson.lessonId != null ? (
                  <Link
                    to={`/lesson-player/?lessonId=${lesson.lessonId}&from=ai`}
                    className="rp-focus rp-link inline-flex items-center gap-1 font-semibold"
                  >
                    <BookOpen aria-hidden="true" className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{lesson.title}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-rp-text-2">
                    <BookOpen aria-hidden="true" className="h-3 w-3 shrink-0 text-rp-brand-strong" />
                    <span className="line-clamp-1">{lesson.title}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {!isDraftPreview && !isCompleted && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-rp-line/80 pt-2">
            {isActive ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                loading={completeDayMutation?.isPending && completeDayMutation?.variables === dayItem.day}
                onClick={() => onCompleteDay?.(dayItem.day)}
              >
                {tr('Hoàn thành ngày học')}
              </Button>
            ) : isReady ? (
              <Button
                variant="soft"
                size="sm"
                className="w-full"
                loading={startDayMutation?.isPending && startDayMutation?.variables === dayItem.day}
                onClick={() => onStartDay?.(dayItem.day)}
              >
                {tr('Bắt đầu')}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rp-text-muted">
                <Lock aria-hidden="true" className="h-3 w-3" />
                {tr('Chờ hoàn thành ngày trước')}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Horizontal Left-to-Right Branching Roadmap Tree for AI Learning Path.
 * Keeps the original RikiPath node + Sakura branch aesthetic, rotated cleanly
 * to flow Left -> Right with non-overlapping sub-branches below each checkpoint.
 */
export default function HorizontalAiRoadmapTree({
  path,
  targetLevelLabel,
  isDraftPreview = false,
  animate = false,
  onStartDay,
  onCompleteDay,
  startDayMutation,
  completeDayMutation,
}) {
  const { tr, trf } = useLocale();
  const scrollRef = useRef(null);
  const model = useMemo(
    () => buildAiRoadmapTree(path, { targetLevelLabel }),
    [path, targetLevelLabel],
  );

  // Track which phase branches show all sub-day nodes vs compact preview; keep active branch expanded by default.
  const [expandedAll, setExpandedAll] = useState(false);
  const [collapsedBranches, setCollapsedBranches] = useState(() => new Set());
  const [expandedDaysByBranch, setExpandedDaysByBranch] = useState(() => new Set());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    syncScrollButtons();
    window.addEventListener('resize', syncScrollButtons);
    return () => window.removeEventListener('resize', syncScrollButtons);
  }, [syncScrollButtons, model.branches.length, expandedAll, collapsedBranches, expandedDaysByBranch]);

  const panBy = (delta) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const jumpToBranch = (branchId) => {
    const container = scrollRef.current;
    if (!container) return;
    setCollapsedBranches((prev) => {
      const next = new Set(prev);
      next.delete(branchId);
      return next;
    });
    const node = container.querySelector(`[data-branch-id="${branchId}"]`);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const toggleBranchCollapse = (branchId) => {
    setCollapsedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const toggleAllDaysInBranch = (branchId) => {
    setExpandedDaysByBranch((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const toggleGlobalExpand = () => {
    if (expandedAll) {
      setExpandedAll(false);
      setExpandedDaysByBranch(new Set());
      return;
    }
    setExpandedAll(true);
    setCollapsedBranches(new Set());
    setExpandedDaysByBranch(new Set(model.branches.map((b) => b.id)));
  };

  return (
    <section
      aria-labelledby="ai-roadmap-tree-title"
      className="rounded-rp-card-lg border border-rp-line bg-white p-4 shadow-rp-card sm:p-5"
    >
      {/* Tree Toolbar: title, legend, branch controls & horizontal pan */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-line pb-3.5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              lang="ja"
              className="font-['Noto_Serif_JP',serif] text-[15px] font-bold text-rp-brand-strong"
            >
              道
            </span>
            <h3 id="ai-roadmap-tree-title" className="text-base font-bold text-rp-text">
              {tr('Sơ đồ lộ trình học AI')}
            </h3>
            {model.stats.totalDays > 0 && (
              <Badge tone={model.goal.isCompleted ? 'success' : 'brand'} size="sm" icon={false}>
                {trf('{0}/{1} ngày', { 0: model.stats.completedDays, 1: model.stats.totalDays })} · {model.stats.progressPercent}%
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-rp-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rp-success" />
              {tr('Đã hoàn thành')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rp-brand-pressed ring-2 ring-rp-brand-tint" />
              {tr('Đang học')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-[#DEC9CE] bg-white" />
              {tr('Chờ mở khóa')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {model.branches.length > 0 && (
            <div className="hidden items-center gap-1 rounded-rp-input border border-rp-line bg-white p-1 md:inline-flex" role="group" aria-label={tr('Các chặng học của bạn')}>
              {model.branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => jumpToBranch(branch.id)}
                  className={cx(
                    'rp-focus rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums transition-colors',
                    branch.status === 'completed'
                      ? 'text-rp-success hover:bg-rp-success-bg'
                      : branch.status === 'active'
                        ? 'bg-rp-brand-tint text-rp-brand-strong'
                        : 'text-rp-text-muted hover:bg-rp-muted hover:text-rp-text',
                  )}
                >
                  {branch.number}
                </button>
              ))}
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={toggleGlobalExpand}>
            {expandedAll ? tr('Thu gọn nhánh') : tr('Mở rộng tất cả nhánh')}
          </Button>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-label={tr('Cuộn sang trái')}
              disabled={!canScrollLeft}
              onClick={() => panBy(-320)}
              className="rp-focus rp-press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={tr('Cuộn sang phải')}
              disabled={!canScrollRight}
              onClick={() => panBy(320)}
              className="rp-focus rp-press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Branching Tree Canvas (Left -> Right) */}
      <div
        ref={scrollRef}
        onScroll={syncScrollButtons}
        className="mt-4 w-full max-w-full overflow-x-auto pb-3 scroll-smooth snap-x snap-proximity"
      >
        <ol className="inline-flex min-w-max items-start pt-1">
          {/* 1. ROOT / START NODE (LEFT) */}
          <li className="w-[216px] shrink-0 snap-start pr-2">
            <div className="flex items-center">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-rp-brand-pressed bg-rp-brand-pressed text-white ring-4 ring-rp-brand-tint shadow-rp-xs"
              >
                <Flag className="h-4 w-4" />
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  'h-[2px] flex-1',
                  model.stats.completedDays > 0 ? 'bg-rp-success-line' : 'bg-rp-brand-border',
                )}
              />
            </div>

            <div className="mt-3 mr-3 rounded-rp-card border border-rp-brand-border bg-white p-3.5 shadow-rp-xs">
              <div className="flex items-center gap-2.5">
                <WebClayIcon name="journey" size="xs" className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-rp-brand-strong">
                    {tr('Xuất phát')}
                  </p>
                  <p className="text-sm font-bold text-rp-text">
                    {model.root.levelCode ? `JLPT ${model.root.levelCode}` : tr('Điểm bắt đầu')}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-rp-line/80 pt-2.5">
                <ProgressBar
                  value={model.stats.completedDays}
                  max={model.stats.totalDays || 1}
                  tone={model.goal.isCompleted ? 'success' : 'brand'}
                  label={tr('Tiến độ lộ trình')}
                />
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium text-rp-text-muted">
                  <span>{model.root.dailyStudyMinutes > 0 ? trf('{0} phút / ngày', { 0: model.root.dailyStudyMinutes }) : tr('Bắt đầu từ đây')}</span>
                  {model.root.daysUntilExam != null && (
                    <span>{trf('{0} ngày', { 0: model.root.daysUntilExam })}</span>
                  )}
                </div>
              </div>
            </div>
          </li>

          {/* 2. PHASE CHECKPOINTS & DOWNWARD SUB-BRANCHES (LEFT -> RIGHT) */}
          {model.branches.map((branch, idx) => {
            const isCollapsed = collapsedBranches.has(branch.id);
            const showAllDays = expandedAll || expandedDaysByBranch.has(branch.id);
            const { visible: previewDays, hiddenCount } = pickPreviewBranchDays(branch.days, 3);
            const renderedDays = showAllDays ? branch.days : previewDays;
            const stemCls = stemBorderClass(branch.status);
            const rightSpineStatus = branch.status === 'completed' ? 'completed' : branch.status === 'active' ? 'active' : 'locked';

            return (
              <li
                key={branch.id}
                data-branch-id={branch.id}
                style={animate ? { '--rp-delay': `${Math.min(idx, 6) * 70}ms` } : undefined}
                className={cx(
                  'w-[300px] sm:w-[320px] shrink-0 snap-start',
                  animate && 'rp-celebrate-stagger',
                )}
              >
                {/* Horizontal Main Trunk Spine Row */}
                <div className="flex items-center">
                  <span
                    aria-hidden="true"
                    className={cx('h-[2px] w-4 shrink-0', spineSegmentClass(branch.status))}
                  />
                  <span
                    aria-hidden="true"
                    className={cx(
                      'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                      nodeCircleClass(branch.status),
                    )}
                  >
                    {branch.status === 'completed' ? (
                      <Check className="h-4 w-4" strokeWidth={2.6} />
                    ) : (
                      branch.number
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cx('h-[2px] flex-1', spineSegmentClass(rightSpineStatus))}
                  />
                </div>

                {/* Checkpoint Card + Child Branch Stem */}
                <div className="mt-3 pr-5">
                  <div
                    className={cx(
                      'overflow-hidden rounded-rp-card border bg-white shadow-rp-xs transition-[border-color,box-shadow]',
                      branch.status === 'completed'
                        ? 'border-rp-success-line'
                        : branch.status === 'active'
                          ? 'border-rp-brand-border ring-1 ring-rp-brand-tint'
                          : 'border-rp-line',
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      aria-controls={branch.days.length > 0 ? `ai-branch-${branch.id}` : undefined}
                      onClick={() => toggleBranchCollapse(branch.id)}
                      className="rp-focus flex w-full items-start justify-between gap-2 px-3.5 py-3 text-left transition-colors hover:bg-rp-row-hover"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-rp-brand-strong">
                            {trf('Chặng {0}', { 0: branch.number })}
                          </span>
                          {branch.startDay != null && branch.endDay != null && (
                            <Badge tone="neutral" size="sm" icon={false}>
                              {trf('Ngày {0}–{1}', { 0: branch.startDay, 1: branch.endDay })}
                            </Badge>
                          )}
                          {branch.totalCount > 0 && (
                            <span
                              className={cx(
                                'text-[11px] font-semibold tabular-nums',
                                branch.status === 'completed' ? 'text-rp-success' : 'text-rp-text-muted',
                              )}
                            >
                              {branch.completedCount}/{branch.totalCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-bold leading-snug text-rp-text">
                          {branch.title}
                        </p>
                        {branch.focus && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-rp-text-2">
                            {branch.focus}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        aria-hidden="true"
                        className={cx(
                          'mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong transition-transform duration-200',
                          !isCollapsed && 'rotate-180',
                        )}
                      />
                    </button>
                  </div>

                  {/* Child Day & Lesson Branches hanging cleanly under the Checkpoint Node */}
                  {branch.days.length > 0 && (
                    <Collapsible open={!isCollapsed} id={`ai-branch-${branch.id}`} className="ml-[19px]">
                      <ul className={cx('space-y-2.5 border-l-2 pt-3', stemCls)}>
                        {renderedDays.map((dayItem) => (
                          <DayBranchNode
                            key={dayItem.day}
                            dayItem={dayItem}
                            stemColorClass={stemCls}
                            isDraftPreview={isDraftPreview}
                            onStartDay={onStartDay}
                            onCompleteDay={onCompleteDay}
                            startDayMutation={startDayMutation}
                            completeDayMutation={completeDayMutation}
                            tr={tr}
                            trf={trf}
                          />
                        ))}

                        {hiddenCount > 0 && !showAllDays && (
                          <li className="relative pl-4 pt-0.5">
                            <span aria-hidden="true" className={cx('absolute left-0 top-4 h-[2px] w-4', spineSegmentClass(branch.status))} />
                            <button
                              type="button"
                              onClick={() => toggleAllDaysInBranch(branch.id)}
                              className="rp-focus rp-press inline-flex items-center gap-1 rounded-rp-input border border-rp-brand-border/70 bg-white px-3 py-1.5 text-xs font-semibold text-rp-brand-strong shadow-rp-xs hover:bg-rp-brand-tint"
                            >
                              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                              {trf('+{0} ngày khác', { 0: hiddenCount })}
                            </button>
                          </li>
                        )}

                        {showAllDays && branch.days.length > 3 && !expandedAll && (
                          <li className="relative pl-4 pt-0.5">
                            <span aria-hidden="true" className={cx('absolute left-0 top-4 h-[2px] w-4', spineSegmentClass(branch.status))} />
                            <button
                              type="button"
                              onClick={() => toggleAllDaysInBranch(branch.id)}
                              className="rp-focus rp-press inline-flex items-center gap-1 rounded-rp-input border border-rp-line bg-white px-3 py-1.5 text-xs font-semibold text-rp-text-2 hover:border-rp-brand-border hover:text-rp-brand-strong"
                            >
                              {tr('Thu gọn bớt')}
                            </button>
                          </li>
                        )}
                      </ul>
                    </Collapsible>
                  )}
                </div>
              </li>
            );
          })}

          {/* 3. GOAL / MILESTONE CHECKPOINT NODE (RIGHT) */}
          <li className="w-[232px] shrink-0 snap-start">
            <div className="flex items-center">
              <span
                aria-hidden="true"
                className={cx(
                  'h-[2px] w-5 shrink-0',
                  model.goal.isCompleted ? 'bg-rp-success-line' : 'bg-[#EAD7E0]',
                )}
              />
              <span
                aria-hidden="true"
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-rp-xs',
                  model.goal.isCompleted
                    ? 'border-rp-success bg-rp-success text-white ring-4 ring-rp-success-bg'
                    : 'border-rp-brand-border bg-white text-rp-brand-strong',
                )}
              >
                <Trophy className="h-4 w-4" />
              </span>
            </div>

            <div
              className={cx(
                'mt-3 rounded-rp-card border bg-white p-3.5 shadow-rp-xs',
                model.goal.isCompleted ? 'border-rp-success-line' : 'border-rp-line',
              )}
            >
              <Badge tone={model.goal.isCompleted ? 'success' : 'brand'} size="sm" icon={false}>
                {model.goal.isCompleted ? tr('Hoàn thành tất cả chặng') : tr('Đích mục tiêu')}
              </Badge>
              <p className="mt-2 text-sm font-bold text-rp-text">
                {model.goal.levelCode ? `JLPT ${model.goal.levelCode}` : tr('Về đích lộ trình')}
              </p>
              <p className="mt-1 text-xs leading-5 text-rp-text-2">
                {trf('{0}/{1} ngày', { 0: model.goal.completedDays, 1: model.goal.totalDays })} · {model.goal.progressPercent}%
              </p>
              <div className="mt-3">
                <Button
                  as={Link}
                  to="/mock-tests/"
                  variant={model.goal.isCompleted ? 'primary' : 'secondary'}
                  size="sm"
                  iconRight={ArrowRight}
                  className="w-full"
                >
                  {tr('Làm đề thi thử JLPT')}
                </Button>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
