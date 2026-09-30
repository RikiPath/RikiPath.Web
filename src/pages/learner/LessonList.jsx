import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
export default function LessonList() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Bài học">
<div className="pl-0 bg-[#FAF7F5] text-[#1f1a1c] antialiased" data-page="LessonList" data-shell-unified="1">
<div className="mx-auto w-full max-w-[1440px] p-6 sm:p-8">
<div className="grid grid-cols-12 gap-7">
{/*  Left 8-Column Section: Lessons Header, Filters, Cards  */}
<div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
{/*  Page Header & Course Progress Banner  */}
<div className="bg-white border border-card-border rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary-light/60 pointer-events-none blur-2xl"></div>
<div className="space-y-1.5 z-10">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold tracking-wide">JLPT N3</span>
<span className="text-xs font-semibold text-text-muted">Khoá học JLPT N3 Cốt Lõi</span>
</div>
<h1 className="text-2xl font-extrabold text-text-main tracking-tight">Danh sách bài học</h1>
<p className="text-xs text-text-muted">{"Hệ thống hoá kiến thức ngữ pháp, từ vựng & Kanji theo mục tiêu 130+ điểm"}</p>
</div>
{/*  Progress Card Widget  */}
<div className="z-10 bg-page-bg border border-card-border p-4 rounded-xl flex flex-col min-w-[240px] gap-2">
<div className="flex items-center justify-between text-xs">
<span className="font-bold text-text-main">18 / 30 bài hoàn thành</span>
<span className="font-extrabold text-primary text-sm">60%</span>
</div>
<div className="w-full h-2 rounded-full bg-white border border-card-border/80 overflow-hidden">
<div className="h-full bg-gradient-to-r from-primary to-[#F8BBD0] rounded-full w-[60%]"></div>
</div>
<div className="flex items-center justify-between text-[11px]">
<span className="flex items-center gap-1 text-emerald-600 font-semibold">
<span className="material-symbols-outlined text-[14px]">check_circle</span>{" Đang đúng tiến độ\n                "}</span>
<span className="text-text-muted font-medium">Còn 12 bài</span>
</div>
</div>
</div>
{/*  Filter Pills Carousel / Group  */}
<div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
<button className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm shadow-primary/20 shrink-0">Tất cả</button>
<button className="px-4 py-2 rounded-xl bg-white border border-card-border text-text-muted hover:text-primary hover:border-primary-soft hover:bg-primary-light/40 transition-colors text-xs font-semibold shrink-0">N4 Ôn tập</button>
<button className="px-4 py-2 rounded-xl bg-primary-light border border-primary/30 text-primary text-xs font-bold shrink-0">N3 Trọng tâm</button>
<button className="px-4 py-2 rounded-xl bg-white border border-card-border text-text-muted hover:text-primary hover:border-primary-soft hover:bg-primary-light/40 transition-colors text-xs font-semibold shrink-0">Ngữ pháp</button>
<button className="px-4 py-2 rounded-xl bg-white border border-card-border text-text-muted hover:text-primary hover:border-primary-soft hover:bg-primary-light/40 transition-colors text-xs font-semibold shrink-0">Từ vựng</button>
<button className="px-4 py-2 rounded-xl bg-white border border-card-border text-text-muted hover:text-primary hover:border-primary-soft hover:bg-primary-light/40 transition-colors text-xs font-semibold shrink-0">Kanji</button>
<button className="px-4 py-2 rounded-xl bg-white border border-card-border text-text-muted hover:text-primary hover:border-primary-soft hover:bg-primary-light/40 transition-colors text-xs font-semibold shrink-0">Hội thoại Kaiwa</button>
<button className="px-4 py-2 rounded-xl bg-white border border-card-border text-text-muted hover:text-primary hover:border-primary-soft hover:bg-primary-light/40 transition-colors text-xs font-semibold shrink-0">Đọc hiểu Dokkai</button>
</div>
{/*  Lessons Grid: 2 columns in the 8-col workspace  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{/*  Card 1: Bài 15 (Đang học 60%)  */}
<div className="bg-white border-2 border-primary/40 rounded-2xl p-5 shadow-card flex flex-col justify-between relative group hover:border-primary transition-all">
<div className="absolute top-4 right-4">
<span className="px-2.5 py-1 rounded-full bg-primary-light text-primary text-[11px] font-bold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>{" Đang học\n                "}</span>
</div>
<div>
<div className="flex items-center gap-2 mb-3">
<span className="px-2.5 py-0.5 rounded-md bg-page-bg border border-card-border text-[11px] font-bold text-text-main">N3</span>
<span className="px-2.5 py-0.5 rounded-md bg-[#FDEEF2] text-primary text-[11px] font-bold">Ngữ pháp</span>
<span className="text-[11px] text-text-muted flex items-center gap-1 font-medium ml-1">
<span className="material-symbols-outlined text-[15px]">timer</span>{" 15:40\n                  "}</span>
</div>
<h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors leading-snug">{"Bài 15: Mẫu câu ～てもいいです\n                "}</h3>
<p className="text-xs text-text-muted mt-1.5 line-clamp-2">{"Quy tắc diễn đạt sự cho phép, mẫu câu lịch sự và các biến thể phủ định hay gặp trong đề thi JLPT.\n                "}</p>
</div>
<div className="mt-5 pt-4 border-t border-card-border/70 flex flex-col gap-3">
<div className="space-y-1">
<div className="flex justify-between text-[11px] font-bold">
<span className="text-text-muted">Tiến độ bài</span>
<span className="text-primary font-bold">60%</span>
</div>
<div className="w-full h-1.5 rounded-full bg-page-bg overflow-hidden border border-card-border/60">
<div className="h-full bg-primary rounded-full w-[60%]"></div>
</div>
</div>
<Link to="/lesson-player" className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-primary/25">
<span className="material-symbols-outlined text-[16px]">play_arrow</span>{"Tiếp tục học\n                "}</Link>
</div>
</div>
{/*  Card 2: Bài 14 (Đã hoàn thành 100%)  */}
<div className="bg-white border border-card-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between group hover:border-primary-soft transition-all">
<div className="flex justify-between items-start mb-3">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md bg-page-bg border border-card-border text-[11px] font-bold text-text-main">N3</span>
<span className="px-2.5 py-0.5 rounded-md bg-[#FDEEF2] text-primary text-[11px] font-bold">Ngữ pháp</span>
<span className="text-[11px] text-text-muted flex items-center gap-1 font-medium ml-1">
<span className="material-symbols-outlined text-[15px]">timer</span>{" 12:30\n                  "}</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check</span>{" Hoàn thành\n                "}</span>
</div>
<div>
<h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors leading-snug">{"Bài 14: Thể TE - Cách chia và sử dụng\n                "}</h3>
<p className="text-xs text-text-muted mt-1.5 line-clamp-2">{"Tổng hợp bí kíp nhớ nhóm động từ 1, 2, 3 và chuyển thể Te tốc hành trong 3 giây.\n                "}</p>
</div>
<div className="mt-5 pt-4 border-t border-card-border/70 flex flex-col gap-3">
<div className="space-y-1">
<div className="flex justify-between text-[11px] font-bold">
<span className="text-text-muted">Tiến độ bài</span>
<span className="text-emerald-700 font-bold">100%</span>
</div>
<div className="w-full h-1.5 rounded-full bg-page-bg overflow-hidden border border-card-border/60">
<div className="h-full bg-emerald-500 rounded-full w-full"></div>
</div>
</div>
<Link to="/lesson-player" className="w-full py-2.5 px-4 rounded-xl bg-page-bg hover:bg-primary-light text-text-main hover:text-primary border border-card-border text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">replay</span>{"Ôn tập lại\n                "}</Link>
</div>
</div>
{/*  Card 3: Bài 16 (Sắp học)  */}
<div className="bg-white border border-card-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between group hover:border-primary-soft transition-all">
<div className="flex justify-between items-start mb-3">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md bg-page-bg border border-card-border text-[11px] font-bold text-text-main">N3</span>
<span className="px-2.5 py-0.5 rounded-md bg-[#FDEEF2] text-primary text-[11px] font-bold">Ngữ pháp</span>
<span className="text-[11px] text-text-muted flex items-center gap-1 font-medium ml-1">
<span className="material-symbols-outlined text-[15px]">timer</span>{" 10:15\n                  "}</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-bold">{"Sắp học\n                "}</span>
</div>
<div>
<h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors leading-snug">{"Bài 16: Mẫu câu ～てはいけません\n                "}</h3>
<p className="text-xs text-text-muted mt-1.5 line-clamp-2">{"Cấu trúc cấm đoán mang tính quy định, so sánh sắc thái với ngữ pháp cấm đoán sơ cấp.\n                "}</p>
</div>
<div className="mt-5 pt-4 border-t border-card-border/70 flex flex-col gap-3">
<div className="space-y-1">
<div className="flex justify-between text-[11px] font-bold">
<span className="text-text-muted">Tiến độ bài</span>
<span className="text-text-muted font-bold">0%</span>
</div>
<div className="w-full h-1.5 rounded-full bg-page-bg overflow-hidden border border-card-border/60">
<div className="h-full bg-primary rounded-full w-0"></div>
</div>
</div>
<Link to="/lesson-player" className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20">
<span className="material-symbols-outlined text-[16px]">play_circle</span>{"Bắt đầu học\n                "}</Link>
</div>
</div>
{/*  Card 4: Bài 17 (Từ vựng, Đã hoàn thành)  */}
<div className="bg-white border border-card-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between group hover:border-primary-soft transition-all">
<div className="flex justify-between items-start mb-3">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md bg-page-bg border border-card-border text-[11px] font-bold text-text-main">N3</span>
<span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-100">Từ vựng</span>
<span className="text-[11px] text-text-muted flex items-center gap-1 font-medium ml-1">
<span className="material-symbols-outlined text-[15px]">timer</span>{" 20:00\n                  "}</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check</span>{" Hoàn thành\n                "}</span>
</div>
<div>
<h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors leading-snug">{"Bài 17: Từ vựng chủ đề Giao thông & Đi lại\n                "}</h3>
<p className="text-xs text-text-muted mt-1.5 line-clamp-2">{"50 từ vựng cốt lõi về tàu cao tốc Shinkansen, thủ tục sân bay và hướng dẫn tra lộ trình ga.\n                "}</p>
</div>
<div className="mt-5 pt-4 border-t border-card-border/70 flex flex-col gap-3">
<div className="space-y-1">
<div className="flex justify-between text-[11px] font-bold">
<span className="text-text-muted">Tiến độ bài</span>
<span className="text-emerald-700 font-bold">100%</span>
</div>
<div className="w-full h-1.5 rounded-full bg-page-bg overflow-hidden border border-card-border/60">
<div className="h-full bg-emerald-500 rounded-full w-full"></div>
</div>
</div>
<Link to="/vocabulary" className="w-full py-2.5 px-4 rounded-xl bg-page-bg hover:bg-primary-light text-text-main hover:text-primary border border-card-border text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">replay</span>{"Ôn tập lại\n                "}</Link>
</div>
</div>
{/*  Card 5: Bài 18 (Kanji, Khóa)  */}
<div className="bg-white/70 border border-card-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between opacity-80 group hover:opacity-100 transition-all">
<div className="flex justify-between items-start mb-3">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md bg-page-bg border border-card-border text-[11px] font-bold text-text-muted">N3</span>
<span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-100">Kanji</span>
<span className="text-[11px] text-text-muted flex items-center gap-1 font-medium ml-1">
<span className="material-symbols-outlined text-[15px]">timer</span>{" 25:00\n                  "}</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-text-muted text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">lock</span>{" Khóa\n                "}</span>
</div>
<div>
<h3 className="text-base font-bold text-text-muted leading-snug">{"Bài 18: Kanji Bộ Thủ & Bộ Tâm\n                "}</h3>
<p className="text-xs text-text-muted mt-1.5 line-clamp-2">{"Phân biệt các Hán tự có nét tương đồng, phương pháp liên tưởng hình ảnh độc quyền.\n                "}</p>
</div>
<div className="mt-5 pt-4 border-t border-card-border/70 flex flex-col gap-3">
<div className="flex items-center gap-1.5 text-[11px] text-text-muted">
<span className="material-symbols-outlined text-[15px]">info</span>
<span>{"Mở khóa sau khi hoàn thành Bài 15 & 16"}</span>
</div>
<button className="w-full py-2.5 px-4 rounded-xl bg-gray-100 text-text-muted/70 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5" disabled>
<span className="material-symbols-outlined text-[16px]">lock</span>{"Chưa mở khóa\n                "}</button>
</div>
</div>
{/*  Card 6: Bài 19 (Đọc hiểu Dokkai, Khóa)  */}
<div className="bg-white/70 border border-card-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between opacity-80 group hover:opacity-100 transition-all">
<div className="flex justify-between items-start mb-3">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md bg-page-bg border border-card-border text-[11px] font-bold text-text-muted">N3</span>
<span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-100">Đọc hiểu</span>
<span className="text-[11px] text-text-muted flex items-center gap-1 font-medium ml-1">
<span className="material-symbols-outlined text-[15px]">timer</span>{" 30:00\n                  "}</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-text-muted text-[11px] font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">lock</span>{" Khóa\n                "}</span>
</div>
<div>
<h3 className="text-base font-bold text-text-muted leading-snug">{"Bài 19: Đọc hiểu Đoản văn Dokkai Công sở\n                "}</h3>
<p className="text-xs text-text-muted mt-1.5 line-clamp-2">{"Chiến thuật định vị từ khoá, mẹo đọc email thông báo và nắm bắt ý đồ tác giả trong 2 phút.\n                "}</p>
</div>
<div className="mt-5 pt-4 border-t border-card-border/70 flex flex-col gap-3">
<div className="flex items-center gap-1.5 text-[11px] text-text-muted">
<span className="material-symbols-outlined text-[15px]">info</span>
<span>Mở khóa sau khi vượt qua Bài 18</span>
</div>
<button className="w-full py-2.5 px-4 rounded-xl bg-gray-100 text-text-muted/70 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5" disabled>
<span className="material-symbols-outlined text-[16px]">lock</span>{"Chưa mở khóa\n                "}</button>
</div>
</div>
</div>
</div>
{/*  Right 4-Column Section: AI Tutor Haru & Quick Review Widget  */}
<div className="col-span-12 xl:col-span-4 flex flex-col gap-5">
{/*  AI Haru Advisor Widget  */}
<div className="bg-gradient-to-br from-white via-white to-primary-light/40 border border-card-border rounded-2xl p-6 shadow-subtle relative overflow-hidden">
<div className="flex items-center justify-between mb-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-2xl bg-[#E05A7A] text-white flex items-center justify-center shadow-md shadow-primary/30">
<span className="material-symbols-outlined text-[22px]">smart_toy</span>
</div>
<div>
<h4 className="text-sm font-bold text-text-main">Haru AI Advisor</h4>
<p className="text-[11px] text-text-muted">Trợ lý học tập thông minh</p>
</div>
</div>
<span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Trực tuyến</span>
</div>
<div className="bg-page-bg/80 border border-card-border rounded-xl p-3.5 mb-4 text-xs text-text-main leading-relaxed">
<span className="font-bold text-primary">Gợi ý ôn tập gấp:</span>{" Lan-san ơi, bạn đã làm sai 2 câu chia thể "}<strong>Te (nhóm 1)</strong>{" trong bài kiểm tra hôm qua. Hãy dành 5 phút ôn lại Bài 14 trước khi học tiếp nhé!\n            "}</div>
<div className="space-y-2">
<Link to="/lesson-player" className="w-full py-2 px-3 rounded-xl bg-white hover:bg-primary-light border border-card-border hover:border-primary-soft transition-colors flex items-center justify-between text-xs font-semibold text-text-main">
<span className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-primary">priority_high</span>{"Ôn nhanh chia động từ thể Te\n                "}</span>
<span className="material-symbols-outlined text-[16px] text-text-muted">chevron_right</span>
</Link>
<Link to="/exam-n3" className="w-full py-2 px-3 rounded-xl bg-white hover:bg-primary-light border border-card-border hover:border-primary-soft transition-colors flex items-center justify-between text-xs font-semibold text-text-main">
<span className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-primary">quiz</span>{"Xem lại 3 câu hỏi hay sai\n                "}</span>
<span className="material-symbols-outlined text-[16px] text-text-muted">chevron_right</span>
</Link>
</div>
</div>
{/*  Quick 5-Question Challenge Card  */}
<div className="bg-white border border-card-border rounded-2xl p-6 shadow-subtle flex flex-col gap-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
<span className="material-symbols-outlined text-[18px]">bolt</span>
</div>
<h4 className="text-sm font-bold text-text-main">Thử thách 5 câu nhanh</h4>
</div>
<span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">+50 XP</span>
</div>
<p className="text-xs text-text-muted leading-relaxed">{"Củng cố ngay phản xạ ngữ pháp ～てもいいです & ～てはいけません với bài tập trắc nghiệm siêu tốc 60 giây.\n            "}</p>
<div className="p-3 bg-page-bg rounded-xl border border-card-border flex items-center justify-between text-xs font-semibold">
<span className="text-text-muted">{"Thời lượng: "}<strong className="text-text-main">1 phút</strong></span>
<span className="text-text-muted">{"Độ khó: "}<strong className="text-text-main">N3 Tiêu chuẩn</strong></span>
</div>
<Link to="/exam-n3" className="w-full py-2.5 bg-[#E05A7A] hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-sm shadow-primary/25 transition-colors flex items-center justify-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">play_circle</span>{"Bắt đầu thử thách ngay\n            "}</Link>
</div>
{/*  Learning Goals Mini-Tracker  */}
<div className="bg-white border border-card-border rounded-2xl p-5 shadow-subtle flex flex-col gap-3.5">
<div className="flex items-center justify-between">
<h4 className="text-xs font-bold text-text-main uppercase tracking-wider">Mục tiêu tuần này</h4>
<span className="text-xs font-bold text-primary">3 / 4 bài</span>
</div>
<div className="space-y-2">
<div className="flex items-center justify-between text-xs text-text-muted">
<span className="flex items-center gap-1.5 font-medium">
<span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>{" Hoàn thành Bài 14\n                "}</span>
<span className="text-[11px] text-emerald-600 font-bold">Xong</span>
</div>
<div className="flex items-center justify-between text-xs text-text-muted">
<span className="flex items-center gap-1.5 font-medium">
<span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>{" Hoàn thành Bài 17\n                "}</span>
<span className="text-[11px] text-emerald-600 font-bold">Xong</span>
</div>
<div className="flex items-center justify-between text-xs text-text-muted">
<span className="flex items-center gap-1.5 font-medium">
<span className="material-symbols-outlined text-[16px] text-primary">radio_button_checked</span>{" Hoàn thành Bài 15\n                "}</span>
<span className="text-[11px] text-primary font-bold">60%</span>
</div>
<div className="flex items-center justify-between text-xs text-text-muted">
<span className="flex items-center gap-1.5 font-medium">
<span className="material-symbols-outlined text-[16px] text-text-muted/60">radio_button_unchecked</span>{" Bài 16 & Quiz tuần\n                "}</span>
<span className="text-[11px] text-text-muted font-bold">Chờ</span>
</div>
</div>
</div>
</div>
</div>
    </div>
    </div>
  
</LearnerShell>
);
}
