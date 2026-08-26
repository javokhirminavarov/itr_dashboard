/* =========================================================================
   E-Transit — the system explained in the order a consignment meets it.

   It used to be eight bullets. Eight bullets have no order, so a reader has
   to hold all eight and assemble the system themselves; an audience does not
   get the chance.

   A transit movement does have an order, and it is the same order every
   time: lodge, notify, pay, be assessed, cross, be watched, leave. So the
   corridor is drawn — entry post, inland route, exit post — and each bullet
   is attached to the moment on that corridor when it actually happens. The
   step rail is the journey; the vehicle moves because the presenter moved
   it, never on a timer, so nothing is running while they are talking.

   Two claims are shown rather than stated. "Reduces congestion" is a queue
   at the crossing that drains, on screen, at the step where the decision is
   already made. "Simple enough without specialised knowledge" is a count:
   the trader lodges once, and everything else on the corridor is marked
   automatic, so the audience can see how short the trader's side is.
   ========================================================================= */
(function () {
  "use strict";
  var S = window.SceneCore;

  var W = 1200, H = 380;
  var ROAD = { y: 232, half: 27 };
  var QUEUE = { x: 24, y: 316, n: 7, pitch: 30 };
  var ENTRY = { x0: 162, x1: 336, gate: 250 };
  var EXIT = { x0: 878, x1: 1058, gate: 968 };
  var OBS = { y: 62, x0: 162, x1: 1058 };
  var TRUCK = { len: 96, w: 26 };

  /* Where the vehicle stands at each step, as the x of its nose. It moves
     between these by transition, never by animation: the presenter drives it. */
  var AT = [92, 92, 92, 92, ENTRY.gate, 430, 700, EXIT.gate + 96];

  S.registerModal("eTransit", function (m, HOST) {
    var T = window.SCENE_DATA.eTransit;
    var root = S.el("div", "etx");

    /* the modal's own head, exactly as the card that is still a card renders it */
    var head = S.el("div", "md-head");
    head.appendChild(HOST.icon(m.icon, "md-icon"));
    var ht = S.el("div");
    ht.appendChild(S.el("div", "md-tag", m.tag));
    ht.appendChild(S.el("h2", null, m.title));
    head.appendChild(ht);
    root.appendChild(head);

    /* ---------------- the corridor ---------------- */
    var stage = S.el("div", "etx-stage scene-stage");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                               "aria-label": m.title + " — border to border" });
    stage.appendChild(svg);

    S.put(svg, "rect", { x: 0, y: 0, width: W, height: H, rx: 12, "class": "etx-ground" });

    /* the carriageway, drawn as the plan the rest of the deck is drawn as:
       one width from end to end, no horizon, no perspective */
    S.put(svg, "rect", { x: 0, y: ROAD.y - ROAD.half - 9, width: W, height: 9, "class": "etx-verge" });
    S.put(svg, "rect", { x: 0, y: ROAD.y + ROAD.half, width: W, height: 9, "class": "etx-verge" });
    S.put(svg, "rect", { x: 0, y: ROAD.y - ROAD.half, width: W, height: ROAD.half * 2, "class": "etx-road" });
    S.put(svg, "path", { d: "M 0 " + ROAD.y + " H " + W, "class": "etx-centre" });

    /* the two posts: a gantry across the carriageway and a footprint beside it */
    function post(x0, x1, gate, label, tag) {
      var g = S.put(svg, "g", { "class": "etx-post" });
      S.put(g, "rect", { x: x0, y: 96, width: x1 - x0, height: 104, rx: 6, "class": "etx-built" });
      S.put(g, "rect", { x: x0, y: 286, width: x1 - x0, height: 60, rx: 6, "class": "etx-built" });
      S.put(g, "rect", { x: gate - 4, y: ROAD.y - ROAD.half - 12, width: 8,
                         height: ROAD.half * 2 + 24, rx: 2, "class": "etx-gantry" });
      S.text(g, (x0 + x1) / 2, 88, "etx-cap", label, "middle");
      return g;
    }
    var entryG = post(ENTRY.x0, ENTRY.x1, ENTRY.gate, T.posts.entry);
    post(EXIT.x0, EXIT.x1, EXIT.gate, T.posts.exit);
    S.text(svg, (ENTRY.x1 + EXIT.x0) / 2, ROAD.y - ROAD.half - 16, "etx-cap",
           T.posts.inland, "middle");

    /* the barrier that lifts — a bar across the lane, rotated out of the way.
       transform only, so it costs nothing on scroll. */
    var barrier = S.put(entryG, "rect", { x: ENTRY.gate, y: ROAD.y - 3, width: 62, height: 6,
                                          rx: 3, "class": "etx-barrier" });
    barrier.style.transformOrigin = ENTRY.gate + "px " + ROAD.y + "px";

    /* ---- the queue at the crossing: the congestion claim, drawn ---- */
    var qG = S.put(svg, "g", { "class": "etx-queue" });
    S.text(qG, QUEUE.x, QUEUE.y - 20, "etx-cap", T.queueLabel);
    var qMarks = [];
    for (var q = 0; q < QUEUE.n; q++) {
      qMarks.push(S.put(qG, "rect", { x: QUEUE.x + q * QUEUE.pitch, y: QUEUE.y,
                                      width: 22, height: 13, rx: 2, "class": "etx-qmark" }));
    }
    var meterW = QUEUE.n * QUEUE.pitch - 8;
    S.put(qG, "rect", { x: QUEUE.x, y: QUEUE.y + 22, width: meterW, height: 5, rx: 2.5,
                        "class": "etx-metertrack" });
    var meter = S.put(qG, "rect", { x: QUEUE.x, y: QUEUE.y + 22, width: meterW, height: 5, rx: 2.5,
                                    "class": "etx-meter" });
    meter.style.transformOrigin = QUEUE.x + "px " + (QUEUE.y + 24) + "px";

    /* ---- the lodgement: the data reaches the post before the vehicle ---- */
    var lodge = S.put(svg, "g", { "class": "etx-lodge" });
    S.put(lodge, "rect", { x: ENTRY.x0 + 18, y: 112, width: 44, height: 56, rx: 4, "class": "etx-doc" });
    S.put(lodge, "path", { d: "M " + (ENTRY.x0 + 28) + " 130 h 24 M " + (ENTRY.x0 + 28) +
                              " 142 h 24 M " + (ENTRY.x0 + 28) + " 154 h 14", "class": "etx-docline" });
    T.stamps.forEach(function (st, i) {
      var g = S.chip(lodge, ENTRY.x1 + 96, 116 + i * 30, [{ t: st }], "etx-stamp");
      if (i === 0) S.leader(lodge, ENTRY.x1 + 96 - g.__w / 2, 116, ENTRY.x0 + 64, 130);
    });

    /* ---- the fees, settled by the system rather than at a counter ---- */
    var pay = S.put(svg, "g", { "class": "etx-pay" });
    S.chip(pay, ENTRY.x1 + 96, 176, [{ t: "FEES · SETTLED" },
                                     { t: "no counter visit", cls: "sc-chip-s" }], "etx-green");
    S.leader(pay, ENTRY.x1 + 96 - 62, 176, ENTRY.x0 + 64, 158);

    /* ---- the decision at the gate ---- */
    var dec = S.put(svg, "g", { "class": "etx-decision" });
    S.chip(dec, ENTRY.gate + 8, 300, [{ t: "GREEN · CLEARED" }], "etx-green");
    var held = S.put(dec, "g", { "class": "etx-held" });
    truck(held, 96, 314, "etx-held-truck");
    S.chip(held, 232, 314, [{ t: "FLAGGED · HELD" }], "etx-red");

    /* ---- the targeting centre, riding the whole route ---- */
    var obs = S.put(svg, "g", { "class": "etx-obs" });
    S.put(obs, "path", { d: "M " + OBS.x0 + " " + OBS.y + " H " + OBS.x1, "class": "etx-obsline" });
    S.text(obs, OBS.x0, OBS.y - 10, "etx-cap", T.observer);
    var eye = S.put(obs, "g", { "class": "etx-eye" });
    S.put(eye, "circle", { cx: 0, cy: OBS.y, r: 7 });
    var tether = S.put(obs, "path", { "class": "etx-tether" });

    /* ---- the consignment ----
       An articulated goods vehicle in plan, the same object the corridor
       carries, turned to run left to right. */
    function truck(parent, nose, cy, cls) {
      var g = S.put(parent, "g", { "class": cls || "etx-truck" });
      var h = TRUCK.w, y = cy - h / 2;
      S.put(g, "rect", { x: nose - 88, y: y + 1, width: 62, height: h - 2, rx: 2, "class": "etx-trailer" });
      S.put(g, "rect", { x: nose - 24, y: y, width: 24, height: h, rx: 3, "class": "etx-cab" });
      S.put(g, "rect", { x: nose - 26, y: y + 5, width: 3, height: h - 10, "class": "etx-couple" });
      return g;
    }
    var veh = truck(svg, 0, ROAD.y);

    /* ---------------- the steps ---------------- */
    var barText = S.el("div", "etx-bar-note");
    var counter = S.el("div", "etx-count");
    var cTrader = S.el("strong", "etx-cnum", "0");
    var autoChips = [];

    function render(n) {
      root.dataset.step = String(n);
      veh.style.transform = "translateX(" + AT[n] + "px)";
      /* the queue: seven standing at the crossing until the decision is made,
         two once it is — the claim, shown, at the moment it becomes true */
      var left = n >= 5 ? 2 : QUEUE.n;
      qMarks.forEach(function (r, i) { r.style.opacity = i < left ? "1" : "0.1"; });
      meter.style.transform = "scaleX(" + (left / QUEUE.n) + ")";
      barrier.style.transform = n >= 4 ? "rotate(-72deg)" : "rotate(0deg)";
      /* the centre watches from the moment the data arrives, and the marker
         says so by staying tethered to the vehicle for the whole route */
      var vx = AT[n] - TRUCK.len / 2;
      eye.style.transform = "translateX(" + Math.max(OBS.x0, Math.min(OBS.x1, vx)) + "px)";
      tether.setAttribute("d", "M " + Math.max(OBS.x0, Math.min(OBS.x1, vx)) + " " + (OBS.y + 8) +
                               " L " + vx + " " + (ROAD.y - ROAD.half - 4));
      cTrader.textContent = n >= 1 ? "1" : "0";
      /* everything after the lodgement is the system's work, not the trader's,
         and lights as the journey reaches it */
      autoChips.forEach(function (c) { c.classList.toggle("is-on", n >= +c.dataset.at); });
    }

    var machine = S.machine({
      root: root, keys: "modal", railLabel: "The transit journey",
      steps: T.steps, render: render
    });

    root.appendChild(stage);

    /* ---- the one shared platform, named on one bar ----
       Not six silos: one strip, every agency a segment of it, and one event
       running its length. Two of the four are awaiting-figure chips because
       the deck names two agencies and no more — a plausible invention would
       be worse than an unfilled slot. */
    var bar = S.el("div", "etx-bar");
    bar.appendChild(S.el("div", "etx-bar-title", T.barTitle));
    var strip = S.el("div", "etx-strip");
    T.agencies.forEach(function (a) {
      var seg = S.el("span", "etx-seg");
      HOST.richText(seg, a);
      strip.appendChild(seg);
    });
    strip.appendChild(S.el("i", "etx-pulse"));
    bar.appendChild(strip);
    barText.textContent = T.barNote;
    bar.appendChild(barText);
    root.appendChild(bar);

    /* ---- how short the trader's side is, counted ---- */
    counter.appendChild(S.el("span", "etx-clab", T.traderLabel));
    counter.appendChild(cTrader);
    counter.appendChild(S.el("span", "etx-cnote", T.traderNote));
    var autos = S.el("div", "etx-autos");
    [2, 3, 4, 5, 6, 7].forEach(function (i) {
      var c = S.el("span", "etx-auto", T.steps[i].label.toUpperCase());
      c.dataset.at = String(i);
      autoChips.push(c);
      autos.appendChild(c);
    });
    counter.appendChild(autos);
    root.appendChild(counter);

    var foot = S.el("div", "etx-foot");
    foot.appendChild(machine.readout);
    var mw = S.el("div", "md-metric etx-metric");
    mw.appendChild(HOST.Metric(m.metric));
    foot.appendChild(mw);
    root.appendChild(machine.rail);
    root.appendChild(foot);

    /* every bullet, in the words demo-data.js still holds them in */
    root.appendChild(S.srList([m.lead].concat(m.bullets), m.title, "bullets md-bullets"));

    machine.setStep(0, false);
    return root;
  });
})();
