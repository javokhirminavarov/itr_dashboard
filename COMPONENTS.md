# Explore — component library (`charts.js`)

The Explore app is assembled from one small library of chart primitives. Every
component follows a single contract:

```js
ITR.<name>(opts) -> DOM node
```

- **Data in, styled inline SVG out.** Each function returns a ready-to-append DOM
  node — an `<svg>`, or a wrapper `<div>` that holds inline SVG plus an HTML
  legend where a legend is genuinely needed (donut, stacked, choropleth,
  operPanels).
- **No framework, no chart library, no CDN.** Hand-authored inline SVG. Loaded as
  a plain `<script>`; exposes a single global `window.ITR`.
- **Shared across every component:** one tooltip layer (`ITR.tip`), one number
  formatter (`ITR.fmt`), one palette (`ITR.palette`). Reuse these verbatim in
  Phases B–F — do not fork them.
- **Responsive:** every chart uses `viewBox` + `width:100%`, so it scales to its
  card. Cards reflow from multi-column (desktop) to single-column (mobile).

All figures are one-decimal for rates and quantities; counts are integers with
thousands separators (see `ITR.fmt`).

---

## Shared services

### `ITR.fmt` — number formatting
| Fn | Output | Use |
|---|---|---|
| `fmt.pct(v)` | `78.4%` | percentages / shares (one decimal) |
| `fmt.dec(v)` | `548.8` | quantities, tonnes (one decimal, grouped) |
| `fmt.int(v)` | `37,058` | case / seizure counts (integer, grouped) |
| `fmt.t(v)` | `548.8 t` | tonnes with unit |
| `fmt.k(v)` | `34.7k`, `1.3M` | compact counts for tight labels |
| `fmt.signedPct(v)` | `+62.2%` | signed change |
| `fmt.delta(curr, prev)` | number or `null` | YoY % change, `null` when `prev` is 0/undefined |

### `ITR.palette` — colours (documented once, reused everywhere)
```
accent      #2F6DB5   WCO blue — the anchor / primary series
accentDeep  #1B4A82   dark end of the blue ramp
accentPale  #EAF2FA   pale end of the blue ramp
gray        #8A8F9A   context / previous-year / reference series
noData      #ECEEF1   map cells with no value
cat[]       #2F6DB5 #E69F00 #009E73 #CC79A7 #D55E00 #56B4E9 #8C6BB1 #B23A3A
```
`cat[]` is the fixed categorical order — assign by entity, **never cycle a 9th
hue**. `ITR.catColor(i)` returns `cat[i % 8]`. `ITR.ramp(t)` returns the honest
single-hue blue sequential colour for `t∈[0,1]` (pale→accent→deep), used by
`choropleth` and `heatGrid`. Full rationale + validation in
[`PALETTE.md`](PALETTE.md).

### `ITR.tip` — the one shared tooltip layer
A single fixed-position `<div>` appended to `<body>`; every mark binds to it via
`tip.bind(node, htmlFn)` (pointer + touch). Helper `tipRows(title, rows)` formats
a titled key/value block.

---

## Components

Common options: `width` (viewBox width, default 680), `label`/`value`/`prev`/`curr`
(a **string key** or an **accessor fn** into each datum), `valueFmt` (an `ITR.fmt`
fn), `ariaLabel`, `metric` (tooltip metric name). Data objects may carry a
bilingual `{en, fr}`; pass `label:"en"` to read the English label.

### `hbar(opts)` — ranked horizontal bars
Single-accent bars with direct value labels; the workhorse for "top N".
```
{ data:[{label,value}], value?, label?, valueFmt?, color?, max?, metric?,
  width?, rowH?, barH?, labelW?, ariaLabel? }
```

### `groupedYoY(opts)` — paired previous / current bars
Two bars per category (current = accent, previous = gray) with a coloured YoY
delta chip in a reserved right lane. Two series → an in-SVG legend is drawn.
```
{ data:[{label,prev,curr}], prev?, curr?, label?, valueFmt?, metric?,
  years:{prev,curr}, max?, showDelta?(=true), width?, labelW?, ariaLabel? }
```

### `donut(opts)` / `donutB(opts)` — composition ring
Returns a wrapper `<div>` (SVG ring + HTML legend with values and shares).
`donut` centre shows a total; `donutB` centre shows the **leading slice's share**
as a headline (single-emphasis distributions, e.g. detection method).
```
{ data:[{label,value}], value?, label?, colors?, valueFmt?, metric?,
  centerValue?, centerLabel?, variant?('a'|'b'), ariaLabel? }
```

### `stackedBar(opts)` — one stacked row per category
E.g. trade direction by country. Returns a wrapper `<div>` (HTML key legend +
SVG). `mode:'value'` (default) draws true totals; `mode:'pct'` normalises each row
to 100%.
```
{ data:[{label,<key>:v,...}], keys:[..], keyLabels?, colors?, label?,
  valueFmt?, mode?('value'|'pct'), width?, labelW?, ariaLabel? }
```

### `choropleth(opts)` — world map, single honest hue
Reuses `data/world_map_paths.json`. Single-hue sequential ramp; skewed counts use
a `gamma` transform (default `0.5` = √) so mid-range countries stay visible.
Returns a wrapper `<div>` (SVG map + gradient legend).
```
{ world, values:{iso:v}, valueFmt?, max?, gamma?(=0.5), metric?,
  legendLabel?, nameOf?(iso)->name, ariaLabel? }
```

### `heatGrid(opts)` — matrix heatmap, single honest hue
Region × category, region × region, etc. Single-hue ramp; strongest cells get an
in-cell value label. `muteDiagonal` dims the i==i cells (intra-region flows).
```
{ rows:[labels], cols:[labels], matrix:[[..]], valueFmt?, metric?, max?,
  gamma?(=0.6), muteDiagonal?, cellH?, labelW?, colLabelH?, width?, ariaLabel? }
```

### `operPanels(opts)` — 2×2 operational grid
Four mini `hbar` panels: **location · direction · concealment · detection**.
Missing panels are skipped; the grid stays clean and reflows responsively.
```
{ location:[{en,cases}], direction:[{en,pct}],
  concealment:[{en,cases}], detection:[{en,pct}], topN?(=6) }
```

### `kpi(opts)` — headline figure tile
Returns an HTML card: a big value, a label, an optional YoY delta and sub-line.
```
{ value, label, sub?, delta?(number %), deltaLabel?, accent? }
```

---

## Adding a section (Phases B–F)

1. Fetch the section JSON (relative path).
2. Register the section as `live:true` in `explore.js` `SECTIONS`.
3. Compose cards from the components above — do **not** hand-author SVG. Feed each
   component the section's arrays and reuse `ITR.fmt` / `ITR.palette` unchanged.
4. Every figure keeps a `Source:` line and one-decimal discipline.
