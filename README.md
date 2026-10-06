# EEGo Lab and EEGProc website

The site for the [EEGo Lab](https://eego-unc.github.io/Lab/) at UNC and its open-source library [EEGProc](https://github.com/EEGo-UNC/EEGProc). It follows the lab site's layout (navy theme, Inter, the same pages and photos) and adds scroll and entrance animation to every page. The EEGProc page walks an EEG signal from raw recording to an explained prediction.

Plain HTML, CSS and ES modules. GSAP with ScrollTrigger, Lenis and Prism load from CDNs. There is no build step.

## Run locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>. Add `?motion=reduced` to the URL to preview the reduced-motion version, which shows every page and figure in its final state.

## Pages

The site is one HTML file with five pages, switched by the URL hash like the lab site:

| Hash | Page |
|---|---|
| `#home` | Welcome, Science Expo photo, quote, lab description, featured EEGProc and research cards, group photo |
| `#eegproc` | The library: pipeline, model, features, datasets, validation, counterfactuals, what changed in 2.0.0, layout, quickstart, contributing, citing, and EEGProc's own footer links. Wide screens get a clickable "On this page" sidebar |
| `#projects` | The six lab projects, each with its picture on the left |
| `#research` | Research and presentations, including the forthcoming counterfactual paper (`#publications` also works) |
| `#people` | Members, main advisors, past members |

A hash that names an element inside a page, such as `#datasets` or `#quickstart`, opens that page and scrolls to the element. Back and forward work. Each page's script returns a cleanup that runs when the reader leaves, so ScrollTrigger pins only exist for the page on screen. Images on pages other than Home load the first time their page opens.

## Layout

```
index.html            header, the five pages, the lab footer (partner logos), metadata, JSON-LD
css/styles.css        lab tokens (navy default, light theme on the toggle), lab components, EEGProc figures
js/main.js            router and page transitions, header, nav indicator, theme, copy buttons, tabs, smooth scroll
js/lib/motion.js      shared animation helpers: split text, intro, reveals, parallax, wipes, and entries for picture-and-text cards
js/pages/home.js      Home: waveform backdrop, title, photo, quote that lights up as it scrolls, featured cards, group photo
js/pages/eegproc.js   EEGProc: starts the figure modules below and the text reveals
js/pages/lab.js       Projects and Research (shared card entrance) and People animations
js/lib/signal.js      seeded synthetic EEG, SVG helpers, scalp geometry, color ramps
js/waveform.js        EEG waveform canvases (Home backdrop, featured card, EEGProc masthead)
js/pipeline.js        pinned five-step pipeline
js/windowing.js       trial-safe windowing
js/loso.js            leave-one-subject-out grid
js/counterfactual.js  counterfactual path and scalp topographies
js/converter.js       dataset converter
js/changes.js         2.0.0: modules growing from two to six, and the timeline of changes
js/toc.js             EEGProc's "On this page" sidebar (wide screens): highlights the section being read
js/interactive.js     valence-arousal plane, gauges, featurization explorer, package tree
assets/               EEGProc images from docs/source/_static, logo variants, favicons, social card
assets/lab/           lab photos, portraits, project images and partner logos, resized to WebP
```

Each diagram is drawn in its finished state first, and the scroll timelines animate toward it. If motion is reduced or the CDN scripts fail to load, every page still shows its complete content.

## Deploy to GitHub Pages

1. Push this folder to a repository. `EEGo-UNC/eego-unc.github.io` serves the site at `https://eego-unc.github.io/`, next to the docs at `/EEGProc/` and the lab site at `/Lab/`. Any other repository name serves it at `https://eego-unc.github.io/<repo>/`; all paths are relative, so that works too.
2. In the repository, open Settings, then Pages, and set Source to GitHub Actions.
3. Push to `main`. `.github/workflows/pages.yml` publishes the site.

## Before publishing

- `index.html` uses `https://eego-unc.github.io/` for the canonical link, `og:url`, `og:image` and JSON-LD `url`. Change these if the site lives somewhere else.
- The tests badge reads `tests.yml` on the `v2` branch, where that workflow runs. Point it at the release branch once `v2` is retired.
- Mind Tune has no public repository under EEGo-UNC, so its card has no code link.
- The Neuroadaptive Tetris paper and the SMC 2026 preprint link to their PDFs on the lab site.

## Content

Lab text, people, projects, research and photos come from the [EEGo Lab site](https://eego-unc.github.io/Lab/) and its source repository, `EEGo-UNC/Lab`. EEGProc facts come from the EEGProc repository (README, CHANGELOG, CITATION.cff, pyproject.toml and the docs). The code samples match the README blocks that `src/tests/test_docs_examples.py` executes. Every signal, score and scalp map on the EEGProc page is synthetic and labeled as illustrative.
