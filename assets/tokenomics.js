// "Does a pricier airline agent help?" For a fixed travellers' model, each airline model is a vertical bar at its
// inference cost per task, from the airline's reward (square) to the travellers' reward (dot).
// Switching travellers' model or supply glides the bars; the x axis is shared, so scarce -> plenty shows costs halving.
(function () {
  const svg = document.querySelector(".tokplot");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const FAM = { OpenAI: "var(--openai)", Google: "var(--google)", Anthropic: "var(--anthropic)" };
  const USERS = ["GPT-6 Astra", "Claude Opus 5.5", "Gemini 3.8 Flash", "GPT-5.4"];
  const CAPTION = {
    "GPT-6 Astra": "Both Gemini Flash airline agents beat Claude Opus 5 on <b>both</b> rewards, at under a third of its cost, with either supply.",
    "Claude Opus 5.5": "Opus airline agents earn more for the airline but leave travellers less happy than Gemini Flash, at 1.5–1.9× the cost.",
    "Gemini 3.8 Flash": "Gemini Flash airline agents come close to GPT-6 Astra on both rewards at a quarter of the cost or less.",
    "GPT-5.4": "The cheapest airline agent, Gemini 3.7 Flash, gives travellers the best reward with either supply, and the airline too when seats are scarce.",
  };
  const W = 640, H = 430, M = { l: 58, r: 24, t: 20, b: 58 }, XMAX = 6;
  const X = (c) => M.l + (c / XMAX) * (W - M.l - M.r);
  const Y = (v) => H - M.b - v * (H - M.t - M.b);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };

  for (let c = 0; c <= XMAX; c++) {
    el("line", { class: "grid", x1: X(c), x2: X(c), y1: Y(0), y2: Y(1) });
    el("text", { class: "tick", x: X(c), y: Y(0) + 20, "text-anchor": "middle" }).textContent = `$${c}`;
  }
  for (let v = 0; v <= 1.0001; v += 0.2) {
    el("line", { class: "grid", x1: X(0), x2: X(XMAX), y1: Y(v), y2: Y(v) });
    el("text", { class: "tick", x: X(0) - 10, y: Y(v) + 4, "text-anchor": "end" }).textContent = v.toFixed(1);
  }
  el("line", { class: "axis", x1: X(0), x2: X(XMAX), y1: Y(0), y2: Y(0) });
  el("line", { class: "axis", x1: X(0), x2: X(0), y1: Y(0), y2: Y(1) });
  el("text", { class: "alabel", x: (X(0) + X(XMAX)) / 2, y: H - 14, "text-anchor": "middle" }).textContent = "Airline agent's inference cost per task →";
  el("text", { class: "alabel", transform: `translate(16 ${(Y(0) + Y(1)) / 2}) rotate(-90)`, "text-anchor": "middle" }).textContent = "Mean reward";
  el("text", { class: "corner", x: X(0) + 6, y: Y(1) + 14 }).textContent = "↖ cheap and good";
  const layer = el("g", {});

  let data = [], user = USERS[0], supply = "scarce";
  const bars = {};             // provider -> {g, line, dot, sq, lbl, from, to, t0}

  function bar(name, fam) {
    const g = el("g", {}, layer), c = FAM[fam];
    const b = {
      g,
      line: el("line", { stroke: c, "stroke-width": 3, "stroke-linecap": "round", opacity: 0.45 }, g),
      sq: el("rect", { width: 11, height: 11, x: -5.5, y: -5.5, rx: 2, fill: "#fff", stroke: c, "stroke-width": 2.4 }, g),
      dot: el("circle", { r: 7.5, fill: c }, g),
      lbl: el("text", { class: "lbl" }, g),
      cur: { x: 0, yu: 0, yp: 0, a: 0, lx: 12 }, from: null, to: null, t0: 0,
    };
    b.lbl.textContent = name;
    return b;
  }

  function target() {
    const rows = data.filter((r) => r.user === user && r.supply === supply).sort((a, b) => a.cost - b.cost);
    const want = {};
    rows.forEach((r) => {
      want[r.provider] = { x: X(r.cost), yu: Y(r.ru), yp: Y(r.rp), a: 1, r };
      if (!bars[r.provider]) bars[r.provider] = bar(r.provider, r.fam);
    });
    // label placement: first candidate that hits no dot, bar or earlier label and stays inside the plot
    const obstacles = rows.flatMap((r) => [[X(r.cost) - 9, Y(r.ru) - 9, 18, 18], [X(r.cost) - 8, Y(r.rp) - 8, 16, 16],
                                          [X(r.cost) - 3, Y(r.ru), 6, Y(r.rp) - Y(r.ru)]]).concat([[X(0), Y(1), 120, 20]]);
    const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    rows.forEach((r) => {
      const w = want[r.provider], tw = bars[r.provider].lbl.getComputedTextLength() || r.provider.length * 7;
      const cands = [
        { x: w.x + 13, y: w.yu - 10, anchor: "start" }, { x: w.x - 13, y: w.yu - 10, anchor: "end" },
        { x: w.x + 13, y: w.yu - 26, anchor: "start" }, { x: w.x - 13, y: w.yu - 26, anchor: "end" },
        { x: w.x + 13, y: w.yu - 42, anchor: "start" }, { x: w.x - 13, y: w.yu - 42, anchor: "end" },
        { x: w.x, y: w.yp + 24, anchor: "middle" }, { x: w.x + 13, y: w.yp + 4, anchor: "start" },
        { x: w.x - 13, y: w.yp + 4, anchor: "end" }, { x: w.x, y: w.yp + 40, anchor: "middle" },
      ];
      const box = (c) => [c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - tw : c.x - tw / 2, c.y - 12, tw, 16];
      const pick = cands.find((c) => { const b = box(c); return b[0] > X(0) + 4 && b[0] + b[2] < W - 2 && !obstacles.some((o) => hit(b, o)); }) || cands[0];
      obstacles.push(box(pick));
      w.lbl = pick;
    });
    const now = performance.now();
    for (const name in bars) {
      const b = bars[name], w = want[name];
      b.from = { ...b.cur };
      b.to = w ? { x: w.x, yu: w.yu, yp: w.yp, a: 1 } : { ...b.cur, a: 0 };
      if (w && b.cur.a < 0.05) b.from = { x: w.x, yu: Y(0), yp: Y(0), a: 0 };   // new bars grow from the axis
      b.lblTo = w ? w.lbl : b.lblTo;
      b.r = w ? w.r : b.r;
      b.t0 = now;
    }
    document.querySelector(".tok-caption").innerHTML = `<b>${user} travellers.</b> ${CAPTION[user]}`;
    document.querySelector(".tok-user-name").textContent = user;
  }

  function render(now) {
    for (const name in bars) {
      const b = bars[name];
      if (!b.to) continue;
      const e = reduce ? 1 : ease(Math.min(Math.max((now - b.t0) / 1100, 0), 1));
      const L = (k) => b.from[k] + (b.to[k] - b.from[k]) * e;
      b.cur = { x: L("x"), yu: L("yu"), yp: L("yp"), a: L("a") };
      const { x, yu, yp, a } = b.cur;
      b.g.setAttribute("opacity", a.toFixed(3));
      b.g.style.display = a < 0.01 ? "none" : "";
      b.line.setAttribute("x1", x); b.line.setAttribute("x2", x);
      b.line.setAttribute("y1", yp); b.line.setAttribute("y2", yu);
      b.sq.setAttribute("transform", `translate(${x.toFixed(1)} ${yp.toFixed(1)})`);
      b.dot.setAttribute("cx", x); b.dot.setAttribute("cy", yu);
      if (b.lblTo) {               // label keeps its offset from the moving bar
        const L0 = b.lblTo, dx = L0.x - b.to.x, onSq = L0.y > b.to.yu + 30, dy = onSq ? L0.y - b.to.yp : L0.y - b.to.yu;
        const base = onSq ? yp : yu;
        b.lbl.setAttribute("x", (x + dx).toFixed(1)); b.lbl.setAttribute("y", (base + dy).toFixed(1));
        b.lbl.setAttribute("text-anchor", L0.anchor);
      }
      if (b.r) b.dot.setAttribute("aria-label", `${name}: $${b.r.cost.toFixed(2)} per task, travellers ${b.r.ru.toFixed(2)}, airline ${b.r.rp.toFixed(2)}`);
    }
    requestAnimationFrame(render);
  }

  // controls
  const userSeg = document.querySelector(".tok-user");
  USERS.forEach((u) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = u; btn.dataset.u = u;
    btn.setAttribute("aria-pressed", u === user ? "true" : "false");
    btn.addEventListener("click", () => {
      user = u;
      userSeg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === btn ? "true" : "false"));
      target();
    });
    userSeg.appendChild(btn);
  });
  document.querySelectorAll("[data-tsupply]").forEach((btn) => btn.addEventListener("click", () => {
    supply = btn.dataset.tsupply;
    document.querySelectorAll("[data-tsupply]").forEach((x) => x.setAttribute("aria-pressed", x === btn ? "true" : "false"));
    target();
  }));

  fetch("assets/tokenomics.json").then((r) => r.json()).then((d) => {
    data = d;
    const q = new URLSearchParams(location.search);
    if (q.get("tuser")) user = q.get("tuser");
    userSeg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.u === user ? "true" : "false"));
    if (q.get("tsupply")) supply = q.get("tsupply");
    document.querySelectorAll("[data-tsupply]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.tsupply === supply ? "true" : "false"));
    // bars grow in the first time the chart scrolls into view
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { target(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(svg);
    requestAnimationFrame(render);
  });
})();
