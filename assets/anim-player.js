// Shared player for the keyframed figure animations: a play/pause button and a step bar above each figure.
// build(svg, api) returns draw(t) for t in [0, duration). steps = [[startMs, label], ...]: one segment per step,
// filling as it plays; clicking a segment jumps to the start of that step. Plays while on screen.
// ?wt=<ms> pins the animation at one moment (for screenshots).
window.animPlayer = function (fig, duration, build, speed = 1, steps = [[0, ""]]) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svg = fig.querySelector("svg");
  const api = {};
  const draw = build(svg, api);
  fig.querySelectorAll(".replay-mini").forEach((b) => b.remove());

  const bar = document.createElement("div");
  bar.className = "controls anim-steps";
  bar.innerHTML =
    '<button type="button" class="play" aria-label="Play"><svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<path class="i-play" d="M4 2.5v11l9.5-5.5z"/><path class="i-pause" d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg></button>' +
    '<div class="segs">' + steps.map(([, label], i) =>
      `<button type="button" class="seg-i" aria-label="Step ${i + 1}: ${label}"><i></i><span>${label}</span></button>`).join("") + "</div>";
  fig.insertBefore(bar, fig.firstChild);
  const btn = bar.querySelector(".play"), segs = [...bar.querySelectorAll(".seg-i")];
  const bounds = steps.map(([s], i) => [s, i + 1 < steps.length ? steps[i + 1][0] : duration]);

  let t = 0, last = null, raf = 0, playing = false, userPaused = false;
  const render = () => {
    draw(Math.min(t, duration - 1));
    bounds.forEach(([a, b], i) => {
      segs[i].querySelector("i").style.width = (100 * Math.min(Math.max((t - a) / (b - a), 0), 1)) + "%";
      segs[i].classList.toggle("on", t >= a && t < b);
    });
  };
  const frame = (now) => {
    if (last !== null) t = (t + (now - last) * speed) % duration;
    last = now;
    render();
    raf = requestAnimationFrame(frame);
  };
  const setPlaying = (on) => {
    if (on === playing) return;
    playing = on;
    fig.classList.toggle("playing", on);
    btn.setAttribute("aria-label", on ? "Pause" : "Play");
    if (on) { last = null; raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
  };
  api.restart = () => { t = 0; render(); };
  api.redraw = render;

  btn.addEventListener("click", () => { userPaused = playing; setPlaying(!playing); });
  segs.forEach((b, i) => b.addEventListener("click", () => { t = bounds[i][0]; last = null; render(); }));

  const wt = new URLSearchParams(location.search).get("wt");
  if (wt !== null) { t = +wt % duration; render(); return api; }
  if (reduce) { t = duration - 1; render(); userPaused = true; }
  else render();
  new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) setPlaying(false);
    else if (!userPaused) setPlaying(true);
  }), { threshold: 0.35 }).observe(fig);
  return api;
};
