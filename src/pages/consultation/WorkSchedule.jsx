import { ConsultShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function WorkSchedule() {
  const { pathname } = useLocation();
  return (
    <ConsultShell pathname={pathname} breadcrumb="Lịch làm việc">
<div className="bg-surface-canvas text-charcoal antialiased min-h-screen selection:bg-secondary selection:text-primary min-h-screen" data-page="WorkSchedule" data-shell-unified="1">


{/*  Left Sidebar Navigation (Desktop 260px)  */}





{/*  Sticky Topbar Header  */}





{/*  Main Content Layout (Desktop 1440px 12-Column Grid Container)  */}


<main className="lg:ml-0 p-6 lg:p-8 max-w-[1440px] mx-auto">
<p role="status">Mục này chưa có dữ liệu.</p>

{/*  Page Title Bar  */}
<div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<div className="flex items-center gap-2 mb-1">
<h1 className="text-2xl font-bold text-charcoal tracking-tight">Cấu hình Thời gian Tiếp nhận Tư vấn</h1>
<span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success-mint-bg text-success-mint border border-success-mint/30 flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-success-mint animate-pulse"></span>
            Đang hoạt động
          </span>
</div>
<p className="text-xs text-charcoal-muted">—</p>
</div>
{/*  Quick mode selector  */}
<div className="flex items-center gap-1 bg-surface-card p-1 rounded-xl border border-sakura-border shadow-xs">
<button className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#9e2a4b] text-white shadow-xs">Lịch tuần chuẩn</button>
<button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-surface-canvas transition-colors">Theo dõi lịch thực tế (Calendar View)</button>
</div>
</div>
{/*  12-Column Grid Structure  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
{/*  LEFT COLUMN (8 COLS): Schedule Slot Builder & Exceptions  */}
<div className="lg:col-span-8 space-y-6">
{/*  Header Controls & Calendar Sync Card  */}
<div className="bg-surface-card rounded-2xl border border-sakura-border p-5 shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">event_repeat</span>
<h2 className="text-base font-bold text-charcoal">Khung giờ tiếp nhận tư vấn hàng tuần (Weekly Availability)</h2>
</div>
<p className="text-xs text-charcoal-muted mt-0.5 ml-7.5">—</p>
</div>
{/*  Toggle: Google Calendar Sync  */}
<div className="flex items-center gap-3 bg-secondary-subtle/60 px-3.5 py-2 rounded-xl border border-secondary/40">
<div className="flex flex-col text-right">
<span className="text-xs font-bold text-charcoal flex items-center justify-end gap-1">
<span className="material-symbols-outlined text-[16px] text-blue-600">sync</span> Đồng bộ Google Calendar
              </span>
<span className="text-[10px] text-charcoal-muted">Tránh trùng lịch cá nhân</span>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input disabled className="sr-only peer" type="checkbox" />
<div className="w-10 h-5 bg-sakura-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#9e2a4b]"></div>
</label>
</div>
</div>
{/*  Weekly Slot Planner by Day (Mon - Sun)  */}
<div className="bg-surface-card rounded-2xl border border-sakura-border p-6 shadow-card-subtle space-y-5">
<div className="flex items-center justify-between pb-3 border-b border-sakura-border">
<span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">Ngày trong tuần</span>
<span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">Các khung giờ mở đặt hẹn</span>
</div>
{/*  Mon (2 slots)  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-sakura-border/60 hover:bg-surface-canvas/50 p-2 rounded-xl transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input disabled className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-bold text-charcoal">Thứ Hai</span>
</label>
<span className="text-[11px] text-emerald-600 font-medium ml-7 block">—</span>
</div>
<div className="flex-1 space-y-2.5">
{/*  Slot 1  */}
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-surface-canvas px-3 py-1.5 rounded-lg border border-sakura-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<span className="text-[11px] text-charcoal-muted px-2 py-1 bg-surface-canvas rounded border border-sakura-border/70">—</span>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors" title="Xóa khung giờ">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
{/*  Slot 2  */}
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-surface-canvas px-3 py-1.5 rounded-lg border border-sakura-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<span className="text-[11px] text-charcoal-muted px-2 py-1 bg-surface-canvas rounded border border-sakura-border/70">—</span>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors" title="Xóa khung giờ">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
<button className="text-primary hover:text-primary-hover text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm khung giờ</span>
</button>
</div>
</div>
{/*  Tue (With Conflict Warning badge)  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-sakura-border/60 bg-[#FDF2F4] p-3 rounded-xl border border-[#F8D7DC] transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input disabled className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-bold text-charcoal">Thứ Ba</span>
</label>
<span className="text-[11px] text-[#9e2a4b] font-semibold ml-7 block">Cần xử lý</span>
</div>
<div className="flex-1 space-y-2.5">
{/*  Overlapping slot  */}
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-white px-3 py-1.5 rounded-lg border-2 border-[#9e2a4b] shadow-xs">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
{/*  Warning Conflict Badge  */}
<div className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-[#9e2a4b] border border-[#F8D7DC] rounded-lg text-xs font-semibold shadow-xs">
<span className="material-symbols-outlined text-[15px] text-[#9e2a4b]">error</span>
<span>—</span>
</div>
<button className="text-charcoal-muted hover:text-[#9e2a4b] p-1 rounded-md hover:bg-white transition-colors" title="Xóa khung giờ">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
{/*  Suggested fix  */}
<div className="text-[11px] text-charcoal-muted bg-white/80 p-2 rounded-lg border border-[#F8D7DC] flex items-center justify-between">
<span>—</span>
<button className="text-[#9e2a4b] font-bold hover:underline ml-2 whitespace-nowrap">Tự động sửa</button>
</div>
<button className="text-primary hover:text-primary-hover text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm khung giờ</span>
</button>
</div>
</div>
{/*  Wed (Active with Evening Slot)  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-sakura-border/60 hover:bg-surface-canvas/50 p-2 rounded-xl transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input disabled className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-bold text-charcoal">Thứ Tư</span>
</label>
<span className="text-[11px] text-emerald-600 font-medium ml-7 block">—</span>
</div>
<div className="flex-1 space-y-2.5">
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-surface-canvas px-3 py-1.5 rounded-lg border border-sakura-border">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<span className="text-[11px] text-charcoal-muted px-2 py-1 bg-surface-canvas rounded border border-sakura-border/70">Ca chiều</span>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
{/*  Evening consultation slot  */}
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-primary-light/50 px-3 py-1.5 rounded-lg border border-secondary">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<span className="text-[11px] text-primary font-bold px-2 py-1 bg-primary-light rounded border border-secondary/60 flex items-center gap-1">
<span className="material-symbols-outlined text-[13px]">dark_mode</span> Ca tối sinh viên (Phổ biến)
                </span>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
<button className="text-primary hover:text-primary-hover text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm khung giờ</span>
</button>
</div>
</div>
{/*  Thu  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-sakura-border/60 hover:bg-surface-canvas/50 p-2 rounded-xl transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input disabled className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-bold text-charcoal">Thứ Năm</span>
</label>
<span className="text-[11px] text-emerald-600 font-medium ml-7 block">—</span>
</div>
<div className="flex-1 space-y-2.5">
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-surface-canvas px-3 py-1.5 rounded-lg border border-sakura-border">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<span className="text-[11px] text-charcoal-muted px-2 py-1 bg-surface-canvas rounded border border-sakura-border/70">Ca sáng</span>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
<button className="text-primary hover:text-primary-hover text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm khung giờ</span>
</button>
</div>
</div>
{/*  Fri  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-sakura-border/60 hover:bg-surface-canvas/50 p-2 rounded-xl transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input disabled className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-bold text-charcoal">Thứ Sáu</span>
</label>
<span className="text-[11px] text-emerald-600 font-medium ml-7 block">—</span>
</div>
<div className="flex-1 space-y-2.5">
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-surface-canvas px-3 py-1.5 rounded-lg border border-sakura-border">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-surface-canvas px-3 py-1.5 rounded-lg border border-sakura-border">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
<button className="text-primary hover:text-primary-hover text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm khung giờ</span>
</button>
</div>
</div>
{/*  Sat (Weekend with custom slots)  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-sakura-border/60 hover:bg-surface-canvas/50 p-2 rounded-xl transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input disabled className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-bold text-charcoal">Thứ Bảy</span>
</label>
<span className="text-[11px] text-primary font-medium ml-7 block">Cuối tuần</span>
</div>
<div className="flex-1 space-y-2.5">
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-secondary-subtle px-3 py-1.5 rounded-lg border border-secondary/70">
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
<span className="mx-2 text-charcoal-muted text-xs font-medium">đến</span>
<input className="bg-transparent border-0 p-0 text-xs font-semibold text-charcoal focus:ring-0" type="time" value="" readOnly />
</div>
<span className="text-[11px] text-charcoal-muted px-2 py-1 bg-surface-canvas rounded border border-sakura-border/70">Tư vấn chọn trường JLPT</span>
<button className="text-charcoal-muted hover:text-primary p-1 rounded-md hover:bg-primary-light transition-colors">
<span className="material-symbols-outlined text-[18px]">delete_outline</span>
</button>
</div>
<button className="text-primary hover:text-primary-hover text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm khung giờ</span>
</button>
</div>
</div>
{/*  Sun (Inactive/Off)  */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 p-2 rounded-xl bg-surface-canvas/60 opacity-75 border border-dashed border-sakura-border transition-colors">
<div className="w-28 pt-2">
<label className="flex items-center gap-2.5 cursor-pointer">
<input className="rounded border-sakura-border text-[#9e2a4b] focus:ring-[#9e2a4b] h-4.5 w-4.5 accent-[#9e2a4b] cursor-pointer" type="checkbox" />
<span className="text-sm font-semibold text-charcoal-muted">Chủ Nhật</span>
</label>
</div>
<div className="flex-1 pt-2 flex items-center justify-between">
<span className="text-xs text-charcoal-muted italic">Đang tắt nhận lịch (Nghỉ ngơi)</span>
<button className="text-xs text-primary font-semibold hover:underline">Bật nhận lịch ngày này</button>
</div>
</div>
</div>
{/*  Section: Ngày nghỉ & Ngoại lệ (Date Exceptions)  */}
<div className="bg-surface-card rounded-2xl border border-sakura-border p-6 shadow-card-subtle">
<div className="flex items-center justify-between pb-4 border-b border-sakura-border">
<div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">event_busy</span>
<h3 className="text-base font-bold text-charcoal">Ngày nghỉ & Ngoại lệ (Date Exceptions)</h3>
</div>
<p className="text-xs text-charcoal-muted mt-0.5">—</p>
</div>
<button className="px-3 py-1.5 bg-secondary-subtle hover:bg-secondary text-primary hover:text-charcoal font-bold text-xs rounded-lg border border-secondary transition-all flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">add</span>
<span>Thêm ngày ngoại lệ</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
{/*  Exception Item 1  */}
<div className="p-3.5 bg-surface-canvas rounded-xl border border-sakura-border flex items-start justify-between group hover:border-secondary transition-colors">
<div className="flex items-start gap-3">
<div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex flex-col items-center justify-center font-bold text-xs border border-secondary/40">
<span className="text-[9px] uppercase tracking-wider font-semibold">—</span>
<span>—</span>
</div>
<div>
<div className="text-xs font-bold text-charcoal">—</div>
<div className="text-[11px] text-primary font-medium flex items-center gap-1 mt-0.5">
<span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Nghỉ trọn ngày (Nghỉ lễ cá nhân)
                  </div>
</div>
</div>
<button className="text-charcoal-muted hover:text-primary p-1 rounded transition-colors opacity-70 group-hover:opacity-100" title="Xóa ngoại lệ">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
{/*  Exception Item 2  */}
<div className="p-3.5 bg-surface-canvas rounded-xl border border-sakura-border flex items-start justify-between group hover:border-secondary transition-colors">
<div className="flex items-start gap-3">
<div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex flex-col items-center justify-center font-bold text-xs border border-secondary/40">
<span className="text-[9px] uppercase tracking-wider font-semibold">—</span>
<span>—</span>
</div>
<div>
<div className="text-xs font-bold text-charcoal">—</div>
<div className="text-[11px] text-charcoal-muted font-medium flex items-center gap-1 mt-0.5">
<span className="w-1.5 h-1.5 rounded-full bg-primary"></span> —
                  </div>
</div>
</div>
<button className="text-charcoal-muted hover:text-primary p-1 rounded transition-colors opacity-70 group-hover:opacity-100" title="Xóa ngoại lệ">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
</div>
</div>
{/*  RIGHT COLUMN (4 COLS): Session Rules & Capacity Statistics  */}
<div className="lg:col-span-4 space-y-6">
{/*  Card: Quy tắc phiên tư vấn (Session Rules)  */}
<div className="bg-surface-card rounded-2xl border border-sakura-border p-5 shadow-card-subtle">
<div className="flex items-center gap-2 pb-3 border-b border-sakura-border mb-4">
<span className="material-symbols-outlined text-primary text-[20px]">tune</span>
<h3 className="text-sm font-bold text-charcoal">Quy tắc phiên tư vấn (Session Rules)</h3>
</div>
<div className="space-y-4">
{/*  Slot Duration  */}
<div>
<div className="flex justify-between items-center mb-1.5">
<label className="text-xs font-bold text-charcoal">Thời lượng phiên mặc định</label>
<span className="text-[10px] text-primary font-semibold bg-primary-light px-1.5 py-0.2 rounded">Khuyên dùng</span>
</div>
<select className="w-full bg-surface-canvas border border-sakura-border rounded-xl px-3 py-2 text-xs font-semibold text-charcoal focus:border-primary focus:ring-primary focus:bg-white transition-all cursor-pointer">
<option value="30">30 phút (Tư vấn nhanh / Đặt câu hỏi)</option>
<option value="45">45 phút (Định hướng lộ trình & Hồ sơ) ⭐</option>
<option value="60">60 phút (Luyện phỏng vấn chuyên sâu)</option>
</select>
<p className="text-[11px] text-charcoal-muted mt-1">—</p>
</div>
{/*  Buffer Time  */}
<div>
<label className="block text-xs font-bold text-charcoal mb-1.5">Thời gian đệm giữa các phiên (Buffer)</label>
<select className="w-full bg-surface-canvas border border-sakura-border rounded-xl px-3 py-2 text-xs font-semibold text-charcoal focus:border-primary focus:ring-primary focus:bg-white transition-all cursor-pointer">
<option value="0">Không có thời gian đệm</option>
<option value="10">10 phút (Nghỉ ngắn)</option>
<option value="15">15 phút (Ghi chép biên bản & chuẩn bị)</option>
<option value="30">30 phút</option>
</select>
<p className="text-[11px] text-charcoal-muted mt-1">—</p>
</div>
{/*  Max Sessions per Day  */}
<div className="pt-2 border-t border-sakura-border/60">
<div className="flex justify-between items-center mb-1.5">
<label className="text-xs font-bold text-charcoal">Giới hạn số phiên tối đa / ngày</label>
<span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-secondary-subtle">—</span>
</div>
<input className="w-full accent-[#9e2a4b] h-1.5 bg-sakura-border rounded-lg cursor-pointer" max="10" min="2" type="range" value="" readOnly />
<div className="flex justify-between text-[10px] text-charcoal-muted mt-1">
<span>—</span>
<span>—</span>
<span>—</span>
</div>
</div>
{/*  Minimum booking notice  */}
<div>
<label className="block text-xs font-bold text-charcoal mb-1.5">Thời hạn đặt trước tối thiểu</label>
<div className="flex items-center gap-2">
<div className="relative flex-1">
<input className="w-full bg-surface-canvas border border-sakura-border rounded-xl px-3 py-2 text-xs font-semibold text-charcoal focus:border-primary focus:ring-primary" type="number" value="" readOnly />
<span className="absolute right-3 top-2 text-xs text-charcoal-muted font-medium">giờ</span>
</div>
<span className="text-xs text-charcoal-muted whitespace-nowrap">trước buổi hẹn</span>
</div>
<p className="text-[11px] text-charcoal-muted mt-1">—</p>
</div>
</div>
</div>
{/*  Card: Thống kê công suất tuần này (Capacity Widget)  */}
<div className="bg-surface-card rounded-2xl border border-sakura-border p-5 shadow-card-subtle">
<div className="flex items-center justify-between pb-3 border-b border-sakura-border mb-3">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
<h3 className="text-sm font-bold text-charcoal">Công suất tuần này</h3>
</div>
<span className="text-xs font-bold text-[#9e2a4b]">—</span>
</div>
{/*  Progress bar  */}
<div className="space-y-2">
<div className="flex justify-between text-xs">
<span className="text-charcoal-muted">Slot đã được đặt</span>
<span className="font-bold text-charcoal">—</span>
</div>
<div className="w-full h-3 bg-surface-canvas rounded-full overflow-hidden p-0.5 border border-sakura-border">
<div className="h-full bg-gradient-to-r from-secondary to-[#9e2a4b] rounded-full" style={{ width: "0%" }}></div>
</div>
<div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-1">
<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#9e2a4b]"></span> —</span>
<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sakura-border"></span> —</span>
</div>
</div>
{/*  Weekly highlight note  */}
<div className="mt-4 p-3 bg-secondary-subtle/50 rounded-xl border border-secondary/40 flex items-start gap-2.5">
<span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">trending_up</span>
<p className="text-[11px] text-charcoal leading-relaxed">—</p>
</div>
</div>
{/*  Card: Hướng dẫn chuyên gia (Advisor Best Practices)  */}
<div className="bg-surface-card rounded-2xl border border-sakura-border p-5 shadow-card-subtle">
<div className="flex items-center gap-2 pb-3 border-b border-sakura-border mb-3">
<span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
<h3 className="text-sm font-bold text-charcoal">Mẹo tối ưu lịch cố vấn</h3>
</div>
<ul className="space-y-2.5 text-xs text-charcoal-muted">
<li className="flex items-start gap-2">
<span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
<span><b className="text-charcoal">Duy trì cố định:</b> —</span>
</li>
<li className="flex items-start gap-2">
<span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
<span><b className="text-charcoal">Nghỉ giữa giờ:</b> —</span>
</li>
<li className="flex items-start gap-2">
<span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
<span><b className="text-charcoal">Khung giờ vàng:</b> —</span>
</li>
</ul>
<a className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-4" href="#">
<span>—</span>
<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</a>
</div>
</div>
</div>
</main>


{/*  Sticky Quick Action Bar on Mobile / Tablet  */}


<div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface-card border-t border-sakura-border flex items-center justify-between z-40 shadow-lg">
<div className="text-xs text-charcoal-muted">
<span className="font-bold text-charcoal">—</span> —
    </div>
<div className="flex gap-2">
<button className="px-3 py-1.5 text-xs border border-sakura-border rounded-lg">Hủy</button>
<button className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#9e2a4b] rounded-lg shadow-sm">Lưu lịch</button>
</div>
</div>


{/*  Subtle Footer  */}


<footer className="lg:ml-0 py-6 px-8 border-t border-sakura-border mt-12 bg-surface-canvas text-xs text-charcoal-muted flex flex-col sm:flex-row items-center justify-between gap-4">
<div className="flex items-center gap-2">
<span className="font-bold text-primary">RikiPath</span>
<span>—</span>
</div>
<div className="flex items-center gap-6">
<a className="hover:text-primary transition-colors" href="#">Trung tâm Hỗ trợ</a>
<a className="hover:text-primary transition-colors" href="#">Quy chuẩn Dịch vụ</a>
<a className="hover:text-primary transition-colors" href="#">Chính sách bảo mật</a>
<span className="text-[11px] px-2 py-0.5 rounded bg-sakura-border/60 text-charcoal">—</span>
</div>
</footer>


    </div>

</ConsultShell>
);
}
