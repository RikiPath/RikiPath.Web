import { Navigate } from 'react-router-dom';
import { displayName, useLearnerHome } from '../../hooks/useLearnerHome.js';
import HomeLearner from './HomeLearner.jsx';

function skillScore(skills, pattern) {
  const skill = skills.find((item) => pattern.test(item.skillName || ''));
  const score = skill?.averageScore;
  return typeof score === 'number' && Number.isFinite(score) ? score : undefined;
}

export default function Dashboard() {
  const home = useLearnerHome();

  if (!home.session?.accessToken || home.unauthorized) {
    return <Navigate to="/auth" replace />;
  }

  if (
    !home.isLoading &&
    home.profile &&
    !home.profile.targetJlptLevelId &&
    !home.session?.skipOnboarding
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  const name = home.profile?.firstName?.trim() || displayName(home.profile, home.session);

  return (
    <HomeLearner
      data={{
        displayName: name && name !== 'bạn' ? name : undefined,
        targetLevel: home.profile?.targetJlptLevelName,
        completedExercises: home.completion?.completedLessons,
        streakDays: home.streak?.currentStreakDays,
        dueCards: home.srs?.totalDue ?? home.srs?.items?.length,
        skillScores: {
          vocabulary: skillScore(home.skills, /từ|vocab/i),
          grammar: skillScore(home.skills, /ngữ pháp|grammar/i),
          reading: skillScore(home.skills, /đọc|reading/i),
          listening: skillScore(home.skills, /nghe|listen/i),
        },
      }}
    />
  );
}
