/*
 * Verification suite for the three interactive pictures.
 *
 * tools/verify.mjs guards the deck: the corridor, the nine beats, the
 * contracts, the contrast, no network after load. This guards the three
 * things a picture can get wrong that a bullet list could not.
 *
 *   1. It can drop a fact. A bullet list is its own inventory; a drawing is
 *      not, so every sentence demo-data.js still holds is checked to be
 *      reachable, verbatim, in the picture that replaced it.
 *   2. It can become undrivable. A presenter drives from a lectern with the
 *      arrow keys, so every stage is walked by key, jumped to by digit, and
 *      reset — and the page's own navigation is checked to still work while
 *      a picture is on screen.
 *   3. It can hide a fact inside an animation, shift the layout, or draw
 *      something outside itself. So the last stage must show every part, the
 *      stage box must not move between stages, and the same press must give
 *      the same frame.
 *
 * Usage (same as tools/verify.mjs):
 *   npx --no-install http-server -p 8099 -s .
 *   node tools/verify-scenes.mjs [http://127.0.0.1:8099/index.html]
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

const HTTP = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const STEPS = 3;                       /* every picture reveals in three moves */
const results = [];
const ok = (n, c, d = '') => results.push([c ? 'PASS' : 'FAIL', n, d]);

/* ---- 0. the source rules, checked in the source ------------------------- */
/* The scenes are loaded by a page with no build step, straight into whatever
   the projector's browser is, alongside 1991 lines of ES5. They are held to
   the same dialect. And Math.random() cannot appear: an unrepeatable frame in
   front of an audience is the one failure that cannot be fixed live. */
{
  const dir = new URL('../sections/', import.meta.url);
  const bad = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (/Math\s*\.\s*random/.test(src)) bad.push(`${f}: Math.random`);
    if (/=>/.test(src)) bad.push(`${f}: arrow function`);
    if (/`/.test(src)) bad.push(`${f}: template literal`);
    if (/\b(let|const)\s+[A-Za-z_$]/.test(src)) bad.push(`${f}: let/const`);
  }
  ok('scene sources are ES5 and carry no randomness', bad.length === 0, bad.join('; '));

  /* Every rule in sections/*.css must be scoped to a scene. This is the whole
     isolation guarantee: styles.css is untouched, and nothing these files add
     can reach a surface that is not one of the three pictures. */
  const cssBad = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.css'))) {
    readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').forEach((line, i) => {
        const m = /^([^@\s/][^{]*)\{/.exec(line);
        if (m && !/^\s*\.(scene|tgc|etx|cco|sc-)/.test(m[1])) cssBad.push(`${f}:${i + 1} ${m[1].trim()}`);
      });
  }
  ok('every scene CSS rule is scoped to a scene', cssBad.length === 0, cssBad.join(' | '));
}

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...opts });
  const p = await ctx.newPage();
  p.__errs = [];
  p.on('console', m => { if (m.type() === 'error') p.__errs.push(m.text()); });
  p.on('pageerror', e => p.__errs.push('PAGEERROR ' + e.message));
  await p.goto(HTTP, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.querySelectorAll('#rows .row').length > 0);
  await p.waitForTimeout(350);
  return p;
}
const p = await open();

/* ---- 1. every fact survived -------------------------------------------- */
/* The three surfaces used to be a lead sentence and a list of bullets. Those
   sentences are still in demo-data.js and are still the deck's own words, so
   the test is that each one is still reachable in the picture that replaced
   it — either drawn on it or in the text equivalent it ships. */
const facts = await p.evaluate(async () => {
  const D = window.demoData, out = {}, norm = s => s.replace(/\s+/g, ' ').trim();
  const openPin = async label => {
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
    pin.click();
    await new Promise(r => setTimeout(r, 350));
    const txt = document.querySelector('.modal-body').textContent;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    return txt;
  };
  const tgt = D.beats.targeting;
  const tText = norm(document.getElementById('beat-targeting').textContent);
  out.targeting = tgt.functions.map(f => f.title + ' — ' + f.text)
    .concat([tgt.monitoring.title], tgt.monitoring.modes.map(m => m.label))
    .filter(s => !tText.includes(norm(s)));
  const et = D.meta.modals.eTransit;
  const eText = norm(await openPin('e-transit'));
  out.eTransit = [et.lead].concat(et.bullets).filter(s => !eText.includes(norm(s)));
  const cc = D.meta.modals.ccoIS;
  const cText = norm(await openPin('cargo'));
  out.ccoIS = [cc.lead].concat(cc.bullets).filter(s => !cText.includes(norm(s)));
  return out;
});
for (const [k, missing] of Object.entries(facts)) {
  ok(`every fact from the ${k} bullets survived`, missing.length === 0,
     missing.map(s => '"' + s.slice(0, 48) + '…"').join('; '));
}

/* ---- 2. and none of it is a bullet list or a paragraph on screen -------- */
const prose = await p.evaluate(async () => {
  const look = root => {
    const bad = [];
    root.querySelectorAll('p, ul, ol').forEach(n => {
      if (n.closest('.sr-only')) return;              /* the text equivalent */
      if (!n.textContent.trim()) return;
      if (getComputedStyle(n).display === 'none') return;
      bad.push(n.tagName + '.' + (n.className || '?'));
    });
    return bad;
  };
  const out = { targeting: look(document.querySelector('.tgc')) };
  for (const [key, label] of [['eTransit', 'e-transit'], ['ccoIS', 'cargo']]) {
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
    pin.click();
    await new Promise(r => setTimeout(r, 300));
    out[key] = look(document.querySelector('.modal-body .scene'));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
  }
  return out;
});
for (const [k, bad] of Object.entries(prose)) {
  ok(`no visible bullet list or paragraph left in ${k}`, bad.length === 0, bad.join(', '));
}

/* ---- 3. the two panels: deterministic, driveable, and they do not move -- */
for (const [key, label] of [['eTransit', 'e-transit'], ['ccoIS', 'cargo']]) {
  const r = await p.evaluate(async ([label, steps]) => {
    const press = async code => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      await new Promise(r => setTimeout(r, 70));
    };
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
    pin.click();
    await new Promise(r => setTimeout(r, 350));
    const scene = document.querySelector('.modal-body .scene');
    const stage = scene.querySelector('.scene-stage');
    const box = () => { const b = stage.getBoundingClientRect();
      return Math.round(b.width) + 'x' + Math.round(b.height); };

    const railCount = scene.querySelectorAll('.scene-step').length;
    await press('Home');
    const walked = [], boxes = [], shown = [];
    const parts = scene.querySelectorAll('[data-at]').length;
    for (let i = 0; i < steps; i++) {
      boxes.push(box());
      walked.push(scene.dataset.step);
      shown.push(scene.querySelectorAll('[data-at].is-on').length);
      await press('ArrowRight');
    }
    const shots = [], shots2 = [];
    for (let i = 0; i < steps; i++) { await press('Digit' + (i + 1)); shots.push(scene.innerHTML); }
    for (let i = 0; i < steps; i++) { await press('Digit' + (i + 1)); shots2.push(scene.innerHTML); }
    const shots3 = [];
    for (const i of [steps - 1, 0, 1, steps - 1, 0]) {
      await press('Digit' + (i + 1)); shots3.push([i, scene.innerHTML]);
    }
    await press('End'); const atEnd = scene.dataset.step;
    const allShown = scene.querySelectorAll('[data-at].is-on').length;
    await press('KeyR'); const afterR = scene.dataset.step;
    await press('Escape');
    return { railCount, walked, parts, shown, allShown,
             boxesStable: new Set(boxes).size === 1, boxes: [...new Set(boxes)],
             repeatable: shots.every((s, i) => s === shots2[i]),
             orderFree: shots3.every(([i, s]) => s === shots[i]),
             atEnd, afterR,
             closed: !document.getElementById('modal').classList.contains('is-open'),
             refocused: document.activeElement === pin };
  }, [label, STEPS]);
  ok(`${key}: three stages, one rail`, r.railCount === STEPS, `${r.railCount}`);
  ok(`${key}: arrow keys walk every stage in order`,
     JSON.stringify(r.walked) === JSON.stringify([...Array(STEPS).keys()].map(String)), r.walked.join(','));
  /* the picture builds up and never takes anything away */
  ok(`${key}: each stage shows more of the picture, never less`,
     r.shown.every((v, i) => i === 0 || v >= r.shown[i - 1]) && r.allShown === r.parts,
     `${r.shown.join(' → ')} of ${r.parts}`);
  ok(`${key}: every stage is reachable directly by digit`, r.repeatable, 'frames differed between passes');
  ok(`${key}: and no stage depends on the one before it`, r.orderFree, 'out-of-order frame differed');
  ok(`${key}: the picture never moves between stages`, r.boxesStable, r.boxes.join(' / '));
  ok(`${key}: End reaches the last stage and R replays from the first`,
     r.atEnd === String(STEPS - 1) && r.afterR === '0', `${r.atEnd} → ${r.afterR}`);
  ok(`${key}: escape still belongs to the page`, r.closed && r.refocused,
     `closed ${r.closed}, refocused ${r.refocused}`);
}

/* ---- 4. nothing drawn has outgrown what it is drawn in -------------------
   A caption that overflows its chip, or a label that has walked off the edge
   of the drawing, is invisible in code review and unmissable on a projector.
   Every chip is sized from a character count rather than measured, so the
   count is checked against what the browser actually laid out. */
const geom = await p.evaluate(async () => {
  const scan = svg => {
    const vb = svg.viewBox.baseVal, out = { over: [], chips: [] };
    svg.querySelectorAll('text').forEach(t => {
      const b = t.getBBox();
      if (b.x < -1 || b.y < -1 || b.x + b.width > vb.width + 1 || b.y + b.height > vb.height + 1) {
        out.over.push('"' + t.textContent.slice(0, 24) + '"');
      }
    });
    svg.querySelectorAll('.scene-chip').forEach(g => {
      const box = g.querySelector('rect');
      if (!box) return;
      const bw = box.getBBox().width;
      g.querySelectorAll('text').forEach(t => {
        if (t.getBBox().width > bw - 8) out.chips.push('"' + t.textContent.slice(0, 24) + '"');
      });
    });
    return out;
  };
  const all = { targeting: scan(document.querySelector('.tgc-stage svg')) };
  for (const [key, label] of [['eTransit', 'e-transit'], ['ccoIS', 'cargo']]) {
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
    pin.click();
    await new Promise(r => setTimeout(r, 400));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'End', bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    all[key] = scan(document.querySelector('.modal-body .scene-stage svg'));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 280));
  }
  return all;
});
for (const [k, g] of Object.entries(geom)) {
  ok(`${k}: nothing is drawn outside the drawing`, g.over.length === 0, g.over.join(', '));
  ok(`${k}: no caption outgrows its chip`, g.chips.length === 0, g.chips.join(', '));
}

/* ---- 5. the console in the page: driveable without stealing the deck ---- */
const tgc = await p.evaluate(async (steps) => {
  const press = async (code, target) => {
    (target || window).dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise(r => setTimeout(r, 90));
  };
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
  await new Promise(r => setTimeout(r, 1400));
  const t = document.querySelector('.tgc');
  const rail = [...t.querySelectorAll('.scene-step')];
  rail[0].focus();
  const walked = [], shown = [];
  for (let i = 0; i < steps; i++) {
    walked.push(t.dataset.step);
    shown.push(t.querySelectorAll('[data-at].is-on').length);
    await press('ArrowRight', rail[0]);
  }
  await press('Digit1', document.activeElement);
  const afterDigit = t.dataset.step;
  /* with nothing in the picture focused, the deck still has its own keys */
  document.body.focus();
  const beatBefore = document.body.dataset.beat;
  await press('ArrowDown');
  await new Promise(r => setTimeout(r, 1400));
  return { walked, shown, afterDigit, parts: t.querySelectorAll('[data-at]').length,
           channels: t.querySelectorAll('.tgc-mode').length,
           beatBefore, beatAfter: document.body.dataset.beat };
}, STEPS);
ok('targeting: the rail walks all three stages',
   JSON.stringify(tgc.walked) === JSON.stringify([...Array(STEPS).keys()].map(String)), tgc.walked.join(','));
ok('targeting: and a digit jumps straight to one', tgc.afterDigit === '0', tgc.afterDigit);
ok('targeting: all six monitored channels are drawn', tgc.channels === 6, `${tgc.channels}`);
ok('targeting: each stage shows more of the picture, never less',
   tgc.shown.every((v, i) => i === 0 || v >= tgc.shown[i - 1]), `${tgc.shown.join(' → ')} of ${tgc.parts}`);
ok('targeting: the deck keeps its own keys when the picture is not focused',
   tgc.beatBefore === 'targeting' && tgc.beatAfter === 'baseline2018',
   `${tgc.beatBefore} → ${tgc.beatAfter}`);

/* ---- 6. the smallest type on each picture, against what it sits on ------ */
const contrast = await p.evaluate(async () => {
  const lum = c => { const v = c.map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  /* SVG text is painted with `fill`, not `color`. The pictures sit on the
     deck's own white panel, so white is the ground. */
  const on = sel => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const st = getComputedStyle(e);
    const x = lum(rgb(st.fill && st.fill !== 'none' ? st.fill : st.color)), y = 1;
    return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2));
  };
  const out = { 'targeting sub-label': on('.tgc-s'), 'targeting label': on('.tgc-t'),
                'targeting caption': on('.tgc-cap'), 'channel label': on('.tgc-modet') };
  for (const [label, sels] of [['e-transit', { 'e-transit caption': '.etx-cap', 'chip sub-line': '.sc-chip-s' }],
                               ['cargo', { 'warehouse sub-label': '.cco-s', 'flow station': '.cco-stt',
                                           'axis year': '.cco-ayear' }]]) {
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
    pin.click();
    await new Promise(r => setTimeout(r, 350));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'End', bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    for (const [k, sel] of Object.entries(sels)) out[k] = on('.modal-body ' + sel);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 280));
  }
  return out;
});
const worst = Math.min(...Object.values(contrast).filter(v => v !== null));
ok('the smallest type on every picture clears 4.5:1', worst >= 4.5,
   Object.entries(contrast).map(([k, v]) => `${k} ${v}`).join(', '));
ok('no console errors while driving all three pictures', p.__errs.length === 0,
   p.__errs.slice(0, 3).join(' | '));
await p.context().close();

/* ---- 7. reduced motion: static, and still complete ---------------------- */
/* There is nothing looping to switch off — the pictures only fade a stage in.
   What matters is that with the fade gone the drawing is still complete and
   every stage is still reachable, because every stage is a button. */
const rp = await open({ reducedMotion: 'reduce' });
const still = await rp.evaluate(async (steps) => {
  const t = document.querySelector('.tgc');
  const running = [...t.querySelectorAll('*')]
    .filter(e => getComputedStyle(e).animationName !== 'none').length;
  const pin = [...document.querySelectorAll('.pin.is-live')]
    .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes('cargo'));
  pin.click();
  await new Promise(r => setTimeout(r, 400));
  const scene = document.querySelector('.modal-body .scene');
  const reached = [];
  for (const b of scene.querySelectorAll('.scene-step')) {
    b.click();
    await new Promise(r => setTimeout(r, 40));
    reached.push(scene.dataset.step);
  }
  const parts = scene.querySelectorAll('[data-at]').length;
  const shown = scene.querySelectorAll('[data-at].is-on').length;
  const opaque = [...scene.querySelectorAll('[data-at].is-on')]
    .every(e => +getComputedStyle(e).opacity === 1);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
  return { running, reached, parts, shown, opaque };
}, STEPS);
ok('nothing animates under reduced motion', still.running === 0, `${still.running} animated nodes`);
ok('every stage is still reachable', JSON.stringify(still.reached) === JSON.stringify([...Array(STEPS).keys()].map(String)),
   still.reached.join(','));
ok('and the last stage still shows the whole picture, at full opacity',
   still.shown === still.parts && still.opaque, `${still.shown}/${still.parts}`);
ok('no console errors under reduced motion', rp.__errs.length === 0, rp.__errs.slice(0, 3).join(' | '));
await rp.context().close();

/* ---- 8. every window the deck is shown at ------------------------------- */
const sp = await open();
for (const [w, h] of [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [1280, 1024]]) {
  await sp.setViewportSize({ width: w, height: h });
  await sp.waitForTimeout(300);
  const fit = await sp.evaluate(async () => {
    const out = { modals: [] };
    const sec = document.getElementById('beat-targeting');
    const kids = [...sec.children].map(c => c.getBoundingClientRect());
    out.page = Math.round(Math.max(...kids.map(k => k.bottom)) - Math.min(...kids.map(k => k.top)));
    for (const label of ['e-transit', 'cargo']) {
      const pin = [...document.querySelectorAll('.pin.is-live')]
        .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
      pin.click();
      await new Promise(r => setTimeout(r, 320));
      const b = document.querySelector('.modal-body');
      out.modals.push([label, Math.round(b.getBoundingClientRect().height), b.scrollHeight - b.clientHeight]);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 260));
    }
    out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return out;
  });
  ok(`the targeting picture fits the viewport at ${w}x${h}`, fit.page <= h - 8, `${fit.page} > ${h - 8}`);
  ok(`both panels fit the viewport at ${w}x${h}`,
     fit.modals.every(([, hh]) => hh <= h * 0.94), fit.modals.map(m => m.join(':')).join(' '));
  /* A panel in this deck is read whole, from a lectern. If it scrolls inside
     itself, part of the argument is below the fold on the projector. */
  ok(`and neither scrolls inside itself at ${w}x${h}`,
     fit.modals.every(([, , over]) => over <= 0), fit.modals.map(m => m[0] + ' ' + m[2] + 'px').join(', '));
  ok(`no horizontal overflow at ${w}x${h}`, fit.overflow <= 0, `${fit.overflow}px`);
}
ok('no console errors across every window size', sp.__errs.length === 0, sp.__errs.slice(0, 3).join(' | '));
await sp.context().close();

await browser.close();
const fails = results.filter(r => r[0] === 'FAIL');
results.forEach(([s, n, d]) => console.log(`  [${s}] ${n}${d ? '  — ' + d : ''}`));
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
