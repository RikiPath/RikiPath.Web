import { useState, useEffect, useRef, useCallback } from 'react';
import { createMeetingHubConnection } from '../services/mentorMeetingHub.js';
import { getSession } from '../auth/session.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/**
 * Custom React Hook for WebRTC 1-on-1 Mentor Meeting Room with SignalR Signaling
 * @param {string} roomId - Room identifier (e.g. "room-n3-dokkai-101")
 * @param {Object} currentUser - User information { id, name, role }
 */
export function useWebRtcMeeting(roomId, currentUser = {}) {
  const [connectionStatus, setConnectionStatus] = useState('initializing'); // initializing, connected, connecting, error, disconnected
  const [webrtcState, setWebrtcState] = useState('new'); // new, checking, connected, completed, disconnected, failed
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState(null);

  const hubConnectionRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  // ================= 1. INITIALIZE LOCAL MEDIA STREAM =================
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Could not acquire local camera/mic stream:', err);
      setError(`Không thể truy cập Camera/Microphone: ${err.message}. Vui lòng cấp quyền trong trình duyệt.`);
      return null;
    }
  }, []);

  // ================= 2. CREATE WEBRTC PEER CONNECTION =================
  const createPeerConnection = useCallback((stream) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Attach local tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // When remote stream tracks arrive
    pc.ontrack = (event) => {
      console.log('WebRTC ontrack received:', event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // When ICE candidate is generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate && hubConnectionRef.current) {
        try {
          hubConnectionRef.current.invoke('SendIceCandidate', roomId, JSON.stringify(event.candidate));
        } catch (e) {
          console.warn('Failed to send ICE candidate over SignalR:', e);
        }
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection State changed to:', pc.connectionState);
      setWebrtcState(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE Connection State changed to:', pc.iceConnectionState);
    };

    return pc;
  }, [roomId]);

  // ================= 3. SIGNALING NEGOTIATION =================
  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const hub = hubConnectionRef.current;
    if (!pc || !hub) return;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('Sending WebRTC Offer to room:', roomId);
      await hub.invoke('SendOffer', roomId, JSON.stringify(offer));
    } catch (err) {
      console.error('Error creating/sending WebRTC offer:', err);
    }
  }, [roomId]);

  const handleReceiveOffer = useCallback(async (senderId, offerSdpJson, senderInfo) => {
    console.log('Received WebRTC Offer from:', senderId);
    let pc = peerConnectionRef.current;
    if (!pc) {
      pc = createPeerConnection(localStreamRef.current);
    }

    if (senderInfo) {
      setRemoteUser(senderInfo);
    }

    try {
      const offerSdp = typeof offerSdpJson === 'string' ? JSON.parse(offerSdpJson) : offerSdpJson;
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Process any queued ICE candidates
      while (pendingIceCandidatesRef.current.length > 0) {
        const cand = pendingIceCandidatesRef.current.shift();
        await pc.addIceCandidate(cand);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (hubConnectionRef.current) {
        console.log('Sending WebRTC Answer back to room:', roomId);
        await hubConnectionRef.current.invoke('SendAnswer', roomId, JSON.stringify(answer));
      }
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  }, [roomId, createPeerConnection]);

  const handleReceiveAnswer = useCallback(async (senderId, answerSdpJson) => {
    console.log('Received WebRTC Answer from:', senderId);
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const answerSdp = typeof answerSdpJson === 'string' ? JSON.parse(answerSdpJson) : answerSdpJson;
      await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));

      // Process any queued ICE candidates
      while (pendingIceCandidatesRef.current.length > 0) {
        const cand = pendingIceCandidatesRef.current.shift();
        await pc.addIceCandidate(cand);
      }
    } catch (err) {
      console.error('Error handling WebRTC answer:', err);
    }
  }, []);

  const handleReceiveIceCandidate = useCallback(async (senderId, candidateJson) => {
    const pc = peerConnectionRef.current;
    try {
      const candidateObj = typeof candidateJson === 'string' ? JSON.parse(candidateJson) : candidateJson;
      const rtcCandidate = new RTCIceCandidate(candidateObj);

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(rtcCandidate);
      } else {
        pendingIceCandidatesRef.current.push(rtcCandidate);
      }
    } catch (err) {
      console.warn('Error handling received ICE candidate:', err);
    }
  }, []);

  // ================= 4. CONNECT TO SIGNALR HUB (/hubs/mentor-meeting) =================
  useEffect(() => {
    let isMounted = true;
    let hub = null;

    async function startMeetingSession() {
      if (!roomId) return;

      setConnectionStatus('connecting');
      setError(null);

      // 1. Start Camera/Mic
      const stream = await initLocalMedia();
      if (!isMounted) return;

      // 2. Initialize Peer Connection
      createPeerConnection(stream);

      // 3. Connect to SignalR Hub
      try {
        const token = getSession()?.accessToken;
        hub = await createMeetingHubConnection(token);
        hubConnectionRef.current = hub;

        // Register SignalR listeners
        hub.on('UserJoined', (joinedUser) => {
          console.log('User joined meeting room:', joinedUser);
          setRemoteUser(joinedUser);
          // When another user joins, initiator sends WebRTC offer
          createAndSendOffer();
        });

        hub.on('ReceiveOffer', (senderId, offerSdp, senderInfo) => {
          handleReceiveOffer(senderId, offerSdp, senderInfo);
        });

        hub.on('ReceiveAnswer', (senderId, answerSdp) => {
          handleReceiveAnswer(senderId, answerSdp);
        });

        hub.on('ReceiveIceCandidate', (senderId, candidate) => {
          handleReceiveIceCandidate(senderId, candidate);
        });

        hub.on('ReceiveChatMessage', (msg) => {
          setChatMessages((prev) => [...prev, msg]);
        });

        hub.on('UserLeft', (leftUserId) => {
          console.log('User left meeting room:', leftUserId);
          setRemoteUser(null);
          setRemoteStream(null);
        });

        hub.on('ReceiveHandRaised', ({ userName, isRaised }) => {
          console.log(`${userName} hand raised:`, isRaised);
        });

        // Start connection
        await hub.start();
        if (!isMounted) return;

        console.log(`Connected to SignalR Hub at /hubs/mentor-meeting. Joining room: ${roomId}`);
        setConnectionStatus('connected');

        // Join the specific room with user info
        await hub.invoke('JoinRoom', roomId, currentUser.name || 'Người tham gia', currentUser.role || 'Learner');
      } catch (hubErr) {
        console.warn('SignalR Hub connection notice:', hubErr.message);
        if (isMounted) {
          // If backend hub is not running, set status to fallback demo mode so UI still works smoothly
          setConnectionStatus('standalone');
        }
      }
    }

    startMeetingSession();

    return () => {
      isMounted = false;
      // Cleanup local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Cleanup peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      // Leave room and stop hub
      if (hub) {
        try {
          hub.invoke('LeaveRoom', roomId);
          hub.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [roomId]);

  // ================= 5. MEDIA TOGGLE CONTROLS =================
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks[0].enabled = nextState;
        setIsMicOn(nextState);

        if (hubConnectionRef.current && hubConnectionRef.current.state === 'Connected') {
          hubConnectionRef.current.invoke('ToggleMediaState', roomId, { isMicOn: nextState, isCamOn });
        }
      }
    }
  }, [roomId, isCamOn]);

  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks[0].enabled = nextState;
        setIsCamOn(nextState);

        if (hubConnectionRef.current && hubConnectionRef.current.state === 'Connected') {
          hubConnectionRef.current.invoke('ToggleMediaState', roomId, { isMicOn, isCamOn: nextState });
        }
      }
    }
  }, [roomId, isMicOn]);

  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Replace video track in peer connection
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      stopScreenSharing();
    }
  }, [isScreenSharing]);

  const stopScreenSharing = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (pc && localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
      }
    }

    setIsScreenSharing(false);
  }, []);

  const toggleHandRaise = useCallback(() => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (hubConnectionRef.current && hubConnectionRef.current.state === 'Connected') {
      hubConnectionRef.current.invoke('RaiseHand', roomId, nextState);
    }
  }, [isHandRaised, roomId]);

  const sendChatMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;

      const newMsg = {
        id: Date.now().toString(),
        sender: currentUser.name || 'Tôi',
        role: currentUser.role || 'Learner',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
      };

      setChatMessages((prev) => [...prev, newMsg]);

      if (hubConnectionRef.current && hubConnectionRef.current.state === 'Connected') {
        try {
          await hubConnectionRef.current.invoke('SendChatMessage', roomId, {
            ...newMsg,
            isSelf: false,
          });
        } catch (err) {
          console.warn('Failed to send chat message over SignalR:', err);
        }
      }
    },
    [roomId, currentUser]
  );

  return {
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
  };
}
