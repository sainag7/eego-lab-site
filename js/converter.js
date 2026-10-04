// E. Dataset converter: five sources funnel into eegproc-to-csv, then CSV rows fill in.
import { el, reset, rng } from "./lib/signal.js";

const ROWS = [
  ["baseline", 1], ["baseline", 2], ["baseline", 3],
  ["stimulus", 1], ["stimulus", 2], ["stimulus", 3], ["stimulus", 4], ["stimulus", 5],
];

function buildTable(body) {
  const r = rng(5);
  body.textContent = "";
  const value = () => (r() * 12 - 6).toFixed(1);
  return ROWS.map(([segment, idx]) => {
    const tr = document.createElement("tr");
    const cells = [
      ["1"], ["1"], [segment, segment === "baseline" ? "seg-base" : "seg-stim"], [String(idx)],
      [value()], [value(), "hide-sm"], [value(), "hide-sm"], ["…", "dots"], [value(), "hide-sm"], ["4"], ["2"],
    ];
    cells.forEach(([text, cls]) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (cls) td.className = cls;
      tr.appendChild(td);
    });
    body.appendChild(tr);
    return tr;
  });
}

function buildFunnel(svg) {
  reset(svg);
  const ins = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => el("path", {
    d: `M0 ${f * 400} C 50 ${f * 400}, 40 200, 78 200`, class: "lit", pathLength: 1,
  }, svg));
  const out = el("path", { d: "M122 200 L200 200", class: "lit", pathLength: 1 }, svg);
  return { ins, out };
}

export function initConverter({ gsap, reduced }) {
  const conv = document.getElementById("conv");
  if (!conv) return;
  const rows = buildTable(document.getElementById("csv-body"));
  const { ins, out } = buildFunnel(conv.querySelector(".conv-funnel"));
  if (reduced || !gsap) return;

  const tiles = conv.querySelectorAll(".tile");
  const node = conv.querySelector(".conv-node");
  const lines = [...ins, out];
  gsap.set(lines, { strokeDasharray: 1 });

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: { trigger: conv, start: "top 78%", end: "center 42%", scrub: 0.5 },
  });
  tl.fromTo(tiles, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.12 }, 0);
  tl.fromTo(ins, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, stagger: 0.1, ease: "none" }, 0.35);
  tl.fromTo(node, { scale: 0.88 }, { scale: 1, duration: 0.4 }, 0.8);
  tl.fromTo(out, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 1.1);
  tl.fromTo(rows, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.12 }, 1.3);
}
