// H. EEG-like traces on a canvas, drawn at 60 fps while visible: the EEGProc recording strip,
// the home-page hero and the featured-project card all use it with different options.
import { CHANNELS, rng } from "./lib/signal.js";

// Most traces are ink; a few carry band colors.
const PALETTE = ["--ink", "--ink", "--theta", "--ink", "--alpha", "--ink", "--ink", "--beta"];
const LABEL_W = 40;

function hexToRgb(value) {
  const hex = value.trim().replace("#", "");
  if (hex.length !== 6) return [26, 36, 51];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

export function initWaveform(canvas, {
  reduced,
  labels = true,
  palette = PALETTE,
  rowPx = 21,
  inkAlpha = 0.55,
  bandAlpha = 0.8,
  seed = 7,
} = {}) {
  if (!canvas || !canvas.getContext || canvas.dataset.waveReady) return;
  canvas.dataset.waveReady = "1";
  const ctx = canvas.getContext("2d");
  const r = rng(seed);
  const labelW = labels ? LABEL_W : 0;
  const channels = CHANNELS.map((name, i) => ({
    name,
    f1: 0.006 + r() * 0.006,
    f2: 0.02 + r() * 0.014,
    f3: 0.055 + r() * 0.04,
    s1: 0.5 + r() * 0.5,
    s2: 1.1 + r() * 0.8,
    s3: 2.2 + r() * 1.6,
    a1: 0.5 + r() * 0.3,
    a2: 0.25 + r() * 0.18,
    a3: 0.1 + r() * 0.1,
    phase: r() * Math.PI * 2,
    burst: r() * Math.PI * 2,
    color: palette[i % palette.length],
  }));

  let width = 0;
  let height = 0;
  let colors = {};
  let raf = 0;
  let visible = true;
  let lastTime = 0;

  function readColors() {
    const style = getComputedStyle(document.documentElement);
    colors = {};
    for (const name of new Set([...palette, "--ink", "--ink-2"])) colors[name] = hexToRgb(style.getPropertyValue(name));
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!raf) draw(lastTime);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    if (!width || !height) return;
    const count = Math.max(4, Math.min(CHANNELS.length, Math.round(height / rowPx)));
    const gap = height / count;
    const amp = gap * 0.95;
    const t = time / 1000;
    const [lr, lg, lb] = colors["--ink-2"];
    ctx.font = '500 11px "Archivo", "Helvetica Neue", Arial, sans-serif';
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1.1;
    ctx.lineJoin = "round";
    for (let c = 0; c < count; c++) {
      const ch = channels[c];
      const y0 = gap * (c + 0.5);
      if (labels) {
        ctx.fillStyle = `rgba(${lr},${lg},${lb},0.9)`;
        ctx.fillText(ch.name, 0, y0);
      }
      const [cr, cg, cb] = colors[ch.color];
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ch.color === "--ink" ? inkAlpha : bandAlpha})`;
      ctx.beginPath();
      for (let x = labelW; x <= width + 3; x += 3) {
        const env = 0.7 + 0.3 * Math.sin(x * 0.0035 + t * 0.35 + ch.burst);
        const y = y0 + amp * env * (
          ch.a1 * Math.sin(x * ch.f1 - t * ch.s1 + ch.phase) +
          ch.a2 * Math.sin(x * ch.f2 - t * ch.s2 + ch.phase * 2) +
          ch.a3 * Math.sin(x * ch.f3 - t * ch.s3)
        );
        if (x === labelW) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function frame(time) {
    lastTime = time;
    draw(time);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || raf || !visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  readColors();
  resize();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  document.addEventListener("themechange", () => {
    readColors();
    if (!raf) draw(lastTime);
  });
  if (document.fonts) document.fonts.ready.then(() => { if (!raf) draw(lastTime); });
  start();
}
