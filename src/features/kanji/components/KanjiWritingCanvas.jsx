import { useEffect, useLayoutEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

// Light practice grid (centre cross + diagonals) drawn as a CSS background, so it never intercepts pointer input.
const GUIDE_BG = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">'
  + '<path d="M50 0V100M0 50H100" stroke="#E8DCD5" stroke-width="0.5" stroke-dasharray="2 2" fill="none" vector-effect="non-scaling-stroke"/>'
  + '<path d="M0 0L100 100M100 0L0 100" stroke="#F1E8E3" stroke-width="0.5" stroke-dasharray="1.5 2.5" fill="none" vector-effect="non-scaling-stroke"/>'
  + '</svg>',
)}")`;

/**
 * Interactive writing surface (HanziWriter). If `isNew`/`guideFirst`, it first demonstrates every stroke, then
 * switches to quiz mode where the learner writes with mouse, touch or stylus. HanziWriter itself matches each
 * stroke (shape + order + direction) against the reference data — no API call while drawing, and no React state
 * per pointer move (drawing happens inside HanziWriter's own SVG).
 *
 * Optional extras used by the Kana writing dialog:
 *  - `charDataLoader`: custom stroke data (Kana built from KanjiVG, see utils/kanaCharData.js)
 *  - `outline`: toggles the faint model character live, without restarting the quiz
 *  - `onMistake(strokeData)`, `onReady(writer)` (e.g. for a "hint" button), `quizOptions`, `guides`
 */
export default function KanjiWritingCanvas({
    character,
    isNew,
    mode = 'guided',
    onComplete,
    onCorrectStroke,
    onMistake,
    onReady,
    charDataLoader,
    size = 300,
    className = '',
    showCharacter = true,
    guideFirst = false,
    demo = false,
    outline,
    quizOptions,
    guides = false,
    ariaLabel,
}) {
    const targetRef = useRef(null);
    const callbacks = useRef({ onCorrectStroke, onComplete, onMistake, onReady });
    const writerRef = useRef(null);
    const outlineRef = useRef(outline);
    const quizRef = useRef(quizOptions);
    useLayoutEffect(() => {
        callbacks.current = { onCorrectStroke, onComplete, onMistake, onReady };
        quizRef.current = quizOptions;
    });

    useEffect(() => {
        if (!targetRef.current || !character) return undefined;
        const target = targetRef.current;

        const writer = HanziWriter.create(target, character, {
            width: size,
            height: size,
            padding: 24,
            showCharacter,
            showOutline: outlineRef.current ?? mode === 'guided',
            strokeAnimationSpeed: 0.8,
            delayBetweenStrokes: 280,
            strokeColor: '#AD3155',
            outlineColor: '#C9A3B2',
            highlightColor: '#AD3155',
            drawingColor: '#3A2C33',
            drawingWidth: 5,
            ...(charDataLoader ? { charDataLoader } : {}),
        });
        writerRef.current = writer;

        let cancelled = false;

        const startQuiz = () => {
            if (cancelled) return;
            callbacks.current.onReady?.(writer);
            writer.quiz({
                showHintAfterMisses: 1,
                ...(quizRef.current || {}),
                onCorrectStroke: (stroke) => {
                    if (!cancelled) callbacks.current.onCorrectStroke?.(stroke.strokeNum, stroke);
                },
                onMistake: (stroke) => {
                    if (!cancelled) callbacks.current.onMistake?.(stroke);
                },
                onComplete: (summary) => {
                    if (!cancelled) callbacks.current.onComplete?.(summary.totalMistakes);
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
            writerRef.current = null;
            target.innerHTML = '';
        };
    }, [character, isNew, mode, charDataLoader, size, showCharacter, guideFirst, demo]);

    // Toggle the model character without recreating the writer (keeps quiz progress).
    useEffect(() => {
        outlineRef.current = outline;
        const writer = writerRef.current;
        if (!writer || outline === undefined) return;
        if (outline) writer.showOutline({ duration: 200 });
        else writer.hideOutline({ duration: 200 });
    }, [outline]);

    // touch-none: stops the page from scrolling while the learner draws with a finger on mobile.
    return (
        <div
            ref={targetRef}
            role={ariaLabel ? 'img' : undefined}
            aria-label={ariaLabel}
            style={guides ? { backgroundImage: GUIDE_BG, backgroundSize: '100% 100%' } : undefined}
            className={`touch-none select-none overflow-hidden rounded-[28px] border border-rp-line bg-white ${className}`}
        />
    );
}
