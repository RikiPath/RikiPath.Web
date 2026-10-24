import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { AdminShell } from '../../components/shells';
import { usePagination } from '../../hooks/usePagination.js';
import Pagination from '../../components/Pagination.jsx';

import {
  getAdminUsers,
  createAdminUser,
  disableAdminUser,
  unwrapApiList,
} from '../../api/admin.js';

const ROLE_LABELS = {
  Admin: 'Quản trị',
  ContentAuthor: 'Biên tập',
  Mentor: 'Mentor',
  Learner: 'Người ôn luyện',
};

const ROLES = ['Learner', 'ContentAuthor', 'Mentor', 'Admin'];

const EMPTY_USER = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Learner',
};

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-[#DED8DA] bg-white px-3 ' +
  'text-[14px] text-[#2D282A] outline-none transition ' +
  'placeholder:text-[#A39A9E] focus:border-[#A92D50] ' +
  'focus:ring-2 focus:ring-[#A92D50]/10';

const SELECT_CLASS =
  'h-9 rounded-lg border border-[#DED8DA] bg-white px-3 ' +
  'text-[13px] text-[#2D282A] outline-none ' +
  'focus:border-[#A92D50] focus:ring-2 focus:ring-[#A92D50]/10';

function normalizeUser(user) {
  const rawRole =
    typeof user.role === 'string' ? user.role : user.role?.name;

  const role =
    ROLES.find(
      (item) => item.toLowerCase() === String(rawRole).toLowerCase(),
    ) || rawRole || 'Learner';

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ');

  const lastActiveDate = user.lastActiveAt
    ? new Date(user.lastActiveAt)
    : null;

  return {
    ...user,
    id: user.id ?? user.userId,
    name:
      user.fullName ||
      user.name ||
      fullName ||
      user.email ||
      'Người dùng',
    email: user.email || '',
    role,
    status:
      user.isActive === false || user.isDisabled
        ? 'Suspended'
        : 'Active',
    lastActive:
      lastActiveDate && !Number.isNaN(lastActiveDate.getTime())
        ? lastActiveDate.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
  };
}

function getInitials(name) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'ND'
  );
}

function RoleBadge({ role }) {
  const styles = {
    Admin: 'bg-[#F8E9EE] text-[#9E2A4B]',
    ContentAuthor: 'bg-[#EEF2FA] text-[#47628E]',
    Mentor: 'bg-[#FFF2E7] text-[#945B2B]',
    Learner: 'bg-[#F2F3F5] text-[#59616C]',
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded px-2 py-1
        text-[12px] font-medium ${
          styles[role] || styles.Learner
        }`}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function StatusBadge({ status }) {
  const active = status === 'Active';

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap
        text-[13px] ${
          active ? 'text-[#377353]' : 'text-[#88757C]'
        }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-[#389966]' : 'bg-[#A09298]'
        }`}
      />
      {active ? 'Hoạt động' : 'Đã khóa'}
    </span>
  );
}

export default function AdminUsers({ embedded = false }) {
  const { pathname } = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ ...EMPTY_USER });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [userToDisable, setUserToDisable] = useState(null);
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getAdminUsers({
        includeDisabled: true,
      });

      const list = unwrapApiList(response);
      setUsers(list.map(normalizeUser));
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase('vi-VN');

    return users.filter((user) => {
      const matchSearch =
        !keyword ||
        user.name.toLocaleLowerCase('vi-VN').includes(keyword) ||
        user.email.toLocaleLowerCase('vi-VN').includes(keyword);

      const matchRole =
        selectedRole === 'ALL' || user.role === selectedRole;

      const matchStatus =
        selectedStatus === 'ALL' ||
        user.status === selectedStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedData: usersOnPage,
  } = usePagination(filteredUsers, {
    initialPage: 1,
    initialPageSize: 10,
  });

  const hasFilters =
    Boolean(searchTerm.trim()) ||
    selectedRole !== 'ALL' ||
    selectedStatus !== 'ALL';

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRole('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setNewUser({ ...EMPTY_USER });
    setCreateError('');
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreate(false);
    setCreateError('');
  };

  const updateNewUser = (field, value) => {
    setNewUser((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    const payload = {
      ...newUser,
      firstName: newUser.firstName.trim(),
      lastName: newUser.lastName.trim(),
      email: newUser.email.trim(),
    };

    if (!payload.firstName || !payload.lastName) {
      setCreateError('Vui lòng nhập đầy đủ họ và tên.');
      return;
    }

    setCreating(true);
    setCreateError('');
    setSuccess('');

    try {
      await createAdminUser(payload);

      setShowCreate(false);
      setNewUser({ ...EMPTY_USER });
      setSuccess('Đã tạo tài khoản.');
      setCurrentPage(1);

      await loadUsers();
    } catch (err) {
      setCreateError(err.message || 'Không thể tạo tài khoản.');
    } finally {
      setCreating(false);
    }
  };

  const openDisableModal = (user) => {
    if (user.status === 'Suspended') return;
    setDisableError('');
    setUserToDisable(user);
  };

  const closeDisableModal = () => {
    if (disabling) return;
    setUserToDisable(null);
    setDisableError('');
  };

  const handleDisableUser = async () => {
    if (!userToDisable || disabling) return;

    setDisabling(true);
    setDisableError('');
    setSuccess('');

    try {
      await disableAdminUser(userToDisable.id);

      setUserToDisable(null);
      setSuccess('Đã khóa tài khoản.');

      await loadUsers();
    } catch (err) {
      setDisableError(
        err.message || 'Không thể khóa tài khoản.',
      );
    } finally {
      setDisabling(false);
    }
  };

  const page = (
    <>
        <div
          className="mb-3 flex flex-wrap items-center
                     justify-between gap-3"
        >
          {embedded ? (
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none
                           absolute left-3 top-1/2 -translate-y-1/2
                           text-[19px] text-[#A09399]"
              >
                search
              </span>
              <input
                type="search"
                aria-label="Tìm theo tên hoặc email"
                placeholder="Tìm theo tên hoặc email"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="h-9 w-full rounded-[10px] border border-[#E9E1E5]
                           bg-white pl-9 pr-3 text-[12px] text-[#4B4247]
                           placeholder:text-[#A89BA2] focus:border-[#C8889D]
                           focus:outline-none focus:ring-2 focus:ring-[#AD3155]/10"
              />
            </div>
          ) : (
            <div>
              <h1 className="text-[22px] font-semibold leading-tight">
                Người dùng
              </h1>
            </div>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg
                       bg-primary px-4 text-[14px] font-medium
                       text-on-primary transition hover:opacity-90
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[19px]"
            >
              person_add
            </span>
            Thêm tài khoản
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center
                       justify-between gap-2 rounded-lg border
                       border-[#F0CBCD] bg-[#FFF4F4] px-4 py-3
                       text-[13px] text-[#A13943]"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              className="font-medium underline underline-offset-2
                         disabled:opacity-50"
            >
              Thử lại
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between
                       gap-3 rounded-lg border border-[#CEE5D6]
                       bg-[#F2FAF5] px-4 py-3 text-[13px]
                       text-[#377353]"
          >
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess('')}
              aria-label="Đóng thông báo"
              className="inline-flex h-6 w-6 items-center
                         justify-center rounded hover:bg-[#E4F2E9]"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[17px]"
              >
                close
              </span>
            </button>
          </div>
        )}

        <section
          aria-label="Danh sách người dùng"
          className="overflow-hidden rounded-xl border
                     border-[#EAE6E7] bg-white"
        >
          <div
            className="flex flex-wrap items-center justify-between
                       gap-2 border-b border-[#EAE6E7] px-5 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <label
                className="flex items-center gap-2
                           text-[13px] text-[#756D70]"
              >
                Vai trò
                <select
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="ALL">Tất cả</option>

                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>

              <label
                className="flex items-center gap-2
                           text-[13px] text-[#756D70]"
              >
                Trạng thái
                <select
                  value={selectedStatus}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="Active">Hoạt động</option>
                  <option value="Suspended">Đã khóa</option>
                </select>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[13px] text-[#756D70]
                             hover:text-primary"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <span className="text-[13px] text-[#756D70]">
              {loading
                ? 'Đang tải…'
                : `${filteredUsers.length} người dùng`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table
              aria-busy={loading}
              className="w-full min-w-[760px] text-left text-[14px]"
            >
              <thead className="bg-[#FAF9F9]">
                <tr className="text-[12px] text-[#756D70]">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Người dùng
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Vai trò
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Hoạt động gần nhất
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-medium"
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center
                                 text-[14px] text-[#756D70]"
                    >
                      Đang tải…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center
                                 text-[14px] text-[#756D70]"
                    >
                      Không tải được danh sách.
                    </td>
                  </tr>
                ) : usersOnPage.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <p className="text-[14px] font-medium">
                        {hasFilters
                          ? 'Không có kết quả'
                          : 'Chưa có người dùng'}
                      </p>

                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-3 text-[13px] font-medium
                                     text-primary hover:underline"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  usersOnPage.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-[#F0EDEE]
                                 transition-colors hover:bg-[#FCFAFB]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0
                                       items-center justify-center
                                       rounded-lg bg-[#F6ECEF]
                                       text-[12px] font-semibold
                                       text-primary"
                          >
                            {getInitials(user.name)}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="max-w-[260px] truncate
                                         text-[14px] font-medium"
                              title={user.name}
                            >
                              {user.name}
                            </p>

                            <p
                              className="mt-0.5 max-w-[260px]
                                         truncate text-[12px]
                                         text-[#756D70]"
                              title={user.email}
                            >
                              {user.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>

                      <td
                        className="whitespace-nowrap px-4 py-3
                                   text-[13px] text-[#756D70]"
                      >
                        {user.lastActive}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/users/detail?id=${encodeURIComponent(
                              user.id,
                            )}`}
                            title="Xem chi tiết"
                            aria-label={`Xem chi tiết ${user.name}`}
                            className="inline-flex h-8 w-8 items-center
                                       justify-center rounded-md
                                       text-[#756D70] transition
                                       hover:bg-[#F5F1F3]
                                       hover:text-primary"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined
                                         text-[19px]"
                            >
                              visibility
                            </span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => openDisableModal(user)}
                            disabled={user.status === 'Suspended'}
                            title={
                              user.status === 'Suspended'
                                ? 'Tài khoản đã khóa'
                                : 'Khóa tài khoản'
                            }
                            aria-label={`Khóa tài khoản ${user.name}`}
                            className="inline-flex h-8 w-8 items-center
                                       justify-center rounded-md
                                       text-[#756D70] transition
                                       enabled:hover:bg-[#FFF0F1]
                                       enabled:hover:text-[#B33A49]
                                       disabled:cursor-not-allowed
                                       disabled:opacity-30"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined
                                         text-[19px]"
                            >
                              person_off
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && !error && (
            <div className="border-t border-[#EAE6E7]">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
                itemLabel="người dùng"
                variant="admin"
              />
            </div>
          )}
        </section>

        {showCreate && (
          <div
            className="fixed inset-0 z-50 flex items-center
                       justify-center bg-[#211B1E]/40 p-4"
          >
            <form
              onSubmit={handleCreateUser}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-user-title"
              aria-describedby={createError ? 'create-user-error' : undefined}
              className="max-h-[90vh] w-full max-w-[460px]
                         overflow-y-auto rounded-xl bg-white
                         p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="create-user-title"
                    className="text-[18px] font-semibold"
                  >
                    Thêm tài khoản
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  aria-label="Đóng"
                  className="inline-flex h-8 w-8 shrink-0
                             items-center justify-center rounded-md
                             text-[#756D70] hover:bg-[#F5F1F3]
                             disabled:opacity-40"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[20px]"
                  >
                    close
                  </span>
                </button>
              </div>

              <fieldset
                disabled={creating}
                className="mt-6 space-y-4 disabled:opacity-70"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium">
                      Họ
                    </span>
                    <input
                      autoFocus
                      required
                      autoComplete="family-name"
                      value={newUser.lastName}
                      onChange={(event) =>
                        updateNewUser('lastName', event.target.value)
                      }
                      placeholder="Nguyễn"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium">
                      Tên
                    </span>
                    <input
                      required
                      autoComplete="given-name"
                      value={newUser.firstName}
                      onChange={(event) =>
                        updateNewUser('firstName', event.target.value)
                      }
                      placeholder="Minh Anh"
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={newUser.email}
                    onChange={(event) =>
                      updateNewUser('email', event.target.value)
                    }
                    placeholder="ten@example.com"
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Mật khẩu
                  </span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={newUser.password}
                    onChange={(event) =>
                      updateNewUser('password', event.target.value)
                    }
                    placeholder="Nhập mật khẩu"
                    aria-describedby="password-help"
                    className={INPUT_CLASS}
                  />
                  <span id="password-help" className="sr-only">
                    Tối thiểu 8 ký tự.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium">
                    Vai trò
                  </span>
                  <select
                    value={newUser.role}
                    onChange={(event) =>
                      updateNewUser('role', event.target.value)
                    }
                    className={INPUT_CLASS}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              {createError && (
                <p
                  id="create-user-error"
                  role="alert"
                  className="mt-4 rounded-lg bg-[#FFF0F1]
                             px-3 py-2 text-[13px] text-[#A13943]"
                >
                  {createError}
                </p>
              )}

              <div
                className="mt-6 flex justify-end gap-2
                           border-t border-[#EAE6E7] pt-4"
              >
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="h-10 rounded-lg border border-[#DED8DA]
                             px-4 text-[14px] font-medium
                             hover:bg-[#FAF9F9] disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 rounded-lg bg-primary px-4
                             text-[14px] font-medium text-on-primary
                             hover:opacity-90 disabled:cursor-wait
                             disabled:opacity-60"
                >
                  {creating ? 'Đang tạo…' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        )}

        {userToDisable && (
          <div
            className="fixed inset-0 z-50 flex items-center
                       justify-center bg-[#211B1E]/40 p-4"
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="disable-user-title"
              aria-describedby="disable-user-description"
              className="w-full max-w-[420px] rounded-xl
                         bg-white p-6 shadow-xl"
            >
              <h2
                id="disable-user-title"
                className="text-[20px] font-semibold"
              >
                Khóa tài khoản?
              </h2>

              <p
                id="disable-user-description"
                className="mt-3 break-words text-[14px]
                           leading-relaxed text-[#756D70]"
              >
                Khóa{' '}
                <strong className="font-medium text-[#2D282A]">
                  {userToDisable.email || userToDisable.name}
                </strong>
                ?
              </p>

              {disableError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-[#FFF0F1]
                             px-3 py-2 text-[13px] text-[#A13943]"
                >
                  {disableError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  autoFocus
                  type="button"
                  onClick={closeDisableModal}
                  disabled={disabling}
                  className="h-10 rounded-lg border border-[#DED8DA]
                             px-4 text-[14px] font-medium
                             hover:bg-[#FAF9F9] disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleDisableUser}
                  disabled={disabling}
                  className="h-10 rounded-lg bg-[#AA3449] px-4
                             text-[14px] font-medium text-white
                             hover:bg-[#942B3E] disabled:cursor-wait
                             disabled:opacity-60"
                >
                  {disabling ? 'Đang khóa…' : 'Khóa tài khoản'}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (embedded) {
    return <div className="text-[#2D282A]">{page}</div>;
  }

  return (
    <AdminShell
      pathname={pathname}
      breadcrumb="Tổng quan"
      searchValue={searchTerm}
      onSearchChange={handleSearchChange}
      searchPlaceholder="Tìm theo tên hoặc email"
    >
      <main
        className="mx-auto max-w-6xl px-4 pb-4 pt-1 text-[#2D282A]
                   sm:px-6 lg:px-8"
      >
        {page}
      </main>
    </AdminShell>
  );
}
