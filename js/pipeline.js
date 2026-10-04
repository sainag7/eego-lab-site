// A. Pinned pipeline centerpiece: raw EEG -> preprocess -> featurize -> validate -> explain.
// Every builder draws its SVG in the finished state; the timelines animate *from* earlier states,
// so reduced motion (or a failed CDN) still shows complete illustrations.
import {
  CHANNELS, FS, el, reset, synthBands, synthRaw, sumBands, std, pathD, power, rng,
  paintTopo, diverging, channelValues, TOPO_PATTERNS, drawHead,
} from "./lib/signal.js";

const W = 960;
const H = 540;
const X0 = 74;
const X1 = 944;
const TW = X1 - X0;
const TOP = 26;
const ROW = (H - 2 * TOP) / CHANNELS.length;
const N_VIEW = 435;
const DX = TW / N_VIEW;
const FRONTAL = new Set(["AF3", "F7", "F8", "AF4"]);
const BANDS = [
  { key: "theta", hz: "4 to 8 Hz" },
  { key: "alpha", hz: "8 to 13 Hz" },
  { key: "beta", hz: "13 to 30 Hz" },
];

const rowY = (k) => TOP + ROW * (k + 0.5);

function panelLetter(svg, letter) {
  el("text", { x: 6, y: 20, class: "s-panel-letter", text: letter }, svg);
}

// A one-second scale bar ending at xEnd, as on printed EEG traces.
function scaleBar(svg, xEnd, y, pxPerSecond) {
  const x0 = xEnd - pxPerSecond;
  el("path", { d: `M${x0} ${y - 5} V${y} H${xEnd} V${y - 5}`, class: "s-scale" }, svg);
  el("text", { x: x0 - 8, y: y + 1, class: "s-small", "text-anchor": "end", text: "1 s" }, svg);
}

// Synthetic data, generated once.
const DATA = (() => {
  const raw = [];
  const clean = [];
  const scale = [];
  CHANNELS.forEach((name, k) => {
    const bands = synthBands(101 + k * 17, 2 * N_VIEW);
    const c = sumBands(bands);
    raw.push(synthRaw(bands, k + 1, FS, { blinks: FRONTAL.has(name) }));
    clean.push(c);
    scale.push((ROW * 0.17) / std(c));
  });
  const af3 = synthBands(101, 12 * FS);
  return { raw, clean, scale, af3, af3View: synthBands(101, N_VIEW) };
})();

/* ---------- Step 1: raw EEG ---------- */

function buildRaw(svg) {
  reset(svg);
  const defs = el("defs", {}, svg);
  const clip = el("clipPath", { id: "ps1-clip" }, defs);
  el("rect", { x: X0, y: 0, width: TW, height: H }, clip);
  CHANNELS.forEach((name, k) => {
    el("line", { x1: X0, x2: X1, y1: rowY(k), y2: rowY(k), class: "s-grid" }, svg);
    el("text", { x: 12, y: rowY(k) + 5, class: "s-label", text: name }, svg);
  });
  const clipped = el("g", { "clip-path": "url(#ps1-clip)" }, svg);
  const scroller = el("g", {}, clipped);
  DATA.raw.forEach((raw, k) => {
    el("path", { d: pathD(raw, X0, DX, rowY(k), DATA.scale[k], 2), class: "tr tr-raw" }, scroller);
  });
  panelLetter(svg, "a");
  scaleBar(svg, X1, H - 6, FS * DX);
  return { scroller };
}

function animRaw({ scroller }, gsap) {
  return gsap.timeline().fromTo(scroller, { x: 0 }, { x: -TW, ease: "none", duration: 1 });
}

/* ---------- Step 2: preprocess ---------- */

const PANEL_Y = 104;

function buildPre(svg) {
  reset(svg);
  const defs = el("defs", {}, svg);
  const cc = el("clipPath", { id: "ps2-clean" }, defs);
  const ccRect = el("rect", { x: X0, y: 0, width: TW, height: H }, cc);
  const cr = el("clipPath", { id: "ps2-raw" }, defs);
  const crRect = el("rect", { x: X1, y: 0, width: 0, height: H }, cr);
  const grad = el("linearGradient", { id: "ps2-sweep", x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  el("stop", { offset: 0, class: "s-sweep-stop", "stop-opacity": 0 }, grad);
  el("stop", { offset: 0.75, class: "s-sweep-stop", "stop-opacity": 0.18 }, grad);
  el("stop", { offset: 1, class: "s-sweep-stop", "stop-opacity": 0.55 }, grad);

  const traces = el("g", { opacity: 0.16 }, svg);
  CHANNELS.forEach((name, k) => {
    el("text", { x: 12, y: rowY(k) + 5, class: k === 0 ? "s-label-strong" : "s-label", text: name }, traces);
    el("path", {
      d: pathD(DATA.raw[k], X0, DX, rowY(k), DATA.scale[k], 1, 0, N_VIEW),
      class: "tr tr-raw", "clip-path": "url(#ps2-raw)",
    }, traces);
    el("path", {
      d: pathD(DATA.clean[k], X0, DX, rowY(k), DATA.scale[k] * 1.15, 1, 0, N_VIEW),
      class: "tr tr-clean", "clip-path": "url(#ps2-clean)",
    }, traces);
  });

  const sweep = el("g", { opacity: 0 }, svg);
  el("rect", { x: 0, y: 4, width: 90, height: H - 8, fill: "url(#ps2-sweep)" }, sweep);
  el("rect", { x: 88, y: 4, width: 2, height: H - 8, class: "fill-accent" }, sweep);

  const panel = el("g", {}, svg);
  el("rect", { x: X0 - 14, y: PANEL_Y, width: TW + 28, height: 380, rx: 18, class: "s-panel-solid" }, panel);
  el("text", { x: X0 + 10, y: PANEL_Y + 40, class: "s-title", text: "AF3, split into frequency bands" }, panel);
  const rows = BANDS.map((band, i) => {
    const y = PANEL_Y + 125 + i * 100;
    const g = el("g", {}, panel);
    el("rect", { x: X0 + 10, y: y - 52, width: 10, height: 10, rx: 2, class: `fill-${band.key}` }, g);
    el("text", { x: X0 + 28, y: y - 42, class: "s-label-strong", text: `AF3_${band.key}` }, g);
    el("text", { x: X0 + 150, y: y - 42, class: "s-small", text: band.hz }, g);
    const samples = DATA.af3View[band.key];
    el("path", {
      d: pathD(samples, X0 + 10, (TW - 20) / N_VIEW, y, 20 / std(samples) * 0.9),
      class: `tr tr-${band.key}`, "stroke-width": 2,
    }, g);
    return g;
  });
  scaleBar(panel, X1 - 10, PANEL_Y + 366, FS * (TW - 20) / N_VIEW);
  panelLetter(svg, "b");

  return { ccRect, crRect, traces, sweep, panel, rows };
}

function animPre(r, gsap) {
  const state = { p: 0 };
  const apply = () => {
    const x = X0 + TW * state.p;
    r.ccRect.setAttribute("width", (TW * state.p).toFixed(1));
    r.crRect.setAttribute("x", x.toFixed(1));
    r.crRect.setAttribute("width", (TW * (1 - state.p)).toFixed(1));
    r.sweep.setAttribute("transform", `translate(${(x - 90).toFixed(1)} 0)`);
  };
  apply();
  gsap.set(r.traces, { opacity: 1 });
  const tl = gsap.timeline();
  tl.fromTo(r.sweep, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0);
  tl.fromTo(state, { p: 0 }, { p: 1, duration: 0.5, ease: "power1.inOut", onUpdate: apply }, 0);
  tl.to(r.sweep, { opacity: 0, duration: 0.05 }, 0.5);
  tl.fromTo(r.traces, { opacity: 1 }, { opacity: 0.16, duration: 0.14, immediateRender: false }, 0.55);
  tl.fromTo(r.panel,
    { opacity: 0, y: rowY(0) - PANEL_Y - 20, scaleY: 0.12, transformOrigin: "50% 0%" },
    { opacity: 1, y: 0, scaleY: 1, duration: 0.24, ease: "power3.out" }, 0.6);
  tl.fromTo(r.rows, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.14, stagger: 0.05, ease: "power3.out" }, 0.72);
  return tl;
}

/* ---------- Step 3: featurize ---------- */

const PPS = TW / 12;
const WIN_W = 4 * PPS;
const BAR_BASE = 318;
const TABLE_Y = 356;
const COL_X = [12, 112, 320, 528, 736];

function windowFeatures() {
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const start = 2 * i * FS;
    const end = start + 4 * FS;
    const p = BANDS.map((b) => power(DATA.af3[b.key], start, end));
    const total = p.reduce((a, b) => a + b, 0);
    const entropy = -p.reduce((acc, v) => acc + (v / total) * Math.log(v / total), 0) / Math.log(3);
    rows.push({ p, entropy });
  }
  const max = Math.max(...rows.flatMap((r) => r.p));
  return rows.map((r) => ({ p: r.p.map((v) => v / max), entropy: r.entropy }));
}

function buildFeat(svg) {
  reset(svg);
  const feats = windowFeatures();
  const n = 12 * FS;

  BANDS.forEach((band, i) => {
    const y = 66 + i * 44;
    el("text", { x: 12, y: y + 5, class: "s-label", text: band.key }, svg);
    el("path", {
      d: pathD(DATA.af3[band.key], X0, TW / n, y, 13 / std(DATA.af3[band.key]), 3),
      class: `tr tr-${band.key}`,
    }, svg);
  });
  for (let s = 0; s <= 12; s += 2) {
    const x = X0 + s * PPS;
    el("line", { x1: x, x2: x, y1: 182, y2: 188, class: "s-line" }, svg);
    el("text", { x, y: 204, class: "s-small", "text-anchor": s === 12 ? "end" : "middle", text: s === 0 ? "0 s" : `${s}` }, svg);
  }

  const ghosts = feats.map((_, i) => el("rect", {
    x: X0 + 2 * i * PPS, y: 36, width: WIN_W, height: 140, rx: 8, class: "s-ghost",
  }, svg));
  const drop = el("rect", { x: X0, y: 36, width: WIN_W, height: 140, rx: 8, class: "s-window", opacity: 0 }, svg);
  const win = el("rect", {
    x: X0, y: 36, width: WIN_W, height: 140, rx: 8, class: "s-window", transform: `translate(${8 * PPS} 0)`,
  }, svg);
  el("text", { x: X0, y: 232, class: "s-small", text: "Welch band power per window" }, svg);
  el("line", { x1: X0, x2: X1, y1: BAR_BASE, y2: BAR_BASE, class: "s-line" }, svg);

  const barGroups = feats.map((f, i) => {
    const cx = X0 + (2 * i + 2) * PPS;
    const g = el("g", {}, svg);
    const bars = f.p.map((v, b) => el("rect", {
      x: cx - 31 + b * 21, y: BAR_BASE - v * 72, width: 18, height: v * 72, rx: 3, class: `fill-${BANDS[b].key}`,
    }, g));
    el("text", { x: cx, y: BAR_BASE + 20, class: "s-small", "text-anchor": "middle", text: `w${i + 1}` }, svg);
    return bars;
  });

  const headers = ["window", "AF3_theta", "AF3_alpha", "AF3_beta", "AF3_entropy"];
  headers.forEach((h, c) => {
    const x = COL_X[c];
    if (c >= 1 && c <= 3) el("rect", { x, y: TABLE_Y + 9, width: 9, height: 9, rx: 2, class: `fill-${BANDS[c - 1].key}` }, svg);
    el("text", { x: c >= 1 && c <= 3 ? x + 15 : x, y: TABLE_Y + 18, class: "s-label-strong", text: h }, svg);
  });
  el("line", { x1: 12, x2: X1, y1: TABLE_Y + 30, y2: TABLE_Y + 30, class: "s-line" }, svg);

  const rows = feats.map((f, i) => {
    const y = TABLE_Y + 50 + i * 28;
    const g = el("g", {}, svg);
    el("text", { x: COL_X[0], y: y + 5, class: "s-label", text: `w${i + 1}` }, g);
    f.p.forEach((v, b) => {
      el("rect", { x: COL_X[b + 1], y: y - 5, width: 170, height: 10, rx: 5, class: "s-cell-bg" }, g);
      el("rect", { x: COL_X[b + 1], y: y - 5, width: Math.max(6, v * 170), height: 10, rx: 5, class: `fill-${BANDS[b].key}` }, g);
    });
    el("rect", { x: COL_X[4], y: y - 5, width: 170, height: 10, rx: 5, class: "s-cell-bg" }, g);
    el("rect", { x: COL_X[4], y: y - 5, width: Math.max(6, f.entropy * 170), height: 10, rx: 5, class: "fill-accent" }, g);
    if (i < 4) el("line", { x1: 12, x2: X1, y1: y + 14, y2: y + 14, class: "s-row-line" }, g);
    return g;
  });

  panelLetter(svg, "c");
  return { ghosts, drop, win, barGroups, rows };
}

function animFeat(r, gsap) {
  const tl = gsap.timeline();
  r.ghosts.forEach((ghost, i) => {
    const t = i * 0.2;
    if (i === 0) tl.fromTo(r.win, { x: 0, opacity: 0 }, { x: 0, opacity: 1, duration: 0.04 }, t);
    else tl.to(r.win, { x: 2 * i * PPS, duration: 0.06, ease: "power2.inOut" }, t);
    tl.fromTo(ghost, { opacity: 0 }, { opacity: 1, duration: 0.03 }, t + 0.05);
    tl.fromTo(r.drop,
      { x: 2 * i * PPS, y: 0, scaleY: 1, opacity: 0.6, transformOrigin: "50% 100%" },
      { y: 136, scaleY: 0.06, opacity: 0, duration: 0.07, ease: "power2.in", immediateRender: i === 0 }, t + 0.06);
    tl.fromTo(r.barGroups[i], { scaleY: 0, transformOrigin: "50% 100%" },
      { scaleY: 1, duration: 0.05, stagger: 0.012, ease: "power3.out" }, t + 0.11);
    tl.fromTo(r.rows[i], { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.05 }, t + 0.14);
  });
  return tl;
}

/* ---------- Step 4: train and validate ---------- */

const TX = [310, 420, 530, 640];

function buildModel(svg) {
  reset(svg);
  const defs = el("defs", {}, svg);
  const marker = el("marker", { id: "ps4-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
  el("path", { d: "M0 0 L10 5 L0 10 z", class: "fill-muted" }, marker);
  const markerLit = el("marker", { id: "ps4-arrow-lit", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
  el("path", { d: "M0 0 L10 5 L0 10 z", class: "fill-accent" }, markerLit);

  // Input sequence: window_rows = 4 feature rows.
  el("text", { x: 24, y: 132, class: "s-small", text: "window_rows = 4" }, svg);
  const cellClass = ["fill-theta", "fill-alpha", "fill-beta", "fill-accent"];
  const r = rng(44);
  const seqRows = [0, 1, 2, 3].map((row) => {
    const g = el("g", {}, svg);
    const y = 150 + row * 46;
    cellClass.forEach((cls, c) => {
      el("rect", { x: 24 + c * 40, y, width: 34, height: 32, rx: 6, class: cls, opacity: (0.45 + r() * 0.5).toFixed(2) }, g);
    });
    return g;
  });
  const seqArrow = el("path", { d: "M104 330 C104 410, 200 440, 286 440", class: "s-edge-lit", "marker-end": "url(#ps4-arrow-lit)" }, svg);

  // Layers, bottom to top: edges, base nodes, lit overlays, labels.
  const edges = el("g", {}, svg);
  const base = el("g", {}, svg);
  const lit = el("g", {}, svg);
  const labels = el("g", {}, svg);
  TX.forEach((x) => {
    el("path", { d: `M${x} 420 L${x} 371`, class: "s-edge" }, edges);
    el("path", { d: `M${x + 12} 424 C${x + 52} 400, ${x + 52} 300, ${x + 30} 281`, class: "s-edge" }, edges);
  });
  for (let t = 0; t < 3; t++) {
    el("path", { d: `M${TX[t] + 37} 350 L${TX[t + 1] - 39} 350`, class: "s-edge", "marker-end": "url(#ps4-arrow)" }, edges);
    el("path", { d: `M${TX[t + 1] - 37} 260 L${TX[t] + 39} 260`, class: "s-edge", "marker-end": "url(#ps4-arrow)" }, edges);
  }
  el("path", { d: "M640 331 C640 250, 560 200, 520 186", class: "s-edge" }, edges);
  el("path", { d: "M310 241 C310 210, 380 195, 430 186", class: "s-edge" }, edges);
  el("path", { d: "M440 145 L410 112", class: "s-edge" }, edges);
  el("path", { d: "M510 145 L540 112", class: "s-edge" }, edges);

  const node = (shape, attrs, text, textY) => {
    el(shape, { ...attrs, class: "s-node" }, base);
    const litShape = el(shape, { ...attrs, class: "s-node-lit" }, lit);
    el("text", { x: attrs.cx ?? attrs.x + attrs.width / 2, y: textY, class: "s-node-text", text }, labels);
    return litShape;
  };

  const inLit = TX.map((x, t) => node("circle", { cx: x, cy: 440, r: 19 }, `x${t + 1}`, 441));
  const fwdLit = TX.map((x) => node("rect", { x: x - 37, y: 331, width: 74, height: 38, rx: 10 }, "LSTM", 351));
  const bwdLit = TX.map((x) => node("rect", { x: x - 37, y: 241, width: 74, height: 38, rx: 10 }, "LSTM", 261));
  const denseLit = node("rect", { x: 385, y: 145, width: 180, height: 40, rx: 10 }, "dense", 166);
  node("rect", { x: 330, y: 72, width: 120, height: 40, rx: 20 }, "low", 93).setAttribute("opacity", 0);
  const outLit = node("rect", { x: 480, y: 72, width: 120, height: 40, rx: 20 }, "high", 93);

  const fwdEdges = [];
  const bwdEdges = [];
  for (let t = 0; t < 3; t++) {
    fwdEdges.push(el("path", { d: `M${TX[t] + 37} 350 L${TX[t + 1] - 39} 350`, class: "s-edge-lit", "marker-end": "url(#ps4-arrow-lit)" }, lit));
    bwdEdges.push(el("path", { d: `M${TX[t + 1] - 37} 260 L${TX[t] + 39} 260`, class: "s-edge-lit", "marker-end": "url(#ps4-arrow-lit)" }, lit));
  }

  el("text", { x: 264, y: 355, class: "s-small", "text-anchor": "end", text: "forward" }, svg);
  el("text", { x: 264, y: 265, class: "s-small", "text-anchor": "end", text: "backward" }, svg);
  el("text", { x: 465, y: 56, class: "s-small", "text-anchor": "middle", text: "softmax" }, svg);

  // Per-subject meters (illustrative).
  el("text", { x: 722, y: 112, class: "s-label-strong", text: "per-subject scores" }, svg);
  el("text", { x: 722, y: 134, class: "s-small", text: 'results["user_metrics"]' }, svg);
  const mr = rng(9);
  const meters = [1, 2, 3, 4, 5, 6].map((s, j) => {
    const y = 168 + j * 44;
    el("text", { x: 722, y: y + 10, class: "s-label", text: `S0${s}` }, svg);
    el("rect", { x: 772, y, width: 160, height: 12, rx: 6, class: "s-meter-track" }, svg);
    return el("rect", { x: 772, y, width: (0.5 + mr() * 0.42) * 160, height: 12, rx: 6, class: "s-meter" }, svg);
  });
  el("text", { x: 722, y: 452, class: "s-small", text: "illustrative" }, svg);

  panelLetter(svg, "d");
  return { seqRows, seqArrow, inLit, fwdLit, bwdLit, fwdEdges, bwdEdges, denseLit, outLit, meters };
}

function animModel(r, gsap) {
  const tl = gsap.timeline();
  tl.fromTo(r.seqRows, { opacity: 0, x: -30 }, { opacity: 1, x: 0, stagger: 0.04, duration: 0.12, ease: "power3.out" }, 0);
  tl.fromTo(r.seqArrow, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.16);
  tl.fromTo(r.inLit, { opacity: 0 }, { opacity: 1, stagger: 0.03, duration: 0.05 }, 0.2);
  const fwd = r.fwdLit.flatMap((n, t) => (r.fwdEdges[t] ? [n, r.fwdEdges[t]] : [n]));
  const bwd = [...r.bwdLit].reverse().flatMap((n, t) => (r.bwdEdges[2 - t] ? [n, r.bwdEdges[2 - t]] : [n]));
  tl.fromTo(fwd, { opacity: 0 }, { opacity: 1, stagger: 0.035, duration: 0.05 }, 0.34);
  tl.fromTo(bwd, { opacity: 0 }, { opacity: 1, stagger: 0.035, duration: 0.05 }, 0.34);
  tl.fromTo(r.denseLit, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.62);
  tl.fromTo(r.outLit, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.7);
  tl.fromTo(r.meters, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, stagger: 0.045, duration: 0.1, ease: "power3.out" }, 0.55);
  return tl;
}

/* ---------- Step 5: explain ---------- */

function buildExplain(svg) {
  reset(svg);
  const defs = el("defs", {}, svg);
  const clip = el("clipPath", { id: "ps5-head" }, defs);
  el("circle", { cx: 50, cy: 52, r: 40 }, clip);
  const grad = el("linearGradient", { id: "ps5-div", x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  ["#2f6bd8", "#8fb1ef", "#eef1f6", "#f0a08f", "#d6453a"].forEach((c, i) => el("stop", { offset: i / 4, "stop-color": c }, grad));

  el("text", { x: 40, y: 96, class: "s-small", text: "prediction" }, svg);
  const chipLo = el("g", { opacity: 0 }, svg);
  el("rect", { x: 40, y: 110, width: 250, height: 56, rx: 28, class: "s-chip-lo" }, chipLo);
  el("text", { x: 165, y: 145, class: "s-chip-lo-text", "text-anchor": "middle", text: "low valence" }, chipLo);
  const chipHi = el("g", {}, svg);
  el("rect", { x: 40, y: 110, width: 250, height: 56, rx: 28, class: "s-chip-hi" }, chipHi);
  el("text", { x: 165, y: 145, class: "s-chip-hi-text", "text-anchor": "middle", text: "high valence" }, chipHi);

  el("text", { x: 40, y: 226, class: "s-label", text: "p(high valence)" }, svg);
  el("rect", { x: 40, y: 242, width: 400, height: 16, rx: 8, class: "s-meter-track" }, svg);
  const fill = el("rect", { x: 40, y: 242, width: 344, height: 16, rx: 8, class: "s-meter" }, svg);
  el("line", { x1: 240, x2: 240, y1: 234, y2: 266, class: "s-target" }, svg);
  el("text", { x: 240, y: 288, class: "s-small", "text-anchor": "middle", text: "0.5" }, svg);
  el("line", { x1: 360, x2: 360, y1: 234, y2: 266, class: "s-target" }, svg);
  el("text", { x: 360, y: 288, class: "s-small", "text-anchor": "middle", text: "target 0.8" }, svg);

  el("text", { x: 40, y: 350, class: "s-label-strong", text: "largest changes" }, svg);
  const changes = ["O1 alpha ↑", "O2 alpha ↑", "F7 theta ↓"].map((t, i) =>
    el("text", { x: 40, y: 382 + i * 28, class: "s-label", text: t }, svg));
  el("text", { x: 40, y: 484, class: "s-small", text: "weights stay fixed; the input moves" }, svg);

  el("text", { x: 710, y: 44, class: "s-title", "text-anchor": "middle", text: "Alpha band, amplitude difference" }, svg);
  const head = el("svg", { x: 500, y: 58, width: 420, height: 420, viewBox: "0 0 100 100", overflow: "visible" }, svg);
  const canvas = document.createElement("canvas");
  paintTopo(canvas, channelValues(TOPO_PATTERNS.alpha), diverging, 160);
  const map = el("image", { href: canvas.toDataURL(), x: 0, y: 0, width: 100, height: 100, "clip-path": "url(#ps5-head)" }, head);
  const { dots } = drawHead(head, { labels: true, dotRadius: 1.4 });

  el("rect", { x: 600, y: 500, width: 220, height: 10, rx: 5, fill: "url(#ps5-div)" }, svg);
  el("text", { x: 590, y: 510, class: "s-small", "text-anchor": "end", text: "decrease" }, svg);
  el("text", { x: 830, y: 510, class: "s-small", text: "increase" }, svg);

  panelLetter(svg, "e");
  return { chipLo, chipHi, fill, map, dots, changes };
}

function animExplain(r, gsap) {
  const tl = gsap.timeline();
  tl.fromTo(r.fill, { attr: { width: 72 } }, { attr: { width: 344 }, duration: 0.5, ease: "none" }, 0);
  tl.fromTo(r.chipLo, { opacity: 1 }, { opacity: 0, duration: 0.05 }, 0.23);
  tl.fromTo(r.chipHi, { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.08, ease: "power3.out" }, 0.24);
  tl.fromTo(r.map, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
  tl.fromTo(r.dots, { opacity: 0 }, { opacity: 1, stagger: 0.01, duration: 0.05 }, 0.34);
  tl.fromTo(r.changes, { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.08 }, 0.6);
  tl.to({}, { duration: 0.15 }, 0.85);
  return tl;
}

/* ---------- Wiring ---------- */

const BUILDERS = [buildRaw, buildPre, buildFeat, buildModel, buildExplain];
const ANIMATORS = [animRaw, animPre, animFeat, animModel, animExplain];

export function initPipeline({ gsap, ScrollTrigger, reduced, scrollToY }) {
  const pipe = document.getElementById("pipe");
  if (!pipe) return;
  const figs = [...pipe.querySelectorAll(".pipe-step")];
  const svgs = ["ps1", "ps2", "ps3", "ps4", "ps5"].map((id) => document.getElementById(id));
  const buildAll = () => BUILDERS.map((build, i) => build(svgs[i]));

  if (reduced || !gsap || !ScrollTrigger) {
    buildAll();
    return;
  }

  const mm = gsap.matchMedia();

  mm.add("(min-width: 900px) and (min-height: 600px)", () => {
    pipe.classList.add("is-pinned");
    const refs = buildAll();
    const inner = refs.map((r, i) => ANIMATORS[i](r, gsap).duration(1));
    const buttons = [...pipe.querySelectorAll(".pipe-rail button")];
    const fill = pipe.querySelector(".pipe-rail-fill");
    const starts = [];

    const master = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: pipe,
        start: "top top",
        end: () => "+=" + Math.round(window.innerHeight * 5),
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
      onUpdate: updateRail,
    });

    figs.forEach((fig, i) => {
      if (i === 0) {
        starts.push(0);
        master.add(inner[0], 0.05);
      } else {
        const at = master.duration();
        starts.push(at);
        master.to(figs[i - 1], { opacity: 0, y: -24, duration: 0.18, ease: "power2.in" }, at);
        master.fromTo(fig, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.22, ease: "power3.out" }, at + 0.1);
        master.add(inner[i], at + 0.2);
      }
      master.addLabel(`step${i}`);
      master.to({}, { duration: 0.35 });
    });

    function updateRail() {
      const t = master.time();
      let active = 0;
      starts.forEach((s, i) => { if (t >= s + 0.1) active = i; });
      buttons.forEach((b, i) => {
        b.classList.toggle("is-active", i === active);
        b.classList.toggle("is-done", i < active);
        if (i === active) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
      fill.style.transform = `scaleY(${master.progress().toFixed(4)})`;
    }
    updateRail();

    const onClick = (event) => {
      const i = Number(event.currentTarget.dataset.step);
      scrollToY(master.scrollTrigger.labelToScroll(`step${i}`) + 2);
    };
    buttons.forEach((b) => b.addEventListener("click", onClick));

    return () => {
      buttons.forEach((b) => b.removeEventListener("click", onClick));
      pipe.classList.remove("is-pinned");
    };
  });

  mm.add("(max-width: 899px), (max-height: 599px)", () => {
    const refs = buildAll();
    refs.forEach((r, i) => {
      ScrollTrigger.create({
        trigger: figs[i].querySelector(".pipe-art"),
        start: "top 85%",
        end: "bottom 45%",
        scrub: 0.5,
        animation: ANIMATORS[i](r, gsap),
      });
    });
  });
  return () => {
    mm.revert();
    pipe.classList.remove("is-pinned");
  };
}
