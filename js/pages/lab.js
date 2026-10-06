// Projects, Research and Presentations, and People: the lab's pages with entrance and scroll motion.
import { intro, entries } from "../lib/motion.js";

function withContext(gsap, reduced, page, build) {
  if (reduced || !gsap) return () => {};
  const ctx = gsap.context(build, page);
  return () => ctx.revert();
}

// Projects and Research share one card layout (picture left, text right) and one entrance.
export function initProjects({ gsap, reduced, page }) {
  return withContext(gsap, reduced, page, () => {
    intro(page, gsap);
    entries(page, gsap);
  });
}

export function initResearch({ gsap, reduced, page }) {
  return withContext(gsap, reduced, page, () => {
    intro(page, gsap);
    entries(page, gsap);
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
