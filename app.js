/* =========================================================================
   Risk management, end to end — the page engine.

   The page scrolls normally; there is no slide deck and no camera. Scroll
   position is read once per animation frame and turned into a single number,
   `pageY` — where the viewport's focus line falls in the 1600x4800 corridor
   space defined by plates.js. The truck, the glow trail behind it, its state
   and the current beat all derive from that one value.

   The deck is NINE beats across SEVEN sections (see plates.js). Six beats are
   rows of the corridor; three are full-viewport screens that are not places on
   the road — WCO cooperation, the targeting centre, and passenger control.
   Both kinds are navigated identically: every beat is scrolled so that its own
   centre lands on the truck's focus line, and the current beat is whichever
   beat's centre is nearest that line.

   The page has no chrome of its own — no bars, no tabs. `Esc` opens the running
   order, 1-7 jump to a section, the arrows step a beat.

   Layout code holds no corridor coordinates (see plates.js) and no figures
   (see demo-data.js).
   ========================================================================= */
(function () {
  "use strict";

  var D = window.demoData, BEATS = window.BEATS, SECTIONS = window.SECTIONS;
  var J = window.JOURNEY, PL = window.PLATES;
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
  function svgEl(name, attrs) {
    var n = document.createElementNS(SVG_NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, String(attrs[k]));
    return n;
  }

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
  var $labels = document.getElementById("labels");
  var $rows = document.getElementById("rows");
  var $stage = document.getElementById("stage");
  var $overview = document.getElementById("overview");
  var $modal = document.getElementById("modal");
  var $progress = document.querySelector("#progress i");

  /* ---------------- icons ---------------- */
  var ICONS = {
    truck: "M3 7h10v8H3zM13 10h4l3 3v2h-7zM6.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
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
    /* the six channels the targeting centre watches in real time (section 2) */
    car: "M4 12.5l1.9-4.7A2 2 0 0 1 7.8 6.5h8.4a2 2 0 0 1 1.9 1.3l1.9 4.7M4 12.5h16v4.5H4zM7.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M16.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
    train: "M6 3h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 10h16M12 3v7M9 14h6M8 17l-3 4M16 17l3 4",
    pax: "M11 5.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4M12.4 7.4 9.6 9.2l1.3 3.6L9 21M11.4 12.2 14.4 14.6 15 21M9.6 9.2 6.6 11.6M17.5 11h4.5v10h-4.5zM19 11V9.4h1.6V11",
    warehouse: "M2.5 21V9.2L12 4.6l9.5 4.6V21zM2.5 21h19M7.5 21v-7h9v7M12 14v7M7.5 17.5h9",
    chev: "M6 9l6 6 6-6",
    x: "M6 6l12 12M18 6 6 18",
    arrow: "M5 12h14M13 6l6 6-6 6"
  };
  function icon(name, cls) {
    var svg = svgEl("svg", {
      viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.7",
      "stroke-linecap": "round", "stroke-linejoin": "round", focusable: "false",
      "aria-hidden": "true", "class": cls
    });
    svg.appendChild(svgEl("path", { d: ICONS[name] || ICONS.doc }));
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

  /* =========================================================================
     COMPONENTS
     Two contracts are enforced here rather than trusted: a metric without an
     anchor and a chart without a caption and a range both refuse to render and
     say so on screen. Both failures are silent otherwise — a number with
     nothing to measure it against still looks like a fact.
     ========================================================================= */
  function contractError(what) {
    console.error("Contract violation:", what);
    return el("div", "metric-error", what.toUpperCase());
  }

  function Metric(m) {
    if (!m || !m.anchor || !m.anchor.text) {
      return contractError("metric without anchor — not rendered" + (m && m.label ? ": " + m.label : ""));
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

  function Facts(facts, note) {
    var out = el("div");
    var wrap = el("div", "facts");
    facts.forEach(function (ft) {
      var r = el("div", "fact");
      r.appendChild(el("span", "f-label", ft.label));
      r.appendChild(el("span", "f-value", ft.value));
      wrap.appendChild(r);
    });
    out.appendChild(wrap);
    out.appendChild(el("div", "facts-note", note || "state of this illustrative consignment"));
    return out;
  }

  /* Counts that are not metrics: a network inventory (61 posts, and the
     transactions each mode carries) has no 2018 baseline to be measured
     against, and pretending otherwise would put a fake anchor under it. It is
     rendered as a strip of tiles instead, plainly labelled, so it cannot be
     mistaken for a trend. */
  function TileStrip(tiles) {
    var strip = el("div", "tiles");
    tiles.forEach(function (t) {
      var cell = el("div", "tile");
      var head = el("div", "t-head");
      head.appendChild(icon(t.icon));
      head.appendChild(el("span", null, t.label));
      cell.appendChild(head);
      var v = el("div", "t-value");
      if (isToken(t.value)) v.appendChild(phChip(t.value));
      else v.textContent = t.value;
      cell.appendChild(v);
      cell.appendChild(el("div", "t-unit", t.unit));
      strip.appendChild(cell);
    });
    return strip;
  }

  /* The six channels the targeting centre watches at once — the band along the
     foot of section 2. The note about the control-room art rides with it. */
  function MonitorBand(mon, note) {
    var band = el("div", "mon-band");
    band.appendChild(el("div", "mon-title", mon.title));
    var row = el("div", "mon-modes");
    mon.modes.forEach(function (m) {
      var chip = el("div", "mon-mode");
      chip.appendChild(icon(m.icon));
      chip.appendChild(el("span", null, m.label));
      row.appendChild(chip);
    });
    band.appendChild(row);
    if (note) band.appendChild(el("p", "mon-note", note));
    return band;
  }

  function Bullets(list, cls) {
    var ul = el("ul", "bullets" + (cls ? " " + cls : ""));
    list.forEach(function (t) {
      var li = el("li");
      li.appendChild(icon("chev", "b-mark"));
      li.appendChild(richText(el("span"), t));
      ul.appendChild(li);
    });
    return ul;
  }

  function CutIn(plateId, caption) {
    var p = PL[plateId];
    if (!p) return null;
    var fig = el("figure", "cut");
    var img = document.createElement("img");
    img.src = p.src; img.width = p.width; img.height = p.height; img.alt = "";
    img.loading = "eager";
    fig.appendChild(img);
    if (caption) fig.appendChild(el("figcaption", null, caption));
    return fig;
  }

  /* =========================================================================
     CHARTS
     All four forms are inline SVG or plain boxes, driven entirely from
     demo-data.js, and all four sit under one figure shell that carries the
     caption, the range and — for screen readers and for anyone who would
     rather read the numbers — a table of the same data.
     ========================================================================= */
  function chartFrame(spec, body, legend) {
    if (!spec.caption || !spec.range) {
      return contractError("chart without caption or range — not rendered");
    }
    var fig = el("figure", "chart");
    var head = el("figcaption", "ch-head");
    head.appendChild(el("span", "ch-caption", spec.caption));
    head.appendChild(el("span", "ch-range", spec.range));
    fig.appendChild(head);
    fig.appendChild(body);
    if (legend) fig.appendChild(legend);
    if (spec.note) fig.appendChild(el("p", "ch-note", spec.note));
    return fig;
  }

  function dataTable(cols, rows, caption) {
    // `overflow` does not apply to a table box, so the usual visually-hidden
    // recipe does not clip one: the table lays out at its natural width and
    // widens the document. The clipping goes on a wrapping block instead.
    var hidden = el("div", "sr-only");
    var t = el("table");
    t.appendChild(el("caption", null, caption));
    var thead = el("thead"), tr = el("tr");
    cols.forEach(function (c) { var th = el("th", null, c); th.scope = "col"; tr.appendChild(th); });
    thead.appendChild(tr);
    t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var row = el("tr");
      r.forEach(function (c, i) {
        var cell = el(i ? "td" : "th", null, String(c));
        if (!i) cell.scope = "row";
        row.appendChild(cell);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    hidden.appendChild(t);
    return hidden;
  }

  /* Change over time. Series are indexed in the data so that one axis carries
     them all — a second y-scale is the one thing a chart may never have. */
  var LC = { w: 400, h: 190, l: 34, r: 46, t: 14, b: 26 };
  function LineChart(spec) {
    var vals = spec.series.reduce(function (a, s) { return a.concat(s.values); }, []);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = (hi - lo) * 0.12 || 10;
    lo = Math.max(0, lo - pad); hi = hi + pad;
    var iw = LC.w - LC.l - LC.r, ih = LC.h - LC.t - LC.b;
    var X = function (i) { return LC.l + iw * i / Math.max(1, spec.x.length - 1); };
    var Y = function (v) { return LC.t + ih * (1 - (v - lo) / (hi - lo)); };

    var svg = svgEl("svg", { viewBox: "0 0 " + LC.w + " " + LC.h, "class": "ch-svg",
                             role: "img", "aria-label": spec.caption + ", " + spec.range });
    // recessive grid, and the axis it implies — no box, no ticks
    [0, 0.5, 1].forEach(function (f) {
      var y = LC.t + ih * f;
      svg.appendChild(svgEl("line", { x1: LC.l, y1: y, x2: LC.l + iw, y2: y, "class": "ch-grid" }));
    });
    svg.appendChild(svgEl("text", { x: LC.l - 6, y: LC.t + 4, "class": "ch-axis ch-axis-y" })).textContent = Math.round(hi);
    svg.appendChild(svgEl("text", { x: LC.l - 6, y: LC.t + ih + 4, "class": "ch-axis ch-axis-y" })).textContent = Math.round(lo);
    svg.appendChild(svgEl("text", { x: LC.l, y: LC.h - 6, "class": "ch-axis" })).textContent = spec.x[0];
    svg.appendChild(svgEl("text", { x: LC.l + iw, y: LC.h - 6, "class": "ch-axis ch-axis-end" }))
       .textContent = spec.x[spec.x.length - 1];

    var hoverRule = svgEl("line", { y1: LC.t, y2: LC.t + ih, "class": "ch-rule" });
    svg.appendChild(hoverRule);

    spec.series.forEach(function (s) {
      var d = s.values.map(function (v, i) { return (i ? "L" : "M") + X(i) + " " + Y(v); }).join(" ");
      svg.appendChild(svgEl("path", { d: d, "class": "ch-line tone-" + s.tone }));
      // the end of the line is where the story is, so that is the only point
      // that gets a marker and a label
      var lastI = s.values.length - 1;
      svg.appendChild(svgEl("circle", { cx: X(lastI), cy: Y(s.values[lastI]), r: 5,
                                        "class": "ch-dot tone-" + s.tone }));
      if (s.end) {
        var lbl = svgEl("text", { x: X(lastI) + 10, y: Y(s.values[lastI]) + 4, "class": "ch-end" });
        lbl.textContent = s.end;
        svg.appendChild(lbl);
      }
    });

    // hover: one invisible band per x, a crosshair, and a tooltip
    var wrap = el("div", "ch-plot");
    wrap.appendChild(svg);
    var tip = el("div", "ch-tip");
    wrap.appendChild(tip);
    var bandW = iw / Math.max(1, spec.x.length - 1);
    spec.x.forEach(function (xl, i) {
      var band = svgEl("rect", { x: X(i) - bandW / 2, y: LC.t, width: bandW, height: ih, "class": "ch-band" });
      band.addEventListener("pointerenter", function () {
        hoverRule.setAttribute("x1", X(i)); hoverRule.setAttribute("x2", X(i));
        svg.classList.add("is-hover");
        tip.textContent = "";
        tip.appendChild(el("div", "tip-x", xl));
        spec.series.forEach(function (s) {
          var r = el("div", "tip-row");
          r.appendChild(el("span", "tip-key tone-" + s.tone));
          r.appendChild(el("span", "tip-name", s.name));
          r.appendChild(el("span", "tip-val", String(s.values[i])));
          tip.appendChild(r);
        });
        // clamped so a tooltip near either end stays inside the panel
        tip.style.left = pct(clamp(X(i) / LC.w * 100, 20, 80).toFixed(2));
        tip.classList.add("is-on");
      });
      svg.appendChild(band);
    });
    wrap.addEventListener("pointerleave", function () {
      svg.classList.remove("is-hover");
      tip.classList.remove("is-on");
    });

    var legend = null;
    if (spec.series.length > 1) {      // one series needs no legend: the caption names it
      legend = el("div", "ch-legend");
      spec.series.forEach(function (s) {
        var k = el("span", "lg-item");
        k.appendChild(el("span", "lg-key tone-" + s.tone));
        k.appendChild(el("span", null, s.name));
        legend.appendChild(k);
      });
    }
    var fig = chartFrame(spec, wrap, legend);
    fig.appendChild(dataTable(["Year"].concat(spec.series.map(function (s) { return s.name; })),
      spec.x.map(function (xl, i) {
        return [xl].concat(spec.series.map(function (s) { return s.values[i]; }));
      }), spec.caption));
    return fig;
  }

  /* Small multiples: one before/after pair per measure. The measures are on
     four different scales, so each pair is normalised to its own 2025 value and
     both real values are printed — which is the honest way to put four
     incomparable magnitudes in one panel. */
  function GrowthBars(spec) {
    var body = el("div", "growth");
    spec.rows.forEach(function (r) {
      var row = el("div", "gr-row");
      row.appendChild(el("div", "gr-name", r.name));
      var bars = el("div", "gr-bars");
      [["n", r.from, r.fromText, "2018"], ["a", r.to, r.toText, "2025"]].forEach(function (b) {
        var line = el("div", "gr-line");
        var track = el("div", "gr-track");
        var fill = el("div", "gr-fill tone-" + b[0]);
        fill.style.width = pct((b[1] / r.to * 100).toFixed(1));
        track.appendChild(fill);
        line.appendChild(el("span", "gr-year", b[3]));
        line.appendChild(track);
        line.appendChild(el("span", "gr-val", b[2]));
        bars.appendChild(line);
      });
      row.appendChild(bars);
      row.appendChild(el("div", "gr-mult", r.mult));
      body.appendChild(row);
    });
    var fig = chartFrame(spec, body, null);
    fig.appendChild(dataTable(["Measure", "2018", "2025", "Change"],
      spec.rows.map(function (r) { return [r.name, r.fromText, r.toText, r.mult]; }), spec.caption));
    return fig;
  }

  /* Parts of one whole, as a single bar. Segments carry a 2px surface gap so
     they never blur into one another, and every part is direct-labelled. */
  function ShareBar(spec) {
    var body = el("div", "share");
    var bar = el("div", "sh-bar");
    spec.parts.forEach(function (p) {
      var seg = el("div", "sh-seg tone-" + (p.tone || "a"));
      seg.style.width = pct(p.value);
      bar.appendChild(seg);
    });
    body.appendChild(bar);
    var keys = el("div", "sh-keys");
    spec.parts.forEach(function (p) {
      var k = el("div", "sh-key");
      k.appendChild(el("span", "lg-key tone-" + (p.tone || "a")));
      k.appendChild(el("span", "sh-name", p.name));
      k.appendChild(el("span", "sh-val", p.value + "%"));
      keys.appendChild(k);
    });
    body.appendChild(keys);
    var fig = chartFrame(spec, body, null);
    fig.appendChild(dataTable(["Part", "Share"],
      spec.parts.map(function (p) { return [p.name, p.value + "%"]; }), spec.caption));
    return fig;
  }

  /* The same whole at two dates, stacked bar over stacked bar — the form that
     makes a change in composition legible without a second axis. */
  function ShiftBars(spec) {
    var body = el("div", "shift");
    spec.rows.forEach(function (r) {
      var line = el("div", "sf-row");
      line.appendChild(el("span", "sf-year", r.year));
      var bar = el("div", "sh-bar");
      r.parts.forEach(function (p) {
        if (!p.value) return;
        var seg = el("div", "sh-seg ch-" + p.name);
        seg.style.width = pct(p.value);
        if (p.value >= 12) seg.appendChild(el("span", "sf-lab", p.value + "%"));
        bar.appendChild(seg);
      });
      line.appendChild(bar);
      body.appendChild(line);
    });
    var keys = el("div", "sh-keys");
    ["green", "yellow", "red"].forEach(function (n) {
      var k = el("div", "sh-key");
      k.appendChild(el("span", "lg-key ch-" + n));
      k.appendChild(el("span", "sh-name", CHANNEL_WORDS[n]));
      keys.appendChild(k);
    });
    body.appendChild(keys);
    var fig = chartFrame(spec, body, null);
    fig.appendChild(dataTable(["Year", "Green", "Yellow", "Red"],
      spec.rows.map(function (r) {
        return [r.year].concat(r.parts.map(function (p) { return p.value + "%"; }));
      }), spec.caption));
    return fig;
  }

  /* post-clearance audit feeding the RMS — drawn, not written. Colours come
     from the page's own tokens so the motif follows the theme. */
  function loopMotif() {
    var wrap = el("div", "loop-motif");
    wrap.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 270" width="100%" aria-hidden="true">' +
      '<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 Z" class="lm-live-f"/></marker>' +
      '<marker id="arrDim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 Z" class="lm-dim-f"/></marker></defs>' +
      '<g fill="none" stroke-width="4">' +
      '<path d="M 218 62 A 92 92 0 0 1 250 190" class="lm-dim" marker-end="url(#arrDim)"/>' +
      '<path d="M 218 214 A 92 92 0 0 1 106 198" class="lm-dim" marker-end="url(#arrDim)"/>' +
      '<path d="M 78 160 A 92 92 0 0 1 138 62" class="lm-live" stroke-width="6" marker-end="url(#arr)"/></g>' +
      '<g class="lm-text" font-size="19" text-anchor="middle">' +
      '<text x="178" y="46">RMS</text><text x="272" y="216">RELEASE</text><text x="84" y="216">AUDIT</text></g>' +
      '<text x="52" y="120" class="lm-edge" font-size="15" text-anchor="middle" ' +
      'transform="rotate(-64 52 120)">FINDINGS</text></svg>';
    return wrap;
  }

  /* The structure of the RMS: three inputs, one decision, three channels. */
  function StructureMotif(st) {
    var wrap = el("div", "structure");
    wrap.appendChild(el("div", "st-caption", st.caption));
    var list = el("div", "st-nodes");
    st.nodes.forEach(function (n) {
      var node = el("div", "st-node");
      var head = el("div", "st-head");
      head.appendChild(icon(n.icon));
      head.appendChild(el("span", null, n.title));
      node.appendChild(head);
      node.appendChild(el("div", "st-value", n.value));
      node.appendChild(el("div", "st-sub", n.sub));
      list.appendChild(node);
    });
    wrap.appendChild(list);
    var join = el("div", "st-join");
    join.appendChild(icon("chev"));
    join.appendChild(el("span", null, "CHANNEL DECISION"));
    wrap.appendChild(join);
    return wrap;
  }

  /* =========================================================================
     PASSENGER SCHEMA
     The arrivals hall as a diagram: passengers walk it, the advance passenger
     information gets there first, and the channel is already decided when they
     reach customs control. Dots ride the paths with CSS offset-path; each one
     also carries a static offset-distance so that under reduced motion they
     stand spread along the route instead of piled at the door.

     The two ends are drawn, not abbreviated: the route starts under an
     aircraft on the stand and comes into the building down a jet bridge, and
     it finishes at two doorways rather than two boxes. The route strings
     themselves are load-bearing — they are the dots' offset-path — so
     everything else is drawn around them and they do not move.
     ========================================================================= */
  var PS = { w: 1000, h: 316 };
  var HALL = { x: 176, w: 790, top: 70, floor: 296 };
  function PassengerSchema(sc) {
    var wrap = el("div", "pax");
    wrap.appendChild(el("div", "st-caption", sc.caption));
    var stage = el("div", "pax-stage");
    var svg = svgEl("svg", { viewBox: "0 0 " + PS.w + " " + PS.h, "class": "pax-svg",
                             role: "img", "aria-label": sc.caption });
    function put(parent, tag, attrs) {
      var n = svgEl(tag, attrs);
      parent.appendChild(n);
      return n;
    }
    function label(parent, x, y, cls, s) {
      var t = svgEl("text", { x: x, y: y, "class": cls, "text-anchor": "middle" });
      t.textContent = s;
      parent.appendChild(t);
    }

    var routeGreen = "M 70 196 L 330 196 L 470 196 L 640 196 L 762 140 L 930 140";
    var routeRed = "M 70 196 L 330 196 L 470 196 L 640 196 L 762 262 L 930 262";

    // ---- the terminal the routes run inside ------------------------------
    put(svg, "rect", { x: HALL.x - 6, y: HALL.top - 8, width: HALL.w + 12, height: 12, rx: 3,
                       "class": "pax-roof" });
    put(svg, "rect", { x: HALL.x, y: HALL.top, width: HALL.w, height: HALL.floor - HALL.top,
                       rx: 12, "class": "pax-hall" });
    // Clerestory, in two runs: the advance-information feed comes down the
    // middle and should not have to cross a window.
    [[196, 380], [700, 250]].forEach(function (b) {
      put(svg, "rect", { x: b[0], y: 86, width: b[1], height: 24, "class": "pax-glaze" });
      for (var mx = b[0] + 48; mx < b[0] + b[1]; mx += 48) {
        put(svg, "path", { d: "M " + mx + " 86 L " + mx + " 110", "class": "pax-mullion" });
      }
    });
    put(svg, "path", { d: "M " + HALL.x + " " + HALL.floor + " L " + (HALL.x + HALL.w) + " " + HALL.floor,
                       "class": "pax-floor" });
    put(svg, "path", { d: "M 8 188 L 170 188", "class": "pax-floor" });

    [[routeGreen, "green"], [routeRed, "red"]].forEach(function (r) {
      put(svg, "path", { d: r[0], "class": "pax-track ch-" + r[1] });
    });

    // ---- passport control: a row of e-gates ------------------------------
    function gates(x, title, sub) {
      var g = put(svg, "g", { "class": "pax-station" });
      for (var i = 0; i < 3; i++) {
        var b = x - 55 + i * 37;
        put(g, "rect", { x: b + 9, y: 180, width: 19, height: 32, "class": "pax-paddle" });
        put(g, "rect", { x: b, y: 168, width: 9, height: 56, rx: 3, "class": "pax-gate" });
        put(g, "rect", { x: b + 28, y: 168, width: 9, height: 56, rx: 3, "class": "pax-gate" });
        put(g, "circle", { cx: b + 4.5, cy: 176, r: 2.6, "class": "pax-reader" });
      }
      label(g, x, 266, "pax-label", title);
      label(g, x, 284, "pax-sub", sub);
    }

    // ---- customs control: the scanner the channel decision happens at ----
    function customs(x, title, sub) {
      var g = put(svg, "g", { "class": "pax-station is-decision" });
      put(g, "rect", { x: x - 54, y: 224, width: 108, height: 10, rx: 3, "class": "pax-belt" });
      put(g, "rect", { x: x - 16, y: 209, width: 26, height: 15, rx: 3, "class": "pax-case" });
      put(g, "path", { d: "M " + (x - 46) + " 234 L " + (x - 46) + " 176 Q " + (x - 46) + " 160 " +
                          (x - 30) + " 160 L " + (x + 30) + " 160 Q " + (x + 46) + " 160 " +
                          (x + 46) + " 176 L " + (x + 46) + " 234", "class": "pax-arch" });
      label(g, x, 266, "pax-label", title);
      label(g, x, 284, "pax-sub", sub);
    }
    gates(400, sc.nodes[2].title, sc.nodes[2].sub);
    customs(640, sc.nodes[3].title, sc.nodes[3].sub);

    // ---- the arrival: an aircraft on the stand, and the bridge off it ----
    // Nose toward the building, so the bridge is the short hop a bridge
    // actually is and the fin sits at the far end, out of everything's way.
    var arr = put(svg, "g", { "class": "pax-arrive" });
    put(arr, "ellipse", { cx: 80, cy: 186, rx: 58, ry: 4, "class": "pax-shadow" });
    put(arr, "path", { d: "M 46 133 L 24 100 L 8 100 L 8 135 Z", "class": "pax-plane-fin" });
    put(arr, "path", { d: "M 40 140 L 12 135 L 11 143 L 38 148 Z", "class": "pax-plane-fin" });
    put(arr, "path", { d: "M 66 165 L 108 178 L 122 183 L 80 169 Z", "class": "pax-plane-wing" });
    put(arr, "rect", { x: 84, y: 168, width: 26, height: 10, rx: 5, "class": "pax-plane-wing" });
    [[136, 182], [84, 182]].forEach(function (w) {
      put(arr, "rect", { x: w[0] - 1, y: 166, width: 2, height: 14, "class": "pax-plane-wing" });
      put(arr, "ellipse", { cx: w[0], cy: w[1], rx: 3.4, ry: 2.6, "class": "pax-plane-dark" });
    });
    put(arr, "path", { d: "M 8 138 L 46 133 L 134 133 Q 154 133 156 150 Q 154 167 134 167 " +
                          "L 46 167 L 8 147 Z", "class": "pax-plane" });
    put(arr, "path", { d: "M 12 160 L 152 155 L 152 160 L 12 165 Z", "class": "pax-plane-line" });
    put(arr, "path", { d: "M 137 141 L 150 143 L 149 150 L 136 149 Z", "class": "pax-plane-dark" });
    for (var wx = 54; wx <= 128; wx += 8) {
      put(arr, "circle", { cx: wx, cy: 148, r: 1.7, "class": "pax-plane-win" });
    }
    put(arr, "rect", { x: 112, y: 137, width: 10, height: 22, rx: 2.5, "class": "pax-plane-door" });
    put(arr, "path", { d: "M 124 140 L 176 152 L 176 168 L 124 156 Z", "class": "pax-bridge" });
    for (var bi = 1; bi < 3; bi++) {
      var bx = 124 + (52 * bi) / 3;
      put(arr, "path", { d: "M " + bx + " " + (140 + (12 * bi) / 3) + " L " + bx + " " +
                            (156 + (12 * bi) / 3), "class": "pax-bridge-rib" });
    }
    label(arr, 70, 266, "pax-label", sc.nodes[0].title);
    label(arr, 70, 284, "pax-sub", sc.nodes[0].sub);

    // API arrives ahead of the aircraft and feeds the decision
    var api = put(svg, "g", { "class": "pax-api" });
    put(api, "rect", { x: 468, y: 6, width: 344, height: 50, rx: 10, "class": "pax-api-box" });
    label(api, 640, 28, "pax-api-title", sc.nodes[1].title);
    label(api, 640, 46, "pax-sub", sc.nodes[1].sub);
    put(api, "path", { d: "M 640 56 L 640 156", "class": "pax-feed" });

    // ---- channel ends: two doorways out of the hall ----------------------
    sc.channels.forEach(function (c) {
      var y = c.name === "green" ? 140 : 262;
      var g = put(svg, "g", { "class": "pax-end ch-" + c.name });
      put(g, "rect", { x: 828, y: y - 24, width: 140, height: 48, rx: 4, "class": "pax-end-box" });
      put(g, "rect", { x: 822, y: y - 36, width: 152, height: 12, rx: 3, "class": "pax-end-header" });
      put(g, "rect", { x: 822, y: y - 24, width: 6, height: 48, "class": "pax-jamb" });
      put(g, "rect", { x: 968, y: y - 24, width: 6, height: 48, "class": "pax-jamb" });
      label(g, 898, y - 2, "pax-end-label", c.label);
      label(g, 898, y + 17, "pax-end-share", c.shareText);
    });

    // the passengers themselves — 24 of them, split the way the figures say
    var N = 24, DUR = 9;
    var redEvery = Math.max(1, Math.round(100 / (sc.channels[1].share || 4)));
    for (var i = 0; i < N; i++) {
      var isRed = (i % redEvery) === 0;
      var dot = svgEl("circle", { r: 7, cx: 0, cy: 0, "class": "pax-dot" + (isRed ? " is-red" : "") });
      var phase = (i / N * 100).toFixed(2);
      dot.style.offsetPath = 'path("' + (isRed ? routeRed : routeGreen) + '")';
      dot.style.offsetDistance = phase + "%";
      dot.style.animationDelay = (-(i / N) * DUR).toFixed(2) + "s";
      svg.appendChild(dot);
    }

    stage.appendChild(svg);
    wrap.appendChild(stage);
    if (sc.note) wrap.appendChild(el("p", "ch-note", sc.note));
    return wrap;
  }

  /* ---------------- corridor geometry ---------------- */
  // Mirrors tools/build_plates.py exactly; the parameters live in plates.js.
  var WP = J.route.width;
  // Mirrors depth()/halfw() in tools/build_plates.py: the corridor opens out
  // over the first WP.holdY units, smoothstepped so it arrives at the hold with
  // no rate of change, and then holds that scale to the foot of the page —
  // nothing on the road grows as the reader scrolls.
  function depthAt(y) {
    var t = clamp((y - WP.horizon) / (WP.holdY - WP.horizon), 0, 1);
    return WP.holdDepth * t * t * (3 - 2 * t);
  }
  function halfwAt(y) {
    return WP.base + WP.span * Math.pow(depthAt(y), WP.exp);
  }
  // The consignment is drawn 120 units wide. It grows with the road while the
  // corridor is still opening out, on a compressed curve, and then holds one
  // size for the whole journey — the same law the road itself follows.
  var TW = 120, TH = 152;
  var TRUCK_MID = halfwAt(2400), TRUCK_UNITS = 74, TRUCK_GROWTH = 0.62;
  function truckScale(y) {
    return TRUCK_UNITS * Math.pow(halfwAt(y) / TRUCK_MID, TRUCK_GROWTH) / TW;
  }

  /* ---------------- route, chevrons, sampling ---------------- */
  var routeGlow, routeHalo, routeLen, SAMPLES = [], N_SAMPLES = 600;
  function buildRoute() {
    var line = svgEl("g", { "class": "route-line" });
    line.appendChild(svgEl("path", { "class": "route-track", d: J.route.d }));
    var halo = svgEl("path", { "class": "route-halo", d: J.route.d });
    routeGlow = svgEl("path", { "class": "route-glow", d: J.route.d });
    line.appendChild(halo);
    line.appendChild(routeGlow);
    $routeLayer.appendChild(line);
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
    var chevs = svgEl("g", { "class": "chev-flow" });
    var step = 74, n = 0;
    for (var y = 190; y < PAGE.h - 80; y += step) {
      var s = at(y), w = halfwAt(y) * 0.34, h = halfwAt(y) * 0.3;
      var path = svgEl("path", {
        "class": "chev",
        d: "M " + (-w) + " " + (-h) + " L 0 0 L " + w + " " + (-h),
        "stroke-width": String(Math.max(3, halfwAt(y) * 0.09)),
        transform: "translate(" + s.x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + (s.a - 90).toFixed(1) + ")"
      });
      path.style.animationDelay = (-(n % 9) * 0.29).toFixed(2) + "s";
      chevs.appendChild(path);
      n++;
    }
    $routeLayer.appendChild(chevs);
  }


  /* Roadside cameras on the transit passage.

     They used to be baked into the plates as masts 3.4 road-widths tall, which
     at viewport scale read as gantries: too big to be a camera, and with a head
     too small to be recognised as one. Drawn here instead, from
     JOURNEY.cameras, in the same page space as the route and the chevrons — so
     they take the corridor's own perspective from halfwAt(), they stay crisp at
     any viewport width, and the size is a number in this file rather than a
     re-render.

     One orientation is authored: a camera on the LEFT shoulder, its arm
     reaching in toward the road (+x) and its lens looking down-page. The
     right-hand one is the same glyph mirrored. */
  function buildCameras() {
    if (!J.cameras) return;
    var g = svgEl("g", { "class": "cctv-flow" });
    J.cameras.forEach(function (c) {
      var u = halfwAt(c.y) * 0.8;              // road half-width here, and the
      // glyph is drawn at 0.8 of it: big enough to be read as a camera from the
      // back of a room, small enough that it is furniture and not a landmark
      var base = { x: at(c.y).x + c.side * 2.2 * halfwAt(c.y), y: c.y };
      var n = svgEl("g", {
        "class": "cctv",
        transform: "translate(" + base.x.toFixed(1) + "," + base.y.toFixed(1) + ")" +
                   " scale(" + (c.side < 0 ? 1 : -1) + ",1) scale(" + u.toFixed(2) + ")"
      });
      // Everything below is in road half-widths, with the mast foot at 0,0.
      // A real mast is about twice a lane wide and no taller: it is the head
      // that has to be legible, not the pole, so the head is drawn generously
      // and the pole is kept to the height it would really be.
      n.appendChild(svgEl("ellipse", { "class": "cctv-shadow", cx: 0.1, cy: 0.03, rx: 0.3, ry: 0.09 }));
      // what the camera watches: short and narrow, so it reads as a sight line
      // rather than as a wash over the carriageway
      n.appendChild(svgEl("path", { "class": "cctv-cone", d: "M 0.9 -1 L 1.28 0.5 L 1.82 0.22 Z" }));
      n.appendChild(svgEl("rect", { "class": "cctv-mast", x: -0.045, y: -1.05, width: 0.09, height: 1.05 }));
      n.appendChild(svgEl("rect", { "class": "cctv-mast", x: -0.13, y: -0.05, width: 0.26, height: 0.07, rx: 0.03 }));
      // arm, then the head: body, sun hood over it, lens, and the live dot
      n.appendChild(svgEl("rect", { "class": "cctv-mast", x: 0, y: -1.02, width: 0.46, height: 0.06, rx: 0.03 }));
      var head = svgEl("g", { transform: "rotate(9,0.45,-1)" });
      head.appendChild(svgEl("rect", { "class": "cctv-body", x: 0.42, y: -1.13, width: 0.5, height: 0.23, rx: 0.06 }));
      head.appendChild(svgEl("rect", { "class": "cctv-hood", x: 0.4, y: -1.19, width: 0.6, height: 0.07, rx: 0.035 }));
      head.appendChild(svgEl("circle", { "class": "cctv-lens", cx: 0.9, cy: -1.01, r: 0.115 }));
      head.appendChild(svgEl("circle", { "class": "cctv-glint", cx: 0.865, cy: -1.045, r: 0.042 }));
      head.appendChild(svgEl("circle", { "class": "cctv-dot", cx: 0.5, cy: -0.96, r: 0.04 }));
      n.appendChild(head);
      g.appendChild(n);
    });
    $routeLayer.appendChild(g);
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
    // Heading is read three samples ahead, from a pair that always exists: at
    // the end of the table both ends of that pair collapse onto the last
    // sample, and atan2(0, 0) is 0 — which would swing the consignment a
    // quarter turn on the last frame of the corridor.
    var i0 = Math.min(lo, SAMPLES.length - 4);
    var head = SAMPLES[i0], ref = SAMPLES[i0 + 3];
    return {
      x: a.x + (b.x - a.x) * t,
      l: a.l + (b.l - a.l) * t,
      a: Math.atan2(ref.y - head.y, ref.x - head.x) * 180 / Math.PI
    };
  }

  /* ---------------- truck ---------------- */
  // Front three-quarter view: the corridor recedes toward the border at the top
  // of the page, so the consignment drives toward the camera. Painted for the
  // daylight plates — a white box body over a slate cab, with the sun's own
  // shadow under it and no headlight wash, because it is the middle of the day.
  function truckSvg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + TW + '" height="' + TH +
      '" viewBox="0 0 ' + TW + ' ' + TH + '" style="overflow:visible">' + inner + "</svg>";
  }
  var TRUCK_BASE =
    '<defs>' +
    '<linearGradient id="tb" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#d3dbdb"/><stop offset="0.45" stop-color="#f4f7f6"/>' +
    '<stop offset="1" stop-color="#c2cbcb"/></linearGradient>' +
    '<linearGradient id="tc" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#2f4148"/><stop offset="0.4" stop-color="#4c6771"/>' +
    '<stop offset="1" stop-color="#26363c"/></linearGradient>' +
    '<linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#dcecf3"/>' +
    '<stop offset="1" stop-color="#8fa9b4"/></linearGradient></defs>' +
    // shadow on the road, thrown down and to the left like everything else
    '<ellipse cx="52" cy="146" rx="54" ry="11" fill="#4d5f52" opacity="0.3"/>' +
    // trailer, receding up-page
    '<path d="M22 6 L98 6 L108 76 L12 76 Z" fill="url(#tb)"/>' +
    '<path d="M22 6 L98 6 L96 13 L24 13 Z" fill="#ffffff" opacity="0.75"/>' +
    '<g stroke="#aab5b4" stroke-width="1.6" opacity="0.7">' +
    '<path d="M34 8 L28 76"/><path d="M48 7 L45 76"/><path d="M62 7 L62 76"/>' +
    '<path d="M76 7 L79 76"/><path d="M89 8 L95 76"/></g>' +
    // cab
    '<path d="M16 74 L104 74 L110 128 L10 128 Z" fill="url(#tc)"/>' +
    '<path d="M25 80 L95 80 L99 104 L21 104 Z" fill="url(#tg)"/>' +
    '<path d="M25 80 L52 80 L38 104 L21 104 Z" fill="#ffffff" opacity="0.3"/>' +
    '<rect x="24" y="108" width="72" height="12" rx="3" fill="#22333a"/>' +
    '<g stroke="#3d545d" stroke-width="1.4"><path d="M28 111h64"/><path d="M28 116h64"/></g>' +
    // wheels
    '<rect x="2" y="104" width="14" height="34" rx="5" fill="#1d2528"/>' +
    '<rect x="104" y="104" width="14" height="34" rx="5" fill="#1d2528"/>' +
    // mirrors, roof markers
    '<path d="M14 78 L4 84" stroke="#2f4148" stroke-width="3"/>' +
    '<path d="M106 78 L116 84" stroke="#2f4148" stroke-width="3"/>' +
    '<g fill="#e0912f"><circle cx="42" cy="76" r="2"/><circle cx="60" cy="76" r="2"/>' +
    '<circle cx="78" cy="76" r="2"/></g>' +
    // headlights, unlit
    '<g><rect x="17" y="118" width="20" height="9" rx="4" fill="#e8eef0"/>' +
    '<rect x="83" y="118" width="20" height="9" rx="4" fill="#e8eef0"/></g>';
  var TRUCK_VARIANTS = {
    scanned:
      '<rect x="8" y="2" width="104" height="78" rx="7" fill="none" stroke="#00569b" stroke-width="3"/>' +
      '<circle cx="60" cy="2" r="5" fill="#00569b"/>',
    sealed:
      '<rect x="52" y="30" width="16" height="20" rx="3" fill="#c07a1e"/>' +
      '<rect x="57" y="36" width="6" height="8" fill="#6b4410"/>'
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

  /* =========================================================================
     BEATS
     ========================================================================= */
  var beatEls = [];          // parallel to BEATS: the element each beat occupies
  var rowEls = [];           // corridor rows only, in row order

  function fx(node, order) {
    node.classList.add("fx");
    node.style.setProperty("--d", (order * 0.09).toFixed(2) + "s");
    return node;
  }

  function sectionOf(n) {
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].n === n) return SECTIONS[i];
    return SECTIONS[0];
  }

  /* A metric panel, assembled from whichever of the parts this beat declares.
     Order is fixed so the panels read the same way everywhere: what it is, then
     what happened, then what it means. */
  var MOTIFS = { loop: loopMotif };
  function Panel(p) {
    var panel = el("div", "panel glass");
    var head = el("div", "p-head");
    head.appendChild(icon(p.icon));
    head.appendChild(el("span", null, p.title));
    panel.appendChild(head);
    if (p.tiles) panel.appendChild(TileStrip(p.tiles));
    if (p.bullets) panel.appendChild(Bullets(p.bullets));
    if (p.facts) panel.appendChild(Facts(p.facts, p.factsNote));
    if (p.split) panel.appendChild(SplitRow(p.split, p.splitNote));
    if (p.trace) panel.appendChild(TraceRow(p.trace));
    if (p.chart) panel.appendChild(p.chart.kind === "growth" ? GrowthBars(p.chart) : LineChart(p.chart));
    if (p.share) panel.appendChild(ShareBar(p.share));
    if (p.shift) panel.appendChild(ShiftBars(p.shift));
    var mHost = panel;
    if (p.metricsGrid && (p.metrics || []).length > 2) {
      mHost = el("div", "metric-grid");
      panel.appendChild(mHost);
    }
    (p.metrics || []).forEach(function (m) { mHost.appendChild(Metric(m)); });
    if (p.motif && MOTIFS[p.motif]) panel.appendChild(MOTIFS[p.motif]());
    return panel;
  }

  /* The card down the left of a corridor row, or at the head of a screen. */
  function Card(def, d) {
    var card = el("div", "card glass");
    card.appendChild(el("div", "c-eyebrow", d.card.title));
    card.appendChild(el("h2", "c-title", d.headline));
    card.appendChild(el("p", "c-text", d.support));
    if (d.hint) {
      var hint = el("p", "c-hint");
      hint.appendChild(icon("arrow"));
      hint.appendChild(el("span", null, d.hint));
      card.appendChild(hint);
    }
    if (def.key === "declaration" && D.meta.trsMethodology) {
      card.appendChild(el("p", "c-note", D.meta.trsFootnote));
    }
    return card;
  }

  function badgeFor(def) {
    // A transition belongs to no section, and saying so is the point: the
    // inland-transit passage is the move from one section to the next.
    if (def.transition) return { text: def.transition.join("→"), cls: " is-transition" };
    return { text: String(def.section), cls: "" };
  }

  function buildCorridorRow(def, d) {
    var row = el("section", "row");
    row.dataset.beat = def.key;
    row.dataset.section = def.section;
    row.id = "beat-" + def.key;

    var step = el("div", "step");
    var b = badgeFor(def);
    step.appendChild(fx(el("div", "step-n" + b.cls, b.text), 0));
    var stack = el("div", "step-stack");
    stack.appendChild(Card(def, d));
    if (d.structure) stack.appendChild(StructureMotif(d.structure));
    if (d.leftPanel) stack.appendChild(Panel(d.leftPanel));
    step.appendChild(fx(stack, 1));
    row.appendChild(step);

    var wrap = el("div", "panel-wrap");
    var right = el("div", "right-stack");
    if (d.rightPanel) right.appendChild(Panel(d.rightPanel));
    if (d.channels) {
      var chWrap = el("div", "panel glass compact-panel");
      chWrap.appendChild(ChannelRow(d.channels));
      if (d.facts) chWrap.appendChild(Facts(d.facts));
      right.appendChild(chWrap);
    }
    wrap.appendChild(fx(right, 2));
    row.appendChild(wrap);

    $rows.appendChild(row);
    rowEls.push(row);
    return row;
  }

  function screenShell(def, d, cls) {
    var sec = el("section", "screen " + cls);
    sec.dataset.beat = def.key;
    sec.dataset.section = def.section;
    sec.id = "beat-" + def.key;
    var head = el("header", "sc-head");
    var b = badgeFor(def);
    head.appendChild(fx(el("div", "step-n" + b.cls, b.text), 0));
    var t = el("div", "sc-titles");
    t.appendChild(el("div", "c-eyebrow", d.eyebrow));
    t.appendChild(el("h2", "sc-title", d.headline));
    t.appendChild(el("p", "sc-support", d.support));
    head.appendChild(fx(t, 1));
    sec.appendChild(head);
    return sec;
  }

  function buildCooperationScreen(def, d) {
    var sec = screenShell(def, d, "sc-coop");
    var flow = el("div", "coop-flow");
    flow.appendChild(el("span", "cf-node", "World Customs Organization"));
    var link = el("span", "cf-link");
    link.appendChild(icon("arrow", "cf-a"));
    link.appendChild(el("span", "cf-word", "BOTH WAYS"));
    link.appendChild(icon("arrow", "cf-b"));
    flow.appendChild(link);
    flow.appendChild(el("span", "cf-node", "Uzbekistan Customs"));
    sec.appendChild(fx(flow, 1.6));
    var grid = el("div", "coop-grid");
    d.items.forEach(function (it, i) {
      var c = el("article", "coop-card");
      var head = el("div", "cc-head");
      head.appendChild(icon(it.icon));
      head.appendChild(el("span", "cc-tag", it.tag));
      c.appendChild(head);
      c.appendChild(el("h3", "cc-title", it.title));
      c.appendChild(el("p", "cc-text", it.text));
      grid.appendChild(fx(c, 2 + i * 0.4));
    });
    sec.appendChild(grid);
    var creds = el("div", "coop-creds");
    D.meta.speakers.forEach(function (sp) {
      var chip = el("span", "cred-chip");
      chip.appendChild(icon("check"));
      chip.appendChild(el("span", null, sp.credential));
      creds.appendChild(chip);
    });
    sec.appendChild(fx(creds, 5));
    return sec;
  }

  /* The centre of the screen, with its functions around it — a 3x3 grid whose
     middle cell is the hub, and spokes drawn behind so the ring reads as one
     structure rather than eight cards that happen to be adjacent. */
  function buildTargetingScreen(def, d) {
    var sec = screenShell(def, d, "sc-target");
    var stage = el("div", "hub-stage");
    var spokes = svgEl("svg", { "class": "hub-spokes", viewBox: "0 0 100 100",
                                preserveAspectRatio: "none", "aria-hidden": "true" });
    // one spoke per perimeter cell of the 3x3, drawn to the centre
    [[16.6, 16.6], [50, 12], [83.4, 16.6], [12, 50], [88, 50],
     [16.6, 83.4], [50, 88], [83.4, 83.4]].forEach(function (p) {
      spokes.appendChild(svgEl("line", { x1: p[0], y1: p[1], x2: 50, y2: 50, "class": "spoke" }));
    });
    stage.appendChild(spokes);

    var grid = el("div", "hub-grid");
    // the eight functions fill the eight perimeter slots and the hub takes the
    // middle, so the composition closes with no gap to dress
    var slots = d.functions.slice();
    var order = [0, 1, 2, 3, null, 4, 5, 6, 7];
    order.forEach(function (idx, cell) {
      if (cell === 4) {
        var hub = el("div", "hub");
        hub.appendChild(icon("screen", "hub-icon"));
        hub.appendChild(el("div", "hub-title", d.hub.title));
        hub.appendChild(el("div", "hub-sub", d.hub.sub));
        grid.appendChild(fx(hub, 2));
        return;
      }
      var fn = slots[idx];
      if (!fn) return;
      var c = el("article", "hub-card");
      var h = el("div", "hc-head");
      h.appendChild(icon(fn.icon));
      h.appendChild(el("span", null, fn.title));
      c.appendChild(h);
      c.appendChild(el("p", "hc-text", fn.text));
      grid.appendChild(fx(c, 3 + cell * 0.2));
    });
    stage.appendChild(grid);
    sec.appendChild(stage);
    var foot = el("div", "hub-foot");
    if (d.monitoring) foot.appendChild(fx(MonitorBand(d.monitoring, d.note), 5));
    if (foot.childNodes.length) sec.appendChild(foot);
    return sec;
  }

  function buildPassengerScreen(def, d) {
    var sec = screenShell(def, d, "sc-pax");
    var body = el("div", "pax-body");
    var main = el("div", "pax-main");
    main.appendChild(PassengerSchema(d.schema));
    body.appendChild(main);
    var side = el("div", "pax-side");
    if (d.leftPanel) side.appendChild(Panel(d.leftPanel));
    if (d.rightPanel) side.appendChild(Panel(d.rightPanel));
    body.appendChild(side);
    sec.appendChild(fx(body, 2));
    return sec;
  }

  var SCREEN_BUILDERS = {
    cooperation: buildCooperationScreen,
    targeting: buildTargetingScreen,
    passengers: buildPassengerScreen
  };

  function buildBeats() {
    var before = document.getElementById("screens-before");
    var after = document.getElementById("screens-after");
    BEATS.forEach(function (def) {
      var d = D.beats[def.key];
      if (!d) throw new Error("no data for beat " + def.key);
      if (def.kind === "corridor") {
        beatEls.push(buildCorridorRow(def, d));
      } else {
        var node = SCREEN_BUILDERS[def.key](def, d);
        (def.section === SECTIONS[SECTIONS.length - 1].n ? after : before).appendChild(node);
        beatEls.push(node);
      }
    });
  }

  /* ---------------- map pins and building captions ---------------- */
  function place(node, x, y) {
    node.style.left = pct((clamp(x, 40, PAGE.w - 40) / PAGE.w * 100).toFixed(3));
    node.style.top = pct((y / PAGE.h * 100).toFixed(3));
  }

  function buildPins() {
    J.pins.forEach(function (p) {
      var node, body;
      if (p.modal) {
        node = el("button", "pin is-live");
        node.type = "button";
        node.setAttribute("aria-label", p.label);
        node.addEventListener("click", function () { openModal(p.modal, node); });
      } else {
        node = el("div", "pin");
        node.setAttribute("aria-hidden", "true");
      }
      place(node, p.x, p.y);
      node.title = p.label;
      body = el("span", "pin-body");
      body.appendChild(icon(p.icon));
      node.appendChild(body);
      node.appendChild(el("span", "pin-label", p.label));
      $pins.appendChild(node);
    });
  }

  // The two buildings the talk names out loud. Drawn as HTML over the plate
  // rather than baked into it: the plates stay wordless, the type stays crisp
  // at any width, and the caption follows the page's theme. The anchor is the
  // middle of the building's roofline and the caption is centred on it (see
  // JOURNEY.labels), so the words sit on the building itself.
  function buildLabels() {
    J.labels.forEach(function (lb) {
      var node = el("div", "blabel");
      place(node, lb.x, lb.y);
      node.appendChild(el("span", "bl-text", lb.text));
      $labels.appendChild(node);
    });
  }

  /* ---------------- tail ----------------
     The deck carries no bars: the page is the presentation surface, and the
     running order, the sections and the beats are all on the keyboard (ESC,
     1-7, arrows). What is left of the page's own furniture is the closing
     statement at the foot. */
  function buildTail() {
    var tail = document.getElementById("tail");
    tail.appendChild(el("div", "t-sub", "WCO 2026"));
    tail.appendChild(el("div", "t-theme", D.meta.theme2026));
    tail.appendChild(el("p", "t-note", D.meta.disclosure));
    var top = el("button", "t-top", "BACK TO THE START");
    top.type = "button";
    top.addEventListener("click", function () { goToBeat(0); });
    tail.appendChild(top);
  }

  /* ---------------- overview ---------------- */
  function speakerOf(n) {
    for (var i = 0; i < D.meta.speakers.length; i++) {
      var sp = D.meta.speakers[i];
      if (n >= sp.sections[0] && n <= sp.sections[1]) return i;
    }
    return 0;
  }
  var ovCards = [], ovFocus = 0;
  function buildOverview() {
    var x = el("button", "close-x");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.appendChild(icon("x"));
    x.addEventListener("click", closeOverlays);
    $overview.appendChild(x);
    $overview.appendChild(el("div", "ov-title", "running order"));
    var grid = el("div", "ov-grid");
    SECTIONS.forEach(function (s) {
      // a section's card is headed by its first beat; a section with more than
      // one beat lists the others beneath, because that is what the presenter
      // will actually walk through
      var mine = BEATS.filter(function (b) { return b.section === s.n; });
      var lead = D.beats[mine[0].key];
      var card = el("button", "ov-card seg-" + (speakerOf(s.n) + 1));
      card.type = "button";
      card.appendChild(el("span", "ov-n", "SECTION " + s.n + " · " + s.short.toUpperCase()));
      card.appendChild(el("span", "ov-t", lead.headline));
      card.appendChild(el("span", "ov-d", lead.overview));
      if (mine.length > 1) {
        var subs = el("span", "ov-beats");
        mine.forEach(function (b) { subs.appendChild(el("span", "ov-beat", D.beats[b.key].rail)); });
        card.appendChild(subs);
      }
      card.appendChild(el("span", "ov-seg"));
      card.addEventListener("click", function () { closeOverlays(); goToSection(s.n); });
      grid.appendChild(card);
      ovCards.push(card);
    });
    $overview.appendChild(grid);
    var legend = el("div", "ov-legend");
    D.meta.speakers.forEach(function (sp, i) {
      var item = el("span", "lg-" + (i + 1));
      item.appendChild(el("span", "lg-swatch"));
      item.appendChild(document.createTextNode(
        "Sections " + sp.sections[0] + "–" + sp.sections[1] + " · " + sp.credential));
      legend.appendChild(item);
    });
    $overview.appendChild(legend);
  }
  function setOvFocus(i) {
    ovFocus = clamp(i, 0, ovCards.length - 1);
    ovCards.forEach(function (c, j) { c.classList.toggle("is-focus", j === ovFocus); });
    if (ovCards[ovFocus]) ovCards[ovFocus].focus();
  }
  function openOverview() {
    lastFocus = document.activeElement;
    engine.view = "overview";
    var cur = BEATS[engine.beat].section;
    ovCards.forEach(function (c, i) { c.classList.toggle("is-current", SECTIONS[i].n === cur); });
    $overview.classList.add("is-open");
    document.body.dataset.view = "overview";
    setOvFocus(SECTIONS.map(function (s) { return s.n; }).indexOf(cur));
  }

  /* ---------------- modals ---------------- */
  var lastFocus = null;
  function buildModal() {
    var x = el("button", "close-x");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.appendChild(icon("x"));
    x.addEventListener("click", closeOverlays);
    $modal.appendChild(x);
    $modal.appendChild(el("div", "modal-body"));
    $modal.addEventListener("click", function (e) { if (e.target === $modal) closeOverlays(); });
  }
  function openModal(id, opener) {
    var m = D.meta.modals[id];
    if (!m) { console.error("no modal:", id); return; }
    lastFocus = opener || document.activeElement;
    var body = $modal.querySelector(".modal-body");
    body.textContent = "";
    var head = el("div", "md-head");
    head.appendChild(icon(m.icon, "md-icon"));
    var ht = el("div");
    ht.appendChild(el("div", "md-tag", m.tag));
    ht.appendChild(el("h2", null, m.title));
    head.appendChild(ht);
    body.appendChild(head);
    if (m.lead) body.appendChild(el("p", "md-lead", m.lead));
    if (m.plate) {
      var ci = CutIn(m.plate, null);
      if (ci) body.appendChild(ci);
    }
    body.appendChild(Bullets(m.bullets, "md-bullets"));
    if (m.metric) {
      var mw = el("div", "md-metric");
      mw.appendChild(Metric(m.metric));
      body.appendChild(mw);
    }
    engine.view = "modal";
    $modal.classList.add("is-open");
    document.body.dataset.view = "modal";
    $modal.querySelector(".close-x").focus();
  }
  function closeOverlays() {
    if (engine.view === "journey") return;
    engine.view = "journey";
    $overview.classList.remove("is-open");
    $modal.classList.remove("is-open");
    document.body.dataset.view = "journey";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* =========================================================================
     ENGINE
     Every beat — corridor row or screen — is scrolled so its own centre lands
     on the truck's focus line, and the current beat is whichever beat's centre
     is nearest that line. One rule for both kinds, so navigation cannot
     disagree with what is on screen.
     ========================================================================= */
  var engine = { beat: 0, view: "journey" };

  function focusLine() { return innerHeight * J.truck.focus; }

  function scrollTargetForBeat(i) {
    return centres[i] - focusLine();
  }
  function goToBeat(i) {
    i = clamp(i, 0, BEATS.length - 1);
    closeOverlays();
    window.scrollTo({ top: Math.max(0, scrollTargetForBeat(i)), behavior: REDUCE ? "auto" : "smooth" });
  }
  function goToSection(n) {
    for (var i = 0; i < BEATS.length; i++) if (BEATS[i].section === n) return goToBeat(i);
  }

  function revealAround(i) {
    for (var j = Math.max(0, i - 1); j <= Math.min(beatEls.length - 1, i + 1); j++) {
      beatEls[j].classList.add("is-in");
    }
  }
  function setBeat(i) {
    revealAround(i);
    if (i === engine.beat) return;
    engine.beat = i;
    var def = BEATS[i];
    document.body.dataset.beat = def.key;
    document.body.dataset.section = String(def.section);
    beatEls.forEach(function (e, j) { e.classList.toggle("is-current", j === i); });
    try { history.replaceState(null, "", "#beat-" + def.key); } catch (e) { /* file:// quirks */ }
  }

  // Document-space centre of every beat. Measured on load and on resize rather
  // than per scroll frame: nine getBoundingClientRect() calls inside the scroll
  // handler is nine forced layouts a frame, and the layout does not move while
  // the page is only being scrolled.
  var centres = [];
  function measureBeats() {
    centres = beatEls.map(function (e) {
      var r = e.getBoundingClientRect();
      return r.top + window.scrollY + r.height / 2;
    });
  }
  function nearestBeat() {
    var line = window.scrollY + focusLine(), best = 0, bestD = Infinity;
    for (var i = 0; i < centres.length; i++) {
      var d = Math.abs(centres[i] - line);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /* ---------------- scroll → corridor ---------------- */
  var ticking = false, lastK = -1;
  function onScrollFrame() {
    ticking = false;
    var docH = document.documentElement.scrollHeight - innerHeight;
    $progress.style.width = (docH > 0 ? clamp(window.scrollY / docH, 0, 1) * 100 : 0) + "%";

    setBeat(window.scrollY < 4 ? 0 : nearestBeat());

    if (!mqWide.matches) return;
    var k = stageK;
    if (k !== lastK) {
      lastK = k;
      $space.style.transform = "scale(" + k + ")";
    }
    var rect = $journey.getBoundingClientRect();
    var pageY = clamp((focusLine() - rect.top) / k, SAMPLES[0].y, SAMPLES[SAMPLES.length - 1].y);
    var s = at(pageY);
    var ts = truckScale(pageY);
    $truck.style.transform = "translate(" + s.x.toFixed(2) + "px," + pageY.toFixed(2) + "px) rotate(" +
      (s.a - 90).toFixed(2) + "deg) scale(" + ts.toFixed(3) + ") translate(" + (-TW / 2) + "px," + (-TH) + "px)";
    // delivered: the consignment fades out over the run-out below row 6 rather
    // than driving on to the foot of the page
    var ex = J.truck.exit;
    $truck.style.opacity = clamp((ex.to - pageY) / (ex.to - ex.from), 0, 1).toFixed(3);
    var off = String(routeLen - s.l);
    routeGlow.style.strokeDashoffset = off;
    routeHalo.style.strokeDashoffset = off;
    setVariant(variantAt(pageY));
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
  }

  /* =========================================================================
     THE STAGE
     A corridor row used to be a pure function of viewport width — the page held
     the plates' aspect ratio, so a row was (100vw / 1600) * 800 tall. On any
     screen narrower than 2:1, which is every screen, that makes a row shorter
     than the viewport, and the sections above and below bleed into it.

     So the art is fitted the way `object-fit: cover` fits a photograph: scaled
     until one row covers the viewport, and allowed to overflow sideways, which
     is where the plates are quiet by design — the outer bands carry the cards
     and hold no landmark (see ASSETS.md). The cards themselves stay in viewport
     space; only the art and the things pinned to it move with k.

     FILL is not 1: a beat is scrolled so its CENTRE lands on the focus line at
     0.56 of the viewport, so a row exactly one viewport tall would still leave
     a sliver of its neighbour at the top. Covering both edges from an offset
     centre takes 2 * max(focus, 1 - focus) — 1.12 here, and it follows the
     focus line if that is ever retuned.

     K_MAX is the other end of it: on a tall, narrow window an uncapped k would
     crop the corridor down to the carriageway and take the pins and the
     building captions off screen with it. The cap keeps the outermost of them
     CROP_M px inside the frame and accepts a visible neighbour instead — the
     corridor is merely imperfect with a sliver showing, and unreadable without
     its landmarks.
     ========================================================================= */
  var FILL = 2 * Math.max(J.truck.focus, 1 - J.truck.focus);
  var CROP_M = 110;                        // screen px kept outboard of the last overlay
  var X_MAX = J.pins.concat(J.labels).reduce(function (m, p) {
    return Math.max(m, Math.abs(p.x - PAGE.w / 2));
  }, 1);
  var stageK = 1;
  function layoutStage() {
    if (!mqWide.matches) {                 // the narrow layout floats the art
      $stage.style.cssText = "";           // behind stacked cards and needs no
      $journey.style.height = "";          // stage of its own
      return;
    }
    // clientWidth, not innerWidth: the page always has a vertical scrollbar, and
    // the centring offset has to use the same width the layout box uses, or the
    // art sits a few pixels off and the consignment drives off the road.
    var vw = $journey.clientWidth;
    var cover = FILL * innerHeight / ROW_H;              // what covering takes
    var capped = (vw / 2 - CROP_M) / X_MAX;              // what the pins allow
    stageK = Math.max(vw / PAGE.w, Math.min(cover, capped));
    // On a window tall enough for the cap to bind, a beat no longer covers the
    // viewport on its own. Said out loud, so the page's own tests can hold the
    // rule and its one exception apart rather than quietly widening the rule.
    document.body.dataset.crop = stageK < cover - 1e-6 ? "capped" : "cover";
    $journey.style.height = (PAGE.h * stageK).toFixed(1) + "px";
    $stage.style.width = (PAGE.w * stageK).toFixed(1) + "px";
    $stage.style.left = ((vw - PAGE.w * stageK) / 2).toFixed(1) + "px";
  }

  // Order matters: measureBeats() reads the rows' rects, and before the stage
  // is sized they are still the old height.
  function remeasure() { layoutStage(); measureBeats(); onScroll(); }
  // A resize changes k, and with it every beat's place in the document, so the
  // reader is put back on the beat they were reading rather than left standing
  // between two. Not on load: the page may be opening on a deep link, and this
  // would drag it back to the top.
  function relayout() {
    layoutStage();
    measureBeats();
    window.scrollTo({ top: Math.max(0, scrollTargetForBeat(engine.beat)), behavior: "auto" });
    onScroll();
  }

  /* ---------------- reveal ---------------- */
  function observeBeats() {
    if (!("IntersectionObserver" in window)) {
      beatEls.forEach(function (e) { e.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("is-in"); });
    }, { rootMargin: "-18% 0px -18% 0px", threshold: 0 });
    beatEls.forEach(function (e) { io.observe(e); });
  }
  function replayBeat() {
    var node = beatEls[engine.beat];
    if (!node) return;
    node.classList.remove("is-in");
    void node.offsetWidth;               // force reflow so the transition re-runs
    node.classList.add("is-in");
  }

  /* ---------------- input ---------------- */
  addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var code = e.code;
    if (engine.view !== "journey") {
      var handled = true;
      if (code === "Escape") closeOverlays();
      else if (engine.view === "overview" && (code === "ArrowRight" || code === "ArrowDown")) setOvFocus(ovFocus + 1);
      else if (engine.view === "overview" && (code === "ArrowLeft" || code === "ArrowUp")) setOvFocus(ovFocus - 1);
      else if (engine.view === "overview" && (code === "Enter" || code === "Space")) {
        closeOverlays(); goToSection(SECTIONS[ovFocus].n);
      } else if (engine.view === "overview" && /^(Digit|Numpad)[1-7]$/.test(code)) {
        closeOverlays(); goToSection(+code.slice(-1));
      } else handled = false;
      if (handled) e.preventDefault();
      return;
    }
    var used = true;
    if (code === "ArrowDown" || code === "PageDown") goToBeat(engine.beat + 1);
    else if (code === "ArrowUp" || code === "PageUp") goToBeat(engine.beat - 1);
    else if (code === "Space") goToBeat(engine.beat + (e.shiftKey ? -1 : 1));
    else if (code === "Home") goToBeat(0);
    else if (code === "End") goToBeat(BEATS.length - 1);
    else if (code === "Escape") openOverview();
    else if (code === "KeyR") replayBeat();
    else if (/^(Digit|Numpad)[1-7]$/.test(code)) goToSection(+code.slice(-1));
    else used = false;
    if (used) e.preventDefault();
  });

  /* ---------------- init ---------------- */
  function init() {
    var deepLink = /#beat-([a-z0-9]+)/i.exec(location.hash);
    var root = document.documentElement.style;
    root.setProperty("--sec-h", (100 / J.sections.length) + "%");
    root.setProperty("--fill", String(FILL));   // the screens cover the viewport
                                                // from the focus line too
    root.setProperty("--rows", String(ROWS));
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
    document.title = D.meta.title + " · " + D.meta.org;
    buildRoute();
    buildCameras();
    buildTruck();
    buildBeats();
    buildPins();
    buildLabels();
    buildTail();
    buildOverview();
    buildModal();
    observeBeats();

    layoutStage();
    measureBeats();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", relayout);
    addEventListener("load", remeasure);
    mqWide.addEventListener("change", relayout);
    onScrollFrame();
    setBeat(0);

    if (deepLink) {
      var i = BEATS.map(function (b) { return b.key; }).indexOf(deepLink[1]);
      if (i >= 0) requestAnimationFrame(function () {
        window.scrollTo({ top: Math.max(0, scrollTargetForBeat(i)) });
      });
    }
  }
  init();
})();
