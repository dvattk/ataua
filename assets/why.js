// The two "why the gap" animations (keyframed, loop while on screen) and the BibTeX copy button.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = { ink: "#181825", muted: "#666674", line: "#e7e5ee", soft: "#f7f6fb", max: "#a3577b", a: "#3b7ff2", b: "#d9774e" };

  function el(parent, tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e);
    return e;
  }
  // keyframes: [[t, value], ...] -> eased value at time t (values are numbers or [x, y])
  function kf(frames, t) {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 0; i < frames.length - 1; i++) {
      const [t0, v0] = frames[i], [t1, v1] = frames[i + 1];
      if (t <= t1) {
        const e = ease(clamp01((t - t0) / (t1 - t0 || 1)));
        return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * e) : v0 + (v1 - v0) * e;
      }
    }
    return frames[frames.length - 1][1];
  }
  function box(g, x, y, w, h, title, sub) {
    el(g, "rect", { x, y, width: w, height: h, rx: 10, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
    el(g, "text", { x: x + 12, y: y + 22, "font-size": 13, "font-weight": 650, fill: C.ink }, title);
    if (sub) el(g, "text", { x: x + 12, y: y + 40, "font-size": 12, fill: C.muted }, sub);
  }
  function player(fig, duration, build) {
    const svg = fig.querySelector("svg");
    const draw = build(svg);
    let t0 = null, raf = 0, on = false;
    const frame = (now) => {
      if (t0 === null) t0 = now;
      draw(reduce ? duration - 1 : (now - t0) % duration);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!on) { on = true; t0 = null; raf = requestAnimationFrame(frame); } };
    const stop = () => { on = false; cancelAnimationFrame(raf); };
    fig.querySelector(".replay-mini").addEventListener("click", () => { t0 = null; start(); });
    draw(0);
    const wt = new URLSearchParams(location.search).get("wt");      // ?wt=3000 draws a fixed moment (testing)
    if (wt !== null) { draw(+wt % duration); return; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.4 }).observe(fig);
  }

  // ---------------------------------------------------------------- 1. competing for seats
  // Part 1 (what the agents did): A and B race for the same two Delta seats; A gets there first, B finds it sold
  // out and goes to United. Part 2 (coordinated): start over, A and B talk first, then A takes the later
  // Spirit/Delta option and B gets Delta. Bars show user and provider reward for each outcome.
  const seats = document.querySelector(".why-anim.seats");
  if (seats) player(seats, 13000, (svg) => {
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    const phase = el(g, "text", { x: 16, y: 22, "font-size": 12, "font-weight": 700, fill: C.max, "letter-spacing": ".06em" });
    // flights: one column on the right
    box(g, 300, 30, 204, 86, "Delta · Aug 2", "Houston → New York");
    const seatPos = [[432, 92], [470, 92]];
    const seatRects = seatPos.map(([x, y]) => el(g, "rect", { x: x - 15, y: y - 13, width: 30, height: 26, rx: 6, fill: "#fff", stroke: C.ink, "stroke-width": 1.5 }));
    const soldOut = el(g, "text", { x: 451, y: 48, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.max }, "sold out");
    box(g, 300, 128, 204, 62, "Spirit · Delta", "a day or two later");
    box(g, 300, 202, 204, 62, "United", "other dates · $1,631");
    // agents
    const agent = (x, y, name, col) => {
      el(g, "circle", { cx: x, cy: y, r: 18, fill: "#fff", stroke: col, "stroke-width": 2 });
      el(g, "text", { x, y: y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: col }, name);
      el(g, "text", { x, y: y + 34, "text-anchor": "middle", "font-size": 11, fill: C.muted }, "party of 2");
    };
    agent(52, 80, "A", C.a);
    agent(52, 200, "B", C.b);
    // A and B talking (part 2): a link between them with typing dots
    const talk = el(g, "g", {});
    el(talk, "line", { x1: 52, x2: 52, y1: 128, y2: 180, stroke: C.muted, "stroke-width": 1.5, "stroke-dasharray": "3 4" });
    el(talk, "rect", { x: 30, y: 142, width: 44, height: 24, rx: 12, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
    const typing = [42, 52, 62].map((x) => el(talk, "circle", { cx: x, cy: 154, r: 3, fill: C.muted }));
    // each party = two travelers
    const party = (col) => [0, 1].map(() => el(g, "circle", { r: 7, fill: col }));
    const A = party(C.a), B = party(C.b);
    // reward bars
    const bars = ["User reward", "Provider reward"].map((name, i) => {
      const y = 282 + i * 26;
      el(g, "text", { x: 16, y: y + 10, "font-size": 12, fill: C.ink }, name);
      el(g, "rect", { x: 130, y, width: 240, height: 12, rx: 6, fill: C.soft });
      const bar = el(g, "rect", { x: 130, y, height: 12, rx: 6, fill: C.max });
      const val = el(g, "text", { x: 380, y: y + 11, "font-size": 12, "font-family": "JetBrains Mono, monospace", fill: C.ink });
      return { bar, val };
    });
    const VAL = [[0.88, 0.93], [0.40, 0.93]];            // [what the agents did, coordinated]
    const HOME = { A: [100, 80], B: [100, 200] }, SPIRIT = [278, 159], UNITED = [278, 233], BLOCKED = [268, 92];
    const off = (p, i) => [p[0] + (i ? 9 : -9), p[1]];
    // paths go through the lane left of the flight boxes (x = 268) so dots never cross a box
    const KA = [[0, HOME.A], [400, HOME.A], [1800, "seat"], [6500, "seat"], [6501, HOME.A], [9300, HOME.A], [9900, [268, 166]], [10400, SPIRIT], [13000, SPIRIT]];
    const KB = [[0, HOME.B], [400, HOME.B], [2200, BLOCKED], [3000, BLOCKED], [3400, [268, 240]], [4000, UNITED], [6500, UNITED], [6501, HOME.B],
                [8900, HOME.B], [9500, [268, 92]], [10000, "seat"], [13000, "seat"]];
    const pos = (frames, i, t) => kf(frames.map(([tt, v]) => [tt, v === "seat" ? seatPos[i] : off(v, i)]), t);
    return (t) => {
      phase.textContent = t < 6500 ? "WHAT THE AGENTS DID" : "A COORDINATED ALLOCATION";
      const vis = kf([[0, 1], [6200, 1], [6450, 0], [6550, 0], [6900, 1]], t);     // parties blink back home between parts
      A.forEach((c, i) => { const [x, y] = pos(KA, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", vis); });
      B.forEach((c, i) => { const [x, y] = pos(KB, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", vis); });
      soldOut.setAttribute("opacity", kf([[0, 0], [2200, 0], [2500, 1], [6200, 1], [6450, 0]], t));
      seatRects.forEach((r) => r.setAttribute("stroke", t > 1800 && t < 6450 ? C.a : t > 10000 ? C.b : C.ink));
      talk.setAttribute("opacity", kf([[0, 0], [7100, 0], [7400, 1], [8700, 1], [9000, 0]], t));
      typing.forEach((c, i) => c.setAttribute("opacity", 0.3 + 0.7 * Math.max(0, Math.sin((t / 1000) * 6 - i * 0.9))));
      bars.forEach((b, i) => {
        const [lo, hi] = VAL[i];
        const x = kf([[0, 0], [4300, 0], [5300, lo], [6300, lo], [6600, 0], [10300, 0], [11300, hi]], t);
        b.bar.setAttribute("width", 240 * x);
        b.val.textContent = x > 0.02 ? x.toFixed(2) : "";
      });
    };
  });

  // ---------------------------------------------------------------- 2. every booking at the max discount
  const disc = document.querySelector(".why-anim.discount");
  if (disc) player(disc, 11000, (svg) => {
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    el(g, "text", { x: 16, y: 26, "font-size": 12, "font-weight": 700, fill: C.max, "letter-spacing": ".06em" }, "DISCOUNT ON EVERY BOOKING");
    const X = (d) => 50 + d / 30 * 380, AY = 150;
    el(g, "line", { x1: X(0), x2: X(30), y1: AY, y2: AY, stroke: C.ink, "stroke-width": 1.5 });
    [0, 10, 20, 30].forEach((d) => {
      el(g, "line", { x1: X(d), x2: X(d), y1: AY, y2: AY + 6, stroke: C.ink });
      el(g, "text", { x: X(d), y: AY + 22, "text-anchor": "middle", "font-size": 12, fill: C.muted }, d === 30 ? "30% (max)" : `${d}%`);
    });
    el(g, "text", { x: X(0), y: AY + 40, "font-size": 11, fill: C.muted }, "no discount");
    const count = el(g, "text", { x: X(30) - 40, y: 46, "text-anchor": "end", "font-size": 13, "font-weight": 650, fill: C.ink });
    // 48 bookings start at random discounts, then all slide to the max and stack
    const N = 48, rnd = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const dots = [...Array(N)].map((_, i) => {
      const c = el(g, "circle", { r: 4.2, fill: C.max });
      const startX = X(rnd(i) * 30), startY = 40 + rnd(i + 99) * 70;
      const col = i % 4, row = Math.floor(i / 4);
      const endX = X(30) - 13 + col * 9, endY = AY - 7 - row * 9;
      return { c, k: [[0, [startX, startY]], [200 + i * 30, [startX, startY]], [1400 + i * 30, [endX, endY]]] };
    });
    // example prices
    const ex = el(g, "g", {});
    const rows = [["What happened", "AA303 · party of 2 · 30% off", 840, "provider 0.43 · user 1.00"],
                  ["Also possible", "same flight, a day earlier, add-ons", 1139, "provider 0.59 · user 1.00"]];
    const priceBars = rows.map(([h, sub, price, rw], i) => {
      const y = 204 + i * 58;
      el(ex, "text", { x: 16, y, "font-size": 12, "font-weight": 650, fill: C.ink }, h);
      el(ex, "text", { x: 16, y: y + 16, "font-size": 11, fill: C.muted }, sub);
      const bar = el(ex, "rect", { x: 230, y: y - 12, height: 16, rx: 5, fill: i ? C.max : "#c8c3dc" });
      const lbl = el(ex, "text", { x: 238, y: y + 1, "font-size": 12, "font-weight": 700, "font-family": "JetBrains Mono, monospace", fill: C.ink });
      el(ex, "text", { x: 230, y: y + 22, "font-size": 11, fill: C.muted }, rw);
      return { bar, lbl, price };
    });
    return (t) => {
      dots.forEach((d) => { const [x, y] = kf(d.k, t); d.c.setAttribute("cx", x); d.c.setAttribute("cy", y); });
      count.setAttribute("opacity", kf([[0, 0], [3000, 0], [3500, 1]], t));
      count.textContent = "858 of 858 (scarce supply) · 531 of 531 (abundant supply)";
      ex.setAttribute("opacity", kf([[0, 0], [4200, 0], [4700, 1]], t));
      priceBars.forEach((p, i) => {
        const v = kf([[0, 0], [4600 + i * 1400, 0], [5800 + i * 1400, 1]], t);
        p.bar.setAttribute("width", (p.price / 1139) * 200 * v);
        p.lbl.setAttribute("x", 230 + (p.price / 1139) * 200 * v + 8);
        p.lbl.textContent = v > 0.05 ? `$${Math.round(p.price * v).toLocaleString()}` : "";
      });
    };
  });

  // ---------------------------------------------------------------- copy BibTeX
  const copy = document.querySelector(".bib .copy");
  if (copy) copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(document.getElementById("bibtex").textContent); copy.textContent = "Copied"; }
    catch { copy.textContent = "Select and copy"; }
    setTimeout(() => (copy.textContent = "Copy"), 1600);
  });
})();
