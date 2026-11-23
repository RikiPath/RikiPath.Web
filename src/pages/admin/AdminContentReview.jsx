import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ShieldCheck, X } from 'lucide-react';
import { AdminShell } from '@/layouts';
import {
  getPendingApprovals,
  reviewContentRequest,
  reviewLessonGroup,
  batchReviewContentRequests,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui/feedbackStore.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Modal,
  Pagination,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
  Tabs,
  Textarea,
  UnifiedToolbar,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import AdminSrsTemplatesPanel from '@/features/admin/components/AdminSrsTemplatesPanel.jsx';
import AdminPublishManagerPanel from '@/features/admin/components/AdminPublishManagerPanel.jsx';
import AdminModerationV2Panel from '@/features/admin/components/AdminModerationV2Panel.jsx';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const approvalKeys = {
  all: ADMIN_KEYS.contentApprovals,
  list: (params) => [...ADMIN_KEYS.contentApprovals, 'list', params],
};

const ENTITY_TYPES = [
  { value: '', label: 'Tất cả loại' },
  { value: 'Kanji', label: 'Hán tự (Kanji)' },
  { value: 'Vocabulary', label: 'Từ vựng (Vocabulary)' },
  { value: 'Grammar', label: 'Ngữ pháp (Grammar)' },
  { value: 'Lesson', label: 'Bài học (Lesson)' },
  { value: 'MockTest', label: 'Đề thi thử (Mock Test)' },
  { value: 'PracticeExercise', label: 'Bài tập luyện tập (Practice Exercise)' },
];

const FIELD_LABELS = {
  character: 'Ký tự',
  meaning: 'Nghĩa',
  sinoVietnamese: 'Âm Hán Việt',
  onYomi: 'Âm On',
  kunYomi: 'Âm Kun',
  strokeCount: 'Số nét',
  certificateLevelCode: 'Cấp độ',
  lessonTitle: 'Bài học',
  title: 'Tiêu đề',
  description: 'Mô tả',
  sortOrder: 'Thứ tự',
  languageSkillName: 'Kỹ năng',
  timeLimitMinutes: 'Thời gian (phút)',
  isPlacementAssessment: 'Bài kiểm tra đầu vào',
  sections: 'Cấu trúc đề thi',
};

// Các field được render riêng bằng UI chuyên biệt (SectionsViewer / <details> câu hỏi PracticeExercise)
// nên không hiển thị lại dạng text thô trong danh sách field chung, tránh bị in JSON 2 lần.
const RAW_DUMP_EXCLUDED_FIELDS = ['lessonTitle', 'questions', 'sections'];

const ACTION_META = {
  New: { label: 'Mới', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Modified: { label: 'Chỉnh sửa', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Unchanged: { label: 'Không thay đổi', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
  Error: { label: 'Đã có', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Pending: { label: 'Chờ duyệt', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
};

function ActionBadge({ action }) {
  const { tr } = useLocale();
  const meta = ACTION_META[action] || ACTION_META.Pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text} ${meta.border}`}>
      {tr(meta.label)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sections viewer (Mock Test): Section -> Question -> Option
// ---------------------------------------------------------------------------

// Parse an toàn: giá trị có thể là string JSON (có thể bị serialize 2 lần) hoặc đã là mảng
function parseSections(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  try {
    let parsed = JSON.parse(value);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Backend có thể trả PascalCase (Title) hoặc camelCase (title) -> đọc cả hai
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] != null) return obj[k];
  return null;
};

function OptionLine({ opt, index }) {
  const { trf, tr } = useLocale();
  const text = pick(opt, 'OptionText', 'optionText');
  const correct = pick(opt, 'IsCorrect', 'isCorrect') === true;
  return (
    <li
      className={[
        'flex items-start gap-2 rounded-md px-2 py-1 text-[12px]',
        correct ? 'bg-emerald-100 font-semibold text-emerald-800' : 'text-rp-text',
      ].join(' ')}
    >
      <span className="w-4 shrink-0 text-rp-text-muted">{String.fromCharCode(65 + index)}.</span>
      <span className="min-w-0 flex-1 break-words">
        {tr(text)}
        {pick(opt, 'ImageUrl', 'imageUrl') && <img src={pick(opt, 'ImageUrl', 'imageUrl')} alt={trf('Hình đáp án {0}', { 0: index + 1 })} className="max-h-32 max-w-full rounded-md" />}
      </span>
      {correct && <Icon name="check_circle" className="text-[14px]" />}
    </li>
  );
}

function QuestionBlock({ q, index }) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);
  const options = pick(q, 'Options', 'options') ?? [];
  const explanation = pick(q, 'Explanation', 'explanation');
  const answerKey = pick(q, 'AnswerKey', 'answerKey');
  const audio = pick(q, 'AudioUrl', 'audioUrl');
  const image = pick(q, 'ImageUrl', 'imageUrl');
  const interaction = pick(q, 'InteractionData', 'interactionData');
  const passageText = interaction && typeof interaction === 'object'
    ? [pick(interaction, 'passage', 'Passage'), pick(interaction, 'secondPassage', 'SecondPassage')]
        .filter((s) => typeof s === 'string' && s.trim())
        .join('\n\n---\n\n')
    : '';

  return (
    <div className="rounded-lg border border-rp-line bg-white p-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-rp-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-rp-brand">
          {tr('Câu')}{' '}{pick(q, 'SortOrder', 'sortOrder') ?? index + 1}
        </span>
        <p className="flex-1 text-[13px] font-medium break-words">{pick(q, 'QuestionText', 'questionText')}</p>
        <span className="shrink-0 text-[10px] text-rp-text-muted">{pick(q, 'QuestionType', 'questionType')}</span>
      </div>

      {passageText && (
        <div className="mt-2 rounded-lg border border-rp-line bg-slate-50 p-2.5 text-xs">
          <p className="font-semibold text-rp-text">{tr('Đoạn đọc')}</p>
          <p className="rp-jp mt-1 whitespace-pre-wrap text-rp-text-2">{passageText}</p>
        </div>
      )}
      {image && <img src={image} alt="" className="mt-2 max-h-40 rounded-md border border-rp-line" />}
      {audio && <audio controls src={audio} className="mt-2 h-8 w-full" />}

      {options.length > 0 && (
        <ul className="mt-2 space-y-1">
          {options.map((o, i) => <OptionLine key={i} opt={o} index={i} />)}
        </ul>
      )}

      {answerKey && (
        <p className="mt-2 text-[12px]">
          <span className="font-semibold text-rp-text-2">{tr('Đáp án:')}{' '}</span>{answerKey}
        </p>
      )}

      {explanation && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] font-semibold text-sky-700 rp-underline"
          >
            {open ? tr('Ẩn giải thích') : tr('Xem giải thích')}
          </button>
          {open && <p className="mt-1 rounded-md bg-sky-50 p-2 text-[12px] text-sky-900 break-words">{explanation}</p>}
        </div>
      )}
    </div>
  );
}

function SectionsViewer({ sections }) {
  const { trf } = useLocale();
  const [openIdx, setOpenIdx] = useState(0); // mở sẵn section đầu
  const totalQuestions = sections.reduce(
    (n, s) => n + (pick(s, 'Questions', 'questions')?.length ?? 0), 0
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-rp-text-2">
        {trf('{0} phần · {1} câu hỏi', { 0: sections.length, 1: totalQuestions })}
      </p>
      {sections.map((s, i) => {
        const questions = pick(s, 'Questions', 'questions') ?? [];
        const isOpen = openIdx === i;
        return (
          <div key={i} className="rounded-xl border border-rp-line bg-rp-bg-2">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">
                  {pick(s, 'SortOrder', 'sortOrder') ?? i + 1}. {pick(s, 'Title', 'title')}
                </p>
                <p className="text-[11px] text-rp-text-muted">
                  {trf('{0} · {1} · {2} câu', { 0: pick(s, 'LanguageSkillName', 'languageSkillName'), 1: pick(s, 'CertificateSectionCode', 'certificateSectionCode'), 2: questions.length })}
                </p>
              </div>
              <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-[18px] text-rp-text-muted" />
            </button>
            {isOpen && (
              <div className="space-y-2 px-3 pb-3">
                {questions.map((q, qi) => <QuestionBlock key={qi} q={q} index={qi} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FieldRow({ f }) {
  const displayLabel = FIELD_LABELS[f.field] ?? f.label ?? f.field;

  // Field sections: render dạng cây, chiếm trọn chiều rộng
  if (f.field === 'sections') {
    const sections = parseSections(f.newValue ?? f.oldValue);
    if (sections) {
      return (
        <tr className="bg-amber-50/40">
          <td colSpan={3} className="py-3 px-4 align-top">
            <p className="mb-2 text-[12px] font-semibold text-rp-text-2">{displayLabel}</p>
            <SectionsViewer sections={sections} />
          </td>
        </tr>
      );
    }
  }

  if (f.isChanged) {
    return (
      <tr className="bg-amber-50/70">
        <td className="py-2 pl-4 pr-3 align-top text-[12px] font-semibold text-rp-text-2 whitespace-nowrap w-32">{displayLabel}</td>
        <td className="py-2 pr-3 align-top text-[12px] text-rp-text break-all min-w-[160px] max-w-md">
          {f.oldValue != null ? <span className="line-through text-rose-400">{f.oldValue}</span> : <span className="italic text-rp-text-muted">—</span>}
        </td>
        <td className="py-2 pr-4 align-top text-[12px] font-medium text-emerald-700 break-words min-w-[180px] max-w-md">
          {f.newValue ?? <span className="italic text-rp-text-muted">—</span>}
        </td>
      </tr>
    );
  }
  return (
    <tr className="transition-colors duration-150 hover:bg-rp-row-hover">
      <td className="py-2 pl-4 pr-3 align-top text-[12px] font-semibold text-rp-text-2 whitespace-nowrap w-32">{displayLabel}</td>
      <td colSpan={2} className="py-2 pr-4 align-top text-[12px] text-rp-text break-words">
        {f.newValue ?? f.oldValue ?? <span className="italic text-rp-text-muted">—</span>}
      </td>
    </tr>
  );
}

function LessonRelatedContent({ items = [] }) {
  const { tr, trf } = useLocale();
  if (!Array.isArray(items) || !items.length) return null;
  const grouped = items.reduce((result, item) => {
    (result[item.entityType] ??= []).push(item);
    return result;
  }, {});
  const labels = { Kanji: 'Hán tự', Grammar: 'Ngữ pháp', Vocabulary: 'Từ vựng', PracticeExercise: 'Bài tập luyện tập' };
  return (
    <section className="rounded-xl border border-rp-line bg-rp-bg-2 p-4">
      <h3 className="mb-3 text-[14px] font-bold text-rp-text">{tr('Nội dung liên quan trong bài học')}</h3>
      <div className="space-y-3">
        {Object.entries(grouped).map(([type, entries]) => (
          <div key={type}>
            <h4 className="mb-1 text-[12px] font-semibold text-rp-text-2">{labels[type] ?? type} ({entries.length})</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {entries.map((entry, index) => (
                <article key={`${entry.requestId ?? 'db'}-${entry.rowKey}-${index}`} className="rounded-lg border border-rp-line bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-rp-text">{entry.rowKey}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {entry.status === 'Approved' ? tr('Đã có trong bài') : tr('Chờ duyệt cùng bài')}
                    </span>
                  </div>
                  {/* Loại bỏ các field đã có UI riêng (lessonTitle/questions/sections) để tránh in JSON thô 2 lần */}
                  {entry.fields
                    ?.filter((field) => !RAW_DUMP_EXCLUDED_FIELDS.includes(field.field))
                    .map((field) => (
                      <p key={field.field} className="mt-1 whitespace-pre-wrap text-[12px] text-rp-text-2">
                        <span className="font-semibold">{field.label || field.field}:</span> {field.newValue ?? field.oldValue ?? '—'}
                      </p>
                    ))}
                  {type === 'PracticeExercise' && (() => {
                    const raw = entry.fields?.find((field) => field.field?.toLowerCase() === 'questions')?.newValue;
                    let questions;
                    try { questions = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { questions = null; }
                    if (!Array.isArray(questions)) return null;
                    return (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[12px] font-semibold text-emerald-700">{trf('Xem {0} câu hỏi', { 0: questions.length })}</summary>
                        <ol className="mt-2 list-decimal space-y-2 pl-5">
                          {questions.map((question, questionIndex) => (
                            <li key={question.sortOrder ?? question.SortOrder ?? questionIndex}>
                              <p className="whitespace-pre-wrap">{question.questionText ?? question.QuestionText}</p>
                              <ul className="mt-1 list-disc pl-4">
                                {(question.options ?? question.Options ?? []).map((option, optionIndex) => (
                                  <li key={option.sortOrder ?? option.SortOrder ?? optionIndex} className={option.isCorrect ?? option.IsCorrect ? 'font-semibold text-emerald-700' : ''}>
                                    {option.optionText ?? option.OptionText}
                                  </li>
                                ))}
                              </ul>
                              {(question.explanation ?? question.Explanation) && (
                                <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-[11.5px] text-rp-text-2">
                                  <span className="font-semibold text-rp-text">{tr('Giải thích')}: </span>
                                  {question.explanation ?? question.Explanation}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </details>
                    );
                  })()}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailPanel({ item, onApprove, onReject, onApproveGroup, onRejectGroup, submitting }) {
  const { tr, trf } = useLocale();
  const [reason, setReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const fields = Array.isArray(item.fields) ? item.fields : [];
  const changedCount = fields.filter((f) => f.isChanged).length;

  const handleApprove = () => {
    onApprove(item);
    setShowRejectForm(false);
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(item, reason.trim());
    setReason('');
    setShowRejectForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-bold text-rp-text leading-tight">{item.rowKey}</p>
          <p className="mt-1 text-[12px] text-rp-text-muted">
            <span className="font-semibold text-rp-text-2">{item.entityType}</span>
            {' · '}{tr('Người gửi:')}{' '}{item.submittedByName ?? '—'}
            {item.submittedAt ? ' · ' + new Date(item.submittedAt).toLocaleString(currentIntlTag()) : ''}
          </p>
          {changedCount > 0 && <p className="mt-1 text-[12px] font-semibold text-amber-600">{trf('{0} trường thay đổi', { 0: changedCount })}</p>}
        </div>
        <ActionBadge action={item.action} />
      </div>

      {fields.length > 0 && (
        <div className="rp-scroll-x rounded-xl border border-rp-line bg-white">
          <table className="w-full min-w-[540px] text-center">
            <thead>
              <tr className="border-b border-rp-line bg-rp-table-head">
                <th className="py-2 pl-4 pr-3 text-[10px] font-bold text-rp-text-2 uppercase tracking-wide w-32">{tr('Trường')}</th>
                <th className="py-2 pr-3 text-[10px] font-bold text-rp-text-2 uppercase tracking-wide">{tr('Cũ (DB)')}</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-rp-text-2 uppercase tracking-wide">{tr('Mới (Excel)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rp-line/70">
              {fields.map((f) => <FieldRow key={f.field} f={f} />)}
            </tbody>
          </table>
        </div>
      )}

      {item.entityType === 'Lesson' && <LessonRelatedContent items={item.relatedLessonContent} />}

      <div className="flex flex-col gap-2 pt-2 border-t border-[#f0e8e4]">
        {showRejectForm ? (
          <>
            <label className="text-[13px] font-semibold text-rp-text">
              {tr('Lý do từ chối')}{' '}<span className="text-rp-danger" aria-hidden="true">*</span>
              <Textarea
                className="mt-1.5 resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr('Nhập lý do từ chối cụ thể cho mục này...')}
                autoFocus
              />
            </label>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>
                {tr('Huỷ')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!reason.trim() || submitting}
                loading={submitting}
                onClick={handleReject}
              >
                {submitting ? tr('Đang xử lý…') : tr('Xác nhận từ chối')}
              </Button>
              {item.entityType === 'Lesson' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!reason.trim() || submitting}
                  onClick={() => onRejectGroup(item.requestId, reason.trim())}
                >
                  {tr('Từ chối cả nhóm')}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              size="sm"
              variant="danger"
              icon={X}
              onClick={() => setShowRejectForm(true)}
              disabled={submitting}
            >
              {tr('Từ chối')}
            </Button>
            {item.entityType === 'Lesson' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={submitting}
                onClick={() => onApproveGroup(item.requestId)}
              >
                {tr('Duyệt cả nhóm bài')}
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              icon={Check}
              onClick={handleApprove}
              disabled={submitting}
              loading={submitting}
            >
              {tr('Phê duyệt')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal nhập lý do từ chối khi chọn hàng loạt
function BatchRejectModal({ selectedItems, onClose, onSubmit, submitting }) {
  const { tr, trf } = useLocale();
  const [reasons, setReasons] = useState({});

  const handleReasonChange = (id, value) => {
    setReasons((prev) => ({ ...prev, [id]: value }));
  };

  const isFormValid = useMemo(() => {
    return selectedItems.every((item) => (reasons[item.requestId] || '').trim().length > 0);
  }, [selectedItems, reasons]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    const itemsPayload = selectedItems.map((item) => ({
      requestId: item.requestId,
      approve: false,
      reviewNote: reasons[item.requestId].trim(),
    }));
    onSubmit(itemsPayload);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={trf('Nhập lý do từ chối ({0} mục)', { 0: selectedItems.length })}
      description={tr('Mỗi yêu cầu từ chối cần có lý do cụ thể. Vui lòng nhập chi tiết cho từng phần bên dưới.')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-3">
          {selectedItems.map((item) => (
            <div key={item.requestId} className="rounded-xl border border-rp-line p-3 bg-rp-bg-2">
              <div className="mb-1.5 flex items-center justify-between text-[13px] font-bold text-rp-text">
                <span>{item.rowKey} <span className="font-normal text-rp-text-2">({item.entityType})</span></span>
                <span className="text-[11px] font-normal text-rp-text-muted">#{item.requestId}</span>
              </div>
              <Textarea
                required
                rows={2}
                value={reasons[item.requestId] || ''}
                onChange={(e) => handleReasonChange(item.requestId, e.target.value)}
                placeholder={tr('Nhập lý do từ chối cho mục này...')}
                className="resize-none bg-white"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-rp-line pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={!isFormValid || submitting}
            loading={submitting}
          >
            {submitting ? tr('Đang gửi...') : tr('Xác nhận từ chối hàng loạt')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const PAGE_SIZE = 20;

export default function AdminContentReview() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const [adminTab, setAdminTab] = useState('requests');
  const [entityType, setEntityType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  // State quản lý các item được chọn bằng Checkbox
  const [checkedIds, setCheckedIds] = useState([]);
  const [batchOutcome, setBatchOutcome] = useState(null);
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);

  const queryParams = { page, pageSize: PAGE_SIZE, ...(entityType ? { entityType } : {}), ...(searchQuery ? { searchQuery } : {}) };

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: approvalKeys.list(queryParams),
    queryFn: () => getPendingApprovals(queryParams),
    keepPreviousData: true,
  });

  const allItems = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [data]);

  const filteredItems = useMemo(() => {
    let list = allItems;
    if (entityType) list = list.filter((i) => i.entityType === entityType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => (i.rowKey ?? '').toLowerCase().includes(q) || (i.entityType ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allItems, entityType, searchQuery]);

  const isPagedResponse = !Array.isArray(data) && Array.isArray(data?.items);
  const totalCount = isPagedResponse ? (data?.totalCount ?? filteredItems.length) : filteredItems.length;
  const totalPages = isPagedResponse ? (data?.totalPages ?? 1) : Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = useMemo(
    () => (isPagedResponse ? filteredItems : filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)),
    [filteredItems, isPagedResponse, safePage]
  );

  const selectedItem = items.find((i) => i.requestId === selectedId) ?? null;

  const onMutationSuccess = useCallback(() => {
    setBatchOutcome(null);
    if (items.length <= 1 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
    }
    qc.invalidateQueries({ queryKey: approvalKeys.all });
    invalidateAdminDomains(qc, ['content']);
    setSelectedId(null);
    setCheckedIds([]);
    setShowBatchRejectModal(false);
  }, [qc, items.length, page]);

  // Single review mutation
  const singleReviewMutation = useMutation({
    mutationFn: ({ requestId, approve, reviewNote }) => reviewContentRequest(requestId, { approve, reviewNote }),
    onSuccess: (_, vars) => {
      onMutationSuccess();
      notify.success(vars.approve ? 'Đã phê duyệt nội dung.' : 'Đã từ chối nội dung.', '', {
        key: `admin-review-${vars.requestId}`,
      });
    },
    onError: (err) => notify.apiError(err, 'Chưa xử lý được yêu cầu duyệt', { key: 'admin-review-single-err' }),
  });

  const groupReviewMutation = useMutation({
    mutationFn: ({ requestId, approve, reviewNote }) => reviewLessonGroup(requestId, { approve, reviewNote }),
    onSuccess: (_, vars) => {
      onMutationSuccess();
      notify.success(vars.approve ? 'Đã phê duyệt cụm bài học.' : 'Đã từ chối cụm bài học.', '', {
        key: `admin-review-group-${vars.requestId}`,
      });
    },
    onError: (err) => notify.apiError(err, 'Chưa xử lý được cụm bài học', { key: 'admin-review-group-err' }),
  });
  const batchReviewMutation = useMutation({
    onMutate: () => setBatchOutcome(null),
    mutationFn: (batchItems) => {
      notify.loading(trf('Đang xử lý {0} yêu cầu duyệt…', { 0: batchItems.length }), '', {
        key: 'admin-review-batch',
        maxWaitMs: 45000,
      });
      return batchReviewContentRequests(batchItems);
    },
    onSuccess: (outcome, batchItems) => {
      onMutationSuccess();
      const successCount = Number(outcome?.successCount) || 0;
      const failures = Array.isArray(outcome?.failures) ? outcome.failures : [];
      setBatchOutcome({ successCount, failures });
      if (failures.length > 0) {
        setCheckedIds(failures.map((item) => item.requestId));
        notify.warning(
          'Một số mục chưa được xử lý.',
          trf('Đã xử lý {0} mục; {1} mục chưa xử lý.', { 0: successCount, 1: failures.length }),
          { key: 'admin-review-batch', replace: true }
        );
      } else {
        const approved = batchItems?.[0]?.approve;
        notify.success(
          approved === false ? 'Đã từ chối hàng loạt nội dung.' : 'Đã phê duyệt hàng loạt nội dung.',
          trf('Đã xử lý {0} mục.', { 0: successCount }),
          { key: 'admin-review-batch', replace: true }
        );
      }
    },
    onError: (err) => notify.apiError(err, 'Duyệt hàng loạt thất bại', {
      key: 'admin-review-batch',
      replace: true,
    }),
  });

  // Handlers cho Checkbox
  const handleToggleSelectAll = () => {
    if (checkedIds.length === items.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(items.map((i) => i.requestId));
    }
  };

  const handleToggleCheck = (id, e) => {
    e.stopPropagation();
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handler duyệt đơn lẻ
  const handleSingleApprove = (item) => {
    singleReviewMutation.mutate({ requestId: item.requestId, approve: true, reviewNote: '' });
  };

  const handleSingleReject = (item, reason) => {
    singleReviewMutation.mutate({ requestId: item.requestId, approve: false, reviewNote: reason });
  };

  // Handler duyệt hàng loạt (Chấp nhận)
  const handleBatchApprove = () => {
    const payload = checkedIds.map((id) => ({
      requestId: id,
      approve: true,
      reviewNote: '',
    }));
    batchReviewMutation.mutate(payload);
  };

  const selectedCheckedItems = useMemo(() => {
    return items.filter((item) => checkedIds.includes(item.requestId));
  }, [items, checkedIds]);

  const isSubmitting = singleReviewMutation.isPending || batchReviewMutation.isPending || groupReviewMutation.isPending;
  const rawMutationError = singleReviewMutation.error || batchReviewMutation.error || groupReviewMutation.error;
  const mutationError = rawMutationError ? describeApiError(rawMutationError).message : '';
  const hasFilters = Boolean(entityType || searchQuery.trim());
  const isSourceEmpty = !isLoading && !error && !hasFilters && allItems.length === 0;
  const showToolbar = !isLoading && (!error || allItems.length > 0) && (allItems.length > 0 || hasFilters);
  const resetFilters = () => {
    setEntityType('');
    setSearchQuery('');
    setPage(1);
    setSelectedId(null);
    setCheckedIds([]);
  };

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Duyệt nội dung')}>
      <div className="py-[var(--rp-space-page-y)] text-rp-text">
        <div className="rp-container rp-cq">
        <AdminPageHeader
          icon={ShieldCheck}
          title="Duyệt nội dung"
          badge={adminTab === 'requests' && !isLoading && !error ? <Badge tone="brand" size="sm" icon={false}>{trf('{0} mục chờ duyệt', { 0: totalCount })}</Badge> : null}
        />

        <div className="mb-5">
          <Tabs
            variant="pill"
            value={adminTab}
            onChange={setAdminTab}
            tabs={[
              { value: 'moderation-v2', label: tr('Kiểm duyệt Câu hỏi & Đề thi (V2)') },
              { value: 'requests', label: tr('Duyệt nội dung chung'), badge: totalCount || undefined },
              { value: 'srs-templates', label: tr('Thẻ mẫu SRS') },
              { value: 'publish-control', label: tr('Quản lý Xuất bản (An toàn)') },
            ]}
          />
        </div>

        {adminTab === 'moderation-v2' && <AdminModerationV2Panel />}

        {adminTab === 'srs-templates' && <AdminSrsTemplatesPanel />}

        {adminTab === 'publish-control' && <AdminPublishManagerPanel />}

        {adminTab === 'requests' && (
        <>
        {/* Thanh công cụ tìm kiếm và lọc (ẩn hoàn toàn khi chưa có dữ liệu gốc) */}
        {showToolbar && (
          <UnifiedToolbar
            className="mb-5"
            search={{
              value: searchQuery,
              onChange: (e) => { setSearchQuery(e.target.value); setPage(1); setCheckedIds([]); },
              onClear: () => { setSearchQuery(''); setPage(1); setCheckedIds([]); },
              placeholder: 'Tìm theo tên, ký tự…',
              ariaLabel: 'Tìm theo tên, ký tự',
            }}
            filters={
              <CustomSelect
                fitContent
                value={entityType}
                aria-label={tr('Lọc theo loại nội dung')}
                onChange={(val) => { setEntityType(val); setPage(1); setSelectedId(null); setCheckedIds([]); }}
                options={ENTITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            }
            actions={
              hasFilters ? (
                <Button size="md" variant="ghost" icon={X} onClick={resetFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : null
            }
            refresh={{
              onRefresh: () => refetch({ cancelRefetch: true }),
              refreshing: isFetching && !isLoading,
            }}
          />
        )}

        {/* Thanh tác vụ hàng loạt khi chọn ít nhất 1 mục */}
        {checkedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-white p-3.5 shadow-sm">
            <span className="text-[13px] font-semibold text-rp-text">
              {tr('Đã chọn')}{' '}<span className="text-rp-brand font-bold">{checkedIds.length}</span>{' '}{tr('mục')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="danger"
                icon={X}
                disabled={isSubmitting}
                onClick={() => setShowBatchRejectModal(true)}
              >
                {tr('Từ chối các mục đã chọn')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Check}
                disabled={isSubmitting}
                loading={isSubmitting}
                onClick={handleBatchApprove}
              >
                {tr('Phê duyệt tất cả đã chọn')}
              </Button>
            </div>
          </div>
        )}

        {mutationError && (
          <div className="mb-4">
            <Banner tone="danger">{mutationError}</Banner>
          </div>
        )}

        {batchOutcome?.failures.length > 0 && (
          <div className="mb-4">
            <Banner tone="warning" title={tr('Một số mục chưa được xử lý.')}>
              <p>{trf('Đã xử lý {0} mục; {1} mục chưa xử lý.', {
                0: batchOutcome.successCount,
                1: batchOutcome.failures.length,
              })}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {batchOutcome.failures.map((failure, index) => (
                  <li key={`${failure.requestId}-${index}`}>
                    {trf('Mục #{0}: {1}', { 0: failure.requestId, 1: failure.reason })}
                  </li>
                ))}
              </ul>
            </Banner>
          </div>
        )}

        {isLoading && !allItems.length ? (
          <SakuraLoader variant="section" context="data" label={tr('Đang tải nội dung chờ duyệt')} delay={160} />
        ) : error && !allItems.length ? (
          <Card className="p-5">
            <ContextualErrorState
              compact
              error={error}
              title={tr('Chưa tải được danh sách chờ duyệt')}
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          </Card>
        ) : isSourceEmpty ? (
          <Card className="p-6">
            <ContextualEmptyState
              variant="compact"
              illustration="book"
              title={tr('Không có nội dung đang chờ duyệt.')}
              description={tr('Các bài học, từ vựng, Hán tự và đề thi do Biên soạn viên gửi lên sẽ hiển thị tại đây.')}
            />
          </Card>
        ) : items.length === 0 && hasFilters ? (
          <Card className="p-6">
            <ContextualEmptyState
              variant="search"
              illustration="search"
              title={tr('Không tìm thấy kết quả phù hợp')}
              description={tr('Thử chọn loại học liệu khác hoặc xóa từ khóa tìm kiếm.')}
              action={
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              }
            />
          </Card>
        ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* Cột danh sách */}
          <section className="overflow-hidden rounded-2xl border border-rp-line bg-white">
            <div className="flex items-center justify-between border-b border-rp-line px-5 py-3.5 bg-rp-table-head">
              <Checkbox
                label={tr('Chọn tất cả')}
                checked={items.length > 0 && checkedIds.length === items.length}
                onChange={handleToggleSelectAll}
                disabled={items.length === 0}
              />
              <div className="flex items-center gap-2">
                <RefreshingIndicator active={isFetching && !isLoading} delay={60} />
                <span className="text-[12px] text-rp-text-2">{trf('Tổng {0}', { 0: totalCount })}</span>
              </div>
            </div>

            {error && items.length > 0 && (
              <div className="px-4 pt-3">
                <StaleDataBar onRetry={() => refetch()} retrying={isFetching} />
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <ul className="divide-y divide-[#f5efec] overflow-y-auto max-h-[70vh]">
                {items.map((item) => {
                  const id = item.requestId;
                  const isSelected = selectedId === id;
                  const isChecked = checkedIds.includes(id);
                  const changedCount = Array.isArray(item.fields) ? item.fields.filter((f) => f.isChanged).length : 0;

                  return (
                    <li key={id} className="flex items-center transition-colors duration-150 hover:bg-rp-row-hover">
                      <div className="pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) => handleToggleCheck(id, e)}
                          aria-label={item.rowKey}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : id)}
                        className={[
                          'w-full py-3.5 pr-5 pl-2 text-left transition-colors flex-1',
                          isSelected ? 'bg-rp-brand-tint border-l-2 border-rp-brand' : 'border-l-2 border-transparent',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block truncate text-[15px] font-bold">{item.rowKey}</span>
                            <span className="mt-0.5 block text-[11px] text-rp-text-muted">
                              {item.entityType} · #{item.requestId} · {item.submittedByName ?? '—'}
                            </span>
                            {changedCount > 0 && (
                              <span className="mt-1 inline-block text-[11px] font-semibold text-amber-600">
                                {trf('{0} thay đổi', { 0: changedCount })}
                              </span>
                            )}
                          </div>
                          <ActionBadge action={item.action} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="border-t border-[#f0e8e4] px-4 py-2.5">
                <Pagination
                  currentPage={Math.min(page, totalPages)}
                  totalPages={totalPages}
                  pageSize={PAGE_SIZE}
                  showPageSize={false}
                  showTotal={false}
                  onPageChange={setPage}
                />
              </div>
            )}
          </section>

          {/* Cột xem chi tiết & thao tác trực tiếp 1 mục */}
          <section className="rounded-2xl border border-rp-line bg-white p-5 overflow-y-auto max-h-[80vh] sticky top-6">
            <h2 className="mb-4 font-bold text-[15px]">{tr('Chi tiết nội dung')}</h2>
            {!selectedItem ? (
              <ContextualEmptyState
                variant="compact"
                illustration="homework"
                title={tr('Chọn một mục để xem chi tiết và thực hiện duyệt.')}
              />
            ) : (
              <DetailPanel
                key={selectedItem.requestId}
                item={selectedItem}
                onApprove={handleSingleApprove}
                onReject={handleSingleReject}
                onApproveGroup={(id) => groupReviewMutation.mutate({ requestId: id, approve: true, reviewNote: '' })}
                onRejectGroup={(id, reviewNote) => groupReviewMutation.mutate({ requestId: id, approve: false, reviewNote })}
                submitting={isSubmitting}
              />
            )}
          </section>
        </div>
        )}

        {/* Modal từ chối hàng loạt có ô nhập lý do riêng cho từng item */}
        {showBatchRejectModal && (
          <BatchRejectModal
            selectedItems={selectedCheckedItems}
            onClose={() => setShowBatchRejectModal(false)}
            onSubmit={(batchPayload) => batchReviewMutation.mutate(batchPayload)}
            submitting={isSubmitting}
          />
        )}
        </>
        )}
        </div>
      </div>
    </AdminShell>
  );
}
