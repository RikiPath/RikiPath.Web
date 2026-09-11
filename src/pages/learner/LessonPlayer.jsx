import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function LessonPlayer() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Player">
<div className="bg-page-bg text-charcoal min-h-screen flex overflow-x-hidden antialiased min-h-screen" data-page="LessonPlayer" data-shell-unified="1">


{/*  Sidebar Navigation (260px Fixed)  */}





{/*  Main Workspace Column  */}


<div className="flex-1 flex flex-col h-full overflow-hidden">
{/*  Top Navbar  */}

{/*  12-Column Responsive Body Container  */}
<main className="flex-1 overflow-y-auto custom-scrollbar">
<div className="max-w-[1440px] mx-auto p-6 md:p-8">
<div className="grid grid-cols-12 gap-8 items-start">
{/*  LEFT COLUMN: 8 Columns (Video & Study Workspace)  */}
<section className="col-span-12 lg:col-span-8 space-y-6">
{/*  Video Player Card (16:9)  */}
<div className="bg-surface rounded-2xl border border-border-soft overflow-hidden shadow-card">
{/*  Simulated Video Screen  */}
<div className="w-full bg-[#181215] aspect-video relative group flex flex-col justify-between overflow-hidden select-none">
{/*  Background Video Shot of Japanese Teacher  */}
<div className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-500 group-hover:scale-[1.01]" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAtZpBzXpO5epLYPKtXeGELjMAhTxiXjPmLLcTBk8cclfGMNjaE9TcPicLv8RNBuQjUOnEaXkgOY6Ow2P3-Ol7lSn9HvKZePikzL4jBBHOVQ97mpjeBiC81Dm_mrHUCw8kHco6HHr64R8ZQEBT96a3ig_IcvhYm8tvbpC4HX-gk_E-uXPtKak_UOl8dm92J6aKyQPiBdHouh-QMr8cNHbUK3sqM5ABjJPiarfWo6UE39rGKVLy82A9_5g')" }}></div>
{/*  Top Overlay Gradient  */}
<div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/75 to-transparent z-10 p-4 flex items-center justify-between text-white">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded bg-primary/90 text-white font-bold text-[11px] tracking-wider uppercase">1080p FHD</span>
<span className="text-[13px] font-semibold drop-shadow-sm">Bài 15: Ngữ pháp xin phép「〜てもいいです」</span>
</div>
<div className="flex items-center gap-2 text-white/90">
<span className="text-[11px] bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Sensei Aoi Takahashi
                  </span>
</div>
</div>
{/*  Center Big Play Button (Sakura Accent)  */}
<div className="relative z-20 flex-1 flex items-center justify-center">
<button className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/95 hover:bg-primary text-white rounded-full flex items-center justify-center shadow-floating transform transition-all duration-200 group-hover:scale-105 active:scale-95">
<span className="material-symbols-outlined text-4xl sm:text-5xl icon-fill ml-1">play_arrow</span>
</button>
</div>
{/*  Bilingual Subtitle Overlay Preview  */}
<div className="relative z-20 px-6 pb-2 text-center">
<div className="inline-block bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-lg border border-white/10 text-white">
<p className="font-jp text-[14px] text-pink-100 font-medium tracking-wide">「写真を撮ってもいいですか。」</p>
<p className="text-[12px] text-white/90 font-sans">"Tôi có thể chụp ảnh ở đây được không ạ?"</p>
</div>
</div>
{/*  Professional Video Controls Overlay  */}
<div className="relative z-20 p-4 pt-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white">
{/*  Progress Bar (#E05A7A)  */}
<div className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full mb-3 cursor-pointer group/bar transition-all flex items-center">
<div className="w-[35%] h-full bg-primary rounded-full relative">
<div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/bar:scale-100 transition-transform"></div>
</div>
</div>
{/*  Action Controls Row  */}
<div className="flex items-center justify-between text-white/90 text-[13px]">
{/*  Left side controls  */}
<div className="flex items-center gap-3.5">
<button className="hover:text-primary-light transition-colors" title="Tạm dừng">
<span className="material-symbols-outlined icon-fill text-[22px]">pause</span>
</button>
<button className="hover:text-primary-light transition-colors" title="Lùi 10 giây">
<span className="material-symbols-outlined text-[20px]">replay_10</span>
</button>
<button className="hover:text-primary-light transition-colors" title="Tiến 10 giây">
<span className="material-symbols-outlined text-[20px]">forward_10</span>
</button>
{/*  Volume  */}
<div className="flex items-center gap-2 ml-1">
<button className="hover:text-primary-light transition-colors">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
<div className="w-16 h-1 bg-white/30 rounded-full hidden sm:block cursor-pointer">
<div className="w-3/4 h-full bg-white rounded-full"></div>
</div>
</div>
{/*  Timestamp  */}
<span className="font-medium text-[12px] ml-1 text-white/80 tracking-tight font-mono">05:23 / 15:40</span>
</div>
{/*  Right side controls  */}
<div className="flex items-center gap-3">
<button className="text-[11px] font-bold text-white/90 hover:text-primary-light border border-white/30 px-2 py-0.5 rounded-md hover:border-white transition-colors">
                      1.25x
                    </button>
{/*  Subtitles CC Button (Active Song ngữ)  */}
<button className="text-primary-light flex items-center gap-0.5 hover:text-white transition-colors" title="Phụ đề song ngữ Nhật-Việt">
<span className="material-symbols-outlined icon-fill text-[20px]">closed_caption</span>
<span className="text-[10px] font-bold uppercase tracking-wider">JP/VI</span>
</button>
<button className="hover:text-primary-light transition-colors" title="Cài đặt">
<span className="material-symbols-outlined text-[20px]">settings</span>
</button>
<button className="hover:text-primary-light transition-colors" title="Toàn màn hình">
<span className="material-symbols-outlined text-[20px]">fullscreen</span>
</button>
</div>
</div>
</div>
</div>
</div>
{/*  Lesson Navigation Actions Row  */}
<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-surface rounded-2xl border border-border-soft shadow-card">
{/*  Prev / Next Navigation  */}
<div className="flex items-center gap-2.5 w-full sm:w-auto">
<button className="flex-1 sm:flex-none px-4 py-2 border border-border-soft rounded-xl text-[13px] font-semibold text-charcoal hover:text-primary hover:border-primary/40 hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-[18px]">arrow_back</span>
<span>Bài trước <span className="text-text-muted font-normal text-[12px] hidden md:inline">(Bài 14: Thể TE)</span></span>
</button>
<button className="flex-1 sm:flex-none px-4 py-2 border border-border-soft rounded-xl text-[13px] font-semibold text-charcoal hover:text-primary hover:border-primary/40 hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
<span>Bài tiếp <span className="text-text-muted font-normal text-[12px] hidden md:inline">(Bài 16)</span></span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
</div>
{/*  Main CTA: Mark as Complete  */}
<button className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-[14px] font-bold shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95">
<span className="material-symbols-outlined text-[19px]">check_circle</span>
<span>Mark as Complete / Hoàn thành bài học</span>
</button>
</div>
{/*  Study Workspace Multi-tabs  */}
<div className="bg-surface rounded-2xl border border-border-soft shadow-card overflow-hidden">
{/*  Tab Headers  */}
<div className="flex items-center border-b border-border-soft bg-surface-soft/60 px-4 pt-2 overflow-x-auto custom-scrollbar">
<button className="px-5 py-3 text-[14px] font-bold text-primary border-b-2 border-primary bg-white rounded-t-xl flex items-center gap-2 whitespace-nowrap shadow-sm">
<span className="material-symbols-outlined text-[18px] icon-fill">dictionary</span>
<span>Từ vựng quan trọng</span>
<span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-primary-100 text-primary">4</span>
</button>
<button className="px-5 py-3 text-[14px] font-medium text-text-muted hover:text-charcoal transition-colors flex items-center gap-2 whitespace-nowrap">
<span className="material-symbols-outlined text-[18px]">menu_book</span>
<span>Cấu trúc ngữ pháp</span>
</button>
<button className="px-5 py-3 text-[14px] font-medium text-text-muted hover:text-charcoal transition-colors flex items-center gap-2 whitespace-nowrap">
<span className="material-symbols-outlined text-[18px]">quiz</span>
<span>Luyện tập nhanh (Mini-Quiz)</span>
</button>
<button className="px-5 py-3 text-[14px] font-medium text-text-muted hover:text-charcoal transition-colors flex items-center gap-2 whitespace-nowrap">
<span className="material-symbols-outlined text-[18px]">edit_note</span>
<span>Ghi chú của bạn</span>
</button>
</div>
{/*  Tab Content: Từ vựng quan trọng  */}
<div className="p-6 space-y-6">
{/*  Vocabulary Cards Grid  */}
<div>
<div className="flex items-center justify-between mb-4">
<h3 className="text-[15px] font-bold text-charcoal flex items-center gap-2">
<span className="w-1.5 h-4 bg-primary rounded-full"></span>
                    Từ vựng cốt lõi dùng với mẫu câu ～てもいいです
                  </h3>
<button className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">bookmark_added</span>
                    Lưu tất cả vào sổ từ
                  </button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{/*  Word 1: 図書館  */}
<div className="p-4 rounded-xl border border-border-soft bg-white hover:border-primary/50 hover:shadow-card transition-all flex flex-col justify-between">
<div>
<div className="flex items-start justify-between">
<div>
<div className="flex items-baseline gap-2">
<span className="font-jp text-[24px] font-bold text-charcoal">図書館</span>
<span className="text-[12px] font-medium text-text-muted font-jp">【としょかん】</span>
</div>
<p className="text-[13px] text-charcoal font-medium mt-1">thư viện</p>
</div>
<button className="w-8 h-8 rounded-lg bg-surface-soft hover:bg-primary-50 text-text-muted hover:text-primary flex items-center justify-center transition-colors" title="Nghe phát âm chuẩn Tokyo">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</div>
<div className="mt-4 pt-3 border-t border-border-soft/60 flex items-center justify-between">
<span className="text-[11px] font-semibold text-text-muted uppercase">Danh từ • N5/N4</span>
<button className="text-[12px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg transition-colors">
<span className="material-symbols-outlined text-[16px] icon-fill">bookmark_added</span>
<span>Đã lưu</span>
</button>
</div>
</div>
{/*  Word 2: 写真を撮る  */}
<div className="p-4 rounded-xl border border-border-soft bg-white hover:border-primary/50 hover:shadow-card transition-all flex flex-col justify-between">
<div>
<div className="flex items-start justify-between">
<div>
<div className="flex items-baseline gap-2">
<span className="font-jp text-[24px] font-bold text-charcoal">写真を撮る</span>
<span className="text-[12px] font-medium text-text-muted font-jp">【しゃしんをとる】</span>
</div>
<p className="text-[13px] text-charcoal font-medium mt-1">chụp ảnh</p>
</div>
<button className="w-8 h-8 rounded-lg bg-surface-soft hover:bg-primary-50 text-text-muted hover:text-primary flex items-center justify-center transition-colors" title="Nghe phát âm chuẩn Tokyo">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</div>
<div className="mt-4 pt-3 border-t border-border-soft/60 flex items-center justify-between">
<span className="text-[11px] font-semibold text-text-muted uppercase">Cụm động từ nhóm 1</span>
<button className="text-[12px] font-semibold text-text-muted hover:text-primary flex items-center gap-1 hover:bg-surface-soft px-2.5 py-1 rounded-lg transition-colors">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Lưu vào Sổ từ</span>
</button>
</div>
</div>
{/*  Word 3: 借りる  */}
<div className="p-4 rounded-xl border border-border-soft bg-white hover:border-primary/50 hover:shadow-card transition-all flex flex-col justify-between">
<div>
<div className="flex items-start justify-between">
<div>
<div className="flex items-baseline gap-2">
<span className="font-jp text-[24px] font-bold text-charcoal">借りる</span>
<span className="text-[12px] font-medium text-text-muted font-jp">【かりる】</span>
</div>
<p className="text-[13px] text-charcoal font-medium mt-1">mượn, vay</p>
</div>
<button className="w-8 h-8 rounded-lg bg-surface-soft hover:bg-primary-50 text-text-muted hover:text-primary flex items-center justify-center transition-colors" title="Nghe phát âm chuẩn Tokyo">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</div>
<div className="mt-4 pt-3 border-t border-border-soft/60 flex items-center justify-between">
<span className="text-[11px] font-semibold text-text-muted uppercase">Động từ nhóm 2</span>
<button className="text-[12px] font-semibold text-text-muted hover:text-primary flex items-center gap-1 hover:bg-surface-soft px-2.5 py-1 rounded-lg transition-colors">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Lưu vào Sổ từ</span>
</button>
</div>
</div>
{/*  Word 4: たばこを吸う  */}
<div className="p-4 rounded-xl border border-border-soft bg-white hover:border-primary/50 hover:shadow-card transition-all flex flex-col justify-between">
<div>
<div className="flex items-start justify-between">
<div>
<div className="flex items-baseline gap-2">
<span className="font-jp text-[24px] font-bold text-charcoal">たばこを吸う</span>
<span className="text-[12px] font-medium text-text-muted font-jp">【たばこをすう】</span>
</div>
<p className="text-[13px] text-charcoal font-medium mt-1">hút thuốc lá</p>
</div>
<button className="w-8 h-8 rounded-lg bg-surface-soft hover:bg-primary-50 text-text-muted hover:text-primary flex items-center justify-center transition-colors" title="Nghe phát âm chuẩn Tokyo">
<span className="material-symbols-outlined text-[18px]">volume_up</span>
</button>
</div>
</div>
<div className="mt-4 pt-3 border-t border-border-soft/60 flex items-center justify-between">
<span className="text-[11px] font-semibold text-text-muted uppercase">Cụm động từ nhóm 1</span>
<button className="text-[12px] font-semibold text-text-muted hover:text-primary flex items-center gap-1 hover:bg-surface-soft px-2.5 py-1 rounded-lg transition-colors">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Lưu vào Sổ từ</span>
</button>
</div>
</div>
</div>
</div>
{/*  Grammar Syntax Note Block  */}
<div className="p-5 rounded-2xl bg-surface-soft/80 border border-border-soft">
<div className="flex items-center gap-2 mb-2.5">
<span className="material-symbols-outlined text-primary text-[20px]">draw</span>
<h4 className="text-[14px] font-bold text-charcoal">Khối ghi chú cú pháp trọng tâm</h4>
</div>
{/*  Formula Box  */}
<div className="p-3.5 bg-white rounded-xl border border-border-soft mb-3 flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="px-2.5 py-1 bg-primary-100 text-primary font-bold text-[12px] rounded-md font-jp">Cấu trúc</span>
<span className="text-[16px] font-bold text-charcoal font-jp">V-て + もいいです (か)</span>
</div>
<span className="text-[12px] font-semibold text-primary">Ý nghĩa: Được phép làm V / Xin phép làm V</span>
</div>
{/*  Example list  */}
<div className="space-y-2 text-[13px]">
<div className="p-2.5 bg-white/70 rounded-lg border border-border-soft/50 flex items-start gap-2">
<span className="text-primary font-bold">例1:</span>
<div>
<p className="font-jp text-charcoal font-medium">ここで写真を撮ってもいいですか。 — はい、いいですよ。</p>
<p className="text-text-muted text-[12px] mt-0.5">Tôi chụp ảnh ở đây được không? — Vâng, được chứ ạ.</p>
</div>
</div>
<div className="p-2.5 bg-white/70 rounded-lg border border-border-soft/50 flex items-start gap-2">
<span className="text-primary font-bold">例2:</span>
<div>
<p className="font-jp text-charcoal font-medium">この辞書を借りてもいいですか。</p>
<p className="text-text-muted text-[12px] mt-0.5">Tôi có thể mượn cuốn từ điển này không?</p>
</div>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  RIGHT COLUMN: 4 Columns (Curriculum & Haru AI Assistant)  */}
<aside className="col-span-12 lg:col-span-4 space-y-6">
{/*  Curriculum Playlist Card  */}
<div className="bg-surface rounded-2xl border border-border-soft p-5 shadow-card">
<div className="flex items-center justify-between pb-3 border-b border-border-soft">
<div>
<h3 className="text-[16px] font-bold text-charcoal">Chương trình học</h3>
<p className="text-[12px] text-text-muted">Khóa học JLPT N3 Tổng hợp</p>
</div>
<span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-100 text-primary">N3 Pathway</span>
</div>
{/*  Progress Bar Section (32%)  */}
<div className="mt-4 mb-5">
<div className="flex items-center justify-between text-[12px] mb-1.5">
<span className="text-text-muted font-medium">Tiến độ khóa học</span>
<span className="font-extrabold text-primary">32% Hoàn thành</span>
</div>
<div className="w-full h-2 bg-surface-soft rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "32%" }}></div>
</div>
<div className="flex justify-between items-center text-[11px] text-text-muted mt-1.5">
<span>Đã học 8/25 bài</span>
<span>Còn 17 bài học</span>
</div>
</div>
{/*  Chapters & Lessons Accordion  */}
<div className="space-y-3">
{/*  Chapter 1: In Progress  */}
<div className="rounded-xl border border-border-soft overflow-hidden">
<button className="w-full p-3 bg-surface-soft/80 flex items-center justify-between text-left hover:bg-surface-soft transition-colors">
<span className="text-[13px] font-bold text-charcoal">Chương 1: Các mẫu câu xin phép & điều kiện</span>
<span className="material-symbols-outlined text-[18px] text-text-muted">expand_less</span>
</button>
{/*  Lessons in Chapter 1  */}
<div className="divide-y divide-border-soft/60 bg-white">
{/*  Lesson 14: Completed (Green check)  */}
<a className="p-3 flex items-start gap-3 hover:bg-surface-soft/50 transition-colors group" href="#">
<span className="material-symbols-outlined text-success-teal text-[19px] icon-fill mt-0.5">check_circle</span>
<div className="flex-1 min-w-0">
<p className="text-[13px] font-medium text-text-muted group-hover:text-charcoal truncate">Bài 14: Thể TE & Quy tắc biến âm</p>
<div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
<span>12:30</span>
<span>•</span>
<span className="text-success-teal font-semibold">Đã hoàn thành</span>
</div>
</div>
</a>
{/*  Lesson 15: Currently Active (Highlight Neo-Sakura #E05A7A)  */}
<div className="p-3 flex items-start gap-3 bg-primary-50/80 border-l-4 border-primary">
<span className="material-symbols-outlined text-primary text-[19px] icon-fill mt-0.5">play_circle</span>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between">
<p className="text-[13px] font-bold text-primary truncate">Bài 15: Mẫu câu ～てもいいです</p>
</div>
<div className="flex items-center gap-2 mt-0.5 text-[11px]">
<span className="text-primary font-bold">15:40</span>
<span className="text-primary/60">•</span>
<span className="px-2 py-0.2 rounded bg-primary text-white font-bold text-[10px]">Đang học</span>
</div>
</div>
</div>
{/*  Lesson 16: Upcoming  */}
<a className="p-3 flex items-start gap-3 hover:bg-surface-soft/50 transition-colors group opacity-85" href="#">
<span className="material-symbols-outlined text-border-soft text-[19px] mt-0.5 group-hover:text-text-muted">radio_button_unchecked</span>
<div className="flex-1 min-w-0">
<p className="text-[13px] font-medium text-charcoal group-hover:text-primary transition-colors truncate">Bài 16: Mẫu câu ～てはいけません (Cấm đoán)</p>
<div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
<span>10:15</span>
<span>•</span>
<span>Chưa học</span>
</div>
</div>
</a>
</div>
</div>
{/*  Chapter 2: Diễn tả trạng thái (Collapsed)  */}
<div className="rounded-xl border border-border-soft overflow-hidden">
<button className="w-full p-3 bg-surface text-left flex items-center justify-between hover:bg-surface-soft transition-colors">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-text-muted">lock</span>
<span className="text-[13px] font-medium text-charcoal">Chương 2: Diễn tả trạng thái tiếp diễn</span>
</div>
<span className="material-symbols-outlined text-[18px] text-text-muted">expand_more</span>
</button>
</div>
{/*  Chapter 3: Nối mệnh đề (Collapsed)  */}
<div className="rounded-xl border border-border-soft overflow-hidden">
<button className="w-full p-3 bg-surface text-left flex items-center justify-between hover:bg-surface-soft transition-colors">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-text-muted">lock</span>
<span className="text-[13px] font-medium text-charcoal">Chương 3: Nối các vế câu và thứ tự hành động</span>
</div>
<span className="material-symbols-outlined text-[18px] text-text-muted">expand_more</span>
</button>
</div>
</div>
</div>
{/*  AI Haru Advisor Card  */}
<div className="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 rounded-2xl border border-primary-light/60 p-5 shadow-card relative overflow-hidden">
<div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
<div className="flex items-start gap-3 mb-3">
<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-white shadow-md shadow-primary/20 flex-shrink-0">
<span className="material-symbols-outlined text-2xl icon-fill">smart_toy</span>
</div>
<div>
<div className="flex items-center gap-1.5">
<h4 className="text-[14px] font-bold text-charcoal">Cố vấn AI Haru Sensei</h4>
<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
</div>
<p className="text-[11px] text-text-muted">Trợ lý gia sư 24/7 trực tuyến</p>
</div>
</div>
<p className="text-[13px] text-charcoal leading-relaxed mb-4">
              Bạn có thắc mắc về bài giảng này? Đặt câu hỏi cho <span className="font-bold text-primary">Haru Sensei</span> để được giải thích chi tiết và lấy thêm ví dụ tức thì!
            </p>
{/*  Quick prompt suggestions  */}
<div className="space-y-1.5 mb-4">
<button className="w-full text-left text-[11px] p-2 bg-white rounded-lg border border-border-soft hover:border-primary/50 hover:bg-primary-50 text-text-muted hover:text-charcoal transition-colors flex items-center justify-between">
<span>"Phân biệt ～てもいい và ～てもかまいません?"</span>
<span className="material-symbols-outlined text-[14px] text-primary">chevron_right</span>
</button>
<button className="w-full text-left text-[11px] p-2 bg-white rounded-lg border border-border-soft hover:border-primary/50 hover:bg-primary-50 text-text-muted hover:text-charcoal transition-colors flex items-center justify-between">
<span>"Cách chia động từ nhóm 1 sang thể TE?"</span>
<span className="material-symbols-outlined text-[14px] text-primary">chevron_right</span>
</button>
</div>
{/*  Input / Ask CTA  */}
<div className="flex items-center gap-2">
<div className="relative flex-1">
<input className="w-full pl-3 pr-8 py-2 text-[12px] bg-white border border-border-soft rounded-xl text-charcoal placeholder-text-muted focus:outline-none focus:border-primary" placeholder="Hỏi Haru bất kỳ câu hỏi nào..." type="text" />
<button className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary-hover">
<span className="material-symbols-outlined text-[18px]">send</span>
</button>
</div>
</div>
</div>
</aside>
</div>
</div>
</main>
</div>


    </div>
  
</LearnerShell>
);
}
