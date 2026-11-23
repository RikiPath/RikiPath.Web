import { Link } from 'react-router-dom';
import { ArrowRight, Award, Check, Clock, Lock, RotateCcw } from 'lucide-react';
import { Badge, Button, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  formatCheckpointScopeLabel,
  formatLessonCompletionState,
} from '@/features/learning-path/adaptiveRoadmapModel.js';
import { checkpointId, lessonLockReason, skillNameLabel } from '../journeyModel.js';

function lessonCta(lesson, current) {
  const state = formatLessonCompletionState(lesson);
  if (state.code === 'COMPLETED') return { label: 'Xem lại', step: null, variant: 'secondary' };
  if (state.code === 'STUDIED_PENDING_QUIZ' || state.code === 'NEEDS_REVIEW') {
    return { label: 'Làm kiểm tra nhanh', step: 'practice', variant: current ? 'primary' : 'soft' };
  }
  if (lesson.completionState === 'Viewed' || lesson.completionState === 'Studied') {
    return { label: 'Tiếp tục học', step: null, variant: current ? 'primary' : 'soft' };
  }
  return { label: 'Bắt đầu học', step: null, variant: current ? 'primary' : 'soft' };
}

function TimelineNode({ tone, children }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white text-[13px] font-bold',
        tone,
      )}
    >
      {children}
    </span>
  );
}

function LessonRow({ lesson, index, current, stages, requiresPlan, buildLessonHref }) {
  const { tr, trf } = useLocale();
  const state = formatLessonCompletionState(lesson, false);
  const locked = Boolean(lesson.isLocked);
  const completed = state.code === 'COMPLETED';
  const lock = lessonLockReason(stages, lesson);
  const cta = lessonCta(lesson, current);
  const nodeTone = completed
    ? 'border-rp-success bg-rp-success text-white'
    : locked
      ? 'border-rp-line text-rp-text-muted'
      : state.code === 'NEEDS_REVIEW'
        ? 'border-rp-warning-line bg-rp-warning-bg text-rp-warning'
        : current
          ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white ring-4 ring-rp-brand-tint'
          : 'border-rp-brand-border text-rp-brand-strong';

  return (
    <li
      id={`stage-lesson-${lesson.lessonId}`}
      aria-current={current ? 'step' : undefined}
      className="relative grid scroll-mt-6 grid-cols-[36px_minmax(0,1fr)] gap-x-3"
    >
      <span className="pt-3">
        <TimelineNode tone={nodeTone}>
          {completed ? <Check className="h-4 w-4" strokeWidth={2.6} />
            : locked ? <Lock className="h-3.5 w-3.5" />
              : state.code === 'NEEDS_REVIEW' ? <RotateCcw className="h-3.5 w-3.5" />
                : index + 1}
        </TimelineNode>
      </span>
      <div
        className={cx(
          'flex flex-wrap items-center gap-3 rounded-rp-card border bg-white px-4 py-3',
          current ? 'border-rp-brand-border shadow-rp-xs' : completed ? 'border-rp-success-line/80' : 'border-rp-line',
          locked && 'bg-rp-bg-2',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-rp-text-muted">{trf('Bài {0}', { 0: index + 1 })}</p>
          <h3 className="mt-0.5 text-[14.5px] font-bold leading-snug text-rp-text">{tr(lesson.title)}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-rp-text-muted">
            {lesson.languageSkillName && <span>{tr(skillNameLabel(lesson.languageSkillName))}</span>}
            {lesson.estimatedMinutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {trf('{0} phút', { 0: lesson.estimatedMinutes })}
              </span>
            )}
            {lesson.bestPracticeScore != null && (
              <span>{trf('Điểm kiểm tra nhanh cao nhất: {0}%', { 0: Math.round(lesson.bestPracticeScore) })}</span>
            )}
          </p>
          {locked && lock && (
            <p className="mt-1.5 text-[12px] text-rp-text-2">
              {lock.value ? trf(lock.template, { 0: tr(lock.value) }) : tr(lock.template)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {current && !locked && !completed && <Badge tone="brand" size="sm" icon={false}>{tr('Bài tiếp theo')}</Badge>}
          {lesson.isRemediation && <Badge tone="warning" size="sm" icon={false}>{tr('Bổ trợ')}</Badge>}
          <Badge tone={locked ? 'neutral' : state.tone} size="sm" icon={locked ? Lock : completed ? Check : false}>
            {tr(state.label)}
          </Badge>
          {!locked && (
            requiresPlan ? (
              <Button as={Link} to="/plans/" variant="secondary" size="sm">{tr('Cần gói tự học')}</Button>
            ) : (
              <Button as={Link} to={buildLessonHref(lesson, cta.step)} variant={cta.variant} size="sm" iconRight={cta.variant === 'primary' ? ArrowRight : undefined}>
                {tr(cta.label)}
              </Button>
            )
          )}
        </div>
      </div>
    </li>
  );
}

function CheckpointRow({ checkpoint, requiresPlan, onOpen }) {
  const { tr, trf } = useLocale();
  const locked = checkpoint.isUnlocked === false;
  const passed = Boolean(checkpoint.isPassed);
  const needsReview = checkpoint.status === 'NeedsReview';
  return (
    <li className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-x-3">
      <span className="flex justify-center pt-3.5" aria-hidden="true">
        <span
          className={cx(
            'relative z-10 flex h-8 w-8 rotate-45 items-center justify-center rounded-md border-2',
            passed ? 'border-rp-success bg-rp-success text-white'
              : locked ? 'border-rp-line bg-white text-rp-text-muted'
                : 'border-rp-brand-pressed bg-rp-brand-tint text-rp-brand-strong',
          )}
        >
          <span className="-rotate-45">{passed ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : <Award className="h-4 w-4" />}</span>
        </span>
      </span>
      <div
        className={cx(
          'flex flex-wrap items-center gap-3 rounded-rp-card border px-4 py-3',
          passed ? 'border-rp-success-line bg-rp-success-bg/40' : locked ? 'border-rp-line bg-rp-bg-2' : 'border-rp-brand-border bg-rp-brand-tint/40',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-rp-brand-strong">{tr(formatCheckpointScopeLabel(checkpoint.scope))}</p>
          <h3 className="mt-0.5 text-[14.5px] font-bold text-rp-text">{tr(checkpoint.title)}</h3>
          <p className="mt-1 flex flex-wrap gap-x-2 text-[12px] text-rp-text-muted">
            {checkpoint.questionCount > 0 && <span>{trf('{0} câu hỏi', { 0: checkpoint.questionCount })}</span>}
            {checkpoint.passingScorePercent != null && <span>{trf('Điểm đạt {0}%', { 0: checkpoint.passingScorePercent })}</span>}
            {checkpoint.bestScorePercent != null && <span>{trf('Điểm cao nhất: {0}%', { 0: Math.round(checkpoint.bestScorePercent) })}</span>}
          </p>
          {locked && (
            <p className="mt-1.5 text-[12px] text-rp-text-2">
              {tr(checkpoint.lockReason || 'Hoàn thành các bài cần thiết để mở bài kiểm tra cuối chặng.')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={passed ? 'success' : locked ? 'neutral' : needsReview ? 'warning' : 'brand'} size="sm" icon={locked ? Lock : false}>
            {passed ? tr('Đã đạt') : locked ? tr('Chưa mở khóa') : needsReview ? tr('Cần ôn lại') : tr('Sẵn sàng')}
          </Badge>
          {!locked && (
            requiresPlan ? (
              <Button as={Link} to="/plans/" variant="secondary" size="sm">{tr('Cần gói tự học')}</Button>
            ) : (
              <Button variant={passed ? 'secondary' : 'primary'} size="sm" onClick={() => onOpen(checkpoint)}>
                {passed ? tr('Làm lại bài kiểm tra') : tr('Bắt đầu kiểm tra')}
              </Button>
            )
          )}
        </div>
      </div>
    </li>
  );
}

/** Ordered lessons of one stage, ending with its checkpoint(s). Lock state is exactly the Backend's. */
export default function LessonTimeline({
  lessons = [],
  checkpoints = [],
  currentLessonId,
  stages,
  requiresPlan,
  buildLessonHref,
  onOpenCheckpoint,
}) {
  return (
    <ol className="relative space-y-3">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-[17px] top-6 border-l-2 border-dashed border-rp-brand-border/70"
      />
      {lessons.map((lesson, index) => (
        <LessonRow
          key={lesson.lessonId}
          lesson={lesson}
          index={index}
          current={Number(lesson.lessonId) === Number(currentLessonId)}
          stages={stages}
          requiresPlan={requiresPlan}
          buildLessonHref={buildLessonHref}
        />
      ))}
      {checkpoints.map((checkpoint) => (
        <CheckpointRow
          key={checkpointId(checkpoint) ?? checkpoint.title}
          checkpoint={checkpoint}
          requiresPlan={requiresPlan}
          onOpen={onOpenCheckpoint}
        />
      ))}
    </ol>
  );
}
