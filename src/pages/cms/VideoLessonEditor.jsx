import { useEffect } from 'react';
import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function VideoLessonEditor() {
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
      // Interactive play toggle button
          document.getElementById('studio-play-trigger')?.addEventListener('click', function() {
            const icon = this.querySelector('.material-symbols-outlined');
            if (icon) {
              if (icon.textContent.trim() === 'play_arrow') {
                icon.textContent = 'pause';
              } else {
                icon.textContent = 'play_arrow';
              }
            }
          });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <CmsShell pathname={pathname} breadcrumb="Video">
<div className="bg-background text-text font-sans antialiased min-h-screen" data-page="VideoLessonEditor" data-shell-unified="1">


{/*  Left Sidebar (Kept synchronized)  */}





{/*  Main Container Offset for Sidebar  */}


<div className="pl-0 min-h-screen flex flex-col">
{/*  Topbar (Kept synchronized)  */}

{/*  Page Content Container (Standard 1440px desktop frame)  */}
<main className="flex-1 w-full max-w-[1440px] mx-auto px-8 py-6">
{/*  Top Breadcrumb & Workflow Status Header  */}
<div className="w-full pb-6 mb-2 border-b border-card-border">
{/*  Breadcrumb  */}
<nav className="flex items-center gap-1.5 text-text-muted text-xs mb-3">
<span className="hover:text-primary cursor-pointer transition-colors">Kho học liệu</span>
<span className="material-symbols-outlined text-[14px] text-text-subtle">chevron_right</span>
<span className="hover:text-primary cursor-pointer transition-colors">JLPT N3</span>
<span className="material-symbols-outlined text-[14px] text-text-subtle">chevron_right</span>
<span className="hover:text-primary cursor-pointer transition-colors">Ngữ pháp</span>
<span className="material-symbols-outlined text-[14px] text-text-subtle">chevron_right</span>
<span className="hover:text-primary cursor-pointer transition-colors">Bài 07: Cấu trúc わけにはいかない</span>
<span className="material-symbols-outlined text-[14px] text-text-subtle">chevron_right</span>
<span className="text-primary font-semibold">Quản lý Video & Phụ đề</span>
</nav>
{/*  Main Title Bar & Action Buttons  */}
<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
<div className="flex flex-col gap-1.5">
<div className="flex flex-wrap items-center gap-2 mb-0.5">
<span className="px-2.5 py-0.5 rounded-full bg-accent-light border border-accent text-primary text-[11px] font-bold flex items-center gap-1.5">
<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                JLPT N3 • Video 4K Master
              </span>
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-bg border border-tertiary/30 text-tertiary text-[11px] font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[13px]">verified</span>
                Đã xuất bản
              </span>
<span className="px-2.5 py-0.5 rounded-md bg-card border border-card-border text-text-muted text-[11px] tracking-wider font-mono">
                ID: N3-BUN-07-VID
              </span>
</div>
<h1 className="text-2xl lg:text-[28px] text-text font-bold tracking-tight">
              Quản lý Video Bài giảng & Phụ đề Song ngữ
            </h1>
<div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
<span className="flex items-center gap-1">
<span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                Thời lượng: <strong className="text-text font-semibold">14:20 phút</strong>
</span>
<span className="w-1 h-1 rounded-full bg-card-border"></span>
<span className="flex items-center gap-1">
<span className="material-symbols-outlined text-[15px] text-primary">school</span>
                Giảng viên: <strong className="text-text font-semibold">Mayumi Sensei (Tokyo Master)</strong>
</span>
<span className="w-1 h-1 rounded-full bg-card-border"></span>
<span className="flex items-center gap-1">
<span className="material-symbols-outlined text-[15px] text-text-subtle">update</span>
                Tải lên: Hôm nay, 11:20
              </span>
</div>
</div>
{/*  Quick Action Buttons  */}
<div className="flex items-center gap-2.5 self-start xl:self-center">
<button className="px-4 py-2 rounded-xl bg-card border border-card-border hover:border-primary/50 text-text font-semibold text-xs transition-all flex items-center gap-2 shadow-sm hover:shadow">
<span className="material-symbols-outlined text-[18px] text-text-muted">play_circle</span>
<span>Xem trước bài giảng</span>
</button>
<button className="px-4 py-2 rounded-xl bg-accent-light border border-accent/60 hover:bg-accent/20 text-primary font-semibold text-xs transition-all flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">cloud_upload</span>
<span>Thay thế Video Master (4K)</span>
</button>
<button className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all shadow-[0_4px_16px_rgba(224,90,122,0.35)] flex items-center gap-2 active:scale-95">
<span className="material-symbols-outlined text-[18px]">save</span>
<span>Lưu cấu hình Media</span>
</button>
</div>
</div>
</div>
{/*  Multi-column Workspace Layout:
           LEFT COLUMN (7 cols): 16:9 Video Player Studio & Lesson Chapters / Timestamps
           RIGHT COLUMN (5 cols): Bilingual Subtitle Sync Studio, CDN Infrastructure & Tokyo Audio Quality  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12 items-start">
{/*  LEFT COLUMN (col-span-7)  */}
<div className="lg:col-span-7 flex flex-col gap-6">
{/*  1. Video Player Studio 16:9  */}
<section className="bg-card rounded-2xl border border-card-border shadow-[0_4px_20px_rgba(45,40,42,0.04)] overflow-hidden">
{/*  16:9 Video Screen  */}
<div className="relative w-full aspect-video bg-[#1F1A1C] flex items-center justify-center group overflow-hidden select-none">
{/*  Video Teacher Image  */}
<img className="w-full h-full object-cover" data-alt="Japanese sensei instructor Mayumi standing beside an elegant digital blackboard inside a bright minimalist Tokyo studio, teaching JLPT N3 grammar with soft cherry blossom lighting and cinematic composition" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZdmffsObtf74rejWz_vYuQN7OcpNpksBg_A4H9isohb4n_gEci43jIUv7BvU0g-aDyJltnfUsLa9p5JhBbpsRwh9pOo7JuhVwgw0VvVDpBfVoS1m870Efa80rrcGUX6t0CgEs_txi5I8uRwMEDOUXflyrmCJsi73dIl-v3pkJHp1svnBuHhmyWu09oJ_MetAJrMyKhGssh31jGX0-6VGqSdeuz7qd3r3AadsbZv1RCyAXIHV6yQJR" />
{/*  Gradient Scrim Overlay  */}
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none"></div>
{/*  Top Overlay Badges  */}
<div className="absolute top-3.5 left-4 right-4 flex items-center justify-between pointer-events-none">
<div className="flex items-center gap-2 pointer-events-auto">
<span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 shadow">
<span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    4K ULTRA HD • 60fps • HEVC
                  </span>
<span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white/90 text-[11px]">
                    Bitrate: 18.4 Mbps
                  </span>
</div>
<div className="flex items-center gap-2 pointer-events-auto">
<span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5">
<span className="material-symbols-outlined text-[15px] text-accent">local_florist</span>
                    RikiPath Studio Master
                  </span>
</div>
</div>
{/*  Central Play Trigger  */}
<button className="absolute z-10 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_24px_rgba(224,90,122,0.55)] transform transition-transform group-hover:scale-110 active:scale-95" id="studio-play-trigger">
<span className="material-symbols-outlined text-[32px] ml-0.5">play_arrow</span>
</button>
{/*  Video Subtitle Scrim Overlay Bar  */}
<div className="absolute bottom-14 left-4 right-4 flex flex-col items-center justify-center text-center pointer-events-none">
<div className="inline-block px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-lg max-w-xl">
<p className="text-sm font-medium text-white leading-snug">
                    明日は大事な会議があるから、休む<span className="text-accent font-bold underline decoration-primary decoration-2 underline-offset-4">わけにはいかない</span>んです。
                  </p>
<p className="text-xs text-white/80 mt-0.5">
                    (Vì ngày mai có cuộc họp quan trọng, tôi tuyệt đối không thể nghỉ được.)
                  </p>
</div>
</div>
{/*  Video Control Deck  */}
<div className="absolute bottom-0 left-0 right-0 px-4 pb-2.5 pt-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-col gap-1.5">
{/*  Timeline Scrubber with Primary Color Active Track  */}
<div className="relative w-full h-1.5 hover:h-2.5 bg-white/30 rounded-full cursor-pointer flex items-center group/scrubber transition-all">
{/*  Active Progress (Primary #E05A7A)  */}
<div className="h-full bg-primary rounded-full relative" style={{ width: "29.6%" }}>
<div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow ring-2 ring-primary transform scale-100"></div>
</div>
{/*  Markers / Chapters  */}
<div className="absolute left-0 top-0 bottom-0 w-1 bg-white/90 rounded-full" title="00:00 - Khái quát"></div>
<div className="absolute left-[26.1%] top-0 bottom-0 w-1.5 bg-accent rounded-full" title="03:45 - Công thức ngữ pháp"></div>
<div className="absolute left-[57.2%] top-0 bottom-0 w-1.5 bg-accent rounded-full" title="08:12 - Tình huống giao tiếp"></div>
<div className="absolute left-[87.2%] top-0 bottom-0 w-2 h-2 -top-0.5 bg-accent rounded-full ring-2 ring-primary" title="12:30 - Quiz tương tác tự động"></div>
</div>
{/*  Controls Bottom Row  */}
<div className="flex items-center justify-between text-white/95 pt-0.5">
<div className="flex items-center gap-2.5">
<button className="hover:text-accent transition-colors">
<span className="material-symbols-outlined text-[22px]">play_arrow</span>
</button>
<button className="hover:text-accent transition-colors">
<span className="material-symbols-outlined text-[19px]">replay_10</span>
</button>
<button className="hover:text-accent transition-colors">
<span className="material-symbols-outlined text-[19px]">forward_10</span>
</button>
<div className="flex items-center gap-1 text-xs ml-1 font-mono font-medium">
<span className="text-white font-semibold">04:15</span>
<span className="text-white/50">/</span>
<span className="text-white/70">14:20</span>
</div>
<div className="flex items-center gap-1.5 ml-2">
<span className="material-symbols-outlined text-[19px] hover:text-accent cursor-pointer">volume_up</span>
<div className="w-14 h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer">
<div className="h-full bg-white w-3/4 rounded-full"></div>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<button className="px-2 py-0.5 rounded bg-primary text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm">
<span className="material-symbols-outlined text-[13px]">subtitles</span>
<span>Song ngữ JA/VI</span>
</button>
<button className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[11px] font-medium text-white">
                      1.0x
                    </button>
<button className="p-1 hover:text-accent transition-colors">
<span className="material-symbols-outlined text-[19px]">settings</span>
</button>
<button className="p-1 hover:text-accent transition-colors">
<span className="material-symbols-outlined text-[19px]">fullscreen</span>
</button>
</div>
</div>
</div>
</div>
{/*  Video File Metadata Footer Strip  */}
<div className="p-3.5 bg-background border-t border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div className="flex items-center gap-3 min-w-0">
<div className="w-9 h-9 rounded-xl bg-accent-light border border-accent/40 flex items-center justify-center text-primary shrink-0">
<span className="material-symbols-outlined text-[20px]">video_file</span>
</div>
<div className="flex flex-col min-w-0">
<span className="text-xs font-bold text-text truncate">
                    Mayumi_Bun07_WakeNiwaIkanai_Master_v2.4.mp4
                  </span>
<span className="text-[11px] text-text-subtle">
                    1.42 GB • H.265 / HEVC • Stereo AAC 48kHz • 3840x2160 (16:9)
                  </span>
</div>
</div>
<div className="flex items-center gap-2 shrink-0">
<button className="px-2.5 py-1.5 rounded-lg bg-card border border-card-border hover:border-primary/40 text-text text-xs font-semibold transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[15px] text-primary">cloud_download</span>
<span>Tải file gốc</span>
</button>
<button className="px-2.5 py-1.5 rounded-lg bg-card border border-card-border hover:border-primary/40 text-text text-xs font-semibold transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[15px] text-text-muted">code</span>
<span>Lấy mã nhúng</span>
</button>
</div>
</div>
</section>
{/*  2. Timestamps & Lesson Chapters Section  */}
<section className="bg-card rounded-2xl border border-card-border p-5 shadow-[0_4px_20px_rgba(45,40,42,0.04)] flex flex-col gap-4">
<div className="flex items-center justify-between">
<div className="flex flex-col">
<h2 className="text-base text-text font-bold flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">bookmarks</span>
                  Mốc thời gian bài học (Timestamps - 4 mốc cốt lõi)
                </h2>
<p className="text-xs text-text-muted">
                  Phân đoạn bài học thành các chương mục để học viên tra cứu ngữ cảnh tức thời
                </p>
</div>
<button className="px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold transition-all shadow-[0_3px_10px_rgba(224,90,122,0.25)] flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">add_circle</span>
<span>Thêm mốc mới</span>
</button>
</div>
{/*  Auto Pause Quiz Toggle Banner  */}
<div className="p-3 rounded-xl bg-accent-light border border-accent/60 flex items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<span className="w-7 h-7 rounded-lg bg-card border border-accent text-primary flex items-center justify-center shrink-0 shadow-sm">
<span className="material-symbols-outlined text-[18px]">touch_app</span>
</span>
<div className="flex flex-col">
<span className="text-xs text-text font-bold">
                    Tự động dừng phát để làm Quiz tương tác tại mốc 12:30
                  </span>
<span className="text-[11px] text-text-muted">
                    Học viên phải hoàn thành câu hỏi phân biệt với ~わけがない trước khi mở khoá tiếp bài
                  </span>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer shrink-0">
<input checked className="sr-only peer" type="checkbox" />
<div className="w-10 h-5 bg-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/*  Timestamps List  */}
<div className="flex flex-col gap-2.5">
{/*  Item 1  */}
<div className="p-3 rounded-xl bg-background border border-card-border hover:border-accent transition-all flex items-center justify-between gap-3">
<div className="flex items-center gap-3 min-w-0">
<span className="px-2.5 py-1 rounded-lg bg-card border border-card-border text-text font-mono font-bold text-xs shrink-0">
                    00:00
                  </span>
<div className="flex flex-col min-w-0">
<span className="text-xs font-bold text-text truncate">
                      1. Khái quát ý nghĩa xã hội & tâm lý người Nhật
                    </span>
<span className="text-[11px] text-text-muted truncate">
                      Tâm thế gượng gạo, ràng buộc trách nhiệm công dân và bổn phận nội tâm
                    </span>
</div>
</div>
<div className="flex items-center gap-1 shrink-0">
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-primary transition-colors" title="Chạy tới mốc này">
<span className="material-symbols-outlined text-[17px]">play_arrow</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text transition-colors" title="Chỉnh sửa">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-red-600 transition-colors" title="Xóa">
<span className="material-symbols-outlined text-[17px]">delete</span>
</button>
</div>
</div>
{/*  Item 2 (Active highlighted with Accent/Primary)  */}
<div className="p-3 rounded-xl bg-accent-light/80 border-2 border-primary/40 shadow-sm flex items-center justify-between gap-3">
<div className="flex items-center gap-3 min-w-0">
<span className="px-2.5 py-1 rounded-lg bg-primary text-white font-mono font-bold text-xs shrink-0 shadow-sm">
                    03:45
                  </span>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-2">
<span className="text-xs font-bold text-text truncate">
                        2. Công thức V-る / V-ない + わけにはいかない
                      </span>
<span className="px-2 py-0.5 rounded bg-accent text-primary text-[10px] font-bold">Đang xem</span>
</div>
<span className="text-[11px] text-text-muted truncate">
                      Phân tích kỹ lưỡng 2 dạng thể khẳng định và phủ định kép
                    </span>
</div>
</div>
<div className="flex items-center gap-1 shrink-0">
<button className="p-1.5 rounded-lg bg-card text-primary shadow-sm border border-accent" title="Tạm dừng">
<span className="material-symbols-outlined text-[17px]">pause</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text transition-colors">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-red-600 transition-colors">
<span className="material-symbols-outlined text-[17px]">delete</span>
</button>
</div>
</div>
{/*  Item 3  */}
<div className="p-3 rounded-xl bg-background border border-card-border hover:border-accent transition-all flex items-center justify-between gap-3">
<div className="flex items-center gap-3 min-w-0">
<span className="px-2.5 py-1 rounded-lg bg-card border border-card-border text-text font-mono font-bold text-xs shrink-0">
                    08:12
                  </span>
<div className="flex flex-col min-w-0">
<span className="text-xs font-bold text-text truncate">
                      3. 5 Tình huống giao tiếp công sở thực tế (Business Nihongo)
                    </span>
<span className="text-[11px] text-text-muted truncate">
                      Gặp đối tác thương mại, xin phép về sớm và từ chối lời mời khéo léo
                    </span>
</div>
</div>
<div className="flex items-center gap-1 shrink-0">
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[17px]">play_arrow</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text transition-colors">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-red-600 transition-colors">
<span className="material-symbols-outlined text-[17px]">delete</span>
</button>
</div>
</div>
{/*  Item 4 (Quiz Auto-Pause Badge)  */}
<div className="p-3 rounded-xl bg-background border border-card-border hover:border-accent transition-all flex items-center justify-between gap-3">
<div className="flex items-center gap-3 min-w-0">
<span className="px-2.5 py-1 rounded-lg bg-accent-light border border-accent text-primary font-mono font-bold text-xs shrink-0 flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">quiz</span>
                    12:30
                  </span>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-2">
<span className="text-xs font-bold text-text truncate">
                        4. Điểm bẫy dễ nhầm với ~わけがない & Bài tập nhanh
                      </span>
<span className="px-2 py-0.5 rounded bg-tertiary-bg border border-tertiary/30 text-tertiary text-[10px] font-bold">Quiz Auto-Pause</span>
</div>
<span className="text-[11px] text-text-muted truncate">
                      3 câu hỏi trắc nghiệm trực quan củng cố phản xạ trước khi kết thúc bài giảng
                    </span>
</div>
</div>
<div className="flex items-center gap-1 shrink-0">
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[17px]">play_arrow</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text transition-colors">
<span className="material-symbols-outlined text-[17px]">edit</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-red-600 transition-colors">
<span className="material-symbols-outlined text-[17px]">delete</span>
</button>
</div>
</div>
</div>
</section>
{/*  Version Commit History & Academic Feedback Panel  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{/*  Version History  */}
<section className="bg-card rounded-2xl border border-card-border p-4 shadow-[0_4px_20px_rgba(45,40,42,0.03)] flex flex-col gap-3">
<div className="flex items-center justify-between border-b border-card-border pb-2">
<h3 className="text-xs font-bold text-text flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">history</span>
                  Lịch sử Phiên bản (3)
                </h3>
<span className="text-[11px] text-text-subtle font-mono">Git media</span>
</div>
<div className="relative pl-5 flex flex-col gap-3 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-card-border">
<div className="relative flex flex-col gap-0.5">
<div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-primary ring-2 ring-accent"></div>
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-primary font-mono">v2.4 (Hiện tại)</span>
<span className="text-[10px] text-text-subtle">11:20</span>
</div>
<p className="text-[11px] text-text leading-tight">Cập nhật ví dụ thực tế số 5 theo yêu cầu chuyên môn.</p>
</div>
<div className="relative flex flex-col gap-0.5">
<div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-card-border"></div>
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-text font-mono">v2.3</span>
<span className="text-[10px] text-text-subtle">18/03</span>
</div>
<p className="text-[11px] text-text-muted leading-tight">Đồng bộ phụ đề AI Whisper và mốc dừng quiz.</p>
</div>
</div>
</section>
{/*  Director Feedback  */}
<section className="bg-card rounded-2xl border border-card-border p-4 shadow-[0_4px_20px_rgba(45,40,42,0.03)] flex flex-col gap-2.5">
<div className="flex items-center justify-between border-b border-card-border pb-2">
<h3 className="text-xs font-bold text-text flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">record_voice_over</span>
                  Ý kiến Hội đồng Đào tạo
                </h3>
</div>
<div className="flex items-center gap-2">
<img className="w-7 h-7 rounded-full object-cover border border-card-border" data-alt="Director Kenji portrait" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARv-9xtYNy2qtYLtgtVgrgg53MKGnIvN5eBRXpPH-hAejvxXrkWy7bUhL2xKxlPXUFT4dbMs5Mm2KC0z4joDr6jnDvlPsCGg0m1YCl-KwJWhyq8GvlPrJ2X8yd6jtC_1CQNh79HlEx3J7NA7sSgRhNOcvSwo7Tqx23N1_grqAY010W0oxBwDEvDeeRm4sSvVVu3llIfQaTnzgeEK1DhvdlnKAbdrSwvLiUYjOC_GpoRvoXNm8MGTQD" />
<div className="flex flex-col leading-tight">
<span className="text-xs font-bold text-text">Trưởng khoa Kenji</span>
<span className="text-[10px] text-tertiary font-semibold">Đã duyệt kiểm thử Tokyo</span>
</div>
</div>
<p className="text-[11px] text-text-muted italic bg-background p-2 rounded-lg border border-card-border leading-relaxed">
                “Ánh sáng và phát âm của Mayumi Sensei rất chuẩn, âm lượng đã giảm 3dB theo đúng quy chuẩn trường quay.”
              </p>
</section>
</div>
</div>
{/*  RIGHT COLUMN (col-span-5): Subtitles Sync Studio, CDN & Audio Infrastructure  */}
<div className="lg:col-span-5 flex flex-col gap-6">
{/*  1. Bilingual Subtitles Sync Studio  */}
<section className="bg-card rounded-2xl border border-card-border p-5 shadow-[0_4px_20px_rgba(45,40,42,0.04)] flex flex-col gap-4">
<div className="flex items-center justify-between pb-1 border-b border-card-border">
<div className="flex flex-col">
<h2 className="text-base text-text font-bold flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">subtitles</span>
                  Phụ đề Đa ngôn ngữ (Bilingual Sync Studio)
                </h2>
<p className="text-xs text-text-muted">
                  Đồng bộ Furigana & bản dịch nghĩa học thuật chuẩn JLPT N3
                </p>
</div>
<div className="flex items-center gap-1.5">
<button className="px-2.5 py-1 rounded-lg bg-background border border-card-border hover:border-primary/40 text-text text-xs font-semibold transition-colors flex items-center gap-1" title="Tự sửa Furigana">
<span className="material-symbols-outlined text-[15px] text-tertiary">auto_fix_high</span>
<span>Furigana</span>
</button>
<button className="px-2.5 py-1 rounded-lg bg-background border border-card-border hover:border-primary/40 text-text text-xs font-semibold transition-colors flex items-center gap-1" title="Xuất .SRT">
<span className="material-symbols-outlined text-[15px] text-primary">download</span>
<span>.SRT</span>
</button>
</div>
</div>
{/*  Sync Status Banner  */}
<div className="p-3 rounded-xl bg-background border border-card-border flex items-center justify-between gap-3">
<div className="flex items-center gap-2.5 min-w-0">
<div className="w-8 h-8 rounded-lg bg-tertiary-bg border border-tertiary/30 text-tertiary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[18px]">sync_saved_locally</span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1.5">
<span className="text-xs font-bold text-text font-mono truncate">n3_bun07_bilingual_sync.srt</span>
<span className="px-1.5 py-0.2 rounded bg-tertiary text-white text-[10px] font-bold">Khớp 100%</span>
</div>
<span className="text-[10px] text-text-subtle truncate">AI Whisper & Riki Align Engine v2.4</span>
</div>
</div>
<button className="px-3 py-1 rounded-lg bg-card border border-card-border hover:border-primary/40 text-primary text-xs font-semibold transition-colors flex items-center gap-1 shrink-0">
<span className="material-symbols-outlined text-[14px]">upload_file</span>
<span>Tải file mới</span>
</button>
</div>
{/*  Language Mode Tabs  */}
<div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-card-border">
<button className="flex-1 py-1.5 text-center rounded-lg bg-card border border-card-border text-primary font-bold text-xs shadow-sm">
                Song ngữ (.srt)
              </button>
<button className="flex-1 py-1.5 text-center rounded-lg text-text-muted hover:text-text font-medium text-xs transition-colors">
                Tiếng Nhật (Kanji)
              </button>
<button className="flex-1 py-1.5 text-center rounded-lg text-text-muted hover:text-text font-medium text-xs transition-colors">
                Tiếng Việt (Chuẩn)
              </button>
</div>
{/*  Subtitle Cues Editor Table  */}
<div className="border border-card-border rounded-xl overflow-hidden bg-card">
{/*  Subtitle Header  */}
<div className="grid grid-cols-12 bg-background px-3.5 py-2 border-b border-card-border text-[11px] font-bold text-text-subtle uppercase tracking-wider">
<div className="col-span-3">Mốc giờ</div>
<div className="col-span-8">Lời thoại & Bản dịch song song</div>
<div className="col-span-1 text-right">Lệnh</div>
</div>
{/*  Cue List  */}
<div className="divide-y divide-card-border flex flex-col max-h-[380px] overflow-y-auto">
{/*  Cue 1: Active Playing Cue  */}
<div className="grid grid-cols-12 px-3.5 py-3 items-start gap-2 bg-accent-light/50 hover:bg-accent-light/80 transition-colors">
<div className="col-span-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent border border-primary/30 font-mono text-[11px] font-bold text-primary">
<span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                      03:45 - 03:52
                    </span>
</div>
<div className="col-span-8 flex flex-col gap-1">
<p className="text-xs font-bold text-text leading-snug">
                      明日は大事な会議があるから、休む<span className="text-primary font-extrabold bg-accent-light px-1 rounded">わけにはいかない</span>んです。
                    </p>
<p className="text-[11px] text-text-muted leading-tight">
                      Vì ngày mai có cuộc họp quan trọng, tôi tuyệt đối không thể nghỉ được.
                    </p>
</div>
<div className="col-span-1 flex flex-col items-end gap-1 text-text-subtle">
<button className="hover:text-primary transition-colors" title="Sửa"><span className="material-symbols-outlined text-[16px]">edit_note</span></button>
<button className="hover:text-red-600 transition-colors" title="Xóa"><span className="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
{/*  Cue 2  */}
<div className="grid grid-cols-12 px-3.5 py-3 items-start gap-2 hover:bg-background transition-colors">
<div className="col-span-3">
<span className="inline-flex items-center px-2 py-0.5 rounded bg-background border border-card-border font-mono text-[11px] font-semibold text-text-subtle">
                      03:53 - 04:02
                    </span>
</div>
<div className="col-span-8 flex flex-col gap-1">
<p className="text-xs font-medium text-text leading-snug">
                      ここで使う『<span className="text-primary font-bold">わけにはいかない</span>』は、社会的な責任や道徳心を表します。
                    </p>
<p className="text-[11px] text-text-muted leading-tight">
                      Cấu trúc được sử dụng ở đây thể hiện tinh thần trách nhiệm xã hội và chuẩn mực đạo đức.
                    </p>
</div>
<div className="col-span-1 flex flex-col items-end gap-1 text-text-subtle">
<button className="hover:text-primary transition-colors" title="Sửa"><span className="material-symbols-outlined text-[16px]">edit_note</span></button>
<button className="hover:text-red-600 transition-colors" title="Xóa"><span className="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
{/*  Cue 3  */}
<div className="grid grid-cols-12 px-3.5 py-3 items-start gap-2 hover:bg-background transition-colors">
<div className="col-span-3">
<span className="inline-flex items-center px-2 py-0.5 rounded bg-background border border-card-border font-mono text-[11px] font-semibold text-text-subtle">
                      04:03 - 04:12
                    </span>
</div>
<div className="col-span-8 flex flex-col gap-1">
<p className="text-xs font-medium text-text leading-snug">
                      単に「できない」と言うよりも、強い心理的な葛藤が含まれているのが特徴です。
                    </p>
<p className="text-[11px] text-text-muted leading-tight">
                      Điểm đặc trưng là biểu thị sự giằng xé nội tâm mạnh mẽ hơn là chỉ nói "không thể làm" đơn thuần.
                    </p>
</div>
<div className="col-span-1 flex flex-col items-end gap-1 text-text-subtle">
<button className="hover:text-primary transition-colors" title="Sửa"><span className="material-symbols-outlined text-[16px]">edit_note</span></button>
<button className="hover:text-red-600 transition-colors" title="Xóa"><span className="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
{/*  Cue 4  */}
<div className="grid grid-cols-12 px-3.5 py-3 items-start gap-2 hover:bg-background transition-colors">
<div className="col-span-3">
<span className="inline-flex items-center px-2 py-0.5 rounded bg-background border border-card-border font-mono text-[11px] font-semibold text-text-subtle">
                      04:13 - 04:22
                    </span>
</div>
<div className="col-span-8 flex flex-col gap-1">
<p className="text-xs font-medium text-text leading-snug">
                      例えば、風邪を引いても休めない時などによく使われます。
                    </p>
<p className="text-[11px] text-text-muted leading-tight">
                      Ví dụ, mẫu câu này thường được sử dụng khi bị cảm cúm nhưng vẫn không thể xin nghỉ việc.
                    </p>
</div>
<div className="col-span-1 flex flex-col items-end gap-1 text-text-subtle">
<button className="hover:text-primary transition-colors" title="Sửa"><span className="material-symbols-outlined text-[16px]">edit_note</span></button>
<button className="hover:text-red-600 transition-colors" title="Xóa"><span className="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
</div>
</div>
{/*  Add Subtitle Row Quick Trigger  */}
<button className="w-full py-2 rounded-xl bg-background border border-dashed border-card-border hover:border-primary text-text-muted hover:text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1">
<span className="material-symbols-outlined text-[16px]">add</span>
<span>Thêm dòng phụ đề tại vị trí hiện tại (04:15)</span>
</button>
</section>
{/*  2. CDN Infrastructure & Tokyo Studio Audio Quality  */}
<section className="bg-card rounded-2xl border border-card-border p-5 shadow-[0_4px_20px_rgba(45,40,42,0.04)] flex flex-col gap-4">
<div className="flex items-center justify-between pb-1 border-b border-card-border">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-ping"></span>
<h3 className="text-base text-text font-bold">
                  Hạ tầng CDN & Âm thanh Tokyo Studio
                </h3>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-bg border border-tertiary/30 text-tertiary text-[11px] font-bold">
                Tối ưu 100%
              </span>
</div>
{/*  CDN Edge Node Server  */}
<div className="p-3 rounded-xl bg-background border border-card-border flex items-center gap-3">
<div className="w-9 h-9 rounded-lg bg-card border border-card-border text-primary flex items-center justify-center shrink-0 shadow-sm">
<span className="material-symbols-outlined text-[20px]">dns</span>
</div>
<div className="flex flex-col">
<span className="text-xs font-bold text-text">Sakura Tokyo Edge Node #4</span>
<span className="text-[11px] text-text-muted">Băng thông định tuyến đa điểm APAC (VN & JP)</span>
</div>
</div>
{/*  Media Metrics Bento Grid  */}
<div className="grid grid-cols-2 gap-3">
{/*  TTFB Latency  */}
<div className="p-3 rounded-xl bg-background border border-card-border flex flex-col justify-between">
<span className="text-[11px] text-text-muted">Độ trễ TTFB</span>
<div className="flex items-baseline gap-1 my-1">
<span className="text-xl font-bold text-text font-mono">120</span>
<span className="text-[11px] text-tertiary font-bold">ms (Cực nhanh)</span>
</div>
{/*  Sparkline SVG  */}
<svg className="w-full h-4 text-tertiary" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
<path d="M0 15 Q20 5, 40 12 T80 6 T100 10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
</svg>
</div>
{/*  Video Mobile Compression  */}
<div className="p-3 rounded-xl bg-background border border-card-border flex flex-col justify-between">
<span className="text-[11px] text-text-muted">Nén H.265 Mobile</span>
<div className="flex items-baseline gap-1 my-1">
<span className="text-xl font-bold text-primary font-mono">-40%</span>
<span className="text-[11px] text-text-subtle">Data save</span>
</div>
{/*  Progress Bar with Primary & Accent  */}
<div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full w-[60%]"></div>
</div>
</div>
</div>
{/*  Tokyo NHK Studio Audio Specification  */}
<div className="p-3 rounded-xl bg-accent-light/60 border border-accent/60 flex items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-card border border-accent text-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[18px]">graphic_eq</span>
</div>
<div className="flex flex-col leading-tight">
<span className="text-xs font-bold text-text">Khử nhiễu Tokyo NHK Studio</span>
<span className="text-[11px] text-text-muted">Chuẩn Hi-Res Audio Master 24-bit / 48kHz</span>
</div>
</div>
<span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
</div>
{/*  Cross Device Test Button  */}
<button className="w-full py-2.5 rounded-xl bg-card border border-card-border hover:border-primary/40 text-text font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm">
<span className="material-symbols-outlined text-[17px] text-primary">devices</span>
<span>Kiểm tra tương thích phát sóng đa thiết bị (Web / iOS / Android)</span>
</button>
</section>
</div>
</div>
</main>
</div>


    </div>
  
</CmsShell>
);
}
