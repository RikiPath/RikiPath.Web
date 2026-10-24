import { useQuery } from '@tanstack/react-query';
import { getCompletionStats, getSkillBreakdown, getStudyStreak } from '../api/analytics.js';
import { getMyProfile } from '../api/profile.js';
import { queryClient } from '../api/queryClient.js';
import { getDailyReviewQueue } from '../api/reviews.js';
import { getSession } from '../auth/session.js';
import { MOCK_COMPLETION, MOCK_PROFILE, MOCK_SKILLS, MOCK_SRS, MOCK_STREAK } from '../mocks/preview.js';

export const learnerKeys = {
  profile: ['learner', 'profile'],
  streak: ['learner', 'study-streak'],
  completion: ['learner', 'completion-stats'],
  skills: ['learner', 'skill-breakdown'],
  srs: ['learner', 'daily-review-queue'],
};

const learnerQuery = {
  retry: (count, err) => err?.status !== 401 && count < 1,
};

export async function prefetchLearnerHome() {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: learnerKeys.profile, queryFn: getMyProfile }),
    queryClient.prefetchQuery({ queryKey: learnerKeys.streak, queryFn: getStudyStreak }),
    queryClient.prefetchQuery({ queryKey: learnerKeys.completion, queryFn: getCompletionStats }),
    queryClient.prefetchQuery({ queryKey: learnerKeys.skills, queryFn: getSkillBreakdown }),
    queryClient.prefetchQuery({ queryKey: learnerKeys.srs, queryFn: getDailyReviewQueue }),
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
    queryKey: [...learnerKeys.profile, session?.isPreview ? 'preview' : 'live'],
    queryFn: session?.isPreview ? previewFns.profile : getMyProfile,
    enabled: Boolean(session?.accessToken),
    ...learnerQuery,
  });
}

export function useLearnerHome() {
  const session = getSession();
  const enabled = Boolean(session?.accessToken);

  const preview = Boolean(session?.isPreview);
  const profileQuery = useQuery({
    queryKey: [...learnerKeys.profile, preview ? 'preview' : 'live'],
    queryFn: preview ? previewFns.profile : getMyProfile,
    enabled,
    ...learnerQuery,
  });
  const streakQuery = useQuery({
    queryKey: [...learnerKeys.streak, preview ? 'preview' : 'live'],
    queryFn: preview ? previewFns.streak : getStudyStreak,
    enabled,
    ...learnerQuery,
  });
  const completionQuery = useQuery({
    queryKey: [...learnerKeys.completion, preview ? 'preview' : 'live'],
    queryFn: preview ? previewFns.completion : getCompletionStats,
    enabled,
    ...learnerQuery,
  });
  const skillsQuery = useQuery({
    queryKey: [...learnerKeys.skills, preview ? 'preview' : 'live'],
    queryFn: preview ? previewFns.skills : getSkillBreakdown,
    enabled,
    ...learnerQuery,
  });
  const srsQuery = useQuery({
    queryKey: [...learnerKeys.srs, preview ? 'preview' : 'live'],
    queryFn: preview ? previewFns.srs : getDailyReviewQueue,
    enabled,
    ...learnerQuery,
  });

  const unauthorized = preview
    ? false
    : [profileQuery, streakQuery, completionQuery, skillsQuery, srsQuery].some(
      (q) => q.error?.status === 401,
    );

  return {
    session,
    profile: profileQuery.data,
    streak: streakQuery.data,
    completion: completionQuery.data,
    skills: Array.isArray(skillsQuery.data) ? skillsQuery.data : [],
    srs: srsQuery.data,
    isLoading: enabled && [profileQuery, streakQuery, completionQuery, skillsQuery, srsQuery].some((q) => q.isPending),
    unauthorized,
  };
}

export function displayName(profile, session) {
  const first = profile?.firstName?.trim();
  const last = profile?.lastName?.trim();
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || session?.fullName || session?.email || 'bạn';
}

export function greetingHonorific(profile, session) {
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
  if (jlpt) return `Học viên ${jlpt}`;
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
