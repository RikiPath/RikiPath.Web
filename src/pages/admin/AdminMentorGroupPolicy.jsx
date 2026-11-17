import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMentorGroupPolicyVersion,
  getCurrentMentorGroupPolicy,
  getMentorGroupPolicyHistory,
} from '../../api/admin.js';
import { describeApiError } from '../../api/apiErrors.js';

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

export default function AdminMentorGroupPolicy() {
  const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const currentQuery = useQuery({
    queryKey: ['admin-group-policy-current'],
    queryFn: getCurrentMentorGroupPolicy,
  });
  const historyQuery = useQuery({
    queryKey: ['admin-group-policy-history'],
    queryFn: getMentorGroupPolicyHistory,
  });

  const current = currentQuery.data;
  const [form, setForm] = useState(null);
  const [defaultEffectiveDate] = useState(() => nextVnDateString());
  const draft = form || {
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
    // Quy định chính thức: không chuyển lớp sau khi khóa học bắt đầu.
    transferAllowedAfterSourceStart: false,
    mentorReplacementEnabled: current?.mentorReplacementEnabled ?? true,
    mentorReplacementLeadHours: current?.mentorReplacementLeadHours ?? 24,
    weeklySessionCap: current?.weeklySessionCap ?? 0,
    courseDurationWeeks: current?.courseDurationWeeks ?? 10,
    allowedSessionsPerWeekCsv: current?.allowedSessionsPerWeekCsv ?? '2,3,4',
    defaultSessionsPerWeek: current?.defaultSessionsPerWeek ?? 3,
    checkoutHoldMinutes: current?.checkoutHoldMinutes ?? 10,
    minLearnersToStart: current?.minLearnersToStart ?? 1,
  };

  const allowedSessionsPerWeek = parseSessionsCsv(draft.allowedSessionsPerWeekCsv);
  const sessionsCsvInvalid = allowedSessionsPerWeek.length === 0;
  const defaultSpwInvalid = !sessionsCsvInvalid && !allowedSessionsPerWeek.includes(Number(draft.defaultSessionsPerWeek));
  const minLearnersInvalid = Number(draft.minLearnersToStart) > Number(draft.maxLearners);
  const formInvalid = sessionsCsvInvalid || defaultSpwInvalid || minLearnersInvalid;

  const setField = (key, value) => setForm({ ...draft, [key]: value });

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
      return createMentorGroupPolicyVersion(payload);
    },
    onSuccess: async (saved) => {
      setError('');
      setForm(null);
      setNotice(`Đã ban hành chính sách phiên bản v${saved?.version ?? ''}. Lớp và buổi đã công bố vẫn giữ snapshot cũ.`);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-group-policy-current'] }),
        client.invalidateQueries({ queryKey: ['admin-group-policy-history'] }),
      ]);
    },
    onError: (err) => {
      setNotice('');
      setError(describeApiError(err).message || 'Không tạo được phiên bản chính sách mới.');
    },
  });

  const history = Array.isArray(historyQuery.data) ? historyQuery.data : [];

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-semibold">Chính sách lớp nhóm & lịch dạy</h2>
        <p className="mt-1 text-[13px] text-[#82737B]">
          Mọi thay đổi tạo phiên bản mới có hiệu lực từ 00:00 giờ Việt Nam; lớp và buổi đã công bố giữ nguyên snapshot tại thời điểm tạo.
        </p>
      </header>

      {(error || currentQuery.error || historyQuery.error) && (
        <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
          {error || (currentQuery.error && describeApiError(currentQuery.error).message) || (historyQuery.error && describeApiError(historyQuery.error).message)}
        </p>
      )}
      {notice && <p className="rounded-xl bg-[#E7F6EC] px-4 py-3 text-[13px] text-[#1E5C36]">{notice}</p>}

      {current && (
        <section className="grid gap-3 rounded-2xl border border-[#EADFE5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase text-[#8C7782]">Phiên bản hiệu lực</p>
            <p className="mt-1 text-[18px] font-semibold text-[#AD3155]">v{current.version}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#8C7782]">Sĩ số & thời lượng</p>
            <p className="mt-1 text-[14px] font-medium">Tối đa {current.maxLearners} HV · {current.sessionMinutes}p (nghỉ {current.restMinutes}p)</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#8C7782]">Khóa ghi danh & hủy/dời</p>
            <p className="mt-1 text-[14px] font-medium">Trước {current.enrollmentCutoffMinutesBeforeFirstSession}p · Hủy/dời ≥ {current.cancellationLeadHours}h</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#8C7782]">Placement & Học lại</p>
            <p className="mt-1 text-[14px] font-medium">{current.placementAttemptLimit} lượt · BTVN {current.remediationThresholdComparison} {current.remediationCompletionThresholdPercent}%</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
        <h3 className="text-[15px] font-semibold">Ban hành phiên bản chính sách mới</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[12px] text-[#6E5360]">
            Ngày hiệu lực (00:00 GMT+7)
            <input type="date" value={draft.effectiveDate} onChange={(e) => setField('effectiveDate', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Sĩ số tối đa (1–4)
            <input type="number" min={1} max={4} value={draft.maxLearners} onChange={(e) => setField('maxLearners', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Thời lượng buổi (phút)
            <input type="number" min={30} max={180} value={draft.sessionMinutes} onChange={(e) => setField('sessionMinutes', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Nghỉ giữa buổi (phút)
            <input type="number" min={0} max={120} value={draft.restMinutes} onChange={(e) => setField('restMinutes', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Khóa ghi danh trước khai giảng (phút)
            <input type="number" min={0} max={10080} value={draft.enrollmentCutoffMinutesBeforeFirstSession} onChange={(e) => setField('enrollmentCutoffMinutesBeforeFirstSession', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Số buổi tối đa / ngày
            <input type="number" min={1} max={12} value={draft.dailySessionCap} onChange={(e) => setField('dailySessionCap', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Hạn công bố lịch (ngày)
            <input type="number" min={1} max={365} value={draft.publicationHorizonDays} onChange={(e) => setField('publicationHorizonDays', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Hạn nộp BTVN mặc định (ngày)
            <input type="number" min={1} max={365} value={draft.homeworkDeadlineDays} onChange={(e) => setField('homeworkDeadlineDays', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Báo trước hủy lịch (giờ)
            <input type="number" min={0} max={720} value={draft.cancellationLeadHours} onChange={(e) => setField('cancellationLeadHours', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Báo trước dời lịch (giờ)
            <input type="number" min={0} max={720} value={draft.reschedulingLeadHours} onChange={(e) => setField('reschedulingLeadHours', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Giới hạn lượt Placement
            <input type="number" min={1} max={20} value={draft.placementAttemptLimit} onChange={(e) => setField('placementAttemptLimit', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Chu kỳ báo cáo KPI (ngày)
            <input type="number" min={1} max={366} value={draft.kpiReportingPeriodDays} onChange={(e) => setField('kpiReportingPeriodDays', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Ngưỡng BTVN học lại (%)
            <input type="number" min={0.01} max={100} step="0.01" value={draft.remediationCompletionThresholdPercent} onChange={(e) => setField('remediationCompletionThresholdPercent', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Điều kiện so sánh BTVN
            <select value={draft.remediationThresholdComparison} onChange={(e) => setField('remediationThresholdComparison', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[13px]">
              <option value=">">&gt; (lớn hơn hẳn)</option>
              <option value=">=">&gt;= (từ ngưỡng trở lên)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-4 text-[12px] text-[#6E5360]">
            <input type="checkbox" checked disabled />
            Bắt buộc minh chứng kỳ thi JLPT (theo quy định)
          </label>
          <label className="flex items-center gap-2 pt-4 text-[12px] text-[#6E5360]">
            <input type="checkbox" checked disabled />
            Admin duyệt yêu cầu học lại (theo quy định)
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Báo trước khi thay cố vấn chính (giờ)
            <input type="number" min={0} max={720} value={draft.mentorReplacementLeadHours} onChange={(e) => setField('mentorReplacementLeadHours', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="flex items-center gap-2 pt-4 text-[12px] text-[#6E5360]">
            <input type="checkbox" checked={Boolean(draft.learnerTransferEnabled)} onChange={(e) => setField('learnerTransferEnabled', e.target.checked)} />
            Cho phép học viên gửi yêu cầu chuyển lớp (luôn cần Admin duyệt)
          </label>
          <label className="flex items-center gap-2 pt-4 text-[12px] text-[#6E5360]">
            <input type="checkbox" disabled checked={false} readOnly aria-describedby="transfer-after-start-note" />
            Cho phép chuyển khi lớp hiện tại đã khai giảng
          </label>
          <p id="transfer-after-start-note" className="pt-1 text-[11.5px] text-[#A33357] sm:col-span-2">
            Theo quyết định Product Owner: không chuyển lớp sau khi khóa học bắt đầu.
          </p>
          <label className="text-[12px] text-[#6E5360]">
            Số buổi tối đa / tuần (0 = không giới hạn)
            <input type="number" min={0} max={84} value={draft.weeklySessionCap} onChange={(e) => setField('weeklySessionCap', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Thời lượng khóa (tuần)
            <input type="number" min={1} max={52} value={draft.courseDurationWeeks} onChange={(e) => setField('courseDurationWeeks', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Số buổi/tuần được phép (VD: 2,3,4)
            <input value={draft.allowedSessionsPerWeekCsv} onChange={(e) => setField('allowedSessionsPerWeekCsv', e.target.value)} aria-invalid={sessionsCsvInvalid} className={`mt-1 h-9 w-full rounded-lg border px-2.5 text-[13px] ${sessionsCsvInvalid ? 'border-[#A33357]' : 'border-[#E7DAE1]'}`} />
            {sessionsCsvInvalid && <span className="mt-1 block text-[11px] text-[#A33357]">Nhập các số 1–7, cách nhau bởi dấu phẩy.</span>}
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Số buổi/tuần mặc định (khuyến nghị)
            <select value={draft.defaultSessionsPerWeek} onChange={(e) => setField('defaultSessionsPerWeek', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[13px]">
              {(allowedSessionsPerWeek.length ? allowedSessionsPerWeek : [Number(draft.defaultSessionsPerWeek)]).map((n) => (
                <option key={n} value={n}>{n} buổi/tuần</option>
              ))}
            </select>
            {defaultSpwInvalid && <span className="mt-1 block text-[11px] text-[#A33357]">Giá trị mặc định phải nằm trong danh sách được phép.</span>}
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Thời gian giữ chỗ khi thanh toán (phút)
            <input type="number" min={1} max={120} value={draft.checkoutHoldMinutes} onChange={(e) => setField('checkoutHoldMinutes', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
          </label>
          <label className="text-[12px] text-[#6E5360]">
            Số học viên tối thiểu để khai giảng
            <input type="number" min={1} max={Number(draft.maxLearners) || 4} value={draft.minLearnersToStart} onChange={(e) => setField('minLearnersToStart', e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] px-2.5 text-[13px]" />
            {minLearnersInvalid && <span className="mt-1 block text-[11px] text-[#A33357]">Không được lớn hơn sĩ số tối đa.</span>}
          </label>
          <label className="flex items-center gap-2 pt-4 text-[12px] text-[#6E5360]">
            <input type="checkbox" checked={Boolean(draft.mentorReplacementEnabled)} onChange={(e) => setField('mentorReplacementEnabled', e.target.checked)} />
            Cho phép Admin thay cố vấn chính cho phần còn lại của lớp
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={createVersion.isPending || currentQuery.isPending || formInvalid}
            onClick={() => createVersion.mutate()}
            className="h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50"
          >
            {createVersion.isPending ? 'Đang lưu phiên bản…' : 'Tạo phiên bản chính sách mới'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
        <div className="border-b border-[#F0E7EC] px-4 py-3">
          <h3 className="text-[15px] font-semibold">Lịch sử phiên bản chính sách</h3>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-[#82737B]">Chưa có phiên bản chính sách nào.</p>
        ) : (
          <div className="divide-y divide-[#F3EDF0]">
            {history.map((item) => (
              <div key={item.id ?? item.version} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span className="font-semibold text-[#AD3155]">v{item.version}</span>
                <span>Hiệu lực: {String(item.effectiveFromUtc).slice(0, 10)}</span>
                <span>Max {item.maxLearners} HV · {item.sessionMinutes}p / nghỉ {item.restMinutes}p</span>
                <span>Cutoff {item.enrollmentCutoffMinutesBeforeFirstSession}p · Placement {item.placementAttemptLimit} lượt</span>
                <span>BTVN {item.remediationThresholdComparison} {item.remediationCompletionThresholdPercent}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
