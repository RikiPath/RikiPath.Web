import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Eye,
  FileSpreadsheet,
  Pencil,
  Send,
  X,
} from 'lucide-react';
import { api } from '@/api/client.js';
import {
  CONTENT_IMPORT_TYPES,
  getAuthorImportBatch,
  getAuthorImportBatches,
  submitAuthorImportBatch,
} from '@/features/content-author/api/contentImportApi.js';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { useAuth } from '@/app/auth/authContext.js';
import { ContentAuthorShell } from '@/layouts';
import {
  AlertDialog,
  Badge,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataRefreshBoundary,
  DataTable,
  FeatureIcon,
  Modal,
  PageContainer,
  PageHeader,
  RefreshButton,
  SakuraLoader,
  UnifiedToolbar,
  notify,
} from '@/components/ui';
import { ContentForm } from './ManualContentPage.jsx';
import { normalizeKeys, statuses } from '@/features/content-author/utils/contentModel.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const endpoint = '/content-author/manual';
const labels = Object.fromEntries(CONTENT_IMPORT_TYPES.map(({ value, label }) => [value, label.split(' (')[0]]));

const STATUS_BADGE_TONES = {
  Draft: 'neutral',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

function BatchContents({ batchId, batch, userId }) {
  const { tr, trf } = useLocale();
  const [activeItem, setActiveItem] = useState(null);
  const [type, setType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const queryClient = useQueryClient();
  const batchKey = ['author-import-batch', userId, batchId];
  const items = useQuery({ queryKey: batchKey, queryFn: () => getAuthorImportBatch(batchId), retry: false });
  const { lookups } = useAuthorLookups();

  const detailKey = ['manual-content-detail', userId, activeItem?.id];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: async () => normalizeKeys((await api.get(`${endpoint}/items/detail/${activeItem.id}`)).result),
    enabled: Boolean(activeItem),
    retry: false,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: batchKey }),
      queryClient.invalidateQueries({ queryKey: ['author-import-batches', userId] }),
      queryClient.invalidateQueries({ queryKey: ['manual-content-items', userId] }),
      queryClient.invalidateQueries({ queryKey: ['content-approvals-mine'] }),
    ]);

  const save = useMutation({
    mutationFn: (data) => api.put(`${endpoint}/items/${activeItem.entityType}/${activeItem.id}`, data),
    onSuccess: async () => {
      notify.success(tr('Đã lưu chỉnh sửa mục nội dung.'), '', { key: 'author-batch-item-save' });
      await queryClient.invalidateQueries({ queryKey: detailKey });
      setActiveItem(null);
      await refresh();
    },
    onError: (err) => notify.apiError(err, tr('Không lưu được chỉnh sửa mục nội dung'), { key: 'author-batch-item-save-err' }),
  });

  const submit = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang gửi lô nội dung để xét duyệt…'), '', { key: `author-batch-submit-${batchId}`, maxWaitMs: 30000 });
      return submitAuthorImportBatch(batchId);
    },
    onSuccess: async () => {
      notify.success(tr('Đã gửi lô nội dung để Admin xét duyệt.'), '', { key: `author-batch-submit-${batchId}`, replace: true });
      setConfirmSubmit(false);
      await refresh();
    },
    onError: (err) =>
      notify.apiError(err, tr('Không gửi được lô nội dung để duyệt'), {
        key: `author-batch-submit-${batchId}`,
        replace: true,
      }),
  });

  const counts = useMemo(
    () =>
      (items.data || []).reduce((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {}),
    [items.data],
  );

  const draftCount = counts.Draft ?? 0;
  const query = search.trim().toLocaleLowerCase('vi');
  const typesPresent = CONTENT_IMPORT_TYPES.filter((opt) => (items.data || []).some((item) => item.entityType === opt.value));

  const visibleItems = useMemo(
    () =>
      (items.data || []).filter(
        (item) => (type === 'ALL' || type === item.entityType) && item.rowKey.toLocaleLowerCase('vi').includes(query),
      ),
    [items.data, type, query],
  );

  const columns = [
    {
      key: 'rowKey',
      header: tr('Mục nội dung'),
      render: (item) => (
        <div className="space-y-1">
          <p className="rp-jp font-semibold text-rp-text">{item.rowKey}</p>
          {item.sourceRowNumber && (
            <p className="text-xs text-rp-text-muted">{trf('Dòng {0}', { 0: item.sourceRowNumber })}</p>
          )}
          {item.reviewNote && <p className="text-xs text-rose-700">{tr('Góp ý')}: {item.reviewNote}</p>}
        </div>
      ),
    },
    {
      key: 'entityType',
      header: tr('Loại'),
      render: (item) => (
        <Badge tone="brand" size="sm" icon={false}>
          {tr(labels[item.entityType] ?? item.entityType)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (item) => (
        <Badge tone={STATUS_BADGE_TONES[item.status] || 'neutral'} size="sm" icon={false}>
          {tr(statuses[item.status]?.label ?? item.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="break-words text-base font-bold text-rp-text">
            {batch?.sourceFileName ?? items.data?.[0]?.sourceFileName ?? tr('Chi tiết lô Excel')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statuses)
              .filter(([status]) => counts[status])
              .map(([status, meta]) => (
                <Badge key={status} tone={STATUS_BADGE_TONES[status] || 'neutral'} size="sm" icon={false}>
                  {tr(meta.label)}: {counts[status]}
                </Badge>
              ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draftCount > 0 && (
            <Button
              icon={Send}
              disabled={save.isPending || submit.isPending || Boolean(activeItem)}
              onClick={() => setConfirmSubmit(true)}
            >
              {trf('Gửi toàn bộ lô ({0} bản nháp)', { 0: draftCount })}
            </Button>
          )}
        </div>
      </Card>

      {items.isSuccess && (items.data || []).length > 0 && (
        <UnifiedToolbar
          search={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            onClear: () => setSearch(''),
            placeholder: 'Tìm mục trong lô này…',
            ariaLabel: 'Tìm mục trong lô',
          }}
          filters={
            <CustomSelect
              fitContent
              size="sm"
              value={type}
              aria-label={tr('Loại nội dung')}
              onChange={setType}
              options={[
                { value: 'ALL', label: tr('Tất cả loại') },
                ...typesPresent.map((opt) => ({
                  value: opt.value,
                  label: tr(opt.label.split(' (')[0]),
                })),
              ]}
            />
          }
          actions={
            (type !== 'ALL' || search.trim() !== '') ? (
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => {
                  setType('ALL');
                  setSearch('');
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null
          }
          refresh={{
            onRefresh: () => items.refetch({ cancelRefetch: true }),
            refreshing: items.isFetching && !items.isPending,
            disabled: items.isPending,
          }}
        />
      )}

      <DataRefreshBoundary
        query={items}
        hasData={(items.data || []).length > 0}
        context="data"
        errorTitle={tr('Không tải được các mục trong lô')}
      >
        {visibleItems.length === 0 ? (
          <ContextualEmptyState
            variant={(items.data || []).length === 0 ? 'compact' : 'search'}
            illustration={(items.data || []).length === 0 ? 'book' : 'search'}
            title={tr((items.data || []).length === 0 ? 'Chưa có mục nào trong lô.' : 'Không có mục nào khớp bộ lọc')}
            description={(items.data || []).length === 0 ? '' : tr('Hãy xóa bộ lọc hoặc chọn loại nội dung khác.')}
            action={(items.data || []).length > 0 ? <Button variant="outline" size="sm" onClick={() => { setType('ALL'); setSearch(''); }}>{tr('Xóa bộ lọc')}</Button> : null}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={visibleItems}
            keyField="id"
            rowActions={(item) => (
              <Button
                size="sm"
                variant={item.status === 'Draft' || item.status === 'Rejected' ? 'outline' : 'ghost'}
                icon={item.status === 'Draft' || item.status === 'Rejected' ? Pencil : Eye}
                onClick={() => {
                  save.reset();
                  setActiveItem(item);
                }}
              >
                {item.status === 'Draft' || item.status === 'Rejected' ? tr('Sửa') : tr('Xem')}
              </Button>
            )}
          />
        )}
      </DataRefreshBoundary>

      <Modal
        open={Boolean(activeItem)}
        onClose={() => !save.isPending && setActiveItem(null)}
        title={activeItem ? `${tr('Chi tiết mục')}: ${activeItem.rowKey}` : ''}
        size="xl"
      >
        {activeItem && (detail.isPending ? (
          <SakuraLoader variant="section" context="lesson" delay={120} />
        ) : detail.isError ? (
          <ContextualErrorState
            compact
            error={detail.error}
            title={tr('Không tải được chi tiết mục')}
            onRetry={() => detail.refetch()}
          />
        ) : detail.data ? (
          <ContentForm
            key={activeItem.id}
            type={activeItem.entityType}
            record={activeItem}
            initial={detail.data}
            lookups={lookups}
            save={save}
            close={() => setActiveItem(null)}
            viewOnly={activeItem.status !== 'Draft' && activeItem.status !== 'Rejected'}
          />
        ) : null)}
      </Modal>

      <AlertDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => submit.mutate()}
        loading={submit.isPending}
        title={tr('Gửi toàn bộ lô Excel cho Admin duyệt?')}
        description={trf('{0} bản nháp trong lô này sẽ được chuyển sang trạng thái Chờ Admin duyệt.', { 0: draftCount })}
        confirmLabel={tr('Xác nhận gửi')}
      />
    </div>
  );
}

export default function AuthorImportHistory() {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;
  const [params] = useSearchParams();
  const batchId = params.get('batchId');

  const history = useQuery({
    queryKey: ['author-import-batches', userId],
    queryFn: getAuthorImportBatches,
    retry: false,
  });

  const batchColumns = [
    {
      key: 'sourceFileName',
      header: tr('Tệp Excel nguồn'),
      render: (batch) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-rp-text">{batch.sourceFileName}</p>
          <p className="text-xs text-rp-text-muted">{formatVnDateTime(batch.savedAt)}</p>
        </div>
      ),
    },
    {
      key: 'itemCount',
      header: tr('Tổng mục'),
      render: (batch) => <Badge tone="neutral" size="sm" icon={false}>{batch.itemCount}</Badge>,
    },
    {
      key: 'breakdown',
      header: tr('Tiến độ duyệt'),
      render: (batch) => (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {batch.draftCount > 0 && <Badge tone="neutral" size="sm" icon={false}>{tr('Nháp')}: {batch.draftCount}</Badge>}
          {batch.pendingCount > 0 && <Badge tone="warning" size="sm" icon={false}>{tr('Chờ')}: {batch.pendingCount}</Badge>}
          {batch.approvedCount > 0 && <Badge tone="success" size="sm" icon={false}>{tr('Duyệt')}: {batch.approvedCount}</Badge>}
          {batch.rejectedCount > 0 && <Badge tone="danger" size="sm" icon={false}>{tr('Từ chối')}: {batch.rejectedCount}</Badge>}
        </div>
      ),
    },
  ];

  return (
    <ContentAuthorShell pathname="/bulk-import/?view=history" breadcrumb={tr('Lịch sử nhập liệu')}>
      <PageContainer as="div" data-page="author-import-history" width="default" className="space-y-5">
        <PageHeader
          eyebrow={tr('Lịch sử nhập Excel')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="stats" size="lg" />
              <span>{tr('Lịch sử nhập liệu')}</span>
            </span>
          }
          description={tr('Theo dõi các lô Excel đã lưu bản nháp, chỉnh sửa dòng cần bổ sung và gửi Admin duyệt theo lô.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {!batchId && history.isSuccess && (history.data || []).length > 0 && (
                <RefreshButton
                  onRefresh={() => history.refetch({ cancelRefetch: true })}
                  refreshing={history.isFetching && !history.isPending}
                  disabled={history.isPending}
                />
              )}
              {batchId && (
                <Link
                  to="?view=history"
                  className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{tr('Tất cả lô')}</span>
                </Link>
              )}
              <Link
                to="/bulk-import/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>{tr('Nhập Excel mới')}</span>
              </Link>
            </div>
          }
        />

        {batchId ? (
          <BatchContents
            key={batchId}
            batchId={batchId}
            userId={userId}
            batch={history.data?.find((b) => b.batchId === batchId)}
          />
        ) : (
          <DataRefreshBoundary
            query={history}
            hasData={(history.data || []).length > 0}
            context="data"
            loadingLabel={tr('Đang tải các lô đã lưu')}
            errorTitle={tr('Chưa tải được lịch sử nhập liệu')}
          >
            {!history.data?.length ? (
              <ContextualEmptyState
                illustration="table"
                title={tr('Bạn chưa lưu lô Excel nào')}
                description={tr('Tải tệp .xlsx ở trang Nhập Excel để kiểm tra đối chiếu và lưu thành lô bản nháp.')}
                action={
                  <Link
                    to="/bulk-import/"
                    className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{tr('Mở Nhập Excel')}</span>
                  </Link>
                }
              />
            ) : (
              <DataTable
                columns={batchColumns}
                rows={history.data}
                keyField="batchId"
                rowActions={(batch) => (
                  <Link
                    to={`?view=history&batchId=${encodeURIComponent(batch.batchId)}`}
                    className="rp-link text-sm font-semibold text-rp-brand-strong"
                  >
                    {tr('Mở lô')} ({trf('{0} mục', { 0: batch.itemCount })}) →
                  </Link>
                )}
              />
            )}
          </DataRefreshBoundary>
        )}
      </PageContainer>
    </ContentAuthorShell>
  );
}
