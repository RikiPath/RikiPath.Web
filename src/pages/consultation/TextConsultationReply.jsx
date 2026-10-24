import { useState } from 'react';
import { ConsultShell } from '../../components/shells';
import { Link, useLocation } from 'react-router-dom';

const TEMPLATES = [];

const GRADES = [
  { id: 'A', hint: 'Xuất sắc' },
  { id: 'B', hint: 'Khá · đạt' },
  { id: 'C', hint: 'Cần sửa' },
  { id: 'D', hint: 'Chưa đạt' },
];

const DEFAULT_REPLY = '';

export default function TextConsultationReply() {
  const { pathname } = useLocation();
  const [reply, setReply] = useState(DEFAULT_REPLY);
  const [grade, setGrade] = useState('');
  const [rubric, setRubric] = useState('');
  const [sent] = useState(false);
  const [toast, setToast] = useState('');

  const notify = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2800);
  };



  return (
    <ConsultShell pathname={pathname} breadcrumb="Trả lời văn bản">
      <div className="px-6 py-8 sm:px-8" data-page="TextConsultationReply">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#A59B9E]">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to="/consultation-queue" className="hover:text-[#D94B68]">Hàng đợi</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="rounded-full bg-[#fff0f5] px-2 py-0.5 font-bold text-[#D94B68]">—</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f8bbd0] bg-[#fff8f8] px-3 py-1 font-semibold text-[#D94B68]">
            <span className="material-symbols-outlined text-[16px]">timer</span>
            —
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">Mục này chưa có dữ liệu.</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#2D282A]">Trả lời văn bản</h1>
            <p className="mt-1 text-sm text-[#6F6669]">—</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm font-semibold text-[#6F6669]">
              Chuyển Sensei khác
            </button>
            <button
              type="button"
              onClick={() => notify('Mục này chưa có dữ liệu.')}
              disabled={sent}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                sent ? 'bg-emerald-600' : 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B]'
              }`}
            >
              {sent ? 'Đã gửi' : 'Gửi lời giải & hoàn tất'}
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.15fr)]">
          <div className="space-y-5">
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f5] text-lg font-extrabold text-[#D94B68]">B</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#2D282A]">—</h2>
                    <span className="rounded-full bg-[#fff0f5] px-2 py-0.5 text-[10px] font-bold text-[#D94B68]">—</span>
                  </div>
                  <p className="text-xs text-[#A59B9E]">—</p>
                </div>
                <span className="rounded-full bg-[#FAF7F5] px-2 py-1 text-[10px] font-bold text-[#6F6669]">—</span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#FAF7F5] px-4 py-3">
                <span className="text-sm text-[#6F6669]">Chuyên đề</span>
                <span className="text-sm font-bold text-[#9E2A4B]">—</span>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2D282A]">Thắc mắc của học viên</h3>
                <span className="text-[11px] text-[#A59B9E]">—</span>
              </div>
              <blockquote className="mt-3 rounded-2xl border-l-4 border-[#D94B68] bg-[#fff8f8] px-4 py-3 text-sm leading-relaxed text-[#2D282A]">—</blockquote>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#A59B9E]">—</p>
              <p className="mt-2 rounded-2xl bg-[#FAF7F5] px-4 py-3 font-serif text-sm leading-relaxed text-[#2D282A]">—</p>
              <div className="mt-3 flex h-28 items-end rounded-2xl bg-gradient-to-br from-[#fff0f5] to-[#eadfd9] px-4 py-3">
                <p className="text-[11px] font-semibold text-[#6F6669]">—</p>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2D282A]">Haru AI chẩn đoán</h3>
                <span className="rounded-full bg-[#fff0f5] px-2 py-0.5 text-[10px] font-bold text-[#D94B68]">—</span>
              </div>
              <div className="rounded-2xl bg-[#FAF7F5] p-4">
                <p className="text-sm font-semibold text-[#9E2A4B]">—</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#6F6669]">
                      <span>Chuẩn trang trọng</span>
                      <span className="text-emerald-700">—</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eadfd9]">
                      <div className="h-full w-0 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#6F6669]">
                      <span>Câu học viên</span>
                      <span className="text-[#D94B68]">—</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eadfd9]">
                      <div className="h-full w-0 rounded-full bg-[#D94B68]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-[#f8bbd0] bg-[#fff8f8] p-3">
                <p className="text-sm font-bold text-[#9E2A4B]">—</p>
                <p className="mt-1 text-xs text-[#6F6669]">—</p>
              </div>
              <div className="mt-2 rounded-2xl bg-[#FAF7F5] p-3">
                <p className="text-sm font-bold text-[#2D282A]">—</p>
                <p className="mt-1 text-xs text-[#6F6669]">—</p>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#2D282A]">Mẫu phản hồi nhanh</h3>
                <span className="text-[11px] text-[#A59B9E]">Bấm để chèn cuối bài</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => notify('Mục này chưa có dữ liệu.')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfd9] bg-[#FAF7F5] px-3 py-1.5 text-[11px] font-semibold text-[#6F6669] hover:border-[#D94B68] hover:text-[#D94B68]"
                  >
                    <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#eadfd9] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#f0e8e4] px-5 py-3">
                <h3 className="text-sm font-bold text-[#2D282A]">Soạn lời giải</h3>
                <span className="text-[11px] text-[#A59B9E]">—</span>
              </div>
              <textarea
                value={reply}
                onChange={event => setReply(event.target.value)}
                rows={14}
                className="w-full resize-none bg-[#FAF7F5] px-5 py-4 text-sm leading-relaxed text-[#2D282A] outline-none"
              />
              <div className="flex items-center justify-between border-t border-[#f0e8e4] px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#2D282A]">—</p>
                  <p className="text-[11px] text-[#A59B9E]">—</p>
                </div>
                <button type="button" className="rounded-full bg-[#fff0f5] px-3 py-1.5 text-xs font-bold text-[#D94B68]">
                  Phát
                </button>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#2D282A]">Lộ trình bổ trợ</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl bg-[#FAF7F5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#D94B68]">—</p>
                  <p className="mt-1 text-sm font-semibold text-[#2D282A]">—</p>
                  <p className="mt-2 text-[11px] text-[#A59B9E]">—</p>
                </article>
                <article className="rounded-2xl bg-[#FAF7F5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#D94B68]">—</p>
                  <p className="mt-1 text-sm font-semibold text-[#2D282A]">—</p>
                  <p className="mt-2 text-[11px] text-[#A59B9E]">—</p>
                </article>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#2D282A]">Chấm bài</h3>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {GRADES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGrade(item.id)}
                    className={`rounded-2xl px-2 py-3 text-center ${
                      grade === item.id
                        ? 'bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white'
                        : 'bg-[#FAF7F5] text-[#2D282A]'
                    }`}
                  >
                    <span className="block text-xl font-extrabold">{item.id}</span>
                    <span className={`text-[10px] font-semibold ${grade === item.id ? 'text-white/80' : 'text-[#A59B9E]'}`}>{item.hint}</span>
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-[#A59B9E]">Ghi chú rubric</label>
              <input
                value={rubric}
                onChange={event => setRubric(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#2D282A] outline-none focus:border-[#D94B68] focus:ring-2 focus:ring-[#D94B68]/15"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-[#A59B9E]">—</p>
                <div className="flex gap-2">
                  <button type="button" className="rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm font-semibold text-[#6F6669]">
                    Lưu nháp
                  </button>
                  <button
                    type="button"
                    onClick={() => notify('Mục này chưa có dữ liệu.')}
                    disabled={sent}
                    className="rounded-full bg-[#2D282A] px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-700"
                  >
                    {sent ? 'Đã ký duyệt' : 'Ký duyệt & xuất'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-40 rounded-2xl border border-[#eadfd9] bg-white px-4 py-3 text-sm font-semibold text-[#2D282A] shadow-lg">
          {toast}
        </div>
      ) : null}
    </ConsultShell>
  );
}
