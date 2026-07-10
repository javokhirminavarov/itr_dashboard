# ITR 2025 Dashboard — Inventory Report

Static inventory of `ITR 2025 Dashboard.html` — a self-contained, client-side
World Customs Organization (WCO) **Illicit Trade Report 2025** dashboard.

- **File:** `ITR 2025 Dashboard.html` — single file, **1,093,574 bytes (~1.05 MB), 23,638 lines**
- **Bilingual:** English / French (runtime toggle)
- **Self-contained:** Yes. All data, geometry, images and logic are baked into the one file. No runtime network calls (see §2).
- Extracted data lives in [`/data`](./data) (see [`data/README.md`](./data/README.md)).

---

## 1. Tech stack

**There is no charting library.** No D3, Highcharts, Chart.js, Plotly, ECharts,
amCharts, ApexCharts, Flourish, Datawrapper or Tableau. (The word "tableau"
appears only as the French word for "dashboard" — *tableau de bord*.) Every
chart, map and diagram is **hand-authored inline SVG** generated as template
strings by the page's own JavaScript, then injected via `innerHTML`.

**No framework** — no React, Vue, Angular, jQuery or web components. It is
**vanilla JavaScript** (ES6 template literals, arrow functions) with a tiny
hand-rolled state machine (`PAGE` / `SUBFLOW` / `LANG` globals) and
hash-based routing.

### `<script>` dependencies — all inlined, zero external

There are exactly **3 `<script>` blocks, all inline. No `src=` script tags, no CDN, no external stylesheet or `<link>`.**

| # | Lines | ~Size | Contents |
|---|-------|-------|----------|
| 1 | 216–21578 | 451 KB | `window.ITR_DATA = {…}` — the entire analytical dataset (pretty-printed JSON literal). Data only, no logic. |
| 2 | 21579–21582 | 51 KB | `window.__WORLD = {…}` — world map geometry: a Robinson-projection SVG path per country (ISO-3 keys). Data only. |
| 3 | 21583–23638 | 468 KB | All application logic: config objects, i18n text, chart-primitive functions, per-view render functions, router, PNG/SVG export. |

- **CSS:** one inline `<style>` block (lines 6–182). No external fonts or stylesheets.
- **Fonts:** system font stack only — `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif`. No embedded/`@font-face` or web fonts.
- **Content-Security-Policy** (meta tag, line 3) is strict and confirms the self-contained design:
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; …`
  `connect-src 'none'` means **the page is structurally incapable of fetching data at runtime** (no fetch/XHR/WebSocket).

---

## 2. Data

**All data is baked into the file as inline JavaScript object literals.** Nothing
is loaded from a remote endpoint. The only external URL anywhere in the file is a
hyperlink (in the page footer and foreword) to the source PDF:
`https://www.wcoomd.org/…/itr_2025_en.pdf` — a *download link the user can click*,
**not** a data dependency. Combined with `connect-src 'none'`, the dashboard is
**fully self-contained and offline-capable**.

### Data locations

| Source | What it is | Extracted to |
|--------|-----------|--------------|
| `window.ITR_DATA` (script 1) | All statistics — global totals, per-region, per-section flows, drill-downs, and full per-section detail (AML, Drugs, Environmental Crime, IPR/Health, Revenue, Security). | `data/itr_data.json` + one file per top-level key (`data/itr_<key>.json`) |
| `window.__WORLD` (script 2) | Choropleth base map — `viewBox` + 176 ISO-3 country SVG paths (Robinson projection). | `data/world_map_paths.json` |
| Config/i18n objects (script 3) | Section & region configuration, color themes, detection-method labels, currency palette, country-name lookup (`CNAME`), and long-form bilingual narrative text (foreword, introduction, executive summary, per-section commentary, case studies, conclusion). | `data/config_bundle.json` + `data/cfg_<NAME>.json` for the large ones |
| 3 base64 images | 1 PNG (WCO brand logo) + 1 JPEG (foreword portrait of the Secretary General). | `data/assets/` |

`window.ITR_DATA` top-level keys: `meta`, `sections`, `drill`, `global`, `aml`,
`drugs`, `env`, `iprhs`, `rev`, `sec`.

**Measure convention** used throughout the flow objects: `s` = seizures, `p` =
pieces (previous-year comparator in some contexts), `c` = cases. Directions are
encoded as `Export` / `Import` / `Internal` / `Transit`.

### Tabular extracts (CSV)

Cleanly rectangular slices are also provided as CSV in `data/csv/`:
`global_regions.csv`, `global_region_section_seizures.csv`, `sections_flows.csv`,
`sections_detection.csv`, `aml_top_reporters.csv`, `aml_currencies.csv`,
`aml_conveyance.csv`. (Most section detail is nested/irregular and is best
consumed as JSON.)

### Headline figures (from the data)

- **163,850** total cases · **226,549** total seizures · **170** reporting administrations · **6** WCO regions · reporting year **2025** (comparator **2024**).
- **44.8 %** of cases globally linked to e-commerce.
- Regions by seizures: Europe 95,859 · Americas 93,853 · MENA 26,965 · Asia/Pacific 4,880 · East & Southern Africa 2,575 · West & Central Africa 2,334.

---

## 3. Structure & navigation

**Layout:** a fixed two-column CSS-grid app shell — a **248 px sticky left
sidebar rail** (WCO-blue) + a scrolling **main content area** with a top bar
(breadcrumb + EN/FR language toggle + "web version" badge). The rail holds the
brand logo/title and the nav list. Content is a single `<div>` whose `innerHTML`
is swapped per view — this is a **single-page app**, not scroll sections or real
pages.

**Navigation model:**
- **Sidebar rail** (built by `renderNav`) — click a topic to switch view.
- **Sub-navigation:** when a section is the active view, its **sub-flows expand
  inline beneath it** in the rail *and* appear as **pill buttons** at the top of
  the content. Selecting one sets `SUBFLOW` and re-renders that section in a
  filtered/detailed mode.
- **Language toggle** (EN/FR) re-renders the current view in the other language.
- **Hash routing / deep links:** state is serialized to
  `#p=<page>&s=<subflow>&l=<lang>`; the URL is shareable and `hashchange` is honored (back/forward work).
- **Per-figure download button** appears on every card containing an SVG (see §4).

**Sidebar order (11 navigable views):**

1. **Foreword** — `renderForeword` (portrait + signed narrative)
2. **Introduction** — `renderIntroduction` (document prose + "key enforcement priorities" list)
3. **Executive summary** — `renderExecSummary` (KPIs + template-filled narrative + "major shifts" cards + per-section summaries)
4. **Global trends** — `renderGlobalTrends` (3 signature figures, below)
5. **E-commerce** — `renderEcommerce`
6. **AML/CTF** — `renderAML` (sub-flows: Overview · Cash smuggling · Gold · Gemstones)
7. **Drugs** — `renderDrugs` (sub-flows: Overview + per-drug: Cannabis, Cocaine, Opioids/Opiates, Psychotropics, NPS, Khat)
8. **Environmental Crime** — `renderEnv` (Overview + streams: Fauna, Flora, Waste, ODS & HFCs, Other hazardous)
9. **IPR, Health and Safety** — `renderIPR` (Overview + IPR products / Medical products)
10. **Revenue** — `renderRev` (Overview + Tobacco / Alcohol)
11. **Security** — `renderSec` (Overview + Weapons/ammunition, Explosives & precursors, UAS)
12. **Conclusion** — `renderConclusion`

Plus a **hidden/legacy `overview` view** (`renderOverview`) reachable only by
hash (`#p=overview`) — not listed in the rail. Generic fallback renderers
`renderSection` / `renderSectionFull` also exist but are superseded by the six
dedicated section renderers (all six sections ship full data). **≈12 distinct
view templates** in total.

---

## 4. Chart inventory

All charts are inline SVG. Shared **chart-primitive functions** (the building
blocks reused across views):

| Primitive | Renders | Encodes | Interactions |
|-----------|---------|---------|--------------|
| `hbar` | Horizontal bar chart | category → value (optional suffix, e.g. `%`, ` M`) | width-grow animation (`data-w`), hover tooltip (`data-tip`) |
| `groupedYoY` | Paired **year-over-year** horizontal bars (prev vs current) | category × {previous, current} | grow animation, tooltips per bar |
| `donut` / `donutB` | Donut chart (B = with center/legend variant) | share of a categorical breakdown | tooltips |
| `amlStack` | Stacked horizontal bars (percentage **or** absolute mode) | category × segments (e.g. currency, direction) | grow animation, tooltips, in-bar % labels |
| `amlPolar` | **Polar / radial (coxcomb) stacked** chart | one angular wedge per country, stacked radially by segment | tooltips, rotated radial labels |
| `choropleth` | **World map** (Robinson projection, `__WORLD` paths) | country → binned count, 5-class color scale | per-country tooltip (name: value), color legend |
| `heatGrid` | Rectangular **heatmap** grid | rows × cols matrix; log or binned color ramp | tooltips, optional cell annotations, horizontal scroll |
| `operPanels` | 2×2 "operational profile" panel | location (hbar) · direction (donutB) · concealment (hbar) · detection (donutB) | tooltips |
| `gtFig1` | Vertical bar chart | cases per region (+ seizures & country counts overlaid in-bar) | tooltips |
| `gtFig2` | Stacked horizontal bar | region × section seizure composition (%) | tooltips, wrapping legend |
| `gtFig3` | Donut + stacked vertical bars | global e-commerce share (donut) + regional e-commerce vs non (bars) | tooltips |
| `kpi` | KPI stat tile | label / value / footnote (with up/down delta coloring) | — |

**Global interactions:** floating **tooltip** on any element with `data-tip`
(`showTip`/`hideTip`, follows cursor); **entrance animations** (bars grow from 0
width via `data-w`); **sub-flow pill/dropdown selectors** per section; **EN/FR
language switch**; **hash deep-linking**; and a **per-figure download button**
(`downloadFigure`) that serializes the SVG with computed styles and exports it as
a **2× PNG** (falling back to SVG), auto-named e.g. `wco_itr_2025_<section>_<title>_<lang>`.

### Per-view charts

**Overview** (hidden): KPIs (cases, seizures +YoY, admins, regions) · `hbar`
seizures **by section** · `hbar` seizures **by region** · `groupedYoY` seizures
YoY by section.

**Global trends:** KPIs · **Fig 1** "Cases by region" (`gtFig1` vertical bars) ·
**Fig 2** "Seizure composition by region & section" (`gtFig2` stacked bar) ·
**Fig 3** "E-commerce share" (`gtFig3` donut + regional bars) · narrative conclusion.

**E-commerce:** hero KPI (44.8 %) + headline · `hbar` **share by region** ·
`hbar` **share by commodity** · note.

**Executive summary:** KPIs · templated regional-concentration narrative ·
"Major shifts of 2025" cards · per-section summary cards.

**AML/CTF** (`renderAML`, 4 sub-flows):
- *Overview:* `donut` composition by trafficking type · `groupedYoY` top-10 reporting countries.
- *Cash smuggling:* `hbar` top-5 currencies (seizures) · `hbar` top-5 currencies (USD value) · `amlStack` conveyance by currency · `hbar` conveyance value · `amlStack` direction by country · `donut` detection method · `amlPolar` proportion of seizures by type & country · `choropleth` **country involvement map** · counterfeit-currency `groupedYoY`.
- *Gold:* `hbar` top reporters · `hbar` location type · `donut` direction · `hbar` concealment · `donut` gold form.
- *Gemstones:* `hbar` reporters · `donut` stone types · `hbar` top departures · `donut` detection.

**Drugs** (`renderDrugs`):
- *Overview:* `donut` composition by category · `groupedYoY` seizures by category · `groupedYoY` quantity by category · `amlStack` direction by country · `donut` detection method · `heatGrid` cases by region × category · `heatGrid` quantity by region × category · `heatGrid` regional trafficking flows (departure→destination) · `choropleth` country involvement · `operPanels`.
- *Per-drug:* `groupedYoY` top-10 reporting countries · `groupedYoY` seizures by sub-commodity · `groupedYoY` quantity by sub-commodity · `hbar` top countries by quantity · `operPanels`.

**IPR, Health and Safety** (`renderIPR`) & **Revenue** (`renderRev`) — parallel structure:
`donut` section composition · `groupedYoY` reporting administrations by region ·
`amlStack` composition by stream × region · `groupedYoY` top-10 reporters ·
`groupedYoY` seizures by commodity/sub-category · `groupedYoY` quantity · an
**HTML `<table>`** "volume profile" (sub-category × seizures / total / per-seizure) ·
`operPanels` operational profile · `hbar` e-commerce penetration · `hbar` top
departures (Revenue) · `amlStack` conveyance by direction · `heatGrid` regional
flows · `choropleth` country involvement.

**Security** (`renderSec`): `donut` composition · `amlStack` reporting admins by
region · `amlStack` seizure composition by stream × region · `groupedYoY` weapons
cases by country · `groupedYoY` the three weapons categories · paired
seizures-`groupedYoY` + quantity-`hbar` blocks per weapons sub-bucket · per-commodity
`heatGrid`s (location / conveyance / concealment) · `hbar` e-commerce share ·
`donut`/`donutB` detection & direction · `heatGrid` regional flows · `choropleth`
involvement. The **UAS** sub-flow also ends with a fixed 6-tile KPI stat row
(93 % airports, 93 % air, 94 % baggage, 87 % imports, 99 % non-e-commerce,
99 % routine control).

**Environmental Crime** (`renderEnv`): `donut` section composition · `donut`
sub-category splits · `groupedYoY` seizures by stream · `hbar` e-commerce share
by stream · sub-commodity tables · `heatGrid` wildlife/timber by region × category
· `heatGrid` bilateral regional flows · `choropleth` country involvement · fauna
detail (`groupedYoY` categories, sub-commodities, top reporters; `hbar` breakdowns)
· `operPanels`.

**Foreword / Introduction / Conclusion:** narrative-only document views (headings,
lead paragraphs, priority lists, case-study/"shift" cards, signature block) — no charts.

---

## 5. Visual style

### Core palette (CSS `:root` + shell)

| Token | Hex | Use |
|-------|-----|-----|
| Brand blue (primary) | `#2F6DB5` | rail background, top border, default accent, e-commerce accent |
| `--ink` | `#1A1726` | body text |
| `--ink-soft` | `#5A5E6B` | secondary text |
| `--paper` | `#F4F5F7` | page background |
| `--surface` | `#FFFFFF` | cards |
| `--line` / `--line-soft` | `#E5E7EC` / `#EEF0F4` | borders |
| `--accent` (default) | `#5E2D91` | accent (overridden per section at runtime) |
| `--accent-prev` | `#C4A8E0` | prior-year accent |
| Rail text | `#EAF1F9` | sidebar text |
| Positive / negative delta | `#1F7A3D` / `#B3261E` | KPI up/down |
| Badge | `#8A6D2B` on `#FBF1D8` / `#F0DFAE` | "web version" pill |

### Section accent colors (`SECTION_CFG`)

| Section | Current | Previous-year |
|---------|---------|----------|
| AML/CTF | `#8B0434` | `#E83A45` |
| Drugs | `#F89E36` | `#FEC828` |
| Environmental Crime | `#5B9743` | `#A8C97A` |
| IPR, Health and Safety | `#7D375C` | `#BF3980` |
| Revenue | `#2E5280` | `#398CCB` |
| Security | `#5E2D91` | `#C4A8E0` |

### Region colors (`REGION_CFG`)

Americas `#EF464E` · Asia/Pacific `#00AB9B` · Europe `#0166B3` · East & Southern
Africa `#553038` · West & Central Africa `#A52D91` · MENA `#00AEEF`.

### Chart ramps / sequential palettes

- **Heat ramp** (`HEAT_RAMP`): `#FFFCE8 → #FEE391 → #FEC828 → #F89E36 → #CC7A1F → #7A4A1F`
- **Drugs sequence** (`DRU_SEQ`): `#563A06, #C1631F, #E0B190, #87621C, #E7D9C1, #C18357, #73370D, #D2AE6A`
- **IPR sequence** (`IPR_SEQ`): `#56062A, #C11F8E, #E090C6, #871C4C, #E7C1D2, #C157A0, #730D52, #D26A99`
- **Revenue sequence** (`REV_SEQ`): `#062A56, #1F8EC1, #90C6E0, #1C4C87, #C1D2E7, #57A0C1, #0D5273, #6A99D2`
- **Currency palette** (`CUR_PAL`): Euro `#8B0434`, US Dollar `#E83A45`, Saudi Riyal `#C82909`, Zloty `#F87C63`, Hryvnia `#F5C5C0`
- Per-section **10-swatch categorical + direction + detection** palettes live in `SEC_THEME` (extracted to `data/cfg_SEC_THEME.json`).
- Direction ramps exist per section (e.g. `DRU_DIR`, `IPR_DIRC`, `REV_DIRC`) keyed by Export/Import/Internal/Transit.

### Typography & layout grid

- **Font:** `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif`; base `14px`, line-height `1.45`, antialiased; `font-variant-numeric: tabular-nums` on numeric cells.
- **Sizes:** page `<h2>` `24px/300–600`; KPI value `30px/300`; card `<h3>` labels; KPI label `11px` uppercase, letter-spacing `.04em`.
- **App shell:** `display:grid; grid-template-columns:248px 1fr; min-height:100vh`.
- **Content canvas:** `max-width:1600px`, centered, padding `26px 30px 48px`.
- **KPI row:** `grid-template-columns:repeat(auto-fit, minmax(150px,1fr))`.
- **Card grid:** `grid-template-columns:1fr 1fr; gap:16px` (two-up); cards with `.full` span both columns.
- **Cards:** white surface, `1px` border `#E5E7EC`, `border-radius:12px`.
- A `3px` solid `#2F6DB5` accent stripe runs across the very top of the page.

---

## 6. Notes / could-not-extract

- **Nothing was blocked by a remote source** — the file is fully static, so 100 %
  of the data was extractable. There is no hidden API, no lazy-loaded chunk.
- **Computed/derived values** (totals, percentages, YoY deltas, region-share
  percentages) are **calculated at render time in JS**, not stored — the extracted
  JSON holds the raw inputs; the displayed rollups are reproduced by the render code.
- **Long-form narrative text** (foreword body, introduction, executive-summary
  prose, per-section commentary, case studies, conclusion) is bilingual data
  embedded in the config objects and is preserved in `data/config_bundle.json` /
  `data/cfg_*.json` (e.g. `cfg_REPORT.json`, `cfg_FOREWORD.json`,
  `cfg_CASE_STUDIES.json`, `cfg_DRUGTX.json`, `cfg_IPRTX.json`, `cfg_REVTX.json`).
- Some executive-summary / conclusion strings contain **`{placeholder}` tokens**
  (e.g. `{cases}`, `{adm}`, `{r1}`, `{p1}`) that are string-substituted with live
  figures at render time — they are stored verbatim (with tokens) in the extract.
- **World map** is stored as raw SVG path strings (Robinson projection, ISO-3
  keyed); it is geometry, not GeoJSON. Preserved as-is in `world_map_paths.json`.
- **Images** were decoded from base64 to `data/assets/`. The 2 unique embedded
  images are the WCO logo (PNG) and the foreword portrait (JPEG).
- The only external reference in the whole document is the WCO ITR-2025 **PDF
  download hyperlink** (`wcoomd.org`), used in the footer/foreword — informational,
  not a data feed.
