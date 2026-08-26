/* =========================================================================
   Section 2 — the targeting centre, as one picture.

   It used to be eight cards with a paragraph each: the eight things the
   centre does, written down. A reader takes one of the eight; an audience
   takes none of them.

   So it is one drawing instead — what comes in on the left, the centre in
   the middle with the six channels it watches under it, what comes out on
   the right. Every one of the eight is a labelled part of that drawing
   rather than a sentence about it, and all of it is on screen at once:
   there is nothing to press and nothing to wait for.
   ========================================================================= */
(function () {
  "use strict";
  var S = window.SceneCore;

  var W = 1200, H = 470;
  var HUB = { x: 430, y: 132, w: 340, h: 128 };
  var IN = { x: 34, w: 268, ys: [76, 172, 268] };
  var OUT = { x: 900, w: 266 };
  var CHAN = { y: 372, x: 210, w: 780 };

  S.registerScreen("targeting", function (def, d, HOST) {
    var T = window.SCENE_DATA.targeting;
    var modes = d.monitoring.modes;
    var sec = HOST.screenShell(def, d, "sc-target");

    var root = S.el("div", "tgc");

    var stage = S.el("div", "tgc-stage scene-stage");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                               "aria-label": d.headline + " " + d.monitoring.title });
    stage.appendChild(svg);

    /* a labelled box — the one shape the whole drawing is built from */
    function box(x, y, w, h, cls, title, sub) {
      var g = S.put(svg, "g", { "class": "tgc-b " + cls });
      S.put(g, "rect", { x: x, y: y, width: w, height: h, rx: 10 });
      S.text(g, x + 16, y + (sub ? h / 2 - 2 : h / 2 + 5), "tgc-t", title);
      if (sub) S.text(g, x + 16, y + h / 2 + 16, "tgc-s", sub);
      return g;
    }
    function arrow(x0, y0, x1, y1) {
      var g = S.put(svg, "g", { "class": "tgc-arrow" });
      S.put(g, "path", { d: "M " + x0 + " " + y0 + " C " + ((x0 + x1) / 2) + " " + y0 +
                            " " + ((x0 + x1) / 2) + " " + y1 + " " + x1 + " " + y1 });
      S.put(g, "path", { d: "M " + (x1 - 7) + " " + (y1 - 4) + " L " + x1 + " " + y1 +
                            " L " + (x1 - 7) + " " + (y1 + 4), "class": "tgc-head" });
      return g;
    }

    /* ---- 1. the centre, and the six channels it watches at once ---- */
    var hub = S.put(svg, "g", { "class": "tgc-hub" });
    S.put(hub, "rect", { x: HUB.x, y: HUB.y, width: HUB.w, height: HUB.h, rx: 14 });
    S.text(hub, HUB.x + HUB.w / 2, HUB.y + 52, "tgc-hubt", d.hub.title, "middle");
    S.text(hub, HUB.x + HUB.w / 2, HUB.y + 74, "tgc-hubs", d.hub.sub, "middle");
    var badge = S.put(hub, "g", { "class": "tgc-open" });
    S.put(badge, "rect", { x: HUB.x + HUB.w / 2 - 46, y: HUB.y + 88, width: 92, height: 24, rx: 12 });
    S.text(badge, HUB.x + HUB.w / 2, HUB.y + 105, "tgc-opent", T.open + " · " + T.openSub, "middle");

    var chan = S.put(svg, "g", { "class": "tgc-chan" });
    S.text(chan, CHAN.x, CHAN.y - 16, "tgc-cap", d.monitoring.title.toUpperCase());
    S.put(chan, "path", { d: "M " + (HUB.x + HUB.w / 2) + " " + (HUB.y + HUB.h) +
                             " V " + (CHAN.y - 6), "class": "tgc-drop" });
    modes.forEach(function (m, i) {
      var cw = CHAN.w / modes.length, cx = CHAN.x + i * cw;
      var g = S.put(chan, "g", { "class": "tgc-mode" });
      S.put(g, "rect", { x: cx + 4, y: CHAN.y, width: cw - 8, height: 58, rx: 9 });
      var ic = S.put(g, "path", { d: HOST.iconPath(m.icon), "class": "tgc-icon",
        transform: "translate(" + (cx + cw / 2 - 11) + " " + (CHAN.y + 10) + ") scale(0.92)" });
      ic.setAttribute("vector-effect", "non-scaling-stroke");
      S.text(g, cx + cw / 2, CHAN.y + 50, "tgc-modet", m.label.toUpperCase(), "middle");
    });

    /* ---- 2. what comes in ---- */
    S.text(S.put(svg, "g", { "class": "tgc-g" }), IN.x, 44, "tgc-cap", T.feedsTitle);
    T.feeds.forEach(function (f, i) {
      box(IN.x, IN.ys[i], IN.w, 66, "tgc-in", f.t, f.s);
      arrow(IN.x + IN.w, IN.ys[i] + 33, HUB.x - 8, HUB.y + HUB.h / 2);
    });

    /* ---- 3. what comes out ---- */
    S.text(S.put(svg, "g", { "class": "tgc-g" }), OUT.x, 44, "tgc-cap", T.outTitle);
    var chG = S.put(svg, "g", { "class": "tgc-chips" });
    /* the channel words are a page law — green, yellow, red, nothing else */
    ["green", "yellow", "red"].forEach(function (name, i) {
      var g = S.put(chG, "g", { "class": "tgc-ch ch-" + name });
      S.put(g, "rect", { x: OUT.x + i * 90, y: 62, width: 82, height: 30, rx: 15 });
      S.text(g, OUT.x + i * 90 + 41, 82, "tgc-cht", name.toUpperCase(), "middle");
    });
    arrow(HUB.x + HUB.w + 8, HUB.y + HUB.h / 2, OUT.x - 8, 77);
    box(OUT.x, 118, OUT.w, 62, "tgc-extra", T.extras[0].t, T.extras[0].s);
    box(OUT.x, 192, OUT.w, 62, "tgc-extra", T.extras[1].t, T.extras[1].s);
    arrow(HUB.x + HUB.w + 8, HUB.y + HUB.h / 2, OUT.x - 8, 223);
    box(OUT.x, 278, OUT.w, 66, "tgc-hand", T.handoff.t, T.handoff.s);
    arrow(OUT.x + 40, 254, OUT.x + 40, 274);

    root.appendChild(stage);
    sec.appendChild(HOST.fx(root, 2));

    /* the eight functions and the six channels, in the words demo-data.js
       still holds them in — the proof that redrawing them lost nothing */
    sec.appendChild(S.srList(
      d.functions.map(function (f) { return f.title + " — " + f.text; })
        .concat([d.monitoring.title + ": " +
                 modes.map(function (m) { return m.label; }).join(", ")]),
      d.headline));

    return sec;
  });
})();
