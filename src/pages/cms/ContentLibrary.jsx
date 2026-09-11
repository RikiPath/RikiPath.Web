import { useEffect } from 'react';
import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function ContentLibrary() {
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
      function switchLevel(el, level) {
          const parent = el.parentElement;
          parent.querySelectorAll('button').forEach(btn => {
            btn.className = 'px-space-16 py-space-4 rounded-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors';
          });
          el.className = 'px-space-16 py-space-4 rounded-md bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm font-semibold transition-all';
        }
      
        function playAudioFx(btn) {
          const icon = btn.querySelector('.material-symbols-outlined');
          const originalText = icon.innerText;
          icon.innerText = 'graphic_eq';
          btn.classList.add('bg-primary', 'text-on-primary');
          btn.classList.remove('bg-surface-container-lowest', 'text-primary');
      
          setTimeout(() => {
            icon.innerText = originalText;
            btn.classList.remove('bg-primary', 'text-on-primary');
            btn.classList.add('bg-surface-container-lowest', 'text-primary');
          }, 1200);
        }
      
        function addToNotebook(btn, word) {
          const spanText = btn.querySelector('span:last-child');
          const icon = btn.querySelector('.material-symbols-outlined');
          
          btn.classList.add('bg-tertiary-container/20', 'text-tertiary');
          btn.classList.remove('bg-surface-container-low', 'text-on-surface');
          icon.innerText = 'check';
          spanText.innerText = 'Đã lưu';
      
          setTimeout(() => {
            btn.classList.remove('bg-tertiary-container/20', 'text-tertiary');
            btn.classList.add('bg-surface-container-low', 'text-on-surface');
            icon.innerText = 'bookmark_add';
            spanText.innerText = '+ Sổ từ';
          }, 2000);
        }
      
        document.getElementById('lessonSearch')?.addEventListener('input', function(e) {
          const term = e.target.value.toLowerCase();
          const buttons = document.querySelectorAll('#lessonGrid button');
          buttons.forEach(b => {
            const title = (b.getAttribute('title') || '').toLowerCase();
            if (!term || title.includes(term)) {
              b.style.opacity = '1';
            } else {
              b.style.opacity = '0.2';
            }
          });
        });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <CmsShell pathname={pathname} breadcrumb="Kho học liệu">
<div className="bg-surface text-on-surface font-body-md text-body-md min-h-screen" data-page="ContentLibrary" data-shell-unified="1">

<div className="pl-0"><main className="w-full pt-0 bg-surface"><div className="max-w-[1440px] mx-auto px-space-32 py-space-24"><div className="flex flex-col w-full">
{/*  Sub-header & Filtering Hub (Aligned to Neo-Japanese Editorial Aesthetic)  */}
<header className="flex flex-col gap-space-20 mb-space-24 bg-surface-container-lowest p-space-24 rounded-xl shadow-sm relative overflow-hidden">
<div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
<div className="flex flex-wrap items-center justify-between gap-space-16 relative z-10">
<div className="flex flex-col">
<div className="flex items-center gap-space-8 text-secondary font-label-xs tracking-wider uppercase">
<span>Studio Soạn Thảo & Giáo Trình</span>
<span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
<span>Hệ Thống Tiêu Chuẩn JLPT 2025</span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-space-12 mt-space-4">
<span>Kho Học Liệu & Điều Phối Bài Học</span>
<span className="px-space-8 py-space-2 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs">N3 - N4 Active Track</span>
</h1>
</div>
{/*  Action buttons  */}
<div className="flex items-center gap-space-12">
<button className="h-10 px-space-16 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container flex items-center gap-space-8 transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">file_upload</span>
<span>Nhập Excel / CSV</span>
</button>
<button className="h-10 px-space-16 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container flex items-center gap-space-8 transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">file_download</span>
<span>Xuất Báo Cáo</span>
</button>
<button className="h-10 px-space-16 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-sm flex items-center gap-space-8 transition-all" type="button">
<span className="material-symbols-outlined text-[18px]">add_box</span>
<span>Tạo Bài Giảng Mới</span>
</button>
</div>
</div>
{/*  Filter Multi-tier Controls  */}
<div className="flex flex-wrap items-center justify-between gap-space-16 pt-space-16 border-t border-surface-container-high relative z-10">
{/*  JLPT Level Segmented Control  */}
<div className="flex items-center p-space-4 bg-surface-container rounded-lg">
<button className="px-space-16 py-space-4 rounded-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" onClick="switchLevel(this, 'all')" type="button">Tất cả (184)</button>
<button className="px-space-16 py-space-4 rounded-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" onClick="switchLevel(this, 'n5')" type="button">JLPT N5 (42)</button>
<button className="px-space-16 py-space-4 rounded-md bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm font-semibold transition-all" onClick="switchLevel(this, 'n4')" type="button">JLPT N4 (68)</button>
<button className="px-space-16 py-space-4 rounded-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" onClick="switchLevel(this, 'n3')" type="button">JLPT N3 (74)</button>
</div>
{/*  Categories Pills  */}
<div className="flex items-center gap-space-8 flex-wrap">
<span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Phân loại:</span>
<button className="px-space-12 py-space-4 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs flex items-center gap-space-4" type="button">
<span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Ngữ pháp (Bunpo)
        </button>
<button className="px-space-12 py-space-4 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-xs text-label-xs transition-colors" type="button">
          Từ vựng (Goi)
        </button>
<button className="px-space-12 py-space-4 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-xs text-label-xs transition-colors" type="button">
          Hán tự (Kanji)
        </button>
<button className="px-space-12 py-space-4 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-xs text-label-xs transition-colors" type="button">
          Đọc hiểu & Luyện đề
        </button>
</div>
{/*  Search & View Filters  */}
<div className="flex items-center gap-space-8 ml-auto">
<div className="relative w-64">
<span className="material-symbols-outlined absolute left-space-8 top-2.5 text-on-surface-variant text-[18px]">filter_list</span>
<input className="w-full h-9 pl-8 pr-space-12 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:bg-surface-container-lowest transition-all" id="lessonSearch" placeholder="Lọc mã hoặc tiêu đề..." type="text" />
</div>
<div className="flex bg-surface-container rounded-lg p-space-2 text-on-surface-variant">
<button aria-label="Chế độ Lưới" className="p-space-4 rounded bg-surface-container-lowest text-primary shadow-sm" type="button"><span className="material-symbols-outlined text-[18px]">grid_view</span></button>
<button aria-label="Chế độ Danh sách" className="p-space-4 rounded hover:text-on-surface" type="button"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
</div>
</div>
</div>
</header>
{/*  12-Column Grid Main Workspace  */}
<div className="grid grid-cols-12 gap-space-24 items-start">
{/*  LEFT 8 COLUMNS: Curriculum Manager, Data Grid & Detailed Interactive Lesson Viewer  */}
<section className="col-span-8 flex flex-col gap-space-24">
{/*  Interactive Lesson Header & Status Bar  */}
<div className="bg-surface-container-lowest rounded-xl p-space-24 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-12">
<span className="px-space-12 py-space-4 rounded-md bg-primary text-on-primary font-label-xs text-label-xs font-bold uppercase tracking-wider">Unit 14</span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Liệt kê hành động: ～たり、～たりする & Thói quen trong quá khứ</h2>
</div>
<div className="flex items-center gap-space-8">
<span className="flex items-center gap-space-4 px-space-8 py-space-2 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-label-xs font-semibold">
<span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              Đang hoàn thiện (68%)
            </span>
<button aria-label="Chỉnh sửa bài" className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">edit_note</span>
</button>
</div>
</div>
{/*  High-Density 30 Lessons Flow Strip  */}
<div className="flex flex-col gap-space-8 bg-surface-container-low p-space-16 rounded-lg">
<div className="flex items-center justify-between text-on-surface-variant font-label-xs text-label-xs">
<span className="font-semibold text-on-surface">Tiến trình giáo trình khóa N4 (30 Bài tiêu chuẩn)</span>
<div className="flex items-center gap-space-12">
<span className="flex items-center gap-space-4"><span className="w-2 h-2 rounded-full bg-tertiary"></span>Đã duyệt (18)</span>
<span className="flex items-center gap-space-4"><span className="w-2 h-2 rounded-full bg-secondary-container border border-primary"></span>Đang sửa (5)</span>
<span className="flex items-center gap-space-4"><span className="w-2 h-2 rounded-full bg-surface-dim"></span>Chưa soạn (7)</span>
</div>
</div>
{/*  Micro Cards Strip for 30 Lessons  */}
<div className="grid grid-cols-10 gap-space-4 pt-space-4" id="lessonGrid">
{/*  1 to 18 (Completed)  */}
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 1: Trợ từ cơ bản" type="button">01</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 2: Tính từ i và na" type="button">02</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 3: Thể Te nối câu" type="button">03</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 4: Thể Nai" type="button">04</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 5: Thể Từ điển" type="button">05</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 6: Thể Ta quá khứ" type="button">06</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 7: Thể Thông thường" type="button">07</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 8: Trợ từ so sánh" type="button">08</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 9: Mong muốn ～たい" type="button">09</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 10: Trạng từ chỉ mức độ" type="button">10</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 11: Đi làm gì ～に行く" type="button">11</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 12: Đưa ra lời khuyên ～たほうがいい" type="button">12</button>
<button className="h-8 rounded bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 13: Thể Khả năng căn bản" type="button">13</button>
{/*  14: ACTIVE ITEM  */}
<button className="h-8 rounded bg-primary text-on-primary font-display-sm text-label-xs font-bold flex items-center justify-center ring-2 ring-primary-container shadow-sm scale-105 transform z-10" title="Bài 14 (Đang mở): Cấu trúc Tari Tari" type="button">14</button>
{/*  In Progress items  */}
<button className="h-8 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 15: Dự đoán ～でしょう" type="button">15</button>
<button className="h-8 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 16: Thể Ý chí (Volitional)" type="button">16</button>
<button className="h-8 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 17: Thể Mệnh lệnh &amp; Cấm chỉ" type="button">17</button>
<button className="h-8 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed text-label-xs font-bold flex items-center justify-center transition-all" title="Bài 18: Thể Điều kiện ～ば" type="button">18</button>
{/*  Locked / Draft items  */}
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 19: Thể Bị động" type="button">19</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 20: Thể Sai khiến" type="button">20</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 21: Tôn kính ngữ Keigo I" type="button">21</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 22: Khiêm nhường ngữ Keigo II" type="button">22</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 23: Thể Bị động sai khiến" type="button">23</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 24: Cho và Nhận (Ageru, Kureru)" type="button">24</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 25: Cấu trúc Sou da (Nghe nói &amp; Trông có vẻ)" type="button">25</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 26: Diễn đạt quá mức ～すぎる" type="button">26</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 27: Tiền định ～ておく" type="button">27</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 28: Thể Hoàn thành ～てしまう" type="button">28</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 29: Ôn tập tổng hợp Bunpo N4" type="button">29</button>
<button className="h-8 rounded bg-surface-container-high text-on-surface-variant/40 hover:bg-surface-variant text-label-xs font-medium flex items-center justify-center cursor-not-allowed" title="Bài 30: Đề thi thử JLPT N4 chuẩn hóa" type="button">30</button>
</div>
</div>
</div>
{/*  Detailed Lesson Preview Hub: Video Player + Audio Trigger & Furigana Showcase  */}
<div className="bg-surface-container-lowest rounded-xl p-space-24 shadow-sm flex flex-col gap-space-20">
<div className="flex items-center justify-between pb-space-12 border-b border-surface-container-high">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">smart_display</span>
<span className="font-headline-sm text-headline-sm text-on-surface">Bài Giảng Trực Quan & Âm Chuẩn Tokyo</span>
</div>
<div className="flex items-center gap-space-12 text-body-sm text-on-surface-variant">
<span className="flex items-center gap-space-4"><span className="material-symbols-outlined text-[16px]">schedule</span> 18 phút 40 giây</span>
<span className="flex items-center gap-space-4"><span className="material-symbols-outlined text-[16px]">closed_caption</span> Nhật - Việt Song Ngữ</span>
</div>
</div>
{/*  Video Simulation Screen with Playhead  */}
<div className="relative w-full h-80 rounded-xl overflow-hidden bg-on-surface flex items-center justify-center group cursor-pointer shadow-md">
<div className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-85 transition-opacity" data-alt="A modern Japanese classroom setting with a warm wooden desk, a sleek slate chalkboard displaying neat Japanese Hiragana calligraphy, warm morning natural light streaming through shoji blinds, clean and serene minimalist aesthetic." style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAN_vCYYCchsD9ZN83zJ4gPDeThlG3ll0uLzuN_9aHw113MupaZQQX0ihzgKrAAtndOBJTUzoWwNR5mwalfmgjBfpPxJqIAuIT0-2Ws6418gqmOv40b4FQVaAJM0cLaN3hfWNjQeauB9_65zeDi_Errmcoe3igNVlTqVG6YaSmy43z1wOAydcFjma2VNU_38lk79QYfpBWgLvyNF3si0LNQP7p5ekoBpIWfMctPV5elAnhBG41xe1fV')" }}></div>
<div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-transparent to-on-surface/30"></div>
{/*  Central Play Trigger  */}
<div className="relative z-10 w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-primary transition-all">
<span className="material-symbols-outlined text-[36px] ml-1">play_arrow</span>
</div>
{/*  Video Controls Overlay Bar  */}
<div className="absolute bottom-0 left-0 right-0 p-space-16 z-20 flex flex-col gap-space-8 bg-gradient-to-t from-on-surface to-transparent">
<div className="w-full bg-surface-container-high/40 h-1.5 rounded-full overflow-hidden cursor-pointer">
<div className="bg-primary h-full rounded-full" style={{ width: "44%" }}></div>
</div>
<div className="flex items-center justify-between text-on-primary text-body-sm font-label-xs">
<div className="flex items-center gap-space-12">
<span className="material-symbols-outlined text-[20px] cursor-pointer hover:text-secondary-container">play_arrow</span>
<span className="material-symbols-outlined text-[20px] cursor-pointer hover:text-secondary-container">volume_up</span>
<span className="font-mono">08:12 / 18:40</span>
<span className="px-space-8 py-0.5 rounded bg-surface-container-lowest/20 backdrop-blur-sm text-on-primary text-[10px]">1080p 60fps</span>
</div>
<div className="flex items-center gap-space-12">
<button className="hover:text-secondary-container text-on-primary flex items-center gap-space-4 font-semibold" type="button">
<span className="material-symbols-outlined text-[16px]">speed</span> 1.25x
                </button>
<span className="material-symbols-outlined text-[20px] cursor-pointer hover:text-secondary-container">branding_watermark</span>
<span className="material-symbols-outlined text-[20px] cursor-pointer hover:text-secondary-container">fullscreen</span>
</div>
</div>
</div>
</div>
{/*  Furigana Interactive Example Sentences with Audio Controls  */}
<div className="flex flex-col gap-space-16 mt-space-8">
<div className="flex items-center justify-between">
<h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[18px]">record_voice_over</span>
<span>Mẫu câu thực hành với Furigana Chuẩn</span>
</h3>
<span className="font-label-xs text-label-xs text-on-surface-variant italic">Nhấn vào loa để nghe phát âm người bản xứ</span>
</div>
{/*  Sentence Card 1  */}
<div className="p-space-16 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-8 relative group">
<div className="flex items-start justify-between">
<div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 font-body-lg text-body-lg text-on-surface">
{/*  Furigana Ruby Blocks  */}
<ruby className="ruby-block">休<rt className="font-label-xs text-[10px] text-primary">やす</rt></ruby>みの
                <ruby className="ruby-block">日<rt className="font-label-xs text-[10px] text-primary">ひ</rt></ruby>は、
                <ruby className="ruby-block">本<rt className="font-label-xs text-[10px] text-primary">ほん</rt></ruby>を
                <span className="font-bold text-primary underline underline-offset-4 decoration-secondary-container">
<ruby className="ruby-block">読<rt className="font-label-xs text-[10px]">よ</rt></ruby>んだり
                </span>、
                <ruby className="ruby-block">音楽<rt className="font-label-xs text-[10px] text-primary">おんがく</rt></ruby>を
                <span className="font-bold text-primary underline underline-offset-4 decoration-secondary-container">
<ruby className="ruby-block">聞<rt className="font-label-xs text-[10px]">き</rt></ruby>いたり
                </span>
                します。
              </div>
<div className="flex items-center gap-space-8">
<button className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-all" onClick="playAudioFx(this)" title="Nghe câu này" type="button">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
<button className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" title="Lưu mẫu câu" type="button">
<span className="material-symbols-outlined text-[18px]">bookmark_border</span>
</button>
</div>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">
              → <span className="font-semibold text-on-surface">Dịch nghĩa:</span> Vào ngày nghỉ, tôi lúc thì đọc sách, khi thì nghe nhạc (liệt kê hành động tiêu biểu).
            </p>
</div>
{/*  Sentence Card 2  */}
<div className="p-space-16 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-8 relative group">
<div className="flex items-start justify-between">
<div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 font-body-lg text-body-lg text-on-surface">
<ruby className="ruby-block">昨日<rt className="font-label-xs text-[10px] text-primary">きのう</rt></ruby>は
                <ruby className="ruby-block">雨<rt className="font-label-xs text-[10px] text-primary">あめ</rt></ruby>が
                <span className="font-bold text-primary underline underline-offset-4 decoration-secondary-container">
<ruby className="ruby-block">降<rt className="font-label-xs text-[10px]">ふ</rt></ruby>ったり
                </span>、
                <span className="font-bold text-primary underline underline-offset-4 decoration-secondary-container">
<ruby className="ruby-block">止<rt className="font-label-xs text-[10px]">や</rt></ruby>んだり
                </span>
                でした。
              </div>
<div className="flex items-center gap-space-8">
<button className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-all" onClick="playAudioFx(this)" title="Nghe câu này" type="button">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
<button className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" title="Lưu mẫu câu" type="button">
<span className="material-symbols-outlined text-[18px]">bookmark_border</span>
</button>
</div>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">
              → <span className="font-semibold text-on-surface">Dịch nghĩa:</span> Hôm qua trời lúc thì mưa, lúc thì tạnh (thể hiện sự lặp lại biến đổi liên tục).
            </p>
</div>
</div>
{/*  Collocation Quick Matrix  */}
<div className="flex flex-col gap-space-12 pt-space-8">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-semibold">Cụm từ Cố định Phổ biến Trong Bài (Collocations)</span>
<span className="font-label-xs text-label-xs text-primary cursor-pointer hover:underline">Xem thêm 12 cụm từ →</span>
</div>
<div className="grid grid-cols-2 gap-space-12">
<div className="p-space-12 rounded-lg bg-surface-container-low flex items-center justify-between">
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-bold">経験を積む (けいけんをつむ)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Tích lũy kinh nghiệm làm việc</span>
</div>
<span className="px-space-8 py-space-2 rounded bg-surface-container-highest text-on-surface font-label-xs text-[10px]">Tần suất: Cao</span>
</div>
<div className="p-space-12 rounded-lg bg-surface-container-low flex items-center justify-between">
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-bold">状況を改善する (じょうきょうをかいぜんする)</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Cải thiện tình hình hiện tại</span>
</div>
<span className="px-space-8 py-space-2 rounded bg-surface-container-highest text-on-surface font-label-xs text-[10px]">JLPT N4 Cốt lõi</span>
</div>
</div>
</div>
</div>
</section>
{/*  RIGHT 4 COLUMNS: Quick Formula Card, SRS Retention Analytics, Associated Vocab List  */}
<aside className="col-span-4 flex flex-col gap-space-24">
{/*  1. Quick Grammar Formula Inspection Card  */}
<div className="bg-surface-container-lowest rounded-xl p-space-24 shadow-sm flex flex-col gap-space-16 relative overflow-hidden border-t-4 border-primary">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">functions</span>
<span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant font-bold">Công thức Ngữ pháp</span>
</div>
<span className="px-space-8 py-space-2 rounded-full bg-secondary-container text-on-secondary-container font-label-xs text-[11px] font-bold">Độ khó: ★★☆☆☆</span>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8 text-center border border-surface-container">
<span className="font-label-xs text-label-xs text-secondary uppercase font-semibold">Quy tắc biến đổi thể Ta</span>
<div className="font-headline-sm text-headline-sm text-primary font-bold py-space-4">
            V<sub className="text-xs">1</sub>(た) + り、V<sub className="text-xs">2</sub>(た) + りする
          </div>
<div className="font-body-sm text-body-sm text-on-surface-variant">
            Hoặc tính từ: <span className="font-mono text-on-surface">A<sub className="text-[10px]">い</sub> → かったり</span> / <span className="font-mono text-on-surface">A<sub className="text-[10px]">な</sub> → だったり</span>
</div>
</div>
<div className="flex flex-col gap-space-8 text-body-sm text-on-surface-variant">
<div className="flex items-start gap-space-8">
<span className="material-symbols-outlined text-tertiary text-[16px] mt-0.5">check_circle</span>
<span>Không dùng thì quá khứ ở giữa câu; thì của cả câu được quyết định ở động từ <strong>する / しました</strong> cuối cùng.</span>
</div>
<div className="flex items-start gap-space-8">
<span className="material-symbols-outlined text-tertiary text-[16px] mt-0.5">check_circle</span>
<span>Khác với thể <strong>～て、～て</strong> (theo trình tự thời gian), <strong>～たり</strong> liệt kê ngẫu nhiên.</span>
</div>
</div>
<button className="w-full py-space-8 rounded-lg bg-surface-container-low text-primary hover:bg-secondary-container hover:text-on-secondary-container font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-space-8" type="button">
<span className="material-symbols-outlined text-[18px]">menu_book</span>
<span>Mở Sổ Tay Ngữ Pháp Chi Tiết</span>
</button>
</div>
{/*  2. SRS Memory Retention Curve Analytics Card  */}
<div className="bg-surface-container-lowest rounded-xl p-space-24 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-tertiary text-[20px]">insights</span>
<span className="font-label-md text-label-md text-on-surface font-semibold">Đường Cong Quên Lãng (SRS)</span>
</div>
<span className="font-label-xs text-label-xs text-tertiary font-bold bg-tertiary-container/15 px-space-8 py-space-2 rounded-full">Tối ưu hóa: 88%</span>
</div>
{/*  Inline SVG Retention Curve Chart  */}
<div className="relative w-full h-44 bg-surface-container-low rounded-xl p-space-12 flex flex-col justify-between">
<div className="flex justify-between items-center text-on-surface-variant font-label-xs text-[10px]">
<span>Khả năng nhớ (%)</span>
<span>Khoảng cách ôn (Ngày)</span>
</div>
<svg className="w-full h-28 overflow-visible" fill="none" viewBox="0 0 320 100">
{/*  Gridlines  */}
<line className="text-surface-container-high" stroke="currentColor" stroke-dasharray="3 3" x1="0" x2="320" y1="20" y2="20"></line>
<line className="text-surface-container-high" stroke="currentColor" stroke-dasharray="3 3" x1="0" x2="320" y1="50" y2="50"></line>
<line className="text-surface-container-high" stroke="currentColor" stroke-dasharray="3 3" x1="0" x2="320" y1="80" y2="80"></line>
{/*  Natural forgetting curve (Faded dashed)  */}
<path className="text-on-surface-variant/30" d="M 10,15 Q 60,65 140,85 T 310,92" fill="none" stroke="currentColor" stroke-dasharray="4 4" strokeWidth="2"></path>
{/*  SRS Reinforced curve with peaks  */}
<path d="M 10,15 Q 40,35 60,45 L 60,18 Q 100,32 130,42 L 130,15 Q 190,25 240,32 L 240,12 Q 280,18 310,20" fill="none" stroke="#a62e4f" strokeLinecap="round" strokeWidth="3"></path>
{/*  Memory repetition pinpoints  */}
<circle cx="10" cy="15" fill="#a62e4f" r="4"></circle>
<circle cx="60" cy="18" fill="#006b2d" r="4"></circle>
<circle cx="130" cy="15" fill="#006b2d" r="4"></circle>
<circle cx="240" cy="12" fill="#006b2d" r="4"></circle>
<circle className="animate-pulse" cx="310" cy="20" fill="#a62e4f" r="5"></circle>
</svg>
<div className="flex justify-between text-on-surface-variant font-label-xs text-[10px]">
<span>Bài học</span>
<span>1 ngày</span>
<span>3 ngày</span>
<span>7 ngày</span>
<span className="text-primary font-bold">14 ngày (Hôm nay)</span>
</div>
</div>
<div className="flex items-center justify-between text-body-sm p-space-12 rounded-lg bg-surface-container">
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface font-semibold">Đợt ôn tập kế tiếp</span>
<span className="text-on-surface-variant font-body-sm text-body-sm">Dự kiến sau 6 ngày nữa (24/10)</span>
</div>
<button className="px-space-12 py-space-6 rounded-md bg-primary text-on-primary font-label-xs text-label-xs font-bold hover:bg-primary-container transition-colors shadow-sm" type="button">
            Ôn ngay
          </button>
</div>
</div>
{/*  3. Associated Vocabulary List with Direct Notebook Insertion  */}
<div className="bg-surface-container-lowest rounded-xl p-space-24 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between pb-space-8 border-b border-surface-container-high">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">collections_bookmark</span>
<span className="font-headline-sm text-headline-sm text-on-surface">Từ Vựng Đi Kèm (Bài 14)</span>
</div>
<span className="font-label-xs text-label-xs bg-secondary-container text-on-secondary-container px-space-8 py-space-2 rounded-full font-bold">5 Từ khóa</span>
</div>
{/*  Vocab Item Rows  */}
<div className="flex flex-col divide-y divide-surface-container">
{/*  Item 1  */}
<div className="py-space-12 flex items-center justify-between group">
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">経験</span>
<span className="font-body-sm text-body-sm text-primary font-medium">けいけん</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Kinh nghiệm, sự trải nghiệm</span>
</div>
<button className="h-8 px-space-8 rounded bg-surface-container-low text-on-surface hover:bg-secondary-container hover:text-primary text-label-xs font-semibold flex items-center gap-space-4 transition-all" onClick="addToNotebook(this, '経験')" type="button">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Sổ từ</span>
</button>
</div>
{/*  Item 2  */}
<div className="py-space-12 flex items-center justify-between group">
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">改善</span>
<span className="font-body-sm text-body-sm text-primary font-medium">かいぜん</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Cải thiện, tiến bộ hơn</span>
</div>
<button className="h-8 px-space-8 rounded bg-surface-container-low text-on-surface hover:bg-secondary-container hover:text-primary text-label-xs font-semibold flex items-center gap-space-4 transition-all" onClick="addToNotebook(this, '改善')" type="button">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Sổ từ</span>
</button>
</div>
{/*  Item 3  */}
<div className="py-space-12 flex items-center justify-between group">
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">習慣</span>
<span className="font-body-sm text-body-sm text-primary font-medium">しゅうかん</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Tập quán, thói quen sinh hoạt</span>
</div>
<button className="h-8 px-space-8 rounded bg-surface-container-low text-on-surface hover:bg-secondary-container hover:text-primary text-label-xs font-semibold flex items-center gap-space-4 transition-all" onClick="addToNotebook(this, '習慣')" type="button">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Sổ từ</span>
</button>
</div>
{/*  Item 4  */}
<div className="py-space-12 flex items-center justify-between group">
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">洗濯</span>
<span className="font-body-sm text-body-sm text-primary font-medium">せんたく</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Giặt giũ quần áo</span>
</div>
<button className="h-8 px-space-8 rounded bg-surface-container-low text-on-surface hover:bg-secondary-container hover:text-primary text-label-xs font-semibold flex items-center gap-space-4 transition-all" onClick="addToNotebook(this, '洗濯')" type="button">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Sổ từ</span>
</button>
</div>
{/*  Item 5  */}
<div className="py-space-12 flex items-center justify-between group">
<div className="flex flex-col">
<div className="flex items-baseline gap-space-8">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">掃除</span>
<span className="font-body-sm text-body-sm text-primary font-medium">そうじ</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Dọn dẹp, quét dọn vệ sinh</span>
</div>
<button className="h-8 px-space-8 rounded bg-surface-container-low text-on-surface hover:bg-secondary-container hover:text-primary text-label-xs font-semibold flex items-center gap-space-4 transition-all" onClick="addToNotebook(this, '掃除')" type="button">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>+ Sổ từ</span>
</button>
</div>
</div>
<button className="w-full py-space-8 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md font-semibold hover:bg-secondary-fixed transition-colors flex items-center justify-center gap-space-8" type="button">
<span className="material-symbols-outlined text-[18px]">folder_special</span>
<span>Lưu Toàn Bộ 5 Từ Vào Flashcard N4</span>
</button>
</div>
</aside>
</div>
</div>
</div></main></div>
    </div>
  
</CmsShell>
);
}
