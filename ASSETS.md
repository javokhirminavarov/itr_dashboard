# Asset request & drop-in contract

The corridor and the five secondary scenes are **generated art**, produced by
the scripts in `tools/` and committed as the images the page serves. They read
as a rendered dusk corridor rather than a diagram, but they are not
photography. This document is the formal request for final rendered art, and
the contract that lets it drop in without touching layout code.

## How drop-in works

- `plates.js` is the **only coordinate authority**: the page space, the section
  list, the route path, the road-width law, the map pins and the truck's states
  all live there. Layout code holds no plate coordinates.
- The corridor is a page space of **1600 × 4800 units**, shipped as six
  **1600 × 800** sections stacked top to bottom (rendered at 2000 × 1000). The
  page maps that space to the viewport by width, so one page unit is
  `viewportWidth / 1600` CSS pixels.
- The page is **ten rows of 480 units**, one per stage. Each stage's landmark
  sits on its row's centre line — 240, 720, 1200, 1680, 2160, 2640, 3120, 3600,
  4080, 4560 — and the generator places them all with one `R(n)` helper. Final
  art must keep each landmark on its row's centre line, or the stage cards will
  no longer line up with what they describe.
- To install a final render: drop the image in as
  `assets/plates/vertical/sN.jpg` (any format the browser reads works — update
  that section's `src` in `plates.js` if the extension changes). Nothing else
  changes.
- If the final render **moves the road**, re-trace `JOURNEY.route.d` against it
  and update `JOURNEY.route.width` to match the new road half-width law. The
  glow trail, the flowing chevrons, the map pins and the truck all derive from
  those two values alone.

## A. Corridor sections (six, required)

Content top → bottom, one landmark per stage row:

| Row | Centre y | Landmark |
|---|---|---|
| 1 | 240 | sky, hazed mountains, the corridor running to the horizon |
| 2 | 720 | rail line crossing the corridor; an aircraft on approach in the sky |
| 3 | 1200 | **border gate**: canopy over the lanes, booths, flag mast, floodlights |
| 4 | 1680 | inspection portal, CCTV masts, inland checkpoint gantry |
| 5 | 2160 | **customs warehouse**: dock doors, yard, parked trailers |
| 6 | 2640 | **declaration building**: glass office, car park |
| 7 | 3120 | release plaza and exit gantry |
| 8 | 3600 | importer's premises: offices, container yard |
| 9 | 4080 | passenger terminal: apron, aircraft on stand, control tower |
| 10 | 4560 | overpass, then the Tashkent skyline and the TV tower |

- **Minimum 2000 px wide per section**, sRGB, one consistent light direction
  (the current art assumes dusk, sun low and off to the upper right).
- **Seams:** at every section boundary the road edges, the ground tone and the
  haze must match. The generator gets this for free by authoring the whole
  corridor once and slicing it; a hand-rendered replacement must match by eye.
- **Calm bands:** the left ~26 % and the right ~26 % of the frame carry the
  stage cards and the metric panels. Keep those bands visually quiet.
- **Road surface empty.** No vehicles on the carriageway — the page composes
  the consignment, and the 2018 queue (see B), as overlays. Static plant off
  the road (parked trailers in the warehouse yard, an aircraft on stand) is
  wanted.
- **No text, no signage words, no numbers, no UI panels.** Every word on screen
  is an HTML overlay.

## B. Truck sprite

- The corridor recedes toward the border at the top of the page, so the
  consignment drives **toward the camera**: a **front three-quarter view** with
  headlights on, transparent PNG, ~600 px wide, drawn 120 × 152 page units with
  its contact point at the bottom centre.
- Variants: **travelling (doors closed)** · **scanned** (the page adds the teal
  outline) · **sealed** (the page adds the seal tag). Plain variants are enough;
  the state decorations are overlays.

**The 2018 queue.** Stage 1 draws a queue of halted trucks between the
consignment and the gate, plus two pulled onto the verge under a work light —
the "every truck stopped, every consignment opened by hand" the copy describes.
It is an overlay in corridor coordinates (`JOURNEY.queue2018` in `plates.js`),
**not** part of any plate, and it cross-fades out as the reader scrolls into the
modern system while the teal chevrons and tracking trail fade in. So the plates
themselves stay "today" and the no-vehicles rule above is unchanged. A final
render needs no queue in it; a simpler front-view truck sprite for the queue is
welcome but the page draws its own if none is supplied.

## C. Secondary scenes — 1600 × 900 each, same rules as A

1. Rail terminal (gantry crane, wagons, container stacks)
2. Air cargo apron (freighter, ULDs, loader)
3. Customs warehouse interior, unloading bay
4. Targeting centre interior — screens must be **blank glows**, no readable
   content, no numbers
5. Airport arrivals hall (control booths, lanes)

## D. Vectors (SVG)

1. Route path traced over the final corridor, in page coordinates (replaces
   `JOURNEY.route.d`), plus the matching `JOURNEY.route.width` law.
2. Uzbekistan outline with the real corridor and checkpoint nodes (for a
   locator motif; not yet placed on a stage).
3. Customs Committee emblem. The page currently shows a neutral mark rather
   than a fake one — `buildChrome()` in `app.js` draws it.

## E. Type & colour

- Current faces (self-hosted, OFL): **Space Grotesk** (display/body), **IBM
  Plex Mono** (numerals, tokens, chips). To swap in a licensed brand face: drop
  the woff2 into `assets/fonts/`, update the `@font-face` block and the two
  `--font-*` tokens at the top of `styles.css`.
- Accent palette is centralised in the `:root` tokens of `styles.css`
  (`--teal` accent on near-black). Official palette welcome if one exists.

---

# Figure replacement checklist

**Every figure on screen is illustrative.** The page says so — the header
carries an `ILLUSTRATIVE FIGURES` badge and stage 1 prints the disclosure. Both
are driven by `demoData.meta.figuresIllustrative`; set it to `false` once the
table below is cleared and the badge and its wording disappear.

Replace each value in `demo-data.js`. Nothing else needs editing.

| Stage | Field | Shown now | Must be |
|---|---|---|---|
| 1 | inspected share | `100%` | 2018 baseline — verify |
| 1 | inspection hit rate | `~3%` | 2018 baseline — verify |
| 1 | border wait | `3–5 days` | typical wait in 2018 |
| 2 | overall selectivity | `29%` | share selected for control, all modes |
| 2 | road / rail / air | `29%` / `18%` / `34%` | share selected, per mode |
| 3 | pre-arrival risk, data sources | `MEDIUM`, `12` | state of the consignment shown |
| 3 | channel split | `71%` / `24%` / `5%` | green / yellow / red share, road |
| 3 | gate decision time | `2.1 min` | time to channel decision at the gate |
| 4 | checkpoints, alerts | `7`, `0` | state of the consignment shown |
| 4 | transit seizures | `1,248` + `up ×2 since 2022` | seizures on supervised transit, and the trend |
| 4 | legal basis | *awaiting figure* | **left unfilled on purpose** — a legal citation must not be invented |
| 5 | officer attendance | `28%` | share of unloadings with an officer attending |
| 6 | violation rate | `18.6%` vs `7.3%` | RMS-selected vs random selection |
| 7 | clearance time | `1.6 hrs` vs `3–5 days` | now vs 2018 |
| 7 | inspection hit rate | `92%` | **check this first** — the least plausible figure on the page |
| 8 | audit findings | `1,982` + `+14%` | post-clearance audit results, and the trend |
| 8 | additional revenue | `UZS 214 bn` | **check this** — invented magnitude |
| 8 | risk profiles updated | `243` | profiles rebuilt from audit findings, latest month |
| 9 | passenger hit rate | `11.4%` vs `0.8%` | targeted vs random checks |

Config: `demoData.meta.trsMethodology` — set `true` once clearance times follow
WCO Time Release Study methodology; stage 7 then prints the TRS footnote.

**Do not** put risk rules, thresholds or scores anywhere — channel outcomes stay
the words green / yellow / red.
