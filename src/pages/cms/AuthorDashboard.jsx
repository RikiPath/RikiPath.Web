import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { api } from '../../api/client.js';
import { CmsShell } from '../../components/shells';

const STATUS = {
  PendingReview: ['Chờ duyệt', 'bg-[#FFF6E8] text-[#8A5A10]'],
  Draft: ['Bản nháp', 'bg-[#F6F3F4] text-[#6F5660]'],
  Approved: ['Đã duyệt', 'bg-[#E7F6EC] text-[#1E5C36]'],
  Rejected: ['Từ chối', 'bg-[#FDECEE] text-[#A33357]'],
};

const TYPE = {
  Lesson: 'Bài học',
  Vocabulary: 'Từ vựng',
  Kanji: 'Hán tự',
  Grammar: 'Ngữ pháp',
  PracticeExercise: 'Bài tập',
  MockTest: 'Đề thi',
};

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
  if (items.some((item) => item.status === 'PendingReview' || item.status === 'Draft')) return 'PendingReview';
  if (items.every((item) => item.status === 'Approved')) return 'Approved';
  return items[0]?.status || 'PendingReview';
}

export default function AuthorDashboard() {
  const { pathname } = useLocation();
  const [openId, setOpenId] = useState(null);
  const query = useQuery({
    queryKey: ['my-content-approvals'],
    queryFn: async () => listOf(await api.get('/content-approvals/mine')),
  });
  const items = query.data || [];
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = item.batchId || item.sourceFileName || 'other';
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].map(([id, rows]) => {
      const lesson = rows.find((row) => row.entityType === 'Lesson');
      const counts = rows.reduce((total, row) => {
        if (row.entityType !== 'Lesson') total[row.entityType] = (total[row.entityType] || 0) + 1;
        return total;
      }, {});
      return {
        id,
        lesson,
        rows,
        title: lesson ? lessonTitle(lesson) : (rows[0]?.sourceFileName || 'Bài đã gửi'),
        file: lesson?.sourceFileName || rows[0]?.sourceFileName || '',
        status: groupStatus(rows),
        counts,
      };
    });
  }, [items]);
  const approved = groups.filter((group) => group.status === 'Approved').length;
  const pending = groups.filter((group) => group.status === 'PendingReview').length;
  const rejected = groups.filter((group) => group.status === 'Rejected').length;

  return (
    <CmsShell pathname={pathname} breadcrumb="Bảng tác giả">
      <main data-page="AuthorDashboard" className="mx-auto w-full max-w-[880px] px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">Bảng tác giả</h1>
            <p className="mt-1 text-[13px] text-[#967F8A]">Các bài đã gửi, gom theo từng bài học.</p>
          </div>
          <Link to="/bulk-import" className="inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B]">
            Import bài mới
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ['Chờ duyệt', pending],
            ['Đã duyệt', approved],
            ['Từ chối', rejected],
          ].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-[#E8DFDC] bg-white px-3 py-3">
              <p className="text-[12px] text-[#967F8A]">{label}</p>
              <p className="mt-1 text-[20px] font-semibold text-[#AD3155]">{query.isPending ? '—' : count}</p>
            </div>
          ))}
        </div>

        <section className="mt-5 space-y-3">
          {query.isPending && <p className="rounded-xl border border-[#E8DFDC] bg-white px-4 py-8 text-center text-[13px] text-[#AA8F9B]">Đang tải kết quả duyệt…</p>}
          {query.isError && <p className="rounded-xl border border-[#E8DFDC] bg-white px-4 py-8 text-center text-[13px] text-[#AD3155]">{query.error.message}</p>}
          {!query.isPending && !query.isError && !groups.length && (
            <div className="rounded-xl border border-[#E8DFDC] bg-white px-4 py-8 text-center">
              <p className="text-[14px] text-[#3F3038]">Chưa có bài nào được gửi duyệt.</p>
              <Link to="/bulk-import" className="mt-3 inline-block text-[13px] text-[#AD3155]">Thêm bài học từ Excel</Link>
            </div>
          )}
          {groups.map((group) => {
            const [statusLabel, statusClass] = STATUS[group.status] || [group.status, 'bg-[#F6F3F4] text-[#6F5660]'];
            const open = openId === group.id;
            const summary = Object.entries(group.counts).map(([type, count]) => `${count} ${TYPE[type] || type}`).join(' · ');
            return (
              <article key={group.id} className="overflow-hidden rounded-2xl border border-[#E8DFDC] bg-white">
                <button type="button" onClick={() => setOpenId(open ? null : group.id)} className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left">
                  <span className="min-w-0">
                    <span className="block text-[16px] font-medium text-[#2D282A]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{group.title}</span>
                    <span className="mt-1 block text-[12px] text-[#967F8A]">{summary || 'Chỉ có bài học'}{group.file ? ` · ${group.file}` : ''}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass}`}>{statusLabel}</span>
                </button>
                {open && (
                  <ul className="border-t border-[#F1E8E6]">
                    {group.rows.filter((row) => row.entityType !== 'Lesson').map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 border-t border-[#F7F1F2] px-4 py-2.5 first:border-t-0">
                        <span className="min-w-0">
                          <span className="block text-[14px] text-[#3F3038]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>{row.rowKey || 'Nội dung'}</span>
                          <span className="text-[12px] text-[#967F8A]">{TYPE[row.entityType] || row.entityType}</span>
                        </span>
                        {row.reviewNote ? <span className="max-w-[220px] text-right text-[12px] text-[#8A6070]">{row.reviewNote}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </CmsShell>
  );
}
