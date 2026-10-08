import { useState, useRef, useCallback, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { getSpeechToken } from '../api/speechApi.js';

export function useSpeechToText({ language = 'ja-JP' } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');           // Chữ đã chốt chính thức
    const [interimTranscript, setInterimTranscript] = useState(''); // Chữ đang nói (chạy tức thì)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const recognizerRef = useRef(null);

    // Hàm dừng thu âm
    const stopListening = useCallback(async () => {
        if (recognizerRef.current) {
            try {
                await new Promise((resolve) => {
                    recognizerRef.current.stopContinuousRecognitionAsync(
                        () => resolve(),
                        () => resolve()
                    );
                });
                recognizerRef.current.close();
                recognizerRef.current = null;
            } catch (err) {
                console.error('Lỗi khi đóng recognizer:', err);
            }
        }
        setIsListening(false);
        setInterimTranscript('');
    }, []);

    // Hàm bắt đầu thu âm
    const startListening = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Gọi API lấy Token tạm từ Backend
            const resData = await getSpeechToken();
            const token = resData?.token;
            const region = resData?.region || 'eastus';

            if (!token) {
                throw new Error('Không lấy được Token hợp lệ từ Server.');
            }

            // 2. Khởi tạo Azure Speech Config
            const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
            speechConfig.speechRecognitionLanguage = language;

            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

            // 3. SỰ KIỆN 1: Nói tới đâu chữ nhảy ra ngay tới đó (Interim Result)
            recognizer.recognizing = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                    setInterimTranscript(e.result.text);
                }
            };

            // 4. SỰ KIỆN 2: Ngắt câu -> Chốt chữ chính thức (Final Result)
            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
                    setTranscript((prev) => (prev ? `${prev} ${e.result.text}` : e.result.text));
                    setInterimTranscript(''); // Reset chữ tạm thời
                }
            };

            // 5. Xử lý khi bị hủy hoặc gặp lỗi
            recognizer.canceled = (s, e) => {
                if (e.reason === SpeechSDK.CancellationReason.Error) {
                    setError(`Lỗi Azure Speech: ${e.errorDetails}`);
                }
                stopListening();
            };

            recognizer.sessionStopped = () => {
                setIsListening(false);
            };

            // 6. Bắt đầu thu âm liên tục
            await new Promise((resolve, reject) => {
                recognizer.startContinuousRecognitionAsync(
                    () => resolve(),
                    (err) => reject(err)
                );
            });

            recognizerRef.current = recognizer;
            setIsListening(true);
        } catch (err) {
            setError(err.message ?? 'Không thể khởi động micro hoặc kết nối nhận dạng.');
            setIsListening(false);
        } finally {
            setLoading(false);
        }
    }, [language, stopListening]);

    // Reset lại từ đầu
    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
    }, []);

    // Cleanup khi component bị unmount
    useEffect(() => {
        return () => {
            if (recognizerRef.current) {
                recognizerRef.current.close();
            }
        };
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        fullText: `${transcript} ${interimTranscript}`.trim(),
        loading,
        error,
        startListening,
        stopListening,
        resetTranscript,
    };
}