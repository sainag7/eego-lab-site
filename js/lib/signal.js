// Shared helpers: deterministic synthetic EEG, SVG building, scalp geometry and color ramps.
// Every signal on the site is synthetic and seeded, so the drawings are identical on each visit.

export const CHANNELS = ["AF3", "F7", "F3", "FC5", "T7", "P7", "O1", "O2", "P8", "T8", "FC6", "F4", "F8", "AF4"];

// Approximate 2D scalp positions for the 14-channel layout: x to the right, y toward the nose,
// in units of the head radius.
export const POSITIONS = {
  AF3: [-0.25, 0.78], F7: [-0.66, 0.52], F3: [-0.34, 0.5], FC5: [-0.6, 0.24],
  T7: [-0.86, 0.0], P7: [-0.68, -0.5], O1: [-0.26, -0.84], O2: [0.26, -0.84],
  P8: [0.68, -0.5], T8: [0.86, 0.0], FC6: [0.6, 0.24], F4: [0.34, 0.5],
  F8: [0.66, 0.52], AF4: [0.25, 0.78],
};

export const FS = 128;
const SVG_NS = "http://www.w3.org/2000/svg";

/** Create an SVG element with attributes; `text` sets textContent. */
export function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  if (parent) parent.appendChild(node);
  return node;
}

/** Clear an SVG and return it, so builders can run again after a breakpoint change. */
export function reset(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  return svg;
}

/** mulberry32: a small seeded PRNG. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Theta, alpha and beta components of one synthetic channel. */
export function synthBands(seed, n, fs = FS) {
  const r = rng(seed);
  const component = (lo, hi, count, amp) => {
    const out = new Float32Array(n);
    for (let j = 0; j < count; j++) {
      const f = lo + r() * (hi - lo);
      const phase = r() * Math.PI * 2;
      const a = amp * (0.6 + 0.8 * r());
      const envF = 0.12 + r() * 0.25;
      const envPhase = r() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const t = i / fs;
        out[i] += a * (0.6 + 0.4 * Math.sin(2 * Math.PI * envF * t + envPhase)) * Math.sin(2 * Math.PI * f * t + phase);
      }
    }
    return out;
  };
  return { theta: component(4, 8, 2, 0.9), alpha: component(8, 13, 2, 1.15), beta: component(13, 30, 3, 0.42) };
}

export function sumBands(bands) {
  const n = bands.theta.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = bands.theta[i] + bands.alpha[i] + bands.beta[i];
  return out;
}

/** Clean bands plus drift, broadband noise, line noise and (optionally) eye blinks. */
export function synthRaw(bands, seed, fs = FS, { blinks = false } = {}) {
  const r = rng(seed * 7919 + 13);
  const clean = sumBands(bands);
  const n = clean.length;
  const out = new Float32Array(n);
  const driftF = 0.05 + r() * 0.08;
  const driftPhase = r() * Math.PI * 2;
  const driftA = 1.4 + r() * 1.4;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    out[i] = clean[i]
      + driftA * Math.sin(2 * Math.PI * driftF * t + driftPhase)
      + 0.32 * gauss(r)
      + 0.3 * Math.sin(2 * Math.PI * 60 * t);
  }
  if (blinks) {
    const width = fs * 0.16;
    for (let b = 0; b < 4; b++) {
      const centre = Math.floor((0.08 + 0.24 * b + r() * 0.08) * n);
      for (let i = Math.max(0, centre - 4 * width); i < Math.min(n, centre + 4 * width); i++) {
        out[i] += 3.4 * Math.exp(-((i - centre) ** 2) / (2 * width * width));
      }
    }
  }
  return out;
}

export function std(samples) {
  let mean = 0;
  for (const v of samples) mean += v;
  mean /= samples.length;
  let acc = 0;
  for (const v of samples) acc += (v - mean) ** 2;
  return Math.sqrt(acc / samples.length) || 1;
}

/** Polyline path through samples; `step` skips samples to keep paths light. */
export function pathD(samples, x0, dx, y0, scale, step = 1, start = 0, end = samples.length) {
  let d = "";
  for (let i = start; i < end; i += step) {
    const x = x0 + (i - start) * dx;
    const y = y0 - samples[i] * scale;
    d += (d ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
}

/** Mean power of a slice. */
export function power(samples, start, end) {
  let acc = 0;
  for (let i = start; i < end; i++) acc += samples[i] * samples[i];
  return acc / Math.max(1, end - start);
}

/** Inverse-distance weighting between electrode values. */
export function idw(x, y, points, values, p = 2) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < points.length; i++) {
    const dx = x - points[i][0];
    const dy = y - points[i][1];
    const d2 = dx * dx + dy * dy;
    if (d2 < 1e-6) return values[i];
    const w = p === 2 ? 1 / d2 : 1 / Math.pow(d2, p / 2);
    num += w * values[i];
    den += w;
  }
  return num / den;
}

const DIVERGING = [[47, 107, 216], [143, 177, 239], [238, 241, 246], [240, 160, 143], [214, 69, 58]];
const SEQUENTIAL = [[29, 43, 85], [42, 111, 158], [47, 179, 154], [155, 212, 106], [242, 227, 91]];

function ramp(stops, t) {
  const c = Math.min(1, Math.max(0, t));
  const s = c * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * f);
}

/** v in [-1, 1]: blue for decrease, near-white for no change, red for increase. */
export const diverging = (v) => ramp(DIVERGING, (v + 1) / 2);
/** v in [0, 1]. */
export const sequential = (v) => ramp(SEQUENTIAL, v);

// Illustrative per-channel patterns for the counterfactual maps (not results).
export const TOPO_PATTERNS = {
  theta: ([x, y]) => -0.9 * Math.max(0, y - 0.1) - 0.15 * Math.max(0, -x) * Math.max(0, y),
  alpha: ([, y]) => 0.95 * Math.max(0, -y - 0.05) + 0.05 * y,
  beta: ([x, y]) => 0.7 * x * (1 - Math.abs(y)),
};

export function channelValues(pattern) {
  const raw = CHANNELS.map((c) => pattern(POSITIONS[c]));
  const max = Math.max(...raw.map(Math.abs)) || 1;
  return raw.map((v) => v / max);
}

/**
 * Paint a scalp map into a canvas. The head is a circle centred at (50%, 52%) with radius 40%,
 * matching drawHead() in a 0 0 100 100 viewBox.
 */
export function paintTopo(canvas, values, colorFn, size = 180) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  const points = CHANNELS.map((c) => POSITIONS[c]);
  const R = size * 0.4;
  const cx = size / 2;
  const cy = size * 0.52;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const ux = (px + 0.5 - cx) / R;
      const uy = (cy - py - 0.5) / R;
      const d2 = ux * ux + uy * uy;
      if (d2 > 1) continue;
      const [r, g, b] = colorFn(idw(ux, uy, points, values));
      const k = (py * size + px) * 4;
      image.data[k] = r;
      image.data[k + 1] = g;
      image.data[k + 2] = b;
      // Soften the rim so the map sits inside the outline.
      image.data[k + 3] = d2 > 0.96 ? Math.round(255 * (1 - (d2 - 0.96) / 0.04)) : 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Head outline, nose, ears and electrode dots in a 0 0 100 100 coordinate space. */
export function drawHead(svg, { labels = false, dotRadius = 1.7, parent = svg } = {}) {
  const g = el("g", {}, parent);
  el("path", { d: "M44.5 12.6 L50 6 L55.5 12.6", class: "s-head" }, g);
  el("path", { d: "M10.3 46 Q6.5 52 10.3 58", class: "s-head" }, g);
  el("path", { d: "M89.7 46 Q93.5 52 89.7 58", class: "s-head" }, g);
  el("circle", { cx: 50, cy: 52, r: 40, class: "s-head" }, g);
  const dots = [];
  for (const name of CHANNELS) {
    const [x, y] = POSITIONS[name];
    const cx = 50 + x * 40;
    const cy = 52 - y * 40;
    dots.push(el("circle", { cx, cy, r: dotRadius, class: "s-electrode" }, g));
    if (labels) {
      el("text", { x: cx, y: cy - dotRadius - 1.6, class: "s-electrode-label", "text-anchor": "middle", text: name }, g);
    }
  }
  return { group: g, dots };
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
