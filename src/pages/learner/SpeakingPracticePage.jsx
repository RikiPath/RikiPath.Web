import { useSpeechToText } from '../../hooks/useSpeechToText.js';

export default function SpeakingPracticePage() {
    const targetSentence = '日本語の話し方を練習しています。';

    const {
        isListening,
        transcript,
        interimTranscript,
        fullText,
        loading,
        error,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechToText({ language: 'ja-JP' });

    const handleToggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-center text-slate-800">
                🎙️ Trang Luyện Nói Tiếng Nhật
            </h1>

            {/* Thẻ câu mẫu */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-sm text-slate-500 font-medium">Mẫu câu cần đọc:</span>
                <p className="text-xl font-semibold text-slate-900 mt-1">{targetSentence}</p>
            </div>

            {/* Khung hiển thị chữ Real-Time */}
            <div className="p-4 bg-white border border-slate-300 rounded-lg min-h-[120px] shadow-sm">
                <span className="text-sm text-slate-400 block mb-2">Kết quả nhận dạng:</span>
                <div className="text-lg leading-relaxed break-words">
                    {/* Chữ đã chốt */}
                    <span className="text-slate-900 font-medium">{transcript}</span>

                    {/* Chữ ĐANG NÓI (nhảy liên tục real-time) */}
                    {interimTranscript && (
                        <span className="text-blue-600 italic ml-1.5 animate-pulse">
                            {interimTranscript}...
                        </span>
                    )}

                    {!fullText && !isListening && (
                        <span className="text-slate-400 italic">
                            Nhấn nút mic bên dưới để bắt đầu nói...
                        </span>
                    )}
                </div>
            </div>

            {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}

            {/* Nút điều khiển */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={handleToggleListening}
                    disabled={loading}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${isListening
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-600 hover:bg-blue-700'
                        } disabled:opacity-50`}
                >
                    {loading
                        ? 'Đang kết nối Token...'
                        : isListening
                            ? '🛑 Dừng Nói'
                            : '🎙️ Bắt Đầu Luyện Nói'}
                </button>

                <button
                    onClick={resetTranscript}
                    disabled={loading || isListening}
                    className="px-4 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    🔄 Xóa Làm Lai
                </button>
            </div>
        </div>
    );
}