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
      <main data-page="LessonCMS" className="mx-auto w-full max-w-5xl px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">Bài học</h1>
            <p className="mt-1 max-w-xl text-[13px] leading-6 text-[#967F8A]">
              Bài đã gửi duyệt. Từ vựng, Hán tự và ngữ pháp của bài đã duyệt nằm ở từng mục bên cạnh.
            </p>
          </div>
          <Link to="/bulk-import" className="inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white hover:bg-[#982B4B]">
            Import bài học
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm bài" className="h-10 w-full max-w-xs rounded-lg border border-[#E8DFDC] bg-white px-3 text-[13px] outline-none focus:border-[#E7C9D4]" />
          {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((item) => (
            <button key={item} type="button" onClick={() => setLevel(item)} className={`h-8 rounded-full px-3 text-[12px] ${level === item ? 'bg-[#FADDE8] text-[#A12E50]' : 'bg-white text-[#826773] ring-1 ring-[#E8DFDC]'}`}>
              {item === 'all' ? 'Mọi cấp' : item}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-[#AA8F9B]">{query.isPending ? 'Đang tải…' : `${visible.length} bài`}</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#E8DFDC] bg-white">
          {query.isError && <p className="px-4 py-8 text-center text-[13px] text-[#AD3155]">{query.error.message}</p>}
          {query.isPending && <p className="px-4 py-8 text-center text-[13px] text-[#AA8F9B]">Đang tải bài học…</p>}
          {!query.isPending && !query.isError && !visible.length && (
            <p className="px-4 py-10 text-center text-[13px] text-[#AA8F9B]">Chưa có bài. Hãy import một bài học, rồi chờ admin duyệt.</p>
          )}
          {!query.isPending && !query.isError && visible.length > 0 && (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FBF8F7] text-[11px] text-[#B18F9E]">
                <tr>{['Bài', 'Cấp', 'Trạng thái', 'File'].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody>
                {visible.map((lesson) => {
                  const [label, statusClass] = STATUS[lesson.status] || [lesson.status, 'bg-[#F6F3F4] text-[#6F5660]'];
                  return (
                    <tr key={lesson.id} className="border-t border-[#F1E8E6]">
                      <td className="px-3 py-2.5 font-medium text-[#2D282A]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{lesson.title}</td>
                      <td className="px-3 py-2.5">{lesson.level}</td>
                      <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass}`}>{label}</span></td>
                      <td className="px-3 py-2.5 text-[12px] text-[#967F8A]">{lesson.sourceFileName || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </CmsShell>
  );
}
