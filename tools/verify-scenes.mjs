/*
 * Verification suite for the three interactive scenes.
 *
 * tools/verify.mjs guards the deck: the corridor, the nine beats, the
 * contracts, the contrast, no network after load. This guards the three
 * things a scene can get wrong that a card could not.
 *
 *   1. It can drop a fact. A bullet list is its own inventory; a drawing is
 *      not, so every sentence demo-data.js still holds is checked to be
 *      reachable, verbatim, in the scene that replaced it.
 *   2. It can become undrivable. A presenter drives from a lectern with the
 *      arrow keys, so every state is walked by key, jumped to by digit, and
 *      reset — and the page's own navigation is checked to still work while a
 *      scene is on screen.
 *   3. It can be non-deterministic, or shift the layout, or hide a fact
 *      inside an animation. The same press must give the same frame; the
 *      stage must not move between steps; and with prefers-reduced-motion the
 *      scene must be static AND complete.
 *
 * Usage (same as tools/verify.mjs):
 *   npx --no-install http-server -p 8099 -s .
 *   node tools/verify-scenes.mjs [http://127.0.0.1:8099/index.html]
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

const HTTP = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const results = [];
const ok = (n, c, d = '') => results.push([c ? 'PASS' : 'FAIL', n, d]);

/* ---- 0. the source rules, checked in the source ------------------------- */
/* The scenes are loaded by a page with no build step, straight into whatever
   the projector's browser is, alongside 1991 lines of ES5. They are held to
   the same dialect. And Math.random() cannot appear: an unrepeatable frame in
   front of an audience is the one failure that cannot be fixed live. */
{
  const dir = new URL('../sections/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  const bad = [];
  for (const f of files) {
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
     can reach a surface that is not one of the three scenes. */
  const cssBad = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.css'))) {
    readFileSync(new URL(f, dir), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .forEach((line, i) => {
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
   the test is simply that each one is still reachable in the scene that
   replaced it. */
const facts = await p.evaluate(async () => {
  const out = {};
  const D = window.demoData;
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
  const norm = s => s.replace(/\s+/g, ' ').trim();

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
      if (n.closest('.sr-only')) return;                 /* the text equivalent */
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

/* ---- 3. the modal scenes: deterministic, driveable, and they do not move - */
for (const [key, label, steps] of [['eTransit', 'e-transit', 8], ['ccoIS', 'cargo', 8]]) {
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
    const box = () => { const b = stage.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); };

    const railCount = scene.querySelectorAll('.scene-step').length;
    /* walk it forward with the arrow keys, the way a lectern does */
    const walked = [], boxes = [];
    await press('Home');
    for (let i = 0; i < steps; i++) { boxes.push(box()); walked.push(scene.dataset.step); await press('ArrowRight'); }
    /* jump straight into every state with a digit, and record the frame */
    const shots = [];
    for (let i = 0; i < steps; i++) { await press('Digit' + (i + 1)); shots.push(scene.innerHTML); }
    /* do it again — the same press must give the same frame */
    const shots2 = [];
    for (let i = 0; i < steps; i++) { await press('Digit' + (i + 1)); shots2.push(scene.innerHTML); }
    /* and out of order, to prove no state depends on the one before it */
    const shots3 = [];
    for (const i of [steps - 1, 0, Math.floor(steps / 2), steps - 1, 0]) {
      await press('Digit' + (i + 1)); shots3.push([i, scene.innerHTML]);
    }
    await press('End'); const atEnd = scene.dataset.step;
    await press('KeyR'); const afterR = scene.dataset.step;
    /* Escape is never swallowed: it always belongs to the page */
    await press('Escape');
    return {
      railCount, walked,
      boxesStable: new Set(boxes).size === 1, boxes: [...new Set(boxes)],
      repeatable: shots.every((s, i) => s === shots2[i]),
      orderFree: shots3.every(([i, s]) => s === shots[i]),
      atEnd, afterR,
      closed: !document.getElementById('modal').classList.contains('is-open'),
      refocused: document.activeElement === pin
    };
  }, [label, steps]);
  ok(`${key}: the step rail carries every state`, r.railCount === steps, `${r.railCount}`);
  ok(`${key}: arrow keys walk every state in order`,
     JSON.stringify(r.walked) === JSON.stringify([...Array(steps).keys()].map(String)), r.walked.join(','));
  ok(`${key}: every state is reachable directly by digit`, r.repeatable, 'frames differed between passes');
  ok(`${key}: and no state depends on the one before it`, r.orderFree, 'out-of-order frame differed');
  ok(`${key}: the stage never moves between states`, r.boxesStable, r.boxes.join(' / '));
  ok(`${key}: End reaches the last state and R replays from the first`,
     r.atEnd === String(steps - 1) && r.afterR === '0', `${r.atEnd} → ${r.afterR}`);
  ok(`${key}: escape still belongs to the page`, r.closed && r.refocused,
     `closed ${r.closed}, refocused ${r.refocused}`);
}

/* ---- 4. the console in the page: driveable without stealing the deck ---- */
const tgc = await p.evaluate(async () => {
  const press = async (code, target) => {
    (target || window).dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise(r => setTimeout(r, 90));
  };
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
  await new Promise(r => setTimeout(r, 1400));
  const t = document.querySelector('.tgc');
  const steps = [...t.querySelectorAll('.scene-step')];
  const modes = [...t.querySelectorAll('.tgc-mode')];

  /* the step rail: focus it and walk it */
  steps[0].focus();
  const walked = [];
  for (let i = 0; i < steps.length; i++) { walked.push(t.dataset.step); await press('ArrowRight', steps[0]); }
  await press('Digit1', document.activeElement);
  const afterDigit = t.dataset.step;

  /* the channel rail: it filters the whole console, and it recounts */
  modes[0].focus();
  const before = t.querySelectorAll('.tgc-mark').length;
  await press('Digit4', document.activeElement);
  await new Promise(r => setTimeout(r, 500));          /* the stand-down is a 0.35s fade */
  const want = modes[3].dataset.mode;
  const filtered = { mode: t.dataset.mode, want, marks: t.querySelectorAll('.tgc-mark').length };
  const dimmed = [...t.querySelectorAll('.tgc-lane')]
    .filter(l => +getComputedStyle(l).opacity < 0.5).length;
  modes[0].focus();
  await press('Digit1', document.activeElement);
  await new Promise(r => setTimeout(r, 500));
  const restored = [...t.querySelectorAll('.tgc-lane')]
    .filter(l => +getComputedStyle(l).opacity > 0.9).length;

  /* and with nothing in the console focused, the deck still has its keys */
  document.body.focus();
  const beatBefore = document.body.dataset.beat;
  await press('ArrowDown');
  await new Promise(r => setTimeout(r, 1400));
  return { walked, afterDigit, before, filtered, dimmed, restored,
           beatBefore, beatAfter: document.body.dataset.beat,
           lanes: t.querySelectorAll('.tgc-lane').length,
           items: t.querySelectorAll('.tgc-item').length };
});
ok('targeting: the step rail walks all five states',
   JSON.stringify(tgc.walked) === JSON.stringify(['0', '1', '2', '3', '4']), tgc.walked.join(','));
ok('targeting: and a digit jumps straight to one', tgc.afterDigit === '0', tgc.afterDigit);
ok('targeting: six channels, none of them ever empty',
   tgc.lanes === 6 && tgc.items === 24, `${tgc.lanes} lanes, ${tgc.items} items`);
ok('targeting: choosing a channel filters the whole console',
   tgc.filtered.mode === tgc.filtered.want && tgc.dimmed === 5 && tgc.filtered.marks < tgc.before,
   `${tgc.filtered.mode}, ${tgc.dimmed} lanes stood down, ${tgc.before} → ${tgc.filtered.marks} marks`);
ok('targeting: and every channel comes back', tgc.restored === 6, `${tgc.restored}/6`);
ok('targeting: the deck keeps its own keys when the console is not focused',
   tgc.beatBefore === 'targeting' && tgc.beatAfter === 'baseline2018',
   `${tgc.beatBefore} → ${tgc.beatAfter}`);

/* ---- 4b. nothing drawn has outgrown what it is drawn in ------------------
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
    svg.querySelectorAll('.scene-chip, .tgc-keychip').forEach(g => {
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
    const merged = { over: [], chips: [] };
    document.querySelectorAll('.modal-body svg').forEach(svg => {
      if (!svg.viewBox.baseVal.width) return;
      const s = scan(svg);
      merged.over.push(...s.over); merged.chips.push(...s.chips);
    });
    all[key] = merged;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 280));
  }
  return all;
});
for (const [k, g] of Object.entries(geom)) {
  ok(`${k}: nothing is drawn outside the drawing`, g.over.length === 0, g.over.join(', '));
  ok(`${k}: no caption outgrows its chip`, g.chips.length === 0, g.chips.join(', '));
}

/* ---- 4c. a scene's own controls stay operable from the keyboard ---------
   The scenes claim the arrow keys and the digits while they are open. A
   control inside one — the button that changes the record in the warehouse
   operator's pane — must still take Space and Enter, or it is a mouse-only
   control on a stage that is meant to be driven from a lectern. */
const ctrls = await p.evaluate(async () => {
  const pin = [...document.querySelectorAll('.pin.is-live')]
    .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes('cargo'));
  pin.click();
  await new Promise(r => setTimeout(r, 350));
  const scene = document.querySelector('.modal-body .scene');
  scene.querySelector('.scene-step:nth-child(4)').click();      /* the split view */
  await new Promise(r => setTimeout(r, 150));
  const read = () => [...scene.querySelectorAll('.cco-pane')]
    .map(p => [...p.querySelectorAll('.cco-v')].map(v => v.textContent).join('|'));
  const before = read();
  const btn = scene.querySelector('.cco-btn');
  btn.focus();
  btn.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
  btn.click();                                        /* what Space does natively */
  await new Promise(r => setTimeout(r, 120));
  const after = read();
  const stepHeld = scene.dataset.step;
  const lit = scene.querySelectorAll('.cco-row.is-hit').length;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
  return { before, after, stepHeld, lit };
});
ok('a change in one pane is a change in all three',
   ctrls.after.every(v => v === ctrls.after[0]) && ctrls.after[0] !== ctrls.before[0],
   `${ctrls.before[0]} → ${ctrls.after.join(' / ')}`);
ok('and all three say so at once', ctrls.lit === 3, `${ctrls.lit} rows highlighted`);
ok('space on a focused control does not move the step instead', ctrls.stepHeld === '3',
   `step ${ctrls.stepHeld}`);

/* ---- 5. the dark console's type, against the ground it is actually on --- */
const contrast = await p.evaluate(() => {
  const lum = c => { const v = c.map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cs = getComputedStyle(document.querySelector('.tgc'));
  const panel = cs.getPropertyValue('--tg-panel').trim();
  const bg = cs.getPropertyValue('--tg-bg').trim();
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  /* SVG text is painted with `fill`, not `color`, and the console's grounds
     are its own scoped tokens rather than anything computed style will report
     for a <text> node — so both sides are read explicitly. */
  const on = (sel, ground) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const st = getComputedStyle(e);
    const paint = st.fill && st.fill !== 'none' ? st.fill : st.color;
    const x = lum(rgb(paint)), y = lum(hex(ground));
    return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2));
  };
  return {
    'lane label on the console': on('.tgc-lanelabel', bg),
    'feed sub-line on its box': on('.tgc-feedsub', panel),
    'feed label on its box': on('.tgc-feedlabel', panel),
    'caption on the console': on('.tgc-cap', bg),
    'handoff sub-line': on('.tgc-hands', panel),
    'handoff title': on('.tgc-handt', panel),
    'bin word': on('.tgc-binword', panel),
    'console name': on('.tgc-name', bg),
    'clock': on('.tgc-clock', bg)
  };
});
const worst = Math.min(...Object.values(contrast).filter(v => v !== null));
ok('every word on the dark console clears 4.5:1', worst >= 4.5,
   Object.entries(contrast).map(([k, v]) => `${k} ${v}`).join(', '));

ok('no console errors while driving all three scenes', p.__errs.length === 0,
   p.__errs.slice(0, 3).join(' | '));
await p.context().close();

/* ---- 6. reduced motion: static, and still complete ---------------------- */
const rp = await open({ reducedMotion: 'reduce' });
const still = await rp.evaluate(async () => {
  const t = document.querySelector('.tgc');
  const none = e => getComputedStyle(e).animationName === 'none';
  /* the lanes stop travelling, but they must not empty: every item keeps the
     static place its delay put it at, and everything past the scoring bar
     keeps its channel colour */
  const items = [...t.querySelectorAll('.tgc-item')];
  const spread = new Set(items.map(i => i.style.transform)).size;
  const scored = [...t.querySelectorAll('.tgc-i-live')].filter(r => r.style.opacity === '1').length;
  const stopped = items.every(none) && [...t.querySelectorAll('.tgc-packet')].every(none);
  const packets = new Set([...t.querySelectorAll('.tgc-packet')].map(e => e.style.offsetDistance)).size;

  /* the counter is printed rather than run up to, and every state is still
     reachable because every state is a button */
  const pin = [...document.querySelectorAll('.pin.is-live')]
    .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes('cargo'));
  pin.click();
  await new Promise(r => setTimeout(r, 400));
  const scene = document.querySelector('.modal-body .scene');
  const count = scene.querySelector('.cco-count').textContent;
  const reached = [];
  for (const b of scene.querySelectorAll('.scene-step')) { b.click(); await new Promise(r => setTimeout(r, 40)); reached.push(scene.dataset.step); }
  const dots = scene.querySelectorAll('.cco-dot').length;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
  return { stopped, spread, scored, packets, count, dots, reached, total: window.demoData.beats.warehouse.leftPanel.chart.rows[0].to };
});
ok('reduced motion stops the console travelling', still.stopped);
ok('and the lanes are still full, end to end', still.spread === 4 && still.scored > 0,
   `${still.spread} distinct positions, ${still.scored} already scored`);
ok('and the feeds still stand spread along their runs', still.packets === 3, `${still.packets}`);
ok('reduced motion prints the figure instead of counting to it',
   still.count === String(still.total) && still.dots === still.total,
   `counter ${still.count}, ${still.dots} warehouses drawn of ${still.total}`);
ok('and every state is still reachable',
   JSON.stringify(still.reached) === JSON.stringify([...Array(8).keys()].map(String)),
   still.reached.join(','));
ok('no console errors under reduced motion', rp.__errs.length === 0, rp.__errs.slice(0, 3).join(' | '));
await rp.context().close();

/* ---- 7. every window the deck is shown at ------------------------------- */
const sizes = [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [1280, 1024]];
const sp = await open();
for (const [w, h] of sizes) {
  await sp.setViewportSize({ width: w, height: h });
  await sp.waitForTimeout(300);
  const fit = await sp.evaluate(async () => {
    const out = { page: null, modals: [] };
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
  ok(`the console fits the viewport at ${w}x${h}`, fit.page <= h - 8, `${fit.page} > ${h - 8}`);
  ok(`both scene panels fit the viewport at ${w}x${h}`,
     fit.modals.every(([, hh]) => hh <= h * 0.94), fit.modals.map(m => m.join(':')).join(' '));
  /* A panel in this deck is read whole, from a lectern. If it scrolls inside
     itself, part of the argument is below the fold on the projector. */
  ok(`and neither scrolls inside itself at ${w}x${h}`,
     fit.modals.every(([, , over]) => over <= 0), fit.modals.map(m => m[0] + ' ' + m[2] + 'px').join(', '));
  ok(`no horizontal overflow with the scenes at ${w}x${h}`, fit.overflow <= 0, `${fit.overflow}px`);
}
ok('no console errors across every window size', sp.__errs.length === 0, sp.__errs.slice(0, 3).join(' | '));
await sp.context().close();

await browser.close();
const fails = results.filter(r => r[0] === 'FAIL');
results.forEach(([s, n, d]) => console.log(`  [${s}] ${n}${d ? '  — ' + d : ''}`));
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
