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
  if (inv) fetch("assets/datagen.svg?v=1794460288").then((r) => r.text()).then((src) => {
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

  // ---------------------------------------------------------------- 2. users: the hidden profile becomes the prose of an email (21 s, three users)
  // Each profile tag lifts off and lands on the phrase of the email that expresses it.
  const usr = document.querySelector(".d-anim.users");
  if (usr) player(usr, 21000, (svg) => {
    svg.setAttribute("viewBox", "0 0 680 270");
    const K = { tag: "#F1F0F6", tagInk: "#3f3f4a", hard: "#E3E1FB", hardInk: "#3730A3", soft: "#8B86D6" };
    const T = (p, x, y, str, a = {}) => { const e = el(p, "text", { x, y, "font-size": 13, fill: C.text, "font-family": "var(--sans)", ...a }, str); e.style.whiteSpace = "pre"; return e; };
    const defs = el(svg, "defs", {});
    const f = el(defs, "filter", { id: "mailshadow", x: "-10%", y: "-10%", width: "120%", height: "130%" });
    el(f, "feDropShadow", { dx: 0, dy: 6, stdDeviation: 10, "flood-color": "#1e1b4b", "flood-opacity": 0.08 });
    const style = (r, kind) => {
      if (kind === "hard") { r.setAttribute("fill", K.hard); }
      else if (kind === "soft") { r.setAttribute("fill", "#fff"); r.setAttribute("stroke", K.soft); r.setAttribute("stroke-dasharray", "3 2.5"); }
      else r.setAttribute("fill", K.tag);
    };
    const USERS = [
      { who: "User 1", persona: "Budget-conscious", subj: "Re: Houston → New York",
        tags: [["IAH ⇄ JFK · Aug 2–6"], ["2 travelers"], ["No insurance", "hard"], ["Layover ≤ 3 h", "soft"], ["$900 – $1,150"]],
        mail: [[["Two of us", 1], [", out "], ["Aug 2, back Aug 6", 0], ["."]],
               [["Please, "], ["no travel insurance", 2], [" this time."]],
               [["Short layovers", 3], [" would be nice, ideally under 3 h."]],
               [["Hoping for "], ["about $900, $1,150 at most", 4], ["."]]] },
      { who: "User 2", persona: "Premium traveler", subj: "Family trip to New York",
        tags: [["IAH → JFK · Aug 2"], ["3 travelers"], ["Insurance", "hard"], ["Same itinerary", "soft"], ["$2,400 – $3,100"]],
        mail: [[["Booking for "], ["the three of us", 1], [" on "], ["Aug 2", 0], ["."]],
               [["Insurance is a must", 2], [", we never fly without it."]],
               [["It would be great to be "], ["on the same flights", 3], ["."]],
               [["Around "], ["$2,400, no more than $3,100", 4], ["."]]] },
      { who: "User 3", persona: "Time-sensitive business", subj: "Fwd: NYC client meeting",
        tags: [["IAH → JFK · Aug 2"], ["1 traveler"], ["Insurance", "hard"], ["Layover ≤ 2 h", "soft"], ["$650 – $900"]],
        mail: [[["Just me", 1], [", one way on "], ["Aug 2", 0], ["."]],
               [["Policy: "], ["insurance on every trip", 2], ["."]],
               [["Short connections", 3], [" are fine, under two hours."]],
               [["Budget is "], ["$650, $900 at the very most", 4], ["."]]] },
    ];
    const MX = 300, MY = 34, MW = 360, MH = 196;           // email card
    const sets = USERS.map((u) => {
      const root = el(svg, "g", {});
      // left: who, and the hidden profile as tags
      T(root, 24, 46, u.who, { "font-weight": 700, fill: C.ink, "font-size": 15 });
      T(root, 24, 66, u.persona, { fill: C.muted, "font-size": 12.5 });
      const lock = el(root, "g", { transform: "translate(24 92)" });
      el(lock, "rect", { x: 0, y: -8, width: 9, height: 7, rx: 1.5, fill: C.muted });
      el(lock, "path", { d: "M2 -8 V-10.5 a2.5 2.5 0 0 1 5 0 V-8", fill: "none", stroke: C.muted, "stroke-width": 1.3 });
      T(root, 38, 92, "Profile, hidden from the agent", { fill: C.muted, "font-size": 11, "font-weight": 600, "letter-spacing": ".02em" });
      const tags = u.tags.map(([label, kind], i) => {
        const tg = el(root, "g", {}), y = 106 + i * 30;
        const r = el(tg, "rect", { x: 24, y, width: 10, height: 22, rx: 11 });
        style(r, kind);
        const t = T(tg, 36, y + 15.5, label, { "font-size": 12.5, "font-weight": 600, fill: kind === "hard" ? K.hardInk : K.tagInk });
        const w = (t.getComputedTextLength() || label.length * 7) + 24; r.setAttribute("width", w);
        return { tg, r, w, x: 24, y, kind, label };
      });
      // right: the email
      const mail = el(root, "g", {});
      el(mail, "rect", { x: MX, y: MY, width: MW, height: MH, rx: 14, fill: "#fff", stroke: C.line, filter: "url(#mailshadow)" });
      el(mail, "circle", { cx: MX + 26, cy: MY + 28, r: 11, fill: C.user });
      T(mail, MX + 26, MY + 32, u.who.slice(-1), { "font-size": 11, "font-weight": 700, fill: C.max, "text-anchor": "middle" });
      T(mail, MX + 46, MY + 25, u.subj, { "font-weight": 700, fill: C.ink, "font-size": 13 });
      T(mail, MX + 46, MY + 41, "to: travel agent", { fill: C.muted, "font-size": 11 });
      el(mail, "line", { x1: MX + 16, y1: MY + 56, x2: MX + MW - 16, y2: MY + 56, stroke: C.line });
      const phrases = [];
      const lines = u.mail.map((segs, li) => {
        const lg = el(mail, "g", {}), y = MY + 86 + li * 28;
        let x = MX + 18;
        segs.forEach(([str, ti]) => {
          const t = T(lg, x, y, str, { "font-size": 13 });
          const w = t.getComputedTextLength() || str.length * 6.6;
          if (ti !== undefined) {
            const kind = u.tags[ti][1];
            const hl = el(lg, "rect", { x: x - 3, y: y - 14, width: w + 6, height: 20, rx: 5 });
            style(hl, kind); lg.insertBefore(hl, t);
            if (kind === "hard") t.setAttribute("fill", K.hardInk);
            phrases[ti] = { hl, x: x - 3, y: y - 14, w: w + 6, li };
          }
          x += w;
        });
        return lg;
      });
      // flying copies of the tags
      const ghosts = tags.map(({ label, kind, w }) => {
        const gg = el(root, "g", {});
        const r = el(gg, "rect", { x: 0, y: 0, width: w, height: 22, rx: 11 }); style(r, kind);
        T(gg, 12, 15.5, label, { "font-size": 12.5, "font-weight": 600, fill: kind === "hard" ? K.hardInk : K.tagInk });
        return gg;
      });
      return { root, tags, mail, lines, phrases, ghosts };
    });
    const PER = 7000, T0 = 1300, STEP = 850, FLY = 650;
    return (t) => {
      const k = Math.min(Math.floor(t / PER), 2), l = t - k * PER;
      const out = 1 - fade(l, PER - 500, 500);
      sets.forEach((s, i) => {
        if (i !== k) { show(s.root, 0); return; }
        show(s.root, fade(l, 0, 450) * out);
        s.tags.forEach(({ tg }, j) => {
          const leave = T0 + j * STEP;
          show(tg, fade(l, 150 + j * 110, 300) * (1 - 0.65 * fade(l, leave, 200)));
        });
        show(s.mail, fade(l, 500, 450));
        // a line appears when its first phrase lands
        s.lines.forEach((lg, li) => {
          const first = Math.min(...s.phrases.map((p, j) => (p && p.li === li ? j : 99)));
          show(lg, fade(l, T0 + first * STEP + FLY - 250, 300));
        });
        s.ghosts.forEach((gg, j) => {
          const tg = s.tags[j], ph = s.phrases[j], t0 = T0 + j * STEP;
          const q = clamp01((l - t0) / FLY), e = ease(q);
          const x0 = tg.x, y0 = tg.y, x1 = ph.x, y1 = ph.y + (ph.y > 0 ? -1 : 0);
          const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 40;          // gentle arc
          const bx = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1;
          const by = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1;
          gg.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
          show(gg, q > 0 && q < 1 ? 1 - Math.pow(q, 4) : 0);
          show(ph.hl, fade(l, t0 + FLY - 120, 260));
        });
      });
    };
  });

  // ---------------------------------------------------------------- 6. MAX: sweeping lambda traces the reference (12 s)
  const mx = document.querySelector(".d-anim.maxsweep");
  if (mx) fetch("assets/chart-data.json?v=1794460288").then((r) => r.json()).then((data) => {
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
