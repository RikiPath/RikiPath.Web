import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import { usePagination } from '../../hooks/usePagination.js';
import Pagination from '../../components/Pagination.jsx';
import { getAdminUsers, createAdminUser, disableAdminUser, unwrapApiList } from '../../api/admin.js';

export default function AdminUsers() {
  const { pathname } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Learner' });
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { includeDisabled: true };
      if (selectedRole !== 'ALL') params.role = selectedRole;
      const list = unwrapApiList(await getAdminUsers(params));
      setUsers(list.map((user) => ({
        ...user,
        id: user.id ?? user.userId,
        name: user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Người dùng',
        email: user.email || '',
        role: user.role?.name ?? user.role ?? 'Learner',
        status: user.isActive === false || user.isDisabled ? 'Suspended' : 'Active',
        lastActive: user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('vi-VN') : '—',
      })));
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách người dùng.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, [selectedRole]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
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
  }, [users, searchTerm, selectedRole, selectedStatus]);

  const handleDisableUser = async (user) => {
    if (user.status === 'Suspended') return;
    try {
      await disableAdminUser(user.id);
      await loadUsers();
    } catch (err) { setError(err.message || 'Không thể vô hiệu hóa tài khoản.'); }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault(); setCreating(true); setError('');
    try {
      await createAdminUser(newUser);
      setShowCreate(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'Learner' });
      await loadUsers();
    } catch (err) { setError(err.message || 'Không thể tạo tài khoản.'); }
    finally { setCreating(false); }
  };

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
      case 'Mentor':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-[#fff2e5] text-[#b45309] border border-[#fed7aa] font-bold">Mentor</span>;
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
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-title-sm text-title-sm hover:bg-primary-hover transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Thêm mới
                </button>
              </div>
            </div>

            {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={handleCreateUser} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Tạo tài khoản</h2><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-2 py-1 text-xl" aria-label="Đóng">×</button></div><div className="grid grid-cols-2 gap-3"><input required value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="Tên" className="rounded-lg border border-border-subtle p-2"/><input required value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="Họ" className="rounded-lg border border-border-subtle p-2"/></div><input required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-border-subtle p-2"/><input required type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mật khẩu" className="w-full rounded-lg border border-border-subtle p-2"/><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full rounded-lg border border-border-subtle bg-white p-2">{['Learner', 'ContentAuthor', 'Mentor', 'Admin'].map((role) => <option key={role}>{role}</option>)}</select><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border-subtle px-4 py-2">Hủy</button><button disabled={creating} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">{creating ? 'Đang tạo…' : 'Tạo tài khoản'}</button></div></form></div>}

            {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

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
              {['Learner', 'ContentAuthor', 'Mentor', 'Admin'].map((r) => (
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
                    {loading ? (
                      <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">Đang tải danh sách người dùng…</td></tr>
                    ) : usersOnPage.length === 0 ? (
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
                              <Link to={`/admin/users/detail?id=${u.id}`} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors" title="Chi tiết">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </Link>
                              <button onClick={() => handleDisableUser(u)} disabled={u.status === 'Suspended'} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40" title="Vô hiệu hóa tài khoản">
                                <span className="material-symbols-outlined text-[18px]">person_off</span>
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

