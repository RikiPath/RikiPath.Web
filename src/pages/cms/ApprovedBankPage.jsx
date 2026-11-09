import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client.js';
import { CmsShell } from '../../components/shells';

async function searchBank(path) {
  const data = await api.post(path, { keyword: '', page: 1, pageSize: 100 });
  const page = data?.result ?? data;
  return {
    items: page?.items || page?.Items || [],
    total: page?.totalCount ?? page?.TotalCount ?? 0,
  };
}

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
  const location = useLocation();
  const currentPath = pathname || location.pathname;
  const [queryText, setQueryText] = useState('');
  const [level, setLevel] = useState('all');
  const query = useQuery({
    queryKey: ['approved-bank', endpoint],
    queryFn: () => searchBank(endpoint),
  });
  const items = query.data?.items || [];
  const visible = useMemo(() => {
    const text = queryText.trim().toLowerCase();
    return items.filter((row) => {
      const rowLevel = row.jlptLevelName || row.level || '';
      if (level !== 'all' && !String(rowLevel).includes(level)) return false;
      if (!text) return true;
      return columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(text));
    });
  }, [items, queryText, level, columns]);

  return (
    <CmsShell pathname={currentPath} breadcrumb={breadcrumb}>
      <main data-page={page} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[#49353F]">{title}</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">{hint}</p>
          </div>
          {detail && (
            <Link to={detail.to} className="inline-flex h-10 items-center rounded-xl border border-[#E7DAE1] bg-white px-3.5 text-[13px] text-[#6F5660] hover:bg-[#FFF7F9]">
              {detail.label}
            </Link>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#EADFE5] bg-white p-3">
          <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm trong kho đã duyệt" className="h-10 min-w-[180px] flex-1 rounded-xl border border-[#EADFE5] bg-[#FCFAFB] px-3 text-[13px] outline-none focus:border-[#E7C9D4]" />
          {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((item) => (
            <button key={item} type="button" onClick={() => setLevel(item)} className={`h-8 rounded-full px-3 text-[12px] ${level === item ? 'bg-[#AD3155] text-white' : 'bg-[#FCFAFB] text-[#826773]'}`}>
              {item === 'all' ? 'Mọi cấp' : item}
            </button>
          ))}
          <span className="px-1 text-[12px] text-[#AA8F9B]">{query.isPending ? 'Đang tải…' : `${visible.length} mục`}</span>
        </div>

        {query.isError && <p className="mt-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {query.isPending && <p className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-4 py-10 text-center text-[13px] text-[#AA8F9B]">Đang mở kho đã duyệt…</p>}
        {!query.isPending && !query.isError && !visible.length && (
          <p className="mt-4 rounded-2xl border border-dashed border-[#E7C9D6] bg-white px-4 py-12 text-center text-[13px] leading-6 text-[#AA8F9B]">Chưa có mục nào. Nội dung hiện ở đây sau khi admin duyệt bài học.</p>
        )}
        {!query.isPending && !query.isError && visible.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visible.map((row) => {
              const face = row.character || row.word || row.title || row[columns[0].key];
              const big = Boolean(row.character);
              return (
                <article key={row.id} className="rounded-2xl border border-[#EADFE5] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-[#FCEEF3] font-semibold text-[#AD3155] ${big ? 'h-16 w-16 text-[28px]' : 'h-12 min-w-12 px-2 text-[13px]'}`} style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                      {String(face || '—').slice(0, big ? 1 : 8)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="truncate text-[16px] font-semibold text-[#49353F]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{face || '—'}</h2>
                        {(row.jlptLevelName || row.level) && <span className="shrink-0 rounded-full bg-[#FAF6F7] px-2 py-0.5 text-[11px] text-[#8D7481]">{row.jlptLevelName || row.level}</span>}
                      </div>
                      <dl className="mt-2 space-y-1">
                        {columns.filter((column) => column.key !== columns[0].key && column.key !== 'jlptLevelName').map((column) => (
                          <div key={column.key} className="flex gap-2 text-[12px]">
                            <dt className="w-16 shrink-0 text-[#B099A4]">{column.label}</dt>
                            <dd className="min-w-0 text-[#5A3E4C]">{row[column.key] || '—'}</dd>
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
    </CmsShell>
  );
}
