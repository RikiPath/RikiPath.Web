import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

export default function ConsultationReceipt() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Biên lai">
      <div className="mx-auto max-w-xl px-6 py-10 text-on-surface" data-page="ConsultationReceipt">
        <div className="rounded-3xl border border-[#eadfd9] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <span className="material-symbols-outlined text-[28px]">check_circle</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold">Thanh toán thành công</h1>
          <p className="mt-2 text-sm text-[#6F6669]">
            Mã giao dịch <span className="font-mono font-semibold text-on-surface">RP-PAY-88421</span> · VNPay
          </p>
          <div className="mt-6 rounded-2xl bg-[#FFF8F8] p-5 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-[#6F6669]">Gói</span>
              <span className="font-semibold">Đồng hành JLPT · 3 buổi</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-[#6F6669]">Buổi đầu</span>
              <span className="font-semibold">Ngày mai, 14:00 · Sato-sensei</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-[#eadfd9] pt-3">
              <span className="text-[#6F6669]">Đã thu</span>
              <span className="text-lg font-extrabold text-[#9E2A4B]">599.000đ</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/consultation-session"
              className="flex-1 rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] py-2.5 text-sm font-bold text-white"
            >
              Xem chi tiết buổi
            </Link>
            <Link
              to="/consultation-center"
              className="flex-1 rounded-full border border-[#f2d7de] bg-[#FFF0F5] py-2.5 text-sm font-bold text-[#9E2A4B]"
            >
              Lịch của tôi
            </Link>
          </div>
        </div>
      </div>
    </LearnerShell>
  );
}
