import { useEffect } from 'react';
import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';

export default function ExamN3() {
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
      // Live Countdown Timer logic
          (function initTimer() {
            let totalSeconds = 42 * 60 + 10;
            const timerElement = document.getElementById('exam-timer');
            if (!timerElement) return;
      
            const countdown = setInterval(() => {
              if (totalSeconds <= 0) {
                clearInterval(countdown);
                timerElement.innerText = "00:00";
                return;
              }
              totalSeconds--;
              const mins = Math.floor(totalSeconds / 60);
              const secs = totalSeconds % 60;
              timerElement.innerText = 
                (mins < 10 ? "0" + mins : mins) + ":" + 
                (secs < 10 ? "0" + secs : secs);
            }, 1000);
          })();
      
          // Font Sizing Toggle for Dokkai
          const passage = document.getElementById('passage-text');
          const increaseBtn = document.getElementById('font-increase');
          const decreaseBtn = document.getElementById('font-decrease');
          let currentFontSize = 17;
      
          if (passage && increaseBtn && decreaseBtn) {
            increaseBtn.addEventListener('click', () => {
              if (currentFontSize < 22) {
                currentFontSize += 1.5;
                passage.style.fontSize = currentFontSize + 'px';
                passage.style.lineHeight = '2.2';
              }
            });
      
            decreaseBtn.addEventListener('click', () => {
              if (currentFontSize > 14) {
                currentFontSize -= 1.5;
                passage.style.fontSize = currentFontSize + 'px';
                passage.style.lineHeight = '2.0';
              }
            });
          }
      
          // Flag Question Button Toggle
          const flagBtn = document.getElementById('flag-btn');
          if (flagBtn) {
            let isFlagged = false;
            flagBtn.addEventListener('click', () => {
              isFlagged = !isFlagged;
              if (isFlagged) {
                flagBtn.classList.add('bg-amber-100', 'text-amber-900');
                flagBtn.innerHTML = `<span className="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">bookmark</span><span>Đã đánh dấu</span>`;
              } else {
                flagBtn.classList.remove('bg-amber-100', 'text-amber-900');
                flagBtn.innerHTML = `<span className="material-symbols-outlined text-[16px]">bookmark_border</span><span>Đánh dấu</span>`;
              }
            });
          }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Thi N3">
<div className="bg-background font-body-md text-on-surface antialiased" data-page="ExamN3" data-shell-unified="1">

<main className="w-full pt-0 bg-background"><div className="flex flex-col w-full">
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
<span className="font-title-sm text-title-sm">Đề thi thử JLPT N3</span>
<span className="font-label-md text-label-md px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono">Mã: N3-2024-04</span>
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
<span className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight font-mono leading-tight" id="exam-timer">42:06</span>
</div>
<div className="pl-space-xs text-outline-variant">
<span className="material-symbols-outlined text-[20px] text-primary">timer</span>
</div>
</div>
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
<span className="font-label-md text-label-md text-on-surface truncate">1. Kiến thức ngôn ngữ</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Từ vựng • Kanji • Ngữ pháp (30 ph)</span>
</div>
</div>
<div className="text-right shrink-0 pl-space-xs">
<span className="font-label-sm text-label-sm text-tertiary font-bold bg-surface-container px-space-xs py-0.5 rounded-full">48/60 đ</span>
</div>
</div>
{/*  Step 2: Active (Dokkai)  */}
<div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-lowest ring-2 ring-primary/40 shadow-md">
<div className="flex items-center gap-space-sm min-w-0">
<div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_2px_8px_rgba(166,46,79,0.3)]">{"2\n            "}</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-label-md text-label-md text-primary font-bold truncate">2. Đọc hiểu (Dokkai)</span>
<span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">Đang làm</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">70 phút • 35 câu hỏi</span>
</div>
</div>
<div className="text-right shrink-0">
<span className="font-label-md text-label-md text-primary font-bold">28/35 câu</span>
</div>
</div>
{/*  Step 3: Locked (Choukai)  */}
<div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container opacity-65">
<div className="flex items-center gap-space-sm min-w-0">
<div className="w-7 h-7 rounded-full bg-surface-container-highest text-outline flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[16px]">lock</span>
</div>
<div className="flex flex-col min-w-0">
<span className="font-label-md text-label-md text-on-surface-variant truncate">3. Nghe hiểu (Choukai)</span>
<span className="font-label-sm text-label-sm text-outline">40 phút • Chưa mở</span>
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
<span className="">Đoạn 3 / 5 • Đọc hiểu trung văn</span>
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
<span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">Văn bản số 3 • 問題 IV</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface mt-1 font-bold leading-relaxed">{"【"}<ruby>生<rt>い</rt></ruby>け<ruby>花<rt>ばな</rt></ruby>に<ruby>見<rt>み</rt></ruby>る<ruby>日本人<rt>にほんじん</rt></ruby>の「<ruby>余白<rt>よはく</rt></ruby>」の<ruby>美意識<rt>びいしき</rt></ruby>と<ruby>春<rt>はる</rt></ruby>の<ruby>訪<rt>おとず</rt></ruby>{"れ】\n            "}</h2>
<div className="w-12 h-0.5 bg-primary/40 mt-space-xs rounded-full"></div>
</div>
{/*  Japanese Passage Content with High Typographic Care  */}
<div className="font-body-lg text-body-lg text-on-surface leading-[2.1] space-y-space-md selection:bg-secondary-container" id="passage-text">
<p className="">
<ruby>日本<rt>にほん</rt></ruby>の<ruby>伝統的<rt>でんとうてき</rt></ruby>な<ruby>文化<rt>ぶんか</rt></ruby>である「<ruby>生<rt>い</rt></ruby>け<ruby>花<rt>ばな</rt></ruby>」は、ただ<ruby>美<rt>うつく</rt></ruby>しい<ruby>花<rt>はな</rt></ruby>を<ruby>花瓶<rt>かびん</rt></ruby>に<ruby>集<rt>あつ</rt></ruby>めて<ruby>飾<rt>かざ</rt></ruby>{"ることではない。西洋のフラワーアレンジメントが空間を花で満たす「足し算の美」であるのに対して、日本の生け花は不要な枝や葉をあえて切り落とし、\n              "}<mark className="bg-secondary-fixed/70 px-1 py-0.5 rounded text-on-secondary-fixed font-medium">「<ruby>余白<rt>よはく</rt></ruby>（よはく）」</mark>{"を創り出す「引き算の美学」に基づいている。\n            "}</p>
<p className="">{"特に"}<ruby>春<rt>はる</rt></ruby>の<ruby>初<rt>はじ</rt></ruby>めには、<ruby>満開<rt>まんかい</rt></ruby>の<ruby>桜<rt>さくら</rt></ruby>ではなく、あえてまだ<ruby>硬<rt>かた</rt></ruby>い<ruby>蕾<rt>つぼみ</rt></ruby>{"をつけた一枝（ひとえだ）を活けることが多い。そこには、これから咲こうとする命の力強さや、やがて散りゆく儚さを慈しむ\n              "}<mark className="bg-secondary-fixed/70 px-1 py-0.5 rounded text-on-secondary-fixed font-medium">「もののあわれ」</mark>{"という独特の感性が宿っている。何もない空間、すなわち\n              "}<mark className="bg-secondary-fixed/70 px-1 py-0.5 rounded text-on-secondary-fixed font-medium">「<ruby>間<rt>ま</rt></ruby>（Khoảng lặng）」</mark>{"が存在することによってこそ、一本の花の凛とした立ち姿や、風の流れが観る者の心に鮮やかに伝わってくるのである。\n            "}</p>
<div className="my-space-sm p-space-md rounded-xl bg-surface-container-low flex items-start gap-space-md">
<div className="w-24 h-24 rounded-lg bg-surface-container-high shrink-0 overflow-hidden shadow-sm">
<img className="w-full h-full object-cover" data-alt="Close up of a minimalistic Japanese Ikebana arrangement with early spring cherry blossom branch in a textured ceramic vase, soft studio natural lighting, Japanese wabi-sabi aesthetic with muted tones of pale pink and stone grey" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm52baBxcuPhIV6n7JKA1ifyKSW8EkWw8tdQ-oEj59_0zCPheSMHTQ8UgO2Rua1wAzbIUf8_toV8G6q_BSsyH__UaQ4uvY8XZWcoNdGZeNLVCkqlNkkMY0nb5gkE3lFnS1D5xyvqKTl6BOFGMe90wPiqa9YRi65ujDfE-gLXMI_9h242Bre8K4raOWc3r7nyXm9GiLxgNv-6f1xfJrwsX6UqAllR1njVPndFtpSLITbFquIYEy0tL9" />
</div>
<div className="flex flex-col min-w-0">
<span className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">local_florist</span>{"Ghi chú văn hóa (文化メモ)\n                "}</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{"Khái niệm "}<strong>余白 (Yohaku)</strong>{" phản ánh triết lý thẩm mỹ thiền tông: sự rỗng lặng tạo ra không gian tưởng tượng vô hạn cho người ngắm, thể hiện qua nghệ thuật cắm hoa Kado và tranh thủy mặc Suibokuga.\n                "}</p>
</div>
</div>
<p className="bg-primary/5 p-space-sm rounded-xl">{"情報が溢れ、絶え間なく時間に追われる現代社会において、この「余白」を味わう生け花の精神は、現代人にとって\n              "}<span className="text-primary font-bold underline decoration-primary decoration-2 underline-offset-4 cursor-pointer" title="Trọng tâm câu hỏi 24">大切な契機となっている</span>{"と言えよう。あえて何かを引くことで、本当に大切な本質が静かに浮かび上がってくるからである。\n            "}</p>
</div>
{/*  Bottom Article Metas & Navigation within Passages  */}
<div className="pt-space-sm flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
<span className="">Nguồn trích dẫn: 『日本の美意識と空間哲学』(2023)</span>
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
<footer className="w-full bg-surface-container-low shadow-[0_-1px_16px_rgba(217,75,104,0.04)] mt-space-3xl"><div className="w-full px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-3xl"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter-desktop mb-space-2xl"><div className="lg:col-span-2 space-y-space-md"><div className="flex items-center gap-space-xs"><div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">filter_vintage</span></div><span className="font-headline-sm text-headline-sm font-bold text-primary">RikiPath Learning</span></div><p className="font-body-md text-body-md text-on-surface-variant max-w-md">Nền tảng học tiếng Nhật và luyện thi JLPT tinh tuyển theo triết lý tối giản Ma (間) cùng vẻ đẹp thanh thoát của hoa anh đào Nhật Bản.</p><div className="flex items-center gap-space-sm pt-space-xs"><span className="px-space-md py-space-xxs rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px] text-primary">location_on</span>Tokyo • Shinjuku Campus</span><span className="px-space-md py-space-xxs rounded-full bg-secondary-fixed font-label-sm text-label-sm text-on-secondary-fixed">JLPT N5 → N1</span></div></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Chương trình đào tạo</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N5 - N4 Sơ cấp</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N3 Bứt phá</li><li className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình N2 - N1 Chuyên sâu</li><li className="font-body-sm text-body-sm text-on-surface-variant">Luyện thi JLPT Siêu tốc</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Tài nguyên học tập</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Thư viện 2,136 Kanji Thường dụng</li><li className="font-body-sm text-body-sm text-on-surface-variant">Kho từ vựng Sakura Flashcard</li><li className="font-body-sm text-body-sm text-on-surface-variant">Đề thi thử JLPT có chấm điểm</li><li className="font-body-sm text-body-sm text-on-surface-variant">{"Góc văn hóa & Đời sống Tokyo"}</li></ul></div><div className="space-y-space-sm"><h3 className="font-title-md text-title-md text-on-surface">Hỗ trợ học viên</h3><ul className="space-y-space-xs"><li className="font-body-sm text-body-sm text-on-surface-variant">Cố vấn học tập 1:1</li><li className="font-body-sm text-body-sm text-on-surface-variant">Cộng đồng học viên RikiPath</li><li className="font-body-sm text-body-sm text-on-surface-variant">Chính sách bảo hành đỗ JLPT</li><li className="font-body-sm text-body-sm text-on-surface-variant">{"Trợ giúp kỹ thuật & Tài khoản"}</li></ul></div></div><div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="material-symbols-outlined text-[16px] text-primary">local_florist</span><span className="">© 2024 RikiPath Learning Platform. Thiết kế hòa quyện nghệ thuật tối giản Nhật Bản.</span></div><div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant"><span className="hover:text-on-surface cursor-pointer">Điều khoản học tập</span><span className="hover:text-on-surface cursor-pointer">Bảo mật thông tin</span><span className="hover:text-on-surface cursor-pointer">Tiêu chuẩn JLPT</span></div></div></div></footer>


    </div>
  
</LearnerShell>
);
}
