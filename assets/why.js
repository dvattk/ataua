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
    // three flights, each with two seats in a row under its name; dots enter along the seat row so they never
    // cross the text
    const seatRow = (y) => [[432, y], [470, y]];
    const seatBox = (pos) => pos.map(([x, y]) => el(g, "rect", { x: x - 15, y: y - 13, width: 30, height: 26, rx: 6, fill: "#fff", stroke: C.ink, "stroke-width": 1.5 }));
    box(g, 300, 26, 204, 76, "Delta", "Aug 2");
    const DELTA = seatRow(84), delta = seatBox(DELTA);
    const soldOut = el(g, "text", { x: 451, y: 44, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.max }, "sold out");
    box(g, 300, 110, 204, 76, "Spirit · Delta", "1–2 days later");
    const SPIRIT = seatRow(168), spirit = seatBox(SPIRIT);
    box(g, 300, 194, 204, 76, "United", "other dates");
    const UNITED = seatRow(252), united = seatBox(UNITED);
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
    const HOME = { A: [100, 80], B: [100, 200] };
    // a frame value is either a point shared by the party (dots side by side) or a seat row (one dot per seat);
    // paths run through the lane left of the boxes (x = 268), then along the seat row
    const lane = (row) => [268, row[0][1]];
    const KA = [[0, HOME.A], [400, HOME.A], [1300, lane(DELTA)], [1800, DELTA], [6500, DELTA], [6501, HOME.A],
                [9300, HOME.A], [9900, lane(SPIRIT)], [10400, SPIRIT], [13000, SPIRIT]];
    const KB = [[0, HOME.B], [400, HOME.B], [2200, lane(DELTA)], [3000, lane(DELTA)], [3500, lane(UNITED)], [4000, UNITED], [6500, UNITED],
                [6501, HOME.B], [8900, HOME.B], [9500, lane(DELTA)], [10000, DELTA], [13000, DELTA]];
    const at = (v, i) => (Array.isArray(v[0]) ? v[i] : [v[0] + (i ? 9 : -9), v[1]]);
    const pos = (frames, i, t) => kf(frames.map(([tt, v]) => [tt, at(v, i)]), t);
    return (t) => {
      phase.textContent = t < 6500 ? "WHAT THE AGENTS DID" : "A COORDINATED ALLOCATION";
      const vis = kf([[0, 1], [6200, 1], [6450, 0], [6550, 0], [6900, 1]], t);     // parties blink back home between parts
      A.forEach((c, i) => { const [x, y] = pos(KA, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", vis); });
      B.forEach((c, i) => { const [x, y] = pos(KB, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", vis); });
      soldOut.setAttribute("opacity", kf([[0, 0], [2200, 0], [2500, 1], [6200, 1], [6450, 0]], t));
      const paint = (rects, col) => rects.forEach((r) => r.setAttribute("stroke", col || C.ink));
      paint(delta, t > 1800 && t < 6450 ? C.a : t > 10000 ? C.b : null);
      paint(united, t > 4000 && t < 6450 ? C.b : null);
      paint(spirit, t > 10400 ? C.a : null);
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

  // ---------------------------------------------------------------- 2. a provider agent and its levers
  // The provider agent sits among the levers it could pull (hold the fare, discount, another cabin, paid add-ons).
  // Each time a user agent comes to book, the provider agent looks from lever to lever, can't settle, and pulls
  // the discount all the way to the 30% maximum. Three bookings, then the takeaway.
  const disc = document.querySelector(".why-anim.discount");
  if (disc) player(disc, 12000, (svg) => {
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    el(g, "text", { x: 16, y: 22, "font-size": 12, "font-weight": 700, fill: C.max, "letter-spacing": ".06em" }, "WHICH LEVER TO PULL?");
    const AG = [260, 150];
    const LEVERS = [
      { name: "Hold the fare", x: 40, y: 44 },
      { name: "Discount", x: 330, y: 44, bar: true },
      { name: "Another cabin", x: 40, y: 210 },
      { name: "Paid add-ons", x: 330, y: 210 },
    ];
    const W = 150, H = 50;
    const levers = LEVERS.map((L) => {
      const cx = L.x + W / 2, cy = L.y + H / 2;
      const link = el(g, "line", { x1: AG[0], y1: AG[1], x2: cx, y2: cy, stroke: C.line, "stroke-width": 1.5, "stroke-dasharray": "4 4" });
      const r = el(g, "rect", { x: L.x, y: L.y, width: W, height: H, rx: 12, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
      el(g, "text", { x: L.x + 14, y: L.y + (L.bar ? 21 : 30), "font-size": 13, "font-weight": 650, fill: C.ink }, L.name);
      let fill = null, pct = null;
      if (L.bar) {
        el(g, "rect", { x: L.x + 14, y: L.y + 30, width: 92, height: 8, rx: 4, fill: C.soft });
        fill = el(g, "rect", { x: L.x + 14, y: L.y + 30, height: 8, rx: 4, fill: C.max });
        pct = el(g, "text", { x: L.x + 114, y: L.y + 38, "font-size": 11, "font-weight": 700, "font-family": "JetBrains Mono, monospace", fill: C.max });
      }
      return { link, r, fill, pct };
    });
    // the provider agent
    el(g, "circle", { cx: AG[0], cy: AG[1], r: 30, fill: "#fff", stroke: C.ink, "stroke-width": 2 });
    el(g, "text", { x: AG[0], y: AG[1] - 2, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: C.ink }, "Provider");
    el(g, "text", { x: AG[0], y: AG[1] + 12, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: C.ink }, "agent");
    const think = el(g, "g", {});
    el(think, "circle", { cx: AG[0] + 30, cy: AG[1] - 34, r: 11, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
    el(think, "text", { x: AG[0] + 30, y: AG[1] - 29.5, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: C.muted }, "?");
    // the user agent who wants to book, and the tally of bookings
    const user = el(g, "circle", { r: 9, fill: C.a });
    const tag = el(g, "text", { "font-size": 11, "font-weight": 700, "font-family": "JetBrains Mono, monospace", fill: C.max, "text-anchor": "middle" }, "−30%");
    const done = [0, 1, 2].map((i) => el(g, "g", {}));
    done.forEach((d, i) => {
      el(d, "circle", { cx: 440 + i * 27, cy: 150, r: 8, fill: C.a });
      el(d, "text", { x: 440 + i * 27, y: 172, "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: C.max }, "30%");
    });
    const takeaway = el(g, "text", { x: 260, y: 300, "text-anchor": "middle", "font-size": 13, "font-weight": 650, fill: C.ink },
      "Every booking got the full 30% discount.");
    const LOOK = [0, 2, 3, 0, 2, 1];          // lever order the agent glances at before giving in to the discount
    const B = 3200;                           // one booking
    return (t) => {
      const k = Math.min(Math.floor(t / B), 2), u = t - k * B, live = t < 3 * B;
      // where the agent is looking (-1 = nowhere)
      let look = -1;
      if (live && u > 700 && u < 2000) look = LOOK[Math.floor((u - 700) / 220) % LOOK.length];
      if (live && u >= 2000 && u < 2900) look = 1;
      levers.forEach((L, i) => {
        const on = i === look;
        L.r.setAttribute("stroke", on ? C.max : C.line); L.r.setAttribute("stroke-width", on ? 2.5 : 1.5);
        L.link.setAttribute("stroke", on ? C.max : C.line);
      });
      think.setAttribute("opacity", live && u > 600 && u < 2000 ? 1 : 0);
      const f = live ? kf([[0, 0], [2000, 0], [2400, 1], [2900, 1], [3200, 0]], u) : 0;
      levers[1].fill.setAttribute("width", 92 * f);
      levers[1].pct.textContent = f > 0.02 ? `${Math.round(30 * f)}%` : "";
      // the user agent walks up, waits, then leaves to the right with its discount
      const [x, y] = live ? kf([[0, [30, 150]], [600, [196, 150]], [2500, [196, 150]], [2750, [262, 206]], [3100, [420, 150]]], u) : [-50, 0];
      user.setAttribute("cx", x); user.setAttribute("cy", y);
      user.setAttribute("opacity", live ? kf([[0, 0], [200, 1], [2900, 1], [3100, 0]], u) : 0);
      tag.setAttribute("x", x); tag.setAttribute("y", y + 24);
      tag.setAttribute("opacity", live && u > 2400 ? kf([[2400, 0], [2600, 1], [2900, 1], [3100, 0]], u) : 0);
      done.forEach((d, i) => d.setAttribute("opacity", t > i * B + 3050 ? 1 : 0));
      takeaway.setAttribute("opacity", kf([[0, 0], [3 * B, 0], [3 * B + 400, 1]], t));
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
