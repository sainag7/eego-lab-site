// F. Version 2.0.0: the module figure grows from 1.0.0's two modules to six as it scrolls through,
// with deep_learning branching into its subpackages last. Then the timeline of changes draws itself.

export function initChanges({ gsap, ScrollTrigger, reduced }) {
  const figure = document.getElementById("pkgs");
  const timeline = document.getElementById("tl");
  if (!figure || !timeline) return;
  const items = [...timeline.querySelectorAll(".tl-item")];

  if (reduced || !gsap) {
    items.forEach((item) => item.classList.add("is-lit"));
    return;
  }

  const mm = gsap.matchMedia();
  mm.add({ narrow: "(max-width: 40rem)", wide: "(min-width: 40.01rem)" }, (context) => {
    // On phones the stacked figure is taller than the screen, so the scrub follows its bottom edge
    // and each module appears about as it scrolls into view.
    const { narrow } = context.conditions;
    const q = (selector) => [...figure.querySelectorAll(selector)];
    const [baseGroup, extraGroup] = q(".pkgs-group");
    const baseAdded = q(".pkgs-list:not(.pkgs-list--extra) > .pkg-added");
    const extraAdded = q(".pkgs-list--extra > .pkg-added");

    // Scrubbed: 1.0.0's modules light up and carry across the arrow, the new modules arrive in
    // install order, then deep_learning's branch line draws and its subpackages fan out.
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.fromTo(q(".pkg-old"), { "--hl": 0 }, { "--hl": 1, duration: 0.12, stagger: 0.05 }, 0)
      .fromTo(figure.querySelector(".pkgs-arrow path"), { strokeDashoffset: 60 }, { strokeDashoffset: 0, duration: 0.18, ease: "none" }, 0.08)
      .fromTo(baseGroup, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.18)
      .fromTo(q(".pkg-carried"), { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.2, stagger: 0.07 }, 0.2)
      .to(q(".pkg-old"), { "--hl": 0, duration: 0.12 }, 0.34)
      .fromTo(baseAdded, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.16, stagger: 0.08 }, 0.4)
      .fromTo(extraGroup, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.58)
      .fromTo(extraAdded, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.16, stagger: 0.1 }, 0.62)
      .fromTo(figure.querySelector(".pkg-subs"), { "--p": 0 }, { "--p": 1, duration: 0.24, ease: "none" }, 0.8)
      .fromTo(q(".pkg-sub"), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.14, stagger: 0.06 }, 0.84);
    ScrollTrigger.create({ trigger: figure, start: "top 78%", end: narrow ? "bottom 92%" : "bottom 60%", scrub: 0.5, animation: tl });

    // The timeline's rail draws with the scroll and each change lights as the rail reaches it.
    gsap.fromTo(timeline, { "--p": 0 }, {
      "--p": 1,
      ease: "none",
      scrollTrigger: {
        trigger: timeline,
        start: "top 70%",
        end: "bottom 60%",
        scrub: 0.4,
        onUpdate: (self) => {
          items.forEach((item, i) => item.classList.toggle("is-lit", self.progress >= (i + 0.2) / items.length));
        },
      },
    });
    items.forEach((item) => {
      gsap.fromTo(item, { opacity: 0, x: -18 }, {
        opacity: 1, x: 0, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: item, start: "top 88%", once: true },
      });
    });
  });
  return () => mm.revert();
}
