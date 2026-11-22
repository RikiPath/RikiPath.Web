import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client.js';
import { ContentAuthorShell } from '@/layouts';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader } from '@/components/ui';

async function searchBank(path) {
  const data = await api.post(path, { keyword: '', page: 1, pageSize: 100 });
  const page = data?.result ?? data;
  return {
    items: page?.items || page?.Items || [],
    total: page?.totalCount ?? page?.TotalCount ?? 0,
  };
}

import { AUTHOR_LEVELS } from '@/features/content-author/constants/authorLevels.js';
import { useLocale } from '@/locales/locale.js';

export default function ApprovedBankPage({
  pathname,
  breadcrumb,
  title,
  hint,
  page,
  endpoint,
  columns,
  detail,
}) {
  const { trf, tr } = useLocale();
  const location = useLocation();
  const currentPath = pathname || location.pathname;
  const [queryText, setQueryText] = useState('');
  const [level, setLevel] = useState(AUTHOR_LEVELS[0]);
  const query = useQuery({
    queryKey: ['approved-bank', endpoint],
    queryFn: () => searchBank(endpoint),
  });
  const items = useMemo(() => query.data?.items || [], [query.data]);
  const visible = useMemo(() => {
    const text = queryText.trim().toLowerCase();
    return items.filter((row) => {
      const rowLevel = row.jlptLevelName || row.level || '';
      if (!String(rowLevel).includes(level)) return false;
      if (!text) return true;
      return columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(text));
    });
  }, [items, queryText, level, columns]);

  return (
    <ContentAuthorShell pathname={currentPath} breadcrumb={breadcrumb}>
      <main data-page={page} className="rp-container rp-cq py-[var(--rp-space-page-y)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="rp-type-page-title text-rp-text">{tr(title)}</h1>
            <p className="rp-type-secondary mt-1.5 max-w-xl text-rp-text-muted">{tr(hint)}</p>
          </div>
          {detail && (
            <Link to={detail.to} className="inline-flex h-10 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[13px] text-rp-text-2 hover:bg-rp-brand-tint">
              {tr(detail.label)}
            </Link>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-rp-line bg-white p-3">
          <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder={tr('Tìm trong kho đã duyệt')} className="h-10 min-w-0 flex-1 basis-[180px] rounded-xl border border-rp-line bg-rp-bg-2 px-3 text-[13px] outline-none focus:border-rp-brand-border" />
          {AUTHOR_LEVELS.map((item) => (
            <button key={item} type="button" onClick={() => setLevel(item)} className={`h-8 rounded-full px-3 text-[12px] ${level === item ? 'bg-rp-brand-strong text-white' : 'bg-rp-bg-2 text-rp-text-muted'}`}>
              {item}
            </button>
          ))}
          <span className="px-1 text-[12px] text-rp-text-muted">
            {query.isPending ? tr('Đang tải…') : query.isError ? tr('Lỗi tải dữ liệu') : trf('{0} mục', { 0: visible.length })}
          </span>
        </div>

        {query.isError && (
          <div className="mt-4 rounded-2xl border border-rp-line bg-white px-5">
            <ContextualErrorState
              compact
              error={query.error}
              title={tr('Chưa tải được kho đã duyệt')}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          </div>
        )}
        {query.isPending && (
          <SakuraLoader variant="section" context="data" label={tr('Đang mở kho đã duyệt…')} delay={160} className="mt-4" />
        )}
        {!query.isPending && !query.isError && !visible.length && (
          <div className="mt-4 rounded-2xl border border-dashed border-rp-brand-border bg-white px-4">
            <ContextualEmptyState
              compact
              title={tr('Chưa có mục nào.')}
              description={tr('Nội dung hiện ở đây sau khi admin duyệt bài học.')}
            />
          </div>
        )}
        {!query.isPending && !query.isError && visible.length > 0 && (
          <div style={{ '--rp-grid-min': '17rem' }} className="rp-fluid-grid mt-4">
            {visible.map((row) => {
              const face = row.character || row.word || row.title || row[columns[0].key];
              const big = Boolean(row.character);
              return (
                <article key={row.id} className="rp-card-hover rounded-2xl border border-rp-line bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint font-semibold text-rp-brand-strong ${big ? 'h-16 w-16 text-[28px]' : 'h-12 min-w-12 px-2 text-[13px]'}`} style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                      {String(face || '—').slice(0, big ? 1 : 8)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="truncate text-[16px] font-semibold text-rp-text" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{face || '—'}</h2>
                        {(row.jlptLevelName || row.level) && <span className="shrink-0 rounded-full bg-rp-brand-tint px-2 py-0.5 text-[11px] text-rp-text-muted">{row.jlptLevelName || row.level}</span>}
                      </div>
                      <dl className="mt-2 space-y-1">
                        {columns.filter((column) => column.key !== columns[0].key && column.key !== 'jlptLevelName').map((column) => (
                          <div key={column.key} className="flex gap-2 text-[12px]">
                            <dt className="w-16 shrink-0 text-rp-text-muted">{tr(column.label)}</dt>
                            <dd className="min-w-0 text-rp-brand-deep">{row[column.key] || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </ContentAuthorShell>
  );
}
