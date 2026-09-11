import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';

export default function RoadmapJLPT() {
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
      // Simple Micro-interaction for the Quick Drill Button
        document.addEventListener('DOMContentLoaded', function() {
          const drillBtn = document.getElementById('btn-quick-drill');
          if (drillBtn) {
            drillBtn.addEventListener('click', function() {
              const originalText = drillBtn.innerHTML;
              drillBtn.innerHTML = '<span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>Đang tải đề luyện...</span>';
              setTimeout(() => {
                drillBtn.innerHTML = '<span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span><span>Sẵn sàng! Chuyển trang...</span>';
                setTimeout(() => {
                  drillBtn.innerHTML = originalText;
                }, 1500);
              }, 800);
            });
          }
        });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Lộ trình">
<div className="bg-background font-body-md text-on-surface antialiased" data-page="RoadmapJLPT" data-shell-unified="1">

<div className="pl-0"><main className="relative pt-0 bg-background min-h-screen"><div className="max-w-[1440px] mx-auto px-space-xl py-space-lg"><div className="flex flex-col w-full gap-space-xl">
{/*  Visual Ambient Flourish (Petal mist glow)  */}
<div className="relative w-full overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm p-space-xl">
<div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
<div className="absolute left-1/3 -bottom-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-2xl pointer-events-none"></div>
<div className="relative flex flex-col gap-space-lg">
{/*  Breadcrumb / Overline  */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
<span className="text-primary font-japanese-display text-japanese-display">桜道</span>
<span className="">•</span>
<span className="tracking-wide uppercase font-label-sm text-label-sm text-outline">Lộ Trình Học Tập Cá Nhân Hóa</span>
<span className="">/</span>
<span className="text-primary font-medium">JLPT N3 Chinh Phục</span>
</div>
<div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-full">
<span className="material-symbols-outlined text-tertiary text-[18px]">workspace_premium</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">{"Mục tiêu kỳ thi 12/2025: "}<strong className="text-on-surface">145/180 Điểm</strong></span>
</div>
</div>
{/*  Main Headline & Quick Stats Grid  */}
<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg">
<div className="flex flex-col gap-space-xxs max-w-2xl">
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{"Lộ trình bứt phá JLPT N3 Sakura Pathway\n          "}</h1>
<p className="font-body-md text-body-md text-on-surface-variant">{"Phương pháp học vi mô (Micro-learning) kết hợp chuẩn giáo trình Shinkanzen & công nghệ Haru AI phản hồi phát âm theo thời gian thực.\n          "}</p>
</div>
{/*  Metric Rings / Progress Cluster  */}
<div className="flex items-center gap-space-lg bg-surface-container-low p-space-md rounded-xl">
<div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
<svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
<circle className="text-outline-variant/30" cx="24" cy="24" fill="none" r="20" stroke="currentColor" strokeWidth="4.5"></circle>
<circle className="transition-all duration-1000" cx="24" cy="24" fill="none" r="20" stroke="#e05a7a" strokeDasharray="125.6" strokeDashoffset="52.75" strokeLinecap="round" strokeWidth="4.5"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-title-sm text-title-sm text-on-surface font-bold leading-none">58%</span>
</div>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Tiến độ tổng quan</span>
<span className="font-title-md text-title-md text-on-surface font-bold">{"18 / 30 "}<span className="font-body-sm text-body-sm font-normal text-on-surface-variant">Bài học</span></span>
<span className="font-body-sm text-body-sm text-tertiary flex items-center gap-1 mt-0.5">
<span className="material-symbols-outlined text-[14px]">trending_up</span>{" Đúng tiến độ (+4 ngày)\n            "}</span>
</div>
</div>
</div>
{/*  Level Selector Tabs  */}
<div className="flex items-center gap-space-xs pt-space-xs overflow-x-auto">
{/*  N5  */}
<button className="flex items-center gap-2 px-space-md py-space-sm rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all group">
<span className="w-6 h-6 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
<span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
</span>
<span className="font-title-sm text-title-sm">N5 Căn Bản</span>
<span className="font-label-sm text-label-sm text-outline">100%</span>
</button>
{/*  N4  */}
<button className="flex items-center gap-2 px-space-md py-space-sm rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all group">
<span className="w-6 h-6 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
<span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
</span>
<span className="font-title-sm text-title-sm">N4 Sơ Cấp</span>
<span className="font-label-sm text-label-sm text-outline">100%</span>
</button>
{/*  N3 (Active)  */}
<button className="flex items-center gap-2 px-space-lg py-space-sm rounded-xl neo-sakura-btn font-semibold cursor-pointer"><span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span><span className="font-title-sm text-title-sm text-white">N3 Trung Cấp</span><span className="font-label-sm text-label-sm bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Đang học</span></button>
{/*  N2 (Locked)  */}
<button className="flex items-center gap-2 px-space-md py-space-sm rounded-xl bg-surface-container-low/60 text-outline cursor-not-allowed opacity-75">
<span className="material-symbols-outlined text-[18px]">lock</span>
<span className="font-title-sm text-title-sm">N2 Nâng Cao</span>
<span className="font-label-sm text-label-sm text-outline-variant">Khóa</span>
</button>
{/*  N1 (Locked)  */}
<button className="flex items-center gap-2 px-space-md py-space-sm rounded-xl bg-surface-container-low/60 text-outline cursor-not-allowed opacity-75">
<span className="material-symbols-outlined text-[18px]">lock</span>
<span className="font-title-sm text-title-sm">N1 Thượng Cấp</span>
<span className="font-label-sm text-label-sm text-outline-variant">Khóa</span>
</button>
</div>
</div>
</div>
{/*  12-Column Core Architecture  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
{/*  LEFT 8-COLUMN STEPPER JOURNEY  */}
<div className="lg:col-span-8 flex flex-col gap-space-lg">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-sm">
<span className="material-symbols-outlined text-primary text-[24px]">alt_route</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Tiến trình theo chặng (Milestone Roadmap)</h2>
</div>
<div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
<span className="">4 Chặng lớn</span>
</div>
</div>
{/*  Stepper Container  */}
<div className="relative flex flex-col gap-space-lg">
{/*  Connecting Vertical Guide Line  */}
<div className="absolute left-6 top-8 bottom-8 w-1 bg-surface-container-high -z-0"></div>
{/*  CHẶNG 1: HOÀN THÀNH  */}
<div className="relative flex items-start gap-space-lg">
{/*  Step Marker  */}
<div className="w-12 h-12 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center flex-shrink-0 shadow-sm z-10">
<span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
</div>
{/*  Card Content  */}
<div className="flex-1 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex flex-col">
<div className="flex items-center gap-space-xs mb-1">
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary font-label-sm text-label-sm font-semibold">Chặng 01 • Hoàn thành</span>
<span className="text-outline text-label-sm">• Đạt 96/100 Điểm đánh giá</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface">Nền tảng Ngữ pháp N3 Cốt Lõi</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Hệ thống 110 cấu trúc ngữ pháp tương phản, liên từ chỉ điều kiện và sắc thái kính ngữ.</p>
</div>
<div className="flex items-center gap-space-sm flex-shrink-0">
<div className="text-right">
<span className="font-label-sm text-label-sm text-outline">Bài tập</span>
<p className="font-title-sm text-title-sm text-tertiary font-bold">12 / 12 Hoàn thành</p>
</div>
<button className="w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors" title="Xem lại bài học">
<span className="material-symbols-outlined text-[20px]">history</span>
</button>
</div>
</div>
</div>
</div>
{/*  CHẶNG 2: ĐANG HỌC (ACTIVE / HERO CARD)  */}
<div className="relative flex items-start gap-space-lg">
{/*  Step Marker  */}
<div className="w-12 h-12 rounded-2xl bg-neo-sakura text-on-primary flex items-center justify-center flex-shrink-0 shadow-md z-10"><span className="material-symbols-outlined text-[24px] text-white">local_florist</span></div>
{/*  Card Content Highlighted  */}
<div className="flex-1 bg-surface-container-lowest rounded-xl p-space-lg shadow-md relative overflow-hidden"><div className="absolute top-0 right-0 w-48 h-48 bg-[#fce7eb]/50 rounded-bl-full pointer-events-none"></div><div className="relative flex flex-col gap-space-md"><div className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs"><div className="flex flex-col"><div className="flex items-center gap-space-xs mb-1"><span className="px-2.5 py-0.5 rounded-full bg-neo-sakura-soft text-neo-sakura font-label-sm text-label-sm font-bold">Chặng 02 • Đang diễn ra</span><span className="text-outline font-label-sm text-label-sm">{"• Shinkanzen Master Kanji & Goi"}</span></div><h3 className="font-headline-sm text-headline-sm text-on-surface">{"Từ vựng & Hán tự Shinkanzen Master"}</h3></div><span className="px-3 py-1 rounded-full bg-neo-sakura-soft text-neo-sakura font-title-sm text-title-sm font-bold self-start md:self-auto">67% Hoàn thành</span></div><p className="font-body-md text-body-md text-on-surface-variant">{"Đang tập trung chủ điểm: "}<strong className="text-on-surface">{"Chủ đề Công việc & Giao tiếp công sở (第3週・職場の人間関係)"}</strong>. Bạn đang duy trì phong độ rất tốt!</p><div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 bg-neo-sakura" style={{ width: "67%" }}></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-space-xs"><div className="p-space-sm rounded-xl bg-[#fff8f8] border border-[#fce7eb] flex flex-col gap-1"><div className="flex items-center justify-between text-outline"><span className="font-label-sm text-label-sm">Từ vựng</span><span className="material-symbols-outlined text-[16px]">menu_book</span></div><span className="font-title-sm text-title-sm text-on-surface font-bold">{"170 "}<span className="font-body-sm text-body-sm text-on-surface-variant font-normal">/ 250 từ</span></span><div className="w-full bg-[#f0e6e8] h-1 rounded-full overflow-hidden"><div className="bg-neo-sakura h-full rounded-full" style={{ width: "68%" }}></div></div></div><div className="p-space-sm rounded-xl bg-[#fff8f8] border border-[#fce7eb] flex flex-col gap-1"><div className="flex items-center justify-between text-outline"><span className="font-label-sm text-label-sm">Kanji cốt lõi</span><span className="material-symbols-outlined text-[16px]">translate</span></div><span className="font-title-sm text-title-sm text-on-surface font-bold">{"52 "}<span className="font-body-sm text-body-sm text-on-surface-variant font-normal">/ 80 chữ</span></span><div className="w-full bg-[#f0e6e8] h-1 rounded-full overflow-hidden"><div className="bg-neo-sakura h-full rounded-full" style={{ width: "65%" }}></div></div></div><div className="p-space-sm rounded-xl bg-[#fff8f8] border border-[#fce7eb] flex flex-col gap-1"><div className="flex items-center justify-between text-outline"><span className="font-label-sm text-label-sm">Mẫu ứng dụng</span><span className="material-symbols-outlined text-[16px]">psychology</span></div><span className="font-title-sm text-title-sm text-on-surface font-bold">{"6 "}<span className="font-body-sm text-body-sm text-on-surface-variant font-normal">/ 10 mẫu</span></span><div className="w-full bg-[#f0e6e8] h-1 rounded-full overflow-hidden"><div className="bg-neo-sakura h-full rounded-full" style={{ width: "60%" }}></div></div></div></div><div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-xs"><div className="flex items-center gap-space-sm"><div className="w-9 h-9 rounded-full bg-neo-sakura-soft flex items-center justify-center text-neo-sakura"><span className="material-symbols-outlined text-[20px] text-neo-sakura">play_circle</span></div><div className="flex flex-col"><span className="font-title-sm text-title-sm text-on-surface">Bài 14: Đối âm Hán tự On-yomi âm ngắt</span><span className="font-body-sm text-body-sm text-on-surface-variant">Khoảng 15 phút ôn luyện phản xạ</span></div></div><button className="w-full sm:w-auto px-space-lg py-space-sm rounded-xl neo-sakura-btn font-title-sm text-title-sm transition-all flex items-center justify-center gap-space-xs cursor-pointer"><span className="">Tiếp tục học ngay</span><span className="material-symbols-outlined text-[18px]">arrow_forward</span></button></div></div></div>
</div>
{/*  CHẶNG 3: MỞ KHÓA SAU 4 NGÀY  */}
<div className="relative flex items-start gap-space-lg">
{/*  Step Marker  */}
<div className="w-12 h-12 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0 z-10">
<span className="material-symbols-outlined text-[22px]">schedule</span>
</div>
{/*  Card Content  */}
<div className="flex-1 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm opacity-90">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex flex-col">
<div className="flex items-center gap-space-xs mb-1">
<span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">Chặng 03 • Sắp mở</span>
<span className="text-primary font-label-sm text-label-sm font-medium">Mở khóa sau 4 ngày học liên tiếp</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface">{"Đọc hiểu Dokkai & Shadowing AI Tokyo"}</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">15 bài học chuyên sâu về bẫy đọc hiểu đoạn văn ngắn, bảng thông báo và kỹ thuật bắt từ khóa.</p>
</div>
<div className="flex items-center gap-space-xs self-start md:self-auto">
<button className="px-space-md py-space-xs rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">visibility</span>{" Xem trước nội dung\n                "}</button>
</div>
</div>
{/*  Preview Badges  */}
<div className="flex flex-wrap items-center gap-space-xs mt-space-md pt-space-xs">
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">Dokkai Trung đoạn (7 bài)</span>
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">Đọc lọc thông tin Jouhou Kensaku (3 bài)</span>
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">Choukai Phản xạ hội thoại NHK (5 bài)</span>
</div>
</div>
</div>
{/*  CHẶNG 4: LUYỆN ĐỀ THI THỰC CHIẾN (LOCKED)  */}
<div className="relative flex items-start gap-space-lg">
{/*  Step Marker  */}
<div className="w-12 h-12 rounded-2xl bg-surface-container-high text-outline flex items-center justify-center flex-shrink-0 z-10">
<span className="material-symbols-outlined text-[22px]">lock</span>
</div>
{/*  Card Content  */}
<div className="flex-1 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm opacity-60">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex flex-col">
<div className="flex items-center gap-space-xs mb-1">
<span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-outline font-label-sm text-label-sm">Chặng 04 • Khóa tạm thời</span>
<span className="text-outline text-label-sm">{"• Yêu cầu hoàn tất Chặng 2 & 3"}</span>
</div>
<h3 className="font-title-md text-title-md text-outline">Luyện đề Thi thử JLPT N3 Thực Chiến</h3>
<p className="font-body-sm text-body-sm text-outline mt-1">5 bộ đề chuẩn hóa cấu trúc đề thi thật JEES với đồng hồ đếm ngược áp lực phòng thi.</p>
</div>
<div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[18px]">lock_clock</span>
<span className="">Chưa khả dụng</span>
</div>
</div>
</div>
</div>
</div>
{/*  Roadmap Footnote Tip  */}
<div className="p-space-md rounded-xl bg-surface-container-low flex items-center gap-space-md">
<div className="w-10 h-10 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary flex-shrink-0">
<span className="material-symbols-outlined text-[20px]">lightbulb</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
<strong className="text-on-surface">Mẹo học Riki:</strong>{" Ôn tập lặp lại ngắt quãng (Spaced Repetition) mỗi sáng 15 phút sẽ tăng tỉ lệ ghi nhớ Hán tự N3 thêm 42% so với việc nhồi nhét cuối tuần.\n        "}</p>
</div>
</div>
{/*  RIGHT 4-COLUMN SUPPORTING PANELS  */}
<div className="lg:col-span-4 flex flex-col gap-space-lg">
{/*  1. HARU AI STUDY DIAGNOSTIC WIDGET  */}
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden"><div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-[#fce7eb]/60 blur-xl pointer-events-none"></div><div className="flex items-start justify-between"><div className="flex items-center gap-space-sm"><div className="w-10 h-10 rounded-xl bg-neo-sakura text-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-[20px]">smart_toy</span></div><div className="flex flex-col"><h3 className="font-title-sm text-title-sm text-on-surface">Haru AI Chẩn Đoán</h3><span className="font-label-sm text-label-sm text-neo-sakura font-semibold">Cảnh báo lỗi thường gặp</span></div></div><span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-label-sm text-label-sm font-semibold">Độ nhầm lẫn 82%</span></div><div className="p-space-sm rounded-xl bg-[#fff8f8] border border-[#fce7eb] flex flex-col gap-space-xs"><span className="font-label-sm text-label-sm text-on-surface-variant">Bộ chữ Hán tương tự trong đề thi thử số 1:</span><div className="grid grid-cols-4 gap-space-xs pt-1"><div className="p-space-xs bg-surface-container-lowest rounded-lg text-center shadow-sm border border-[#fce7eb]"><span className="font-japanese-display text-japanese-display text-neo-sakura block leading-none">待</span><span className="font-label-sm text-label-sm text-outline block mt-1">ĐÃI</span><span className="text-[10px] text-on-surface-variant block">Chờ đợi</span></div><div className="p-space-xs bg-surface-container-lowest rounded-lg text-center shadow-sm border border-[#f3e8eb]"><span className="font-japanese-display text-japanese-display text-on-surface block leading-none">持</span><span className="font-label-sm text-label-sm text-outline block mt-1">TRÌ</span><span className="text-[10px] text-on-surface-variant block">Cầm, giữ</span></div><div className="p-space-xs bg-surface-container-lowest rounded-lg text-center shadow-sm border border-[#f3e8eb]"><span className="font-japanese-display text-japanese-display text-on-surface block leading-none">特</span><span className="font-label-sm text-label-sm text-outline block mt-1">ĐẶC</span><span className="text-[10px] text-on-surface-variant block">Đặc biệt</span></div><div className="p-space-xs bg-surface-container-lowest rounded-lg text-center shadow-sm border border-[#f3e8eb]"><span className="font-japanese-display text-japanese-display text-on-surface block leading-none">侍</span><span className="font-label-sm text-label-sm text-outline block mt-1">THỊ</span><span className="text-[10px] text-on-surface-variant block">Samurai</span></div></div></div><p className="font-body-sm text-body-sm text-on-surface-variant">{"Bộ thủ "}<strong className="text-on-surface">彳 (Xích)</strong>{" và "}<strong className="text-on-surface">扌 (Thủ)</strong>{" dễ gây bẫy phân vân khi làm bài trắc nghiệm nhanh 15 giây."}</p><button className="w-full py-space-sm px-space-md rounded-xl neo-sakura-pill-btn font-title-sm text-title-sm transition-all flex items-center justify-center gap-space-xs cursor-pointer" id="btn-quick-drill"><span className="material-symbols-outlined text-[18px]">bolt</span><span className="">Luyện phân biệt ngay (3 phút)</span></button></div>
{/*  2. WEEKLY SCHEDULE & STUDY RHYTHM  */}
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_month</span>
<h3 className="font-title-sm text-title-sm text-on-surface">Nhịp học tuần này</h3>
</div>
<span className="font-label-sm text-label-sm text-tertiary font-bold bg-tertiary-fixed/30 px-2.5 py-0.5 rounded-full">5 / 7 Ngày hoàn tất</span>
</div>
{/*  7-Day Dots Rhythm  */}
<div className="grid grid-cols-7 gap-space-xs text-center">
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-outline">T2</span>
<div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-label-sm text-label-sm font-bold">✓</div>
<span className="text-[10px] text-on-surface-variant">35p</span>
</div>
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-outline">T3</span>
<div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-label-sm text-label-sm font-bold">✓</div>
<span className="text-[10px] text-on-surface-variant">42p</span>
</div>
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-outline">T4</span>
<div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-label-sm text-label-sm font-bold">✓</div>
<span className="text-[10px] text-on-surface-variant">30p</span>
</div>
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-outline">T5</span>
<div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-label-sm text-label-sm font-bold">✓</div>
<span className="text-[10px] text-on-surface-variant">50p</span>
</div>
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-outline">T6</span>
<div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-label-sm text-label-sm font-bold">✓</div>
<span className="text-[10px] text-on-surface-variant">32p</span>
</div>
{/*  Today  */}
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-primary font-bold">T7</span>
<div className="w-8 h-8 rounded-full bg-neo-sakura text-white flex items-center justify-center font-label-sm text-label-sm font-bold shadow-sm"><span className="material-symbols-outlined text-[16px]">edit</span></div>
<span className="text-[10px] text-primary font-bold">Hôm nay</span>
</div>
<div className="flex flex-col items-center gap-1.5">
<span className="font-label-sm text-label-sm text-outline">CN</span>
<div className="w-8 h-8 rounded-full bg-surface-container-high text-outline flex items-center justify-center font-label-sm text-label-sm font-medium">○</div>
<span className="text-[10px] text-outline">--</span>
</div>
</div>
<div className="pt-space-xs border-t border-surface-container flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
<span className="">Mục tiêu hàng ngày:</span>
<span className="font-title-sm text-title-sm text-on-surface font-bold">30 phút / ngày</span>
</div>
</div>
{/*  3. MINI MOCK TEST CTA CARD  */}
<div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"><div className="flex items-center justify-between"><span className="px-2.5 py-0.5 rounded-full bg-neo-sakura-soft text-neo-sakura font-label-sm text-label-sm font-bold uppercase tracking-wider">Thử Thách Nhanh</span><div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm"><span className="material-symbols-outlined text-[16px]">timer</span><span className="">30 phút</span></div></div><div className="flex flex-col gap-1"><h3 className="font-title-md text-title-md text-on-surface font-bold">Mini Mock Test JLPT N3</h3><p className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thu nhỏ gồm 25 câu hỏi thích ứng (Adaptive) bao quát Từ vựng - Ngữ pháp - Đọc hiểu cơ bản.</p></div><div className="flex items-center gap-space-md p-space-sm rounded-xl bg-surface-container-lowest shadow-sm border border-[#fce7eb]"><div className="w-10 h-10 rounded-xl bg-neo-sakura-soft text-neo-sakura flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[20px]">equalizer</span></div><div className="flex flex-col min-w-0"><span className="font-label-sm text-label-sm text-outline">Đánh giá tức thì</span><span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{"Dự báo điểm JLPT & Phân tích điểm yếu"}</span></div></div><button className="w-full py-space-sm px-space-md rounded-xl neo-sakura-btn font-title-sm text-title-sm shadow-sm transition-all flex items-center justify-center gap-space-xs cursor-pointer"><span className="material-symbols-outlined text-[18px]">quiz</span><span className="">Bắt đầu thi thử ngay</span></button></div>
{/*  SENSEI MENTOR QUICK NOTE  */}
<div className="p-space-md rounded-xl bg-surface-container-low flex items-center gap-space-md shadow-sm">
<div className="relative flex-shrink-0">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-primary font-bold">
<span className="material-symbols-outlined text-[24px]">school</span>
</div>
<span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-tertiary"></span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">Sensei Kenji (Riki Tokyo)</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">"Chào Lan-san! Hôm nay nhớ hoàn thành nốt cụm từ vựng Bài 14 nhé, có bài tập dịch rất thú vị!"</p>
</div>
</div>
</div>
</div>
</div>
</div></main></div>


    </div>
  
</LearnerShell>
);
}
