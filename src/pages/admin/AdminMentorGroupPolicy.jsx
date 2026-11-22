import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GitCompare,
  Plus,
} from 'lucide-react';
import {
  createMentorGroupPolicyVersion,
  getCurrentMentorGroupPolicy,
  getMentorGroupPolicyHistory,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  DateInput,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  SakuraLoader,
  Tabs,
} from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

function nextVnMidnightIso(daysAhead = 1) {
  const vnToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = vnToday.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + daysAhead, -7, 0, 0));
  return utc.toISOString();
}

function nextVnDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + 86400_000));
}

function formatVnDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

/** "2,3,4" → [2,3,4] (bỏ giá trị trùng / ngoài 1..7); rỗng nếu không hợp lệ. */
function parseSessionsCsv(csv) {
  const parts = String(csv || '').split(',').map((x) => x.trim()).filter(Boolean);
  const values = parts.map(Number);
  if (!values.length || values.some((n) => !Number.isInteger(n) || n < 1 || n > 7)) return [];
  return [...new Set(values)].sort((a, b) => a - b);
}

function parsePatterns(jsonText) {
  try {
    const parsed = JSON.parse(jsonText || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const WIZARD_STEPS = [
  { value: 'class', label: '1. Lớp & sĩ số' },
  { value: 'schedule', label: '2. Lịch dạy' },
  { value: 'changes', label: '3. Hủy & đổi lớp' },
  { value: 'homework', label: '4. Bài tập & đánh giá' },
  { value: 'kpi', label: '5. KPI' },
  { value: 'review', label: '6. Xem lại & ban hành' },
];

const POLICY_COMPARE_FIELDS = [
  { key: 'maxLearners', label: 'Sĩ số tối đa' },
  { key: 'minLearnersToStart', label: 'Số học viên tối thiểu để khai giảng' },
  { key: 'courseDurationWeeks', label: 'Thời lượng khóa (tuần)' },
  { key: 'allowedSessionsPerWeekCsv', label: 'Cường độ buổi/tuần được phép' },
  { key: 'defaultSessionsPerWeek', label: 'Cường độ mặc định' },
  { key: 'checkoutHoldMinutes', label: 'Giữ chỗ thanh toán (phút)' },
  { key: 'sessionMinutes', label: 'Thời lượng buổi (phút)' },
  { key: 'restMinutes', label: 'Nghỉ giữa buổi (phút)' },
  { key: 'dailySessionCap', label: 'Giới hạn ca Giáo viên / ngày' },
  { key: 'weeklySessionCap', label: 'Giới hạn ca Giáo viên / tuần (0 = không giới hạn)' },
  { key: 'publicationHorizonDays', label: 'Hạn công bố lịch (ngày)' },
  { key: 'enrollmentCutoffMinutesBeforeFirstSession', label: 'Khóa ghi danh trước khai giảng (phút)' },
  { key: 'cancellationLeadHours', label: 'Báo trước hủy lịch (giờ)' },
  { key: 'reschedulingLeadHours', label: 'Báo trước dời lịch (giờ)' },
  { key: 'learnerTransferEnabled', label: 'Cho phép yêu cầu chuyển lớp', bool: true },
  { key: 'mentorReplacementEnabled', label: 'Cho phép thay giáo viên chính', bool: true },
  { key: 'mentorReplacementLeadHours', label: 'Báo trước thay giáo viên (giờ)' },
  { key: 'homeworkDeadlineDays', label: 'Hạn nộp bài tập mặc định (ngày)' },
  { key: 'placementAttemptLimit', label: 'Giới hạn lượt đánh giá năng lực' },
  { key: 'remediationCompletionThresholdPercent', label: 'Ngưỡng bài tập xét học lại (%)' },
  { key: 'remediationThresholdComparison', label: 'Điều kiện so sánh tỷ lệ bài tập' },
  { key: 'kpiReportingPeriodDays', label: 'Chu kỳ báo cáo KPI (ngày)' },
];

export default function AdminMentorGroupPolicy() {
  const { tr, trf } = useLocale();
  const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState('class');
  const [compareTarget, setCompareTarget] = useState(null);

  const currentQuery = useQuery({
    queryKey: ADMIN_KEYS.policyCurrent,
    queryFn: getCurrentMentorGroupPolicy,
  });
  const historyQuery = useQuery({
    queryKey: ADMIN_KEYS.policyHistory,
    queryFn: getMentorGroupPolicyHistory,
  });

  const current = currentQuery.data;
  const [form, setForm] = useState(null);
  const [defaultEffectiveDate] = useState(() => nextVnDateString());

  const draft = useMemo(() => (form || {
    effectiveDate: defaultEffectiveDate,
    maxLearners: current?.maxLearners ?? 4,
    enrollmentCutoffMinutesBeforeFirstSession: current?.enrollmentCutoffMinutesBeforeFirstSession ?? 60,
    sessionMinutes: current?.sessionMinutes ?? 90,
    restMinutes: current?.restMinutes ?? 15,
    dailySessionCap: current?.dailySessionCap ?? 4,
    publicationHorizonDays: current?.publicationHorizonDays ?? 30,
    cancellationLeadHours: current?.cancellationLeadHours ?? 24,
    reschedulingLeadHours: current?.reschedulingLeadHours ?? 24,
    homeworkDeadlineDays: current?.homeworkDeadlineDays ?? 7,
    placementAttemptLimit: current?.placementAttemptLimit ?? 2,
    remediationCompletionThresholdPercent: current?.remediationCompletionThresholdPercent ?? 90,
    remediationThresholdComparison: current?.remediationThresholdComparison ?? '>',
    requireOfficialExamEvidence: current?.requireOfficialExamEvidence ?? true,
    requireAdminRemediationReview: current?.requireAdminRemediationReview ?? true,
    kpiReportingPeriodDays: current?.kpiReportingPeriodDays ?? 30,
    learnerTransferEnabled: current?.learnerTransferEnabled ?? true,
    transferAllowedAfterSourceStart: false,
    mentorReplacementEnabled: current?.mentorReplacementEnabled ?? true,
    mentorReplacementLeadHours: current?.mentorReplacementLeadHours ?? 24,
    weeklySessionCap: current?.weeklySessionCap ?? 0,
    courseDurationWeeks: current?.courseDurationWeeks ?? 10,
    allowedSessionsPerWeekCsv: current?.allowedSessionsPerWeekCsv ?? '2,3,4',
    defaultSessionsPerWeek: current?.defaultSessionsPerWeek ?? 3,
    checkoutHoldMinutes: current?.checkoutHoldMinutes ?? 10,
    minLearnersToStart: current?.minLearnersToStart ?? 1,
  }), [form, defaultEffectiveDate, current]);

  const allowedSessionsPerWeek = parseSessionsCsv(draft.allowedSessionsPerWeekCsv);
  const sessionsCsvInvalid = allowedSessionsPerWeek.length === 0;
  const defaultSpwInvalid = !sessionsCsvInvalid && !allowedSessionsPerWeek.includes(Number(draft.defaultSessionsPerWeek));
  const minLearnersInvalid = Number(draft.minLearnersToStart) < 1 || Number(draft.minLearnersToStart) > Number(draft.maxLearners);
  const maxLearnersInvalid = Number(draft.maxLearners) < 1 || Number(draft.maxLearners) > 20;
  const formInvalid = sessionsCsvInvalid || defaultSpwInvalid || minLearnersInvalid || maxLearnersInvalid;

  const setField = (key, value) => setForm({ ...draft, [key]: value });

  const openWizard = () => {
    setForm(null);
    setWizardStep('class');
    setError('');
    setDrawerOpen(true);
  };

  const createVersion = useMutation({
    mutationFn: () => {
      const effectiveUtc = new Date(`${draft.effectiveDate}T00:00:00+07:00`);
      const payload = {
        expectedCurrentVersion: current?.version ?? 0,
        effectiveFromUtc: Number.isNaN(effectiveUtc.getTime()) ? nextVnMidnightIso(1) : effectiveUtc.toISOString(),
        maxLearners: Number(draft.maxLearners),
        enrollmentCutoffMinutesBeforeFirstSession: Number(draft.enrollmentCutoffMinutesBeforeFirstSession),
        sessionMinutes: Number(draft.sessionMinutes),
        restMinutes: Number(draft.restMinutes),
        dailySessionCap: Number(draft.dailySessionCap),
        publicationHorizonDays: Number(draft.publicationHorizonDays),
        cancellationLeadHours: Number(draft.cancellationLeadHours),
        reschedulingLeadHours: Number(draft.reschedulingLeadHours),
        homeworkDeadlineDays: Number(draft.homeworkDeadlineDays),
        placementAttemptLimit: Number(draft.placementAttemptLimit),
        remediationCompletionThresholdPercent: Number(draft.remediationCompletionThresholdPercent),
        remediationThresholdComparison: draft.remediationThresholdComparison,
        requireOfficialExamEvidence: Boolean(draft.requireOfficialExamEvidence),
        requireAdminRemediationReview: Boolean(draft.requireAdminRemediationReview),
        kpiReportingPeriodDays: Number(draft.kpiReportingPeriodDays),
        learnerTransferEnabled: Boolean(draft.learnerTransferEnabled),
        transferAllowedAfterSourceStart: false,
        mentorReplacementEnabled: Boolean(draft.mentorReplacementEnabled),
        mentorReplacementLeadHours: Number(draft.mentorReplacementLeadHours),
        weeklySessionCap: Number(draft.weeklySessionCap || 0),
        courseDurationWeeks: Number(draft.courseDurationWeeks),
        allowedSessionsPerWeekCsv: parseSessionsCsv(draft.allowedSessionsPerWeekCsv).join(','),
        defaultSessionsPerWeek: Number(draft.defaultSessionsPerWeek),
        checkoutHoldMinutes: Number(draft.checkoutHoldMinutes),
        minLearnersToStart: Number(draft.minLearnersToStart),
        recurringWeekdayPatterns: parsePatterns(current?.recurringWeekdayPatternsJson).length
          ? parsePatterns(current?.recurringWeekdayPatternsJson)
          : [[1, 3, 5], [2, 4, 6]],
      };
      notify.loading(tr('Đang ban hành chính sách lớp nhóm mới…'), '', { key: 'admin-group-policy-save', maxWaitMs: 30000 });
      return createMentorGroupPolicyVersion(payload);
    },
    onSuccess: async (saved) => {
      setError('');
      setForm(null);
      setDrawerOpen(false);
      const msg = trf('Đã ban hành chính sách phiên bản v{0}. Lớp và buổi đã công bố vẫn giữ snapshot cũ.', { 0: saved?.version ?? '' });
      setNotice(msg);
      notify.success(tr('Đã ban hành chính sách lớp nhóm mới.'), msg, {
        key: 'admin-group-policy-save',
        replace: true,
      });
      await invalidateAdminDomains(client, ['policy']);
    },
    onError: (err) => {
      setNotice('');
      const msg = err?.status === 409
        ? tr('Phiên bản hiện hành vừa có thay đổi từ quản trị viên khác. Vui lòng tải lại dữ liệu trước khi ban hành.')
        : (describeApiError(err).message || tr('Không tạo được phiên bản chính sách mới.'));
      setError(msg);
      notify.apiError(err, tr('Không ban hành được chính sách'), {
        key: 'admin-group-policy-save',
        replace: true,
      });
    },
  });

  const history = useMemo(
    () => (Array.isArray(historyQuery.data) ? historyQuery.data : []),
    [historyQuery.data],
  );
  const currentMissing = currentQuery.error?.status === 404;
  const currentBlocked = Boolean(currentQuery.isError && !currentMissing);

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.value === wizardStep);

  const formatCompareValue = (obj, meta) => {
    if (!obj) return '—';
    const raw = obj[meta.key];
    if (meta.bool) return raw ? tr('Bật') : tr('Tắt');
    return String(raw ?? '—');
  };

  const draftDiffs = useMemo(() => {
    if (!current) return [];
    return POLICY_COMPARE_FIELDS.filter((meta) => {
      const a = meta.bool ? Boolean(current[meta.key]) : String(current[meta.key] ?? '');
      const b = meta.bool ? Boolean(draft[meta.key]) : String(draft[meta.key] ?? '');
      return a !== b;
    });
  }, [current, draft]);

  const compareBaseline = useMemo(() => {
    if (!compareTarget) return null;
    const idx = history.findIndex((h) => (h.id ?? h.version) === (compareTarget.id ?? compareTarget.version));
    return idx >= 0 && idx + 1 < history.length ? history[idx + 1] : current;
  }, [compareTarget, history, current]);

  const historyColumns = useMemo(() => [
    {
      key: 'version',
      header: tr('Phiên bản'),
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge tone={current?.version === row.version ? 'brand' : 'neutral'} size="sm" icon={false}>
            v{row.version}
          </Badge>
          {current?.version === row.version && (
            <span className="text-[11px] font-semibold text-rp-brand-strong">{tr('Đang áp dụng')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'effectiveFromUtc',
      header: tr('Ngày hiệu lực'),
      render: (row) => <span className="font-medium text-rp-text">{formatVnDate(row.effectiveFromUtc)}</span>,
    },
    {
      key: 'maxLearners',
      header: tr('Sĩ số / Buổi'),
      render: (row) => (
        <span className="text-[13px] text-rp-text-2">
          {trf('{0}–{1} HV · {2}p (nghỉ {3}p)', {
            0: row.minLearnersToStart ?? 1,
            1: row.maxLearners,
            2: row.sessionMinutes,
            3: row.restMinutes,
          })}
        </span>
      ),
    },
    {
      key: 'dailySessionCap',
      header: tr('Hạn mức Giáo viên'),
      render: (row) => (
        <span className="text-[13px] text-rp-text-2">
          {trf('{0} ca/ngày · {1} ca/tuần', {
            0: row.dailySessionCap,
            1: row.weeklySessionCap || '∞',
          })}
        </span>
      ),
    },
    {
      key: 'cancellationLeadHours',
      header: tr('Hủy / Dời'),
      render: (row) => (
        <span className="text-[13px] text-rp-text-2">
          {trf('Hủy ≥ {0}h · Dời ≥ {1}h', {
            0: row.cancellationLeadHours,
            1: row.reschedulingLeadHours,
          })}
        </span>
      ),
    },
  ], [tr, trf, current?.version]);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold text-rp-text">{tr('Chính sách lớp nhóm & lịch dạy')}</h2>
          <p className="mt-1 text-[13px] text-rp-text-muted">
            {tr('Mọi thay đổi tạo phiên bản mới có hiệu lực từ 00:00 giờ Việt Nam; lớp và buổi đã công bố giữ nguyên snapshot tại thời điểm tạo.')}
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          disabled={currentQuery.isPending || currentBlocked}
          onClick={openWizard}
          data-testid="open-policy-wizard-btn"
        >
          {tr('Ban hành phiên bản mới')}
        </Button>
      </div>

      {currentQuery.isPending && (
        <SakuraLoader variant="section" context="data" label={tr('Đang tải chính sách lớp nhóm…')} delay={160} />
      )}
      {currentBlocked && (
        <div className="rounded-2xl border border-rp-line bg-white px-5">
          <ContextualErrorState
            compact
            error={currentQuery.error}
            title={tr('Chưa tải được chính sách lớp nhóm hiện hành')}
            onRetry={() => currentQuery.refetch()}
            retrying={currentQuery.isFetching}
          />
        </div>
      )}
      {historyQuery.isError && (
        <ContextualErrorState
          variant="inline"
          compact
          error={historyQuery.error}
          title={tr('Chưa tải được lịch sử phiên bản')}
          onRetry={() => historyQuery.refetch()}
          retrying={historyQuery.isFetching}
        />
      )}
      {error && (
        <Banner tone="danger" title={tr('Không ban hành được chính sách')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="xs" variant="secondary" onClick={() => { currentQuery.refetch(); historyQuery.refetch(); }}>
              {tr('Tải lại phiên bản mới nhất')}
            </Button>
          </div>
        </Banner>
      )}
      {notice && (
        <Banner tone="success" title={tr('Ban hành thành công')}>
          {notice}
        </Banner>
      )}

      {current && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Phiên bản hiệu lực')}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[20px] font-bold text-rp-brand-strong">v{current.version}</span>
              <Badge tone="success" size="sm">{formatVnDate(current.effectiveFromUtc)}</Badge>
            </div>
            <p className="mt-1 text-[12px] text-rp-text-2">
              {trf('Khóa {0} tuần · mặc định {1} buổi/tuần', {
                0: current.courseDurationWeeks ?? 10,
                1: current.defaultSessionsPerWeek ?? 3,
              })}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Sĩ số & thời lượng')}</p>
            <p className="mt-1.5 text-[15px] font-semibold text-rp-text">
              {trf('{0}–{1} học viên / lớp', { 0: current.minLearnersToStart ?? 1, 1: current.maxLearners })}
            </p>
            <p className="mt-1 text-[12px] text-rp-text-2">
              {trf('{0} phút / buổi · nghỉ {1} phút', { 0: current.sessionMinutes, 1: current.restMinutes })}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Khóa ghi danh & hủy/dời')}</p>
            <p className="mt-1.5 text-[15px] font-semibold text-rp-text">
              {trf('Trước khai giảng {0} phút', { 0: current.enrollmentCutoffMinutesBeforeFirstSession })}
            </p>
            <p className="mt-1 text-[12px] text-rp-text-2">
              {trf('Hủy ≥ {0} giờ · Dời ≥ {1} giờ', { 0: current.cancellationLeadHours, 1: current.reschedulingLeadHours })}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Đánh giá & KPI')}</p>
            <p className="mt-1.5 text-[15px] font-semibold text-rp-text">
              {trf('{0} lượt đánh giá · bài tập {1} {2}%', {
                0: current.placementAttemptLimit,
                1: current.remediationThresholdComparison,
                2: current.remediationCompletionThresholdPercent,
              })}
            </p>
            <p className="mt-1 text-[12px] text-rp-text-2">
              {trf('Chu kỳ KPI: {0} ngày · Hạn mức: {1}/ngày', { 0: current.kpiReportingPeriodDays, 1: current.dailySessionCap })}
            </p>
          </Card>
        </section>
      )}

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line px-4 py-3">
          <div>
            <h3 className="text-[15px] font-semibold text-rp-text">{tr('Lịch sử phiên bản chính sách')}</h3>
            <p className="text-[12px] text-rp-text-muted">{tr('Chọn So sánh để xem thay đổi giữa các phiên bản.')}</p>
          </div>
          <Badge tone="neutral" size="sm" icon={false}>{trf('{0} phiên bản', { 0: history.length })}</Badge>
        </div>
        <DataTable
          columns={historyColumns}
          rows={history}
          rowKey={(item) => item.id ?? item.version}
          loading={historyQuery.isPending}
          empty={<EmptyState art="empty" title={tr('Chưa có phiên bản chính sách nào.')} />}
          rowActions={(row) => (
            <Button
              size="xs"
              variant="outline"
              icon={GitCompare}
              onClick={() => setCompareTarget(row)}
            >
              {tr('So sánh')}
            </Button>
          )}
        />
      </Card>

      {/* Version Diff Comparison Modal */}
      {compareTarget && (
        <Modal
          open={Boolean(compareTarget)}
          onClose={() => setCompareTarget(null)}
          title={trf('Chi tiết & so sánh phiên bản v{0}', { 0: compareTarget.version })}
          description={
            compareBaseline && compareBaseline.version !== compareTarget.version
              ? trf('So sánh cấu hình v{0} với v{1}.', { 0: compareTarget.version, 1: compareBaseline.version })
              : tr('Chi tiết toàn bộ tham số của phiên bản này.')
          }
          size="lg"
        >
          <div className="max-h-[65vh] overflow-auto rounded-xl border border-rp-line">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-rp-table-head text-xs uppercase text-rp-text-muted">
                <tr>
                  <th className="border-b border-rp-line px-3.5 py-2.5">{tr('Tham số')}</th>
                  {compareBaseline && compareBaseline.version !== compareTarget.version && (
                    <th className="border-b border-rp-line px-3.5 py-2.5">v{compareBaseline.version}</th>
                  )}
                  <th className="border-b border-rp-line px-3.5 py-2.5">v{compareTarget.version}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-line">
                {POLICY_COMPARE_FIELDS.map((meta) => {
                  const valA = formatCompareValue(compareBaseline, meta);
                  const valB = formatCompareValue(compareTarget, meta);
                  const changed = Boolean(compareBaseline && compareBaseline.version !== compareTarget.version && valA !== valB);
                  return (
                    <tr key={meta.key} className={changed ? 'bg-amber-50/70' : 'transition-colors duration-150 hover:bg-rp-row-hover'}>
                      <td className="px-3.5 py-2 font-medium text-rp-text">
                        {tr(meta.label)}
                        {changed && <Badge tone="warning" size="sm" className="ml-2" icon={false}>{tr('Thay đổi')}</Badge>}
                      </td>
                      {compareBaseline && compareBaseline.version !== compareTarget.version && (
                        <td className="px-3.5 py-2 text-rp-text-muted">{valA}</td>
                      )}
                      <td className="px-3.5 py-2 font-semibold text-rp-text">{valB}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* 6-Step Create Version Drawer Wizard */}
      <Drawer
        open={drawerOpen}
        onClose={() => !createVersion.isPending && setDrawerOpen(false)}
        title={tr('Ban hành phiên bản chính sách mới')}
        width="w-[min(940px,100vw)]"
        footer={(
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={ArrowLeft}
                  onClick={() => setWizardStep(WIZARD_STEPS[stepIndex - 1].value)}
                >
                  {tr('Bước trước')}
                </Button>
              )}
              {stepIndex < WIZARD_STEPS.length - 1 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setWizardStep(WIZARD_STEPS[stepIndex + 1].value)}
                >
                  {tr('Tiếp theo')} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={createVersion.isPending}
                onClick={() => setDrawerOpen(false)}
              >
                {tr('Hủy')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={CheckCircle2}
                disabled={createVersion.isPending || currentQuery.isPending || currentBlocked || formInvalid}
                loading={createVersion.isPending}
                onClick={() => createVersion.mutate()}
                data-testid="publish-policy-version-btn"
              >
                {createVersion.isPending ? tr('Đang lưu phiên bản…') : tr('Tạo phiên bản chính sách mới')}
              </Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-5">
          <Tabs
            variant="pill"
            label={tr('Các bước cấu hình chính sách')}
            value={wizardStep}
            onChange={setWizardStep}
            tabs={WIZARD_STEPS.map((s) => ({ value: s.value, label: tr(s.label) }))}
          />

          {formInvalid && (
            <Banner tone="warning" title={tr('Cần chỉnh sửa tham số chưa hợp lệ')}>
              {tr('Kiểm tra lại sĩ số tối thiểu/tối đa, danh sách cường độ buổi/tuần hoặc cường độ mặc định.')}
            </Banner>
          )}

          {wizardStep === 'class' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Ngày hiệu lực (00:00 GMT+7)')}>
                <DateInput value={draft.effectiveDate} onChange={(e) => setField('effectiveDate', e.target.value)} />
              </Field>
              <Field
                label={tr('Sĩ số tối đa mỗi lớp (1–20)')}
                error={maxLearnersInvalid ? tr('Sĩ số tối đa phải nằm trong khoảng 1–20.') : undefined}
              >
                <Input type="number" min={1} max={20} invalid={maxLearnersInvalid} value={draft.maxLearners} onChange={(e) => setField('maxLearners', e.target.value)} />
              </Field>
              <Field
                label={tr('Số học viên tối thiểu để khai giảng')}
                error={minLearnersInvalid ? tr('Không được lớn hơn sĩ số tối đa và phải ≥ 1.') : undefined}
              >
                <Input
                  type="number"
                  min={1}
                  max={Number(draft.maxLearners) || 20}
                  invalid={minLearnersInvalid}
                  value={draft.minLearnersToStart}
                  onChange={(e) => setField('minLearnersToStart', e.target.value)}
                />
              </Field>
              <Field label={tr('Thời lượng khóa lớp nhóm (tuần)')}>
                <Input type="number" min={1} max={52} value={draft.courseDurationWeeks} onChange={(e) => setField('courseDurationWeeks', e.target.value)} />
              </Field>
              <Field
                label={tr('Cường độ buổi học của mỗi lớp nhóm / tuần (VD: 2,3,4)')}
                error={sessionsCsvInvalid ? tr('Nhập các số 1–7, cách nhau bởi dấu phẩy.') : undefined}
              >
                <Input
                  value={draft.allowedSessionsPerWeekCsv}
                  invalid={sessionsCsvInvalid}
                  onChange={(e) => setField('allowedSessionsPerWeekCsv', e.target.value)}
                />
              </Field>
              <Field
                label={tr('Cường độ lớp nhóm mặc định (khuyến nghị)')}
                error={defaultSpwInvalid ? tr('Giá trị mặc định phải nằm trong danh sách được phép.') : undefined}
              >
                <CustomSelect
                  value={String(draft.defaultSessionsPerWeek)}
                  invalid={defaultSpwInvalid}
                  onChange={(val) => setField('defaultSessionsPerWeek', val)}
                  options={(allowedSessionsPerWeek.length ? allowedSessionsPerWeek : [Number(draft.defaultSessionsPerWeek)]).map((n) => ({
                    value: String(n),
                    label: trf('{0} buổi/tuần', { 0: n }),
                  }))}
                />
              </Field>
              <Field label={tr('Thời gian giữ chỗ khi thanh toán (phút)')}>
                <Input type="number" min={1} max={120} value={draft.checkoutHoldMinutes} onChange={(e) => setField('checkoutHoldMinutes', e.target.value)} />
              </Field>
            </div>
          )}

          {wizardStep === 'schedule' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Thời lượng buổi (phút)')}>
                <Input type="number" min={30} max={180} value={draft.sessionMinutes} onChange={(e) => setField('sessionMinutes', e.target.value)} />
              </Field>
              <Field label={tr('Nghỉ giữa buổi (phút)')}>
                <Input type="number" min={0} max={120} value={draft.restMinutes} onChange={(e) => setField('restMinutes', e.target.value)} />
              </Field>
              <Field label={tr('Số khung giờ tối đa Giáo viên đăng ký / ngày')}>
                <Input type="number" min={1} max={12} value={draft.dailySessionCap} onChange={(e) => setField('dailySessionCap', e.target.value)} />
              </Field>
              <Field label={tr('Hạn mức khung giờ Giáo viên / tuần (0 = không giới hạn)')}>
                <Input type="number" min={0} max={84} value={draft.weeklySessionCap} onChange={(e) => setField('weeklySessionCap', e.target.value)} />
              </Field>
              <Field label={tr('Hạn công bố lịch (ngày)')}>
                <Input type="number" min={1} max={365} value={draft.publicationHorizonDays} onChange={(e) => setField('publicationHorizonDays', e.target.value)} />
              </Field>
            </div>
          )}

          {wizardStep === 'changes' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Khóa ghi danh trước khai giảng (phút)')}>
                <Input type="number" min={0} max={10080} value={draft.enrollmentCutoffMinutesBeforeFirstSession} onChange={(e) => setField('enrollmentCutoffMinutesBeforeFirstSession', e.target.value)} />
              </Field>
              <Field label={tr('Báo trước hủy lịch (giờ)')}>
                <Input type="number" min={0} max={720} value={draft.cancellationLeadHours} onChange={(e) => setField('cancellationLeadHours', e.target.value)} />
              </Field>
              <Field label={tr('Báo trước dời lịch (giờ)')}>
                <Input type="number" min={0} max={720} value={draft.reschedulingLeadHours} onChange={(e) => setField('reschedulingLeadHours', e.target.value)} />
              </Field>
              <Field label={tr('Báo trước khi thay giáo viên chính (giờ)')}>
                <Input type="number" min={0} max={720} value={draft.mentorReplacementLeadHours} onChange={(e) => setField('mentorReplacementLeadHours', e.target.value)} />
              </Field>
              <div className="sm:col-span-2 space-y-2.5 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                <Checkbox
                  checked={Boolean(draft.learnerTransferEnabled)}
                  onChange={(e) => setField('learnerTransferEnabled', e.target.checked)}
                  label={tr('Cho phép học viên gửi yêu cầu chuyển lớp (luôn cần Admin duyệt)')}
                />
                <Checkbox
                  checked={false}
                  disabled
                  readOnly
                  onChange={() => {}}
                  label={tr('Cho phép chuyển khi lớp hiện tại đã khai giảng')}
                />
                <p id="transfer-after-start-note" className="text-[11.5px] text-rp-brand-strong">
                  {tr('Theo chính sách hiện hành: không chuyển lớp sau khi khóa học bắt đầu.')}
                </p>
                <Checkbox
                  checked={Boolean(draft.mentorReplacementEnabled)}
                  onChange={(e) => setField('mentorReplacementEnabled', e.target.checked)}
                  label={tr('Cho phép Admin thay giáo viên chính cho phần còn lại của lớp')}
                />
              </div>
            </div>
          )}

          {wizardStep === 'homework' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Hạn nộp bài tập mặc định (ngày)')}>
                <Input type="number" min={1} max={365} value={draft.homeworkDeadlineDays} onChange={(e) => setField('homeworkDeadlineDays', e.target.value)} />
              </Field>
              <Field label={tr('Giới hạn lượt đánh giá năng lực')}>
                <Input type="number" min={1} max={20} value={draft.placementAttemptLimit} onChange={(e) => setField('placementAttemptLimit', e.target.value)} />
              </Field>
              <Field label={tr('Ngưỡng nộp bài tập để xét học lại (%)')}>
                <Input type="number" min={0.01} max={100} step="0.01" value={draft.remediationCompletionThresholdPercent} onChange={(e) => setField('remediationCompletionThresholdPercent', e.target.value)} />
              </Field>
              <Field label={tr('Điều kiện so sánh tỷ lệ nộp bài tập')}>
                <CustomSelect
                  value={draft.remediationThresholdComparison}
                  onChange={(val) => setField('remediationThresholdComparison', val)}
                  options={[
                    { value: '>', label: tr('> (lớn hơn hẳn)') },
                    { value: '>=', label: tr('>= (từ ngưỡng trở lên)') },
                  ]}
                />
              </Field>
              <div className="sm:col-span-2 space-y-2.5 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                <Checkbox checked disabled onChange={() => {}} label={tr('Bắt buộc minh chứng kỳ thi JLPT (theo quy định)')} />
                <Checkbox checked disabled onChange={() => {}} label={tr('Admin duyệt yêu cầu học lại (theo quy định)')} />
              </div>
            </div>
          )}

          {wizardStep === 'kpi' && (
            <div className="space-y-4">
              <Field label={tr('Chu kỳ báo cáo KPI (ngày)')}>
                <Input type="number" min={1} max={366} value={draft.kpiReportingPeriodDays} onChange={(e) => setField('kpiReportingPeriodDays', e.target.value)} />
              </Field>
              <Banner tone="info" title={tr('Nguyên tắc snapshot theo phiên bản')}>
                {tr('Phiên bản mới chỉ áp dụng cho lớp nhóm, lịch đăng ký và yêu cầu phát sinh từ thời điểm hiệu lực; dữ liệu đã công bố giữ nguyên snapshot tại thời điểm tạo.')}
              </Banner>
            </div>
          )}

          {wizardStep === 'review' && (
            <div className="space-y-4">
              <Banner tone={draftDiffs.length > 0 ? 'info' : 'warning'} title={tr('Tóm tắt thay đổi so với phiên bản hiện hành')}>
                {draftDiffs.length > 0
                  ? trf('Có {0} tham số thay đổi so với v{1}.', { 0: draftDiffs.length, 1: current?.version ?? 0 })
                  : tr('Chưa có tham số nào khác với phiên bản hiện hành (chỉ cập nhật ngày hiệu lực nếu tiếp tục).')}
              </Banner>
              <div className="max-h-[42vh] overflow-auto rounded-xl border border-rp-line">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="bg-rp-table-head text-xs uppercase text-rp-text-muted">
                    <tr>
                      <th className="border-b border-rp-line px-3.5 py-2">{tr('Tham số')}</th>
                      <th className="border-b border-rp-line px-3.5 py-2">{tr('Hiện hành')}</th>
                      <th className="border-b border-rp-line px-3.5 py-2">{tr('Dự thảo mới')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rp-line">
                    {POLICY_COMPARE_FIELDS.map((meta) => {
                      const prev = formatCompareValue(current, meta);
                      const next = formatCompareValue(draft, meta);
                      const changed = current && prev !== next;
                      return (
                        <tr key={meta.key} className={changed ? 'bg-amber-50/70' : 'transition-colors duration-150 hover:bg-rp-row-hover'}>
                          <td className="px-3.5 py-2 font-medium text-rp-text">{tr(meta.label)}</td>
                          <td className="px-3.5 py-2 text-rp-text-muted">{prev}</td>
                          <td className="px-3.5 py-2 font-semibold text-rp-text">{next}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
