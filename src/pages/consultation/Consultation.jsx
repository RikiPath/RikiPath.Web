import { useQuery } from '@tanstack/react-query';
import { getMeetingPlans, getBookingMentors } from '../../api/mentorBookingApi.js';
import { Calendar, Clock, MessageCircle, Star, Video } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';





export default function Consultation() {
  const { pathname } = useLocation();
  const plansQuery = useQuery({ queryKey: ['meeting-plans'], queryFn: getMeetingPlans });
  const mentorsQuery = useQuery({ queryKey: ['booking-mentors'], queryFn: getBookingMentors });
  const PACKAGES = (plansQuery.data || []).map(plan => ({
    title: plan.name, price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(plan.price),
    duration: plan.durationDays ? plan.durationDays + ' ngày' : '—', desc: plan.description || '',
    features: [plan.meetingSessionCount + ' buổi'], highlight: false,
  }));
  const CONSULTANTS = (mentorsQuery.data || []).map(mentor => ({
    id: mentor.id, name: mentor.name, role: 'Mentor', focus: mentor.bio || '',
    avatar: mentor.avatarUrl || '/empty-avatar.svg', rating: '—',
  }));
  return (
    <LearnerShell pathname={pathname} breadcrumb="Tư vấn 1-1">
<div
      className="bg-bg-page text-on-surface antialiased flex min-h-screen overflow-x-hidden"
      data-page="Consultation" data-shell-unified="1"
    >
      <nav className="md:hidden flex justify-between items-center px-4 w-full h-16 bg-surface border-b border-border-base sticky top-0 z-50 shadow-sm">
        <div className="text-lg font-bold text-primary">RikiPath Consultation</div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-text-secondary">notifications</span>
          <img
            alt="User Profile Avatar"
            className="w-8 h-8 rounded-full object-cover border border-border-base"
            src="/empty-avatar.svg"
          />
        </div>
      </nav>



      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col px-6 py-6">


        <div className="p-4 md:p-8 flex flex-col gap-8">
          <section className="bg-surface rounded-xl p-6 md:p-8 border border-border-base shadow-[0_4px_16px_rgba(217,75,104,0.06)] relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-80 h-80 bg-surface-container opacity-80 rounded-full -z-10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-20 w-48 h-48 bg-primary/10 rounded-full -z-10 blur-2xl pointer-events-none" />
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-border-base text-primary text-xs font-semibold mb-3">
                <span>🌸</span>
                <span>Chương trình đồng hành tiếng Nhật</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">
                Tư vấn chuyên gia 1-1
              </h1>
              <p className="text-base text-text-secondary mb-6">
                Giải quyết khó khăn, bứt phá lộ trình JLPT cùng đội ngũ giáo viên giàu kinh nghiệm.
              </p>
              <Link to="/booking-schedule" className="bg-primary text-on-primary rounded-full px-8 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-all shadow-md shadow-primary/25 hover:shadow-lg inline-flex items-center gap-2">
                <span>Bắt đầu ngay</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Gói tư vấn</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Chọn gói phù hợp với mục tiêu học tập của bạn
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plansQuery.isError ? <p role="alert">{plansQuery.error.message}</p> : !plansQuery.isPending && PACKAGES.length === 0 ? <p>Mục này chưa có dữ liệu.</p> : null}
              {PACKAGES.map((pkg) => (
                <article
                  key={pkg.title}
                  className={`rounded-2xl border p-6 bg-white transition-all hover:-translate-y-0.5 ${
                    pkg.highlight
                      ? 'border-[#D94B68] shadow-[0_12px_32px_-12px_rgba(217,75,104,0.35)] ring-1 ring-[#D94B68]/20'
                      : 'border-border-base shadow-[0_4px_16px_rgba(45,40,42,0.04)]'
                  }`}
                >
                  {pkg.highlight && (
                    <span className="inline-flex mb-3 rounded-full bg-[#D94B68] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                      Phổ biến nhất
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-on-surface">{pkg.title}</h3>
                  <p className="mt-2 text-3xl font-extrabold text-[#9E2A4B]">{pkg.price}</p>
                  <p className="mt-1 text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {pkg.duration}
                  </p>
                  <p className="mt-3 text-sm text-text-secondary leading-relaxed">{pkg.desc}</p>
                  <ul className="mt-4 space-y-2">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-on-surface">
                        <span className="material-symbols-outlined text-[#D94B68] text-[18px]">
                          check_circle
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/booking-schedule"
                    className={`mt-6 w-full rounded-full py-2.5 text-sm font-semibold transition-colors text-center inline-flex items-center justify-center ${
                      pkg.highlight
                        ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white shadow-md shadow-[#D94B68]/25'
                        : 'bg-[#FFF0F5] text-[#9E2A4B] border border-[#f2d7de] hover:bg-[#FDE8EC]'
                    }`}
                  >
                    Đặt lịch ngay
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-1">Đội ngũ Sensei</h2>
            <p className="text-sm text-text-secondary mb-5">
              Chuyên gia đồng hành cùng bạn trên hành trình JLPT
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {mentorsQuery.isError ? <p role="alert">{mentorsQuery.error.message}</p> : !mentorsQuery.isPending && CONSULTANTS.length === 0 ? <p>Mục này chưa có dữ liệu.</p> : null}
              {CONSULTANTS.map((c) => (
                <Link
                  to={`/booking-schedule/?mentorId=${c.id}`}
                  key={c.name}
                  className="rounded-2xl border border-border-base bg-white p-5 shadow-[0_4px_16px_rgba(45,40,42,0.04)] flex gap-4 hover:border-[#D94B68]/40"
                >
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#D94B68]/15"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-on-surface">{c.name}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">{c.role}</p>
                    <p className="text-xs text-[#9E2A4B] font-semibold mt-1">{c.focus}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {c.rating}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border-base bg-gradient-to-br from-white to-[#FFF0F5] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-on-surface">Sẵn sàng đặt buổi tư vấn?</h2>
              <p className="text-sm text-text-secondary mt-2 max-w-xl">
                Chọn khung giờ linh hoạt, gặp Sensei qua video call và nhận lộ trình cá nhân hóa ngay
                sau buổi đầu tiên.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#D94B68]" /> Video 1-1
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#D94B68]" /> Lịch linh hoạt
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#D94B68]" /> Chat hỗ trợ
                </span>
              </div>
            </div>
            <Link to="/booking-schedule" className="shrink-0 rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white px-8 py-3 text-sm font-bold shadow-lg shadow-[#D94B68]/30 hover:-translate-y-0.5 transition-all text-center">
              Đặt lịch tư vấn
            </Link>
          </section>
        </div>
      </main>
    </div>

</LearnerShell>
);
}
