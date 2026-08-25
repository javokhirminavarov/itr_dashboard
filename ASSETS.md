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
  **1600 × 800** sections stacked top to bottom (rendered at 3000 × 1500 — the
  page fits the corridor like `object-fit: cover`, so the art paints wider than
  the viewport and a 2000 px render would be upscaled on a large screen). The
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
- If the final render **moves the road** or **changes its width law**, re-trace
  `JOURNEY.route.d` against it and update `JOURNEY.route.width` — including
  `holdY` and `holdDepth`, the point at which the corridor stops opening out
  and the scale it holds from there down. The
  glow trail, the flowing chevrons, the map pins, the building captions and the
  truck all derive from those two values alone.

## A. Corridor sections (six, required)

Content top → bottom, one landmark per row:

| Row | Centre y | Landmark |
|---|---|---|
| 1 | 400 | sky, hazed mountains, the corridor running to the horizon — the 2018 frame is drawn over this |
| 2 | 1200 | **border checkpoint**: canopy over the lanes, booths, main hall, floodlight masts |
| 3 | 2000 | inspection portal, inland checkpoint gantry (the roadside cameras are drawn by the page, not by the plate — see D4) |
| 4 | 2800 | **customs warehouse**: dock doors, apron, parked trailers |
| 5 | 3600 | declaration building: glass office, car park, exit gantry at the row's foot |
| 6 | 4400 | importer's premises: offices, container yard, and the outskirts of the capital at the page's foot |

- **Minimum 3000 px wide per section**, sRGB, one consistent light direction
  (the current art is a high midday sun, slightly to the upper right).
- **Seams:** at every section boundary the road edges, the ground tone and the
  haze must match. The generator gets this for free by authoring the whole
  corridor once and slicing it; a hand-rendered replacement must match by eye.
- **Calm bands:** the left ~26 % and the right ~26 % of the frame carry the
  cards and the metric panels. Keep those bands visually quiet.
- **Road surface empty.** No vehicles on the carriageway at all — the page
  composes the consignment as an overlay and nothing else drives this road.
  Static plant off the road (trailers on the warehouse apron) is wanted.
- **No roadside furniture beyond the road's own.** No trees, no bushes, no
  hedge lines; no marker posts, no power poles or catenary, no perimeter
  hairlines running out to the frame edges. The guardrail stays, because it is
  part of the road. Depth is carried by aerial haze and by the road's own
  width law.
- **The ground is a background.** A patchwork of large, low-contrast plots and
  nothing else: no ploughing hatch, no irrigation canals, no scattered sheds or
  blotches. It reads as cultivated plain at a glance and does not reward a
  second look — the road, the landmarks and the two calm bands are the
  subject.
- **One scale below the ramp.** The ground plane opens out over the first ~620
  page units, out of the horizon, and then holds that scale to the foot of the
  page: road width, prop size, field size and haze are all constant from there
  down. A perspective carried the whole way grows everything about six-fold
  between the border and the city, which on a page that is *scrolled* reads as
  a slow zoom rather than as travel. A hand-rendered replacement must hold the
  same discipline, and `JOURNEY.route.width` (`holdY`, `holdDepth`) must match
  whatever law it uses.
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

## C. Secondary scene — 1600 × 900

1. Customs warehouse interior, unloading bay (a dock door standing open onto
   daylight), shown in the "Customs and cargo operations" marker's panel

It is an **interior**, and an interior is lit by its own lights whatever the sky
is doing — it is deliberately darker than the corridor. What must agree with the
corridor is anything you can see *through*: the open dock door. That reads as a
bright day.

The deck used to carry two more of these — a targeting-centre control room on
section 2 and an airport arrivals hall on section 7 — as cut-in images beside
the content. Both are gone: the sections say what they have to say in words and
in their own diagrams, and a small photographic inset beside them was decoration
competing with the argument.

## D. Vectors (SVG)

1. Route path traced over the final corridor, in page coordinates (replaces
   `JOURNEY.route.d`), plus the matching `JOURNEY.route.width` law.
2. Uzbekistan outline with the real corridor and checkpoint nodes (for a
   locator motif; not yet placed).
3. **Building captions are HTML overlays, not plate text.** "Border checkpoint"
   and "Customs warehouse" are positioned from `JOURNEY.labels` in page
   coordinates and centred on the middle of each building's own roofline, so
   the words sit on the building. Do not bake them into a plate; if a final
   render moves a roofline, move the `x`/`y` in `plates.js` to the middle of
   the roof as drawn.
4. **The roadside cameras are page vectors, not plate art.** The transit
   passage carries two, listed in `JOURNEY.cameras` and drawn by
   `buildCameras()` in `app.js` in the same page coordinates as the route, at a
   size set in road half-widths so they hold the corridor's perspective. They
   were baked into the plates once, as masts 3.4 road-widths tall, and at
   viewport scale that read as a gantry with something small on top rather than
   as a camera. Do not bake them back in: a small object has to stay vector to
   stay legible, and the size is then a number in one file.

## E. Type & colour

- Current faces (self-hosted, OFL): **Space Grotesk** (display/body), **IBM
  Plex Mono** (numerals, tokens, chips). To swap in a licensed brand face: drop
  the woff2 into `assets/fonts/`, update the `@font-face` block and the two
  `--font-*` tokens at the top of `styles.css`.
- The palette **is the official deck's**, sampled from the slides rather than
  chosen, and centralised in the `:root` tokens of `styles.css`. It is a
  **light** palette, because the corridor is a daylight scene.

  | Token | Value | What it is on the deck |
  |---|---|---|
  | `--brand` | `#00569b` | the blue every title, label and card outline is set in |
  | `--brand-line` | `#337ed2` | the card outline itself |
  | `--brand-sky` | `#12a7eb` | the area-chart blue |
  | `--navy` | `#183e69` | the deep tiles and the ring's dark arc |
  | `--cyan` | `#2bada7` | the cyan tiles and the ring's light arc |
  | `--green` | `#048d01` | **every headline figure** and growth arrow |

  The blue/green division is also the accessibility division, and it was
  measured: `--brand` clears 7.3:1 on white and is safe at any size; `--green`
  clears 3.9:1 and is therefore a **mark and big-figure colour only**, with
  `--green-ink` (5.6:1) as its partner for small type. Same rule for
  `--brand-ink` and `--cyan-ink`.

  Two further things were measured rather than chosen and should be re-measured
  if they change: `--ink-faint` is the smallest type on the page and clears
  4.5:1 on both the panel white and the page ground; and the three chart series
  colours (`--series-a/b/n`) plus the channel colours were checked as a set for
  colour-vision-deficiency separation. `node tools/verify.mjs` asserts the
  first of those.
- The corridor's own palette lives at the top of `tools/build_plates.py`.
  `SIGNAL` (`#1a86d0`) is the risk-management system's signature on the plates
  — the deck blue *lifted*, because `#00569b` against asphalt reads as a dark
  smudge rather than as instrumentation. The secondary scenes take their screen
  glow from the literals in `tools/build_scenes.py`.

---

# Figure replacement checklist

**Most figures on screen are still illustrative**, and the table below is the
list of what has to be replaced before the visit. The page no longer says so on
screen: the badge and the on-slide disclosure were presentation furniture, and
the presenter says it out loud instead.

Replace each value in `demo-data.js`. Nothing else needs editing. Figures
written as `{{TOKEN}}` render as dashed *awaiting figure* chips; `ETRANSIT_SHARE`
is deliberately left as one.

**Values taken from the official deck, and NOT to be re-invented** — these came
off the *Statistics at the border* slide and are the page's only sourced
figures:

| § | Where | What | Shown now |
|---|---|---|---|
| 3 | tiles | the border network | `61` customs posts |
| 3 | tiles | transactions by mode | avto `4.5` · cargo `5.2` · railway `1.2` mln |
| 3 | metric | vehicles crossing a day | `30 k` (×2.9 on 2018) |
| 3 | metric | transactions a day | `87 k` (×3.2 on 2018) |
| 3 | metric | customs officers on daily duty | `3,184` (+10% since 2018) |

The deck's *Targeting Center* and *E-Transit AAT* slides are likewise the
authority for section 2's eight functions, its six monitored channels, and the
E-Transit panel's eight points. Those carry no figures, so nothing of theirs
appears below.

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
| 3 | awaiting | customs officers on daily duty, 2018 | the deck charts the bar but does not print the number; the page states the +10% instead |
| 3 | channel split | green / yellow / red at the gate | `71%` / `24%` / `5%` |
| 3 | metric | decision time at the gate | `2.1 min` |
| 3 | metric | seizure cases at the border | `1,860` (+18% on 2024) |
| 3 | consignment state | GPS seal / checkpoints / alerts | `FITTED` / `7` / `0` |
| 3 | metric | seizures on supervised transit | `1,248` (up ×2 since 2022) |
| 3 | metric | share of transit movements cleared on E-Transit | *awaiting figure* — the deck defines the system but not its uptake |
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
