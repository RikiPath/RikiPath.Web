import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell, ConsultShell } from '../../components/shells';
import { getChatThreads, getChatThread, getChatMessages } from '../../api/mentorChatApi.js';
import { createMentorChatConnection } from '../../services/mentorChatHub.js';

const merge = (old, incoming) => [...new Map([...old, ...incoming].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id);
const date = value => value ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`) : null;
const time = value => date(value)?.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) || '';

export default function MentorPrivateChat() {
  const { user, isMentor } = useAuth();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('bookingId')) || null;
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [status, setStatus] = useState('Đang kết nối');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const hubRef = useRef(null);
  const activeRef = useRef(selectedId);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const thread = threads.find(t => t.bookingId === selectedId);
  const peer = t => isMentor ? t.learnerName : t.mentorName;
  const Shell = isMentor ? ConsultShell : LearnerShell;

  const refresh = useCallback(async () => {
    const result = await getChatThreads();
    setThreads(result || []);
    setThreadsLoading(false);
    return result || [];
  }, []);

  useEffect(() => {
    setThreadsLoading(false);
    setLoading(false);
    setStatus('Chưa có API');
    setError('Backend chưa có API tin nhắn 1–1.');
  }, []);

  useEffect(() => {
    let cancelled = false;
    activeRef.current = selectedId;
    (async () => {
      // Reset when the asynchronous history subscription changes booking.
      await Promise.resolve();
      if (cancelled) return;
      setMessages([]); setDraft(''); setLoading(true); setHasOlder(false);
      setError('Backend chưa có API tin nhắn 1–1.');
      setLoading(false);
      return;
      try {
        const [detail, history] = await Promise.all([getChatThread(selectedId), getChatMessages(selectedId)]);
        if (cancelled) return;
        if (detail.bookingId !== selectedId) {
          setParams({ bookingId: String(detail.bookingId) }, { replace: true });
          return;
        }
        setThreads(old => [...old.filter(t => t.bookingId !== selectedId), detail]);
        setMessages(old => merge(old, history)); setHasOlder(history.length === 50);
        const hub = hubRef.current;
        if (hub?.state === 'Connected') {
          await hub.invoke('JoinBookingChat', selectedId);
          if (cancelled) return;
          // Fetch again after joining to close the history/subscription gap.
          const latest = await getChatMessages(selectedId);
          if (cancelled) return;
          setMessages(old => merge(old, latest));
          if (document.visibilityState === 'visible') {
            await hub.invoke('MarkRead', selectedId);
            if (!cancelled) setThreads(old => old.map(t => t.bookingId === selectedId ? { ...t, unreadCount: 0 } : t));
          }
        }
      } catch (e) { if (!cancelled) setError(e.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length, selectedId]);

  async function loadOlder() {
    const id = selectedId;
    const list = listRef.current;
    const height = list?.scrollHeight || 0;
    setHistoryLoading(true);
    try {
      const older = await getChatMessages(id, messages[0]?.id);
      if (activeRef.current !== id) return;
      setMessages(old => merge(old, older)); setHasOlder(older.length === 50);
      requestAnimationFrame(() => { if (list && activeRef.current === id) list.scrollTop = list.scrollHeight - height; });
    } catch (e) { setError(e.message); }
    finally { setHistoryLoading(false); }
  }

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !thread?.canSendMessages || status !== 'Đã kết nối') return;
    const id = selectedId;
    setSending(true); setError('');
    try {
      await hubRef.current.invoke('SendChatMessage', id, { text });
      if (activeRef.current === id) setDraft('');
    } catch (e) {
      if (activeRef.current === id) setError(`${e.message} Nội dung được giữ lại; kiểm tra lịch sử trước khi gửi lại.`);
      refresh().catch(() => {});
    } finally { setSending(false); }
  }

  const canSend = thread?.canSendMessages && (!thread.endsAt || date(thread.endsAt) > new Date());
  const sorted = [...threads].sort((a, b) => (date(b.lastMessage?.sentAt || b.scheduledAt)?.getTime() || 0) - (date(a.lastMessage?.sentAt || a.scheduledAt)?.getTime() || 0));
  return (
    <Shell pathname={pathname} breadcrumb="Tin nhắn 1–1">
      <div className="mx-auto max-w-7xl p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-[#D94B68]">Đồng hành cùng Sensei</p><h1 className="mt-1 text-2xl font-bold">Tin nhắn 1–1</h1><p className="mt-1 text-sm text-[#6F6669]">Một cuộc trò chuyện với mỗi mentor. Gửi tin trong thời hạn gói; hết hạn vẫn xem được lịch sử.</p></div>
          <div className="flex items-center gap-2 text-xs"><span role="status" className={`rounded-full px-3 py-2 ${status === 'Đã kết nối' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{status}</span>{status === 'Mất kết nối' && <button onClick={() => window.location.reload()} className="underline">Kết nối lại</button>}</div>
        </div>
        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-[#eadfd9] bg-white shadow-sm md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-[#eadfd9] md:border-r md:border-b-0">
            <div className="border-b border-[#eadfd9] p-4"><h2 className="mb-3 font-bold">Cuộc trò chuyện <span className="text-[#A59B9E]">({threads.length})</span></h2><input aria-label="Tìm cuộc trò chuyện" placeholder={isMentor ? 'Tìm học viên…' : 'Tìm mentor…'} value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl bg-[#FAF7F5] px-3 py-2 text-sm" /></div>
            <div className="max-h-64 overflow-y-auto md:max-h-[580px]">
              {threadsLoading && status !== 'Mất kết nối' && <p role="status" className="p-5 text-sm text-[#6F6669]">Đang tải cuộc trò chuyện…</p>}
              {!threadsLoading && !threads.length && <div className="p-5 text-sm leading-6 text-[#6F6669]">Chưa có cuộc trò chuyện. Chat sẽ xuất hiện khi lịch hẹn đã thanh toán có mentor được gán.<Link to={isMentor ? '/work-schedule/' : '/mentor/'} className="mt-3 block font-semibold text-[#D94B68]">{isMentor ? 'Xem lịch làm việc' : 'Đặt lịch với mentor'} →</Link></div>}
              {sorted.filter(t => (peer(t) || '').toLowerCase().includes(search.toLowerCase())).map(t => <button key={t.bookingId} onClick={() => setParams({ bookingId: t.bookingId })} className={`flex w-full gap-3 border-b border-[#f3ece8] p-4 text-left ${selectedId === t.bookingId ? 'bg-[#fff0f5]' : 'hover:bg-[#FAF7F5]'}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f9dce5] font-bold text-[#9E2A4B]">{(peer(t) || '?').slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-sm">{peer(t) || 'Chưa có mentor'}</strong>{t.unreadCount > 0 && <span className="rounded-full bg-[#D94B68] px-2 text-xs text-white">{t.unreadCount}</span>}</span><span className="mt-1 block truncate text-xs text-[#6F6669]">{t.lastMessage?.text || 'Bắt đầu cuộc trò chuyện'}</span><span className="mt-1 block text-[11px] text-[#A59B9E]">Lịch hẹn #{t.bookingId} · {time(t.scheduledAt)}</span></span>
              </button>)}
            </div>
          </aside>
          <section className="flex min-w-0 flex-col">
            {!selectedId ? <div className="flex flex-1 flex-col items-center justify-center p-10 text-center"><span className="material-symbols-outlined mb-4 text-5xl text-[#D94B68]">forum</span><h2 className="text-lg font-bold">Chọn cuộc trò chuyện</h2><p className="mt-2 text-sm text-[#6F6669]">Chọn lịch hẹn để trao đổi với {isMentor ? 'học viên' : 'mentor'} của bạn.</p></div> : <>
              <header className="border-b border-[#eadfd9] p-5"><h2 className="font-bold">{thread ? peer(thread) || 'Cuộc trò chuyện' : 'Đang tải cuộc trò chuyện…'}</h2><p className="mt-1 text-xs text-[#6F6669]">Lịch hẹn #{selectedId} · {time(thread?.scheduledAt)}{thread && ` · ${canSend ? 'Có thể nhắn tin' : 'Chỉ xem lịch sử'}`}</p></header>
              <div ref={listRef} role="log" aria-label="Lịch sử tin nhắn" aria-live="polite" className="h-[420px] flex-1 space-y-4 overflow-y-auto bg-[#fdfaf8] p-5 md:max-h-[55vh]">
                {hasOlder && <button disabled={historyLoading} onClick={loadOlder} className="mx-auto block text-sm font-semibold text-[#D94B68]">{historyLoading ? 'Đang tải…' : 'Tải tin nhắn cũ'}</button>}
                {loading && <p role="status" className="text-center text-sm text-[#6F6669]">Đang tải lịch sử…</p>}
                {!loading && !messages.length && thread && <p className="py-10 text-center text-sm text-[#6F6669]">{canSend ? 'Chưa có tin nhắn. Hãy gửi lời chào đầu tiên.' : 'Cuộc trò chuyện này chưa có tin nhắn.'}</p>}
                {messages.map(m => { const self = Number(m.senderUserId) === Number(user?.userId); return <div key={m.id} className={`flex ${self ? 'justify-end' : 'justify-start'}`}><div className="max-w-[85%] sm:max-w-[75%]">{!self && <p className="mb-1 text-xs text-[#6F6669]">{m.senderName}</p>}<p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${self ? 'rounded-br-sm bg-[#9E2A4B] text-white' : 'rounded-bl-sm border border-[#eadfd9] bg-white'}`}>{m.text}</p><p className={`mt-1 text-[10px] text-[#8e8185] ${self ? 'text-right' : ''}`}>{time(m.sentAt)}{self && ` · ${m.readAt ? 'Đã đọc' : 'Đã gửi'}`}</p></div></div>; })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="border-t border-[#eadfd9] p-4">
                {thread && !canSend && <p className="mb-3 text-xs text-[#6F6669]">Gói tư vấn đã hết hạn hoặc chưa có gói hợp lệ. Bạn vẫn có thể xem lịch sử.</p>}
                <div className="flex items-end gap-3"><textarea aria-label="Nội dung tin nhắn" rows={2} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} disabled={!canSend || sending} placeholder="Nhập tin nhắn…" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} className="min-w-0 flex-1 resize-none rounded-xl border border-[#eadfd9] p-3 text-sm focus:outline-[#D94B68] disabled:bg-gray-50" /><button type="submit" disabled={!canSend || status !== 'Đã kết nối' || sending || !draft.trim()} className="rounded-xl bg-[#9E2A4B] px-5 py-3 font-semibold text-white disabled:opacity-40">{sending ? 'Đang gửi…' : 'Gửi'}</button></div>
                <p className="mt-2 text-[11px] text-[#A59B9E]">Enter để gửi · Shift + Enter xuống dòng <span className="float-right">{draft.length}/2000</span></p>
              </form>
            </>}
          </section>
        </div>
      </div>
    </Shell>
  );
}
