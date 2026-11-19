import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/app/auth/session.js';
import { courseGet, getCohorts } from '@/features/cohorts/api/cohortApi.js';
import {
  createMyAvailabilityBatch,
  createMyAvailabilitySlots,
  deleteMyAvailabilitySlot,
  getMentorCalendarStatus,
  getMyAvailabilitySlots,
  getMyMentorSchedule,
  movePendingAvailabilitySlot,
  requestCancelAvailabilitySlots,
  requestChangeAvailabilitySlot,
} from '@/features/scheduling/api/mentorScheduleManageApi.js';
import { resolveSchedulePolicy } from '@/features/scheduling/utils/slotPlannerModel.js';
import { backendUtcDate } from '@/utils/mentorSchedule.js';

/**
 * Shared React Query workspace loader + normalized Cohort Session + GroupPolicy resolver
 * shared across MentorShiftSchedule, MentorAvailability, and WorkSchedule.
 */
export function useMentorScheduleWorkspace({ includeCalendarStatus = false, refetchSlotsMs = 15000 } = {}) {
  const queryClient = useQueryClient();
  const uid = getSession()?.userId ?? 'anon';
  const scheduleKey = ['my-mentor-schedule', uid];
  const slotsKey = ['my-availability-slots', uid];

  const scheduleQuery = useQuery({
    queryKey: scheduleKey,
    queryFn: getMyMentorSchedule,
    retry: (count, err) => err?.status !== 404 && err?.status !== 403 && count < 1,
  });

  const availabilityQuery = useQuery({
    queryKey: slotsKey,
    queryFn: getMyAvailabilitySlots,
    refetchInterval: refetchSlotsMs,
  });

  const cohortsQuery = useQuery({
    queryKey: ['mentor-scheduling-cohorts', uid],
    queryFn: () => getCohorts(),
    refetchInterval: 30000,
  });

  const coursesQuery = useQuery({
    queryKey: ['mentor-scheduling-courses', uid],
    queryFn: () => courseGet(),
    refetchInterval: 15000,
  });

  const plansQuery = useQuery({
    queryKey: ['mentor-scheduling-plans', uid],
    queryFn: () => courseGet('/plans'),
    staleTime: 60000,
    retry: (count, err) => err?.status !== 403 && count < 1,
  });

  const calendarQuery = useQuery({
    queryKey: ['mentor-calendar-status', uid],
    queryFn: getMentorCalendarStatus,
    enabled: includeCalendarStatus,
    retry: false,
  });

  const slots = useMemo(
    () => (Array.isArray(availabilityQuery.data) ? availabilityQuery.data : []),
    [availabilityQuery.data]
  );
  const cohorts = useMemo(
    () => (Array.isArray(cohortsQuery.data) ? cohortsQuery.data : []),
    [cohortsQuery.data]
  );
  const plans = useMemo(
    () => (Array.isArray(plansQuery.data) ? plansQuery.data : []),
    [plansQuery.data]
  );

  const policy = useMemo(
    () => resolveSchedulePolicy({
      schedule: scheduleQuery.data,
      plans,
      cohorts,
      slots,
    }),
    [scheduleQuery.data, plans, cohorts, slots]
  );

  // Merge active cohort sessions (from study-courses & cohorts) with authoritative cohort capacity, active enrollment count, and attendance lifecycle
  const cohortSessions = useMemo(() => {
    const cohortById = new Map();
    cohorts.forEach((c) => {
      if (c?.id) cohortById.set(c.id, c);
    });

    const merged = new Map();
    const rawCourses = Array.isArray(coursesQuery.data) ? coursesQuery.data : [];
    const nowMs = Date.now();
    const reservesSeat = (c) => {
      if (!c) return false;
      if (c.paymentStatus === 'Paid' && !['PaymentReview', 'Cancelled', 'Transferred'].includes(c.status)) return true;
      if (c.paymentStatus === 'Pending' && c.paymentExpiresAt) {
        const exp = backendUtcDate(c.paymentExpiresAt)?.getTime() || 0;
        return exp > nowMs;
      }
      return false;
    };

    rawCourses
      .filter((c) => c && c.status !== 'Cancelled' && c.status !== 'Transferred')
      .forEach((c) => {
        const cohort = c.cohortId ? cohortById.get(c.cohortId) : null;
        if (cohort?.status === 'Cancelled') return;
        const mins = Number(c.sessionMinutes) || Number(cohort?.sessionMinutes) || policy.sessionMinutes || 90;
        const capacity = Number(cohort?.capacitySnapshot ?? cohort?.capacity ?? c.capacity ?? 0) || null;
        const isValidLearner = reservesSeat(c) || c.status === 'Completed';

        (c.sessions || []).forEach((s) => {
          const parsed = backendUtcDate(s.scheduledAt);
          const endIso = parsed ? new Date(parsed.getTime() + mins * 60000).toISOString() : null;
          const key = s.availabilityId
            ? `av-${s.availabilityId}`
            : c.cohortId
              ? `cohort-${c.cohortId}-s${s.number}`
              : `${c.id}-${s.id}`;
          const existing = merged.get(key) || {
            id: key,
            availabilityId: s.availabilityId || null,
            cohortId: c.cohortId,
            cohortName: cohort?.name || c.cohortName || c.name || 'Lớp nhóm',
            cohortStatus: cohort?.status || null,
            level: cohort?.level || c.level || null,
            sessionNumber: s.number,
            totalSessions: Number(cohort?.totalSessions ?? c.totalSessions ?? 0) || null,
            capacity,
            enrolledCount: cohort?.enrolledCount != null ? Number(cohort.enrolledCount) : null,
            learnerNames: [],
            scheduledAt: s.scheduledAt,
            endsAt: endIso,
            sessionMinutes: mins,
            meetingUrl: s.meetingUrl || null,
            status: s.status,
            statuses: [],
            attendanceSummary: {
              presentCount: 0,
              absentCount: 0,
              excusedCount: 0,
              cancelledCount: 0,
              scheduledCount: 0,
              confirmedCount: 0,
              totalRecords: 0,
            },
            sessionCompleted: cohort?.status === 'Completed',
          };

          if (isValidLearner && c.learnerName && !existing.learnerNames.includes(c.learnerName)) {
            existing.learnerNames.push(c.learnerName);
          }
          if (!existing.meetingUrl && s.meetingUrl) existing.meetingUrl = s.meetingUrl;

          if (isValidLearner && s.status) {
            existing.statuses.push(s.status);
            existing.attendanceSummary.totalRecords += 1;
            if (s.status === 'Present') {
              existing.attendanceSummary.presentCount += 1;
              existing.attendanceSummary.confirmedCount += 1;
            } else if (s.status === 'Absent') {
              existing.attendanceSummary.absentCount += 1;
              existing.attendanceSummary.confirmedCount += 1;
            } else if (s.status === 'ExcusedAbsent') {
              existing.attendanceSummary.excusedCount += 1;
              existing.attendanceSummary.confirmedCount += 1;
            } else if (s.status === 'CancelledByMentor') {
              existing.attendanceSummary.cancelledCount += 1;
            } else {
              existing.attendanceSummary.scheduledCount += 1;
            }
          }

          if (existing.attendanceSummary.confirmedCount > 0 && existing.attendanceSummary.scheduledCount === 0) {
            existing.sessionCompleted = true;
            existing.status = 'Completed';
          } else if (existing.attendanceSummary.cancelledCount > 0
            && existing.attendanceSummary.cancelledCount === existing.attendanceSummary.totalRecords) {
            existing.status = 'CancelledByMentor';
          }

          merged.set(key, existing);
        });
      });

    // Also include sessions from active/published/completed cohorts even when 0 learners are enrolled yet
    cohorts
      .filter((c) => c && c.status !== 'Cancelled')
      .forEach((c) => {
        const mins = Number(c.sessionMinutes) || policy.sessionMinutes || 90;
        const capacity = Number(c.capacitySnapshot ?? c.capacity ?? 0) || null;
        const enrolledCount = Number(c.enrolledCount ?? 0);
        const totalSessions = Number(c.totalSessions ?? c.sessions?.length ?? 0) || null;
        (c.sessions || []).forEach((s) => {
          const key = s.availabilityId ? `av-${s.availabilityId}` : `cohort-${c.id}-s${s.number}`;
          const existing = merged.get(key);
          if (existing) {
            if (existing.enrolledCount == null) existing.enrolledCount = enrolledCount;
            if (existing.capacity == null) existing.capacity = capacity;
            if (existing.totalSessions == null) existing.totalSessions = totalSessions;
            if (!existing.cohortStatus) existing.cohortStatus = c.status;
            return;
          }
          const completed = c.status === 'Completed';
          merged.set(key, {
            id: key,
            availabilityId: s.availabilityId || null,
            cohortId: c.id,
            cohortName: c.name || 'Lớp nhóm',
            cohortStatus: c.status,
            level: c.level || null,
            sessionNumber: s.number,
            totalSessions,
            capacity,
            enrolledCount,
            learnerNames: [],
            scheduledAt: s.startTime,
            endsAt: s.endTime,
            sessionMinutes: mins,
            meetingUrl: s.roomId ? `/meeting-room/${s.roomId}` : null,
            status: completed ? 'Completed' : 'Scheduled',
            attendanceSummary: null,
            sessionCompleted: completed,
          });
        });
      });

    return [...merged.values()].map((item) => ({
      ...item,
      enrolledCount: item.enrolledCount != null ? item.enrolledCount : item.learnerNames.length,
    }));
  }, [cohorts, coursesQuery.data, policy.sessionMinutes]);

  const externalBusyEvents = useMemo(
    () => (Array.isArray(calendarQuery.data?.busyEvents) ? calendarQuery.data.busyEvents : []),
    [calendarQuery.data]
  );

  const invalidateScheduling = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: slotsKey }),
      queryClient.invalidateQueries({ queryKey: scheduleKey }),
      queryClient.invalidateQueries({ queryKey: ['mentor-assigned-slots', uid] }),
      queryClient.invalidateQueries({ queryKey: ['mentor-scheduling-courses', uid] }),
      queryClient.invalidateQueries({ queryKey: ['mentor-scheduling-cohorts', uid] }),
      queryClient.invalidateQueries({ queryKey: ['mentor-work-schedule-courses', uid] }),
      queryClient.invalidateQueries({ queryKey: ['mentor-work-schedule-cohorts', uid] }),
    ]);
  };

  return {
    uid,
    scheduleKey,
    slotsKey,
    scheduleQuery,
    availabilityQuery,
    cohortsQuery,
    coursesQuery,
    calendarQuery,
    slots,
    cohorts,
    cohortSessions,
    externalBusyEvents,
    policy,
    invalidateScheduling,
    createAvailability: createMyAvailabilitySlots,
    createAvailabilityBatch: createMyAvailabilityBatch,
    movePendingSlot: ({ slot, startUtcIso, endUtcIso }) =>
      movePendingAvailabilitySlot({
        slot,
        targetStartUtcIso: startUtcIso,
        targetEndUtcIso: endUtcIso,
        restMinutes: policy.restMinutes,
      }),
    deletePendingSlot: deleteMyAvailabilitySlot,
    requestCancelSlot: (slotId, reason) => requestCancelAvailabilitySlots([slotId], reason),
    requestChangeSlot: (slotId, reason) => requestChangeAvailabilitySlot(slotId, reason),
  };
}
