import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getSession } from '../../auth/session.js';

export default function LearnerSettings() {
  const { pathname } = useLocation();
  const session = getSession();

  return (
    <LearnerShell pathname={pathname} breadcrumb="Cài đặt">
      <div className="mx-auto max-w-3xl px-6 py-8 text-on-surface" data-page="LearnerSettings">
        <h1 className="text-2xl font-bold">Hồ sơ &amp; cài đặt</h1>
        <p className="mt-1 text-sm text-[#6F6669]">Thông tin tài khoản và mục tiêu JLPT của bạn.</p>

        <section className="mt-6 rounded-2xl border border-[#eadfd9] bg-white p-6">
          <h2 className="text-lg font-bold">Tài khoản</h2>
          <p className="mt-1 text-sm text-[#6F6669]">{session?.email || 'Chưa đăng nhập'}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/update-email"
              className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-sm font-bold text-white"
            >
              Đổi email
            </Link>
            <Link
              to="/change-password"
              className="rounded-full border border-[#eadfd9] px-5 py-2.5 text-sm font-bold"
            >
              Đổi mật khẩu
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#eadfd9] bg-white p-6">
          <h2 className="text-lg font-bold">Mục tiêu JLPT</h2>
          <p className="mt-1 text-sm text-[#6F6669]">Chọn hoặc đổi cấp độ thi và số phút học mỗi ngày.</p>
          <Link
            to="/onboarding"
            className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-sm font-bold text-white"
          >
            Chọn mục tiêu JLPT
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-[#eadfd9] bg-white p-6">
          <h2 className="text-lg font-bold">Thông báo</h2>
          <label className="mt-4 flex items-center justify-between text-sm">
            <span>Nhắc ôn SRS lúc 20:00</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#D94B68]" />
          </label>
          <label className="mt-3 flex items-center justify-between text-sm">
            <span>Email trước buổi tư vấn 12 giờ</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#D94B68]" />
          </label>
        </section>
      </div>
    </LearnerShell>
  );
}
