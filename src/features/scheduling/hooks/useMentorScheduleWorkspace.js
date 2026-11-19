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

  // Merge active cohort/booking sessions (from study-courses & cohorts) without duplicates
  const cohortSessions = useMemo(() => {
    const cohortNameById = new Map();
    const cohortDurationById = new Map();
    cohorts.forEach((c) => {
      if (c?.id) {
        if (c.name) cohortNameById.set(c.id, c.name);
        if (c.sessionMinutes) cohortDurationById.set(c.id, Number(c.sessionMinutes));
      }
    });

    const merged = new Map();
    const rawCourses = Array.isArray(coursesQuery.data) ? coursesQuery.data : [];
    rawCourses
      .filter((c) => c && c.status !== 'Cancelled')
      .forEach((c) => {
        const mins = Number(c.sessionMinutes) || cohortDurationById.get(c.cohortId) || policy.sessionMinutes || 90;
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
            cohortName: (c.cohortId && cohortNameById.get(c.cohortId)) || c.cohortName || c.name || 'Lớp nhóm',
            sessionNumber: s.number,
            learnerNames: [],
            scheduledAt: s.scheduledAt,
            endsAt: endIso,
            sessionMinutes: mins,
            meetingUrl: s.meetingUrl || null,
            status: s.status,
          };
          if (c.learnerName && !existing.learnerNames.includes(c.learnerName)) {
            existing.learnerNames.push(c.learnerName);
          }
          if (!existing.meetingUrl && s.meetingUrl) existing.meetingUrl = s.meetingUrl;
          merged.set(key, existing);
        });
      });

    // Also surface sessions on Published/Draft cohorts even before learners enroll
    cohorts
      .filter((c) => c && c.status !== 'Cancelled')
      .forEach((c) => {
        const mins = Number(c.sessionMinutes) || policy.sessionMinutes || 90;
        (c.sessions || []).forEach((s) => {
          const key = s.availabilityId ? `av-${s.availabilityId}` : `cohort-${c.id}-s${s.number}`;
          if (merged.has(key)) return;
          merged.set(key, {
            id: key,
            availabilityId: s.availabilityId || null,
            cohortId: c.id,
            cohortName: c.name || 'Lớp nhóm',
            sessionNumber: s.number,
            learnerNames: [],
            scheduledAt: s.startTime,
            endsAt: s.endTime,
            sessionMinutes: mins,
            meetingUrl: null,
            status: 'Scheduled',
          });
        });
      });

    return [...merged.values()];
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
