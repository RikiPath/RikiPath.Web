import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function KanjiEditor() {
  const { pathname } = useLocation();
  return (
    <CmsShell pathname={pathname} breadcrumb="Hán tự">
<div className="font-sans antialiased bg-background text-on-surface min-h-screen" data-page="KanjiEditor" data-shell-unified="1">


{/*  ================= SIDEBAR NAVIGATION =================  */}





{/*  ================= MAIN CONTAINER =================  */}


<div className="pl-0">
{/*  Topbar Navigation  */}

{/*  Main Workspace (Desktop 1440px layout)  */}
<main className="w-full pt-0 px-8 pb-12 max-w-[1440px] mx-auto">
{/*  Top Action Bar & Breadcrumbs  */}
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-subtle">
<div className="flex flex-col gap-1.5">
{/*  Breadcrumbs  */}
<div className="flex items-center gap-2 text-xs font-medium text-on-surface-muted">
<span className="hover:text-primary cursor-pointer transition-colors">Kho học liệu</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="hover:text-primary cursor-pointer transition-colors">JLPT N3</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="text-primary font-semibold">Chi tiết Hán tự #KANJI-N3-SAKU</span>
</div>
{/*  Title & Badges  */}
<div className="flex flex-wrap items-center gap-3 mt-1">
<h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2.5">
<span>Biên tập Hán tự:</span>
<span className="text-primary text-3xl lg:text-4xl font-kanji font-bold">咲</span>
<span className="text-base lg:text-lg font-medium text-on-surface-muted">(Tiếu - Nở hoa, Tiếu ngạo)</span>
</h1>
<div className="flex flex-wrap items-center gap-2">
<span className="px-2.5 py-0.5 rounded-full bg-secondary/50 text-secondary-dark text-xs font-semibold flex items-center gap-1 border border-secondary">
<span className="material-symbols-outlined text-[14px] text-primary">verified</span>
                Chuẩn hóa JLPT 2025
              </span>
<span className="px-2.5 py-0.5 rounded-full bg-white text-on-surface-muted text-xs font-medium border border-border-subtle">
                Bộ thủ Khẩu (口)
              </span>
<span className="px-2.5 py-0.5 rounded-full bg-success-bg text-success text-xs font-semibold flex items-center gap-1 border border-emerald-200">
<span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                Đã đồng bộ Sổ tay
              </span>
</div>
</div>
</div>
{/*  Action Buttons  */}
<div className="flex items-center gap-2.5 shrink-0">
<button className="px-3.5 py-2 rounded-xl bg-white border border-border-subtle text-on-surface hover:border-primary hover:text-primary text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 group" type="button">
<span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">draw</span>
<span>Xem trước nét viết</span>
</button>
<button className="px-3.5 py-2 rounded-xl bg-white border border-border-subtle text-on-surface hover:border-primary hover:text-primary text-xs font-bold transition-all shadow-xs flex items-center gap-1.5" type="button">
<span className="material-symbols-outlined text-[18px] text-on-surface-muted">content_copy</span>
<span>Sao chép SVG</span>
</button>
<button className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5" type="button">
<span className="material-symbols-outlined text-[18px]">save</span>
<span>Lưu thay đổi Hán tự</span>
</button>
</div>
</div>
{/*  ================= 3-COLUMN WORKSPACE GRID (12-COLUMNS) =================  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
{/*  =========================================================  */}
{/*  COLUMN 1: VISUAL CANVAS, METRICS, STROKES & AUDIO (~4 cols)  */}
{/*  =========================================================  */}
<div className="lg:col-span-4 flex flex-col gap-6">
{/*  Card 1.1: Interactive Kanji Canvas & Quick Metrics  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h3 className="text-sm font-bold text-on-surface tracking-tight">Ô vẽ Hán tự tương tác (米字格)</h3>
</div>
<span className="px-2 py-0.5 rounded bg-surface-tint border border-secondary text-primary font-bold text-[11px]">
                Bezier Vector: 9 Nét
              </span>
</div>
{/*  Traditional Rice Grid Canvas (米字格)  */}
<div className="relative w-full aspect-square max-w-[280px] mx-auto bg-[#FAF7F5] rounded-xl border border-border-subtle flex items-center justify-center p-3 shadow-inner group overflow-hidden">
{/*  Traditional Rice Grid Lines  */}
<svg className="absolute inset-0 w-full h-full text-[#DFD6D1] pointer-events-none" fill="none" stroke="currentColor" stroke-dasharray="3,3" strokeWidth="0.8" viewBox="0 0 100 100">
<line x1="50" x2="50" y1="0" y2="100"></line>
<line x1="0" x2="100" y1="50" y2="50"></line>
<line x1="0" x2="100" y1="0" y2="100"></line>
<line x1="100" x2="0" y1="0" y2="100"></line>
<rect className="text-border-subtle" height="100" stroke-dasharray="none" strokeWidth="1.2" width="100" x="0" y="0"></rect>
</svg>
{/*  Central Big Kanji Character  */}
<div className="relative z-10 flex flex-col items-center justify-center select-none cursor-pointer">
<span className="text-[130px] font-kanji font-bold text-on-surface leading-none tracking-tight transition-transform duration-300 group-hover:scale-105 select-none drop-shadow-xs">咲</span>
</div>
{/*  Interactive action float  */}
<div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-border-subtle text-[11px] text-on-surface-muted">
<span className="flex items-center gap-1 text-primary font-semibold">
<span className="material-symbols-outlined text-[14px]">touch_app</span> Rê chuột xem nét
                </span>
<span>Khẩu (口) + Quan (关)</span>
</div>
</div>
{/*  3 Quick Metric Cards  */}
<div className="grid grid-cols-3 gap-2.5 pt-1">
<div className="bg-[#FAF7F5] border border-border-subtle p-2.5 rounded-xl flex flex-col items-center text-center">
<span className="text-[11px] font-medium text-on-surface-muted">Tổng số nét</span>
<span className="text-xl font-bold text-on-surface mt-0.5">09</span>
<span className="text-[10px] text-primary font-semibold mt-0.5">Jouyou Lớp 4</span>
</div>
<div className="bg-[#FAF7F5] border border-border-subtle p-2.5 rounded-xl flex flex-col items-center text-center">
<span className="text-[11px] font-medium text-on-surface-muted">Bút thuận</span>
<span className="text-xl font-bold text-success mt-0.5">100%</span>
<span className="text-[10px] text-on-surface-muted mt-0.5">Chuẩn MEXT</span>
</div>
<div className="bg-[#FAF7F5] border border-border-subtle p-2.5 rounded-xl flex flex-col items-center text-center">
<span className="text-[11px] font-medium text-on-surface-muted">Tần suất N3</span>
<span className="text-xl font-bold text-primary mt-0.5">94%</span>
<span className="text-[10px] text-on-surface-muted mt-0.5">Top đề JLPT</span>
</div>
</div>
{/*  Stroke order detailed analysis (3x3 grid)  */}
<div className="pt-2 border-t border-border-subtle/80 flex flex-col gap-2">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-primary">format_list_numbered</span>
                  Thứ tự 9 nét bút thuận quy chuẩn
                </span>
<span className="text-[11px] text-primary font-medium cursor-pointer hover:underline">Phát lại</span>
</div>
<div className="grid grid-cols-3 gap-2">
{/*  Stroke #1  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#1 Sổ</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">丨</div>
<span className="text-[10px] text-on-surface-muted">Tả khẩu</span>
</div>
{/*  Stroke #2  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#2 Chiết</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">𠃍</div>
<span className="text-[10px] text-on-surface-muted">Hoành chiết</span>
</div>
{/*  Stroke #3  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#3 Hoành</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">口</div>
<span className="text-[10px] text-on-surface-muted">Đáy khẩu</span>
</div>
{/*  Stroke #4  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#4 Phẩy</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">丿</div>
<span className="text-[10px] text-on-surface-muted">Phẩy ngắn</span>
</div>
{/*  Stroke #5  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#5 Hoành</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">一</div>
<span className="text-[10px] text-on-surface-muted">Đoản hoành</span>
</div>
{/*  Stroke #6  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#6 Sổ</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">十</div>
<span className="text-[10px] text-on-surface-muted">Trực giữa</span>
</div>
{/*  Stroke #7  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#7 Hoành</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">主</div>
<span className="text-[10px] text-on-surface-muted">Hoành đệm</span>
</div>
{/*  Stroke #8  */}
<div className="bg-[#FAF7F5] border border-border-subtle hover:border-primary/50 hover:bg-surface-tint p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#8 Phẩy</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-border-subtle flex items-center justify-center font-bold text-on-surface text-base">ノ</div>
<span className="text-[10px] text-on-surface-muted">Phẩy trái dài</span>
</div>
{/*  Stroke #9  */}
<div className="bg-surface-tint border border-secondary hover:border-primary p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer">
<span className="text-[10px] font-bold text-primary">#9 Mác</span>
<div className="w-8 h-8 my-1 rounded bg-white border border-secondary flex items-center justify-center font-bold text-primary text-base">咲</div>
<span className="text-[10px] text-primary font-semibold">Mác cong</span>
</div>
</div>
</div>
</div>
{/*  Card 1.2: Studio Âm thanh Chuẩn (NHK 48kHz Hi-Res)  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-3.5">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-secondary/60 text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[19px]">graphic_eq</span>
</div>
<div className="flex flex-col">
<span className="text-sm font-bold text-on-surface">Studio Âm thanh Chuẩn</span>
<span className="text-[11px] text-on-surface-muted">Giọng phát thanh viên Tokyo NHK</span>
</div>
</div>
<span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 48kHz Hi-Res
              </span>
</div>
<div className="bg-[#FAF7F5] border border-border-subtle p-3.5 rounded-xl flex flex-col gap-3">
{/*  Voice Switcher & Counter  */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-border-subtle">
<button className="px-2.5 py-1 rounded-md bg-primary text-white text-xs font-bold shadow-xs">
                    Nữ (Aoi)
                  </button>
<button className="px-2.5 py-1 rounded-md text-on-surface-muted hover:text-on-surface text-xs font-medium transition-colors">
                    Nam (Kenji)
                  </button>
</div>
<span className="text-xs font-mono font-semibold text-on-surface-muted">00:01 / 00:02</span>
</div>
{/*  Interactive Audio Waveform  */}
<div className="h-10 w-full flex items-center justify-between gap-1 px-2 py-1 bg-white rounded-lg border border-border-subtle">
<div className="w-1 bg-primary/40 rounded-full h-3"></div>
<div className="w-1 bg-primary/60 rounded-full h-5"></div>
<div className="w-1 bg-primary rounded-full h-8"></div>
<div className="w-1 bg-primary rounded-full h-6"></div>
<div className="w-1 bg-primary rounded-full h-9"></div>
<div className="w-1 bg-primary rounded-full h-7"></div>
<div className="w-1 bg-primary/70 rounded-full h-5"></div>
<div className="w-1 bg-primary/50 rounded-full h-3"></div>
<div className="w-1 bg-secondary rounded-full h-4"></div>
<div className="w-1 bg-border-subtle rounded-full h-3"></div>
<div className="w-1 bg-border-subtle rounded-full h-2"></div>
<div className="w-1 bg-border-subtle rounded-full h-1"></div>
</div>
{/*  Controls  */}
<div className="flex items-center justify-between pt-0.5">
<div className="flex items-center gap-2">
<button className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-all shadow-md active:scale-95" title="Phát âm thanh">
<span className="material-symbols-outlined text-[20px]">play_arrow</span>
</button>
<span className="text-xs font-medium text-on-surface">さく (saku)</span>
</div>
<div className="flex items-center gap-1.5">
<button className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-on-surface-muted hover:text-primary hover:border-primary text-xs font-semibold flex items-center gap-1 transition-colors" title="Ghi âm">
<span className="material-symbols-outlined text-[16px] text-primary">mic</span>
<span>Ghi âm BTV</span>
</button>
<button className="p-1.5 rounded-lg border border-border-subtle bg-white text-on-surface-muted hover:text-on-surface hover:border-primary transition-colors" title="Tải file .wav">
<span className="material-symbols-outlined text-[16px]">upload</span>
</button>
</div>
</div>
</div>
</div>
</div>
{/*  =========================================================  */}
{/*  COLUMN 2: ETYMOLOGY, WAKA & READINGS / FURIGANA (~5 cols)  */}
{/*  =========================================================  */}
<div className="lg:col-span-5 flex flex-col gap-6">
{/*  Card 2.1: Từ nguyên học & Ý niệm văn hóa Nhật Bản (Etymology)  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-4">
<div className="flex items-center justify-between border-b border-border-subtle pb-3">
<div className="flex items-center gap-2 text-primary">
<span className="material-symbols-outlined text-[22px]">menu_book</span>
<h2 className="text-base font-bold text-on-surface">Từ nguyên học & Ý niệm văn hóa (Etymology)</h2>
</div>
<span className="text-[11px] text-on-surface-muted font-medium">Thời kỳ Heian (平安時代)</span>
</div>
{/*  Content & Image Flex  */}
<div className="flex flex-col sm:flex-row gap-4 items-start">
{/*  Text Explanation  */}
<div className="flex-1 flex flex-col gap-2.5 text-xs text-on-surface leading-relaxed">
<p>
                  Chữ <span className="font-bold text-primary font-kanji text-sm">咲</span> trong tự nguyên cổ vốn là dị thể cổ xưa của chữ 
                  <span className="font-bold text-on-surface font-kanji text-sm">笑 (Tiếu - Cười)</span>. 
                  Hình tượng hội ý được ghép từ bộ <span className="font-bold text-primary">Khẩu (口)</span> tượng trưng khuôn miệng chúm chím hé mở nụ cười rạng rỡ, kết hợp với phần hài thanh biểu đạt sự bung nở căng tràn nhựa sống.
                </p>
<p className="text-on-surface-muted">
                  Vào văn hóa quý tộc Heian, người Nhật đã thi vị hóa khoảnh khắc cánh hoa anh đào đầu tiên hé mở: nụ hoa bung cánh tựa như nét cười duyên e ấp của người thiếu nữ. Triết lý này gắn liền mỹ học <span className="font-bold text-primary">Ma (間 - Khoảng lặng tĩnh tại)</span> và ý niệm <span className="italic font-medium text-on-surface">Mono no aware (物の哀れ)</span>.
                </p>
</div>
{/*  Cultural Artwork Illustration  */}
<div className="relative w-full sm:w-36 h-36 shrink-0 rounded-xl overflow-hidden border border-border-subtle shadow-xs group">
<img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="Delicate cherry blossom sakura branch in soft morning mist with traditional Japanese ink wash painting aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDireNrIU7IeDf-RHONbRtWUbczqRZbVOWKybSukZDeGItAqEPq3FRHoinE67RX0x_q75wDB32ThQEXpXEF7IQGgzIidS_vU-co3zcwfnrZuJzLzJJAvGHE0tMo5Us1GFZjLX4ZXj4wMG8jCTfNswI-J3UBfazfrV8LflPOYoOBBV_5ECA_JNOl7BewP4QpckY5MRqKHCPsaqo-JZpm1DpYuRWglihcHkaephZiSQA75dpp1O_MhPgs" />
<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
<span className="text-white text-[10px] font-semibold leading-tight">Waka: Hoa ngậm nụ</span>
</div>
</div>
</div>
{/*  Academic Note Callout  */}
<div className="p-3 rounded-xl bg-surface-tint border border-secondary/70 flex items-start gap-2.5">
<span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">school</span>
<div className="text-xs text-on-surface leading-normal">
<strong className="text-primary font-bold">Ghi chú học thuật:</strong> Khác với Hán ngữ hiện đại dùng từ 开花 (Khai hoa), tiếng Nhật bảo tồn độc quyền tự dạng <span className="font-bold font-kanji">咲</span> dành riêng cho động thái bung hoa, nở rộ thuần khiết.
              </div>
</div>
</div>
{/*  Card 2.2: Bảng Âm đọc & Trọng âm (Furigana & Pitch Accent)  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-4">
<div className="flex items-center justify-between border-b border-border-subtle pb-3">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">record_voice_over</span>
<h2 className="text-base font-bold text-on-surface">Bảng Âm đọc & Trọng âm (Furigana & Pitch)</h2>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-secondary/50 text-secondary-dark text-xs font-bold border border-secondary">
                Trọng âm Heiban [0]
              </span>
</div>
{/*  3 Columns for Readings (Kunyomi, Onyomi, Han Viet)  */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
{/*  Block 1: KUNYOMI  */}
<div className="bg-[#FAF7F5] border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors">
<div>
<div className="flex items-center justify-between pb-2 border-b border-border-subtle">
<span className="text-[11px] font-bold text-primary uppercase tracking-wider">KUNYOMI</span>
<span className="px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-bold">Trọng tâm N3</span>
</div>
<div className="mt-2">
<div className="text-xl font-bold text-on-surface">
                      さ.く <span className="text-xs font-normal text-on-surface-muted">(sa-ku)</span>
</div>
<div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
<span className="material-symbols-outlined text-[13px]">check_circle</span>
<span>Động từ Nhóm 1 (Tự V)</span>
</div>
</div>
<div className="mt-3 space-y-1 text-xs text-on-surface">
<div className="flex justify-between text-on-surface-muted">
<span>Lịch sự:</span>
<span className="font-bold text-on-surface">咲きます</span>
</div>
<div className="flex justify-between text-on-surface-muted">
<span>Quá khứ:</span>
<span className="font-bold text-on-surface">咲いた</span>
</div>
</div>
</div>
<div className="mt-3 pt-2 border-t border-border-subtle/70 text-[11px] font-medium text-on-surface-muted flex justify-between">
<span>Tần suất thi:</span>
<span className="font-bold text-primary">98%</span>
</div>
</div>
{/*  Block 2: ONYOMI  */}
<div className="bg-[#FAF7F5] border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors">
<div>
<div className="flex items-center justify-between pb-2 border-b border-border-subtle">
<span className="text-[11px] font-bold text-secondary-dark uppercase tracking-wider">ONYOMI</span>
<span className="px-1.5 py-0.5 rounded bg-white border border-border-subtle text-on-surface-muted text-[10px] font-semibold">Hiếm gặp</span>
</div>
<div className="mt-2">
<div className="text-xl font-bold text-on-surface">
                      ショウ <span className="text-xs font-normal text-on-surface-muted">(shō)</span>
</div>
<div className="mt-1 text-[11px] text-on-surface-muted italic">
                      Dùng trong thi ca cổ
                    </div>
</div>
<div className="mt-3 space-y-1 text-xs text-on-surface">
<div className="flex justify-between text-on-surface-muted">
<span>咲乱 (shōran):</span>
<span className="font-semibold text-on-surface">Hoa nở rực</span>
</div>
<div className="flex justify-between text-on-surface-muted">
<span>咲返る:</span>
<span className="font-semibold text-on-surface">Nở lần hai</span>
</div>
</div>
</div>
<div className="mt-3 pt-2 border-t border-border-subtle/70 text-[11px] font-medium text-on-surface-muted flex justify-between">
<span>Tần suất thi:</span>
<span className="font-bold text-on-surface">2%</span>
</div>
</div>
{/*  Block 3: HÁN VIỆT & GỐC TỪ  */}
<div className="bg-[#FAF7F5] border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors">
<div>
<div className="flex items-center justify-between pb-2 border-b border-border-subtle">
<span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">HÁN VIỆT</span>
<span className="px-1.5 py-0.5 rounded bg-white border border-border-subtle text-on-surface-muted text-[10px] font-semibold">Nghĩa gốc</span>
</div>
<div className="mt-2">
<div className="text-xl font-bold text-primary">TIẾU</div>
<div className="mt-1 text-[11px] text-on-surface-muted">
                      Nở rộ, bừng nở, tươi cười
                    </div>
</div>
<div className="mt-3 space-y-1 text-xs">
<div className="text-[11px] font-semibold text-on-surface-muted">Cụm từ tiêu biểu:</div>
<div className="font-bold text-primary">Hoa khai kiến tiếu</div>
<div className="text-[10px] text-on-surface-muted">(Hoa nở thấy cười - Thiền Heian)</div>
</div>
</div>
<div className="mt-3 pt-2 border-t border-border-subtle/70 text-[11px] font-medium text-on-surface-muted flex justify-between">
<span>Dị thể cùng âm:</span>
<span className="font-bold text-on-surface font-kanji">笑 (Cười)</span>
</div>
</div>
</div>
</div>
</div>
{/*  =========================================================  */}
{/*  COLUMN 3: FLASHCARD PREVIEW, SRS RETENTION & MATRIX (~3 cols)  */}
{/*  =========================================================  */}
<div className="lg:col-span-3 flex flex-col gap-6">
{/*  Card 3.1: Preview Flashcard Học viên (SRS Mobile View)  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-3.5">
<div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[20px]">style</span>
<span className="text-sm font-bold text-on-surface">Xem trước Flashcard</span>
</div>
<span className="text-[10px] font-bold text-primary uppercase tracking-wide bg-surface-tint px-2 py-0.5 rounded border border-secondary">
                Riki App
              </span>
</div>
{/*  Student Mobile Flashcard Component  */}
<div className="bg-gradient-to-b from-white to-[#FAF7F5] rounded-xl border-2 border-secondary/70 p-4 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
<span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-xs">
                N3 Core
              </span>
{/*  Flashcard Kanji Display  */}
<span className="text-6xl font-kanji font-bold text-on-surface mt-2 select-none">咲</span>
<span className="text-base font-bold text-primary mt-0.5">さく (saku)</span>
<span className="text-[11px] font-semibold text-on-surface-muted uppercase tracking-wider">TIẾU • NỞ HOA</span>
{/*  Artistic Mnemonic Illustration  */}
<div className="w-full h-28 my-3 rounded-lg overflow-hidden border border-border-subtle shadow-inner">
<img className="w-full h-full object-cover" data-alt="Delicate artistic illustration of a smiling cheerful girl admiring blooming sakura cherry blossoms with soft pastel pink hues" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAwuvuxTaDesRbNUIPHANybikG7zHdcQ8k78m35AV_yMDP1wNyk-geLI0loKx4tvC3ShR-_TUVZ_lH-0X0jDqCFjcNfjy_IVcFtUdbBN_hUIRK-pURjxzdJUCOXjgs6sInRPpIHbASXhyB5WNCKkQKPov7D4VbFZQOiKEKGffIYhOSuZVTgARb05ICN3Q388wfhnegvTpMhUIPigVHI0tyPc2CY08Oo_HlY3XHS0YL6oNKm25Ix8Ad" />
</div>
{/*  Mnemonic Text Box  */}
<div className="bg-white p-2.5 rounded-lg border border-border-subtle text-left w-full text-xs text-on-surface shadow-xs">
<div className="flex items-center gap-1 text-primary font-bold text-[11px] mb-1">
<span className="material-symbols-outlined text-[15px]">lightbulb</span>
<span>Mẹo nhớ hình tượng:</span>
</div>
<p className="text-[11px] text-on-surface leading-normal">
                  "Khuôn miệng (<span className="font-bold text-primary">口</span>) hé cười rạng rỡ khi ngắm cánh hoa đào hé nở (<span className="font-bold text-primary">咲く</span>) đón gió xuân."
                </p>
</div>
</div>
</div>
{/*  Card 3.2: Chỉ số ghi nhớ SRS thực tế  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-3.5">
<div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-emerald-600 text-[20px]">trending_up</span>
<span className="text-sm font-bold text-on-surface">Chỉ số ghi nhớ SRS</span>
</div>
<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">SM-2 SuperMemo</span>
</div>
{/*  2 Stats Boxes  */}
<div className="grid grid-cols-2 gap-2">
<div className="bg-[#FAF7F5] border border-border-subtle p-2.5 rounded-xl flex flex-col">
<span className="text-[11px] text-on-surface-muted">Đã lưu sổ tay</span>
<span className="text-lg font-bold text-on-surface mt-0.5">4,280</span>
<span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Học viên tích cực</span>
</div>
<div className="bg-[#FAF7F5] border border-border-subtle p-2.5 rounded-xl flex flex-col">
<span className="text-[11px] text-on-surface-muted">Nhớ sâu 3 chu kỳ</span>
<span className="text-lg font-bold text-primary mt-0.5">92.4%</span>
<span className="text-[10px] text-on-surface-muted mt-0.5">Độ bền trí nhớ</span>
</div>
</div>
{/*  Ebbinghaus Schedule Horizontal Chain  */}
<div className="bg-[#FAF7F5] border border-border-subtle p-2.5 rounded-xl flex flex-col gap-2">
<div className="flex justify-between items-center text-[11px]">
<span className="font-bold text-on-surface">Chu kỳ Ebbinghaus tối ưu</span>
<span className="text-primary font-bold">5 Lần ôn</span>
</div>
<div className="flex items-center justify-between text-[10px] font-bold text-on-surface pt-1">
<span className="px-1.5 py-1 rounded bg-secondary/60 text-secondary-dark">1N</span>
<span className="material-symbols-outlined text-[12px] text-on-surface-muted">east</span>
<span className="px-1.5 py-1 rounded bg-secondary/60 text-secondary-dark">3N</span>
<span className="material-symbols-outlined text-[12px] text-on-surface-muted">east</span>
<span className="px-1.5 py-1 rounded bg-secondary/60 text-secondary-dark">7N</span>
<span className="material-symbols-outlined text-[12px] text-on-surface-muted">east</span>
<span className="px-1.5 py-1 rounded bg-secondary/60 text-secondary-dark">14N</span>
<span className="material-symbols-outlined text-[12px] text-on-surface-muted">east</span>
<span className="px-1.5 py-1 rounded bg-primary text-white">30N</span>
</div>
</div>
</div>
{/*  Card 3.3: Ma trận Hán tự tương đồng & Bẫy đề thi  */}
<div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-card flex flex-col gap-3.5">
<div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[20px]">compare_arrows</span>
<span className="text-sm font-bold text-on-surface">Ma trận Hán tự dễ nhầm lẫn</span>
</div>
<span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Bẫy JLPT</span>
</div>
{/*  Confusion Item 1: 咲 vs 笑  */}
<div className="bg-[#FAF7F5] border border-border-subtle p-3 rounded-xl flex flex-col gap-1.5">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2 font-bold">
<span className="text-lg font-kanji text-primary">咲</span>
<span className="text-xs text-on-surface-muted font-normal">đối chiếu</span>
<span className="text-lg font-kanji text-on-surface">笑</span>
</div>
<span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold">
                  Bẫy: 86%
                </span>
</div>
<p className="text-[11px] text-on-surface leading-normal">
<strong>咲 (さく):</strong> Gắn liền hoa cỏ (桜が咲く - Hoa đào nở).<br />
<strong>笑 (わらう):</strong> Có bộ Trúc (竹), chỉ tiếng cười người (声を上げて笑う).
              </p>
</div>
{/*  Confusion Item 2: 咲く vs 咲かせる  */}
<div className="bg-[#FAF7F5] border border-border-subtle p-3 rounded-xl flex flex-col gap-1.5">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-on-surface">咲く vs 咲かせる</span>
<span className="px-2 py-0.5 rounded bg-secondary/50 text-secondary-dark border border-secondary text-[10px] font-bold">
                  Ngữ pháp N3
                </span>
</div>
<p className="text-[11px] text-on-surface leading-normal">
<strong>花が咲く:</strong> Tự động từ (Trợ từ が hoa tự bung).<br />
<strong>花を咲かせる:</strong> Tha động từ / Ẩn dụ "làm nở rộ tài năng" (Trợ từ を).
              </p>
</div>
</div>
</div>
</div>
</main>
</div>


    </div>
  
</CmsShell>
);
}
