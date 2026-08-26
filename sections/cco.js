/* =========================================================================
   Customs and cargo operations — one platform over many warehouses, and
   three parties reading one record.

   Six bullets used to say it. Two of the six are the whole claim and the
   other four fall out of them, which a list cannot show and a picture can:
   many warehouses become one platform, and three parties read one record.
   The consignment's own flow runs along the foot, with the risk management
   system as the fork in it. All of it is on screen at once; there is nothing
   to press.

   Every figure is read live out of window.demoData — 430 and the officer
   attendance split are section 4's own numbers. Nothing here invents one,
   and nothing here mutates one: demoData arrays are section 4's arrays too,
   so they are read by index and never sorted in place.
   ========================================================================= */
(function () {
  "use strict";
  var S = window.SceneCore;

  var W = 1200, H = 480;
  var GRID = { x: 40, y: 96, cols: 6, rows: 4, dx: 40, dy: 40 };
  var SLAB = { x: 330, y: 128, w: 220, h: 104 };
  var REC = { x: 620, y: 96, w: 210, h: 150 };
  var PARTY = { x: 880, w: 280, ys: [96, 176, 256] };
  var FLOW = { y: 400, xs: [110, 400, 700, 990] };

  S.registerModal("ccoIS", function (m, HOST) {
    var T = window.SCENE_DATA.ccoIS, D = HOST.data;
    var wh = D.beats.warehouse;
    /* Read by index. These arrays are section 4's arrays: an in-place sort or
       reverse here would silently reorder a chart in another section. */
    var TOTAL = wh.leftPanel.chart.rows[0].to;            /* 430            */
    var attended = wh.rightPanel.share.parts[0];          /* 28, officer    */
    var remote = wh.rightPanel.share.parts[1];            /* 72, remote     */
    var range = wh.rightPanel.share.range;                /* 2025           */

    var root = S.el("div", "cco");
    var head = S.el("div", "md-head");
    head.appendChild(HOST.icon(m.icon, "md-icon"));
    var ht = S.el("div");
    ht.appendChild(S.el("div", "md-tag", m.tag));
    ht.appendChild(S.el("h2", null, m.title));
    head.appendChild(ht);
    root.appendChild(head);

    var stage = S.el("div", "cco-stage scene-stage");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                               "aria-label": m.title });
    stage.appendChild(svg);

    function box(x, y, w, h, cls, title, sub) {
      var g = S.put(svg, "g", { "class": "cco-b " + cls });
      S.put(g, "rect", { x: x, y: y, width: w, height: h, rx: 10 });
      S.text(g, x + 16, y + (sub ? h / 2 - 2 : h / 2 + 5), "cco-t", title);
      if (sub) S.text(g, x + 16, y + h / 2 + 16, "cco-s", sub);
      return g;
    }
    function arrow(x0, y0, x1, y1, cls) {
      var g = S.put(svg, "g", { "class": "cco-arrow " + (cls || "") });
      S.put(g, "path", { d: "M " + x0 + " " + y0 + " C " + ((x0 + x1) / 2) + " " + y0 +
                            " " + ((x0 + x1) / 2) + " " + y1 + " " + x1 + " " + y1 });
      S.put(g, "path", { d: "M " + (x1 - 7) + " " + (y1 - 4) + " L " + x1 + " " + y1 +
                            " L " + (x1 - 7) + " " + (y1 + 4), "class": "cco-head" });
      return g;
    }

    /* ---- 1. many warehouses, one platform ---- */
    var many = S.put(svg, "g", { "class": "cco-many" });
    S.text(many, GRID.x, 64, "cco-cap", T.manyTitle);
    var r, c;
    for (r = 0; r < GRID.rows; r++) {
      for (c = 0; c < GRID.cols; c++) {
        S.put(many, "path", { d: HOST.iconPath("warehouse"), "class": "cco-wh",
          transform: "translate(" + (GRID.x + c * GRID.dx) + " " + (GRID.y + r * GRID.dy) +
                     ") scale(1.05)" }).setAttribute("vector-effect", "non-scaling-stroke");
      }
    }
    /* the figure is the point, so it is printed — and it is demoData's own */
    S.text(many, GRID.x, GRID.y + GRID.rows * GRID.dy + 34, "cco-big", "≈" + TOTAL);
    S.text(many, GRID.x + 84, GRID.y + GRID.rows * GRID.dy + 34, "cco-s",
           wh.leftPanel.chart.rows[0].name.toLowerCase());
    arrow(GRID.x + GRID.cols * GRID.dx + 8, SLAB.y + SLAB.h / 2, SLAB.x - 8, SLAB.y + SLAB.h / 2);
    var slab = S.put(svg, "g", { "class": "cco-slab" });
    S.put(slab, "rect", { x: SLAB.x, y: SLAB.y, width: SLAB.w, height: SLAB.h, rx: 12 });
    S.text(slab, SLAB.x + SLAB.w / 2, SLAB.y + 58, "cco-slabt", T.platform, "middle");

    /* ---- 2. three parties, one record ---- */
    var rec = box(REC.x, REC.y, REC.w, REC.h, "cco-rec", T.recordTitle, null);
    S.text(rec, REC.x + REC.w / 2, REC.y + REC.h - 24, "cco-s", T.sameNote, "middle");
    arrow(SLAB.x + SLAB.w + 8, SLAB.y + SLAB.h / 2, REC.x - 8, REC.y + REC.h / 2);
    T.parties.forEach(function (p, i) {
      box(PARTY.x, PARTY.ys[i], PARTY.w, 62, "cco-party", p.t, p.s);
      arrow(PARTY.x - 8, PARTY.ys[i] + 31, REC.x + REC.w + 8, REC.y + REC.h / 2, "cco-back");
    });

    /* ---- 3. one consignment, arrival to release ---- */
    var flow = S.put(svg, "g", { "class": "cco-flow" });
    S.text(flow, FLOW.xs[0] - 60, FLOW.y - 44, "cco-cap", T.flowNote);
    S.put(flow, "path", { d: "M " + FLOW.xs[0] + " " + FLOW.y + " H " + FLOW.xs[3],
                          "class": "cco-track" });
    T.stations.forEach(function (name, i) {
      var g = S.put(flow, "g", { "class": "cco-st" + (i === 1 ? " is-rms" : "") });
      S.put(g, "circle", { cx: FLOW.xs[i], cy: FLOW.y, r: 10 });
      S.text(g, FLOW.xs[i], FLOW.y + 28, "cco-stt", name, "middle");
    });
    /* the risk management system, applied to a warehouse operation: it decides
       whether an officer has to be there for the unloading */
    S.text(flow, FLOW.xs[1], FLOW.y - 44, "cco-brancht", T.branchNote, "middle");
    S.text(flow, FLOW.xs[1] - 8, FLOW.y - 24, "cco-branchv",
           attended.name.toUpperCase() + " " + attended.value + "%", "end");
    S.text(flow, FLOW.xs[1] + 8, FLOW.y - 24, "cco-branchn",
           remote.name.toUpperCase() + " " + remote.value + "%");

    /* time and cost, as a before and an after on one axis rather than a claim */
    var gains = S.put(svg, "g", { "class": "cco-gains" });
    S.text(gains, 700, FLOW.y - 74, "cco-cap", T.gains);
    [["2018", 100], [range, attended.value]].forEach(function (row, i) {
      var y = FLOW.y - 56 + i * 26;
      S.text(gains, 700, y + 9, "cco-ayear", row[0]);
      S.put(gains, "rect", { x: 748, y: y, width: 260, height: 12, rx: 6, "class": "cco-atrack" });
      S.put(gains, "rect", { x: 748, y: y, width: 260 * row[1] / 100, height: 12, rx: 6,
                             "class": "cco-afill" + (i ? " is-now" : "") });
      S.text(gains, 1018, y + 10, "cco-aval", row[1] + "%");
    });
    S.text(gains, 700, FLOW.y + 4, "cco-s", T.gainsCaption);

    root.appendChild(stage);
    /* the same two figures as text, the way every chart in this deck ships a
       table of its own, and every bullet in the words demo-data.js holds */
    root.appendChild(S.srList(
      [m.lead].concat(m.bullets, [
        "2018: 100% of placements attended by an officer in person",
        range + ": " + attended.value + "% attended, " + remote.value + "% controlled remotely"
      ]), m.title, "bullets md-bullets"));
    return root;
  });
})();
