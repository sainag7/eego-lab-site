// Projects, Research and Presentations, and People: the lab's pages with entrance and scroll motion.
import { intro, reveals, zooms, slides } from "../lib/motion.js";

function withContext(gsap, reduced, page, build) {
  if (reduced || !gsap) return () => {};
  const ctx = gsap.context(build, page);
  return () => ctx.revert();
}

export function initProjects({ gsap, ScrollTrigger, reduced, page }) {
  return withContext(gsap, reduced, page, () => {
    intro(page, gsap);
    slides(page, gsap);
    zooms(page, gsap);
    reveals(page, gsap, ScrollTrigger);
  });
}

export function initResearch({ gsap, reduced, page }) {
  return withContext(gsap, reduced, page, () => {
    intro(page, gsap);
    page.querySelectorAll("[data-entry]").forEach((entry) => {
      const photo = entry.querySelector("[data-wipe]");
      const parts = entry.querySelectorAll(".publication-entry-content > *");
      const tl = gsap.timeline({ scrollTrigger: { trigger: entry, start: "top 82%", once: true } });
      tl.fromTo(entry, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", clearProps: "transform" }, 0);
      if (photo) {
        tl.fromTo(photo, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut" }, 0.1);
        tl.fromTo(photo.querySelector("img"), { scale: 1.2 }, { scale: 1, duration: 1.6, ease: "expo.out" }, 0.1);
      }
      tl.fromTo(parts, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out", stagger: 0.07 }, 0.3);
    });
  });
}

export function initPeople({ gsap, ScrollTrigger, reduced, page }) {
  return withContext(gsap, reduced, page, () => {
    intro(page, gsap);
    page.querySelectorAll(".people-section").forEach((section) => {
      const heading = section.querySelector("h2");
      const cards = [...section.querySelectorAll(".person-card")];
      gsap.fromTo(heading, { "--rule-p": 0, opacity: 0, x: -16 }, {
        "--rule-p": 1, opacity: 1, x: 0, duration: 1.1, ease: "expo.out",
        scrollTrigger: { trigger: section, start: "top 85%", once: true },
      });
      gsap.set(cards, { opacity: 0, y: 50, scale: 0.96 });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out", stagger: 0.09 }),
      });
      section.querySelectorAll(".person-details--advisor li").forEach((li, i) => {
        gsap.fromTo(li, { opacity: 0, x: -10 }, {
          opacity: 1, x: 0, duration: 0.5, delay: 0.4 + (i % 6) * 0.06, ease: "power2.out",
          scrollTrigger: { trigger: li.closest(".person-card"), start: "top 92%", once: true },
        });
      });
    });
  });
}
