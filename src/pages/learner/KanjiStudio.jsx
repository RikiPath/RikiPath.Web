import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function KanjiStudio() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Kanji AI">
<div className="bg-canvas text-charcoal min-h-screen flex overflow-x-hidden antialiased selection:bg-brand-soft selection:text-brand-dark" data-page="KanjiStudio" data-shell-unified="1">


{/*  Left Sidebar (Fixed 64 / 256px)  */}





{/*  Main Viewport  */}


<div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
{/*  Top Global Header  */}

{/*  Main Workspace Area  */}
<main className="flex-1 overflow-y-auto bg-canvas p-6 lg:p-8">
<div className="max-w-[1440px] mx-auto flex flex-col gap-6">
{/*  Header Bar: Title, Mode Toggles, Audio & Level Badge  */}
<div className="bg-surface rounded-2xl p-5 border border-borderSoft shadow-card flex flex-wrap items-center justify-between gap-4">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-xl bg-brand-light border border-brand-soft flex items-center justify-center text-brand font-bold">
<span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>draw</span>
</div>
<div>
<div className="flex items-center gap-2.5">
<h2 className="text-xl font-bold text-charcoal tracking-tight">Luyện tập Kanji tương tác</h2>
<span className="px-2.5 py-0.5 rounded-full bg-brand-light text-brand text-xs font-bold border border-brand-soft">JLPT N4</span>
<span className="px-2 py-0.5 rounded-full bg-canvas text-charcoal-muted text-[11px] font-medium border border-borderSoft">Bài 12: Trường học</span>
</div>
<p className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-2">
<span>{"Bộ thủ chính: "}<strong className="text-charcoal">子 (Tử)</strong></span>
<span>•</span>
<span>{"Tổng số nét: "}<strong className="text-charcoal">8 nét</strong></span>
<span>•</span>
<span>{"Tần suất xuất hiện: "}<strong className="text-brand">Cao (Top 100)</strong></span>
</p>
</div>
</div>
{/*  Interaction Controls  */}
<div className="flex items-center gap-3">
{/*  Audio Pronunciation Button  */}
<button className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-brand-light border border-borderSoft text-charcoal text-xs font-semibold flex items-center gap-2 transition-all hover:text-brand" title="Nghe phát âm chuẩn">
<span className="material-symbols-outlined text-[18px] text-brand">volume_up</span>
<span>Nghe âm (Onyomi/Kunyomi)</span>
</button>
{/*  Mode Selector Switches  */}
<div className="flex bg-canvas p-1 rounded-xl border border-borderSoft shadow-2xs">
<button className="px-3.5 py-1.5 rounded-lg bg-surface text-brand shadow-xs border border-borderSoft/80 text-xs font-bold flex items-center gap-1.5 transition-all">
<span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gesture</span>{"Vẽ tay cảm ứng\n              "}</button>
<button className="px-3.5 py-1.5 rounded-lg text-charcoal-muted hover:text-charcoal text-xs font-medium flex items-center gap-1.5 transition-all">
<span className="material-symbols-outlined text-[16px]">keyboard</span>{"Gõ phím\n              "}</button>
<button className="px-3.5 py-1.5 rounded-lg text-charcoal-muted hover:text-charcoal text-xs font-medium flex items-center gap-1.5 transition-all">
<span className="material-symbols-outlined text-[16px]">interests</span>{"Nhận diện bộ thủ\n              "}</button>
</div>
</div>
</div>
{/*  12-Column Grid Layout (6 cols : 3 cols : 3 cols)  */}
<div className="grid grid-cols-12 gap-6 items-start">
{/*  COLUMN 1 (6 Cols): Interactive Stroke Canvas  */}
<section className="col-span-12 lg:col-span-6 flex flex-col gap-4">
<div className="bg-surface rounded-2xl border border-borderSoft shadow-card overflow-hidden flex flex-col">
{/*  Canvas Header Status  */}
<div className="px-5 py-3.5 border-b border-borderSoft flex items-center justify-between bg-canvas/40">
<div className="flex items-center gap-2">
<span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
<span className="text-xs font-semibold text-charcoal">Vùng vẽ tự do (米字格)</span>
<span className="text-[11px] text-charcoal-muted">{"| Nét hiện tại: "}<strong className="text-brand font-bold">Nét 4/8 (冖 Miên)</strong></span>
</div>
<div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
<span className="text-[11px] bg-white px-2 py-0.5 rounded border border-borderSoft font-mono">Độ nhạy: 98%</span>
</div>
</div>
{/*  Interactive Canvas with Rice Grid (米字格)  */}
<div className="relative w-full aspect-square max-h-[460px] bg-surface cursor-crosshair overflow-hidden select-none">
{/*  米字格 (Rice Grid Pattern) Background SVG  */}
<svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50" preserveAspectRatio="none" viewBox="0 0 400 400">
{/*  Outer frame border  */}
<rect fill="none" height="396" stroke="#EADFD9" strokeWidth="2" width="396" x="2" y="2"></rect>
{/*  Center cross  */}
<line opacity="0.45" stroke="#E05A7A" strokeDasharray="4 4" strokeWidth="1.2" x1="200" x2="200" y1="0" y2="400"></line>
<line opacity="0.45" stroke="#E05A7A" strokeDasharray="4 4" strokeWidth="1.2" x1="0" x2="400" y1="200" y2="200"></line>
{/*  Diagonal lines (X)  */}
<line stroke="#EADFD9" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="400" y1="0" y2="400"></line>
<line stroke="#EADFD9" strokeDasharray="3 3" strokeWidth="1" x1="400" x2="0" y1="0" y2="400"></line>
{/*  Inner sub-quadrant guidance marks  */}
<circle cx="200" cy="200" fill="#E05A7A" opacity="0.6" r="3"></circle>
</svg>
{/*  Faint stroke guideline for learning assistance (Ghost template of '学')  */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-15">
<span className="font-kanji text-[300px] leading-none text-charcoal">学</span>
</div>
{/*  Active Drawn Strokes (Real calligraphy SVG representation)  */}
<svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
{/*  Stroke 1 (Drawn)  */}
<path d="M 160 85 C 150 105, 140 120, 135 130" fill="none" stroke="#2D282A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="13"></path>
{/*  Stroke 2 (Drawn)  */}
<path d="M 198 75 C 200 95, 201 110, 202 122" fill="none" stroke="#2D282A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="13"></path>
{/*  Stroke 3 (Drawn)  */}
<path d="M 235 85 C 248 100, 258 115, 268 128" fill="none" stroke="#2D282A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="13"></path>
{/*  Stroke 4 (Current active drawing stroke highlight in Deep Cherry Blossom Pink)  */}
<path d="M 115 155 L 115 178" fill="none" stroke="#E05A7A" strokeDasharray="6 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12"></path>
<circle className="animate-ping" cx="115" cy="155" fill="#E05A7A" opacity="0.75" r="7"></circle>
<circle cx="115" cy="155" fill="#E05A7A" r="5"></circle>
<text fill="#E05A7A" fontFamily="Plus Jakarta Sans" fontSize="11" fontWeight="700" x="125" y="152">Bắt đầu nét 4</text>
</svg>
{/*  Floating Canvas Controls  */}
<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-borderSoft shadow-lg rounded-full px-4 py-1.5 flex items-center gap-3 z-10">
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-charcoal hover:bg-canvas hover:text-brand transition-colors">
<span className="material-symbols-outlined text-[17px]">undo</span>{"Hoàn tác\n                  "}</button>
<div className="w-px h-4 bg-borderSoft"></div>
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-charcoal hover:bg-red-50 hover:text-red-600 transition-colors">
<span className="material-symbols-outlined text-[17px]">delete_sweep</span>{"Xóa tất cả\n                  "}</button>
<div className="w-px h-4 bg-borderSoft"></div>
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-charcoal hover:bg-canvas hover:text-brand transition-colors">
<span className="material-symbols-outlined text-[17px]">replay</span>{"Xem lại nét\n                  "}</button>
</div>
</div>
{/*  Live Stroke Feedback Guidance Banner  */}
<div className="p-4 bg-brand-light/50 border-t border-borderSoft flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">lightbulb</span>
</div>
<div>
<p className="text-xs font-semibold text-charcoal">Hướng dẫn nét vẽ:</p>
<p className="text-[11px] text-charcoal-muted">Nét 4 (bộ Miên 冖): Vẽ từ trái sang phải, gập nhẹ xuống ở đuôi nét bên phải.</p>
</div>
</div>
<span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
<span className="material-symbols-outlined text-[13px]">check_circle</span>{" 3 nét trước chính xác\n                "}</span>
</div>
</div>
{/*  Primary Submission CTA Bar  */}
<div className="flex flex-col items-center gap-2">
<button className="w-full bg-brand text-white font-bold text-sm py-3.5 px-8 rounded-xl hover:bg-brand-hover shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 group">
<span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">auto_awesome</span>
<span>{"Gửi chấm điểm AI (Độ chính xác & Thứ tự nét)"}</span>
</button>
<div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
<span className="material-symbols-outlined text-[15px] text-brand">verified</span>
<span>Hệ thống AI RikiPath phân tích độ cân đối, trọng tâm và góc nghiêng của chữ</span>
</div>
</div>
</section>
{/*  COLUMN 2 (3 Cols): Reference Kanji & Stroke Order Breakdown  */}
<section className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col gap-4">
<div className="bg-surface rounded-2xl border border-borderSoft shadow-card p-5 flex flex-col">
{/*  Card Header  */}
<div className="flex items-center justify-between pb-3 border-b border-borderSoft mb-4">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">auto_stories</span>
<h3 className="text-sm font-bold text-charcoal">Mẫu chữ chuẩn</h3>
</div>
<button className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
<span className="material-symbols-outlined text-[15px]">visibility</span>
<span>Hiện mẫu</span>
</button>
</div>
{/*  Animated Reference Preview Box  */}
<div className="w-full aspect-[4/3] bg-canvas rounded-xl border border-borderSoft flex flex-col items-center justify-center relative overflow-hidden mb-4 group">
{/*  Rice grid faint watermark  */}
<svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 200 150">
<line stroke="#E05A7A" strokeDasharray="3 3" strokeWidth="0.8" x1="100" x2="100" y1="0" y2="150"></line>
<line stroke="#E05A7A" strokeDasharray="3 3" strokeWidth="0.8" x1="0" x2="200" y1="75" y2="75"></line>
</svg>
<span className="font-kanji text-7xl font-light text-charcoal tracking-tight select-none">学</span>
<div className="absolute bottom-2 right-2 bg-surface/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-semibold text-charcoal-muted border border-borderSoft flex items-center gap-1">
<span className="material-symbols-outlined text-[12px] text-brand">play_circle</span>
<span>Xem động</span>
</div>
</div>
{/*  Stroke Order Rules  */}
<div className="bg-canvas/70 rounded-xl p-3 border border-borderSoft mb-4">
<h4 className="text-xs font-bold text-charcoal flex items-center gap-1.5 mb-1.5">
<span className="material-symbols-outlined text-brand text-[15px]">rule</span>{"Quy tắc viết chuẩn:\n                "}</h4>
<p className="text-[11px] text-charcoal-muted leading-relaxed">{"1. Trên trước - dưới sau"}<br />{"2. Ba dấu chấm phía trên viết từ trái sang phải"}<br />{"3. Bộ miên (nắp nhà) bao phủ phần thân"}<br />{"4. Bộ tử (con) viết kết thúc dưới cùng\n                "}</p>
</div>
{/*  Stroke Sequence Grid (Numbered 1-8 Breakdown)  */}
<div>
<div className="flex items-center justify-between mb-2">
<h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Thứ tự 8 nét</h4>
<span className="text-[10px] text-brand font-semibold">Từng bước 1 → 8</span>
</div>
<div className="grid grid-cols-4 gap-2">
{/*  Stroke 1  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer bg-brand-light/30 border-brand-soft">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-brand">1</span>
<span className="font-kanji text-base text-charcoal">丶</span>
</div>
{/*  Stroke 2  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer bg-brand-light/30 border-brand-soft">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-brand">2</span>
<span className="font-kanji text-base text-charcoal">丶</span>
</div>
{/*  Stroke 3  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer bg-brand-light/30 border-brand-soft">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-brand">3</span>
<span className="font-kanji text-base text-charcoal">丿</span>
</div>
{/*  Stroke 4 (Current)  */}
<div className="aspect-square bg-brand rounded-lg border border-brand text-white flex items-center justify-center relative shadow-xs group cursor-pointer ring-2 ring-brand-soft">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-white">4</span>
<span className="font-kanji text-base text-white">冖</span>
</div>
{/*  Stroke 5  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-charcoal-muted group-hover:text-brand">5</span>
<span className="font-kanji text-base text-charcoal">㇇</span>
</div>
{/*  Stroke 6  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-charcoal-muted group-hover:text-brand">6</span>
<span className="font-kanji text-base text-charcoal">亅</span>
</div>
{/*  Stroke 7  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-charcoal-muted group-hover:text-brand">7</span>
<span className="font-kanji text-base text-charcoal">一</span>
</div>
{/*  Stroke 8 (Full)  */}
<div className="aspect-square bg-canvas rounded-lg border border-borderSoft flex items-center justify-center relative hover:border-brand transition-colors group cursor-pointer">
<span className="absolute top-1 left-1.5 text-[9px] font-bold text-charcoal-muted group-hover:text-brand">8</span>
<span className="font-kanji text-base text-charcoal">学</span>
</div>
</div>
</div>
</div>
</section>
{/*  COLUMN 3 (3 Cols): Meaning, Linguistic Info & Next Kanji  */}
<section className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col gap-4">
{/*  Linguistic Card  */}
<div className="bg-surface rounded-2xl border border-borderSoft shadow-card p-5 flex flex-col">
<div className="flex items-center justify-between pb-3 border-b border-borderSoft mb-4">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">translate</span>
<h3 className="text-sm font-bold text-charcoal">Thông tin ngôn ngữ</h3>
</div>
<span className="text-[11px] font-semibold text-charcoal-muted bg-canvas px-2 py-0.5 rounded border border-borderSoft">Hán Việt: HỌC</span>
</div>
{/*  Meanings  */}
<div className="space-y-3">
<div>
<span className="text-[11px] font-bold text-charcoal-muted uppercase">Ý nghĩa chính:</span>
<p className="text-sm font-bold text-charcoal mt-0.5">Học tập, tiếp thu tri thức, khoa học</p>
</div>
<div className="grid grid-cols-2 gap-3 pt-1">
<div className="bg-canvas rounded-xl p-3 border border-borderSoft">
<span className="text-[10px] font-bold text-charcoal-muted uppercase">Âm Onyomi</span>
<p className="text-sm font-bold text-brand mt-0.5 font-kanji">ガク</p>
<p className="text-[11px] text-charcoal-muted">(gaku)</p>
</div>
<div className="bg-canvas rounded-xl p-3 border border-borderSoft">
<span className="text-[10px] font-bold text-charcoal-muted uppercase">Âm Kunyomi</span>
<p className="text-sm font-bold text-charcoal mt-0.5 font-kanji">まな.ぶ</p>
<p className="text-[11px] text-charcoal-muted">(mana.bu)</p>
</div>
</div>
<div className="pt-2 border-t border-borderSoft">
<div className="flex items-center justify-between mb-2">
<span className="text-[11px] font-bold text-charcoal-muted uppercase">Từ ghép thông dụng:</span>
<span className="text-[10px] text-brand font-semibold">3 từ cơ bản N4</span>
</div>
<div className="space-y-2">
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas hover:bg-brand-light/40 transition-colors border border-borderSoft/80">
<div>
<span className="font-kanji font-bold text-charcoal text-sm">学校</span>
<span className="text-xs text-charcoal-muted ml-1.5 font-kanji">がっこう</span>
</div>
<span className="text-xs font-semibold text-charcoal">Trường học</span>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas hover:bg-brand-light/40 transition-colors border border-borderSoft/80">
<div>
<span className="font-kanji font-bold text-charcoal text-sm">学生</span>
<span className="text-xs text-charcoal-muted ml-1.5 font-kanji">がくせい</span>
</div>
<span className="text-xs font-semibold text-charcoal">Học sinh</span>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-canvas hover:bg-brand-light/40 transition-colors border border-borderSoft/80">
<div>
<span className="font-kanji font-bold text-charcoal text-sm">見学</span>
<span className="text-xs text-charcoal-muted ml-1.5 font-kanji">けんがく</span>
</div>
<span className="text-xs font-semibold text-charcoal">Tham quan học tập</span>
</div>
</div>
</div>
</div>
</div>
{/*  AI Recognition Score Expectation Card  */}
<div className="bg-surface rounded-2xl border border-borderSoft shadow-card p-5">
<div className="flex items-center justify-between mb-3">
<span className="text-xs font-bold text-charcoal flex items-center gap-1.5">
<span className="material-symbols-outlined text-brand text-[17px]">psychology</span>{"Dự đoán điểm AI\n                "}</span>
<span className="text-xs font-bold text-brand bg-brand-light px-2 py-0.5 rounded-full border border-brand-soft">92 / 100</span>
</div>
{/*  Progress bar  */}
<div className="w-full bg-canvas rounded-full h-2 overflow-hidden border border-borderSoft mb-3">
<div className="bg-gradient-to-r from-brand-soft to-brand h-2 rounded-full" style={{ width: "92%" }}></div>
</div>
<div className="grid grid-cols-2 gap-2 text-[11px] text-charcoal-muted">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-emerald-600">check</span>
<span>Đúng nét: 100%</span>
</div>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-emerald-600">check</span>
<span>Tỉ lệ khung: 94%</span>
</div>
</div>
</div>
{/*  Next Kanji Quick Navigation Button  */}
<div className="bg-surface rounded-2xl border border-borderSoft shadow-card p-4 flex items-center justify-between hover:border-brand-soft transition-all">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-canvas border border-borderSoft flex items-center justify-center font-kanji font-bold text-lg text-charcoal">{"校\n                "}</div>
<div>
<span className="text-[10px] uppercase font-bold text-charcoal-muted">Chữ tiếp theo</span>
<p className="text-xs font-bold text-charcoal">校 (HIỆU - gakukou)</p>
</div>
</div>
<button className="w-8 h-8 rounded-full bg-brand-light text-brand hover:bg-brand hover:text-white flex items-center justify-center transition-all">
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
</div>
</section>
</div>
</div>
</main>
</div>


    </div>
  
</LearnerShell>
);
}
