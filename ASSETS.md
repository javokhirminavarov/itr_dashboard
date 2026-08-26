# The corridor: how it is drawn, and how to change it

The corridor, the arrivals hall and the warehouse floor plan are **drawn by the
page**, as SVG, in the deck's own palette. They used to be generated art — a Python script that
authored a daylight scene and a Playwright script that rasterised it to six
JPEGs — and this document used to be a request for final rendered art to drop in
over the top. That is no longer what the page wants.

## What changed, and why

The old corridor mixed three cameras in one frame: a one-point-perspective road
running to a hazed horizon, axonometric extruded buildings standing beside it,
and a flat top-down field under both. Nothing agreed about where the viewer was.
The consignment was a front three-quarter sprite that the route heading then
rotated as though it had been drawn from above anyway, and at 120 x 152 units —
wider than it was long, on two wheels — it read as a small van rather than as
international road freight. With saturated field green, ranks of identical
little blocks with checkerboard windows, and a bob animation on the vehicle, the
whole thing read as a city-builder game.

It is now **one orthographic plan**, seen from directly above, in the same
white/blue/grey the cards are set in. There is no sky, no horizon, no aerial
haze, no extrusion, no gradient standing in for light, and no green.

**Section 7 was the beat that repair missed**, and it carried every one of the
same faults. The arrivals hall was drawn in elevation — a roof slab, clerestory
glazing with mullions, a ground line, side-on e-gates, a scanner arch, a belt
with a case standing on it, two doorways with jambs and headers — with an
aircraft beside it drawn from directly above: two cameras in one frame. The
aircraft had the van's problem in mirror image, 148 units long with wings on one
side only and a fin fanned out as though seen from the side, so its span was a
third of its length where a narrowbody's span is about its length. Nothing was
measured against anything: at the aircraft's implied scale a passenger dot was a
person three and a half metres across. It is now the same plan as the corridor —
see **The arrivals hall** below.

## How it is put together

- `plates.js` is the **only coordinate authority**: the page space, the route
  path, the road width, the map pins, the building captions and the
  consignment's states all live there. Layout code holds no corridor
  coordinates.
- The corridor is a page space of **1600 x 4800 units**, drawn as **six 1600 x
  800 sections** of SVG stacked top to bottom. Everything is authored once in
  whole-page coordinates and sliced by `viewBox`, so the seams line up by
  construction. Sectioning exists so `content-visibility` can skip the rows that
  are off screen; it is not a division of the artwork.
- The page maps that space to the viewport by width, so one page unit is
  `viewportWidth / 1600` CSS pixels.
- Each of the six rows carries one landmark, on its row's centre line (400,
  1200, 2000, 2800, 3600, 4400), which is why a landmark and the card that
  describes it cannot drift apart.
- **The road is generated from `JOURNEY.route.d`**, not traced against a picture
  of one. Move the path and the carriageway, the glow trail, the flowing
  chevrons, the roadside cameras and the consignment all move with it. The old
  "re-trace the route if the render moves the road" step no longer exists,
  because there is no longer a render to disagree with.
- **Nothing carries a colour.** Every drawn element takes a class and
  `styles.css` holds the palette, in the `--plan-*` tokens beside the rest. This
  is the rule stated at the head of that file, and the art can now hold it.

## Scale

The **road and the consignment are true to each other** — about **14 page units
to the metre** — because that is the one proportion a viewer actually checks,
and getting it wrong is what made the old sprite read as a van. So `half: 52` is
a real 3.75 m lane, and the consignment at 36 x 232 units is a 2.55 m by 16.5 m
articulated combination: the legal maximum, and the vehicle a road corridor
actually handles.

The **facilities are not held to that scale**. A 60 m warehouse at 14 units to
the metre is wider than the whole clear band between the cards. They are drawn
instead as a **site plan cropped to the corridor**: the dock face, the apron and
the gate line are in frame, and the bulk of the shed runs off it — which is what
a real drawing at this zoom looks like.

The arrivals hall (section 7) is a second plan at **7 units to the metre** —
half the corridor's, because an aircraft is 37.6 m long where a lorry is 16.5 m.
It follows the same division: the aircraft, the gate islands, the carousels and
the passengers are true to each other and to that number; the terminal, which at
7 units to the metre is several times the frame, is cropped rather than shrunk
and runs off the right and bottom edges.

## What each row shows

| Row | Centre y | Landmark |
|---|---|---|
| 1 | 400 | the 2018 baseline: open carriageway, and the queue standing in a holding apron beside it |
| 2 | 1200 | **border checkpoint**: the carriageway opening into four lanes, islands, booths, barriers, a canopy over them, and the hall beside it |
| 3 | 2000 | inspection portal and the transit gantry where the seal goes on (the roadside cameras are drawn from `JOURNEY.cameras`, not as part of the row) |
| 4 | 2800 | **customs warehouse**: slip road, apron, dock line, trailers standing at the bays |
| 5 | 3600 | declaration office, its car park, and the exit gantry at the row's foot |
| 6 | 4400 | importer's premises, the container yard, and the capital as a street grid held far back in tone |

Rules that still hold:

- **Calm bands.** The left ~26 % and the right ~26 % of the frame carry the
  cards and the metric panels. Keep those bands visually quiet — a facility may
  run through them, but no landmark may depend on being seen there.
- **Road surface empty.** Nothing stands on the carriageway but the consignment.
  Static plant off the road — trailers at the dock, the 2018 queue in its
  holding apron — is wanted. `tools/verify.mjs` asserts this.
- **No text.** Every word on screen is an HTML overlay, including the two
  building captions. In a plan there is no roofline to sit on, so
  `JOURNEY.labels` anchors each caption on the **centre of its footprint**. Move
  a footprint in `app.js` and move the caption with it.
- **One scale.** A plan has no perspective, so nothing on the page grows as the
  reader scrolls. `JOURNEY.route.width` is a single constant and there is no
  depth law left to keep in step with anything.

## The consignment

An articulated goods vehicle seen from above. Three things make it read as heavy
goods rather than as a large car, and all three are cheap in plan: the
**length-to-width ratio** (6.4 : 1), the **articulation gap** between tractor
and semi-trailer, and the **axle count** — one steer, two drive, three on the
trailer bogie. The mirrors reaching out past the nose are the fourth; from above
nothing else has them.

It is authored nose-up, because that is the easier frame to write coordinates
in, and turned to face down the page — the direction it travels. It does not
bob. Its states are overlays: **travelling** (plain) · **scanned** (the page adds
the brand-blue outline) · **sealed** (the page adds the seal at the rear doors).

## The arrivals hall — 1000 x 440

Section 7, drawn by `PassengerSchema()` in `app.js` from `PAX`, `AC`, `GATE` and
`BELT` — the same top-down plan as the corridor, at 7 units to the metre. Left to
right: the apron with its painted lead-in line, stop bar and stand envelope; the
aircraft; the jet bridge, as a rotunda at the building face, a constant-width
tunnel and a cab square against the fuselage at the forward port door; the
terminal footprint with its 8 m column grid; passport control as an e-gate bank;
two baggage-reclaim racetracks; customs control; and the two channels as bands
painted on the floor to two openings in a wall.

**The aircraft** is an A320-family narrowbody, 37.6 m by 35.8 m. Three things
make it read as an airliner, and all three are as cheap in plan as the
consignment's three are: the **span is about the length**, the **wing sweep**,
and **two nacelles** slung under the wings. From above a fin is a sliver on the
centreline and nothing more, and there are no windows to draw, because they are
on the side.

Rules, as for the corridor:

- **One camera.** Nothing here is seen from anywhere but directly above. No
  roof, no wall face, no doorway, no cast shadow.
- **The routes are load-bearing.** `PAX_COMMON` / `PAX_GREEN` / `PAX_RED` are
  the dots' `offset-path`, so they are authored first and everything else is
  drawn around them. One route is painted as far as customs control and two
  after it: two translucent channel colours laid over each other for the whole
  walk are an olive nobody chose, and there is one queue until the scanner.
- **A passenger is a metre across.** `DOT_R` comes off `PAX.upm` like everything
  else. Each dot carries its own static `offset-distance`, so under
  `prefers-reduced-motion` they stand spread along the route rather than piled
  at the door — `tools/verify.mjs` asserts it.
- **Captions are chips on leaders**, drawn in the SVG in the same white-on-
  hairline the corridor's building captions use, and sized from the character
  count because IBM Plex Mono has a fixed advance.

## Secondary scene — 1600 x 900

`assets/plates/warehouse-floor.svg` — the customs warehouse as a **floor plan**:
the dock line, the racking runs and their bays, the aisles, the marked
inspection bay and the staging area. Shown in the "Customs and cargo operations"
marker's panel.

It was a dark three-quarter interior with floating cardboard boxes and blurred
shadows. It is the one asset loaded through `<img src>`, so it cannot see the
page's custom properties and carries a copy of the palette in its own `<style>`
block — change it together with the `:root` tokens.

## Type & colour

- Current faces (self-hosted, OFL): **Space Grotesk** (display/body), **IBM
  Plex Mono** (numerals, tokens, chips). To swap in a licensed brand face: drop
  the woff2 into `assets/fonts/`, update the `@font-face` block and the two
  `--font-*` tokens at the top of `styles.css`.
- The palette **is the official deck's**, sampled from the slides rather than
  chosen, and centralised in the `:root` tokens of `styles.css`. It is a
  **light** palette, and the corridor is light with it: a plan is a drawing on
  paper, not a scene with a sky in it.

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
- The corridor's own colours are the `--plan-*` tokens in the same block. There
  is no second copy of them anywhere: the Python file that used to hold one is
  gone.

---

# Figure replacement checklist

**Most figures on screen are still illustrative**, and the table below is the
list of what has to be replaced before the visit. The page no longer says so on
screen: the badge and the on-slide disclosure were presentation furniture, and
the presenter says it out loud instead.

Replace each value in `demo-data.js`. Nothing else needs editing. Figures
written as `{{TOKEN}}` render as dashed *awaiting figure* chips; `ETRANSIT_SHARE`
is deliberately left as one.

Three more tokens live in `sections/scene-data.js`, the labels file the three
interactive scenes are annotated from. That file holds **no figures** — every
number the scenes print is read live out of `demo-data.js` — but it uses the
same awaiting-figure device for two things the deck asserts without settling:
the agencies on the E-Transit platform, and the size of the time and cost
saving at the warehouse. An unfilled chip is the honest state of a claim the
deck has not sourced; a plausible invention is not.

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
| 3 | awaiting | agencies 3 and 4 on the E-Transit platform | `{{ETRANSIT_AGENCY_3}}` / `{{ETRANSIT_AGENCY_4}}` — the deck names Customs and the Ministry of Internal Affairs and no others |
| 4 | growth | customs warehouses | `264` → `430` (×1.6) |
| 4 | growth | shipments placed | `96 k` → `412 k` (×4.3) |
| 4 | growth | total value of goods | `UZS 18.4 tn` → `UZS 71.9 tn` (×3.9) |
| 4 | growth | total weight of goods | `1.9 m t` → `6.4 m t` (×3.4) |
| 4 | share | officer attended / remote only, 2025 | `28%` / `72%` |
| 4 | awaiting | time saved placing a consignment | `{{CCO_TIME_SAVING}}` — the deck claims less time, with no figure behind it |
| 4 | awaiting | operating cost saved for business | `{{CCO_COST_SAVING}}` — the deck claims lower cost, with no figure behind it |
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
