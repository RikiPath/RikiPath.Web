import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { uploadListeningAudio } from '../../api/contentImportApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { CmsShell } from '../../components/shells';
import { AUTHOR_LEVELS } from './authorLevels.js';

const endpoint = '/content-author/manual';
const inputClass = 'w-full rounded-lg border border-[#E7D7DF] bg-white px-3 py-2 text-sm';
const actionClass = 'rounded-lg border border-[#E7D7DF] px-3 py-2 text-sm font-semibold text-[#9E2A4B] disabled:opacity-50';
const field = (key, label, kind = 'text', required = false) => ({ key, label, kind, required });
const title = field('title', 'Tên', 'text', true);
const description = field('description', 'Mô tả', 'textarea');
const sort = field('sortOrder', 'Thứ tự', 'number');
const meaning = field('meaning', 'Nghĩa tiếng Việt', 'textarea', true);
const example = [field('exampleSentence', 'Câu ví dụ'), field('exampleSentenceMeaning', 'Nghĩa câu ví dụ')];
const lessonLink = field('lessonTitle', 'Tên bài học liên kết');
const definitions = {
  Lesson: { label: 'Bài học', fields: [title, description, sort] },
  Vocabulary: { label: 'Từ vựng', fields: [field('word', 'Từ', 'text', true), field('reading', 'Cách đọc', 'text', true), meaning, ...example, field('audioUrl', 'URL âm thanh', 'url'), lessonLink] },
  Kanji: { label: 'Hán tự', fields: [field('character', 'Hán tự', 'text', true), meaning, field('sinoVietnamese', 'Âm Hán Việt'), field('onYomi', 'Âm On'), field('kunYomi', 'Âm Kun'), field('strokeCount', 'Số nét', 'number', true), field('strokeOrderImageUrl', 'URL ảnh thứ tự nét', 'url'), field('audioUrl', 'URL âm thanh', 'url'), lessonLink] },
  Grammar: { label: 'Ngữ pháp', fields: [title, field('structure', 'Cấu trúc', 'text', true), field('usageNotes', 'Cách dùng', 'textarea'), ...example, lessonLink] },
  PracticeExercise: { label: 'Bài luyện tập', fields: [title, description, sort] },
  MockTest: { label: 'Đề thi thử', fields: [title, description, field('timeLimitMinutes', 'Thời lượng (phút)', 'number', true)] },
};
export const statuses = {
  Draft: { label: 'Bản nháp', style: 'bg-stone-100 text-stone-700' },
  PendingReview: { label: 'Chờ Admin duyệt', style: 'bg-amber-100 text-amber-900' },
  Approved: { label: 'Đã duyệt', style: 'bg-emerald-100 text-emerald-800' },
  Rejected: { label: 'Bị từ chối', style: 'bg-rose-100 text-rose-800' },
};
const orderingType = 'Ordering';
const emptyOrderingParts = [{ uiId: 'first', text: '' }, { uiId: 'second', text: '' }];
const questionTypes = {
  SingleChoice: 'Một đáp án', MultipleChoice: 'Nhiều đáp án', Listening: 'Nghe hiểu', Reading: 'Đọc hiểu', VisualMultipleChoice: 'Trắc nghiệm hình ảnh',
  [orderingType]: 'Sắp xếp câu', FillBlank: 'Điền chỗ trống', Matching: 'Ghép cặp', ShortAnswer: 'Trả lời ngắn',
};
const optionTypes = new Set(['SingleChoice', 'MultipleChoice', 'Listening', 'Reading', 'VisualMultipleChoice']);

export function normalizeKeys(value) {
  if (Array.isArray(value)) return value.map(withRowId);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    const name = key.charAt(0).toLowerCase() + key.slice(1);
    return [name, name === 'interactionData' || name === 'answerKey' ? child : normalizeKeys(child)];
  }));
}

function withRowId(row) {
  const item = { ...normalizeKeys(row), uiId: crypto.randomUUID() };
  if (item.questionType?.toLowerCase() === 'ordering') {
    item.questionType = orderingType;
    if (Array.isArray(item.answerKey) && item.answerKey.every(token => typeof token === 'string')) {
      item.orderingParts = item.answerKey.map(text => ({ text, uiId: crypto.randomUUID() }));
    }
  }
  return item;
}

function updateField(data, key, value) {
  return { ...data, [key]: typeof value === 'function' ? value(data[key] ?? []) : value };
}

function Field({ definition, data, change }) {
  const { key, label, kind, required } = definition;
  const props = {
    className: inputClass, required, value: data[key] ?? '',
    onChange: event => change(key, kind === 'number' ? (event.target.value === '' ? undefined : Number(event.target.value)) : event.target.value),
  };
  return <label className="block space-y-1 text-sm font-medium">
    <span>{label}</span>
    {kind === 'textarea' ? <textarea {...props} rows={3} /> : <input {...props} type={kind} min={kind === 'number' ? (required ? 1 : 0) : undefined} />}
  </label>;
}

function Select({ label, value, change, items }) {
  return <label className="block space-y-1 text-sm font-medium">
    <span>{label}</span>
    <select className={inputClass} value={value ?? ''} onChange={event => change(event.target.value)} required>
      <option value="">Chọn {label.toLowerCase()}</option>
      {items.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </label>;
}

function AudioField({ data, change }) {
  const upload = useMutation({
    mutationFn: uploadListeningAudio,
    onSuccess: result => change('audioUrl', result.url),
  });
  return <div className="space-y-1">
    <Field definition={field('audioUrl', 'URL MP3')} data={data} change={change} />
    <label className="block text-sm">Hoặc tải MP3 lên
      <input className="ml-2 max-w-full" type="file" accept=".mp3,audio/mpeg" disabled={upload.isPending}
        onChange={event => {
          const file = event.target.files[0];
          if (file) upload.mutate(file);
          event.target.value = '';
        }} />
    </label>
    {upload.isPending && <p role="status" className="text-sm">Đang tải MP3…</p>}
    {upload.isError && <p role="alert" className="text-sm text-rose-700">{upload.error.message}</p>}
  </div>;
}

function Rows({ rows, onChange, name, create, render, movable = false }) {
  function move(index, offset) {
    onChange(items => {
      const next = [...items];
      const target = index + offset;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return <div className="space-y-3">
    {rows.map((row, index) => <div key={row.uiId} className="space-y-3 rounded-lg border border-[#EADFE5] p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">{name} {index + 1}</strong>
        <div className="flex flex-wrap items-center gap-2">
          {movable && [-1, 1].map(offset => <button key={offset} type="button" className={actionClass}
            disabled={index + offset < 0 || index + offset >= rows.length}
            aria-label={`Chuyển ${name.toLowerCase()} ${index + 1} ${offset < 0 ? 'lên' : 'xuống'}`}
            onClick={() => move(index, offset)}>{offset < 0 ? 'Lên' : 'Xuống'}</button>)}
          <button type="button" className="text-sm text-rose-700 underline"
            onClick={() => onChange(items => items.filter(item => item.uiId !== row.uiId))}>Bỏ {name.toLowerCase()} {index + 1}</button>
        </div>
      </div>
      {render(row, (key, value) => onChange(items => items.map(item =>
        item.uiId === row.uiId ? updateField(item, key, value) : item)))}
    </div>)}
    <button type="button" className={actionClass} onClick={() => {
      const item = withRowId(create());
      onChange(items => [...items, item]);
    }}>Thêm {name.toLowerCase()}</button>
  </div>;
}

function newQuestion() {
  return { questionType: 'SingleChoice', options: [{ isCorrect: false }, { isCorrect: false }] };
}

function newMockSection() {
  return { questions: [newQuestion()] };
}

function OrderingFields({ parts, change }) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-semibold">Các cụm từ theo thứ tự đúng</legend>
    <p className="text-sm text-[#826773]">Nhập ít nhất 2 cụm từ theo thứ tự của câu hoàn chỉnh. Hệ thống sẽ đảo thứ tự khi hiển thị cho người học.</p>
    <Rows rows={parts} onChange={update => change('orderingParts', current => update(current))}
      name="Cụm từ" create={() => ({ text: '' })} movable
      render={(part, update) => <Field definition={field('text', 'Nội dung cụm từ', 'text', true)}
        data={part} change={update} />} />
  </fieldset>;
}

function QuestionFormat({ question, change, formats }) {
  const data = question.interactionData && typeof question.interactionData === 'object' ? question.interactionData : {};
  const format = formats.find(item => item.code === data.jlptItemType);
  const composition = data.jlptItemType === 'SentenceComposition';
  const hasPassage = format?.skill === 'Reading' || format?.code === 'TextGrammar' || question.questionType === 'Reading';
  const listening = format?.skill === 'Listening' || question.questionType === 'Listening';

  function selectFormat(code) {
    const selected = formats.find(item => item.code === code);
    const next = { ...data };
    if (selected) next.jlptItemType = selected.code;
    else delete next.jlptItemType;
    if (selected?.code === 'SentenceComposition') {
      next.starPosition ??= 2;
      change('questionType', orderingType);
      if ((question.orderingParts?.length ?? 0) < 4) {
        change('orderingParts', Array.from({ length: 4 }, (_, index) =>
          question.orderingParts?.[index] ?? { uiId: crypto.randomUUID(), text: '' }));
      }
    } else if (selected) {
      delete next.starPosition;
      change('questionType', question.questionType === 'VisualMultipleChoice' ? 'VisualMultipleChoice'
        : selected.skill === 'Listening' ? 'Listening' : selected.skill === 'Reading' ? 'Reading' : 'SingleChoice');
    }
    if (selected && selected.skill !== 'Listening') delete next.optionsInAudio;
    change('interactionData', next);
  }

  function changeData(key, value) {
    change('interactionData', { ...data, [key]: value });
  }

  return <fieldset className="space-y-2">
    <label className="block space-y-1 text-sm font-medium">
      <span>Dạng bài JLPT trong phần này</span>
      <select className={inputClass} value={data.jlptItemType ?? ''} onChange={event => selectFormat(event.target.value)}>
        <option value="">Chưa phân loại theo JLPT</option>
        {data.jlptItemType && !format && <option value={data.jlptItemType}>{data.jlptItemType} · kiểm tra cấp độ hoặc kỹ năng</option>}
        {formats.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
    {composition && <Field definition={field('starPosition', 'Vị trí dấu ★ (1–4)', 'number', true)}
      data={data} change={changeData} />}
    {hasPassage && <Field definition={field('passage', 'Đoạn văn hoặc ngữ liệu', 'textarea')}
      data={data} change={changeData} />}
    {format?.code === 'ReadingIntegrated' && <Field definition={field('secondPassage', 'Văn bản thứ hai', 'textarea')}
      data={data} change={changeData} />}
    {listening && <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={Boolean(data.optionsInAudio)} onChange={event => {
        if (event.target.checked) change('questionType', 'Listening');
        changeData('optionsInAudio', event.target.checked);
      }} />
      Phát lựa chọn trong audio, chỉ hiển thị số
    </label>}
  </fieldset>;
}

function Questions({ rows, onChange, mock, formats = [] }) {
  return <Rows rows={rows} onChange={onChange} name="Câu hỏi" create={newQuestion}
    render={(question, change) => <>
      {mock && <QuestionFormat question={question} change={change} formats={formats} />}
      {mock && <Select label="Dạng câu" value={question.questionType || 'SingleChoice'}
        change={value => {
          change('questionType', value);
          if (value === orderingType && !question.orderingParts) change('orderingParts', emptyOrderingParts);
        }}
        items={Object.entries(questionTypes).map(([value, label]) => ({ value, label }))} />}
      <Field definition={field('questionText', 'Nội dung câu hỏi', 'textarea', !mock || !question.imageUrl)} data={question} change={change} />
      {mock && question.questionType === orderingType
        ? <OrderingFields parts={question.orderingParts ?? []} change={change} />
        : mock && !optionTypes.has(question.questionType || 'SingleChoice')
        ? ['interactionData', 'answerKey'].map((key, index) => <Field key={key}
            definition={field(key, index ? 'Đáp án có cấu trúc (JSON)' : 'Dữ liệu tương tác (JSON)', 'textarea', true)}
            data={{ [key]: typeof question[key] === 'string' ? question[key] : JSON.stringify(question[key], null, 2) }}
            change={change} />)
        : <Rows rows={question.options ?? []} onChange={value => change('options', value)} name="Lựa chọn"
            create={() => ({ isCorrect: false })}
            render={(option, update) => <>
              {!question.interactionData?.optionsInAudio && <>
                <Field definition={field('optionText', 'Nội dung lựa chọn', 'text', !mock || !option.imageUrl)} data={option} change={update} />
                {mock && option.imageUrl && <img loading="lazy" alt="Hình đáp án" className="max-h-28 max-w-full object-contain" src={option.imageUrl} />}
                {mock && <Field definition={field('imageUrl', 'URL ảnh đáp án', 'url')} data={option} change={update} />}
              </>}
              <label className="flex gap-2 text-sm">
                {question.questionType === 'MultipleChoice'
                  ? <input type="checkbox" checked={Boolean(option.isCorrect)}
                      onChange={event => update('isCorrect', event.target.checked)} />
                  : <input type="radio" name={'correct-' + question.uiId} required checked={Boolean(option.isCorrect)}
                      onChange={() => change('options', options => options.map(item =>
                        ({ ...item, isCorrect: item.uiId === option.uiId })))} />}
                Đáp án đúng
              </label>
            </>} />}
      {mock && <>
        {question.audioUrl && <audio controls preload="none" className="max-w-full" src={question.audioUrl} />}
        {question.imageUrl && <img loading="lazy" alt="Hình câu hỏi" className="max-h-48 max-w-full object-contain" src={question.imageUrl} />}
        <AudioField data={question} change={change} />
        <Field definition={field('imageUrl', 'URL ảnh câu hỏi', 'url')} data={question} change={change} />
      </>}
      <Field definition={field('explanation', 'Giải thích', 'textarea')} data={question} change={change} />
    </>} />;
}

function orderingTokens(answerKey, existingTokens) {
  const sortedAnswer = [...answerKey].sort();
  if (Array.isArray(existingTokens) && existingTokens.length === answerKey.length &&
      existingTokens.every(token => typeof token === 'string') &&
      [...existingTokens].sort().every((token, index) => token === sortedAnswer[index]) &&
      existingTokens.some((token, index) => token !== answerKey[index])) {
    return existingTokens;
  }

  const tokens = [...answerKey];
  for (let index = tokens.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [tokens[index], tokens[other]] = [tokens[other], tokens[index]];
  }
  if (tokens.every((token, index) => token === answerKey[index])) {
    const other = tokens.findIndex(token => token !== tokens[0]);
    if (other > 0) [tokens[0], tokens[other]] = [tokens[other], tokens[0]];
  }
  return tokens;
}

function serializeForm(type, data) {
  if (type !== 'MockTest') return data;
  return {
    ...data,
    sections: (data.sections ?? []).map(section => ({
      ...section,
      questions: (section.questions ?? []).map(({ orderingParts, ...question }) => {
        if (question.questionType === orderingType) {
          const answerKey = orderingParts.map(part => part.text.trim());
          const existing = question.interactionData;
          return {
            ...question, options: [], answerKey,
            interactionData: { ...existing, tokens: orderingTokens(answerKey, existing?.tokens) },
          };
        }
        if (optionTypes.has(question.questionType || 'SingleChoice')) {
          const metadata = question.interactionData;
          const interactionData = metadata && typeof metadata === 'object'
            ? Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'tokens' && key !== 'starPosition'))
            : null;
          const options = interactionData?.optionsInAudio
            ? question.options.map((option, index) => ({ ...option, optionText: String(index + 1), imageUrl: null }))
            : question.options;
          return { ...question, options, interactionData, answerKey: null };
        }
        return {
          ...question, options: [],
          interactionData: typeof question.interactionData === 'string' ? JSON.parse(question.interactionData) : question.interactionData,
          answerKey: typeof question.answerKey === 'string' ? JSON.parse(question.answerKey) : question.answerKey,
        };
      }),
    })),
  };
}

function LessonTopicField({ data, change, topics }) {
  const [choice, setChoice] = useState(() => data.topicId ? String(data.topicId) : data.topicTitle ? 'new' : '');
  const missingTopic = data.topicId && !topics.some(topic => topic.id === data.topicId);

  return <div className="space-y-2">
    <label className="block space-y-1 text-sm font-medium">
      <span>Chủ đề</span>
      <select className={inputClass} value={choice} onChange={event => {
        const value = event.target.value;
        setChoice(value);
        change('topicId', value && value !== 'new' ? Number(value) : null);
        change('topicTitle', value === '' ? '' : null);
      }}>
        <option value="">Chưa chọn chủ đề</option>
        <option value="new">Tạo chủ đề mới</option>
        {missingTopic && <option value={data.topicId}>{data.topicTitle ?? 'Chủ đề đã chọn'} (không còn khả dụng)</option>}
        {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
      </select>
    </label>
    {choice === 'new' && <label className="block space-y-1 text-sm font-medium">
      <span>Tên chủ đề mới</span>
      <input className={inputClass} type="text" required maxLength={300} pattern={'.*\\S.*'}
        value={data.topicTitle ?? ''} onChange={event => change('topicTitle', event.target.value)} />
    </label>}
  </div>;
}

export function ContentForm({ type, initial, record, lookups, save, close, viewOnly = false }) {
  const [data, setData] = useState(initial);
  const [formError, setFormError] = useState('');
  const readOnly = viewOnly || record?.status === 'PendingReview';
  const change = (key, value) => setData(previous => updateField(previous, key, value));
  const skills = lookups.skills.map(skill => ({ value: skill.id, label: skill.name }));
  const exercise = type === 'PracticeExercise';
  const levelCode = lookups.levels.find(level => level.id === data.certificateLevelId)?.code;
  const formats = (lookups.jlptQuestionFormats ?? []).filter(format => format.levels.includes(levelCode));
  const usedFormats = new Set((data.sections ?? []).flatMap(section =>
    (section.questions ?? []).map(question => question.interactionData?.jlptItemType)));
  const missingFormats = formats.filter(format => !usedFormats.has(format.code));
  const lessons = useQuery({
    queryKey: ['manual-content-lessons', data.certificateLevelId],
    queryFn: () => api.get(endpoint + '/lessons/' + data.certificateLevelId),
    enabled: exercise && Boolean(data.certificateLevelId),
  });
  const published = record?.status === 'Approved';

  function submit(event) {
    event.preventDefault();
    if (save.isPending || readOnly) return;
    setFormError('');
    const questions = (data.sections ?? []).flatMap(section => section.questions ?? []);
    const invalid = questions.findIndex(question => question.questionType === orderingType &&
      ((question.orderingParts?.length ?? 0) < 2 || question.orderingParts.some(part => !part.text.trim())));
    if (invalid >= 0) {
      setFormError(`Câu ${invalid + 1}: Hãy nhập nội dung cho ít nhất 2 cụm từ và điền đầy đủ các cụm đã thêm.`);
      return;
    }
    try {
      save.mutate(serializeForm(type, data));
    } catch (error) {
      if (error instanceof SyntaxError) setFormError('Hãy kiểm tra JSON của dữ liệu tương tác và đáp án.');
      else throw error;
    }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-[#EADFE5] bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{readOnly ? 'Xem nội dung' : record ? 'Sửa nội dung' : 'Thêm nội dung'}</h2>
      <button className={actionClass} type="button" onClick={close}>Đóng biểu mẫu</button>
    </div>
    {published && <p className="text-sm">Khi lưu, hệ thống tạo bản chỉnh sửa để gửi Admin duyệt.</p>}
    <fieldset disabled={save.isPending || readOnly} className="space-y-4">
      <Select label="Cấp độ" value={data.certificateLevelId}
        change={value => setData(previous => ({ ...previous, certificateLevelId: Number(value), lessonId: null, lessonTitle: exercise ? '' : previous.lessonTitle }))}
        items={lookups.levels.map(level => ({ value: level.id, label: level.certificate + ' ' + level.code }))} />
      {(type === 'Lesson' || exercise) && <Select label="Kỹ năng" value={data.languageSkillId}
        change={value => change('languageSkillId', Number(value))} items={skills} />}
      {definitions[type].fields.map(definition => <Field key={definition.key} definition={definition} data={data} change={change} />)}
      {type === 'Lesson' && <>
        <LessonTopicField data={data} change={change} topics={lookups.topics ?? []} />
        <AudioField data={data} change={change} />
      </>}
      {exercise && <>
        <label className="block space-y-1 text-sm font-medium">
          <span>Bài học đã xuất bản</span>
          <select className={inputClass} value={data.lessonId ?? ''} onChange={event => {
            const lesson = lessons.data?.find(item => item.id === Number(event.target.value));
            setData(previous => ({ ...previous, lessonId: lesson?.id ?? null, lessonTitle: lesson?.title ?? previous.lessonTitle }));
          }}>
            <option value="">Chọn bài học</option>
            {lessons.data?.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
          </select>
        </label>
        {!data.lessonId && <Field definition={field('lessonTitle', 'Tên bài học đang chờ duyệt', 'text', true)} data={data} change={change} />}
        {lessons.isError && <p role="alert" className="text-sm text-rose-700">Chưa tải được bài học đã xuất bản.</p>}
        <Questions rows={data.questions ?? []} onChange={value => change('questions', value)} />
      </>}
      {type === 'MockTest' && formats.length > 0 && <details className="rounded-lg border border-[#EADFE5] p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          {formats.length - missingFormats.length}/{formats.length} dạng JLPT {levelCode} đã được gắn nhãn
        </summary>
        {missingFormats.length > 0 && <ul className="mt-2 grid list-disc gap-1 pl-5 sm:grid-cols-2">
          {missingFormats.map(format => <li key={format.code}>{format.label}</li>)}
        </ul>}
      </details>}
      {type === 'MockTest' && <Rows rows={data.sections ?? []} onChange={value => change('sections', value)}
        name="Phần thi" create={newMockSection} render={(section, update) => <>
          <Field definition={field('title', 'Tên phần thi', 'text', true)} data={section} change={update} />
          <Select label="Mục thi theo cấp độ" value={section.certificateSectionCode} change={value => update('certificateSectionCode', value)}
            items={lookups.sections.filter(item => item.certificateLevelId === data.certificateLevelId)
              .map(item => ({ value: item.code, label: item.name + ' · ' + item.code }))} />
          <Select label="Kỹ năng" value={section.languageSkillId} change={value => update('languageSkillId', Number(value))} items={skills} />
          <section aria-label="Câu hỏi và đáp án" className="space-y-2">
            <h3 className="font-semibold text-[#49353F]">Câu hỏi và đáp án</h3>
            <Questions rows={section.questions ?? []} onChange={value => update('questions', value)} mock
              formats={formats.filter(format => format.skill.toLowerCase() ===
                lookups.skills.find(skill => skill.id === section.languageSkillId)?.name?.trim().toLowerCase())} />
          </section>
        </>} />}
      {!readOnly && <button className="rounded-lg bg-[#AD3155] px-4 py-2 text-sm font-semibold text-white" type="submit">
        {save.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}
      </button>}
    </fieldset>
    {(formError || save.isError) && <p role="alert" className="text-sm text-rose-700">{formError || save.error.message}</p>}
  </form>;
}

export function ManualContentWorkspace({ heading = 'Tạo và sửa học liệu', pageName, children, examOnly = false, fixedType }) {
  const { user } = useAuth();
  const [selectedType, setType] = useState('Lesson');
  const type = fixedType ?? (examOnly ? 'MockTest' : selectedType);
  const [activeLevel, setActiveLevel] = useState(AUTHOR_LEVELS[0]);
  const [examSearch, setExamSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState('');
  const [notice, setNotice] = useState('');
  const queryClient = useQueryClient();
  const listPrefix = ['manual-content-items', user?.userId, type];
  const listKey = [...listPrefix, approvalFilter];
  const list = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => api.get(endpoint + '/items/' + type, {
      params: approvalFilter ? { status: approvalFilter } : undefined,
      signal,
    }),
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  });
  const lookups = useQuery({ queryKey: ['manual-content-lookups'], queryFn: () => api.get(endpoint + '/lookups') });
  const allowedLevels = AUTHOR_LEVELS.map(code => lookups.data?.levels?.find(level =>
    level.certificate?.trim().toUpperCase() === 'JLPT' && level.code === code)).filter(Boolean);
  const activeLevelId = allowedLevels.find(level => level.code === activeLevel)?.id;
  const formLookups = lookups.data && { ...lookups.data, levels: allowedLevels };
  const query = examSearch.trim().toLocaleLowerCase('vi');
  const visibleItems = lookups.isSuccess ? list.data?.filter(item =>
    activeLevelId != null && item.certificateLevelId === activeLevelId &&
    (!examOnly || item.rowKey.toLocaleLowerCase('vi').includes(query))) : undefined;
  const detail = useQuery({
    queryKey: ['manual-content-detail', user?.userId, editor?.id],
    queryFn: async () => normalizeKeys((await api.get(endpoint + '/items/detail/' + editor.id)).result),
    enabled: Boolean(editor?.id),
  });
  const save = useMutation({
    mutationFn: async data => {
      const response = editor?.id
        ? await api.put(endpoint + '/items/' + type + '/' + editor.id, data)
        : await api.post(endpoint + '/items/' + type, data);
      return { id: response.result, levelId: data.certificateLevelId };
    },
    onSuccess: async saved => {
      const savedLevel = allowedLevels.find(level => level.id === saved.levelId);
      if (savedLevel) setActiveLevel(savedLevel.code);
      setEditor(null);
      setNotice('Đã lưu bản nháp. Bạn có thể gửi duyệt từ danh sách.');
      await queryClient.invalidateQueries({ queryKey: ['manual-content-detail', user?.userId, saved.id] });
      await queryClient.invalidateQueries({ queryKey: listPrefix });
      await queryClient.invalidateQueries({ queryKey: ['author-import-batches'] });
    },
  });
  const send = useMutation({
    mutationFn: async id => {
      await api.post(endpoint + '/items/' + id + '/submit');
      return id;
    },
    onSuccess: async id => {
      queryClient.setQueryData(listKey, items => approvalFilter === 'Draft'
        ? items?.filter(item => item.id !== id)
        : items?.map(item => item.id === id && item.status === 'Draft'
          ? { ...item, status: 'PendingReview' }
          : item));
      setNotice('Đã gửi Admin duyệt.');
      await queryClient.invalidateQueries({ queryKey: listPrefix });
      await queryClient.invalidateQueries({ queryKey: ['author-import-batches'] });
    },
  });

  function openEditor(item) {
    if (save.isPending || send.isPending) return;
    save.reset();
    send.reset();
    setNotice('');
    setEditor(item);
  }

  return (
    <main data-page={pageName} className="mx-auto max-w-5xl space-y-5 px-5 py-6 text-[#49353F]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <div className="flex flex-wrap gap-2">
          <Link className={actionClass} to="/bulk-import/?view=history">Lô Excel đã lưu</Link>
          <Link className={actionClass} to="/bulk-import/">Nhập Excel</Link>
        </div>
      </header>
      {children}
      <div className="flex flex-wrap items-end gap-3">
        {examOnly && <label className="space-y-1 text-sm font-medium">
          <span>Tìm đề</span>
          <input className={inputClass} type="search" value={examSearch}
            onChange={event => setExamSearch(event.target.value)} />
        </label>}
        {!examOnly && !fixedType && <Select label="Loại học liệu" value={type} change={value => {
          if (save.isPending || send.isPending) return;
          setType(value);
          openEditor(null);
        }} items={Object.entries(definitions).map(([value, item]) => ({ value, label: item.label }))} />}
        <div role="group" aria-label="Lọc theo cấp độ JLPT" className="flex flex-wrap gap-2">
          {AUTHOR_LEVELS.map(level => <button key={level} type="button" aria-pressed={activeLevel === level}
            disabled={save.isPending || send.isPending} onClick={() => {
              if (level === activeLevel) return;
              setActiveLevel(level);
              openEditor(null);
            }}
            className={actionClass + (activeLevel === level ? ' bg-[#FADDE8]' : ' bg-white')}>
            {level}
          </button>)}
        </div>
        <button className={actionClass} type="button" disabled={!activeLevelId || save.isPending || send.isPending}
          onClick={() => openEditor({ initial: {
            certificateLevelId: activeLevelId,
            ...(type === 'MockTest' ? { sections: [withRowId(newMockSection())] } : {}),
          } })}>{examOnly ? 'Thêm đề' : fixedType === 'Lesson' ? 'Thêm bài học' : 'Thêm mới'}</button>
      </div>
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {(lookups.isError || list.isError || detail.isError || send.isError)
        && <p role="alert" className="text-sm text-rose-700">{(lookups.error || list.error || detail.error || send.error).message}</p>}
      {editor && formLookups && (editor.id ? detail.data
        ? <ContentForm key={editor.id} type={type} record={editor} initial={detail.data} lookups={formLookups} save={save} close={() => openEditor(null)} />
        : detail.isPending && <p role="status">Đang tải nội dung…</p>
        : <ContentForm key={type} type={type} initial={editor.initial ?? {}} lookups={formLookups} save={save} close={() => openEditor(null)} />)}
      {(list.isPending || lookups.isPending) && <p role="status">Đang tải danh sách…</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{examOnly ? 'Đề thi của tôi' : fixedType === 'Lesson' ? 'Bài học của tôi' : 'Học liệu của tôi'}</h2>
        <label className="space-y-1 text-sm font-medium">
          <span>Trạng thái duyệt</span>
          <select className={inputClass} value={approvalFilter} onChange={event => setApprovalFilter(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statuses).map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}
          </select>
        </label>
      </div>
      {visibleItems?.length === 0 && <p>{examOnly ? 'Chưa có đề phù hợp ở cấp ' + activeLevel + '.' : approvalFilter
        ? 'Chưa có học liệu ' + activeLevel + ' ở trạng thái này.'
        : 'Bạn chưa có học liệu ' + activeLevel + ' thuộc loại này.'}</p>}
      <ul className="space-y-2">
        {visibleItems?.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EADFE5] bg-white p-4">
          <div className="min-w-0 break-words">
            <p className="font-semibold">{item.rowKey}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#826773]">
              <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + (statuses[item.status]?.style ?? '')}>
                {statuses[item.status]?.label ?? item.status}
              </span>
              {item.topicTitle && <span>Chủ đề · {item.topicTitle}</span>}
              {item.sourceFileName && <span>{item.sourceFileName}</span>}
            </div>
            {item.reviewNote && <p className="mt-2 text-sm">Phản hồi của Admin · {item.reviewNote}</p>}
          </div>
          <div className="flex gap-2">
            <button className={actionClass} type="button" onClick={() => openEditor(item)}>
              {item.status === 'PendingReview' ? 'Xem' : 'Sửa'}
            </button>
            {item.status === 'Draft' && <button className={actionClass} type="button"
              disabled={send.isPending || editor?.id === item.id} onClick={() => send.mutate(item.id)}>Yêu cầu Admin duyệt</button>}
          </div>
        </li>)}
      </ul>
    </main>
  );
}

export default function ManualContentPage() {
  return <CmsShell breadcrumb="Tạo và sửa học liệu">
    <ManualContentWorkspace />
  </CmsShell>;
}
