// F. The 2.0.0 timeline draws itself, and the release pipeline lights up in order on scroll.

export function initRelease({ gsap, ScrollTrigger, reduced }) {
  const timeline = document.getElementById("tl");
  const release = document.getElementById("release");
  if (!timeline || !release) return;
  const items = [...timeline.querySelectorAll(".tl-item")];
  const nodes = [...release.querySelectorAll(".rel-node")];
  const versions = [...release.querySelectorAll(".pyv span")];
  const testsNode = release.querySelector(".rel-tests");
  // Events in order: commit, the four Python versions (which light Tests), then the rest.
  const events = [nodes[0], ...versions, ...nodes.slice(2)];

  const light = (count) => {
    events.forEach((node, i) => node.classList.toggle("is-lit", i < count));
    testsNode.classList.toggle("is-lit", versions.every((v) => v.classList.contains("is-lit")));
  };

  if (reduced || !gsap) {
    items.forEach((item) => item.classList.add("is-lit"));
    light(events.length);
    return;
  }

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

  light(0);
  ScrollTrigger.create({
    trigger: release,
    start: "top 78%",
    end: "bottom 45%",
    onUpdate: (self) => light(Math.round(self.progress * events.length)),
    onLeave: () => light(events.length),
  });
}
