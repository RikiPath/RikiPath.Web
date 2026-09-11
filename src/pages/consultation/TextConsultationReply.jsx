import { useEffect } from 'react';
import { ConsultShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function TextConsultationReply() {
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
      // Quick Templates insertion logic
          const templates = {
            'khen-ngoi': `\n\n[Nhận xét bổ sung]: Sensei rất ấn tượng với việc em đã chủ động viết các câu phức dài và dùng được các Kanji khó như 「納期」hay「厳守」. Khi kiểm soát được thêm sắc thái chủ quan/khách quan nữa thì bài viết N3 của em chắc chắn sẽ đạt điểm tối đa!`,
            'chien-thuat': `\n\n[Chiến thuật phòng thi JLPT N3]: Khi gặp dạng bài đục lỗ liên từ hoặc ngữ pháp trong Dokkai (Đọc hiểu), nếu thấy chủ ngữ là đối tác hoặc khách hàng (相手側), hãy loại ngay các đáp án mang cảm xúc cá nhân như ～のに, ～てたまらない nhé!`,
            'chuc-thi': `\n\nChúc em Trần Thị B luôn giữ vững năng lượng học tập tuyệt vời này. Kỳ thi tháng 7 tới chắc chắn em sẽ gặt hái kết quả xuất sắc!`
          };
      
          document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const type = btn.getAttribute('data-template');
              const editor = document.getElementById('editorContent');
              if (templates[type]) {
                const p = document.createElement('p');
                p.className = 'text-primary font-medium mt-space-8';
                p.innerText = templates[type];
                editor.appendChild(p);
                showToast('Đã chèn mẫu phản hồi!', 'Nội dung template đã được thêm vào cuối bài chữa.');
              }
            });
          });
      
          // Grade Rubric Switcher
          const gradeButtons = document.querySelectorAll('.grade-pill');
          gradeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
              gradeButtons.forEach(b => {
                b.className = 'grade-pill p-space-12 rounded-xl bg-surface-container-low hover:bg-surface-container flex flex-col items-center gap-1 transition-all';
                const heading = b.querySelector('span:first-child');
                const sub = b.querySelector('span:last-child');
                heading.className = 'font-display-sm text-display-sm font-bold text-text-charcoal';
                sub.className = 'font-label-xs text-label-xs text-on-surface-variant';
              });
      
              btn.className = 'grade-pill active p-space-12 rounded-xl bg-primary text-on-primary shadow-md flex flex-col items-center gap-1 transition-all';
              const activeHeading = btn.querySelector('span:first-child');
              const activeSub = btn.querySelector('span:last-child');
              activeHeading.className = 'font-display-sm text-display-sm font-bold text-on-primary';
              activeSub.className = 'font-label-xs text-label-xs text-on-primary/90 font-semibold';
            });
          });
      
          // Finalize submission microinteraction
          function finalizeSubmission() {
            showToast('Đã phê duyệt & Gửi phản hồi', 'Bản thẩm định văn bản đã được chuyển tới học viên Trần Thị B.');
            const btn = document.getElementById('submitBtn');
            btn.innerHTML = '<span className="material-symbols-outlined text-[18px]">check</span><span>Đã hoàn tất</span>';
            btn.classList.remove('bg-primary', 'hover:bg-primary-hover');
            btn.classList.add('bg-tertiary', 'cursor-default');
          }
      
          document.getElementById('submitBtn')?.addEventListener('click', finalizeSubmission);
      
          function showToast(title, subtitle) {
            const toast = document.getElementById('toastNotification');
            document.getElementById('toastTitle').innerText = title;
            document.getElementById('toastSubtitle').innerText = subtitle;
            toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
            toast.classList.add('translate-y-0', 'opacity-100');
      
            setTimeout(() => {
              toast.classList.remove('translate-y-0', 'opacity-100');
              toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
            }, 3500);
          }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <ConsultShell pathname={pathname} breadcrumb="Trả lời văn bản">
<div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen" data-page="TextConsultationReply" data-shell-unified="1">

<div className="pl-0 min-h-screen flex flex-col"><main className="w-full max-w-grid-max-width mx-auto px-space-32 pt-0 flex-1 bg-surface"><div className="flex flex-col w-full pb-space-48">
{/*  Dynamic Top Sub-header Context Bar  */}
<div className="flex flex-col gap-space-12 pt-space-16 pb-space-24">
{/*  Breadcrumb & Ticket Identifier  */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 font-body-sm text-body-sm text-on-surface-variant">
<span className="hover:text-primary transition-colors cursor-pointer">Cố vấn</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="hover:text-primary transition-colors cursor-pointer">Hàng đợi yêu cầu</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="font-label-md text-label-md text-primary bg-secondary-tint px-space-8 py-0.5 rounded">
          #REQ-2024-88412
        </span>
</div>
{/*  SLA Timer Alert Chip  */}
<div className="flex items-center gap-space-8 px-space-12 py-1 rounded-full bg-error-container text-on-error-container shadow-sm">
<span className="material-symbols-outlined text-[18px] text-error animate-pulse">timer</span>
<span className="font-label-md text-label-md font-semibold text-error">Khẩn cấp: Còn 1 giờ 15 phút</span>
<span className="text-error/40 text-body-sm">•</span>
<span className="font-body-sm text-body-sm text-on-error-container">SLA phản hồi cam kết</span>
</div>
</div>
{/*  Title & Action Console Header  */}
<div className="flex items-center justify-between flex-wrap gap-space-16">
<div className="flex items-center gap-space-16">
<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
<span className="material-symbols-outlined text-[28px]">edit_note</span>
</div>
<div>
<h1 className="font-display-sm text-display-sm text-text-charcoal tracking-tight">
            Studio Trả lời Tư vấn Văn bản & Chữa bài tập
          </h1>
<p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-8 mt-0.5">
<span>Phiên thẩm định ngữ dụng học Business JLPT N3</span>
<span>•</span>
<span className="text-tertiary font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/30 flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Đang kết nối trực tiếp
            </span>
</p>
</div>
</div>
{/*  Action Cluster  */}
<div className="flex items-center gap-space-12">
<div className="flex items-center gap-space-12 px-space-12 py-space-8 bg-surface-card rounded-xl shadow-sm">
<div className="w-8 h-8 rounded-full bg-secondary-tint flex items-center justify-center text-primary font-bold text-label-md">
            TB
          </div>
<div className="flex flex-col">
<span className="font-label-md text-label-md text-text-charcoal leading-none">Trần Thị B</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">#44120 • Lớp N3-Master</span>
</div>
</div>
<button className="h-10 px-space-16 rounded-lg bg-surface-card hover:bg-surface-container-high text-text-charcoal font-label-md text-label-md shadow-sm transition-all flex items-center gap-space-8" type="button">
<span className="material-symbols-outlined text-[18px]">forward</span>
<span>Chuyển Sensei khác</span>
</button>
<button className="h-10 px-space-20 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-md text-label-md shadow-md transition-all flex items-center gap-space-8" id="submitBtn" type="button">
<span className="material-symbols-outlined text-[18px]">send_spark</span>
<span>Gửi lời giải & Hoàn tất tư vấn</span>
</button>
</div>
</div>
</div>
{/*  12-Column Flexible Grid Workspace  */}
<div className="grid grid-cols-12 gap-space-24 items-start">
{/*  LEFT PANEL: 5 Columns (Review Source, Questions, AI Diagnostics)  */}
<div className="col-span-12 lg:col-span-5 flex flex-col gap-space-20">
{/*  Student Dossier Snapshot Card  */}
<div className="bg-surface-card rounded-2xl p-space-20 shadow-sm flex flex-col gap-space-16">
<div className="flex items-start justify-between">
<div className="flex items-center gap-space-12">
<div className="relative">
<img className="w-12 h-12 rounded-full object-cover shadow-sm" data-alt="Chân dung học viên nữ Nhật ngữ người Việt Nam trẻ trung, lịch thiệp, phong cách học thuật hiện đại, tone màu ấm áp nhã nhặn" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxPxhnGDIMoKJp7YqbB55fBnr9aAtKNe6zKVMm9M2SfFBustsotNeqKvry_QsXVizddvl1zjMY-iG_jyg25IuLVc688mBpRDCAwcPOv-i7Ow5ny4lRuMVGVjA8Zrw0ozB1lbAnT27ifZDYng4jTI1bmuZcb1bEBb9ZOTrSszLS0Ca-mAsP-2vm6Yhvnqz9U04r6vq3pKSkohhPvG4oM39XE1W3g21ZGRvMzAcHEp0TWR6FZVjHnMlj" />
<span className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary rounded-full ring-2 ring-surface-card"></span>
</div>
<div className="flex flex-col">
<div className="flex items-center gap-space-8">
<span className="font-headline-sm text-headline-sm text-text-charcoal">Trần Thị B</span>
<span className="px-space-8 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-xs text-label-xs">N3 Cấp tốc</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Lộ trình: JLPT Tháng 7/2025 • Điểm mục tiêu: 140/180</span>
</div>
</div>
<span className="font-label-xs text-label-xs px-space-8 py-1 rounded bg-surface-container-high text-on-surface-variant">Yêu cầu #88412</span>
</div>
<div className="p-space-12 bg-surface-container-low rounded-xl flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">auto_stories</span>
<span className="font-label-md text-label-md text-text-charcoal">Chuyên đề bài làm:</span>
</div>
<span className="font-label-md text-label-md text-primary font-medium bg-surface-card px-space-8 py-1 rounded-lg shadow-sm">
            ～ものの、～にもかかわらず
          </span>
</div>
</div>
{/*  Student Query & Handwritten Proof Card  */}
<div className="bg-surface-card rounded-2xl p-space-20 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between pb-space-8">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[22px]">contact_support</span>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Thắc mắc cụ thể của học viên</h2>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">Gửi lúc 14:18</span>
</div>
{/*  Student Voice Bubble  */}
<div className="p-space-16 bg-secondary-tint rounded-xl flex flex-col gap-space-8">
<p className="font-body-md text-body-md text-text-charcoal leading-relaxed">
            “Thầy/Cô ơi, em viết câu này nhưng bị Haru AI báo điểm mạch lạc thấp, em không hiểu vì sao trong văn cảnh công ty lại không nên dùng <span className="font-semibold text-primary">～のに</span> mà phải dùng <span className="font-semibold text-primary">～にもかかわらず</span> ạ? Em thấy cả hai đều dịch là ‘mặc dù... nhưng’ mà?”
          </p>
</div>
{/*  Student Essay & Handwritten Scan Gallery  */}
<div className="flex flex-col gap-space-12">
<span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-space-4">
<span className="material-symbols-outlined text-[16px]">description</span> Bài làm tự luận nộp kèm:
          </span>
<div className="p-space-16 bg-surface-container-lowest rounded-xl shadow-inner flex flex-col gap-space-12">
<div className="font-body-md text-body-md text-text-charcoal leading-relaxed p-space-12 bg-surface-container-low rounded-lg font-mono">
              「先月納期を厳守したのに、クライアントから追加の修正要求がたくさん届いたため、今週のスケジュールが狂ってしまいました。」
            </div>
<div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
<span>Bản viết tay chụp đối chiếu:</span>
<span className="font-label-xs text-label-xs text-primary cursor-pointer hover:underline flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">zoom_in</span> Xem ảnh gốc HD
              </span>
</div>
{/*  Attached Handwritten Sample Card  */}
<div className="relative rounded-xl overflow-hidden shadow-sm group cursor-pointer">
<img className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105" data-alt="Trang vở kẻ ô chữ Nhật genko yoshi với chữ viết tay Hiragana Kanji bằng bút mực đen nắn nót, có vài vết gạch bút đỏ phân tích, ánh sáng tự nhiên studio ấm áp" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDunm14j3IvjAy6eXIQb-vtGMGSEtfLpa-ZRU7SSdywtXk_wIjHH9G91gbeGPWcYAvpCvggv_bJ2TNbxD2Xi9-sW41NM-niIucopyot0v6rmDQwajsmV1iqrNASuYWeylvdldi3ZK8tTWoip1Zoek9KBTCPqAwaSIRl-xKndHNSOut04V7gAfn_0CM5fJQDUW9b3cZbBQVSxBwx6rlv85FIjy5eWr3Lu5yup5WkbvukaCr3Wo4KR1t0" />
<div className="absolute inset-0 bg-gradient-to-t from-text-charcoal/70 via-transparent to-transparent flex items-end p-space-12">
<span className="font-label-xs text-label-xs text-surface-card flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">photo_camera</span> bai_tap_tuan_4_kanji.jpg (2.4 MB)
                </span>
</div>
</div>
</div>
</div>
</div>
{/*  Haru AI Diagnostic Engine Panel  */}
<div className="bg-surface-card rounded-2xl p-space-20 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[18px]">smart_toy</span>
</span>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Phân tích chẩn đoán lỗi Haru AI</h2>
</div>
<span className="font-label-xs text-label-xs text-primary bg-secondary-fixed px-space-8 py-0.5 rounded-full font-bold">
            Haru NLP 3.2
          </span>
</div>
{/*  Metric Comparison Gauge Bar  */}
<div className="p-space-16 bg-surface-container-low rounded-xl flex flex-col gap-space-12">
<div className="flex justify-between items-center text-on-surface font-label-md text-label-md">
<span>Sắc thái văn phong bài nộp:</span>
<span className="text-error font-bold">Lệch ngữ cảnh Business</span>
</div>
{/*  Dual Progress comparison  */}
<div className="flex flex-col gap-space-8">
<div className="flex items-center justify-between font-body-sm text-body-sm">
<span className="text-on-surface-variant flex items-center gap-1">
<span className="w-2 h-2 rounded-full bg-tertiary"></span> Mức độ trang trọng chuẩn (Business)
              </span>
<span className="font-bold text-tertiary">85%</span>
</div>
<div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
<div className="h-full bg-tertiary rounded-full" style={{ width: "85%" }}></div>
</div>
<div className="flex items-center justify-between font-body-sm text-body-sm mt-1">
<span className="text-on-surface-variant flex items-center gap-1">
<span className="w-2 h-2 rounded-full bg-error"></span> Độ trang trọng câu học viên viết
              </span>
<span className="font-bold text-error">30% (Thiên về văn nói)</span>
</div>
<div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
<div className="h-full bg-error rounded-full" style={{ width: "30%" }}></div>
</div>
</div>
</div>
{/*  AI Detected Weaknesses Checklist  */}
<div className="flex flex-col gap-space-8">
<div className="p-space-12 rounded-xl bg-error-container/30 flex items-start gap-space-12">
<span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">warning</span>
<div className="flex flex-col text-on-surface">
<span className="font-label-md text-label-md font-semibold text-error">Lỗi ngữ dụng học (Pragmatic tone):</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Cấu trúc <code>～のに</code> biểu đạt thái độ bất mãn cá nhân. Tránh dùng tuyệt đối trong báo cáo nội bộ gửi cấp trên hoặc trao đổi khách hàng B2B.
              </p>
</div>
</div>
<div className="p-space-12 rounded-xl bg-surface-container-low flex items-start gap-space-12">
<span className="material-symbols-outlined text-tertiary text-[20px] shrink-0 mt-0.5">tips_and_updates</span>
<div className="flex flex-col">
<span className="font-label-md text-label-md font-semibold text-text-charcoal">Khuyến nghị điều chỉnh:</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Chuyển vế sang <code>～にもかかわらず</code> hoặc <code>～ものの</code> để trung hòa sắc thái khách quan.
              </p>
</div>
</div>
</div>
{/*  SVG Mini Radar / Pragmatic Vector Visualization  */}
<div className="p-space-12 bg-surface-container-lowest rounded-xl flex items-center justify-between">
<div className="flex flex-col">
<span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant">Chỉ số JLPT N3 Benchmark</span>
<span className="font-headline-sm text-headline-sm text-primary font-bold">B1+ Pragmatic</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Thang đánh giá 5 khía cạnh năng lực</span>
</div>
{/*  Inline Clean SVG Mini Chart  */}
<svg className="w-24 h-24 text-primary" fill="none" viewBox="0 0 100 100">
<circle cx="50" cy="50" r="40" stroke="#EADFD9" stroke-dasharray="3 3" strokeWidth="1.5"></circle>
<circle cx="50" cy="50" r="24" stroke="#EADFD9" strokeWidth="1.5"></circle>
<polygon fill="none" points="50,15 82,38 72,78 28,78 18,38" stroke="#EADFD9" strokeWidth="1"></polygon>
<polygon fill="#F8BBD0" fill-opacity="0.35" points="50,22 75,42 62,72 35,70 25,45" stroke="#E05A7A" strokeWidth="2"></polygon>
<circle cx="50" cy="22" fill="#E05A7A" r="3"></circle>
<circle cx="75" cy="42" fill="#E05A7A" r="3"></circle>
<circle cx="62" cy="72" fill="#E05A7A" r="3"></circle>
<circle cx="35" cy="70" fill="#E05A7A" r="3"></circle>
<circle cx="25" cy="45" fill="#E05A7A" r="3"></circle>
</svg>
</div>
</div>
</div>
{/*  RIGHT PANEL: 7 Columns (Sensei Studio Editor, Templates, Modules, Grading)  */}
<div className="col-span-12 lg:col-span-7 flex flex-col gap-space-20">
{/*  Quick Template Injection Selector Bar  */}
<div className="bg-surface-card rounded-2xl p-space-16 shadow-sm flex flex-col gap-space-12">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-secondary text-[20px]">bolt</span>
<span className="font-label-md text-label-md text-text-charcoal">Mẫu phản hồi nhanh chuyên gia (Quick Templates):</span>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Click để chèn vào vị trí con trỏ</span>
</div>
<div className="flex items-center gap-space-8 flex-wrap">
<button className="template-btn px-space-12 py-1.5 rounded-lg bg-secondary-tint hover:bg-secondary-fixed text-primary font-label-xs text-label-xs transition-colors flex items-center gap-1.5" data-template="khen-ngoi" type="button">
<span className="material-symbols-outlined text-[14px]">sentiment_satisfied</span>
            Khen ngợi nỗ lực + Phân tích sai sót
          </button>
<button className="template-btn px-space-12 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-text-charcoal font-label-xs text-label-xs transition-colors flex items-center gap-1.5" data-template="chien-thuat" type="button">
<span className="material-symbols-outlined text-[14px]">psychology</span>
            Chiến thuật giải đề thi JLPT N3
          </button>
<button className="template-btn px-space-12 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-text-charcoal font-label-xs text-label-xs transition-colors flex items-center gap-1.5" data-template="chuc-thi" type="button">
<span className="material-symbols-outlined text-[14px]">local_florist</span>
            Lời động viên & Chúc thi đỗ kỳ thi
          </button>
</div>
</div>
{/*  Main Rich Text Editor Panel  */}
<div className="bg-surface-card rounded-2xl shadow-sm overflow-hidden flex flex-col">
{/*  Editor Header & Specialized Japanese Formatting Toolbar  */}
<div className="p-space-16 bg-surface-container-low flex flex-col gap-space-12">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">draw</span>
<span className="font-headline-sm text-headline-sm text-text-charcoal">Trình biên soạn lời giải đáp chuyên sâu</span>
</div>
<div className="flex items-center gap-space-8">
<span className="font-label-xs text-label-xs text-on-surface-variant bg-surface-card px-2 py-1 rounded shadow-sm">
                Tự động lưu: 1 phút trước
              </span>
</div>
</div>
{/*  Japanese Grammar & Typography Tools Ribbon  */}
<div className="flex items-center gap-space-8 flex-wrap pt-space-8">
{/*  Format Tools  */}
<div className="flex items-center bg-surface-card rounded-lg p-1 shadow-sm gap-0.5">
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" title="In đậm" type="button">
<span className="material-symbols-outlined text-[18px]">format_bold</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" title="In nghiêng" type="button">
<span className="material-symbols-outlined text-[18px]">format_italic</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" title="Danh sách" type="button">
<span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" title="Trích dẫn blockquote" type="button">
<span className="material-symbols-outlined text-[18px]">format_quote</span>
</button>
</div>
{/*  Specialized Japanese Linguistics Pill Actions  */}
<div className="flex items-center gap-space-8">
<button className="h-8 px-space-12 rounded-lg bg-surface-card hover:bg-secondary-tint text-primary font-label-xs text-label-xs shadow-sm flex items-center gap-1.5 transition-colors" type="button">
<span className="material-symbols-outlined text-[16px]">translate</span>
<span>Furigana tự động</span>
</button>
<button className="h-8 px-space-12 rounded-lg bg-surface-card hover:bg-secondary-tint text-primary font-label-xs text-label-xs shadow-sm flex items-center gap-1.5 transition-colors" type="button">
<span className="material-symbols-outlined text-[16px]">bookmark_add</span>
<span>Chèn cú pháp chuẩn N3</span>
</button>
<button className="h-8 px-space-12 rounded-lg bg-surface-card hover:bg-secondary-tint text-secondary font-label-xs text-label-xs shadow-sm flex items-center gap-1.5 transition-colors" type="button">
<span className="material-symbols-outlined text-[16px]">mic</span>
<span>Đính âm chuẩn NHK Tokyo</span>
</button>
</div>
</div>
</div>
{/*  Editable Workspace (Rich Content Canvas)  */}
<div className="p-space-24 min-h-[380px] text-text-charcoal font-body-md text-body-md focus:outline-none flex flex-col gap-space-16" contenteditable="true" id="editorContent">
<p className="leading-relaxed">
            Chào em <strong>Trần Thị B</strong>, Sensei đã xem kỹ câu tự luận cũng như thắc mắc của em. Đây là một câu hỏi rất hay về mặt <em>ngữ dụng học (Pragmatics)</em> mà rất nhiều bạn học viên N3 thường nhầm lẫn khi áp dụng vào thực tế công việc!
          </p>
<div className="p-space-16 bg-surface-container-low rounded-xl my-space-4">
<h4 className="font-headline-sm text-headline-sm text-primary mb-space-8 flex items-center gap-space-8">
<span className="material-symbols-outlined text-[20px]">difference</span> 1. Vì sao không dùng「～のに」trong ngữ cảnh văn phòng?
            </h4>
<p className="mb-space-8">
              Về mặt dịch thuật, cả <code>～のに</code> lẫn <code>～にもかかわらず</code> đều có nghĩa là <em>"mặc dù... nhưng..."</em>, tuy nhiên bản chất biểu cảm hoàn toàn trái ngược:
            </p>
<ul className="list-disc pl-5 flex flex-col gap-space-4 text-on-surface-variant">
<li>
<strong className="text-error">～のに:</strong> Luôn mang <strong>cảm xúc chủ quan tiêu cực (bất mãn, thất vọng, trách móc ngầm)</strong> của người nói đối với kết quả không như kỳ vọng. Khi viết cho khách hàng hoặc báo cáo sếp: <em>"先月納期を厳守したのに..."</em>, người Nhật sẽ cảm thấy em đang hờn dỗi hoặc trách móc đối tác.
              </li>
<li>
<strong className="text-tertiary">～にもかかわらず:</strong> Mang tính <strong>trung lập, khách quan cao độ, không phán xét</strong>. Đây là cấu trúc chuẩn mực hàng đầu trong Business Japanese và các văn bản báo cáo chuyên nghiệp.
              </li>
</ul>
</div>
<div className="p-space-16 bg-secondary-tint/60 rounded-xl my-space-4">
<h4 className="font-headline-sm text-headline-sm text-text-charcoal mb-space-8 flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[20px]">task_alt</span> 2. Bản chữa mẫu chuẩn văn phong Doanh nghiệp Nhật (Business Writing):
            </h4>
<div className="p-space-12 bg-surface-card rounded-lg shadow-sm font-mono text-primary font-medium text-body-md">
              「先月期日通りに納品いたしました<ruby>にもかかわらず<rt className="text-[10px] text-secondary">mặc dù</rt></ruby>、先方より追加修正のご依頼を多数頂戴したため、工程の再調整を余儀なくされております。」
            </div>
<p className="text-body-sm text-on-surface-variant mt-space-8">
              💡 <em>Lưu ý Sensei bổ sung:</em> Thay vì dùng <code>狂ってしまいました</code> (ngôn ngữ nói), em nên đổi sang <code>再調整を余儀なくされております</code> để ghi điểm tuyệt đối trong các bài viết cấp độ N2/N1 sau này nhé.
            </p>
</div>
</div>
{/*  Audio Sample Attached Indicator Component  */}
<div className="px-space-24 py-space-12 bg-surface-container-low flex items-center justify-between">
<div className="flex items-center gap-space-12">
<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm cursor-pointer hover:bg-primary-hover">
<span className="material-symbols-outlined text-[18px]">play_arrow</span>
</div>
<div className="flex flex-col">
<span className="font-label-md text-label-md text-text-charcoal">Phat_am_N3_Business_TokyoAccent.mp3</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">0:42 • Giọng chuẩn phát thanh NHK • Đã gắn kèm câu chữa</span>
</div>
</div>
<button className="text-error hover:bg-error-container/40 p-1.5 rounded-lg transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
{/*  Supplementary Learning Path Generator  */}
<div className="bg-surface-card rounded-2xl p-space-20 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-tertiary text-[22px]">route</span>
<h3 className="font-headline-sm text-headline-sm text-text-charcoal">Gợi ý lộ trình ôn tập bổ trợ cá nhân hoá</h3>
</div>
<span className="font-label-xs text-label-xs bg-tertiary-fixed-dim/40 text-on-tertiary-fixed font-semibold px-2.5 py-1 rounded-full">
            Đồng bộ Sổ tay học viên
          </span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-16">
{/*  Exercise 1 Pick  */}
<div className="p-space-16 bg-surface-container-low rounded-xl flex flex-col justify-between gap-space-12 hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-xs text-label-xs px-2 py-0.5 rounded bg-surface-card text-primary font-bold shadow-sm">Luyện phản xạ #EX-N3-109</span>
<span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
</div>
<div>
<h4 className="font-label-md text-label-md text-text-charcoal">Bộ 15 câu phân biệt ～ものの & ～にもかかわらず</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Ngân hàng đề Riki Drill N3 • Độ khó: Trung cấp</p>
</div>
<div className="flex items-center justify-between pt-space-8 font-body-sm text-body-sm">
<span className="text-on-surface-variant">Thời lượng: ~12 phút</span>
<span className="text-primary font-label-xs text-label-xs font-semibold">Đã tự động gán ✓</span>
</div>
</div>
{/*  Flashcard Deck Pick  */}
<div className="p-space-16 bg-surface-container-low rounded-xl flex flex-col justify-between gap-space-12 hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-xs text-label-xs px-2 py-0.5 rounded bg-surface-card text-secondary font-bold shadow-sm">Thẻ Flashcard #FC-882</span>
<span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
</div>
<div>
<h4 className="font-label-md text-label-md text-text-charcoal">10 Liên từ nghịch đảo trang trọng trong hội thoại thương mại</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Sổ từ vựng Anki sync trực tiếp tài khoản Trần Thị B</p>
</div>
<div className="flex items-center justify-between pt-space-8 font-body-sm text-body-sm">
<span className="text-on-surface-variant">Từ vựng mục tiêu: N3-N2</span>
<span className="text-primary font-label-xs text-label-xs font-semibold">Đã lưu vào ví học tập ✓</span>
</div>
</div>
</div>
</div>
{/*  Grading Rubric Assessment & Consultation Finalizer  */}
<div className="bg-surface-card rounded-2xl p-space-20 shadow-sm flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[22px]">grade</span>
<h3 className="font-headline-sm text-headline-sm text-text-charcoal">Đánh giá chất lượng bài viết của học viên</h3>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Căn cứ tiêu chí đánh giá JLPT Essay Guide</span>
</div>
{/*  Grade Selector Toggles  */}
<div className="grid grid-cols-4 gap-space-12" id="gradeSelector">
<button className="grade-pill p-space-12 rounded-xl bg-surface-container-low hover:bg-surface-container flex flex-col items-center gap-1 transition-all" data-grade="A" type="button">
<span className="font-display-sm text-display-sm font-bold text-text-charcoal">A</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">Xuất sắc</span>
</button>
<button className="grade-pill active p-space-12 rounded-xl bg-primary text-on-primary shadow-md flex flex-col items-center gap-1 transition-all" data-grade="B" type="button">
<span className="font-display-sm text-display-sm font-bold text-on-primary">B</span>
<span className="font-label-xs text-label-xs text-on-primary/90 font-semibold">Khá - Đạt chuẩn</span>
</button>
<button className="grade-pill p-space-12 rounded-xl bg-surface-container-low hover:bg-surface-container flex flex-col items-center gap-1 transition-all" data-grade="C" type="button">
<span className="font-display-sm text-display-sm font-bold text-text-charcoal">C</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">Cần chỉnh sửa</span>
</button>
<button className="grade-pill p-space-12 rounded-xl bg-surface-container-low hover:bg-surface-container flex flex-col items-center gap-1 transition-all" data-grade="D" type="button">
<span className="font-display-sm text-display-sm font-bold text-text-charcoal">D</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">Chưa đạt yêu cầu</span>
</button>
</div>
{/*  Rubric Assessment Notes Input  */}
<div className="flex flex-col gap-space-8">
<label className="font-label-md text-label-md text-text-charcoal flex items-center justify-between">
<span>Ghi chú điểm mạnh / điểm yếu tóm tắt:</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Sẽ hiển thị trên chứng chỉ tiến độ</span>
</label>
<input className="w-full h-10 px-space-16 bg-surface-container-low rounded-lg text-text-charcoal font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-focus-ring" type="text" value="Khả năng dùng từ vựng phong phú, cấu trúc câu chặt chẽ. Cần rèn luyện thêm sự tinh tế trong việc lựa chọn sắc thái cảm xúc ở văn cảnh công sở." />
</div>
{/*  Bottom Action Confirmation Bar  */}
<div className="pt-space-8 flex items-center justify-between flex-wrap gap-space-12">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
<span>Học viên sẽ nhận thông báo trên Riki App & Email kèm bản PDF chữa chi tiết</span>
</div>
<div className="flex items-center gap-space-12">
<button className="h-10 px-space-16 rounded-lg bg-surface-container-high hover:bg-surface-container text-text-charcoal font-label-md text-label-md transition-colors" type="button">
              Lưu bản nháp
            </button>
<button className="h-10 px-space-24 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-md text-label-md shadow-md transition-all flex items-center gap-space-8" onClick="finalizeSubmission()" type="button">
<span className="material-symbols-outlined text-[18px]">verified</span>
<span>Ký duyệt & Xuất kết quả</span>
</button>
</div>
</div>
</div>
</div>
</div>
{/*  Micro-interaction Notification Toast (Hidden by default)  */}
<div className="fixed bottom-space-32 right-space-32 bg-surface-card text-text-charcoal p-space-16 rounded-xl shadow-xl flex items-center gap-space-12 transform translate-y-24 opacity-0 pointer-events-none transition-all duration-300 z-50" id="toastNotification">
<div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim/40 flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-[20px]">done_all</span>
</div>
<div className="flex flex-col">
<span className="font-label-md text-label-md text-text-charcoal" id="toastTitle">Đã gửi giải đáp thành công!</span>
<span className="font-body-sm text-body-sm text-on-surface-variant" id="toastSubtitle">Hồ sơ #REQ-2024-88412 đã đóng và hoàn tất SLA.</span>
</div>
</div>
</div></main></div>
    </div>
  
</ConsultShell>
);
}
