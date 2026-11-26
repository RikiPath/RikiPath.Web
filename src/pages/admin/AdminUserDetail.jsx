import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck, Unlock, UserRound } from 'lucide-react';
import { AdminShell } from '@/layouts';
import {
  AlertDialog,
  BackButton,
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  CustomSelect,
  DataRefreshBoundary,
  Field,
  notify,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminRoleBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { getAdminUser, updateAdminUser } from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const ROLES = [
  { value: 'Learner', label: 'Học viên' },
  { value: 'ContentAuthor', label: 'Quản lý nội dung' },
  { value: 'Mentor', label: 'Giáo viên' },
  { value: 'Admin', label: 'Quản trị viên' },
];

export default function AdminUserDetail() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const id = params.get('id');
  const queryClient = useQueryClient();

  const [pendingChange, setPendingChange] = useState(null);
  const [saveError, setSaveError] = useState('');

  const userQuery = useQuery({
    queryKey: ADMIN_KEYS.userDetail(id),
    queryFn: async () => {
      const data = await getAdminUser(id);
      return data?.result ?? data;
    },
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (changes) => {
      const user = userQuery.data;
      return updateAdminUser(id, {
        fullName: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        phoneNumber: user?.phoneNumber || null,
        role: user?.role?.name || user?.role || 'Learner',
        isActive: user?.isActive !== false && !user?.isDeleted,
        ...changes,
      });
    },
    onSuccess: async (response) => {
      const updated = response?.result ?? response;
      queryClient.setQueryData(ADMIN_KEYS.userDetail(id), updated);
      setPendingChange(null);
      setSaveError('');
      notify.success(tr('Đã cập nhật tài khoản.'), '', { key: `admin-user-update-${id}`, replace: true });
      await Promise.allSettled([invalidateAdminDomains(queryClient, ['users'])]);
    },
    onError: (err) => {
      setPendingChange(null);
      const msg = describeApiError(err)?.message || tr('Không cập nhật được tài khoản.');
      setSaveError(msg);
      notify.apiError(err, tr('Chưa cập nhật được tài khoản'), { key: `admin-user-update-err-${id}`, replace: true });
    },
  });

  const user = userQuery.data;
  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || tr('Người dùng');
  const role = user?.role?.name || user?.role || 'Learner';
  const isActive = user ? (user.isActive !== false && !user.isDeleted) : true;
  const isAdminAccount = role === 'Admin';

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Chi tiết người dùng')}>
      <main data-page="AdminUserDetail" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <div>
          <BackButton fallbackTo="/admin/users/" label="Quay lại danh sách người dùng" restoreListKey="/admin/users" />
        </div>

        {!id ? (
          <ContextualEmptyState
            illustration="mentor"
            title={tr('Chưa chọn người dùng')}
            description={tr('Hãy mở một tài khoản từ danh sách Người dùng & vai trò để xem và điều chỉnh quyền.')}
            action={
              <Link
                to="/admin/users/"
                className="rp-focus inline-flex h-10 items-center rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white"
              >
                {tr('Mở danh sách Người dùng')}
              </Link>
            }
          />
        ) : (
          <DataRefreshBoundary
            query={userQuery}
            context="profile"
            loadingLabel={tr('Đang tải hồ sơ người dùng')}
            errorTitle={tr('Không tải được hồ sơ người dùng')}
            loaderDelay={140}
            className="space-y-5"
          >
            {user && (
              <>
                <AdminPageHeader
                  icon={UserRound}
                  title={name}
                  subtitle={user.email}
                  showTitle
                  badge={<AdminRoleBadge role={user.role} />}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      {!isAdminAccount && (
                        <Button
                          size="sm"
                          variant={isActive ? 'outline' : 'primary'}
                          icon={isActive ? Lock : Unlock}
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            setPendingChange({
                              kind: 'status',
                              changes: { isActive: !isActive },
                              title: isActive ? tr('Khóa tài khoản này?') : tr('Kích hoạt lại tài khoản?'),
                              description: isActive
                                ? trf('Tài khoản "{0}" sẽ tạm ngừng đăng nhập vào hệ thống.', { 0: name })
                                : trf('Tài khoản "{0}" sẽ được mở khóa trở lại.', { 0: name }),
                              confirmLabel: isActive ? tr('Khóa tài khoản') : tr('Mở khóa'),
                              tone: isActive ? 'danger' : 'info',
                            })
                          }
                        >
                          {isActive ? tr('Khóa tài khoản') : tr('Mở khóa tài khoản')}
                        </Button>
                      )}
                    </div>
                  }
                />

                {saveError && <Banner tone="danger">{saveError}</Banner>}

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="space-y-4 p-5">
                <div className="flex items-center justify-between border-b border-rp-line pb-3">
                  <h2 className="text-base font-bold text-rp-text">{tr('Tài khoản & phân quyền')}</h2>
                  <Badge tone={isActive ? 'success' : 'danger'} size="sm" icon={false}>
                    {isActive ? tr('Hoạt động') : tr('Đã khóa')}
                  </Badge>
                </div>

                {isAdminAccount ? (
                  <Banner tone="info" title={tr('Tài khoản Quản trị hệ thống')}>
                    {tr('Tài khoản Quản trị viên duy nhất được bảo vệ khỏi thao tác hạ quyền hoặc tự vô hiệu hóa.')}
                  </Banner>
                ) : (
                  <Field
                    label={tr('Vai trò hệ thống')}
                    hint={tr('Mọi thay đổi vai trò đều yêu cầu xác nhận và được ghi vào nhật ký kiểm toán Quản trị viên.')}
                  >
                    <CustomSelect
                      value={role}
                      aria-label={tr('Vai trò hệ thống')}
                      disabled={updateMutation.isPending}
                      onChange={(nextRole) => {
                        if (nextRole === role) return;
                        const label = tr(ROLES.find((r) => r.value === nextRole)?.label || nextRole);
                        setPendingChange({
                          kind: 'role',
                          changes: { role: nextRole },
                          title: tr('Thay đổi vai trò tài khoản?'),
                          description: trf('Chuyển tài khoản "{0}" sang vai trò "{1}"?', { 0: name, 1: label }),
                          confirmLabel: tr('Xác nhận đổi vai trò'),
                          tone: 'info',
                        });
                      }}
                      options={ROLES.filter((r) => r.value !== 'Admin').map((r) => ({
                        value: r.value,
                        label: tr(r.label),
                      }))}
                    />
                  </Field>
                )}

                <dl className="grid grid-cols-2 gap-4 pt-2 text-sm">
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Xác thực Email')}</dt>
                    <dd className="mt-1 font-medium text-rp-text">
                      <Badge tone={user.isEmailVerified ? 'success' : 'neutral'} size="sm" icon={false}>
                        {user.isEmailVerified ? tr('Đã xác thực') : tr('Chưa xác thực')}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Ngày tạo')}</dt>
                    <dd className="mt-1 font-medium text-rp-text">
                      {user.createdDate ? formatVnDateTime(user.createdDate) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Cập nhật gần nhất')}</dt>
                    <dd className="mt-1 font-medium text-rp-text">
                      {user.lastActivityAt ? formatVnDateTime(user.lastActivityAt) : '—'}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card className="space-y-4 p-5">
                <div className="flex items-center gap-2 border-b border-rp-line pb-3">
                  <ShieldCheck className="h-4 w-4 text-rp-brand-strong" />
                  <h2 className="text-base font-bold text-rp-text">{tr('Thông tin liên hệ')}</h2>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-rp-line/60 pb-2.5">
                    <dt className="text-rp-text-muted">{tr('Họ và tên')}</dt>
                    <dd className="font-medium text-rp-text">{name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-rp-line/60 pb-2.5">
                    <dt className="text-rp-text-muted">{tr('Email')}</dt>
                    <dd className="font-medium text-rp-text">{user.email}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-rp-text-muted">{tr('Số điện thoại')}</dt>
                    <dd className="font-medium text-rp-text">{user.phoneNumber || '—'}</dd>
                  </div>
                </dl>
              </Card>
            </div>
              </>
            )}
          </DataRefreshBoundary>
        )}

        <AlertDialog
          open={Boolean(pendingChange)}
          onClose={() => setPendingChange(null)}
          onConfirm={() => pendingChange && updateMutation.mutate(pendingChange.changes)}
          loading={updateMutation.isPending}
          tone={pendingChange?.tone || 'info'}
          title={pendingChange?.title || ''}
          description={pendingChange?.description || ''}
          confirmLabel={pendingChange?.confirmLabel}
        />
      </main>
    </AdminShell>
  );
}
