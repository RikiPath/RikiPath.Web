import { useEffect, useMemo, useState } from 'react';
import {
  getCohortEntitlements,
  grantCohortEntitlement,
  previewCohortSchedule,
  revokeCohortEntitlement,
  saveCohort,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader } from '@/components/ui';
import ScheduleConflictList from '@/features/scheduling/components/ScheduleConflictList';
import { formatVnDateTime, formatVnSlotWindow, parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale, translateTemplate } from '@/locales/locale.js';

const PREVIEW_DEBOUNCE_MS = 400;
const ENTITLEMENT_STATUS_LABELS = Object.freeze({
  Active: 'Đang hiệu lực',
  Consumed: 'Đã sử dụng',
  Revoked: 'Đã thu hồi',
  Expired: 'Hết hạn',
});
const ENTITLEMENT_SOURCE_LABELS = Object.freeze({
  AdminManualGrant: 'Admin cấp quyền trực tiếp',
  OfficialJlptSupport: 'Hỗ trợ sau JLPT',
  PlacementTopScore: 'Đặc cách Placement',
});
const planLabel = (p) =>
  [
    p.name,
    `${p.level}`,
    p.intensityLabel ? `${p.intensityLabel}${p.isRecommendedIntensity ? ' ★ khuyến nghị' : ''}` : null,
    p.sessionsPerWeek ? translateTemplate('{0} buổi/tuần', { 0: p.sessionsPerWeek }) : null,
    translateTemplate('{0} buổi', { 0: p.totalSessions ?? '?' }),
    p.totalTeachingHours != null ? translateTemplate('{0} giờ', { 0: p.totalTeachingHours }) : null,
    `max ${p.capacity}`,
  ]
    .filter(Boolean)
    .join(' · ');

const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');
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
  const { tr, trf } = useLocale();
  const groupPlans = useMemo(() => plans.filter((p) => p.sessionType === 'Group'), [plans]);
  const [editingCohort, setEditingCohort] = useState(null);
  const [cohortSearch, setCohortSearch] = useState('');
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [publish, setPublish] = useState(true);
  const [pickedSlots, setPickedSlots] = useState([]);

  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [entitlements, setEntitlements] = useState([]);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [entitlementsError, setEntitlementsError] = useState(null);
  const [entitlementTick, setEntitlementTick] = useState(0);
  const [learnerId, setLearnerId] = useState('');
  const [sourceType, setSourceType] = useState('AdminManualGrant');
  const [note, setNote] = useState('');

  const availableMentorSlots = useMemo(() => {
    const selectedPlan = groupPlans.find((p) => String(p.id) === String(planId));
    const editingSlotIds = new Set(
      (editingCohort?.sessions || []).map((s) => s.availabilityId).filter(Boolean),
    );
    return adminSlots.filter((s) => {
      const ownedByEditing = editingCohort && editingSlotIds.has(s.id);
      if (!ownedByEditing && (!s.isApproved || s.rejectedAt || s.isInCohort || s.bookedCount > 0)) return false;
      const start = parseUtcDate(s.startTime);
      const end = parseUtcDate(s.endTime);
      if (!ownedByEditing && (!start || start <= new Date())) return false;
      if (mentorId && String(s.mentorId) !== String(mentorId)) return false;
      if (!ownedByEditing && selectedPlan?.sessionMinutes && end && start) {
        const mins = Math.round((end - start) / 60000);
        if (mins !== selectedPlan.sessionMinutes) return false;
      }
      return true;
    });
  }, [adminSlots, mentorId, planId, groupPlans, editingCohort]);

  const filteredCohorts = useMemo(() => {
    const q = cohortSearch.trim().toLowerCase();
    if (!q) return cohorts;
    return cohorts.filter((c) =>
      String(c.name || '').toLowerCase().includes(q)
      || String(c.level || '').toLowerCase().includes(q)
      || String(c.mentorName || '').toLowerCase().includes(q),
    );
  }, [cohorts, cohortSearch]);

  function startEditCohort(c) {
    setEditingCohort(c);
    setPlanId(c.planId ? String(c.planId) : '');
    setName(c.name || '');
    setMentorId(c.mentorId ? String(c.mentorId) : '');
    setCapacity(c.capacity ?? 4);
    setPublish(c.status === 'Published');
    setPickedSlots((c.sessions || []).map((s) => s.availabilityId).filter(Boolean));
  }

  function resetCohortForm() {
    setEditingCohort(null);
    setPlanId('');
    setName('');
    setMentorId('');
    setCapacity(4);
    setPublish(true);
    setPickedSlots([]);
  }

  useEffect(() => {
    if (!selectedCohortId) return;
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setEntitlementsLoading(true);
        setEntitlementsError(null);
        return getCohortEntitlements(Number(selectedCohortId));
      })
      .then((rows) => {
        if (!alive || !rows) return;
        setEntitlements(rows);
        setEntitlementsError(null);
      })
      .catch((e) => alive && setEntitlementsError(e))
      .finally(() => alive && setEntitlementsLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedCohortId, cohorts, entitlementTick]);

  // Xem trước xung đột lịch của Mentor với các khung đã chọn (debounce); máy chủ vẫn kiểm tra lại khi lưu.
  const previewKey = mentorId && pickedSlots.length ? `${mentorId}|${editingCohort?.id || ''}|${[...pickedSlots].sort((a, b) => a - b).join(',')}` : '';
  const [scheduleReport, setScheduleReport] = useState(null);
  useEffect(() => {
    if (!previewKey) return undefined;
    let alive = true;
    const [mid, cid, ids] = previewKey.split('|');
    const timer = setTimeout(() => {
      previewCohortSchedule({
        mentorId: Number(mid),
        availabilityIds: ids.split(',').map(Number),
        cohortId: cid ? Number(cid) : undefined,
      })
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
  const requiredSessionCount = selectedPlan?.totalSessions ? Number(selectedPlan.totalSessions) : null;
  const slotMaxCap = useMemo(() => {
    const pickedMax = availableMentorSlots
      .filter((s) => pickedSlots.includes(s.id) && Number(s.maxLearners) > 0)
      .map((s) => Number(s.maxLearners));
    if (pickedMax.length > 0) return Math.min(...pickedMax);
    return Number(selectedPlan?.capacity) || 4;
  }, [availableMentorSlots, pickedSlots, selectedPlan]);
  const sessionCountMismatch = Boolean(requiredSessionCount && pickedSlots.length !== requiredSessionCount);
  const capacityInvalid = Boolean(Number(capacity) < 1 || Number(capacity) > slotMaxCap);

  const visibleEntitlements = selectedCohortId ? entitlements : [];

  const toggleSlot = (id) => {
    setPickedSlots((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const handleSaveCohort = (e) => {
    e.preventDefault();
    if (publish && hasScheduleConflict) return;
    onRun(async () => {
      await saveCohort({
        id: editingCohort?.id,
        planId: Number(planId),
        name: name.trim(),
        mentorId: Number(mentorId),
        capacity: Number(capacity),
        availabilityIds: pickedSlots,
        publish,
        revision: editingCohort?.revision ?? 1,
      });
      resetCohortForm();
    }, editingCohort ? 'Đã cập nhật thông tin lớp nhóm.' : (publish ? 'Đã lưu và công bố lớp nhóm.' : 'Đã lưu nháp lớp nhóm.'));
  };

  const refreshSelectedEntitlements = async (cid) => {
    const rows = await getCohortEntitlements(cid);
    setEntitlements(rows);
  };

  return (
    <>
      <section className="course-box space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2>{trf('Danh sách lớp nhóm hiện có ({0})', { 0: cohorts.length })}</h2>
            <p className="course-meta">{tr('Xem sĩ số, trạng thái công bố và chỉnh sửa thông tin lớp hoặc quản lý quyền ghi danh.')}</p>
          </div>
          <input
            type="search"
            value={cohortSearch}
            onChange={(e) => setCohortSearch(e.target.value)}
            placeholder={tr('Tìm lớp theo tên, cấp độ, Giáo viên…')}
            className="h-9 min-w-[240px] rounded-xl border border-rp-line bg-rp-bg-2 px-3 text-xs text-rp-text focus:border-rp-brand focus:bg-white focus:outline-none"
          />
        </div>
        {filteredCohorts.length === 0 ? (
          <ContextualEmptyState compact title={tr('Chưa có lớp nhóm nào phù hợp.')} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th>{tr('Tên lớp')}</th>
                  <th>{tr('Cấp độ')}</th>
                  <th>{tr('Giáo viên')}</th>
                  <th>{tr('Sĩ số')}</th>
                  <th>{tr('Khai giảng')}</th>
                  <th>{tr('Trạng thái')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredCohorts.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f0e3e8', background: editingCohort?.id === c.id ? '#fff8fb' : undefined }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 6px' }}>{c.level}</td>
                    <td style={{ padding: '8px 6px' }}>{c.mentorName || `#${c.mentorId}`}</td>
                    <td style={{ padding: '8px 6px' }}>{c.enrolledCount ?? 0}/{c.capacity}</td>
                    <td style={{ padding: '8px 6px' }}>{fmtDate(c.startsAt)}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span className={`course-badge ${c.status === 'Published' ? 'ok' : 'muted'}`}>
                        {c.status === 'Published' ? tr('Đang mở') : c.status === 'Draft' ? tr('Nháp') : c.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => startEditCohort(c)}>{tr('Sửa lớp')}</button>
                        <button type="button" onClick={() => setSelectedCohortId(String(c.id))}>{tr('Quyền ghi danh')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="course-box">
        <h2>{tr('Quản trị lớp học nhóm cố định')}</h2>
        <p className="course-meta">
          {tr('Chỉ sử dụng khung giờ đã được Admin duyệt, cùng thời lượng và sĩ số theo chính sách lớp nhóm hiện hành.')}
        </p>
        <form className="course-form" onSubmit={handleSaveCohort}>
          <div className="flex flex-wrap items-center justify-between gap-2" style={{ width: '100%' }}>
            <h3 style={{ margin: 0 }}>{editingCohort ? trf('Chỉnh sửa lớp: {0}', { 0: editingCohort.name }) : tr('Tạo & mở lớp nhóm mới')}</h3>
            {editingCohort && (
              <button type="button" onClick={resetCohortForm}>{tr('Hủy sửa / Tạo mới')}</button>
            )}
          </div>
          <fieldset disabled={busy}>
            <label className="course-field">
              <span>{tr('Gói học nhóm')}</span>
              <select required value={planId} onChange={(e) => { setPlanId(e.target.value); setPickedSlots([]); }}>
                <option value="">{tr('Chọn gói Group')}</option>
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
                {selectedPlan.isRecommendedIntensity && <span className="course-badge ok">{tr('Khuyến nghị')}</span>}{' '}
                {selectedPlan.sessionsPerWeek ?? '—'}{' '}{tr('buổi/tuần ·')}{' '}{selectedPlan.totalSessions ?? '—'}{' '}{tr('buổi ·')}{' '}
                {selectedPlan.sessionMinutes ?? '—'}{' '}{tr('phút/buổi')}
                {selectedPlan.totalTeachingHours != null ? trf(' · tổng {0} giờ học', { 0: selectedPlan.totalTeachingHours }) : ''}
              </p>
            )}
            <label className="course-field">
              <span>{tr('Tên lớp')}</span>
              <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: N3 Evening Cohort A" />
            </label>
            <label className="course-field">
              <span>{tr('Giáo viên')}</span>
              <select required value={mentorId} onChange={(e) => { setMentorId(e.target.value); setPickedSlots([]); }}>
                <option value="">{tr('Chọn Giáo viên')}</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                ))}
              </select>
            </label>
            <label className="course-field" style={{ maxWidth: 160 }}>
              <span>{trf('Sĩ số lớp (1–{0})', { 0: slotMaxCap })}</span>
              <input type="number" required min={1} max={slotMaxCap} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </label>
            <label>
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />{' '}{tr('Công bố ngay (bị chặn khi còn xung đột lịch)')}
            </label>
            <div style={{ flexBasis: '100%' }}>
              <p className="course-meta">
                {requiredSessionCount
                  ? trf('Chọn khung giờ rảnh đã duyệt ({0}/{1} buổi theo gói):', { 0: pickedSlots.length, 1: requiredSessionCount })
                  : trf('Chọn khung giờ rảnh đã duyệt ({0} đã chọn):', { 0: pickedSlots.length })}
              </p>
              <div className="course-buttons" style={{ maxHeight: 160, overflowY: 'auto', padding: '6px 0' }}>
                {availableMentorSlots.length === 0 ? (
                  <span className="course-meta">{tr('Chưa có khung giờ trống phù hợp cho Giáo viên / gói đã chọn.')}</span>
                ) : (
                  availableMentorSlots.map((s) => (
                    <label
                      key={s.id}
                      className={`course-badge ${pickedSlots.includes(s.id) ? '' : 'muted'}`}
                      style={{ cursor: 'pointer' }}
                      title={`Slot #${s.id}`}
                    >
                      <input type="checkbox" checked={pickedSlots.includes(s.id)} onChange={() => toggleSlot(s.id)} />
                      {formatVnSlotWindow(s.startTime, s.endTime)}{' '}{tr('· tối đa')}{' '}{s.maxLearners}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div style={{ flexBasis: '100%' }}>
              {checkingSchedule && (
                <SakuraLoader
                  variant="inline"
                  size={16}
                  context="cohort"
                  label={tr('Đang kiểm tra xung đột lịch của Giáo viên')}
                  delay={160}
                />
              )}
              {activeReport?.error && (
                <p className="course-meta" style={{ color: '#8a5a10' }}>
                  {trf('Chưa kiểm tra được xung đột: {0} Máy chủ vẫn kiểm tra lại khi lưu.', { 0: activeReport.error })}
                </p>
              )}
              {activeReport && !activeReport.error && !hasScheduleConflict && (
                <p className="course-meta" style={{ color: '#1e5c36' }}>{tr('✓ Không phát hiện xung đột với lịch dạy hiện có của Giáo viên.')}</p>
              )}
              {capacityInvalid && (
                <p className="course-error">
                  {trf('Sĩ số lớp phải từ 1 đến {0} học viên theo chính sách hiện hành.', { 0: slotMaxCap })}
                </p>
              )}
              {sessionCountMismatch && (
                <p className="course-meta" style={{ color: '#8a5a10' }}>
                  {trf('Gói đang chọn yêu cầu đúng {0} buổi (hiện đang chọn {1}/{0}).', { 0: requiredSessionCount, 1: pickedSlots.length })}
                </p>
              )}
              <ScheduleConflictList
                conflicts={scheduleConflicts}
                title={trf('Phát hiện {0} xung đột lịch – không thể công bố lớp', { 0: scheduleConflicts.length })}
              />
            </div>
            <button
              className="course-primary"
              type="submit"
              disabled={busy || pickedSlots.length === 0 || sessionCountMismatch || capacityInvalid || (publish && hasScheduleConflict)}
              title={publish && hasScheduleConflict ? tr('Còn xung đột lịch – vui lòng chọn khung giờ khác.') : undefined}
            >
              {publish ? tr('Lưu & Công bố') : tr('Lưu nháp lớp nhóm')}
            </button>
          </fieldset>
        </form>
      </section>

      <section className="course-box">
        <h2>{tr('Cấp và quản lý quyền ghi danh lớp nhóm')}</h2>
        <p className="course-meta">
          {tr('Admin cấp quyền ghi danh cho từng lớp từ các nguồn hợp lệ như ôn lại JLPT, học bổng hoặc đổi lớp; mỗi quyền chỉ dùng cho một lớp.')}
        </p>
        <label className="course-field" style={{ maxWidth: 380, marginTop: 10 }}>
          <span>{tr('Chọn lớp nhóm cần quản lý quyền')}</span>
          <select value={selectedCohortId} onChange={(e) => setSelectedCohortId(e.target.value)}>
            <option value="">{tr('Chọn lớp')}</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level} · {trf('{0}/{1} học viên', { 0: c.enrolledCount ?? 0, 1: c.capacity })})
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
              <h3>{trf('Cấp quyền mới cho lớp {0}', { 0: cohorts.find((c) => String(c.id) === String(selectedCohortId))?.name || tr('đã chọn') })}</h3>
              <fieldset disabled={busy}>
                <label className="course-field" style={{ maxWidth: 160 }}>
                  <span>Learner ID</span>
                  <input type="number" required min={1} value={learnerId} onChange={(e) => setLearnerId(e.target.value)} />
                </label>
                <label className="course-field">
                  <span>{tr('Nguồn quyền ghi danh')}</span>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                    {SOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{tr(t.label)}</option>
                    ))}
                  </select>
                </label>
                <label className="course-field">
                  <span>{tr('Ghi chú')}</span>
                  <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('VD: Đủ điều kiện khai giảng đợt tháng 11')} />
                </label>
                <button className="course-primary" type="submit" disabled={busy}>
                  {tr('Cấp quyền ghi danh')}
                </button>
              </fieldset>
            </form>

            {entitlementsLoading && visibleEntitlements.length === 0 ? (
              <SakuraLoader variant="section" size={30} context="cohort" className="min-h-[80px] py-3" delay={160} />
            ) : entitlementsError ? (
              <ContextualErrorState
                compact
                error={entitlementsError}
                title={tr('Chưa tải được danh sách quyền ghi danh')}
                onRetry={() => setEntitlementTick((t) => t + 1)}
                retrying={entitlementsLoading}
              />
            ) : visibleEntitlements.length === 0 ? (
              <ContextualEmptyState compact title={tr('Chưa có quyền ghi danh nào được cấp cho lớp này.')} />
            ) : (
              visibleEntitlements.map((ent) => (
                <article className="course-row" key={ent.id}>
                  <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{ent.learnerName || tr('Học viên')}</strong> ({ent.learnerEmail}) ·{' '}
                      <code>{ent.entitlementReference}</code>
                    </div>
                    <span className={`course-badge ${ent.status === 'Active' ? 'ok' : ent.status === 'Consumed' ? 'warn' : 'muted'}`}>
                      {tr(ENTITLEMENT_STATUS_LABELS[ent.status] || ent.status)}
                    </span>
                  </div>
                  <p className="course-meta">
                    {tr('Nguồn:')}{' '}{ENTITLEMENT_SOURCE_LABELS[ent.sourceType] || ent.sourceType}{' '}{tr('· Cấp lúc:')}{' '}{fmtDate(ent.grantedAtUtc)}
                    {ent.consumedByCourseId ? trf(' · Đã dùng cho khóa #{0}', { 0: ent.consumedByCourseId }) : ''}
                    {ent.revocationReason ? trf(' · Lý do thu hồi: {0}', { 0: ent.revocationReason }) : ''}
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
                      {tr('Thu hồi quyền Active')}
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
