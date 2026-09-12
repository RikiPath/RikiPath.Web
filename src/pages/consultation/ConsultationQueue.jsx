import { Link, useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
export default function ConsultationQueue() {
  const { pathname } = useLocation();
  return (
    <ConsultShell pathname={pathname} breadcrumb="Hàng đợi">
<div className="bg-canvas text-text-charcoal min-h-screen flex overflow-x-hidden antialiased text-[13px] min-h-screen" data-page="ConsultationQueue" data-shell-unified="1">


{/*  SIDEBAR (Persistent Left Sidebar - Consultant Portal)  */}





{/*  MAIN WRAPPER (1440px desktop view container)  */}


<div className="flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0">
{/*  TOP NAVIGATION BAR (Sticky)  */}

{/*  MAIN SCROLLABLE CONTENT (12-column Grid, High density desktop)  */}
<main className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
{/*  PAGE HEADER  */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
<div>
<div className="flex items-center gap-3">
<h1 className="text-[22px] font-bold text-text-charcoal tracking-tight">Hàng đợi Yêu cầu Tư vấn & Thẩm định</h1>
<span className="bg-[#FDF2F4] text-[#9e2a4b] border border-[#F8D7DC] font-bold text-[11px] px-2.5 py-0.5 rounded-full">{"Ca trực chiều\n            "}</span>
</div>
<p className="text-[13px] text-text-muted mt-0.5">Quản lý các yêu cầu tư vấn 1-on-1 và giải đáp văn bản từ học viên JLPT theo thời gian thực</p>
</div>
{/*  Actions Buttons  */}
<div className="flex items-center gap-2.5">
<button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-soft bg-surface-pure hover:bg-canvas text-text-charcoal font-semibold text-[12px] shadow-sm transition-all duration-150">
<span className="material-symbols-outlined text-[17px] text-text-muted">file_download</span>
<span>Xuất danh sách Excel</span>
</button>
<button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#9e2a4b] hover:bg-[#85203d] text-white font-semibold text-[12px] shadow-sakura-btn transition-all duration-150">
<span className="material-symbols-outlined text-[17px]">auto_awesome</span>
<span>Tự động phân bổ AI</span>
</button>
</div>
</div>
{/*  QUICK METRICS ROW (4 Metric Cards - Neo-Sakura styling)  */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
{/*  Card 1  */}
<div className="bg-surface-pure border border-border-soft rounded-xl p-3.5 shadow-sakura-card flex items-center justify-between hover:border-[#9e2a4b]/40 transition-all">
<div>
<p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Tổng yêu cầu chờ</p>
<div className="flex items-baseline gap-2 mt-1">
<span className="text-[24px] font-extrabold text-text-charcoal leading-none">12</span>
<span className="text-[12px] text-text-muted font-medium">yêu cầu</span>
</div>
<p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
<span className="text-emerald-600 font-bold">+3 mới</span>{" trong 30 phút qua\n            "}</p>
</div>
<div className="w-11 h-11 rounded-xl bg-[#FDF2F4] border border-[#F8D7DC] flex items-center justify-center text-[#9e2a4b]">
<span className="material-symbols-outlined text-[24px]">pending_actions</span>
</div>
</div>
{/*  Card 2: Urgent  */}
<div className="bg-[#FDF2F4] border border-[#F8D7DC] rounded-xl p-3.5 shadow-sakura-card flex items-center justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 transform translate-x-3 -translate-y-2 w-16 h-16 bg-[#b83256]/10 rounded-full blur-sm pointer-events-none"></div>
<div>
<div className="flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#9e2a4b] animate-ping"></span>
<p className="text-[11px] font-bold text-[#9e2a4b] uppercase tracking-wider">{"Khẩn cấp < 2 giờ"}</p>
</div>
<div className="flex items-baseline gap-2 mt-1">
<span className="text-[24px] font-extrabold text-[#9e2a4b] leading-none">03</span>
<span className="text-[12px] text-[#9e2a4b]/80 font-medium">yêu cầu ưu tiên</span>
</div>
<p className="text-[11px] text-[#9e2a4b] font-semibold mt-1">Cần phản hồi hoặc tiếp nhận ngay</p>
</div>
<div className="w-11 h-11 rounded-xl bg-white border border-[#F8D7DC] flex items-center justify-center text-[#9e2a4b] shadow-sm">
<span className="material-symbols-outlined text-[24px]">timer</span>
</div>
</div>
{/*  Card 3  */}
<div className="bg-surface-pure border border-border-soft rounded-xl p-3.5 shadow-sakura-card flex items-center justify-between hover:border-[#9e2a4b]/40 transition-all">
<div>
<p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Tư vấn Video Call</p>
<div className="flex items-baseline gap-2 mt-1">
<span className="text-[24px] font-extrabold text-text-charcoal leading-none">07</span>
<span className="text-[12px] text-text-muted font-medium">phiên 1-on-1</span>
</div>
<p className="text-[11px] text-info-blue font-medium mt-1">Khung giờ: 14:00 - 21:30</p>
</div>
<div className="w-11 h-11 rounded-xl bg-info-bg border border-blue-100 flex items-center justify-center text-info-blue">
<span className="material-symbols-outlined text-[24px]">videocam</span>
</div>
</div>
{/*  Card 4  */}
<div className="bg-surface-pure border border-border-soft rounded-xl p-3.5 shadow-sakura-card flex items-center justify-between hover:border-[#9e2a4b]/40 transition-all">
<div>
<p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Giải đáp Văn bản</p>
<div className="flex items-baseline gap-2 mt-1">
<span className="text-[24px] font-extrabold text-text-charcoal leading-none">05</span>
<span className="text-[12px] text-text-muted font-medium">phiếu bài tập/luận</span>
</div>
<p className="text-[11px] text-text-muted mt-1">Đính kèm Mock-test & SRS</p>
</div>
<div className="w-11 h-11 rounded-xl bg-[#FDF2F4] border border-[#F8D7DC] flex items-center justify-center text-[#9e2a4b]">
<span className="material-symbols-outlined text-[24px]">rate_review</span>
</div>
</div>
</div>
{/*  ADVANCED MULTI-FILTER & SEARCH BAR  */}
<div className="bg-surface-pure border border-border-soft rounded-xl p-3 shadow-sakura-card space-y-2.5">
<div className="flex flex-wrap items-center justify-between gap-3">
{/*  Segmented Filter Tabs  */}
<div className="inline-flex p-1 bg-canvas rounded-lg border border-border-subtle">
<button className="px-3 py-1.5 rounded-md text-[12px] font-bold bg-[#FDF2F4] text-[#9e2a4b] border border-[#F8D7DC] shadow-sm flex items-center gap-1.5 transition-all">
<span>Tất cả</span>
<span className="bg-[#9e2a4b] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">12</span>
</button>
<button className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-text-muted hover:text-text-charcoal flex items-center gap-1.5 transition-all">
<span className="material-symbols-outlined text-[15px]">videocam</span>
<span>Video 1-on-1</span>
<span className="bg-white/80 text-text-muted text-[10px] px-1.5 py-0.2 rounded-full">7</span>
</button>
<button className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-text-muted hover:text-text-charcoal flex items-center gap-1.5 transition-all">
<span className="material-symbols-outlined text-[15px]">description</span>
<span>Phiếu văn bản</span>
<span className="bg-white/80 text-text-muted text-[10px] px-1.5 py-0.2 rounded-full">5</span>
</button>
<button className="px-3 py-1.5 rounded-md text-[12px] font-bold text-[#9e2a4b] hover:bg-[#FDF2F4] flex items-center gap-1.5 transition-all">
<span className="material-symbols-outlined text-[15px] filled text-[#9e2a4b]">emergency_heat</span>
<span>{"Khẩn cấp < 2h"}</span>
<span className="bg-[#FDF2F4] border border-[#F8D7DC] text-[#9e2a4b] text-[10px] px-1.5 py-0.2 rounded-full font-bold">3</span>
</button>
</div>
{/*  Dropdowns & Sorting  */}
<div className="flex items-center gap-2.5 flex-wrap">
{/*  JLPT Filter  */}
<div className="flex items-center gap-1 bg-canvas px-2.5 py-1 rounded-lg border border-border-soft">
<span className="text-[11px] font-bold text-text-muted uppercase">JLPT:</span>
<select className="bg-transparent text-[12px] font-semibold text-text-charcoal border-none p-0 pr-4 focus:ring-0 cursor-pointer">
<option>Tất cả trình độ</option>
<option>Cấp độ N1</option>
<option selected>Cấp độ N2</option>
<option>Cấp độ N3</option>
<option>Cấp độ N4</option>
</select>
</div>
{/*  Deadline Filter  */}
<div className="flex items-center gap-1 bg-canvas px-2.5 py-1 rounded-lg border border-border-soft">
<span className="text-[11px] font-bold text-text-muted uppercase">Hạn xử lý:</span>
<select className="bg-transparent text-[12px] font-semibold text-text-charcoal border-none p-0 pr-4 focus:ring-0 cursor-pointer">
<option selected>Sắp hết hạn trước</option>
<option>{"Trong hôm nay (< 6h)"}</option>
<option>Ngày mai</option>
<option>Tất cả hạn</option>
</select>
</div>
{/*  Sort By  */}
<div className="flex items-center gap-1 bg-canvas px-2.5 py-1 rounded-lg border border-border-soft">
<span className="text-[11px] font-bold text-text-muted uppercase">Sắp xếp:</span>
<select className="bg-transparent text-[12px] font-semibold text-text-charcoal border-none p-0 pr-4 focus:ring-0 cursor-pointer">
<option selected>Thời gian gửi (Mới nhất)</option>
<option>Ưu tiên khẩn cấp</option>
<option>Điểm mock-test thấp</option>
</select>
</div>
<button className="p-1.5 text-text-muted hover:text-[#9e2a4b] border border-border-soft rounded-lg hover:bg-canvas transition-colors" title="Đặt lại bộ lọc">
<span className="material-symbols-outlined text-[18px]">restart_alt</span>
</button>
</div>
</div>
</div>
{/*  COMPREHENSIVE CONSULTATION REQUESTS TABLE (12-column Data Density)  */}
<div className="bg-surface-pure border border-border-soft rounded-xl shadow-sakura-card overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-canvas border-b border-border-soft text-[11px] uppercase tracking-wider text-text-muted font-bold select-none">
<th className="py-3 px-3 w-10 text-center">
<input className="rounded border-border-soft text-[#9e2a4b] focus:ring-[#9e2a4b] w-4 h-4 cursor-pointer" type="checkbox" />
</th>
<th className="py-3 px-3 w-[200px]">Học viên & Mã số</th>
<th className="py-3 px-3 w-[140px]">Loại yêu cầu</th>
<th className="py-3 px-3 w-[260px]">Chủ đề & Trọng tâm</th>
<th className="py-3 px-3 w-[250px]">Dữ liệu chia sẻ đính kèm</th>
<th className="py-3 px-3 w-[140px]">Hạn phản hồi</th>
<th className="py-3 px-3 w-[120px]">Trạng thái</th>
<th className="py-3 px-4 w-[210px] text-right">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-border-subtle text-[12px]">
{/*  ROW 1 (Urgent - Video - Selected example)  */}
<tr className="hover:bg-[#FDF2F4]/40 transition-colors bg-[#FDF2F4]/20 group">
<td className="py-3 px-3 text-center">
<input checked className="rounded border-border-soft text-[#9e2a4b] focus:ring-[#9e2a4b] w-4 h-4 cursor-pointer" type="checkbox" />
</td>
<td className="py-3 px-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-full bg-[#F8D7DC] text-[#9e2a4b] font-bold flex items-center justify-center text-[12px] flex-shrink-0">{"VA\n                    "}</div>
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-text-charcoal truncate">Nguyễn Văn A</span>
<span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-red-100 text-red-700">N2</span>
</div>
<p className="text-[11px] text-text-muted font-mono">ID: #88291 • Mục tiêu 130+</p>
</div>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info-bg text-info-blue font-semibold text-[11px]">
<span className="material-symbols-outlined text-[15px]">videocam</span>
<span>Video 1-on-1</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Thời lượng: 30 phút</p>
</td>
<td className="py-3 px-3">
<p className="font-bold text-text-charcoal leading-snug">Kỹ năng Đọc hiểu Dokkai dài N2</p>
<p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">Thường bị thiếu 15 phút, khó phân tích câu đa mệnh đề.</p>
</td>
<td className="py-3 px-3">
<div className="flex flex-wrap gap-1.5">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-[#9e2a4b]">fact_check</span>{"Mock-test N2 #04 (115/180)\n                    "}</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-emerald-600">psychology</span>{"SRS 145 từ\n                    "}</span>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] bg-[#FDF2F4] text-[#9e2a4b] border border-[#F8D7DC] animate-pulse">
<span className="material-symbols-outlined text-[13px]">alarm</span>
<span>Còn 1 giờ 45 phút</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Gửi lúc 12:15 hôm nay</p>
</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pending-bg text-pending-orange border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-pending-orange"></span>{"Chờ tiếp nhận\n                  "}</span>
</td>
<td className="py-3 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<Link to="/consultation-request" className="px-2.5 py-1.5 bg-[#9e2a4b] hover:bg-[#85203d] text-white rounded-lg font-bold text-[11px] shadow-sm transition-all inline-flex items-center gap-1">
<span>Tiếp nhận & Vào chi tiết</span>
<span className="material-symbols-outlined text-[13px]">arrow_forward</span>
</Link>
<button className="p-1 text-text-muted hover:text-text-charcoal hover:bg-canvas rounded transition-colors" title="Chuyển giao chuyên gia khác">
<span className="material-symbols-outlined text-[17px]">swap_horiz</span>
</button>
<button className="p-1 text-text-muted hover:text-[#9e2a4b] hover:bg-red-50 rounded transition-colors" title="Từ chối yêu cầu">
<span className="material-symbols-outlined text-[17px]">close</span>
</button>
</div>
</td>
</tr>
{/*  ROW 2 (Written Q&A - Urgent)  */}
<tr className="hover:bg-[#FDF2F4]/40 transition-colors group">
<td className="py-3 px-3 text-center">
<input className="rounded border-border-soft text-[#9e2a4b] focus:ring-[#9e2a4b] w-4 h-4 cursor-pointer" type="checkbox" />
</td>
<td className="py-3 px-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[12px] flex-shrink-0">{"TB\n                    "}</div>
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-text-charcoal truncate">Trần Thị B</span>
<span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-blue-100 text-blue-700">N3</span>
</div>
<p className="text-[11px] text-text-muted font-mono">ID: #44120 • Thi tháng 12</p>
</div>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold text-[11px]">
<span className="material-symbols-outlined text-[15px]">edit_note</span>
<span>Phiếu văn bản</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Sửa bài tập tự luận</p>
</td>
<td className="py-3 px-3">
<p className="font-bold text-text-charcoal leading-snug">Phân biệt mẫu câu nhượng bộ</p>
<p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">~ものの, ~にもかかわらず, ~といえども trong ngữ cảnh trang trọng.</p>
</td>
<td className="py-3 px-3">
<div className="flex flex-wrap gap-1.5">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-amber-600">auto_fix_high</span>{"Ghi chú AI 2 bài\n                    "}</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-purple-600">attach_file</span>{"2 ảnh bài làm\n                    "}</span>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] bg-[#FDF2F4] text-[#9e2a4b] border border-[#F8D7DC]">
<span className="material-symbols-outlined text-[13px]">alarm</span>
<span>Còn 1 giờ 10 phút</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Gói trả lời tốc hành</p>
</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pending-bg text-pending-orange border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-pending-orange"></span>{"Chờ tiếp nhận\n                  "}</span>
</td>
<td className="py-3 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<Link to="/consultation-request" className="px-2.5 py-1.5 bg-[#9e2a4b] hover:bg-[#85203d] text-white rounded-lg font-bold text-[11px] shadow-sm transition-all inline-flex items-center gap-1">
<span>Tiếp nhận & Vào chi tiết</span>
<span className="material-symbols-outlined text-[13px]">arrow_forward</span>
</Link>
<button className="p-1 text-text-muted hover:text-text-charcoal hover:bg-canvas rounded transition-colors" title="Chuyển giao">
<span className="material-symbols-outlined text-[17px]">swap_horiz</span>
</button>
<button className="p-1 text-text-muted hover:text-[#9e2a4b] hover:bg-red-50 rounded transition-colors" title="Từ chối">
<span className="material-symbols-outlined text-[17px]">close</span>
</button>
</div>
</td>
</tr>
{/*  ROW 3 (Video - Regular Deadline)  */}
<tr className="hover:bg-[#FDF2F4]/40 transition-colors group">
<td className="py-3 px-3 text-center">
<input className="rounded border-border-soft text-[#9e2a4b] focus:ring-[#9e2a4b] w-4 h-4 cursor-pointer" type="checkbox" />
</td>
<td className="py-3 px-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[12px] flex-shrink-0">{"LC\n                    "}</div>
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-text-charcoal truncate">Lê Hoàng C</span>
<span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-red-100 text-red-700">N2</span>
</div>
<p className="text-[11px] text-text-muted font-mono">ID: #20194 • Học lại lần 2</p>
</div>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info-bg text-info-blue font-semibold text-[11px]">
<span className="material-symbols-outlined text-[15px]">videocam</span>
<span>Video 1-on-1</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Thời lượng: 45 phút</p>
</td>
<td className="py-3 px-3">
<p className="font-bold text-text-charcoal leading-snug">Chiến lược Nghe hiểu Choukai N2</p>
<p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">Bắt keyword hội thoại đối đáp nhanh (Mondai 4, 5).</p>
</td>
<td className="py-3 px-3">
<div className="flex flex-wrap gap-1.5">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-[#9e2a4b]">fact_check</span>{"Mock-test N2 #02 (89/180)\n                    "}</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-blue-500">volume_up</span>{"Audio record\n                    "}</span>
</div>
</td>
<td className="py-3 px-3">
<span className="font-semibold text-text-charcoal text-[11px] block">Hôm nay 18:30</span>
<span className="text-[10px] text-text-muted font-medium">Còn 4 giờ 20 phút</span>
</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
<span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>{"Đang chuẩn bị\n                  "}</span>
</td>
<td className="py-3 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<Link to="/consultation-request" className="px-2.5 py-1.5 bg-[#9e2a4b] hover:bg-[#85203d] text-white rounded-lg font-bold text-[11px] shadow-sm transition-all inline-flex items-center gap-1">
<span>Tiếp nhận & Vào chi tiết</span>
<span className="material-symbols-outlined text-[13px]">arrow_forward</span>
</Link>
<button className="p-1 text-text-muted hover:text-text-charcoal hover:bg-canvas rounded transition-colors" title="Chuyển giao">
<span className="material-symbols-outlined text-[17px]">swap_horiz</span>
</button>
<button className="p-1 text-text-muted hover:text-[#9e2a4b] hover:bg-red-50 rounded transition-colors" title="Từ chối">
<span className="material-symbols-outlined text-[17px]">close</span>
</button>
</div>
</td>
</tr>
{/*  ROW 4 (Written - N4)  */}
<tr className="hover:bg-[#FDF2F4]/40 transition-colors group">
<td className="py-3 px-3 text-center">
<input className="rounded border-border-soft text-[#9e2a4b] focus:ring-[#9e2a4b] w-4 h-4 cursor-pointer" type="checkbox" />
</td>
<td className="py-3 px-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[12px] flex-shrink-0">{"PD\n                    "}</div>
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-text-charcoal truncate">Phạm Quốc D</span>
<span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">N4</span>
</div>
<p className="text-[11px] text-text-muted font-mono">ID: #91023 • Lớp cấp tốc</p>
</div>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold text-[11px]">
<span className="material-symbols-outlined text-[15px]">edit_note</span>
<span>Phiếu văn bản</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Ngữ pháp cơ bản</p>
</td>
<td className="py-3 px-3">
<p className="font-bold text-text-charcoal leading-snug">Sửa lỗi trợ từ bài viết luận</p>
<p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">Nhầm lẫn giữa trợ từ に, で và を trong thể sai khiến/bị động.</p>
</td>
<td className="py-3 px-3">
<div className="flex flex-wrap gap-1.5">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-emerald-600">psychology</span>{"SRS 80 từ N4\n                    "}</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-[#9e2a4b]">note_alt</span>{"Bản thảo 400 chữ\n                    "}</span>
</div>
</td>
<td className="py-3 px-3">
<span className="font-semibold text-text-charcoal text-[11px] block">Ngày mai 10:00</span>
<span className="text-[10px] text-text-muted font-medium">Hạn 18 giờ tới</span>
</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pending-bg text-pending-orange border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-pending-orange"></span>{"Chờ tiếp nhận\n                  "}</span>
</td>
<td className="py-3 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<Link to="/consultation-request" className="px-2.5 py-1.5 bg-[#9e2a4b] hover:bg-[#85203d] text-white rounded-lg font-bold text-[11px] shadow-sm transition-all inline-flex items-center gap-1">
<span>Tiếp nhận & Vào chi tiết</span>
<span className="material-symbols-outlined text-[13px]">arrow_forward</span>
</Link>
<button className="p-1 text-text-muted hover:text-text-charcoal hover:bg-canvas rounded transition-colors" title="Chuyển giao">
<span className="material-symbols-outlined text-[17px]">swap_horiz</span>
</button>
<button className="p-1 text-text-muted hover:text-[#9e2a4b] hover:bg-red-50 rounded transition-colors" title="Từ chối">
<span className="material-symbols-outlined text-[17px]">close</span>
</button>
</div>
</td>
</tr>
{/*  ROW 5 (Video - N1 Level)  */}
<tr className="hover:bg-[#FDF2F4]/40 transition-colors group">
<td className="py-3 px-3 text-center">
<input className="rounded border-border-soft text-[#9e2a4b] focus:ring-[#9e2a4b] w-4 h-4 cursor-pointer" type="checkbox" />
</td>
<td className="py-3 px-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[12px] flex-shrink-0">{"HT\n                    "}</div>
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-text-charcoal truncate">Hoàng Thị Thảo</span>
<span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-purple-100 text-purple-800">N1</span>
</div>
<p className="text-[11px] text-text-muted font-mono">ID: #55198 • Kỹ sư IT Tokyo</p>
</div>
</div>
</td>
<td className="py-3 px-3">
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info-bg text-info-blue font-semibold text-[11px]">
<span className="material-symbols-outlined text-[15px]">videocam</span>
<span>Video 1-on-1</span>
</div>
<p className="text-[10px] text-text-muted mt-0.5">Thời lượng: 60 phút</p>
</td>
<td className="py-3 px-3">
<p className="font-bold text-text-charcoal leading-snug">Lộ trình bứt phá Điểm Nghe N1</p>
<p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">Điểm hiện tại 28/60, cần mẹo giải đề tổng hợp Mondai 5.</p>
</td>
<td className="py-3 px-3">
<div className="flex flex-wrap gap-1.5">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-[#9e2a4b]">fact_check</span>{"Mock-test N1 #01 (94/180)\n                    "}</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-border-soft text-[11px] text-text-charcoal font-medium">
<span className="material-symbols-outlined text-[13px] text-amber-600">auto_fix_high</span>{"Ghi chú AI 2 bài\n                    "}</span>
</div>
</td>
<td className="py-3 px-3">
<span className="font-semibold text-text-charcoal text-[11px] block">Ngày mai 14:00</span>
<span className="text-[10px] text-text-muted font-medium">Theo lịch hẹn trước</span>
</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pending-bg text-pending-orange border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-pending-orange"></span>{"Chờ tiếp nhận\n                  "}</span>
</td>
<td className="py-3 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<Link to="/consultation-request" className="px-2.5 py-1.5 bg-[#9e2a4b] hover:bg-[#85203d] text-white rounded-lg font-bold text-[11px] shadow-sm transition-all inline-flex items-center gap-1">
<span>Tiếp nhận & Vào chi tiết</span>
<span className="material-symbols-outlined text-[13px]">arrow_forward</span>
</Link>
<button className="p-1 text-text-muted hover:text-text-charcoal hover:bg-canvas rounded transition-colors" title="Chuyển giao">
<span className="material-symbols-outlined text-[17px]">swap_horiz</span>
</button>
<button className="p-1 text-text-muted hover:text-[#9e2a4b] hover:bg-red-50 rounded transition-colors" title="Từ chối">
<span className="material-symbols-outlined text-[17px]">close</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  PAGINATION & BULK ACTION BAR AT BOTTOM  */}
<div className="p-3 bg-canvas border-t border-border-soft flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
{/*  Bulk Action Bar  */}
<div className="flex items-center gap-2.5">
<span className="text-[12px] font-bold text-text-charcoal flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#9e2a4b]"></span>{"Đã chọn "}<span className="text-[#9e2a4b] font-extrabold">1</span>{" yêu cầu\n            "}</span>
<div className="h-4 w-px bg-border-soft"></div>
<button className="px-3 py-1.5 rounded-lg bg-[#9e2a4b] hover:bg-[#85203d] text-white font-semibold text-[11px] transition-colors shadow-sm flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">done_all</span>
<span>Tiếp nhận hàng loạt</span>
</button>
<button className="px-2.5 py-1.5 rounded-lg border border-border-soft bg-white hover:bg-canvas text-text-muted font-semibold text-[11px] transition-colors">{"Chuyển sang ca tối\n            "}</button>
</div>
{/*  Pagination Controls  */}
<div className="flex items-center gap-3">
<div className="flex items-center gap-1 text-[11px] text-text-muted">
<span>Hiển thị</span>
<select className="bg-white border border-border-soft rounded px-1.5 py-0.5 text-[11px] font-semibold text-text-charcoal cursor-pointer">
<option>5 / trang</option>
<option selected>10 / trang</option>
<option>25 / trang</option>
</select>
<span>trong tổng 12 yêu cầu</span>
</div>
<div className="flex items-center gap-1">
<button className="w-7 h-7 rounded border border-border-soft bg-white flex items-center justify-center text-text-muted hover:text-text-charcoal disabled:opacity-40" disabled>
<span className="material-symbols-outlined text-[16px]">chevron_left</span>
</button>
<button className="w-7 h-7 rounded font-bold text-[12px] bg-[#9e2a4b] text-white flex items-center justify-center shadow-sm">1</button>
<button className="w-7 h-7 rounded font-medium text-[12px] bg-white border border-border-soft text-text-charcoal hover:bg-canvas flex items-center justify-center">2</button>
<button className="w-7 h-7 rounded font-medium text-[12px] bg-white border border-border-soft text-text-charcoal hover:bg-canvas flex items-center justify-center">3</button>
<button className="w-7 h-7 rounded border border-border-soft bg-white flex items-center justify-center text-text-charcoal hover:bg-canvas">
<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</button>
</div>
<span className="text-[11px] font-semibold text-text-muted">Trang 1 / 3</span>
</div>
</div>
</div>
</main>
{/*  FOOTER  */}
<footer className="h-9 bg-surface-pure border-t border-border-soft flex items-center justify-between px-6 text-[11px] text-text-muted z-10 flex-shrink-0">
<div className="flex items-center gap-3">
<span>© 2024 <strong>RikiPath Neo-Sakura Portal</strong> v2.4.0 (Desktop Edition)</span>
<span className="text-border-soft">•</span>
<span className="text-emerald-600 font-semibold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" Máy chủ đồng bộ hóa trực tiếp\n        "}</span>
</div>
<div className="flex items-center gap-5">
<a className="hover:text-[#9e2a4b] transition-colors" href="#">Hướng dẫn chấm bài & chuẩn chấm</a>
<a className="hover:text-[#9e2a4b] transition-colors" href="#">Quy chế phản hồi 1-on-1</a>
<a className="hover:text-[#9e2a4b] transition-colors" href="#">Hỗ trợ kỹ thuật nội bộ (Hotline)</a>
</div>
</footer>
</div>


    </div>
  
</ConsultShell>
);
}
