import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const MENTORS = [
  { id: 'sato', name: 'Sensei Sato', jp: '佐藤', badge: 'N1 Master', lang: 'JP / VN', rating: '4.98', reviews: 320, bio: '8 năm đào tạo cấp tốc và phản biện Dokkai.', initial: 'S' },
  { id: 'yuki', name: 'Sensei Yuki', jp: '由紀', badge: 'N2/N1 Expert', lang: 'Song ngữ', rating: '4.92', reviews: 184, bio: 'Phản xạ Kaiwa thương mại và phỏng vấn doanh nghiệp.', initial: 'Y' },
  { id: 'mai', name: 'Sensei Mai', jp: 'Mai', badge: 'N2 Sư phạm', lang: 'Tiếng Việt', rating: '4.88', reviews: 210, bio: 'Tư duy ngữ pháp N2 và kỹ năng đọc lướt Dokkai.', initial: 'M' },
];

const DAYS = [
  { id: '2024-10-02', label: 'T4', date: '02' },
  { id: '2024-10-03', label: 'T5', date: '03' },
  { id: '2024-10-04', label: 'T6', date: '04' },
  { id: '2024-10-05', label: 'T7', date: '05', full: true },
  { id: '2024-10-07', label: 'T2', date: '07' },
];

const SLOTS = {
  '2024-10-02': [
    { id: '09:00', label: '09:00 – 09:45', open: true },
    { id: '14:00', label: '14:00 – 14:45', open: true },
  ],
  '2024-10-03': [
    { id: '10:00', label: '10:00 – 10:45', open: true },
    { id: '15:30', label: '15:30 – 16:15', open: false },
  ],
  '2024-10-04': [
    { id: '09:00', label: '09:00 – 09:45', open: true },
    { id: '10:00', label: '10:00 – 10:45', open: true },
    { id: '14:00', label: '14:00 – 14:45', open: true },
    { id: '15:30', label: '15:30 – 16:15', open: false },
  ],
  '2024-10-05': [],
  '2024-10-07': [
    { id: '19:30', label: '19:30 – 20:15', open: true },
  ],
};

const GOALS = [
  'Đánh giá Dokkai & lộ trình N1 cấp tốc',
  'Chữa phát âm & Kaiwa phỏng vấn',
  'Chiến thuật thi JLPT N2',
  'Chỉnh luận văn / CV tiếng Nhật',
];

function dayTitle(id) {
  const map = {
    '2024-10-02': 'Thứ Tư, 02/10',
    '2024-10-03': 'Thứ Năm, 03/10',
    '2024-10-04': 'Thứ Sáu, 04/10',
    '2024-10-05': 'Thứ Bảy, 05/10',
    '2024-10-07': 'Thứ Hai, 07/10',
  };
  return map[id];
}

export default function BookingSchedule() {
  const { pathname } = useLocation();
  const [mentorId, setMentorId] = useState('sato');
  const [dayId, setDayId] = useState('2024-10-04');
  const [slotId, setSlotId] = useState('10:00');
  const [goal, setGoal] = useState(GOALS[0]);
  const [note, setNote] = useState('');

  const mentor = MENTORS.find((item) => item.id === mentorId);
  const slots = SLOTS[dayId] || [];
  const slot = slots.find((item) => item.id === slotId && item.open);

  const ready = Boolean(mentor && slot);

  const summaryTime = useMemo(() => {
    if (!slot) return 'Chưa chọn khung giờ';
    return `${dayTitle(dayId)} · ${slot.label}`;
  }, [dayId, slot]);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Đặt lịch">
      <div className="px-6 py-8 sm:px-8" data-page="BookingSchedule">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">Tư vấn trực tuyến · 45 phút</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#2D282A]">Đặt lịch video 1-1</h1>
            <p className="mt-1 text-sm text-[#6F6669]">Chọn Sensei, ngày và giờ phù hợp với lịch của bạn.</p>
          </div>
          <ol className="flex items-center gap-2 text-xs font-semibold">
            <li className="rounded-full bg-[#fff0f5] px-3 py-1 text-[#D94B68]">1. Sensei</li>
            <li className="rounded-full bg-[#2D282A] px-3 py-1 text-white">2. Ngày & giờ</li>
            <li className="rounded-full bg-[#FAF7F5] px-3 py-1 text-[#A59B9E]">3. Xác nhận</li>
          </ol>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#2D282A]">Chuyên gia</h2>
                <Link to="/consultation-center" className="text-xs font-semibold text-[#D94B68]">Xem tất cả</Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {MENTORS.map((item) => {
                  const active = item.id === mentorId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMentorId(item.id)}
                      className={`rounded-2xl border p-4 text-left ${
                        active ? 'border-[#D94B68] bg-[#fff8f8]' : 'border-[#eadfd9] bg-[#FAF7F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-[#D94B68]">
                          {item.initial}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#2D282A]">{item.name}</p>
                          <p className="text-[11px] font-semibold text-[#D94B68]">{item.badge}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-[#6F6669]">{item.bio}</p>
                      <p className="mt-2 text-[11px] text-[#A59B9E]">{item.lang} · ★ {item.rating}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#2D282A]">Ngày rảnh · tháng 10/2024</h2>
                <span className="text-[11px] text-[#A59B9E]">GMT+7</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {DAYS.map((day) => {
                  const active = day.id === dayId;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setDayId(day.id);
                        const firstOpen = (SLOTS[day.id] || []).find((item) => item.open);
                        setSlotId(firstOpen?.id || '');
                      }}
                      className={`rounded-2xl px-2 py-3 text-center ${
                        active ? 'bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white' : 'bg-[#FAF7F5] text-[#2D282A]'
                      }`}
                    >
                      <span className={`block text-[11px] font-semibold ${active ? 'text-white/80' : 'text-[#A59B9E]'}`}>{day.label}</span>
                      <span className="mt-1 block text-lg font-extrabold">{day.date}</span>
                      <span className={`mt-1 block text-[10px] ${active ? 'text-white/80' : 'text-[#A59B9E]'}`}>
                        {day.full ? 'Kín' : `${(SLOTS[day.id] || []).filter((s) => s.open).length} trống`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-sm font-bold text-[#2D282A]">{dayTitle(dayId)}</p>
              <div className="mt-3 grid gap-2">
                {slots.length === 0 ? (
                  <p className="rounded-2xl bg-[#FAF7F5] px-4 py-6 text-center text-sm text-[#6F6669]">Ngày này đã kín lịch.</p>
                ) : (
                  slots.map((item) => {
                    const active = item.id === slotId && item.open;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!item.open}
                        onClick={() => setSlotId(item.id)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
                          !item.open
                            ? 'cursor-not-allowed bg-[#f3eeeb] text-[#A59B9E]'
                            : active
                              ? 'bg-[#2D282A] text-white'
                              : 'bg-[#FAF7F5] text-[#2D282A]'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="text-[11px]">{item.open ? (active ? 'Đang chọn' : 'Sẵn sàng') : 'Đã đặt'}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#2D282A]">Chủ đề buổi học</h2>
              <label className="mt-3 block text-xs font-semibold text-[#6F6669]">
                Mục tiêu
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm text-[#2D282A] outline-none focus:border-[#D94B68]"
                >
                  {GOALS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold text-[#6F6669]">
                Tài liệu (tuỳ chọn)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Link Drive, bài mock test…"
                  className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm text-[#2D282A] outline-none placeholder:text-[#C4B8BA] focus:border-[#D94B68]"
                />
              </label>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#2D282A]">Tóm tắt lịch hẹn</h2>
                <span className="rounded-full bg-[#fff0f5] px-2 py-0.5 text-[10px] font-bold text-[#D94B68]">1-1 VIP</span>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FAF7F5] p-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-[#D94B68]">
                  {mentor.initial}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#2D282A]">{mentor.name} ({mentor.jp})</p>
                  <p className="text-xs text-[#6F6669]">{mentor.badge}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#A59B9E]">Thời gian</dt>
                  <dd className="text-right font-semibold text-[#2D282A]">{summaryTime}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#A59B9E]">Nền tảng</dt>
                  <dd className="text-right font-semibold text-[#2D282A]">Google Meet</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#A59B9E]">Mục tiêu</dt>
                  <dd className="text-right font-semibold text-[#2D282A]">{goal}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#A59B9E]">Thanh toán</dt>
                  <dd className="text-right font-semibold text-[#2D282A]">Khấu trừ 1 lượt · còn 4</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fff8f8] px-4 py-3">
                <span className="text-sm text-[#6F6669]">Phí buổi</span>
                <span className="text-lg font-extrabold text-[#D94B68]">0 đ <span className="text-xs font-medium text-[#A59B9E] line-through">450.000 đ</span></span>
              </div>
              <Link
                to={ready ? '/consultation-payment' : '#'}
                aria-disabled={!ready}
                className={`mt-4 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white ${
                  ready ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B]' : 'pointer-events-none bg-[#C4B8BA]'
                }`}
              >
                Xác nhận đặt lịch
              </Link>
              <p className="mt-3 text-center text-[11px] text-[#A59B9E]">Đổi/hủy miễn phí trước 12 giờ.</p>
            </section>
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#2D282A]">Trước giờ học</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-[#6F6669]">
                <li>Kiểm tra micro và camera trước 5 phút.</li>
                <li>Chuẩn bị tài liệu ngữ pháp cần hỏi.</li>
                <li>Vào đúng giờ để giữ tiến độ 45 phút.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
