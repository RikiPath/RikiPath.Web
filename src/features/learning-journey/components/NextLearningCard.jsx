import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, Clock, History, Sparkles } from 'lucide-react';
import { Badge, Button, ProgressBar, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { skillNameLabel } from '../journeyModel.js';

/**
 * "Hôm nay nên học gì?" — the single next step recommended by the Backend, the current stage progress
 * and real SRS due cards (hidden when there are none). No synthetic numbers.
 */
export default function NextLearningCard({
  nextStep,
  stageTitle,
  stageProgress,
  srsDueCount = 0,
  reason,
  requiresPlan = false,
  className,
}) {
  const { tr, trf } = useLocale();
  const dueCount = Number(srsDueCount) || 0;

  return (
    <section
      aria-labelledby="journey-next-title"
      className={cx('rounded-rp-card border border-rp-brand-border/80 bg-white p-4 shadow-rp-xs', className)}
    >
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rp-brand-strong">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {tr('Bước tiếp theo')}
      </p>
      <h2 id="journey-next-title" className="mt-1 text-[16px] font-bold text-rp-text">{tr('Hôm nay nên học gì?')}</h2>

      {nextStep ? (
        <div className="mt-3 rounded-xl border border-rp-line bg-rp-bg-2 p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rp-brand-tint text-rp-brand-strong">
              {nextStep.kind === 'checkpoint' ? <Award className="h-4 w-4" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-snug text-rp-text">{tr(nextStep.title)}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-rp-text-muted">
                {nextStep.skillName && <span>{tr(skillNameLabel(nextStep.skillName))}</span>}
                {nextStep.minutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {trf('{0} phút', { 0: nextStep.minutes })}
                  </span>
                )}
                {nextStep.questionCount > 0 && <span>{trf('{0} câu hỏi', { 0: nextStep.questionCount })}</span>}
              </p>
            </div>
          </div>
          {reason && <p className="mt-2 text-[12px] leading-5 text-rp-text-2">{tr(reason)}</p>}
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-6 text-rp-text-2">
          {tr('Bạn đã hoàn thành các bài đang mở. Hãy xem lại chặng hoặc ôn tập để củng cố kiến thức.')}
        </p>
      )}

      {stageTitle && stageProgress && stageProgress.total > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="min-w-0 truncate font-medium text-rp-text-2" title={stageTitle}>{tr(stageTitle)}</span>
            <span className="shrink-0 tabular-nums text-rp-text-muted">
              {trf('{0}/{1} bài', { 0: stageProgress.completed, 1: stageProgress.total })}
            </span>
          </div>
          <ProgressBar value={stageProgress.completed} max={stageProgress.total} size="sm" label={tr('Tiến độ chặng')} />
        </div>
      )}

      {dueCount > 0 && (
        <Link
          to="/daily-srs/due/"
          className="rp-focus mt-3 flex items-center justify-between gap-2 rounded-xl border border-rp-line px-3 py-2 text-[12.5px] hover:border-rp-brand-border hover:bg-rp-brand-tint"
        >
          <span className="inline-flex items-center gap-2 text-rp-text-2">
            <History className="h-4 w-4 text-rp-brand-strong" aria-hidden="true" />
            {tr('Ôn tập SRS')}
          </span>
          <Badge tone="brand" size="sm" icon={false}>{trf('{0} thẻ đến hạn', { 0: dueCount })}</Badge>
        </Link>
      )}

      <div className="mt-4">
        {requiresPlan ? (
          <Button as={Link} to="/plans/" variant="primary" size="md" className="w-full">
            {tr('Mua gói ngay')}
          </Button>
        ) : nextStep?.to ? (
          <Button as={Link} to={nextStep.to} variant="primary" size="md" className="w-full" iconRight={ArrowRight}>
            {tr(nextStep.ctaLabel || 'Tiếp tục học')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
