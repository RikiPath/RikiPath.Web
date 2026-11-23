import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  GraduationCap,
  Plus,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  Avatar,
  Badge,
  Banner,
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Drawer,
  Field,
  Input,
  Modal,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  notify,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatusBadge,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import AdminMentorScheduleCalendar from './AdminMentorScheduleCalendar.jsx';
import {
  createAdminMentor,
  getAdminMentors,
  setAdminMentorActive,
  unwrapApiList,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const EMPTY_FORM = { email: '', password: '', fullName: '', phoneNumber: '' };

const VERIFY_META = {
  Approved: { label: 'Đã duyệt hồ sơ', tone: 'success' },
  Pending: { label: 'Chờ duyệt', tone: 'warning' },
  ChangesRequested: { label: 'Cần bổ sung', tone: 'warning' },
  Rejected: { label: 'Từ chối', tone: 'danger' },
  Unverified: { label: 'Chưa nộp', tone: 'neutral' },
};

function getName(m) {
  return m.fullName || m.name || [m.lastName, m.firstName].filter(Boolean).join(' ') || m.email || 'Giáo viên';
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(-2).map((p) => p[0]).join('').toUpperCase() || 'GV';
}

export default function AdminConsultants({ fillHeight = false } = {}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('name');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSession, setCreateSession] = useState(0);
  const [createAutofillLocked, setCreateAutofillLocked] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const openCreateMentor = () => {
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setSubmitError('');
    setCreateAutofillLocked(true);
    setCreateSession((n) => n + 1);
    setCreateOpen(true);
  };

  const closeCreateMentor = () => {
    if (createMutation.isPending) return;
    setCreateOpen(false);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setSubmitError('');
  };

  const [detailMentor, setDetailMentor] = useState(null);
  const [scheduleMentor, setScheduleMentor] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const mentorsQuery = useQuery({
    queryKey: [ADMIN_KEYS.mentors[0], statusFilter === 'all' || statusFilter === 'inactive'],
    queryFn: async () =>
      unwrapApiList(await getAdminMentors({ includeInactive: statusFilter !== 'active' })),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => createAdminMentor(payload),
    onSuccess: async (_, vars) => {
      await invalidateAdminDomains(queryClient, ['mentors', 'users']);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setSubmitError('');
      notify.success(trf('Đã thêm Giáo viên {0}.', { 0: vars.fullName }), '', { key: 'admin-mentor-create', replace: true });
    },
    onError: (err) => {
      const msg = describeApiError(err)?.message || tr('Không thể thêm Giáo viên.');
      setSubmitError(msg);
      notify.apiError(err, tr('Không thể thêm Giáo viên'), { key: 'admin-mentor-create-err', replace: true });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ mentor, nextActive }) => setAdminMentorActive(mentor.id, nextActive),
    onSuccess: async (_, { mentor, nextActive }) => {
      await invalidateAdminDomains(queryClient, ['mentors', 'users']);
      setToggleTarget(null);
      if (detailMentor?.id === mentor.id) setDetailMentor((d) => (d ? { ...d, isActive: nextActive } : d));
      notify.success(
        nextActive ? trf('Đã kích hoạt lại {0}.', { 0: getName(mentor) }) : trf('Đã tạm khóa {0}.', { 0: getName(mentor) }),
        '',
        { key: 'admin-mentor-status', replace: true },
      );
    },
    onError: (err) => {
      setToggleTarget(null);
      notify.apiError(err, tr('Không thể cập nhật trạng thái Giáo viên'), { key: 'admin-mentor-status-err', replace: true });
    },
  });

  const rawMentors = useMemo(() => mentorsQuery.data || [], [mentorsQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = rawMentors.filter((m) => {
      const active = m.isActive !== false;
      if (statusFilter === 'active' && !active) return false;
      if (statusFilter === 'inactive' && active) return false;
      if (!q) return true;
      return `${getName(m)} ${m.email || ''} ${m.phoneNumber || ''}`.toLowerCase().includes(q);
    });

    return [...rows].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime() || b.id - a.id;
      }
      return getName(a).localeCompare(getName(b), 'vi') || a.id - b.id;
    });
  }, [rawMentors, search, statusFilter, sortBy]);

  const hasFilters = search.trim() !== '' || statusFilter !== 'active';

  function validateCreate() {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = tr('Vui lòng nhập họ tên.');
    const email = form.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = tr('Vui lòng nhập email hợp lệ.');
    if (!form.password || form.password.length < 6) errors.password = tr('Mật khẩu cần ít nhất 6 ký tự.');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreate(e) {
    e.preventDefault();
    setSubmitError('');
    if (!validateCreate()) return;
    createMutation.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phoneNumber: form.phoneNumber.trim() || null,
    });
  }

  const columns = [
    {
      key: 'fullName',
      header: tr('Giáo viên'),
      render: (row) => {
        const name = getName(row);
        return (
          <div className="mx-auto flex w-[250px] max-w-full items-center gap-3 text-left">
            <Avatar src={row.avatarUrl} name={name} size={32} className="ring-1 ring-rp-line" />
            <div className="min-w-0">
              <p title={name} className="truncate font-semibold text-rp-text">{name}</p>
              <p title={row.email} className="truncate text-xs text-rp-text-muted">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phoneNumber',
      header: tr('Liên hệ'),
      compact: true,
      render: (row) => <span className="text-sm text-rp-text-2">{row.phoneNumber || '—'}</span>,
    },
    {
      key: 'verificationStatus',
      header: tr('Hồ sơ'),
      compact: true,
      render: (row) => {
        const meta = VERIFY_META[row.verificationStatus] || VERIFY_META.Unverified;
        return <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>;
      },
    },
    {
      key: 'teachingLevels',
      header: tr('Quyền dạy JLPT'),
      render: (row) => (
        row.teachingLevels?.length ? (
          <div className="flex flex-wrap justify-center gap-1">
            {row.teachingLevels.map((lvl) => (
              <Badge key={lvl} tone="info" size="sm" icon={false}>{lvl}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-rp-text-muted">{tr('Chưa cấp quyền')}</span>
        )
      ),
    },
    {
      key: 'isActive',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => (
        <AdminStatusBadge
          tone={row.isActive !== false ? 'success' : 'danger'}
          label={row.isActive !== false ? 'Hoạt động' : 'Tạm khóa'}
        />
      ),
    },
  ];

  return (
    <div data-page="AdminConsultants" className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {mentorsQuery.isSuccess && rawMentors.length > 0 && <AdminToolbar
        refresh={{
          onRefresh: () => mentorsQuery.refetch({ cancelRefetch: true }),
          refreshing: mentorsQuery.isFetching && !mentorsQuery.isPending,
        }}
        actions={
          <Button
            size="sm"
            className="h-9"
            icon={Plus}
            onClick={openCreateMentor}
          >
            {tr('Thêm Giáo viên')}
          </Button>
        }
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Tìm họ tên, email, SĐT…"
          aria-label={tr('Tìm kiếm Giáo viên')}
          className="w-full sm:w-[240px]"
        />

        <CustomSelect
          fitContent
          value={statusFilter}
          aria-label={tr('Lọc theo trạng thái')}
          onChange={setStatusFilter}
          options={[
            { value: 'active', label: tr('Đang hoạt động'), dotClass: 'bg-rp-success' },
            { value: 'inactive', label: tr('Tạm khóa'), dotClass: 'bg-rp-danger' },
            { value: 'all', label: tr('Tất cả trạng thái') },
          ]}
        />

        <CustomSelect
          fitContent
          value={sortBy}
          aria-label={tr('Sắp xếp danh sách')}
          onChange={setSortBy}
          options={[
            { value: 'name', label: tr('Tên A–Z') },
            { value: 'newest', label: tr('Mới nhất') },
          ]}
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            icon={X}
            onClick={() => {
              setSearch('');
              setStatusFilter('active');
            }}
          >
            {tr('Xóa bộ lọc')}
          </Button>
        )}
      </AdminToolbar>}

      {mentorsQuery.isSuccess && mentorsQuery.isFetching && (
        <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-end overflow-visible">
          <div className="mr-1 mt-1">
            <RefreshingIndicator active delay={60} />
          </div>
        </div>
      )}

      {mentorsQuery.isPending ? (
        <SakuraLoader variant="section" context="data" label={tr('Đang tải danh sách Giáo viên')} delay={140} />
      ) : mentorsQuery.isError ? (
        <ContextualErrorState
          error={mentorsQuery.error}
          title={tr('Chưa tải được danh sách Giáo viên')}
          onRetry={() => mentorsQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <ContextualEmptyState
          variant={rawMentors.length > 0 && hasFilters ? 'search' : 'default'}
          illustration={rawMentors.length > 0 && hasFilters ? 'search' : 'mentor'}
          title={rawMentors.length > 0 && hasFilters ? tr('Không tìm thấy Giáo viên phù hợp') : tr('Chưa có Giáo viên nào')}
          description={rawMentors.length > 0 ? tr('Thêm tài khoản Giáo viên hoặc điều chỉnh bộ lọc trạng thái.') : ''}
          action={
            rawMentors.length === 0 ? (
              <Button size="sm" icon={Plus} onClick={openCreateMentor}>{tr('Thêm Giáo viên')}</Button>
            ) : hasFilters ? (
              <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('active'); }}>
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null
          }
        />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          itemLabel="Giáo viên"
          fillHeight={fillHeight}
          rowActions={(row) => {
            const active = row.isActive !== false;
            return (
              <AdminRowActions>
                <AdminIconAction
                  kind="view"
                  tooltip="Xem hồ sơ tóm tắt Giáo viên"
                  onClick={() => setDetailMentor(row)}
                />
                <AdminIconAction
                  icon={Calendar}
                  tone="brand"
                  tooltip="Xem lịch dạy Giáo viên"
                  onClick={() => setScheduleMentor(row)}
                />
                <AdminIconAction
                  kind={active ? 'lock' : 'unlock'}
                  tone={active ? 'danger' : 'success'}
                  tooltip={active ? 'Khóa tài khoản Giáo viên' : 'Mở khóa tài khoản Giáo viên'}
                  onClick={() => setToggleTarget({ mentor: row, nextActive: !active })}
                />
              </AdminRowActions>
            );
          }}
        />
      )}

      {/* Create Mentor Modal */}
      <Modal
        open={createOpen}
        onClose={closeCreateMentor}
        title={tr('Thêm tài khoản Giáo viên')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={createMutation.isPending} onClick={closeCreateMentor}>
              {tr('Hủy')}
            </Button>
            <Button loading={createMutation.isPending} onClick={handleCreate}>
              {tr('Tạo tài khoản')}
            </Button>
          </div>
        }
      >
        <form key={createSession} autoComplete="off" onSubmit={handleCreate} className="space-y-4">
          {submitError && <Banner tone="danger">{submitError}</Banner>}
          <Field label={tr('Họ và tên')} required error={formErrors.fullName}>
            <Input
              name={`mentor-fullname-${createSession}`}
              autoComplete="off"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder={tr('Ví dụ: Sensei Takahashi')}
              invalid={Boolean(formErrors.fullName)}
            />
          </Field>
          <Field label={tr('Email')} required error={formErrors.email}>
            <Input
              type="email"
              name={`mentor-email-${createSession}`}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              readOnly={createAutofillLocked}
              onFocus={() => setCreateAutofillLocked(false)}
              onPointerDown={() => setCreateAutofillLocked(false)}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="teacher@rikipath.local"
              invalid={Boolean(formErrors.email)}
            />
          </Field>
          <Field label={tr('Mật khẩu tạm thời')} required error={formErrors.password} hint={tr('Ít nhất 6 ký tự.')}>
            <Input
              type="password"
              name={`mentor-password-${createSession}`}
              autoComplete="new-password"
              data-lpignore="true"
              data-form-type="other"
              readOnly={createAutofillLocked}
              onFocus={() => setCreateAutofillLocked(false)}
              onPointerDown={() => setCreateAutofillLocked(false)}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              invalid={Boolean(formErrors.password)}
            />
          </Field>
          <Field label={tr('Số điện thoại')}>
            <Input
              name={`mentor-phone-${createSession}`}
              autoComplete="off"
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
            />
          </Field>
        </form>
      </Modal>

      {/* Mentor Quick Detail Drawer */}
      <Drawer
        open={Boolean(detailMentor)}
        onClose={() => setDetailMentor(null)}
        title={detailMentor ? getName(detailMentor) : ''}
        size="md"
        footer={
          detailMentor && (
            <div className="flex flex-wrap justify-between gap-2">
              <Link
                to={`/admin/mentor-verifications/?mentorId=${detailMentor.id}`}
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                {tr('Mở hồ sơ xét duyệt')}
              </Link>
              <Link
                to="/admin/mentor-qualifications/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white"
              >
                <GraduationCap className="h-4 w-4" />
                <span>{tr('Phân quyền JLPT')}</span>
              </Link>
            </div>
          )
        }
      >
        {detailMentor && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone={detailMentor.isActive !== false ? 'success' : 'danger'} size="sm" icon={false}>
                {detailMentor.isActive !== false ? tr('Hoạt động') : tr('Tạm khóa')}
              </Badge>
              <Badge tone={(VERIFY_META[detailMentor.verificationStatus] || VERIFY_META.Unverified).tone} size="sm" icon={false}>
                {tr((VERIFY_META[detailMentor.verificationStatus] || VERIFY_META.Unverified).label)}
              </Badge>
              {detailMentor.jlptLevel && <Badge tone="brand" size="sm" icon={false}>JLPT: {detailMentor.jlptLevel}</Badge>}
            </div>

            <dl className="space-y-3 rounded-2xl border border-rp-line bg-rp-bg-2/50 p-4">
              <div className="flex justify-between gap-3">
                <dt className="text-rp-text-muted">{tr('Email')}</dt>
                <dd className="font-medium text-rp-text">{detailMentor.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-rp-text-muted">{tr('Số điện thoại')}</dt>
                <dd className="font-medium text-rp-text">{detailMentor.phoneNumber || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-rp-text-muted">{tr('Ngày tạo')}</dt>
                <dd className="font-medium text-rp-text">
                  {detailMentor.createdDate ? formatVnDateTime(detailMentor.createdDate) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-rp-text-muted">{tr('Quyền giảng dạy đang hoạt động')}</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {detailMentor.teachingLevels?.length ? (
                    detailMentor.teachingLevels.map((lvl) => (
                      <Badge key={lvl} tone="info" size="sm" icon={false}>{lvl}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-rp-text-muted">{tr('Chưa cấp quyền giảng dạy')}</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Drawer>

      {/* Mentor Schedule Calendar Modal */}
      <Modal
        open={Boolean(scheduleMentor)}
        onClose={() => setScheduleMentor(null)}
        title={scheduleMentor ? `${tr('Lịch giảng dạy')}: ${getName(scheduleMentor)}` : ''}
        size="xl"
      >
        {scheduleMentor && (
          <AdminMentorScheduleCalendar
            mentorId={scheduleMentor.id}
            mentorName={getName(scheduleMentor)}
            email={scheduleMentor.email}
            initials={getInitials(getName(scheduleMentor))}
            onClose={() => setScheduleMentor(null)}
          />
        )}
      </Modal>

      {/* Activate / Deactivate Confirm */}
      <AlertDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
        loading={toggleMutation.isPending}
        tone={toggleTarget?.nextActive ? 'info' : 'danger'}
        title={toggleTarget?.nextActive ? tr('Kích hoạt lại Giáo viên?') : tr('Tạm khóa tài khoản Giáo viên?')}
        description={
          toggleTarget?.nextActive
            ? trf('Giáo viên "{0}" có thể đăng nhập và giảng dạy trở lại.', { 0: getName(toggleTarget.mentor) })
            : trf('Nếu Giáo viên đang có lớp học hoặc lịch đã có học viên đặt, hệ thống sẽ chặn thao tác để bảo vệ lịch học.', {
                0: getName(toggleTarget?.mentor || {}),
              })
        }
        confirmLabel={toggleTarget?.nextActive ? tr('Kích hoạt') : tr('Tạm khóa')}
      />
    </div>
  );
}
