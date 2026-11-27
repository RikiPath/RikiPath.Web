import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, Clock, Eye, Lock, Star } from 'lucide-react';
import { Button, Card, UserAvatar } from '@/components/ui';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import OccupancyProgressBar from './OccupancyProgressBar.jsx';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import { cohortWeeksOf, fmtDate, fmtDateOnly, money } from '@/features/cohorts/utils/cohortCardModel';
import { useLocale } from '@/locales/locale.js';

export default function CohortDiscoveryCard({
  cohort,
  statusInfo,
  busy = false,
  checking = false,
  highlighted = false,
  showMentorRow = true,
  mentorLinkState,
  onBeforeMentorNavigate,
  onOpenDetail,
  onEnroll,
  onViewCourse,
}) {
  const { tr, trf } = useLocale();
  const weeks = cohortWeeksOf(cohort);
  const totalSessions = Number(cohort.totalSessions ?? cohort.sessions?.length ?? 0);
  const sessionMinutes = Number(cohort.sessionMinutes || 0);
  const hasRealRating = Number(cohort.mentorReviewCount || 0) > 0 && cohort.mentorRatingAverage != null;

  return (
    <Card
      id={`cohort-discovery-card-${cohort.id}`}
      data-testid={`cohort-card-${cohort.id}`}
      padded={false}
      className={`flex h-full flex-col p-5 transition-colors hover:border-rp-brand-border/75 ${highlighted ? 'ring-2 ring-rp-brand ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {cohort.level && (
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-1.5 text-[13px] font-bold text-rp-text">
              {cohort.level}
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => onOpenDetail?.(cohort)}
              className="rp-focus block max-w-full truncate rounded text-left text-[17px] font-bold leading-snug text-rp-text transition-colors hover:text-rp-brand-strong"
              title={cohort.name}
            >
              {cohort.name}
            </button>
            {showMentorRow && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Link
                  to={`/mentors/${cohort.mentorId}/`}
                  state={mentorLinkState}
                  onClick={() => onBeforeMentorNavigate?.(cohort)}
                  className="group inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-rp-text-2 transition-colors hover:text-rp-brand-strong"
                >
                  <UserAvatar
                    src={cohort.mentorAvatarUrl}
                    name={cohort.mentorName}
                    size={22}
                  />
                  <span className="truncate group-hover:underline">
                    {cohort.mentorName || tr('Giáo viên')}
                  </span>
                </Link>
                {hasRealRating && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-amber-600">
                    <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {Number(cohort.mentorRatingAverage).toFixed(1)}
                    <span className="font-normal text-rp-text-muted">({cohort.mentorReviewCount})</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <StatusBadge
          tone={statusInfo.tone}
          label={tr(statusInfo.label)}
          className="shrink-0"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-rp-line/70 pb-3 text-[13px] font-medium tabular-nums text-rp-text-2">
        <span className="inline-flex items-center gap-1.5">
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
          {totalSessions > 0 ? trf('{0} buổi học', { 0: totalSessions }) : '—'}
        </span>
        {weeks ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
            {trf('{0} tuần', { 0: weeks })}
          </span>
        ) : null}
        {sessionMinutes > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
            {trf('{0} phút mỗi buổi', { 0: sessionMinutes })}
          </span>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 py-4 sm:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="@container flex min-w-0 flex-col gap-2.5">
          <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-bold text-rp-text">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
            {tr('Lịch học hằng tuần')}
          </p>
          <WeeklyScheduleDisplay
            schedulePattern={cohort.schedulePattern}
            sessions={cohort.sessions}
            sessionDurationMinutes={sessionMinutes || 90}
            variant="standard"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2.5 text-[12.5px] text-rp-text-2 sm:border-l sm:border-rp-line/70 sm:pl-4">
          {cohort.enrollmentClosesAtUtc && (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-rp-text-muted">
                <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                <span>{tr('Hạn tuyển sinh')}</span>
              </span>
              <strong className="shrink-0 font-semibold tabular-nums text-rp-text">{fmtDate(cohort.enrollmentClosesAtUtc)}</strong>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-rp-text-muted">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
              <span>{tr('Ngày bắt đầu')}</span>
            </span>
            <strong className="shrink-0 font-semibold tabular-nums text-rp-text">{fmtDateOnly(cohort.startsAt)}</strong>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-rp-text-muted">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
              <span>{tr('Ngày kết thúc')}</span>
            </span>
            <strong className="shrink-0 font-semibold tabular-nums text-rp-text">{fmtDateOnly(cohort.endsAt)}</strong>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-rp-line/70 pt-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11.5px] font-medium text-rp-text-muted">{tr('Học phí trọn khóa')}</p>
            <div className="flex items-baseline gap-1">
              <strong className="text-[19px] font-extrabold leading-tight tabular-nums text-rp-brand-strong">
                {money(cohort.price)}
              </strong>
            </div>
            {cohort.hasApprovedEntitlement && (
              <p className="m-0 mt-0.5 text-[11px] font-semibold text-rp-success">
                {tr('Miễn phí bằng quyền ghi danh')}
              </p>
            )}
          </div>

          <div className="min-w-[136px] max-w-[190px] flex-1 space-y-1.5 sm:border-l sm:border-rp-line/70 sm:pl-3">
            <p className="m-0 text-[12px] font-medium tabular-nums text-rp-text-2">
              {trf('Đã ghi danh: {0}/{1} học viên', {
                0: statusInfo.confirmedCount,
                1: statusInfo.capacity,
              })}
            </p>
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

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => onOpenDetail?.(cohort)}
            >
              {tr('Xem chi tiết')}
            </Button>

            {statusInfo.actionKind === 'view_course' ? (
              <Button
                type="button"
                variant="success"
                size="sm"
                disabled={busy}
                onClick={() => onViewCourse?.(cohort.myEnrollmentCourseId, 'view_course')}
              >
                {tr('Xem lớp học')}
              </Button>
            ) : statusInfo.actionKind === 'resume_payment' ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => onViewCourse?.(cohort.myEnrollmentCourseId, 'resume_payment')}
              >
                {tr('Tiếp tục thanh toán')}
              </Button>
            ) : statusInfo.actionKind === 'full' ? (
              <Button type="button" variant="secondary" size="sm" icon={Lock} disabled>
                {tr('Đã đủ sĩ số')}
              </Button>
            ) : statusInfo.actionKind === 'held' ? (
              <Button type="button" variant="secondary" size="sm" icon={Clock} disabled>
                {tr('Đang giữ chỗ')}
              </Button>
            ) : (
              <Button
                type="button"
                variant={statusInfo.canEnroll ? 'primary' : 'secondary'}
                size="sm"
                loading={checking}
                disabled={busy || checking || !statusInfo.canEnroll}
                onClick={() => onEnroll?.(cohort)}
              >
                {tr(statusInfo.actionLabel)}
              </Button>
            )}
          </div>
        </div>

        {(statusInfo.isAllHeld || statusInfo.actionKind === 'conflict') && statusInfo.disabledReason && (
          <p className="m-0 mt-2 text-[11.5px] font-medium text-rp-warning">
            {tr(statusInfo.disabledReason)}
          </p>
        )}
      </div>
    </Card>
  );
}
