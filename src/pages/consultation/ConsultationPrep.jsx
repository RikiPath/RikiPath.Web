import { useEffect } from 'react';
import { ConsultShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function ConsultationPrep() {
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
      function updateLiveClock() {
          const clockEl = document.getElementById('live-clock');
          if (!clockEl) return;
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          clockEl.innerText = `${hours}:${minutes}:${seconds} GMT+7`;
        }
        setInterval(updateLiveClock, 1000);
        updateLiveClock();
      
        function showToast(msg) {
          const toast = document.getElementById('toast-notify');
          const toastText = document.getElementById('toast-text');
          if (!toast || !toastText) return;
          toastText.innerText = msg;
          toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
          toast.classList.add('translate-y-0', 'opacity-100');
          setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
            toast.classList.remove('translate-y-0', 'opacity-100');
          }, 3200);
        }
      
        function formatEditor(command) {
          document.execCommand(command, false, null);
          const editor = document.getElementById('sensei-notes');
          if (editor) editor.focus();
        }
      
        const insertPlanBtn = document.getElementById('insert-plan-btn');
        if (insertPlanBtn) {
          insertPlanBtn.addEventListener('click', () => {
            const editor = document.getElementById('sensei-notes');
            if (editor) {
              const planText = `
      <br><b>[LỘ TRÌNH 3 TUẦN ĐỀ XUẤT CHO NGUYỄN VĂN A]:</b>
      • Tuần 1 (21-27/10): Xử lý 5 bài trung văn, chú trọng phân tích đại từ これ・それ và câu phủ định kép.
      • Tuần 2 (28/10-03/11): Đột phá 3 bài trường văn tốc độ cao dưới 8 phút/đoạn, gạch chân từ khóa bẫy liên từ.
      • Tuần 3 (04-10/11): Làm trọn đề thi bấm đúng 105 phút để khóa cứng phong độ thi cử.
      `;
              editor.innerHTML += planText;
              showToast('Đã chèn phác đồ AI vào khung ghi chú!');
            }
          });
        }
      
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
          saveDraftBtn.addEventListener('click', () => {
            const statusEl = document.getElementById('save-status');
            if (statusEl) {
              statusEl.innerHTML = '<span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> Đang lưu...';
              setTimeout(() => {
                statusEl.innerHTML = '<span className="material-symbols-outlined text-[16px] text-tertiary">cloud_done</span> Đã đồng bộ nháp lúc ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                showToast('Đã lưu bản ghi chú & cấu hình chuẩn bị thành công!');
              }, 600);
            }
          });
        }
      
        const avBtn = document.getElementById('av-test-btn');
        const modal = document.getElementById('device-modal');
        const modalContainer = document.getElementById('modal-container');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const confirmModalBtn = document.getElementById('confirm-modal-btn');
      
        function openModal() {
          if (!modal) return;
          modal.classList.remove('opacity-0', 'pointer-events-none');
          modal.classList.add('opacity-100');
          if (modalContainer) {
            modalContainer.classList.remove('scale-95');
            modalContainer.classList.add('scale-100');
          }
        }
      
        function closeModal() {
          if (!modal) return;
          modal.classList.add('opacity-0', 'pointer-events-none');
          modal.classList.remove('opacity-100');
          if (modalContainer) {
            modalContainer.classList.remove('scale-100');
            modalContainer.classList.add('scale-95');
          }
        }
      
        if (avBtn) avBtn.addEventListener('click', openModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (confirmModalBtn) {
          confirmModalBtn.addEventListener('click', () => {
            closeModal();
            showToast('Thiết bị Camera & Micro đã được kiểm tra đạt chuẩn!');
          });
        }
        if (modal) {
          modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
          });
        }
      
        const addMaterialBtn = document.getElementById('add-material-btn');
        if (addMaterialBtn) {
          addMaterialBtn.addEventListener('click', () => {
            showToast('Đang kết nối kho học liệu JLPT N2 Riki...');
          });
        }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <ConsultShell pathname={pathname} breadcrumb="Chuẩn bị buổi">
<div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen" data-page="ConsultationPrep" data-shell-unified="1">

<div className="pl-0 min-h-screen flex flex-col"><main className="w-full max-w-grid-max-width mx-auto px-space-32 pt-0 flex-1 bg-surface"><div className="flex flex-col w-full pb-space-48">
<div className="w-full flex flex-col gap-space-20 mb-space-32">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="hover:text-primary transition-colors cursor-pointer">Cố vấn</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="hover:text-primary transition-colors cursor-pointer">Phiên sắp tới</span>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="text-primary font-label-md text-label-md bg-secondary-tint px-space-8 py-0.5 rounded-full">#CR-2024-88291</span>
</div>
<div className="flex items-center gap-space-12 font-body-sm text-body-sm text-on-surface-variant">
<span className="flex items-center gap-space-4">
<span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
          Kênh bảo mật E2E Riki Cloud
        </span>
<span className="w-1 h-1 rounded-full bg-outline-variant"></span>
<span className="font-label-md text-label-md text-text-charcoal font-mono" id="live-clock">19:12:05 GMT+7</span>
</div>
</div>
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-16 bg-surface-card p-space-24 rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)]">
<div className="flex flex-col gap-space-8">
<div className="flex items-center gap-space-12 flex-wrap">
<h1 className="font-headline-lg text-headline-lg text-text-charcoal tracking-tight">Phòng Chuẩn bị Phiên Tư vấn Trực tuyến</h1>
<div className="flex items-center gap-space-8 px-space-12 py-1 rounded-full bg-secondary-tint shadow-sm">
<span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
<span className="font-label-xs text-label-xs text-primary uppercase tracking-wider">Bắt đầu sau 18 phút</span>
</div>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">
          Xem trước học bạ chẩn đoán Haru AI, thẩm định tài liệu giảng dạy số và xác lập biên bản hành động cá nhân hóa cho học viên.
        </p>
</div>
<div className="flex items-center gap-space-12 shrink-0">
<button className="h-10 px-space-16 rounded-lg bg-secondary-tint hover:bg-secondary-fixed transition-all duration-200 text-primary font-label-md text-label-md flex items-center gap-space-8 shadow-sm hover:shadow" id="av-test-btn">
<span className="material-symbols-outlined text-[20px]">tune</span>
<span>Kiểm tra Micro & Camera</span>
</button>
<button className="h-10 px-space-20 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-label-md text-label-md flex items-center gap-space-8 shadow-md hover:shadow-lg transition-all duration-200">
<span className="material-symbols-outlined text-[20px]">video_call</span>
<span>Vào phòng tư vấn ngay (Launch Room)</span>
</button>
</div>
</div>
</div>
<div className="grid grid-cols-12 gap-gutter">
<div className="col-span-12 lg:col-span-4 flex flex-col gap-space-24">
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20 relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary-tint/50 pointer-events-none blur-xl"></div>
<div className="flex items-start gap-space-16 relative">
<div className="relative shrink-0">
<img className="w-16 h-16 rounded-xl object-cover shadow-sm" data-alt="Chân dung học viên nam người Việt Nam độ tuổi 23, đeo kính cận hiện đại, nụ cười tự tin, mặc sơ mi thanh lịch trong thư viện ánh sáng tự nhiên dịu nhẹ phong cách Nhật Bản tối giản" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2V89OLooJZ5P2k328GNIALEo0vEfLOAkpOjNpfLlkYqGnuHhPauX3RdIGhGQjrM0YvDqe9-ZIMbFI341GlMEcYs8wbn3nGywmXYZi9lYuuq5vIlPq7VgtyhQd9Gp9dgZ51KMrNFtmnca_smc4K_jioQ4oHj73a_8pCaxb6ZYczUSH_eaMq8uqbmCSVoo-E6I0YqxY3Ww-z2L1HleeivJtWHYxtgBRCzYVBjmF2rN3E9s9jdTJuX2K" />
<span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-tertiary flex items-center justify-center text-on-primary text-[11px] shadow-sm font-label-xs">✓</span>
</div>
<div className="flex flex-col min-w-0 flex-1">
<div className="flex items-center justify-between gap-space-8">
<span className="font-headline-sm text-headline-sm text-text-charcoal truncate">Nguyễn Văn A</span>
<span className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-space-8 py-0.5 rounded-full">#88291</span>
</div>
<span className="font-body-sm text-body-sm text-primary font-semibold mt-0.5">Khóa N2 Cấp tốc (Jun-Dec)</span>
<div className="flex items-center gap-space-8 mt-space-8">
<div className="px-space-8 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-xs text-label-xs">
                Mục tiêu: N2 12/2024
              </div>
<div className="px-space-8 py-0.5 rounded-full bg-secondary-tint text-primary font-label-xs text-label-xs">
                Kỳ vọng: 130+
              </div>
</div>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-12 shadow-sm">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 text-text-charcoal font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
<span>Lịch hẹn hôm nay</span>
</div>
<span className="font-label-xs text-label-xs text-primary bg-secondary-fixed px-space-8 py-0.5 rounded-full">45 phút</span>
</div>
<div className="text-display-sm font-display-sm text-text-charcoal tracking-tight">19:30 - 20:15</div>
<div className="pt-space-8 flex items-center justify-between">
<div className="flex items-center gap-space-6 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[16px] text-primary">videocam</span>
<span>Zoom / Riki ID #832-192</span>
</div>
<button className="text-primary hover:text-primary-hover font-label-xs text-label-xs flex items-center gap-space-4 hover:underline" onClick="navigator.clipboard.writeText('https://meeting.riki.edu.vn/room/832-192')">
<span className="material-symbols-outlined text-[14px]">content_copy</span>
<span>Sao chép link</span>
</button>
</div>
</div>
<div className="flex flex-col gap-space-8">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs tracking-wider uppercase text-on-surface-variant">Quyền truy cập học bạ số</span>
<span className="font-label-xs text-label-xs text-tertiary bg-tertiary-fixed/30 px-space-8 py-0.5 rounded-full flex items-center gap-space-4">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              Đã ủy quyền
            </span>
</div>
<div className="flex items-center justify-between p-space-12 rounded-lg bg-surface-container-lowest shadow-sm">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-[20px] text-tertiary">verified_user</span>
<span className="font-body-sm text-body-sm text-text-charcoal">Thời hạn phân tích chi tiết</span>
</div>
<span className="font-label-md text-label-md text-primary font-mono">Còn hạn 23h 40p</span>
</div>
</div>
<div className="flex flex-col gap-space-8">
<div className="flex items-center gap-space-8 text-text-charcoal font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary">help_outline</span>
<span>Câu hỏi trọng tâm từ học viên</span>
</div>
<div className="p-space-16 rounded-xl bg-secondary-tint/60 text-text-charcoal font-body-md text-body-md leading-relaxed relative shadow-sm">
<span className="material-symbols-outlined absolute top-2 right-2 text-primary/20 text-[32px] pointer-events-none">format_quote</span>
<p className="relative z-10 italic">
              "Em đang gặp khó khăn trong việc phân bổ thời gian 105 phút cho phần Dokkai dài và hay phân vân giữa 2 đáp án cuối cùng. Thầy chia sẻ giúp em kỹ thuật định vị từ khóa và loại trừ nhanh ạ."
            </p>
</div>
</div>
<div className="flex flex-col gap-space-12 pt-space-8">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs tracking-wider uppercase text-on-surface-variant">Lịch sử tư vấn gần nhất</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">Tổng: 1 phiên</span>
</div>
<div className="p-space-12 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between">
<div className="flex flex-col gap-space-2">
<span className="font-label-md text-label-md text-text-charcoal">Phiên #1: Chẩn đoán lộ trình N2</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">14 ngày trước · Sensei Kenji</span>
</div>
<div className="flex items-center gap-space-4 px-space-8 py-1 rounded-full bg-surface-card shadow-sm">
<span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
<span className="font-label-xs text-label-xs text-text-charcoal font-bold">4.9</span>
</div>
</div>
</div>
</div>
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-16">
<div className="flex items-center justify-between">
<span className="font-headline-sm text-headline-sm text-text-charcoal">Thiết bị & Môi trường</span>
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
            Tối ưu
          </span>
</div>
<div className="space-y-space-12">
<div className="flex items-center justify-between p-space-8 rounded-lg bg-surface-container-low">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">mic</span>
<span>MacBook Pro Microphone</span>
</div>
<div className="flex items-center gap-space-2">
<span className="w-1 h-3 bg-tertiary rounded-full animate-pulse"></span>
<span className="w-1 h-4 bg-tertiary rounded-full animate-pulse"></span>
<span className="w-1 h-2 bg-tertiary rounded-full animate-pulse"></span>
</div>
</div>
<div className="flex items-center justify-between p-space-8 rounded-lg bg-surface-container-low">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">videocam</span>
<span>FaceTime HD Camera (1080p)</span>
</div>
<span className="font-label-xs text-label-xs text-tertiary font-medium">Sẵn sàng</span>
</div>
<div className="flex items-center justify-between p-space-8 rounded-lg bg-surface-container-low">
<div className="flex items-center gap-space-8 text-on-surface-variant font-body-sm text-body-sm">
<span className="material-symbols-outlined text-[18px] text-tertiary">speed</span>
<span>Băng thông mạng cố định</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal font-mono">142 Mbps (Ping 8ms)</span>
</div>
</div>
</div>
</div>
<div className="col-span-12 lg:col-span-8 flex flex-col gap-space-24">
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-12">
<div className="flex items-center gap-space-12">
<div className="w-10 h-10 rounded-xl bg-secondary-tint flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">analytics</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Báo cáo phân tích năng lực học viên trước phiên</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">Tổng hợp từ dữ liệu Mock-test ngày 15/10 và AI Engine Haru 4.2</p>
</div>
</div>
<div className="flex items-center gap-space-8 bg-surface-container px-space-12 py-space-8 rounded-xl self-start sm:self-auto">
<span className="font-body-sm text-body-sm text-on-surface-variant">Tổng điểm:</span>
<span className="font-headline-sm text-headline-sm text-text-charcoal font-bold">115</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 180</span>
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-12">
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<span>Từ vựng (Goi)</span>
<span className="font-mono">58%</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-text-charcoal">35</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 60</span>
</div>
<div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full" style={{ width: "58.3%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant">Mức ổn định</span>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<span>Ngữ pháp (Bunpo)</span>
<span className="font-mono">46%</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-text-charcoal">28</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 60</span>
</div>
<div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-secondary rounded-full" style={{ width: "46.6%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant">Cần củng cố liên từ</span>
</div>
<div className="p-space-16 rounded-xl bg-error-container/40 flex flex-col gap-space-8 relative overflow-hidden">
<div className="flex items-center justify-between text-error font-label-md text-label-md">
<span>Đọc hiểu (Dokkai)</span>
<span className="material-symbols-outlined text-[16px] text-error animate-bounce">warning</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-error font-bold">22</span>
<span className="font-body-sm text-body-sm text-error/80">/ 60</span>
</div>
<div className="w-full h-2 bg-error-container rounded-full overflow-hidden">
<div className="h-full bg-error rounded-full" style={{ width: "36.6%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-error font-bold tracking-wide uppercase">Báo động đỏ điểm liệt (&lt;19)</span>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-8">
<div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
<span>Nghe hiểu (Choukai)</span>
<span className="font-mono">50%</span>
</div>
<div className="flex items-baseline gap-space-4">
<span className="font-headline-lg text-headline-lg text-text-charcoal">30</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 60</span>
</div>
<div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full" style={{ width: "50%" }}></div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant">Đạt chuẩn sàn</span>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col gap-space-12">
<div className="flex items-center gap-space-8 text-text-charcoal font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
<span>3 Điểm nghẽn Dokkai chính do Haru AI phát hiện</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-12">
<div className="p-space-12 rounded-lg bg-surface-card flex flex-col gap-space-4 shadow-sm">
<div className="flex items-center gap-space-6 text-error font-label-xs text-label-xs">
<span className="w-2 h-2 rounded-full bg-error"></span>
<span>Điểm nghẽn #1 (Ngữ cảnh)</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Nhầm lẫn đại từ chỉ thị</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                Thường suy đoán sai đối tượng của đại từ <b>これ・それ</b> ở đoạn 3 văn bản dài, dẫn tới trả lời ngược 180 độ ý tác giả.
              </p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card flex flex-col gap-space-4 shadow-sm">
<div className="flex items-center gap-space-6 text-primary font-label-xs text-label-xs">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span>Điểm nghẽn #2 (Tốc độ)</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Tốc độ đọc chậm 140 chữ/phút</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                Chuẩn N2 cần 280-320 chữ/phút. Học viên dành quá nhiều thời gian dịch từng chữ thay vì nắm cấu trúc luận điểm tổng thể.
              </p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card flex flex-col gap-space-4 shadow-sm">
<div className="flex items-center gap-space-6 text-secondary font-label-xs text-label-xs">
<span className="w-2 h-2 rounded-full bg-secondary"></span>
<span>Điểm nghẽn #3 (Bẫy ngữ pháp)</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Bẫy liên từ nối phức tạp</span>
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                Rối loạn logic khi gặp các mẫu liên từ nhượng bộ <b>にしても・とはいえ</b> dẫn đến chọn nhầm phương án nhiễu.
              </p>
</div>
</div>
</div>
</div>
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-12">
<div className="flex items-center gap-space-12">
<div className="w-10 h-10 rounded-xl bg-secondary-tint flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">collections_bookmark</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Bộ giáo án gợi ý & Tài liệu đính kèm cho phiên này</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">Tài liệu đã kích hoạt quyền tương tác hai chiều trên màn hình chia sẻ</p>
</div>
</div>
<button className="h-9 px-space-12 rounded-lg bg-secondary-tint hover:bg-secondary-fixed text-primary font-label-md text-label-md flex items-center gap-space-6 transition-colors shadow-sm self-start sm:self-auto" id="add-material-btn">
<span className="material-symbols-outlined text-[18px]">add_circle</span>
<span>Thêm học liệu từ Thư viện Riki</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-16">
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-16 hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-12">
<div className="flex items-start justify-between">
<div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
</div>
<span className="font-label-xs text-label-xs bg-surface-card px-space-8 py-0.5 rounded-full text-on-surface-variant shadow-sm">12 Trang</span>
</div>
<div className="flex flex-col gap-space-4">
<span className="font-label-md text-label-md text-text-charcoal group-hover:text-primary transition-colors">Slide kỹ thuật Dokkai tốc biến N2</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Chuyên đề: 5 Bước quét lướt từ khóa và khoanh vùng câu chủ đề</span>
</div>
</div>
<div className="flex items-center justify-between pt-space-8">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
                Sẵn sàng chiếu
              </span>
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-16 hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-12">
<div className="flex items-start justify-between">
<div className="w-10 h-10 rounded-lg bg-secondary-tint flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-[22px]">assignment</span>
</div>
<span className="font-label-xs text-label-xs bg-surface-card px-space-8 py-0.5 rounded-full text-on-surface-variant shadow-sm">3 Đoạn văn</span>
</div>
<div className="flex flex-col gap-space-4">
<span className="font-label-md text-label-md text-text-charcoal group-hover:text-primary transition-colors">Bài tập mẫu 3 đoạn trường văn T7/2023</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Thực hành bóc tách luận điểm tác giả dưới áp lực 8 phút/đoạn</span>
</div>
</div>
<div className="flex items-center justify-between pt-space-8">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
                Sẵn sàng chiếu
              </span>
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
<div className="p-space-16 rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-16 hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-12">
<div className="flex items-start justify-between">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[22px]">timer</span>
</div>
<span className="font-label-xs text-label-xs bg-surface-card px-space-8 py-0.5 rounded-full text-on-surface-variant shadow-sm">Cheat-sheet</span>
</div>
<div className="flex flex-col gap-space-4">
<span className="font-label-md text-label-md text-text-charcoal group-hover:text-primary transition-colors">Bảng công thức quản lý 105 phút</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">Phân bổ chiến lược: Từ vựng (25p) - Ngữ pháp (20p) - Đọc hiểu (60p)</span>
</div>
</div>
<div className="flex items-center justify-between pt-space-8">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
                Sẵn sàng chiếu
              </span>
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
</div>
</div>
<div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(45,40,42,0.03),0_6px_16px_-4px_rgba(45,40,42,0.04)] p-space-24 flex flex-col gap-space-20">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-12">
<div className="w-10 h-10 rounded-xl bg-secondary-tint flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">edit_document</span>
</div>
<div>
<h2 className="font-headline-sm text-headline-sm text-text-charcoal">Khung soạn thảo Biên bản tư vấn & Lộ trình hành động (Action Plan)</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">Soạn thảo trực tiếp trong phiên hoặc duyệt trước khung gợi ý chuyên sâu từ AI</p>
</div>
</div>
<span className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-space-8 py-1 rounded-full">
            Tự động lưu nháp
          </span>
</div>
<div className="p-space-16 rounded-xl bg-secondary-tint/40 flex flex-col gap-space-12">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8 text-primary font-label-md text-label-md">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
<span>Gợi ý phác đồ 3 tuần từ Riki AI (Click để chèn vào ghi chú)</span>
</div>
<button className="font-label-xs text-label-xs text-primary hover:underline flex items-center gap-space-4" id="insert-plan-btn">
<span className="material-symbols-outlined text-[14px]">add_box</span>
<span>Chèn toàn bộ vào biên bản</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-12">
<div className="p-space-12 rounded-lg bg-surface-card shadow-sm flex flex-col gap-space-4">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs text-primary font-bold">TUẦN 1</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">21/10 - 27/10</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Luyện 5 bài trung văn</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">
                Tập trung định vị đại từ chỉ thị và gạch chân câu khẳng định tác giả.
              </p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card shadow-sm flex flex-col gap-space-4">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs text-primary font-bold">TUẦN 2</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">28/10 - 03/11</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Chinh phục 3 bài trường văn</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">
                Kỹ thuật skimming: Đọc lướt 2 phút, xử lý câu hỏi so sánh quan điểm.
              </p>
</div>
<div className="p-space-12 rounded-lg bg-surface-card shadow-sm flex flex-col gap-space-4">
<div className="flex items-center justify-between">
<span className="font-label-xs text-label-xs text-primary font-bold">TUẦN 3</span>
<span className="font-label-xs text-label-xs text-on-surface-variant">04/11 - 10/11</span>
</div>
<span className="font-label-md text-label-md text-text-charcoal">Thi thử trọn đề bấm giờ</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">
                Rèn phản xạ phân phối 105 phút đúng công thức chuẩn Riki Sensei.
              </p>
</div>
</div>
</div>
<div className="flex flex-col gap-space-8">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-text-charcoal">Ghi chú và Lời dặn trực tiếp từ Sensei</span>
<div className="flex items-center gap-space-4">
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" onClick="formatEditor('bold')" type="button">
<span className="material-symbols-outlined text-[18px]">format_bold</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" onClick="formatEditor('italic')" type="button">
<span className="material-symbols-outlined text-[18px]">format_italic</span>
</button>
<button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-text-charcoal" onClick="formatEditor('insertUnorderedList')" type="button">
<span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
</button>
</div>
</div>
<div className="w-full min-h-[140px] p-space-16 rounded-xl bg-surface-container-low text-text-charcoal font-body-md text-body-md leading-relaxed focus:outline-none focus:ring-2 focus:ring-focus-ring focus:bg-surface-card transition-all" contenteditable="true" id="sensei-notes">
• Nhận diện tâm lý: Học viên đang bị áp lực tâm lý sợ điểm liệt Dokkai (&lt;19đ). Cần động viên tinh thần trước khi vào bài.
• Hướng dẫn thao tác loại trừ 50/50: Luôn đối chiếu lại từ khóa cốt lõi với câu hỏi trước khi chốt đáp án phân vân.
• Giao bài tập về nhà ngày mai: 1 đề Dokkai tháng 12/2022 để kiểm chứng tốc độ cải thiện.</div>
</div>
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-16 pt-space-12">
<label className="flex items-center gap-space-12 cursor-pointer select-none">
<input checked className="w-4 h-4 rounded text-primary focus:ring-focus-ring accent-primary" id="auto-email-checkbox" type="checkbox" />
<span className="font-body-sm text-body-sm text-text-charcoal">
              Tự động gửi email biên bản & tài liệu cho học viên sau khi kết thúc ca tư vấn
            </span>
</label>
<div className="flex items-center gap-space-12 self-end sm:self-auto">
<span className="font-label-xs text-label-xs text-tertiary flex items-center gap-space-4" id="save-status">
<span className="material-symbols-outlined text-[16px]">cloud_done</span>
              Đã đồng bộ nháp
            </span>
<button className="h-10 px-space-16 rounded-lg bg-surface-container hover:bg-surface-container-high active:bg-surface-container-highest text-text-charcoal font-label-md text-label-md transition-colors flex items-center gap-space-8" id="save-draft-btn">
<span className="material-symbols-outlined text-[18px]">save</span>
<span>Lưu bản nháp ghi chú</span>
</button>
</div>
</div>
</div>
</div>
</div>
<div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200" id="device-modal">
<div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-xl p-space-24 flex flex-col gap-space-20 transform scale-95 transition-transform duration-200" id="modal-container">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-8">
<span className="material-symbols-outlined text-primary text-[24px]">tune</span>
<span className="font-headline-sm text-headline-sm text-text-charcoal">Kiểm tra Micro & Camera</span>
</div>
<button className="text-on-surface-variant hover:text-text-charcoal p-1 rounded-lg hover:bg-surface-container" id="close-modal-btn">
<span className="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
<div className="aspect-video w-full rounded-xl bg-surface-container-high relative overflow-hidden flex items-center justify-center">
<img className="w-full h-full object-cover" data-alt="Hình ảnh thử nghiệm webcam trực tuyến độ nét cao, góc quay chân dung của chuyên gia cố vấn Nhật Bản trong phòng làm việc ấm cúng" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV1C3Pokq16_aE7VZOeJXHjT4m_12FI4Laf7kjEid_n_0cHsp0IVrzZv3LHSM-JTMovYo2mymEibDG935uWW4mArmbFsSqrvDNGXQAzRdTzCup60YOeSoInxpPFDDzW-OSuOEgPGnX_V32YhEC_I7-vFSFtvms9yL4yP_mpIhf_q03ERxOwrcEAsVUtXM-0S0gBSDpP0hTCJPAOL1IyUoYfYOa1YJwOOFd__EMS_060EN2B9v2f037" />
<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-inverse-surface/70 backdrop-blur-md px-space-12 py-space-8 rounded-lg text-on-primary">
<div className="flex items-center gap-space-8">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
<span className="font-label-xs text-label-xs">1080p @ 60fps - Tốt</span>
</div>
<div className="flex items-center gap-space-4">
<span className="w-1 h-3 bg-tertiary rounded-full animate-bounce"></span>
<span className="w-1 h-5 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
<span className="w-1 h-4 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
</div>
</div>
</div>
<div className="flex flex-col gap-space-12">
<div className="flex flex-col gap-space-4">
<label className="font-label-xs text-label-xs uppercase text-on-surface-variant">Chọn Camera</label>
<select className="h-10 px-space-12 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-text-charcoal focus:outline-none focus:ring-2 focus:ring-focus-ring">
<option>FaceTime HD Camera (Tích hợp)</option>
<option>Logitech StreamCam 4K (USB-C)</option>
</select>
</div>
<div className="flex flex-col gap-space-4">
<label className="font-label-xs text-label-xs uppercase text-on-surface-variant">Chọn Microphone</label>
<select className="h-10 px-space-12 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-text-charcoal focus:outline-none focus:ring-2 focus:ring-focus-ring">
<option>MacBook Pro Microphone Array</option>
<option>Shure MV7 USB Podcast Mic</option>
</select>
</div>
</div>
<div className="flex justify-end gap-space-12 pt-space-8">
<button className="h-10 px-space-20 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-hover transition-colors" id="confirm-modal-btn">
          Xác nhận thiết bị đã sẵn sàng
        </button>
</div>
</div>
</div>
<div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-on-primary px-space-16 py-space-12 rounded-xl shadow-lg flex items-center gap-space-12 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none" id="toast-notify">
<span className="material-symbols-outlined text-[20px] text-tertiary">check_circle</span>
<span className="font-body-sm text-body-sm" id="toast-text">Đã lưu bản nháp thành công!</span>
</div>
</div>
</main></div>
    </div>
  
</ConsultShell>
);
}
