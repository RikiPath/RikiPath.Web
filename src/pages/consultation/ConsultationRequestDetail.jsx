import { useState } from 'react';
import { ConsultShell } from '../../components/shells';
import { useLocation } from 'react-router-dom';

const SKILLS = [
  { label: 'Từ vựng / Hán tự', score: 35, note: 'Đạt yêu cầu cơ bản', tone: 'ok' },
  { label: 'Ngữ pháp', score: 28, note: 'Cần củng cố liên từ', tone: 'mid' },
  { label: 'Đọc hiểu', score: 22, note: 'Nguy cơ liệt · trọng tâm buổi', tone: 'alert' },
  { label: 'Nghe hiểu', score: 30, note: 'Phản xạ câu ngắn tốt', tone: 'ok' },
];

const WEAK_WORDS = [
  { word: '妥協', reading: 'だきょう', meaning: 'Thỏa hiệp — nhầm với thỏa thuận', miss: '3/4' },
  { word: '促す', reading: 'うながす', meaning: 'Thúc đẩy — hay quên nghĩa', miss: '4/5' },
  { word: '矛盾', reading: 'むじゅん', meaning: 'Mâu thuẫn — sai ghép cụm', miss: '3/5' },
];

const SCOPES = [
  ['Chiến lược đọc hiểu N2', 'Định vị từ khóa ở bài trường văn'],
  ['Quản lý thời gian phòng thi', 'Phân bổ 105 phút từ vựng · ngữ pháp · đọc'],
  ['Lỗ hổng từ vựng / ngữ pháp', 'Liên từ và từ trừu tượng cản tốc độ đọc'],
];

const SUBMISSIONS = [
  {
    date: '12/10',
    time: '21:40',
    kind: 'Đọc hiểu dài',
    issue: 'Sai đại từ chỉ thị (これ / それ)',
    note: 'Chọn đáp án ở câu ngay trước, không quét lại đầu đoạn. Tốc độ 140 chữ/phút (chuẩn N2 ~200).',
    tone: 'alert',
  },
  {
    date: '08/10',
    time: '14:15',
    kind: 'Ngữ pháp N2',
    issue: 'Nhầm にしては và にしても',
    note: 'Sai 4/5 câu đánh giá chủ quan vs giả định. Nên phân biệt sắc thái ngữ cảnh.',
    tone: 'mid',
  },
  {
    date: '04/10',
    time: '20:05',
    kind: 'Đọc hiểu trung',
    issue: 'Đúng 3/3 nhưng lố 3 phút',
    note: 'Ý chính tốt, mất 12 phút (chuẩn 7–8). Thiếu giờ cho trường văn cuối đề.',
    tone: 'ok',
  },
];

const TEMPLATES = [
  'Chiến thuật skimming đọc hiểu',
  'Phân bổ 105 phút thi N2',
  'Phân biệt にしては / にしても',
];

function toneBar(tone) {
  if (tone === 'alert') return 'bg-[#D94B68]';
  if (tone === 'mid') return 'bg-amber-400';
  return 'bg-emerald-500';
}

function SkillRow({ label, score, note, tone }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone === 'alert' ? 'border-[#f8bbd0] bg-[#fff8f8]' : 'border-[#f0e8e4] bg-[#FAF7F5]'}`}>
      <div className="flex items-center justify-between text-sm">
        <span className={`font-semibold ${tone === 'alert' ? 'text-[#9E2A4B]' : 'text-[#2D282A]'}`}>{label}</span>
        <span className="font-extrabold text-[#2D282A]">{score}<span className="text-xs font-medium text-[#A59B9E]">/60</span></span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadfd9]">
        <div className={`h-full rounded-full ${toneBar(tone)}`} style={{ width: `${(score / 60) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-[#6F6669]">{note}</p>
    </div>
  );
}

export default function ConsultationRequestDetail() {
  const { pathname } = useLocation();
  const [note, setNote] = useState('');

  return (
    <ConsultShell pathname={pathname} breadcrumb="Yêu cầu">
      <div className="px-6 py-8 sm:px-8" data-page="ConsultationRequestDetail">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">Phiếu tư vấn</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#2D282A]">Yêu cầu của Nguyễn Văn A</h1>
            <p className="mt-1 text-sm text-[#6F6669]">Gói 45 phút · hôm nay 19:30–20:15 · mục tiêu N2 tháng 12</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm font-semibold text-[#6F6669]">Từ chối</button>
            <button type="button" className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-4 py-2 text-sm font-semibold text-white">Nhận buổi</button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#f8bbd0] bg-[#fff8f8] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffd9e4] text-[#D94B68]">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-[#2D282A]">Đã ủy quyền dữ liệu học tập</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#D94B68]">Có thời hạn</span>
              </div>
              <p className="mt-1 max-w-2xl text-xs text-[#6F6669]">
                Học viên chia sẻ mock test, flashcard 7 ngày và nhật ký Haru AI để buổi tư vấn bám đúng chỗ yếu.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-[#f8bbd0] bg-white px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#A59B9E]">Hết hạn sau</p>
            <p className="font-mono text-sm font-extrabold text-[#D94B68]">23:45:12</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f5] text-xl font-extrabold text-[#D94B68]">A</div>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-[#D94B68] px-1.5 text-[10px] font-bold text-white">N2</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-[#2D282A]">Nguyễn Văn A</h2>
                  <p className="text-xs text-[#A59B9E]">ID 88291 · Khóa N2 Tăng tốc</p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Streak 28 ngày
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-[#FAF7F5] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6F6669]">Mục tiêu JLPT</span>
                  <span className="font-bold text-[#9E2A4B]">N2 · 12/2024</span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#6F6669]">
                    <span>Tiến độ khóa</span>
                    <span>64%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eadfd9]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#D94B68] to-[#F8BBD0]" style={{ width: '64%' }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#2D282A]">Câu hỏi của học viên</h3>
              <blockquote className="mt-3 rounded-2xl border-l-4 border-[#D94B68] bg-[#fff8f8] px-4 py-3 text-sm leading-relaxed text-[#2D282A]">
                Em đang kẹt phần đọc hiểu N2, nhất là bài trường văn. Em cũng chưa biết chia 105 phút cho hợp lý. Thầy/cô tư vấn chiến thuật và cách luyện giúp em.
              </blockquote>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#A59B9E]">Phạm vi buổi</p>
              <ul className="mt-2 space-y-2">
                {SCOPES.map(([title, hint]) => (
                  <li key={title} className="flex gap-3 rounded-2xl bg-[#FAF7F5] px-3 py-2.5">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#2D282A]">{title}</p>
                      <p className="text-[11px] text-[#6F6669]">{hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2D282A]">Từ vựng 7 ngày</h3>
                <span className="text-[11px] font-medium text-[#A59B9E]">Flashcard</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#FAF7F5] p-3">
                  <p className="text-[11px] text-[#A59B9E]">Đã học</p>
                  <p className="mt-1 text-xl font-extrabold">145 <span className="text-xs font-medium text-[#6F6669]">từ</span></p>
                </div>
                <div className="rounded-2xl bg-[#FAF7F5] p-3">
                  <p className="text-[11px] text-[#A59B9E]">Ghi nhớ</p>
                  <p className="mt-1 text-xl font-extrabold text-emerald-700">78%</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#D94B68]">Từ hay quên</p>
              <div className="mt-2 space-y-2">
                {WEAK_WORDS.map((item) => (
                  <div key={item.word} className="flex items-center justify-between rounded-2xl border border-[#f8bbd0] bg-[#fff8f8] px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-[#2D282A]">{item.word} <span className="font-medium text-[#A59B9E]">{item.reading}</span></p>
                      <p className="text-[11px] text-[#6F6669]">{item.meaning}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#D94B68]">Sai {item.miss}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#2D282A]">Mock test gần nhất</h3>
                  <p className="mt-0.5 text-xs text-[#A59B9E]">JLPT N2 đề #04 · 12/10 · thang JEES</p>
                </div>
                <div className="rounded-2xl bg-[#fff8f8] px-3 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase text-[#A59B9E]">Tổng điểm</p>
                  <p className="text-xl font-extrabold text-[#D94B68]">115<span className="text-sm font-medium text-[#A59B9E]">/180</span></p>
                  <p className="text-[10px] font-bold text-amber-600">Sát chuẩn đạt</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2.5">
                {SKILLS.map((skill) => <SkillRow key={skill.label} {...skill} />)}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white">
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#2D282A]">Haru AI · bài đã chia sẻ</h3>
                  <p className="text-xs text-[#A59B9E]">Chẩn đoán theo từng lần nộp</p>
                </div>
              </div>
              <div className="space-y-3">
                {SUBMISSIONS.map((row) => (
                  <article key={`${row.date}-${row.kind}`} className="rounded-2xl border border-[#f0e8e4] bg-[#FAF7F5] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        row.tone === 'alert' ? 'bg-[#fff0f5] text-[#D94B68]' : row.tone === 'mid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>{row.kind}</span>
                      <span className="text-[11px] text-[#A59B9E]">{row.date} · {row.time}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#2D282A]">{row.issue}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6F6669]">{row.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#2D282A]">Ghi chú của Sensei</h3>
              <p className="mt-0.5 text-xs text-[#A59B9E]">Chỉ bạn thấy trước khi vào phòng</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATES.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setNote((prev) => (prev ? `${prev}\n• ${label}` : `• ${label}`))}
                    className="rounded-full border border-[#eadfd9] bg-[#FAF7F5] px-3 py-1 text-[11px] font-semibold text-[#6F6669] hover:border-[#D94B68] hover:text-[#D94B68]"
                  >
                    + {label}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                placeholder="1. Trấn an: từ vựng 35 và nghe 30 là nền tốt.&#10;2. Đọc câu hỏi trước, khoanh đại từ trong 2 câu lân cận.&#10;3. Cắt từ vựng còn 25 phút, dành 65 phút cho đọc."
                className="mt-3 w-full resize-none rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-4 py-3 text-sm text-[#2D282A] outline-none placeholder:text-[#C4B8BA] focus:border-[#D94B68] focus:ring-2 focus:ring-[#D94B68]/15"
              />
              <div className="mt-3 flex justify-end">
                <button type="button" className="rounded-full bg-[#2D282A] px-4 py-2 text-sm font-semibold text-white">Lưu vào hồ sơ</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConsultShell>
  );
}
