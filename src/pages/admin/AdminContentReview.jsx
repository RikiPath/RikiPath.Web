import { AdminShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function AdminContentReview() {
  const { pathname } = useLocation();
  return (
    <AdminShell pathname={pathname} breadcrumb="Duyệt nội dung">
<div className="bg-background text-on-background font-body-md min-h-screen flex overflow-x-hidden min-h-screen" data-page="AdminContentReview" data-shell-unified="1">


{/*  SideNavBar (Shared Component)  */}





{/*  TopNavBar (Shared Component)  */}





{/*  Main Content Area  */}


<main className="ml-0 mt-16 flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-surface-canvas">
{/*  Top Section: Breadcrumbs, Title, Tabs  */}
<div className="px-margin-desktop pt-margin-desktop pb-cell-v border-b border-border-subtle bg-surface-container-lowest">
<div className="text-sm text-on-surface-variant mb-2">
<span>RikiPath Admin</span>
<span className="mx-2">/</span>
<span className="font-medium text-on-surface">Duyệt nội dung</span>
</div>
<div className="flex items-end justify-between mb-4">
<h2 className="font-headline-lg text-headline-lg text-on-surface">Queue Duyệt Nội Dung</h2>
{/*  Quick Meta Info  */}
<div className="flex space-x-6 font-body-sm text-body-sm text-on-surface-variant">
<div className="flex items-center"><span className="material-symbols-outlined text-sm mr-1">person</span><span>Author: Nguyễn Văn A</span></div>
<div className="flex items-center"><span className="material-symbols-outlined text-sm mr-1">schedule</span><span>Submitted: 2 hrs ago</span></div>
<div className="flex items-center"><span className="material-symbols-outlined text-sm mr-1">history</span><span>Revision: #3</span></div>
</div>
</div>
{/*  Tabs  */}
<div className="flex space-x-6 border-b border-border-subtle font-title-sm text-title-sm">
<button className="pb-2 text-primary border-b-2 border-primary">Tất cả (12)</button>
<button className="pb-2 text-on-surface-variant hover:text-primary">Bài học (5)</button>
<button className="pb-2 text-on-surface-variant hover:text-primary">Từ vựng (4)</button>
<button className="pb-2 text-on-surface-variant hover:text-primary">Kanji (2)</button>
<button className="pb-2 text-on-surface-variant hover:text-primary">Ngữ pháp (1)</button>
</div>
</div>
{/*  Split View Layout  */}
<div className="flex-1 flex overflow-hidden">
{/*  Comparison View  */}
<div className="flex-1 flex flex-col overflow-y-auto p-margin-desktop bg-surface-canvas">
<div className="grid grid-cols-2 gap-gutter h-full">
{/*  Left: Current Version  */}
<div className="border border-border-subtle bg-surface-container-lowest rounded-DEFAULT flex flex-col">
<div className="px-cell-h py-cell-v border-b border-border-subtle bg-surface-container-low flex justify-between items-center">
<span className="font-title-sm text-title-sm text-on-surface">Current Version</span>
<span className="bg-primary text-on-primary px-2 py-0.5 rounded font-label-caps text-label-caps">LIVE</span>
</div>
<div className="p-cell-h font-body-md text-body-md text-on-surface overflow-y-auto">
<div className="mb-4">
<label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Title</label>
<div className="bg-surface-container p-2 rounded border border-border-subtle">Bài học 1: Chào hỏi cơ bản</div>
</div>
<div className="mb-4">
<label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Content</label>
<div className="bg-surface-container p-2 rounded min-h-[200px] border border-border-subtle">
                                    Trong bài học này, chúng ta sẽ làm quen với các mẫu câu chào hỏi thông dụng trong tiếng Nhật.
                                </div>
</div>
</div>
</div>
{/*  Right: New Submission (Diff)  */}
<div className="border border-border-subtle bg-surface-container-lowest rounded-DEFAULT flex flex-col shadow-[0px_2px_8px_rgba(223,115,136,0.12)]">
<div className="px-cell-h py-cell-v border-b border-border-subtle bg-surface-container-low flex justify-between items-center">
<span className="font-title-sm text-title-sm text-primary">New Submission (Diff)</span>
<span className="bg-status-pending text-on-primary px-2 py-0.5 rounded font-label-caps text-label-caps">PENDING</span>
</div>
<div className="p-cell-h font-body-md text-body-md text-on-surface overflow-y-auto">
<div className="mb-4">
<label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Title</label>
<div className="bg-surface-container p-2 rounded border border-border-subtle">Bài học 1: Chào hỏi cơ bản <span className="bg-[#f0faee] text-[#2c7a4d] border border-[#d2edd0] px-1 rounded ml-1">+ (Phần 1)</span></div>
</div>
<div className="mb-4">
<label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Content</label>
<div className="bg-surface-container p-2 rounded min-h-[200px] border border-border-subtle">
                                    Trong bài học này, chúng ta sẽ làm quen với các mẫu câu chào hỏi thông dụng trong tiếng Nhật. <span className="bg-[#f0faee] text-[#2c7a4d] border border-[#d2edd0] px-1 rounded">Bao gồm cách chào buổi sáng, trưa, tối.</span>
</div>
</div>
</div>
</div>
</div>
{/*  Action Bar  */}
<div className="mt-6 border-t border-border-subtle pt-6 flex flex-col space-y-4">
<div className="flex items-start space-x-4">
<div className="flex-1">
<label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">Lý do từ chối / yêu cầu sửa (Bắt buộc nếu từ chối)</label>
<textarea className="w-full border border-border-subtle bg-surface-container-lowest rounded-DEFAULT p-2 font-body-md text-body-md focus:border-primary focus:ring-0" placeholder="Nhập lý do..." rows="3"></textarea>
</div>
</div>
<div className="flex justify-end space-x-4">
<button className="px-6 py-2 border border-outline text-on-surface-variant rounded-DEFAULT hover:bg-surface-container-low font-title-sm text-title-sm transition-colors">Từ chối</button>
<button className="px-6 py-2 border border-primary text-primary rounded-DEFAULT hover:bg-primary-fixed font-title-sm text-title-sm transition-colors">Yêu cầu sửa đổi</button>
<button className="px-6 py-2 bg-primary text-on-primary rounded-DEFAULT hover:bg-primary-container font-title-sm text-title-sm transition-colors">Phê duyệt & Xuất bản</button>
</div>
</div>
</div>
{/*  History Sidebar (Collapsible)  */}
<div className="w-80 border-l border-border-subtle bg-surface-container-lowest flex flex-col">
<div className="px-cell-h py-cell-v border-b border-border-subtle flex justify-between items-center bg-surface-container-low">
<span className="font-title-sm text-title-sm text-on-surface">Approval History</span>
<button className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-sm">close</span></button>
</div>
<div className="flex-1 overflow-y-auto p-cell-h space-y-4 font-body-sm text-body-sm">
<div className="relative pl-4 border-l-2 border-border-subtle">
<div className="absolute w-2 h-2 bg-status-pending rounded-full -left-[5px] top-1"></div>
<p className="font-medium text-on-surface">Submitted for Review</p>
<p className="text-on-surface-variant">by Nguyễn Văn A</p>
<p className="text-on-surface-variant text-xs mt-1">Today, 10:30 AM</p>
</div>
<div className="relative pl-4 border-l-2 border-border-subtle">
<div className="absolute w-2 h-2 bg-status-rejected rounded-full -left-[5px] top-1"></div>
<p className="font-medium text-on-surface">Changes Requested</p>
<p className="text-on-surface-variant">by Admin Trần</p>
<p className="text-on-surface-variant text-xs mt-1">Yesterday, 14:00 PM</p>
</div>
<div className="relative pl-4 border-l-2 border-transparent">
<div className="absolute w-2 h-2 bg-border-subtle rounded-full -left-[5px] top-1"></div>
<p className="font-medium text-on-surface">Initial Draft Created</p>
<p className="text-on-surface-variant">by Nguyễn Văn A</p>
<p className="text-on-surface-variant text-xs mt-1">Oct 24, 09:15 AM</p>
</div>
</div>
</div>
</div>
</main>


    </div>
  
</AdminShell>
);
}
