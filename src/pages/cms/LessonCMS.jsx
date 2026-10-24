import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CmsShell } from '../../components/shells';
import Pagination from '../../components/Pagination.jsx';

export default function LessonCMS() {
  const { pathname } = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  return (
    <CmsShell pathname={pathname} breadcrumb="Quản lý Bài học">
<div className="bg-canvas font-sans antialiased text-txt-main min-h-screen" data-page="LessonCMS" data-shell-unified="1">


{/*  Desktop Layout Wrapper (Max 1440px with responsive fallback)  */}


<div className="mx-auto max-w-layout flex min-h-screen bg-canvas">
{/*  LEFT SIDEBAR: Chuẩn Desktop 280px  */}

{/*  RIGHT MAIN CONTENT (Desktop 1440px Viewport)  */}
<div className="flex-1 flex flex-col min-w-0">
{/*  TOP NAVBAR  */}

{/*  PAGE MAIN AREA: 12-Column Grid Layout  */}
<main className="p-8">
<p role="status">Mục này chưa có dữ liệu.</p>

<div className="max-w-[1160px] mx-auto flex flex-col gap-6">
{/*  HERO BANNER: 12 Cols Full Width  */}
<div className="relative overflow-hidden rounded-2xl bg-white border border-surface-border p-7 shadow-card">
{/*  Subtle Sakura Petal Micro-Glow Glow Backgrounds  */}
<div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-brand-soft/25 blur-3xl pointer-events-none"></div>
<div className="absolute right-1/4 -bottom-16 w-56 h-56 rounded-full bg-brand-light blur-2xl pointer-events-none"></div>
<div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
<div className="max-w-2xl">
{/*  Breadcrumbs  */}
<div className="flex items-center gap-2 mb-2.5">
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light text-brand text-[11px] font-bold border border-brand-soft/40">
<span className="material-symbols-outlined text-[13px]">spa</span>
<span>—</span>
</span>
<span className="text-[12px] text-txt-light">/</span>
<span className="text-[12px] text-txt-muted font-medium">Kho học liệu chuẩn quốc tế</span>
</div>
{/*  Title & Description  */}
<h1 className="text-[26px] font-bold text-txt-main tracking-tight leading-snug">
                  Quản lý Bài học & Nội dung Đào tạo
                </h1>
<p className="text-[14px] text-txt-muted mt-1.5 leading-relaxed">—</p>
</div>
{/*  Top Actions Buttons  */}
<div className="flex items-center gap-3 shrink-0">
<button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-canvas border border-surface-border text-txt-main font-semibold text-[13px] shadow-sm transition-all hover:border-brand-soft">
<span className="material-symbols-outlined text-[18px] text-txt-muted">upload_file</span>
<span>Nhập dữ liệu Excel/CSV</span>
</button>
<button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-[13px] shadow-md shadow-brand/25 transition-all hover:-translate-y-0.5">
<span className="material-symbols-outlined text-[18px]">add_circle</span>
<span>Thêm bài học mới</span>
</button>
</div>
</div>
{/*  Quick Navigation Sub-Tabs  */}
<div className="relative z-10 flex items-center gap-2 mt-7 pt-5 border-t border-surface-border/60 overflow-x-auto">
<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-[13px] shadow-sm shadow-brand/20">
<span className="material-symbols-outlined text-[17px]">auto_stories</span>
<span>Bài học (Curriculum)</span>
<span className="ml-1 px-2 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">—</span>
</button>
<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-canvas hover:bg-surface-subtle text-txt-muted hover:text-txt-main font-medium text-[13px] border border-surface-border transition-colors">
<span className="material-symbols-outlined text-[17px]">translate</span>
<span>Từ vựng & Hán tự (Goi/Kanji)</span>
</button>
<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-canvas hover:bg-surface-subtle text-txt-muted hover:text-txt-main font-medium text-[13px] border border-surface-border transition-colors">
<span className="material-symbols-outlined text-[17px]">psychology_alt</span>
<span>Ngữ pháp & Mẫu câu (Bunpou)</span>
</button>
<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-canvas hover:bg-surface-subtle text-txt-muted hover:text-txt-main font-medium text-[13px] border border-surface-border transition-colors">
<span className="material-symbols-outlined text-[17px]">quiz</span>
<span>Ngân hàng câu hỏi (Mondai)</span>
<span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-border text-txt-muted text-[10px]">—</span>
</button>
</div>
</div>
{/*  12-COL GRID: 4 KPI CARDS (Col-span-3 each)  */}
<div className="grid grid-cols-12 gap-5">
{/*  Card 1: Col-span-3  */}
<div className="col-span-12 sm:col-span-6 xl:col-span-3 bg-white rounded-2xl border border-surface-border p-5 shadow-card hover:border-brand-soft transition-all">
<div className="flex items-center justify-between">
<div className="w-10 h-10 rounded-xl bg-brand-light border border-brand-soft/50 flex items-center justify-center text-brand">
<span className="material-symbols-outlined text-[20px]">collections_bookmark</span>
</div>
<div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
<span className="material-symbols-outlined text-[14px]">trending_up</span>
<span>—</span>
</div>
</div>
<div className="mt-4">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">Tổng số bài học</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-txt-main leading-tight">—</span>
<span className="text-[12px] text-txt-light">học phần</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50 text-[11px] text-txt-muted">
<span>—</span>
<svg className="w-16 h-4 text-brand opacity-60" fill="none" viewBox="0 0 60 20">
<path d="" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
</svg>
</div>
</div>
{/*  Card 2: Col-span-3  */}
<div className="col-span-12 sm:col-span-6 xl:col-span-3 bg-white rounded-2xl border border-surface-border p-5 shadow-card hover:border-brand-soft transition-all">
<div className="flex items-center justify-between">
<div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
<span className="material-symbols-outlined text-[20px]">verified</span>
</div>
<div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
<span className="material-symbols-outlined text-[13px]">arrow_upward</span>
<span>—</span>
</div>
</div>
<div className="mt-4">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">—</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-txt-main leading-tight">—</span>
<span className="text-[12px] text-emerald-700 font-semibold">Khả dụng</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50">
<div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden mr-2 border border-surface-border/60">
<div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="text-[11px] font-bold text-txt-muted">—</span>
</div>
</div>
{/*  Card 3: Col-span-3  */}
<div className="col-span-12 sm:col-span-6 xl:col-span-3 bg-white rounded-2xl border border-surface-border p-5 shadow-card hover:border-brand-soft transition-all">
<div className="flex items-center justify-between">
<div className="w-10 h-10 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-center text-txt-muted">
<span className="material-symbols-outlined text-[20px]">edit_note</span>
</div>
<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-canvas border border-surface-border text-txt-muted">Giảng viên soạn</span>
</div>
<div className="mt-4">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">—</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-txt-main leading-tight">—</span>
<span className="text-[12px] text-txt-light">đang viết</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50 text-[11px] text-txt-muted">
<span>Chưa vào chuỗi học</span>
<span className="font-semibold text-txt-main">—</span>
</div>
</div>
{/*  Card 4: Col-span-3  */}
<div className="col-span-12 sm:col-span-6 xl:col-span-3 bg-white rounded-2xl border border-surface-border p-5 shadow-card hover:border-brand-soft transition-all">
<div className="flex items-center justify-between">
<div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
<span className="material-symbols-outlined text-[20px]">hourglass_top</span>
</div>
<div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light text-brand font-bold text-[11px] border border-brand-soft/50 animate-pulse">
<span>Ưu tiên cao</span>
</div>
</div>
<div className="mt-4">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">—</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-brand leading-tight">—</span>
<span className="text-[12px] text-brand font-bold">—</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50 text-[11px]">
<span className="text-txt-muted">—</span>
<Link className="text-brand font-bold hover:underline" to="/admin/content-review">Xem ngay →</Link>
</div>
</div>
</div>
{/*  SMART FILTER DECK: 12 Cols Full Width  */}
<div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-4">
{/*  Row 1: Search & Status Dropdown  */}
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
<div className="flex-1 relative">
<span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-light text-[18px]">search</span>
<input className="w-full pl-10 pr-4 py-2 bg-canvas border border-surface-border rounded-xl text-[13px] text-txt-main placeholder:text-txt-light focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="Tìm theo tên bài, Romaji, Kanji hoặc mã bài học (VD: N3-BUN-07)..." type="text" />
</div>
<div className="flex items-center gap-3">
<span className="text-[13px] font-medium text-txt-muted whitespace-nowrap">Trạng thái:</span>
<select className="px-3.5 py-2 bg-canvas border border-surface-border rounded-xl text-[13px] font-medium text-txt-main focus:outline-none focus:border-brand cursor-pointer">
<option value="all">Tất cả trạng thái</option>
<option value="published">Đã xuất bản</option>
<option value="pending">Chờ kiểm duyệt</option>
<option value="draft">Bản nháp</option>
<option value="revision">Cần chỉnh sửa</option>
</select>
<button className="p-2 rounded-xl bg-canvas border border-surface-border hover:bg-surface-subtle text-txt-muted transition-colors" title="Làm mới bộ lọc">
<span className="material-symbols-outlined text-[19px]">filter_alt_off</span>
</button>
</div>
</div>
<div className="h-px bg-surface-border/50"></div>
{/*  Row 2: JLPT Level Multi-Select Pills  */}
<div className="flex flex-wrap items-center gap-2">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light mr-2">Cấp độ JLPT:</span>
<button className="px-3 py-1 rounded-full bg-brand text-white text-[12px] font-bold shadow-sm shadow-brand/25">
                Tất cả
              </button>
<button className="px-3 py-1 rounded-full bg-canvas border border-surface-border hover:border-brand-soft text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
                N5 (Nhập môn)
              </button>
<button className="px-3 py-1 rounded-full bg-canvas border border-surface-border hover:border-brand-soft text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
                N4 (Sơ cấp)
              </button>
<button className="px-3 py-1 rounded-full bg-brand-light border border-brand text-brand font-bold text-[12px] shadow-sm">
                N3 (Trung cấp)
              </button>
<button className="px-3 py-1 rounded-full bg-canvas border border-surface-border hover:border-brand-soft text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
                N2 (Trung - Cao)
              </button>
<button className="px-3 py-1 rounded-full bg-canvas border border-surface-border hover:border-brand-soft text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
                N1 (Cao cấp)
              </button>
</div>
{/*  Row 3: Skill Types  */}
<div className="flex flex-wrap items-center gap-2">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light mr-2">Phân loại kỹ năng:</span>
<button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-subtle border border-surface-border text-txt-main text-[12px] font-bold">
<span className="material-symbols-outlined text-[15px] text-brand">category</span>
<span>Toàn bộ kỹ năng</span>
</button>
<button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
<span className="material-symbols-outlined text-[15px] text-txt-muted">psychology</span>
<span>Ngữ pháp (Bunpou)</span>
</button>
<button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
<span className="material-symbols-outlined text-[15px] text-txt-muted">translate</span>
<span>Từ vựng (Goi)</span>
</button>
<button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
<span className="material-symbols-outlined text-[15px] text-txt-muted">brush</span>
<span>Hán tự (Kanji)</span>
</button>
<button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
<span className="material-symbols-outlined text-[15px] text-txt-muted">menu_book</span>
<span>Đọc hiểu (Dokkai)</span>
</button>
<button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted hover:text-txt-main text-[12px] font-medium transition-colors">
<span className="material-symbols-outlined text-[15px] text-txt-muted">headphones</span>
<span>Nghe hiểu (Choukai)</span>
</button>
</div>
</div>
{/*  LESSON DATA TABLE CANVAS: 12 Cols Full Width  */}
<div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
{/*  Table Header Control Bar  */}
<div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-surface-border bg-canvas/60">
<div className="flex items-center gap-2.5 mb-2 sm:mb-0">
<h3 className="text-[15px] font-bold text-txt-main">Danh sách bài học hiển thị</h3>
<span className="px-2.5 py-0.5 rounded-full bg-brand-light border border-brand-soft/40 text-brand text-[11px] font-bold">—</span>
</div>
<div className="flex items-center gap-2.5">
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-surface-border hover:bg-canvas text-txt-main text-[12px] font-semibold transition-colors">
<span className="material-symbols-outlined text-[16px] text-txt-muted">sort</span>
<span>Sắp xếp: Mới nhất</span>
</button>
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-surface-border hover:bg-canvas text-txt-main text-[12px] font-semibold transition-colors">
<span className="material-symbols-outlined text-[16px] text-txt-muted">view_column</span>
<span>Tùy chỉnh cột</span>
</button>
</div>
</div>
{/*  Table Responsive Viewport  */}
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-surface-border bg-canvas/30 text-[11px] font-bold uppercase tracking-wider text-txt-light">
<th className="py-3.5 px-4 w-12 text-center">
<input className="rounded border-surface-border text-brand focus:ring-0 cursor-pointer" type="checkbox" />
</th>
<th className="py-3.5 px-4 w-28">Mã bài</th>
<th className="py-3.5 px-4 min-w-[280px]">Tiêu đề bài học & Ngữ cảnh</th>
<th className="py-3.5 px-4 w-28 text-center">Cấp độ</th>
<th className="py-3.5 px-4">Kỹ năng</th>
<th className="py-3.5 px-4">Tác giả / BTV</th>
<th className="py-3.5 px-4 text-center">Lượt học</th>
<th className="py-3.5 px-4 text-center">Thời lượng</th>
<th className="py-3.5 px-4 text-center">Trạng thái</th>
<th className="py-3.5 px-4 text-right w-32">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-surface-border/60 text-[13px] text-txt-main"><tr><td colSpan={20} className="p-6 text-center">—</td></tr></tbody>
</table>
</div>
{/*  Table Pagination Bar  */}
<Pagination
  currentPage={currentPage}
  totalPages={1}
  pageSize={pageSize}
  totalItems={0}
  onPageChange={setCurrentPage}
  onPageSizeChange={setPageSize}
  pageSizeOptions={[10, 20, 50, 100]}
  itemLabel="bài học"
  variant="sakura"
/>
</div>

{/*  BOTTOM 12-COL GRID: 3 ACTION & INSIGHT CARDS (Col-span-4 each)  */}
<div className="grid grid-cols-12 gap-5 pb-6">
{/*  Analytics Card: Col-span-4  */}
<div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-surface-border p-5 shadow-card flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">psychology</span>
<h4 className="font-bold text-[14px] text-txt-main">—</h4>
</div>
<span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">—</span>
</div>
<p className="text-[12px] text-txt-muted leading-relaxed mb-4">—</p>
</div>
<div className="flex items-center justify-between pt-3 border-t border-surface-border/60">
<div className="flex -space-x-1.5 overflow-hidden">
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-brand text-[9px] font-bold text-white">—</span>
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-brand-soft text-[9px] font-bold text-brand-dark">—</span>
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-brand-dark text-[9px] font-bold text-white">—</span>
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-txt-muted text-[9px] font-bold text-white">—</span>
</div>
<a className="text-[12px] font-bold text-brand hover:underline" href="#">Chi tiết báo cáo →</a>
</div>
</div>
{/*  Batch Action Card: Col-span-4  */}
<div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-surface-border p-5 shadow-card flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">bolt</span>
<h4 className="font-bold text-[14px] text-txt-main">Thao tác hàng loạt</h4>
</div>
<span className="text-[11px] font-medium text-txt-light">—</span>
</div>
<p className="text-[12px] text-txt-muted leading-relaxed mb-4">—</p>
</div>
<div className="flex items-center gap-2 pt-3 border-t border-surface-border/60">
<button className="flex-1 py-1.5 rounded-xl bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted text-[11px] font-bold transition-colors disabled:opacity-40" disabled>
                  Xuất bản đã chọn
                </button>
<button className="flex-1 py-1.5 rounded-xl bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-muted text-[11px] font-bold transition-colors disabled:opacity-40" disabled>
                  Gắn nhãn cấp độ
                </button>
</div>
</div>
{/*  Guidelines Card: Col-span-4  */}
<div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-surface-border p-5 shadow-card flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-emerald-600 text-[20px]">verified_user</span>
<h4 className="font-bold text-[14px] text-txt-main">Tiêu chuẩn chất lượng Riki</h4>
</div>
<span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
</div>
<p className="text-[12px] text-txt-muted leading-relaxed mb-4">—</p>
</div>
<div className="flex items-center justify-between pt-3 border-t border-surface-border/60">
<span className="text-[11px] font-semibold text-txt-muted">—</span>
<a className="text-[12px] font-bold text-brand hover:underline" href="#">Tài liệu HD →</a>
</div>
</div>
</div>
</div>
</main>
</div>
</div>


    </div>

</CmsShell>
);
}
