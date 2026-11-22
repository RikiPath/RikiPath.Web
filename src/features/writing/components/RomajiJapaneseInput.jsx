import { useEffect, useRef, useState } from 'react';
import { searchJapaneseDictionary } from '@/features/vocabulary/api/japaneseDictionaryApi.js';
import { isRomajiKey, romajiToHiragana } from '@/utils/romaji.js';
import { useSpeechToText } from '@/features/speaking/hooks/useSpeechToText.js';
import { Mic, MicOff } from 'lucide-react';
import { Button, CustomSelect } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function RomajiJapaneseInput({ value = '', onChange, disabled = false, onSpeechBusyChange }) {
  const { tr, trf } = useLocale();
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const latestValueRef = useRef(value);
  useEffect(() => { latestValueRef.current = value; }, [value]);

  const [mode, setMode] = useState('romaji');
  const [romaji, setRomaji] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bufferRange = useRef(null);
  const speech = useSpeechToText({ language: 'ja-JP', onTranscript: replaceBuffer });
  const listening = speech.isListening;
  const speechBusy = listening || speech.loading;
  useEffect(() => { onSpeechBusyChange?.(speechBusy); }, [onSpeechBusyChange, speechBusy]);

  function closeCandidates() {
    setCandidates([]);
    setLookupSearched(false);
    setActiveCandidateIndex(0);
  }

  useEffect(() => {
    function handleOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeCandidates();
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function replaceBuffer(text) {
    const current = latestValueRef.current || '';
    const textarea = textareaRef.current;
    const start = bufferRange.current?.start ?? textarea?.selectionStart ?? current.length;
    const end = bufferRange.current?.end ?? textarea?.selectionEnd ?? current.length;
    const nextValue = `${current.slice(0, start)}${text}${current.slice(end)}`;
    latestValueRef.current = nextValue;
    onChange(nextValue);
    bufferRange.current = { start, end: start + text.length };
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function startSpeechRecognition() {
    setRomaji('');
    closeCandidates();
    setError('');
    const current = latestValueRef.current || '';
    bufferRange.current = {
      start: textareaRef.current?.selectionStart ?? current.length,
      end: textareaRef.current?.selectionEnd ?? current.length,
    };
    speech.resetTranscript();
    void speech.startListening();
  }

  function stopSpeechRecognition() {
    void speech.stopListening();
  }

  async function showCandidates(kana = romajiToHiragana(romaji)) {
    if (!kana) return;
    setLoading(true);
    setCandidates([]);
    setLookupSearched(false);
    setActiveCandidateIndex(0);
    setError('');
    try {
      const matches = await searchJapaneseDictionary(kana);
      setCandidates(matches);
      setLookupSearched(true);
      setActiveCandidateIndex(0);
      if (!matches.length) {
        replaceBuffer(`${kana} `);
        setRomaji('');
        setLookupSearched(false);
        bufferRange.current = null;
      }
    } catch (err) {
      setError(err?.message || tr('Chưa tra được từ gợi ý.'));
    } finally {
      setLoading(false);
    }
  }

  function chooseCandidate(candidate) {
    replaceBuffer(candidate.surface);
    setRomaji('');
    closeCandidates();
    bufferRange.current = null;
  }

  function commitKanaAndContinue() {
    replaceBuffer(`${romajiToHiragana(romaji)} `);
    setRomaji('');
    closeCandidates();
    bufferRange.current = null;
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && (candidates.length > 0 || lookupSearched)) {
      event.preventDefault();
      closeCandidates();
      return;
    }
    if (mode !== 'romaji') return;
    // Some Japanese IMEs mark Space as composing even though this component
    // owns the Romaji buffer. Handle dictionary lookup before the IME guard.
    if (event.key === ' ' && romaji) {
      event.preventDefault();
      if (loading) return;
      if (candidates.length > 0) {
        commitKanaAndContinue();
        return;
      }
      showCandidates();
      return;
    }
    if (candidates.length > 0 && event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveCandidateIndex((index) => (index + 1) % candidates.length);
      return;
    }
    if (candidates.length > 0 && event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveCandidateIndex((index) => (index - 1 + candidates.length) % candidates.length);
      return;
    }
    if (event.key === 'Enter' && candidates.length > 0) {
      event.preventDefault();
      chooseCandidate(candidates[activeCandidateIndex]);
      return;
    }
    if (event.isComposing) return;
    if (isRomajiKey(event.key)) {
      event.preventDefault();
      const next = romaji + event.key;
      if (!romaji) {
        bufferRange.current = {
          start: event.currentTarget.selectionStart,
          end: event.currentTarget.selectionEnd,
        };
      }
      closeCandidates();
      setRomaji(next);
      replaceBuffer(romajiToHiragana(next));
      return;
    }
    if (event.key === 'Backspace' && romaji) {
      event.preventDefault();
      const next = romaji.slice(0, -1);
      setRomaji(next);
      replaceBuffer(romajiToHiragana(next));
    }
  }

  const modeOptions = [
    { value: 'romaji', label: tr('Gõ Romaji') },
    { value: 'direct', label: tr('Gõ tiếng Nhật trực tiếp') },
  ];

  const showPopover = loading || candidates.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-rp-text">{tr('Nội dung bài viết')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={listening ? 'danger' : 'secondary'}
            size="sm"
            onClick={listening ? stopSpeechRecognition : startSpeechRecognition}
            disabled={disabled || speech.loading}
            icon={listening ? MicOff : Mic}
          >
            {speech.loading ? tr('Đang xử lý…') : listening ? tr('Dừng ghi') : tr('Nhập bằng giọng nói')}
          </Button>
          <div className="w-52">
            <CustomSelect
              size="sm"
              aria-label={tr('Kiểu gõ tiếng Nhật')}
              value={mode}
              disabled={disabled || speechBusy}
              onChange={(nextMode) => {
                setMode(nextMode);
                setRomaji('');
                closeCandidates();
              }}
              options={modeOptions}
            />
          </div>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        lang="ja"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || speechBusy}
        className="rp-focus min-h-[280px] w-full rounded-rp-card border border-rp-line bg-rp-bg-2 p-4 text-[15px] leading-8 text-rp-text placeholder:text-rp-text-muted focus:border-rp-brand-border focus:bg-rp-surface disabled:opacity-60"
        placeholder={mode === 'romaji' ? tr('Gõ watashi wa rồi nhấn Space để chọn 私は...') : tr('Nhập tiếng Nhật bằng IME hệ điều hành...')}
      />
      {romaji && (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-rp-text-muted">
          <span>{trf('Đang nhập: {0}', { 0: romajiToHiragana(romaji) })}</span>
          <button
            type="button"
            onClick={commitKanaAndContinue}
            className="rp-link font-medium"
          >
            {trf('Chèn "{0}" (Space)', { 0: romajiToHiragana(romaji) })}
          </button>
        </div>
      )}
      {showPopover && (
        <div className="absolute left-0 right-0 z-10 mt-1 rounded-rp-card border border-rp-line bg-rp-surface p-3 shadow-rp-card">
          {loading && <p className="text-xs text-rp-text-muted">{tr('Đang tìm ứng viên...')}</p>}
          {!loading && candidates.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => chooseCandidate(candidate)}
              aria-pressed={activeCandidateIndex === index}
              className={`mr-2 mb-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                activeCandidateIndex === index
                  ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                  : 'border-rp-line bg-rp-bg-2 text-rp-text hover:bg-rp-brand-tint/60'
              }`}
            >
              <strong lang="ja" className="mr-2 text-lg">{candidate.surface}</strong>
              <span className="text-xs text-rp-text-muted">{candidate.readingKana} · {candidate.meaning}</span>
            </button>
          ))}
          {!loading && candidates.length > 0 && (
            <p className="text-xs text-rp-text-muted">{tr('↑/↓ chọn · Enter thay thế · Space giữ kana · Esc đóng')}</p>
          )}
        </div>
      )}
      {(error || speech.error) && (
        <p role="alert" className="mt-2 text-xs font-medium text-rp-danger">{error || speech.error}</p>
      )}
    </div>
  );
}
