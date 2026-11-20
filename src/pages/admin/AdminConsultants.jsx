import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Eye,
  GraduationCap,
  Lock,
  Plus,
  Search,
  Unlock,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  Drawer,
  Field,
  IconButton,
  Input,
  Modal,
  Pagination,
  RefreshingIndicator,
  SakuraLoader,
  notify,
} from '@/components/ui';
import { usePagination } from '@/hooks/usePagination.js';
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

export default function AdminConsultants() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('name');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

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

  const pagination = usePagination(filtered, { initialPageSize: 10 });
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
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint text-xs font-bold text-rp-brand-strong">
              {getInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-rp-text">{name}</p>
              <p className="truncate text-xs text-rp-text-muted">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phoneNumber',
      header: tr('Liên hệ'),
      render: (row) => <span className="text-sm text-rp-text-2">{row.phoneNumber || '—'}</span>,
    },
    {
      key: 'verificationStatus',
      header: tr('Hồ sơ'),
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
          <div className="flex flex-wrap gap-1">
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
      render: (row) => (
        <Badge tone={row.isActive !== false ? 'success' : 'danger'} size="sm" icon={false}>
          {row.isActive !== false ? tr('Hoạt động') : tr('Tạm khóa')}
        </Badge>
      ),
    },
  ];

  return (
    <div data-page="AdminConsultants" className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-[210px] flex-1">
            <Input
              type="search"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr('Tìm theo họ tên, email hoặc số điện thoại…')}
              aria-label={tr('Tìm kiếm Giáo viên')}
            />
          </div>

          <div className="w-full sm:w-[170px]">
            <CustomSelect
              value={statusFilter}
              aria-label={tr('Lọc theo trạng thái')}
              onChange={setStatusFilter}
              options={[
                { value: 'active', label: tr('Đang hoạt động'), dot: '#22c55e' },
                { value: 'inactive', label: tr('Tạm khóa'), dot: '#ef4444' },
                { value: 'all', label: tr('Tất cả trạng thái') },
              ]}
            />
          </div>

          <div className="w-full sm:w-[160px]">
            <CustomSelect
              value={sortBy}
              aria-label={tr('Sắp xếp danh sách')}
              onChange={setSortBy}
              options={[
                { value: 'name', label: tr('Tên A–Z') },
                { value: 'newest', label: tr('Mới nhất') },
              ]}
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => {
                setSearch('');
                setStatusFilter('active');
              }}
            >
              {tr('Xóa bộ lọc')}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <RefreshingIndicator active={mentorsQuery.isFetching && !mentorsQuery.isPending} />
            <Button
              icon={Plus}
              onClick={() => {
                setForm(EMPTY_FORM);
                setFormErrors({});
                setSubmitError('');
                setCreateOpen(true);
              }}
            >
              {tr('Thêm Giáo viên')}
            </Button>
          </div>
        </div>
      </Card>

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
          title={hasFilters ? tr('Không tìm thấy Giáo viên phù hợp') : tr('Chưa có Giáo viên nào')}
          description={tr('Thêm tài khoản Giáo viên hoặc điều chỉnh bộ lọc trạng thái.')}
          action={
            hasFilters ? (
              <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('active'); }}>
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            rows={pagination.paginatedData}
            rowKey={(row) => row.id}
            rowActions={(row) => {
              const active = row.isActive !== false;
              return (
                <div className="flex items-center justify-end gap-1">
                  <IconButton
                    icon={Eye}
                    size="sm"
                    variant="ghost"
                    label={tr('Xem hồ sơ tóm tắt')}
                    onClick={() => setDetailMentor(row)}
                  />
                  <IconButton
                    icon={Calendar}
                    size="sm"
                    variant="ghost"
                    label={tr('Xem lịch giảng dạy')}
                    onClick={() => setScheduleMentor(row)}
                  />
                  <IconButton
                    icon={active ? Lock : Unlock}
                    size="sm"
                    variant="ghost"
                    label={active ? tr('Tạm khóa tài khoản') : tr('Kích hoạt lại')}
                    onClick={() => setToggleTarget({ mentor: row, nextActive: !active })}
                  />
                </div>
              );
            }}
          />

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={filtered.length}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel={tr('Giáo viên')}
          />
        </div>
      )}

      {/* Create Mentor Modal */}
      <Modal
        open={createOpen}
        onClose={() => !createMutation.isPending && setCreateOpen(false)}
        title={tr('Thêm tài khoản Giáo viên')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={createMutation.isPending} onClick={() => setCreateOpen(false)}>
              {tr('Hủy')}
            </Button>
            <Button loading={createMutation.isPending} onClick={handleCreate}>
              {tr('Tạo tài khoản')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {submitError && <Banner tone="danger">{submitError}</Banner>}
          <Field label={tr('Họ và tên')} required error={formErrors.fullName}>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder={tr('Ví dụ: Sensei Takahashi')}
              invalid={Boolean(formErrors.fullName)}
            />
          </Field>
          <Field label={tr('Email')} required error={formErrors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="teacher@rikipath.local"
              invalid={Boolean(formErrors.email)}
            />
          </Field>
          <Field label={tr('Mật khẩu tạm thời')} required error={formErrors.password} hint={tr('Ít nhất 6 ký tự.')}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              invalid={Boolean(formErrors.password)}
            />
          </Field>
          <Field label={tr('Số điện thoại')}>
            <Input
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
        description={detailMentor?.email}
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
