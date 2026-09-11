import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function VocabularyNotebook() {
  const { pathname } = useLocation();
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') {
        try { fn(); } catch (err) { console.warn(err); }
        return;
      }
      return orig(type, fn, opts);
    };
    try {
      // Simple Micro-interactions for interactive feedback
        document.addEventListener('DOMContentLoaded', () => {
          const masterCheck = document.getElementById('master-checkbox');
          const wordChecks = document.querySelectorAll('.word-select');
          const floatingBar = document.getElementById('floating-batch-bar');
      
          function updateFloatingBar() {
            const selectedCount = Array.from(wordChecks).filter(c => c.checked).length;
            if (selectedCount > 0) {
              floatingBar.classList.remove('hidden');
              floatingBar.classList.add('flex');
            } else {
              floatingBar.classList.add('hidden');
              floatingBar.classList.remove('flex');
            }
          }
      
          if (masterCheck) {
            masterCheck.addEventListener('change', (e) => {
              wordChecks.forEach(c => {
                c.checked = e.target.checked;
                const row = c.closest('tr');
                if (row) {
                  if (e.target.checked) {
                    row.classList.add('bg-secondary-container/15');
                  } else {
                    row.classList.remove('bg-secondary-container/15');
                  }
                }
              });
              updateFloatingBar();
            });
          }
      
          wordChecks.forEach(c => {
            c.addEventListener('change', (e) => {
              const row = e.target.closest('tr');
              if (row) {
                if (e.target.checked) {
                  row.classList.add('bg-secondary-container/15');
                } else {
                  row.classList.remove('bg-secondary-container/15');
                }
              }
              updateFloatingBar();
            });
          });
        });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Sổ từ">
<div className="bg-background font-body-md text-on-surface antialiased min-h-screen" data-page="VocabularyNotebook" data-shell-unified="1">

<main className="w-full pt-0 bg-background"><div className="flex flex-col w-full font-body-md text-on-surface">
<div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl">
{/*  Top Utility & Streak Header Strip  */}
<div className="flex flex-wrap items-center justify-between gap-space-md mb-space-xl bg-surface-container-lowest p-space-md rounded-2xl shadow-sm"><div className="flex items-center gap-space-md min-w-0"><div className="w-12 h-12 rounded-2xl bg-secondary-container/30 flex items-center justify-center text-primary shrink-0 ring-1 ring-secondary-container/50 shadow-sm"><span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_library</span></div><div className="min-w-0"><div className="flex items-center gap-space-xs"><h1 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">Sổ tay Từ vựng & Bộ sưu tập</h1><span className="px-2.5 py-0.5 rounded-full bg-secondary-container/50 text-primary font-label-sm text-label-sm font-semibold ring-1 ring-secondary-container">N3 Neo-Sakura</span></div><p className="font-body-sm text-body-sm text-on-surface-variant truncate mt-0.5">Hệ thống lưu trữ phân tầng Spaced Repetition (SRS) & đồng bộ đa thiết bị tức thì</p></div></div><div className="flex items-center gap-space-md shrink-0"><div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-lowest ring-1 ring-secondary-container/40 shadow-sm"><span className="material-symbols-outlined text-primary text-[22px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span><div className="flex flex-col"><span className="font-label-sm text-label-sm font-bold text-primary leading-tight">Chuỗi 14 Ngày Hoa Đào</span><span className="font-label-sm text-[11px] text-on-surface-variant leading-none">Mục tiêu hôm nay: 28 từ SRS</span></div></div><div className="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-lowest ring-1 ring-surface-container-high text-on-surface-variant font-label-sm text-label-sm cursor-pointer hover:bg-surface-container-low transition-colors shadow-sm"><span className="material-symbols-outlined text-[16px]">keyboard</span><span className="">Tìm nhanh</span><kbd className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-mono shadow-sm">⌘K</kbd></div><Link to="/daily-srs" className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-space-xs shadow-[0_2px_10px_rgba(217,75,104,0.2)] hover:opacity-95 active:scale-[0.98] transition-all font-semibold" id="btn-top-review"><span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span><span className="">Bắt đầu ôn tập (28 từ)</span></Link></div></div>
{/*  Main Workspace Workspace Split: 280px Sub-Sidebar + Flexible Data Canvas  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
{/*  LEFT COLUMN: My Lists & Weekly Goal Card (Col span 3 ~ 280px equivalent on 1440)  */}

{/*  RIGHT COLUMN: Detailed Data Grid & Management Workspace (Col span 9)  */}
<main className="lg:col-span-9 space-y-space-md">
{/*  Table Control Panel: Search, Level Filter, Status Filter & CTA Action Group  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm space-y-space-md ring-1 ring-surface-container-high">
{/*  Upper Row: Title & Action Cluster  */}
<div className="flex flex-wrap items-center justify-between gap-space-md">
<div className="flex items-center gap-space-sm">
<h2 className="font-headline-md text-headline-md text-on-surface font-bold">Tất cả từ vựng trong Sổ tay</h2>
<span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">420 từ vựng</span>
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
<span className="">Cần ôn (28)</span>
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
<tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm">
{/*  ROW 1: 経験 (Active Selection State Sample)  */}
<tr className="bg-secondary-container/15 hover:bg-surface-container-low transition-colors group">
<td className="py-space-md pl-space-md pr-space-xs align-middle">
<input checked className="word-select w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" />
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-start gap-space-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-primary font-medium tracking-wide">けいけん</span>
<span className="font-japanese-display text-[22px] font-bold text-on-surface leading-tight">経験</span>
</div>
<button className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Nghe phát âm chuẩn">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</td>
<td className="py-space-md px-space-sm align-middle max-w-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">KINH NGHIỆM</span>
<span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Kinh nghiệm làm việc thực tế, trải nghiệm tích lũy</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1 flex-wrap">
<span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px] font-bold">JLPT N3</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px]">Công việc</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-2">
<div className="flex gap-1">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="w-2 h-2 rounded-full bg-surface-container-highest"></span>
<span className="w-2 h-2 rounded-full bg-surface-container-highest"></span>
</div>
<span className="font-label-sm text-[11px] text-on-surface-variant font-semibold">Vòng 3</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle text-on-surface-variant font-body-sm">{"Hôm qua\n                  "}</td>
<td className="py-space-md pl-space-sm pr-space-md align-middle text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chỉnh sửa từ vựng">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chuyển sổ từ">
<span className="material-symbols-outlined text-[18px]">drive_file_move</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Xóa từ vựng">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</td>
</tr>
{/*  ROW 2: 改善 (Active Selection State Sample)  */}
<tr className="bg-secondary-container/15 hover:bg-surface-container-low transition-colors group">
<td className="py-space-md pl-space-md pr-space-xs align-middle">
<input checked className="word-select w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" />
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-start gap-space-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-primary font-medium tracking-wide">かいぜん</span>
<span className="font-japanese-display text-[22px] font-bold text-on-surface leading-tight">改善</span>
</div>
<button className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Nghe phát âm chuẩn">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</td>
<td className="py-space-md px-space-sm align-middle max-w-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">CẢI THIỆN</span>
<span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Cải tiến chất lượng quy trình sản xuất, tối ưu</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1 flex-wrap">
<span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px] font-bold">JLPT N3</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px]">Business</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-[11px] font-bold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>{"Cần ôn hôm nay\n                      "}</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle text-on-surface-variant font-body-sm">{"4 ngày trước\n                  "}</td>
<td className="py-space-md pl-space-sm pr-space-md align-middle text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chỉnh sửa từ vựng">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chuyển sổ từ">
<span className="material-symbols-outlined text-[18px]">drive_file_move</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Xóa từ vựng">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</td>
</tr>
{/*  ROW 3: 案内する  */}
<tr className="hover:bg-surface-container-low transition-colors group">
<td className="py-space-md pl-space-md pr-space-xs align-middle">
<input className="word-select w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" />
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-start gap-space-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-primary font-medium tracking-wide">あんないする</span>
<span className="font-japanese-display text-[22px] font-bold text-on-surface leading-tight">案内する</span>
</div>
<button className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Nghe phát âm chuẩn">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</td>
<td className="py-space-md px-space-sm align-middle max-w-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">ÁN NỘI</span>
<span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Hướng dẫn, dẫn đường, phổ biến thông tin</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1 flex-wrap">
<span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-[11px] font-bold">JLPT N4</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px]">Giao thông</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded-md bg-tertiary/15 text-tertiary font-label-sm text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">done_all</span>{"Đã nhớ sâu (Lv 4)\n                      "}</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle text-on-surface-variant font-body-sm">{"3 ngày trước\n                  "}</td>
<td className="py-space-md pl-space-sm pr-space-md align-middle text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chỉnh sửa từ vựng">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chuyển sổ từ">
<span className="material-symbols-outlined text-[18px]">drive_file_move</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Xóa từ vựng">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</td>
</tr>
{/*  ROW 4: 約束  */}
<tr className="hover:bg-surface-container-low transition-colors group">
<td className="py-space-md pl-space-md pr-space-xs align-middle">
<input className="word-select w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" />
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-start gap-space-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-primary font-medium tracking-wide">やくそく</span>
<span className="font-japanese-display text-[22px] font-bold text-on-surface leading-tight">約束</span>
</div>
<button className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Nghe phát âm chuẩn">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</td>
<td className="py-space-md px-space-sm align-middle max-w-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">ƯỚC THÚC</span>
<span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Lời hứa, hẹn ước, cuộc hẹn đã sắp xếp</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1 flex-wrap">
<span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-[11px] font-bold">JLPT N4</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px]">Đời sống</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-[11px] font-bold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-error"></span>{"Cần ôn hôm nay\n                      "}</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle text-on-surface-variant font-body-sm">{"6 ngày trước\n                  "}</td>
<td className="py-space-md pl-space-sm pr-space-md align-middle text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chỉnh sửa từ vựng">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chuyển sổ từ">
<span className="material-symbols-outlined text-[18px]">drive_file_move</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Xóa từ vựng">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</td>
</tr>
{/*  ROW 5: 準備  */}
<tr className="hover:bg-surface-container-low transition-colors group">
<td className="py-space-md pl-space-md pr-space-xs align-middle">
<input className="word-select w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" />
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-start gap-space-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-primary font-medium tracking-wide">じゅんび</span>
<span className="font-japanese-display text-[22px] font-bold text-on-surface leading-tight">準備</span>
</div>
<button className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Nghe phát âm chuẩn">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</td>
<td className="py-space-md px-space-sm align-middle max-w-xs">
<div className="flex flex-col">
<span className="font-label-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">CHUẨN BỊ</span>
<span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Chuẩn bị chu đáo, sắp đặt trang thiết bị</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1 flex-wrap">
<span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-[11px] font-bold">JLPT N4</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px]">Cơ bản</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle">
<div className="flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">{"Mới học hôm qua\n                      "}</span>
</div>
</td>
<td className="py-space-md px-space-sm align-middle text-on-surface-variant font-body-sm">{"12 giờ trước\n                  "}</td>
<td className="py-space-md pl-space-sm pr-space-md align-middle text-right">
<div className="flex items-center justify-end gap-1">
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chỉnh sửa từ vựng">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Chuyển sổ từ">
<span className="material-symbols-outlined text-[18px]">drive_file_move</span>
</button>
<button className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Xóa từ vựng">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
{/*  Table Pagination & Count Footer  */}
<div className="px-space-md py-space-sm bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
<span className="">Hiển thị <strong>1 - 5</strong> trên tổng số <strong>420</strong> từ vựng</span>
<div className="flex items-center gap-1">
<button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-40" disabled>
<span className="material-symbols-outlined text-[18px]">chevron_left</span>
</button>
<button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-bold shadow-sm">1</button>
<button className="w-8 h-8 rounded-lg hover:bg-surface-container transition-colors">2</button>
<button className="w-8 h-8 rounded-lg hover:bg-surface-container transition-colors">3</button>
<span className="px-1 text-on-surface-variant">...</span>
<button className="w-8 h-8 rounded-lg hover:bg-surface-container transition-colors">84</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
</div>
</div>
{/*  Rich Visual: Kanji Retention Mastery Overview Card  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-space-lg items-center">
<div className="space-y-space-xxs md:col-span-2">
<div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
<span className="material-symbols-outlined text-[18px]">psychology</span>
<span className="">Chỉ số lưu giữ trí nhớ dài hạn (SRS Retention)</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Bạn đã thành thạo 310/420 từ vựng cốt lõi N3</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">{"Theo thuật toán giãn cách thời gian Ebbinghaus, 28 từ vựng cần được ôn tập trong hôm nay để chuyển vào vùng trí nhớ vĩnh viễn trước kỳ thi tháng 7.\n            "}</p>
</div>
{/*  Inline SVG Mini Donut Chart for Retention  */}
<div className="flex items-center justify-center md:justify-end gap-space-md">
<div className="relative w-24 h-24 flex items-center justify-center shrink-0">
<svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
{/*  Background track  */}
<path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
{/*  Progress stroke (74% mastery)  */}
<path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="74, 100" strokeLinecap="round" strokeWidth="3.5"></path>
</svg>
<div className="absolute flex flex-col items-center justify-center">
<span className="font-headline-sm text-[20px] font-bold text-primary leading-none">74%</span>
<span className="font-label-sm text-[10px] text-on-surface-variant">Nhớ sâu</span>
</div>
</div>
<div className="space-y-1 font-label-sm text-[11px]">
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
<span className="text-on-surface font-medium">310 Đã nhớ lâu</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full bg-error shrink-0"></span>
<span className="text-on-surface font-medium">28 Cần ôn ngay</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest shrink-0"></span>
<span className="text-on-surface font-medium">82 Mới bắt đầu</span>
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
<span className="">Đã chọn <strong className="text-secondary-fixed">2</strong> từ vựng</span>
</div>
<div className="h-4 w-px bg-on-surface-variant/40"></div>
<div className="flex items-center gap-space-xs">
{/*  Action 1: Move notebook  */}
<button className="px-space-md py-1.5 rounded-xl bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 font-label-sm text-label-sm flex items-center gap-1 transition-colors">
<span className="material-symbols-outlined text-[16px]">folder_shared</span>
<span className="">Chuyển sổ từ</span>
</button>
{/*  Action 2: Practice SRS with selected  */}
<button className="px-space-md py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:opacity-95 transition-all flex items-center gap-1 shadow-sm">
<span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<span className="">Luyện Spaced Repetition (2)</span>
</button>
{/*  Action 3: Delete selected  */}
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
<p className="font-label-md text-label-md font-bold text-on-surface">Đồng bộ đám mây tức thì</p>
<p className="font-body-sm text-[12px] text-on-surface-variant leading-snug mt-0.5">{"Đã tự động đồng bộ đám mây với ứng dụng di động của bạn trên iOS &amp; Android.\n      "}</p>
</div>
<button className="text-on-surface-variant hover:text-on-surface" onClick="this.parentElement.remove()">
<span className="material-symbols-outlined text-[16px]">close</span>
</button>
</div>
</div>
</main>
<footer className="w-full bg-surface-container-low shadow-[0_-1px_16px_rgba(217,75,104,0.04)] mt-space-3xl"><div className="w-full px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-3xl"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter-desktop mb-space-2xl"><div className="lg:col-span-2 space-y-space-md"><div className="flex items-center gap-space-xs"><div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">filter_vintage</span></div><span className="font-headline-sm text-headline-sm font-bold text-primary">RikiPath Learning</span></div><p className="font-body-md text-body-md text-on-surface-variant max-w-md">Nền tảng học tiếng Nhật và luyện thi JLPT tinh tuyển theo triết lý tối giản Ma (間) cùng vẻ đẹp thanh thoát của hoa anh đào Nhật Bản.</p><div className="flex items-center gap-space-sm pt-space-xs"><span className="px-space-md py-space-xxs rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-primary">location_on</span>Tokyo • Shinjuku Campus</span><span className="px-space-md py-space-xxs rounded-full bg-secondary-fixed font-label-sm text-label-sm text-on-secondary-fixed">JLPT N5 → N1</span></div></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Chương trình đào tạo</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N5 - N4 Sơ cấp</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N3 Bứt phá</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N2 - N1 Chuyên sâu</li><li className="font-body-sm text-body-sm text-on-surface-variant">Luyện thi JLPT Siêu tốc</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Tài nguyên học tập</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Thư viện 2,136 Kanji Thường dụng</li><li className="font-body-sm text-body-sm text-on-surface-variant">Kho từ vựng Sakura Flashcard</li><li className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thử JLPT có chấm điểm</li><li className="font-body-sm text-body-sm text-on-surface-variant">Góc văn hóa & Đời sống Tokyo</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Hỗ trợ học viên</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Cố vấn học tập 1:1</li><li className="font-body-sm text-body-sm text-on-surface-variant">Cộng đồng học viên RikiPath</li><li className="font-body-sm text-body-sm text-on-surface-variant">Chính sách bảo hành đỗ JLPT</li><li className="font-body-sm text-body-sm text-on-surface-variant">Trợ giúp kỹ thuật & Tài khoản</li></ul></div></div><div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="material-symbols-outlined text-[16px] text-primary">local_florist</span><span className="">© 2024 RikiPath Learning Platform. Thiết kế hòa quyện nghệ thuật tối giản Nhật Bản.</span></div><div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant"><span className="hover:text-on-surface cursor-pointer">Điều khoản học tập</span><span className="hover:text-on-surface cursor-pointer">Bảo mật thông tin</span><span className="hover:text-on-surface cursor-pointer">Tiêu chuẩn JLPT</span></div></div></div></footer>


    </div>
  
</LearnerShell>
);
}
