/* =========================================================================
   One Consignment — vertical journey engine.

   The page scrolls normally; there is no slide deck and no camera. Scroll
   position is read once per animation frame and turned into a single number,
   `pageY` — where the viewport's focus line falls in the 1600x8000 corridor
   space defined by plates.js. The truck, the glow trail behind it, its state
   and the current stage all derive from that one value.

   Layout code holds no corridor coordinates (see plates.js) and no figures
   (see demo-data.js).
   ========================================================================= */
(function () {
  "use strict";

  var D = window.demoData, S = window.STAGES, J = window.JOURNEY, PL = window.PLATES;
  var PAGE = J.page, ROWS = J.rows, ROW_H = PAGE.h / ROWS;
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------------- helpers ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function pct(v) { return v + "%"; }

  var mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  var mqWide = matchMedia("(min-width: 1200px)");
  var REDUCE = mqReduce.matches;
  mqReduce.addEventListener("change", function (e) { REDUCE = e.matches; });

  /* ---------------- DOM refs ---------------- */
  var $journey = document.getElementById("journey");
  var $corridor = document.getElementById("corridor");
  var $space = document.getElementById("overlay-space");
  var $routeLayer = document.getElementById("route-layer");
  var $truck = document.getElementById("truck");
  var $pins = document.getElementById("pins");
  var $rows = document.getElementById("rows");
  var $tabs = document.getElementById("tabs");
  var $overview = document.getElementById("overview");
  var $modal = document.getElementById("modal");
  var $progress = document.querySelector("#progress i");

  /* ---------------- icons ---------------- */
  var ICONS = {
    truck: "M3 7h10v8H3zM13 10h4l3 3v2h-7zM6.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    train: "M7 4h10v9H7zM7 9h10M9.5 16.5h5M9 17l-2.5 3M15 17l2.5 3M9.5 11.5h.01M14.5 11.5h.01",
    plane: "M22 3 11 14M22 3l-7 19-4-8-8-4z",
    person: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 5.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6M21 19v-1a4 4 0 0 0-3-3.9",
    shield: "M12 3l8 3v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6zM9 12l2 2 4-4",
    cam: "M3 7.5l12.5-3.2 1.6 5.6L4.6 13.1zM6.4 13v3.2a2.4 2.4 0 0 1-2.4 2.4M17.6 9l3.6 1.6-1.4 3.6-3.4-1.6M9 20h6",
    box: "M3 8l9-4 9 4v8l-9 4-9-4zM3 8l9 4 9-4M12 12v8",
    doc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
    check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-5",
    loop: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
    layers: "M12 3 3 7.5 12 12l9-4.5zM3 12l9 4.5L21 12M3 16.5 12 21l9-4.5",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5.2l3.2 2",
    flag: "M5 21V4h13l-2.2 4L18 12H5",
    scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
    screen: "M3 5h18v11H3zM8 20h8M12 16v4",
    chev: "M6 9l6 6 6-6",
    x: "M6 6l12 12M18 6 6 18",
    arrow: "M5 12h14M13 6l6 6-6 6"
  };
  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    if (cls) svg.setAttribute("class", cls);
    var p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", ICONS[name] || ICONS.doc);
    svg.appendChild(p);
    return svg;
  }

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
    var root = el("div", "metric" + (m.secondary ? " secondary" : "") + (m.compact ? " compact" : ""));
    var v = el("div", "metric-value");
    if (isToken(m.value)) v.appendChild(phChip(m.value));
    else v.textContent = m.value;
    root.appendChild(v);
    root.appendChild(el("div", "metric-label", m.label));
    root.appendChild(richText(el("div", "metric-anchor"), m.anchor.text));
    return root;
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

  function SplitRow(split, note) {
    var wrap = el("div");
    var row = el("div", "split");
    var tone = { green: "g", yellow: "y", red: "r" };
    split.forEach(function (s) {
      var cell = el("div", tone[s.name]);
      var ring = el("div", "s-ring");
      ring.appendChild(icon(s.name === "red" ? "x" : s.name === "yellow" ? "chev" : "check"));
      cell.appendChild(ring);
      cell.appendChild(el("div", "s-name", CHANNEL_WORDS[s.name]));
      cell.appendChild(el("div", "s-share", s.share));
      row.appendChild(cell);
    });
    wrap.appendChild(row);
    if (note) wrap.appendChild(el("div", "facts-note", note));
    return wrap;
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

  function NextStep(ns) {
    var f = el("div", "next-step");
    f.appendChild(el("span", "ns-tag", ns.tag));
    f.appendChild(el("div", "ns-title", ns.title));
    f.appendChild(el("div", "ns-text", ns.text));
    return f;
  }

  function Facts(facts, note) {
    var wrap = el("div", "facts");
    facts.forEach(function (ft) {
      var r = el("div", "fact");
      r.appendChild(el("span", "f-label", ft.label));
      r.appendChild(el("span", "f-value", ft.value));
      wrap.appendChild(r);
    });
    var out = el("div");
    out.appendChild(wrap);
    out.appendChild(el("div", "facts-note", note || "state of this illustrative consignment"));
    return out;
  }

  function CutIn(plateId, caption) {
    var p = PL[plateId];
    if (!p) return null;
    var fig = el("figure", "cut");
    var img = document.createElement("img");
    img.src = p.src; img.width = p.width; img.height = p.height; img.alt = "";
    img.loading = "eager";
    fig.appendChild(img);
    fig.appendChild(el("figcaption", null, caption));
    return fig;
  }

  // post-clearance audit feeding the RMS — drawn, not written
  function loopMotif() {
    var wrap = el("div", "loop-motif");
    wrap.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 270" width="100%" aria-hidden="true">' +
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
      '<text x="52" y="120" font-family="IBM Plex Mono, monospace" font-size="15" fill="#7FD4C4" ' +
      'text-anchor="middle" transform="rotate(-64 52 120)">FINDINGS</text></svg>';
    return wrap;
  }

  /* ---------------- corridor geometry ---------------- */
  // Mirrors tools/build_plates.py exactly; the parameters live in plates.js.
  var WP = J.route.width;
  function halfwAt(y) {
    var t = Math.max(0, y - WP.horizon) / (PAGE.h - WP.horizon);
    return WP.base + WP.span * Math.pow(t, WP.exp);
  }
  // The consignment is drawn 120 units wide. It grows with the road as the
  // corridor comes toward the camera, but on a compressed curve: at full
  // perspective it would be five times bigger at the city than at the border
  // and would swamp the last rows.
  var TRUCK_MID = halfwAt(2400), TRUCK_UNITS = 74, TRUCK_GROWTH = 0.62;

  /* ---------------- route, chevrons, sampling ---------------- */
  var routeGlow, routeHalo, routeLen, SAMPLES = [], N_SAMPLES = 600;
  function buildRoute() {
    var track = document.createElementNS(SVG_NS, "path");
    track.setAttribute("class", "route-track");
    track.setAttribute("d", J.route.d);
    var halo = document.createElementNS(SVG_NS, "path");
    halo.setAttribute("class", "route-halo");
    halo.setAttribute("d", J.route.d);
    routeGlow = document.createElementNS(SVG_NS, "path");
    routeGlow.setAttribute("class", "route-glow");
    routeGlow.setAttribute("d", J.route.d);
    $routeLayer.appendChild(track);
    $routeLayer.appendChild(halo);
    $routeLayer.appendChild(routeGlow);
    routeHalo = halo;
    routeLen = routeGlow.getTotalLength();
    [routeGlow, routeHalo].forEach(function (n) {
      n.style.strokeDasharray = routeLen + " " + routeLen;
      n.style.strokeDashoffset = String(routeLen);
    });

    // Sample once: the scroll handler must never call getPointAtLength.
    for (var i = 0; i <= N_SAMPLES; i++) {
      var p = routeGlow.getPointAtLength(routeLen * i / N_SAMPLES);
      SAMPLES.push({ x: p.x, y: p.y, l: routeLen * i / N_SAMPLES });
    }

    // Flowing chevrons: the running arrows down the carriageway.
    var chevs = document.createElementNS(SVG_NS, "g");
    var step = 74, n = 0;
    for (var y = 190; y < PAGE.h - 80; y += step) {
      var s = at(y), w = halfwAt(y) * 0.34, h = halfwAt(y) * 0.3;
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "chev");
      path.setAttribute("d", "M " + (-w) + " " + (-h) + " L 0 0 L " + w + " " + (-h));
      path.setAttribute("stroke-width", String(Math.max(3, halfwAt(y) * 0.09)));
      path.setAttribute("transform", "translate(" + s.x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" +
        (s.a - 90).toFixed(1) + ")");
      path.style.animationDelay = (-(n % 9) * 0.29).toFixed(2) + "s";
      chevs.appendChild(path);
      n++;
    }
    $routeLayer.appendChild(chevs);
  }

  // route point at page y, by interpolation over the sample table
  function at(y) {
    var lo = 0, hi = SAMPLES.length - 1;
    if (y <= SAMPLES[0].y) lo = hi = 0;
    else if (y >= SAMPLES[hi].y) lo = hi = SAMPLES.length - 1;
    else {
      while (hi - lo > 1) {
        var mid = (lo + hi) >> 1;
        if (SAMPLES[mid].y <= y) lo = mid; else hi = mid;
      }
    }
    var a = SAMPLES[lo], b = SAMPLES[Math.min(SAMPLES.length - 1, lo + 1)];
    var t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
    var ref = SAMPLES[Math.min(SAMPLES.length - 1, lo + 3)];
    return {
      x: a.x + (b.x - a.x) * t,
      l: a.l + (b.l - a.l) * t,
      a: Math.atan2(ref.y - a.y, ref.x - a.x) * 180 / Math.PI
    };
  }

  /* ---------------- truck ---------------- */
  // Front three-quarter view: the corridor recedes toward the border at the top
  // of the page, so the consignment drives toward the camera with its lights on.
  var TW = 120, TH = 152;
  function truckSvg(inner, overflow) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + TW + '" height="' + TH +
      '" viewBox="0 0 ' + TW + ' ' + TH + '" style="overflow:visible">' + inner + "</svg>";
  }
  var TRUCK_BASE =
    '<defs>' +
    '<linearGradient id="tb" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#39474d"/><stop offset="0.45" stop-color="#59696e"/>' +
    '<stop offset="1" stop-color="#2b373c"/></linearGradient>' +
    '<linearGradient id="tc" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#2e3f47"/><stop offset="0.4" stop-color="#4c626b"/>' +
    '<stop offset="1" stop-color="#222e34"/></linearGradient>' +
    '<linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#9fd8ea" stop-opacity="0.5"/>' +
    '<stop offset="1" stop-color="#0d1a20" stop-opacity="0.9"/></linearGradient>' +
    '<radialGradient id="hl"><stop offset="0" stop-color="#fff6dd"/>' +
    '<stop offset="1" stop-color="#ffcf8f" stop-opacity="0"/></radialGradient></defs>' +
    // headlight wash on the road ahead of the cab
    '<path d="M18 128 L-16 190 L136 190 L102 128 Z" fill="url(#hl)" opacity="0.3"/>' +
    '<ellipse cx="60" cy="146" rx="54" ry="11" fill="#03080a" opacity="0.55"/>' +
    // trailer, receding up-page
    '<path d="M22 6 L98 6 L108 76 L12 76 Z" fill="url(#tb)"/>' +
    '<path d="M22 6 L98 6 L96 13 L24 13 Z" fill="#728287" opacity="0.55"/>' +
    '<g stroke="#26343a" stroke-width="1.6" opacity="0.5">' +
    '<path d="M34 8 L28 76"/><path d="M48 7 L45 76"/><path d="M62 7 L62 76"/>' +
    '<path d="M76 7 L79 76"/><path d="M89 8 L95 76"/></g>' +
    // cab
    '<path d="M16 74 L104 74 L110 128 L10 128 Z" fill="url(#tc)"/>' +
    '<path d="M25 80 L95 80 L99 104 L21 104 Z" fill="url(#tg)"/>' +
    '<path d="M25 80 L52 80 L38 104 L21 104 Z" fill="#bfe3ef" opacity="0.14"/>' +
    '<rect x="24" y="108" width="72" height="12" rx="3" fill="#1b262b"/>' +
    '<g stroke="#33454c" stroke-width="1.4"><path d="M28 111h64"/><path d="M28 116h64"/></g>' +
    // wheels
    '<rect x="2" y="104" width="14" height="34" rx="5" fill="#0b1114"/>' +
    '<rect x="104" y="104" width="14" height="34" rx="5" fill="#0b1114"/>' +
    // mirrors, roof markers
    '<path d="M14 78 L4 84" stroke="#26343a" stroke-width="3"/>' +
    '<path d="M106 78 L116 84" stroke="#26343a" stroke-width="3"/>' +
    '<g fill="#ffb24a"><circle cx="42" cy="76" r="2"/><circle cx="60" cy="76" r="2"/>' +
    '<circle cx="78" cy="76" r="2"/></g>' +
    // headlights
    '<g><rect x="17" y="118" width="20" height="9" rx="4" fill="#fff4d6"/>' +
    '<rect x="83" y="118" width="20" height="9" rx="4" fill="#fff4d6"/></g>' +
    '<g opacity="0.75"><ellipse cx="27" cy="122" rx="17" ry="10" fill="#ffcf8f" opacity="0.5"/>' +
    '<ellipse cx="93" cy="122" rx="17" ry="10" fill="#ffcf8f" opacity="0.5"/></g>';
  var TRUCK_VARIANTS = {
    scanned:
      '<rect x="8" y="2" width="104" height="78" rx="7" fill="none" stroke="#3FE0C5" stroke-width="3" opacity="0.9"/>' +
      '<circle cx="60" cy="2" r="5" fill="#3FE0C5"/>',
    sealed:
      '<rect x="52" y="30" width="16" height="20" rx="3" fill="#D9A44A"/>' +
      '<rect x="57" y="36" width="6" height="8" fill="#7A5A20"/>'
  };
  var truckBob;
  function buildTruck() {
    truckBob = el("div", "truck-bob");
    truckBob.style.cssText = "left:0;top:0;width:" + TW + "px;height:" + TH + "px";
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
  var lastVariant = null;
  function setVariant(name) {
    if (name === lastVariant) return;
    lastVariant = name;
    truckBob.querySelectorAll("[data-variant]").forEach(function (v) {
      v.classList.toggle("is-on", v.dataset.variant === name ||
        (name === "sealed" && v.dataset.variant === "scanned"));
    });
  }
  function variantAt(y) {
    var name = J.truck.variants[0].name;
    J.truck.variants.forEach(function (v) { if (y >= v.from) name = v.name; });
    return name;
  }

  /* ---------------- stage rows ---------------- */
  var rowEls = [], modeSlot = null, modeCutSlot = null;

  function fx(node, order) {
    node.classList.add("fx");
    node.style.setProperty("--d", (order * 0.09).toFixed(2) + "s");
    return node;
  }

  function buildRows() {
    S.forEach(function (def, i) {
      var d = D.stages[def.key];
      var row = el("section", "row");
      row.dataset.n = def.n;
      row.id = "stage-" + def.n;

      /* --- left: numbered timeline card --- */
      var step = el("div", "step");
      step.appendChild(fx(el("div", "step-n", String(def.n)), 0));
      // The spoken line lives in the timeline card, not floating over the art:
      // a headline centred on the corridor collides with whatever landmark the
      // stage is about.
      var card = el("div", "card glass");
      card.appendChild(el("div", "c-eyebrow", d.card.title));
      card.appendChild(el("h2", "c-title", d.headline));
      card.appendChild(el("p", "c-text", d.support));
      if (d.showDisclosure) card.appendChild(el("p", "c-note", D.meta.disclosure));
      if (def.key === "release" && D.meta.trsMethodology) {
        card.appendChild(el("p", "c-note", D.meta.trsFootnote));
      }
      var icons = el("div", "c-icons");
      [d.card.icon, d.panel.icon].filter(function (v, k, arr) { return arr.indexOf(v) === k; })
        .forEach(function (nm) {
          var b = el("span"); b.appendChild(icon(nm)); icons.appendChild(b);
        });
      card.appendChild(icons);
      if (def.key === "flows") {
        modeCutSlot = el("div");
        card.appendChild(modeCutSlot);
      } else if (def.cut) {
        var ci = CutIn(def.cut, d.card.title);
        if (ci) card.appendChild(ci);
      }
      step.appendChild(fx(card, 1));
      row.appendChild(step);

      /* --- right: the metric panel --- */
      var wrap = el("div", "panel-wrap");
      var panel = el("div", "panel glass");
      var ph = el("div", "p-head");
      ph.appendChild(icon(d.panel.icon));
      ph.appendChild(el("span", null, d.panel.title));
      panel.appendChild(ph);
      if (d.panel.facts) panel.appendChild(Facts(d.panel.facts, d.panel.factsNote));

      if (def.key === "flows") {
        var modeRow = el("div", "mode-row");
        ["road", "rail", "air"].forEach(function (mode) {
          var b = el("button", "mode-btn", d.modes[mode].name);
          b.type = "button";
          b.dataset.mode = mode;
          b.addEventListener("click", function () { setMode(mode); });
          modeRow.appendChild(b);
        });
        panel.appendChild(modeRow);
        modeSlot = el("div");
        panel.appendChild(modeSlot);
        panel.appendChild(Metric(d.overall));
      }
      if (d.split) panel.appendChild(SplitRow(d.split, d.splitNote));
      if (d.channels) panel.appendChild(ChannelRow(d.channels));
      if (d.trace) panel.appendChild(TraceRow(d.trace));
      (d.metrics || []).forEach(function (m) { panel.appendChild(Metric(m)); });
      if (d.legalBasis) panel.appendChild(LegalChip(d.legalBasis));
      if (def.key === "pca") panel.appendChild(loopMotif());
      if (d.nextStep) panel.appendChild(NextStep(d.nextStep));

      wrap.appendChild(fx(panel, 2));
      row.appendChild(wrap);

      $rows.appendChild(row);
      rowEls.push(row);
    });
  }

  function renderModeMetric() {
    if (modeSlot) {
      modeSlot.textContent = "";
      modeSlot.appendChild(Metric(D.stages.flows.modes[engine.mode].metric));
    }
    if (modeCutSlot) {
      modeCutSlot.textContent = "";
      var id = engine.mode === "road" ? "roadCorridor" : S[1].modes[engine.mode].cut;
      var ci = CutIn(id, D.stages.flows.modes[engine.mode].name);
      if (ci) modeCutSlot.appendChild(ci);
    }
  }

  /* ---------------- map pins ---------------- */
  function buildPins() {
    J.pins.forEach(function (p) {
      var s = at(p.y);
      // route x is offset into the offside lane; recover the centreline first
      var centre = s.x - J.route.lane * halfwAt(p.y);
      var x = centre + p.side * halfwAt(p.y) * 2.35;
      var node = el("div", "pin");
      node.style.left = pct((clamp(x, 40, PAGE.w - 40) / PAGE.w * 100).toFixed(3));
      node.style.top = pct((p.y / PAGE.h * 100).toFixed(3));
      node.title = p.label;
      var body = el("div", "pin-body");
      body.appendChild(icon(p.icon));
      node.appendChild(body);
      $pins.appendChild(node);
    });
  }

  /* ---------------- chrome ---------------- */
  function buildChrome() {
    var brand = document.getElementById("brand");
    var emb = document.createElementNS(SVG_NS, "svg");
    emb.setAttribute("viewBox", "0 0 40 40");
    emb.setAttribute("class", "emblem");
    emb.setAttribute("aria-hidden", "true");
    emb.innerHTML =
      '<circle cx="20" cy="20" r="18" fill="none" stroke="#3fe0c5" stroke-width="1.4" opacity="0.55"/>' +
      '<circle cx="20" cy="20" r="13.5" fill="none" stroke="#3fe0c5" stroke-width="0.9" opacity="0.35"/>' +
      '<path d="M20 8 L20 32 M14 15 L20 9 L26 15 M14 25 L20 31 L26 25" fill="none" stroke="#7fd4c4" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
    brand.appendChild(emb);
    var txt = el("div");
    txt.appendChild(el("div", "b-org", D.meta.org));
    txt.appendChild(el("div", "b-sub", D.meta.orgSub));
    brand.appendChild(txt);

    D.meta.tabs.forEach(function (t) {
      var b = el("button", "tab");
      b.type = "button";
      b.dataset.tab = t.id;
      b.appendChild(icon(t.icon));
      b.appendChild(el("span", null, t.label));
      b.addEventListener("click", function () {
        if (t.jumpTo) goToStage(t.jumpTo);
        else setMode(t.id);
      });
      $tabs.appendChild(b);
    });

    var tc = document.getElementById("tc-btn");
    tc.appendChild(el("span", null, D.meta.targetingCentre.link));
    tc.appendChild(icon("arrow"));
    tc.addEventListener("click", openModal);

    var hint = document.getElementById("scroll-hint");
    hint.appendChild(el("span", "mouse"));
    hint.appendChild(el("span", null, D.meta.scrollHint));

    var badge = document.getElementById("illustrative");
    if (D.meta.figuresIllustrative) badge.textContent = D.meta.illustrativeBadge;
    else badge.remove();

    document.getElementById("overview-btn").addEventListener("click", openOverview);

    var tail = document.getElementById("tail");
    tail.appendChild(el("div", "t-sub", D.stages.close.eyebrow));
    tail.appendChild(el("div", "t-theme", D.meta.theme2026));
    tail.appendChild(el("p", "t-note", D.meta.disclosure));
    var top = el("button", "t-top", "BACK TO THE BORDER");
    top.type = "button";
    top.addEventListener("click", function () { goToStage(1); });
    tail.appendChild(top);
  }

  /* ---------------- overview ---------------- */
  function speakerOf(n) {
    for (var i = 0; i < D.meta.speakers.length; i++) {
      var sp = D.meta.speakers[i];
      if (n >= sp.stages[0] && n <= sp.stages[1]) return i;
    }
    return 0;
  }
  var ovCards = [], ovFocus = 0;
  function buildOverview() {
    var x = el("button", "close-x");
    x.type = "button";
    x.appendChild(icon("x"));
    x.addEventListener("click", closeOverlays);
    $overview.appendChild(x);
    $overview.appendChild(el("div", "ov-title", "stage overview"));
    var grid = el("div", "ov-grid");
    S.forEach(function (def) {
      var d = D.stages[def.key];
      var card = el("button", "ov-card seg-" + (speakerOf(def.n) + 1));
      card.type = "button";
      card.appendChild(el("span", "ov-n", "STAGE " + def.n + " · " + d.rail));
      card.appendChild(el("span", "ov-t", d.headline));
      card.appendChild(el("span", "ov-d", d.overview));
      card.appendChild(el("span", "ov-seg"));
      card.addEventListener("click", function () { closeOverlays(); goToStage(def.n); });
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

  /* ---------------- targeting centre modal ---------------- */
  function buildModal() {
    var x = el("button", "close-x");
    x.type = "button";
    x.appendChild(icon("x"));
    x.addEventListener("click", closeOverlays);
    $modal.appendChild(x);
    var body = el("div", "modal-body");
    var p = PL.targetingCentre;
    var img = document.createElement("img");
    img.src = p.src; img.width = p.width; img.height = p.height; img.alt = "";
    body.appendChild(img);
    body.appendChild(el("h2", null, D.meta.targetingCentre.title));
    body.appendChild(el("p", null, D.meta.targetingCentre.text));
    $modal.appendChild(body);
  }
  function openModal() {
    engine.view = "modal";
    $modal.classList.add("is-open");
    document.body.dataset.view = "modal";
  }
  function closeOverlays() {
    engine.view = "journey";
    $overview.classList.remove("is-open");
    $modal.classList.remove("is-open");
    document.body.dataset.view = "journey";
  }

  /* ---------------- engine ---------------- */
  var engine = { stage: 1, mode: "road", view: "journey" };

  function setMode(mode) {
    engine.mode = mode;
    document.body.dataset.mode = mode;
    document.querySelectorAll(".mode-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.mode === mode);
    });
    $tabs.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.tab === mode);
    });
    renderModeMetric();
  }

  function revealAround(n) {
    for (var i = Math.max(1, n - 1); i <= Math.min(S.length, n + 1); i++) {
      if (rowEls[i - 1]) rowEls[i - 1].classList.add("is-in");
    }
  }
  function setStage(n) {
    revealAround(n);
    if (n === engine.stage) return;
    engine.stage = n;
    document.body.dataset.stage = String(n);
    rowEls.forEach(function (r, i) { r.classList.toggle("is-current", i + 1 === n); });
    try { history.replaceState(null, "", "#stage-" + n); } catch (e) { /* file:// quirks */ }
  }

  // Scroll offset that puts row n's centre on the truck's focus line.
  function scrollTargetFor(n) {
    if (!mqWide.matches) return null;
    var k = $journey.clientWidth / PAGE.w;
    var top = $journey.getBoundingClientRect().top + window.scrollY;
    return top + (n - 0.5) * ROW_H * k - innerHeight * J.truck.focus;
  }
  function goToStage(n) {
    n = clamp(n, 1, S.length);
    closeOverlays();
    var t = scrollTargetFor(n);
    if (t == null) {
      rowEls[n - 1].scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
    } else {
      window.scrollTo({ top: Math.max(0, t), behavior: REDUCE ? "auto" : "smooth" });
    }
  }

  /* ---------------- scroll → corridor ---------------- */
  var ticking = false, lastK = -1;
  function onScrollFrame() {
    ticking = false;
    var docH = document.documentElement.scrollHeight - innerHeight;
    $progress.style.width = (docH > 0 ? clamp(window.scrollY / docH, 0, 1) * 100 : 0) + "%";
    document.body.classList.toggle("is-end", docH > 0 && window.scrollY / docH > 0.965);

    if (!mqWide.matches) return;
    var k = $journey.clientWidth / PAGE.w;
    if (k !== lastK) {
      lastK = k;
      $space.style.transform = "scale(" + k + ")";
    }

    var rect = $journey.getBoundingClientRect();
    var pageY = clamp((innerHeight * J.truck.focus - rect.top) / k, SAMPLES[0].y,
                      SAMPLES[SAMPLES.length - 1].y);
    var s = at(pageY);
    var ts = TRUCK_UNITS * Math.pow(halfwAt(pageY) / TRUCK_MID, TRUCK_GROWTH) / TW;
    $truck.style.transform = "translate(" + s.x.toFixed(2) + "px," + pageY.toFixed(2) + "px) rotate(" +
      (s.a - 90).toFixed(2) + "deg) scale(" + ts.toFixed(3) + ") translate(" + (-TW / 2) + "px," + (-TH) + "px)";
    var off = String(routeLen - s.l);
    routeGlow.style.strokeDashoffset = off;
    routeHalo.style.strokeDashoffset = off;
    setVariant(variantAt(pageY));
    // Current stage is the row whose card sits nearest the middle of the
    // viewport — not the row under the truck. The first row cannot be scrolled
    // onto the focus line (there is nothing above it), and reading the stage
    // off the truck would report stage 2 at the top of the page.
    var centreY = (innerHeight / 2 - rect.top) / k;
    setStage(clamp(Math.round(centreY / ROW_H - 0.5) + 1, 1, S.length));
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
  }

  /* ---------------- reveal ---------------- */
  function observeRows() {
    if (!("IntersectionObserver" in window)) {
      rowEls.forEach(function (r) { r.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          if (!mqWide.matches) setStage(+e.target.dataset.n);
        }
      });
    }, { rootMargin: "-22% 0px -22% 0px", threshold: 0 });
    rowEls.forEach(function (r) { io.observe(r); });
  }
  function replayStage() {
    var row = rowEls[engine.stage - 1];
    if (!row) return;
    row.classList.remove("is-in");
    void row.offsetWidth;               // force reflow so the transition re-runs
    row.classList.add("is-in");
  }

  /* ---------------- input ---------------- */
  addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var code = e.code;
    if (engine.view !== "journey") {
      var handled = true;
      if (code === "Escape") closeOverlays();
      else if (engine.view === "overview" && code === "ArrowRight") setOvFocus(ovFocus + 1);
      else if (engine.view === "overview" && code === "ArrowLeft") setOvFocus(ovFocus - 1);
      else if (engine.view === "overview" && code === "ArrowDown") setOvFocus(ovFocus + 5);
      else if (engine.view === "overview" && code === "ArrowUp") setOvFocus(ovFocus - 5);
      else if (engine.view === "overview" && (code === "Enter" || code === "Space")) goToStage(ovFocus + 1);
      else if (engine.view === "overview" && /^(Digit|Numpad)\d$/.test(code)) {
        goToStage(+code.slice(-1) === 0 ? 10 : +code.slice(-1));
      } else handled = false;
      if (handled) e.preventDefault();
      return;
    }
    var used = true;
    if (code === "ArrowDown" || code === "PageDown") goToStage(engine.stage + 1);
    else if (code === "ArrowUp" || code === "PageUp") goToStage(engine.stage - 1);
    else if (code === "Space") goToStage(engine.stage + (e.shiftKey ? -1 : 1));
    else if (code === "Home") goToStage(1);
    else if (code === "End") goToStage(S.length);
    else if (code === "Escape") openOverview();
    else if (code === "KeyR") replayStage();
    else if (/^(Digit|Numpad)\d$/.test(code)) goToStage(+code.slice(-1) === 0 ? 10 : +code.slice(-1));
    else used = false;
    if (used) e.preventDefault();
  });

  /* ---------------- init ---------------- */
  function init() {
    var root = document.documentElement.style;
    root.setProperty("--page-aspect", PAGE.w + " / " + PAGE.h);
    root.setProperty("--sec-h", (100 / J.sections.length) + "%");
    $space.style.width = PAGE.w + "px";
    $space.style.height = PAGE.h + "px";
    $routeLayer.style.width = PAGE.w + "px";
    $routeLayer.style.height = PAGE.h + "px";
    $routeLayer.setAttribute("viewBox", "0 0 " + PAGE.w + " " + PAGE.h);
    var share = 100 / J.sections.length;
    J.sections.forEach(function (sec, i) {
      var img = document.createElement("img");
      img.src = sec.src; img.width = sec.w; img.height = sec.h; img.alt = "";
      img.style.setProperty("--t", (i * share) + "%");
      $corridor.appendChild(img);
    });
    buildRoute();
    buildTruck();
    buildRows();
    buildPins();
    buildChrome();
    buildOverview();
    buildModal();
    setMode(engine.mode);
    observeRows();

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    mqWide.addEventListener("change", onScroll);
    onScrollFrame();

    var m = /#stage-(\d+)/.exec(location.hash);
    if (m) {
      var n = clamp(+m[1], 1, S.length);
      requestAnimationFrame(function () {
        var t = scrollTargetFor(n);
        if (t == null) rowEls[n - 1].scrollIntoView();
        else window.scrollTo({ top: Math.max(0, t) });
      });
    }
  }
  init();
})();
