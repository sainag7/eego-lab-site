// Interactions that answer the reader: valence-arousal plane, featurization explorer and
// package tree. The cognitive gauges are static drawings.

const QUADRANTS = [
  "Frustration or anxiety: negative valence with high arousal.",
  "Enjoyment or excitement: positive valence with high arousal.",
  "Boredom or sadness: negative valence with low arousal.",
  "Calmness or relaxation: positive valence with low arousal.",
];

const FEATURIZERS = [
  { fn: "bandpass_filter", in: "raw signal", out: "{channel}_{band}", up: "Starts from the raw table, one column per electrode.", ex: "Example columns: AF3_delta, AF3_theta, AF3_alpha … AF4_gamma." },
  { fn: "psd_bandpowers", in: "filtered signal", out: "{channel}_{band}", up: "Runs after bandpass_filter.", ex: "Welch band power per window: one row per window, for example AF3_alpha." },
  { fn: "shannons_entropy", in: "PSD table", out: "{channel}_entropy", up: "Runs after psd_bandpowers.", ex: "One value per channel, AF3_entropy: how evenly that channel's energy spreads across bands." },
  { fn: "hjorth_params", in: "filtered signal", out: "{channel}_{band}_activity, _mobility, _complexity", up: "Runs after bandpass_filter.", ex: "Example columns: AF3_alpha_activity, AF3_alpha_mobility, AF3_alpha_complexity." },
  { fn: "wavelet_band_energy", in: "raw signal", out: "{channel}_{band}_wenergy", up: "Starts from the raw table.", ex: "Example column: AF3_alpha_wenergy." },
  { fn: "wavelet_entropy", in: "wavelet energy", out: "{channel}_wentropy", up: "Runs after wavelet_band_energy.", ex: "One value per channel, for example AF3_wentropy." },
  { fn: "imf_band_energy", in: "raw signal", out: "{channel}_{band}_imfenergy", up: "Starts from the raw table; uses empirical mode decomposition.", ex: "Example column: AF3_alpha_imfenergy." },
  { fn: "imf_entropy", in: "IMF energy", out: "{channel}_imfentropy", up: "Runs after imf_band_energy.", ex: "One value per channel, for example AF3_imfentropy." },
];

const DOCS = "https://eego-unc.github.io/EEGProc/api/";
const TREE = [
  { name: "eegproc.preprocessing", desc: "Filtering, detrending and band decomposition", tag: "base" },
  { name: "eegproc.featurization", desc: "Spectral, Hjorth, wavelet and IMF features", tag: "base" },
  {
    name: "eegproc.data", desc: "Dataset conversion, table schema and trial-safe windowing", tag: "base",
    children: [
      { name: "eegproc.data.schema", desc: "Column roles for signal samples and precomputed features" },
      { name: "eegproc.data.windowing", desc: "Model arrays without windows crossing trial boundaries" },
      { name: "eegproc.data.to_csv", desc: "The eegproc-to-csv command" },
      { name: "eegproc.data.csv_matlab", desc: "Readers for AMIGOS, DREAMER and preprocessed DEAP" },
      { name: "eegproc.data.csv_eegemotions", desc: "EEGEmotions-27 raw text with its metadata" },
      { name: "eegproc.data.csv_cowen", desc: "Cowen/Keltner ratings to the 27-emotion mapping" },
    ],
  },
  {
    name: "eegproc.deep_learning", desc: "Reusable models, cross-validation and domain generalization", tag: "deep-learning",
    children: [
      {
        name: "eegproc.deep_learning.supervised", desc: "Supervised classifiers and losses",
        children: [
          { name: "eegproc.deep_learning.supervised.rnn_architectures", desc: "RNN classifiers, including BiLSTM" },
          { name: "eegproc.deep_learning.supervised.variational_classifier", desc: "Classification heads for EEG embeddings" },
          { name: "eegproc.deep_learning.supervised.supervised_contrastive_loss", desc: "Supervised contrastive regularization" },
        ],
      },
      {
        name: "eegproc.deep_learning.unsupervised", desc: "Encoders, decoders and autoencoder losses",
        children: [
          { name: "eegproc.deep_learning.unsupervised.Convolutions", desc: "CNN1D and CNN2D encoders and decoders" },
          { name: "eegproc.deep_learning.unsupervised.GNN", desc: "Graph convolution layers, GCN encoders and a multi-task GCN" },
          { name: "eegproc.deep_learning.unsupervised.VariationalAutoencoderLoss", desc: "VAE loss" },
        ],
      },
      {
        name: "eegproc.deep_learning.cross_validation", desc: "Subject-wise cross-validation",
        children: [
          { name: "eegproc.deep_learning.cross_validation.dataframe", desc: "Cross-validate straight from a tidy DataFrame" },
          { name: "eegproc.deep_learning.cross_validation.loso", desc: "Leave-one-subject-out" },
          { name: "eegproc.deep_learning.cross_validation.nested", desc: "Nested leave-N-subjects-out" },
          { name: "eegproc.deep_learning.cross_validation.calibration", desc: "Subject calibration and few-shot" },
          { name: "eegproc.deep_learning.cross_validation.splits", desc: "Subject-set construction for folds" },
          { name: "eegproc.deep_learning.cross_validation.metrics", desc: "Classification metrics and summaries" },
          { name: "eegproc.deep_learning.cross_validation.aggregation", desc: "Window-level to trial-level predictions" },
          { name: "eegproc.deep_learning.cross_validation.reporting", desc: "Fold results, prediction logs and output" },
        ],
      },
      { name: "eegproc.deep_learning.domain_generalization", desc: "Meta-learning and alternating group learning" },
    ],
  },
  {
    name: "eegproc.model_explainability", desc: "Model-agnostic counterfactuals and topographies", tag: "deep-learning",
    children: [
      { name: "eegproc.model_explainability.model_agnostic.adapter", desc: "Adapter and dataset contracts" },
      { name: "eegproc.model_explainability.model_agnostic.optimizer", desc: "Gradient counterfactual optimizer" },
      { name: "eegproc.model_explainability.model_agnostic.topography", desc: "Metadata-driven scalp topographies" },
      { name: "eegproc.model_explainability.model_agnostic.plotting", desc: "Array loading and plotting helpers" },
      { name: "eegproc.model_explainability.model_agnostic.runner", desc: "Command-line runner" },
    ],
  },
  {
    name: "eegproc.plotting", desc: "EEG feature plots", tag: "base",
    children: [{ name: "eegproc.plotting.plots", desc: "plot_eeg_features and helpers" }],
  },
];

function setupValenceArousal() {
  const plane = document.querySelector(".va-plane");
  if (!plane) return;
  const dot = plane.querySelector(".va-dot");
  const readout = document.getElementById("va-readout");
  const buttons = [...plane.querySelectorAll(".va-q")];
  const activate = (button) => {
    buttons.forEach((b) => b.classList.toggle("is-active", b === button));
    const cx = button.offsetLeft + button.offsetWidth / 2 - plane.clientWidth / 2;
    const cy = button.offsetTop + button.offsetHeight / 2 - plane.clientHeight / 2;
    dot.style.setProperty("--dx", `${cx}px`);
    dot.style.setProperty("--dy", `${cy}px`);
    readout.textContent = QUADRANTS[Number(button.dataset.q)];
  };
  buttons.forEach((button) => {
    button.addEventListener("pointerenter", () => activate(button));
    button.addEventListener("focus", () => activate(button));
    button.addEventListener("click", () => activate(button));
  });
}

function setupGauges() {
  document.querySelectorAll(".gauge-needle").forEach((n) => n.setAttribute("transform", `rotate(${n.dataset.angle} 60 64)`));
}

function setupExplorer({ gsap, reduced }) {
  const rows = [...document.querySelectorAll(".fx-table tbody tr")];
  if (!rows.length) return;
  const nodes = {
    up: document.getElementById("fx-up"),
    in: document.getElementById("fx-in"),
    fn: document.getElementById("fx-fn"),
    out: document.getElementById("fx-out"),
    ex: document.getElementById("fx-example"),
    desc: document.getElementById("fx-desc"),
  };
  const chain = document.querySelector(".fx-chain");
  const buttons = rows.map((row) => row.querySelector("button"));

  const show = (index, announce) => {
    const f = FEATURIZERS[index];
    rows.forEach((row, i) => row.classList.toggle("is-active", i === index));
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
    nodes.up.textContent = f.up;
    nodes.in.textContent = f.in;
    nodes.fn.textContent = f.fn;
    nodes.out.textContent = f.out;
    nodes.ex.textContent = f.ex;
    if (announce) nodes.desc.textContent = `${f.fn} consumes ${f.in} and emits ${f.out}.`;
    if (announce && gsap && !reduced) {
      gsap.fromTo(chain.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.06 });
    }
  };

  buttons.forEach((button, i) => {
    button.addEventListener("click", () => show(i, true));
    button.addEventListener("keydown", (event) => {
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const next = (i + step + buttons.length) % buttons.length;
      buttons[next].focus();
      show(next, true);
    });
  });
  show(0, false);
}

function buildTree(container, items, depth = 0) {
  items.forEach((item) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "tree-row";
    let list = null;
    if (item.children) {
      const id = `tree-${item.name.replace(/\./g, "-")}`;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tree-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", id);
      toggle.setAttribute("aria-label", `Show submodules of ${item.name}`);
      toggle.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg>';
      row.appendChild(toggle);
      list = document.createElement("ul");
      list.id = id;
      list.hidden = true;
      buildTree(list, item.children, depth + 1);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "tree-spacer";
      row.appendChild(spacer);
    }
    const link = document.createElement("a");
    link.href = `${DOCS}${item.name}.html`;
    link.textContent = item.name;
    row.appendChild(link);
    const desc = document.createElement("span");
    desc.className = "tree-desc";
    desc.textContent = item.desc;
    row.appendChild(desc);
    if (item.tag) {
      const tag = document.createElement("span");
      tag.className = item.tag === "base" ? "tag" : "tag tag-dl";
      tag.textContent = item.tag === "base" ? "base install" : "[deep-learning]";
      row.appendChild(tag);
    }
    li.appendChild(row);
    if (list) li.appendChild(list);
    container.appendChild(li);
  });
}

function setupTree({ ScrollTrigger, reduced }) {
  const tree = document.getElementById("tree");
  if (!tree) return;
  buildTree(tree, TREE);
  tree.addEventListener("click", (event) => {
    const toggle = event.target.closest(".tree-toggle");
    if (!toggle) return;
    const open = toggle.getAttribute("aria-expanded") !== "true";
    const list = document.getElementById(toggle.getAttribute("aria-controls"));
    const name = toggle.nextElementSibling.textContent;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", `${open ? "Hide" : "Show"} submodules of ${name}`);
    list.hidden = !open;
    if (open && !reduced) {
      list.classList.remove("is-opening");
      void list.offsetWidth;
      list.classList.add("is-opening");
    }
    if (ScrollTrigger) window.requestAnimationFrame(() => ScrollTrigger.refresh());
  });
}

let initialized = false;

export function initInteractive(ctx) {
  if (initialized) return;
  initialized = true;
  setupValenceArousal();
  setupGauges();
  setupExplorer(ctx);
  setupTree(ctx);
}
