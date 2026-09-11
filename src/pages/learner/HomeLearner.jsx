import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';

export default function HomeLearner() {
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
            const haruBtn = document.getElementById('listen-haru-btn');
            if (haruBtn) {
              let isPlaying = false;
              haruBtn.addEventListener('click', function() {
                isPlaying = !isPlaying;
                const icon = haruBtn.querySelector('.material-symbols-outlined');
                if (icon) {
                  icon.textContent = isPlaying ? 'graphic_eq' : 'volume_up';
                  icon.classList.toggle('text-primary', isPlaying);
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
    <LearnerShell pathname={pathname} breadcrumb="Trang chủ HV">
<div className="min-h-screen text-on-surface flex flex-row overflow-x-hidden antialiased" data-page="HomeLearner" data-shell-unified="1">


{/*  Subtle Japanese Wabi-sabi Canvas Texture  */}


<div className="fixed inset-0 pointer-events-none sakura-bg-pattern z-0"></div>


{/*  ================= DESKTOP LEFT SIDEBAR (260px) =================  */}





{/*  ================= MAIN VIEWPORT CONTAINER =================  */}


<div className="flex-1 flex flex-col min-w-0 z-10">
{/*  Top Header Bar (Sticky Desktop Bar)  */}

{/*  Main 12-Column Responsive Body Content (1440px constraint)  */}
<main className="flex-1 px-8 py-8 w-full max-w-[1440px] mx-auto">
<div className="grid grid-cols-12 gap-8 items-start">
{/*  ================= LEFT COLUMN (7 COLUMNS) =================  */}
<section className="col-span-12 lg:col-span-7 flex flex-col gap-6">
{/*  Greeting Header & Cohort Badge  */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#f2e5e8] shadow-[0_4px_20px_rgba(217,75,104,0.04)]">
<div className="flex flex-col gap-1">
<span className="text-[12px] font-bold text-secondary uppercase tracking-wider">CHÀO BUỔI SÁNG • 朝の学習</span>
<h1 className="text-[28px] xl:text-[32px] font-bold text-on-surface tracking-tight leading-tight">おはよう、Lan-san! 🌸</h1>
<p className="text-[13px] text-on-surface-variant">Sẵn sàng duy trì nhịp học hôm nay để sớm đạt mục tiêu JLPT nhé.</p>
</div>
<div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
<div className="inline-flex items-center gap-1.5 bg-[#FFF2F5] border border-[#FCD5DE] px-3.5 py-1.5 rounded-full shadow-sm">
<span className="material-symbols-outlined text-primary text-[18px]">verified</span>
<span className="text-[13px] text-on-surface font-bold">JLPT N3 Đột Phá</span>
<span className="text-[12px] text-outline">| Kỳ thi 07/2025</span>
</div>
<span className="text-[11px] text-secondary font-medium tracking-wide">✨ 14 日 hoàn thành đúng tiến độ</span>
</div>
</div>
{/*  AI Sensei Haru Speech Card  */}
<div className="relative overflow-hidden rounded-2xl bg-[#FFF9FA] border border-[#FBD9E2] p-5 shadow-[0_4px_24px_rgba(217,75,104,0.06)]">
<div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-secondary-fixed-dim/25 blur-2xl pointer-events-none"></div>
<div className="flex items-start gap-4 relative z-10">
<div className="relative shrink-0 w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center shadow-inner">
<span className="material-symbols-outlined text-primary text-[26px]">psychology</span>
<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-tertiary ring-2 ring-white"></span>
</div>
<div className="flex flex-col flex-1 min-w-0">
<div className="flex items-center justify-between mb-1.5">
<div className="flex items-center gap-2">
<span className="text-[15px] font-bold text-on-surface">Cố vấn Haru (春)</span>
<span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-full bg-secondary-fixed">AI Sensei</span>
</div>
<button aria-label="Nghe lời khuyên" className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-white transition-all active:scale-95" id="listen-haru-btn" title="Nghe gợi ý giọng nói">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
</div>
<p className="text-[14.5px] text-on-surface-variant leading-relaxed">{"Hôm nay bạn cần khắc phục 3 cặp trợ từ "}<span className="font-bold text-primary">に / で</span>{" và luyện phản xạ mẫu câu "}<span className="font-bold text-primary">わけにはいかない</span>{" nhé!\n                "}</p>
</div>
</div>
</div>
{/*  Section: Học nhanh hôm nay  */}
<div className="flex flex-col gap-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">task_alt</span>
<h2 className="text-[19px] font-bold text-on-surface tracking-tight">Học nhanh hôm nay</h2>
</div>
<span className="text-[13px] font-bold text-primary bg-secondary-fixed/50 px-2.5 py-0.5 rounded-full">1 / 3 hoàn tất</span>
</div>
{/*  Priority Featured Card: Grammar N3  */}
<div className="rounded-2xl bg-white border border-[#f2e5e8] p-6 shadow-[0_6px_24px_rgba(217,75,104,0.06)] flex flex-col gap-4 hover:border-primary-fixed transition-all">
<div className="flex items-start justify-between gap-3">
<div className="flex items-center gap-3">
<span className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-extrabold text-[13px]">文法</span>
<div className="flex flex-col">
<span className="text-[12px] font-semibold text-secondary uppercase tracking-wider">Ngữ pháp N3 • Trọng điểm</span>
<h3 className="text-[20px] font-bold text-on-surface">わけにはいかない</h3>
</div>
</div>
<div className="flex items-center gap-1.5 text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full text-[12px] font-semibold shrink-0">
<span className="material-symbols-outlined text-[16px]">schedule</span>
<span>18 phút</span>
</div>
</div>
<p className="text-[14px] text-on-surface-variant leading-relaxed bg-[#FAF7F5] p-3.5 rounded-xl border border-[#F2E5E8]/60">{"Không thể làm V vì lý do đạo đức, luân lý hoặc tâm lý xã hội không cho phép.\n              "}</p>
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
<div className="flex items-center gap-3">
<div className="w-36 h-2 rounded-full bg-surface-container-high overflow-hidden">
<div className="h-full bg-primary rounded-full w-2/5"></div>
</div>
<span className="text-[12px] font-semibold text-outline">Đang học 40%</span>
</div>
<button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-[13.5px] font-bold shadow-[0_4px_16px_rgba(171,40,72,0.3)] hover:bg-primary-container active:scale-95 transition-all">
<span>Tiếp tục học</span>
<span className="material-symbols-outlined text-[18px]">play_arrow</span>
</button>
</div>
</div>
{/*  Two Companion Tasks Side-by-Side  */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{/*  Task 1: Flashcard SRS  */}
<div className="rounded-2xl bg-white border border-[#f2e5e8] p-5 shadow-[0_4px_18px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-primary-fixed transition-all group">
<div className="flex items-center gap-3.5 min-w-0">
<div className="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-secondary text-[22px]">style</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-[14px] font-bold text-on-surface truncate group-hover:text-primary transition-colors">Ôn tập Flashcard SRS</span>
<span className="text-[12px] text-on-surface-variant truncate">{"24 từ vựng & Kanji đến hạn"}</span>
</div>
</div>
<button aria-label="Bắt đầu ôn flashcard" className="w-9 h-9 rounded-full bg-surface-container-low text-primary flex items-center justify-center shrink-0 hover:bg-primary hover:text-white transition-all">
<span className="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
{/*  Task 2: AI Writing Challenge  */}
<div className="rounded-2xl bg-white border border-[#f2e5e8] p-5 shadow-[0_4px_18px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-primary-fixed transition-all group">
<div className="flex items-center gap-3.5 min-w-0">
<div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-primary text-[22px]">auto_draw_solid</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-[14px] font-bold text-on-surface truncate group-hover:text-primary transition-colors">Luyện viết câu AI</span>
<span className="text-[12px] text-on-surface-variant truncate">Thử thách 1 câu công sở Tokyo</span>
</div>
</div>
<span className="text-[11px] font-bold text-tertiary-container bg-tertiary-fixed/70 px-2.5 py-1 rounded-full shrink-0">+50 EXP</span>
</div>
</div>
</div>
{/*  Cultural Philosophy Banner (Japanese Aesthetics & Ma Philosophy)  */}
<div className="relative overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(217,75,104,0.12)] border border-[#f2e5e8]">
<div className="bg-cover bg-center w-full h-44 sm:h-48 relative flex items-end p-6" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBB45j3r-el4sv1Hnk7cEebpHXrelVu7PVtDGdAXGqR3QjA8RBXQU132TKbrJVk5Wy597BJj8-OAuECg1nHsm4_VaRal7eZCXvjsHWtw2eWRZaK99Tb4Oril2BiMs-KTAiBQMvjTShkA9fRXNvC-PminAvnlUshV9UgRaDRfCZnhQdUtyALT02-KEVXlTOTPffOy1EzC8SFPcTAj3XtDYID9heSvGsOBJWv7Tp5Di7GnlhwdL1mam4p')" }}>
<div className="absolute inset-0 bg-gradient-to-t from-[#1f1a1d] via-[#1f1a1d]/65 to-transparent"></div>
<div className="relative z-10 flex flex-col text-white max-w-xl">
<div className="flex items-center gap-2 mb-1.5">
<span className="text-[13px] uppercase tracking-widest font-bold text-primary-fixed">一期一会 • NHẤT KỲ NHẤT HỘI</span>
</div>
<p className="text-[13.5px] text-white/90 leading-relaxed font-normal">{"Mỗi lần mở cuốn sách là một cơ duyên duy nhất trong đời. Giữ tâm tĩnh lặng (間 – Ma) để đón nhận tri thức thuần khiết.\n                "}</p>
</div>
</div>
</div>
</section>
{/*  ================= RIGHT COLUMN (5 COLUMNS) =================  */}
<section className="col-span-12 lg:col-span-5 flex flex-col gap-6">
{/*  Sakura Streak & Completion Ring Card  */}
<div className="rounded-2xl bg-white border border-[#f2e5e8] p-6 shadow-[0_6px_24px_rgba(217,75,104,0.05)] flex flex-col gap-5">
<div className="flex items-center justify-between border-b border-[#f2e5e8]/80 pb-4">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center">
<span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col">
<h3 className="text-[16px] font-bold text-on-surface">Chuỗi Hoa Nở Rộ</h3>
<span className="text-[11px] text-outline font-medium">Báo cáo độ chuyên cần tuần</span>
</div>
</div>
<span className="text-[12px] font-bold text-tertiary flex items-center gap-1 bg-tertiary-fixed/40 px-2 py-0.5 rounded-full">
<span className="material-symbols-outlined text-[14px]">arrow_upward</span>{" +18%\n              "}</span>
</div>
<div className="flex items-center justify-between gap-4">
<div className="flex flex-col gap-1.5 flex-1 min-w-0">
<p className="text-[13.5px] text-on-surface leading-snug">
<span className="font-bold text-primary">14 ngày</span>{" chuyên cần liên tiếp. Vườn hoa trí thức đang khoe sắc rực rỡ!\n                "}</p>
<span className="text-[12px] text-on-surface-variant">+18% so với tuần trước</span>
</div>
{/*  Radial Bloom Ring Gauge  */}
<div className="relative shrink-0 w-24 h-24 flex items-center justify-center">
<svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
<circle cx="48" cy="48" fill="transparent" r="38" stroke="#FEE8EE" strokeWidth="7"></circle>
<circle cx="48" cy="48" fill="transparent" r="38" stroke="#ab2848" strokeDasharray="238.76" strokeDashoffset="57.3" strokeLinecap="round" strokeWidth="7"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
<span className="text-[20px] text-primary leading-none font-extrabold">76<span className="text-[11px] font-normal">%</span></span>
<span className="text-[10.5px] text-on-surface-variant font-medium mt-0.5">14 ngày</span>
</div>
</div>
</div>
{/*  Weekly Bloom Calendar Row  */}
<div className="pt-2 border-t border-[#f2e5e8]/60 flex flex-col gap-2">
<span className="text-[11px] font-bold text-outline uppercase tracking-wider">Lịch hoa nở 7 ngày qua</span>
<div className="grid grid-cols-7 gap-1.5 text-center">
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-secondary-fixed/50">
<span className="text-[10px] font-semibold text-secondary">T2</span>
<span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-secondary-fixed/50">
<span className="text-[10px] font-semibold text-secondary">T3</span>
<span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-secondary-fixed/50">
<span className="text-[10px] font-semibold text-secondary">T4</span>
<span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-secondary-fixed/50">
<span className="text-[10px] font-semibold text-secondary">T5</span>
<span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-secondary-fixed/50">
<span className="text-[10px] font-semibold text-secondary">T6</span>
<span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-secondary-fixed/50">
<span className="text-[10px] font-semibold text-secondary">T7</span>
<span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_florist</span>
</div>
<div className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-primary text-white shadow-sm">
<span className="text-[10px] font-bold text-white/90">CN</span>
<span className="material-symbols-outlined text-[15px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
</div>
</div>
</div>
</div>
{/*  Section: Công cụ học tập (Interactive Bento Grid 2x2)  */}
<div className="rounded-2xl bg-white border border-[#f2e5e8] p-6 shadow-[0_6px_24px_rgba(217,75,104,0.05)] flex flex-col gap-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">category</span>
<h3 className="text-[17px] font-bold text-on-surface tracking-tight">Công cụ học tập</h3>
</div>
<button className="text-[12.5px] font-bold text-secondary hover:text-primary transition-colors">Tất cả</button>
</div>
<div className="grid grid-cols-2 gap-3.5">
{/*  Tool 1: Mini Mock Test  */}
<div className="group rounded-xl p-4 bg-[#FFF6F8] border border-[#FADCE4] flex flex-col gap-2.5 hover:shadow-md hover:border-primary-fixed transition-all cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-primary text-[20px]">timer</span>
</div>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">Thi thử mini</span>
<span className="text-[12px] text-on-surface-variant">JLPT N3 rút gọn 20 câu</span>
</div>
</div>
{/*  Tool 2: Sensei 1-on-1  */}
<div className="group rounded-xl p-4 bg-[#FBF4F7] border border-[#F0DFE6] flex flex-col gap-2.5 hover:shadow-md hover:border-primary-fixed transition-all cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-secondary text-[20px]">video_chat</span>
</div>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">Đặt lịch Sensei</span>
<span className="text-[12px] text-on-surface-variant">{"Phỏng vấn & hội thoại 1-1"}</span>
</div>
</div>
{/*  Tool 3: Kanji Handbook  */}
<div className="group rounded-xl p-4 bg-[#FAF5F9] border border-[#EFE2EC] flex flex-col gap-2.5 hover:shadow-md hover:border-primary-fixed transition-all cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-secondary text-[20px]">menu_book</span>
</div>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">Sổ tay Kanji</span>
<span className="text-[12px] text-on-surface-variant">650 Hán tự N3 cốt lõi</span>
</div>
</div>
{/*  Tool 4: Choukai Audio Library  */}
<div className="group rounded-xl p-4 bg-[#FFF2F6] border border-[#FAD7E2] flex flex-col gap-2.5 hover:shadow-md hover:border-primary-fixed transition-all cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-primary text-[20px]">headphones</span>
</div>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">Audio Choukai</span>
<span className="text-[12px] text-on-surface-variant">Luyện nghe shadow tốc độ</span>
</div>
</div>
</div>
</div>
{/*  Quick Tip Card  */}
<div className="rounded-2xl p-4 bg-gradient-to-r from-[#FFF5F8] to-[#FFF9F6] border border-[#FADFE6] flex items-center gap-3">
<span className="material-symbols-outlined text-primary text-[24px]">tips_and_updates</span>
<p className="text-[12.5px] text-on-surface-variant">
<strong className="text-on-surface">Mẹo hôm nay:</strong>{" Nghe lại đoạn hội thoại bóng râm 2 lần trước khi ngủ để tăng độ ghi nhớ ngữ điệu tự nhiên.\n            "}</p>
</div>
</section>
</div>
</main>
</div>


{/*  Interactive script for voice listen toggle  */}





    </div>
  
</LearnerShell>
);
}
