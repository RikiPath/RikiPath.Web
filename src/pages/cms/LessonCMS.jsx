import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client.js';
import { CmsShell } from '../../components/shells';

const STATUS = {
  PendingReview: ['Chờ duyệt', 'bg-[#FFF6E8] text-[#8A5A10]'],
  Draft: ['Bản nháp', 'bg-[#F6F3F4] text-[#6F5660]'],
  Approved: ['Đã duyệt', 'bg-[#E7F6EC] text-[#1E5C36]'],
  Rejected: ['Từ chối', 'bg-[#FDECEE] text-[#A33357]'],
};

function listOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

function splitTitle(rowKey) {
  const parts = String(rowKey || '').split(' / ');
  if (parts.length < 2) return { title: rowKey || 'Bài học', level: '—' };
  return { title: parts.slice(0, -1).join(' / '), level: parts.at(-1) };
}

export default function LessonCMS() {
  const { pathname } = useLocation();
  const [queryText, setQueryText] = useState('');
  const [level, setLevel] = useState('all');
  const query = useQuery({
    queryKey: ['my-content-approvals'],
    queryFn: async () => listOf(await api.get('/content-approvals/mine')),
  });
  const lessons = useMemo(
    () => (query.data || []).filter((item) => item.entityType === 'Lesson').map((item) => ({ ...item, ...splitTitle(item.rowKey) })),
    [query.data],
  );
  const visible = lessons.filter((lesson) => {
    if (level !== 'all' && lesson.level !== level) return false;
    const text = queryText.trim().toLowerCase();
    return !text || lesson.title.toLowerCase().includes(text);
  });

  return (
    <CmsShell pathname={pathname} breadcrumb="Bài học">
      <main data-page="LessonCMS" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[#49353F]">Bài đã gửi</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">
              Mỗi thẻ là một bài đang trong hàng chờ hoặc đã được duyệt. Từ và ngữ pháp của bài đã duyệt nằm ở kho bên cạnh.
            </p>
          </div>
          <Link to="/bulk-import" className="inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white hover:bg-[#982B4B]">
            Import bài học
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#EADFE5] bg-white p-3">
          <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm bài" className="h-10 min-w-[180px] flex-1 rounded-xl border border-[#EADFE5] bg-[#FCFAFB] px-3 text-[13px] outline-none focus:border-[#E7C9D4]" />
          {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((item) => (
            <button key={item} type="button" onClick={() => setLevel(item)} className={`h-8 rounded-full px-3 text-[12px] ${level === item ? 'bg-[#AD3155] text-white' : 'bg-[#FCFAFB] text-[#826773]'}`}>
              {item === 'all' ? 'Mọi cấp' : item}
            </button>
          ))}
          <span className="px-1 text-[12px] text-[#AA8F9B]">{query.isPending ? 'Đang tải…' : `${visible.length} bài`}</span>
        </div>

        {query.isError && <p className="mt-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {query.isPending && <p className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-4 py-10 text-center text-[13px] text-[#AA8F9B]">Đang tải bài học…</p>}
        {!query.isPending && !query.isError && !visible.length && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E7C9D6] bg-white px-4 py-12 text-center">
            <p className="text-[15px] font-medium text-[#806371]">Chưa có bài nào</p>
            <p className="mt-1 text-[13px] text-[#AA8F9B]">Import một bài học, rồi chờ admin duyệt.</p>
          </div>
        )}
        {!query.isPending && !query.isError && visible.length > 0 && (
          <div className="mt-4 grid gap-3">
            {visible.map((lesson) => {
              const [label, statusClass] = STATUS[lesson.status] || [lesson.status, 'bg-[#F6F3F4] text-[#6F5660]'];
              return (
                <article key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-semibold text-[#49353F]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{lesson.title}</h2>
                    <p className="mt-1 text-[12px] text-[#967F8A]">{lesson.level} · {lesson.sourceFileName || 'Không có tên file'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${statusClass}`}>{label}</span>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </CmsShell>
  );
}
