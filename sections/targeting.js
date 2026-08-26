/* =========================================================================
   Section 2 — the targeting centre, drawn as the console it is.

   It used to be eight cards with a paragraph each: the eight things the
   centre does, written down. A reader takes one of the eight; an audience
   takes none of them.

   So the eight are not written here. They are what the console DOES. Six
   channels run left to right and are never empty; three feeds converge into
   them and are labelled where they arrive; everything crossing the scoring
   bar comes out green, yellow or red; the consignment the standing profiles
   do not cover is held at the bar with the reason attached to IT, not to a
   sidebar; and what happens to it next — assessment on site, expert
   examination — is the block it is handed to. The clock in the corner is the
   24/7 claim, running.

   Two toolbars drive it, and they are the same two questions a presenter is
   asked: which channel (the mode rail) and what happens to a consignment
   (the step rail). Both are real buttons, both take the arrow keys, and
   neither is behind a hover.

   The console is the one dark surface in a deck that is otherwise a drawing
   on paper. That is deliberate and it is contained: the header above it
   stays on the page's own ground, and every colour it uses is declared on
   .tgc in targeting.css and is invisible to the rest of the page.
   ========================================================================= */
(function () {
  "use strict";
  var S = window.SceneCore;

  /* ---- the console's coordinate system, in one place ---- */
  var W = 1440, H = 640;
  var LANE0 = 112, PITCH = 94, NLANE = 6;
  var TRACK = { x0: 430, x1: 940, h: 24 };
  var GATE = 690;                                   /* the scoring bar        */
  var RUN = TRACK.x1 - TRACK.x0 - 14;               /* an item's travel       */
  var SCORE_AT = (GATE - TRACK.x0) / RUN;           /* when it takes a colour */
  var SPINE = 286, INTAKE = 270;
  var FEED = { x0: 16, x1: 238, h: 66, ys: [190, 330, 470] };
  var FAN = { x: 972, y: 330 };
  var BIN = { x0: 1000, x1: 1188, h: 110, ys: [160, 330, 500] };
  var HANDOFF = { x0: 1210, x1: 1424, y0: 440, y1: 570 };
  var LAP = 12;                                     /* seconds a lane cycles  */

  var CH = { g: "green", y: "yellow", r: "red" };   /* the only three words   */

  function laneY(i) { return LANE0 + i * PITCH; }

  S.registerScreen("targeting", function (def, d, HOST) {
    var T = window.SCENE_DATA.targeting;
    var modes = d.monitoring.modes;
    var sec = HOST.screenShell(def, d, "sc-target");

    var root = S.el("div", "tgc");
    root.tabIndex = 0;

    /* ---------------- the mode rail: which channel ----------------
       "Clicking a mode filters the console to that flow" — so it is a filter,
       held apart from the step, and the console reacts as a whole: the other
       five lanes stand down, and the three channel bins recount to what is
       left running. */
    var modeBar = S.el("div", "tgc-modes");
    modeBar.setAttribute("role", "group");
    modeBar.setAttribute("aria-label", "Monitored channels");
    var modeBtns = [], mode = "all";

    function modeKey(i) { return i < 0 ? "all" : "m" + i; }
    function addMode(i, label, iconName) {
      var b = S.el("button", "tgc-mode");
      b.type = "button";
      b.dataset.mode = modeKey(i);
      if (iconName) b.appendChild(HOST.icon(iconName));
      b.appendChild(S.el("span", null, label));
      b.setAttribute("aria-pressed", i < 0 ? "true" : "false");
      b.tabIndex = i < 0 ? 0 : -1;
      b.addEventListener("click", function () { setMode(modeKey(i), true); });
      modeBtns.push(b);
      modeBar.appendChild(b);
    }
    addMode(-1, T.modeAll, "layers");
    modes.forEach(function (m, i) { addMode(i, m.label, m.icon); });

    function setMode(key, focusIt) {
      mode = key;
      root.dataset.mode = key;
      modeBtns.forEach(function (b) {
        var on = b.dataset.mode === key;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        if (on && focusIt) b.focus();
      });
      paintBins();
    }
    /* The mode rail owns the arrows and the digits while the focus is inside
       it, and stops them there; the step rail owns the same keys while the
       focus is inside that. Two toolbars, one rule each, and nothing either of
       them does not claim ever stops reaching the deck. */
    modeBar.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var at = modeBtns.map(function (b) { return b.dataset.mode; }).indexOf(mode), to = -1;
      var digit = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (digit) to = +digit[2] - 1;
      else if (e.code === "ArrowRight") to = at + 1;
      else if (e.code === "ArrowLeft") to = at - 1;
      else return;
      if (to < 0 || to >= modeBtns.length) return;
      setMode(modeBtns[to].dataset.mode, true);
      e.preventDefault();
      e.stopPropagation();
    });

    /* ---------------- the console ---------------- */
    var stage = S.el("div", "tgc-stage scene-stage");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                               "aria-label": d.monitoring.title });
    stage.appendChild(svg);

    S.put(svg, "rect", { x: 0, y: 0, width: W, height: H, rx: 16, "class": "tgc-bg" });

    /* -- header: who this is, and the 24/7 claim as a running clock -- */
    var head = S.put(svg, "g", { "class": "tgc-head" });
    S.text(head, 26, 33, "tgc-name", T.consoleTitle);
    S.text(head, 26, 48, "tgc-sub", d.hub.sub);
    var keyChip = S.put(head, "g", { "class": "tgc-keychip" });
    S.put(keyChip, "rect", { x: 250, y: 18, width: T.key.length * S.ADV + 20, height: 22, rx: 11 });
    S.text(keyChip, 260, 33, "tgc-keytext", T.key);
    S.put(head, "path", { d: "M 0 60 H " + W, "class": "tgc-rule" });
    S.text(head, W - 26, 34, "tgc-clock", "00:00:00", "end").setAttribute("id", "tgc-clock");
    S.text(head, W - 26, 49, "tgc-sub", T.clockNote, "end");
    var badge = S.put(head, "g", { "class": "tgc-247" });
    S.put(badge, "rect", { x: W - 236, y: 18, width: 54, height: 24, rx: 12 });
    S.text(badge, W - 209, 34, "tgc-247t", "24/7", "middle");

    /* -- the three feeds, converging on one intake -- */
    var feeds = S.put(svg, "g", { "class": "tgc-feeds" });
    T.feeds.forEach(function (f, i) {
      var y = FEED.ys[i];
      var g = S.put(feeds, "g", { "class": "tgc-feed" });
      S.put(g, "rect", { x: FEED.x0, y: y - FEED.h / 2, width: FEED.x1 - FEED.x0,
                         height: FEED.h, rx: 8, "class": "tgc-feedbox" });
      S.text(g, FEED.x0 + 14, y - 6, "tgc-feedlabel", f.label);
      S.text(g, FEED.x0 + 14, y + 13, "tgc-feedsub", f.sub);
      /* the run into the intake, and one packet riding it — a feed that
         arrives rather than three icons in a row */
      var d1 = "M " + FEED.x1 + " " + y + " C " + (FEED.x1 + 20) + " " + y + " " +
               (INTAKE - 22) + " " + FAN.y + " " + INTAKE + " " + FAN.y;
      S.put(g, "path", { d: d1, "class": "tgc-run" });
      var pk = S.put(g, "circle", { r: 3.4, "class": "tgc-packet" });
      pk.style.offsetPath = "path('" + d1 + "')";
      /* same device as the lane items, and the same one PassengerSchema uses
         for the walking route: a static offset with a matching negative delay,
         so the packets stand spread along their runs when motion is off and do
         not jump when it comes back on */
      pk.style.offsetDistance = (i * 33 + 6) + "%";
      pk.style.animationDelay = "-" + (5.2 * (i * 33 + 6) / 100).toFixed(2) + "s";
    });
    S.put(feeds, "circle", { cx: INTAKE, cy: FAN.y, r: 6, "class": "tgc-intake" });
    S.text(feeds, FEED.x0 + 2, 118, "tgc-cap", T.feedsTitle);

    /* the intake distributes to all six channels: one spine, six stubs */
    S.put(feeds, "path", { d: "M " + SPINE + " " + laneY(0) + " V " + laneY(NLANE - 1),
                           "class": "tgc-spine" });
    S.put(feeds, "path", { d: "M " + INTAKE + " " + FAN.y + " H " + SPINE, "class": "tgc-spine" });

    /* -- six lanes, never empty -- */
    var lanes = S.put(svg, "g", { "class": "tgc-lanes" });
    modes.forEach(function (m, i) {
      var y = laneY(i);
      var g = S.put(lanes, "g", { "class": "tgc-lane", "data-mode": "m" + i });
      S.put(g, "path", { d: "M " + SPINE + " " + y + " H " + TRACK.x0, "class": "tgc-stub" });
      S.put(g, "circle", { cx: SPINE, cy: y, r: 3, "class": "tgc-node" });
      var ic = S.put(g, "path", { d: HOST.iconPath(m.icon), "class": "tgc-laneicon",
                                  transform: "translate(" + (TRACK.x0 - 122) + " " + (y - 24) + ") scale(0.72)" });
      ic.setAttribute("vector-effect", "non-scaling-stroke");
      S.text(g, TRACK.x0 - 96, y - 8, "tgc-lanelabel", m.label.toUpperCase());
      S.put(g, "rect", { x: TRACK.x0, y: y - TRACK.h / 2, width: TRACK.x1 - TRACK.x0,
                         height: TRACK.h, rx: TRACK.h / 2, "class": "tgc-track" });
      /* the items. Four to a lane, a quarter of a lap apart, so there is
         always one on every channel — the 24/7 claim, shown rather than
         written. Their channels come from a literal table, never a random. */
      T.script[i].forEach(function (ch, j) {
        /* Where this item stands when nothing is moving. A CSS animation
           outranks an inline style while it runs, so these two lines are
           invisible in motion and are the whole picture without it: under
           prefers-reduced-motion the lanes are still populated end to end and
           everything past the bar is still coloured. Nothing is lost, only
           the travel. */
        var phase = (j + 0.5) / 4;
        var at = phase * RUN;
        var it = S.put(g, "g", { "class": "tgc-item" });
        it.style.animationDelay = "-" + (phase * LAP).toFixed(2) + "s";
        it.style.transform = "translateX(" + at.toFixed(1) + "px)";
        S.put(it, "rect", { x: TRACK.x0 + 4, y: y - 6, width: 22, height: 12, rx: 3,
                            "class": "tgc-i-base" });
        var live = S.put(it, "rect", { x: TRACK.x0 + 4, y: y - 6, width: 22, height: 12, rx: 3,
                                       "class": "tgc-i-live ch-" + ch });
        live.style.opacity = phase >= SCORE_AT ? "1" : "0";
      });
    });

    /* -- the scoring bar every channel crosses -- */
    var gate = S.put(svg, "g", { "class": "tgc-gate" });
    S.put(gate, "rect", { x: GATE - 2.5, y: 88, width: 5, height: 512, rx: 2.5 });
    S.text(gate, GATE, 80, "tgc-cap", T.gate, "middle");

    /* -- everything is channelled: six into one, one into three -- */
    var fan = S.put(svg, "g", { "class": "tgc-fan" });
    modes.forEach(function (m, i) {
      S.put(fan, "path", { "class": "tgc-run", d: "M " + TRACK.x1 + " " + laneY(i) +
        " C " + (TRACK.x1 + 18) + " " + laneY(i) + " " + (FAN.x - 18) + " " + FAN.y +
        " " + FAN.x + " " + FAN.y });
    });
    S.put(fan, "circle", { cx: FAN.x, cy: FAN.y, r: 5, "class": "tgc-intake" });

    var binG = S.put(svg, "g", { "class": "tgc-bins" });
    S.text(binG, BIN.x0, 118, "tgc-cap", T.binsTitle);
    var binTally = [];
    ["g", "y", "r"].forEach(function (ch, i) {
      var y = BIN.ys[i];
      S.put(fan, "path", { "class": "tgc-run", d: "M " + FAN.x + " " + FAN.y +
        " C " + (FAN.x + 12) + " " + FAN.y + " " + (BIN.x0 - 12) + " " + y + " " + BIN.x0 + " " + y });
      var g = S.put(binG, "g", { "class": "tgc-bin ch-" + ch });
      S.put(g, "rect", { x: BIN.x0, y: y - BIN.h / 2, width: BIN.x1 - BIN.x0,
                         height: BIN.h, rx: 10, "class": "tgc-binbox" });
      S.put(g, "rect", { x: BIN.x0, y: y - BIN.h / 2, width: 5,
                         height: BIN.h, rx: 2.5, "class": "tgc-bintab" });
      S.text(g, BIN.x0 + 20, y - 20, "tgc-binword", CH[ch].toUpperCase());
      binTally.push(S.put(g, "g", { "class": "tgc-tally" }));
    });

    /* -- what a flagged consignment is, and where it goes next --
       The annotation belongs to the event: it is drawn on the item held at
       the bar, on a leader, the way the corridor and the arrivals hall
       caption the thing they are pointing at. */
    var flagY = laneY(T.flagLane);
    var flag = S.put(svg, "g", { "class": "tgc-flag" });
    S.put(flag, "rect", { x: GATE - 11, y: flagY - 6, width: 22, height: 12, rx: 3,
                          "class": "tgc-i-live ch-r" });
    S.put(flag, "circle", { cx: GATE, cy: flagY, r: 15, "class": "tgc-flagring" });
    T.flagCallouts.forEach(function (c, i) {
      var cx = GATE + (i ? 132 : -128), cy = flagY + (i ? 96 : -96);
      var g = S.chip(flag, cx, cy, [{ t: c.t },
                                    { t: c.s, cls: "sc-chip-s" }], "tgc-chip");
      S.leader(flag, cx, cy + (i ? -g.__h / 2 : g.__h / 2), GATE + (i ? 12 : -12), flagY, "tgc-leader");
    });

    var hand = S.put(svg, "g", { "class": "tgc-handoff" });
    S.put(hand, "path", { d: "M " + BIN.x1 + " " + BIN.ys[2] + " C " + (BIN.x1 + 10) + " " +
      BIN.ys[2] + " " + (HANDOFF.x0 - 10) + " " + ((HANDOFF.y0 + HANDOFF.y1) / 2) + " " +
      HANDOFF.x0 + " " + ((HANDOFF.y0 + HANDOFF.y1) / 2), "class": "tgc-handrun" });
    S.put(hand, "rect", { x: HANDOFF.x0, y: HANDOFF.y0, width: HANDOFF.x1 - HANDOFF.x0,
                          height: HANDOFF.y1 - HANDOFF.y0, rx: 10, "class": "tgc-handbox" });
    S.text(hand, HANDOFF.x0 + 18, HANDOFF.y0 + 46, "tgc-handt", T.handoff.t);
    S.text(hand, HANDOFF.x0 + 18, HANDOFF.y0 + 70, "tgc-hands", T.handoff.s);

    /* ---------------- the tally, recounted per channel ----------------
       Not a statistic and not presented as one: it is a count of what is on
       this console right now, which is why it is drawn as marks rather than
       printed as a figure. Every figure in this deck lives in demo-data.js
       and this is not one. */
    function paintBins() {
      var counts = { g: 0, y: 0, r: 0 };
      T.script.forEach(function (lane, i) {
        if (mode !== "all" && mode !== "m" + i) return;
        lane.forEach(function (ch) { counts[ch]++; });
      });
      ["g", "y", "r"].forEach(function (ch, i) {
        var g = binTally[i], n = counts[ch], k;
        while (g.firstChild) g.removeChild(g.firstChild);
        for (k = 0; k < n; k++) {
          S.put(g, "rect", { x: BIN.x0 + 20 + (k % 8) * 17, y: BIN.ys[i] + 2 + Math.floor(k / 8) * 15,
                             width: 12, height: 9, rx: 2, "class": "tgc-mark" });
        }
      });
    }

    /* ---------------- the steps ---------------- */
    var machine = S.machine({
      root: root,
      keys: "local",
      railLabel: "What happens to a consignment",
      steps: T.steps,
      render: function (n) { root.dataset.step = String(n); }
    });

    var hint = S.el("div", "tgc-foot");
    hint.appendChild(machine.readout);
    hint.appendChild(S.el("span", "scene-hint", T.hint));

    root.appendChild(modeBar);
    root.appendChild(stage);
    root.appendChild(machine.rail);
    root.appendChild(hint);

    sec.appendChild(HOST.fx(root, 2));
    /* The eight functions, the band title and the six channels, in the words
       demo-data.js still holds them in — the proof that redrawing them lost
       nothing. Hidden, like the table under every chart in this deck. */
    sec.appendChild(S.srList(
      d.functions.map(function (f) { return f.title + " — " + f.text; })
        .concat([d.monitoring.title + ": " +
                 modes.map(function (m) { return m.label; }).join(", ")]),
      d.headline));

    setMode("all", false);
    machine.setStep(0, false);
    S.onReplay(sec, function () { setMode("all", false); machine.setStep(0, false); });
    /* The lanes run only while section 2 is near the reader. */
    S.watchClass(sec, "is-in", function (on) { root.dataset.live = on ? "1" : "0"; });

    /* the clock. A wall clock that does not run is not calm, it is broken —
       and this one is the 24/7 claim, so it runs. Text only: no transform,
       nothing to composite, nothing for reduced motion to stop. */
    var clock = svg.querySelector("#tgc-clock");
    function tick() {
      var t = new Date(Date.now() + (T.clockZone * 60 + new Date().getTimezoneOffset()) * 60000);
      clock.textContent = ("0" + t.getHours()).slice(-2) + ":" +
                          ("0" + t.getMinutes()).slice(-2) + ":" +
                          ("0" + t.getSeconds()).slice(-2);
    }
    tick();
    setInterval(tick, 1000);

    return sec;
  });
})();
