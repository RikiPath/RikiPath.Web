import { useState } from 'react';
import { Link } from 'react-router-dom';

const CHAT = [
  { who: 'Sato-sensei', text: 'Lan-san, mở đề thử 04 trang 12 giúp mình nhé.' },
  { who: 'Bạn', text: 'Dạ, mình đang xem đoạn 余白 ạ.' },
  { who: 'Sato-sensei', text: 'Tốt. Đọc câu hỏi trước, rồi mới vào đoạn dài.' },
];

const AGENDA = [
  { done: true, text: 'Rà soát 3 câu Dokkai sai' },
  { done: false, text: 'Chiến thuật đọc lướt 余白 / 間' },
  { done: false, text: 'Bài tập わけにはいかない' },
];

export default function ConsultationRoom() {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [tab, setTab] = useState('chat');
  const [hand, setHand] = useState(false);

  return (
    <div className="flex h-[calc(100vh-var(--preview-nav-h,7.5rem))] min-h-[640px] flex-col bg-[#1A1416] text-white" data-page="ConsultationRoom">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D94B68] text-sm font-bold">R</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Riki Room 02 · Sensei Sato</p>
            <p className="text-[11px] text-white/55">Dokkai N3 · Còn 32:18 / 45 phút</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Đang live
          </span>
          <Link
            to="/consultation-session"
            className="rounded-full bg-[#E11D48] px-4 py-1.5 text-xs font-bold hover:bg-[#BE123C]"
          >
            Rời phòng
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <section className="relative min-h-[320px] p-3 sm:p-4">
          <div className="relative h-full overflow-hidden rounded-2xl bg-[#2A2225]">
            <img
              alt="Sensei Sato"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeQs1JxFfsLTtmR-gOF5UoJbHhMNKGkVIRTbhe71GPdYvhqDg2OVZZzIQ29AtMK2S8puC5wcIU61rmjzUi0YW_WTM2hoonhalc1sMGtTQ32ABzquDvZ4RgZanhKA44YTm7AmHQIy9H28nxfO5HdfFeg79rJSbJdvIVekEAkhuXAPo98GUF0uyQKaBp__jaorACItBH6jcu_a0rplCRV5YcVO3cGs6ORN0M4vTfM_ddEaGmdTj8WGB68A"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="material-symbols-outlined text-[16px] text-[#F9A8D4]">videocam</span>
              Sato-sensei
            </div>
            <div className="absolute bottom-4 left-4 max-w-md rounded-xl bg-black/50 px-3 py-2 text-xs backdrop-blur">
              <p className="font-semibold text-[#F9A8D4]">Đang chia sẻ</p>
              <p className="text-white/80">Đề N3-2024-04 · Đoạn 3 · 余白の美意識</p>
            </div>

            <div className="absolute bottom-4 right-4 h-32 w-44 overflow-hidden rounded-xl border border-white/20 bg-[#3A3033] shadow-2xl sm:h-36 sm:w-52">
              {camOn ? (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#4A3038] to-[#2A2225]">
                  <span className="material-symbols-outlined text-5xl text-white/30">person</span>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-white/50">
                  <span className="material-symbols-outlined">videocam_off</span>
                  <span className="text-[10px] font-semibold">Camera tắt</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-2 text-[10px] font-bold">Bạn · Minh Anh</span>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#21181B] lg:border-l lg:border-t-0">
          <div className="flex shrink-0 border-b border-white/10">
            {[
              ['chat', 'Chat'],
              ['agenda', 'Nội dung'],
              ['notes', 'Ghi chú'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  'flex-1 py-3 text-xs font-bold',
                  tab === id ? 'border-b-2 border-[#D94B68] text-white' : 'text-white/45 hover:text-white/80',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'chat' && (
              <ul className="space-y-3">
                {CHAT.map((m) => (
                  <li key={m.text} className={m.who === 'Bạn' ? 'text-right' : ''}>
                    <p className="text-[10px] font-bold text-[#F9A8D4]">{m.who}</p>
                    <p
                      className={[
                        'mt-1 inline-block max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                        m.who === 'Bạn' ? 'bg-[#D94B68] text-white' : 'bg-white/10 text-white/90',
                      ].join(' ')}
                    >
                      {m.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {tab === 'agenda' && (
              <ol className="space-y-3">
                {AGENDA.map((a, i) => (
                  <li key={a.text} className="flex gap-3 text-sm">
                    <span
                      className={[
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold',
                        a.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/70',
                      ].join(' ')}
                    >
                      {a.done ? '✓' : i + 1}
                    </span>
                    <span className={a.done ? 'text-white/45 line-through' : ''}>{a.text}</span>
                  </li>
                ))}
              </ol>
            )}
            {tab === 'notes' && (
              <div className="space-y-3 text-sm text-white/75">
                <p className="font-semibold text-white">Ghi chú buổi</p>
                <p>Câu 24: đọc stem trước. Đừng dịch từng câu trường văn.</p>
                <p>Bài về nhà: 5 câu わけにはいかない — nộp trước thứ 6.</p>
                <textarea
                  className="mt-2 h-28 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#D94B68]"
                  placeholder="Ghi chú thêm..."
                  defaultValue=""
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-[#140F11] px-3 sm:gap-3">
        <Control
          active={micOn}
          icon={micOn ? 'mic' : 'mic_off'}
          label={micOn ? 'Mic' : 'Mic tắt'}
          onClick={() => setMicOn((v) => !v)}
        />
        <Control
          active={camOn}
          icon={camOn ? 'videocam' : 'videocam_off'}
          label={camOn ? 'Cam' : 'Cam tắt'}
          onClick={() => setCamOn((v) => !v)}
        />
        <Control active={false} icon="present_to_all" label="Chia sẻ" />
        <Control
          active={hand}
          icon="back_hand"
          label="Giơ tay"
          onClick={() => setHand((v) => !v)}
        />
        <Link
          to="/consultation-session"
          className="ml-2 inline-flex h-11 items-center gap-2 rounded-full bg-[#E11D48] px-5 text-sm font-bold hover:bg-[#BE123C]"
        >
          <span className="material-symbols-outlined text-[20px]">call_end</span>
          Kết thúc
        </Link>
      </footer>
    </div>
  );
}

function Control({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-11 min-w-11 flex-col items-center justify-center rounded-2xl px-3 text-[10px] font-bold',
        active === false && (icon === 'mic_off' || icon === 'videocam_off')
          ? 'bg-[#E11D48]/20 text-[#FDA4AF]'
          : active
            ? 'bg-white/10 text-white'
            : 'bg-white/5 text-white/70 hover:bg-white/10',
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span className="hidden sm:block">{label}</span>
    </button>
  );
}
