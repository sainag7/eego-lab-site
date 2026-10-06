// EEGProc: the pinned pipeline and the other scroll-driven figures, plus entrances for the text.
import { initWaveform } from "../waveform.js";
import { initPipeline } from "../pipeline.js";
import { initInteractive } from "../interactive.js";
import { initConverter } from "../converter.js";
import { initWindowing } from "../windowing.js";
import { initLoso } from "../loso.js";
import { initCounterfactual } from "../counterfactual.js";
import { initChanges } from "../changes.js";
import { initToc } from "../toc.js";
import { intro } from "../lib/motion.js";

// Text blocks that rise in as they enter (the figures animate themselves).
const REVEAL = [
  ".section h2", ".prose > p", ".prose > h3", ".prose > .note", ".prose > .pillar",
  ".prose > .code", ".fig", ".tl-item", ".jump", ".hero-wave",
].join(", ");

let highlighted = false;

export function initEEGProc({ gsap, ScrollTrigger, reduced, page, scrollToY }) {
  if (!highlighted && window.Prism) {
    window.Prism.highlightAllUnder(page);
    highlighted = true;
  }
  initWaveform(page.querySelector(".hero-wave"), { reduced });
  const ctx = { gsap, ScrollTrigger, reduced, scrollToY };
  initInteractive(ctx);

  const cleanups = [initToc(page)];
  const run = () => {
    for (const init of [initPipeline, initConverter, initWindowing, initLoso, initCounterfactual, initChanges]) {
      const cleanup = init(ctx);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }
  };
  if (!gsap) {
    run();
    return () => cleanups.forEach((fn) => fn());
  }

  const context = gsap.context(() => {
    run();
    if (reduced) return;
    intro(page, gsap);
    // The sidebar slides in from the left edge and its headings follow one by one.
    gsap.fromTo(page.querySelector(".toc"), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, delay: 0.3, ease: "expo.out", clearProps: "transform,opacity" });
    gsap.fromTo(page.querySelectorAll(".toc-list li"), { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, delay: 0.45, stagger: 0.04, ease: "power3.out", clearProps: "transform,opacity" });
    page.querySelectorAll(REVEAL).forEach((node) => {
      if (node.closest(".pipe, .cf, .loso")) return;
      gsap.fromTo(node, { y: 30, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.85, ease: "power3.out", clearProps: "transform",
        scrollTrigger: { trigger: node, start: "top 90%", once: true },
      });
    });
  }, page);

  return () => {
    cleanups.forEach((fn) => fn());
    context.revert();
  };
}
