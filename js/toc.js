// EEGProc's "On this page" sidebar: the section being read is highlighted and the accent marker
// slides to it. Clicking a heading goes through the router like any in-page link, which scrolls
// there. The sidebar steps aside when the footer reaches it.

export function initToc(page) {
  const toc = page.querySelector(".toc");
  if (!toc) return () => {};
  const links = [...toc.querySelectorAll(".toc-list a")];
  const marker = toc.querySelector(".toc-marker");
  const footer = document.querySelector(".site-footer");
  // "#eegproc" is the page itself, so Overview tracks the masthead.
  const targets = links.map((a) => (a.hash === "#eegproc" ? page.querySelector(".eeg-hero") : document.getElementById(a.hash.slice(1))));
  let active = -1;
  let frame = 0;

  const setActive = (index) => {
    if (index === active) return;
    active = index;
    links.forEach((a, i) => {
      if (i === index) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
    marker.style.setProperty("--y", `${links[index].offsetTop}px`);
    marker.style.setProperty("--h", `${links[index].offsetHeight}px`);
  };

  const update = () => {
    frame = 0;
    if (getComputedStyle(toc).display === "none") return; // the sidebar only shows on wide screens
    // A section is current once its top passes a line a third of the way down the screen; at the
    // very bottom of the page the last section wins even if it is too short to reach that line.
    const line = window.innerHeight * 0.35;
    let index = 0;
    targets.forEach((target, i) => {
      if (target && target.getBoundingClientRect().top <= line) index = i;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) index = targets.length - 1;
    setActive(index);
    // The sidebar box runs the full height below the header; the list inside is what the footer can reach.
    const tocBottom = toc.querySelector(".toc-track").getBoundingClientRect().bottom;
    toc.classList.toggle("is-away", Boolean(footer) && footer.getBoundingClientRect().top < tocBottom + 24);
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  // After a resize the links may sit elsewhere, so place the marker again even if the section is the same.
  const onResize = () => {
    active = -1;
    schedule();
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", onResize);
  update();

  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", onResize);
    window.cancelAnimationFrame(frame);
    toc.classList.remove("is-away");
  };
}
