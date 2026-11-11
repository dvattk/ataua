// The two "why the gap" animations (keyframed, loop while on screen) and the BibTeX copy button.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = { ink: "#181825", muted: "#666674", line: "#e7e5ee", soft: "#f7f6fb", max: "#4F46E5", a: "#4285F4", b: "#D97757" };

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

  // ---------------------------------------------------------------- shared pieces
  const TINT = { [C.a]: "#E8F0FE", [C.b]: "#FBEDE6" };
  // the Figure 2 robot, drawn small: head, eyes, mouth, antenna; headset for provider agents
  // colours match Figure 2: dark outline, lavender for user agents, pink for provider agents
  const BOT = { ink: "#34343B", user: "#E6E3FF", provider: "#FFE9D6" };
  function robot(g, x, y, fill, s = 1, headset = false) {
    const col = BOT.ink;
    const r = el(g, "g", { transform: `translate(${x} ${y}) scale(${s})` });
    el(r, "line", { x1: 0, y1: -13, x2: 0, y2: -18, stroke: col, "stroke-width": 2, "stroke-linecap": "round" });
    el(r, "circle", { cx: 0, cy: -19.5, r: 2.4, fill: col });
    el(r, "rect", { x: -14, y: -13, width: 28, height: 22, rx: 7, fill, stroke: col, "stroke-width": 2 });
    el(r, "circle", { cx: -5.5, cy: -3, r: 2.3, fill: col });
    el(r, "circle", { cx: 5.5, cy: -3, r: 2.3, fill: col });
    el(r, "line", { x1: -4, y1: 3.5, x2: 4, y2: 3.5, stroke: col, "stroke-width": 2, "stroke-linecap": "round" });
    el(r, "rect", { x: -9, y: 11, width: 18, height: 8, rx: 3, fill, stroke: col, "stroke-width": 2 });
    if (headset) {
      el(r, "path", { d: "M -18 -2 A 18 18 0 0 1 18 -2", fill: "none", stroke: col, "stroke-width": 2 });
      el(r, "rect", { x: -21, y: -6, width: 6, height: 11, rx: 2.5, fill, stroke: col, "stroke-width": 2 });
      el(r, "rect", { x: 15, y: -6, width: 6, height: 11, rx: 2.5, fill, stroke: col, "stroke-width": 2 });
    }
    return r;
  }
  // a seat: backrest + cushion
  function seat(g, x, y) {
    const s = el(g, "g", { transform: `translate(${x} ${y})` });
    const back = el(s, "rect", { x: -11, y: -13, width: 22, height: 17, rx: 5, fill: "#fff", stroke: C.ink, "stroke-width": 1.6 });
    const cush = el(s, "rect", { x: -13, y: 3, width: 26, height: 8, rx: 3, fill: "#fff", stroke: C.ink, "stroke-width": 1.6 });
    return { set(col) { [back, cush].forEach((e) => { e.setAttribute("stroke", col || C.ink); e.setAttribute("fill", col ? TINT[col] : "#fff"); }); } };
  }
  function chip(g, x, y, text, col = C.max) {
    const c = el(g, "g", {});
    const t = el(c, "text", { x: x + 10, y: y + 15, "font-size": 11, "font-weight": 700, fill: col, "letter-spacing": ".06em" }, text);
    const r = el(c, "rect", { x, y, height: 22, rx: 11, fill: "#EEF0FF" });
    c.insertBefore(r, t);
    return { c, t, r, fit() { r.setAttribute("width", (t.getComputedTextLength() || 150) + 20); } };
  }
  const pop = (t, t0) => (t < t0 ? 0 : 1 + 0.25 * Math.sin(Math.min((t - t0) / 260, 1) * Math.PI));   // 0, then a quick overshoot to 1

  // ---------------------------------------------------------------- 1. competing for seats
  // Part 1 (what the agents did): A and B race for the same two Delta seats; A gets there first, Delta is
  // stamped sold out, B shakes and goes to United. Part 2 (coordinated): start over, A and B talk and agree,
  // B takes Delta and A takes Spirit / Delta. Bars grow from the part-1 values to the coordinated ones.
  const seats = document.querySelector(".why-anim.seats");
  if (seats) player(seats, 13000, (svg) => {
    svg.setAttribute("viewBox", "0 0 480 300");
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    const ph = chip(g, 14, 12, "WHAT THE AGENTS DID");
    // flights
    const FX = 214, FW = 252, FH = 58, FY = [46, 112, 178];
    const cards = [["Delta", "Aug 2"], ["Spirit · Delta", "1–2 days later"], ["United", "other dates"]].map(([name, when], i) => {
      const y = FY[i];
      el(g, "rect", { x: FX, y, width: FW, height: FH, rx: 12, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
      el(g, "text", { x: FX + 94, y: y + 25, "font-size": 14, "font-weight": 700, fill: C.ink }, name);
      el(g, "text", { x: FX + 94, y: y + 43, "font-size": 12, fill: C.muted }, when);
      const pos = [[FX + 26, y + 29], [FX + 60, y + 29]];          // seats first, so arriving dots never cross text
      return { pos, seats: pos.map(([x, yy]) => seat(g, x, yy)) };
    });
    const [DELTA, SPIRIT, UNITED] = cards.map((c) => c.pos);
    // sold-out stamp on Delta
    const stamp = el(g, "g", { transform: `translate(${FX + 200} ${FY[0] + 29}) rotate(-8)` });
    el(stamp, "rect", { x: -38, y: -12, width: 76, height: 24, rx: 6, fill: "#fff", stroke: C.max, "stroke-width": 2 });
    el(stamp, "text", { x: 0, y: 5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: C.max, "letter-spacing": ".08em" }, "SOLD OUT");
    // agents
    const AG = { A: [40, 92], B: [40, 190] };
    robot(g, ...AG.A, BOT.user);
    el(g, "text", { x: AG.A[0], y: AG.A[1] + 38, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.a }, "A");
    robot(g, ...AG.B, BOT.user);
    el(g, "text", { x: AG.B[0], y: AG.B[1] + 38, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.b }, "B");
    // A and B talk (part 2): two bubbles with dots, then a check
    const talk = el(g, "g", {});
    el(talk, "path", { d: `M ${AG.A[0]} ${AG.A[1] + 46} L ${AG.B[0]} ${AG.B[1] - 26}`, stroke: C.line, "stroke-width": 2, "stroke-dasharray": "3 4" });
    const bub = el(talk, "g", {});
    el(bub, "rect", { x: 58, y: 128, width: 46, height: 26, rx: 13, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
    const typing = [71, 81, 91].map((x) => el(bub, "circle", { cx: x, cy: 141, r: 3, fill: C.muted }));
    const ok = el(talk, "g", {});
    el(ok, "circle", { cx: 81, cy: 141, r: 13, fill: "#E3F5EE", stroke: "#10A37F", "stroke-width": 1.8 });
    el(ok, "path", { d: "M 75 141 L 79.5 145.5 L 87.5 136.5", fill: "none", stroke: "#10A37F", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" });
    // parties: two travelers each
    const A = [0, 1].map(() => el(g, "circle", { r: 6.5, fill: C.a })), B = [0, 1].map(() => el(g, "circle", { r: 6.5, fill: C.b }));
    // reward bars: grow, and in part 2 a tick keeps the part-1 value for comparison
    const VAL = [[0.88, 0.93], [0.40, 0.93]];
    const BX = 124, BW = 250;
    const bars = ["User reward", "Provider reward"].map((name, i) => {
      const y = 252 + i * 24;
      el(g, "text", { x: 14, y: y + 10, "font-size": 12, "font-weight": 600, fill: C.ink }, name);
      el(g, "rect", { x: BX, y, width: BW, height: 10, rx: 5, fill: C.soft });
      const bar = el(g, "rect", { x: BX, y, height: 10, rx: 5, fill: C.max });
      const ghost = el(g, "line", { y1: y - 3, y2: y + 13, stroke: C.ink, "stroke-width": 1.5 });
      const val = el(g, "text", { x: BX + BW + 10, y: y + 10, "font-size": 12, "font-weight": 700, "font-family": "JetBrains Mono, monospace", fill: C.ink });
      return { bar, ghost, val };
    });
    // paths: parties leave home, travel down the lane left of the flights (x = 190), then along the seat row
    const HOME = { A: [80, 92], B: [80, 190] }, LANE = 190;
    const lane = (row) => [LANE, row[0][1]];
    const KA = [[0, HOME.A], [300, HOME.A], [1100, lane(DELTA)], [1500, DELTA], [6500, DELTA], [6501, HOME.A],
                [9300, HOME.A], [9800, lane(SPIRIT)], [10300, SPIRIT], [13000, SPIRIT]];
    const KB = [[0, HOME.B], [300, HOME.B], [1700, lane(DELTA)], [3000, lane(DELTA)], [3500, lane(UNITED)], [4000, UNITED], [6500, UNITED],
                [6501, HOME.B], [8900, HOME.B], [9400, lane(DELTA)], [9900, DELTA], [13000, DELTA]];
    const at = (v, i) => (Array.isArray(v[0]) ? v[i] : [v[0] + (i ? 8 : -8), v[1]]);
    const pos = (frames, i, t) => kf(frames.map(([tt, v]) => [tt, at(v, i)]), t);
    return (t) => {
      const p2 = t >= 6500;
      ph.t.textContent = p2 ? "A COORDINATED ALLOCATION" : "WHAT THE AGENTS DID"; ph.fit();
      const vis = kf([[0, 1], [6200, 1], [6450, 0], [6550, 0], [6900, 1]], t);
      const shake = t > 1750 && t < 2350 ? Math.sin((t - 1750) / 28) * 3 : 0;          // B bumps into the sold-out flight
      A.forEach((c, i) => { const [x, y] = pos(KA, i, t); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", vis); });
      B.forEach((c, i) => { const [x, y] = pos(KB, i, t); c.setAttribute("cx", x + shake); c.setAttribute("cy", y); c.setAttribute("opacity", vis); });
      const sp = t > 1600 && t < 6450 ? pop(t, 1600) : 0;
      stamp.setAttribute("opacity", Math.min(sp, 1)); stamp.setAttribute("transform", `translate(${FX + 200} ${FY[0] + 29}) rotate(-8) scale(${sp || 1})`);
      cards[0].seats.forEach((s) => s.set(t > 1500 && t < 6450 ? C.a : t > 9900 ? C.b : null));
      cards[2].seats.forEach((s) => s.set(t > 4000 && t < 6450 ? C.b : null));
      cards[1].seats.forEach((s) => s.set(t > 10300 ? C.a : null));
      talk.setAttribute("opacity", kf([[0, 0], [7000, 0], [7300, 1], [8900, 1], [9200, 0]], t));
      bub.setAttribute("opacity", t < 8200 ? 1 : 0); ok.setAttribute("opacity", t >= 8200 ? 1 : 0);
      typing.forEach((c, i) => c.setAttribute("opacity", 0.3 + 0.7 * Math.max(0, Math.sin((t / 1000) * 7 - i * 0.9))));
      bars.forEach((b, i) => {
        const [lo, hi] = VAL[i];
        const x = kf([[0, 0], [4300, 0], [5200, lo], [10500, lo], [11400, hi]], t);     // bars stay put while the dots reset and move
        b.bar.setAttribute("width", BW * x);
        b.val.textContent = x > 0.02 ? x.toFixed(2) : "";
        const gx = BX + BW * lo;
        b.ghost.setAttribute("x1", gx); b.ghost.setAttribute("x2", gx);
        b.ghost.setAttribute("opacity", t > 10500 && x > lo + 0.01 ? 1 : 0);                // the old value stays marked
      });
    };
  });

  // ---------------------------------------------------------------- 2. a provider agent and its levers
  // The provider agent sits among the levers it could pull. Each time a user agent comes to book, it looks from
  // lever to lever, can't settle, and pulls the discount to the 30% maximum; the discount flies to the user.
  const disc = document.querySelector(".why-anim.discount");
  if (disc) player(disc, 18000, (svg) => {           // played 1.5x slower than its 12 s timeline
    svg.setAttribute("viewBox", "0 0 480 300");
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    chip(g, 14, 12, "WHICH LEVER TO PULL?").fit();
    const AG = [240, 152];
    const W = 156, H = 52;
    const LEVERS = [
      { name: "Hold the fare", x: 14, y: 50, icon: "lock" },
      { name: "Discount", x: 310, y: 50, icon: "$", bar: true },
      { name: "Another cabin", x: 14, y: 206, icon: "seat" },
      { name: "Paid add-ons", x: 310, y: 206, icon: "+" },
    ];
    const levers = LEVERS.map((L) => {
      const cx = L.x + W / 2, cy = L.y + H / 2;
      const link = el(g, "line", { x1: AG[0], y1: AG[1], x2: cx, y2: cy, stroke: C.line, "stroke-width": 1.6, "stroke-dasharray": "4 4" });
      const r = el(g, "rect", { x: L.x, y: L.y, width: W, height: H, rx: 13, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
      // icon badge
      const ix = L.x + 24, iy = L.y + H / 2;
      const badge = el(g, "circle", { cx: ix, cy: iy, r: 13, fill: C.soft });
      if (L.icon === "$") el(g, "text", { x: ix, y: iy + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 800, fill: C.max }, "$");
      if (L.icon === "+") el(g, "text", { x: ix, y: iy + 6, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: C.muted }, "+");
      if (L.icon === "lock") {
        el(g, "path", { d: `M ${ix - 4} ${iy - 1} V ${iy - 4} A 4 4 0 0 1 ${ix + 4} ${iy - 4} V ${iy - 1}`, fill: "none", stroke: C.muted, "stroke-width": 1.8 });
        el(g, "rect", { x: ix - 6, y: iy - 1, width: 12, height: 9, rx: 2, fill: C.muted });
      }
      if (L.icon === "seat") {
        el(g, "rect", { x: ix - 5, y: iy - 7, width: 10, height: 8, rx: 2.5, fill: "none", stroke: C.muted, "stroke-width": 1.6 });
        el(g, "rect", { x: ix - 6.5, y: iy + 1, width: 13, height: 5, rx: 2, fill: "none", stroke: C.muted, "stroke-width": 1.6 });
      }
      el(g, "text", { x: L.x + 46, y: L.y + (L.bar ? 22 : 31), "font-size": 13, "font-weight": 700, fill: C.ink }, L.name);
      let fill = null, pct = null;
      if (L.bar) {
        el(g, "rect", { x: L.x + 46, y: L.y + 31, width: 70, height: 7, rx: 3.5, fill: C.soft });
        fill = el(g, "rect", { x: L.x + 46, y: L.y + 31, height: 7, rx: 3.5, fill: C.max });
        pct = el(g, "text", { x: L.x + 124, y: L.y + 38, "font-size": 11, "font-weight": 700, "font-family": "JetBrains Mono, monospace", fill: C.max });
      }
      return { link, r, badge, fill, pct };
    });
    robot(g, AG[0], AG[1] - 4, BOT.provider, 1.35, true);
    el(g, "text", { x: AG[0], y: AG[1] + 40, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.ink }, "Provider agent");
    // the "?" while it hesitates
    const think = el(g, "g", {});
    el(think, "circle", { cx: AG[0] + 34, cy: AG[1] - 44, r: 15, fill: "#fff", stroke: C.max, "stroke-width": 1.8 });
    const qmark = el(think, "text", { x: AG[0] + 34, y: AG[1] - 37, "text-anchor": "middle", "font-size": 20, "font-weight": 800, fill: C.max }, "?");
    // the user agent who comes to book, and the discount that flies to it
    const user = el(g, "g", {});
    robot(user, 0, 0, BOT.user, 0.85);
    const tag = el(g, "g", {});
    el(tag, "rect", { x: -22, y: -11, width: 44, height: 22, rx: 11, fill: C.max });
    el(tag, "text", { x: 0, y: 4.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }, "−30%");
    const takeaway = el(g, "text", { x: 240, y: 290, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: C.ink }, "Every booking got the full 30% discount.");
    const LOOK = [0, 2, 3, 0, 2, 3];
    const B = 3200, SPOT = [138, 152], DISC = [310 + 78, 50 + 66], SLOW = 1.5;
    return (tt) => {
      const t = tt / SLOW;
      const k = Math.min(Math.floor(t / B), 2), u = t - k * B, live = t < 3 * B;
      let look = -1;
      if (live && u > 700 && u < 1900) look = LOOK[Math.floor((u - 700) / 200) % LOOK.length];
      if (live && u >= 1900 && u < 2700) look = 1;
      levers.forEach((L, i) => {
        const on = i === look;
        L.r.setAttribute("stroke", on ? C.max : C.line); L.r.setAttribute("stroke-width", on ? 2.4 : 1.5);
        L.link.setAttribute("stroke", on ? C.max : C.line);
        L.badge.setAttribute("fill", on ? "#EEF0FF" : C.soft);
      });
      think.setAttribute("opacity", live && u > 600 && u < 1900 ? 1 : 0);
      qmark.setAttribute("transform", `rotate(${(Math.sin(t / 150) * 22).toFixed(1)} ${AG[0] + 34} ${AG[1] - 44})`);
      const f = live ? kf([[0, 0], [1900, 0], [2250, 1], [3000, 1], [3200, 0]], u) : 0;
      levers[1].fill.setAttribute("width", 70 * f);
      levers[1].pct.textContent = f > 0.02 ? `${Math.round(30 * f)}%` : "";
      // user walks in from the left, waits, takes the discount and walks back out
      const [ux, uy] = live ? kf([[0, [-30, 152]], [600, SPOT], [2700, SPOT], [3150, [-30, 152]]], u) : [-60, 152];
      user.setAttribute("transform", `translate(${ux} ${uy})`);
      // the −30% tag flies from the Discount lever to the user, then rides along
      const fly = live ? clamp01((u - 2250) / 450) : 0;
      // arc over the agent's head (quadratic curve through a point above it)
      const q = ease(fly), P1 = [250, 84], end = [ux, uy - 34];
      const bz = (a, b, c) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * b + q * q * c;
      const tx = fly < 1 ? bz(DISC[0], P1[0], end[0]) : end[0], ty = fly < 1 ? bz(DISC[1], P1[1], end[1]) : end[1];
      tag.setAttribute("transform", `translate(${tx} ${ty})`);
      tag.setAttribute("opacity", live && u > 2250 && u < 3100 ? 1 : 0);
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
