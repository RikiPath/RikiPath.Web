import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function OnboardingSurvey() {
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
          const container = document.getElementById('levelSelectorContainer');
          if (!container) return;
      
          const labels = container.querySelectorAll('label');
          labels.forEach(label => {
            const input = label.querySelector('input[type="radio"]');
            
            input.addEventListener('change', () => {
              labels.forEach(l => {
                l.classList.remove('bg-surface-container-low', 'shadow-md');
                l.classList.add('bg-surface-container-lowest', 'shadow-sm');
                
                const iconBadge = l.querySelector('.flex-shrink-0');
                if (iconBadge && !iconBadge.classList.contains('text-tertiary')) {
                  iconBadge.classList.remove('bg-secondary-container', 'text-primary');
                  iconBadge.classList.add('bg-surface-container-low', 'text-on-surface-variant');
                }
      
                const existingTag = l.querySelector('.active-indicator-tag');
                if (existingTag) existingTag.remove();
      
                const checkMark = l.querySelector('.peer-checked\\:bg-primary') || l.querySelector('.bg-primary');
                if (checkMark) {
                  checkMark.classList.remove('bg-primary', 'text-on-primary');
                  checkMark.classList.add('bg-surface-container', 'text-transparent');
                }
              });
      
              label.classList.remove('bg-surface-container-lowest', 'shadow-sm');
              label.classList.add('bg-surface-container-low', 'shadow-md');
      
              const currentBadge = label.querySelector('.flex-shrink-0');
              if (currentBadge && !currentBadge.classList.contains('text-tertiary')) {
                currentBadge.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
                currentBadge.classList.add('bg-secondary-container', 'text-primary');
              }
      
              const titleRow = label.querySelector('.flex.items-center.gap-space-xs');
              if (titleRow && !label.querySelector('.active-indicator-tag')) {
                const tag = document.createElement('span');
                tag.className = 'active-indicator-tag font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-semibold flex items-center gap-1';
                tag.innerHTML = '<span className="material-symbols-outlined text-[14px]">check_circle</span> Đang chọn';
                titleRow.appendChild(tag);
              }
      
              const currentCheckMark = label.querySelector('.w-6.h-6');
              if (currentCheckMark) {
                currentCheckMark.classList.remove('bg-surface-container', 'text-transparent');
                currentCheckMark.classList.add('bg-primary', 'text-on-primary');
              }
            });
          });
        })();
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <div className="bg-surface text-on-surface antialiased" data-page="OnboardingSurvey">
<header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(217,75,104,0.06)]"><div className="h-16 w-full px-margin-desktop flex items-center justify-between gap-space-md"><div className="flex items-center gap-space-xl"><Link className="flex items-center gap-space-xs transition-opacity hover:opacity-90" data-path="trang-chu" to="/"><span className="material-symbols-outlined text-primary text-[26px]">spa</span><span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">Riki<span className="text-primary">Path</span></span></Link><nav className="hidden lg:flex items-center gap-space-xs" data-active-classes="bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-full px-space-md py-space-xs"><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-md py-space-xs rounded-full transition-colors" data-path="khoa-hoc" href="#">Khóa học</a><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-md py-space-xs rounded-full transition-colors" data-path="lo-trinh-jlpt" href="#">Lộ trình JLPT</a><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-md py-space-xs rounded-full transition-colors" data-path="luyen-tap" href="#">Luyện tập</a><a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-md py-space-xs rounded-full transition-colors" data-path="tu-van-chuyen-gia" href="#">Tư vấn chuyên gia</a></nav></div><div className="flex items-center gap-space-md"><div className="relative hidden md:block w-64"><input className="w-full bg-surface-container-lowest text-on-surface font-body-sm text-body-sm pl-9 pr-space-md py-space-xs rounded-full outline-none transition-all placeholder:text-outline-variant focus:shadow-[0_0_0_2px_rgba(171,40,72,0.2)]" placeholder="Tìm khóa học, JLPT N3..." type="text" /><span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span></div><button aria-label="Thông báo" className="relative w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container hover:text-on-surface text-on-surface-variant transition-colors" type="button"><span className="material-symbols-outlined text-[20px]">notifications</span><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"></span></button><div className="p-[2px] rounded-full bg-secondary-fixed shadow-[0_2px_8px_rgba(217,75,104,0.12)]"><div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><span className="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div></div></div><div className="h-[2px] w-full bg-gradient-to-r from-transparent via-secondary-container to-transparent opacity-80"></div></header>
<main className="w-full pt-0 bg-surface min-h-[calc(100vh-16rem)]"><div className="flex flex-col w-full">
<div className="w-full max-w-[1440px] mx-auto px-margin-desktop py-space-xl flex flex-col gap-space-2xl">
{/*  Top Step Bar & Sub-Navigation  */}
<div className="w-full flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-sm">
<a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-all hover:-translate-x-0.5" href="#">
<span className="material-symbols-outlined text-[20px]">arrow_back</span>
</a>
<div className="flex items-center gap-space-xs">
<span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold px-space-xs py-0.5 rounded-full bg-secondary-container">Bước 1 / 3</span>
<span className="text-outline-variant font-label-sm text-label-sm">•</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Khảo sát trình độ</span>
</div>
</div>
<div className="flex items-center gap-space-lg">
<div className="flex items-center gap-space-xxs p-1 rounded-full bg-surface-container-low">
<button className="px-space-sm py-1 rounded-full font-label-sm text-label-sm bg-surface-container-lowest text-primary shadow-sm font-semibold" type="button">VN</button>
<button className="px-space-sm py-1 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" type="button">JP</button>
</div>
<Link to="/app" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-space-xxs">
<span>Để sau</span>
<span className="material-symbols-outlined text-[16px]">close</span>
</Link>
</div>
</div>
{/*  Linear Step Progress Bar  */}
<div className="w-full grid grid-cols-3 gap-space-sm items-center pt-space-xs">
<div className="flex flex-col gap-space-xxs">
<div className="h-1.5 w-full rounded-full bg-primary relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
</div>
<span className="font-label-sm text-label-sm text-primary font-bold tracking-tight">1. Khảo sát trình độ</span>
</div>
<div className="flex flex-col gap-space-xxs">
<div className="h-1.5 w-full rounded-full bg-surface-container-highest"></div>
<span className="font-label-sm text-label-sm text-outline font-medium tracking-tight">{"2. Mục tiêu & Thời gian"}</span>
</div>
<div className="flex flex-col gap-space-xxs">
<div className="h-1.5 w-full rounded-full bg-surface-container-highest"></div>
<span className="font-label-sm text-label-sm text-outline font-medium tracking-tight">3. Lộ trình cá nhân hóa</span>
</div>
</div>
</div>
{/*  Intro / Headline Section  */}
<div className="flex flex-col gap-space-xs max-w-3xl">
<div className="inline-flex items-center gap-space-xs w-fit px-space-md py-1 rounded-full bg-surface-container-low shadow-sm">
<span className="material-symbols-outlined text-primary text-[18px]">filter_vintage</span>
<span className="font-label-md text-label-md text-primary font-semibold">Khởi đầu hành trình học tiếng Nhật cá nhân hóa</span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">{"Trình độ tiếng Nhật hiện tại của bạn?\n      "}</h1>
<p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">{"Chọn trình độ gần đúng nhất để RikiPath và AI Haru Sensei chuẩn hóa lộ trình, học liệu và bài tập tối ưu nhất cho bạn.\n      "}</p>
</div>
{/*  Main Split Grid: 8 cols (Level selection) + 4 cols (AI assistant & proof)  */}
<div className="grid grid-cols-12 gap-gutter-desktop items-start">
{/*  Interactive Level Cards Grid (8 cols)  */}
<div className="col-span-12 lg:col-span-8 flex flex-col gap-space-md" id="levelSelectorContainer">
{/*  Card 1: Mới bắt đầu  */}
<label className="group relative flex items-start gap-space-md p-space-lg rounded-xl bg-surface-container-lowest cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-surface-bright shadow-sm">
<input className="sr-only peer" name="japanese_level" type="radio" value="starter" />
<div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-tertiary flex-shrink-0 group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[24px]">potted_plant</span>
</div>
<div className="flex-1 min-w-0 flex flex-col gap-space-xxs">
<div className="flex items-center gap-space-xs">
<span className="font-title-md text-title-md text-on-surface font-bold">Mới bắt đầu</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Nhập môn</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-normal">{"Chưa biết gì, muốn bắt đầu học từ 2 bảng chữ cái Hiragana & Katakana căn bản.\n            "}</p>
</div>
<div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center peer-checked:bg-primary peer-checked:text-on-primary text-transparent transition-all">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
</label>
{/*  Card 2: N5  */}
<label className="group relative flex items-start gap-space-md p-space-lg rounded-xl bg-surface-container-lowest cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-surface-bright shadow-sm">
<input className="sr-only peer" name="japanese_level" type="radio" value="n5" />
<div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant flex-shrink-0 font-headline-sm text-headline-sm font-bold group-hover:scale-105 transition-transform">{"N5\n          "}</div>
<div className="flex-1 min-w-0 flex flex-col gap-space-xxs">
<div className="flex items-center gap-space-xs">
<span className="font-title-md text-title-md text-on-surface font-bold">JLPT N5</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Sơ cấp 1</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-normal">{"Đã thuộc 2 bảng chữ cái, ngữ pháp câu chào hỏi, giới thiệu bản thân và giao tiếp vỡ lòng.\n            "}</p>
</div>
<div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center peer-checked:bg-primary peer-checked:text-on-primary text-transparent transition-all">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
</label>
{/*  Card 3: N4 (SELECTED / ACTIVE STATE BY DEFAULT)  */}
<label className="group relative flex items-start gap-space-md p-space-lg rounded-xl bg-surface-container-low shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg">
<input checked className="sr-only peer" name="japanese_level" type="radio" value="n4" />
<div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-primary flex-shrink-0 font-headline-sm text-headline-sm font-bold group-hover:scale-105 transition-transform">{"N4\n          "}</div>
<div className="flex-1 min-w-0 flex flex-col gap-space-xxs">
<div className="flex items-center gap-space-xs flex-wrap">
<span className="font-title-md text-title-md text-on-surface font-bold">JLPT N4</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Sơ cấp 2</span>
<span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>{"Đang chọn\n              "}</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-normal">{"Hiểu hội thoại cơ bản hàng ngày với tốc độ chậm, nắm chắc khoảng 300 từ vựng và 150 Kanji căn bản.\n            "}</p>
</div>
<div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
</label>
{/*  Card 4: N3 (Popular badge)  */}
<label className="group relative flex items-start gap-space-md p-space-lg rounded-xl bg-surface-container-lowest cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-surface-bright shadow-sm">
<input className="sr-only peer" name="japanese_level" type="radio" value="n3" />
<div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant flex-shrink-0 font-headline-sm text-headline-sm font-bold group-hover:scale-105 transition-transform">{"N3\n          "}</div>
<div className="flex-1 min-w-0 flex flex-col gap-space-xxs">
<div className="flex items-center gap-space-xs flex-wrap">
<span className="font-title-md text-title-md text-on-surface font-bold">JLPT N3</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Trung cấp</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[13px] text-primary">local_fire_department</span>{"Phổ biến nhất\n              "}</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-normal">{"Giao tiếp độc lập trong công việc, đọc tin tức đơn giản, theo dõi phim ảnh anime hiểu đại ý tình huống.\n            "}</p>
</div>
<div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center peer-checked:bg-primary peer-checked:text-on-primary text-transparent transition-all">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
</label>
{/*  Card 5: N2  */}
<label className="group relative flex items-start gap-space-md p-space-lg rounded-xl bg-surface-container-lowest cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-surface-bright shadow-sm">
<input className="sr-only peer" name="japanese_level" type="radio" value="n2" />
<div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant flex-shrink-0 font-headline-sm text-headline-sm font-bold group-hover:scale-105 transition-transform">{"N2\n          "}</div>
<div className="flex-1 min-w-0 flex flex-col gap-space-xxs">
<div className="flex items-center gap-space-xs">
<span className="font-title-md text-title-md text-on-surface font-bold">JLPT N2</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Cao cấp</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-normal">{"Hiểu văn bản chuyên sâu, bình luận báo chí, phóng sự và tài liệu hội họp doanh nghiệp Nhật Bản.\n            "}</p>
</div>
<div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center peer-checked:bg-primary peer-checked:text-on-primary text-transparent transition-all">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
</label>
{/*  Card 6: N1  */}
<label className="group relative flex items-start gap-space-md p-space-lg rounded-xl bg-surface-container-lowest cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-surface-bright shadow-sm">
<input className="sr-only peer" name="japanese_level" type="radio" value="n1" />
<div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant flex-shrink-0 font-headline-sm text-headline-sm font-bold group-hover:scale-105 transition-transform">{"N1\n          "}</div>
<div className="flex-1 min-w-0 flex flex-col gap-space-xxs">
<div className="flex items-center gap-space-xs">
<span className="font-title-md text-title-md text-on-surface font-bold">JLPT N1</span>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Thượng cấp</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-normal">{"Thành thạo tự nhiên như người bản xứ, phân tích bình luận văn học học thuật & hợp đồng pháp lý phức tạp.\n            "}</p>
</div>
<div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center peer-checked:bg-primary peer-checked:text-on-primary text-transparent transition-all">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
</label>
</div>
{/*  Right Column: AI Assistant Panel & Diagnostic Support (4 cols)  */}
<div className="col-span-12 lg:col-span-4 flex flex-col gap-space-lg">
{/*  Haru Sensei Diagnostic Card  */}
<div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary-container opacity-40 blur-2xl pointer-events-none"></div>
<div className="flex items-center gap-space-sm relative z-10">
<div className="relative w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="A warm friendly Japanese anime-style AI teacher avatar named Haru Sensei, wearing soft pink haori kimono with modern spectacles, smiling gently against a minimalist pastel sakura blossom background, high aesthetic digital illustration" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6AgE2imEeBBa44VZQQMDOMKkpxr9hMZr41r_-_ToWQ_WoduAfb_HCSZSp0CBHYEMsYAKSsuyFjAYl9jSgorraeQBIJFNhOQjV0Eg0ZL8HWKNLemQeRVgTz_UW-RDD3L9Pci4IsnjoufPb3JZoeUEQXodPUQstjHoWm39UNcPFbvAuAIoaL-iXKwMelVU7-vaHi8lEYRZazb7U6WLjV5EgNV-N_7XuCwQDVApXFXfzi1_osmlD502M" />
</div>
<div className="flex flex-col">
<div className="flex items-center gap-1.5">
<span className="font-title-md text-title-md text-on-surface font-bold">AI Haru Sensei</span>
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
</div>
<span className="font-label-sm text-label-sm text-primary font-medium">Trợ lý học tập thông minh</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant relative z-10 leading-relaxed">{"Chưa chắc chắn về trình độ của mình? Đừng lo lắng! AI Haru có thể chẩn đoán nhanh năng lực miễn phí qua bài test 10 phút.\n          "}</p>
<button className="w-full py-space-sm px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-xs transition-all hover:shadow-sm" type="button">
<span className="material-symbols-outlined text-[18px]">quiz</span>
<span>Làm bài test đánh giá (10 phút)</span>
</button>
</div>
{/*  Assessment Perks / Summary Box  */}
<div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col gap-space-md">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[20px]">stars</span>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Quyền lợi sau khảo sát</h3>
</div>
<div className="flex flex-col gap-space-sm">
<div className="flex items-start gap-space-xs">
<div className="w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary flex-shrink-0 mt-0.5 shadow-sm">
<span className="material-symbols-outlined text-[13px]">tune</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
<strong className="text-on-surface font-semibold">Lộ trình cá nhân hóa 100%</strong>{" phù hợp đúng mục tiêu & thời gian biểu của bạn.\n              "}</p>
</div>
<div className="flex items-start gap-space-xs">
<div className="w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary flex-shrink-0 mt-0.5 shadow-sm">
<span className="material-symbols-outlined text-[13px]">psychology</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
<strong className="text-on-surface font-semibold">Đề xuất Flashcard SRS</strong>{" ngắt quãng thông minh, ghi nhớ từ vựng và Kanji dài hạn.\n              "}</p>
</div>
<div className="flex items-start gap-space-xs">
<div className="w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary flex-shrink-0 mt-0.5 shadow-sm">
<span className="material-symbols-outlined text-[13px]">support_agent</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
<strong className="text-on-surface font-semibold">Sensei 1-on-1 cố vấn</strong>{" định hướng giải đáp chi tiết trong suốt quá trình học.\n              "}</p>
</div>
</div>
</div>
{/*  Social Proof / Testimonial Miniature  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold flex-shrink-0">
<span className="material-symbols-outlined text-[20px]">thumb_up</span>
</div>
<div className="flex flex-col">
<div className="flex items-center gap-1">
<span className="font-title-md text-title-md text-on-surface font-bold">98.4%</span>
<span className="font-body-sm text-body-sm text-tertiary font-semibold">độ chính xác</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">học viên tìm được đúng lộ trình từ lần khảo sát đầu tiên.</span>
</div>
</div>
</div>
</div>
{/*  Action Sticky/Fixed Bottom Bar  */}
<div className="w-full flex flex-col md:flex-row items-center justify-between gap-space-md pt-space-lg">
<a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface flex items-center gap-space-xxs transition-colors" href="#">
<span className="material-symbols-outlined text-[18px]">west</span>
<span>Quay lại trang trước</span>
</a>
<div className="flex flex-col sm:flex-row items-center gap-space-lg w-full md:w-auto">
<Link to="/app" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors text-center">Bỏ qua bước này và vào xem toàn bộ giáo trình</Link>
<Link to="/app" className="w-full sm:w-auto px-space-xl py-space-sm rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs shadow-md hover:shadow-xl transition-all hover:scale-[1.02]">
<span>Tiếp tục vào Tổng quan</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
</div>
</div>
</div>
</div>
</main>
<footer className="w-full bg-surface-container-low mt-space-3xl py-space-2xl"><div className="w-full px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-lg"><div className="flex items-center gap-space-xs"><span className="material-symbols-outlined text-primary text-[22px]">spa</span><span className="font-title-md text-title-md text-on-surface font-semibold">RikiPath</span><span className="font-body-sm text-body-sm text-on-surface-variant ml-space-sm">© 2024 RikiPath Learning. Bản quyền thuộc về học viện tiếng Nhật.</span></div><div className="flex items-center gap-space-lg"><a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Điều khoản</a><a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Chính sách bảo mật</a><a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Trung tâm trợ giúp</a></div></div></footer>
    </div>
  );
}
