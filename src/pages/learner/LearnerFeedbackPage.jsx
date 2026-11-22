import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { listLearnerFeedback } from '../../api/learnerFeedbackApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { AdminShell, LearnerShell } from '../../components/shells';

const types = {
  mentor: 'Buổi học với mentor', lesson: 'Bài học', exercise: 'Bài luyện tập',
  'mock-test': 'Đề thi thử', placement: 'Đánh giá năng lực', homework: 'Bài tập về nhà',
  vocabulary: 'Từ vựng', kanji: 'Hán tự', grammar: 'Ngữ pháp', speaking: 'Luyện nói',
  writing: 'Luyện viết', general: 'Hệ thống',
};
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const button = 'rounded-lg border border-card-border bg-white px-3 py-2 font-semibold text-primary disabled:opacity-50';

export default function LearnerFeedbackPage({ admin = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['learner-feedback-list', user?.userId, admin, type, page],
    queryFn: () => listLearnerFeedback({ admin, type, page }),
    enabled: Boolean(user?.userId), retry: false,
  });
  const Shell = admin ? AdminShell : LearnerShell;
  const title = admin ? 'Phản hồi học viên' : 'Phản hồi của tôi';

  return <Shell pathname={pathname} breadcrumb={title}>
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 text-[#49353F] sm:px-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {!admin && <LearnerFeedbackPanel type="general" label="Góp ý về hệ thống" />}
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
        Loại nội dung
        <select className="rounded-lg border border-card-border bg-white px-3 py-2" value={type}
          onChange={event => { setType(event.target.value); setPage(1); }}>
          <option value="">Tất cả nội dung</option>
          {Object.entries(types).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
        </select>
      </label>
      {query.isPending && <p role="status">Đang tải danh sách phản hồi…</p>}
      {query.isError && <p role="alert" className="text-sm text-rose-700">Chưa tải được phản hồi.{' '}
        <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>Thử lại</button>
      </p>}
      {query.isSuccess && !query.data?.items?.length && <p className="text-sm text-[#765E6B]">Chưa có phản hồi trong mục này.</p>}
      <ul className="space-y-3">
        {query.data?.items?.map(entry => <li key={entry.targetType + ':' + entry.id}
          className="space-y-2 rounded-xl border border-card-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-[#765E6B]">{types[entry.targetType] ?? entry.targetType}</p>
              <h2 className="break-words font-semibold">{entry.targetTitle}
                {entry.targetType === 'mentor' && ' · Buổi #' + entry.targetId}</h2>
            </div>
            <p className="font-semibold text-primary">{entry.rating}/5 sao</p>
          </div>
          <p className="text-xs text-[#765E6B]">{admin && (entry.learnerName || 'Học viên #' + entry.learnerId) + ' · '}
            <time dateTime={entry.updatedAtUtc}>{dateFormat.format(new Date(entry.updatedAtUtc))}</time>
          </p>
          {entry.comment && <p className="whitespace-pre-wrap break-words text-sm">{entry.comment}</p>}
          {!admin && entry.targetType !== 'general' && <LearnerFeedbackPanel type={entry.targetType} id={entry.targetId} label="Chỉnh sửa phản hồi" />}
        </li>)}
      </ul>
      {(page > 1 || query.data?.hasMore) && <nav aria-label="Trang phản hồi" className="flex items-center gap-3 text-sm">
        <button className={button} type="button" disabled={page === 1 || query.isFetching}
          onClick={() => setPage(value => value - 1)}>Trang trước</button>
        <span>Trang {page}</span>
        <button className={button} type="button" disabled={!query.data?.hasMore || query.isFetching}
          onClick={() => setPage(value => value + 1)}>Trang sau</button>
      </nav>}
    </main>
  </Shell>;
}
