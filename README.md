# AτA project page

Static site for "AτA: A Benchmark for Multi-Agent Interaction in Agentic Economies" (anonymous preview).

- `index.html` – the page; `assets/style.css`, `assets/site.js` (leaderboard, scatter, tabs, copy).
- `assets/player.js` + `assets/marketplace-anim.json` – the live Figure 2 animation. The JSON is exported from the
  paper repo with `python animation/export_web_anim.py` (same artwork and timeline as the PowerPoint). Add `?t=25000`
  to the URL to jump the animation to a given millisecond.
- `assets/base-results.json` – the 33 scored Agentic BASE conditions from the paper's main figures.

Preview locally: `python3 -m http.server` and open http://localhost:8000.
