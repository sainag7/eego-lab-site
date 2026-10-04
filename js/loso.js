// C. Leave-one-subject-out grid: each fold holds out one of 23 subjects; scores and an aggregate build up.
import { rng } from "./lib/signal.js";

const SUBJECTS = 23;

function build(grid, scores) {
  grid.textContent = "";
  scores.textContent = "";
  const r = rng(23);
  const tests = [];
  const bars = [];
  for (let i = 1; i <= SUBJECTS; i++) {
    const id = `S${String(i).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.className = "subj";
    cell.textContent = id;
    const test = document.createElement("span");
    test.className = "subj-test";
    test.innerHTML = `${id}<small>test</small>`;
    cell.appendChild(test);
    grid.appendChild(cell);
    tests.push(test);

    const bar = document.createElement("span");
    bar.style.setProperty("--h", `${Math.round(42 + r() * 52)}%`);
    scores.appendChild(bar);
    bars.push(bar);
  }
  return { tests, bars };
}

export function initLoso({ gsap, ScrollTrigger, reduced }) {
  const loso = document.getElementById("loso");
  if (!loso) return;
  const grid = document.getElementById("loso-grid");
  const scores = document.getElementById("loso-scores");
  const counter = document.getElementById("loso-fold");
  const agg = loso.querySelector(".loso-agg-fill");

  if (reduced || !gsap) {
    build(grid, scores);
    return;
  }

  const animate = (refs) => {
    gsap.set(refs.tests, { opacity: 0 });
    gsap.set(refs.tests[0], { opacity: 1 });
    gsap.set(refs.bars, { scaleY: 0 });
    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onUpdate: () => {
        const fold = Math.min(SUBJECTS, Math.max(1, Math.floor(tl.time()) + 1));
        if (counter.textContent !== String(fold)) counter.textContent = String(fold);
      },
    });
    refs.tests.forEach((test, k) => {
      if (k > 0) {
        tl.fromTo(refs.tests[k - 1], { opacity: 1 }, { opacity: 0, duration: 0.25, immediateRender: false }, k);
        tl.fromTo(test, { opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false }, k);
      }
      tl.fromTo(refs.bars[k], { scaleY: 0 }, { scaleY: 1, duration: 0.6, immediateRender: false }, k + 0.25);
    });
    tl.fromTo(agg, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "power3.out" }, SUBJECTS);
    counter.textContent = "1";
    return tl;
  };

  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px) and (min-height: 700px)", () => {
    const refs = build(grid, scores);
    ScrollTrigger.create({
      trigger: loso,
      start: "center center",
      end: () => "+=" + Math.round(window.innerHeight * 2.3),
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      animation: animate(refs),
    });
    return () => { counter.textContent = String(SUBJECTS); };
  });
  mm.add("(max-width: 899px), (max-height: 699px)", () => {
    const refs = build(grid, scores);
    ScrollTrigger.create({
      trigger: loso,
      start: "top 75%",
      end: "bottom 30%",
      scrub: 0.5,
      animation: animate(refs),
    });
    return () => { counter.textContent = String(SUBJECTS); };
  });
  return () => mm.revert();
}
