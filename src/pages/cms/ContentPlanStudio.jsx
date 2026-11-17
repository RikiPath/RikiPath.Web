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

const MODES = [
  {
    id: 'plan',
    label: 'Kế hoạch bài',
    description: 'Mô tả một bài, hệ thống chia thành từng việc rồi soạn bản xem trước.',
    icon: 'account_tree',
  },
  {
    id: 'kanji',
    label: 'Kanji nhanh',
    description: 'Gợi ý một nhóm chữ theo cấp, xem âm đọc rồi gửi duyệt.',
    icon: 'draw',
  },
];

const EXAMPLES = {
  plan: [
    'Bài N4 về thời tiết: 8 từ, 4 kanji và 2 mẫu ngữ pháp.',
    'Bài luyện nghe N3 trong quán cà phê, 5 câu hội thoại ngắn.',
    'Đề thi thử N5 gồm 3 phần, mỗi phần 4 câu.',
  ],
  kanji: [
    '8 kanji N4 về thời tiết, kèm nghĩa và âm đọc.',
    'Kanji N3 về phương hướng và giao thông.',
    'Kanji N5 về các thành viên trong gia đình.',
  ],
};

const PLAN_STEPS = ['Mô tả', 'Kế hoạch', 'Xem trước', 'Gửi duyệt'];
const KANJI_STEPS = ['Mô tả', 'Gợi ý', 'Gửi duyệt'];

function resultTitle(row) {
  return row.lesson?.title
    || row.practiceExercise?.title
    || row.mockTest?.title
    || row.kanji?.[0]?.character
    || row.vocabulary?.[0]?.word
    || row.grammar?.[0]?.title
    || row.taskId;
}

function resultKind(row) {
  if (row.lesson) return 'Bài học';
  if (row.practiceExercise) return 'Bài luyện';
  if (row.mockTest) return 'Đề thi';
  if (row.kanji?.length) return `${row.kanji.length} kanji`;
  if (row.vocabulary?.length) return `${row.vocabulary.length} từ`;
  if (row.grammar?.length) return `${row.grammar.length} ngữ pháp`;
  return 'Nội dung';
}

function Icon({ name, className = '' }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
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
  const steps = mode === 'plan' ? PLAN_STEPS : KANJI_STEPS;
  const sent = notice.startsWith('Đã gửi');
  const currentStep = mode === 'kanji'
    ? (kanjiItems.length ? (sent ? 3 : 2) : 1)
    : (results.length ? (sent ? 4 : 3) : (tasks.length ? 2 : 1));
  const scanIssues = scanMutation.data?.results?.filter((item) => item.issues?.length) || [];

  return (
    <CmsShell pathname="/content-plan" breadcrumb="Soạn với AI">
      <main className="mx-auto max-w-[1080px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-[#E7C9D6] bg-[linear-gradient(135deg,#FFF7FA_0%,#FCEEF3_48%,#FFFDFC_100%)] px-6 py-6 sm:px-8">
          <p className="text-[12px] font-medium tracking-[0.14em] text-[#AD3155]">SOẠN VỚI AI</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Biến một ý tưởng thành bản xem trước.</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#8D7481]">
            Viết bài bạn muốn có. Hệ thống lập kế hoạch, soạn nội dung để xem, rồi mới đưa vào hàng chờ duyệt. Chưa ghi vào bài đang dạy.
          </p>
          <ol className="mt-5 flex flex-wrap gap-2">
            {steps.map((label, index) => {
              const number = index + 1;
              const done = number < currentStep;
              const active = number === currentStep;
              return (
                <li
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${active ? 'bg-[#AD3155] text-white' : done ? 'bg-white text-[#AD3155]' : 'bg-white/70 text-[#8D7481]'}`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${active ? 'bg-white/20' : done ? 'bg-[#FCEEF3]' : 'bg-[#F6F1F3]'}`}>
                    {done ? <Icon name="check" className="text-[14px]" /> : number}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MODES.map((item) => {
            const selected = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(item.id)}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-left ${focus} ${selected ? 'border-[#E7C9D6] bg-white shadow-[0_10px_30px_rgba(173,49,85,0.08)]' : 'border-[#EADFE5] bg-[#FCFAFB]'}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#FCEEF3] text-[#AD3155]' : 'bg-white text-[#A67C8E]'}`}>
                  <Icon name={item.icon} className="text-[22px]" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-[#543E49]">{item.label}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-[#927B88]">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="mt-4 rounded-3xl border border-[#EADFE5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[#543E49]">Bạn muốn soạn gì</h2>
            <span className="text-[12px] text-[#AA929F]">{prompt.trim().length} ký tự</span>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder={mode === 'kanji' ? 'Ví dụ: 8 kanji N4 về thời tiết, kèm nghĩa và âm đọc.' : 'Ví dụ: một bài N4 về thời tiết, có từ, kanji và mẫu ngữ pháp.'}
            className={`mt-3 w-full resize-y rounded-2xl border border-[#EADFE5] bg-[#FCFAFB] px-4 py-3 text-[14px] leading-6 outline-none focus:border-[#AD3155] focus:bg-white ${focus}`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES[mode].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className={`rounded-full bg-[#FAF6F7] px-3 py-1.5 text-left text-[12px] text-[#6F5660] hover:bg-[#FCEEF3] hover:text-[#AD3155] ${focus}`}
              >
                {example}
              </button>
            ))}
          </div>

          {mode === 'kanji' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[#8C7782]">Cấp độ</span>
              {LEVELS.map((level) => (
                <button key={level.id} type="button" aria-pressed={levelId === level.id} onClick={() => setLevelId(level.id)} className={`h-8 rounded-full px-3 text-[12px] ${focus} ${levelId === level.id ? 'bg-[#AD3155] text-white' : 'bg-[#FCFAFB] text-[#826773]'}`}>
                  {level.name}
                </button>
              ))}
            </div>
          )}

          {(error || notice) && (
            <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-2xl px-4 py-3 text-[13px] ${error ? 'bg-[#FCF4F8] text-[#A33357]' : 'bg-[#E7F6EC] text-[#1E5C36]'}`}>
              {error?.message || notice}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3E8EC] pt-4">
            <p className="max-w-md text-[12px] leading-5 text-[#AA929F]">
              {mode === 'plan' ? 'Bước này chỉ lập danh sách việc. Nội dung được tạo ở bước sau, sau khi bạn xem lại từng việc.' : 'Gợi ý chưa vào kho. Bạn bỏ chữ không muốn rồi mới gửi duyệt.'}
            </p>
            {mode === 'plan' ? (
              <button type="button" disabled={busy || !prompt.trim()} onClick={() => { setNotice(''); planMutation.mutate(prompt.trim()); }} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}>
                <Icon name="auto_awesome" className="text-[18px]" />
                {planMutation.isPending ? 'Đang lập kế hoạch…' : 'Lập kế hoạch'}
              </button>
            ) : (
              <button type="button" disabled={busy || !prompt.trim()} onClick={() => { setNotice(''); kanjiMutation.mutate(); }} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}>
                <Icon name="draw" className="text-[18px]" />
                {kanjiMutation.isPending ? 'Đang gợi ý…' : 'Gợi ý kanji'}
              </button>
            )}
          </div>
        </section>

        {mode === 'plan' && plan?.clarifyingQuestion && (
          <section className="mt-4 rounded-3xl border border-[#E7C9D6] bg-[#FFF8FA] p-5">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[#AD3155]">CẦN THÊM MỘT CHI TIẾT</p>
            <p className="mt-2 text-[15px] leading-6 text-[#49353F]">{plan.clarifyingQuestion}</p>
            <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Trả lời ngắn" className={`mt-3 h-11 w-full rounded-xl border border-[#EADFE5] bg-white px-3 text-[13px] outline-none focus:border-[#AD3155] ${focus}`} />
            <button type="button" disabled={!reply.trim() || busy} onClick={() => planMutation.mutate(`${prompt.trim()}\n${reply.trim()}`)} className={`mt-3 h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] text-white disabled:opacity-50 ${focus}`}>
              Gửi thêm
            </button>
          </section>
        )}

        {mode === 'plan' && tasks.length > 0 && (
          <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-[15px] font-semibold text-[#705261]">Kế hoạch, {tasks.length} việc</h2>
                <p className="mt-1 text-[12px] text-[#AA929F]">Sửa câu mô tả hoặc bỏ việc trước khi tạo nội dung.</p>
              </div>
              <button type="button" disabled={busy} onClick={() => { setNotice(''); runMutation.mutate(); }} className={`inline-flex h-10 items-center gap-2 rounded-xl border border-[#E7C9D6] bg-white px-4 text-[13px] font-medium text-[#AD3155] disabled:opacity-50 ${focus}`}>
                <Icon name="play_arrow" className="text-[18px]" />
                {runMutation.isPending ? 'Đang soạn…' : 'Tạo nội dung'}
              </button>
            </div>
            <ul className="space-y-3">
              {tasks.map((task, index) => (
                <li key={task.taskId || index} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCEEF3] text-[12px] font-semibold text-[#AD3155]">{index + 1}</span>
                      <span className="rounded-full bg-[#FAF6F7] px-2.5 py-1 text-[12px] font-medium text-[#8D7481]">{task.type}</span>
                    </div>
                    <button type="button" onClick={() => setTasks((prev) => prev.filter((_, item) => item !== index))} className={`rounded-lg px-2 py-1 text-[12px] text-[#AA8F9B] hover:bg-[#FFF6FA] hover:text-[#AD3155] ${focus}`}>Bỏ</button>
                  </div>
                  <textarea
                    value={task.prompt}
                    onChange={(event) => setTasks((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))}
                    rows={2}
                    className={`mt-3 w-full rounded-xl border border-[#F0E4E8] bg-[#FCFAFB] px-3 py-2 text-[13px] leading-6 outline-none focus:border-[#AD3155] focus:bg-white ${focus}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {mode === 'plan' && results.length > 0 && (
          <section className="mt-5 rounded-3xl border border-[#EADFE5] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[#705261]">Bản xem trước</h2>
              {results.some((row) => row.status === 'Succeeded') && (
                <button type="button" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()} className={`inline-flex h-10 items-center gap-2 rounded-xl bg-[#2F6B45] px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
                  <Icon name="send" className="text-[16px]" />
                  {confirmMutation.isPending ? 'Đang gửi…' : 'Gửi duyệt'}
                </button>
              )}
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {results.map((row) => {
                const ok = row.status === 'Succeeded';
                return (
                  <li key={row.taskId} className="rounded-2xl bg-[#FCFAFB] px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-[#AA929F]">{resultKind(row)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ok ? 'bg-[#E7F6EC] text-[#1E5C36]' : 'bg-[#FDECEE] text-[#A33357]'}`}>
                        {ok ? 'Sẵn sàng' : row.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[15px] font-semibold text-[#49353F]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{resultTitle(row)}</p>
                    {row.error && <p className="mt-1 text-[12px] leading-5 text-[#A33357]">{row.error}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {mode === 'kanji' && kanjiItems.length > 0 && (
          <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-[15px] font-semibold text-[#705261]">{kanjiItems.length} chữ được gợi ý</h2>
                <p className="mt-1 text-[12px] text-[#AA929F]">Bỏ chữ đã có trong kho hoặc chữ không đúng chủ đề.</p>
              </div>
              <button type="button" disabled={kanjiConfirm.isPending} onClick={() => kanjiConfirm.mutate()} className={`inline-flex h-10 items-center gap-2 rounded-xl bg-[#2F6B45] px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
                <Icon name="send" className="text-[16px]" />
                {kanjiConfirm.isPending ? 'Đang gửi…' : 'Gửi kanji chờ duyệt'}
              </button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {kanjiItems.map((item, index) => (
                <li key={`${item.character}-${index}`} className="rounded-2xl border border-[#EADFE5] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FCEEF3] text-[30px] font-semibold text-[#AD3155]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                      {item.character}
                    </span>
                    <button type="button" onClick={() => setKanjiItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className={`rounded-lg px-2 py-1 text-[12px] text-[#AA8F9B] hover:bg-[#FFF6FA] hover:text-[#AD3155] ${focus}`}>Bỏ</button>
                  </div>
                  <p className="mt-3 text-[15px] font-semibold text-[#49353F]">{item.meaning || 'Chưa có nghĩa'}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#8D7481]">
                    {[item.onYomi && `On: ${item.onYomi}`, item.kunYomi && `Kun: ${item.kunYomi}`, item.sinoVietnamese && `Hán Việt: ${item.sinoVietnamese}`].filter(Boolean).join(' · ') || 'Chưa có âm đọc'}
                  </p>
                  {item.isDuplicate && <p className="mt-2 inline-flex rounded-full bg-[#FFF6E8] px-2 py-0.5 text-[11px] font-medium text-[#8A5A10]">Đã có trong kho</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#E7C9D6] bg-white px-4 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#543E49]">Kiểm tra bản nháp đang chờ</p>
            <p className="mt-1 text-[12px] leading-5 text-[#AA929F]">Quét các dòng đã gửi trong phiên này và chỉ ra chỗ cần xem lại.</p>
          </div>
          <button type="button" disabled={scanMutation.isPending} onClick={() => scanMutation.mutate()} className={`h-10 rounded-xl border border-[#E7DAE1] px-4 text-[13px] text-[#6F5660] hover:bg-[#FFF7F9] disabled:opacity-50 ${focus}`}>
            {scanMutation.isPending ? 'Đang kiểm tra…' : 'Kiểm tra'}
          </button>
          {scanIssues.length > 0 && (
            <ul className="w-full space-y-1">
              {scanIssues.map((item) => (
                <li key={item.approvalRequestId} className="text-[12px] leading-5 text-[#A33357]">{item.rowKey}: {item.issues.join(' ')}</li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </CmsShell>
  );
}
