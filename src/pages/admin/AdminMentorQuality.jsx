import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { getAdminMentorQualityMetrics, unwrapApiList } from '../../api/admin.js';
import { AdminShell } from '../../components/shells';

const METRICS = [
  ['completedSessionsCount', 'Buổi xong'],
  ['cancelledSessionsCount', 'Đã hủy'],
  ['totalReviewsCount', 'Đánh giá'],
  ['averageRating', 'Điểm'],
  ['totalDisputesCount', 'Khiếu nại'],
  ['resolvedRefundCount', 'Đã hoàn'],
];

function metricValue(item, key) {
  if (key === 'averageRating') return Number(item.averageRating || 0).toFixed(1);
  return item[key] ?? 0;
}

function total(rows, key) {
  return rows.reduce((sum, item) => sum + Number(item[key] || 0), 0);
}

function initial(name) {
  const letter = String(name || '').trim().charAt(0);
  return letter ? letter.toUpperCase() : 'C';
}

function Summary({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[#F0E4E9] bg-white px-4 py-4">
      <p className="text-[12px] text-[#8C7782]">{label}</p>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-[#49353F]">{value}</p>
    </div>
  );
}

export default function AdminMentorQuality() {
  const { pathname } = useLocation();
  const query = useQuery({
    queryKey: ['admin-mentor-quality'],
    queryFn: async () => unwrapApiList(await getAdminMentorQualityMetrics({ page: 1, pageSize: 50 })),
  });
  const rows = query.data || [];
  const reviewCount = total(rows, 'totalReviewsCount');
  const rating = reviewCount
    ? (rows.reduce((sum, item) => sum + Number(item.averageRating || 0) * Number(item.totalReviewsCount || 0), 0) / reviewCount).toFixed(1)
    : '0.0';

  return (
    <AdminShell pathname={pathname} breadcrumb="Chất lượng cố vấn">
      <main className="mx-auto max-w-[1080px] px-4 py-6 text-[#49353F] sm:px-6">
        <header className="mb-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">CỐ VẤN</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Chất lượng buổi tư vấn</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#8C7782]">
            Sáu chỉ số cùng một hàng cho từng cố vấn: buổi học, đánh giá và khiếu nại.
          </p>
        </header>

        {query.isError && (
          <p role="alert" className="rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>
        )}
        {query.isPending && <p className="text-[13px] text-[#A08B96]">Đang tải chỉ số…</p>}
        {!query.isPending && !rows.length && !query.isError && (
          <p className="rounded-[22px] border border-dashed border-[#E7C9D6] bg-white px-4 py-14 text-center text-[13px] text-[#A08B96]">
            Chưa có chỉ số chất lượng.
          </p>
        )}

        {rows.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Summary label="Cố vấn" value={rows.length} />
              <Summary label="Buổi hoàn thành" value={total(rows, 'completedSessionsCount')} />
              <Summary label="Khiếu nại" value={total(rows, 'totalDisputesCount')} />
              <Summary label="Điểm trung bình" value={rating} />
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((item) => {
                const name = item.mentorName || `Cố vấn #${item.mentorId}`;
                const rate = Math.max(0, Math.min(100, Number(item.disputeRatePercent || 0)));
                return (
                  <article key={item.mentorId} className="rounded-[22px] border border-[#F0E4E9] bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FDF2F5] text-[15px] font-semibold text-[#AD3155]">
                        {initial(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[16px] font-semibold">{name}</h2>
                        <p className="mt-0.5 text-[12px] text-[#8C7782]">Tỷ lệ khiếu nại {rate}%</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F6EEF2]">
                      <div className="h-full rounded-full bg-[#AD3155]" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
                      {METRICS.map(([key, label]) => (
                        <div key={key} className="rounded-2xl bg-[#FDF2F5] px-3 py-3">
                          <p className="text-[11px] text-[#967F8A]">{label}</p>
                          <p className="mt-1 text-[18px] font-semibold leading-none tracking-tight">{metricValue(item, key)}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>
    </AdminShell>
  );
}
