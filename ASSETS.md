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

## Audit outcome and acceptance rule

This register is the production authority for every statistic in `demo-data.js`.
The supplied presentation substantiates only the *Statistics at the border*
figures below; the presenter separately approved the current count of warehouses
on the shared platform. No dated Uzbekistan Customs publication was supplied for
the other figures, so they have been replaced with `{{TOKEN}}` rather than being
carried forward as estimates. “Undated” is deliberately recorded as such and
must not be inferred to mean 2025.

A figure can move from **awaiting** to **approved** only when its row has a named
Customs publication or dataset, a publication/reporting date, period, unit and
scope. Update the value and its adjacent `source` object together. The compact
on-screen source line is generated from that object. Anchors remain mandatory
whether the headline value is approved or awaiting confirmation.

### Approved figures

| § | Value / token | Approved figure and period | Reporting date | Unit | Scope | Source |
|---|---|---|---|---|---|---|
| 3 | Border network | **61 (2025)** | Undated supplied slide | customs posts | National border network | Uzbekistan Customs, *Statistics at the border* (supplied presentation) |
| 3 | Avto transactions | **4.5 mln (2025)** | Undated supplied slide | annual transactions | Road/“Avto” mode, national | Same slide |
| 3 | Cargo transactions | **5.2 mln (2025)** | Undated supplied slide | annual transactions | Cargo mode, national | Same slide |
| 3 | Railway transactions | **1.2 mln (2025)** | Undated supplied slide | annual transactions | Railway mode, national | Same slide |
| 3 | Vehicles crossing | **30 k/day (2025)** | Undated supplied slide | vehicles per day | All national border crossings | Same slide; anchor **×2.9 on 2018** is also printed on the slide |
| 3 | Transactions | **87 k/day (2025)** | Undated supplied slide | transactions per day | All modes, national | Same slide; anchor **×3.2 on 2018** is also printed on the slide |
| 3 | Officers on daily duty | **3,184 (2025)** | Undated supplied slide | officers per day | Customs officers on daily duty, national | Same slide; anchor **+10% since 2018** is also printed on the slide |
| 4 | Warehouses on platform | **around 430 (current at presentation)** | Undated presenter submission | warehouses | Customs warehouses connected to the single digital platform | Uzbekistan Customs presenter, supplied for WCO visit |

The deck also approves the non-statistical descriptions of the Targeting Centre
and E-Transit AAT. It does **not** approve an E-Transit adoption share or identify
platform agencies beyond Customs and the Ministry of Internal Affairs.

### Awaiting authoritative Customs confirmation

Every former illustrative value is named below. The former value is retained
only as an audit trail and is not rendered. “Required source” means a dated
Uzbekistan Customs statistical bulletin, administrative-data extract, TRS
report, or other publication whose owner can approve the stated scope.

| § | Token | Former illustration | Required reporting period | Unit | Scope / required comparison | Required source |
|---|---|---|---|---|---|---|
| 3 | `{{BASELINE_INSPECTION_SHARE}}` | 100% | 2018 | percent of consignments | Road consignments physically inspected; retain “every truck” only if source supports it | Customs control/inspection dataset |
| 3 | `{{BASELINE_VIOLATION_RATE}}` | ~3% | 2018 | percent of inspections | Physical inspections finding a violation | Customs enforcement dataset |
| 3 | `{{BASELINE_BORDER_WAIT}}` | 3–5 days | 2018 | elapsed time | Define mean/median and start/end events at road border posts | Dated Customs TRS or operational-time report |
| 3 | `{{VEHICLE_FLOW_SERIES}}` | 100 118 96 131 168 196 224 247 | 2018–2025 | index, 2018=100 | Vehicles crossing, national; annual observations | Customs border-flow dataset |
| 3 | `{{CARGO_FLOW_SERIES}}` | 100 112 91 124 151 173 192 208 | 2018–2025 | index, 2018=100 | Cargo carried, national; define cargo measure | Customs border-flow dataset |
| 3 | `{{VEHICLE_FLOW_MULTIPLE}}` | ×2.5 | 2018–2025 | multiple | Derived from approved vehicle series | Same source as series |
| 3 | `{{CARGO_FLOW_MULTIPLE}}` | ×2.1 | 2018–2025 | multiple | Derived from approved cargo series | Same source as series |
| 3 | `{{PRE_ARRIVAL_RISK}}` | MEDIUM | demonstration consignment | category | State of the illustrative consignment, not a production statistic | Presenter-approved scenario record |
| 3 | `{{DATA_SOURCES_CONSULTED}}` | 12 | demonstration consignment | source systems | State of the illustrative consignment | Presenter-approved scenario record |
| 3 | `{{ROAD_GREEN_SHARE}}` | 71% | 2025 | percent | Road consignments assigned green channel | Customs RMS extract |
| 3 | `{{ROAD_YELLOW_SHARE}}` | 24% | 2025 | percent | Road consignments assigned yellow channel | Customs RMS extract |
| 3 | `{{ROAD_RED_SHARE}}` | 5% | 2025 | percent | Road consignments assigned red channel | Customs RMS extract |
| 3 | `{{GATE_DECISION_TIME}}` | 2.1 min | 2025 | elapsed minutes | Define clock events and average type at road gates; compare with 2018 | Customs processing-time dataset |
| 3 | `{{BORDER_SEIZURE_CASES}}` | 1,860 | 2025 | cases | Seizure cases at border; retain +18% only with 2024 comparator | Customs enforcement dataset |
| 3 | `{{GPS_SEAL_STATUS}}` | FITTED | demonstration consignment | status | Illustrative consignment | Presenter-approved scenario record |
| 3 | `{{TRANSIT_CHECKPOINTS}}` | 7 | demonstration consignment | checkpoints | Illustrative supervised-transit route | Presenter-approved scenario record |
| 3 | `{{TRANSIT_ALERTS}}` | 0 | demonstration consignment | alerts | Illustrative supervised-transit route | Presenter-approved scenario record |
| 3 | `{{TRANSIT_SEIZURES}}` | 1,248 | 2025 | seizures/cases (confirm) | Supervised inland transit; retain ×2 since 2022 only with comparator | Customs transit-enforcement dataset |
| 3 | `{{ETRANSIT_SHARE}}` | none | current at reporting date | percent of movements | Transit movements cleared on E-Transit | E-Transit administrative extract |
| 3 | `{{ETRANSIT_AGENCY_3}}`, `{{ETRANSIT_AGENCY_4}}` | none | current | agency names | Agencies connected to E-Transit beyond the two named in the deck | E-Transit system owner |
| 4 | `{{WAREHOUSES_2018}}`, `{{WAREHOUSE_GROWTH}}` | 264; ×1.6 | 2018 vs current | warehouses; multiple | Warehouses on platform; current endpoint is approved as around 430 | Warehouse-platform administrative extract |
| 4 | `{{SHIPMENTS_2018}}`, `{{SHIPMENTS_2025}}`, `{{SHIPMENTS_GROWTH}}` | 96 k; 412 k; ×4.3 | 2018 and 2025 | shipments placed; multiple | Placements in Customs warehouses | Warehouse-platform dataset |
| 4 | `{{GOODS_VALUE_2018}}`, `{{GOODS_VALUE_2025}}`, `{{GOODS_VALUE_GROWTH}}` | UZS 18.4 tn; UZS 71.9 tn; ×3.9 | 2018 and 2025 | nominal UZS; multiple | Declared value of goods placed in warehouses; define valuation basis | Warehouse-platform dataset |
| 4 | `{{GOODS_WEIGHT_2018}}`, `{{GOODS_WEIGHT_2025}}`, `{{GOODS_WEIGHT_GROWTH}}` | 1.9m t; 6.4m t; ×3.4 | 2018 and 2025 | metric tonnes; multiple | Goods placed in warehouses | Warehouse-platform dataset |
| 4 | `{{OFFICER_ATTENDED_SHARE}}`, `{{REMOTE_CONTROL_SHARE}}` | 28%; 72% | 2025 | percent of placements | In-person officer attendance vs remote-only control; must sum to 100 | Warehouse-platform/control dataset |
| 5 | `{{RMS_CATEGORIES}}`, `{{TRADER_RISK_CRITERIA}}` | 4; 312 | current at reporting date | categories; criteria | Entity categorisation in production RMS | RMS configuration register |
| 5 | `{{RISK_PROFILES}}`, `{{UNDERVALUATION_PROFILES}}`, `{{MISCLASSIFICATION_PROFILES}}`, `{{AI_PROFILES}}` | 1,146; 186; 143; 27 | current at reporting date | active profiles | Production RMS; define overlap and active/inactive scope | RMS configuration register |
| 5 | `{{RANDOM_SELECTION_SHARE}}` | 3% | current at reporting date | percent of declarations | Random-selection control group | RMS configuration/selection log |
| 5 | `{{CUSTOMS_DECLARATIONS}}` | 1.42m | 2025 | declarations | National; retain ×2.6 only with 2018 base | Customs declaration dataset |
| 5 | `{{FOREIGN_TRADE_TURNOVER}}` | USD 62.4bn | 2025 | current USD | National foreign-trade turnover; retain ×2.2 only with comparable 2018 basis | Customs foreign-trade statistics |
| 5 | `{{CONSIGNMENTS_DECLARED}}` | 3.86m | 2025 | consignments | National; define consignment distinct from declaration | Customs declaration dataset |
| 5 | `{{REGISTERED_TRADERS}}` | 38,700 | 2025 | registered traders | Active/total register scope; retain ×1.9 only with 2018 base | Trader register extract |
| 5 | `{{DECLARATION_CHANNELS_2018}}` | 0/0/100 | 2018 | percent by green/yellow/red | All declarations; parts must sum to 100 | RMS/declaration dataset |
| 5 | `{{DECLARATION_CHANNELS_2025}}` | 68/26/6 | 2025 | percent by green/yellow/red | All declarations; parts must sum to 100 | RMS/declaration dataset |
| 5 | `{{AVERAGE_CLEARANCE_TIME}}` | 1.6 hrs | 2025 | elapsed hours | Define declaration/clearance events and mean/median; compare like-for-like with 2018 | Dated TRS or Customs processing-time report |
| 5 | `{{RISK_CONFIRMATION_RATE}}` | 18.6% vs 7.3% | 2025 | percent of selections | Profile-selected declarations vs random control group | RMS selection and inspection outcomes |
| 5 | `{{CUSTOMS_VIOLATIONS}}` | 24,180; +14% | 2025 vs 2024 | violations/cases (confirm) | Customs violations detected, national | Customs enforcement dataset |
| 6 | `{{AUDITS_CONDUCTED}}` | 3,140; +9% | latest full year and prior year | audits | Customs post-clearance audits, national | Customs audit dataset |
| 6 | `{{AUDITS_WITH_FINDINGS}}` | 1,982; +14% | latest full year and prior year | audits | Audits with findings, same population | Customs audit dataset |
| 6 | `{{AUDIT_FINDING_RATE}}` | 63% vs 21% | latest full year | percent of audits | Risk-selected vs randomly selected audits; define “finding” | Customs audit selection/outcomes dataset |
| 6 | `{{RISK_PROFILES_UPDATED}}` | 243 | latest named month | profiles | Profiles updated because of audit findings | RMS change log linked to audit findings |
| 6 | `{{ADDITIONAL_REVENUE}}` | UZS 214bn | latest full year | UZS assessed (not necessarily collected) | Additional revenue assessed through audits, national | Customs audit/revenue assessment dataset |
| 7 | `{{PASSENGER_GREEN_SHARE}}`, `{{PASSENGER_RED_SHARE}}` | 96.4%; 3.6% | 2025 | percent of arriving passengers | Passenger green/red customs channels; must sum to 100 | Passenger-control dataset |
| 7 | `{{PASSENGER_FLOW_SERIES}}`, `{{PASSENGER_FLOW_MULTIPLE}}` | 100 121 34 62 128 174 219 264; ×2.6 | 2018–2025 | index, 2018=100; multiple | Arriving passengers, national; annual observations | Passenger-arrival dataset |
| 7 | `{{PASSENGER_RISK_CRITERIA}}` | 148 from 26 | 2025 vs 2018 | active criteria | Passenger targeting criteria in production | Passenger RMS configuration register |
| 7 | `{{API_AIRLINES}}` | 34 from 6 | 2025 vs 2018 | airlines | Airlines actively providing API data | API system administrative extract |
| 7 | `{{PASSENGER_TARGET_HIT_RATE}}` | 11.4% vs 0.8% | 2025 | percent of checks | Targeted selections vs random passenger checks | Passenger selection/outcomes dataset |

The comparison placeholders embedded in KPI anchors are sourced from the same
row as their headline KPI: `{{BASELINE_INSPECTION_ANCHOR}}`,
`{{BASELINE_VIOLATION_ANCHOR}}`, `{{BORDER_SEIZURE_TREND}}`,
`{{GATE_DECISION_BASELINE}}`, `{{TRANSIT_SEIZURE_TREND}}`,
`{{OFFICER_ATTENDANCE_2018}}`,
`{{DECLARATION_GROWTH}}`, `{{TRADE_TURNOVER_GROWTH}}`,
`{{CONSIGNMENT_GROWTH}}`, `{{TRADER_GROWTH}}`,
`{{CLEARANCE_TIME_2018}}`, `{{RANDOM_CONFIRMATION_RATE}}`,
`{{VIOLATION_TREND}}`, `{{AUDITS_TREND}}`,
`{{AUDIT_FINDINGS_TREND}}`, `{{RANDOM_AUDIT_FINDING_RATE}}`,
`{{PASSENGER_CRITERIA_2018}}`, `{{API_AIRLINES_2018}}` and
`{{RANDOM_PASSENGER_HIT_RATE}}`. Each must use the same reporting date, unit,
scope and source population as its paired KPI; this prevents an apparently
valid anchor from comparing unlike populations.

## Time Release Study decision

`meta.trsMethodology` remains **false**. Neither the supplied presentation nor a
dated Customs TRS report establishes that the clearance-time measure uses the
WCO TRS event definitions and collection method. If Customs supplies that
evidence, enable the flag and retain this validated wording:

> Clearance time measured using the WCO Time Release Study methodology.

Do not describe the figure as TRS-derived merely because it is a clearance-time
figure. The source must identify the survey/reporting period, traffic scope,
start and end events, and whether the statistic is a mean or median.

**Name still requiring confirmation:** the page writes the WCO enforcement
platform as **CENcomm**. This is not a statistic, but should be checked against
the source slide before presentation.

**Do not** put risk rules, thresholds or scores anywhere. Channel outcomes stay
the words green / yellow / red.
