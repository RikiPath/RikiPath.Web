import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';

import { assistQuestionAiV2 } from '@/features/content-author/api/contentAuthoringV2Api.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  CustomSelect,
  Input,
  Textarea,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const AI_ACTIONS = [
  { value: 'GenerateQuestions', label: 'Sinh câu hỏi mới', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: false },
  { value: 'SuggestReadingQuestionsFromPassage', label: 'Sinh câu hỏi từ đoạn đọc', skills: ['Reading'], needsCurrent: false },
  { value: 'SuggestListeningQuestionsFromTranscript', label: 'Sinh câu hỏi từ transcript', skills: ['Listening'], needsCurrent: false },
  { value: 'SuggestOptions', label: 'Đề xuất 4 phương án trả lời', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'SuggestDistractors', label: 'Gợi ý 3 phương án nhiễu', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'SuggestExplanation', label: 'Viết giải thích chi tiết', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'RewriteQuestion', label: 'Viết lại câu hỏi', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'ImproveClarity', label: 'Cải thiện độ rõ ràng', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'DetectAmbiguity', label: 'Phát hiện mơ hồ / nhiều đáp án', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'CheckLanguageQuality', label: 'Kiểm tra ngữ pháp & ngôn ngữ', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
  { value: 'SuggestLevelAndType', label: 'Gợi ý cấp độ & dạng câu hỏi', skills: ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'], needsCurrent: true },
];

export default function InlineAiAssistantDrawer({
  open,
  onClose,
  levelCode = 'N4',
  skillName = 'Vocabulary',
  templateKind = 'VocabMeaning',
  questionType = 'SingleChoice',
  currentQuestion = null,
  passageTitle = '',
  passageText = '',
  listeningTranscript = '',
  onApplySuggestions,
}) {
  const { tr, trf } = useLocale();
  const [action, setAction] = useState('GenerateQuestions');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [desiredCount, setDesiredCount] = useState(3);
  const [authorPrompt, setAuthorPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState([]);

  const availableActions = useMemo(
    () => AI_ACTIONS.filter((a) => a.skills.includes(skillName) && (!a.needsCurrent || Boolean(currentQuestion?.questionText))),
    [skillName, currentQuestion?.questionText],
  );

  const effectiveAction = availableActions.some((a) => a.value === action)
    ? action
    : (availableActions[0]?.value || 'GenerateQuestions');

  const runAssist = useMutation({
    mutationFn: () =>
      assistQuestionAiV2({
        action: effectiveAction,
        certificateLevelCode: levelCode,
        skillName,
        templateKind,
        questionType,
        topic: topic.trim() || undefined,
        difficulty,
        desiredCount: Number(desiredCount) || 3,
        authorPrompt: authorPrompt.trim() || undefined,
        currentQuestion: currentQuestion || undefined,
        passageTitle: passageTitle || undefined,
        passageText: passageText || undefined,
        listeningTranscript: listeningTranscript || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      const validIndices = (data?.suggestions || [])
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.validation?.isValid !== false)
        .map(({ idx }) => idx);
      setSelectedIndexes(validIndices);
      notify.success(tr('Trợ lý AI đã trả về gợi ý.'), '', { key: 'ai-assist-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Không gọi được Trợ lý AI lúc này'), { key: 'ai-assist-err' }),
  });

  if (!open) return null;

  const suggestions = result?.suggestions || [];
  const issues = result?.analysisIssues || [];

  const toggleIndex = (idx) => {
    setSelectedIndexes((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]));
  };

  const handleApplySelected = () => {
    const picked = suggestions
      .filter((_, idx) => selectedIndexes.includes(idx))
      .map((s) => ({
        ...s.question,
        aiProvenance: s.question.aiProvenance || result?.provenance
          ? { ...(s.question.aiProvenance || result.provenance), humanReviewed: true }
          : undefined,
      }));
    if (picked.length === 0) {
      notify.info(tr('Hãy chọn ít nhất 1 gợi ý để áp dụng.'), '', { key: 'ai-none-picked' });
      return;
    }
    onApplySuggestions?.(picked, effectiveAction);
    notify.success(trf('Đã chèn {0} gợi ý.', { 0: picked.length }), '', { key: 'ai-applied' });
  };

  return (
    <Card className="space-y-4 border-rp-brand-border bg-rp-surface p-4 shadow-rp-card" data-testid="inline-ai-assistant">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rp-brand-tint text-rp-brand-strong">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-rp-text">{tr('AI hỗ trợ biên soạn')}</h3>
            <p className="text-xs text-rp-text-muted">
              {tr('Gợi ý câu hỏi, đáp án, giải thích và kiểm tra chất lượng trước khi lưu Nháp.')}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" icon={X} onClick={onClose} aria-label={tr('Đóng trợ lý AI')} />
      </div>

      <div className="grid gap-3 pt-1 sm:grid-cols-2">
        <CustomSelect
          size="sm"
          label={tr('Thao tác AI')}
          value={effectiveAction}
          onChange={setAction}
          options={availableActions.map((a) => ({ value: a.value, label: tr(a.label) }))}
        />

        <CustomSelect
          size="sm"
          label={tr('Độ khó')}
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: 'Easy', label: tr('Dễ') },
            { value: 'Medium', label: tr('Trung bình') },
            { value: 'Hard', label: tr('Nâng cao') },
          ]}
        />

        <Input
          size="sm"
          label={tr('Chủ đề')}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={tr('VD: Gia đình, Công sở, Giao thông…')}
        />

        <CustomSelect
          size="sm"
          label={tr('Số câu gợi ý')}
          value={String(desiredCount)}
          onChange={(v) => setDesiredCount(Number(v))}
          options={['1', '2', '3', '5', '8'].map((n) => ({ value: n, label: `${n} ${tr('câu')}` }))}
        />
      </div>

      <Textarea
        rows={2}
        label={tr('Hướng dẫn thêm cho AI')}
        value={authorPrompt}
        onChange={(e) => setAuthorPrompt(e.target.value)}
        placeholder={tr('VD: Tập trung vào cách dùng phó từ N4 hoặc bẫy đồng âm dễ nhầm…')}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-rp-text-muted">
          {tr('AI không tự lưu hoặc xuất bản; chỉ bạn quyết định áp dụng.')}
        </span>
        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={Wand2}
          loading={runAssist.isPending}
          onClick={() => runAssist.mutate()}
        >
          {runAssist.isPending ? tr('Đang phân tích…') : tr('Chạy trợ lý AI')}
        </Button>
      </div>

      {result && (
        <div className="space-y-3 border-t border-rp-line pt-3">
          {result.provenance?.aiAssisted && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="brand" size="sm" icon={Sparkles}>
                {`AI · ${result.provenance.model || 'OpenAI'}`}
              </Badge>
              {result.suggestedLevelCode && (
                <Badge tone="neutral" size="sm" icon={false}>
                  {trf('Gợi ý cấp: {0}', { 0: result.suggestedLevelCode })}
                </Badge>
              )}
              {result.summary && <span className="text-rp-text-2">{result.summary}</span>}
            </div>
          )}

          {issues.length > 0 && (
            <Banner tone="warning" title={tr('Phát hiện cần lưu ý')}>
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {issues.map((issue, idx) => (
                  <li key={idx}>
                    <strong>{issue.field}:</strong> {issue.message}
                    {issue.suggestedFix ? ` → ${issue.suggestedFix}` : ''}
                  </li>
                ))}
              </ul>
            </Banner>
          )}

          {result.before?.questionText && suggestions.length > 0 && (
            <div className="rounded-lg border border-rp-line bg-rp-bg p-3 text-xs">
              <div className="font-semibold text-rp-text-muted">{tr('Nội dung trước khi sửa (Before)')}</div>
              <p className="mt-1 whitespace-pre-wrap text-rp-text">{result.before.questionText}</p>
            </div>
          )}

          {suggestions.map((item, idx) => {
            const q = item.question;
            const val = item.validation;
            const checked = selectedIndexes.includes(idx);
            const hasDup = (item.DuplicateMatches || item.duplicateMatches || []).length > 0;
            const dupList = item.duplicateMatches || item.DuplicateMatches || [];
            return (
              <div
                key={idx}
                className={`space-y-2 rounded-xl border p-3 text-xs ${
                  val?.isValid === false ? 'border-rose-300 bg-rose-50/40' : 'border-rp-line bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Checkbox
                    checked={checked}
                    disabled={val?.isValid === false}
                    onChange={() => toggleIndex(idx)}
                    label={
                      <span className="font-semibold text-rp-text">
                        {trf('Gợi ý #{0} ({1})', { 0: idx + 1, 1: q.templateKind || q.questionType })}
                      </span>
                    }
                  />
                  <div className="flex flex-wrap gap-1">
                    {val?.isValid === false ? (
                      <Badge tone="danger" size="sm" icon={AlertTriangle}>{tr('Lỗi schema')}</Badge>
                    ) : (
                      <Badge tone="success" size="sm" icon={CheckCircle2}>{tr('Đạt chuẩn')}</Badge>
                    )}
                    {hasDup && (
                      <Badge tone="warning" size="sm" icon={AlertTriangle}>
                        {trf('Trùng {0} câu', { 0: dupList.length })}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-sm font-medium text-rp-text">{q.questionText}</p>

                {q.options?.length > 0 && (
                  <ul className="space-y-1 pl-2">
                    {q.options.map((o, oIdx) => (
                      <li key={oIdx} className={o.isCorrect ? 'font-semibold text-rp-success' : 'text-rp-text-2'}>
                        {`${String.fromCharCode(65 + oIdx)}. ${o.optionText}`}
                        {o.isCorrect ? ' ✓' : ''}
                      </li>
                    ))}
                  </ul>
                )}

                {q.skillMetadata?.orderingTokens?.length > 0 && (
                  <p className="text-rp-text-2">
                    <strong>{tr('Cụm sắp xếp:')}</strong> {q.skillMetadata.orderingTokens.join(' | ')} →{' '}
                    <span className="font-semibold text-rp-success">{(q.skillMetadata.orderingAnswer || []).join(' ')}</span>
                  </p>
                )}

                {q.skillMetadata?.acceptedAnswers?.length > 0 && (
                  <p className="text-rp-text-2">
                    <strong>{tr('Đáp án điền từ:')}</strong> {q.skillMetadata.acceptedAnswers.join(' / ')}
                  </p>
                )}

                {q.explanation && (
                  <p className="rounded bg-rp-bg px-2.5 py-1.5 text-rp-text-2">
                    <strong>{tr('Giải thích:')}</strong> {q.explanation}
                  </p>
                )}

                {val?.errors?.length > 0 && (
                  <ul className="list-disc pl-4 text-rose-700">
                    {val.errors.map((err, eIdx) => (
                      <li key={eIdx}>{err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {suggestions.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="primary" size="sm" onClick={handleApplySelected}>
                {trf('Áp dụng {0} mục đã chọn vào form', { 0: selectedIndexes.length })}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
