// Shared player for the keyframed figure animations: a play/pause button and a seek bar under each figure.
// build(svg, api) returns draw(t) for t in [0, duration). Plays while on screen; clicking or dragging the bar jumps there.
// ?wt=<ms> pins the animation at one moment (for screenshots).
window.animPlayer = function (fig, duration, build, speed = 1) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svg = fig.querySelector("svg");
  const api = {};
  const draw = build(svg, api);
  fig.querySelectorAll(".replay-mini").forEach((b) => b.remove());

  const bar = document.createElement("div");
  bar.className = "controls anim-controls";
  bar.innerHTML =
    '<button type="button" class="play" aria-label="Play"><svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<path class="i-play" d="M4 2.5v11l9.5-5.5z"/><path class="i-pause" d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg></button>' +
    '<div class="scrub" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
    '<div class="fill"></div><div class="knob"></div></div>';
  fig.appendChild(bar);
  const btn = bar.querySelector(".play"), scrub = bar.querySelector(".scrub"), fill = bar.querySelector(".fill"), knob = bar.querySelector(".knob");

  let t = 0, last = null, raf = 0, playing = false, visible = false, userPaused = false, dragging = false;
  const render = () => {
    draw(Math.min(t, duration - 1));
    const p = (100 * t) / duration;
    fill.style.width = knob.style.left = p + "%";
    scrub.setAttribute("aria-valuenow", Math.round(p));
  };
  const frame = (now) => {
    if (last !== null && !dragging) t = (t + (now - last) * speed) % duration;
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
  const seek = (e) => {
    const r = scrub.getBoundingClientRect();
    t = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 0.9999) * duration;
    render();
  };
  scrub.addEventListener("pointerdown", (e) => { dragging = true; scrub.setPointerCapture(e.pointerId); seek(e); });
  scrub.addEventListener("pointermove", (e) => { if (dragging) seek(e); });
  const end = () => { dragging = false; last = null; };
  scrub.addEventListener("pointerup", end);
  scrub.addEventListener("pointercancel", end);
  scrub.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 0.05, ArrowLeft: -0.05 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    t = Math.min(Math.max(t + step * duration, 0), duration - 1);
    render();
  });

  const wt = new URLSearchParams(location.search).get("wt");
  if (wt !== null) { t = +wt % duration; render(); return api; }
  if (reduce) { t = duration - 1; render(); userPaused = true; }
  else render();
  new IntersectionObserver((es) => es.forEach((e) => {
    visible = e.isIntersecting;
    if (!visible) setPlaying(false);
    else if (!userPaused) setPlaying(true);
  }), { threshold: 0.35 }).observe(fig);
  return api;
};
