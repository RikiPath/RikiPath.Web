import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  activateMentorGroupPolicyVersion,
  createMentorGroupPolicyVersion,
  deleteMentorGroupPolicyVersion,
  getCurrentMentorGroupPolicy,
  getMentorGroupPolicyHistory,
  getMentorGroupPolicyLevels,
  updateMentorGroupPolicySection,
  updateMentorGroupPolicyVersion,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  CustomSelect,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  NumberInput,
  RefreshButton,
  SakuraLoader,
  SideDrawer,
  Switch,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const OPERATING_MINUTES_PER_DAY = 15 * 60;

function parseSessionsCsv(csv) {
  const parts = String(csv || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const values = parts.map(Number);
  if (!values.length || values.some((n) => !Number.isInteger(n) || n < 1)) return [];
  return [...new Set(values)].sort((a, b) => a - b);
}

function isContiguousRange(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  for (let i = 1; i < list.length; i += 1) {
    if (list[i] !== list[i - 1] + 1) return false;
  }
  return true;
}

function buildRangeList(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || min > max || max - min > 100) return [];
  const out = [];
  for (let i = min; i <= max; i += 1) out.push(i);
  return out;
}

function formatAllowedSessionsDisplay(allowedList, trf) {
  if (!Array.isArray(allowedList) || allowedList.length === 0) return '—';
  if (allowedList.length === 1) return trf('{0} buổi', { 0: allowedList[0] });
  if (isContiguousRange(allowedList)) {
    return trf('{0}–{1} buổi', { 0: allowedList[0], 1: allowedList[allowedList.length - 1] });
  }
  return trf('{0} buổi', { 0: allowedList.join(', ') });
}

function parsePatterns(jsonText) {
  try {
    const parsed = JSON.parse(jsonText || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const TUITION_FIELD_BY_CODE = {
  N5: 'tuitionPerSessionN5',
  N4: 'tuitionPerSessionN4',
  N3: 'tuitionPerSessionN3',
  N2: 'tuitionPerSessionN2',
};

const POLICY_SECTION_META = {
  limits: { code: 'A', title: 'Giới hạn lớp của giáo viên' },
  structure: { code: 'B', title: 'Cấu trúc lớp học' },
  schedule: { code: 'C', title: 'Lịch và tải giảng dạy' },
  admission: { code: 'D', title: 'Tuyển sinh & ghi danh' },
  coordination: { code: 'E', title: 'Điều phối lớp học' },
  training: { code: 'F', title: 'Đào tạo & đánh giá' },
};

const POLICY_SECTION_ORDER = ['limits', 'structure', 'schedule', 'admission', 'coordination', 'training'];

function formatVnd(amount, intlTag = 'vi-VN') {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return '—';
  return `${Math.trunc(n).toLocaleString(intlTag)} đ`;
}

function extractLevelLimits(policy, supportedCodes = []) {
  const raw = policy?.maxActiveClassesByLevel && typeof policy.maxActiveClassesByLevel === 'object'
    ? policy.maxActiveClassesByLevel
    : {};
  const result = {};
  const keys = supportedCodes.length > 0 ? supportedCodes : Object.keys(raw);
  for (const rawCode of keys) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) continue;
    const val = raw[code] ?? raw[code.toLowerCase()];
    result[code] = Number.isFinite(Number(val)) ? Number(val) : 0;
  }
  return result;
}

function isStrictIntInRange(raw, min, max) {
  if (raw === '' || raw === null || raw === undefined) return false;
  const num = Number(raw);
  return Number.isInteger(num) && num >= min && num <= max;
}

function computeSchedulableWeeklyLimit(draft) {
  const sessionMin = Number(draft?.sessionMinutes);
  const restMin = Number(draft?.restMinutes);
  const dailyCap = Number(draft?.dailySessionCap);
  const weeklyCap = Number(draft?.weeklySessionCap);
  const validSession = Number.isInteger(sessionMin) && sessionMin > 0;
  const validRest = Number.isInteger(restMin) && restMin >= 0;
  const maxPhysicalSlotsPerDay = validSession && validRest
    ? Math.max(1, Math.floor((OPERATING_MINUTES_PER_DAY + restMin) / (sessionMin + restMin)))
    : 12;
  const effectiveMaxPerDay = Number.isInteger(dailyCap) && dailyCap >= 1
    ? Math.min(dailyCap, maxPhysicalSlotsPerDay)
    : maxPhysicalSlotsPerDay;
  const maxFromDaily = effectiveMaxPerDay * 7;
  const hasWeeklyCap = Number.isInteger(weeklyCap) && weeklyCap > 0;
  const maxAchievable = hasWeeklyCap ? Math.min(maxFromDaily, weeklyCap) : maxFromDaily;
  return {
    maxPhysicalSlotsPerDay,
    effectiveMaxPerDay,
    maxFromDaily,
    hasWeeklyCap,
    weeklyCap: hasWeeklyCap ? weeklyCap : 0,
    maxAchievable,
  };
}

function resolveDraftAllowedSessions(draft) {
  if (!draft) return [];
  if (!draft.sessionsRangeTouched && Array.isArray(draft.legacyNonContiguousSessions)) {
    return draft.legacyNonContiguousSessions;
  }
  const min = Number(draft.minSessionsPerWeek);
  const max = Number(draft.maxSessionsPerWeek);
  if (!isStrictIntInRange(draft.minSessionsPerWeek, 1, 84) || !isStrictIntInRange(draft.maxSessionsPerWeek, 1, 84) || min > max) {
    return [];
  }
  return buildRangeList(min, max);
}

function buildDraftFromPolicy(policy, supportedCodes = []) {
  if (!policy) return null;
  const allowed = parseSessionsCsv(policy.allowedSessionsPerWeekCsv);
  const fallbackAllowed = allowed.length > 0 ? allowed : [2, 3, 4];
  const legacyNonContiguous = !isContiguousRange(fallbackAllowed) ? fallbackAllowed : null;
  const defaultNum = Number(policy.defaultSessionsPerWeek);
  const defaultSpw = fallbackAllowed.includes(defaultNum) ? defaultNum : '';

  return {
    maxLearners: policy.maxLearners,
    minLearnersToStart: policy.minLearnersToStart,
    maxTotalActiveClassesPerMentor: policy.maxTotalActiveClassesPerMentor,
    maxActiveClassesByLevel: extractLevelLimits(policy, supportedCodes),
    courseDurationWeeks: policy.courseDurationWeeks,
    minSessionsPerWeek: fallbackAllowed[0],
    maxSessionsPerWeek: fallbackAllowed[fallbackAllowed.length - 1],
    legacyNonContiguousSessions: legacyNonContiguous,
    sessionsRangeTouched: false,
    defaultSessionsPerWeek: defaultSpw,
    sessionMinutes: policy.sessionMinutes,
    restMinutes: policy.restMinutes,
    dailySessionCap: policy.dailySessionCap,
    weeklySessionCap: policy.weeklySessionCap,
    publicationHorizonDays: policy.publicationHorizonDays,
    minimumProposalLeadDays: policy.minimumProposalLeadDays,
    minimumPublishedEnrollmentDays: policy.minimumPublishedEnrollmentDays,
    enrollmentCutoffMinutesBeforeFirstSession: policy.enrollmentCutoffMinutesBeforeFirstSession,
    checkoutHoldMinutes: policy.checkoutHoldMinutes,
    cancellationLeadHours: policy.cancellationLeadHours,
    reschedulingLeadHours: policy.reschedulingLeadHours,
    learnerTransferEnabled: Boolean(policy.learnerTransferEnabled),
    mentorReplacementEnabled: Boolean(policy.mentorReplacementEnabled),
    mentorReplacementLeadHours: policy.mentorReplacementLeadHours,
    homeworkDeadlineDays: policy.homeworkDeadlineDays,
    placementAttemptLimit: policy.placementAttemptLimit,
    remediationCompletionThresholdPercent: policy.remediationCompletionThresholdPercent,
    remediationThresholdComparison: policy.remediationThresholdComparison || '>',
    kpiReportingPeriodDays: policy.kpiReportingPeriodDays,
    tuitionPerSessionN5: policy.tuitionPerSessionN5,
    tuitionPerSessionN4: policy.tuitionPerSessionN4,
    tuitionPerSessionN3: policy.tuitionPerSessionN3,
    tuitionPerSessionN2: policy.tuitionPerSessionN2,
  };
}

function validatePolicyDraft(draft, supportedCodes, supportedLevels, tr, trf) {
  if (!draft) return { hasErrors: true, bySection: {}, levelErrors: {}, tuitionErrors: {}, allowedSessions: [] };

  const maxLearnersValid = isStrictIntInRange(draft.maxLearners, 1, 50);
  const maxLearnersNum = maxLearnersValid ? Number(draft.maxLearners) : 50;
  const minLearnersInvalid = !isStrictIntInRange(draft.minLearnersToStart, 1, maxLearnersNum);
  const maxLearnersInvalid = !maxLearnersValid
    || (isStrictIntInRange(draft.minLearnersToStart, 1, 50) && Number(draft.maxLearners) < Number(draft.minLearnersToStart));

  const schedLimit = computeSchedulableWeeklyLimit(draft);
  const allowedList = resolveDraftAllowedSessions(draft);
  const minSpwRawValid = isStrictIntInRange(draft.minSessionsPerWeek, 1, 84);
  const maxSpwRawValid = isStrictIntInRange(draft.maxSessionsPerWeek, 1, 84);
  const minSpwNum = Number(draft.minSessionsPerWeek);
  const maxSpwNum = Number(draft.maxSessionsPerWeek);

  let minSpwError = '';
  if (!minSpwRawValid) {
    minSpwError = tr('Nhập số nguyên dương (>= 1).');
  } else if (maxSpwRawValid && minSpwNum > maxSpwNum) {
    minSpwError = tr('Không được lớn hơn số buổi tối đa.');
  } else if (minSpwNum > schedLimit.maxAchievable) {
    minSpwError = trf('Vượt khả năng tổ chức tối đa ({0} buổi mỗi tuần).', { 0: schedLimit.maxAchievable });
  }

  let maxSpwError = '';
  if (!maxSpwRawValid) {
    maxSpwError = tr('Nhập số nguyên dương (>= 1).');
  } else if (minSpwRawValid && maxSpwNum < minSpwNum) {
    maxSpwError = tr('Không được nhỏ hơn số buổi tối thiểu.');
  } else if (schedLimit.hasWeeklyCap && maxSpwNum > schedLimit.weeklyCap) {
    maxSpwError = trf('Không vượt quá tải dạy tối đa ({0} buổi mỗi tuần).', { 0: schedLimit.weeklyCap });
  } else if (maxSpwNum > schedLimit.maxFromDaily) {
    maxSpwError = trf('Vượt khả năng xếp lịch ({0} buổi mỗi ngày × 7 = {1} buổi).', {
      0: schedLimit.effectiveMaxPerDay,
      1: schedLimit.maxFromDaily,
    });
  }

  const allowedSessionsInvalid = allowedList.length === 0;
  let defaultSpwError = '';
  if (allowedSessionsInvalid) {
    defaultSpwError = tr('Cần nhập khoảng số buổi hợp lệ.');
  } else if (
    draft.defaultSessionsPerWeek === ''
    || draft.defaultSessionsPerWeek === null
    || draft.defaultSessionsPerWeek === undefined
    || !allowedList.includes(Number(draft.defaultSessionsPerWeek))
  ) {
    defaultSpwError = tr('Giá trị mặc định không còn hợp lệ. Vui lòng chọn lại.');
  }

  const configuredMaxSpw = allowedList.length > 0
    ? allowedList[allowedList.length - 1]
    : (maxSpwRawValid ? maxSpwNum : 0);
  let scheduleSessionConflictMessage = '';
  if (configuredMaxSpw > 0 && configuredMaxSpw > schedLimit.maxAchievable) {
    scheduleSessionConflictMessage = schedLimit.hasWeeklyCap && configuredMaxSpw > schedLimit.weeklyCap
      ? trf('Số buổi dạy tối đa mỗi tuần ({0}) đang thấp hơn số buổi học tối đa mỗi tuần ({1} buổi).', {
        0: schedLimit.weeklyCap,
        1: configuredMaxSpw,
      })
      : trf('Khả năng xếp lịch ({0} buổi mỗi ngày × 7 = {1} buổi) không đủ cho cấu hình {2} buổi mỗi tuần.', {
        0: schedLimit.effectiveMaxPerDay,
        1: schedLimit.maxFromDaily,
        2: configuredMaxSpw,
      });
  }

  const durationWeeksInvalid = !isStrictIntInRange(draft.courseDurationWeeks, 1, 52);
  const sessionMinutesInvalid = !isStrictIntInRange(draft.sessionMinutes, 30, 240);
  const restMinutesInvalid = !isStrictIntInRange(draft.restMinutes, 0, 120);
  const dailyCapInvalid = !isStrictIntInRange(draft.dailySessionCap, 1, 12);
  const weeklyCapInvalid = !isStrictIntInRange(draft.weeklySessionCap, 0, 84);
  const horizonInvalid = !isStrictIntInRange(draft.publicationHorizonDays, 1, 365);

  const proposalLeadValid = isStrictIntInRange(draft.minimumProposalLeadDays, 1, 180);
  const publishEnrollValid = isStrictIntInRange(draft.minimumPublishedEnrollmentDays, 1, 180);
  const proposalLeadInvalid = !proposalLeadValid;
  const publishEnrollInvalid = !publishEnrollValid
    || (proposalLeadValid && Number(draft.minimumPublishedEnrollmentDays) > Number(draft.minimumProposalLeadDays));

  const cutoffInvalid = !isStrictIntInRange(draft.enrollmentCutoffMinutesBeforeFirstSession, 0, 10080);
  const holdMinutesInvalid = !isStrictIntInRange(draft.checkoutHoldMinutes, 1, 60);

  const cancelLeadInvalid = !isStrictIntInRange(draft.cancellationLeadHours, 0, 720);
  const rescheduleLeadInvalid = !isStrictIntInRange(draft.reschedulingLeadHours, 0, 720);
  const replacementLeadInvalid = !isStrictIntInRange(draft.mentorReplacementLeadHours, 0, 720);

  const homeworkDaysInvalid = !isStrictIntInRange(draft.homeworkDeadlineDays, 1, 365);
  const placementLimitInvalid = !isStrictIntInRange(draft.placementAttemptLimit, 1, 20);
  const remPct = Number(draft.remediationCompletionThresholdPercent);
  const remediationPctInvalid = draft.remediationCompletionThresholdPercent === ''
    || !Number.isFinite(remPct)
    || remPct <= 0
    || remPct > 100;
  const kpiDaysInvalid = !isStrictIntInRange(draft.kpiReportingPeriodDays, 1, 366);

  const maxTotalClassesInvalid = !isStrictIntInRange(draft.maxTotalActiveClassesPerMentor, 1, 50);

  const levelErrors = {};
  for (const code of supportedCodes) {
    const raw = draft.maxActiveClassesByLevel?.[code];
    if (!isStrictIntInRange(raw, 0, 50)) {
      levelErrors[code] = tr('Nhập số nguyên 0–50.');
    }
  }
  const allPerLevelZero = supportedCodes.length > 0
    && Object.keys(levelErrors).length === 0
    && supportedCodes.every((code) => Number(draft.maxActiveClassesByLevel?.[code] || 0) <= 0);
  const levelLimitsInvalid = Object.keys(levelErrors).length > 0 || allPerLevelZero;

  const tuitionErrors = {};
  for (const lvl of supportedLevels) {
    const fieldKey = TUITION_FIELD_BY_CODE[lvl.code];
    if (!fieldKey) continue;
    const raw = draft[fieldKey];
    if (!isStrictIntInRange(raw, 1, 50_000_000)) {
      tuitionErrors[fieldKey] = tr('Nhập số nguyên dương (VND).');
    }
  }

  const bySection = {
    limits: maxTotalClassesInvalid || levelLimitsInvalid,
    structure: minLearnersInvalid
      || maxLearnersInvalid
      || Boolean(minSpwError)
      || Boolean(maxSpwError)
      || allowedSessionsInvalid
      || Boolean(defaultSpwError)
      || durationWeeksInvalid
      || sessionMinutesInvalid,
    schedule: restMinutesInvalid
      || dailyCapInvalid
      || weeklyCapInvalid
      || horizonInvalid
      || Boolean(scheduleSessionConflictMessage),
    admission: proposalLeadInvalid || publishEnrollInvalid || cutoffInvalid || holdMinutesInvalid,
    coordination: cancelLeadInvalid || rescheduleLeadInvalid || replacementLeadInvalid,
    training: homeworkDaysInvalid || placementLimitInvalid || remediationPctInvalid || kpiDaysInvalid,
  };

  return {
    minLearnersInvalid,
    maxLearnersInvalid,
    minSpwError,
    maxSpwError,
    allowedSessionsInvalid,
    defaultSpwError,
    allowedSessions: allowedList,
    schedLimit,
    scheduleSessionConflictMessage,
    durationWeeksInvalid,
    sessionMinutesInvalid,
    restMinutesInvalid,
    dailyCapInvalid,
    weeklyCapInvalid,
    horizonInvalid,
    proposalLeadInvalid,
    publishEnrollInvalid,
    cutoffInvalid,
    holdMinutesInvalid,
    cancelLeadInvalid,
    rescheduleLeadInvalid,
    replacementLeadInvalid,
    homeworkDaysInvalid,
    placementLimitInvalid,
    remediationPctInvalid,
    kpiDaysInvalid,
    maxTotalClassesInvalid,
    levelErrors,
    allPerLevelZero,
    levelLimitsInvalid,
    tuitionErrors,
    bySection,
    hasErrors: Object.values(bySection).some(Boolean) || Object.keys(tuitionErrors).length > 0,
  };
}

function SectionHeading({ code, title }) {
  return (
    <div className="flex items-center gap-2">
      {code && (
        <span className="inline-flex h-5.5 min-w-[22px] items-center justify-center rounded-md border border-rp-brand-border/80 bg-white px-1.5 text-[11px] font-bold text-rp-brand-strong shadow-2xs">
          {code}
        </span>
      )}
      <h3 className="m-0 text-[14px] font-bold text-rp-brand-strong">{title}</h3>
    </div>
  );
}

function CardRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="text-[12.5px] leading-5 text-rp-text-2">{label}</dt>
      <dd className="m-0 text-right text-[12.5px] font-semibold leading-5 tabular-nums text-rp-text">{value}</dd>
    </div>
  );
}

function SectionFields({
  sectionKey,
  draft,
  validation,
  supportedLevels,
  onFieldChange,
  onLevelLimitChange,
  onSessionRangeChange,
  compactCols = false,
  tr,
  trf,
}) {
  if (!draft) return null;
  const gridCls = compactCols
    ? 'grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2'
    : 'grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3';
  const allowedList = validation.allowedSessions || [];
  const defaultValueStr = allowedList.includes(Number(draft.defaultSessionsPerWeek))
    ? String(draft.defaultSessionsPerWeek)
    : '';

  if (sectionKey === 'limits') {
    return (
      <div className="space-y-4">
        <div className={gridCls}>
          {supportedLevels.map((lvl) => (
            <Field
              key={lvl.code}
              label={trf('Số lớp {0} được đăng ký', { 0: lvl.code })}
              error={validation.levelErrors[lvl.code]}
            >
              <NumberInput
                min={0}
                max={50}
                unit="lớp"
                className="w-[132px]"
                invalid={Boolean(validation.levelErrors[lvl.code]) || validation.allPerLevelZero}
                value={draft.maxActiveClassesByLevel?.[lvl.code] ?? ''}
                onChange={(val) => onLevelLimitChange(lvl.code, val)}
              />
            </Field>
          ))}
          <Field
            label={tr('Tổng số lớp mỗi giáo viên')}
            error={validation.maxTotalClassesInvalid ? tr('Nhập số nguyên 1–50.') : undefined}
          >
            <NumberInput
              min={1}
              max={50}
              unit="lớp"
              className="w-[132px]"
              invalid={validation.maxTotalClassesInvalid}
              value={draft.maxTotalActiveClassesPerMentor}
              onChange={(val) => onFieldChange('maxTotalActiveClassesPerMentor', val)}
            />
          </Field>
        </div>
        {validation.allPerLevelZero && (
          <Banner tone="warning" title={tr('Cần cho phép ít nhất 1 cấp độ')}>
            {tr('Ít nhất một cấp độ JLPT phải có số lớp được đăng ký lớn hơn hoặc bằng 1.')}
          </Banner>
        )}
      </div>
    );
  }

  if (sectionKey === 'structure') {
    return (
      <div className="space-y-4">
        <div className={gridCls}>
          <Field
            label={tr('Sĩ số tối thiểu')}
            error={validation.minLearnersInvalid ? tr('Từ 1 đến sĩ số tối đa.') : undefined}
          >
            <NumberInput
              min={1}
              max={Number(draft.maxLearners) >= 1 ? Number(draft.maxLearners) : 50}
              unit="học viên"
              className="w-[144px]"
              invalid={validation.minLearnersInvalid}
              value={draft.minLearnersToStart}
              onChange={(val) => onFieldChange('minLearnersToStart', val)}
            />
          </Field>
          <Field
            label={tr('Sĩ số tối đa')}
            error={validation.maxLearnersInvalid ? tr('Số nguyên từ 1 đến 50.') : undefined}
          >
            <NumberInput
              min={1}
              max={50}
              unit="học viên"
              className="w-[144px]"
              invalid={validation.maxLearnersInvalid}
              value={draft.maxLearners}
              onChange={(val) => onFieldChange('maxLearners', val)}
            />
          </Field>
          <Field
            label={tr('Thời lượng khóa học')}
            error={validation.durationWeeksInvalid ? tr('Từ 1 đến 52 tuần.') : undefined}
          >
            <NumberInput
              min={1}
              max={52}
              unit="tuần"
              className="w-[132px]"
              invalid={validation.durationWeeksInvalid}
              value={draft.courseDurationWeeks}
              onChange={(val) => onFieldChange('courseDurationWeeks', val)}
            />
          </Field>
          <Field
            label={tr('Thời lượng mỗi buổi')}
            error={validation.sessionMinutesInvalid ? tr('Từ 30 đến 240 phút.') : undefined}
          >
            <NumberInput
              min={30}
              max={240}
              step={5}
              unit="phút"
              className="w-[132px]"
              invalid={validation.sessionMinutesInvalid}
              value={draft.sessionMinutes}
              onChange={(val) => onFieldChange('sessionMinutes', val)}
            />
          </Field>
          <Field
            label={tr('Số buổi tối thiểu mỗi tuần')}
            error={validation.minSpwError || undefined}
          >
            <NumberInput
              min={1}
              max={84}
              unit="buổi"
              className="w-[132px]"
              invalid={Boolean(validation.minSpwError)}
              value={draft.minSessionsPerWeek}
              onChange={(val) => onSessionRangeChange('minSessionsPerWeek', val)}
            />
          </Field>
          <Field
            label={tr('Số buổi tối đa mỗi tuần')}
            error={validation.maxSpwError || undefined}
          >
            <NumberInput
              min={1}
              max={84}
              unit="buổi"
              className="w-[132px]"
              invalid={Boolean(validation.maxSpwError)}
              value={draft.maxSessionsPerWeek}
              onChange={(val) => onSessionRangeChange('maxSessionsPerWeek', val)}
            />
          </Field>
          <Field
            label={tr('Số buổi mặc định mỗi tuần')}
            error={validation.defaultSpwError || undefined}
          >
            <CustomSelect
              fitContent
              className="min-w-[180px]"
              invalid={Boolean(validation.defaultSpwError)}
              disabled={allowedList.length === 0}
              value={defaultValueStr}
              onChange={(val) => onFieldChange('defaultSessionsPerWeek', val === '' ? '' : Number(val))}
              placeholder={tr('Chọn số buổi mặc định')}
              options={allowedList.map((w) => ({
                value: String(w),
                label: trf('{0} buổi', { 0: w }),
              }))}
            />
          </Field>
        </div>

        {!draft.sessionsRangeTouched && Array.isArray(draft.legacyNonContiguousSessions) && (
          <Banner tone="info">
            {trf('Phiên bản này đang giữ danh sách lịch sử không liên tục ({0} buổi mỗi tuần). Chỉnh sửa tối thiểu hoặc tối đa sẽ chuyển sang dải liên tục.', {
              0: draft.legacyNonContiguousSessions.join(', '),
            })}
          </Banner>
        )}
      </div>
    );
  }

  if (sectionKey === 'schedule') {
    return (
      <div className="space-y-4">
        <div className={gridCls}>
          <Field
            label={tr('Khoảng nghỉ giữa hai buổi')}
            error={validation.restMinutesInvalid ? tr('Từ 0 đến 120 phút.') : undefined}
          >
            <NumberInput
              min={0}
              max={120}
              step={5}
              unit="phút"
              className="w-[132px]"
              invalid={validation.restMinutesInvalid}
              value={draft.restMinutes}
              onChange={(val) => onFieldChange('restMinutes', val)}
            />
          </Field>
          <Field
            label={tr('Số buổi dạy tối đa mỗi ngày')}
            error={validation.dailyCapInvalid ? tr('Từ 1 đến 12 buổi.') : undefined}
          >
            <NumberInput
              min={1}
              max={12}
              unit="buổi"
              className="w-[132px]"
              invalid={validation.dailyCapInvalid}
              value={draft.dailySessionCap}
              onChange={(val) => onFieldChange('dailySessionCap', val)}
            />
          </Field>
          <Field
            label={tr('Số buổi dạy tối đa mỗi tuần')}
            hint={tr('0 = không giới hạn tuần')}
            error={validation.weeklyCapInvalid ? tr('Từ 0 đến 84 buổi.') : undefined}
          >
            <NumberInput
              min={0}
              max={84}
              unit="buổi"
              className="w-[132px]"
              invalid={validation.weeklyCapInvalid}
              value={draft.weeklySessionCap}
              onChange={(val) => onFieldChange('weeklySessionCap', val)}
            />
          </Field>
          <Field
            label={tr('Phạm vi công bố lịch')}
            error={validation.horizonInvalid ? tr('Từ 1 đến 365 ngày.') : undefined}
          >
            <NumberInput
              min={1}
              max={365}
              unit="ngày"
              className="w-[132px]"
              invalid={validation.horizonInvalid}
              value={draft.publicationHorizonDays}
              onChange={(val) => onFieldChange('publicationHorizonDays', val)}
            />
          </Field>
        </div>
        {validation.scheduleSessionConflictMessage && (
          <Banner tone="warning" title={tr('Mâu thuẫn với cấu trúc lớp học')}>
            {validation.scheduleSessionConflictMessage}
          </Banner>
        )}
      </div>
    );
  }

  if (sectionKey === 'admission') {
    return (
      <div className={gridCls}>
        <Field
          label={tr('Thời hạn gửi đề xuất trước ngày bắt đầu')}
          error={validation.proposalLeadInvalid ? tr('Từ 1 đến 180 ngày.') : undefined}
        >
          <NumberInput
            min={1}
            max={180}
            unit="ngày"
            className="w-[132px]"
            invalid={validation.proposalLeadInvalid}
            value={draft.minimumProposalLeadDays}
            onChange={(val) => onFieldChange('minimumProposalLeadDays', val)}
          />
        </Field>
        <Field
          label={tr('Thời gian tuyển sinh tối thiểu')}
          error={validation.publishEnrollInvalid ? tr('Không vượt quá thời hạn gửi đề xuất.') : undefined}
        >
          <NumberInput
            min={1}
            max={Number(draft.minimumProposalLeadDays) >= 1 ? Number(draft.minimumProposalLeadDays) : 180}
            unit="ngày"
            className="w-[132px]"
            invalid={validation.publishEnrollInvalid}
            value={draft.minimumPublishedEnrollmentDays}
            onChange={(val) => onFieldChange('minimumPublishedEnrollmentDays', val)}
          />
        </Field>
        <Field
          label={tr('Đóng tuyển sinh trước buổi đầu')}
          error={validation.cutoffInvalid ? tr('Từ 0 đến 10.080 phút.') : undefined}
        >
          <NumberInput
            min={0}
            max={10080}
            step={5}
            unit="phút"
            className="w-[140px]"
            invalid={validation.cutoffInvalid}
            value={draft.enrollmentCutoffMinutesBeforeFirstSession}
            onChange={(val) => onFieldChange('enrollmentCutoffMinutesBeforeFirstSession', val)}
          />
        </Field>
        <Field
          label={tr('Thời gian giữ chỗ thanh toán')}
          error={validation.holdMinutesInvalid ? tr('Từ 1 đến 60 phút.') : undefined}
        >
          <NumberInput
            min={1}
            max={60}
            unit="phút"
            className="w-[132px]"
            invalid={validation.holdMinutesInvalid}
            value={draft.checkoutHoldMinutes}
            onChange={(val) => onFieldChange('checkoutHoldMinutes', val)}
          />
        </Field>
      </div>
    );
  }

  if (sectionKey === 'coordination') {
    return (
      <div className="space-y-4">
        <div className={gridCls}>
          <Field
            label={tr('Báo trước khi hủy lịch')}
            error={validation.cancelLeadInvalid ? tr('Từ 0 đến 720 giờ.') : undefined}
          >
            <NumberInput
              min={0}
              max={720}
              unit="giờ"
              className="w-[132px]"
              invalid={validation.cancelLeadInvalid}
              value={draft.cancellationLeadHours}
              onChange={(val) => onFieldChange('cancellationLeadHours', val)}
            />
          </Field>
          <Field
            label={tr('Báo trước khi đổi lịch')}
            error={validation.rescheduleLeadInvalid ? tr('Từ 0 đến 720 giờ.') : undefined}
          >
            <NumberInput
              min={0}
              max={720}
              unit="giờ"
              className="w-[132px]"
              invalid={validation.rescheduleLeadInvalid}
              value={draft.reschedulingLeadHours}
              onChange={(val) => onFieldChange('reschedulingLeadHours', val)}
            />
          </Field>
          <Field
            label={tr('Báo trước khi thay giáo viên')}
            error={validation.replacementLeadInvalid ? tr('Từ 0 đến 720 giờ.') : undefined}
          >
            <NumberInput
              min={0}
              max={720}
              unit="giờ"
              className="w-[132px]"
              invalid={validation.replacementLeadInvalid}
              value={draft.mentorReplacementLeadHours}
              onChange={(val) => onFieldChange('mentorReplacementLeadHours', val)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
          <Switch
            fullWidth
            label="Cho phép học viên yêu cầu chuyển lớp"
            checked={draft.learnerTransferEnabled}
            onCheckedChange={(checked) => onFieldChange('learnerTransferEnabled', checked)}
          />
          <Switch
            fullWidth
            label="Cho phép thay giáo viên chính"
            checked={draft.mentorReplacementEnabled}
            onCheckedChange={(checked) => onFieldChange('mentorReplacementEnabled', checked)}
          />
        </div>
      </div>
    );
  }

  if (sectionKey === 'training') {
    return (
      <div className={gridCls}>
        <Field
          label={tr('Hạn nộp bài tập mặc định')}
          error={validation.homeworkDaysInvalid ? tr('Từ 1 đến 365 ngày.') : undefined}
        >
          <NumberInput
            min={1}
            max={365}
            unit="ngày"
            className="w-[132px]"
            invalid={validation.homeworkDaysInvalid}
            value={draft.homeworkDeadlineDays}
            onChange={(val) => onFieldChange('homeworkDeadlineDays', val)}
          />
        </Field>
        <Field
          label={tr('Giới hạn lượt đánh giá năng lực')}
          error={validation.placementLimitInvalid ? tr('Từ 1 đến 20 lượt.') : undefined}
        >
          <NumberInput
            min={1}
            max={20}
            unit="lượt"
            className="w-[132px]"
            invalid={validation.placementLimitInvalid}
            value={draft.placementAttemptLimit}
            onChange={(val) => onFieldChange('placementAttemptLimit', val)}
          />
        </Field>
        <Field
          label={tr('Ngưỡng bài tập xét học lại')}
          error={validation.remediationPctInvalid ? tr('Lớn hơn 0% và không quá 100%.') : undefined}
        >
          <NumberInput
            min={1}
            max={100}
            step={1}
            integerOnly={false}
            unit="%"
            className="w-[132px]"
            invalid={validation.remediationPctInvalid}
            value={draft.remediationCompletionThresholdPercent}
            onChange={(val) => onFieldChange('remediationCompletionThresholdPercent', val)}
          />
        </Field>
        <Field label={tr('Điều kiện so sánh ngưỡng')}>
          <CustomSelect
            fitContent
            className="min-w-[204px]"
            value={draft.remediationThresholdComparison}
            onChange={(val) => onFieldChange('remediationThresholdComparison', val)}
            options={[
              { value: '>', label: tr('> (lớn hơn hẳn)') },
              { value: '>=', label: tr('>= (từ ngưỡng trở lên)') },
            ]}
          />
        </Field>
        <Field
          label={tr('Chu kỳ báo cáo KPI')}
          error={validation.kpiDaysInvalid ? tr('Từ 1 đến 366 ngày.') : undefined}
        >
          <NumberInput
            min={1}
            max={366}
            unit="ngày"
            className="w-[132px]"
            invalid={validation.kpiDaysInvalid}
            value={draft.kpiReportingPeriodDays}
            onChange={(val) => onFieldChange('kpiReportingPeriodDays', val)}
          />
        </Field>
      </div>
    );
  }

  return null;
}

export default function AdminMentorGroupPolicy({ section = 'operations' } = {}) {
  const isTuitionMode = section === 'tuition';
  const { tr, trf, fmt } = useLocale();
  const client = useQueryClient();

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Which version is currently viewed in the 6 direct cards (null -> active policy)
  const [viewedVersion, setViewedVersion] = useState(null);

  // Single-card section modal editor
  const [sectionEditor, setSectionEditor] = useState(null); // { sectionKey, basePolicy }
  const [sectionForm, setSectionForm] = useState(null);

  // Full-version Drawer editor (publish new version or edit selected version in place)
  const [drawerState, setDrawerState] = useState(null); // { mode: 'publish' | 'edit', basePolicy }
  const [drawerForm, setDrawerForm] = useState(null);
  const [applyImmediately, setApplyImmediately] = useState(true);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  // Tuition-tab local draft
  const [tuitionForm, setTuitionForm] = useState(null);
  const [confirmTuitionOpen, setConfirmTuitionOpen] = useState(false);

  // Activate / Delete confirmations
  const [activateTarget, setActivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentQuery = useQuery({
    queryKey: ADMIN_KEYS.policyCurrent,
    queryFn: getCurrentMentorGroupPolicy,
  });

  const historyQuery = useQuery({
    queryKey: ADMIN_KEYS.policyHistory,
    queryFn: getMentorGroupPolicyHistory,
  });

  const levelsQuery = useQuery({
    queryKey: ADMIN_KEYS.policyLevels,
    queryFn: getMentorGroupPolicyLevels,
  });

  const current = currentQuery.data;
  const history = useMemo(
    () => (Array.isArray(historyQuery.data) ? historyQuery.data : []),
    [historyQuery.data],
  );

  const viewedPolicy = useMemo(() => {
    if (viewedVersion != null) {
      const matched = history.find((h) => Number(h.version) === Number(viewedVersion));
      if (matched) return matched;
    }
    return current || history.find((h) => h.isActive) || history[0] || null;
  }, [viewedVersion, history, current]);

  const supportedLevels = useMemo(() => {
    const apiLevels = Array.isArray(levelsQuery.data) ? levelsQuery.data : [];
    if (apiLevels.length > 0) {
      return apiLevels.map((lvl) => ({
        id: lvl.id,
        code: String(lvl.code || '').trim().toUpperCase(),
        name: lvl.name || lvl.code,
      }));
    }
    const keys = Object.keys((viewedPolicy || current)?.maxActiveClassesByLevel || {});
    return keys.map((code, idx) => ({
      id: idx + 1,
      code: code.toUpperCase(),
      name: `JLPT ${code.toUpperCase()}`,
    }));
  }, [levelsQuery.data, viewedPolicy, current]);

  const supportedLevelCodes = useMemo(
    () => supportedLevels.map((l) => l.code),
    [supportedLevels],
  );

  const latestLiveVersion = useMemo(() => {
    if (history.length > 0) {
      return Math.max(...history.map((h) => Number(h.version) || 0));
    }
    return Number(current?.version || 0);
  }, [history, current?.version]);

  const activeDraft = useMemo(
    () => drawerForm || buildDraftFromPolicy(drawerState?.basePolicy || viewedPolicy || current, supportedLevelCodes),
    [drawerForm, drawerState?.basePolicy, viewedPolicy, current, supportedLevelCodes],
  );

  const activeSectionDraft = useMemo(
    () => sectionForm || buildDraftFromPolicy(sectionEditor?.basePolicy || viewedPolicy, supportedLevelCodes),
    [sectionForm, sectionEditor?.basePolicy, viewedPolicy, supportedLevelCodes],
  );

  const tuitionDraft = useMemo(
    () => tuitionForm || buildDraftFromPolicy(current, supportedLevelCodes),
    [tuitionForm, current, supportedLevelCodes],
  );

  const drawerValidation = useMemo(
    () => validatePolicyDraft(activeDraft, supportedLevelCodes, supportedLevels, tr, trf),
    [activeDraft, supportedLevelCodes, supportedLevels, tr, trf],
  );

  const sectionValidation = useMemo(
    () => validatePolicyDraft(activeSectionDraft, supportedLevelCodes, supportedLevels, tr, trf),
    [activeSectionDraft, supportedLevelCodes, supportedLevels, tr, trf],
  );

  const tuitionValidation = useMemo(
    () => validatePolicyDraft(tuitionDraft, supportedLevelCodes, supportedLevels, tr, trf),
    [tuitionDraft, supportedLevelCodes, supportedLevels, tr, trf],
  );

  const buildPayloadFromDraft = (sourceDraft, basePolicy) => {
    const limitsPayload = {};
    for (const code of supportedLevelCodes) {
      limitsPayload[code] = Number(sourceDraft.maxActiveClassesByLevel?.[code] ?? 0);
    }
    const patterns = parsePatterns((basePolicy || current)?.recurringWeekdayPatternsJson);
    const allowedPayload = resolveDraftAllowedSessions(sourceDraft);
    return {
      maxLearners: Number(sourceDraft.maxLearners),
      minLearnersToStart: Number(sourceDraft.minLearnersToStart),
      maxTotalActiveClassesPerMentor: Number(sourceDraft.maxTotalActiveClassesPerMentor),
      maxActiveClassesByLevel: limitsPayload,
      courseDurationWeeks: Number(sourceDraft.courseDurationWeeks),
      allowedSessionsPerWeekCsv: allowedPayload.join(','),
      defaultSessionsPerWeek: Number(sourceDraft.defaultSessionsPerWeek),
      sessionMinutes: Number(sourceDraft.sessionMinutes),
      restMinutes: Number(sourceDraft.restMinutes),
      dailySessionCap: Number(sourceDraft.dailySessionCap),
      weeklySessionCap: Number(sourceDraft.weeklySessionCap || 0),
      publicationHorizonDays: Number(sourceDraft.publicationHorizonDays),
      minimumProposalLeadDays: Number(sourceDraft.minimumProposalLeadDays),
      minimumPublishedEnrollmentDays: Number(sourceDraft.minimumPublishedEnrollmentDays),
      enrollmentCutoffMinutesBeforeFirstSession: Number(sourceDraft.enrollmentCutoffMinutesBeforeFirstSession),
      checkoutHoldMinutes: Number(sourceDraft.checkoutHoldMinutes),
      cancellationLeadHours: Number(sourceDraft.cancellationLeadHours),
      reschedulingLeadHours: Number(sourceDraft.reschedulingLeadHours),
      learnerTransferEnabled: Boolean(sourceDraft.learnerTransferEnabled),
      transferAllowedAfterSourceStart: false,
      mentorReplacementEnabled: Boolean(sourceDraft.mentorReplacementEnabled),
      mentorReplacementLeadHours: Number(sourceDraft.mentorReplacementLeadHours),
      homeworkDeadlineDays: Number(sourceDraft.homeworkDeadlineDays),
      placementAttemptLimit: Number(sourceDraft.placementAttemptLimit),
      remediationCompletionThresholdPercent: Number(sourceDraft.remediationCompletionThresholdPercent),
      remediationThresholdComparison: sourceDraft.remediationThresholdComparison,
      requireOfficialExamEvidence: true,
      requireAdminRemediationReview: true,
      kpiReportingPeriodDays: Number(sourceDraft.kpiReportingPeriodDays),
      tuitionPerSessionN5: Number(sourceDraft.tuitionPerSessionN5),
      tuitionPerSessionN4: Number(sourceDraft.tuitionPerSessionN4),
      tuitionPerSessionN3: Number(sourceDraft.tuitionPerSessionN3),
      tuitionPerSessionN2: Number(sourceDraft.tuitionPerSessionN2),
      recurringWeekdayPatterns: patterns.length > 0 ? patterns : [[1, 3, 5], [2, 4, 6]],
    };
  };

  const buildSectionPayload = (sectionKey, sourceDraft) => {
    const base = { expectedRevision: Number(sectionEditor?.basePolicy?.revision ?? 1) };
    if (sectionKey === 'limits') {
      const limitsPayload = {};
      for (const code of supportedLevelCodes) {
        limitsPayload[code] = Number(sourceDraft.maxActiveClassesByLevel?.[code] ?? 0);
      }
      return {
        ...base,
        maxTotalActiveClassesPerMentor: Number(sourceDraft.maxTotalActiveClassesPerMentor),
        maxActiveClassesByLevel: limitsPayload,
      };
    }
    if (sectionKey === 'structure') {
      const allowedPayload = resolveDraftAllowedSessions(sourceDraft);
      return {
        ...base,
        minLearnersToStart: Number(sourceDraft.minLearnersToStart),
        maxLearners: Number(sourceDraft.maxLearners),
        courseDurationWeeks: Number(sourceDraft.courseDurationWeeks),
        allowedSessionsPerWeekCsv: allowedPayload.join(','),
        defaultSessionsPerWeek: Number(sourceDraft.defaultSessionsPerWeek),
        sessionMinutes: Number(sourceDraft.sessionMinutes),
      };
    }
    if (sectionKey === 'schedule') {
      return {
        ...base,
        restMinutes: Number(sourceDraft.restMinutes),
        dailySessionCap: Number(sourceDraft.dailySessionCap),
        weeklySessionCap: Number(sourceDraft.weeklySessionCap || 0),
        publicationHorizonDays: Number(sourceDraft.publicationHorizonDays),
      };
    }
    if (sectionKey === 'admission') {
      return {
        ...base,
        minimumProposalLeadDays: Number(sourceDraft.minimumProposalLeadDays),
        minimumPublishedEnrollmentDays: Number(sourceDraft.minimumPublishedEnrollmentDays),
        enrollmentCutoffMinutesBeforeFirstSession: Number(sourceDraft.enrollmentCutoffMinutesBeforeFirstSession),
        checkoutHoldMinutes: Number(sourceDraft.checkoutHoldMinutes),
      };
    }
    if (sectionKey === 'coordination') {
      return {
        ...base,
        cancellationLeadHours: Number(sourceDraft.cancellationLeadHours),
        reschedulingLeadHours: Number(sourceDraft.reschedulingLeadHours),
        mentorReplacementLeadHours: Number(sourceDraft.mentorReplacementLeadHours),
        learnerTransferEnabled: Boolean(sourceDraft.learnerTransferEnabled),
        mentorReplacementEnabled: Boolean(sourceDraft.mentorReplacementEnabled),
      };
    }
    if (sectionKey === 'training') {
      return {
        ...base,
        homeworkDeadlineDays: Number(sourceDraft.homeworkDeadlineDays),
        placementAttemptLimit: Number(sourceDraft.placementAttemptLimit),
        remediationCompletionThresholdPercent: Number(sourceDraft.remediationCompletionThresholdPercent),
        remediationThresholdComparison: sourceDraft.remediationThresholdComparison,
        kpiReportingPeriodDays: Number(sourceDraft.kpiReportingPeriodDays),
      };
    }
    return base;
  };

  // Create new policy version (publish mode or tuition mode)
  const createVersion = useMutation({
    mutationFn: ({ sourceDraft, applyNow, sourceVersion }) => {
      const payload = {
        ...buildPayloadFromDraft(sourceDraft, current),
        expectedCurrentVersion: latestLiveVersion,
        sourceVersion: sourceVersion ?? current?.version ?? latestLiveVersion,
        applyImmediately: Boolean(applyNow),
      };
      notify.loading(tr('Đang ban hành phiên bản mới…'), '', { key: 'admin-group-policy-save', maxWaitMs: 30000 });
      return createMentorGroupPolicyVersion(payload);
    },
    onSuccess: async (saved, vars) => {
      setError('');
      setConfirmPublishOpen(false);
      setConfirmTuitionOpen(false);
      setDrawerState(null);
      setDrawerForm(null);
      setTuitionForm(null);
      if (saved?.version != null) {
        setViewedVersion(saved.version);
      }
      const msg = vars.applyNow
        ? trf('Đã ban hành và áp dụng ngay phiên bản v{0}.', { 0: saved?.version ?? latestLiveVersion + 1 })
        : trf('Đã ban hành phiên bản v{0}.', { 0: saved?.version ?? latestLiveVersion + 1 });
      if (isTuitionMode) setNotice(msg);
      notify.success(
        vars.applyNow ? tr('Đã ban hành và áp dụng chính sách mới') : tr('Đã ban hành phiên bản mới'),
        msg,
        { key: 'admin-group-policy-save', replace: true },
      );
      await invalidateAdminDomains(client, ['policy']);
    },
    onError: (err) => {
      setConfirmPublishOpen(false);
      setConfirmTuitionOpen(false);
      const msg = describeApiError(err).message || tr('Không ban hành được phiên bản chính sách mới.');
      if (isTuitionMode) setError(msg);
      notify.apiError(err, tr('Ban hành phiên bản thất bại'), {
        key: 'admin-group-policy-save',
        replace: true,
      });
    },
  });

  // Update existing policy version in place (full drawer mode)
  const updateVersion = useMutation({
    mutationFn: ({ policy, sourceDraft }) => {
      const payload = {
        ...buildPayloadFromDraft(sourceDraft, policy),
        expectedRevision: Number(policy.revision ?? 1),
      };
      notify.loading(trf('Đang cập nhật phiên bản v{0}…', { 0: policy.version }), '', { key: 'admin-group-policy-update', maxWaitMs: 30000 });
      return updateMentorGroupPolicyVersion(policy.id, payload);
    },
    onSuccess: async (updated) => {
      setError('');
      setDrawerState(null);
      setDrawerForm(null);
      notify.success(
        tr('Đã lưu cập nhật'),
        trf('Đã cập nhật cấu hình phiên bản v{0}.', { 0: updated?.version ?? '' }),
        { key: 'admin-group-policy-update', replace: true },
      );
      await invalidateAdminDomains(client, ['policy']);
    },
    onError: (err) => {
      notify.apiError(err, tr('Cập nhật phiên bản thất bại'), {
        key: 'admin-group-policy-update',
        replace: true,
      });
    },
  });

  // Update single card section in place
  const updateSection = useMutation({
    mutationFn: ({ policy, sectionKey, sourceDraft }) => {
      const payload = buildSectionPayload(sectionKey, sourceDraft);
      notify.loading(tr('Đang lưu thay đổi nhóm cấu hình…'), '', { key: 'admin-group-policy-section', maxWaitMs: 30000 });
      return updateMentorGroupPolicySection(policy.id, sectionKey, payload);
    },
    onSuccess: async (updated) => {
      setSectionEditor(null);
      setSectionForm(null);
      notify.success(
        tr('Đã lưu thay đổi'),
        trf('Nhóm cấu hình của phiên bản v{0} đã được cập nhật.', { 0: updated?.version ?? '' }),
        { key: 'admin-group-policy-section', replace: true },
      );
      await invalidateAdminDomains(client, ['policy']);
    },
    onError: (err) => {
      notify.apiError(err, tr('Lưu thay đổi thất bại'), {
        key: 'admin-group-policy-section',
        replace: true,
      });
    },
  });

  // Activate policy version
  const activateVersion = useMutation({
    mutationFn: (policy) => {
      notify.loading(tr('Đang kích hoạt phiên bản chính sách…'), '', { key: 'admin-group-policy-activate', maxWaitMs: 30000 });
      return activateMentorGroupPolicyVersion(policy.id);
    },
    onSuccess: async (activated) => {
      setActivateTarget(null);
      if (activated?.version != null) {
        setViewedVersion(activated.version);
      }
      notify.success(
        tr('Đã áp dụng phiên bản chính sách'),
        trf('Phiên bản v{0} đã được áp dụng cho toàn hệ thống.', { 0: activated?.version ?? '' }),
        { key: 'admin-group-policy-activate', replace: true },
      );
      await invalidateAdminDomains(client, ['policy']);
    },
    onError: (err) => {
      setActivateTarget(null);
      notify.apiError(err, tr('Áp dụng phiên bản thất bại'), {
        key: 'admin-group-policy-activate',
        replace: true,
      });
    },
  });

  // Soft delete policy version
  const deleteVersion = useMutation({
    mutationFn: (policy) => {
      notify.loading(tr('Đang xóa phiên bản…'), '', { key: 'admin-group-policy-delete', maxWaitMs: 30000 });
      return deleteMentorGroupPolicyVersion(policy.id);
    },
    onSuccess: async (_res, deletedPolicy) => {
      setDeleteTarget(null);
      if (Number(viewedVersion) === Number(deletedPolicy.version)) {
        setViewedVersion(null);
      }
      notify.success(
        tr('Đã xóa phiên bản'),
        trf('Phiên bản v{0} đã được xóa khỏi danh sách quản lý.', { 0: deletedPolicy.version }),
        { key: 'admin-group-policy-delete', replace: true },
      );
      await invalidateAdminDomains(client, ['policy']);
    },
    onError: (err) => {
      setDeleteTarget(null);
      notify.apiError(err, tr('Không xóa được phiên bản'), {
        key: 'admin-group-policy-delete',
        replace: true,
      });
    },
  });

  const handleRefresh = () => Promise.all([
    currentQuery.refetch({ cancelRefetch: true }),
    historyQuery.refetch({ cancelRefetch: true }),
    levelsQuery.refetch({ cancelRefetch: true }),
  ]);

  const isRefreshing = (currentQuery.isFetching && !currentQuery.isPending)
    || (historyQuery.isFetching && !historyQuery.isPending)
    || (levelsQuery.isFetching && !levelsQuery.isPending);

  const openPublishDrawer = () => {
    const base = viewedPolicy || current || history[0];
    if (!base) return;
    setDrawerForm(buildDraftFromPolicy(base, supportedLevelCodes));
    setApplyImmediately(true);
    setDrawerState({ mode: 'publish', basePolicy: base });
  };

  const openEditDrawer = (policy) => {
    setDrawerForm(buildDraftFromPolicy(policy, supportedLevelCodes));
    setDrawerState({ mode: 'edit', basePolicy: policy });
  };

  const closeDrawer = () => {
    if (createVersion.isPending || updateVersion.isPending) return;
    setDrawerState(null);
    setDrawerForm(null);
  };

  const openSectionModal = (sectionKey, policy) => {
    setSectionForm(buildDraftFromPolicy(policy, supportedLevelCodes));
    setSectionEditor({ sectionKey, basePolicy: policy });
  };

  const closeSectionModal = () => {
    if (updateSection.isPending) return;
    setSectionEditor(null);
    setSectionForm(null);
  };

  const updateFormState = (setter, currentDraft) => ({
    onFieldChange: (key, value) => currentDraft && setter({ ...currentDraft, [key]: value }),
    onLevelLimitChange: (code, value) => currentDraft && setter({
      ...currentDraft,
      maxActiveClassesByLevel: {
        ...(currentDraft.maxActiveClassesByLevel || {}),
        [code]: value,
      },
    }),
    onSessionRangeChange: (fieldKey, value) => {
      if (!currentDraft) return;
      const nextDraft = {
        ...currentDraft,
        [fieldKey]: value,
        sessionsRangeTouched: true,
        legacyNonContiguousSessions: null,
      };
      const nextAllowed = resolveDraftAllowedSessions(nextDraft);
      const currentDefault = Number(currentDraft.defaultSessionsPerWeek);
      const keepDefault = nextAllowed.length > 0 && nextAllowed.includes(currentDefault);
      setter({
        ...nextDraft,
        defaultSessionsPerWeek: keepDefault ? currentDefault : '',
      });
    },
  });

  const drawerHandlers = updateFormState(setDrawerForm, activeDraft);
  const sectionHandlers = updateFormState(setSectionForm, activeSectionDraft);

  const historyColumns = useMemo(() => [
    {
      key: 'version',
      header: tr('Phiên bản'),
      sortValue: (row) => Number(row.version) || 0,
      render: (row) => (
        <span className="font-bold tabular-nums text-rp-text">
          v{row.version}
        </span>
      ),
    },
    {
      key: 'createdAtUtc',
      header: tr('Ngày ban hành'),
      sortValue: (row) => row.createdAtUtc || '',
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] font-medium text-rp-text-2">
          {formatVnDateTime(row.createdAtUtc, '—')}
        </span>
      ),
    },
    {
      key: 'createdByAdminName',
      header: tr('Người ban hành'),
      render: (row) => (
        <span className="text-[13px] font-medium text-rp-text">
          {row.createdByAdminName || tr('Hệ thống')}
        </span>
      ),
    },
    {
      key: 'lastAppliedAtUtc',
      header: tr('Ngày áp dụng gần nhất'),
      sortValue: (row) => row.lastAppliedAtUtc || '',
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-rp-text-2">
          {row.lastAppliedAtUtc ? formatVnDateTime(row.lastAppliedAtUtc, '—') : tr('Chưa áp dụng')}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: tr('Trạng thái'),
      sortValue: (row) => (row.isActive ? 1 : 0),
      render: (row) => (
        row.isActive ? (
          <Badge tone="success" size="sm">{tr('Đang áp dụng')}</Badge>
        ) : (
          <Badge tone="neutral" size="sm" icon={false}>{tr('Đã ban hành')}</Badge>
        )
      ),
    },
  ], [tr]);

  const currentMissing = currentQuery.error?.status === 404;
  const currentBlocked = Boolean(currentQuery.isError && !currentMissing);

  // ── TUITION TAB MODE (inside Gói học & học phí) ───────────────────────────
  if (isTuitionMode) {
    const tuitionDirty = Boolean(tuitionForm) && supportedLevels.some((lvl) => {
      const k = TUITION_FIELD_BY_CODE[lvl.code];
      return k && Number(tuitionDraft?.[k]) !== Number(current?.[k]);
    });
    const previewWeeks = Math.max(1, Number(current?.courseDurationWeeks) || 10);
    const previewSessionsList = parseSessionsCsv(current?.allowedSessionsPerWeekCsv);
    const tuitionHasErrors = Object.keys(tuitionValidation.tuitionErrors).length > 0;

    return (
      <div className="min-w-0 space-y-4">
        <AdminToolbar
          left={
            current ? (
              <Badge tone="success" size="sm">
                {trf('Phiên bản v{0} · Đang áp dụng', { 0: current.version })}
              </Badge>
            ) : null
          }
          refresh={{ onRefresh: handleRefresh, refreshing: isRefreshing, disabled: currentQuery.isPending }}
          actions={
            <>
              {tuitionForm && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  disabled={createVersion.isPending}
                  onClick={() => {
                    setTuitionForm(null);
                    setError('');
                  }}
                >
                  {tr('Hoàn tác')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="success"
                icon={CheckCircle2}
                disabled={!current || !tuitionDirty || tuitionHasErrors || createVersion.isPending}
                loading={createVersion.isPending}
                onClick={() => setConfirmTuitionOpen(true)}
              >
                {tr('Lưu & áp dụng ngay')}
              </Button>
            </>
          }
        />

        {currentQuery.isPending && (
          <SakuraLoader variant="section" context="data" label={tr('Đang tải đơn giá học phí…')} delay={160} />
        )}

        {currentBlocked && (
          <ContextualErrorState
            compact
            error={currentQuery.error}
            title={tr('Chưa tải được đơn giá học phí')}
            onRetry={() => currentQuery.refetch()}
            retrying={currentQuery.isFetching}
          />
        )}

        {error && (
          <Banner tone="danger" title={tr('Không lưu được cấu hình')} onDismiss={() => setError('')}>
            <span>{error}</span>
          </Banner>
        )}

        {notice && (
          <Banner tone="success" title={tr('Cập nhật thành công')} onDismiss={() => setNotice('')}>
            {notice}
          </Banner>
        )}

        {current && tuitionDraft && (
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-[15px] font-bold text-rp-text">
                {tr('Đơn giá học phí lớp học nhóm theo cấp độ JLPT')}
              </h3>
              <span className="text-xs text-rp-text-muted">
                {trf('Tính theo buổi {0} phút · khóa {1} tuần', {
                  0: current.sessionMinutes,
                  1: previewWeeks,
                })}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-rp-line">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-rp-table-head text-xs uppercase text-rp-text-muted">
                  <tr>
                    <th className="border-b border-rp-line px-4 py-2.5 font-semibold">{tr('Cấp độ')}</th>
                    <th className="border-b border-rp-line px-4 py-2.5 font-semibold">
                      {trf('Đơn giá mỗi buổi ({0} phút)', { 0: current.sessionMinutes })}
                    </th>
                    {previewSessionsList.map((w) => (
                      <th key={w} className="border-b border-rp-line px-4 py-2.5 text-right font-semibold">
                        {trf('Khóa {0} buổi ({1} buổi mỗi tuần)', { 0: w * previewWeeks, 1: w })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rp-line bg-white">
                  {supportedLevels.map((lvl) => {
                    const key = TUITION_FIELD_BY_CODE[lvl.code];
                    if (!key) return null;
                    const rawVal = tuitionDraft[key];
                    const num = Number(rawVal);
                    const valid = Number.isFinite(num) && Number.isInteger(num) && num > 0;
                    const errText = tuitionValidation.tuitionErrors[key];
                    return (
                      <tr key={lvl.code} className="transition-colors hover:bg-rp-row-hover">
                        <td className="px-4 py-2.5 font-bold text-rp-text">
                          <span className="inline-flex h-6 items-center rounded-lg border border-[#F2CCD7] bg-[#FFF5F7] px-2 text-xs font-extrabold text-[#B53D5C]">
                            {lvl.code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex max-w-[200px] items-center gap-2">
                            <Input
                              type="number"
                              min={1000}
                              step={1000}
                              max={50000000}
                              value={rawVal}
                              invalid={Boolean(errText)}
                              aria-label={trf('Đơn giá mỗi buổi {0}', { 0: lvl.code })}
                              onChange={(e) => setTuitionForm({
                                ...tuitionDraft,
                                [key]: e.target.value === '' ? '' : Number(e.target.value),
                              })}
                              className="h-9 w-[150px] tabular-nums"
                            />
                            <span className="shrink-0 text-xs font-semibold text-rp-text-muted">đ</span>
                          </div>
                          {errText && <p className="m-0 mt-1 text-[11px] font-medium text-red-600">{errText}</p>}
                        </td>
                        {previewSessionsList.map((w) => (
                          <td key={w} className="px-4 py-2.5 text-right font-semibold tabular-nums text-rp-text">
                            {valid ? formatVnd(num * w * previewWeeks, fmt.tag) : '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="m-0 text-xs text-rp-text-muted">
              {tr('Học phí trọn khóa được tính cố định từ đơn giá cấp độ và tổng số buổi khi lớp được phê duyệt; không ảnh hưởng các lớp đã tuyển sinh hoặc giao dịch đã tạo.')}
            </p>
          </Card>
        )}

        <AlertDialog
          open={confirmTuitionOpen}
          onClose={() => !createVersion.isPending && setConfirmTuitionOpen(false)}
          onConfirm={() => createVersion.mutate({
            sourceDraft: tuitionDraft,
            applyNow: true,
            sourceVersion: current?.version,
          })}
          loading={createVersion.isPending}
          tone="success"
          cancelVariant="danger"
          title={tr('Xác nhận cập nhật học phí lớp học nhóm?')}
          description={trf('Sẽ ban hành phiên bản mới v{0} với đơn giá học phí vừa chỉnh sửa và áp dụng ngay cho các lớp phê duyệt từ thời điểm lưu.', { 0: latestLiveVersion + 1 })}
          confirmLabel={tr('Lưu & áp dụng ngay')}
          cancelLabel={tr('Hủy')}
        />
      </div>
    );
  }

  // ── MAIN CLASS POLICY PAGE (/admin/policies/) ─────────────────────────────
  const limitsMap = viewedPolicy ? extractLevelLimits(viewedPolicy, supportedLevelCodes) : {};
  const allowedList = viewedPolicy ? parseSessionsCsv(viewedPolicy.allowedSessionsPerWeekCsv) : [];

  const cards = viewedPolicy ? [
    {
      sectionKey: 'limits',
      code: 'A',
      title: tr('Giới hạn lớp của giáo viên'),
      rows: [
        ...supportedLevelCodes.map((code) => ({
          label: trf('Số lớp {0} được đăng ký', { 0: code }),
          value: trf('{0} lớp', { 0: limitsMap[code] ?? 0 }),
        })),
        {
          label: tr('Tổng số lớp mỗi giáo viên'),
          value: trf('{0} lớp', { 0: viewedPolicy.maxTotalActiveClassesPerMentor }),
        },
      ],
    },
    {
      sectionKey: 'structure',
      code: 'B',
      title: tr('Cấu trúc lớp học'),
      rows: [
        {
          label: tr('Sĩ số lớp'),
          value: viewedPolicy.minLearnersToStart === viewedPolicy.maxLearners
            ? trf('{0} học viên', { 0: viewedPolicy.maxLearners })
            : trf('{0}–{1} học viên', { 0: viewedPolicy.minLearnersToStart, 1: viewedPolicy.maxLearners }),
        },
        {
          label: tr('Thời lượng khóa học'),
          value: trf('{0} tuần', { 0: viewedPolicy.courseDurationWeeks }),
        },
        {
          label: tr('Thời lượng mỗi buổi'),
          value: trf('{0} phút', { 0: viewedPolicy.sessionMinutes }),
        },
        {
          label: tr('Số buổi học mỗi tuần'),
          value: formatAllowedSessionsDisplay(allowedList, trf),
        },
        {
          label: tr('Số buổi mặc định'),
          value: trf('{0} buổi', { 0: viewedPolicy.defaultSessionsPerWeek }),
        },
      ],
    },
    {
      sectionKey: 'schedule',
      code: 'C',
      title: tr('Lịch và tải giảng dạy'),
      rows: [
        {
          label: tr('Khoảng nghỉ giữa hai buổi'),
          value: trf('{0} phút', { 0: viewedPolicy.restMinutes }),
        },
        {
          label: tr('Số buổi dạy tối đa mỗi ngày'),
          value: trf('{0} buổi', { 0: viewedPolicy.dailySessionCap }),
        },
        {
          label: tr('Số buổi dạy tối đa mỗi tuần'),
          value: viewedPolicy.weeklySessionCap > 0 ? trf('{0} buổi', { 0: viewedPolicy.weeklySessionCap }) : tr('Không giới hạn'),
        },
        {
          label: tr('Phạm vi công bố lịch'),
          value: trf('{0} ngày', { 0: viewedPolicy.publicationHorizonDays }),
        },
      ],
    },
    {
      sectionKey: 'admission',
      code: 'D',
      title: tr('Tuyển sinh & ghi danh'),
      rows: [
        {
          label: tr('Thời hạn gửi đề xuất trước ngày bắt đầu'),
          value: trf('{0} ngày', { 0: viewedPolicy.minimumProposalLeadDays }),
        },
        {
          label: tr('Thời gian tuyển sinh tối thiểu'),
          value: trf('{0} ngày', { 0: viewedPolicy.minimumPublishedEnrollmentDays }),
        },
        {
          label: tr('Đóng tuyển sinh trước buổi đầu'),
          value: trf('{0} phút', { 0: viewedPolicy.enrollmentCutoffMinutesBeforeFirstSession }),
        },
        {
          label: tr('Thời gian giữ chỗ thanh toán'),
          value: trf('{0} phút', { 0: viewedPolicy.checkoutHoldMinutes }),
        },
      ],
    },
    {
      sectionKey: 'coordination',
      code: 'E',
      title: tr('Điều phối lớp học'),
      rows: [
        {
          label: tr('Báo trước khi hủy lịch'),
          value: trf('{0} giờ', { 0: viewedPolicy.cancellationLeadHours }),
        },
        {
          label: tr('Báo trước khi đổi lịch'),
          value: trf('{0} giờ', { 0: viewedPolicy.reschedulingLeadHours }),
        },
        {
          label: tr('Báo trước khi thay giáo viên'),
          value: trf('{0} giờ', { 0: viewedPolicy.mentorReplacementLeadHours }),
        },
        {
          label: tr('Cho phép chuyển lớp'),
          value: viewedPolicy.learnerTransferEnabled ? tr('Bật') : tr('Tắt'),
        },
        {
          label: tr('Cho phép thay giáo viên chính'),
          value: viewedPolicy.mentorReplacementEnabled ? tr('Bật') : tr('Tắt'),
        },
      ],
    },
    {
      sectionKey: 'training',
      code: 'F',
      title: tr('Đào tạo & đánh giá'),
      rows: [
        {
          label: tr('Hạn nộp bài tập mặc định'),
          value: trf('{0} ngày', { 0: viewedPolicy.homeworkDeadlineDays }),
        },
        {
          label: tr('Giới hạn lượt đánh giá năng lực'),
          value: trf('{0} lượt', { 0: viewedPolicy.placementAttemptLimit }),
        },
        {
          label: tr('Ngưỡng bài tập xét học lại'),
          value: `${viewedPolicy.remediationThresholdComparison} ${viewedPolicy.remediationCompletionThresholdPercent}%`,
        },
        {
          label: tr('Chu kỳ báo cáo KPI'),
          value: trf('{0} ngày', { 0: viewedPolicy.kpiReportingPeriodDays }),
        },
      ],
    },
  ] : [];

  const sectionEditorMeta = sectionEditor ? POLICY_SECTION_META[sectionEditor.sectionKey] : null;
  const sectionEditorInvalid = sectionEditor
    ? Boolean(sectionValidation.bySection[sectionEditor.sectionKey])
    : true;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Minimal Toolbar */}
      <AdminToolbar
        left={
          viewedPolicy ? (
            viewedPolicy.isActive ? (
              <Badge tone="success" size="sm">
                {trf('Phiên bản v{0} · Đang áp dụng', { 0: viewedPolicy.version })}
              </Badge>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral" size="sm" icon={false}>
                  {trf('Phiên bản v{0} · Đã ban hành', { 0: viewedPolicy.version })}
                </Badge>
                <span className="text-xs font-medium text-rp-text-muted">
                  {tr('Đang xem cấu hình')}
                </span>
              </div>
            )
          ) : (
            <span className="text-sm font-medium text-rp-text-muted">
              {tr('Chưa có phiên bản chính sách')}
            </span>
          )
        }
        refresh={{
          onRefresh: handleRefresh,
          refreshing: isRefreshing,
          disabled: currentQuery.isPending && historyQuery.isPending,
        }}
        actions={
          <Button
            type="button"
            size="sm"
            variant="primary"
            icon={Plus}
            disabled={(!current && history.length === 0) || currentQuery.isPending}
            onClick={openPublishDrawer}
            data-testid="publish-policy-btn"
          >
            {tr('Ban hành chính sách')}
          </Button>
        }
      />

      {currentQuery.isPending && !viewedPolicy && (
        <SakuraLoader variant="section" context="data" label={tr('Đang tải chính sách lớp học…')} delay={160} />
      )}

      {(currentBlocked || historyQuery.isError) && (
        <div className="rounded-2xl border border-rp-line bg-white px-5">
          <ContextualErrorState
            compact
            error={historyQuery.error || currentQuery.error}
            title={tr('Chưa tải được chính sách lớp học')}
            onRetry={handleRefresh}
            retrying={isRefreshing}
          />
        </div>
      )}

      {/* 6 Direct Configuration Cards (3x2 on desktop) */}
      {viewedPolicy && (
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.sectionKey} padded={false} className="flex h-full flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-rp-brand-border/80 bg-rp-table-head px-3.5 py-2">
                <SectionHeading code={card.code} title={card.title} />
                <AdminIconAction
                  kind="edit"
                  tone="brand"
                  tooltip={trf('Chỉnh sửa {0}', { 0: card.title })}
                  onClick={() => openSectionModal(card.sectionKey, viewedPolicy)}
                />
              </div>
              <dl className="m-0 flex-1 divide-y divide-rp-line/50 px-3.5 py-1.5">
                {card.rows.map((r) => (
                  <CardRow key={r.label} label={r.label} value={r.value} />
                ))}
              </dl>
            </Card>
          ))}
        </div>
      )}

      {/* Version History Table Directly Below Cards */}
      {!historyQuery.isError && (
        <section className="space-y-2.5">
          <AdminDataTable
            stickyHeader
            scrollClassName="max-h-[420px]"
            columns={historyColumns}
            rows={history}
            rowKey={(item) => item.id ?? item.version}
            loading={historyQuery.isPending}
            itemLabel="phiên bản"
            onRowClick={(row) => setViewedVersion(row.version)}
            rowClassName={(row) => {
              const isViewed = viewedPolicy && Number(row.version) === Number(viewedPolicy.version);
              if (row.isActive) {
                return isViewed
                  ? 'cursor-pointer bg-emerald-50/85'
                  : 'cursor-pointer bg-emerald-50/45';
              }
              return isViewed
                ? 'cursor-pointer bg-rp-brand-tint/55'
                : 'cursor-pointer';
            }}
            empty={<EmptyState variant="compact" illustration="certificate" title={tr('Chưa có phiên bản chính sách nào.')} />}
            rowActions={(row) => (
              <AdminRowActions>
                <AdminIconAction
                  kind="edit"
                  tone="brand"
                  tooltip="Chỉnh sửa phiên bản"
                  onClick={() => openEditDrawer(row)}
                />
                <AdminIconAction
                  icon={CheckCircle2}
                  tone="success"
                  tooltip={row.isActive ? tr('Phiên bản đang được áp dụng') : tr('Áp dụng phiên bản')}
                  disabled={Boolean(row.isActive) || activateVersion.isPending}
                  onClick={() => setActivateTarget(row)}
                />
                <AdminIconAction
                  kind="delete"
                  tone="danger"
                  tooltip={row.canDelete ? tr('Xóa phiên bản') : (row.deleteBlockedReason || tr('Không thể xóa phiên bản này'))}
                  disabled={!row.canDelete || Boolean(row.isActive) || deleteVersion.isPending}
                  onClick={() => setDeleteTarget(row)}
                />
              </AdminRowActions>
            )}
          />
        </section>
      )}

      {/* Single-Card Section Edit Modal */}
      {sectionEditor && sectionEditorMeta && (
        <Modal
          open={Boolean(sectionEditor)}
          onClose={closeSectionModal}
          size={sectionEditor.sectionKey === 'structure' ? 'lg' : 'md'}
          title={trf('Chỉnh sửa {0}', { 0: tr(sectionEditorMeta.title) })}
          titleBadge={
            <Badge tone={sectionEditor.basePolicy.isActive ? 'success' : 'neutral'} size="sm" icon={false}>
              v{sectionEditor.basePolicy.version}
            </Badge>
          }
          footer={
            <>
              <Button
                type="button"
                size="md"
                variant="danger"
                disabled={updateSection.isPending}
                onClick={closeSectionModal}
              >
                {tr('Hủy')}
              </Button>
              <Button
                type="button"
                size="md"
                variant="success"
                icon={CheckCircle2}
                disabled={sectionEditorInvalid || updateSection.isPending}
                loading={updateSection.isPending}
                onClick={() => updateSection.mutate({
                  policy: sectionEditor.basePolicy,
                  sectionKey: sectionEditor.sectionKey,
                  sourceDraft: activeSectionDraft,
                })}
              >
                {tr('Lưu thay đổi')}
              </Button>
            </>
          }
        >
          <SectionFields
            sectionKey={sectionEditor.sectionKey}
            draft={activeSectionDraft}
            validation={sectionValidation}
            supportedLevels={supportedLevels}
            onFieldChange={sectionHandlers.onFieldChange}
            onLevelLimitChange={sectionHandlers.onLevelLimitChange}
            onSessionRangeChange={sectionHandlers.onSessionRangeChange}
            compactCols={sectionEditor.sectionKey !== 'structure'}
            tr={tr}
            trf={trf}
          />
        </Modal>
      )}

      {/* Full-Version Publish / Edit Right-Side Drawer */}
      <SideDrawer
        open={Boolean(drawerState)}
        onClose={closeDrawer}
        side="right"
        size="xl"
        title={
          drawerState?.mode === 'edit'
            ? trf('Chỉnh sửa phiên bản v{0}', { 0: drawerState?.basePolicy?.version })
            : tr('Ban hành chính sách mới')
        }
      >
        {({ titleId, descId }) => (
          <>
            <DrawerHeader
              titleId={titleId}
              descId={descId}
              title={
                drawerState?.mode === 'edit'
                  ? trf('Chỉnh sửa phiên bản v{0}', { 0: drawerState?.basePolicy?.version })
                  : tr('Ban hành chính sách mới')
              }
              subtitle={
                drawerState?.mode === 'edit'
                  ? trf('Cập nhật trực tiếp toàn bộ cấu hình của phiên bản v{0}.', { 0: drawerState?.basePolicy?.version })
                  : trf('Tạo phiên bản chính sách v{0} từ cấu hình hiện tại.', { 0: latestLiveVersion + 1 })
              }
              titleBadge={
                drawerState?.mode === 'edit' && drawerState?.basePolicy ? (
                  <Badge tone={drawerState.basePolicy.isActive ? 'success' : 'neutral'} size="sm" icon={false}>
                    v{drawerState.basePolicy.version}
                  </Badge>
                ) : (
                  <Badge tone="brand" size="sm" icon={false}>
                    v{latestLiveVersion + 1}
                  </Badge>
                )
              }
              onClose={closeDrawer}
            />

            <DrawerBody className="space-y-6 px-6 py-5">
              {activeDraft && POLICY_SECTION_ORDER.map((key, idx) => {
                const meta = POLICY_SECTION_META[key];
                return (
                  <section
                    key={key}
                    className={idx > 0 ? 'space-y-4 border-t border-rp-line pt-5' : 'space-y-4'}
                  >
                    <SectionHeading code={meta.code} title={tr(meta.title)} />
                    <SectionFields
                      sectionKey={key}
                      draft={activeDraft}
                      validation={drawerValidation}
                      supportedLevels={supportedLevels}
                      onFieldChange={drawerHandlers.onFieldChange}
                      onLevelLimitChange={drawerHandlers.onLevelLimitChange}
                      onSessionRangeChange={drawerHandlers.onSessionRangeChange}
                      tr={tr}
                      trf={trf}
                    />
                  </section>
                );
              })}
            </DrawerBody>

            <DrawerFooter className="flex flex-wrap items-center justify-between gap-3">
              {drawerState?.mode === 'publish' ? (
                <Switch
                  label="Áp dụng ngay sau khi ban hành"
                  checked={applyImmediately}
                  disabled={createVersion.isPending}
                  onCheckedChange={setApplyImmediately}
                />
              ) : (
                <span className="text-xs font-medium text-rp-text-muted">
                  {drawerState?.basePolicy?.isActive
                    ? tr('Phiên bản đang áp dụng; thay đổi có hiệu lực cho đề xuất và lớp mới.')
                    : tr('Chỉ cập nhật phiên bản này, không thay đổi chính sách đang áp dụng.')}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="md"
                  variant="danger"
                  disabled={createVersion.isPending || updateVersion.isPending}
                  onClick={closeDrawer}
                >
                  {tr('Hủy')}
                </Button>
                {drawerState?.mode === 'edit' ? (
                  <Button
                    type="button"
                    size="md"
                    variant="success"
                    icon={CheckCircle2}
                    disabled={!activeDraft || drawerValidation.hasErrors || updateVersion.isPending}
                    loading={updateVersion.isPending}
                    onClick={() => updateVersion.mutate({
                      policy: drawerState.basePolicy,
                      sourceDraft: activeDraft,
                    })}
                  >
                    {tr('Lưu thay đổi')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="md"
                    variant="success"
                    icon={CheckCircle2}
                    disabled={!activeDraft || drawerValidation.hasErrors || createVersion.isPending}
                    loading={createVersion.isPending}
                    onClick={() => setConfirmPublishOpen(true)}
                  >
                    {trf('Ban hành v{0}', { 0: latestLiveVersion + 1 })}
                  </Button>
                )}
              </div>
            </DrawerFooter>
          </>
        )}
      </SideDrawer>

      {/* Confirm Publish New Version */}
      <AlertDialog
        open={confirmPublishOpen}
        onClose={() => !createVersion.isPending && setConfirmPublishOpen(false)}
        onConfirm={() => createVersion.mutate({
          sourceDraft: activeDraft,
          applyNow: applyImmediately,
          sourceVersion: drawerState?.basePolicy?.version,
        })}
        loading={createVersion.isPending}
        tone="success"
        cancelVariant="danger"
        title={
          applyImmediately
            ? trf('Xác nhận ban hành & áp dụng phiên bản v{0}?', { 0: latestLiveVersion + 1 })
            : trf('Xác nhận ban hành phiên bản v{0}?', { 0: latestLiveVersion + 1 })
        }
        description={
          applyImmediately
            ? tr('Phiên bản mới sẽ được áp dụng ngay cho toàn hệ thống. Các lớp học và giao dịch đã xác lập giữ nguyên snapshot cũ.')
            : tr('Phiên bản mới sẽ được lưu ở trạng thái Đã ban hành để kích hoạt khi cần.')
        }
        confirmLabel={applyImmediately ? tr('Ban hành & áp dụng ngay') : tr('Ban hành phiên bản')}
        cancelLabel={tr('Hủy')}
      />

      {/* Confirm Activate Existing Version */}
      <AlertDialog
        open={Boolean(activateTarget)}
        onClose={() => !activateVersion.isPending && setActivateTarget(null)}
        onConfirm={() => activateTarget && activateVersion.mutate(activateTarget)}
        loading={activateVersion.isPending}
        tone="success"
        cancelVariant="danger"
        title={trf('Áp dụng phiên bản v{0} cho toàn hệ thống?', { 0: activateTarget?.version })}
        description={tr('Hệ thống sẽ chuyển sang sử dụng phiên bản này cho các đề xuất và lớp mới; không làm thay đổi snapshot của các lớp đã mở.')}
        confirmLabel={tr('Áp dụng phiên bản')}
        cancelLabel={tr('Hủy')}
      />

      {/* Confirm Delete Version */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteVersion.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteVersion.mutate(deleteTarget)}
        loading={deleteVersion.isPending}
        tone="danger"
        title={trf('Xác nhận xóa phiên bản v{0}?', { 0: deleteTarget?.version })}
        description={tr('Phiên bản chưa áp dụng và chưa có dữ liệu tham chiếu này sẽ bị xóa khỏi danh sách quản lý. Số phiên bản này sẽ không được tái sử dụng.')}
        confirmLabel={tr('Xóa phiên bản')}
        cancelLabel={tr('Hủy')}
      />
    </div>
  );
}
