import { useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

export default function LearnerSettings() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Cài đặt">
      <div className="mx-auto max-w-3xl px-6 py-8 text-on-surface" data-page="LearnerSettings">
        <h1 className="text-2xl font-bold">Hồ sơ &amp; cài đặt</h1>
        <p className="mt-1 text-sm text-[#6F6669]">Thông tin hiển thị với Sensei và mục tiêu JLPT của bạn.</p>

        <form
          className="mt-6 space-y-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
            <h2 className="text-lg font-bold">Tài khoản</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Tên hiển thị</span>
                <input className="h-11 w-full rounded-xl border border-[#eadfd9] px-3" defaultValue="Minh Anh" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Email</span>
                <input className="h-11 w-full rounded-xl border border-[#eadfd9] px-3" defaultValue="minhanh@rikipath.vn" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
            <h2 className="text-lg font-bold">Mục tiêu học</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Kỳ thi mục tiêu</span>
                <select className="h-11 w-full rounded-xl border border-[#eadfd9] px-3">
                  <option>JLPT N3 · 12/2026</option>
                  <option>JLPT N2 · 07/2027</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Nhịp SRS mỗi ngày</span>
                <select className="h-11 w-full rounded-xl border border-[#eadfd9] px-3">
                  <option>28 thẻ</option>
                  <option>40 thẻ</option>
                  <option>15 thẻ</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
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

          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-6 py-2.5 text-sm font-bold text-white"
          >
            Lưu thay đổi
          </button>
        </form>
      </div>
    </LearnerShell>
  );
}
