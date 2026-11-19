import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '@/layouts';
import {
  getPendingApprovals,
  reviewContentRequest,
  reviewLessonGroup,
  batchReviewContentRequests,
} from '@/features/admin/api/adminApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { ContextualErrorState, RefreshingIndicator, SakuraLoader, StaleDataBar } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const approvalKeys = {
  all: ['content-approvals'],
  list: (params) => ['content-approvals', 'list', params],
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

  return (
    <div className="rounded-lg border border-rp-line bg-white p-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-rp-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-rp-brand">
          {tr('Câu')}{' '}{pick(q, 'SortOrder', 'sortOrder') ?? index + 1}
        </span>
        <p className="flex-1 text-[13px] font-medium break-words">{pick(q, 'QuestionText', 'questionText')}</p>
        <span className="shrink-0 text-[10px] text-rp-text-muted">{pick(q, 'QuestionType', 'questionType')}</span>
      </div>

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
    <tr className="even:bg-rp-bg-2">
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
        <div className="overflow-auto rounded-xl border border-rp-line bg-white">
          <table className="min-w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-[#f0e8e4] bg-rp-bg-2">
                <th className="py-2 pl-4 pr-3 text-[10px] font-bold text-rp-text-2 uppercase tracking-wide w-32">{tr('Trường')}</th>
                <th className="py-2 pr-3 text-[10px] font-bold text-rp-text-2 uppercase tracking-wide">{tr('Cũ (DB)')}</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-rp-text-2 uppercase tracking-wide">{tr('Mới (Excel)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efec]">
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
              {tr('Lý do từ chối')}{' '}<span className="text-rose-600">*</span>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-rp-line p-3 text-[13px] outline-none focus:border-rp-brand transition-colors resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr('Nhập lý do từ chối cụ thể cho mục này...')}
                autoFocus
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="rounded-xl border border-rp-line px-4 py-2 text-[13px] font-semibold text-rp-text-2 hover:bg-rp-bg-2 transition-colors"
              >
                {tr('Huỷ')}
              </button>
              <button
                type="button"
                disabled={!reason.trim() || submitting}
                onClick={handleReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? tr('Đang xử lý…') : tr('Xác nhận từ chối')}
              </button>
              {item.entityType === 'Lesson' && (
                <button
                  type="button"
                  disabled={!reason.trim() || submitting}
                  onClick={() => onRejectGroup(item.requestId, reason.trim())}
                  className="rounded-xl border border-rose-300 px-4 py-2 text-[13px] font-semibold text-rose-700 disabled:opacity-50"
                >
                  {tr('Từ chối cả nhóm')}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              disabled={submitting}
              className="rounded-xl border border-rose-300 px-4 py-2 text-[13px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
            >
              <Icon name="close" className="align-middle text-[16px] mr-1" />{tr('Từ chối')}
            </button>
            {item.entityType === 'Lesson' && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => onApproveGroup(item.requestId)}
                className="rounded-xl border border-rp-line px-4 py-2 text-[13px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint disabled:opacity-50"
              >
                {tr('Duyệt cả nhóm bài')}
              </button>
            )}
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <SakuraLoader variant="inline" size={16} tone="light" className="mr-1" />
              ) : (
                <Icon name="check" className="align-middle text-[16px] mr-1" />
              )}
              {tr('Phê duyệt')}
            </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-rp-line pb-3">
          <h3 className="text-lg font-bold text-rp-text">
            {trf('Nhập lý do từ chối ({0} mục)', { 0: selectedItems.length })}
          </h3>
          <button onClick={onClose} className="text-rp-text-muted hover:text-rp-text">
            <Icon name="close" />
          </button>
        </div>

        <p className="mb-4 text-xs text-rp-text-2">
          {tr('Mỗi yêu cầu từ chối cần có lý do cụ thể. Vui lòng nhập chi tiết cho từng phần bên dưới.')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {selectedItems.map((item) => (
              <div key={item.requestId} className="rounded-xl border border-rp-line p-3 bg-rp-bg-2">
                <div className="mb-1.5 flex items-center justify-between text-[13px] font-bold text-rp-text">
                  <span>{item.rowKey} <span className="font-normal text-rp-text-2">({item.entityType})</span></span>
                  <span className="text-[11px] font-normal text-rp-text-muted">#{item.requestId}</span>
                </div>
                <textarea
                  required
                  rows={2}
                  value={reasons[item.requestId] || ''}
                  onChange={(e) => handleReasonChange(item.requestId, e.target.value)}
                  placeholder={tr('Nhập lý do từ chối cho mục này...')}
                  className="w-full rounded-lg border border-rp-line bg-white p-2.5 text-[13px] outline-none focus:border-rp-brand transition-colors resize-none"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-rp-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-rp-line px-4 py-2 text-[13px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
            >
              {tr('Hủy')}
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="rounded-xl bg-rose-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? tr('Đang gửi...') : tr('Xác nhận từ chối hàng loạt')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function AdminContentReview() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const [entityType, setEntityType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  // State quản lý các item được chọn bằng Checkbox
  const [checkedIds, setCheckedIds] = useState([]);
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

  const totalPages = Array.isArray(data) ? Math.max(1, Math.ceil(data.length / PAGE_SIZE)) : (data?.totalPages ?? 1);

  const items = useMemo(() => {
    let list = allItems;
    if (entityType) list = list.filter((i) => i.entityType === entityType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => (i.rowKey ?? '').toLowerCase().includes(q) || (i.entityType ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allItems, entityType, searchQuery]);

  const selectedItem = items.find((i) => i.requestId === selectedId) ?? null;

  const onMutationSuccess = useCallback(() => {
    qc.invalidateQueries({ queryKey: approvalKeys.all });
    setSelectedId(null);
    setCheckedIds([]);
    setShowBatchRejectModal(false);
  }, [qc]);

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
    mutationFn: (batchItems) => {
      notify.loading(trf('Đang xử lý {0} yêu cầu duyệt…', { 0: batchItems.length }), '', {
        key: 'admin-review-batch',
        maxWaitMs: 45000,
      });
      return batchReviewContentRequests(batchItems);
    },
    onSuccess: (_, batchItems) => {
      onMutationSuccess();
      const approved = batchItems?.[0]?.approve;
      notify.success(
        approved === false ? 'Đã từ chối hàng loạt nội dung.' : 'Đã phê duyệt hàng loạt nội dung.',
        trf('Đã xử lý {0} mục.', { 0: batchItems?.length ?? 0 }),
        { key: 'admin-review-batch', replace: true }
      );
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

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Duyệt nội dung')}>
      <div className="min-h-dvh bg-rp-bg-2 py-[var(--rp-space-page-y)] text-rp-text">
        <div className="rp-container rp-cq">
        <header className="mb-[var(--rp-space-stack)]">
          <h1 className="rp-type-page-title">{tr('Hàng chờ kiểm duyệt')}</h1>
          <p className="rp-type-body mt-1 text-rp-text-2">
            {tr('Nội dung do Content Author gửi lên, đang chờ Admin xem xét và phê duyệt.')}
          </p>
        </header>

        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-[180px] max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-rp-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); setCheckedIds([]); }}
              placeholder={tr('Tìm theo tên, ký tự...')}
              className="w-full rounded-xl border border-rp-line bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-rp-brand transition-colors"
            />
          </div>

          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); setSelectedId(null); setCheckedIds([]); }}
            className="rounded-xl border border-rp-line bg-white px-3 py-2 text-[13px] outline-none focus:border-rp-brand transition-colors"
          >
            {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{tr(t.label)}</option>)}
          </select>

          <span className="rounded-full bg-rp-brand/10 px-3 py-1 text-[12px] font-semibold text-rp-brand">
            {trf('{0} mục chờ duyệt', { 0: items.length })}
          </span>

          <RefreshingIndicator active={isFetching && !isLoading} />
        </div>

        {/* Thanh tác vụ hàng loạt khi chọn ít nhất 1 mục */}
        {checkedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-white p-3.5 shadow-sm">
            <span className="text-[13px] font-semibold text-rp-text">
              {tr('Đã chọn')}{' '}<span className="text-rp-brand font-bold">{checkedIds.length}</span>{' '}{tr('mục')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowBatchRejectModal(true)}
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
              >
                {tr('Từ chối các mục đã chọn')}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBatchApprove}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmitting && <SakuraLoader variant="inline" size={14} tone="light" />}
                {tr('Phê duyệt tất cả đã chọn')}
              </button>
            </div>
          </div>
        )}

        {mutationError && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
            {mutationError}
          </p>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* Cột danh sách */}
          <section className="overflow-hidden rounded-2xl border border-rp-line bg-white">
            <div className="flex items-center justify-between border-b border-rp-line px-5 py-3.5 bg-rp-bg-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={items.length > 0 && checkedIds.length === items.length}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-rp-brand focus:ring-rp-brand"
                  disabled={items.length === 0}
                />
                <span className="font-bold text-[14px]">{tr('Chọn tất cả')}</span>
              </div>
              <span className="text-[12px] text-rp-text-2">{trf('Tổng {0}', { 0: items.length })}</span>
            </div>

            {error && !items.length && (
              <div className="p-5">
                <ContextualErrorState
                  compact
                  error={error}
                  title={tr('Chưa tải được danh sách chờ duyệt')}
                  onRetry={() => refetch()}
                  retrying={isFetching}
                />
              </div>
            )}
            {error && items.length > 0 && (
              <div className="px-4 pt-3">
                <StaleDataBar onRetry={() => refetch()} retrying={isFetching} />
              </div>
            )}

            {isLoading && (
              <SakuraLoader variant="section" context="data" label={tr('Đang tải nội dung chờ duyệt')} delay={160} />
            )}

            {!isLoading && items.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-rp-text-muted">
                <Icon name="inbox" className="text-[44px]" />
                <p className="text-[13px] font-medium">{tr('Không có nội dung đang chờ duyệt.')}</p>
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
                    <li key={id} className="flex items-center hover:bg-rp-bg-2">
                      <div className="pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleCheck(id, e)}
                          className="h-4 w-4 rounded border-gray-300 text-rp-brand focus:ring-rp-brand"
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
              <div className="flex items-center justify-between border-t border-[#f0e8e4] px-5 py-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-rp-line px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40 hover:bg-rp-bg-2 transition-colors"
                >
                  {tr('← Trước')}
                </button>
                <span className="text-[12px] text-rp-text-2">Trang {page}/{totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-rp-line px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40 hover:bg-rp-bg-2 transition-colors"
                >
                  {tr('Tiếp →')}
                </button>
              </div>
            )}
          </section>

          {/* Cột xem chi tiết & thao tác trực tiếp 1 mục */}
          <section className="rounded-2xl border border-rp-line bg-white p-5 overflow-y-auto max-h-[80vh] sticky top-6">
            <h2 className="mb-4 font-bold text-[15px]">{tr('Chi tiết nội dung')}</h2>
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-rp-text-muted">
                <Icon name="open_in_new" className="text-[44px]" />
                <p className="text-[13px] font-medium text-center">{tr('Chọn một mục để xem chi tiết và thực hiện duyệt.')}</p>
              </div>
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

        {/* Modal từ chối hàng loạt có ô nhập lý do riêng cho từng item */}
        {showBatchRejectModal && (
          <BatchRejectModal
            selectedItems={selectedCheckedItems}
            onClose={() => setShowBatchRejectModal(false)}
            onSubmit={(batchPayload) => batchReviewMutation.mutate(batchPayload)}
            submitting={isSubmitting}
          />
        )}
        </div>
      </div>
    </AdminShell>
  );
}
