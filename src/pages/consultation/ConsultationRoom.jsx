import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useWebRtcMeeting } from '../../hooks/useWebRtcMeeting.js';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Hand,
  MessageSquare,
  PhoneOff,
  Copy,
  Check,
  Layers,
  BookOpen,
  FileText,
  Send,
  Radio,
  Wifi,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export default function ConsultationRoom() {
  const { roomId: pathRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const roomId = pathRoomId || searchParams.get('roomId') || 'mentor-room-n3-dokkai';

  const currentUser = {
    id: user?.id || 'user-anon',
    name: user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'Minh Anh'),
    role: user?.primaryRole || (user?.roles && user.roles[0]) || 'Learner',
  };

  const {
    connectionStatus,
    webrtcState,
    localStream,
    remoteStream,
    remoteUser,
    isMicOn,
    isCamOn,
    isScreenSharing,
    isHandRaised,
    chatMessages,
    error,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    toggleHandRaise,
    sendChatMessage,
  } = useWebRtcMeeting(roomId, currentUser);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [activeTab, setActiveTab] = useState('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [layoutMode, setLayoutMode] = useState('speaker');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [agendaList, setAgendaList] = useState([
    { id: 1, text: 'Phân tích 3 câu Dokkai N3 khó - Đề tháng 12/2024', done: true },
    { id: 2, text: 'Chiến thuật đọc lướt tìm từ khóa: 余白 / 間', done: false },
    { id: 3, text: 'Luyện cấu trúc ngữ pháp: 〜わけにはいかない', done: false },
    { id: 4, text: 'Hỏi đáp & Định hướng lộ trình 1-on-1', done: false },
  ]);

  const [sharedNotes, setSharedNotes] = useState(
    '【Ghi chú từ Sensei】\n- Lưu ý các liên từ chuyển ý: しかし, ところが, それに対して.\n- Khi gặp bài đọc dài, scan nhanh câu đầu và câu cuối của từng đoạn để nắm ý chính.'
  );

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendChatMessage(inputMessage);
    setInputMessage('');
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/consultation-room?roomId=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const toggleAgendaItem = (id) => {
    setAgendaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const senseiName = remoteUser?.name || 'Sato-sensei';
  const live = connectionStatus === 'connected';

  const controlBtn = (on, danger) =>
    [
      'flex h-12 w-12 items-center justify-center rounded-2xl transition-all',
      on
        ? 'bg-[#FAF4F2] text-[#2D282A] hover:bg-white'
        : danger
          ? 'bg-[#D94B68] text-white shadow-md shadow-[#D94B68]/30'
          : 'bg-[#fff0f5] text-[#D94B68]',
    ].join(' ');

  return (
    <div
      className="flex h-screen min-h-[640px] flex-col overflow-hidden bg-transparent text-[#2D282A]"
      data-page="WebRtcConsultationRoom"
    >
      <header className="z-20 flex h-[72px] shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white shadow-md shadow-[#D94B68]/25">
            <span className="material-symbols-outlined text-[22px]">local_florist</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] font-extrabold tracking-tight">
                Phòng cố vấn · {senseiName}
              </h1>
              <span className="rounded-full bg-[#fff0f5] px-2.5 py-0.5 text-[10px] font-bold text-[#D94B68]">
                JLPT N3
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-[#8A8084]">
              <span className="truncate font-mono">{roomId}</span>
              <span className="h-1 w-1 rounded-full bg-[#dfbfc1]" />
              <span className={live ? 'flex items-center gap-1 text-emerald-600' : 'flex items-center gap-1 text-amber-600'}>
                {live ? <Wifi className="h-3 w-3" /> : <Radio className="h-3 w-3 animate-pulse" />}
                {live ? 'Đang kết nối' : 'Sẵn sàng gọi'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleCopyInviteLink}
            type="button"
            className="hidden items-center gap-1.5 rounded-full border border-[#dfbfc1]/50 bg-white px-3.5 py-2 text-xs font-bold text-[#6F6669] shadow-sm hover:text-[#D94B68] sm:flex"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Đã chép link</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Mời tham gia</span>
              </>
            )}
          </button>
          <button
            onClick={toggleFullScreen}
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfbfc1]/50 bg-white text-[#6F6669] shadow-sm hover:text-[#D94B68]"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => navigate('/consultation')}
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#D94B68]/25"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>Rời phòng</span>
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden px-4 pb-4 sm:px-6 lg:grid-cols-[1fr_380px]">
        <section className="relative flex min-h-0 flex-col">
          {error && (
            <div className="absolute left-4 right-4 top-4 z-30 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800 shadow-sm">
              <span className="font-bold">Thông báo</span>
              <span>{error}</span>
            </div>
          )}

          <div
            className={`relative min-h-0 flex-1 overflow-hidden rounded-[28px] bg-[#1A1416] shadow-[0_24px_60px_-28px_rgba(45,40,42,0.45)] ${
              layoutMode === 'grid' ? 'grid grid-cols-1 gap-3 p-3 sm:grid-cols-2' : ''
            }`}
          >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-3xl font-black text-white shadow-lg shadow-[#D94B68]/30">
                      {senseiName.charAt(0)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#1A1416] bg-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{senseiName}</h3>
                    <p className="mt-1 text-xs font-medium text-white/55">Cố vấn · đang chờ camera Sensei</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/60">
                    Kết nối: {webrtcState}
                  </div>
                </div>
              )}

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {senseiName}
              </div>
            </div>

            <div
              className={
                layoutMode === 'speaker'
                  ? 'absolute bottom-5 right-5 z-10 h-36 w-52 overflow-hidden rounded-[22px] border border-white/20 bg-[#2C2226] shadow-2xl sm:h-40 sm:w-60'
                  : 'relative h-full w-full overflow-hidden rounded-[22px] bg-[#2C2226]'
              }
            >
              {isCamOn && localStream?.getVideoTracks?.().some((t) => t.readyState === 'live' && t.enabled) ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={toggleCam}
                  className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#3D2930] to-[#221A1D] text-white/70 hover:text-white"
                >
                  <VideoOff className="h-6 w-6 text-white/50" />
                  <span className="text-[11px] font-semibold">Bấm để bật camera</span>
                </button>
              )}
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-xl bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                <span className="truncate">Bạn · {currentUser.name}</span>
                {isMicOn ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-rose-300" />}
              </div>
            </div>
          </div>

          <div className="rp-catalog-card mx-auto mt-4 flex items-center gap-2 rounded-full px-3 py-2">
            <button type="button" onClick={toggleMic} className={controlBtn(isMicOn, true)} title={isMicOn ? 'Tắt micro' : 'Bật micro'}>
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button type="button" onClick={toggleCam} className={controlBtn(isCamOn, true)} title={isCamOn ? 'Tắt camera' : 'Bật camera'}>
              {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleScreenShare}
              className={isScreenSharing ? controlBtn(false, false) : controlBtn(true, false)}
              title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
            >
              <ScreenShare className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleHandRaise}
              className={isHandRaised ? 'flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-white' : controlBtn(true, false)}
              title={isHandRaised ? 'Hạ tay' : 'Giơ tay'}
            >
              <Hand className="h-5 w-5" />
            </button>
            <span className="mx-1 h-6 w-px bg-[#dfbfc1]/60" />
            <button
              type="button"
              onClick={() => setLayoutMode(layoutMode === 'speaker' ? 'grid' : 'speaker')}
              className={controlBtn(true, false)}
              title="Đổi bố cục"
            >
              <Layers className="h-5 w-5" />
            </button>
          </div>
        </section>

        <aside className="rp-catalog-card flex min-h-0 flex-col overflow-hidden rounded-[28px]">
          <div className="flex shrink-0 gap-1 p-3">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'agenda', label: 'Nội dung', icon: BookOpen },
              { id: 'notes', label: 'Ghi chú', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all',
                  activeTab === id
                    ? 'bg-[#D94B68] text-white shadow-sm shadow-[#D94B68]/25'
                    : 'text-[#8A8084] hover:bg-[#FAF4F2] hover:text-[#2D282A]',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-2">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f5] text-[#D94B68]">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#2D282A]">Chưa có tin nhắn</p>
                    <p className="max-w-[220px] text-[12px] leading-relaxed text-[#8A8084]">
                      Gửi lời chào tới Sensei để bắt đầu buổi cố vấn.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col gap-1 ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#A59B9E]">
                        <span className="font-bold text-[#6F6669]">{msg.sender}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                          msg.isSelf
                            ? 'rounded-tr-md bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white'
                            : 'rounded-tl-md bg-[#FAF4F2] text-[#2D282A]'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>
              <form onSubmit={handleSendMessage} className="border-t border-[#dfbfc1]/30 p-3">
                <div className="flex items-center gap-2 rounded-full bg-[#FAF4F2] px-2 py-1.5">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[13px] text-[#2D282A] placeholder:text-[#C4B8BA] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D94B68] text-white shadow-sm shadow-[#D94B68]/25"
                    title="Gửi"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A59B9E]">Mục tiêu buổi học</h4>
                <span className="text-[11px] font-bold text-[#D94B68]">
                  {agendaList.filter((a) => a.done).length}/{agendaList.length} xong
                </span>
              </div>
              {agendaList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleAgendaItem(item.id)}
                  type="button"
                  className={[
                    'flex w-full items-start gap-3 rounded-[20px] border px-3.5 py-3 text-left transition-all',
                    item.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-[#dfbfc1]/40 bg-white text-[#2D282A] hover:border-[#D94B68]/30',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                      item.done ? 'bg-emerald-500 text-white' : 'border border-[#dfbfc1]',
                    ].join(' ')}
                  >
                    {item.done && <Check className="h-3 w-3" />}
                  </span>
                  <span className={`text-[13px] leading-relaxed ${item.done ? 'text-emerald-700/70 line-through' : 'font-medium'}`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A59B9E]">Ghi chú chung</h4>
              <textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                className="min-h-[280px] w-full flex-1 resize-none rounded-[20px] border border-[#dfbfc1]/40 bg-[#FAF4F2] p-4 text-[13px] leading-relaxed text-[#2D282A] focus:border-[#D94B68]/40 focus:outline-none"
                placeholder="Ghi chú kiến thức trọng tâm, từ vựng hoặc bài tập về nhà..."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
