import KanjiWritingCanvas from '../../components/kanji_writer/KanjiWritingCanvas';
import { useKanjiWritingPractice } from '../../hooks/useKanjiWritingPractice.js';

const stateWrapperClass = 'mx-auto my-16 max-w-md p-6 text-center';
const primaryButtonClass =
    'mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400';

export default function KanjiWritingPracticePage() {
    const {
        currentItem,
        index,
        total,
        isFinished,
        loading,
        error,
        lastResult,
        submitResult,
        reload,
    } = useKanjiWritingPractice(10);

    if (loading) {
        return (
            <div className={stateWrapperClass}>
                <p className="text-gray-500">Đang tải danh sách chữ cần luyện...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={stateWrapperClass}>
                <p className="text-red-600">{error}</p>
                <button type="button" className={primaryButtonClass} onClick={reload}>
                    Thử lại
                </button>
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className={stateWrapperClass}>
                <p className="text-gray-700">Hôm nay bạn đã luyện hết chữ cần ôn. Quay lại sau nhé!</p>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className={stateWrapperClass}>
                <p className="text-gray-700">Đã hoàn thành {total} chữ cho hôm nay.</p>
                <button type="button" className={primaryButtonClass} onClick={reload}>
                    Luyện thêm
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-6">
            <div className="text-sm text-gray-500">Chữ {index + 1}/{total}</div>

            <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{currentItem.meaning}</div>
                {(currentItem.onYomi || currentItem.kunYomi) && (
                    <div className="mt-1 flex justify-center gap-3 text-sm text-gray-500">
                        {currentItem.onYomi && <span>On: {currentItem.onYomi}</span>}
                        {currentItem.kunYomi && <span>Kun: {currentItem.kunYomi}</span>}
                    </div>
                )}
            </div>

            <KanjiWritingCanvas
                key={currentItem.kanjiEntryId}
                character={currentItem.character}
                isNew={currentItem.isNew}
                onComplete={submitResult}
            />

            {lastResult && (
                <div className="text-sm text-gray-600">
                    Sai {lastResult.totalMistakes} nét · Ôn lại sau {lastResult.intervalDays} ngày
                </div>
            )}
        </div>
    );
}
