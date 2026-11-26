import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Globe } from 'lucide-react';
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
  getAdminPublishCatalog,
  toggleAdminPublishContent,
} from '@/features/content-author/api/srsTemplatesApi.js';
import { SUPPORTED_JLPT_LEVELS } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';

export default function AdminPublishManagerPanel() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [entityType, setEntityType] = useState('Vocabulary');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirmItem, setConfirmItem] = useState(null); // { item, publish, reason }

  const catalogQuery = useQuery({
    queryKey: ['admin-publish-catalog', { entityType, statusFilter, levelFilter, search }],
    queryFn: () =>
      getAdminPublishCatalog({
        entityType,
        status: statusFilter,
        jlptLevel: levelFilter,
        search,
      }),
  });

  const toggleMut = useMutation({
    mutationFn: () =>
      toggleAdminPublishContent({
        entityType: confirmItem.item.entityType,
        entityId: confirmItem.item.entityId,
        publish: confirmItem.publish,
        reason: confirmItem.reason,
      }),
    onSuccess: async () => {
      notify.success(
        confirmItem.publish
          ? tr('Đã xuất bản nội dung.')
          : tr('Đã ngừng xuất bản an toàn (dữ liệu & lịch sử SRS của Học viên được bảo toàn).'),
      );
      setConfirmItem(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-publish-catalog'] });
    },
    onError: (err) => notify.apiError(err, tr('Không thể thay đổi trạng thái xuất bản')),
  });

  const items = catalogQuery.data || [];

  return (
    <div className="space-y-4">
      <Banner tone="info" title={tr('Ngừng xuất bản an toàn · Không xóa lịch sử học')}>
        {tr('Khi Quản trị viên ngừng xuất bản một mục học liệu hoặc bài học, Học viên chưa học sẽ không còn thấy mục đó ở kho chung, nhưng thẻ SRS và lịch sử ôn của Học viên đã lưu trước đó vẫn được bảo toàn nguyên vẹn.')}
      </Banner>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-3.5">
        <CustomSelect
          fitContent
          value={entityType}
          onChange={setEntityType}
          className="min-w-[160px]"
          options={[
            { value: 'Vocabulary', label: tr('Từ vựng') },
            { value: 'Kanji', label: tr('Hán tự') },
            { value: 'GrammarPattern', label: tr('Ngữ pháp') },
            { value: 'Lesson', label: tr('Bài học') },
            { value: 'SrsCardTemplate', label: tr('Thẻ mẫu SRS') },
          ]}
        />
        <CustomSelect
          fitContent
          value={statusFilter}
          onChange={setStatusFilter}
          className="min-w-[148px]"
          options={[
            { value: '', label: tr('Mọi trạng thái') },
            { value: 'Published', label: tr('Đang xuất bản') },
            { value: 'Unpublished', label: tr('Ngừng xuất bản') },
          ]}
        />
        <CustomSelect
          fitContent
          value={levelFilter}
          onChange={setLevelFilter}
          className="min-w-[104px]"
          options={[
            { value: '', label: 'N5–N2' },
            ...SUPPORTED_JLPT_LEVELS.map((l) => ({ value: l, label: l })),
          ]}
        />
        <div className="w-full sm:w-64 sm:flex-1">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder={tr('Tìm theo tiêu đề / từ...')}
          />
        </div>
      </div>

      {catalogQuery.isPending ? (
        <SakuraLoader variant="section" />
      ) : catalogQuery.isError ? (
        <Card>
          <ContextualErrorState
            compact
            error={catalogQuery.error}
            title={tr('Chưa tải được danh mục xuất bản')}
            onRetry={() => catalogQuery.refetch()}
            retrying={catalogQuery.isFetching}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <ContextualEmptyState
            variant={search.trim() || statusFilter || levelFilter ? 'search' : 'compact'}
            illustration={search.trim() || statusFilter || levelFilter ? 'search' : 'book'}
            title={tr(search.trim() || statusFilter || levelFilter ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có học liệu nào trong danh mục này')}
            description={tr('Thay đổi bộ lọc loại học liệu hoặc cấp độ JLPT N5–N2.')}
            action={(search.trim() || statusFilter || levelFilter) ? (
              <Button size="sm" variant="outline" onClick={() => { setStatusFilter(''); setLevelFilter(''); setSearch(''); }}>
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null}
          />
        </Card>
      ) : (
        <div className="divide-y divide-[#EAE3E4] overflow-hidden rounded-2xl border border-[#EAE3E4] bg-white">
          {items.map((item) => {
            const isPublished = item.status === 'Published' || item.status === 2;
            return (
              <div
                key={`${item.entityType}-${item.entityId}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[#FFFCF8]"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rp-jp text-sm font-extrabold text-rp-navy" lang="ja">
                      {item.title}
                    </span>
                    {item.jlptLevel && <Badge tone="neutral" size="sm" icon={false}>{item.jlptLevel}</Badge>}
                    <Badge tone={isPublished ? 'success' : 'neutral'} size="sm">
                      {isPublished ? tr('Đang xuất bản') : tr('Ngừng xuất bản')}
                    </Badge>
                    <span className="text-[11px] font-semibold text-rp-text-muted">v{item.version || 1}</span>
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-rp-text-2 truncate">{item.subtitle}</p>
                  )}
                  <p className="text-[11px] text-rp-text-muted">
                    {trf('Đang có {0} thẻ SRS của Học viên gắn với mục này', { 0: item.enrolledLearnerCount || 0 })}
                    {item.unpublishedReason ? ` · ${tr('Lý do')}: ${item.unpublishedReason}` : ''}
                  </p>
                </div>

                <div>
                  {isPublished ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={EyeOff}
                      onClick={() => setConfirmItem({ item, publish: false, reason: '' })}
                    >
                      {tr('Ngừng xuất bản')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={Globe}
                      onClick={() => setConfirmItem({ item, publish: true, reason: '' })}
                    >
                      {tr('Xuất bản lại')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(confirmItem)}
        onClose={() => setConfirmItem(null)}
        title={confirmItem?.publish ? tr('Xuất bản lại học liệu') : tr('Xác nhận ngừng xuất bản an toàn')}
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmItem(null)}>
              {tr('Hủy')}
            </Button>
            <Button
              type="button"
              variant={confirmItem?.publish ? 'primary' : 'danger'}
              loading={toggleMut.isPending}
              onClick={() => toggleMut.mutate()}
            >
              {confirmItem?.publish ? tr('Xuất bản lại') : tr('Ngừng xuất bản')}
            </Button>
          </>
        )}
      >
        {confirmItem && (
          <div className="space-y-3">
            <p className="text-sm text-rp-text-2">
              {confirmItem.publish
                ? trf('Xuất bản lại “{0}” để Học viên mới có thể nhìn thấy.', { 0: confirmItem.item.title })
                : trf('Ngừng xuất bản “{0}” (hiện có {1} thẻ SRS đang học sẽ vẫn được giữ nguyên).', {
                    0: confirmItem.item.title,
                    1: confirmItem.item.enrolledLearnerCount || 0,
                  })}
            </p>
            <Textarea
              rows={2}
              value={confirmItem.reason}
              onChange={(e) => setConfirmItem((c) => ({ ...c, reason: e.target.value }))}
              placeholder={tr('Ghi chú nhật ký kiểm tra (không bắt buộc)...')}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
