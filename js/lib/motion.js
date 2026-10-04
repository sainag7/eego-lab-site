// Shared entrance and scroll animations. Each helper creates tweens and ScrollTriggers, so call
// them inside a page's gsap.context(); reverting the context removes everything they made.

/** Wrap an element's text in spans of characters or words, once. */
export function splitText(el, mode = "words") {
  if (el.dataset.splitDone) return [...el.querySelectorAll(".split-unit, .word")];
  el.dataset.splitDone = "1";
  const text = el.textContent;
  el.setAttribute("aria-label", text.trim());
  el.textContent = "";
  const units = [];
  const tokens = mode === "chars" ? [...text] : text.split(/(\s+)/);
  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      el.appendChild(document.createTextNode(token));
      continue;
    }
    const span = document.createElement("span");
    span.className = mode === "words-plain" ? "word" : "split-unit";
    span.setAttribute("aria-hidden", "true");
    span.textContent = token;
    el.appendChild(span);
    units.push(span);
  }
  return units;
}

/** Page entrance: split headings rise in, then the [data-intro] elements follow. */
export function intro(root, gsap) {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  root.querySelectorAll("[data-split]").forEach((heading) => {
    const units = splitText(heading, heading.dataset.split === "chars" ? "chars" : "words");
    tl.fromTo(units, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: heading.dataset.split === "chars" ? 0.045 : 0.07 }, 0);
  });
  const blocks = [...root.querySelectorAll("[data-intro]"), ...root.querySelectorAll(".eeg-hero-logo")];
  if (blocks.length) tl.fromTo(blocks, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, clearProps: "transform" }, 0.15);
  return tl;
}

/** Fade and rise single blocks, and stagger the children of groups, as they enter. */
export function reveals(root, gsap, ScrollTrigger, selector = "[data-reveal]") {
  root.querySelectorAll(selector).forEach((node) => {
    gsap.fromTo(node, { y: 34, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: node, start: "top 88%", once: true },
    });
  });
  root.querySelectorAll("[data-reveal-group]").forEach((group) => {
    const kids = [...group.children];
    gsap.set(kids, { y: 28, opacity: 0 });
    ScrollTrigger.batch(kids, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.1 }),
    });
  });
}

/** Images drift inside their frame as the page scrolls. */
export function parallax(root, gsap) {
  root.querySelectorAll("[data-parallax]").forEach((img) => {
    gsap.fromTo(img, { yPercent: -7, scale: 1.14 }, {
      yPercent: 7, scale: 1.14, ease: "none",
      scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

/** Frames open with a clip-path wipe from the center (or from the left). */
export function wipes(root, gsap) {
  root.querySelectorAll("[data-wipe]").forEach((frame) => {
    const fromLeft = frame.dataset.wipe === "left";
    gsap.fromTo(frame,
      { clipPath: fromLeft ? "inset(0% 100% 0% 0% round 0.75rem)" : "inset(6% 22% 6% 22% round 0.75rem)", opacity: 0.4 },
      {
        clipPath: "inset(0% 0% 0% 0% round 0.75rem)", opacity: 1, duration: 1.3, ease: "expo.out",
        scrollTrigger: { trigger: frame, start: "top 85%", once: true },
      });
  });
}

/** Pictures settle from a slight zoom while their card scrolls into view. */
export function zooms(root, gsap) {
  root.querySelectorAll("[data-zoom]").forEach((img) => {
    gsap.fromTo(img, { scale: 1.16 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: img.closest("article, figure") || img, start: "top bottom", end: "center 55%", scrub: true },
    });
  });
}

/** Cards slide in from the side their picture sits on. */
export function slides(root, gsap) {
  root.querySelectorAll("[data-slide]").forEach((card) => {
    const distance = Math.min(70, window.innerWidth * 0.06);
    const dx = card.dataset.slide === "right" ? distance : -distance;
    gsap.fromTo(card, { x: dx, opacity: 0 }, {
      x: 0, opacity: 1, duration: 1.1, ease: "expo.out", clearProps: "transform",
      scrollTrigger: { trigger: card, start: "top 86%", once: true },
    });
  });
}
