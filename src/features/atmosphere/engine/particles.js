// Canvas particle engine for near rain drops, snow and autumn leaves (sakura petals stay the original SVG petals) — one <canvas>, one rAF loop, no React
// state per frame. Density changes ramp in/out (~1.2 s); the loop idles when nothing is left to draw, pauses while
// the tab is hidden, caps the device pixel ratio and draws a single still frame under reduced motion.

const PETAL_COLORS = ['#f7b9cb', '#f4a3bb', '#fbd2dd', '#f8c3d2'];
const LEAF_COLORS = ['#d9643a', '#e8913a', '#c4452f', '#dfa645'];
const RAMP_SECONDS = 1.2;
const FADE_SECONDS = 1;

/**
 * Target counts for a scene. Kept small: the busiest case (heavy rain, Mạnh, desktop) is ≤ 110 strokes.
 * `petals` is the number of original SVG petals to show (≤ 10 DOM nodes); the canvas never draws petals.
 */
export function particleBudget({ precip, decoration, decorationFactor = 1, intensity = 'medium', compact = false, reduced = false }) {
  const scale = (compact ? 0.55 : 1) * (reduced ? 0.6 : 1);
  const rainTable = { light: [18, 28, 40], moderate: [34, 52, 76], heavy: [52, 80, 110] };
  const snowTable = { light: [10, 18, 28], moderate: [18, 28, 42], heavy: [26, 40, 60] };
  const idx = intensity === 'low' ? 0 : intensity === 'high' ? 2 : 1;
  const counts = { rain: 0, snow: 0, petals: 0, leaves: 0 };
  if (precip?.kind === 'rain') counts.rain = rainTable[precip.level]?.[idx] ?? 0;
  if (precip?.kind === 'snow') counts.snow = snowTable[precip.level]?.[idx] ?? 0;
  if (decoration === 'sakura') counts.petals = [4, 7, 10][idx] * decorationFactor;
  if (decoration === 'leaves') counts.leaves = [3, 6, 9][idx] * decorationFactor;
  for (const k of Object.keys(counts)) counts[k] = Math.round(counts[k] * scale);
  return counts;
}

const rand = (a, b) => a + Math.random() * (b - a);

function spawn(kind, w, h, cfg, fill) {
  const z = Math.random(); // depth: 0 far … 1 near
  const wind = cfg.windX || 0;
  const p = { kind, z, alpha: fill ? 1 : 0, dying: false, phase: rand(0, Math.PI * 2), rot: rand(0, Math.PI * 2) };
  if (kind === 'rain') {
    p.vy = (150 + z * 150) * (cfg.rainBoost || 1);
    p.vx = p.vy * Math.max(-0.45, Math.min(0.45, 0.08 + wind * 0.3));
    p.len = 8 + z * 12 + Math.random() * 4;
    p.w = 0.8 + z * 0.9;
    p.x = rand(-40, w + 40);
    p.y = fill ? rand(-p.len, h) : rand(-h * 0.6, -p.len);
  } else if (kind === 'snow') {
    p.vy = 12 + z * 26;
    p.vx = wind * (10 + z * 14);
    p.r = 0.8 + z * 1.7;
    p.x = rand(-10, w + 10);
    p.y = fill ? rand(-4, h) : rand(-h * 0.5, -4);
  } else {
    const leaf = kind === 'leaves';
    p.size = (leaf ? 4.5 : 3.6) + z * (leaf ? 3.5 : 3.4);
    p.vy = (leaf ? 11 : 8) + z * 10;
    p.vx = wind * (14 + z * 16) + rand(4, 10) * Math.sign(wind || 1);
    p.spin = rand(-1.6, 1.6);
    p.color = (leaf ? LEAF_COLORS : PETAL_COLORS)[Math.floor(Math.random() * 4)];
    // Some drift in from the upwind edge so petals also cross the sky horizontally.
    const fromSide = !fill && Math.random() < 0.35 + Math.min(0.3, Math.abs(wind) * 0.3);
    p.x = fromSide ? (wind >= 0 ? -10 : w + 10) : rand(-10, w + 10);
    p.y = fill ? rand(-6, h) : fromSide ? rand(0, h * 0.6) : rand(-h * 0.4, -6);
  }
  return p;
}

function drawPetal(ctx, p, t) {
  const s = p.size;
  const flip = Math.cos(p.phase + t * 2.1); // tumbling in 3D
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(0.35 + 0.65 * Math.abs(flip), 1);
  ctx.globalAlpha = p.alpha * (0.45 + 0.45 * p.z);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  if (p.kind === 'leaves') {
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s);
    ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s);
  } else {
    ctx.moveTo(-s * 0.22, -s * 0.92);
    ctx.lineTo(0, -s * 0.68);
    ctx.lineTo(s * 0.22, -s * 0.92);
    ctx.bezierCurveTo(s * 0.95, -s * 0.6, s * 0.7, s * 0.55, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.55, -s * 0.95, -s * 0.6, -s * 0.22, -s * 0.92);
  }
  ctx.fill();
  ctx.restore();
}

export function createParticleEngine(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setConfig() {}, destroy() {} };
  let w = 0;
  let h = 0;
  let cfg = { rain: 0, snow: 0, petals: 0, leaves: 0, windX: 0, fps: 30, reduced: false, tone: 'light' };
  const pool = [];
  let raf = 0;
  let last = 0;
  let acc = 0;
  let clock = 0;
  let firstFill = true;
  let configured = false;
  let destroyed = false;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (cfg.reduced) drawStill();
  };

  const counts = () => {
    const c = { rain: 0, snow: 0, petals: 0, leaves: 0 };
    for (const p of pool) if (!p.dying) c[p.kind] += 1;
    return c;
  };

  function balance(dt, fill) {
    const alive = counts();
    for (const kind of Object.keys(alive)) {
      const target = cfg[kind] || 0;
      if (alive[kind] < target) {
        const n = fill ? target - alive[kind] : Math.min(target - alive[kind], Math.max(1, Math.ceil((target / RAMP_SECONDS) * dt)));
        for (let i = 0; i < n; i += 1) pool.push(spawn(kind, w, h, cfg, fill));
      } else if (alive[kind] > target) {
        let extra = alive[kind] - target;
        for (const p of pool) {
          if (extra === 0) break;
          if (p.kind === kind && !p.dying) {
            p.dying = true;
            extra -= 1;
          }
        }
      }
    }
  }

  function step(dt) {
    clock += dt;
    for (let i = pool.length - 1; i >= 0; i -= 1) {
      const p = pool[i];
      p.alpha = p.dying ? p.alpha - dt / FADE_SECONDS : Math.min(1, p.alpha + dt / 0.6);
      if (p.kind === 'snow') {
        p.x += (p.vx + Math.sin(p.phase + clock * 1.3) * 9 * (0.4 + p.z)) * dt;
        p.y += p.vy * dt;
      } else if (p.kind === 'rain') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else {
        p.x += (p.vx + Math.sin(p.phase + clock * 0.9) * 10) * dt;
        p.y += (p.vy + Math.cos(p.phase + clock * 1.4) * 4) * dt;
        p.rot += p.spin * dt;
      }
      const out = p.y > h + 12 || p.x < -60 || p.x > w + 60;
      if (p.alpha <= 0 && p.dying) pool.splice(i, 1);
      else if (out) {
        if (p.dying) pool.splice(i, 1);
        else pool[i] = spawn(p.kind, w, h, cfg, false);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    let rainOpen = false;
    for (const p of pool) {
      if (p.kind === 'rain') {
        if (!rainOpen) {
          ctx.lineCap = 'round';
          rainOpen = true;
        }
        // Contrast follows the sky: slate-blue drops on light skies, pale drops on dark skies.
        ctx.globalAlpha = p.alpha * (cfg.tone === 'dark' ? 0.35 + 0.45 * p.z : 0.3 + 0.42 * p.z);
        ctx.strokeStyle = cfg.tone === 'dark' ? 'rgb(214, 228, 250)' : 'rgb(78, 104, 146)';
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / p.vy) * p.len, p.y - p.len);
        ctx.stroke();
      } else if (p.kind === 'snow') {
        ctx.globalAlpha = p.alpha * (0.55 + 0.4 * p.z);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (cfg.tone !== 'dark') {
          // A faint rim keeps flakes visible on pale snow skies.
          ctx.strokeStyle = 'rgba(104, 126, 160, 0.45)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      } else {
        drawPetal(ctx, p, clock);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStill() {
    pool.length = 0;
    balance(0, true);
    draw();
  }

  const hasWork = () => pool.length > 0 || cfg.rain + cfg.snow + cfg.petals + cfg.leaves > 0;

  function frame(now) {
    raf = 0;
    if (destroyed || document.hidden || cfg.reduced) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    acc += dt;
    const minStep = 1 / (cfg.fps || 30);
    if (acc >= minStep - 0.002) {
      const d = acc;
      acc = 0;
      balance(d, firstFill);
      firstFill = false;
      step(d);
      draw();
    }
    if (hasWork()) raf = window.requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  }

  const start = () => {
    if (raf || destroyed || document.hidden || cfg.reduced || !hasWork()) return;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  resize();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setConfig(next) {
      cfg = { ...cfg, ...next };
      // Only the very first scene appears already filled; later weather changes ramp density in/out.
      if (configured) firstFill = false;
      configured = true;
      if (cfg.reduced) {
        stop();
        drawStill();
        return;
      }
      start();
    },
    destroy() {
      destroyed = true;
      stop();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      pool.length = 0;
    },
  };
}
