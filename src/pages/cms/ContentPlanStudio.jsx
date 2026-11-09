import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { CmsShell } from '../../components/shells';
import {
  confirmContentPlan,
  confirmKanjiSuggestions,
  executeContentPlan,
  planContent,
  scanContentAccuracy,
  suggestKanji,
  toConfirmPlanBody,
} from '../../api/contentAuthoringApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

const LEVELS = [
  { id: 1, name: 'N5' },
  { id: 2, name: 'N4' },
  { id: 3, name: 'N3' },
  { id: 4, name: 'N2' },
];

function resultTitle(row) {
  return row.lesson?.title
    || row.practiceExercise?.title
    || row.mockTest?.title
    || row.kanji?.[0]?.character
    || row.vocabulary?.[0]?.word
    || row.grammar?.[0]?.title
    || row.taskId;
}

export default function ContentPlanStudio() {
  const [mode, setMode] = useState('plan');
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [results, setResults] = useState([]);
  const [kanjiItems, setKanjiItems] = useState([]);
  const [levelId, setLevelId] = useState(3);
  const [notice, setNotice] = useState('');
  const [batchId, setBatchId] = useState('');

  const planMutation = useMutation({
    mutationFn: planContent,
    onSuccess: (data) => {
      setPlan(data);
      setTasks(data.tasks || []);
      setResults([]);
      setNotice(data.clarifyingQuestion ? '' : 'Đã có kế hoạch. Có thể sửa từng việc trước khi chạy.');
    },
  });

  const runMutation = useMutation({
    mutationFn: () => executeContentPlan(tasks),
    onSuccess: (data) => {
      setResults(data.results || []);
      setNotice('Nội dung đã được tạo. Xem lại rồi gửi duyệt.');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmContentPlan(toConfirmPlanBody(results)),
    onSuccess: (data) => {
      setBatchId(data.batchId || '');
      setNotice(`Đã gửi ${data.submittedCount} dòng vào hàng chờ duyệt.`);
    },
  });

  const kanjiMutation = useMutation({
    mutationFn: () => suggestKanji({ prompt, certificateLevelId: levelId }),
    onSuccess: (data) => setKanjiItems(data.items || []),
  });

  const kanjiConfirm = useMutation({
    mutationFn: () => confirmKanjiSuggestions({
      certificateLevelId: levelId,
      items: kanjiItems.filter((item) => item.character && item.meaning).map((item) => ({
        character: item.character,
        meaning: item.meaning,
        sinoVietnamese: item.sinoVietnamese,
        onYomi: item.onYomi,
        kunYomi: item.kunYomi,
        strokeCount: Number(item.strokeCount) || 0,
        isDuplicate: Boolean(item.isDuplicate),
        existingKanjiId: item.existingKanjiId ?? undefined,
      })),
    }),
    onSuccess: (data) => {
      setBatchId(data.batchId || '');
      setNotice(`Đã gửi ${data.submittedCount} kanji vào hàng chờ duyệt.`);
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => scanContentAccuracy(batchId || undefined),
    onSuccess: (data) => setNotice(data.issueCount ? `Có ${data.issueCount} chỗ cần xem lại.` : 'Bản nháp không có lỗi được chỉ ra.'),
  });

  const error = planMutation.error || runMutation.error || confirmMutation.error || kanjiMutation.error || kanjiConfirm.error || scanMutation.error;
  const busy = planMutation.isPending || runMutation.isPending || confirmMutation.isPending || kanjiMutation.isPending;

  return (
    <CmsShell pathname="/content-plan" breadcrumb="Soạn với AI">
      <main className="mx-auto max-w-4xl px-6 py-7 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">NỘI DUNG</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Soạn học liệu với AI</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#8C7782]">
          Mô tả bài cần có. Hệ thống lập kế hoạch, sinh nội dung để xem trước, rồi đưa vào hàng chờ duyệt. Chưa ghi vào bài học đang dạy.
        </p>

        <div className="mt-4 flex gap-2">
          {[['plan', 'Kế hoạch'], ['kanji', 'Kanji nhanh']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
              className={`h-9 rounded-lg border px-3 text-[13px] ${focus} ${mode === id ? 'border-[#AD3155] bg-[#FCEEF3] text-[#AD3155]' : 'border-[#E7DAE1] text-[#6E5360]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[12px] text-[#8C7782]">
          Yêu cầu
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            placeholder="Ví dụ: 8 kanji N4 về thời tiết, kèm nghĩa và âm đọc."
            className="mt-1 w-full rounded-xl border border-[#EADFE5] px-3 py-3 text-[14px] outline-none focus:border-[#AD3155]"
          />
        </label>

        {mode === 'kanji' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <button key={level.id} type="button" aria-pressed={levelId === level.id} onClick={() => setLevelId(level.id)} className={`h-8 rounded-lg border px-3 text-[12px] ${focus} ${levelId === level.id ? 'border-[#AD3155] bg-[#FCEEF3] text-[#AD3155]' : 'border-[#E7DAE1]'}`}>
                {level.name}
              </button>
            ))}
          </div>
        )}

        {(error || notice) && (
          <p role={error ? 'alert' : 'status'} className={`mt-3 text-[13px] ${error ? 'text-[#A33357]' : 'text-[#2F6B45]'}`}>
            {error?.message || notice}
          </p>
        )}

        {mode === 'plan' && (
          <>
            <button type="button" disabled={busy || !prompt.trim()} onClick={() => { setNotice(''); planMutation.mutate(prompt.trim()); }} className={`mt-4 h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}>
              {planMutation.isPending ? 'Đang lập kế hoạch…' : 'Lập kế hoạch'}
            </button>
            {plan?.clarifyingQuestion && (
              <div className="mt-4 rounded-2xl border border-[#EADFE5] bg-[#FFF8FA] px-4 py-4">
                <p className="text-[14px]">{plan.clarifyingQuestion}</p>
                <input value={reply} onChange={(event) => setReply(event.target.value)} className="mt-3 h-10 w-full rounded-xl border border-[#EADFE5] px-3 text-[13px] outline-none focus:border-[#AD3155]" />
                <button type="button" disabled={!reply.trim() || busy} onClick={() => planMutation.mutate(`${prompt.trim()}\n${reply.trim()}`)} className={`mt-3 h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] text-white disabled:opacity-50 ${focus}`}>
                  Gửi thêm
                </button>
              </div>
            )}
            {tasks.length > 0 && (
              <ul className="mt-4 space-y-3">
                {tasks.map((task, index) => (
                  <li key={task.taskId || index} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[12px] font-medium text-[#AD3155]">{task.type}</p>
                      <button type="button" onClick={() => setTasks((prev) => prev.filter((_, item) => item !== index))} className={`text-[12px] text-[#8C7782] ${focus}`}>Bỏ</button>
                    </div>
                    <textarea
                      value={task.prompt}
                      onChange={(event) => setTasks((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))}
                      rows={2}
                      className="mt-2 w-full rounded-xl border border-[#F0E4E8] px-3 py-2 text-[13px] outline-none focus:border-[#AD3155]"
                    />
                  </li>
                ))}
              </ul>
            )}
            {tasks.length > 0 && (
              <button type="button" disabled={busy} onClick={() => { setNotice(''); runMutation.mutate(); }} className={`mt-4 h-10 rounded-xl border border-[#E7DAE1] px-4 text-[13px] disabled:opacity-50 ${focus}`}>
                {runMutation.isPending ? 'Đang soạn…' : 'Tạo nội dung'}
              </button>
            )}
            {results.length > 0 && (
              <ul className="mt-4 space-y-2">
                {results.map((row) => (
                  <li key={row.taskId} className="rounded-xl bg-[#FCF7F9] px-4 py-3 text-[13px]">
                    <p className="font-medium">{resultTitle(row)}</p>
                    <p className={row.status === 'Succeeded' ? 'text-[#2F6B45]' : 'text-[#A33357]'}>{row.status}{row.error ? ` · ${row.error}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
            {results.some((row) => row.status === 'Succeeded') && (
              <button type="button" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()} className={`mt-4 h-10 rounded-xl bg-[#2F6B45] px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
                {confirmMutation.isPending ? 'Đang gửi…' : 'Gửi duyệt'}
              </button>
            )}
          </>
        )}

        {mode === 'kanji' && (
          <>
            <button type="button" disabled={busy || !prompt.trim()} onClick={() => { setNotice(''); kanjiMutation.mutate(); }} className={`mt-4 h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
              {kanjiMutation.isPending ? 'Đang gợi ý…' : 'Gợi ý kanji'}
            </button>
            {kanjiItems.length > 0 && (
              <ul className="mt-4 space-y-2">
                {kanjiItems.map((item, index) => (
                  <li key={`${item.character}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-[#EADFE5] bg-white px-4 py-3">
                    <div>
                      <p className="text-[22px] font-semibold" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.character}</p>
                      <p className="text-[13px] text-[#6F5C66]">{item.meaning}{item.onYomi ? ` · ${item.onYomi}` : ''}</p>
                      {item.isDuplicate && <p className="text-[12px] text-[#A47186]">Đã có trong kho</p>}
                    </div>
                    <button type="button" onClick={() => setKanjiItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className={`text-[12px] text-[#8C7782] ${focus}`}>Bỏ</button>
                  </li>
                ))}
              </ul>
            )}
            {kanjiItems.length > 0 && (
              <button type="button" disabled={kanjiConfirm.isPending} onClick={() => kanjiConfirm.mutate()} className={`mt-4 h-10 rounded-xl bg-[#2F6B45] px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
                Gửi kanji chờ duyệt
              </button>
            )}
          </>
        )}

        <button type="button" disabled={scanMutation.isPending} onClick={() => scanMutation.mutate()} className={`mt-6 h-9 rounded-lg px-3 text-[12px] text-[#8C7782] ${focus}`}>
          {scanMutation.isPending ? 'Đang kiểm tra bản nháp…' : 'Kiểm tra bản nháp đang chờ'}
        </button>
        {scanMutation.data?.results?.filter((item) => item.issues?.length).map((item) => (
          <p key={item.approvalRequestId} className="mt-2 text-[12px] text-[#A33357]">{item.rowKey}: {item.issues.join(' ')}</p>
        ))}
      </main>
    </CmsShell>
  );
}
