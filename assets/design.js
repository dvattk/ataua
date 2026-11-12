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

  // ---------------------------------------------------------------- 1. inventory, then users sampled around one itinerary
  function buildInventory(g) {
    txt(g, 20, 26, "Observed fares (BTS DB1B)", { "font-weight": 650, fill: C.ink });
    txt(g, 400, 26, "Flight catalog", { "font-weight": 650, fill: C.ink });
    const AP = { SFO: [52, 110], LAX: [70, 170], DEN: [150, 112], ORD: [236, 82], IAH: [196, 196], ATL: [270, 172], PHL: [322, 92], JFK: [342, 64] };
    const R = [["SFO", "JFK"], ["LAX", "ORD"], ["DEN", "ATL"], ["IAH", "JFK"], ["ORD", "PHL"], ["LAX", "IAH"], ["SFO", "DEN"], ["ATL", "PHL"]];
    const routes = R.map(([a, b], i) => {
      const [x1, y1] = AP[a], [x2, y2] = AP[b], mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 26;
      const p = el(g, "path", { d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, fill: "none", stroke: i === 3 ? C.max : "#c9c6d8", "stroke-width": i === 3 ? 2.4 : 1.4 });
      const L = p.getTotalLength ? p.getTotalLength() : 300;
      p.setAttribute("stroke-dasharray", L); return { p, L, i };
    });
    for (const k in AP) {
      const [x, y] = AP[k];
      el(g, "circle", { cx: x, cy: y, r: 4.5, fill: C.ink });
      txt(g, x, y + 18, k, { "font-size": 11, "text-anchor": "middle", fill: C.muted, "font-family": "var(--mono)" });
    }
    const tag = el(g, "g", {});
    el(tag, "rect", { x: 150, y: 214, width: 196, height: 26, rx: 13, fill: C.tint });
    txt(tag, 248, 231, "IAH → JFK · median fare per airline", { "font-size": 12, "text-anchor": "middle", fill: C.max, "font-weight": 600 });
    const arrow = el(g, "g", {});
    el(arrow, "path", { d: "M362 140 H392 M384 133 L392 140 L384 147", fill: "none", stroke: C.ink, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const F = [["Delta", "DL 1021 · Aug 2 · 07:10", "$246", 6], ["United", "UA 388 · Aug 2 · 12:45", "$271", 4], ["Spirit", "NK 217 · Aug 3 · 09:30", "$139", 8]];
    const cards = F.map(([air, sub, fare, seats], i) => {
      const c = el(g, "g", {}), y = 44 + i * 62;
      card(c, 404, y, 256, 52);
      txt(c, 418, y + 21, air, { "font-weight": 650, fill: C.ink });
      txt(c, 418, y + 39, sub, { "font-size": 11.5, fill: C.muted });
      txt(c, 646, y + 21, fare, { "text-anchor": "end", "font-weight": 650, fill: C.ink, "font-family": "var(--mono)", "font-size": 12.5 });
      const seatG = el(c, "g", {});
      for (let s = 0; s < seats; s++) el(seatG, "rect", { x: 646 - (seats - s) * 11 + 2, y: y + 31, width: 8, height: 10, rx: 2, fill: C.user, stroke: C.max, "stroke-width": 1 });
      return { c, seatG };
    });
    const stat = el(g, "g", {});
    txt(stat, 532, 246, "1,746 itineraries · 44 airports · 23 airlines", { "font-size": 12, "text-anchor": "middle", fill: C.muted, "font-weight": 600 });
    return (t) => {
      routes.forEach(({ p, L, i }) => p.setAttribute("stroke-dashoffset", (L * (1 - clamp01((t - i * 260) / 700))).toFixed(1)));
      show(tag, fade(t, 2600) * (1 - fade(t, 11300)));
      show(arrow, fade(t, 3600) * (1 - fade(t, 11300)));
      cards.forEach(({ c, seatG }, i) => { show(c, fade(t, 4200 + i * 450) * (1 - fade(t, 11300))); show(seatG, fade(t, 5800 + i * 300)); });
      show(stat, fade(t, 7400) * (1 - fade(t, 11300)));
      routes.forEach(({ p }) => p.setAttribute("opacity", (1 - fade(t, 11300)).toFixed(2)));
    };
  }

  // ---------------------------------------------------------------- 2a. generating users around a reference itinerary (12 s)
  // Same example as the paper's data-generation figure: one sampled itinerary, then n users with persona-set attributes.
  function buildUserGen(g) {
    const person = (p, x, y, s = 1) => {
      const q = el(p, "g", { transform: `translate(${x} ${y}) scale(${s})`, fill: C.ink });
      el(q, "circle", { cx: 0, cy: -6, r: 4.6 });
      el(q, "path", { d: "M -9 10 V 5 C -9 -2 9 -2 9 5 V 10 Z" });
      return q;
    };
    // itinerary card
    const it = el(g, "g", {});
    card(it, 20, 22, 232, 256);
    txt(it, 36, 46, "Reference itinerary", { "font-weight": 650, fill: C.max, "font-size": 12.5 });
    el(it, "line", { x1: 36, y1: 56, x2: 236, y2: 56, stroke: C.line });
    txt(it, 66, 76, "Origin", { "font-size": 11, fill: C.muted, "text-anchor": "middle" });
    txt(it, 206, 76, "Destination", { "font-size": 11, fill: C.muted, "text-anchor": "middle" });
    txt(it, 66, 102, "IAH", { "font-size": 24, "font-weight": 700, fill: C.ink, "text-anchor": "middle" });
    txt(it, 206, 102, "JFK", { "font-size": 24, "font-weight": 700, fill: C.ink, "text-anchor": "middle" });
    el(it, "path", { d: "M112 94 H158 M152 89 L158 94 L152 99", fill: "none", stroke: C.ink, "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" });
    txt(it, 136, 128, "2024-08-02", { "font-size": 13, "font-weight": 600, fill: C.ink, "text-anchor": "middle" });
    const A = [46, 232], B = [226, 232];
    el(it, "circle", { cx: A[0], cy: A[1], r: 4, fill: "#2fbf71" });
    el(it, "circle", { cx: B[0], cy: B[1], r: 4, fill: C.bad });
    txt(it, A[0], A[1] + 18, "IAH", { "font-size": 10, fill: C.muted, "text-anchor": "middle" });
    txt(it, B[0], B[1] + 18, "JFK", { "font-size": 10, fill: C.muted, "text-anchor": "middle" });
    const COL = ["#1d4ed8", "#3b82f6", "#e07a2e", "#d4483b", "#e07a2e", "#3b82f6", "#d4483b"];
    const hubs = [[136, 196, true], [80, 156], [118, 148], [160, 152], [196, 162], [100, 182], [176, 186]];
    const routes = hubs.map(([hx, hy, direct], i) => {
      const d = direct ? `M${A[0]} ${A[1]} Q ${hx} ${hy} ${B[0]} ${B[1]}` : `M${A[0]} ${A[1]} Q ${(A[0] + hx) / 2} ${hy - 10} ${hx} ${hy} Q ${(hx + B[0]) / 2} ${hy - 10} ${B[0]} ${B[1]}`;
      const p = el(it, "path", { d, fill: "none", stroke: COL[i], "stroke-width": direct ? 2.2 : 1.4, "stroke-dasharray": direct ? "none" : "2 3", opacity: 0.9 });
      if (!direct) el(it, "circle", { cx: hx, cy: hy, r: 2.4, fill: COL[i] });
      return p;
    });
    txt(it, 36, 270, "direct · connecting", { "font-size": 10.5, fill: C.muted });
    const arr = el(g, "path", { d: "M262 150 H284 M278 144 L284 150 L278 156", fill: "none", stroke: C.ink, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const head = txt(g, 300, 14, "Sample n users", { "font-weight": 650, fill: C.ink, "font-size": 12.5 });
    // users
    const U = [
      ["User 1", "Budget-conscious", "Economy · 1 passenger · 1 checked bag · no insurance", "$276", "$407", 276 / 407],
      ["User 2", "Price-comparison shopper", "Basic economy · 2 passengers · 0 bags · no insurance", "$343", "$516", 343 / 516],
      ["User 3", "Time-sensitive business", "Business · 2 passengers · 2 checked bags · insurance", "$2,452", "$4,400", 2452 / 4400],
    ];
    const X = 296, W = 364, Hc = 80;
    const users = U.map(([name, persona, attrs, tgt, walk, f], i) => {
      const y = 22 + i * (Hc + 8);
      const c = el(g, "g", {});
      card(c, X, y, W, Hc);
      person(c, X + 20, y + 20, 1);
      txt(c, X + 36, y + 24, name, { "font-weight": 700, fill: C.ink, "font-size": 13 });
      txt(c, X + 92, y + 24, persona, { "font-size": 12, fill: C.muted });
      const at = txt(c, X + 14, y + 44, attrs, { "font-size": 11.5, fill: C.text });
      el(c, "rect", { x: X + 14, y: y + 52, width: W - 28, height: 6, rx: 3, fill: C.line });
      const bar = el(c, "rect", { x: X + 14, y: y + 52, width: 0, height: 6, rx: 3, fill: "#55555f" });
      const lab = el(c, "g", {});
      txt(lab, X + 14, y + 72, `Target ${tgt}`, { "font-size": 11.5, "font-weight": 700, fill: C.ink });
      txt(lab, X + W - 14, y + 72, `Walk-away ${walk}`, { "font-size": 11.5, "font-weight": 700, fill: C.ink, "text-anchor": "end" });
      return { c, at, bar, lab, f, W: W - 28 };
    });
    const more = txt(g, X + W / 2, 294, "· · ·", { "font-size": 14, fill: C.muted, "text-anchor": "middle" });
    return (t) => {
      const out = 1 - fade(t, 11500, 450);
      show(it, fade(t, 0, 500) * out);
      routes.forEach((p, i) => show(p, fade(t, 500 + i * 180, 300)));
      show(arr, fade(t, 1900) * out);
      show(head, fade(t, 1900) * out);
      users.forEach((u, i) => {
        const s = 2300 + i * 1700;
        const o = fade(t, s, 450) * out;
        show(u.c, o);
        u.c.setAttribute("transform", `translate(${(-24 * (1 - ease(fade(t, s, 600)))).toFixed(1)} 0)`);
        show(u.at, fade(t, s + 350));
        u.bar.setAttribute("width", (u.W * u.f * ease(fade(t, s + 700, 700))).toFixed(1));
        show(u.lab, fade(t, s + 1000));
      });
      show(more, fade(t, 7800) * out);
    };
  }

  // combined figure: catalog (0-8.8 s), the Delta flight is picked as the reference itinerary, then users are sampled
  const inv = document.querySelector(".d-anim.inventory");
  if (inv) player(inv, 21600, (svg) => {
    const gA = el(svg, "g", { transform: "translate(0 30)" }), gB = el(svg, "g", { transform: "translate(0 18)" });
    const drawA = buildInventory(gA), drawB = buildUserGen(gB);
    const pick = el(gA, "g", {});
    el(pick, "rect", { x: 401, y: 41, width: 262, height: 58, rx: 12, fill: "none", stroke: C.max, "stroke-width": 2.4 });
    el(pick, "rect", { x: 470, y: 30, width: 124, height: 20, rx: 10, fill: C.max });
    txt(pick, 532, 44, "reference itinerary", { "font-size": 11, "text-anchor": "middle", fill: "#fff", "font-weight": 600 });
    const SW = 9600;
    return (t) => {
      const oa = 1 - fade(t, SW - 500, 500);
      show(gA, oa);
      if (oa > 0) drawA(Math.min(t, 8400));
      show(pick, fade(t, 8000, 400));
      show(gB, t >= SW ? 1 : 0);
      if (t >= SW) drawB(t - SW);
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
