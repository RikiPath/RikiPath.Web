import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function DailySRS() {
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
      // Simple micro-interaction for initiating SRS session
        document.getElementById('start-session-btn')?.addEventListener('click', function() {
          const originalText = this.innerHTML;
          this.innerHTML = `<span className="material-symbols-outlined text-[20px] animate-spin">refresh</span><span>Đang chuẩn bị bộ thẻ...</span>`;
          setTimeout(() => {
            this.innerHTML = `<span className="material-symbols-outlined text-[20px]">done</span><span>Bắt đầu thẻ 1/28 (改善)</span>`;
            this.classList.add('bg-tertiary');
          }, 600);
        });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Ôn SRS">
<div className="bg-background font-body-md text-on-surface antialiased min-h-screen" data-page="DailySRS" data-shell-unified="1">

<main className="w-full pt-0 bg-background"><div className="flex flex-col w-full">
<div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl flex flex-col lg:flex-row gap-gutter-desktop">
{/*  Sidebar Navigation (260px desktop sync)  */}

{/*  Main Content Area (Multi-column Dashboard)  */}
<main className="flex-1 min-w-0 flex flex-col gap-space-xl">
{/*  Top Sub-Nav Info Strip  */}
<div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs">
<div>
<div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm tracking-wider uppercase font-semibold">
<span className="material-symbols-outlined text-[18px]">timelapse</span>
<span className="">Neo-Sakura Spaced Algorithm • Ebbinghaus Matrix</span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface mt-0.5">{"Hàng đợi Ôn tập Ngắt quãng\n          "}</h1>
<p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">{"Ứng dụng thuật toán Spaced Repetition (SRS) tối ưu theo chu kỳ quên lãng Ebbinghaus. Ôn đúng thời điểm giúp dịch chuyển từ vựng từ trí nhớ ngắn hạn sang vùng lưu trữ bền vững vô thức.\n          "}</p>
</div>
<div className="flex items-center gap-space-sm">
<div className="hidden sm:flex items-center gap-2 px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-sm text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
<span className="">Hôm nay: <strong className="text-on-surface">Thứ Tư, 15/05</strong></span>
</div>
<button className="px-space-md py-space-xs rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors">
<span className="material-symbols-outlined text-[18px] text-primary">tune</span>
<span className="">Lọc thẻ</span>
</button>
</div>
</div>
{/*  Banner Hero: Ôn tập Trọng tâm (28 thẻ)  */}
<section className="relative overflow-hidden bg-surface-container-lowest rounded-2xl p-space-xl md:p-space-2xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-space-xl">
{/*  Subtle decorative glow  */}
<div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary-container/25 blur-3xl pointer-events-none"></div>
<div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-primary/5 blur-2xl pointer-events-none"></div>
<div className="relative z-10 flex flex-col gap-space-md max-w-xl">
<div className="inline-flex items-center gap-2 px-space-md py-1 rounded-full bg-secondary-container/40 text-primary w-fit font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[16px]">notifications_active</span>
<span className="">Phiên học đề xuất cho buổi sáng</span>
</div>
<h2 className="font-headline-md text-headline-md text-on-surface leading-snug">{"Hôm nay bạn có "}<span className="text-primary font-bold">28 thẻ</span> cần ôn tập để giữ vững <span className="text-primary">"trí nhớ vàng"</span>{"!\n          "}</h2>
<div className="flex items-center gap-space-lg text-on-surface-variant font-label-md text-label-md">
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-primary">schedule</span>{"Thời gian dự kiến: "}<strong>~12 phút</strong>
</span>
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>{"Tỷ lệ duy trì ước tính: "}<strong>94.2%</strong>
</span>
</div>
{/*  3 Stats Block  */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-space-xs">
{/*  Stat 1: Cần ôn khẩn cấp  */}
<div className="bg-surface-container-low p-space-sm rounded-xl flex flex-col gap-1">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-primary font-semibold">Cần ôn khẩn cấp</span>
<span className="w-2 h-2 rounded-full bg-primary"></span>
</div>
<span className="font-headline-lg text-headline-lg text-primary font-bold">12</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Vòng lặp ngắn • Dễ quên</span>
</div>
{/*  Stat 2: Đến hạn hôm nay  */}
<div className="bg-surface-container p-space-sm rounded-xl flex flex-col gap-1">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-secondary font-semibold">Đến hạn hôm nay</span>
<span className="w-2 h-2 rounded-full bg-secondary"></span>
</div>
<span className="font-headline-lg text-headline-lg text-secondary font-bold">10</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Đúng chu kỳ SRS chuẩn</span>
</div>
{/*  Stat 3: Củng cố dài hạn  */}
<div className="bg-surface-container-low p-space-sm rounded-xl flex flex-col gap-1">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-tertiary font-semibold">Củng cố dài hạn</span>
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
</div>
<span className="font-headline-lg text-headline-lg text-tertiary font-bold">6</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Chu kỳ 30 ngày • Trí nhớ sâu</span>
</div>
</div>
</div>
{/*  Interactive Hero Callout Card  */}
<div className="relative z-10 w-full lg:w-80 flex flex-col items-center justify-center p-space-lg bg-surface-container-low rounded-2xl text-center gap-space-md shadow-sm">
<div className="relative">
<div className="w-20 h-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
<span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
</div>
{/*  Floating Cherry blossom icon  */}
<div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary shadow-sm">
<span className="material-symbols-outlined text-[18px]">filter_vintage</span>
</div>
</div>
<div className="space-y-1">
<h3 className="font-title-md text-title-md text-on-surface font-bold">Sẵn sàng phản xạ?</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Lật thẻ nhanh, đánh giá trung thực theo 4 mức độ nhớ.</p>
</div>
<button className="w-full py-space-sm px-space-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold rounded-xl shadow-[0_4px_16px_rgba(217,75,104,0.25)] hover:shadow-lg transition-all flex items-center justify-center gap-2 group" id="start-session-btn"><span className="">Bắt đầu phiên ôn tập ngay (28 thẻ)</span><span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span></button>
</div>
</section>
{/*  Memory Curve & Retention Matrix (12-column layout)  */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-desktop">
{/*  Left Column (8 cols): Level Distribution & Card Queue Preview  */}
<div className="xl:col-span-8 flex flex-col gap-space-xl">
{/*  Section 1: Phân bổ cấp độ từ vựng & Ebbinghaus Mini-chart  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">pie_chart</span>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Phân bổ cấp độ JLPT trong hàng đợi</h3>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">Tổng cộng: 28 từ vựng</span>
</div>
{/*  Segmented Progress Gauge  */}
<div className="flex flex-col gap-2">
<div className="w-full h-3 rounded-full bg-surface-container overflow-hidden flex">
<div className="h-full bg-secondary-fixed-dim" style={{ width: "14.28%" }} title="N5 (Căn bản): 4 từ"></div>
<div className="h-full bg-secondary" style={{ width: "50%" }} title="N4 (Mục tiêu): 14 từ"></div>
<div className="h-full bg-primary" style={{ width: "35.72%" }} title="N3 (Nâng cao): 10 từ"></div>
</div>
{/*  Legend  */}
<div className="grid grid-cols-3 gap-2 pt-1">
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-md bg-secondary-fixed-dim shrink-0"></span>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm font-bold text-on-surface">4 từ N5</span>
<span className="font-body-sm text-[11px] text-on-surface-variant">Căn bản vững chắc</span>
</div>
</div>
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-md bg-secondary shrink-0"></span>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm font-bold text-on-surface">14 từ N4</span>
<span className="font-body-sm text-[11px] text-on-surface-variant">Trọng tâm kỳ thi</span>
</div>
</div>
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-md bg-primary shrink-0"></span>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm font-bold text-on-surface">10 từ N3</span>
<span className="font-body-sm text-[11px] text-on-surface-variant">Chinh phục bứt phá</span>
</div>
</div>
</div>
</div>
{/*  Inline SVG: Ebbinghaus Retention Trend Curve  */}
<div className="pt-space-xs bg-surface-container-low rounded-xl p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md">
<div className="flex flex-col gap-1 max-w-xs">
<span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-tertiary">trending_up</span>{"Độ phục hồi ký ức Ebbinghaus\n                "}</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">{"Sau 3 lần lặp lại SRS, đường suy giảm chậm dần, hiệu quả ghi nhớ đạt 88% sau 30 ngày.\n                "}</p>
</div>
<div className="w-full md:w-64 h-24 flex items-center justify-center">
{/*  Inline mini retention curve SVG  */}
<svg aria-label="Ebbinghaus Memory Retention Chart" className="w-full h-full" fill="none" viewBox="0 0 240 80" xmlns="http://www.w3.org/2000/svg">
<path className="text-surface-container-highest" d="M10 70 L230 70" stroke="currentColor" stroke-dasharray="3 3" strokeWidth="1.5"></path>
<path className="text-surface-container-highest" d="M10 15 L230 15" stroke="currentColor" stroke-dasharray="3 3" strokeWidth="1.5"></path>
{/*  Natural forgetting curve (Gray dotted)  */}
<path className="text-outline-variant" d="M10 20 Q 35 60 70 68 T 230 72" stroke="currentColor" stroke-dasharray="4 4" strokeWidth="1.5"></path>
{/*  Spaced repetition reinforced curve (Primary red-pink)  */}
<path className="text-primary" d="M10 20 Q 30 50 45 35 T 90 40 T 150 25 T 230 20" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
{/*  Pulse review points  */}
<circle className="fill-primary text-surface-container-lowest" cx="45" cy="35" r="4" stroke="currentColor" strokeWidth="2"></circle>
<circle className="fill-primary text-surface-container-lowest" cx="90" cy="40" r="4" stroke="currentColor" strokeWidth="2"></circle>
<circle className="fill-primary text-surface-container-lowest" cx="150" cy="25" r="4" stroke="currentColor" strokeWidth="2"></circle>
<circle className="fill-tertiary text-surface-container-lowest" cx="230" cy="20" r="5" stroke="currentColor" strokeWidth="2"></circle>
</svg>
</div>
</div>
</div>
{/*  Section 2: Danh sách xem trước 5 thẻ đầu tiên trong phiên  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">view_carousel</span>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Xem trước 5 thẻ ưu tiên hàng đầu</h3>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">Thứ tự hiển thị tự động tối ưu</span>
</div>
{/*  5 Flashcard Preview Rows  */}
<div className="flex flex-col gap-space-xs">
{/*  Card 1  */}
<div className="group p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between transition-all duration-200 shadow-sm">
<div className="flex items-center gap-space-md">
<span className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center">01</span>
<div className="flex flex-col">
<div className="flex items-center gap-2">
<span className="font-japanese-display text-japanese-display font-bold text-on-surface">改善</span>
<span className="font-body-sm text-body-sm text-on-surface-variant font-medium">(かいぜん)</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface">Cải thiện / Cải tiến • Kaizen</span>
</div>
</div>
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">N3</span>
<span className="hidden sm:inline-flex items-center gap-1 text-primary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">priority_high</span>{"Khẩn cấp\n                  "}</span>
<button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
</div>
</div>
{/*  Card 2  */}
<div className="group p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between transition-all duration-200 shadow-sm">
<div className="flex items-center gap-space-md">
<span className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold flex items-center justify-center">02</span>
<div className="flex flex-col">
<div className="flex items-center gap-2">
<span className="font-japanese-display text-japanese-display font-bold text-on-surface">約束</span>
<span className="font-body-sm text-body-sm text-on-surface-variant font-medium">(やくそく)</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface">Lời hứa, cuộc hẹn, giao ước</span>
</div>
</div>
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">N4</span>
<span className="hidden sm:inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">schedule</span>{"Đúng hạn\n                  "}</span>
<button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
</div>
</div>
{/*  Card 3  */}
<div className="group p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between transition-all duration-200 shadow-sm">
<div className="flex items-center gap-space-md">
<span className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold flex items-center justify-center">03</span>
<div className="flex flex-col">
<div className="flex items-center gap-2">
<span className="font-japanese-display text-japanese-display font-bold text-on-surface">慎重</span>
<span className="font-body-sm text-body-sm text-on-surface-variant font-medium">(しんちょう)</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface">Thận trọng, cẩn trọng trong công việc</span>
</div>
</div>
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">N3</span>
<span className="hidden sm:inline-flex items-center gap-1 text-primary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">priority_high</span>{"Khẩn cấp\n                  "}</span>
<button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
</div>
</div>
{/*  Card 4  */}
<div className="group p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between transition-all duration-200 shadow-sm">
<div className="flex items-center gap-space-md">
<span className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold flex items-center justify-center">04</span>
<div className="flex flex-col">
<div className="flex items-center gap-2">
<span className="font-japanese-display text-japanese-display font-bold text-on-surface">曖昧</span>
<span className="font-body-sm text-body-sm text-on-surface-variant font-medium">(あいまい)</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface">Ái muội, mơ hồ, không rõ ràng</span>
</div>
</div>
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">N3</span>
<span className="hidden sm:inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">schedule</span>{"Đúng hạn\n                  "}</span>
<button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
</div>
</div>
{/*  Card 5  */}
<div className="group p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between transition-all duration-200 shadow-sm">
<div className="flex items-center gap-space-md">
<span className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold flex items-center justify-center">05</span>
<div className="flex flex-col">
<div className="flex items-center gap-2">
<span className="font-japanese-display text-japanese-display font-bold text-on-surface">妥協</span>
<span className="font-body-sm text-body-sm text-on-surface-variant font-medium">(だきょう)</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface">Thỏa hiệp, nhượng bộ, dàn xếp</span>
</div>
</div>
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">N3</span>
<span className="hidden sm:inline-flex items-center gap-1 text-tertiary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">verified</span>{"Củng cố\n                  "}</span>
<button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
</div>
</div>
</div>
{/*  Footer note in Preview  */}
<div className="pt-2 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
<span className="">Còn 23 thẻ khác đang xếp theo chu kỳ ghi nhớ tiếp theo</span>
<button className="text-primary hover:underline font-semibold flex items-center gap-1">{"Xem toàn bộ hàng đợi\n                "}<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</button>
</div>
</div>
</div>
{/*  Right Column (4 cols): Collections, Modes & Haru AI Tip  */}
<div className="xl:col-span-4 flex flex-col gap-space-xl">
{/*  Card: Kho thẻ theo bộ sưu tập  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">folder_special</span>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Kho thẻ theo bộ sưu tập</h3>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">Lọc theo chủ đề</span>
</div>
<div className="flex flex-col gap-space-xs">
{/*  Item 1  */}
<div className="p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between cursor-pointer transition-colors">
<div className="flex items-center gap-space-sm">
<div className="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[20px]">psychology</span>
</div>
<div className="flex flex-col">
<span className="font-label-md text-label-md font-bold text-on-surface">N3 khó nhớ • Dễ nhầm</span>
<span className="font-body-sm text-[12px] text-on-surface-variant">14 thẻ cần ôn lại</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
</div>
{/*  Item 2  */}
<div className="p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between cursor-pointer transition-colors">
<div className="flex items-center gap-space-sm">
<div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-[20px]">business_center</span>
</div>
<div className="flex flex-col">
<span className="font-label-md text-label-md font-bold text-on-surface">Công việc & Văn phòng</span>
<span className="font-body-sm text-[12px] text-on-surface-variant">8 thẻ đến hạn</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
</div>
{/*  Item 3  */}
<div className="p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between cursor-pointer transition-colors">
<div className="flex items-center gap-space-sm">
<div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-[20px]">forum</span>
</div>
<div className="flex flex-col">
<span className="font-label-md text-label-md font-bold text-on-surface">Giao tiếp thường nhật</span>
<span className="font-body-sm text-[12px] text-on-surface-variant">6 thẻ củng cố</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
</div>
</div>
</div>
{/*  Card: Chế độ ôn tập linh hoạt  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">tune</span>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Chế độ ôn tập linh hoạt</h3>
</div>
<div className="flex flex-col gap-2">
{/*  Mode 1: Selected  */}
<label className="flex items-start gap-space-sm p-space-sm rounded-xl bg-secondary-container/20 cursor-pointer">
<input checked className="mt-1 accent-primary" name="review_mode" type="radio" />
<div className="flex flex-col">
<span className="font-label-md text-label-md font-bold text-primary">Flashcard lật mặt 2 chiều</span>
<span className="font-body-sm text-[12px] text-on-surface-variant">Nhìn Kanji đoán nghĩa & Ngược lại</span>
</div>
</label>
{/*  Mode 2  */}
<label className="flex items-start gap-space-sm p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
<input className="mt-1 accent-primary" name="review_mode" type="radio" />
<div className="flex flex-col">
<span className="font-label-md text-label-md font-bold text-on-surface">Trắc nghiệm phản xạ 4 đáp án</span>
<span className="font-body-sm text-[12px] text-on-surface-variant">Giới hạn 5 giây mỗi câu hỏi</span>
</div>
</label>
{/*  Mode 3  */}
<label className="flex items-start gap-space-sm p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
<input className="mt-1 accent-primary" name="review_mode" type="radio" />
<div className="flex flex-col">
<span className="font-label-md text-label-md font-bold text-on-surface">Gõ chữ Hán Kanji (Input Mode)</span>
<span className="font-body-sm text-[12px] text-on-surface-variant">Rèn luyện bộ nhớ cơ tay và âm Onyomi</span>
</div>
</label>
</div>
</div>
{/*  Mẹo ôn tập từ Haru AI  */}
<div className="bg-surface-container rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shadow-sm">
<span className="material-symbols-outlined text-[20px]">smart_toy</span>
</div>
<div className="flex flex-col">
<span className="font-title-sm text-title-sm font-bold text-on-surface">Cố vấn Haru AI</span>
<span className="font-label-sm text-label-sm text-primary font-medium">Khoa học thần kinh nhận thức</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-on-surface italic leading-relaxed pt-1">{"“Ôn tập vào buổi sáng 15 phút giúp tăng "}<strong className="text-primary font-bold">40% khả năng nhớ từ vựng</strong>{" so với nhồi nhét ban đêm. Hãy giữ nhịp tim thoải mái và không bỏ lỡ đợt ngắt quãng hôm nay nhé!”\n            "}</p>
<div className="pt-space-xs flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
<span className="">Chu kỳ tối ưu tiếp theo: 20:00 tối nay</span>
<span className="text-primary font-semibold cursor-pointer hover:underline">Hỏi thêm Haru</span>
</div>
</div>
</div>
</div>
</main>
</div>
</div>
</main>
<footer className="w-full bg-surface-container-low shadow-[0_-1px_16px_rgba(217,75,104,0.04)] mt-space-3xl"><div className="w-full px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-3xl"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter-desktop mb-space-2xl"><div className="lg:col-span-2 space-y-space-md"><div className="flex items-center gap-space-xs"><div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">filter_vintage</span></div><span className="font-headline-sm text-headline-sm font-bold text-primary">RikiPath Learning</span></div><p className="font-body-md text-body-md text-on-surface-variant max-w-md">Nền tảng học tiếng Nhật và luyện thi JLPT tinh tuyển theo triết lý tối giản Ma (間) cùng vẻ đẹp thanh thoát của hoa anh đào Nhật Bản.</p><div className="flex items-center gap-space-sm pt-space-xs"><span className="px-space-md py-space-xxs rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-primary">location_on</span>Tokyo • Shinjuku Campus</span><span className="px-space-md py-space-xxs rounded-full bg-secondary-fixed font-label-sm text-label-sm text-on-secondary-fixed">JLPT N5 → N1</span></div></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Chương trình đào tạo</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N5 - N4 Sơ cấp</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N3 Bứt phá</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N2 - N1 Chuyên sâu</li><li className="font-body-sm text-body-sm text-on-surface-variant">Luyện thi JLPT Siêu tốc</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Tài nguyên học tập</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Thư viện 2,136 Kanji Thường dụng</li><li className="font-body-sm text-body-sm text-on-surface-variant">Kho từ vựng Sakura Flashcard</li><li className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thử JLPT có chấm điểm</li><li className="font-body-sm text-body-sm text-on-surface-variant">Góc văn hóa & Đời sống Tokyo</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Hỗ trợ học viên</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Cố vấn học tập 1:1</li><li className="font-body-sm text-body-sm text-on-surface-variant">Cộng đồng học viên RikiPath</li><li className="font-body-sm text-body-sm text-on-surface-variant">Chính sách bảo hành đỗ JLPT</li><li className="font-body-sm text-body-sm text-on-surface-variant">Trợ giúp kỹ thuật & Tài khoản</li></ul></div></div><div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="material-symbols-outlined text-[16px] text-primary">local_florist</span><span className="">© 2024 RikiPath Learning Platform. Thiết kế hòa quyện nghệ thuật tối giản Nhật Bản.</span></div><div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant"><span className="hover:text-on-surface cursor-pointer">Điều khoản học tập</span><span className="hover:text-on-surface cursor-pointer">Bảo mật thông tin</span><span className="hover:text-on-surface cursor-pointer">Tiêu chuẩn JLPT</span></div></div></div></footer>


    </div>
  
</LearnerShell>
);
}
