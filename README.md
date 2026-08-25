# Risk management, end to end — Uzbekistan Customs

Interactive presentation page for the WCO Secretary General visit: how
Uzbekistan Customs targets and controls risk, from international cooperation
through to passenger control. **Seven sections, nine beats.** Fully
self-contained — **no network access after load** (enforced by CSP
`connect-src 'none'`), so it runs from a local file or any static host.

## The running order

| § | Section | How it is shown |
|---|---|---|
| 1 | International cooperation — WCO & Uzbekistan | screen |
| 2 | Targeting centre — eight functions, six monitored channels | screen |
| 3 | The 2018 baseline, then vehicle entry at the border | two corridor beats, plus the inland-transit passage between 3 and 4 |
| 4 | Customs warehouse information system | corridor beat |
| 5 | Customs declaration clearance | corridor beat |
| 6 | Customs audit | corridor beat |
| 7 | Passenger control | screen |

A **section** is an item on the running order. A **beat** is one screenful of
argument. They are not the same count, and forcing them to be would cost the
page either the 2018 before-frame (section 3 needs the baseline *and* the
arrival at the gate) or the inland-transit passage, which belongs to no section
— it is the move from one to the next, and is badged `3→4` rather than
numbered. `window.BEATS` in `plates.js` is the list.

## The shape of the page

Sections 1, 2 and 7 are **screens**: full-viewport panels that are not places on
a road. Sections 3–6 are a **corridor** — one road running top to bottom, six
rows deep, with the border checkpoint, the transit gantry, the customs
warehouse, the declaration office and the importer's premises each sitting on
their own row. The consignment drives that road as you scroll, and whatever
landmark sits beside it is the beat you are reading: the six rows and the six
sections of art are the same grid, defined once in `plates.js`, so they cannot
drift apart. The consignment is delivered at the importer's premises on the last
row and fades out below it.

The corridor is drawn as an **operations plan** — one flat orthographic view
from directly above, in the same white, blue and grey the cards are set in.
Facilities are plan footprints, not buildings in three-quarter view; the
consignment is an articulated goods vehicle seen from above, true to the road it
drives on at about 14 page units to the metre. A plan has no horizon, so it has
no perspective: the road is one width from the head of the page to the foot of
it and nothing grows as the reader scrolls. See `ASSETS.md` for what each row
carries and what is held to scale.

The first corridor beat is the 2018 "before" frame, and it shows it: the road
runs empty to the gate with the corridor's blue instrumentation switched off.
Scroll on and the chevrons and the tracking trail come up — the before/after the
whole talk rests on, made once, visually. The carriageway carries nothing but
the consignment anywhere on the page.

Two markers on the corridor open **information-system panels** mid-talk:
E-Transit and the targeting centre's role at the border (beside the gate), and
the Customs and cargo operations system (at the warehouse). They are the pulsing
blue pins; click, or tab to them and press Enter.

## Presenting

- Open `index.html` in Chrome/Edge and press **F11** for fullscreen (works from
  a USB stick — no server needed).
- Scroll to move. Scrolling is free and continuous; nothing snaps. Every beat is
  scrolled so its own centre lands on the truck's focus line, and every beat
  **covers** the viewport it is shown in from 1280 px wide upward — one section
  on screen at a time, with no sliver of its neighbours.
- Keys, for driving from a lectern: `↓` `PageDown` `Space` next beat · `↑`
  `PageUp` previous · `1`–`7` jump to a section · `Home`/`End` first/last ·
  `Esc` running order · `R` replay the current beat's reveal. Presenter clickers
  (PageUp/PageDown) work.
- The page always opens on section 1, whatever the window shape. It carries no
  bars: the page itself is the presentation surface, and the running order, the
  sections and the beats are all on the keyboard. `Esc` opens the running order.
- Below 1200 px the corridor art becomes a backdrop and the two rails stack into
  one column, so the page still reads on a tablet or a phone.

## Editing before the visit

- **Figures**: every number lives in `demo-data.js`. Most are still
  **illustrative placeholders**. The exception is the border row: `61` customs
  posts, the `4.5` / `5.2` / `1.2` mln transactions by mode, `30 k` vehicles and
  `87 k` transactions a day, and `3,184` officers on daily duty all come off the
  official *Statistics at the border* slide and are not to be re-invented. `ASSETS.md` lists all 47 to replace, flags the
  three least plausible, and notes the one name to confirm. Figures written as
  `{{TOKEN}}` render as dashed *awaiting figure* chips; the presenter's own
  "we will add later" in the E-Transit panel is deliberately left as one.
- **Copy**: headlines and support lines are also in `demo-data.js` (discipline:
  ≤6-word headline, ≤25-word support).
- **Contracts that hold the page honest**, enforced in code rather than trusted:
  a metric without an anchor (a 2018 baseline, a trend, or a random-selection
  comparison) refuses to render and says so on screen; so does a chart without a
  caption and a year range. Channel outcomes are only ever the words green /
  yellow / red. No figure appears anywhere that is not defined in
  `demo-data.js`. The state of the illustrative consignment is labelled as such,
  separately from the statistics. Every chart also ships the same numbers as a
  visually-hidden table.
- **Art**: `ASSETS.md` is the drawing contract; `plates.js` holds every
  coordinate, and `styles.css` holds every colour.

## Changing the art

There is **no build step**. The corridor is drawn by `app.js` as six sections of
SVG, one per row, and takes every fill and stroke from the `--plan-*` tokens in
`styles.css` — so the art and the cards cannot drift apart in palette, it stays
crisp at any projector resolution, and there is no second copy of the palette to
keep in step.

- To move the road, edit `JOURNEY.route.d` in `plates.js`. The carriageway is
  generated from that path, so the art, the glow trail, the chevrons, the
  cameras and the consignment all follow it together.
- To change the road's width, edit `JOURNEY.route.width.half`. Everything on the
  corridor is measured in multiples of it.
- To change what a row shows, edit its function in the corridor-art section of
  `app.js` — `row1` … `row6` draw beside the carriageway, `over2` / `over3` /
  `over5` draw on it. If you move a footprint, move its caption in
  `JOURNEY.labels` to the new centre.

The corridor used to be six JPEGs generated by `tools/build_plates.py` and
rasterised with `tools/rasterise.mjs`, and the warehouse scene by
`tools/build_scenes.py`. All three are gone: a schematic rasterised to JPEG
carries compression artefacts on every edge, and the vector cost that justified
the pipeline was a cost of thousands of paths of noise and grain, which a plan
does not have.

Two sizing rules are load-bearing and the suite guards both. First, the corridor
is fitted to the viewport like `object-fit: cover`: it is scaled until one row
covers the viewport — 2 x max(focus, 1 - focus) of it, because a beat is centred
on the focus line and not on the middle of the screen — and allowed to overflow
sideways into the calm bands the art keeps clear. That scale is capped rather
than let the crop take the markers and the building captions off screen; where
the cap binds, the page says so with `data-crop="capped"` on the body. Second,
because that scale is never below viewport width / 1600, a row is never shorter
than it used to be, so the content laid over it is still sized in `em` against a
single `clamp(10px, 0.781vw, 15px)` on `.row` — the factor that kept content
height and row height in step. Screens do the same thing with their own clamp.

## Deployment note

GitHub Pages deploys the repo root on push to `main`
(`.github/workflows/main.yml`); this branch is served only after merge.
The page is identical served or opened directly.
