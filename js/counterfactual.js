// D. Counterfactual optimization: a point takes gradient steps across a decision boundary,
// electrode-band changes grow, then six scalp topographies fade in.
import {
  el, reset, paintTopo, diverging, sequential, channelValues, TOPO_PATTERNS, drawHead,
} from "./lib/signal.js";

const BOUNDARY = "M150 290 C230 220 300 150 470 20";
const START = [112, 132];
const END = [420, 150];
const STEPS = 14;
const CHANGES = [
  { label: "O1 alpha", band: "alpha", v: 0.85 },
  { label: "O2 alpha", band: "alpha", v: 0.78 },
  { label: "F7 theta", band: "theta", v: -0.6 },
  { label: "T8 beta", band: "beta", v: 0.5 },
  { label: "T7 beta", band: "beta", v: -0.44 },
];

// Gradient steps: large at first, then smaller, with a slight curve.
function stepPoints() {
  const pts = [];
  for (let k = 0; k <= STEPS; k++) {
    const u = 1 - Math.pow(1 - k / STEPS, 1.8);
    const x = START[0] + (END[0] - START[0]) * u;
    const y = START[1] + (END[1] - START[1]) * u - Math.sin(u * Math.PI) * 46;
    pts.push([x, y]);
  }
  return pts;
}

// Which side of the (roughly straight) boundary a point is on; > 0 means the high-valence side.
const side = ([x, y]) => (470 - 150) * (y - 290) - (20 - 290) * (x - 150);

function buildPlot(svg) {
  reset(svg);
  const defs = el("defs", {}, svg);
  const clip = el("clipPath", { id: "cf-clip" }, defs);
  el("rect", { x: 40, y: 20, width: 460, height: 270, rx: 10 }, clip);
  const area = el("g", { "clip-path": "url(#cf-clip)" }, svg);
  el("path", { d: "M40 20 L470 20 C300 150 230 220 150 290 L40 290 Z", class: "cf-region-lo" }, area);
  el("path", { d: "M470 20 L500 20 L500 290 L150 290 C230 220 300 150 470 20 Z", class: "cf-region-hi" }, area);
  el("path", { d: "M100 290 C180 220 250 150 420 20", class: "cf-contour" }, area);
  el("path", { d: "M200 290 C280 220 350 150 520 20", class: "cf-contour" }, area);
  el("path", { d: BOUNDARY, class: "cf-boundary" }, area);
  el("rect", { x: 40, y: 20, width: 460, height: 270, rx: 10, fill: "none", class: "s-line" }, svg);
  el("text", { x: 54, y: 276, class: "cf-region-label-lo", text: "low valence" }, svg);
  el("text", { x: 486, y: 276, class: "cf-region-label-hi", "text-anchor": "end", text: "high valence" }, svg);
  el("text", { x: 270, y: 312, class: "s-small", "text-anchor": "middle", text: "input space, projected to 2D (illustrative)" }, svg);
  el("text", { x: 452, y: 44, class: "s-small", "text-anchor": "end", text: "decision boundary" }, svg);

  const pts = stepPoints();
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const path = el("path", { d, class: "cf-path", pathLength: 1 }, svg);
  const steps = pts.slice(1, -1).map(([x, y]) => el("circle", { cx: x, cy: y, r: 3.2, class: "cf-step" }, svg));
  el("circle", { cx: START[0], cy: START[1], r: 7, class: "cf-start" }, svg);
  el("text", { x: START[0], y: START[1] + 26, class: "s-small", "text-anchor": "middle", text: "original input" }, svg);
  const endLabel = el("text", { x: END[0], y: END[1] + 28, class: "s-label-strong", "text-anchor": "middle", text: "counterfactual" }, svg);
  const point = el("circle", { cx: END[0], cy: END[1], r: 8, class: "cf-point" }, svg);
  const cross = (pts.findIndex((p) => side(p) > 0) - 0.5) / STEPS;
  return { pts, path, steps, point, endLabel, cross };
}

function buildBars(list) {
  list.textContent = "";
  return CHANGES.map((c) => {
    const li = document.createElement("li");
    const up = c.v > 0;
    li.innerHTML = `<span class="lbl">${c.label}</span><span class="cf-track"><span class="cf-bar ${up ? "up" : "down"} b-${c.band}" style="width:${(Math.abs(c.v) * 50).toFixed(1)}%"></span></span><span class="dir">${up ? "↑ increase" : "↓ decrease"}</span>`;
    list.appendChild(li);
    return li.querySelector(".cf-bar");
  });
}

function buildTopos(grid) {
  grid.querySelectorAll(".topo, .topo-row").forEach((n) => n.remove());
  const tiles = [];
  const rows = [
    { label: "Amplitude difference", kind: "amp" },
    { label: "RMS difference", kind: "rms" },
  ];
  rows.forEach((row) => {
    const label = document.createElement("span");
    label.className = "topo-row";
    label.textContent = row.label;
    grid.appendChild(label);
    ["theta", "alpha", "beta"].forEach((band) => {
      const tile = document.createElement("div");
      tile.className = "topo";
      const canvas = document.createElement("canvas");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("aria-hidden", "true");
      drawHead(svg, { dotRadius: 1.9 });
      tile.append(canvas, svg);
      grid.appendChild(tile);
      tiles.push({ tile, canvas, band, kind: row.kind });
    });
  });
  return tiles;
}

function paintTopos(tiles) {
  tiles.forEach(({ canvas, band, kind }) => {
    const amp = channelValues(TOPO_PATTERNS[band]);
    if (kind === "amp") paintTopo(canvas, amp, diverging, 180);
    else paintTopo(canvas, amp.map((v) => Math.min(1, 0.12 + Math.abs(v) * 0.88)), sequential, 180);
  });
}

function placePoint(r, p) {
  const f = Math.min(STEPS, Math.max(0, p * STEPS));
  const i = Math.min(STEPS - 1, Math.floor(f));
  const t = f - i;
  const [x0, y0] = r.pts[i];
  const [x1, y1] = r.pts[i + 1];
  r.point.setAttribute("cx", (x0 + (x1 - x0) * t).toFixed(1));
  r.point.setAttribute("cy", (y0 + (y1 - y0) * t).toFixed(1));
}

export function initCounterfactual({ gsap, ScrollTrigger, reduced }) {
  const cf = document.getElementById("cf");
  if (!cf) return;
  const svg = document.getElementById("cf-svg");
  const list = document.getElementById("cf-bars");
  const grid = document.getElementById("topo-grid");
  const chipLo = cf.querySelector(".pred-lo");
  const chipHi = cf.querySelector(".pred-hi");

  let tiles = buildTopos(grid);
  // Paint the canvases only when the section approaches the viewport.
  let painted = false;
  new IntersectionObserver((entries, observer) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    painted = true;
    paintTopos(tiles);
    observer.disconnect();
  }, { rootMargin: "600px 0px" }).observe(cf);

  if (reduced || !gsap) {
    buildPlot(svg);
    buildBars(list);
    return;
  }

  const animate = () => {
    const r = buildPlot(svg);
    const bars = buildBars(list);
    tiles = buildTopos(grid);
    if (painted) paintTopos(tiles);
    const state = { p: 0 };
    const apply = () => placePoint(r, state.p);
    apply();
    const tl = gsap.timeline({ defaults: { ease: "none" } });
    tl.fromTo(r.path, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1 }, 0);
    tl.fromTo(state, { p: 0 }, { p: 1, duration: 1, onUpdate: apply }, 0);
    r.steps.forEach((step, i) => {
      tl.fromTo(step, { opacity: 0 }, { opacity: 1, duration: 0.04 }, (i + 1) / STEPS);
    });
    tl.fromTo(r.endLabel, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.95);
    tl.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power1.out" }, 0);
    tl.fromTo(chipLo, { opacity: 1 }, { opacity: 0, duration: 0.06 }, r.cross);
    tl.fromTo(chipHi, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.1, ease: "power3.out" }, r.cross + 0.02);
    tl.fromTo(tiles.map((t) => t.tile), { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.08, ease: "power3.out" }, 1.05);
    tl.to({}, { duration: 0.25 });
    return tl;
  };

  const mm = gsap.matchMedia();
  mm.add("(min-width: 1000px) and (min-height: 760px)", () => {
    ScrollTrigger.create({
      trigger: cf,
      start: "top 72px",
      end: () => "+=" + Math.round(window.innerHeight * 2),
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      animation: animate(),
    });
  });
  mm.add("(max-width: 999px), (max-height: 759px)", () => {
    ScrollTrigger.create({
      trigger: cf,
      start: "top 70%",
      end: "bottom 55%",
      scrub: 0.5,
      animation: animate(),
    });
  });
  return () => mm.revert();
}
