import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Eye,
  FilePlus2,
  FolderUp,
  Layers,
  List,
  Pencil,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/api/client.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ContentAuthorShell } from '@/layouts';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  FeatureIcon,
  IconButton,
  Modal,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  Tabs,
  Input,
  notify,
} from '@/components/ui';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { statuses } from '@/features/content-author/utils/contentModel.js';
import {
  ContentForm,
  ContentPreviewPanel,
} from '@/pages/content-author/ManualContentPage.jsx';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { definitions } from '@/features/content-author/utils/contentDefinitions.js';

const STATUS_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Rejected', label: 'Cần chỉnh sửa' },
  { id: 'Draft', label: 'Bản nháp' },
  { id: 'PendingReview', label: 'Chờ duyệt' },
  { id: 'Approved', label: 'Đã duyệt' },
];

const STATUS_BADGE_TONES = {
  Draft: 'neutral',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

function resolveGroupKey(item) {
  if (item.batchId) {
    return item.sourceFileName
      ? `batch:${item.batchId}:${item.sourceFileName}`
      : `batch:${item.batchId}`;
  }
  return item.sourceFileName ? `manual:${item.sourceFileName}` : 'manual:direct';
}

export default function AuthorDashboard() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [statusFilter, setStatusFilter] = useState(
    STATUS_TABS.some((t) => t.id === initialStatus) ? initialStatus : 'all',
  );
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('flat');
  const [searchText, setSearchText] = useState('');

  const [previewTarget, setPreviewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [lastUrlStatus, setLastUrlStatus] = useState(initialStatus);
  if (initialStatus !== lastUrlStatus) {
    setLastUrlStatus(initialStatus);
    setStatusFilter(STATUS_TABS.some((t) => t.id === initialStatus) ? initialStatus : 'all');
  }

  const { lookups, levels, levelById } = useAuthorLookups();

  const mineQuery = useQuery({
    queryKey: ['content-approvals-mine'],
    queryFn: async () => {
      const response = await api.get('/content-approvals/mine');
      return Array.isArray(response) ? response : response?.result || [];
    },
  });

  const activeDetailId = previewTarget?.targetEntityId || editTarget?.targetEntityId || null;
  const detailQuery = useQuery({
    queryKey: ['manual-content-detail', activeDetailId],
    queryFn: () => api.get(`/content-author/manual/items/detail/${activeDetailId}`),
    enabled: Boolean(activeDetailId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['content-approvals-mine'] });
    queryClient.invalidateQueries({ queryKey: ['manual-content'] });
    queryClient.invalidateQueries({ queryKey: ['manual-content-lookups'] });
    queryClient.invalidateQueries({ queryKey: ['author-import-batches'] });
  };

  const saveEdit = useMutation({
    mutationFn: (payload) =>
      api.put(
        `/content-author/manual/items/${editTarget.entityType}/${editTarget.targetEntityId}`,
        payload,
      ),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['manual-content-detail', editTarget?.targetEntityId] });
      notify.success(tr('Đã cập nhật học liệu.'), { key: 'author-dash-save', replace: true });
      setEditTarget(null);
    },
    onError: (err) => notify.apiError(err, tr('Không lưu được chỉnh sửa'), { key: 'author-dash-save', replace: true }),
  });

  const saveAndSubmitEdit = useMutation({
    mutationFn: async (payload) => {
      const targetType = editTarget.entityType;
      const targetId = editTarget.targetEntityId;
      await api.put(`/content-author/manual/items/${targetType}/${targetId}`, payload);
      await api.post(`/content-author/manual/items/${targetId}/submit`, {});
      return targetId;
    },
    onSuccess: () => {
      invalidateAll();
      notify.success(tr('Đã lưu và gửi Admin duyệt.'), { key: 'author-dash-submit', replace: true });
      setEditTarget(null);
    },
    onError: (err) => notify.apiError(err, tr('Không gửi duyệt được mục này'), { key: 'author-dash-submit', replace: true }),
  });

  const submitItem = useMutation({
    mutationFn: (id) => api.post(`/content-author/manual/items/${id}/submit`, {}),
    onSuccess: () => {
      invalidateAll();
      setSubmitTarget(null);
      notify.success(tr('Đã gửi mục nội dung cho Admin duyệt.'), { key: 'author-dash-send', replace: true });
    },
    onError: (err) => notify.apiError(err, tr('Chưa thể gửi duyệt mục này'), { key: 'author-dash-send', replace: true }),
  });

  const deleteItem = useMutation({
    mutationFn: (id) => api.delete(`/content-author/manual/items/${id}`),
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      notify.success(tr('Đã xóa bản nháp.'), { key: 'author-dash-delete', replace: true });
    },
    onError: (err) => notify.apiError(err, tr('Không thể xóa mục này'), { key: 'author-dash-delete', replace: true }),
  });

  const items = useMemo(() => mineQuery.data || [], [mineQuery.data]);

  const counts = useMemo(() => {
    const tally = { all: items.length, Rejected: 0, Draft: 0, PendingReview: 0, Approved: 0 };
    items.forEach((item) => {
      if (Object.hasOwn(tally, item.status)) tally[item.status] += 1;
    });
    return tally;
  }, [items]);

  const entityTypesPresent = useMemo(() => {
    const present = new Set(items.map((item) => item.entityType).filter(Boolean));
    return Object.keys(definitions).filter((k) => present.has(k));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && item.entityType !== typeFilter) return false;
      if (levelFilter !== 'ALL' && String(item.certificateLevelId || '') !== levelFilter) return false;
      if (!q) return true;
      const haystack = `${item.rowKey || ''} ${item.sourceFileName || ''} ${item.reviewNote || ''}`.toLowerCase();
      return haystack.includes(q);
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.rowKey || '').localeCompare(String(b.rowKey || ''), 'vi');
      }
      const ta = new Date(a.updatedAt || a.submittedAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.submittedAt || 0).getTime();
      return sortBy === 'oldest' ? ta - tb : tb - ta;
    });
  }, [items, statusFilter, typeFilter, levelFilter, searchText, sortBy]);

  const groupedBatches = useMemo(() => {
    const groups = new Map();
    filteredItems.forEach((item) => {
      const key = resolveGroupKey(item);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          batchId: item.batchId,
          sourceFileName: item.sourceFileName,
          items: [],
        });
      }
      groups.get(key).items.push(item);
    });
    return Array.from(groups.values());
  }, [filteredItems]);

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'ALL' || levelFilter !== 'ALL' || searchText.trim() !== '';

  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('ALL');
    setLevelFilter('ALL');
    setSearchText('');
    setSearchParams({});
  };

  const handleStatusChange = (id) => {
    setStatusFilter(id);
    const next = new URLSearchParams(searchParams);
    if (id === 'all') next.delete('status');
    else next.set('status', id);
    setSearchParams(next, { replace: true });
  };

  const columns = [
    {
      key: 'rowKey',
      header: tr('Tên học liệu'),
      render: (row) => (
        <div className="min-w-0 max-w-[320px] space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rp-jp truncate font-semibold text-rp-text">{row.rowKey || '—'}</span>
          </div>
          {row.status === 'Rejected' && row.reviewNote && (
            <p className="line-clamp-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-800">
              {tr('Góp ý')}: {row.reviewNote}
            </p>
          )}
          {row.sourceFileName && (
            <p className="truncate text-xs text-rp-text-muted">{row.sourceFileName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'entityType',
      header: tr('Loại'),
      render: (row) => (
        <Badge tone="brand" size="sm" icon={false}>
          {tr(definitions[row.entityType]?.label || row.entityType)}
        </Badge>
      ),
    },
    {
      key: 'level',
      header: tr('Cấp độ'),
      render: (row) => {
        const code = row.certificateLevelCode || levelById.get(Number(row.certificateLevelId))?.code;
        return code ? <Badge tone="neutral" size="sm" icon={false}>{code}</Badge> : <span className="text-xs text-rp-text-muted">—</span>;
      },
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (row) => (
        <Badge tone={STATUS_BADGE_TONES[row.status] || 'neutral'} size="sm" icon={false}>
          {tr(statuses[row.status]?.label ?? row.status)}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: tr('Cập nhật'),
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-rp-text-2">
          {formatVnDateTime(row.updatedAt || row.submittedAt)}
        </span>
      ),
    },
  ];

  const renderRowActions = (row) => {
    const canModify = Boolean(row.targetEntityId) && (row.status === 'Draft' || row.status === 'Rejected');
    return (
      <div className="flex items-center justify-end gap-1">
        {row.targetEntityId && (
          <IconButton
            icon={Eye}
            size="sm"
            variant="ghost"
            label={tr('Xem trước')}
            onClick={() => setPreviewTarget(row)}
          />
        )}
        {row.targetEntityId && row.status !== 'PendingReview' && (
          <Button
            size="sm"
            variant={row.status === 'Rejected' ? 'primary' : 'outline'}
            icon={Pencil}
            onClick={() => setEditTarget(row)}
          >
            {row.status === 'Rejected' ? tr('Sửa & gửi lại') : tr('Sửa')}
          </Button>
        )}
        {canModify && (
          <>
            <IconButton
              icon={Send}
              size="sm"
              variant="ghost"
              label={tr('Gửi Admin duyệt')}
              onClick={() => setSubmitTarget(row)}
            />
            <IconButton
              icon={Trash2}
              size="sm"
              variant="ghost"
              label={tr('Xóa bản nháp')}
              onClick={() => setDeleteTarget(row)}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <ContentAuthorShell breadcrumb={tr('Nội dung của tôi')}>
      <main data-page="author-dashboard" className="mx-auto w-full min-w-0 max-w-[1280px] space-y-5">
        <PageHeader
          eyebrow={tr('Quản lý sản xuất học liệu')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="overview" size="lg" />
              <span>{tr('Nội dung của tôi')}</span>
            </span>
          }
          description={tr('Theo dõi toàn bộ bài học, từ vựng, Hán tự, ngữ pháp và đề thi theo trạng thái kiểm duyệt.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RefreshingIndicator active={mineQuery.isFetching && !mineQuery.isPending} />
              <Link
                to="/bulk-import/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text-2 hover:border-rp-brand-border"
              >
                <FolderUp className="h-4 w-4" />
                <span>{tr('Nhập Excel')}</span>
              </Link>
              <Link
                to="/content-manual/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>{tr('Soạn nội dung')}</span>
              </Link>
            </div>
          }
        />

        {counts.Rejected > 0 && statusFilter !== 'Rejected' && (
          <Banner
            tone="danger"
            title={trf('Có {0} mục bị Admin từ chối cần rà soát', { 0: counts.Rejected })}
            actions={
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('Rejected')}>
                {tr('Lọc mục bị từ chối')}
              </Button>
            }
          >
            {tr('Bạn có thể mở trực tiếp từng mục ở đây để đọc góp ý, chỉnh sửa và gửi duyệt lại.')}
          </Banner>
        )}

        {/* Status Tabs + View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            variant="pill"
            label={tr('Lọc theo trạng thái')}
            value={statusFilter}
            onChange={handleStatusChange}
            tabs={STATUS_TABS.map((tab) => ({
              value: tab.id,
              label: tr(tab.label),
              count: counts[tab.id] || 0,
            }))}
          />
          <Tabs
            variant="pill"
            label={tr('Kiểu hiển thị')}
            value={viewMode}
            onChange={setViewMode}
            tabs={[
              { value: 'flat', label: tr('Tất cả mục'), icon: List },
              { value: 'grouped', label: tr('Nhóm theo bài / lô'), icon: Layers },
            ]}
          />
        </div>

        {/* Search & Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[210px] flex-1">
              <Input
                type="search"
                icon={Search}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={tr('Tìm theo tên mục, tệp nguồn hoặc góp ý…')}
                aria-label={tr('Tìm kiếm nội dung')}
              />
            </div>

            <div className="w-full sm:w-[175px]">
              <CustomSelect
                value={typeFilter}
                aria-label={tr('Loại học liệu')}
                onChange={setTypeFilter}
                options={[
                  { value: 'ALL', label: tr('Tất cả loại') },
                  ...(entityTypesPresent.length > 0 ? entityTypesPresent : Object.keys(definitions)).map((key) => ({
                    value: key,
                    label: tr(definitions[key]?.label || key),
                  })),
                ]}
              />
            </div>

            <div className="w-full sm:w-[165px]">
              <CustomSelect
                value={levelFilter}
                aria-label={tr('Cấp độ')}
                onChange={setLevelFilter}
                options={[
                  { value: 'ALL', label: tr('Mọi cấp độ') },
                  ...levels.map((lvl) => ({
                    value: String(lvl.id),
                    label: `${lvl.certificate} · ${lvl.code}`,
                  })),
                ]}
              />
            </div>

            <div className="w-full sm:w-[165px]">
              <CustomSelect
                value={sortBy}
                aria-label={tr('Sắp xếp')}
                onChange={setSortBy}
                options={[
                  { value: 'recent', label: tr('Mới cập nhật') },
                  { value: 'name', label: tr('Tên A–Z') },
                  { value: 'oldest', label: tr('Cũ nhất') },
                ]}
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" icon={X} onClick={resetFilters}>
                {tr('Xóa bộ lọc')}
              </Button>
            )}
          </div>
        </Card>

        {/* Data Area */}
        {mineQuery.isPending ? (
          <SakuraLoader variant="section" context="lesson" delay={140} />
        ) : mineQuery.isError ? (
          <ContextualErrorState
            error={mineQuery.error}
            title={tr('Chưa tải được danh sách nội dung')}
            onRetry={() => mineQuery.refetch()}
          />
        ) : filteredItems.length === 0 ? (
          <ContextualEmptyState
            title={hasFilters ? tr('Không có mục nào khớp bộ lọc') : tr('Chưa có học liệu nào')}
            description={
              hasFilters
                ? tr('Thử đổi trạng thái, cấp độ hoặc xóa bộ lọc để xem toàn bộ mục của bạn.')
                : tr('Bắt đầu tạo bài học, từ vựng hoặc nhập lô Excel mới để gửi duyệt.')
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : (
                <Link
                  to="/content-manual/"
                  className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white"
                >
                  <FilePlus2 className="h-4 w-4" />
                  <span>{tr('Soạn nội dung mới')}</span>
                </Link>
              )
            }
          />
        ) : viewMode === 'flat' ? (
          <DataTable
            columns={columns}
            rows={filteredItems}
            keyField="id"
            rowActions={renderRowActions}
          />
        ) : (
          <div className="space-y-4">
            {groupedBatches.map((group) => (
              <Card key={group.key} className="overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line bg-rp-bg-2/70 px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-rp-text">
                      {group.batchId
                        ? trf('Lô #{0} · {1}', { 0: group.batchId, 1: group.sourceFileName || tr('Nhập Excel') })
                        : group.sourceFileName || tr('Soạn thủ công')}
                    </h2>
                    <p className="text-xs text-rp-text-muted">{trf('{0} mục nội dung', { 0: group.items.length })}</p>
                  </div>
                  {group.batchId && (
                    <Link
                      to={`/bulk-import/?view=history&batchId=${group.batchId}`}
                      className="rp-link text-xs font-semibold text-rp-brand-strong"
                    >
                      {tr('Mở chi tiết lô')} →
                    </Link>
                  )}
                </div>
                <div className="divide-y divide-rp-line">
                  {group.items.map((item) => {
                    const code = item.certificateLevelCode || levelById.get(Number(item.certificateLevelId))?.code;
                    return (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rp-jp font-semibold text-rp-text">{item.rowKey || '—'}</span>
                            <Badge tone="brand" size="sm" icon={false}>
                              {tr(definitions[item.entityType]?.label || item.entityType)}
                            </Badge>
                            {code && <Badge tone="neutral" size="sm" icon={false}>{code}</Badge>}
                            <Badge tone={STATUS_BADGE_TONES[item.status] || 'neutral'} size="sm" icon={false}>
                              {tr(statuses[item.status]?.label ?? item.status)}
                            </Badge>
                          </div>
                          {item.status === 'Rejected' && item.reviewNote && (
                            <p className="text-xs text-rose-800">{tr('Góp ý')}: {item.reviewNote}</p>
                          )}
                        </div>
                        {renderRowActions(item)}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Preview Modal */}
        <Modal
          open={Boolean(previewTarget)}
          onClose={() => setPreviewTarget(null)}
          title={previewTarget ? `${tr('Xem trước')}: ${previewTarget.rowKey}` : ''}
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              {previewTarget && previewTarget.status !== 'PendingReview' && (
                <Button
                  variant="outline"
                  icon={Pencil}
                  onClick={() => {
                    const next = previewTarget;
                    setPreviewTarget(null);
                    setEditTarget(next);
                  }}
                >
                  {tr('Chỉnh sửa')}
                </Button>
              )}
              <Button onClick={() => setPreviewTarget(null)}>{tr('Đóng')}</Button>
            </div>
          }
        >
          {detailQuery.isPending ? (
            <SakuraLoader variant="section" context="lesson" delay={120} />
          ) : detailQuery.isError ? (
            <ContextualErrorState
              compact
              error={detailQuery.error}
              title={tr('Chưa tải được bản xem trước')}
              onRetry={() => detailQuery.refetch()}
            />
          ) : detailQuery.data && previewTarget ? (
            <ContentPreviewPanel
              type={previewTarget.entityType}
              data={detailQuery.data}
              lookups={lookups}
            />
          ) : null}
        </Modal>

        {/* Inline Edit Modal */}
        <Modal
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          title={editTarget ? `${tr('Chỉnh sửa')}: ${editTarget.rowKey}` : ''}
          size="xl"
        >
          {editTarget && (detailQuery.isPending ? (
            <SakuraLoader variant="section" context="lesson" delay={120} />
          ) : detailQuery.isError ? (
            <ContextualErrorState
              compact
              error={detailQuery.error}
              title={tr('Không tải được chi tiết mục cần sửa')}
              description={describeApiError(detailQuery.error)}
              onRetry={() => detailQuery.refetch()}
            />
          ) : detailQuery.data ? (
            <ContentForm
              key={editTarget.targetEntityId}
              type={editTarget.entityType}
              record={{
                id: editTarget.targetEntityId,
                entityType: editTarget.entityType,
                rowKey: editTarget.rowKey,
                status: editTarget.status,
                reviewNote: editTarget.reviewNote,
              }}
              initial={detailQuery.data}
              lookups={lookups}
              save={saveEdit}
              saveAndSubmit={saveAndSubmitEdit}
              close={() => setEditTarget(null)}
            />
          ) : null)}
        </Modal>

        {/* Submit Confirm */}
        <AlertDialog
          open={Boolean(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onConfirm={() => submitTarget?.targetEntityId && submitItem.mutate(submitTarget.targetEntityId)}
          loading={submitItem.isPending}
          title={tr('Gửi Admin kiểm duyệt?')}
          description={submitTarget ? trf('Mục "{0}" sẽ chuyển sang trạng thái Chờ Admin duyệt.', { 0: submitTarget.rowKey }) : ''}
          confirmLabel={tr('Gửi duyệt')}
        />

        {/* Delete Draft Confirm */}
        <AlertDialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget?.targetEntityId && deleteItem.mutate(deleteTarget.targetEntityId)}
          loading={deleteItem.isPending}
          tone="danger"
          title={tr('Xóa bản nháp này?')}
          description={deleteTarget ? trf('Bản nháp "{0}" sẽ bị xóa khỏi danh sách của bạn.', { 0: deleteTarget.rowKey }) : ''}
          confirmLabel={tr('Xóa bản nháp')}
        />
      </main>
    </ContentAuthorShell>
  );
}
