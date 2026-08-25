/*
 * Verification suite for the presentation page.
 *
 * Asserts the things the page promises — no network after load, every metric
 * anchored, every chart captioned, the corridor rows matching the plate grid,
 * the consignment running the route — and the things that have actually broken
 * here before: content overflowing its corridor row at anything narrower than
 * 1920, a lamp standard planted in the middle of the carriageway, a "visually
 * hidden" table widening the document.
 *
 * Usage (Playwright + Chromium required; nothing is added to this repo):
 *   npx --no-install http-server -p 8099 -s .     # or any static server
 *   node tools/verify.mjs [http://127.0.0.1:8099/index.html]
 */
import { chromium } from 'playwright';
// A file: URL's .pathname is "/C:/..." on Windows, which path.resolve() then
// turns into "C:\C:\..."; the URL itself is already what page.goto() wants.
const HTTP = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const FILE = new URL('../index.html', import.meta.url).href;
const results = [];
const ok = (n, c, d = '') => results.push([c ? 'PASS' : 'FAIL', n, d]);

// PW_CHROME overrides the browser Playwright would pick, as in rasterise.mjs.
const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});

async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...opts });
  const p = await ctx.newPage();
  p.__errs = []; p.__net = [];
  p.on('console', m => { if (m.type() === 'error') p.__errs.push(m.text()); });
  p.on('pageerror', e => p.__errs.push('PAGEERROR ' + e.message));
  return p;
}
const settle = async p => { await p.waitForFunction(() => document.querySelectorAll('#rows .row').length > 0); await p.waitForTimeout(350); };

/* ---- 1. no network after load, on both schemes -------------------------- */
for (const [name, url] of [['http', HTTP], ['file', FILE]]) {
  const p = await page();
  await p.goto(url, { waitUntil: 'networkidle' });
  await settle(p);
  p.on('request', r => p.__net.push(r.url()));
  await p.evaluate(() => window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'instant' }));
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.pin.is-live')?.click());
  await p.waitForTimeout(400);
  ok(`no network after load (${name})`, p.__net.length === 0, p.__net.slice(0, 3).join(' '));
  ok(`no console errors (${name})`, p.__errs.length === 0, p.__errs.slice(0, 3).join(' | '));
  await p.context().close();
}

const p = await page();
await p.goto(HTTP, { waitUntil: 'networkidle' });
await settle(p);

/* ---- 2. contracts ------------------------------------------------------- */
const contract = await p.evaluate(() => ({
  errors: document.querySelectorAll('.metric-error').length,
  metrics: document.querySelectorAll('.metric').length,
  anchorless: [...document.querySelectorAll('.metric')].filter(m => !m.querySelector('.metric-anchor')).length,
  charts: document.querySelectorAll('.chart').length,
  captionless: [...document.querySelectorAll('.chart')].filter(c => !c.querySelector('.ch-caption') || !c.querySelector('.ch-range')).length,
  tables: document.querySelectorAll('.chart .sr-only table').length
}));
ok('no contract-violation elements rendered', contract.errors === 0, `${contract.errors} found`);
ok('every metric carries an anchor', contract.anchorless === 0 && contract.metrics > 10, `${contract.metrics} metrics, ${contract.anchorless} anchorless`);
ok('every chart carries caption + range', contract.captionless === 0 && contract.charts >= 4, `${contract.charts} charts`);
ok('every chart ships a data table', contract.tables === contract.charts, `${contract.tables}/${contract.charts}`);

/* ---- 3. corridor geometry: six equal rows, fitted like object-fit: cover -- */
/* The corridor is no longer painted at viewport width: it is scaled until one
   row covers the viewport and allowed to overflow sideways, into the calm bands
   that carry no landmark. So the aspect ratio to check is the STAGE's — the
   1600x4800 box — and the corridor must never be narrower than the viewport. */
const geom = await p.evaluate(() => {
  const j = document.getElementById('journey').getBoundingClientRect();
  const st = document.getElementById('stage').getBoundingClientRect();
  const rows = [...document.querySelectorAll('#rows .row')].map(r => r.getBoundingClientRect().height);
  return { rows, journeyH: j.height, stageW: st.width, vw: innerWidth, vh: innerHeight };
});
const share = geom.journeyH / geom.rows.length;
ok('corridor is six rows', geom.rows.length === 6, String(geom.rows.length));
ok('each row is exactly one sixth of the corridor',
   geom.rows.every(h => Math.abs(h - share) < 1), geom.rows.map(h => h.toFixed(1)).join(', '));
ok('the corridor holds the plate aspect ratio',
   Math.abs(geom.journeyH / geom.stageW - 4800 / 1600) < 0.02,
   (geom.journeyH / geom.stageW).toFixed(3));
ok('and is never narrower than the viewport', geom.stageW >= geom.vw - 1,
   `${geom.stageW.toFixed(0)} vs ${geom.vw}`);

/* ---- 4. row content fits inside its row, at several widths --------------- */
for (const w of [1920, 1600, 1440, 1280]) {
  await p.setViewportSize({ width: w, height: 1080 });
  await p.waitForTimeout(300);
  const over = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#rows .row').forEach(r => {
      const rh = r.getBoundingClientRect().height;
      ['.step-stack', '.right-stack'].forEach(sel => {
        const s = r.querySelector(sel);
        if (s && s.getBoundingClientRect().height > rh - 8) {
          out.push(r.dataset.beat + ' ' + sel + ' ' + Math.round(s.getBoundingClientRect().height) + '>' + Math.round(rh));
        }
      });
    });
    return out;
  });
  ok(`row content fits its row at ${w}px`, over.length === 0, over.join('; '));
}

/* ---- 4b. a beat is a screenful of its own -------------------------------- */
/* The deck used to ask that a beat FIT the viewport, and that let a beat shorter
   than the viewport show its neighbours above and below it. It now asks the
   opposite: a beat covers the viewport it is presented in — and, because a beat
   is centred on the focus line rather than on the middle of the screen, it has
   to cover it from there, which takes 2 * max(focus, 1 - focus). What still has
   to FIT is the content inside the beat: it is read whole, without scrolling. */
for (const [w, h] of [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [1280, 1024]]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(300);
  const beats = await p.evaluate(() => {
    const fill = 2 * Math.max(window.JOURNEY.truck.focus, 1 - window.JOURNEY.truck.focus);
    return [...document.querySelectorAll('[data-beat][id]')].map(e => {
      const kids = [...e.children].map(c => c.getBoundingClientRect());
      const content = kids.length ? Math.max(...kids.map(r => r.bottom)) - Math.min(...kids.map(r => r.top)) : 0;
      return { beat: e.dataset.beat, h: Math.round(e.getBoundingClientRect().height),
               content: Math.round(content), need: Math.round(fill * innerHeight),
               capped: document.body.dataset.crop === 'capped' };
    });
  });
  // The one exception: on a window tall enough that covering it would crop the
  // markers off the art, the page caps the scale and says so on the body.
  const short = beats.filter(b => b.h < b.need - 1 && !b.capped);
  const spill = beats.filter(b => b.content > h - 8);
  ok(`every beat covers the viewport at ${w}x${h}`, short.length === 0,
     short.map(b => `${b.beat} ${b.h}<${b.need}`).join('; '));
  ok(`every beat's content fits the viewport at ${w}x${h}`, spill.length === 0,
     spill.map(b => `${b.beat} ${b.content}>${h}`).join('; '));
}

/* ---- 4c. cropping the art must never crop a marker or a caption away ------ */
for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 1024], [1280, 1600]]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(300);
  const off = await p.evaluate(() => [...document.querySelectorAll('.pin, .blabel')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; })
    .map(e => (e.getAttribute('aria-label') || e.textContent).trim()));
  ok(`no marker or caption is cropped off at ${w}x${h}`, off.length === 0, off.join('; '));
}

/* ---- 5. no horizontal overflow ------------------------------------------ */
for (const [w, h] of [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [900, 900], [420, 780]]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(280);
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`no horizontal overflow at ${w}px`, o <= 0, `${o}px`);
}
await p.setViewportSize({ width: 1920, height: 1080 });
await p.waitForTimeout(300);

/* ---- 6. the consignment runs the route, and picks up its states in order -- */
const run = await p.evaluate(async () => {
  const truck = document.getElementById('truck');
  const seen = [], states = [], held = [], turns = [];
  const hold = window.JOURNEY.route.width.holdY, exit = window.JOURNEY.truck.exit;
  const H = document.body.scrollHeight;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    window.scrollTo({ top: H * t, behavior: 'instant' });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const tr = truck.style.transform;
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(tr);
    const z = /scale\(([-\d.]+)\)/.exec(tr), a = /rotate\(([-\d.]+)deg\)/.exec(tr);
    if (m) seen.push(+m[2]);
    // past the hold the corridor is at one scale, so the consignment is too
    if (m && z && +m[2] > hold + 100) held.push(+z[1]);
    if (a) turns.push(Math.abs(+a[1]));
    const on = [...document.querySelectorAll('.truck-variant[data-variant].is-on')].map(v => v.dataset.variant);
    const s = on.includes('sealed') ? 'sealed' : on.includes('scanned') ? 'scanned' : 'closed';
    if (states[states.length - 1] !== s) states.push(s);
  }
  return { monotone: seen.every((v, i) => i === 0 || v >= seen[i - 1] - 0.01), span: [seen[0], seen[seen.length - 1]], states,
           held: [Math.min(...held), Math.max(...held)], maxTurn: Math.max(...turns),
           endOpacity: +getComputedStyle(truck).opacity, exit };
});
ok('consignment moves down the route monotonically', run.monotone, run.span.map(v => v?.toFixed(0)).join(' → '));
ok('states arrive in order closed → scanned → sealed',
   JSON.stringify(run.states) === JSON.stringify(['closed', 'scanned', 'sealed']), run.states.join(' → '));
// The corridor used to grow about six-fold between the border and the city,
// which on a scrolled page reads as a zoom rather than as travel.
ok('the corridor holds one scale past the hold', run.held[1] - run.held[0] < 0.001,
   `consignment ${run.held[0].toFixed(3)} → ${run.held[1].toFixed(3)}`);
// It used to be held at the last point of the route with no heading to read,
// which turned it a quarter circle across the carriageway.
ok('the consignment never turns across the carriageway', run.maxTurn < 20, `worst ${run.maxTurn.toFixed(1)}°`);
ok('and is gone once it has been delivered', run.endOpacity === 0,
   `opacity ${run.endOpacity} below y ${run.exit.to}`);

/* ---- 7. the 2018 frame -------------------------------------------------- */
const frame = await p.evaluate(async () => {
  const at = async key => {
    const el = document.getElementById('beat-' + key);
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top + r.height / 2 - innerHeight * 0.56), behavior: 'instant' });
    await new Promise(r2 => setTimeout(r2, 900));
    const c = document.querySelector('.chev-flow');
    return { beat: document.body.dataset.beat, chev: +getComputedStyle(c).opacity };
  };
  return { base: await at('baseline2018'), transit: await at('transit') };
});
ok('the 2018 beat runs with the corridor instrumentation off',
   frame.base.chev < 0.1, JSON.stringify(frame.base));
ok('and is inverted by the transit beat',
   frame.transit.chev > 0.9, JSON.stringify(frame.transit));

/* ---- 8. nothing but the consignment stands on the carriageway ------------ */
const onRoad = await p.evaluate(() =>
  [...document.querySelectorAll('#route-layer use, #route-layer image')].length);
ok('no vehicle on the road but the consignment', onRoad === 0, `${onRoad} sprites in the route layer`);

/* ---- 9. navigation ------------------------------------------------------ */
const nav = await p.evaluate(async () => {
  // Wait for the scroll to SETTLE, not for a fixed slice of time. A jump from
  // the foot of the page to section 1 is a smooth scroll the length of the
  // whole corridor, and a fixed 700 ms read it mid-flight and reported
  // whichever section it happened to be passing.
  const settle = async () => {
    let last = NaN;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 80));
      if (window.scrollY === last) return;
      last = window.scrollY;
    }
  };
  const press = async k => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: k, bubbles: true }));
    await settle();
    await new Promise(r => setTimeout(r, 120));   // let the beat readout catch up
  };
  window.scrollTo({ top: 0, behavior: 'instant' });
  await new Promise(r => setTimeout(r, 500));
  const seq = [document.body.dataset.beat];
  for (let i = 0; i < 8; i++) { await press('ArrowDown'); seq.push(document.body.dataset.beat); }
  const jumps = [];
  for (let n = 1; n <= 7; n++) { await press('Digit' + n); jumps.push(+document.body.dataset.section); }
  return { seq, jumps };
});
ok('arrow keys walk all nine beats in order',
   JSON.stringify(nav.seq) === JSON.stringify(['cooperation', 'targeting', 'baseline2018', 'border', 'transit', 'warehouse', 'declaration', 'audit', 'passengers']),
   nav.seq.join(' → '));
ok('number keys 1–7 jump to their section',
   JSON.stringify(nav.jumps) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]), nav.jumps.join(','));

/* ---- 10. modals from the corridor markers ------------------------------- */
const modal = await p.evaluate(async () => {
  const out = [];
  const pins = [...document.querySelectorAll('.pin.is-live')];
  for (const pin of pins) {
    pin.click();
    await new Promise(r => setTimeout(r, 400));
    const openNow = document.getElementById('modal').classList.contains('is-open');
    const title = document.querySelector('.modal-body h2')?.textContent || '';
    const bullets = document.querySelectorAll('.md-bullets li').length;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    out.push({ label: pin.getAttribute('aria-label'), openNow, title, bullets,
               closed: !document.getElementById('modal').classList.contains('is-open'),
               refocused: document.activeElement === pin });
  }
  return out;
});
ok('every marker opens its modal', modal.length === 3 && modal.every(m => m.openNow && m.title && m.bullets > 2),
   modal.map(m => `${m.title}(${m.bullets})`).join(', '));
ok('escape closes the modal and returns focus to the marker',
   modal.every(m => m.closed && m.refocused), modal.map(m => m.closed + '/' + m.refocused).join(' '));

/* ---- 10b. and a real pointer reaches them -------------------------------- */
/* pin.click() dispatches on the element and so passes even when something is
   lying over it — which is exactly how the corridor rows came to swallow every
   click aimed at a marker. Hit-test the point a reader would actually press. */
const reachable = await p.evaluate(async () => {
  const out = [];
  const root = document.documentElement, was = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';        // a smooth scroll still in flight moves the target
  for (const pin of document.querySelectorAll('.pin.is-live')) {
    let r = pin.getBoundingClientRect();
    for (let i = 0; i < 4 && Math.abs(r.top - innerHeight / 2) > 2; i++) {
      window.scrollTo({ top: window.scrollY + r.top - innerHeight / 2, behavior: 'instant' });
      await new Promise(res => setTimeout(res, 250));
      r = pin.getBoundingClientRect();
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.3);
    out.push({ label: pin.getAttribute('aria-label'),
               centred: Math.abs(r.top - innerHeight / 2) <= 2,
               reached: !!hit && pin.contains(hit),
               over: hit ? (hit.className.baseVal ?? hit.className) || hit.tagName : 'nothing' });
  }
  root.style.scrollBehavior = was;
  return out;
});
ok('a click on a marker reaches the marker', reachable.every(r => r.centred && r.reached),
   reachable.filter(r => !r.reached).map(r => `${r.label} → ${r.over}`).join('; ') || `${reachable.length} markers`);

/* ---- 11. the awaiting-figure machinery is still alive -------------------- */
const chips = await p.evaluate(async () => {
  document.querySelector('.pin.is-live[aria-label*="E-Transit"]').click();
  await new Promise(r => setTimeout(r, 300));
  const inModal = document.querySelectorAll('.modal-body .ph-chip').length;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  return { inModal, inPage: document.querySelectorAll('#rows .ph-chip').length };
});
/* The one awaiting-figure left is ETRANSIT_SHARE, in the E-Transit modal: the
   transit row's legal-basis chip is gone with the rest of that panel. */
ok('awaiting-figure chips render where the data asks for them',
   chips.inModal >= 1, JSON.stringify(chips));

/* ---- 12. light-theme contrast of the smallest type ---------------------- */
const contrast = await p.evaluate(() => {
  const lum = c => { const v = c.map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = s => s.match(/\d+/g).slice(0, 3).map(Number);
  const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const surface = getComputedStyle(document.querySelector('.panel')).backgroundColor;
  const WHITE = 'rgb(255,255,255)';
  const samples = {};
  [['.facts-note', 'facts-note'], ['.metric-anchor', 'metric-anchor'], ['.ch-range', 'ch-range'],
   ['.metric-label', 'metric-label'], ['.c-eyebrow', 'c-eyebrow'], ['.ch-note', 'ch-note']].forEach(([sel, name]) => {
    const e = document.querySelector(sel);
    if (e) samples[name] = +ratio(getComputedStyle(e).color, WHITE).toFixed(2);
  });
  return samples;
});
const worst = Math.min(...Object.values(contrast));
ok('smallest type clears 4.5:1 on the panel', worst >= 4.5,
   Object.entries(contrast).map(([k, v]) => `${k} ${v}`).join(', '));

/* ---- 13. reduced motion ------------------------------------------------- */
const rp = await page({ reducedMotion: 'reduce' });
await rp.goto(HTTP, { waitUntil: 'networkidle' });
await settle(rp);
const still = await rp.evaluate(() => {
  const none = s => getComputedStyle(document.querySelector(s)).animationName === 'none';
  const dots = [...document.querySelectorAll('.pax-dot')].map(d => d.style.offsetDistance);
  return { chev: none('.chev'), bob: none('.truck-bob'), dot: none('.pax-dot'),
           spread: new Set(dots).size };
});
ok('reduced motion stops the chevrons, the bob and the passenger dots',
   still.chev && still.bob && still.dot, JSON.stringify(still));
ok('and the dots still stand spread along the route', still.spread > 15, `${still.spread} distinct offsets`);
await rp.context().close();

await browser.close();
const fails = results.filter(r => r[0] === 'FAIL');
results.forEach(([s, n, d]) => console.log(`  [${s}] ${n}${d ? '  — ' + d : ''}`));
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
