import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { moderateAdminMentorReview, reviewAdminCancellationException } from '../../api/admin.js';
import { AdminShell } from '../../components/shells';

const STATUSES = [
  { value: 'Approved', label: 'Cho hiện' },
  { value: 'Hidden', label: 'Ẩn' },
  { value: 'Rejected', label: 'Từ chối' },
  { value: 'Pending', label: 'Chờ xem' },
];

const field = 'mt-1.5 block h-10 w-full rounded-lg border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/20';

export default function AdminMentorCases() {
  const { pathname } = useLocation();
  const [cancelForm, setCancelForm] = useState({ bookingId: '', approveRefund: true, adminNotes: '', extendDays: 7 });
  const [reviewForm, setReviewForm] = useState({ reviewId: '', isPublic: true, status: 'Approved' });
  const [notice, setNotice] = useState('');
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
      <main className="mx-auto max-w-[980px] px-4 py-6 text-[#352C31] sm:px-6">
        <h1 className="text-[25px] font-semibold tracking-tight">Ngoại lệ tư vấn</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[#82737B]">
          Hoàn buổi hủy sát giờ, hoặc quyết định một đánh giá có được hiện hay không. Nhập đúng mã vì hệ thống không có hàng chờ riêng.
        </p>
        {notice && <p className="mt-4 rounded-xl bg-[#E7F6EC] px-4 py-3 text-[13px] text-[#1E5C36]">{notice}</p>}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white" onSubmit={(event) => { event.preventDefault(); setNotice(''); cancel.mutate(); }}>
            <div className="border-b border-[#F3EDF0] px-5 py-4">
              <h2 className="text-[16px] font-semibold">Hoàn buổi</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#A08B96]">Dùng khi học viên xin ngoại lệ vì hủy sát giờ học.</p>
            </div>
            <div className="space-y-4 px-5 py-4">
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
              <button type="submit" disabled={cancel.isPending} className="h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50">
                {cancel.isPending ? 'Đang gửi…' : 'Gửi quyết định'}
              </button>
            </div>
          </form>

          <form className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white" onSubmit={(event) => { event.preventDefault(); setNotice(''); moderate.mutate(); }}>
            <div className="border-b border-[#F3EDF0] px-5 py-4">
              <h2 className="text-[16px] font-semibold">Đánh giá cố vấn</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#A08B96]">Chọn đánh giá có được học viên khác nhìn thấy hay không.</p>
            </div>
            <div className="space-y-4 px-5 py-4">
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
              <button type="submit" disabled={moderate.isPending} className="h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50">
                {moderate.isPending ? 'Đang lưu…' : 'Lưu kiểm duyệt'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AdminShell>
  );
}
