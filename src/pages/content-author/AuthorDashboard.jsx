import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, FilePlus2, FolderUp, PenLine, Search } from 'lucide-react';
import { api } from '@/api/client.js';
import { getSession } from '@/app/auth/session.js';
import { ContentAuthorShell } from '@/layouts';
import Pagination from '@/components/ui/Pagination.jsx';
import { Badge, Banner, Card, EmptyState, ErrorState, Input, PageHeader, RefreshingIndicator, SakuraLoader, Tabs, cx, useDebouncedValue } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

// Workflow states exactly as returned by GET /content-approvals/mine.
const STATUS = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  PendingReview: { label: 'Chờ duyệt', tone: 'warning' },
  Approved: { label: 'Đã duyệt', tone: 'success' },
  Rejected: { label: 'Bị từ chối', tone: 'danger' },
};

const TYPE = {
  Lesson: 'Bài học',
  Vocabulary: 'Từ vựng',
  Kanji: 'Hán tự',
  Grammar: 'Ngữ pháp',
  PracticeExercise: 'Bài tập',
  MockTest: 'Đề thi',
};

const PAGE_SIZE = 8;

function listOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

function lessonTitle(item) {
  const key = String(item?.rowKey || '');
  const split = key.split(' / ');
  return split.length > 1 ? split.slice(0, -1).join(' / ') : key;
}

function groupStatus(items) {
  if (items.some((item) => item.status === 'Rejected')) return 'Rejected';
  if (items.some((item) => item.status === 'PendingReview')) return 'PendingReview';
  if (items.some((item) => item.status === 'Draft')) return 'Draft';
  if (items.length && items.every((item) => item.status === 'Approved')) return 'Approved';
  return items[0]?.status || 'PendingReview';
}

export default function AuthorDashboard() {
  const { trf, tr } = useLocale();
  const uid = getSession()?.userId ?? 'anon';
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState('all');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(term.trim().toLowerCase(), 250);

  const query = useQuery({
    queryKey: ['my-content-approvals', uid],
    queryFn: async () => listOf(await api.get('/content-approvals/mine')),
  });

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of query.data || []) {
      const key = item.batchId || item.sourceFileName || 'other';
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()].map(([id, rows]) => {
      const lesson = rows.find((row) => row.entityType === 'Lesson');
      const counts = rows.reduce((total, row) => {
        if (row.entityType !== 'Lesson') total[row.entityType] = (total[row.entityType] || 0) + 1;
        return total;
      }, {});
      const rejectedRows = rows.filter((r) => r.status === 'Rejected');
      return {
        id,
        rows,
        title: lesson ? lessonTitle(lesson) : rows[0]?.sourceFileName || 'Nội dung đã gửi',
        file: lesson?.sourceFileName || rows[0]?.sourceFileName || '',
        status: groupStatus(rows),
        counts,
        rejectedRows,
        reason: rejectedRows.find((r) => r.reviewNote)?.reviewNote || lesson?.reviewNote || '',
      };
    });
  }, [query.data]);

  const count = (s) => groups.filter((g) => g.status === s).length;
  const filtered = groups.filter((g) => (tab === 'all' || g.status === tab) && (!search || `${g.title} ${g.file}`.toLowerCase().includes(search)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tabs = [
    { value: 'all', label: 'Tất cả', count: groups.length },
    { value: 'PendingReview', label: 'Chờ duyệt', count: count('PendingReview') },
    { value: 'Rejected', label: 'Bị từ chối', count: count('Rejected') },
    { value: 'Approved', label: 'Đã duyệt', count: count('Approved') },
    ...(count('Draft') ? [{ value: 'Draft', label: 'Bản nháp', count: count('Draft') }] : []),
  ];

  return (
    <ContentAuthorShell breadcrumb={tr('Nội dung của tôi')}>
      <div data-page="AuthorDashboard" className="rp-container rp-cq py-[var(--rp-space-page-y)]">
        <PageHeader
          title={tr('Nội dung của tôi')}
          description={tr('Theo dõi trạng thái duyệt của từng bài học đã gửi. Nội dung bị từ chối hiển thị lý do để bạn sửa và gửi lại.')}
          actions={
            <>
              <RefreshingIndicator active={query.isFetching && !query.isPending} />
              <Link to="/content-manual/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border">
                <PenLine aria-hidden="true" className="h-4 w-4" />{' '}{tr('Soạn thủ công')}
              </Link>
              <Link to="/bulk-import/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong rp-press">
                <FolderUp aria-hidden="true" className="h-4 w-4" /> Import Excel
              </Link>
            </>
          }
        />

        {count('Rejected') > 0 && (
          <Banner tone="danger" title={trf('{0} bài cần chỉnh sửa', { 0: count('Rejected') })} className="mb-5">
            {tr('Mở bài bị từ chối để xem lý do, sửa nội dung rồi gửi duyệt lại.')}
          </Banner>
        )}

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Tabs
            label={tr('Lọc theo trạng thái')}
            tabs={tabs}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
          />
          <label className="relative block md:w-72">
            <span className="sr-only">{tr('Tìm theo tên bài hoặc tệp')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
            <Input
              type="search"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setPage(1);
              }}
              placeholder={tr('Tìm bài học hoặc tệp…')}
              className="h-10 pl-10"
            />
          </label>
        </div>

        {query.isPending ? (
          <SakuraLoader variant="section" context="lesson" label={tr('Đang tải danh sách nội dung')} delay={160} />
        ) : query.isError ? (
          <Card><ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} /></Card>
        ) : groups.length === 0 ? (
          <Card>
            <EmptyState
              art="empty"
              title={tr('Bạn chưa gửi nội dung nào')}
              description={tr('Soạn bài học thủ công hoặc nhập từ Excel, xem trước rồi gửi duyệt.')}
              action={<Link to="/bulk-import/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white rp-press"><FilePlus2 aria-hidden="true" className="h-4 w-4" />{' '}{tr('Tạo nội dung đầu tiên')}</Link>}
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card><EmptyState art="search" title={tr('Không có bài phù hợp')} description={tr('Thử bỏ bộ lọc hoặc tìm bằng từ khóa khác.')} /></Card>
        ) : (
          <ul className="space-y-3">
            {visible.map((group) => {
              const s = STATUS[group.status] || { label: group.status, tone: 'neutral' };
              const open = openId === group.id;
              const summary = Object.entries(group.counts).map(([type, n]) => `${n} ${tr(TYPE[type] || type)}`).join(' · ');
              return (
                <li key={group.id}>
                  <Card padded={false} className={cx('overflow-hidden', group.status === 'Rejected' && 'border-rp-danger-line')}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : group.id)}
                      aria-expanded={open}
                      className="rp-focus flex w-full items-start justify-between gap-3 px-5 py-4 text-left hover:bg-rp-bg-2"
                    >
                      <span className="min-w-0">
                        <span className="rp-jp block text-[15px] font-semibold text-rp-text">{tr(group.title)}</span>
                        <span className="mt-0.5 block text-xs text-rp-text-muted">{summary || tr('Chỉ có bài học')}{group.file ? ` · ${group.file}` : ''}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={s.tone}>{tr(s.label)}</Badge>
                        <ChevronDown aria-hidden="true" className={cx('h-4 w-4 text-rp-text-muted transition-transform', open && 'rotate-180')} />
                      </span>
                    </button>
                    {group.status === 'Rejected' && group.reason && (
                      <div className="border-t border-rp-danger-line bg-rp-danger-bg/50 px-5 py-3 text-[13px] leading-6 text-rp-text">
                        <span className="font-semibold text-rp-danger">{tr('Lý do từ chối:')}{' '}</span>
                        {tr(group.reason)}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <Link to="/bulk-import/" className="rp-focus rounded font-semibold text-rp-brand-strong underline">{tr('Sửa tệp & gửi lại')}</Link>
                          <Link to="/content-manual/" className="rp-focus rounded font-semibold text-rp-brand-strong underline">{tr('Sửa thủ công')}</Link>
                        </div>
                      </div>
                    )}
                    {open && (
                      <ul className="border-t border-rp-line">
                        {group.rows.filter((row) => row.entityType !== 'Lesson').map((row) => {
                          const rs = STATUS[row.status] || { label: row.status, tone: 'neutral' };
                          return (
                            <li key={row.id} className="flex items-start justify-between gap-3 border-b border-rp-line px-5 py-2.5 last:border-0">
                              <span className="min-w-0">
                                <span className="rp-jp block text-sm text-rp-text">{row.rowKey || tr('Nội dung')}</span>
                                <span className="text-xs text-rp-text-muted">{tr(TYPE[row.entityType] || row.entityType)}</span>
                                {row.reviewNote && <span className="mt-1 block text-xs text-rp-danger">{row.reviewNote}</span>}
                              </span>
                              <Badge tone={rs.tone} size="sm">{tr(rs.label)}</Badge>
                            </li>
                          );
                        })}
                        {group.rows.every((row) => row.entityType === 'Lesson') && <li className="px-5 py-3 text-xs text-rp-text-muted">{tr('Bài này chỉ có nội dung bài học.')}</li>}
                      </ul>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-5"><Pagination currentPage={safePage} totalPages={totalPages} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} showPageSize={false} itemLabel={tr('bài')} variant="neutral" /></div>
        )}
      </div>
    </ContentAuthorShell>
  );
}
