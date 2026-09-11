import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function ExamBuilder() {
  const { pathname } = useLocation();
  return (
    <CmsShell pathname={pathname} breadcrumb="Xây đề thi">
<div className="min-h-screen bg-canvas text-charcoal antialiased flex min-h-screen" data-page="ExamBuilder" data-shell-unified="1">


{/*  Left Sidebar (256px Fixed)  */}





{/*  Main Container Wrapper  */}


<div className="pl-0 w-full flex flex-col min-h-screen">
{/*  Topbar (Fixed at top, offset by sidebar 256px)  */}

{/*  Main Content Canvas (1440px Grid Standard Container)  */}
<main className="flex-1 px-8 py-8 w-full max-w-[1440px] mx-auto space-y-7">
{/*  Breadcrumbs & Status Bar  */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-2 text-[12px] text-charcoal-muted">
<a className="hover:text-brand transition-colors" href="#">Tổng quan CMS</a>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<a className="hover:text-brand transition-colors" href="#">Quản lý Khảo thí</a>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="text-charcoal font-semibold">Xây dựng Đề thi N3</span>
</div>
<div className="flex items-center gap-2 text-[12px] font-mono text-charcoal-muted">
<span>Phiên bản ma trận: <strong>JEES-2025.1</strong></span>
<span>•</span>
<span>Cập nhật: Hôm nay 09:42</span>
</div>
</div>
{/*  Master Header Hero Card  */}
<div className="relative overflow-hidden rounded-2xl bg-surface border border-borderline p-7 shadow-card">
{/*  Sakura Decorative Watermark  */}
<div className="absolute right-10 -top-6 text-[110px] font-bold text-brand opacity-[0.04] pointer-events-none select-none font-sans">
          桜試験
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
                ID: N3-EX-2025-005
              </span>
<span className="w-1 h-1 rounded-full bg-borderline"></span>
<div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Đang thẩm định chuyên môn
              </div>
</div>
<h1 className="text-[26px] font-extrabold text-charcoal tracking-tight flex items-center gap-2">
              Thiết lập Đề thi thử JLPT N3 Đột Phá <span className="text-brand font-mono font-bold">#N3-EX-005</span>
</h1>
<p className="text-[14px] text-charcoal-muted leading-relaxed">
              Đề chuẩn hoá ma trận phân tầng năng lực theo khung khảo thí JEES (The Japan Educational Exchanges and Services) với thuật toán cân bằng độ khó đa thông số IRT Riki Haru v3.2.
            </p>
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
<span className="text-[32px] font-extrabold text-charcoal tracking-tight">140</span>
<span className="text-[13px] font-medium text-charcoal-muted">phút (3 ca thi)</span>
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
<span className="text-[32px] font-extrabold text-charcoal tracking-tight">180</span>
<span className="text-[13px] font-medium text-charcoal-muted">điểm chuẩn hóa</span>
</div>
<div className="text-[11px] text-charcoal-muted flex items-center gap-1">
<span>Điểm sàn đỗ:</span>
<strong className="text-charcoal font-bold">95/180</strong>
<span className="text-[10px] text-charcoal-light">(Mỗi phần ≥ 19)</span>
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
<span className="text-[32px] font-extrabold text-charcoal tracking-tight">102</span>
<span className="text-[13px] font-medium text-charcoal-muted">câu hỏi khảo thí</span>
</div>
<div className="text-[11px] text-brand font-semibold flex items-center gap-1.5 bg-sakura-50 px-2.5 py-1 rounded-md w-fit">
<span className="material-symbols-outlined text-[14px]">verified</span>
<span>Phủ 100% Mondai 1 - 5</span>
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
<span className="text-[32px] font-extrabold text-brand tracking-tight">78.4%</span>
<span className="text-[12px] font-mono text-charcoal-muted">(±1.8% dung sai)</span>
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
              Ma trận Cấu trúc Đề thi <span className="text-[14px] font-normal text-charcoal-muted">(JLPT N3 Examination Matrix)</span>
</h2>
</div>
<span className="text-[12px] font-mono text-charcoal-muted bg-surface px-3 py-1 rounded-full border border-borderline">
            Đồng bộ tự động với Ngân hàng câu hỏi v4.1
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
                  一
                </div>
<div>
<span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">Phần 1: Kiến thức ngôn ngữ</span>
<h3 className="text-[16px] font-extrabold text-charcoal">文字・語彙・文法</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[12px] font-bold">
                60 Điểm
              </span>
</div>
{/*  Body Content  */}
<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">schedule</span> Thời gian làm bài</span>
<span className="font-bold text-charcoal font-mono">30 phút</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">quiz</span> Số lượng câu hỏi</span>
<span className="font-bold text-charcoal">35 câu (Mondai 1 → 5)</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">equalizer</span> Độ khó mục tiêu</span>
<span className="px-2 py-0.5 rounded bg-canvas border border-borderline text-charcoal text-[11px] font-semibold">Trung bình khá (0.62)</span>
</div>
{/*  Weight distribution bars  */}
<div className="pt-2">
<div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-light mb-2">Phân bổ trọng số thành phần</div>
<div className="space-y-2">
<div>
<div className="flex justify-between text-[11px] text-charcoal mb-1">
<span>Cách đọc Kanji & Đổi chữ Hán (Mondai 1-2)</span>
<span className="font-mono font-bold text-brand">14 câu</span>
</div>
<div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-borderline/50">
<div className="h-full bg-brand rounded-full" style={{ width: "40%" }}></div>
</div>
</div>
<div>
<div className="flex justify-between text-[11px] text-charcoal mb-1">
<span>Cấu tạo từ vựng & Ngữ cảnh (Mondai 3-4)</span>
<span className="font-mono font-bold text-brand">11 câu</span>
</div>
<div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-borderline/50">
<div className="h-full bg-sakura-300 rounded-full" style={{ width: "32%" }}></div>
</div>
</div>
<div>
<div className="flex justify-between text-[11px] text-charcoal mb-1">
<span>Ngữ nghĩa gần nhất & Ngữ cảnh dùng từ (M5)</span>
<span className="font-mono font-bold text-brand">10 câu</span>
</div>
<div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-borderline/50">
<div className="h-full bg-sakura-200 rounded-full" style={{ width: "28%" }}></div>
</div>
</div>
</div>
</div>
</div>
{/*  Module Footer  */}
<div className="pt-4 border-t border-borderline flex items-center justify-between">
<span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">check_circle</span> Đã thẩm định 35/35
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
                  二
                </div>
<div>
<span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">Phần 2: Đọc hiểu Dokkai</span>
<h3 className="text-[16px] font-extrabold text-charcoal">読解 (Dokkai)</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[12px] font-bold">
                60 Điểm
              </span>
</div>
{/*  Body Content  */}
<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">schedule</span> Thời gian làm bài</span>
<span className="font-bold text-charcoal font-mono">70 phút</span>
</div>
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">menu_book</span> Quy cách bài đọc</span>
<span className="font-bold text-charcoal">16 văn bản khảo sát</span>
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
<span className="text-charcoal">Đoản văn (150-200 từ)</span>
<span className="font-mono text-brand font-bold">4 bài (4 câu)</span>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-borderline/70 text-[12px]">
<span className="text-charcoal">Trung văn Ikebana (350 từ)</span>
<span className="font-mono text-brand font-bold">2 bài (6 câu)</span>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-borderline/70 text-[12px]">
<span className="text-charcoal">Trường văn & Tra cứu thông tin</span>
<span className="font-mono text-brand font-bold">2 bài (6 câu)</span>
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
                  三
                </div>
<div>
<span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">Phần 3: Nghe hiểu Choukai</span>
<h3 className="text-[16px] font-extrabold text-charcoal">聴解 (Choukai)</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[12px] font-bold">
                60 Điểm
              </span>
</div>
{/*  Body Content  */}
<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
<div className="space-y-2.5">
<div className="flex items-center justify-between text-[13px] text-charcoal-muted pb-1.5 border-b border-borderline/60">
<span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand">schedule</span> Thời lượng ghi âm</span>
<span className="font-bold text-charcoal font-mono">40 phút (Không pause)</span>
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
<span className="truncate font-medium">N3_Choukai_Master_Final.flac</span>
<span className="text-brand font-semibold">40:18</span>
</div>
<div className="w-full h-1.5 bg-borderline rounded-full overflow-hidden">
<div className="h-full bg-brand rounded-full" style={{ width: "42%" }}></div>
</div>
</div>
</div>
<div className="flex justify-between text-[10px] text-charcoal-muted px-1">
<span>M1: Trọng tâm</span>
<span>M2: Tóm lược</span>
<span>M3: Phản xạ nhanh</span>
</div>
</div>
</div>
{/*  Module Footer  */}
<div className="pt-4 border-t border-borderline flex items-center justify-between">
<span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">graphic_eq</span> 48kHz / 24bit Hi-Res
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
<span className="text-[12px] text-charcoal-muted">Chế độ kiểm định tiêu chuẩn kỳ thi thật</span>
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
<span className="text-[13px] font-bold text-charcoal">Thuật toán Riki Haru AI Scaled Scoring (IRT)</span>
<span className="px-1.5 py-0.2 rounded bg-sakura-200 text-sakura-900 text-[10px] font-bold font-mono uppercase">Độc quyền</span>
</div>
<p className="text-[12px] text-charcoal-muted leading-relaxed">
                    Mô phỏng chính xác thang điểm Scaled Score (Item Response Theory) của JEES thay vì cách tính điểm thô thông thường (Raw Score).
                  </p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input checked className="sr-only peer" type="checkbox" />
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
<span className="text-[13px] font-bold text-charcoal">Đồng hồ đếm ngược nghiêm ngặt & Tự động nộp bài</span>
<p className="text-[12px] text-charcoal-muted leading-relaxed">
                    Khóa bài thi tức thì khi hết 140 phút, đồng bộ thời gian từ máy chủ NTP chống can thiệp đồng hồ thiết bị học viên.
                  </p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input checked className="sr-only peer" type="checkbox" />
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
<span className="text-[13px] font-bold text-charcoal">Phân tích chuyên sâu & Gợi ý lộ trình bù khuyết điểm</span>
<p className="text-[12px] text-charcoal-muted leading-relaxed">
                    Hiển thị lời giải thích ngữ pháp, từ điển ngữ cảnh và tự động sinh lộ trình học cá nhân hóa 7 ngày cho các phần bị mất điểm.
                  </p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input checked className="sr-only peer" type="checkbox" />
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
<span className="text-[13px] font-bold text-charcoal">Xáo trộn ngẫu nhiên thứ tự đáp án (A-B-C-D)</span>
<p className="text-[12px] text-charcoal-muted leading-relaxed">
                    Giữ nguyên cấu trúc ngữ cảnh bài đọc nhưng đảo ngẫu nhiên vị trí đáp án để ngăn chặn hành vi chia sẻ bài giải trực tiếp.
                  </p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
<input checked className="sr-only peer" type="checkbox" />
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
<span className="text-[11px] font-mono text-charcoal-light bg-canvas px-2 py-0.5 rounded border border-borderline">v3.2 Gaussian IRT</span>
</div>
<h4 className="text-[16px] font-bold text-charcoal">Đường cong Phân hóa Năng lực</h4>
<p className="text-[12px] text-charcoal-muted">
              Dựa trên tập dữ liệu chuẩn hoá từ 54,000+ sĩ tử tại các kỳ thi chính thức JEES 2021-2024.
            </p>
</div>
{/*  Curve Graphic Box  */}
<div className="p-4 rounded-xl bg-canvas border border-borderline flex flex-col items-center">
<div className="w-full h-40 relative flex items-end">
{/*  SVG Gaussian Bell Curve  */}
<svg className="w-full h-full text-brand" fill="none" preserveAspectRatio="none" viewBox="0 0 320 120">
<defs>
<linearGradient id="neoSakuraGrad" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#E05A7A" stop-opacity="0.25"></stop>
<stop offset="100%" stop-color="#E05A7A" stop-opacity="0.0"></stop>
</linearGradient>
</defs>
<path d="M 0 115 Q 80 112 115 70 Q 160 10 205 70 Q 240 112 320 115" fill="none" stroke="#E05A7A" strokeWidth="2.5"></path>
<path d="M 0 115 Q 80 112 115 70 Q 160 10 205 70 Q 240 112 320 115 L 320 120 L 0 120 Z" fill="url(#neoSakuraGrad)"></path>
{/*  Cut-off Line: 95 Passing score  */}
<line stroke="#059669" stroke-dasharray="3 3" strokeWidth="1.8" x1="175" x2="175" y1="12" y2="120"></line>
</svg>
{/*  Floating Benchmark Badge  */}
<div className="absolute top-2 left-[55%] -translate-x-1/2 px-2.5 py-1 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold shadow-sm">
                Điểm Đỗ: 95/180
              </div>
</div>
<div className="w-full flex justify-between font-mono text-[11px] text-charcoal-muted pt-2 border-t border-borderline/60 mt-1">
<span>0 (Cực khó)</span>
<span className="font-bold text-charcoal">Điểm TB: 108</span>
<span>180 (Hoàn hảo)</span>
</div>
</div>
{/*  AI Expert Recommendation Card  */}
<div className="p-3.5 rounded-xl bg-sakura-50 border border-sakura-200 flex items-start gap-3">
<div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
</div>
<div className="text-[12px] text-charcoal leading-relaxed">
<strong className="font-bold text-brand">Khuyến nghị Ban Chuyên môn:</strong> Tăng tỷ lệ bẫy liên từ ở Mondai 3 để nâng hệ số phân hóa học viên giỏi đạt mức kỳ vọng 78.4%.
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
<span className="px-2.5 py-0.5 rounded-full bg-sakura-100 border border-sakura-200 text-brand font-mono text-[11px] font-bold">Series N3</span>
</div>
<p className="text-[12px] text-charcoal-muted mt-0.5">Bảng giám sát thống kê lượt thi trực tiếp từ hệ thống phòng thi ảo</p>
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
<tbody className="divide-y divide-borderline/60 text-[13px]">
{/*  Row 1  */}
<tr className="hover:bg-canvas/60 transition-colors">
<td className="py-4 px-4">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-sakura-100 text-brand border border-sakura-200 flex items-center justify-center font-mono font-bold text-[13px]">
                      04
                    </div>
<div className="flex flex-col">
<span className="font-bold text-charcoal hover:text-brand transition-colors cursor-pointer">Đề thi Đột Phá N3 #N3-EX-004 (Bản chuẩn)</span>
<span className="text-[11px] font-mono text-charcoal-muted">Xuất bản: 15/02/2025 • Chuẩn JEES Tokyo</span>
</div>
</div>
</td>
<td className="py-4 px-4 font-mono text-[13px] text-charcoal-muted">140 phút</td>
<td className="py-4 px-4">
<div className="flex flex-col">
<span className="font-bold text-charcoal font-mono">54,120</span>
<span className="text-[11px] text-emerald-600 font-semibold">Đã hoàn thành</span>
</div>
</td>
<td className="py-4 px-4">
<div className="flex items-baseline gap-1">
<span className="font-bold text-charcoal font-mono text-[14px]">108.4</span>
<span className="text-[11px] text-charcoal-light">/ 180</span>
</div>
</td>
<td className="py-4 px-4">
<div className="flex items-center gap-2.5">
<span className="font-bold text-emerald-600 font-mono text-[13px]">72.6%</span>
<div className="w-20 h-2 bg-canvas border border-borderline rounded-full overflow-hidden">
<div className="h-full bg-emerald-500 rounded-full" style={{ width: "72.6%" }}></div>
</div>
</div>
</td>
<td className="py-4 px-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang mở tự do
                  </span>
</td>
<td className="py-4 px-4 text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg hover:bg-canvas text-charcoal-muted hover:text-brand transition-colors" title="Báo cáo chi tiết">
<span className="material-symbols-outlined text-[18px]">analytics</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-charcoal-muted hover:text-brand transition-colors" title="Chỉnh sửa đề thi">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
</div>
</td>
</tr>
{/*  Row 2  */}
<tr className="hover:bg-canvas/60 transition-colors">
<td className="py-4 px-4">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-canvas text-charcoal-muted border border-borderline flex items-center justify-center font-mono font-bold text-[13px]">
                      03
                    </div>
<div className="flex flex-col">
<span className="font-bold text-charcoal hover:text-brand transition-colors cursor-pointer">Đề thi Đột Phá N3 #N3-EX-003 (Tập trung Dokkai)</span>
<span className="text-[11px] font-mono text-charcoal-muted">Xuất bản: 10/01/2025 • Đề phân hóa</span>
</div>
</div>
</td>
<td className="py-4 px-4 font-mono text-[13px] text-charcoal-muted">140 phút</td>
<td className="py-4 px-4">
<div className="flex flex-col">
<span className="font-bold text-charcoal font-mono">48,930</span>
<span className="text-[11px] text-emerald-600 font-semibold">Đã hoàn thành</span>
</div>
</td>
<td className="py-4 px-4">
<div className="flex items-baseline gap-1">
<span className="font-bold text-charcoal font-mono text-[14px]">102.1</span>
<span className="text-[11px] text-charcoal-light">/ 180</span>
</div>
</td>
<td className="py-4 px-4">
<div className="flex items-center gap-2.5">
<span className="font-bold text-brand font-mono text-[13px]">64.8%</span>
<div className="w-20 h-2 bg-canvas border border-borderline rounded-full overflow-hidden">
<div className="h-full bg-brand rounded-full" style={{ width: "64.8%" }}></div>
</div>
</div>
</td>
<td className="py-4 px-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas text-charcoal-muted border border-borderline text-[11px] font-semibold">
                    Đóng lượt mới
                  </span>
</td>
<td className="py-4 px-4 text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg hover:bg-canvas text-charcoal-muted hover:text-brand transition-colors" title="Báo cáo chi tiết">
<span className="material-symbols-outlined text-[18px]">analytics</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-charcoal-muted hover:text-brand transition-colors" title="Chỉnh sửa đề thi">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
</div>
</td>
</tr>
{/*  Row 3  */}
<tr className="hover:bg-canvas/60 transition-colors">
<td className="py-4 px-4">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-sakura-100 text-brand border border-sakura-200 flex items-center justify-center font-mono font-bold text-[13px]">
                      02
                    </div>
<div className="flex flex-col">
<span className="font-bold text-charcoal hover:text-brand transition-colors cursor-pointer">Đề thi Đột Phá N3 #N3-EX-002 (Bẫy Choukai & Moji)</span>
<span className="text-[11px] font-mono text-charcoal-muted">Xuất bản: 12/12/2024 • Chuẩn JEES Tokyo</span>
</div>
</div>
</td>
<td className="py-4 px-4 font-mono text-[13px] text-charcoal-muted">140 phút</td>
<td className="py-4 px-4">
<div className="flex flex-col">
<span className="font-bold text-charcoal font-mono">61,400</span>
<span className="text-[11px] text-emerald-600 font-semibold">Đã hoàn thành</span>
</div>
</td>
<td className="py-4 px-4">
<div className="flex items-baseline gap-1">
<span className="font-bold text-charcoal font-mono text-[14px]">111.5</span>
<span className="text-[11px] text-charcoal-light">/ 180</span>
</div>
</td>
<td className="py-4 px-4">
<div className="flex items-center gap-2.5">
<span className="font-bold text-emerald-600 font-mono text-[13px]">75.2%</span>
<div className="w-20 h-2 bg-canvas border border-borderline rounded-full overflow-hidden">
<div className="h-full bg-emerald-500 rounded-full" style={{ width: "75.2%" }}></div>
</div>
</div>
</td>
<td className="py-4 px-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang mở tự do
                  </span>
</td>
<td className="py-4 px-4 text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg hover:bg-canvas text-charcoal-muted hover:text-brand transition-colors" title="Báo cáo chi tiết">
<span className="material-symbols-outlined text-[18px]">analytics</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-charcoal-muted hover:text-brand transition-colors" title="Chỉnh sửa đề thi">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  Pagination & Summary  */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[12px] text-charcoal-muted border-t border-borderline">
<span>Hiển thị 3 trong tổng số 18 bộ đề thi thử N3 đã lưu trữ trong kho học liệu</span>
<div className="flex items-center gap-1">
<button className="px-3 py-1 rounded-lg bg-canvas hover:bg-surface border border-borderline text-charcoal font-medium transition-colors">Trước</button>
<button className="px-3 py-1 rounded-lg bg-brand text-white font-bold shadow-sm">1</button>
<button className="px-3 py-1 rounded-lg bg-canvas hover:bg-surface border border-borderline text-charcoal font-medium transition-colors">2</button>
<button className="px-3 py-1 rounded-lg bg-canvas hover:bg-surface border border-borderline text-charcoal font-medium transition-colors">Sau</button>
</div>
</div>
</div>
</main>
</div>


    </div>
  
</CmsShell>
);
}
