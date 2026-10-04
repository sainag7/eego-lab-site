// Boot and routing. Pages follow the EEGo Lab site: #home, #eegproc, #projects, #research
// (alias #publications) and #people. A hash that names an element inside a page opens that page
// and scrolls to it. Each page's init() returns a cleanup, run when the reader leaves the page,
// so pinned figures never measure a hidden page.
import { initHome } from "./pages/home.js";
import { initEEGProc } from "./pages/eegproc.js";
import { initProjects, initResearch, initPeople } from "./pages/lab.js";

const root = document.documentElement;
const reduced = root.classList.contains("reduce-motion");
const { gsap, ScrollTrigger, Lenis, Prism } = window;
const motion = Boolean(gsap && ScrollTrigger);
const live = document.getElementById("live");
const header = document.getElementById("site-header");
const nav = document.getElementById("main-navigation");
const menuToggle = document.querySelector(".menu-toggle");

const ROUTES = {
  home: { title: "EEGo Lab", init: initHome },
  eegproc: { title: "EEGProc | EEGo Lab", init: initEEGProc },
  projects: { title: "Projects | EEGo Lab", init: initProjects },
  research: { title: "Research and Presentations | EEGo Lab", init: initResearch },
  people: { title: "People | EEGo Lab", init: initPeople },
};
const ALIASES = { publications: "research", top: "home", "": "home" };
const pages = Object.fromEntries(
  [...document.querySelectorAll(".page[data-page]")].map((el) => [el.dataset.page, el]),
);

let lenis = null;
let current = null;
let cleanup = null;
let navigating = Promise.resolve();

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function announce(message) {
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => { live.textContent = message; }, 30);
}

function scrollToY(y, { immediate = false } = {}) {
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.1 });
  else window.scrollTo({ top: y, behavior: immediate || reduced ? "auto" : "smooth" });
}

// The header is compact once the page has scrolled, so aim below its compact height.
const offsetOf = (el) => el.getBoundingClientRect().top + window.scrollY - 72;

/* ---------- Routing ---------- */

// Images on pages other than Home load when their page first opens.
function hydrateImages(page) {
  page.querySelectorAll("img[data-src]").forEach((img) => {
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
    img.removeAttribute("data-srcset");
  });
}

// A transition must not hang when the tab is in the background and frames are throttled.
const settle = (tween) => Promise.race([tween.then(), new Promise((r) => setTimeout(r, 350))]);

function resolve(hash) {
  let id = decodeURIComponent((hash || "").replace(/^#/, ""));
  if (id in ALIASES) id = ALIASES[id];
  if (ROUTES[id]) return { page: id, target: null };
  const el = id ? document.getElementById(id) : null;
  const owner = el?.closest(".page[data-page]");
  if (owner) return { page: owner.dataset.page, target: el };
  return { page: "home", target: null };
}

async function showPage(page, target, { instant = false, focus = false } = {}) {
  const animate = motion && !reduced && !instant && !document.hidden;
  if (page === current) {
    scrollToY(target ? offsetOf(target) : 0, { immediate: !animate });
    return;
  }

  if (current) {
    cleanup?.();
    cleanup = null;
    const prev = pages[current];
    if (animate) await settle(gsap.to(prev, { opacity: 0, duration: 0.2, ease: "power1.in" }));
    prev.hidden = true;
    if (gsap) gsap.set(prev, { clearProps: "opacity" });
  }

  const next = pages[page];
  Object.values(pages).forEach((el) => { el.hidden = el !== next; });
  hydrateImages(next);
  current = page;
  document.title = ROUTES[page].title;
  updateNav();
  scrollToY(0, { immediate: true });

  cleanup = ROUTES[page].init({
    gsap: motion ? gsap : null,
    ScrollTrigger: motion ? ScrollTrigger : null,
    reduced: reduced || !motion,
    page: next,
    scrollToY,
  });
  if (motion) ScrollTrigger.refresh();
  if (target) scrollToY(offsetOf(target), { immediate: true });
  if (animate) gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out", clearProps: "opacity" });
  if (focus) next.querySelector("h1")?.focus({ preventScroll: true });
}

function route(options) {
  const { page, target } = resolve(location.hash);
  navigating = navigating.then(() => showPage(page, target, options)).catch((error) => console.error(error));
  return navigating;
}

function updateNav() {
  nav.querySelectorAll("a[data-route]").forEach((a) => {
    if (a.dataset.route === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  placeIndicator();
}

function placeIndicator() {
  const indicator = nav.querySelector(".nav-indicator");
  const active = nav.querySelector('a[aria-current="page"]');
  if (!indicator || !active) return;
  indicator.style.setProperty("--x", `${active.offsetLeft}px`);
  indicator.style.setProperty("--w", String(active.offsetWidth));
}

/* ---------- Header, menu and links ---------- */

function setMenu(open) {
  menuToggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("is-open", open);
}

function setupHeader() {
  menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });
  const onScroll = () => header.classList.toggle("is-compact", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  window.addEventListener("resize", placeIndicator);
  if (document.fonts) document.fonts.ready.then(placeIndicator);

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    const hash = link.getAttribute("href");
    event.preventDefault();
    if (hash === "#main-content") {
      document.getElementById("main-content").focus();
      return;
    }
    setMenu(false);
    const isPageChange = resolve(hash).page !== current;
    if (location.hash !== hash) history.pushState(null, "", hash);
    route({ focus: isPageChange });
  });
  window.addEventListener("popstate", () => route({ focus: false }));
}

/* ---------- Theme ---------- */

function setupTheme() {
  const button = document.querySelector(".theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (theme) => {
    root.setAttribute("data-theme", theme);
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    if (meta) meta.setAttribute("content", theme === "dark" ? "#041426" : "#F4F7FB");
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  };
  apply(root.getAttribute("data-theme") === "light" ? "light" : "dark");
  button.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    apply(next);
    try { localStorage.setItem("eegproc-theme", next); } catch (e) { /* storage unavailable */ }
  });
}

/* ---------- Copy buttons, tabs, disclosures ---------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    area.remove();
    return ok;
  }
}

function setupCopy() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-btn");
    if (!button) return;
    const text = button.dataset.copy ?? button.closest(".code")?.querySelector("pre code")?.textContent ?? "";
    const ok = await copyText(text.trim());
    announce(ok ? "Copied to clipboard" : "Copy failed. Select the text and copy it manually.");
    if (!ok) return;
    button.classList.add("is-copied");
    window.clearTimeout(button._copyTimer);
    button._copyTimer = window.setTimeout(() => button.classList.remove("is-copied"), 1600);
  });
}

function refreshTriggers() {
  if (motion) window.requestAnimationFrame(() => ScrollTrigger.refresh());
}

function setupTabs() {
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab, focus = true) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.hidden = !selected;
        if (selected && !reduced) {
          panel.classList.remove("is-entering");
          void panel.offsetWidth;
          panel.classList.add("is-entering");
        }
      });
      if (focus) tab.focus();
      refreshTriggers();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (event) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(event.key in keys)) return;
        event.preventDefault();
        select(tabs[(keys[event.key] + tabs.length) % tabs.length]);
      });
    });
  });
}

function setupDisclosures() {
  document.querySelectorAll(".disclosure").forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const label = button.lastChild;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      label.textContent = open ? " Hide code" : " Show code";
      panel.hidden = !open;
      if (open) {
        panel.classList.remove("is-opening");
        void panel.offsetWidth;
        panel.classList.add("is-opening");
      }
      refreshTriggers();
    });
  });
}

/* ---------- Smooth scrolling ---------- */

function setupLenis() {
  if (reduced || !Lenis || !window.matchMedia("(pointer: fine)").matches) return null;
  const instance = new Lenis({ lerp: 0.12, smoothWheel: true });
  instance.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => instance.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return instance;
}

/* ---------- Boot ---------- */

function boot() {
  setupTheme();
  setupHeader();
  setupCopy();
  setupTabs();
  setupDisclosures();
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    lenis = setupLenis();
  }
  route({ instant: true }).then(() => {
    if (motion && document.fonts) document.fonts.ready.then(() => { ScrollTrigger.refresh(); placeIndicator(); });
  });
}

boot();
