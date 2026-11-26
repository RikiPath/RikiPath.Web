import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarCheck2, ClipboardCheck, Layers, Target, Trophy } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import CelebrationDialog from '@/features/learning-moments/CelebrationDialog.jsx';
import PremiumUnlockDialog from '@/features/learning-moments/PremiumUnlockDialog.jsx';
import { JourneyHero } from '@/features/learning-moments/MomentHeroes.jsx';
import { CELEBRATION_KIND, acquireCelebration } from '@/features/learning-moments/celebrationGate.js';
import { claimLearningMoment } from '@/features/learning-moments/learningMomentsApi.js';
import { lessonPlayerPath, stageDetailPath } from '../lessonNavigation.js';

const pct = (value) => `${Math.round(Number(value) || 0)}%`;

/**
 * One dialog per roadmap milestone, driven only by the server's `progression` (computed after the attempt was
 * saved). Milestones are transitions (first pass), so a refresh, a refetch or a retake never shows them again.
 *   NOT_PASSED                → "Cùng củng cố kiến thức nhé!" (no celebration effects)
 *   LESSON_COMPLETED          → "Hoàn thành bài học!" (check reveal)
 *   STAGE_CHECKPOINT_UNLOCKED → "Sẵn sàng chinh phục chặng này!" (last lesson done + stage check opened, one popup)
 *   STAGE_COMPLETED           → "Chinh phục chặng N!" (Premium Unlock: next stage opens)
 *   ROADMAP_COMPLETED         → "Bạn đã hoàn thành lộ trình JLPT X!" (journey + light confetti)
 * Reuses the Learning Moments dialogs and the shared celebration gate (one modal at a time). When the server
 * names a Learning Moment for the same event, it is claimed here so the Dashboard does not replay it.
 */
export default function RoadmapMilestoneDialog({ milestone, onClose, onReview, onRetry }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const releaseRef = useRef(null);
  const progression = milestone?.progression ?? null;
  const kind = progression?.milestone ?? null;
  const open = Boolean(kind && kind !== 'NONE');

  useEffect(() => {
    if (!open) return undefined;
    releaseRef.current = acquireCelebration(CELEBRATION_KIND.MOMENT, `roadmap:${kind}`);
    if (progression?.momentOccurrenceKey) {
      // Exactly-once across tabs/devices: the in-page popup is the presentation of this moment.
      claimLearningMoment(progression.momentOccurrenceKey).catch(() => {});
    }
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, [open, kind, progression?.momentOccurrenceKey]);

  if (!open) return null;

  const close = () => onClose?.();
  const go = (to) => {
    onClose?.();
    navigate(to);
  };
  const stageKeyValue = progression.stageId;
  const toRoadmap = () => go(stageKeyValue != null ? stageDetailPath(stageKeyValue) : '/roadmap/');

  if (kind === 'NOT_PASSED') {
    const chips = [
      { label: trf('Điểm của bạn: {0}', { 0: pct(milestone.scorePercent) }), icon: ClipboardCheck },
      milestone.passingScorePercent != null ? { label: trf('Cần đạt: {0}', { 0: pct(milestone.passingScorePercent) }), icon: Target } : null,
    ].filter(Boolean);
    return (
      <CelebrationDialog
        open
        accent="amber"
        visual="book"
        animation="badge-pop"
        eyebrow={tr('Kiểm tra nhanh')}
        title={tr('Cùng củng cố kiến thức nhé!')}
        description={tr('Bạn đã hoàn thành bài kiểm tra. Hãy ôn lại một số nội dung để sẵn sàng cho bài học tiếp theo.')}
        chips={chips}
        ctaLabel={tr('Ôn lại bài học')}
        onCta={() => { close(); onReview?.(); }}
        extraAction={onRetry ? { label: tr('Làm lại bài kiểm tra'), onClick: () => { close(); onRetry(); } } : null}
        secondaryLabel={tr('Về lộ trình')}
        onSecondary={toRoadmap}
        onClose={close}
      />
    );
  }

  if (kind === 'LESSON_COMPLETED') {
    const chips = [
      progression.lessonTitle ? { label: tr(progression.lessonTitle), icon: BookOpen } : null,
      milestone.scorePercent != null ? { label: trf('Kiểm tra nhanh: {0}', { 0: pct(milestone.scorePercent) }), icon: ClipboardCheck } : null,
      { label: trf('Tiến độ chặng: {0}/{1}', { 0: progression.stageCompletedLessons, 1: progression.stageTotalLessons }), icon: Layers },
      progression.nextLessonTitle ? { label: trf('Bài tiếp theo: {0}', { 0: tr(progression.nextLessonTitle) }), icon: CalendarCheck2 } : null,
    ].filter(Boolean);
    const next = progression.nextLessonId;
    return (
      <CelebrationDialog
        open
        accent="emerald"
        visual="success"
        animation="success-reveal"
        eyebrow={tr('Bài học')}
        title={tr('Hoàn thành bài học!')}
        description={tr('Bạn đã tiến thêm một bước trên hành trình chinh phục JLPT.')}
        chips={chips}
        ctaLabel={next ? tr('Học bài tiếp theo') : tr('Về lộ trình')}
        onCta={() => (next ? go(lessonPlayerPath(next, { from: 'roadmap', stageId: stageKeyValue })) : toRoadmap())}
        secondaryLabel={next ? tr('Về lộ trình') : tr('Để sau')}
        onSecondary={next ? toRoadmap : close}
        onClose={close}
      />
    );
  }

  if (kind === 'STAGE_CHECKPOINT_UNLOCKED') {
    const chips = [
      { label: trf('{0}/{1} bài hoàn thành', { 0: progression.stageCompletedLessons, 1: progression.stageTotalLessons }), icon: Layers },
      progression.checkpointTitle ? { label: tr(progression.checkpointTitle), icon: ClipboardCheck } : null,
      { label: tr('Đã mở khóa'), icon: Target },
    ].filter(Boolean);
    return (
      <CelebrationDialog
        open
        accent="sakura"
        visual="unlock"
        animation="badge-pop"
        eyebrow={progression.lessonId != null ? tr('Hoàn thành bài học') : tr('Kiểm tra cuối chặng')}
        title={tr('Sẵn sàng chinh phục chặng này!')}
        description={tr('Bạn đã hoàn thành các bài học cần thiết. Hãy kiểm tra lại kiến thức để tiến đến chặng tiếp theo.')}
        chips={chips}
        ctaLabel={tr('Kiểm tra cuối chặng')}
        onCta={() => go(stageDetailPath(stageKeyValue, { checkpoint: progression.checkpointExerciseId }))}
        onClose={close}
      />
    );
  }

  if (kind === 'STAGE_COMPLETED') {
    const chips = [
      { label: trf('{0}/{1} bài học', { 0: progression.stageCompletedLessons, 1: progression.stageTotalLessons }), icon: BookOpen },
      milestone.scorePercent != null ? { label: trf('Kiểm tra cuối chặng: {0}', { 0: pct(milestone.scorePercent) }), icon: ClipboardCheck } : null,
      { label: trf('Lộ trình: {0}/{1} chặng', { 0: progression.roadmapCompletedStages, 1: progression.roadmapTotalStages }), icon: Layers },
    ].filter(Boolean);
    const nextStage = progression.nextStageId != null
      ? [{ code: 'next-stage', name: trf('Chặng {0}: {1}', { 0: progression.nextStageNumber, 1: tr(progression.nextStageTitle) }), description: tr('Đã mở khóa'), category: 'roadmap', isNew: true }]
      : [];
    return (
      <PremiumUnlockDialog
        key={`stage-${progression.stageId}`}
        open
        variant="unlock"
        eyebrow={tr('Hoàn thành chặng')}
        planName={tr(progression.stageTitle)}
        title={trf('Chinh phục chặng {0}!', { 0: progression.stageNumber })}
        description={tr('Bạn đã hoàn thành một cột mốc quan trọng trong lộ trình học tập.')}
        chips={chips}
        benefits={nextStage}
        ctaLabel={progression.nextStageId != null ? tr('Khám phá chặng tiếp theo') : tr('Về lộ trình')}
        onCta={() => (progression.nextStageId != null ? go(stageDetailPath(progression.nextStageId)) : go('/roadmap/'))}
        secondaryLabel={progression.nextStageId != null ? tr('Về lộ trình') : tr('Để sau')}
        onSecondary={progression.nextStageId != null ? () => go('/roadmap/') : close}
        onClose={close}
      />
    );
  }

  // ROADMAP_COMPLETED — never claims an official JLPT result.
  const chips = [
    { label: trf('{0}/{1} chặng', { 0: progression.roadmapCompletedStages, 1: progression.roadmapTotalStages }), icon: Trophy },
    { label: trf('{0} bài học', { 0: progression.roadmapCompletedLessons }), icon: BookOpen },
  ];
  return (
    <CelebrationDialog
      open
      accent="gold"
      hero={<JourneyHero />}
      confetti
      eyebrow={tr('Hoàn thành lộ trình')}
      title={progression.targetLevelCode
        ? trf('Bạn đã hoàn thành lộ trình JLPT {0}!', { 0: progression.targetLevelCode })
        : tr('Bạn đã hoàn thành lộ trình học!')}
      description={tr('Bạn đã đi hết các chặng trong lộ trình. Hãy thi thử để kiểm tra mức độ sẵn sàng và tiếp tục ôn tập đều đặn.')}
      chips={chips}
      ctaLabel={tr('Thi thử JLPT')}
      onCta={() => go('/mock-tests/')}
      extraAction={{ label: tr('Xem tổng kết'), onClick: () => go('/roadmap/') }}
      secondaryLabel={tr('Tiếp tục ôn tập')}
      onSecondary={() => go('/daily-srs/')}
      onClose={close}
    />
  );
}
