import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { uploadBulkImportFile } from '@/features/content-author/api/cmsBulkImportApi.js';
import { ContentAuthorShell } from '@/layouts';
import { EmptyState } from '@/components/ui';
import { AUTHOR_LEVELS } from '@/features/content-author/constants/authorLevels.js';
import { useLocale, translateTemplate } from '@/locales/locale.js';

const SKILLS = ['Vocabulary', 'Kanji', 'Grammar', 'Listening', 'Reading'];

const inputClass = 'h-10 w-full rounded-lg border border-rp-line bg-white px-3 text-[13px] text-rp-text outline-none focus:border-rp-brand-border';

function blankLesson() {
  return {
    id: Date.now(),
    title: '',
    level: 'N5',
    skill: 'Vocabulary',
    description: '',
    sortOrder: '',
    vocabulary: [],
    kanji: [],
    grammar: [],
  };
}

function sampleLessons() {
  return [{
    id: 1,
    title: 'Chào hỏi & Hán tự',
    level: 'N5',
    skill: 'Vocabulary',
    description: 'Bài học mở đầu',
    sortOrder: '1',
    vocabulary: [{ id: 11, word: '水', reading: 'みず', meaning: 'Nước', exampleSentence: '', exampleSentenceMeaning: '' }],
    kanji: [{ id: 12, character: '水', meaning: 'Nước', strokeCount: '4', sinoVietnamese: 'thủy', onYomi: 'スイ', kunYomi: 'みず' }],
    grammar: [{ id: 13, title: 'です', structure: 'N です', usageNotes: 'Lịch sự', exampleSentence: '学生です', exampleSentenceMeaning: 'Tôi là học sinh' }],
  }];
}

function issuesFor(lesson) {
  const issues = [];
  if (!lesson.title.trim()) issues.push('Thiếu tên bài');
  if (!AUTHOR_LEVELS.includes(lesson.level)) issues.push('Cấp độ phải từ N5 đến N2.');
  lesson.vocabulary.forEach((item, index) => {
    if (!item.word.trim() || !item.reading.trim() || !item.meaning.trim()) issues.push(translateTemplate('Từ vựng {0} thiếu từ, cách đọc hoặc nghĩa', { 0: index + 1 }));
  });
  lesson.kanji.forEach((item, index) => {
    if (!item.character.trim() || !item.meaning.trim()) issues.push(translateTemplate('Hán tự {0} thiếu chữ hoặc nghĩa', { 0: index + 1 }));
    if (item.strokeCount && !/^\d+$/.test(item.strokeCount)) issues.push(translateTemplate('Hán tự {0} số nét phải là số', { 0: index + 1 }));
  });
  lesson.grammar.forEach((item, index) => {
    if (!item.title.trim() || !item.structure.trim()) issues.push(translateTemplate('Ngữ pháp {0} thiếu tên hoặc cấu trúc', { 0: index + 1 }));
  });
  return issues;
}

function cell(row, ...names) {
  const wanted = new Set(names.map((name) => name.replace(/\s/g, '').toLowerCase()));
  const found = Object.entries(row).find(([key]) => wanted.has(String(key).replace(/\s/g, '').toLowerCase()));
  return String(found?.[1] ?? '').trim();
}

function sheetRows(book, XLSX, name) {
  const key = name.replace(/\s/g, '').toLowerCase();
  const sheetName = book.SheetNames.find((item) => item.replace(/\s/g, '').toLowerCase() === key);
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(book.Sheets[sheetName], { defval: '', raw: false });
}

function lessonsFromWorkbook(book, XLSX) {
  const lessonRows = sheetRows(book, XLSX, 'Lesson');
  const vocabRows = sheetRows(book, XLSX, 'Vocabulary');
  const kanjiRows = sheetRows(book, XLSX, 'Kanji');
  const grammarRows = sheetRows(book, XLSX, 'Grammar Pattern');
  if (lessonRows.length || vocabRows.length || kanjiRows.length || grammarRows.length) {
    const lessons = lessonRows.map((row, index) => ({
      id: Date.now() + index,
      title: cell(row, 'LessonTitle', 'Title'),
      level: cell(row, 'Certificate Level Code', 'CertificateLevel').toUpperCase() || 'N5',
      skill: cell(row, 'Language Skill Name', 'LanguageSkill') || 'Vocabulary',
      description: cell(row, 'Description'),
      sortOrder: cell(row, 'Sort Order', 'SortOrder'),
      vocabulary: [],
      kanji: [],
      grammar: [],
    }));
    const findLesson = (title, level) => lessons.find((lesson) => lesson.title === title && (!level || lesson.level === level.toUpperCase())) || lessons[0];
    vocabRows.forEach((row, index) => {
      const lesson = findLesson(cell(row, 'Lesson Title', 'LessonTitle'), cell(row, 'CertificateLevelCode', 'Certificate Level Code'));
      if (!lesson) return;
      lesson.vocabulary.push({
        id: Date.now() + 1000 + index,
        word: cell(row, 'Word'),
        reading: cell(row, 'Reading'),
        meaning: cell(row, 'Meaning'),
        exampleSentence: cell(row, 'ExampleSentence', 'Example Sentence'),
        exampleSentenceMeaning: cell(row, 'ExampleSentenceMeaning', 'Example Sentence Meaning'),
      });
    });
    kanjiRows.forEach((row, index) => {
      const lesson = findLesson(cell(row, 'Lesson Title', 'LessonTitle'), cell(row, 'Certificate Level Code', 'CertificateLevelCode'));
      if (!lesson) return;
      lesson.kanji.push({
        id: Date.now() + 2000 + index,
        character: cell(row, 'Character'),
        meaning: cell(row, 'Meaning'),
        strokeCount: cell(row, 'Stroke Count', 'StrokeCount'),
        sinoVietnamese: cell(row, 'Sino Vietnamese', 'SinoVietnamese'),
        onYomi: cell(row, 'On Yomi', 'OnYomi'),
        kunYomi: cell(row, 'Kun Yomi', 'KunYomi'),
      });
    });
    grammarRows.forEach((row, index) => {
      const lesson = findLesson(cell(row, 'Lesson Title', 'LessonTitle'), cell(row, 'Certificate Level Code', 'CertificateLevelCode'));
      if (!lesson) return;
      lesson.grammar.push({
        id: Date.now() + 3000 + index,
        title: cell(row, 'Title'),
        structure: cell(row, 'Structure'),
        usageNotes: cell(row, 'UsageNotes', 'Usage Notes'),
        exampleSentence: cell(row, 'Example Sentence', 'ExampleSentence'),
        exampleSentenceMeaning: cell(row, 'Example Sentence Meaning', 'ExampleSentenceMeaning'),
      });
    });
    return lessons.filter((lesson) => lesson.title);
  }
  return [];
}

async function loadXlsxLib() {
  if (window.XLSX) return window.XLSX;
  const mod = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  window.XLSX = mod;
  return mod;
}

function workbookOf(XLSX, lessons) {
  const book = XLSX.utils.book_new();
  const add = (name, rows) => {
    if (!rows.length) return;
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name);
  };
  add('Lesson', lessons.map((lesson) => ({
    LessonTitle: lesson.title,
    Description: lesson.description,
    'Certificate Level Code': lesson.level,
    'Language Skill Name': lesson.skill,
    'Sort Order': lesson.sortOrder,
  })));
  add('Vocabulary', lessons.flatMap((lesson) => lesson.vocabulary.map((item) => ({
    Word: item.word,
    Reading: item.reading,
    Meaning: item.meaning,
    ExampleSentence: item.exampleSentence,
    ExampleSentenceMeaning: item.exampleSentenceMeaning,
    CertificateLevelCode: lesson.level,
    'Lesson Title': lesson.title,
  }))));
  add('Kanji', lessons.flatMap((lesson) => lesson.kanji.map((item) => ({
    Character: item.character,
    Meaning: item.meaning,
    'Stroke Count': item.strokeCount,
    'Sino Vietnamese': item.sinoVietnamese,
    'On Yomi': item.onYomi,
    'Kun Yomi': item.kunYomi,
    'Certificate Level Code': lesson.level,
    'Lesson Title': lesson.title,
  }))));
  add('Grammar Pattern', lessons.flatMap((lesson) => lesson.grammar.map((item) => ({
    Title: item.title,
    Structure: item.structure,
    UsageNotes: item.usageNotes,
    'Example Sentence': item.exampleSentence,
    'Example Sentence Meaning': item.exampleSentenceMeaning,
    'Certificate Level Code': lesson.level,
    'Lesson Title': lesson.title,
  }))));
  return book;
}

function ItemList({ title, items, columns, onChange, onAdd }) {
  const { tr } = useLocale();
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-rp-text-2">{tr(title)}</h3>
        <button type="button" onClick={onAdd} className="text-[12px] text-rp-brand-strong">{tr('Thêm')}</button>
      </div>
      {!items.length && (
        <EmptyState
          variant="inline"
          size="sm"
          illustration="table"
          title={tr('Chưa có dòng trong bài này.')}
        />
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="grid gap-2 rounded-lg bg-rp-bg-2 p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            {columns.map(([key, label]) => (
              <input
                key={key}
                value={item[key] || ''}
                placeholder={label}
                onChange={(event) => onChange(item.id, key, event.target.value)}
                className={inputClass}
              />
            ))}
            <button type="button" onClick={() => onChange(item.id, null)} className="h-10 text-[12px] text-rp-text-muted">{tr('Xóa')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BulkImport() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const fileInputRef = useRef(null);
  const [lessons, setLessons] = useState([]);
  const [fileName, setFileName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [reading, setReading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const reviewed = lessons.map((lesson) => ({ ...lesson, issues: issuesFor(lesson) }));
  const issueCount = reviewed.reduce((sum, lesson) => sum + lesson.issues.length, 0);
  const editing = lessons.find((lesson) => lesson.id === editingId) || null;

  useEffect(() => {
    loadXlsxLib().catch(() => {});
  }, []);

  function updateLesson(id, patch) {
    setLessons((prev) => prev.map((lesson) => (lesson.id === id ? { ...lesson, ...patch } : lesson)));
  }

  function updateItem(id, key, itemId, field, value) {
    setLessons((prev) => prev.map((lesson) => {
      if (lesson.id !== id) return lesson;
      const next = lesson[key].flatMap((item) => {
        if (item.id !== itemId) return [item];
        if (field == null) return [];
        return [{ ...item, [field]: value }];
      });
      return { ...lesson, [key]: next };
    }));
  }

  function addItem(id, key, blank) {
    setLessons((prev) => prev.map((lesson) => (
      lesson.id === id ? { ...lesson, [key]: [...lesson[key], { id: Date.now(), ...blank }] } : lesson
    )));
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setResult(null);
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Vui lòng chọn tệp Excel định dạng .xlsx.');
      return;
    }
    setReading(true);
    try {
      const XLSX = await loadXlsxLib();
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const parsed = lessonsFromWorkbook(book, XLSX);
      if (!parsed.length) {
        setError('Không thấy sheet Lesson. File cần các sheet Lesson, Vocabulary, Kanji và Grammar Pattern.');
        return;
      }
      setLessons(parsed);
      setEditingId(parsed[0].id);
      setFileName(file.name);
    } catch (err) {
      setError(err.message || 'Không đọc được file.');
    } finally {
      setReading(false);
    }
  }

  async function downloadSample() {
    setError('');
    try {
      const XLSX = await loadXlsxLib();
      XLSX.writeFile(workbookOf(XLSX, sampleLessons()), 'RikiPath_Mau_BaiHoc.xlsx');
    } catch (err) {
      setError(err.message || 'Không tạo được file mẫu.');
    }
  }

  async function send() {
    if (!lessons.length || issueCount || sending) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const XLSX = await loadXlsxLib();
      const book = workbookOf(XLSX, lessons);
      const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
      const name = (fileName || 'bai-hoc.xlsx').replace(/\.[^.]+$/, '.xlsx');
      const file = new File([buffer], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const data = await uploadBulkImportFile(file);
      setResult(data?.result ?? data);
    } catch (err) {
      setError(err.data?.error || err.data?.errorMessage || err.message || 'Không gửi được file.');
    } finally {
      setSending(false);
    }
  }

  const rowErrors = Array.isArray(result?.errors) ? result.errors : [];

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb="Import Excel">
      <main data-page="BulkImport" className="rp-container py-6 lg:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-rp-text">{tr('Import bài học')}</h1>
            <p className="mt-1 max-w-xl text-[13px] leading-6 text-rp-text-muted">
              {tr('Thêm cả một bài: tên bài, từ vựng, Hán tự và ngữ pháp đi cùng nhau. Không thêm từng loại rời.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadSample} className="inline-flex h-10 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[13px] text-rp-text-2">{tr('Tải file mẫu')}</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-10 items-center rounded-xl bg-rp-brand-strong px-3.5 text-[13px] text-white rp-press">{reading ? tr('Đang đọc') : tr('Chọn file')}</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onFile} />
          </div>
        </div>

        {fileName && <p className="mt-3 text-[12px] text-rp-text-muted">{fileName}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">{error}</p>}
        {result && (
          <div className="mt-3 space-y-2 rounded-xl border border-rp-line bg-white p-4 text-[13px] text-rp-text">
            <p>{tr('Đã nhận')}{' '}{result.successCount ?? 0}/{result.totalRows ?? 0}{' '}{tr('dòng.')}{result.failedCount ? trf(' {0} dòng lỗi.', { 0: result.failedCount }) : ''}</p>
            {rowErrors.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-[12px] text-rp-brand-strong">
                {rowErrors.slice(0, 20).map((item, idx) => (
                  <li key={idx}>
                    {typeof item === 'string'
                      ? item
                      : [item.rowNumber ? trf('Dòng {0}', { 0: item.rowNumber }) : null, item.sheetName, item.message || item.error].filter(Boolean).join(' · ') || JSON.stringify(item)}
                  </li>
                ))}
                {rowErrors.length > 20 && <li>{trf('…và {0} lỗi khác.', { 0: rowErrors.length - 20 })}</li>}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => { const lesson = blankLesson(); setLessons((prev) => [lesson, ...prev]); setEditingId(lesson.id); }} className="h-10 rounded-lg bg-rp-brand-strong px-3 text-[13px] text-white rp-press">{tr('Thêm bài học')}</button>
          <button type="button" onClick={() => { setLessons(sampleLessons()); setEditingId(1); setFileName(''); }} className="h-10 rounded-lg px-2 text-[12px] text-rp-text-muted">{tr('Xem bài mẫu')}</button>
        </div>

        <div className="mt-4 space-y-3">
          {!reviewed.length && (
            <div className="rounded-xl border border-rp-line bg-white p-4">
              <EmptyState
                variant="compact"
                illustration="book"
                title={tr('Chưa có bài. Thêm bài học hoặc chọn file mẫu.')}
              />
            </div>
          )}
          {reviewed.map((lesson) => (
            <article key={lesson.id} className="rounded-xl border border-rp-line bg-white p-4">
              <button type="button" onClick={() => setEditingId(editingId === lesson.id ? null : lesson.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <span>
                  <span className="block text-[15px] font-medium">{lesson.title || tr('Bài chưa đặt tên')}</span>
                  <span className="mt-1 block text-[12px] text-rp-text-muted">{trf('{0} · {1} từ · {2} Hán tự · {3} ngữ pháp', { 0: lesson.level, 1: lesson.vocabulary.length, 2: lesson.kanji.length, 3: lesson.grammar.length })}</span>
                </span>
                <span className="text-[12px] text-rp-brand-strong">{editingId === lesson.id ? tr('Đóng') : tr('Sửa')}</span>
              </button>
              {lesson.issues.length > 0 && <p className="mt-2 text-[12px] text-rp-brand-strong">{lesson.issues.join('. ')}</p>}
              {editing?.id === lesson.id && (
                <div className="mt-4 border-t border-rp-line pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className="mb-1 block text-[12px] text-rp-text-muted">{tr('Tên bài')}</span><input value={lesson.title} onChange={(event) => updateLesson(lesson.id, { title: event.target.value })} className={inputClass} /></label>
                    <label><span className="mb-1 block text-[12px] text-rp-text-muted">{tr('Cấp')}</span>
                      <select
                        value={AUTHOR_LEVELS.includes(lesson.level) ? lesson.level : ''}
                        onChange={(event) => updateLesson(lesson.id, { level: event.target.value })}
                        className={inputClass}
                      >
                        <option value="" disabled>{tr('Chọn cấp độ')}</option>
                        {AUTHOR_LEVELS.map((level) => <option key={level}>{level}</option>)}
                      </select>
                    </label>
                    <label><span className="mb-1 block text-[12px] text-rp-text-muted">{tr('Kỹ năng của bài')}</span>
                      <select value={lesson.skill} onChange={(event) => updateLesson(lesson.id, { skill: event.target.value })} className={inputClass}>{SKILLS.map((skill) => <option key={skill}>{skill}</option>)}</select>
                    </label>
                    <label><span className="mb-1 block text-[12px] text-rp-text-muted">{tr('Thứ tự')}</span><input value={lesson.sortOrder} onChange={(event) => updateLesson(lesson.id, { sortOrder: event.target.value })} className={inputClass} /></label>
                    <label className="sm:col-span-2"><span className="mb-1 block text-[12px] text-rp-text-muted">{tr('Mô tả')}</span><input value={lesson.description} onChange={(event) => updateLesson(lesson.id, { description: event.target.value })} className={inputClass} /></label>
                  </div>
                  <ItemList title={tr('Từ vựng')} items={lesson.vocabulary} columns={[['word', 'Từ'], ['reading', 'Cách đọc'], ['meaning', 'Nghĩa']]} onAdd={() => addItem(lesson.id, 'vocabulary', { word: '', reading: '', meaning: '', exampleSentence: '', exampleSentenceMeaning: '' })} onChange={(itemId, field, value) => updateItem(lesson.id, 'vocabulary', itemId, field, value)} />
                  <ItemList title={tr('Hán tự')} items={lesson.kanji} columns={[['character', 'Chữ'], ['meaning', 'Nghĩa'], ['strokeCount', 'Số nét']]} onAdd={() => addItem(lesson.id, 'kanji', { character: '', meaning: '', strokeCount: '', sinoVietnamese: '', onYomi: '', kunYomi: '' })} onChange={(itemId, field, value) => updateItem(lesson.id, 'kanji', itemId, field, value)} />
                  <ItemList title={tr('Ngữ pháp')} items={lesson.grammar} columns={[['title', 'Tên mẫu'], ['structure', 'Cấu trúc'], ['usageNotes', 'Cách dùng']]} onAdd={() => addItem(lesson.id, 'grammar', { title: '', structure: '', usageNotes: '', exampleSentence: '', exampleSentenceMeaning: '' })} onChange={(itemId, field, value) => updateItem(lesson.id, 'grammar', itemId, field, value)} />
                  <button type="button" onClick={() => setLessons((prev) => prev.filter((item) => item.id !== lesson.id))} className="mt-3 text-[12px] text-rp-text-muted">{tr('Xóa bài này')}</button>
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={send} disabled={!lessons.length || issueCount > 0 || sending} className="h-10 rounded-xl bg-rp-brand-strong px-3.5 text-[13px] text-white disabled:opacity-40 rp-press">{sending ? tr('Đang gửi') : tr('Gửi bài học')}</button>
          {issueCount > 0 && <span className="text-[12px] text-rp-text-muted">{tr('Sửa bài còn thiếu trước khi gửi.')}</span>}
        </div>
      </main>
    </ContentAuthorShell>
  );
}
