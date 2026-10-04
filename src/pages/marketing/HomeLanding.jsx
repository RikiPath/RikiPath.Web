import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';

function DashPreview() {
  const days = Array.from({ length: 42 }, (_, i) => {
    const n = (i * 7) % 11;
    return n > 7 ? 'bg-[#D94B68]' : n > 4 ? 'bg-[#F8BBD0]' : 'bg-[#FFF0F5]';
  });

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#dfbfc1]/50 bg-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.35)]">
      <div className="border-b border-[#fff0f5] px-4 py-2.5 text-[11px] text-[#A59B9E]">riki.path / student / dashboard</div>
      <div className="grid grid-cols-[168px_1fr]">
        <aside className="hidden space-y-1 border-r border-[#fff0f5] p-3 sm:block">
          <div className="mb-3 flex items-center gap-2 px-2 py-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-[11px] font-bold text-white">R</span>
            <span className="text-[12px] font-bold">RikiPath</span>
          </div>
          {[
            ['Bảng điều khiển', true],
            ['Luyện tập JLPT', false],
            ['Mô phỏng thi', false],
            ['Kết quả của tôi', false],
            ['Từ vựng', false],
            ['Ngữ pháp', false],
            ['Bài giảng video', false],
            ['AI chấm bài', false],
          ].map(([label, on]) => (
            <div
              key={label}
              className={on ? 'rounded-xl bg-[#D94B68] px-2.5 py-2 text-[11px] font-semibold text-white' : 'px-2.5 py-2 text-[11px] text-[#6F6669]'}
            >
              {label}
            </div>
          ))}
        </aside>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-[#A59B9E]">Chào bạn</div>
              <div className="text-[18px] font-extrabold leading-tight">Hôm nay bạn đã sẵn sàng chinh phục JLPT chưa?</div>
            </div>
            <div className="rounded-full bg-[#fff0f5] px-2.5 py-1 text-[10px] font-semibold text-[#D94B68]">3 ngày liên tiếp</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] p-4 text-white">
              <div className="text-[11px] text-white/70">Thứ 6, 14/07</div>
              <div className="mt-2 text-[20px] font-extrabold">Khuya rồi đó</div>
              <p className="mt-2 text-[12px] leading-relaxed text-white/80">“Ngày nào ôn bài, ngày đó thắng lợi.” Bắt đầu bằng 15 phút nhé.</p>
            </div>
            <div className="rounded-2xl border border-[#dfbfc1]/40 p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[#6F6669]">
                <span>Hành trình đều đặn</span>
                <span>3 tháng gần nhất</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((tone, i) => (
                  <span key={i} className={`h-2.5 rounded-sm ${tone}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Listening N3', '35 phút · luyện nghe'],
              ['Từ vựng JLPT', '10 phút · theo chủ đề'],
              ['Speaking Kaiwa', '15 phút · hội thoại'],
            ].map(([title, sub]) => (
              <div key={title} className="rounded-2xl border border-[#dfbfc1]/40 p-3">
                <div className="text-[13px] font-bold">{title}</div>
                <div className="mt-1 text-[11px] text-[#A59B9E]">{sub}</div>
                <div className="mt-3 text-[11px] font-semibold text-[#D94B68]">Bắt đầu →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeLanding() {
  return (
    <MarketingShell>
      <div className="bg-[#FFF8F8] text-[#2D282A]" data-page="HomeLanding">
        <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:py-16">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D94B68]" />
              Nền tảng tự học JLPT
            </div>
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight sm:text-[52px]">
              Tự học, luyện thi và thi thử JLPT online theo lộ trình.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#6F6669]">
              Từ bài học hằng ngày, luyện từng kỹ năng đến mô phỏng thi thật, mọi hoạt động đều được gom trong một dashboard gọn và đồng bộ với trải nghiệm học hiện tại của bạn.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium text-[#6F6669]">
              <span className="text-[#D94B68]">✓</span> Luyện đủ kỹ năng JLPT
              <span className="text-[#D94B68]">✓</span> AI chấm phát âm & viết
              <span className="text-[#D94B68]">✓</span> 120.000+ học viên đang học
            </div>
          </div>
          <DashPreview />
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Thi thử sát format', 'Làm quen cấu trúc và thời gian'],
              ['AI phản hồi tức thì', 'Chấm Speaking và Writing'],
              ['Lộ trình cá nhân', 'Ưu tiên đúng phần còn yếu'],
              ['Tiến độ rõ ràng', 'Thống kê theo ngày và tuần'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-[#dfbfc1]/45 bg-white p-5">
                <div className="text-[15px] font-bold">{title}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6F6669]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8" id="pathway">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Nội dung đang có trên hệ thống</div>
              <h2 className="mt-2 max-w-xl text-[34px] font-extrabold leading-tight">Một hệ sinh thái tự học JLPT hoàn chỉnh.</h2>
            </div>
            <Link to="/auth" className="text-[14px] font-semibold text-[#D94B68]">
              Vào dashboard →
            </Link>
          </div>
          <div className="rounded-[28px] border border-[#dfbfc1]/45 bg-white p-6 sm:p-8">
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#D94B68]">Chương trình chính</div>
            <h3 className="mt-2 text-[24px] font-extrabold">Luyện JLPT N5–N1 theo từng kỹ năng</h3>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#6F6669]">
              Học từ nền tảng đến mục tiêu chứng chỉ với bài luyện Đọc, Nghe, Nói, Viết, Ngữ pháp và Từ vựng được sắp xếp thành lộ trình mỗi ngày.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#6F6669]">
              <span>✓ Luyện từng part theo format</span>
              <span>✓ Mô phỏng thi có đồng hồ</span>
              <span>✓ Phân tích kết quả sau bài</span>
              <span>✓ Gợi ý nội dung nên học tiếp</span>
            </div>
            <Link
              to="/register"
              className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[#D94B68]/25"
            >
              Bắt đầu luyện JLPT
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Từ vựng JLPT', 'Học theo chủ đề, ôn lặp SRS và luyện từ trong đúng ngữ cảnh đề thi.'],
              ['Ngữ pháp trọng tâm', 'Ôn mẫu câu hay gặp, kèm giải thích lỗi và bài tập theo trình độ.'],
              ['Bài giảng video', 'Video ngắn, đi thẳng vào chiến thuật làm bài và lỗi người học hay mắc.'],
              ['Mẹo học & chiến thuật', 'Cách phân bổ thời gian, xử lý câu khó và giữ điểm ổn định.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-[#dfbfc1]/45 bg-white p-5">
                <div className="text-[15px] font-bold">{title}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-[#6F6669]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8">
          <div className="rounded-[28px] bg-gradient-to-br from-[#D94B68] via-[#ab2848] to-[#9E2A4B] px-6 py-10 text-white sm:px-10">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/70">Tự học nhưng không tự mò</div>
            <h2 className="mt-2 max-w-xl text-[32px] font-extrabold leading-tight">Mỗi ngày mở dashboard là biết cần học gì.</h2>
            <p className="mt-3 max-w-xl text-[15px] text-white/85">
              Lộ trình được xây từ mục tiêu JLPT, thời gian còn lại và kết quả gần nhất của bạn.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#9E2A4B]"
            >
              Bắt đầu hành trình JLPT
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
