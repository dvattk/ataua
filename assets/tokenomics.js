// "Does a pricier provider agent help?" x = provider agent's inference cost per task, y = provider reward.
// Users run GPT-6 Astra; each dot is the provider model behind the provider agent. Gemini 3.8 Flash and GPT-6 Astra
// earn providers the same reward at very different costs.
// The named buttons switch supply; dots glide, so costs visibly shrink under abundant supply.
(function () {
  const svg = document.querySelector(".tokplot");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const FAM = { OpenAI: "var(--openai)", Google: "var(--google)", Anthropic: "var(--anthropic)" };
  const HERO = "GPT-6 Astra";                    // the user model whose line we spell out
  const W = 640, H = 400, M = { l: 58, r: 24, t: 20, b: 52 }, XMAX = 6, YMAX = 0.5;
  const X = (c) => M.l + (c / XMAX) * (W - M.l - M.r);
  const Y = (v) => H - M.b - (v / YMAX) * (H - M.t - M.b);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };
  const CAPTION = {
    scarce: "With <b>GPT-6 Astra</b> users, a GPT-6 Astra provider agent costs <b>$5.47</b> per task and earns providers <b>0.34</b>. Gemini 3.8 Flash costs <b>$1.37</b> and earns <b>0.35</b>.",
    abundant: "Costs drop with plenty of seats, but the pattern holds: GPT-6 Astra costs <b>$2.81</b> and Gemini 3.8 Flash <b>$0.81</b>, and both earn providers <b>0.38</b>.",
  };
  const MULT = { scarce: "4×", abundant: "3.5×" };
  const CHEAP = "Gemini 3.8 Flash", PRICEY = "GPT-6 Astra";       // the pair the note compares
  // label offset per provider model: [dx, dy, anchor]
  const LBL = { "Gemini 3.7 Flash": [0, -14, "middle"], "Gemini 3.8 Flash": [-6, 26, "start"], "GPT-5.4": [0, -14, "middle"],
                "Claude Opus 5": [0, 26, "middle"], "GPT-6 Astra": [0, -14, "middle"] };

  for (let c = 0; c <= XMAX; c++) {
    el("line", { class: "grid", x1: X(c), x2: X(c), y1: Y(0), y2: Y(YMAX) });
    el("text", { class: "tick", x: X(c), y: Y(0) + 20, "text-anchor": "middle" }).textContent = `$${c}`;
  }
  for (let v = 0; v <= YMAX + 1e-9; v += 0.1) {
    el("line", { class: "grid", x1: X(0), x2: X(XMAX), y1: Y(v), y2: Y(v) });
    el("text", { class: "tick", x: X(0) - 10, y: Y(v) + 4, "text-anchor": "end" }).textContent = v.toFixed(1);
  }
  el("line", { class: "axis", x1: X(0), x2: X(XMAX), y1: Y(0), y2: Y(0) });
  el("line", { class: "axis", x1: X(0), x2: X(0), y1: Y(0), y2: Y(YMAX) });
  el("text", { class: "alabel", x: (X(0) + X(XMAX)) / 2, y: H - 10, "text-anchor": "middle" }).textContent = "Provider inference cost per task";
  el("text", { class: "alabel", transform: `translate(16 ${(Y(0) + Y(YMAX)) / 2}) rotate(-90)`, "text-anchor": "middle" }).textContent = "Provider reward";
  const lineLayer = el("g", {}), dotLayer = el("g", {}), noteLayer = el("g", {});
  // annotation: a flat bracket between the hero line's cheapest and priciest dots
  const note = el("g", { opacity: 0 }, noteLayer);
  const noteLine = el("line", { stroke: "var(--max)", "stroke-width": 1.6, "stroke-dasharray": "4 4" }, note);
  const noteTxt = el("text", { class: "gapnum", "text-anchor": "middle", fill: "var(--max)", "font-size": 13, "font-weight": 700 }, note);
  const ticks = [0, 1].map(() => el("line", { stroke: "var(--max)", "stroke-width": 1.6 }, note));

  let data = [], supply = "scarce", t0 = 0, started = false;
  const runs = {};      // key -> {g, c, from, to}
  const lines = {};     // user model -> path

  function target() {
    const rows = data.filter((r) => r.supply === supply && r.user === HERO);
    const users = [HERO];
    const want = {};
    rows.forEach((r) => (want[r.user + "|" + r.provider] = r));
    for (const k of new Set([...Object.keys(runs), ...Object.keys(want)])) {
      const r = want[k];
      if (!runs[k]) {
        const src = r || data.find((d) => d.user + "|" + d.provider === k);
        const g = el("g", {}, dotLayer);
        runs[k] = { g, c: el("circle", { r: 8, fill: FAM[src.fam], stroke: "#fff", "stroke-width": 1.5 }, g), cur: null,
                    lbl: el("text", { class: "lbl" }, g) };
        runs[k].lbl.textContent = src.provider;
      }
      const R = runs[k];
      R.to = r ? { x: X(r.cost), y: Y(r.rp), a: 1 } : { ...(R.cur || { x: 0, y: 0 }), a: 0 };
      R.from = R.cur ? { ...R.cur } : { x: R.to.x, y: Y(0), a: 0 };     // first time: rise from the axis
      R.hero = r && r.user === HERO;
      R.r = r;
    }
    users.forEach((u) => { if (false) lines[u] = el("path", { fill: "none", stroke: u === HERO ? "var(--max)" : "#d9d6e3", "stroke-width": u === HERO ? 2.4 : 1.5 }, lineLayer); });
    t0 = performance.now();
    document.querySelector(".tok-caption").innerHTML = CAPTION[supply];
    document.querySelector(".tok-mult").textContent = MULT[supply];
    document.querySelectorAll("[data-tsupply]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tsupply === supply ? "true" : "false"));
  }

  function render(now) {
    const e = reduce ? 1 : ease(clamp01((now - t0) / 1100));
    // dots (staggered by cost on first appearance)
    const keys = Object.keys(runs);
    for (const k of keys) {
      const R = runs[k];
      const lag = started ? 0 : 0;
      const L = (q) => R.from[q] + (R.to[q] - R.from[q]) * e;
      R.cur = { x: L("x"), y: L("y"), a: L("a") };
      R.c.setAttribute("cx", R.cur.x.toFixed(1)); R.c.setAttribute("cy", R.cur.y.toFixed(1));
      R.g.setAttribute("opacity", R.cur.a.toFixed(3));
      const P = LBL[k.split("|")[1]] || [0, 24, "middle"];
      R.lbl.setAttribute("x", (R.cur.x + P[0]).toFixed(1)); R.lbl.setAttribute("y", (R.cur.y + P[1]).toFixed(1));
      R.lbl.setAttribute("text-anchor", P[2]);
      if (R.r) R.c.setAttribute("aria-label", `${R.r.user} users, ${R.r.provider} provider agent: $${R.r.cost.toFixed(2)} per task, provider reward ${R.r.rp.toFixed(2)}`);
    }
    // lines joining runs of the same user model, in cost order
    for (const u in lines) {
      const pts = keys.filter((k) => k.startsWith(u + "|") && runs[k].cur.a > 0.5).map((k) => runs[k].cur).sort((a, b) => a.x - b.x);
      lines[u].setAttribute("d", pts.length > 1 ? "M" + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L") : "");
      lines[u].setAttribute("opacity", e.toFixed(2));
    }
    // the note: the cheap and the pricey provider agent earn the same reward
    const cheap = runs[HERO + "|" + CHEAP], pricey = runs[HERO + "|" + PRICEY];
    if (cheap && pricey && cheap.cur && pricey.cur) {
      const y = Y(0.47);
      noteLine.setAttribute("x1", cheap.cur.x); noteLine.setAttribute("x2", pricey.cur.x);
      noteLine.setAttribute("y1", y); noteLine.setAttribute("y2", y);
      noteTxt.setAttribute("x", (cheap.cur.x + pricey.cur.x) / 2); noteTxt.setAttribute("y", y - 8);
      noteTxt.textContent = `${MULT[supply]} the cost, same reward`;
      note.setAttribute("opacity", clamp01((now - t0 - 900) / 500).toFixed(2));
      ticks.forEach((tk, i) => { const R = i ? pricey : cheap; tk.setAttribute("x1", R.cur.x); tk.setAttribute("x2", R.cur.x); tk.setAttribute("y1", y); tk.setAttribute("y2", y + 7); });
    }
    requestAnimationFrame(render);
  }

  document.querySelectorAll("[data-tsupply]").forEach((b) => b.addEventListener("click", () => { supply = b.dataset.tsupply; target(); }));

  fetch("assets/tokenomics.json?v=1794413565").then((r) => r.json()).then((d) => {
    data = d;
    const q = new URLSearchParams(location.search).get("tsupply");
    if (q) supply = q;
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { started = true; target(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(svg);
    requestAnimationFrame(render);
  });
})();
