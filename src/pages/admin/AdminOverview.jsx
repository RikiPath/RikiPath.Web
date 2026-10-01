import { AdminShell } from '../../components/shells';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAdminDashboard, getAdminPendingContent, unwrapApiList, unwrapApiResult } from '../../api/admin.js';
export default function AdminOverview() {
  const { pathname } = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  useEffect(() => {
    getAdminDashboard().then((data) => setDashboard(unwrapApiResult(data))).catch((error) => setDashboardError(error.message || 'Không tải được số liệu quản trị.'));
    Promise.allSettled(['Lesson', 'Vocabulary', 'Kanji', 'Grammar', 'MockTest', 'PracticeExercise'].map(async (type) => ({ type, rows: unwrapApiList(await getAdminPendingContent(type)) }))).then((results) => setPendingItems(results.flatMap((result) => result.status === 'fulfilled' ? result.value.rows.map((item) => ({ ...item, entityType: result.value.type })) : []).slice(0, 5)));
  }, []);
  const dashboardMetrics = dashboard && Object.entries(dashboard).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).filter(([, nested]) => ['string', 'number', 'boolean'].includes(typeof nested)).map(([nestedKey, nested]) => [`${key} · ${nestedKey}`, nested])
      : ['string', 'number', 'boolean'].includes(typeof value) ? [[key, value]] : [],
  ).slice(0, 8);
  return (
    <AdminShell pathname={pathname} breadcrumb="Tổng quan">
<div className="bg-background text-on-background flex min-h-screen overflow-x-hidden min-h-screen" data-page="AdminOverview" data-shell-unified="1">


{/*  SideNavBar  */}





{/*  Main Content Wrapper  */}


<div className="flex-1 ml-0 flex flex-col min-h-screen overflow-x-hidden">
{/*  TopNavBar  */}

{/*  Scrollable Canvas  */}
<main className="flex-1 overflow-y-auto bg-surface-canvas p-margin-desktop">
{/*  Hero Stats  */}
{dashboardError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{dashboardError}</div>}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter mb-margin-desktop">
{dashboardMetrics?.length ? dashboardMetrics.map(([label, value]) => <div key={label} className="bg-surface-container-lowest p-gutter rounded-lg border border-border-subtle shadow-sm"><div className="font-body-sm text-body-sm text-on-surface-variant mb-1">{label}</div><div className="font-headline-lg text-headline-lg text-on-surface">{String(value)}</div></div>) : <div className="bg-surface-container-lowest p-gutter rounded-lg border border-border-subtle shadow-sm md:col-span-2 xl:col-span-4"><div className="font-body-sm text-body-sm text-on-surface-variant">{dashboardError ? 'Số liệu chưa khả dụng' : dashboard ? 'API chưa trả về chỉ số để hiển thị.' : 'Đang tải số liệu quản trị…'}</div></div>}
</div>
{/*  Chart Section  */}
<div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-margin-desktop mb-margin-desktop shadow-sm">
<h2 className="font-title-sm text-title-sm text-on-surface mb-4">Platform Activity</h2>
<div className="h-64 w-full bg-surface-container-low/70 flex items-center justify-center border border-border-subtle border-dashed rounded-lg">
<span className="font-body-sm text-body-sm text-on-surface-variant">[Multi-line chart visualization: Learner Login vs Content Usage over 30 days]</span>
</div>
</div>
{/*  Two-Column Grid  */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-margin-desktop mb-margin-desktop">
{/*  Left Column (Pending Review)  */}
<div className="xl:col-span-2 bg-surface-container-lowest border border-border-subtle rounded-lg flex flex-col shadow-sm overflow-hidden">
<div className="p-gutter border-b border-border-subtle bg-surface flex justify-between items-center">
<h2 className="font-title-sm text-title-sm text-on-surface">Pending Review</h2>
<Link to="/admin/content-review" className="font-body-sm text-body-sm text-primary hover:underline font-medium">Xem tất cả</Link>
</div>
<div className="flex-1 overflow-x-auto">
<table className="w-full text-left">
<thead className="bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant">
<tr>
<th className="px-gutter py-cell-v font-normal">Content Item</th>
<th className="px-gutter py-cell-v font-normal">Type</th>
<th className="px-gutter py-cell-v font-normal">Author</th>
<th className="px-gutter py-cell-v font-normal">Submitted</th>
<th className="px-gutter py-cell-v font-normal">Action</th>
</tr>
</thead>
<tbody className="font-table-data text-table-data text-on-surface">
{pendingItems.length ? pendingItems.map((item, index) => <tr key={item.id ?? `${item.entityType}-${index}`} className="border-b border-border-subtle hover:bg-surface-container-low/60 transition-colors"><td className="px-gutter py-cell-h font-medium">{item.title || item.name || `${item.entityType} #${item.id ?? item.entityId ?? ''}`}</td><td className="px-gutter py-cell-h">{item.entityType}</td><td className="px-gutter py-cell-h">{item.authorName || item.createdByName || '—'}</td><td className="px-gutter py-cell-h text-on-surface-variant">{item.submittedAt ? new Date(item.submittedAt).toLocaleString('vi-VN') : '—'}</td><td className="px-gutter py-cell-h"><Link to="/admin/content-review" className="text-primary hover:underline font-medium">Duyệt</Link></td></tr>) : <tr><td colSpan={5} className="px-gutter py-8 text-center text-on-surface-variant">Chưa có dữ liệu chờ duyệt hoặc API không trả danh sách.</td></tr>}
</tbody>
</table>
</div>
</div>
{/*  Right Column (System Alerts)  */}
<div className="bg-surface-container-lowest border border-border-subtle rounded-lg flex flex-col shadow-sm overflow-hidden">
<div className="p-gutter border-b border-border-subtle bg-surface">
<h2 className="font-title-sm text-title-sm text-on-surface">System & Service Alerts</h2>
</div>
<div className="p-gutter flex flex-col gap-cell-h flex-1">
<div className="bg-error-container/60 text-on-error-container p-3 rounded-lg flex items-start border border-outline-variant">
<span className="material-symbols-outlined mr-2 mt-0.5 text-[20px] text-error">warning</span>
<div>
<div className="font-title-sm text-title-sm text-error">Latency Detected</div>
<div className="font-body-sm text-body-sm opacity-90 text-on-surface-variant">Payment Gateway experiencing minor delays. Monitoring active.</div>
</div>
</div>
<div className="bg-surface-container-high/60 text-on-surface p-3 rounded-lg flex items-start border border-border-subtle">
<span className="material-symbols-outlined mr-2 mt-0.5 text-[20px] text-status-pending">pending_actions</span>
<div>
<div className="font-title-sm text-title-sm">Queue Backlog</div>
<div className="font-body-sm text-body-sm text-on-surface-variant">AI Grading queue processing backlog. Est. resolution: 45m.</div>
</div>
</div>
<div className="bg-surface-container-low text-on-surface p-3 rounded-lg flex items-start border border-border-subtle">
<span className="material-symbols-outlined mr-2 mt-0.5 text-[20px] text-primary">build</span>
<div>
<div className="font-title-sm text-title-sm">Scheduled Maintenance</div>
<div className="font-body-sm text-body-sm text-on-surface-variant">Maintenance mode scheduled for 02:00 JST tonight.</div>
</div>
</div>
</div>
</div>
</div>
</main>
{/*  Footer  */}
<footer className="bg-surface border-t border-border-subtle p-gutter text-center shrink-0">
<span className="font-body-sm text-body-sm text-on-surface-variant">© 2024 RikiPath Admin v2.1.0.</span>
</footer>
</div>


    </div>
  
</AdminShell>
);
}
