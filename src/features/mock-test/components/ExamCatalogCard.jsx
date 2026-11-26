import { ChevronRight, Clock, FileText, Info, LockKeyhole, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, IconButton, Skeleton, Tooltip, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  formatExamCardTitle,
  resolveCompactCardMetric,
  resolvePracticeSkillGroup,
  resolveStatusMeta,
} from '../utils/practiceStatusHelpers.js';

/**
 * Shared Compact 5-Row Catalog Card for both Practice Sets (`/practice-sets/`) and JLPT Mock Tests (`/mock-tests/`).
 * Eliminates variable-height Result Summary Boxes so all cards in a row stay cleanly aligned:
 *   Row 1: Level + Skill/Type Category badge | Status badge (flush right)
 *   Row 2: Compact Title (max 2 lines)
 *   Row 3: Compact Description (max 2 lines)
 *   Row 4: Metadata (`{N} câu · {M} phút` left | `{score}/10 điểm` or `{answered}/{total} câu` flush right)
 *   Row 5: Uniform single-row Footer (secondary + primary CTA, pinned via `mt-auto`)
 */
export default function ExamCatalogCard({
  item,
  variant = 'practice', // 'practice' | 'mock'
  pending = false,
  onViewInfo,
  onPrimaryAction,
  onViewResult,
  onRequestRestart,
}) {
  const { tr, trf } = useLocale();
  if (!item) return null;

  const statusUpper = String(item.userStatus || '').toUpperCase();
  const statusMeta = resolveStatusMeta(statusUpper, tr);
  const isInProgress = statusUpper === 'IN_PROGRESS' && Boolean(item.activeAttemptId);
  const isGrading = statusUpper === 'GRADING';
  const hasCompletedResult = (statusUpper === 'COMPLETED' || statusUpper === 'EXPIRED') && Boolean(item.latestCompletedAttemptId);
  const isUnavailable = statusUpper === 'UNAVAILABLE' || (item.canStart === false && !isInProgress && !hasCompletedResult);

  const fullTitle = tr(item.title);
  const displayTitle = formatExamCardTitle(fullTitle, variant);

  const skillGroup = variant === 'practice' ? resolvePracticeSkillGroup(item) : null;
  const categoryBadge = variant === 'practice'
    ? {
        label: skillGroup?.key === 'mixed' ? tr('Tổng hợp') : tr(skillGroup?.label || 'Luyện tập'),
        tone: skillGroup?.key === 'mixed' ? 'warning' : 'info',
      }
    : {
        label: (item.sections?.length ?? 0) > 0
          ? trf('{0} phần thi', { 0: item.sections.length })
          : tr('Đề thi chuẩn'),
        tone: 'neutral',
      };

  const inlineMetric = resolveCompactCardMetric(item, variant, { tr, trf });
  const durationText = item.timeLimitMinutes > 0
    ? trf('{0} phút', { 0: item.timeLimitMinutes })
    : tr('Linh hoạt');

  return (
    <Card
      data-testid={variant === 'mock' ? `mock-card-${item.mockTestId}` : `practice-card-${item.mockTestId}`}
      className="rp-exam-card flex h-full min-w-0 flex-col p-4"
    >
      {/* Row 1: Classification + Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {item.jlptLevelName && (
            <Badge tone="brand" size="sm" icon={false} className="whitespace-nowrap">
              {item.jlptLevelName}
            </Badge>
          )}
          <Badge tone={categoryBadge.tone} size="sm" icon={false} className="whitespace-nowrap">
            {categoryBadge.label}
          </Badge>
        </div>
        <Badge tone={statusMeta.tone} size="sm" icon={false} className="shrink-0 whitespace-nowrap">
          {statusMeta.label}
        </Badge>
      </div>

      {/* Rows 2-4: Title + Description + Unified Metadata & Inline Score */}
      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        <h3
          title={fullTitle}
          className="line-clamp-2 min-h-[2.625rem] text-[15px] font-bold leading-snug text-rp-text"
        >
          {displayTitle}
        </h3>

        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-rp-text-2">
          {item.description ? tr(item.description) : '\u00A0'}
        </p>

        {isUnavailable && item.unavailableReason && (
          <p className="mt-2 inline-flex items-center gap-1.5 truncate text-xs text-rose-700">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tr(item.unavailableReason)}</span>
          </p>
        )}

        {/* Row 4: Metadata (`{N} câu · {M} phút` left | inline score/progress right-aligned) */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3 text-xs font-medium text-rp-text-muted">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
              <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-2" />
              <span>{trf('{0} câu', { 0: item.questionCount ?? 0 })}</span>
            </span>
            <span aria-hidden="true" className="text-rp-text-disabled">·</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-2" />
              <span>{durationText}</span>
            </span>
          </div>

          {inlineMetric && (
            <Tooltip content={inlineMetric.tooltip}>
              <span
                data-testid="exam-card-inline-metric"
                className={cx(
                  'ml-auto inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap tabular-nums',
                  inlineMetric.colorClass,
                )}
              >
                <span className="text-[14px] font-extrabold leading-none">{inlineMetric.valueText}</span>
                {inlineMetric.unitText && (
                  <span className="text-[11.5px] font-semibold leading-none">{inlineMetric.unitText}</span>
                )}
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Row 5: Uniform Single-Row Footer */}
      <div className="mt-3 flex items-center gap-2 border-t border-rp-line/70 pt-3">
        {hasCompletedResult && !isInProgress ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewResult?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Xem kết quả')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={RotateCcw}
              disabled={isUnavailable || pending}
              onClick={() => onPrimaryAction?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Làm lại')}
            </Button>
            {onViewInfo && (
              <IconButton
                size="sm"
                variant="ghost"
                icon={Info}
                label={tr('Xem thông tin')}
                onClick={() => onViewInfo(item)}
              />
            )}
          </>
        ) : isInProgress ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Info}
              onClick={() => onViewInfo?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Xem thông tin')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              iconRight={ChevronRight}
              disabled={pending}
              onClick={() => onPrimaryAction?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Làm tiếp')}
            </Button>
            {variant === 'practice' && item.canRestart && onRequestRestart && (
              <IconButton
                size="sm"
                variant="ghost"
                icon={RotateCcw}
                label={tr('Bắt đầu mới')}
                onClick={() => onRequestRestart(item)}
              />
            )}
          </>
        ) : isGrading ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Info}
              onClick={() => onViewInfo?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Xem thông tin')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled
              className="flex-1 whitespace-nowrap"
            >
              {tr('Đang chấm')}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Info}
              onClick={() => onViewInfo?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Xem thông tin')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              iconRight={ChevronRight}
              disabled={isUnavailable || pending}
              onClick={() => onPrimaryAction?.(item)}
              className="flex-1 whitespace-nowrap"
            >
              {tr('Làm bài')}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export function ExamCatalogCardSkeleton() {
  return (
    <Card className="flex h-full min-w-0 flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <Skeleton className="h-5 w-11/12 rounded-lg" />
        <Skeleton className="mt-1.5 h-5 w-2/3 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-full rounded-lg" />
        <Skeleton className="mt-1 h-4 w-4/5 rounded-lg" />
        <div className="mt-auto flex items-center justify-between pt-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-rp-line/70 pt-3">
        <Skeleton className="h-9 flex-1 rounded-rp-input" />
        <Skeleton className="h-9 flex-1 rounded-rp-input" />
      </div>
    </Card>
  );
}
