import { useState } from 'react';
import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
import Pagination from '../../components/Pagination.jsx';

export default function ExamBuilder() {
  const { pathname } = useLocation();
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(10);
  return (
    <CmsShell pathname={pathname} breadcrumb="Xây đề thi">
<div className="min-h-screen bg-canvas text-charcoal antialiased flex min-h-screen" data-page="ExamBuilder" data-shell-unified="1">


{/*  Left Sidebar (256px Fixed)  */}





{/*  Main Container Wrapper  */}


<div className="pl-0 w-full flex flex-col min-h-screen">
{/*  Topbar (Fixed at top, offset by sidebar 256px)  */}

{/*  Main Content Canvas (1440px Grid Standard Container)  */}
<main className="flex-1 px-8 py-8 w-full max-w-[1440px] mx-auto space-y-7">
<p role="status">Mục này chưa có dữ liệu.</p>

{/*  Breadcrumbs & Status Bar  */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-2 text-[12px] text-charcoal-muted">
<a className="hover:text-brand transition-colors" href="#">Tổng quan CMS</a>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<a className="hover:text-brand transition-colors" href="#">Quản lý Khảo thí</a>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="text-charcoal font-semibold">—</span>
</div>
<div className="flex items-center gap-2 text-[12px] font-mono text-charcoal-muted">
<span>Phiên bản ma trận: <strong>—</strong></span>
<span>•</span>
<span>—</span>
</div>
</div>
{/*  Master Header Hero Card  */}
<div className="relative overflow-hidden rounded-2xl bg-surface border border-borderline p-7 shadow-card">
{/*  Sakura Decorative Watermark  */}
<div className="absolute right-10 -top-6 text-[110px] font-bold text-brand opacity-[0.04] pointer-events-none select-none font-sans">
          —
        </div>
<div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-sakura-100/50 blur-3xl pointer-events-none"></div>
<div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
<div className="space-y-2.5 max-w-4xl">
<div className="flex flex-wrap items-center gap-2.5">
<span className="px-2.5 py-0.5 rounded-full bg-sakura-100 border border-sakura-200 text-brand text-[11px] font-bold tracking-wide uppercase">
                Chuẩn Đề Thi JEES Tokyo
              </span>
<span className="w-1 h-1 rounded-full bg-borderline"></span>
<span className="font-mono text-[12px] font-semibold text-charcoal-muted bg-canvas px-2 py-0.5 rounded border border-borderline">
                —
              </span>
<span className="w-1 h-1 rounded-full bg-borderline"></span>
<div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Đang thẩm định chuyên môn
              </div>
</div>
<h1 className="text-[26px] font-extrabold text-charcoal tracking-tight flex items-center gap-2">
              Thiết lập Đề thi thử JLPT N3 Đột Phá <span className="text-brand font-mono font-bold">—</span>
</h1>
<p className="text-[14px] text-charcoal-muted leading-relaxed">—</p>
</div>
{/*  Action Buttons  */}
<div className="flex flex-wrap items-center gap-3 shrink-0 self-start xl:self-center">
<button className="px-4 py-2 rounded-xl bg-canvas hover:bg-surface border border-borderline text-charcoal font-semibold text-[13px] transition-all flex items-center gap-2 shadow-sm">
<span className="material-symbols-outlined text-[18px] text-charcoal-muted">bookmark</span>
<span>Lưu bản nháp</span>
</button>
<button className="px-4 py-2 rounded-xl bg-sakura-50 hover:bg-sakura-100 border border-sakura-200 text-brand font-semibold text-[13px] transition-all flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">preview</span>
<span>Xem trước học viên</span>
</button>
<button className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-[13px] transition-all shadow-sakura-glow flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">rocket_launch</span>
<span>Xuất bản vào Phòng thi thử</span>
</button>
</div>
</div>
</div>
{/*  4 KPI Summary Cards (12-Column Grid: 3 cols each)  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
{/*  KPI 1  */}
<div className="rounded-xl bg-surface border border-borderline p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-[12px] font-bold uppercase tracking-wider text-charcoal-muted">Tổng thời lượng</span>
<div className="w-8 h-8 rounded-lg bg-sakura-50 text-brand flex items-center justify-center">
<span className="material-symbols-outlined text-[18px]">timer</span>
</div>
</div>
<div className="my-3 flex items-baseline gap-1.5">
<span className="text-[32px] font-extrabold text-charcoal tracking-tight">—</span>
<span className="text-[13px] font-medium text-charcoal-muted">—</span>
</div>
<div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
<span>Chuẩn quy chế JEES Tokyo</span>
</div>
</div>
{/*  KPI 2  */}
<div className="rounded-xl bg-surface border border-borderline p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-[12px] font-bold uppercase tracking-wider text-charcoal-muted">Thang điểm tổng</span>
<div className="w-8 h-8 rounded-lg bg-sakura-50 text-brand flex items-center justify-center">
<span className="material-symbols-outlined text-[18px]">auto_graph</span>
</div>
</div>
<div className="my-3 flex items-baseline gap-1.5">
<span className="text-[32px] font-extrabold text-charcoal tracking-tight">—</span>
<span className="text-[13px] font-medium text-charcoal-muted">điểm chuẩn hóa</span>
</div>
<div className="text-[11px] text-charcoal-muted flex items-center gap-1">
<span>Điểm sàn đỗ:</span>
<strong className="text-charcoal font-bold">—</strong>
<span className="text-[10px] text-charcoal-light">—</span>
</div>
</div>
{/*  KPI 3  */}
<div className="rounded-xl bg-surface border border-borderline p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-[12px] font-bold uppercase tracking-wider text-charcoal-muted">Quy mô câu hỏi</span>
<div className="w-8 h-8 rounded-lg bg-sakura-50 text-brand flex items-center justify-center">
<span className="material-symbols-outlined text-[18px]">layers</span>
</div>
</div>
<div className="my-3 flex items-baseline gap-1.5">
<span className="text-[32px] font-extrabold text-charcoal tracking-tight">—</span>
<span className="text-[13px] font-medium text-charcoal-muted">câu hỏi khảo thí</span>
</div>
<div className="text-[11px] text-brand font-semibold flex items-center gap-1.5 bg-sakura-50 px-2.5 py-1 rounded-md w-fit">
<span className="material-symbols-outlined text-[14px]">verified</span>
<span>—</span>
</div>
</div>
{/*  KPI 4  */}
<div className="rounded-xl bg-gradient-to-br from-sakura-50 to-white border border-sakura-200 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-[12px] font-bold uppercase tracking-wider text-brand">Tỷ lệ đỗ kỳ vọng</span>
<div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-[18px]">psychology</span>
</div>
</div>
<div className="my-3 flex items-baseline gap-1.5">
<span className="text-[32px] font-extrabold text-brand tracking-tight">—</span>
<span className="text-[12px] font-mono text-charcoal-muted">—</span>
</div>
<div className="text-[11px] text-charcoal-muted flex items-center gap-1 font-medium">
<span className="material-symbols-outlined text-[14px] text-brand">auto_awesome</span>
<span>Dự báo qua Riki Haru IRT</span>
</div>
</div>
</div>
{/*  JLPT Exam Matrix Header & 3 Column Cards  */}
<div className="space-y-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="w-2.5 h-6 rounded-full bg-brand"></span>
<h2 className="text-[18px] font-bold text-charcoal">
              Ma trận Cấu trúc Đề thi <span className="text-[14px] font-normal text-charcoal-muted">—</span>
</h2>
</div>
<span className="text-[12px] font-mono text-charcoal-muted bg-surface px-3 py-1 rounded-full border border-borderline">
            —
          </span>
</div>
{/*  3 Matrix Modules (3 Columns)  */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
{/*  Matrix Module 1: Kiến thức ngôn ngữ  */}
<div className="flex flex-col rounded-2xl bg-surface border border-borderline shadow-card hover:shadow-card-hover transition-all overflow-hidden">
{/*  Header  */}
<div className="p-5 bg-canvas border-b border-borderline flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-[16px] shadow-sm">
                  —
                </div>
<div>
<span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">—</span>
<h3 className="text-[16px] font-extrabold text-charcoal">—</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[12px] font-bold">
                —
              </span>
</div>
{/*  Body Content  */}
<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">schedule</span> Thời gian làm bài</span>
<span className="font-bold text-charcoal font-mono">—</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">quiz</span> Số lượng câu hỏi</span>
<span className="font-bold text-charcoal">—</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">equalizer</span> Độ khó mục tiêu</span>
<span className="px-2 py-0.5 rounded bg-canvas border border-borderline text-charcoal text-[11px] font-semibold">—</span>
</div>
{/*  Weight distribution bars  */}
<div className="pt-2">
<div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-light mb-2">Phân bổ trọng số thành phần</div>
<div className="space-y-2">
<div>
<div className="flex justify-between text-[11px] text-charcoal mb-1">
<span>—</span>
<span className="font-mono font-bold text-brand">—</span>
</div>
<div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-borderline/50">
<div className="h-full bg-brand rounded-full" style={{ width: "0%" }}></div>
</div>
</div>
<div>
<div className="flex justify-between text-[11px] text-charcoal mb-1">
<span>—</span>
<span className="font-mono font-bold text-brand">—</span>
</div>
<div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-borderline/50">
<div className="h-full bg-sakura-300 rounded-full" style={{ width: "0%" }}></div>
</div>
</div>
<div>
<div className="flex justify-between text-[11px] text-charcoal mb-1">
<span>—</span>
<span className="font-mono font-bold text-brand">—</span>
</div>
<div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-borderline/50">
<div className="h-full bg-sakura-200 rounded-full" style={{ width: "0%" }}></div>
</div>
</div>
</div>
</div>
</div>
{/*  Module Footer  */}
<div className="pt-4 border-t border-borderline flex items-center justify-between">
<span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">check_circle</span> —
                </span>
<button className="px-3 py-1.5 rounded-lg bg-sakura-50 hover:bg-sakura-100 text-brand text-[12px] font-bold transition-colors">
                  Chỉnh sửa chi tiết
                </button>
</div>
</div>
</div>
{/*  Matrix Module 2: Đọc hiểu Dokkai  */}
<div className="flex flex-col rounded-2xl bg-surface border border-borderline shadow-card hover:shadow-card-hover transition-all overflow-hidden">
{/*  Header  */}
<div className="p-5 bg-canvas border-b border-borderline flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-charcoal text-white flex items-center justify-center font-bold text-[16px] shadow-sm">
                  —
                </div>
<div>
<span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">—</span>
<h3 className="text-[16px] font-extrabold text-charcoal">—</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[12px] font-bold">
                —
              </span>
</div>
{/*  Body Content  */}
<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">schedule</span> Thời gian làm bài</span>
<span className="font-bold text-charcoal font-mono">—</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">menu_book</span> Quy cách bài đọc</span>
<span className="font-bold text-charcoal">—</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">topic</span> Chủ đề văn bản</span>
<span className="text-charcoal font-medium truncate max-w-[170px]">Ikebana, Đời sống Nhật</span>
</div>
{/*  Text Length Specs  */}
<div className="pt-2">
<div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-light mb-2">Cấu trúc độ dài văn bản</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-borderline/70 text-[12px]">
<span className="text-charcoal">—</span>
<span className="font-mono text-brand font-bold">—</span>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-borderline/70 text-[12px]">
<span className="text-charcoal">—</span>
<span className="font-mono text-brand font-bold">—</span>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-borderline/70 text-[12px]">
<span className="text-charcoal">Trường văn & Tra cứu thông tin</span>
<span className="font-mono text-brand font-bold">—</span>
</div>
</div>
</div>
</div>
{/*  Module Footer  */}
<div className="pt-4 border-t border-borderline flex items-center justify-between">
<span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">check_circle</span> Bản quyền trích lục sạch
                </span>
<button className="px-3 py-1.5 rounded-lg bg-sakura-50 hover:bg-sakura-100 text-brand text-[12px] font-bold transition-colors">
                  Chỉnh sửa bài đọc
                </button>
</div>
</div>
</div>
{/*  Matrix Module 3: Nghe hiểu Choukai  */}
<div className="flex flex-col rounded-2xl bg-surface border border-borderline shadow-card hover:shadow-card-hover transition-all overflow-hidden">
{/*  Header  */}
<div className="p-5 bg-canvas border-b border-borderline flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-sakura-300 text-white flex items-center justify-center font-bold text-[16px] shadow-sm">
                  —
                </div>
<div>
<span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">—</span>
<h3 className="text-[16px] font-extrabold text-charcoal">—</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[12px] font-bold">
                —
              </span>
</div>
{/*  Body Content  */}
<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">schedule</span> Thời lượng ghi âm</span>
<span className="font-bold text-charcoal font-mono">—</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">mic</span> Tiêu chuẩn Audio</span>
<span className="px-2 py-0.5 rounded bg-sakura-100 text-brand text-[11px] font-bold">Studio Master NHK</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">record_voice_over</span> Giọng đọc bản xứ</span>
<span className="text-charcoal font-medium">Tokyo Accent (Nam & Nữ)</span>
</div>
{/*  Audio Track Player Visual  */}
<div className="pt-2 space-y-2">
<div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-light mb-1">Trình phát & Phân đoạn âm thanh</div>
<div className="p-2.5 rounded-xl bg-canvas border border-borderline flex items-center gap-3">
<button className="w-8 h-8 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center shrink-0 shadow-sm transition-colors">
<span className="material-symbols-outlined text-[18px]">play_arrow</span>
</button>
<div className="flex-1 min-w-0">
<div className="flex justify-between font-mono text-[11px] text-charcoal-muted mb-1">
<span className="truncate font-medium">—</span>
<span className="text-brand font-semibold">—</span>
</div>
<div className="w-full h-1.5 bg-borderline rounded-full overflow-hidden">
<div className="h-full bg-brand rounded-full" style={{ width: "0%" }}></div>
</div>
</div>
</div>
<div className="flex justify-between text-[10px] text-charcoal-muted px-1">
<span>—</span>
<span>—</span>
<span>—</span>
</div>
</div>
</div>
{/*  Module Footer  */}
<div className="pt-4 border-t border-borderline flex items-center justify-between">
<span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">graphic_eq</span> —
                </span>
<button className="px-3 py-1.5 rounded-lg bg-sakura-50 hover:bg-sakura-100 text-brand text-[12px] font-bold transition-colors">
                  Kiểm tra âm thanh
                </button>
</div>
</div>
</div>
</div>
</div>
{/*  12-Column Grid: Config Engine (7 cols) + AI IRT Distribution Simulator (5 cols)  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
{/*  Config Panel (Col 1-7)  */}
<div className="lg:col-span-7 flex flex-col rounded-2xl bg-surface border border-borderline p-6 shadow-card space-y-5">
<div className="flex items-center justify-between pb-3 border-b border-borderline">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-sakura-50 text-brand flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">tune</span>
</div>
<div>
<h3 className="text-[16px] font-bold text-charcoal">Cấu hình Khảo thí & Công nghệ Phòng thi</h3>
<span className="text-[12px] text-charcoal-muted">—</span>
</div>
</div>
<div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
<span>Chống gian lận: Bật</span>
</div>
</div>
{/*  Feature Toggles List  */}
<div className="space-y-3">
{/*  Toggle 1: IRT  */}
<div className="p-3.5 rounded-xl bg-canvas border border-borderline flex items-start justify-between gap-4">
<div className="flex gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 text-brand flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[18px]">psychology</span>
</div>
<div className="space-y-0.5">
<div className="flex items-center gap-2">
<span className="text-[13px] font-bold text-charcoal">—</span>
<span className="px-1.5 py-0.2 rounded bg-sakura-200 text-sakura-900 text-[10px] font-bold font-mono uppercase">Độc quyền</span>
</div>
<p className="text-[12px] text-charcoal-muted leading-relaxed">—</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input disabled className="sr-only peer" type="checkbox" />
<div className="w-10 h-5.5 bg-borderline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-brand"></div>
</label>
</div>
{/*  Toggle 2: Timer  */}
<div className="p-3.5 rounded-xl bg-canvas border border-borderline flex items-start justify-between gap-4">
<div className="flex gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 text-brand flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[18px]">av_timer</span>
</div>
<div className="space-y-0.5">
<span className="text-[13px] font-bold text-charcoal">—</span>
<p className="text-[12px] text-charcoal-muted leading-relaxed">—</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input disabled className="sr-only peer" type="checkbox" />
<div className="w-10 h-5.5 bg-borderline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-brand"></div>
</label>
</div>
{/*  Toggle 3: Detailed Feedback  */}
<div className="p-3.5 rounded-xl bg-canvas border border-borderline flex items-start justify-between gap-4">
<div className="flex gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 text-brand flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[18px]">insights</span>
</div>
<div className="space-y-0.5">
<span className="text-[13px] font-bold text-charcoal">—</span>
<p className="text-[12px] text-charcoal-muted leading-relaxed">—</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input disabled className="sr-only peer" type="checkbox" />
<div className="w-10 h-5.5 bg-borderline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-brand"></div>
</label>
</div>
{/*  Toggle 4: Random question sequence  */}
<div className="p-3.5 rounded-xl bg-canvas border border-borderline flex items-start justify-between gap-4">
<div className="flex gap-3">
<div className="w-8 h-8 rounded-lg bg-sakura-100 text-brand flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[18px]">shuffle</span>
</div>
<div className="space-y-0.5">
<span className="text-[13px] font-bold text-charcoal">—</span>
<p className="text-[12px] text-charcoal-muted leading-relaxed">—</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input disabled className="sr-only peer" type="checkbox" />
<div className="w-10 h-5.5 bg-borderline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-brand"></div>
</label>
</div>
</div>
</div>
{/*  AI IRT Simulator (Col 8-12)  */}
<div className="lg:col-span-5 flex flex-col rounded-2xl bg-surface border border-borderline p-6 shadow-card justify-between space-y-4">
<div className="space-y-1">
<div className="flex items-center justify-between">
<span className="text-[11px] font-bold uppercase tracking-wider text-brand">Mô phỏng Phân phối Điểm</span>
<span className="text-[11px] font-mono text-charcoal-light bg-canvas px-2 py-0.5 rounded border border-borderline">—</span>
</div>
<h4 className="text-[16px] font-bold text-charcoal">Đường cong Phân hóa Năng lực</h4>
<p className="text-[12px] text-charcoal-muted">—</p>
</div>
{/*  Curve Graphic Box  */}
<div className="p-4 rounded-xl bg-canvas border border-borderline flex flex-col items-center">
<div className="w-full h-40 relative flex items-end">
{/*  SVG Gaussian Bell Curve  */}
<svg className="w-full h-full text-brand" fill="none" preserveAspectRatio="none" viewBox="0 0 320 120">
<defs>
<linearGradient id="neoSakuraGrad" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="#E05A7A" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#E05A7A" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
<path d="" fill="none" stroke="#E05A7A" strokeWidth="2.5"></path>
<path d="" fill="url(#neoSakuraGrad)"></path>
{/*  Cut-off Line: 95 Passing score  */}
<line stroke="#059669" strokeDasharray="3 3" strokeWidth="1.8" x1="175" x2="175" y1="12" y2="120"></line>
</svg>
{/*  Floating Benchmark Badge  */}
<div className="absolute top-2 left-[55%] -translate-x-1/2 px-2.5 py-1 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold shadow-sm">
                —
              </div>
</div>
<div className="w-full flex justify-between font-mono text-[11px] text-charcoal-muted pt-2 border-t border-borderline/60 mt-1">
<span>—</span>
<span className="font-bold text-charcoal">—</span>
<span>—</span>
</div>
</div>
{/*  AI Expert Recommendation Card  */}
<div className="p-3.5 rounded-xl bg-sakura-50 border border-sakura-200 flex items-start gap-3">
<div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
</div>
<div className="text-[12px] text-charcoal leading-relaxed">
<strong className="font-bold text-brand">Khuyến nghị Ban Chuyên môn:</strong> —
            </div>
</div>
</div>
</div>
{/*  Published Test Registry (Data Table)  */}
<div className="flex flex-col rounded-2xl bg-surface border border-borderline p-6 shadow-card space-y-5">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderline">
<div>
<div className="flex items-center gap-2.5">
<h3 className="text-[18px] font-bold text-charcoal">Đề thi Đột Phá đã Phát hành</h3>
<span className="px-2.5 py-0.5 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[11px] font-bold">—</span>
</div>
<p className="text-[12px] text-charcoal-muted mt-0.5">—</p>
</div>
{/*  Controls  */}
<div className="flex items-center gap-2">
<div className="relative">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light text-[17px]">filter_list</span>
<select className="bg-canvas border border-borderline text-charcoal text-[13px] pl-9 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-brand cursor-pointer">
<option>Tất cả kỳ thi (2024-2025)</option>
<option>Đề cao điểm (&gt;150/180)</option>
<option>Đề có độ phân hóa cao</option>
</select>
</div>
<button className="p-2 rounded-lg bg-canvas hover:bg-surface border border-borderline text-charcoal-muted hover:text-brand transition-colors">
<span className="material-symbols-outlined text-[19px]">download</span>
</button>
</div>
</div>
{/*  Table View  */}
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-canvas text-charcoal-muted text-[11px] font-bold uppercase tracking-wider border-y border-borderline">
<th className="py-3 px-4 rounded-l-lg">Mã Đề & Tên Đề Thi</th>
<th className="py-3 px-4">Thời lượng</th>
<th className="py-3 px-4">Số lượt học viên</th>
<th className="py-3 px-4">Điểm trung bình</th>
<th className="py-3 px-4">Tỷ lệ đỗ thực tế</th>
<th className="py-3 px-4">Trạng thái phòng thi</th>
<th className="py-3 px-4 rounded-r-lg text-right">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-borderline/60 text-[13px]"><tr><td colSpan={20} className="p-6 text-center">—</td></tr></tbody>
</table>
</div>
{/*  Pagination & Summary  */}
<Pagination
  currentPage={examPage}
  totalPages={1}
  pageSize={examPageSize}
  totalItems={0}
  onPageChange={setExamPage}
  onPageSizeChange={setExamPageSize}
  pageSizeOptions={[5, 10, 20]}
  itemLabel="bộ đề thi thử"
  variant="sakura"
/>
</div>

</main>
</div>


    </div>

</CmsShell>
);
}
