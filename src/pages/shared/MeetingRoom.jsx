import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Check,
  Copy,
  FileText,
  Hand,
  Layers,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Plus,
  Radio,
  ScreenShare,
  ScreenShareOff,
  Send,
  Shield,
  Users,
  Video,
  VideoOff,
  Wifi,
} from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { useLocale } from '@/locales/locale.js';
import { useWebRtcMeeting } from '@/features/meetings/hooks/useWebRtcMeeting.js';
import { checkRoomAccess, getRoomAttendance, getRoomPresence } from '@/features/mentor/api/mentorProfileApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { Button, ContextualErrorState, SakuraLoader, notify } from '@/components/ui';
import BrandMark from '@/components/brand/BrandMark.jsx';

const ROOM_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_LABELS = {
  mentor: 'Giáo viên',
  learner: 'Học viên',
  admin: 'Quản trị viên',
};

function roleLabel(role, tr) {
  const key = String(role || 'learner').toLowerCase();
  return tr(ROLE_LABELS[key] || 'Học viên');
}

function VideoTile({ stream, muted = false, mirrored = false, contain = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => {});
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
  const { tr } = useLocale();
  const showVideo = Boolean(stream && isCamOn);
  const isMentor = String(role || '').toLowerCase() === 'mentor';

  return (
    <div className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#1E171A] shadow-md">
      {stream && (
        <VideoTile
          stream={stream}
          muted={isSelf}
          mirrored={isSelf}
          className={showVideo ? 'h-full w-full' : 'pointer-events-none absolute inset-0 h-full w-full opacity-0'}
        />
      )}

      {!showVideo && (
        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
          <div
            className={`${compact ? 'h-10 w-10 text-sm' : 'h-20 w-20 text-2xl'} flex items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-tr ${
              isMentor ? 'from-rp-brand to-rp-brand-strong' : 'from-slate-600 to-slate-700'
            } font-bold text-white shadow-xl`}
          >
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!compact && (
            <div>
              <h3 className="flex items-center justify-center gap-1.5 text-sm font-bold text-white">
                {name}
                {isMentor && <Shield aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400/20 text-amber-400" />}
              </h3>
              <p className="text-[11px] text-white/50">{tr('Camera đã tắt')}</p>
            </div>
          )}
        </div>
      )}

      <div className="absolute right-2.5 bottom-2.5 left-2.5 flex items-center justify-between gap-2 rounded-xl bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-1.5">
          {!isMicOn ? <MicOff className="h-3.5 w-3.5 shrink-0 text-rose-400" /> : <Mic className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
          <span className="max-w-[120px] truncate sm:max-w-[160px]">
            {name} {isSelf && tr('(Bạn)')}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              isMentor ? 'border border-rp-brand/40 bg-rp-brand/30 text-rp-brand-soft' : 'bg-white/10 text-white/75'
            }`}
          >
            {roleLabel(role, tr)}
          </span>
        </div>

        {canMute && !isSelf && isMicOn && onMuteParticipant && (
          <button
            type="button"
            onClick={() => onMuteParticipant(connectionId)}
            className="hidden cursor-pointer items-center gap-1 rounded bg-rose-600/80 px-2 py-0.5 text-[10px] font-bold text-white transition-all hover:bg-rose-600 group-hover:flex"
            title={tr('Tắt mic học viên này')}
          >
            <MicOff className="h-3 w-3" />
            <span>{tr('Tắt Mic')}</span>
          </button>
        )}
      </div>

      {isHandRaised && (
        <div className="absolute top-2.5 right-2.5 flex animate-bounce items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
          <Hand className="h-3.5 w-3.5 fill-white" />
          {!compact && <span>{tr('Giơ tay')}</span>}
        </div>
      )}
    </div>
  );
}

export default function ConsultationRoom() {
  const { roomId: pathRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { tr } = useLocale();

  const uid = user?.userId ?? user?.id ?? 'anon';
  const requestedRoomId = pathRoomId || searchParams.get('roomId') || '';
  const roomGuid = ROOM_GUID.test(requestedRoomId) ? requestedRoomId : '';
  const accessQuery = useQuery({
    queryKey: ['room-access', uid, roomGuid],
    queryFn: () => checkRoomAccess(roomGuid),
    enabled: Boolean(roomGuid),
    retry: false,
  });
  const roomId = accessQuery.data?.canAccess ? roomGuid : '';
  const presenceQuery = useQuery({
    queryKey: ['room-presence', uid, roomId],
    queryFn: () => getRoomPresence(roomId),
    enabled: Boolean(roomId),
    refetchInterval: 15000,
    retry: false,
  });
  const attendanceQuery = useQuery({
    queryKey: ['room-attendance', uid, roomId],
    queryFn: () => getRoomAttendance(roomId),
    enabled: Boolean(roomId),
    retry: false,
  });
  const checkingRoomAccess = Boolean(roomGuid && accessQuery.isPending);
  const accessMessage = !roomGuid
    ? 'Liên kết phòng học không hợp lệ. Vui lòng mở lại từ lớp học của bạn.'
    : accessQuery.isPending
      ? ''
      : accessQuery.isError
        ? describeApiError(accessQuery.error).message
        : (accessQuery.data && !accessQuery.data.canAccess ? (accessQuery.data.reason || 'Bạn chưa được vào phòng này.') : '');

  const currentUser = {
    id: user?.userId ?? user?.id ?? 'user-anon',
    name: user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : tr('Thành viên')),
    role: user?.primaryRole || (user?.roles && user.roles[0]) || 'Learner',
  };

  const {
    connectionStatus,
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

  const [activeTab, setActiveTab] = useState('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [agendaInput, setAgendaInput] = useState('');
  const [agendaList, setAgendaList] = useState([]);
  const [sharedNotes, setSharedNotes] = useState('');

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const leaveDestination = hasRole('Admin')
    ? '/admin/study-courses/'
    : hasRole('Mentor')
      ? '/mentor-study-courses/'
      : '/my-courses/';

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendChatMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleCopyInviteLink = async () => {
    if (!roomId) return;
    const inviteUrl = `${window.location.origin}/meeting-room/${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      notify.success('Đã sao chép liên kết phòng học.', '', { key: 'meeting-copy-link' });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      notify.warning('Trình duyệt chưa cấp quyền sao chép tự động.', inviteUrl, { key: 'meeting-copy-link-err' });
    }
  };

  const addAgendaItem = (e) => {
    e.preventDefault();
    const text = agendaInput.trim();
    if (!text) return;
    setAgendaList((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setAgendaInput('');
  };

  const toggleAgendaItem = (id) => {
    setAgendaList((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
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

  const presentingPeer = peers.find((p) => p.screenStream);
  const remoteScreenStream = presentingPeer?.screenStream;
  const presenterName = presentingPeer?.name || tr('Thành viên');

  const isPresentingRemote = Boolean(remoteScreenStream);
  const isPresentingSelf = Boolean(isScreenSharing && screenStream);
  const presenting = isPresentingRemote || isPresentingSelf;

  const isUserMentor = String(currentUser.role || '').toLowerCase() === 'mentor';
  const totalParticipantsCount = peers.length + 1;

  const roomTitle = accessQuery.data?.roomTitle || accessQuery.data?.cohortName || 'Phòng học trực tuyến cùng Giáo viên';

  const statusMap = {
    connected: { icon: Wifi, color: 'text-emerald-400', label: 'Đã kết nối trực tiếp' },
    connecting: { icon: Radio, color: 'text-amber-400 animate-pulse', label: 'Đang kết nối…' },
    error: { icon: Wifi, color: 'text-rose-400', label: 'Không vào được phòng' },
    disconnected: { icon: Wifi, color: 'text-rose-400', label: 'Mất kết nối' },
  };
  const status = statusMap[connectionStatus] || statusMap.connecting;
  const StatusIcon = status.icon;

  const isBlocked = !checkingRoomAccess && Boolean(accessMessage);

  return (
    <div
      className="flex min-h-dvh flex-col bg-[#120D10] text-white lg:h-dvh lg:overflow-hidden"
      data-page="WebRtcConsultationRoom"
    >
      <header className="z-20 flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#1A1416] px-4 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="h-12 w-[4.25rem]" />
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-white">{tr(roomTitle)}</span>
              {roomId && (
                <span className="rounded-full border border-rp-brand/40 bg-rp-brand/20 px-2 py-0.5 text-[10px] font-bold text-rp-brand-soft">
                  {totalParticipantsCount} {tr('Người')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              <span className="flex items-center gap-1">
                <StatusIcon className={`h-3 w-3 ${status.color}`} />
                <span className={status.color}>{tr(status.label)}</span>
              </span>
              {presenceQuery.data?.totalOnlineParticipants != null && (
                <>
                  <span>·</span>
                  <span>{presenceQuery.data.totalOnlineParticipants} {tr('đang trực tuyến')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {roomId && (
            <button
              onClick={handleCopyInviteLink}
              type="button"
              className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 sm:flex"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{tr('Đã chép link')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-white/80" />
                  <span>{tr('Sao chép link mời')}</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={toggleFullScreen}
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
            title={tr('Toàn màn hình')}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            onClick={() => navigate(leaveDestination)}
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rp-brand to-rp-brand-strong px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#D94B68]/25"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>{tr('Rời phòng')}</span>
          </button>
        </div>
      </header>

      {checkingRoomAccess ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <SakuraLoader
            variant="section"
            tone="light"
            context="meeting"
            label={tr('Đang kiểm tra quyền vào phòng học')}
            delay={120}
          />
        </div>
      ) : isBlocked ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-rp-line bg-rp-surface p-6 text-rp-text shadow-rp-pop">
            <ContextualErrorState
              error={accessQuery.isError ? accessQuery.error : undefined}
              title={tr('Không thể vào phòng học')}
              message={accessMessage}
              onRetry={roomGuid && accessQuery.isError ? () => accessQuery.refetch() : undefined}
              retrying={accessQuery.isFetching}
              action={(
                <Button variant="primary" size="sm" onClick={() => navigate(leaveDestination)}>
                  {tr('Quay lại lớp học')}
                </Button>
              )}
            />
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px] lg:overflow-hidden">
          {/* KHU VỰC VIDEO */}
          <section className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-[#161013] p-3 sm:p-4 lg:min-h-0">
            {roomId && error && (
              <div className="absolute top-4 right-4 left-4 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/20 p-3 text-xs font-medium text-amber-200 backdrop-blur-md">
                <span>{error}</span>
              </div>
            )}

            <div
              ref={stageRef}
              className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#241C20] p-2"
            >
              {presenting ? (
                <div className="flex h-full w-full flex-col gap-3 bg-black/40 p-2 md:flex-row">
                  <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
                    {isPresentingRemote ? (
                      <>
                        <VideoTile stream={remoteScreenStream} contain className="h-full w-full" />
                        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                          <ScreenShare className="h-3.5 w-3.5 text-rp-brand" />
                          <span>{presenterName} {tr('đang trình bày')}</span>
                        </div>
                      </>
                    ) : isPresentingSelf ? (
                      <>
                        <VideoTile stream={screenStream} contain className="h-full w-full" />
                        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                          <ScreenShare className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                          <span className="text-emerald-300">{tr('Bạn đang chia sẻ màn hình')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleScreenShare}
                          className="absolute top-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-xl bg-rp-brand-strong/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:bg-rp-brand-strong"
                        >
                          <ScreenShareOff className="h-3.5 w-3.5" />
                          {tr('Dừng chia sẻ')}
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="flex h-32 shrink-0 gap-2 overflow-x-auto pr-1 md:h-full md:w-64 md:flex-col md:overflow-y-auto">
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
                <div
                  className={`grid h-full w-full gap-2.5 p-1 ${
                    totalParticipantsCount <= 2
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
                  <div className="absolute right-4 bottom-4 z-10 h-32 w-48 overflow-hidden rounded-xl border border-white/20 shadow-2xl">
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

            {/* CONTROL BAR */}
            <div className="mt-3 flex items-center justify-center gap-2 self-center rounded-2xl border border-white/10 bg-[#1A1416]/90 px-4 py-2 shadow-xl backdrop-blur-xl sm:gap-3">
              <button
                onClick={toggleMic}
                type="button"
                className={`cursor-pointer rounded-xl p-3 transition-all ${
                  isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white shadow-md shadow-rose-500/30 hover:bg-rose-600'
                }`}
                title={isMicOn ? tr('Tắt Micro') : tr('Bật Micro')}
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleCam}
                type="button"
                className={`cursor-pointer rounded-xl p-3 transition-all ${
                  isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white shadow-md shadow-rose-500/30 hover:bg-rose-600'
                }`}
                title={isCamOn ? tr('Tắt Camera') : tr('Bật Camera')}
              >
                {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={toggleScreenShare}
                className={`cursor-pointer rounded-xl p-3 transition-all ${
                  isScreenSharing ? 'bg-rp-brand-pressed text-white shadow-md shadow-[#E05A7A]/30' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isScreenSharing ? tr('Dừng chia sẻ màn hình') : tr('Chia sẻ màn hình')}
              >
                {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={toggleHandRaise}
                className={`cursor-pointer rounded-xl p-3 transition-all ${
                  isHandRaised ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isHandRaised ? tr('Hạ tay') : tr('Giơ tay phát biểu')}
              >
                <Hand className="h-5 w-5" />
              </button>

              <div className="mx-1 h-6 w-px bg-white/15" />

              <button
                type="button"
                onClick={() => setLayoutMode((m) => (m === 'grid' ? 'speaker' : 'grid'))}
                className="cursor-pointer rounded-xl bg-white/10 p-3 text-white transition-all hover:bg-white/20"
                title={tr('Chuyển chế độ xem (Lưới / Diễn giả)')}
              >
                <Layers className="h-5 w-5" />
              </button>
            </div>
          </section>

          {/* RIGHT SIDEBAR COLLABORATION */}
          <aside className="z-10 flex min-h-[360px] flex-col border-t border-white/10 bg-[#1A1416] lg:min-h-0 lg:border-t-0 lg:border-l">
            <div className="flex shrink-0 border-b border-white/10">
              {[
                { id: 'chat', label: tr('Trò chuyện'), icon: MessageSquare },
                { id: 'participants', label: `${tr('Thành viên')} (${totalParticipantsCount})`, icon: Users },
                { id: 'agenda', label: tr('Nội dung'), icon: BookOpen },
                { id: 'notes', label: tr('Ghi chú'), icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1 py-3 text-[11px] font-bold transition-colors ${
                    activeTab === id ? 'border-b-2 border-rp-brand bg-white/5 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'chat' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  {chatMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-white/40">
                      <MessageSquare className="h-8 w-8 stroke-1" />
                      <p className="text-xs">
                        {tr('Chưa có tin nhắn trong phòng.')}
                        <br />
                        {isUserMentor
                          ? tr('Gửi tin nhắn hoặc hướng dẫn tới học viên trong phòng.')
                          : tr('Hãy gửi câu hỏi hoặc trao đổi cùng Giáo viên!')}
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col gap-1 ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                          <span className="font-semibold text-white/70">{msg.sender}</span>
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                              String(msg.role || '').toLowerCase() === 'mentor' ? 'bg-rp-brand/30 text-rp-brand-soft' : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {roleLabel(msg.role, tr)}
                          </span>
                          <span>·</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            msg.isSelf
                              ? 'rounded-tr-none bg-gradient-to-r from-rp-brand to-rp-brand-strong text-white shadow-sm'
                              : 'rounded-tl-none border border-white/10 bg-[#2A2225] text-white/90'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-white/10 bg-[#161013] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={tr('Nhập tin nhắn tới mọi người…')}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-rp-brand focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rp-press flex h-9 w-9 items-center justify-center rounded-full bg-rp-brand-pressed text-white shadow-sm shadow-[#D94B68]/25"
                      title={tr('Gửi')}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/90">
                  {tr('Thành viên trong phòng')} ({totalParticipantsCount})
                </h4>
                <p className="text-[11px] text-white/60">
                  {presenceQuery.isError ? (
                    <>
                      {tr('Điểm danh: Chưa tải được trạng thái')}{' '}
                      <button type="button" onClick={() => presenceQuery.refetch()} className="text-amber-300 underline">
                        {tr('Thử lại')}
                      </button>
                    </>
                  ) : (
                    <>
                      {tr('Điểm danh:')} {presenceQuery.data?.totalOnlineParticipants ?? '—'} {tr('người đang online trong phòng')}
                    </>
                  )}
                </p>
                {attendanceQuery.isError ? (
                  <p className="text-[11px] text-amber-200">
                    {tr('Chưa tải được danh sách điểm danh.')}{' '}
                    <button type="button" onClick={() => attendanceQuery.refetch()} className="text-amber-300 underline">
                      {tr('Thử lại')}
                    </button>
                  </p>
                ) : (attendanceQuery.data || []).map((row) => (
                  <p key={row.id} className="text-[11px] text-white/70">
                    {row.participantName || roleLabel(row.role, tr)} · {row.isOnline ? tr('đang trong phòng') : tr('đã rời')} · {Math.round((row.totalDurationSeconds || 0) / 60)} {tr('phút')}
                  </p>
                ))}

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rp-brand text-xs font-bold text-white">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs font-bold text-white">
                        {currentUser.name} <span className="text-[10px] text-emerald-400">{tr('(Bạn)')}</span>
                      </p>
                      <p className="text-[10px] text-white/50">{roleLabel(currentUser.role, tr)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMicOn ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
                    {isCamOn ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}
                  </div>
                </div>

                {peers.map((peer) => (
                  <div key={peer.connectionId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          String(peer.role || '').toLowerCase() === 'mentor' ? 'bg-rp-brand' : 'bg-slate-600'
                        }`}
                      >
                        {peer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="flex items-center gap-1 text-xs font-bold text-white">
                          {peer.name}
                          {String(peer.role || '').toLowerCase() === 'mentor' && <Shield className="h-3 w-3 text-amber-400" />}
                        </p>
                        <p className="text-[10px] text-white/50">{roleLabel(peer.role, tr)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {peer.isHandRaised && <Hand className="h-3.5 w-3.5 animate-pulse text-amber-400" />}
                      {peer.media?.isMicOn ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
                      {peer.media?.isCamOn ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}

                      {isUserMentor && peer.media?.isMicOn && (
                        <button
                          type="button"
                          onClick={() => muteParticipant(peer.connectionId)}
                          className="ml-1 cursor-pointer rounded bg-rose-500/20 p-1 text-rose-300 transition-all hover:bg-rose-500 hover:text-white"
                          title={tr('Tắt mic')}
                        >
                          <MicOff className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/90">{tr('Mục tiêu buổi học')}</h4>
                  <span className="text-[11px] font-bold text-rp-brand-soft">
                    {agendaList.filter((a) => a.done).length}/{agendaList.length} {tr('Hoàn thành')}
                  </span>
                </div>
                <form onSubmit={addAgendaItem} className="flex gap-2">
                  <input
                    type="text"
                    value={agendaInput}
                    onChange={(e) => setAgendaInput(e.target.value)}
                    placeholder={tr('Thêm đầu mục trong buổi học…')}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-rp-brand focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rp-brand text-white hover:bg-rp-brand-strong"
                    title={tr('Thêm mục tiêu')}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
                {agendaList.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-white/50">
                    {tr('Chưa có mục tiêu nào cho buổi học này. Thêm ghi chú nhanh ở trên để theo dõi.')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {agendaList.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleAgendaItem(item.id)}
                        type="button"
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                          item.done
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                            item.done ? 'bg-emerald-500 text-white' : 'border border-white/30'
                          }`}
                        >
                          {item.done && <Check className="stroke-3 h-3 w-3" />}
                        </div>
                        <span className={`text-xs ${item.done ? 'text-white/50 line-through' : ''}`}>
                          {item.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{tr('Ghi chú cá nhân')}</h4>
                  <span className="text-[11px] text-white/40">{tr('Lưu tạm trong phiên')}</span>
                </div>
                <textarea
                  value={sharedNotes}
                  onChange={(e) => setSharedNotes(e.target.value)}
                  className="min-h-[260px] w-full flex-1 resize-none rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs leading-relaxed text-white/90 placeholder-white/40 focus:border-rp-brand focus:outline-none"
                  placeholder={tr('Ghi chú từ vựng, điểm ngữ pháp hoặc dặn dò trong buổi học…')}
                />
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
