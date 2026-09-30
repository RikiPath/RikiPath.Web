// Cần cài: npm install hanzi-writer
import { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

/**
 * Vẽ 1 chữ Kanji tương tác: nếu isNew, trình diễn từng nét đúng trước (animateCharacter),
 * sau đó luôn chuyển sang chế độ quiz cho learner tự vẽ - HanziWriter tự so khớp từng nét
 * (đúng hình + đúng thứ tự + đúng hướng) với dữ liệu chuẩn, không cần gọi API nào lúc vẽ.
 */
export default function KanjiWritingCanvas({ character, isNew, onComplete }) {
    const targetRef = useRef(null);

    useEffect(() => {
        if (!targetRef.current || !character) return undefined;

        const writer = HanziWriter.create(targetRef.current, character, {
            width: 300,
            height: 300,
            padding: 20,
            showOutline: true,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 300,
        });

        let cancelled = false;

        const startQuiz = () => {
            if (cancelled) return;
            writer.quiz({
                showHintAfterMisses: 1,
                onComplete: (summary) => {
                    if (!cancelled) onComplete(summary.totalMistakes);
                },
            });
        };

        if (isNew) {
            writer.animateCharacter({ onComplete: startQuiz });
        } else {
            startQuiz();
        }

        return () => {
            cancelled = true;
            if (targetRef.current) targetRef.current.innerHTML = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character, isNew]);

    // touch-none: chặn trình duyệt cuộn trang khi learner đang vẽ bằng ngón tay trên mobile.
    return (
        <div
            ref={targetRef}
            className="touch-none overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        />
    );
}
