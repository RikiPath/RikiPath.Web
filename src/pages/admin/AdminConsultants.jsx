import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ADMIN_MENTORS_KEY = ['admin-mentors', 'list'];
import { useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Calendar,
  X,
  MoreHorizontal,
} from 'lucide-react';

import { AdminShell } from '@/layouts';
import { RefreshingIndicator, SakuraLoader, Select } from '@/components/ui';
import AdminMentorScheduleCalendar from './AdminMentorScheduleCalendar.jsx';
import {
  getAdminMentors,
  createAdminMentor,
  setAdminMentorActive,
  unwrapApiList,
} from '@/features/admin/api/adminApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const EMPTY_FORM = {
  email: '',
  password: '',
  fullName: '',
  phoneNumber: '',
};

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-rp-line bg-white ' +
  'px-3 text-[13px] text-rp-text outline-none ' +
  'placeholder:text-rp-text-muted focus:border-rp-brand-border ' +
  'focus:ring-2 focus:ring-rp-brand-strong/10';

const BUTTON_CLASS =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg ' +
  'border border-rp-line bg-white px-3 text-[13px] ' +
  'text-rp-text-2 transition hover:bg-rp-brand-tint ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

function getName(mentor) {
  return (
    mentor.fullName ||
    mentor.name ||
    [mentor.lastName, mentor.firstName].filter(Boolean).join(' ') ||
    mentor.email ||
    'Cố vấn'
  );
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function Status({ active }) {
  const { tr } = useLocale();
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap
        text-[13px] ${
          active ? 'text-[#49745A]' : 'text-rp-text-muted'
        }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-[#51956B]' : 'bg-[#A99AA1]'
        }`}
      />
      {active ? tr('Hoạt động') : tr('Đã tắt')}
    </span>
  );
}

/* Dialog dùng chung: khóa cuộn nền, hỗ trợ Escape và giữ focus. */
function Dialog({ titleId, onClose, children, wide = false }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    panel?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const focusable = [...panel.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), ' +
        'a[href], [tabindex="0"]',
      )];

      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panel)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center
                 justify-center bg-[#30242B]/35 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90vh] w-full flex-col
          overflow-hidden rounded-2xl bg-white
          shadow-[0_16px_60px_rgba(48,36,43,0.16)]
          outline-none ${wide ? 'max-w-[820px]' : 'max-w-[460px]'}`}
      >
        {children}
      </section>
    </div>
  );
}

function ScheduleDialog({ mentor, onClose }) {
  return (
    <Dialog titleId="mentor-schedule-title" onClose={onClose} wide>
      <AdminMentorScheduleCalendar mentorId={mentor.id} mentorName={getName(mentor)}
        email={mentor.email} initials={getInitials(getName(mentor))} onClose={onClose} />
    </Dialog>
  );
}
export default function AdminConsultants({ embedded = false }) {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();

  const queryClient = useQueryClient();
  const mentorsQuery = useQuery({
    queryKey: ADMIN_MENTORS_KEY,
    queryFn: async () => unwrapApiList(await getAdminMentors()).map((mentor) => ({
      ...mentor,
      id: mentor.id ?? mentor.mentorId ?? mentor.userId,
    })),
  });
  const mentors = useMemo(() => mentorsQuery.data ?? [], [mentorsQuery.data]);
  const loading = mentorsQuery.isPending;
  const error = mentorsQuery.isError ? 'Không thể tải danh sách cố vấn. Vui lòng thử lại.' : '';
  const setMentors = useCallback((update) => {
    queryClient.setQueryData(ADMIN_MENTORS_KEY, (current = []) => (typeof update === 'function' ? update(current) : update));
  }, [queryClient]);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [scheduleMentor, setScheduleMentor] = useState(null);
  const [detailMentor, setDetailMentor] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadMentors = useCallback(() => mentorsQuery.refetch(), [mentorsQuery]);

  const filteredMentors = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');

    return mentors.filter((mentor) => {
      const active = mentor.isActive !== false;
      const matchStatus =
        filter === 'all' ||
        (filter === 'active' && active) ||
        (filter === 'inactive' && !active);

      const matchSearch = [
        getName(mentor),
        mentor.email,
        mentor.phoneNumber,
      ].some((value) =>
        String(value || '').toLocaleLowerCase('vi-VN').includes(keyword),
      );

      return matchStatus && matchSearch;
    });
  }, [mentors, filter, search]);

  const activeCount = mentors.filter(
    (mentor) => mentor.isActive !== false,
  ).length;

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeCreate() {
    if (!submitting) setShowCreate(false);
  }

  async function createMentor(event) {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    setNotice('');

    try {
      await createAdminMentor({
        ...form,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });

      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      setNotice('Đã thêm cố vấn.');
      notify.success('Đã thêm cố vấn mới.', '', { key: 'admin-mentor-create' });
      await loadMentors();
    } catch (err) {
      setFormError('Không thể thêm cố vấn. Vui lòng kiểm tra thông tin và thử lại.');
      notify.apiError(err, 'Không thể thêm cố vấn', { key: 'admin-mentor-create-err' });
    } finally {
      setSubmitting(false);
    }
  }

  function openDetail(mentor) {
    setDetailMentor(mentor);
    setConfirmStatus(false);
    setDetailError('');
  }

  function closeDetail() {
    if (!changingStatus) {
      setDetailMentor(null);
      setConfirmStatus(false);
    }
  }

  async function changeStatus() {
    if (!detailMentor || changingStatus) return;
    const nextActive = detailMentor.isActive === false;

    setChangingStatus(true);
    setDetailError('');

    try {
      await setAdminMentorActive(detailMentor.id, nextActive);

      setMentors((current) =>
        current.map((mentor) =>
          mentor.id === detailMentor.id
            ? { ...mentor, isActive: nextActive }
            : mentor,
        ),
      );

      setDetailMentor((current) => ({
        ...current,
        isActive: nextActive,
      }));
      setConfirmStatus(false);
      const msg = nextActive ? 'Đã kích hoạt cố vấn.' : 'Đã vô hiệu hóa cố vấn.';
      setNotice(msg);
      notify.success(msg, '', { key: `admin-mentor-status-${detailMentor.id}` });
    } catch (err) {
      setDetailError(err.message || 'Không thể đổi trạng thái.');
      notify.apiError(err, 'Không thể đổi trạng thái cố vấn', { key: 'admin-mentor-status-err' });
    } finally {
      setChangingStatus(false);
    }
  }

  const page = (
      <>
        <header
          className={`mb-4 flex flex-wrap items-center gap-3 ${
            embedded ? 'justify-end' : 'justify-between'
          }`}
        >
          {!embedded && (
            <div>
              <h1 className="text-[25px] font-semibold tracking-tight">
                {tr('Quản lý cố vấn')}
              </h1>
              <p className="mt-1 text-[13px] text-rp-text-muted">
                {tr('Hồ sơ và trạng thái tư vấn.')}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setFormError('');
              setShowCreate(true);
            }}
            className="inline-flex h-10 items-center gap-2
                       rounded-[10px] bg-rp-brand-strong px-4
                       text-[13px] font-medium text-white
                       hover:bg-rp-brand-deep rp-press"
          >
            <Plus size={17} />
            {tr('Thêm cố vấn')}
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-3
                       rounded-lg bg-[#EFF6F1] px-4 py-2.5
                       text-[13px] text-[#49745A]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label={tr('Đóng thông báo')}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section
          aria-label={tr('Danh sách cố vấn')}
          className="overflow-hidden rounded-xl border
                     border-rp-line bg-white"
        >
          <div
            className="flex flex-wrap items-center justify-between
                       gap-3 border-b border-rp-line px-5 py-3.5"
          >
            <p className="text-[13px] text-rp-text-muted">
              {loading && !mentors.length ? (
                <SakuraLoader variant="inline" size={16} context="cohort" />
              ) : (
                <>
                  <span className="font-medium text-rp-text-2">
                   {trf('{0} cố vấn', { 0: mentors.length })}
                  </span>
                  <span className="mx-2 text-rp-text-muted">·</span>
                  {activeCount}{' '}{tr('đang hoạt động')}
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3
                             top-1/2 -translate-y-1/2 text-rp-text-muted"
                />
                <input
                  type="search"
                  aria-label={tr('Tìm cố vấn')}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tr('Tên, email, số điện thoại...')}
                  className="h-9 w-[240px] rounded-lg border
                             border-rp-line bg-rp-brand-tint
                             pl-9 pr-3 text-[12px] outline-none
                             focus:border-rp-brand-border
                             focus:ring-2 focus:ring-rp-brand-strong/10"
                />
              </div>

              <Select
                aria-label={tr('Lọc trạng thái cố vấn')}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="!h-9 !w-auto !rounded-lg !px-3 !pr-8 !text-[12px]"
              >
                <option value="all">{tr('Mọi trạng thái')}</option>
                <option value="active">{tr('Hoạt động')}</option>
                <option value="inactive">{tr('Đã tắt')}</option>
              </Select>

              <RefreshingIndicator active={loading && mentors.length > 0} />
              <button
                type="button"
                onClick={loadMentors}
                disabled={loading}
                aria-label={tr('Tải lại danh sách')}
                title={tr('Tải lại')}
                className="flex h-9 w-9 items-center justify-center
                           rounded-lg text-rp-text-muted
                           hover:bg-rp-brand-tint disabled:opacity-50"
              >
                {loading ? <SakuraLoader variant="inline" size={16} /> : <RefreshCw size={16} />}
              </button>
            </div>
          </div>

          {error ? (
            <div role="alert" className="px-5 py-10 text-center">
              <p className="text-[13px] text-rp-brand-strong">{error}</p>
              <button
                type="button"
                onClick={loadMentors}
                className="mt-3 text-[13px] text-rp-brand-strong underline"
              >
                {tr('Thử lại')}
              </button>
            </div>
          ) : (
            <div data-density="compact" className="rp-scroll-x">
              <table
                aria-busy={loading}
                className="w-full min-w-[700px] table-fixed text-left"
              >
                <colgroup>
                  <col className="w-[43%]" />
                  <col className="w-[19%]" />
                  <col className="w-[18%]" />
                  <col className="w-[20%]" />
                </colgroup>

                <thead className="bg-rp-bg-2 text-[12px] text-rp-text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">
                      {tr('Cố vấn')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {tr('Số điện thoại')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {tr('Trạng thái')}
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-medium"
                    >
                      {tr('Thao tác')}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-rp-line">
                  {loading && mentors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center">
                        <SakuraLoader variant="section" context="profile" label={tr('Đang tải danh sách cố vấn')} className="min-h-[120px] py-4" delay={160} />
                      </td>
                    </tr>
                  ) : filteredMentors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <p className="text-[14px] text-rp-text-2">
                          {tr('Không có cố vấn phù hợp')}
                        </p>
                        <p className="mt-1 text-[12px] text-rp-text-muted">
                          {tr('Thử thay đổi từ khóa hoặc bộ lọc.')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredMentors.map((mentor) => {
                      const name = getName(mentor);

                      return (
                        <tr key={mentor.id} className="hover:bg-rp-bg-2">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0
                                           items-center justify-center
                                           rounded-xl bg-rp-brand-soft
                                           text-[12px] font-medium
                                           text-rp-brand-strong"
                              >
                                {getInitials(name)}
                              </div>

                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openDetail(mentor)}
                                  title={name}
                                  className="block max-w-full truncate
                                             text-left text-[14px]
                                             font-medium hover:text-rp-brand-strong"
                                >
                                  {name}
                                </button>

                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span
                                    title={mentor.email}
                                    className="truncate text-[12px] text-rp-text-muted"
                                  >
                                    {mentor.email || '—'}
                                  </span>
                                  {mentor.isEmailVerified && (
                                    <span
                                      role="img"
                                      aria-label={tr('Email đã xác thực')}
                                      title={tr('Email đã xác thực')}
                                      className="shrink-0 text-[#629171]"
                                    >
                                      <CheckCircle2 size={13} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-[13px] text-rp-text-muted">
                            {mentor.phoneNumber || '—'}
                          </td>

                          <td className="px-4 py-3.5">
                            <Status active={mentor.isActive !== false} />
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setScheduleMentor(mentor)}
                                className="inline-flex items-center gap-1.5
                                           whitespace-nowrap rounded-md
                                           px-2 py-1.5 text-[12px]
                                           text-rp-brand-strong hover:bg-rp-brand-soft"
                              >
                                <Calendar size={14} />
                                {tr('Xem lịch')}
                              </button>

                              <button
                                type="button"
                                onClick={() => openDetail(mentor)}
                                aria-label={trf('Chi tiết {0}', { 0: name })}
                                title={tr('Chi tiết và trạng thái')}
                                className="rounded-md p-1.5
                                           text-rp-text-muted hover:bg-rp-brand-soft"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && (
            <div
              className="border-t border-rp-line px-5 py-2.5
                         text-[12px] text-rp-text-muted"
            >
             {trf('Hiển thị {0}/{1} cố vấn', { 0: filteredMentors.length, 1: mentors.length })}
            </div>
          )}
        </section>

        {showCreate && (
          <Dialog titleId="add-mentor-title" onClose={closeCreate}>
            <header
              className="flex items-center justify-between
                         border-b border-rp-line px-5 py-4"
            >
              <h2 id="add-mentor-title" className="text-[17px] font-semibold">
                {tr('Thêm cố vấn')}
              </h2>
              <button
                type="button"
                disabled={submitting}
                onClick={closeCreate}
                aria-label={tr('Đóng')}
                className="rounded-lg p-1 text-rp-text-muted hover:bg-rp-brand-tint"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={createMentor} className="overflow-y-auto p-5">
              <fieldset disabled={submitting} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[13px]">{tr('Họ và tên')}</span>
                  <input
                    value={form.fullName}
                    onChange={(event) => updateForm('fullName', event.target.value)}
                    placeholder={tr('Nguyễn Minh Anh')}
                    className={INPUT_CLASS}
                    autoComplete="name"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px]">Email *</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => updateForm('email', event.target.value)}
                    placeholder="ten@example.com"
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px]">
                    {tr('Mật khẩu khởi tạo *')}
                  </span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => updateForm('password', event.target.value)}
                    className={INPUT_CLASS}
                  />
                  <span className="mt-1 block text-[11px] text-rp-text-muted">
                    {tr('Tối thiểu 6 ký tự theo form hiện tại.')}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px]">
                    {tr('Số điện thoại')}
                  </span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      updateForm('phoneNumber', event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                </label>
              </fieldset>

              {formError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-rp-brand-tint
                             px-3 py-2 text-[12px] text-rp-brand-strong"
                >
                  {formError}
                </p>
              )}

              <footer
                className="mt-5 flex justify-end gap-2
                           border-t border-rp-line pt-4"
              >
                <button
                  type="button"
                  disabled={submitting}
                  onClick={closeCreate}
                  className={BUTTON_CLASS}
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 rounded-lg bg-rp-brand-strong px-4
                             text-[13px] text-white hover:bg-rp-brand-deep
                             disabled:opacity-50 rp-press"
                >
                  {submitting ? tr('Đang thêm…') : tr('Thêm cố vấn')}
                </button>
              </footer>
            </form>
          </Dialog>
        )}

        {detailMentor && (
          <Dialog titleId="mentor-detail-title" onClose={closeDetail}>
            <header
              className="flex items-center justify-between
                         border-b border-rp-line px-5 py-4"
            >
              <h2 id="mentor-detail-title" className="text-[17px] font-semibold">
                {tr('Thông tin cố vấn')}
              </h2>
              <button
                type="button"
                disabled={changingStatus}
                onClick={closeDetail}
                aria-label={tr('Đóng chi tiết')}
                className="rounded-lg p-1 text-rp-text-muted hover:bg-rp-brand-tint"
              >
                <X size={18} />
              </button>
            </header>

            <div className="overflow-y-auto p-5">
              <p className="text-[16px] font-medium">{getName(detailMentor)}</p>
              <div className="mt-2">
                <Status active={detailMentor.isActive !== false} />
              </div>

              <dl className="mt-5 space-y-3 text-[13px]">
                {[
                  ['Mã hồ sơ', detailMentor.id],
                  ['Email', detailMentor.email],
                  ['Số điện thoại', detailMentor.phoneNumber],
                  [
                    'Xác thực email',
                    detailMentor.isEmailVerified === true
                      ? 'Đã xác thực'
                      : detailMentor.isEmailVerified === false
                        ? 'Chưa xác thực'
                        : 'Chưa có thông tin',
                  ],
                  [
                    'Ngày tạo',
                    detailMentor.createdAt &&
                    !Number.isNaN(new Date(detailMentor.createdAt).getTime())
                      ? new Date(detailMentor.createdAt).toLocaleDateString(currentIntlTag())
                      : null,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-rp-text-muted">{tr(label)}</dt>
                    <dd className="break-words text-rp-text-2">
                      {value ?? '—'}
                    </dd>
                  </div>
                ))}
              </dl>

              {detailError && (
                <p role="alert" className="mt-4 text-[12px] text-rp-brand-strong">
                  {detailError}
                </p>
              )}

              <div className="mt-5 border-t border-rp-line pt-4">
                {confirmStatus ? (
                  <div className="rounded-lg bg-rp-brand-tint p-3">
                    <p className="text-[13px] text-rp-text-2">
                      {detailMentor.isActive === false
                        ? tr('Kích hoạt lại cố vấn này?')
                        : tr('Vô hiệu hóa cố vấn này?')}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={changingStatus}
                        onClick={() => setConfirmStatus(false)}
                        className={BUTTON_CLASS}
                      >
                        {tr('Hủy')}
                      </button>
                      <button
                        type="button"
                        disabled={changingStatus}
                        onClick={changeStatus}
                        className="h-9 rounded-lg bg-rp-brand-strong px-3
                                   text-[13px] text-white disabled:opacity-50 rp-press"
                      >
                        {changingStatus ? tr('Đang xử lý…') : tr('Xác nhận')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={detailMentor.id == null}
                      onClick={() => setConfirmStatus(true)}
                      className="text-[12px] text-rp-brand-strong disabled:opacity-40"
                    >
                      {detailMentor.isActive === false
                        ? tr('Kích hoạt cố vấn')
                        : tr('Vô hiệu hóa cố vấn')}
                    </button>
                    <button
                      type="button"
                      onClick={closeDetail}
                      className={BUTTON_CLASS}
                    >
                      {tr('Đóng')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Dialog>
        )}

        {scheduleMentor && (
          <ScheduleDialog
            mentor={scheduleMentor}
            onClose={() => setScheduleMentor(null)}
          />
        )}
      </>
  );

  if (embedded) {
    return <div className="text-rp-text">{page}</div>;
  }

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Cố vấn')}>
      <main className="rp-container py-6 text-rp-text lg:py-8">
        {page}
      </main>
    </AdminShell>
  );
}
