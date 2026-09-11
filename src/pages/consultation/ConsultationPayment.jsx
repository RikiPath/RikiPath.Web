export default function ConsultationPayment() {
  return (
    <div className="bg-bg-page font-body-md text-on-surface antialiased min-h-screen flex flex-col overflow-x-hidden min-h-screen" data-page="ConsultationPayment">


{/*  TopNavBar for Mobile  */}


<nav className="md:hidden flex justify-between items-center px-margin-mobile w-full max-w-7xl mx-auto h-16 bg-surface border-b border-border-base sticky top-0 z-50">
<div className="font-display-lg-mobile text-display-lg-mobile font-bold text-primary">{"RikiPath Consultation\n        "}</div>
<div className="flex items-center gap-space-md">
<button className="text-text-secondary hover:text-primary transition-colors">
<span className="material-symbols-outlined">help_outline</span>
</button>
<button className="text-primary font-bold">{"Sign In\n            "}</button>
</div>
</nav>


{/*  Content Canvas  */}


<main className="flex-1 w-full max-w-6xl mx-auto py-space-xl px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-space-lg relative">
{/*  Background Decor  */}
<div aria-hidden="true" className="absolute top-0 right-0 w-full h-96 bg-gradient-to-bl from-bg-soft-red via-primary-fixed/20 to-transparent opacity-60 pointer-events-none rounded-bl-full z-0"></div>
{/*  Left Column: Forms  */}
<div className="lg:col-span-7 z-10 flex flex-col gap-space-lg">
<div className="mb-space-md">
<a className="inline-flex items-center gap-space-xxs text-text-secondary hover:text-primary transition-colors font-support-sm text-support-sm mb-space-lg" href="#">
<span className="material-symbols-outlined text-sm">arrow_back</span>{"Quay lại\n                "}</a>
<h1 className="font-display-lg text-display-lg md:font-display-lg text-on-surface mb-space-xxs">{"Thanh toán\n                "}</h1>
<p className="font-body-md text-body-md text-text-secondary">{"Hoàn tất thông tin để bắt đầu lộ trình học của bạn.\n                "}</p>
</div>
<div className="bg-surface-container-lowest rounded-xl p-space-md md:p-space-xl border border-border-base shadow-sm">
<form action="#" className="space-y-space-xl" id="checkout-form" method="POST">
{/*  Section: Personal Info  */}
<div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-space-md flex items-center gap-space-sm">
<span className="material-symbols-outlined text-primary">person</span>{"Thông tin cá nhân\n                        "}</h3>
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div className="col-span-1 md:col-span-2">
<label className="block font-label-xs text-label-xs text-on-surface-variant mb-space-xxs" htmlFor="name">Họ và tên *</label>
<input className="w-full h-12 px-space-md border border-border-base rounded-lg bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors" id="name" name="name" placeholder="Nhập họ và tên của bạn" required type="text" />
</div>
<div>
<label className="block font-label-xs text-label-xs text-on-surface-variant mb-space-xxs" htmlFor="email">Email *</label>
<input className="w-full h-12 px-space-md border border-border-base rounded-lg bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors" id="email" name="email" placeholder="example@email.com" required type="email" />
</div>
<div>
<label className="block font-label-xs text-label-xs text-on-surface-variant mb-space-xxs" htmlFor="phone">Số điện thoại *</label>
<input className="w-full h-12 px-space-md border border-border-base rounded-lg bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors" id="phone" name="phone" placeholder="09xx xxx xxx" required type="tel" />
</div>
</div>
</div>
{/*  Section: Payment Method  */}
<div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-space-md flex items-center gap-space-sm">
<span className="material-symbols-outlined text-primary">payment</span>{"Phương thức thanh toán\n                        "}</h3>
<div className="space-y-space-sm">
{/*  VNPay Option (Selected)  */}
<label className="relative flex cursor-pointer items-center justify-between p-space-md rounded-lg border-2 border-primary bg-bg-soft-red transition-all group">
<div className="flex items-center gap-space-md">
<input checked className="h-5 w-5 border-border-base text-primary focus:ring-primary cursor-pointer accent-primary" name="payment_method" type="radio" value="vnpay" />
<span className="font-body-md text-body-md text-on-surface font-semibold">VNPay</span>
</div>
<div className="w-16 h-8 bg-surface-container-lowest rounded border border-border-base flex items-center justify-center p-1">
<img className="w-full h-full object-contain" data-alt="A small, crisp logo for VNPay, featuring its distinct blue and red colors on a white background, designed for a modern e-commerce checkout interface." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD3Q4F1nq5diN6Y6QBnfBalgfzqbwotSOnB1VSyUv91EZ4VqYxCI34VVrwJkFjX3DVBvRMyyYIt7-nv81b-6HHsRBv6UbjI4704WhSIXh1vUStYIak319qbu-ahcLJk8bedskbRkhl2QUeE9nOnx5st3pyX0OOzslWks4hsexiVYexdT6CZMaB55_rYKHE0ZE_s95fgB9yT_gdrPmpkExug6orZt7B1X8JxKzSbTQEzI3LYcnG-01yBw" />
</div>
{/*  Selected Indicator Ring  */}
<div className="absolute inset-0 rounded-lg border border-primary pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
</label>
{/*  MoMo Option  */}
<label className="relative flex cursor-pointer items-center justify-between p-space-md rounded-lg border border-border-base bg-surface-container-lowest hover:border-primary hover:bg-bg-soft-red/50 transition-all">
<div className="flex items-center gap-space-md">
<input className="h-5 w-5 border-border-base text-primary focus:ring-primary cursor-pointer accent-primary" name="payment_method" type="radio" value="momo" />
<span className="font-body-md text-body-md text-on-surface">Ví MoMo</span>
</div>
<div className="w-16 h-8 bg-surface-container-lowest rounded border border-border-base flex items-center justify-center p-1">
<img className="w-full h-full object-contain" data-alt="A small, clear logo for MoMo e-wallet, featuring its bright pink color scheme on a white background, suitable for a digital payment options list." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0seRajIbfph0F9EJEQsvJhWqodg0_VYfgAcmjmMndfNb1PpIbhNbeShU00I9Fk9yTQ0jycnp-hWWsMDV4PKi7qWPfthyIfOpWgPJcv4S5H9qITgLe_HN43Zf4eE_JD5yV-P_zD3tqjXDzbPleLZ-KNcKNbZbzug8xNKUNUqYLK7vDMfcKUfULuLDnCLUQRZJSFdDkjZfbLLD52iyQlu7WF8AxHkDrp4yWDFOdLzIYjKFQwWCjwrJYSQ" />
</div>
</label>
{/*  Bank Transfer Option  */}
<label className="relative flex cursor-pointer items-center justify-between p-space-md rounded-lg border border-border-base bg-surface-container-lowest hover:border-primary hover:bg-bg-soft-red/50 transition-all">
<div className="flex items-center gap-space-md">
<input className="h-5 w-5 border-border-base text-primary focus:ring-primary cursor-pointer accent-primary" name="payment_method" type="radio" value="bank" />
<span className="font-body-md text-body-md text-on-surface">Chuyển khoản ngân hàng</span>
</div>
<div className="w-16 h-8 bg-surface-container-lowest rounded border border-border-base flex items-center justify-center p-1 text-text-secondary">
<span className="material-symbols-outlined text-xl text-primary">account_balance</span>
</div>
</label>
</div>
</div>
</form>
</div>
</div>
{/*  Right Column: Summary & Actions  */}
<div className="lg:col-span-5 z-10 flex flex-col gap-space-lg">
{/*  Bento Card: Package Details  */}
<div className="bg-surface-container-lowest rounded-xl p-space-lg border border-border-base shadow-sm relative overflow-hidden group hover:border-primary transition-colors duration-300">
<div className="absolute top-0 right-0 w-32 h-32 bg-bg-soft-red rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
<div className="relative z-10">
<div className="inline-flex items-center justify-center px-space-sm py-space-xxs bg-bg-soft-red rounded-full text-primary font-label-xs text-label-xs mb-space-md border border-border-base">{"Đang chọn\n                    "}</div>
<h2 className="font-headline-md text-headline-md text-on-surface mb-space-xxs">{"Gói Nâng cao - 5 buổi tư vấn\n                    "}</h2>
<p className="font-body-md text-body-md text-text-secondary mb-space-lg">{"Phù hợp cho học viên cần lộ trình chi tiết và sửa lỗi chuyên sâu.\n                    "}</p>
{/*  Features List  */}
<ul className="space-y-space-sm mb-space-xl">
<li className="flex items-start gap-space-sm">
<span className="material-symbols-outlined text-success">check_circle</span>
<span className="font-support-sm text-support-sm text-on-surface-variant">Video call 1-1 chuyên sâu (45p/buổi)</span>
</li>
<li className="flex items-start gap-space-sm">
<span className="material-symbols-outlined text-success">check_circle</span>
<span className="font-support-sm text-support-sm text-on-surface-variant">Sửa 10 bài viết & phát âm</span>
</li>
<li className="flex items-start gap-space-sm">
<span className="material-symbols-outlined text-success">check_circle</span>
<span className="font-support-sm text-support-sm text-on-surface-variant">Hỗ trợ hỏi đáp 24/7 qua Zalo</span>
</li>
</ul>
{/*  Total Price Area  */}
<div className="pt-space-md border-t border-border-base flex justify-between items-end mb-space-lg">
<span className="font-body-md text-body-md text-text-secondary">Tổng cộng</span>
<div className="text-right">
<div className="font-display-lg text-display-lg text-primary font-bold">{"799.000đ\n                            "}</div>
</div>
</div>
{/*  Terms & Action  */}
<div className="space-y-space-md">
<p className="font-support-sm text-support-sm text-text-secondary text-center">{"Bằng cách thanh toán, bạn đồng ý với "}<a className="text-primary hover:underline" href="#">Điều khoản sử dụng</a> và <a className="text-primary hover:underline" href="#">Chính sách hoàn tiền</a>{".\n                        "}</p>
<button className="w-full h-14 bg-primary text-white rounded-full font-title-sm text-title-sm font-bold shadow-sm hover:bg-primary-dark transition-colors duration-200 active:scale-95 flex items-center justify-center gap-space-sm" form="checkout-form" type="submit">{"Tiến hành thanh toán\n                            "}<span className="material-symbols-outlined text-sm">arrow_forward</span>
</button>
<div className="flex items-center justify-center gap-space-xxs text-text-secondary font-support-sm text-support-sm mt-space-md">
<span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
<span>Giao dịch được bảo mật bởi VNPay</span>
</div>
</div>
</div>
</div>
{/*  Guarantee Badge  */}
<div className="bg-surface-container-lowest rounded-lg p-space-md border border-border-base shadow-sm flex items-center gap-space-md">
<div className="w-12 h-12 rounded-full bg-bg-soft-red flex items-center justify-center text-primary shrink-0 border border-border-base">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
</div>
<div>
<h4 className="font-title-sm text-title-sm text-on-surface mb-space-xxs">Cam kết chất lượng</h4>
<p className="font-support-sm text-support-sm text-text-secondary">Hoàn tiền 100% nếu không hài lòng sau buổi đầu tiên.</p>
</div>
</div>
</div>
</main>


{/*  Footer for Transactional Page  */}


<footer className="w-full py-space-xl px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center border-t border-border-base bg-surface-container-high/60 mt-auto">
<div className="font-title-sm text-title-sm font-bold text-primary mb-space-md md:mb-0">{"RikiPath Consultation\n        "}</div>
<div className="flex gap-space-md font-support-sm text-support-sm text-on-surface-variant">
<a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
<a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
<a className="hover:text-primary transition-colors" href="#">Contact Us</a>
</div>
<div className="font-support-sm text-support-sm text-text-secondary mt-space-md md:mt-0">{"© 2024 RikiPath Japanese Learning. All rights reserved.\n        "}</div>
</footer>


    </div>
  );
}
