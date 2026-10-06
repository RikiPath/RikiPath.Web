import { useState, useEffect, useRef, useCallback } from 'react';
import { createMeetingHubConnection } from '../services/mentorMeetingHub.js';
import { getSession } from '../auth/session.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(env.VITE_TURN_URL
      ? [{ urls: env.VITE_TURN_URL, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }]
      : []),
  ],
};

const DEFAULT_REMOTE_MEDIA = { isMicOn: true, isCamOn: true, isScreenSharing: false, screenStreamId: null };
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

const attachScreen = (pc, stream) => {
  if (!pc || !stream) return [];
  return stream.getTracks().map((track) => pc.addTransceiver(track, { direction: 'sendonly', streams: [stream] }));
};

const requestScreen = async () => {
  const md = navigator.mediaDevices;
  try {
    return await md.getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 } },
      audio: true,
    });
  } catch (e) {
    if (e.name === 'NotAllowedError' || e.name === 'AbortError') throw e;
    return md.getDisplayMedia({ video: true });
  }
};

/**
 * WebRTC Multi-Learner Mesh (1 Mentor + N Learners)
 */
export function useWebRtcMeeting(roomId, currentUser = {}) {
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [localUser, setLocalUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers, setPeers] = useState([]);
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
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const mediaRef = useRef({ isMicOn: true, isCamOn: true, isScreenSharing: false, screenStreamId: null });

  const peersMapRef = useRef(new Map());

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

  const syncPeersState = useCallback(() => {
    const list = Array.from(peersMapRef.current.values()).map((p) => ({
      connectionId: p.connectionId,
      id: p.peerInfo?.id || p.peerInfo?.Id,
      name: p.peerInfo?.name || p.peerInfo?.Name || 'Học viên',
      role: p.peerInfo?.role || p.peerInfo?.Role || 'Learner',
      stream: p.camStream,
      screenStream: p.screenStream,
      media: p.media,
      isHandRaised: p.isHandRaised,
      webrtcState: p.webrtcState,
    }));
    setPeers(list);
  }, []);

  const createPeerConnection = useCallback(
    (targetConnId, peerInfo, isOfferer) => {
      if (!targetConnId) return null;

      if (peersMapRef.current.has(targetConnId)) {
        const existing = peersMapRef.current.get(targetConnId);
        try { existing.pc?.close(); } catch (e) { }
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const camStream = new MediaStream();

      const peerEntry = {
        connectionId: targetConnId,
        peerInfo: peerInfo || { connectionId: targetConnId, name: 'Learner', role: 'Learner' },
        pc,
        remoteStreams: new Map(),
        camStream,
        screenStream: null,
        media: { ...DEFAULT_REMOTE_MEDIA },
        isHandRaised: false,
        pendingIce: [],
        makingOffer: false,
        ignoreOffer: false,
        webrtcState: 'new',
        screenTransceivers: [],
      };

      peersMapRef.current.set(targetConnId, peerEntry);

      const rebuildRemote = () => {
        const screenId = peerEntry.media.screenStreamId;
        const streams = peerEntry.remoteStreams;
        const cam = peerEntry.camStream;
        const wanted = new Set();
        let screen = null;

        streams.forEach((s, id) => {
          if (s.getTracks().length === 0) {
            streams.delete(id);
          } else if (id === screenId) {
            screen = s;
          } else {
            s.getTracks().forEach((t) => wanted.add(t));
          }
        });

        cam.getTracks().forEach((t) => {
          if (!wanted.has(t)) cam.removeTrack(t);
        });
        wanted.forEach((t) => {
          if (!cam.getTracks().includes(t)) cam.addTrack(t);
        });

        peerEntry.screenStream = screen;
        syncPeersState();
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          invokeHub('SendIceCandidate', targetConnId, JSON.stringify(e.candidate));
        }
      };

      pc.onconnectionstatechange = () => {
        peerEntry.webrtcState = pc.connectionState;
        syncPeersState();
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          try { pc.restartIce(); } catch (e) { }
        }
      };

      pc.ontrack = (e) => {
        let stream = e.streams[0];
        if (stream) {
          peerEntry.remoteStreams.set(stream.id, stream);
          stream.onremovetrack = rebuildRemote;
        } else {
          stream = peerEntry.remoteStreams.get('__loose') || new MediaStream();
          if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
          peerEntry.remoteStreams.set('__loose', stream);
        }
        e.track.onended = rebuildRemote;
        rebuildRemote();
      };

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      }

      const hasKind = (k) => pc.getTransceivers().some((t) => t.receiver.track?.kind === k);
      if (!hasKind('video')) pc.addTransceiver('video', { direction: 'sendrecv' });
      if (!hasKind('audio')) pc.addTransceiver('audio', { direction: 'sendrecv' });

      if (screenStreamRef.current) {
        peerEntry.screenTransceivers = attachScreen(pc, screenStreamRef.current);
      }

      if (isOfferer) {
        (async () => {
          try {
            peerEntry.makingOffer = true;
            await pc.setLocalDescription();
            await invokeHub('SendOffer', targetConnId, JSON.stringify(pc.localDescription));
          } catch (err) {
            console.error(`Gửi Offer tới ${targetConnId} thất bại:`, err);
          } finally {
            peerEntry.makingOffer = false;
          }
        })();
      }

      syncPeersState();
      return peerEntry;
    },
    [invokeHub, syncPeersState]
  );

  const flushIce = async (peerEntry) => {
    while (peerEntry.pendingIce.length > 0) {
      const candidate = peerEntry.pendingIce.shift();
      try {
        await peerEntry.pc.addIceCandidate(candidate);
      } catch (e) {
        if (!peerEntry.ignoreOffer) console.warn('addIceCandidate failed:', e);
      }
    }
  };

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    let hub = null;

    const initMedia = async () => {
      const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio,
        });
      } catch (err) {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio });
        } catch (err2) {
          console.warn('Không thể truy cập camera/mic:', err2);
          setError(`Không thể mở Camera/Microphone. Bạn vẫn có thể xem, chat và chia sẻ màn hình.`);
          return null;
        }
      }
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

      const session = getSession();
      const token = session?.accessToken || session?.token;
      hub = await createMeetingHubConnection(token);
      hubRef.current = hub;

      hub.on('UserJoined', (peer) => {
        if (!peer || !peer.connectionId) return;
        createPeerConnection(peer.connectionId, peer, true);
        invokeHub('ToggleMediaState', mediaRef.current);
      });

      hub.on('ReceiveOffer', async (senderConnId, sdpJson, senderPeerInfo) => {
        if (!senderConnId) return;
        let peerEntry = peersMapRef.current.get(senderConnId);
        if (!peerEntry) {
          peerEntry = createPeerConnection(senderConnId, senderPeerInfo, false);
        } else if (senderPeerInfo) {
          peerEntry.peerInfo = { ...peerEntry.peerInfo, ...senderPeerInfo };
        }

        const pc = peerEntry.pc;
        const polite = (userRef.current.role || '').toLowerCase() !== 'mentor';
        const collision = peerEntry.makingOffer || pc.signalingState !== 'stable';
        peerEntry.ignoreOffer = !polite && collision;
        if (peerEntry.ignoreOffer) return;

        try {
          await pc.setRemoteDescription(parse(sdpJson));
          await flushIce(peerEntry);
          await pc.setLocalDescription();
          await invokeHub('SendAnswer', senderConnId, JSON.stringify(pc.localDescription));
        } catch (err) {
          console.error(`Xử lý Offer từ ${senderConnId} lỗi:`, err);
        }
      });

      hub.on('ReceiveAnswer', async (senderConnId, sdpJson) => {
        const peerEntry = peersMapRef.current.get(senderConnId);
        if (!peerEntry || peerEntry.pc.signalingState !== 'have-local-offer') return;
        try {
          await peerEntry.pc.setRemoteDescription(parse(sdpJson));
          await flushIce(peerEntry);
        } catch (err) {
          console.error(`Xử lý Answer từ ${senderConnId} lỗi:`, err);
        }
      });

      hub.on('ReceiveIceCandidate', async (senderConnId, candidateJson) => {
        const peerEntry = peersMapRef.current.get(senderConnId);
        const candidate = parse(candidateJson);
        if (!candidate) return;
        if (peerEntry && peerEntry.pc.remoteDescription) {
          try {
            await peerEntry.pc.addIceCandidate(candidate);
          } catch (err) {
            if (!peerEntry.ignoreOffer) console.warn('addIceCandidate failed:', err);
          }
        } else if (peerEntry) {
          peerEntry.pendingIce.push(candidate);
        }
      });

      hub.on('UserLeft', (connId) => {
        const peerEntry = peersMapRef.current.get(connId);
        if (peerEntry) {
          try { peerEntry.pc?.close(); } catch (e) { }
          peersMapRef.current.delete(connId);
          syncPeersState();
        }
      });

      hub.on('ReceiveMediaState', (connId, state) => {
        const peerEntry = peersMapRef.current.get(connId);
        if (peerEntry) {
          peerEntry.media = { ...DEFAULT_REMOTE_MEDIA, ...state };
          const screenId = peerEntry.media.screenStreamId;
          const streams = peerEntry.remoteStreams;
          const cam = peerEntry.camStream;
          let screen = null;

          const wanted = new Set();
          streams.forEach((s, id) => {
            if (s.getTracks().length === 0) {
              streams.delete(id);
            } else if (id === screenId) {
              screen = s;
            } else {
              s.getTracks().forEach((t) => wanted.add(t));
            }
          });

          cam.getTracks().forEach((t) => {
            if (!wanted.has(t)) cam.removeTrack(t);
          });
          wanted.forEach((t) => {
            if (!cam.getTracks().includes(t)) cam.addTrack(t);
          });

          peerEntry.screenStream = screen;
          syncPeersState();
        }
      });

      hub.on('ReceiveHandRaised', (connId, isRaised) => {
        const peerEntry = peersMapRef.current.get(connId);
        if (peerEntry) {
          peerEntry.isHandRaised = !!isRaised;
          syncPeersState();
        }
      });

      hub.on('ReceiveChatMessage', (msg) => {
        setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, isSelf: false }]));
      });

      hub.on('ForceMuted', () => {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
          setIsMicOn(false);
          broadcastMedia({ isMicOn: false });
        }
      });

      hub.on('PresentationForceStopped', () => {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          setScreenStream(null);
          setIsScreenSharing(false);
          broadcastMedia({ isScreenSharing: false, screenStreamId: null });
        }
      });

      try {
        await hub.start();
        const u = userRef.current;
        const resp = await hub.invoke('JoinRoom', roomId, u.name || 'Học viên', u.role || 'Learner');

        if (resp) {
          const selfInfo = resp.self || resp.Self;
          if (selfInfo) setLocalUser(selfInfo);

          const participants = resp.participants || resp.Participants || [];
          participants.forEach((p) => {
            const connId = p.connectionId || p.ConnectionId;
            if (connId && connId !== selfInfo?.connectionId) {
              createPeerConnection(connId, p, false);
            }
          });
        }
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Không thể kết nối phòng SignalR:', err);
        setConnectionStatus('error');
        setError(err.message || 'Không thể kết nối tới máy chủ phòng họp.');
      }
    })();

    return () => {
      cancelled = true;
      peersMapRef.current.forEach((peerEntry) => {
        try { peerEntry.pc?.close(); } catch (e) { }
      });
      peersMapRef.current.clear();

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      if (hub) {
        hub.invoke('LeaveRoom', roomIdRef.current).catch(() => { });
        hub.stop().catch(() => { });
      }
    };
  }, [roomId, createPeerConnection, syncPeersState, invokeHub, broadcastMedia]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMicOn;
    stream.getAudioTracks().forEach((t) => { t.enabled = next; });
    setIsMicOn(next);
    broadcastMedia({ isMicOn: next });
  }, [isMicOn, broadcastMedia]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isCamOn;
    stream.getVideoTracks().forEach((t) => { t.enabled = next; });
    setIsCamOn(next);
    broadcastMedia({ isCamOn: next });
  }, [isCamOn, broadcastMedia]);

  const stopScreenSharing = useCallback(() => {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    screenStreamRef.current = null;
    setScreenStream(null);

    peersMapRef.current.forEach((peerEntry) => {
      peerEntry.screenTransceivers?.forEach((tr) => {
        try {
          if (typeof tr.stop === 'function') tr.stop();
          else peerEntry.pc?.removeTrack(tr.sender);
        } catch (e) { }
      });
      peerEntry.screenTransceivers = [];
    });

    setIsScreenSharing(false);
    broadcastMedia({ isScreenSharing: false, screenStreamId: null });
    invokeHub('StopPresenting');
  }, [broadcastMedia, invokeHub]);

  const toggleScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      stopScreenSharing();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Trình duyệt không hỗ trợ chia sẻ màn hình.');
      return;
    }
    try {
      const stream = await requestScreen();
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.contentHint = 'detail';
      videoTrack.onended = stopScreenSharing;

      screenStreamRef.current = stream;
      setScreenStream(stream);

      peersMapRef.current.forEach((peerEntry) => {
        peerEntry.screenTransceivers = attachScreen(peerEntry.pc, stream);
      });

      setIsScreenSharing(true);
      broadcastMedia({ isScreenSharing: true, screenStreamId: stream.id });
      invokeHub('StartPresenting');
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setError(`Không thể chia sẻ màn hình: ${err.message}`);
      }
    }
  }, [broadcastMedia, stopScreenSharing, invokeHub]);

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

  const muteParticipant = useCallback(
    (targetConnectionId) => {
      invokeHub('MuteParticipant', targetConnectionId);
    },
    [invokeHub]
  );

  return {
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
    remoteStream: peers[0]?.stream || null,
    remoteScreenStream: peers.find((p) => p.screenStream)?.screenStream || null,
    remoteUser: peers[0] ? { name: peers[0].name, role: peers[0].role } : null,
    remoteMedia: peers[0]?.media || DEFAULT_REMOTE_MEDIA,
    remoteHandRaised: peers[0]?.isHandRaised || false,
    webrtcState: peers[0]?.webrtcState || 'new',
  };
}