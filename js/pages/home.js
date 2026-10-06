// Home: the lab welcome with a live EEG backdrop, a rising hero photo, a quote that lights up
// word by word, the featured EEGProc and research cards, and the group photo.
import { initWaveform } from "../waveform.js";
import { intro, reveals, parallax, splitText, entries, wipes } from "../lib/motion.js";

export function initHome({ gsap, ScrollTrigger, reduced, page }) {
  initWaveform(page.querySelector(".welcome-wave"), {
    reduced, labels: false, rowPx: 26, inkAlpha: 0.32, bandAlpha: 0.55, seed: 11,
    palette: ["--accent", "--ink", "--theta", "--accent", "--ink", "--alpha", "--accent", "--beta"],
  });
  initWaveform(page.querySelector(".featured-wave"), {
    reduced, labels: false, rowPx: 22, inkAlpha: 0.35, bandAlpha: 0.6, seed: 23,
    palette: ["--accent", "--ink", "--theta", "--accent", "--alpha", "--ink"],
  });
  if (reduced || !gsap) return () => {};

  const ctx = gsap.context(() => {
    intro(page, gsap);
    parallax(page, gsap);

    // The hero photo rises in with the title (no clip, so it paints at full size right away).
    const photo = page.querySelector(".welcome-photo:not(.welcome-photo--portrait)");
    if (photo) gsap.fromTo(photo, { y: 40, opacity: 0.35 }, { y: 0, opacity: 1, duration: 1.3, ease: "expo.out", delay: 0.25, clearProps: "transform" });
    reveals(page, gsap, ScrollTrigger);

    const quote = page.querySelector("[data-words]");
    if (quote) {
      // Words light up from muted to full ink as the quote scrolls through (CSS colors per theme).
      const words = splitText(quote, "words-plain");
      quote.classList.add("is-scrubbed");
      ScrollTrigger.create({
        trigger: quote, start: "top 85%", end: "bottom 50%",
        onUpdate: (self) => {
          const lit = Math.round(self.progress * words.length);
          words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
        },
        onLeave: () => words.forEach((w) => w.classList.add("is-lit")),
      });
    }

    // The featured research card enters like the Research page; the group photo opens straight
    // from its center so it settles square with the cards above it.
    entries(page, gsap);
    wipes(page, gsap);
  }, page);
  return () => {
    ctx.revert();
    page.querySelector("[data-words]")?.classList.remove("is-scrubbed");
  };
}
