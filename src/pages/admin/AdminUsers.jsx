import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { useSmartRefresh } from '@/hooks/useSmartRefresh.js';
import { AdminShell } from '@/layouts';
import {
  AlertDialog,
  Avatar,
  Banner,
  Button,
  Checkbox,
  ContextualEmptyState,
  CustomSelect,
  DataRefreshBoundary,
  Field,
  Input,
  Modal,
  SearchInput,
  notify,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import {
  AdminAccountIdentityHeader,
  AdminDataTable,
  AdminIconAction,
  AdminRoleBadge,
  AdminRowActions,
  AdminStatusBadge,
  AdminToolbar,
  AdminWorkspace,
  DetailModal,
  RoleEditModal,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { normalizeAdminRole } from '@/features/admin/utils/adminRoles.js';
import {
  createAdminUser,
  disableAdminUser,
  getAdminUser,
  getAdminUsers,
  unwrapApiList,
  unwrapApiResult,
  updateAdminUser,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const ROLE_OPTIONS = [
  { value: 'Learner', label: 'Học viên', dotClass: 'bg-[#E05A7A]' },
  { value: 'Mentor', label: 'Giáo viên', dotClass: 'bg-[#2563EB]' },
  { value: 'ContentAuthor', label: 'Quản lý nội dung', dotClass: 'bg-[#EAB308]' },
];

const CREATABLE_ROLES = ['Learner', 'ContentAuthor', 'Mentor'];

const EMPTY_CREATE_FORM = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  role: '',
  isEmailVerified: false,
};

function normalizeUser(user) {
  const rawRole = typeof user.role === 'string' ? user.role : user.role?.name;
  const role = normalizeAdminRole(rawRole);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const active = !(user.isActive === false || user.isDisabled || user.isDeleted);
  const createdDate = user.createdDate || null;
  const modifiedDate = user.modifiedDate || user.updatedAt || null;
  const lastActivity = user.lastActivityAt || user.lastActiveAt || modifiedDate || createdDate || null;

  return {
    ...user,
    id: user.id ?? user.userId,
    name: user.fullName || user.name || fullName || user.email || 'Người dùng',
    email: user.email || '',
    avatarUrl: user.avatarUrl || user.avatar || user.photoUrl || user.pictureUrl || null,
    role,
    isActive: active,
    status: active ? 'Active' : 'Suspended',
    createdDate,
    modifiedDate,
    lastActivityAt: lastActivity,
  };
}

export default function AdminUsers() {
  const { tr, trf } = useLocale();
  const { user: currentUser, primaryRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialRole = searchParams.get('role');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(
    initialRole && ROLE_OPTIONS.some((r) => r.value === initialRole) ? initialRole : 'all',
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSession, setCreateSession] = useState(0);
  const [createAutofillLocked, setCreateAutofillLocked] = useState(true);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitError, setFormSubmitError] = useState('');

  const openCreateModal = () => {
    setForm({ ...EMPTY_CREATE_FORM });
    setFormErrors({});
    setFormSubmitError('');
    setCreateAutofillLocked(true);
    setCreateSession((n) => n + 1);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setCreateOpen(false);
    setForm({ ...EMPTY_CREATE_FORM });
    setFormErrors({});
    setFormSubmitError('');
  };

  const [viewUser, setViewUser] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editSubmitError, setEditSubmitError] = useState('');

  const [toggleTarget, setToggleTarget] = useState(null);

  const usersQuery = useQuery({
    queryKey: ADMIN_KEYS.users,
    queryFn: async () => unwrapApiList(await getAdminUsers({ includeInactive: true, includeDisabled: true })).map(normalizeUser),
  });

  const viewDetailQuery = useQuery({
    queryKey: ['admin-user-detail', viewUser?.id],
    queryFn: async () => normalizeUser(unwrapApiResult(await getAdminUser(viewUser.id)) || viewUser),
    enabled: Boolean(viewUser?.id),
    initialData: viewUser || undefined,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => createAdminUser(payload),
    onSuccess: async (_, vars) => {
      setCreateOpen(false);
      setForm(EMPTY_CREATE_FORM);
      setFormErrors({});
      setFormSubmitError('');
      notify.success(trf('Đã tạo tài khoản cho {0}.', { 0: vars.email }), '', { key: 'admin-user-create', replace: true });
      await Promise.allSettled([invalidateAdminDomains(queryClient, ['users'])]);
    },
    onError: (err) => {
      const msg = describeApiError(err)?.message || tr('Không tạo được tài khoản.');
      setFormSubmitError(msg);
      notify.apiError(err, tr('Không tạo được tài khoản'), { key: 'admin-user-create-err', replace: true });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, target, nextRole }) =>
      updateAdminUser(id, {
        fullName: target.name,
        phoneNumber: target.phoneNumber || null,
        role: nextRole,
        isActive: Boolean(target.isActive),
      }),
    onSuccess: async (response, { id, target, nextRole }) => {
      const updatedRaw = unwrapApiResult(response);
      const updatedNormalized = updatedRaw ? normalizeUser(updatedRaw) : null;
      queryClient.setQueryData(ADMIN_KEYS.users, (prev) =>
        Array.isArray(prev)
          ? prev.map((u) => (Number(u.id) === Number(id) ? { ...u, ...(updatedNormalized || {}), role: nextRole } : u))
          : prev,
      );
      setEditTarget(null);
      setEditSubmitError('');
      notify.success(trf('Đã cập nhật vai trò tài khoản {0}.', { 0: target.name }), '', { key: 'admin-user-edit', replace: true });
      await Promise.allSettled([invalidateAdminDomains(queryClient, ['users'])]);
    },
    onError: (err) => {
      const msg = describeApiError(err)?.message || tr('Chưa cập nhật được vai trò tài khoản.');
      setEditSubmitError(msg);
      notify.apiError(err, tr('Chưa cập nhật được vai trò tài khoản'), { key: 'admin-user-edit-err', replace: true });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (target) => {
      if (target.isActive) return disableAdminUser(target.id);
      return updateAdminUser(target.id, {
        fullName: target.name,
        phoneNumber: target.phoneNumber || null,
        role: target.role,
        isActive: true,
      });
    },
    onSuccess: async (_, target) => {
      setToggleTarget(null);
      notify.success(
        target.isActive
          ? trf('Đã khóa tài khoản {0}.', { 0: target.name })
          : trf('Đã kích hoạt lại tài khoản {0}.', { 0: target.name }),
        '',
        { key: 'admin-user-status', replace: true },
      );
      await Promise.allSettled([invalidateAdminDomains(queryClient, ['users'])]);
    },
    onError: (err) => {
      notify.apiError(err, tr('Không thể cập nhật trạng thái tài khoản'), { key: 'admin-user-status-err', replace: true });
    },
  });

  const selfId = Number(currentUser?.userId || currentUser?.id || 0);
  // Hide the single system Admin / currently signed-in account from the manageable users table.
  const allUsers = useMemo(
    () => (usersQuery.data || []).filter((u) => u.role !== 'Admin' && !(selfId && Number(u.id) === selfId)),
    [usersQuery.data, selfId],
  );

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = allUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'Active' && !u.isActive) return false;
      if (statusFilter === 'Suspended' && u.isActive) return false;
      if (statusFilter === 'Verified' && !u.isEmailVerified) return false;
      if (statusFilter === 'Unverified' && u.isEmailVerified) return false;
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
    if (!form.role) {
      errors.role = tr('Vui lòng chọn vai trò hệ thống.');
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
      align: 'left',
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5 text-left">
          <Avatar src={row.avatarUrl} name={row.name} size={32} className="ring-1 ring-rp-line" />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setViewUser(row)}
              title={row.name}
              className="rp-focus block max-w-full truncate rounded text-left text-[13.5px] font-semibold text-rp-text transition-colors hover:text-[#C84666]"
            >
              {row.name}
            </button>
            <p title={row.email} className="truncate text-xs text-rp-text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: tr('Vai trò'),
      align: 'center',
      compact: true,
      sortValue: (row) => row.role,
      render: (row) => <AdminRoleBadge role={row.role} />,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
      compact: true,
      sortValue: (row) => (row.isActive ? 1 : 0),
      render: (row) => (
        <AdminStatusBadge
          tone={row.isActive ? 'success' : 'danger'}
          label={row.isActive ? 'Hoạt động' : 'Đã khóa'}
        />
      ),
    },
    {
      key: 'isEmailVerified',
      header: tr('Xác thực Email'),
      align: 'center',
      compact: true,
      sortValue: (row) => (row.isEmailVerified ? 1 : 0),
      render: (row) => (
        <AdminStatusBadge
          tone={row.isEmailVerified ? 'success' : 'danger'}
          label={row.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        />
      ),
    },
    {
      key: 'lastActivityAt',
      header: tr('Cập nhật / tạo'),
      align: 'center',
      compact: true,
      sortValue: (row) => (row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0),
      render: (row) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-rp-text-2">
          {row.lastActivityAt ? formatVnDateTime(row.lastActivityAt) : '—'}
        </span>
      ),
    },
  ];

  const detailRecord = viewDetailQuery.data || viewUser;
  const hasToolbar = usersQuery.isSuccess && allUsers.length > 0;
  const { refresh: refreshUsers, isRefreshing: usersRefreshing } = useSmartRefresh({
    queries: [usersQuery],
  });

  return (
    <AdminShell breadcrumb={tr('Người dùng & vai trò')}>
      <AdminWorkspace viewportLocked page="AdminUsers">
        <AdminPageHeader
          icon={Users}
          title="Người dùng & vai trò"
          className="mb-0 shrink-0"
          actions={
            !hasToolbar && usersQuery.isSuccess ? (
              <Button
                size="sm"
                className="h-9 px-3.5"
                icon={UserPlus}
                onClick={openCreateModal}
                data-testid="create-user-btn"
              >
                {tr('Tạo tài khoản')}
              </Button>
            ) : null
          }
        />

        {/* Compact Single-Row Filter Bar */}
        {hasToolbar && <AdminToolbar
          refresh={{ onRefresh: refreshUsers, refreshing: usersRefreshing }}
          actions={(
            <Button size="sm" icon={UserPlus} onClick={openCreateModal} data-testid="create-user-btn">
              {tr('Tạo tài khoản')}
            </Button>
          )}
        >
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Tìm họ tên, email, SĐT…"
            aria-label={tr('Tìm kiếm người dùng')}
            className="w-full sm:w-[225px]"
          />

          <CustomSelect
            fitContent
            value={roleFilter}
            aria-label={tr('Vai trò')}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: tr('Tất cả') },
              ...ROLE_OPTIONS.map((r) => ({ value: r.value, label: tr(r.label), dotClass: r.dotClass })),
            ]}
          />

          <CustomSelect
            fitContent
            value={statusFilter}
            aria-label={tr('Trạng thái')}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: tr('Tất cả') },
              { value: 'Active', label: tr('Hoạt động'), dotClass: 'bg-[#16A34A]' },
              { value: 'Suspended', label: tr('Đã khóa'), dotClass: 'bg-[#DC2626]' },
              { value: 'Verified', label: tr('Đã xác thực'), dotClass: 'bg-[#16A34A]' },
              { value: 'Unverified', label: tr('Chưa xác thực'), dotClass: 'bg-[#DC2626]' },
            ]}
          />

          <CustomSelect
            fitContent
            value={sortBy}
            aria-label={tr('Sắp xếp')}
            onChange={setSortBy}
            options={[
              { value: 'newest', label: tr('Mới nhất') },
              { value: 'oldest', label: tr('Cũ nhất') },
              { value: 'name', label: tr('Tên A–Z') },
              { value: 'role', label: tr('Theo vai trò') },
            ]}
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" icon={X} onClick={resetFilters}>
              {tr('Xóa bộ lọc')}
            </Button>
          )}
        </AdminToolbar>}

        <DataRefreshBoundary
          fillHeight
          queries={[usersQuery]}
          loading={usersQuery.isPending}
          refreshing={usersRefreshing}
          error={usersQuery.error}
          hasData={Boolean(usersQuery.data)}
          isEmpty={false}
          loadingContext="data"
          loadingLabel={tr('Đang tải danh sách người dùng')}
          loadingDelay={140}
          errorTitle={tr('Chưa tải được danh sách người dùng')}
          onRetry={refreshUsers}
        >
          {filteredUsers.length === 0 ? (
            <ContextualEmptyState
              variant={allUsers.length > 0 && hasFilters ? 'search' : 'default'}
              illustration={allUsers.length > 0 && hasFilters ? 'search' : 'mentor'}
              title={allUsers.length > 0 && hasFilters ? tr('Không tìm thấy tài khoản phù hợp') : tr('Chưa có tài khoản nào')}
              description={
                allUsers.length > 0 && hasFilters
                  ? tr('Thử thay đổi từ khóa, vai trò hoặc trạng thái hiển thị.')
                  : tr('Nhấn Tạo tài khoản để thêm học viên, biên soạn nội dung hoặc giáo viên mới.')
              }
              action={allUsers.length > 0 && hasFilters ? <Button variant="outline" onClick={resetFilters}>{tr('Xóa bộ lọc')}</Button> : null}
            />
          ) : (
            <AdminDataTable
              fillHeight
              columns={columns}
              rows={filteredUsers}
              rowKey={(row) => row.id}
              pageSize={10}
              itemLabel="tài khoản"
              rowActions={(row) => {
                const isSelf = Boolean(selfId && Number(row.id) === selfId);
                return (
                  <AdminRowActions>
                    <AdminIconAction
                      kind="view"
                      tooltip="Xem chi tiết tài khoản"
                      onClick={() => setViewUser(row)}
                    />
                    <AdminIconAction
                      kind="edit"
                      tone="brand"
                      tooltip="Chỉnh sửa vai trò"
                      onClick={() => {
                        setEditSubmitError('');
                        setEditTarget(row);
                      }}
                    />
                    {row.role !== 'Admin' && (
                      <AdminIconAction
                        kind={row.isActive ? 'lock' : 'unlock'}
                        tone={row.isActive ? 'danger' : 'success'}
                        tooltip={row.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        disabled={isSelf}
                        onClick={() => setToggleTarget(row)}
                      />
                    )}
                  </AdminRowActions>
                );
              }}
            />
          )}
        </DataRefreshBoundary>

        {/* Read-only Account Detail Modal */}
        <DetailModal
          open={Boolean(viewUser)}
          onClose={() => setViewUser(null)}
          title={tr('Chi tiết tài khoản')}
          size="md"
          identity={
            detailRecord && (
              <AdminAccountIdentityHeader
                name={detailRecord.name}
                email={detailRecord.email}
                avatarUrl={detailRecord.avatarUrl}
                role={detailRecord.role}
                isActive={detailRecord.isActive}
              />
            )
          }
        >
          {detailRecord && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Họ và tên')}</dt>
                <dd className="mt-0.5 font-semibold text-rp-text">{detailRecord.name}</dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Email')}</dt>
                <dd className="mt-0.5 truncate font-semibold text-rp-text" title={detailRecord.email}>
                  {detailRecord.email || tr('Chưa cập nhật')}
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Số điện thoại')}</dt>
                <dd className="mt-0.5 font-semibold text-rp-text">
                  {detailRecord.phoneNumber || tr('Chưa cập nhật')}
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Vai trò')}</dt>
                <dd className="mt-1">
                  <AdminRoleBadge role={detailRecord.role} />
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Trạng thái tài khoản')}</dt>
                <dd className="mt-1">
                  <AdminStatusBadge
                    tone={detailRecord.isActive ? 'success' : 'danger'}
                    label={detailRecord.isActive ? 'Hoạt động' : 'Đã khóa'}
                  />
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Xác thực Email')}</dt>
                <dd className="mt-1">
                  <AdminStatusBadge
                    tone={detailRecord.isEmailVerified ? 'success' : 'danger'}
                    label={detailRecord.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                  />
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Ngày tạo')}</dt>
                <dd className="mt-0.5 text-xs font-medium tabular-nums text-rp-text">
                  {detailRecord.createdDate ? formatVnDateTime(detailRecord.createdDate) : tr('Chưa ghi nhận')}
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Ngày cập nhật')}</dt>
                <dd className="mt-0.5 text-xs font-medium tabular-nums text-rp-text">
                  {detailRecord.modifiedDate
                    ? formatVnDateTime(detailRecord.modifiedDate)
                    : detailRecord.lastActivityAt && detailRecord.lastActivityAt !== detailRecord.createdDate
                      ? formatVnDateTime(detailRecord.lastActivityAt)
                      : tr('Chưa cập nhật')}
                </dd>
              </div>
              {(detailRecord.jlptLevel || detailRecord.declaredJlptCertificateCode) && (
                <div className="rounded-xl border border-rp-line p-3 sm:col-span-2">
                  <dt className="text-xs text-rp-text-muted">{tr('Trình độ JLPT')}</dt>
                  <dd className="mt-0.5 font-semibold text-rp-text">
                    {detailRecord.jlptLevel || detailRecord.declaredJlptCertificateCode}
                  </dd>
                </div>
              )}
              {detailRecord.bio && (
                <div className="rounded-xl border border-rp-line p-3 sm:col-span-2">
                  <dt className="text-xs text-rp-text-muted">{tr('Giới thiệu')}</dt>
                  <dd className="mt-0.5 text-xs leading-5 text-rp-text-2">{detailRecord.bio}</dd>
                </div>
              )}
            </dl>
          )}
        </DetailModal>

        {/* Role-Only Edit Modal */}
        {editTarget && (
          <RoleEditModal
            key={`${editTarget.id}-${editTarget.role}`}
            open={Boolean(editTarget)}
            onClose={() => !editMutation.isPending && setEditTarget(null)}
            user={editTarget}
            callerRole={primaryRole || currentUser?.role}
            selfId={selfId}
            assignableRoles={CREATABLE_ROLES}
            saving={editMutation.isPending}
            submitError={editSubmitError}
            onSave={(nextRole) =>
              editMutation.mutate({
                id: editTarget.id,
                target: editTarget,
                nextRole,
              })
            }
          />
        )}

        {/* Create User Modal */}
        <Modal
          open={createOpen}
          onClose={closeCreateModal}
          title={tr('Tạo tài khoản mới')}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={createMutation.isPending} onClick={closeCreateModal}>
                {tr('Hủy')}
              </Button>
              <Button loading={createMutation.isPending} onClick={handleCreateSubmit}>
                {tr('Tạo tài khoản')}
              </Button>
            </div>
          }
        >
          <form key={createSession} autoComplete="off" onSubmit={handleCreateSubmit} className="space-y-4">
            {formSubmitError && <Banner tone="danger">{formSubmitError}</Banner>}
            <Field label={tr('Họ và tên')} required error={formErrors.fullName}>
              <Input
                name={`create-fullname-${createSession}`}
                autoComplete="off"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder={tr('Ví dụ: Nguyễn Văn An')}
                invalid={Boolean(formErrors.fullName)}
              />
            </Field>
            <Field label={tr('Email')} required error={formErrors.email}>
              <Input
                type="email"
                name={`create-email-${createSession}`}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                readOnly={createAutofillLocked}
                onFocus={() => setCreateAutofillLocked(false)}
                onPointerDown={() => setCreateAutofillLocked(false)}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@rikipath.local"
                invalid={Boolean(formErrors.email)}
              />
            </Field>
            <Field label={tr('Mật khẩu tạm thời')} required error={formErrors.password} hint={tr('Ít nhất 6 ký tự.')}>
              <Input
                type="password"
                name={`create-password-${createSession}`}
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                readOnly={createAutofillLocked}
                onFocus={() => setCreateAutofillLocked(false)}
                onPointerDown={() => setCreateAutofillLocked(false)}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••"
                invalid={Boolean(formErrors.password)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Số điện thoại')}>
                <Input
                  name={`create-phone-${createSession}`}
                  autoComplete="off"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="09xx xxx xxx"
                />
              </Field>
              <Field label={tr('Vai trò hệ thống')} required error={formErrors.role}>
                <CustomSelect
                  value={form.role}
                  invalid={Boolean(formErrors.role)}
                  aria-label={tr('Vai trò hệ thống')}
                  onChange={(value) => setForm((f) => ({ ...f, role: value }))}
                  options={CREATABLE_ROLES.map((r) => {
                    const meta = ROLE_OPTIONS.find((x) => x.value === r);
                    return { value: r, label: tr(meta.label), dotClass: meta.dotClass };
                  })}
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
          tone={toggleTarget?.isActive ? 'danger' : 'success'}
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
          cancelLabel={tr('Quay lại')}
        />
      </AdminWorkspace>
    </AdminShell>
  );
}
