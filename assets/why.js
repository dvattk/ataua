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
  const seats = document.querySelector(".why-anim.seats");
  if (seats) player(seats, 12000, (svg) => {
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    const phase = el(g, "text", { x: 16, y: 26, "font-size": 12, "font-weight": 700, fill: C.max, "letter-spacing": ".06em" });
    box(g, 170, 46, 180, 104, "Delta · Aug 2", "Houston → New York");
    const seatPos = [[218, 112], [262, 112]];
    const seatRects = seatPos.map(([x, y]) => el(g, "rect", { x: x - 16, y: y - 14, width: 32, height: 28, rx: 6, fill: "#fff", stroke: C.ink, "stroke-width": 1.5 }));
    const soldOut = el(g, "text", { x: 260, y: 168, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.max }, "sold out for B");
    box(g, 372, 46, 132, 74, "Spirit · Delta", "a day or two later");
    box(g, 372, 136, 132, 74, "United", "other dates · $1,631");
    // agents
    const agent = (x, y, name, col) => {
      el(g, "circle", { cx: x, cy: y, r: 18, fill: "#fff", stroke: col, "stroke-width": 2 });
      el(g, "text", { x, y: y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: col }, name);
      el(g, "text", { x, y: y + 34, "text-anchor": "middle", "font-size": 11, fill: C.muted }, "party of 2");
    };
    agent(52, 80, "A", C.a);
    agent(52, 180, "B", C.b);
    // the two travellers of each party
    const party = (col) => [0, 1].map(() => el(g, "circle", { r: 7, fill: col }));
    const A = party(C.a), B = party(C.b);
    // bars
    const bars = [["Traveller reward", 0.88, 0.93], ["Airline reward", 0.40, 0.93]].map(([name], i) => {
      const y = 254 + i * 34;
      el(g, "text", { x: 16, y: y + 10, "font-size": 12, fill: C.ink }, name);
      el(g, "rect", { x: 130, y, width: 300, height: 12, rx: 6, fill: C.soft });
      const bar = el(g, "rect", { x: 130, y, height: 12, rx: 6, fill: C.max });
      const val = el(g, "text", { x: 440, y: y + 11, "font-size": 12, "font-family": "JetBrains Mono, monospace", fill: C.ink });
      return { bar, val };
    });
    const home = { A: [100, 80], B: [100, 180] };
    const off = (p, i) => [p[0] + (i ? 9 : -9), p[1]];
    const S = seatPos, ALT = [438, 100], UNI = [438, 190];
    // keyframes (ms)
    const KA = [[0, home.A], [700, home.A], [1600, null], [6200, null], [7200, ALT], [12000, ALT]];
    const KB = [[0, home.B], [2000, home.B], [2700, [150, 140]], [3100, [150, 140]], [3900, UNI], [7400, UNI], [8400, null], [12000, null]];
    const pos = (frames, i, t, seatsAt) => kf(frames.map(([tt, v]) => [tt, v === null ? S[i] : off(v, i)]), t);
    return (t) => {
      phase.textContent = t < 6000 ? "WHAT THE AGENTS DID" : "A COORDINATED ALLOCATION";
      A.forEach((c, i) => { const [x, y] = pos(KA, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); });
      B.forEach((c, i) => { const [x, y] = pos(KB, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); });
      soldOut.setAttribute("opacity", kf([[0, 0], [2700, 0], [3000, 1], [5800, 1], [6100, 0]], t));
      const v = [kf([[0, 0], [4200, 0], [5200, 1], [8600, 1], [9600, 2], [12000, 2]], t)];
      bars.forEach((b, i) => {
        const [lo, hi] = i ? [0.40, 0.93] : [0.88, 0.93];
        const x = v[0] <= 1 ? lo * v[0] : lo + (hi - lo) * (v[0] - 1);
        b.bar.setAttribute("width", 300 * x);
        b.val.textContent = v[0] > 0.02 ? x.toFixed(2) : "";
      });
      seatRects.forEach((r) => r.setAttribute("stroke", t > 1600 && t < 6400 ? C.a : t > 8400 ? C.b : C.ink));
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
    const rows = [["What happened", "AA303 · party of 2 · 30% off", 840, "airline 0.43 · traveller 1.00"],
                  ["Also possible", "same flight, a day earlier, add-ons", 1139, "airline 0.59 · traveller 1.00"]];
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
