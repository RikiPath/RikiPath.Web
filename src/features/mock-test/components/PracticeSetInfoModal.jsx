import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenText,
  ChevronDown,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Headphones,
  Image as ImageIcon,
  Languages,
  Layers,
  LockKeyhole,
  PlayCircle,
  Puzzle,
  Sparkles,
  SpellCheck,
} from 'lucide-react';
import { getPracticeSetPreview } from '@/features/mock-test/api/mockTestApi.js';
import {
  formatMockDateTime,
  formatScaleScore,
  formatScorePercent,
  resolvePracticeResultDisplay,
  resolvePracticeSkillGroup,
  resolveQuestionTypeLabel,
  resolveSkillLabel,
  resolveStatusMeta,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
import {
  Badge,
  Banner,
  Button,
  ContextualErrorState,
  Modal,
  ProgressBar,
  RichQuestionText,
  SakuraLoader,
  cx,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function ModalSkillGlyph({ item, className }) {
  if (item?.examKind === 'MixedPractice') return <Puzzle aria-hidden="true" className={className} />;
  if (item?.examKind === 'FullMockTest') return <FileCheck2 aria-hidden="true" className={className} />;
  const text = [...(Array.isArray(item?.includedSkills) ? item.includedSkills : []), item?.title || '']
    .join(' ')
    .toLowerCase();
  if (text.includes('kanji') || text.includes('hán tự')) return <SpellCheck aria-hidden="true" className={className} />;
  if (text.includes('listening') || text.includes('nghe')) return <Headphones aria-hidden="true" className={className} />;
  if (text.includes('reading') || text.includes('đọc')) return <BookOpenText aria-hidden="true" className={className} />;
  if (text.includes('grammar') || text.includes('ngữ pháp')) return <Layers aria-hidden="true" className={className} />;
  if (text.includes('vocab') || text.includes('từ vựng')) return <Languages aria-hidden="true" className={className} />;
  return <Clock aria-hidden="true" className={className} />;
}

export default function PracticeSetInfoModal({
  open,
  testId,
  initialSummary = null,
  onClose,
  onStartOrResume,
  onDownloadPdf,
  starting = false,
}) {
  const { tr, trf } = useLocale();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const previewQuery = useQuery({
    queryKey: ['practice-set-preview', testId],
    queryFn: () => getPracticeSetPreview(testId),
    enabled: Boolean(open && testId),
    retry: false,
  });

  const data = previewQuery.data || initialSummary || {};
  const sections = previewQuery.data?.sections || [];
  const statusMeta = resolveStatusMeta(data.userStatus, tr);
  const isInProgress = data.userStatus === 'IN_PROGRESS' && Boolean(data.activeAttemptId);
  const isUnavailable = data.userStatus === 'UNAVAILABLE' || data.canStart === false && !isInProgress;

  const mainSkillText =
    Array.isArray(data.includedSkills) && data.includedSkills.length > 0
      ? data.includedSkills.map((s) => resolveSkillLabel(s, tr)).join(', ')
      : tr(resolvePracticeSkillGroup(data).label);

  async function handlePdfClick() {
    if (!onDownloadPdf || !testId || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await onDownloadPdf(testId);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong">
            <ModalSkillGlyph item={data} className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 truncate">{data.title ? tr(data.title) : tr('Thông tin bộ đề luyện tập')}</span>
        </span>
      }
      titleBadge={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {data.jlptLevelName && (
            <Badge tone="brand" size="sm" icon={false}>{data.jlptLevelName}</Badge>
          )}
          <Badge tone={statusMeta.tone} size="sm" icon={false}>{statusMeta.label}</Badge>
        </span>
      }
      description={data.description ? tr(data.description) : undefined}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
          <div>
            {data.canDownloadPdf !== false && onDownloadPdf && (
              <Button
                type="button"
                variant="outline"
                size="md"
                icon={Download}
                loading={downloadingPdf}
                disabled={previewQuery.isPending}
                onClick={handlePdfClick}
              >
                {tr('Tải đề PDF')}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              {tr('Đóng')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={PlayCircle}
              loading={starting}
              disabled={isUnavailable || previewQuery.isError}
              onClick={() => onStartOrResume?.(previewQuery.data || data)}
            >
              {isInProgress ? tr('Làm tiếp') : tr('Bắt đầu luyện tập')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {data.unavailableReason && (
          <Banner tone="warning" title={tr('Trạng thái khả dụng')}>
            {tr(data.unavailableReason)}
          </Banner>
        )}

        {isInProgress && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/75 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-amber-900">
              <span>
                {trf('Đang làm dở · Đã trả lời {0}/{1} câu ({2}%)', {
                  0: data.activeAnsweredCount ?? 0,
                  1: data.activeTotalQuestions ?? data.questionCount ?? 0,
                  2: data.activeProgressPercent ?? 0,
                })}
              </span>
              {data.activeLastSavedAt && (
                <span className="font-normal text-amber-800">
                  {trf('Lưu gần nhất: {0}', { 0: formatMockDateTime(data.activeLastSavedAt) })}
                </span>
              )}
            </div>
            <div className="mt-2">
              <ProgressBar
                value={data.activeProgressPercent ?? 0}
                max={100}
                label={tr('Tiến độ bộ đề đang làm')}
              />
            </div>
          </div>
        )}

        {!isInProgress && (initialSummary?.latestScoring || initialSummary?.latestScore != null) && (() => {
          const display = resolvePracticeResultDisplay(
            {
              scoring: initialSummary.latestScoring,
              latestScore: initialSummary.latestScore,
              latestCorrectCount: initialSummary.latestCorrectCount,
              latestTotalQuestions: initialSummary.latestTotalQuestions ?? data.questionCount ?? 0,
            },
            tr,
          );
          return (
            <div className={cx('space-y-1.5 rounded-xl border px-3.5 py-2.5', display.classes.box)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cx('text-xs font-bold tabular-nums', display.classes.title)}>
                  {trf('Kết quả gần nhất: {0}/10 điểm', { 0: formatScaleScore(display.score10) })}
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone={display.classes.badgeTone} size="sm" icon={false}>{display.bandLabel}</Badge>
                  {initialSummary.latestSubmittedAt && (
                    <span className={cx('text-[11px]', display.classes.meta)}>
                      {formatMockDateTime(initialSummary.latestSubmittedAt, false)}
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar
                size="sm"
                tone={display.classes.barTone}
                value={display.score10}
                max={10}
                label={tr('Điểm luyện tập gần nhất')}
              />
              <p className={cx('text-[11.5px] tabular-nums', display.classes.meta)}>
                {trf('Đúng {0}/{1} câu · {2}%', {
                  0: display.correctCount,
                  1: display.totalQuestions,
                  2: formatScorePercent(display.accuracyPct),
                })}
              </p>
            </div>
          );
        })()}

        {/* 4 Summary Stat Tiles */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
              <Clock aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
              {tr('Thời gian dự kiến')}
            </div>
            <p className="mt-1 text-base font-bold text-rp-text">
              {data.timeLimitMinutes > 0 ? trf('{0} phút', { 0: data.timeLimitMinutes }) : tr('Không giới hạn')}
            </p>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
              <FileText aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
              {tr('Tổng số câu hỏi')}
            </div>
            <p className="mt-1 text-base font-bold text-rp-text">
              {trf('{0} câu', { 0: data.questionCount ?? 0 })}
            </p>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
              <Layers aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
              {tr('Kỹ năng chính')}
            </div>
            <p className="mt-1 truncate text-sm font-bold text-rp-text" title={mainSkillText}>
              {mainSkillText}
            </p>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
              {tr('Cấp độ JLPT')}
            </div>
            <p className="mt-1 text-base font-bold text-rp-text">
              {data.jlptLevelName || 'JLPT'}
            </p>
          </div>
        </div>

        {/* Question list preview (NO answers / solutions) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line pb-2">
            <div>
              <h3 className="text-sm font-bold text-rp-text">{tr('Danh sách câu hỏi trong bộ đề')}</h3>
              <p className="text-xs text-rp-text-muted">
                {tr('Xem trước nội dung và cấu trúc bài luyện tập (đáp án chỉ hiển thị sau khi nộp bài).')}
              </p>
            </div>
            {sections.length > 0 && (
              <Badge tone="neutral" size="sm" icon={false}>
                {trf('{0} phần', { 0: sections.length })}
              </Badge>
            )}
          </div>

          {previewQuery.isPending ? (
            <div className="py-6">
              <SakuraLoader variant="section" context="mocktest" label={tr('Đang tải danh sách câu hỏi')} delay={120} />
            </div>
          ) : previewQuery.isError ? (
            <ContextualErrorState
              error={previewQuery.error}
              compact
              title={tr('Chưa tải được danh sách câu hỏi')}
              onRetry={() => previewQuery.refetch()}
              retrying={previewQuery.isFetching}
            />
          ) : sections.length === 0 ? (
            <p className="py-4 text-sm text-rp-text-muted">{tr('Chưa có câu hỏi hiển thị trong bộ đề này.')}</p>
          ) : (
            <div className="space-y-3">
              {sections.map((section, sIdx) => (
                <details
                  key={section.sectionId || sIdx}
                  open
                  className="group rounded-xl border border-rp-line bg-rp-surface"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 hover:bg-rp-bg-2/70">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-rp-text">{tr(section.title)}</p>
                      <p className="text-xs text-rp-text-muted">
                        {section.skillName ? `${resolveSkillLabel(section.skillName, tr)} · ` : ''}
                        {trf('{0} câu', { 0: section.questionCount })}
                        {section.requiresAudio ? ` · ${tr('Có file nghe audio')}` : ''}
                      </p>
                    </div>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-rp-text-muted transition-transform group-open:rotate-180"
                    />
                  </summary>

                  <ol className="divide-y divide-rp-line border-t border-rp-line">
                    {(section.questions || []).map((q) => (
                      <li key={q.questionId} className="space-y-2 px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-rp-brand-tint px-2 text-xs font-bold text-rp-brand-strong">
                              {trf('Câu {0}', { 0: q.order })}
                            </span>
                            <Badge tone="neutral" size="sm" icon={false}>
                              {resolveQuestionTypeLabel(q.questionType, tr)}
                            </Badge>
                            {q.skillName && (
                              <Badge tone="info" size="sm" icon={false}>
                                {resolveSkillLabel(q.skillName, tr)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-rp-text-muted">
                            {q.hasAudio && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2 px-2 py-0.5">
                                <Headphones aria-hidden="true" className="h-3 w-3 text-rp-brand-strong" />
                                {tr('Có audio')}
                              </span>
                            )}
                            {q.hasImage && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2 px-2 py-0.5">
                                <ImageIcon aria-hidden="true" className="h-3 w-3 text-rp-brand-strong" />
                                {tr('Có hình ảnh')}
                              </span>
                            )}
                          </div>
                        </div>

                        {q.passageText && !q.isConfidentialRedacted && (
                          <div className="rounded-lg border border-rp-line bg-slate-50/80 p-2.5 text-xs text-rp-text-2">
                            <p className="inline-flex items-center gap-1 font-semibold text-rp-text">
                              <BookOpenText aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                              {q.passageTitle || tr('Đoạn văn ngữ cảnh')}
                            </p>
                            <RichQuestionText as="p" text={q.passageText} className="rp-jp mt-1 line-clamp-3 whitespace-pre-wrap" />
                          </div>
                        )}

                        {q.isConfidentialRedacted ? (
                          <p className="inline-flex items-center gap-1.5 text-xs italic text-rp-text-muted">
                            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                            {q.questionText}
                          </p>
                        ) : (
                          <RichQuestionText as="p" text={q.questionText} className="whitespace-pre-wrap text-sm font-medium leading-6 text-rp-text" />
                        )}

                        {q.options?.length > 0 && !q.isConfidentialRedacted && (
                          <ul className="grid gap-1.5 sm:grid-cols-2">
                            {q.options.map((opt, idx) => (
                              <li
                                key={idx}
                                className={cx(
                                  'flex items-start gap-2 rounded-lg border border-rp-line/80 bg-rp-bg-2/50 px-2.5 py-1.5 text-xs text-rp-text-2',
                                )}
                              >
                                <span className="font-bold text-rp-brand-strong">
                                  {OPTION_LETTERS[idx] || idx + 1}.
                                </span>
                                <RichQuestionText as="span" text={opt.optionText} className="min-w-0 flex-1 whitespace-pre-wrap" />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
