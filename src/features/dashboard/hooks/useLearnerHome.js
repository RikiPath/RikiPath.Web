import { useQuery } from '@tanstack/react-query';
import { getCompletionStats, getSkillBreakdown, getStudyStreak } from '@/features/progress/api/analyticsApi.js';
import { getMyProfile } from '@/features/profile/api/profileApi.js';
import { queryClient } from '@/api/queryClient.js';
import { getDailyReviewQueue } from '@/features/srs/api/reviewApi.js';
import { getSession } from '@/app/auth/session.js';
import { MOCK_COMPLETION, MOCK_PROFILE, MOCK_SKILLS, MOCK_SRS, MOCK_STREAK } from '@/mocks/preview.js';
import { translateTemplate } from '@/locales/locale.js';

export const learnerKeys = {
  profile: ['learner', 'profile'],
  streak: ['learner', 'study-streak'],
  completion: ['learner', 'completion-stats'],
  skills: ['learner', 'skill-breakdown'],
  srs: ['learner', 'daily-review-queue'],
};

export function learnerScopeKey(session = getSession()) {
  return [session?.userId ?? 'anon', session?.isPreview ? 'preview' : 'live'];
}

export function learnerProfileQueryKey(session = getSession()) {
  return [...learnerKeys.profile, ...learnerScopeKey(session)];
}

const learnerQuery = {
  retry: (count, err) => err?.status !== 401 && count < 1,
};

export async function prefetchLearnerHome(session = getSession()) {
  const scope = learnerScopeKey(session);
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: [...learnerKeys.profile, ...scope], queryFn: getMyProfile }),
    queryClient.prefetchQuery({ queryKey: [...learnerKeys.streak, ...scope], queryFn: getStudyStreak }),
    queryClient.prefetchQuery({ queryKey: [...learnerKeys.completion, ...scope], queryFn: getCompletionStats }),
    queryClient.prefetchQuery({ queryKey: [...learnerKeys.skills, ...scope], queryFn: getSkillBreakdown }),
    queryClient.prefetchQuery({ queryKey: [...learnerKeys.srs, ...scope], queryFn: getDailyReviewQueue }),
  ]);
}

const previewFns = {
  profile: async () => MOCK_PROFILE,
  streak: async () => MOCK_STREAK,
  completion: async () => MOCK_COMPLETION,
  skills: async () => MOCK_SKILLS,
  srs: async () => MOCK_SRS,
};

export function useLearnerProfile() {
  const session = getSession();
  return useQuery({
    queryKey: learnerProfileQueryKey(session),
    queryFn: session?.isPreview ? previewFns.profile : getMyProfile,
    enabled: Boolean(session?.accessToken),
    ...learnerQuery,
  });
}

export function useLearnerHome() {
  const session = getSession();
  const enabled = Boolean(session?.accessToken);

  const preview = Boolean(session?.isPreview);
  const scope = learnerScopeKey(session);
  const profileQuery = useQuery({
    queryKey: [...learnerKeys.profile, ...scope],
    queryFn: preview ? previewFns.profile : getMyProfile,
    enabled,
    ...learnerQuery,
  });
  const streakQuery = useQuery({
    queryKey: [...learnerKeys.streak, ...scope],
    queryFn: preview ? previewFns.streak : getStudyStreak,
    enabled,
    ...learnerQuery,
  });
  const completionQuery = useQuery({
    queryKey: [...learnerKeys.completion, ...scope],
    queryFn: preview ? previewFns.completion : getCompletionStats,
    enabled,
    ...learnerQuery,
  });
  const skillsQuery = useQuery({
    queryKey: [...learnerKeys.skills, ...scope],
    queryFn: preview ? previewFns.skills : getSkillBreakdown,
    enabled,
    ...learnerQuery,
  });
  const srsQuery = useQuery({
    queryKey: [...learnerKeys.srs, ...scope],
    queryFn: preview ? previewFns.srs : getDailyReviewQueue,
    enabled,
    ...learnerQuery,
  });

  const queries = [profileQuery, streakQuery, completionQuery, skillsQuery, srsQuery];
  const unauthorized = preview
    ? false
    : queries.some((q) => q.error?.status === 401);

  return {
    session,
    profile: profileQuery.data,
    streak: streakQuery.data,
    completion: completionQuery.data,
    skills: Array.isArray(skillsQuery.data) ? skillsQuery.data : [],
    srs: srsQuery.data,
    profileQuery,
    streakQuery,
    completionQuery,
    skillsQuery,
    srsQuery,
    errors: {
      profile: profileQuery.isError ? profileQuery.error : null,
      streak: streakQuery.isError ? streakQuery.error : null,
      completion: completionQuery.isError ? completionQuery.error : null,
      skills: skillsQuery.isError ? skillsQuery.error : null,
      srs: srsQuery.isError ? srsQuery.error : null,
    },
    refreshing: {
      profile: profileQuery.isFetching && !profileQuery.isPending,
      streak: streakQuery.isFetching && !streakQuery.isPending,
      completion: completionQuery.isFetching && !completionQuery.isPending,
      skills: skillsQuery.isFetching && !skillsQuery.isPending,
      srs: srsQuery.isFetching && !srsQuery.isPending,
    },
    isLoading: enabled && queries.some((q) => q.isPending),
    isRefreshing: enabled && queries.some((q) => q.isFetching && !q.isPending),
    unauthorized,
  };
}

export function displayName(profile, session) {
  const full = profile?.fullName?.trim();
  if (full) return full;
  const legacyCombined = [profile?.firstName?.trim(), profile?.lastName?.trim()].filter(Boolean).join(' ');
  return legacyCombined || session?.fullName || session?.email || 'bạn';
}

export function greetingHonorific(profile, session) {
  const full = profile?.fullName?.trim();
  if (full) return `${full}-san`;
  const first = profile?.firstName?.trim();
  if (first) return `${first}-san`;
  return displayName(profile, session);
}

export function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function learnerRoleLabel(profile, session) {
  const jlpt = profile?.targetJlptLevelName;
  if (jlpt) return translateTemplate('Học viên {0}', { 0: jlpt });
  const role = profile?.role || session?.role;
  if (role && role.toLowerCase() === 'learner') return 'Học viên';
  return role || 'Học viên';
}

export function weekBloomStates(currentStreakDays = 0, isActiveToday = false) {
  const mondayIndex = (new Date().getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    if (i > mondayIndex) return 'future';
    if (i === mondayIndex) return isActiveToday ? 'today' : 'pending';
    const daysBack = mondayIndex - i;
    return currentStreakDays > daysBack ? 'done' : 'missed';
  });
}

export function splitSrsQueue(items = []) {
  const urgent = items.filter((item) => (item.repetitions ?? 0) <= 1).length;
  const due = items.filter((item) => {
    const reps = item.repetitions ?? 0;
    return reps >= 2 && reps <= 4;
  }).length;
  const longTerm = items.filter((item) => (item.repetitions ?? 0) >= 5).length;
  return { urgent, due, longTerm };
}
