/* =========================================================================
   E-Transit — the system as one corridor, read left to right.

   It used to be eight bullets. Eight bullets have no order, so a reader has
   to hold all eight and assemble the system themselves; an audience does not
   get the chance.

   A transit movement does have an order, and it is always the same: lodge,
   notify, pay, be assessed, cross, be watched, leave. So there is one
   drawing of that — entry post, inland route, exit post — with each bullet
   labelled where on it that thing happens. All of it is on screen at once;
   there is nothing to press.
   ========================================================================= */
(function () {
  "use strict";
  var S = window.SceneCore;

  var W = 1200, H = 420;
  var ROAD = { y: 236, half: 24 };
  var ENTRY = { x0: 190, x1: 330 }, EXIT = { x0: 900, x1: 1040 };

  S.registerModal("eTransit", function (m, HOST) {
    var T = window.SCENE_DATA.eTransit;
    var root = S.el("div", "etx");

    var head = S.el("div", "md-head");
    head.appendChild(HOST.icon(m.icon, "md-icon"));
    var ht = S.el("div");
    ht.appendChild(S.el("div", "md-tag", m.tag));
    ht.appendChild(S.el("h2", null, m.title));
    head.appendChild(ht);
    root.appendChild(head);

    var stage = S.el("div", "etx-stage scene-stage");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                               "aria-label": m.title + " — border to border" });
    stage.appendChild(svg);
    S.put(svg, "rect", { x: 0, y: 0, width: W, height: H, rx: 12, "class": "etx-ground" });

    /* ---- 1. the corridor, and the centre watching all of it ---- */
    var road = S.put(svg, "g", { "class": "etx-road-g" });
    S.put(road, "rect", { x: 0, y: ROAD.y - ROAD.half - 8, width: W, height: 8, "class": "etx-verge" });
    S.put(road, "rect", { x: 0, y: ROAD.y + ROAD.half, width: W, height: 8, "class": "etx-verge" });
    S.put(road, "rect", { x: 0, y: ROAD.y - ROAD.half, width: W, height: ROAD.half * 2,
                          "class": "etx-road" });
    S.put(road, "path", { d: "M 0 " + ROAD.y + " H " + W, "class": "etx-centre" });
    [[ENTRY, T.entry], [EXIT, T.exit]].forEach(function (pair) {
      var p = pair[0];
      S.put(road, "rect", { x: p.x0, y: 138, width: p.x1 - p.x0, height: 64, rx: 6, "class": "etx-built" });
      S.put(road, "rect", { x: p.x0, y: 272, width: p.x1 - p.x0, height: 48, rx: 6, "class": "etx-built" });
      S.put(road, "rect", { x: (p.x0 + p.x1) / 2 - 3, y: ROAD.y - ROAD.half - 10, width: 6,
                            height: ROAD.half * 2 + 20, rx: 2, "class": "etx-gantry" });
      S.text(road, (p.x0 + p.x1) / 2, 128, "etx-cap", pair[1], "middle");
    });
    S.text(road, (ENTRY.x1 + EXIT.x0) / 2, 128, "etx-cap", T.inland, "middle");
    /* the consignment: a tractor and semi-trailer in plan, the same object the
       corridor carries, turned to run left to right */
    var veh = S.put(road, "g", { "class": "etx-truck" });
    S.put(veh, "rect", { x: 560, y: ROAD.y - 11, width: 60, height: 22, rx: 2, "class": "etx-trailer" });
    S.put(veh, "rect", { x: 622, y: ROAD.y - 12, width: 24, height: 24, rx: 3, "class": "etx-cab" });
    /* centralised control rides the whole route, so it is drawn over all of it */
    var obs = S.put(svg, "g", { "class": "etx-obs" });
    S.put(obs, "path", { d: "M 60 62 H 1140", "class": "etx-obsline" });
    S.text(obs, 600, 52, "etx-cap etx-obst", T.observer, "middle");
    [190, 600, 1010].forEach(function (x) {
      S.put(obs, "path", { d: "M " + x + " 66 V 120", "class": "etx-tether" });
    });

    /* ---- 2. what happens before the barrier ---- */
    T.marks.slice(0, 2).forEach(function (mk, i) {
      var g = S.put(svg, "g", { "class": "etx-mark" });
      S.chip(g, 150 + i * 210, 348, [{ t: mk.t }, { t: mk.s, cls: "sc-chip-s" }], "etx-blue");
      S.leader(g, 150 + i * 210, 334, 260, ROAD.y + ROAD.half + 10);
    });
    /* one platform, one bar — never several silos */
    var bar = S.put(svg, "g", { "class": "etx-baru" });
    S.text(bar, 600, 96, "etx-cap", T.barTitle, "middle");

    /* ---- 3. the decision, the queue, and the way out ---- */
    var dec = S.put(svg, "g", { "class": "etx-mark" });
    S.chip(dec, 600, 348, [{ t: T.marks[2].t }, { t: T.marks[2].s, cls: "sc-chip-s" }], "etx-green");
    S.leader(dec, 600, 334, 330, ROAD.y + ROAD.half + 10);
    var q = S.put(svg, "g", { "class": "etx-queue" });
    S.chip(q, 96, 214, [{ t: T.queue.t }, { t: T.queue.s, cls: "sc-chip-s" }], "etx-amber");
    var sim = S.put(svg, "g", { "class": "etx-mark" });
    S.chip(sim, 1044, 348, [{ t: T.simple.t }, { t: T.simple.s, cls: "sc-chip-s" }], "etx-green");
    S.leader(sim, 1044, 334, 970, ROAD.y + ROAD.half + 10);

    root.appendChild(stage);

    /* The platform bar is HTML rather than drawing, so the two agencies the
       deck has not named can be awaiting-figure chips: an unfilled slot is
       the honest state of a claim, and a plausible invention is not. */
    var strip = S.el("div", "etx-strip");
    T.agencies.forEach(function (a) {
      var seg = S.el("span", "etx-seg");
      HOST.richText(seg, a);
      strip.appendChild(seg);
    });
    root.appendChild(strip);

    var foot = S.el("div", "etx-foot");
    var mw = S.el("div", "md-metric etx-metric");
    mw.appendChild(HOST.Metric(m.metric));
    foot.appendChild(mw);
    root.appendChild(foot);

    root.appendChild(S.srList([m.lead].concat(m.bullets), m.title, "bullets md-bullets"));
    return root;
  });
})();
