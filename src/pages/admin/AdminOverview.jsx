import { AdminShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function AdminOverview() {
  const { pathname } = useLocation();
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
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter mb-margin-desktop">
<div className="bg-surface-container-lowest p-gutter rounded-lg border border-border-subtle shadow-sm">
<div className="font-body-sm text-body-sm text-on-surface-variant mb-1">Active Learners</div>
<div className="flex items-baseline justify-between">
<div className="font-headline-lg text-headline-lg text-on-surface">8.4k</div>
<div className="font-label-caps text-label-caps text-status-approved flex items-center">
<span className="material-symbols-outlined text-[14px]">arrow_upward</span> 12%
                        </div>
</div>
</div>
<div className="bg-surface-container-lowest p-gutter rounded-lg border border-border-subtle shadow-sm">
<div className="font-body-sm text-body-sm text-on-surface-variant mb-1">New Registrations</div>
<div className="flex items-baseline justify-between">
<div className="font-headline-lg text-headline-lg text-on-surface">450</div>
<div className="font-body-sm text-body-sm text-on-surface-variant">this week</div>
</div>
</div>
<div className="bg-surface-container-lowest p-gutter rounded-lg border border-border-subtle shadow-sm">
<div className="font-body-sm text-body-sm text-on-surface-variant mb-1">Lesson Completion Rate</div>
<div className="flex items-baseline justify-between">
<div className="font-headline-lg text-headline-lg text-on-surface">78%</div>
<div className="w-16 h-2 bg-surface-container-high rounded-full overflow-hidden self-center ml-2">
<div className="w-[78%] h-full bg-primary rounded-full"></div>
</div>
</div>
</div>
<div className="bg-surface-container-lowest p-gutter rounded-lg border border-border-subtle shadow-sm">
<div className="font-body-sm text-body-sm text-on-surface-variant mb-1">Demo Revenue</div>
<div className="flex items-baseline justify-between">
<div className="font-headline-lg text-headline-lg text-on-surface">450M <span className="text-title-sm font-title-sm">VND</span></div>
<div className="font-label-caps text-label-caps text-error flex items-center">
<span className="material-symbols-outlined text-[14px]">arrow_downward</span> 2%
                        </div>
</div>
</div>
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
<button className="font-body-sm text-body-sm text-primary hover:underline font-medium">View All</button>
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
<tr className="border-b border-border-subtle hover:bg-surface-container-low/60 transition-colors">
<td className="px-gutter py-cell-h font-medium">JLPT N3 Grammar - Lesson 12</td>
<td className="px-gutter py-cell-h">Lesson</td>
<td className="px-gutter py-cell-h">Nguyen Van A</td>
<td className="px-gutter py-cell-h text-on-surface-variant">2 hours ago</td>
<td className="px-gutter py-cell-h"><button className="text-primary hover:underline font-medium">Review</button></td>
</tr>
<tr className="border-b border-border-subtle hover:bg-surface-container-low/60 transition-colors">
<td className="px-gutter py-cell-h font-medium">Business Email Templates</td>
<td className="px-gutter py-cell-h">Kanji</td>
<td className="px-gutter py-cell-h">Tran Thi B</td>
<td className="px-gutter py-cell-h text-on-surface-variant">5 hours ago</td>
<td className="px-gutter py-cell-h"><button className="text-primary hover:underline font-medium">Review</button></td>
</tr>
<tr className="hover:bg-surface-container-low/60 transition-colors">
<td className="px-gutter py-cell-h font-medium">N2 Listening Practice Test 4</td>
<td className="px-gutter py-cell-h">Exam</td>
<td className="px-gutter py-cell-h">Le Van C</td>
<td className="px-gutter py-cell-h text-on-surface-variant">1 day ago</td>
<td className="px-gutter py-cell-h"><button className="text-primary hover:underline font-medium">Review</button></td>
</tr>
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
