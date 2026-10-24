import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function MultiColumnDashboard() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Cổng học tập">
<div className="bg-surface text-on-surface font-body-md text-body-md min-h-screen" data-page="MultiColumnDashboard" data-shell-unified="1">

<div className="pl-0"><main className="w-full pt-0 bg-surface">
<p role="status">Mục này chưa có dữ liệu.</p>
<div className="max-w-[1440px] mx-auto px-space-32 py-space-24"><div className="flex flex-col w-full">
{/*  Subtle Ambient Glow Element  */}
<div className="relative w-full">
<div className="absolute -top-12 -left-8 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
<div className="absolute top-48 right-10 w-80 h-80 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none -z-10"></div>
</div>
{/*  Workspace Subheader / Context Bar  */}
<div className="flex items-center justify-between pb-space-20">
<div className="flex items-center gap-space-12">
<div className="flex items-center gap-space-8 px-space-12 py-space-4 bg-surface-container rounded-full text-on-surface-variant font-label-xs tracking-wider uppercase">
<span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
<span>—</span>
</div>
<span className="text-outline-variant font-label-xs">|</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
<div className="flex items-center gap-space-12">
<div className="flex items-center gap-space-8 bg-surface-container-lowest px-space-16 py-space-8 rounded-full shadow-sm text-on-surface font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
<span>Chuỗi học tập: <strong className="text-primary font-bold">—</strong></span>
</div>
<button className="h-10 px-space-16 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all flex items-center gap-space-8 shadow-sm" type="button">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
<span>Thời khoá biểu</span>
</button>
</div>
</div>
{/*  12-Column Dashboard Grid: 8 Columns Primary + 4 Columns Utility  */}
<div className="grid grid-cols-12 gap-gutter items-start">
{/*  LEFT / CENTER COLUMN (Span 8)  */}
<div className="col-span-8 flex flex-col gap-space-24">
{/*  Hero Motivation Banner  */}
<div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm p-space-32 flex items-center justify-between">
<div className="flex flex-col gap-space-12 max-w-xl z-10">
<div className="flex items-center gap-space-8">
<span className="px-space-8 py-space-2 bg-secondary-container text-primary font-label-xs text-label-xs rounded-full uppercase tracking-wider font-bold">—</span>
<span className="text-on-surface-variant font-body-sm text-body-sm">—</span>
</div>
<h1 className="font-display-sm text-display-sm text-on-surface tracking-tight leading-tight">
            —
          </h1>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">—</p>
<div className="flex items-center gap-space-16 pt-space-8">
<button className="h-10 px-space-20 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-space-8 hover:bg-primary-container shadow-md transition-all" type="button">
<span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
<span>—</span>
</button>
<button className="h-10 px-space-16 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-space-4" type="button">
<span>Đổi kế hoạch ngày</span>
<span className="material-symbols-outlined text-[16px]">tune</span>
</button>
</div>
</div>
{/*  Decorative Floral/Mascot Vector Illustration Frame  */}
<div className="relative w-64 h-56 flex-shrink-0 hidden lg:flex items-center justify-center">
<div className="w-48 h-48 rounded-full bg-secondary-container/40 absolute -right-4 -bottom-4"></div>
<div className="w-36 h-36 rounded-full bg-primary-fixed/50 absolute top-0 right-12"></div>
<div className="relative z-10 w-44 h-44 rounded-2xl overflow-hidden shadow-md">
<img className="w-full h-full object-cover" data-alt="A cozy, sunlit neo-Japanese desktop study desk with open cherry blossom spiral notebooks, Japanese calligraphy fountain pens, and a hot steaming matcha cup, cinematic soft focus, pink and neutral warm tones, modern minimalist editorial photography."   src="/empty-avatar.svg" />
</div>
<div className="absolute bottom-2 left-2 z-20 bg-surface-container-lowest/95 backdrop-blur-md px-space-12 py-space-8 rounded-xl shadow-md flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">emoji_events</span>
<div className="flex flex-col">
<span className="font-label-xs text-label-xs text-on-surface-variant leading-none">Cấp độ hồ sơ</span>
<span className="font-label-md text-label-md text-on-surface font-bold">—</span>
</div>
</div>
</div>
</div>
{/*  Key Learning Metrics (4 Columns under Main Span 8)  */}
<div className="grid grid-cols-4 gap-space-16">
{/*  Metric 1  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-20 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
<div className="flex items-center justify-between pb-space-12">
<span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">—</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-secondary-container transition-colors">
<span className="material-symbols-outlined text-primary text-[18px]">style</span>
</div>
</div>
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-display-sm text-display-sm text-on-surface leading-none">—</span>
<span className="font-label-xs text-label-xs text-primary font-bold">—</span>
</div>
<div className="w-full bg-surface-container h-1.5 rounded-full mt-space-12 overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant pt-space-4">—</span>
</div>
</div>
{/*  Metric 2  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-20 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
<div className="flex items-center justify-between pb-space-12">
<span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Kanji ghi nhớ</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-secondary-container transition-colors">
<span className="material-symbols-outlined text-primary text-[18px]">translate</span>
</div>
</div>
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-display-sm text-display-sm text-on-surface leading-none">—</span>
<span className="font-label-xs text-label-xs text-tertiary font-bold">—</span>
</div>
<div className="w-full bg-surface-container h-1.5 rounded-full mt-space-12 overflow-hidden">
<div className="bg-tertiary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant pt-space-4">—</span>
</div>
</div>
{/*  Metric 3  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-20 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
<div className="flex items-center justify-between pb-space-12">
<span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Điểm ngữ pháp</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-secondary-container transition-colors">
<span className="material-symbols-outlined text-primary text-[18px]">menu_book</span>
</div>
</div>
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-display-sm text-display-sm text-on-surface leading-none">—</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
</div>
<div className="w-full bg-surface-container h-1.5 rounded-full mt-space-12 overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant pt-space-4">—</span>
</div>
</div>
{/*  Metric 4  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-20 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
<div className="flex items-center justify-between pb-space-12">
<span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Điểm thi thử avg</span>
<div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-secondary-container transition-colors">
<span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
</div>
</div>
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-display-sm text-display-sm text-on-surface leading-none">—</span>
<span className="font-label-xs text-label-xs text-tertiary font-bold">—</span>
</div>
<div className="w-full bg-surface-container h-1.5 rounded-full mt-space-12 overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant pt-space-4">—</span>
</div>
</div>
</div>
{/*  Active Learning Track / Video Lesson Player Preview  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-24 shadow-sm flex flex-col gap-space-20">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-12">
<div className="w-3 h-3 rounded-full bg-primary"></div>
<div>
<h2 className="font-headline-sm text-headline-sm text-on-surface">{'—'}</h2>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
</div>
<span className="px-space-12 py-space-4 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs font-bold">—</span>
</div>
<div className="grid grid-cols-12 gap-space-20 items-center">
{/*  Lesson Thumbnail / Media Preview  */}
<div className="col-span-5 relative rounded-xl overflow-hidden aspect-video bg-surface-container-high group cursor-pointer shadow-sm">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="A modern, high resolution clean studio recording frame of a friendly Japanese female instructor writing Hiragana grammar notes on an interactive glass board in Tokyo, warm soft lighting, educational video interface overlay."   src="/empty-avatar.svg" />
<div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 via-transparent to-transparent flex items-center justify-center">
<div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
</div>
</div>
<span className="absolute bottom-2 right-2 bg-on-surface/80 text-on-primary font-label-xs text-label-xs px-space-8 py-space-2 rounded-md font-mono">—</span>
</div>
{/*  Unit Info & Progress Details  */}
<div className="col-span-7 flex flex-col justify-between h-full py-space-4">
<div className="flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-xs">
<span>Tiến độ bài học</span>
<span className="font-bold text-on-surface">—</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant pt-space-4 leading-relaxed">—</p>
</div>
<div className="flex items-center justify-between pt-space-12">
<div className="flex items-center gap-space-12">
<div className="w-7 h-7 rounded-full overflow-hidden bg-surface-container">
<img className="w-full h-full object-cover"    src="/empty-avatar.svg" />
</div>
<span className="font-label-md text-label-md text-on-surface">—</span>
</div>
<button className="h-9 px-space-16 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container flex items-center gap-space-4 transition-all" type="button">
<span>Tiếp tục xem</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</button>
</div>
</div>
</div>
</div>
{/*  Recent Practice Quizzes & AI Feedback Insights  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-24 shadow-sm flex flex-col gap-space-20">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-12">
<div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center">
<span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Kết quả luyện đề & Nhận định AI gần nhất</h2>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
</div>
</div>
<button className="text-primary font-label-md text-label-md hover:underline flex items-center gap-space-4" type="button">
<span>Xem lịch sử test</span>
<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</button>
</div>
{/*  AI Diagnostic Split Insight Card  */}
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-16">
<div className="flex items-start gap-space-12">
<span className="material-symbols-outlined text-primary text-[24px] mt-0.5">lightbulb</span>
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-bold">Chẩn đoán thông minh từ Riki AI</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2 max-w-xl">—</p>
</div>
</div>
<button className="h-9 px-space-16 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm hover:bg-surface-container transition-colors whitespace-nowrap" type="button">
            Ôn 10 câu trợ từ
          </button>
</div>
{/*  Recent Quizzes Micro Table  */}
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead>
<tr className="text-on-surface-variant font-label-xs uppercase tracking-wider">
<th className="pb-space-12 font-medium">Đề luyện tập</th>
<th className="pb-space-12 font-medium">Chủ đề</th>
<th className="pb-space-12 font-medium">Thời gian</th>
<th className="pb-space-12 font-medium text-center">Độ chính xác</th>
<th className="pb-space-12 font-medium text-right">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y-0 text-body-sm"><tr><td colSpan={20} className="p-6 text-center">—</td></tr></tbody>
</table>
</div>
</div>
</div>
{/*  RIGHT SIDEBAR COLUMN (Span 4)  */}
<div className="col-span-4 flex flex-col gap-space-24">
{/*  Daily SRS Spaced Repetition Card  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-24 shadow-sm flex flex-col gap-space-16 relative overflow-hidden">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">SRS Lặp lại ngắt quãng</h2>
</div>
<span className="px-space-8 py-space-2 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs font-bold">—</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">—</p>
{/*  Dynamic Visual SRS Stack  */}
<div className="p-space-16 rounded-xl bg-surface-container-low flex items-center justify-between">
<div className="flex flex-col">
<span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Từ trọng điểm tiếp theo</span>
<span className="font-display-sm text-display-sm text-primary font-bold mt-space-4">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant font-medium">—</span>
</div>
<div className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary font-bold font-headline-sm">
            —
          </div>
</div>
<button className="w-full h-11 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-8 hover:bg-primary-container shadow-md transition-all" type="button">
<span className="material-symbols-outlined text-[20px]">layers</span>
<span>—</span>
</button>
</div>
{/*  AI Advisor Recommendations (Weakness Diagnosis in Dokkai)  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-24 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Đề xuất cố vấn AI</h2>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant font-bold">—</span>
</div>
<div className="flex flex-col gap-space-12">
{/*  Weakness point item  */}
<div className="p-space-12 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-space-4">
<span className="material-symbols-outlined text-primary text-[16px]">priority_high</span>
                Điểm yếu: Đọc hiểu văn bản dài
              </span>
<span className="font-label-xs text-label-xs text-error font-bold">Tốc độ đọc chậm</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
<a className="font-label-xs text-label-xs text-primary font-bold hover:underline flex items-center gap-space-2 mt-space-2" href="#">
<span>—</span>
<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</a>
</div>
{/*  Suggested next step  */}
<div className="p-space-12 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-space-4">
<span className="material-symbols-outlined text-tertiary text-[16px]">trending_up</span>
                —
              </span>
<span className="font-label-xs text-label-xs text-tertiary font-bold">—</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">—</p>
</div>
</div>
</div>
{/*  Upcoming 1-on-1 Consultation Session Widget  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-24 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">video_chat</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Buổi kèm 1-1 sắp tới</h2>
</div>
<span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
</div>
<div className="flex items-center gap-space-16 p-space-12 rounded-xl bg-surface-container-low">
<div className="w-14 h-14 rounded-xl overflow-hidden bg-surface flex-shrink-0">
<img className="w-full h-full object-cover"    src="/empty-avatar.svg" />
</div>
<div className="flex flex-col">
<span className="font-headline-sm text-headline-sm text-on-surface leading-snug">—</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">—</span>
<div className="flex items-center gap-space-6 mt-space-4 text-primary font-label-md text-label-md">
<span className="material-symbols-outlined text-[16px]">schedule</span>
<span>—</span>
</div>
</div>
</div>
<div className="flex items-center gap-space-8">
<button className="flex-1 h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-4 hover:bg-primary-container shadow-sm transition-all" type="button">
<span className="material-symbols-outlined text-[18px]">videocam</span>
<span>Vào phòng họp Zoom</span>
</button>
<button aria-label="Đổi lịch" className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">event_repeat</span>
</button>
</div>
</div>
{/*  Weekly Study Activity Heat Map / Calendar  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-24 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">calendar_view_month</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Tần suất học tuần này</h2>
</div>
<span className="font-label-md text-label-md text-on-surface font-bold">—</span>
</div>
{/*  Weekly Activity Matrix (Mon to Sun)  */}
<div className="flex flex-col gap-space-8">
<div className="grid grid-cols-7 gap-space-4 text-center font-label-xs text-label-xs text-on-surface-variant">
<span>—</span>
<span>—</span>
<span>—</span>
<span>—</span>
<span>—</span>
<span>—</span>
<span>CN</span>
</div>
{/*  Heatmap Blocks  */}
<div className="grid grid-cols-7 gap-space-4">
<div className="h-10 rounded-lg bg-secondary-container flex flex-col items-center justify-center group relative cursor-pointer">
<span className="font-label-xs text-label-xs text-on-surface font-bold">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">—</div>
</div>
<div className="h-10 rounded-lg bg-primary-container text-on-primary-container flex flex-col items-center justify-center group relative cursor-pointer">
<span className="font-label-xs text-label-xs font-bold">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">—</div>
</div>
<div className="h-10 rounded-lg bg-secondary-container flex flex-col items-center justify-center group relative cursor-pointer">
<span className="font-label-xs text-label-xs text-on-surface font-bold">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">—</div>
</div>
<div className="h-10 rounded-lg bg-primary text-on-primary flex flex-col items-center justify-center group relative cursor-pointer">
<span className="font-label-xs text-label-xs font-bold">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">—</div>
</div>
<div className="h-10 rounded-lg bg-secondary-container flex flex-col items-center justify-center group relative cursor-pointer">
<span className="font-label-xs text-label-xs text-on-surface font-bold">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">—</div>
</div>
{/*  Today (Saturday)  */}
<div className="h-10 rounded-lg bg-primary text-on-primary ring-2 ring-primary ring-offset-2 flex flex-col items-center justify-center group relative cursor-pointer">
<span className="font-label-xs text-label-xs font-bold">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">—</div>
</div>
{/*  Sunday  */}
<div className="h-10 rounded-lg bg-surface-container flex flex-col items-center justify-center group relative cursor-pointer opacity-60">
<span className="font-label-xs text-label-xs text-on-surface-variant">—</span>
<div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">Chủ nhật (Dự kiến)</div>
</div>
</div>
</div>
<div className="flex items-center justify-between pt-space-4 border-t-0 font-body-sm text-body-sm text-on-surface-variant">
<div className="flex items-center gap-space-4">
<span className="w-2.5 h-2.5 rounded bg-surface-container"></span>
<span className="text-[11px]">Ít</span>
<span className="w-2.5 h-2.5 rounded bg-secondary-container"></span>
<span className="w-2.5 h-2.5 rounded bg-primary"></span>
<span className="text-[11px]">Nhiều</span>
</div>
<span className="text-primary font-bold font-label-xs">—</span>
</div>
</div>
</div>
</div>
</div></div></main></div>
    </div>

</LearnerShell>
);
}
