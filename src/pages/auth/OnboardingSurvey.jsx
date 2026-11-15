import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import JlptExamDatePicker from '../../components/JlptExamDatePicker.jsx';
import { buildLearningGoal, isJlptExamDate } from '../../utils/learningGoal.js';
import { getSession, patchSession } from '../../auth/session.js';
import { queryClient } from '../../api/queryClient.js';
import { getPlacementStatus, placementAssessmentKey, startPlacementAttempt } from '../../api/placementApi.js';
import { useSetJlptGoalMutation } from '../../hooks/useAuth.js';
import { useLearnerProfile } from '../../hooks/useLearnerHome.js';
import {
  useCertificateTypesQuery,
  useCertificateLevelsQuery,
} from '../../hooks/useCertificates.js';


// Fallback mô tả cấp độ nếu DB chưa có mô tả chi tiết
const LEVEL_FALLBACKS = {
  N5: { title: 'Ôn luyện nền tảng', desc: 'Từ vựng, chữ Hán và mẫu câu cơ bản.' },
  N4: { title: 'Củng cố sơ cấp', desc: 'Ôn kiến thức và các tình huống quen thuộc.' },
  N3: { title: 'Ôn luyện trung cấp', desc: 'Mở rộng từ vựng, luyện đọc và nghe hiểu.' },
  N2: { title: 'Nâng cao năng lực', desc: 'Luyện hiểu văn bản dài và chủ đề đa dạng.' },
};

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

export default function OnboardingSurvey() {
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


  const busy =
    goalMutation.isPending ||
    startingAssessment ||
    loadingTypes ||
    loadingLevels ||
    profileQuery.isLoading ||
    profileQuery.isError;

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
    if (busy) return;
    patchSession({ skipOnboarding: true });
    navigate('/app', { replace: true });
  }

  async function handleSubmit(event, saveOnly = false) {
    event.preventDefault();
    if (busy || submitting.current) return;

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
        navigate('/app/placement-test/', { replace: true });
        return;
      }
      const attempt = await startPlacementAttempt();
      queryClient.setQueryData(placementAssessmentKey(session, attempt.attemptId), {
        attempt,
        status: { ...current, ...status },
      });
      navigate(`/app/placement-test/?attemptId=${attempt.attemptId}`, { replace: true });
    } catch (err) {
      const fallback = goalSaved ? 'Vui lòng thử bắt đầu lại.' : 'Không lưu được mục tiêu. Vui lòng thử lại.';
      setError(`${goalSaved ? 'Mục tiêu đã lưu. ' : ''}${err?.message || fallback}`);
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
      className="flex min-h-screen items-center justify-center
                 bg-[#F8F5F4] px-4 py-6
                 font-['Be_Vietnam_Pro',sans-serif]
                 text-[#352C31] sm:px-6 lg:py-8"
    >
      <main
        className="grid w-full max-w-[1100px] overflow-hidden
                   rounded-[24px] border border-[#EEE4E7]
                   bg-white shadow-[0_12px_48px_rgba(75,42,55,0.06)]
                   lg:grid-cols-[0.8fr_1.4fr]"
      >
        {/* Cột giới thiệu bên trái */}
        <aside
          className="relative flex flex-col overflow-hidden
                     bg-[#92344F] px-7 py-7 text-white
                     sm:px-9 lg:p-9"
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
            <span
              className="flex h-10 w-10 items-center justify-center
                         rounded-xl bg-white/10"
            >
              <Icon name="spa" className="text-[25px]" />
            </span>

            <span className="text-[21px] font-semibold tracking-tight">
              RikiPath
            </span>
          </Link>

          <div className="relative mt-7 lg:mt-10">
            <p className="text-[12px] font-medium text-[#EBC7D2]">
              Thiết lập mục tiêu ôn luyện
            </p>

            <h1
              className="mt-3 max-w-[330px] text-[30px]
                         font-semibold leading-[1.25]
                         tracking-tight lg:text-[34px]"
            >
              Bắt đầu từ
              <br />
              mục tiêu của bạn.
            </h1>

            <p
              className="mt-4 max-w-[320px] text-[13px]
                         leading-6 text-[#EDD4DC]"
            >
              Chọn chứng chỉ, cấp độ và thời lượng phù hợp để bắt đầu lộ trình ôn luyện cá nhân hóa cùng RikiPath.
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
                  <p className="text-[13px] font-medium">{title}</p>
                  <p className="mt-1 text-[12px] text-[#DFC0CB]">
                    {description}
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
              Chọn thời lượng bạn có thể duy trì đều đặn mỗi ngày để đạt hiệu quả cao nhất.
            </p>
          </div>
        </aside>

        {/* Khối chọn mục tiêu bên phải */}
        <section className="px-5 py-6 sm:p-8 lg:px-9 lg:py-8">
          <header>
            <p className="text-[12px] font-medium text-[#AD526F]">
              Thiết lập mục tiêu học tập
            </p>

            <h2
              className="mt-2 text-[25px] font-semibold
                         leading-tight tracking-tight sm:text-[28px]"
            >
              Bạn muốn ôn luyện mục tiêu nào?
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-[#8A7A82]">
              Chọn chứng chỉ và cấp độ bạn đang hướng đến.
            </p>
          </header>

          {profile?.targetJlptLevelId && <div className="mt-4 rounded-xl bg-[#FFF5F8] p-3 text-[13px] text-[#8F3654]">
            <Link to="/app/placement-test" className="font-semibold underline">Tiếp tục bài đánh giá hiện tại</Link>
            <p className="mt-1">Bạn cũng có thể cập nhật mục tiêu bên dưới. Đổi cấp độ sẽ mở đề tương ứng; khi bắt đầu đề mới, lượt cũ sẽ kết thúc và được giữ trong lịch sử.</p>
          </div>}
          <form onSubmit={handleSubmit} className="mt-6">
            {/* BƯỚC 1: Chọn chứng chỉ */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-[#4A3841]">
                  1. Chọn chứng chỉ
                </label>
                {loadingTypes && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#A08E97]">
                    <Icon name="progress_activity" className="animate-spin text-[14px]" />
                    Đang tải chứng chỉ…
                  </span>
                )}
              </div>

              {typesError ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                  <span>Không tải được danh sách chứng chỉ.</span>
                  <button
                    type="button"
                    onClick={() => refetchTypes()}
                    className="font-medium underline hover:text-red-900"
                  >
                    Thử lại
                  </button>
                </div>
              ) : loadingTypes && certificateTypes.length === 0 ? (
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl border border-[#EAE2E6] bg-[#FAF7F8]"
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
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D94B68]/40',
                          'disabled:cursor-wait',
                          isSelected
                            ? 'border-[#CD708C] bg-[#FFF5F8] shadow-xs'
                            : 'border-[#EAE2E6] bg-white hover:border-[#D8A7B7] hover:bg-[#FFFCFD]',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold transition-colors',
                            isSelected
                              ? 'bg-[#D94B68] text-white shadow-xs'
                              : 'bg-[#F5EFF2] text-[#8C6E7A] group-hover:bg-[#F2E5EB]',
                          ].join(' ')}
                        >
                          {cert.name || 'CC'}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[14px] font-semibold text-[#352C31]">
                              {cert.name}
                            </span>
                            <span
                              className={[
                                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors',
                                isSelected
                                  ? 'bg-[#D94B68] text-white'
                                  : 'border border-[#DCD1D6]',
                              ].join(' ')}
                            >
                              {isSelected && <Icon name="check" className="text-[12px]" />}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] leading-4 text-[#8A7A82] line-clamp-2">
                            {cert.description || `Luyện thi & đánh giá chứng chỉ ${cert.name}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BƯỚC 2: Chọn cấp độ */}
            <fieldset disabled={busy} className="mt-5 border-t border-[#F0E8EC] pt-5">
              <div className="flex items-center justify-between">
                <legend className="text-[13px] font-semibold text-[#4A3841]">
                  2. Chọn cấp độ mục tiêu
                  {selectedCert?.name && (
                    <span className="ml-1 text-[12px] font-normal text-[#94858C]">
                      (theo chứng chỉ {selectedCert.name})
                    </span>
                  )}
                </legend>

                {loadingLevels && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#A08E97]">
                    <Icon name="progress_activity" className="animate-spin text-[14px]" />
                    Đang tải cấp độ…
                  </span>
                )}
              </div>

              {levelsError ? (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                  <span>Không tải được danh sách cấp độ theo chứng chỉ.</span>
                  <button
                    type="button"
                    onClick={() => refetchLevels()}
                    className="font-medium underline hover:text-red-900"
                  >
                    Thử lại
                  </button>
                </div>
              ) : loadingLevels && levels.length === 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl border border-[#EAE2E6] bg-[#FAF7F8]"
                    />
                  ))}
                </div>
              ) : levels.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-[#EAE2E6] bg-[#FAFAFA] p-6 text-center text-[13px] text-[#8C7681]">
                  Chưa có danh sách cấp độ cho chứng chỉ này. Vui lòng chọn chứng chỉ khác.
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {levels.map((level) => {
                    const isSelected = activeLevelId === level.id;
                    const codeLabel = level.code || level.name || '';
                    const fallback = LEVEL_FALLBACKS[codeLabel.toUpperCase()] || {};
                    const title = fallback.title || (level.name && level.name !== codeLabel ? level.name : `Cấp độ ${codeLabel}`);
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
                            'peer-focus-visible:ring-[#D94B68]/40',
                            'peer-focus-visible:ring-offset-2',
                            'peer-disabled:cursor-wait',
                            isSelected
                              ? 'border-[#CD708C] bg-[#FFF5F8] shadow-xs'
                              : 'border-[#EAE2E6] bg-white hover:border-[#D8A7B7] hover:bg-[#FFFCFD]',
                          ].join(' ')}
                        >
                          <span
                            aria-hidden="true"
                            className={[
                              'flex h-10 w-10 shrink-0 items-center',
                              'justify-center rounded-[10px]',
                              'text-[14px] font-semibold transition-colors',
                              isSelected
                                ? 'bg-[#D94B68] text-white shadow-xs'
                                : 'bg-[#F5EFF2] text-[#947983]',
                            ].join(' ')}
                          >
                            {codeLabel}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[14px] font-semibold text-[#352C31]">
                                {selectedCert?.name ? `${selectedCert.name} ${codeLabel}` : codeLabel}
                              </span>

                              <span
                                aria-hidden="true"
                                className={[
                                  'flex h-[18px] w-[18px] shrink-0',
                                  'items-center justify-center rounded-full transition-colors',
                                  isSelected
                                    ? 'bg-[#D94B68] text-white'
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

                            <p className="mt-1 text-[12px] font-medium text-[#8C6E7A]">
                              {title}
                            </p>

                            <p
                              id={`level-${level.id}-desc`}
                              className="mt-1 text-[12px] leading-5 text-[#94858C]"
                            >
                              {description}
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
              <fieldset className="space-y-3 border-t border-[#EAE2E6] py-5" disabled={busy}>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#49353F]">
                  <input type="checkbox" className="accent-[#AD3155]" checked={hasCertificate}
                    onChange={event => {
                      setHeldOverride(event.target.checked ? '' : 'NONE');
                      setError('');
                    }} />
                  {targetCode === 'N4' ? 'Bạn đã có chứng chỉ JLPT N5 chưa?' : 'Bạn đã có chứng chỉ JLPT chưa?'}
                </label>
                {hasCertificate && <label className="block space-y-1 text-sm">
                  <span>Bạn đã có chứng chỉ nào? Chọn cấp cao nhất.</span>
                  <select value={heldCode} required onChange={event => {
                    setHeldOverride(event.target.value);
                    setError('');
                  }} className="w-full rounded-lg border border-[#EAE2E6] bg-white px-3 py-2">
                    <option value="">Chọn chứng chỉ</option>
                    {heldOptions.map(code => <option key={code} value={code}>JLPT {code}</option>)}
                  </select>
                </label>}
                <p className="text-xs text-[#826773]">
                  Bài đánh giá{heldCode ? ' rút gọn' : ''} gồm câu hỏi {comparisonLevel} và {targetCode} cho cả bốn kỹ năng.
                </p>
              </fieldset>
            )}

            {/* BƯỚC 3: Thời gian mỗi ngày */}
            <fieldset
              disabled={busy}
              className="mt-5 border-t border-[#F0E8EC] pt-5"
            >
              <legend className="sr-only">
                Thời gian ôn luyện mỗi ngày
              </legend>

              <h3 className="text-[13px] font-semibold text-[#4A3841]">
                3. Bạn dành bao nhiêu phút ôn luyện mỗi ngày?
              </h3>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="radio" name="study-time-mode" value="fixed" checked={timeMode === 'fixed'} onChange={() => setTimeMode('fixed')} className="accent-[#AD3155]" />
                  Một mốc phút
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="radio" name="study-time-mode" value="range" checked={timeMode === 'range'} onChange={() => setTimeMode('range')} className="accent-[#AD3155]" />
                  Khoảng từ–đến
                </label>
              </div>

              <p className="mt-2 text-[11px] text-[#A08E97]">
                Chọn thời gian phù hợp với lịch sinh hoạt để ôn luyện bền bỉ mỗi ngày.
              </p>
            </fieldset>

            <fieldset disabled={busy} className="mt-5 border-t border-[#F0E8EC] pt-5">
              <label htmlFor="study-minutes" className="block text-[13px] font-semibold">{timeMode === 'fixed' ? 'Số phút học mỗi ngày' : 'Từ (phút/ngày)'}</label>
              <input id="study-minutes" type="number" min="15" max="480" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-2 w-full rounded-lg border border-[#EAE2E6] p-3 text-sm" />
              {timeMode === 'range' && <>
              <label htmlFor="study-minutes-max" className="mt-4 block text-[13px] font-semibold">Đến (phút/ngày)</label>
              <input id="study-minutes-max" type="number" min="15" max="480" step="1" value={maxMinutes} onChange={(event) => setMaxMinutes(event.target.value)} className="mt-2 w-full rounded-lg border border-[#EAE2E6] p-3 text-sm" />
              </>}
              <p className="mt-2 text-[11px] text-[#94858C]">{timeMode === 'fixed' ? 'Tự nhập số phút bạn có thể học mỗi ngày, từ 15 đến 480 phút.' : 'Tự nhập khoảng thời gian từ 15 đến 480 phút. AI dùng mức tối thiểu cho nội dung cốt lõi và phần còn lại cho ôn luyện tùy chọn.'}</p>
              {isJlpt ? <JlptExamDatePicker value={examDate} today={today} onChange={setExamDate} requiredForAssessment /> : <>
                <label htmlFor="target-exam-date" className="mt-4 block text-[13px] font-semibold">Ngày dự định thi (không bắt buộc)</label>
                <input id="target-exam-date" type="date" value={examDate} onChange={event => setExamDate(event.target.value)} className="mt-2 w-full rounded-lg border border-[#EAE2E6] p-3 text-sm" />
              </>}
              <p className="mt-2 text-[11px] text-[#94858C]">Ngày thi và thời gian học được lưu để AI lập đề xuất lộ trình tiếp theo. Lộ trình hiện tại chưa tự động thay đổi.</p>
            </fieldset>
            {/* Tóm tắt */}
            <div
              className="mt-5 flex items-center gap-2.5
                         rounded-lg bg-[#FAF5F7] px-3.5 py-2.5"
            >
              <Icon
                name="flag"
                className="shrink-0 text-[19px] text-[#B26E86]"
              />

              <p className="text-[12px] text-[#8C6E7A]">
                Mục tiêu đã chọn:
                <strong className="ml-1.5 font-semibold text-[#9E3658]">
                  {selectedCert?.name || 'Chứng chỉ'}{' '}
                  {selectedLevel ? (selectedLevel.code || selectedLevel.name) : '…'} · {timeMode === 'fixed' ? minutes : `${minutes}–${maxMinutes}`} phút/ngày
                </strong>
              </p>
            </div>

            {profileQuery.isError && <p role="alert" className="mt-3 text-sm text-red-700">Không tải được mục tiêu hiện tại. <button type="button" onClick={() => profileQuery.refetch()} className="underline">Thử lại</button></p>}
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-[#FFF0F2]
                           px-3 py-2.5 text-[12px]
                           leading-5 text-[#A13950]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !activeLevelId}
              className="mt-5 flex h-11 w-full items-center
                         justify-center gap-2 rounded-[10px]
                         bg-[#D94B68] px-4 text-[14px]
                         font-semibold text-white
                         transition-all hover:bg-[#C43E5C]
                         focus-visible:outline-none
                         focus-visible:ring-2
                         focus-visible:ring-[#D94B68]/40
                         focus-visible:ring-offset-2
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-[18px]"
                  />
                  {startingAssessment ? 'Đang bắt đầu bài đánh giá…' : 'Đang lưu mục tiêu…'}
                </>
              ) : (
                <>
                  Lưu mục tiêu và tiếp tục
                  <Icon
                    name="arrow_forward"
                    className="text-[18px]"
                  />
                </>
              )}
            </button>

            <button type="button" onClick={(event) => handleSubmit(event, true)} disabled={busy || !activeLevelId} className="mt-3 h-11 w-full rounded-lg border border-[#EAE2E6] text-[13px] text-[#92344F] disabled:opacity-50">Lưu thay đổi và về trang chủ</button>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={skipForNow}
                disabled={busy}
                className="rounded px-2 py-1 text-[12px]
                           text-[#94858C] hover:text-[#AD3155]
                           focus-visible:outline-none
                           focus-visible:ring-2
                           focus-visible:ring-[#D94B68]/30
                           disabled:opacity-40"
              >
                Để sau, vào trang chủ
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
