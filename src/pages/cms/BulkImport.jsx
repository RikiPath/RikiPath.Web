import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function BulkImport() {
  const { pathname } = useLocation();
  return (
    <CmsShell pathname={pathname} breadcrumb="Import hàng loạt">
<div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen" data-page="BulkImport" data-shell-unified="1">

<div className="pl-0"><main className="w-full pt-0 bg-[#FAF7F5] min-h-screen"><div className="max-w-[1440px] mx-auto px-8 py-6"><div className="flex flex-col w-full">{/*  Breadcrumb & Page Top Action Bar  */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-[#EADFD9]">
<div className="flex flex-col gap-1.5">
<nav className="flex items-center gap-1.5 text-[#6E686A] text-xs">
<a className="hover:text-[#E05A7A] transition-colors flex items-center gap-1" href="#">
<span className="material-symbols-outlined text-[14px]">school</span>
        Kho học liệu
      </a>
<span className="material-symbols-outlined text-[12px] text-[#9E8E93]">chevron_right</span>
<a className="hover:text-[#E05A7A] transition-colors" href="#">Công cụ CMS</a>
<span className="material-symbols-outlined text-[12px] text-[#9E8E93]">chevron_right</span>
<span className="text-[#E05A7A] font-semibold bg-[#FDF0F4] border border-[#F8BBD0] px-2 py-0.5 rounded text-[11px]">Import Dữ liệu hàng loạt</span>
</nav>
<h1 className="text-2xl lg:text-[28px] text-[#2D282A] font-bold tracking-tight flex items-center gap-2">
      Import Dữ liệu Học liệu & Ngân hàng Khảo thí
      <span className="px-2.5 py-0.5 rounded-full bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] text-[11px] font-bold uppercase tracking-wider">Haru Engine 3.2</span>
</h1>
<p className="text-xs text-[#6E686A] max-w-4xl leading-relaxed">
      Công cụ nạp dữ liệu chuẩn hóa Excel/CSV với thuật toán tự động nhận diện Furigana, tách thẻ ngữ nghĩa và kiểm duyệt xung đột học thuật thông minh Riki AI.
    </p>
</div>
<div className="flex items-center gap-3 shrink-0 self-start md:self-center">
<button className="px-4 py-2 rounded-xl bg-white border border-[#EADFD9] hover:border-[#E05A7A]/50 text-[#2D282A] font-semibold text-xs transition-all flex items-center gap-2 shadow-sm hover:shadow" type="button">
<span className="material-symbols-outlined text-[18px] text-[#E05A7A]">download</span>
<span>Tải file mẫu (.xlsx)</span>
</button>
<button className="px-4 py-2 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] hover:bg-[#F8BBD0]/20 text-[#E05A7A] font-semibold text-xs transition-all flex items-center gap-2" type="button">
<span className="material-symbols-outlined text-[18px] text-[#E05A7A]">history</span>
<span>Lịch sử Import</span>
<span className="px-1.5 py-0.2 rounded-full bg-white border border-[#F8BBD0] text-[#E05A7A] text-[10px] font-bold">34</span>
</button>
</div>
</div>
{/*  Stepper Bar (4 Steps Pipeline)  */}
<div className="w-full bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-[0_2px_8px_rgba(45,40,42,0.03)] mb-6">
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
{/*  Step 1: Completed  */}
<div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#E8F5E9]/60 border border-[#2E7D32]/20">
<div className="w-9 h-9 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-semibold shrink-0 shadow-sm">
<span className="material-symbols-outlined text-[18px]">check</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-[10px] text-[#2E7D32] font-bold uppercase tracking-wider">Bước 1 • Hoàn thành</span>
<span className="text-xs text-[#2D282A] font-semibold truncate">Tải lên tập tin nguồn</span>
</div>
</div>
{/*  Step 2: Completed  */}
<div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#E8F5E9]/60 border border-[#2E7D32]/20">
<div className="w-9 h-9 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-semibold shrink-0 shadow-sm">
<span className="material-symbols-outlined text-[18px]">check</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-[10px] text-[#2E7D32] font-bold uppercase tracking-wider">Bước 2 • Hoàn thành</span>
<span className="text-xs text-[#2D282A] font-semibold truncate">Khớp nối trường (Mapping)</span>
</div>
</div>
{/*  Step 3: Active Highlight  */}
<div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FDF0F4] border-2 border-[#E05A7A]/50 shadow-[0_4px_16px_rgba(224,90,122,0.15)]">
<div className="w-9 h-9 rounded-full bg-[#E05A7A] flex items-center justify-center text-white font-bold shrink-0 shadow-md">
<span className="text-sm font-mono">3</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-[10px] text-[#E05A7A] font-bold uppercase tracking-wider flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-[#E05A7A] animate-ping"></span>
          Bước 3 • Đang xử lý
        </span>
<span className="text-xs text-[#2D282A] font-bold truncate">Kiểm tra hợp lệ & Xử lý lỗi</span>
</div>
</div>
{/*  Step 4: Upcoming  */}
<div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] opacity-65">
<div className="w-9 h-9 rounded-full bg-[#EADFD9] flex items-center justify-center text-[#6E686A] font-bold shrink-0">
<span className="text-sm font-mono">4</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-[10px] text-[#9E8E93] uppercase tracking-wider font-semibold">Bước 4 • Chờ xuất bản</span>
<span className="text-xs text-[#6E686A] font-medium truncate">Đồng bộ Kho JLPT</span>
</div>
</div>
</div>
</div>
{/*  Main Content Two-Column Layout (8 cols / 4 cols)  */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pb-10">
{/*  LEFT COLUMN (8 cols)  */}
<div className="xl:col-span-8 flex flex-col gap-6 min-w-0">
{/*  File Metadata Header Card  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="flex items-center gap-3.5 min-w-0">
<div className="w-12 h-12 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A] shadow-sm shrink-0">
<span className="material-symbols-outlined text-[28px]">table_view</span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-[#2D282A] truncate">JLPT_N3_Vocabulary_Grammar_Batch_04.xlsx</span>
<span className="px-2 py-0.5 rounded bg-[#FAF7F5] border border-[#EADFD9] text-[#6E686A] text-[10px] font-semibold">Excel 2016+</span>
</div>
<span className="text-xs text-[#6E686A] truncate">
            Kích thước: 2.4 MB • 450 bản ghi dữ liệu • Tải lên bởi <strong className="text-[#2D282A] font-semibold">Kenji Yamada (Academic Lead)</strong> lúc 09:15 sáng
          </span>
</div>
</div>
<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
<button className="px-3 py-1.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] hover:border-[#E05A7A]/40 text-[#2D282A] text-xs font-semibold transition-colors flex items-center gap-1" type="button">
<span className="material-symbols-outlined text-[16px] text-[#E05A7A]">swap_horiz</span>
<span>Đổi file khác</span>
</button>
<button className="w-8 h-8 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] hover:bg-[#FDF0F4] text-[#6E686A] hover:text-[#2D282A] flex items-center justify-center transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</div>
{/*  Validation KPI Cards  */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
{/*  Metric 1: Total  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-[11px] text-[#6E686A] uppercase font-bold tracking-wider">Tổng bản ghi</span>
<span className="material-symbols-outlined text-[#9E8E93] text-[20px]">layers</span>
</div>
<div className="mt-3">
<span className="text-2xl font-bold text-[#2D282A] tracking-tight leading-none">450</span>
<div className="flex items-center gap-1 mt-1 text-[#9E8E93] text-[11px]">
<span>Đã phân tích 100% dòng</span>
</div>
</div>
</div>
{/*  Metric 2: Valid Ready  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/10 rounded-full blur-xl pointer-events-none"></div>
<div className="flex items-center justify-between">
<span className="text-[11px] text-[#2E7D32] uppercase font-bold tracking-wider">Hợp lệ sẵn sàng</span>
<span className="material-symbols-outlined text-[#2E7D32] text-[20px]">verified</span>
</div>
<div className="mt-3">
<div className="flex items-baseline gap-2">
<span className="text-2xl font-bold text-[#2E7D32] tracking-tight leading-none">432</span>
<span className="text-xs font-bold text-[#2E7D32]">96.0%</span>
</div>
<div className="w-full bg-[#FAF7F5] border border-[#EADFD9] h-1.5 rounded-full mt-2 overflow-hidden">
<div className="bg-[#2E7D32] h-full rounded-full" style={{ width: "96%" }}></div>
</div>
</div>
</div>
{/*  Metric 3: AI Warning  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-[#F8BBD0]/30 rounded-full blur-xl pointer-events-none"></div>
<div className="flex items-center justify-between">
<span className="text-[11px] text-[#6b253b] uppercase font-bold tracking-wider">Cảnh báo AI</span>
<span className="material-symbols-outlined text-[#E05A7A] text-[20px]">psychology</span>
</div>
<div className="mt-3">
<div className="flex items-baseline gap-2">
<span className="text-2xl font-bold text-[#E05A7A] tracking-tight leading-none">14</span>
<span className="text-xs font-semibold text-[#6E686A]">3.1%</span>
</div>
<div className="w-full bg-[#FAF7F5] border border-[#EADFD9] h-1.5 rounded-full mt-2 overflow-hidden">
<div className="bg-[#F8BBD0] h-full rounded-full" style={{ width: "25%" }}></div>
</div>
</div>
</div>
{/*  Metric 4: Severe Errors  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-4 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-full blur-xl pointer-events-none"></div>
<div className="flex items-center justify-between">
<span className="text-[11px] text-red-600 uppercase font-bold tracking-wider">Lỗi chặn Import</span>
<span className="material-symbols-outlined text-red-600 text-[20px]">dangerous</span>
</div>
<div className="mt-3">
<div className="flex items-baseline gap-2">
<span className="text-2xl font-bold text-red-600 tracking-tight leading-none">04</span>
<span className="text-xs font-semibold text-red-500">0.9%</span>
</div>
<div className="w-full bg-[#FAF7F5] border border-[#EADFD9] h-1.5 rounded-full mt-2 overflow-hidden">
<div className="bg-red-500 h-full rounded-full" style={{ width: "15%" }}></div>
</div>
</div>
</div>
</div>
{/*  Educational Data Table & Filters  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] shadow-[0_2px_8px_rgba(45,40,42,0.03)] overflow-hidden flex flex-col">
{/*  Filter Header  */}
<div className="p-4 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
<button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6E686A] hover:bg-[#FAF7F5] transition-colors flex items-center gap-1.5 whitespace-nowrap" type="button">
<span>Tất cả bản ghi</span>
<span className="px-1.5 py-0.2 rounded-full bg-[#FAF7F5] border border-[#EADFD9] text-[10px]">450</span>
</button>
<button className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm flex items-center gap-1.5 whitespace-nowrap" type="button">
<span className="material-symbols-outlined text-[15px] text-red-600">error</span>
<span>Lỗi cần sửa</span>
<span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">4</span>
</button>
<button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6E686A] hover:bg-[#FAF7F5] transition-colors flex items-center gap-1.5 whitespace-nowrap" type="button">
<span className="material-symbols-outlined text-[15px] text-[#E05A7A]">auto_fix_high</span>
<span>Cảnh báo AI</span>
<span className="px-1.5 py-0.2 rounded-full bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] text-[10px] font-bold">14</span>
</button>
<button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6E686A] hover:bg-[#FAF7F5] transition-colors flex items-center gap-1.5 whitespace-nowrap" type="button">
<span>Hợp lệ</span>
<span className="px-1.5 py-0.2 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/30 text-[10px] font-bold">432</span>
</button>
</div>
<div className="flex items-center gap-2 shrink-0">
<div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] text-xs text-[#2D282A]">
<span className="material-symbols-outlined text-[16px] text-[#9E8E93]">search</span>
<input className="bg-transparent border-none outline-none text-xs text-[#2D282A] w-36 placeholder:text-[#9E8E93]" placeholder="Lọc từ vựng, Hán tự..." type="text" />
</div>
<button className="p-1.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] hover:bg-[#FDF0F4] text-[#6E686A] hover:text-[#E05A7A] transition-colors" title="Tải lại kiểm tra" type="button">
<span className="material-symbols-outlined text-[18px]">refresh</span>
</button>
</div>
</div>
{/*  Table  */}
<div className="overflow-x-auto mt-3">
<table className="w-full text-left text-xs">
<thead>
<tr className="bg-[#FAF7F5] border-y border-[#EADFD9] text-[11px] font-bold uppercase tracking-wider text-[#9E8E93]">
<th className="py-3 px-4 w-12 text-center">Dòng</th>
<th className="py-3 px-3">Học liệu</th>
<th className="py-3 px-3">Nội dung Kanji / Mẫu câu</th>
<th className="py-3 px-3">Furigana & Nghĩa tiếng Việt</th>
<th className="py-3 px-3">Chi tiết lỗi phát hiện</th>
<th className="py-3 px-4 text-right">Hành động khắc phục</th>
</tr>
</thead>
<tbody className="divide-y divide-[#EADFD9] text-[#2D282A]">
{/*  Row 1: #42  */}
<tr className="hover:bg-[#FAF7F5] transition-colors">
<td className="py-3 px-4 text-center font-bold text-[#6E686A]">#42</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded-full bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] text-[11px] font-semibold whitespace-nowrap">
                  Từ vựng N3
                </span>
</td>
<td className="py-3 px-3">
<div className="flex flex-col">
<span className="text-sm font-bold text-[#2D282A]">咲き誇る</span>
<span className="text-[10px] text-[#6E686A]">Động từ nhóm 1 (V1)</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex flex-col">
<span className="text-[#E05A7A] font-semibold">さきほこる</span>
<span className="text-[#6E686A] truncate max-w-xs">Nở rộ rực rỡ, khoe sắc (hoa anh đào)</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex items-start gap-1 text-red-600">
<span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">error</span>
<span className="text-[11px]">Thiếu trường dữ liệu <strong>Pitch Accent [Heiban 0]</strong> âm chuẩn Tokyo.</span>
</div>
</td>
<td className="py-3 px-4 text-right whitespace-nowrap">
<button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDF0F4] hover:bg-[#E05A7A] text-[#E05A7A] hover:text-white border border-[#F8BBD0] text-[11px] font-semibold transition-all shadow-xs" type="button">
<span className="material-symbols-outlined text-[14px]">volume_up</span>
<span>Gán Accent [0]</span>
</button>
</td>
</tr>
{/*  Row 2: #89  */}
<tr className="hover:bg-[#FAF7F5] transition-colors bg-[#FAF7F5]/40">
<td className="py-3 px-4 text-center font-bold text-[#6E686A]">#89</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded-full bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] text-[11px] font-semibold whitespace-nowrap">
                  Ngữ pháp N3
                </span>
</td>
<td className="py-3 px-3">
<div className="flex flex-col">
<span className="text-sm font-bold text-[#2D282A]">〜にほかならない</span>
<span className="text-[10px] text-[#6E686A]">Cấu trúc nhấn mạnh khẳng định</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex flex-col">
<span className="text-[#2D282A]">N / 普通形 + にほかならない</span>
<span className="text-[#6E686A] truncate max-w-xs">Chính là vì..., không gì khác ngoài...</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex items-start gap-1 text-red-600">
<span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">difference</span>
<span className="text-[11px]">Xung đột mã định danh ID: Trùng khớp bài học có sẵn <strong>#N3-GM-402</strong></span>
</div>
</td>
<td className="py-3 px-4 text-right whitespace-nowrap">
<div className="inline-flex items-center gap-1">
<button className="px-2.5 py-1 rounded-lg bg-white border border-[#EADFD9] hover:bg-[#FAF7F5] text-[#2D282A] text-[11px] font-medium transition-all" type="button">
                    Ghi đè
                  </button>
<button className="px-2.5 py-1 rounded-lg bg-[#E05A7A] hover:bg-[#C84364] text-white text-[11px] font-semibold transition-all shadow-xs" type="button">
                    Tạo ID mới
                  </button>
</div>
</td>
</tr>
{/*  Row 3: #115  */}
<tr className="hover:bg-[#FAF7F5] transition-colors">
<td className="py-3 px-4 text-center font-bold text-[#6E686A]">#115</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/30 text-[#2E7D32] text-[11px] font-semibold whitespace-nowrap">
                  Hán tự N3
                </span>
</td>
<td className="py-3 px-3">
<div className="flex items-center gap-2">
<span className="w-8 h-8 rounded-lg bg-[#FAF7F5] border border-[#EADFD9] flex items-center justify-center text-xl text-[#E05A7A] font-bold">咲</span>
<div className="flex flex-col">
<span className="text-xs font-bold text-[#2D282A]">TIẾU (Nở hoa)</span>
<span className="text-[10px] text-[#6E686A]">9 nét • Bộ Khẩu (口)</span>
</div>
</div>
</td>
<td className="py-3 px-3">
<div className="flex flex-col">
<span className="text-[#2D282A]">Onyomi: ショウ | Kunyomi: さ.く</span>
<span className="text-[#6E686A]">Nở (hoa), mỉm cười thanh tao</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex items-start gap-1 text-[#E05A7A]">
<span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">draw</span>
<span className="text-[11px]">Thiếu tọa độ SVG nét bút số 7. AI đã nội suy từ thư viện StrokeData.</span>
</div>
</td>
<td className="py-3 px-4 text-right whitespace-nowrap">
<button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDF0F4] border border-[#F8BBD0] text-[#E05A7A] hover:bg-[#E05A7A] hover:text-white text-[11px] font-semibold transition-all shadow-xs" type="button">
<span className="material-symbols-outlined text-[14px]">gesture</span>
<span>Khôi phục nét</span>
</button>
</td>
</tr>
{/*  Row 4: #204  */}
<tr className="hover:bg-[#FAF7F5] transition-colors bg-[#FAF7F5]/40">
<td className="py-3 px-4 text-center font-bold text-[#6E686A]">#204</td>
<td className="py-3 px-3">
<span className="px-2 py-0.5 rounded-full bg-[#FAF7F5] border border-[#EADFD9] text-[#2D282A] text-[11px] font-semibold whitespace-nowrap">
                  Đề thi Dokkai N3
                </span>
</td>
<td className="py-3 px-3">
<div className="flex flex-col max-w-xs">
<span className="text-xs font-bold text-[#2D282A]">Mondai 1 (Tango) #084</span>
<span className="text-[10px] text-[#6E686A] truncate">「桜の花が______季節になりました。」</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex flex-col">
<span className="text-[#2D282A]">4 phương án: A, B, C, D</span>
<span className="text-[10px] text-[#6E686A]">A: 咲く / B: 降る / C: 散る / D: 吹く</span>
</div>
</td>
<td className="py-3 px-3">
<div className="flex items-start gap-1 text-red-600">
<span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">rule</span>
<span className="text-[11px]">Chưa chỉ định đáp án đúng (Correct Answer Index bị rỗng).</span>
</div>
</td>
<td className="py-3 px-4 text-right whitespace-nowrap">
<div className="inline-flex items-center gap-1">
<span className="text-[11px] text-[#6E686A]">Chọn:</span>
<button className="w-6 h-6 rounded bg-[#E05A7A] text-white text-xs font-bold shadow-xs" type="button">A</button>
<button className="w-6 h-6 rounded bg-white border border-[#EADFD9] hover:bg-[#FAF7F5] text-[#2D282A] text-xs font-medium" type="button">B</button>
<button className="w-6 h-6 rounded bg-white border border-[#EADFD9] hover:bg-[#FAF7F5] text-[#2D282A] text-xs font-medium" type="button">C</button>
<button className="w-6 h-6 rounded bg-white border border-[#EADFD9] hover:bg-[#FAF7F5] text-[#2D282A] text-xs font-medium" type="button">D</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  Table Bottom Helper Bar  */}
<div className="p-4 bg-[#FAF7F5] border-t border-[#EADFD9] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
<div className="flex items-center gap-2 text-[#6E686A] text-xs">
<span className="material-symbols-outlined text-[18px] text-[#E05A7A]">tips_and_updates</span>
<span>Riki AI có thể xử lý đồng loạt 14 cảnh báo Furigana và Stroke mà không ảnh hưởng cấu trúc.</span>
</div>
<div className="flex flex-wrap items-center gap-2">
<button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF0F4] text-[#E05A7A] border border-[#F8BBD0] hover:bg-[#F8BBD0]/30 text-xs font-semibold transition-colors" type="button">
<span className="material-symbols-outlined text-[15px]">auto_fix</span>
<span>Tự động sửa 14 cảnh báo</span>
</button>
<button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EADFD9] hover:bg-[#FAF7F5] text-[#6E686A] text-xs font-semibold transition-colors" type="button">
<span className="material-symbols-outlined text-[15px]">skip_next</span>
<span>Bỏ qua 4 dòng lỗi</span>
</button>
<button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EADFD9] hover:bg-[#FAF7F5] text-[#2D282A] text-xs font-semibold transition-colors" type="button">
<span className="material-symbols-outlined text-[15px]">file_download</span>
<span>Xuất file lỗi (.xlsx)</span>
</button>
</div>
</div>
</div>
{/*  Live Render Simulator Card  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-5 shadow-[0_2px_8px_rgba(45,40,42,0.03)]">
<div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EADFD9]">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[#E05A7A] text-[20px]">preview</span>
<h2 className="text-sm font-bold text-[#2D282A]">Mô phỏng hiển thị trên Ứng dụng Học viên (Riki App Live Render)</h2>
</div>
<span className="text-xs text-[#9E8E93]">Render xem trước bản ghi #42</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{/*  Mobile Flashcard Preview  */}
<div className="p-4 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] flex flex-col justify-between relative overflow-hidden">
<div className="flex items-center justify-between">
<span className="px-2.5 py-0.5 rounded-full bg-[#E05A7A] text-white text-[10px] font-bold">JLPT N3 • Từ vựng</span>
<button className="w-7 h-7 rounded-full bg-white border border-[#EADFD9] flex items-center justify-center text-[#E05A7A] hover:bg-[#FDF0F4]" type="button">
<span className="material-symbols-outlined text-[16px]">volume_up</span>
</button>
</div>
<div className="py-4 flex flex-col items-center text-center">
<ruby className="text-2xl font-bold text-[#E05A7A]">
              咲<rt className="text-xs font-normal text-[#6E686A]">さ</rt>き誇<rt className="text-xs font-normal text-[#6E686A]">ほこ</rt>る
            </ruby>
<div className="flex items-center gap-1.5 mt-2 text-xs text-[#6E686A]">
<span className="w-2 h-2 rounded-full bg-[#2E7D32]"></span>
<span>Pitch Accent: Heiban [0] (さきほこる￣)</span>
</div>
<p className="text-xs text-[#2D282A] mt-2 max-w-xs italic">
              "桜の花が満開に咲き誇っている。" (Hoa anh đào đang nở rộ khoe sắc rực rỡ.)
            </p>
</div>
<div className="flex items-center justify-between pt-2 border-t border-[#EADFD9] text-[11px] text-[#6E686A]">
<span>Thẻ Spaced Repetition</span>
<span className="text-[#2E7D32] font-bold">Sẵn sàng đồng bộ</span>
</div>
</div>
{/*  Editorial Notes  */}
<div className="flex flex-col justify-between p-4 rounded-xl bg-[#FAF7F5] border border-[#EADFD9]">
<div className="flex flex-col gap-2">
<span className="text-[11px] uppercase tracking-wider text-[#9E8E93] font-bold">Thuật toán phân tích ngữ nghĩa Haru</span>
<p className="text-xs text-[#2D282A] leading-relaxed">
              Hệ thống đã tách từ phức thành 2 thành phần gốc: <code className="px-1.5 py-0.5 rounded bg-white border border-[#EADFD9] text-[#E05A7A] font-semibold">咲く (Nở)</code> + <code className="px-1.5 py-0.5 rounded bg-white border border-[#EADFD9] text-[#E05A7A] font-semibold">誇る (Tự hào/khoe)</code>.
            </p>
<div className="p-2.5 rounded-lg bg-white border border-[#EADFD9] mt-1 flex items-center gap-2">
<span className="material-symbols-outlined text-[#2E7D32] text-[18px]">check_circle</span>
<span className="text-xs text-[#2D282A]">Khớp hoàn toàn danh mục 1,800 từ N3 trọng tâm năm 2025.</span>
</div>
</div>
<div className="mt-4 pt-2 border-t border-[#EADFD9] flex items-center justify-between text-xs text-[#6E686A]">
<span>Độ tương thích định dạng JSON:</span>
<span className="font-bold text-[#2D282A]">100% Valid Schema</span>
</div>
</div>
</div>
</div>
</div>
{/*  RIGHT COLUMN (4 cols)  */}
<div className="xl:col-span-4 flex flex-col gap-6 min-w-0">
{/*  Card 1: Import Rules Configuration  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-5 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col gap-4">
<div className="flex items-center gap-2.5 pb-2 border-b border-[#EADFD9]">
<div className="w-8 h-8 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A]">
<span className="material-symbols-outlined text-[18px]">tune</span>
</div>
<div className="flex flex-col">
<h3 className="text-sm font-bold text-[#2D282A]">Cấu hình quy tắc nhập học liệu</h3>
<span className="text-[10px] text-[#9E8E93]">Thiết lập tự động hóa dữ liệu</span>
</div>
</div>
{/*  Duplication Handling  */}
<div className="flex flex-col gap-2">
<span className="text-[11px] font-bold uppercase tracking-wider text-[#9E8E93]">Xử lý bản ghi trùng lặp:</span>
<label className="flex items-start gap-2 p-2 rounded-xl hover:bg-[#FAF7F5] cursor-pointer transition-colors border border-transparent hover:border-[#EADFD9]">
<input className="mt-1 text-[#E05A7A] focus:ring-[#E05A7A]" name="conflict-rule" type="radio" />
<div className="flex flex-col">
<span className="text-xs font-semibold text-[#2D282A]">Bỏ qua bản ghi trùng</span>
<span className="text-[10px] text-[#6E686A]">Giữ nguyên dữ liệu hiện có trên kho, không cập nhật.</span>
</div>
</label>
<label className="flex items-start gap-2 p-2 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] cursor-pointer transition-colors">
<input checked className="mt-1 text-[#E05A7A] focus:ring-[#E05A7A]" name="conflict-rule" type="radio" />
<div className="flex flex-col">
<span className="text-xs font-bold text-[#E05A7A]">Ghi đè bản ghi cũ</span>
<span className="text-[10px] text-[#6E686A]">Cập nhật toàn bộ trường mới và lưu trữ lịch sử snapshot.</span>
</div>
</label>
<label className="flex items-start gap-2 p-2 rounded-xl hover:bg-[#FAF7F5] cursor-pointer transition-colors border border-transparent hover:border-[#EADFD9]">
<input className="mt-1 text-[#E05A7A] focus:ring-[#E05A7A]" name="conflict-rule" type="radio" />
<div className="flex flex-col">
<span className="text-xs font-semibold text-[#2D282A]">Tạo bản nháp chờ đối soát</span>
<span className="text-[10px] text-[#6E686A]">Chuyển sang hàng đợi Duyệt nội dung (12 chờ).</span>
</div>
</label>
</div>
{/*  Interactive Toggles  */}
<div className="flex flex-col gap-3 pt-2 border-t border-[#EADFD9]">
<div className="flex items-center justify-between">
<div className="flex flex-col pr-2">
<span className="text-xs font-semibold text-[#2D282A]">Tự tạo thẻ Spaced Repetition (SRS)</span>
<span className="text-[10px] text-[#9E8E93]">Sinh thẻ ôn tập thông minh cho học viên</span>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0">
<input checked className="sr-only peer" type="checkbox" />
<div className="w-10 h-5 bg-[#EADFD9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E05A7A]"></div>
</label>
</div>
<div className="flex items-center justify-between">
<div className="flex flex-col pr-2">
<span className="text-xs font-semibold text-[#2D282A]">Thanh âm Tokyo Studio (Pitch Accent)</span>
<span className="text-[10px] text-[#9E8E93]">Tự động gắn đồ thị âm thanh chuẩn NHK</span>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0">
<input checked className="sr-only peer" type="checkbox" />
<div className="w-10 h-5 bg-[#EADFD9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E05A7A]"></div>
</label>
</div>
</div>
{/*  Destination Campaign Badge  */}
<div className="p-3 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[#E05A7A] text-[18px]">flag</span>
<div className="flex flex-col leading-tight">
<span className="text-[10px] text-[#9E8E93]">Cấp độ & Chiến dịch đích:</span>
<span className="text-xs font-bold text-[#2D282A]">JLPT N3 - Chiến dịch Hoa Anh Đào 2025</span>
</div>
</div>
<span className="material-symbols-outlined text-[#9E8E93] text-[16px]">lock</span>
</div>
</div>
{/*  Card 2: Riki Haru AI Validator  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-5 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col gap-3.5">
<div className="flex items-center justify-between pb-2 border-b border-[#EADFD9]">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A]">
<span className="material-symbols-outlined text-[18px]">psychology</span>
</div>
<div className="flex flex-col">
<h3 className="text-sm font-bold text-[#2D282A]">Riki Haru AI Validator</h3>
<span className="text-[10px] text-[#9E8E93]">Mô hình kiểm định ngôn ngữ Nhật</span>
</div>
</div>
<span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/30 text-[#2E7D32] text-[10px] font-bold">99.1% Acc</span>
</div>
<div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#FAF7F5] border border-[#EADFD9]">
<div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
<svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
<path className="text-[#EADFD9]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
<path className="text-[#E05A7A]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="99.1, 100" strokeLinecap="round" strokeWidth="3.5"></path>
</svg>
<span className="absolute text-xs font-bold text-[#E05A7A] font-mono">99.1%</span>
</div>
<div className="flex flex-col">
<span className="text-xs font-bold text-[#2D282A]">Độ chuẩn hóa cấu trúc dữ liệu</span>
<span className="text-[11px] text-[#6E686A]">Đã vượt qua 12 bài test định dạng học thuật JLPT N3.</span>
</div>
</div>
<div className="flex flex-col gap-2 pt-1">
<div className="flex items-start gap-2 p-2 rounded-lg bg-[#FAF7F5] border border-[#EADFD9]">
<span className="material-symbols-outlined text-[#E05A7A] text-[16px] shrink-0 mt-0.5">auto_awesome</span>
<p className="text-[11px] text-[#2D282A]">
            Đã tự động chuẩn hóa <strong className="text-[#E05A7A]">128 điểm nối Furigana</strong> và nhận diện chính xác <strong className="text-[#E05A7A]">42 động từ phức nhóm 1</strong>.
          </p>
</div>
<div className="flex items-start gap-2 p-2 rounded-lg bg-[#FAF7F5] border border-[#EADFD9]">
<span className="material-symbols-outlined text-[#2E7D32] text-[16px] shrink-0 mt-0.5">spellcheck</span>
<p className="text-[11px] text-[#2D282A]">
            Không phát hiện ký tự Hán tự ngoài bảng thường dùng (Jōyō Kanji 2,136 chữ).
          </p>
</div>
</div>
</div>
{/*  Card 3: Recent Import History  */}
<div className="bg-white rounded-2xl border border-[#EADFD9] p-5 shadow-[0_2px_8px_rgba(45,40,42,0.03)] flex flex-col gap-3">
<div className="flex items-center justify-between pb-2 border-b border-[#EADFD9]">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[#6E686A] text-[18px]">update</span>
<h3 className="text-xs font-bold text-[#2D282A]">Lịch sử Import gần đây</h3>
</div>
<a className="text-xs text-[#E05A7A] hover:underline font-semibold" href="#">Tất cả</a>
</div>
<div className="flex flex-col gap-2">
<div className="p-2.5 rounded-xl hover:bg-[#FAF7F5] transition-colors border border-[#EADFD9] flex items-center justify-between">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A] font-bold text-xs">
              14
            </div>
<div className="flex flex-col leading-tight">
<span className="text-xs font-bold text-[#2D282A]">1,200 câu hỏi Choukai N2</span>
<span className="text-[10px] text-[#6E686A]">BTV Hoàng Minh • 14/03/2025</span>
</div>
</div>
<span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/30 text-[#2E7D32] text-[10px] font-bold">Hoàn tất</span>
</div>
<div className="p-2.5 rounded-xl hover:bg-[#FAF7F5] transition-colors border border-[#EADFD9] flex items-center justify-between">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#FAF7F5] border border-[#EADFD9] flex items-center justify-center text-[#2D282A] font-bold text-xs">
              12
            </div>
<div className="flex flex-col leading-tight">
<span className="text-xs font-bold text-[#2D282A]">350 Hán tự Jouyou N3</span>
<span className="text-[10px] text-[#6E686A]">Sensei Mayumi • 12/03/2025</span>
</div>
</div>
<span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/30 text-[#2E7D32] text-[10px] font-bold">Hoàn tất</span>
</div>
</div>
</div>
</div>
</div>
{/*  Bottom Sticky Action Bar  */}
<div className="sticky bottom-4 mt-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-[#EADFD9] shadow-[0_8px_30px_rgba(45,40,42,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#FDF0F4] border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A] shrink-0">
<span className="material-symbols-outlined text-[22px]">publish</span>
</div>
<div className="flex flex-col">
<span className="text-sm font-bold text-[#2D282A]">Sẵn sàng xuất bản 446 / 450 bản ghi</span>
<span className="text-xs text-[#6E686A]">Đã xử lý xong cảnh báo AI • 4 dòng lỗi bị loại trừ an toàn</span>
</div>
</div>
<div className="flex items-center gap-3 self-end sm:self-auto">
<button className="px-4 py-2 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] hover:bg-white text-[#2D282A] text-xs font-semibold transition-colors" type="button">
      Quay lại bước 2
    </button>
<button className="px-4 py-2 rounded-xl text-[#6E686A] hover:text-[#2D282A] hover:bg-[#FAF7F5] text-xs font-semibold transition-colors" type="button">
      Hủy bỏ
    </button>
<button className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#E05A7A] hover:bg-[#C84364] text-white text-xs font-bold shadow-[0_4px_16px_rgba(224,90,122,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0" type="button">
<span>Tiến hành Import 446 bản ghi</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
</div>
</div></div></div></main></div>
    </div>
  
</CmsShell>
);
}
