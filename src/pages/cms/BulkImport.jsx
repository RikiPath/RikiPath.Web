import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CmsShell } from '../../components/shells';
import Pagination from '../../components/Pagination.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import { uploadBulkImportFile } from '../../api/cmsBulkImportApi.js';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  Sparkles,
  Send,
  Check,
  X,
  Layers,
  Search,
  Filter,
  BookOpen,
  Languages,
  PenTool,
} from 'lucide-react';

/**
 * Dynamically loads SheetJS (xlsx) for Excel .xlsx / .xls parsing in browser.
 */
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

/**
 * Intelligent mapping from row object/array to standardized JLPT Item.
 */
function normalizeImportedRow(rowObj, index) {
  const findVal = (...keys) => {
    for (const k of keys) {
      for (const objKey of Object.keys(rowObj)) {
        const cleanObjKey = objKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanObjKey === cleanK || cleanObjKey.includes(cleanK)) {
          const val = rowObj[objKey];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
    }
    return '';
  };

  // 1. Determine Type (Kanji, Vocabulary, Grammar)
  const rawType = findVal(
    'type', 'loai', 'category', 'phanloai', 'loaihoclieu', 'group', 'contenttype'
  );
  const lowerType = rawType.toLowerCase();

  let type = 'Vocabulary';
  if (
    lowerType.includes('kanji') ||
    lowerType.includes('hán') ||
    lowerType.includes('han') ||
    lowerType === 'k'
  ) {
    type = 'Kanji';
  } else if (
    lowerType.includes('grammar') ||
    lowerType.includes('ngữ') ||
    lowerType.includes('ngu') ||
    lowerType.includes('pháp') ||
    lowerType.includes('phap') ||
    lowerType.includes('pattern') ||
    lowerType.includes('mẫu') ||
    lowerType.includes('mau') ||
    lowerType === 'g'
  ) {
    type = 'Grammar';
  } else if (
    lowerType.includes('vocab') ||
    lowerType.includes('từ') ||
    lowerType.includes('tu') ||
    lowerType.includes('vựng') ||
    lowerType.includes('vung') ||
    lowerType.includes('word') ||
    lowerType === 'v'
  ) {
    type = 'Vocabulary';
  }

  // 2. Extract Term / Kanji / Word / Pattern
  let term = findVal(
    'term', 'word', 'kanji', 'pattern', 'vocabulary', 'tuvung', 'hantu', 'chuhan',
    'nguphap', 'maucau', 'maucan', 'tieude', 'title', 'keyword', 'tu', 'name'
  );

  // If not found by name, try fallback to first field
  if (!term) {
    const values = Object.values(rowObj).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    term = values[0] ? String(values[0]).trim() : '';
  }

  // 3. Extract Furigana / Reading
  const furigana = findVal(
    'furigana', 'reading', 'hiragana', 'amdoc', 'onyomi', 'kunyomi', 'cachdoc',
    'pronunciation', 'pinyin', 'romaji', 'kana', 'amhanviet', 'hanviet'
  );

  // 4. Extract Vietnamese Meaning
  let meaning = findVal(
    'meaning', 'meaningvi', 'vietnamese', 'nghia', 'ynghia', 'dichnghia', 'dich',
    'definition', 'description', 'translate', 'tiengviet', 'noidung', 'content'
  );
  if (!meaning) {
    const values = Object.values(rowObj).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    meaning = values[2] || values[1] || '';
  }

  // 5. Extract JLPT Level
  let level = findVal('level', 'jlpt', 'jlptlevel', 'trinhdo', 'capdo', 'cap') || 'N3';
  if (!/^N[1-5]$/i.test(level)) {
    if (level.includes('1')) level = 'N1';
    else if (level.includes('2')) level = 'N2';
    else if (level.includes('4')) level = 'N4';
    else if (level.includes('5')) level = 'N5';
    else level = 'N3';
  }

  // 6. Extract Example / Structure / Notes
  const example = findVal(
    'example', 'sentence', 'vidu', 'cauvidu', 'maucau', 'examplesentence',
    'usage', 'structure', 'cautruc', 'congthuc', 'formula', 'notes', 'ghichu'
  );

  const isBlank = !term && !meaning;
  const isError = !term || !meaning;
  const isWarning = !isError && !furigana && type !== 'Grammar';

  return {
    id: index + 1,
    lineNumber: index + 1,
    type, // 'Kanji' | 'Vocabulary' | 'Grammar'
    term: term || `Dòng #${index + 1}`,
    furigana: furigana || '',
    meaning: meaning || '',
    level: level.toUpperCase(),
    example: example || '',
    status: isError ? 'error' : isWarning ? 'warning' : 'valid',
    warning: !term
      ? 'Thiếu Từ vựng / Hán tự / Mẫu câu'
      : !meaning
      ? 'Thiếu nghĩa tiếng Việt'
      : isWarning
      ? 'Chưa có phiên âm Furigana'
      : null,
    isBlank,
  };
}

const INITIAL_DEMO_RECORDS = [
  {
    id: 1,
    lineNumber: 1,
    type: 'Vocabulary',
    term: '咲き誇る',
    furigana: 'さきほこる',
    meaning: 'Nở rộ khoe sắc rực rỡ',
    level: 'N3',
    status: 'valid',
    warning: null,
    example: '桜の花が満開に咲き誇っている。',
  },
  {
    id: 2,
    lineNumber: 2,
    type: 'Vocabulary',
    term: '一期一会',
    furigana: 'いちごいちえ',
    meaning: 'Đời người chỉ gặp một lần (quý trọng từng khoảnh khắc)',
    level: 'N3',
    status: 'warning',
    warning: 'Thiếu phiên âm Furigana ở ký tự thứ 3. Đã tự động điền.',
    example: '人との出会いは一期一会だと大切にする。',
  },
  {
    id: 3,
    lineNumber: 3,
    type: 'Kanji',
    term: '咲',
    furigana: 'ショウ / さ.く',
    meaning: 'TIẾU (Nở hoa, mỉm cười)',
    level: 'N3',
    status: 'valid',
    warning: null,
    example: '春になると花が咲く。',
  },
  {
    id: 4,
    lineNumber: 4,
    type: 'Grammar',
    term: '〜に違いない',
    furigana: '〜にちがいない',
    meaning: 'Chắc chắn là, nhất định là...',
    level: 'N3',
    status: 'valid',
    warning: null,
    example: '明日は雨に違いない。',
  },
  {
    id: 5,
    lineNumber: 5,
    type: 'Kanji',
    term: '桜',
    furigana: 'オウ / さくら',
    meaning: 'ANH (Hoa anh đào)',
    level: 'N3',
    status: 'valid',
    warning: null,
    example: '桜が満開です。',
  },
];

export default function BulkImport() {
  const { pathname } = useLocation();
  const fileInputRef = useRef(null);

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState({
    name: 'RikiPath_Sample_JLPT.xlsx',
    size: '1.8 MB',
    uploadedAt: 'Hôm nay lúc 09:15',
  });

  // Records state
  const [records, setRecords] = useState(INITIAL_DEMO_RECORDS);
  const [isParsing, setIsParsing] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'Kanji' | 'Vocabulary' | 'Grammar'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'WARNING' | 'ERROR'
  const [searchQuery, setSearchQuery] = useState('');

  // Editing Row Modal State
  const [editingRow, setEditingRow] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRowForm, setNewRowForm] = useState({
    type: 'Vocabulary',
    term: '',
    furigana: '',
    meaning: '',
    level: 'N3',
    example: '',
  });

  // API Call State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState('');
  const [conflictRule, setConflictRule] = useState('overwrite');

  // Pre-load XLSX library in background
  useEffect(() => {
    loadXlsxLib().catch(() => {});
  }, []);

  // Handle File Input (Excel .xlsx / .xls / .csv / .json / .txt)
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileMetadata({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    });
    setApiResult(null);
    setApiError('');
    setIsParsing(true);

    try {
      const fileNameLower = file.name.toLowerCase();

      // 1. JSON format
      if (fileNameLower.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];
        const rows = arrayData
          .map((item, idx) => normalizeImportedRow(item, idx))
          .filter((r) => !r.isBlank);
        setRecords(rows);
      }
      // 2. Excel (.xlsx, .xls) or CSV
      else {
        const XLSX = await loadXlsxLib();
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Read first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse to JSON array of objects
        const rawJsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJsonRows.length > 0) {
          const rows = rawJsonRows
            .map((item, idx) => normalizeImportedRow(item, idx))
            .filter((r) => !r.isBlank);
          setRecords(rows);
        } else {
          // If header wasn't detected, try header: 1
          const rawArrayRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (rawArrayRows.length > 1) {
            const headers = rawArrayRows[0];
            const rows = rawArrayRows.slice(1).map((rowArr, idx) => {
              const rowObj = {};
              headers.forEach((h, hIdx) => {
                rowObj[h || `col_${hIdx}`] = rowArr[hIdx] || '';
              });
              return normalizeImportedRow(rowObj, idx);
            }).filter((r) => !r.isBlank);
            setRecords(rows);
          }
        }
      }
    } catch (err) {
      console.error('Error parsing uploaded file:', err);
      setApiError(`Không thể đọc file: ${err.message}. Hãy kiểm tra định dạng file Excel hoặc CSV.`);
    } finally {
      setIsParsing(false);
    }
  };

  // Filtered Records (Combining Content Type, Status, and Search Query)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Filter by Content Type (Kanji, Vocabulary, Grammar)
      if (typeFilter !== 'ALL' && r.type !== typeFilter) {
        return false;
      }

      // 2. Filter by Status (VALID, WARNING, ERROR)
      if (statusFilter === 'VALID' && r.status !== 'valid') return false;
      if (statusFilter === 'WARNING' && r.status !== 'warning') return false;
      if (statusFilter === 'ERROR' && r.status !== 'error') return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTerm = r.term && r.term.toLowerCase().includes(q);
        const matchMeaning = r.meaning && r.meaning.toLowerCase().includes(q);
        const matchFurigana = r.furigana && r.furigana.toLowerCase().includes(q);
        const matchExample = r.example && r.example.toLowerCase().includes(q);
        if (!matchTerm && !matchMeaning && !matchFurigana && !matchExample) {
          return false;
        }
      }

      return true;
    });
  }, [records, typeFilter, statusFilter, searchQuery]);

  // Counts by Content Type
  const countAll = records.length;
  const countKanji = records.filter((r) => r.type === 'Kanji').length;
  const countVocab = records.filter((r) => r.type === 'Vocabulary').length;
  const countGrammar = records.filter((r) => r.type === 'Grammar').length;

  // Counts by Status
  const countValid = records.filter((r) => r.status === 'valid').length;
  const countWarning = records.filter((r) => r.status === 'warning').length;
  const countError = records.filter((r) => r.status === 'error').length;

  // Pagination Hook
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedData: recordsOnPage,
  } = usePagination(filteredRecords, { initialPage: 1, initialPageSize: 10 });

  // In-place Row Editing
  const handleSaveEditedRow = (e) => {
    e.preventDefault();
    if (!editingRow) return;

    setRecords((prev) =>
      prev.map((r) =>
        r.id === editingRow.id
          ? {
              ...editingRow,
              status: !editingRow.term || !editingRow.meaning ? 'error' : 'valid',
              warning: null,
            }
          : r
      )
    );
    setEditingRow(null);
  };

  // Delete a Row
  const handleDeleteRow = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Add New Row
  const handleAddNewRow = (e) => {
    e.preventDefault();
    const newRecord = {
      id: Date.now(),
      lineNumber: records.length + 1,
      ...newRowForm,
      status: !newRowForm.term || !newRowForm.meaning ? 'error' : 'valid',
      warning: null,
    };
    setRecords((prev) => [newRecord, ...prev]);
    setIsAddModalOpen(false);
    setNewRowForm({
      type: 'Vocabulary',
      term: '',
      furigana: '',
      meaning: '',
      level: 'N3',
      example: '',
    });
  };

  // Auto-Fix All Warnings
  const handleAutoFixAllWarnings = () => {
    setRecords((prev) =>
      prev.map((r) =>
        r.status === 'warning' ? { ...r, status: 'valid', warning: null } : r
      )
    );
  };

  // Remove All Error Rows
  const handleRemoveErrorRows = () => {
    setRecords((prev) => prev.filter((r) => r.status !== 'error'));
  };

  // Export Sample Template Excel (.xlsx / .csv)
  const handleDownloadSampleTemplate = async () => {
    try {
      const XLSX = await loadXlsxLib();
      const sampleData = [
        {
          Type: 'Vocabulary',
          Term: '咲き誇る',
          Reading: 'さきほこる',
          Meaning: 'Nở rộ khoe sắc rực rỡ',
          Level: 'N3',
          Example: '桜の花が満開に咲き誇っている。',
        },
        {
          Type: 'Kanji',
          Term: '咲',
          Reading: 'ショウ / さ.く',
          Meaning: 'TIẾU (Nở hoa, mỉm cười)',
          Level: 'N3',
          Example: '春になると花が咲く。',
        },
        {
          Type: 'Grammar',
          Term: '〜に違いない',
          Reading: '〜にちがいない',
          Meaning: 'Chắc chắn là, nhất định là...',
          Level: 'N3',
          Example: 'V-thường + に違いない | 明日は雨に違いない。',
        },
        {
          Type: 'Vocabulary',
          Term: '桜吹雪',
          Reading: 'さくらふぶき',
          Meaning: 'Trận mưa hoa anh đào bay trong gió',
          Level: 'N3',
          Example: '風が吹いて桜吹雪が舞った。',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'HocLieu_RikiPath');
      XLSX.writeFile(wb, 'RikiPath_Mau_Nhap_Hoc_Lieu_JLPT.xlsx');
    } catch {
      // Fallback to CSV
      const csv =
        '\uFEFF' +
        'Type,Term,Reading,Meaning,Level,Example\n' +
        'Vocabulary,咲き誇る,さきほこる,Nở rộ khoe sắc rực rỡ,N3,桜の花が満開に咲き誇っている。\n' +
        'Kanji,咲,ショウ / さ.く,TIẾU (Nở hoa),N3,春になると花が咲く。\n' +
        'Grammar,〜に違いない,〜にちがいない,Chắc chắn là,N3,明日は雨に違いない。\n';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RikiPath_Mau_Nhap_Hoc_Lieu_JLPT.csv';
      a.click();
    }
  };

  // Submit Reviewed File to API: https://localhost:7237/api/content-management/bulk-import
  const handleSubmitToApi = async () => {
    setIsSubmitting(true);
    setApiError('');
    setApiResult(null);

    try {
      let fileToUpload = selectedFile;

      // Convert current edited records to a clean Excel (.xlsx) or CSV file with standard backend columns
      try {
        const XLSX = await loadXlsxLib();
        const exportRows = records.map((r) => ({
          Type: r.type || 'Vocabulary',
          Term: r.term || '',
          Reading: r.furigana || '',
          Meaning: r.meaning || '',
          Level: r.level || 'N3',
          Example: r.example || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'HocLieu_Import');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        const fileName = selectedFile?.name?.replace(/\.[^/.]+$/, '.xlsx') || 'bulk_import_reviewed.xlsx';
        fileToUpload = new File([excelBuffer], fileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } catch (genErr) {
        console.warn('Could not generate XLSX binary, falling back to UTF-8 CSV:', genErr);
        const csvHeader = 'Type,Term,Reading,Meaning,Level,Example\n';
        const csvRows = records.map(r => `"${r.type || 'Vocabulary'}","${(r.term || '').replace(/"/g, '""')}","${(r.furigana || '').replace(/"/g, '""')}","${(r.meaning || '').replace(/"/g, '""')}","${r.level || 'N3'}","${(r.example || '').replace(/"/g, '""')}"`).join('\n');
        const csvContent = '\uFEFF' + csvHeader + csvRows;
        fileToUpload = new File([csvContent], 'bulk_import_reviewed.csv', { type: 'text/csv' });
      }

      const response = await uploadBulkImportFile(fileToUpload, {
        conflictRule,
        targetLevel: 'N3',
      });

      setApiResult({
        success: true,
        message:
          response?.message ||
          response?.result?.message ||
          `Đã nạp thành công ${records.length} bản ghi học liệu lên API backend!`,
        data: response?.result || response,
      });
    } catch (err) {
      console.error('Bulk import API submit error:', err);
      setApiError(
        err.message ||
          'Không thể gửi file lên API https://localhost:7237/api/content-management/bulk-import. Hãy kiểm tra backend server đang chạy.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Kanji':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold whitespace-nowrap">
            <PenTool className="w-3 h-3 text-amber-600" />
            Hán tự (Kanji)
          </span>
        );
      case 'Grammar':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold whitespace-nowrap">
            <BookOpen className="w-3 h-3 text-indigo-600" />
            Ngữ pháp (Grammar)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-[#D94B68] border border-rose-200 text-xs font-bold whitespace-nowrap">
            <Languages className="w-3 h-3 text-[#D94B68]" />
            Từ vựng (Vocabulary)
          </span>
        );
    }
  };

  return (
    <CmsShell pathname={pathname} breadcrumb="Import hàng loạt">
      <div className="bg-[#FAF7F5] font-sans antialiased text-[#2D282A] min-h-screen pb-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
          {/* Header & Page Top Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-[#EADFD9]">
            <div className="flex flex-col gap-1.5">
              <nav className="flex items-center gap-1.5 text-[#6E686A] text-xs">
                <span>Kho học liệu</span>
                <span className="text-[#9E8E93]">/</span>
                <span>Công cụ CMS</span>
                <span className="text-[#9E8E93]">/</span>
                <span className="text-[#E05A7A] font-semibold bg-[#FDF0F4] border border-[#F8BBD0] px-2 py-0.5 rounded text-[11px]">
                  Import Excel / CSV
                </span>
              </nav>
              <h1 className="text-2xl lg:text-[28px] text-[#2D282A] font-bold tracking-tight flex items-center gap-2">
                Import Học liệu (Kanji, Từ vựng, Ngữ pháp)
                <span className="px-2.5 py-0.5 rounded-full bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] text-[11px] font-bold uppercase tracking-wider">
                  Excel & CSV Parser
                </span>
              </h1>
              <p className="text-xs text-[#6E686A] max-w-4xl leading-relaxed">
                Tải lên tập tin <strong>.xlsx, .xls, .csv</strong>. Hệ thống tự động phân tích và hiển thị nội dung trực quan để Content Author review, lọc theo <strong>Kanji, Vocabulary, Grammar Pattern</strong> và chỉnh sửa trước khi gửi API.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <button
                onClick={handleDownloadSampleTemplate}
                className="px-4 py-2 rounded-xl bg-white border border-[#EADFD9] hover:border-[#E05A7A]/50 text-[#2D282A] font-semibold text-xs transition-all flex items-center gap-2 shadow-xs hover:shadow cursor-pointer"
                type="button"
              >
                <Download className="w-4 h-4 text-[#E05A7A]" />
                <span>Tải file mẫu Excel (.xlsx)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E05A7A] to-[#C94766] text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm shadow-[#E05A7A]/25 cursor-pointer"
                type="button"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>Tải lên file Excel / CSV</span>
              </button>
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className="w-full bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-xs mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#E8F5E9]/60 border border-[#2E7D32]/20">
                <div className="w-8 h-8 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-semibold shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#2E7D32] font-bold uppercase tracking-wider">
                    Bước 1 • Đã tải file
                  </span>
                  <span className="text-xs text-[#2D282A] font-semibold truncate">
                    {fileMetadata.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#E8F5E9]/60 border border-[#2E7D32]/20">
                <div className="w-8 h-8 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-semibold shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#2E7D32] font-bold uppercase tracking-wider">
                    Bước 2 • Tự động Parse
                  </span>
                  <span className="text-xs text-[#2D282A] font-semibold truncate">
                    Đã đọc {records.length} dòng
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FDF0F4] border-2 border-[#E05A7A]/60 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#E05A7A] flex items-center justify-center text-white font-bold shrink-0">
                  <span className="text-xs">3</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#E05A7A] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E05A7A] animate-ping" />
                    Bước 3 • Đang Review
                  </span>
                  <span className="text-xs text-[#2D282A] font-bold truncate">
                    Lọc & Sửa trước khi gửi
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] opacity-70">
                <div className="w-8 h-8 rounded-full bg-[#EADFD9] flex items-center justify-center text-[#6E686A] font-bold shrink-0">
                  <span className="text-xs">4</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#9E8E93] uppercase tracking-wider font-semibold">
                    Bước 4 • Chờ gọi API
                  </span>
                  <span className="text-xs text-[#6E686A] font-medium truncate">
                    https://localhost:7237
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* API Response Alert */}
          {apiResult && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold">Import Thành Công Lên API Backend!</h4>
                <p className="text-xs text-emerald-800 mt-1">{apiResult.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-emerald-100 font-mono text-[11px] font-bold text-emerald-800">
                    Endpoint: https://localhost:7237/api/content-management/bulk-import
                  </span>
                </div>
              </div>
              <button
                onClick={() => setApiResult(null)}
                className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {apiError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 animate-in fade-in">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold">Lỗi Khi Gọi API Bulk Import</h4>
                <p className="text-xs text-rose-800 mt-1">{apiError}</p>
                <span className="inline-block mt-2 px-2.5 py-1 rounded bg-rose-100 font-mono text-[11px] text-rose-800">
                  Target: https://localhost:7237/api/content-management/bulk-import
                </span>
              </div>
              <button
                onClick={() => setApiError('')}
                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (8 cols): Data Review Table & Filter */}
            <div className="xl:col-span-8 flex flex-col gap-6 min-w-0">
              {/* File Info Bar */}
              <div className="bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A] shadow-xs shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#2D282A] truncate">
                        {fileMetadata.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        Đã Parse Sẵn Sàng
                      </span>
                    </div>
                    <span className="text-xs text-[#6E686A] truncate">
                      Dung lượng: {fileMetadata.size} • Tổng cộng {records.length} bản ghi học liệu • Nạp lúc {fileMetadata.uploadedAt}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] hover:border-[#E05A7A]/40 text-[#2D282A] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    type="button"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#E05A7A] ${isParsing ? 'animate-spin' : ''}`} />
                    <span>Đổi file khác</span>
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] hover:bg-[#E05A7A] hover:text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    type="button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng</span>
                  </button>
                </div>
              </div>

              {/* FILTER BAR 1: LỌC THEO LOẠI HỌC LIỆU (KANJI / VOCABULARY / GRAMMAR) */}
              <div className="bg-white rounded-2xl border border-[#EADFD9] p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D282A] flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-[#E05A7A]" />
                    Phân loại:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTypeFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        typeFilter === 'ALL'
                          ? 'bg-[#2D282A] text-white shadow-xs'
                          : 'bg-[#FAF7F5] text-[#6E686A] hover:bg-gray-100'
                      }`}
                    >
                      Tất cả ({countAll})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTypeFilter('Kanji')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        typeFilter === 'Kanji'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      Hán tự / Kanji ({countKanji})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTypeFilter('Vocabulary')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        typeFilter === 'Vocabulary'
                          ? 'bg-[#D94B68] text-white shadow-xs'
                          : 'bg-rose-50 text-[#D94B68] border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                      Từ vựng / Vocab ({countVocab})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTypeFilter('Grammar')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        typeFilter === 'Grammar'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Ngữ pháp / Pattern ({countGrammar})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-2.5 text-[#9E8E93]" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm từ, kanji, nghĩa..."
                      className="pl-8 pr-3 py-1.5 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs text-[#2D282A] w-44 focus:outline-none focus:border-[#E05A7A] focus:ring-1 focus:ring-[#E05A7A]/30"
                    />
                  </div>
                </div>
              </div>

              {/* KPI Summary Status Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  onClick={() => setStatusFilter('ALL')}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                    statusFilter === 'ALL' ? 'border-[#E05A7A] ring-2 ring-[#E05A7A]/20' : 'border-[#EADFD9] hover:border-[#E05A7A]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#6E686A] uppercase font-bold tracking-wider">
                      Tổng bản ghi
                    </span>
                    <Layers className="w-4 h-4 text-[#9E8E93]" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-[#2D282A]">{countAll}</span>
                    <span className="text-[10px] text-[#9E8E93]">Đã parse</span>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('VALID')}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                    statusFilter === 'VALID' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-[#EADFD9] hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#2E7D32] uppercase font-bold tracking-wider">
                      Hợp lệ sẵn sàng
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-[#2E7D32]">{countValid}</span>
                    <span className="text-[10px] text-[#2E7D32] font-bold">
                      {countAll > 0 ? `${((countValid / countAll) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('WARNING')}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                    statusFilter === 'WARNING' ? 'border-[#E05A7A] ring-2 ring-[#E05A7A]/20' : 'border-[#EADFD9] hover:border-[#E05A7A]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#E05A7A] uppercase font-bold tracking-wider">
                      Cảnh báo Furigana
                    </span>
                    <AlertTriangle className="w-4 h-4 text-[#E05A7A]" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-[#E05A7A]">{countWarning}</span>
                    <span className="text-[10px] text-[#E05A7A]">Tự động fix</span>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('ERROR')}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                    statusFilter === 'ERROR' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-[#EADFD9] hover:border-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-red-600 uppercase font-bold tracking-wider">
                      Lỗi cần sửa
                    </span>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-red-600">{countError}</span>
                    <span className="text-[10px] text-red-500">Cần bổ sung</span>
                  </div>
                </div>
              </div>

              {/* Data Table Review Section */}
              <div className="bg-white rounded-2xl border border-[#EADFD9] shadow-xs overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF7F5] border-b border-[#EADFD9] text-[11px] font-bold uppercase tracking-wider text-[#9E8E93]">
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-3">Phân loại</th>
                        <th className="py-3 px-3">Từ vựng / Hán tự / Mẫu câu</th>
                        <th className="py-3 px-3">Furigana / Âm đọc</th>
                        <th className="py-3 px-3">Nghĩa tiếng Việt</th>
                        <th className="py-3 px-3">Trình độ</th>
                        <th className="py-3 px-3">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác sửa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EADFD9] text-[#2D282A]">
                      {isParsing ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[#6E686A]">
                            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#E05A7A] mb-2" />
                            <p className="font-semibold text-sm">Đang phân tích dữ liệu tập tin...</p>
                          </td>
                        </tr>
                      ) : recordsOnPage.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[#6E686A]">
                            <FileText className="w-8 h-8 mx-auto text-[#9E8E93] mb-2" />
                            <p className="font-semibold text-sm">Không tìm thấy bản ghi nào khớp với bộ lọc.</p>
                          </td>
                        </tr>
                      ) : (
                        recordsOnPage.map((r) => (
                          <tr key={r.id} className="hover:bg-[#FAF7F5]/80 transition-colors group">
                            <td className="py-3 px-3 text-center font-bold text-[#6E686A]">
                              #{r.lineNumber || r.id}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getTypeBadge(r.type)}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-sm text-[#2D282A]">{r.term}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[#6E686A] font-medium">{r.furigana || '—'}</span>
                            </td>
                            <td className="py-3 px-3 max-w-xs">
                              <p className="truncate text-[#2D282A] font-medium" title={r.meaning}>
                                {r.meaning || '—'}
                              </p>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-gray-100 font-bold text-[11px] text-[#2D282A]">
                                {r.level}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {r.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  <Check className="w-3 h-3" /> Hợp lệ
                                </span>
                              ) : r.status === 'warning' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold"
                                  title={r.warning || 'Cảnh báo format'}
                                >
                                  <AlertTriangle className="w-3 h-3" /> Cảnh báo
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold"
                                  title={r.warning || 'Lỗi dữ liệu'}
                                >
                                  <XCircle className="w-3 h-3" /> Lỗi
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingRow(r)}
                                  className="p-1.5 rounded-lg bg-[#FAF7F5] hover:bg-[#FDF0F4] text-[#6E686A] hover:text-[#E05A7A] border border-[#EADFD9] transition-colors cursor-pointer"
                                  title="Chỉnh sửa dòng này"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(r.id)}
                                  className="p-1.5 rounded-lg bg-[#FAF7F5] hover:bg-rose-50 text-[#6E686A] hover:text-rose-600 border border-[#EADFD9] transition-colors cursor-pointer"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Reusable Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="bản ghi"
                  variant="sakura"
                />

                {/* Quick Action Footer inside Table Card */}
                <div className="p-3 bg-[#FAF7F5] border-t border-[#EADFD9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#6E686A]">
                    <Sparkles className="w-4 h-4 text-[#E05A7A]" />
                    <span>Review kỹ thông tin trước khi gửi lên API backend.</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {countWarning > 0 && (
                      <button
                        onClick={handleAutoFixAllWarnings}
                        className="px-3 py-1 rounded-xl bg-[#FDF0F4] text-[#E05A7A] border border-[#F8BBD0] hover:bg-[#E05A7A] hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        type="button"
                      >
                        <Sparkles className="w-3 h-3" />
                        Tự động sửa {countWarning} cảnh báo
                      </button>
                    )}
                    {countError > 0 && (
                      <button
                        onClick={handleRemoveErrorRows}
                        className="px-3 py-1 rounded-xl bg-white border border-[#EADFD9] hover:bg-rose-50 text-rose-600 font-semibold transition-colors cursor-pointer"
                        type="button"
                      >
                        Loại bỏ {countError} dòng lỗi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (4 cols) - Settings & API Dispatch */}
            <div className="xl:col-span-4 flex flex-col gap-6 min-w-0">
              {/* Card 1: API Configuration */}
              <div className="bg-white rounded-2xl border border-[#EADFD9] p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#EADFD9]">
                  <div className="w-8 h-8 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A]">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold text-[#2D282A]">Cấu hình Nạp API Backend</h3>
                    <span className="text-[10px] text-[#9E8E93]">Endpoint Bulk Import</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl">
                  <p className="text-[10px] text-[#9E8E93] font-bold uppercase tracking-wider">
                    API Endpoint Mục Tiêu:
                  </p>
                  <p className="text-xs font-mono font-bold text-[#E05A7A] break-all mt-0.5">
                    https://localhost:7237/api/content-management/bulk-import
                  </p>
                  <p className="text-[11px] text-[#6E686A] mt-1">
                    Request Body: <code className="font-semibold text-[#2D282A]">FormData (file)</code>
                  </p>
                </div>

                {/* Duplication Conflict Rules */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E8E93]">
                    Quy tắc xử lý bản ghi trùng:
                  </span>
                  <label
                    onClick={() => setConflictRule('skip')}
                    className={`flex items-start gap-2 p-2.5 rounded-xl cursor-pointer border transition-all ${
                      conflictRule === 'skip'
                        ? 'bg-[#FDF0F4] border-[#F8BBD0] text-[#E05A7A]'
                        : 'hover:bg-[#FAF7F5] border-transparent hover:border-[#EADFD9] text-[#2D282A]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="conflict-rule"
                      checked={conflictRule === 'skip'}
                      onChange={() => setConflictRule('skip')}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Bỏ qua bản ghi trùng</span>
                      <span className="text-[10px] text-[#6E686A]">
                        Giữ nguyên dữ liệu cũ trên database.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setConflictRule('overwrite')}
                    className={`flex items-start gap-2 p-2.5 rounded-xl cursor-pointer border transition-all ${
                      conflictRule === 'overwrite'
                        ? 'bg-[#FDF0F4] border-[#F8BBD0] text-[#E05A7A]'
                        : 'hover:bg-[#FAF7F5] border-transparent hover:border-[#EADFD9] text-[#2D282A]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="conflict-rule"
                      checked={conflictRule === 'overwrite'}
                      onChange={() => setConflictRule('overwrite')}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Ghi đè bản ghi cũ</span>
                      <span className="text-[10px] text-[#6E686A]">
                        Cập nhật nội dung mới từ file nạp.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 2: Summary & Submit to API */}
              <div className="bg-white rounded-2xl border border-[#EADFD9] p-5 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-bold text-[#2D282A]">Tổng kết dữ liệu sẵn sàng</h3>
                <div className="space-y-2 text-xs text-[#6E686A]">
                  <div className="flex justify-between py-1 border-b border-[#EADFD9]">
                    <span>Tổng số bản ghi:</span>
                    <strong className="text-[#2D282A]">{records.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EADFD9]">
                    <span>Hán tự (Kanji):</span>
                    <strong className="text-amber-800">{countKanji}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EADFD9]">
                    <span>Từ vựng (Vocabulary):</span>
                    <strong className="text-[#D94B68]">{countVocab}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EADFD9]">
                    <span>Ngữ pháp (Grammar):</span>
                    <strong className="text-indigo-800">{countGrammar}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EADFD9]">
                    <span>Bản ghi hợp lệ:</span>
                    <strong className="text-emerald-700">{countValid}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitToApi}
                  disabled={isSubmitting || records.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#E05A7A] to-[#C94766] hover:opacity-95 text-white font-bold text-sm shadow-md shadow-[#E05A7A]/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang nạp dữ liệu lên API 7237...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi & Nạp vào API Backend</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: CHỈNH SỬA DÒNG BẢN GHI */}
        {editingRow && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#F8BBD0]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EADFD9]">
                <div className="flex items-center gap-2 text-[#E05A7A] font-bold">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="text-base text-[#2D282A]">
                    Chỉnh sửa dòng #{editingRow.lineNumber || editingRow.id}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingRow(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedRow} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">Loại học liệu</label>
                  <select
                    value={editingRow.type}
                    onChange={(e) => setEditingRow({ ...editingRow, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                  >
                    <option value="Vocabulary">Từ vựng (Vocabulary)</option>
                    <option value="Kanji">Hán tự (Kanji)</option>
                    <option value="Grammar">Ngữ pháp (Grammar Pattern)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">
                    Từ vựng / Hán tự / Mẫu câu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRow.term}
                    onChange={(e) => setEditingRow({ ...editingRow, term: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#E05A7A]"
                    placeholder="VD: 咲き誇る"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">
                    Furigana / Âm đọc Hiragana
                  </label>
                  <input
                    type="text"
                    value={editingRow.furigana}
                    onChange={(e) => setEditingRow({ ...editingRow, furigana: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                    placeholder="VD: さきほこる"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">
                    Nghĩa tiếng Việt <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editingRow.meaning}
                    onChange={(e) => setEditingRow({ ...editingRow, meaning: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                    placeholder="VD: Nở rộ khoe sắc rực rỡ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2D282A] mb-1">Trình độ JLPT</label>
                    <select
                      value={editingRow.level}
                      onChange={(e) => setEditingRow({ ...editingRow, level: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                    >
                      <option value="N5">N5</option>
                      <option value="N4">N4</option>
                      <option value="N3">N3</option>
                      <option value="N2">N2</option>
                      <option value="N1">N1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#2D282A] mb-1">Ví dụ / Cấu trúc</label>
                    <input
                      type="text"
                      value={editingRow.example || ''}
                      onChange={(e) => setEditingRow({ ...editingRow, example: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                      placeholder="VD: 桜の花が..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EADFD9]">
                  <button
                    type="button"
                    onClick={() => setEditingRow(null)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F5] hover:bg-gray-100 text-[#6E686A] font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#E05A7A] hover:bg-[#C94766] text-white font-bold shadow-sm cursor-pointer"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: THÊM DÒNG MỚI */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#F8BBD0]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EADFD9]">
                <div className="flex items-center gap-2 text-[#E05A7A] font-bold">
                  <Plus className="w-5 h-5" />
                  <h3 className="text-base text-[#2D282A]">Thêm dòng học liệu mới</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewRow} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">Loại học liệu</label>
                  <select
                    value={newRowForm.type}
                    onChange={(e) => setNewRowForm({ ...newRowForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                  >
                    <option value="Vocabulary">Từ vựng (Vocabulary)</option>
                    <option value="Kanji">Hán tự (Kanji)</option>
                    <option value="Grammar">Ngữ pháp (Grammar Pattern)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">
                    Từ vựng / Hán tự / Mẫu câu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRowForm.term}
                    onChange={(e) => setNewRowForm({ ...newRowForm, term: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#E05A7A]"
                    placeholder="VD: 桜 (Anh đào)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">Furigana / Âm đọc</label>
                  <input
                    type="text"
                    value={newRowForm.furigana}
                    onChange={(e) => setNewRowForm({ ...newRowForm, furigana: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                    placeholder="VD: さくら"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D282A] mb-1">
                    Nghĩa tiếng Việt <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newRowForm.meaning}
                    onChange={(e) => setNewRowForm({ ...newRowForm, meaning: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#EADFD9] rounded-xl text-xs focus:outline-none focus:border-[#E05A7A]"
                    placeholder="VD: Hoa anh đào"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EADFD9]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F5] hover:bg-gray-100 text-[#6E686A] font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#E05A7A] hover:bg-[#C94766] text-white font-bold shadow-sm cursor-pointer"
                  >
                    Thêm vào danh sách
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CmsShell>
  );
}
