# One Consignment — Border to Audit

Interactive presentation page for the WCO Secretary General visit: how
Uzbekistan Customs targets and controls a consignment from border to
post-clearance audit. Ten stages down one continuous corridor. Fully
self-contained — **no network access after load** (enforced by CSP
`connect-src 'none'`), so it runs from a local file or any static host.

## The shape of the page

The page is a **vertical journey**. The corridor runs top to bottom: border
gate, supervised transit, customs warehouse, declaration, release, audit,
passengers, and out into Tashkent. Down the left is the numbered stage
timeline; down the right, that stage's figures. The consignment drives the road
as you scroll, and whatever landmark sits beside it is the stage you are
reading — the ten stages and the ten landmarks in the art are placed from the
same row grid in `plates.js`, so they cannot drift apart.

Stage 1 is the 2018 "before" frame, and it shows it: a queue of halted trucks
standing between the consignment and the gate, two of them pulled onto the
verge to be opened by hand, and the corridor's teal instrumentation switched
off. Scroll on and the queue dissolves as the chevrons and the tracking trail
come up — the before/after the whole talk rests on, made once, visually.

## Presenting

- Open `index.html` in Chrome/Edge and press **F11** for fullscreen (works from
  a USB stick — no server needed).
- Scroll to move. Scrolling is free and continuous; nothing snaps.
- Keys, for driving from a lectern: `↓` `PageDown` `Space` next stage · `↑`
  `PageUp` previous · `1`–`9` and `0` jump to a stage · `Home`/`End` first/last
  · `Esc` stage overview · `R` replay the current stage's reveal. Presenter
  clickers (PageUp/PageDown) work.
- The page always opens at stage 1, whatever the window shape, so the 2018
  frame is what a visitor sees first.
- **Road / Rail / Air cargo** in the header swap the flows-stage figures and
  that stage's scene. **Passengers** jumps to the passenger stage. **Targeting
  centre** at the bottom left opens the control-room view.
- Below 1200 px the art becomes a backdrop and the two rails stack into one
  column, so the page still reads on a tablet or a phone.

## Editing before the visit

- **Figures**: every number lives in `demo-data.js`. They are currently
  **illustrative placeholders**, and the page says so — in the header badge and
  in the opening disclosure. `ASSETS.md` lists every value to replace. Figures
  written as `{{TOKEN}}` render as dashed *awaiting figure* chips;
  `TRANSIT_LEGAL_BASIS` is deliberately left as one.
- **Copy**: headlines and support lines are also in `demo-data.js` (discipline:
  ≤6-word headline, ≤20-word support, ≤3 metrics per stage).
- **Contracts that hold the page honest**: a metric without an anchor (a 2018
  baseline, a trend, or a random-selection comparison) refuses to render;
  channel outcomes are only ever the words green / yellow / red; no figure
  appears anywhere that is not defined in `demo-data.js`; and the state of the
  illustrative consignment is labelled as such, separately from the statistics.
- **Art**: `ASSETS.md` is the drop-in contract; `plates.js` holds every
  coordinate.

## Regenerating the art

The page needs no build step — the corridor ships as six JPEGs. To change the
art itself:

```
python3 tools/build_plates.py     # corridor -> tools/build/vertical/*.svg
node tools/rasterise.mjs          # -> assets/plates/vertical/*.jpg
python3 tools/build_scenes.py     # the five secondary scenes -> assets/plates/
```

`build_plates.py` prints the route path to paste back into `plates.js`.
`rasterise.mjs` needs Playwright and Chromium; nothing is added to this repo.
The SVG is the editable source and the JPEG is the artifact: painting the
corridor as live vector costs 200–300 ms the first time each section scrolls
in, which the reader feels as a hitch.

## Verifying

From any directory (Playwright + Chromium required; nothing is added to this
repo):

```
npm i playwright
node verify.mjs      # see the session's verification script for reference
```

The suite asserts zero network requests after load (on `file://` and
`http://`), that the ten stage rows stay exactly one tenth of the corridor
each, that the consignment moves down the route monotonically and picks up its
scanned and sealed states in order, that no metric renders without an anchor,
the full keyboard map, the flow tabs, reduced-motion behaviour, and that
nothing overflows at 1920, 1600, 1440, 1280, 900 and 420 px wide.

It also covers the 2018 frame: that the queue builds, that stage 1 shows it
with the corridor instrumentation off and stage 3 has it the other way round,
and — measured from the transforms rather than `getBoundingClientRect`, which
is not dependable on `<use>` — that no queued vehicle ever stands on the
consignment, at eight window shapes including tall, narrow ones.

Scroll cost was measured the same way: with the corridor shipping as JPEG and
the route overlay on its own compositor layer, a full scroll of the journey at
1920×1080 holds a ~17 ms median frame with no long tasks.

## Deployment note

GitHub Pages deploys the repo root on push to `main`
(`.github/workflows/main.yml`); this branch is served only after merge.
The page is identical served or opened directly.
