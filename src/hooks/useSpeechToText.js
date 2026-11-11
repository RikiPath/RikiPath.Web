import { useState, useRef, useCallback, useEffect } from 'react';
import { createSpeechStreamingSession } from '../api/speechApi.js';
import { encodeAudioEvent, decodeEventStream, Pcm16Resampler, TranscribeTranscript } from '../utils/transcribeEventStream.js';

const workletSource = `
class RikiPathPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.samples = []; this.ended = false;
    this.port.onmessage = () => { this.emit(); this.ended = true; this.port.postMessage('flushed'); };
  }
  emit() {
    if (!this.samples.length) return;
    const block = new Float32Array(this.samples); this.samples = [];
    this.port.postMessage(block, [block.buffer]);
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && !this.ended) {
      for (const sample of channel) this.samples.push(sample);
      if (this.samples.length >= 2048) this.emit();
    }
    return true;
  }
}
registerProcessor('rikipath-pcm-capture', RikiPathPcmCapture);`;

export function useSpeechToText({ language = 'ja-JP', onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const active = useRef(null), generation = useRef(0), finalized = useRef('');
  const callback = useRef(onTranscript);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);

  const releaseAudio = useCallback((session) => {
    session.node?.disconnect(); session.source?.disconnect();
    session.stream?.getTracks().forEach(track => track.stop());
    if (session.context && session.context.state !== 'closed') void session.context.close().catch(() => {});
    clearTimeout(session.maxTimer);
  }, []);
  const close = useCallback((session) => {
    releaseAudio(session);
    clearTimeout(session.drainTimer); clearTimeout(session.connectTimer); clearTimeout(session.flushTimer);
    session.rejectConnect?.(new Error('Phiên nhận dạng đã đóng.'));
    if (session.socket && session.socket.readyState < WebSocket.CLOSING) session.socket.close();
    session.resolveStop?.(); session.resolveFlush?.();
    if (active.current === session) active.current = null;
  }, [releaseAudio]);

  const stopListening = useCallback(async () => {
    const session = active.current;
    if (!session || session.stopping) return;
    session.stopping = true; setIsListening(false); setLoading(true);
    if (session.node) {
      await new Promise(resolve => {
        session.resolveFlush = resolve;
        session.flushTimer = setTimeout(resolve, 500);
        session.node.port.postMessage('flush');
      });
    }
    releaseAudio(session); session.inputEnded = true;
    if (active.current !== session || generation.current !== session.generation) return;
    if (session.socket?.readyState !== WebSocket.OPEN || active.current !== session) {
      generation.current++; close(session); setLoading(false); return;
    }
    session.socket.send(encodeAudioEvent());
    await new Promise(resolve => {
      session.resolveStop = resolve;
      session.drainTimer = setTimeout(() => close(session), 5000);
    });
    if (generation.current === session.generation) {
      callback.current?.(finalized.current);
      setInterimTranscript(''); setLoading(false);
    }
  }, [releaseAudio, close]);

  const startListening = useCallback(async () => {
    if (active.current) return;
    const current = ++generation.current;
    const session = { generation: current, prefix: finalized.current, results: new TranscribeTranscript(), stopping: false };
    active.current = session; setLoading(true); setError(null);
    try {
      if (language !== 'ja-JP') throw new Error('Phiên này chỉ hỗ trợ nhận dạng tiếng Nhật.');
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw new Error('Micro yêu cầu HTTPS hoặc localhost và trình duyệt hỗ trợ AudioWorklet.');
      session.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      if (generation.current !== current || active.current !== session) { close(session); return; }
      const config = await createSpeechStreamingSession();
      if (generation.current !== current || active.current !== session) { close(session); return; }
      if (config.provider !== 'AmazonTranscribe' || config.language !== language || config.mediaEncoding !== 'pcm' || config.sampleRate !== 16000) throw new Error('Cấu hình nhận dạng từ máy chủ không tương thích.');
      const endpoint = new URL(config.webSocketUrl);
      if (endpoint.protocol !== 'wss:' || !/^transcribestreaming\.[a-z0-9-]+\.amazonaws\.com$/.test(endpoint.hostname)) throw new Error('Địa chỉ nhận dạng không hợp lệ.');
      const socket = new WebSocket(endpoint.href);
      socket.binaryType = 'arraybuffer'; session.socket = socket;
      socket.onmessage = (event) => {
        if (active.current !== session) return;
        try {
          for (const message of decodeEventStream(event.data)) {
            if (message.headers[':message-type'] === 'exception') throw new Error('Amazon Transcribe từ chối phiên nhận dạng. Hãy thử lại.');
            if (message.headers[':event-type'] !== 'TranscriptEvent') continue;
            const next = session.results.apply(message.payload);
            const full = [session.prefix, next.transcript].filter(Boolean).join(' ');
            finalized.current = full; setTranscript(full); setInterimTranscript(next.interimTranscript);
            callback.current?.([full, next.interimTranscript].filter(Boolean).join(' '));
          }
        } catch (err) { setError(err.message); close(session); setIsListening(false); setLoading(false); }
      };
      socket.onclose = () => {
        const wasActive = active.current === session, expected = session.stopping;
        close(session);
        if (wasActive) {
          callback.current?.(finalized.current);
          setIsListening(false); setLoading(false); setInterimTranscript('');
          if (!expected) setError('Kết nối nhận dạng đã ngắt. Bạn có thể nói tiếp bằng phiên mới.');
        }
      };
      await new Promise((resolve, reject) => {
        session.rejectConnect = reject;
        session.connectTimer = setTimeout(() => reject(new Error('Kết nối nhận dạng quá thời gian chờ.')), 15000);
        socket.onopen = () => { clearTimeout(session.connectTimer); resolve(); };
        socket.onerror = () => reject(new Error('Không thể kết nối Amazon Transcribe. Kiểm tra mạng và quyền IAM.'));
      });
      if (active.current !== session || generation.current !== current) { close(session); return; }
      socket.onerror = () => { setError('Kết nối nhận dạng gặp lỗi.'); close(session); setIsListening(false); setLoading(false); };
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      session.context = new AudioContext({ sampleRate: 16000 });
      await session.context.resume();
      const moduleUrl = URL.createObjectURL(new Blob([workletSource], { type: 'application/javascript' }));
      try { await session.context.audioWorklet.addModule(moduleUrl); } finally { URL.revokeObjectURL(moduleUrl); }
      if (active.current !== session) return;
      const resampler = new Pcm16Resampler(session.context.sampleRate, config.sampleRate);
      session.source = session.context.createMediaStreamSource(session.stream);
      session.node = new AudioWorkletNode(session.context, 'rikipath-pcm-capture', { channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1] });
      session.node.port.onmessage = (event) => {
        if (event.data === 'flushed') { clearTimeout(session.flushTimer); session.resolveFlush?.(); return; }
        if (session.inputEnded || socket.readyState !== WebSocket.OPEN) return;
        if (socket.bufferedAmount > 1024 * 1024) { setError('Mạng không theo kịp âm thanh. Hãy thử lại.'); close(session); setIsListening(false); setLoading(false); return; }
        const pcm = resampler.encode(event.data);
        if (pcm.length) socket.send(encodeAudioEvent(pcm));
      };
      session.source.connect(session.node); session.node.connect(session.context.destination);
      session.maxTimer = setTimeout(() => { void stopListening(); }, 5 * 60 * 1000);
      setIsListening(true);
    } catch (err) {
      close(session);
      if (generation.current === current) { setError(err.name === 'NotAllowedError' ? 'Bạn chưa cấp quyền sử dụng micro.' : err.message || 'Không thể bắt đầu nhận dạng.'); setIsListening(false); }
    } finally { if (generation.current === current) setLoading(false); }
  }, [language, close, stopListening]);

  const resetTranscript = useCallback(() => {
    if (active.current) return;
    finalized.current = ''; setTranscript(''); setInterimTranscript(''); setError(null);
  }, []);
  useEffect(() => () => { generation.current++; if (active.current) close(active.current); }, [close]);
  return { isListening, transcript, interimTranscript, fullText: [transcript, interimTranscript].filter(Boolean).join(' '), loading, error, startListening, stopListening, resetTranscript };
}
