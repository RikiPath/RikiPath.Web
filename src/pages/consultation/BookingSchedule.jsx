import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
export default function BookingSchedule() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Đặt lịch">
<div className="bg-background font-body-md text-on-surface min-h-screen" data-page="BookingSchedule" data-shell-unified="1">

<div className="pl-0"><main className="relative pt-0 bg-background min-h-screen px-space-lg py-space-lg"><div className="grid grid-cols-12 gap-gutter-desktop"><div className="flex flex-col w-full col-span-12 gap-space-xl">
{/*  Top Stepper Header Card  */}
<div className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
<div className="flex flex-col gap-space-2xs">
<div className="flex items-center gap-space-xs">
<span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider">Tư vấn trực tuyến</span>
<span className="text-tertiary font-label-sm text-label-sm">• 45 phút / buổi</span>
</div>
<h1 className="font-headline-xl text-headline-xl text-on-surface">Đặt lịch tư vấn Video 1-on-1</h1>
<p className="font-body-md text-body-md text-tertiary">Chọn chuyên gia học thuật và khung thời gian phù hợp với lịch trình của bạn</p>
</div>
{/*  Stepper Indicator  */}
<div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-xl">
<div className="flex items-center gap-space-2xs">
<span className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[14px]">check</span>
</span>
<span className="font-label-md text-label-md text-on-surface line-through decoration-tertiary/40 text-tertiary">1. Chuyên gia</span>
</div>
<span className="w-4 h-[1px] bg-outline-variant"></span>
<div className="flex items-center gap-space-2xs">
<span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm">2</span>
<span className="font-label-lg text-label-lg text-primary font-semibold">2. Ngày & Giờ</span>
</div>
<span className="w-4 h-[1px] bg-outline-variant"></span>
<div className="flex items-center gap-space-2xs opacity-50">
<span className="w-6 h-6 rounded-full bg-surface-container-highest text-tertiary flex items-center justify-center font-label-sm text-label-sm">3</span>
<span className="font-label-md text-label-md text-tertiary">3. Xác nhận</span>
</div>
</div>
</div>
{/*  Main 12-column Grid  */}
<div className="grid grid-cols-12 gap-gutter-desktop items-start">
{/*  Left Area (8 Columns)  */}
<div className="col-span-12 lg:col-span-8 flex flex-col gap-space-xl">
{/*  Step 1: Chuyên gia đề xuất  */}
<section className="flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Chuyên gia giảng dạy</h2>
</div>
<button className="font-label-md text-label-md text-primary hover:underline flex items-center gap-0.5">{"Xem tất cả giảng viên\n            "}<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
{/*  Sensei Sato (Selected)  */}
<div className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm ring-2 ring-primary flex flex-col justify-between cursor-pointer transition-all hover:shadow-md">
<div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-[16px]">check</span>
</div>
<div>
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high relative flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="Portrait of Sensei Sato, a professional Japanese male academic consultant in a tailored navy blazer against a minimalist light wooden bookshelf background, warm soft lighting, confident and friendly expression, authentic Tokyo educator atmosphere" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTNlsT560FGGRlIpq83VBs-yj1Eia1sGIQ69IzlQHqz77Ptw66d1Rt_dK3OANRcSLRAz5dbWet_txwwgaXH9uZnXzBxKfJO-SOP95fehjUWx5wxeHRYDJrZ_SQ7XzTZa4Rf5s0qfZR8ZQoS5kJuQHQi4j1L9qVewkap-T5xn39zaKWEaa4Q_UcyMU3o2px8QtE59KBh5mMDAqsuxzMgH7hUbUzgMqkiDCIgHKYwEGziGNsdZSa-oSy" />
</div>
<div className="min-w-0 flex-1">
<h3 className="font-label-lg text-label-lg text-on-surface truncate">Sensei Sato</h3>
<span className="font-label-sm text-label-sm text-primary bg-secondary-container px-1.5 py-0.5 rounded-full font-semibold inline-block">N1 Master</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-tertiary mb-space-xs line-clamp-2">8 năm kinh nghiệm đào tạo cấp tốc & phản biện Dokkai chuyên sâu.</p>
</div>
<div className="pt-space-xs mt-space-xs border-t border-outline-variant/30 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-tertiary">translate</span>{" JP / VN\n              "}</span>
<span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-0.5">
<span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>{" 4.98 (320)\n              "}</span>
</div>
</div>
{/*  Sensei Yuki  */}
<div className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm ring-1 ring-outline-variant/50 flex flex-col justify-between cursor-pointer transition-all hover:ring-primary/40 hover:shadow-md">
<div>
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high relative flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="Portrait of Sensei Yuki, an experienced Japanese female language instructor smiling warmly wearing an elegant beige knit sweater in a cozy sunlit cafe in Kyoto, natural soft lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA02CEJxpFkVwjznK0W-9Ih1CT_M9OtXIig_q01FL81GgTphzuTHtRguW-aO6T8jjy-52iQjJpT8VFqY-GslYbrssL7f5ORBCgaG24UlHItP1AS85i71F7zuRwbNAQPuxC3C6-RI0a4bRnDcGxAn-upazGkF0B31At8-V5ENM-YlmLYFFFEKPMKKlEqqpwBrOQ8H8zlfgsbiRqWGIn8IgJQXDGam0nFus4i63u_9ccpZfOH8Y4UPFg0" />
</div>
<div className="min-w-0 flex-1">
<h3 className="font-label-lg text-label-lg text-on-surface truncate">Sensei Yuki</h3>
<span className="font-label-sm text-label-sm text-secondary bg-surface-container px-1.5 py-0.5 rounded-full font-medium inline-block">N2/N1 Expert</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-tertiary mb-space-xs line-clamp-2">Chuyên gia phản xạ Kaiwa thương mại và phỏng vấn doanh nghiệp Nhật.</p>
</div>
<div className="pt-space-xs mt-space-xs border-t border-outline-variant/30 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-tertiary">translate</span>{" Song ngữ\n              "}</span>
<span className="font-label-sm text-label-sm text-tertiary flex items-center gap-0.5">
<span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>{" 4.92 (184)\n              "}</span>
</div>
</div>
{/*  Sensei Mai  */}
<div className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm ring-1 ring-outline-variant/50 flex flex-col justify-between cursor-pointer transition-all hover:ring-primary/40 hover:shadow-md">
<div>
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high relative flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="Professional studio portrait of Sensei Mai, Vietnamese master graduate of Tokyo Gakugei University, wearing a modern professional collared shirt, clean bright background, pleasant academic tutor persona" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9JDqV4ioouBvz3aR8NXMdOwXar_3pYd1heZWBIDbDqSZa_H9c1_g9osg82DUdWYIeqDtRTdQis-80HbME5cpBHd4GKieMVwL-RDKX3vFMhAU-F2XbrjfHxPV-zouRUaaMIXRO7tGNyW0t552mCpdjUfZ4oMyA31YHoGtC0NrddC0M0ogJp8M0z8fa9wuFAc3andiFPGmdGkcqsZsXh4Jl5eMINkXNHqglZB-_Rm_AABR9xrXV-LNX" />
</div>
<div className="min-w-0 flex-1">
<h3 className="font-label-lg text-label-lg text-on-surface truncate">Sensei Mai</h3>
<span className="font-label-sm text-label-sm text-secondary bg-surface-container px-1.5 py-0.5 rounded-full font-medium inline-block">N2 Sư phạm</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-tertiary mb-space-xs line-clamp-2">Phương pháp tư duy logic Ngữ pháp N2 & kỹ năng đọc lướt giải Dokkai.</p>
</div>
<div className="pt-space-xs mt-space-xs border-t border-outline-variant/30 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-tertiary">translate</span>{" Tiếng Việt\n              "}</span>
<span className="font-label-sm text-label-sm text-tertiary flex items-center gap-0.5">
<span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>{" 4.88 (210)\n              "}</span>
</div>
</div>
</div>
</section>
{/*  Step 2: Lịch trống thời gian thực  */}
<section className="flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Khung giờ rảnh theo thời gian thực</h2>
</div>
<div className="flex items-center gap-space-xs text-tertiary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">schedule</span>{" Múi giờ: GMT+7 (Hà Nội, Băng Cốc)\n          "}</div>
</div>
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm grid grid-cols-1 md:grid-cols-12 gap-space-lg">
{/*  Calendar View (7 cols)  */}
<div className="md:col-span-7 flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<span className="font-label-lg text-label-lg text-on-surface font-semibold">Tháng 10 / 2024</span>
<div className="flex items-center gap-1">
<button aria-label="Tháng trước" className="p-1 rounded-lg text-tertiary hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined text-[20px]">chevron_left</span>
</button>
<button aria-label="Tháng sau" className="p-1 rounded-lg text-tertiary hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined text-[20px]">chevron_right</span>
</button>
</div>
</div>
{/*  Calendar Grid  */}
<div className="grid grid-cols-7 gap-1 text-center font-label-sm text-label-sm">
<span className="py-1 text-tertiary">T2</span>
<span className="py-1 text-tertiary">T3</span>
<span className="py-1 text-tertiary">T4</span>
<span className="py-1 text-tertiary font-semibold text-primary">T5</span>
<span className="py-1 text-tertiary">T6</span>
<span className="py-1 text-tertiary">T7</span>
<span className="py-1 text-tertiary text-outline">CN</span>
{/*  Week 1  */}
<span className="p-2 text-outline/40">29</span>
<span className="p-2 text-outline/40">30</span>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">1</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">2</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">3</button>
{/*  Selected Date 4 Oct  */}
<button className="p-2 rounded-xl bg-primary text-on-primary font-bold shadow-sm relative">{"4\n                "}<span className="w-1 h-1 rounded-full bg-secondary-fixed mx-auto block mt-0.5"></span>
</button>
<button className="p-2 rounded-xl text-outline hover:bg-surface-container transition-colors">5</button>
{/*  Week 2  */}
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">6</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">7</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">8</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">9</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">10</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">11</button>
<button className="p-2 rounded-xl text-outline hover:bg-surface-container transition-colors">12</button>
{/*  Week 3  */}
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">13</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">14</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">15</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">16</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">17</button>
<button className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface">18</button>
<button className="p-2 rounded-xl text-outline hover:bg-surface-container transition-colors">19</button>
</div>
{/*  Legend  */}
<div className="flex items-center gap-space-md pt-space-xs text-tertiary font-label-sm text-label-sm border-t border-outline-variant/30">
<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Đang chọn</span>
<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-surface-container-high"></span> Có lịch trống</span>
<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-outline-variant/40"></span> Đã kín lịch</span>
</div>
</div>
{/*  Time Slot Selection (5 cols)  */}
<div className="md:col-span-5 flex flex-col gap-space-sm pl-0 md:pl-space-md md:border-l border-outline-variant/40">
<div className="flex items-center justify-between mb-space-2xs">
<span className="font-label-md text-label-md text-on-surface">Khung giờ: <strong className="text-primary">Thứ Sáu, 04/10</strong></span>
<span className="font-label-sm text-label-sm text-tertiary">3 trống</span>
</div>
<div className="flex flex-col gap-space-xs">
{/*  Slot 1  */}
<button className="w-full py-2.5 px-space-sm rounded-xl bg-surface-container-low hover:bg-secondary-container hover:text-primary transition-colors flex items-center justify-between text-left font-body-sm text-body-sm text-on-surface">
<span className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-[18px] text-tertiary">wb_sunny</span>{"09:00 - 09:45\n                "}</span>
<span className="font-label-sm text-label-sm text-secondary">Sẵn sàng</span>
</button>
{/*  Slot 2 (Active)  */}
<button className="w-full py-2.5 px-space-sm rounded-xl bg-primary text-on-primary shadow-sm flex items-center justify-between text-left font-body-sm text-body-sm font-semibold transition-all scale-[1.01]">
<span className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-[18px]">videocam</span>{"10:00 - 10:45\n                "}</span>
<span className="material-symbols-outlined text-[18px]">check_circle</span>
</button>
{/*  Slot 3  */}
<button className="w-full py-2.5 px-space-sm rounded-xl bg-surface-container-low hover:bg-secondary-container hover:text-primary transition-colors flex items-center justify-between text-left font-body-sm text-body-sm text-on-surface">
<span className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-[18px] text-tertiary">wb_twilight</span>{"14:00 - 14:45\n                "}</span>
<span className="font-label-sm text-label-sm text-secondary">Sẵn sàng</span>
</button>
{/*  Slot 4 (Booked)  */}
<button className="w-full py-2.5 px-space-sm rounded-xl bg-surface-container-high/60 text-outline cursor-not-allowed flex items-center justify-between text-left font-body-sm text-body-sm opacity-60" disabled>
<span className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-[18px]">block</span>{"15:30 - 16:15\n                "}</span>
<span className="font-label-sm text-label-sm">Đã đặt</span>
</button>
</div>
<div className="mt-auto pt-space-xs">
<div className="p-space-xs bg-surface-container-low rounded-lg flex items-start gap-space-xs text-tertiary font-body-sm text-body-sm">
<span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0 mt-0.5">info</span>
<span>Buổi họp video được ghi hình và gửi kèm bản nhận xét sau 2 giờ.</span>
</div>
</div>
</div>
</div>
</section>
{/*  Topic & Notes Input Form Section  */}
<section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface">Chủ đề & Mục tiêu mong muốn</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div className="flex flex-col gap-space-2xs">
<label className="font-label-md text-label-md text-on-surface">Mục tiêu chính của buổi tư vấn</label>
<select className="w-full bg-surface-container-low px-space-sm py-2.5 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border-none">
<option selected>Đánh giá năng lực Dokkai & Lộ trình N1 cấp tốc</option>
<option>Chữa phát âm & Phản xạ Kaiwa phỏng vấn</option>
<option>Chiến thuật thi đỗ điểm cao JLPT N2</option>
<option>Chỉnh sửa luận văn / CV tiếng Nhật</option>
</select>
</div>
<div className="flex flex-col gap-space-2xs">
<label className="font-label-md text-label-md text-on-surface">Tài liệu chuẩn bị trước (Tùy chọn)</label>
<div className="relative w-full">
<input className="w-full bg-surface-container-low px-space-sm py-2.5 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Đính kèm link Google Drive, bài test thử..." type="text" />
<button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-on-primary-fixed">
<span className="material-symbols-outlined text-[18px]">attachment</span>
</button>
</div>
</div>
</div>
</section>
</div>
{/*  Right Area: Sticky Booking Summary Card (4 Columns)  */}
<div className="col-span-12 lg:col-span-4 sticky top-20 flex flex-col gap-space-md">
<div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
<div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
<span className="font-headline-sm text-headline-sm text-on-surface">Tóm tắt lịch hẹn</span>
<span className="px-space-xs py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold">1-on-1 VIP</span>
</div>
{/*  Consultant Info Card Header  */}
<div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-xl">
<div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container-high relative flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="Sensei Sato profile headshot, distinguished Japanese male academic with subtle friendly smile, wearing business attire, crisp clear portrait photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2YMEI6lY4xfNOXifG8f1ZDqd8CNT0pApKiKOiW9v7U8CnmsRhYBKCZSZ0zmomnYgzZYW2PHbubBXKdeNJ9QeaYTXe8c7WOMiAHK8m_kiRHWD_pY8OUpiM3_7xUyMWFfefd6rxrfMzrNPh_msWb_NwxVVlHJ0LybLJS-k4dSwhPyyvBRFtUMV_Fpy5bAnCSKp5Js4GulSorJg6QBmNeIJi5lO0fWGKWMPOP4UDkEYMWU2oHMX2qJtU" />
</div>
<div className="flex flex-col min-w-0">
<span className="font-label-lg text-label-lg text-on-surface truncate">Sensei Sato (佐藤)</span>
<span className="font-body-sm text-body-sm text-secondary truncate">Tư vấn Lộ trình JLPT N1/N3</span>
<span className="font-label-sm text-label-sm text-tertiary">Chuyên gia cấp cao RikiPath</span>
</div>
</div>
{/*  Appointment Key Metadata  */}
<div className="flex flex-col gap-space-sm py-space-xs">
{/*  Time  */}
<div className="flex items-start gap-space-sm">
<div className="w-8 h-8 rounded-lg bg-secondary-container text-primary flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-tertiary uppercase">Thời gian</span>
<span className="font-label-md text-label-md text-on-surface font-semibold">Thứ Sáu, 04 Tháng 10, 2024</span>
<span className="font-body-sm text-body-sm text-primary font-medium">10:00 - 10:45 (45 phút)</span>
</div>
</div>
{/*  Platform  */}
<div className="flex items-start gap-space-sm">
<div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-[18px]">video_chat</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-tertiary uppercase">Nền tảng gặp gỡ</span>
<span className="font-label-md text-label-md text-on-surface">Google Meet HD (Phòng học ảo)</span>
<span className="font-label-sm text-label-sm text-tertiary">Link sẽ gửi qua Email & SMS</span>
</div>
</div>
{/*  Service Package Quota  */}
<div className="flex items-start gap-space-sm">
<div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-[18px]">workspace_premium</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-tertiary uppercase">Hình thức thanh toán</span>
<span className="font-label-md text-label-md text-on-surface font-semibold">Gói Hội Viên Nâng Cao</span>
<span className="font-label-sm text-label-sm text-secondary font-medium">Khấu trừ 1 lượt (Còn lại: 4 lượt)</span>
</div>
</div>
</div>
{/*  Subtle Price/Value display  */}
<div className="p-space-sm bg-surface-container rounded-xl flex items-center justify-between">
<span className="font-body-md text-body-md text-on-surface-variant">Phí buổi hẹn:</span>
<div className="flex items-baseline gap-1">
<span className="font-headline-sm text-headline-sm text-primary font-bold">0 đ</span>
<span className="font-label-sm text-label-sm text-outline line-through">450.000 đ</span>
</div>
</div>
{/*  Confirmation Action Button  */}
<Link to="/consultation-payment" className="w-full py-3.5 px-space-md bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-lg text-label-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-space-xs font-semibold cursor-pointer">
<span>Xác nhận đặt lịch hẹn</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
{/*  Cancellation Notice  */}
<div className="flex items-center gap-space-xs justify-center text-center text-tertiary font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px] text-tertiary">verified_user</span>
<span>Hỗ trợ đổi/hủy lịch miễn phí trước 12 giờ</span>
</div>
</div>
{/*  Preparation Checklist Minimal Widget  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
<div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface">
<span className="material-symbols-outlined text-primary text-[18px]">checklist</span>
<span>Lưu ý trước giờ học:</span>
</div>
<ul className="font-body-sm text-body-sm text-tertiary flex flex-col gap-1 list-disc list-inside">
<li>Kiểm tra micro và camera trước 5 phút</li>
<li>Chuẩn bị sẵn tài liệu ngữ pháp cần giải đáp</li>
<li>Tham gia đúng giờ để đảm bảo tiến độ tư vấn</li>
</ul>
</div>
</div>
</div>
</div></div></main></div>
    </div>
  
</LearnerShell>
);
}
