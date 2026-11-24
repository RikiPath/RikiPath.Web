import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Globe, X } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Modal,
  SakuraLoader,
  SearchInput,
  Textarea,
  notify,
} from '@/components/ui';
import {
  getAdminSrsTemplates,
  reviewSrsTemplate,
  toggleSrsTemplatePublish,
} from '@/features/content-author/api/srsTemplatesApi.js';
import SrsCardPreviewModal from '@/features/srs/components/SrsCardPreviewModal.jsx';
import {
  formatSrsCardTypeLabel,
  getSrsTemplateStatusMeta,
} from '@/features/srs/utils/srsLabels.js';
import { useLocale } from '@/locales/locale.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

export default function AdminSrsTemplatesPanel() {
  const { tr } = useLocale();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('PendingReview');
  const [cardTypeFilter, setCardTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reasonModal, setReasonModal] = useState(null); // { mode: 'reject'|'unpublish', item, reason }
  const [previewItem, setPreviewItem] = useState(null);

  const trimmedSearch = search.trim();
  const hasFilters = Boolean(trimmedSearch || cardTypeFilter || statusFilter !== 'PendingReview');

  const listQuery = useQuery({
    queryKey: ['admin-srs-templates', { statusFilter, cardTypeFilter, search: trimmedSearch }],
    queryFn: () =>
      getAdminSrsTemplates({
        status: statusFilter,
        cardType: cardTypeFilter,
        search: trimmedSearch,
      }),
    placeholderData: (prev) => prev,
  });

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin-srs-templates'] }),
    invalidateSidebarCounters(queryClient),
  ]);

  const reviewMut = useMutation({
    mutationFn: ({ id, approve, reviewNote }) => reviewSrsTemplate(id, { approve, reviewNote }),
    onSuccess: async (_, vars) => {
      notify.success(vars.approve ? tr('Đã duyệt và xuất bản thẻ mẫu SRS.') : tr('Đã từ chối thẻ mẫu SRS.'));
      setReasonModal(null);
      setPreviewItem(null);
      await refresh();
    },
    onError: (err) => notify.apiError(err, tr('Không thể xử lý thẻ mẫu SRS')),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, publish, reason }) => toggleSrsTemplatePublish(id, { publish, reason }),
    onSuccess: async (_, vars) => {
      const msg = vars.publish
        ? tr('Đã xuất bản lại thẻ mẫu SRS.')
        : tr('Đã ngừng xuất bản an toàn thẻ mẫu SRS (giữ nguyên thẻ đã học của Học viên).');
      notify.success(msg);
      setReasonModal(null);
      setPreviewItem(null);
      await refresh();
    },
    onError: (err) => notify.apiError(err, tr('Không thể đổi trạng thái xuất bản')),
  });

  const items = listQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-3.5">
        <div className="w-full sm:w-64">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder={tr('Tìm mặt trước, cách đọc hoặc nghĩa...')}
          />
        </div>
        <CustomSelect
          fitContent
          value={cardTypeFilter}
          onChange={setCardTypeFilter}
          className="min-w-[140px]"
          options={[
            { value: '', label: tr('Mọi loại thẻ') },
            { value: 'Vocabulary', label: tr('Từ vựng') },
            { value: 'Kanji', label: tr('Kanji') },
          ]}
        />
        <CustomSelect
          fitContent
          value={statusFilter}
          onChange={setStatusFilter}
          className="min-w-[164px]"
          options={[
            { value: 'PendingReview', label: tr('Chờ duyệt') },
            { value: 'Published', label: tr('Đã xuất bản') },
            { value: 'Unpublished', label: tr('Ngừng xuất bản') },
            { value: 'Rejected', label: tr('Bị từ chối') },
            { value: '', label: tr('Tất cả') },
          ]}
        />
      </div>

      {listQuery.isLoading ? (
        <SakuraLoader variant="section" />
      ) : listQuery.isError ? (
        <Card className="border-[#EAE3E4] bg-white">
          <ContextualErrorState
            compact
            error={listQuery.error}
            title={tr('Chưa tải được thẻ mẫu SRS')}
            onRetry={() => listQuery.refetch()}
            retrying={listQuery.isFetching}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-[#EAE3E4] bg-white">
          <ContextualEmptyState
            variant={hasFilters ? 'search' : 'compact'}
            framed={false}
            illustration={hasFilters ? 'search' : 'flashcard'}
            title={tr(hasFilters ? 'Không tìm thấy kết quả phù hợp' : 'Không có thẻ mẫu SRS nào')}
            description={tr('Thẻ mẫu do Tác giả nội dung gửi duyệt hoặc đã xuất bản sẽ xuất hiện tại đây.')}
            action={hasFilters ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setCardTypeFilter('');
                  setStatusFilter('');
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const meta = getSrsTemplateStatusMeta(item.status);
            const isPending = item.status === 'PendingReview' || item.status === 1;
            const isPublished = item.status === 'Published' || item.status === 2;
            const isUnpublished = item.status === 'Unpublished' || item.status === 4;
            const isApproving = reviewMut.isPending && reviewMut.variables?.id === item.id && reviewMut.variables?.approve;
            const isRepublishing = publishMut.isPending && publishMut.variables?.id === item.id;

            return (
              <Card
                key={item.id}
                padding="md"
                className="flex flex-col justify-between gap-3 border border-[#EAE3E4] bg-white"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={meta.tone} size="sm">{tr(meta.label)}</Badge>
                      <Badge tone="brand" size="sm" icon={false}>
                        {formatSrsCardTypeLabel(item.cardType, tr)}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-rp-text-muted">
                      {item.submittedByName || tr('Tác giả')} · v{item.version || 1}
                    </span>
                  </div>

                  <div>
                    <p className="rp-jp text-lg font-extrabold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
                      {item.frontText}
                    </p>
                    {item.reading && (
                      <p className="rp-jp text-xs font-semibold text-rp-brand-strong [overflow-wrap:anywhere]" lang="ja">
                        {item.reading}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-rp-text-2 line-clamp-2 [overflow-wrap:anywhere]">
                      {item.meaning || item.backText}
                    </p>
                  </div>

                  {item.unpublishedReason && isUnpublished && (
                    <Banner tone="warning">
                      <strong>{tr('Lý do ngừng xuất bản')}:</strong> {item.unpublishedReason}
                    </Banner>
                  )}

                  {item.reviewNote && (item.status === 'Rejected' || item.status === 3) && (
                    <Banner tone="danger">
                      <strong>{tr('Ghi chú duyệt')}:</strong> {item.reviewNote}
                    </Banner>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rp-line/60 pt-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => setPreviewItem(item)}
                  >
                    {tr('Xem trước')}
                  </Button>

                  {isPending && (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={X}
                        disabled={isApproving}
                        onClick={() => setReasonModal({ mode: 'reject', item, reason: '' })}
                      >
                        {tr('Từ chối')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={Check}
                        loading={isApproving}
                        disabled={isApproving}
                        onClick={() => reviewMut.mutate({ id: item.id, approve: true, reviewNote: '' })}
                      >
                        {tr('Duyệt & Xuất bản')}
                      </Button>
                    </>
                  )}

                  {isPublished && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={EyeOff}
                      onClick={() => setReasonModal({ mode: 'unpublish', item, reason: '' })}
                    >
                      {tr('Ngừng xuất bản (An toàn)')}
                    </Button>
                  )}

                  {isUnpublished && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={Globe}
                      loading={isRepublishing}
                      disabled={isRepublishing}
                      onClick={() => publishMut.mutate({ id: item.id, publish: true, reason: 'Xuất bản lại' })}
                    >
                      {tr('Xuất bản lại')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SrsCardPreviewModal
        open={Boolean(previewItem)}
        item={previewItem}
        title={tr('Xem trước thẻ mẫu (như Học viên nhìn thấy)')}
        statusBadge={previewItem ? (
          <Badge tone={getSrsTemplateStatusMeta(previewItem.status).tone} size="sm">
            {tr(getSrsTemplateStatusMeta(previewItem.status).label)}
          </Badge>
        ) : null}
        versionLabel={previewItem ? `${previewItem.submittedByName || tr('Tác giả')} · v${previewItem.version || 1}` : ''}
        onClose={() => setPreviewItem(null)}
        footer={previewItem && (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
              {tr('Đóng')}
            </Button>
            {(previewItem.status === 'PendingReview' || previewItem.status === 1) && (
              <>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    const target = previewItem;
                    setPreviewItem(null);
                    setReasonModal({ mode: 'reject', item: target, reason: '' });
                  }}
                >
                  {tr('Từ chối')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Check}
                  loading={reviewMut.isPending && reviewMut.variables?.id === previewItem.id}
                  onClick={() => reviewMut.mutate({ id: previewItem.id, approve: true, reviewNote: '' })}
                >
                  {tr('Duyệt & Xuất bản')}
                </Button>
              </>
            )}
          </>
        )}
      />

      <Modal
        open={Boolean(reasonModal)}
        onClose={reviewMut.isPending || publishMut.isPending ? undefined : () => setReasonModal(null)}
        title={reasonModal?.mode === 'reject' ? tr('Từ chối thẻ mẫu SRS') : tr('Ngừng xuất bản thẻ mẫu SRS')}
        description={
          reasonModal?.mode === 'unpublish'
            ? tr('Thẻ mới sẽ không xuất hiện ở danh mục gợi ý, nhưng lịch ôn và thẻ đang học của Học viên vẫn được giữ nguyên.')
            : undefined
        }
        size="sm"
        footer={(
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={reviewMut.isPending || publishMut.isPending}
              onClick={() => setReasonModal(null)}
            >
              {tr('Hủy')}
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={reviewMut.isPending || publishMut.isPending}
              disabled={
                reviewMut.isPending ||
                publishMut.isPending ||
                !reasonModal?.reason?.trim()
              }
              onClick={() => {
                if (reasonModal.mode === 'reject') {
                  reviewMut.mutate({ id: reasonModal.item.id, approve: false, reviewNote: reasonModal.reason.trim() });
                } else {
                  publishMut.mutate({ id: reasonModal.item.id, publish: false, reason: reasonModal.reason.trim() });
                }
              }}
            >
              {reasonModal?.mode === 'reject' ? tr('Xác nhận từ chối') : tr('Ngừng xuất bản')}
            </Button>
          </>
        )}
      >
        {reasonModal && (
          <Textarea
            rows={3}
            value={reasonModal.reason}
            onChange={(e) => setReasonModal((m) => ({ ...m, reason: e.target.value }))}
            placeholder={tr('Nhập lý do...')}
          />
        )}
      </Modal>
    </div>
  );
}
