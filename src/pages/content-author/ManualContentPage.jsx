import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  FolderUp,
  History,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import SkillQuestionEditor from '@/features/content-author/components/SkillQuestionEditor.jsx';
import { api } from '@/api/client.js';
import { uploadListeningAudio } from '@/features/content-author/api/contentImportApi.js';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { useAuth } from '@/app/auth/authContext.js';
import { ContentAuthorShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataRefreshBoundary,
  DataTable,
  FeatureIcon,
  Field,
  IconButton,
  Input,
  Modal,
  PageContainer,
  PageHeader,
  Radio,
  SakuraLoader,
  Tabs,
  Textarea,
  UnifiedToolbar,
  confirmAction,
  notify,
} from '@/components/ui';
import { ORDERING_TYPE, normalizeKeys, statuses, withRowId } from '@/features/content-author/utils/contentModel.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { definitions } from '@/features/content-author/utils/contentDefinitions.js';

const endpoint = '/content-author/manual';

const STATUS_BADGE_TONES = {
  Draft: 'neutral',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

const orderingType = ORDERING_TYPE;
const emptyOrderingParts = [{ uiId: 'first', text: '' }, { uiId: 'second', text: '' }];
const questionTypes = {
  SingleChoice: 'Một đáp án',
  MultipleChoice: 'Nhiều đáp án',
  Listening: 'Nghe hiểu',
  Reading: 'Đọc hiểu',
  [orderingType]: 'Sắp xếp câu',
  FillBlank: 'Điền chỗ trống',
  Matching: 'Ghép cặp',
  ShortAnswer: 'Trả lời ngắn',
};
const optionTypes = new Set(['SingleChoice', 'MultipleChoice', 'Listening', 'Reading']);

function updateField(data, key, value) {
  return { ...data, [key]: typeof value === 'function' ? value(data[key] ?? []) : value };
}

function isValidHttpUrl(value) {
  if (!value || !String(value).trim()) return true;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function DynamicField({ definition, data, change, error }) {
  const { tr } = useLocale();
  const { key, label, kind, required, maxLength } = definition;
  const val = data[key] ?? '';
  const handleChange = (e) => {
    const raw = e.target.value;
    change(key, kind === 'number' ? (raw === '' ? undefined : Number(raw)) : raw);
  };

  return (
    <Field label={tr(label)} required={required} error={error}>
      {kind === 'textarea' ? (
        <Textarea
          rows={3}
          maxLength={maxLength}
          invalid={Boolean(error)}
          value={val}
          onChange={handleChange}
        />
      ) : (
        <Input
          type={kind === 'number' ? 'number' : kind === 'url' ? 'url' : 'text'}
          min={kind === 'number' ? (required ? 1 : 0) : undefined}
          maxLength={maxLength}
          invalid={Boolean(error)}
          value={val}
          onChange={handleChange}
        />
      )}
    </Field>
  );
}

function AudioUploadField({ data, change, error }) {
  const { tr } = useLocale();
  const upload = useMutation({
    mutationFn: (file) => {
      if (file.size > 25 * 1024 * 1024) {
        return Promise.reject(new Error('Tệp âm thanh tối đa 25 MB.'));
      }
      notify.loading('Đang tải tệp âm thanh MP3…', '', { key: 'manual-audio-upload', maxWaitMs: 30000 });
      return uploadListeningAudio(file);
    },
    onSuccess: (result) => {
      change('audioUrl', result.url);
      notify.success('Đã tải tệp âm thanh lên thành công.', '', { key: 'manual-audio-upload', replace: true });
    },
    onError: (err) => notify.apiError(err, 'Tải tệp âm thanh thất bại', { key: 'manual-audio-upload', replace: true }),
  });

  return (
    <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
      <Field label={tr('Đường dẫn tệp âm thanh (MP3)')} error={error}>
        <Input
          type="url"
          value={data.audioUrl ?? ''}
          invalid={Boolean(error)}
          onChange={(e) => change('audioUrl', e.target.value)}
          placeholder="https://..."
        />
      </Field>
      {data.audioUrl && isValidHttpUrl(data.audioUrl) && (
        <audio controls preload="none" className="h-9 w-full max-w-md" src={data.audioUrl} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rp-line bg-white px-3 py-1.5 text-xs font-semibold text-rp-brand-strong hover:border-rp-brand-border">
          <Upload className="h-3.5 w-3.5" />
          <span>{upload.isPending ? tr('Đang tải MP3…') : tr('Tải tệp MP3 từ máy')}</span>
          <input
            type="file"
            accept=".mp3,audio/mpeg"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = '';
            }}
          />
        </label>
        <span className="text-[11.5px] text-rp-text-muted">{tr('Định dạng .mp3, tối đa 25 MB.')}</span>
      </div>
    </div>
  );
}

function RepeaterRows({ rows, onChange, name, create, render, movable = false }) {
  const { tr, trf } = useLocale();
  function move(index, offset) {
    onChange((items) => {
      const next = [...items];
      const target = index + offset;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.uiId} className="space-y-3 rounded-xl border border-rp-line bg-white p-3.5 shadow-rp-xs">
          <div className="flex items-center justify-between gap-2 border-b border-rp-line/60 pb-2">
            <strong className="text-sm text-rp-text">
              {tr(name)} {index + 1}
            </strong>
            <div className="flex flex-wrap items-center gap-1.5">
              {movable && (
                <>
                  <IconButton
                    size="sm"
                    variant="outline"
                    icon={ArrowUp}
                    label={trf('Chuyển {0} {1} lên', { 0: tr(name).toLowerCase(), 1: index + 1 })}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    size="sm"
                    variant="outline"
                    icon={ArrowDown}
                    label={trf('Chuyển {0} {1} xuống', { 0: tr(name).toLowerCase(), 1: index + 1 })}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  />
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                onClick={() => onChange((items) => items.filter((item) => item.uiId !== row.uiId))}
              >
                {tr('Xóa')}
              </Button>
            </div>
          </div>
          {render(row, (key, value) =>
            onChange((items) =>
              items.map((item) => (item.uiId === row.uiId ? updateField(item, key, value) : item)),
            ),
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        icon={Plus}
        onClick={() => {
          const item = withRowId(create());
          onChange((items) => [...items, item]);
        }}
      >
        {trf('Thêm {0}', { 0: tr(name).toLowerCase() })}
      </Button>
    </div>
  );
}

function newQuestion() {
  return { questionType: 'SingleChoice', options: [{ isCorrect: true }, { isCorrect: false }] };
}

function newMockSection() {
  return { questions: [newQuestion()] };
}

function OrderingFields({ parts, change }) {
  const { tr } = useLocale();
  return (
    <fieldset className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/40 p-3">
      <legend className="px-1 text-xs font-semibold text-rp-text">{tr('Các cụm từ theo thứ tự đúng')}</legend>
      <p className="text-xs text-rp-text-muted">
        {tr('Nhập ít nhất 2 cụm từ theo đúng trật tự câu hoàn chỉnh. Hệ thống sẽ tự động xáo trộn khi hiển thị cho học viên.')}
      </p>
      <RepeaterRows
        rows={parts}
        onChange={(update) => change('orderingParts', (current) => update(current))}
        name="Cụm từ"
        create={() => ({ text: '' })}
        movable
        render={(part, update) => (
          <DynamicField
            definition={{ key: 'text', label: 'Nội dung cụm từ', kind: 'text', required: true }}
            data={part}
            change={update}
          />
        )}
      />
    </fieldset>
  );
}

function QuestionsEditor({ rows, onChange, mock }) {
  const { tr } = useLocale();
  return (
    <RepeaterRows
      rows={rows}
      onChange={onChange}
      name="Câu hỏi"
      create={newQuestion}
      movable
      render={(question, change) => (
        <div className="space-y-3">
          {mock && (
            <Field label={tr('Dạng câu hỏi')} required>
              <CustomSelect
                value={question.questionType || 'SingleChoice'}
                onChange={(value) => {
                  change('questionType', value);
                  if (value === orderingType && !question.orderingParts) {
                    change('orderingParts', emptyOrderingParts);
                  }
                }}
                options={Object.entries(questionTypes).map(([value, label]) => ({
                  value,
                  label: tr(label),
                }))}
              />
            </Field>
          )}

          <DynamicField
            definition={{ key: 'questionText', label: 'Nội dung câu hỏi', kind: 'textarea', required: !mock || !question.imageUrl }}
            data={question}
            change={change}
          />

          {mock && question.questionType === orderingType ? (
            <OrderingFields parts={question.orderingParts ?? []} change={change} />
          ) : mock && !optionTypes.has(question.questionType || 'SingleChoice') ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {['interactionData', 'answerKey'].map((key, index) => (
                <DynamicField
                  key={key}
                  definition={{
                    key,
                    label: index ? 'Đáp án có cấu trúc (JSON)' : 'Dữ liệu tương tác (JSON)',
                    kind: 'textarea',
                    required: true,
                  }}
                  data={{
                    [key]:
                      typeof question[key] === 'string'
                        ? question[key]
                        : JSON.stringify(question[key] ?? {}, null, 2),
                  }}
                  change={change}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-rp-line/70 bg-rp-bg-2/40 p-3">
              <p className="text-xs font-semibold text-rp-text-muted">{tr('Các lựa chọn đáp án')}</p>
              <RepeaterRows
                rows={question.options ?? []}
                onChange={(value) => change('options', value)}
                name="Lựa chọn"
                create={() => ({ isCorrect: false })}
                render={(option, update) => (
                  <div className="space-y-2.5">
                    <DynamicField
                      definition={{
                        key: 'optionText',
                        label: 'Nội dung lựa chọn',
                        kind: 'text',
                        required: !mock || !option.imageUrl,
                      }}
                      data={option}
                      change={update}
                    />
                    {mock && option.imageUrl && isValidHttpUrl(option.imageUrl) && (
                      <img
                        loading="lazy"
                        alt={tr('Hình đáp án')}
                        className="max-h-24 max-w-full rounded-lg border border-rp-line object-contain"
                        src={option.imageUrl}
                      />
                    )}
                    {mock && (
                      <DynamicField
                        definition={{ key: 'imageUrl', label: 'URL ảnh đáp án (nếu có)', kind: 'url' }}
                        data={option}
                        change={update}
                      />
                    )}
                    <div>
                      {question.questionType === 'MultipleChoice' ? (
                        <Checkbox
                          checked={Boolean(option.isCorrect)}
                          onChange={(e) => update('isCorrect', e.target.checked)}
                          label={tr('Đáp án đúng')}
                        />
                      ) : (
                        <Radio
                          name={`correct-${question.uiId}`}
                          checked={Boolean(option.isCorrect)}
                          onChange={() =>
                            change('options', (options) =>
                              options.map((item) => ({ ...item, isCorrect: item.uiId === option.uiId })),
                            )
                          }
                          label={tr('Đáp án đúng')}
                        />
                      )}
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {mock && (
            <div className="grid gap-3">
              <AudioUploadField data={question} change={change} />
              <DynamicField
                definition={{ key: 'imageUrl', label: 'URL hình minh họa câu hỏi (nếu có)', kind: 'url' }}
                data={question}
                change={change}
              />
              {question.imageUrl && isValidHttpUrl(question.imageUrl) && (
                <img
                  loading="lazy"
                  alt={tr('Hình câu hỏi')}
                  className="max-h-40 max-w-full rounded-lg border border-rp-line object-contain"
                  src={question.imageUrl}
                />
              )}
            </div>
          )}

          <DynamicField
            definition={{ key: 'explanation', label: 'Giải thích đáp án', kind: 'textarea' }}
            data={question}
            change={change}
          />
        </div>
      )}
    />
  );
}

function orderingTokens(answerKey, existingTokens) {
  const sortedAnswer = [...answerKey].sort();
  if (
    Array.isArray(existingTokens)
    && existingTokens.length === answerKey.length
    && existingTokens.every((token) => typeof token === 'string')
    && [...existingTokens].sort().every((token, index) => token === sortedAnswer[index])
    && existingTokens.some((token, index) => token !== answerKey[index])
  ) {
    return existingTokens;
  }

  const tokens = [...answerKey];
  for (let index = tokens.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [tokens[index], tokens[other]] = [tokens[other], tokens[index]];
  }
  if (tokens.every((token, index) => token === answerKey[index])) {
    const other = tokens.findIndex((token) => token !== tokens[0]);
    if (other > 0) [tokens[0], tokens[other]] = [tokens[other], tokens[0]];
  }
  return tokens;
}

function serializeForm(type, data) {
  if (type !== 'MockTest') return data;
  return {
    ...data,
    sections: (data.sections ?? []).map((section) => ({
      ...section,
      questions: (section.questions ?? []).map(({ orderingParts, ...question }) => {
        if (question.questionType === orderingType) {
          const answerKey = (orderingParts || []).map((part) => part.text.trim());
          const existing = question.interactionData?.tokens ? question.interactionData : null;
          return {
            ...question,
            options: [],
            answerKey,
            interactionData: { ...existing, tokens: orderingTokens(answerKey, existing?.tokens) },
          };
        }
        if (optionTypes.has(question.questionType || 'SingleChoice')) {
          return { ...question, interactionData: null, answerKey: null };
        }
        return {
          ...question,
          options: [],
          interactionData: typeof question.interactionData === 'string' ? JSON.parse(question.interactionData) : question.interactionData,
          answerKey: typeof question.answerKey === 'string' ? JSON.parse(question.answerKey) : question.answerKey,
        };
      }),
    })),
  };
}

function LessonTopicField({ data, change, topics }) {
  const { tr } = useLocale();
  const [choice, setChoice] = useState(() => (data.topicId ? String(data.topicId) : data.topicTitle ? 'new' : ''));
  const missingTopic = data.topicId && !topics.some((topic) => topic.id === data.topicId);

  const options = [
    { value: '', label: tr('Chưa chọn chủ đề') },
    { value: 'new', label: tr('+ Tạo chủ đề mới') },
    ...(missingTopic ? [{ value: String(data.topicId), label: `${data.topicTitle ?? tr('Chủ đề đã chọn')} ${tr('(không còn khả dụng)')}` }] : []),
    ...topics.map((topic) => ({ value: String(topic.id), label: tr(topic.title) })),
  ];

  return (
    <div className="space-y-2.5">
      <Field label={tr('Chủ đề bài học')}>
        <CustomSelect
          value={String(choice)}
          onChange={(value) => {
            setChoice(value);
            change('topicId', value && value !== 'new' ? Number(value) : null);
            change('topicTitle', value === '' ? '' : null);
          }}
          options={options}
        />
      </Field>
      {choice === 'new' && (
        <Field label={tr('Tên chủ đề mới')} required>
          <Input
            maxLength={300}
            value={data.topicTitle ?? ''}
            onChange={(e) => change('topicTitle', e.target.value)}
            placeholder={tr('Ví dụ: Giao tiếp trong nhà hàng')}
          />
        </Field>
      )}
    </div>
  );
}

export function ContentPreviewPanel({ type, data, lookups }) {
  const { tr } = useLocale();
  const level = lookups.levels?.find((l) => Number(l.id) === Number(data.certificateLevelId));
  const skill = lookups.skills?.find((s) => Number(s.id) === Number(data.languageSkillId));

  return (
    <div className="space-y-4 rounded-2xl border border-rp-brand-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" size="sm" icon={false}>{tr(definitions[type]?.label || type)}</Badge>
            {level && <Badge tone="neutral" size="sm" icon={false}>{level.certificate} · {level.code}</Badge>}
            {skill && <Badge tone="info" size="sm" icon={false}>{skill.name}</Badge>}
          </div>
          <h3 className="rp-jp text-lg font-bold text-rp-text">
            {data.title || data.word || data.character || tr('Chưa đặt tên')}
          </h3>
        </div>
      </div>

      {data.reading && (
        <p className="rp-jp text-sm font-medium text-rp-brand-strong">{data.reading}</p>
      )}
      {data.structure && (
        <p className="rp-jp rounded-xl bg-rp-bg-2 px-3 py-2 text-sm font-semibold text-rp-text">{data.structure}</p>
      )}
      {(data.meaning || data.description || data.usageNotes) && (
        <p className="text-sm leading-6 text-rp-text-2">{data.meaning || data.description || data.usageNotes}</p>
      )}
      {data.exampleSentence && (
        <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3 text-sm">
          <p className="rp-jp font-medium text-rp-text">{data.exampleSentence}</p>
          {data.exampleSentenceMeaning && <p className="mt-1 text-xs text-rp-text-muted">{data.exampleSentenceMeaning}</p>}
        </div>
      )}
      {data.audioUrl && isValidHttpUrl(data.audioUrl) && (
        <audio controls preload="none" className="w-full" src={data.audioUrl} />
      )}
      {type === 'PracticeExercise' && (data.questions || []).length > 0 && (
        <div className="space-y-2.5">
          {data.questions.map((q, idx) => (
            <div key={q.uiId || idx} className="rounded-xl border border-rp-line p-3 text-sm">
              <p className="font-semibold text-rp-text">
                {idx + 1}. {q.questionText}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {(q.options || []).map((opt, oi) => (
                  <li key={opt.uiId || oi} className={opt.isCorrect ? 'font-semibold text-emerald-700' : 'text-rp-text-2'}>
                    • {opt.optionText} {opt.isCorrect ? `(${tr('Đáp án đúng')})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {type === 'MockTest' && (data.sections || []).length > 0 && (
        <div className="space-y-3">
          {data.sections.map((sec, si) => (
            <div key={sec.uiId || si} className="space-y-2 rounded-xl border border-rp-line p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-rp-text">{sec.title || `${tr('Phần thi')} ${si + 1}`}</h4>
                <Badge tone="neutral" size="sm" icon={false}>{(sec.questions || []).length} {tr('câu')}</Badge>
              </div>
              {(sec.questions || []).map((q, qi) => (
                <div key={q.uiId || qi} className="rounded-lg bg-rp-bg-2/50 p-2.5 text-xs">
                  <p className="font-medium text-rp-text">{qi + 1}. {q.questionText}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentForm({
  type,
  initial,
  record,
  latestRecord,
  lookups,
  save,
  saveAndSubmit,
  close,
  viewOnly = false,
  onDirtyChange,
}) {
  const { trf, tr } = useLocale();
  const [data, setData] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const staleStatusConflict = Boolean(
    record?.id && latestRecord?.status && record?.status && latestRecord.status !== record.status,
  );
  const readOnly = viewOnly || record?.status === 'PendingReview' || staleStatusConflict;
  const change = (key, value) => setData((previous) => updateField(previous, key, value));
  const skills = (lookups.skills || []).map((skill) => ({ value: String(skill.id), label: skill.name }));
  const exercise = type === 'PracticeExercise';

  const lessons = useQuery({
    queryKey: ['manual-content-lessons', data.certificateLevelId],
    queryFn: () => api.get(`${endpoint}/lessons/${data.certificateLevelId}`),
    enabled: exercise && Boolean(data.certificateLevelId),
  });

  const levelSections = useMemo(
    () => (lookups.sections || []).filter((item) => Number(item.certificateLevelId) === Number(data.certificateLevelId)),
    [lookups.sections, data.certificateLevelId],
  );

  const isDirty = !readOnly && JSON.stringify(data) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const published = record?.status === 'Approved';

  const fieldValidationErrors = useMemo(() => {
    const errors = {};
    if (!data.certificateLevelId) errors.certificateLevelId = tr('Vui lòng chọn cấp độ.');
    if ((type === 'Lesson' || exercise) && !data.languageSkillId) {
      errors.languageSkillId = tr('Vui lòng chọn kỹ năng.');
    }
    const defs = definitions[type]?.fields || [];
    for (const def of defs) {
      const val = data[def.key];
      if (def.required && (val === undefined || val === null || String(val).trim() === '')) {
        errors[def.key] = trf('Vui lòng nhập {0}.', { 0: tr(def.label).toLowerCase() });
      } else if (def.kind === 'url' && !isValidHttpUrl(val)) {
        errors[def.key] = tr('Đường dẫn phải bắt đầu bằng http:// hoặc https://.');
      } else if (def.kind === 'number' && def.required && (!Number.isFinite(Number(val)) || Number(val) < 1)) {
        errors[def.key] = tr('Giá trị phải lớn hơn 0.');
      }
    }
    if (!isValidHttpUrl(data.audioUrl)) {
      errors.audioUrl = tr('Đường dẫn âm thanh phải hợp lệ (http/https).');
    }
    return errors;
  }, [data, type, exercise, tr, trf]);

  function validateComplexSections() {
    if (type === 'MockTest') {
      if (levelSections.length === 0) {
        return tr('Cấp độ này chưa có Phần thi nào được Quản trị viên cấu hình. Hãy liên hệ Quản trị viên cấu hình Phần thi trước khi tạo đề.');
      }
      if (!data.sections?.length) {
        return tr('Đề thi thử cần ít nhất 1 phần thi.');
      }
      for (let i = 0; i < data.sections.length; i += 1) {
        const sec = data.sections[i];
        if (!String(sec.title || '').trim()) return trf('Phần thi {0}: vui lòng nhập tên phần thi.', { 0: i + 1 });
        if (!sec.certificateSectionCode) return trf('Phần thi {0}: vui lòng chọn mục thi theo cấu hình.', { 0: i + 1 });
        if (!sec.languageSkillId) return trf('Phần thi {0}: vui lòng chọn kỹ năng.', { 0: i + 1 });
        if (!sec.questions?.length) return trf('Phần thi {0}: vui lòng thêm ít nhất 1 câu hỏi.', { 0: i + 1 });
        for (let qIdx = 0; qIdx < sec.questions.length; qIdx += 1) {
          const q = sec.questions[qIdx];
          if (q.questionType === orderingType) {
            if ((q.orderingParts?.length ?? 0) < 2 || q.orderingParts.some((p) => !p.text.trim())) {
              return trf('Phần {0}, câu {1}: hãy nhập ít nhất 2 cụm từ và điền đầy đủ.', { 0: i + 1, 1: qIdx + 1 });
            }
          } else if (optionTypes.has(q.questionType || 'SingleChoice')) {
            if ((q.options?.length ?? 0) < 2 || !q.options.some((o) => o.isCorrect)) {
              return trf('Phần {0}, câu {1}: cần ít nhất 2 lựa chọn và đánh dấu đáp án đúng.', { 0: i + 1, 1: qIdx + 1 });
            }
          }
        }
      }
    }
    if (exercise) {
      if (!data.lessonId && !String(data.lessonTitle || '').trim()) {
        return tr('Vui lòng chọn bài học liên kết hoặc nhập tên bài học đang chờ duyệt.');
      }
      if (!data.questions?.length) return tr('Bài luyện tập cần ít nhất 1 câu hỏi.');
      for (let qIdx = 0; qIdx < data.questions.length; qIdx += 1) {
        const q = data.questions[qIdx];
        if (!String(q.questionText || '').trim()) return trf('Câu hỏi {0}: vui lòng nhập nội dung câu hỏi.', { 0: qIdx + 1 });
        if ((q.options?.length ?? 0) < 2 || q.options.filter((o) => o.isCorrect).length !== 1) {
          return trf('Câu hỏi {0}: cần ít nhất 2 lựa chọn và đúng 1 đáp án đúng.', { 0: qIdx + 1 });
        }
      }
    }
    return '';
  }

  function handleSave(shouldSubmit = false) {
    if (save.isPending || saveAndSubmit?.isPending || readOnly) return;
    setSubmitted(true);
    setFormError('');

    if (Object.keys(fieldValidationErrors).length > 0) {
      setFormError(tr('Vui lòng kiểm tra các trường được đánh dấu đỏ bên trên.'));
      return;
    }

    const complexErr = validateComplexSections();
    if (complexErr) {
      setFormError(complexErr);
      return;
    }

    try {
      const serialized = serializeForm(type, data);
      if (shouldSubmit && saveAndSubmit) {
        saveAndSubmit.mutate(serialized);
      } else {
        save.mutate(serialized);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setFormError(tr('Hãy kiểm tra định dạng JSON của dữ liệu tương tác và đáp án.'));
      } else {
        throw error;
      }
    }
  }

  const busySaving = save.isPending || Boolean(saveAndSubmit?.isPending);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave(false);
      }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand" size="sm" icon={false}>{tr(definitions[type]?.label || type)}</Badge>
          {record?.status && (
            <Badge tone={STATUS_BADGE_TONES[record.status] || 'neutral'} size="sm" icon={false}>
              {tr(statuses[record.status]?.label ?? record.status)}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant={previewMode ? 'primary' : 'outline'}
          icon={previewMode ? Pencil : Eye}
          onClick={() => setPreviewMode((v) => !v)}
        >
          {previewMode ? tr('Quay lại chỉnh sửa') : tr('Xem trước')}
        </Button>
      </div>

      {record?.status === 'Rejected' && record?.reviewNote && (
        <Banner tone="danger" title={tr('Lý do Quản trị viên từ chối')}>
          {record.reviewNote}
        </Banner>
      )}

      {published && !staleStatusConflict && (
        <Banner tone="info" title={tr('Tạo bản chỉnh sửa mới')}>
          {tr('Nội dung này đã xuất bản. Khi lưu, hệ thống tạo một bản nháp chỉnh sửa mới để Quản trị viên phê duyệt mà không làm gián đoạn dữ liệu học viên đang học.')}
        </Banner>
      )}

      {staleStatusConflict && (
        <Banner tone="warning" title={tr('Trạng thái đã thay đổi')}>
          {trf('Trạng thái học liệu vừa chuyển sang "{0}" từ thao tác khác. Hãy đóng và mở lại để tránh ghi đè dữ liệu mới.', {
            0: tr(statuses[latestRecord.status]?.label ?? latestRecord.status),
          })}
        </Banner>
      )}

      {previewMode ? (
        <ContentPreviewPanel type={type} data={data} lookups={lookups} />
      ) : (
        <fieldset disabled={busySaving || readOnly} className="space-y-5">
          {/* Group 1: Thông tin cơ bản */}
          <Card className="space-y-4 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
              {tr('Thông tin cơ bản')}
            </h3>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                label={tr('Chứng chỉ & Cấp độ')}
                required
                error={submitted ? fieldValidationErrors.certificateLevelId : undefined}
              >
                <CustomSelect
                  value={data.certificateLevelId ? String(data.certificateLevelId) : ''}
                  disabled={readOnly}
                  onChange={(value) =>
                    setData((previous) => ({
                      ...previous,
                      certificateLevelId: Number(value),
                      lessonId: null,
                      lessonTitle: exercise ? '' : previous.lessonTitle,
                    }))
                  }
                  placeholder={tr('Chọn cấp độ')}
                  options={(lookups.levels || []).map((level) => ({
                    value: String(level.id),
                    label: `${level.certificate} · ${level.code}`,
                  }))}
                />
              </Field>

              {(type === 'Lesson' || exercise) && (
                <Field
                  label={tr('Kỹ năng')}
                  required
                  error={submitted ? fieldValidationErrors.languageSkillId : undefined}
                >
                  <CustomSelect
                    value={data.languageSkillId ? String(data.languageSkillId) : ''}
                    disabled={readOnly}
                    onChange={(value) => change('languageSkillId', Number(value))}
                    placeholder={tr('Chọn kỹ năng')}
                    options={skills}
                  />
                </Field>
              )}

              {(definitions[type]?.fields || []).map((def) => (
                <div key={def.key} className={def.kind === 'textarea' ? 'sm:col-span-2' : ''}>
                  <DynamicField
                    definition={def}
                    data={data}
                    change={change}
                    error={submitted ? fieldValidationErrors[def.key] : undefined}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Group 2: Audio / Topic / Linked Lesson */}
          {(type === 'Lesson' || type === 'Vocabulary' || type === 'Kanji' || exercise) && (
            <Card className="space-y-4 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
                {tr('Chủ đề, liên kết & tài nguyên')}
              </h3>
              {type === 'Lesson' && <LessonTopicField data={data} change={change} topics={lookups.topics ?? []} />}

              {exercise && (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label={tr('Bài học đã xuất bản')}>
                    <CustomSelect
                      value={data.lessonId ? String(data.lessonId) : ''}
                      disabled={readOnly}
                      onChange={(value) => {
                        const lesson = lessons.data?.find((item) => item.id === Number(value));
                        setData((previous) => ({
                          ...previous,
                          lessonId: lesson?.id ?? null,
                          lessonTitle: lesson?.title ?? previous.lessonTitle,
                        }));
                      }}
                      placeholder={tr('Chọn bài học đã duyệt')}
                      options={[
                        { value: '', label: tr('Nhập tên bài học đang chờ duyệt') },
                        ...(lessons.data || []).map((l) => ({ value: String(l.id), label: tr(l.title) })),
                      ]}
                    />
                  </Field>
                  {!data.lessonId && (
                    <DynamicField
                      definition={{ key: 'lessonTitle', label: 'Tên bài học đang chờ duyệt', kind: 'text', required: true }}
                      data={data}
                      change={change}
                    />
                  )}
                  {lessons.isError && (
                    <div className="sm:col-span-2">
                      <ContextualErrorState
                        variant="inline"
                        compact
                        error={lessons.error}
                        title={tr('Chưa tải được bài học đã xuất bản')}
                        onRetry={() => lessons.refetch()}
                        retrying={lessons.isFetching}
                      />
                    </div>
                  )}
                </div>
              )}

              {(type === 'Lesson' || type === 'Vocabulary' || type === 'Kanji') && (
                <AudioUploadField data={data} change={change} error={submitted ? fieldValidationErrors.audioUrl : undefined} />
              )}

              {type === 'Kanji' && data.strokeOrderImageUrl && isValidHttpUrl(data.strokeOrderImageUrl) && (
                <div className="pt-1">
                  <p className="mb-1 text-xs font-medium text-rp-text-muted">{tr('Xem trước ảnh thứ tự nét')}</p>
                  <img
                    src={data.strokeOrderImageUrl}
                    alt={data.character || 'Kanji'}
                    className="h-24 rounded-xl border border-rp-line bg-white p-1.5 object-contain"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Group 3: Questions / MockTest Sections */}
          {exercise && (
            <Card className="space-y-3 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
                {tr('Danh sách câu hỏi bài luyện tập')}
              </h3>
              <QuestionsEditor rows={data.questions ?? []} onChange={(value) => change('questions', value)} />
            </Card>
          )}

          {type === 'MockTest' && (
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
                  {tr('Cấu trúc phần thi & câu hỏi')}
                </h3>
                {levelSections.length > 0 && (
                  <span className="text-xs text-rp-text-muted">
                    {tr('Cấu hình Quản trị viên')}: {levelSections.map((s) => `${s.name}${s.durationMinutes ? ` (${s.durationMinutes}p)` : ''}`).join(' · ')}
                  </span>
                )}
              </div>

              {data.certificateLevelId && levelSections.length === 0 && (
                <Banner tone="warning" title={tr('Chưa có phần thi cho cấp độ này')}>
                  {tr('Quản trị viên chưa cấu hình Phần thi cho cấp độ đã chọn. Vui lòng chọn cấp độ khác hoặc nhờ Quản trị viên bổ sung Phần thi.')}
                </Banner>
              )}

              <RepeaterRows
                rows={data.sections ?? []}
                onChange={(value) => change('sections', value)}
                name="Phần thi"
                create={newMockSection}
                movable
                render={(section, update) => (
                  <div className="space-y-4">
                    <div className="grid gap-3.5 sm:grid-cols-3">
                      <DynamicField
                        definition={{ key: 'title', label: 'Tên phần thi', kind: 'text', required: true }}
                        data={section}
                        change={update}
                      />
                      <Field label={tr('Phần thi theo cấu hình')} required>
                        <CustomSelect
                          value={section.certificateSectionCode || ''}
                          disabled={readOnly}
                          onChange={(value) => update('certificateSectionCode', value)}
                          placeholder={tr('Chọn phần thi')}
                          options={levelSections.map((item) => ({
                            value: item.code,
                            label: `${item.name} (${item.code})`,
                          }))}
                        />
                      </Field>
                      <Field label={tr('Kỹ năng')} required>
                        <CustomSelect
                          value={section.languageSkillId ? String(section.languageSkillId) : ''}
                          disabled={readOnly}
                          onChange={(value) => update('languageSkillId', Number(value))}
                          placeholder={tr('Chọn kỹ năng')}
                          options={skills}
                        />
                      </Field>
                    </div>

                    <div className="space-y-2 border-t border-rp-line/60 pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">
                        {tr('Câu hỏi trong phần thi')}
                      </h4>
                      <QuestionsEditor
                        rows={section.questions ?? []}
                        onChange={(value) => update('questions', value)}
                        mock
                      />
                    </div>
                  </div>
                )}
              />
            </Card>
          )}
        </fieldset>
      )}

      {(formError || save.isError || saveAndSubmit?.isError) && (
        <Banner tone="danger" title={tr('Chưa thể lưu nội dung')}>
          {formError || describeApiError(save.error || saveAndSubmit?.error).message}
        </Banner>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rp-line pt-4">
        <Button variant="ghost" onClick={close} disabled={busySaving}>
          {readOnly ? tr('Đóng') : tr('Hủy')}
        </Button>
        {!readOnly && (
          <>
            <Button
              type="submit"
              variant="outline"
              icon={CheckCircle2}
              loading={save.isPending}
              disabled={busySaving}
            >
              {tr('Lưu bản nháp')}
            </Button>
            {saveAndSubmit && (
              <Button
                variant="primary"
                icon={Send}
                loading={saveAndSubmit.isPending}
                disabled={busySaving}
                onClick={() => handleSave(true)}
              >
                {tr('Lưu & gửi duyệt')}
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  );
}

export function ManualContentWorkspace({ heading = 'Biên soạn nội dung', pageName, children, examOnly = false, fixedType }) {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramType = searchParams.get('type');
  const paramEditId = searchParams.get('editId');

  const [selectedType, setType] = useState(() => (paramType && definitions[paramType] ? paramType : 'Lesson'));
  const type = fixedType ?? (examOnly ? 'MockTest' : selectedType);
  const [authoringMode, setAuthoringMode] = useState(() =>
    examOnly || fixedType || paramType || paramEditId ? 'legacy' : 'skill-studio',
  );

  const [activeLevel, setActiveLevel] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_desc');

  const [editor, setEditor] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formDirty, setFormDirty] = useState(false);

  useEffect(() => {
    if (!formDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [formDirty]);

  const queryClient = useQueryClient();
  const listPrefix = ['manual-content-items', user?.userId, type];
  const listKey = [...listPrefix, approvalFilter];

  const list = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) =>
      api.get(`${endpoint}/items/${type}`, {
        params: approvalFilter ? { status: approvalFilter } : undefined,
        signal,
      }),
    refetchInterval: 20000,
    refetchOnWindowFocus: 'always',
  });

  const lookupsQuery = useAuthorLookups();
  const levels = lookupsQuery.levels;
  const activeLevelObj = activeLevel === 'ALL' ? null : levels.find((l) => String(l.id) === String(activeLevel));
  const defaultCreateLevelId = activeLevelObj?.id ?? levels[0]?.id ?? null;

  // Resolve the deep link once its list row is available, then remove the consumed URL parameter.
  const [handledEditId, setHandledEditId] = useState(null);
  if (paramEditId && paramEditId !== handledEditId && Array.isArray(list.data)) {
    const match = list.data.find((x) => Number(x.id) === Number(paramEditId));
    if (match) {
      setEditor(match);
      setHandledEditId(paramEditId);
    }
  }
  useEffect(() => {
    if (paramEditId && handledEditId === paramEditId) {
      const next = new URLSearchParams(searchParams);
      next.delete('editId');
      setSearchParams(next, { replace: true });
    }
  }, [paramEditId, handledEditId, searchParams, setSearchParams]);

  const visibleItems = useMemo(() => {
    const raw = Array.isArray(list.data) ? list.data : [];
    const q = searchTerm.trim().toLowerCase();
    const filtered = raw.filter((item) => {
      if (activeLevel !== 'ALL' && String(item.certificateLevelId) !== String(activeLevel)) return false;
      if (!q) return true;
      return (
        String(item.rowKey || '').toLowerCase().includes(q)
        || String(item.topicTitle || '').toLowerCase().includes(q)
        || String(item.sourceFileName || '').toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title_asc') return String(a.rowKey || '').localeCompare(String(b.rowKey || ''));
      const da = new Date(a.updatedAt || a.submittedAt || 0).getTime();
      const db = new Date(b.updatedAt || b.submittedAt || 0).getTime();
      return db - da || (b.id - a.id);
    });
  }, [list.data, activeLevel, searchTerm, sortBy]);

  const detail = useQuery({
    queryKey: ['manual-content-detail', user?.userId, editor?.id],
    queryFn: async () => normalizeKeys((await api.get(`${endpoint}/items/detail/${editor.id}`)).result),
    enabled: Boolean(editor?.id),
  });

  const previewDetail = useQuery({
    queryKey: ['manual-content-preview', user?.userId, previewItem?.id],
    queryFn: async () => normalizeKeys((await api.get(`${endpoint}/items/detail/${previewItem.id}`)).result),
    enabled: Boolean(previewItem?.id),
  });

  const invalidateAll = async (savedId) => {
    await Promise.all([
      savedId ? queryClient.invalidateQueries({ queryKey: ['manual-content-detail', user?.userId, savedId] }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: listPrefix }),
      queryClient.invalidateQueries({ queryKey: ['my-content-approvals'] }),
      queryClient.invalidateQueries({ queryKey: ['author-import-batches'] }),
      invalidateSidebarCounters(queryClient),
    ]);
  };

  const save = useMutation({
    mutationFn: async (data) => {
      notify.loading('Đang lưu bản nháp nội dung…', '', { key: 'manual-content-save', maxWaitMs: 30000 });
      const response = editor?.id
        ? await api.put(`${endpoint}/items/${type}/${editor.id}`, data)
        : await api.post(`${endpoint}/items/${type}`, data);
      return { id: response.result, levelId: data.certificateLevelId };
    },
    onSuccess: async (saved) => {
      setEditor(null);
      notify.success('Đã lưu bản nháp.', 'Bạn có thể xem trước hoặc gửi duyệt từ danh sách.', {
        key: 'manual-content-save',
        replace: true,
      });
      await invalidateAll(saved.id);
    },
    onError: (err) => notify.apiError(err, 'Chưa lưu được bản nháp', { key: 'manual-content-save', replace: true }),
  });

  const saveAndSubmit = useMutation({
    mutationFn: async (data) => {
      notify.loading('Đang lưu và gửi duyệt nội dung…', '', { key: 'manual-content-save', maxWaitMs: 30000 });
      const response = editor?.id
        ? await api.put(`${endpoint}/items/${type}/${editor.id}`, data)
        : await api.post(`${endpoint}/items/${type}`, data);
      const id = response.result;
      await api.post(`${endpoint}/items/${id}/submit`);
      return { id, levelId: data.certificateLevelId };
    },
    onSuccess: async (saved) => {
      setEditor(null);
      notify.success('Đã lưu và gửi Quản trị viên xét duyệt.', '', { key: 'manual-content-save', replace: true });
      await invalidateAll(saved.id);
    },
    onError: (err) => notify.apiError(err, 'Chưa gửi được nội dung để duyệt', { key: 'manual-content-save', replace: true }),
  });

  const send = useMutation({
    mutationFn: async (id) => {
      await api.post(`${endpoint}/items/${id}/submit`);
      return id;
    },
    onSuccess: async (id) => {
      notify.success('Đã gửi nội dung để Quản trị viên xét duyệt.', '', { key: `manual-content-submit-${id}` });
      await invalidateAll(id);
    },
    onError: (err) => notify.apiError(err, 'Không gửi được nội dung để duyệt', { key: 'manual-content-submit-err' }),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}/items/${id}`),
    onSuccess: async (_, id) => {
      setDeleteTarget(null);
      notify.success('Đã xóa bản nháp.');
      await invalidateAll(id);
    },
    onError: (err) => {
      setDeleteTarget(null);
      notify.apiError(err, 'Không xóa được bản nháp');
    },
  });

  async function openEditor(item) {
    if (save.isPending || saveAndSubmit.isPending || send.isPending) return;
    if (formDirty && editor !== item) {
      const ok = await confirmAction({
        title: 'Chưa lưu thay đổi?',
        description: 'Nội dung bạn đang soạn hoặc chỉnh sửa chưa được lưu bản nháp.',
        confirmLabel: 'Bỏ thay đổi',
        tone: 'warning',
      });
      if (!ok) return;
    }
    save.reset();
    saveAndSubmit.reset();
    send.reset();
    setEditor(item);
  }

  function handleOpenCreate() {
    if (!defaultCreateLevelId) return;
    const defaultSections = lookupsQuery.sectionsForLevel(defaultCreateLevelId);
    openEditor({
      initial: {
        certificateLevelId: defaultCreateLevelId,
        ...(type === 'MockTest'
          ? {
              timeLimitMinutes: defaultSections.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0) || 45,
              sections: defaultSections.length > 0
                ? defaultSections.map((s) =>
                    withRowId({
                      title: s.name,
                      certificateSectionCode: s.code,
                      questions: [newQuestion()],
                    }),
                  )
                : [withRowId(newMockSection())],
            }
          : {}),
      },
    });
  }

  const columns = [
    {
      key: 'rowKey',
      header: tr('Nội dung'),
      render: (row) => {
        const lvl = lookupsQuery.levelById.get(Number(row.certificateLevelId));
        return (
          <div className="min-w-[200px]">
            <p className="rp-jp font-semibold text-rp-text">{row.rowKey}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-rp-text-muted">
              {lvl && <span>{lvl.certificate} · {lvl.code}</span>}
              {row.topicTitle && <span>· {row.topicTitle}</span>}
              {row.sourceFileName && <span>· {row.sourceFileName}</span>}
            </div>
            {row.reviewNote && (
              <p className="mt-1 text-xs font-medium text-rp-danger">{trf('Phản hồi Quản trị viên: {0}', { 0: row.reviewNote })}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'certificateLevelId',
      header: tr('Cấp độ'),
      render: (row) => (
        <Badge tone="neutral" size="sm" icon={false}>
          {row.certificateLevelCode || lookupsQuery.levelById.get(Number(row.certificateLevelId))?.code || '—'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (row) => (
        <Badge tone={STATUS_BADGE_TONES[row.status] || 'neutral'} size="sm" icon={false}>
          {tr(statuses[row.status]?.label ?? row.status)}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: tr('Cập nhật'),
      render: (row) => (
        <span className="text-xs text-rp-text-2">
          {row.updatedAt ? formatVnDateTime(row.updatedAt) : '—'}
        </span>
      ),
    },
  ];

  const hasFilters = activeLevel !== 'ALL' || searchTerm.trim() !== '' || approvalFilter !== '';
  const hasListData = Array.isArray(list.data) && list.data.length > 0;
  const showFilterControls = hasListData || hasFilters;
  const showToolbar = !examOnly && !fixedType
    ? true
    : showFilterControls;
  const handleRefresh = () => Promise.all([
    list.refetch({ cancelRefetch: true }),
    lookupsQuery.isError ? lookupsQuery.refetch({ cancelRefetch: true }) : Promise.resolve(),
  ]);
  const isRefreshing = (list.isFetching || lookupsQuery.isFetching) && !list.isPending && !lookupsQuery.isPending;

  return (
    <PageContainer as="div" data-page={pageName} width="default" className="space-y-5">
      <PageHeader
        eyebrow={tr('Biên soạn học liệu')}
        title={
          <span className="inline-flex items-center gap-2.5">
            <FeatureIcon feature={examOnly ? 'mock' : fixedType === 'Lesson' ? 'lesson' : 'writing'} size="lg" />
            <span>{tr(heading)}</span>
          </span>
        }
        description={
          examOnly
            ? tr('Soạn đề thi thử theo từng phần thi Quản trị viên đã cấu hình, xem trước và gửi duyệt.')
            : fixedType === 'Lesson'
              ? tr('Tạo, chỉnh sửa bài học theo từng chứng chỉ và cấp độ (N5–N1), gắn chủ đề và tệp âm thanh.')
              : tr('Soạn thảo bài học, từ vựng, Hán tự, ngữ pháp, bài tập và đề thi; lưu bản nháp hoặc gửi duyệt.')
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/bulk-import/?view=history"
              className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text-2 hover:border-rp-brand-border"
            >
              <History className="h-4 w-4" />
              <span>{tr('Lịch sử nhập liệu')}</span>
            </Link>
            <Link
              to="/bulk-import/"
              className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text-2 hover:border-rp-brand-border"
            >
              <FolderUp className="h-4 w-4" />
              <span>{tr('Nhập Excel')}</span>
            </Link>
            {authoringMode === 'legacy' && (
              <Button
                icon={Plus}
                disabled={!defaultCreateLevelId || save.isPending || send.isPending}
                onClick={handleOpenCreate}
                data-testid="create-author-item-btn"
              >
                {examOnly ? tr('Thêm đề thi') : fixedType === 'Lesson' ? tr('Thêm bài học') : tr('Tạo học liệu')}
              </Button>
            )}
          </div>
        }
      />

      {!examOnly && !fixedType && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            variant="pill"
            value={authoringMode}
            onChange={setAuthoringMode}
            tabs={[
              { value: 'skill-studio', label: tr('Soạn câu hỏi 5 kỹ năng + AI'), icon: Sparkles },
              { value: 'legacy', label: tr('Soạn giáo trình / Luyện tập') },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/question-bank"
              className="rp-focus inline-flex h-9 items-center rounded-rp-input border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text-2 hover:border-rp-brand-border"
            >
              {tr('Mở Ngân hàng câu hỏi')}
            </Link>
            <Link
              to="/exam-builder"
              className="rp-focus inline-flex h-9 items-center rounded-rp-input border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text-2 hover:border-rp-brand-border"
            >
              {tr('Mở Trình tạo đề thi')}
            </Link>
          </div>
        </div>
      )}

      {!examOnly && !fixedType && authoringMode === 'skill-studio' ? (
        <SkillQuestionEditor
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['question-bank-v2'] })}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ['question-bank-v2'] });
            queryClient.invalidateQueries({ queryKey: ['my-content-approvals'] });
          }}
        />
      ) : (
        <>
      {children}

      {showToolbar && (
        <UnifiedToolbar
          search={
            showFilterControls
              ? {
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  onClear: () => setSearchTerm(''),
                  placeholder: 'Tìm theo tên, chủ đề hoặc tên tệp…',
                  ariaLabel: 'Tìm kiếm học liệu',
                  className: 'sm:max-w-[220px]',
                }
              : undefined
          }
          filters={
            <>
              {!examOnly && !fixedType && (
                <CustomSelect
                  fitContent
                  size="sm"
                  value={type}
                  aria-label={tr('Loại học liệu')}
                  onChange={(value) => {
                    if (save.isPending || send.isPending) return;
                    setType(value);
                    openEditor(null);
                  }}
                  options={Object.entries(definitions).map(([value, item]) => ({
                    value,
                    label: tr(item.label),
                  }))}
                />
              )}

              {showFilterControls && (
                <>
                  <CustomSelect
                    fitContent
                    size="sm"
                    value={String(activeLevel)}
                    aria-label={tr('Lọc theo cấp độ')}
                    onChange={(val) => {
                      setActiveLevel(val);
                      openEditor(null);
                    }}
                    options={[
                      { value: 'ALL', label: tr('Tất cả cấp độ') },
                      ...levels.map((lvl) => ({
                        value: String(lvl.id),
                        label: `${lvl.certificate} · ${lvl.code}`,
                      })),
                    ]}
                  />

                  <CustomSelect
                    fitContent
                    size="sm"
                    value={approvalFilter}
                    aria-label={tr('Lọc theo trạng thái duyệt')}
                    onChange={setApprovalFilter}
                    options={[
                      { value: '', label: tr('Tất cả trạng thái') },
                      ...Object.entries(statuses).map(([value, s]) => ({ value, label: tr(s.label) })),
                    ]}
                  />

                  <CustomSelect
                    fitContent
                    size="sm"
                    value={sortBy}
                    aria-label={tr('Sắp xếp danh sách')}
                    onChange={setSortBy}
                    options={[
                      { value: 'updated_desc', label: tr('Mới cập nhật') },
                      { value: 'title_asc', label: tr('Tên A–Z') },
                    ]}
                  />
                </>
              )}
            </>
          }
          actions={
            hasFilters ? (
              <Button
                size="sm"
                variant="ghost"
                icon={X}
                onClick={() => {
                  setActiveLevel('ALL');
                  setSearchTerm('');
                  setApprovalFilter('');
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null
          }
          refresh={{
            onRefresh: handleRefresh,
            refreshing: isRefreshing,
            disabled: list.isPending || lookupsQuery.isPending,
          }}
        />
      )}

      {(lookupsQuery.isError || detail.isError) && (
        <Card>
          <ContextualErrorState
            compact
            error={lookupsQuery.error || detail.error}
            title={
              lookupsQuery.isError
                ? tr('Chưa tải được danh mục cấp độ và kỹ năng')
                : tr('Chưa tải được chi tiết mục đang sửa')
            }
            onRetry={() => (lookupsQuery.isError ? lookupsQuery.refetch() : detail.refetch())}
            retrying={lookupsQuery.isFetching || detail.isFetching}
          />
        </Card>
      )}

      <DataRefreshBoundary
        loading={(list.isPending || lookupsQuery.isPending) && !list.data}
        refreshing={isRefreshing}
        error={list.isError ? list.error : null}
        hasData={hasListData}
        context="data"
        loadingLabel={tr('Đang tải danh sách học liệu…')}
        errorTitle={tr('Chưa tải được danh sách học liệu')}
        onRetry={() => list.refetch()}
      >
        <DataTable
          columns={columns}
          rows={visibleItems}
          pageSize={10}
          itemLabel={tr('học liệu')}
          caption={tr(heading)}
          empty={
            <ContextualEmptyState
              variant={hasFilters ? 'search' : 'compact'}
              illustration={hasFilters ? 'search' : 'book'}
              title={
                hasFilters
                  ? tr('Không tìm thấy học liệu phù hợp bộ lọc.')
                  : trf('Chưa có {0} nào trong danh sách của bạn.', {
                      0: tr(definitions[type]?.label || 'học liệu').toLowerCase(),
                    })
              }
              description={
                hasFilters
                  ? tr('Thử đổi cấp độ, xóa từ khóa hoặc chuyển sang trạng thái khác.')
                  : tr('Nhấn nút tạo mới để soạn bản nháp đầu tiên hoặc nhập hàng loạt từ Excel.')
              }
              actionLabel={hasFilters ? tr('Xóa bộ lọc') : tr('Tạo học liệu')}
              onAction={() => {
                if (hasFilters) {
                  setActiveLevel('ALL');
                  setSearchTerm('');
                  setApprovalFilter('');
                } else {
                  handleOpenCreate();
                }
              }}
            />
          }
          rowActions={(row) => (
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
              <Button size="sm" variant="ghost" icon={Eye} onClick={() => setPreviewItem(row)}>
                {tr('Xem trước')}
              </Button>
              <Button size="sm" variant="outline" icon={row.status === 'PendingReview' ? Eye : Pencil} onClick={() => openEditor(row)}>
                {row.status === 'PendingReview' ? tr('Xem') : row.status === 'Approved' ? tr('Tạo bản sửa') : tr('Sửa')}
              </Button>
              {row.status === 'Draft' && (
                <Button
                  size="sm"
                  icon={Send}
                  disabled={send.isPending || editor?.id === row.id}
                  onClick={() => send.mutate(row.id)}
                >
                  {tr('Gửi duyệt')}
                </Button>
              )}
              {(row.status === 'Draft' || row.status === 'Rejected') && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  label={tr('Xóa bản nháp')}
                  onClick={() => setDeleteTarget(row)}
                />
              )}
            </div>
          )}
        />
      </DataRefreshBoundary>

      {/* Editor Modal */}
      <Modal
        open={Boolean(editor)}
        onClose={() => openEditor(null)}
        title={editor?.id ? tr('Chỉnh sửa mục học liệu') : tr('Tạo mục học liệu mới')}
        size="xl"
      >
        {editor && lookupsQuery.data && (editor.id ? (
          detail.data ? (
            <ContentForm
              key={editor.id}
              type={type}
              record={editor}
              latestRecord={list.data?.find((x) => x.id === editor.id)}
              initial={detail.data}
              lookups={lookupsQuery.data}
              save={save}
              saveAndSubmit={saveAndSubmit}
              close={() => openEditor(null)}
              onDirtyChange={setFormDirty}
            />
          ) : (
            detail.isPending && <SakuraLoader variant="section" context="lesson" delay={140} />
          )
        ) : (
          <ContentForm
            key={type}
            type={type}
            initial={editor.initial ?? {}}
            lookups={lookupsQuery.data}
            save={save}
            saveAndSubmit={saveAndSubmit}
            close={() => openEditor(null)}
            onDirtyChange={setFormDirty}
          />
        ))}
      </Modal>

      {/* Quick Preview Modal */}
      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={previewItem ? `${tr('Xem trước')}: ${previewItem.rowKey}` : ''}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            {previewItem && previewItem.status !== 'PendingReview' && (
              <Button
                variant="outline"
                icon={Pencil}
                onClick={() => {
                  const target = previewItem;
                  setPreviewItem(null);
                  openEditor(target);
                }}
              >
                {tr('Chỉnh sửa')}
              </Button>
            )}
            <Button onClick={() => setPreviewItem(null)}>{tr('Đóng')}</Button>
          </div>
        }
      >
        {previewDetail.isPending ? (
          <SakuraLoader variant="section" context="lesson" delay={120} />
        ) : previewDetail.isError ? (
          <ContextualErrorState compact error={previewDetail.error} title={tr('Chưa tải được bản xem trước')} onRetry={() => previewDetail.refetch()} />
        ) : previewDetail.data ? (
          <ContentPreviewPanel type={previewItem.entityType || type} data={previewDetail.data} lookups={lookupsQuery.lookups} />
        ) : null}
      </Modal>

      {/* Delete Draft Confirm */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && del.mutate(deleteTarget.id)}
        loading={del.isPending}
        tone="danger"
        title={tr('Xóa bản nháp này?')}
        description={deleteTarget ? trf('Bản nháp "{0}" sẽ bị xóa khỏi danh sách chưa gửi duyệt.', { 0: deleteTarget.rowKey }) : ''}
        confirmLabel={tr('Xóa bản nháp')}
      />
        </>
      )}
    </PageContainer>
  );
}

export default function ManualContentPage() {
  const { tr } = useLocale();
  return (
    <ContentAuthorShell breadcrumb={tr('Biên soạn nội dung')}>
      <ManualContentWorkspace />
    </ContentAuthorShell>
  );
}
