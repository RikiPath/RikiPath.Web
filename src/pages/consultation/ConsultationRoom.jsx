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
  Users,
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
  ScreenShareOff,
  Shield,
  User,
} from 'lucide-react';

// Tile hiển thị Stream Video
function VideoTile({ stream, muted = false, mirrored = false, contain = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => { });
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${contain ? 'object-contain' : 'object-cover'} ${mirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}

// Tile hiển thị thông tin từng học viên/mentor
function ParticipantTile({
  name,
  role,
  stream,
  isCamOn,
  isMicOn,
  isHandRaised,
  isSelf = false,
  compact = false,
  onMuteParticipant,
  connectionId,
  canMute = false,
}) {
  const showVideo = !!stream && isCamOn;
  const isMentor = role?.toLowerCase() === 'mentor';

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#1E171A] border border-white/10 flex items-center justify-center group shadow-md">
      {stream && (
        <VideoTile
          stream={stream}
          muted={isSelf}
          mirrored={isSelf}
          className={showVideo ? 'w-full h-full' : 'absolute inset-0 w-full h-full opacity-0 pointer-events-none'}
        />
      )}

      {!showVideo && (
        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
          <div
            className={`${compact ? 'w-10 h-10 text-sm' : 'w-20 h-20 text-2xl'} rounded-full bg-gradient-to-tr ${isMentor ? 'from-[#D94B68] to-[#E05A7A]' : 'from-indigo-600 to-purple-600'
              } border-2 border-white/20 flex items-center justify-center font-black text-white shadow-xl`}
          >
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!compact && (
            <div>
              <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                {name}
                {isMentor && <Shield className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />}
              </h3>
              <p className="text-[11px] text-white/50">Camera đã tắt</p>
            </div>
          )}
        </div>
      )}

      {/* Overlay Tên & Mic */}
      <div className="absolute left-2.5 bottom-2.5 right-2.5 flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-medium text-white">
        <div className="flex items-center gap-1.5 min-w-0">
          {!isMicOn ? <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" /> : <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          <span className="truncate max-w-[120px] sm:max-w-[160px]">
            {name} {isSelf && '(Bạn)'}
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isMentor ? 'bg-[#D94B68]/30 text-[#F472B6] border border-[#D94B68]/40' : 'bg-white/10 text-white/70'
              }`}
          >
            {isMentor ? 'Mentor' : 'Learner'}
          </span>
        </div>

        {/* Nút Mentor tắt Mic */}
        {canMute && !isSelf && isMicOn && onMuteParticipant && (
          <button
            type="button"
            onClick={() => onMuteParticipant(connectionId)}
            className="hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-600 text-[10px] font-bold text-white transition-all cursor-pointer"
            title="Tắt mic học viên này"
          >
            <MicOff className="w-3 h-3" />
            <span>Tắt Mic</span>
          </button>
        )}
      </div>

      {/* Biểu tượng giơ tay */}
      {isHandRaised && (
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg animate-bounce">
          <Hand className="w-3.5 h-3.5 fill-white" />
          {!compact && <span>Giơ tay</span>}
        </div>
      )}
    </div>
  );
}

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
    localUser,
    localStream,
    screenStream,
    peers,
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
    muteParticipant,
  } = useWebRtcMeeting(roomId, currentUser);

  const stageRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'participants' | 'agenda' | 'notes'
  const [inputMessage, setInputMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'speaker'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [agendaList, setAgendaList] = useState([
    { id: 1, text: 'Phân tích 3 câu Dokkai N3 khó - Đề tháng 12/2024', done: true },
    { id: 2, text: 'Chiến thuật đọc lướt tìm từ khóa: 余白 / 間', done: false },
    { id: 3, text: 'Luyện cấu trúc ngữ pháp: 〜わけにはいかない', done: false },
    { id: 4, text: 'Hỏi đáp & Định hướng lộ trình 1-on-1', done: false },
  ]);

  const [sharedNotes, setSharedNotes] = useState(
    '【Ghi chú bài học nhóm】\n- Lưu ý các liên từ chuyển ý: しかし, ところが, それに対して.\n- Khi gặp bài đọc dài, scan nhanh câu đầu và câu cuối của từng đoạn để nắm ý chính.'
  );

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
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  // Tìm stream màn hình đang chia sẻ (nếu có)
  const presentingPeer = peers.find((p) => p.screenStream);
  const remoteScreenStream = presentingPeer?.screenStream;
  const presenterName = presentingPeer?.name || 'Ai đó';

  const isPresentingRemote = !!remoteScreenStream;
  const isPresentingSelf = isScreenSharing && !!screenStream;
  const presenting = isPresentingRemote || isPresentingSelf;

  const isUserMentor = currentUser.role?.toLowerCase() === 'mentor';
  const totalParticipantsCount = peers.length + 1; // +1 cho local user

  const statusMap = {
    connected: { icon: Wifi, color: 'text-emerald-400', label: 'SignalR Live Hub' },
    connecting: { icon: Radio, color: 'text-amber-400 animate-pulse', label: 'Đang kết nối...' },
    error: { icon: Wifi, color: 'text-rose-400', label: 'Không vào được phòng' },
    disconnected: { icon: Wifi, color: 'text-rose-400', label: 'Mất kết nối' },
  };
  const status = statusMap[connectionStatus] || statusMap.connecting;
  const StatusIcon = status.icon;

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
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-white">
                Phòng Học Nhóm Mentor · JLPT N3
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D94B68]/20 border border-[#D94B68]/40 text-[#F472B6]">
                {totalParticipantsCount} Người
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span className="font-mono">Room: {roomId}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <StatusIcon className={`w-3 h-3 ${status.color}`} />
                <span className={status.color}>{status.label}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mời tham gia */}
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
                <Copy className="w-3.5 h-3.5 text-white/70" />
                <span>Mời Learner</span>
              </>
            )}
          </button>

          {/* Nút Toàn màn hình */}
          <button
            onClick={toggleFullScreen}
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfbfc1]/50 bg-white text-[#6F6669] shadow-sm hover:text-[#D94B68]"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Rời phòng */}
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

      {/* 2. MAIN STAGE */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* KHU VỰC VIDEO */}
        <section className="relative flex flex-col justify-between p-3 sm:p-4 overflow-hidden bg-[#161013]">
          {error && (
            <div className="absolute top-4 left-4 right-4 z-30 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2 backdrop-blur-md">
              <span className="shrink-0 font-bold">⚠️ Thông báo:</span>
              <span>{error}</span>
            </div>
          )}

          {/* STAGE MAIN */}
          <div
            ref={stageRef}
            className="relative flex-1 min-h-0 w-full rounded-2xl overflow-hidden bg-[#241C20] border border-white/10 p-2"
          >
            {presenting ? (
              <div className="flex h-full w-full flex-col gap-3 bg-black/40 p-2 md:flex-row">
                {/* Màn hình Chia sẻ */}
                <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black border border-white/10">
                  {isPresentingRemote ? (
                    <>
                      <VideoTile stream={remoteScreenStream} contain className="h-full w-full" />
                      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/10">
                        <ScreenShare className="w-3.5 h-3.5 text-[#F472B6]" />
                        <span>{presenterName} đang trình bày</span>
                      </div>
                    </>
                  ) : isPresentingSelf ? (
                    <>
                      {/* Preview màn hình đang share của chính mình */}
                      <VideoTile stream={screenStream} contain className="h-full w-full" />
                      {/* Label góc trên trái */}
                      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/10">
                        <ScreenShare className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span className="text-emerald-300">Bạn đang chia sẻ màn hình</span>
                      </div>
                      {/* Nút dừng góc trên phải */}
                      <button
                        type="button"
                        onClick={toggleScreenShare}
                        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl bg-[#E11D48]/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#BE123C] backdrop-blur-md cursor-pointer shadow-lg"
                      >
                        <ScreenShareOff className="h-3.5 w-3.5" />
                        Dừng chia sẻ
                      </button>
                    </>
                  ) : null}
                </div>

                {/* Dải Camera dọc bên phải */}
                <div className="flex h-32 shrink-0 gap-2 overflow-x-auto md:h-full md:w-64 md:flex-col md:overflow-y-auto pr-1">
                  <ParticipantTile
                    name={currentUser.name}
                    role={currentUser.role}
                    stream={localStream}
                    isCamOn={isCamOn}
                    isMicOn={isMicOn}
                    isHandRaised={isHandRaised}
                    isSelf
                    compact
                  />
                  {peers.map((peer) => (
                    <ParticipantTile
                      key={peer.connectionId}
                      connectionId={peer.connectionId}
                      name={peer.name}
                      role={peer.role}
                      stream={peer.stream}
                      isCamOn={peer.media?.isCamOn}
                      isMicOn={peer.media?.isMicOn}
                      isHandRaised={peer.isHandRaised}
                      onMuteParticipant={muteParticipant}
                      canMute={isUserMentor}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : layoutMode === 'grid' ? (
              /* GRID VIEW - Cho nhiều Learner */
              <div
                className={`grid h-full w-full gap-2.5 p-1 ${totalParticipantsCount <= 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : totalParticipantsCount <= 4
                    ? 'grid-cols-2'
                    : 'grid-cols-2 lg:grid-cols-3'
                  }`}
              >
                <ParticipantTile
                  name={currentUser.name}
                  role={currentUser.role}
                  stream={localStream}
                  isCamOn={isCamOn}
                  isMicOn={isMicOn}
                  isHandRaised={isHandRaised}
                  isSelf
                />
                {peers.map((peer) => (
                  <ParticipantTile
                    key={peer.connectionId}
                    connectionId={peer.connectionId}
                    name={peer.name}
                    role={peer.role}
                    stream={peer.stream}
                    isCamOn={peer.media?.isCamOn}
                    isMicOn={peer.media?.isMicOn}
                    isHandRaised={peer.isHandRaised}
                    onMuteParticipant={muteParticipant}
                    canMute={isUserMentor}
                  />
                ))}
              </div>
            ) : (
              /* SPEAKER VIEW */
              <div className="relative h-full w-full">
                {peers.length > 0 ? (
                  <ParticipantTile
                    connectionId={peers[0].connectionId}
                    name={peers[0].name}
                    role={peers[0].role}
                    stream={peers[0].stream}
                    isCamOn={peers[0].media?.isCamOn}
                    isMicOn={peers[0].media?.isMicOn}
                    isHandRaised={peers[0].isHandRaised}
                    onMuteParticipant={muteParticipant}
                    canMute={isUserMentor}
                  />
                ) : (
                  <ParticipantTile
                    name={currentUser.name}
                    role={currentUser.role}
                    stream={localStream}
                    isCamOn={isCamOn}
                    isMicOn={isMicOn}
                    isHandRaised={isHandRaised}
                    isSelf
                  />
                )}
                {/* Floating camera bản thân */}
                <div className="absolute bottom-4 right-4 z-10 h-32 w-48 overflow-hidden rounded-xl shadow-2xl border border-white/20">
                  <ParticipantTile
                    name={currentUser.name}
                    role={currentUser.role}
                    stream={localStream}
                    isCamOn={isCamOn}
                    isMicOn={isMicOn}
                    isHandRaised={isHandRaised}
                    isSelf
                    compact
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. CONTROL BAR */}
          <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3 py-2 px-4 rounded-2xl bg-[#1A1416]/90 border border-white/10 backdrop-blur-xl shadow-xl self-center">
            {/* Mic */}
            <button
              onClick={toggleMic}
              type="button"
              className={`p-3 rounded-xl transition-all cursor-pointer ${isMicOn
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30'
                }`}
              title={isMicOn ? 'Tắt Micro' : 'Bật Micro'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Cam */}
            <button
              onClick={toggleCam}
              type="button"
              className={`p-3 rounded-xl transition-all cursor-pointer ${isCamOn
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30'
                }`}
              title={isCamOn ? 'Tắt Camera' : 'Bật Camera'}
            >
              {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={toggleScreenShare}
              className={`p-3 rounded-xl transition-all cursor-pointer ${isScreenSharing
                ? 'bg-[#E05A7A] text-white shadow-md shadow-[#E05A7A]/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            >
              {isScreenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
            </button>

            {/* Giơ tay */}
            <button
              type="button"
              onClick={toggleHandRaise}
              className={`p-3 rounded-xl transition-all cursor-pointer ${isHandRaised
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              title={isHandRaised ? 'Hạ tay' : 'Giơ tay phát biểu'}
            >
              <Hand className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-white/15 mx-1" />

            {/* Layout Mode */}
            <button
              type="button"
              onClick={() => setLayoutMode((m) => (m === 'grid' ? 'speaker' : 'grid'))}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Chuyển chế độ xem (Lưới / Diễn giả)"
            >
              <Layers className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* 4. RIGHT SIDEBAR COLLABORATION */}
        <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#1A1416] lg:border-l lg:border-t-0 z-10">
          {/* TAB HEADERS */}
          <div className="flex shrink-0 border-b border-white/10">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'participants', label: `Thành viên (${totalParticipantsCount})`, icon: Users },
              { id: 'agenda', label: 'Nội dung', icon: BookOpen },
              { id: 'notes', label: 'Ghi chú', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === id
                  ? 'border-b-2 border-[#E05A7A] text-white bg-white/5'
                  : 'text-white/50 hover:text-white/80'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-2">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-white/40 gap-2">
                    <MessageSquare className="w-8 h-8 stroke-1" />
                    <p className="text-xs">Chưa có tin nhắn trong phòng.<br />Hãy đặt câu hỏi cho Mentor!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1 ${msg.isSelf ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <span className="font-semibold text-white/70">{msg.sender}</span>
                        <span
                          className={`px-1 py-0.2 rounded text-[8px] font-bold ${msg.role === 'Mentor' ? 'bg-[#D94B68]/30 text-[#F472B6]' : 'bg-white/10 text-white/60'
                            }`}
                        >
                          {msg.role}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${msg.isSelf
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

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#161013]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Nhập tin nhắn tới mọi người..."
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E05A7A]"
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

          {/* TAB 2: DANH SÁCH THÀNH VIÊN */}
          {activeTab === 'participants' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider mb-2">
                Thành viên trong phòng ({totalParticipantsCount})
              </h4>

              {/* Bản thân */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      {currentUser.name} <span className="text-[10px] text-emerald-400">(Bạn)</span>
                    </p>
                    <p className="text-[10px] text-white/50">{currentUser.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isMicOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                  {isCamOn ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>

              {/* Danh sách người khác */}
              {peers.map((peer) => (
                <div key={peer.connectionId} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${peer.role?.toLowerCase() === 'mentor' ? 'bg-[#D94B68]' : 'bg-purple-600'
                        }`}
                    >
                      {peer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1">
                        {peer.name}
                        {peer.role?.toLowerCase() === 'mentor' && <Shield className="w-3 h-3 text-amber-400" />}
                      </p>
                      <p className="text-[10px] text-white/50">{peer.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {peer.isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                    {peer.media?.isMicOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                    {peer.media?.isCamOn ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5 text-rose-400" />}

                    {isUserMentor && peer.media?.isMicOn && (
                      <button
                        type="button"
                        onClick={() => muteParticipant(peer.connectionId)}
                        className="ml-1 p-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-all cursor-pointer"
                        title="Tắt mic"
                      >
                        <MicOff className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: AGENDA */}
          {activeTab === 'agenda' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider">
                  Mục tiêu buổi học
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
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${item.done
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500 text-white' : 'border border-white/30'
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

          {/* TAB 4: SHARED NOTES */}
          {activeTab === 'notes' && (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A59B9E]">Ghi chú chung</h4>
              <textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                className="flex-1 w-full min-h-[300px] p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/90 font-mono leading-relaxed focus:outline-none focus:border-[#E05A7A] resize-none"
                placeholder="Ghi chú kiến thức trọng tâm..."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}