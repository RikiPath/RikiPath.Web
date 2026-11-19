import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { submitPracticeWriting } from '@/features/practice/api/practiceSubmissionApi.js';
import { notify } from '@/components/ui/feedbackStore.js';

const LEVELS = [
  { id: 1, name: 'N5' },
  { id: 2, name: 'N4' },
  { id: 3, name: 'N3' },
  { id: 4, name: 'N2' },
];

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

export default function SentenceStudio() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const [levelId, setLevelId] = useState(3);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');

  const submit = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang gửi bài luyện viết…'), '', { key: 'sentence-submit', maxWaitMs: 30000 });
      return submitPracticeWriting({
        textContent: text.trim(),
        certificateLevelId: levelId,
        topic: topic.trim(),
      });
    },
    onSuccess: (data) => {
      notify.success(tr('Đã gửi bài luyện viết'), tr('Hệ thống đang mở trang kết quả chấm điểm.'), {
        key: 'sentence-submit',
        replace: true,
      });
      navigate(`/ai-scoring/?submissionId=${data.submissionId}`);
    },
    onError: (err) => notify.apiError(err, tr('Không gửi được bài viết'), { key: 'sentence-submit', replace: true }),
  });

  return (
    <LearnerShell pathname="/sentence-studio" breadcrumb={tr('Chấm bài viết')}>
      <main className="rp-container rp-cq rp-cq-two-col py-[var(--rp-space-page-y)] text-rp-text">
        <section className="rounded-2xl border border-rp-line bg-white px-5 py-5 sm:px-6">
          <p className="text-[11px] font-medium tracking-[0.14em] text-rp-brand-strong">{tr('LUYỆN VIẾT')}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Viết rồi nhận nhận xét')}</h1>
          <p className="mt-2 text-[13px] leading-6 text-rp-text-muted">
            {tr('Bài được lưu và chấm theo cấp độ bạn chọn. Việc chấm có thể mất vài giây.')}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                aria-pressed={levelId === level.id}
                onClick={() => setLevelId(level.id)}
                className={`h-9 rounded-lg border px-3 text-[13px] ${focus} ${
                  levelId === level.id
                    ? 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong'
                    : 'border-rp-line text-rp-text-2'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-[12px] text-rp-text-muted">
            {tr('Đề bài')}
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={tr('Ví dụ: kể một ngày nghỉ')}
              className="mt-1 h-10 w-full rounded-xl border border-rp-line px-3 text-[13px] text-rp-text outline-none focus:border-rp-brand-strong"
            />
          </label>

          <label className="mt-4 block text-[12px] text-rp-text-muted">
            {tr('Bài viết tiếng Nhật')}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              className="mt-1 w-full rounded-xl border border-rp-line px-3 py-3 text-[15px] leading-7 text-rp-text outline-none focus:border-rp-brand-strong"
              style={{ fontFamily: '"Yu Gothic", "Yu Gothic UI", "Segoe UI", sans-serif' }}
            />
          </label>

          {submit.isError && <p role="alert" className="mt-3 text-[13px] text-rp-brand-strong">{tr(submit.error.message)}</p>}

          <button
            type="button"
            disabled={submit.isPending || text.trim().length < 8}
            onClick={() => submit.mutate()}
            className={`mt-4 h-10 rounded-xl bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}
          >
            {submit.isPending ? tr('Đang chấm…') : tr('Nộp bài')}
          </button>
        </section>

        <aside className="rounded-2xl border border-rp-line bg-rp-brand-tint px-5 py-5">
          <h2 className="text-[15px] font-semibold">{tr('Sau khi nộp')}</h2>
          <p className="mt-2 text-[13px] leading-6 text-rp-text-muted">
            {tr('Điểm, điểm mạnh, chỗ cần sửa và câu gợi ý hiện ở trang kết quả.')}
          </p>
          <Link to="/ai-scoring/" className={`mt-4 inline-flex h-9 items-center text-[13px] font-medium text-rp-brand-strong ${focus}`}>
            {tr('Xem các bài đã nộp')}
          </Link>
        </aside>
      </main>
    </LearnerShell>
  );
}
