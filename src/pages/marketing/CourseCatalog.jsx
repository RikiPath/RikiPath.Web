import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';

export default function CourseCatalog() {
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
      function filterCourses(level, el) {
            // Update Tab Styles
            const buttons = document.querySelectorAll('.level-filter-btn');
            buttons.forEach(btn => {
              btn.classList.remove('bg-primary', 'text-on-primary', 'shadow-md');
              btn.classList.add('bg-surface-container-low', 'text-on-surface-variant');
            });
            if (el) {
              el.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
              el.classList.add('bg-primary', 'text-on-primary', 'shadow-md');
            }
      
            // Filter Cards
            const cards = document.querySelectorAll('.course-card');
            let visibleCount = 0;
            cards.forEach(card => {
              const cardLevel = card.getAttribute('data-level');
              if (level === 'all' || cardLevel === level) {
                card.style.display = 'flex';
                visibleCount++;
              } else {
                card.style.display = 'none';
              }
            });
      
            const countEl = document.getElementById('course-count');
            if (countEl) {
              countEl.textContent = visibleCount;
            }
          }
      
          function sortCourses(criteria) {
            const grid = document.getElementById('course-grid');
            const cards = Array.from(grid.querySelectorAll('.course-card'));
      
            cards.sort((a, b) => {
              const priceA = parseInt(a.getAttribute('data-price') || '0', 10);
              const priceB = parseInt(b.getAttribute('data-price') || '0', 10);
              const ratingA = parseFloat(a.getAttribute('data-rating') || '0');
              const ratingB = parseFloat(b.getAttribute('data-rating') || '0');
      
              if (criteria === 'price-asc') {
                return priceA - priceB;
              } else if (criteria === 'rating') {
                return ratingB - ratingA;
              } else {
                // Default / popular
                return ratingB - ratingA;
              }
            });
      
            cards.forEach(card => grid.appendChild(card));
          }
      
          // Realtime search filter
          const searchInput = document.getElementById('course-search-input');
          if (searchInput) {
            searchInput.addEventListener('input', function(e) {
              const query = e.target.value.toLowerCase().trim();
              const cards = document.querySelectorAll('.course-card');
              let count = 0;
      
              cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(query)) {
                  card.style.display = 'flex';
                  count++;
                } else {
                  card.style.display = 'none';
                }
              });
      
              const countEl = document.getElementById('course-count');
              if (countEl) {
                countEl.textContent = count;
              }
            });
          }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <MarketingShell pathname={pathname}>
<div className="bg-surface text-on-surface antialiased" style={{ backgroundColor: "rgb(250, 247, 242)" }} data-page="CourseCatalog" data-shell-unified="1">
<div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: "url(\"https://lh3.googleusercontent.com/aida/AEtjO1XsYWpcypAaiicJ5aWDsaW-GEmVWOKogAEQ7kZW4nxNFB_JZTuC9dhy22iD5Mnutw1-dtQ-HzB6D_VzjEx9subcYz6PRrv0yijHn4N-jAJ5MXOS4-C7ZVxGV4l2XoEkHfC4wG6mbXFoj3jaBxyOPj_Z_xylJmm-FRcPsVf-1klRUQuv1hr9HgKslqHQcIxclS9hAnXtwq8jA0ngfRmWAVTjaBx5hh644yXJMi3Bdy5g8E0mhB9PvzPKpXg\")", backgroundRepeat: "repeat", backgroundSize: "120px 120px", opacity: "0.2" }}></div>

<main className="w-full pt-0 min-h-[calc(100vh-16rem)] relative"><div className="flex flex-col w-full">
{/*  Top Subtle Subnav Bar specific to Catalog  */}
<div className="w-full bg-surface-container-low/70 backdrop-blur-md sticky top-16 z-40 shadow-sm">
<div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xs flex items-center justify-between">
<div className="flex items-center gap-space-sm overflow-x-auto no-scrollbar">
<a className="relative py-space-xs px-space-sm font-label-lg text-label-lg text-primary font-semibold whitespace-nowrap" href="#">{"Khóa học\n          "}<span className="absolute bottom-0 left-space-sm right-space-sm h-[3px] bg-primary rounded-full"></span>
</a>
<a className="py-space-xs px-space-sm font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap" href="#">{"Lộ trình JLPT\n        "}</a>
<a className="py-space-xs px-space-sm font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap" href="#">{"Kho kiến thức\n        "}</a>
<a className="py-space-xs px-space-sm font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap" href="#">{"Thi thử Online\n        "}</a>
<a className="py-space-xs px-space-sm font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap" href="#">{"Tư vấn 1:1\n        "}</a>
</div>
<div className="hidden sm:flex items-center gap-space-sm shrink-0">
<Link to="/auth" className="px-space-md py-1.5 font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors inline-flex items-center">Đăng nhập</Link>
<Link to="/register" className="px-space-md py-1.5 bg-primary text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary/90 transition-all inline-flex items-center">Học thử miễn phí</Link>
</div>
</div>
</div>
{/*  Hero / Banner Section  */}
<section className="relative w-full bg-surface-container-low overflow-hidden py-space-2xl md:py-space-3xl">
<div className="absolute -top-24 -right-20 w-96 h-96 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none"></div>
<div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-fixed/50 rounded-full blur-3xl pointer-events-none"></div>
<div className="relative max-w-7xl mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop">
<div className="flex flex-col lg:flex-row items-center justify-between gap-space-xl">
<div className="max-w-2xl text-center lg:text-left">
<div className="inline-flex items-center gap-space-xs px-space-sm py-1 bg-surface-container rounded-full mb-space-sm">
<span className="material-symbols-outlined text-primary text-[18px]">local_florist</span>
<span className="font-label-sm text-label-sm text-primary tracking-wide uppercase font-bold">Học viện Tiếng Nhật RikiPath</span>
</div>
<h1 className="font-headline-lg text-headline-lg md:text-[40px] text-on-surface leading-tight tracking-tight mb-space-sm">{"Hệ thống Khóa học Tiếng Nhật Chuẩn JLPT\n          "}</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant mb-space-xl leading-relaxed">{"Lộ trình cá nhân hóa từ N5 đến N1 cùng trợ giảng AI Haru 24/7 và đội ngũ chuyên gia sư phạm giàu kinh nghiệm chuẩn Tokyo.\n          "}</p>
{/*  Search Bar Embedded  */}
<div className="relative bg-surface-container-lowest shadow-xl rounded-full p-1.5 flex items-center gap-space-xs max-w-xl mx-auto lg:mx-0">
<span className="material-symbols-outlined text-primary pl-space-sm text-[22px]">search</span>
<input className="w-full bg-transparent text-on-surface font-body-md text-body-md placeholder:text-outline-variant outline-none px-space-xs py-2" id="course-search-input" placeholder="Tìm theo tên khóa, cấp độ N3, ngữ pháp, trợ giảng AI..." type="text" />
<button className="bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg px-space-lg py-2.5 rounded-full shrink-0 shadow-md transition-all flex items-center gap-1" type="button">
<span className="">Tìm kiếm</span>
</button>
</div>
{/*  Quick Stats Pills  */}
<div className="flex flex-wrap items-center justify-center lg:justify-start gap-space-md mt-space-lg text-on-surface-variant">
<div className="flex items-center gap-1.5 font-label-md text-label-md">
<span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
<span className="">100% Cam kết đầu ra</span>
</div>
<div className="flex items-center gap-1.5 font-label-md text-label-md">
<span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
<span className="">Trợ giảng AI Haru 24/7</span>
</div>
<div className="flex items-center gap-1.5 font-label-md text-label-md">
<span className="material-symbols-outlined text-secondary text-[18px]">groups</span>
<span className="">45,000+ Học viên đỗ JLPT</span>
</div>
</div>
</div>
{/*  Banner Visual Card with Sakura Accents  */}
<div className="w-full lg:w-auto relative flex justify-center">
<div className="relative w-80 sm:w-96 rounded-3xl bg-surface-container-lowest p-space-md shadow-xl flex flex-col gap-space-md">
<div className="relative h-48 rounded-2xl overflow-hidden">
<img className="w-full h-full object-cover" data-alt="A serene modern Japanese study workspace with cherry blossom petals falling gently near a bright window, sleek laptop displaying Japanese Kanji characters, pastel pink hues, soft natural light, minimalist Zen aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYyuuTIbsQGKeTkW-5FfQoMZWxbQCTRhMDcazyIjsza2uJMv_dih-csp89MyqP5r_be01eaCTxBBWs1caI-XSVttkVuSARY_BQhelQq2IQP-Z6g03qwNpri1kWTqrX67jCDgEiXXKjfRkZ1tbAaiLQJUH2zdFN3YfjF83UEmvoZXFMIlDCLD0k7qY8b5zB2hLGgAwiycRLkE3j85mQjSNqjWuN7Bvyv5AUd5J5kdQ2ni1d4Fc1I01O" />
<div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 via-transparent to-transparent"></div>
<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-on-primary">
<span className="px-2.5 py-1 rounded-full bg-primary/90 font-label-sm text-label-sm backdrop-blur-sm">{"Lộ trình Kỳ thi JLPT 2024 - 2025\n                "}</span>
<span className="material-symbols-outlined text-[20px] text-tertiary-fixed">eco</span>
</div>
</div>
<div className="space-y-space-xs">
<div className="flex items-center justify-between">
<span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider">Trợ giảng đồng hành</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>{" Sẵn sàng\n                "}</span>
</div>
<h3 className="font-headline-sm text-headline-sm text-on-surface">AI Haru Sensei</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">{"Giải đáp bài tập, chỉnh âm Kaiwa thời gian thực và tạo đề thi JLPT cá nhân hóa từng năng lực.\n              "}</p>
</div>
<div className="pt-space-xs flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
<div className="flex -space-x-2">
<div className="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-label-sm text-label-sm">HN</div>
<div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-label-sm text-label-sm">TK</div>
<div className="w-7 h-7 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-label-sm text-label-sm">SY</div>
</div>
<span className="font-label-md text-label-md text-on-surface-variant font-medium">1,420+ bạn đang trực tuyến</span>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  Filter & Catalog Section  */}
<section className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl">
{/*  Filter Controls  */}
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md mb-space-xl pb-space-md">
{/*  Level Tabs  */}
<div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar" id="level-filter-container">
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-primary text-on-primary shadow-md transition-all whitespace-nowrap" onClick={(e) => { filterCourses('all', e.currentTarget) }} type="button">{"Tất cả\n        "}</button>
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all whitespace-nowrap" onClick={(e) => { filterCourses('n5', e.currentTarget) }} type="button">{"N5 (Sơ cấp 1)\n        "}</button>
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all whitespace-nowrap" onClick={(e) => { filterCourses('n4', e.currentTarget) }} type="button">{"N4 (Sơ cấp 2)\n        "}</button>
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all whitespace-nowrap" onClick={(e) => { filterCourses('n3', e.currentTarget) }} type="button">{"N3 (Trung cấp)\n        "}</button>
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all whitespace-nowrap" onClick={(e) => { filterCourses('n2', e.currentTarget) }} type="button">{"N2 (Cao cấp)\n        "}</button>
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all whitespace-nowrap" onClick={(e) => { filterCourses('n1', e.currentTarget) }} type="button">{"N1 (Thượng cấp)\n        "}</button>
<button className="level-filter-btn px-space-md py-2 rounded-full font-label-lg text-label-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all whitespace-nowrap" onClick={(e) => { filterCourses('kaiwa', e.currentTarget) }} type="button">{"Giao tiếp Kaiwa\n        "}</button>
</div>
{/*  Sort Dropdown & Result Count  */}
<div className="flex items-center justify-between w-full md:w-auto gap-space-md shrink-0">
<span className="font-body-sm text-body-sm text-on-surface-variant hidden lg:inline">{"Hiển thị "}<span className="font-semibold text-primary" id="course-count">6</span>{" khóa học phù hợp\n        "}</span>
<div className="relative flex items-center bg-surface-container-lowest rounded-full px-space-md py-1.5 shadow-sm">
<span className="material-symbols-outlined text-outline text-[18px] mr-1.5">swap_vert</span>
<label className="sr-only" htmlFor="sort-select">Sắp xếp khóa học</label>
<select className="bg-transparent font-label-md text-label-md text-on-surface outline-none cursor-pointer pr-space-xs" id="sort-select" onChange={(e) => { sortCourses(e.currentTarget.value) }}>
<option value="popular">Phổ biến nhất</option>
<option value="rating">Đánh giá cao nhất</option>
<option value="newest">Mới nhất</option>
<option value="price-asc">Học phí: Thấp đến Cao</option>
</select>
</div>
</div>
</div>
{/*  Course Grid (6 Bento Cards)  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg" id="course-grid">
{/*  Card 1: N4 Toàn diện (Bestseller)  */}
<article className="course-card group bg-surface-container-lowest rounded-3xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between" data-level="n4" data-price="1299000" data-rating="4.8">
<div>
{/*  Thumbnail & Badges  */}
<div className="relative h-52 rounded-2xl overflow-hidden mb-space-md">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Japanese pagoda in spring surrounded by blooming pink sakura blossoms, soft morning sunlight, serene Japanese aesthetic, academic book mockup, high quality photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIENnKosJ6K0jt24-5AWODufnz2c6StN0QHr4Ie3AhrXCSc5DsZUYkUDDUlPHgIhfcJckxZpzhJ5np9f8GlxgNRTbIyygYOX3r6x5cEqVf-Rr05RBiyINJJYXgHbKNScSsuof-Fgs6aXRZS8Cbo-FAGSuIBFyktwaKXRSqZun6skGslcHpQEaDIfHDdh77olXS_lNUIjz7VD9WZFF729pxK_QvT22toa09m6mvlfUTZxmerdsICIsQ" />
<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2.5 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-sm">{"Bestseller\n              "}</span>
<span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold backdrop-blur-sm">{"JLPT N4\n              "}</span>
</div>
<div className="absolute bottom-3 left-3 flex items-center gap-1 bg-surface-container-lowest/90 px-2.5 py-1 rounded-full text-on-surface">
<span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
<span className="font-label-sm text-label-sm font-bold">4.8</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(1,245)</span>
</div>
</div>
{/*  Title & Instructor  */}
<div className="space-y-space-xs mb-space-md">
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-primary text-[16px]">school</span>
<span className="">{"Giảng viên: "}<strong className="text-on-surface">Cô Nguyễn Thu Hà</strong></span>
</div>
<h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{"Chinh phục JLPT N4 Toàn diện\n            "}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{"Làm chủ 300 chữ Hán, nắm chắc toàn bộ ngữ pháp Minna no Nihongo bài 26-50 và rèn phản xạ nghe đề thi thật.\n            "}</p>
</div>
{/*  Course Metrics  */}
<div className="grid grid-cols-2 gap-2 p-space-xs rounded-xl bg-surface-container-low mb-space-md text-on-surface-variant font-label-sm text-label-sm">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
<span className="">60 Giờ học video</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-tertiary text-[18px]">task_alt</span>
<span className="">120 Bài chấm chữa</span>
</div>
</div>
</div>
{/*  Footer / Pricing & CTA  */}
<div className="pt-space-sm mt-auto">
<div className="flex items-baseline justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-primary font-bold">1,299,000đ</span>
<span className="font-body-sm text-body-sm text-outline line-through ml-1.5">2,500,000đ</span>
</div>
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{"-48%\n            "}</span>
</div>
<div className="grid grid-cols-2 gap-2">
<button className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors text-center" type="button">{"Chi tiết\n            "}</button>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>
</div>
</div>
</article>
{/*  Card 2: N5 Khởi động  */}
<article className="course-card group bg-surface-container-lowest rounded-3xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between" data-level="n5" data-price="990000" data-rating="4.9">
<div>
{/*  Thumbnail & Badges  */}
<div className="relative h-52 rounded-2xl overflow-hidden mb-space-md">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Modern bright Japanese classroom with wooden desks, chalk board with Hiragana and Katakana characters, cherry blossom branches outside the sunny window, photorealistic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTSH65Ujt77Mwb7qmv_6IPFw40uqBnU0pdjcJIJrCQzlfWFWqqjgIgYL2D7ZI5PTZG3ZckbPz-Iux1zGX3PxW47YEIfb7Qd3wI97aKcBgpuJjLtqNimlyuvA_yP8GS-VPCcOvZrX89JqJA2p07eO95X6ch1gRiEu3on0AhYXOqRZyujYQaQ1o4VcnR9AIZUv2n-LnQeuhxGSU4bzWPke_-wv-UBQSIctJXOjPX6CA86pSMkoLKLZHj" />
<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold shadow-sm">{"Sơ cấp 1\n              "}</span>
<span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 text-primary font-label-sm text-label-sm font-semibold">{"JLPT N5\n              "}</span>
</div>
<div className="absolute bottom-3 left-3 flex items-center gap-1 bg-surface-container-lowest/90 px-2.5 py-1 rounded-full text-on-surface">
<span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
<span className="font-label-sm text-label-sm font-bold">4.9</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(2,180)</span>
</div>
</div>
{/*  Title & Instructor  */}
<div className="space-y-space-xs mb-space-md">
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-primary text-[16px]">school</span>
<span className="">{"Giảng viên: "}<strong className="text-on-surface">Thầy Kenji Sato</strong></span>
</div>
<h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{"JLPT N5 Khởi động Vững chắc\n            "}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{"Dành riêng cho người mới bắt đầu: Bảng chữ cái Hiragana, Katakana, phát âm chuẩn tự nhiên và 25 bài sơ cấp cơ bản.\n            "}</p>
</div>
{/*  Course Metrics  */}
<div className="grid grid-cols-2 gap-2 p-space-xs rounded-xl bg-surface-container-low mb-space-md text-on-surface-variant font-label-sm text-label-sm">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
<span className="">45 Giờ học video</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-tertiary text-[18px]">task_alt</span>
<span className="">90 Bài tập có chữa</span>
</div>
</div>
</div>
{/*  Footer / Pricing & CTA  */}
<div className="pt-space-sm mt-auto">
<div className="flex items-baseline justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-primary font-bold">990,000đ</span>
<span className="font-body-sm text-body-sm text-outline line-through ml-1.5">1,800,000đ</span>
</div>
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{"-45%\n            "}</span>
</div>
<div className="grid grid-cols-2 gap-2">
<button className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors text-center" type="button">{"Chi tiết\n            "}</button>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>
</div>
</div>
</article>
{/*  Card 3: N3 Cấp tốc  */}
<article className="course-card group bg-surface-container-lowest rounded-3xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between" data-level="n3" data-price="1690000" data-rating="4.8">
<div>
{/*  Thumbnail & Badges  */}
<div className="relative h-52 rounded-2xl overflow-hidden mb-space-md">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="A tranquil Tokyo garden with blooming cherry trees, stone lantern, wooden tea house in the background, warm sunset glow, soft pastel pink accents" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyoP7C8HmiYtnFzc-8EvjFSA-bdEtzks7iftsVQm56bqh5HgqscFtfIUNhXpBrb1UuMRiWHeovaM1ZhEksQW03L2bkh1-gvQ0EKakSTt3aOv5Q_0t0IYEkNf-zokHpF8xdNO05cwy9sGD9oVh61SzcbUpuK3XvhXyt9XT1fa5c21fj1lcNEgDDyEkWIf3aw7DwQOFM2ruvVWAoZJxhYyM4zG1ZV8jBG9XGbCUs4pnbveG478Rzq_BL" />
<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-semibold shadow-sm">{"Luyện thi chuyên sâu\n              "}</span>
<span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 text-primary font-label-sm text-label-sm font-semibold">{"JLPT N3\n              "}</span>
</div>
<div className="absolute bottom-3 left-3 flex items-center gap-1 bg-surface-container-lowest/90 px-2.5 py-1 rounded-full text-on-surface">
<span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
<span className="font-label-sm text-label-sm font-bold">4.8</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(980)</span>
</div>
</div>
{/*  Title & Instructor  */}
<div className="space-y-space-xs mb-space-md">
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-primary text-[16px]">school</span>
<span className="">{"Giảng viên: "}<strong className="text-on-surface">Cô Trần Linh</strong></span>
</div>
<h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{"Bứt phá JLPT N3 Cấp tốc\n            "}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{"Bộ phương pháp độc quyền giải quyết bẫy Đọc hiểu N3, củng cố 650 Kanji và 110 mẫu câu ngữ pháp trọng điểm.\n            "}</p>
</div>
{/*  Course Metrics  */}
<div className="grid grid-cols-2 gap-2 p-space-xs rounded-xl bg-surface-container-low mb-space-md text-on-surface-variant font-label-sm text-label-sm">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
<span className="">80 Giờ học video</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-tertiary text-[18px]">task_alt</span>
<span className="">{"160 Bài tập & Mock"}</span>
</div>
</div>
</div>
{/*  Footer / Pricing & CTA  */}
<div className="pt-space-sm mt-auto">
<div className="flex items-baseline justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-primary font-bold">1,690,000đ</span>
<span className="font-body-sm text-body-sm text-outline line-through ml-1.5">3,200,000đ</span>
</div>
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{"-47%\n            "}</span>
</div>
<div className="grid grid-cols-2 gap-2">
<button className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors text-center" type="button">{"Chi tiết\n            "}</button>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>
</div>
</div>
</article>
{/*  Card 4: N2 Chuyên sâu  */}
<article className="course-card group bg-surface-container-lowest rounded-3xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between" data-level="n2" data-price="2190000" data-rating="4.7">
<div>
{/*  Thumbnail & Badges  */}
<div className="relative h-52 rounded-2xl overflow-hidden mb-space-md">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Japanese traditional calligraphy brushes and inkstone on a clean white desk, with open modern Japanese textbooks, sakura petals scattered tastefully, soft diffused lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPvCH56gh6Jg65Xqz0coEE-LJDbtQjTx7oKmtU9oThQKtOp8A8RnvC1ypGG4LU7s_93F94enk6VG95OLt_IVGUo9HrGS6w-tUpf9xS4cuyI5F3u1bvrEBQffjdvsnI5-DChq9w9boj3XTjC1tHfbh6u58SGS5rtxYJwOOWJEunAdXteUhRimw2_f8VTr_6Pm9V1-Jlh8LPGeUM6iuGdFubDenIDznaDvHzWCEPCh7ZMsdyBS0f1A7d" />
<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2.5 py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold shadow-sm">{"Cao cấp\n              "}</span>
<span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 text-primary font-label-sm text-label-sm font-semibold">{"JLPT N2\n              "}</span>
</div>
<div className="absolute bottom-3 left-3 flex items-center gap-1 bg-surface-container-lowest/90 px-2.5 py-1 rounded-full text-on-surface">
<span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
<span className="font-label-sm text-label-sm font-bold">4.7</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(740)</span>
</div>
</div>
{/*  Title & Instructor  */}
<div className="space-y-space-xs mb-space-md">
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-primary text-[16px]">school</span>
<span className="">{"Giảng viên: "}<strong className="text-on-surface">Thầy Yamada Hiroshi</strong></span>
</div>
<h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{"Luyện thi JLPT N2 Chuyên sâu\n            "}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{"Kỹ thuật đọc lướt văn bản học thuật, nắm bắt sắc thái nghe hiểu thương mại và 1,000 từ vựng trình độ nâng cao.\n            "}</p>
</div>
{/*  Course Metrics  */}
<div className="grid grid-cols-2 gap-2 p-space-xs rounded-xl bg-surface-container-low mb-space-md text-on-surface-variant font-label-sm text-label-sm">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
<span className="">100 Giờ học video</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-tertiary text-[18px]">task_alt</span>
<span className="">200 Bài tập nâng cao</span>
</div>
</div>
</div>
{/*  Footer / Pricing & CTA  */}
<div className="pt-space-sm mt-auto">
<div className="flex items-baseline justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-primary font-bold">2,190,000đ</span>
<span className="font-body-sm text-body-sm text-outline line-through ml-1.5">4,000,000đ</span>
</div>
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{"-45%\n            "}</span>
</div>
<div className="grid grid-cols-2 gap-2">
<button className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors text-center" type="button">{"Chi tiết\n            "}</button>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>
</div>
</div>
</article>
{/*  Card 5: Giao tiếp Kaiwa  */}
<article className="course-card group bg-surface-container-lowest rounded-3xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between" data-level="kaiwa" data-price="1150000" data-rating="4.9">
<div>
{/*  Thumbnail & Badges  */}
<div className="relative h-52 rounded-2xl overflow-hidden mb-space-md">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Young friendly Japanese female teacher smiling in a bright modern Tokyo office with cherry blossoms visible through large glass windows, holding digital tablet, warm soft lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDF71ydysRVyFaMKeFcaFeqxgzYWpGnWEEI7FEzyUmTvR_dsk2RULE2QAGocTUdJXFV68fAs-CD_Hf9oaEzZFBsR_WXHneb9x4jBodbIg2idRd1hucXHHvxXMgY_37if8MDrAyeDjxKUZ8ckvHbdsjb5kIz-yTOrUX_f8nR9wMWH-G4rhApnLiqmrKebRB1vP2snebd1bq4A4zWn6fDhDhbNTXFMlaMcFkwX2Mp0KZZZHVfv-Nb2fZf" />
<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2.5 py-1 rounded-full bg-tertiary text-on-tertiary font-label-sm text-label-sm font-semibold shadow-sm">{"Bản xứ chuẩn Tokyo\n              "}</span>
<span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 text-primary font-label-sm text-label-sm font-semibold">{"Kaiwa\n              "}</span>
</div>
<div className="absolute bottom-3 left-3 flex items-center gap-1 bg-surface-container-lowest/90 px-2.5 py-1 rounded-full text-on-surface">
<span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
<span className="font-label-sm text-label-sm font-bold">4.9</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(1,560)</span>
</div>
</div>
{/*  Title & Instructor  */}
<div className="space-y-space-xs mb-space-md">
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-primary text-[16px]">school</span>
<span className="">{"Giảng viên: "}<strong className="text-on-surface">Cô Sayaka</strong></span>
</div>
<h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{"Giao tiếp Kaiwa Thực chiến Bản xứ\n            "}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{"Xóa bỏ nỗi sợ nói, luyện phản xạ 3 giây chuẩn ngữ điệu người Tokyo trong 40 tình huống đời sống và công việc hàng ngày.\n            "}</p>
</div>
{/*  Course Metrics  */}
<div className="grid grid-cols-2 gap-2 p-space-xs rounded-xl bg-surface-container-low mb-space-md text-on-surface-variant font-label-sm text-label-sm">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
<span className="">35 Giờ tương tác</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-tertiary text-[18px]">record_voice_over</span>
<span className="">Phản xạ 1:1 cùng AI</span>
</div>
</div>
</div>
{/*  Footer / Pricing & CTA  */}
<div className="pt-space-sm mt-auto">
<div className="flex items-baseline justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-primary font-bold">1,150,000đ</span>
<span className="font-body-sm text-body-sm text-outline line-through ml-1.5">2,200,000đ</span>
</div>
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{"-48%\n            "}</span>
</div>
<div className="grid grid-cols-2 gap-2">
<button className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors text-center" type="button">{"Chi tiết\n            "}</button>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>
</div>
</div>
</article>
{/*  Card 6: Kanji & AI Haru  */}
<article className="course-card group bg-surface-container-lowest rounded-3xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between" data-level="n5" data-price="850000" data-rating="4.9">
<div>
{/*  Thumbnail & Badges  */}
<div className="relative h-52 rounded-2xl overflow-hidden mb-space-md">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Futuristic yet serene digital learning setting, glowing kanji characters floating softly above a glass tablet, delicate sakura petals overlay, warm pastel pink and ivory lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBN8GpN46z9RZmZ_1Y57f6vNDJBoSifoW4NCPLUuEmeQ0CZebLh7jeYo9X1rzifMle3ycv2-U62sQOwpgiTp_xd7PvHeB5rsCJYB-orqN9aZwTDAzK7Dju0PPf089u8SzIsNlp5mHpQ0lVZv1Ua_D_YbYywc2LCmZVIedD47htxd4RWQV8jp8xbm4czGpnN9tdixNLZTXm5V1IScSOoUZAHtHI321PAPFZgrsLZst2c-bnBmUKak02" />
<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold shadow-sm flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">auto_awesome</span>{" AI Haru\n              "}</span>
<span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 text-primary font-label-sm text-label-sm font-semibold">{"Kanji & Viết\n              "}</span>
</div>
<div className="absolute bottom-3 left-3 flex items-center gap-1 bg-surface-container-lowest/90 px-2.5 py-1 rounded-full text-on-surface">
<span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
<span className="font-label-sm text-label-sm font-bold">4.9</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(1,890)</span>
</div>
</div>
{/*  Title & Instructor  */}
<div className="space-y-space-xs mb-space-md">
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
<span className="material-symbols-outlined text-primary text-[16px]">smart_toy</span>
<span className="">{"Trợ lý: "}<strong className="text-on-surface">Hệ thống AI Haru 24/7</strong></span>
</div>
<h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{"Kanji & Viết câu Thông minh cùng AI Haru\n            "}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{"Ghi nhớ 214 bộ thủ bằng câu chuyện liên tưởng, luyện viết nét chữ đúng quy tắc và sửa lỗi diễn đạt văn bản lập tức.\n            "}</p>
</div>
{/*  Course Metrics  */}
<div className="grid grid-cols-2 gap-2 p-space-xs rounded-xl bg-surface-container-low mb-space-md text-on-surface-variant font-label-sm text-label-sm">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
<span className="">30 Giờ tương tác</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-tertiary text-[18px]">draw</span>
<span className="">Sửa lỗi tức thì</span>
</div>
</div>
</div>
{/*  Footer / Pricing & CTA  */}
<div className="pt-space-sm mt-auto">
<div className="flex items-baseline justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-primary font-bold">850,000đ</span>
<span className="font-body-sm text-body-sm text-outline line-through ml-1.5">1,600,000đ</span>
</div>
<span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{"-47%\n            "}</span>
</div>
<div className="grid grid-cols-2 gap-2">
<button className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors text-center" type="button">{"Chi tiết\n            "}</button>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>
</div>
</div>
</article>
</div>
</section>
{/*  Learning Path Advisor CTA Strip  */}
<section className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop my-space-2xl">
<div className="relative bg-gradient-to-r from-surface-container-low via-secondary-container/30 to-surface-container-low rounded-3xl p-space-xl overflow-hidden shadow-md flex flex-col md:flex-row items-center justify-between gap-space-lg">
<div className="max-w-xl space-y-space-xs">
<div className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">route</span>{"Chưa biết bắt đầu từ đâu?\n        "}</div>
<h2 className="font-headline-md text-headline-md text-on-surface">{"Làm bài kiểm tra năng lực tiếng Nhật 15 phút\n        "}</h2>
<p className="font-body-md text-body-md text-on-surface-variant">{"Hệ thống AI Haru sẽ phân tích điểm mạnh - điểm yếu và thiết kế lộ trình JLPT cá nhân hóa hoàn toàn miễn phí dành riêng cho bạn.\n        "}</p>
</div>
<div className="flex items-center gap-space-sm shrink-0">
<button className="px-space-xl py-3 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all flex items-center gap-2" type="button">
<span className="">Test năng lực ngay</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
</div>
</div>
</section>
{/*  Interactive Filter & Search Script  */}

</div></main>



    </div>
  
</MarketingShell>
);
}
