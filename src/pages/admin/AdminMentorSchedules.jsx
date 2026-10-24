import { useEffect, useMemo, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Calendar,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

import { AdminShell } from '../../components/shells';
import { api } from '../../api/client.js';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const FILTERS = [
  ['pending', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['rejected', 'Đã từ chối'],
  ['all', 'Tất cả'],
];

const STATES = {
  pending: {
    label: 'Chờ duyệt',
    text: 'text-[#97713D]',
    dot: 'bg-[#BE965D]',
  },
  approved: {
    label: 'Đã duyệt',
    text: 'text-[#49745A]',
    dot: 'bg-[#619773]',
  },
  rejected: {
    label: 'Đã từ chối',
    text: 'text-[#A15A70]',
    dot: 'bg-[#B76C83]',
  },
};

const BUTTON_CLASS =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg ' +
  'border border-[#E5DDE1] bg-white px-3 text-[13px] ' +
  'text-[#75616C] transition hover:bg-[#FAF5F7] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

function asDate(value) {
  if (!value) return null;

  const text = String(value).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);

  // Giữ quy ước hiện tại: thời gian không có múi giờ là UTC.
  const date = new Date(hasZone ? text : `${text}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateLabel(value) {
  const date = asDate(value);

  return date
    ? date.toLocaleDateString('vi-VN', {
        timeZone: TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';
}

function timeLabel(value) {
  const date = asDate(value);

  return date
    ? date.toLocaleTimeString('vi-VN', {
        timeZone: TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '—';
}

function timeRange(slot) {
  const start = dateLabel(slot.startTime);
  const end = dateLabel(slot.endTime);

  return start === end
    ? `${timeLabel(slot.startTime)}–${timeLabel(slot.endTime)}`
    : `${timeLabel(slot.startTime)} ${start} – ${timeLabel(slot.endTime)} ${end}`;
}

function stateOf(slot) {
  return slot.rejectedAt
    ? 'rejected'
    : slot.isApproved
      ? 'approved'
      : 'pending';
}

function mentorName(slot) {
  return slot.mentorName || `Mentor #${slot.mentorId ?? '—'}`;
}

function Status({ slot }) {
  const state = STATES[stateOf(slot)];

  return (
    <span
      className={`inline-flex items-center gap-1.5
                  whitespace-nowrap text-[12px] ${state.text}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${state.dot}`}
      />
      {state.label}
    </span>
  );
}

export default function AdminMentorSchedules({ embedded = false }) {
  const { pathname } = useLocation();
  const client = useQueryClient();

  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const query = useQuery({
    queryKey: ['admin-mentor-schedules'],
    queryFn: async () => {
      const response = await api.get('/admin/mentor-availabilities');
      const result = response.result ?? [];

      if (!Array.isArray(result)) {
        throw new Error('Danh sách lịch trả về chưa đúng định dạng.');
      }

      return result;
    },
    refetchInterval: 30000,
  });

  const slots = query.data ?? [];

  const counts = useMemo(() => {
    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      all: slots.length,
    };

    slots.forEach((slot) => {
      result[stateOf(slot)] += 1;
    });

    return result;
  }, [slots]);

  const visible = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');

    return slots
      .filter((slot) => {
        const matchStatus =
          filter === 'all' || stateOf(slot) === filter;

        const matchSearch = [
          mentorName(slot),
          slot.mentorId,
          slot.id,
        ].some((value) =>
          String(value ?? '')
            .toLocaleLowerCase('vi-VN')
            .includes(keyword),
        );

        return matchStatus && matchSearch;
      })
      .sort(
        (a, b) =>
          (asDate(a.startTime)?.getTime() ?? 0) -
          (asDate(b.startTime)?.getTime() ?? 0),
      );
  }, [slots, filter, search]);

  const selected = slots.find((slot) => slot.id === selectedId);

  const review = useMutation({
    mutationFn: ({ id, approve, rejectionReason }) =>
      api.post(`/admin/mentor-availabilities/${id}/review`, {
        approve,
        reason: approve ? null : rejectionReason,
      }),

    onSuccess: (_, variables) => {
      setNotice(
        variables.approve ? 'Đã duyệt lịch.' : 'Đã từ chối lịch.',
      );

      setSelectedId(null);
      setReason('');
      setRejecting(false);

      client.invalidateQueries({
        queryKey: ['admin-mentor-schedules'],
      });
      client.invalidateQueries({
        queryKey: ['booking-slots'],
      });
    },

    onError: () => {
      client.invalidateQueries({
        queryKey: ['admin-mentor-schedules'],
      });
    },
  });

  const startDate = selected ? asDate(selected.startTime) : null;

  const canReview =
    selected &&
    stateOf(selected) === 'pending' &&
    startDate &&
    startDate.getTime() > now &&
    !query.isError;

  function closeDetail() {
    if (review.isPending) return;

    setSelectedId(null);
    setReason('');
    setRejecting(false);
    review.reset();
  }

  function choose(slot) {
    if (review.isPending) return;

    setSelectedId(slot.id);
    setReason('');
    setRejecting(false);
    setNotice('');
    review.reset();
  }

  function changeFilter(value) {
    if (review.isPending) return;
    setFilter(value);
    closeDetail();
  }

  function submitReview(approve) {
    // Kiểm tra lại thời gian tại đúng lúc gửi thao tác.
    const currentStart = selected && asDate(selected.startTime);

    if (
      !selected ||
      !currentStart ||
      currentStart.getTime() <= Date.now() ||
      stateOf(selected) !== 'pending' ||
      query.isError ||
      review.isPending
    ) {
      setNow(Date.now());
      return;
    }

    if (!approve && !reason.trim()) return;

    review.mutate({
      id: selected.id,
      approve,
      rejectionReason: reason.trim(),
    });
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
              <h1
                className="text-[25px] font-semibold
                           leading-tight tracking-tight"
              >
                Duyệt lịch Mentor
              </h1>
              <p className="mt-1 text-[13px] text-[#82737B]">
                Xét duyệt khung giờ tư vấn. Thời gian theo giờ Việt Nam.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching || review.isPending}
            className={BUTTON_CLASS}
          >
            <RefreshCw
              size={15}
              className={query.isFetching ? 'animate-spin' : ''}
            />
            Tải lại
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between
                       gap-3 rounded-lg bg-[#EFF6F1]
                       px-4 py-2.5 text-[13px] text-[#49745A]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {query.isError && query.data !== undefined && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-[#FFF2F5]
                       px-4 py-3 text-[13px] text-[#A15A70]"
          >
            Không thể cập nhật danh sách. Dữ liệu bên dưới có thể
            chưa mới; vui lòng tải lại trước khi xét duyệt.
          </div>
        )}

        <div
          className={
            selected
              ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'
              : ''
          }
        >
          <section
            aria-label="Danh sách lịch Mentor"
            className="min-w-0 overflow-hidden rounded-xl
                       border border-[#EAE1E6] bg-white"
          >
            {/* Tab trạng thái */}
            <nav
              aria-label="Lọc trạng thái lịch"
              className="flex gap-3 overflow-x-auto
                         border-b border-[#EEE7EA] px-4"
            >
              {FILTERS.map(([key, label]) => {
                const active = filter === key;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    disabled={review.isPending}
                    onClick={() => changeFilter(key)}
                    className={`inline-flex shrink-0 items-center
                      gap-2 border-b-2 px-1 py-3 text-[13px]
                      transition disabled:opacity-50 ${
                        active
                          ? 'border-[#AD3155] font-medium text-[#AD3155]'
                          : 'border-transparent text-[#8C7D84] hover:text-[#AD3155]'
                      }`}
                  >
                    {label}
                    <span
                      className={`rounded px-1.5 py-0.5
                        text-[11px] ${
                          active
                            ? 'bg-[#F8EAF0] text-[#AD3155]'
                            : 'bg-[#F5F1F3] text-[#95858D]'
                        }`}
                    >
                      {query.data === undefined ? '—' : counts[key]}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div
              className="flex flex-wrap items-center justify-between
                         gap-3 px-4 py-3"
            >
              <span className="text-[12px] text-[#95858D]">
                {query.data === undefined
                  ? 'Danh sách lịch'
                  : `${visible.length} lịch`}
              </span>

              <div className="relative w-full sm:w-[240px]">
                <Search
                  size={15}
                  className="pointer-events-none absolute
                             left-3 top-1/2 -translate-y-1/2
                             text-[#A09399]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm Mentor..."
                  aria-label="Tìm lịch theo Mentor"
                  className="h-9 w-full rounded-lg border
                             border-[#EAE1E6] bg-[#FDFBFC]
                             pl-9 pr-3 text-[12px] outline-none
                             focus:border-[#C8889D]
                             focus:ring-2 focus:ring-[#AD3155]/10"
                />
              </div>
            </div>

            {query.isPending ? (
              <div
                className="px-5 py-12 text-center
                           text-[13px] text-[#8C7D84]"
              >
                Đang tải lịch…
              </div>
            ) : query.isError && query.data === undefined ? (
              <div className="border-t border-[#F2EDF0] px-5 py-10 text-center">
                <AlertCircle
                  size={25}
                  className="mx-auto text-[#B78495]"
                />
                <p className="mt-3 text-[14px] font-medium">
                  Chưa tải được danh sách lịch
                </p>
                <p
                  role="alert"
                  className="mt-1 text-[12px] text-[#8C7D84]"
                >
                  {query.error?.message || 'Vui lòng thử lại sau.'}
                </p>
                <button
                  type="button"
                  onClick={() => query.refetch()}
                  disabled={query.isFetching}
                  className={`${BUTTON_CLASS} mt-4`}
                >
                  {query.isFetching ? 'Đang tải…' : 'Thử lại'}
                </button>
              </div>
            ) : !visible.length ? (
              <div className="border-t border-[#F2EDF0] px-5 py-10 text-center">
                <Calendar
                  size={25}
                  className="mx-auto text-[#C4ADB8]"
                />
                <p className="mt-3 text-[14px] text-[#62515A]">
                  {search
                    ? 'Không tìm thấy lịch phù hợp'
                    : filter === 'pending'
                      ? 'Không có lịch chờ duyệt'
                      : 'Chưa có lịch ở trạng thái này'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left">
                  <thead
                    className="bg-[#FCFAFB] text-[12px]
                               text-[#8C7D84]"
                  >
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Mentor
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Thời gian
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Chỗ
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-right font-medium"
                      >
                        Trạng thái
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F2EDF0]">
                    {visible.map((slot) => {
                      const started =
                        (asDate(slot.startTime)?.getTime() ?? Infinity) <= now;

                      return (
                        <tr
                          key={slot.id}
                          className={
                            selectedId === slot.id
                              ? 'bg-[#FCF0F5]'
                              : 'hover:bg-[#FDFAFC]'
                          }
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={review.isPending}
                              onClick={() => choose(slot)}
                              aria-label={`Xem lịch của ${mentorName(slot)}`}
                              className="text-left text-[13px]
                                         font-medium text-[#62515A]
                                         hover:text-[#AD3155]
                                         disabled:opacity-50"
                            >
                              {mentorName(slot)}
                              <span
                                className="mt-1 block text-[11px]
                                           font-normal text-[#A18F98]"
                              >
                                Xem chi tiết
                              </span>
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-[13px] text-[#62515A]">
                              {dateLabel(slot.startTime)}
                            </p>
                            <p
                              className="mt-1 text-[12px]
                                         tabular-nums text-[#8C7D84]"
                            >
                              {timeRange(slot)}
                              {started && (
                                <span className="ml-2 text-[#AA98A1]">
                                  Đã bắt đầu
                                </span>
                              )}
                            </p>
                          </td>

                          <td
                            className="whitespace-nowrap px-3 py-3
                                       text-[12px] text-[#8C7D84]"
                          >
                            {slot.bookedCount ?? 0}/{slot.maxLearners ?? '—'}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Status slot={slot} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Chỉ hiển thị khi đã chọn lịch */}
          {selected && (
            <section
              aria-labelledby="schedule-review-title"
              className="rounded-xl border border-[#EAE1E6]
                         bg-white xl:sticky xl:top-[88px]"
            >
              <header
                className="flex items-center justify-between
                           border-b border-[#EEE7EA] px-4 py-3"
              >
                <h2
                  id="schedule-review-title"
                  className="text-[14px] font-semibold"
                >
                  Chi tiết lịch
                </h2>
                <button
                  type="button"
                  onClick={closeDetail}
                  disabled={review.isPending}
                  aria-label="Đóng chi tiết"
                  className="rounded-md p-1 text-[#95858D]
                             hover:bg-[#F8F3F5] disabled:opacity-40"
                >
                  <X size={17} />
                </button>
              </header>

              <div className="p-4">
                <h3 className="text-[15px] font-medium">
                  {mentorName(selected)}
                </h3>
                <div className="mt-2">
                  <Status slot={selected} />
                </div>

                <dl className="mt-5 space-y-3 text-[12px]">
                  {[
                    ['Ngày', dateLabel(selected.startTime)],
                    ['Khung giờ', timeRange(selected)],
                    [
                      'Số chỗ',
                      `${selected.bookedCount ?? 0}/${selected.maxLearners ?? '—'}`,
                    ],
                    ['Mã lịch', selected.id],
                    ...(selected.adminName
                      ? [['Người xử lý', selected.adminName]]
                      : []),
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[82px_1fr] gap-3"
                    >
                      <dt className="text-[#95858D]">{label}</dt>
                      <dd className="break-words text-[#62515A]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {selected.rejectionReason && (
                  <div className="mt-4 rounded-lg bg-[#FBF3F6] p-3">
                    <p className="text-[12px] font-medium text-[#9E5870]">
                      Lý do từ chối
                    </p>
                    <p
                      className="mt-1 whitespace-pre-wrap break-words
                                 text-[12px] leading-5 text-[#82737B]"
                    >
                      {selected.rejectionReason}
                    </p>
                  </div>
                )}

                {review.isError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg bg-[#FFF1F4]
                               px-3 py-2 text-[12px] text-[#A13950]"
                  >
                    {review.error?.message || 'Không thể xử lý lịch.'}
                  </p>
                )}

                {canReview ? (
                  <div className="mt-5 border-t border-[#EEE7EA] pt-4">
                    {rejecting ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          submitReview(false);
                        }}
                      >
                        <label
                          htmlFor="rejection-reason"
                          className="text-[12px] font-medium"
                        >
                          Lý do từ chối
                        </label>
                        <textarea
                          id="rejection-reason"
                          autoFocus
                          required
                          rows={3}
                          maxLength={1000}
                          value={reason}
                          disabled={review.isPending}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Nhập lý do để Mentor điều chỉnh..."
                          className="mt-2 w-full resize-y rounded-lg
                                     border border-[#E5DDE1] p-3
                                     text-[12px] leading-5 outline-none
                                     focus:border-[#C8889D]
                                     focus:ring-2 focus:ring-[#AD3155]/10"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={review.isPending}
                            onClick={() => {
                              setRejecting(false);
                              review.reset();
                            }}
                            className={BUTTON_CLASS}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={review.isPending || !reason.trim()}
                            className="h-9 rounded-lg bg-[#AD3155]
                                       px-3 text-[12px] text-white
                                       disabled:opacity-40"
                          >
                            {review.isPending
                              ? 'Đang xử lý…'
                              : 'Xác nhận từ chối'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => {
                            setRejecting(true);
                            review.reset();
                          }}
                          className={BUTTON_CLASS}
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => submitReview(true)}
                          className="inline-flex h-9 items-center
                                     gap-1.5 rounded-lg bg-[#AD3155]
                                     px-3 text-[13px] font-medium
                                     text-white hover:bg-[#982B4B]
                                     disabled:opacity-50"
                        >
                          <Check size={15} />
                          {review.isPending ? 'Đang duyệt…' : 'Duyệt lịch'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    className="mt-5 border-t border-[#EEE7EA]
                               pt-4 text-[12px] leading-5 text-[#95858D]"
                  >
                    {query.isError
                      ? 'Vui lòng tải lại danh sách trước khi xét duyệt.'
                      : stateOf(selected) !== 'pending'
                        ? 'Lịch này đã được xử lý.'
                        : 'Lịch đã bắt đầu hoặc thời gian không hợp lệ.'}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </>
  );

  if (embedded) {
    return <div className="text-[#352C31]">{page}</div>;
  }

  return (
    <AdminShell pathname={pathname} breadcrumb="Duyệt lịch Mentor">
      <main
        className="mx-auto max-w-[1320px] px-4 py-5
                   text-[#352C31] sm:px-6 lg:px-8"
      >
        {page}
      </main>
    </AdminShell>
  );
}
