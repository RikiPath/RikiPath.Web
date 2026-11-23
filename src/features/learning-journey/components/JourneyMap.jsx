import { Link } from 'react-router-dom';
import { ArrowRight, Award, Check, Clock, Flag, Lock, MapPin, RotateCcw } from 'lucide-react';
import { Badge, ProgressBar, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { STAGE_STATE, STAGE_STATE_META } from '../journeyModel.js';
import { FujiGlyph, SakuraPetal, ToriiGlyph } from './JourneyArt.jsx';

const NODE_STYLE = {
  [STAGE_STATE.COMPLETED]: 'border-rp-success bg-rp-success text-white',
  [STAGE_STATE.NEEDS_REVIEW]: 'border-rp-warning-line bg-rp-warning-bg text-rp-warning',
  [STAGE_STATE.LOCKED]: 'border-rp-line bg-white text-rp-text-muted',
  [STAGE_STATE.IN_PROGRESS]: 'border-rp-brand-pressed bg-rp-brand-pressed text-white',
  [STAGE_STATE.READY]: 'border-rp-brand-border bg-white text-rp-brand-strong',
};

function StageNode({ state, index, current }) {
  const icon = state === STAGE_STATE.COMPLETED
    ? <Check className="h-5 w-5" strokeWidth={2.6} />
    : state === STAGE_STATE.LOCKED
      ? <Lock className="h-4 w-4" />
      : state === STAGE_STATE.NEEDS_REVIEW
        ? <RotateCcw className="h-4 w-4" />
        : <span className="text-sm font-bold tabular-nums">{index + 1}</span>;
  return (
    <span className="relative flex h-11 w-11 items-center justify-center" aria-hidden="true">
      {current && (
        <span className="absolute inset-0 rounded-full bg-rp-brand/25 motion-safe:animate-ping" />
      )}
      <span
        className={cx(
          'relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-rp-xs',
          NODE_STYLE[state] ?? NODE_STYLE[STAGE_STATE.READY],
          current && 'ring-4 ring-rp-brand-tint',
        )}
      >
        {icon}
      </span>
    </span>
  );
}

function StageCardBody({ stage, current }) {
  const { tr, trf } = useLocale();
  const meta = STAGE_STATE_META[stage.state] ?? STAGE_STATE_META[STAGE_STATE.READY];
  const progressLabel = stage.unit === 'day'
    ? trf('{0}/{1} ngày hoàn thành', { 0: stage.completed, 1: stage.total })
    : trf('{0}/{1} bài hoàn thành', { 0: stage.completed, 1: stage.total });

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {stage.levelCode && (
          <Badge tone={stage.isBridge ? 'warning' : 'brand'} size="sm" icon={false}>
            {stage.isBridge ? trf('Bổ trợ {0}', { 0: stage.levelCode }) : `JLPT ${stage.levelCode}`}
          </Badge>
        )}
        <Badge
          tone={meta.tone}
          size="sm"
          icon={stage.state === STAGE_STATE.LOCKED ? Lock : stage.state === STAGE_STATE.COMPLETED ? Check : false}
        >
          {tr(meta.label)}
        </Badge>
        {current && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rp-brand-strong">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {tr('Bạn đang ở đây')}
          </span>
        )}
      </div>

      <h3 className="mt-2 text-[15px] font-bold leading-snug text-rp-text">{tr(stage.title)}</h3>
      {stage.objective && (
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-rp-text-2" title={stage.objective}>
          {tr(stage.objective)}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="font-semibold text-rp-text-2">{progressLabel}</span>
          <span className="flex flex-wrap items-center gap-2 text-rp-text-muted">
            {stage.minutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {trf('~{0} phút', { 0: stage.minutes })}
              </span>
            )}
            {stage.checkpoint && (
              <span className={cx('inline-flex items-center gap-1', stage.checkpoint.passed && 'text-rp-success')}>
                <Award className="h-3 w-3" aria-hidden="true" />
                {stage.checkpoint.passed ? tr('Đã đạt kiểm tra chặng') : tr('Có kiểm tra cuối chặng')}
              </span>
            )}
          </span>
        </div>
        <ProgressBar
          value={stage.completed}
          max={stage.total || 1}
          size="sm"
          tone={stage.state === STAGE_STATE.COMPLETED ? 'success' : 'brand'}
          label={progressLabel}
        />
      </div>

      <span
        className={cx(
          'mt-3 inline-flex items-center gap-1 text-[13px] font-semibold',
          current ? 'text-rp-brand-strong' : 'text-rp-text-2',
        )}
      >
        {tr(stage.ctaLabel || meta.cta)}
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[var(--rp-dur-standard)] group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </>
  );
}

/**
 * Learning Journey Map — one node per Backend stage (or AI phase), from "Bắt đầu" to the JLPT goal.
 * Desktop alternates cards around a soft trail; mobile becomes a vertical timeline.
 * Only stage summaries are shown here; lessons live in Stage Detail.
 */
export default function JourneyMap({ stages = [], currentKey, goalLabel, goalReached = false, className }) {
  const { tr } = useLocale();
  if (stages.length === 0) return null;

  return (
    <div className={cx('relative', className)}>
      <ol className="relative space-y-5 md:space-y-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-[21px] top-4 border-l-2 border-dashed border-rp-brand-border/80 md:left-1/2 md:-translate-x-1/2"
        />

        <li className="relative grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-x-4">
          <span className="relative z-10 col-start-1 row-start-1 flex h-9 w-9 items-center justify-center justify-self-center rounded-full border border-rp-line bg-white text-rp-text-2 shadow-rp-xs md:col-start-2">
            <Flag className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="col-start-2 row-start-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-rp-text-muted md:col-start-3">
            {tr('Bắt đầu')}
          </span>
        </li>

        {stages.map((stage, index) => {
          const current = stage.key === currentKey;
          const cardSide = index % 2 === 0 ? 'md:col-start-1 md:flex md:justify-end' : 'md:col-start-3 md:flex md:justify-start';
          const cardClass = cx(
            'group rp-focus block w-full rounded-rp-card border bg-white p-4 text-left shadow-rp-xs md:max-w-[440px]',
            'transition-[transform,box-shadow,border-color] duration-[var(--rp-dur-standard)] ease-[var(--rp-ease)]',
            'hover:-translate-y-0.5 hover:shadow-rp-card motion-reduce:hover:translate-y-0',
            current
              ? 'border-rp-brand-border ring-1 ring-rp-brand-tint'
              : stage.state === STAGE_STATE.COMPLETED
                ? 'border-rp-success-line'
                : 'border-rp-line hover:border-rp-brand-border',
          );
          const body = <StageCardBody stage={stage} current={current} />;
          return (
            <li
              key={stage.key}
              aria-current={current ? 'step' : undefined}
              className="relative grid grid-cols-[44px_minmax(0,1fr)] items-start gap-x-3 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:items-center md:gap-x-4"
            >
              <span className="col-start-1 row-start-1 justify-self-center pt-2 md:col-start-2 md:pt-0">
                <StageNode state={stage.state} index={index} current={current} />
              </span>
              <div className={cx('col-start-2 row-start-1 w-full', cardSide)}>
                {stage.to ? (
                  <Link to={stage.to} className={cardClass}>{body}</Link>
                ) : (
                  <button type="button" onClick={stage.onSelect} className={cardClass}>{body}</button>
                )}
              </div>
            </li>
          );
        })}

        <li className="relative grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-x-4">
          <span
            className={cx(
              'relative z-10 col-start-1 row-start-1 flex h-11 w-11 items-center justify-center justify-self-center rounded-full border-2 shadow-rp-xs md:col-start-2',
              goalReached ? 'border-rp-success bg-rp-success-bg text-rp-success' : 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong',
            )}
            aria-hidden="true"
          >
            <ToriiGlyph className="h-6 w-6" />
          </span>
          <div className="relative col-start-2 row-start-1 overflow-hidden rounded-rp-card border border-rp-brand-border/70 bg-white px-4 py-3 md:col-start-3 md:max-w-[440px]">
            <FujiGlyph className="pointer-events-none absolute -bottom-1 right-2 text-rp-brand-strong" />
            <SakuraPetal className="pointer-events-none absolute right-28 top-2 text-rp-brand/50" />
            <SakuraPetal className="pointer-events-none absolute right-20 top-5 h-2 w-2 rotate-45 text-rp-brand/40" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.12em] text-rp-brand-strong">
              {goalReached ? tr('Đã chạm mục tiêu') : tr('Đích đến')}
            </p>
            <p className="relative mt-0.5 text-[15px] font-bold text-rp-text">{goalLabel || tr('Mục tiêu JLPT')}</p>
          </div>
        </li>
      </ol>
    </div>
  );
}
