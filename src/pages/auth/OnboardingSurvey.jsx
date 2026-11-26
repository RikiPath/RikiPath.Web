import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, GraduationCap, Layers, Lightbulb } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import OnboardingStepper from '@/features/auth/components/OnboardingStepper.jsx';
import OnboardingWizardNav from '@/features/auth/components/OnboardingWizardNav.jsx';
import SakuraPetalBackground from '@/features/auth/components/SakuraPetalBackground.jsx';
import {
  Step1CertificatePanel,
  Step2LevelPanel,
  Step3StudyPlanPanel,
  Step4ExamSchedulePanel,
  Step5ReviewPanel,
} from '@/features/auth/components/OnboardingStepPanels.jsx';
import {
  ONBOARDING_STEPS,
  computeStepValidity,
  formatExamSessionHeadline,
  formatStudySummaryText,
  getFurthestAccessibleStep,
} from '@/features/auth/components/onboardingWizardLogic.js';
import { notify } from '@/components/ui';
import { buildLearningGoal, isJlptExamDate } from '@/features/learning-path/utils/learningGoal.js';
import { getSession, patchSession } from '@/app/auth/session.js';
import { queryClient } from '@/api/queryClient.js';
import { learningMomentsKey } from '@/features/learning-moments/learningMomentsApi.js';
import { useSetJlptGoalMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import { getPlacementStatus } from '@/features/placement/api/placementApi.js';
import {
  invalidateLearnerSetupQueries,
  placementStatusQueryKey,
} from '@/features/learning-path/useLearningPathAccess.js';
import {
  useCertificateLevelsQuery,
  useCertificateTypesQuery,
} from '@/features/learning-path/hooks/useCertificates.js';
import { useLocale } from '@/locales/locale.js';

export default function OnboardingSurvey() {
  const { tr } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const profileQuery = useLearnerProfile();
  const profile = profileQuery.data;
  const placementStatusQuery = useQuery({
    queryKey: placementStatusQueryKey(session?.userId),
    queryFn: () => getPlacementStatus(),
    enabled: Boolean(session?.accessToken && !session?.isPreview),
    staleTime: 30_000,
    retry: false,
  });
  const placementStatus = placementStatusQuery.data ?? null;
  const goalMutation = useSetJlptGoalMutation();

  // Wizard step state (persists user inputs across all step switches)
  const [stepIndex, setStepIndex] = useState(0);
  const [transitionDir, setTransitionDir] = useState('forward');
  const didNavigateRef = useRef(false);
  const stepHeadingRef = useRef(null);

  // 1. Fetch active certificate types from API (zero hardcoded certificate lists)
  const {
    data: certificateTypes = [],
    isLoading: loadingTypes,
    error: typesError,
    refetch: refetchTypes,
  } = useCertificateTypesQuery();

  const [selectedCertIdState, setSelectedCertIdState] = useState(null);
  const hasExistingProfileGoal = Boolean(profile?.targetJlptLevelId || profile?.targetCertificateTypeId);
  const candidateCertId = selectedCertIdState
    ?? profile?.targetCertificateTypeId
    ?? (hasExistingProfileGoal ? certificateTypes[0]?.id : null);

  const activeCertId = candidateCertId && certificateTypes.some((c) => c.id === candidateCertId)
    ? candidateCertId
    : null;

  const selectedCert = certificateTypes.find((c) => c.id === activeCertId) || null;
  const isJlpt = selectedCert?.name?.trim().toUpperCase() === 'JLPT';

  // 2. Fetch levels for selected certificate
  const {
    data: certificateLevels = [],
    isLoading: loadingLevels,
    error: levelsError,
    refetch: refetchLevels,
  } = useCertificateLevelsQuery(activeCertId);

  const levels = isJlpt
    ? certificateLevels.filter((level) => ['N5', 'N4', 'N3', 'N2'].includes(level.code?.trim().toUpperCase()))
    : certificateLevels;

  const [selectedLevelIdState, setSelectedLevelIdState] = useState(null);
  const preferredLevelId = selectedCertIdState !== null
    ? selectedLevelIdState
    : (selectedLevelIdState ?? profile?.targetJlptLevelId);
  const activeLevelId = levels.find((level) => level.id === preferredLevelId)?.id ?? null;
  const selectedLevel = levels.find((l) => l.id === activeLevelId) || null;
  const targetCode = selectedLevel?.code?.trim().toUpperCase();

  // Prior self-declared JLPT certificate dependency
  const comparisonLevel = { N1: 'N2', N2: 'N3', N3: 'N4', N4: 'N5' }[targetCode];
  const heldOptionsByTarget = { N1: ['N5', 'N4', 'N3', 'N2'], N2: ['N5', 'N4', 'N3'], N3: ['N5', 'N4'], N4: ['N5'] };
  const heldOptions = isJlpt ? (heldOptionsByTarget[targetCode] ?? []) : [];
  const [heldOverride, setHeldOverride] = useState(null);
  const savedCertificate = profile?.declaredJlptCertificateCode;
  const keepSavedCertificate = targetCode === 'N4' && heldOverride === null
    && ['N4', 'N3', 'N2'].includes(savedCertificate);
  const declaredCertificate = heldOverride ?? (keepSavedCertificate ? 'NONE' : savedCertificate) ?? 'NONE';
  const hasCertificate = declaredCertificate !== 'NONE';
  const heldCode = heldOptions.includes(declaredCertificate) ? declaredCertificate : '';
  const needsCertificateChoice = heldOptions.length > 0 && hasCertificate && !heldCode;

  // 3. Daily study plan state (fixed vs range)
  const [minutesOverride, setMinutes] = useState(null);
  const minutes = minutesOverride ?? (profile?.dailyStudyMinutesMin || profile?.dailyStudyMinutes || 30);
  const [timeModeOverride, setTimeMode] = useState(null);
  const timeMode = timeModeOverride
    ?? (profile?.dailyStudyMinutesMin != null && profile?.dailyStudyMinutesMax > profile.dailyStudyMinutesMin
      ? 'range'
      : 'fixed');
  const [maxMinutesOverride, setMaxMinutes] = useState(null);
  const maxMinutes = maxMinutesOverride ?? (profile?.dailyStudyMinutesMax || profile?.dailyStudyMinutes || 60);

  // 4. Optional exam schedule state
  const [dateOverride, setExamDate] = useState(null);
  const examDate = dateOverride ?? (profile?.targetExamDate?.slice(0, 10) || '');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // Submission & feedback state
  const [error, setError] = useState('');
  const [savingMode, setSavingMode] = useState(null);
  const submittingRef = useRef(false);

  const busy = Boolean(savingMode) || loadingTypes || loadingLevels || profileQuery.isLoading;

  // Per-step validation & reachable navigation bounds
  const stepValidity = useMemo(
    () =>
      computeStepValidity({
        activeCertId,
        activeLevelId,
        loadingTypes,
        typesError,
        loadingLevels,
        levelsError,
        needsCertificateChoice,
        timeMode,
        minutes,
        maxMinutes,
        examDate,
        today,
        isJlpt,
      }),
    [
      activeCertId,
      activeLevelId,
      loadingTypes,
      typesError,
      loadingLevels,
      levelsError,
      needsCertificateChoice,
      timeMode,
      minutes,
      maxMinutes,
      examDate,
      today,
      isJlpt,
    ],
  );

  const furthestAccessibleStep = useMemo(
    () => getFurthestAccessibleStep(stepValidity),
    [stepValidity],
  );

  const currentStep = ONBOARDING_STEPS[stepIndex] || ONBOARDING_STEPS[0];
  const currentValidity = stepValidity[stepIndex] || { valid: false, message: '' };
  const canAdvanceCurrent = Boolean(currentValidity.valid);

  useEffect(() => {
    if (!didNavigateRef.current) return;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [stepIndex]);

  function clearFeedback() {
    setError('');
  }

  function handleSelectCert(certId) {
    if (certId !== activeCertId) {
      setSelectedCertIdState(certId);
      setSelectedLevelIdState(null);
      setHeldOverride(null);
    }
    clearFeedback();
  }

  function handleSelectLevel(levelId) {
    setSelectedLevelIdState(levelId);
    clearFeedback();
  }

  function goToStep(nextIndex) {
    if (savingMode || nextIndex < 0 || nextIndex >= ONBOARDING_STEPS.length) return;
    if (nextIndex > furthestAccessibleStep) return;
    didNavigateRef.current = true;
    setTransitionDir(nextIndex >= stepIndex ? 'forward' : 'backward');
    setStepIndex(nextIndex);
    setError('');
  }

  function handleNext() {
    if (!canAdvanceCurrent || stepIndex >= ONBOARDING_STEPS.length - 1) return;
    goToStep(stepIndex + 1);
  }

  function handlePrevious() {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }

  function skipForNow() {
    if (savingMode) return;
    patchSession({ skipOnboarding: true });
    navigate('/app', { replace: true });
  }

  /**
   * "Xác nhận mục tiêu": validate → save the goal (server records the goal-confirmed journey event) → refresh the
   * learner caches → go to the Dashboard. The celebration is a server Learning Moment shown by the Dashboard once
   * it has loaded; onboarding itself shows no intermediate popup and never starts the placement test on its own.
   */
  async function confirmGoal() {
    if (savingMode || submittingRef.current) return;

    let payload;
    try {
      if (needsCertificateChoice) {
        throw new Error('Vui lòng chọn chứng chỉ JLPT cao nhất bạn đã có.');
      }
      payload = buildLearningGoal(
        {
          certificateTypeId: activeCertId,
          levelId: activeLevelId,
          minMinutes: minutes,
          maxMinutes,
          timeMode,
          certificateTypeName: selectedCert?.name,
          examDate: dateOverride ?? (isJlpt && examDate && !isJlptExamDate(examDate) ? examDate : undefined),
        },
        today,
      );
      if (heldOptions.length && !keepSavedCertificate) {
        payload.declaredJlptCertificateCode = hasCertificate ? heldCode : 'NONE';
      }
      payload.confirmedFromOnboarding = true;
    } catch (validationError) {
      setError(tr(validationError.message));
      return;
    }

    setError('');
    submittingRef.current = true;
    setSavingMode('confirm');
    try {
      await goalMutation.mutateAsync(payload);
      patchSession({ skipOnboarding: false });
      await invalidateLearnerSetupQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: learningMomentsKey });
      const rawReturn = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '';
      const destination = rawReturn && !rawReturn.startsWith('/onboarding') && !rawReturn.startsWith('/auth')
        ? rawReturn
        : '/app';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(tr('Không lưu được mục tiêu. Vui lòng thử lại.'));
      notify.apiError(err, tr('Không lưu được mục tiêu'), { key: 'onboarding-goal-error' });
      submittingRef.current = false;
      setSavingMode(null);
    }
  }

  if (!session?.accessToken) {
    return <Navigate to="/auth" replace />;
  }

  const examContext = formatExamSessionHeadline(examDate);
  const studySummaryText = formatStudySummaryText({ timeMode, minutes, maxMinutes });

  return (
    <div
      data-page="OnboardingSurvey"
      className="relative isolate flex min-h-dvh items-center justify-center px-3 py-4 text-rp-text sm:px-6 lg:px-8 lg:py-4"
    >
      <SakuraPetalBackground />

      <main
        className="rp-card-enter grid w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-[#F0E2E5] bg-white shadow-[0_26px_70px_-28px_rgba(120,40,70,0.24),0_2px_10px_rgba(45,40,42,0.04)] lg:min-h-[540px] lg:max-h-[calc(100dvh-2rem)] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(285px,0.82fr)_minmax(0,1.48fr)]"
      >
        {/* Left Panel (Desktop Branding & Live Onboarding Context) */}
        <aside className="relative hidden min-h-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#C84666] via-[#B53D5C] to-[#9E3350] p-6 text-white lg:flex xl:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/[0.08]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full border border-white/[0.08]"
          />

          <div>
            <Link
              to="/"
              className="rp-focus inline-flex w-fit items-center gap-2.5 rounded-lg"
            >
              <BrandMark className="h-9 w-13 xl:h-10 xl:w-14" />
              <span className="text-[20px] font-bold tracking-tight text-white xl:text-[21px]">RikiPath</span>
            </Link>

            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#F4CAD6] xl:mt-7 xl:text-[12px]">
              {tr('Thiết lập mục tiêu ôn luyện')}
            </p>

            <h1 className="mt-2 max-w-[300px] text-[26px] font-bold leading-[1.2] tracking-tight text-white xl:mt-2.5 xl:text-[30px]">
              {tr('Bắt đầu từ mục tiêu của bạn.')}
            </h1>

            <p className="mt-2.5 max-w-[300px] text-[12.5px] leading-5 text-[#F1D8E0] xl:mt-3 xl:text-[13px] xl:leading-6">
              {tr('Chọn chứng chỉ, cấp độ và nhịp độ phù hợp để RikiPath đồng hành cùng lộ trình học tiếng Nhật của bạn.')}
            </p>
          </div>

          {/* Live Onboarding Context Snapshot */}
          <div className="my-3.5 rounded-2xl border border-white/15 bg-white/[0.09] p-3.5 backdrop-blur-xs xl:my-5 xl:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F4CAD6]">
              {tr('Lựa chọn hiện tại')}
            </p>

            <dl className="mt-3 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-[#EBC7D2]">
                  <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tr('Chứng chỉ')}</span>
                </dt>
                <dd className="truncate font-semibold text-white">
                  {selectedCert?.name || tr('Chưa chọn')}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-[#EBC7D2]">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tr('Cấp độ')}</span>
                </dt>
                <dd className="truncate font-semibold text-white">
                  {selectedLevel
                    ? `${selectedCert?.name ? `${selectedCert.name} ` : ''}${selectedLevel.code || selectedLevel.name}`
                    : tr('Chưa chọn')}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-[#EBC7D2]">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tr('Thời gian')}</span>
                </dt>
                <dd className="truncate font-semibold text-white tabular-nums">
                  {studySummaryText ? `${studySummaryText} ${tr('phút/ngày')}` : tr('Chưa chọn')}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-[#EBC7D2]">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tr('Lịch thi')}</span>
                </dt>
                <dd className="truncate font-semibold text-white tabular-nums">
                  {examContext ? examContext.dateText : tr('Tùy chọn')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex items-start gap-2.5 border-t border-white/15 pt-4 text-[12px] leading-5 text-[#EBD0D9]">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD9E3]" aria-hidden="true" />
            <p>{tr(currentStep.tip)}</p>
          </div>
        </aside>

        {/* Right Panel — Interactive 5-Step Wizard */}
        <section className="flex min-h-0 min-w-0 flex-col bg-white p-3.5 sm:p-6 lg:px-7 lg:py-5 xl:p-8">
          {/* Header: compact mobile brand + utility bar + skip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 xl:pb-4">
            <Link
              to="/"
              className="rp-focus flex items-center gap-2 rounded-lg lg:hidden"
            >
              <BrandMark className="h-8 w-11" />
              <span className="text-[18px] font-bold tracking-tight text-rp-brand-strong">
                RikiPath
              </span>
            </Link>

            <div className="hidden text-[12px] font-medium text-rp-text-muted lg:block">
              {tr('Thiết lập mục tiêu học tập')}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitch />
              <button
                type="button"
                disabled={Boolean(savingMode)}
                onClick={skipForNow}
                className="rp-focus rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-40"
              >
                {tr('Để sau, vào trang chủ')}
              </button>
            </div>
          </div>

          {/* Horizontal 5-step progress stepper */}
          <OnboardingStepper
            steps={ONBOARDING_STEPS}
            currentStepIndex={stepIndex}
            furthestAccessibleStep={furthestAccessibleStep}
            stepValidity={stepValidity}
            onSelectStep={goToStep}
            disabled={Boolean(savingMode)}
            className="border-b border-rp-line pb-3 xl:pb-4"
          />

          {/* Scrollable step workspace (fits comfortably on Desktop; controlled scroll on zoomed/compact screens) */}
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-3.5 xl:py-5">
            <div
              key={`${currentStep.id}-${transitionDir}`}
              className={
                transitionDir === 'backward'
                  ? 'rp-onboarding-step-backward min-w-0 space-y-4'
                  : 'rp-onboarding-step-forward min-w-0 space-y-4'
              }
            >
              <header>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-[22px] font-bold leading-tight tracking-tight text-rp-text focus:outline-none sm:text-[25px]"
                >
                  {tr(currentStep.title)}
                </h2>
                <p className="mt-1.5 text-[13px] leading-5 text-rp-text-muted">
                  {tr(currentStep.subtitle)}
                </p>
              </header>

              {stepIndex === 0 && (
                <Step1CertificatePanel
                  certificateTypes={certificateTypes}
                  activeCertId={activeCertId}
                  loadingTypes={loadingTypes}
                  typesError={typesError}
                  busy={Boolean(savingMode)}
                  onSelectCert={handleSelectCert}
                  onRefetchTypes={refetchTypes}
                />
              )}

              {stepIndex === 1 && (
                <Step2LevelPanel
                  profile={profile}
                  placementStatus={placementStatus}
                  selectedCert={selectedCert}
                  levels={levels}
                  activeLevelId={activeLevelId}
                  loadingLevels={loadingLevels}
                  levelsError={levelsError}
                  busy={Boolean(savingMode)}
                  heldOptions={heldOptions}
                  targetCode={targetCode}
                  comparisonLevel={comparisonLevel}
                  hasCertificate={hasCertificate}
                  heldCode={heldCode}
                  needsCertificateChoice={needsCertificateChoice}
                  onSelectLevel={handleSelectLevel}
                  onRefetchLevels={refetchLevels}
                  onToggleHasCertificate={(checked) => {
                    setHeldOverride(checked ? '' : 'NONE');
                    clearFeedback();
                  }}
                  onSelectHeldCode={(code) => {
                    setHeldOverride(code);
                    clearFeedback();
                  }}
                />
              )}

              {stepIndex === 2 && (
                <Step3StudyPlanPanel
                  timeMode={timeMode}
                  minutes={minutes}
                  maxMinutes={maxMinutes}
                  busy={Boolean(savingMode)}
                  validationMessage={!currentValidity.valid ? currentValidity.message : ''}
                  onChangeTimeMode={(mode) => {
                    setTimeMode(mode);
                    clearFeedback();
                  }}
                  onChangeMinutes={(val) => {
                    setMinutes(val);
                    clearFeedback();
                  }}
                  onChangeMaxMinutes={(val) => {
                    setMaxMinutes(val);
                    clearFeedback();
                  }}
                />
              )}

              {stepIndex === 3 && (
                <Step4ExamSchedulePanel
                  isJlpt={isJlpt}
                  examDate={examDate}
                  today={today}
                  busy={Boolean(savingMode)}
                  validationMessage={!currentValidity.valid ? currentValidity.message : ''}
                  onChangeExamDate={(val) => {
                    setExamDate(val);
                    clearFeedback();
                  }}
                />
              )}

              {stepIndex === 4 && (
                <Step5ReviewPanel
                  selectedCert={selectedCert}
                  selectedLevel={selectedLevel}
                  hasHeldCertificate={hasCertificate}
                  heldCode={heldCode}
                  timeMode={timeMode}
                  minutes={minutes}
                  maxMinutes={maxMinutes}
                  examDate={examDate}
                  error={error}
                  profileError={profileQuery.isError}
                  busy={busy}
                  onJumpToStep={goToStep}
                  onRetryProfile={() => profileQuery.refetch()}
                />
              )}
            </div>
          </div>

          {/* Sticky bottom wizard footer */}
          <OnboardingWizardNav
            currentStepIndex={stepIndex}
            totalSteps={ONBOARDING_STEPS.length}
            canAdvance={canAdvanceCurrent}
            busy={busy && !savingMode ? false : Boolean(savingMode)}
            savingMode={savingMode}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onConfirm={confirmGoal}
          />
        </section>
      </main>

    </div>
  );
}
