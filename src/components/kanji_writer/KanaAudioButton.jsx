import { useEffect, useRef, useState } from 'react';
import { playKanaAudio } from '../../utils/kanaAudio.js';

export default function KanaAudioButton({ audioUrl, character, compact = false }) {
  const stop = useRef(null);
  const mounted = useRef(false);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop.current?.(); };
  }, [audioUrl, character]);

  function toggle() {
    setError('');
    if (state !== 'idle') { stop.current?.(); return; }
    stop.current = playKanaAudio(audioUrl, character,
      next => { if (mounted.current) setState(next); },
      message => { if (mounted.current) setError(message); });
  }

  const playing = state === 'playing';
  const loading = state === 'loading';
  return <div className={compact ? 'text-center' : ''}>
    <button type="button" onClick={toggle}
      aria-label={`${playing || loading ? 'Dừng' : 'Nghe'} phát âm ${character}`} aria-pressed={playing || loading}
      title={`Nghe phát âm ${character}`}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-[#B52F55] transition hover:bg-[#fbe4ec] ${compact ? 'h-9 w-9' : 'bg-[#fff0f5] px-4 py-2 text-sm font-semibold'}`}>
      <span aria-hidden="true" className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : playing ? 'stop_circle' : 'volume_up'}</span>
      {!compact && (loading ? 'Đang tải…' : playing ? 'Dừng phát âm' : 'Nghe phát âm')}
    </button>
    {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
