import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Check,
  FileCheck2,
  ListTree,
  Play,
  Save,
  Sparkles,
  SpellCheck2,
  Trash2,
} from 'lucide-react';
import { ContentAuthorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  FeatureIcon,
  Field,
  IconButton,
  Input,
  PageContainer,
  PageHeader,
  Textarea,
  notify,
} from '@/components/ui';
import {
  confirmContentPlan,
  confirmKanjiSuggestions,
  executeContentPlan,
  planContent,
  scanContentAccuracy,
  suggestKanji,
  toConfirmPlanBody,
} from '@/features/content-author/api/contentAuthoringApi.js';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { translateTemplate, useLocale } from '@/locales/locale.js';

const MODES = [
  {
    id: 'plan',
    label: 'Lập dàn ý bài học',
    description: 'Mô tả chủ đề bài học, trợ lý chia nhỏ công việc và tạo bản xem trước để lưu nháp.',
    icon: ListTree,
  },
  {
    id: 'kanji',
    label: 'Gợi ý Hán tự nhanh',
    description: 'Gợi ý nhóm Hán tự theo cấp độ, chỉnh sửa âm đọc và số nét trước khi lưu bản nháp.',
    icon: SpellCheck2,
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
    'Kanji N1 về kinh tế và học thuật.',
  ],
};

const PLAN_STEPS = ['Mô tả yêu cầu', 'Kế hoạch từng bước', 'Xem trước nội dung', 'Lưu bản nháp'];
const KANJI_STEPS = ['Mô tả yêu cầu', 'Kiểm tra Hán tự', 'Lưu bản nháp'];

function resultTitle(row) {
  return (
    row.lesson?.title ||
    row.practiceExercise?.title ||
    row.mockTest?.title ||
    row.kanji?.[0]?.character ||
    row.vocabulary?.[0]?.word ||
    row.grammar?.[0]?.title ||
    row.taskId
  );
}

function resultKind(row) {
  if (row.lesson) return 'Bài học';
  if (row.practiceExercise) return 'Bài luyện';
  if (row.mockTest) return 'Đề thi';
  if (row.kanji?.length) return translateTemplate('{0} kanji', { 0: row.kanji.length });
  if (row.vocabulary?.length) return translateTemplate('{0} từ', { 0: row.vocabulary.length });
  if (row.grammar?.length) return translateTemplate('{0} ngữ pháp', { 0: row.grammar.length });
  return 'Nội dung';
}

export default function ContentPlanStudio() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const { levels } = useAuthorLookups();

  const [mode, setMode] = useState('plan');
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [results, setResults] = useState([]);
  const [kanjiItems, setKanjiItems] = useState([]);
  const [levelId, setLevelId] = useState('');
  const [notice, setNotice] = useState('');
  const [batchId, setBatchId] = useState('');

  const effectiveLevelId = Number(levelId || (levels.find((l) => l.code === 'N4') || levels[0])?.id || 1);

  const planMutation = useMutation({
    mutationFn: (input) => {
      notify.loading(tr('Đang lập kế hoạch bài học với AI…'), '', { key: 'author-plan-ai', maxWaitMs: 45000 });
      return planContent(input);
    },
    onSuccess: (data) => {
      setPlan(data);
      setTasks(data.tasks || []);
      setResults([]);
      setBatchId('');
      const msg = data.clarifyingQuestion ? '' : tr('Đã có dàn ý. Bạn có thể sửa từng phần trước khi tạo nội dung.');
      setNotice(msg);
      if (data.clarifyingQuestion) {
        notify.info(tr('Trợ lý AI cần làm rõ thêm thông tin trước khi lập dàn ý.'), '', { key: 'author-plan-ai', replace: true });
      } else {
        notify.success(tr('Đã tạo xong dàn ý bài học.'), '', { key: 'author-plan-ai', replace: true });
      }
    },
    onError: (err) => notify.apiError(err, tr('Không lập được kế hoạch bài học'), { key: 'author-plan-ai', replace: true }),
  });

  const runMutation = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang tạo nội dung từ kế hoạch…'), '', { key: 'author-plan-run', maxWaitMs: 60000 });
      return executeContentPlan(tasks);
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setBatchId('');
      setNotice(tr('Nội dung đã được tạo. Kiểm tra chi tiết rồi lưu bản nháp.'));
      notify.success(tr('Đã tạo bản xem trước nội dung.'), '', {
        key: 'author-plan-run',
        replace: true,
      });
    },
    onError: (err) => notify.apiError(err, tr('Không tạo được nội dung từ kế hoạch'), { key: 'author-plan-run', replace: true }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang lưu bản nháp nội dung…'), '', { key: 'author-plan-confirm', maxWaitMs: 30000 });
      return confirmContentPlan(toConfirmPlanBody(results));
    },
    onSuccess: (data) => {
      setBatchId(data.batchId || '');
      queryClient.invalidateQueries({ queryKey: ['content-approvals-mine'] });
      queryClient.invalidateQueries({ queryKey: ['manual-content'] });
      const msg = trf('Đã lưu {0} bản nháp từ trợ lý. Bạn có thể mở Biên soạn nội dung hoặc Nội dung của tôi để rà soát và gửi duyệt.', {
        0: data.submittedCount,
      });
      setNotice(msg);
      notify.success(msg, '', { key: 'author-plan-confirm', replace: true });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được bản nháp nội dung'), { key: 'author-plan-confirm', replace: true }),
  });

  const kanjiMutation = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang gợi ý Kanji theo chủ đề…'), '', { key: 'author-kanji-suggest', maxWaitMs: 35000 });
      return suggestKanji({ prompt, certificateLevelId: effectiveLevelId });
    },
    onSuccess: (data) => {
      setKanjiItems(
        (data.items || []).map((item) => ({
          ...item,
          strokeCount: Math.max(1, Number(item.strokeCount) || 1),
        })),
      );
      setBatchId('');
      notify.success(trf('Đã gợi ý {0} chữ Kanji.', { 0: (data.items || []).length }), '', {
        key: 'author-kanji-suggest',
        replace: true,
      });
    },
    onError: (err) => notify.apiError(err, tr('Không gợi ý được Kanji'), { key: 'author-kanji-suggest', replace: true }),
  });

  const kanjiConfirm = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang lưu danh sách Kanji thành bản nháp…'), '', { key: 'author-kanji-confirm', maxWaitMs: 30000 });
      return confirmKanjiSuggestions({
        certificateLevelId: effectiveLevelId,
        items: kanjiItems
          .filter((item) => item.character && item.meaning)
          .map((item) => ({
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
      queryClient.invalidateQueries({ queryKey: ['content-approvals-mine'] });
      queryClient.invalidateQueries({ queryKey: ['manual-content'] });
      const msg = trf('Đã lưu {0} bản nháp Kanji. Mở Biên soạn nội dung để rà soát và gửi duyệt.', {
        0: data.submittedCount,
      });
      setNotice(msg);
      notify.success(msg, '', { key: 'author-kanji-confirm', replace: true });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được bản nháp Kanji'), { key: 'author-kanji-confirm', replace: true }),
  });

  const scanMutation = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang kiểm tra độ chính xác nội dung…'), '', { key: 'author-scan', maxWaitMs: 45000 });
      return scanContentAccuracy(batchId || undefined);
    },
    onSuccess: (data) => {
      const msg = data.issueCount
        ? trf('Có {0} chỗ cần xem lại.', { 0: data.issueCount })
        : tr('Bản nháp không có lỗi được chỉ ra.');
      setNotice(msg);
      if (data.issueCount) {
        notify.warning(tr('Phát hiện mục cần kiểm tra lại'), msg, { key: 'author-scan', replace: true });
      } else {
        notify.success(msg, '', { key: 'author-scan', replace: true });
      }
    },
    onError: (err) => notify.apiError(err, tr('Không quét kiểm tra được nội dung'), { key: 'author-scan', replace: true }),
  });

  const error =
    planMutation.error ||
    runMutation.error ||
    confirmMutation.error ||
    kanjiMutation.error ||
    kanjiConfirm.error ||
    scanMutation.error;
  const busy = planMutation.isPending || runMutation.isPending || confirmMutation.isPending || kanjiMutation.isPending;
  const steps = mode === 'plan' ? PLAN_STEPS : KANJI_STEPS;
  const savedDraft = Boolean(batchId);
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

  const currentStep =
    mode === 'kanji'
      ? kanjiItems.length
        ? savedDraft
          ? 3
          : 2
        : 1
      : results.length
        ? savedDraft
          ? 4
          : 3
        : tasks.length
          ? 2
          : 1;
  const scanIssues = scanMutation.data?.results?.filter((item) => item.issues?.length) || [];

  return (
    <ContentAuthorShell pathname="/content-plan" breadcrumb={tr('Trợ lý biên soạn')}>
      <PageContainer as="div" data-page="content-plan" width="default" className="space-y-5">
        <PageHeader
          eyebrow={tr('Hỗ trợ AI · Trợ lý biên soạn')}
          title={
            <span className="inline-flex flex-wrap items-center gap-2.5">
              <FeatureIcon feature="ai" size="lg" />
              <span>{tr('Trợ lý biên soạn')}</span>
              <Badge tone="brand" size="sm" icon={false}>{tr('Hỗ trợ AI')}</Badge>
            </span>
          }
          description={tr('Biến mô tả ngắn thành dàn ý và bản nháp học liệu có cấu trúc; bạn kiểm tra trực tiếp rồi lưu thành bản nháp chờ gửi duyệt.')}
          actions={
            <Link
              to="/author-dashboard/"
              className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-white px-4 text-sm font-medium text-rp-text hover:border-rp-brand-border"
            >
              {tr('Mở Nội dung của tôi')}
            </Link>
          }
        />

        {/* Step Indicator */}
        <Card className="p-4">
          <ol className="flex flex-wrap items-center gap-2">
            {steps.map((label, index) => {
              const number = index + 1;
              const done = number < currentStep;
              const active = number === currentStep;
              return (
                <li
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    active
                      ? 'border-rp-brand-strong bg-rp-brand-strong text-white'
                      : done
                        ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                        : 'border-rp-line bg-rp-bg-2 text-rp-text-muted'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      active ? 'bg-white/20 text-white' : done ? 'bg-white text-rp-brand-strong' : 'bg-white text-rp-text-muted'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : number}
                  </span>
                  <span>{tr(label)}</span>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Mode Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((item) => {
            const selected = mode === item.id;
            const ModeIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(item.id)}
                className={`rp-focus flex items-start gap-3.5 rounded-rp-card border p-4 text-left transition-colors ${
                  selected
                    ? 'border-rp-brand-strong bg-white shadow-sm'
                    : 'border-rp-line bg-rp-bg-2/70 hover:border-rp-brand-border hover:bg-white'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    selected ? 'bg-rp-brand-strong text-white' : 'bg-rp-brand-tint text-rp-brand-strong'
                  }`}
                >
                  <ModeIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-rp-text">{tr(item.label)}</span>
                  <span className="mt-1 block text-xs leading-5 text-rp-text-muted">{tr(item.description)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Prompt Input Card */}
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-rp-text">{tr('Mô tả học liệu bạn muốn tạo')}</h2>
            <span className="text-xs tabular-nums text-rp-text-muted">
              {trf('{0} ký tự', { 0: prompt.trim().length })}
            </span>
          </div>

          <Textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'kanji'
                ? tr('Ví dụ: 8 kanji N4 về thời tiết, kèm nghĩa và âm đọc.')
                : tr('Ví dụ: một bài N4 về thời tiết, có từ vựng, kanji và mẫu ngữ pháp.')
            }
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLES[mode].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rp-focus rounded-full border border-rp-brand-border/60 bg-rp-brand-tint px-3 py-1.5 text-left text-xs text-rp-text-2 transition-colors hover:text-rp-brand-strong"
              >
                {example}
              </button>
            ))}
          </div>

          {mode === 'kanji' && (
            <div className="max-w-xs">
              <Field label={tr('Cấp độ mục tiêu')}>
                <CustomSelect
                  value={String(effectiveLevelId)}
                  aria-label={tr('Cấp độ mục tiêu')}
                  onChange={setLevelId}
                  options={levels.map((lvl) => ({
                    value: String(lvl.id),
                    label: `${lvl.certificate} · ${lvl.code}`,
                  }))}
                />
              </Field>
            </div>
          )}

          {error && (
            <Banner tone="danger" title={tr('Không thực hiện được yêu cầu')}>
              {error.message}
            </Banner>
          )}
          {!error && notice && (
            <Banner tone="success">{notice}</Banner>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
            <p className="max-w-lg text-xs leading-5 text-rp-text-muted">
              {mode === 'plan'
                ? tr('Nội dung do AI gợi ý chỉ vào hệ thống ở trạng thái Bản nháp sau khi bạn bấm Lưu.')
                : tr('Bạn có thể chỉnh sửa số nét hoặc bỏ chữ không phù hợp trước khi lưu bản nháp.')}
            </p>
            {mode === 'plan' ? (
              <Button
                icon={Sparkles}
                loading={planMutation.isPending}
                disabled={busy || !prompt.trim()}
                onClick={() => {
                  setNotice('');
                  planMutation.mutate(prompt.trim());
                }}
              >
                {tr('Lập kế hoạch')}
              </Button>
            ) : (
              <Button
                icon={SpellCheck2}
                loading={kanjiMutation.isPending}
                disabled={busy || !prompt.trim()}
                onClick={() => {
                  setNotice('');
                  kanjiMutation.mutate();
                }}
              >
                {tr('Gợi ý Kanji')}
              </Button>
            )}
          </div>
        </Card>

        {/* Clarifying Question */}
        {mode === 'plan' && plan?.clarifyingQuestion && (
          <Banner tone="warning" title={tr('Cần làm rõ thêm thông tin')}>
            <p className="mb-3 text-sm text-rp-text">{plan.clarifyingQuestion}</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[220px] flex-1">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={tr('Trả lời ngắn cho trợ lý…')}
                />
              </div>
              <Button
                size="sm"
                disabled={!reply.trim() || busy}
                onClick={() => planMutation.mutate(`${prompt.trim()}\n${reply.trim()}`)}
              >
                {tr('Gửi thêm')}
              </Button>
            </div>
          </Banner>
        )}

        {/* Plan Tasks */}
        {mode === 'plan' && tasks.length > 0 && (
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-rp-text">{trf('Kế hoạch ({0} việc)', { 0: tasks.length })}</h2>
                <p className="text-xs text-rp-text-muted">{tr('Sửa mô tả chi tiết hoặc bỏ bước không cần thiết trước khi tạo nội dung.')}</p>
              </div>
              <Button
                variant="outline"
                icon={Play}
                loading={runMutation.isPending}
                disabled={busy}
                onClick={() => {
                  setNotice('');
                  runMutation.mutate();
                }}
              >
                {tr('Tạo nội dung')}
              </Button>
            </div>
            <ul className="space-y-3">
              {tasks.map((task, index) => (
                <li key={task.taskId || index} className="rounded-2xl border border-rp-line bg-rp-bg-2/40 p-4">
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rp-brand-tint text-xs font-bold text-rp-brand-strong">
                        {index + 1}
                      </span>
                      <Badge tone="brand" size="sm" icon={false}>{task.type}</Badge>
                    </div>
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="ghost"
                      label={tr('Bỏ việc này')}
                      onClick={() => setTasks((prev) => prev.filter((_, item) => item !== index))}
                    />
                  </div>
                  <Textarea
                    rows={2}
                    value={task.prompt}
                    onChange={(e) =>
                      setTasks((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, prompt: e.target.value } : item)),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Plan Results */}
        {mode === 'plan' && results.length > 0 && (
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-rp-text">{tr('Bản xem trước học liệu')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {batchId && (
                  <Link
                    to="/content-manual/"
                    className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-brand-border bg-white px-4 text-sm font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
                  >
                    {tr('Mở Biên soạn nội dung')}
                  </Link>
                )}
                {results.some((row) => row.status === 'Succeeded') && (
                  <Button
                    icon={Save}
                    loading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate()}
                  >
                    {tr('Lưu bản nháp')}
                  </Button>
                )}
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
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
                  <li key={row.taskId} className="rounded-2xl border border-rp-line bg-rp-bg-2/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="neutral" size="sm" icon={false}>{tr(resultKind(row))}</Badge>
                      <Badge tone={ok ? 'success' : 'danger'} size="sm" icon={false}>
                        {ok ? tr('Sẵn sàng') : row.status}
                      </Badge>
                    </div>
                    <p className="rp-jp mt-2 text-sm font-semibold text-rp-text">{resultTitle(row)}</p>
                    {detailItems.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-rp-brand-strong">
                          {trf('Xem chi tiết ({0})', { 0: detailItems.length })}
                        </summary>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-rp-text-2">
                          {detailItems.slice(0, 10).map((text, idx) => (
                            <li key={idx}>{text}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {row.error && <p className="mt-1 text-xs text-rp-brand-strong">{row.error}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Kanji Suggestions */}
        {mode === 'kanji' && kanjiItems.length > 0 && (
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-rp-text">{trf('{0} chữ Hán được gợi ý', { 0: kanjiItems.length })}</h2>
                <p className="text-xs text-rp-text-muted">{tr('Kiểm tra nghĩa, âm đọc, số nét hoặc bỏ chữ không phù hợp trước khi lưu.')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {batchId && (
                  <Link
                    to="/content-manual/?type=Kanji"
                    className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-brand-border bg-white px-4 text-sm font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
                  >
                    {tr('Mở Biên soạn Hán tự')}
                  </Link>
                )}
                <Button
                  icon={Save}
                  loading={kanjiConfirm.isPending}
                  onClick={() => kanjiConfirm.mutate()}
                >
                  {tr('Lưu bản nháp Kanji')}
                </Button>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {kanjiItems.map((item, index) => (
                <li key={`${item.character}-${index}`} className="rounded-2xl border border-rp-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rp-jp flex h-14 w-14 items-center justify-center rounded-2xl bg-rp-brand-tint text-3xl font-semibold text-rp-brand-strong">
                      {item.character}
                    </span>
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="ghost"
                      label={tr('Bỏ chữ này')}
                      onClick={() => setKanjiItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-rp-text">{item.meaning || tr('Chưa có nghĩa')}</p>
                  <p className="mt-1 text-xs leading-5 text-rp-text-muted">
                    {[
                      item.onYomi && `On: ${item.onYomi}`,
                      item.kunYomi && `Kun: ${item.kunYomi}`,
                      item.sinoVietnamese && trf('Hán Việt: {0}', { 0: item.sinoVietnamese }),
                    ]
                      .filter(Boolean)
                      .join(' · ') || tr('Chưa có âm đọc')}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Input
                      size="sm"
                      type="number"
                      min={1}
                      max={40}
                      label={tr('Số nét')}
                      value={item.strokeCount || 1}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setKanjiItems((prev) =>
                          prev.map((row, idx) => (idx === index ? { ...row, strokeCount: val } : row)),
                        );
                      }}
                      className="w-24"
                    />
                    {item.isDuplicate && (
                      <Badge tone="warning" size="sm" icon={false}>{tr('Đã có trong kho')}</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Draft Accuracy Scanner */}
        <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed border-rp-brand-border p-4">
          <div>
            <p className="text-sm font-semibold text-rp-text">{tr('Kiểm tra độ chính xác bản nháp')}</p>
            <p className="mt-0.5 text-xs text-rp-text-muted">
              {tr('Quét các bản nháp vừa tạo và chỉ ra điểm cần rà soát trước khi gửi Quản trị viên duyệt.')}
            </p>
          </div>
          <Button
            variant="outline"
            icon={FileCheck2}
            loading={scanMutation.isPending}
            onClick={() => scanMutation.mutate()}
          >
            {tr('Kiểm tra')}
          </Button>
          {scanIssues.length > 0 && (
            <ul className="w-full space-y-1 border-t border-rp-line pt-3">
              {scanIssues.map((item) => (
                <li key={item.approvalRequestId} className="text-xs leading-5 text-rp-brand-strong">
                  <strong>{item.rowKey}:</strong> {item.issues.join(' ')}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageContainer>
    </ContentAuthorShell>
  );
}
