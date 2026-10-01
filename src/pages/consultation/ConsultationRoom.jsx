import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
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
  Users,
  Settings,
  PhoneOff,
  Copy,
  Check,
  Sparkles,
  Layers,
  BookOpen,
  FileText,
  Send,
  Radio,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  Volume2,
} from 'lucide-react';

export default function ConsultationRoom() {
  const { roomId: pathRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Extract or generate roomId
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

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'agenda' | 'notes' | 'info'
  const [inputMessage, setInputMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [layoutMode, setLayoutMode] = useState('speaker'); // 'speaker' | 'grid'
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Agenda items
  const [agendaList, setAgendaList] = useState([
    { id: 1, text: 'Phân tích 3 câu Dokkai N3 khó - Đề tháng 12/2024', done: true },
    { id: 2, text: 'Chiến thuật đọc lướt tìm từ khóa: 余白 / 間', done: false },
    { id: 3, text: 'Luyện cấu trúc ngữ pháp: 〜わけにはいかない', done: false },
    { id: 4, text: 'Hỏi đáp & Định hướng lộ trình 1-on-1', done: false },
  ]);

  // Shared lesson notes
  const [sharedNotes, setSharedNotes] = useState(
    '【Ghi chú từ Sensei】\n- Lưu ý các liên từ chuyển ý: しかし, ところが, それに対して.\n- Khi gặp bài đọc dài, scan nhanh câu đầu và câu cuối của từng đoạn để nắm ý chính.'
  );

  // Bind local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-scroll chat to bottom
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

  return (
    <div
      className="flex h-[calc(100vh-var(--preview-nav-h,7.5rem))] min-h-[640px] flex-col bg-[#120E10] text-white font-sans select-none overflow-hidden"
      data-page="WebRtcConsultationRoom"
    >
      {/* 1. TOP BAR */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6 bg-[#1A1416]/90 backdrop-blur-md z-20">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#D94B68] to-[#E05A7A] text-white font-black text-sm shadow-md shadow-[#D94B68]/30">
            R
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-white">
                Phòng Cố vấn 1-on-1 · {remoteUser?.name || 'Sato-sensei'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D94B68]/20 border border-[#D94B68]/40 text-[#F472B6]">
                JLPT N3
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span className="font-mono">Room: {roomId}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">SignalR Live Hub</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span className="text-amber-400">Realtime P2P Ready</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Copy Invite Link */}
          <button
            onClick={handleCopyInviteLink}
            type="button"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
            title="Sao chép link mời tham gia phòng"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã chép link</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white/70" />
                <span>Mời tham gia</span>
              </>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullScreen}
            type="button"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Leave Call */}
          <button
            onClick={() => navigate('/consultation')}
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold transition-all shadow-sm shadow-[#E11D48]/30 cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Rời phòng</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE (VIDEO TILES & COLLABORATION SIDEBAR) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* VIDEO DISPLAY AREA */}
        <section className="relative flex flex-col justify-between p-3 sm:p-5 overflow-hidden bg-[#161013]">
          {error && (
            <div className="absolute top-6 left-6 right-6 z-30 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2 backdrop-blur-md">
              <span className="shrink-0 font-bold">⚠️ Thông báo:</span>
              <span>{error}</span>
            </div>
          )}

          {/* VIDEO GRID / CONTAINER */}
          <div
            className={`relative flex-1 w-full h-full rounded-2xl overflow-hidden bg-[#241C20] border border-white/10 flex items-center justify-center ${
              layoutMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 p-3' : ''
            }`}
          >
            {/* MAIN / REMOTE VIDEO TILE */}
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#1E171A] flex items-center justify-center">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#D94B68]/30 to-[#E05A7A]/10 border-2 border-[#D94B68]/40 flex items-center justify-center text-3xl font-black text-white shadow-xl">
                      {remoteUser?.name ? remoteUser.name.charAt(0) : 'S'}
                    </div>
                    <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#1E171A] flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-white">
                      {remoteUser?.name || 'Sato-sensei (Cố vấn)'}
                    </h3>
                    <p className="text-xs text-white/50 max-w-sm">
                      Đang kết nối luồng WebRTC Realtime qua <code>/hubs/mentor-meeting</code>. Khi cố vấn bật camera, video sẽ hiển thị trực tiếp tại đây.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60">
                    <Radio className="w-3 h-3 text-[#E05A7A] animate-pulse" />
                    <span>Trạng thái WebRTC: {webrtcState}</span>
                  </div>
                </div>
              )}

              {/* Remote Peer Name Label */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/10">
                <Video className="w-3.5 h-3.5 text-[#F472B6]" />
                <span>{remoteUser?.name || 'Sato-sensei'}</span>
              </div>
            </div>

            {/* LOCAL USER SELF-VIEW (PIP or In-Grid) */}
            <div
              className={`${
                layoutMode === 'speaker'
                  ? 'absolute bottom-4 right-4 w-48 sm:w-60 h-32 sm:h-40 rounded-xl overflow-hidden border-2 border-white/20 bg-[#2C2226] shadow-2xl z-10'
                  : 'relative w-full h-full rounded-xl overflow-hidden border border-white/10 bg-[#2C2226]'
              }`}
            >
              {isCamOn && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#3D2930] to-[#221A1D] text-white/60">
                  <VideoOff className="w-6 h-6 text-white/40" />
                  <span className="text-[11px] font-medium">Camera đã tắt</span>
                </div>
              )}

              {/* Local User Badge */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90">
                <span className="truncate">Bạn ({currentUser.name})</span>
                <span className="flex items-center gap-1">
                  {isMicOn ? (
                    <Mic className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <MicOff className="w-3 h-3 text-rose-400" />
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 3. FLOATING MEETING CONTROL BAR */}
          <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3 py-2 px-4 rounded-2xl bg-[#1A1416]/90 border border-white/10 backdrop-blur-xl shadow-xl self-center">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              type="button"
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isMicOn
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30'
              }`}
              title={isMicOn ? 'Tắt Micro' : 'Bật Micro'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Cam Toggle */}
            <button
              onClick={toggleCam}
              type="button"
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isCamOn
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30'
              }`}
              title={isCamOn ? 'Tắt Camera' : 'Bật Camera'}
            >
              {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              type="button"
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isScreenSharing
                  ? 'bg-[#E05A7A] text-white shadow-md shadow-[#E05A7A]/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            >
              <ScreenShare className="w-5 h-5" />
            </button>

            {/* Raise Hand */}
            <button
              onClick={toggleHandRaise}
              type="button"
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isHandRaised
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isHandRaised ? 'Hạ tay' : 'Giơ tay phát biểu'}
            >
              <Hand className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-white/15 mx-1" />

            {/* Layout Toggle */}
            <button
              onClick={() => setLayoutMode(layoutMode === 'speaker' ? 'grid' : 'speaker')}
              type="button"
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Đổi chế độ xem (Speaker / Grid)"
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* 4. RIGHT COLLABORATION SIDEBAR */}
        <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#1A1416] lg:border-l lg:border-t-0 z-10">
          {/* TAB HEADERS */}
          <div className="flex shrink-0 border-b border-white/10">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'agenda', label: 'Nội dung', icon: BookOpen },
              { id: 'notes', label: 'Ghi chú', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === id
                    ? 'border-b-2 border-[#E05A7A] text-white bg-white/5'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: REAL-TIME CHAT */}
          {activeTab === 'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-white/40 gap-2">
                    <MessageSquare className="w-8 h-8 stroke-1" />
                    <p className="text-xs">Chưa có tin nhắn trong phòng.<br />Hãy gửi lời chào tới Sensei!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1 ${msg.isSelf ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <span className="font-semibold text-white/70">{msg.sender}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          msg.isSelf
                            ? 'bg-gradient-to-r from-[#D94B68] to-[#E05A7A] text-white rounded-tr-none shadow-sm'
                            : 'bg-[#2A2225] text-white/90 border border-white/10 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#161013]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E05A7A]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#E05A7A] hover:bg-[#C94766] text-white transition-colors cursor-pointer shrink-0"
                    title="Gửi"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MEETING AGENDA */}
          {activeTab === 'agenda' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider">
                  Mục tiêu buổi cố vấn (45 phút)
                </h4>
                <span className="text-[11px] text-[#E05A7A] font-bold">
                  {agendaList.filter((a) => a.done).length}/{agendaList.length} Hoàn thành
                </span>
              </div>
              <div className="space-y-2">
                {agendaList.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleAgendaItem(item.id)}
                    type="button"
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      item.done
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        item.done ? 'bg-emerald-500 text-white' : 'border border-white/30'
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3 stroke-3" />}
                    </div>
                    <span className={`text-xs ${item.done ? 'line-through text-white/50' : ''}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SHARED NOTES */}
          {activeTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider">
                Ghi chú bài học chung (Live Sync)
              </h4>
              <textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                className="flex-1 w-full min-h-[300px] p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/90 font-mono leading-relaxed focus:outline-none focus:border-[#E05A7A] resize-none"
                placeholder="Ghi chú kiến thức trọng tâm, từ vựng hoặc bài tập về nhà tại đây..."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
