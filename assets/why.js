// The two "why the gap" animations (keyframed, loop while on screen) and the BibTeX copy button.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = { ink: "#181825", muted: "#666674", line: "#e7e5ee", soft: "#f7f6fb", max: "var(--accent)", a: "#4285F4", b: "#16A34A" };

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
  const player = (...a) => window.animPlayer(...a);   // assets/anim-player.js

  // ---------------------------------------------------------------- shared pieces
  const TINT = { [C.a]: "#E8F0FE", [C.b]: "#E3F5E9" };
  // the Figure 2 robot, drawn small: head, eyes, mouth, antenna; headset for provider agents
  // colours match Figure 2: dark outline, lavender for user agents, pink for provider agents
  const BOT = { ink: "#34343B", user: "var(--accent-tint)", provider: "#FFE9D6" };
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
    const r = el(c, "rect", { x, y, height: 22, rx: 11, fill: "var(--accent-soft)" });
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

  // ---------------------------------------------------------------- 2. a provider agent at its computer
  // The provider agent sits at a computer. For each booking request on screen, it moves the mouse straight to
  // the Discount lever (always the 30% maximum) and clicks; hold the fare, another cabin and paid add-ons are
  // never clicked. The on-screen cursor follows the mouse on the desk.
  const disc = document.querySelector(".why-anim.discount");
  if (disc) player(disc, 13500, (svg) => {
    svg.setAttribute("viewBox", "0 0 480 300");
    const g = el(svg, "g", { "font-family": "Inter, Arial, sans-serif" });
    chip(g, 14, 12, "WHICH LEVER TO PULL?").fit();
    const MONO = "JetBrains Mono, monospace";
    const DESK = 262;
    // desk, monitor stand, monitor
    el(g, "rect", { x: 296, y: 236, width: 24, height: 16, fill: "#dcd9e2" });
    el(g, "rect", { x: 152, y: 40, width: 312, height: 198, rx: 12, fill: BOT.ink });
    const SX = 162, SY = 50, SW = 292, SH = 178;
    el(g, "rect", { x: SX, y: SY, width: SW, height: SH, rx: 6, fill: "#fff" });
    // screen: the booking request and the quote
    robot(g, SX + 20, SY + 22, BOT.user, 0.55);
    el(g, "text", { x: SX + 38, y: SY + 17, "font-size": 9.5, fill: C.muted }, "Booking request");
    const reqT = el(g, "text", { x: SX + 38, y: SY + 32, "font-size": 11.5, "font-weight": 700, fill: C.ink });
    el(g, "text", { x: SX + SW - 10, y: SY + 17, "text-anchor": "end", "font-size": 9.5, fill: C.muted }, "Quote");
    const oldP = el(g, "text", { "font-size": 10.5, "font-family": MONO, fill: C.muted, "text-anchor": "end" });
    const strike = el(g, "line", { stroke: C.muted, "stroke-width": 1.2 });
    const newP = el(g, "text", { x: SX + SW - 10, y: SY + 33, "text-anchor": "end", "font-size": 12.5, "font-weight": 700, "font-family": MONO, fill: C.ink });
    el(g, "line", { x1: SX, y1: SY + 44, x2: SX + SW, y2: SY + 44, stroke: C.line, "stroke-width": 1.2 });
    // screen: four levers, as buttons
    const CW = 132, CH = 50, CX = [SX + 10, SX + 150], CY = [SY + 56, SY + 116];
    const LEV = [["Hold the fare", "lock", 0, 0], ["Discount 30%", "$", 1, 0], ["Another cabin", "seat", 0, 1], ["Paid add-ons", "+", 1, 1]];
    const btns = LEV.map(([name, icon, c, r]) => {
      const x = CX[c], y = CY[r], ix = x + 20, iy = y + CH / 2;
      const rect = el(g, "rect", { x, y, width: CW, height: CH, rx: 10, fill: "#fff", stroke: C.line, "stroke-width": 1.5 });
      const badge = el(g, "circle", { cx: ix, cy: iy, r: 11, fill: C.soft });
      if (icon === "$") el(g, "text", { x: ix, y: iy + 4.5, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: C.max }, "$");
      if (icon === "+") el(g, "text", { x: ix, y: iy + 5.5, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: C.muted }, "+");
      if (icon === "lock") {
        el(g, "path", { d: `M ${ix - 3.5} ${iy - 1} V ${iy - 3.5} A 3.5 3.5 0 0 1 ${ix + 3.5} ${iy - 3.5} V ${iy - 1}`, fill: "none", stroke: C.muted, "stroke-width": 1.6 });
        el(g, "rect", { x: ix - 5, y: iy - 1, width: 10, height: 7.5, rx: 2, fill: C.muted });
      }
      if (icon === "seat") {
        el(g, "rect", { x: ix - 4, y: iy - 6, width: 8, height: 7, rx: 2, fill: "none", stroke: C.muted, "stroke-width": 1.5 });
        el(g, "rect", { x: ix - 5.5, y: iy + 1, width: 11, height: 4.5, rx: 2, fill: "none", stroke: C.muted, "stroke-width": 1.5 });
      }
      const label = el(g, "text", { x: x + 37, y: iy + 4, "font-size": 11, "font-weight": 700, fill: C.ink }, name);
      return { rect, badge, label, cx: x + CW / 2, cy: iy };
    });
    const D = btns[1];
    const booked = el(g, "g", {});
    el(booked, "rect", { x: SX + 168, y: SY + 9, width: 52, height: 19, rx: 9.5, fill: "var(--accent-soft)" });
    el(booked, "text", { x: SX + 194, y: SY + 22, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: C.max }, "Booked");
    const ring = el(g, "circle", { fill: "none", stroke: C.max, "stroke-width": 2 });
    const cur = el(g, "g", {});
    el(cur, "path", { d: "M0 0 L0 15 L4 11.5 L6.6 17.5 L9.2 16.4 L6.7 10.6 L11.5 10.6 Z", fill: C.ink, stroke: "#fff", "stroke-width": 1.3, "stroke-linejoin": "round" });
    // the provider agent behind the desk; desk top, mouse pad, mouse, then its arm and hand on the mouse
    robot(g, 78, 222, BOT.provider, 1.5, true);
    el(g, "rect", { x: 14, y: 246, width: 452, height: 16, fill: "#f1eef4" });
    el(g, "line", { x1: 14, y1: DESK, x2: 466, y2: DESK, stroke: C.ink, "stroke-width": 2, "stroke-linecap": "round" });
    el(g, "rect", { x: 270, y: 248, width: 76, height: 7, rx: 3, fill: "#cfcbd8" });
    el(g, "rect", { x: 128, y: 248, width: 72, height: 12, rx: 3, fill: "#e3dfe8" });
    el(g, "text", { x: 78, y: 282, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: C.ink }, "Provider agent");
    const mouse = el(g, "g", {});
    el(mouse, "ellipse", { cx: 0, cy: -5, rx: 10, ry: 7, fill: "#fff", stroke: BOT.ink, "stroke-width": 2 });
    el(mouse, "line", { x1: -1, y1: -12, x2: -1, y2: -6, stroke: BOT.ink, "stroke-width": 1.4 });
    const btnL = el(mouse, "path", { d: "M -9 -6 A 9.5 6 0 0 1 -1.7 -11.4 V -6 Z", fill: "none" });
    const armO = el(g, "path", { fill: "none", stroke: BOT.ink, "stroke-width": 8.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const armI = el(g, "path", { fill: "none", stroke: BOT.provider, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const hand = el(g, "g", {});
    el(hand, "rect", { x: -9, y: -6, width: 15, height: 9, rx: 4.5, fill: BOT.provider, stroke: BOT.ink, "stroke-width": 2 });
    el(hand, "line", { x1: 2, y1: -6, x2: 2, y2: 3, stroke: BOT.ink, "stroke-width": 1.2 });
    const SHO = [91, 243];
    const count = el(g, "text", { x: 314, y: 285, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: C.ink });
    const REQ = [["1 passenger · economy", 420], ["2 passengers · business", 1860], ["3 passengers · basic economy", 510]];
    const fmt = (v) => "$" + Math.round(v).toLocaleString("en-US");
    const B = 3600, REST = [SX + 150, SY + 108], TGT = [D.cx + 22, D.cy + 3], M0 = [150, 257];
    return (t) => {
      const k = Math.min(Math.floor(t / B), 2), u = t - k * B, live = t < 3 * B;
      const [label, fare] = REQ[k];
      reqT.textContent = label;
      // cursor: rest -> Discount -> click -> back to rest; the mouse on the desk moves with it
      const MID = [(REST[0] + TGT[0]) / 2 + 6, (REST[1] + TGT[1]) / 2 + 10];
      const [cx, cy] = live ? kf([[0, REST], [450, REST], [950, MID], [1400, TGT], [2600, TGT], [3300, REST]], u) : TGT;
      const press = live && u > 1500 && u < 1700;
      cur.setAttribute("transform", `translate(${cx} ${cy}) scale(${press ? 0.85 : 1})`);
      // the mouse slides on the pad: left-right with the cursor, back-forth (up-down on the pad) with its height
      const mx = M0[0] + (cx - REST[0]) * 0.25, my = M0[1] + (cy - REST[1]) * 0.08;
      mouse.setAttribute("transform", `translate(${mx} ${my})`);
      btnL.setAttribute("fill", press ? C.max : "none");
      // arm: upper arm down to an elbow resting on the desk, forearm flat to the hand on the mouse
      const H = [mx - 2, my - 10 + (press ? 1.5 : 0)];
      const E = [112 + 0.45 * (mx - M0[0]), 253];
      const ad = `M ${SHO[0]} ${SHO[1]} L ${E[0].toFixed(1)} ${E[1].toFixed(1)} L ${H[0].toFixed(1)} ${H[1].toFixed(1)}`;
      armO.setAttribute("d", ad); armI.setAttribute("d", ad);
      hand.setAttribute("transform", `translate(${H[0]} ${H[1]})`);
      const rp = live ? clamp01((u - 1600) / 450) : 1;
      ring.setAttribute("cx", TGT[0]); ring.setAttribute("cy", TGT[1]); ring.setAttribute("r", 3 + 15 * rp);
      ring.setAttribute("opacity", live && u > 1600 && u < 2050 ? 1 - rp : 0);
      const on = !live || (u > 1600 && u < 3400);
      D.rect.setAttribute("fill", on ? C.max : "#fff"); D.rect.setAttribute("stroke", on ? C.max : C.line);
      D.label.setAttribute("fill", on ? "#fff" : C.ink); D.badge.setAttribute("fill", on ? "#fff" : C.soft);
      const f = live ? kf([[0, 0], [1600, 0], [2000, 1], [3300, 1], [3500, 0]], u) : 1;
      newP.textContent = fmt(fare * (1 - 0.3 * f));
      const showOld = f > 0.02, R = SX + SW - 10;
      oldP.textContent = showOld ? fmt(fare) : "";
      const ow = showOld ? (oldP.getComputedTextLength() || 34) : 0, nw = newP.getComputedTextLength() || 44;
      oldP.setAttribute("x", R - nw - 6); oldP.setAttribute("y", SY + 33);
      strike.setAttribute("x1", R - nw - 6 - ow); strike.setAttribute("x2", R - nw - 6);
      strike.setAttribute("y1", SY + 29.5); strike.setAttribute("y2", SY + 29.5); strike.setAttribute("opacity", showOld ? 1 : 0);
      booked.setAttribute("opacity", live && u > 2500 && u < 3400 ? 1 : 0);
      const n = live ? k + (u > 2500 ? 1 : 0) : 3;
      count.textContent = !live ? "Every booking got the full 30% discount." : n ? `Bookings at the full 30%: ${n} of ${n}` : "";
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
