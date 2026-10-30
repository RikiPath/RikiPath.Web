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
      <main data-page={page} className="mx-auto w-full max-w-5xl px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">{title}</h1>
            <p className="mt-1 max-w-xl text-[13px] leading-6 text-[#967F8A]">{hint}</p>
          </div>
          {detail && (
            <Link to={detail.to} className="inline-flex h-10 items-center rounded-xl border border-[#E8DFDC] bg-white px-3.5 text-[13px] text-[#6F5660] hover:bg-[#FFF7F9]">
              {detail.label}
            </Link>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm" className="h-10 w-full max-w-xs rounded-lg border border-[#E8DFDC] bg-white px-3 text-[13px] outline-none focus:border-[#E7C9D4]" />
          {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((item) => (
            <button key={item} type="button" onClick={() => setLevel(item)} className={`h-8 rounded-full px-3 text-[12px] ${level === item ? 'bg-[#FADDE8] text-[#A12E50]' : 'bg-white text-[#826773] ring-1 ring-[#E8DFDC]'}`}>
              {item === 'all' ? 'Mọi cấp' : item}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-[#AA8F9B]">{query.isPending ? 'Đang tải…' : `${visible.length}/${query.data?.total || visible.length}`}</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#E8DFDC] bg-white">
          {query.isError && <p className="px-4 py-8 text-center text-[13px] text-[#AD3155]">{query.error.message}</p>}
          {query.isPending && <p className="px-4 py-8 text-center text-[13px] text-[#AA8F9B]">Đang tải nội dung đã duyệt…</p>}
          {!query.isPending && !query.isError && !visible.length && (
            <p className="px-4 py-10 text-center text-[13px] text-[#AA8F9B]">Chưa có mục nào. Nội dung sẽ hiện sau khi admin duyệt bài học.</p>
          )}
          {!query.isPending && !query.isError && visible.length > 0 && (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FBF8F7] text-[11px] text-[#B18F9E]">
                <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 font-medium">{column.label}</th>)}</tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-t border-[#F1E8E6]">
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-2.5 text-[#3F3038]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                        {row[column.key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </CmsShell>
  );
}
