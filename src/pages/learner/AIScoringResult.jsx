import { LearnerShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function AIScoringResult() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Chấm AI">
<div className="bg-canvas text-charcoal font-sans min-h-screen flex selection:bg-sakura-200 selection:text-charcoal antialiased min-h-screen" data-page="AIScoringResult" data-shell-unified="1">


{/*  Left Sidebar (Fixed 64 / 256px)  */}





{/*  Main Shell (Offset by Sidebar 256px, max 1440px desktop frame)  */}


<div className="pl-0 flex-1 flex flex-col min-h-screen">
{/*  Top Application Header  */}

{/*  Main Content Grid (1440px Centered Layout)  */}
<main className="flex-1 max-w-[1440px] w-full mx-auto px-8 py-8 flex flex-col gap-8">
{/*  Page Header & Topic Identity  */}
<section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border-soft shadow-subtle">
<div className="space-y-1.5">
<div className="flex flex-wrap items-center gap-2.5">
<h1 className="text-2xl font-extrabold text-charcoal tracking-tight">Chi tiết Kết quả Chấm điểm AI</h1>
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sakura-100 text-brand border border-sakura-200">
                        JLPT N4 Đạt Chuẩn
                    </span>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-canvas text-charcoal-muted border border-border-soft">
<span className="material-symbols-outlined text-[14px]">schedule</span> 14:35, Hôm nay
                    </span>
</div>
<p className="text-sm text-charcoal-muted flex items-center gap-1.5">
<span className="font-semibold text-charcoal">Chủ đề bài viết:</span>
                    Viết thư xin lỗi gửi cấp trên vì vắng mặt cuộc họp do ốm đột xuất (ビジネスメール・欠席連絡)
                </p>
</div>
<div className="flex items-center gap-2 self-start md:self-auto">
<button className="px-4 py-2 bg-canvas hover:bg-[#F2ECE8] text-charcoal text-xs font-semibold rounded-xl border border-border-soft transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">file_download</span>
<span>Xuất báo cáo PDF</span>
</button>
<button className="px-4 py-2 bg-brand-subtle text-brand hover:bg-brand/15 text-xs font-bold rounded-xl border border-brand/20 transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">history_edu</span>
<span>Xem lịch sử làm</span>
</button>
</div>
</section>
{/*  Top KPI Summary Cards (12 columns grid: 4 cols for Score Gauge, 8 cols for Rubric Cards)  */}
<section className="grid grid-cols-1 md:grid-cols-12 gap-5">
{/*  Overall Score Circular Gauge (Col 1-4 / 4 cols)  */}
<div className="md:col-span-4 bg-surface rounded-2xl p-6 border border-border-soft shadow-card flex flex-col items-center justify-between text-center relative overflow-hidden">
<div className="w-full flex items-center justify-between mb-2">
<span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">Tổng điểm đánh giá</span>
<span className="px-2 py-0.5 rounded-md bg-status-successBg text-status-success text-[11px] font-bold border border-emerald-200">Rất tốt</span>
</div>
<div className="relative w-36 h-36 my-2 flex items-center justify-center">
<svg className="w-full h-full circular-progress" viewBox="0 0 100 100">
{/*  Track  */}
<circle cx="50" cy="50" fill="none" r="42" stroke="#FAF2F4" strokeWidth="9"></circle>
{/*  Progress (85/100 -> dashoffset = 264 * (1 - 0.85) ≈ 39.6)  */}
<circle className="circular-progress-circle" cx="50" cy="50" fill="none" r="42" stroke="#E05A7A" stroke-dasharray="264" stroke-dashoffset="39.6" strokeLinecap="round" strokeWidth="9"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="text-4xl font-extrabold text-charcoal tracking-tight">85</span>
<span className="text-xs font-semibold text-charcoal-muted">thang điểm 100</span>
</div>
</div>
<div className="mt-2 w-full pt-3 border-t border-border-soft/70 flex items-center justify-around text-xs">
<div>
<span className="text-charcoal-muted block text-[11px]">Trình độ</span>
<span className="font-bold text-brand">N4 Level</span>
</div>
<div className="h-6 w-[1px] bg-border-soft"></div>
<div>
<span className="text-charcoal-muted block text-[11px]">Tiến độ JLPT N3</span>
<span className="font-bold text-charcoal">Đạt 68% chuẩn</span>
</div>
</div>
</div>
{/*  Rubric Breakdown Cards (Col 5-12 / 8 cols -> 4 Sub-metrics)  */}
<div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
{/*  Grammar Card  */}
<div className="bg-surface rounded-2xl p-5 border border-border-soft shadow-card flex flex-col justify-between hover:border-brand/30 transition-all group">
<div className="flex items-center justify-between mb-3">
<div className="w-9 h-9 rounded-xl bg-status-infoBg text-status-info flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[20px]">spellcheck</span>
</div>
<span className="text-base font-extrabold text-charcoal">22<span className="text-xs font-normal text-charcoal-muted">/25</span></span>
</div>
<div>
<h4 className="text-sm font-bold text-charcoal mb-1">Ngữ pháp (Grammar)</h4>
<p className="text-[11px] text-charcoal-muted mb-3">Cấu trúc câu tự nhiên, thể điều kiện chính xác.</p>
<div className="w-full bg-[#F3ECE8] rounded-full h-2 overflow-hidden">
<div className="bg-status-info h-2 rounded-full transition-all duration-700" style={{ width: "88%" }}></div>
</div>
<span className="block text-right text-[10px] text-charcoal-muted font-bold mt-1">88%</span>
</div>
</div>
{/*  Vocabulary Card  */}
<div className="bg-surface rounded-2xl p-5 border border-border-soft shadow-card flex flex-col justify-between hover:border-brand/30 transition-all group">
<div className="flex items-center justify-between mb-3">
<div className="w-9 h-9 rounded-xl bg-status-warningBg text-status-warning flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[20px]">menu_book</span>
</div>
<span className="text-base font-extrabold text-charcoal">20<span className="text-xs font-normal text-charcoal-muted">/25</span></span>
</div>
<div>
<h4 className="text-sm font-bold text-charcoal mb-1">Từ vựng (Vocab)</h4>
<p className="text-[11px] text-charcoal-muted mb-3">Vốn từ văn phòng tốt, hạn chế lỗi chính tả.</p>
<div className="w-full bg-[#F3ECE8] rounded-full h-2 overflow-hidden">
<div className="bg-status-warning h-2 rounded-full transition-all duration-700" style={{ width: "80%" }}></div>
</div>
<span className="block text-right text-[10px] text-charcoal-muted font-bold mt-1">80%</span>
</div>
</div>
{/*  Coherence & Logic Card  */}
<div className="bg-surface rounded-2xl p-5 border border-border-soft shadow-card flex flex-col justify-between hover:border-brand/30 transition-all group">
<div className="flex items-center justify-between mb-3">
<div className="w-9 h-9 rounded-xl bg-status-successBg text-status-success flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[20px]">account_tree</span>
</div>
<span className="text-base font-extrabold text-charcoal">23<span className="text-xs font-normal text-charcoal-muted">/25</span></span>
</div>
<div>
<h4 className="text-sm font-bold text-charcoal mb-1">Mạch lạc & Logic</h4>
<p className="text-[11px] text-charcoal-muted mb-3">Lý do xin nghỉ rõ ràng, các ý liên kết trôi chảy.</p>
<div className="w-full bg-[#F3ECE8] rounded-full h-2 overflow-hidden">
<div className="bg-status-success h-2 rounded-full transition-all duration-700" style={{ width: "92%" }}></div>
</div>
<span className="block text-right text-[10px] text-charcoal-muted font-bold mt-1">92%</span>
</div>
</div>
{/*  Task & Keigo Card  */}
<div className="bg-surface rounded-2xl p-5 border border-border-soft shadow-card flex flex-col justify-between hover:border-brand/30 transition-all group">
<div className="flex items-center justify-between mb-3">
<div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[20px]">verified_user</span>
</div>
<span className="text-base font-extrabold text-charcoal">20<span className="text-xs font-normal text-charcoal-muted">/25</span></span>
</div>
<div>
<h4 className="text-sm font-bold text-charcoal mb-1">Nhiệm vụ & Kính ngữ</h4>
<p className="text-[11px] text-charcoal-muted mb-3">Đầy đủ chào hỏi, cần trau chuốt khiêm nhường ngữ.</p>
<div className="w-full bg-[#F3ECE8] rounded-full h-2 overflow-hidden">
<div className="bg-brand h-2 rounded-full transition-all duration-700" style={{ width: "80%" }}></div>
</div>
<span className="block text-right text-[10px] text-charcoal-muted font-bold mt-1">80%</span>
</div>
</div>
</div>
</section>
{/*  Split Comparative Feedback View (12 Columns: 6 cols Left, 6 cols Right)  */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
{/*  Left Column (6 cols): Original Submission Text with Highlight Spans  */}
<div className="lg:col-span-6 bg-surface rounded-2xl border border-border-soft shadow-card flex flex-col h-[650px] overflow-hidden">
{/*  Card Header  */}
<div className="px-6 py-4 bg-canvas border-b border-border-soft flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">history_edu</span>
<h3 className="font-bold text-sm text-charcoal">Văn bản gốc học viên nộp</h3>
</div>
<div className="flex items-center gap-2 text-xs font-medium text-charcoal-muted">
<span className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 rounded-lg border border-border-soft">
<span className="material-symbols-outlined text-[14px]">format_align_left</span>
                            230 từ (Khoảng 218 ký tự)
                        </span>
</div>
</div>
{/*  Legend of Errors  */}
<div className="px-6 py-2.5 bg-surface border-b border-border-soft flex flex-wrap items-center gap-3 text-xs">
<span className="text-charcoal-muted font-semibold text-[11px]">Chú thích:</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-criticalBg text-status-critical text-[11px] font-semibold border border-red-200">
<span className="w-1.5 h-1.5 rounded-full bg-status-critical"></span> Lỗi nghiêm trọng (Critical)
                    </span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-warningBg text-status-warning text-[11px] font-semibold border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-status-warning"></span> Gợi ý liên kết (Coherence)
                    </span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-infoBg text-status-info text-[11px] font-semibold border border-blue-200">
<span className="w-1.5 h-1.5 rounded-full bg-status-info"></span> Kính ngữ công sở (Keigo)
                    </span>
</div>
{/*  Text Presentation Area  */}
<div className="p-6 overflow-y-auto flex-1 text-base leading-loose font-normal text-charcoal space-y-4">
<p className="font-medium text-charcoal pb-1 border-b border-dashed border-border-soft">
                        田中部長へ
                    </p>
<p>
                        お疲れ様です。営業部の山田です。
                    </p>
<p className="leading-relaxed">
                        大変申し訳ありませんが、明日の朝の会議に
                        {/*  Interactive Highlight 1: Critical Grammar  */}
<mark className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border-b-2 border-status-critical font-medium cursor-pointer hover:bg-red-100 transition-colors inline-flex items-center gap-0.5 group">
<span>参加できません</span>
<span className="material-symbols-outlined text-[14px] text-status-critical group-hover:scale-125 transition-transform">priority_high</span>
</mark>
                        。
                        {/*  Interactive Highlight 2: Suggestion Coherence  */}
<mark className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border-b-2 border-status-warning font-medium cursor-pointer hover:bg-amber-100 transition-colors inline-flex items-center gap-0.5 group">
<span>なぜなら</span>
<span className="material-symbols-outlined text-[14px] text-status-warning group-hover:scale-125 transition-transform">info</span>
</mark>
                        、昨日の夜から熱が出て、今朝病院に行ったらインフルエンザだと言われました。
                    </p>
<p className="leading-relaxed">
                        会議の資料は鈴木さんに
                        {/*  Interactive Highlight 3: Politeness / Keigo  */}
<mark className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border-b-2 border-status-info font-medium cursor-pointer hover:bg-blue-100 transition-colors inline-flex items-center gap-0.5 group">
<span>渡しました</span>
<span className="material-symbols-outlined text-[14px] text-status-info group-hover:scale-125 transition-transform">help</span>
</mark>
                        。本当にすみません。
                    </p>
<p className="pt-2">
                        よろしくお願いします。
                    </p>
</div>
{/*  Text Bottom Summary Footer  */}
<div className="px-6 py-3 bg-canvas border-t border-border-soft flex items-center justify-between text-xs text-charcoal-muted">
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-brand">touch_app</span>
                        Nhấp vào từng điểm gạch chân để chuyển nhanh đến phân tích bên phải
                    </span>
<button className="hover:text-brand font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">content_copy</span> Sao chép gốc
                    </button>
</div>
</div>
{/*  Right Column (6 cols): Sentence-by-sentence Feedback Cards  */}
<div className="lg:col-span-6 bg-surface rounded-2xl border border-border-soft shadow-card flex flex-col h-[650px] overflow-hidden">
{/*  Card Header  */}
<div className="px-6 py-4 bg-canvas border-b border-border-soft flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-brand text-[20px]">psychology</span>
<h3 className="font-bold text-sm text-charcoal">Phân tích & Hướng dẫn sửa đổi từng câu</h3>
</div>
<div className="flex items-center gap-1 text-xs">
<span className="px-2 py-1 rounded bg-sakura-100 text-brand font-bold text-[11px]">3 góp ý cải thiện</span>
</div>
</div>
{/*  Scrollable Cards Feed  */}
<div className="p-6 overflow-y-auto flex-1 space-y-4 bg-canvas/50">
{/*  Feedback Card 1: Critical (Khiêm nhường ngữ)  */}
<div className="bg-surface p-5 rounded-xl border border-red-200 shadow-sm relative pl-6 transition-all hover:shadow-md">
<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-status-critical rounded-l-xl"></div>
<div className="flex items-center justify-between gap-2 mb-2">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded-full bg-status-criticalBg text-status-critical text-[10px] font-extrabold uppercase tracking-wide border border-red-200">
                                    Critical
                                </span>
<span className="text-xs font-bold text-charcoal-muted">Lỗi khiêm nhường ngữ công sở</span>
</div>
<span className="text-xs font-mono font-semibold text-charcoal-muted line-through decoration-status-critical">
                                参加できません
                            </span>
</div>
<p className="text-xs text-charcoal leading-relaxed mb-3 font-normal">
                            Trong email kinh doanh gửi cấp trên (Bucho), cách dùng trực tiếp thể khả năng phủ định <span className="font-semibold text-charcoal">「〜できません」</span> mang sắc thái từ chối thẳng thừng, thiếu tôn trọng. Cần dùng cấu trúc khiêm nhường nhã nhặn hơn.
                        </p>
{/*  Correction Recommendation  */}
<div className="bg-canvas p-3 rounded-lg border border-border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2">
<div>
<span className="text-[10px] uppercase font-bold text-status-success block">Đề xuất thay thế tối ưu:</span>
<span className="text-xs font-bold text-emerald-700">参加いたしかねます / 欠席させていただきます</span>
</div>
<button className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1 self-end sm:self-auto">
<span className="material-symbols-outlined text-[14px]">done_all</span>
<span>Áp dụng sửa</span>
</button>
</div>
</div>
{/*  Feedback Card 2: Suggestion (Từ nối mạch lạc)  */}
<div className="bg-surface p-5 rounded-xl border border-amber-200 shadow-sm relative pl-6 transition-all hover:shadow-md">
<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-status-warning rounded-l-xl"></div>
<div className="flex items-center justify-between gap-2 mb-2">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded-full bg-status-warningBg text-status-warning text-[10px] font-extrabold uppercase tracking-wide border border-amber-200">
                                    Suggestion
                                </span>
<span className="text-xs font-bold text-charcoal-muted">Mạch lạc & Liên kết từ</span>
</div>
<span className="text-xs font-mono font-semibold text-charcoal-muted line-through decoration-status-warning">
                                なぜなら
                            </span>
</div>
<p className="text-xs text-charcoal leading-relaxed mb-3 font-normal">
<span className="font-semibold text-charcoal">「なぜなら」</span> thường xuất hiện trong văn luận giải trình, báo cáo logic hoặc nghị luận thi cử. Trong thư tín hàng ngày của người Nhật, việc giải thích nguyên nhân bằng ngữ pháp nguyên nhân <span className="font-semibold text-brand">「〜ため」</span> liền mạch sẽ tự nhiên và lịch sự hơn.
                        </p>
{/*  Correction Recommendation  */}
<div className="bg-canvas p-3 rounded-lg border border-border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2">
<div>
<span className="text-[10px] uppercase font-bold text-status-success block">Đề xuất Sensei khuyên dùng:</span>
<span className="text-xs font-bold text-emerald-700">...熱が出てしまいましたため、</span>
</div>
<button className="px-3 py-1.5 bg-surface hover:bg-brand-subtle text-brand border border-brand/30 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1 self-end sm:self-auto">
<span className="material-symbols-outlined text-[14px]">done_all</span>
<span>Áp dụng sửa</span>
</button>
</div>
</div>
{/*  Feedback Card 3: Politeness (Kính ngữ Tanaka Bucho)  */}
<div className="bg-surface p-5 rounded-xl border border-blue-200 shadow-sm relative pl-6 transition-all hover:shadow-md">
<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-status-info rounded-l-xl"></div>
<div className="flex items-center justify-between gap-2 mb-2">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded-full bg-status-infoBg text-status-info text-[10px] font-extrabold uppercase tracking-wide border border-blue-200">
                                    Politeness
                                </span>
<span className="text-xs font-bold text-charcoal-muted">Kính ngữ với đối tượng cấp trên</span>
</div>
<span className="text-xs font-mono font-semibold text-charcoal-muted line-through decoration-status-info">
                                渡しました
                            </span>
</div>
<p className="text-xs text-charcoal leading-relaxed mb-3 font-normal">
                            Khi báo cáo tình hình chuẩn bị công việc cho Trưởng phòng (Tanaka Bucho), hành động bàn giao tài liệu nên chuyển sang thể Khiêm nhường ngữ dạng trang trọng để thể hiện tác phong chuyên nghiệp.
                        </p>
{/*  Correction Recommendation  */}
<div className="bg-canvas p-3 rounded-lg border border-border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2">
<div>
<span className="text-[10px] uppercase font-bold text-status-success block">Đề xuất dạng trang trọng:</span>
<span className="text-xs font-bold text-emerald-700">お渡しいたしました / 引き継ぎを完了いたしました</span>
</div>
<button className="px-3 py-1.5 bg-surface hover:bg-brand-subtle text-brand border border-brand/30 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1 self-end sm:self-auto">
<span className="material-symbols-outlined text-[14px]">done_all</span>
<span>Áp dụng sửa</span>
</button>
</div>
</div>
</div>
</div>
</section>
{/*  Suggested Model Essay Section (Bản mẫu hoàn chỉnh đề xuất)  */}
<section className="bg-gradient-to-r from-surface via-brand-subtle/50 to-sakura-100/40 rounded-2xl p-6 border border-brand/20 shadow-subtle relative overflow-hidden">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shadow-xs">
<span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>recommend</span>
</div>
<div>
<h3 className="text-sm font-bold text-charcoal">Bản mẫu hoàn chỉnh đề xuất bởi Riki Sensei AI</h3>
<p className="text-xs text-charcoal-muted">Đã hiệu đính chuẩn 100% văn phong Business Japanese N4-N3</p>
</div>
</div>
<button className="px-3.5 py-1.5 bg-surface text-brand hover:bg-brand hover:text-white border border-brand/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 self-start sm:self-auto shadow-xs">
<span className="material-symbols-outlined text-[16px]">content_copy</span>
<span>Sao chép toàn bộ mẫu</span>
</button>
</div>
<div className="bg-surface/95 p-5 rounded-xl border border-border-soft backdrop-blur-sm text-sm leading-relaxed text-charcoal shadow-xs space-y-2.5 font-normal">
<p className="font-bold text-charcoal">田中部長</p>
<p>お疲れ様です。営業部の山田でございます。</p>
<p>
                    大変申し訳ございませんが、昨晩より高熱があり、今朝医療機関を受診したところインフルエンザとの診断を受けました。<br />
                    つきましては、周囲への感染拡大防止のため、誠に恐縮ながら明朝の定例会議は<span className="text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded">欠席させていただきます</span>。
                </p>
<p>
                    なお、担当案件の配布資料につきましては、事前に鈴木さんへ<span className="text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded">お渡しし、引き継ぎを完了いたしました</span>。急な不在により多大なご迷惑をおかけいたしますことを深くお詫び申し上げます。
                </p>
<p className="pt-1 font-medium">何卒よろしくお願い申し上げます。</p>
</div>
</section>
{/*  Bottom Action Bar  */}
<footer className="pt-4 pb-12 border-t border-border-soft flex flex-col md:flex-row items-center justify-between gap-4">
{/*  Left Feedback Utility  */}
<div className="flex items-center gap-4 text-xs text-charcoal-muted">
<span>Bạn có hài lòng với đánh giá chi tiết này không?</span>
<div className="flex items-center gap-1.5">
<button className="p-1.5 rounded-lg hover:bg-surface border border-border-soft text-charcoal-muted hover:text-brand transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[18px]">thumb_up</span>
<span className="text-[11px] font-semibold">Hữu ích</span>
</button>
<button className="p-1.5 rounded-lg hover:bg-surface border border-border-soft text-charcoal-muted hover:text-charcoal transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[18px]">thumb_down</span>
</button>
</div>
</div>
{/*  Right Primary Actions: 3 specific CTA Buttons  */}
<div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
{/*  Action 1  */}
<button className="px-4 py-2.5 rounded-xl border border-border-soft bg-surface text-charcoal text-xs font-bold hover:bg-canvas hover:border-charcoal-light transition-all shadow-xs flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-charcoal-muted">bookmark_add</span>
<span>Lưu vào Sổ tay bài làm</span>
</button>
{/*  Action 2  */}
<button className="px-4 py-2.5 rounded-xl border border-brand/30 bg-brand-subtle text-brand text-xs font-bold hover:bg-brand/20 transition-all shadow-xs flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">support_agent</span>
<span>Chia sẻ với Sensei tư vấn 1-on-1</span>
</button>
{/*  Action 3  */}
<button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-hover text-white text-xs font-bold hover:shadow-lg hover:shadow-brand/25 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-md shadow-brand/20">
<span className="material-symbols-outlined text-[18px]">refresh</span>
<span>Luyện tập lại chủ đề này</span>
</button>
</div>
</footer>
</main>
</div>


    </div>
  
</LearnerShell>
);
}
