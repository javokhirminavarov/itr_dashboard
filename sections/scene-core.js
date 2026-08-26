/* =========================================================================
   SceneCore — the runtime the three interactive scenes are built on.

   A scene is one visual that a presenter drives. Its whole contract is a
   single rule:

       render(n) is a PURE function of the step index. It writes the
       COMPLETE state for step n. It is never a delta.

   Everything the deck needs falls out of that rule and out of nothing else:
   the same interaction gives the same frame every time; any state is
   reachable directly rather than by replaying the ones before it; the scene
   can be reset mid-sentence; and prefers-reduced-motion needs no second
   code path, because no state is ever "mid-animation" — the transitions are
   turned off in CSS and render(n) still writes every fact.

   This file registers itself on window and is loaded BEFORE app.js, so the
   registry is populated by the time app.js's init() runs. It reaches into
   app.js through nothing: app.js hands each scene a HOST of its own private
   helpers at build time, and the two lifecycle hooks below are both plain
   observations of the DOM app.js already maintains.
   ========================================================================= */
window.SceneCore = (function () {
  "use strict";

  var screens = {};       /* beat key  -> function (def, d, HOST) -> node   */
  var modals = {};        /* modal id  -> function (m, HOST)      -> node   */
  var active = null;      /* the mounted modal scene, or null              */

  var mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  function reduce() { return mqReduce.matches; }

  /* Each scene is one picture whose parts carry `data-at` — the stage they
     belong to. A step is that and nothing more: everything up to n is shown,
     everything after it is not. It is why render(n) can be a pure function of
     n, and why there is no second code path for reduced motion. */
  function reveal(root, n) {
    var parts = root.querySelectorAll("[data-at]"), i;
    for (i = 0; i < parts.length; i++) {
      parts[i].classList.toggle("is-on", +parts[i].getAttribute("data-at") <= n);
    }
  }

  /* ---------------- tiny DOM helpers ----------------
     Deliberate copies of app.js's own: the scene modules are parsed before
     app.js exists, so they cannot borrow its IIFE-private versions for the
     work they do at registration time. */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(name, attrs) {
    var n = document.createElementNS(SVGNS, name), k;
    if (attrs) for (k in attrs) if (attrs.hasOwnProperty(k) && attrs[k] !== null && attrs[k] !== undefined) {
      n.setAttribute(k === "className" ? "class" : k, attrs[k]);
    }
    return n;
  }
  function put(parent, name, attrs) { var n = svgEl(name, attrs); parent.appendChild(n); return n; }
  function svgText(parent, x, y, cls, s, anchor) {
    var t = put(parent, "text", { x: x, y: y, "class": cls, "text-anchor": anchor || "start" });
    t.textContent = s;
    return t;
  }
  /* The plan's own caption: a chip on a leader, drawn in the SVG so it travels
     with the drawing. Same device as PassengerSchema's chip()/leader(). IBM
     Plex Mono is fixed-advance, so the chip is sized from the character count
     without measuring. */
  /* IBM Plex Mono advances 0.6 em, so a chip is sized from the character count
     without measuring: 0.6 of the font-size plus the tracking. The two faces
     the chip uses are 10px/0.1em -> 7.0 and 8.6px/0.06em -> 5.7, and
     tools/verify-scenes.mjs asserts that no chip's text ever outgrows its box,
     because a caption that overflows only shows up on the projector. */
  var ADV = 7.05, ADV_SUB = 5.8;
  function chip(parent, cx, cy, lines, cls) {
    var g = put(parent, "g", { "class": "scene-chip" + (cls ? " " + cls : "") });
    var h = lines.length * 15 + 10, w = 40, i;
    for (i = 0; i < lines.length; i++) {
      w = Math.max(w, lines[i].t.length *
        (lines[i].adv || (lines[i].cls === "sc-chip-s" ? ADV_SUB : ADV)) + 22);
    }
    put(g, "rect", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 5, "class": "sc-chip-box" });
    for (i = 0; i < lines.length; i++) {
      svgText(g, cx, cy - h / 2 + 15 * (i + 1), lines[i].cls || "sc-chip-t", lines[i].t, "middle");
    }
    g.__w = w; g.__h = h;
    return g;
  }
  function leader(parent, sx, sy, tx, ty, cls) {
    put(parent, "path", { d: "M " + sx + " " + sy + " L " + tx + " " + ty,
                          "class": "sc-leader" + (cls ? " " + cls : "") });
    put(parent, "circle", { cx: tx, cy: ty, r: 2.4, "class": "sc-leader-dot" + (cls ? " " + cls : "") });
  }
  /* A visually-hidden text equivalent. Every chart in this deck already ships
     the same numbers as an sr-only table (app.js dataTable); a scene ships the
     same facts as an sr-only list, for the same reason — the drawing is the
     argument, and the words behind it are the proof nothing was dropped. */
  function srList(items, title, cls) {
    var wrap = el("div", "sr-only");
    if (title) wrap.appendChild(el("h3", null, title));
    var ul = el("ul", cls || "bullets");
    items.forEach(function (t) { ul.appendChild(el("li", null, t)); });
    wrap.appendChild(ul);
    return wrap;
  }

  /* ---------------- the step machine ---------------- */
  /* opts: { root, steps:[{label, say}], render(n), keys:"local"|"modal",
             railLabel, onStop } */
  function machine(opts) {
    var root = opts.root, steps = opts.steps, render = opts.render;
    var idx = 0, btns = [], ctl;

    root.classList.add("scene");

    var rail = el("div", "scene-rail");
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", opts.railLabel || "Scene steps");
    steps.forEach(function (s, i) {
      var b = el("button", "scene-step");
      b.type = "button";
      b.appendChild(el("span", "ss-n", String(i + 1)));
      b.appendChild(el("span", "ss-t", s.label));
      b.setAttribute("aria-pressed", "false");
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener("click", function () { ctl.setStep(i, true); });
      btns.push(b);
      rail.appendChild(b);
    });

    var readout = el("div", "scene-readout");
    readout.setAttribute("aria-live", "polite");

    ctl = {
      root: root,
      rail: rail,
      readout: readout,
      count: steps.length,
      step: function () { return idx; },
      setStep: function (n, focusIt) {
        n = n < 0 ? 0 : n > steps.length - 1 ? steps.length - 1 : n;
        idx = n;
        root.dataset.step = String(n);
        btns.forEach(function (b, i) {
          b.classList.toggle("is-on", i === n);
          b.setAttribute("aria-pressed", i === n ? "true" : "false");
          b.tabIndex = i === n ? 0 : -1;
        });
        readout.textContent = (n + 1) + " / " + steps.length + " · " + (steps[n].say || steps[n].label);
        render(n);
        if (focusIt && btns[n]) btns[n].focus();
      },
      next: function () { ctl.setStep(idx + 1, true); },
      prev: function () { ctl.setStep(idx - 1, true); },
      reset: function () { ctl.setStep(0, false); },
      /* Returns true when the key belonged to the scene. Anything it does not
         claim keeps its page-wide meaning. */
      handleKey: function (code, shift) {
        var digit = /^(Digit|Numpad)([0-9])$/.exec(code);
        if (digit) {
          var want = +digit[2] - 1;
          if (want < 0 || want >= steps.length) return false;
          ctl.setStep(want, true);
          return true;
        }
        if (code === "ArrowRight") { ctl.next(); return true; }
        if (code === "ArrowLeft") { ctl.prev(); return true; }
        if (opts.keys !== "modal") return false;
        /* Only a modal scene owns the whole keyboard: it is the only thing on
           screen. In the page, Up/Down/Home/End/Space/R keep moving the deck,
           so a presenter can always leave the scene the way they arrived. */
        if (code === "ArrowDown") { ctl.next(); return true; }
        if (code === "ArrowUp") { ctl.prev(); return true; }
        if (code === "Space") { shift ? ctl.prev() : ctl.next(); return true; }
        if (code === "Home") { ctl.setStep(0, true); return true; }
        if (code === "End") { ctl.setStep(steps.length - 1, true); return true; }
        if (code === "KeyR") { ctl.setStep(0, true); return true; }
        return false;
      },
      focusRail: function () { if (btns[idx]) btns[idx].focus(); },
      stop: function () { if (opts.onStop) opts.onStop(); }
    };

    root.__scene = ctl;

    /* A scene in the page listens on its own root, in the bubble phase, so it
       only ever sees keys pressed while the presenter is actually inside it.
       Keys dispatched at window — which is how the page is driven from the
       lectern, and how tools/verify.mjs drives it — never reach here. */
    if (opts.keys !== "modal") {
      root.addEventListener("keydown", function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!ctl.handleKey(e.code, e.shiftKey)) return;
        e.preventDefault();
        e.stopPropagation();
      });
    }
    return ctl;
  }

  /* ---------------- lifecycle, observed rather than wired ----------------
     app.js already writes document.body.dataset.view on every open and close,
     and already strips and re-adds `is-in` on a beat when the presenter
     presses R. Both are watched here, so the engine needs no hook: the scenes
     could be deleted from the repo and app.js would not notice. */
  var mo = new MutationObserver(function () {
    var view = document.body.dataset.view, node;
    if (view === "modal") {
      node = document.getElementById("modal").querySelector(".scene");
      active = node && node.__scene ? node.__scene : null;
      if (active) { active.setStep(0, false); active.focusRail(); }
    } else if (active) {
      active.stop();
      active = null;
    }
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ["data-view"] });

  /* app.js binds keydown on window in the BUBBLE phase. This binds in CAPTURE,
     so it is offered every key first and can stop the ones a modal scene owns
     from ever reaching the deck. With no modal scene mounted it returns on the
     first line, which is why the page's own navigation is untouched. */
  addEventListener("keydown", function (e) {
    if (!active) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === "Escape" || e.code === "Tab") return;   /* app.js closes; the browser tabs */
    /* A scene can carry controls of its own — the button that changes the
       record in the warehouse operator's pane is one. Space and Enter belong
       to whatever is focused, always: taking Space off a focused button to
       advance a step would leave that button operable by mouse only. */
    if ((e.code === "Space" || e.code === "Enter") && document.activeElement &&
        document.activeElement.tagName === "BUTTON") return;
    if (!active.handleKey(e.code, e.shiftKey)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* app.js marks a beat `is-in` when it comes within one beat of the reader,
     and `R` at the lectern replays the current beat by stripping that class
     and putting it straight back. Both are just class changes on a node, so
     both are watched rather than wired: a scene resets on replay, and a scene
     that runs something continuously only runs it while its beat is near. */
  function watchClass(node, cls, fn) {
    var was = node.classList.contains(cls);
    fn(was);
    new MutationObserver(function () {
      var now = node.classList.contains(cls);
      if (now === was) return;
      was = now;
      fn(now);
    }).observe(node, { attributes: true, attributeFilter: ["class"] });
  }
  function onReplay(section, fn) {
    var was = section.classList.contains("is-in");
    new MutationObserver(function () {
      var now = section.classList.contains("is-in");
      if (now && !was) fn();
      was = now;
    }).observe(section, { attributes: true, attributeFilter: ["class"] });
  }

  return {
    screens: screens, modals: modals,
    registerScreen: function (k, fn) { screens[k] = fn; },
    registerModal: function (id, fn) { modals[id] = fn; },
    machine: machine, onReplay: onReplay, watchClass: watchClass,
    reduce: reduce, reveal: reveal,
    el: el, svgEl: svgEl, put: put, text: svgText, chip: chip, leader: leader,
    srList: srList, ADV: ADV
  };
})();
