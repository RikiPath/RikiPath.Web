import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getAdminMentorDisputesQueue,
  moderateAdminMentorReview,
  resolveAdminMentorDispute,
  reviewAdminCancellationException,
  unwrapApiList,
  updateAdminMentorDisputeStatus,
} from '../../api/admin.js';
import { AdminShell } from '../../components/shells';

const DISPUTE_STATUS = {
  Submitted: 'Mới gửi',
  UnderReview: 'Đang xem',
  AwaitingResponse: 'Chờ giải trình',
  Resolved: 'Đã xử lý',
  Rejected: 'Từ chối',
  Closed: 'Đã đóng',
};

const CATEGORY = {
  MentorAbsent: 'Cố vấn vắng',
  SessionNotConducted: 'Buổi không diễn ra',
  MediaRoomIssue: 'Lỗi phòng',
  QualityIssue: 'Chất lượng',
  InappropriateBehavior: 'Hành vi',
  PolicyDispute: 'Chính sách',
  Other: 'Khác',
};

const STATUSES = [
  { value: 'Approved', label: 'Cho hiện' },
  { value: 'Hidden', label: 'Ẩn' },
  { value: 'Rejected', label: 'Từ chối' },
  { value: 'Pending', label: 'Chờ xem' },
];

const field = 'mt-1.5 block h-10 w-full rounded-lg border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/20';

export default function AdminMentorCases() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState('');
  const queue = useQuery({
    queryKey: ['admin-dispute-queue'],
    queryFn: async () => unwrapApiList(await getAdminMentorDisputesQueue({ page: 1, pageSize: 20 })),
  });
  const refreshQueue = () => {
    client.invalidateQueries({ queryKey: ['admin-dispute-queue'] });
  };
  const setStatus = useMutation({
    mutationFn: ({ id, newStatus }) => updateAdminMentorDisputeStatus(id, { newStatus, notes: notes.trim() || null }),
    onSuccess: () => { setNotice('Đã cập nhật trạng thái khiếu nại.'); refreshQueue(); },
  });
  const resolve = useMutation({
    mutationFn: ({ id, approveRefund }) => resolveAdminMentorDispute(id, {
      approveRefund,
      adminDecision: approveRefund ? 'RefundApproved' : 'DisputeRejected',
      adminNotes: notes.trim() || null,
      extendDays: 7,
    }),
    onSuccess: (_data, variables) => {
      setNotice(variables.approveRefund ? 'Đã hoàn lượt cho khiếu nại.' : 'Đã từ chối khiếu nại.');
      refreshQueue();
    },
  });
  const [cancelForm, setCancelForm] = useState({ bookingId: '', approveRefund: true, adminNotes: '', extendDays: 7 });
  const [reviewForm, setReviewForm] = useState({ reviewId: '', isPublic: true, status: 'Approved' });
  const cancel = useMutation({
    mutationFn: () => reviewAdminCancellationException(Number(cancelForm.bookingId), {
      approveRefund: cancelForm.approveRefund,
      adminNotes: cancelForm.adminNotes.trim() || null,
      extendDays: Number(cancelForm.extendDays),
    }),
    onSuccess: () => setNotice('Đã xử lý ngoại lệ hủy buổi.'),
  });
  const moderate = useMutation({
    mutationFn: () => moderateAdminMentorReview(Number(reviewForm.reviewId), {
      isPublic: reviewForm.isPublic,
      status: reviewForm.status,
    }),
    onSuccess: () => setNotice('Đã kiểm duyệt đánh giá.'),
  });

  return (
    <AdminShell pathname={pathname} breadcrumb="Ngoại lệ tư vấn">
      <main className="mx-auto max-w-[1080px] px-4 py-6 text-[#49353F] sm:px-6">
        <header className="mb-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">XỬ LÝ</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Ngoại lệ tư vấn</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#8C7782]">
            Hàng đợi khiếu nại lấy từ hệ thống. Hai biểu mẫu bên dưới luôn cùng chiều: hoàn buổi và kiểm duyệt đánh giá.
          </p>
        </header>
        {notice && <p className="mt-4 rounded-xl bg-[#E7F6EC] px-4 py-3 text-[13px] text-[#1E5C36]">{notice}</p>}

        <section className="overflow-hidden rounded-[22px] border border-[#F0E4E9] bg-white shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
          <div className="border-b border-[#F3EDF0] px-5 py-4">
            <h2 className="text-[16px] font-semibold">Hàng đợi khiếu nại</h2>
            <label className="mt-3 block text-[12px] font-medium text-[#6E5360]">
              Ghi chú dùng cho thao tác bên dưới
              <input value={notes} onChange={(event) => setNotes(event.target.value)} className={field} />
            </label>
          </div>
          {(queue.isError || setStatus.error || resolve.error) && (
            <p role="alert" className="px-5 py-3 text-[13px] text-[#A33357]">{(queue.error || setStatus.error || resolve.error).message}</p>
          )}
          {queue.isPending && <p className="px-5 py-6 text-[13px] text-[#A08B96]">Đang tải khiếu nại…</p>}
          {!queue.isPending && !(queue.data || []).length && <p className="px-5 py-6 text-[13px] text-[#A08B96]">Không có khiếu nại trong hàng đợi.</p>}
          {(queue.data || []).map((item) => (
            <div key={item.id} className="border-b border-[#F6F0F3] px-5 py-3 last:border-b-0">
              <p className="text-[13px] font-medium">{item.learnerName || `Học viên #${item.learnerId}`} · {item.mentorName || `Cố vấn #${item.mentorId}`}</p>
              <p className="mt-1 text-[12px] leading-5 text-[#705261]">
                #{item.id} · buổi #{item.mentorBookingId} · {CATEGORY[item.category] || item.category} · {DISPUTE_STATUS[item.status] || item.status}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#82737B]">{item.reason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: item.id, newStatus: 'UnderReview' })} className="h-9 rounded-full border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Đang xem</button>
                <button type="button" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: item.id, newStatus: 'AwaitingResponse' })} className="h-9 rounded-full border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Chờ giải trình</button>
                <button type="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: item.id, approveRefund: true })} className="h-9 rounded-full bg-[#AD3155] px-3 text-[12px] text-white disabled:opacity-50">Hoàn lượt</button>
                <button type="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: item.id, approveRefund: false })} className="h-9 rounded-full border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Từ chối</button>
              </div>
            </div>
          ))}
        </section>

        <Link to="/admin/mentor-quality" className="mt-4 flex min-h-[72px] items-center justify-between rounded-[22px] border border-[#F0E4E9] bg-white px-5 py-4 text-[13px] shadow-[0_10px_30px_rgba(90,40,58,0.04)] hover:border-[#E7C3D0]">
          <span>
            <span className="block font-semibold">Chỉ số chất lượng cố vấn</span>
            <span className="mt-0.5 block text-[12px] text-[#82737B]">Buổi hoàn thành, hủy, điểm và khiếu nại.</span>
          </span>
          <span className="text-[#AD3155]">Mở</span>
        </Link>

        <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-2">
          <form className="flex flex-col overflow-hidden rounded-[22px] border border-[#F0E4E9] bg-white shadow-[0_10px_30px_rgba(90,40,58,0.04)]" onSubmit={(event) => { event.preventDefault(); setNotice(''); cancel.mutate(); }}>
            <div className="border-b border-[#F3EDF0] px-5 py-4">
              <h2 className="text-[16px] font-semibold">Hoàn buổi</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#A08B96]">Dùng khi học viên xin ngoại lệ vì hủy sát giờ học.</p>
            </div>
            <div className="flex-1 space-y-4 px-5 py-4">
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Mã buổi
                <input required min="1" type="number" value={cancelForm.bookingId} onChange={(event) => setCancelForm({ ...cancelForm, bookingId: event.target.value })} className={field} />
              </label>
              <div>
                <p className="text-[12px] font-medium text-[#6E5360]">Quyết định</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {[{ on: true, label: 'Hoàn lượt' }, { on: false, label: 'Không hoàn' }].map((choice) => (
                    <button
                      key={choice.label}
                      type="button"
                      onClick={() => setCancelForm({ ...cancelForm, approveRefund: choice.on })}
                      className={`rounded-lg border px-3 py-2 text-[13px] ${cancelForm.approveRefund === choice.on ? 'border-[#AD3155] bg-[#FCE8F0] font-medium text-[#AD3155]' : 'border-[#E7DAE1] text-[#705261]'}`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Số ngày gia hạn gói
                <input required min="0" type="number" value={cancelForm.extendDays} onChange={(event) => setCancelForm({ ...cancelForm, extendDays: event.target.value })} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Ghi chú
                <textarea value={cancelForm.adminNotes} onChange={(event) => setCancelForm({ ...cancelForm, adminNotes: event.target.value })} className="mt-1.5 block min-h-24 w-full rounded-lg border border-[#E7DAE1] px-3 py-2 text-[13px] outline-none focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/20" />
              </label>
              {cancel.isError && <p role="alert" className="text-[12px] text-[#A33357]">{cancel.error.message}</p>}
            </div>
            <div className="border-t border-[#F3EDF0] px-5 py-3 text-right">
              <button type="submit" disabled={cancel.isPending} className="h-10 rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50">
                {cancel.isPending ? 'Đang gửi…' : 'Gửi quyết định'}
              </button>
            </div>
          </form>

          <form className="flex flex-col overflow-hidden rounded-[22px] border border-[#F0E4E9] bg-white shadow-[0_10px_30px_rgba(90,40,58,0.04)]" onSubmit={(event) => { event.preventDefault(); setNotice(''); moderate.mutate(); }}>
            <div className="border-b border-[#F3EDF0] px-5 py-4">
              <h2 className="text-[16px] font-semibold">Đánh giá cố vấn</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#A08B96]">Chọn đánh giá có được học viên khác nhìn thấy hay không.</p>
            </div>
            <div className="flex-1 space-y-4 px-5 py-4">
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Mã đánh giá
                <input required min="1" type="number" value={reviewForm.reviewId} onChange={(event) => setReviewForm({ ...reviewForm, reviewId: event.target.value })} className={field} />
              </label>
              <div>
                <p className="text-[12px] font-medium text-[#6E5360]">Trạng thái</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {STATUSES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, status: item.value, isPublic: item.value === 'Approved' })}
                      className={`rounded-lg border px-3 py-2 text-[13px] ${reviewForm.status === item.value ? 'border-[#AD3155] bg-[#FCE8F0] font-medium text-[#AD3155]' : 'border-[#E7DAE1] text-[#705261]'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#49353F]">
                <input type="checkbox" checked={reviewForm.isPublic} onChange={(event) => setReviewForm({ ...reviewForm, isPublic: event.target.checked })} />
                Hiện công khai
              </label>
              {moderate.isError && <p role="alert" className="text-[12px] text-[#A33357]">{moderate.error.message}</p>}
            </div>
            <div className="border-t border-[#F3EDF0] px-5 py-3 text-right">
              <button type="submit" disabled={moderate.isPending} className="h-10 rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50">
                {moderate.isPending ? 'Đang lưu…' : 'Lưu kiểm duyệt'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AdminShell>
  );
}
