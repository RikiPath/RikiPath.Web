import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ConsultShell } from '../../components/shells';

const TEMPLATES = [
  {
    id: 'khen',
    label: 'Khen',
    text: '\n\n[Nhận xét]: Sensei ấn tượng khi em viết câu phức và dùng được 「納期」「厳守」. Khi nắm thêm sắc thái chủ quan/khách quan, bài N3 của em sẽ lên điểm tối đa.',
  },
  {
    id: 'tactic',
    label: 'Chiến thuật N3',
    text: '\n\n[Chiến thuật]: Ở dạng đục lỗ liên từ, nếu chủ ngữ là đối tác/khách hàng thì loại ngay đáp án cảm xúc như ～のに, ～てたまらない.',
  },
  {
    id: 'cheer',
    label: 'Động viên',
    text: '\n\nChúc em Trần Thị B giữ nhịp học này. Kỳ tháng 7 tới em sẽ gặt kết quả tốt.',
  },
];

const GRADES = [
  { id: 'A', hint: 'Xuất sắc' },
  { id: 'B', hint: 'Khá' },
  { id: 'C', hint: 'Cần sửa' },
  { id: 'D', hint: 'Chưa đạt' },
];

const DEFAULT_REPLY = `Chào em Trần Thị B, Sensei đã xem kỹ câu tự luận. Đây là chỗ nhiều bạn N3 hay nhầm khi viết trong công việc.

1. Vì sao không dùng「～のに」ở văn phòng?
Cả ～のに và ～にもかかわらず đều là “mặc dù… nhưng…”, nhưng sắc thái khác nhau:
• ～のに: bất mãn, trách móc ngầm. “先月納期を厳守したのに...” nghe như đang hờn đối tác.
• ～にもかかわらず: trung lập, khách quan — chuẩn Business Japanese.

2. Câu chữa mẫu
「先月期日通りに納品いたしましたにもかかわらず、先方より追加修正のご依頼を多数頂戴したため、工程の再調整を余儀なくされております。」
Đổi 狂ってしまいました → 再調整を余儀なくされております để tránh văn nói.`;

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function TextConsultationReply() {
  const { pathname } = useLocation();
  const [reply, setReply] = useState(DEFAULT_REPLY);
  const [grade, setGrade] = useState('B');
  const [rubric, setRubric] = useState(
    'Từ vựng phong phú, câu chặt. Cần tinh tế hơn khi chọn sắc thái ở ngữ cảnh công sở.',
  );
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState('');

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  return (
    <ConsultShell pathname={pathname} breadcrumb="Trả lời văn bản">
      <div
        data-page="TextConsultationReply"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#A18B97]">
              <Link to="/consultation-queue" className={`rounded text-[#A36680] hover:text-[#AD3155] ${focusClass}`}>
                Hàng đợi
              </Link>
              <span>#REQ-2024-88412</span>
              <span className="text-[#A33357]">Khẩn · 1 giờ 15 phút</span>
            </div>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Trả lời văn bản</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`h-9 rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focusClass}`}
            >
              Chuyển Sensei
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(true);
                notify('Đã gửi phản hồi cho Trần Thị B');
              }}
              disabled={sent}
              className={`h-9 rounded-lg px-3 text-[12px] font-medium text-white disabled:bg-emerald-700 ${focusClass} ${
                sent ? '' : 'bg-[#AD3155] hover:bg-[#982B4B]'
              }`}
            >
              {sent ? 'Đã gửi' : 'Gửi lời giải'}
            </button>
          </div>
        </header>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-2xl border border-[#EADFE5] bg-white p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-[#5A3E4C]">Trần Thị B</h2>
              <span className="text-[12px] text-[#AD3155]">N3 · YC #88412</span>
            </div>
            <p className="mt-1 text-[12px] text-[#947B88]">
              ～ものの · ～にもかかわらず · JLPT 7/2025 · 140/180
            </p>

            <p className="mt-4 text-[13px] leading-6 text-[#49353F]">
              Vì sao ở công ty không dùng ～のに mà phải dùng ～にもかかわらず? Cả hai đều là “mặc dù… nhưng”.
            </p>
            <p className="mt-3 rounded-xl bg-[#FAF8F7] px-3 py-3 font-serif text-[14px] leading-7">
              「先月納期を厳守したのに、クライアントから追加の修正要求がたくさん届いたため、今週のスケジュールが狂ってしまいました。」
            </p>
            <p className="mt-2 text-[12px] text-[#A18B97]">bai_tap_tuan_4_kanji.jpg · 2.4 MB · 14:18</p>

            <p className="mt-4 text-[12px] leading-6 text-[#8C7782]">
              Haru AI · NLP 3.2 · văn nói 30% / chuẩn trang trọng 85%. ～のに mang bất mãn, nên chuyển ～にもかかわらず hoặc ～ものの.
            </p>
          </section>

          <div className="space-y-3">
            <section className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
              <div className="flex flex-wrap gap-2 border-b border-[#F0E7EC] px-4 py-3">
                {TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setReply((prev) => `${prev}${item.text}`);
                      notify('Đã chèn mẫu vào cuối bài chữa');
                    }}
                    className={`rounded-full border border-[#EADFE5] px-3 py-1 text-[12px] text-[#6F5C66] hover:border-[#AD3155] hover:text-[#AD3155] ${focusClass}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={12}
                aria-label="Soạn lời giải"
                className="w-full resize-y bg-[#FCFCFD] px-4 py-3 text-[13px] leading-6 outline-none"
              />
              <div className="flex items-center justify-between border-t border-[#F0E7EC] px-4 py-2.5 text-[12px] text-[#8C7782]">
                <span>Phat_am_N3_Business.mp3 · 0:42 · NHK</span>
                <button type="button" className={`font-medium text-[#AD3155] ${focusClass} rounded`}>
                  Phát
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-3 text-[12px] leading-6 text-[#8C7782]">
              <p>Drill #EX-N3-109 · 15 câu ～ものの & ～にもかかわらず · 12 phút</p>
              <p>Flashcard #FC-882 · 10 liên từ thương mại · đã vào sổ Trần Thị B</p>
            </section>

            <section className="rounded-2xl border border-[#EADFE5] bg-white p-4">
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((item) => {
                  const active = grade === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGrade(item.id)}
                      aria-pressed={active}
                      className={`rounded-xl py-2 text-center ${focusClass} ${
                        active ? 'bg-[#AD3155] text-white' : 'bg-[#FAF8F7] text-[#49353F]'
                      }`}
                    >
                      <span className="block text-[16px] font-semibold">{item.id}</span>
                      <span className={`text-[10px] ${active ? 'text-white/85' : 'text-[#A18B97]'}`}>{item.hint}</span>
                    </button>
                  );
                })}
              </div>
              <input
                value={rubric}
                onChange={(event) => setRubric(event.target.value)}
                aria-label="Ghi chú rubric"
                className={`mt-3 w-full rounded-xl border border-[#EADFE5] bg-[#FCFCFD] px-3 py-2 text-[13px] outline-none ${focusClass}`}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className={`h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] text-[#866777] ${focusClass}`}>
                  Lưu nháp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSent(true);
                    notify('Đã gửi phản hồi cho Trần Thị B');
                  }}
                  disabled={sent}
                  className={`h-9 rounded-lg bg-[#3F3038] px-3 text-[12px] font-medium text-white disabled:bg-emerald-700 ${focusClass}`}
                >
                  {sent ? 'Đã ký duyệt' : 'Ký duyệt'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-40 rounded-xl border border-[#EADFE5] bg-white px-4 py-3 text-[13px] text-[#49353F] shadow-lg">
          {toast}
        </div>
      ) : null}
    </ConsultShell>
  );
}
