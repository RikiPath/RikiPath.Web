import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
export default function LessonComplete() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Hoàn thành">
<div className="bg-[#FAF7F5] text-[#2D282A] min-h-screen flex antialiased min-h-screen" data-page="LessonComplete" data-shell-unified="1">


{/*  Fixed Left Sidebar (260px)  */}





{/*  Main View Container  */}


<div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
{/*  Top Navbar  */}

{/*  Scrollable Body with 12-Column Grid Layout (Target Width ~1440px desktop)  */}
<main className="flex-1 overflow-y-auto px-8 py-8 bg-[#FAF7F5]">
<div className="max-w-[1180px] mx-auto space-y-6">
{/*  SECTION 1: Full Width Celebration Hero Card (Neo-Sakura Design)  */}
<section className="bg-white rounded-3xl border border-[#EADFD9] shadow-soft p-8 lg:p-10 relative overflow-hidden">
{/*  Background Ambient Sakura Blurs & Petals  */}
<div className="absolute -top-16 -right-16 w-60 h-60 bg-[#FDEFF4] rounded-full blur-3xl opacity-80 pointer-events-none"></div>
<div className="absolute -bottom-16 -left-16 w-60 h-60 bg-[#F8BBD0]/30 rounded-full blur-3xl opacity-70 pointer-events-none"></div>
{/*  Hero Content Centered  */}
<div className="relative z-10 flex flex-col items-center text-center">
{/*  Blooming Sakura Trophy Badge  */}
<div className="relative mb-4">
<div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#FDEFF4] via-[#F8BBD0]/40 to-white border-2 border-[#F8BBD0] flex items-center justify-center text-[#E05A7A] shadow-md">
<span className="material-symbols-outlined text-[42px] fill">celebration</span>
</div>
<span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-[18px]">done_all</span>
</span>
</div>
{/*  Header Badge  */}
<div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDEFF4] text-[#E05A7A] border border-[#F8BBD0]/70 text-xs font-extrabold uppercase tracking-wider mb-2.5">
<span>🌸</span>
<span>XUẤT SẮC HOÀN THÀNH</span>
</div>
{/*  Main Heading & Subtitle  */}
<h1 className="text-2xl lg:text-3xl font-extrabold text-[#2D282A] tracking-tight mb-2.5">
              Chúc mừng Lan-san! Bạn đã hoàn thành Bài 15
            </h1>
<p className="text-sm lg:text-base text-[#6E6266] max-w-2xl mx-auto leading-relaxed mb-8">
              Mẫu câu <span className="font-bold text-[#E05A7A] bg-[#FDEFF4] px-2 py-0.5 rounded-md">～てもいいです</span> (Xin phép & Cho phép) đã được ghi nhận vào tiến độ học tập JLPT của bạn.
            </p>
{/*  4 Metrics Efficiency Grid  */}
<div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
{/*  Metric 1: Thời gian học  */}
<div className="bg-[#FAF7F5] border border-[#EADFD9] rounded-2xl p-4.5 flex flex-col items-center justify-center text-center hover:border-[#F8BBD0] transition-colors">
<div className="w-9 h-9 rounded-xl bg-white border border-[#EADFD9] flex items-center justify-center text-[#E05A7A] mb-2 shadow-xs">
<span className="material-symbols-outlined text-[20px]">schedule</span>
</div>
<div className="text-2xl font-extrabold text-[#2D282A] tracking-tight">18 phút</div>
<span className="text-xs font-medium text-[#6E6266] mt-0.5">Thời gian học</span>
<span className="text-[11px] text-emerald-600 font-semibold mt-1">Chuẩn micro-learning</span>
</div>
{/*  Metric 2: Kiểm tra trắc nghiệm  */}
<div className="bg-[#FAF7F5] border border-[#EADFD9] rounded-2xl p-4.5 flex flex-col items-center justify-center text-center hover:border-[#F8BBD0] transition-colors">
<div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2 shadow-xs">
<span className="material-symbols-outlined text-[20px] fill">task_alt</span>
</div>
<div className="text-2xl font-extrabold text-emerald-600 tracking-tight">3 / 3</div>
<span className="text-xs font-medium text-[#6E6266] mt-0.5">Kiểm tra trắc nghiệm</span>
<span className="text-[11px] text-emerald-600 font-semibold mt-1">100% chính xác</span>
</div>
{/*  Metric 3: Đã lưu vào Sổ từ  */}
<div className="bg-[#FAF7F5] border border-[#EADFD9] rounded-2xl p-4.5 flex flex-col items-center justify-center text-center hover:border-[#F8BBD0] transition-colors">
<div className="w-9 h-9 rounded-xl bg-white border border-[#EADFD9] flex items-center justify-center text-[#E05A7A] mb-2 shadow-xs">
<span className="material-symbols-outlined text-[20px] fill">bookmark_added</span>
</div>
<div className="text-2xl font-extrabold text-[#2D282A] tracking-tight">+4 từ</div>
<span className="text-xs font-medium text-[#6E6266] mt-0.5">Đã lưu vào Sổ từ</span>
<span className="text-[11px] text-[#E05A7A] font-semibold mt-1">Đồng bộ SRS</span>
</div>
{/*  Metric 4: Điểm kinh nghiệm XP  */}
<div className="bg-[#FAF7F5] border border-[#EADFD9] rounded-2xl p-4.5 flex flex-col items-center justify-center text-center hover:border-[#F8BBD0] transition-colors">
<div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-2 shadow-xs">
<span className="material-symbols-outlined text-[20px] fill">bolt</span>
</div>
<div className="text-2xl font-extrabold text-amber-600 tracking-tight">+50 XP</div>
<span className="text-xs font-medium text-[#6E6266] mt-0.5">Điểm kinh nghiệm</span>
<span className="text-[11px] text-amber-600 font-semibold mt-1">Streak 14 ngày</span>
</div>
</div>
{/*  Primary Actions Group  */}
<div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
<Link to="/lesson-player" className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#EADFD9] bg-white text-[#2D282A] text-sm font-bold hover:bg-[#FAF7F5] hover:border-[#F8BBD0] transition-all flex items-center justify-center gap-2 shadow-xs">
<span className="material-symbols-outlined text-[18px] text-[#6E6266]">replay</span>
<span>Ôn tập lại bài này</span>
</Link>
<Link to="/lesson-player" className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#E05A7A] text-white text-sm font-bold shadow-glow hover:bg-[#C94A68] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5">
<span>Tiếp tục: Bài 16 (Mẫu câu ～てはいけません)</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
</div>
</div>
</section>
{/*  SECTION 2: 2-Column Core Knowledge & AI Recommendation (6 cols / 6 cols in 12-col grid)  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
{/*  Left Column (6 Cols): Điểm kiến thức cốt lõi đã làm chủ  */}
<div className="lg:col-span-6 bg-white rounded-3xl border border-[#EADFD9] p-6 lg:p-7 shadow-soft flex flex-col justify-between">
<div>
{/*  Section Header  */}
<div className="flex items-center justify-between pb-4 border-b border-[#EADFD9] mb-5">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-[#FDEFF4] text-[#E05A7A] border border-[#F8BBD0]/60 flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">school</span>
</div>
<div>
<h3 className="text-base font-bold text-[#2D282A]">Điểm kiến thức cốt lõi đã làm chủ</h3>
<p className="text-xs text-[#6E6266]">Tóm tắt cấu trúc ngữ pháp & ví dụ chuẩn</p>
</div>
</div>
<span className="text-xs font-bold text-[#E05A7A] bg-[#FDEFF4] px-2.5 py-1 rounded-lg">JLPT N3</span>
</div>
{/*  Main Grammar Pattern Box  */}
<div className="bg-[#FAF7F5] rounded-2xl p-4 border border-[#EADFD9] mb-5">
<div className="flex items-center justify-between mb-1.5">
<span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6266]">Công thức ngữ pháp</span>
<span className="text-[11px] font-semibold text-[#E05A7A] bg-white px-2 py-0.5 rounded border border-[#EADFD9]">Dạng thể て</span>
</div>
<p className="text-base sm:text-lg font-bold text-[#E05A7A] tracking-wide">
                  Động từ thể て + もいいです
                </p>
<p className="text-xs text-[#6E6266] mt-1.5 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                  Ý nghĩa: Dùng để biểu thị sự cho phép hoặc hỏi xin phép đối phương một cách lịch sự.
                </p>
</div>
{/*  Furigana Sentence Examples  */}
<div className="space-y-3 mb-5">
<p className="text-xs font-bold text-[#2D282A] uppercase tracking-wider">Mẫu câu ví dụ ứng dụng</p>
<div className="p-3.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] space-y-1 hover:border-[#F8BBD0] transition-colors">
<div className="text-sm font-semibold text-[#2D282A]">
<ruby>写真<rt>しゃしん</rt></ruby>を<ruby>撮<rt>と</rt></ruby>ってもいいですか。
                  </div>
<div className="text-xs text-[#6E6266] flex items-center justify-between">
<span>Tôi có thể chụp ảnh ở đây được không?</span>
<span className="text-[10px] text-[#E05A7A] bg-white px-1.5 py-0.5 rounded border border-[#EADFD9]">Hỏi xin phép</span>
</div>
</div>
<div className="p-3.5 rounded-xl bg-[#FAF7F5] border border-[#EADFD9] space-y-1 hover:border-[#F8BBD0] transition-colors">
<div className="text-sm font-semibold text-[#2D282A]">
                    ここで<ruby>休<rt>やす</rt></ruby>んでもいいです。
                  </div>
<div className="text-xs text-[#6E6266] flex items-center justify-between">
<span>Bạn có thể nghỉ ngơi ở đây một lát.</span>
<span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Cho phép</span>
</div>
</div>
</div>
{/*  Vocabulary Summary Quick-List  */}
<div>
<p className="text-xs font-bold text-[#2D282A] uppercase tracking-wider mb-2.5">Bảng từ vựng tóm tắt vừa nạp (+4 từ)</p>
<div className="grid grid-cols-2 gap-2 text-xs">
<div className="px-3 py-2 rounded-xl bg-white border border-[#EADFD9] flex items-center justify-between">
<span className="font-medium text-[#2D282A]"><ruby>撮<rt>と</rt></ruby>る (toru)</span>
<span className="text-[#6E6266]">Chụp (ảnh)</span>
</div>
<div className="px-3 py-2 rounded-xl bg-white border border-[#EADFD9] flex items-center justify-between">
<span className="font-medium text-[#2D282A]"><ruby>休<rt>やす</rt></ruby>む (yasumu)</span>
<span className="text-[#6E6266]">Nghỉ ngơi</span>
</div>
<div className="px-3 py-2 rounded-xl bg-white border border-[#EADFD9] flex items-center justify-between">
<span className="font-medium text-[#2D282A]"><ruby>許可<rt>きょか</rt></ruby> (kyoka)</span>
<span className="text-[#6E6266]">Sự cho phép</span>
</div>
<div className="px-3 py-2 rounded-xl bg-white border border-[#EADFD9] flex items-center justify-between">
<span className="font-medium text-[#2D282A]"><ruby>遠慮<rt>えんりょ</rt></ruby> (enryo)</span>
<span className="text-[#6E6266]">Khách khí</span>
</div>
</div>
</div>
</div>
{/*  Footer indicator  */}
<div className="pt-4 mt-5 border-t border-[#EADFD9] flex items-center justify-between text-xs text-[#6E6266]">
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-[#E05A7A]">sync_saved_locally</span>
                Đã đồng bộ vào Bộ thẻ ghi nhớ cá nhân
              </span>
<Link to="/vocabulary" className="font-bold text-[#E05A7A] hover:underline">Xem Sổ từ ➔</Link>
</div>
</div>
{/*  Right Column (6 Cols): Đánh giá & Đề xuất từ Cố vấn Haru AI  */}
<div className="lg:col-span-6 bg-white rounded-3xl border border-[#EADFD9] p-6 lg:p-7 shadow-soft flex flex-col justify-between">
<div className="space-y-5">
{/*  Section Header  */}
<div className="flex items-center justify-between pb-4 border-b border-[#EADFD9]">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-[#FDEFF4] text-[#E05A7A] border border-[#F8BBD0]/60 flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">smart_toy</span>
</div>
<div>
<h3 className="text-base font-bold text-[#2D282A]">Đánh giá & Đề xuất từ Cố vấn Haru AI</h3>
<p className="text-xs text-[#6E6266]">AI Sensei cá nhân hóa theo tiến trình của Lan-san</p>
</div>
</div>
<span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sẵn sàng
                </span>
</div>
{/*  Haru AI Sensei Praise Quote Card  */}
<div className="p-4.5 rounded-2xl bg-gradient-to-br from-[#FDEFF4] to-[#FAF7F5] border border-[#F8BBD0]/80 relative">
<div className="flex items-start gap-3">
<div className="w-10 h-10 rounded-xl bg-white border border-[#F8BBD0] flex items-center justify-center text-[#E05A7A] font-bold flex-shrink-0 shadow-xs">
                    🌸
                  </div>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-2 mb-1">
<span className="text-xs font-bold text-[#2D282A]">Haru Sensei (AI Tutor)</span>
<span className="text-[10px] text-[#6E6266] bg-white/80 px-1.5 py-0.2 rounded border border-[#EADFD9]">Vừa nhận xét</span>
</div>
<p className="text-xs sm:text-sm text-[#2D282A] leading-relaxed">
                      "Tuyệt vời lắm Lan-san! Bạn đã trả lời đúng <strong className="text-[#E05A7A]">3/3 câu hỏi phản xạ</strong> và chuyển đổi thể て rất mượt mà. Đừng quên ghi nhớ rằng cấu trúc này rất hay dùng kèm các phó từ như <span className="font-bold text-[#E05A7A]">どうぞ</span> khi cho phép nhé!"
                    </p>
</div>
</div>
</div>
{/*  AI Reflex Sentence Writing Studio Prompt  */}
<div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EADFD9]">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px] text-[#E05A7A]">edit_note</span>
<span className="text-xs font-bold text-[#2D282A]">Gợi ý luyện tập phản xạ viết AI</span>
</div>
<span className="text-[10px] font-bold text-[#E05A7A] bg-[#FDEFF4] px-2 py-0.5 rounded">+15 XP</span>
</div>
<p className="text-xs text-[#6E6266] mb-3 leading-relaxed">
                  Hãy thử viết 2 câu xin phép trong môi trường công sở Nhật Bản để AI Haru chấm điểm phát âm & độ tự nhiên ngay tức thì.
                </p>
<div className="flex items-center gap-2">
<input className="flex-1 text-xs bg-white border border-[#EADFD9] rounded-xl px-3 py-2 text-[#2D282A] focus:outline-none focus:border-[#E05A7A] placeholder-[#9A8F93]" placeholder="Ví dụ: 今、電話をかけてもいいですか..." readOnly="" type="text" />
<Link to="/sentence-studio" className="px-3.5 py-2 bg-white hover:bg-[#FDEFF4] text-[#E05A7A] border border-[#F8BBD0] rounded-xl text-xs font-bold transition-colors flex items-center gap-1 flex-shrink-0">
<span>Mở Studio</span>
<span className="material-symbols-outlined text-[14px]">open_in_new</span>
</Link>
</div>
</div>
{/*  Next Lesson Teaser Box (Bài 16)  */}
<div className="p-4.5 rounded-2xl bg-white border-2 border-[#E05A7A]/30 shadow-xs hover:border-[#E05A7A] transition-all">
<div className="flex items-center justify-between mb-2">
<span className="text-[11px] font-extrabold uppercase tracking-wider text-[#E05A7A]">Bài học kế tiếp</span>
<span className="text-xs text-[#6E6266]">Thời lượng dự kiến: 15 phút</span>
</div>
<h4 className="text-sm font-bold text-[#2D282A] mb-1">
                  Bài 16: Mẫu câu ～てはいけません (Cấm đoán & Không được phép)
                </h4>
<p className="text-xs text-[#6E6266] mb-3.5">
                  Mẫu câu tương phản trực tiếp với Bài 15, giúp bạn hoàn thiện cặp cấu trúc giao tiếp xin phép - cấm đoán thiết yếu.
                </p>
<Link to="/lesson-player" className="w-full py-2.5 rounded-xl bg-[#E05A7A] hover:bg-[#C94A68] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs">
<span>Bắt đầu ngay</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</Link>
</div>
</div>
{/*  AI Status Footer Note  */}
<div className="pt-4 mt-5 border-t border-[#EADFD9] flex items-center justify-between text-xs text-[#6E6266]">
<span className="flex items-center gap-1.5 text-[11px]">
<span className="material-symbols-outlined text-[16px] text-amber-500 fill">lightbulb</span>
                Mẹo: Hoàn thành thêm 1 bài để mở khóa huy hiệu "Ong Chăm Chỉ Tuần 3"
              </span>
</div>
</div>
</div>
</div>
</main>
</div>


    </div>
  
</LearnerShell>
);
}
