import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import { useLocale } from '@/locales/locale.js';
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import JlptExamDatePicker from '@/features/auth/components/JlptExamDatePicker.jsx';
import { notify } from '@/components/ui/feedbackStore.js';
import { buildLearningGoal, isJlptExamDate } from '@/features/learning-path/utils/learningGoal.js';
import { getSession, patchSession } from '@/app/auth/session.js';
import { queryClient } from '@/api/queryClient.js';
import { getPlacementStatus, placementAssessmentKey, startPlacementAttempt } from '@/features/placement/api/placementApi.js';
import { useSetJlptGoalMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import {
  useCertificateTypesQuery,
  useCertificateLevelsQuery,
} from '@/features/learning-path/hooks/useCertificates.js';
import { SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';


// Fallback mô tả cấp độ nếu DB chưa có mô tả chi tiết
const LEVEL_FALLBACKS = {
  N5: { title: 'Ôn luyện nền tảng', desc: 'Từ vựng, chữ Hán và mẫu câu cơ bản.' },
  N4: { title: 'Củng cố sơ cấp', desc: 'Ôn kiến thức và các tình huống quen thuộc.' },
  N3: { title: 'Ôn luyện trung cấp', desc: 'Mở rộng từ vựng, luyện đọc và nghe hiểu.' },
  N2: { title: 'Nâng cao năng lực', desc: 'Luyện hiểu văn bản dài và chủ đề đa dạng.' },
};


export default function OnboardingSurvey() {
  const { trf, tr } = useLocale();
  const navigate = useNavigate();
  const session = getSession();
  const profileQuery = useLearnerProfile();
  const profile = profileQuery.data;
  const goalMutation = useSetJlptGoalMutation();

  // 1. Lấy danh sách chứng chỉ đang hoạt động từ API
  const {
    data: certificateTypes = [],
    isLoading: loadingTypes,
    error: typesError,
    refetch: refetchTypes,
  } = useCertificateTypesQuery();

  // State chọn chứng chỉ
  const [selectedCertIdState, setSelectedCertIdState] = useState(null);

  // Xác định certificateTypeId được chọn (ưu tiên state người dùng, nếu chưa có thì lấy phần tử đầu tiên)
  const activeCertId =
    (selectedCertIdState ?? profile?.targetCertificateTypeId) && certificateTypes.some((c) => c.id === (selectedCertIdState ?? profile?.targetCertificateTypeId))
      ? (selectedCertIdState ?? profile?.targetCertificateTypeId)
      : certificateTypes[0]?.id ?? null;

  const selectedCert = certificateTypes.find((c) => c.id === activeCertId) || null;
  const isJlpt = selectedCert?.name?.trim().toUpperCase() === 'JLPT';

  // 2. Lấy danh sách cấp độ theo chứng chỉ đã chọn
  const {
    data: certificateLevels = [],
    isLoading: loadingLevels,
    error: levelsError,
    refetch: refetchLevels,
  } = useCertificateLevelsQuery(activeCertId);
  const levels = selectedCert?.name?.trim().toUpperCase() === 'JLPT'
    ? certificateLevels.filter((level) => ['N5', 'N4', 'N3', 'N2'].includes(level.code?.trim().toUpperCase()))
    : certificateLevels;

  // State chọn cấp độ & thời gian
  const [selectedLevelIdState, setSelectedLevelIdState] = useState(null);
  const [minutesOverride, setMinutes] = useState(null);
  const minutes = minutesOverride ?? (profile?.dailyStudyMinutesMin || profile?.dailyStudyMinutes || 30);
  const [timeModeOverride, setTimeMode] = useState(null);
  const timeMode = timeModeOverride ?? (profile?.dailyStudyMinutesMin != null && profile?.dailyStudyMinutesMax > profile.dailyStudyMinutesMin ? 'range' : 'fixed');
  const [maxMinutesOverride, setMaxMinutes] = useState(null);
  const maxMinutes = maxMinutesOverride ?? (profile?.dailyStudyMinutesMax || profile?.dailyStudyMinutes || 60);
  const [dateOverride, setExamDate] = useState(null);
  const examDate = dateOverride ?? (profile?.targetExamDate?.slice(0, 10) || '');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [error, setError] = useState('');
  const [startingAssessment, setStartingAssessment] = useState(false);
  const submitting = useRef(false);

  // Xác định levelId được chọn (nếu chưa chọn hoặc level đã chọn không thuộc cert mới thì lấy level đầu tiên)
  const preferredLevelId = selectedLevelIdState ?? profile?.targetJlptLevelId;
  const activeLevelId = levels.find((level) => level.id === preferredLevelId)?.id ?? levels[0]?.id ?? null;

  const selectedLevel = levels.find((l) => l.id === activeLevelId) || null;
  const targetCode = selectedLevel?.code?.trim().toUpperCase();
  const comparisonLevel = { N2: 'N3', N3: 'N4', N4: 'N5' }[targetCode];
  const heldOptionsByTarget = { N2: ['N5', 'N4', 'N3'], N3: ['N5', 'N4'], N4: ['N5'] };
  const heldOptions = isJlpt ? (heldOptionsByTarget[targetCode] ?? []) : [];
  const [heldOverride, setHeldOverride] = useState(null);
  const savedCertificate = profile?.declaredJlptCertificateCode;
  const keepSavedCertificate = targetCode === 'N4' && heldOverride === null
    && ['N4', 'N3', 'N2'].includes(savedCertificate);
  const declaredCertificate = heldOverride ?? (keepSavedCertificate ? 'NONE' : savedCertificate) ?? 'NONE';
  const hasCertificate = declaredCertificate !== 'NONE';
  const heldCode = heldOptions.includes(declaredCertificate) ? declaredCertificate : '';
  const needsCertificateChoice = heldOptions.length > 0 && hasCertificate && !heldCode;


  const saving = goalMutation.isPending || startingAssessment;
  const busy =
    saving ||
    loadingTypes ||
    loadingLevels ||
    profileQuery.isLoading;

  function handleSelectCert(certId) {
    if (certId === activeCertId) return;
    setSelectedCertIdState(certId);
    setSelectedLevelIdState(null); // Reset level để chọn level đầu tiên của cert mới
    setError('');
  }

  function handleSelectLevel(lvlId) {
    setSelectedLevelIdState(lvlId);
    setError('');
  }

  function skipForNow() {
    if (saving) return;
    patchSession({ skipOnboarding: true });
    navigate('/app', { replace: true });
  }

  async function handleSubmit(event, saveOnly = false) {
    event.preventDefault();
    if (saving || submitting.current) return;

    let payload;
    try {
      if (needsCertificateChoice) throw new Error('Vui lòng chọn chứng chỉ JLPT cao nhất bạn đã có.');
      if (!saveOnly && !examDate) throw new Error('Vui lòng chọn ngày dự định thi trước khi làm bài đánh giá.');
      payload = buildLearningGoal({ certificateTypeId: activeCertId, levelId: activeLevelId, minMinutes: minutes, maxMinutes, timeMode, certificateTypeName: selectedCert?.name,
        examDate: dateOverride ?? (isJlpt && examDate && !isJlptExamDate(examDate) ? examDate : undefined),
      }, today);
      if (heldOptions.length && !keepSavedCertificate) {
        payload.declaredJlptCertificateCode = hasCertificate ? heldCode : 'NONE';
      }
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    setError('');

    submitting.current = true;
    let goalSaved = false;
    try {
      const savedProfile = await goalMutation.mutateAsync(payload);
      goalSaved = true;
      patchSession({ skipOnboarding: false });
      if (saveOnly) {
        notify.success(tr('Đã cập nhật mục tiêu JLPT.'), '', { key: 'jlpt-goal-saved' });
        navigate('/app', { replace: true });
        return;
      }

      const status = {
        targetJlptLevelId: activeLevelId,
        targetJlptLevelName: savedProfile?.targetJlptLevelName || selectedLevel?.code,
      };
      setStartingAssessment(true);
      const current = await getPlacementStatus();
      if (current.hasActiveAttempt || current.latestCompletedAttemptId || current.attemptAllowance?.started > 0) {
        notify.success(tr('Đã lưu mục tiêu học tập.'), tr('Đang mở bài đánh giá năng lực phù hợp.'), { key: 'jlpt-goal-saved' });
        navigate('/app/placement-test/', { replace: true });
        return;
      }
      const attempt = await startPlacementAttempt();
      queryClient.setQueryData(placementAssessmentKey(session, attempt.attemptId), {
        attempt,
        status: { ...current, ...status },
      });
      notify.success(tr('Đã lưu mục tiêu JLPT.'), tr('Bắt đầu bài đánh giá năng lực ngay bây giờ.'), { key: 'jlpt-goal-saved' });
      navigate(`/app/placement-test/?attemptId=${attempt.attemptId}`, { replace: true });
    } catch (err) {
      const fallback = goalSaved ? 'Vui lòng thử bắt đầu lại.' : 'Không lưu được mục tiêu. Vui lòng thử lại.';
      setError(`${goalSaved ? 'Mục tiêu đã lưu. ' : ''}${err?.message || fallback}`);
      if (goalSaved) {
        notify.warning(tr('Mục tiêu đã được lưu'), err?.message || fallback, { key: 'onboarding-goal-partial' });
      } else {
        notify.apiError(err, tr('Không lưu được mục tiêu'), { key: 'onboarding-goal-error' });
      }
    } finally {
      submitting.current = false;
      setStartingAssessment(false);
    }
  }

  if (!session?.accessToken) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div
      data-page="OnboardingSurvey"
      className="flex min-h-dvh items-center justify-center
                 bg-rp-brand-tint px-[var(--rp-space-page-x)] py-[var(--rp-space-page-y)]
                 text-rp-text"
    >
      <main
        className="grid w-full max-w-[1160px] overflow-hidden
                   rounded-[24px] border border-rp-line
                   bg-white shadow-[0_12px_48px_rgba(75,42,55,0.06)]
                   lg:grid-cols-[0.8fr_1.4fr]"
      >
        {/* Cột giới thiệu bên trái */}
        <aside
          className="relative flex flex-col overflow-hidden
                     bg-rp-brand-strong p-[var(--rp-space-card-pad)] text-white
                     lg:p-9"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24
                       -top-24 h-72 w-72 rounded-full
                       border border-white/[0.07]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32
                       -left-24 h-80 w-80 rounded-full
                       border border-white/[0.07]"
          />

          <Link
            to="/"
            className="relative inline-flex w-fit items-center
                       gap-2.5 rounded-lg
                       focus-visible:outline-none
                       focus-visible:ring-2
                       focus-visible:ring-white/70"
          >
            <BrandMark className="h-11 w-16" />

            <span className="text-[21px] font-semibold tracking-tight">
              RikiPath
            </span>
          </Link>

          <div className="relative mt-7 lg:mt-10">
            <p className="text-[12px] font-medium text-[#EBC7D2]">
              {tr('Thiết lập mục tiêu ôn luyện')}
            </p>

            <h1
              className="mt-3 max-w-[330px] text-[30px]
                         font-semibold leading-[1.25]
                         tracking-tight lg:text-[34px]"
            >
              {tr('Bắt đầu từ')}
              <br />
              {tr('mục tiêu của bạn.')}
            </h1>

            <p
              className="mt-4 max-w-[320px] text-[13px]
                         leading-6 text-[#EDD4DC]"
            >
              {tr('Chọn chứng chỉ, cấp độ và thời lượng phù hợp để bắt đầu lộ trình ôn luyện cá nhân hóa cùng RikiPath.')}
            </p>
          </div>

          <ol className="relative mt-7 hidden space-y-4 lg:block">
            {[
              ['01', 'Chọn chứng chỉ & cấp độ', 'Xác định mục tiêu học tập theo chứng chỉ.'],
              ['02', 'Chọn thời gian', 'Dành thời gian ôn luyện đều đặn mỗi ngày.'],
              ['03', 'Bắt đầu ôn luyện', 'Làm bài đánh giá và nhận lộ trình tối ưu.'],
            ].map(([number, title, description]) => (
              <li key={number} className="flex items-start gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center
                             justify-center rounded-full
                             border border-white/20
                             text-[11px] text-[#EBC7D2]"
                >
                  {number}
                </span>

                <div className="pt-0.5">
                  <p className="text-[13px] font-medium">{tr(title)}</p>
                  <p className="mt-1 text-[12px] text-[#DFC0CB]">
                    {tr(description)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div
            className="relative mt-auto hidden items-start gap-2
                       border-t border-white/15 pt-4
                       text-[12px] leading-5 text-[#E7CBD5]
                       lg:flex"
          >
            <Icon
              name="lightbulb"
              className="mt-0.5 shrink-0 text-[18px]"
            />
            <p>
              {tr('Chọn thời lượng bạn có thể duy trì đều đặn mỗi ngày để đạt hiệu quả cao nhất.')}
            </p>
          </div>
        </aside>

        {/* Khối chọn mục tiêu bên phải */}
        <section className="px-5 py-6 sm:p-8 lg:px-9 lg:py-8">
          <div className="mb-4 flex justify-end">
            <LanguageSwitch />
          </div>
          <header>
            <p className="text-[12px] font-medium text-rp-brand-strong">
              {tr('Thiết lập mục tiêu học tập')}
            </p>

            <h2
              className="mt-2 text-[25px] font-semibold
                         leading-tight tracking-tight sm:text-[28px]"
            >
              {tr('Bạn muốn ôn luyện mục tiêu nào?')}
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-rp-text-muted">
              {tr('Chọn chứng chỉ và cấp độ bạn đang hướng đến.')}
            </p>
          </header>

          {profile?.targetJlptLevelId && <div className="mt-4 rounded-xl bg-rp-brand-tint p-3 text-[13px] text-rp-brand-strong">
            <Link to="/app/placement-test" className="font-semibold underline">{tr('Tiếp tục bài đánh giá hiện tại')}</Link>
            <p className="mt-1">{tr('Bạn cũng có thể cập nhật mục tiêu bên dưới. Đổi cấp độ sẽ mở đề tương ứng; khi bắt đầu đề mới, lượt cũ sẽ kết thúc và được giữ trong lịch sử.')}</p>
          </div>}
          <form onSubmit={handleSubmit} className="mt-6">
            {/* BƯỚC 1: Chọn chứng chỉ */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-rp-text">
                  {tr('1. Chọn chứng chỉ')}
                </label>
                {loadingTypes && (
                  <SakuraLoader
                    variant="inline"
                    size={16}
                    context="assessment"
                    label={tr('Đang tải chứng chỉ…')}
                    delay={160}
                  />
                )}
              </div>

              {typesError ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                  <span>{tr('Không tải được danh sách chứng chỉ.')}</span>
                  <button
                    type="button"
                    onClick={() => refetchTypes()}
                    className="font-medium underline hover:text-red-900"
                  >
                    {tr('Thử lại')}
                  </button>
                </div>
              ) : loadingTypes && certificateTypes.length === 0 ? (
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl border border-rp-line bg-rp-brand-tint"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {certificateTypes.map((cert) => {
                    const isSelected = cert.id === activeCertId;
                    return (
                      <button
                        key={cert.id}
                        type="button"
                        onClick={() => handleSelectCert(cert.id)}
                        disabled={busy}
                        className={[
                          'group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand/40',
                          'disabled:cursor-wait',
                          isSelected
                            ? 'border-rp-brand-border bg-rp-brand-tint shadow-xs'
                            : 'border-rp-line bg-white hover:border-rp-brand-border hover:bg-rp-brand-tint',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold transition-colors',
                            isSelected
                              ? 'bg-rp-brand-pressed text-white shadow-xs'
                              : 'bg-rp-brand-soft text-rp-text-2 group-hover:bg-rp-brand-soft',
                          ].join(' ')}
                        >
                          {cert.name || 'CC'}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[14px] font-semibold text-rp-text">
                              {cert.name}
                            </span>
                            <span
                              className={[
                                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors',
                                isSelected
                                  ? 'bg-rp-brand-pressed text-white'
                                  : 'border border-[#DCD1D6]',
                              ].join(' ')}
                            >
                              {isSelected && <Icon name="check" className="text-[12px]" />}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] leading-4 text-rp-text-muted line-clamp-2">
                            {cert.description || trf('Luyện thi & đánh giá chứng chỉ {0}', { 0: cert.name })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BƯỚC 2: Chọn cấp độ */}
            <fieldset disabled={busy} className="mt-5 border-t border-rp-line pt-5">
              <div className="flex items-center justify-between">
                <legend className="text-[13px] font-semibold text-rp-text">
                  {tr('2. Chọn cấp độ mục tiêu')}
                  {selectedCert?.name && (
                    <span className="ml-1 text-[12px] font-normal text-rp-text-muted">
                      {trf('(theo chứng chỉ {0})', { 0: selectedCert.name })}
                    </span>
                  )}
                </legend>

                {loadingLevels && (
                  <SakuraLoader
                    variant="inline"
                    size={16}
                    context="assessment"
                    label={tr('Đang tải cấp độ…')}
                    delay={160}
                  />
                )}
              </div>

              {levelsError ? (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                  <span>{tr('Không tải được danh sách cấp độ theo chứng chỉ.')}</span>
                  <button
                    type="button"
                    onClick={() => refetchLevels()}
                    className="font-medium underline hover:text-red-900"
                  >
                    {tr('Thử lại')}
                  </button>
                </div>
              ) : loadingLevels && levels.length === 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl border border-rp-line bg-rp-brand-tint"
                    />
                  ))}
                </div>
              ) : levels.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-rp-line bg-rp-bg-2 p-6 text-center text-[13px] text-rp-text-muted">
                  {tr('Chưa có danh sách cấp độ cho chứng chỉ này. Vui lòng chọn chứng chỉ khác.')}
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {levels.map((level) => {
                    const isSelected = activeLevelId === level.id;
                    const codeLabel = level.code || level.name || '';
                    const fallback = LEVEL_FALLBACKS[codeLabel.toUpperCase()] || {};
                    const title = fallback.title || (level.name && level.name !== codeLabel ? level.name : trf('Cấp độ {0}', { 0: codeLabel }));
                    const description = level.description || fallback.desc || 'Chương trình ôn luyện chuẩn đầu ra.';

                    return (
                      <label key={level.id} className="relative block">
                        <input
                          type="radio"
                          name="certificate-level"
                          value={level.id}
                          checked={isSelected}
                          onChange={() => handleSelectLevel(level.id)}
                          aria-describedby={`level-${level.id}-desc`}
                          className="peer sr-only"
                        />

                        <div
                          className={[
                            'flex h-full cursor-pointer items-start',
                            'gap-3 rounded-xl border p-4',
                            'transition-all duration-150',
                            'peer-focus-visible:ring-2',
                            'peer-focus-visible:ring-rp-brand/40',
                            'peer-focus-visible:ring-offset-2',
                            'peer-disabled:cursor-wait',
                            isSelected
                              ? 'border-rp-brand-border bg-rp-brand-tint shadow-xs'
                              : 'border-rp-line bg-white hover:border-rp-brand-border hover:bg-rp-brand-tint',
                          ].join(' ')}
                        >
                          <span
                            aria-hidden="true"
                            className={[
                              'flex h-10 w-10 shrink-0 items-center',
                              'justify-center rounded-[10px]',
                              'text-[14px] font-semibold transition-colors',
                              isSelected
                                ? 'bg-rp-brand-pressed text-white shadow-xs'
                                : 'bg-rp-brand-soft text-rp-text-muted',
                            ].join(' ')}
                          >
                            {codeLabel}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[14px] font-semibold text-rp-text">
                                {selectedCert?.name ? `${selectedCert.name} ${codeLabel}` : codeLabel}
                              </span>

                              <span
                                aria-hidden="true"
                                className={[
                                  'flex h-[18px] w-[18px] shrink-0',
                                  'items-center justify-center rounded-full transition-colors',
                                  isSelected
                                    ? 'bg-rp-brand-pressed text-white'
                                    : 'border border-[#DCD1D6]',
                                ].join(' ')}
                              >
                                {isSelected && (
                                  <Icon
                                    name="check"
                                    className="text-[13px]"
                                  />
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-[12px] font-medium text-rp-text-2">
                              {tr(title)}
                            </p>

                            <p
                              id={`level-${level.id}-desc`}
                              className="mt-1 text-[12px] leading-5 text-rp-text-muted"
                            >
                              {tr(description)}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {heldOptions.length > 0 && (
              <fieldset className="space-y-3 border-t border-rp-line py-5" disabled={busy}>
                <label className="flex items-center gap-2 text-sm font-semibold text-rp-text">
                  <input type="checkbox" checked={hasCertificate}
                    onChange={event => {
                      setHeldOverride(event.target.checked ? '' : 'NONE');
                      setError('');
                    }} />
                  {targetCode === 'N4' ? tr('Bạn đã có chứng chỉ JLPT N5 chưa?') : tr('Bạn đã có chứng chỉ JLPT chưa?')}
                </label>
                {hasCertificate && <label className="block space-y-1 text-sm">
                  <span>{tr('Bạn đã có chứng chỉ nào? Chọn cấp cao nhất.')}</span>
                  <select value={heldCode} required onChange={event => {
                    setHeldOverride(event.target.value);
                    setError('');
                  }} className="w-full rounded-lg border border-rp-line bg-white px-3 py-2">
                    <option value="">{tr('Chọn chứng chỉ')}</option>
                    {heldOptions.map(code => <option key={code} value={code}>JLPT {code}</option>)}
                  </select>
                </label>}
                <p className="text-xs text-rp-text-muted">
                  {tr('Bài đánh giá')}{heldCode ? tr(' rút gọn') : ''}{' '}{tr('gồm câu hỏi')}{' '}{comparisonLevel}{' '}{tr('và')}{' '}{targetCode}{' '}{tr('cho cả bốn kỹ năng.')}
                </p>
              </fieldset>
            )}

            {/* BƯỚC 3: Thời gian mỗi ngày */}
            <fieldset
              disabled={busy}
              className="mt-5 border-t border-rp-line pt-5"
            >
              <legend className="sr-only">
                {tr('Thời gian ôn luyện mỗi ngày')}
              </legend>

              <h3 className="text-[13px] font-semibold text-rp-text">
                {tr('3. Bạn dành bao nhiêu phút ôn luyện mỗi ngày?')}
              </h3>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="radio" name="study-time-mode" value="fixed" checked={timeMode === 'fixed'} onChange={() => setTimeMode('fixed')} />
                  {tr('Một mốc phút')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="radio" name="study-time-mode" value="range" checked={timeMode === 'range'} onChange={() => setTimeMode('range')} />
                  {tr('Khoảng từ–đến')}
                </label>
              </div>

              <p className="mt-2 text-[11px] text-rp-text-muted">
                {tr('Chọn thời gian phù hợp với lịch sinh hoạt để ôn luyện bền bỉ mỗi ngày.')}
              </p>
            </fieldset>

            <fieldset disabled={busy} className="mt-5 border-t border-rp-line pt-5">
              <label htmlFor="study-minutes" className="block text-[13px] font-semibold">{timeMode === 'fixed' ? tr('Số phút học mỗi ngày') : tr('Từ (phút/ngày)')}</label>
              <input id="study-minutes" type="number" min="15" max="480" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-2 w-full rounded-lg border border-rp-line p-3 text-sm" />
              {timeMode === 'range' && <>
              <label htmlFor="study-minutes-max" className="mt-4 block text-[13px] font-semibold">{tr('Đến (phút/ngày)')}</label>
              <input id="study-minutes-max" type="number" min="15" max="480" step="1" value={maxMinutes} onChange={(event) => setMaxMinutes(event.target.value)} className="mt-2 w-full rounded-lg border border-rp-line p-3 text-sm" />
              </>}
              <p className="mt-2 text-[11px] text-rp-text-muted">{timeMode === 'fixed' ? tr('Tự nhập số phút bạn có thể học mỗi ngày, từ 15 đến 480 phút.') : tr('Tự nhập khoảng thời gian từ 15 đến 480 phút. AI dùng mức tối thiểu cho nội dung cốt lõi và phần còn lại cho ôn luyện tùy chọn.')}</p>
              {isJlpt ? <JlptExamDatePicker value={examDate} today={today} onChange={setExamDate} requiredForAssessment /> : <>
                <label htmlFor="target-exam-date" className="mt-4 block text-[13px] font-semibold">{tr('Ngày dự định thi (không bắt buộc)')}</label>
                <input id="target-exam-date" type="date" value={examDate} onChange={event => setExamDate(event.target.value)} className="mt-2 w-full rounded-lg border border-rp-line p-3 text-sm" />
              </>}
              <p className="mt-2 text-[11px] text-rp-text-muted">{tr('Ngày thi và thời gian học được lưu để AI lập đề xuất lộ trình tiếp theo. Lộ trình hiện tại chưa tự động thay đổi.')}</p>
            </fieldset>
            {/* Tóm tắt */}
            <div
              className="mt-5 flex items-center gap-2.5
                         rounded-lg bg-rp-brand-tint px-3.5 py-2.5"
            >
              <Icon
                name="flag"
                className="shrink-0 text-[19px] text-rp-brand-strong"
              />

              <p className="text-[12px] text-rp-text-2">
                {tr('Mục tiêu đã chọn:')}
                <strong className="ml-1.5 font-semibold text-rp-brand-strong">
                  {selectedCert?.name || tr('Chứng chỉ')}{' '}
                  {selectedLevel ? (selectedLevel.code || selectedLevel.name) : '…'} · {timeMode === 'fixed' ? minutes : `${minutes}–${maxMinutes}`}{' '}{tr('phút/ngày')}
                </strong>
              </p>
            </div>

            {profileQuery.isError && <p role="alert" className="mt-3 text-sm text-red-700">{tr('Không tải được mục tiêu hiện tại.')}{' '}<button type="button" onClick={() => profileQuery.refetch()} className="underline">{tr('Thử lại')}</button></p>}
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-rp-brand-tint
                           px-3 py-2.5 text-[12px]
                           leading-5 text-rp-brand-strong"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !activeLevelId}
              className="mt-5 flex h-11 w-full items-center
                         justify-center gap-2 rounded-[10px]
                         bg-rp-brand-pressed px-4 text-[14px]
                         font-semibold text-white
                         transition-all hover:bg-rp-brand
                         focus-visible:outline-none
                         focus-visible:ring-2
                         focus-visible:ring-rp-brand/40
                         focus-visible:ring-offset-2
                         disabled:cursor-not-allowed disabled:opacity-60 rp-press"
            >
              {saving ? (
                <SakuraLoader
                  variant="inline"
                  size={18}
                  tone="light"
                  context="assessment"
                  label={startingAssessment ? tr('Đang bắt đầu bài đánh giá…') : tr('Đang lưu mục tiêu…')}
                />
              ) : (
                <>
                  {tr('Lưu mục tiêu và tiếp tục')}
                  <Icon
                    name="arrow_forward"
                    className="text-[18px]"
                  />
                </>
              )}
            </button>

            <button type="button" onClick={(event) => handleSubmit(event, true)} disabled={busy || !activeLevelId} className="mt-3 h-11 w-full rounded-lg border border-rp-line text-[13px] text-rp-brand-strong disabled:opacity-50">{tr('Lưu thay đổi và về trang chủ')}</button>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={skipForNow}
                disabled={saving}
                className="rounded px-2 py-1 text-[12px]
                           text-rp-text-muted hover:text-rp-brand-strong
                           focus-visible:outline-none
                           focus-visible:ring-2
                           focus-visible:ring-rp-brand/30
                           disabled:opacity-40"
              >
                {tr('Để sau, vào trang chủ')}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
