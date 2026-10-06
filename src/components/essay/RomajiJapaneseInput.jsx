import { useRef, useState } from 'react';
import { addPersonalDictionaryEntry, searchJapaneseDictionary } from '../../api/japaneseDictionaryApi.js';
import { isRomajiKey, romajiToHiragana } from '../../utils/romaji.js';

export default function RomajiJapaneseInput({ value, onChange, disabled = false }) {
  const textareaRef = useRef(null);
  const [mode, setMode] = useState('romaji');
  const [romaji, setRomaji] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [personalForm, setPersonalForm] = useState(null);
  const [error, setError] = useState('');
  const bufferRange = useRef(null);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  function replaceBuffer(text) {
    const textarea = textareaRef.current;
    const start = bufferRange.current?.start ?? textarea?.selectionStart ?? value.length;
    const end = bufferRange.current?.end ?? textarea?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    onChange(next);
    bufferRange.current = { start, end: start + text.length };
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Trình duyệt này chưa hỗ trợ nhập bằng giọng nói. Hãy dùng Chrome hoặc Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      replaceBuffer(transcript);
    };
    recognition.onerror = (event) => setError(`Không thể nhận diện giọng nói: ${event.error}`);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopSpeechRecognition() {
    recognitionRef.current?.stop();
  }

  async function showCandidates(kana = romajiToHiragana(romaji)) {
    if (!kana) return;
    setLoading(true);
    setCandidates([]);
    setActiveCandidateIndex(0);
    setError('');
    try {
      const matches = await searchJapaneseDictionary(kana);
      setCandidates(matches);
      setActiveCandidateIndex(0);
      if (!matches.length) {
        replaceBuffer(`${romajiToHiragana(romaji)} `);
        setRomaji('');
        bufferRange.current = null;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function chooseCandidate(candidate) {
    replaceBuffer(candidate.surface);
    setRomaji('');
    setCandidates([]);
    setActiveCandidateIndex(0);
    bufferRange.current = null;
  }

  function commitKanaAndContinue() {
    replaceBuffer(`${romajiToHiragana(romaji)} `);
    setRomaji('');
    setCandidates([]);
    setActiveCandidateIndex(0);
    bufferRange.current = null;
  }

  async function savePersonalEntry(event) {
    event.preventDefault();
    try {
      const saved = await addPersonalDictionaryEntry(personalForm);
      chooseCandidate(saved);
      setPersonalForm(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleKeyDown(event) {
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

  return (
    <div className="relative">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-label-md font-semibold">Nội dung bài viết</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={listening ? stopSpeechRecognition : startSpeechRecognition} disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-[#eadfd9] bg-white px-3 py-1.5 text-label-sm text-primary disabled:opacity-50">
            <span className="material-symbols-outlined text-[17px]">{listening ? 'mic_off' : 'mic'}</span>
            {listening ? 'Dừng ghi' : 'Nói tiếng Nhật'}
          </button>
          <select value={mode} onChange={(event) => { setMode(event.target.value); setRomaji(''); setCandidates([]); setActiveCandidateIndex(0); }} className="max-w-full rounded-full border border-[#eadfd9] bg-white px-3 py-1.5 text-label-sm">
            <option value="romaji">Gõ Romaji</option>
            <option value="direct">Gõ tiếng Nhật trực tiếp</option>
          </select>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="min-h-[280px] w-full rounded-2xl border border-[#eadfd9] bg-surface-container-low p-4 text-body-md leading-8 outline-none focus:border-primary"
        placeholder={mode === 'romaji' ? 'Gõ watashi wa rồi nhấn Space để chọn 私は...' : 'Nhập tiếng Nhật bằng IME hệ điều hành...'}
      />
      {romaji && <p className="mt-1 text-label-sm text-on-surface-variant">Đang nhập: {romajiToHiragana(romaji)}</p>}
      {(loading || candidates.length > 0 || (romaji && !loading)) && (
        <div className="absolute left-0 right-0 z-10 mt-1 rounded-2xl border border-[#eadfd9] bg-white p-3 shadow-lg">
          {loading && <p className="text-label-sm text-on-surface-variant">Đang tìm ứng viên...</p>}
          {!loading && candidates.map((candidate, index) => (
            <button key={candidate.id} type="button" onClick={() => chooseCandidate(candidate)} aria-pressed={activeCandidateIndex === index} className={`mr-2 mb-2 rounded-xl px-3 py-2 text-left ${activeCandidateIndex === index ? 'bg-secondary-container ring-2 ring-primary' : 'bg-surface-container-low hover:bg-secondary-container'}`}>
              <strong className="mr-2 text-lg">{candidate.surface}</strong>
              <span className="text-label-sm">{candidate.readingKana} · {candidate.meaning}</span>
            </button>
          ))}
          {!loading && candidates.length > 0 && <p className="text-xs text-on-surface-variant">↑/↓ chọn · Enter thay thế · Space giữ kana và tiếp tục</p>}
          {!loading && !candidates.length && romaji && (
            <button type="button" onClick={() => setPersonalForm({ surface: '', readingKana: romajiToHiragana(romaji), readingRomaji: romaji, meaning: '', isKatakana: false })} className="text-label-sm text-primary hover:underline">
              Không có từ phù hợp? Thêm vào từ điển cá nhân
            </button>
          )}
        </div>
      )}
      {personalForm && (
        <form onSubmit={savePersonalEntry} className="mt-3 rounded-2xl bg-secondary-container/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {['surface', 'readingKana', 'readingRomaji', 'meaning'].map((field) => (
              <input key={field} required={field !== 'readingRomaji'} value={personalForm[field]} onChange={(event) => setPersonalForm({ ...personalForm, [field]: event.target.value })} placeholder={field} className="rounded-lg border border-[#eadfd9] bg-white px-3 py-2 text-label-md" />
            ))}
          </div>
          <button type="submit" className="mt-2 rounded-lg bg-primary px-3 py-2 text-label-sm text-on-primary">Lưu từ cá nhân</button>
        </form>
      )}
      {error && <p className="mt-2 text-label-sm text-error">{error}</p>}
    </div>
  );
}
