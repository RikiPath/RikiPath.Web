import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function HomeLanding() {
  const { pathname } = useLocation();
  return (
    <MarketingShell pathname={pathname}>
<div className="bg-background text-on-surface antialiased selection:bg-sakura-soft selection:text-sakura-deep min-h-screen flex flex-col" data-page="HomeLanding" data-shell-unified="1">


{/*  STICKY TOPBAR / NAVIGATION  */}





{/*  MAIN CONTENT  */}


<main className="w-full flex-1">
{/*  HERO SECTION  */}
<section className="relative w-full overflow-hidden pt-8 pb-20 lg:pt-14 lg:pb-28">
{/*  Fluid Glowing Ambient Sakura Glow  */}
<div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[1100px] h-[580px] bg-gradient-to-b from-[#ffd9e4]/45 via-surface-container-low/40 to-transparent blur-3xl -z-10"></div>
<div className="pointer-events-none absolute top-72 -right-40 w-96 h-96 bg-[#ffd9dd]/35 rounded-full blur-3xl -z-10"></div>
<div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
{/*  Left Hero Copy  */}
<div className="lg:col-span-7 flex flex-col items-start space-y-6 z-10">
{/*  Seasonal Pill Tag  */}
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sakura-soft to-white border border-[#dfbfc1]/60 shadow-sm">
<span className="material-symbols-outlined text-[#D94B68] text-[18px]">spa</span>
<span className="text-xs font-bold tracking-wide uppercase text-[#9E2A4B]">Mùa hoa anh đào 2025 • Lộ trình bứt phá JLPT</span>
</div>
{/*  Hero Main Title  */}
<h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-on-surface tracking-tight leading-[1.12]">{"Hành trình chinh phục "}<br />
<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D94B68] via-[#ab2848] to-[#9E2A4B]">tiếng Nhật rực rỡ</span> <br />{"như mùa hoa anh đào\n          "}</h1>
{/*  Hero Subtitle  */}
<p className="text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">{"Chinh phục chuẩn xác JLPT N5 đến N1 với lộ trình cá nhân hóa tích hợp công nghệ AI nhận diện âm vị Tokyo cùng sự dẫn dắt 1-kèm-1 trực tiếp từ đội ngũ Sensei giàu kinh nghiệm tại Nhật.\n          "}</p>
{/*  Dual CTAs  */}
<div className="pt-2 flex flex-wrap items-center gap-4 w-full sm:w-auto">
<Link className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white text-base font-bold shadow-lg shadow-[#D94B68]/30 hover:shadow-xl hover:shadow-[#D94B68]/40 hover:-translate-y-0.5 transition-all duration-300" to="/register">
<span>Bắt đầu học thử miễn phí</span>
<span className="material-symbols-outlined text-[20px]">arrow_forward</span>
</Link>
<a className="flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white hover:bg-surface-container-low text-[#9E2A4B] border border-[#dfbfc1]/60 text-base font-semibold shadow-sm hover:-translate-y-0.5 transition-all duration-300" href="#pathway">
<span className="material-symbols-outlined text-[20px] text-[#D94B68]">explore</span>
<span>Khám phá lộ trình</span>
</a>
</div>
{/*  Social Proof Trust Metrics  */}
<div className="pt-6 border-t border-[#dfbfc1]/40 w-full flex flex-wrap items-center gap-8 sm:gap-12">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-2xl bg-[#ffd9dd]/60 flex items-center justify-center text-[#9E2A4B]">
<span className="material-symbols-outlined text-[26px]">workspace_premium</span>
</div>
<div className="flex flex-col">
<span className="text-2xl font-extrabold text-on-surface leading-tight">98.4%</span>
<span className="text-xs text-on-surface-variant font-medium">Tỉ lệ đỗ JLPT kỳ trước</span>
</div>
</div>
<div className="w-px h-10 bg-[#dfbfc1]/50 hidden sm:block"></div>
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-2xl bg-[#b7f481]/30 flex items-center justify-center text-[#366800]">
<span className="material-symbols-outlined text-[26px]">groups</span>
</div>
<div className="flex flex-col">
<span className="text-2xl font-extrabold text-on-surface leading-tight">120,000+</span>
<span className="text-xs text-on-surface-variant font-medium">Học viên toàn cầu</span>
</div>
</div>
<div className="w-px h-10 bg-[#dfbfc1]/50 hidden sm:block"></div>
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
<span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
</div>
<div className="flex flex-col">
<span className="text-2xl font-extrabold text-on-surface leading-tight">4.9 / 5.0</span>
<span className="text-xs text-on-surface-variant font-medium">Đánh giá từ 14,000+ review</span>
</div>
</div>
</div>
</div>
{/*  Right Hero Interactive Graphic Showcase  */}
<div className="lg:col-span-5 relative">
<div className="relative w-full rounded-3xl bg-white/80 p-3 shadow-2xl shadow-[#D94B68]/10 border border-[#dfbfc1]/50 backdrop-blur-md">
{/*  Main Hero Visual Card  */}
<div className="relative w-full h-[470px] rounded-2xl overflow-hidden group">
<img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" data-alt="A serene modern study corner with a young Asian student writing Japanese kanji in an open notebook, cherry blossom branches gently swaying outside the large sunlit glass window" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi3ul9Bn0SG4YpmFwktqbxFQvGtNZKWiMhTEH_QJhCfkaUuv5GgPTFGvlRx8AH1tCaD0c0D1OdKRstJdiquTwfUw5qnkSlH_72Y--oWkGR_41NZkblBDZiiGzyw_CzSFMhG2DJ_E7wtdZviCj1WMUf5933p2791fBm_0TFMZG6LLbWo_obPJkt3Sa1xHchVJSBE9tRu7Y9V0_tNUoXRcuEvkIztKVk4qjWINiK57LGm-W0ULCqN-3T" />
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
{/*  Top Left: Study Streak Badge (14 Days)  */}
<div className="absolute top-4 left-4 backdrop-blur-md bg-white/95 px-3.5 py-2 rounded-2xl shadow-lg border border-[#dfbfc1]/30 flex items-center gap-2">
<div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
</div>
<div>
<div className="flex items-center gap-1">
<span className="text-sm font-bold text-on-surface">14 ngày</span>
<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
</div>
<span className="text-[10px] text-outline font-medium">Chuỗi học tập liên tục</span>
</div>
</div>
{/*  Top Right: Haru AI Sensei Pronunciation Widget  */}
<div className="absolute top-4 right-4 backdrop-blur-md bg-white/95 px-3.5 py-2 rounded-2xl shadow-lg border border-[#dfbfc1]/30 flex items-center gap-2">
<div className="w-8 h-8 rounded-xl bg-[#ffd9dd] text-[#9E2A4B] flex items-center justify-center">
<span className="material-symbols-outlined text-[18px]">graphic_eq</span>
</div>
<div>
<span className="text-xs font-bold text-[#9E2A4B]">Haru AI Voice</span>
<div className="text-[10px] text-tertiary font-semibold flex items-center gap-0.5">
<span className="material-symbols-outlined text-[12px]">check_circle</span>
<span>Pitch: 98.6%</span>
</div>
</div>
</div>
{/*  Bottom Overlay: Current JLPT Goal & Active Lesson Tracker  */}
<div className="absolute bottom-4 left-4 right-4 backdrop-blur-xl bg-white/95 rounded-2xl p-4 shadow-xl border border-white/60">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="w-6 h-6 rounded-lg bg-[#D94B68] text-white flex items-center justify-center text-xs font-bold">N3</span>
<span className="text-sm font-bold text-on-surface">Mục tiêu JLPT N3 Đột Phá</span>
</div>
<span className="text-xs font-bold text-[#D94B68]">78% Hoàn thành</span>
</div>
{/*  Custom Progress Bar  */}
<div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden">
<div className="bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] h-full rounded-full transition-all duration-1000" style={{ width: "78%" }}></div>
</div>
{/*  Next lesson snippet  */}
<div className="mt-3 pt-2.5 border-t border-[#dfbfc1]/30 flex items-center justify-between">
<div className="flex items-center gap-2.5 overflow-hidden pr-2">
<span className="w-7 h-7 shrink-0 rounded-full bg-secondary-fixed flex items-center justify-center font-bold text-[11px] text-[#9E2A4B] font-jp">第7</span>
<div className="truncate">
<p className="text-xs font-bold text-on-surface truncate">Bài 7: Ngữ pháp ～わけにはいかない</p>
<p className="text-[10px] text-outline">Kèm 15 câu Shadowing phát âm</p>
</div>
</div>
<button className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#D94B68] hover:bg-[#9E2A4B] text-white text-xs font-bold shadow transition-colors flex items-center gap-1" type="button">
<span>Học tiếp</span>
<span className="material-symbols-outlined text-[14px]">play_arrow</span>
</button>
</div>
</div>
</div>
{/*  Floating Spaced Repetition Pill Tag  */}
<div className="absolute -bottom-5 -left-6 hidden sm:flex backdrop-blur-xl bg-white rounded-2xl p-3 shadow-xl border border-[#dfbfc1]/40 items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fec1d6] to-[#ffd9e4] flex items-center justify-center text-[#9E2A4B]">
<span className="material-symbols-outlined text-[22px]">psychology</span>
</div>
<div>
<div className="text-xs font-bold text-on-surface">SRS Spaced Repetition</div>
<div className="text-[11px] text-on-surface-variant">{"Hôm nay: "}<strong className="text-[#D94B68]">24 Kanji</strong>{" cần ôn tập"}</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  CORE HIGHLIGHTS / 4 EDUCATIONAL PILLARS  */}
<section className="w-full bg-white/70 py-20 border-y border-[#dfbfc1]/30">
<div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
{/*  Section Header  */}
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
<div className="max-w-2xl">
<div className="inline-flex items-center gap-1.5 text-[#D94B68] text-xs font-bold uppercase tracking-wider mb-2.5">
<span className="material-symbols-outlined text-[16px]">stars</span>
<span>Đặc quyền phương pháp RikiPath</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">{"Công nghệ tiên phong nâng bước tư duy bản xứ\n          "}</h2>
</div>
<p className="text-on-surface-variant max-w-md text-sm sm:text-base leading-relaxed">{"Sự kết hợp tinh tế giữa triết lý rèn luyện Nhật Bản (Kaizen) và AI thông minh giúp rút ngắn 40% thời gian chinh phục kỳ thi JLPT.\n        "}</p>
</div>
{/*  4 Pillars Grid  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
<Link to="/feature/shadowing" className="group relative rounded-3xl bg-background p-7 border border-[#dfbfc1]/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
<div>
<div className="w-14 h-14 rounded-2xl bg-[#ffd9e4]/70 flex items-center justify-center text-[#9E2A4B] group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[30px]">record_voice_over</span>
</div>
<h3 className="mt-6 text-lg font-bold text-on-surface">Shadowing chuẩn Tokyo</h3>
<p className="mt-2.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{"Rèn luyện ngữ điệu, ngắt câu tự nhiên theo giọng phát thanh viên NHK, xoá bỏ rào cản ấp úng ngập ngừng khi phản xạ thực chiến.\n            "}</p>
</div>
<div className="mt-6 pt-4 border-t border-[#dfbfc1]/30 flex items-center text-[#D94B68] text-xs font-bold gap-1 group-hover:text-[#9E2A4B]">
<span>Trải nghiệm kỹ thuật</span>
<span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</div>
</Link>
<Link to="/feature/ai-scoring" className="group relative rounded-3xl bg-background p-7 border border-[#dfbfc1]/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
<div>
<div className="w-14 h-14 rounded-2xl bg-[#ffd9dd]/70 flex items-center justify-center text-[#9E2A4B] group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[30px]">neurology</span>
</div>
<h3 className="mt-6 text-lg font-bold text-on-surface">{"AI Chấm thi & Phát âm"}</h3>
<p className="mt-2.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{"Bộ thuật toán AI phân tích cao độ Pitch Accent, chỉ ra lỗi sai từng âm tiết và dự báo chuẩn xác điểm số JLPT qua từng tuần.\n            "}</p>
</div>
<div className="mt-6 pt-4 border-t border-[#dfbfc1]/30 flex items-center text-[#D94B68] text-xs font-bold gap-1 group-hover:text-[#9E2A4B]">
<span>Xem mô phỏng AI</span>
<span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</div>
</Link>
<Link to="/feature/srs" className="group relative rounded-3xl bg-background p-7 border border-[#dfbfc1]/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
<div>
<div className="w-14 h-14 rounded-2xl bg-secondary-container/60 flex items-center justify-center text-[#9E2A4B] group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[30px]">auto_stories</span>
</div>
<h3 className="mt-6 text-lg font-bold text-on-surface">{"10,000+ Kanji & Flashcard SRS"}</h3>
<p className="mt-2.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{"Học Hán tự qua hình tượng minh họa văn hóa và chu kỳ lặp ngắt quãng Ebbinghaus, nhớ sâu gốc từ mà không lo quên mặt chữ.\n            "}</p>
</div>
<div className="mt-6 pt-4 border-t border-[#dfbfc1]/30 flex items-center text-[#D94B68] text-xs font-bold gap-1 group-hover:text-[#9E2A4B]">
<span>Thư viện từ vựng</span>
<span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</div>
</Link>
<Link to="/feature/sensei" className="group relative rounded-3xl bg-background p-7 border border-[#dfbfc1]/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" id="sensei">
<div>
<div className="w-14 h-14 rounded-2xl bg-[#b7f481]/40 flex items-center justify-center text-[#366800] group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[30px]">supervisor_account</span>
</div>
<h3 className="mt-6 text-lg font-bold text-on-surface">Cố vấn Chuyên gia 1-on-1</h3>
<p className="mt-2.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{"Sensei người Nhật và giảng viên cao cấp trực tiếp sửa luận, giải đáp thắc mắc 24/7 và định hướng nghề nghiệp, phỏng vấn Tokutei.\n            "}</p>
</div>
<div className="mt-6 pt-4 border-t border-[#dfbfc1]/30 flex items-center text-[#D94B68] text-xs font-bold gap-1 group-hover:text-[#9E2A4B]">
<span>Đội ngũ Sensei</span>
<span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</div>
</Link>
</div>
</div>
</section>
{/*  FEATURED COURSE CATALOG  */}
<section className="w-full py-24" id="pathway">
<div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
{/*  Catalog Header & Filter Tabs  */}
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
<div>
<div className="inline-flex items-center gap-1.5 text-[#D94B68] text-xs font-bold uppercase tracking-wider mb-2">
<span className="material-symbols-outlined text-[16px]">military_tech</span>
<span>Chương trình học tiêu biểu</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">{"Khóa học nổi bật & Lộ trình trọng tâm\n          "}</h2>
</div>
{/*  Filter Tabs  */}
<div className="flex items-center flex-wrap gap-1.5 p-1.5 bg-surface-container rounded-full border border-[#dfbfc1]/30">
<button className="px-5 py-2 rounded-full bg-[#D94B68] text-white text-xs font-bold shadow-sm" type="button">Tất cả khóa học</button>
<button className="px-5 py-2 rounded-full text-on-surface-variant hover:text-on-surface text-xs font-semibold hover:bg-white/50 transition-colors" type="button">JLPT N5-N4</button>
<button className="px-5 py-2 rounded-full text-on-surface-variant hover:text-on-surface text-xs font-semibold hover:bg-white/50 transition-colors" type="button">JLPT N3-N1</button>
<button className="px-5 py-2 rounded-full text-on-surface-variant hover:text-on-surface text-xs font-semibold hover:bg-white/50 transition-colors" type="button">{"Kaiwa & Phỏng vấn"}</button>
</div>
</div>
{/*  4 Cards Grid  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
{/*  Course Card 1  */}
<div className="group rounded-3xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border border-[#dfbfc1]/40">
<div className="relative h-48 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Japanese traditional lantern street in Kyoto with cherry blossoms" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8WCCa2CIrQNLk9eHRrBgctuugMJxJc_JLdt7pKHNC_ezpbw6etwqPG1f52e7dNdmPL2sxfTkk4MtV3t4b8unQwzoxCloWj-yfzNazHHCLx12qvgBbicZqecV_hpMq9XeflKi9_qQ4R3bmp5V84qw66z7nB_hOlB4-kF4lI3z7bgKjaWQB6LN9H4eZP4sERYRV_hGKkWT0ADzEtr6TJtvbToiuNn5unQdBD-O0abqOS02X4SU7Jt_o" />
<div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#D94B68] text-white text-[11px] font-bold flex items-center gap-1 shadow">
<span className="material-symbols-outlined text-[13px]">local_florist</span>
<span>Sakura Deal -35%</span>
</div>
<div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">{"90 Giờ học\n            "}</div>
</div>
<div className="p-6 flex-1 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 mb-2">
<span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-[#9E2A4B] text-[11px] font-bold">N4</span>
<span className="text-[11px] text-tertiary font-semibold">Tự tin bứt tốc</span>
</div>
<h3 className="text-base font-bold text-on-surface group-hover:text-[#D94B68] transition-colors leading-snug">{"JLPT N4 Cấp Tốc: Nền Tảng Chắc\n              "}</h3>
<p className="text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">{"Xóa bỏ nỗi sợ Hán tự, nắm vững 300 mẫu ngữ pháp thiết yếu và luyện giải đề theo format mới nhất.\n              "}</p>
</div>
<div className="pt-5 mt-4 border-t border-[#dfbfc1]/30">
<div className="flex items-baseline justify-between mb-3">
<div>
<span className="text-lg font-bold text-[#D94B68]">1.890.000đ</span>
<span className="text-xs text-outline line-through ml-2">2.900.000đ</span>
</div>
<div className="flex items-center text-amber-500 text-xs font-bold">
<span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="ml-0.5 text-on-surface">4.9 (1.2k)</span>
</div>
</div>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-surface-container-low hover:bg-[#D94B68] hover:text-white text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
<span>Xem chi tiết</span>
<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</Link>
</div>
</div>
</div>
{/*  Course Card 2  */}
<div className="group rounded-3xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border-2 border-[#D94B68]/30 relative">
<div className="absolute -top-3 right-6 z-10 px-3 py-0.5 rounded-full bg-[#9E2A4B] text-white text-[10px] font-extrabold uppercase tracking-wider shadow">{"Phổ biến nhất\n          "}</div>
<div className="relative h-48 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Tokyo skyline with Mount Fuji in the background framed by soft pink cherry blossom trees" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCx2PK2cFvKnspD-rVPqqVO3Hv70IjQVhyyXVNYTf8h74k0vdYqk66g1tZ5queUOyr7JwqZSoqRmuRx5A-FDSMGJ_oLmSOAZMl6ThjF3p-KbxIjw_9-imcFduZKEUWxRQaTG7DIGfoqC7IIL12gWsyq68X3b_2Avk8chRj0Xtmogg14oVhOTJAgfuOFBlB6j9EfIL3lzrk8wyHWT94HPLn9SiyY87L-o5xPSG039npTScXu_D_U_s2B" />
<div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#9E2A4B] text-white text-[11px] font-bold flex items-center gap-1 shadow">
<span className="material-symbols-outlined text-[13px]">local_fire_department</span>
<span>Best Seller 2025</span>
</div>
<div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">{"120 Giờ học\n            "}</div>
</div>
<div className="p-6 flex-1 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 mb-2">
<span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-[#9E2A4B] text-[11px] font-bold">N3</span>
<span className="text-[11px] text-[#D94B68] font-semibold">Đột phá điểm số</span>
</div>
<h3 className="text-base font-bold text-on-surface group-hover:text-[#D94B68] transition-colors leading-snug">{"JLPT N3 Đột Phá: Bước Ngoặt\n              "}</h3>
<p className="text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">{"Làm chủ kỹ năng đọc hiểu dài và nghe bắt từ khóa cùng AI chấm bài viết và luyện ngữ điệu hàng tuần.\n              "}</p>
</div>
<div className="pt-5 mt-4 border-t border-[#dfbfc1]/30">
<div className="flex items-baseline justify-between mb-3">
<div>
<span className="text-lg font-bold text-[#D94B68]">2.450.000đ</span>
<span className="text-xs text-outline line-through ml-2">3.800.000đ</span>
</div>
<div className="flex items-center text-amber-500 text-xs font-bold">
<span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="ml-0.5 text-on-surface">5.0 (2.8k)</span>
</div>
</div>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-[#D94B68] hover:bg-[#9E2A4B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all">
<span>Xem chi tiết</span>
<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</Link>
</div>
</div>
</div>
{/*  Course Card 3  */}
<div className="group rounded-3xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border border-[#dfbfc1]/40">
<div className="relative h-48 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Modern Japanese office conference room with glass walls overlooking Tokyo garden" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4IgK5lL53_Kjgf6u7KoBMlnAU2JxVEmapuJqqwVHWo9OePNWuEAAO3Ek2enMgelUjA4hYdBhksveobrqqxGJSbds45Pxy0f6DD-vvo3VJvtID9Zjk5xk_UHwtbQ80chJrUxq_XHzz6jzIG7fqVYMQhLuXfs8CzPGzSmE1D-pMURZVuPo_ad_mTLPovyY-cKMb3VzMzjZ0FTz5h5l_74dsH6SFwBwjB5EopRsswPFkNvGbatc2J_jE" />
<div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-secondary text-white text-[11px] font-bold flex items-center gap-1 shadow">
<span className="material-symbols-outlined text-[13px]">psychology_alt</span>
<span>Ứng Dụng Cao</span>
</div>
<div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">{"60 Giờ học\n            "}</div>
</div>
<div className="p-6 flex-1 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 mb-2">
<span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-[#0d2000] text-[11px] font-bold">Kaiwa</span>
<span className="text-[11px] text-secondary font-semibold">Giao tiếp chuyên nghiệp</span>
</div>
<h3 className="text-base font-bold text-on-surface group-hover:text-[#D94B68] transition-colors leading-snug">{"Kaiwa Giao Tiếp Công Sở & Keigo\n              "}</h3>
<p className="text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">{"Thực hành kính ngữ Keigo chuẩn xác, kỹ năng viết email thương mại và xử lý tình huống thực tế với đối tác Nhật.\n              "}</p>
</div>
<div className="pt-5 mt-4 border-t border-[#dfbfc1]/30">
<div className="flex items-baseline justify-between mb-3">
<div>
<span className="text-lg font-bold text-[#D94B68]">2.190.000đ</span>
<span className="text-xs text-outline line-through ml-2">3.200.000đ</span>
</div>
<div className="flex items-center text-amber-500 text-xs font-bold">
<span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="ml-0.5 text-on-surface">4.8 (890)</span>
</div>
</div>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-surface-container-low hover:bg-[#D94B68] hover:text-white text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
<span>Xem chi tiết</span>
<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</Link>
</div>
</div>
</div>
{/*  Course Card 4  */}
<div className="group rounded-3xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border border-[#dfbfc1]/40">
<div className="relative h-48 w-full overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Close up of Japanese calligraphy ink stone, traditional brush, and JLPT exam test sheet" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8J0W9rYCMRJgOgkPrMBq5nVeVAGBgsut1kY5Y3mG37cBDq-wKNLS9ZdXhaTBZakl0007Y_SbB-SrMAPZkfDctTJkvmXWCo5YUmdwLLQ0AuuytWpqpcp71nh0I5t_o4ersK9yhLQsQ5xq0v0IVoLSwva7tg4PtOaCypvLaTi7A98qOIV06D3ZRJTkbWGYMwyrTVnLaw-PSfiFgqvlC9eqHI4Y2J7goCSCJCBX-8C7vHoYOYCBNpzZI" />
<div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#D94B68] text-white text-[11px] font-bold flex items-center gap-1 shadow">
<span className="material-symbols-outlined text-[13px]">bolt</span>
<span>Luyện Đề 2025</span>
</div>
<div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">{"50 Đề thi\n            "}</div>
</div>
<div className="p-6 flex-1 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 mb-2">
<span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-[#7b4c5e] text-[11px] font-bold">Mock Test</span>
<span className="text-[11px] text-tertiary font-semibold">Chấm AI tức thì</span>
</div>
<h3 className="text-base font-bold text-on-surface group-hover:text-[#D94B68] transition-colors leading-snug">{"Luyện Đề Thi Thử JLPT N3-N1\n              "}</h3>
<p className="text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">{"Bộ đề sát format thực tế 100%, giải thích cặn kẽ bẫy đề thi JLPT mới nhất và gợi ý chiến lược làm bài tối ưu thời gian.\n              "}</p>
</div>
<div className="pt-5 mt-4 border-t border-[#dfbfc1]/30">
<div className="flex items-baseline justify-between mb-3">
<div>
<span className="text-lg font-bold text-[#D94B68]">1.250.000đ</span>
<span className="text-xs text-outline line-through ml-2">1.950.000đ</span>
</div>
<div className="flex items-center text-amber-500 text-xs font-bold">
<span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="ml-0.5 text-on-surface">4.9 (3.4k)</span>
</div>
</div>
<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-surface-container-low hover:bg-[#D94B68] hover:text-white text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
<span>Xem chi tiết</span>
<span className="material-symbols-outlined text-[15px]">chevron_right</span>
</Link>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  GAMIFIED FEATURE & STREAK SHOWCASE (Chuỗi hoa nở rộ & Spaced Repetition)  */}
<section className="w-full bg-white/60 py-20 border-y border-[#dfbfc1]/30" id="gamification">
<div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
{/*  Text Left  */}
<div className="lg:col-span-6 space-y-6">
<div className="inline-flex items-center gap-1.5 text-[#D94B68] text-xs font-bold uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">local_florist</span>
<span>Học không áp lực • Đậm chất Zen</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight leading-tight">{"Nuôi dưỡng cành hoa tri thức với "}<br />
<span className="text-[#D94B68]">"Chuỗi hoa nở rộ"</span>{" mỗi ngày\n          "}</h2>
<p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{"Mỗi bài học hoàn thành là một cánh hoa anh đào khoe sắc. Thuật toán Spaced Repetition (SRS) tính toán chu kỳ quên tự nhiên, gợi nhắc bạn ôn tập đúng thời điểm vàng để biến trí nhớ ngắn hạn thành phản xạ vĩnh viễn.\n          "}</p>
{/*  3 Perks Bullet List  */}
<div className="space-y-3.5 pt-2">
<div className="flex items-start gap-3">
<div className="w-7 h-7 rounded-full bg-[#ffd9dd] text-[#9E2A4B] flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
<div>
<strong className="text-sm text-on-surface font-bold">Thuật toán lặp ngắt quãng Hermann Ebbinghaus</strong>
<p className="text-xs text-on-surface-variant">Tối ưu hóa 80% dung lượng ghi nhớ, chỉ 15 phút ôn tập mỗi ngày.</p>
</div>
</div>
<div className="flex items-start gap-3">
<div className="w-7 h-7 rounded-full bg-[#ffd9dd] text-[#9E2A4B] flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
<div>
<strong className="text-sm text-on-surface font-bold">Huy hiệu hoa Sakura độc quyền</strong>
<p className="text-xs text-on-surface-variant">Tích lũy cánh hoa để đổi tài liệu luyện thi N1-N3 có chữ ký tác giả Nhật.</p>
</div>
</div>
</div>
</div>
{/*  Interactive Streak Preview Widget Right  */}
<div className="lg:col-span-6">
<div className="rounded-3xl bg-background border border-[#dfbfc1]/50 p-6 sm:p-8 shadow-lg">
<div className="flex items-center justify-between pb-6 border-b border-[#dfbfc1]/30">
<div>
<span className="text-xs font-bold text-outline uppercase tracking-wider">Tuần này của bạn</span>
<h4 className="text-xl font-bold text-on-surface">Vườn hoa học tập (7/7 Ngày nở rộ)</h4>
</div>
<div className="px-3.5 py-1.5 rounded-full bg-[#ffd9dd] text-[#9E2A4B] text-xs font-bold flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">military_tech</span>
<span>Cấp độ: Sakura Meijin</span>
</div>
</div>
{/*  7-Day Blossom Visualizer  */}
<div className="grid grid-cols-7 gap-2.5 my-6 text-center">
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white shadow-sm border border-[#dfbfc1]/30">
<span className="text-[10px] font-bold text-outline">T2</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px]">filter_vintage</span>
<span className="text-[10px] font-bold text-tertiary">+30p</span>
</div>
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white shadow-sm border border-[#dfbfc1]/30">
<span className="text-[10px] font-bold text-outline">T3</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px]">filter_vintage</span>
<span className="text-[10px] font-bold text-tertiary">+45p</span>
</div>
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white shadow-sm border border-[#dfbfc1]/30">
<span className="text-[10px] font-bold text-outline">T4</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px]">filter_vintage</span>
<span className="text-[10px] font-bold text-tertiary">+25p</span>
</div>
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white shadow-sm border border-[#dfbfc1]/30">
<span className="text-[10px] font-bold text-outline">T5</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px]">filter_vintage</span>
<span className="text-[10px] font-bold text-tertiary">+40p</span>
</div>
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white shadow-sm border border-[#dfbfc1]/30">
<span className="text-[10px] font-bold text-outline">T6</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px]">filter_vintage</span>
<span className="text-[10px] font-bold text-tertiary">+60p</span>
</div>
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white shadow-sm border border-[#dfbfc1]/30">
<span className="text-[10px] font-bold text-outline">T7</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px]">filter_vintage</span>
<span className="text-[10px] font-bold text-tertiary">+50p</span>
</div>
<div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-gradient-to-b from-[#ffd9e4] to-white shadow-sm border border-[#D94B68]">
<span className="text-[10px] font-bold text-[#D94B68]">CN</span>
<span className="material-symbols-outlined text-[#D94B68] text-[24px] animate-bounce">local_florist</span>
<span className="text-[10px] font-extrabold text-[#9E2A4B]">Hôm nay</span>
</div>
</div>
{/*  Mini Audio Voice Practice Demonstration  */}
<div className="rounded-2xl bg-white p-4 border border-[#dfbfc1]/30 flex items-center justify-between">
<div className="flex items-center gap-3">
<button className="w-10 h-10 rounded-full bg-[#D94B68] text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform" type="button">
<span className="material-symbols-outlined text-[20px]">volume_up</span>
</button>
<div>
<div className="text-sm font-bold text-on-surface font-jp">桜が満開になりました。</div>
<div className="text-xs text-on-surface-variant">Sakura ga mankai ni narimashita (Hoa đã nở rộ)</div>
</div>
</div>
<span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">{"Độ chuẩn: 99%\n              "}</span>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  TESTIMONIALS & COMMUNITY  */}
<section className="w-full py-24">
<div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
{/*  Section Header  */}
<div className="text-center max-w-2xl mx-auto mb-16">
<div className="inline-flex items-center gap-1.5 text-[#D94B68] text-xs font-bold uppercase tracking-wider mb-2">
<span className="material-symbols-outlined text-[16px]">verified_user</span>
<span>Cộng đồng học viên RikiPath</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">{"Hoa thơm quả ngọt từ nỗ lực kiên trì\n        "}</h2>
<p className="text-on-surface-variant text-sm sm:text-base mt-2 leading-relaxed">{"Lắng nghe câu chuyện thành công từ hơn 120,000 học viên đã hiện thực hóa ước mơ du học, làm việc và định cư tại Nhật Bản.\n        "}</p>
</div>
{/*  Testimonials Grid  */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
{/*  Story 1  */}
<div className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-lg transition-all border border-[#dfbfc1]/40 flex flex-col justify-between relative overflow-hidden">
<span className="material-symbols-outlined text-secondary-fixed/20 absolute -right-4 -bottom-4 text-[130px] pointer-events-none select-none">spa</span>
<div className="relative z-10 space-y-4">
<div className="flex items-center justify-between">
<div className="flex items-center text-amber-500 text-sm">
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
</div>
<div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-fixed text-[#9E2A4B] text-xs font-bold">
<span className="material-symbols-outlined text-[14px]">filter_vintage</span>
<span>JLPT N2 • 148/180</span>
</div>
</div>
<p className="text-sm text-on-surface-variant italic leading-relaxed pt-1">{"“Nhờ tính năng AI phân tích phát âm mà phần Dokkai và Choukai của mình tiến bộ vượt bậc. Mình đã đỗ N2 ngay lần thi đầu tiên và chính thức nhận học bổng tại Đại học Waseda!”\n            "}</p>
</div>
<div className="relative z-10 pt-6 mt-6 border-t border-[#dfbfc1]/30 flex items-center gap-3.5">
<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D94B68]/30">
<img className="w-full h-full object-cover" data-alt="Portrait of a young Vietnamese female student" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH-Sgj-Jkl03cNzO6VubInbJngqhVjBI3ms32MrLaFrJq5Z40jXHok4-59fh8U1UFgNRlx0IYerD2OaxN04ZMj78reHFCKPmtIk_Mm-qgRnHPW1SrTMTB6yND_N-iJRBz90HTYhzS2dr180p2g0-5QIu9Y6N-r4--6DP6-V7rl6Ey3fgIY1ciimarSj3jSgPUB2Lbvk_McxeObP6VVeLRlrHfWbHy-m2iCFiLbv7JM6d5lxTjmGoEz" />
</div>
<div>
<h5 className="text-sm font-bold text-on-surface">Nguyễn Thảo Linh</h5>
<p className="text-xs text-on-surface-variant">Du học sinh • Tokyo, Nhật Bản</p>
</div>
</div>
</div>
{/*  Story 2  */}
<div className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-lg transition-all border border-[#dfbfc1]/40 flex flex-col justify-between relative overflow-hidden">
<span className="material-symbols-outlined text-secondary-fixed/20 absolute -right-4 -bottom-4 text-[130px] pointer-events-none select-none">spa</span>
<div className="relative z-10 space-y-4">
<div className="flex items-center justify-between">
<div className="flex items-center text-amber-500 text-sm">
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
</div>
<div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-[#9E2A4B] text-xs font-bold">
<span className="material-symbols-outlined text-[14px]">filter_vintage</span>
<span>JLPT N1 • Kỹ sư IT</span>
</div>
</div>
<p className="text-sm text-on-surface-variant italic leading-relaxed pt-1">{"“Khóa học Shadowing và Kaiwa công sở giúp mình hoàn toàn tự tin phỏng vấn trực tiếp với khách hàng Nhật Bản. Lương kỹ sư tại Osaka tăng gấp đôi chỉ sau 8 tháng đồng hành cùng RikiPath.”\n            "}</p>
</div>
<div className="relative z-10 pt-6 mt-6 border-t border-[#dfbfc1]/30 flex items-center gap-3.5">
<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D94B68]/30">
<img className="w-full h-full object-cover" data-alt="Portrait of a Vietnamese male software engineer in Osaka" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3HIgcCDUXdf_FQlyZIwWWddRp-twz0IRRf0KQHwbDIptrGQH7W53altUTGph-tRCNexrDZFSXrAEALK9RdP7wGKR4XYjkbGtDJYdkAh0Ig46sx9uoo-eQ62_atw0PuZkSWbk5tTwJXNiLiDpw1p7_i8itVxBTrqNTD4PhxiTGZB57GbDZTOboqi-jRaM9cYG7HPu8B3wLSew0OdMHzpZRLAbpur6elx8uWm9xp8B8D_mvkH5xgxMU" />
</div>
<div>
<h5 className="text-sm font-bold text-on-surface">Trần Đức Mạnh</h5>
<p className="text-xs text-on-surface-variant">Senior Bridge SE • Osaka, Nhật Bản</p>
</div>
</div>
</div>
{/*  Story 3  */}
<div className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-lg transition-all border border-[#dfbfc1]/40 flex flex-col justify-between relative overflow-hidden">
<span className="material-symbols-outlined text-secondary-fixed/20 absolute -right-4 -bottom-4 text-[130px] pointer-events-none select-none">spa</span>
<div className="relative z-10 space-y-4">
<div className="flex items-center justify-between">
<div className="flex items-center text-amber-500 text-sm">
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
</div>
<div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-fixed text-[#9E2A4B] text-xs font-bold">
<span className="material-symbols-outlined text-[14px]">filter_vintage</span>
<span>Mất gốc lên N3 • 6 tháng</span>
</div>
</div>
<p className="text-sm text-on-surface-variant italic leading-relaxed pt-1">{"“Sensei hỗ trợ nhiệt tình vô cùng, bài tập viết được sửa từng lỗi ngữ pháp nhỏ. Giao diện hoa anh đào nhẹ nhàng giúp mình không bao giờ bị áp lực mỗi tối mở máy lên học.”\n            "}</p>
</div>
<div className="relative z-10 pt-6 mt-6 border-t border-[#dfbfc1]/30 flex items-center gap-3.5">
<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D94B68]/30">
<img className="w-full h-full object-cover" data-alt="Portrait of a young Vietnamese woman holding a Japanese textbook" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXJVWguenJmM-weWObjzP5DMsX-DvCly97sVcR9oPznHaMsUaU7RMPgZBemnJFYANxzHpR3Y1Hl795-gZdnKBxCsX9N15mu7xMHrRtMUb3MUHlevLXuH_2S7HjsmuXm2M-3kzB68pYW4LI1ke7wBhmRJq6XQ61uWKfN4U_u6atND0uqfWYTaS4P_ljXJOospt_RGPWGfHPkYbpOco8dEmOzfDFldNQBokvpdwJMRSW5KmhGntcwJz6" />
</div>
<div>
<h5 className="text-sm font-bold text-on-surface">Lê Phương Anh</h5>
<p className="text-xs text-on-surface-variant">Học viên chuyển ngành • Hà Nội</p>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  HIGH CONVERTING CTA BANNER (ĐÓN MÙA SAKURA 2025)  */}
<section className="w-full pb-24" id="trial">
<div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
<div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#D94B68] via-[#ab2848] to-[#9E2A4B] p-8 sm:p-12 lg:p-16 text-white shadow-2xl shadow-[#D94B68]/25">
{/*  Subtle Pattern Backdrop  */}
<div className="absolute inset-0 opacity-10 pointer-events-none">
<svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
<defs>
<pattern height="60" id="sakura-pattern-banner" patternUnits="userSpaceOnUse" width="60">
<circle cx="30" cy="30" fill="currentColor" r="4"></circle>
<path d="M30 18 C28 24, 32 24, 30 30 C28 24, 32 24, 30 18 Z" fill="currentColor"></path>
<path d="M42 30 C36 28, 36 32, 30 30 C36 28, 36 32, 42 30 Z" fill="currentColor"></path>
<path d="M30 42 C32 36, 28 36, 30 30 C32 36, 28 36, 30 42 Z" fill="currentColor"></path>
<path d="M18 30 C24 32, 24 28, 30 30 C24 32, 24 28, 18 30 Z" fill="currentColor"></path>
</pattern>
</defs>
<rect fill="url(#sakura-pattern-banner)" height="100%" width="100%"></rect>
</svg>
</div>
<div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
{/*  Banner Copy  */}
<div className="lg:col-span-8 space-y-6">
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white tracking-wide uppercase">
<span className="material-symbols-outlined text-[18px]">celebration</span>
<span>Đón Mùa Sakura 2025 • Nhận Lì Xì Khóa Học Đến 45%</span>
</div>
<h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">{"Sẵn sàng tỏa sáng cùng tiếng Nhật mùa xuân này?\n            "}</h2>
<p className="text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed">{"Nhập mục tiêu và trình độ hiện tại của bạn, AI RikiPath sẽ lập tức xây dựng bảng kế hoạch chi tiết từng ngày cùng bài kiểm tra đánh giá năng lực hoàn toàn miễn phí.\n            "}</p>
{/*  Lead Capture Input Form  */}
<div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
<input className="flex-1 px-5 py-4 rounded-full bg-white text-on-surface text-sm outline-none shadow-inner placeholder:text-outline focus:ring-2 focus:ring-white" placeholder="Nhập số điện thoại hoặc email nhận lộ trình..." type="text" />
<button className="px-7 py-4 rounded-full bg-[#ffd9e4] hover:bg-white text-[#9E2A4B] text-sm font-bold shadow-md hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shrink-0" type="button">
<span>Nhận lộ trình cá nhân</span>
<span className="material-symbols-outlined text-[18px]">send</span>
</button>
</div>
{/*  Trust Pills  */}
<div className="flex flex-wrap items-center gap-6 pt-2 text-white/90 text-xs font-semibold">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">check_circle</span>
<span>Kiểm tra năng lực 0đ</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">check_circle</span>
<span>Tư vấn 1-1 với Sensei</span>
</div>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">check_circle</span>
<span>Không phát sinh chi phí</span>
</div>
</div>
</div>
{/*  3 Steps Pathway Widget  */}
<div className="lg:col-span-4 flex justify-center">
<div className="backdrop-blur-xl bg-white/15 border border-white/20 rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-xl space-y-5">
<h4 className="text-base font-bold text-center text-white">Tiến trình 3 bước bứt phá</h4>
<div className="space-y-3">
<div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/10 border border-white/10">
<div className="w-8 h-8 rounded-full bg-white text-[#9E2A4B] flex items-center justify-center font-bold text-xs shrink-0">1</div>
<div className="text-xs font-bold text-white">Test trình độ AI (15 phút)</div>
</div>
<div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/10 border border-white/10">
<div className="w-8 h-8 rounded-full bg-white text-[#9E2A4B] flex items-center justify-center font-bold text-xs shrink-0">2</div>
<div className="text-xs font-bold text-white">{"Xếp lớp & Sensei đồng hành"}</div>
</div>
<div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/10 border border-white/10">
<div className="w-8 h-8 rounded-full bg-white text-[#9E2A4B] flex items-center justify-center font-bold text-xs shrink-0">3</div>
<div className="text-xs font-bold text-white">Tự tin vượt kỳ thi JLPT</div>
</div>
</div>
<div className="text-center pt-1 text-[11px] font-semibold text-white/80">{"🌸 Ưu đãi kết thúc khi hết 100 suất đầu tiên\n              "}</div>
</div>
</div>
</div>
</div>
</div>
</section>
</main>


{/*  REFINED SAKURA FOOTER  */}





    </div>
  
</MarketingShell>
);
}
