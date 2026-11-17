// Cần cài: npm install hanzi-writer
import { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

/**
 * Vẽ 1 chữ Kanji tương tác: nếu isNew, trình diễn từng nét đúng trước (animateCharacter),
 * sau đó luôn chuyển sang chế độ quiz cho learner tự vẽ - HanziWriter tự so khớp từng nét
 * (đúng hình + đúng thứ tự + đúng hướng) với dữ liệu chuẩn, không cần gọi API nào lúc vẽ.
 */
export default function KanjiWritingCanvas({
    character,
    isNew,
    mode = 'guided',
    onComplete,
    onCorrectStroke,
    charDataLoader,
    size = 300,
    className = '',
    showCharacter = true,
    guideFirst = false,
    demo = false,
}) {
    const targetRef = useRef(null);
    const onStrokeRef = useRef(onCorrectStroke);
    onStrokeRef.current = onCorrectStroke;

    useEffect(() => {
        if (!targetRef.current || !character) return undefined;
        const target = targetRef.current;

        const writer = HanziWriter.create(target, character, {
            width: size,
            height: size,
            padding: 24,
            showCharacter,
            showOutline: mode === 'guided',
            strokeAnimationSpeed: 0.8,
            delayBetweenStrokes: 280,
            strokeColor: '#AD3155',
            outlineColor: '#C9A3B2',
            highlightColor: '#AD3155',
            drawingColor: '#3A2C33',
            ...(charDataLoader ? { charDataLoader } : {}),
        });

        let cancelled = false;

        const startQuiz = () => {
            if (cancelled) return;
            writer.quiz({
                showHintAfterMisses: 1,
                onCorrectStroke: (stroke) => {
                    if (!cancelled) onStrokeRef.current?.(stroke.strokeNum);
                },
                onComplete: (summary) => {
                    if (!cancelled) onComplete?.(summary.totalMistakes);
                },
            });
        };

        if (demo) {
            writer.loopCharacterAnimation();
        } else if (guideFirst || (mode === 'guided' && isNew)) {
            writer.animateCharacter({ onComplete: startQuiz });
        } else {
            startQuiz();
        }

        return () => {
            cancelled = true;
            target.innerHTML = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character, isNew, mode, charDataLoader, size, showCharacter, guideFirst, demo]);

    // touch-none: chặn trình duyệt cuộn trang khi learner đang vẽ bằng ngón tay trên mobile.
    return (
        <div
            ref={targetRef}
            className={`touch-none overflow-hidden rounded-[28px] border border-[#E7DAE1] bg-white ${className}`}
        />
    );
}
