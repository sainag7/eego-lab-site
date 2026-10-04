// B. Trial-safe windowing: windows slide inside each trial and refuse to straddle a boundary.
import { el, reset, synthBands, sumBands, std, pathD, FS } from "./lib/signal.js";

const X0 = 40;
const X1 = 920;
const TOTAL = 26;               // seconds on the timeline
const PPS = (X1 - X0) / TOTAL;
const WIN = 4;                  // seconds per window
const TRIALS = [[0, 9], [9, 16], [16, 26]];
// Window starts in order; `reject` marks a start whose window would cross a boundary.
const SEQUENCE = [
  { s: 0 }, { s: 2 }, { s: 4 }, { s: 6, reject: 9 },
  { s: 9 }, { s: 11 }, { s: 13, reject: 16 },
  { s: 16 }, { s: 18 }, { s: 20 }, { s: 22 },
];
const x = (sec) => X0 + sec * PPS;

function build(svg) {
  reset(svg);
  const bands = synthBands(77, TOTAL * 32, 32);
  const signal = sumBands(bands);
  TRIALS.forEach(([a, b], i) => {
    el("rect", { x: x(a) + 2, y: 40, width: (b - a) * PPS - 4, height: 120, rx: 10, class: "s-panel" }, svg);
    el("text", { x: x(a) + 12, y: 30, class: "s-label-strong", text: `trial ${i + 1}` }, svg);
    el("path", {
      d: pathD(signal, x(a) + 8, PPS / 32, 100, 18 / std(signal), 1, a * 32, b * 32 - 8),
      class: "tr tr-dim", "stroke-width": 1.6,
    }, svg);
  });
  el("line", { x1: X0, x2: X1, y1: 182, y2: 182, class: "s-line" }, svg);
  for (let s = 0; s <= TOTAL; s += 1) {
    el("line", { x1: x(s), x2: x(s), y1: 182, y2: s % 2 ? 185 : 188, class: "s-line" }, svg);
  }
  el("text", { x: x(0), y: 208, class: "s-small", text: "0 s" }, svg);
  el("text", { x: x(TOTAL), y: 208, class: "s-small", "text-anchor": "end", text: `${TOTAL} s` }, svg);

  const ghosts = [];
  const rejects = [];
  SEQUENCE.forEach((step) => {
    if (step.reject) {
      rejects.push(el("rect", { x: x(step.s), y: 50, width: WIN * PPS, height: 100, rx: 8, class: "s-reject", opacity: 0 }, svg));
    } else {
      ghosts.push(el("rect", { x: x(step.s), y: 50, width: WIN * PPS, height: 100, rx: 8, class: "s-ghost" }, svg));
    }
  });

  const boundaries = [9, 16].map((s) => {
    const g = el("g", {}, svg);
    el("line", { x1: x(s), x2: x(s), y1: 36, y2: 168, class: "s-boundary" }, g);
    const flash = el("line", { x1: x(s), x2: x(s), y1: 36, y2: 168, class: "s-flash", opacity: 0 }, g);
    const mark = el("text", { x: x(s), y: 208, class: "s-reject-text", "text-anchor": "middle", text: "✕ crosses boundary" }, g);
    return { flash, mark };
  });

  const last = SEQUENCE[SEQUENCE.length - 1].s;
  const win = el("rect", { x: X0, y: 50, width: WIN * PPS, height: 100, rx: 8, class: "s-window", transform: `translate(${last * PPS} 0)` }, svg);
  return { ghosts, rejects, boundaries, win };
}

function animate(r, gsap) {
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
  let g = 0;
  let k = 0;
  SEQUENCE.forEach((step, i) => {
    const t = i * 0.3;
    if (i === 0) tl.fromTo(r.win, { x: 0, opacity: 0 }, { x: 0, opacity: 1, duration: 0.1 }, 0);
    else tl.to(r.win, { x: step.s * PPS, duration: 0.18 }, t);
    if (!step.reject) {
      tl.fromTo(r.ghosts[g++], { opacity: 0 }, { opacity: 1, duration: 0.08 }, t + 0.16);
      return;
    }
    const reject = r.rejects[k];
    const boundary = r.boundaries[k++];
    // The window turns into a rejected outline, the boundary flashes, then the window jumps on.
    tl.to(r.win, { opacity: 0, duration: 0.06 }, t + 0.14);
    tl.fromTo(reject, { opacity: 0 }, { opacity: 1, duration: 0.06 }, t + 0.14);
    tl.fromTo(boundary.flash, { opacity: 0 }, { opacity: 1, duration: 0.05, yoyo: true, repeat: 3 }, t + 0.16);
    tl.fromTo(boundary.mark, { opacity: 0 }, { opacity: 1, duration: 0.08 }, t + 0.18);
    tl.to(reject, { opacity: 0, duration: 0.08 }, t + 0.34);
    tl.to(r.win, { opacity: 1, duration: 0.04 }, t + 0.34);
  });
  return tl;
}

export function initWindowing({ gsap, ScrollTrigger, reduced }) {
  const svg = document.getElementById("win-svg");
  if (!svg) return;
  if (reduced || !gsap) {
    build(svg);
    return;
  }
  const mm = gsap.matchMedia();
  mm.add("all", () => {
    const refs = build(svg);
    ScrollTrigger.create({
      trigger: svg,
      start: "top 80%",
      end: "bottom 35%",
      scrub: 0.5,
      animation: animate(refs, gsap),
    });
  });
  return () => mm.revert();
}
