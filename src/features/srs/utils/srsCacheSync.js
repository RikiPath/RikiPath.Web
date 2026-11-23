/**
 * Centralized TanStack Query invalidation helpers so SRS review events, card mutations,
 * preference updates, homework submissions, and schedule changes stay synchronized
 * across SRS Dashboard, Review Modes, Card Library, Topbar Calendar Popup,
 * Full Learning Calendar (/calendar/), Learner Home (/app), and Notification badges.
 */

export async function invalidateSrsAndCalendarCaches(queryClient) {
  if (!queryClient) return;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['srs-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-queue'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-active-session'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-calendar'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-library'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-progress-reviewed-cards'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-card-history'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-published-templates'] }),
    queryClient.invalidateQueries({ queryKey: ['srs-preview'] }),
    queryClient.invalidateQueries({ queryKey: ['workspace-calendar'] }),
    queryClient.invalidateQueries({ queryKey: ['learner', 'daily-review-queue'] }),
    queryClient.invalidateQueries({ queryKey: ['learner', 'study-streak'] }),
    queryClient.invalidateQueries({ queryKey: ['learner', 'streak-celebration'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  ]);
}

export async function invalidateScheduleAndHomeworkCaches(queryClient) {
  if (!queryClient) return;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['workspace-calendar'] }),
    queryClient.invalidateQueries({ queryKey: ['learner-courses-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['learner-cohort-workspace'] }),
    queryClient.invalidateQueries({ queryKey: ['homework-hub'] }),
    queryClient.invalidateQueries({ queryKey: ['learner', 'analytics-feed', 'homework'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  ]);
}
