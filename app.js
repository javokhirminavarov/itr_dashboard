/* =========================================================================
   Risk management, end to end — the page engine.

   The page scrolls normally; there is no slide deck and no camera. Scroll
   position is read once per animation frame and turned into a single number,
   `pageY` — where the viewport's focus line falls in the 1600x4800 corridor
   space defined by plates.js. The truck, the glow trail behind it, its state
   and the current beat all derive from that one value.

   The deck is TEN beats across EIGHT sections (see plates.js). Six beats are
   rows of the corridor; four are full-viewport screens that are not places on
   the road — WCO cooperation, the targeting centre, passenger control and AI
   risk analysis.
   Both kinds are navigated identically: every beat is scrolled so that its own
   centre lands on the truck's focus line, and the current beat is whichever
   beat's centre is nearest that line.

   The page has no chrome of its own — no bars, no tabs. `Esc` opens the running
   order, 1-8 jump to a section, the arrows step a beat.

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
     The arrivals hall, drawn the way the corridor is drawn: ONE ORTHOGRAPHIC
     PLAN, seen from directly above, in the corridor's own --plan-* palette.

     It used to mix two cameras in one frame — the terminal in elevation (a roof
     slab, clerestory glazing with mullions, a ground line, side-on e-gates, a
     scanner arch, two doorways with jambs) with an aircraft beside it drawn
     from above. That is the fault the corridor was cured of, and this is the
     same cure: there is no roof, no window, no doorway and no cast shadow here,
     because from directly above there is nothing to see of any of them.

     SCALE. Everything a viewer can check the proportion of is sized from real
     metres through PAX.upm — 7 units to the metre, half the corridor's 14,
     because an aircraft is 37.6 m long where a lorry is 16.5 m. The aircraft is
     an A320-family narrowbody at 37.6 m by 35.8 m; a gate island is 1.2 m wide
     with a 0.9 m lane beside it; a reclaim carousel is 29 m of racetrack; a
     passenger is a metre across. What is NOT held to that scale is the
     terminal, which at 7 units to the metre is far wider than the frame: like
     row 4's warehouse it is CROPPED rather than shrunk, and runs off the right
     and bottom edges the way a site plan crops.

     Three things make the aircraft read as an airliner, and all three are cheap
     in plan, the way the consignment's length ratio, articulation gap and axle
     count are: the SPAN IS ABOUT THE LENGTH (35.8 by 37.6 — the old drawing had
     wings on one side only and a fin fanned out as though seen from the side),
     the WING SWEEP, and TWO NACELLES slung under the wings. The fin from above
     is a sliver on the centreline, which is all a fin is from above.

     The route strings are load-bearing — they are the dots' offset-path — so
     they are authored first and everything else is drawn around them. Each dot
     also carries a static offset-distance, so under reduced motion they stand
     spread along the route instead of piled at the door.
     ========================================================================= */
  var PAX = { w: 1000, h: 440, upm: 7 };
  function pm(v) { return v * PAX.upm; }

  // The aircraft, in metres, turned into units once.
  var AC = { cy: 175, nose: 283, len: pm(37.6), span: pm(35.8), body: pm(3.95) };
  AC.tail = AC.nose - AC.len;            // 19.8
  AC.half = AC.body / 2;                 // 13.8 — the fuselage half-width
  AC.reach = (AC.span - AC.body) / 2;    // 111.5 — fuselage side to wing tip
  AC.sweep = AC.reach * 0.47;            // 25 degrees of leading-edge sweep

  // Passport control: six islands, five lanes, centred on the walking route.
  var GATE = { x: 424, cy: 121, n: 8, islandW: pm(1.2), islandL: pm(3.2), lane: pm(0.9) };
  GATE.pitch = GATE.islandW + GATE.lane;

  // Baggage reclaim: two racetracks, the dwell the advance information is
  // assessed during. This is the beat's substance, not dressing — the old
  // drawing ran straight from the jet bridge to customs with nothing between.
  var BELT = { x: 556, w: pm(29), h: pm(5), upper: 167.5, lower: 313.5 };

  // A passenger with a bag is about a metre across.
  var DOT_R = pm(1) / 2;

  /* The routes. Common as far as customs control, where the channel — decided
     before the aircraft landed — becomes the passenger's direction. */
  var PAX_COMMON = "M 104 175 L 238 175 L 250 160 L 348 121 L 530 121 L 530 240 L 866 240";
  var PAX_GREEN = PAX_COMMON + " L 902 164 L 1000 164";
  var PAX_RED = PAX_COMMON + " L 902 316 L 1000 316";

  function PassengerSchema(sc) {
    var wrap = el("div", "pax");
    wrap.appendChild(el("div", "st-caption", sc.caption));
    var stage = el("div", "pax-stage");
    var svg = svgEl("svg", { viewBox: "0 0 " + PAX.w + " " + PAX.h, "class": "pax-svg",
                             role: "img", "aria-label": sc.caption });
    function put(parent, tag, attrs) {
      var n = svgEl(tag, attrs);
      parent.appendChild(n);
      return n;
    }
    function text(parent, x, y, cls, s) {
      var t = put(parent, "text", { x: x, y: y, "class": cls, "text-anchor": "middle" });
      t.textContent = s;
      return t;
    }
    function rect(parent, x, y, w, h, cls, rx) {
      return put(parent, "rect", { x: x, y: y, width: w, height: h, rx: rx, "class": cls });
    }
    function path(parent, d, cls) { return put(parent, "path", { d: d, "class": cls }); }

    /* A plan captions with a chip on a leader. This is the same white chip on a
       hairline that the corridor's building captions use (.blabel), drawn in
       the SVG so it travels with the drawing. IBM Plex Mono is a fixed-advance
       face, so the chip can be sized from the character count without
       measuring: 0.6 em plus the tracking. */
    function chip(cx, cy, lines, tone) {
      var g = put(svg, "g", { "class": "pax-callout" + (tone ? " ch-" + tone : "") });
      var w = 40, h = lines.length * 17 + 8, i;
      for (i = 0; i < lines.length; i++) w = Math.max(w, lines[i].t.length * lines[i].adv + 22);
      rect(g, cx - w / 2, cy - h / 2, w, h, "pax-chip", 5);
      if (tone) rect(g, cx - w / 2, cy - h / 2, 4, h, "pax-chip-tab", 2);
      for (i = 0; i < lines.length; i++)
        text(g, cx, cy - h / 2 + 17 * (i + 1), lines[i].cls, lines[i].t);
      g.__h = h;
      return g;
    }
    function leader(g, sx, sy, tx, ty) {
      path(g, "M " + sx + " " + sy + " L " + tx + " " + ty, "pax-leader");
      put(g, "circle", { cx: tx, cy: ty, r: 2, "class": "pax-leader-dot" });
    }
    // a station caption: chip in the key row along the foot, leader to the thing
    function station(cx, cy, node, tx, ty) {
      var g = chip(cx, cy, [{ t: node.title.toUpperCase(), cls: "pax-label", adv: 8.14 },
                            { t: node.sub, cls: "pax-sub", adv: 6.3 }]);
      leader(g, cx, cy - g.__h / 2, tx, ty);
    }

    /* ---- the ground: apron on the left, terminal footprint on the right ---- */
    rect(svg, 0, 0, PAX.w, PAX.h, "pax-ground");
    rect(svg, 0, 24, 352, 392, "pax-apron");
    // stand markings: the lead-in line the nose gear follows, and the stop bar.
    // Drawn BEFORE the aircraft, so it emerges from under the tail the way it
    // does on a real stand.
    path(svg, "M 0 " + AC.cy + " L 272 " + AC.cy, "pax-mark");
    path(svg, "M 272 161 L 272 189", "pax-mark");
    rect(svg, 10, 38, 290, 274, "pax-envelope", 4);

    // The terminal is cropped, not shrunk: a footprint, one building face with
    // the bridge opening in it, and a column grid on the 8 m bay.
    rect(svg, 352, 0, PAX.w - 352, PAX.h, "pax-hall");
    path(svg, "M 352 0 V 106", "pax-face");
    path(svg, "M 352 136 V " + PAX.h, "pax-face");
    var cols = put(svg, "g", { "class": "pax-column" }), gx, gy;
    for (gx = 384; gx < PAX.w - 8; gx += pm(8))
      for (gy = 40; gy < PAX.h - 12; gy += pm(8)) rect(cols, gx - 2.5, gy - 2.5, 5, 5, null, 1);

    /* ---- the aircraft on the stand ---------------------------------------- */
    var ac = put(svg, "g", { "class": "pax-aircraft" });
    var top = AC.cy - AC.half, bot = AC.cy + AC.half;
    var wRoot = 194, wChord = 49, tipY = top - AC.reach, tipLE = wRoot - AC.sweep;
    // wings, both sides, swept — the span is about the length
    path(ac, "M " + wRoot + " " + top + " L " + tipLE + " " + tipY + " L " + (tipLE - 12.6) +
             " " + tipY + " L " + (wRoot - wChord) + " " + top + " Z", "pax-plane-wing");
    path(ac, "M " + wRoot + " " + bot + " L " + tipLE + " " + (bot + AC.reach) + " L " +
             (tipLE - 12.6) + " " + (bot + AC.reach) + " L " + (wRoot - wChord) + " " + bot + " Z",
         "pax-plane-wing");
    // tailplane
    path(ac, "M 60 166.5 L 38 132 L 28 132 L 42 166.5 Z", "pax-plane-tail");
    path(ac, "M 60 183.5 L 38 218 L 28 218 L 42 183.5 Z", "pax-plane-tail");
    // fin: from above, a sliver on the centreline and nothing more
    path(ac, "M 62 " + AC.cy + " L 24 " + (AC.cy - 6) + " L 24 " + (AC.cy + 6) + " Z", "pax-plane-tail");
    // fuselage
    path(ac, "M " + AC.nose + " " + AC.cy + " Q " + (AC.nose - 1) + " " + (top + 1.3) + " 262 " + top +
             " L 60 " + top + " L " + AC.tail + " " + (AC.cy - 5) + " L " + AC.tail + " " + (AC.cy + 5) +
             " L 60 " + bot + " L 262 " + bot + " Q " + (AC.nose - 1) + " " + (bot - 1.3) + " " +
             AC.nose + " " + AC.cy + " Z", "pax-plane");
    // two nacelles under the wings, at a third of the semi-span out
    [top - AC.reach / 3, bot + AC.reach / 3].forEach(function (ny) {
      rect(ac, 170, ny - pm(2.6) / 2, pm(4.4), pm(2.6), "pax-nacelle", 6);
    });
    // the forward port door, which is the one the bridge goes to
    rect(ac, 244, top - 3.2, 11, 5, "pax-door", 1.5);

    /* ---- the jet bridge, and its rotunda at the building face ------------- */
    /* Rotunda at the building face, a constant-width tunnel, and the cab square
       against the fuselage at the door — a tunnel drawn as one quad from the
       rotunda to the door has to taper, and a taper this long reads as a beam
       of light rather than as a walkway. The tunnel passes about 3 m clear of
       the nose, which is where a bridge to a forward port door passes. */
    var br = put(svg, "g", { "class": "pax-bridge-g" });
    path(br, "M 255.2 134.9 L 345.2 109.9 L 350.8 130.1 L 260.8 155.1 Z", "pax-bridge");
    path(br, "M 285.2 126.6 L 290.8 146.8", "pax-bridge-rib");
    path(br, "M 315.2 118.2 L 320.8 138.4", "pax-bridge-rib");
    rect(br, 234, 138, 32, 23.6, "pax-bridge", 2);
    put(br, "circle", { cx: 350, cy: 120, r: 13, "class": "pax-rotunda" });

    /* ---- passport control: an e-gate bank, in plan ------------------------ */
    var gates = put(svg, "g", { "class": "pax-station" }), i, iy;
    for (i = 0; i < GATE.n; i++) {
      iy = GATE.cy + (i - (GATE.n - 1) / 2) * GATE.pitch;
      rect(gates, GATE.x, iy - GATE.islandW / 2, GATE.islandL, GATE.islandW, "pax-gate", 2);
      put(gates, "circle", { cx: GATE.x + 3, cy: iy, r: 1.6, "class": "pax-reader" });
      // the glass paddle across the lane above each island but the first
      if (i) path(gates, "M " + (GATE.x + GATE.islandL / 2) + " " + (iy - GATE.islandW / 2) +
                         " V " + (iy - GATE.pitch + GATE.islandW / 2), "pax-paddle");
    }

    /* ---- baggage reclaim: two racetracks ---------------------------------- */
    [BELT.upper, BELT.lower].forEach(function (by) {
      rect(svg, BELT.x, by - BELT.h / 2, BELT.w, BELT.h, "pax-belt", BELT.h / 2);
      rect(svg, BELT.x + 8, by - BELT.h / 2 + 8, BELT.w - 16, BELT.h - 16, "pax-belt-core",
           (BELT.h - 16) / 2);
      [0.28, 0.66].forEach(function (t) {
        var ax = BELT.x + BELT.w * t;
        path(svg, "M " + (ax - 5) + " " + (by - 5) + " L " + ax + " " + by + " L " + (ax - 5) +
                  " " + (by + 5), "pax-belt-arrow");
      });
    });

    /* ---- customs control: the point the channel becomes a direction ------- */
    var cust = put(svg, "g", { "class": "pax-station is-decision" });
    rect(cust, 766, 210, 52, 60, "pax-scan", 3);
    rect(cust, 774, 218, 36, 44, "pax-machine", 3);
    rect(cust, 780, 188, 24, 17, "pax-booth", 2);
    rect(cust, 780, 273, 24, 17, "pax-booth", 2);

    /* ---- the two channels: painted floor bands to two openings ------------ */
    sc.channels.forEach(function (c) {
      var g = put(svg, "g", { "class": "pax-channel ch-" + c.name });
      var y = c.name === "green" ? 164 : 316;
      path(g, "M 884 " + (240 + (y - 240) / 2) + " L 902 " + y + " L 952 " + y, "pax-band");
      rect(g, 948, y - 18, 8, 36, "pax-opening");
    });
    path(svg, "M 952 30 V 146", "pax-wall");
    path(svg, "M 952 182 V 298", "pax-wall");
    path(svg, "M 952 334 V 410", "pax-wall");

    /* ---- the walking routes, over everything they run through ------------- */
    /* Drawn as ONE route to customs control and two after it. Painting the
       green and the red route full length laid 96.4% over 3.6% for the whole
       walk, and two translucent channel colours over each other are an olive
       nobody chose. The dots still carry the whole path each: what the eye is
       told here is that there is one queue until the scanner, which is true. */
    path(svg, PAX_COMMON, "pax-track is-common");
    path(svg, "M 866 240 L 902 164 L 1000 164", "pax-track ch-green");
    path(svg, "M 866 240 L 902 316 L 1000 316", "pax-track ch-red");

    /* ---- the advance information, as a drawing annotation ----------------- */
    /* Not a floating card over the roof with a dashed line dropping out of it —
       there is no roof, and a card is UI rather than drawing. It is a note
       block with a services run to the point it feeds, which is what a plan
       does with something that arrives without walking. */
    var api = put(svg, "g", { "class": "pax-api" });
    var aw = Math.max(sc.nodes[1].title.length * 8.14, sc.nodes[1].sub.length * 6.3) + 22;
    rect(api, 560 - aw / 2, 6, aw, 40, "pax-note", 5);
    text(api, 560, 23, "pax-note-title", sc.nodes[1].title.toUpperCase());
    text(api, 560, 40, "pax-sub", sc.nodes[1].sub);
    path(api, "M 560 46 L 560 62 L 790 62 L 790 184", "pax-feed");
    path(api, "M 786 178 L 790 186 L 794 178", "pax-feed-head");

    /* ---- the key row: a chip on a leader for each place ------------------- */
    station(105, 392, sc.nodes[0], 136, 302);
    station(430, 392, sc.nodes[2], 436, 164);
    station(760, 392, sc.nodes[3], 790, 292);
    sc.channels.forEach(function (c) {
      var up = c.name === "green";
      var g = chip(890, up ? 108 : 368,
                   [{ t: c.shareText, cls: "pax-share", adv: 10.2 },
                    { t: c.label.toUpperCase(), cls: "pax-sub", adv: 6.9 }], c.name);
      leader(g, 890, up ? 108 + g.__h / 2 : 368 - g.__h / 2, 920, up ? 164 : 316);
    });

    /* ---- the passengers --------------------------------------------------- */
    /* One dot is one person, a metre across at this plan's scale, which is why
       they are small: 24 stroked blobs read as beads on a string, and a crowd
       reads as a crowd. Each carries its own offset-distance so reduced motion
       leaves them spread, and its animation-delay matches, so switching motion
       on does not jump them. The phase carries a deterministic wobble for the
       same reason: people do not walk evenly spaced. */
    var N = 28, DUR = 11;
    var redEvery = Math.max(1, Math.round(100 / (sc.channels[1].share || 4)));
    for (i = 0; i < N; i++) {
      var isRed = (i % redEvery) === 0;
      var dot = svgEl("circle", { r: DOT_R, cx: 0, cy: 0,
                                  "class": "pax-dot" + (isRed ? " is-red" : "") });
      var phase = (i / N * 100 + (((i * 37) % 11) - 5) * 0.34 + 100) % 100;
      dot.style.offsetPath = 'path("' + (isRed ? PAX_RED : PAX_GREEN) + '")';
      dot.style.offsetDistance = phase.toFixed(2) + "%";
      dot.style.animationDelay = (-(phase / 100) * DUR).toFixed(2) + "s";
      svg.appendChild(dot);
    }

    stage.appendChild(svg);
    wrap.appendChild(stage);
    if (sc.note) wrap.appendChild(el("p", "ch-note", sc.note));
    return wrap;
  }

  /* ---------------- corridor geometry ---------------- */
  /* The corridor is an ORTHOGRAPHIC PLAN — one flat view from directly above —
     so it has no horizon and therefore no perspective. There used to be a
     depth law here, mirroring tools/build_plates.py: the road opened out of a
     vanishing point over the first 620 units and then held that scale. It is
     gone, and with it the generator it had to be kept in step with. The road is
     one width from the top of the page to the foot of it.

     halfwAt() survives as the single statement of that width, because
     everything else on the corridor is measured in multiples of it: the road
     art, the flowing chevrons, the roadside cameras and the consignment. The
     corridor's scale is about 14 page units to the metre, so 52 is a real
     3.75 m lane and the carriageway below is a 7.5 m two-lane road. */
  var WP = J.route.width;
  function halfwAt() { return WP.half; }

  // The consignment, at that same 14 units to the metre: 2.55 m wide by 16.5 m
  // long — the legal maximum for an articulated combination, and a shape no
  // one can mistake for a van. It is drawn once at full size and never scaled,
  // because in a plan nothing on the ground is nearer than anything else.
  var TW = 36, TH = 232;
  function truckScale() { return 1; }

  // Centreline of the ROAD at page y. JOURNEY.route.d is traced down the
  // offside lane, so the middle of the carriageway is that path pushed back by
  // the lane offset. The road art and the route are therefore the same curve,
  // and cannot drift apart the way a traced path and a rendered picture could.
  function roadCx(y) { return at(y).x - J.route.lane * WP.half; }

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
    for (var y = 40; y < PAGE.h - 80; y += step) {
      var s = at(y), w = halfwAt(y) * 0.3, h = halfwAt(y) * 0.26;
      var path = svgEl("path", {
        "class": "chev",
        d: "M " + (-w) + " " + (-h) + " L 0 0 L " + w + " " + (-h),
        "stroke-width": String(Math.max(2.5, halfwAt(y) * 0.075)),
        transform: "translate(" + s.x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + (s.a - 90).toFixed(1) + ")"
      });
      path.style.animationDelay = (-(n % 9) * 0.29).toFixed(2) + "s";
      chevs.appendChild(path);
      n++;
    }
    $routeLayer.appendChild(chevs);
  }


  /* Roadside cameras on the transit passage.

     Drawn from JOURNEY.cameras in the same page space as the route and the
     chevrons, and sized in road half-widths from halfwAt(), so they are stated
     in the corridor's own units and stay crisp at any viewport width.

     One orientation is authored: a camera on the LEFT shoulder, its arm
     reaching in toward the road (+x) and its cone laid across the carriageway.
     The right-hand one is the same glyph mirrored. */
  function buildCameras() {
    if (!J.cameras) return;
    var g = svgEl("g", { "class": "cctv-flow" });
    J.cameras.forEach(function (c) {
      var u = halfwAt(c.y) * 0.8;              // road half-width here, and the
      // glyph is drawn at 0.8 of it: big enough to be read as a camera from the
      // back of a room, small enough that it is furniture and not a landmark
      // Measured from the CENTRE of the carriageway, not from the lane the
      // route runs down, so both shoulders stand the same distance off the road.
      var base = { x: roadCx(c.y) + c.side * 1.8 * halfwAt(c.y), y: c.y };
      var n = svgEl("g", {
        "class": "cctv",
        transform: "translate(" + base.x.toFixed(1) + "," + base.y.toFixed(1) + ")" +
                   " scale(" + (c.side < 0 ? 1 : -1) + ",1) scale(" + u.toFixed(2) + ")"
      });
      // Everything below is in road half-widths, with the mast foot at 0,0.
      // Seen from above a camera is a foundation pad, an arm reaching out over
      // the shoulder, the head on the end of it, and the cone of carriageway it
      // watches. The cone is the part that gains most from the plan: in
      // elevation it was a wash over the road, and here it is simply the piece
      // of carriageway under supervision.
      n.appendChild(pn("path", "cctv-cone", { d: "M 0.62 -0.1 L 3.4 -1.3 L 3.4 1.1 Z" }));
      n.appendChild(svgEl("rect", { "class": "cctv-pad", x: -0.2, y: -0.2, width: 0.4, height: 0.4, rx: 0.06 }));
      n.appendChild(svgEl("rect", { "class": "cctv-mast", x: 0, y: -0.055, width: 0.5, height: 0.11, rx: 0.05 }));
      var head = svgEl("g", { transform: "rotate(-14,0.5,0)" });
      head.appendChild(svgEl("rect", { "class": "cctv-body", x: 0.4, y: -0.13, width: 0.32, height: 0.26, rx: 0.06 }));
      head.appendChild(svgEl("circle", { "class": "cctv-lens", cx: 0.72, cy: 0, r: 0.1 }));
      head.appendChild(svgEl("circle", { "class": "cctv-dot", cx: 0.47, cy: 0, r: 0.045 }));
      n.appendChild(head);
      g.appendChild(n);
    });
    $routeLayer.appendChild(g);
  }

  /* =========================================================================
     CORRIDOR ART

     The corridor used to be six JPEGs generated by tools/build_plates.py and
     rasterised with Playwright. It is drawn here instead, as SVG, for three
     reasons: a schematic rasterised to JPEG carries compression artefacts on
     every edge and this page is shown on a projector; the palette had to be
     kept in step by hand between a Python file and styles.css, and now it is
     simply the CSS tokens; and the repo loses a build step.

     The whole 1600 x 4800 corridor is authored ONCE in page coordinates and
     sliced into six sections by viewBox, exactly as the generator did, so the
     seams line up by construction rather than by hand-matching. Sectioning is
     what lets content-visibility skip the rows that are off screen, which is
     the only reason the art was ever cut up.

     ON SCALE. The road and the consignment are true to each other — about 14
     page units to the metre — because that is the one proportion the eye
     actually checks, and getting it wrong is what made the old sprite read as a
     van. The facilities are not held to it: a 60 m warehouse at that scale is
     wider than the whole clear band between the cards. They are drawn instead
     as a site plan cropped to the corridor — the dock face, the apron, the gate
     line are in frame and the bulk runs off it, which is what a real drawing at
     this zoom looks like.

     Nothing here carries a colour. Every element takes a class and styles.css
     holds the palette, per the rule at the head of that file. */

  function pn(tag, cls, attrs) {
    attrs = attrs || {};
    if (cls) attrs["class"] = cls;
    return svgEl(tag, attrs);
  }
  function pRect(cls, x, y, w, h, rx) {
    var a = { x: x, y: y, width: w, height: h };
    if (rx) a.rx = rx;
    return pn("rect", cls, a);
  }
  function pPath(cls, d) { return pn("path", cls, { d: d }); }
  // Deterministic jitter: the base has to be irregular enough not to read as
  // graph paper, and identical on every load.
  function jit(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /* ---- the road, drawn from JOURNEY.route.d ---- */
  function roadSide(ya, yb, off, back) {
    var pts = [], y;
    for (y = ya; y < yb; y += 20) pts.push([roadCx(y) + off, y]);
    pts.push([roadCx(yb) + off, yb]);
    if (back) pts.reverse();
    return pts;
  }
  function strD(pts) {
    var d = "", i;
    for (i = 0; i < pts.length; i++) d += (i ? "L " : "M ") + pts[i][0].toFixed(1) + " " + pts[i][1] + " ";
    return d;
  }
  function bandD(ya, yb, off) {
    return strD(roadSide(ya, yb, -off).concat(roadSide(ya, yb, off, true))) + "Z";
  }
  function lineD(ya, yb, off) { return strD(roadSide(ya, yb, off)); }

  function buildRoad(g, ya, yb) {
    var h = WP.half;
    g.appendChild(pPath("plan-verge", bandD(ya, yb, h + 30)));
    g.appendChild(pPath("plan-shoulder", bandD(ya, yb, h + 10)));
    g.appendChild(pPath("plan-road", bandD(ya, yb, h)));
    g.appendChild(pPath("plan-edge", lineD(ya, yb, -(h - 4))));
    g.appendChild(pPath("plan-edge", lineD(ya, yb, h - 4)));
    g.appendChild(pPath("plan-centre", lineD(ya, yb, 0)));
  }

  /* ---- the base the corridor stands on ---- */
  function buildGround(g, y0, y1) {
    g.appendChild(pRect("plan-ground", 0, y0, PAGE.w, y1 - y0));
    var parcels = pn("g", "plan-parcel"), i, y, x;
    for (i = 0; i < 5; i++) {
      y = y0 + (i + jit(y0 + i * 7) * 0.8) * (y1 - y0) / 5;
      parcels.appendChild(pPath(null, "M 0 " + y.toFixed(0) + " H " + PAGE.w));
    }
    for (i = 0; i < 7; i++) {
      x = (i + jit(y0 + i * 31) * 0.9) * PAGE.w / 7;
      parcels.appendChild(pPath(null, "M " + x.toFixed(0) + " " + y0 + " V " + y1));
    }
    g.appendChild(parcels);
  }

  /* ---- a gantry straddling the carriageway ---- */
  function gantry(g, y, cls) {
    var c = roadCx(y), h = WP.half;
    if (cls) g.appendChild(pRect(cls, c - h, y - 13, h * 2, 26));
    g.appendChild(pPath("plan-span", "M " + (c - h - 34) + " " + y + " H " + (c + h + 34)));
    g.appendChild(pRect("plan-pier", c - h - 38, y - 17, 28, 34, 3));
    g.appendChild(pRect("plan-pier", c + h + 10, y - 17, 28, 34, 3));
  }

  /* ---- a rank of vehicles standing off the carriageway ---- */
  function standing(g, x, y, cols, rows, dx, dy) {
    var i, j, px, py;
    for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) {
      px = x + i * dx; py = y + j * dy;
      // Nose-down, facing the gate they are waiting for. Trailer and tractor
      // drawn separately for the same reason the consignment is: two bodies
      // with a break between them is what says heavy goods from above.
      g.appendChild(pRect("plan-parked", px, py, 26, 84, 2));
      g.appendChild(pRect("plan-cab", px + 2, py + 88, 22, 28, 2));
    }
  }

  /* =======================  the six rows  ======================= */

  /* Each row draws in two passes. ROW_ART goes down BEFORE the carriageway, for
     everything that lies beside it — aprons, sheds, yards, the slip roads that
     have to run under the road edge rather than over it. ROW_OVER goes down
     AFTER it, for the things that are ON the road: a control plaza is the
     carriageway opening out, and a gantry straddles it. */

  /* Row 1 — the 2018 baseline. The corridor's instrumentation is switched off
     on this beat (styles.css does that from body[data-beat]); what the art has
     to carry is the queue. Every consignment was opened, so the vehicles stand
     for days. They stand OFF the carriageway: the road itself carries nothing
     but the consignment anywhere on this page, which is a rule in ASSETS.md and
     an assertion in tools/verify.mjs. */
  function row1(g) {
    var c = roadCx(300);
    g.appendChild(pRect("plan-apron", c + 76, 100, 320, 590, 3));
    g.appendChild(pPath("plan-apron", "M " + (c + WP.half) + " 250 L " + (c + 76) + " 180 L " +
      (c + 76) + " 330 L " + (c + WP.half) + " 350 Z"));
    standing(g, c + 96, 138, 3, 4, 50, 136);
    g.appendChild(pPath("plan-bay", "M " + (c + 88) + " 676 H " + (c + 386)));
  }

  /* Row 2 — the border checkpoint: the hall beside the road, the secondary
     inspection bays behind it. */
  function row2(g) {
    var c = roadCx(1200), i;
    g.appendChild(pRect("plan-apron", c + 140, 1060, 340, 350, 3));
    g.appendChild(pRect("plan-built", c + 166, 1082, 300, 164, 3));
    g.appendChild(pPath("plan-built-line", "M " + (c + 166) + " 1118 H " + (c + 466)));
    for (i = 0; i < 5; i++)
      g.appendChild(pRect("plan-opening", c + 190 + i * 54, 1236, 30, 10, 1));
    for (i = 0; i < 3; i++)
      g.appendChild(pPath("plan-bay", "M " + (c + 158) + " " + (1300 + i * 36) + " h 150"));
  }

  /* The control plaza: the carriageway opening out into four lanes, each with
     its island, its booth and its barrier, under a canopy that oversails them.
     A canopy is drawn dashed, because in a plan it is the ground it covers. */
  function over2(g) {
    var c = roadCx(1200), h = WP.half, W = 150, i, lx;
    g.appendChild(pPath("plan-road",
      "M " + (roadCx(1050) - h) + " 1050 L " + (roadCx(1120) - W) + " 1120 L " +
      (roadCx(1300) - W) + " 1300 L " + (roadCx(1370) - h) + " 1370 L " +
      (roadCx(1370) + h) + " 1370 L " + (roadCx(1300) + W) + " 1300 L " +
      (roadCx(1120) + W) + " 1120 L " + (roadCx(1050) + h) + " 1050 Z"));
    for (i = 0; i < 3; i++) {
      lx = c - 75 + i * 75;
      g.appendChild(pRect("plan-island", lx - 9, 1158, 18, 104, 6));
      g.appendChild(pRect("plan-booth", lx - 13, 1196, 26, 40, 2));
    }
    for (i = 0; i < 4; i++) {
      lx = c - 112 + i * 75;
      g.appendChild(pRect("plan-barrier", lx - 28, 1288, 56, 5, 2));
    }
    g.appendChild(pRect("plan-canopy", c - 162, 1126, 324, 184, 5));
  }

  /* Row 3 — the inland transit passage: the inspection portal just past the
     gate, then the gantry where the electronic seal goes on. The two roadside
     cameras on this stretch are drawn by buildCameras() from JOURNEY.cameras. */
  function row3(g) {
    var c = roadCx(2090), i;
    g.appendChild(pRect("plan-apron", c + 74, 2036, 200, 158, 3));
    g.appendChild(pPath("plan-apron", "M " + (c + WP.half) + " 2106 L " + (c + 74) + " 2056 L " +
      (c + 74) + " 2172 L " + (c + WP.half) + " 2182 Z"));
    for (i = 0; i < 2; i++)
      g.appendChild(pPath("plan-bay", "M " + (c + 92) + " " + (2082 + i * 48) + " h 168"));
  }
  function over3(g) {
    gantry(g, 1610, "plan-scanner");
    gantry(g, 2090, null);
  }

  /* Row 4 — the customs warehouse. The dock face, its apron and the trailers
     standing at the bays are what the beat is about, so they are in frame; the
     shed itself runs off under the card, the way a site plan crops. */
  function row4(g) {
    var c = roadCx(2800), i, dy;
    g.appendChild(pRect("plan-apron", c + 58, 2596, 320, 440, 3));
    g.appendChild(pPath("plan-apron", "M " + (roadCx(2560) + WP.half) + " 2560 L " + (c + 58) + " 2632 L " +
      (c + 58) + " 2756 L " + (roadCx(2640) + WP.half) + " 2660 Z"));
    g.appendChild(pRect("plan-built", c + 196, 2646, 420, 306, 3));
    g.appendChild(pPath("plan-built-line", "M " + (c + 262) + " 2646 V 2952"));
    for (i = 0; i < 6; i++)
      g.appendChild(pRect("plan-opening", c + 190, 2682 + i * 46, 12, 32, 1));
    for (i = 0; i < 3; i++) {
      dy = 2688 + i * 92;
      g.appendChild(pRect("plan-parked", c + 84, dy, 112, 26, 2));
      g.appendChild(pPath("plan-parked-line", "M " + (c + 112) + " " + dy + " v 26"));
    }
    g.appendChild(pPath("plan-bay", "M " + (c + 58) + " 3000 H " + (c + 378)));
  }

  /* Row 5 — the declaration office, its car park, and the exit gantry at the
     row's foot. The park is drawn as painted bays, not as little cars: a rank
     of tiny vehicles is the detail that made the old art read as a toy. */
  function row5(g) {
    var c = roadCx(3600), i, j;
    g.appendChild(pRect("plan-apron", c + 64, 3416, 300, 404, 3));
    g.appendChild(pRect("plan-built", c + 90, 3440, 236, 158, 3));
    g.appendChild(pPath("plan-built-line", "M " + (c + 90) + " 3484 H " + (c + 326)));
    for (i = 0; i < 4; i++)
      g.appendChild(pRect("plan-opening", c + 112 + i * 56, 3588, 28, 10, 1));
    for (j = 0; j < 2; j++) {
      g.appendChild(pPath("plan-bay", "M " + (c + 90) + " " + (3652 + j * 76) + " h 240"));
      for (i = 0; i < 10; i++)
        g.appendChild(pPath("plan-bay", "M " + (c + 90 + i * 26.6) + " " + (3652 + j * 76) + " v 44"));
    }
  }
  function over5(g) { gantry(g, 3960, null); }

  /* Row 6 — the importer's premises, and the capital at the foot of the page.
     The city is a street grid held far back in tone. It used to be ranks of
     identical little blocks with checkerboard windows, which was the single
     most toy-like thing the deck carried. */
  function row6(g) {
    var c = roadCx(4400), i, j, x, y;
    g.appendChild(pRect("plan-apron", c + 62, 4206, 340, 440, 3));
    g.appendChild(pRect("plan-built", c + 88, 4228, 196, 124, 3));
    g.appendChild(pPath("plan-built-line", "M " + (c + 88) + " 4262 H " + (c + 284)));
    // container yard: from above a container simply IS a rectangle, which is
    // why a yard reads as freight in plan and as toys in three-quarter view
    for (j = 0; j < 7; j++) for (i = 0; i < 7; i++)
      g.appendChild(pRect("plan-container", c + 90 + i * 44, 4380 + j * 34, 38, 25, 1));
    var city = pn("g", "plan-city");
    for (j = 0; j < 9; j++) for (i = 0; i < 10; i++) {
      x = 60 + i * 152 + jit(i * 3 + j) * 26;
      y = 4120 + j * 78 + jit(i + j * 5) * 16;
      if (x > c - 320 && x < c + 470) continue;
      city.appendChild(pRect(null, x, y, 66 + jit(i * j + 2) * 54, 34 + jit(i + j) * 16, 1));
    }
    g.appendChild(city);
  }

  var ROW_ART = [row1, row2, row3, row4, row5, row6];
  var ROW_OVER = [null, over2, over3, null, over5, null];

  function buildCorridor() {
    var share = 100 / ROWS;
    for (var i = 0; i < ROWS; i++) {
      var y0 = i * ROW_H, y1 = y0 + ROW_H;
      var svg = svgEl("svg", {
        viewBox: "0 " + y0 + " " + PAGE.w + " " + ROW_H,
        preserveAspectRatio: "none", focusable: "false"
      });
      svg.style.setProperty("--t", (i * share) + "%");
      buildGround(svg, y0, y1);
      // Facilities first, then the road over them: a slip road drawn as part of
      // a facility has to run under the carriageway edge, not over it.
      ROW_ART[i](svg);
      // A little past the seam at each end, so a join never shows a hairline.
      buildRoad(svg, y0 - 30, y1 + 30);
      if (ROW_OVER[i]) ROW_OVER[i](svg);
      $corridor.appendChild(svg);
    }
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

  /* ---------------- the consignment ---------------- */
  /* An articulated goods vehicle seen from directly above, in the corridor's
     own units: 36 x 232 is 2.55 m by 16.5 m at 14 units to the metre, which is
     the legal maximum for a tractor-and-semi-trailer combination. It replaces a
     120 x 152 front three-quarter sprite — a single box body on two wheels,
     wider than it was long, which read as a small van and which the route
     heading then rotated as though it had been drawn from above anyway.

     Three things make it read as heavy goods rather than as a big car, and all
     three are cheap in plan: the length-to-width ratio (6.4 : 1), the
     ARTICULATION GAP between the tractor and the trailer, and the AXLE COUNT —
     one steer, two drive, three on the trailer bogie. The mirrors reaching out
     past the nose are the fourth: from above, nothing else has them.

     Authored NOSE-UP, which is the easier frame to hold while writing the
     coordinates, and then turned to face down the page — which is the way it
     travels. The corridor runs from the border at the head of the page to the
     capital at the foot, so the consignment drives downward, and the route
     heading the scroll frame applies is a correction of a couple of degrees on
     top of that rather than the whole of it.

     Flat fills and a thin outline only: a plan is lit from nowhere, so there
     are no gradients here and no shadow on the road. Every colour is a class
     in styles.css — see the note at the head of that file. */
  function truckSvg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + TW + '" height="' + TH +
      '" viewBox="0 0 ' + TW + ' ' + TH + '" style="overflow:visible">' +
      '<g transform="rotate(180 ' + (TW / 2) + ' ' + (TH / 2) + ')">' + inner + "</g></svg>";
  }
  var TRUCK_BASE =
    // axles: one steer, two drive, three on the trailer bogie. Drawn as bars
    // breaking the body edge, the way a vehicle plan states an axle layout.
    '<g class="hgv-wheel">' +
    '<rect x="-0.5" y="17" width="5.5" height="10" rx="1.4"/><rect x="31" y="17" width="5.5" height="10" rx="1.4"/>' +
    '<rect x="-0.5" y="51" width="5.5" height="10" rx="1.4"/><rect x="31" y="51" width="5.5" height="10" rx="1.4"/>' +
    '<rect x="-0.5" y="63" width="5.5" height="10" rx="1.4"/><rect x="31" y="63" width="5.5" height="10" rx="1.4"/>' +
    '<rect x="-3.5" y="189" width="6" height="10" rx="1.4"/><rect x="33.5" y="189" width="6" height="10" rx="1.4"/>' +
    '<rect x="-3.5" y="201" width="6" height="10" rx="1.4"/><rect x="33.5" y="201" width="6" height="10" rx="1.4"/>' +
    '<rect x="-3.5" y="213" width="6" height="10" rx="1.4"/><rect x="33.5" y="213" width="6" height="10" rx="1.4"/></g>' +
    // mirrors — the tell, from above, that this is a truck and not a car
    '<g class="hgv-mirror"><rect x="-4" y="10" width="6" height="3.4" rx="1.5"/>' +
    '<rect x="34" y="10" width="6" height="3.4" rx="1.5"/></g>' +
    // tractor unit
    '<rect class="hgv-tractor" x="3" y="0" width="30" height="76" rx="3.5"/>' +
    '<path class="hgv-glass" d="M 5.6 12 L 30.4 12 L 28.6 4.2 Q 18 1.8 7.4 4.2 Z"/>' +
    '<rect class="hgv-cab" x="6.5" y="16" width="23" height="46" rx="2.5"/>' +
    '<g class="hgv-rib"><path d="M 6.5 30 h 23"/><path d="M 6.5 46 h 23"/></g>' +
    '<g class="hgv-beacon"><circle cx="11" cy="8.4" r="1.5"/><circle cx="25" cy="8.4" r="1.5"/></g>' +
    // the articulation: the gap is what says tractor-and-trailer rather than
    // one long rigid box, and the fifth wheel is drawn in it
    '<circle class="hgv-coupling" cx="18" cy="81" r="3.6"/>' +
    // semi-trailer
    '<rect class="hgv-trailer" x="0" y="86" width="36" height="146" rx="2"/>' +
    '<path class="hgv-seam" d="M 18 89 V 229"/>' +
    '<g class="hgv-rib"><path d="M 0 106 h 36"/><path d="M 0 124 h 36"/><path d="M 0 142 h 36"/>' +
    '<path d="M 0 160 h 36"/><path d="M 0 178 h 36"/><path d="M 0 196 h 36"/><path d="M 0 214 h 36"/></g>' +
    // rear doors
    '<path class="hgv-doors" d="M 0 226 h 36"/>';
  var TRUCK_VARIANTS = {
    scanned:
      '<rect class="hgv-scan" x="-6" y="80" width="48" height="158" rx="4"/>' +
      '<circle class="hgv-scan-dot" cx="18" cy="80" r="4"/>',
    sealed:
      '<rect class="hgv-seal" x="12" y="219" width="12" height="15" rx="2"/>' +
      '<path class="hgv-seal-ink" d="M 18 222.5 v 8"/>'
  };
  var truckBody;
  function buildTruck() {
    // No bob. A vehicle that bounces on the spot is a cartoon device, and this
    // one is an object on a drawing.
    truckBody = el("div", "truck-body");
    truckBody.style.cssText = "left:0;top:0;width:" + TW + "px;height:" + TH + "px";
    var base = el("div", "truck-variant is-on");
    base.innerHTML = truckSvg(TRUCK_BASE);
    truckBody.appendChild(base);
    ["scanned", "sealed"].forEach(function (name) {
      var v = el("div", "truck-variant");
      v.dataset.variant = name;
      v.innerHTML = truckSvg(TRUCK_VARIANTS[name]);
      truckBody.appendChild(v);
    });
    $truck.appendChild(truckBody);
  }
  var lastVariant = null;
  function setVariant(name) {
    if (name === lastVariant) return;
    lastVariant = name;
    truckBody.querySelectorAll("[data-variant]").forEach(function (v) {
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

  /* The interactive scenes in sections/ are registered on window.SceneCore
     before this file is parsed. They get HOST — this file's own private
     helpers, passed rather than reimplemented — and nothing else: they cannot
     reach the engine, and the engine does not know they exist. Delete the
     directory and every builder below falls back to the card it replaced. */
  var HOST = {
    el: el, svgEl: svgEl, icon: icon, fx: fx,
    iconPath: function (n) { return ICONS[n] || ICONS.doc; },
    Metric: Metric, Bullets: Bullets, richText: richText, screenShell: screenShell,
    clamp: clamp, pct: pct, data: D,
    reduce: function () { return REDUCE; }
  };
  function sceneScreen(key, fallback) {
    var S = window.SceneCore;
    if (!S || !S.screens[key]) return fallback;
    return function (def, d) { return S.screens[key](def, d, HOST); };
  }

  var SCREEN_BUILDERS = {
    cooperation: buildCooperationScreen,
    targeting: sceneScreen("targeting", buildTargetingScreen),
    passengers: buildPassengerScreen,
    aiRisk: sceneScreen("aiRisk", buildTargetingScreen)
  };

  function buildBeats() {
    var before = document.getElementById("screens-before");
    var after = document.getElementById("screens-after");
    var lastCorridorSection = BEATS.reduce(function (n, b) {
      return b.kind === "corridor" ? Math.max(n, b.section) : n;
    }, 0);
    BEATS.forEach(function (def) {
      var d = D.beats[def.key] || D[def.key];
      if (!d) throw new Error("no data for beat " + def.key);
      if (def.kind === "corridor") {
        beatEls.push(buildCorridorRow(def, d));
      } else {
        var node = SCREEN_BUILDERS[def.key](def, d);
        (def.section > lastCorridorSection ? after : before).appendChild(node);
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
     1-8, arrows). What is left of the page's own furniture is the closing
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
      var lead = D.beats[mine[0].key] || D[mine[0].key];
      var card = el("button", "ov-card seg-" + (speakerOf(s.n) + 1));
      card.type = "button";
      card.appendChild(el("span", "ov-n", "SECTION " + s.n + " · " + s.short.toUpperCase()));
      card.appendChild(el("span", "ov-t", lead.headline));
      card.appendChild(el("span", "ov-d", lead.overview));
      if (mine.length > 1) {
        var subs = el("span", "ov-beats");
        mine.forEach(function (b) {
          var bd = D.beats[b.key] || D[b.key];
          subs.appendChild(el("span", "ov-beat", bd.rail));
        });
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
  /* The card an information-system marker used to open, unchanged. A marker
     with a scene registered for it opens the scene instead; the one that has
     none — the targeting centre's role at the border — still comes through
     here. */
  function modalCard(m, body) {
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
  }
  function openModal(id, opener) {
    var m = D.meta.modals[id];
    if (!m) { console.error("no modal:", id); return; }
    lastFocus = opener || document.activeElement;
    var body = $modal.querySelector(".modal-body");
    body.textContent = "";
    var scene = window.SceneCore && window.SceneCore.modals[id];
    body.classList.toggle("scene-host", !!scene);
    if (scene) body.appendChild(scene(m, HOST));
    else modalCard(m, body);
    engine.view = "modal";
    $modal.classList.add("is-open");
    // data-view is written last, and SceneCore watches it: by the time the
    // scene is told to start, its node is already in the document.
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
  // than per scroll frame: ten getBoundingClientRect() calls inside the scroll
  // handler is ten forced layouts a frame, and the layout does not move while
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
    // The route now starts above the page edge, so that the road runs off the
    // top rather than beginning at a horizon. The consignment must not follow
    // it up there: half its length above y 0 and it hangs over the screen
    // section stacked above the corridor.
    var pageY = clamp((focusLine() - rect.top) / k,
      Math.max(SAMPLES[0].y, TH / 2), SAMPLES[SAMPLES.length - 1].y);
    var s = at(pageY);
    var ts = truckScale();
    // Anchored on the middle of the vehicle, not on the bottom edge: the old
    // sprite was an elevation and hung from its contact point with the road,
    // but a plan object simply sits centred on the point it occupies.
    $truck.style.transform = "translate(" + s.x.toFixed(2) + "px," + pageY.toFixed(2) + "px) rotate(" +
      (s.a - 90).toFixed(2) + "deg) scale(" + ts.toFixed(3) + ") translate(" + (-TW / 2) + "px," + (-TH / 2) + "px)";
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
      } else if (engine.view === "overview" && /^(Digit|Numpad)[1-8]$/.test(code)) {
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
    else if (/^(Digit|Numpad)[1-8]$/.test(code)) goToSection(+code.slice(-1));
    else used = false;
    if (used) e.preventDefault();
  });

  /* ---------------- init ---------------- */
  function init() {
    var deepLink = /#beat-([a-z0-9]+)/i.exec(location.hash);
    var root = document.documentElement.style;
    root.setProperty("--sec-h", (100 / ROWS) + "%");
    root.setProperty("--fill", String(FILL));   // the screens cover the viewport
                                                // from the focus line too
    root.setProperty("--rows", String(ROWS));
    $space.style.width = PAGE.w + "px";
    $space.style.height = PAGE.h + "px";
    $routeLayer.style.width = PAGE.w + "px";
    $routeLayer.style.height = PAGE.h + "px";
    $routeLayer.setAttribute("viewBox", "0 0 " + PAGE.w + " " + PAGE.h);
    document.title = D.meta.title + " · " + D.meta.org;
    // buildRoute() first: it samples the route, and the corridor art is drawn
    // around that sample table.
    buildRoute();
    buildCorridor();
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
