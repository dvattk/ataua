// The main chart: mean provider reward (x) vs mean user reward (y), with the paper's MAX reference line.
// Two short videos (scarce supply, abundant supply) that play by themselves while on screen; named buttons switch.
// Every change is tweened, so jumping back and forth animates smoothly.
(function () {
  const svg = document.querySelector(".pareto");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const FAM = { OpenAI: "var(--openai)", Google: "var(--google)", Anthropic: "var(--anthropic)" };
  const W = 640, H = 560, M = { l: 66, r: 26, t: 26, b: 66 };
  const X = (p) => M.l + p * (W - M.l - M.r);          // provider reward -> px
  const Y = (u) => H - M.b - u * (H - M.t - M.b);      // user reward -> px
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  // label side per symmetric model and supply (avoids overlaps)
  // scarce: label beside its dot (left unless listed). abundant: the dots bunch up, so labels sit in a
  // column on the empty left side (at these user-reward heights) with a thin leader line.
  const RIGHT = { "Claude Opus 5.5": true };
  const SLOT = { "GPT-6 Astra": 0.985, "Gemini 3.8 Flash": 0.93, "Claude Opus 5.5": 0.875, "Claude Sonnet 5.5": 0.82, "GPT-5.4": 0.765 };
  const COL_X = 0.21;
  const HERO = "GPT-6 Astra";                 // the gap we spell out

  // ---------------------------------------------------------------- tweens
  const tw = {};
  function set(name, to, dur = 900, delay = 0) {
    const now = performance.now();
    const cur = get(name, now);
    if (tw[name] && tw[name].to === to) return;
    tw[name] = { from: cur, to, start: now + (reduce ? 0 : delay), dur: reduce ? 1 : dur };
  }
  function get(name, now) {
    const t = tw[name];
    if (!t) return 0;
    return lerp(t.from, t.to, ease(clamp01((now - t.start) / t.dur)));
  }

  // ---------------------------------------------------------------- static frame
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  for (let v = 0; v <= 1.0001; v += 0.2) {
    el("line", { class: "grid", x1: X(v), x2: X(v), y1: Y(0), y2: Y(1) });
    el("line", { class: "grid", x1: X(0), x2: X(1), y1: Y(v), y2: Y(v) });
    el("text", { class: "tick", x: X(v), y: Y(0) + 20, "text-anchor": "middle" }).textContent = v.toFixed(1);
    el("text", { class: "tick", x: X(0) - 10, y: Y(v) + 4, "text-anchor": "end" }).textContent = v.toFixed(1);
  }
  el("line", { class: "axis", x1: X(0), x2: X(1), y1: Y(0), y2: Y(0) });
  el("line", { class: "axis", x1: X(0), x2: X(0), y1: Y(0), y2: Y(1) });
  el("text", { class: "alabel", x: (X(0) + X(1)) / 2, y: H - 18, "text-anchor": "middle" }).textContent = "Provider reward";
  el("text", { class: "alabel", transform: `translate(18 ${(Y(0) + Y(1)) / 2}) rotate(-90)`, "text-anchor": "middle" }).textContent = "User reward";
  el("text", { class: "corner", x: X(1) - 4, y: Y(1) + 16, "text-anchor": "end" }).textContent = "both sides happy ↗";

  const region = el("path", { class: "gaparea" });
  const defs = el("defs", {});
  const mask = el("mask", { id: "max-reveal", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
  const maskPath = el("path", { fill: "none", stroke: "#fff", "stroke-width": 14, "stroke-linecap": "round" }, mask);
  const maxLine = el("path", { class: "max", mask: "url(#max-reveal)" });
  const maxLbl = el("text", { class: "maxlbl", "text-anchor": "start" });
  maxLbl.textContent = "MAX";
  const gapLayer = el("g", {});
  const dotLayer = el("g", {});
  const lblLayer = el("g", {});
  const tip = el("g", { class: "tip", visibility: "hidden" });
  const tipRect = el("rect", { rx: 6 }, tip);
  const tipText = el("text", {}, tip);

  // ---------------------------------------------------------------- data
  let D, items = [];
  function curve(s) {
    // MAX anchors for the current supply mix, ordered by lambda (0 = all provider ... 1 = all user)
    const a = D.max.scarce, b = D.max.abundant;
    return a.map((p, i) => ({ u: lerp(p.u, b[i].u, s), p: lerp(p.p, b[i].p, s) }));
  }
  function maxPAt(u, c) {
    const A = [...c].sort((x, y) => x.u - y.u);
    for (let i = 0; i < A.length - 1; i++)
      if (A[i].u <= u && u <= A[i + 1].u) return lerp(A[i].p, A[i + 1].p, (u - A[i].u) / (A[i + 1].u - A[i].u || 1));
    return null;
  }

  function build() {
    const byId = {};
    for (const p of D.points) (byId[p.id] = byId[p.id] || { ...p, at: {} }).at[p.supply] = { u: p.u, p: p.p };
    items = Object.values(byId);
    // symmetric first, ordered for a nice drop-in sequence (by user reward, low to high)
    items.sort((a, b) => (b.sym - a.sym) || ((a.at.scarce || a.at.abundant).u - (b.at.scarce || b.at.abundant).u));
    let si = 0, ai = 0;
    for (const it of items) {
      it.idx = it.sym ? si++ : ai++;
      it.g = el("g", { class: "pt" }, dotLayer);
      const c = FAM[it.fam];
      it.c = el("circle", { r: it.sym ? 8 : 6.5, fill: it.sym ? c : "#fff", stroke: c, "stroke-width": it.sym ? 0 : 2.4, tabindex: 0 }, it.g);
      if (it.sym) {
        it.lead = el("line", { stroke: "#b9b9c6", "stroke-width": 1 }, lblLayer);
        it.lbl = el("text", { class: "lbl", "text-anchor": "start" }, lblLayer);
        it.lbl.textContent = it.user;
        it.w = it.lbl.getComputedTextLength();
      }
      it.c.setAttribute("aria-label", `${it.user} travelers, ${it.provider} airlines`);
      const show = () => showTip(it);
      it.c.addEventListener("mouseenter", show);
      it.c.addEventListener("focus", show);
      it.c.addEventListener("click", show);
      it.c.addEventListener("mouseleave", hideTip);
      it.c.addEventListener("blur", hideTip);
      if (it.sym) {
        it.gap = el("line", { class: "gap" + (it.user === HERO ? " hero" : "") }, gapLayer);
        if (it.user === HERO) it.num = el("text", { class: "gapnum", "text-anchor": "middle" }, gapLayer);
      }
    }
  }

  let tipFor = null;
  function showTip(it) { tipFor = it; tip.setAttribute("visibility", "visible"); }
  function hideTip() { tipFor = null; tip.setAttribute("visibility", "hidden"); }

  // ---------------------------------------------------------------- render
  function render(now) {
    const s = get("supply", now);
    const c = curve(s);
    // MAX line
    const pts = c.map((q) => `${X(q.p).toFixed(1)},${Y(q.u).toFixed(1)}`);
    const d = "M" + pts.join(" L");
    maxLine.setAttribute("d", d);
    maskPath.setAttribute("d", d);
    const len = maskPath.getTotalLength();
    const draw = get("draw", now);
    maskPath.setAttribute("stroke-dasharray", `${len} ${len}`);
    maskPath.setAttribute("stroke-dashoffset", (len * (1 - draw)).toFixed(1));
    const top = c[c.length - 1];
    maxLine.style.display = draw < 0.005 ? "none" : "";
    maxLbl.setAttribute("x", X(top.p) - 6);
    maxLbl.setAttribute("y", Y(top.u) - 12);
    maxLbl.setAttribute("opacity", clamp01(draw * 3 - 2).toFixed(2));
    // attainable region under the line
    const reg = get("region", now);
    region.setAttribute("d", `M${X(0)},${Y(0)} L${X(0)},${Y(top.u)} L` + [...pts].reverse().join(" L") + ` L${X(c[0].p)},${Y(0)} Z`);
    region.setAttribute("opacity", reg.toFixed(2));

    const gapT = get("gap", now), dim = 1 - 0.65 * get("asymAll", now);
    for (const it of items) {
      const a = it.at.scarce, b = it.at.abundant;
      let pos, pres;
      if (a && b) { pos = { u: lerp(a.u, b.u, s), p: lerp(a.p, b.p, s) }; pres = 1; }
      else if (a) { pos = a; pres = 1 - s; }
      else { pos = b; pres = s; }
      const vis = get((it.sym ? "sym" : "asym") + it.idx, now) * pres;
      const x = X(pos.p), y = Y(pos.u);
      it.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      it.g.setAttribute("opacity", vis.toFixed(3));
      it.g.style.display = vis < 0.01 ? "none" : "";
      const sc = 0.4 + 0.6 * vis;
      it.c.setAttribute("transform", `scale(${sc.toFixed(3)})`);
      if (it.lbl) {
        const w = it.w;
        const ax = RIGHT[it.user] ? x + 13 : x - 13 - w, ay = y + 4.5;      // beside the dot
        const bx = X(COL_X) - w, by = Y(SLOT[it.user]) + 4.5;               // left column
        const lx = lerp(ax, bx, s), ly = lerp(ay, by, s);
        it.lbl.setAttribute("x", lx.toFixed(1)); it.lbl.setAttribute("y", ly.toFixed(1));
        it.lbl.setAttribute("opacity", vis.toFixed(3));
        it.lbl.style.display = vis < 0.01 ? "none" : "";
        it.lead.setAttribute("x1", (lx + w + 4).toFixed(1)); it.lead.setAttribute("y1", (ly - 4.5).toFixed(1));
        it.lead.setAttribute("x2", (x - 9).toFixed(1)); it.lead.setAttribute("y2", y.toFixed(1));
        it.lead.setAttribute("opacity", (vis * clamp01(s * 2 - 0.6)).toFixed(3));
      }
      if (it.gap) {
        const m = maxPAt(pos.u, c);
        const gv = gapT * vis;
        if (m === null || gv < 0.01) { it.gap.setAttribute("opacity", 0); if (it.num) it.num.setAttribute("opacity", 0); continue; }
        const x2 = lerp(x + 9, X(m), gapT);
        it.gap.setAttribute("x1", x + 9); it.gap.setAttribute("x2", x2);
        it.gap.setAttribute("y1", y); it.gap.setAttribute("y2", y);
        it.gap.setAttribute("opacity", (gv * (it.num ? 1 : dim)).toFixed(2));
        if (it.num) {
          it.num.textContent = `${pos.p.toFixed(2)} → ${m.toFixed(2)}`;
          it.num.setAttribute("x", (x + X(m)) / 2 + 8);
          it.num.setAttribute("y", y - 10);
          it.num.setAttribute("opacity", clamp01(gapT * 2 - 1).toFixed(2));
        }
      }
    }
    if (tipFor) {
      const it = tipFor, q = (s < 0.5 ? it.at.scarce : it.at.abundant) || it.at.scarce || it.at.abundant;
      tipText.textContent = it.sym ? `${it.user} on both sides · user ${q.u.toFixed(2)}, provider ${q.p.toFixed(2)}`
        : `${it.user} travelers, ${it.provider} airlines · ${q.u.toFixed(2)} / ${q.p.toFixed(2)}`;
      const bb = tipText.getBBox();
      const tr = it.g.getAttribute("transform").match(/[-\d.]+/g).map(Number);
      let tx = tr[0] + 14, ty = tr[1] - 22;
      if (tx + bb.width + 16 > W) tx = tr[0] - bb.width - 30;
      tipText.setAttribute("x", tx + 8); tipText.setAttribute("y", ty + 4);
      tipRect.setAttribute("x", tx); tipRect.setAttribute("y", ty - 12);
      tipRect.setAttribute("width", bb.width + 16); tipRect.setAttribute("height", 24);
    }
  }

  // ---------------------------------------------------------------- two videos: scarce supply and abundant supply
  // Each plays 4 steps by itself while on screen and loops; the named buttons switch video (restarts at step 1).
  let step = 0, seen = false, video = "scarce";    // seen: dots drop in the moment the chart is first on screen
  const allSteps = [...document.querySelectorAll(".story .step")];
  const N = 2;
  const box = document.querySelector(".story .chart-box");
  const supBtns = [...box.querySelectorAll("[data-supply]")];
  const HOLD = [9000, 10000];          // ms on each step (slow enough to read)

  function apply() {
    set("draw", step >= 1 ? 1 : 0, 1400, 1200);          // dots land first, then MAX draws
    set("region", step >= 1 ? 1 : 0, 600, 2400);
    for (const it of items) {
      if (it.sym) set("sym" + it.idx, seen ? 1 : 0, 600, it.idx * 50);
      else set("asym" + it.idx, step >= 2 ? 1 : 0, 600, step >= 2 ? 2600 + it.idx * 40 : 0);
    }
    set("asymAll", step >= 2 ? 1 : 0, 600, step >= 2 ? 2600 : 0);
    set("gap", step >= 2 ? 1 : 0, 1000, step >= 2 ? 300 : 0);
    set("supply", video === "abundant" ? 1 : 0, 900);
    supBtns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.supply === video ? "true" : "false"));
    allSteps.forEach((s) => s.classList.toggle("active", s.dataset.video === video && +s.dataset.step === step));
  }
  function go(n) {
    n = Math.min(Math.max(n, 1), N);
    if (n !== step) { step = n; apply(); }
  }

  // clock: advances only while playing and on screen; loops back to step 1 after the last one
  let elapsed = 0, playing = false, visible = false, userPaused = false, last = null;
  function clock(now) {
    if (playing && visible && last !== null) {
      elapsed += now - last;
      if (elapsed >= HOLD[step - 1]) { elapsed = 0; go(step === N ? 1 : step + 1); }
    }
    last = now;
    requestAnimationFrame(clock);
  }
  function setPlaying(on) {
    playing = on; box.classList.toggle("playing", on);
  }
  supBtns.forEach((b) => b.addEventListener("click", () => {
    video = b.dataset.supply; step = 0; elapsed = 0; go(1); userPaused = false; setPlaying(true);
  }));
  box.querySelector(".pareto").addEventListener("click", (e) => { if (e.target.tagName !== "circle") { userPaused = playing; setPlaying(!playing); } });
  new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; if (visible && !seen) { seen = true; apply(); } if (visible && !userPaused) setPlaying(true); }),
    { threshold: 0.2 }).observe(box);

  // ---------------------------------------------------------------- go
  fetch("assets/chart-data.json?v=1794416715").then((r) => r.json()).then((data) => {
    D = data;
    build();
    document.fonts && document.fonts.ready.then(() => items.forEach((it) => {
      if (!it.lbl) return;
      const d = it.lbl.style.display; it.lbl.style.display = "";
      it.w = it.lbl.getComputedTextLength(); it.lbl.style.display = d;
    }));
    const q = new URLSearchParams(location.search).get("step");   // ?step=4 for screenshots
    go(q ? +q : 1);
    if (q || reduce) { seen = true; apply(); }
    if (q) { for (const k in tw) tw[k].start = -1e9; userPaused = true; }      // pinned: no auto-advance
    if (reduce) { go(N); userPaused = true; }
    requestAnimationFrame(clock);
    (function loop(now) { render(now); requestAnimationFrame(loop); })(performance.now());
  });
})();
