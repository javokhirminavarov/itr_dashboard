# Asset request & drop-in contract

The corridor and the three secondary scenes are **generated art**, produced by
the scripts in `tools/` and committed as the images the page serves. They read
as a rendered daylight corridor rather than a diagram, but they are not
photography. This document is the formal request for final rendered art, and
the contract that lets it drop in without touching layout code.

## How drop-in works

- `plates.js` is the **only coordinate authority**: the page space, the section
  list, the route path, the road-width law, the map pins, the building captions
  and the truck's states all live there. Layout code holds no plate coordinates.
- The corridor is a page space of **1600 × 4800 units**, shipped as six
  **1600 × 800** sections stacked top to bottom (rendered at 2000 × 1000). The
  page maps that space to the viewport by width, so one page unit is
  `viewportWidth / 1600` CSS pixels.
- The corridor is **six rows of 800 units — one row per section plate**, which
  is why a landmark and its plate cannot drift apart. Each landmark sits on its
  row's centre line (400, 1200, 2000, 2800, 3600, 4400) and the generator places
  them all with one `R(n)` helper. Final art must keep each landmark on its
  row's centre line, or the cards will no longer line up with what they
  describe.
- To install a final render: drop the image in as
  `assets/plates/vertical/sN.jpg` (any format the browser reads works — update
  that section's `src` in `plates.js` if the extension changes). Nothing else
  changes.
- If the final render **moves the road**, re-trace `JOURNEY.route.d` against it
  and update `JOURNEY.route.width` to match the new road half-width law. The
  glow trail, the flowing chevrons, the map pins, the building captions and the
  truck all derive from those two values alone.

## A. Corridor sections (six, required)

Content top → bottom, one landmark per row:

| Row | Centre y | Landmark |
|---|---|---|
| 1 | 400 | sky, hazed mountains, the corridor running to the horizon — the 2018 frame is drawn over this |
| 2 | 1200 | **border checkpoint**: canopy over the lanes, booths, main hall, floodlight masts |
| 3 | 2000 | inspection portal, CCTV masts, inland checkpoint gantry |
| 4 | 2800 | **customs warehouse**: dock doors, apron, parked trailers |
| 5 | 3600 | declaration building: glass office, car park, exit gantry at the row's foot |
| 6 | 4400 | importer's premises: offices, container yard, and the outskirts of the capital at the page's foot |

- **Minimum 2000 px wide per section**, sRGB, one consistent light direction
  (the current art is a high midday sun, slightly to the upper right).
- **Seams:** at every section boundary the road edges, the ground tone and the
  haze must match. The generator gets this for free by authoring the whole
  corridor once and slicing it; a hand-rendered replacement must match by eye.
- **Calm bands:** the left ~26 % and the right ~26 % of the frame carry the
  cards and the metric panels. Keep those bands visually quiet.
- **Road surface empty.** No vehicles on the carriageway — the page composes the
  consignment, and the 2018 queue (see B), as overlays. Static plant off the
  road (trailers on the warehouse apron, marker posts on the verge) is wanted.
- **No vegetation.** No trees, no bushes, no hedge lines. Depth is carried by
  aerial haze, by the field patchwork, and by the verge marker posts, whose
  drawn height and spacing are both pure functions of depth.
- **No text, no signage words, no numbers, no UI panels, and no flag.** Every
  word on screen is an HTML overlay — including the two building captions, see
  D3 below.

## B. Truck sprite

- The corridor recedes toward the border at the top of the page, so the
  consignment drives **toward the camera**: a **front three-quarter view**,
  transparent PNG, ~600 px wide, drawn 120 × 152 page units with its contact
  point at the bottom centre. Daylight, so no lit headlights and no light wash
  on the road — a ground shadow thrown down and to the left instead.
- Variants: **travelling (doors closed)** · **scanned** (the page adds the teal
  outline) · **sealed** (the page adds the GPS seal tag). Plain variants are
  enough; the state decorations are overlays.

**The 2018 queue.** The first corridor beat draws a queue of halted trucks
between the consignment and the gate, plus two pulled onto the verge — the
"every truck stopped, every consignment opened by hand" the copy describes. It
is an overlay in corridor coordinates (`JOURNEY.queue2018` in `plates.js`),
**not** part of any plate, and it cross-fades out as the reader scrolls into the
modern system while the teal chevrons and tracking trail fade in. So the plates
themselves stay "today" and the no-vehicles rule above is unchanged. A final
render needs no queue in it.

## C. Secondary scenes — 1600 × 900 each

1. Customs warehouse interior, unloading bay (a dock door standing open onto
   daylight)
2. Targeting centre interior — screens must be **blank glows**, no readable
   content, no numbers
3. Airport arrivals hall (control booths, lanes, daylight through the glazing)

All three are **interiors**, and an interior is lit by its own lights whatever
the sky is doing — they are deliberately darker than the corridor. What must
agree with the corridor is anything you can see *through*: an open door, a
window wall. Those read as a bright day.

## D. Vectors (SVG)

1. Route path traced over the final corridor, in page coordinates (replaces
   `JOURNEY.route.d`), plus the matching `JOURNEY.route.width` law.
2. Uzbekistan outline with the real corridor and checkpoint nodes (for a
   locator motif; not yet placed).
3. **Building captions are HTML overlays, not plate text.** "Border checkpoint"
   and "Customs warehouse" are positioned from `JOURNEY.labels` in page
   coordinates, above each building's highest roof point. Do not bake them into
   a plate; if a final render moves a roofline, move the `y` in `plates.js`.
4. Customs Committee emblem. The page currently shows a neutral mark rather
   than a fake one — `buildChrome()` in `app.js` draws it.

## E. Type & colour

- Current faces (self-hosted, OFL): **Space Grotesk** (display/body), **IBM
  Plex Mono** (numerals, tokens, chips). To swap in a licensed brand face: drop
  the woff2 into `assets/fonts/`, update the `@font-face` block and the two
  `--font-*` tokens at the top of `styles.css`.
- The palette is centralised in the `:root` tokens of `styles.css`. It is a
  **light** palette, because the corridor is a daylight scene. Two things were
  measured rather than chosen and should be re-measured if they change:
  `--ink-faint` is the smallest type on the page and clears 4.5:1 on both the
  panel white and the page ground; and the three chart series colours
  (`--series-a/b/n`) plus the channel colours were checked as a set for
  colour-vision-deficiency separation. An official palette is welcome, but run
  those two checks against it.
- The generator's own palette lives at the top of `tools/build_plates.py`.

---

# Figure replacement checklist

**Every figure on screen is illustrative.** The page says so — the header
carries an `ILLUSTRATIVE FIGURES` badge and the 2018 beat prints the disclosure.
Both are driven by `demoData.meta.figuresIllustrative`; set it to `false` once
the table below is cleared and the badge and its wording disappear.

Replace each value in `demo-data.js`. Nothing else needs editing. Figures
written as `{{TOKEN}}` render as dashed *awaiting figure* chips;
`TRANSIT_LEGAL_BASIS` and `ETRANSIT_MORE` are deliberately left as ones.

**Values the presenter supplied and that should survive review as-is:** the
~430 customs warehouses on the platform (section 4).

**Values to check first**, because they are the least plausible as invented:
the 63 % audit hit rate and the UZS 214 bn additional revenue (section 6), and
the 96.4 / 3.6 passenger channel split (section 7).

| § | Where | What | Shown now |
|---|---|---|---|
| 3 | metric | consignments physically inspected | `100%` — 2018, every truck |
| 3 | metric | inspections that found a violation | `~3%` |
| 3 | metric | typical wait at the border | `3–5 days` |
| 3 | chart | Vehicles crossing, indexed 2018=100 | `100 118 96 131 168 196 224 247` |
| 3 | chart | Cargo carried, indexed 2018=100 | `100 112 91 124 151 173 192 208` |
| 3 | consignment state | pre-arrival risk / data sources | `MEDIUM` / `12` |
| 3 | metric | trucks cleared at the border, 2025 | `2.71 m` (×2.5 on 2018) |
| 3 | metric | trucks a day, average | `7,420` (peaks above 9,000) |
| 3 | channel split | green / yellow / red at the gate | `71%` / `24%` / `5%` |
| 3 | metric | decision time at the gate | `2.1 min` |
| 3 | metric | seizure cases at the border | `1,860` (+18% on 2024) |
| 3 | consignment state | GPS seal / checkpoints / alerts | `FITTED` / `7` / `0` |
| 3 | metric | seizures on supervised transit | `1,248` (up ×2 since 2022) |
| 3 | legal basis | transit supervision | *awaiting figure* — **left unfilled on purpose** |
| 4 | growth | customs warehouses | `264` → `430` (×1.6) |
| 4 | growth | shipments placed | `96 k` → `412 k` (×4.3) |
| 4 | growth | total value of goods | `UZS 18.4 tn` → `UZS 71.9 tn` (×3.9) |
| 4 | growth | total weight of goods | `1.9 m t` → `6.4 m t` (×3.4) |
| 4 | share | officer attended / remote only, 2025 | `28%` / `72%` |
| 5 | RMS structure | categorisation of entities | `4 categories`, `312 risk criteria` |
| 5 | RMS structure | risk profiles | `1,146` — `186` undervaluation, `143` misclassification, `27` AI-based |
| 5 | RMS structure | random selection module | `3% of declarations` |
| 5 | metric | customs declarations | `1.42 m` (×2.6 on 2018) |
| 5 | metric | foreign trade turnover | `USD 62.4 bn` (×2.2 on 2018) |
| 5 | metric | consignments declared | `3.86 m` (×2.4 on 2018) |
| 5 | metric | traders on the register | `38,700` (×1.9 on 2018) |
| 5 | shift | declarations by channel, 2018 | `0 / 0 / 100` green / yellow / red |
| 5 | shift | declarations by channel, 2025 | `68 / 26 / 6` |
| 5 | metric | average clearance time | `1.6 hrs` vs `3–5 days` in 2018 |
| 5 | metric | risk confirmation rate | `18.6%` vs `7.3%` on random selection |
| 5 | metric | customs violations detected | `24,180` (+14% on 2024) |
| 6 | metric | customs audits conducted | `3,140` (+9%) |
| 6 | metric | audits with findings | `1,982` (+14%) |
| 6 | metric | audits that found something | `63%` vs `21%` random — **check this** |
| 6 | metric | risk profiles updated, latest month | `243` |
| 6 | metric | additional revenue assessed | `UZS 214 bn` — **check this** |
| 7 | channels | green / red passenger channel | `96.4%` / `3.6%` — **check this** |
| 7 | chart | arriving passengers, indexed 2018=100 | `100 121 34 62 128 174 219 264` |
| 7 | metric | passenger risk criteria in use | `148` (from `26` in 2018) |
| 7 | metric | airlines providing API data | `34` (from `6` in 2018) |
| 7 | metric | hit rate on targeted selections | `11.4%` vs `0.8%` random |

Config: `demoData.meta.trsMethodology` — set `true` once clearance times follow
WCO Time Release Study methodology; section 5 then prints the TRS footnote.

**Names to confirm before the visit:** the page writes the WCO enforcement
platform as **CENcomm** (section 2, and the targeting centre modal).

**Do not** put risk rules, thresholds or scores anywhere — channel outcomes stay
the words green / yellow / red.
