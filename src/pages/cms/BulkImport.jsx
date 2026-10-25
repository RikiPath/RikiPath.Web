import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { uploadBulkImportFile } from '../../api/cmsBulkImportApi.js';
import Pagination from '../../components/Pagination.jsx';
import { CmsShell } from '../../components/shells';
import { usePagination } from '../../hooks/usePagination.js';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const SKILLS = [
  { value: '1', label: '1 · Từ vựng' },
  { value: '2', label: '2 · Hán tự' },
  { value: '3', label: '3 · Ngữ pháp' },
  { value: '4', label: '4 · Nghe' },
  { value: '5', label: '5 · Đọc' },
];

const EXPORT_COLUMNS = [
  'Type',
  'CertificateType',
  'CertificateLevel',
  'Title',
  'Description',
  'VideoUrl',
  'DurationSeconds',
  'SortOrder',
  'LanguageSkillId',
  'Character',
  'Meaning',
  'SinoVietnamese',
  'OnYomi',
  'KunYomi',
  'StrokeCount',
  'StrokeOrderImageUrl',
  'AudioUrl',
  'KanaType',
  'Romaji',
  'Word',
  'Reading',
  'ExampleSentence',
  'ExampleSentenceMeaning',
  'Structure',
  'UsageNotes',
  'TimeLimitMinutes',
  'QuestionText',
  'Explanation',
  'ImageUrl',
  'MockTestSectionId',
];

const CERT_TYPES = new Set([
  'Lesson',
  'Kanji',
  'Vocabulary',
  'GrammarPattern',
  'MockTest',
  'PracticeExercise',
]);

const TYPE_META = {
  Lesson: {
    label: 'Bài học',
    fields: [
      ['Title', 'Tên bài', true],
      ['LanguageSkillId', 'Kỹ năng', true, 'skill'],
      ['Description', 'Mô tả'],
      ['VideoUrl', 'Video'],
      ['DurationSeconds', 'Giây', false, 'number'],
      ['SortOrder', 'Thứ tự', false, 'number'],
    ],
  },
  Kanji: {
    label: 'Hán tự',
    fields: [
      ['Character', 'Chữ', true],
      ['Meaning', 'Nghĩa', true],
      ['StrokeCount', 'Số nét', true, 'number'],
      ['SinoVietnamese', 'Âm Hán Việt'],
      ['OnYomi', 'Âm On'],
      ['KunYomi', 'Âm Kun'],
      ['AudioUrl', 'Audio'],
    ],
  },
  KanaCharacter: {
    label: 'Kana',
    fields: [
      ['Character', 'Chữ', true],
      ['KanaType', 'Loại kana', true, 'kana'],
      ['Romaji', 'Romaji', true],
      ['StrokeCount', 'Số nét', true, 'number'],
      ['AudioUrl', 'Audio'],
    ],
  },
  Vocabulary: {
    label: 'Từ vựng',
    fields: [
      ['Word', 'Từ', true],
      ['Reading', 'Cách đọc', true],
      ['Meaning', 'Nghĩa', true],
      ['ExampleSentence', 'Câu ví dụ'],
      ['ExampleSentenceMeaning', 'Nghĩa câu ví dụ'],
      ['AudioUrl', 'Audio'],
    ],
  },
  GrammarPattern: {
    label: 'Ngữ pháp',
    fields: [
      ['Title', 'Tên mẫu', true],
      ['Structure', 'Cấu trúc', true],
      ['UsageNotes', 'Cách dùng'],
      ['ExampleSentence', 'Câu ví dụ'],
      ['ExampleSentenceMeaning', 'Nghĩa câu ví dụ'],
    ],
  },
  MockTest: {
    label: 'Đề thi',
    fields: [
      ['Title', 'Tên đề', true],
      ['TimeLimitMinutes', 'Số phút', true, 'number'],
      ['Description', 'Mô tả'],
    ],
  },
  PracticeExercise: {
    label: 'Bài tập',
    fields: [
      ['Title', 'Tên bài tập', true],
      ['LanguageSkillId', 'Kỹ năng', true, 'skill'],
      ['Description', 'Mô tả'],
      ['SortOrder', 'Thứ tự', false, 'number'],
    ],
  },
  MockQuestion: {
    label: 'Câu hỏi đề',
    fields: [
      ['QuestionText', 'Câu hỏi', true],
      ['MockTestSectionId', 'ID phần đề', true, 'number'],
      ['Explanation', 'Giải thích'],
      ['AudioUrl', 'Audio'],
      ['ImageUrl', 'Ảnh'],
      ['SortOrder', 'Thứ tự', false, 'number'],
    ],
  },
};

const TYPE_OPTIONS = Object.keys(TYPE_META);

function blankFields(type) {
  const fields = {};
  if (CERT_TYPES.has(type)) {
    fields.CertificateType = 'JLPT';
    fields.CertificateLevel = 'N5';
  }
  return fields;
}

function sampleRows() {
  return [
    {
      id: 1,
      type: 'Lesson',
      fields: {
        CertificateType: 'JLPT',
        CertificateLevel: 'N5',
        Title: 'Từ vựng N5',
        LanguageSkillId: '1',
      },
    },
    {
      id: 2,
      type: 'Vocabulary',
      fields: {
        CertificateType: 'JLPT',
        CertificateLevel: 'N5',
        Word: '水',
        Reading: 'みず',
        Meaning: 'Nước',
      },
    },
    {
      id: 3,
      type: 'Kanji',
      fields: {
        CertificateType: 'JLPT',
        CertificateLevel: 'N5',
        Character: '水',
        Meaning: 'Nước',
        StrokeCount: '4',
      },
    },
  ];
}

function headerKey(value) {
  return String(value ?? '').replace(/[\s_-]/g, '').toLowerCase();
}

function canonicalColumn(header) {
  const key = headerKey(header);
  return EXPORT_COLUMNS.find((column) => headerKey(column) === key) || null;
}

function summaryOf(row) {
  const fields = row.fields || {};
  return (
    fields.Title ||
    fields.Word ||
    fields.Character ||
    fields.QuestionText ||
    '—'
  );
}

function issuesFor(row, index, rows) {
  const meta = TYPE_META[row.type];
  if (!meta) return ['Type không hợp lệ. Dùng Lesson, Kanji, KanaCharacter, Vocabulary, GrammarPattern, MockTest, PracticeExercise hoặc MockQuestion.'];
  const issues = [];
  if (CERT_TYPES.has(row.type)) {
    if (!String(row.fields.CertificateType || '').trim()) issues.push('Thiếu CertificateType');
    if (!String(row.fields.CertificateLevel || '').trim()) issues.push('Thiếu CertificateLevel');
  }
  meta.fields.forEach(([key, label, required, kind]) => {
    const value = String(row.fields[key] ?? '').trim();
    if (required && !value) issues.push(`Thiếu ${label}`);
    if (value && kind === 'number' && !/^\d+$/.test(value)) issues.push(`${label} phải là số nguyên`);
  });
  if (row.type === 'KanaCharacter' && String(row.fields.StrokeCount || '') === '0') {
    issues.push('Số nét phải lớn hơn 0');
  }
  if (row.type === 'PracticeExercise') {
    const lesson = [...rows].slice(0, index).reverse().find((item) => item.type === 'Lesson');
    if (!lesson) issues.push('Đặt bài tập dưới một dòng Lesson');
    else if (
      lesson.fields.CertificateType !== row.fields.CertificateType ||
      lesson.fields.CertificateLevel !== row.fields.CertificateLevel
    ) {
      issues.push('CertificateType và CertificateLevel phải khớp Lesson phía trên');
    }
  }
  return issues;
}

function toExportRow(row) {
  const exported = { Type: row.type };
  EXPORT_COLUMNS.forEach((column) => {
    if (column === 'Type') return;
    exported[column] = row.fields[column] ?? '';
  });
  return exported;
}

async function loadXlsxLib() {
  if (window.XLSX) return window.XLSX;
  try {
    const mod = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    window.XLSX = mod;
    return mod;
  } catch {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

async function workbookFromRows(rows) {
  const XLSX = await loadXlsxLib();
  const sheet = XLSX.utils.json_to_sheet(rows.map(toExportRow), { header: EXPORT_COLUMNS });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Import');
  return { XLSX, book };
}

const inputClass =
  'h-10 w-full rounded-lg border border-[#E8DFDC] bg-white px-3 text-[13px] text-[#2D282A] outline-none focus:border-[#E7C9D4]';

export default function BulkImport() {
  const { pathname } = useLocation();
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ type: 'Vocabulary', fields: blankFields('Vocabulary') });
  const [reading, setReading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadXlsxLib().catch(() => {});
  }, []);

  const reviewed = useMemo(
    () => rows.map((row, index) => ({ ...row, issues: issuesFor(row, index, rows) })),
    [rows],
  );
  const issueCount = reviewed.filter((row) => row.issues.length).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviewed.filter((row) => {
      if (typeFilter !== 'ALL' && row.type !== typeFilter) return false;
      if (onlyIssues && !row.issues.length) return false;
      if (!q) return true;
      return summaryOf(row).toLowerCase().includes(q) || row.type.toLowerCase().includes(q);
    });
  }, [reviewed, typeFilter, onlyIssues, query]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedData,
  } = usePagination(visible, { initialPage: 1, initialPageSize: 10 });

  function setDraftField(key, value) {
    setDraft((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
  }

  function changeDraftType(type) {
    setDraft({ type, fields: { ...blankFields(type), ...draft.fields } });
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setResult(null);
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('API chỉ nhận file .xlsx.');
      return;
    }
    setReading(true);
    try {
      const XLSX = await loadXlsxLib();
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheets = book.SheetNames.filter((name) => {
        const ref = book.Sheets[name]?.['!ref'];
        return Boolean(ref);
      });
      if (sheets.length !== 1) {
        setError('API chỉ nhận một sheet có dữ liệu.');
        return;
      }
      const raw = XLSX.utils.sheet_to_json(book.Sheets[sheets[0]], { defval: '', raw: false });
      if (!raw.length) {
        setError('Sheet chỉ có header, chưa có dòng nội dung.');
        return;
      }
      const parsed = raw.map((item, index) => {
        const fields = {};
        let type = '';
        Object.entries(item).forEach(([key, value]) => {
          const column = canonicalColumn(key);
          const text = String(value ?? '').trim();
          if (!column || !text) return;
          if (column === 'Type') type = text;
          else fields[column] = text;
        });
        return { id: Date.now() + index, type, fields };
      }).filter((row) => row.type || Object.keys(row.fields).length);
      if (!parsed.some((row) => row.type)) {
        setError('Thiếu cột Type.');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch (err) {
      setError(err.message || 'Không đọc được file.');
    } finally {
      setReading(false);
    }
  }

  function saveDraft(event) {
    event.preventDefault();
    const next = { id: editing?.id || Date.now(), type: draft.type, fields: { ...draft.fields } };
    setRows((prev) => (
      editing ? prev.map((row) => (row.id === editing.id ? next : row)) : [next, ...prev]
    ));
    setEditing(null);
    setAdding(false);
    setDraft({ type: 'Vocabulary', fields: blankFields('Vocabulary') });
  }

  function openEdit(row) {
    setAdding(false);
    setEditing(row);
    setDraft({ type: row.type, fields: { ...blankFields(row.type), ...row.fields } });
  }

  async function downloadSample() {
    setError('');
    try {
      const { XLSX, book } = await workbookFromRows(sampleRows());
      XLSX.writeFile(book, 'RikiPath_Mau_Import.xlsx');
    } catch (err) {
      setError(err.message || 'Không tạo được file mẫu.');
    }
  }

  async function send() {
    if (!rows.length || issueCount || sending) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const { XLSX, book } = await workbookFromRows(rows);
      const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
      const name = (fileName || 'bulk-import.xlsx').replace(/\.[^.]+$/, '.xlsx');
      const file = new File([buffer], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const data = await uploadBulkImportFile(file);
      const payload = data?.result ?? data;
      setResult(payload);
    } catch (err) {
      setError(err.data?.error || err.message || 'Không gửi được file.');
    } finally {
      setSending(false);
    }
  }

  const formOpen = adding || editing;
  const formFields = TYPE_META[draft.type]?.fields || [];

  return (
    <CmsShell pathname={pathname} breadcrumb="Import Excel">
      <main data-page="BulkImport" className="mx-auto w-full max-w-5xl px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">Import Excel</h1>
            <p className="mt-1 max-w-xl text-[13px] text-[#967F8A]">
              File .xlsx, một sheet. Dòng hợp lệ được lưu ở trạng thái nháp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex h-10 items-center rounded-xl border border-[#E8DFDC] bg-white px-3.5 text-[13px] text-[#6F5660]"
            >
              Tải file mẫu
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white"
            >
              {reading ? 'Đang đọc' : 'Chọn file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onFile}
            />
          </div>
        </div>

        {fileName && <p className="mt-3 text-[12px] text-[#826773]">{fileName}</p>}
        {error && <p className="mt-3 text-[13px] text-[#AD3155]">{error}</p>}
        {result && (
          <div className="mt-3 text-[13px] text-[#3F3038]">
            <p>
              Đã nhận {result.successCount ?? 0}/{result.totalRows ?? 0} dòng.
              {result.failedCount ? ` ${result.failedCount} dòng lỗi.` : ''}
            </p>
            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-[#826773]">
                {result.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm"
            className="h-10 w-full max-w-xs rounded-lg border border-[#E8DFDC] bg-white px-3 text-[13px] outline-none"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className={inputClass + ' max-w-[180px]'}
          >
            <option value="ALL">Mọi loại ({rows.length})</option>
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {TYPE_META[type].label} ({rows.filter((row) => row.type === type).length})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOnlyIssues((value) => !value)}
            className={[
              'h-10 rounded-lg px-3 text-[12px]',
              onlyIssues ? 'bg-[#FADDE8] text-[#A12E50]' : 'text-[#826773]',
            ].join(' ')}
          >
            Dòng thiếu ({issueCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setRows(sampleRows());
              setFileName('');
              setResult(null);
              setError('');
            }}
            className="h-10 rounded-lg px-2 text-[12px] text-[#826773]"
          >
            Xem dòng mẫu
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setAdding(true);
              setDraft({ type: 'Vocabulary', fields: blankFields('Vocabulary') });
            }}
            className="h-10 rounded-lg px-2 text-[12px] text-[#AD3155]"
          >
            Thêm dòng
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={saveDraft}
            className="mt-4 grid gap-3 rounded-xl border border-[#E8DFDC] bg-white p-4 sm:grid-cols-2"
          >
            <label>
              <span className="mb-1 block text-[12px] text-[#967F8A]">Loại</span>
              <select
                value={draft.type}
                onChange={(event) => changeDraftType(event.target.value)}
                className={inputClass}
              >
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>{TYPE_META[type].label}</option>
                ))}
              </select>
            </label>
            {CERT_TYPES.has(draft.type) && (
              <>
                <label>
                  <span className="mb-1 block text-[12px] text-[#967F8A]">CertificateType</span>
                  <input
                    value={draft.fields.CertificateType || ''}
                    onChange={(event) => setDraftField('CertificateType', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[12px] text-[#967F8A]">CertificateLevel</span>
                  <select
                    value={draft.fields.CertificateLevel || 'N5'}
                    onChange={(event) => setDraftField('CertificateLevel', event.target.value)}
                    className={inputClass}
                  >
                    {LEVELS.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {formFields.map(([key, label, , kind]) => (
              <label key={key}>
                <span className="mb-1 block text-[12px] text-[#967F8A]">{label}</span>
                {kind === 'skill' || kind === 'kana' ? (
                  <select
                    value={draft.fields[key] || ''}
                    onChange={(event) => setDraftField(key, event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Chọn</option>
                    {(kind === 'skill' ? SKILLS : [{ value: 'Hiragana', label: 'Hiragana' }, { value: 'Katakana', label: 'Katakana' }]).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={draft.fields[key] || ''}
                    onChange={(event) => setDraftField(key, event.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
            ))}
            {draft.type === 'MockQuestion' && (
              <p className="text-[12px] text-[#AA8F9B] sm:col-span-2">
                MockTestSectionId phải là phần đề nháp do chính tài khoản này tạo.
              </p>
            )}
            {draft.type === 'PracticeExercise' && (
              <p className="text-[12px] text-[#AA8F9B] sm:col-span-2">
                Dòng này phải đứng dưới một dòng Bài học cùng CertificateType và CertificateLevel.
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="h-9 rounded-lg bg-[#AD3155] px-3 text-[13px] text-white">
                {editing ? 'Lưu dòng' : 'Thêm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditing(null);
                }}
                className="h-9 px-3 text-[13px] text-[#826773]"
              >
                Đóng
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-hidden rounded-xl border border-[#E8DFDC] bg-white">
          {paginatedData.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[#AA8F9B]">
              Chưa có dòng. Chọn file .xlsx hoặc xem dòng mẫu.
            </p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FBF8F7] text-[11px] text-[#B18F9E]">
                <tr>
                  {['Loại', 'Nội dung', 'Cấp', 'Kiểm tra', ''].map((label) => (
                    <th key={label || 'act'} className="px-3 py-2 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row.id} className="border-t border-[#F1E8E6]">
                    <td className="px-3 py-2.5">{TYPE_META[row.type]?.label || row.type || '—'}</td>
                    <td className="max-w-[220px] truncate px-3 py-2.5">{summaryOf(row)}</td>
                    <td className="px-3 py-2.5">{row.fields.CertificateLevel || '—'}</td>
                    <td className="max-w-[240px] px-3 py-2.5 text-[12px] text-[#826773]">
                      {row.issues.length ? row.issues.join('. ') : 'Đủ cột bắt buộc'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <button type="button" onClick={() => openEdit(row)} className="mr-2 text-[12px] text-[#826773]">
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                        className="text-[12px] text-[#AA8F9B]"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalItems > 0 && (
          <div className="mt-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="dòng"
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={send}
            disabled={!rows.length || issueCount > 0 || sending}
            className="h-10 rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white disabled:opacity-40"
          >
            {sending ? 'Đang gửi' : 'Gửi'}
          </button>
          {issueCount > 0 && (
            <span className="text-[12px] text-[#AA8F9B]">Sửa dòng thiếu trước khi gửi.</span>
          )}
        </div>
      </main>
    </CmsShell>
  );
}
