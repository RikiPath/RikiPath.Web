import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

export default function ExamN3() {
  const { pathname } = useLocation();


  return (
    <LearnerShell pathname={pathname} breadcrumb="Thi N3">
<div className="bg-background font-body-md text-on-surface antialiased" data-page="ExamN3" data-shell-unified="1">

<main className="w-full pt-0 bg-background">
<p role="status">Mục này chưa có dữ liệu.</p>
<div className="flex flex-col w-full">
{/*  Exam Meta & Flow Controller  */}
<div className="w-full bg-surface-container-low/70 backdrop-blur-md shadow-sm">
<div className="max-w-[1440px] mx-auto px-margin-desktop py-space-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
{/*  Exam Identifiers & Badges  */}
<div className="flex items-center flex-wrap gap-space-sm">
<div className="flex items-center gap-1.5 px-space-sm py-space-xxs rounded-full bg-secondary-container/60 text-on-secondary-container">
<span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Kỳ thi mô phỏng chuẩn JEES</span>
</div>
<div className="flex items-center gap-space-xs text-on-surface">
<span className="font-title-sm text-title-sm">—</span>
<span className="font-label-md text-label-md px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono">—</span>
</div>
</div>
{/*  Live Digital Pulse Timer  */}
<div className="flex items-center gap-space-md">
<div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-xl bg-surface-container-lowest shadow-[0_2px_12px_-2px_rgba(166,46,79,0.12)]">
<div className="relative flex items-center justify-center w-3 h-3">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant leading-none">Thời gian Đọc hiểu</span>
<span className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight font-mono leading-tight" id="exam-timer">—</span>
</div>
<div className="pl-space-xs text-outline-variant">
<span className="material-symbols-outlined text-[20px] text-primary">timer</span>
</div>
</div>
<Link to="/exam-result" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary">
Nộp bài & xem kết quả
</Link>
<button aria-label="Tạm dừng hoặc trợ giúp" className="p-space-xs rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Trợ giúp làm bài">
<span className="material-symbols-outlined text-[22px]">help_outline</span>
</button>
</div>
</div>
{/*  Stepper Pipeline: 3 Sections  */}
<div className="max-w-[1440px] mx-auto px-margin-desktop pb-space-sm pt-space-xxs">
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
{/*  Step 1: Completed  */}
<div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-lowest shadow-sm">
<div className="flex items-center gap-space-sm min-w-0">
<div className="w-7 h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-label-md text-label-md text-on-surface truncate">—</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">—</span>
</div>
</div>
<div className="text-right shrink-0 pl-space-xs">
<span className="font-label-sm text-label-sm text-tertiary font-bold bg-surface-container px-space-xs py-0.5 rounded-full">—</span>
</div>
</div>
{/*  Step 2: Active (Dokkai)  */}
<div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-lowest ring-2 ring-primary/40 shadow-md">
<div className="flex items-center gap-space-sm min-w-0">
<div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_2px_8px_rgba(166,46,79,0.3)]">{'—'}</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-label-md text-label-md text-primary font-bold truncate">—</span>
<span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">Đang làm</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">—</span>
</div>
</div>
<div className="text-right shrink-0">
<span className="font-label-md text-label-md text-primary font-bold">—</span>
</div>
</div>
{/*  Step 3: Locked (Choukai)  */}
<div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container opacity-65">
<div className="flex items-center gap-space-sm min-w-0">
<div className="w-7 h-7 rounded-full bg-surface-container-highest text-outline flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[16px]">lock</span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-label-md text-label-md text-on-surface-variant truncate">—</span>
<span className="font-label-sm text-label-sm text-outline">—</span>
</div>
</div>
<span className="font-label-sm text-label-sm text-outline">Khóa</span>
</div>
</div>
</div>
</div>
{/*  Main Split Examination Workspace (12-Column Desktop Architecture)  */}
<div className="w-full max-w-[1440px] mx-auto px-margin-desktop py-space-md">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
{/*  ================= LEFT COLUMN: DOKKAI VIEWER (7 COLUMNS) =================  */}
<section className="lg:col-span-7 flex flex-col gap-space-md">
{/*  Document Toolbar  */}
<div className="flex items-center justify-between px-space-md py-space-xs rounded-xl bg-surface-container-lowest shadow-sm">
<div className="flex items-center gap-space-sm">
<span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-[18px] text-primary">auto_stories</span>
<span className="">—</span>
</span>
<span className="text-outline-variant">|</span>
<span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded">Chủ đề: Văn hóa thẩm mỹ</span>
</div>
{/*  Utility tools  */}
<div className="flex items-center gap-space-xs">
<button aria-label="Giảm kích thước chữ" className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" id="font-decrease" title="Giảm cỡ chữ">
<span className="material-symbols-outlined text-[18px]">text_decrease</span>
</button>
<button aria-label="Tăng kích thước chữ" className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" id="font-increase" title="Tăng cỡ chữ">
<span className="material-symbols-outlined text-[18px]">text_increase</span>
</button>
<span className="text-outline-variant">|</span>
<button aria-label="Bút dạ hoa đào" className="px-space-xs py-1 rounded-lg bg-secondary-fixed/60 hover:bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm flex items-center gap-1 transition-colors" id="highlighter-btn">
<span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>format_ink_highlighter</span>
<span className="">Bút dạ đào</span>
</button>
<button aria-label="Âm thanh tự nhiên" className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant" title="Âm thanh tĩnh tâm">
<span className="material-symbols-outlined text-[18px]">headphones</span>
</button>
</div>
</div>
{/*  The Japanese Reading Passage Body  */}
<article className="p-space-xl rounded-2xl bg-surface-container-lowest shadow-md flex flex-col gap-space-md">
{/*  Article Title Block  */}
<div className="pb-space-sm">
<span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">—</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface mt-1 font-bold leading-relaxed">{"【"}<ruby>—<rt>—</rt></ruby>け<ruby>—<rt>—</rt></ruby>に<ruby>—<rt>—</rt></ruby>る<ruby>—<rt>—</rt></ruby>の「<ruby>—<rt>—</rt></ruby>」の<ruby>—<rt>—</rt></ruby>と<ruby>—<rt>—</rt></ruby>の<ruby>—<rt>—</rt></ruby>{'—'}</h2>
<div className="w-12 h-0.5 bg-primary/40 mt-space-xs rounded-full"></div>
</div>
{/*  Japanese Passage Content with High Typographic Care  */}
<div className="font-body-lg text-body-lg text-on-surface leading-[2.1] space-y-space-md selection:bg-secondary-container" id="passage-text">
<p className="">—</p>
<p className="">—</p>
<div className="my-space-sm p-space-md rounded-xl bg-surface-container-low flex items-start gap-space-md">
<div className="w-24 h-24 rounded-lg bg-surface-container-high shrink-0 overflow-hidden shadow-sm">
<img className="w-full h-full object-cover" data-alt="Close up of a minimalistic Japanese Ikebana arrangement with early spring cherry blossom branch in a textured ceramic vase, soft studio natural lighting, Japanese wabi-sabi aesthetic with muted tones of pale pink and stone grey"   src="/empty-avatar.svg" />
</div>
<div className="flex flex-col min-w-0">
<span className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">local_florist</span>{'—'}</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">—</p>
</div>
</div>
<p className="bg-primary/5 p-space-sm rounded-xl">—</p>
</div>
{/*  Bottom Article Metas & Navigation within Passages  */}
<div className="pt-space-sm flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
<span className="">—</span>
<div className="flex items-center gap-space-xs">
<button className="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high transition-colors">{"← Đoạn trước (Đoạn 2)\n              "}</button>
<button className="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high transition-colors text-primary font-bold">{"Đoạn tiếp theo (Đoạn 4) →\n              "}</button>
</div>
</div>
</article>
</section>
{/*  ================= RIGHT COLUMN: QUESTION & ANSWER SHEET (5 COLUMNS) =================  */}

</div>
</div>
{/*  Interactive JavaScript for Test Room Ergonomics  */}

</div></main>
<footer className="w-full bg-surface-container-low shadow-[0_-1px_16px_rgba(217,75,104,0.04)] mt-space-3xl"><div className="w-full px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-3xl"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter-desktop mb-space-2xl"><div className="lg:col-span-2 space-y-space-md"><div className="flex items-center gap-space-xs"><div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">filter_vintage</span></div><span className="font-headline-sm text-headline-sm font-bold text-primary">RikiPath Learning</span></div><p className="font-body-md text-body-md text-on-surface-variant max-w-md">—</p><div className="flex items-center gap-space-sm pt-space-xs"><span className="px-space-md py-space-xxs rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-primary">location_on</span>Tokyo • Shinjuku Campus</span><span className="px-space-md py-space-xxs rounded-full bg-secondary-fixed font-label-sm text-label-sm text-on-secondary-fixed">—</span></div></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Chương trình đào tạo</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">Luyện thi JLPT Siêu tốc</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Tài nguyên học tập</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thử JLPT có chấm điểm</li><li className="font-body-sm text-body-sm text-on-surface-variant">{"Góc văn hóa & Đời sống Tokyo"}</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Hỗ trợ học viên</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">—</li><li className="font-body-sm text-body-sm text-on-surface-variant">Cộng đồng học viên RikiPath</li><li className="font-body-sm text-body-sm text-on-surface-variant">Chính sách bảo hành đỗ JLPT</li><li className="font-body-sm text-body-sm text-on-surface-variant">{"Trợ giúp kỹ thuật & Tài khoản"}</li></ul></div></div><div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="material-symbols-outlined text-[16px] text-primary">local_florist</span><span className="">—</span></div><div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant"><span className="hover:text-on-surface cursor-pointer">Điều khoản học tập</span><span className="hover:text-on-surface cursor-pointer">Bảo mật thông tin</span><span className="hover:text-on-surface cursor-pointer">Tiêu chuẩn JLPT</span></div></div></div></footer>


    </div>

</LearnerShell>
);
}
