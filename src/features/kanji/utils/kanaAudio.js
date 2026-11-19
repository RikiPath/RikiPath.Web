let stopActive = null;

// Called only from the learner's explicit audio-button click.
export function playKanaAudio(audioUrl, character, onState, onError) {
  stopActive?.();
  let stopped = false;
  let utterance = null;
  let usedFallback = false;
  const audio = audioUrl ? new Audio(audioUrl) : null;
  function stop() {
    stopped = true;
    if (audio) {
      audio.onplaying = audio.onended = audio.onerror = null;
      audio.pause();
    }
    if (utterance) window.speechSynthesis.cancel();
    if (stopActive === stop) stopActive = null;
    onState('idle');
  }
  stopActive = stop;

  function fail() {
    if (stopped) return;
    stop();
    onError('Không phát được âm thanh. Hãy thử lại hoặc cài giọng tiếng Nhật cho trình duyệt.');
  }

  function fallback() {
    if (stopped || usedFallback) return;
    usedFallback = true;
    const speech = window.speechSynthesis;
    const voice = speech?.getVoices().find(item => /^ja([-_]|$)/i.test(item.lang));
    if (!voice || !window.SpeechSynthesisUtterance) { fail(); return; }
    utterance = new SpeechSynthesisUtterance(character);
    utterance.voice = voice; utterance.lang = 'ja-JP'; utterance.rate = 0.75;
    utterance.onstart = () => { if (!stopped) onState('playing'); };
    utterance.onend = () => { if (!stopped) stop(); };
    utterance.onerror = fail;
    speech.speak(utterance);
  }

  onState('loading');
  if (audio) {
    audio.onplaying = () => { if (!stopped) onState('playing'); };
    audio.onended = () => { if (!stopped) stop(); };
    audio.onerror = fallback;
    audio.play().catch(fallback);
  } else fallback();
  return stop;
}
