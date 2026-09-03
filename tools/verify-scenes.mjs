/*
 * Verification suite for the four pictures.
 *
 * tools/verify.mjs guards the deck: the corridor, the ten beats, the
 * contracts, the contrast, no network after load. This guards what a picture
 * can get wrong that a bullet list could not.
 *
 *   1. It can drop a fact. A bullet list is its own inventory; a drawing is
 *      not, so every sentence demo-data.js still holds is checked to be
 *      reachable, verbatim, in the picture that replaced it.
 *   2. It can hide something. These are static drawings with nothing to
 *      press, so every part must be on screen and legible from the moment
 *      the picture appears — nothing behind a control, a hover, or a fade.
 *   3. It can outgrow itself. A caption that overflows its chip or a label
 *      that has walked off the edge of the drawing is invisible in code
 *      review and unmissable on a projector.
 *
 * Usage (same as tools/verify.mjs):
 *   npx --no-install http-server -p 8099 -s .
 *   node tools/verify-scenes.mjs [http://127.0.0.1:8099/index.html]
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

const HTTP = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const PANELS = [['eTransit', 'e-transit'], ['ccoIS', 'cargo']];
const results = [];
const ok = (n, c, d = '') => results.push([c ? 'PASS' : 'FAIL', n, d]);

/* ---- 0. the source rules, checked in the source ------------------------- */
/* The pictures are loaded by a page with no build step, straight into
   whatever the projector's browser is, alongside 1991 lines of ES5. They are
   held to the same dialect. And Math.random() cannot appear: an unrepeatable
   frame in front of an audience is the one failure that cannot be fixed
   live. */
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
  ok('picture sources are ES5 and carry no randomness', bad.length === 0, bad.join('; '));

  /* Every rule in sections/*.css must be scoped to a picture. This is the
     whole isolation guarantee: styles.css is untouched, and nothing these
     files add can reach a surface that is not one of the three. */
  const cssBad = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.css'))) {
    readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').forEach((line, i) => {
        const m = /^([^@\s/][^{]*)\{/.exec(line);
    if (m && !/^\s*\.(scene|tgc|etx|cco|air|sc-)/.test(m[1])) cssBad.push(`${f}:${i + 1} ${m[1].trim()}`);
      });
  }
  ok('every picture CSS rule is scoped to a picture', cssBad.length === 0, cssBad.join(' | '));
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
  await p.waitForTimeout(400);
  return p;
}
/* The page's CSP forbids unsafe-eval, and rightly: nothing in this repo may
   evaluate a string as script. So every probe below is a real function handed
   to page.evaluate, never a string assembled here. */
async function panel(p, label, fn, arg) {
  await p.evaluate(async (label) => {
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
    pin.click();
    await new Promise(r => setTimeout(r, 420));
  }, label);
  const out = await p.evaluate(fn, arg);
  await p.evaluate(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
  });
  return out;
}

/* the three probes the pictures are measured with, written once */
const HIDDEN = (root) => {
  const bad = [];
  document.querySelectorAll(root + ' svg *').forEach(n => {
    const st = getComputedStyle(n);
    if (+st.opacity === 0 || st.display === 'none' || st.visibility === 'hidden') {
      bad.push(n.tagName + '.' + (n.getAttribute('class') || '?'));
    }
  });
  return [...new Set(bad)];
};
const PROSE = (root) => {
  const host = document.querySelector(root), prose = [];
  host.querySelectorAll('p, ul, ol').forEach(n => {
    if (n.closest('.sr-only')) return;                    /* the text equivalent */
    if (!n.textContent.trim()) return;
    if (getComputedStyle(n).display === 'none') return;
    prose.push(n.tagName + '.' + (n.className || '?'));
  });
  return { prose, controls: host.querySelectorAll('button, [role="tab"], input, select').length };
};
const GEOM = (sel) => {
  const svg = document.querySelector(sel);
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
/* Contrast: SVG text is painted with `fill`, not `color`, and the pictures
   sit on the deck's own white panel, so white is the ground. */
const CONTRAST = (sels) => {
  const lum = c => { const v = c.map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const out = {};
  for (const k of Object.keys(sels)) {
    const e = document.querySelector(sels[k]);
    if (!e) { out[k] = null; continue; }
    const st = getComputedStyle(e);
    out[k] = +((1.05 / (lum(rgb(st.fill && st.fill !== 'none' ? st.fill : st.color)) + 0.05)).toFixed(2));
  }
  return out;
};

const p = await open();

/* ---- 1. every fact survived -------------------------------------------- */
/* The three surfaces used to be a lead sentence and a list of bullets. Those
   sentences are still in demo-data.js and are still the deck's own words, so
   the test is that each one is still reachable in the picture that replaced
   it — drawn on it, or in the text equivalent it ships. */
{
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const tgt = await p.evaluate(() => {
    const D = window.demoData.beats.targeting;
    return { text: document.getElementById('beat-targeting').textContent,
             want: D.functions.map(f => f.title + ' — ' + f.text)
               .concat([D.monitoring.title], D.monitoring.modes.map(m => m.label)) };
  });
  ok('every fact from the targeting bullets survived',
     tgt.want.every(s => norm(tgt.text).includes(norm(s))),
     tgt.want.filter(s => !norm(tgt.text).includes(norm(s))).map(s => s.slice(0, 44)).join('; '));

  const ai = await p.evaluate(() => {
    const D = window.demoData.aiRisk;
    return { text: document.getElementById('beat-aiRisk').textContent,
      want: D.capabilities.flatMap(c => [c.title, c.action, c.maturity, c.source]).concat([D.oversight]) };
  });
  ok('every AI capability carries its action, maturity and source',
     ai.want.every(s => norm(ai.text).includes(norm(s))),
     ai.want.filter(s => !norm(ai.text).includes(norm(s))).join('; '));
  ok('the AI beat states that authorized officers make customs decisions',
     norm(ai.text).includes('authorized officers make customs decisions'), 'oversight wording missing');

  for (const [key, label] of PANELS) {
    const r = await panel(p, label, (key) => {
      const m = window.demoData.meta.modals[key];
      return { text: document.querySelector('.modal-body').textContent,
               want: [m.lead].concat(m.bullets) };
    }, key);
    ok(`every fact from the ${key} bullets survived`,
       r.want.every(s => norm(r.text).includes(norm(s))),
       r.want.filter(s => !norm(r.text).includes(norm(s))).map(s => s.slice(0, 44)).join('; '));
  }
}

/* ---- 2. it is a drawing, not a list, and not a control panel ------------
   No bullet list and no paragraph on screen; and, since these are static
   pictures, nothing to press either — no rail, no tab, no pill, no button
   standing between the audience and a fact. */
{
  const tgt = await p.evaluate(PROSE, '.tgc');
  ok('no visible bullet list or paragraph left in targeting', tgt.prose.length === 0, tgt.prose.join(', '));
  ok('and nothing to press on the targeting picture', tgt.controls === 0, `${tgt.controls} controls`);
  for (const [key, label] of PANELS) {
    const r = await panel(p, label, PROSE, '.modal-body');
    ok(`no visible bullet list or paragraph left in ${key}`, r.prose.length === 0, r.prose.join(', '));
    ok(`and nothing to press on the ${key} picture`, r.controls === 0, `${r.controls} controls`);
  }
}

/* ---- 3. all of it is on screen, from the moment it appears ---------------
   A static picture earns its keep only if the whole picture is there. Nothing
   may sit at zero opacity, be display:none, or be sized away. */
{
  const t = await p.evaluate(HIDDEN, '.tgc-stage');
  ok('the whole targeting picture is on screen at once', t.length === 0, t.join(', '));
  const ai = await p.evaluate(HIDDEN, '.air-stage');
  ok('the whole AI risk picture is on screen at once', ai.length === 0, ai.join(', '));
  for (const [key, label] of PANELS) {
    const r = await panel(p, label, HIDDEN, '.modal-body');
    ok(`the whole ${key} picture is on screen at once`, r.length === 0, r.join(', '));
  }
}

/* ---- 4. nothing drawn has outgrown what it is drawn in ------------------ */
{
  const t = await p.evaluate(GEOM, '.tgc-stage svg');
  ok('targeting: nothing is drawn outside the drawing', t.over.length === 0, t.over.join(', '));
  ok('targeting: no caption outgrows its chip', t.chips.length === 0, t.chips.join(', '));
  const ai = await p.evaluate(GEOM, '.air-stage svg');
  ok('AI risk: nothing is drawn outside the drawing', ai.over.length === 0, ai.over.join(', '));
  for (const [key, label] of PANELS) {
    const r = await panel(p, label, GEOM, '.modal-body .scene-stage svg');
    ok(`${key}: nothing is drawn outside the drawing`, r.over.length === 0, r.over.join(', '));
    ok(`${key}: no caption outgrows its chip`, r.chips.length === 0, r.chips.join(', '));
  }
}

/* ---- 5. the deck still owns the keyboard -------------------------------- */
/* The pictures bind nothing, so the lectern keys must behave exactly as they
   did before them: the arrows still walk the beats, and Escape still closes a
   marker and puts the focus back on it. */
{
  const nav = await p.evaluate(async () => {
    const press = async code => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      await new Promise(r => setTimeout(r, 1300));
    };
    await press('Digit2');
    const at = document.body.dataset.beat;
    await press('ArrowDown');
    const next = document.body.dataset.beat;
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes('e-transit'));
    pin.click();
    await new Promise(r => setTimeout(r, 350));
    const opened = document.getElementById('modal').classList.contains('is-open');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 350));
    return { at, next, opened,
             closed: !document.getElementById('modal').classList.contains('is-open'),
             refocused: document.activeElement === pin };
  });
  ok('the arrow keys still walk the deck past the targeting picture',
     nav.at === 'targeting' && nav.next === 'baseline2018', `${nav.at} → ${nav.next}`);
  ok('a marker still opens its picture, and escape still closes it',
     nav.opened && nav.closed && nav.refocused,
     `opened ${nav.opened}, closed ${nav.closed}, refocused ${nav.refocused}`);
}

/* ---- 6. the smallest type on each picture, against what it sits on ------ */
{
  const out = await p.evaluate(CONTRAST, { 'targeting sub-label': '.tgc-s', 'targeting label': '.tgc-t',
                                           'targeting caption': '.tgc-cap', 'channel label': '.tgc-modet' });
  Object.assign(out, await panel(p, 'e-transit', CONTRAST,
    { 'e-transit caption': '.modal-body .etx-cap', 'chip sub-line': '.modal-body .sc-chip-s' }));
  Object.assign(out, await panel(p, 'cargo', CONTRAST,
    { 'warehouse sub-label': '.modal-body .cco-s', 'flow station': '.modal-body .cco-stt',
      'axis year': '.modal-body .cco-ayear' }));
  const worst = Math.min(...Object.values(out).filter(v => v !== null));
  ok('the smallest type on every picture clears 4.5:1', worst >= 4.5,
     Object.entries(out).map(([k, v]) => `${k} ${v}`).join(', '));
}

ok('no console errors while opening all four pictures', p.__errs.length === 0,
   p.__errs.slice(0, 3).join(' | '));
await p.context().close();

/* ---- 7. reduced motion -------------------------------------------------
   There is nothing to switch off: a static drawing has no animation and no
   transition, so under prefers-reduced-motion it must be byte-for-byte the
   same picture it is without it. */
{
  const rp = await open({ reducedMotion: 'reduce' });
  const still = await rp.evaluate(async () => {
    const moving = root => [...root.querySelectorAll('*')].filter(e => {
      const st = getComputedStyle(e);
      return st.animationName !== 'none' ||
             (st.transitionProperty !== 'none' && st.transitionProperty !== 'all' && parseFloat(st.transitionDuration) > 0);
    }).length;
    const t = moving(document.querySelector('.tgc-stage'));
    const pin = [...document.querySelectorAll('.pin.is-live')]
      .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes('cargo'));
    pin.click();
    await new Promise(r => setTimeout(r, 400));
    const c = moving(document.querySelector('.modal-body'));
    const parts = document.querySelectorAll('.modal-body svg *').length;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    return { t, c, parts };
  });
  ok('nothing in a picture animates or transitions at all', still.t === 0 && still.c === 0,
     `${still.t} in the page, ${still.c} in a panel`);
  ok('and the drawing is complete under reduced motion', still.parts > 40, `${still.parts} parts drawn`);
  ok('no console errors under reduced motion', rp.__errs.length === 0, rp.__errs.slice(0, 3).join(' | '));
  await rp.context().close();
}

/* ---- 8. every window the deck is shown at ------------------------------- */
{
  const sp = await open();
  for (const [w, h] of [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [1280, 1024]]) {
    await sp.setViewportSize({ width: w, height: h });
    await sp.waitForTimeout(320);
    const fit = await sp.evaluate(async () => {
      const out = { modals: [] };
      const sectionHeight = id => {
        const kids = [...document.getElementById(id).children].map(c => c.getBoundingClientRect());
        return Math.round(Math.max(...kids.map(k => k.bottom)) - Math.min(...kids.map(k => k.top)));
      };
      out.page = sectionHeight('beat-targeting');
      out.ai = sectionHeight('beat-aiRisk');
      for (const label of ['e-transit', 'cargo']) {
        const pin = [...document.querySelectorAll('.pin.is-live')]
          .find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes(label));
        pin.click();
        await new Promise(r => setTimeout(r, 330));
        const b = document.querySelector('.modal-body');
        out.modals.push([label, Math.round(b.getBoundingClientRect().height), b.scrollHeight - b.clientHeight]);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 270));
      }
      out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return out;
    });
    ok(`the targeting picture fits the viewport at ${w}x${h}`, fit.page <= h - 8, `${fit.page} > ${h - 8}`);
    ok(`the AI risk picture fits the viewport at ${w}x${h}`, fit.ai <= h - 8, `${fit.ai} > ${h - 8}`);
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
}

await browser.close();
const fails = results.filter(r => r[0] === 'FAIL');
results.forEach(([s, n, d]) => console.log(`  [${s}] ${n}${d ? '  — ' + d : ''}`));
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
