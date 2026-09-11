import { useEffect } from 'react';
import { ConsultShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function ConsultationRequestDetail() {
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
      setTimeout(() => {
          const chartInstance = Chart.getChart('mockTestRadar');
          if (chartInstance) {
            chartInstance.data.datasets[0].borderColor = '#b83256';
            chartInstance.data.datasets[0].backgroundColor = 'rgba(184, 50, 86, 0.15)';
            chartInstance.data.datasets[0].pointBackgroundColor = '#b83256';
            chartInstance.data.datasets[0].pointHoverBorderColor = '#b83256';
            chartInstance.update();
          }
        }, 200);
      
      document.addEventListener("DOMContentLoaded", function () {
          const ctx = document.getElementById('mockTestRadar').getContext('2d');
      
          const primaryColor = '#E05A7A';
          const primaryBg = 'rgba(224, 90, 122, 0.25)';
          const targetBorder = 'rgba(117, 105, 110, 0.45)';
      
          new Chart(ctx, {
            type: 'radar',
            data: {
              labels: ['Từ vựng / Hán tự', 'Ngữ pháp', 'Đọc hiểu', 'Nghe hiểu'],
              datasets: [
                {
                  label: 'Điểm thực tế (Tháng 10)',
                  data: [35, 28, 22, 30], // Actual scores
                  backgroundColor: primaryBg,
                  borderColor: primaryColor,
                  pointBackgroundColor: primaryColor,
                  pointBorderColor: '#ffffff',
                  pointHoverBackgroundColor: '#ffffff',
                  pointHoverBorderColor: primaryColor,
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointHoverRadius: 6
                },
                {
                  label: 'Mục tiêu N2 an toàn',
                  data: [38, 35, 35, 35], // Benchmark
                  backgroundColor: 'rgba(234, 223, 217, 0.15)',
                  borderColor: targetBorder,
                  borderDash: [4, 4],
                  pointRadius: 0,
                  borderWidth: 1.5
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                r: {
                  angleLines: {
                    color: 'rgba(234, 223, 217, 0.9)'
                  },
                  grid: {
                    color: 'rgba(234, 223, 217, 0.8)'
                  },
                  pointLabels: {
                    font: {
                      family: "'Plus Jakarta Sans', sans-serif",
                      size: 11,
                      weight: '600'
                    },
                    color: '#2D282A'
                  },
                  ticks: {
                    beginAtZero: true,
                    max: 60,
                    stepSize: 20,
                    display: false
                  }
                }
              },
              plugins: {
                legend: {
                  display: false // Using custom bottom legend in HTML to keep canvas spacious
                },
                tooltip: {
                  backgroundColor: '#2D282A',
                  titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
                  bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                  padding: 8,
                  cornerRadius: 6,
                  displayColors: true,
                  callbacks: {
                    label: function(context) {
                      return context.dataset.label + ': ' + context.parsed.r + ' / 60 điểm';
                    }
                  }
                }
              }
            }
          });
        });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <ConsultShell pathname={pathname} breadcrumb="Yêu cầu">
<div className="h-full antialiased bg-background text-text-main flex flex-col min-h-screen" data-page="ConsultationRequestDetail" data-shell-unified="1">


<div className="flex h-full min-h-screen">
{/*  ================= LEFT SIDEBAR =================  */}

{/*  ================= MAIN WRAPPER (1440px target container) =================  */}
<div className="flex-1 flex flex-col min-w-0">
{/*  Sticky Topbar  */}

{/*  Page Body Area  */}
<main className="flex-1 px-8 py-6 max-w-[1440px] w-full mx-auto space-y-6">
{/*  ================= BANNER: Data Access Grant =================  */}
<div className="rounded-xl bg-gradient-to-r from-[#FDF0F4] via-[#FFF8F9] to-[#FAF7F5] border border-[#f5c6d3] px-5 py-3.5 shadow-sm flex items-center justify-between"><div className="flex items-center gap-3.5"><div className="w-9 h-9 rounded-lg bg-[#b83256]/10 flex items-center justify-center text-[#b83256] flex-shrink-0"><span className="material-symbols-outlined text-[22px]">verified_user</span></div><div><div className="flex items-center gap-2"><h3 className="text-xs font-bold text-text-main">Quyền truy cập dữ liệu học tập có thời hạn</h3><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fdf0f4] text-[#b83256] border border-[#f8d7dc]"><span className="w-1.5 h-1.5 rounded-full bg-[#b83256]"></span> Đã ủy quyền</span></div><p className="text-xs text-text-muted mt-0.5">Học viên <strong className="text-text-main font-semibold">Nguyễn Văn A</strong> đã chủ động chia sẻ kết quả thi thử Mock-test, dữ liệu ôn từ vựng 7 ngày và nhật ký phân tích Haru AI để phục vụ tư vấn chuyên sâu.</p></div></div><div className="flex items-center gap-3 flex-shrink-0 bg-white border border-[#f8d7dc] px-3.5 py-1.5 rounded-lg shadow-sm"><span className="material-symbols-outlined text-[#b83256] text-[18px]">timer</span><div className="text-right"><span className="block text-[10px] uppercase font-semibold tracking-wider text-text-subtle leading-none">Hết hạn sau</span><span className="font-mono text-sm font-bold text-[#b83256] leading-tight">23:45:12</span></div></div></div>
{/*  ================= 12-COLUMN MAIN LAYOUT =================  */}
<div className="grid grid-cols-12 gap-6 items-start">
{/*  ***************** LEFT COLUMN (4 COLS) *****************  */}
<div className="col-span-12 lg:col-span-4 space-y-6">
{/*  1. Student Profile & Target Card  */}
<div className="bg-surface rounded-xl border border-border-soft p-5 shadow-card relative overflow-hidden">
<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-secondary/20 to-transparent rounded-bl-full pointer-events-none"></div>
<div className="flex items-start gap-4 mb-4">
<div className="relative">
<div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 p-0.5 flex items-center justify-center overflow-hidden">
<span className="font-bold text-xl text-primary">A</span>
</div>
<span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E05A7A] text-white">N2</span>
</div>
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<h2 className="text-base font-bold text-text-main truncate">Nguyễn Văn A</h2>
</div>
<p className="text-xs text-text-muted font-mono">ID: 88291 • Khóa N2 Tăng Tốc</p>
<div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#1E8E5A] font-semibold bg-success-bg px-2 py-0.5 rounded-md inline-flex">
<span className="material-symbols-outlined text-[14px]">bolt</span>
                  Chuỗi học liên tục: 28 ngày
                </div>
</div>
</div>
{/*  Target JLPT badge  */}
<div className="bg-background rounded-lg p-3 border border-border-light space-y-2.5">
<div className="flex items-center justify-between text-xs">
<span className="text-text-muted flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-primary">flag</span>
                  Mục tiêu JLPT:
                </span>
<span className="font-bold text-primary">N2 Kỳ Tháng 12/2024</span>
</div>
<div className="space-y-1">
<div className="flex justify-between text-[11px]">
<span className="text-text-subtle font-medium">Tiến độ khóa học</span>
<span className="font-bold text-text-main">64% hoàn thành</span>
</div>
<div className="w-full h-2 bg-border-soft rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-primary to-[#F8BBD0] rounded-full transition-all" style={{ width: "64%" }}></div>
</div>
</div>
<div className="pt-2 border-t border-border-soft/60 flex items-center justify-between text-[11px] text-text-muted">
<span className="">Thời gian tư vấn mong muốn:</span>
<span className="font-semibold text-text-main">Hôm nay, 19:30 - 20:15</span>
</div>
</div>
</div>
{/*  2. Question & Scope Card  */}
<div className="bg-surface rounded-xl border border-border-soft p-5 shadow-card">
<div className="flex items-center justify-between pb-3 mb-3 border-b border-border-light">
<h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[18px]">chat</span>
                Câu hỏi & Phạm vi tư vấn
              </h3>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary-subtle text-primary border border-secondary/40">Gói 45 Phút</span>
</div>
{/*  Student Question Quote  */}
<div className="mb-4">
<span className="text-[11px] font-bold text-text-subtle uppercase tracking-wider mb-1.5 block">Câu hỏi trọng tâm từ học viên</span>
<div className="p-3.5 bg-[#FDF0F4]/60 border-l-4 border-[#b83256] rounded-r-lg border-y border-r border-[#f8d7dc] text-xs text-text-main leading-relaxed italic relative"><span className="material-symbols-outlined text-[#b83256]/30 text-[28px] absolute top-1 right-2 pointer-events-none">format_quote</span>“Em đang gặp khó khăn trong việc tăng điểm phần Đọc hiểu N2, đặc biệt là các bài trường văn (dài). Em cũng không chắc cách phân bổ thời gian 105 phút làm bài sao cho hợp lý. Thầy/cô tư vấn giúp em chiến thuật và phương pháp luyện tập ạ.”</div>
</div>
{/*  Scopes Checklist  */}
<div>
<span className="text-[11px] font-bold text-text-subtle uppercase tracking-wider mb-2 block">3 Phạm vi tư vấn được yêu cầu</span>
<ul className="space-y-2 text-xs">
<li className="flex items-start gap-2.5 p-2 rounded-lg bg-background border border-border-light">
<div className="w-5 h-5 rounded-full bg-[#1E8E5A]/10 text-[#1E8E5A] flex items-center justify-center flex-shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[14px]">check</span>
</div>
<div>
<p className="font-semibold text-text-main">Chiến lược làm bài Đọc hiểu N2</p>
<p className="text-[11px] text-text-muted">Kỹ thuật định vị từ khóa & đối chiếu câu hỏi ở bài trường văn</p>
</div>
</li>
<li className="flex items-start gap-2.5 p-2 rounded-lg bg-background border border-border-light">
<div className="w-5 h-5 rounded-full bg-[#1E8E5A]/10 text-[#1E8E5A] flex items-center justify-center flex-shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[14px]">check</span>
</div>
<div>
<p className="font-semibold text-text-main">Kỹ năng quản lý thời gian phòng thi</p>
<p className="text-[11px] text-text-muted">Phân bổ khung giờ chuẩn cho phần Từ vựng - Ngữ pháp - Đọc hiểu</p>
</div>
</li>
<li className="flex items-start gap-2.5 p-2 rounded-lg bg-background border border-border-light">
<div className="w-5 h-5 rounded-full bg-[#1E8E5A]/10 text-[#1E8E5A] flex items-center justify-center flex-shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[14px]">check</span>
</div>
<div>
<p className="font-semibold text-text-main">Đánh giá lỗ hổng Từ vựng / Ngữ pháp</p>
<p className="text-[11px] text-text-muted">Nhận diện các mẫu liên từ và từ trừu tượng cản trở tốc độ đọc</p>
</div>
</li>
</ul>
</div>
</div>
{/*  3. Vocabulary Retention & Weak Words  */}
<div className="bg-surface rounded-xl border border-border-soft p-5 shadow-card">
<div className="flex items-center justify-between pb-3 mb-3 border-b border-border-light">
<h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[18px]">menu_book</span>
                Ghi nhớ Từ vựng (7 ngày gần nhất)
              </h3>
<span className="text-[11px] text-text-subtle font-medium">App Flashcard</span>
</div>
{/*  Stats Bar  */}
<div className="grid grid-cols-2 gap-3 mb-4">
<div className="bg-background rounded-lg p-3 border border-border-light">
<span className="text-[11px] text-text-muted block">Đã học (7 ngày)</span>
<div className="flex items-baseline gap-1 mt-1">
<span className="text-xl font-bold text-text-main">145</span>
<span className="text-xs text-text-muted">từ</span>
</div>
</div>
<div className="bg-background rounded-lg p-3 border border-border-light">
<span className="text-[11px] text-text-muted block">Tỷ lệ ghi nhớ</span>
<div className="flex items-baseline gap-1 mt-1">
<span className="text-xl font-bold text-[#1E8E5A]">78%</span>
<span className="text-[10px] text-text-muted">Khá</span>
</div>
</div>
</div>
{/*  Critical Weak Words  */}
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-[11px] font-bold text-danger uppercase tracking-wider flex items-center gap-1">
<span className="material-symbols-outlined text-[15px]">priority_high</span>
                  Từ vựng hay quên / Cần ôn gấp
                </span>
<span className="text-[10px] text-text-muted">Tỉ lệ sai &gt; 50%</span>
</div>
<div className="space-y-2">
<div className="p-2.5 rounded-lg bg-danger-bg/70 border border-danger/20 flex items-center justify-between">
<div>
<div className="flex items-center gap-2">
<span className="font-bold text-sm text-text-main">妥協</span>
<span className="text-xs text-text-muted font-mono">(Dakyou)</span>
</div>
<span className="text-[11px] text-danger font-medium">Thỏa hiệp - Nhầm với 'Thỏa thuận'</span>
</div>
<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-danger border border-danger/30">Sai 3/4 lần</span>
</div>
<div className="p-2.5 rounded-lg bg-danger-bg/70 border border-danger/20 flex items-center justify-between">
<div>
<div className="flex items-center gap-2">
<span className="font-bold text-sm text-text-main">促す</span>
<span className="text-xs text-text-muted font-mono">(Unagasu)</span>
</div>
<span className="text-[11px] text-danger font-medium">Thúc đẩy, khuyến khích - Hay quên nghĩa</span>
</div>
<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-danger border border-danger/30">Sai 4/5 lần</span>
</div>
<div className="p-2.5 rounded-lg bg-danger-bg/70 border border-danger/20 flex items-center justify-between">
<div>
<div className="flex items-center gap-2">
<span className="font-bold text-sm text-text-main">矛盾</span>
<span className="text-xs text-text-muted font-mono">(Mujun)</span>
</div>
<span className="text-[11px] text-danger font-medium">Mâu thuẫn - Sai cách ghép cụm từ</span>
</div>
<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-danger border border-danger/30">Sai 3/5 lần</span>
</div>
</div>
<div className="mt-3 text-center">
<button className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-all inline-flex items-center gap-1" type="button">
<span className="">Xem thêm 12 từ vựng yếu khác</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</button>
</div>
</div>
</div>
</div>
{/*  ***************** RIGHT COLUMN (8 COLS) *****************  */}
<div className="col-span-12 lg:col-span-8 space-y-6">
{/*  1. Mock Test Analytics Card  */}
<div className="bg-surface rounded-xl border border-border-soft p-5 shadow-card">
<div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-border-light gap-2">
<div>
<h3 className="text-sm font-bold text-text-main flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
                  Phân tích Đề thi thử gần nhất (Mock-test JLPT N2 - Đề #04)
                </h3>
<p className="text-xs text-text-muted mt-0.5">Ngày thi: 12/10/2024 • Đánh giá theo chuẩn thang điểm JEES</p>
</div>
{/*  Score Highlight Badge  */}
<div className="flex items-center gap-3 bg-background border border-border-soft px-3.5 py-1.5 rounded-xl">
<div className="text-right">
<span className="text-[10px] uppercase font-bold text-text-subtle tracking-wider block">Tổng điểm Mock-test</span>
<div className="flex items-baseline gap-1 justify-end">
<span className="text-xl font-extrabold text-[#b83256] font-mono">115</span>
<span className="text-xs text-text-muted font-medium">/ 180</span>
</div>
</div>
<div className="h-7 w-px bg-border-soft"></div>
<span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-warning-bg text-warning border border-warning/30 flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                  Sát nút chuẩn Đạt
                </span>
</div>
</div>
{/*  Grid with Radar Chart & 4 Skill Breakdown  */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
{/*  Radar Chart Container  */}
<div className="md:col-span-6 flex flex-col items-center justify-center p-2 bg-background/60 rounded-xl border border-border-light relative">
<div className="w-full h-[250px] relative">
<canvas id="mockTestRadar" width="402" height="375" style={{ display: "block", boxSizing: "border-box", height: "250px", width: "268px" }}></canvas>
</div>
<div className="flex items-center gap-4 mt-2 text-[11px]">
<span className="flex items-center gap-1.5 text-[#b83256] font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#b83256]"></span> Điểm thực tế</span>
<span className="flex items-center gap-1.5 text-text-muted font-medium">
<span className="w-2.5 h-2.5 rounded-full bg-border-soft border border-text-muted"></span> Chuẩn an toàn N2 (≥35)
                  </span>
</div>
</div>
{/*  4 Skill Score Cards  */}
<div className="md:col-span-6 space-y-2.5">
{/*  Skill 1: Từ vựng & Hán tự  */}
<div className="p-2.5 rounded-lg border border-border-light bg-surface hover:border-border-soft transition-all">
<div className="flex justify-between items-center text-xs mb-1">
<span className="font-semibold text-text-main flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-[#2D282A]">translate</span>
                      Từ vựng / Chữ Hán
                    </span>
<span className="font-bold text-text-main font-mono">35<span className="text-[10px] text-text-muted">/60</span></span>
</div>
<div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
<div className="h-full bg-[#1E8E5A] rounded-full" style={{ width: "58%" }}></div>
</div>
<div className="flex justify-between text-[10px] text-text-muted mt-1">
<span className="">Mức độ: Đạt yêu cầu cơ bản</span>
<span className="text-[#1E8E5A] font-medium">&gt; Điểm sàn</span>
</div>
</div>
{/*  Skill 2: Ngữ pháp  */}
<div className="p-2.5 rounded-lg border border-border-light bg-surface hover:border-border-soft transition-all">
<div className="flex justify-between items-center text-xs mb-1">
<span className="font-semibold text-text-main flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-[#2D282A]">spellcheck</span>
                      Ngữ pháp
                    </span>
<span className="font-bold text-text-main font-mono">28<span className="text-[10px] text-text-muted">/60</span></span>
</div>
<div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
<div className="h-full bg-warning rounded-full" style={{ width: "46%" }}></div>
</div>
<div className="flex justify-between text-[10px] text-text-muted mt-1">
<span className="">Mức độ: Cần củng cố liên từ</span>
<span className="text-warning font-medium">Trung bình</span>
</div>
</div>
{/*  Skill 3: Đọc hiểu - RED ALERT  */}
<div className="p-2.5 rounded-lg border-2 border-[#b83256]/30 bg-[#fdf0f4]/80"><div className="flex justify-between items-center text-xs mb-1"><span className="font-bold text-[#b83256] flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-[#b83256]">warning</span>Đọc hiểu (BÁO ĐỘNG ĐỎ)</span><span className="font-extrabold text-[#b83256] font-mono text-sm">22<span className="text-[10px] text-[#b83256]/80">/60</span></span></div><div className="w-full h-2 bg-[#b83256]/15 rounded-full overflow-hidden"><div className="h-full bg-[#b83256] rounded-full" style={{ width: "36%" }}></div></div><div className="flex justify-between text-[10px] text-[#b83256] font-medium mt-1"><span className="">Nguy cơ liệt điểm (&lt; 19đ). Sai chủ yếu bài dài</span><span className="font-bold uppercase">Trọng tâm tư vấn</span></div></div>
{/*  Skill 4: Nghe hiểu  */}
<div className="p-2.5 rounded-lg border border-border-light bg-surface hover:border-border-soft transition-all">
<div className="flex justify-between items-center text-xs mb-1">
<span className="font-semibold text-text-main flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-[#2D282A]">headphones</span>
                      Nghe hiểu
                    </span>
<span className="font-bold text-text-main font-mono">30<span className="text-[10px] text-text-muted">/60</span></span>
</div>
<div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
<div className="h-full bg-[#1E8E5A]/80 rounded-full" style={{ width: "50%" }}></div>
</div>
<div className="flex justify-between text-[10px] text-text-muted mt-1">
<span className="">Mức độ: Tạm ổn định</span>
<span className="text-text-muted">Phản xạ câu hỏi ngắn tốt</span>
</div>
</div>
</div>
</div>
</div>
{/*  2. Shared Submissions with Haru AI Analysis  */}
<div className="bg-surface rounded-xl border border-border-soft p-5 shadow-card">
<div className="flex items-center justify-between pb-3 mb-3 border-b border-border-light">
<div className="flex items-center gap-2">
<span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center shadow-xs">
<span className="material-symbols-outlined text-[16px]">smart_toy</span>
</span>
<div>
<h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
                    Dữ liệu Bài tập chia sẻ (Phân tích Haru AI)
                  </h3>
<p className="text-[11px] text-text-muted">Chẩn đoán tự động từ hệ thống chấm AI theo dòng thời gian làm bài</p>
</div>
</div>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary-light text-primary border border-primary/20">
                Haru Engine v2.4
              </span>
</div>
{/*  Table of Submissions  */}
<div className="overflow-x-auto">
<table className="w-full text-left text-xs border-collapse">
<thead>
<tr className="bg-background text-text-subtle uppercase text-[10px] tracking-wider border-b border-border-soft">
<th className="py-2.5 px-3 font-bold w-24">Ngày nộp</th>
<th className="py-2.5 px-3 font-bold w-32">Loại bài</th>
<th className="py-2.5 px-3 font-bold">Chẩn đoán chi tiết & Lỗi sai chính từ AI</th>
<th className="py-2.5 px-3 font-bold text-right w-24">Thao tác</th>
</tr>
</thead>
<tbody className="divide-y divide-border-light">
{/*  Row 1: Đọc hiểu dài  */}
<tr className="hover:bg-background/80 transition-colors">
<td className="py-3 px-3 align-top font-mono text-text-muted text-[11px]">
                      12/10/2024
                      <span className="block text-[10px] text-text-subtle">21:40</span>
</td>
<td className="py-3 px-3 align-top">
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-danger-bg text-danger border border-danger/20">
                        Đọc hiểu (Dài)
                      </span>
<p className="text-[10px] text-text-subtle mt-1 font-mono">Đề N2 - Bài 55</p>
</td>
<td className="py-3 px-3 align-top space-y-1">
<div className="flex items-center gap-1.5 text-danger font-semibold">
<span className="material-symbols-outlined text-[15px]">error</span>
<span className="">Lỗi sai chính: Xác định sai đại từ chỉ thị (これ、それ, そのこと)</span>
</div>
<p className="text-text-muted text-[11px] leading-relaxed">
<strong className="text-text-main font-medium">Haru AI Note:</strong> Học viên có xu hướng chọn đáp án xuất hiện ở câu ngay phía trước mà không đọc quét ngược lại bối cảnh chủ đề ở đầu đoạn. Tốc độ đọc chậm (140 chữ/phút, chuẩn N2 là 200 chữ/phút).
                      </p>
</td>
<td className="py-3 px-3 align-top text-right">
<button className="text-primary hover:text-primary-hover font-semibold hover:underline text-[11px] inline-flex items-center gap-0.5" type="button">
                        Xem bài làm
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
</button>
</td>
</tr>
{/*  Row 2: Ngữ pháp  */}
<tr className="hover:bg-background/80 transition-colors">
<td className="py-3 px-3 align-top font-mono text-text-muted text-[11px]">
                      08/10/2024
                      <span className="block text-[10px] text-text-subtle">14:15</span>
</td>
<td className="py-3 px-3 align-top">
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-warning-bg text-warning border border-warning/30">
                        Ngữ pháp N2
                      </span>
<p className="text-[10px] text-text-subtle mt-1 font-mono">Chuyên đề 08</p>
</td>
<td className="py-3 px-3 align-top space-y-1">
<div className="flex items-center gap-1.5 text-warning font-semibold">
<span className="material-symbols-outlined text-[15px]">help</span>
<span className="">Cần chú ý: Nhầm lẫn đặc trưng giữa にしては và にしても</span>
</div>
<p className="text-text-muted text-[11px] leading-relaxed">
<strong className="text-text-main font-medium">Haru AI Note:</strong> Học viên làm sai 4/5 câu trắc nghiệm dạng đánh giá chủ quan vs giả định tương phản. Điểm ngữ pháp chững lại ở tuần thứ 3 liên tiếp. Khuyến nghị Sensei hướng dẫn phân biệt sắc thái ngữ cảnh.
                      </p>
</td>
<td className="py-3 px-3 align-top text-right">
<button className="text-primary hover:text-primary-hover font-semibold hover:underline text-[11px] inline-flex items-center gap-0.5" type="button">
                        Xem bài làm
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
</button>
</td>
</tr>
{/*  Row 3: Trung văn đọc hiểu  */}
<tr className="hover:bg-background/80 transition-colors">
<td className="py-3 px-3 align-top font-mono text-text-muted text-[11px]">
                      04/10/2024
                      <span className="block text-[10px] text-text-subtle">20:05</span>
</td>
<td className="py-3 px-3 align-top">
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-background text-text-main border border-border-soft">
                        Đọc hiểu (Trung)
                      </span>
<p className="text-[10px] text-text-subtle mt-1 font-mono">Đề N2 - Bài 42</p>
</td>
<td className="py-3 px-3 align-top space-y-1">
<div className="flex items-center gap-1.5 text-text-main font-semibold">
<span className="material-symbols-outlined text-[15px] text-[#1E8E5A]">check_circle</span>
<span className="">Đạt 3/3 câu hỏi chi tiết • Bị lố 3 phút so với thời gian quy định</span>
</div>
<p className="text-text-muted text-[11px] leading-relaxed">
<strong className="text-text-main font-medium">Haru AI Note:</strong> Đọc hiểu ý chính tác giả rất tốt, tuy nhiên dành đến 12 phút (thời gian chuẩn khuyến nghị: 7 - 8 phút). Dẫn tới thiếu thời gian cho phần trường văn cuối đề.
                      </p>
</td>
<td className="py-3 px-3 align-top text-right">
<button className="text-primary hover:text-primary-hover font-semibold hover:underline text-[11px] inline-flex items-center gap-0.5" type="button">
                        Xem bài làm
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
{/*  3. Consultant Scratchpad / Fast Note  */}
<div className="bg-surface rounded-xl border border-border-soft p-5 shadow-card">
<div className="flex items-center justify-between pb-3 mb-3 border-b border-border-light">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
<div>
<h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
                    Khung Ghi chú nhanh của Sensei (Consultant Scratchpad)
                  </h3>
<p className="text-[11px] text-text-muted">Ghi chép sẵn phương án & lộ trình trước khi kết nối trực tiếp với học viên</p>
</div>
</div>
<div className="flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#1E8E5A]"></span>
<span className="text-[11px] text-text-subtle">Tự động lưu nháp</span>
</div>
</div>
{/*  Fast templates tags  */}
<div className="flex flex-wrap items-center gap-2 mb-3">
<span className="text-[11px] font-semibold text-text-muted">Chèn mẫu tư vấn:</span>
<button className="text-[11px] px-2.5 py-1 rounded-full bg-background border border-border-soft text-text-main hover:border-primary hover:text-primary transition-colors" type="button">
                + Chiến thuật Skimming Đọc hiểu
              </button>
<button className="text-[11px] px-2.5 py-1 rounded-full bg-background border border-border-soft text-text-main hover:border-primary hover:text-primary transition-colors" type="button">
                + Phân bổ 105 phút thi N2
              </button>
<button className="text-[11px] px-2.5 py-1 rounded-full bg-background border border-border-soft text-text-main hover:border-primary hover:text-primary transition-colors" type="button">
                + Phân biệt にしては / にしても
              </button>
</div>
{/*  Textarea  */}
<div className="relative rounded-xl border border-border-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
{/*  Mini Editor Toolbar  */}
<div className="bg-background/60 border-b border-border-light px-3 py-1.5 flex items-center gap-1 rounded-t-xl text-text-muted">
<button className="p-1 hover:bg-surface rounded text-text-main" title="In đậm" type="button"><span className="material-symbols-outlined text-[16px]">format_bold</span></button>
<button className="p-1 hover:bg-surface rounded text-text-main" title="In nghiêng" type="button"><span className="material-symbols-outlined text-[16px]">format_italic</span></button>
<button className="p-1 hover:bg-surface rounded text-text-main" title="Danh sách số" type="button"><span className="material-symbols-outlined text-[16px]">format_list_numbered</span></button>
<button className="p-1 hover:bg-surface rounded text-text-main" title="Danh sách gạch đầu dòng" type="button"><span className="material-symbols-outlined text-[16px]">format_list_bulleted</span></button>
<div className="h-4 w-px bg-border-soft mx-1"></div>
<span className="text-[10px] text-text-subtle italic">Chỉ hiển thị cho Sensei trong phiên tư vấn</span>
</div>
<textarea className="w-full px-3.5 py-2.5 text-xs text-text-main bg-transparent border-none focus:ring-0 resize-none font-sans leading-relaxed" placeholder="Nhập ghi chú định hướng: Ví dụ:
1. Trấn an học viên: Điểm từ vựng (35) và nghe hiểu (30) là nền tảng tốt.
2. Sửa chiến lược đọc: Hướng dẫn đọc câu hỏi trước -&gt; khoanh vùng đại từ chỉ thị trong phạm vi 2 câu lân cận.
3. Kế hoạch thời gian: Cắt giảm phần Từ vựng xuống tối đa 25 phút, dành trọn 65 phút cho Đọc hiểu..." rows="4"></textarea>
</div>
{/*  Footer of scratchpad  */}
<div className="mt-3 flex items-center justify-between text-xs pt-2">
<span className="text-[11px] text-text-muted">Ghi chú này sẽ được đính kèm vào Phiếu trả lời tổng kết sau buổi tư vấn.</span>
<button className="px-3 py-1.5 rounded-lg bg-background border border-border-soft font-semibold text-text-main hover:bg-surface-light text-xs transition-colors" type="button">
                Lưu vào hồ sơ học viên
              </button>
</div>
</div>
</div>
</div>
</main>
{/*  Footer  */}
<footer className="mt-auto border-t border-border-soft bg-surface py-3 px-8 text-xs text-text-muted flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="font-bold text-text-main">RikiPath Neo-Sakura Portal</span>
<span className="">•</span>
<span className="">Sensei Support v2.5.0</span>
</div>
<div className="flex items-center gap-5 text-[11px] text-text-subtle">
<a className="hover:text-primary transition-colors" href="#">Quy chế bảo mật dữ liệu học viên</a>
<a className="hover:text-primary transition-colors" href="#">Quy chuẩn đánh giá JLPT JEES</a>
<a className="hover:text-primary transition-colors" href="#">Hỗ trợ kỹ thuật phòng họp</a>
</div>
</footer>
</div>
</div>


{/*  ================= RADAR CHART INITIALIZATION =================  */}


    </div>
  
</ConsultShell>
);
}
