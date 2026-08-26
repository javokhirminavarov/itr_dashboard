/* =========================================================================
   SceneCore — the little that the three pictures share.

   Each of the three is ONE STATIC DRAWING. There is no stepper, no rail, no
   tab, nothing to press: every capability is a labelled part of the picture
   and all of it is on screen at once. So this file is a registry and a
   handful of drawing helpers, and nothing else — it holds no state, binds no
   keys, and observes nothing.

   It is loaded BEFORE app.js, so the registry is populated by the time
   app.js's init() runs. It reaches into app.js through nothing: app.js hands
   each picture a HOST of its own private helpers at build time.
   ========================================================================= */
window.SceneCore = (function () {
  "use strict";

  var screens = {};       /* beat key  -> function (def, d, HOST) -> node   */
  var modals = {};        /* modal id  -> function (m, HOST)      -> node   */

  /* ---------------- tiny DOM helpers ----------------
     Deliberate copies of app.js's own: these files are parsed before app.js
     exists, so they cannot borrow its IIFE-private versions. */
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

  /* The plan's own caption: a chip on a leader, drawn in the SVG so it
     travels with the drawing. Same device as the corridor's building
     captions and the arrivals hall's station labels.

     IBM Plex Mono advances 0.6 em, so a chip is sized from the character
     count without measuring: 0.6 of the font-size plus the tracking. The two
     faces are 10px/0.1em -> 7.0 and 8.6px/0.06em -> 5.7, and
     tools/verify-scenes.mjs asserts no chip's text ever outgrows its box —
     a caption that overflows only shows up on the projector. */
  var ADV = 7.05, ADV_SUB = 5.8;
  function chip(parent, cx, cy, lines, cls) {
    var g = put(parent, "g", { "class": "scene-chip" + (cls ? " " + cls : "") });
    var h = lines.length * 15 + 10, w = 40, i;
    for (i = 0; i < lines.length; i++) {
      w = Math.max(w, lines[i].t.length *
        (lines[i].cls === "sc-chip-s" ? ADV_SUB : ADV) + 22);
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
     the same numbers as an sr-only table (app.js dataTable); a picture ships
     the same facts as an sr-only list, for the same reason — the drawing is
     the argument, and the words behind it are the proof nothing was dropped. */
  function srList(items, title, cls) {
    var wrap = el("div", "sr-only");
    if (title) wrap.appendChild(el("h3", null, title));
    var ul = el("ul", cls || "bullets");
    items.forEach(function (t) { ul.appendChild(el("li", null, t)); });
    wrap.appendChild(ul);
    return wrap;
  }

  return {
    screens: screens, modals: modals,
    registerScreen: function (k, fn) { screens[k] = fn; },
    registerModal: function (id, fn) { modals[id] = fn; },
    el: el, svgEl: svgEl, put: put, text: svgText,
    chip: chip, leader: leader, srList: srList, ADV: ADV
  };
})();
