import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { AdminShell } from '@/layouts';
import { usePagination } from '@/hooks/usePagination.js';
import Pagination from '@/components/ui/Pagination.jsx';

import {
  getAdminUsers,
  createAdminUser,
  disableAdminUser,
  unwrapApiList,
} from '@/features/admin/api/adminApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const ROLE_LABELS = {
  Admin: 'Quản trị',
  ContentAuthor: 'Biên tập',
  Mentor: 'Cố vấn',
  Learner: 'Người ôn luyện',
};

const ROLES = ['Learner', 'ContentAuthor', 'Mentor', 'Admin'];

const EMPTY_USER = {
  fullName: '',
  email: '',
  password: '',
  role: 'Learner',
};

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-[#DED8DA] bg-white px-3 ' +
  'text-[14px] text-rp-text outline-none transition ' +
  'placeholder:text-rp-text-muted focus:border-rp-brand-strong ' +
  'focus:ring-2 focus:ring-rp-brand-strong/10';

const SELECT_CLASS =
  'h-9 rounded-lg border border-[#DED8DA] bg-white px-3 ' +
  'text-[13px] text-rp-text outline-none ' +
  'focus:border-rp-brand-strong focus:ring-2 focus:ring-rp-brand-strong/10';

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

  const lastActive = user.lastActiveAt
    ? formatVnDateTime(user.lastActiveAt, '—')
    : '—';

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
    lastActive,
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
  const { tr } = useLocale();
  const styles = {
    Admin: 'bg-rp-brand-soft text-rp-brand-strong',
    ContentAuthor: 'bg-[#EEF2FA] text-[#47628E]',
    Mentor: 'bg-[#FFF2E7] text-[#945B2B]',
    Learner: 'bg-rp-muted text-rp-text-2',
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded px-2 py-1
        text-[12px] font-medium ${
          styles[role] || styles.Learner
        }`}
    >
      {tr(ROLE_LABELS[role] || role)}
    </span>
  );
}

function StatusBadge({ status }) {
  const { tr } = useLocale();
  const active = status === 'Active';

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap
        text-[13px] ${
          active ? 'text-[#377353]' : 'text-rp-text-2'
        }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-[#389966]' : 'bg-[#A09298]'
        }`}
      />
      {active ? tr('Hoạt động') : tr('Đã khóa')}
    </span>
  );
}

export default function AdminUsers({ embedded = false }) {
  const { trf, tr } = useLocale();
  const { pathname } = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const usersQuery = useQuery({
    queryKey: ['admin-users', 'all'],
    queryFn: async () => unwrapApiList(await getAdminUsers({ includeDisabled: true })).map(normalizeUser),
  });
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const loading = usersQuery.isPending;
  const error = usersQuery.isError ? usersQuery.error?.message || 'Không thể tải danh sách người dùng.' : '';
  const [success, setSuccess] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ ...EMPTY_USER });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [userToDisable, setUserToDisable] = useState(null);
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState('');

  const loadUsers = useCallback(() => usersQuery.refetch(), [usersQuery]);

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
      fullName: newUser.fullName.trim(),
      email: newUser.email.trim(),
    };

    if (!payload.fullName) {
      setCreateError('Vui lòng nhập họ và tên.');
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
      notify.success('Đã tạo tài khoản người dùng mới.', '', { key: 'admin-user-create' });
      setCurrentPage(1);

      await loadUsers();
    } catch (err) {
      setCreateError(err.message || 'Không thể tạo tài khoản.');
      notify.apiError(err, 'Không thể tạo tài khoản', { key: 'admin-user-create-err' });
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
      notify.success('Đã khóa tài khoản.', '', { key: `admin-user-disable-${userToDisable.id}` });

      await loadUsers();
    } catch (err) {
      setDisableError(
        err.message || 'Không thể khóa tài khoản.',
      );
      notify.apiError(err, 'Không thể khóa tài khoản', { key: 'admin-user-disable-err' });
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
            <div className="relative min-w-0 flex-1 basis-[210px] sm:max-w-xs">
              <Icon name="search" className="pointer-events-none
                           absolute left-3 top-1/2 -translate-y-1/2
                           text-[19px] text-rp-text-muted" />
              <input
                type="search"
                aria-label={tr('Tìm theo tên hoặc email')}
                placeholder={tr('Tìm theo tên hoặc email')}
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="h-9 w-full rounded-[10px] border border-rp-line
                           bg-white pl-9 pr-3 text-[12px] text-rp-text
                           placeholder:text-rp-text-muted focus:border-rp-brand-border
                           focus:outline-none focus:ring-2 focus:ring-rp-brand-strong/10"
              />
            </div>
          ) : (
            <div>
              <h1 className="text-[22px] font-semibold leading-tight">
                {tr('Người dùng')}
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
            <Icon name="person_add" className="text-[19px]" />
            {tr('Thêm tài khoản')}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center
                       justify-between gap-2 rounded-lg border
                       border-rp-brand-border bg-rp-brand-tint px-4 py-3
                       text-[13px] text-rp-brand-strong"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              className="font-medium underline underline-offset-2
                         disabled:opacity-50"
            >
              {tr('Thử lại')}
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
              aria-label={tr('Đóng thông báo')}
              className="inline-flex h-6 w-6 items-center
                         justify-center rounded hover:bg-[#E4F2E9]"
            >
              <Icon name="close" className="text-[17px]" />
            </button>
          </div>
        )}

        <section
          aria-label={tr('Danh sách người dùng')}
          className="overflow-hidden rounded-xl border
                     border-rp-line bg-white"
        >
          <div
            className="flex flex-wrap items-center justify-between
                       gap-2 border-b border-rp-line px-5 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <label
                className="flex items-center gap-2
                           text-[13px] text-rp-text-2"
              >
                {tr('Vai trò')}
                <select
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="ALL">{tr('Tất cả')}</option>

                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {tr(ROLE_LABELS[role])}
                    </option>
                  ))}
                </select>
              </label>

              <label
                className="flex items-center gap-2
                           text-[13px] text-rp-text-2"
              >
                {tr('Trạng thái')}
                <select
                  value={selectedStatus}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="ALL">{tr('Tất cả')}</option>
                  <option value="Active">{tr('Hoạt động')}</option>
                  <option value="Suspended">{tr('Đã khóa')}</option>
                </select>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[13px] text-rp-text-2
                             hover:text-primary"
                >
                  {tr('Xóa bộ lọc')}
                </button>
              )}
            </div>

            <span className="inline-flex items-center gap-2 text-[13px] text-rp-text-2">
              {loading
                ? <SakuraLoader variant="inline" size={14} context="profile" delay={160} />
                : trf('{0} người dùng', { 0: filteredUsers.length })}
            </span>
          </div>

          <div data-density="compact" className="rp-scroll-x">
            <table
              aria-busy={loading}
              className="w-full min-w-[760px] text-left text-[14px]"
            >
              <thead className="bg-rp-bg-2">
                <tr className="text-[12px] text-rp-text-2">
                  <th scope="col" className="px-5 py-3 font-medium">
                    {tr('Người dùng')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {tr('Vai trò')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {tr('Trạng thái')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {tr('Hoạt động gần nhất')}
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-medium"
                  >
                    {tr('Thao tác')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <SakuraLoader
                        variant="section"
                        context="profile"
                        label={tr('Đang tải danh sách người dùng')}
                        delay={160}
                      />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center
                                 text-[14px] text-rp-text-2"
                    >
                      {tr('Không tải được danh sách.')}
                    </td>
                  </tr>
                ) : usersOnPage.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <p className="text-[14px] font-medium">
                        {hasFilters
                          ? tr('Không có kết quả')
                          : tr('Chưa có người dùng')}
                      </p>

                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-3 text-[13px] font-medium
                                     text-primary rp-underline"
                        >
                          {tr('Xóa bộ lọc')}
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  usersOnPage.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-rp-line
                                 transition-colors hover:bg-rp-bg-2"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0
                                       items-center justify-center
                                       rounded-lg bg-rp-brand-soft
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
                                         text-rp-text-2"
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
                                   text-[13px] text-rp-text-2"
                      >
                        {user.lastActive}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/users/detail?id=${encodeURIComponent(
                              user.id,
                            )}`}
                            title={tr('Xem chi tiết')}
                            aria-label={trf('Xem chi tiết {0}', { 0: user.name })}
                            className="inline-flex h-8 w-8 items-center
                                       justify-center rounded-md
                                       text-rp-text-2 transition
                                       hover:bg-rp-muted
                                       hover:text-primary"
                          >
                            <Icon name="visibility" className="text-[19px]" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => openDisableModal(user)}
                            disabled={user.status === 'Suspended'}
                            title={
                              user.status === 'Suspended'
                                ? tr('Tài khoản đã khóa')
                                : tr('Khóa tài khoản')
                            }
                            aria-label={trf('Khóa tài khoản {0}', { 0: user.name })}
                            className="inline-flex h-8 w-8 items-center
                                       justify-center rounded-md
                                       text-rp-text-2 transition
                                       enabled:hover:bg-rp-brand-tint
                                       enabled:hover:text-rp-brand-strong
                                       disabled:cursor-not-allowed
                                       disabled:opacity-30"
                          >
                            <Icon name="person_off" className="text-[19px]" />
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
            <div className="border-t border-rp-line">
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
                itemLabel={tr('người dùng')}
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
                    {tr('Thêm tài khoản')}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  aria-label={tr('Đóng')}
                  className="inline-flex h-8 w-8 shrink-0
                             items-center justify-center rounded-md
                             text-rp-text-2 hover:bg-rp-muted
                             disabled:opacity-40"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              <fieldset
                disabled={creating}
                className="mt-6 space-y-4 disabled:opacity-70"
              >
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium">
                    {tr('Họ và tên')}
                  </span>
                  <input
                    autoFocus
                    required
                    autoComplete="name"
                    value={newUser.fullName}
                    onChange={(event) =>
                      updateNewUser('fullName', event.target.value)
                    }
                    placeholder={tr('Nguyễn Minh Anh')}
                    className={INPUT_CLASS}
                  />
                </label>

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
                    {tr('Mật khẩu')}
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
                    placeholder={tr('Nhập mật khẩu')}
                    aria-describedby="password-help"
                    className={INPUT_CLASS}
                  />
                  <span id="password-help" className="sr-only">
                    {tr('Tối thiểu 8 ký tự.')}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium">
                    {tr('Vai trò')}
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
                        {tr(ROLE_LABELS[role])}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              {createError && (
                <p
                  id="create-user-error"
                  role="alert"
                  className="mt-4 rounded-lg bg-rp-brand-tint
                             px-3 py-2 text-[13px] text-rp-brand-strong"
                >
                  {createError}
                </p>
              )}

              <div
                className="mt-6 flex justify-end gap-2
                           border-t border-rp-line pt-4"
              >
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="h-10 rounded-lg border border-[#DED8DA]
                             px-4 text-[14px] font-medium
                             hover:bg-rp-bg-2 disabled:opacity-50"
                >
                  {tr('Hủy')}
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 rounded-lg bg-primary px-4
                             text-[14px] font-medium text-on-primary
                             hover:opacity-90 disabled:cursor-wait
                             disabled:opacity-60"
                >
                  {creating ? tr('Đang tạo…') : tr('Tạo tài khoản')}
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
                {tr('Khóa tài khoản?')}
              </h2>

              <p
                id="disable-user-description"
                className="mt-3 break-words text-[14px]
                           leading-relaxed text-rp-text-2"
              >
                {tr('Khóa')}{' '}
                <strong className="font-medium text-rp-text">
                  {userToDisable.email || userToDisable.name}
                </strong>
                ?
              </p>

              {disableError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-rp-brand-tint
                             px-3 py-2 text-[13px] text-rp-brand-strong"
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
                             hover:bg-rp-bg-2 disabled:opacity-50"
                >
                  {tr('Hủy')}
                </button>

                <button
                  type="button"
                  onClick={handleDisableUser}
                  disabled={disabling}
                  className="h-10 rounded-lg bg-rp-brand-strong px-4
                             text-[14px] font-medium text-white
                             hover:bg-rp-brand-strong disabled:cursor-wait
                             disabled:opacity-60 rp-press"
                >
                  {disabling ? tr('Đang khóa…') : tr('Khóa tài khoản')}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (embedded) {
    return <div className="text-rp-text">{page}</div>;
  }

  return (
    <AdminShell
      pathname={pathname}
      breadcrumb={tr('Tổng quan')}
      searchValue={searchTerm}
      onSearchChange={handleSearchChange}
      searchPlaceholder={tr('Tìm theo tên hoặc email')}
    >
      <main className="rp-container pb-6 pt-2 text-rp-text">
        {page}
      </main>
    </AdminShell>
  );
}
