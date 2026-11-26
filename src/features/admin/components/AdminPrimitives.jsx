import { useState } from 'react';
import { Archive, ArchiveRestore, Eye, Lock, Pencil, Trash2, Unlock } from 'lucide-react';
import {
  Avatar,
  Banner,
  Button,
  Checkbox,
  CustomSelect,
  DataTable,
  Field,
  Modal,
  Tooltip,
  UnifiedToolbar,
  cx,
} from '@/components/ui';
import { normalizeAdminRole } from '@/features/admin/utils/adminRoles.js';
import { useLocale } from '@/locales/locale.js';

/* ------------------------------------------------------------------ Role Badges */

const ROLE_BADGE_MAP = {
  Admin: {
    label: 'Quản trị viên',
    cls: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
    dot: 'bg-[#DC2626]',
  },
  Learner: {
    label: 'Học viên',
    cls: 'border-[#F5C6D4] bg-[#FDF0F4] text-[#B83254]',
    dot: 'bg-[#E05A7A]',
  },
  ContentAuthor: {
    label: 'Quản lý nội dung',
    cls: 'border-[#FDE047] bg-[#FEF9C3] text-[#9A5B04]',
    dot: 'bg-[#CA8A04]',
  },
  Mentor: {
    label: 'Giáo viên',
    cls: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
    dot: 'bg-[#2563EB]',
  },
};

export function AdminRoleBadge({ role, className }) {
  const { tr } = useLocale();
  const normalized = normalizeAdminRole(role);
  const meta = ROLE_BADGE_MAP[normalized] || ROLE_BADGE_MAP.Learner;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-4',
        meta.cls,
        className,
      )}
    >
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
      <span>{tr(meta.label)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ Semantic Status Badges */

const STATUS_DOT_TONES = {
  success: {
    cls: 'border-rp-success-line bg-rp-success-bg text-rp-success',
    dot: 'bg-[#16A34A]',
  },
  danger: {
    cls: 'border-rp-danger-line bg-rp-danger-bg text-rp-danger',
    dot: 'bg-[#DC2626]',
  },
  warning: {
    cls: 'border-rp-warning-line bg-rp-warning-bg text-rp-warning',
    dot: 'bg-[#D97706]',
  },
  info: {
    cls: 'border-rp-info-line bg-rp-info-bg text-rp-info',
    dot: 'bg-[#2563EB]',
  },
  brand: {
    cls: 'border-rp-brand-soft bg-rp-brand-tint text-rp-brand-strong',
    dot: 'bg-rp-brand',
  },
  neutral: {
    cls: 'border-rp-line bg-rp-muted text-rp-text-2',
    dot: 'bg-rp-text-muted',
  },
};

export function AdminStatusBadge({ tone = 'neutral', label, className, withDot = true }) {
  const { tr } = useLocale();
  const meta = STATUS_DOT_TONES[tone] || STATUS_DOT_TONES.neutral;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-4',
        meta.cls,
        className,
      )}
    >
      {withDot && <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />}
      <span>{typeof label === 'string' ? tr(label) : label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ Row Icon Actions */

const ACTION_ICONS = {
  view: Eye,
  edit: Pencil,
  lock: Lock,
  unlock: Unlock,
  archive: Archive,
  restore: ArchiveRestore,
  delete: Trash2,
};

const ACTION_TONES = {
  neutral: 'text-rp-text-2 hover:border-rp-line hover:bg-rp-muted hover:text-rp-text',
  brand: 'text-[#C84666] hover:border-[#F2CCD7] hover:bg-[#FDF1F4] hover:text-[#9E2F49]',
  danger: 'text-rp-danger hover:border-rp-danger-line hover:bg-rp-danger-bg',
  success: 'text-rp-success hover:border-rp-success-line hover:bg-rp-success-bg',
  warning: 'text-rp-warning hover:border-rp-warning-line hover:bg-rp-warning-bg',
};

/**
 * Icon-only table action button with required contextual tooltip + accessible aria-label.
 * Never displays visible text labels inside table row action cells.
 */
export function AdminIconAction({
  kind,
  icon,
  tooltip,
  tone = 'neutral',
  disabled = false,
  onClick,
  className,
  ...rest
}) {
  const { tr } = useLocale();
  const Icon = icon || ACTION_ICONS[kind] || Eye;
  const resolvedLabel = tr(tooltip);
  const toneCls = ACTION_TONES[tone] || ACTION_TONES.neutral;

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={resolvedLabel}
      className={cx(
        'rp-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40',
        toneCls,
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={2} />
    </button>
  );

  if (disabled) return button;
  return (
    <Tooltip content={resolvedLabel} side="top">
      {button}
    </Tooltip>
  );
}

export function AdminRowActions({ children, className }) {
  return (
    <div className={cx('inline-flex items-center justify-center gap-1', className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Workspace, Filter Toolbar & Table */

export function AdminWorkspace({ viewportLocked = false, page, className, children }) {
  return (
    <main
      data-page={page}
      className={cx(
        'rp-container flex min-h-[calc(100dvh-var(--spacing-rp-topbar))] min-w-0 flex-col gap-4 py-[var(--rp-space-page-y)] text-rp-text',
        viewportLocked && 'lg:h-[calc(100dvh-var(--spacing-rp-topbar))] lg:overflow-hidden',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function AdminToolbar({ children, actions, refresh, tabs, left, search, filters, className, surface = 'card', ...rest }) {
  return (
    <UnifiedToolbar
      tabs={tabs}
      left={left}
      search={search}
      filters={filters}
      refresh={refresh}
      actions={actions}
      surface={surface}
      className={className}
      {...rest}
    >
      {children}
    </UnifiedToolbar>
  );
}

export const FilterBar = AdminToolbar;
export const StatusBadge = AdminStatusBadge;
export const RoleBadge = AdminRoleBadge;
export const IconActionButton = AdminIconAction;

export function AdminDataTable({
  actionsHeader = 'Thao tác',
  alwaysShowPagination = false,
  stickyHeader = true,
  fillHeight = false,
  scrollClassName,
  density = 'compact',
  paginationVariant = 'admin',
  ...props
}) {
  const resolvedScrollClass = scrollClassName ?? (fillHeight ? 'max-h-[clamp(260px,68vh,740px)] lg:max-h-full' : 'max-h-[clamp(260px,58vh,620px)]');
  return (
    <DataTable
      actionsHeader={actionsHeader}
      alwaysShowPagination={alwaysShowPagination}
      stickyHeader={stickyHeader}
      fillHeight={fillHeight}
      scrollClassName={resolvedScrollClass}
      density={density}
      paginationVariant={paginationVariant}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ Shared Account Modals */

export function AdminAccountIdentityHeader({ name, email, avatarUrl, role, isActive, extraBadge, className }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-xl border border-rp-line bg-rp-bg-2/55 px-3.5 py-3', className)}>
      <Avatar src={avatarUrl} name={name || email} size={44} className="ring-2 ring-rp-surface shadow-rp-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-5 text-rp-text">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-rp-text-muted">
          {email && <span className="truncate max-w-[230px]">{email}</span>}
          {role && (
            <>
              {email && <span aria-hidden="true">·</span>}
              <AdminRoleBadge role={role} />
            </>
          )}
          {typeof isActive === 'boolean' && (
            <>
              <span aria-hidden="true">·</span>
              <AdminStatusBadge tone={isActive ? 'success' : 'danger'} label={isActive ? 'Hoạt động' : 'Đã khóa'} />
            </>
          )}
          {extraBadge}
        </div>
      </div>
    </div>
  );
}

export function DetailModal({
  open,
  onClose,
  title,
  size = 'md',
  identity,
  closeLabel = 'Đóng',
  footer,
  children,
}) {
  const { tr } = useLocale();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        footer ?? (
          <div className="flex w-full justify-end">
            <Button size="sm" onClick={onClose}>
              {tr(closeLabel)}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {identity}
        {children}
      </div>
    </Modal>
  );
}

const ASSIGNABLE_ADMIN_ROLES = ['Learner', 'Mentor', 'ContentAuthor'];

export function RoleEditModal({
  open,
  onClose,
  user,
  callerRole = 'Admin',
  selfId = 0,
  assignableRoles = ASSIGNABLE_ADMIN_ROLES,
  saving = false,
  submitError = '',
  onSave,
}) {
  const { tr, trf } = useLocale();
  const initialRole = normalizeAdminRole(user?.role);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [confirmed, setConfirmed] = useState(false);
  const [localError, setLocalError] = useState('');

  const isCallerAdmin = normalizeAdminRole(callerRole) === 'Admin';
  const isSelfEdit = Boolean(selfId && user?.id && Number(user.id) === Number(selfId));
  const isAdminTarget = initialRole === 'Admin';
  const roleLocked = !isCallerAdmin || isSelfEdit || isAdminTarget;
  const roleChanged = Boolean(user && selectedRole !== initialRole);

  const allowedRoleList = isAdminTarget
    ? ['Admin']
    : assignableRoles.filter((r) => r !== 'Admin' && ROLE_BADGE_MAP[r]);

  const roleOptions = allowedRoleList.map((value) => {
    const meta = ROLE_BADGE_MAP[value];
    return { value, label: tr(meta.label), dotClass: meta.dot };
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    setLocalError('');
    if (!isCallerAdmin) {
      setLocalError(tr('Chỉ Quản trị viên mới có quyền thay đổi vai trò.'));
      return;
    }
    if (roleLocked) return;
    if (!allowedRoleList.includes(selectedRole)) {
      setLocalError(tr('Vai trò được chọn không hợp lệ theo chính sách phân quyền.'));
      return;
    }
    if (!roleChanged) {
      onClose?.();
      return;
    }
    if (!confirmed) {
      setLocalError(tr('Vui lòng xác nhận trước khi cập nhật vai trò mới.'));
      return;
    }
    onSave?.(selectedRole);
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      title={tr('Chỉnh sửa vai trò')}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={saving} onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button
            size="sm"
            loading={saving}
            disabled={roleLocked || !roleChanged || !confirmed}
            onClick={handleSubmit}
          >
            {tr('Lưu vai trò')}
          </Button>
        </div>
      }
    >
      {user && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AdminAccountIdentityHeader
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            role={initialRole}
            isActive={typeof user.isActive === 'boolean' ? user.isActive : undefined}
          />

          {(submitError || localError) && (
            <Banner tone="danger">{submitError || localError}</Banner>
          )}

          {!isCallerAdmin ? (
            <Banner tone="danger">
              {tr('Tài khoản hiện tại không có quyền Quản trị viên để cập nhật vai trò.')}
            </Banner>
          ) : (isSelfEdit || isAdminTarget) && (
            <Banner tone="info">
              {tr('Tài khoản Quản trị viên duy nhất và phiên đang đăng nhập được bảo vệ, không thể tự nâng hoặc hạ quyền.')}
            </Banner>
          )}

          <Field label={tr('Vai trò hệ thống')} required>
            <CustomSelect
              value={selectedRole}
              disabled={roleLocked || saving}
              aria-label={tr('Vai trò hệ thống')}
              onChange={(val) => {
                setSelectedRole(val);
                setConfirmed(false);
                setLocalError('');
              }}
              options={roleOptions}
            />
          </Field>

          {!roleLocked && roleChanged && (
            <div className="space-y-2 rounded-xl border border-rp-warning-line bg-rp-warning-bg p-3">
              <p className="text-xs font-semibold text-rp-warning">
                {trf('Chuyển quyền từ "{0}" sang "{1}" sẽ áp dụng ngay và yêu cầu tài khoản đăng nhập lại.', {
                  0: tr(ROLE_BADGE_MAP[initialRole]?.label || initialRole),
                  1: tr(ROLE_BADGE_MAP[selectedRole]?.label || selectedRole),
                })}
              </p>
              <Checkbox
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  if (e.target.checked) setLocalError('');
                }}
                label={tr('Tôi xác nhận thay đổi vai trò tài khoản này')}
              />
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ Compact KPI Stat Card */

const STAT_TONES = {
  brand: 'border-[#F2CCD7] bg-[#FDF1F4] text-[#C84666]',
  success: 'border-rp-success-line bg-rp-success-bg text-rp-success',
  warning: 'border-rp-warning-line bg-rp-warning-bg text-rp-warning',
  danger: 'border-rp-danger-line bg-rp-danger-bg text-rp-danger',
  info: 'border-rp-info-line bg-rp-info-bg text-rp-info',
  neutral: 'border-rp-line bg-rp-bg-2 text-rp-text-2',
};

export function AdminStatCard({
  label,
  value,
  subtext,
  badge,
  icon: Icon,
  tone = 'brand',
  className,
  onClick,
}) {
  const { tr } = useLocale();
  const iconCls = STAT_TONES[tone] || STAT_TONES.brand;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'rp-focus flex w-full min-w-0 flex-col justify-between rounded-rp-card border border-rp-line bg-rp-surface p-3.5 text-left shadow-rp-xs transition-all duration-150',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-rp-brand-border hover:shadow-rp-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-rp-text-muted">
            {typeof label === 'string' ? tr(label) : label}
          </p>
          <p className="mt-1 truncate text-[22px] font-bold leading-7 tracking-[-0.02em] tabular-nums text-rp-text">
            {value}
          </p>
        </div>
        {Icon && (
          <span
            aria-hidden="true"
            className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', iconCls)}
          >
            <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
        )}
      </div>
      {(subtext || badge) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[11.5px] text-rp-text-muted">
          {subtext && <span className="truncate">{typeof subtext === 'string' ? tr(subtext) : subtext}</span>}
          {badge}
        </div>
      )}
    </Comp>
  );
}
