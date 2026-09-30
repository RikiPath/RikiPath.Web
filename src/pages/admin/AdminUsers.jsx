import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import { usePagination } from '../../hooks/usePagination.js';
import Pagination from '../../components/Pagination.jsx';

const INITIAL_USERS = [
  { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', role: 'Learner', status: 'Active', lastActive: '10 phút trước', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpJX8GsprRFGtQXHHxFANpZX3i7YpGXYwbX0hQPnbfb3Zusq0OUf2k4Wqacta0E8JBTY_eDmVavTXNH5DPQ9g_aVaiJ4Rwwpt-MDfJmLtiLp10jEf_QhNuDihhYE6LJ7yEP9aeYTn62JxHXELNw1_-RWuX4PIf-uF7suwoluLzhIZ5Xx0XXdWlaf9c4FrN8YQ4MCYtnFr-l9qmJk6e8GtfKWbLe02_vhqp0BvZX0r7Ne2giuYUyVmyTA' },
  { id: '2', name: 'Trần Thị B', email: 'tranthib@rikipath.vn', role: 'ContentAuthor', status: 'Suspended', lastActive: '2 ngày trước', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC60Rox3wvcaR3Udzunimawe6Ix1oKarwNNDHMnVFpJ3m8BTqgS6GRSeKjbE1o-fNHcQRY0nRw_sFKB276NADkj-oigZATuPZ02Q-4oDId-rAdeiW1ReoGEEbkA9HjXE2OHDExViQBnvqxslDFFuI9T4cPKdmKKfig1CnYI7XcZ_T7BzfdhUEy0-KyyPocnaSrAariBvUjobCIXJEDB37VF4VjtoydAWwXjJ5UAh7xFNXZI9UQfMAiNZA' },
  { id: '3', name: 'Lê Minh C', email: 'leminhc@sensei.edu.vn', role: 'Consultant', status: 'Pending', lastActive: 'Chưa đăng nhập' },
  { id: '4', name: 'Phạm Thị D', email: 'phamthid@rikipath.admin', role: 'Admin', status: 'Active', lastActive: 'Vừa xong' },
  { id: '5', name: 'Hoàng Văn E', email: 'hoangve@gmail.com', role: 'Learner', status: 'Active', lastActive: '1 giờ trước' },
  { id: '6', name: 'Đỗ Thị F', email: 'dothif@rikipath.vn', role: 'ContentAuthor', status: 'Active', lastActive: '4 giờ trước' },
  { id: '7', name: 'Vũ Đức G', email: 'vuducg@sensei.edu.vn', role: 'Consultant', status: 'Active', lastActive: 'Hôm qua' },
  { id: '8', name: 'Bùi Thị H', email: 'buithih@gmail.com', role: 'Learner', status: 'Suspended', lastActive: '1 tuần trước' },
  { id: '9', name: 'Ngô Quang I', email: 'ngoquangi@rikipath.admin', role: 'Admin', status: 'Active', lastActive: '30 phút trước' },
  { id: '10', name: 'Dương Thị K', email: 'duongthik@gmail.com', role: 'Learner', status: 'Active', lastActive: '3 ngày trước' },
  { id: '11', name: 'Lý Quốc L', email: 'lyquocl@rikipath.vn', role: 'ContentAuthor', status: 'Active', lastActive: '5 giờ trước' },
  { id: '12', name: 'Mai Thu M', email: 'maithum@sensei.edu.vn', role: 'Consultant', status: 'Pending', lastActive: 'Chưa đăng nhập' },
  { id: '13', name: 'Hồ Anh N', email: 'hoanhn@gmail.com', role: 'Learner', status: 'Active', lastActive: '6 giờ trước' },
  { id: '14', name: 'Tạ Văn P', email: 'tavanp@gmail.com', role: 'Learner', status: 'Active', lastActive: 'Hôm nay' },
  { id: '15', name: 'Trịnh Thị Q', email: 'trinhq@rikipath.vn', role: 'ContentAuthor', status: 'Active', lastActive: '2 ngày trước' },
];

export default function AdminUsers() {
  const { pathname } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const filteredUsers = useMemo(() => {
    return INITIAL_USERS.filter((user) => {
      const matchSearch =
        !searchTerm.trim() ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        selectedRole === 'ALL' || user.role.toLowerCase() === selectedRole.toLowerCase();

      const matchStatus =
        selectedStatus === 'ALL' || user.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchSearch && matchRole && matchStatus;
    });
  }, [searchTerm, selectedRole, selectedStatus]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedData: usersOnPage,
  } = usePagination(filteredUsers, { initialPage: 1, initialPageSize: 5 });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-primary text-white font-bold">Admin</span>;
      case 'ContentAuthor':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-rose-50 text-[#D94B68] border border-rose-200 font-bold">Content Author</span>;
      case 'Consultant':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-[#fff2e5] text-[#b45309] border border-[#fed7aa] font-bold">Consultant</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-surface-container text-on-primary-container border border-border-subtle">Learner</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="font-table-data text-table-data text-on-surface font-medium">Active</span>
          </div>
        );
      case 'Pending':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="font-table-data text-table-data text-amber-700 font-medium">Pending</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="font-table-data text-table-data text-rose-700 font-medium">Suspended</span>
          </div>
        );
    }
  };

  return (
    <AdminShell pathname={pathname} breadcrumb="Người dùng">
      <div className="bg-background text-on-surface font-body-md antialiased min-h-screen overflow-x-hidden flex" data-page="AdminUsers" data-shell-unified="1">
        <div className="flex-1 flex flex-col ml-0">
          <main className="flex-1 overflow-y-auto p-margin-desktop bg-surface-canvas">
            {/* Breadcrumbs */}
            <div className="flex items-center text-body-sm font-body-sm text-on-surface-variant mb-6">
              <span className="hover:text-primary cursor-pointer transition-colors">RikiPath Admin</span>
              <span className="material-symbols-outlined mx-2 text-[16px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Người dùng</span>
            </div>

            {/* Page Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Quản lý người dùng & Phân quyền</h2>
                <p className="text-xs text-on-surface-variant mt-1">Danh sách tài khoản hệ thống, cấp phát vai trò và trạng thái truy cập.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-surface-container-lowest border border-border-subtle rounded-xl text-body-md font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-on-surface placeholder:text-on-surface-variant/60"
                    placeholder="Tìm kiếm tên, email..."
                    type="text"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-title-sm text-title-sm hover:bg-primary-hover transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Thêm mới
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-on-surface-variant mr-1">Bộ lọc:</span>
              <button
                onClick={() => setSelectedRole('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedRole === 'ALL' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container border-border-subtle text-on-surface hover:border-primary/50'
                }`}
              >
                Tất cả vai trò
              </button>
              {['Learner', 'ContentAuthor', 'Consultant', 'Admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    selectedRole === r ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container border-border-subtle text-on-surface hover:border-primary/50'
                  }`}
                >
                  {r}
                </button>
              ))}

              <div className="h-4 w-px bg-border-subtle mx-2" />

              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedStatus === 'ALL' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-surface-container border-border-subtle text-on-surface hover:border-zinc-500'
                }`}
              >
                Tất cả trạng thái
              </button>
              {['Active', 'Pending', 'Suspended'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    selectedStatus === st ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-surface-container border-border-subtle text-on-surface hover:border-zinc-500'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Data Table Container */}
            <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-subtle">
                      <th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Người dùng</th>
                      <th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Email</th>
                      <th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Vai trò (Role)</th>
                      <th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Trạng thái</th>
                      <th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low">Hoạt động gần nhất</th>
                      <th className="py-cell-v px-cell-h font-title-sm text-title-sm text-on-surface-variant font-semibold sticky top-0 bg-surface-container-low text-right w-[120px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {usersOnPage.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-4xl mb-2 text-outline">search_off</span>
                          <p className="text-sm font-medium">Không tìm thấy người dùng phù hợp.</p>
                        </td>
                      </tr>
                    ) : (
                      usersOnPage.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-container-low/70 transition-colors group">
                          <td className="py-cell-v px-cell-h">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-border-subtle" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-border-subtle">
                                  {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="font-table-data text-table-data font-medium text-on-surface">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">{u.email}</td>
                          <td className="py-cell-v px-cell-h">{getRoleBadge(u.role)}</td>
                          <td className="py-cell-v px-cell-h">{getStatusBadge(u.status)}</td>
                          <td className="py-cell-v px-cell-h font-table-data text-table-data text-on-surface-variant">{u.lastActive}</td>
                          <td className="py-cell-v px-cell-h text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link to="/admin/users/detail" className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors" title="Chi tiết">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </Link>
                              <button className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors" title="Thao tác khác">
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Functional Pagination Component */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
                itemLabel="người dùng"
                variant="admin"
              />
            </div>
          </main>
        </div>
      </div>
    </AdminShell>
  );
}

