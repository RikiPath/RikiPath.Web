import { Link, useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
export default function AdminUsers() {
  const { pathname } = useLocation();
  return (
    <AdminShell pathname={pathname} breadcrumb="Người dùng">
<div className="bg-background text-on-surface font-body-md antialiased min-h-screen overflow-x-hidden flex min-h-screen" data-page="AdminUsers" data-shell-unified="1">


{/*  SideNavBar  */}





{/*  TopNavBar & Main Content Wrapper  */}


<div className="flex-1 flex flex-col ml-0">
{/*  TopNavBar  */}

{/*  Main Content Canvas  */}
<main className="flex-1 overflow-y-auto p-margin-desktop bg-surface-canvas">
{/*  Breadcrumbs  */}
<div className="flex items-center text-body-sm font-body-sm text-on-surface-variant mb-6">
<span className="hover:text-primary cursor-pointer transition-colors">RikiPath Admin</span>
<span className="material-symbols-outlined mx-2 text-[16px]">chevron_right</span>
<span className="text-on-surface font-semibold">Người dùng</span>
</div>
{/*  Page Header & Actions  */}
<div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
<h2 className="font-headline-lg text-headline-lg text-on-surface">Quản lý người dùng</h2>
<div className="flex flex-col sm:flex-row gap-3">
<div className="relative w-full sm:w-64">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
<input className="w-full pl-10 pr-3 py-2 bg-surface-container-lowest border border-border-subtle rounded text-body-md font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-on-surface placeholder:text-on-surface-variant/60" placeholder="Tìm kiếm tên, email..." type="text" />
</div>
<div className="flex gap-2">
<button className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest border border-border-subtle rounded text-body-md font-body-md hover:bg-surface-container-low transition-colors text-on-surface">
<span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Lọc
                        </button>
<button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded font-title-sm text-title-sm hover:bg-primary-hover transition-colors shadow-sm">
<span className="material-symbols-outlined text-[18px]">person_add</span>
                            Thêm mới
                        </button>
</div>
</div>
</div>
{/*  Filter Chips  */}
<div className="flex gap-2 mb-4 overflow-x-auto pb-2">
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container border border-border-subtle text-body-sm font-body-sm text-on-surface">
                    Vai trò: Tất cả <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-primary">close</span>
</span>
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container border border-border-subtle text-body-sm font-body-sm text-on-surface">
                    Trạng thái: Active <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-primary">close</span>
</span>
</div>
{/*  Data Table Container  */}
<div className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-hidden flex flex-col shadow-sm">
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low border-b border-border-subtle">
<th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Người dùng</th>
<th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Email</th>
<th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Vai trò</th>
<th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Trạng thái</th>
<th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Hoạt động gần nhất</th>
<th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low text-right w-[120px]">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-border-subtle">
{/*  Row 1: Active Learner  */}
<tr className="hover:bg-surface-container-low/70 transition-colors group">
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container overflow-hidden flex-shrink-0 border border-border-subtle">
<img alt="User 1" className="w-full h-full object-cover" data-alt="A portrait of an eager young adult student, bright lighting, soft focus background, wearing a casual sweater. Modern academic aesthetic, expressing curiosity and active learning." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpJX8GsprRFGtQXHHxFANpZX3i7YpGXYwbX0hQPnbfb3Zusq0OUf2k4Wqacta0E8JBTY_eDmVavTXNH5DPQ9g_aVaiJ4Rwwpt-MDfJmLtiLp10jEf_QhNuDihhYE6LJ7yEP9aeYTn62JxHXELNw1_-RWuX4PIf-uF7suwoluLzhIZ5Xx0XXdWlaf9c4FrN8YQ4MCYtnFr-l9qmJk6e8GtfKWbLe02_vhqp0BvZX0r7Ne2giuYUyVmyTA" />
</div>
<span className="font-table-data text-table-data font-medium text-on-surface">Nguyễn Văn A</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">nguyenvana@*********.com</td>
<td className="py-cell-v px-cell-h">
<span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-surface-container text-on-primary-container border border-border-subtle">
                                        Learner
                                    </span>
</td>
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-1.5">
<div className="w-2 h-2 rounded-full bg-status-approved"></div>
<span className="font-table-data text-table-data text-on-surface">Active</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">10 phút trước</td>
<td className="py-cell-v px-cell-h text-right">
<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
<Link to="/admin/users/detail" className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Chi tiết">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</Link>
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Thao tác khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  Row 2: Suspended Content Author  */}
<tr className="hover:bg-surface-container-low/70 transition-colors group">
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container overflow-hidden flex-shrink-0 border border-border-subtle">
<img alt="User 2" className="w-full h-full object-cover" data-alt="A portrait of a creative professional in their 30s, slightly desaturated color tone, serious expression, wearing glasses. Modern office background out of focus. Corporate content creator vibe." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC60Rox3wvcaR3Udzunimawe6Ix1oKarwNNDHMnVFpJ3m8BTqgS6GRSeKjbE1o-fNHcQRY0nRw_sFKB276NADkj-oigZATuPZ02Q-4oDId-rAdeiW1ReoGEEbkA9HjXE2OHDExViQBnvqxslDFFuI9T4cPKdmKKfig1CnYI7XcZ_T7BzfdhUEy0-KyyPocnaSrAariBvUjobCIXJEDB37VF4VjtoydAWwXjJ5UAh7xFNXZI9UQfMAiNZA" />
</div>
<span className="font-table-data text-table-data font-medium text-on-surface">Trần Thị B</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">tranthib@*********.com</td>
<td className="py-cell-v px-cell-h">
<span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-surface-container-high text-on-surface-variant border border-border-subtle">
                                        Content Author
                                    </span>
</td>
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-1.5">
<div className="w-2 h-2 rounded-full bg-status-rejected"></div>
<span className="font-table-data text-table-data text-on-surface">Suspended</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">2 ngày trước</td>
<td className="py-cell-v px-cell-h text-right">
<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Chi tiết">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Thao tác khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  Row 3: Pending Consultant  */}
<tr className="hover:bg-surface-container-low/70 transition-colors group">
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-3">
<div className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-primary font-bold flex-shrink-0 border border-border-subtle">
                                            LM
                                        </div>
<span className="font-table-data text-table-data font-medium text-on-surface">Lê Minh C</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">leminhc@*********.com</td>
<td className="py-cell-v px-cell-h">
<span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-[#fff2e5] text-[#b45309] border border-[#fed7aa]">
                                        Consultant
                                    </span>
</td>
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-1.5">
<div className="w-2 h-2 rounded-full bg-status-pending"></div>
<span className="font-table-data text-table-data text-on-surface">Pending</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">Chưa đăng nhập</td>
<td className="py-cell-v px-cell-h text-right">
<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Chi tiết">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Thao tác khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  Row 4: Active Admin  */}
<tr className="hover:bg-surface-container-low/70 transition-colors group">
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-3">
<div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container font-bold flex-shrink-0 border border-border-subtle">
                                            PT
                                        </div>
<span className="font-table-data text-table-data font-medium text-on-surface">Phạm Thị D</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">phamthid@*********.com</td>
<td className="py-cell-v px-cell-h">
<span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-primary text-white">
                                        Admin
                                    </span>
</td>
<td className="py-cell-v px-cell-h">
<div className="flex items-center gap-1.5">
<div className="w-2 h-2 rounded-full bg-status-approved"></div>
<span className="font-table-data text-table-data text-on-surface">Active</span>
</div>
</td>
<td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">Vừa xong</td>
<td className="py-cell-v px-cell-h text-right">
<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Chi tiết">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
<button className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors" title="Thao tác khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  Pagination Footer  */}
<div className="bg-surface-container-lowest px-cell-h py-3 border-t border-border-subtle flex items-center justify-between">
<span className="font-body-sm text-body-sm text-on-surface-variant">Hiển thị 1-10 của 418 người dùng</span>
<div className="flex items-center gap-4">
<span className="font-body-sm text-body-sm text-on-surface-variant">Trang 1 / 42</span>
<div className="flex gap-1">
<button className="p-1 rounded text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40" disabled>
<span className="material-symbols-outlined text-[20px]">chevron_left</span>
</button>
<button className="p-1 rounded text-on-surface-variant hover:bg-surface-container-low transition-colors hover:text-primary">
<span className="material-symbols-outlined text-[20px]">chevron_right</span>
</button>
</div>
</div>
</div>
</div>
</main>
</div>


    </div>
  
</AdminShell>
);
}
