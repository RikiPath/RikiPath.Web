import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  Plus,
  Volume2,
  X,
} from 'lucide-react';
import { ContentAuthorShell } from '@/layouts';
import {
  Badge,
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataRefreshBoundary,
  DataTable,
  FeatureIcon,
  IconButton,
  Modal,
  PageContainer,
  SakuraLoader,
  UnifiedToolbar,
} from '@/components/ui';
import {
  getSharedBankDetail,
  searchSharedBank,
} from '@/features/content-author/api/sharedBankApi.js';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { useLocale } from '@/locales/locale.js';

function DefaultBankDetail({ data, detailEndpoint }) {
  const { tr } = useLocale();
  if (!data) return null;

  const isKanji = detailEndpoint.includes('/kanji');
  const isGrammar = detailEndpoint.includes('/grammar');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {data.jlptLevelName && (
          <Badge tone="brand" size="sm" icon={false}>{data.jlptLevelName}</Badge>
        )}
        {data.partOfSpeech && (
          <Badge tone="neutral" size="sm" icon={false}>{data.partOfSpeech}</Badge>
        )}
        {isKanji && data.strokeCount ? (
          <Badge tone="info" size="sm" icon={false}>{data.strokeCount} {tr('nét')}</Badge>
        ) : null}
      </div>

      {isKanji ? (
        <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-rp-line bg-rp-bg-2/50 p-4">
          <div className="rp-jp flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-rp-brand-border bg-white text-4xl font-bold text-rp-brand-strong">
            {data.character}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 text-sm">
            <p className="text-base font-bold text-rp-text">{data.meaning}</p>
            {data.sinoVietnamese && (
              <p className="text-xs text-rp-text-2">
                <strong>{tr('Âm Hán Việt')}:</strong> {data.sinoVietnamese}
              </p>
            )}
            {data.onYomi && (
              <p className="rp-jp text-xs text-rp-text-2">
                <strong>On:</strong> {data.onYomi}
              </p>
            )}
            {data.kunYomi && (
              <p className="rp-jp text-xs text-rp-text-2">
                <strong>Kun:</strong> {data.kunYomi}
              </p>
            )}
          </div>
        </div>
      ) : isGrammar ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-rp-line bg-white p-4">
            <p className="text-xs font-medium text-rp-brand-strong">{tr('Cấu trúc')}</p>
            <p className="rp-jp mt-1 text-lg font-bold text-rp-text">{data.structure || data.title}</p>
            {data.title && data.structure && data.title !== data.structure && (
              <p className="mt-1 text-sm text-rp-text-2">{data.title}</p>
            )}
          </div>
          {data.explanation && (
            <div className="rounded-2xl border border-rp-line bg-white p-4">
              <p className="text-xs font-semibold text-rp-text-muted">{tr('Giải thích & cách dùng')}</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-rp-text">{data.explanation}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-rp-line bg-rp-bg-2/50 p-4">
          <p className="rp-jp text-2xl font-bold text-rp-text">{data.word}</p>
          {data.reading && (
            <p className="rp-jp text-sm font-semibold text-rp-brand-strong">{data.reading}</p>
          )}
          <p className="text-sm leading-6 text-rp-text">{data.meaning}</p>
        </div>
      )}

      {data.exampleSentence && (
        <div className="rounded-2xl border border-rp-line bg-white p-4">
          <p className="text-xs font-semibold text-rp-text-muted">{tr('Câu ví dụ')}</p>
          <p className="rp-jp mt-1.5 text-sm font-medium text-rp-text">{data.exampleSentence}</p>
        </div>
      )}

      {data.strokeOrderUrl && (
        <div className="rounded-2xl border border-rp-line bg-white p-4">
          <p className="mb-2 text-xs font-semibold text-rp-text-muted">{tr('Thứ tự nét viết')}</p>
          <img
            src={data.strokeOrderUrl}
            alt={data.character || ''}
            className="max-h-40 rounded-lg border border-rp-line bg-white object-contain p-2"
          />
        </div>
      )}

      {data.audioUrl && (
        <div className="flex items-center gap-3 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-3">
          <Volume2 className="h-4 w-4 shrink-0 text-rp-brand-strong" />
          <audio controls src={data.audioUrl} className="h-8 w-full" />
        </div>
      )}
    </div>
  );
}

export default function ApprovedBankPage({
  pathname,
  page: pageName,
  breadcrumb,
  title,
  hint,
  feature = 'vocab',
  manualType = 'Vocabulary',
  endpoint,
  detailEndpoint,
  secondaryLink,
  columns,
}) {
  const { tr } = useLocale();
  const [keyword, setKeyword] = useState('');
  const [levelId, setLevelId] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRow, setSelectedRow] = useState(null);

  const { levels } = useAuthorLookups();

  const listQuery = useQuery({
    queryKey: ['approved-bank', endpoint, keyword.trim(), levelId, page, pageSize],
    queryFn: () =>
      searchSharedBank(endpoint, {
        keyword: keyword.trim(),
        jlptLevelId: levelId !== 'ALL' ? Number(levelId) : undefined,
        page,
        pageSize,
      }),
    placeholderData: (previous) => previous,
  });

  const resolvedDetailEndpoint =
    detailEndpoint || endpoint.replace(/\/search$/i, '');

  const detailQuery = useQuery({
    queryKey: ['approved-bank-detail', resolvedDetailEndpoint, selectedRow?.id],
    queryFn: () => getSharedBankDetail(resolvedDetailEndpoint, selectedRow.id),
    enabled: Boolean(selectedRow?.id),
  });

  const rows = listQuery.data?.items || [];
  const totalCount = listQuery.data?.totalCount ?? rows.length;
  const hasFilters = keyword.trim() !== '' || levelId !== 'ALL';
  const showToolbar = rows.length > 0 || (listQuery.isSuccess && (totalCount > 0 || hasFilters));

  const handleRefresh = () => listQuery.refetch({ cancelRefetch: true });
  const refreshing = listQuery.isFetching && !listQuery.isPending;

  const tableColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        key: col.key,
        header: tr(col.label),
        render: col.render || ((row) => row[col.key] || '—'),
      })),
    [columns, tr],
  );

  const resetFilters = () => {
    setKeyword('');
    setLevelId('ALL');
    setPage(1);
  };

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb={tr(breadcrumb)}>
      <PageContainer as="div" data-page={pageName} width="default" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rp-brand-strong">
              {tr('Kho học liệu đã duyệt')}
            </p>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-rp-text">
              <FeatureIcon feature={feature} size="lg" />
              <span>{tr(title)}</span>
              {!listQuery.isPending && (
                <Badge tone="neutral" size="sm" icon={false}>{totalCount}</Badge>
              )}
            </h1>
            {hint && <p className="max-w-2xl text-sm text-rp-text-muted">{tr(hint)}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {secondaryLink && (
              <Link
                to={secondaryLink.to}
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text-2 hover:border-rp-brand-border"
              >
                <span>{tr(secondaryLink.label)}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              to={`/content-manual/?type=${encodeURIComponent(manualType)}`}
              className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
            >
              <Plus className="h-4 w-4" />
              <span>{tr('Soạn bổ sung')}</span>
            </Link>
          </div>
        </div>

        {showToolbar && (
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
              placeholder: 'Tìm trong kho đã xuất bản…',
              ariaLabel: 'Tìm trong kho đã xuất bản',
            }}
            filters={
              <CustomSelect
                fitContent
                size="sm"
                value={levelId}
                aria-label={tr('Lọc theo cấp độ')}
                onChange={(val) => {
                  setLevelId(val);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: tr('Mọi cấp độ') },
                  ...levels.map((lvl) => ({
                    value: String(lvl.id),
                    label: `${lvl.certificate} · ${lvl.code}`,
                  })),
                ]}
              />
            }
            actions={
              hasFilters ? (
                <Button variant="ghost" size="sm" icon={X} onClick={resetFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : null
            }
            refresh={{
              onRefresh: handleRefresh,
              refreshing,
              disabled: listQuery.isPending,
            }}
          />
        )}

        <DataRefreshBoundary
          query={listQuery}
          hasData={rows.length > 0}
          context="lesson"
          loadingLabel={tr('Đang tải kho học liệu đã duyệt…')}
          errorTitle={tr('Chưa tải được dữ liệu từ kho đã duyệt')}
        >
          {rows.length === 0 ? (
            <ContextualEmptyState
              variant={hasFilters ? 'search' : 'default'}
              illustration={hasFilters ? 'search' : 'book'}
              title={hasFilters ? tr('Không tìm thấy mục phù hợp') : tr('Chưa có học liệu nào được xuất bản')}
              description={
                hasFilters
                  ? tr('Thử thay đổi từ khóa hoặc chọn cấp độ khác.')
                  : tr('Các mục bạn soạn và được Quản trị viên duyệt sẽ xuất hiện tại đây.')
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>{tr('Xóa bộ lọc')}</Button>
                ) : (
                  <Link
                    to={`/content-manual/?type=${encodeURIComponent(manualType)}`}
                    className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{tr('Soạn nội dung mới')}</span>
                  </Link>
                )
              }
            />
          ) : (
            <DataTable
              columns={tableColumns}
              rows={rows}
              keyField="id"
              page={page}
              pageSize={pageSize}
              total={totalCount}
              itemLabel="mục"
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
              onRowClick={(row) => setSelectedRow(row)}
              rowActions={(row) => (
                <IconButton
                  icon={Eye}
                  size="sm"
                  variant="ghost"
                  label={tr('Xem chi tiết')}
                  onClick={() => setSelectedRow(row)}
                />
              )}
            />
          )}
        </DataRefreshBoundary>

        <Modal
          open={Boolean(selectedRow)}
          onClose={() => setSelectedRow(null)}
          title={selectedRow ? `${tr('Chi tiết')}: ${selectedRow.word || selectedRow.character || selectedRow.title || selectedRow.structure || ''}` : ''}
          size="md"
          footer={
            <div className="flex justify-end">
              <Button onClick={() => setSelectedRow(null)}>{tr('Đóng')}</Button>
            </div>
          }
        >
          {detailQuery.isPending ? (
            <SakuraLoader variant="section" context="lesson" delay={120} />
          ) : detailQuery.isError ? (
            <ContextualErrorState
              compact
              error={detailQuery.error}
              title={tr('Không tải được chi tiết mục này')}
              onRetry={() => detailQuery.refetch()}
            />
          ) : (
            <DefaultBankDetail
              data={detailQuery.data || selectedRow}
              detailEndpoint={resolvedDetailEndpoint}
            />
          )}
        </Modal>
      </PageContainer>
    </ContentAuthorShell>
  );
}
