// "Does a pricier provider agent help?" x = provider agent's inference cost per task, y = provider or user reward.
// Pick the users' model, the supply and which reward to show. Each dot is the model behind the provider agent;
// a bracket compares the cheapest and the priciest provider agent. Dots glide between selections.
(function () {
  const svg = document.querySelector(".tokplot");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const FAM = { OpenAI: "var(--openai)", Google: "var(--google)", Anthropic: "var(--anthropic)" };
  const USERS = ["GPT-6 Astra", "Claude Opus 5.5", "Gemini 3.8 Flash", "GPT-5.4"];
  const W = 640, H = 400, M = { l: 58, r: 24, t: 20, b: 52 }, XMAX = 6, YMAX = 1;
  const X = (c) => M.l + (c / XMAX) * (W - M.l - M.r);
  const Y = (v) => H - M.b - (v / YMAX) * (H - M.t - M.b);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };
  const $ = (n) => `$${n.toFixed(2)}`;

  for (let c = 0; c <= XMAX; c++) {
    el("line", { class: "grid", x1: X(c), x2: X(c), y1: Y(0), y2: Y(YMAX) });
    el("text", { class: "tick", x: X(c), y: Y(0) + 20, "text-anchor": "middle" }).textContent = `$${c}`;
  }
  for (let v = 0; v <= YMAX + 1e-9; v += 0.2) {
    el("line", { class: "grid", x1: X(0), x2: X(XMAX), y1: Y(v), y2: Y(v) });
    el("text", { class: "tick", x: X(0) - 10, y: Y(v) + 4, "text-anchor": "end" }).textContent = v.toFixed(1);
  }
  el("line", { class: "axis", x1: X(0), x2: X(XMAX), y1: Y(0), y2: Y(0) });
  el("line", { class: "axis", x1: X(0), x2: X(0), y1: Y(0), y2: Y(YMAX) });
  el("text", { class: "alabel", x: (X(0) + X(XMAX)) / 2, y: H - 10, "text-anchor": "middle" }).textContent = "Provider inference cost per task";
  const yTitle = el("text", { class: "alabel", transform: `translate(16 ${(Y(0) + Y(YMAX)) / 2}) rotate(-90)`, "text-anchor": "middle" });
  const dotLayer = el("g", {}), noteLayer = el("g", {});
  // bracket from the cheapest to the priciest provider agent
  const note = el("g", { opacity: 0 }, noteLayer);
  const noteLine = el("line", { stroke: "var(--max)", "stroke-width": 1.6, "stroke-dasharray": "4 4" }, note);
  const noteTxt = el("text", { "text-anchor": "middle", fill: "var(--max)", "font-size": 13, "font-weight": 700, "font-family": "var(--sans)" }, note);
  const caps = [0, 1].map(() => el("line", { stroke: "var(--max)", "stroke-width": 1.6 }, note));

  let data = [], user = USERS[0], supply = "scarce", metric = "rp", t0 = 0;   // metric: rp = provider reward, ru = user reward
  const runs = {};      // provider model -> {g, c, lbl, from, to, cur, lblTo}
  let pair = null;      // {cheap, pricey} provider names for the bracket

  function target() {
    const rows = data.filter((r) => r.supply === supply && r.user === user).sort((a, b) => a.cost - b.cost);
    const want = {};
    rows.forEach((r) => (want[r.provider] = r));
    // label placement: first spot (above, below, right, left) that hits no dot, no earlier label and stays inside
    const pts = rows.map((r) => [X(r.cost), Y(r[metric])]);
    const boxes = pts.map(([x, y]) => [x - 10, y - 10, 20, 20]);
    const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    const place = {};
    rows.forEach((r, i) => {
      if (!runs[r.provider]) {
        const g = el("g", {}, dotLayer);
        const R = runs[r.provider] = { g, c: el("circle", { r: 8, fill: FAM[r.fam], stroke: "#fff", "stroke-width": 1.5 }, g), lbl: el("text", { class: "lbl" }, g), cur: null };
        R.lbl.textContent = r.provider;
      }
      const tw = runs[r.provider].lbl.getComputedTextLength() || r.provider.length * 7;
      const [x, y] = pts[i];
      const cands = [[0, -14, "middle"], [0, 26, "middle"], [13, 5, "start"], [-13, 5, "end"], [0, -30, "middle"], [0, 42, "middle"]];
      const box = ([dx, dy, a]) => [a === "start" ? x + dx : a === "end" ? x + dx - tw : x + dx - tw / 2, y + dy - 12, tw, 16];
      const ok = (c) => { const b = box(c); return b[0] > X(0) + 2 && b[0] + b[2] < W - 2 && b[1] > 2 && !boxes.some((o) => hit(b, o)); };
      const pick = cands.find(ok) || cands[0];
      boxes.push(box(pick));
      place[r.provider] = pick;
    });
    for (const name in runs) {
      const R = runs[name], r = want[name];
      R.to = r ? { x: X(r.cost), y: Y(r[metric]), a: 1 } : { ...(R.cur || { x: 0, y: 0 }), a: 0 };
      R.from = R.cur && R.cur.a > 0.02 ? { ...R.cur } : { x: R.to.x, y: Y(0), a: 0 };     // (re)appearing dots rise from the axis
      if (r) { R.lblTo = place[name]; R.r = r; }
    }
    t0 = performance.now();
    // words: cheapest vs priciest provider agent for this selection
    const cheap = rows[0], pricey = rows[rows.length - 1];
    pair = { cheap: cheap.provider, pricey: pricey.provider };
    const who = metric === "rp" ? "providers" : "users", d = pricey[metric] - cheap[metric];
    const same = Math.abs(d) < 0.03 ? "about the same" : d < 0 ? "less" : "a little more";
    pair.text = `${(pricey.cost / cheap.cost).toFixed(1).replace(/\.0$/, "")}× the cost, ${same === "a little more" ? "+" + d.toFixed(2) : same} reward`;
    document.querySelector(".tok-mult").textContent = `${(pricey.cost / cheap.cost).toFixed(1).replace(/\.0$/, "")}×`;
    document.querySelector(".tok-mult-sub").textContent = `the inference cost of the cheapest provider agent, for ${same === "less" ? "less" : same} ${metric === "rp" ? "provider" : "user"} reward`;
    document.querySelector(".tok-caption").innerHTML =
      `With <b>${user}</b> users, the priciest provider agent, <b>${pricey.provider}</b>, costs <b>${$(pricey.cost)}</b> per task and gets ${who} ` +
      `<b>${pricey[metric].toFixed(2)}</b>. The cheapest, <b>${cheap.provider}</b>, costs <b>${$(cheap.cost)}</b> and gets <b>${cheap[metric].toFixed(2)}</b>.`;
    yTitle.textContent = metric === "rp" ? "Provider reward" : "User reward";
    const sync = (attr, v) => document.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute("aria-pressed", b.getAttribute(attr) === v ? "true" : "false"));
    sync("data-tsupply", supply); sync("data-tmetric", metric); sel.value = user;
  }

  function render(now) {
    const e = reduce ? 1 : ease(clamp01((now - t0) / 1100));
    for (const name in runs) {
      const R = runs[name];
      if (!R.to) continue;
      const L = (q) => R.from[q] + (R.to[q] - R.from[q]) * e;
      R.cur = { x: L("x"), y: L("y"), a: L("a") };
      R.c.setAttribute("cx", R.cur.x.toFixed(1)); R.c.setAttribute("cy", R.cur.y.toFixed(1));
      R.g.setAttribute("opacity", R.cur.a.toFixed(3));
      R.g.style.display = R.cur.a < 0.01 ? "none" : "";
      const P = R.lblTo || [0, -14, "middle"];
      R.lbl.setAttribute("x", (R.cur.x + P[0]).toFixed(1)); R.lbl.setAttribute("y", (R.cur.y + P[1]).toFixed(1));
      R.lbl.setAttribute("text-anchor", P[2]);
      if (R.r) R.c.setAttribute("aria-label", `${R.r.provider} provider agent: ${$(R.r.cost)} per task, provider reward ${R.r.rp.toFixed(2)}, user reward ${R.r.ru.toFixed(2)}`);
    }
    if (pair && runs[pair.cheap] && runs[pair.pricey] && runs[pair.cheap].cur) {
      const a = runs[pair.cheap].cur, b = runs[pair.pricey].cur;
      const y = Math.max(Math.min(a.y, b.y) - 44, 18);
      noteLine.setAttribute("x1", a.x); noteLine.setAttribute("x2", b.x); noteLine.setAttribute("y1", y); noteLine.setAttribute("y2", y);
      caps.forEach((c, i) => { const p = i ? b : a; c.setAttribute("x1", p.x); c.setAttribute("x2", p.x); c.setAttribute("y1", y); c.setAttribute("y2", y + 7); });
      noteTxt.textContent = pair.text;
      const half = (noteTxt.getComputedTextLength() || 160) / 2;      // keep the note inside the plot
      noteTxt.setAttribute("x", Math.min(Math.max((a.x + b.x) / 2, X(0) + half + 4), W - half - 4)); noteTxt.setAttribute("y", y - 8);
      note.setAttribute("opacity", clamp01((now - t0 - 900) / 500).toFixed(2));
    }
    requestAnimationFrame(render);
  }

  // controls
  const sel = document.querySelector(".tok-user");
  USERS.forEach((u) => { const o = document.createElement("option"); o.value = o.textContent = u; sel.appendChild(o); });
  sel.addEventListener("change", () => { user = sel.value; target(); });
  document.querySelectorAll("[data-tsupply]").forEach((b) => b.addEventListener("click", () => { supply = b.dataset.tsupply; target(); }));
  document.querySelectorAll("[data-tmetric]").forEach((b) => b.addEventListener("click", () => { metric = b.dataset.tmetric; target(); }));

  fetch("assets/tokenomics.json?v=1794417429").then((r) => r.json()).then((d) => {
    data = d;
    const q = new URLSearchParams(location.search);
    if (q.get("tsupply")) supply = q.get("tsupply");
    if (q.get("tuser")) user = q.get("tuser");
    if (q.get("tmetric")) metric = q.get("tmetric");
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { target(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(svg);
    requestAnimationFrame(render);
  });
})();
