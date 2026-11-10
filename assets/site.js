// Leaderboard, reward scatter, findings tabs and BibTeX copy.
(function () {
  const FAM = { OpenAI: "var(--openai)", Google: "var(--google)", Anthropic: "var(--anthropic)" };
  const state = { supply: "scarce", topo: "all", sort: "w", dir: -1 };
  let rows = [];

  const tbody = document.querySelector(".board tbody");
  const heads = document.querySelectorAll(".board th[data-sort]");

  function visible() {
    return rows
      .filter((r) => r.supply === state.supply)
      .filter((r) => state.topo === "all" || (state.topo === "sym") === r.sym)
      .map((r) => ({ ...r, w: +(r.ru + r.rp).toFixed(3) }));
  }

  function heat(v, lo, hi) {
    const x = hi > lo ? (v - lo) / (hi - lo) : 1;
    return `background: rgba(106, 91, 196, ${(0.04 + 0.32 * x).toFixed(3)})`;
  }

  function renderTable() {
    const list = visible();
    list.sort((a, b) => {
      const k = state.sort, va = a[k], vb = b[k];
      return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * state.dir;
    });
    const range = (k) => [Math.min(...list.map((r) => r[k])), Math.max(...list.map((r) => r[k]))];
    const [ru, rp, w] = [range("ru"), range("rp"), range("w")];
    tbody.innerHTML = list.map((r, i) => `
      <tr>
        <td class="num rank">${i + 1}</td>
        <td><span class="fam" style="background:${FAM[r.userFam]}"></span>${r.user}${r.sym ? '<span class="tag">same model</span>' : ""}</td>
        <td><span class="fam" style="background:${FAM[r.provFam]}"></span>${r.provider}</td>
        <td class="num heat" style="${heat(r.ru, ...ru)}">${r.ru.toFixed(3)}</td>
        <td class="num heat" style="${heat(r.rp, ...rp)}">${r.rp.toFixed(3)}</td>
        <td class="num heat" style="${heat(r.w, ...w)}">${r.w.toFixed(3)}</td>
        <td class="num rank">${r.scored}/${r.planned}</td>
      </tr>`).join("");
    heads.forEach((h) => h.setAttribute("aria-sort", h.dataset.sort === state.sort ? (state.dir < 0 ? "descending" : "ascending") : "none"));
  }

  // ---- scatter: user reward (x) vs provider reward (y)
  const svg = document.querySelector(".scatter");
  const W = 720, H = 420, M = { l: 56, r: 20, t: 16, b: 46 };
  const X0 = 0.3, X1 = 1.0, Y0 = 0.15, Y1 = 0.45;
  const sx = (v) => M.l + ((v - X0) / (X1 - X0)) * (W - M.l - M.r);
  const sy = (v) => H - M.b - ((v - Y0) / (Y1 - Y0)) * (H - M.t - M.b);

  function renderScatter() {
    const list = visible();
    let g = "";
    for (let v = 0.3; v <= 1.0001; v += 0.1)
      g += `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${M.t}" y2="${H - M.b}"/><text class="tick" x="${sx(v)}" y="${H - M.b + 16}" text-anchor="middle">${v.toFixed(1)}</text>`;
    for (let v = 0.15; v <= 0.4501; v += 0.05)
      g += `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${sy(v)}" y2="${sy(v)}"/><text class="tick" x="${M.l - 8}" y="${sy(v) + 4}" text-anchor="end">${v.toFixed(2)}</text>`;
    g += `<text class="axis-label" x="${(M.l + W - M.r) / 2}" y="${H - 8}" text-anchor="middle">Mean user reward →</text>`;
    g += `<text class="axis-label" transform="translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle">Mean provider reward →</text>`;
    g += list.map((r, i) => {
      const c = FAM[r.userFam];
      const fill = r.sym ? c : "#fff";
      return `<circle data-i="${i}" cx="${sx(r.ru)}" cy="${sy(r.rp)}" r="7" fill="${fill}" stroke="${c}" stroke-width="2.5" tabindex="0"
        aria-label="${r.user} users, ${r.provider} providers: user ${r.ru.toFixed(3)}, provider ${r.rp.toFixed(3)}"/>`;
    }).join("");
    g += `<g class="tip" visibility="hidden"><rect rx="6"/><text></text></g>`;
    svg.innerHTML = g;
    const tip = svg.querySelector(".tip"), tt = tip.querySelector("text"), tr = tip.querySelector("rect");
    const show = (el) => {
      const r = list[+el.dataset.i];
      tt.textContent = `${r.user} → ${r.provider}: ${r.ru.toFixed(2)} / ${r.rp.toFixed(2)}`;
      const bb = tt.getBBox();
      let x = +el.getAttribute("cx") + 12, y = +el.getAttribute("cy") - 14;
      if (x + bb.width + 16 > W) x = +el.getAttribute("cx") - bb.width - 28;
      tt.setAttribute("x", x + 8); tt.setAttribute("y", y + 4);
      tr.setAttribute("x", x); tr.setAttribute("y", y - 12); tr.setAttribute("width", bb.width + 16); tr.setAttribute("height", 24);
      tip.setAttribute("visibility", "visible");
      el.setAttribute("r", 9);
    };
    const hide = (el) => { tip.setAttribute("visibility", "hidden"); el.setAttribute("r", 7); };
    svg.querySelectorAll("circle").forEach((el) => {
      el.addEventListener("mouseenter", () => show(el));
      el.addEventListener("focus", () => show(el));
      el.addEventListener("click", () => show(el));
      el.addEventListener("mouseleave", () => hide(el));
      el.addEventListener("blur", () => hide(el));
    });
  }

  function render() { renderTable(); renderScatter(); }

  function seg(attr, key) {
    document.querySelectorAll(`[data-${attr}]`).forEach((b) => b.addEventListener("click", () => {
      state[key] = b.dataset[attr];
      document.querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      render();
    }));
  }
  seg("supply", "supply");
  seg("topo", "topo");
  heads.forEach((h) => h.addEventListener("click", () => {
    const k = h.dataset.sort;
    if (state.sort === k) state.dir *= -1;
    else { state.sort = k; state.dir = ["user", "provider"].includes(k) ? 1 : -1; }
    renderTable();
  }));

  fetch("assets/base-results.json").then((r) => r.json()).then((d) => { rows = d; render(); });

  // ---- findings tabs
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  function select(t) {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
    t.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length]);
      if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length]);
    });
  });

  // ---- copy BibTeX
  const copy = document.querySelector(".bib .copy");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("bibtex").textContent);
      copy.textContent = "Copied";
    } catch { copy.textContent = "Select and copy"; }
    setTimeout(() => (copy.textContent = "Copy"), 1600);
  });
})();
