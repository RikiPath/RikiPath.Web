import { useEffect } from 'react';
import { CmsShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function CMSStudio() {
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
      // Simple interaction script for active sidebar state indicator
        document.addEventListener('DOMContentLoaded', () => {
          const activeLink = document.querySelector('a[data-path="tong-quan-cms"]');
          if (activeLink) {
            activeLink.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold', 'shadow-[0_4px_14px_rgba(171,40,72,0.2)]');
            activeLink.classList.remove('text-on-surface-variant');
          }
        });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <CmsShell pathname={pathname} breadcrumb="Tổng quan CMS">
<div className="bg-background font-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed min-h-screen" data-page="CMSStudio" data-shell-unified="1">

<div className="pl-0"><main className="w-full pt-0 px-gutter-desktop pb-space-3xl min-h-screen bg-background"><div className="flex flex-col w-full space-y-space-xl">
{/*  PAGE HEADER & ACTION TOOLBAR  */}
<section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
<div className="space-y-space-xxs max-w-3xl">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
<span className="material-symbols-outlined text-[14px] text-primary">spa</span>
          Hệ thống Quản lý Học liệu Sakura 2025
        </span>
<span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
          Trạng thái: Hoạt động toàn phần
        </span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-space-xs">
        Tổng quan Quản lý Nội dung & Đào tạo
      </h1>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        Bảng điều khiển trung tâm theo dõi tiến độ sản xuất học liệu JLPT N5–N1, thẩm định học thuật, năng lực kiểm toán Haru AI và phân phối bài giảng số.
      </p>
</div>
{/*  Quick Action Bar  */}
<div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center">
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-all duration-200 shadow-sm font-label-lg text-label-lg group">
<span className="material-symbols-outlined text-[18px] text-secondary group-hover:-translate-y-0.5 transition-transform">cloud_download</span>
        Báo cáo (.PDF/.CSV)
      </button>
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container-low text-primary hover:bg-secondary-fixed transition-all duration-200 shadow-sm font-label-lg text-label-lg group">
<span className="material-symbols-outlined text-[18px] text-primary group-hover:rotate-12 transition-transform">upload_file</span>
        Nhập liệu nhanh (Excel)
      </button>
<button className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-md hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 font-label-lg text-label-lg">
<span className="material-symbols-outlined text-[20px]">add_circle</span>
        + Tạo bài học mới
      </button>
</div>
</section>
{/*  TOP KPI METRIC CARDS (4 CARDS)  */}
<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
{/*  Metric 1: Total Lessons  */}
<div className="relative overflow-hidden p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
<div className="flex items-start justify-between">
<div className="space-y-space-xxs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Tổng kho học liệu JLPT</span>
<div className="flex items-baseline gap-space-xs mt-1">
<span className="font-headline-lg text-headline-lg text-on-surface tracking-tight">12,450</span>
<span className="font-label-sm text-label-sm text-secondary font-medium">mục</span>
</div>
</div>
<div className="w-11 h-11 rounded-xl bg-surface-container-low text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[22px]">inventory_2</span>
</div>
</div>
<div className="mt-space-md pt-space-sm flex items-center justify-between text-body-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg px-space-lg py-space-xs">
<span className="inline-flex items-center gap-1 text-tertiary font-label-sm text-label-sm font-medium">
<span className="material-symbols-outlined text-[14px]">arrow_upward</span> +342 bài tháng này
        </span>
<span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Xuất bản: 91.4%</span>
</div>
</div>
{/*  Metric 2: Academic Review Queue  */}
<div className="relative overflow-hidden p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
<div className="flex items-start justify-between">
<div className="space-y-space-xxs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Hàng đợi kiểm duyệt</span>
<div className="flex items-baseline gap-space-xs mt-1">
<span className="font-headline-lg text-headline-lg text-primary tracking-tight">12</span>
<span className="font-label-sm text-label-sm text-secondary font-medium">nhiệm vụ</span>
</div>
</div>
<div className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[22px]">rule_folder</span>
</div>
</div>
<div className="mt-space-md pt-space-sm flex items-center justify-between text-body-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg px-space-lg py-space-xs">
<span className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">schedule</span> 3 bài khẩn (&lt; 4h)
        </span>
<span className="font-label-sm text-label-sm text-on-surface-variant font-medium">SLA: 98.2%</span>
</div>
</div>
{/*  Metric 3: Haru AI Accuracy  */}
<div className="relative overflow-hidden p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
<div className="flex items-start justify-between">
<div className="space-y-space-xxs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Hiệu suất Riki Haru AI</span>
<div className="flex items-baseline gap-space-xs mt-1">
<span className="font-headline-lg text-headline-lg text-on-surface tracking-tight">99.4%</span>
<span className="font-label-sm text-label-sm text-tertiary font-semibold">Chính xác</span>
</div>
</div>
<div className="w-11 h-11 rounded-xl bg-surface-container-low text-tertiary flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[22px]">smart_toy</span>
</div>
</div>
<div className="mt-space-md pt-space-sm flex items-center justify-between text-body-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg px-space-lg py-space-xs">
<span className="text-on-surface font-label-sm text-label-sm">5,820 lượt quét / tuần</span>
<span className="text-tertiary font-label-sm text-label-sm font-semibold">Tiết kiệm 140h</span>
</div>
</div>
{/*  Metric 4: Student Engagement  */}
<div className="relative overflow-hidden p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
<div className="flex items-start justify-between">
<div className="space-y-space-xxs">
<span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Tương tác bài giảng mới</span>
<div className="flex items-baseline gap-space-xs mt-1">
<span className="font-headline-lg text-headline-lg text-on-surface tracking-tight">88.6%</span>
<span className="font-label-sm text-label-sm text-tertiary font-medium">Hoàn thành</span>
</div>
</div>
<div className="w-11 h-11 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[22px]">star</span>
</div>
</div>
<div className="mt-space-md pt-space-sm flex items-center justify-between text-body-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg px-space-lg py-space-xs">
<span className="text-tertiary font-label-sm text-label-sm font-semibold">+4.2% so quý trước</span>
<span className="text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-0.5">
          4.9/5.0 <span className="material-symbols-outlined text-[13px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
</span>
</div>
</div>
</section>
{/*  MAIN DUAL-COLUMN LAYOUT  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
{/*  LEFT COLUMN (68% - 8 cols on desktop)  */}
<div className="lg:col-span-8 flex flex-col space-y-space-lg">
{/*  SECTION A: JLPT CURRICULUM PROGRESS MATRIX  */}
<div className="p-space-xl rounded-xl bg-surface-container-lowest shadow-sm space-y-space-lg">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<div className="space-y-space-xxs">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Tiến độ sản xuất học liệu theo cấp độ JLPT</h2>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Chiến dịch hoàn thiện kho số hóa học liệu chuẩn Nhật ngữ 2025</p>
</div>
<div className="flex items-center gap-space-xs text-label-sm font-label-sm">
<span className="flex items-center gap-1 text-on-surface"><span className="w-2 h-2 rounded-full bg-primary"></span> Đã xuất bản</span>
<span className="flex items-center gap-1 text-outline ml-2"><span className="w-2 h-2 rounded-full bg-surface-container-highest"></span> Còn lại</span>
</div>
</div>
{/*  Levels List  */}
<div className="space-y-space-md">
{/*  Level N3: Campaign Highlight  */}
<div className="p-space-md rounded-xl bg-surface-container-low relative overflow-hidden transition-all duration-200 hover:shadow-sm">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-sm">
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm font-bold min-w-12 text-center shadow-sm">N3</span>
<div>
<div className="flex items-center gap-space-xs">
<span className="font-title-md text-title-md text-on-surface">JLPT N3 — Chiến dịch Hoa Anh Đào</span>
<span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm font-semibold">Ưu tiên số 1</span>
</div>
<p className="font-body-sm text-body-sm text-outline">Đang tinh chỉnh 120 video Dokkai 4K và bộ đề thi phân loại mới</p>
</div>
</div>
<div className="flex items-baseline gap-space-xs md:text-right">
<span className="font-headline-sm text-headline-sm text-primary font-bold">92%</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(1,240 / 1,350 bài)</span>
</div>
</div>
{/*  Custom Progress Bar  */}
<div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden">
<div className="h-full rounded-full bg-gradient-to-r from-primary via-primary-container to-secondary-container transition-all duration-500" style={{ width: "92%" }}></div>
</div>
<div className="flex items-center justify-between mt-space-xs text-label-sm font-label-sm text-on-surface-variant">
<span>Đang biên soạn: 78 bài</span>
<span>Đang chờ thẩm định: 32 bài</span>
</div>
</div>
{/*  Level N2  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low/60 transition-all duration-200">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-sm">
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-headline-sm font-bold min-w-12 text-center">N2</span>
<div>
<span className="font-title-md text-title-md text-on-surface">JLPT N2 — Trung cao cấp thực chiến</span>
<p className="font-body-sm text-body-sm text-outline">Bổ sung 45 chủ đề ngữ pháp phân biệt sắc thái & Đọc hiểu thương mại</p>
</div>
</div>
<div className="flex items-baseline gap-space-xs md:text-right">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">78%</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(890 / 1,140 bài)</span>
</div>
</div>
<div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
<div className="h-full rounded-full bg-primary/80 transition-all duration-500" style={{ width: "78%" }}></div>
</div>
<div className="flex items-center justify-between mt-space-xs text-label-sm font-label-sm text-on-surface-variant">
<span>Đang biên soạn: 140 bài</span>
<span>Đang chờ thẩm định: 11 bài</span>
</div>
</div>
{/*  Level N1  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low/60 transition-all duration-200">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-sm">
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-headline-sm font-bold min-w-12 text-center">N1</span>
<div>
<span className="font-title-md text-title-md text-on-surface">JLPT N1 — Thượng cấp Học thuật & Báo chí</span>
<p className="font-body-sm text-body-sm text-outline">Đang số hóa 150 mẫu câu Keigo chuyên sâu và văn bản phân tích xã hội</p>
</div>
</div>
<div className="flex items-baseline gap-space-xs md:text-right">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold">64%</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(620 / 970 bài)</span>
</div>
</div>
<div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
<div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: "64%" }}></div>
</div>
<div className="flex items-center justify-between mt-space-xs text-label-sm font-label-sm text-on-surface-variant">
<span>Đang biên soạn: 210 bài</span>
<span>Đang chờ thẩm định: 140 bài</span>
</div>
</div>
{/*  Level N4 & N5 Consolidated  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low/60 transition-all duration-200">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-sm">
<div className="flex items-center gap-space-sm">
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-tertiary font-headline-sm text-headline-sm font-bold min-w-12 text-center">N4-5</span>
<div>
<div className="flex items-center gap-space-xs">
<span className="font-title-md text-title-md text-on-surface">JLPT N4 & N5 — Nền tảng Nhập môn Sơ cấp</span>
<span className="px-2 py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm font-semibold">Đã chuẩn hóa 100%</span>
</div>
<p className="font-body-sm text-body-sm text-outline">Đồng bộ đầy đủ Minna no Nihongo I-II, Hán tự hình ảnh và hội thoại anime</p>
</div>
</div>
<div className="flex items-baseline gap-space-xs md:text-right">
<span className="font-headline-sm text-headline-sm text-tertiary font-bold">98%</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">(3,850 / 3,920 bài)</span>
</div>
</div>
<div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
<div className="h-full rounded-full bg-tertiary transition-all duration-500" style={{ width: "98%" }}></div>
</div>
<div className="flex items-center justify-between mt-space-xs text-label-sm font-label-sm text-on-surface-variant">
<span>Bảo trì & cập nhật audio: 70 bài</span>
<span className="text-tertiary font-medium">Sẵn sàng học viên</span>
</div>
</div>
</div>
</div>
{/*  SECTION B: LIVE CONTENT ACTIVITY & APPROVAL QUEUE  */}
<div className="p-space-xl rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<div>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Hàng đợi kiểm duyệt & Cập nhật gần nhất</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">Theo dõi thời gian thực quy trình thẩm định bài giảng của Sensei và AI</p>
</div>
{/*  Filter Tabs  */}
<div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low">
<button className="px-space-sm py-1 rounded-lg bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold shadow-xs">
              Tất cả (28)
            </button>
<button className="px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm">
              Cần duyệt gấp (12)
            </button>
<button className="px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm">
              Mới xuất bản (8)
            </button>
<button className="px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm">
              Bản nháp (8)
            </button>
</div>
</div>
{/*  Activity Table List  */}
<div className="space-y-space-xs">
{/*  Item 1: Grammar N3  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low/50 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex items-start gap-space-sm">
<div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[20px]">menu_book</span>
</div>
<div className="space-y-0.5">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">Ngữ pháp N3</span>
<span className="font-title-md text-title-md text-on-surface font-semibold">Mẫu câu: 〜わけにはいかない</span>
</div>
<div className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">account_circle</span> Mayumi Sensei</span>
<span className="text-outline">•</span>
<span>18 phút video 4K + 15 quiz tương tác</span>
<span className="text-outline">•</span>
<span className="text-tertiary flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">verified</span> 100% Pitch Correct</span>
</div>
</div>
</div>
<div className="flex items-center gap-space-md justify-between md:justify-end shrink-0">
<span className="px-3 py-1 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm font-semibold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Đã xuất bản
              </span>
<div className="flex items-center gap-space-xxs">
<button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="Chỉnh sửa">
<span className="material-symbols-outlined text-[18px]">edit</span>
</button>
<button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="Xem chi tiết">
<span className="material-symbols-outlined text-[18px]">visibility</span>
</button>
</div>
</div>
</div>
{/*  Item 2: Kanji N3  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low/50 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex items-start gap-space-sm">
<div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0 font-bold text-[18px]">
                咲
              </div>
<div className="space-y-0.5">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm font-semibold">Hán tự N3</span>
<span className="font-title-md text-title-md text-on-surface font-semibold">Chữ 咲 (Tiếu - Nở hoa, Tiếu đàm) & 9 nét bút</span>
</div>
<div className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">account_circle</span> BTV Đặng Hoàng Minh</span>
<span className="text-outline">•</span>
<span>Bộ thủ: Khẩu (口) | 6 từ vựng phái sinh</span>
<span className="text-outline">•</span>
<span>Stroke-order SVG hoàn tất</span>
</div>
</div>
</div>
<div className="flex items-center gap-space-md justify-between md:justify-end shrink-0">
<span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span> Đang thẩm định AI
              </span>
<button className="px-space-sm py-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-on-primary font-label-sm text-label-sm font-semibold transition-all">
                Thẩm định ngay
              </button>
</div>
</div>
{/*  Item 3: Mock Test N3-EX-005  */}
<div className="p-space-md rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex items-start gap-space-sm">
<div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[20px]">assignment</span>
</div>
<div className="space-y-0.5">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">Đề thi Mô phỏng</span>
<span className="font-title-md text-title-md text-on-surface font-semibold">JLPT N3 Đột Phá Sakura #N3-EX-005</span>
</div>
<div className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">group</span> Hội đồng khảo thí Riki</span>
<span className="text-outline">•</span>
<span>Quy mô: 102 câu / 140 phút chuẩn đề thật</span>
<span className="text-outline">•</span>
<span className="text-primary font-medium">Hạn duyệt: 17:00 hôm nay</span>
</div>
</div>
</div>
<div className="flex items-center gap-space-md justify-between md:justify-end shrink-0">
<span className="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-sm">
<span className="material-symbols-outlined text-[13px]">priority_high</span> Chờ phê duyệt
              </span>
<button className="px-space-sm py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-label-sm text-label-sm font-semibold transition-all shadow-xs">
                Mở phòng duyệt
              </button>
</div>
</div>
{/*  Item 4: Business Keigo Video N2  */}
<div className="p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low/50 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div className="flex items-start gap-space-sm">
<div className="w-10 h-10 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[20px]">smart_display</span>
</div>
<div className="space-y-0.5">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">Video Bài giảng N2</span>
<span className="font-title-md text-title-md text-on-surface font-semibold">Kính ngữ Keigo thương mại & Email doanh nghiệp</span>
</div>
<div className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">account_circle</span> Kenji Sensei</span>
<span className="text-outline">•</span>
<span>Video 4K 60fps | 42 phút | Âm thanh Stereo Hi-Res</span>
<span className="text-outline">•</span>
<span>Đã khớp 1,120 dòng Subtitles song ngữ</span>
</div>
</div>
</div>
<div className="flex items-center gap-space-md justify-between md:justify-end shrink-0">
<span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">
                Bản nháp v2.1
              </span>
<button className="px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm font-medium transition-all">
                Tiếp tục dựng
              </button>
</div>
</div>
</div>
{/*  Footer pagination / View All  */}
<div className="pt-space-xs flex items-center justify-between">
<span className="font-label-sm text-label-sm text-outline">Hiển thị 4 trong 28 mục cần xử lý</span>
<a className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline" href="#">
            Xem toàn bộ hàng đợi kiểm duyệt
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
</a>
</div>
</div>
</div>
{/*  RIGHT COLUMN (32% - 4 cols on desktop)  */}
<div className="lg:col-span-4 flex flex-col space-y-space-lg">
{/*  SECTION C: SYSTEM & AI ENGINE HEALTH  */}
<div className="p-space-xl rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[22px]">memory</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">Hạ tầng & AI Engine</h3>
</div>
<span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(54,104,0,0.6)] animate-pulse"></span>
</div>
<div className="space-y-space-sm">
{/*  Haru AI Validator  */}
<div className="p-space-sm rounded-xl bg-surface-container-low space-y-space-xxs">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                Haru Engine v2.4 (Sakura)
              </span>
<span className="font-label-sm text-label-sm text-tertiary font-bold">100% Ổn định</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
              Kiểm tra ngữ cảnh tự động, tạo Furigana tự nhiên, đồng bộ phụ đề SRT và phát hiện sắc thái kính ngữ.
            </p>
</div>
{/*  Sakura CDN Edge  */}
<div className="p-space-sm rounded-xl bg-surface-container-low space-y-space-xxs">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-secondary">cloud_done</span>
                Sakura Edge Tokyo & VN
              </span>
<span className="font-label-sm text-label-sm text-outline font-medium">TTFB ~120ms</span>
</div>
<div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant pt-1">
<span>Băng thông: <strong className="text-on-surface">18.4 TB/tháng</strong></span>
<span className="text-tertiary">Tiết kiệm 40% (H.265)</span>
</div>
</div>
{/*  Studio Hi-Res Audio System  */}
<div className="p-space-sm rounded-xl bg-surface-container-low space-y-space-xxs">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-tertiary">graphic_eq</span>
                NHK Choukai Standard
              </span>
<span className="font-label-sm text-label-sm text-tertiary font-semibold">24-bit/48kHz</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
              100% file audio đề thi nghe đạt chuẩn phòng thu truyền hình Nhật Bản.
            </p>
</div>
</div>
</div>
{/*  SECTION D: ACTIVE SENSEI & EDITORS  */}
<div className="p-space-xl rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-secondary text-[22px]">group</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">Đội ngũ Sensei & BTV</h3>
</div>
<span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">4 Online</span>
</div>
{/*  Staff List  */}
<div className="space-y-space-sm">
{/*  Member 1  */}
<div className="flex items-center justify-between p-space-xs rounded-xl hover:bg-surface-container-low transition-colors">
<div className="flex items-center gap-space-sm">
<div className="relative">
<div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-md">
                  MN
                </div>
<span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container-lowest"></span>
</div>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg font-semibold text-on-surface leading-tight">Mayumi Nakamura</span>
<span className="font-label-sm text-label-sm text-outline">Sensei Master Tokyo • Duyệt N3 #882</span>
</div>
</div>
<span className="font-label-sm text-label-sm text-tertiary font-medium">Vừa xong</span>
</div>
{/*  Member 2  */}
<div className="flex items-center justify-between p-space-xs rounded-xl hover:bg-surface-container-low transition-colors">
<div className="flex items-center gap-space-sm">
<div className="relative">
<div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-label-md">
                  KY
                </div>
<span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container-lowest"></span>
</div>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg font-semibold text-on-surface leading-tight">Kenji Yamada</span>
<span className="font-label-sm text-label-sm text-outline">Trưởng khoa Đào tạo • Đề #EX-005</span>
</div>
</div>
<span className="font-label-sm text-label-sm text-outline">4 phút</span>
</div>
{/*  Member 3  */}
<div className="flex items-center justify-between p-space-xs rounded-xl hover:bg-surface-container-low transition-colors">
<div className="flex items-center gap-space-sm">
<div className="relative">
<div className="w-9 h-9 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-label-md">
                  HM
                </div>
<span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container-lowest"></span>
</div>
<div className="flex flex-col">
<span className="font-label-lg text-label-lg font-semibold text-on-surface leading-tight">Hoàng Minh</span>
<span className="font-label-sm text-label-sm text-outline">BTV Media • Render video 4K</span>
</div>
</div>
<span className="font-label-sm text-label-sm text-outline">12 phút</span>
</div>
</div>
{/*  Activity Log Timeline  */}
<div className="pt-space-xs space-y-space-xs">
<span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Nhật ký xuất bản gần nhất</span>
<div className="space-y-space-xxs text-body-sm text-on-surface-variant font-body-sm">
<div className="flex items-start gap-space-xs py-1">
<span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
<span className="line-clamp-1"><strong className="text-on-surface">MN</strong> duyệt Ngữ pháp N3: <code className="text-primary font-mono">〜にしては</code></span>
</div>
<div className="flex items-start gap-space-xs py-1">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0"></span>
<span className="line-clamp-1"><strong className="text-on-surface">Haru AI</strong> tự sinh 40 câu hỏi trắc nghiệm Kanji</span>
</div>
<div className="flex items-start gap-space-xs py-1">
<span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0"></span>
<span className="line-clamp-1"><strong className="text-on-surface">KY</strong> xuất bản đề thi thử JLPT N2 #EX-002</span>
</div>
</div>
</div>
</div>
{/*  SECTION E: QUICK ACTIONS GRID (SHORTCUT TILES)  */}
<div className="p-space-xl rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md">
<h3 className="font-headline-sm text-headline-sm text-on-surface">Tác vụ Biên tập Nhanh</h3>
<div className="grid grid-cols-2 gap-space-sm">
{/*  Action 1  */}
<button className="p-space-md rounded-xl bg-surface-container-low hover:bg-secondary-container/40 text-left transition-all duration-200 group flex flex-col justify-between h-28">
<div className="w-8 h-8 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[18px]">post_add</span>
</div>
<div>
<span className="font-label-md text-label-md font-semibold text-on-surface block">Soạn Ngữ pháp</span>
<span className="font-label-sm text-label-sm text-outline">Tạo mẫu câu mới</span>
</div>
</button>
{/*  Action 2  */}
<button className="p-space-md rounded-xl bg-surface-container-low hover:bg-secondary-container/40 text-left transition-all duration-200 group flex flex-col justify-between h-28">
<div className="w-8 h-8 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[18px]">draw</span>
</div>
<div>
<span className="font-label-md text-label-md font-semibold text-on-surface block">Thêm Hán tự</span>
<span className="font-label-sm text-label-sm text-outline">Kanji & Bộ thủ</span>
</div>
</button>
{/*  Action 3  */}
<button className="p-space-md rounded-xl bg-surface-container-low hover:bg-secondary-container/40 text-left transition-all duration-200 group flex flex-col justify-between h-28">
<div className="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[18px]">timer</span>
</div>
<div>
<span className="font-label-md text-label-md font-semibold text-on-surface block">Tạo Đề thi thử</span>
<span className="font-label-sm text-label-sm text-outline">JLPT Mock Exam</span>
</div>
</button>
{/*  Action 4  */}
<button className="p-space-md rounded-xl bg-surface-container-low hover:bg-secondary-container/40 text-left transition-all duration-200 group flex flex-col justify-between h-28">
<div className="w-8 h-8 rounded-lg bg-surface-container-lowest text-tertiary flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[18px]">quiz</span>
</div>
<div>
<span className="font-label-md text-label-md font-semibold text-on-surface block">Ngân hàng câu hỏi</span>
<span className="font-label-sm text-label-sm text-outline">Kho đề 10,000+ item</span>
</div>
</button>
</div>
</div>
</div>
</div>
</div>
</main></div>
    </div>
  
</CmsShell>
);
}
