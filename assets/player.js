// Live version of Figure 2: same artwork and timeline as the slides (exported by export_web_anim.py).
// Scene 1: one user agent talks to P1..P3, then more user / user-agent pairs join and everyone talks.
// Scene 2: the view widens to the whole figure; the User and Provider Coordinate huddles chat in loops, forever.
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  const ease = (x) => x * x * (3 - 2 * x);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

  async function init(root) {
    const d = await (await fetch(root.dataset.src)).json();
    const stage = root.querySelector("svg.stage");
    stage.innerHTML = d.defs + '<defs class="clips"></defs><rect class="bg" fill="#fff"/><g class="world"></g>';
    const clips = stage.querySelector("defs.clips");
    const world = stage.querySelector("g.world");
    world.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    world.setAttribute("fill", "#34343B");
    world.setAttribute("text-anchor", "middle");

    const els = {};
    d.elements.forEach((el, i) => {
      const outer = document.createElementNS(SVGNS, "g");
      const inner = document.createElementNS(SVGNS, "g");
      inner.innerHTML = el.svg;
      outer.appendChild(inner);
      world.appendChild(outer);
      const cp = document.createElementNS(SVGNS, "clipPath");
      cp.id = `fig2-clip-${i}`;
      const r = document.createElementNS(SVGNS, "rect");
      cp.appendChild(r);
      clips.appendChild(cp);
      els[el.key] = { outer, inner, rect: r, clipId: cp.id, box: el.box };
    });
    const scene1 = new Set(d.scene1), scene2 = new Set(d.scene2);
    const chats = d.chats || [d.chat];                       // one looping chat per huddle
    const chatOf = {};
    chats.forEach((c) => c.keys.forEach((k) => (chatOf[k] = c)));
    const S2 = d.s1End + d.morph;
    const bg = stage.querySelector("rect.bg");

    function state(el, ev, t) {
      // returns {hidden, opacity, dy, zoom, clip}
      const out = { hidden: false, opacity: 1, dy: 0, zoom: null, clip: null };
      if (!ev) return out;
      let move = null, last = null, anyVis = false;
      for (const e of ev) {
        if (e[0] === "move") { if (e[1] <= t) move = e; continue; }
        anyVis = true;
        if (e[1] <= t) last = e;
      }
      if (move) {
        const o = move[3];
        out.dy = o.y0 + (o.y1 - o.y0) * ease(clamp01((t - move[1]) / move[2]));
      }
      if (anyVis && !last) { out.hidden = true; return out; }
      if (!last) return out;
      const [eff, st, du, opt] = last;
      const p = clamp01((t - st) / du);
      if (eff === "pulse") {                     // auto-reverse fade, accelerate 100%, repeating
        const ph = (t - st) % (2 * du);
        const x = ph < du ? ph / du : 2 - ph / du;
        out.opacity = x * x;
        if (out.opacity < 0.002) out.hidden = true;
      } else if (eff === "fadeout") {
        if (p >= 1) out.hidden = true; else out.opacity = 1 - p;
      } else if (p < 1) {
        if (eff === "fade") out.opacity = p;
        else if (eff === "zoom") { out.opacity = p; out.zoom = Math.max(p, 0.001); }
        else if (eff === "wipe") {
          const [x, y, w, h] = el.box, frm = (opt && opt.frm) || "left";
          if (frm === "left" || frm === "right") {
            const ww = (w + 28) * p;
            out.clip = [frm === "left" ? x - 14 : x + w + 14 - ww, y - 20, ww, h + 40];
          } else {
            const hh = (h + 28) * p;
            out.clip = [x - 20, frm === "top" ? y - 14 : y + h + 14 - hh, w + 40, hh];
          }
        }
      }
      return out;
    }

    function render(t) {
      let keys, ev, local, e;
      if (t < S2) { keys = scene1; ev = d.ev1; local = t; e = ease(clamp01((t - d.s1End) / d.morph)); }
      else { keys = scene2; ev = d.ev2; local = t - S2; e = 1; }
      const cam = d.cam1.map((a, i) => a + (d.cam2[i] - a) * e);
      stage.setAttribute("viewBox", cam.join(" "));
      bg.setAttribute("x", cam[0] - 5); bg.setAttribute("y", cam[1] - 5);
      bg.setAttribute("width", cam[2] + 10); bg.setAttribute("height", cam[3] + 10);
      for (const key in els) {
        const el = els[key];
        if (!keys.has(key)) { el.outer.style.display = "none"; continue; }
        let tl = local;
        const c = chatOf[key];
        if (keys === scene2 && c && local > c.start) tl = c.start + ((local - c.start) % c.cycle);
        const s = state(el, ev[key], tl);
        el.outer.style.display = s.hidden ? "none" : "";
        if (s.hidden) continue;
        el.outer.setAttribute("transform", s.dy ? `translate(0 ${s.dy.toFixed(2)})` : "");
        el.inner.setAttribute("opacity", s.opacity.toFixed(3));
        if (s.zoom !== null) {
          const [x, y, w, h] = el.box, cx = x + w / 2, cy = y + h / 2;
          el.inner.setAttribute("transform", `translate(${cx} ${cy}) scale(${s.zoom.toFixed(3)}) translate(${-cx} ${-cy})`);
        } else el.inner.removeAttribute("transform");
        if (s.clip) {
          const [x, y, w, h] = s.clip;
          el.rect.setAttribute("x", x); el.rect.setAttribute("y", y);
          el.rect.setAttribute("width", Math.max(w, 0)); el.rect.setAttribute("height", Math.max(h, 0));
          el.inner.setAttribute("clip-path", `url(#${el.clipId})`);
        } else el.inner.removeAttribute("clip-path");
      }
      showTime(t);
    }

    // ---- video-style controls: play/pause, seek bar, time
    const DUR = S2 + Math.max(...chats.map((c) => c.start + c.cycle));            // one full pass, then it loops
    const bar = root.querySelector(".controls");
    const playBtn = bar.querySelector(".play");
    const scrub = bar.querySelector(".scrub"), fill = scrub.querySelector(".fill"), knob = scrub.querySelector(".knob");
    function showTime(t) {
      const f = Math.min(t / DUR, 1) * 100;
      fill.style.width = `${f}%`; knob.style.left = `${f}%`;
      scrub.setAttribute("aria-valuenow", Math.round(f));
    }

    let t = 0, last = null, playing = false, userPaused = false, raf = 0;
    function tick(now) {
      if (last !== null) t += now - last;
      last = now;
      if (t >= DUR) t %= DUR;
      render(t);
      raf = requestAnimationFrame(tick);
    }
    function play(fromUser) {
      if (fromUser) userPaused = false;
      if (playing) return;
      playing = true; last = null;
      raf = requestAnimationFrame(tick);
      root.classList.add("playing");
      playBtn.setAttribute("aria-label", "Pause");
    }
    function pause(fromUser) {
      if (fromUser) userPaused = true;
      playing = false;
      cancelAnimationFrame(raf);
      root.classList.remove("playing");
      playBtn.setAttribute("aria-label", "Play");
    }
    const toggle = () => (playing ? pause(true) : play(true));
    playBtn.addEventListener("click", toggle);
    stage.addEventListener("click", toggle);
    // seeking: click or drag on the bar, arrow keys when focused
    const seek = (clientX) => {
      const r = scrub.getBoundingClientRect();
      t = clamp01((clientX - r.left) / r.width) * DUR * 0.9999; last = null; render(t);
    };
    scrub.addEventListener("pointerdown", (e) => {
      scrub.setPointerCapture(e.pointerId); seek(e.clientX);
      const move = (ev) => seek(ev.clientX);
      const up = () => { scrub.removeEventListener("pointermove", move); scrub.removeEventListener("pointerup", up); };
      scrub.addEventListener("pointermove", move); scrub.addEventListener("pointerup", up);
    });
    scrub.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -5000, ArrowRight: 5000 }[e.key];
      if (step) { e.preventDefault(); t = Math.min(Math.max(t + step, 0), DUR * 0.9999); last = null; render(t); }
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { t = S2 + Math.max(...chats.map((c) => c.start)); render(t); pause(true); return; }
    const start = +(new URLSearchParams(location.search).get("t") || 0);   // e.g. ?t=25000 to jump ahead
    t = start;
    render(t);
    new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting && !userPaused) play(false);
        else if (!en.isIntersecting && playing) pause(false);
      }
    }, { threshold: 0.35 }).observe(root);
  }

  document.querySelectorAll(".fig2-player").forEach((r) => init(r).catch((err) => {
    r.querySelector(".controls").textContent = "Animation failed to load.";
    console.error(err);
  }));
})();
