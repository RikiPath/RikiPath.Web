import { Navigate } from 'react-router-dom';
import { displayName, useLearnerHome } from '@/features/dashboard/hooks/useLearnerHome.js';
import HomeLearner from './HomeLearner.jsx';

function skillScore(skills, pattern) {
  const skill = skills.find((item) => pattern.test(item.languageSkillName || item.skillName || ''));
  const score = skill?.averageScore;
  return typeof score === 'number' && Number.isFinite(score) ? score : undefined;
}

export default function Dashboard() {
  const home = useLearnerHome();

  if (!home.session?.accessToken || home.unauthorized) {
    return <Navigate to="/auth" replace />;
  }

  const name = displayName(home.profile, home.session);
  const setupState = home.profile?.setupState ?? null;
  const hasValidRoadmap = setupState
    ? Boolean(setupState.hasAnyValidRoadmap)
    : Boolean(home.completion?.hasValidRoadmap);

  return (
    <HomeLearner
      data={{
        displayName: name && name !== 'bạn' ? name : undefined,
        targetLevel: home.profile?.targetJlptLevelName,
        setupState,
        hasValidRoadmap,
        completedExercises: hasValidRoadmap ? (setupState?.roadmapCompletedLessons ?? home.completion?.completedLessons) : null,
        totalLessons: hasValidRoadmap ? (setupState?.roadmapTotalLessons ?? home.completion?.totalLessons) : null,
        streakDays: home.streak?.currentStreakDays,
        longestStreakDays: home.streak?.longestStreakDays,
        lastActivityDate: home.streak?.lastActivityDate,
        activeToday: Boolean(home.streak?.isActiveToday),
        dueCards: home.srs?.totalDue ?? home.srs?.items?.length,
        srsItems: home.srs?.items ?? [],
        rawSkills: home.skills ?? [],
        skillScores: {
          vocabulary: skillScore(home.skills, /từ|vocab/i),
          grammar: skillScore(home.skills, /ngữ pháp|grammar/i),
          reading: skillScore(home.skills, /đọc|reading/i),
          listening: skillScore(home.skills, /nghe|listen/i),
          writing: skillScore(home.skills, /viết|writ/i),
          speaking: skillScore(home.skills, /nói|speak/i),
        },
        loading: {
          profile: home.profileQuery.isPending,
          streak: home.streakQuery.isPending,
          completion: home.completionQuery.isPending,
          skills: home.skillsQuery.isPending,
          srs: home.srsQuery.isPending,
        },
        errors: home.errors,
        queries: {
          profile: home.profileQuery,
          streak: home.streakQuery,
          completion: home.completionQuery,
          skills: home.skillsQuery,
          srs: home.srsQuery,
        },
        refreshing: home.isRefreshing,
        fetching: {
          skills: home.skillsQuery.isFetching,
          srs: home.srsQuery.isFetching,
        },
        onRetry: {
          streak: () => home.streakQuery.refetch(),
          completion: () => home.completionQuery.refetch(),
          skills: () => home.skillsQuery.refetch(),
          srs: () => home.srsQuery.refetch(),
          profile: () => home.profileQuery.refetch(),
        },
      }}
    />
  );
}
