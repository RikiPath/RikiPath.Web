import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
export default function ConsultationCenter() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Lịch tư vấn">
<div className="bg-bg-page text-on-surface min-h-screen flex flex-col md:flex-row antialiased selection:bg-secondary-container selection:text-primary-dark min-h-screen" data-page="ConsultationCenter" data-shell-unified="1">


{/*  TopNavBar (Mobile only)  */}





{/*  SideNavBar (Desktop)  */}





{/*  Main Content  */}


<main className="flex-1 flex flex-col min-h-screen bg-bg-page">
{/*  Canvas  */}
<div className="p-6 md:p-8 flex-1 max-w-7xl mx-auto w-full">
<header className="mb-space-lg flex flex-col md:flex-row md:items-end justify-between gap-space-md">
<div>
<nav className="mb-3 flex flex-wrap gap-4 font-body-sm text-body-sm text-text-secondary">
<Link className="hover:text-primary transition-colors" to="/consultation">Gói tư vấn</Link>
<Link className="hover:text-primary transition-colors" to="/booking-schedule">Đặt lịch</Link>
<Link className="font-semibold text-primary border-b-2 border-primary pb-0.5" to="/consultation-center">Lịch của tôi</Link>
</nav>
<h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
    Consultation Center
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary-fixed text-primary text-xs">🌸</span>
</h2>
<p className="font-support-sm text-support-sm text-text-secondary mt-1">Manage your sessions and reviews</p>
</div>
<Link to="/booking-schedule" className="bg-primary text-on-primary rounded-full px-space-lg py-space-sm font-label-xs text-label-xs hover:bg-primary-dark transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-primary/25 self-start md:self-auto inline-flex items-center gap-2 active:scale-95">
<span className="material-symbols-outlined text-[18px]">add</span>
                    Đặt lịch mới
                </Link>
</header>
{/*  Tabs  */}
<div className="flex gap-space-md border-b border-border-base mb-space-lg overflow-x-auto pb-2 scrollbar-hide">
<button className="font-title-sm text-title-sm text-primary font-bold border-b-2 border-primary pb-2 px-2 whitespace-nowrap">
                    Sắp tới (2)
                </button>
<button className="font-title-sm text-title-sm text-text-secondary hover:text-primary transition-colors pb-2 px-2 whitespace-nowrap">
                    Đang xử lý (1)
                </button>
<button className="font-title-sm text-title-sm text-text-secondary hover:text-primary transition-colors pb-2 px-2 whitespace-nowrap">
                    Đã hoàn thành
                </button>
</div>
{/*  Grid Layout  */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
{/*  Main Content Area  */}
<div className="lg:col-span-2 flex flex-col gap-space-md">
{/*  Card 1: Upcoming  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md border border-border-base shadow-[0px_4px_16px_rgba(217,75,104,0.04)] hover:shadow-[0px_8px_24px_rgba(217,75,104,0.1)] hover:border-primary/40 transition-all duration-300 relative overflow-hidden group">
<div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
<div className="flex justify-between items-start mb-space-md">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-primary">
<span className="material-symbols-outlined">video_camera_front</span>
</div>
<div>
<span className="inline-block bg-bg-soft-red text-primary font-label-xs text-label-xs px-2.5 py-0.5 rounded-full mb-1 border border-border-base">Video Call</span>
<Link to="/consultation-session" className="font-title-sm text-title-sm text-on-surface hover:text-primary">Tư vấn Video với Sensei Sato</Link>
</div>
</div>
</div>
<div className="flex items-center gap-space-md mb-space-md p-space-sm bg-bg-soft-red/60 rounded-lg border border-border-base/60">
<div className="flex items-center gap-2 text-text-secondary">
<span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
<span className="font-support-sm text-support-sm">Ngày mai, 14:00</span>
</div>
<div className="flex items-center gap-2 text-text-secondary">
<span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
<span className="font-support-sm text-support-sm">45 min</span>
</div>
</div>
<div className="flex flex-col sm:flex-row items-center justify-between gap-space-md border-t border-border-base pt-space-md">
<div className="flex items-center gap-2 text-text-secondary font-support-sm text-support-sm w-full sm:w-auto bg-surface-container px-3 py-1.5 rounded-md">
<span className="material-symbols-outlined text-[18px] text-warning">lock_clock</span>
                                Sẽ khả dụng trước 5 phút
                            </div>
<div className="flex gap-space-sm w-full sm:w-auto">
<button className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-border-base font-label-xs text-label-xs text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors">Hủy</button>
<button className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-primary text-primary font-label-xs text-label-xs hover:bg-bg-soft-red transition-colors">Đổi lịch</button>
</div>
</div>
</div>
{/*  Card 2: In Progress  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md border border-border-base shadow-[0px_4px_16px_rgba(217,75,104,0.04)] hover:shadow-[0px_8px_24px_rgba(217,75,104,0.1)] hover:border-primary/40 transition-all duration-300 relative overflow-hidden group">
<div className="absolute top-0 left-0 w-1.5 h-full bg-warning"></div>
<div className="flex justify-between items-start mb-space-md">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-warning border border-amber-100">
<span className="material-symbols-outlined">description</span>
</div>
<div>
<span className="inline-block bg-amber-50 text-warning font-label-xs text-label-xs px-2.5 py-0.5 rounded-full mb-1 border border-amber-200">Text Analysis</span>
<h3 className="font-title-sm text-title-sm text-on-surface">Phân tích văn bản: Cách dùng Thể bị động</h3>
</div>
</div>
</div>
<div className="p-space-sm bg-bg-soft-red/40 rounded-lg border border-border-base border-dashed mb-space-md">
<div className="flex justify-between items-center mb-2">
<span className="font-support-sm text-support-sm text-text-secondary">Status: <strong className="text-on-surface font-semibold">Chuyên gia đang xem xét</strong></span>
<span className="material-symbols-outlined text-warning animate-pulse">pending</span>
</div>
<div className="w-full bg-surface-container rounded-full h-1.5 mb-2 overflow-hidden">
<div className="bg-warning h-1.5 rounded-full w-2/3"></div>
</div>
<p className="font-support-sm text-support-sm text-text-secondary text-right">Expected: 24h nữa</p>
</div>
<div className="flex justify-end border-t border-border-base pt-space-md">
<Link to="/consultation-session" className="px-4 py-2 rounded-full border border-border-base font-label-xs text-label-xs text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-surface-container transition-colors inline-flex items-center gap-2">
<span className="material-symbols-outlined text-[16px]">visibility</span>
                                Xem chi tiết
                            </Link>
</div>
</div>
{/*  Card 3: Upcoming  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md border border-border-base shadow-[0px_4px_16px_rgba(217,75,104,0.04)] hover:shadow-[0px_8px_24px_rgba(217,75,104,0.1)] hover:border-primary/40 transition-all duration-300 relative overflow-hidden group">
<div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
<div className="flex justify-between items-start mb-space-md">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-primary">
<span className="material-symbols-outlined">video_camera_front</span>
</div>
<div>
<span className="inline-block bg-bg-soft-red text-primary font-label-xs text-label-xs px-2.5 py-0.5 rounded-full mb-1 border border-border-base">Video Call</span>
<h3 className="font-title-sm text-title-sm text-on-surface">Tư vấn Video với Sensei Yuki</h3>
</div>
</div>
</div>
<div className="flex items-center gap-space-md mb-space-md p-space-sm bg-bg-soft-red/60 rounded-lg border border-border-base/60">
<div className="flex items-center gap-2 text-text-secondary">
<span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
<span className="font-support-sm text-support-sm">Thứ 6, 10:00</span>
</div>
<div className="flex items-center gap-2 text-text-secondary">
<span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
<span className="font-support-sm text-support-sm">30 min</span>
</div>
</div>
<div className="flex flex-col sm:flex-row items-center justify-end gap-space-md border-t border-border-base pt-space-md">
<div className="flex gap-space-sm w-full sm:w-auto">
<button className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-border-base font-label-xs text-label-xs text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors">Hủy</button>
<button className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-primary text-primary font-label-xs text-label-xs hover:bg-bg-soft-red transition-colors">Đổi lịch</button>
</div>
</div>
</div>
</div>
{/*  Side Panel (Bento style widgets)  */}
<div className="lg:col-span-1 flex flex-col gap-space-lg">
{/*  Stats Widget  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md border border-border-base shadow-sm">
<h3 className="font-title-sm text-title-sm text-on-surface mb-space-sm flex items-center justify-between">
<span>Your Progress</span>
<span className="material-symbols-outlined text-primary text-[20px]">insights</span>
</h3>
<div className="flex items-center justify-between bg-bg-soft-red/70 border border-border-base/60 rounded-lg p-space-sm mb-space-sm">
<span className="font-support-sm text-support-sm text-text-secondary">Completed Sessions</span>
<span className="font-headline-md text-headline-md text-primary font-bold">12</span>
</div>
<div className="flex items-center justify-between bg-bg-soft-red/70 border border-border-base/60 rounded-lg p-space-sm">
<span className="font-support-sm text-support-sm text-text-secondary">Pending Reviews</span>
<span className="font-headline-md text-headline-md text-warning font-bold">1</span>
</div>
</div>
{/*  Recommended Consultant  */}
<div className="bg-gradient-to-br from-primary via-primary to-sakura-accent rounded-xl p-space-md shadow-md text-on-primary relative overflow-hidden">
<div className="absolute -right-6 -top-6 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none"></div>
<div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none"></div>
<h3 className="font-title-sm text-title-sm text-white mb-space-md font-semibold relative z-10 flex items-center gap-1.5">
<span>Need extra help?</span>
<span className="text-sm">🌸</span>
</h3>
<div className="flex items-center gap-3 mb-space-md relative z-10">
<img className="w-12 h-12 rounded-full border-2 border-white/80 object-cover shadow-sm" data-alt="A portrait of a professional Japanese language teacher (Sensei) in a modern virtual teaching setup. The teacher is smiling warmly, wearing a neat business casual outfit. The background is a clean, well-lit study room with subtle Japanese cultural elements like a small bonsai or calligraphy art. The lighting is soft and natural, conveying approachability and expertise." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeQs1JxFfsLTtmR-gOF5UoJbHhMNKGkVIRTbhe71GPdYvhqDg2OVZZzIQ29AtMK2S8puC5wcIU61rmjzUi0YW_WTM2hoonhalc1sMGtTQ32ABzquDvz4RgZanhKA44YTm7AmHQIy9H28nxfO5HdfFeg79rJSbJdvIVekEAkhuXAPo98GUF0uyQKaBp__jaorACItBH6jcu_a0rplCRV5YcVO3cGs6ORN0M4vTfM_ddEaGmdTj8WGB68A" />
<div>
<p className="font-support-sm text-support-sm text-white font-semibold">Sensei Tanaka</p>
<p className="font-label-xs text-label-xs text-white/85">JLPT N2 Expert</p>
</div>
</div>
<Link to="/booking-schedule" className="w-full bg-white text-primary font-bold rounded-full py-2 font-label-xs text-label-xs hover:bg-bg-page hover:shadow transition-all relative z-10 text-center inline-block">
    Book a Session
</Link>
</div>
</div>
</div>
</div>
{/*  Footer  */}
<footer className="w-full py-space-xl px-margin-desktop flex flex-col md:flex-row justify-between items-center border-t border-border-base bg-surface-container-high mt-auto">
<div className="font-title-sm text-title-sm font-bold text-primary mb-4 md:mb-0 flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-xl">spa</span>
    RikiPath Consultation
</div>
<div className="flex flex-col md:flex-row gap-space-md items-center text-center">
<a className="font-support-sm text-support-sm text-text-secondary hover:text-primary transition-colors" href="#">Privacy Policy</a>
<a className="font-support-sm text-support-sm text-text-secondary hover:text-primary transition-colors" href="#">Terms of Service</a>
<a className="font-support-sm text-support-sm text-text-secondary hover:text-primary transition-colors" href="#">Payment Guide</a>
<a className="font-support-sm text-support-sm text-text-secondary hover:text-primary transition-colors" href="#">Contact Us</a>
</div>
<div className="font-support-sm text-support-sm text-text-secondary mt-4 md:mt-0 text-center">
    © 2024 RikiPath Japanese Learning. All rights reserved.
</div>
</footer>
</main>


    </div>
  
</LearnerShell>
);
}
