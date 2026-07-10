/* WCO ITR 2025 — Step 1: the e-commerce "spectrum" chart (static, hand-authored SVG).
   Data is loaded at runtime from a RELATIVE path so it resolves under the GitHub
   Pages project subpath (username.github.io/itr_dashboard/). */

const ACCENT = "#2F6DB5";   // WCO blue — reserved for the parcel-able top cluster
const GRAY   = "#8A8F9A";   // every other commodity
const TOP_CLUSTER_MIN = 60; // NPS -> Cannabis all sit at or above this

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmtPct(v) {
  return (v % 1 === 0 ? v : v.toFixed(1)) + "%";
}

function buildChart(rows) {
  // Geometry (viewBox units; the SVG scales fluidly to its container width).
  const W = 900;
  const barStart = 348;   // left gutter holds the left-aligned category labels
  const rightPad = 48;    // room for the value label past the longest bar
  const plotW = W - barStart - rightPad;
  const rowH = 26;
  const padTop = 8;
  const barH = 13;
  const H = padTop + rows.length * rowH + 6;

  const maxV = Math.max(...rows.map(r => r.ecomPct), 1);
  const scale = v => (v / maxV) * plotW;

  let bars = "";
  rows.forEach((r, i) => {
    const yc = padTop + i * rowH + rowH / 2;
    const bw = scale(r.ecomPct);
    const color = r.ecomPct >= TOP_CLUSTER_MIN ? ACCENT : GRAY;
    const label = esc(r.commodity);
    const val = fmtPct(r.ecomPct);

    bars +=
      `<g>` +
        `<text class="cat-label" x="0" y="${yc + 4}">${label}</text>` +
        `<rect x="${barStart}" y="${yc - barH / 2}" width="${bw.toFixed(1)}" ` +
          `height="${barH}" rx="2.5" fill="${color}"></rect>` +
        `<text class="val-label" x="${(barStart + bw + 6).toFixed(1)}" y="${yc + 4}" ` +
          `text-anchor="start" fill="${color}">${val}</text>` +
      `</g>`;
  });

  const aria =
    `E-commerce share of illicit-trade cases by commodity, ranked from ` +
    `${fmtPct(rows[0].ecomPct)} for ${esc(rows[0].commodity)} down to ` +
    `${fmtPct(rows[rows.length - 1].ecomPct)} for ${esc(rows[rows.length - 1].commodity)}.`;

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" ` +
      `aria-labelledby="chart-title" aria-label="${aria}">` +
      bars +
    `</svg>`
  );
}

async function init() {
  const mount = document.getElementById("chart");
  try {
    const res = await fetch("./data/ecom_spectrum.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    rows.sort((a, b) => b.ecomPct - a.ecomPct); // defensive: guarantee descending
    mount.innerHTML = buildChart(rows);
    mount.removeAttribute("aria-busy");
  } catch (err) {
    mount.removeAttribute("aria-busy");
    mount.innerHTML =
      `<p class="chart-error">Could not load the spectrum data (${esc(err.message)}).</p>`;
  }
}

init();
