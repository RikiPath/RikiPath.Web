import { useState, useEffect, useRef, useCallback } from 'react';
import { createMeetingHubConnection } from '../services/mentorMeetingHub.js';
import { getSession } from '../auth/session.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

// STUN đủ cho mạng thường; mạng công ty/4G (symmetric NAT) cần TURN -> cấu hình qua .env
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(env.VITE_TURN_URL
      ? [{ urls: env.VITE_TURN_URL, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }]
      : []),
  ],
};

const DEFAULT_REMOTE_MEDIA = { isMicOn: true, isCamOn: true, isScreenSharing: false };
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

/**
 * WebRTC 1-1 (Mentor <-> Learner) + SignalR signaling.
 * - Mentor là bên "impolite", Learner là "polite" để xử lý offer đụng nhau (glare).
 * - Cả hai đều share màn hình được (replaceTrack trên video sender).
 */
export function useWebRtcMeeting(roomId, currentUser = {}) {
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [webrtcState, setWebrtcState] = useState('new');
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null); // để preview màn hình mình đang share
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [remoteMedia, setRemoteMedia] = useState(DEFAULT_REMOTE_MEDIA);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState(null);

  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  const hubRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const videoSenderRef = useRef(null);
  const pendingIceRef = useRef([]);
  const peerPresentRef = useRef(false);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const mediaRef = useRef({ isMicOn: true, isCamOn: true, isScreenSharing: false });

  const invokeHub = useCallback(async (method, ...args) => {
    const hub = hubRef.current;
    if (!hub || hub.state !== 'Connected') return;
    try {
      await hub.invoke(method, roomIdRef.current, ...args);
    } catch (e) {
      console.warn(`SignalR ${method} failed:`, e);
    }
  }, []);

  const broadcastMedia = useCallback(
    (patch) => {
      mediaRef.current = { ...mediaRef.current, ...patch };
      invokeHub('ToggleMediaState', mediaRef.current);
    },
    [invokeHub]
  );

  // ================= SESSION: media + peer + signaling =================
  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    let hub = null;
    const polite = (userRef.current.role || '').toLowerCase() !== 'mentor';

    const initMedia = async () => {
      const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio,
        });
      } catch (err) {
        // Không có/không cho camera -> vẫn vào phòng với mic (hoặc chỉ nghe/xem + share màn hình)
        try {
          return await navigator.mediaDevices.getUserMedia({ audio });
        } catch (err2) {
          console.warn('Could not acquire media:', err2);
          setError(`Không thể truy cập Camera/Microphone: ${err2.message}. Bạn vẫn có thể xem, chat và chia sẻ màn hình.`);
          return null;
        }
      }
    };

    const flushIce = async (pc) => {
      while (pendingIceRef.current.length > 0) {
        try {
          await pc.addIceCandidate(pendingIceRef.current.shift());
        } catch (e) {
          if (!ignoreOfferRef.current) console.warn('addIceCandidate failed:', e);
        }
      }
    };

    const negotiate = async () => {
      const pc = pcRef.current;
      if (!pc || !peerPresentRef.current) return;
      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription(); // tự tạo offer
        await invokeHub('SendOffer', JSON.stringify(pc.localDescription));
      } catch (e) {
        console.error('Negotiate failed:', e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    const createPeer = () => {
      if (pcRef.current) {
        pcRef.current.onnegotiationneeded = null;
        pcRef.current.close();
      }
      remoteStreamRef.current = null;
      setRemoteStream(null);
      pendingIceRef.current = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.onnegotiationneeded = negotiate;
      pc.onicecandidate = (e) => {
        if (e.candidate) invokeHub('SendIceCandidate', JSON.stringify(e.candidate));
      };
      pc.onconnectionstatechange = () => setWebrtcState(pc.connectionState);
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') pc.restartIce();
      };
      pc.ontrack = (e) => {
        let ms = remoteStreamRef.current;
        if (!ms) {
          ms = new MediaStream();
          remoteStreamRef.current = ms;
        }
        if (!ms.getTracks().includes(e.track)) ms.addTrack(e.track);
        setRemoteStream(ms);
      };

      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Luôn có sẵn transceiver video/audio để share màn hình được kể cả khi không có camera
      const hasKind = (k) => pc.getTransceivers().some((t) => t.receiver.track.kind === k);
      if (!hasKind('video')) pc.addTransceiver('video', { direction: 'sendrecv' });
      if (!hasKind('audio')) pc.addTransceiver('audio', { direction: 'sendrecv' });
      videoSenderRef.current = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video').sender;

      // Nếu đang share màn hình mà peer bị tạo lại (đối phương vào lại) -> gửi lại màn hình
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      if (screenTrack) videoSenderRef.current.replaceTrack(screenTrack).catch(() => { });
    };

    const onOffer = async (_senderId, sdpJson, info) => {
      const pc = pcRef.current;
      if (!pc) return;
      peerPresentRef.current = true;
      if (info) setRemoteUser(info);

      const collision = makingOfferRef.current || pc.signalingState !== 'stable';
      ignoreOfferRef.current = !polite && collision;
      if (ignoreOfferRef.current) return;

      try {
        await pc.setRemoteDescription(parse(sdpJson)); // polite: tự rollback offer của mình
        await flushIce(pc);
        await pc.setLocalDescription();
        await invokeHub('SendAnswer', JSON.stringify(pc.localDescription));
      } catch (e) {
        console.error('Handle offer failed:', e);
      }
    };

    const onAnswer = async (_senderId, sdpJson) => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState !== 'have-local-offer') return;
      try {
        await pc.setRemoteDescription(parse(sdpJson));
        await flushIce(pc);
      } catch (e) {
        console.error('Handle answer failed:', e);
      }
    };

    const onIce = async (_senderId, candidateJson) => {
      const pc = pcRef.current;
      const candidate = parse(candidateJson);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          if (!ignoreOfferRef.current) console.warn('addIceCandidate failed:', e);
        }
      } else {
        pendingIceRef.current.push(candidate);
      }
    };

    const onUserJoined = (user) => {
      setRemoteUser(user);
      peerPresentRef.current = true;
      negotiate(); // bên đã ở trong phòng gửi offer
      // báo cho người mới biết trạng thái mic/cam/screen hiện tại của mình
      invokeHub('ToggleMediaState', mediaRef.current);
    };

    const onUserLeft = () => {
      peerPresentRef.current = false;
      setRemoteUser(null);
      setRemoteMedia(DEFAULT_REMOTE_MEDIA);
      setRemoteHandRaised(false);
      createPeer(); // peer mới sẵn sàng cho lần đối phương vào lại
    };

    (async () => {
      setConnectionStatus('connecting');
      setError(null);

      const stream = await initMedia();
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      const hasMic = !!stream?.getAudioTracks().length;
      const hasCam = !!stream?.getVideoTracks().length;
      mediaRef.current = { isMicOn: hasMic, isCamOn: hasCam, isScreenSharing: false };
      setIsMicOn(hasMic);
      setIsCamOn(hasCam);

      createPeer();

      let joined = false;
      try {
        const h = await createMeetingHubConnection(getSession()?.accessToken);
        if (cancelled) {
          h.stop();
          return;
        }
        hub = h;
        hubRef.current = h;

        h.on('UserJoined', onUserJoined);
        h.on('UserLeft', onUserLeft);
        h.on('ReceiveOffer', onOffer);
        h.on('ReceiveAnswer', onAnswer);
        h.on('ReceiveIceCandidate', onIce);
        h.on('ReceiveMediaState', (_id, state) => setRemoteMedia({ ...DEFAULT_REMOTE_MEDIA, ...state }));
        h.on('ReceiveHandRaised', ({ isRaised }) => setRemoteHandRaised(!!isRaised));
        h.on('ReceiveChatMessage', (msg) =>
          setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, isSelf: false }]))
        );

        // Mất mạng rồi tự nối lại: connectionId đổi -> phải tạo peer mới và join lại phòng
        h.onreconnected?.(async () => {
          onUserLeft();
          const u = userRef.current;
          await h.invoke('JoinRoom', roomIdRef.current, u.name || 'Người tham gia', u.role || 'Learner');
          setConnectionStatus('connected');
        });
        h.onreconnecting?.(() => setConnectionStatus('connecting'));
        h.onclose?.(() => !cancelled && setConnectionStatus('disconnected'));

        await h.start();
        if (cancelled) {
          h.stop();
          return;
        }
        joined = false;
        const u = userRef.current;
        await h.invoke('JoinRoom', roomId, u.name || 'Người tham gia', u.role || 'Learner');
        joined = true;
        setConnectionStatus('connected');
      } catch (e) {
        console.warn('SignalR error:', e);
        if (cancelled) return;
        if (hub && hub.state === 'Connected' && !joined) {
          // hub chạy nhưng JoinRoom bị từ chối (không có quyền / phòng đầy)
          setError(e.message?.replace(/^.*HubException:\s*/, '') || 'Không thể vào phòng.');
          setConnectionStatus('error');
        } else {
          setConnectionStatus('standalone'); // hub không chạy -> chế độ demo
        }
      }
    })();

    return () => {
      cancelled = true;
      peerPresentRef.current = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (pcRef.current) {
        pcRef.current.onnegotiationneeded = null;
        pcRef.current.close();
        pcRef.current = null;
      }
      // Server tự xử lý rời phòng ở OnDisconnectedAsync
      hubRef.current = null;
      if (hub) hub.stop().catch(() => { });
    };
  }, [roomId, invokeHub]);

  // ================= CONTROLS =================
  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
    broadcastMedia({ isMicOn: track.enabled });
  }, [broadcastMedia]);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCamOn(track.enabled);
    broadcastMedia({ isCamOn: track.enabled });
  }, [broadcastMedia]);

  const stopScreenSharing = useCallback(() => {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    videoSenderRef.current?.replaceTrack(cameraTrack).catch(() => { });

    setIsScreenSharing(false);
    broadcastMedia({ isScreenSharing: false });
  }, [broadcastMedia]);

  const toggleScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      stopScreenSharing();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Trình duyệt này không hỗ trợ chia sẻ màn hình (thường gặp trên điện thoại).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      track.onended = stopScreenSharing; // người dùng bấm "Stop sharing" của trình duyệt
      screenStreamRef.current = stream;
      setScreenStream(stream);
      await videoSenderRef.current?.replaceTrack(track);
      setIsScreenSharing(true);
      broadcastMedia({ isScreenSharing: true });
    } catch (err) {
      if (err.name !== 'NotAllowedError') console.warn('Screen share failed:', err);
    }
  }, [broadcastMedia, stopScreenSharing]);

  const toggleHandRaise = useCallback(() => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    invokeHub('RaiseHand', next);
  }, [isHandRaised, invokeHub]);

  const sendChatMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const u = userRef.current;
      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: u.name || 'Tôi',
        role: u.role || 'Learner',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, { ...msg, isSelf: true }]);
      await invokeHub('SendChatMessage', { ...msg, isSelf: false });
    },
    [invokeHub]
  );

  return {
    connectionStatus,
    webrtcState,
    localStream,
    screenStream,
    remoteStream,
    remoteUser,
    remoteMedia, // { isMicOn, isCamOn, isScreenSharing } của đối phương
    remoteHandRaised,
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
  };
}