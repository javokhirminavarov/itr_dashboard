/*
 * Rasterises the generated corridor SVGs into the JPEGs the page actually
 * ships.
 *
 * Why: each corridor section is thousands of vector paths. Painting one at
 * viewport width costs 200-300 ms, which the reader feels as a hitch the first
 * time each section scrolls in. As a JPEG the same section decodes once and
 * scrolls free. The SVG stays the editable source; the JPEG is the artifact.
 *
 * Usage (Playwright + Chromium required; nothing is added to this repo):
 *   python3 tools/build_plates.py          # writes tools/build/vertical/*.svg
 *   node tools/rasterise.mjs               # writes assets/plates/vertical/*.jpg
 *
 * PW_CHROME=/path/to/chrome overrides the browser Playwright would pick.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'build', 'vertical');
const OUT = path.join(HERE, '..', 'assets', 'plates', 'vertical');
// 1.875x the 1600-unit design width. The page fits the corridor like
// object-fit: cover, so at 1920x1080 the art paints about 2420 px wide and at
// 2560x1440 about 3230: rendered at 2000 it would be upscaled on every
// projector worth presenting on. Six plates at this width still cost well
// under a megabyte in total.
const WIDTH = 3000;
const QUALITY = 82;

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.svg')).sort();
if (!files.length) throw new Error('no SVGs in ' + SRC + ' — run build_plates.py first');
fs.mkdirSync(OUT, { recursive: true });

const launch = {};
if (process.env.PW_CHROME) launch.executablePath = process.env.PW_CHROME;
const browser = await chromium.launch(launch);
let total = 0;
for (const f of files) {
  const svg = fs.readFileSync(path.join(SRC, f), 'utf8');
  const m = /viewBox="0 [\d.]+ (\d+) (\d+)"/.exec(svg);
  const [w, h] = m ? [+m[1], +m[2]] : [1600, 800];
  const height = Math.round(WIDTH * h / w);
  const page = await browser.newPage({ viewport: { width: WIDTH, height }, deviceScaleFactor: 1 });
  const tmp = path.join(SRC, '.raster.html');
  fs.writeFileSync(tmp, `<!doctype html><style>html,body{margin:0;overflow:hidden}
img{display:block;width:${WIDTH}px;height:${height}px}</style><img src="${f}">`);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.waitForFunction(() => document.images[0]?.complete && document.images[0].naturalWidth > 0);
  const out = path.join(OUT, f.replace(/\.svg$/, '.jpg'));
  await page.screenshot({ path: out, type: 'jpeg', quality: QUALITY });
  await page.close();
  fs.unlinkSync(tmp);
  const kb = fs.statSync(out).size / 1024;
  total += kb;
  console.log(`${f} -> ${path.basename(out)}  ${WIDTH}x${height}  ${kb.toFixed(0)} kB`);
}
console.log(`total ${(total / 1024).toFixed(2)} MB`);
await browser.close();
