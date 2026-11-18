import { useEffect, useMemo, useState } from 'react';
import {
  getCohortEntitlements,
  grantCohortEntitlement,
  previewCohortSchedule,
  revokeCohortEntitlement,
  saveCohort,
} from '../../api/studyCourses';
import { describeApiError } from '../../api/apiErrors';
import ScheduleConflictList from './ScheduleConflictList';

const PREVIEW_DEBOUNCE_MS = 400;
const planLabel = (p) =>
  [
    p.name,
    `${p.level}`,
    p.intensityLabel ? `${p.intensityLabel}${p.isRecommendedIntensity ? ' ★ khuyến nghị' : ''}` : null,
    p.sessionsPerWeek ? `${p.sessionsPerWeek} buổi/tuần` : null,
    `${p.totalSessions ?? '?'} buổi`,
    p.totalTeachingHours != null ? `${p.totalTeachingHours} giờ` : null,
    `max ${p.capacity}`,
  ]
    .filter(Boolean)
    .join(' · ');

const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const SOURCE_TYPES = [
  { value: 'AdminManualGrant', label: 'Admin cấp quyền trực tiếp' },
  { value: 'ScholarshipGrant', label: 'Học bổng / Tài trợ nhóm' },
  { value: 'RemediationApproved', label: 'Quyền ôn lại JLPT đã duyệt' },
  { value: 'PartnerSponsor', label: 'Đối tác tài trợ' },
];

export default function AdminCohortConsolePanel({
  plans = [],
  cohorts = [],
  mentors = [],
  adminSlots = [],
  busy = false,
  onRun,
}) {
  const groupPlans = useMemo(() => plans.filter((p) => p.sessionType === 'Group'), [plans]);
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [publish, setPublish] = useState(true);
  const [pickedSlots, setPickedSlots] = useState([]);

  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [entitlements, setEntitlements] = useState([]);
  const [learnerId, setLearnerId] = useState('');
  const [sourceType, setSourceType] = useState('AdminManualGrant');
  const [note, setNote] = useState('');

  const availableMentorSlots = useMemo(() => {
    const selectedPlan = groupPlans.find((p) => String(p.id) === String(planId));
    return adminSlots.filter((s) => {
      if (!s.isApproved || s.rejectedAt || s.isInCohort || s.bookedCount > 0) return false;
      if (new Date(s.startTime) <= new Date()) return false;
      if (mentorId && String(s.mentorId) !== String(mentorId)) return false;
      if (selectedPlan?.sessionMinutes) {
        const mins = Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000);
        if (mins !== selectedPlan.sessionMinutes) return false;
      }
      return true;
    });
  }, [adminSlots, mentorId, planId, groupPlans]);

  useEffect(() => {
    if (!selectedCohortId) return;
    let alive = true;
    getCohortEntitlements(Number(selectedCohortId))
      .then((rows) => alive && setEntitlements(rows))
      .catch(() => alive && setEntitlements([]));
    return () => {
      alive = false;
    };
  }, [selectedCohortId, cohorts]);

  // Xem trước xung đột lịch của Mentor với các khung đã chọn (debounce); máy chủ vẫn kiểm tra lại khi lưu.
  const previewKey = mentorId && pickedSlots.length ? `${mentorId}|${[...pickedSlots].sort((a, b) => a - b).join(',')}` : '';
  const [scheduleReport, setScheduleReport] = useState(null);
  useEffect(() => {
    if (!previewKey) return undefined;
    let alive = true;
    const [mid, ids] = previewKey.split('|');
    const timer = setTimeout(() => {
      previewCohortSchedule({ mentorId: Number(mid), availabilityIds: ids.split(',').map(Number) })
        .then((report) => alive && setScheduleReport({ key: previewKey, isValid: report?.isValid !== false, conflicts: report?.conflicts || [], error: '' }))
        .catch((err) => alive && setScheduleReport({ key: previewKey, isValid: true, conflicts: [], error: describeApiError(err).message }));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [previewKey]);
  const activeReport = previewKey && scheduleReport?.key === previewKey ? scheduleReport : null;
  const scheduleConflicts = activeReport?.conflicts || [];
  const hasScheduleConflict = scheduleConflicts.length > 0 || activeReport?.isValid === false;
  const checkingSchedule = Boolean(previewKey) && !activeReport;
  const selectedPlan = groupPlans.find((p) => String(p.id) === String(planId)) || null;

  const visibleEntitlements = selectedCohortId ? entitlements : [];

  const toggleSlot = (id) => {
    setPickedSlots((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const handleSaveCohort = (e) => {
    e.preventDefault();
    if (publish && hasScheduleConflict) return;
    onRun(async () => {
      await saveCohort({
        planId: Number(planId),
        name: name.trim(),
        mentorId: Number(mentorId),
        capacity: Number(capacity),
        availabilityIds: pickedSlots,
        publish,
        revision: 1,
      });
      setName('');
      setPickedSlots([]);
    }, publish ? 'Đã lưu và công bố lớp nhóm.' : 'Đã lưu nháp lớp nhóm.');
  };

  const refreshSelectedEntitlements = async (cid) => {
    const rows = await getCohortEntitlements(cid);
    setEntitlements(rows);
  };

  return (
    <>
      <section className="course-box">
        <h2>Quản trị lớp học nhóm cố định</h2>
        <p className="course-meta">
          Chỉ sử dụng khung giờ đã được Admin duyệt, cùng thời lượng và sĩ số theo Mentor Group Policy hiện hành.
        </p>
        <form className="course-form" onSubmit={handleSaveCohort}>
          <h3>Tạo & mở lớp nhóm mới</h3>
          <fieldset disabled={busy}>
            <label className="course-field">
              <span>Gói học nhóm</span>
              <select required value={planId} onChange={(e) => { setPlanId(e.target.value); setPickedSlots([]); }}>
                <option value="">Chọn gói Group</option>
                {groupPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {planLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            {selectedPlan && (
              <p className="course-meta" style={{ flexBasis: '100%' }}>
                {selectedPlan.intensityLabel && <span className="course-badge">{selectedPlan.intensityLabel}</span>}{' '}
                {selectedPlan.isRecommendedIntensity && <span className="course-badge ok">Khuyến nghị</span>}{' '}
                {selectedPlan.sessionsPerWeek ?? '—'} buổi/tuần · {selectedPlan.totalSessions ?? '—'} buổi ·{' '}
                {selectedPlan.sessionMinutes ?? '—'} phút/buổi
                {selectedPlan.totalTeachingHours != null ? ` · tổng ${selectedPlan.totalTeachingHours} giờ học` : ''}
              </p>
            )}
            <label className="course-field">
              <span>Tên lớp</span>
              <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: N3 Evening Cohort A" />
            </label>
            <label className="course-field">
              <span>Mentor</span>
              <select required value={mentorId} onChange={(e) => { setMentorId(e.target.value); setPickedSlots([]); }}>
                <option value="">Chọn Mentor</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                ))}
              </select>
            </label>
            <label className="course-field" style={{ maxWidth: 140 }}>
              <span>Sĩ số lớp</span>
              <input type="number" required min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </label>
            <label>
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Công bố ngay (bị chặn khi còn xung đột lịch)
            </label>
            <div style={{ flexBasis: '100%' }}>
              <p className="course-meta">Chọn khung giờ rảnh đã duyệt ({pickedSlots.length} đã chọn):</p>
              <div className="course-buttons" style={{ maxHeight: 160, overflowY: 'auto', padding: '6px 0' }}>
                {availableMentorSlots.length === 0 ? (
                  <span className="course-meta">Chưa có khung giờ trống phù hợp cho Mentor / gói đã chọn.</span>
                ) : (
                  availableMentorSlots.map((s) => (
                    <label key={s.id} className="course-badge muted" style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={pickedSlots.includes(s.id)} onChange={() => toggleSlot(s.id)} />
                      #{s.id} · {fmtDate(s.startTime)} (max {s.maxLearners})
                    </label>
                  ))
                )}
              </div>
            </div>
            <div style={{ flexBasis: '100%' }}>
              {checkingSchedule && <p className="course-meta">Đang kiểm tra xung đột lịch của Mentor…</p>}
              {activeReport?.error && (
                <p className="course-meta" style={{ color: '#8a5a10' }}>
                  Chưa kiểm tra được xung đột: {activeReport.error} Máy chủ vẫn kiểm tra lại khi lưu.
                </p>
              )}
              {activeReport && !activeReport.error && !hasScheduleConflict && (
                <p className="course-meta" style={{ color: '#1e5c36' }}>✓ Không phát hiện xung đột với lịch dạy hiện có của Mentor.</p>
              )}
              <ScheduleConflictList
                conflicts={scheduleConflicts}
                title={`Phát hiện ${scheduleConflicts.length} xung đột lịch – không thể công bố lớp`}
              />
            </div>
            <button
              className="course-primary"
              type="submit"
              disabled={busy || pickedSlots.length === 0 || (publish && hasScheduleConflict)}
              title={publish && hasScheduleConflict ? 'Còn xung đột lịch – vui lòng chọn khung giờ khác.' : undefined}
            >
              {publish ? 'Lưu & Công bố' : 'Lưu nháp lớp nhóm'}
            </button>
          </fieldset>
        </form>
      </section>

      <section className="course-box">
        <h2>Cấp & quản lý quyền ghi danh lớp nhóm (Entitlement)</h2>
        <p className="course-meta">
          Quyền ghi danh lớp nhóm tách biệt hoàn toàn với vé tư vấn 1-1. Không thể cấp từ nguồn vé tư vấn 1-1.
        </p>
        <label className="course-field" style={{ maxWidth: 380, marginTop: 10 }}>
          <span>Chọn lớp nhóm cần quản lý quyền</span>
          <select value={selectedCohortId} onChange={(e) => setSelectedCohortId(e.target.value)}>
            <option value="">Chọn lớp</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} · {c.name} ({c.level} · {c.enrolledCount ?? 0}/{c.capacity})
              </option>
            ))}
          </select>
        </label>

        {selectedCohortId && (
          <>
            <form
              className="course-form"
              onSubmit={(e) => {
                e.preventDefault();
                onRun(async () => {
                  const cid = Number(selectedCohortId);
                  await grantCohortEntitlement(cid, {
                    learnerId: Number(learnerId),
                    sourceType,
                    note: note.trim() || null,
                  });
                  setLearnerId('');
                  setNote('');
                  await refreshSelectedEntitlements(cid);
                }, 'Đã cấp quyền ghi danh lớp nhóm cho học viên.');
              }}
            >
              <h3>Cấp quyền mới cho lớp #{selectedCohortId}</h3>
              <fieldset disabled={busy}>
                <label className="course-field" style={{ maxWidth: 160 }}>
                  <span>Learner ID</span>
                  <input type="number" required min={1} value={learnerId} onChange={(e) => setLearnerId(e.target.value)} />
                </label>
                <label className="course-field">
                  <span>Nguồn quyền ghi danh</span>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                    {SOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="course-field">
                  <span>Ghi chú</span>
                  <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Đủ điều kiện khai giảng đợt tháng 11" />
                </label>
                <button className="course-primary" type="submit" disabled={busy}>
                  Cấp quyền ghi danh
                </button>
              </fieldset>
            </form>

            {visibleEntitlements.length === 0 ? (
              <p className="course-meta" style={{ marginTop: 10 }}>Chưa có quyền ghi danh nào được cấp cho lớp này.</p>
            ) : (
              visibleEntitlements.map((ent) => (
                <article className="course-row" key={ent.id}>
                  <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{ent.learnerName || `Học viên #${ent.learnerId}`}</strong> ({ent.learnerEmail}) ·{' '}
                      <code>{ent.entitlementReference}</code>
                    </div>
                    <span className={`course-badge ${ent.status === 'Active' ? 'ok' : ent.status === 'Consumed' ? 'warn' : 'muted'}`}>
                      {ent.status}
                    </span>
                  </div>
                  <p className="course-meta">
                    Nguồn: {ent.sourceType} · Cấp lúc: {fmtDate(ent.grantedAtUtc)}
                    {ent.consumedByCourseId ? ` · Đã dùng cho khóa #${ent.consumedByCourseId}` : ''}
                    {ent.revocationReason ? ` · Lý do thu hồi: ${ent.revocationReason}` : ''}
                  </p>
                  {ent.status === 'Active' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onRun(async () => {
                          await revokeCohortEntitlement(ent.id, 'Thu hồi bởi quản trị viên.');
                          await refreshSelectedEntitlements(Number(selectedCohortId));
                        }, 'Đã thu hồi quyền ghi danh.')
                      }
                    >
                      Thu hồi quyền Active
                    </button>
                  )}
                </article>
              ))
            )}
          </>
        )}
      </section>
    </>
  );
}
