/* =========================================================================
   WCO SG demo — engine.
   One source of truth (engine.stage); every input funnels through goTo(),
   which always preempts running animation. No document scroll exists:
   wheel/touch gestures are quantized into next()/prev() events.
   Layout code holds no plate coordinates (see plates.js) and no figures
   (see demo-data.js).
   ========================================================================= */
(function () {
  "use strict";

  var D = window.demoData, S = window.STAGES, PL = window.PLATES;
  var DESIGN_W = 1920, DESIGN_H = 1080;

  /* ---------------- helpers ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  var REDUCE = mqReduce.matches;
  mqReduce.addEventListener("change", function (e) { REDUCE = e.matches; });

  /* ---------------- animation scheduler (never blocking, cancellable) ----- */
  var anim = {
    tween: function (opts) {
      var start = performance.now(), dead = false;
      var dur = opts.dur, ease = opts.ease || easeInOutCubic;
      function frame(now) {
        if (dead) return;
        var t = clamp((now - start) / dur, 0, 1);
        opts.onUpdate(ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else { dead = true; if (opts.onDone) opts.onDone(); }
      }
      requestAnimationFrame(frame);
      return { cancel: function () { dead = true; } };
    },
    timeline: function (steps) {
      var timers = steps.map(function (s) { return setTimeout(s.fn, s.at); });
      return { cancel: function () { timers.forEach(clearTimeout); } };
    }
  };

  /* ---------------- DOM refs ---------------- */
  var $stage = document.getElementById("stage1920");
  var $world = document.getElementById("world");
  var $routeLayer = document.getElementById("route-layer");
  var $truck = document.getElementById("truck");
  var $cut = document.getElementById("cutlayer");
  var $overlays = document.getElementById("overlays");
  var $rail = document.getElementById("rail");
  var $overview = document.getElementById("overview");
  var $footer = document.getElementById("footer");

  /* ---------------- fit scaler ---------------- */
  function fit() {
    var s = Math.min(innerWidth / DESIGN_W, innerHeight / DESIGN_H);
    $stage.style.transform = "scale(" + s + ")";
  }
  addEventListener("resize", fit);

  /* ---------------- awaiting-figure tokens ---------------- */
  var TOKEN_RE = /\{\{[A-Z0-9_]+\}\}/;
  function isToken(v) { return typeof v === "string" && TOKEN_RE.test(v) && v.trim().replace(TOKEN_RE, "") === ""; }

  function phChip(token) {
    var c = el("span", "ph-chip");
    c.appendChild(el("span", "ph-tag", "awaiting figure"));
    c.appendChild(el("span", "ph-token", token));
    return c;
  }

  // text that may embed {{TOKENS}} → text nodes + inline chips
  function richText(target, text) {
    String(text).split(/(\{\{[A-Z0-9_]+\}\})/).forEach(function (part) {
      if (!part) return;
      if (TOKEN_RE.test(part) && part.replace(TOKEN_RE, "") === "") target.appendChild(phChip(part));
      else target.appendChild(document.createTextNode(part));
    });
    return target;
  }

  /* ---------------- components ---------------- */
  // The ONLY metric renderer. A metric without an anchor refuses to render.
  function Metric(m) {
    if (!m || !m.anchor || !m.anchor.text) {
      console.error("Metric contract violation: metric without anchor", m && m.label);
      return el("div", "metric-error", "METRIC WITHOUT ANCHOR — NOT RENDERED");
    }
    var root = el("div", "metric" + (m.secondary ? " secondary" : ""));
    var v = el("div", "metric-value");
    if (isToken(m.value)) v.appendChild(phChip(m.value));
    else v.textContent = m.value;
    root.appendChild(v);
    root.appendChild(el("div", "metric-label", m.label));
    root.appendChild(richText(el("div", "metric-anchor"), m.anchor.text));
    return root;
  }

  function glass(pos, title) {
    var g = el("div", "glass fx");
    for (var k in pos) g.style[k] = typeof pos[k] === "number" ? pos[k] + "px" : pos[k];
    if (title) g.appendChild(el("div", "panel-title", title));
    return g;
  }

  // channel outcomes only — the words green / yellow / red. Nothing else exists.
  var CHANNEL_WORDS = { green: "GREEN", yellow: "YELLOW", red: "RED" };
  function ChannelRow(ch) {
    var row = el("div", "channel-row");
    ch.options.forEach(function (name) {
      if (!(name in CHANNEL_WORDS)) throw new Error("unknown channel: " + name);
      var chip = el("span", "channel-chip ch-" + name + (name === ch.outcome ? " is-outcome" : ""));
      chip.appendChild(el("span", "dot"));
      chip.appendChild(el("span", null, CHANNEL_WORDS[name]));
      row.appendChild(chip);
    });
    if (ch.note) row.appendChild(el("span", "channel-note", "← " + ch.note));
    return row;
  }

  function LegalChip(token) {
    var c = el("span", "legal-chip");
    c.appendChild(el("span", "pilcrow", "¶"));
    richText(c, "Legal basis: " + token);
    return c;
  }

  function TraceRow(nodes) {
    var row = el("div", "trace-row");
    nodes.forEach(function (name, i) {
      if (i) row.appendChild(el("span", "trace-link"));
      var n = el("span", "trace-node");
      n.appendChild(el("span", "t-dot"));
      n.appendChild(el("span", null, name));
      row.appendChild(n);
    });
    return row;
  }

  function NextStep(ns, pos) {
    var f = el("div", "next-step fx");
    for (var k in pos) f.style[k] = pos[k] + "px";
    f.appendChild(el("span", "ns-tag", ns.tag));
    f.appendChild(el("div", "ns-title", ns.title));
    f.appendChild(el("div", "ns-text", ns.text));
    return f;
  }

  function headBlock(d, center) {
    var hb = el("div", "head-block" + (center ? " center" : ""));
    if (center) {
      // the close stage letterboxes the full corridor mid-frame;
      // the theme statement lives in the calm band above it
      hb.style.left = "50%"; hb.style.top = "56px"; hb.style.transform = "translateX(-50%)";
      hb.style.textAlign = "center"; hb.style.maxWidth = "1400px";
    }
    hb.appendChild(el("div", "eyebrow fx", d.eyebrow));
    hb.appendChild(el("h1", "headline fx", d.headline));
    var sp = el("p", "support fx", d.support);
    if (center) sp.style.maxWidth = "none";
    hb.appendChild(sp);
    if (d.showDisclosure) {
      var disc = el("p", "fx", D.meta.disclosure);
      disc.style.cssText = "font-family:var(--font-mono);font-size:15px;color:var(--ink-faint);margin-top:26px;letter-spacing:.04em";
      hb.appendChild(disc);
    }
    return hb;
  }

  /* ---------------- camera ---------------- */
  var M = PL.master;
  // the full-corridor pull-back expressed in the same {x,y,w} space:
  // k = 1920/M.width; letterboxed inside the frame by shifting y so the
  // plate centers vertically ((1080 - M.height*k)/2 = -y*k).
  function containRect() {
    var k = DESIGN_W / M.width;
    return { x: 0, y: -((DESIGN_H - M.height * k) / 2) / k, w: M.width };
  }
  function resolveCam(def) { return def.camera.fit === "contain" ? containRect() : def.camera; }

  var cam = { x: 0, y: 0, w: 3840 };  // current interpolated rect — preemption snapshot
  function applyCam(c) {
    cam = { x: c.x, y: c.y, w: c.w };
    var k = DESIGN_W / c.w;
    $world.style.transform = "scale(" + k + ") translate(" + -c.x + "px," + -c.y + "px)";
  }
  var cameraTween = null;
  function tweenCam(to, dur, onDone) {
    if (cameraTween) cameraTween.cancel();
    var from = { x: cam.x, y: cam.y, w: cam.w };
    cameraTween = anim.tween({
      dur: dur,
      onUpdate: function (t) {
        applyCam({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, w: from.w + (to.w - from.w) * t });
      },
      onDone: onDone
    });
  }

  /* ---------------- route + truck ---------------- */
  var SVG_NS = "http://www.w3.org/2000/svg";
  var routeTrack, routeGlow, routeLen;
  function buildRoute() {
    $routeLayer.setAttribute("viewBox", "0 0 " + M.width + " " + M.height);
    $routeLayer.setAttribute("width", M.width);
    $routeLayer.setAttribute("height", M.height);
    routeTrack = document.createElementNS(SVG_NS, "path");
    routeTrack.setAttribute("class", "route-track");
    routeTrack.setAttribute("d", M.route.d);
    routeGlow = document.createElementNS(SVG_NS, "path");
    routeGlow.setAttribute("class", "route-glow");
    routeGlow.setAttribute("d", M.route.d);
    $routeLayer.appendChild(routeTrack);
    $routeLayer.appendChild(routeGlow);
    routeLen = routeGlow.getTotalLength();
    routeGlow.style.strokeDasharray = routeLen + " " + routeLen;
    routeGlow.style.strokeDashoffset = String(routeLen);
  }

  var TRUCK_W = 470, TRUCK_H = 260;
  function truckSvg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + TRUCK_W + '" height="' + TRUCK_H + '" viewBox="0 0 470 260">' + inner + "</svg>";
  }
  var TRUCK_BASE =
    '<rect x="8" y="30" width="300" height="160" fill="#1E3640" stroke="#517B82" stroke-width="4"/>' +
    '<line x1="16" y1="34" x2="16" y2="186" stroke="#517B82" stroke-width="3" opacity="0.7"/>' +
    '<g stroke="#28444C" stroke-width="3">' +
    '<line x1="58" y1="34" x2="58" y2="186"/><line x1="108" y1="34" x2="108" y2="186"/>' +
    '<line x1="158" y1="34" x2="158" y2="186"/><line x1="208" y1="34" x2="208" y2="186"/>' +
    '<line x1="258" y1="34" x2="258" y2="186"/></g>' +
    '<path d="M312 190 L312 62 L372 62 L424 112 L434 190 Z" fill="#22404A" stroke="#517B82" stroke-width="4"/>' +
    '<path d="M368 72 L404 108 L368 108 Z" fill="#9FDCD2" opacity="0.85"/>' +
    '<rect x="8" y="190" width="430" height="14" fill="#0F1B20"/>' +
    '<g fill="#0A1013" stroke="#3E5A62" stroke-width="4">' +
    '<circle cx="70" cy="226" r="26"/><circle cx="150" cy="226" r="26"/>' +
    '<circle cx="230" cy="226" r="26"/><circle cx="388" cy="226" r="26"/></g>' +
    '<g fill="#3E5A62"><circle cx="70" cy="226" r="8"/><circle cx="150" cy="226" r="8"/>' +
    '<circle cx="230" cy="226" r="8"/><circle cx="388" cy="226" r="8"/></g>';
  var TRUCK_VARIANTS = {
    scanned:
      '<rect x="2" y="24" width="312" height="172" rx="10" fill="none" stroke="#3FE0C5" stroke-width="5" opacity="0.9"/>' +
      '<circle cx="340" cy="52" r="9" fill="#3FE0C5"/>',
    sealed:
      '<rect x="12" y="96" width="26" height="32" rx="4" fill="#D9A44A"/>' +
      '<rect x="20" y="106" width="10" height="12" fill="#7A5A20"/>'
  };
  var truckT = 0, truckTween = null, truckBob;
  function buildTruck() {
    truckBob = el("div", "truck-bob");
    truckBob.style.cssText = "position:absolute;left:" + (-TRUCK_W / 2) + "px;top:" + (-TRUCK_H + 12) + "px;width:" + TRUCK_W + "px;height:" + TRUCK_H + "px";
    var base = el("div", "truck-variant is-on");
    base.innerHTML = truckSvg(TRUCK_BASE);
    truckBob.appendChild(base);
    ["scanned", "sealed"].forEach(function (name) {
      var v = el("div", "truck-variant");
      v.dataset.variant = name;
      v.innerHTML = truckSvg(TRUCK_VARIANTS[name]);
      truckBob.appendChild(v);
    });
    $truck.appendChild(truckBob);
  }
  function setVariant(name) {
    truckBob.querySelectorAll("[data-variant]").forEach(function (v) {
      v.classList.toggle("is-on", v.dataset.variant === name || (name === "sealed" && v.dataset.variant === "scanned"));
    });
  }
  function setTruckT(t) {
    truckT = clamp(t, 0, 1);
    var p = routeGlow.getPointAtLength(truckT * routeLen);
    var p2 = routeGlow.getPointAtLength(Math.min(routeLen, (truckT + 0.004) * routeLen));
    var ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
    $truck.style.transform = "translate(" + p.x + "px," + p.y + "px) rotate(" + ang + "deg)";
    routeGlow.style.strokeDashoffset = String(routeLen * (1 - truckT));
  }
  function tweenTruck(to, dur) {
    if (truckTween) truckTween.cancel();
    var from = truckT;
    if (Math.abs(to - from) < 0.0001) return setTruckT(to);
    truckTween = anim.tween({ dur: dur, onUpdate: function (t) { setTruckT(from + (to - from) * t); } });
  }

  /* ---------------- cut layer (secondary plates) ---------------- */
  // all secondary plates are instantiated at init so every request happens
  // in the load window — nothing loads later (the no-network-after-load rule)
  var currentCut = null, cutImgs = {};
  function initCuts() {
    Object.keys(PL).forEach(function (id) {
      if (id === "master") return;
      var p = PL[id];
      var img = document.createElement("img");
      img.src = p.src; img.width = p.width; img.height = p.height; img.alt = "";
      img.style.transform = "scale(" + DESIGN_W / p.width + ")";
      img.style.display = "none";
      $cut.appendChild(img);
      cutImgs[id] = img;
    });
  }
  function showCut(id, animate) {
    if (currentCut !== id) {
      Object.keys(cutImgs).forEach(function (k) {
        cutImgs[k].style.display = k === id ? "block" : "none";
      });
      currentCut = id;
    }
    if (!animate) $cut.style.transition = "none";
    $cut.classList.add("is-on");
    if (!animate) { void $cut.offsetWidth; $cut.style.transition = ""; }
  }
  function hideCut(animate) {
    if (!animate) $cut.style.transition = "none";
    $cut.classList.remove("is-on");
    if (!animate) { void $cut.offsetWidth; $cut.style.transition = ""; }
  }

  /* ---------------- overlays ---------------- */
  var overlayIntro = {};   // n -> [{el, at}]
  function reg(n, node, at) {
    (overlayIntro[n] = overlayIntro[n] || []).push({ el: node, at: at });
    return node;
  }
  function regAll(n, root, startAt) {
    var t = startAt || 0;
    root.querySelectorAll(".fx").forEach(function (node) { reg(n, node, t); t += 130; });
    if (root.classList.contains("fx")) reg(n, root, t);
    return root;
  }

  var modeSlot;            // stage-2 metric slot, re-rendered on mode change
  function renderModeMetric() {
    if (!modeSlot) return;
    modeSlot.textContent = "";
    modeSlot.appendChild(Metric(D.stages.flows.modes[engine.mode].metric));
  }

  function buildOverlays() {
    S.forEach(function (def) {
      var d = D.stages[def.key];
      var o = el("section", "stage-overlay");
      o.dataset.n = def.n;
      var center = def.key === "close";
      var hb = headBlock(d, center);
      o.appendChild(hb);
      regAll(def.n, hb, 0);

      var bottomRow = el("div");
      bottomRow.style.cssText = "position:absolute;left:84px;bottom:96px;display:flex;gap:26px;align-items:flex-end;";
      // stage 2's tall panel sits right of the truck-at-the-gate framing
      if (def.key === "flows") { bottomRow.style.left = "auto"; bottomRow.style.right = "240px"; }
      var rowUsed = false;
      function addPanel(g) { bottomRow.appendChild(g); rowUsed = true; return g; }

      if (def.key === "baseline") {
        d.metrics.forEach(function (m) {
          var g = addPanel(glass({}, null));
          g.style.position = "relative";
          g.appendChild(Metric(m));
        });
      }

      if (def.key === "flows") {
        var g = addPanel(glass({}, "one risk management system · all modes"));
        g.style.position = "relative";
        var modeRow = el("div", "mode-row");
        ["road", "rail", "air"].forEach(function (mode) {
          var b = el("button", "mode-btn", D.stages.flows.modes[mode].name);
          b.dataset.mode = mode;
          b.addEventListener("click", function () { setMode(mode); });
          modeRow.appendChild(b);
        });
        g.appendChild(modeRow);
        var mrow = el("div", "metric-row");
        modeSlot = el("div");
        mrow.appendChild(modeSlot);
        var og = el("div");
        og.appendChild(Metric(d.overall));
        mrow.appendChild(og);
        g.appendChild(mrow);
      }

      if (def.key === "border") {
        var gch = addPanel(glass({}, "channel decided at the gate"));
        gch.style.position = "relative";
        gch.appendChild(ChannelRow(d.channels));
        var gm = addPanel(glass({}, null));
        gm.style.position = "relative";
        gm.appendChild(Metric(d.metrics[0]));
      }

      if (def.key === "transit") {
        var gt = addPanel(glass({}, "goods under customs supervision"));
        gt.style.position = "relative";
        gt.appendChild(TraceRow(d.trace));
        var lc = el("div"); lc.style.marginTop = "22px";
        lc.appendChild(LegalChip(d.legalBasis));
        gt.appendChild(lc);
        var gs = addPanel(glass({}, null));
        gs.style.position = "relative";
        gs.appendChild(Metric(d.metrics[0]));
      }

      if (def.key === "warehouse") {
        var gw = addPanel(glass({}, "officer attendance — decided by the rms"));
        gw.style.position = "relative";
        gw.appendChild(Metric(d.metrics[0]));
      }

      if (def.key === "declaration") {
        var gd = addPanel(glass({}, "second assessment — import declaration"));
        gd.style.position = "relative";
        gd.appendChild(ChannelRow(d.channels));
        var gm2 = addPanel(glass({}, null));
        gm2.style.position = "relative";
        gm2.appendChild(Metric(d.metrics[0]));
        o.appendChild(regAll(def.n, NextStep(d.nextStep, { right: 250, top: 130 }), 500));
      }

      if (def.key === "release") {
        d.metrics.forEach(function (m) {
          var g3 = addPanel(glass({}, null));
          g3.style.position = "relative";
          g3.appendChild(Metric(m));
        });
        if (D.meta.trsMethodology) {
          var fn = el("div", "fx", D.meta.trsFootnote);
          fn.style.cssText = "position:absolute;left:86px;bottom:62px;font-family:var(--font-mono);font-size:14px;color:var(--ink-faint);";
          o.appendChild(reg(def.n, fn, 700) && fn);
        }
      }

      if (def.key === "pca") {
        var gl = addPanel(glass({}, "the loop closes"));
        gl.style.position = "relative";
        gl.appendChild(loopMotif());
        var gm3 = addPanel(glass({}, null));
        gm3.style.position = "relative";
        d.metrics.forEach(function (m, i) {
          var node = Metric(m);
          if (i) node.style.marginTop = "24px";
          gm3.appendChild(node);
        });
      }

      if (def.key === "passengers") {
        var gp = addPanel(glass({}, "advance passenger information · passenger targeting system"));
        gp.style.position = "relative";
        gp.appendChild(Metric(d.metrics[0]));
      }

      if (rowUsed) {
        o.appendChild(bottomRow);
        Array.prototype.forEach.call(bottomRow.children, function (g, i) {
          g.classList.add("fx");
          reg(def.n, g, 350 + i * 150);
        });
      }
      $overlays.appendChild(o);
    });
  }

  // post-clearance audit feeding the RMS — drawn, not written
  function loopMotif() {
    var wrap = el("div");
    wrap.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="270" viewBox="0 0 360 270">' +
      '<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 Z" fill="#3FE0C5"/></marker>' +
      '<marker id="arrDim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 Z" fill="#64766F"/></marker></defs>' +
      '<g fill="none" stroke-width="4">' +
      '<path d="M 218 62 A 92 92 0 0 1 250 190" stroke="#64766F" marker-end="url(#arrDim)"/>' +
      '<path d="M 218 214 A 92 92 0 0 1 106 198" stroke="#64766F" marker-end="url(#arrDim)"/>' +
      '<path d="M 78 160 A 92 92 0 0 1 138 62" stroke="#3FE0C5" stroke-width="6" marker-end="url(#arr)" ' +
      'style="filter:drop-shadow(0 0 6px rgba(63,224,197,.6))"/></g>' +
      '<g font-family="IBM Plex Mono, monospace" font-size="19" fill="#E9F2EF" text-anchor="middle">' +
      '<text x="178" y="46">RMS</text><text x="272" y="216">RELEASE</text><text x="84" y="216">AUDIT</text></g>' +
      '<text x="52" y="120" font-family="IBM Plex Mono, monospace" font-size="15" fill="#7FD4C4" text-anchor="middle" transform="rotate(-64 52 120)">FINDINGS</text>' +
      "</svg>";
    return wrap;
  }

  /* ---------------- stage rail ---------------- */
  function speakerOf(n) {
    for (var i = 0; i < D.meta.speakers.length; i++) {
      var sp = D.meta.speakers[i];
      if (n >= sp.stages[0] && n <= sp.stages[1]) return i;
    }
    return 0;
  }
  var railItems = [];
  function buildRail() {
    var segsCol = el("div", "rail-segs");
    var itemsCol = el("div", "rail-items");
    D.meta.speakers.forEach(function (sp) {
      var seg = el("div", "rail-seg");
      seg.style.flexGrow = String(sp.stages[1] - sp.stages[0] + 1);
      seg.appendChild(el("span", "seg-label", sp.short));
      seg.appendChild(el("span", "seg-line"));
      segsCol.appendChild(seg);
    });
    S.forEach(function (def) {
      var d = D.stages[def.key];
      var b = el("button", "rail-item");
      b.setAttribute("aria-label", "Stage " + def.n + " — " + d.headline);
      b.appendChild(el("span", "r-lab", d.rail));
      b.appendChild(el("span", "r-num", String(def.n)));
      b.appendChild(el("span", "r-dot"));
      b.addEventListener("click", function () { goTo(def.n); });
      itemsCol.appendChild(b);
      railItems.push(b);
    });
    $rail.appendChild(itemsCol);
    $rail.appendChild(segsCol);
  }
  function updateRail(n) {
    railItems.forEach(function (b, i) { b.classList.toggle("is-current", i + 1 === n); });
  }

  /* ---------------- overview (Esc) ---------------- */
  var ovCards = [], ovFocus = 0;
  function buildOverview() {
    $overview.appendChild(el("div", "ov-title", "stage overview"));
    var grid = el("div", "ov-grid");
    S.forEach(function (def) {
      var d = D.stages[def.key];
      var seg = speakerOf(def.n);
      var card = el("button", "ov-card seg-" + (seg + 1));
      card.appendChild(el("span", "ov-n", "STAGE " + def.n + " · " + d.rail));
      card.appendChild(el("span", "ov-t", d.headline));
      card.appendChild(el("span", "ov-d", d.overview));
      card.appendChild(el("span", "ov-seg"));
      card.addEventListener("click", function () { goTo(def.n); });
      grid.appendChild(card);
      ovCards.push(card);
    });
    $overview.appendChild(grid);
    var legend = el("div", "ov-legend");
    D.meta.speakers.forEach(function (sp, i) {
      var item = el("span", "lg-" + (i + 1));
      item.appendChild(el("span", "lg-swatch"));
      item.appendChild(document.createTextNode(
        "Stages " + sp.stages[0] + "–" + sp.stages[1] + " · " + sp.credential));
      legend.appendChild(item);
    });
    $overview.appendChild(legend);
  }
  function setOvFocus(i) {
    ovFocus = clamp(i, 0, ovCards.length - 1);
    ovCards.forEach(function (c, j) { c.classList.toggle("is-focus", j === ovFocus); });
  }
  function openOverview() {
    engine.view = "overview";
    ovCards.forEach(function (c, i) { c.classList.toggle("is-current", i + 1 === engine.stage); });
    setOvFocus(engine.stage - 1);
    $overview.classList.add("is-open");
    document.body.dataset.view = "overview";
  }
  function closeOverview() {
    engine.view = "stage";
    $overview.classList.remove("is-open");
    document.body.dataset.view = "stage";
  }

  /* ---------------- engine ---------------- */
  var engine = { stage: 1, mode: "road", view: "stage" };
  var stageTl = null, cutTimer = null;

  function currentCutFor(def) {
    if (def.modes) return def.modes[engine.mode].cut;
    return def.cut;
  }

  function runIntro(n, animate) {
    if (stageTl) stageTl.cancel();
    var items = overlayIntro[n] || [];
    if (!animate) {
      items.forEach(function (it) { it.el.classList.add("is-in"); });
      return;
    }
    items.forEach(function (it) { it.el.classList.remove("is-in"); });
    // force reflow so re-adding the class re-triggers the transition
    void $overlays.offsetWidth;
    stageTl = anim.timeline(items.map(function (it) {
      return { at: it.at, fn: function () { it.el.classList.add("is-in"); } };
    }));
  }

  function applyStage(n, opts) {
    opts = opts || {};
    var animate = opts.animate !== false && !REDUCE;
    var def = S[n - 1];
    var cutId = currentCutFor(def);
    var camTo = resolveCam(def);
    var anchorT = M.route.anchors[def.truck];

    // overlays swap atomically: exactly one active, always
    $overlays.querySelectorAll(".stage-overlay").forEach(function (o) {
      o.classList.toggle("is-active", +o.dataset.n === n);
    });
    runIntro(n, animate);
    updateRail(n);

    if (cutTimer) { clearTimeout(cutTimer); cutTimer = null; }
    if (cutId) {
      showCut(cutId, animate);
      // behind the fade, hold the corridor at this stage's master position
      var snap = function () {
        if (cameraTween) cameraTween.cancel();
        if (truckTween) truckTween.cancel();
        applyCam(camTo); setTruckT(anchorT); setVariant(def.variant);
      };
      if (animate) cutTimer = setTimeout(snap, 520); else snap();
    } else {
      hideCut(animate);
      if (animate) {
        var dist = Math.abs(n - (opts.from || n));
        var dur = dist <= 1 ? 900 : Math.min(1200, 500 + 120 * dist);
        tweenCam(camTo, dur);
        tweenTruck(anchorT, dur);
        setVariant(def.variant);
      } else {
        if (cameraTween) cameraTween.cancel();
        if (truckTween) truckTween.cancel();
        applyCam(camTo); setTruckT(anchorT); setVariant(def.variant);
      }
    }
  }

  function goTo(n, opts) {
    n = clamp(n, 1, S.length);
    opts = opts || {};
    if (engine.view === "overview") closeOverview();
    var from = engine.stage;
    engine.stage = n;                       // state commits at nav time
    document.body.dataset.stage = String(n);
    try { history.replaceState(null, "", "#s" + n); } catch (e) { /* file:// quirks */ }
    applyStage(n, { animate: opts.animate, from: from });
  }
  function next() { goTo(engine.stage + 1); }
  function prev() { goTo(engine.stage - 1); }

  function replayStage() {
    var def = S[engine.stage - 1];
    runIntro(engine.stage, !REDUCE);
    if (!currentCutFor(def)) {
      var t = M.route.anchors[def.truck];
      if (REDUCE) setTruckT(t);
      else { setTruckT(Math.max(0, t - 0.05)); tweenTruck(t, 1100); }
    }
  }

  function setMode(mode) {
    engine.mode = mode;
    document.querySelectorAll(".mode-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.mode === mode);
    });
    renderModeMetric();
    if (engine.stage === 2) {
      var cutId = currentCutFor(S[1]);
      if (cutId) showCut(cutId, !REDUCE); else hideCut(!REDUCE);
    }
  }

  /* ---------------- input ---------------- */
  addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var code = e.code;

    if (engine.view === "overview") {
      var handled = true;
      if (code === "Escape") closeOverview();
      else if (code === "ArrowRight") setOvFocus(ovFocus + 1);
      else if (code === "ArrowLeft") setOvFocus(ovFocus - 1);
      else if (code === "ArrowDown") setOvFocus(ovFocus + 5);
      else if (code === "ArrowUp") setOvFocus(ovFocus - 5);
      else if (code === "Enter" || code === "Space") goTo(ovFocus + 1);
      else if (/^(Digit|Numpad)\d$/.test(code)) goTo(+code.slice(-1) === 0 ? 10 : +code.slice(-1));
      else handled = false;
      if (handled) e.preventDefault();
      return;
    }

    var handled2 = true;
    if (code === "ArrowRight" || code === "ArrowDown" || code === "PageDown") next();
    else if (code === "Space") { if (e.shiftKey) prev(); else next(); }
    else if (code === "ArrowLeft" || code === "ArrowUp" || code === "PageUp") prev();
    else if (code === "Home") goTo(1);
    else if (code === "End") goTo(10);
    else if (code === "Escape") openOverview();
    else if (code === "KeyR") replayStage();
    else if (/^(Digit|Numpad)\d$/.test(code)) {
      var digit = +code.slice(-1);
      goTo(digit === 0 ? 10 : digit);
    }
    else handled2 = false;
    if (handled2) e.preventDefault();
  });

  // wheel → quantized next/prev; inertia can never double-fire
  var WHEEL_FIRE = 100, COOLDOWN = 650, ACCUM_DECAY = 300, REARM_GAP = 120;
  var wheelAccum = 0, lastWheelTs = 0, armed = true, cooldownUntil = 0;
  addEventListener("wheel", function (e) {
    e.preventDefault();
    if (engine.view === "overview") return;
    var now = performance.now();
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    if (now < cooldownUntil) { lastWheelTs = now; return; }
    if (!armed && (now - lastWheelTs > REARM_GAP || dy * wheelAccum < 0)) armed = true;
    if (now - lastWheelTs > ACCUM_DECAY || dy * wheelAccum < 0) wheelAccum = 0;
    lastWheelTs = now;
    if (!armed) return;
    wheelAccum += dy;
    if (Math.abs(wheelAccum) >= WHEEL_FIRE) {
      if (wheelAccum > 0) next(); else prev();
      wheelAccum = 0; armed = false;
      cooldownUntil = now + COOLDOWN;
    }
  }, { passive: false });

  var touchY = null, touchTs = 0;
  addEventListener("touchstart", function (e) {
    touchY = e.touches[0].clientY; touchTs = performance.now();
  }, { passive: true });
  addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
  addEventListener("touchend", function (e) {
    if (touchY == null) return;
    var dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) >= 60 && performance.now() - touchTs < 800) { if (dy > 0) next(); else prev(); }
    touchY = null;
  });

  // cursor hides after 3s idle; nothing depends on hover
  var idleTimer = null;
  function pokeCursor() {
    document.body.classList.remove("cursor-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { document.body.classList.add("cursor-idle"); }, 3000);
  }
  addEventListener("mousemove", pokeCursor);
  addEventListener("mousedown", pokeCursor);

  /* ---------------- footer ---------------- */
  function buildFooter() {
    var disc = el("span", "f-disclosure", D.meta.disclosure);
    var hints = el("span", "f-hints", D.meta.keyHints);
    $footer.appendChild(disc);
    $footer.appendChild(hints);
  }

  /* ---------------- init ---------------- */
  function init() {
    var img = document.createElement("img");
    img.src = M.src; img.width = M.width; img.height = M.height; img.alt = "";
    $world.insertBefore(img, $routeLayer);
    initCuts();
    buildRoute();
    buildTruck();
    buildOverlays();
    buildRail();
    buildOverview();
    buildFooter();
    fit();
    var m = /#s(\d+)/.exec(location.hash);
    var start = m ? clamp(+m[1], 1, S.length) : 1;
    engine.stage = start;
    document.body.dataset.stage = String(start);
    document.body.dataset.view = "stage";
    setMode(engine.mode);
    applyStage(start, { animate: false });
    // then run the opening intro (re-triggerable via R)
    if (!REDUCE) runIntro(start, true);
  }
  init();
})();
