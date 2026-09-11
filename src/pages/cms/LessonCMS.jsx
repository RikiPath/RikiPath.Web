import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function LessonCMS() {
  const { pathname } = useLocation();
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
<span>RikiPath Curriculum Cloud v3.1</span>
</span>
<span className="text-[12px] text-txt-light">/</span>
<span className="text-[12px] text-txt-muted font-medium">Kho học liệu chuẩn quốc tế</span>
</div>
{/*  Title & Description  */}
<h1 className="text-[26px] font-bold text-txt-main tracking-tight leading-snug">
                  Quản lý Bài học & Nội dung Đào tạo
                </h1>
<p className="text-[14px] text-txt-muted mt-1.5 leading-relaxed">
                  Kho học liệu đa phương tiện chuẩn JLPT N5 — N1 theo triết lý tối giản tinh giản <span className="text-brand font-semibold italic">Ma (間)</span> và sắc hoa anh đào.
                </p>
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
<span className="ml-1 px-2 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">1,240</span>
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
<span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-border text-txt-muted text-[10px]">8.9k</span>
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
<span>+14.2%</span>
</div>
</div>
<div className="mt-4">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">Tổng số bài học</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-txt-main leading-tight">1,240</span>
<span className="text-[12px] text-txt-light">học phần</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50 text-[11px] text-txt-muted">
<span>Bao gồm N5 đến N1</span>
<svg className="w-16 h-4 text-brand opacity-60" fill="none" viewBox="0 0 60 20">
<path d="M1 18C10 14 18 16 28 8C38 0 48 10 59 2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
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
<span>87.5%</span>
</div>
</div>
<div className="mt-4">
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">Đã xuất bản (Live)</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-txt-main leading-tight">1,085</span>
<span className="text-[12px] text-emerald-700 font-semibold">Khả dụng</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50">
<div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden mr-2 border border-surface-border/60">
<div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: "87.5%" }}></div>
</div>
<span className="text-[11px] font-bold text-txt-muted">87.5%</span>
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
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">Bản nháp (Drafts)</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-txt-main leading-tight">92</span>
<span className="text-[12px] text-txt-light">đang viết</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50 text-[11px] text-txt-muted">
<span>Chưa vào chuỗi học</span>
<span className="font-semibold text-txt-main">7.4% tổng số</span>
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
<span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">Chờ duyệt (Review)</span>
<div className="flex items-baseline gap-1.5 mt-0.5">
<span className="text-[26px] font-bold text-brand leading-tight">63</span>
<span className="text-[12px] text-brand font-bold">+8 bài mới</span>
</div>
</div>
<div className="mt-3 flex items-center justify-between pt-2.5 border-t border-surface-border/50 text-[11px]">
<span className="text-txt-muted">SLA duyệt: &lt; 24h</span>
<a className="text-brand font-bold hover:underline" href="#">Xem ngay →</a>
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
<option value="all">Tất cả trạng thái (1,240)</option>
<option value="published">Đã xuất bản (1,085)</option>
<option value="pending">Chờ kiểm duyệt (63)</option>
<option value="draft">Bản nháp (92)</option>
<option value="revision">Cần chỉnh sửa (12)</option>
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
<span className="px-2.5 py-0.5 rounded-full bg-brand-light border border-brand-soft/40 text-brand text-[11px] font-bold">50 / 1,240 bài</span>
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
<tbody className="divide-y divide-surface-border/60 text-[13px] text-txt-main">
{/*  ROW 1: Bunpou N3  */}
<tr className="hover:bg-canvas/50 transition-colors group">
<td className="py-3.5 px-4 text-center">
<input className="rounded border-surface-border text-brand focus:ring-0 cursor-pointer" type="checkbox" />
</td>
<td className="py-3.5 px-4">
<span className="font-mono font-bold text-brand">N3-BUN-07</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-border bg-canvas">
<img className="w-full h-full object-cover" data-alt="A soft watercolor illustration of a serene Japanese Zen garden with cherry blossom petals resting on stone lantern, pink and natural ivory aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1rwkbr3TZxidMIUKRV509cPLfE8v2Sr_QYJYJGFBM0HeAz_szc_rt1nTgKaIhbfqHZaphOHbewSJktfzyHqrCs9yTFH2jNNJG6e1640tQIqBwn1zyssHVk01QRm3Fcv-ONP5CXckgM5Ya0ZmQZc4bcGn217f21lmctIRlnOrKRqynpQTndbaEnXRt3BOoEr97rsQ8JPbNMfzfFNspJ2avED7whPkSCRthrRv-KGaDFneO93ACvVW-" />
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-txt-main truncate hover:text-brand cursor-pointer">Bài 07: Cấu trúc わけにはいかない</span>
<span className="material-symbols-outlined text-[15px] text-emerald-600" title="Đã đồng bộ AI Audio">volume_up</span>
</div>
<span className="text-[12px] text-txt-muted truncate">Ý nghĩa: “Không thể vì lý do đạo đức/xã hội” kèm 15 ví dụ thực tế</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center">
<span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-light text-brand text-[11px] font-bold border border-brand-soft/40">
                        JLPT N3
                      </span>
</td>
<td className="py-3.5 px-4">
<span className="inline-flex items-center gap-1.5 font-medium text-txt-muted">
<span className="w-2 h-2 rounded-full bg-brand"></span>
<span>Ngữ pháp</span>
</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-2">
<div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-bold">ST</div>
<div className="flex flex-col leading-tight">
<span className="font-semibold text-txt-main text-[12px]">Sensei Tanaka</span>
<span className="text-[10px] text-txt-light">Khoa Bunpou</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center font-semibold text-txt-main">
                      12,480
                    </td>
<td className="py-3.5 px-4 text-center text-txt-muted text-[12px]">
                      24 phút
                    </td>
<td className="py-3.5 px-4 text-center">
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
<span>Đã xuất bản</span>
</span>
</td>
<td className="py-3.5 px-4 text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg hover:bg-brand-light text-txt-muted hover:text-brand transition-colors" title="Chỉnh sửa bài học">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-brand-light text-txt-muted hover:text-brand transition-colors" title="Xem trước người học">
<span className="material-symbols-outlined text-[17px]">visibility</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-txt-light hover:text-txt-main transition-colors" title="Thao tác khác">
<span className="material-symbols-outlined text-[17px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  ROW 2: Kanji N3  */}
<tr className="hover:bg-canvas/50 transition-colors group">
<td className="py-3.5 px-4 text-center">
<input className="rounded border-surface-border text-brand focus:ring-0 cursor-pointer" type="checkbox" />
</td>
<td className="py-3.5 px-4">
<span className="font-mono font-bold text-brand">N3-KAN-14</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-border bg-canvas">
<img className="w-full h-full object-cover" data-alt="Minimalist ink wash painting depicting Japanese calligraphy stroke order in soft Sumi ink on textured washi paper with pale pink undertones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVgBzDmSwi2oaK07qtTvy8NYmvLUmkgf_eKCu7Z8WBRiCoVsiiY1fbHNFD4lQRFpXotixEFKsVeUug-4p-VYtB5vpQ8pdvGi52q2-fp3ttY1byfWWdKxeui8jcd8aNQajZy3ir4RqW_wLcC_RQRe4JPLCjdsp8Cydh2u3Evk705q-Av8X2n4-tQeUmC_kQ3fGl9Y5Eys3KmMCwbnjUsO6KWPIYbClbdRvcUK33x4BJJFpX7GnohMjT" />
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-txt-main truncate hover:text-brand cursor-pointer">Bài 14: 850 Hán tự Shinkanzen Master N3</span>
<span className="material-symbols-outlined text-[15px] text-txt-muted" title="Flashcard tương tác">style</span>
</div>
<span className="text-[12px] text-txt-muted truncate">Chương 2: Hán tự nhóm Đời sống gia đình và Công việc thường nhật</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center">
<span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-light text-brand text-[11px] font-bold border border-brand-soft/40">
                        JLPT N3
                      </span>
</td>
<td className="py-3.5 px-4">
<span className="inline-flex items-center gap-1.5 font-medium text-txt-muted">
<span className="w-2 h-2 rounded-full bg-txt-muted"></span>
<span>Hán tự</span>
</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-2">
<div className="w-6 h-6 rounded-full bg-txt-muted text-white flex items-center justify-center text-[10px] font-bold">MN</div>
<div className="flex flex-col leading-tight">
<span className="font-semibold text-txt-main text-[12px]">Mai Nguyễn</span>
<span className="text-[10px] text-txt-light">Biên tập viên</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center font-semibold text-txt-main">
                      8,920
                    </td>
<td className="py-3.5 px-4 text-center text-txt-muted text-[12px]">
                      45 phút
                    </td>
<td className="py-3.5 px-4 text-center">
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
<span>Đã xuất bản</span>
</span>
</td>
<td className="py-3.5 px-4 text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg hover:bg-brand-light text-txt-muted hover:text-brand transition-colors">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-brand-light text-txt-muted hover:text-brand transition-colors">
<span className="material-symbols-outlined text-[17px]">visibility</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-txt-light hover:text-txt-main transition-colors">
<span className="material-symbols-outlined text-[17px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  ROW 3: Keigo N2 - Chờ kiểm duyệt  */}
<tr className="hover:bg-canvas/50 transition-colors group">
<td className="py-3.5 px-4 text-center">
<input className="rounded border-surface-border text-brand focus:ring-0 cursor-pointer" type="checkbox" />
</td>
<td className="py-3.5 px-4">
<span className="font-mono font-bold text-brand">N2-GOI-22</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-border bg-canvas">
<img className="w-full h-full object-cover" data-alt="Modern Japanese office conference room with soft natural morning light, gentle cherry blossom branch visible through minimalist floor-to-ceiling glass" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARhU6eZLs-IsicT_4tEMd-twWT_tcCf_DLFvH3CgYuerm7aEHoaIxXN1WlRyfffmF07Z3c7iPXpHjpKWcLPnN8Wo6KZ70iYpPW8yP2iBNmysFR-ZLFBo0s4U_kOeSANN--XATZksZUw6Xuggg-MCUxmh4NvO7q06A0QKIhkOxXuc3xph75Kca117v8_s5NJc_QM72gR6acBJ0J4crqVZoEZda_llSj2gjM4oy7g8ySrNt6oavSWFPZ" />
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-txt-main truncate hover:text-brand cursor-pointer">Bài 22: Kính ngữ thương mại Keigo trong Email</span>
<span className="px-1.5 py-0.2 rounded bg-brand-light text-brand text-[10px] font-bold border border-brand-soft/40">Mới</span>
</div>
<span className="text-[12px] text-txt-muted truncate">Phân biệt Tôn kính ngữ (Sonkeigo) & Khiêm nhường ngữ (Kenjougo) chuẩn IT & Thương mại</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center">
<span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-soft/40 text-brand-dark text-[11px] font-bold border border-brand-soft">
                        JLPT N2
                      </span>
</td>
<td className="py-3.5 px-4">
<span className="inline-flex items-center gap-1.5 font-medium text-txt-muted">
<span className="w-2 h-2 rounded-full bg-brand"></span>
<span>Từ vựng & Giao tiếp</span>
</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-2">
<div className="w-6 h-6 rounded-full bg-brand-soft text-brand-dark flex items-center justify-center text-[10px] font-bold">HY</div>
<div className="flex flex-col leading-tight">
<span className="font-semibold text-txt-main text-[12px]">Hương Yamada</span>
<span className="text-[10px] text-txt-light">Giảng viên cao cấp</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center font-medium text-txt-light">
                      --
                    </td>
<td className="py-3.5 px-4 text-center text-txt-muted text-[12px]">
                      32 phút
                    </td>
<td className="py-3.5 px-4 text-center">
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
<span>Chờ kiểm duyệt</span>
</span>
</td>
<td className="py-3.5 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<button className="px-2.5 py-1 rounded-lg bg-brand hover:bg-brand-hover text-white text-[11px] font-bold shadow-sm transition-colors">
                          Duyệt ngay
                        </button>
<button className="p-1 rounded-lg hover:bg-canvas text-txt-light hover:text-txt-main transition-colors">
<span className="material-symbols-outlined text-[17px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  ROW 4: Choukai N1 - Cần chỉnh sửa  */}
<tr className="hover:bg-canvas/50 transition-colors group">
<td className="py-3.5 px-4 text-center">
<input className="rounded border-surface-border text-brand focus:ring-0 cursor-pointer" type="checkbox" />
</td>
<td className="py-3.5 px-4">
<span className="font-mono font-bold text-brand">N1-CHO-05</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-border bg-canvas">
<img className="w-full h-full object-cover" data-alt="Sound wave visualization over a delicate cherry blossom petal graphic pattern, modern audio studio clean lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-Plvw5W51o2rfSIRdc-A9yLHn3fY3D8LGVf-QOjq-4Q3Zky2RvEzjLrohYTDVxDZex4nST8ySv4eE59CNck1Nfc6nOJufpSv0SQC_b1wvqP5ITk-9p5onO-o1bOSeH1fWv_UsGChvNmXLsHBDmqY3bcsRaTwAcctPy06HeoEQRx6ppfRPC--7LzcsodbiNvoRq9DWSZvtC4xO5cbMRA-xx9KSjzwwErzvWbZW9oFQkTMLwlkRlV_a" />
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-txt-main truncate hover:text-brand cursor-pointer">Bài 05: Luyện nghe hiểu Tích hợp thông tin (Sogo Rikai)</span>
</div>
<span className="text-[12px] text-red-600 truncate font-medium">Phản hồi BTV: Âm thanh track 03 bị rè ở 04:15, cần thu âm bổ sung</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center">
<span className="inline-block px-2.5 py-0.5 rounded-full bg-txt-main text-white text-[11px] font-bold">
                        JLPT N1
                      </span>
</td>
<td className="py-3.5 px-4">
<span className="inline-flex items-center gap-1.5 font-medium text-txt-muted">
<span className="w-2 h-2 rounded-full bg-txt-light"></span>
<span>Nghe hiểu</span>
</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-2">
<div className="w-6 h-6 rounded-full bg-surface-subtle text-txt-main border border-surface-border flex items-center justify-center text-[10px] font-bold">KD</div>
<div className="flex flex-col leading-tight">
<span className="font-semibold text-txt-main text-[12px]">Kenji Do</span>
<span className="text-[10px] text-txt-light">Media Studio</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center font-medium text-txt-light">
                      --
                    </td>
<td className="py-3.5 px-4 text-center text-txt-muted text-[12px]">
                      38 phút
                    </td>
<td className="py-3.5 px-4 text-center">
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200">
<span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
<span>Cần chỉnh sửa</span>
</span>
</td>
<td className="py-3.5 px-4 text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg hover:bg-canvas text-txt-muted hover:text-brand transition-colors" title="Xem góp ý">
<span className="material-symbols-outlined text-[17px]">comment</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-txt-muted hover:text-brand transition-colors" title="Chỉnh sửa">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-canvas text-txt-light hover:text-txt-main transition-colors">
<span className="material-symbols-outlined text-[17px]">more_vert</span>
</button>
</div>
</td>
</tr>
{/*  ROW 5: Dokkai N5 - Bản nháp  */}
<tr className="hover:bg-canvas/50 transition-colors group">
<td className="py-3.5 px-4 text-center">
<input className="rounded border-surface-border text-brand focus:ring-0 cursor-pointer" type="checkbox" />
</td>
<td className="py-3.5 px-4">
<span className="font-mono font-bold text-brand">N5-DOK-01</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-border bg-canvas flex items-center justify-center text-txt-light">
<span className="material-symbols-outlined text-[20px]">article</span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-txt-main truncate hover:text-brand cursor-pointer">Bài 01: Đọc hiểu nhập môn - Bức thư ngắn gửi gia đình</span>
</div>
<span className="text-[12px] text-txt-muted truncate">Giáo trình tương tác Minna no Nihongo I - Luyện phản xạ mẫu câu です/ではありません</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center">
<span className="inline-block px-2.5 py-0.5 rounded-full bg-canvas border border-surface-border text-txt-main text-[11px] font-bold">
                        JLPT N5
                      </span>
</td>
<td className="py-3.5 px-4">
<span className="inline-flex items-center gap-1.5 font-medium text-txt-muted">
<span className="w-2 h-2 rounded-full bg-txt-light"></span>
<span>Đọc hiểu</span>
</span>
</td>
<td className="py-3.5 px-4">
<div className="flex items-center gap-2">
<div className="w-6 h-6 rounded-full bg-canvas border border-surface-border text-txt-muted flex items-center justify-center text-[10px] font-bold">TL</div>
<div className="flex flex-col leading-tight">
<span className="font-semibold text-txt-main text-[12px]">Trần Linh</span>
<span className="text-[10px] text-txt-light">Trợ giảng</span>
</div>
</div>
</td>
<td className="py-3.5 px-4 text-center font-medium text-txt-light">
                      0
                    </td>
<td className="py-3.5 px-4 text-center text-txt-muted text-[12px]">
                      15 phút
                    </td>
<td className="py-3.5 px-4 text-center">
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-subtle text-txt-muted text-[11px] font-bold border border-surface-border">
<span className="w-1.5 h-1.5 rounded-full bg-txt-light"></span>
<span>Bản nháp</span>
</span>
</td>
<td className="py-3.5 px-4 text-right">
<div className="flex items-center justify-end gap-1.5">
<button className="px-2.5 py-1 rounded-lg bg-canvas hover:bg-surface-subtle border border-surface-border text-txt-main text-[11px] font-bold transition-colors">
                          Gửi duyệt
                        </button>
<button className="p-1 rounded-lg hover:bg-canvas text-txt-light hover:text-brand transition-colors">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1 rounded-lg hover:bg-canvas text-txt-light hover:text-txt-main transition-colors">
<span className="material-symbols-outlined text-[17px]">more_vert</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  Table Pagination Bar  */}
<div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-surface-border bg-white text-[13px]">
<div className="flex items-center gap-3 mb-3 sm:mb-0">
<span className="text-txt-muted">Hiển thị mỗi trang:</span>
<select className="px-2.5 py-1 rounded-lg bg-canvas border border-surface-border text-txt-main font-medium focus:outline-none cursor-pointer">
<option>20</option>
<option selected>50</option>
<option>100</option>
</select>
<span className="text-txt-light">Bản ghi 1 – 50 của 1,240 bài học</span>
</div>
<div className="flex items-center gap-1">
<button className="p-1.5 rounded-lg border border-surface-border text-txt-light disabled:opacity-40 hover:bg-canvas transition-colors" disabled>
<span className="material-symbols-outlined text-[18px]">chevron_left</span>
</button>
<button className="w-8 h-8 rounded-lg bg-brand text-white font-bold text-[12px] shadow-sm shadow-brand/20">
                  1
                </button>
<button className="w-8 h-8 rounded-lg border border-surface-border hover:bg-canvas text-txt-main font-medium text-[12px] transition-colors">
                  2
                </button>
<button className="w-8 h-8 rounded-lg border border-surface-border hover:bg-canvas text-txt-main font-medium text-[12px] transition-colors">
                  3
                </button>
<span className="px-1.5 text-txt-light">...</span>
<button className="w-8 h-8 rounded-lg border border-surface-border hover:bg-canvas text-txt-main font-medium text-[12px] transition-colors">
                  25
                </button>
<button className="p-1.5 rounded-lg border border-surface-border text-txt-muted hover:bg-canvas transition-colors">
<span className="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
</div>
</div>
{/*  BOTTOM 12-COL GRID: 3 ACTION & INSIGHT CARDS (Col-span-4 each)  */}
<div className="grid grid-cols-12 gap-5 pb-6">
{/*  Analytics Card: Col-span-4  */}
<div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-surface-border p-5 shadow-card flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">psychology</span>
<h4 className="font-bold text-[14px] text-txt-main">Tỷ lệ hoàn thành bài học</h4>
</div>
<span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Tốt (+4.8%)</span>
</div>
<p className="text-[12px] text-txt-muted leading-relaxed mb-4">
                  Học viên tương tác trung bình 84.6% tổng số video và vượt qua bài tập Bunpou ở lần thử đầu tiên.
                </p>
</div>
<div className="flex items-center justify-between pt-3 border-t border-surface-border/60">
<div className="flex -space-x-1.5 overflow-hidden">
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-brand text-[9px] font-bold text-white">N5</span>
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-brand-soft text-[9px] font-bold text-brand-dark">N4</span>
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-brand-dark text-[9px] font-bold text-white">N3</span>
<span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-txt-muted text-[9px] font-bold text-white">N2</span>
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
<span className="text-[11px] font-medium text-txt-light">0 mục đã chọn</span>
</div>
<p className="text-[12px] text-txt-muted leading-relaxed mb-4">
                  Chọn các hàng trong bảng để thực hiện đồng loạt xuất bản, chuyển trạng thái hoặc xuất báo cáo CSV.
                </p>
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
<p className="text-[12px] text-txt-muted leading-relaxed mb-4">
                  Mỗi bài học xuất bản cần tối thiểu 1 đoạn hội thoại video Native, 10 bài tập trắc nghiệm và audio giọng đọc chuẩn Tokyo.
                </p>
</div>
<div className="flex items-center justify-between pt-3 border-t border-surface-border/60">
<span className="text-[11px] font-semibold text-txt-muted">Quy chuẩn Ban Đào tạo v4.0</span>
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
