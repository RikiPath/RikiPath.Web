import { ConsultShell } from '../../components/shells';
import { Link, useLocation } from 'react-router-dom';
export default function ConsultationPrep() {
  const { pathname } = useLocation();


  return (
    <ConsultShell pathname={pathname} breadcrumb="Chuẩn bị buổi">
<div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen" data-page="ConsultationPrep" data-shell-unified="1">

<div className="pl-0 min-h-screen flex flex-col"><main className="w-full max-w-grid-max-width mx-auto px-space-32 pt-0 flex-1 bg-surface">
<p role="status">Mục này chưa có dữ liệu.</p>
<div className="flex flex-col w-full pb-space-48">
<div className="w-full flex flex-col gap-space-20 mb-space-32">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="hover:text-primary transition-colors cursor-pointer">Cố vấn</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="hover:text-primary transition-colors cursor-pointer">Phiên sắp tới</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="text-primary font-label-md text-label-md bg-secondary-tint px-space-8 py-0.5 rounded-full">—</span>
</div>
<div className="flex items-center gap-space-12 font-body-sm text-body-sm text-on-surface-variant">
<span className="flex items-center gap-space-4">
<span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
          —
        </span>
<span className="w-1 h-1 rounded-full bg-outline-variant"></span>
<span className="font-label-md text-label-md text-text-charcoal font-mono" id="live-clock">—</span>
</div>
</div>
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-16 bg-surface-card p-space-24 rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)]">
<div className="flex flex-col gap-space-8">
<div className="flex items-center gap-space-12 flex-wrap">
<h1 className="font-headline-lg text-headline-lg text-text-charcoal tracking-tight">Phòng Chuẩn bị Phiên Tư vấn Trực tuyến</h1>
<div className="flex items-center gap-space-8 px-space-12 py-1 rounded-full bg-secondary-tint shadow-sm">
<span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
<span className="font-label-xs text-label-xs text-primary uppercase tracking-wider">—</span>
</div>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">—</p>
</div>
<div className="flex items-center gap-space-12 shrink-0">
<button className="h-10 px-space-16 rounded-lg bg-secondary-tint hover:bg-secondary-fixed transition-all duration-200 text-primary font-label-md text-label-md flex items-center gap-space-8 shadow-sm hover:shadow" id="av-test-btn">
<span className="material-symbols-outlined text-[20px]">tune</span>
<span>Kiểm tra Micro & Camera</span>
</button>
<Link to="/consultation-room" className="h-10 px-space-20 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-md text-label-md flex items-center gap-space-8 shadow-md hover:shadow-lg transition-all duration-200">
<span className="material-symbols-outlined text-[20px]">video_call</span>
<span>Vào phòng tư vấn ngay (Launch Room)</span>
</Link>
</div>
</div>
</div>
<div className="grid grid-cols-12 gap-gutter">
<div className="col-span-12 lg:col-span-4 flex flex-col gap-space-24">
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20 relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary-tint/50 pointer-events-none blur-xl"></div>
<div className="flex items-start gap-space-16 relative">
<div className="relative shrink-0">
<img className="w-16 h-16 rounded-xl object-cover shadow-sm" data-alt="Chân dung học viên nam người Việt Nam độ tuổi 23, đeo kính cận hiện đại, nụ cười tự tin, mặc sơ mi thanh lịch trong thư viện ánh sáng tự nhiên dịu nhẹ phong cách Nhật Bản tối giản"   src="/empty-avatar.svg" />
<span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-tertiary flex items-center justify-center text-on-primary text-[11px] shadow-sm font-label-xs">✓</span>
</div>
<div className="flex flex-col min-w-0 flex-1">
<div className="flex items-center justify-between gap-space-8">
<span className="font-headline-sm text-headline-sm text-text-charcoal truncate">—</span>
<span className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-space-8 py-0.5 rounded-full">—</span>
</div>
<span className="font-body-sm text-body-sm text-primary font-semibold mt-0.5">—</span>
<div className="flex items-center gap-space-8 mt-space-8">
<div className="px-space-8 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-xs text-label-xs">
                —
              </div>
<div className="px-space-8 py-0.5 rounded-full bg-secondary-tint text-primary font-label-xs text-label-xs">
                —
              </div>
</div>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-12 shadow-sm">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 text-text-charcoal font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
<span>—</span>
</div>
<span className="font-label-xs text-label-xs text-primary bg-secondary-fixed px-space-8 py-0.5 rounded-full">—</span>
</div>
<div className="text-display-sm font-display-sm text-text-charcoal tracking-tight">—</div>
<div className="pt-space-8 flex items-center justify-between">
<div className="flex items-center gap-space-6 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[16px] text-primary">videocam</span>
<span>—</span>
</div>
<button className="text-primary hover:text-primary-hover font-label-xs text-label-xs flex items-center gap-space-4 hover:underline" onClick={() => window.alert('Mục này chưa có dữ liệu.')}>
<span className="material-symbols-outlined text-[14px]">content_copy</span>
<span>Sao chép link</span>
</button>
</div>
</div>
<div className="flex flex-col gap-space-8">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs tracking-wider uppercase text-on-surface-variant">Quyền truy cập học bạ số</span>
<span className="font-label-xs text-label-xs text-tertiary bg-tertiary-fixed/30 px-space-8 py-0.5 rounded-full flex items-center gap-space-4">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              Đã ủy quyền
            </span>
</div>
<div className="flex items-center justify-between p-space-12 rounded-lg bg-surface-container-lowest shadow-sm">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-[20px] text-tertiary">verified_user</span>
<span className="font-body-sm text-body-sm text-text-charcoal">Thời hạn phân tích chi tiết</span>
</div>
<span className="font-label-md text-label-md text-primary font-mono">—</span>
</div>
</div>
<div className="flex flex-col gap-space-8">
<div className="flex items-center gap-space-8 text-text-charcoal font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary">help_outline</span>
<span>Câu hỏi trọng tâm từ học viên</span>
</div>
<div className="p-space-16 rounded-xl bg-secondary-tint/60 text-text-charcoal font-body-md text-body-md leading-relaxed relative shadow-sm">
<span className="material-symbols-outlined absolute top-2 right-2 text-primary/20 text-[32px] pointer-events-none">format_quote</span>
<p className="relative z-10 italic">—</p>
</div>
</div>
<div className="flex flex-col gap-space-12 pt-space-8">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs tracking-wider uppercase text-on-surface-variant">Lịch sử tư vấn gần nhất</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
</div>
<div className="p-space-12 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between">
<div className="flex flex-col gap-space-2">
<span className="font-label-md text-label-md text-text-charcoal">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
<div className="flex items-center gap-space-4 px-space-8 py-1 rounded-full bg-surface-card shadow-sm">
<span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="font-label-xs text-label-xs text-text-charcoal font-bold">—</span>
</div>
</div>
</div>
</div>
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<span className="font-headline-sm text-headline-sm text-text-charcoal">Thiết bị & Môi trường</span>
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
            Tối ưu
          </span>
</div>
<div className="space-y-space-12">
<div className="flex items-center justify-between p-space-8 rounded-lg bg-surface-container-low">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">mic</span>
<span>MacBook Pro Microphone</span>
</div>
<div className="flex items-center gap-space-2">
<span className="w-1 h-3 bg-tertiary rounded-full animate-pulse"></span>
<span className="w-1 h-4 bg-tertiary rounded-full animate-pulse"></span>
<span className="w-1 h-2 bg-tertiary rounded-full animate-pulse"></span>
</div>
</div>
<div className="flex items-center justify-between p-space-8 rounded-lg bg-surface-container-low">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">videocam</span>
<span>—</span>
</div>
<span className="font-label-xs text-label-xs text-tertiary font-medium">—</span>
</div>
<div className="flex items-center justify-between p-space-8 rounded-lg bg-surface-container-low">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">speed</span>
<span>Băng thông mạng cố định</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal font-mono">—</span>
</div>
</div>
</div>
</div>
<div className="col-span-12 lg:col-span-8 flex flex-col gap-space-24">
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-12">
<div className="flex items-center gap-space-12">
<div className="w-10 h-10 rounded-xl bg-secondary-tint flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">analytics</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Báo cáo phân tích năng lực học viên trước phiên</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
</div>
<div className="flex items-center gap-space-8 bg-surface-container px-space-12 py-space-8 rounded-xl self-start sm:self-auto">
<span className="font-body-sm text-body-sm text-on-surface-variant">Tổng điểm:</span>
<span className="font-headline-sm text-headline-sm text-text-charcoal font-bold">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-12">
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<span>Từ vựng (Goi)</span>
<span className="font-mono">—</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-text-charcoal">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
<div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant">Mức ổn định</span>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<span>Ngữ pháp (Bunpo)</span>
<span className="font-mono">—</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-text-charcoal">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
<div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-secondary rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant">Cần củng cố liên từ</span>
</div>
<div className="p-space-16 rounded-xl bg-error-container/40 flex flex-col gap-space-8 relative overflow-hidden">
<div className="flex items-center justify-between text-error font-label-md text-label-md">
<span>Đọc hiểu (Dokkai)</span>
<span className="material-symbols-outlined text-[16px] text-error animate-bounce">warning</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-error font-bold">—</span>
<span className="font-body-sm text-body-sm text-error/80">—</span>
</div>
<div className="w-full h-2 bg-error-container rounded-full overflow-hidden">
<div className="h-full bg-error rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-error font-bold tracking-wide uppercase">—</span>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<span>Nghe hiểu (Choukai)</span>
<span className="font-mono">—</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-text-charcoal">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
<div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-12">
<div className="flex items-center gap-space-8 text-text-charcoal font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
<span>—</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-12">
<div className="p-space-12 rounded-lg bg-surface-card flex flex-col gap-space-4 shadow-sm">
<div className="flex items-center gap-space-6 text-error font-label-xs text-label-xs">
<span className="w-2 h-2 rounded-full bg-error"></span>
<span>—</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Nhầm lẫn đại từ chỉ thị</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">—</p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card flex flex-col gap-space-4 shadow-sm">
<div className="flex items-center gap-space-6 text-primary font-label-xs text-label-xs">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span>—</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">—</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">—</p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card flex flex-col gap-space-4 shadow-sm">
<div className="flex items-center gap-space-6 text-secondary font-label-xs text-label-xs">
<span className="w-2 h-2 rounded-full bg-secondary"></span>
<span>—</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Bẫy liên từ nối phức tạp</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">—</p>
</div>
</div>
</div>
</div>
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-12">
<div className="flex items-center gap-space-12">
<div className="w-10 h-10 rounded-xl bg-secondary-tint flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">collections_bookmark</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Bộ giáo án gợi ý & Tài liệu đính kèm cho phiên này</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
</div>
<button className="h-9 px-space-12 rounded-lg bg-secondary-tint hover:bg-secondary-fixed text-primary font-label-md text-label-md flex items-center gap-space-6 transition-colors shadow-sm self-start sm:self-auto" id="add-material-btn">
<span className="material-symbols-outlined text-[18px]">add_circle</span>
<span>Thêm học liệu từ Thư viện Riki</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-16">
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-16 hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-12">
<div className="flex items-start justify-between">
<div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
</div>
<span className="font-label-xs text-label-xs bg-surface-card px-space-8 py-0.5 rounded-full text-on-surface-variant shadow-sm">—</span>
</div>
<div className="flex flex-col gap-space-4">
<span className="font-label-md text-label-md text-text-charcoal group-hover:text-primary transition-colors">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
</div>
<div className="flex items-center justify-between pt-space-8">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="material-symbols-outlined text-[14px]">check_circle</span>—</span>
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-16 hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-12">
<div className="flex items-start justify-between">
<div className="w-10 h-10 rounded-lg bg-secondary-tint flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-[22px]">assignment</span>
</div>
<span className="font-label-xs text-label-xs bg-surface-card px-space-8 py-0.5 rounded-full text-on-surface-variant shadow-sm">—</span>
</div>
<div className="flex flex-col gap-space-4">
<span className="font-label-md text-label-md text-text-charcoal group-hover:text-primary transition-colors">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
</div>
<div className="flex items-center justify-between pt-space-8">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="material-symbols-outlined text-[14px]">check_circle</span>—</span>
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-16 hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-12">
<div className="flex items-start justify-between">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[22px]">timer</span>
</div>
<span className="font-label-xs text-label-xs bg-surface-card px-space-8 py-0.5 rounded-full text-on-surface-variant shadow-sm">Cheat-sheet</span>
</div>
<div className="flex flex-col gap-space-4">
<span className="font-label-md text-label-md text-text-charcoal group-hover:text-primary transition-colors">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
</div>
<div className="flex items-center justify-between pt-space-8">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="material-symbols-outlined text-[14px]">check_circle</span>—</span>
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
</div>
</div>
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-12">
<div className="w-10 h-10 rounded-xl bg-secondary-tint flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">edit_document</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Khung soạn thảo Biên bản tư vấn & Lộ trình hành động (Action Plan)</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-space-8 py-1 rounded-full">
            Tự động lưu nháp
          </span>
</div>
<div className="p-space-16 rounded-xl bg-secondary-tint/40 flex flex-col gap-space-12">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 text-primary font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
<span>—</span>
</div>
<button className="font-label-xs text-label-xs text-primary hover:underline flex items-center gap-space-4" id="insert-plan-btn">
<span className="material-symbols-outlined text-[14px]">add_box</span>
<span>Chèn toàn bộ vào biên bản</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-12">
<div className="p-space-12 rounded-lg bg-surface-card shadow-sm flex flex-col gap-space-4">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs text-primary font-bold">—</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">—</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card shadow-sm flex flex-col gap-space-4">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs text-primary font-bold">—</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">—</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card shadow-sm flex flex-col gap-space-4">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs text-primary font-bold">—</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Thi thử trọn đề bấm giờ</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
</div>
</div>
<div className="flex flex-col gap-space-8">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-text-charcoal">—</span>
<div className="flex items-center gap-space-4">
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" onClick={() => window.alert('Mục này chưa có dữ liệu.')} type="button">
<span className="material-symbols-outlined text-[18px]">format_bold</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" onClick={() => window.alert('Mục này chưa có dữ liệu.')} type="button">
<span className="material-symbols-outlined text-[18px]">format_italic</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" onClick={() => window.alert('Mục này chưa có dữ liệu.')} type="button">
<span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
</button>
</div>
</div>
<div className="w-full min-h-[140px] p-space-16 rounded-xl bg-surface-container-low text-text-charcoal font-body-md text-body-md leading-relaxed focus:outline-none focus:ring-2 focus:ring-focus-ring focus:bg-surface-card transition-all" contentEditable={false} id="sensei-notes">
—</div>
</div>
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-16 pt-space-12">
<label className="flex items-center gap-space-12 cursor-pointer select-none">
<input disabled className="w-4 h-4 rounded text-primary focus:ring-focus-ring accent-primary" id="auto-email-checkbox" type="checkbox" />
<span className="font-body-sm text-body-sm text-text-charcoal">
              —
            </span>
</label>
<div className="flex items-center gap-space-12 self-end sm:self-auto">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4" id="save-status">
<span className="material-symbols-outlined text-[16px]">cloud_done</span>
              Đã đồng bộ nháp
            </span>
<button className="h-10 px-space-16 rounded-lg bg-surface-container hover:bg-surface-container-high active:bg-surface-container-highest text-text-charcoal font-label-md text-label-md transition-colors flex items-center gap-space-8" id="save-draft-btn">
<span className="material-symbols-outlined text-[18px]">save</span>
<span>Lưu bản nháp ghi chú</span>
</button>
</div>
</div>
</div>
</div>
</div>
<div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200" id="device-modal">
<div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-xl p-space-24 flex flex-col gap-space-20 transform scale-95 transition-transform duration-200" id="modal-container">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[24px]">tune</span>
<span className="font-headline-sm text-headline-sm text-text-charcoal">Kiểm tra Micro & Camera</span>
</div>
<button className="text-on-surface-variant hover:text-text-charcoal p-1 rounded-lg hover:bg-surface-container" id="close-modal-btn">
<span className="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
<div className="aspect-video w-full rounded-xl bg-surface-container-high relative overflow-hidden flex items-center justify-center">
<img className="w-full h-full object-cover" data-alt="Hình ảnh thử nghiệm webcam trực tuyến độ nét cao, góc quay chân dung của chuyên gia cố vấn Nhật Bản trong phòng làm việc ấm cúng"   src="/empty-avatar.svg" />
<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-inverse-surface/70 backdrop-blur-md px-space-12 py-space-8 rounded-lg text-on-primary">
<div className="flex items-center gap-space-8">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
<span className="font-label-xs text-label-xs">—</span>
</div>
<div className="flex items-center gap-space-4">
<span className="w-1 h-3 bg-tertiary rounded-full animate-bounce"></span>
<span className="w-1 h-5 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
<span className="w-1 h-4 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
</div>
</div>
</div>
<div className="flex flex-col gap-space-12">
<div className="flex flex-col gap-space-4">
<label className="font-label-xs text-label-xs uppercase text-on-surface-variant">Chọn Camera</label>
<select className="h-10 px-space-12 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-text-charcoal focus:outline-none focus:ring-2 focus:ring-focus-ring">
<option>FaceTime HD Camera (Tích hợp)</option>
<option>Logitech StreamCam 4K (USB-C)</option>
</select>
</div>
<div className="flex flex-col gap-space-4">
<label className="font-label-xs text-label-xs uppercase text-on-surface-variant">Chọn Microphone</label>
<select className="h-10 px-space-12 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-text-charcoal focus:outline-none focus:ring-2 focus:ring-focus-ring">
<option>MacBook Pro Microphone Array</option>
<option>Shure MV7 USB Podcast Mic</option>
</select>
</div>
</div>
<div className="flex justify-end gap-space-12 pt-space-8">
<button className="h-10 px-space-20 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-hover transition-colors" id="confirm-modal-btn">
          Xác nhận thiết bị đã sẵn sàng
        </button>
</div>
</div>
</div>
<div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-on-primary px-space-16 py-space-12 rounded-xl shadow-lg flex items-center gap-space-12 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none" id="toast-notify">
<span className="material-symbols-outlined text-[20px] text-tertiary">check_circle</span>
<span className="font-body-sm text-body-sm" id="toast-text">—</span>
</div>
</div>
</main></div>
    </div>

</ConsultShell>
);
}
