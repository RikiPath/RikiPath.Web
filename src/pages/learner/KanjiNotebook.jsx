import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function KanjiNotebook() {
  const { pathname } = useLocation();
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') { try { fn(); } catch (err) { console.warn(err); } return; }
      return orig(type, fn, opts);
    };
    try {
      (function() {
      // Stroke order play simulation
      const playBtn = document.getElementById('play-pause-btn');
      const replayBtn = document.getElementById('grid-replay-btn');
      const kanjiStage = document.getElementById('kanji-stage-display');
      let isPlaying = false;

      if (playBtn && kanjiStage) {
        playBtn.addEventListener('click', function() {
          isPlaying = !isPlaying;
          if (isPlaying) {
            playBtn.innerHTML = '<span className="material-symbols-outlined text-[18px]">pause</span><span>Tạm dừng</span>';
            kanjiStage.classList.add('scale-105', 'opacity-70');
            setTimeout(() => {
              kanjiStage.classList.remove('scale-105', 'opacity-70');
            }, 800);
          } else {
            playBtn.innerHTML = '<span className="material-symbols-outlined text-[18px]">play_arrow</span><span>Phát tự động</span>';
          }
        });
      }

      if (replayBtn && kanjiStage) {
        replayBtn.addEventListener('click', function() {
          kanjiStage.classList.add('opacity-0', 'scale-90');
          setTimeout(() => {
            kanjiStage.classList.remove('opacity-0', 'scale-90');
          }, 350);
        });
      }

      // AI sentence score trigger
      const aiBtn = document.getElementById('submit-ai-review');
      if (aiBtn) {
        aiBtn.addEventListener('click', function() {
          const originalText = aiBtn.innerHTML;
          aiBtn.innerHTML = '<span className="material-symbols-outlined text-[15px] animate-spin">refresh</span> Đang phân tích...';
          setTimeout(() => {
            aiBtn.innerHTML = '<span className="material-symbols-outlined text-[15px]">check</span> Hoàn thành!';
            setTimeout(() => {
              aiBtn.innerHTML = originalText;
            }, 1500);
          }, 800);
        });
      }
    })();
    } catch (err) { console.warn('Stitch script:', err); }
    document.addEventListener = orig;
  }, []);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Sổ Kanji">
<div className="bg-background font-body-md text-on-surface antialiased min-h-screen" data-page="KanjiNotebook" data-shell-unified="1">

<main className="w-full pt-0 bg-background"><div className="flex flex-col w-full">
{/*  Subtle decorative ambient sakura glow  */}
<div className="relative w-full overflow-hidden bg-background">
<div className="absolute -top-32 right-12 w-96 h-96 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none"></div>
<div className="absolute top-96 left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none"></div>
{/*  Main Workspace Max Container (1440px target, 12-col grid harmony)  */}
<div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl space-y-space-xl">
{/*  Top Sub-Header & Controls Panel  */}
<section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-lg">
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
{/*  Title & Japanese Subtitle  */}
<div className="space-y-space-xxs">
<div className="flex items-center gap-space-xs">
<span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold tracking-wider uppercase">
                Kanji Practice Studio • 漢字筆順ノート
              </span>
<span className="flex items-center gap-1 text-tertiary font-label-sm text-label-sm">
<span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                SRS Chuẩn SM-2 Đồng Bộ
              </span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface">
              Sổ tay Luyện tập Hán tự & Bút thuận
            </h1>
<p className="font-body-sm text-body-sm text-on-surface-variant">
              Khắc sâu từng nét bút chữ Hán theo triết lý Ma (間), hòa quyện nhịp học lặp lại ngắt quãng và nhận xét thông minh từ AI Sensei.
            </p>
</div>
{/*  Streak & SRS Momentum Summary Pill  */}
<div className="flex items-center gap-space-sm flex-wrap bg-surface-container-low px-space-md py-space-sm rounded-xl">
<div className="flex items-center gap-space-xs">
<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[20px]">local_fire_department</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant">Chuỗi liên tục</span>
<span className="font-title-sm text-title-sm text-primary font-bold">14 Ngày nở hoa</span>
</div>
</div>
<div className="h-6 w-px bg-outline-variant/40"></div>
<div className="flex items-center gap-space-xs">
<div className="w-9 h-9 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-[20px]">psychology</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant">Nhớ sâu (SRS)</span>
<span className="font-title-sm text-title-sm text-on-surface font-bold">450 Từ vựng</span>
</div>
</div>
<div className="h-6 w-px bg-outline-variant/40"></div>
<div className="flex items-center gap-space-xs">
<div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
<span className="material-symbols-outlined text-[20px]">schedule</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant">Hôm nay</span>
<span className="font-title-sm text-title-sm text-primary font-bold">24 Mục cần ôn</span>
</div>
</div>
</div>
</div>
{/*  Filter, JLPT Selector & Studio Tabs Bar  */}
<div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md pt-space-xs">
{/*  Studio Mode Tabs  */}
<div className="flex items-center gap-space-xs p-1 bg-surface-container rounded-xl">
<button className="px-space-md py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">style</span>
              Flashcard SRS
            </button>
<button className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">draw</span>
              Hán tự Bút thuận (Stroke Order)
            </button>
<button className="px-space-md py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Viết câu AI Studio
            </button>
</div>
{/*  JLPT Level Pills & Quick Search  */}
<div className="flex flex-wrap items-center gap-space-sm">
<div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
<button className="px-3 py-1 text-label-sm font-label-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">N5</button>
<button className="px-3 py-1 text-label-sm font-label-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">N4</button>
<button className="px-3.5 py-1 text-label-sm font-label-sm rounded-lg bg-primary text-on-primary font-bold shadow-sm">N3</button>
<button className="px-3 py-1 text-label-sm font-label-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">N2</button>
<button className="px-3 py-1 text-label-sm font-label-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">N1</button>
</div>
<div className="relative min-w-[240px] flex-1 sm:flex-none">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
<input className="w-full pl-9 pr-4 py-2 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/60" placeholder="Tìm Kanji, âm Hán Việt, nghĩa..." type="text" value="咲 (Tiếu - nở hoa)" />
</div>
<button className="h-10 px-space-md rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high flex items-center gap-1.5 text-label-md font-label-md transition-colors">
<span className="material-symbols-outlined text-[18px]">tune</span>
              Bộ lọc
            </button>
</div>
</div>
</section>
{/*  Main 12-Column Grid Workspace  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
{/*  ================= LEFT COLUMN: 7 COLUMNS (Interactive Stroke Order Studio) =================  */}
<section className="lg:col-span-7 flex flex-col space-y-space-lg">
{/*  Master Kanji Interactive Card  */}
<div className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-sm space-y-space-lg relative overflow-hidden">
<div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-secondary-container/20 to-transparent rounded-bl-full pointer-events-none"></div>
{/*  Top Metabar of Active Kanji  */}
<div className="flex items-start justify-between gap-space-md">
<div className="flex items-center gap-space-sm">
<span className="px-space-md py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-bold">
                  JLPT N3 • Bài 18
                </span>
<span className="px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
<span className="material-symbols-outlined text-[15px] text-primary">edit</span>
                  9 Nét bút
                </span>
<span className="px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  Bộ Khẩu 口 (#30)
                </span>
</div>
{/*  Pronounce & Bookmark Action Tools  */}
<div className="flex items-center gap-space-xs">
<button aria-label="Phát âm từ vựng" className="w-10 h-10 rounded-xl bg-surface-container text-primary hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center shadow-sm active:scale-95" id="audio-speaker-btn" onClick="const icon = this.querySelector('span'); icon.textContent = 'volume_up'; setTimeout(() =&gt; { icon.textContent = 'volume_up'; }, 1000);">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
<button aria-label="Lưu vào sổ tay cá nhân" className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant hover:text-primary hover:bg-secondary-container/40 transition-all flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">bookmark</span>
</button>
<button aria-label="Chia sẻ hán tự" className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">share</span>
</button>
</div>
</div>
{/*  Hero Kanji Display & Stroke Visualizer Canvas  */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-space-lg items-center">
{/*  Left Grid Paper Preview (Ô kẻ chữ Điền / Mễ truyền thống)  */}
<div className="md:col-span-6 flex flex-col items-center justify-center">
<div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-surface-container-low p-3 flex items-center justify-center shadow-inner overflow-hidden">
{/*  Traditional Kanji Grid Guidelines SVG  */}
<svg className="absolute inset-0 w-full h-full text-outline-variant/30" fill="none" stroke="currentColor" viewBox="0 0 288 288">
{/*  Outer frame  */}
<rect height="264" rx="8" stroke-dasharray="4 4" strokeWidth="1.5" width="264" x="12" y="12"></rect>
{/*  Center vertical line  */}
<line stroke-dasharray="3 3" strokeWidth="1" x1="144" x2="144" y1="12" y2="276"></line>
{/*  Center horizontal line  */}
<line stroke-dasharray="3 3" strokeWidth="1" x1="12" x2="276" y1="144" y2="144"></line>
{/*  Diagonal lines for aesthetic Ma balance  */}
<line stroke-dasharray="2 4" stroke-opacity="0.6" strokeWidth="0.75" x1="12" x2="276" y1="12" y2="276"></line>
<line stroke-dasharray="2 4" stroke-opacity="0.6" strokeWidth="0.75" x1="276" x2="12" y1="12" y2="276"></line>
</svg>
{/*  Animated / Rendered Kanji Presentation  */}
<div className="relative z-10 flex flex-col items-center justify-center select-none">
{/*  Ghost watermarks of prior strokes  */}
<span className="font-headline-xl text-[128px] sm:text-[144px] leading-none text-primary font-medium tracking-tight drop-shadow-sm transition-transform duration-300" id="kanji-stage-display">
                      咲
                    </span>
<span className="font-label-sm text-label-sm text-on-surface-variant/70 mt-1">
                      Nét thứ 5 / 9 • Sổ dọc trái
                    </span>
</div>
{/*  Stroke Order Watermark Tag  */}
<span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[10px] tracking-wider uppercase">
                    Ô Chữ Mễ (米字格)
                  </span>
{/*  Interactive Canvas Replay Badge  */}
<button className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface-container-lowest/80 text-on-surface-variant hover:text-primary transition-colors shadow-sm" id="grid-replay-btn" title="Vẽ lại từ nét đầu">
<span className="material-symbols-outlined text-[18px]">replay</span>
</button>
</div>
</div>
{/*  Right: Kanji Linguistic Decomposition  */}
<div className="md:col-span-6 space-y-space-md">
<div>
<div className="flex items-baseline gap-space-xs">
<h2 className="font-headline-lg text-headline-lg text-primary font-bold">TIẾU</h2>
<span className="font-title-md text-title-md text-on-surface font-semibold">• さく (saku)</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    Nghĩa gốc: <span className="font-semibold text-on-surface">Hoa nở, hé nụ; mỉm cười rạng rỡ</span>.
                  </p>
</div>
{/*  On/Kun Reading Block  */}
<div className="grid grid-cols-2 gap-space-xs">
<div className="p-space-sm bg-surface-container-low rounded-xl">
<span className="font-label-sm text-label-sm text-on-surface-variant block">Âm On (音読み)</span>
<span className="font-title-sm text-title-sm text-on-surface font-bold">ショウ (shō)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">Hiếm gặp trong từ ghép</span>
</div>
<div className="p-space-sm bg-surface-container-low rounded-xl">
<span className="font-label-sm text-label-sm text-on-surface-variant block">Âm Kun (訓読み)</span>
<span className="font-title-sm text-title-sm text-primary font-bold">さ.く (saku)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">Thông dụng: 咲きます</span>
</div>
</div>
{/*  Radical Breakdown (Chiết tự)  */}
<div className="p-space-sm bg-surface-container-low rounded-xl space-y-space-xxs">
<span className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">
                    Phân tách chiết tự (Radicals)
                  </span>
<div className="flex items-center gap-space-sm">
<div className="flex items-center gap-2">
<span className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center font-bold text-primary shadow-sm text-title-sm">口</span>
<span className="font-body-sm text-body-sm text-on-surface">Bộ Khẩu (miệng mở to cười)</span>
</div>
<span className="text-on-surface-variant font-bold">+</span>
<div className="flex items-center gap-2">
<span className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center font-bold text-primary shadow-sm text-title-sm">关</span>
<span className="font-body-sm text-body-sm text-on-surface">Quan/Tiếu (tiếng cười giòn giã)</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
<span className="italic font-medium text-secondary">Mẹo nhớ:</span> Dưới ánh nắng xuân, miệng (<span className="font-bold">口</span>) khẽ reo vui ngắm muôn hoa đua nhau nở rộ.
                  </p>
</div>
</div>
</div>
{/*  Stroke Order Animation Controller & Stepper  */}
<div className="bg-surface-container-low p-space-md rounded-xl space-y-space-sm">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-primary">linear_scale</span>
                  Tiến trình 9 nét bút thuận (Stroke-by-Stroke)
                </span>
<span className="font-label-sm text-label-sm text-primary font-bold" id="stroke-speed-indicator">
                  Tốc độ: 1.0x • Mượt mà
                </span>
</div>
{/*  Interactive Step-by-Step Mini Cells  */}
<div className="grid grid-cols-9 gap-1.5 sm:gap-2">
{/*  Cell 1  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-primary text-on-primary shadow-sm hover:scale-105 transition-all group">
<span className="font-label-sm text-[11px] font-bold">Nét 1</span>
<span className="text-title-sm font-semibold opacity-90">丨</span>
</button>
{/*  Cell 2  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-primary text-on-primary shadow-sm hover:scale-105 transition-all group">
<span className="font-label-sm text-[11px] font-bold">Nét 2</span>
<span className="text-title-sm font-semibold opacity-90">𠃍</span>
</button>
{/*  Cell 3  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-primary text-on-primary shadow-sm hover:scale-105 transition-all group">
<span className="font-label-sm text-[11px] font-bold">Nét 3</span>
<span className="text-title-sm font-semibold opacity-90">一</span>
</button>
{/*  Cell 4  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-primary text-on-primary shadow-sm hover:scale-105 transition-all group">
<span className="font-label-sm text-[11px] font-bold">Nét 4</span>
<span className="text-title-sm font-semibold opacity-90">丿</span>
</button>
{/*  Cell 5 (Active Current)  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-secondary-container text-on-secondary-container shadow-md ring-2 ring-primary hover:scale-105 transition-all">
<span className="font-label-sm text-[11px] font-bold">Nét 5</span>
<span className="text-title-sm font-semibold">丶</span>
</button>
{/*  Cell 6  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors">
<span className="font-label-sm text-[11px] text-on-surface-variant font-medium">Nét 6</span>
<span className="text-title-sm font-semibold opacity-60">一</span>
</button>
{/*  Cell 7  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors">
<span className="font-label-sm text-[11px] text-on-surface-variant font-medium">Nét 7</span>
<span className="text-title-sm font-semibold opacity-60">一</span>
</button>
{/*  Cell 8  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors">
<span className="font-label-sm text-[11px] text-on-surface-variant font-medium">Nét 8</span>
<span className="text-title-sm font-semibold opacity-60">丿</span>
</button>
{/*  Cell 9  */}
<button className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors">
<span className="font-label-sm text-[11px] text-on-surface-variant font-medium">Nét 9</span>
<span className="text-title-sm font-semibold opacity-60">乀</span>
</button>
</div>
{/*  Controller Controls Bar  */}
<div className="flex items-center justify-between pt-2">
<div className="flex items-center gap-2">
<button className="p-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center" title="Nét trước">
<span className="material-symbols-outlined text-[20px]">skip_previous</span>
</button>
<button className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:shadow-md transition-all flex items-center gap-1.5" id="play-pause-btn">
<span className="material-symbols-outlined text-[18px]">play_arrow</span>
<span>Phát tự động</span>
</button>
<button className="p-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center" title="Nét kế tiếp">
<span className="material-symbols-outlined text-[20px]">skip_next</span>
</button>
</div>
{/*  Speed Selector  */}
<div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
<button className="px-2.5 py-1 text-label-sm font-label-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high">0.5x</button>
<button className="px-2.5 py-1 text-label-sm font-label-sm rounded-lg bg-surface-container-lowest text-primary font-bold shadow-sm">1.0x</button>
<button className="px-2.5 py-1 text-label-sm font-label-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high">1.5x</button>
</div>
</div>
</div>
{/*  Compound Vocabulary Cards (Từ ghép tiêu biểu)  */}
<div className="space-y-space-sm pt-space-xs">
<div className="flex items-center justify-between">
<h3 className="font-title-sm text-title-sm text-on-surface font-bold flex items-center gap-2">
<span className="material-symbols-outlined text-[18px] text-secondary">menu_book</span>
                  Từ vựng ứng dụng thực tế (JLPT N3)
                </h3>
<span className="font-label-sm text-label-sm text-on-surface-variant">3 cụm phổ biến nhất</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
{/*  Word 1  */}
<div className="p-space-sm rounded-xl bg-surface-container-low hover:bg-secondary-container/25 transition-all cursor-pointer group">
<div className="flex items-center justify-between mb-1">
<span className="font-title-sm text-title-sm text-primary font-bold group-hover:translate-x-0.5 transition-transform">咲き乱れる</span>
<span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">volume_down</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant block">さきみだれる (saki midareru)</span>
<p className="font-body-sm text-body-sm text-on-surface mt-1">Nở rộ khắp nơi, hoa nở xum xuê</p>
</div>
{/*  Word 2  */}
<div className="p-space-sm rounded-xl bg-surface-container-low hover:bg-secondary-container/25 transition-all cursor-pointer group">
<div className="flex items-center justify-between mb-1">
<span className="font-title-sm text-title-sm text-primary font-bold group-hover:translate-x-0.5 transition-transform">返り咲き</span>
<span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">volume_down</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant block">かえりざき (kaerizaki)</span>
<p className="font-body-sm text-body-sm text-on-surface mt-1">Hoa nở trái mùa, tái xuất thành công</p>
</div>
{/*  Word 3  */}
<div className="p-space-sm rounded-xl bg-surface-container-low hover:bg-secondary-container/25 transition-all cursor-pointer group">
<div className="flex items-center justify-between mb-1">
<span className="font-title-sm text-title-sm text-primary font-bold group-hover:translate-x-0.5 transition-transform">狂い咲き</span>
<span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">volume_down</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant block">くるいざき (kuruizaki)</span>
<p className="font-body-sm text-body-sm text-on-surface mt-1">Nở bất thường do thời tiết ấm sớm</p>
</div>
</div>
</div>
{/*  4-Level SRS Mastery Feedback Bar  */}
<div className="pt-space-sm space-y-space-xs">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                  Đánh giá mức độ ghi nhớ chữ '咲' để thuật toán tính chu kỳ ôn tiếp theo:
                </span>
<span className="font-label-sm text-label-sm text-tertiary font-bold">Ôn lại sau 3 ngày</span>
</div>
<div className="grid grid-cols-4 gap-space-sm">
{/*  Again  */}
<button className="py-2.5 px-3 rounded-xl bg-error-container/40 hover:bg-error-container text-on-error-container font-label-md text-label-md transition-all flex flex-col items-center gap-0.5 shadow-sm active:scale-98">
<span className="font-bold">Học lại</span>
<span className="font-label-sm text-[11px] opacity-80">&lt; 10 phút</span>
</button>
{/*  Hard  */}
<button className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-label-md text-label-md transition-all flex flex-col items-center gap-0.5 shadow-sm active:scale-98">
<span className="font-bold">Khó</span>
<span className="font-label-sm text-[11px] opacity-80">1 ngày</span>
</button>
{/*  Good  */}
<button className="py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-label-md text-label-md transition-all flex flex-col items-center gap-0.5 shadow-sm active:scale-98">
<span className="font-bold">Tốt</span>
<span className="font-label-sm text-[11px] opacity-80">3 ngày</span>
</button>
{/*  Easy  */}
<button className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-label-md text-label-md transition-all flex flex-col items-center gap-0.5 shadow-sm active:scale-98">
<span className="font-bold">Dễ</span>
<span className="font-label-sm text-[11px] opacity-80">7 ngày</span>
</button>
</div>
</div>
</div>
{/*  Bottom Action Buttons: Free Canvas Practice & PDF Export  */}
<div className="flex flex-col sm:flex-row items-center justify-between gap-space-md p-space-md rounded-2xl bg-surface-container-low">
<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[22px]">brush</span>
</div>
<div className="flex flex-col">
<span className="font-title-sm text-title-sm text-on-surface font-bold">Luyện viết tự do trên Canvas</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Chế độ nhận diện nét chữ AI & góc phản hồi độ chính xác</span>
</div>
</div>
<div className="flex items-center gap-space-xs w-full sm:w-auto">
<button className="flex-1 sm:flex-none px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 shadow-sm">
<span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Xuất PDF Sổ tay
              </button>
<button className="flex-1 sm:flex-none px-space-md py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:shadow-md transition-all flex items-center justify-center gap-1.5 shadow-sm">
<span className="material-symbols-outlined text-[18px]">gesture</span>
                Mở Canvas Vẽ
              </button>
</div>
</div>
</section>
{/*  ================= RIGHT COLUMN: 5 COLUMNS (AI Writing Studio & Flashcard Deck Queue) =================  */}

</div>
</div>
</div>
{/*  Interactive JavaScript Micro-actions  */}
</div></main>
<footer className="w-full bg-surface-container-low shadow-[0_-1px_16px_rgba(217,75,104,0.04)] mt-space-3xl"><div className="w-full px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-3xl"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter-desktop mb-space-2xl"><div className="lg:col-span-2 space-y-space-md"><div className="flex items-center gap-space-xs"><div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">filter_vintage</span></div><span className="font-headline-sm text-headline-sm font-bold text-primary">RikiPath Learning</span></div><p className="font-body-md text-body-md text-on-surface-variant max-w-md">Nền tảng học tiếng Nhật và luyện thi JLPT tinh tuyển theo triết lý tối giản Ma (間) cùng vẻ đẹp thanh thoát của hoa anh đào Nhật Bản.</p><div className="flex items-center gap-space-sm pt-space-xs"><span className="px-space-md py-space-xxs rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-primary">location_on</span>Tokyo • Shinjuku Campus</span><span className="px-space-md py-space-xxs rounded-full bg-secondary-fixed font-label-sm text-label-sm text-on-secondary-fixed">JLPT N5 → N1</span></div></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Chương trình đào tạo</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N5 - N4 Sơ cấp</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N3 Bứt phá</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N2 - N1 Chuyên sâu</li><li className="font-body-sm text-body-sm text-on-surface-variant">Luyện thi JLPT Siêu tốc</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Tài nguyên học tập</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Thư viện 2,136 Kanji Thường dụng</li><li className="font-body-sm text-body-sm text-on-surface-variant">Kho từ vựng Sakura Flashcard</li><li className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thử JLPT có chấm điểm</li><li className="font-body-sm text-body-sm text-on-surface-variant">Góc văn hóa & Đời sống Tokyo</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Hỗ trợ học viên</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Cố vấn học tập 1:1</li><li className="font-body-sm text-body-sm text-on-surface-variant">Cộng đồng học viên RikiPath</li><li className="font-body-sm text-body-sm text-on-surface-variant">Chính sách bảo hành đỗ JLPT</li><li className="font-body-sm text-body-sm text-on-surface-variant">Trợ giúp kỹ thuật & Tài khoản</li></ul></div></div><div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="material-symbols-outlined text-[16px] text-primary">local_florist</span><span>© 2024 RikiPath Learning Platform. Thiết kế hòa quyện nghệ thuật tối giản Nhật Bản.</span></div><div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant"><span className="hover:text-on-surface cursor-pointer">Điều khoản học tập</span><span className="hover:text-on-surface cursor-pointer">Bảo mật thông tin</span><span className="hover:text-on-surface cursor-pointer">Tiêu chuẩn JLPT</span></div></div></div></footer>
    </div>
  
</LearnerShell>
);
}
