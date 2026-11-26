import { CheckCircle2, Info, TrendingUp } from 'lucide-react';
import {
  Badge,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  ProgressBar,
  UserAvatar,
  cx,
} from '@/components/ui';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { COMPLETION_NOTE } from '@/features/cohorts/utils/completionHelpers';
import { formatSkillLabel } from '@/features/cohorts/utils/skillLabels.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const formatDateTime = (v) => (v ? formatVnDateTime(v, '—') : '—');

/**
 * End-of-course completion report rendered STRICTLY after the class has finished its teaching curriculum.
 * Clearly distinguishes class completion vs individual learner eligibility/completion and excludes review forms.
 */
export default function CohortCompletionSummary({
  summary,
  error = null,
  onRetry,
  retrying = false,
}) {
  const { tr, trf } = useLocale();

  if (error) {
    return (
      <Card className="space-y-3 p-5">
        <CardHeader title={tr('Báo cáo tổng kết khóa học')} />
        <ContextualErrorState
          compact
          error={typeof error === 'string' ? { message: error } : error}
          onRetry={onRetry}
          retrying={retrying}
        />
      </Card>
    );
  }
  if (!summary) return null;

  // Guard: never render completion report before class completion
  const isClassCompleted = Boolean(summary.isClassCompleted || summary.cohortStatus === 'Completed' || summary.isLearnerCompleted || summary.isCompleted);
  if (!isClassCompleted) return null;

  const s = summary.sessions || {};
  const hw = summary.homework || {};
  const eligibility = summary.eligibility || null;
  const policy = summary.completionPolicy || null;
  const isLearnerCompleted = Boolean(summary.isLearnerCompleted ?? summary.isCompleted);
  const completedSessionCount = (Number(s.delivered) || 0) + (Number(s.absent) || 0);
  const totalSessions = Number(s.total) || Number(summary.totalSessions) || completedSessionCount;
  const countedSessions = eligibility?.countedSessions ?? completedSessionCount;
  const attendedSessions = eligibility?.attendedSessions ?? (Number(s.delivered) || 0);
  const attendancePct = countedSessions > 0 ? Math.round((attendedSessions / countedSessions) * 100) : null;

  const mentors = Array.isArray(summary.mentors) ? summary.mentors : [];
  const feedbackList = Array.isArray(summary.mentorFeedback) ? summary.mentorFeedback : [];
  const skillProfile = summary.skillProgress || null;
  const baseline = skillProfile?.baselinePlacement || null;
  const comparison = skillProfile?.comparison || null;

  return (
    <Card className="space-y-5 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-rp-text">{tr('Báo cáo tổng kết khóa học')}</h2>
          {summary.cohortName && (
            <p className="mt-0.5 text-xs text-rp-text-muted">{summary.cohortName}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {summary.level && (
            <Badge tone="brand" icon={false} size="sm">
              JLPT {summary.level}
            </Badge>
          )}
          <StatusBadge tone="success" label="Đã hoàn thành" />
        </div>
      </div>

      {/* Group 1: Class Completion vs Learner Completion & Policy Eligibility */}
      <div className="grid gap-3 rounded-xl border border-rp-line/80 bg-rp-bg-2/40 p-4 text-xs sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="font-semibold text-rp-text-muted">{tr('Kết quả hoàn thành khóa học')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={isLearnerCompleted ? 'success' : 'neutral'}
              label={isLearnerCompleted ? 'Đáp ứng điều kiện hoàn thành' : 'Chưa đáp ứng đầy đủ điều kiện'}
            />
          </div>
          <p className="text-rp-text-2">
            {trf('Lớp học đã hoàn thành {0}/{1} buổi theo chương trình.', {
              0: Math.min(totalSessions || completedSessionCount, completedSessionCount),
              1: totalSessions,
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-semibold text-rp-text-muted">{tr('Điều kiện hoàn thành theo chính sách')}</p>
          <ul className="space-y-1 text-rp-text-2">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
              <span>
                {trf('Hoàn tất đủ {0} buổi học theo lịch trình của lớp.', { 0: totalSessions })}
              </span>
            </li>
            {policy && (
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                <span>
                  {trf('Nộp bài tập đúng hạn {0} {1}% để xét quyền hỗ trợ ôn lại.', {
                    0: policy.homeworkThresholdComparison || '>=',
                    1: policy.homeworkThresholdPercent ?? 90,
                  })}
                </span>
              </li>
            )}
          </ul>
          {eligibility && !eligibility.canClaim && Array.isArray(eligibility.reasons) && eligibility.reasons.length > 0 && (
            <p className="text-[11px] text-rp-text-muted">
              {eligibility.reasons[0]}
            </p>
          )}
        </div>
      </div>

      {/* Group 2: Course KPIs */}
      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
          <dt className="text-rp-text-muted">{tr('Buổi đã hoàn thành')}</dt>
          <dd className="mt-1 text-base font-bold tabular-nums text-rp-text">
            {Math.min(totalSessions || completedSessionCount, completedSessionCount)}/{totalSessions}
          </dd>
        </div>
        <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
          <dt className="text-rp-text-muted">{tr('Chuyên cần cá nhân')}</dt>
          <dd className="mt-1 text-base font-bold tabular-nums text-rp-text">
            {attendancePct != null ? `${attendancePct}% (${attendedSessions}/${countedSessions})` : tr('Chưa có điểm danh')}
          </dd>
        </div>
        <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
          <dt className="text-rp-text-muted">{tr('Bài tập đúng hạn')}</dt>
          <dd className="mt-1 text-base font-bold tabular-nums text-rp-text">
            {eligibility && eligibility.requiredHomework > 0
              ? `${eligibility.passedOnTimeHomework}/${eligibility.requiredHomework}`
              : (hw.assigned ?? 0) > 0
                ? `${hw.submitted ?? 0}/${hw.assigned ?? 0}`
                : tr('Không có')}
          </dd>
        </div>
        <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
          <dt className="text-rp-text-muted">{tr('Bài đã chấm')}</dt>
          <dd className="mt-1 text-base font-bold tabular-nums text-rp-text">
            {hw.assigned > 0 ? `${hw.graded ?? 0}/${hw.assigned ?? 0}` : '0'}
          </dd>
        </div>
      </dl>

      {/* Group 3: Mentor in charge (non-link identification, no full session list) */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Giáo viên phụ trách')}</h3>
        {mentors.length === 0 ? (
          <ContextualEmptyState variant="inline" size="sm" illustration="mentor" title={tr('Chưa có thông tin Giáo viên phụ trách.')} />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {mentors.map((m) => (
              <div
                key={m.mentorId}
                className="flex items-center gap-3 rounded-xl border border-rp-line bg-rp-bg-2/40 px-3.5 py-2.5 text-xs"
              >
                <UserAvatar src={m.mentorAvatarUrl} name={m.mentorName || tr('Giáo viên')} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-rp-text">{m.mentorName || tr('Giáo viên')}</p>
                  <p className="text-[11px] text-rp-text-muted">
                    {m.isCurrentPrimary || m.isPrimary
                      ? tr('Giáo viên phụ trách chính')
                      : trf('Giáo viên tham gia giảng dạy ({0} buổi)', { 0: m.deliveredSessionCount ?? 0 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group 4: Compatible Baseline vs Final Competency Comparison (when available) */}
      {summary.skillProgressAvailable && (comparison?.isComparable || baseline) && (
        <div className="space-y-3 border-t border-rp-line/70 pt-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-rp-brand" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-rp-text">{tr('Năng lực đầu vào & kết quả cuối khóa')}</h3>
          </div>

          {comparison?.isComparable ? (
            <div className="space-y-3">
              <div className="grid gap-2.5 text-xs sm:grid-cols-3">
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-3">
                  <p className="text-rp-text-muted">{tr('Kết quả đầu vào')}</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-rp-text">
                    {comparison.baselineOverallPercent != null ? `${comparison.baselineOverallPercent}%` : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-3">
                  <p className="text-rp-text-muted">{tr('Kết quả cuối khóa')}</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-rp-brand-strong">
                    {comparison.currentOverallPercent != null ? `${comparison.currentOverallPercent}%` : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-3">
                  <p className="text-rp-text-muted">{tr('Mức thay đổi')}</p>
                  <p className={cx(
                    'mt-1 text-base font-bold tabular-nums',
                    (comparison.overallDeltaPercent ?? 0) > 0
                      ? 'text-rp-success'
                      : (comparison.overallDeltaPercent ?? 0) < 0
                        ? 'text-rp-danger'
                        : 'text-rp-text',
                  )}>
                    {comparison.overallDeltaPercent != null
                      ? `${comparison.overallDeltaPercent > 0 ? '+' : ''}${comparison.overallDeltaPercent}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {Array.isArray(comparison.skillComparisons) && comparison.skillComparisons.length > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {comparison.skillComparisons.map((sc) => (
                    <div key={sc.skillCode} className="space-y-1.5 rounded-xl border border-rp-line bg-rp-surface p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-rp-text">{formatSkillLabel(sc.skillLabel || sc.skillCode, tr)}</span>
                        <span className="font-bold tabular-nums text-rp-text">
                          {sc.baselineScorePercent}% → {sc.currentScorePercent}%
                        </span>
                      </div>
                      <ProgressBar value={sc.currentScorePercent} max={100} tone="success" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-rp-line/80 bg-rp-bg-2/40 px-3.5 py-2.5 text-xs text-rp-text-muted">
              {trf('Đánh giá đầu vào: {0} ({1}%). {2}', {
                0: baseline.assessedJlptLevel || baseline.targetLevelCode || '—',
                1: baseline.overallScorePercent,
                2: comparison?.reasonIfNotComparable || tr('Chưa có bài đánh giá cuối khóa cùng thang đo để đối chiếu.'),
              })}
            </p>
          )}
        </div>
      )}

      {/* Group 5: Published Mentor Summary Feedback */}
      <div className="space-y-2.5 border-t border-rp-line/70 pt-4 text-xs">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Nhận xét tổng kết của Giáo viên')}</h3>
        {feedbackList.length === 0 ? (
          <ContextualEmptyState variant="inline" size="sm" illustration="review" title={tr('Chưa có nhận xét nào được công bố.')} />
        ) : (
          <div className="space-y-2.5">
            {feedbackList.map((f, i) => (
              <article className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5" key={`${f.publishedAtUtc}-${i}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar src={f.mentorAvatarUrl} name={f.mentorName || tr('Giáo viên')} size="xs" />
                    <span className="font-semibold text-rp-text">{f.mentorName || tr('Giáo viên')}</span>
                  </div>
                  <span className="text-[11px] tabular-nums text-rp-text-muted">{formatDateTime(f.publishedAtUtc)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {f.title && <span className="font-medium text-rp-text-2">{f.title}</span>}
                  {f.score != null && (
                    <Badge tone="brand" icon={false} size="sm">
                      {trf('Điểm {0}', { 0: f.score })}
                    </Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-rp-text-2">{f.feedback}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Concise Internal Report Disclaimer */}
      <p className="flex items-start gap-1.5 border-t border-rp-line/60 pt-3 text-[11.5px] text-rp-text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
        <span>{tr(summary.note || COMPLETION_NOTE)}</span>
      </p>
    </Card>
  );
}
