import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function VocabularyEditor() {
  const { pathname } = useLocation();
  return (
    <CmsShell pathname={pathname} breadcrumb="Từ vựng">
<div className="bg-background font-sans text-text antialiased min-h-screen" data-page="VocabularyEditor" data-shell-unified="1">


{/*  Left Sidebar (Fixed 260px)  */}





{/*  Main Container (pl-0)  */}


<div className="pl-0">
{/*  Topbar (Fixed 1440px compatible)  */}

{/*  Main Content Area Desktop 1440px Canvas  */}
<main className="w-full pt-0 min-h-screen px-8 py-7 max-w-[1440px] mx-auto">
<p role="status">Mục này chưa có dữ liệu.</p>

{/*  Breadcrumb & Top Action Header  */}
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
<div className="flex flex-col gap-1.5">
<nav className="flex items-center gap-1.5 text-text-muted text-[12px] font-medium">
<span className="hover:text-primary transition-colors cursor-pointer">Kho học liệu</span>
<span className="material-symbols-outlined text-[13px] text-text-subtle">chevron_right</span>
<span className="hover:text-primary transition-colors cursor-pointer">—</span>
<span className="material-symbols-outlined text-[13px] text-text-subtle">chevron_right</span>
<span className="text-primary font-semibold bg-primary-light border border-secondary px-2 py-0.5 rounded text-[11px]">—</span>
</nav>
<div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
<h1 className="text-[26px] font-bold text-text tracking-tight flex items-center gap-2">
              Biên tập Từ vựng: <span className="text-primary font-extrabold">—</span>
</h1>
<span className="text-[16px] text-text-muted font-medium">
              —
            </span>
</div>
{/*  Tags  */}
<div className="flex flex-wrap items-center gap-2 pt-0.5">
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/50 text-text font-medium text-[12px] border border-secondary">
<span className="material-symbols-outlined text-[14px] text-primary">local_florist</span>
              —
            </span>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-card border border-border text-text-muted font-medium text-[12px]">
<span className="material-symbols-outlined text-[14px] text-primary">account_tree</span>
              —
            </span>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-light text-success font-medium text-[12px] border border-success/20">
<span className="material-symbols-outlined text-[14px]">verified</span>
              Đã kiểm định bản địa
            </span>
</div>
</div>
{/*  Top Action Buttons  */}
<div className="flex items-center gap-2.5 self-start lg:self-center">
<button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-card border border-border text-text text-[13px] font-semibold hover:border-primary hover:text-primary transition-all shadow-xs" type="button">
<span className="material-symbols-outlined text-primary text-[18px]">volume_up</span>
<span>Nghe phát âm</span>
</button>
<button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-card border border-border text-text text-[13px] font-semibold hover:border-secondary transition-all shadow-xs" type="button">
<span className="material-symbols-outlined text-[18px] text-text-subtle">bookmark_add</span>
<span>Xuất bản vào Sổ tay</span>
</button>
<button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-bold hover:bg-primary-dark transition-all shadow-sm shadow-primary/20" type="button">
<span className="material-symbols-outlined text-[18px]">save</span>
<span>Lưu thay đổi Từ vựng</span>
</button>
</div>
</div>
{/*  BỐ CỤC ĐA CỘT KHOA HỌC: 3 CỘT (Cột 1: 4 cols | Cột 2: 4 cols | Cột 3: 4 cols)  */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
{/*  CỘT 1: Phân tích cấu tạo từ Kanji, định nghĩa chuẩn học thuật & Mạng lưới từ vựng (4 cols)  */}
<div className="xl:col-span-4 flex flex-col gap-5">
{/*  1.1 Chi tiết Kanji & Cấu tạo phức  */}
<div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
<div className="flex items-center justify-between pb-3 border-b border-border/80">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">auto_stories</span>
<h2 className="text-[16px] font-bold text-text">Cấu tạo & Phân tích Từ vị</h2>
</div>
<span className="text-[11px] font-bold text-primary bg-primary-light border border-secondary/60 px-2 py-0.5 rounded-full uppercase">Linguistic</span>
</div>
{/*  Big Kanji Card  */}
<div className="p-4 rounded-xl bg-background border border-border/80 flex flex-col items-center justify-center text-center">
<span className="text-[11px] font-bold text-text-subtle uppercase tracking-wider mb-1">Chữ Hán & Furigana</span>
<div className="my-1">
<ruby className="text-[34px] font-extrabold text-primary tracking-wide">
                  —<rt className="text-[13px] font-bold text-text-muted">—</rt>—<rt className="text-[13px] font-bold text-text-muted">—</rt>—
                </ruby>
</div>
<div className="text-[12px] text-text-muted">
                Rômaji: <span className="font-semibold text-text">sakimidareru</span>
</div>
</div>
{/*  Component Breakdown  */}
<div className="p-3.5 rounded-xl bg-background border border-border/80 flex flex-col gap-2.5">
<div className="flex items-center justify-between">
<span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">—</span>
<span className="text-[11px] font-semibold text-success bg-success-light border border-success/20 px-2 py-0.2 rounded-full">—</span>
</div>
<div className="flex items-center gap-2">
<div className="flex-1 p-2.5 rounded-lg bg-card border border-border text-center shadow-2xs">
<div className="text-[14px] font-bold text-text">—</div>
<div className="text-[11px] text-text-subtle">Nở hoa, hé nở</div>
</div>
<span className="text-[16px] text-primary font-extrabold">+</span>
<div className="flex-1 p-2.5 rounded-lg bg-card border border-border text-center shadow-2xs">
<div className="text-[14px] font-bold text-text">—</div>
<div className="text-[11px] text-text-subtle">Bung tỏa, hỗn độn</div>
</div>
</div>
<p className="text-[12px] text-text-muted leading-relaxed pt-1">—</p>
</div>
{/*  Academic Definition & Nuance  */}
<div className="space-y-3 pt-1">
<div>
<label className="text-[12px] font-bold text-text block mb-1">Nghĩa tiếng Việt chuẩn học thuật:</label>
<div className="p-3 rounded-lg bg-primary-light/40 border border-secondary/60 text-[13px] font-medium text-text leading-relaxed">—</div>
</div>
<div>
<label className="text-[12px] font-bold text-text flex items-center gap-1 mb-1">
<span>Sắc thái ngữ cảnh & Văn hóa:</span>
<span className="material-symbols-outlined text-primary text-[15px]">info</span>
</label>
<div className="p-3 rounded-lg bg-background border border-border text-[12px] text-text-muted leading-relaxed">
                  —
                </div>
</div>
</div>
</div>
{/*  1.2 Mạng lưới từ vựng & Collocations  */}
<div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-3.5">
<div className="flex items-center justify-between pb-2 border-b border-border/80">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">hub</span>
<h2 className="text-[15px] font-bold text-text">Mạng lưới Từ vị & Cụm từ</h2>
</div>
<span className="text-[11px] font-semibold text-text-muted">—</span>
</div>
{/*  Từ đồng nghĩa  */}
<div className="p-3 rounded-lg bg-background border border-border/70">
<div className="flex items-center gap-1.5 mb-2">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="text-[12px] font-bold text-text">Từ đồng nghĩa gần nghĩa</span>
</div>
<div className="grid grid-cols-2 gap-2">
<div className="p-2 rounded bg-card border border-border">
<div className="text-[12px] font-bold text-primary">—</div>
<div className="text-[11px] text-text-subtle">—</div>
</div>
<div className="p-2 rounded bg-card border border-border">
<div className="text-[12px] font-bold text-primary">—</div>
<div className="text-[11px] text-text-subtle">Khoe sắc rực rỡ</div>
</div>
</div>
</div>
{/*  Cụm Collocations  */}
<div className="p-3 rounded-lg bg-background border border-border/70">
<div className="flex items-center gap-1.5 mb-2">
<span className="w-2 h-2 rounded-full bg-secondary-dark"></span>
<span className="text-[12px] font-bold text-text">Cụm kết hợp hay gặp (Collocations)</span>
</div>
<div className="space-y-1.5 text-[12px]">
<div className="flex items-center justify-between p-1.5 rounded bg-card border border-border">
<span className="font-bold text-text">—</span>
<span className="text-text-subtle text-[11px]">Hoa anh đào nở bung tỏa</span>
</div>
<div className="flex items-center justify-between p-1.5 rounded bg-card border border-border">
<span className="font-bold text-text">—</span>
<span className="text-text-subtle text-[11px]">Trăm hoa đua nở</span>
</div>
<div className="flex items-center justify-between p-1.5 rounded bg-card border border-border">
<span className="font-bold text-text">—</span>
<span className="text-text-subtle text-[11px]">Bao trùm khắp sân</span>
</div>
</div>
</div>
</div>
</div>
{/*  CỘT 2: Pitch Accent Studio, Audio phát âm và Thẻ Flashcard hình ảnh & SRS (4 cols)  */}
<div className="xl:col-span-4 flex flex-col gap-5">
{/*  2.1 Pitch Accent Studio  */}
<div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
<div className="flex items-center justify-between pb-3 border-b border-border/80">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">graphic_eq</span>
<h2 className="text-[16px] font-bold text-text">Pitch Accent Studio</h2>
</div>
<span className="flex items-center gap-1 text-[11px] font-semibold text-success">
<span className="w-2 h-2 rounded-full bg-success"></span> Chuẩn Tokyo
              </span>
</div>
<div className="p-3.5 rounded-xl bg-background border border-border/80 flex flex-col gap-3">
<div className="flex items-center justify-between">
<span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">—</span>
<span className="text-[11px] font-mono text-primary font-bold bg-primary-light px-2 py-0.5 rounded border border-secondary">—</span>
</div>
{/*  Pitch Accent Wave Overlay  */}
<div className="p-3 bg-card border border-border rounded-lg shadow-2xs flex flex-col items-center">
<div className="w-full flex justify-between items-end h-12 px-3 relative">
<svg className="absolute inset-0 w-full h-full pointer-events-none text-primary" preserveAspectRatio="none" viewBox="0 0 200 50">
<path d="" fill="none" stroke="currentColor" strokeDasharray="0" strokeWidth="2.5"></path>
<circle cx="20" cy="38" fill="currentColor" r="3.5"></circle>
<circle cx="60" cy="15" fill="currentColor" r="3.5"></circle>
<circle cx="100" cy="15" fill="currentColor" r="3.5"></circle>
<circle cx="140" cy="15" fill="currentColor" r="3.5"></circle>
<circle cx="180" cy="38" fill="currentColor" r="3.5"></circle>
</svg>
</div>
<div className="w-full flex justify-between text-center pt-2 text-[11px] font-bold text-text border-t border-border/60 mt-1">
<span className="flex-1 text-text-subtle">Sa (L)</span>
<span className="flex-1 text-primary">Ki (H)</span>
<span className="flex-1 text-primary">Mi (H)</span>
<span className="flex-1 text-primary">Da (H)</span>
<span className="flex-1 text-text-subtle">Re-ru (L)</span>
</div>
</div>
{/*  Audio voice artist selection  */}
<div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center text-primary font-bold text-[12px]">
                    MY
                  </div>
<div className="flex flex-col">
<span className="text-[12px] font-bold text-text leading-tight">Mayumi Sensei</span>
<span className="text-[10px] text-text-subtle leading-tight">—</span>
</div>
</div>
<button aria-label="Play recording" className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs hover:bg-primary-dark transition-all" type="button">
<span className="material-symbols-outlined text-[18px]">play_arrow</span>
</button>
</div>
{/*  Recording & Upload actions  */}
<div className="grid grid-cols-2 gap-2">
<button className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-card border border-border hover:border-primary text-[11px] font-semibold text-text transition-colors" type="button">
<span className="material-symbols-outlined text-[15px] text-primary">mic</span>
<span>Ghi âm BTV</span>
</button>
<button className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-card border border-border hover:border-primary text-[11px] font-semibold text-text transition-colors" type="button">
<span className="material-symbols-outlined text-[15px] text-primary">cloud_upload</span>
<span>Tải file FLAC</span>
</button>
</div>
</div>
</div>
{/*  2.2 Thẻ Flashcard Hình ảnh  */}
<div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-3.5">
<div className="flex items-center justify-between pb-2 border-b border-border/80">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">style</span>
<h2 className="text-[16px] font-bold text-text">Thẻ Flashcard Hình ảnh</h2>
</div>
<span className="text-[11px] font-semibold bg-secondary/50 text-text border border-secondary px-2 py-0.5 rounded-full">SRS Card</span>
</div>
{/*  Image preview  */}
<div className="relative w-full h-40 rounded-xl overflow-hidden border border-border group">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="A breathtaking view of blooming cherry blossoms in Kyoto during spring, with pink petals scattered along an old stone path next to a traditional Japanese temple pagoda, soft golden sunlight filtering through delicate blossom branches, highly detailed, tranquil Japanese aesthetic with pastel rose and deep floral tones."   src="/empty-avatar.svg" />
<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
<div className="text-white text-[13px] font-bold drop-shadow">
                  Hoa anh đào phủ kín cố đô Kyoto
                </div>
</div>
<button aria-label="Change photo" className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/90 backdrop-blur border border-border text-text hover:text-primary transition-colors" type="button">
<span className="material-symbols-outlined text-[16px]">photo_camera</span>
</button>
</div>
{/*  Card Front / Back Configuration  */}
<div className="space-y-2">
<div>
<span className="text-[11px] font-bold text-text-subtle uppercase">Mặt trước thẻ:</span>
<div className="mt-0.5 px-3 py-1.5 rounded-lg bg-background border border-border text-[15px] font-bold text-primary">
                  —
                </div>
</div>
<div>
<span className="text-[11px] font-bold text-text-subtle uppercase">Gợi ý mặt sau:</span>
<div className="mt-0.5 px-3 py-1.5 rounded-lg bg-background border border-border text-[12px] text-text">
                  —
                </div>
</div>
</div>
</div>
{/*  2.3 Thống kê SRS thu gọn  */}
<div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3">
<div className="flex items-center justify-between pb-2 border-b border-border/80">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[19px]">insights</span>
<h3 className="text-[14px] font-bold text-text">Thống kê Ghi nhớ SRS</h3>
</div>
<span className="text-[11px] text-text-subtle">Real-time</span>
</div>
<div className="grid grid-cols-2 gap-2.5">
<div className="p-2.5 rounded-lg bg-background border border-border">
<span className="text-[11px] text-text-subtle block">Học viên nạp</span>
<span className="text-[20px] font-bold text-primary">—</span>
<span className="text-[10px] text-success font-semibold flex items-center gap-0.5 mt-0.5">
<span className="material-symbols-outlined text-[13px]">trending_up</span> —
                </span>
</div>
<div className="p-2.5 rounded-lg bg-background border border-border">
<span className="text-[11px] text-text-subtle block">Tỷ lệ đúng Quiz</span>
<span className="text-[20px] font-bold text-text">—</span>
<span className="text-[10px] text-primary font-semibold flex items-center gap-0.5 mt-0.5">
<span className="material-symbols-outlined text-[13px]">done_all</span> —
                </span>
</div>
</div>
{/*  Multi-bar retention  */}
<div className="pt-1">
<div className="flex justify-between text-[11px] text-text-muted mb-1 font-medium">
<span>Phân bổ ghi nhớ Spaced Repetition</span>
<span className="text-primary font-bold">—</span>
</div>
<div className="w-full h-2 rounded-full bg-border overflow-hidden flex">
<div className="h-full bg-red-400" style={{ width: "0%" }}></div>
<div className="h-full bg-secondary-dark" style={{ width: "0%" }}></div>
<div className="h-full bg-primary" style={{ width: "0%" }}></div>
</div>
</div>
</div>
</div>
{/*  CỘT 3: Ví dụ Ngữ cảnh thực tế & Câu hỏi trắc nghiệm đính kèm (4 cols)  */}
<div className="xl:col-span-4 flex flex-col gap-5">
{/*  3.1 Ví dụ ngữ cảnh thực tế  */}
<div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
<div className="flex items-center justify-between pb-3 border-b border-border/80">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">chat_bubble</span>
<h2 className="text-[16px] font-bold text-text">Ví dụ Ngữ cảnh (3 câu)</h2>
</div>
<button className="inline-flex items-center gap-1 text-primary text-[12px] font-bold hover:underline" type="button">
<span className="material-symbols-outlined text-[15px]">add_circle</span>
                Thêm ví dụ
              </button>
</div>
<div className="flex flex-col gap-3">
{/*  Example 1  */}
<div className="p-3.5 rounded-xl bg-background border border-border hover:border-secondary transition-all">
<div className="flex items-start justify-between gap-2 mb-1">
<div className="text-[13px] font-bold text-text leading-snug">
                    —<span className="text-primary underline decoration-secondary decoration-2 font-extrabold">—</span> —
                  </div>
<button aria-label="Play audio" className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0 hover:bg-primary hover:text-white transition-all shadow-2xs">
<span className="material-symbols-outlined text-[16px]">volume_up</span>
</button>
</div>
<div className="text-[11px] text-secondary-dark italic mb-1">
                  —
                </div>
<div className="text-[12px] text-text-muted leading-relaxed">—</div>
<div className="flex items-center gap-2 pt-2 mt-1 border-t border-border/60 text-[10px] text-text-subtle">
<span className="px-1.5 py-0.5 rounded bg-card border border-border font-medium">—</span>
<span>•</span>
<span>Tản văn Kyoto</span>
</div>
</div>
{/*  Example 2  */}
<div className="p-3.5 rounded-xl bg-background border border-border hover:border-secondary transition-all">
<div className="flex items-start justify-between gap-2 mb-1">
<div className="text-[13px] font-bold text-text leading-snug">
                    —<span className="text-primary underline decoration-secondary decoration-2 font-extrabold">—</span>。
                  </div>
<button aria-label="Play audio" className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0 hover:bg-primary hover:text-white transition-all shadow-2xs">
<span className="material-symbols-outlined text-[16px]">volume_up</span>
</button>
</div>
<div className="text-[11px] text-secondary-dark italic mb-1">
                  —
                </div>
<div className="text-[12px] text-text-muted leading-relaxed">—</div>
<div className="flex items-center gap-2 pt-2 mt-1 border-t border-border/60 text-[10px] text-text-subtle">
<span className="px-1.5 py-0.5 rounded bg-card border border-border font-medium">Hội thoại mô tả</span>
<span>•</span>
<span>—</span>
</div>
</div>
{/*  Example 3  */}
<div className="p-3.5 rounded-xl bg-background border border-border hover:border-secondary transition-all">
<div className="flex items-start justify-between gap-2 mb-1">
<div className="text-[13px] font-bold text-text leading-snug">
                    —<span className="text-primary underline decoration-secondary decoration-2 font-extrabold">—</span>—
                  </div>
<button aria-label="Play audio" className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0 hover:bg-primary hover:text-white transition-all shadow-2xs">
<span className="material-symbols-outlined text-[16px]">volume_up</span>
</button>
</div>
<div className="text-[11px] text-secondary-dark italic mb-1">
                  —
                </div>
<div className="text-[12px] text-text-muted leading-relaxed">—</div>
<div className="flex items-center gap-2 pt-2 mt-1 border-t border-border/60 text-[10px] text-text-subtle">
<span className="px-1.5 py-0.5 rounded bg-card border border-border font-medium">Ký sự bản tin</span>
<span>•</span>
<span>—</span>
</div>
</div>
</div>
</div>
{/*  3.2 Câu hỏi Trắc nghiệm đính kèm  */}
<div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
<div className="flex items-center justify-between pb-3 border-b border-border/80">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[22px]">quiz</span>
<h2 className="text-[16px] font-bold text-text">JLPT Mock Question</h2>
</div>
<span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-[11px]">—</span>
</div>
<div className="p-3.5 rounded-xl bg-background border border-border flex flex-col gap-3">
<div className="flex items-start gap-2">
<span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-[11px] shrink-0 mt-0.5">—</span>
<div className="text-[13px] font-bold text-text leading-snug">
                  —
                </div>
</div>
{/*  Options  */}
<div className="space-y-1.5 text-[12px]">
<div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between opacity-70">
<span>—</span>
<span className="text-[11px] text-text-subtle">Không có từ này</span>
</div>
{/*  Correct choice  */}
<div className="p-2 rounded-lg bg-primary-light border border-primary text-text font-bold flex items-center justify-between shadow-2xs">
<div className="flex items-center gap-1.5 text-primary">
<span className="material-symbols-outlined text-[17px]">check_circle</span>
<span>—</span>
</div>
<span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded font-semibold">Đáp án chuẩn</span>
</div>
<div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between opacity-70">
<span>—</span>
<span className="text-[11px] text-text-subtle">—</span>
</div>
<div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between opacity-70">
<span>—</span>
<span className="text-[11px] text-text-subtle">Không tồn tại</span>
</div>
</div>
{/*  Pedagogical Note  */}
<div className="p-3 rounded-lg bg-card border border-border text-[11px] text-text-muted leading-relaxed">
<div className="flex items-center gap-1 font-bold text-primary mb-1">
<span className="material-symbols-outlined text-[14px]">school</span>
<span>Giải thích học thuật JLPT:</span>
</div>
                — <span className="font-semibold text-text">—</span> (toàn bề mặt). Lựa chọn <strong className="text-primary font-bold">—</strong> —
              </div>
</div>
</div>
</div>
</div>
{/*  Audit Footer Note  */}
<footer className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[12px] text-text-subtle gap-2">
<div className="flex items-center gap-2">
<span>Lần sửa đổi cuối: <strong>—</strong></span>
<span>•</span>
<span>Biên tập viên: <strong className="text-text">Kenji Tanaka (Tokyo Academic Team)</strong></span>
</div>
<div className="flex items-center gap-3">
<span className="flex items-center gap-1 text-success font-medium">
<span className="w-1.5 h-1.5 rounded-full bg-success"></span> —
          </span>
<span className="text-text-subtle">—</span>
</div>
</footer>
</main>
</div>


    </div>

</CmsShell>
);
}
