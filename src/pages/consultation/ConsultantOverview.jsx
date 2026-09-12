import { Link, useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
export default function ConsultantOverview() {
  const { pathname } = useLocation();
  return (
    <ConsultShell pathname={pathname} breadcrumb="Tổng quan CG">
<div className="min-h-screen bg-canvas text-slate-main antialiased flex overflow-x-hidden min-h-screen" data-page="ConsultantOverview" data-shell-unified="1">


{/*  ================= PERSISTENT LEFT SIDEBAR (260px) =================  */}





{/*  ================= MAIN VIEWPORT (w-full, offset by sidebar) =================  */}


<div className="flex-1 ml-0 flex flex-col min-w-0 min-h-screen">
{/*  ================= STICKY TOP NAVBAR =================  */}

{/*  ================= MAIN WORKSPACE (12-Col Grid, 1440px target) =================  */}
<main className="flex-1 p-8 space-y-6 max-w-[1440px] w-full mx-auto">
{/*  HERO WELCOME & DYNAMIC KPI SUMMARY  */}
<section className="space-y-4">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
<div>
<h1 className="text-2xl font-extrabold tracking-tight text-slate-main flex items-center gap-2">{"Chào buổi sáng, Kenji Sensei! 🌸\n            "}</h1>
<p className="text-xs text-slate-muted mt-1">{"Bạn có "}<span className="font-semibold text-brand">3 phiên tư vấn trực tuyến</span> và <span className="font-semibold text-brand">5 yêu cầu mới</span>{" đang chờ duyệt tiếp nhận hôm nay.\n            "}</p>
</div>
<div className="flex items-center gap-2.5">
<button className="inline-flex items-center gap-1.5 bg-white hover:bg-canvas text-slate-main text-xs font-bold px-3 py-2 rounded-lg border border-subtle shadow-card transition-all">
<span className="material-symbols-outlined text-[18px]">event_available</span>{"Đồng bộ Google Calendar\n            "}</button>
<button className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm shadow-brand/20 transition-all">
<span className="material-symbols-outlined text-[18px]">add_circle</span>{"Tạo phòng tư vấn mở\n            "}</button>
</div>
</div>
{/*  4 Neo-Sakura KPI Cards  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
{/*  KPI 1  */}
<div className="bg-white border border-subtle rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
<div>
<p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">Phiên hôm nay</p>
<h3 className="text-2xl font-extrabold text-slate-main mt-1">3 <span className="text-xs font-semibold text-slate-muted">phiên</span></h3>
<p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>{" 1 hoàn thành • 2 sắp tới\n              "}</p>
</div>
<div className="w-12 h-12 rounded-xl bg-sakura-100 border border-sakura-300 flex items-center justify-center text-brand">
<span className="material-symbols-outlined text-[24px]">videocam</span>
</div>
</div>
{/*  KPI 2  */}
<div className="bg-white border border-subtle rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
<div>
<p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">Đã hoàn thành tháng</p>
<h3 className="text-2xl font-extrabold text-slate-main mt-1">48<span className="text-xs font-semibold text-slate-muted">/60</span></h3>
<div className="w-28 bg-canvas rounded-full h-1.5 mt-2 border border-subtle overflow-hidden">
<div className="bg-brand h-1.5 rounded-full" style={{ width: "80%" }}></div>
</div>
</div>
<div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
<span className="material-symbols-outlined text-[24px]">task_alt</span>
</div>
</div>
{/*  KPI 3  */}
<div className="bg-white border border-subtle rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
<div>
<p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">Đánh giá học viên</p>
<h3 className="text-2xl font-extrabold text-slate-main mt-1">4.95 <span className="text-xs text-amber-600 font-bold">★</span></h3>
<p className="text-[11px] text-slate-muted font-medium flex items-center gap-1 mt-1">{"Dựa trên 112 lượt phản hồi\n              "}</p>
</div>
<div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
<span className="material-symbols-outlined text-[24px] icon-fill">grade</span>
</div>
</div>
{/*  KPI 4  */}
<div className="bg-white border border-subtle rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
<div>
<p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">Thời gian tư vấn TB</p>
<h3 className="text-2xl font-extrabold text-slate-main mt-1">42 <span className="text-xs font-semibold text-slate-muted">phút/phiên</span></h3>
<p className="text-[11px] text-brand font-semibold flex items-center gap-1 mt-1">
<span className="material-symbols-outlined text-[14px]">speed</span>{" Tối ưu hiệu quả +8%\n              "}</p>
</div>
<div className="w-12 h-12 rounded-xl bg-sakura-100 border border-sakura-300 flex items-center justify-center text-brand">
<span className="material-symbols-outlined text-[24px]">timelapse</span>
</div>
</div>
</div>
</section>
{/*  ================= 12-COLUMN MULTI-COLUMN WORKSPACE =================  */}
<div className="grid grid-cols-12 gap-6">
{/*  ================= LEFT / MAIN COLUMN (8 COLS) =================  */}
<div className="col-span-12 lg:col-span-8 space-y-6">
{/*  FEATURED CARD: Next online consultation session (Primary focus)  */}
<div className="bg-white border-2 border-brand/50 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden bg-gradient-to-br from-white via-white to-sakura-100/60">
<div className="absolute -right-8 -top-8 w-36 h-36 bg-sakura-200 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-subtle">
<div className="flex items-center gap-2.5">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-brand text-white shadow-xs">
<span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>{"PHIÊN TRỌNG TÂM TIẾP THEO\n                "}</span>
<span className="text-xs font-semibold text-slate-muted">Bắt đầu sau 25 phút</span>
</div>
<div className="flex items-center gap-2">
<span className="text-xs text-slate-muted font-medium">Hình thức:</span>
<span className="inline-flex items-center gap-1 text-xs font-bold text-slate-main bg-canvas px-2.5 py-0.5 rounded border border-subtle">
<span className="material-symbols-outlined text-[15px] text-brand">videocam</span>{" Riki Video 1-on-1\n                "}</span>
</div>
</div>
{/*  Learner profile & Topic details  */}
<div className="pt-5 flex flex-col md:flex-row items-start gap-5">
<div className="w-16 h-16 rounded-2xl bg-sakura-100 border border-sakura-300 flex flex-col items-center justify-center shrink-0">
<span className="text-lg font-black text-brand leading-none">09:30</span>
<span className="text-[10px] font-bold text-slate-muted uppercase mt-1">SÁNG NAY</span>
</div>
<div className="flex-1 min-w-0">
<div className="flex flex-wrap items-center gap-2">
<h3 className="text-base font-bold text-slate-main">Nguyễn Văn A</h3>
<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-canvas text-slate-muted border border-subtle">ID: L-092</span>
<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FDF2F4] text-brand border border-sakura-300">Mục tiêu N2 Đột phá (135+ điểm)</span>
</div>
<h4 className="text-sm font-semibold text-slate-main mt-2">{"Chủ đề: "}<span className="text-brand font-bold">Chiến lược bứt phá Đọc hiểu Dokkai & Giải toả tâm lý phòng thi</span>
</h4>
<p className="text-xs text-slate-muted mt-1.5 line-clamp-2">{"Ghi chú trước phiên: Học viên hay bị thiếu 15 phút phần Trường văn Dokkai; điểm thi thử đợt 2 đạt 26/60 phần Đọc. Cần định hướng lại thứ tự làm bài và kỹ thuật quét từ khoá theo format JLPT mới nhất.\n                "}</p>
{/*  Actions  */}
<div className="mt-5 flex flex-wrap items-center gap-3">
<Link to="/consultation-room" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm shadow-brand/20 transition-all">
<span className="material-symbols-outlined text-[18px]">meeting_room</span>{"Vào phòng tư vấn ngay\n                  "}</Link>
<button className="inline-flex items-center gap-2 bg-white hover:bg-canvas text-slate-main text-xs font-bold px-4 py-2.5 rounded-lg border border-subtle transition-all">
<span className="material-symbols-outlined text-[18px] text-slate-muted">folder_shared</span>{"Xem hồ sơ dữ liệu chia sẻ\n                  "}</button>
<button className="p-2 text-slate-muted hover:text-slate-main rounded-lg hover:bg-canvas border border-transparent hover:border-subtle transition-colors ml-auto" title="Tùy chọn khác">
<span className="material-symbols-outlined text-[20px]">more_horiz</span>
</button>
</div>
</div>
</div>
</div>
{/*  LỊCH TRÌNH TƯ VẤN HÔM NAY (Interactive Timeline)  */}
<div className="bg-white border border-subtle rounded-2xl p-6 shadow-card">
<div className="flex items-center justify-between pb-4 border-b border-subtle">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-sakura-100 flex items-center justify-center text-brand">
<span className="material-symbols-outlined text-[20px]">schedule</span>
</div>
<div>
<h3 className="text-sm font-bold text-slate-main">Lịch trình tư vấn hôm nay</h3>
<p className="text-[11px] text-slate-muted">3 phiên làm việc đã được xếp lịch cố định</p>
</div>
</div>
<Link className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1" to="/work-schedule">{"Xem toàn bộ lịch "}<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
{/*  Timeline items  */}
<div className="mt-5 space-y-4">
{/*  Item 1  */}
<div className="flex items-start gap-4 p-3.5 rounded-xl border border-sakura-300 bg-sakura-50/70 transition-all">
<div className="text-center w-14 shrink-0">
<span className="text-xs font-bold text-brand block">09:30</span>
<span className="text-[10px] text-slate-light font-semibold">45 phút</span>
</div>
<div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0 ring-4 ring-sakura-200"></div>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between">
<h4 className="text-xs font-bold text-slate-main">Online Zoom 1-on-1: Lộ trình N2 & Dokkai</h4>
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand text-white">SẮP DIỄN RA</span>
</div>
<p className="text-[11px] text-slate-muted mt-0.5">Học viên: Nguyễn Văn A • Trực tuyến qua Riki Room 02</p>
</div>
<button className="text-xs font-bold text-brand bg-white border border-sakura-300 hover:bg-sakura-100 px-3 py-1.5 rounded-lg transition-colors">{"Chi tiết\n                "}</button>
</div>
{/*  Item 2  */}
<div className="flex items-start gap-4 p-3.5 rounded-xl border border-subtle hover:border-slate-light/40 bg-white transition-all">
<div className="text-center w-14 shrink-0">
<span className="text-xs font-bold text-slate-main block">14:00</span>
<span className="text-[10px] text-slate-light font-semibold">60 phút</span>
</div>
<div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between">
<h4 className="text-xs font-bold text-slate-main">Review hồ sơ học bổng MEXT & Du học Nhật Bản</h4>
<span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-canvas text-slate-muted border border-subtle">CHIỀU</span>
</div>
<p className="text-[11px] text-slate-muted mt-0.5">Học viên: Trần Thị Mai (L-144) • Chuẩn bị Research Proposal N1</p>
</div>
<button className="text-xs font-bold text-slate-muted hover:text-brand bg-canvas hover:bg-white border border-subtle px-3 py-1.5 rounded-lg transition-colors">{"Xem trước CV\n                "}</button>
</div>
{/*  Item 3  */}
<div className="flex items-start gap-4 p-3.5 rounded-xl border border-subtle hover:border-slate-light/40 bg-white transition-all">
<div className="text-center w-14 shrink-0">
<span className="text-xs font-bold text-slate-main block">16:30</span>
<span className="text-[10px] text-slate-light font-semibold">30 phút</span>
</div>
<div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between">
<h4 className="text-xs font-bold text-slate-main">Trả lời phiếu văn bản N3: Phương pháp nghe hiểu Choukai</h4>
<span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-canvas text-slate-muted border border-subtle">PHIẾU TƯ VẤN</span>
</div>
<p className="text-[11px] text-slate-muted mt-0.5">Học viên: Lê Hoàng Nam (L-201) • Ticket #TK-8941</p>
</div>
<button className="text-xs font-bold text-slate-muted hover:text-brand bg-canvas hover:bg-white border border-subtle px-3 py-1.5 rounded-lg transition-colors">{"Mở phiếu\n                "}</button>
</div>
</div>
</div>
{/*  YÊU CẦU TƯ VẤN MỚI CẦN TIẾP NHẬN (Mini Table)  */}
<div className="bg-white border border-subtle rounded-2xl p-6 shadow-card">
<div className="flex items-center justify-between pb-4 border-b border-subtle">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-status-pending">
<span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
</div>
<div>
<h3 className="text-sm font-bold text-slate-main">Yêu cầu tư vấn mới cần tiếp nhận</h3>
<p className="text-[11px] text-slate-muted">5 yêu cầu trong hàng đợi chờ Sensei duyệt nhận phiên</p>
</div>
</div>
<span className="text-xs font-extrabold text-status-urgent bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">{"2 yêu cầu sắp quá hạn\n              "}</span>
</div>
{/*  Table  */}
<div className="overflow-x-auto mt-4">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-subtle text-[10px] font-bold uppercase tracking-wider text-slate-light">
<th className="py-2.5 px-3">Học viên</th>
<th className="py-2.5 px-3">Trình độ / Mục tiêu</th>
<th className="py-2.5 px-3">Vấn đề cốt lõi</th>
<th className="py-2.5 px-3">Hạn tiếp nhận</th>
<th className="py-2.5 px-3 text-right">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-subtle text-xs">
{/*  Row 1  */}
<tr className="hover:bg-canvas/80 transition-colors">
<td className="py-3 px-3">
<div className="font-bold text-slate-main">Đỗ Minh Tuấn</div>
<div className="text-[10px] text-slate-light font-mono">ID: L-388</div>
</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sakura-200 text-brand">JLPT N1</span>
</td>
<td className="py-3 px-3 max-w-[200px] truncate text-slate-muted">{"Trượt từ vựng Kanji 2 lần liên tiếp, cần phương pháp ghi nhớ chữ Hán khó\n                    "}</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-urgent bg-red-50 px-2 py-0.5 rounded">
<span className="material-symbols-outlined text-[13px]">alarm</span>{" Còn 18 phút\n                      "}</span>
</td>
<td className="py-3 px-3 text-right space-x-1.5">
<button className="px-3 py-1 bg-brand hover:bg-brand-hover text-white text-[11px] font-bold rounded-md shadow-xs transition-colors">{"Tiếp nhận\n                      "}</button>
<button className="px-2 py-1 bg-white border border-subtle hover:bg-canvas text-slate-muted text-[11px] font-medium rounded-md transition-colors">{"Xem hồ sơ\n                      "}</button>
</td>
</tr>
{/*  Row 2  */}
<tr className="hover:bg-canvas/80 transition-colors">
<td className="py-3 px-3">
<div className="font-bold text-slate-main">Phạm Hương Trà</div>
<div className="text-[10px] text-slate-light font-mono">ID: L-509</div>
</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sakura-100 text-brand border border-sakura-200">JLPT N2</span>
</td>
<td className="py-3 px-3 max-w-[200px] truncate text-slate-muted">{"Cần lập lộ trình 3 tháng cấp tốc từ N3 lên N2 để kịp nộp hồ sơ kỹ sư\n                    "}</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
<span className="material-symbols-outlined text-[13px]">schedule</span>{" Còn 1h 40p\n                      "}</span>
</td>
<td className="py-3 px-3 text-right space-x-1.5">
<button className="px-3 py-1 bg-brand hover:bg-brand-hover text-white text-[11px] font-bold rounded-md shadow-xs transition-colors">{"Tiếp nhận\n                      "}</button>
<button className="px-2 py-1 bg-white border border-subtle hover:bg-canvas text-slate-muted text-[11px] font-medium rounded-md transition-colors">{"Xem hồ sơ\n                      "}</button>
</td>
</tr>
{/*  Row 3  */}
<tr className="hover:bg-canvas/80 transition-colors">
<td className="py-3 px-3">
<div className="font-bold text-slate-main">Vũ Đức Hải</div>
<div className="text-[10px] text-slate-light font-mono">ID: L-612</div>
</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">JLPT N3</span>
</td>
<td className="py-3 px-3 max-w-[200px] truncate text-slate-muted">{"Tư vấn cấu trúc câu ghép ngữ pháp N3 và lỗi nhầm lẫn trợ từ thường gặp\n                    "}</td>
<td className="py-3 px-3">
<span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-muted bg-canvas px-2 py-0.5 rounded border border-subtle">{"Còn 3h 15p\n                      "}</span>
</td>
<td className="py-3 px-3 text-right space-x-1.5">
<button className="px-3 py-1 bg-brand hover:bg-brand-hover text-white text-[11px] font-bold rounded-md shadow-xs transition-colors">{"Tiếp nhận\n                      "}</button>
<button className="px-2 py-1 bg-white border border-subtle hover:bg-canvas text-slate-muted text-[11px] font-medium rounded-md transition-colors">{"Xem hồ sơ\n                      "}</button>
</td>
</tr>
</tbody>
</table>
</div>
<div className="mt-3 pt-3 border-t border-subtle flex justify-between items-center">
<span className="text-[11px] text-slate-light">Hiển thị 3 trong tổng số 5 yêu cầu mới</span>
<Link className="text-xs font-bold text-brand hover:underline flex items-center gap-1" to="/consultation-queue">{"Xem toàn bộ hàng đợi (5) "}<span className="material-symbols-outlined text-[15px]">arrow_forward</span>
</Link>
</div>
</div>
</div>
{/*  ================= RIGHT COLUMN (4 COLS) =================  */}
<div className="col-span-12 lg:col-span-4 space-y-6">
{/*  THỐNG KÊ NĂNG LỰC TƯ VẤN & TẢI CÔNG VIỆC (Workload Gauge)  */}
<div className="bg-white border border-subtle rounded-2xl p-6 shadow-card">
<div className="flex items-center justify-between pb-3 border-b border-subtle">
<h3 className="text-xs font-bold uppercase tracking-wider text-slate-light">Tải công việc & Năng lực</h3>
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">75% CÔNG SUẤT</span>
</div>
{/*  Visual Progress Radial / Meter  */}
<div className="pt-4 flex items-center gap-5">
<div className="relative w-20 h-20 flex items-center justify-center shrink-0">
<svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
{/*  Background Circle  */}
<path className="text-sakura-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
{/*  Stroke Circle (75%)  */}
<path className="text-brand" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="75, 100" strokeLinecap="round" strokeWidth="3.5"></path>
</svg>
<div className="absolute flex flex-col items-center">
<span className="text-base font-black text-brand leading-none">75%</span>
<span className="text-[9px] text-slate-muted font-bold">Optimal</span>
</div>
</div>
<div className="flex-1 space-y-1.5 text-xs">
<div className="flex justify-between text-slate-muted">
<span>Slot khả dụng hôm nay:</span>
<span className="font-bold text-slate-main">1 / 4 slot</span>
</div>
<div className="flex justify-between text-slate-muted">
<span>Thời gian tư vấn tuần:</span>
<span className="font-bold text-slate-main">26.5 giờ</span>
</div>
<div className="flex justify-between text-slate-muted">
<span>Chỉ số phản hồi nhanh:</span>
<span className="font-bold text-emerald-600">96.8%</span>
</div>
</div>
</div>
<div className="mt-4 p-3 rounded-xl bg-canvas border border-subtle flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[18px]">bolt</span>
<span className="text-xs font-semibold text-slate-main">Tự động nhận học viên phù hợp</span>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input checked className="sr-only peer" type="checkbox" value="" />
<div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand"></div>
</label>
</div>
</div>
{/*  HỌC VIÊN CẦN THEO DÕI ĐẶC BIỆT  */}
<div className="bg-white border border-subtle rounded-2xl p-6 shadow-card">
<div className="flex items-center justify-between pb-3 border-b border-subtle">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[18px]">priority_high</span>
<h3 className="text-xs font-bold uppercase tracking-wider text-slate-light">Học viên cần theo dõi</h3>
</div>
<span className="text-[10px] font-bold text-slate-muted">2 trường hợp</span>
</div>
<div className="mt-4 space-y-3">
{/*  Student Card 1  */}
<div className="p-3.5 rounded-xl border border-subtle hover:border-brand/40 bg-white hover:shadow-xs transition-all">
<div className="flex items-start justify-between">
<div>
<h4 className="text-xs font-bold text-slate-main">Lê Thuỳ Trang</h4>
<p className="text-[11px] text-slate-muted">Lớp N2-Online • Đợt thi T12/2024</p>
</div>
<span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-status-urgent border border-red-200">{"Điểm thi thử: 18/60\n                  "}</span>
</div>
<p className="text-[11px] text-slate-muted mt-2 bg-canvas p-2 rounded border border-subtle">{"⚠️ "}<span className="font-medium">Điểm yếu:</span>{" Choukai nghe hiểu bài toán số liệu; chưa hoàn thành bài tập ngữ pháp tuần 3.\n                "}</p>
<div className="mt-2.5 flex items-center justify-between pt-1">
<span className="text-[10px] text-slate-light">Cố vấn gần nhất: 5 ngày trước</span>
<a className="text-xs font-bold text-brand hover:underline" href="#">Gửi lời nhắc</a>
</div>
</div>
{/*  Student Card 2  */}
<div className="p-3.5 rounded-xl border border-subtle hover:border-brand/40 bg-white hover:shadow-xs transition-all">
<div className="flex items-start justify-between">
<div>
<h4 className="text-xs font-bold text-slate-main">Trần Quốc Bảo</h4>
<p className="text-[11px] text-slate-muted">Lớp N1-Chuyên sâu • L-109</p>
</div>
<span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">{"Sút giảm phong độ\n                  "}</span>
</div>
<p className="text-[11px] text-slate-muted mt-2 bg-canvas p-2 rounded border border-subtle">{"⚠️ "}<span className="font-medium">Điểm yếu:</span>{" Áp lực công việc dẫn tới bỏ 2 bài kiểm tra định kỳ; cần tư vấn quản trị thời gian học.\n                "}</p>
<div className="mt-2.5 flex items-center justify-between pt-1">
<span className="text-[10px] text-slate-light">Chưa đặt lịch hẹn lại</span>
<a className="text-xs font-bold text-brand hover:underline" href="#">Mời đặt lịch</a>
</div>
</div>
</div>
</div>
{/*  LỐI TẮT TÁC VỤ NHANH  */}
<div className="bg-white border border-subtle rounded-2xl p-6 shadow-card">
<h3 className="text-xs font-bold uppercase tracking-wider text-slate-light pb-3 border-b border-subtle">{"Lối tắt tác vụ nhanh\n            "}</h3>
<div className="mt-4 space-y-2.5">
<button className="w-full flex items-center justify-between p-3 rounded-xl border border-subtle hover:border-sakura-300 hover:bg-sakura-100 text-left transition-all group">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 group-hover:bg-brand group-hover:text-white flex items-center justify-center text-brand transition-colors">
<span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
</div>
<div>
<div className="text-xs font-bold text-slate-main group-hover:text-brand transition-colors">Cập nhật lịch trống</div>
<div className="text-[10px] text-slate-muted">Mở thêm ca tư vấn tuần này</div>
</div>
</div>
<span className="material-symbols-outlined text-slate-light group-hover:text-brand text-[18px] transition-colors">chevron_right</span>
</button>
<button className="w-full flex items-center justify-between p-3 rounded-xl border border-subtle hover:border-sakura-300 hover:bg-sakura-100 text-left transition-all group">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 group-hover:bg-brand group-hover:text-white flex items-center justify-center text-brand transition-colors">
<span className="material-symbols-outlined text-[18px]">attach_file_add</span>
</div>
<div>
<div className="text-xs font-bold text-slate-main group-hover:text-brand transition-colors">Gửi tài liệu tham khảo</div>
<div className="text-[10px] text-slate-muted">Tập đề Dokkai N2 chọn lọc</div>
</div>
</div>
<span className="material-symbols-outlined text-slate-light group-hover:text-brand text-[18px] transition-colors">chevron_right</span>
</button>
<button className="w-full flex items-center justify-between p-3 rounded-xl border border-subtle hover:border-sakura-300 hover:bg-sakura-100 text-left transition-all group">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 group-hover:bg-brand group-hover:text-white flex items-center justify-center text-brand transition-colors">
<span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
</div>
<div>
<div className="text-xs font-bold text-slate-main group-hover:text-brand transition-colors">Soạn mẫu phản hồi AI</div>
<div className="text-[10px] text-slate-muted">Tạo khung tư vấn nhanh 30s</div>
</div>
</div>
<span className="material-symbols-outlined text-slate-light group-hover:text-brand text-[18px] transition-colors">chevron_right</span>
</button>
</div>
</div>
</div>
</div>
</main>
{/*  ================= FOOTER =================  */}
<footer className="mt-auto border-t border-subtle bg-white px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-muted">
<div className="flex items-center gap-2">
<span className="font-bold text-slate-main">RikiPath Neo-Sakura Portal</span>
<span>•</span>
<span className="text-slate-light">Phiên bản Hệ thống 2.4.0 (Enterprise)</span>
</div>
<div className="flex items-center gap-6">
<a className="hover:text-brand transition-colors" href="#">Hỗ trợ Cố vấn Nội bộ</a>
<a className="hover:text-brand transition-colors" href="#">Cẩm nang Sensei</a>
<a className="hover:text-brand transition-colors" href="#">Quy chuẩn Bảo mật Thông tin</a>
<span className="text-slate-light">© 2024 Riki Education Ecosystem</span>
</div>
</footer>
</div>


    </div>
  
</ConsultShell>
);
}
