import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPracticeLevelId, gradeSpeaking } from '../api/practiceGrading.js';

export function useSpeechToText() {
  const queryClient = useQueryClient();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [grading, setGrading] = useState(null);
  const gradingInProgress = useRef(false);
  const recording = useRef(null);
  const mounted = useRef(true);

  const stopListening = useCallback(() => {
    const current = recording.current;
    if (current?.state === 'recording') current.stop();
  }, []);

  const startListening = useCallback(async () => {
    if (recording.current) return;
    setLoading(true);
    setError(null);
    setTranscript('');
    setAudioFile(null);
    setGrading(null);
    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error('Trình duyệt chưa hỗ trợ thu âm.');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Trình duyệt chưa hỗ trợ định dạng thu âm của hệ thống.');
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        recording.current = null;
        if (!mounted.current) return;
        setIsListening(false);
        const mime = recorder.mimeType || 'audio/webm';
        const extension = mime.includes('mp4') ? 'mp4' : 'webm';
        const file = new File(chunks, `speaking.${extension}`, { type: mime });
        if (file.size) setAudioFile(file);
        else setError('Bản thu âm trống. Vui lòng thử lại.');
      };
      recording.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (err) {
      recording.current = null;
      stream?.getTracks().forEach(track => track.stop());
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  async function gradeRecording(topic, levelCode) {
    if (!audioFile || gradingInProgress.current) return;
    gradingInProgress.current = true;
    setLoading(true);
    setError(null);
    try {
      const levelId = await getPracticeLevelId(levelCode);
      const result = await gradeSpeaking(audioFile, levelId, topic);
      if (!mounted.current) return;
      setTranscript(result?.transcript ?? '');
      setGrading(result?.grading ?? null);
      if (!result?.grading) setError(result?.gradingNote || 'Chưa chấm được bài nói.');
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      gradingInProgress.current = false;
      if (mounted.current) setLoading(false);
      void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
    }
  }

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setAudioFile(null);
    setGrading(null);
    setError(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const recorder = recording.current;
      if (recorder?.state === 'recording') {
        recorder.onstop = null;
        recorder.stop();
      }
      recorder?.stream.getTracks().forEach(track => track.stop());
      recording.current = null;
    };
  }, []);

  return { isListening, transcript, interimTranscript: '', fullText: transcript,
    loading, error, audioFile, grading, gradeRecording, startListening, stopListening, resetTranscript };
}
