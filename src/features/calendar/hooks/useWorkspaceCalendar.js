import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client.js';
import { getSession } from '@/app/auth/session.js';
import { getPendingMentorSlots } from '@/features/admin/api/adminApi.js';
import {
  courseGet,
  getAdminCohortScheduleRequests,
  getCohortHomework,
  getCohorts,
} from '@/features/cohorts/api/cohortApi.js';
import { getNotifications } from '@/features/notifications/api/notificationApi.js';
import { getDailyReviewQueue, getSrsCalendar, getSrsSummary } from '@/features/srs/api/reviewApi.js';
import { toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { navRoleFor } from '@/layouts/appNav.js';
import { useLocale } from '@/locales/locale.js';
import { useNow } from '@/hooks/useNow.js';
import {
  connectMentorCalendar,
  getMentorCalendarStatus,
  getScheduleChangeRequests,
  syncMentorCalendar,
} from '../api/calendarApi.js';
import {
  buildLearnerCalendarEvents,
  buildMentorCalendarEvents,
  buildUpcomingHeaderSummary,
  extractSrsCalendarState,
  extractSrsDueCount,
  isContentAuthorNotification,
  summarizeAuthorApprovals,
} from '../utils/calendarEventsModel.js';

const NO_RETRY_STATUSES = new Set([401, 403, 404]);

function shouldRetry(count, err) {
  return !NO_RETRY_STATUSES.has(err?.status) && count < 1;
}

function normalizeNotificationList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.result?.items)) return raw.result.items;
  return [];
}

function normalizeResultList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.result?.items)) return raw.result.items;
  return [];
}

/**
 * Shared smart calendar hook backing the Global Header Calendar Popover, /calendar workspace,
 * and dashboard workspace preview cards using only real Backend APIs.
 */
export function useWorkspaceCalendar({
  roleKey: explicitRoleKey,
  includeSrs = true,
  enabled: extraEnabled = true,
  anchorKey = null,
} = {}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const roleKey = explicitRoleKey || navRoleFor(session?.role);
  const enabled = Boolean(session?.accessToken && !session?.isPreview && extraEnabled);
  const nowMs = useNow(30_000);

  const isLearner = roleKey === 'Learner';
  const isMentor = roleKey === 'Mentor';
  const isAdmin = roleKey === 'Admin';
  const isContentAuthor = roleKey === 'ContentAuthor';

  const effectiveDayKey = anchorKey && /^\d{4}-\d{2}-\d{2}$/.test(String(anchorKey))
    ? String(anchorKey)
    : toVnDateKey(new Date(nowMs));
  const [anchorYear, anchorMonth] = effectiveDayKey.split('-').map(Number);

  const coursesQuery = useQuery({
    queryKey: isLearner ? ['learner-courses-summary', uid] : ['workspace-calendar', 'courses', roleKey, uid],
    queryFn: () => courseGet(),
    enabled: enabled && (isLearner || isMentor),
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const homeworksQuery = useQuery({
    queryKey: ['workspace-calendar', 'homeworks', uid],
    queryFn: () => getCohortHomework(),
    enabled: enabled && isLearner,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const changeRequestsQuery = useQuery({
    queryKey: ['workspace-calendar', 'change-requests', roleKey, uid],
    queryFn: () => getScheduleChangeRequests(),
    enabled: enabled && (isLearner || isAdmin),
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const srsSummaryQuery = useQuery({
    queryKey: ['srs-summary', uid],
    queryFn: async () => {
      try {
        return await getSrsSummary();
      } catch (err) {
        if (err?.status === 403 || err?.status === 404) return null;
        throw err;
      }
    },
    enabled: enabled && isLearner && includeSrs,
    staleTime: 30_000,
    retry: shouldRetry,
  });

  const srsQuery = useQuery({
    queryKey: ['srs-queue', { studyMode: 'flip', scope: 'workspace-calendar', uid }],
    queryFn: async () => {
      try {
        return await getDailyReviewQueue();
      } catch (err) {
        if (err?.status === 403 || err?.status === 404) return [];
        throw err;
      }
    },
    enabled: enabled && isLearner && includeSrs,
    staleTime: 30_000,
    retry: shouldRetry,
  });

  const srsCalendarQuery = useQuery({
    queryKey: ['srs-calendar', anchorYear, anchorMonth, uid],
    queryFn: async () => {
      try {
        return await getSrsCalendar(anchorYear, anchorMonth);
      } catch (err) {
        if (err?.status === 403 || err?.status === 404) return [];
        throw err;
      }
    },
    enabled: enabled && isLearner && includeSrs && Number.isFinite(anchorYear) && Number.isFinite(anchorMonth),
    staleTime: 30_000,
    retry: shouldRetry,
  });

  const cohortsQuery = useQuery({
    queryKey: ['workspace-calendar', 'mentor-cohorts', uid],
    queryFn: () => getCohorts(),
    enabled: enabled && isMentor,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const availabilityQuery = useQuery({
    queryKey: ['workspace-calendar', 'mentor-availability', uid],
    queryFn: async () => (await api.get('/mentor/availability')).result || [],
    enabled: false,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const mentorCalendarQuery = useQuery({
    queryKey: ['workspace-calendar', 'mentor-google-calendar', uid],
    queryFn: async () => {
      try {
        return await getMentorCalendarStatus();
      } catch (err) {
        if (err?.status === 403 || err?.status === 404) return null;
        throw err;
      }
    },
    enabled: false,
    staleTime: 120_000,
    retry: shouldRetry,
  });

  const adminRequestsQuery = useQuery({
    queryKey: ['workspace-calendar', 'admin-cohort-requests', uid],
    queryFn: () => getAdminCohortScheduleRequests('Pending'),
    enabled: enabled && isAdmin,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const adminPendingSlotsQuery = useQuery({
    queryKey: ['workspace-calendar', 'admin-pending-slots', uid],
    queryFn: async () => normalizeResultList(await getPendingMentorSlots()),
    enabled: enabled && isAdmin,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const authorApprovalsQuery = useQuery({
    queryKey: ['my-content-approvals', uid],
    queryFn: async () => normalizeResultList(await api.get('/content-approvals/mine')),
    enabled: enabled && isContentAuthor,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const notificationsQuery = useQuery({
    queryKey: ['workspace-calendar', 'notifications', uid],
    queryFn: () => getNotifications({ onlyUnread: false, page: 1, pageSize: 15 }),
    enabled,
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const syncGoogleMutation = useMutation({
    mutationFn: syncMentorCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-calendar', 'mentor-google-calendar', uid] });
    },
  });

  const connectGoogleMutation = useMutation({
    mutationFn: connectMentorCalendar,
    onSuccess: (res) => {
      if (res?.url && typeof window !== 'undefined') {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }
    },
  });

  const courses = useMemo(() => (Array.isArray(coursesQuery.data) ? coursesQuery.data : []), [coursesQuery.data]);
  const homeworks = useMemo(() => (Array.isArray(homeworksQuery.data) ? homeworksQuery.data : []), [homeworksQuery.data]);
  const changeRequests = useMemo(() => (Array.isArray(changeRequestsQuery.data) ? changeRequestsQuery.data : []), [changeRequestsQuery.data]);
  const notifications = useMemo(() => normalizeNotificationList(notificationsQuery.data), [notificationsQuery.data]);
  const adminCohortRequests = useMemo(() => (Array.isArray(adminRequestsQuery.data) ? adminRequestsQuery.data : []), [adminRequestsQuery.data]);
  const adminPendingSlots = useMemo(() => (Array.isArray(adminPendingSlotsQuery.data) ? adminPendingSlotsQuery.data : []), [adminPendingSlotsQuery.data]);
  const authorApprovals = useMemo(() => (Array.isArray(authorApprovalsQuery.data) ? authorApprovalsQuery.data : []), [authorApprovalsQuery.data]);
  const authorSummary = useMemo(() => summarizeAuthorApprovals(authorApprovals), [authorApprovals]);
  const editorialNotifications = useMemo(() => notifications.filter(isContentAuthorNotification), [notifications]);

  const srsState = useMemo(
    () => extractSrsCalendarState({
      srsSummary: srsSummaryQuery.data,
      srsQueue: srsQuery.data,
      srsCalendarDays: srsCalendarQuery.data,
      nowMs,
    }),
    [srsSummaryQuery.data, srsQuery.data, srsCalendarQuery.data, nowMs],
  );

  const events = useMemo(() => {
    if (isLearner) {
      return buildLearnerCalendarEvents({
        courses,
        homeworks,
        changeRequests,
        notifications,
        srsQueue: srsQuery.data,
        srsSummary: srsSummaryQuery.data,
        srsCalendarDays: srsCalendarQuery.data,
        nowMs,
        tr,
        trf,
      });
    }
    if (isMentor) {
      return buildMentorCalendarEvents({
        courses,
        cohorts: cohortsQuery.data || [],
        mentorId: uid,
        nowMs,
        tr,
        trf,
      });
    }
    return [];
  }, [
    isLearner,
    isMentor,
    courses,
    homeworks,
    changeRequests,
    notifications,
    srsQuery.data,
    srsSummaryQuery.data,
    srsCalendarQuery.data,
    cohortsQuery.data,
    uid,
    nowMs,
    tr,
    trf,
  ]);

  const summary = useMemo(
    () => buildUpcomingHeaderSummary({ events, homeworks, notifications, nowMs }),
    [events, homeworks, notifications, nowMs],
  );

  const partialErrors = useMemo(() => {
    const list = [];
    if ((isLearner || isMentor) && coursesQuery.isError) {
      list.push({ id: 'courses', label: tr('Lịch buổi học nhóm'), error: coursesQuery.error, retry: coursesQuery.refetch });
    }
    if (isLearner && homeworksQuery.isError) {
      list.push({ id: 'homeworks', label: tr('Bài tập về nhà'), error: homeworksQuery.error, retry: homeworksQuery.refetch });
    }
    if (isLearner && changeRequestsQuery.isError) {
      list.push({ id: 'changes', label: tr('Yêu cầu dời lịch'), error: changeRequestsQuery.error, retry: changeRequestsQuery.refetch });
    }
    if (isMentor && cohortsQuery.isError) {
      list.push({ id: 'cohorts', label: tr('Danh sách lớp giảng dạy'), error: cohortsQuery.error, retry: cohortsQuery.refetch });
    }
    if (isAdmin && adminRequestsQuery.isError) {
      list.push({ id: 'adminRequests', label: tr('Yêu cầu điều chỉnh lịch lớp'), error: adminRequestsQuery.error, retry: adminRequestsQuery.refetch });
    }
    if (isAdmin && adminPendingSlotsQuery.isError) {
      list.push({ id: 'adminPendingSlots', label: tr('Khung giờ Giáo viên chờ duyệt'), error: adminPendingSlotsQuery.error, retry: adminPendingSlotsQuery.refetch });
    }
    if (isContentAuthor && authorApprovalsQuery.isError) {
      list.push({ id: 'authorApprovals', label: tr('Hàng chờ duyệt học liệu'), error: authorApprovalsQuery.error, retry: authorApprovalsQuery.refetch });
    }
    return list;
  }, [
    isLearner,
    isMentor,
    isAdmin,
    isContentAuthor,
    coursesQuery.isError,
    coursesQuery.error,
    coursesQuery.refetch,
    homeworksQuery.isError,
    homeworksQuery.error,
    homeworksQuery.refetch,
    changeRequestsQuery.isError,
    changeRequestsQuery.error,
    changeRequestsQuery.refetch,
    cohortsQuery.isError,
    cohortsQuery.error,
    cohortsQuery.refetch,
    adminRequestsQuery.isError,
    adminRequestsQuery.error,
    adminRequestsQuery.refetch,
    adminPendingSlotsQuery.isError,
    adminPendingSlotsQuery.error,
    adminPendingSlotsQuery.refetch,
    authorApprovalsQuery.isError,
    authorApprovalsQuery.error,
    authorApprovalsQuery.refetch,
    tr,
  ]);

  const isLoading = enabled && (isLearner
    ? coursesQuery.isLoading && homeworksQuery.isLoading
    : isMentor
      ? coursesQuery.isLoading && cohortsQuery.isLoading
      : isAdmin
        ? adminRequestsQuery.isLoading && changeRequestsQuery.isLoading && adminPendingSlotsQuery.isLoading
        : isContentAuthor
          ? authorApprovalsQuery.isLoading
          : false);

  const isFetching = coursesQuery.isFetching
    || homeworksQuery.isFetching
    || srsSummaryQuery.isFetching
    || srsQuery.isFetching
    || cohortsQuery.isFetching
    || adminRequestsQuery.isFetching
    || adminPendingSlotsQuery.isFetching
    || authorApprovalsQuery.isFetching;

  const hardError = isLearner
    ? coursesQuery.isError && homeworksQuery.isError && events.length === 0
    : isMentor
      ? coursesQuery.isError && cohortsQuery.isError && events.length === 0
      : isAdmin
        ? adminRequestsQuery.isError && changeRequestsQuery.isError && adminPendingSlotsQuery.isError
        : isContentAuthor
          ? authorApprovalsQuery.isError && authorApprovals.length === 0
          : false;

  const refetchAll = () => {
    coursesQuery.refetch();
    if (isLearner) {
      homeworksQuery.refetch();
      changeRequestsQuery.refetch();
      if (includeSrs) {
        srsSummaryQuery.refetch();
        srsQuery.refetch();
        srsCalendarQuery.refetch();
      }
    }
    if (isMentor) {
      cohortsQuery.refetch();
      mentorCalendarQuery.refetch();
    }
    if (isAdmin) {
      adminRequestsQuery.refetch();
      changeRequestsQuery.refetch();
      adminPendingSlotsQuery.refetch();
    }
    if (isContentAuthor) {
      authorApprovalsQuery.refetch();
    }
    notificationsQuery.refetch();
  };

  return {
    roleKey,
    nowMs,
    events,
    courses,
    coursesQuery,
    homeworksQuery,
    homeworks,
    changeRequests,
    srsQueue: srsQuery.data || null,
    srsSummary: srsSummaryQuery.data || null,
    srsState,
    srsDueCount: extractSrsDueCount(srsQuery.data, srsSummaryQuery.data),
    notifications,
    editorialNotifications,
    adminCohortRequests,
    adminPendingSlots,
    pendingScheduleChanges: changeRequests.filter((r) => r.status === 'Pending'),
    authorSummary,
    mentorCalendar: mentorCalendarQuery.data || null,
    syncGoogleMutation,
    connectGoogleMutation,
    summary,
    partialErrors,
    hardError,
    isLoading,
    isFetching,
    refetchAll,
  };
}
