# One Consignment — Border to Audit

Interactive presentation page for the WCO Secretary General visit: how
Uzbekistan Customs targets and controls a consignment from border to
post-clearance audit. Ten stages, three speakers, one screen. Fully
self-contained — **no network access after load** (enforced by CSP
`connect-src 'none'`), so it runs from a local file or any static host.

## Presenting

- Open `index.html` in Chrome/Edge and press **F11** for fullscreen
  (works from a USB stick — no server needed). Target canvas is 1920×1080;
  other sizes letterbox.
- Keys: `→` `↓` `Space` `PageDown` next · `←` `↑` `PageUp` prev ·
  `1`–`9` and `0` jump to a stage · `Home`/`End` first/last ·
  `Esc` stage overview · `R` replay the current stage's animation.
  Presenter clickers (PageUp/PageDown) work. Scroll wheel and touch swipe
  advance one stage per gesture. The cursor hides after 3 s idle.
- Stage 2 only: click **Road / Rail / Air cargo** to swap that panel's data
  and cut to that mode's scene. The deep journey stays road.

## Editing before the visit

- **Figures**: every number lives in `demo-data.js`. Unfilled figures render
  as dashed `{{TOKEN}}` chips — see the fill-in sheet in `ASSETS.md`.
  Replace the token string with the final display string; nothing else moves.
- **Copy**: headlines and support lines are also in `demo-data.js`
  (discipline: ≤6-word headline, ≤20-word support, ≤3 metrics per stage).
- **Art**: the scenes are watermarked pre-viz stand-ins. `ASSETS.md` is the
  render request and the drop-in contract (`plates.js` holds every
  coordinate).

## Verifying

From any directory (Playwright + Chromium required; nothing is added to this
repo):

```
npm i playwright
node verify.mjs   # see the session's verification script for reference
```

The suite drives the full keyboard map from every stage (including
mid-animation interrupts), asserts exactly one stage visible at a time, zero
network requests after load (file:// and http), reduced-motion behaviour, and
that no metric renders without an anchor.

## Deployment note

GitHub Pages deploys the repo root on push to `main`
(`.github/workflows/main.yml`); this branch is served only after merge.
The page is identical served or opened directly.
