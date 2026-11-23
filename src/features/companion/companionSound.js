/**
 * Subtle synthesized Japanese pentatonic chime using Web Audio API.
 * Strictly triggered only after explicit user interaction when `soundEnabled` is true.
 */

let sharedCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

const CHIMES = {
  tap: [523.25, 659.25],
  greet: [587.33, 783.99, 987.77],
  celebrate: [523.25, 659.25, 783.99, 1046.5],
  pop: [440, 587.33],
};

export function playSakuraChime(kind = 'tap', enabled = false) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = CHIMES[kind] || CHIMES.tap;
  const baseTime = ctx.currentTime;

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, baseTime + index * 0.065);

    gain.gain.setValueAtTime(0.0001, baseTime + index * 0.065);
    gain.gain.exponentialRampToValueAtTime(0.045, baseTime + index * 0.065 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + index * 0.065 + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(baseTime + index * 0.065);
    osc.stop(baseTime + index * 0.065 + 0.24);
  });
}
