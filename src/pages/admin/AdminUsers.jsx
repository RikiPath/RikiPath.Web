import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Eye,
  Lock,
  Search,
  Unlock,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react';
import { AdminShell } from '@/layouts';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  FeatureIcon,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  RefreshingIndicator,
  SakuraLoader,
  notify,
} from '@/components/ui';
import { usePagination } from '@/hooks/usePagination.js';
import {
  createAdminUser,
  disableAdminUser,
  getAdminUsers,
  unwrapApiList,
  updateAdminUser,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const ROLE_META = {
  Admin: { label: 'Quản trị', tone: 'brand' },
  ContentAuthor: { label: 'Biên soạn nội dung', tone: 'info' },
  Mentor: { label: 'Giáo viên', tone: 'warning' },
  Learner: { label: 'Học viên', tone: 'neutral' },
};

const CREATABLE_ROLES = ['Learner', 'ContentAuthor', 'Mentor'];

const EMPTY_CREATE_FORM = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  role: 'Learner',
  isEmailVerified: true,
};

function normalizeUser(user) {
  const rawRole = typeof user.role === 'string' ? user.role : user.role?.name;
  const role = Object.keys(ROLE_META).find((r) => r.toLowerCase() === String(rawRole).toLowerCase()) || 'Learner';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const active = !(user.isActive === false || user.isDisabled || user.isDeleted);
  const lastActivity = user.lastActivityAt || user.lastActiveAt || user.createdDate || null;

  return {
    ...user,
    id: user.id ?? user.userId,
    name: user.fullName || user.name || fullName || user.email || 'Người dùng',
    email: user.email || '',
    role,
    isActive: active,
    status: active ? 'Active' : 'Suspended',
    lastActivityAt: lastActivity,
  };
}

export default function AdminUsers() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialRole = searchParams.get('role');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(
    initialRole && Object.hasOwn(ROLE_META, initialRole) ? initialRole : 'all',
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitError, setFormSubmitError] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);

  const usersQuery = useQuery({
    queryKey: ADMIN_KEYS.users,
    queryFn: async () => unwrapApiList(await getAdminUsers({ includeInactive: true, includeDisabled: true })).map(normalizeUser),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => createAdminUser(payload),
    onSuccess: async (res, vars) => {
      await invalidateAdminDomains(queryClient, ['users']);
      setCreateOpen(false);
      setForm(EMPTY_CREATE_FORM);
      setFormErrors({});
      setFormSubmitError('');
      notify.success(trf('Đã tạo tài khoản cho {0}.', { 0: vars.email }), '', { key: 'admin-user-create', replace: true });
    },
    onError: (err) => {
      const msg = describeApiError(err)?.message || tr('Không tạo được tài khoản.');
      setFormSubmitError(msg);
      notify.apiError(err, tr('Không tạo được tài khoản'), { key: 'admin-user-create-err', replace: true });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (user) => {
      if (user.isActive) {
        return disableAdminUser(user.id);
      }
      return updateAdminUser(user.id, {
        fullName: user.name,
        phoneNumber: user.phoneNumber || null,
        role: user.role,
        isActive: true,
      });
    },
    onSuccess: async (_, user) => {
      await invalidateAdminDomains(queryClient, ['users']);
      setToggleTarget(null);
      notify.success(
        user.isActive
          ? trf('Đã khóa tài khoản {0}.', { 0: user.name })
          : trf('Đã kích hoạt lại tài khoản {0}.', { 0: user.name }),
        '',
        { key: 'admin-user-status', replace: true },
      );
    },
    onError: (err) => {
      notify.apiError(err, tr('Không thể cập nhật trạng thái tài khoản'), { key: 'admin-user-status-err', replace: true });
    },
  });

  const allUsers = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = allUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.email} ${u.phoneNumber || ''}`.toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.name).localeCompare(String(b.name), 'vi') || a.id - b.id;
      }
      if (sortBy === 'role') {
        return String(a.role).localeCompare(String(b.role), 'en') || a.id - b.id;
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdDate || 0).getTime() - new Date(b.createdDate || 0).getTime() || a.id - b.id;
      }
      return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime() || b.id - a.id;
    });
  }, [allUsers, searchTerm, roleFilter, statusFilter, sortBy]);

  const pagination = usePagination(filteredUsers, { initialPageSize: 10 });
  const hasFilters = searchTerm.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    if (searchParams.has('role')) {
      const next = new URLSearchParams(searchParams);
      next.delete('role');
      setSearchParams(next, { replace: true });
    }
  };

  function validateCreate() {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = tr('Vui lòng nhập họ tên.');
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = tr('Vui lòng nhập địa chỉ email hợp lệ.');
    }
    if (!form.password || form.password.length < 6) {
      errors.password = tr('Mật khẩu cần ít nhất 6 ký tự.');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    setFormSubmitError('');
    if (!validateCreate()) return;
    createMutation.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phoneNumber: form.phoneNumber.trim() || null,
      role: form.role,
      isEmailVerified: form.isEmailVerified,
    });
  }

  const columns = [
    {
      key: 'name',
      header: tr('Người dùng'),
      render: (row) => (
        <div className="min-w-0">
          <Link to={`/admin/users/detail/?id=${row.id}`} className="rp-link font-semibold text-rp-text">
            {row.name}
          </Link>
          <p className="truncate text-xs text-rp-text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: tr('Vai trò'),
      render: (row) => {
        const meta = ROLE_META[row.role] || ROLE_META.Learner;
        return <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>;
      },
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'danger'} size="sm" icon={false}>
          {row.isActive ? tr('Hoạt động') : tr('Đã khóa')}
        </Badge>
      ),
    },
    {
      key: 'verified',
      header: tr('Xác thực Email'),
      render: (row) => (
        <Badge tone={row.isEmailVerified ? 'info' : 'neutral'} size="sm" icon={false}>
          {row.isEmailVerified ? tr('Đã xác thực') : tr('Chưa xác thực')}
        </Badge>
      ),
    },
    {
      key: 'lastActivityAt',
      header: tr('Cập nhật / tạo'),
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-rp-text-2">
          {row.lastActivityAt ? formatVnDateTime(row.lastActivityAt) : '—'}
        </span>
      ),
    },
  ];

  return (
    <AdminShell breadcrumb={tr('Người dùng & vai trò')}>
      <main data-page="AdminUsers" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Điều hành')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="users" icon={UserCog} size="lg" />
              <span>{tr('Người dùng & vai trò')}</span>
              {!usersQuery.isPending && <Badge tone="neutral" size="sm" icon={false}>{allUsers.length}</Badge>}
            </span>
          }
          description={tr('Quản lý tài khoản, vai trò hệ thống và trạng thái hoạt động với kiểm soát bảo mật RBAC.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RefreshingIndicator active={usersQuery.isFetching && !usersQuery.isPending} />
              <Button
                icon={UserPlus}
                onClick={() => {
                  setForm(EMPTY_CREATE_FORM);
                  setFormErrors({});
                  setFormSubmitError('');
                  setCreateOpen(true);
                }}
                data-testid="create-user-btn"
              >
                {tr('Tạo tài khoản')}
              </Button>
            </div>
          }
        />

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[220px] flex-1">
              <Input
                type="search"
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={tr('Tìm theo họ tên, email hoặc số điện thoại…')}
                aria-label={tr('Tìm kiếm người dùng')}
              />
            </div>

            <div className="w-full sm:w-[190px]">
              <CustomSelect
                value={roleFilter}
                aria-label={tr('Lọc theo vai trò')}
                onChange={(val) => {
                  setRoleFilter(val);
                  const next = new URLSearchParams(searchParams);
                  if (val === 'all') next.delete('role');
                  else next.set('role', val);
                  setSearchParams(next, { replace: true });
                }}
                options={[
                  { value: 'all', label: tr('Tất cả vai trò') },
                  ...Object.entries(ROLE_META).map(([value, meta]) => ({
                    value,
                    label: tr(meta.label),
                  })),
                ]}
              />
            </div>

            <div className="w-full sm:w-[165px]">
              <CustomSelect
                value={statusFilter}
                aria-label={tr('Lọc theo trạng thái')}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: tr('Tất cả trạng thái') },
                  { value: 'Active', label: tr('Hoạt động'), dot: '#22c55e' },
                  { value: 'Suspended', label: tr('Đã khóa'), dot: '#ef4444' },
                ]}
              />
            </div>

            <div className="w-full sm:w-[160px]">
              <CustomSelect
                value={sortBy}
                aria-label={tr('Sắp xếp danh sách')}
                onChange={setSortBy}
                options={[
                  { value: 'newest', label: tr('Mới nhất') },
                  { value: 'oldest', label: tr('Cũ nhất') },
                  { value: 'name', label: tr('Tên A–Z') },
                  { value: 'role', label: tr('Theo vai trò') },
                ]}
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" icon={X} onClick={resetFilters}>
                {tr('Xóa bộ lọc')}
              </Button>
            )}
          </div>
        </Card>

        {usersQuery.isPending ? (
          <SakuraLoader variant="section" context="data" label={tr('Đang tải danh sách người dùng')} delay={140} />
        ) : usersQuery.isError ? (
          <ContextualErrorState
            error={usersQuery.error}
            title={tr('Chưa tải được danh sách người dùng')}
            onRetry={() => usersQuery.refetch()}
          />
        ) : filteredUsers.length === 0 ? (
          <ContextualEmptyState
            title={hasFilters ? tr('Không tìm thấy tài khoản phù hợp') : tr('Chưa có tài khoản nào')}
            description={
              hasFilters
                ? tr('Thử thay đổi từ khóa, vai trò hoặc trạng thái hiển thị.')
                : tr('Nhấn Tạo tài khoản để thêm học viên, biên tập viên hoặc giáo viên mới.')
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>{tr('Xóa bộ lọc')}</Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={pagination.paginatedData}
              rowKey={(row) => row.id}
              rowActions={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={`/admin/users/detail/?id=${row.id}`}
                    className="rp-focus inline-flex h-8 w-8 items-center justify-center rounded-lg text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                    title={tr('Xem chi tiết')}
                    aria-label={tr('Xem chi tiết')}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {row.role !== 'Admin' && (
                    <IconButton
                      icon={row.isActive ? Lock : Unlock}
                      size="sm"
                      variant="ghost"
                      label={row.isActive ? tr('Khóa tài khoản') : tr('Mở khóa tài khoản')}
                      onClick={() => setToggleTarget(row)}
                    />
                  )}
                </div>
              )}
            />

            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={filteredUsers.length}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[10, 20, 50]}
              itemLabel={tr('tài khoản')}
            />
          </div>
        )}

        {/* Create User Modal */}
        <Modal
          open={createOpen}
          onClose={() => !createMutation.isPending && setCreateOpen(false)}
          title={tr('Tạo tài khoản mới')}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={createMutation.isPending} onClick={() => setCreateOpen(false)}>
                {tr('Hủy')}
              </Button>
              <Button loading={createMutation.isPending} onClick={handleCreateSubmit}>
                {tr('Tạo tài khoản')}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formSubmitError && (
              <Banner tone="danger">{formSubmitError}</Banner>
            )}
            <Field label={tr('Họ và tên')} required error={formErrors.fullName}>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder={tr('Ví dụ: Nguyễn Văn An')}
                invalid={Boolean(formErrors.fullName)}
              />
            </Field>
            <Field label={tr('Email')} required error={formErrors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@rikipath.local"
                invalid={Boolean(formErrors.email)}
              />
            </Field>
            <Field label={tr('Mật khẩu tạm thời')} required error={formErrors.password} hint={tr('Ít nhất 6 ký tự.')}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••"
                invalid={Boolean(formErrors.password)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Số điện thoại')}>
                <Input
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="09xx xxx xxx"
                />
              </Field>
              <Field label={tr('Vai trò hệ thống')} required>
                <CustomSelect
                  value={form.role}
                  aria-label={tr('Vai trò hệ thống')}
                  onChange={(value) => setForm((f) => ({ ...f, role: value }))}
                  options={CREATABLE_ROLES.map((r) => ({ value: r, label: tr(ROLE_META[r].label) }))}
                />
              </Field>
            </div>
            <Checkbox
              checked={form.isEmailVerified}
              onChange={(e) => setForm((f) => ({ ...f, isEmailVerified: e.target.checked }))}
              label={tr('Đánh dấu email đã xác thực khi tạo')}
            />
          </form>
        </Modal>

        {/* Confirm Lock / Unlock Account */}
        <AlertDialog
          open={Boolean(toggleTarget)}
          onClose={() => setToggleTarget(null)}
          onConfirm={() => toggleTarget && toggleStatusMutation.mutate(toggleTarget)}
          loading={toggleStatusMutation.isPending}
          tone={toggleTarget?.isActive ? 'danger' : 'info'}
          title={toggleTarget?.isActive ? tr('Khóa tài khoản này?') : tr('Kích hoạt lại tài khoản?')}
          description={
            toggleTarget?.isActive
              ? trf('Tài khoản "{0}" ({1}) sẽ tạm ngừng truy cập hệ thống nhưng dữ liệu lịch sử vẫn được bảo toàn.', {
                  0: toggleTarget.name,
                  1: toggleTarget.email,
                })
              : trf('Tài khoản "{0}" sẽ được mở khóa và có thể đăng nhập trở lại.', {
                  0: toggleTarget?.name || '',
                })
          }
          confirmLabel={toggleTarget?.isActive ? tr('Khóa tài khoản') : tr('Mở khóa')}
        />
      </main>
    </AdminShell>
  );
}
