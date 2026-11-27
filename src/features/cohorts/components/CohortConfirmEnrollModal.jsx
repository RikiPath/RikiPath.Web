import { BookOpen, CalendarDays, Clock, Repeat } from 'lucide-react';
import { Banner, Button, Modal, UserAvatar } from '@/components/ui';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import { fmtDateOnly, frequencyLabelOf, money } from '@/features/cohorts/utils/cohortCardModel';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';

export default function CohortConfirmEnrollModal({
  cohort,
  busy = false,
  onClose,
  onConfirm,
}) {
  const { tr, trf } = useLocale();
  const confirmTotalSessions = cohort ? (cohort.totalSessions ?? cohort.sessions?.length ?? 0) : 0;
  const holdMinutes = Number(cohort?.checkoutHoldMinutes) || 10;

  return (
    <Modal
      open={Boolean(cohort)}
      onClose={() => { if (!busy) onClose?.(); }}
      title={tr('Xác nhận đăng ký')}
      description={tr('Kiểm tra thông tin lớp và lịch học trước khi xác nhận đăng ký.')}
      size="lg"
      footer={cohort ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="neutral" size="md" disabled={busy} onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button type="button" variant="primary" size="md" disabled={busy} loading={busy} onClick={onConfirm}>
            {cohort.hasApprovedEntitlement ? tr('Xác nhận ghi danh') : tr('Thanh toán ngay')}
          </Button>
        </div>
      ) : undefined}
    >
      {cohort && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              {cohort.level && (
                <>
                  <span className="shrink-0 text-[13.5px] font-semibold text-rp-text-2">
                    {formatJlptLevel(cohort.level)}
                  </span>
                  <span aria-hidden="true" className="text-rp-text-muted">·</span>
                </>
              )}
              <span className="truncate text-base font-bold text-rp-text">{cohort.name}</span>
            </div>
            <span className="hidden h-5 w-px bg-rp-line sm:inline-block" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <UserAvatar
                src={cohort.mentorAvatarUrl}
                name={cohort.mentorName}
                size={28}
                className="shrink-0"
              />
              <span className="text-sm font-semibold text-rp-text">{cohort.mentorName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
              <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-medium text-rp-text-muted">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                <span>{tr('Ngày bắt đầu')}</span>
              </p>
              <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                {fmtDateOnly(cohort.startsAt)}
              </p>
            </div>
            <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
              <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-medium text-rp-text-muted">
                <Repeat className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                <span>{tr('Tần suất')}</span>
              </p>
              <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                {frequencyLabelOf(cohort)}
              </p>
            </div>
            <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
              <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-medium text-rp-text-muted">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                <span>{tr('Tổng số buổi')}</span>
              </p>
              <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                {trf('{0} buổi', { 0: confirmTotalSessions })}
              </p>
            </div>
            <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
              <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-medium text-rp-text-muted">
                <Clock className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                <span>{tr('Thời lượng mỗi buổi')}</span>
              </p>
              <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                {cohort.sessionMinutes ? trf('{0} phút', { 0: cohort.sessionMinutes }) : '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="m-0 flex items-center gap-1.5 text-[13.5px] font-bold text-rp-text">
              <CalendarDays className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
              <span>{tr('Lịch học hằng tuần')}</span>
            </p>
            <WeeklyScheduleDisplay
              schedulePattern={cohort.schedulePattern}
              sessions={cohort.sessions}
              sessionDurationMinutes={cohort.sessionMinutes || 90}
              variant="detailed"
            />
          </div>

          {cohort.hasApprovedEntitlement ? (
            <Banner tone="success">
              {tr('Ghi danh bằng quyền học đã được Quản trị viên cấp · Không phát sinh thanh toán.')}
            </Banner>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rp-brand-soft bg-rp-brand-tint/75 px-4 py-2.5">
                <span className="text-[13px] font-semibold text-rp-text-2">{tr('Học phí trọn khóa')}</span>
                <span className="h-4 w-px bg-rp-brand-border" aria-hidden="true" />
                <strong className="text-lg font-extrabold tabular-nums text-rp-brand-strong">
                  {money(cohort.price)}
                </strong>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-rp-warning-line/70 bg-rp-warning-bg/55 px-3.5 py-2.5 text-xs leading-5 text-rp-text-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" aria-hidden="true" />
                <p className="m-0">
                  {trf('Giữ chỗ {0} phút trong lúc thanh toán. Ghi danh được xác nhận sau khi thanh toán thành công.', {
                    0: holdMinutes,
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
