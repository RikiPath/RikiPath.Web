import { useEffect } from 'react';
import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function QuestionBank() {
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
      (function() {
          // Select All Checkbox Handling
          const selectAll = document.getElementById('selectAllCheckbox');
          const questionBoxes = document.querySelectorAll('.question-checkbox');
          const selectedCountSpan = document.getElementById('selectedCount');
      
          function updateCount() {
            const checkedCount = document.querySelectorAll('.question-checkbox:checked').length;
            if (selectedCountSpan) {
              selectedCountSpan.textContent = checkedCount;
            }
            if (selectAll) {
              selectAll.checked = checkedCount === questionBoxes.length && questionBoxes.length > 0;
            }
          }
      
          if (selectAll) {
            selectAll.addEventListener('change', function() {
              questionBoxes.forEach(cb => {
                cb.checked = selectAll.checked;
              });
              updateCount();
            });
          }
      
          questionBoxes.forEach(cb => {
            cb.addEventListener('change', updateCount);
          });
      
          // Audio Play Button Mock Toggle
          const audioBtn = document.getElementById('audioPlayBtn');
          if (audioBtn) {
            let isPlaying = false;
            audioBtn.addEventListener('click', function() {
              isPlaying = !isPlaying;
              const icon = audioBtn.querySelector('.material-symbols-outlined');
              if (icon) {
                icon.textContent = isPlaying ? 'pause' : 'play_arrow';
              }
            });
          }
        })();
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <CmsShell pathname={pathname} breadcrumb="Ngân hàng câu hỏi">
<div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen" data-page="QuestionBank" data-shell-unified="1">

<div className="pl-0"><main className="w-full pt-0 px-gutter-desktop min-h-screen bg-surface"><div className="flex flex-col w-full pb-space-3xl space-y-space-2xl">
{/*  Top Ambient Banner & Header Info  */}
<div className="relative overflow-hidden rounded-2xl bg-white border border-[#EADFD9] p-7 shadow-[0_2px_12px_rgba(45,40,42,0.03)]"><div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#F8BBD0]/30 blur-3xl pointer-events-none"></div><div className="absolute right-1/4 -bottom-16 w-56 h-56 rounded-full bg-[#FDF2F5] blur-2xl pointer-events-none"></div><div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"><div className="space-y-2 max-w-2xl"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F5] border border-[#F8BBD0]/60 shadow-xs text-[#E05A7A]"><span className="material-symbols-outlined text-[15px]">local_florist</span><span className="text-[11px] uppercase tracking-wider font-bold">Kho tài nguyên khảo thí học thuật</span><span className="text-[#EADFD9]">•</span><span className="text-[11px] text-[#6E686A] font-medium">Sakura Academic Grid 2025</span></div><h1 className="text-[26px] font-bold text-[#2D282A] tracking-tight leading-snug">Ngân hàng Câu hỏi & Khảo thí JLPT</h1><p className="text-[14px] text-[#6E686A] leading-relaxed">Quản lý toàn diện 8,950 câu hỏi chuẩn cấu trúc đề thi năng lực Nhật ngữ từ N5 đến N1. Tích hợp audio Choukai phòng thu và thẩm định học thuật đa tầng.</p></div><div className="flex flex-wrap items-center gap-3"><button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EADFD9] text-[#2D282A] font-semibold text-[13px] shadow-sm hover:border-[#F8BBD0] hover:bg-[#FAF7F5] transition-all"><span className="material-symbols-outlined text-[18px] text-[#6E686A]">upload_file</span><span>Nhập Excel / CSV</span></button><button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] text-[#2D282A] font-semibold text-[13px] shadow-sm hover:bg-white hover:border-[#F8BBD0] transition-all"><span className="material-symbols-outlined text-[18px] text-[#6E686A]">rule_folder</span><span>Ma trận đề</span></button><button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E05A7A] hover:bg-[#C94766] text-white font-semibold text-[13px] shadow-[0_4px_16px_rgba(224,90,122,0.3)] transition-all active:scale-95"><span className="material-symbols-outlined text-[18px]">add_circle</span><span>Thêm câu hỏi mới</span></button></div></div></div>
{/*  SECTION 1: Metrics Overview Cards  */}
<section className="space-y-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h2 className="font-title-md text-title-md text-on-surface font-bold">Thống kê Phân bổ Học liệu</h2>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">Cập nhật lúc: 09:30 AM (Tokyo Time)</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-md">
{/*  Total Questions  */}
<div className="relative group p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div className="flex items-start justify-between">
<span className="font-label-md text-label-md text-on-surface-variant">Tổng câu hỏi</span>
<div className="w-8 h-8 rounded-lg bg-secondary-container/50 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[18px]">inventory_2</span>
</div>
</div>
<div className="mt-space-md">
<div className="font-headline-lg text-headline-lg font-bold text-on-surface">8,950</div>
<div className="mt-1 flex items-center gap-1 font-label-sm text-label-sm text-tertiary">
<span className="material-symbols-outlined text-[14px]">trending_up</span>
<span>+142 câu tuần này</span>
</div>
</div>
<div className="mt-space-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full w-full"></div>
</div>
</div>
{/*  Kanji & Vocab  */}
<div className="relative group p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div className="flex items-start justify-between">
<span className="font-label-md text-label-md text-on-surface-variant">Từ vựng & Hán tự</span>
<div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-[18px]">translate</span>
</div>
</div>
<div className="mt-space-md">
<div className="font-headline-lg text-headline-lg font-bold text-on-surface">2,840</div>
<div className="mt-1 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
<span>Tỷ lệ: 31.7%</span>
<span className="text-primary font-medium">N5-N1</span>
</div>
</div>
<div className="mt-space-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-secondary rounded-full" style={{ width: "32%" }}></div>
</div>
</div>
{/*  Grammar  */}
<div className="relative group p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div className="flex items-start justify-between">
<span className="font-label-md text-label-md text-on-surface-variant">Ngữ pháp (Bunpou)</span>
<div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[18px]">auto_stories</span>
</div>
</div>
<div className="mt-space-md">
<div className="font-headline-lg text-headline-lg font-bold text-on-surface">3,120</div>
<div className="mt-1 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
<span>Tỷ lệ: 34.8%</span>
<span className="text-tertiary font-medium">Đạt chuẩn 98%</span>
</div>
</div>
<div className="mt-space-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-primary-container rounded-full" style={{ width: "35%" }}></div>
</div>
</div>
{/*  Reading Dokkai  */}
<div className="relative group p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div className="flex items-start justify-between">
<span className="font-label-md text-label-md text-on-surface-variant">Đọc hiểu (Dokkai)</span>
<div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-outline">
<span className="material-symbols-outlined text-[18px]">article</span>
</div>
</div>
<div className="mt-space-md">
<div className="font-headline-lg text-headline-lg font-bold text-on-surface">1,450</div>
<div className="mt-1 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
<span>Ngắn/Trung/Dài</span>
<span className="text-secondary font-medium">16.2%</span>
</div>
</div>
<div className="mt-space-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-outline rounded-full" style={{ width: "16%" }}></div>
</div>
</div>
{/*  Listening Choukai  */}
<div className="relative group p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div className="flex items-start justify-between">
<span className="font-label-md text-label-md text-on-surface-variant">Nghe hiểu (Choukai)</span>
<div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-[18px]">headphones</span>
</div>
</div>
<div className="mt-space-md">
<div className="font-headline-lg text-headline-lg font-bold text-on-surface">1,540</div>
<div className="mt-1 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
<span className="flex items-center gap-1 text-tertiary"><span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>100% Studio Audio</span>
<span>17.3%</span>
</div>
</div>
<div className="mt-space-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-tertiary rounded-full" style={{ width: "17%" }}></div>
</div>
</div>
</div>
</section>
{/*  SECTION 2: Filter Toolbar & Facets  */}
<section className="space-y-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
{/*  Level Selector Tabs  */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
<div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
<span className="font-label-sm text-label-sm uppercase tracking-wider text-outline px-2 mr-1">Cấp độ:</span>
<button className="px-4 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm">Tất cả (8,950)</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary-container font-label-md text-label-md transition-all">N1 (1,240)</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary-container font-label-md text-label-md transition-all">N2 (1,890)</button>
<button className="px-3.5 py-1.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-label-md font-semibold shadow-sm">N3 (2,430)</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary-container font-label-md text-label-md transition-all">N4 (1,780)</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary-container font-label-md text-label-md transition-all">N5 (1,610)</button>
</div>
{/*  Quick Search  */}
<div className="relative w-full md:w-80">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input className="w-full bg-surface-container-low pl-9 pr-8 py-2 rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all" placeholder="Tìm theo Kanji, romaji, mã ID..." type="text" />
<button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary">
<span className="material-symbols-outlined text-[16px]">tune</span>
</button>
</div>
</div>
{/*  Multi-faceted Filter Bar  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm pt-space-xs">
{/*  Skill Category  */}
<div className="flex flex-col gap-1">
<label className="font-label-sm text-label-sm text-on-surface-variant">Phân môn / Kỹ năng</label>
<div className="relative">
<select className="w-full appearance-none bg-surface-container-low text-on-surface px-3 py-2 rounded-lg text-body-sm font-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm">
<option>Tất cả kỹ năng</option>
<option>Từ vựng & Kanji (Goi / Moji)</option>
<option>Ngữ pháp (Bunpou)</option>
<option>Đọc hiểu (Dokkai)</option>
<option>Nghe hiểu (Choukai)</option>
</select>
<span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
</div>
</div>
{/*  Difficulty  */}
<div className="flex flex-col gap-1">
<label className="font-label-sm text-label-sm text-on-surface-variant">Độ khó tiêu chuẩn</label>
<div className="relative">
<select className="w-full appearance-none bg-surface-container-low text-on-surface px-3 py-2 rounded-lg text-body-sm font-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm">
<option>Tất cả mức độ</option>
<option>Cơ bản (Khởi động)</option>
<option>Nâng cao (Phân loại)</option>
<option>Đề thi thật mô phỏng (Mock Exam)</option>
</select>
<span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
</div>
</div>
{/*  Approval Status  */}
<div className="flex flex-col gap-1">
<label className="font-label-sm text-label-sm text-on-surface-variant">Trạng thái thẩm định</label>
<div className="relative">
<select className="w-full appearance-none bg-surface-container-low text-on-surface px-3 py-2 rounded-lg text-body-sm font-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm">
<option>Tất cả trạng thái</option>
<option selected>Đã duyệt (Official Live)</option>
<option>Chờ thẩm định Hội đồng</option>
<option>Bản thảo (Draft)</option>
<option>Cần bổ sung Audio/Giải thích</option>
</select>
<span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
</div>
</div>
{/*  Exam Tag  */}
<div className="flex flex-col gap-1">
<label className="font-label-sm text-label-sm text-on-surface-variant">Đợt thi / Chuyên đề</label>
<div className="relative">
<select className="w-full appearance-none bg-surface-container-low text-on-surface px-3 py-2 rounded-lg text-body-sm font-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm">
<option>Tất cả nguồn đề</option>
<option>JLPT Đề thi 07/2024</option>
<option>JLPT Đề thi 12/2023</option>
<option>Bộ đề Sakura Dokkai N3</option>
<option>Thực chiến Choukai 1500</option>
</select>
<span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
</div>
</div>
</div>
</section>
{/*  SECTION 3: Detailed Question Cards Feed  */}
<section className="space-y-space-lg">
{/*  Active filters & Bulk Selection Bar  */}
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
<div className="flex items-center gap-space-sm">
<label className="inline-flex items-center gap-2 cursor-pointer">
<input className="w-4 h-4 rounded bg-surface-container-lowest text-primary accent-primary cursor-pointer" id="selectAllCheckbox" type="checkbox" />
<span className="font-label-md text-label-md text-on-surface font-semibold">Chọn tất cả trang này (Hiển thị 3 / 2,430 câu JLPT N3)</span>
</label>
<span className="text-outline-variant">|</span>
<div className="flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-label-sm font-label-sm">Cấp độ: N3</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-label-sm font-label-sm">Đã duyệt (Live)</span>
</div>
</div>
<div className="flex items-center gap-2">
<span className="font-label-sm text-label-sm text-on-surface-variant">Sắp xếp:</span>
<button className="font-label-md text-label-md text-primary font-medium inline-flex items-center gap-1 hover:underline">
<span>Mới cập nhật nhất</span>
<span className="material-symbols-outlined text-[16px]">arrow_downward</span>
</button>
</div>
</div>
{/*  QUESTION CARD 01: Grammar Question (わけにはいかない)  */}
<article className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all space-y-space-md">
{/*  Card Header  */}
<div className="flex items-start justify-between gap-space-md">
<div className="flex items-center gap-space-sm flex-wrap">
<input className="question-checkbox w-4 h-4 rounded bg-surface-container-lowest text-primary accent-primary cursor-pointer" type="checkbox" />
<span className="font-label-md text-label-md font-mono text-outline font-semibold">QID-N3-BUNPOU-0842</span>
<span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">JLPT N3</span>
<span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">Ngữ pháp / Cấu trúc câu</span>
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
            Đã duyệt
          </span>
<span className="font-label-sm text-label-sm text-outline">Độ khó: Đề thi thật</span>
</div>
<div className="flex items-center gap-1">
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Sao chép câu hỏi">
<span className="material-symbols-outlined text-[18px]">content_copy</span>
</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Chỉnh sửa câu hỏi">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors" title="Tùy chọn khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</div>
{/*  Question Stem / Prompt  */}
<div className="space-y-space-xs pl-6">
<div className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Câu hỏi số 23 trong Đề mô phỏng Kanto #04:</div>
<p className="font-headline-sm text-headline-sm text-on-surface leading-snug">
          明日は大切な会議があるから、風邪を引いていても休む（　　　　）。
        </p>
<p className="font-body-sm text-body-sm text-on-surface-variant italic">
          (Ashita wa taisetsu na kaigi ga aru kara, kaze o hiite itemo yasumu (.........).)
        </p>
</div>
{/*  4 Options Grid  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm pl-6">
{/*  Option A  */}
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-low flex items-center justify-between text-on-surface">
<div className="flex items-center gap-3">
<span className="w-6 h-6 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center font-bold shadow-xs">A</span>
<span className="font-body-md text-body-md">わけにはいかない</span>
</div>
<span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check</span>
            Đáp án đúng
          </span>
</div>
{/*  Option B  */}
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-3">
<span className="w-6 h-6 rounded-full bg-surface-container-low text-outline font-label-md text-label-md flex items-center justify-center font-bold">B</span>
<span className="font-body-md text-body-md">はずがない</span>
</div>
<span className="font-label-sm text-label-sm text-outline">Lựa chọn nhiễu 1</span>
</div>
{/*  Option C  */}
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-3">
<span className="w-6 h-6 rounded-full bg-surface-container-low text-outline font-label-md text-label-md flex items-center justify-center font-bold">C</span>
<span className="font-body-md text-body-md">に違いない</span>
</div>
<span className="font-label-sm text-label-sm text-outline">Lựa chọn nhiễu 2</span>
</div>
{/*  Option D  */}
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-3">
<span className="w-6 h-6 rounded-full bg-surface-container-low text-outline font-label-md text-label-md flex items-center justify-center font-bold">D</span>
<span className="font-body-md text-body-md">ことになっている</span>
</div>
<span className="font-label-sm text-label-sm text-outline">Lựa chọn nhiễu 3</span>
</div>
</div>
{/*  Pedagogical Explanation Accordion / Card  */}
<div className="ml-6 p-space-md rounded-xl bg-surface-container-low space-y-space-xs">
<div className="flex items-center gap-2 text-primary font-label-md text-label-md font-bold">
<span className="material-symbols-outlined text-[18px]">psychology_alt</span>
<span>Giải thích chi tiết & Điểm ngữ pháp cốt lõi:</span>
</div>
<p className="font-body-md text-body-md text-on-surface leading-relaxed">
<strong className="font-semibold text-primary">Cấu trúc 〜わけにはいかない:</strong> Biểu thị ý nghĩa "Vì lý do đạo đức, chuẩn mực công việc xã hội, tâm lý nên không thể làm điều gì đó". Trong bối cảnh văn phòng Nhật Bản, ngày mai có cuộc họp trọng thể quan trọng nên dù đang bị cảm cúm cũng không thể tự ý nghỉ việc.
        </p>
<div className="flex flex-wrap items-center gap-space-md pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
<span>Giảng viên thẩm định: <strong className="text-on-surface">Sensei Yamada Kenji</strong></span>
<span>•</span>
<span>Tỷ lệ làm đúng của học viên: <strong className="text-tertiary">74.2% (1,420 lượt thi)</strong></span>
</div>
</div>
</article>
{/*  QUESTION CARD 02: Kanji Question (咲)  */}
<article className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all space-y-space-md">
{/*  Card Header  */}
<div className="flex items-start justify-between gap-space-md">
<div className="flex items-center gap-space-sm flex-wrap">
<input className="question-checkbox w-4 h-4 rounded bg-surface-container-lowest text-primary accent-primary cursor-pointer" type="checkbox" />
<span className="font-label-md text-label-md font-mono text-outline font-semibold">QID-N3-KANJI-0195</span>
<span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">JLPT N3</span>
<span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">Hán tự (Moji-Goi) / Cách đọc</span>
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
            Đã duyệt
          </span>
<span className="font-label-sm text-label-sm text-outline">Chủ đề: Lễ hội Hanami</span>
</div>
<div className="flex items-center gap-1">
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Sao chép câu hỏi">
<span className="material-symbols-outlined text-[18px]">content_copy</span>
</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Chỉnh sửa câu hỏi">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors" title="Tùy chọn khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</div>
{/*  Question Stem  */}
<div className="space-y-space-xs pl-6">
<div className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Chọn cách đọc Hiragana chính xác cho chữ Hán gạch chân:</div>
<p className="font-headline-sm text-headline-sm text-on-surface leading-snug">
          春になると、公園の桜が美しく<span className="inline-block px-1.5 py-0.5 rounded bg-secondary-container text-primary font-bold">咲</span>きます。
        </p>
</div>
{/*  Options Horizontal Layout  */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pl-6">
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-low flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm flex items-center justify-center font-bold">1</span>
<span className="font-body-md text-body-md font-medium text-on-surface">さ</span>
</div>
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
</div>
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-surface-container-low text-outline font-label-sm text-label-sm flex items-center justify-center font-bold">2</span>
<span className="font-body-md text-body-md text-on-surface">な</span>
</div>
</div>
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-surface-container-low text-outline font-label-sm text-label-sm flex items-center justify-center font-bold">3</span>
<span className="font-body-md text-body-md text-on-surface">わら</span>
</div>
</div>
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-surface-container-low text-outline font-label-sm text-label-sm flex items-center justify-center font-bold">4</span>
<span className="font-body-md text-body-md text-on-surface">あ</span>
</div>
</div>
</div>
{/*  Kanji Card Insight  */}
<div className="ml-6 p-space-md rounded-xl bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
<div className="flex items-center gap-space-md">
<div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-headline-md font-headline-md text-primary font-bold shadow-sm">
            咲
          </div>
<div>
<div className="font-title-md text-title-md font-bold text-on-surface">Chữ Tiếu (咲) - Nghĩa: Nở hoa, tiếu ngạo</div>
<div className="font-body-sm text-body-sm text-on-surface-variant">Kun-yomi: <span className="text-primary font-semibold">さ(く)</span> | On-yomi: ショウ (Shou) • Bộ thủ: Khẩu (口)</div>
</div>
</div>
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-2xs">
<span className="material-symbols-outlined text-[16px] text-tertiary">school</span>
<span>Thuộc 102 Hán tự thường gặp đề thi N3</span>
</div>
</div>
</article>
{/*  QUESTION CARD 03: Choukai Listening with Audio Player & Tokyo Station Context  */}
<article className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all space-y-space-md">
{/*  Card Header  */}
<div className="flex items-start justify-between gap-space-md">
<div className="flex items-center gap-space-sm flex-wrap">
<input className="question-checkbox w-4 h-4 rounded bg-surface-container-lowest text-primary accent-primary cursor-pointer" type="checkbox" />
<span className="font-label-md text-label-md font-mono text-outline font-semibold">QID-N3-CHOUKAI-0419</span>
<span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">JLPT N3</span>
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">headphones</span>
            Nghe hiểu: Mondai 1 (Task-based)
          </span>
<span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
            Audio 320kbps Đính kèm
          </span>
<span className="font-label-sm text-label-sm text-outline">Bối cảnh: Ga xe điện Tokyo</span>
</div>
<div className="flex items-center gap-1">
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Tải audio về máy">
<span className="material-symbols-outlined text-[18px]">download</span>
</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Chỉnh sửa câu hỏi">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors" title="Tùy chọn khác">
<span className="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</div>
{/*  Rich Visual & Audio Player Interface  */}
<div className="ml-6 space-y-space-md">
{/*  Station Visual Preview & Context Banner  */}
<div className="relative h-44 rounded-xl overflow-hidden bg-surface-container">
<img className="w-full h-full object-cover" data-alt="Cinematic wide view of modern Tokyo train station platform with cherry blossoms visible through glass windows, soft pastel light, Japanese minimalism aesthetics, sakura blush tones, high resolution, clean architectural photography." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM0svqDHDYHXWSC0P5adxgStRsfyQLxMkXZz4skUno-rr1OMfne4cgXbFCQpv0laO9Ux6SySnJbLqiI-EAfZiyvt7CPq9UGYT2OI9GcD2WPs35F-btISGMIup9kmW5Crs3AjTQyvokv7LUx8hSgGkVrqU7ZDZ0Himl3D98qNXd8HhOmBUoDHob7-hrepVdmJb3GiDJyJPNPaW1AybYvV3purDv9ReQJVHl2gb_G8MKdhKwn_XxGrKa" />
<div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/40 to-transparent p-space-md flex flex-col justify-end">
<div className="flex items-center justify-between text-on-secondary">
<div>
<span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-container font-semibold">Ngữ cảnh đề thi</span>
<h3 className="font-title-md text-title-md font-bold text-surface-bright">Hỏi đường chuyển tàu tại Ga Tokyo (東京駅での乗り換え案内)</h3>
</div>
<span className="px-2.5 py-1 rounded bg-inverse-surface/70 backdrop-blur-md text-surface-bright font-label-sm text-label-sm">Thời lượng: 01:42</span>
</div>
</div>
</div>
{/*  Custom Audio Player Bar  */}
<div className="p-space-sm px-space-md rounded-xl bg-surface-container-low flex items-center gap-space-md shadow-xs">
<button className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all" id="audioPlayBtn">
<span className="material-symbols-outlined text-[24px]">play_arrow</span>
</button>
<div className="flex-1 flex flex-col gap-1">
<div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
<span>00:38</span>
<span className="text-primary font-semibold">Studio Quality FLAC • Tokyo Accent Studio</span>
<span>01:42</span>
</div>
{/*  Interactive waveform / scrubber  */}
<div className="h-2 w-full bg-surface-container rounded-full overflow-hidden relative cursor-pointer">
<div className="h-full bg-primary rounded-full" style={{ width: "37%" }}></div>
</div>
</div>
<div className="flex items-center gap-2 text-on-surface-variant">
<button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">volume_up</span></button>
<button className="px-2 py-0.5 rounded bg-surface-container text-label-sm font-label-sm font-mono">1.0x</button>
</div>
</div>
{/*  Question Prompt & Options  */}
<div className="space-y-space-xs pt-space-xs">
<p className="font-headline-sm text-headline-sm text-on-surface leading-snug">
            男の人と駅員が話しています。男の人はこのあと、何番線のホームへ行きますか。
          </p>
<p className="font-body-sm text-body-sm text-on-surface-variant">
            (Người đàn ông đang nói chuyện với nhân viên nhà ga. Sau đây người đàn ông sẽ đi tới sân ga số mấy?)
          </p>
</div>
{/*  Choukai 4 Options  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest shadow-2xs text-on-surface flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-6 h-6 rounded-full bg-surface-container-low text-outline font-label-md text-label-md flex items-center justify-center font-bold">1</span>
<span className="font-body-md text-body-md font-medium">1番線 (Ga số 1)</span>
</div>
</div>
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-low text-on-surface flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-6 h-6 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md flex items-center justify-center font-bold shadow-xs">2</span>
<span className="font-body-md text-body-md font-bold text-primary">3番線 (Ga số 3)</span>
</div>
<span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check</span> Đúng
            </span>
</div>
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest shadow-2xs text-on-surface flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-6 h-6 rounded-full bg-surface-container-low text-outline font-label-md text-label-md flex items-center justify-center font-bold">3</span>
<span className="font-body-md text-body-md font-medium">5番線 (Ga số 5)</span>
</div>
</div>
<div className="p-space-sm px-space-md rounded-lg bg-surface-container-lowest shadow-2xs text-on-surface flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-6 h-6 rounded-full bg-surface-container-low text-outline font-label-md text-label-md flex items-center justify-center font-bold">4</span>
<span className="font-body-md text-body-md font-medium">8番線 (Ga số 8)</span>
</div>
</div>
</div>
{/*  Collapsible Transcript & Key Clue  */}
<details className="group p-space-md rounded-xl bg-surface-container-low cursor-pointer">
<summary className="flex items-center justify-between font-label-md text-label-md font-semibold text-primary list-none">
<span className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">subtitles</span>
<span>Xem Lời thoại Audio (Transcript) & Từ khóa mấu chốt</span>
</span>
<span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
</summary>
<div className="mt-space-md space-y-space-sm pt-space-xs border-t-0 font-body-sm text-body-sm text-on-surface">
<p><strong className="text-secondary font-semibold">男：</strong>すみません、新宿へ行きたいんですが、何番線に乗ればいいですか。</p>
<p><strong className="text-outline font-semibold">駅員：</strong>新宿ですね。中央線快速なら<span className="bg-secondary-container px-1 py-0.5 rounded font-bold text-primary">3番線</span>から出ます。ただ、各駅停車は1番線ですが、3番線のほうが早く着きますよ。</p>
<p><strong className="text-secondary font-semibold">男：</strong>急いでいるので、早いほうで行きます。ありがとうございます。</p>
<div className="p-space-xs px-space-sm rounded bg-surface-container-lowest font-label-sm text-label-sm text-tertiary">
              ★ <strong>Điểm mấu chốt:</strong> Người đàn ông nói "急いでいるので" (Vì đang vội) nên chọn tàu đi nhanh hơn ở sân ga số 3 (3番線).
            </div>
</div>
</details>
</div>
</article>
</section>
{/*  SECTION 4: Bulk Operations Sticky Action Floatbar  */}
<aside className="sticky bottom-4 z-30 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#EADFD9] shadow-[0_8px_30px_rgba(45,40,42,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex items-center gap-3.5"><div className="w-10 h-10 rounded-xl bg-[#F8BBD0]/60 border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A]"><span className="material-symbols-outlined text-[22px]">checklist</span></div><div><div className="text-[15px] font-bold text-[#2D282A]">Đang chọn: <span className="text-[#E05A7A] font-extrabold" id="selectedCount">3</span> câu hỏi</div><div className="text-[11px] text-[#6E686A]">Sẵn sàng thực hiện thao tác đồng bộ hoá trên toàn hệ thống</div></div></div><div className="flex flex-wrap items-center gap-2.5"><button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] hover:border-[#F8BBD0] text-[#2D282A] font-semibold text-[12px] transition-all shadow-xs"><span className="material-symbols-outlined text-[17px] text-[#6E686A]">label</span><span>Gán nhãn đề thi</span></button><button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8BBD0]/50 border border-[#F8BBD0] text-[#805062] font-semibold text-[12px] hover:bg-[#F8BBD0] transition-all shadow-xs"><span className="material-symbols-outlined text-[17px] text-[#E05A7A]">quiz</span><span>Xuất bản lên Phòng thi thử</span></button><button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] text-[#E05A7A] hover:bg-[#F8BBD0]/30 font-semibold text-[12px] transition-all shadow-xs"><span className="material-symbols-outlined text-[17px]">picture_as_pdf</span><span>Tải đề PDF (Kèm Audio)</span></button><button className="w-9 h-9 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all shadow-xs" title="Xóa các mục đã chọn"><span className="material-symbols-outlined text-[18px]">delete</span></button></div></aside>
</div>
{/*  Inline Interaction Logic  */}
</main></div>
    </div>
  
</CmsShell>
);
}
