/* =========================================================================
   Customs and cargo operations — one platform over many warehouses, and
   three parties reading one record at the same second.

   Six bullets used to say it. Two of the six are the whole claim and the
   other four fall out of them, which a list cannot show and a scene can:

     ~430 warehouses on ONE platform  -> the integration is the animation.
        The counter still lands on 430, because that figure is the point;
        what a box could not do is show four hundred separate operations
        becoming one system.
     THREE parties, ONE record       -> three panes of the same consignment.
        Change it in the operator's pane and it changes in the customs
        officer's and the declarant's while the audience is watching. That
        is "monitor and control through the same platform", and it is also
        where efficiency and transparency come from — so neither is restated
        as a box of its own.

   Between them the consignment runs the flow the warehouse actually puts it
   through, and the risk management system is a fork in it: an officer
   attends the unloading, or the placement is controlled remotely.

   Every figure on screen is read live out of window.demoData. Nothing here
   invents one, and nothing here mutates one — demoData arrays are section
   4's arrays too, so they are read by index and never sorted in place.
   ========================================================================= */
(function () {
  "use strict";
  var S = window.SceneCore;

  var W = 1200, H = 520;

  /* Uzbekistan, generalised to the outline a map at this size can carry, in
     degrees of longitude and latitude. Projected below rather than drawn in
     screen units, so the country keeps its own proportions instead of the
     box's: 17.5 degrees of longitude at this latitude is about 1.5 times 8.8
     degrees of latitude, and the drawing says so. */
  var BORDER = [
    [58.5, 45.6], [59.9, 44.9], [61.0, 44.2], [62.0, 43.5], [63.0, 43.6],
    [64.5, 43.6], [66.0, 42.9], [66.7, 42.0], [68.2, 41.1], [69.2, 41.5],
    [70.0, 42.2], [70.9, 42.3], [70.6, 41.6], [71.5, 41.3], [72.0, 41.1],
    [73.1, 40.8], [72.2, 40.4], [71.7, 39.9], [70.5, 40.2], [69.5, 40.2],
    [68.6, 40.2], [68.3, 39.5], [67.4, 39.2], [67.7, 38.5], [68.0, 38.0],
    [67.0, 37.2], [66.5, 37.4], [65.8, 38.2], [64.2, 38.9], [62.4, 39.9],
    [61.0, 41.2], [60.0, 41.2], [58.5, 42.6], [56.0, 44.8], [56.0, 45.0],
    [57.9, 45.5]
  ];
  /* Where the network is dense. Warehouses follow trade, not area, so the
     scatter is weighted to the places the trade is. */
  var CLUSTER = [
    [69.25, 41.30, 0.30], [66.95, 39.65, 0.16], [71.78, 40.38, 0.14],
    [64.42, 39.77, 0.10], [60.62, 41.55, 0.08], [67.28, 37.23, 0.07],
    [65.80, 38.85, 0.07], [59.60, 42.46, 0.05], [70.60, 40.55, 0.03]
  ];
  var LON0 = 55.8, LON1 = 73.4, LAT0 = 37.0, LAT1 = 45.9;
  var MAP = { x: 46, y: 34, w: 660, h: 442 };
  function mx(lon) { return MAP.x + (lon - LON0) / (LON1 - LON0) * MAP.w; }
  function my(lat) { return MAP.y + (LAT1 - lat) / (LAT1 - LAT0) * MAP.h; }

  function inside(lon, lat) {              /* ray casting, on the raw degrees */
    var hit = false, i, j, a, b;
    for (i = 0, j = BORDER.length - 1; i < BORDER.length; j = i++) {
      a = BORDER[i]; b = BORDER[j];
      if ((a[1] > lat) !== (b[1] > lat) &&
          lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  }

  S.registerModal("ccoIS", function (m, HOST) {
    var T = window.SCENE_DATA.ccoIS, D = HOST.data;
    var wh = D.beats.warehouse;
    /* Read by index. These arrays are section 4's arrays: an in-place sort or
       reverse here would silently reorder a chart in another section. */
    var TOTAL = wh.leftPanel.chart.rows[0].to;                /* 430          */
    var attended = wh.rightPanel.share.parts[0];              /* 28, tone a   */
    var remote = wh.rightPanel.share.parts[1];                /* 72, tone n   */
    var baseline = wh.rightPanel.metrics[0].anchor.text;      /* vs 100% ...  */

    var root = S.el("div", "cco");

    var head = S.el("div", "md-head");
    head.appendChild(HOST.icon(m.icon, "md-icon"));
    var ht = S.el("div");
    ht.appendChild(S.el("div", "md-tag", m.tag));
    ht.appendChild(S.el("h2", null, m.title));
    head.appendChild(ht);
    root.appendChild(head);

    /* One stage, three tableaux stacked inside it and swapped by opacity.
       Nothing reflows when the step changes — the box is measured once. */
    var stage = S.el("div", "cco-stage scene-stage");

    /* ================= tableau 1 — 430 warehouses, then one platform ====== */
    var mapWrap = S.el("div", "cco-t cco-map");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                               "aria-label": T.mapTitle });
    mapWrap.appendChild(svg);
    var d = "M " + BORDER.map(function (p) { return mx(p[0]).toFixed(1) + " " + my(p[1]).toFixed(1); })
                         .join(" L ") + " Z";
    S.put(svg, "path", { d: d, "class": "cco-country" });
    S.text(svg, MAP.x, MAP.y - 10, "cco-cap", T.mapTitle);

    /* 430 marks, placed once and deterministically. SceneCore.hash is the
       page's own Math.sin hash — the same press gives the same map every
       time, which is the only kind of map you can put in front of an
       audience. */
    var GROUPS = 12, groups = [], sums = [], gi;
    for (gi = 0; gi < GROUPS; gi++) {
      groups.push(S.put(svg, "g", { "class": "cco-dots" }));
      sums.push({ x: 0, y: 0, n: 0 });
    }
    var slabX = 940, slabY = 258, placed = 0, tries = 0;
    while (placed < TOTAL && tries < TOTAL * 40) {
      var r1 = S.hash(tries * 2 + 1), r2 = S.hash(tries * 2 + 2), r3 = S.hash(tries * 7 + 5);
      var c = CLUSTER[0], acc = 0, ci;
      for (ci = 0; ci < CLUSTER.length; ci++) { acc += CLUSTER[ci][2]; if (r3 <= acc) { c = CLUSTER[ci]; break; } }
      var spread = 0.35 + r3 * 5.2;
      var lon = c[0] + (r1 - 0.5) * spread * 1.6, lat = c[1] + (r2 - 0.5) * spread;
      tries++;
      if (!inside(lon, lat)) continue;
      var gk = placed % GROUPS, px = mx(lon), py = my(lat);
      var dot = S.put(groups[gk], "circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: 2.6,
                                              "class": "cco-dot" });
      dot.style.opacity = String(0.55 + S.hash(placed + 9) * 0.45);
      sums[gk].x += px; sums[gk].y += py; sums[gk].n++;
      placed++;
    }
    /* each batch has one destination, so the consolidation is twelve
       composited transforms rather than four hundred */
    /* Centroids are accumulated as the marks are placed rather than measured
       with getBBox(): the drawing is not in the document yet when this runs,
       and a bbox taken then is zero. */
    groups.forEach(function (g, i) {
      var c = sums[i];
      if (!c.n) return;
      g.style.setProperty("--dx", (slabX - c.x / c.n).toFixed(1) + "px");
      g.style.setProperty("--dy", (slabY - c.y / c.n).toFixed(1) + "px");
      g.style.transitionDelay = (i * 0.02).toFixed(2) + "s";
    });

    var slab = S.put(svg, "g", { "class": "cco-slab" });
    S.put(slab, "rect", { x: slabX - 148, y: slabY - 84, width: 296, height: 168, rx: 14 });
    var countT = S.text(slab, slabX, slabY + 6, "cco-count", "0", "middle");
    S.text(slab, slabX, slabY + 40, "cco-slabsub", T.platform, "middle");
    S.text(slab, slabX, slabY - 52, "cco-slabtag", wh.leftPanel.chart.rows[0].name.toUpperCase(), "middle");

    /* ================= tableau 2 — three parties, one record ============= */
    var work = S.el("div", "cco-t cco-work");
    var panes = S.el("div", "cco-panes"), paneEls = [];
    var state = T.record.map(function (f) { return f.v; });
    var runStations = [];
    T.parties.forEach(function (party, pi) {
      var pane = S.el("div", "cco-pane");
      var ph = S.el("div", "cco-pane-head");
      ph.appendChild(S.el("span", "cco-party", party.t));
      ph.appendChild(S.el("span", "cco-badge", party.badge));
      pane.appendChild(ph);
      pane.appendChild(S.el("div", "cco-rec-title", T.recordTitle));
      var rows = [];
      T.record.forEach(function (f, fi) {
        var row = S.el("div", "cco-row");
        row.appendChild(S.el("span", "cco-k", f.k));
        var v = S.el("span", "cco-v");
        row.appendChild(v);
        rows.push({ row: row, v: v });
        pane.appendChild(row);
      });
      /* Only the operator's pane carries the controls. The point of the split
         is that the other two did not have to be told. */
      if (pi === 0) {
        var ctrls = S.el("div", "cco-ctrls");
        ctrls.setAttribute("role", "group");
        ctrls.setAttribute("aria-label", T.change);
        T.record.forEach(function (f, fi) {
          var b = S.el("button", "cco-btn");
          b.type = "button";
          b.textContent = f.k;
          b.addEventListener("click", function () {
            state[fi] = state[fi] === f.v ? f.alt : f.v;
            paint(fi);
          });
          ctrls.appendChild(b);
        });
        pane.appendChild(S.el("div", "cco-chint", T.change));
        pane.appendChild(ctrls);
      }
      pane.appendChild(S.el("div", "cco-note", T.recordNote));
      paneEls.push(rows);
      panes.appendChild(pane);
    });
    work.appendChild(panes);
    var same = S.el("div", "cco-same", T.sameNote);
    work.appendChild(same);

    /* one change, written into all three at once — that IS the claim */
    function paint(changed) {
      paneEls.forEach(function (rows) {
        rows.forEach(function (r, fi) {
          r.v.textContent = state[fi];
          if (changed === fi) {
            r.row.classList.remove("is-hit");
            void r.row.offsetWidth;          /* restart the highlight */
            r.row.classList.add("is-hit");
          }
        });
      });
    }

    /* ---- the flow one consignment is actually put through ---- */
    var run = S.el("div", "cco-run");
    var runSvg = S.svgEl("svg", { viewBox: "0 0 1200 150", "aria-hidden": "true" });
    run.appendChild(runSvg);
    var SX = [130, 420, 730, 1030], SY = 52;
    S.put(runSvg, "path", { d: "M " + SX[0] + " " + SY + " H " + SX[3], "class": "cco-track" });
    T.stations.forEach(function (name, i) {
      var g = S.put(runSvg, "g", { "class": "cco-station", "data-at": String(i) });
      S.put(g, "circle", { cx: SX[i], cy: SY, r: 11 });
      S.text(g, SX[i], SY + 32, "cco-stname", name, "middle");
    });
    /* the risk management system, applied to a warehouse operation: it decides
       whether an officer has to be there for the unloading */
    var fork = S.put(runSvg, "g", { "class": "cco-fork" });
    S.put(fork, "path", { d: "M " + SX[1] + " " + SY + " C " + (SX[1] + 40) + " " + SY +
      " " + (SX[1] + 40) + " 112 " + (SX[1] + 96) + " 112", "class": "cco-forkline" });
    S.put(fork, "path", { d: "M " + SX[1] + " " + SY + " C " + (SX[1] + 40) + " " + SY +
      " " + (SX[1] + 40) + " 14 " + (SX[1] + 96) + " 14", "class": "cco-forkline is-taken" });
    S.text(fork, SX[1] + 106, 18, "cco-forkt is-taken", T.branch.no + " · " + remote.value + "%");
    S.text(fork, SX[1] + 106, 116, "cco-forkt", T.branch.yes + " · " + attended.value + "%");
    S.text(fork, SX[1] + 106, 132, "cco-forkr", wh.rightPanel.share.range);
    var token = S.put(runSvg, "circle", { cx: 0, cy: SY, r: 6, "class": "cco-token" });
    runStations = [].slice.call(runSvg.querySelectorAll(".cco-station"));
    work.appendChild(run);

    /* ================= tableau 3 — before and after, one axis ============ */
    var gains = S.el("div", "cco-t cco-gains");
    gains.appendChild(S.el("div", "cco-cap2", T.gainsTitle));
    var axis = S.el("div", "cco-axis");
    [{ y: "2018", v: 100, txt: "100%", tone: "n" },
     { y: wh.rightPanel.share.range, v: attended.value, txt: attended.value + "%", tone: "a" }]
      .forEach(function (b) {
        var r = S.el("div", "cco-arow");
        r.appendChild(S.el("span", "cco-ayear", b.y));
        var track = S.el("div", "cco-atrack");
        var fill = S.el("div", "cco-afill tone-" + b.tone);
        fill.style.width = b.v + "%";
        track.appendChild(fill);
        r.appendChild(track);
        r.appendChild(S.el("span", "cco-aval", b.txt));
        axis.appendChild(r);
      });
    gains.appendChild(axis);
    gains.appendChild(S.el("div", "cco-arange", T.gainsCaption + " · " + T.gainsRange));
    var toks = S.el("div", "cco-toks");
    T.gainTokens.forEach(function (g) {
      var c = S.el("span", "cco-tok");
      HOST.richText(c, g.value);
      c.appendChild(S.el("i", null, g.label));
      toks.appendChild(c);
    });
    gains.appendChild(toks);
    gains.appendChild(S.el("div", "cco-anote", T.gainsNote));
    /* the same two numbers as text, the way every chart in this deck ships a
       table of its own */
    gains.appendChild(S.srList(
      ["2018: 100% of placements attended by an officer in person",
       wh.rightPanel.share.range + ": " + attended.value + "% attended, " +
         remote.value + "% controlled remotely (" + baseline + ")"],
      T.gainsCaption));

    stage.appendChild(mapWrap);
    stage.appendChild(work);
    stage.appendChild(gains);
    root.appendChild(stage);

    /* ---------------- the steps ---------------- */
    /* The figure is the point, so it is still printed and it still lands on
       exactly demoData's 430 — what the count adds is the four hundred
       separate operations arriving. Wherever motion is off it is simply
       printed. */
    var raf = 0, t0 = 0;
    function frame(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / 1100);
      countT.textContent = String(Math.round(TOTAL * (1 - Math.pow(1 - k, 3))));
      raf = k < 1 ? requestAnimationFrame(frame) : 0;
    }
    function counter(run) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!run || S.reduce()) { countT.textContent = String(TOTAL); return; }
      t0 = 0;
      countT.textContent = "0";
      raf = requestAnimationFrame(frame);
    }

    function render(n) {
      root.dataset.step = String(n);
      counter(n === 0);
      /* Before the split view, the record is back at the values it starts
         from — so the scene is replayable from anywhere, and the change at
         step 3 always reads as a change. */
      if (n < 3) { state = T.record.map(function (f) { return f.v; }); }
      paint(-1);
      token.style.transform = "translateX(" + SX[n <= 4 ? 0 : n === 5 ? 1 : 3] + "px)";
      runStations.forEach(function (st, i) {
        st.classList.toggle("is-done", n >= 6 ? true : n === 5 ? i <= 1 : n === 4 ? i === 0 : false);
      });
    }

    var machine = S.machine({
      root: root, keys: "modal", railLabel: "One platform, three parties",
      steps: T.steps, render: render
    });
    root.appendChild(machine.rail);
    var foot = S.el("div", "cco-foot");
    foot.appendChild(machine.readout);
    root.appendChild(foot);

    root.appendChild(S.srList([m.lead].concat(m.bullets), m.title, "bullets md-bullets"));

    machine.setStep(0, false);
    return root;
  });
})();
