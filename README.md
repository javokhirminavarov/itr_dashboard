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
| 2 | Targeting centre — functions and structure | screen |
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
a road. Sections 3–6 are a **corridor** — one continuous daylight road running
top to bottom, six rows deep, with the border checkpoint, the transit gantry,
the customs warehouse, the declaration office and the importer's premises each
sitting on their own row. The consignment drives that road as you scroll, and
whatever landmark sits beside it is the beat you are reading: the six rows and
the six section plates are the same grid, defined once in `plates.js`, so they
cannot drift apart.

The first corridor beat is the 2018 "before" frame, and it shows it: a queue of
halted trucks standing between the consignment and the gate, two of them pulled
onto the verge to be opened by hand, and the corridor's teal instrumentation
switched off. Scroll on and the queue dissolves as the chevrons and the tracking
trail come up — the before/after the whole talk rests on, made once, visually.

Two markers on the corridor open **information-system panels** mid-talk:
E-Transit and the targeting centre's role at the border (beside the gate), and
the Customs and cargo operations system (at the warehouse). They are the pulsing
teal pins; click, or tab to them and press Enter.

## Presenting

- Open `index.html` in Chrome/Edge and press **F11** for fullscreen (works from
  a USB stick — no server needed).
- Scroll to move. Scrolling is free and continuous; nothing snaps. Every beat is
  scrolled so its own centre lands on the truck's focus line, and every beat
  fits the viewport it is shown in from 1280 px wide upward.
- Keys, for driving from a lectern: `↓` `PageDown` `Space` next beat · `↑`
  `PageUp` previous · `1`–`7` jump to a section · `Home`/`End` first/last ·
  `Esc` running order · `R` replay the current beat's reveal. Presenter clickers
  (PageUp/PageDown) work.
- The page always opens on section 1, whatever the window shape.
- **Targeting centre** at the bottom left jumps to section 2. **Running order**
  at the top right opens the seven-section grid.
- Below 1200 px the corridor art becomes a backdrop and the two rails stack into
  one column, so the page still reads on a tablet or a phone. Below 620 px the
  section nav gives way to the running-order button.

## Editing before the visit

- **Figures**: every number lives in `demo-data.js`. They are currently
  **illustrative placeholders**, and the page says so — in the header badge and
  in the opening disclosure. `ASSETS.md` lists all 48 to replace, flags the
  three least plausible, and notes the one name to confirm. Figures written as
  `{{TOKEN}}` render as dashed *awaiting figure* chips; `TRANSIT_LEGAL_BASIS`
  and the presenter's own "we will add later" in the E-Transit panel are
  deliberately left as ones.
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
- **Art**: `ASSETS.md` is the drop-in contract; `plates.js` holds every
  coordinate.

## Regenerating the art

The page needs no build step — the corridor ships as six JPEGs. To change the
art itself:

```
python3 tools/build_plates.py     # corridor -> tools/build/vertical/*.svg
node tools/rasterise.mjs          # -> assets/plates/vertical/*.jpg
python3 tools/build_scenes.py     # the three secondary scenes -> assets/plates/
```

`build_plates.py` prints the route path to paste back into `plates.js`, and
checks every plate it writes twice: that it is well-formed XML, and that every
`url(#id)` in it resolves. Both failures are otherwise silent — a dangling
reference just stops painting, and a malformed attribute surfaces only as an
image-load timeout thirty seconds into the rasteriser.

`rasterise.mjs` needs Playwright and Chromium; nothing is added to this repo.
The SVG is the editable source and the JPEG is the artifact: painting the
corridor as live vector costs 200–300 ms the first time each section scrolls in,
which the reader feels as a hitch.

## Verifying

```
npx --no-install http-server -p 8099 -s .
node tools/verify.mjs
```

39 assertions. Zero network requests after load, on `file://` and `http://`; the
six corridor rows each exactly one sixth of the corridor; **every beat fitting
the viewport it is presented in, and every row's content fitting its row**, at
1920, 1600, 1440 and 1280; the consignment moving down the route monotonically
and picking up its scanned and sealed states in order; no metric without an
anchor and no chart without a caption; the full keyboard map; every marker
opening its panel, `Esc` closing it and focus returning to the marker; no
horizontal overflow at six widths; the smallest type on the page clearing 4.5:1
against the panel; and reduced-motion behaviour, including that the passenger
dots stay spread along their route rather than piling at the door when their
animation is off.

It also covers the 2018 frame: that the queue builds, that the first corridor
beat shows it with the corridor instrumentation off and the transit beat has it
the other way round, and — measured from the transforms rather than
`getBoundingClientRect`, which is not dependable on `<use>` — that no queued
vehicle ever stands on the consignment.

Two sizing rules are load-bearing and the suite guards both: a corridor row's
height is a pure function of viewport width, so the content laid over it is
sized in `em` against a single `clamp(10px, 0.781vw, 15px)` on `.row` — the
factor that keeps content height and row height in step. Screens do the same
thing with their own clamp.

## Deployment note

GitHub Pages deploys the repo root on push to `main`
(`.github/workflows/main.yml`); this branch is served only after merge.
The page is identical served or opened directly.
