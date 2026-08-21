# Asset request & drop-in contract

The page currently runs on **pre-viz stand-in plates** (schematic SVGs
watermarked "PRE-VIZ PLATE · FINAL ART PENDING"). This document is the formal
request for the final rendered art, and the contract that lets it drop in
without touching layout code.

## How drop-in works

- `plates.js` is the **only coordinate authority**: plate file paths and pixel
  sizes, per-stage camera rectangles, the route path, and the truck anchors
  all live there. Layout code holds no plate coordinates.
- To install a final render: replace the file under `assets/plates/` and update
  that plate's `src` (and `width`/`height` if they differ) in `plates.js`.
  Nothing else changes.
- The truck follows an SVG path defined in `plates.js` in **master-plate pixel
  coordinates** — the route is never baked into a plate file. If the final
  master render moves the road, re-trace `PLATES.master.route.d` (and, if
  needed, the per-stage `camera` rects) against the new image; the glow line,
  truck motion and all ten camera positions update from those values alone.
- All text, numbers, panels and icons are HTML/SVG overlays. **Final plates
  must contain no text, no signage words, no UI panels, no numbers, and no
  vehicles.** The pre-viz captions and rulers exist only in the stand-ins.

## A. Master corridor plate (required)

- Content, left → right: border crossing gate → open road with CCTV masts →
  customs warehouse → declaration building → exit toward Tashkent.
- **Minimum 7680×2160**, WebP or PNG, sRGB, single consistent sun direction
  (current pre-viz assumes dusk, light from the right).
- Road surface empty. No trucks anywhere.
- **Calm bands:** top ~20% and bottom ~15% of the frame must stay visually
  quiet — glass panels and metrics overlay there. The current stand-in keeps
  the road band mid-frame (~y 1150–1500 of 2160) with the entire bottom third
  calm; matching that composition means every existing camera rect survives.
- Current camera rects (master-plate px, from `plates.js`) — final art should
  keep each zone inside its rect:
  | Stage | rect x,y,w | shows |
  |---|---|---|
  | 1 | 0, 0, 3840 | gate + corridor start |
  | 2 | 150, 124, 3400 | gate zone wide |
  | 3 | 120, 420, 2400 | gate + scanner portal close |
  | 4 | 1500, 330, 2900 | CCTV corridor |
  | 7 | 4680, 300, 3000 | declaration → exit |
  | 10 | full plate, letterboxed | whole corridor |

## B. Truck sprites

- 3/4 or side view matching the master plate's perspective, transparent PNG,
  **~1200 px wide**, facing right (direction of travel).
- Variants: **travelling (doors closed)** · **stopped at gate** · **at
  warehouse dock, doors open**. If perspective shifts along the plate, three
  angle variants.
- The page composes state decorations (scan highlight, seal tag) as overlays,
  so plain variants are enough. Sprite anchor is bottom-centre of the wheels.

## C. Secondary plates — 2560×1440 each, same rules as A

1. Rail terminal (gantry crane, wagons, container stacks)
2. Air cargo apron (freighter, ULDs, loader)
3. Customs warehouse interior, unloading bay
4. Targeting centre interior — screens must be **blank glows**, no readable
   content, no numbers
5. Airport arrivals hall (control booths, lanes)

## D. Vectors (SVG)

1. Route path traced over the final master plate, in plate pixel coordinates
   (replaces `PLATES.master.route.d`).
2. Uzbekistan outline with the real corridor and checkpoint nodes (for a
   locator motif; not yet placed on a stage).
3. Customs Committee emblem (the page currently shows none rather than a fake).

## E. Type & colour

- Current faces (self-hosted, OFL): **Space Grotesk** (display/body),
  **IBM Plex Mono** (numerals, tokens, chips). To swap in a licensed brand
  face: drop the woff2 into `assets/fonts/`, update the `@font-face` block and
  the two `--font-*` tokens at the top of `styles.css`.
- Accent palette is centralised in the `:root` tokens of `styles.css`
  (`--teal` accent on near-black). Official palette welcome if one exists.

---

# Figure fill-in sheet

Every figure below renders as a visibly-unfilled `{{TOKEN}}` chip until the
real value is written into `demo-data.js` (replace the token string with the
final display string, e.g. `"38 min"`, `"2.1×"`, `"UZS 210 bn"`). Nothing else
needs editing. **Do not** put risk rules, thresholds or scores anywhere —
channel outcomes stay the words green / yellow / red.

| Token | Stage | What it is |
|---|---|---|
| `BORDER_WAIT_2018` | 1 | typical border wait in 2018 (e.g. "3–5 days") |
| `OVERALL_SELECTIVITY_NOW` | 2 | share of consignments selected for control, all modes |
| `ROAD_SELECTIVITY_NOW` | 2 | share selected — road |
| `RAIL_SELECTIVITY_NOW` | 2 | share selected — rail |
| `AIR_SELECTIVITY_NOW` | 2 | share selected — air cargo |
| `GATE_DECISION_TIME_NOW` | 3 | time to channel decision at the gate |
| `TRANSIT_SEIZURES_LATEST` | 4 | seizures on supervised transit, latest period |
| `TRANSIT_SEIZURES_TREND` | 4 | its trend line (e.g. "up ×2 since 2022") |
| `TRANSIT_LEGAL_BASIS` | 4 | legal instrument authorising transit supervision |
| `WAREHOUSE_ATTENDANCE_NOW` | 5 | share of unloadings with an officer attending |
| `DECL_VIOLATION_RATE_SELECTED` | 6 | violation rate on RMS-selected declarations |
| `DECL_VIOLATION_RATE_RANDOM` | 6 | violation rate on random selection |
| `CLEARANCE_TIME_NOW` | 7 | average clearance time now |
| `CLEARANCE_TIME_2018` | 7 | average clearance time in 2018 |
| `INSPECTION_HIT_RATE_NOW` | 7 | share of inspections finding a violation |
| `PCA_RESULTS_LATEST` | 8 | post-clearance audit results, latest period |
| `PCA_RESULTS_TREND` | 8 | PCA results trend |
| `PCA_EXTRA_REVENUE_LATEST` | 8 | additional revenue assessed (secondary metric) |
| `PAX_HIT_RATE_TARGETED` | 9 | hit rate on targeted passenger selections |
| `PAX_HIT_RATE_RANDOM` | 9 | hit rate on random passenger checks |

Config: `demoData.meta.trsMethodology` — set `true` once clearance times follow
WCO Time Release Study methodology; stage 7 then prints the TRS footnote.
