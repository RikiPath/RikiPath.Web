import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function AICounselor() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Cố vấn AI">
<div className="h-full font-sans text-slate-charcoal antialiased bg-[#FAF7F5] selection:bg-brand-soft selection:text-slate-charcoal" data-page="AICounselor" data-shell-unified="1">


<div className="min-h-full flex">
{/*  1. PERSISTENT LEFT SIDEBAR (w-64 fixed)  */}

{/*  2. MAIN WORKSPACE WITH TOP HEADER (ml-64)  */}
<div className="pl-0 flex-1 flex flex-col min-w-0">
{/*  Top Header  */}

{/*  Main Content Container (Max width 1440px desktop frame friendly)  */}
<main className="flex-1 px-8 py-8 max-w-[1440px] w-full mx-auto space-y-8">
{/*  HERO BANNER: Sensei Haru AI Advisor  */}
<section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFF5F7] via-[#FFFFFF] to-[#FFF0F4] border border-brand-soft/70 p-7 shadow-card">
{/*  Sakura subtle decorative background blooms  */}
<div className="absolute -right-16 -top-20 w-80 h-80 rounded-full bg-brand-soft/25 blur-3xl pointer-events-none"></div>
<div className="absolute right-1/3 -bottom-24 w-60 h-60 rounded-full bg-brand-subtle/60 blur-2xl pointer-events-none"></div>
<div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none font-jp font-bold text-[160px] leading-none text-brand">{"春\n        "}</div>
<div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 max-w-4xl">
{/*  Haru AI Sensei Avatar  */}
<div className="relative shrink-0">
<div className="w-20 h-20 md:w-22 md:h-22 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shadow-elevated ring-4 ring-white">
<span className="material-symbols-outlined fill-1 text-[42px]">psychology</span>
</div>
<div className="absolute -bottom-2 -right-2 bg-white px-2.5 py-0.5 rounded-full shadow-sm border border-cream-border flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-accent-green"></span>
<span className="text-[11px] font-bold text-accent-green font-sans">Sẵn sàng</span>
</div>
</div>
{/*  Sensei Greeting & Strategic Overview  */}
<div className="space-y-2">
<div className="flex flex-wrap items-center gap-2">
<h1 className="text-xl font-bold text-slate-charcoal">{"Cố vấn AI Haru "}<span className="text-brand font-jp font-normal text-base">(春先生)</span></h1>
<span className="px-2 py-0.5 rounded-full bg-brand text-white font-bold text-[11px] shadow-xs">v2.4 Pro</span>
<span className="text-slate-muted text-xs">• Chuyên gia Phân tích Năng lực JLPT N3</span>
</div>
<p className="text-[14px] text-slate-sub leading-relaxed">{"“Chào Lan-san! Dựa trên kết quả Đề thi thử #04, tổng điểm của bạn đạt "}<strong className="text-brand font-bold">138/180</strong>{" (vượt chuẩn đỗ 95 điểm). Điểm Kanji & Đọc hiểu rất xuất sắc, tuy nhiên phần Ngữ pháp mới chạm "}<strong className="text-brand font-bold">78%</strong>{" với 3 câu bẫy Kính ngữ (敬語) và cặp trợ từ "}<code className="px-1.5 py-0.5 bg-brand-subtle text-brand rounded font-semibold text-xs">に / で</code>{". Hãy cùng Haru khắc phục nhanh trong 15 phút hôm nay nhé!”\n              "}</p>
<div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-sub font-medium">
<span className="flex items-center gap-1.5 text-accent-green font-semibold">
<span className="material-symbols-outlined text-[16px] text-accent-green">verified</span>{"Vượt ngưỡng an toàn JEES (+43 điểm)\n                "}</span>
<span className="text-slate-muted">|</span>
<span className="flex items-center gap-1 text-slate-charcoal">
<span className="material-symbols-outlined text-[16px] text-brand">flag</span>{"Mục tiêu hôm nay: "}<strong className="text-brand ml-0.5">1/3 bài tập</strong>
</span>
<span className="text-slate-muted">|</span>
<span className="flex items-center gap-1 text-slate-charcoal">
<span className="material-symbols-outlined text-[16px] text-slate-sub">timer</span>{"Thời lượng tối ưu: 15 phút\n                "}</span>
</div>
</div>
</div>
{/*  Quick Action CTAs  */}
<div className="flex flex-row lg:flex-col gap-2.5 w-full sm:w-auto shrink-0 justify-end">
<button className="px-5 py-3 rounded-xl bg-brand text-white font-bold text-[13px] hover:bg-brand-hover shadow-elevated transition-all flex items-center justify-center gap-2 group whitespace-nowrap">
<span className="material-symbols-outlined text-[18px] group-hover:rotate-45 transition-transform">bolt</span>
<span>Bắt đầu khắc phục 15 phút</span>
</button>
<button className="px-4 py-2.5 rounded-xl bg-white border border-cream-border text-slate-sub hover:text-slate-charcoal hover:bg-cream-bg font-semibold text-[12px] text-center transition-colors">{"Xem báo cáo phân tích chi tiết →\n            "}</button>
</div>
</div>
</section>
{/*  12-COLUMN SECTION: DIAGNOSTIC DASHBOARD (7 Cols Radar + 5 Cols Detailed Breakdown)  */}
<section className="space-y-4">
<div className="flex items-center justify-between">
<div>
<div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">query_stats</span>
<span>Sakura Diagnostic Engine • Báo cáo N3</span>
</div>
<h2 className="text-xl font-extrabold text-slate-charcoal tracking-tight mt-0.5">{"Biểu đồ Radar Năng lực & Đánh giá Chi tiết"}</h2>
</div>
<div className="flex items-center gap-2 text-xs font-semibold text-slate-sub bg-white border border-cream-border px-3 py-1.5 rounded-full shadow-2xs">
<span className="w-2 h-2 rounded-full bg-accent-green"></span>
<span>Đã cập nhật: Đề thi thử số #04 (2 giờ trước)</span>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
{/*  LEFT: Radar / Spider Chart Card (7 cols)  */}
<div className="lg:col-span-7 bg-white rounded-2xl border border-cream-border p-6 shadow-card flex flex-col justify-between h-full space-y-6">
<div className="flex items-center justify-between border-b border-cream-border/60 pb-4">
<div>
<span className="text-xs font-semibold uppercase tracking-wider text-slate-sub">Tổng điểm dự đoán</span>
<div className="flex items-baseline gap-2 mt-0.5">
<span className="text-4xl font-extrabold text-brand tracking-tight">138</span>
<span className="text-sm font-semibold text-slate-sub">/ 180 điểm</span>
<span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-accent-greenSoft text-accent-green inline-flex items-center gap-0.5">
<span className="material-symbols-outlined text-[14px]">arrow_upward</span>{" +14 so với đề #03\n                  "}</span>
</div>
</div>
<div className="text-right">
<span className="inline-block px-3 py-1 rounded-full bg-cream-soft border border-cream-border text-xs font-bold text-slate-charcoal">{"Chuẩn đỗ JEES: 95 / 180\n                "}</span>
<p className="text-[11px] text-accent-green font-semibold mt-1">{"Vùng đỗ an toàn cao (>75%)"}</p>
</div>
</div>
{/*  Radar SVG Illustration  */}
<div className="relative w-full max-w-[380px] aspect-square mx-auto flex items-center justify-center my-2">
<svg className="w-full h-full overflow-visible" viewBox="0 0 340 340">
{/*  Outer Guides (100%, 75%, 50%, 25%)  */}
<polygon fill="none" points="170,30 295,115 250,265 90,265 45,115" stroke="#EADFD9" strokeWidth="1.5"></polygon>
<polygon fill="none" points="170,65 264,130 230,242 110,242 76,130" stroke="#EADFD9" strokeDasharray="2 2" strokeWidth="1.2"></polygon>
<polygon fill="none" points="170,100 232,142 210,220 130,220 108,142" stroke="#EADFD9" strokeWidth="1"></polygon>
<polygon fill="none" points="170,135 201,156 190,195 150,195 139,156" stroke="#EADFD9" strokeDasharray="2 2" strokeWidth="1"></polygon>
{/*  Axis Lines  */}
<line stroke="#EADFD9" strokeWidth="1.5" x1="170" x2="170" y1="170" y2="30"></line>
<line stroke="#EADFD9" strokeWidth="1.5" x1="170" x2="295" y1="170" y2="115"></line>
<line stroke="#EADFD9" strokeWidth="1.5" x1="170" x2="250" y1="170" y2="265"></line>
<line stroke="#EADFD9" strokeWidth="1.5" x1="170" x2="90" y1="170" y2="265"></line>
<line stroke="#EADFD9" strokeWidth="1.5" x1="170" x2="45" y1="170" y2="115"></line>
{/*  60% Passing Baseline Reference Shape (Dotted Charcoal)  */}
<polygon fill="none" points="170,86 245,137 218,227 122,227 95,137" stroke="#6F6669" strokeDasharray="3 3" strokeWidth="1.2"></polygon>
{/*  Learner Polygon Area (Kanji: 92%, Goi: 86%, Bunpou: 78%, Dokkai: 84%, Choukai: 88%)  */}
{/*  Center is (170, 170). Rad = 140  */}
<polygon fill="rgba(224, 90, 122, 0.18)" points="170,41 278,122 232,244 103,250 59,121" stroke="#E05A7A" strokeWidth="2.5"></polygon>
{/*  Radar Vertex Nodes  */}
<circle cx="170" cy="41" fill="#E05A7A" r="5" stroke="#FFFFFF" strokeWidth="2"></circle>
<circle cx="278" cy="122" fill="#E05A7A" r="5" stroke="#FFFFFF" strokeWidth="2"></circle>
<circle cx="232" cy="244" fill="#C84464" r="5.5" stroke="#FFFFFF" strokeWidth="2.5"></circle>
<circle cx="103" cy="250" fill="#E05A7A" r="5" stroke="#FFFFFF" strokeWidth="2"></circle>
<circle cx="59" cy="121" fill="#E05A7A" r="5" stroke="#FFFFFF" strokeWidth="2"></circle>
</svg>
{/*  Absolute Floating Badges for the 5 Vertices  */}
<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2.5 py-1 rounded-full shadow-md border border-brand/30 text-center">
<span className="text-[11px] font-bold text-brand">Hán tự (Kanji) • 92%</span>
</div>
<div className="absolute top-1/4 -right-4 bg-white px-2.5 py-1 rounded-full shadow-sm border border-cream-border text-center">
<span className="text-[11px] font-bold text-slate-charcoal">Từ vựng (Goi) • 86%</span>
</div>
<div className="absolute -bottom-3 right-10 bg-white px-2.5 py-1 rounded-full shadow-md border border-brand text-center ring-2 ring-brand-subtle">
<span className="text-[11px] font-bold text-brand">Ngữ pháp (Bunpou) • 78% ⚠</span>
</div>
<div className="absolute -bottom-3 left-10 bg-white px-2.5 py-1 rounded-full shadow-sm border border-cream-border text-center">
<span className="text-[11px] font-bold text-slate-charcoal">Đọc hiểu (Dokkai) • 84%</span>
</div>
<div className="absolute top-1/4 -left-4 bg-white px-2.5 py-1 rounded-full shadow-sm border border-cream-border text-center">
<span className="text-[11px] font-bold text-slate-charcoal">Nghe hiểu (Choukai) • 88%</span>
</div>
</div>
{/*  Radar Footer Legend  */}
<div className="pt-4 border-t border-cream-border/60 flex items-center justify-between text-xs text-slate-sub">
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-full bg-brand"></span>
<span>Vùng năng lực hiện tại của Lan-san</span>
</div>
<div className="flex items-center gap-2">
<span className="w-3 h-0.5 bg-slate-sub border-b border-dashed border-slate-sub"></span>
<span>Chuẩn tối thiểu an toàn JEES (60%)</span>
</div>
</div>
</div>
{/*  RIGHT: Breakdown 5 Skills Cards (5 cols)  */}
<div className="lg:col-span-5 space-y-3.5">
{/*  Skill 1: Kanji  */}
<div className="p-4 rounded-xl bg-white border border-cream-border shadow-card hover:border-brand-soft transition-colors">
<div className="flex items-center justify-between mb-1.5">
<div className="flex items-center gap-2.5">
<span className="w-7 h-7 rounded-lg bg-accent-greenSoft text-accent-green font-bold text-xs flex items-center justify-center font-jp">漢</span>
<span className="font-bold text-[14px] text-slate-charcoal">Hán tự (Kanji)</span>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-greenSoft text-accent-green">Thế mạnh</span>
</div>
<span className="font-extrabold text-sm text-accent-green">92%</span>
</div>
<div className="w-full bg-cream-bg rounded-full h-2 overflow-hidden mb-1.5 border border-cream-border/60">
<div className="bg-accent-green h-full rounded-full" style={{ width: "92%" }}></div>
</div>
<p className="text-[12px] text-slate-sub leading-snug">Chính xác 615/650 chữ N3. Phản xạ âm On/Kun và các âm ngắt hiếm rất tốt.</p>
</div>
{/*  Skill 2: Goi  */}
<div className="p-4 rounded-xl bg-white border border-cream-border shadow-card hover:border-brand-soft transition-colors">
<div className="flex items-center justify-between mb-1.5">
<div className="flex items-center gap-2.5">
<span className="w-7 h-7 rounded-lg bg-cream-soft text-slate-charcoal font-bold text-xs flex items-center justify-center font-jp">語</span>
<span className="font-bold text-[14px] text-slate-charcoal">Từ vựng (Goi)</span>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cream-soft text-slate-sub">Ổn định</span>
</div>
<span className="font-extrabold text-sm text-slate-charcoal">86%</span>
</div>
<div className="w-full bg-cream-bg rounded-full h-2 overflow-hidden mb-1.5 border border-cream-border/60">
<div className="bg-brand h-full rounded-full" style={{ width: "86%" }}></div>
</div>
<p className="text-[12px] text-slate-sub leading-snug">Từ vựng sinh hoạt đạt 90%. Cần củng cố thêm 35 phó từ chỉ mức độ (なかなか, むしろ).</p>
</div>
{/*  Skill 3: Bunpou (Highlighted focus)  */}
<div className="p-4 rounded-xl bg-white border-2 border-brand shadow-card relative overflow-hidden bg-gradient-to-r from-brand-subtle/20 to-white">
<div className="absolute right-0 top-0 w-2 h-full bg-brand"></div>
<div className="flex items-center justify-between mb-1.5">
<div className="flex items-center gap-2.5">
<span className="w-7 h-7 rounded-lg bg-brand text-white font-bold text-xs flex items-center justify-center font-jp">文</span>
<span className="font-bold text-[14px] text-brand">Ngữ pháp (Bunpou)</span>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand text-white">Cần tập trung</span>
</div>
<span className="font-extrabold text-sm text-brand">78%</span>
</div>
<div className="w-full bg-cream-bg rounded-full h-2 overflow-hidden mb-1.5 border border-cream-border/60">
<div className="bg-brand h-full rounded-full" style={{ width: "78%" }}></div>
</div>
<p className="text-[12px] text-slate-charcoal font-medium leading-snug">Sai 3 câu về kính ngữ công sở (Keigo) và nhầm lẫn cách chọn trợ từ trong câu xin phép.</p>
</div>
{/*  Skill 4: Dokkai & Choukai Split Row  */}
<div className="grid grid-cols-2 gap-3.5">
<div className="p-3.5 rounded-xl bg-white border border-cream-border shadow-card">
<div className="flex items-center justify-between mb-1">
<span className="font-bold text-xs text-slate-charcoal">Đọc hiểu (読解)</span>
<span className="font-bold text-xs text-slate-charcoal">84%</span>
</div>
<div className="w-full bg-cream-bg rounded-full h-1.5 overflow-hidden mb-1.5 border border-cream-border/60">
<div className="bg-brand h-full rounded-full" style={{ width: "84%" }}></div>
</div>
<p className="text-[11px] text-slate-sub">Tốc độ 280 ký tự/phút. Xong trước 6 phút.</p>
</div>
<div className="p-3.5 rounded-xl bg-white border border-cream-border shadow-card">
<div className="flex items-center justify-between mb-1">
<span className="font-bold text-xs text-slate-charcoal">Nghe hiểu (聴解)</span>
<span className="font-bold text-xs text-accent-green">88%</span>
</div>
<div className="w-full bg-cream-bg rounded-full h-1.5 overflow-hidden mb-1.5 border border-cream-border/60">
<div className="bg-accent-green h-full rounded-full" style={{ width: "88%" }}></div>
</div>
<p className="text-[11px] text-slate-sub">Bắt từ khóa tốt ở phần phản xạ nhanh (即時応答).</p>
</div>
</div>
</div>
</div>
</section>
{/*  PHÁC ĐỒ CẢI THIỆN TRỌNG ĐIỂM (PRESCRIPTIVE 15-MINUTE ACTION PLAN)  */}
<section className="space-y-4">
<div className="flex items-center justify-between">
<div>
<div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">healing</span>
<span>Lộ trình khắc phục lỗ hổng</span>
</div>
<h2 className="text-xl font-extrabold text-slate-charcoal tracking-tight mt-0.5">Phác đồ Đột phá 15 phút từ Cố vấn Haru</h2>
</div>
<span className="text-xs text-slate-sub">Được thiết kế riêng theo sai sót của Đề #04</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/*  Recommendation Card 1  */}
<div className="rounded-2xl bg-white border border-cream-border p-6 shadow-card flex flex-col justify-between space-y-5 relative overflow-hidden">
<div className="absolute top-0 right-0 w-24 h-24 bg-brand-subtle/30 rounded-bl-full pointer-events-none"></div>
<div className="space-y-3">
<div className="flex items-center justify-between">
<span className="px-2.5 py-1 rounded-full bg-brand-subtle text-brand font-bold text-xs">{"Trọng điểm 1 • Ngữ pháp cốt lõi\n                "}</span>
<span className="text-xs font-bold text-brand flex items-center gap-1">
<span className="material-symbols-outlined text-[15px]">error</span>{"Sai sót #1 đề 04\n                "}</span>
</div>
<h3 className="text-base font-bold text-slate-charcoal flex items-center gap-2">
<span>Phân biệt</span>
<code className="text-brand font-jp text-sm bg-cream-bg px-2 py-0.5 rounded border border-cream-border">~わけにはいかない</code>
<span className="text-slate-muted">vs</span>
<code className="text-slate-charcoal font-jp text-sm bg-cream-bg px-2 py-0.5 rounded border border-cream-border">できない</code>
</h3>
<p className="text-xs text-slate-sub leading-relaxed">
<strong className="text-slate-charcoal">~わけにはいかない:</strong>{" Biểu đạt việc \"không thể làm\" xuất phát từ rào cản lương tâm, đạo đức, trách nhiệm công việc hoặc lý do xã hội. Khác hoàn toàn với "}<strong className="text-slate-charcoal">できない</strong>{" chỉ đơn thuần là thiếu năng lực thể chất hoặc kỹ năng.\n              "}</p>
<div className="p-3.5 rounded-xl bg-cream-bg border border-cream-border space-y-1">
<div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
<span>Mẫu câu thực tế</span>
<span className="font-jp text-slate-sub">例文</span>
</div>
<p className="text-xs text-slate-charcoal font-jp font-medium leading-relaxed">{"明日は大事な会議があるから、休む"}<strong className="text-brand underline decoration-brand-soft underline-offset-2">わけにはいかない</strong>{"。\n                "}</p>
<p className="text-[11px] text-slate-sub italic">(Ngày mai có cuộc họp quan trọng, tôi không thể tùy tiện nghỉ được).</p>
</div>
</div>
<div className="pt-3 border-t border-cream-border/70 flex items-center justify-between">
<div className="flex items-center gap-2 text-xs text-slate-sub">
<span className="material-symbols-outlined text-[16px] text-slate-muted">timer</span>
<span>3 câu phản xạ nhanh (7 phút)</span>
</div>
<button className="px-3.5 py-2 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-sm">
<span>Luyện ngay</span>
<span className="material-symbols-outlined text-[16px]">play_arrow</span>
</button>
</div>
</div>
{/*  Recommendation Card 2  */}
<div className="rounded-2xl bg-white border border-cream-border p-6 shadow-card flex flex-col justify-between space-y-5 relative overflow-hidden">
<div className="absolute top-0 right-0 w-24 h-24 bg-brand-subtle/30 rounded-bl-full pointer-events-none"></div>
<div className="space-y-3">
<div className="flex items-center justify-between">
<span className="px-2.5 py-1 rounded-full bg-brand-subtle text-brand font-bold text-xs">{"Trọng điểm 2 • Trợ từ & Kính ngữ\n                "}</span>
<span className="text-xs font-bold text-brand flex items-center gap-1">
<span className="material-symbols-outlined text-[15px]">error</span>{"Sai sót #2 đề 04\n                "}</span>
</div>
<h3 className="text-base font-bold text-slate-charcoal flex items-center gap-2">
<span>Trợ từ trong câu xin phép nhận ơn huệ:</span>
<code className="text-brand font-jp text-sm bg-cream-bg px-2 py-0.5 rounded border border-cream-border">に</code>
<span className="text-slate-muted">vs</span>
<code className="text-slate-charcoal font-jp text-sm bg-cream-bg px-2 py-0.5 rounded border border-cream-border">で</code>
</h3>
<p className="text-xs text-slate-sub leading-relaxed">{"Khi sử dụng động từ nhận ân huệ hoặc xin phép cấp trên ("}<span className="font-jp text-slate-charcoal font-medium">〜てもらう / 〜ていただく</span>{"), đối tượng nhận yêu cầu hoặc người làm ơn bắt buộc đi với trợ từ "}<strong className="text-brand">に</strong>{", còn "}<strong className="text-slate-charcoal">で</strong>{" chỉ biểu thị phương tiện, ngôn ngữ hoặc địa điểm.\n              "}</p>
<div className="p-3.5 rounded-xl bg-cream-bg border border-cream-border space-y-1">
<div className="flex items-center justify-between text-[11px] font-bold text-brand uppercase">
<span>Quy tắc vàng công sở</span>
<span className="font-jp text-slate-sub">ビジネス敬語</span>
</div>
<p className="text-xs text-slate-charcoal font-jp font-medium leading-relaxed">{"部長"}<strong className="text-brand underline decoration-brand-soft underline-offset-2">に</strong>企画書の確認をして<strong className="text-brand">いただきました</strong>{"。\n                "}</p>
<p className="text-[11px] text-slate-sub italic">(Tôi đã nhận được sự phê duyệt kế hoạch từ Trưởng phòng).</p>
</div>
</div>
<div className="pt-3 border-t border-cream-border/70 flex items-center justify-between">
<div className="flex items-center gap-2 text-xs text-slate-sub">
<span className="material-symbols-outlined text-[16px] text-slate-muted">quiz</span>
<span>4 bài tập điền trợ từ (8 phút)</span>
</div>
<button className="px-3.5 py-2 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-sm">
<span>Luyện ngay</span>
<span className="material-symbols-outlined text-[16px]">play_arrow</span>
</button>
</div>
</div>
</div>
</section>
{/*  WEEKLY GROWTH & MOCK TEST TRENDS (Table + Sparkline Graph)  */}
<section className="space-y-4">
<div className="flex items-center justify-between">
<div>
<div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
<span className="material-symbols-outlined text-[16px]">trending_up</span>
<span>Theo dõi tiến độ theo tuần</span>
</div>
<h2 className="text-xl font-extrabold text-slate-charcoal tracking-tight mt-0.5">{"Lịch sử Thi thử & Xu hướng Điểm số"}</h2>
</div>
<div className="text-xs text-slate-sub">{"Mục tiêu bứt phá chặng tiếp theo: "}<strong className="text-brand font-extrabold text-sm">150 / 180</strong>{" điểm\n          "}</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
{/*  Table: 8 Columns  */}
<div className="lg:col-span-8 bg-white rounded-2xl border border-cream-border p-6 shadow-card overflow-x-auto flex flex-col justify-between">
<table className="w-full text-left text-xs">
<thead>
<tr className="text-slate-sub font-bold uppercase tracking-wider border-b border-cream-border">
<th className="pb-3 px-3">Đề thi thử</th>
<th className="pb-3 px-3">Thời gian</th>
<th className="pb-3 px-3">Tổng điểm</th>
<th className="pb-3 px-3">Phần yếu nhất</th>
<th className="pb-3 px-3">Trạng thái JEES</th>
<th className="pb-3 px-3 text-right">Chi tiết</th>
</tr>
</thead>
<tbody className="divide-y divide-cream-border/60">
{/*  Test 04  */}
<tr className="hover:bg-cream-bg/60 transition-colors">
<td className="py-3.5 px-3 font-bold text-slate-charcoal flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-brand"></span>
<span>Đề thi thử #04 (Mới nhất)</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">Hôm nay</td>
<td className="py-3.5 px-3">
<span className="font-extrabold text-sm text-brand">138</span>
<span className="text-slate-muted">/180</span>
</td>
<td className="py-3.5 px-3 text-brand font-medium">Ngữ pháp (78%)</td>
<td className="py-3.5 px-3">
<span className="px-2.5 py-0.5 rounded-full bg-accent-greenSoft text-accent-green font-bold text-[11px]">Đỗ vững vàng</span>
</td>
<td className="py-3.5 px-3 text-right">
<button className="font-bold text-brand hover:underline">Xem lại bài</button>
</td>
</tr>
{/*  Test 03  */}
<tr className="hover:bg-cream-bg/60 transition-colors">
<td className="py-3.5 px-3 font-semibold text-slate-charcoal flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-cream-border"></span>
<span>Đề thi thử #03</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">1 tuần trước</td>
<td className="py-3.5 px-3">
<span className="font-extrabold text-sm text-slate-charcoal">124</span>
<span className="text-slate-muted">/180</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">Từ vựng (72%)</td>
<td className="py-3.5 px-3">
<span className="px-2.5 py-0.5 rounded-full bg-brand-subtle text-brand font-bold text-[11px]">Đạt chuẩn đỗ</span>
</td>
<td className="py-3.5 px-3 text-right">
<button className="font-semibold text-slate-sub hover:text-slate-charcoal hover:underline">Chi tiết</button>
</td>
</tr>
{/*  Test 02  */}
<tr className="hover:bg-cream-bg/60 transition-colors">
<td className="py-3.5 px-3 font-semibold text-slate-charcoal flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-cream-border"></span>
<span>Đề thi thử #02</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">3 tuần trước</td>
<td className="py-3.5 px-3">
<span className="font-extrabold text-sm text-slate-charcoal">112</span>
<span className="text-slate-muted">/180</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">Nghe hiểu (68%)</td>
<td className="py-3.5 px-3">
<span className="px-2.5 py-0.5 rounded-full bg-cream-soft text-slate-sub font-semibold text-[11px]">Ngưỡng an toàn</span>
</td>
<td className="py-3.5 px-3 text-right">
<button className="font-semibold text-slate-sub hover:text-slate-charcoal hover:underline">Chi tiết</button>
</td>
</tr>
{/*  Test 01  */}
<tr className="hover:bg-cream-bg/60 transition-colors">
<td className="py-3.5 px-3 font-semibold text-slate-charcoal flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-cream-border"></span>
<span>Đề thi đầu vào #01</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">1 tháng trước</td>
<td className="py-3.5 px-3">
<span className="font-extrabold text-sm text-slate-charcoal">98</span>
<span className="text-slate-muted">/180</span>
</td>
<td className="py-3.5 px-3 text-slate-sub">Ngữ pháp (62%)</td>
<td className="py-3.5 px-3">
<span className="px-2.5 py-0.5 rounded-full bg-cream-soft text-slate-sub font-semibold text-[11px]">Vừa đủ đỗ</span>
</td>
<td className="py-3.5 px-3 text-right">
<button className="font-semibold text-slate-sub hover:text-slate-charcoal hover:underline">Chi tiết</button>
</td>
</tr>
</tbody>
</table>
<div className="pt-4 border-t border-cream-border/60 flex items-center justify-between text-xs text-slate-sub">
<span>Hiển thị 4 đề thi thử đã chấm chuẩn hóa JEES</span>
<a className="text-brand font-bold hover:underline" href="#">Mở toàn bộ ngân hàng đề thi thử →</a>
</div>
</div>
{/*  Sparkline / Progress Graph: 4 Columns  */}
<div className="lg:col-span-4 bg-white rounded-2xl border border-cream-border p-6 shadow-card flex flex-col justify-between space-y-4">
<div>
<div className="flex items-center justify-between">
<span className="text-xs font-bold uppercase tracking-wider text-slate-sub">Tăng trưởng điểm số</span>
<span className="text-xs font-extrabold text-accent-green bg-accent-greenSoft px-2 py-0.5 rounded-full">+23.2% / tháng</span>
</div>
<div className="flex items-baseline gap-2 mt-1">
<span className="text-2xl font-extrabold text-slate-charcoal">+40 điểm</span>
<span className="text-xs text-slate-sub">từ lúc bắt đầu lộ trình</span>
</div>
{/*  SVG Sparkline with Gradient fill  */}
<div className="w-full pt-4">
<svg className="w-full h-28 overflow-visible" viewBox="0 0 280 90">
<defs>
<linearGradient id="scoreGrowth" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="#E05A7A" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#E05A7A" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
{/*  Baseline 95 pass mark  */}
<line stroke="#EADFD9" strokeDasharray="3 3" strokeWidth="1.5" x1="10" x2="270" y1="72" y2="72"></line>
<text fill="#A59B9E" fontSize="9" fontWeight="600" textAnchor="end" x="270" y="68">Điểm đỗ (95)</text>
{/*  Sparkline Curve Area  */}
<path d="M 15,70 L 95,54 L 175,38 L 255,16 L 255,85 L 15,85 Z" fill="url(#scoreGrowth)"></path>
{/*  Sparkline Curve Stroke  */}
<path d="M 15,70 L 95,54 L 175,38 L 255,16" fill="none" stroke="#E05A7A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
{/*  Points  */}
<circle cx="15" cy="70" fill="#FFFFFF" r="4" stroke="#E05A7A" strokeWidth="2.5"></circle>
<circle cx="95" cy="54" fill="#FFFFFF" r="4" stroke="#E05A7A" strokeWidth="2.5"></circle>
<circle cx="175" cy="38" fill="#FFFFFF" r="4" stroke="#E05A7A" strokeWidth="2.5"></circle>
<circle cx="255" cy="16" fill="#E05A7A" r="6" stroke="#FFFFFF" strokeWidth="2.5"></circle>
{/*  Point Labels  */}
<text fill="#6F6669" fontSize="9" textAnchor="middle" x="15" y="85">98đ</text>
<text fill="#6F6669" fontSize="9" textAnchor="middle" x="95" y="85">112đ</text>
<text fill="#6F6669" fontSize="9" textAnchor="middle" x="175" y="85">124đ</text>
<text fill="#E05A7A" fontSize="11" fontWeight="bold" textAnchor="middle" x="255" y="10">138đ</text>
</svg>
</div>
</div>
{/*  Recommendation snippet  */}
<div className="p-3.5 rounded-xl bg-[#FAF7F5] border border-cream-border space-y-1">
<span className="text-[11px] font-bold text-brand uppercase tracking-wider">Đề xuất cho mốc 150/180:</span>
<p className="text-xs text-slate-sub leading-snug">{"Hoàn thành chuyên đề "}<span className="font-semibold text-slate-charcoal">"20 mẫu ngữ pháp tương phản và giả định nâng cao N3"</span>{" để lấy trọn 60/60 điểm phần Kiến thức ngôn ngữ.\n              "}</p>
</div>
</div>
</div>
</section>
{/*  NEO-SAKURA MOTIVATIONAL STRIP (Triết lý Kaizen & Ma 間)  */}
<section className="rounded-2xl bg-gradient-to-r from-brand to-brand-dark text-white p-7 shadow-elevated relative overflow-hidden">
<div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
<span className="font-jp text-[180px] font-bold leading-none select-none text-white">間</span>
</div>
<div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
<div className="space-y-1.5 max-w-2xl">
<div className="flex items-center gap-2 text-brand-soft text-xs font-bold uppercase tracking-widest">
<span className="material-symbols-outlined text-[16px]">spa</span>
<span>{"Triết lý Kaizen & Không gian Ma (間)"}</span>
</div>
<h3 className="text-xl font-bold tracking-tight">{"Luyện tập có chủ đích 15 phút mỗi ngày cùng Cố vấn Haru\n            "}</h3>
<p className="text-xs text-white/90 leading-relaxed">{"Không cần học dồn quá tải. Khoảng lặng tập trung sâu sắc giúp chuyển hóa từng lỗ hổng nhỏ thành phản xạ vô thức tự nhiên, mở đường tới điểm tuyệt đối N3.\n            "}</p>
</div>
{/*  Streak Badge  */}
<div className="flex items-center gap-4 bg-white/15 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/20 shrink-0">
<div className="w-10 h-10 rounded-xl bg-white text-brand flex items-center justify-center font-bold shadow-sm">
<span className="material-symbols-outlined fill-1 text-[24px]">local_fire_department</span>
</div>
<div className="flex flex-col">
<span className="text-2xl font-extrabold leading-none tracking-tight">12 Ngày</span>
<span className="text-[11px] text-white/80 font-medium mt-0.5">Chuỗi học tập liên tục</span>
</div>
</div>
</div>
</section>
</main>
</div>
</div>


    </div>
  
</LearnerShell>
);
}
