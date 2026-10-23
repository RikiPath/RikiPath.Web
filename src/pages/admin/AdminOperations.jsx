import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AdminShell } from '../../components/shells';

import {
  getAdminPlans,
  createAdminPlan,
  updateAdminPlan,
  disableAdminPlan,
  getAdminFeatures,
  createAdminFeature,
  updateAdminFeature,
  disableAdminFeature,
  getAdminMentorBookings,
  updateAdminMentorBooking,
  getAdminMentorAvailabilities,
  createAdminMentorAvailability,
  updateAdminMentorAvailability,
  deleteAdminMentorAvailability,
  unwrapApiList,
} from '../../api/admin.js';

const RESOURCES = {
  plans: {
    label: 'Gói đăng ký',
    singular: 'gói đăng ký',
    icon: 'inventory_2',
    description: 'Quản lý các gói đăng ký trên hệ thống.',
    list: getAdminPlans,
    create: createAdminPlan,
    update: updateAdminPlan,
    remove: disableAdminPlan,
    removeLabel: 'Vô hiệu hóa',
  },
  features: {
    label: 'Tính năng',
    singular: 'tính năng',
    icon: 'tune',
    description: 'Quản lý các tính năng của hệ thống.',
    list: getAdminFeatures,
    create: createAdminFeature,
    update: updateAdminFeature,
    remove: disableAdminFeature,
    removeLabel: 'Vô hiệu hóa',
  },
  bookings: {
    label: 'Lịch tư vấn',
    singular: 'lịch tư vấn',
    icon: 'event',
    description: 'Tra cứu và cập nhật lịch tư vấn với Mentor.',
    list: getAdminMentorBookings,
    update: updateAdminMentorBooking,
  },
  availabilities: {
    label: 'Khung giờ Mentor',
    singular: 'khung giờ',
    icon: 'schedule',
    description: 'Quản lý các khung giờ tư vấn của Mentor.',
    list: getAdminMentorAvailabilities,
    create: createAdminMentorAvailability,
    update: updateAdminMentorAvailability,
    remove: deleteAdminMentorAvailability,
    removeLabel: 'Xóa khung giờ',
  },
};

const INITIAL_BODY = '{\n  \n}';

function idOf(row) {
  return (
    row?.id ??
    row?.planId ??
    row?.featureId ??
    row?.bookingId ??
    row?.availabilityId ??
    row?.mentorBookingId
  );
}

function titleOf(row, resource) {
  return (
    row.name ||
    row.title ||
    row.mentorName ||
    row.userName ||
    `${resource.label} chưa có tên`
  );
}

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

function RowStatus({ row }) {
  if (typeof row.isActive === 'boolean') {
    return (
      <span
        className={`inline-flex items-center gap-1.5
          whitespace-nowrap text-[12px] ${
            row.isActive ? 'text-[#397653]' : 'text-[#8C7D84]'
          }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            row.isActive ? 'bg-[#439367]' : 'bg-[#A99AA1]'
          }`}
        />
        {row.isActive ? 'Hoạt động' : 'Đã tắt'}
      </span>
    );
  }

  if (row.status == null || row.status === '') return null;

  return (
    <span
      className="inline-flex rounded-md bg-[#F5F1F3]
                 px-2 py-1 text-[12px] text-[#75676E]"
    >
      {String(row.status)}
    </span>
  );
}

export default function AdminOperations() {
  const { pathname } = useLocation();

  const [resourceKey, setResourceKey] = useState('plans');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorError, setEditorError] = useState('');

  const [editor, setEditor] = useState(null);
  const [body, setBody] = useState(INITIAL_BODY);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const requestRef = useRef(0);
  const resource = RESOURCES[resourceKey];
  const busy = loading || saving;

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError('');

    try {
      const result = await RESOURCES[resourceKey].list();

      if (requestId === requestRef.current) {
        setRows(unwrapApiList(result));
      }
    } catch (err) {
      if (requestId === requestRef.current) {
        setRows([]);
        setError(err.message || 'Không thể tải danh sách.');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [resourceKey]);

  useEffect(() => {
    refresh();

    return () => {
      requestRef.current += 1;
    };
  }, [refresh]);

  const filteredRows = rows.filter((row) => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');

    if (!keyword) return true;

    return [
      titleOf(row, resource),
      row.email,
      row.mentorName,
      row.userName,
      row.status,
    ].some((value) =>
      String(value ?? '')
        .toLocaleLowerCase('vi-VN')
        .includes(keyword),
    );
  });

  const resetEditor = () => {
    setEditor(null);
    setBody(INITIAL_BODY);
    setShowAdvanced(false);
    setConfirmRemove(false);
    setEditorError('');
  };

  const changeResource = (key) => {
    if (key === resourceKey || saving) return;

    requestRef.current += 1;

    setResourceKey(key);
    setRows([]);
    setLoading(true);
    setSearch('');
    setError('');
    setNotice('');
    resetEditor();
  };

  const openCreate = () => {
    resetEditor();
    setNotice('');
    setEditor({ mode: 'create' });
    setShowAdvanced(true);
  };

  const openEdit = (row) => {
    resetEditor();
    setNotice('');
    setEditor({ mode: 'edit', row });
    setBody(JSON.stringify(row, null, 2));
  };

  const selectedId =
    editor?.mode === 'edit' ? idOf(editor.row) : null;

  const canIdentify =
    selectedId !== null &&
    selectedId !== undefined &&
    selectedId !== '';

  const bodyChanged =
    editor?.mode === 'edit' &&
    body !== JSON.stringify(editor.row, null, 2);

  const parseBody = () => {
    let payload;

    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error('Dữ liệu chưa đúng định dạng JSON.');
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error('Dữ liệu cần là một đối tượng JSON.');
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Vui lòng nhập dữ liệu trước khi lưu.');
    }

    return payload;
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editor || saving) return;

    setEditorError('');
    setNotice('');
    setSaving(true);

    try {
      const payload = parseBody();

      if (editor.mode === 'create') {
        await resource.create(payload);
      } else {
        if (!canIdentify) {
          throw new Error(
            'Bản ghi chưa có mã định danh để cập nhật.',
          );
        }

        await resource.update(selectedId, payload);
      }

      const message =
        editor.mode === 'create'
          ? 'Đã thêm mục mới.'
          : 'Đã lưu thay đổi.';

      resetEditor();
      setNotice(message);
      await refresh();
    } catch (err) {
      setEditorError(err.message || 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!resource.remove || !canIdentify || saving) return;

    setSaving(true);
    setEditorError('');
    setNotice('');

    try {
      await resource.remove(selectedId);

      resetEditor();
      setNotice(
        resourceKey === 'availabilities'
          ? 'Đã xóa khung giờ.'
          : 'Đã vô hiệu hóa mục được chọn.',
      );

      await refresh();
    } catch (err) {
      setEditorError(
        err.message || 'Không thể thực hiện thao tác.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell pathname={pathname} breadcrumb="Gói & lịch tư vấn">
      <main
        className="mx-auto max-w-6xl px-4 py-6
                   text-[#352C31] sm:px-6 lg:px-8"
      >
        <header
          className="mb-6 flex flex-wrap items-center
                     justify-between gap-4"
        >
          <div>
            <h1
              className="text-[26px] font-semibold
                         leading-tight tracking-tight"
            >
              Gói & lịch tư vấn
            </h1>
            <p className="mt-1.5 text-[14px] text-[#82737B]">
              Quản lý gói đăng ký, tính năng và lịch Mentor.
            </p>
          </div>

          {resource.create && (
            <button
              type="button"
              onClick={openCreate}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2
                         rounded-[10px] bg-[#AD3155] px-4
                         text-[13px] font-medium text-white
                         transition hover:bg-[#982B4B]
                         disabled:opacity-50"
            >
              <Icon name="add" className="text-[19px]" />
              Thêm {resource.singular}
            </button>
          )}
        </header>

        <nav
          aria-label="Nhóm quản lý"
          className="mb-5 flex gap-1 overflow-x-auto
                     border-b border-[#EAE1E6]"
        >
          {Object.entries(RESOURCES).map(([key, item]) => {
            const active = resourceKey === key;

            return (
              <button
                key={key}
                type="button"
                aria-current={active ? 'page' : undefined}
                disabled={saving}
                onClick={() => changeResource(key)}
                className={[
                  'inline-flex shrink-0 items-center gap-2',
                  'border-b-2 px-4 pb-3 pt-2 text-[13px]',
                  'transition-colors disabled:opacity-50',
                  active
                    ? 'border-[#AD3155] font-semibold text-[#AD3155]'
                    : 'border-transparent text-[#82737B] hover:text-[#AD3155]',
                ].join(' ')}
              >
                <Icon name={item.icon} className="text-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between
                       gap-3 rounded-[10px] bg-[#EDF6F0]
                       px-4 py-3 text-[13px] text-[#397653]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
              className="inline-flex rounded p-1
                         hover:bg-[#DFEEE4]"
            >
              <Icon name="close" className="text-[17px]" />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between
                       gap-3 rounded-[10px] bg-[#FFF0F2]
                       px-4 py-3 text-[13px] text-[#A13950]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              className="shrink-0 font-medium underline
                         disabled:opacity-50"
            >
              Thử lại
            </button>
          </div>
        )}

        <div
          className={
            editor
              ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]'
              : ''
          }
        >
          <section
            aria-label={resource.label}
            aria-busy={loading}
            className="overflow-hidden rounded-xl border
                       border-[#EAE1E6] bg-white"
          >
            <div
              className="flex flex-wrap items-center justify-between
                         gap-3 border-b border-[#F0E9ED] px-5 py-4"
            >
              <div>
                <h2 className="text-[14px] font-semibold">
                  {resource.label}
                  {!loading && (
                    <span
                      className="ml-2 rounded-md bg-[#F6F1F4]
                                 px-1.5 py-0.5 text-[11px]
                                 font-medium text-[#8C7D84]"
                    >
                      {filteredRows.length}
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-[12px] text-[#8C7D84]">
                  {resource.description}
                </p>
              </div>

              <button
                type="button"
                onClick={refresh}
                disabled={busy}
                aria-label="Tải lại danh sách"
                title="Tải lại"
                className="inline-flex h-8 w-8 items-center
                           justify-center rounded-lg text-[#8C7D84]
                           hover:bg-[#F8F3F5] hover:text-[#AD3155]
                           disabled:opacity-40"
              >
                <Icon
                  name="refresh"
                  className={`text-[19px] ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>

            <div className="px-5 py-3">
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3
                             top-1/2 -translate-y-1/2
                             text-[18px] text-[#A09399]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label={`Tìm trong ${resource.label}`}
                  placeholder="Tìm trong danh sách..."
                  className="h-9 w-full rounded-lg border
                             border-[#EAE1E6] bg-[#FDFBFC]
                             pl-9 pr-3 text-[13px] outline-none
                             placeholder:text-[#A89BA2]
                             focus:border-[#C8889D]
                             focus:ring-2 focus:ring-[#AD3155]/10"
                />
              </div>
            </div>

            {loading ? (
              <div
                className="px-5 py-16 text-center
                           text-[13px] text-[#8C7D84]"
              >
                Đang tải danh sách…
              </div>
            ) : error ? (
              <div
                className="px-5 py-16 text-center
                           text-[13px] text-[#8C7D84]"
              >
                Chưa thể hiển thị danh sách.
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Icon
                  name={search ? 'search_off' : resource.icon}
                  className="text-[30px] text-[#C9B5BE]"
                />
                <p className="mt-3 text-[14px] font-medium">
                  {search
                    ? 'Không tìm thấy kết quả'
                    : `Chưa có ${resource.singular}`}
                </p>
                <p className="mt-1 text-[12px] text-[#8C7D84]">
                  {search
                    ? 'Thử tìm bằng một từ khóa khác.'
                    : 'Các mục sẽ xuất hiện tại đây khi được thêm.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3EDF0]">
                {filteredRows.map((row, index) => {
                  const id = idOf(row);
                  const active =
                    editor?.mode === 'edit' && editor.row === row;
                  const title = titleOf(row, resource);
                  const subtitle =
                    row.mentorName && row.mentorName !== title
                      ? row.mentorName
                      : row.userName && row.userName !== title
                        ? row.userName
                        : row.email || '';

                  return (
                    <button
                      key={id ?? `row-${index}`}
                      type="button"
                      disabled={saving}
                      onClick={() => openEdit(row)}
                      className={[
                        'flex w-full items-center gap-3',
                        'px-5 py-4 text-left transition-colors',
                        'focus-visible:outline-none',
                        'focus-visible:ring-2',
                        'focus-visible:ring-inset',
                        'focus-visible:ring-[#AD3155]/30',
                        'disabled:opacity-50',
                        active
                          ? 'bg-[#FDF0F5]'
                          : 'hover:bg-[#FDFAFC]',
                      ].join(' ')}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0
                                   items-center justify-center
                                   rounded-[10px] bg-[#F8F0F4]
                                   text-[#B2778B]"
                      >
                        <Icon
                          name={resource.icon}
                          className="text-[19px]"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-[14px]
                                     font-medium text-[#4B3C44]"
                        >
                          {title}
                        </span>
                        {subtitle && (
                          <span
                            className="mt-1 block truncate
                                       text-[12px] text-[#8C7D84]"
                          >
                            {subtitle}
                          </span>
                        )}
                      </span>

                      <RowStatus row={row} />

                      <Icon
                        name="chevron_right"
                        className="shrink-0 text-[18px]
                                   text-[#BBAAB2]"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {editor && (
            <section
              aria-label="Chi tiết mục được chọn"
              className="overflow-hidden rounded-xl border
                         border-[#EAE1E6] bg-white"
            >
              <div
                className="flex items-start justify-between
                           gap-3 border-b border-[#F0E9ED]
                           px-5 py-4"
              >
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold">
                    {editor.mode === 'create'
                      ? `Thêm ${resource.singular}`
                      : 'Thông tin chi tiết'}
                  </h2>
                  <p
                    className="mt-1 break-words text-[12px]
                               text-[#8C7D84]"
                  >
                    {editor.mode === 'create'
                      ? 'Nhập dữ liệu cho mục mới.'
                      : titleOf(editor.row, resource)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetEditor}
                  disabled={saving}
                  aria-label="Đóng chi tiết"
                  className="inline-flex h-7 w-7 shrink-0
                             items-center justify-center
                             rounded-md text-[#95888E]
                             hover:bg-[#F8F3F5]
                             disabled:opacity-40"
                >
                  <Icon name="close" className="text-[18px]" />
                </button>
              </div>

              <form onSubmit={save} className="p-5">
                {editor.mode === 'edit' && (
                  <div
                    className="mb-5 rounded-[10px]
                               bg-[#FBF7F9] p-4"
                  >
                    <p className="break-words text-[14px] font-medium">
                      {titleOf(editor.row, resource)}
                    </p>
                    <div className="mt-2">
                      <RowStatus row={editor.row} />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={showAdvanced}
                  aria-controls="operations-advanced"
                  onClick={() => setShowAdvanced((value) => !value)}
                  className="flex w-full items-center
                             justify-between gap-2 text-[13px]
                             font-medium text-[#75616C]
                             hover:text-[#AD3155]"
                >
                  Dữ liệu nâng cao
                  <Icon
                    name={
                      showAdvanced ? 'expand_less' : 'expand_more'
                    }
                    className="text-[19px]"
                  />
                </button>

                {showAdvanced && (
                  <div id="operations-advanced" className="mt-4">
                    {editor.mode === 'edit' && (
                      <div
                        className="mb-3 break-all text-[12px]
                                   text-[#8C7D84]"
                      >
                        Mã bản ghi:{' '}
                        <span className="text-[#51434A]">
                          {canIdentify
                            ? String(selectedId)
                            : 'Chưa có mã'}
                        </span>
                      </div>
                    )}

                    <label
                      htmlFor="operations-body"
                      className="text-[12px] font-medium
                                 text-[#75616C]"
                    >
                      Nội dung JSON
                    </label>

                    <textarea
                      id="operations-body"
                      value={body}
                      onChange={(event) =>
                        setBody(event.target.value)
                      }
                      disabled={saving}
                      rows={12}
                      spellCheck={false}
                      aria-describedby="operations-body-help"
                      className="mt-2 block w-full resize-y
                                 rounded-lg border border-[#E7DCE2]
                                 bg-[#FDFBFC] p-3 font-mono
                                 text-[12px] leading-6
                                 text-[#62515A] outline-none
                                 focus:border-[#C8889D]
                                 focus:ring-2
                                 focus:ring-[#AD3155]/10
                                 disabled:opacity-60"
                    />

                    <p
                      id="operations-body-help"
                      className="mt-2 text-[11px]
                                 leading-5 text-[#95858D]"
                    >
                      Chỉ gửi các trường được API hỗ trợ.
                      Mã bản ghi được dùng từ mục đã chọn.
                    </p>
                  </div>
                )}

                {editor.mode === 'edit' && !canIdentify && (
                  <p
                    className="mt-4 text-[12px]
                               leading-5 text-[#A13950]"
                  >
                    Mục này chưa có mã định danh nên chưa thể
                    cập nhật hoặc xóa.
                  </p>
                )}

                {editorError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg bg-[#FFF0F2]
                               px-3 py-2 text-[12px]
                               leading-5 text-[#A13950]"
                  >
                    {editorError}
                  </p>
                )}

                <div
                  className="mt-5 flex justify-end gap-2
                             border-t border-[#F0E9ED] pt-4"
                >
                  <button
                    type="button"
                    onClick={resetEditor}
                    disabled={saving}
                    className="h-9 rounded-lg border
                               border-[#E7DCE2] px-3
                               text-[13px] text-[#75616C]
                               hover:bg-[#FBF7F9]
                               disabled:opacity-50"
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      (editor.mode === 'edit' &&
                        (!canIdentify || !bodyChanged))
                    }
                    className="h-9 rounded-lg bg-[#AD3155]
                               px-4 text-[13px] font-medium
                               text-white hover:bg-[#982B4B]
                               disabled:cursor-not-allowed
                               disabled:opacity-40"
                  >
                    {saving
                      ? 'Đang xử lý…'
                      : editor.mode === 'create'
                        ? 'Thêm mới'
                        : 'Lưu thay đổi'}
                  </button>
                </div>

                {editor.mode === 'edit' && resource.remove && (
                  <div
                    className="mt-5 border-t
                               border-[#F0E9ED] pt-4"
                  >
                    {!confirmRemove ? (
                      <button
                        type="button"
                        disabled={
                          saving ||
                          !canIdentify ||
                          (resourceKey !== 'availabilities' &&
                            editor.row.isActive === false)
                        }
                        onClick={() => setConfirmRemove(true)}
                        className="text-[12px] text-[#AB526C]
                                   hover:text-[#922642]
                                   disabled:opacity-40"
                      >
                        {resource.removeLabel}
                      </button>
                    ) : (
                      <div className="rounded-lg bg-[#FFF4F6] p-3">
                        <p
                          className="text-[12px] leading-5
                                     text-[#925066]"
                        >
                          {resourceKey === 'availabilities'
                            ? 'Bạn muốn xóa khung giờ này?'
                            : 'Bạn muốn vô hiệu hóa mục này?'}
                        </p>

                        <div className="mt-3 flex justify-end gap-3">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setConfirmRemove(false)}
                            className="text-[12px] text-[#82737B]
                                       disabled:opacity-50"
                          >
                            Hủy
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={remove}
                            className="rounded-md bg-[#AB3E5B]
                                       px-3 py-1.5 text-[12px]
                                       font-medium text-white
                                       hover:bg-[#922F49]
                                       disabled:opacity-50"
                          >
                            {saving
                              ? 'Đang xử lý…'
                              : resource.removeLabel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </section>
          )}
        </div>
      </main>
    </AdminShell>
  );
}
