import { useMemo, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  FileText,
  ChevronRight,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

import { AdminShell } from '../../components/shells';
import {
  getAdminPendingContent,
  reviewAdminContent,
  unwrapApiList,
} from '../../api/admin.js';

const TYPES = [
  ['Lesson', 'Bài luyện tập'],
  ['Vocabulary', 'Từ vựng'],
  ['Kanji', 'Hán tự'],
  ['Grammar', 'Ngữ pháp'],
  ['MockTest', 'Đề thi thử'],
  ['PracticeExercise', 'Bài tập'],
];

const BUTTON_CLASS =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg ' +
  'border border-[#E5DDE1] bg-white px-3 text-[13px] ' +
  'text-[#75616C] transition hover:bg-[#FAF5F7] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

function firstValue(object, keys) {
  return keys
    .map((key) => object?.[key])
    .find((value) => value !== undefined && value !== null && value !== '');
}

function textValue(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function titleOf(item) {
  return (
    textValue(firstValue(item, ['title', 'name', 'rowKey'])) ||
    `Yêu cầu #${item.requestId ?? '—'}`
  );
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminContentReview() {
  const { pathname, search: locationSearch } = useLocation();
  const client = useQueryClient();

  const [type, setType] = useState(() => {
    const initial = new URLSearchParams(locationSearch).get('type');
    return TYPES.some(([value]) => value === initial)
      ? initial
      : TYPES[0][0];
  });

  const [selectedId, setSelectedId] = useState(() =>
    new URLSearchParams(locationSearch).get('requestId'),
  );

  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [notice, setNotice] = useState('');

  const typeLabel = TYPES.find(([value]) => value === type)?.[1];

  const query = useQuery({
    queryKey: ['admin-pending-content', type],
    queryFn: async () =>
      unwrapApiList(await getAdminPendingContent(type)),
  });

  const items = query.data ?? [];

  const selected = items.find(
    (item) =>
      selectedId != null &&
      item.requestId != null &&
      String(item.requestId) === String(selectedId),
  );

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');

    return items.filter((item) =>
      [
        titleOf(item),
        item.submittedByName,
        item.requestId,
      ].some((value) =>
        String(value ?? '')
          .toLocaleLowerCase('vi-VN')
          .includes(keyword),
      ),
    );
  }, [items, search]);

  const review = useMutation({
    mutationFn: ({ requestId, approve, reviewNote }) =>
      reviewAdminContent(requestId, {
        approve,
        reviewNote: approve ? null : reviewNote,
      }),

    onSuccess: (_, variables) => {
      setSelectedId(null);
      setReason('');
      setRejecting(false);
      setNotice(
        variables.approve
          ? 'Đã phê duyệt nội dung.'
          : 'Đã từ chối nội dung.',
      );

      client.invalidateQueries({
        queryKey: ['admin-pending-content'],
      });
      client.invalidateQueries({
        queryKey: ['admin-dashboard'],
      });
    },
  });

  const content = selected
    ? textValue(firstValue(selected, ['content', 'body', 'description']))
    : '';

  const summary = selected
    ? textValue(firstValue(selected, ['summary', 'excerpt']))
    : '';

  function closeDetail() {
    if (review.isPending) return;
    setSelectedId(null);
    setReason('');
    setRejecting(false);
    review.reset();
  }

  function openItem(item) {
    if (review.isPending) return;
    setSelectedId(item.requestId);
    setReason('');
    setRejecting(false);
    setNotice('');
    review.reset();
  }

  function changeType(value) {
    if (review.isPending) return;
    setType(value);
    setSearch('');
    setNotice('');
    closeDetail();
  }

  function submitReview(approve) {
    if (
      !selected ||
      selected.requestId == null ||
      query.isError ||
      review.isPending ||
      (!approve && !reason.trim())
    ) {
      return;
    }

    review.mutate({
      requestId: selected.requestId,
      approve,
      reviewNote: reason.trim(),
    });
  }

  return (
    <AdminShell pathname={pathname} breadcrumb="Duyệt nội dung">
      <main
        className="mx-auto max-w-[1320px] px-4 py-5
                   text-[#352C31] sm:px-6 lg:px-8"
      >
        <header
          className="mb-5 flex flex-wrap items-center
                     justify-between gap-3"
        >
          <div>
            <h1
              className="text-[25px] font-semibold
                         leading-tight tracking-tight"
            >
              Duyệt nội dung
            </h1>
            <p className="mt-1 text-[13px] text-[#82737B]">
              Kiểm tra nội dung trước khi xuất bản.
            </p>
          </div>

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
          <p
            role="alert"
            className="mb-4 rounded-lg bg-[#FFF2F5]
                       px-4 py-3 text-[13px] text-[#A15A70]"
          >
            Không thể cập nhật danh sách. Vui lòng tải lại
            trước khi xét duyệt.
          </p>
        )}

        <div
          className={
            selected
              ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]'
              : ''
          }
        >
          {/* Danh sách */}
          <section
            aria-label="Nội dung chờ duyệt"
            className="min-w-0 overflow-hidden rounded-xl
                       border border-[#EAE1E6] bg-white"
          >
            <div
              className="flex flex-wrap items-center justify-between
                         gap-3 border-b border-[#EEE7EA] px-4 py-3"
            >
              <h2 className="text-[14px] font-medium">
                Đang chờ duyệt
                <span
                  className="ml-2 rounded bg-[#F6F0F3]
                             px-1.5 py-0.5 text-[11px]
                             font-normal text-[#9B7A88]"
                >
                  {query.data === undefined ? '—' : items.length}
                </span>
              </h2>

              <label className="flex items-center gap-2">
                <span className="text-[12px] text-[#95858D]">
                  Loại
                </span>
                <select
                  value={type}
                  disabled={review.isPending}
                  onChange={(event) => changeType(event.target.value)}
                  className="h-9 rounded-lg border border-[#E5DDE1]
                             bg-white px-2 text-[12px]
                             text-[#75616C] outline-none
                             focus:border-[#C8889D]
                             disabled:opacity-50"
                >
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="px-4 py-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3
                             top-1/2 -translate-y-1/2 text-[#A09399]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Tìm nội dung chờ duyệt"
                  placeholder="Tìm nội dung hoặc người gửi..."
                  className="h-9 w-full rounded-lg border
                             border-[#EAE1E6] bg-[#FDFBFC]
                             pl-9 pr-3 text-[12px] outline-none
                             focus:border-[#C8889D]
                             focus:ring-2 focus:ring-[#AD3155]/10"
                />
              </div>
            </div>

            {query.isPending ? (
              <p
                className="px-5 py-12 text-center
                           text-[13px] text-[#8C7D84]"
              >
                Đang tải nội dung…
              </p>
            ) : query.isError && query.data === undefined ? (
              <div className="px-5 py-10 text-center">
                <AlertCircle
                  size={25}
                  className="mx-auto text-[#B78496]"
                />
                <p className="mt-3 text-[14px] font-medium">
                  Chưa tải được nội dung
                </p>
                <p
                  role="alert"
                  className="mt-1 text-[12px] text-[#8C7D84]"
                >
                  {query.error?.message || 'Vui lòng thử lại.'}
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
            ) : !visibleItems.length ? (
              <div className="px-5 py-10 text-center">
                <FileText
                  size={25}
                  className="mx-auto text-[#C4ADB8]"
                />
                <p className="mt-3 text-[14px] text-[#62515A]">
                  {search
                    ? 'Không tìm thấy nội dung phù hợp'
                    : 'Không có nội dung chờ duyệt'}
                </p>
                <p className="mt-1 text-[12px] text-[#95858D]">
                  {search
                    ? 'Thử thay đổi từ khóa tìm kiếm.'
                    : `Các yêu cầu ${typeLabel.toLowerCase()} sẽ hiển thị tại đây.`}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F2EDF0]">
                {visibleItems.map((item, index) => {
                  const active =
                    selectedId != null &&
                    String(item.requestId) === String(selectedId);

                  return (
                    <li key={item.requestId ?? index}>
                      <button
                        type="button"
                        disabled={
                          review.isPending || item.requestId == null
                        }
                        onClick={() => openItem(item)}
                        className={`flex w-full items-center gap-3
                          px-4 py-3.5 text-left transition
                          disabled:opacity-50 ${
                            active
                              ? 'bg-[#FCF0F5]'
                              : 'hover:bg-[#FDFAFC]'
                          }`}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0
                                     items-center justify-center
                                     rounded-lg bg-[#F8F0F4]
                                     text-[#AF8293]"
                        >
                          <FileText size={17} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[14px]
                                       font-medium text-[#51434A]"
                            title={titleOf(item)}
                          >
                            {titleOf(item)}
                          </span>
                          <span
                            className="mt-1 block text-[12px]
                                       leading-5 text-[#95858D]"
                          >
                            {item.submittedByName || 'Chưa có tên người gửi'}
                            <span className="mx-1.5">·</span>
                            {formatDate(
                              firstValue(item, ['submittedAt', 'createdAt']),
                            )}
                          </span>
                        </span>

                        <ChevronRight
                          size={17}
                          className="shrink-0 text-[#BCAAB3]"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Chỉ mở chi tiết sau khi chọn */}
          {selected && (
            <section
              aria-labelledby="content-detail-title"
              className="min-w-0 overflow-hidden rounded-xl
                         border border-[#EAE1E6] bg-white"
            >
              <header
                className="flex items-center justify-between
                           gap-3 border-b border-[#EEE7EA]
                           px-5 py-3"
              >
                <h2
                  id="content-detail-title"
                  className="text-[14px] font-medium"
                >
                  Xem xét nội dung
                </h2>
                <button
                  type="button"
                  disabled={review.isPending}
                  onClick={closeDetail}
                  aria-label="Đóng chi tiết"
                  className="rounded-md p-1 text-[#95858D]
                             hover:bg-[#F8F3F5]
                             disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="p-5">
                <span
                  className="rounded-md bg-[#F8F0F4]
                             px-2 py-1 text-[11px] text-[#9B6F81]"
                >
                  {typeLabel}
                </span>

                <h3
                  className="mt-3 break-words text-[19px]
                             font-semibold leading-snug"
                >
                  {titleOf(selected)}
                </h3>

                <dl
                  className="mt-4 grid grid-cols-[80px_1fr]
                             gap-x-3 gap-y-2 text-[12px]"
                >
                  <dt className="text-[#95858D]">Người gửi</dt>
                  <dd className="break-words text-[#75616C]">
                    {selected.submittedByName || '—'}
                  </dd>

                  <dt className="text-[#95858D]">Ngày gửi</dt>
                  <dd className="text-[#75616C]">
                    {formatDate(
                      firstValue(selected, ['submittedAt', 'createdAt']),
                    )}
                  </dd>
                </dl>

                {(summary || content) ? (
                  <div
                    className="mt-5 border-t border-[#EEE7EA]
                               pt-4 text-[13px] leading-6
                               text-[#62515A]"
                  >
                    {summary && (
                      <p className="mb-3 whitespace-pre-wrap break-words">
                        {summary}
                      </p>
                    )}
                    {content && (
                      <div className="whitespace-pre-wrap break-words">
                        {content}
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    className="mt-5 rounded-lg bg-[#FAF7F9]
                               p-3 text-[12px] leading-5
                               text-[#8C7D84]"
                  >
                    API chưa trả nội dung xem trước dạng văn bản.
                    Hãy kiểm tra dữ liệu đầy đủ bên dưới trước khi duyệt.
                  </p>
                )}

                {/* Giữ đầy đủ dữ liệu để không bỏ sót trường API */}
                <details
                  key={`${type}-${selected.requestId}`}
                  className="mt-5 border-t border-[#EEE7EA] pt-3"
                >
                  <summary
                    className="cursor-pointer text-[12px]
                               text-[#95858D] hover:text-[#AD3155]"
                  >
                    Dữ liệu đầy đủ · #{selected.requestId}
                  </summary>

                  <pre
                    className="mt-3 max-h-[320px] overflow-auto
                               whitespace-pre-wrap break-words
                               rounded-lg bg-[#FAF7F9] p-3
                               font-mono text-[11px] leading-5
                               text-[#82737B]"
                  >
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                </details>

                {review.isError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg bg-[#FFF1F4]
                               px-3 py-2 text-[12px]
                               leading-5 text-[#A13950]"
                  >
                    {review.error?.message || 'Không thể xử lý yêu cầu.'}
                  </p>
                )}

                {query.isError && (
                  <p
                    className="mt-4 text-[12px] leading-5
                               text-[#A15A70]"
                  >
                    Vui lòng tải lại danh sách trước khi xét duyệt.
                  </p>
                )}

                <div
                  className="mt-5 border-t border-[#EEE7EA] pt-4"
                >
                  {rejecting ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitReview(false);
                      }}
                    >
                      <label
                        htmlFor="content-rejection-reason"
                        className="text-[13px] font-medium"
                      >
                        Lý do từ chối
                      </label>

                      <textarea
                        id="content-rejection-reason"
                        autoFocus
                        required
                        rows={3}
                        maxLength={1000}
                        value={reason}
                        disabled={review.isPending}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Nêu nội dung cần chỉnh sửa..."
                        className="mt-2 w-full resize-y rounded-lg
                                   border border-[#E5DDE1] p-3
                                   text-[13px] leading-5 outline-none
                                   focus:border-[#C8889D]
                                   focus:ring-2
                                   focus:ring-[#AD3155]/10"
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
                          disabled={
                            review.isPending ||
                            query.isError ||
                            !reason.trim()
                          }
                          className="h-9 rounded-lg bg-[#AD3155]
                                     px-3 text-[13px] text-white
                                     hover:bg-[#982B4B]
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
                        disabled={review.isPending || query.isError}
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
                        disabled={review.isPending || query.isError}
                        onClick={() => submitReview(true)}
                        className="inline-flex h-9 items-center
                                   gap-1.5 rounded-lg bg-[#AD3155]
                                   px-4 text-[13px] font-medium
                                   text-white hover:bg-[#982B4B]
                                   disabled:opacity-40"
                      >
                        <Check size={15} />
                        {review.isPending ? 'Đang duyệt…' : 'Phê duyệt'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </AdminShell>
  );
}
