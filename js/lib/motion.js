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

/** Frames open with a clip-path wipe from the center (or from the left). Card visuals are left to entries(). */
export function wipes(root, gsap) {
  root.querySelectorAll("[data-wipe]").forEach((frame) => {
    if (frame.closest("[data-entry]")) return;
    const fromLeft = frame.dataset.wipe === "left";
    gsap.fromTo(frame,
      { clipPath: fromLeft ? "inset(0% 100% 0% 0% round 0.75rem)" : "inset(6% 22% 6% 22% round 0.75rem)", opacity: 0.4 },
      {
        clipPath: "inset(0% 0% 0% 0% round 0.75rem)", opacity: 1, duration: 1.3, ease: "expo.out", clearProps: "clipPath",
        scrollTrigger: { trigger: frame, start: "top 85%", once: true },
      });
  });
}

/**
 * Image-and-text cards (Research, Projects, the Home featured research): the card rises, its visual
 * wipes open from the left while the picture settles from a slight zoom, and the text staggers in.
 */
export function entries(root, gsap) {
  root.querySelectorAll("[data-entry]").forEach((entry) => {
    const visual = entry.querySelector("[data-wipe]");
    const parts = entry.querySelectorAll(".publication-entry-content > *");
    const tl = gsap.timeline({ scrollTrigger: { trigger: entry, start: "top 82%", once: true } });
    tl.fromTo(entry, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", clearProps: "transform" }, 0);
    if (visual) {
      tl.fromTo(visual, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut", clearProps: "clipPath" }, 0.1);
      const images = visual.querySelectorAll("img");
      if (images.length) tl.fromTo(images, { scale: 1.2 }, { scale: 1, duration: 1.6, ease: "expo.out", clearProps: "transform" }, 0.1);
    }
    tl.fromTo(parts, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, clearProps: "transform" }, 0.3);
  });
}
