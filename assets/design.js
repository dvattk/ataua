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

  // ---------------------------------------------------------------- 1. data generation: the paper's figure, revealed in its reverse-C order
  // database -> provider inventory -> reference itinerary -> sampled users (assets/datagen.svg is the paper's SVG)
  const inv = document.querySelector(".d-anim.inventory");
  if (inv) fetch("assets/datagen.svg?v=1794454256").then((r) => r.text()).then((src) => {
    const holder = inv.querySelector("svg");
    const doc = new DOMParser().parseFromString(src, "image/svg+xml").documentElement;
    doc.removeAttribute("width"); doc.removeAttribute("height");
    doc.setAttribute("aria-label", "Data generation: BTS DB1B fares build the provider inventory; a reference itinerary is sampled; users are sampled around it.");
    holder.replaceWith(doc);
    const $ = (id) => doc.querySelector(`:scope > [id="${id}"]`) || doc.querySelector(`:scope > g [id="${id}"]`);   // skip same-named icons in <defs>
    const NSX = "http://www.w3.org/2000/svg";
    // a box "builds": its frame is drawn as a line, then its contents fade in
    const box = (g) => {
      const frame = g.querySelector(':scope > rect[id$="-frame"]') || g.querySelector(":scope > rect");
      frame.setAttribute("pathLength", "1"); frame.setAttribute("stroke-dasharray", "1 1");
      const fill = frame.getAttribute("fill");
      const kids = [...g.children].filter((c) => c !== frame && !/^user-\d$/.test(c.id));
      return (t, t0, out) => {
        const d = ease(fade(t, t0, 600));
        frame.setAttribute("stroke-dashoffset", (1 - d).toFixed(3));
        frame.setAttribute("fill-opacity", ease(fade(t, t0 + 300, 400)).toFixed(3));
        const c = ease(fade(t, t0 + 400, 400));
        kids.forEach((k) => k.setAttribute("opacity", c.toFixed(3)));
        g.setAttribute("opacity", out.toFixed(3));
      };
    };
    // an arrow draws, with a dot travelling along it; its arrowhead appears when it arrives
    const dotLayer = document.createElementNS(NSX, "g"); doc.appendChild(dotLayer);
    const arrow = (ln) => {
      ln.setAttribute("pathLength", "1"); ln.setAttribute("stroke-dasharray", "1 1");
      const mk = ln.getAttribute("marker-end");
      const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((k) => +ln.getAttribute(k));
      const dot = document.createElementNS(NSX, "circle");
      dot.setAttribute("r", 11); dot.setAttribute("fill", "#4F46E5"); dotLayer.appendChild(dot);
      return (t, t0, dur, out) => {
        const k = ease(fade(t, t0, dur));
        ln.setAttribute("stroke-dashoffset", (1 - k).toFixed(3));
        ln.setAttribute("opacity", out.toFixed(3));
        if (mk) { if (k > 0.98) ln.setAttribute("marker-end", mk); else ln.removeAttribute("marker-end"); }
        dot.setAttribute("cx", (x1 + (x2 - x1) * k).toFixed(1)); dot.setAttribute("cy", (y1 + (y2 - y1) * k).toFixed(1));
        dot.setAttribute("opacity", (k > 0.001 && k < 0.999 ? 1 : 0) * out);
      };
    };
    // fares and seat counts count up
    const counters = [...$("catalog").querySelectorAll("text")].filter((x) => /^\$\d|^\d+ seats$/.test(x.textContent.trim()))
      .map((x) => { const v = +x.textContent.replace(/[^\d]/g, ""), f = x.textContent; return (k) => (x.textContent = f.replace(/\d+/, Math.round(v * k))); });
    // map routes draw from the origin; airport markers pop in as routes land
    const routes = [...$("itinerary").querySelectorAll("path.js-line")].map((p) => {
      const L = p.getTotalLength ? p.getTotalLength() : 600; p.style.strokeDasharray = `${L} ${L}`; return { p, L };
    });
    const points = [...$("itinerary").querySelectorAll("path.point")];
    const users = ["user-1", "user-2", "user-3"].map((id) => {
      const g = $(id), bar = g.querySelector('rect[id^="budget-target"]'), W = +bar.getAttribute("width");
      return { build: box(g), bar, W, g };
    });
    const B = { db: box($("database")), cat: box($("catalog")), it: box($("itinerary")), us: box($("users")) };
    const A1 = arrow($("database-to-catalog")), A2 = arrow($("catalog-to-itinerary"));
    const br = [...$("sample-branches").children].map(arrow);
    const D = 14500, OUT = 13300;
    player(inv, D, () => (t) => {
      const out = 1 - fade(t, OUT, 700);
      B.db(t, 0, out);
      A1(t, 900, 700, out);
      B.cat(t, 1500, out);
      const ck = ease(fade(t, 2000, 900)); counters.forEach((f) => f(ck));
      A2(t, 3000, 500, out);
      B.it(t, 3500, out);
      routes.forEach(({ p, L }, i) => p.style.strokeDashoffset = (L * (1 - ease(fade(t, 4200 + (i % 14) * 90, 900)))).toFixed(1));
      points.forEach((q, i) => q.style.opacity = fade(t, 4900 + (i % 14) * 90, 300).toFixed(2));
      br[0](t, 6000, 350, out); br[1](t, 6300, 450, out);
      B.us(t, 6100, out);
      users.forEach((u, i) => {
        const t0 = 6700 + i * 900;
        br[2 + i](t, t0, 350, out);
        u.build(t, t0 + 300, 1);
        u.bar.setAttribute("width", (u.W * ease(fade(t, t0 + 800, 700))).toFixed(1));
      });
      dotLayer.setAttribute("opacity", out.toFixed(3));
    });
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
    const NAMES = ["budget conscious", "premium traveler", "time-sensitive", "price comparison", "flexible traveler"];
    const bots = NAMES.map((n, i) => {
      const b = el(task, "g", {}), x = 160 + i * 86;
      robot(b, x, 252, C.user, 0.9);
      txt(b, x, 280, n, { "font-size": 9.5, "text-anchor": "middle", fill: C.muted });
      return b;
    });
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

  // ---------------------------------------------------------------- 6. MAX: sweeping lambda traces the reference (12 s)
  const mx = document.querySelector(".d-anim.maxsweep");
  if (mx) fetch("assets/chart-data.json?v=1794454256").then((r) => r.json()).then((data) => {
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
