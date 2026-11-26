import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  Star,
} from 'lucide-react';
import { Badge, Banner, Button, Modal, UserAvatar } from '@/components/ui';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import OccupancyProgressBar from './OccupancyProgressBar.jsx';
import {
  fmtDate,
  fmtDateOnly,
  frequencyLabelOf,
  groupCohortSessionsByYearMonth,
  money,
  weeklyScheduleLinesOf,
  cohortWeeksOf,
} from '@/features/cohorts/utils/cohortCardModel';
import { useLocale } from '@/locales/locale.js';

function isSafeAttachmentUrl(url) {
  if (!url) return false;
  const trimmed = String(url).trim();
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
}

function OverviewFact({ label, value }) {
  return (
    <div className="rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3 py-2">
      <dt className="text-[11.5px] font-medium text-rp-text-muted">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-rp-text">{value}</dd>
    </div>
  );
}

export default function CohortDetailModal({
  cohort,
  statusInfo,
  busy = false,
  checkingEligibility = false,
  onClose,
  onEnroll,
  onViewCourse,
}) {
  const { tr, trf } = useLocale();
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  if (!cohort) return null;

  const weeks = cohortWeeksOf(cohort);
  const totalSessions = Number(cohort.totalSessions ?? cohort.sessions?.length ?? 0);
  const sessionMinutes = Number(cohort.sessionMinutes || 0);
  const totalHours = cohort.totalTeachingHours != null
    ? cohort.totalTeachingHours
    : (totalSessions > 0 && sessionMinutes > 0
        ? Math.round(((totalSessions * sessionMinutes) / 60) * 10) / 10
        : null);
  const weeklyLines = weeklyScheduleLinesOf(cohort);
  const sessionGroups = groupCohortSessionsByYearMonth(cohort.sessions || []);
  const objective = String(cohort.courseObjective || '').trim();
  const attachments = (cohort.attachments || []).filter((a) => a && a.name);
  const hasPublicContent = Boolean(objective || attachments.length > 0);
  const hasRealRating = Number(cohort.mentorReviewCount || 0) > 0 && cohort.mentorRatingAverage != null;
  const actionPending = busy || checkingEligibility;

  const primaryAction = () => {
    if (!statusInfo) return null;
    if (statusInfo.actionKind === 'view_course') {
      return (
        <Button type="button" variant="success" size="md" disabled={busy} onClick={() => onViewCourse?.(cohort.myEnrollmentCourseId)}>
          {tr('Xem lớp học')}
        </Button>
      );
    }
    if (statusInfo.actionKind === 'resume_payment') {
      return (
        <Button type="button" variant="primary" size="md" disabled={busy} onClick={() => onViewCourse?.(cohort.myEnrollmentCourseId, 'resume_payment')}>
          {tr('Tiếp tục thanh toán')}
        </Button>
      );
    }
    if (statusInfo.canEnroll) {
      return (
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={actionPending}
          loading={checkingEligibility}
          onClick={() => onEnroll?.(cohort)}
        >
          {cohort.hasApprovedEntitlement ? tr('Ghi danh bằng quyền học') : tr('Đăng ký & thanh toán')}
        </Button>
      );
    }
    if (statusInfo.actionKind === 'full') {
      return (
        <Button type="button" variant="secondary" size="md" icon={Lock} disabled>
          {tr(statusInfo.actionLabel)}
        </Button>
      );
    }
    if (statusInfo.actionKind === 'held') {
      return (
        <Button type="button" variant="secondary" size="md" icon={Clock} disabled>
          {tr(statusInfo.actionLabel)}
        </Button>
      );
    }
    return (
      <Button type="button" variant="secondary" size="md" disabled>
        {tr(statusInfo.actionLabel)}
      </Button>
    );
  };

  return (
    <Modal
      open={Boolean(cohort)}
      onClose={onClose}
      size="xl"
      title={cohort.name}
      titleBadge={
        <div className="flex flex-wrap items-center gap-1.5">
          {cohort.level && (
            <Badge tone="brand" size="sm" icon={false}>
              {cohort.level}
            </Badge>
          )}
          {statusInfo && (
            <StatusBadge tone={statusInfo.tone} label={tr(statusInfo.label)} />
          )}
        </div>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {cohort.hasApprovedEntitlement ? (
              <div className="space-y-0.5">
                <span className="inline-block text-sm font-bold text-rp-success">
                  {tr('Miễn học phí · Sử dụng quyền ghi danh đã cấp')}
                </span>
                <p className="m-0 text-xs text-rp-text-muted">
                  {trf('Học phí niêm yết: {0}', { 0: money(cohort.price) })}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xs font-medium text-rp-text-muted">{tr('Học phí trọn khóa:')}</span>
                  <strong className="text-lg font-extrabold tabular-nums text-rp-brand-strong">
                    {money(cohort.price)}
                  </strong>
                  <span className="text-xs text-rp-text-muted">/ {tr('học viên')}</span>
                </div>
                {Number(cohort.checkoutHoldMinutes) > 0 && (
                  <p className="m-0 text-[11.5px] text-rp-text-muted">
                    {trf('Giữ chỗ {0} phút trong lúc thanh toán.', { 0: Number(cohort.checkoutHoldMinutes) })}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="md" disabled={actionPending} onClick={onClose}>
              {tr('Đóng')}
            </Button>
            {primaryAction()}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {(statusInfo?.actionKind === 'full' || statusInfo?.isAllHeld || statusInfo?.disabledReason) && (
          <Banner
            tone={
              statusInfo.actionKind === 'full' || statusInfo.isAllHeld || statusInfo.actionKind === 'conflict'
                ? 'warning'
                : 'neutral'
            }
          >
            {statusInfo.actionKind === 'full'
              ? tr('Lớp học này đã đủ sĩ số.')
              : statusInfo.isAllHeld
                ? tr('Tất cả chỗ còn lại đang được giữ chờ thanh toán.')
                : tr(statusInfo.disabledReason)}
          </Banner>
        )}

        {/* A. Thông tin chung (Giáo viên) */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rp-line bg-rp-surface px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              src={cohort.mentorAvatarUrl}
              name={cohort.mentorName}
              size={44}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-rp-text-muted">{tr('Giáo viên phụ trách')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/mentors/${cohort.mentorId}`}
                  onClick={onClose}
                  className="truncate text-[14.5px] font-bold text-rp-text hover:text-rp-brand-strong hover:underline"
                >
                  {cohort.mentorName || tr('Giáo viên lớp nhóm')}
                </Link>
                {hasRealRating && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 tabular-nums">
                    <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {Number(cohort.mentorRatingAverage).toFixed(1)}
                    <span className="font-normal text-rp-text-muted">
                      ({cohort.mentorReviewCount})
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {cohort.mentorId && (
            <Button
              as={Link}
              to={`/mentors/${cohort.mentorId}`}
              onClick={onClose}
              variant="outline"
              size="sm"
              iconRight={ExternalLink}
            >
              {tr('Xem hồ sơ Giáo viên')}
            </Button>
          )}
        </section>

        {/* B. Tổng quan khóa học */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-rp-text">{tr('Tổng quan khóa học')}</h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <OverviewFact
              label={tr('Tổng số buổi')}
              value={totalSessions > 0 ? trf('{0} buổi', { 0: totalSessions }) : '—'}
            />
            <OverviewFact
              label={tr('Tần suất học')}
              value={frequencyLabelOf(cohort)}
            />
            <OverviewFact
              label={tr('Thời lượng mỗi buổi')}
              value={sessionMinutes > 0 ? trf('{0} phút', { 0: sessionMinutes }) : '—'}
            />
            <OverviewFact
              label={tr('Tổng số giờ học')}
              value={totalHours != null ? trf('{0} giờ', { 0: totalHours }) : '—'}
            />
            <OverviewFact
              label={tr('Thời lượng khóa học')}
              value={weeks ? trf('{0} tuần', { 0: weeks }) : '—'}
            />
            <OverviewFact label={tr('Hạn tuyển sinh')} value={fmtDate(cohort.enrollmentClosesAtUtc)} />
            <OverviewFact label={tr('Ngày bắt đầu')} value={fmtDateOnly(cohort.startsAt)} />
            <OverviewFact label={tr('Ngày kết thúc')} value={fmtDateOnly(cohort.endsAt)} />
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-[13px] font-semibold tabular-nums text-rp-text">
                {statusInfo && statusInfo.capacity > 0
                  ? trf('Đã ghi danh: {0}/{1} học viên', {
                    0: statusInfo.confirmedCount,
                    1: statusInfo.capacity,
                  })
                  : tr('Đã ghi danh: —')}
              </span>
              {statusInfo && statusInfo.capacity > 0 && (
                <div className="w-[96px] shrink-0 sm:w-[108px]">
                  <OccupancyProgressBar
                    enrolledCount={statusInfo.confirmedCount}
                    capacity={statusInfo.capacity}
                    size="sm"
                    label={trf('Sĩ số đã ghi danh {0}/{1} học viên', {
                      0: statusInfo.confirmedCount,
                      1: statusInfo.capacity,
                    })}
                  />
                </div>
              )}
            </div>
            {statusInfo && statusInfo.pendingHoldCount > 0 && (
              <span className="text-xs text-rp-text-muted">
                {trf('Đang giữ chỗ: {0}', { 0: statusInfo.pendingHoldCount })}
              </span>
            )}
          </div>
        </section>

        {/* C. Nội dung & mục tiêu công khai (chỉ hiển thị khi có dữ liệu thực) */}
        {hasPublicContent && (
          <section className="flex flex-col gap-3 border-t border-rp-line pt-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-rp-text">
              <BookOpen aria-hidden="true" className="h-4 w-4 text-rp-brand" />
              {tr('Mục tiêu và tài liệu khóa học')}
            </h3>
            {objective && (
              <div className="rounded-xl border border-rp-line/80 bg-rp-bg-2/40 px-3.5 py-2.5 text-[13px] leading-relaxed text-rp-text-2">
                <p className="mb-1 text-xs font-semibold text-rp-text">{tr('Mục tiêu khóa học')}</p>
                <p className="whitespace-pre-line">{objective}</p>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-rp-text">{tr('Tài liệu giới thiệu khóa học')}</p>
                <ul className="flex flex-col gap-1.5 list-none p-0">
                  {attachments.map((att) => (
                    <li key={`${att.index}-${att.name}`}>
                      {isSafeAttachmentUrl(att.url) ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-rp-line bg-rp-surface px-3 py-1.5 text-[13px] font-medium text-rp-brand-strong hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
                        >
                          <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          <span>{att.name}</span>
                          <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0 opacity-70" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-rp-line bg-rp-surface px-3 py-1.5 text-[13px] text-rp-text-2">
                          <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
                          <span>{att.name}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* D. Lịch học hằng tuần */}
        <section className="flex flex-col gap-3 border-t border-rp-line pt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-rp-text">
            <Clock aria-hidden="true" className="h-4 w-4 text-rp-brand" />
            {tr('Lịch học hằng tuần')}
          </h3>
          {weeklyLines.length === 0 ? (
            <p className="text-[13px] text-rp-text-muted">{tr('Chưa có lịch học hằng tuần.')}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-2.5">
              {weeklyLines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-rp-line/80 bg-rp-bg-2/40 px-3 py-2 text-[13px]"
                >
                  <span className="truncate font-medium text-rp-text-2">{line.weekdayLabel}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-rp-text">{line.timeRange}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* E. Lịch học chi tiết toàn khóa (mặc định thu gọn) */}
        {(cohort.sessions || []).length > 0 && (
          <section className="border-t border-rp-line pt-5">
            <button
              type="button"
              onClick={() => setScheduleExpanded((cur) => !cur)}
              aria-expanded={scheduleExpanded}
              className="rp-focus flex w-full items-center justify-between gap-3 rounded-xl border border-rp-line bg-rp-bg-2/60 px-3.5 py-2.5 text-left transition-colors hover:border-rp-brand-border/70"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-rp-text">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-rp-brand" />
                {trf('Lịch học chi tiết toàn khóa ({0} buổi)', { 0: cohort.sessions.length })}
              </span>
              {scheduleExpanded ? (
                <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
              ) : (
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
              )}
            </button>

            {scheduleExpanded && (
              <div className="mt-3.5 flex max-h-[280px] flex-col gap-4 overflow-y-auto pr-1">
                {sessionGroups.map((group) => (
                  <div key={group.key} className="flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-rp-text-muted">
                      {group.monthLabel}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.items.map((item) => (
                        <div
                          key={`${item.number}-${item.dateLabel}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-rp-line/80 bg-rp-surface px-3 py-1.5 text-[12.5px]"
                        >
                          <span className="truncate font-medium text-rp-text-2">
                            {trf('Buổi {0}', { 0: item.number })} · {item.weekdayLabel} - {item.dateLabel}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-rp-text">
                            {item.timeRange}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
