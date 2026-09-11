import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';
export default function CourseDetail() {
  const { pathname } = useLocation();
  return (
    <MarketingShell pathname={pathname}>
<div className="bg-bg-page text-on-surface font-body-md antialiased selection:bg-bg-soft-red selection:text-primary" style={{ backgroundColor: "rgb(250, 247, 242)", position: "relative" }} data-page="CourseDetail" data-shell-unified="1">
<div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: "url(\"https://lh3.googleusercontent.com/aida/AEtjO1XsYWpcypAaiicJ5aWDsaW-GEmVWOKogAEQ7kZW4nxNFB_JZTuC9dhy22iD5Mnutw1-dtQ-HzB6D_VzjEx9subcYz6PRrv0yijHn4N-jAJ5MXOS4-C7ZVxGV4l2XoEkHfC4wG6mbXFoj3jaBxyOPj_Z_xylJmm-FRcPsVf-1klRUQuv1hr9HgKslqHQcIxclS9hAnXtwq8jA0ngfRmWAVTjaBx5hh644yXJMi3Bdy5g8E0mhB9PvzPKpXg\")", backgroundRepeat: "repeat", backgroundSize: "120px 120px" }}></div>


{/*  TopAppBar  */}





{/*  SideNavBar (Mobile)  */}


<div className="hidden lg:hidden flex flex-col p-4 fixed inset-y-0 left-0 h-full w-64 bg-surface dark:bg-inverse-surface border-r border-border-base z-40 mt-[72px]">
<div className="mb-space-lg flex items-center gap-2">
<span className="material-symbols-outlined text-primary">local_florist</span>
<div>
<div className="text-title-sm font-title-sm text-primary">RikiPath</div>
<div className="text-support-sm font-support-sm text-on-surface-variant">Học tiếng Nhật thông minh</div>
</div>
</div>
<nav className="flex flex-col gap-space-sm">
<a className="bg-primary-container text-on-primary-container rounded-lg px-4 py-2 flex items-center gap-space-md transition-all duration-200" href="#">
<span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
<span className="">Khóa học</span>
</a>
<a className="text-on-surface-variant hover:bg-surface-container-low rounded-lg px-4 py-2 flex items-center gap-space-md transition-all duration-200" href="#">
<span className="material-symbols-outlined" data-icon="alt_route">alt_route</span>
<span className="">Lộ trình JLPT</span>
</a>
<a className="text-on-surface-variant hover:bg-surface-container-low rounded-lg px-4 py-2 flex items-center gap-space-md transition-all duration-200" href="#">
<span className="material-symbols-outlined" data-icon="library_books">library_books</span>
<span className="">Kho kiến thức</span>
</a>
<a className="text-on-surface-variant hover:bg-surface-container-low rounded-lg px-4 py-2 flex items-center gap-space-md transition-all duration-200" href="#">
<span className="material-symbols-outlined" data-icon="quiz">quiz</span>
<span className="">Thi thử</span>
</a>
<a className="text-on-surface-variant hover:bg-surface-container-low rounded-lg px-4 py-2 flex items-center gap-space-md transition-all duration-200" href="#">
<span className="material-symbols-outlined" data-icon="support_agent">support_agent</span>
<span className="">Tư vấn</span>
</a>
</nav>
<div className="mt-auto pt-space-lg">
<button className="w-full bg-primary text-on-primary rounded-full py-space-sm font-title-sm text-title-sm hover:opacity-90 shadow-md shadow-primary/20 transition-all duration-200">Học thử miễn phí</button>
</div>
</div>


{/*  Main Content  */}


<main className="pt-[96px] pb-space-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto min-h-screen relative">
{/*  Breadcrumbs  */}
<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-support-sm font-support-sm text-on-surface-variant mb-space-lg">
<Link className="hover:text-primary transition-colors" to="/">Trang chủ</Link>
<span className="material-symbols-outlined text-[16px]" data-icon="chevron_right">chevron_right</span>
<Link className="hover:text-primary transition-colors" to="/courses">Khóa học</Link>
<span className="material-symbols-outlined text-[16px]" data-icon="chevron_right">chevron_right</span>
<span className="text-on-surface font-medium">Chinh phục JLPT N4 Toàn diện</span>
</nav>
{/*  Course Header & Main Layout  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
{/*  Left Column (Content)  */}
<div className="lg:col-span-8 flex flex-col gap-space-xl">
{/*  Hero Section  */}
<div className="bg-surface rounded-xl border border-border-base overflow-hidden shadow-xs hover:shadow-sm transition-shadow">
<div className="w-full h-64 bg-surface-container-high relative">
<img className="w-full h-full object-cover" data-alt="A modern, bright classroom setting for Japanese language learning. Soft morning light streams through large windows. On a clean, minimalist wooden desk, a textbook is open next to a steaming cup of tea and a notebook with beautiful kanji calligraphy. The overall mood is motivating, serene, and academically focused. Colors are soft whites, warm woods, with vibrant accents of primary red to match the brand identity." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmjrkGTuhbr6DcadwSwvdkot1XWlCI1L4IPWTUlIMyyk_Nsd6VRi-hczg92To7ZsFHzY57N8ul0s_CQvUC8a7HLJVl8i0W4m4O7RZr-rgpQSksPcupA25LR_II8lzSD7xB2Py1PDnBMwPGjbHVn5I9YY2GNaahEgLIXmmxO-LusvirYk56WZeE7xzb6f1D2iRF6h-xJjMZezhb8IxKvPMiUxOwz_eGxCyyNESsKnJFUDom1NfbNuCRWg" />
<div className="absolute inset-0 bg-gradient-to-t from-on-background/85 via-on-background/30 to-transparent flex items-end p-space-lg">
<span className="bg-primary text-on-primary px-3.5 py-1 rounded-full text-label-xs font-label-xs mb-space-sm inline-flex items-center gap-1 shadow-sm font-semibold tracking-wide">
<span className="material-symbols-outlined text-[14px]">local_florist</span>{" N4 Level\n"}</span>
</div>
</div>
<div className="p-space-lg bg-surface">
<h1 className="text-display-lg-mobile md:text-display-lg font-display-lg-mobile md:font-display-lg text-on-surface mb-space-md">Chinh phục JLPT N4 Toàn diện</h1>
<p className="text-body-md font-body-md text-on-surface-variant mb-space-lg leading-relaxed">{"Khóa học thiết kế đặc biệt giúp bạn nắm vững ngữ pháp, từ vựng và kỹ năng đọc hiểu N4 trong 3 tháng. Lộ trình cá nhân hóa, bài tập thực hành sát đề thi thực tế.\n                        "}</p>
<div className="flex flex-wrap gap-space-md items-center">
<div className="flex items-center gap-space-xxs text-support-sm font-support-sm text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full border border-border-base">
<span className="material-symbols-outlined text-warning" data-icon="star" data-weight="fill">star</span>
<span className="font-medium text-on-surface">4.8</span>
<span className="">(1,245 đánh giá)</span>
</div>
<div className="flex items-center gap-space-xxs text-support-sm font-support-sm text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full border border-border-base">
<span className="material-symbols-outlined text-primary" data-icon="group">group</span>
<span className="">15,000+ Học viên</span>
</div>
<div className="flex items-center gap-space-xxs text-support-sm font-support-sm text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full border border-border-base">
<span className="material-symbols-outlined text-primary" data-icon="schedule">schedule</span>
<span className="">60 Giờ học</span>
</div>
</div>
</div>
</div>
{/*  Course Outcomes (Bento Grid Style)  */}
<section>
<h2 className="text-headline-md font-headline-md text-on-surface mb-space-lg flex items-center gap-2">
<span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
<span className="">Bạn sẽ học được gì?</span>
</h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div className="bg-surface p-space-lg rounded-xl border border-border-base flex items-start gap-space-md hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200">
<div className="bg-bg-soft-red p-space-sm rounded-lg text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[22px]" data-icon="check_circle">check_circle</span>
</div>
<div>
<h3 className="text-title-sm font-title-sm text-on-surface mb-space-xxs">Nắm vững 300+ Kanji N4</h3>
<p className="text-support-sm font-support-sm text-on-surface-variant">Nhận diện và viết thành thạo các chữ Hán thường gặp trong kỳ thi.</p>
</div>
</div>
<div className="bg-surface p-space-lg rounded-xl border border-border-base flex items-start gap-space-md hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200">
<div className="bg-bg-soft-red p-space-sm rounded-lg text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[22px]" data-icon="check_circle">check_circle</span>
</div>
<div>
<h3 className="text-title-sm font-title-sm text-on-surface mb-space-xxs">Thành thạo Ngữ pháp trung cấp</h3>
<p className="text-support-sm font-support-sm text-on-surface-variant">Hiểu sâu và vận dụng linh hoạt 100+ cấu trúc ngữ pháp N4.</p>
</div>
</div>
<div className="bg-surface p-space-lg rounded-xl border border-border-base flex items-start gap-space-md hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200">
<div className="bg-bg-soft-red p-space-sm rounded-lg text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[22px]" data-icon="check_circle">check_circle</span>
</div>
<div>
<h3 className="text-title-sm font-title-sm text-on-surface mb-space-xxs">Kỹ năng Đọc hiểu tốc độ cao</h3>
<p className="text-support-sm font-support-sm text-on-surface-variant">Chiến thuật giải quyết nhanh các dạng bài đọc hiểu trong đề thi.</p>
</div>
</div>
<div className="bg-surface p-space-lg rounded-xl border border-border-base flex items-start gap-space-md hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200">
<div className="bg-bg-soft-red p-space-sm rounded-lg text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[22px]" data-icon="check_circle">check_circle</span>
</div>
<div>
<h3 className="text-title-sm font-title-sm text-on-surface mb-space-xxs">Nghe hiểu phản xạ</h3>
<p className="text-support-sm font-support-sm text-on-surface-variant">Luyện nghe hội thoại hàng ngày và bắt keyword chính xác.</p>
</div>
</div>
</div>
</section>
{/*  Curriculum Accordion  */}
<section>
<div className="flex justify-between items-center mb-space-lg">
<h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
<span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
<span className="">Nội dung khóa học</span>
</h2>
<span className="text-support-sm font-support-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full border border-border-base font-medium">4 Chương • 48 Bài giảng</span>
</div>
<div className="flex flex-col gap-space-sm">
{/*  Accordion Item 1  */}
<div className="bg-surface rounded-xl border border-border-base overflow-hidden shadow-xs">
<button className="w-full px-space-lg py-space-md flex justify-between items-center bg-surface-container-low/70 hover:bg-surface-container-low transition-colors duration-200 text-left">
<div className="flex items-center gap-space-md">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="text-title-sm font-title-sm text-on-surface">Chương 1: Khởi động Ngữ pháp N4</span>
</div>
<div className="flex items-center gap-space-md">
<span className="text-support-sm font-support-sm text-on-surface-variant hidden md:block">12 bài giảng</span>
<span className="material-symbols-outlined text-primary transition-transform duration-200" data-icon="expand_more">expand_more</span>
</div>
</button>
<div className="px-space-lg py-space-md border-t border-border-base bg-surface-bright">
<ul className="flex flex-col gap-space-md">
<li className="flex items-start gap-space-md">
<span className="material-symbols-outlined text-primary text-[20px] mt-1" data-icon="play_circle">play_circle</span>
<div>
<p className="text-body-md font-body-md text-on-surface">Bài 1: Thể bị động (受身形)</p>
<p className="text-support-sm font-support-sm text-on-surface-variant">15:30</p>
</div>
</li>
<li className="flex items-start gap-space-md">
<span className="material-symbols-outlined text-primary text-[20px] mt-1" data-icon="play_circle">play_circle</span>
<div>
<p className="text-body-md font-body-md text-on-surface">Bài 2: Thể sai khiến (使役形)</p>
<p className="text-support-sm font-support-sm text-on-surface-variant">18:45</p>
</div>
</li>
<li className="flex items-start gap-space-md opacity-60">
<span className="material-symbols-outlined text-on-surface-variant text-[20px] mt-1" data-icon="lock">lock</span>
<div>
<p className="text-body-md font-body-md text-on-surface">{"Bài 3: Tôn kính ngữ & Khiêm nhường ngữ cơ bản"}</p>
<p className="text-support-sm font-support-sm text-on-surface-variant">22:10</p>
</div>
</li>
</ul>
</div>
</div>
{/*  Accordion Item 2 (Closed state preview)  */}
<div className="bg-surface rounded-xl border border-border-base overflow-hidden shadow-xs">
<button className="w-full px-space-lg py-space-md flex justify-between items-center bg-surface-container-low/70 hover:bg-surface-container-low transition-colors duration-200 text-left">
<div className="flex items-center gap-space-md">
<span className="w-2 h-2 rounded-full bg-outline-variant"></span>
<span className="text-title-sm font-title-sm text-on-surface">Chương 2: Chinh phục 300 Kanji N4</span>
</div>
<div className="flex items-center gap-space-md">
<span className="text-support-sm font-support-sm text-on-surface-variant hidden md:block">15 bài giảng</span>
<span className="material-symbols-outlined text-on-surface-variant" data-icon="expand_more">expand_more</span>
</div>
</button>
</div>
</div>
</section>
{/*  Instructor Bio  */}
<section className="bg-surface rounded-xl border border-border-base p-space-lg shadow-xs">
<h2 className="text-headline-md font-headline-md text-on-surface mb-space-lg flex items-center gap-2">
<span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
<span className="">Giảng viên của bạn</span>
</h2>
<div className="flex flex-col md:flex-row gap-space-lg items-start">
<img className="w-24 h-24 rounded-full object-cover border-2 border-border-base shadow-xs" data-alt="A professional headshot of a friendly, approachable female Japanese language teacher in her 30s. She is smiling warmly at the camera. She wears a modern, smart-casual blazer over a neat blouse. The background is a brightly lit, out-of-focus modern office setting with subtle hints of red brand accents. High quality, crisp portrait photography." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHMqJFwTxP1IeWh-SVAtONZ9MI1b-9hrCie8GUBmzb2I3a3vy4-4X6C3yPEavGICTIxppj8wWPq-dWa6WIoeMUT-mf5HjkXJnNeNYKIDxZTa2NL02mCjNZORzt_ASH9pfcF7BleTk2CLEWFASCLIrje-w-GdBygTuFfk03gV2y0uxVok5E1j98kxhTzu7d2x3ngwn-W_d08RyLe2S2Amwop8A09XoBWzKLvSEEfLJW78sn-Xs6lxE9yg" />
<div>
<h3 className="text-title-sm font-title-sm text-on-surface">Cô Nguyễn Thu Hà</h3>
<p className="text-support-sm font-support-sm text-primary font-medium mb-space-md flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">verified</span>{" Chuyên gia luyện thi JLPT N3, N4\n"}</p>
<p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">{"Với hơn 8 năm kinh nghiệm giảng dạy tiếng Nhật và từng sống, làm việc tại Tokyo trong 5 năm. Cô Hà nổi tiếng với phương pháp giảng dạy trực quan, dễ hiểu, giúp hàng ngàn học viên vượt qua kỳ thi JLPT với điểm số ấn tượng.\n                            "}</p>
</div>
</div>
</section>
</div>
{/*  Right Column (Sticky Sidebar)  */}
<div className="lg:col-span-4 relative">
<div className="sticky top-[100px] flex flex-col gap-space-lg">
{/*  Enrollment Card  */}
<div className="bg-surface rounded-xl border border-border-base shadow-sm p-space-lg relative overflow-hidden">
{/*  Decorative sakura pastel bg accent  */}
<div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-bl-full -z-10 pointer-events-none"></div>
<div className="mb-space-lg">
<span className="text-display-lg-mobile md:text-display-lg font-display-lg-mobile md:font-display-lg text-on-surface font-bold">1,299,000₫</span>
<span className="text-support-sm font-support-sm text-on-surface-variant line-through ml-2">2,500,000₫</span>
<div className="mt-space-xxs inline-block bg-bg-soft-red text-primary border border-border-base px-2.5 py-1 rounded-full text-label-xs font-label-xs font-bold">Giảm 48%</div>
</div>
<button className="w-full bg-primary text-on-primary rounded-full py-space-md font-title-sm text-title-sm mb-space-sm hover:opacity-95 active:scale-[0.99] transition-all duration-200 shadow-[0_6px_16px_rgba(217,75,104,0.3)] flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-[20px]">local_florist</span>
<span className="">Đăng ký học ngay</span>
</button>
<button className="w-full border border-border-base bg-surface-container-low/40 text-on-surface rounded-full py-space-md font-title-sm text-title-sm hover:bg-surface-container-low hover:border-primary/40 transition-all duration-200">{"Học thử miễn phí\n                        "}</button>
<div className="mt-space-lg pt-space-lg border-t border-border-base flex flex-col gap-space-sm">
<h4 className="text-title-sm font-title-sm text-on-surface mb-space-xxs">Khóa học bao gồm:</h4>
<div className="flex items-center gap-space-md text-support-sm font-support-sm text-on-surface-variant">
<span className="material-symbols-outlined text-[18px] text-primary" data-icon="ondemand_video">ondemand_video</span>
<span className="">60 giờ video bài giảng chất lượng cao</span>
</div>
<div className="flex items-center gap-space-md text-support-sm font-support-sm text-on-surface-variant">
<span className="material-symbols-outlined text-[18px] text-primary" data-icon="description">description</span>
<span className="">120+ bài tập thực hành có chấm chữa</span>
</div>
<div className="flex items-center gap-space-md text-support-sm font-support-sm text-on-surface-variant">
<span className="material-symbols-outlined text-[18px] text-primary" data-icon="all_inclusive">all_inclusive</span>
<span className="">Quyền truy cập trọn đời</span>
</div>
<div className="flex items-center gap-space-md text-support-sm font-support-sm text-on-surface-variant">
<span className="material-symbols-outlined text-[18px] text-primary" data-icon="devices">devices</span>
<span className="">Học trên mọi thiết bị</span>
</div>
</div>
</div>
{/*  Reviews Summary Card  */}
<div className="bg-surface rounded-xl border border-border-base p-space-lg shadow-xs">
<h3 className="text-title-sm font-title-sm text-on-surface mb-space-md">Đánh giá học viên</h3>
<div className="flex items-center gap-space-lg mb-space-md">
<div className="text-center">
<div className="text-display-lg-mobile md:text-display-lg font-display-lg-mobile md:font-display-lg text-on-surface font-bold leading-none">4.8</div>
<div className="flex text-warning mt-1 justify-center">
<span className="material-symbols-outlined text-[16px]" data-icon="star" data-weight="fill">star</span>
<span className="material-symbols-outlined text-[16px]" data-icon="star" data-weight="fill">star</span>
<span className="material-symbols-outlined text-[16px]" data-icon="star" data-weight="fill">star</span>
<span className="material-symbols-outlined text-[16px]" data-icon="star" data-weight="fill">star</span>
<span className="material-symbols-outlined text-[16px]" data-icon="star_half" data-weight="fill">star_half</span>
</div>
<div className="text-label-xs font-label-xs text-on-surface-variant mt-1">(1,245 đánh giá)</div>
</div>
<div className="flex-1 flex flex-col gap-1.5">
{/*  Progress bars for ratings  */}
<div className="flex items-center gap-2">
<span className="text-label-xs font-label-xs text-on-surface-variant w-3">5</span>
<div className="h-2 flex-1 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary w-[85%] rounded-full"></div>
</div>
</div>
<div className="flex items-center gap-2">
<span className="text-label-xs font-label-xs text-on-surface-variant w-3">4</span>
<div className="h-2 flex-1 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary/70 w-[10%] rounded-full"></div>
</div>
</div>
<div className="flex items-center gap-2 opacity-50">
<span className="text-label-xs font-label-xs text-on-surface-variant w-3">3</span>
<div className="h-2 flex-1 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-primary/40 w-[3%] rounded-full"></div>
</div>
</div>
</div>
</div>
<button className="w-full text-primary font-title-sm text-title-sm hover:underline mt-space-sm">Xem tất cả đánh giá</button>
</div>
</div>
</div>
</div>
</main>


{/*  Footer  */}





    </div>
  
</MarketingShell>
);
}
