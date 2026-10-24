import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LearnerShell } from '../../components/shells';
import Pagination from '../../components/Pagination.jsx';

export default function VocabularyNotebook() {
  const { pathname } = useLocation();
  const [vocabPage, setVocabPage] = useState(1);
  const [vocabPageSize, setVocabPageSize] = useState(10);


  return (
    <LearnerShell pathname={pathname} breadcrumb="Sổ từ">
<div className="bg-background font-body-md text-on-surface antialiased min-h-screen" data-page="VocabularyNotebook" data-shell-unified="1">

<main className="w-full pt-0 bg-background">
<p role="status">Mục này chưa có dữ liệu.</p>
<div className="flex flex-col w-full font-body-md text-on-surface">
<div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl">
{/*  Top Utility & Streak Header Strip  */}
<div className="flex flex-wrap items-center justify-between gap-space-md mb-space-xl bg-surface-container-lowest p-space-md rounded-2xl shadow-sm"><div className="flex items-center gap-space-md min-w-0"><div className="w-12 h-12 rounded-2xl bg-secondary-container/30 flex items-center justify-center text-primary shrink-0 ring-1 ring-secondary-container/50 shadow-sm"><span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_library</span></div><div className="min-w-0"><div className="flex items-center gap-space-xs"><h1 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">Sổ tay Từ vựng & Bộ sưu tập</h1><span className="px-2.5 py-0.5 rounded-full bg-secondary-container/50 text-primary font-label-sm text-label-sm font-semibold ring-1 ring-secondary-container">—</span></div><p className="font-body-sm text-body-sm text-on-surface-variant truncate mt-0.5">—</p></div></div><div className="flex items-center gap-space-md shrink-0"><div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-lowest ring-1 ring-secondary-container/40 shadow-sm"><span className="material-symbols-outlined text-primary text-[22px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span><div className="flex flex-col"><span className="font-label-sm text-label-sm font-bold text-primary leading-tight">—</span><span className="font-label-sm text-[11px] text-on-surface-variant leading-none">—</span></div></div><div className="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-lowest ring-1 ring-surface-container-high text-on-surface-variant font-label-sm text-label-sm cursor-pointer hover:bg-surface-container-low transition-colors shadow-sm"><span className="material-symbols-outlined text-[16px]">keyboard</span><span className="">Tìm nhanh</span><kbd className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-mono shadow-sm">⌘K</kbd></div><Link to="/daily-srs" className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-space-xs shadow-[0_2px_10px_rgba(217,75,104,0.2)] hover:opacity-95 active:scale-[0.98] transition-all font-semibold" id="btn-top-review"><span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span><span className="">—</span></Link></div></div>
{/*  Main Workspace Workspace Split: 280px Sub-Sidebar + Flexible Data Canvas  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
{/*  LEFT COLUMN: My Lists & Weekly Goal Card (Col span 3 ~ 280px equivalent on 1440)  */}

{/*  RIGHT COLUMN: Detailed Data Grid & Management Workspace (Col span 9)  */}
<main className="lg:col-span-9 space-y-space-md">
<p role="status">—</p>

{/*  Table Control Panel: Search, Level Filter, Status Filter & CTA Action Group  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm space-y-space-md ring-1 ring-surface-container-high">
{/*  Upper Row: Title & Action Cluster  */}
<div className="flex flex-wrap items-center justify-between gap-space-md">
<div className="flex items-center gap-space-sm">
<h2 className="font-headline-md text-headline-md text-on-surface font-bold">Tất cả từ vựng trong Sổ tay</h2>
<span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">—</span>
</div>
<div className="flex items-center gap-space-xs flex-wrap">
{/*  Bulk Action Trigger  */}
<button className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm" id="btn-toggle-bulk">
<span className="material-symbols-outlined text-[18px]">checklist</span>
<span className="">Chọn hàng loạt</span>
</button>
{/*  Export CSV/Excel  */}
<button className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm">
<span className="material-symbols-outlined text-[18px]">ios_share</span>
<span className="">Xuất Excel/CSV</span>
</button>
{/*  Main Add Word CTA Button  */}
<button className="px-space-lg py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm">
<span className="material-symbols-outlined text-[18px]">add</span>
<span className="">+ Thêm từ vựng mới</span>
</button>
</div>
</div>
{/*  Lower Row: Search Bar & Multi-Dimensional Filtering  */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
{/*  Search Input (Kanji, Furigana, Hán-Việt, Meaning)  */}
<div className="md:col-span-6 relative">
<span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
<input className="w-full pl-10 pr-space-md py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest transition-all" placeholder="Tìm kiếm Kanji, Furigana, Âm Hán-Việt, ý nghĩa tiếng Việt..." type="text" />
</div>
{/*  Level Segment Filter  */}
<div className="md:col-span-3 flex items-center bg-surface-container-low p-1 rounded-xl">
<button className="flex-1 py-1 text-center font-label-sm text-label-sm rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">N5</button>
<button className="flex-1 py-1 text-center font-label-sm text-label-sm rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">N4</button>
<button className="flex-1 py-1 text-center font-label-sm text-label-sm rounded-lg bg-surface-container-lowest text-primary font-bold shadow-sm">N3</button>
<button className="flex-1 py-1 text-center font-label-sm text-label-sm rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">Tất cả</button>
</div>
{/*  Memory Status Filter Pills  */}
<div className="md:col-span-3 flex items-center justify-end gap-1">
<button className="px-2.5 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-sm text-[11px] font-semibold flex items-center gap-1 shadow-sm">
<span className="w-1.5 h-1.5 rounded-full bg-error"></span>
<span className="">—</span>
</button>
<button className="px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-[11px] hover:bg-surface-container-high transition-colors">{"Nhớ sâu (310)\n              "}</button>
<button className="px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-[11px] hover:bg-surface-container-high transition-colors">{"Mới lưu (82)\n              "}</button>
</div>
</div>
</div>
{/*  Modern Data Table Container  */}
<div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden ring-1 ring-surface-container-high">
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
<th className="py-space-sm pl-space-md pr-space-xs w-10">
<input className="w-4 h-4 rounded accent-primary cursor-pointer text-primary bg-surface-container-lowest" id="master-checkbox" type="checkbox" />
</th>
<th className="py-space-sm px-space-sm">Từ vựng (Kanji & Kana)</th>
<th className="py-space-sm px-space-sm">Âm Hán-Việt & Ý nghĩa</th>
<th className="py-space-sm px-space-sm">Cấp độ & Thẻ</th>
<th className="py-space-sm px-space-sm">Vòng lặp SRS</th>
<th className="py-space-sm px-space-sm">Lần ôn gần nhất</th>
<th className="py-space-sm pl-space-sm pr-space-md text-right">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm"><tr><td colSpan={20} className="p-6 text-center">—</td></tr></tbody>
</table>
</div>
{/*  Table Pagination & Count Footer  */}
<Pagination
  currentPage={vocabPage}
  totalPages={1}
  pageSize={vocabPageSize}
  totalItems={0}
  onPageChange={setVocabPage}
  onPageSizeChange={setVocabPageSize}
  pageSizeOptions={[5, 10, 20, 50]}
  itemLabel="từ vựng"
  variant="sakura"
/>
</div>

{/*  Rich Visual: Kanji Retention Mastery Overview Card  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-space-lg items-center">
<div className="space-y-space-xxs md:col-span-2">
<div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
<span className="material-symbols-outlined text-[18px]">psychology</span>
<span className="">—</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface font-bold">—</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
{/*  Inline SVG Mini Donut Chart for Retention  */}
<div className="flex items-center justify-center md:justify-end gap-space-md">
<div className="relative w-24 h-24 flex items-center justify-center shrink-0">
<svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
{/*  Background track  */}
<path className="text-surface-container" d="" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
{/*  Progress stroke (74% mastery)  */}
<path className="text-primary" d="" fill="none" stroke="currentColor" strokeDasharray="74, 100" strokeLinecap="round" strokeWidth="3.5"></path>
</svg>
<div className="absolute flex flex-col items-center justify-center">
<span className="font-headline-sm text-[20px] font-bold text-primary leading-none">—</span>
<span className="font-label-sm text-[10px] text-on-surface-variant">Nhớ sâu</span>
</div>
</div>
<div className="space-y-1 font-label-sm text-[11px]">
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
<span className="text-on-surface font-medium">—</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full bg-error shrink-0"></span>
<span className="text-on-surface font-medium">—</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest shrink-0"></span>
<span className="text-on-surface font-medium">—</span>
</div>
</div>
</div>
</div>
</main>
</div>
</div>
{/*  FLOATING ACTION BAR: Active When Items are Selected (2 words selected)  */}
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-space-lg py-space-sm rounded-2xl bg-on-surface text-surface-container-lowest shadow-xl flex items-center gap-space-lg backdrop-blur-md" id="floating-batch-bar">
<div className="flex items-center gap-space-xs font-label-md text-label-md">
<span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
<span className="">Đã chọn <strong className="text-secondary-fixed">—</strong> từ vựng</span>
</div>
<div className="h-4 w-px bg-on-surface-variant/40"></div>
<div className="flex items-center gap-space-xs">
{/*  Action 1: Move notebook  */}
<button className="px-space-md py-1.5 rounded-xl bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 font-label-sm text-label-sm flex items-center gap-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">folder_shared</span>
<span className="">Chuyển sổ từ</span>
</button>
{/*  Action 2: Practice SRS with  */}
<button className="px-space-md py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:opacity-95 transition-all flex items-center gap-1 shadow-sm">
<span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<span className="">—</span>
</button>
{/*  Action 3: Delete  */}
<button className="p-1.5 rounded-xl hover:bg-error/30 text-error-container transition-colors" title="Xóa các mục đã chọn">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
{/*  BOTTOM-RIGHT TOAST NOTIFICATION: Cloud Sync Status  */}
<div className="fixed bottom-6 right-6 z-50 p-space-md rounded-2xl bg-surface-container-lowest shadow-xl flex items-start gap-space-sm max-w-sm">
<div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[18px]">cloud_sync</span>
</div>
<div className="min-w-0 flex-1">
<p className="font-label-md text-label-md font-bold text-on-surface">—</p>
<p className="font-body-sm text-[12px] text-on-surface-variant leading-snug mt-0.5">—</p>
</div>
<button className="text-on-surface-variant hover:text-on-surface" onClick={() => window.alert('Mục này chưa có dữ liệu.')}>
<span className="material-symbols-outlined text-[16px]">close</span>
</button>
</div>
</div>
</main>
<footer className="w-full bg-surface-container-low shadow-[0_-1px_16px_rgba(217,75,104,0.04)] mt-space-3xl"><div className="w-full px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-3xl"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter-desktop mb-space-2xl"><div className="lg:col-span-2 space-y-space-md"><div className="flex items-center gap-space-xs"><div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">filter_vintage</span></div><span className="font-headline-sm text-headline-sm font-bold text-primary">RikiPath Learning</span></div><p className="font-body-md text-body-md text-on-surface-variant max-w-md">—</p><div className="flex items-center gap-space-sm pt-space-xs"><span className="px-space-md py-space-xxs rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-primary">location_on</span>Tokyo • Shinjuku Campus</span><span className="px-space-md py-space-xxs rounded-full bg-secondary-fixed font-label-sm text-label-sm text-on-secondary-fixed">—</span></div></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Chương trình đào tạo</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">Luyện thi JLPT Siêu tốc</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Tài nguyên học tập</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thử JLPT có chấm điểm</li><li className="font-body-sm text-body-sm text-on-surface-variant">Góc văn hóa & Đời sống Tokyo</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Hỗ trợ học viên</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">Cộng đồng học viên RikiPath</li><li className="font-body-sm text-body-sm text-on-surface-variant">Chính sách bảo hành đỗ JLPT</li><li className="font-body-sm text-body-sm text-on-surface-variant">Trợ giúp kỹ thuật & Tài khoản</li></ul></div></div><div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="material-symbols-outlined text-[16px] text-primary">local_florist</span><span className="">—</span></div><div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant"><span className="hover:text-on-surface cursor-pointer">Điều khoản học tập</span><span className="hover:text-on-surface cursor-pointer">Bảo mật thông tin</span><span className="hover:text-on-surface cursor-pointer">Tiêu chuẩn JLPT</span></div></div></div></footer>


    </div>

</LearnerShell>
);
}
