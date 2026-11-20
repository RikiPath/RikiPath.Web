import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarCheck2,
  CalendarOff,
  Check,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Pencil,
  RefreshCw,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Target,
  Zap,
} from 'lucide-react';
import JlptExamDatePicker from '@/features/auth/components/JlptExamDatePicker.jsx';
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  CustomSelect,
  Input,
  SakuraLoader,
  cx,
} from '@/components/ui';
import { SakuraBloom } from '@/components/ui/SakuraLoader.jsx';
import { useLocale } from '@/locales/locale.js';
import {
  LEVEL_FALLBACKS,
  STUDY_RANGE_PRESETS,
  STUDY_TIME_PRESETS,
  formatExamSessionHeadline,
  formatStudySummaryText,
  resolvePaceLabelForMinutes,
} from './onboardingWizardLogic.js';

const PRESET_ICONS = {
  sprout: { Icon: Sprout, cls: 'bg-[#ECF9F2] text-[#1E824C]' },
  zap: { Icon: Zap, cls: 'bg-[#EEF5FE] text-[#1F64B5]' },
  flame: { Icon: Flame, cls: 'bg-[#FFF3EB] text-[#B65A06]' },
  book: { Icon: BookOpen, cls: 'bg-[#F3EFFC] text-[#74558A]' },
  rocket: { Icon: Rocket, cls: 'bg-[#FFF0EC] text-[#C2410C]' },
};

function handleRadioGroupKeyDown(event, count, currentIndex, onSelectIndex, containerRef) {
  if (!count) return;
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (currentIndex + 1) % count;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    next = (currentIndex - 1 + count) % count;
  }
  if (next === null) return;
  event.preventDefault();
  onSelectIndex(next);
  const radios = containerRef.current?.querySelectorAll('[role="radio"]');
  radios?.[next]?.focus();
}

export function Step1CertificatePanel({
  certificateTypes,
  activeCertId,
  loadingTypes,
  typesError,
  busy,
  onSelectCert,
  onRefetchTypes,
}) {
  const { tr, trf } = useLocale();
  const groupRef = useRef(null);

  if (typesError) {
    return (
      <Banner
        tone="danger"
        title={tr('Không tải được danh sách chứng chỉ.')}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefetchTypes}>
            {tr('Thử lại')}
          </Button>
        }
      >
        {tr('Vui lòng kiểm tra kết nối và thử tải lại danh sách chứng chỉ.')}
      </Banner>
    );
  }

  if (loadingTypes && certificateTypes.length === 0) {
    return (
      <div className="space-y-4">
        <SakuraLoader
          variant="inline"
          size={18}
          context="assessment"
          label={tr('Đang tải chứng chỉ…')}
          delay={120}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="rp-skeleton h-28 rounded-2xl border border-rp-line"
            />
          ))}
        </div>
      </div>
    );
  }

  if (certificateTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-rp-line bg-rp-bg-2 p-6 text-center">
        <p className="text-sm font-medium text-rp-text-2">
          {tr('Hiện chưa có chứng chỉ đang mở. Vui lòng thử tải lại sau ít phút.')}
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          className="mt-3"
          onClick={onRefetchTypes}
        >
          {tr('Thử lại')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadingTypes && (
        <SakuraLoader
          variant="inline"
          size={16}
          context="assessment"
          label={tr('Đang tải chứng chỉ…')}
          delay={160}
        />
      )}

      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={tr('1. Chọn chứng chỉ')}
        className="grid gap-3 sm:grid-cols-2"
      >
        {certificateTypes.map((cert, index) => {
          const isSelected = cert.id === activeCertId;
          return (
            <button
              key={cert.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={busy}
              onClick={() => onSelectCert(cert.id)}
              onKeyDown={(e) =>
                handleRadioGroupKeyDown(
                  e,
                  certificateTypes.length,
                  index,
                  (nextIdx) => onSelectCert(certificateTypes[nextIdx].id),
                  groupRef,
                )
              }
              className={cx(
                'rp-focus group flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 disabled:cursor-wait',
                isSelected
                  ? 'border-rp-brand bg-rp-brand-tint shadow-rp-xs'
                  : 'border-rp-line bg-white hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/45',
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold tracking-tight transition-colors duration-200',
                  isSelected
                    ? 'bg-rp-brand-pressed text-white shadow-xs'
                    : 'bg-rp-brand-soft text-rp-brand-strong group-hover:bg-rp-brand-border/50',
                )}
              >
                {cert.name || 'CC'}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-rp-text">
                    {cert.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                      isSelected
                        ? 'rp-onboarding-check-pop bg-rp-brand-pressed text-white'
                        : 'border border-[#DCD1D6] bg-white',
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-rp-text-muted">
                  {cert.description || trf('Luyện thi & đánh giá chứng chỉ {0}', { 0: cert.name })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Step2LevelPanel({
  profile,
  selectedCert,
  levels,
  activeLevelId,
  loadingLevels,
  levelsError,
  busy,
  heldOptions,
  targetCode,
  comparisonLevel,
  hasCertificate,
  heldCode,
  needsCertificateChoice,
  onSelectLevel,
  onRefetchLevels,
  onToggleHasCertificate,
  onSelectHeldCode,
}) {
  const { tr, trf } = useLocale();
  const groupRef = useRef(null);

  return (
    <div className="space-y-4">
      {profile?.targetJlptLevelId && (
        <div className="rounded-2xl border border-rp-brand-border/70 bg-rp-brand-tint/80 px-4 py-3 text-[13px] text-rp-brand-strong">
          <Link to="/app/placement-test" className="rp-underline inline-block font-semibold text-rp-brand-strong">
            {tr('Tiếp tục bài đánh giá hiện tại')}
          </Link>
          <p className="mt-1 text-[12px] leading-5 text-rp-text-2">
            {tr('Bạn cũng có thể cập nhật mục tiêu bên dưới. Đổi cấp độ sẽ mở đề tương ứng; khi bắt đầu đề mới, lượt cũ sẽ kết thúc và được giữ trong lịch sử.')}
          </p>
        </div>
      )}

      {levelsError ? (
        <Banner
          tone="danger"
          title={tr('Không tải được danh sách cấp độ theo chứng chỉ.')}
          actions={
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefetchLevels}>
              {tr('Thử lại')}
            </Button>
          }
        >
          {tr('Vui lòng thử tải lại danh sách cấp độ.')}
        </Banner>
      ) : loadingLevels && levels.length === 0 ? (
        <div className="space-y-3">
          <SakuraLoader
            variant="inline"
            size={16}
            context="assessment"
            label={tr('Đang tải cấp độ…')}
            delay={120}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((skeleton) => (
              <div key={skeleton} className="rp-skeleton h-24 rounded-2xl border border-rp-line" />
            ))}
          </div>
        </div>
      ) : levels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rp-line bg-rp-bg-2 p-6 text-center text-[13px] text-rp-text-muted">
          {tr('Chưa có danh sách cấp độ cho chứng chỉ này. Vui lòng chọn chứng chỉ khác.')}
        </div>
      ) : (
        <div
          ref={groupRef}
          role="radiogroup"
          aria-label={tr('2. Chọn cấp độ mục tiêu')}
          className="grid gap-3 sm:grid-cols-2"
        >
          {levels.map((level, index) => {
            const isSelected = activeLevelId === level.id;
            const codeLabel = level.code || level.name || '';
            const fallback = LEVEL_FALLBACKS[codeLabel.toUpperCase()] || {};
            const title = fallback.title
              || (level.name && level.name !== codeLabel ? level.name : trf('Cấp độ {0}', { 0: codeLabel }));
            const rawDesc = level.description?.trim();
            const redundantDesc = new RegExp(`^(?:${(selectedCert?.name || 'JLPT').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*)?${codeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            const description = (rawDesc && !redundantDesc.test(rawDesc))
              ? rawDesc
              : (fallback.desc || 'Chương trình ôn luyện chuẩn đầu ra.');

            return (
              <button
                key={level.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-describedby={`level-${level.id}-desc`}
                disabled={busy}
                onClick={() => onSelectLevel(level.id)}
                onKeyDown={(e) =>
                  handleRadioGroupKeyDown(
                    e,
                    levels.length,
                    index,
                    (nextIdx) => onSelectLevel(levels[nextIdx].id),
                    groupRef,
                  )
                }
                className={cx(
                  'rp-focus group flex h-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 disabled:cursor-wait',
                  isSelected
                    ? 'border-rp-brand bg-rp-brand-tint shadow-rp-xs'
                    : 'border-rp-line bg-white hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/45',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold transition-colors duration-200',
                    isSelected
                      ? 'bg-rp-brand-pressed text-white shadow-xs'
                      : 'bg-rp-brand-soft text-rp-brand-strong',
                  )}
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
                      className={cx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                        isSelected
                          ? 'rp-onboarding-check-pop bg-rp-brand-pressed text-white'
                          : 'border border-[#DCD1D6] bg-white',
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[12px] font-semibold text-rp-text-2">
                    {tr(title)}
                  </p>
                  <p id={`level-${level.id}-desc`} className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-rp-text-muted">
                    {tr(description)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {heldOptions.length > 0 && (
        <div className="rp-onboarding-reveal rounded-2xl border border-rp-line bg-rp-bg-2 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rp-brand-soft text-rp-brand-strong">
              <Award className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-2.5">
              <Checkbox
                checked={hasCertificate}
                disabled={busy}
                onChange={(event) => onToggleHasCertificate(event.target.checked)}
                label={
                  targetCode === 'N4'
                    ? tr('Bạn đã có chứng chỉ JLPT N5 chưa?')
                    : tr('Bạn đã có chứng chỉ JLPT chưa?')
                }
              />

              {hasCertificate && (
                <div className="rp-onboarding-reveal space-y-1.5 pt-1">
                  <label htmlFor="held-jlpt-cert-select" className="block text-[12px] font-semibold text-rp-text-2">
                    {tr('Bạn đã có chứng chỉ nào? Chọn cấp cao nhất.')}
                  </label>
                  <CustomSelect
                    id="held-jlpt-cert-select"
                    value={heldCode}
                    disabled={busy}
                    invalid={needsCertificateChoice}
                    onChange={(val) => onSelectHeldCode(val)}
                    placeholder={tr('Chọn chứng chỉ')}
                    options={[
                      { value: '', label: tr('Chọn chứng chỉ') },
                      ...heldOptions.map((code) => ({ value: code, label: `JLPT ${code}` })),
                    ]}
                  />
                  {needsCertificateChoice && (
                    <p className="text-[12px] font-medium text-rp-danger" role="alert">
                      {tr('Vui lòng chọn chứng chỉ JLPT cao nhất bạn đã có.')}
                    </p>
                  )}
                </div>
              )}

              <p className="text-[12px] leading-5 text-rp-text-muted">
                {tr('Bài đánh giá')}
                {heldCode ? tr(' rút gọn') : ''}{' '}
                {tr('gồm câu hỏi')}{' '}
                {comparisonLevel}{' '}
                {tr('và')}{' '}
                {targetCode}{' '}
                {tr('cho cả bốn kỹ năng.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Step3StudyPlanPanel({
  timeMode,
  minutes,
  maxMinutes,
  busy,
  validationMessage,
  onChangeTimeMode,
  onChangeMinutes,
  onChangeMaxMinutes,
}) {
  const { tr } = useLocale();
  const groupRef = useRef(null);
  const customInputRef = useRef(null);

  const numericMin = Number(minutes);
  const matchingPreset = STUDY_TIME_PRESETS.find((item) => item.minutes === numericMin);
  const [customPanelOpen, setCustomPanelOpen] = useState(() => Boolean(minutes && !matchingPreset));

  const showCustomInput = timeMode === 'fixed' && (customPanelOpen || !matchingPreset);

  useEffect(() => {
    if (customPanelOpen && timeMode === 'fixed') {
      customInputRef.current?.focus();
    }
  }, [customPanelOpen, timeMode]);

  return (
    <div className="space-y-4">
      {/* Mode selector pills */}
      <div className="inline-flex rounded-2xl border border-rp-line bg-rp-muted p-1" role="tablist" aria-label={tr('Chế độ chọn thời lượng')}>
        {[
          { key: 'fixed', label: 'Một mốc phút' },
          { key: 'range', label: 'Khoảng từ–đến' },
        ].map((mode) => {
          const active = timeMode === mode.key;
          return (
            <button
              key={mode.key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={busy}
              onClick={() => onChangeTimeMode(mode.key)}
              className={cx(
                'rp-focus rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-150',
                active
                  ? 'bg-white text-rp-brand-strong shadow-xs'
                  : 'text-rp-text-2 hover:text-rp-text',
              )}
            >
              {tr(mode.label)}
            </button>
          );
        })}
      </div>

      {timeMode === 'fixed' ? (
        <div className="space-y-3">
          <div
            ref={groupRef}
            role="radiogroup"
            aria-label={tr('3. Bạn dành bao nhiêu phút ôn luyện mỗi ngày?')}
            className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {STUDY_TIME_PRESETS.map((preset, index) => {
              const isSelected = !customPanelOpen && Number(minutes) === preset.minutes;
              const tone = PRESET_ICONS[preset.icon] || PRESET_ICONS.zap;
              const ToneIcon = tone.Icon;

              return (
                <button
                  key={preset.minutes}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={busy}
                  onClick={() => {
                    setCustomPanelOpen(false);
                    onChangeMinutes(preset.minutes);
                  }}
                  onKeyDown={(e) => {
                    const totalCards = STUDY_TIME_PRESETS.length + 1;
                    handleRadioGroupKeyDown(
                      e,
                      totalCards,
                      index,
                      (nextIdx) => {
                        if (nextIdx < STUDY_TIME_PRESETS.length) {
                          setCustomPanelOpen(false);
                          onChangeMinutes(STUDY_TIME_PRESETS[nextIdx].minutes);
                        } else {
                          setCustomPanelOpen(true);
                        }
                      },
                      groupRef,
                    );
                  }}
                  className={cx(
                    'rp-focus relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200',
                    isSelected
                      ? 'border-rp-brand bg-rp-brand-tint shadow-rp-xs'
                      : 'border-rp-line bg-white hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/40',
                  )}
                >
                  {preset.recommended && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-rp-brand-pressed px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-xs">
                      {tr('Phổ biến')}
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone.cls)}>
                      <ToneIcon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <span
                      aria-hidden="true"
                      className={cx(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                        isSelected
                          ? 'rp-onboarding-check-pop bg-rp-brand-pressed text-white'
                          : 'border border-[#DCD1D6] bg-white',
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[14px] font-bold text-rp-text tabular-nums">
                        {preset.minutes} {tr('phút/ngày')}
                      </span>
                      <Badge tone={isSelected ? 'brand' : 'neutral'} size="sm" icon={false}>
                        {tr(preset.pace)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-rp-text-muted">
                      {tr(preset.desc)}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Custom time option card */}
            <button
              type="button"
              role="radio"
              aria-checked={showCustomInput}
              disabled={busy}
              onClick={() => setCustomPanelOpen(true)}
              onKeyDown={(e) => {
                const totalCards = STUDY_TIME_PRESETS.length + 1;
                handleRadioGroupKeyDown(
                  e,
                  totalCards,
                  STUDY_TIME_PRESETS.length,
                  (nextIdx) => {
                    if (nextIdx < STUDY_TIME_PRESETS.length) {
                      setCustomPanelOpen(false);
                      onChangeMinutes(STUDY_TIME_PRESETS[nextIdx].minutes);
                    } else {
                      setCustomPanelOpen(true);
                    }
                  },
                  groupRef,
                );
              }}
              className={cx(
                'rp-focus flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200',
                showCustomInput
                  ? 'border-rp-brand bg-rp-brand-tint shadow-rp-xs'
                  : 'border-rp-line bg-white hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/40',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rp-brand-soft text-rp-brand-strong">
                  <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                </span>
                <span
                  aria-hidden="true"
                  className={cx(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                    showCustomInput
                      ? 'rp-onboarding-check-pop bg-rp-brand-pressed text-white'
                      : 'border border-[#DCD1D6] bg-white',
                  )}
                >
                  {showCustomInput && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                </span>
              </div>

              <div className="mt-2.5">
                <span className="text-[14px] font-bold text-rp-text">
                  {tr('Tự nhập số phút')}
                </span>
                <p className="mt-1 text-[12px] leading-4 text-rp-text-muted">
                  {tr('Từ 15 đến 480 phút/ngày')}
                </p>
              </div>
            </button>
          </div>

          {showCustomInput && (
            <div className="rp-onboarding-reveal rounded-2xl border border-rp-brand-border/70 bg-rp-bg-2 p-4">
              <label htmlFor="study-minutes" className="block text-[13px] font-semibold text-rp-text">
                {tr('Số phút học mỗi ngày')}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  ref={customInputRef}
                  id="study-minutes"
                  type="number"
                  min={15}
                  max={480}
                  step="1"
                  icon={Clock}
                  disabled={busy}
                  invalid={Boolean(validationMessage)}
                  value={minutes}
                  onChange={(event) => onChangeMinutes(event.target.value)}
                  className="max-w-[200px]"
                />
                <span className="text-sm font-medium text-rp-text-muted">
                  {tr('phút/ngày')}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-rp-text-muted">
                {tr('Tự nhập số phút bạn có thể học mỗi ngày, từ 15 đến 480 phút.')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rp-onboarding-reveal space-y-4">
          {/* Quick range presets */}
          <div className="flex flex-wrap items-center gap-2">
            {STUDY_RANGE_PRESETS.map((preset) => {
              const isSelected = Number(minutes) === preset.min && Number(maxMinutes) === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={busy}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChangeMinutes(preset.min);
                    onChangeMaxMinutes(preset.max);
                  }}
                  className={cx(
                    'rp-focus inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-all duration-150',
                    isSelected
                      ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong shadow-xs'
                      : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/40',
                  )}
                >
                  <span>{tr(preset.label)}</span>
                  <span className="text-[11px] font-normal text-rp-text-muted">
                    · {tr(preset.pace)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-2xl border border-rp-line bg-rp-bg-2 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="study-minutes" className="block text-[13px] font-semibold text-rp-text">
                {tr('Từ (phút/ngày)')}
              </label>
              <Input
                id="study-minutes"
                type="number"
                min={15}
                max={480}
                step="1"
                icon={Clock}
                disabled={busy}
                invalid={Boolean(validationMessage)}
                value={minutes}
                onChange={(event) => onChangeMinutes(event.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <label htmlFor="study-minutes-max" className="block text-[13px] font-semibold text-rp-text">
                {tr('Đến (phút/ngày)')}
              </label>
              <Input
                id="study-minutes-max"
                type="number"
                min={15}
                max={480}
                step="1"
                icon={Clock}
                disabled={busy}
                invalid={Boolean(validationMessage)}
                value={maxMinutes}
                onChange={(event) => onChangeMaxMinutes(event.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <p className="text-[12px] leading-5 text-rp-text-muted">
            {tr('Tự nhập khoảng thời gian từ 15 đến 480 phút. Hệ thống dùng mức tối thiểu cho nội dung cốt lõi và phần còn lại cho ôn luyện tùy chọn.')}
          </p>
        </div>
      )}

      {validationMessage && (
        <p role="alert" className="rp-onboarding-reveal rounded-xl border border-rp-danger-line bg-rp-danger-bg px-3.5 py-2 text-[12px] font-medium text-rp-danger">
          {tr(validationMessage)}
        </p>
      )}
    </div>
  );
}

export function Step4ExamSchedulePanel({
  isJlpt,
  examDate,
  today,
  busy,
  validationMessage,
  onChangeExamDate,
}) {
  const { tr } = useLocale();

  return (
    <div className="space-y-4">
      {isJlpt ? (
        <JlptExamDatePicker
          value={examDate}
          today={today}
          disabled={busy}
          onChange={onChangeExamDate}
        />
      ) : (
        <div className="space-y-3 rounded-2xl border border-rp-line bg-rp-bg-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="target-exam-date" className="text-[13px] font-semibold text-rp-text">
              {tr('Ngày dự định thi (không bắt buộc)')}
            </label>
            {examDate && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChangeExamDate('')}
                className="rp-underline text-xs font-semibold text-rp-brand-strong"
              >
                {tr('Xóa ngày thi')}
              </button>
            )}
          </div>
          <Input
            id="target-exam-date"
            type="date"
            min={today}
            disabled={busy}
            value={examDate}
            onChange={(event) => onChangeExamDate(event.target.value)}
            className="max-w-xs"
          />
        </div>
      )}

      {validationMessage && (
        <p role="alert" className="rp-onboarding-reveal rounded-xl border border-rp-danger-line bg-rp-danger-bg px-3.5 py-2 text-[12px] font-medium text-rp-danger">
          {tr(validationMessage)}
        </p>
      )}

      <div className="rounded-xl border border-rp-line bg-white px-3.5 py-2.5 text-[12px] leading-5 text-rp-text-muted">
        {tr('Ngày thi và thời gian học được lưu để hệ thống đề xuất lộ trình học tiếp theo. Lộ trình hiện tại chưa tự động thay đổi.')}
      </div>
    </div>
  );
}

export function Step5ReviewPanel({
  selectedCert,
  selectedLevel,
  hasHeldCertificate,
  heldCode,
  timeMode,
  minutes,
  maxMinutes,
  examDate,
  goalSavedPendingPlacementSync,
  error,
  profileError,
  busy,
  onJumpToStep,
  onRetryProfile,
}) {
  const { tr, trf } = useLocale();
  const certName = selectedCert?.name || tr('Chứng chỉ');
  const levelCode = selectedLevel ? (selectedLevel.code || selectedLevel.name) : '—';
  const studySummary = formatStudySummaryText({ timeMode, minutes, maxMinutes });
  const paceLabel = resolvePaceLabelForMinutes(minutes, timeMode);
  const examHeadline = formatExamSessionHeadline(examDate);

  const summaryTiles = [
    {
      stepIndex: 0,
      icon: Layers,
      toneCls: 'bg-[#EEF5FE] text-[#1F64B5]',
      label: tr('Chứng chỉ'),
      value: certName,
    },
    {
      stepIndex: 1,
      icon: Target,
      toneCls: 'bg-rp-brand-tint text-rp-brand-pressed',
      label: tr('Cấp độ mục tiêu'),
      value: selectedLevel ? `${certName} ${levelCode}` : '—',
      sub: hasHeldCertificate && heldCode ? trf('Đã có JLPT {0}', { 0: heldCode }) : null,
      highlight: true,
    },
    {
      stepIndex: 2,
      icon: Clock,
      toneCls: 'bg-[#FFF3EB] text-[#B65A06]',
      label: tr('Thời gian mỗi ngày'),
      value: `${studySummary} ${tr('phút/ngày')}`,
      sub: tr(paceLabel),
    },
    {
      stepIndex: 3,
      icon: examHeadline ? CalendarCheck2 : CalendarOff,
      toneCls: examHeadline ? 'bg-[#E8F7EE] text-[#1E824C]' : 'bg-rp-muted text-rp-text-2',
      label: tr('Lịch thi dự kiến'),
      value: examHeadline
        ? (examHeadline.monthKey
          ? trf('{0}, {1}', { 0: tr(examHeadline.monthKey), 1: examHeadline.year })
          : examHeadline.dateText)
        : tr('Chưa đặt lịch thi'),
      sub: examHeadline
        ? trf('Dự kiến {0}', { 0: examHeadline.dateText })
        : tr('Có thể bổ sung sau trong Cài đặt'),
    },
  ];

  return (
    <div className="min-w-0 space-y-3">
      {/* Sakura Hero Preview Banner (mirrors Mobile SakuraLearningPlanPreview) */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-rp-brand-border/80 bg-white shadow-rp-xs">
        <div className="relative bg-gradient-to-br from-[#FFF0F4] via-[#FFF7F9] to-white px-3.5 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-rp-brand-strong">
                {tr('Lộ trình cá nhân hóa của bạn')}
              </p>
              <h3 className="mt-0.5 text-[19px] font-bold tracking-tight text-rp-text sm:text-[21px]">
                {selectedLevel
                  ? trf('Mục tiêu {0} {1}', { 0: certName, 1: levelCode })
                  : certName}
              </h3>
              <p className="mt-0.5 text-[12px] text-rp-text-muted">
                {tr('Kiểm tra lại thông tin đã chọn trước khi khởi tạo kế hoạch học tập.')}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rp-brand-border/70 bg-white shadow-xs sm:flex"
            >
              <GraduationCap className="h-5 w-5 text-rp-brand-pressed" />
            </div>
          </div>
        </div>

        {/* 2x2 Summary Grid */}
        <div className="grid min-w-0 grid-cols-1 gap-2 border-t border-rp-line/80 bg-rp-bg-2 p-2.5 sm:grid-cols-2 sm:gap-2.5 sm:p-3.5">
          {summaryTiles.map((tile) => {
            const TileIcon = tile.icon;
            return (
              <div
                key={tile.label}
                className="flex min-w-0 items-start justify-between gap-2 overflow-hidden rounded-xl border border-rp-line bg-white p-2.5 sm:p-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tile.toneCls)}>
                    <TileIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-rp-text-muted">{tile.label}</p>
                    <p className={cx('mt-0.5 truncate text-[14px] font-bold', tile.highlight ? 'text-rp-brand-strong' : 'text-rp-text')}>
                      {tile.value}
                    </p>
                    {tile.sub && (
                      <p className="mt-0.5 break-words text-[11px] leading-4 text-rp-text-muted">{tile.sub}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onJumpToStep(tile.stepIndex)}
                  aria-label={trf('Chỉnh sửa {0}', { 0: tile.label })}
                  className="rp-focus inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-50"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  <span>{tr('Sửa')}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Placement guidance callout */}
      {!examDate ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-rp-bg-2 px-4 py-3 text-[12px] text-rp-text-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <SakuraBloom size={20} animated={false} />
            <p className="leading-5">
              {tr('Chưa chọn ngày thi — bạn có thể tạo kế hoạch và vào trang chủ ngay, hoặc chọn ngày thi để mở bài đánh giá năng lực.')}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onJumpToStep(3)}
            className="rp-underline rp-focus text-[12px] font-semibold text-rp-brand-strong"
          >
            {tr('Chọn ngày thi')}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rp-brand-border/60 bg-rp-brand-tint/60 px-4 py-3 text-[12px] text-rp-text-2">
          <Sparkles className="h-4 w-4 shrink-0 text-rp-brand-pressed" aria-hidden="true" />
          <p className="leading-5">
            {tr('Bạn đã sẵn sàng lưu mục tiêu và bắt đầu bài đánh giá năng lực để hệ thống đề xuất lộ trình tối ưu.')}
          </p>
        </div>
      )}

      {profileError && (
        <Banner
          tone="danger"
          title={tr('Không tải được mục tiêu hiện tại.')}
          actions={
            <Button variant="secondary" size="sm" onClick={onRetryProfile}>
              {tr('Thử lại')}
            </Button>
          }
        />
      )}

      {error && (
        <Banner
          tone={goalSavedPendingPlacementSync ? 'warning' : 'danger'}
          role="alert"
        >
          {error}
        </Banner>
      )}
    </div>
  );
}
