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

  const roleLabel = {
    Admin: 'Quản trị',
    ContentAuthor: 'Biên tập',
    Mentor: 'Mentor',
    Learner: 'Học viên',
  };
  const statusLabel = { Active: 'Hoạt động', Pending: 'Chờ duyệt', Suspended: 'Đã khóa' };

  const getRoleBadge = (role) => {
    const styles = {
      Admin: 'bg-primary text-on-primary',
      ContentAuthor: 'bg-[#fde8ec] text-[#9e2a4b]',
      Mentor: 'bg-[#fff1e6] text-[#9a3412]',
      Learner: 'bg-surface-container text-on-surface',
    };
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-label-sm font-semibold ${styles[role] || styles.Learner}`}>{roleLabel[role] || role}</span>;
  };

  const getStatusBadge = (status) => {
    const dot = { Active: 'bg-emerald-500', Pending: 'bg-amber-500', Suspended: 'bg-rose-500' };
    return (
      <span className="inline-flex items-center gap-1.5 text-label-sm font-medium text-on-surface">
        <span className={`h-2 w-2 rounded-full ${dot[status] || dot.Suspended}`} />
        {statusLabel[status] || status}
      </span>
    );
  };

  const chip = (active) => `rounded-full px-3 py-1.5 text-label-sm font-semibold transition-colors ${active ? 'bg-primary text-on-primary' : 'bg-white text-on-surface ring-1 ring-[#eadfd9] hover:bg-surface-container-low'}`;

  return (
    <AdminShell
      pathname={pathname}
      breadcrumb="Người dùng"
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Tìm theo tên hoặc email"
    >
      <main className="mx-auto max-w-6xl px-4 py-6 text-on-surface sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-label-md uppercase tracking-[0.18em] text-primary">Admin</p>
            <h1 className="mt-1 font-headline-lg text-headline-lg font-bold">Người dùng</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">Tài khoản, vai trò và trạng thái truy cập.</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-label-md text-on-primary shadow-sm hover:opacity-90">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Thêm tài khoản
          </button>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1a1c]/40 p-4">
            <form onSubmit={handleCreateUser} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm font-bold">Tạo tài khoản</h2>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container" aria-label="Đóng">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="Tên" className="rounded-2xl bg-surface-container-low px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-primary" />
                <input required value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="Họ" className="rounded-2xl bg-surface-container-low px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-primary" />
              </div>
              <input required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="w-full rounded-2xl bg-surface-container-low px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-primary" />
              <input required type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mật khẩu, tối thiểu 8 ký tự" className="w-full rounded-2xl bg-surface-container-low px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-primary" />
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full rounded-2xl bg-surface-container-low px-3 py-2.5 outline-none ring-1 ring-transparent focus:ring-primary">
                {['Learner', 'ContentAuthor', 'Mentor', 'Admin'].map((role) => <option key={role} value={role}>{roleLabel[role]}</option>)}
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-full px-4 py-2 font-label-md text-on-surface-variant">Hủy</button>
                <button disabled={creating} className="rounded-full bg-primary px-5 py-2 font-label-md text-on-primary disabled:opacity-50">{creating ? 'Đang tạo…' : 'Tạo tài khoản'}</button>
              </div>
            </form>
          </div>
        )}

        {error && <div role="alert" className="mb-4 rounded-2xl bg-error-container px-4 py-3 text-on-error-container">{error}</div>}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#eadfd9]">
          <div className="flex flex-col gap-4 border-b border-[#eadfd9] p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedRole('ALL')} className={chip(selectedRole === 'ALL')}>Tất cả vai trò</button>
              {['Learner', 'ContentAuthor', 'Mentor', 'Admin'].map((role) => (
                <button key={role} type="button" onClick={() => setSelectedRole(role)} className={chip(selectedRole === role)}>{roleLabel[role]}</button>
              ))}
              <span className="mx-1 hidden w-px bg-[#eadfd9] sm:block" />
              <button type="button" onClick={() => setSelectedStatus('ALL')} className={chip(selectedStatus === 'ALL')}>Mọi trạng thái</button>
              {['Active', 'Pending', 'Suspended'].map((status) => (
                <button key={status} type="button" onClick={() => setSelectedStatus(status)} className={chip(selectedStatus === status)}>{statusLabel[status]}</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-label-sm text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Hoạt động gần nhất</th>
                  <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-14 text-center text-on-surface-variant">Đang tải danh sách…</td></tr>
                ) : usersOnPage.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-14 text-center text-on-surface-variant">Không có người dùng khớp bộ lọc.</td></tr>
                ) : usersOnPage.map((user) => (
                  <tr key={user.id} className="border-t border-[#f3e7ea] hover:bg-surface-container-low/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-label-sm font-bold text-primary">
                          {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-label-md font-semibold">{user.name}</p>
                          <p className="truncate text-label-sm text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-4 text-label-sm text-on-surface-variant">{user.lastActive}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/users/detail?id=${user.id}`} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary" title="Chi tiết">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Link>
                        <button type="button" onClick={() => handleDisableUser(user)} disabled={user.status === 'Suspended'} className="rounded-full p-2 text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-40" title="Vô hiệu hóa tài khoản">
                          <span className="material-symbols-outlined text-[18px]">person_off</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </section>
      </main>
    </AdminShell>
  );
}

