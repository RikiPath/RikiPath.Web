import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader, StaleDataBar } from '@/components/ui';
import { getAdminMentorVerifications, getAdminMentors, unwrapApiList } from '@/features/admin/api/adminApi.js';
import {
  SUPPORTED_JLPT_LEVELS,
  getAdminMentorKpiList,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const cardClass =
  'rounded-2xl border border-rp-line bg-white p-5 shadow-[0_6px_20px_rgba(80,40,55,0.03)]';

function fmtDate(value) {
  if (!value) return '—';
  const d = parseUtcDate(value);
  if (!d || Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(currentIntlTag(), { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function AdminMentorQualifications() {
  const { tr, trf } = useLocale();
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const mentorsQuery = useQuery({
    queryKey: ['admin-mentors-qualifications'],
    queryFn: async () => unwrapApiList(await getAdminMentors()),
  });

  const verificationsQuery = useQuery({
    queryKey: ['admin-mentor-verifications-qual'],
    queryFn: async () => unwrapApiList(await getAdminMentorVerifications()),
  });

  const kpiQuery = useQuery({
    queryKey: ['admin-mentor-kpi-qualifications'],
    queryFn: () => getAdminMentorKpiList({ page: 1, pageSize: 100 }),
  });

  const mentors = mentorsQuery.data || [];
  const verifications = verificationsQuery.data || [];
  const kpiRows = kpiQuery.data || [];

  const verificationMap = new Map(verifications.map((v) => [v.mentorId, v]));
  const kpiMap = new Map(kpiRows.map((k) => [k.mentorId, k]));

  const rows = mentors
    .map((m) => {
      const ver = verificationMap.get(m.id);
      const kpi = kpiMap.get(m.id);
      const teachingLevels = Array.isArray(kpi?.teachingJlptLevels) && kpi.teachingJlptLevels.length
        ? kpi.teachingJlptLevels
        : ver?.jlptLevel && SUPPORTED_JLPT_LEVELS.includes(ver.jlptLevel)
          ? [ver.jlptLevel]
          : [];
      return {
        mentorId: m.id,
        fullName: m.fullName || [ver?.firstName, ver?.lastName].filter(Boolean).join(' ') || m.email || `Giáo viên #${m.id}`,
        email: m.email || ver?.email || '',
        certificateLevel: ver?.jlptLevel || '—',
        teachingLevels,
        verificationStatus: ver?.verificationStatus || 'Unverified',
        reviewedAt: ver?.reviewedAt,
        isActive: m.isActive !== false,
      };
    })
    .filter((row) => {
      if (selectedMentorId && Number(selectedMentorId) !== row.mentorId) return false;
      if (levelFilter && !row.teachingLevels.includes(levelFilter) && row.certificateLevel !== levelFilter) return false;
      return true;
    });

  const isLoading = mentorsQuery.isLoading || verificationsQuery.isLoading || kpiQuery.isLoading;
  const firstError = mentorsQuery.error || verificationsQuery.error || kpiQuery.error;
  const hasCompleteData = Boolean(mentorsQuery.data && verificationsQuery.data && kpiQuery.data);
  const retryFailed = () => {
    if (mentorsQuery.isError) mentorsQuery.refetch();
    if (verificationsQuery.isError) verificationsQuery.refetch();
    if (kpiQuery.isError) kpiQuery.refetch();
  };
  const isFetching = mentorsQuery.isFetching || verificationsQuery.isFetching || kpiQuery.isFetching;

  return (
    <section className="space-y-5" data-testid="admin-mentor-qualifications">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-rp-bg-2 px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-rp-text">
            {tr('Phân quyền giảng dạy JLPT (N5–N2)')}
          </p>
          <p className="mt-0.5 text-[12px] text-rp-text-2">
            {tr('Phân quyền dùng để kiểm tra điều kiện gán Giáo viên và thay thế giáo viên chính cho các lớp học nhóm JLPT N5–N2. Xét duyệt chứng chỉ thực hiện tại mục Hồ sơ chờ xét duyệt.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[12px] font-medium text-rp-text-2">
            {tr('Giáo viên:')}
            <select
              value={selectedMentorId}
              onChange={(e) => setSelectedMentorId(e.target.value)}
              className="h-9 min-w-0 max-w-full rounded-xl border border-rp-line bg-white px-3 text-[13px] text-rp-text"
            >
              <option value="">{tr('Tất cả giáo viên')}</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} · {m.fullName || m.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12px] font-medium text-rp-text-2">
            {tr('Trình độ:')}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-9 rounded-xl border border-rp-line bg-white px-3 text-[13px] text-rp-text"
            >
              <option value="">{tr('Tất cả (N5–N2)')}</option>
              {SUPPORTED_JLPT_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-rp-text">
           {trf('Danh sách giáo viên & trình độ giảng dạy JLPT ({0})', { 0: rows.length })}
          </h3>
          <Link
            to="/admin/mentor-verifications/"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-rp-brand-strong px-3.5 text-[12px] font-medium text-white transition hover:bg-rp-brand-deep rp-press"
          >
            {tr('Xét duyệt hồ sơ & chứng chỉ')}
          </Link>
        </div>

        {firstError && hasCompleteData && (
          <StaleDataBar className="mt-4" onRetry={retryFailed} retrying={isFetching} />
        )}
        {isLoading ? (
          <SakuraLoader variant="section" context="profile" label={tr('Đang tải danh sách phân quyền')} delay={160} className="mt-4" />
        ) : firstError && !hasCompleteData ? (
          <ContextualErrorState
            className="mt-4"
            error={firstError}
            title={tr('Chưa tải đủ dữ liệu phân quyền giảng dạy')}
            onRetry={retryFailed}
            retrying={isFetching}
          />
        ) : rows.length === 0 ? (
          <ContextualEmptyState
            compact
            title={tr('Chưa có giáo viên nào trong phạm vi lọc.')}
            description={tr('Thử xóa bộ lọc trình độ hoặc chọn Tất cả giáo viên.')}
          />
        ) : (
          <div data-density="compact" className="rp-scroll-x mt-4">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-rp-line text-[11px] uppercase tracking-wider text-rp-text-muted">
                  <th className="py-2">{tr('Giáo viên')}</th>
                  <th className="py-2">{tr('Chứng chỉ hồ sơ')}</th>
                  <th className="py-2">{tr('Trình độ lớp nhóm (N5–N2)')}</th>
                  <th className="py-2">{tr('Trạng thái xác minh')}</th>
                  <th className="py-2">{tr('Cập nhật')}</th>
                  <th className="py-2 text-right">{tr('Thao tác')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.mentorId} className="border-b border-rp-line">
                    <td className="py-2.5 font-medium text-rp-text">
                      #{row.mentorId} · {row.fullName}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded-md bg-rp-brand-soft px-2 py-0.5 text-[12px] font-semibold text-rp-text-2">
                        {row.certificateLevel}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {row.teachingLevels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.teachingLevels.map((lv) => (
                            <span
                              key={lv}
                              className="rounded-md bg-rp-brand-soft px-2 py-0.5 text-[12px] font-semibold text-rp-brand-strong"
                            >
                              {lv}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-rp-text-muted">{tr('Chưa cấp quyền')}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          row.verificationStatus === 'Approved'
                            ? 'bg-rp-success-bg text-rp-success'
                            : 'bg-rp-warning-bg text-rp-warning'
                        }`}
                      >
                        {row.verificationStatus === 'Approved' ? tr('Đã phê duyệt') : row.verificationStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-rp-text-2">{fmtDate(row.reviewedAt)}</td>
                    <td className="py-2.5 text-right">
                      <Link
                        to={`/admin/mentor-verifications/?mentorId=${row.mentorId}`}
                        className="inline-flex h-8 items-center rounded-xl border border-rp-line bg-white px-3 text-[12px] font-medium text-rp-text-2 hover:bg-rp-bg-2"
                      >
                        {tr('Xem hồ sơ')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-rp-text-muted">
                      {tr('Chưa có giáo viên nào trong phạm vi lọc.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
