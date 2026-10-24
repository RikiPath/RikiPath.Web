import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/shells';
import {
  getPendingApprovals,
  reviewContentRequest,
  batchReviewContentRequests,
} from '../../api/admin.js';

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
};

const ACTION_META = {
  New: { label: 'Mới', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Modified: { label: 'Chỉnh sửa', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Unchanged: { label: 'Không thay đổi', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
  Error: { label: 'Đã có', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Pending: { label: 'Chờ duyệt', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || ACTION_META.Pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  );
}

function FieldRow({ f }) {
  const displayLabel = FIELD_LABELS[f.field] ?? f.label ?? f.field;
  if (f.isChanged) {
    return (
      <tr className="bg-amber-50/70">
        <td className="py-2 pl-4 pr-3 align-top text-[12px] font-semibold text-[#6F6669] whitespace-nowrap w-32">{displayLabel}</td>
        <td className="py-2 pr-3 align-top text-[12px] text-[#30282B] break-all max-w-[160px]">
          {f.oldValue != null ? <span className="line-through text-rose-400">{f.oldValue}</span> : <span className="italic text-[#C0B8BB]">—</span>}
        </td>
        <td className="py-2 pr-4 align-top text-[12px] font-medium text-emerald-700 break-words max-w-[200px]">
          {f.newValue ?? <span className="italic text-[#C0B8BB]">—</span>}
        </td>
      </tr>
    );
  }
  return (
    <tr className="even:bg-[#faf9f8]">
      <td className="py-2 pl-4 pr-3 align-top text-[12px] font-semibold text-[#6F6669] whitespace-nowrap w-32">{displayLabel}</td>
      <td colSpan={2} className="py-2 pr-4 align-top text-[12px] text-[#30282B] break-words">
        {f.newValue ?? f.oldValue ?? <span className="italic text-[#C0B8BB]">—</span>}
      </td>
    </tr>
  );
}

function DetailPanel({ item, onApprove, onReject, submitting }) {
  const [reason, setReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const fields = Array.isArray(item.fields) ? item.fields : [];
  const changedCount = fields.filter((f) => f.isChanged).length;

  const handleApprove = () => {
    onApprove(item.requestId);
    setShowRejectForm(false);
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(item.requestId, reason.trim());
    setReason('');
    setShowRejectForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-bold text-[#30282B] leading-tight">{item.rowKey}</p>
          <p className="mt-1 text-[12px] text-[#A59B9E]">
            <span className="font-semibold text-[#6F6669]">{item.entityType}</span>
            {' · '}Người gửi: {item.submittedByName ?? '—'}
            {item.submittedAt ? ' · ' + new Date(item.submittedAt).toLocaleString('vi-VN') : ''}
          </p>
          {changedCount > 0 && <p className="mt-1 text-[12px] font-semibold text-amber-600">{changedCount} trường thay đổi</p>}
        </div>
        <ActionBadge action={item.action} />
      </div>

      {fields.length > 0 && (
        <div className="overflow-auto rounded-xl border border-[#eadfd9] bg-white">
          <table className="min-w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-[#f0e8e4] bg-[#faf7f5]">
                <th className="py-2 pl-4 pr-3 text-[10px] font-bold text-[#6F6669] uppercase tracking-wide w-32">Trường</th>
                <th className="py-2 pr-3 text-[10px] font-bold text-[#6F6669] uppercase tracking-wide">Cũ (DB)</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-[#6F6669] uppercase tracking-wide">Mới (Excel)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efec]">
              {fields.map((f) => <FieldRow key={f.field} f={f} />)}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-[#f0e8e4]">
        {showRejectForm ? (
          <>
            <label className="text-[13px] font-semibold text-[#30282B]">
              Lý do từ chối <span className="text-rose-600">*</span>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-[#eadfd9] p-3 text-[13px] outline-none focus:border-[#D94B68] transition-colors resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do từ chối cụ thể cho mục này..."
                autoFocus
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="rounded-xl border border-[#eadfd9] px-4 py-2 text-[13px] font-semibold text-[#6F6669] hover:bg-[#faf7f5] transition-colors"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={!reason.trim() || submitting}
                onClick={handleReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Đang xử lý…' : 'Xác nhận từ chối'}
              </button>
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
              <span className="material-symbols-outlined align-middle text-[16px] mr-1">close</span>Từ chối
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin align-middle text-[16px] mr-1">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined align-middle text-[16px] mr-1">check</span>
              )}
              Phê duyệt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal nhập lý do từ chối khi chọn hàng loạt
function BatchRejectModal({ selectedItems, onClose, onSubmit, submitting }) {
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
        <div className="mb-4 flex items-center justify-between border-b border-[#eadfd9] pb-3">
          <h3 className="text-lg font-bold text-[#30282B]">
            Nhập lý do từ chối ({selectedItems.length} mục)
          </h3>
          <button onClick={onClose} className="text-[#A59B9E] hover:text-[#30282B]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="mb-4 text-xs text-[#6F6669]">
          Mỗi yêu cầu từ chối cần có lý do cụ thể. Vui lòng nhập chi tiết cho từng phần bên dưới.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {selectedItems.map((item) => (
              <div key={item.requestId} className="rounded-xl border border-[#eadfd9] p-3 bg-[#faf7f5]">
                <div className="mb-1.5 flex items-center justify-between text-[13px] font-bold text-[#30282B]">
                  <span>{item.rowKey} <span className="font-normal text-[#6F6669]">({item.entityType})</span></span>
                  <span className="text-[11px] font-normal text-[#A59B9E]">#{item.requestId}</span>
                </div>
                <textarea
                  required
                  rows={2}
                  value={reasons[item.requestId] || ''}
                  onChange={(e) => handleReasonChange(item.requestId, e.target.value)}
                  placeholder="Nhập lý do từ chối cho mục này..."
                  className="w-full rounded-lg border border-[#eadfd9] bg-white p-2.5 text-[13px] outline-none focus:border-[#D94B68] transition-colors resize-none"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-[#eadfd9] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#eadfd9] px-4 py-2 text-[13px] font-semibold text-[#6F6669] hover:bg-[#faf7f5]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="rounded-xl bg-rose-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Đang gửi...' : 'Xác nhận từ chối hàng loạt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function AdminContentReview() {
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

  const { data, isLoading, error, isFetching } = useQuery({
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
    onSuccess: onMutationSuccess,
  });

  // Batch review mutation
  const batchReviewMutation = useMutation({
    mutationFn: (batchItems) => batchReviewContentRequests(batchItems),
    onSuccess: onMutationSuccess,
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
  const handleSingleApprove = (id) => {
    singleReviewMutation.mutate({ requestId: id, approve: true, reviewNote: '' });
  };

  const handleSingleReject = (id, reason) => {
    singleReviewMutation.mutate({ requestId: id, approve: false, reviewNote: reason });
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

  const isSubmitting = singleReviewMutation.isPending || batchReviewMutation.isPending;
  const mutationError = singleReviewMutation.error?.message || batchReviewMutation.error?.message;

  return (
    <AdminShell pathname={pathname} breadcrumb="Duyệt nội dung">
      <div className="min-h-screen bg-[#FAF7F5] p-6 md:p-8 text-[#30282B]">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Hàng chờ kiểm duyệt</h1>
          <p className="mt-1 text-sm text-[#6F6669]">
            Nội dung do Content Author gửi lên, đang chờ Admin xem xét và phê duyệt.
          </p>
        </header>

        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#A59B9E]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); setCheckedIds([]); }}
              placeholder="Tìm theo tên, ký tự..."
              className="w-full rounded-xl border border-[#eadfd9] bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[#D94B68] transition-colors"
            />
          </div>

          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); setSelectedId(null); setCheckedIds([]); }}
            className="rounded-xl border border-[#eadfd9] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#D94B68] transition-colors"
          >
            {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <span className="rounded-full bg-[#D94B68]/10 px-3 py-1 text-[12px] font-semibold text-[#D94B68]">
            {items.length} mục chờ duyệt
          </span>

          {isFetching && !isLoading && (
            <span className="material-symbols-outlined animate-spin text-[20px] text-[#D94B68]">progress_activity</span>
          )}
        </div>

        {/* Thanh tác vụ hàng loạt khi chọn ít nhất 1 mục */}
        {checkedIds.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-3.5 border border-[#eadfd9] shadow-sm">
            <span className="text-[13px] font-semibold text-[#30282B]">
              Đã chọn <span className="text-[#D94B68] font-bold">{checkedIds.length}</span> mục
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowBatchRejectModal(true)}
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
              >
                Từ chối các mục đã chọn
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBatchApprove}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmitting && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
                Phê duyệt tất cả đã chọn
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
          <section className="overflow-hidden rounded-2xl border border-[#eadfd9] bg-white">
            <div className="flex items-center justify-between border-b border-[#eadfd9] px-5 py-3.5 bg-[#faf7f5]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={items.length > 0 && checkedIds.length === items.length}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-[#D94B68] focus:ring-[#D94B68]"
                  disabled={items.length === 0}
                />
                <span className="font-bold text-[14px]">Chọn tất cả</span>
              </div>
              <span className="text-[12px] text-[#6F6669]">Tổng {items.length}</span>
            </div>

            {error && <p className="p-5 text-[13px] text-rose-700">{error.message || 'Lỗi tải danh sách.'}</p>}

            {isLoading && (
              <div className="flex h-40 items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-[30px] text-[#D94B68]">progress_activity</span>
              </div>
            )}

            {!isLoading && items.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-[#A59B9E]">
                <span className="material-symbols-outlined text-[44px]">inbox</span>
                <p className="text-[13px] font-medium">Không có nội dung đang chờ duyệt.</p>
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
                    <li key={id} className="flex items-center hover:bg-[#faf7f5]">
                      <div className="pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleCheck(id, e)}
                          className="h-4 w-4 rounded border-gray-300 text-[#D94B68] focus:ring-[#D94B68]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : id)}
                        className={[
                          'w-full py-3.5 pr-5 pl-2 text-left transition-colors flex-1',
                          isSelected ? 'bg-[#FFF0F5] border-l-2 border-[#D94B68]' : 'border-l-2 border-transparent',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block truncate text-[15px] font-bold">{item.rowKey}</span>
                            <span className="mt-0.5 block text-[11px] text-[#A59B9E]">
                              {item.entityType} · #{item.requestId} · {item.submittedByName ?? '—'}
                            </span>
                            {changedCount > 0 && (
                              <span className="mt-1 inline-block text-[11px] font-semibold text-amber-600">
                                {changedCount} thay đổi
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
                  className="rounded-lg border border-[#eadfd9] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40 hover:bg-[#faf7f5] transition-colors"
                >
                  ← Trước
                </button>
                <span className="text-[12px] text-[#6F6669]">Trang {page}/{totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-[#eadfd9] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40 hover:bg-[#faf7f5] transition-colors"
                >
                  Tiếp →
                </button>
              </div>
            )}
          </section>

          {/* Cột xem chi tiết & thao tác trực tiếp 1 mục */}
          <section className="rounded-2xl border border-[#eadfd9] bg-white p-5 overflow-y-auto max-h-[80vh] sticky top-6">
            <h2 className="mb-4 font-bold text-[15px]">Chi tiết nội dung</h2>
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-[#A59B9E]">
                <span className="material-symbols-outlined text-[44px]">open_in_new</span>
                <p className="text-[13px] font-medium text-center">Chọn một mục để xem chi tiết và thực hiện duyệt.</p>
              </div>
            ) : (
              <DetailPanel
                key={selectedItem.requestId}
                item={selectedItem}
                onApprove={handleSingleApprove}
                onReject={handleSingleReject}
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
    </AdminShell>
  );
}