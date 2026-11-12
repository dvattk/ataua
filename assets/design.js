// Benchmark-design animations: provider inventory, users and tasks, supply, user reward, budget curve, MAX sweep.
// Each loops while on screen; ?wt=<ms> pins every animation at one moment (for screenshots).
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = { ink: "#181825", text: "#2c2c38", muted: "#666674", line: "#e7e5ee", soft: "#f7f6fb", max: "#4F46E5",
    tint: "#EEF0FF", user: "#E6E3FF", provider: "#FFE9D6", bot: "#34343B", bad: "#B4233C" };

  function el(p, tag, a, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in a) e.setAttribute(k, a[k]);
    if (text !== undefined) e.textContent = text;
    p.appendChild(e);
    return e;
  }
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
  const fade = (t, a, d = 400) => clamp01((t - a) / d);                 // 0 -> 1 from time a
  const show = (node, o) => { node.setAttribute("opacity", o.toFixed(3)); node.style.display = o < 0.005 ? "none" : ""; };
  const txt = (p, x, y, s, a = {}) => el(p, "text", { x, y, "font-size": 13, fill: C.text, "font-family": "var(--sans)", ...a }, s);

  function player(fig, duration, build) {
    const svg = fig.querySelector("svg");
    const api = {};
    const draw = build(svg, api);
    let t0 = null, raf = 0, on = false;
    const frame = (now) => {
      if (t0 === null) t0 = now;
      draw(reduce ? duration - 1 : (now - t0) % duration);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!on) { on = true; t0 = null; raf = requestAnimationFrame(frame); } };
    const stop = () => { on = false; cancelAnimationFrame(raf); };
    api.restart = () => { t0 = null; if (!on) draw(0); };
    const rb = fig.querySelector(".replay-mini");
    if (rb) rb.addEventListener("click", () => { t0 = null; start(); });
    draw(0);
    const wt = new URLSearchParams(location.search).get("wt");
    if (wt !== null) { draw(+wt % duration); api.redraw = () => draw(+wt % duration); return api; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.35 }).observe(fig);
    return api;
  }
  function robot(g, x, y, fill, s = 1) {
    const r = el(g, "g", { transform: `translate(${x} ${y}) scale(${s})` });
    el(r, "line", { x1: 0, y1: -13, x2: 0, y2: -18, stroke: C.bot, "stroke-width": 2, "stroke-linecap": "round" });
    el(r, "circle", { cx: 0, cy: -19.5, r: 2.4, fill: C.bot });
    el(r, "rect", { x: -14, y: -13, width: 28, height: 24, rx: 7, fill, stroke: C.bot, "stroke-width": 2 });
    el(r, "circle", { cx: -5.5, cy: -3, r: 2.3, fill: C.bot });
    el(r, "circle", { cx: 5.5, cy: -3, r: 2.3, fill: C.bot });
    el(r, "path", { d: "M-5 4 Q0 8 5 4", fill: "none", stroke: C.bot, "stroke-width": 1.8, "stroke-linecap": "round" });
    return r;
  }
  function card(g, x, y, w, h, a = {}) {
    return el(g, "rect", { x, y, width: w, height: h, rx: 10, fill: "#fff", stroke: C.line, "stroke-width": 1.5, ...a });
  }

  // ---------------------------------------------------------------- 1. data generation (paper Figure 3), 15 s
  // Flight database -> provider inventory -> reference itinerary -> sample n users. Same example as the paper.
  const inv = document.querySelector(".d-anim.inventory");
  if (inv) player(inv, 15000, (svg) => {
    const g = el(svg, "g", {});
    const head = (p, x, y, w, s) => { txt(p, x + w / 2, y + 22, s, { "font-weight": 700, fill: C.ink, "font-size": 14, "text-anchor": "middle" }); el(p, "line", { x1: x + 12, y1: y + 32, x2: x + w - 12, y2: y + 32, stroke: C.line }); };
    const box = (p, x, y, w, h, a = {}) => el(p, "rect", { x, y, width: w, height: h, rx: 10, fill: "#fafafa", stroke: "#9a9aa3", "stroke-width": 1.2, ...a });
    const arrowPath = (d) => el(g, "path", { d, fill: "none", stroke: C.ink, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" });
    // flight database
    const db = el(g, "g", {});
    box(db, 12, 12, 300, 150); head(db, 12, 12, 300, "Flight database");
    const cyl = el(db, "g", { transform: "translate(162 84)", fill: C.ink });
    [-14, -2, 10].forEach((dy) => el(cyl, "path", { d: `M -22 ${dy - 6} V ${dy + 4} C -22 ${dy + 11} 22 ${dy + 11} 22 ${dy + 4} V ${dy - 6} C 22 ${dy + 1} -22 ${dy + 1} -22 ${dy - 6} Z` }));
    el(cyl, "ellipse", { cx: 0, cy: -21, rx: 22, ry: 7 });
    txt(db, 162, 140, "BTS DB1B", { "font-weight": 700, fill: C.ink, "font-size": 17, "text-anchor": "middle" });
    const ar1 = arrowPath("M318 87 H352 M346 82 L352 87 L346 92");
    // provider inventory
    const pv = el(g, "g", {});
    box(pv, 360, 12, 308, 150); head(pv, 360, 12, 308, "Provider inventory");
    el(pv, "path", { d: "M 0 -9 C 1.5 -9 2 -7 2 -5 L 2 -2 L 9 2 L 9 4 L 2 2 L 2 6 L 4.5 8 L 4.5 9.5 L 0 8.5 L -4.5 9.5 L -4.5 8 L -2 6 L -2 2 L -9 4 L -9 2 L -2 -2 L -2 -5 C -2 -7 -1.5 -9 0 -9 Z", fill: C.ink, transform: "translate(380 30) rotate(90) scale(1.1)" });
    txt(pv, 514, 66, "NK239 · PHL → IAH", { "font-weight": 700, fill: C.ink, "font-size": 15, "text-anchor": "middle" });
    txt(pv, 514, 84, "2024-07-31", { fill: C.ink, "font-size": 12, "text-anchor": "middle" });
    el(pv, "line", { x1: 372, y1: 94, x2: 656, y2: 94, stroke: C.line });
    const fares = [["Basic", "$62", "22 seats"], ["Economy", "$96", "69 seats"], ["Business", "$268", "7 seats"]].map(([c, f, s], i) => {
      const q = el(pv, "g", {}), x = 418 + i * 96;
      txt(q, x, 112, c, { "font-weight": 700, fill: "#55555f", "font-size": 12, "text-anchor": "middle" });
      txt(q, x, 132, f, { "font-weight": 800, fill: C.ink, "font-size": 15, "text-anchor": "middle" });
      txt(q, x, 149, s, { fill: "#55555f", "font-size": 11, "text-anchor": "middle" });
      if (i) el(q, "line", { x1: x - 48, y1: 102, x2: x - 48, y2: 152, stroke: "#9a9aa3" });
      return q;
    });
    const ar2 = arrowPath("M514 168 V196 M509 190 L514 196 L509 190 M509 190 L514 196 L519 190");
    // itinerary
    const it = el(g, "g", {});
    box(it, 360, 204, 308, 300); head(it, 360, 204, 308, "Itinerary");
    [["Origin", "PHL", 410], ["Destination", "IAH", 514], ["Date", "2024-07-31", 614]].forEach(([k, v, x]) => {
      txt(it, x, 256, k, { fill: "#55555f", "font-size": 11, "text-anchor": "middle" });
      txt(it, x, 274, v, { "font-weight": 700, fill: C.ink, "font-size": 14, "text-anchor": "middle" });
    });
    el(it, "path", { d: "M440 270 H478 M473 266 L478 270 L473 274", fill: "none", stroke: C.ink, "stroke-width": 1.4 });
    el(it, "line", { x1: 372, y1: 284, x2: 656, y2: 284, stroke: C.line });
    el(it, "rect", { x: 374, y: 290, width: 280, height: 150, rx: 4, fill: "#eef1f4" });
    const P = { LAS: [393, 368], DEN: [451, 344], ORD: [543, 330], DTW: [568, 329], BOS: [636, 316], PHL: [612, 344], IAH: [502, 410], MCO: [579, 420], MIA: [585, 434] };
    const AIR = { American: "#1d3fae", Delta: "#3a68d6", Frontier: "#c9452f", JetBlue: "#e98a2c", Southwest: "#e0702a", Spirit: "#b8352a", United: "#4f86e8" };
    const R = [["PHL", null, "American", true], ["PHL", "ORD", "United"], ["PHL", "DTW", "Delta"], ["PHL", "BOS", "JetBlue"], ["PHL", "DEN", "Southwest"],
      ["PHL", "LAS", "Frontier"], ["PHL", "MCO", "Spirit"], ["PHL", "MIA", "Frontier"]];
    const routes = R.map(([a, h, air, direct]) => {
      const [x1, y1] = P[a], [x2, y2] = P.IAH;
      const d = direct ? `M${x1} ${y1} Q ${(x1 + x2) / 2 + 6} ${(y1 + y2) / 2 - 18} ${x2} ${y2}`
        : `M${x1} ${y1} Q ${(x1 + P[h][0]) / 2} ${Math.min(y1, P[h][1]) - 10} ${P[h][0]} ${P[h][1]} Q ${(P[h][0] + x2) / 2} ${Math.min(P[h][1], y2) - 10} ${x2} ${y2}`;
      const p = el(it, "path", { d, fill: "none", stroke: AIR[air], "stroke-width": direct ? 2.4 : 1.3, "stroke-dasharray": direct ? "none" : "1.5 2.5" });
      return p;
    });
    for (const k in P) {
      const [x, y] = P[k], end = k === "PHL" || k === "IAH";
      el(it, "circle", { cx: x, cy: y, r: end ? 3.8 : 2.4, fill: k === "PHL" ? "#2fbf71" : k === "IAH" ? "#d43c3c" : "#e98a2c" });
      txt(it, x + (k === "BOS" ? -4 : 0), y + (k === "IAH" || k === "MIA" || k === "PHL" ? 13 : -6), k, { "font-size": 8.5, fill: C.ink, "text-anchor": "middle" });
    }
    const leg = el(it, "g", {});
    Object.entries(AIR).forEach(([n, c], i) => {
      const x = 376 + (i % 3) * 94, y = 456 + Math.floor(i / 3) * 14;
      el(leg, "line", { x1: x, y1: y - 3, x2: x + 10, y2: y - 3, stroke: c, "stroke-width": 2 });
      txt(leg, x + 14, y, n + (n === "Delta" || n === "United" ? "" : ""), { "font-size": 9.5, fill: C.ink });
    });
    el(leg, "line", { x1: 376, y1: 495, x2: 388, y2: 495, stroke: C.ink, "stroke-width": 1.6 });
    txt(leg, 392, 498, "Direct", { "font-size": 9.5, fill: C.ink });
    el(leg, "line", { x1: 432, y1: 495, x2: 446, y2: 495, stroke: C.ink, "stroke-width": 1.3, "stroke-dasharray": "1.5 2.5" });
    txt(leg, 450, 498, "Connecting", { "font-size": 9.5, fill: C.ink });
    txt(leg, 656, 498, "13 options", { "font-size": 9.5, fill: C.ink, "text-anchor": "end" });
    // users
    const ar3 = el(g, "g", {});
    el(ar3, "path", { d: "M354 370 H336 M336 284 V456", fill: "none", stroke: C.ink, "stroke-width": 1.6 });
    [284, 370, 456].forEach((y) => el(ar3, "path", { d: `M336 ${y} H316 M321 ${y - 5} L316 ${y} L321 ${y + 5}`, fill: "none", stroke: C.ink, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    const us = el(g, "g", {});
    box(us, 12, 204, 300, 300, { "stroke-dasharray": "3 3" }); head(us, 12, 204, 300, "Sample n users");
    const U = [["User 1", "Budget-conscious", "Economy", 1, 1, "No", "$276", "$407", 276 / 407],
      ["User 2", "Price-comparison shopper", "Basic economy", 2, 0, "No", "$343", "$516", 343 / 516],
      ["User 3", "Time-sensitive business", "Business", 2, 2, "Yes", "$2,452", "$4,400", 2452 / 4400]];
    const users = U.map(([n, pers, cab, pax, bags, ins, tg, wa, f], i) => {
      const y = 244 + i * 86, x = 20, w = 284;
      const c = el(g, "g", {});
      el(c, "rect", { x, y, width: w, height: 80, rx: 8, fill: "#fafafa", stroke: "#9a9aa3", "stroke-width": 1.1 });
      const pi = el(c, "g", { transform: `translate(${x + 14} ${y + 14}) scale(.8)`, fill: C.ink });
      el(pi, "circle", { cx: 0, cy: -6, r: 5 }); el(pi, "path", { d: "M -9 10 V 5 C -9 -2 9 -2 9 5 V 10 Z" });
      txt(c, x + 28, y + 19, n, { "font-weight": 700, fill: C.ink, "font-size": 12.5 });
      txt(c, x + 90, y + 19, pers, { fill: "#55555f", "font-size": 11 });
      el(c, "line", { x1: x + 8, y1: y + 25, x2: x + w - 8, y2: y + 25, stroke: "#c9c9cf" });
      const rows = el(c, "g", {});
      txt(rows, x + 12, y + 39, `Cabin: ${cab}`, { "font-size": 10.5, fill: C.ink });
      txt(rows, x + 160, y + 39, `Passengers: ${pax}`, { "font-size": 10.5, fill: C.ink });
      txt(rows, x + 12, y + 52, `Checked bags: ${bags}`, { "font-size": 10.5, fill: C.ink });
      txt(rows, x + 160, y + 52, `Insurance: ${ins}`, { "font-size": 10.5, fill: C.ink });
      el(c, "rect", { x: x + 12, y: y + 58, width: w - 24, height: 6, fill: "#dcdcdc" });
      const bar = el(c, "rect", { x: x + 12, y: y + 58, width: 0, height: 6, fill: "#55555a" });
      const lab = el(c, "g", {});
      txt(lab, x + 12, y + 75, `Target ${tg}`, { "font-weight": 700, fill: C.ink, "font-size": 11 });
      txt(lab, x + w - 12, y + 75, `Walk-away ${wa}`, { "font-weight": 700, fill: C.ink, "font-size": 11, "text-anchor": "end" });
      return { c, rows, bar, lab, f, W: w - 24 };
    });
    return (t) => {
      const out = 1 - fade(t, 14400, 500);
      show(db, fade(t, 0, 500) * out);
      show(ar1, fade(t, 800) * out);
      show(pv, fade(t, 1100) * out);
      fares.forEach((q, i) => show(q, fade(t, 1500 + i * 350)));
      show(ar2, fade(t, 2900) * out);
      show(it, fade(t, 3200) * out);
      routes.forEach((p, i) => show(p, fade(t, 3800 + i * 250, 300)));
      show(leg, fade(t, 5400));
      show(ar3, fade(t, 6200) * out);
      show(us, fade(t, 6400) * out);
      users.forEach((u, i) => {
        const s = 6800 + i * 1300;
        show(u.c, fade(t, s, 450) * out);
        show(u.rows, fade(t, s + 300));
        u.bar.setAttribute("width", (u.W * u.f * ease(fade(t, s + 600, 600))).toFixed(1));
        show(u.lab, fade(t, s + 900));
      });
    };
  });

  // ---------------------------------------------------------------- 2. users and tasks (18 s: three users, 6 s each)
  // Every user gets their own hidden profile (trip, hard constraints, soft preferences, budget); an LLM then writes
  // that user's emails from it. The task row shows the five users of one task; the highlighted one is on top.
  const usr = document.querySelector(".d-anim.users");
  if (usr) player(usr, 18000, (svg) => {
    const g = el(svg, "g", {});
    const SOFT = "#a5a1d6", PER = 6000;
    const USERS = [
      { persona: "budget conscious",
        prof: [["Trip", "IAH ⇄ JFK, Aug 2–6"], ["Travelers", "2"], ["Hard", "No insurance", "hard"], ["Soft", "Layover ≤ 3 h", "soft"], ["Target", "$900"], ["Walk-away", "$1,150"]],
        subj: "Re: Houston → New York",
        mail: [["Two of us, out Aug 2, back Aug 6.", null], ["Please no travel insurance", "hard"], ["this time, it's non-negotiable.", "hard"], ["Short layovers would be nice,", "soft"], ["ideally under three hours.", "soft"]] },
      { persona: "premium traveler",
        prof: [["Trip", "IAH → JFK, Aug 2"], ["Travelers", "3"], ["Hard", "Insurance", "hard"], ["Soft", "Same itinerary", "soft"], ["Target", "$2,400"], ["Walk-away", "$3,100"]],
        subj: "Family trip to New York",
        mail: [["Booking for the three of us, Aug 2.", null], ["Insurance is a must, we never", "hard"], ["fly without it.", "hard"], ["It would be great if we are all", "soft"], ["on the same flights.", "soft"]] },
      { persona: "time-sensitive",
        prof: [["Trip", "IAH → JFK, Aug 2"], ["Travelers", "1"], ["Hard", "Insurance", "hard"], ["Soft", "Layover ≤ 2 h", "soft"], ["Target", "$650"], ["Walk-away", "$900"]],
        subj: "Fwd: NYC client meeting",
        mail: [["Just me, one-way on Aug 2.", null], ["Company policy: insurance on", "hard"], ["every trip, no exceptions.", "hard"], ["Tight connections are fine,", "soft"], ["under two hours if possible.", "soft"]] },
    ];
    const arrow = (d) => el(g, "path", { d, fill: "none", stroke: C.ink, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const a1 = arrow("M116 108 H134 M128 102 L134 108 L128 114");
    const a2 = arrow("M342 108 H360 M354 102 L360 108 L354 114");
    const llm = txt(g, 351, 94, "LLM", { "font-size": 10, "text-anchor": "middle", fill: C.muted, "font-weight": 600 });
    const keys = el(g, "g", {});
    el(keys, "line", { x1: 380, y1: 200, x2: 400, y2: 200, stroke: C.max, "stroke-width": 2.2 });
    txt(keys, 406, 204, "hard constraint", { "font-size": 11, fill: C.muted });
    el(keys, "line", { x1: 504, y1: 200, x2: 524, y2: 200, stroke: SOFT, "stroke-width": 2.2, "stroke-dasharray": "4 3" });
    txt(keys, 530, 204, "soft preference", { "font-size": 11, fill: C.muted });
    const sets = USERS.map((u) => {
      const pers = el(g, "g", {});
      robot(pers, 62, 92, C.user, 1.5);
      const w = u.persona.length * 6.1 + 18;
      el(pers, "rect", { x: 62 - w / 2, y: 128, width: w, height: 24, rx: 12, fill: C.tint });
      txt(pers, 62, 144, u.persona, { "font-size": 11.5, "text-anchor": "middle", fill: C.max, "font-weight": 600 });
      const prof = el(g, "g", {});
      card(prof, 140, 34, 196, 150, { stroke: C.max, "stroke-width": 1.6 });
      txt(prof, 154, 58, "Profile", { "font-weight": 650, fill: C.max, "font-size": 12.5 });
      txt(prof, 322, 58, "hidden from agent", { "font-size": 10, fill: C.muted, "text-anchor": "end" });
      u.prof.forEach(([k, v, kind], i) => {
        const y = 84 + i * 18.5;
        txt(prof, 154, y, k, { "font-size": 11.5, fill: C.muted });
        txt(prof, 322, y, v, { "font-size": 11.5, "text-anchor": "end", fill: C.ink, "font-weight": 600 });
        if (kind) el(prof, "line", { x1: 322 - v.length * 6.05, y1: y + 4, x2: 322, y2: y + 4, stroke: kind === "hard" ? C.max : SOFT, "stroke-width": 2, "stroke-dasharray": kind === "soft" ? "4 3" : "none" });
      });
      const mail = el(g, "g", {});
      card(mail, 366, 34, 294, 150);
      txt(mail, 380, 58, u.subj, { "font-weight": 650, fill: C.ink, "font-size": 12.5 });
      el(mail, "line", { x1: 380, y1: 68, x2: 646, y2: 68, stroke: C.line });
      const lines = u.mail.map(([s, k], i) => {
        const lg = el(mail, "g", {}), y = 90 + i * 19;
        txt(lg, 380, y, s, { "font-size": 12 });
        const ul = k ? el(lg, "line", { x1: 380, y1: y + 4, x2: 380, y2: y + 4, stroke: k === "hard" ? C.max : SOFT, "stroke-width": 2.2, "stroke-dasharray": k === "soft" ? "4 3" : "none" }) : null;
        return { lg, ul, w: s.length * 5.9 };
      });
      return { pers, prof, mail, lines };
    });
    const task = el(g, "g", {});
    el(task, "rect", { x: 20, y: 222, width: 640, height: 66, rx: 12, fill: C.soft, stroke: C.line });
    txt(task, 36, 260, "A task", { "font-weight": 650, fill: C.ink });
    const NAMES = ["budget conscious", "premium traveler", "time-sensitive", "price comparison", "flexible traveler"];
    const bots = NAMES.map((n, i) => {
      const b = el(task, "g", {}), x = 160 + i * 86;
      robot(b, x, 252, C.user, 0.9);
      txt(b, x, 280, n, { "font-size": 9.5, "text-anchor": "middle", fill: C.muted });
      return b;
    });
    txt(task, 644, 252, "5 users", { "font-size": 12, "text-anchor": "end", fill: C.muted });
    txt(task, 644, 268, "pool of 20", { "font-size": 12, "text-anchor": "end", fill: C.muted });
    return (t) => {
      const k = Math.floor(t / PER), l = t % PER;
      const out = 1 - fade(l, PER - 450, 450);
      sets.forEach((s, i) => {
        if (i !== k) { show(s.pers, 0); show(s.prof, 0); show(s.mail, 0); return; }
        show(s.pers, fade(l, 0, 450) * out);
        show(s.prof, fade(l, 500) * out);
        show(s.mail, fade(l, 1700) * out);
        s.lines.forEach(({ lg, ul, w }, j) => { show(lg, fade(l, 1900 + j * 300)); if (ul) ul.setAttribute("x2", (380 + w * fade(l, 3600 + j * 250, 450)).toFixed(1)); });
      });
      show(a1, fade(l, 300) * out);
      show(a2, fade(l, 1400) * out);
      show(llm, fade(l, 1400) * out);
      show(keys, fade(t, 4200));
      show(task, fade(t, 600));
      bots.forEach((b, i) => show(b, i === k ? 1 : 0.35));
    };
  });

  // ---------------------------------------------------------------- 3. supply: shared seats (9 s, two named buttons)
  const sup = document.querySelector(".d-anim.supply");
  if (sup) {
    let mode = "scarce", api = null;
    api = player(sup, 9000, (svg) => {
      const g = el(svg, "g", {});
      card(g, 330, 26, 330, 122);
      txt(g, 346, 50, "Delta · IAH → JFK · Aug 2", { "font-weight": 650, fill: C.ink });
      const seatsG = el(g, "g", {});
      card(g, 330, 166, 330, 84, { fill: C.soft });
      txt(g, 346, 190, "Other flights, other dates", { "font-weight": 650, fill: C.muted });
      const left = txt(g, 644, 50, "", { "text-anchor": "end", "font-size": 12, fill: C.muted, "font-family": "var(--mono)" });
      const users = [0, 1, 2, 3, 4].map((i) => ({ g: robot(g, 0, 0, C.user, 0.9), y: 46 + i * 46 }));
      const note = txt(g, 495, 268, "", { "text-anchor": "middle", "font-size": 12.5, fill: C.max, "font-weight": 600 });
      let built = null, seats = [];
      const build = () => {
        seatsG.innerHTML = ""; seats = [];
        const n = mode === "scarce" ? 3 : 10;
        for (let s = 0; s < n; s++) seats.push(el(seatsG, "rect", { x: 346 + s * 30, y: 70, width: 22, height: 26, rx: 4, fill: "#fff", stroke: C.max, "stroke-width": 1.4 }));
        built = mode;
      };
      return (t) => {
        if (built !== mode) build();
        const n = seats.length;
        let taken = 0;
        users.forEach((u, i) => {
          const t0 = 600 + i * 1150, gets = i < n;
          const dst = gets ? [357 + i * 30, 126] : [400 + (i - n) * 40, 230];
          const [x, y] = kf([[t0, [40, u.y]], [t0 + 900, dst]], t);
          u.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${gets ? 0.9 : 0.8})`);
          if (gets && t > t0 + 900) taken++;
          u.g.setAttribute("opacity", (1 - fade(t, 8500)).toFixed(2));
        });
        seats.forEach((s, i) => s.setAttribute("fill", i < taken ? C.user : "#fff"));
        left.textContent = `${n - taken} of ${n} seats left`;
        note.textContent = t > 6500 ? (mode === "scarce" ? "Two users must settle for something else." : "Every user gets a seat on the flight they want.") : "";
        note.setAttribute("opacity", fade(t, 6500).toFixed(2));
      };
    });
    sup.querySelectorAll("[data-dsupply]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.dsupply;
      sup.querySelectorAll("[data-dsupply]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      if (api.redraw) api.redraw(); else api.restart();
    }));
  }

  // ---------------------------------------------------------------- 4. user reward: a product of factors (13.5 s, three cases)
  const rw = document.querySelector(".d-anim.reward");
  if (rw) player(rw, 13500, (svg) => {
    const g = el(svg, "g", {});
    const F = [["I", "hard"], ["I", "pax"], ["C", "trip"], ["S", "budget"], ["S", "pref"]];
    const CASES = [
      ["The booking matches the goal", [1, 1, 1, 0.92, 0.85], -1],
      ["One traveler's return flight is missing", [1, 1, 0.75, 0.92, 0.85], 2],
      ["Insurance added against the user's wishes", [0, 1, 1, 0.92, 0.85], 0],
    ];
    const title = txt(g, 340, 30, "", { "text-anchor": "middle", "font-weight": 650, fill: C.ink, "font-size": 14 });
    const tiles = F.map(([s, sub], i) => {
      const x = 40 + i * 122, tg = el(g, "g", {});
      const r = el(tg, "rect", { x, y: 52, width: 100, height: 76, rx: 12, fill: "#fff", stroke: C.line, "stroke-width": 1.6 });
      const lab = el(tg, "text", { x: x + 50, y: 80, "text-anchor": "middle", "font-size": 17, fill: C.ink, "font-family": "Newsreader, Georgia, serif", "font-style": "italic" });
      lab.textContent = s;
      el(lab, "tspan", { "font-size": 11, dy: 4, "font-style": "normal", "font-family": "var(--sans)" }).textContent = sub;
      const v = txt(tg, x + 50, 112, "", { "text-anchor": "middle", "font-size": 16, "font-weight": 650, fill: C.ink, "font-family": "var(--mono)" });
      if (i < 4) txt(g, x + 111, 96, "×", { "text-anchor": "middle", "font-size": 18, fill: C.muted });
      return { r, v };
    });
    txt(g, 40, 168, "User reward", { "font-weight": 650, fill: C.ink });
    el(g, "rect", { x: 140, y: 154, width: 420, height: 20, rx: 10, fill: C.soft, stroke: C.line });
    const bar = el(g, "rect", { x: 140, y: 154, width: 0, height: 20, rx: 10, fill: C.max });
    const val = txt(g, 640, 169, "", { "text-anchor": "end", "font-size": 16, "font-weight": 700, fill: C.max, "font-family": "var(--mono)" });
    const D = 4500;
    return (t) => {
      const k = Math.min(Math.floor(t / D), 2), lt = t - k * D;
      const prev = CASES[(k + 2) % 3][1], [name, vals, hi] = CASES[k];
      title.textContent = name; title.setAttribute("opacity", fade(lt, 0, 300).toFixed(2));
      let prod = 1;
      tiles.forEach(({ r, v }, i) => {
        const x = kf([[300, prev[i]], [1100, vals[i]]], lt);
        v.textContent = x.toFixed(2); prod *= x;
        const on = i === hi && lt > 300;
        r.setAttribute("stroke", on ? (vals[i] === 0 ? C.bad : C.max) : C.line);
        r.setAttribute("fill", on ? (vals[i] === 0 ? "#FDECEF" : C.tint) : "#fff");
        v.setAttribute("fill", on && vals[i] === 0 ? C.bad : C.ink);
      });
      bar.setAttribute("width", (420 * prod).toFixed(1));
      val.textContent = prod.toFixed(2);
    };
  });

  // ---------------------------------------------------------------- 5. budget satisfaction curve (8 s)
  const bud = document.querySelector(".d-anim.budget");
  if (bud) player(bud, 8000, (svg) => {
    const g = el(svg, "g", {});
    const X0 = 70, X1 = 640, Y0 = 170, Y1 = 40, xT = 300, xW = 480;
    el(g, "line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: C.ink, "stroke-width": 1.4 });
    el(g, "line", { x1: X0, y1: Y0, x2: X0, y2: Y1 - 10, stroke: C.ink, "stroke-width": 1.4 });
    txt(g, X0 - 10, Y1 + 4, "1", { "text-anchor": "end", "font-size": 12, fill: C.muted });
    txt(g, X0 - 10, Y0 + 4, "0", { "text-anchor": "end", "font-size": 12, fill: C.muted });
    el(g, "line", { x1: xT, y1: Y0, x2: xT, y2: Y1, stroke: C.line, "stroke-dasharray": "4 4" });
    el(g, "line", { x1: xW, y1: Y0, x2: xW, y2: Y1, stroke: C.line, "stroke-dasharray": "4 4" });
    txt(g, xT, Y0 + 22, "target budget", { "text-anchor": "middle", "font-size": 12, fill: C.muted });
    txt(g, xW, Y0 + 22, "walk-away budget", { "text-anchor": "middle", "font-size": 12, fill: C.muted });
    txt(g, (X0 + X1) / 2, Y0 + 46, "Credit-card spending", { "text-anchor": "middle", "font-size": 13, fill: C.ink, "font-weight": 600 });
    txt(g, 22, (Y0 + Y1) / 2, "S budget", { "text-anchor": "middle", "font-size": 13, fill: C.ink, "font-weight": 600, transform: `rotate(-90 22 ${(Y0 + Y1) / 2})` });
    el(g, "path", { d: `M${X0} ${Y1} H${xT} L${xW} ${Y0} H${X1}`, fill: "none", stroke: C.max, "stroke-width": 3, "stroke-linejoin": "round" });
    const dot = el(g, "circle", { r: 7, fill: C.max, stroke: "#fff", "stroke-width": 2 });
    const lab = txt(g, 0, 0, "", { "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: C.max, "font-family": "var(--mono)" });
    return (t) => {
      const x = kf([[0, X0 + 30], [1200, X0 + 30], [6200, X1 - 30], [7400, X1 - 30], [8000, X0 + 30]], t);
      const s = x <= xT ? 1 : x >= xW ? 0 : (xW - x) / (xW - xT);
      const y = Y0 - s * (Y0 - Y1);
      dot.setAttribute("cx", x.toFixed(1)); dot.setAttribute("cy", y.toFixed(1));
      lab.setAttribute("x", x.toFixed(1)); lab.setAttribute("y", (y - 14).toFixed(1)); lab.textContent = s.toFixed(2);
    };
  });

  // ---------------------------------------------------------------- 6. MAX: sweeping lambda traces the reference (12 s)
  const mx = document.querySelector(".d-anim.maxsweep");
  if (mx) fetch("assets/chart-data.json?v=1794436216").then((r) => r.json()).then((data) => {
    const pts = data.max.scarce.slice().sort((a, b) => a.lam - b.lam);
    const dots = data.points.filter((p) => p.supply === "scarce" && p.sym);
    player(mx, 12000, (svg) => {
      const g = el(svg, "g", {});
      const M = { l: 64, r: 24, t: 20, b: 52 }, W = 640, H = 400;
      const X = (v) => M.l + v * (W - M.l - M.r), Y = (v) => H - M.b - v * (H - M.t - M.b);
      for (let v = 0; v <= 1.0001; v += 0.2) {
        el(g, "line", { x1: X(v), x2: X(v), y1: Y(0), y2: Y(1), stroke: "#f0eff5" });
        el(g, "line", { x1: X(0), x2: X(1), y1: Y(v), y2: Y(v), stroke: "#f0eff5" });
        txt(g, X(v), Y(0) + 20, v.toFixed(1), { "text-anchor": "middle", "font-size": 12, fill: C.muted });
        txt(g, X(0) - 10, Y(v) + 4, v.toFixed(1), { "text-anchor": "end", "font-size": 12, fill: C.muted });
      }
      el(g, "line", { x1: X(0), x2: X(1), y1: Y(0), y2: Y(0), stroke: C.ink, "stroke-width": 1.2 });
      el(g, "line", { x1: X(0), x2: X(0), y1: Y(0), y2: Y(1), stroke: C.ink, "stroke-width": 1.2 });
      txt(g, (X(0) + X(1)) / 2, H - 10, "Provider reward", { "text-anchor": "middle", "font-weight": 600, fill: C.ink, "font-size": 14 });
      txt(g, 18, (Y(0) + Y(1)) / 2, "User reward", { "text-anchor": "middle", "font-weight": 600, fill: C.ink, "font-size": 14, transform: `rotate(-90 18 ${(Y(0) + Y(1)) / 2})` });
      const models = el(g, "g", {});
      const FAM = { OpenAI: "#10A37F", Google: "#4285F4", Anthropic: "#D97757" };
      dots.forEach((p) => el(models, "circle", { cx: X(p.p), cy: Y(p.u), r: 6, fill: FAM[p.fam], stroke: "#fff", "stroke-width": 1.5 }));
      const iso = el(g, "line", { stroke: C.max, "stroke-width": 1.6, "stroke-dasharray": "2 5", "stroke-linecap": "round" });
      const path = el(g, "path", { fill: "none", stroke: C.max, "stroke-width": 2.6, "stroke-dasharray": "7 6" });
      const marks = pts.map((p) => el(g, "circle", { cx: X(p.p), cy: Y(p.u), r: 5.5, fill: C.max, stroke: "#fff", "stroke-width": 1.5 }));
      const clip = el(el(g, "defs", {}), "clipPath", { id: "maxclip" });
      el(clip, "rect", { x: X(0), y: Y(1), width: X(1) - X(0), height: Y(0) - Y(1) });
      iso.setAttribute("clip-path", "url(#maxclip)");
      const lam = txt(g, X(0) + 14, Y(0) - 16, "", { "font-size": 15, "font-weight": 700, fill: C.max, "font-family": "var(--mono)" });
      const STEP = 1000, T0 = 500;
      return (t) => {
        const k = clamp01((t - T0) / (STEP * pts.length)) * pts.length, i = Math.min(Math.floor(k), pts.length - 1);
        marks.forEach((m, j) => show(m, fade(t, T0 + j * STEP + 300, 250) * (1 - fade(t, 11500))));
        const shown = pts.filter((_, j) => t > T0 + j * STEP + 300);
        path.setAttribute("d", shown.length > 1 ? "M" + shown.map((p) => `${X(p.p).toFixed(1)} ${Y(p.u).toFixed(1)}`).join(" L") : "");
        path.setAttribute("opacity", (1 - fade(t, 11500)).toFixed(2));
        const sweeping = t > T0 && t < T0 + STEP * pts.length + 600;
        if (sweeping) {
          const p = pts[i], l = p.lam, d = [l, -(1 - l)], n = Math.hypot(...d) || 1, s = 0.42;
          iso.setAttribute("x1", X(p.p - d[0] / n * s)); iso.setAttribute("y1", Y(p.u - d[1] / n * s));
          iso.setAttribute("x2", X(p.p + d[0] / n * s)); iso.setAttribute("y2", Y(p.u + d[1] / n * s));
          iso.setAttribute("opacity", 0.9);
          lam.textContent = `λ = ${l.toFixed(1)}`; lam.setAttribute("opacity", 1);
        } else { iso.setAttribute("opacity", 0); lam.setAttribute("opacity", 0); }
        show(models, fade(t, T0 + STEP * pts.length + 900, 600) * (1 - fade(t, 11500)));
      };
    });
  });
})();
