import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/auth/authContext.js';
import { getMyFeedback, saveMyFeedback } from '../api/learnerFeedbackApi.js';

const action = 'rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';

function FeedbackForm({ initial, save, saving }) {
  const name = useId();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? '');

  return <form className="space-y-3" onSubmit={event => {
    event.preventDefault();
    if (rating && !saving) save({ rating, comment: comment.trim() || null });
  }}>
    <p className="text-xs text-[#765E6B]">Chỉ bạn và quản trị viên xem được phản hồi này.</p>
    <fieldset className="flex flex-wrap gap-1" disabled={saving}>
      <legend className="mb-1 text-sm font-medium">Mức đánh giá</legend>
      {[1, 2, 3, 4, 5].map(value => <label key={value} className="cursor-pointer">
        <input className="peer sr-only" type="radio" name={name} value={value} checked={rating === value}
          onChange={() => setRating(value)} aria-label={value + ' sao'} required />
        <span aria-hidden="true" className={'inline-flex h-10 w-10 items-center justify-center rounded-md border text-2xl ' +
          'peer-focus-visible:ring-2 peer-focus-visible:ring-primary ' +
          (value <= rating ? 'border-primary bg-primary-light text-primary' : 'border-card-border text-[#765E6B]')}>
          {value <= rating ? '★' : '☆'}
        </span>
      </label>)}
    </fieldset>
    <label className="block space-y-1 text-sm font-medium">
      <span>Nhận xét <span className="font-normal text-[#765E6B]">(không bắt buộc)</span></span>
      <textarea value={comment} maxLength={1000} rows={3} disabled={saving}
        onChange={event => setComment(event.target.value)}
        className="block w-full rounded-lg border border-card-border bg-white px-3 py-2 font-normal focus-visible:ring-2 focus-visible:ring-primary" />
    </label>
    <button type="submit" className={action} disabled={!rating || saving}>
      {saving ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Gửi phản hồi'}
    </button>
  </form>;
}

function FeedbackPanel({ type, id, userId, label }) {
  const [opened, setOpened] = useState(false);
  const client = useQueryClient();
  const queryKey = ['my-feedback', userId, type, id];
  const query = useQuery({
    queryKey, queryFn: () => getMyFeedback(type, id), enabled: opened, retry: false,
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationFn: payload => saveMyFeedback(type, id, payload),
    onSuccess: entry => {
      client.setQueryData(queryKey, entry);
      void client.invalidateQueries({ queryKey: ['learner-feedback-list', userId] });
      if (type === 'mentor') {
        void client.invalidateQueries({ queryKey: ['mentor-rating'] });
        void client.invalidateQueries({ queryKey: ['mentor-rating-summary'] });
      }
    },
  });

  return <details className="my-2 rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
    onToggle={event => { if (event.currentTarget.open) setOpened(true); }}>
    <summary className="cursor-pointer font-semibold text-primary">{label}</summary>
    {opened && <div className="mt-3 space-y-2">
      {query.isPending && <p role="status">Đang tải phản hồi…</p>}
      {query.isError && <p role="alert" className="text-rose-700">Chưa tải được phản hồi.{' '}
        <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>Thử lại</button>
      </p>}
      {query.isSuccess && <FeedbackForm key={query.data?.id ?? 'new'} initial={query.data}
        save={mutation.mutate} saving={mutation.isPending} />}
      {mutation.isError && <p role="alert" className="text-rose-700">{mutation.error.message}</p>}
      {mutation.isSuccess && <p role="status" className="text-emerald-800">Đã lưu phản hồi của bạn.</p>}
    </div>}
  </details>;
}

export default function LearnerFeedbackPanel({ type, id = 0, label = 'Phản hồi' }) {
  const { isLearner, user } = useAuth();
  const targetId = Number(id);
  const sectionFeedback = ['general', 'speaking', 'writing'].includes(type);
  if (!isLearner || !user?.userId || !Number.isInteger(targetId) || (!sectionFeedback && targetId <= 0)) return null;

  return <FeedbackPanel key={[user.userId, type, targetId].join(':')} userId={user.userId}
    type={type} id={targetId} label={label} />;
}
