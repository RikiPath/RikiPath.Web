import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import { getMentorDisputes, respondMentorDispute } from '../../api/mentorBookingApi.js';

const CATEGORY = {
  MentorAbsent: 'Cố vấn vắng',
  SessionNotConducted: 'Buổi không diễn ra',
  MediaRoomIssue: 'Lỗi phòng họp',
  QualityIssue: 'Chất lượng buổi',
  InappropriateBehavior: 'Hành vi không phù hợp',
  PolicyDispute: 'Chính sách',
  Other: 'Khác',
};

export default function MentorDisputes() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['mentor-disputes'],
    queryFn: () => getMentorDisputes({ page: 1, pageSize: 20 }),
  });
  const rows = Array.isArray(query.data) ? query.data : query.data?.items || [];

  const respond = useMutation({
    mutationFn: ({ id, responseText }) => respondMentorDispute(id, { responseText }),
    onSuccess: () => {
      setError('');
      client.invalidateQueries({ queryKey: ['mentor-disputes'] });
    },
    onError: (err) => setError(err.message),
  });

  return (
    <ConsultShell pathname={pathname} breadcrumb="Khiếu nại">
      <main className="mx-auto w-full max-w-[860px] px-4 py-6 text-[#2D282A] sm:px-6">
        <h1 className="text-2xl font-extrabold">Khiếu nại cần giải trình</h1>
        {query.isPending && <p className="mt-4 text-sm">Đang tải…</p>}
        {query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{query.error.message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 space-y-3">
          {rows.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#eadfd9] bg-white p-5">
              <p className="text-sm font-bold">{item.learnerName} · lịch #{item.mentorBookingId}</p>
              <p className="mt-1 text-xs text-[#6F6669]">{CATEGORY[item.category] || item.category} · {item.status}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{item.reason}</p>
              {item.mentorResponse ? (
                <p className="mt-3 rounded-xl bg-[#FAF7F5] px-3 py-2 text-sm">Đã giải trình: {item.mentorResponse}</p>
              ) : (
                <form
                  className="mt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const responseText = (drafts[item.id] || '').trim();
                    if (!responseText) return;
                    respond.mutate({ id: item.id, responseText });
                  }}
                >
                  <textarea
                    value={drafts[item.id] || ''}
                    onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    rows={3}
                    placeholder="Nội dung giải trình"
                    className="w-full rounded-xl border border-[#eadfd9] px-3 py-2 text-sm"
                  />
                  <button type="submit" disabled={respond.isPending} className="mt-2 rounded-full bg-[#2D282A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Gửi giải trình
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
        {!query.isPending && !rows.length && <p className="mt-6 text-sm text-[#6F6669]">Chưa có khiếu nại.</p>}
      </main>
    </ConsultShell>
  );
}
