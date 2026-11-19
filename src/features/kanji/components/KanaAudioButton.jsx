import { useEffect, useRef, useState } from 'react';
import { playKanaAudio } from '@/features/kanji/utils/kanaAudio.js';
import { SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale } from '@/locales/locale.js';

export default function KanaAudioButton({ audioUrl, character, compact = false }) {
  const { trf, tr } = useLocale();
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
      aria-label={trf('{0} phát âm {1}', { 0: playing || loading ? 'Dừng' : 'Nghe', 1: character })} aria-pressed={playing || loading}
      title={trf('Nghe phát âm {0}', { 0: character })}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-rp-brand-strong transition hover:bg-rp-brand-soft ${compact ? 'h-9 w-9' : 'bg-rp-brand-tint px-4 py-2 text-sm font-semibold'}`}>
      {loading ? (
        <SakuraLoader variant="inline" size={16} />
      ) : (
        <Icon name={playing ? 'stop_circle' : 'volume_up'} className="text-xl" />
      )}
      {!compact && (loading ? tr('Đang tải…') : playing ? tr('Dừng phát âm') : tr('Nghe phát âm'))}
    </button>
    {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
