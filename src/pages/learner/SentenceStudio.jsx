import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { submitPracticeWriting } from '../../api/practiceSubmissionApi.js';

const LEVELS = [
  { id: 1, name: 'N5' },
  { id: 2, name: 'N4' },
  { id: 3, name: 'N3' },
  { id: 4, name: 'N2' },
];

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function SentenceStudio() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const [levelId, setLevelId] = useState(3);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');

  const submit = useMutation({
    mutationFn: () => submitPracticeWriting({
      textContent: text.trim(),
      certificateLevelId: levelId,
      topic: topic.trim(),
    }),
    onSuccess: (data) => {
      navigate(`/ai-scoring/?submissionId=${data.submissionId}`);
    },
  });

  return (
    <LearnerShell pathname="/sentence-studio" breadcrumb={tr('Chấm bài viết')}>
      <main className="mx-auto grid max-w-[1040px] gap-4 px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:grid-cols-[minmax(0,1.2fr)_280px] lg:px-7">
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5 sm:px-6">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('LUYỆN VIẾT')}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Viết rồi nhận nhận xét')}</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#8C7782]">
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
                    ? 'border-[#AD3155] bg-[#FCEEF3] text-[#AD3155]'
                    : 'border-[#E7DAE1] text-[#6E5360]'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-[12px] text-[#8C7782]">
            {tr('Đề bài')}
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={tr('Ví dụ: kể một ngày nghỉ')}
              className="mt-1 h-10 w-full rounded-xl border border-[#EADFE5] px-3 text-[13px] text-[#49353F] outline-none focus:border-[#AD3155]"
            />
          </label>

          <label className="mt-4 block text-[12px] text-[#8C7782]">
            {tr('Bài viết tiếng Nhật')}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              className="mt-1 w-full rounded-xl border border-[#EADFE5] px-3 py-3 text-[15px] leading-7 text-[#49353F] outline-none focus:border-[#AD3155]"
              style={{ fontFamily: '"Yu Gothic", "Yu Gothic UI", "Segoe UI", sans-serif' }}
            />
          </label>

          {submit.isError && <p role="alert" className="mt-3 text-[13px] text-[#A33357]">{submit.error.message}</p>}

          <button
            type="button"
            disabled={submit.isPending || text.trim().length < 8}
            onClick={() => submit.mutate()}
            className={`mt-4 h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
          >
            {submit.isPending ? tr('Đang chấm…') : tr('Nộp bài')}
          </button>
        </section>

        <aside className="rounded-2xl border border-[#EADFE5] bg-[#FFF8FA] px-5 py-5">
          <h2 className="text-[15px] font-semibold">{tr('Sau khi nộp')}</h2>
          <p className="mt-2 text-[13px] leading-6 text-[#8C7782]">
            {tr('Điểm, điểm mạnh, chỗ cần sửa và câu gợi ý hiện ở trang kết quả.')}
          </p>
          <Link to="/ai-scoring/" className={`mt-4 inline-flex h-9 items-center text-[13px] font-medium text-[#AD3155] ${focus}`}>
            {tr('Xem các bài đã nộp')}
          </Link>
        </aside>
      </main>
    </LearnerShell>
  );
}
