# Extracted data — ITR 2025 Dashboard

All data below was extracted **statically** from `../ITR 2025 Dashboard.html`.
The dashboard is fully self-contained: everything here was baked into the HTML as
inline JavaScript object literals (no remote fetch — the page's CSP even sets
`connect-src 'none'`). See `../INVENTORY.md` for the full analysis.

## Analytical data (`window.ITR_DATA`)

| File | Contents |
|------|----------|
| `itr_data.json` | Complete `ITR_DATA` object (everything below in one file) |
| `itr_meta.json` | Reporting year, comparator year, admin & region counts |
| `itr_sections.json` | Per-section headline flows (`s`=seizures, `p`=pieces, `c`=cases) + detection mix |
| `itr_global.json` | Global totals, per-region cases/seizures/countries/e-commerce, region×section seizure matrix |
| `itr_drill.json` | Generic drill-down data (countries, routes, quantity, detection, e-commerce) per section/flow |
| `itr_aml.json` | AML/CTF detail: composition, top reporters, currencies, conveyance, direction, detection, proportion, involvement (map), gold, gems, counterfeit |
| `itr_drugs.json` | Drugs detail: composition, seizures/quantity by category, direction, detection, region×category heatmaps, flow heatmap, per-drug breakdowns, operational profile |
| `itr_env.json` | Environmental Crime detail: streams, CITES, region×category, bilateral flows, involvement, per-stream & fauna detail |
| `itr_iprhs.json` | IPR / Health & Safety detail: split, per-stream, regional |
| `itr_rev.json` | Revenue (tobacco/alcohol) detail: split, per-stream, regional |
| `itr_sec.json` | Security detail: split, per-stream (weapons/explosives/UAS), regional |

## Map geometry (`window.__WORLD`)

| File | Contents |
|------|----------|
| `world_map_paths.json` | `viewBox` + 176 country SVG paths keyed by ISO-3 (Robinson projection). Used by the `choropleth` maps. Geometry, not GeoJSON. |

## Config, theme & bilingual narrative (from the render script)

| File | Contents |
|------|----------|
| `config_bundle.json` | All config/i18n objects in one file (UI labels, `REGION_CFG`, `SECTION_CFG`, `DETECT_CFG`, palettes, `CNAME` country names, `REPORT`, `FOREWORD`, `CASE_STUDIES`, per-section narrative `DRUGTX`/`IPRTX`/`REVTX`, etc.) |
| `cfg_SECTION_CFG.json` | 6 sections: code, EN/FR name, accent colors, flows |
| `cfg_SEC_THEME.json` | Per-section categorical / direction / detection color themes |
| `cfg_REPORT.json` | Long-form bilingual report text (global, shifts, e-commerce, intro, global trends, section summaries, AML narrative, conclusion) |
| `cfg_FOREWORD.json` | Foreword: name, title, portrait (data URI), body (EN/FR) |
| `cfg_CASE_STUDIES.json` | Per-section case-study cards (tag, title, text, EN/FR) |
| `cfg_DRUGTX.json` / `cfg_IPRTX.json` / `cfg_REVTX.json` | Per-section spotlight / commentary text |
| `cfg_CNAME.json` | ISO-3 → {EN, FR} country name lookup |
| `cfg_DRILL_FALLBACK.json` | Fallback drill data (used only if `ITR_DATA.drill` absent) |

> Some strings contain `{placeholder}` tokens (e.g. `{cases}`, `{adm}`, `{r1}`, `{p1}`)
> that the render code substitutes with live figures at runtime. They are stored verbatim.

## Tabular extracts (`csv/`)

Cleanly rectangular slices, for spreadsheet use:

| File | Rows |
|------|------|
| `csv/global_regions.csv` | region → cases, seizures, countries, e-commerce % |
| `csv/global_region_section_seizures.csv` | region × section seizure matrix (+ total) |
| `csv/sections_flows.csv` | section, flow → seizures, pieces, cases |
| `csv/sections_detection.csv` | section, admins, detection method → % |
| `csv/aml_top_reporters.csv` | AML top-10 reporting countries (current/previous) |
| `csv/aml_currencies.csv` | AML top-5 currencies → seizures, value |
| `csv/aml_conveyance.csv` | AML conveyance mode → seizures, value |

(Most other section detail is nested/irregular and is best consumed as JSON.)

## Embedded images (`assets/`)

| File | Source |
|------|--------|
| `assets/embedded_0_logo.png` | WCO brand logo (sidebar) |
| `assets/embedded_1_photo.jpg` | Foreword portrait (Secretary General) |
