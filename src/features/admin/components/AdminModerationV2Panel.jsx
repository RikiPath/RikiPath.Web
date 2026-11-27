import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Clock,
  MessageSquareWarning,
  ShieldCheck,
  Volume2,
  X,
} from 'lucide-react';
import {
  getModerationDetailV2,
  getModerationQueueV2,
  moderateContentV2,
  unpublishContentV2,
} from '@/features/admin/api/adminApi.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Pagination,
  RichQuestionText,
  SakuraLoader,
  Textarea,
  UnifiedToolbar,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import {
  formatApprovalStatusLabel,
  formatAuditActionLabel,
  formatContentEntityLabel,
  formatExamKindLabel,
  formatRightsStatusLabel,
  formatSourceTypeLabel,
} from '@/utils/terminology.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

const APPROVAL_BADGES = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  PendingReview: { label: 'Chờ duyệt', tone: 'warning' },
  ChangesRequested: { label: 'Cần bổ sung', tone: 'info' },
  Approved: { label: 'Đã duyệt', tone: 'success' },
  Rejected: { label: 'Bị từ chối', tone: 'danger' },
};

const ENTITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'QuestionBank', label: 'Câu hỏi ngân hàng' },
  { value: 'Passage', label: 'Đoạn đọc / Nhóm nghe' },
  { value: 'PracticeSet', label: 'Bộ đề luyện tập / Hỗn hợp' },
  { value: 'MockTest', label: 'Đề thi thử JLPT' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'ChangesRequested', label: 'Cần bổ sung' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Bị từ chối' },
];

function mapUnpublishTargetType(entityType) {
  if (entityType === 'MockTest' || entityType === 'PracticeSet') return 'Exam';
  if (entityType === 'Passage') return 'Passage';
  return 'Question';
}

function StructuredPreviewBlock({ detail }) {
  const { tr } = useLocale();
  const preview = detail?.structuredPreview;
  if (!preview) {
    return (
      <pre className="max-h-60 overflow-auto rounded-xl border border-rp-line bg-slate-50 p-3 text-xs">
        {detail?.payloadJson || '—'}
      </pre>
    );
  }

  // Case 1: ExamBlueprint / MockTest / PracticeSet (has sections)
  if (Array.isArray(preview.sections)) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand" size="sm" icon={false}>{formatExamKindLabel(preview.examKind, tr)}</Badge>
          {preview.certificateLevelCode && <Badge tone="neutral" size="sm" icon={false}>{preview.certificateLevelCode}</Badge>}
          {preview.timeLimitMinutes && <Badge tone="info" size="sm" icon={false}>{preview.timeLimitMinutes} phút</Badge>}
        </div>
        {preview.description && <p className="text-sm text-rp-text-2">{preview.description}</p>}
        <div className="space-y-2">
          {preview.sections.map((sec, sIdx) => (
            <Card key={sIdx} className="space-y-2 border-rp-line bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                <span>#{sIdx + 1} · {sec.title}</span>
                <span className="text-xs text-rp-text-muted">{sec.questions?.length || 0} câu · {sec.durationMinutes || '—'} phút</span>
              </div>
              {Array.isArray(sec.questions) && sec.questions.length > 0 && (
                <ul className="space-y-1.5 text-xs">
                  {sec.questions.map((slot, qIdx) => {
                    const q = slot.inlineQuestion || slot;
                    return (
                      <li key={qIdx} className="rounded-lg border border-rp-line bg-white px-2.5 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="neutral" size="sm" icon={false}>Câu {qIdx + 1}</Badge>
                          {q.skillName && <Badge tone="info" size="sm" icon={false}>{q.skillName}</Badge>}
                          {q.questionType && <Badge tone="brand" size="sm" icon={false}>{q.questionType}</Badge>}
                          {slot.questionBankItemId && <Badge tone="success" size="sm" icon={false}>Bank #{slot.questionBankItemId}</Badge>}
                        </div>
                        <RichQuestionText as="p" text={q.questionText} className="rp-jp mt-1 text-rp-text" />
                        {q.audioUrl && <audio controls src={q.audioUrl} className="mt-1.5 h-8 w-full" />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Case 2: Passage Group (has passage & questions)
  if (preview.passage && Array.isArray(preview.questions)) {
    const p = preview.passage;
    return (
      <div className="space-y-3">
        <Card className="border-rp-line bg-slate-50 p-3 text-sm">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="info" size="sm" icon={false}>{p.skillName}</Badge>
            <Badge tone="neutral" size="sm" icon={false}>{p.certificateLevelCode}</Badge>
            <Badge tone="brand" size="sm" icon={false}>{p.passageCode}</Badge>
          </div>
          <p className="font-semibold text-rp-text">{p.title}</p>
          {p.passageText && <RichQuestionText as="p" text={p.passageText} className="rp-jp mt-2 whitespace-pre-wrap text-sm" />}
          {p.audioUrl && (
            <div className="mt-2 space-y-1">
              <audio controls src={p.audioUrl} className="w-full" />
              {p.audioTranscript && (
                <p className="text-xs text-rp-text-2"><strong>{tr('Transcript')}:</strong> {p.audioTranscript}</p>
              )}
            </div>
          )}
        </Card>
        <div className="space-y-2">
          {preview.questions.map((q, i) => (
            <Card key={i} className="space-y-1.5 p-3 text-sm">
              <p className="rp-jp font-semibold">{i + 1}. <RichQuestionText text={q.questionText} /></p>
              {q.options?.map((opt, oIdx) => (
                <div
                  key={oIdx}
                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                    opt.isCorrect ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-950' : 'border-rp-line'
                  }`}
                >
                  <RichQuestionText text={opt.optionText} />
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Case 3: Single Canonical Question
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {preview.certificateLevelCode && <Badge tone="neutral" size="sm" icon={false}>{preview.certificateLevelCode}</Badge>}
        {preview.skillName && <Badge tone="info" size="sm" icon={false}>{preview.skillName}</Badge>}
        {preview.templateKind && <Badge tone="brand" size="sm" icon={false}>{preview.templateKind}</Badge>}
        {preview.questionType && <Badge tone="neutral" size="sm" icon={false}>{preview.questionType}</Badge>}
      </div>
      {preview.passage?.passageText && (
        <Card className="border-rp-line bg-slate-50 p-3 text-xs">
          <p className="font-semibold">{preview.passage.title}</p>
          <p className="rp-jp mt-1 whitespace-pre-wrap">{preview.passage.passageText}</p>
        </Card>
      )}
      <p className="rp-jp whitespace-pre-wrap text-sm font-medium text-rp-text">{preview.questionText}</p>
      {preview.audioUrl && (
        <div className="rounded-xl border border-rp-line bg-slate-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-rp-text-muted">
            <Volume2 className="h-3.5 w-3.5" />
            <span>{tr('Audio & Chính sách phát')}</span>
          </div>
          <audio controls src={preview.audioUrl} className="w-full" />
          {preview.audioTranscript && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-rp-text-2">
              <strong>{tr('Transcript')}:</strong> {preview.audioTranscript}
            </p>
          )}
        </div>
      )}
      {Array.isArray(preview.options) && preview.options.length > 0 && (
        <div className="space-y-1.5">
          {preview.options.map((opt, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${
                opt.isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium' : 'border-rp-line bg-white'
              }`}
            >
              {opt.isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              <span className="rp-jp">{opt.optionText}</span>
            </div>
          ))}
        </div>
      )}
      {preview.skillMetadata?.acceptedAnswers?.filter(Boolean).length > 0 && (
        <Banner tone="success" title={tr('Đáp án chấp nhận (Điền khuyết)')}>
          {preview.skillMetadata.acceptedAnswers.filter(Boolean).join(' · ')}
        </Banner>
      )}
      {preview.skillMetadata?.orderingAnswer?.filter(Boolean).length > 0 && (
        <Banner tone="success" title={tr('Đáp án sắp xếp câu (★)')}>
          {preview.skillMetadata.orderingAnswer.join(' / ')}
        </Banner>
      )}
      {preview.explanation && (
        <div className="rounded-xl border border-rp-line bg-rp-brand-tint/30 p-3 text-xs">
          <p className="font-semibold text-rp-brand-strong">{tr('Giải thích')}</p>
          <p className="mt-1 whitespace-pre-wrap">{preview.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminModerationV2Panel() {
  const { tr, trf } = useLocale();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('PendingReview');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const queueQuery = useQuery({
    queryKey: ['admin-mod-v2-queue', statusFilter, entityFilter, keyword.trim(), page],
    queryFn: () =>
      getModerationQueueV2({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        entityType: entityFilter !== 'ALL' ? entityFilter : undefined,
        keyword: keyword.trim() || undefined,
        page,
        pageSize: 20,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-mod-v2-detail', selectedRequestId],
    queryFn: () => getModerationDetailV2(selectedRequestId),
    enabled: Boolean(selectedRequestId),
  });

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin-mod-v2-queue'] });
    if (selectedRequestId) {
      void qc.invalidateQueries({ queryKey: ['admin-mod-v2-detail', selectedRequestId] });
    }
    void invalidateSidebarCounters(qc);
  };

  const moderateMutation = useMutation({
    mutationFn: ({ requestId, decision, note, confirmed }) =>
      moderateContentV2(requestId, {
        decision,
        reviewNote: note || null,
        rightsConfirmed: confirmed,
      }),
    onSuccess: (updated, vars) => {
      if (items.length <= 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
      refreshAll();
      setReviewNote('');
      notify.success(trf('Đã xử lý kiểm duyệt ({0}).', { 0: vars.decision }), '', { key: 'mod-v2-ok' });
      if (updated?.summary) {
        setRightsConfirmed(Boolean(updated.summary.rightsConfirmed));
      }
    },
    onError: (err) => notify.apiError(err, tr('Không thực hiện được kiểm duyệt'), { key: 'mod-v2-err' }),
  });

  const unpublishMutation = useMutation({
    mutationFn: ({ targetType, targetId, reason }) =>
      unpublishContentV2({ targetType, targetId, reason }),
    onSuccess: () => {
      if (items.length <= 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
      refreshAll();
      setReviewNote('');
      notify.success(tr('Đã ngừng xuất bản học liệu.'), '', { key: 'mod-unpub-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Không thể ngừng xuất bản'), { key: 'mod-unpub-err' }),
  });

  const items = queueQuery.data?.items || [];
  const totalPages = Math.max(1, Math.ceil((queueQuery.data?.totalCount || items.length) / 20));
  const detail = detailQuery.data;
  const summary = detail?.summary;

  const hasAnyModFilter = statusFilter !== 'ALL' || entityFilter !== 'ALL' || keyword.trim() !== '';
  const unfilteredModQuery = useQuery({
    queryKey: ['admin-mod-v2-queue', 'unfiltered-check'],
    queryFn: () => getModerationQueueV2({ page: 1, pageSize: 1 }),
    enabled: Boolean(hasAnyModFilter && queueQuery.isSuccess && items.length === 0),
    staleTime: 30_000,
  });

  const unfilteredModTotal = unfilteredModQuery.data?.totalCount ?? unfilteredModQuery.data?.items?.length ?? 0;
  const hasUnderlyingModItems = !queueQuery.isPending && (!queueQuery.isError || items.length > 0) && (
    items.length > 0 || (hasAnyModFilter && (unfilteredModQuery.isPending || unfilteredModTotal > 0))
  );
  const isFilterZero = hasAnyModFilter && queueQuery.isSuccess && unfilteredModTotal > 0;

  return (
    <div className="space-y-4">
      {hasUnderlyingModItems && (
      <UnifiedToolbar
        search={{
          value: keyword,
          onChange: (e) => {
            setKeyword(e.target.value);
            setPage(1);
          },
          onClear: () => {
            setKeyword('');
            setPage(1);
          },
          placeholder: 'Tìm tên đề, câu hỏi, tác giả…',
          ariaLabel: 'Tìm mục kiểm duyệt',
        }}
        filters={
          <>
            <CustomSelect
              fitContent
              size="sm"
              label="Trạng thái"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
                setSelectedRequestId(null);
              }}
              options={STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
            />
            <CustomSelect
              fitContent
              size="sm"
              label="Loại nội dung"
              value={entityFilter}
              onChange={(v) => {
                setEntityFilter(v);
                setPage(1);
                setSelectedRequestId(null);
              }}
              options={ENTITY_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
            />
          </>
        }
        refresh={{
          when: !queueQuery.isPending && !queueQuery.isError && items.length > 0,
          onRefresh: () => queueQuery.refetch({ cancelRefetch: true }),
          refreshing: queueQuery.isFetching && !queueQuery.isPending,
        }}
      />
      )}

      {queueQuery.isPending && !items.length ? (
        <SakuraLoader variant="section" context="data" label={tr('Đang tải hàng đợi kiểm duyệt V2…')} delay={160} />
      ) : queueQuery.isError && !items.length ? (
        <Card className="p-5">
          <ContextualErrorState compact error={queueQuery.error} onRetry={() => queueQuery.refetch()} />
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-6">
          <ContextualEmptyState
            variant={isFilterZero ? 'search' : 'compact'}
            illustration={isFilterZero ? 'search' : 'book'}
            title={isFilterZero ? tr('Không tìm thấy kết quả phù hợp') : tr('Chưa có mục kiểm duyệt V2 nào')}
            description={
              isFilterZero
                ? tr('Thử chuyển trạng thái sang "Tất cả" hoặc thay đổi từ khóa để xem các mục kiểm duyệt.')
                : tr('Các đề xuất và nội dung mới từ Tác giả nội dung sẽ hiển thị tại đây.')
            }
            action={isFilterZero ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatusFilter('ALL');
                  setEntityFilter('ALL');
                  setKeyword('');
                  setPage(1);
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null}
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <section className="overflow-hidden rounded-2xl border border-rp-line bg-white">
            <div className="flex items-center justify-between border-b border-rp-line bg-rp-table-head px-4 py-3 text-xs font-semibold text-rp-text-2">
              <span>{tr('Danh sách kiểm duyệt V2')}</span>
              <span>{trf('Tổng {0}', { 0: queueQuery.data?.totalCount ?? items.length })}</span>
            </div>
            <ul className="max-h-[70vh] divide-y divide-[#f5efec] overflow-y-auto">
              {items.map((item) => {
                const isSelected = selectedRequestId === item.requestId;
                const badgeMeta = APPROVAL_BADGES[item.status] || { label: item.status, tone: 'neutral' };
                return (
                  <li key={item.requestId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequestId(item.requestId);
                        setRightsConfirmed(Boolean(item.rightsConfirmed));
                        setReviewNote('');
                      }}
                      className={`w-full border-l-2 px-4 py-3.5 text-left transition-colors hover:bg-rp-row-hover ${
                        isSelected ? 'border-rp-brand bg-rp-brand-tint' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone="brand" size="sm" icon={false}>{formatContentEntityLabel(item.entityType, tr)}</Badge>
                            {item.levelCode && <Badge tone="neutral" size="sm" icon={false}>{item.levelCode}</Badge>}
                            {item.aiProvenance?.aiAssisted && (
                              <Badge tone="warning" size="sm" icon={false}>AI</Badge>
                            )}
                          </div>
                          <p className="truncate text-sm font-bold text-rp-text">{item.rowKey}</p>
                          <p className="text-[11px] text-rp-text-muted">
                            #{item.requestId} · {item.authorName} · {formatSourceTypeLabel(item.sourceType, tr)}
                          </p>
                        </div>
                        <Badge tone={badgeMeta.tone} size="sm" icon={false}>{tr(badgeMeta.label)}</Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {totalPages > 1 && (
              <div className="border-t border-[#f0e8e4] px-4 py-2.5">
                <Pagination
                  currentPage={Math.min(page, totalPages)}
                  totalPages={totalPages}
                  pageSize={20}
                  showPageSize={false}
                  onPageChange={setPage}
                />
              </div>
            )}
          </section>

          <section className="max-h-[82vh] space-y-4 overflow-y-auto rounded-2xl border border-rp-line bg-white p-5">
            {!selectedRequestId ? (
              <ContextualEmptyState
                variant="compact"
                illustration="homework"
                title={tr('Chọn một yêu cầu bên trái để xem chi tiết, nguồn gốc AI và xuất bản.')}
              />
            ) : detailQuery.isPending ? (
              <SakuraLoader variant="section" context="data" delay={140} />
            ) : detailQuery.isError ? (
              <ContextualErrorState compact error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-rp-text">{summary.rowKey}</h3>
                    <p className="text-xs text-rp-text-muted">
                      {summary.authorName} · {tr('Gửi lúc')}: {formatVnDateTime(summary.submittedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={APPROVAL_BADGES[summary.status]?.tone || 'neutral'} size="sm" icon={false}>
                      {formatApprovalStatusLabel(summary.status, tr)}
                    </Badge>
                    {detail.currentEntityPublishStatus && (
                      <Badge tone="info" size="sm" icon={false}>
                        {formatApprovalStatusLabel(detail.currentEntityPublishStatus, tr)} · v{detail.currentEntityVersion ?? 1}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Source, Rights & AI Provenance */}
                <Card className="space-y-2 border-rp-line bg-slate-50/70 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span><strong>{tr('Nguồn gốc')}:</strong> {formatSourceTypeLabel(summary.sourceType, tr)}</span>
                    {summary.sourceReference && <span><strong>{tr('Tham chiếu')}:</strong> {summary.sourceReference}</span>}
                    <span><strong>{tr('Bản quyền khai báo')}:</strong> {formatRightsStatusLabel(summary.rightsStatus, tr)}</span>
                  </div>
                  {summary.aiProvenance?.aiAssisted && (
                    <div className="flex flex-wrap items-center gap-2 text-amber-900">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        {trf('AI tham gia hỗ trợ ({0} / {1}) · Tác giả đã rà soát: {2}', {
                          0: summary.aiProvenance.provider || 'OpenAI',
                          1: summary.aiProvenance.model || 'gpt',
                          2: summary.aiProvenance.humanReviewed ? tr('Có') : tr('Chưa rõ'),
                        })}
                      </span>
                    </div>
                  )}
                </Card>

                <StructuredPreviewBlock detail={detail} />

                {/* Audit / Review History Timeline */}
                {Array.isArray(detail.reviewHistory) && detail.reviewHistory.length > 0 && (
                  <div className="space-y-1.5 rounded-xl border border-rp-line p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-rp-text">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{tr('Lịch sử kiểm duyệt')}</span>
                    </div>
                    <ul className="space-y-1">
                      {detail.reviewHistory.map((h, i) => (
                        <li key={i} className="text-rp-text-2">
                          <strong>{formatAuditActionLabel(h.action, tr)}</strong> ({formatApprovalStatusLabel(h.toStatus, tr)}) · {h.actorName} · {formatVnDateTime(h.atUtc)}
                          {h.note ? ` — "${h.note}"` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Moderation Controls */}
                <div className="space-y-3 border-t border-rp-line pt-4">
                  <Textarea
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={tr('Nhập nhận xét chuyên môn, yêu cầu sửa hoặc lý do từ chối / ngừng xuất bản...')}
                  />

                  <Checkbox
                    label={tr('Xác nhận đã kiểm tra bản quyền nội dung, tính chính xác học thuật và không vi phạm dữ liệu trước khi Xuất bản')}
                    checked={rightsConfirmed}
                    onChange={(e) => setRightsConfirmed(e.target.checked)}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ShieldCheck}
                      disabled={!rightsConfirmed || moderateMutation.isPending}
                      loading={moderateMutation.isPending}
                      onClick={() =>
                        moderateMutation.mutate({
                          requestId: summary.requestId,
                          decision: 'ApproveAndPublish',
                          note: reviewNote,
                          confirmed: rightsConfirmed,
                        })
                      }
                    >
                      {tr('Duyệt & Xuất bản')}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Check}
                      disabled={moderateMutation.isPending}
                      onClick={() =>
                        moderateMutation.mutate({
                          requestId: summary.requestId,
                          decision: 'Approve',
                          note: reviewNote,
                          confirmed: rightsConfirmed,
                        })
                      }
                    >
                      {tr('Chỉ duyệt')}
                    </Button>

                    {summary.status === 'Approved' && detail.currentEntityPublishStatus !== 'Published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={CheckCircle2}
                        disabled={!rightsConfirmed || moderateMutation.isPending}
                        onClick={() =>
                          moderateMutation.mutate({
                            requestId: summary.requestId,
                            decision: 'Publish',
                            note: reviewNote,
                            confirmed: rightsConfirmed,
                          })
                        }
                      >
                        {tr('Xuất bản')}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      icon={MessageSquareWarning}
                      disabled={!reviewNote.trim() || moderateMutation.isPending}
                      onClick={() =>
                        moderateMutation.mutate({
                          requestId: summary.requestId,
                          decision: 'RequestChanges',
                          note: reviewNote.trim(),
                          confirmed: false,
                        })
                      }
                    >
                      {tr('Yêu cầu sửa')}
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      icon={X}
                      disabled={!reviewNote.trim() || moderateMutation.isPending}
                      onClick={() =>
                        moderateMutation.mutate({
                          requestId: summary.requestId,
                          decision: 'Reject',
                          note: reviewNote.trim(),
                          confirmed: false,
                        })
                      }
                    >
                      {tr('Từ chối')}
                    </Button>

                    {detail.currentEntityPublishStatus === 'Published' && summary.targetEntityId && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Archive}
                        disabled={!reviewNote.trim() || unpublishMutation.isPending}
                        onClick={() =>
                          unpublishMutation.mutate({
                            targetType: mapUnpublishTargetType(summary.entityType),
                            targetId: summary.targetEntityId,
                            reason: reviewNote.trim(),
                          })
                        }
                      >
                        {tr('Ngừng xuất bản')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
