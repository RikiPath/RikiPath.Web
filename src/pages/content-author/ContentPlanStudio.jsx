import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { ContentAuthorShell } from '@/layouts';
import {
  confirmContentPlan,
  confirmKanjiSuggestions,
  executeContentPlan,
  planContent,
  scanContentAccuracy,
  suggestKanji,
  toConfirmPlanBody,
} from '@/features/content-author/api/contentAuthoringApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale, translateTemplate } from '@/locales/locale.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

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
    description: 'Mô tả một bài, hệ thống chia thành từng việc rồi tạo bản xem trước để lưu nháp.',
    icon: 'account_tree',
  },
  {
    id: 'kanji',
    label: 'Kanji nhanh',
    description: 'Gợi ý một nhóm chữ theo cấp, kiểm tra âm đọc và số nét rồi lưu bản nháp.',
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

const PLAN_STEPS = ['Mô tả', 'Kế hoạch', 'Xem trước', 'Lưu bản nháp'];
const KANJI_STEPS = ['Mô tả', 'Gợi ý', 'Lưu bản nháp'];

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
  if (row.vocabulary?.length) return translateTemplate('{0} từ', { 0: row.vocabulary.length });
  if (row.grammar?.length) return translateTemplate('{0} ngữ pháp', { 0: row.grammar.length });
  return 'Nội dung';
}

export default function ContentPlanStudio() {
  const { tr, trf } = useLocale();
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
    mutationFn: (input) => {
      notify.loading('Đang lập kế hoạch bài học với AI…', '', { key: 'author-plan-ai', maxWaitMs: 45000 });
      return planContent(input);
    },
    onSuccess: (data) => {
      setPlan(data);
      setTasks(data.tasks || []);
      setResults([]);
      setBatchId('');
      const msg = data.clarifyingQuestion ? '' : 'Đã có kế hoạch. Có thể sửa từng việc trước khi chạy.';
      setNotice(msg);
      if (data.clarifyingQuestion) {
        notify.info('AI cần làm rõ thêm thông tin trước khi lập kế hoạch.', '', { key: 'author-plan-ai', replace: true });
      } else {
        notify.success('Đã tạo xong kế hoạch bài học.', '', { key: 'author-plan-ai', replace: true });
      }
    },
    onError: (err) => notify.apiError(err, 'Không lập được kế hoạch bài học', { key: 'author-plan-ai', replace: true }),
  });

  const runMutation = useMutation({
    mutationFn: () => {
      notify.loading('Đang tạo nội dung từ kế hoạch…', '', { key: 'author-plan-run', maxWaitMs: 60000 });
      return executeContentPlan(tasks);
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setBatchId('');
      setNotice('Nội dung đã được tạo. Kiểm tra chi tiết rồi lưu bản nháp.');
      notify.success('Đã tạo xong bản xem trước nội dung.', 'Hãy kiểm tra lại trước khi lưu bản nháp.', {
        key: 'author-plan-run',
        replace: true,
      });
    },
    onError: (err) => notify.apiError(err, 'Không tạo được nội dung từ kế hoạch', { key: 'author-plan-run', replace: true }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      notify.loading('Đang lưu bản nháp nội dung…', '', { key: 'author-plan-confirm', maxWaitMs: 30000 });
      return confirmContentPlan(toConfirmPlanBody(results));
    },
    onSuccess: (data) => {
      setBatchId(data.batchId || '');
      const msg = trf('Đã lưu {0} bản nháp từ AI. Vào Soạn thảo thủ công để rà soát và gửi duyệt.', { 0: data.submittedCount });
      setNotice(msg);
      notify.success(msg, '', { key: 'author-plan-confirm', replace: true });
    },
    onError: (err) => notify.apiError(err, 'Chưa lưu được bản nháp nội dung', { key: 'author-plan-confirm', replace: true }),
  });

  const kanjiMutation = useMutation({
    mutationFn: () => {
      notify.loading('Đang gợi ý Kanji theo chủ đề…', '', { key: 'author-kanji-suggest', maxWaitMs: 35000 });
      return suggestKanji({ prompt, certificateLevelId: levelId });
    },
    onSuccess: (data) => {
      setKanjiItems((data.items || []).map((item) => ({
        ...item,
        strokeCount: Math.max(1, Number(item.strokeCount) || 1),
      })));
      setBatchId('');
      notify.success(trf('Đã gợi ý {0} chữ Kanji.', { 0: (data.items || []).length }), '', { key: 'author-kanji-suggest', replace: true });
    },
    onError: (err) => notify.apiError(err, 'Không gợi ý được Kanji', { key: 'author-kanji-suggest', replace: true }),
  });

  const kanjiConfirm = useMutation({
    mutationFn: () => {
      notify.loading('Đang lưu danh sách Kanji thành bản nháp…', '', { key: 'author-kanji-confirm', maxWaitMs: 30000 });
      return confirmKanjiSuggestions({
        certificateLevelId: levelId,
        items: kanjiItems.filter((item) => item.character && item.meaning).map((item) => ({
          character: item.character,
          meaning: item.meaning,
          sinoVietnamese: item.sinoVietnamese,
          onYomi: item.onYomi,
          kunYomi: item.kunYomi,
          strokeCount: Math.max(1, Number(item.strokeCount) || 1),
          isDuplicate: Boolean(item.isDuplicate),
          existingKanjiId: item.existingKanjiId ?? undefined,
        })),
      });
    },
    onSuccess: (data) => {
      setBatchId(data.batchId || '');
      const msg = trf('Đã lưu {0} bản nháp Kanji. Mở Soạn thảo thủ công để rà soát và gửi duyệt.', { 0: data.submittedCount });
      setNotice(msg);
      notify.success(msg, '', { key: 'author-kanji-confirm', replace: true });
    },
    onError: (err) => notify.apiError(err, 'Chưa lưu được bản nháp Kanji', { key: 'author-kanji-confirm', replace: true }),
  });

  const scanMutation = useMutation({
    mutationFn: () => {
      notify.loading('Đang kiểm tra độ chính xác nội dung…', '', { key: 'author-scan', maxWaitMs: 45000 });
      return scanContentAccuracy(batchId || undefined);
    },
    onSuccess: (data) => {
      const msg = data.issueCount ? trf('Có {0} chỗ cần xem lại.', { 0: data.issueCount }) : 'Bản nháp không có lỗi được chỉ ra.';
      setNotice(msg);
      if (data.issueCount) {
        notify.warning('Phát hiện mục cần kiểm tra lại', msg, { key: 'author-scan', replace: true });
      } else {
        notify.success(msg, '', { key: 'author-scan', replace: true });
      }
    },
    onError: (err) => notify.apiError(err, 'Không quét kiểm tra được nội dung', { key: 'author-scan', replace: true }),
  });

  const error = planMutation.error || runMutation.error || confirmMutation.error || kanjiMutation.error || kanjiConfirm.error || scanMutation.error;
  const busy = planMutation.isPending || runMutation.isPending || confirmMutation.isPending || kanjiMutation.isPending;
  const steps = mode === 'plan' ? PLAN_STEPS : KANJI_STEPS;
  const savedDraft = Boolean(batchId) || notice.startsWith('Đã lưu');
  const hasUnsavedWork = !savedDraft && (results.length > 0 || kanjiItems.length > 0 || tasks.length > 0);
  useEffect(() => {
    if (!hasUnsavedWork) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedWork]);
  const currentStep = mode === 'kanji'
    ? (kanjiItems.length ? (savedDraft ? 3 : 2) : 1)
    : (results.length ? (savedDraft ? 4 : 3) : (tasks.length ? 2 : 1));
  const scanIssues = scanMutation.data?.results?.filter((item) => item.issues?.length) || [];

  return (
    <ContentAuthorShell pathname="/content-plan" breadcrumb={tr('Soạn với AI')}>
      <main className="rp-container py-6 text-rp-text lg:py-8">
        <header className="overflow-hidden rounded-3xl border border-rp-brand-border bg-[linear-gradient(135deg,#FFF7FA_0%,#FCEEF3_48%,#FFFDFC_100%)] px-6 py-6 sm:px-8">
          <p className="text-[12px] font-medium tracking-[0.14em] text-rp-brand-strong">{tr('SOẠN VỚI AI')}</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">{tr('Biến một ý tưởng thành bản nháp học liệu.')}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-rp-text-muted">
            {tr('Viết bài bạn muốn có. Hệ thống lập kế hoạch, tạo bản xem trước và lưu thành bản nháp; bạn có thể rà soát trong Soạn thảo thủ công rồi gửi Admin duyệt.')}
          </p>
          <ol className="mt-5 flex flex-wrap gap-2">
            {steps.map((label, index) => {
              const number = index + 1;
              const done = number < currentStep;
              const active = number === currentStep;
              return (
                <li
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${active ? 'bg-rp-brand-strong text-white' : done ? 'bg-white text-rp-brand-strong' : 'bg-white/70 text-rp-text-muted'}`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${active ? 'bg-white/20' : done ? 'bg-rp-brand-tint' : 'bg-rp-brand-soft'}`}>
                    {done ? <Icon name="check" className="text-[14px]" /> : number}
                  </span>
                  {tr(label)}
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
                className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-left ${focus} ${selected ? 'border-rp-brand-border bg-white shadow-[0_10px_30px_rgba(173,49,85,0.08)]' : 'border-rp-line bg-rp-bg-2'}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-white text-rp-brand-strong'}`}>
                  <Icon name={item.icon} className="text-[22px]" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-rp-text">{tr(item.label)}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-rp-text-muted">{tr(item.description)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="mt-4 rounded-3xl border border-rp-line bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-rp-text">{tr('Bạn muốn soạn gì')}</h2>
            <span className="text-[12px] text-rp-text-muted">{trf('{0} ký tự', { 0: prompt.trim().length })}</span>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder={mode === 'kanji' ? tr('Ví dụ: 8 kanji N4 về thời tiết, kèm nghĩa và âm đọc.') : tr('Ví dụ: một bài N4 về thời tiết, có từ, kanji và mẫu ngữ pháp.')}
            className={`mt-3 w-full resize-y rounded-2xl border border-rp-line bg-rp-bg-2 px-4 py-3 text-[14px] leading-6 outline-none focus:border-rp-brand-strong focus:bg-white ${focus}`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES[mode].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className={`rounded-full bg-rp-brand-tint px-3 py-1.5 text-left text-[12px] text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong ${focus}`}
              >
                {example}
              </button>
            ))}
          </div>

          {mode === 'kanji' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-rp-text-muted">{tr('Cấp độ')}</span>
              {LEVELS.map((level) => (
                <button key={level.id} type="button" aria-pressed={levelId === level.id} onClick={() => setLevelId(level.id)} className={`h-8 rounded-full px-3 text-[12px] ${focus} ${levelId === level.id ? 'bg-rp-brand-strong text-white' : 'bg-rp-bg-2 text-rp-text-muted'}`}>
                  {level.name}
                </button>
              ))}
            </div>
          )}

          {(error || notice) && (
            <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-2xl px-4 py-3 text-[13px] ${error ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-rp-success-bg text-rp-success'}`}>
              {error?.message || notice}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
            <p className="max-w-md text-[12px] leading-5 text-rp-text-muted">
              {mode === 'plan' ? tr('Bước này chỉ lập danh sách việc. Nội dung được tạo ở bước sau, sau khi bạn xem lại từng việc.') : tr('Gợi ý chưa vào kho. Bạn chỉnh sửa hoặc bỏ chữ không muốn rồi mới lưu bản nháp.')}
            </p>
            {mode === 'plan' ? (
              <button type="button" disabled={busy || !prompt.trim()} onClick={() => { setNotice(''); planMutation.mutate(prompt.trim()); }} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}>
                <Icon name="auto_awesome" className="text-[18px]" />
                {planMutation.isPending ? tr('Đang lập kế hoạch…') : tr('Lập kế hoạch')}
              </button>
            ) : (
              <button type="button" disabled={busy || !prompt.trim()} onClick={() => { setNotice(''); kanjiMutation.mutate(); }} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}>
                <Icon name="draw" className="text-[18px]" />
                {kanjiMutation.isPending ? tr('Đang gợi ý…') : tr('Gợi ý kanji')}
              </button>
            )}
          </div>
        </section>

        {mode === 'plan' && plan?.clarifyingQuestion && (
          <section className="mt-4 rounded-3xl border border-rp-brand-border bg-rp-brand-tint p-5">
            <p className="text-[12px] font-medium tracking-[0.08em] text-rp-brand-strong">{tr('CẦN THÊM MỘT CHI TIẾT')}</p>
            <p className="mt-2 text-[15px] leading-6 text-rp-text">{plan.clarifyingQuestion}</p>
            <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder={tr('Trả lời ngắn')} className={`mt-3 h-11 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px] outline-none focus:border-rp-brand-strong ${focus}`} />
            <button type="button" disabled={!reply.trim() || busy} onClick={() => planMutation.mutate(`${prompt.trim()}\n${reply.trim()}`)} className={`mt-3 h-10 rounded-xl bg-rp-brand-strong px-4 text-[13px] text-white disabled:opacity-50 ${focus}`}>
              {tr('Gửi thêm')}
            </button>
          </section>
        )}

        {mode === 'plan' && tasks.length > 0 && (
          <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-[15px] font-semibold text-rp-text-2">{trf('Kế hoạch, {0} việc', { 0: tasks.length })}</h2>
                <p className="mt-1 text-[12px] text-rp-text-muted">{tr('Sửa câu mô tả hoặc bỏ việc trước khi tạo nội dung.')}</p>
              </div>
              <button type="button" disabled={busy} onClick={() => { setNotice(''); runMutation.mutate(); }} className={`inline-flex h-10 items-center gap-2 rounded-xl border border-rp-brand-border bg-white px-4 text-[13px] font-medium text-rp-brand-strong disabled:opacity-50 ${focus}`}>
                <Icon name="play_arrow" className="text-[18px]" />
                {runMutation.isPending ? tr('Đang soạn…') : tr('Tạo nội dung')}
              </button>
            </div>
            <ul className="space-y-3">
              {tasks.map((task, index) => (
                <li key={task.taskId || index} className="rounded-2xl border border-rp-line bg-white px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rp-brand-tint text-[12px] font-semibold text-rp-brand-strong">{index + 1}</span>
                      <span className="rounded-full bg-rp-brand-tint px-2.5 py-1 text-[12px] font-medium text-rp-text-muted">{task.type}</span>
                    </div>
                    <button type="button" onClick={() => setTasks((prev) => prev.filter((_, item) => item !== index))} className={`rounded-lg px-2 py-1 text-[12px] text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong ${focus}`}>{tr('Bỏ')}</button>
                  </div>
                  <textarea
                    value={task.prompt}
                    onChange={(event) => setTasks((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))}
                    rows={2}
                    className={`mt-3 w-full rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-[13px] leading-6 outline-none focus:border-rp-brand-strong focus:bg-white ${focus}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {mode === 'plan' && results.length > 0 && (
          <section className="mt-5 rounded-3xl border border-rp-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-rp-text-2">{tr('Bản xem trước')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {batchId && (
                  <Link
                    to="/content-manual/"
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border border-rp-brand-border bg-white px-4 text-[13px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint ${focus}`}
                  >
                    {tr('Mở Soạn thảo thủ công')}
                  </Link>
                )}
                {results.some((row) => row.status === 'Succeeded') && (
                  <button type="button" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()} className={`inline-flex h-10 items-center gap-2 rounded-xl bg-rp-success px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
                    <Icon name="save" className="text-[16px]" />
                    {confirmMutation.isPending ? tr('Đang lưu…') : tr('Lưu bản nháp')}
                  </button>
                )}
              </div>
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {results.map((row) => {
                const ok = row.status === 'Succeeded';
                const detailItems = [
                  ...(row.vocabulary || []).map((v) => `${v.word || ''} (${v.reading || ''}): ${v.meaning || ''}`),
                  ...(row.kanji || []).map((k) => `${k.character || ''}: ${k.meaning || ''}`),
                  ...(row.grammar || []).map((g) => `${g.title || ''} — ${g.structure || ''}`),
                  ...(row.lesson ? [`${row.lesson.title || ''}: ${row.lesson.description || ''}`] : []),
                  ...(row.practiceExercise ? [`${row.practiceExercise.title || ''}`] : []),
                  ...(row.mockTest ? [`${row.mockTest.title || ''}`] : []),
                ].filter(Boolean);
                return (
                  <li key={row.taskId} className="rounded-2xl bg-rp-bg-2 px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-rp-text-muted">{resultKind(row)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ok ? 'bg-rp-success-bg text-rp-success' : 'bg-rp-brand-tint text-rp-brand-strong'}`}>
                        {ok ? tr('Sẵn sàng') : row.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[15px] font-semibold text-rp-text" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{resultTitle(row)}</p>
                    {detailItems.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[12px] font-semibold text-rp-brand-strong">{trf('Xem chi tiết ({0})', { 0: detailItems.length })}</summary>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] text-rp-text-2">
                          {detailItems.slice(0, 10).map((text, idx) => <li key={idx}>{text}</li>)}
                        </ul>
                      </details>
                    )}
                    {row.error && <p className="mt-1 text-[12px] leading-5 text-rp-brand-strong">{row.error}</p>}
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
                <h2 className="text-[15px] font-semibold text-rp-text-2">{trf('{0} chữ được gợi ý', { 0: kanjiItems.length })}</h2>
                <p className="mt-1 text-[12px] text-rp-text-muted">{tr('Kiểm tra nghĩa, số nét hoặc bỏ chữ không phù hợp trước khi lưu bản nháp.')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {batchId && (
                  <Link
                    to="/content-manual/?type=Kanji"
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border border-rp-brand-border bg-white px-4 text-[13px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint ${focus}`}
                  >
                    {tr('Mở Soạn thảo thủ công')}
                  </Link>
                )}
                <button type="button" disabled={kanjiConfirm.isPending} onClick={() => kanjiConfirm.mutate()} className={`inline-flex h-10 items-center gap-2 rounded-xl bg-rp-success px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}>
                  <Icon name="save" className="text-[16px]" />
                  {kanjiConfirm.isPending ? tr('Đang lưu…') : tr('Lưu bản nháp Kanji')}
                </button>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {kanjiItems.map((item, index) => (
                <li key={`${item.character}-${index}`} className="rounded-2xl border border-rp-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rp-brand-tint text-[30px] font-semibold text-rp-brand-strong" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                      {item.character}
                    </span>
                    <button type="button" onClick={() => setKanjiItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className={`rounded-lg px-2 py-1 text-[12px] text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong ${focus}`}>{tr('Bỏ')}</button>
                  </div>
                  <p className="mt-3 text-[15px] font-semibold text-rp-text">{item.meaning || tr('Chưa có nghĩa')}</p>
                  <p className="mt-1 text-[12px] leading-5 text-rp-text-muted">
                    {[item.onYomi && `On: ${item.onYomi}`, item.kunYomi && `Kun: ${item.kunYomi}`, item.sinoVietnamese && trf('Hán Việt: {0}', { 0: item.sinoVietnamese })].filter(Boolean).join(' · ') || tr('Chưa có âm đọc')}
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-[12px] text-rp-text-2">
                    <span>{tr('Số nét')}</span>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={item.strokeCount || 1}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setKanjiItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, strokeCount: val } : row)));
                      }}
                      className="h-7 w-16 rounded-lg border border-rp-line bg-rp-bg-2 px-2 text-xs"
                    />
                  </label>
                  {item.isDuplicate && <p className="mt-2 inline-flex rounded-full bg-rp-warning-bg px-2 py-0.5 text-[11px] font-medium text-rp-warning">{tr('Đã có trong kho')}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-rp-brand-border bg-white px-4 py-4">
          <div>
            <p className="text-[14px] font-semibold text-rp-text">{tr('Kiểm tra độ chính xác bản nháp')}</p>
            <p className="mt-1 text-[12px] leading-5 text-rp-text-muted">{tr('Quét các bản nháp đã lưu trong phiên này và chỉ ra chỗ cần rà soát trước khi gửi Admin duyệt.')}</p>
          </div>
          <button type="button" disabled={scanMutation.isPending} onClick={() => scanMutation.mutate()} className={`h-10 rounded-xl border border-rp-line px-4 text-[13px] text-rp-text-2 hover:bg-rp-brand-tint disabled:opacity-50 ${focus}`}>
            {scanMutation.isPending ? tr('Đang kiểm tra…') : tr('Kiểm tra')}
          </button>
          {scanIssues.length > 0 && (
            <ul className="w-full space-y-1">
              {scanIssues.map((item) => (
                <li key={item.approvalRequestId} className="text-[12px] leading-5 text-rp-brand-strong">{item.rowKey}: {item.issues.join(' ')}</li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </ContentAuthorShell>
  );
}
