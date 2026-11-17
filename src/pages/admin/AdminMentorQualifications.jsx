import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAdminMentors, unwrapApiList } from '../../api/admin.js';
import {
  SUPPORTED_JLPT_LEVELS,
  getAdminMentorQualifications,
  grantAdminMentorQualification,
  revokeAdminMentorQualification,
} from '../../api/mentorGovernanceApi.js';

const inputClass =
  'mt-1 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30';
const cardClass =
  'rounded-2xl border border-[#EADFE5] bg-white p-5 shadow-[0_6px_20px_rgba(80,40,55,0.03)]';
const btnPrimary =
  'inline-flex h-10 items-center justify-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white transition hover:bg-[#982B4B] disabled:cursor-not-allowed disabled:opacity-50';
const btnSecondary =
  'inline-flex h-9 items-center justify-center rounded-xl border border-[#E7DAE1] bg-white px-3 text-[12px] font-medium text-[#51434A] transition hover:bg-[#FDFAFC] disabled:cursor-not-allowed disabled:opacity-50';

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function AdminMentorQualifications() {
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [qualForm, setQualForm] = useState({
    mentorUserId: '',
    jlptLevel: 'N3',
    notes: '',
  });
  const [revokeReason, setRevokeReason] = useState('');
  const [banner, setBanner] = useState(null);

  const mentorsQuery = useQuery({
    queryKey: ['admin-mentors-qualifications'],
    queryFn: async () => unwrapApiList(await getAdminMentors()),
  });
  const mentors = mentorsQuery.data || [];
  const mentorFilterId = selectedMentorId ? Number(selectedMentorId) : undefined;

  const mentorMap = new Map(mentors.map((m) => [m.id, m.fullName || m.email || `Mentor #${m.id}`]));

  const qualificationsQuery = useQuery({
    queryKey: ['admin-mentor-qualifications', mentorFilterId],
    queryFn: () => getAdminMentorQualifications(mentorFilterId),
  });

  const grantMut = useMutation({
    mutationFn: () => {
      const targetId = Number(qualForm.mentorUserId || selectedMentorId);
      if (!targetId) {
        throw new Error('Vui lòng chọn Cố vấn cần cấp trình độ giảng dạy JLPT.');
      }
      return grantAdminMentorQualification({
        mentorUserId: targetId,
        jlptLevel: qualForm.jlptLevel,
        notes: qualForm.notes?.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setBanner({ type: 'success', text: `Đã cấp quyền giảng dạy JLPT ${qualForm.jlptLevel}.` });
      setQualForm((prev) => ({ ...prev, notes: '' }));
      await qualificationsQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', text: err?.message || 'Không thể cấp quyền JLPT.' }),
  });

  const revokeMut = useMutation({
    mutationFn: ({ mentorUserId, jlptLevel }) =>
      revokeAdminMentorQualification({
        mentorUserId,
        jlptLevel,
        reason: revokeReason.trim() || 'Thu hồi theo quyết định quản trị học thuật',
      }),
    onSuccess: async () => {
      setBanner({ type: 'success', text: 'Đã thu hồi trình độ giảng dạy JLPT.' });
      await qualificationsQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', text: err?.message || 'Không thể thu hồi quyền JLPT.' }),
  });

  const qualifications = qualificationsQuery.data || [];

  return (
    <section className="space-y-5" data-testid="admin-mentor-qualifications">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-[#FDFAFC] px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-[#352C31]">
            Phân quyền giảng dạy JLPT (N5–N2)
          </p>
          <p className="mt-0.5 text-[12px] text-[#7D6C74]">
            Phân quyền dùng để khớp đúng Cố vấn với gói vé JLPT của học viên khi đặt lịch 1-1.
            Không cấu hình đơn giá giờ, hệ số lương hay chi trả thù lao.
          </p>
        </div>

        <label className="flex items-center gap-2 text-[12px] font-medium text-[#5E4B54]">
          Lọc cố vấn:
          <select
            value={selectedMentorId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedMentorId(value);
              setQualForm((prev) => ({ ...prev, mentorUserId: value || prev.mentorUserId }));
            }}
            className="h-9 min-w-[220px] rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31]"
          >
            <option value="">Tất cả cố vấn</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} · {m.fullName || m.email}
              </option>
            ))}
          </select>
        </label>
      </div>

      {banner && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-[13px] ${
            banner.type === 'error'
              ? 'border-[#F2C0CD] bg-[#FFF2F5] text-[#A32145]'
              : 'border-[#BCE2C9] bg-[#EFFAF3] text-[#1E5C36]'
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-[12px] underline opacity-80 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      <div className={cardClass}>
        <h3 className="text-[15px] font-semibold text-[#352C31]">
          Cấp trình độ giảng dạy JLPT mới
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            grantMut.mutate();
          }}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <label className="block text-[12px] font-medium text-[#6E5360]">
            Cố vấn
            <select
              required
              value={qualForm.mentorUserId || selectedMentorId}
              onChange={(e) => setQualForm((f) => ({ ...f, mentorUserId: e.target.value }))}
              className={inputClass}
            >
              <option value="">— Chọn cố vấn —</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} · {m.fullName || m.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[12px] font-medium text-[#6E5360]">
            Trình độ JLPT (chỉ N5–N2)
            <select
              value={qualForm.jlptLevel}
              onChange={(e) => setQualForm((f) => ({ ...f, jlptLevel: e.target.value }))}
              className={inputClass}
            >
              {SUPPORTED_JLPT_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[12px] font-medium text-[#6E5360]">
            Ghi chú thẩm định chuyên môn
            <input
              value={qualForm.notes}
              onChange={(e) => setQualForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="VD: Đạt chứng chỉ JLPT N1 / Đủ năng lực hướng dẫn"
              className={inputClass}
            />
          </label>

          <div className="flex items-end sm:col-span-3">
            <button type="submit" disabled={grantMut.isPending} className={btnPrimary}>
              {grantMut.isPending ? 'Đang lưu…' : 'Cấp quyền giảng dạy'}
            </button>
          </div>
        </form>
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-[#352C31]">
            Danh sách trình độ đã cấp ({qualifications.length})
          </h3>
          <input
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Lý do thu hồi (nếu cần thu hồi quyền)…"
            className="h-9 w-72 rounded-xl border border-[#E7DAE1] px-3 text-[12px]"
          />
        </div>

        {qualificationsQuery.isLoading ? (
          <p className="mt-4 text-[13px] text-[#7D6C74]">Đang tải danh sách phân quyền…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#EADFE5] text-[11px] uppercase tracking-wider text-[#8C7A83]">
                  <th className="py-2">Cố vấn</th>
                  <th className="py-2">Trình độ</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2">Ngày cấp</th>
                  <th className="py-2">Ghi chú</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map((q) => (
                  <tr key={q.id} className="border-b border-[#F9F5F7]">
                    <td className="py-2.5 font-medium text-[#352C31]">
                      #{q.mentorUserId} · {mentorMap.get(q.mentorUserId) || 'Cố vấn'}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded-md bg-[#F9EDF2] px-2 py-0.5 text-[12px] font-semibold text-[#942B49]">
                        {q.jlptLevel}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          q.isActive
                            ? 'bg-[#E7F6EC] text-[#1E5C36]'
                            : 'bg-[#FDECEF] text-[#A32145]'
                        }`}
                      >
                        {q.isActive ? 'Đang hiệu lực' : 'Đã thu hồi'}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#75646C]">{fmtDate(q.verifiedAtUtc)}</td>
                    <td className="py-2.5 text-[#75646C]">{q.notes || '—'}</td>
                    <td className="py-2.5 text-right">
                      {q.isActive && (
                        <button
                          type="button"
                          onClick={() =>
                            revokeMut.mutate({
                              mentorUserId: q.mentorUserId,
                              jlptLevel: q.jlptLevel,
                            })
                          }
                          disabled={revokeMut.isPending}
                          className={btnSecondary}
                        >
                          Thu hồi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {qualifications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#82737B]">
                      Chưa có phân quyền JLPT nào trong phạm vi lọc.
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
