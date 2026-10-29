import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '../../components/shells';
import { api } from '../../api/client.js';

function rows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

const clock = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có giờ';
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminMentorSchedules({ embedded = false }) {
  const { pathname } = useLocation();
  const [mentorId, setMentorId] = useState('');
  const mentors = useQuery({
    queryKey: ['admin-mentors'],
    queryFn: async () => rows(await api.get('/admin/mentors')),
  });
  const slots = useQuery({
    queryKey: ['admin-mentor-availabilities'],
    queryFn: async () => rows(await api.get('/admin/mentor-availabilities')),
  });
  const visible = (slots.data || []).filter((slot) => !mentorId || String(slot.mentorId) === String(mentorId));
  const names = new Map((mentors.data || []).map((item) => [
    item.id,
    `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email,
  ]));
  const error = mentors.error || slots.error;
  const body = (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold">Lịch mentor</h1>
        <p className="mt-1 text-[13px] text-[#82737B]">Khung giờ đã mở và buổi đã đặt. Giờ Việt Nam.</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}
      <label className="block max-w-xs text-[12px] text-[#8C7782]">
        Mentor
        <select
          value={mentorId}
          onChange={(event) => setMentorId(event.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px]"
        >
          <option value="">Tất cả</option>
          {(mentors.data || []).map((item) => (
            <option key={item.id} value={item.id}>{names.get(item.id)}</option>
          ))}
        </select>
      </label>
      {slots.isPending ? <p className="text-[13px] text-[#82737B]">Đang tải khung giờ…</p> : (
        <div className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#FCFAFB] text-[#8C7D84]">
              <tr>
                <th className="px-4 py-3 font-medium">Mentor</th>
                <th className="px-4 py-3 font-medium">Khung giờ</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((slot) => (
                <tr key={slot.id} className="border-t border-[#F2EDF0]">
                  <td className="px-4 py-3">{slot.mentorName || names.get(slot.mentorId) || `Mentor #${slot.mentorId}`}</td>
                  <td className="px-4 py-3 tabular-nums">{clock(slot.startTime)} – {clock(slot.endTime)}</td>
                  <td className="px-4 py-3">{slot.isBooked ? 'Đã có buổi' : slot.rejectedAt ? 'Đã từ chối' : slot.isApproved ? 'Đang mở' : 'Chờ duyệt'}</td>
                </tr>
              ))}
              {!slots.isError && !visible.length && (
                <tr><td colSpan={3} className="px-4 py-6 text-[#8C7D84]">Chưa có khung giờ.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  if (embedded) return body;
  return <AdminShell pathname={pathname} breadcrumb="Lịch mentor">{body}</AdminShell>;
}
