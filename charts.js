/* =====================================================================
   WCO ITR 2025 — Explore app · component library  (charts.js)
   ---------------------------------------------------------------------
   Reusable chart primitives for the Explore app. Every component follows
   ONE contract:

       ITR.<name>(opts) -> DOM node   (inline <svg>, or a wrapper <div>
                                        that holds inline SVG + an HTML
                                        legend where a legend is needed)

   Shared across every component:
     · ITR.fmt        one-decimal number formatting (pct / tonnes / counts)
     · ITR.palette    WCO-blue anchor + colourblind-safe categorical set
                      + honest single-hue sequential ramp
     · ITR.tip        ONE tooltip layer (singleton) reused by all marks

   No framework, no chart library, no CDN. Hand-authored inline SVG.
   Loaded as a plain <script>; exposes a single global: window.ITR.
   Signatures + options are documented in COMPONENTS.md.
   ===================================================================== */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---- tiny DOM helpers ------------------------------------------- */
  function svg(tag, attrs, kids) { return make(SVGNS, tag, attrs, kids); }
  function h(tag, attrs, kids)  { return make(null,  tag, attrs, kids); }
  function make(ns, tag, attrs, kids) {
    var e = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === "class") e.setAttribute("class", attrs[k]);
      else if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "style" && ns == null) e.setAttribute("style", attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* =================================================================
     PALETTE  — documented once, reused verbatim by every section.
     Anchor: WCO blue #2F6DB5. Categorical set is Okabe–Ito (the
     reference colourblind-safe palette) with its blue swapped for the
     WCO anchor; validated at CVD ΔE ≈ 17.6 (target ≥ 12). Gray is the
     context / reference colour. Sequential ramp is single-hue blue,
     light→dark, so choropleths and heatgrids stay honest.
     ================================================================= */
  var PALETTE = {
    accent:     "#2F6DB5",  // WCO blue — the anchor / primary series
    accentDeep: "#1B4A82",  // dark end of the blue ramp
    accentPale: "#EAF2FA",  // pale end of the blue ramp
    gray:       "#8A8F9A",  // context / previous-year / reference series
    grayPale:   "#D9DCE2",
    ink:        "#1A1726",
    inkSoft:    "#5A5E6B",
    surface:    "#FFFFFF",
    hairline:   "#E4E7ED",
    noData:     "#ECEEF1",  // map: no value
    good:       "#2E8B57",  // up  (context only, paired with arrow/label)
    bad:        "#C1503A",  // down (context only, paired with arrow/label)
    // fixed categorical order — assign by entity, never cycle a 9th hue
    cat: ["#2F6DB5", "#E69F00", "#009E73", "#CC79A7", "#D55E00",
          "#56B4E9", "#8C6BB1", "#B23A3A"]
  };
  function catColor(i) { return PALETTE.cat[i % PALETTE.cat.length]; }

  // honest single-hue sequential ramp (pale -> accent -> deep), t in [0,1]
  function hex2rgb(x){ x=x.replace("#",""); return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]; }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function mix(c1,c2,t){ var a=hex2rgb(c1),b=hex2rgb(c2);
    return "rgb("+Math.round(lerp(a[0],b[0],t))+","+Math.round(lerp(a[1],b[1],t))+","+Math.round(lerp(a[2],b[2],t))+")"; }
  function ramp(t){
    t = Math.max(0, Math.min(1, t));
    return t < 0.6 ? mix(PALETTE.accentPale, PALETTE.accent, t/0.6)
                   : mix(PALETTE.accent, PALETTE.accentDeep, (t-0.6)/0.4);
  }

  /* =================================================================
     NUMBER FORMATTING — one decimal everywhere it is a rate or a
     quantity; counts are integers with thousands separators.
     ================================================================= */
  var fmt = {
    pct:  function (v) { return (v == null ? "–" : (+v).toFixed(1) + "%"); },
    dec:  function (v) { return (v == null ? "–" : (+v).toLocaleString("en-US", {minimumFractionDigits:1, maximumFractionDigits:1})); },
    int:  function (v) { return (v == null ? "–" : Math.round(+v).toLocaleString("en-US")); },
    // tonnes: one decimal, with a 't' unit
    t:    function (v) { return fmt.dec(v) + " t"; },
    // compact counts for tight labels (1.2k / 34.7k / 1.3M)
    k:    function (v) {
      v = +v;
      if (Math.abs(v) >= 1e6) return (v/1e6).toFixed(1) + "M";
      if (Math.abs(v) >= 1e4) return (v/1e3).toFixed(1) + "k";
      return Math.round(v).toLocaleString("en-US");
    },
    signedPct: function (v) { return (v > 0 ? "+" : "") + (+v).toFixed(1) + "%"; },
    delta: function (curr, prev) {                 // YoY % change, guarded
      if (prev == null || prev === 0) return null;
      return (curr - prev) / prev * 100;
    }
  };

  /* =================================================================
     TOOLTIP — one shared layer. Every mark calls tip.bind(node, htmlFn).
     ================================================================= */
  var tip = (function () {
    var box = null;
    function ensure() {
      if (box) return box;
      box = h("div", { class: "itr-tip", role: "status", "aria-live": "polite" });
      box.style.cssText =
        "position:fixed;z-index:60;pointer-events:none;opacity:0;transition:opacity .12s ease;" +
        "max-width:260px;background:#1A1726;color:#fff;font:500 12.5px/1.4 -apple-system,'Segoe UI',system-ui,sans-serif;" +
        "padding:8px 10px;border-radius:8px;box-shadow:0 6px 22px rgba(26,23,38,.28);";
      document.body.appendChild(box);
      return box;
    }
    function move(x, y) {
      var b = ensure(), pad = 14;
      var w = b.offsetWidth, ht = b.offsetHeight;
      var nx = x + pad, ny = y + pad;
      if (nx + w > window.innerWidth - 6)  nx = x - w - pad;
      if (ny + ht > window.innerHeight - 6) ny = y - ht - pad;
      b.style.left = Math.max(6, nx) + "px";
      b.style.top  = Math.max(6, ny) + "px";
    }
    function show(html, x, y) { var b = ensure(); b.innerHTML = html; b.style.opacity = "1"; move(x, y); }
    function hide() { if (box) box.style.opacity = "0"; }
    function bind(node, htmlFn) {
      node.style.cursor = "default";
      node.addEventListener("pointerenter", function (e) { show(htmlFn(), e.clientX, e.clientY); });
      node.addEventListener("pointermove",  function (e) { move(e.clientX, e.clientY); });
      node.addEventListener("pointerleave", hide);
      // touch: show on tap, hide shortly after
      node.addEventListener("touchstart", function (e) {
        var t = e.touches[0]; if (t) show(htmlFn(), t.clientX, t.clientY);
      }, { passive: true });
      node.addEventListener("touchend", function () { setTimeout(hide, 1400); }, { passive: true });
    }
    return { show: show, hide: hide, move: move, bind: bind };
  })();

  /* rows helper for tooltips */
  function tipRows(title, rows) {
    var s = "<b style='display:block;margin-bottom:3px'>" + esc(title) + "</b>";
    rows.forEach(function (r) {
      s += "<span style='display:flex;justify-content:space-between;gap:14px'>" +
           "<span style='opacity:.82'>" + esc(r[0]) + "</span>" +
           "<span style='font-variant-numeric:tabular-nums;font-weight:600'>" + esc(r[1]) + "</span></span>";
    });
    return s;
  }

  /* small helper: pick .en (bilingual objects in the data) or a plain label */
  function lbl(d) { return d && d.en != null ? d.en : (d && d.label != null ? d.label : String(d)); }

  /* =================================================================
     1 · HBAR — ranked horizontal bars, single accent, direct labels.
        opts: { data:[{label,value}], value?, label?, max?, color?,
                valueFmt?, unit?, width?, rowH? }
     ================================================================= */
  function hbar(opts) {
    var data = opts.data.slice();
    var getV = accessor(opts.value, "value");
    var getL = accessor(opts.label, "label");
    var vf = opts.valueFmt || fmt.int;
    var color = opts.color || PALETTE.accent;
    var W = opts.width || 680, rowH = opts.rowH || 30, barH = opts.barH || 14;
    var labelW = opts.labelW || 176, valW = 58, gap = 10;
    var x0 = labelW + gap, barMax = W - x0 - valW - 8;
    var max = opts.max != null ? opts.max : Math.max.apply(null, data.map(getV).concat([0]));
    if (max <= 0) max = 1;
    var padT = 6, H = data.length * rowH + padT + 6;

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Bar chart"), class: "c-svg c-hbar" });

    data.forEach(function (d, i) {
      var v = getV(d), name = getL(d);
      var y = padT + i * rowH + rowH / 2;
      var bw = Math.max(v <= 0 ? 0 : 2, v / max * barMax);
      root.appendChild(svg("text", { x: labelW, y: y + 4, "text-anchor": "end", class: "c-cat" }, name));
      var rect = svg("rect", { x: x0, y: y - barH / 2, width: bw.toFixed(1), height: barH, rx: 3, fill: color });
      root.appendChild(rect);
      root.appendChild(svg("text", { x: (x0 + bw + 6).toFixed(1), y: y + 4, class: "c-val", fill: color }, vf(v)));
      tip.bind(rect, (function (name, v) { return function () {
        return tipRows(name, [[opts.metric || "Value", vf(v)]]);
      }; })(name, v));
    });
    return root;
  }

  /* =================================================================
     2 · groupedYoY — paired previous / current bars per category,
         with a YoY delta chip. Two series -> legend is present.
        opts: { data:[{label,prev,curr}], prev?, curr?, label?,
                years:{prev,curr}, valueFmt?, max?, metric? }
     ================================================================= */
  function groupedYoY(opts) {
    var data = opts.data.slice();
    var gp = accessor(opts.prev, "prev"), gc = accessor(opts.curr, "curr"), gl = accessor(opts.label, "label");
    var vf = opts.valueFmt || fmt.int;
    var yrs = opts.years || { prev: "Previous", curr: "Latest" };
    var W = opts.width || 680, rowH = 52, barH = 13, pairGap = 5;
    var labelW = opts.labelW || 168, valW = 62, gap = 10;
    // reserve a right-hand lane for the YoY delta chip so it never collides
    // with the (near-max) value label sitting at the end of a full bar
    var deltaW = opts.showDelta === false ? 0 : 66;
    var x0 = labelW + gap, barMax = W - x0 - valW - deltaW - 8;
    var max = opts.max != null ? opts.max
      : Math.max.apply(null, data.map(function (d) { return Math.max(gp(d), gc(d)); }).concat([0]));
    if (max <= 0) max = 1;
    var legendH = 26, padT = legendH + 4, H = data.length * rowH + padT + 6;

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Grouped year-on-year bars"), class: "c-svg c-yoy" });

    // in-svg legend (two series)
    root.appendChild(legendSwatch(root, x0, 14, PALETTE.accent, String(yrs.curr)));
    root.appendChild(legendSwatch(root, x0 + 92, 14, PALETTE.gray, String(yrs.prev)));

    data.forEach(function (d, i) {
      var p = gp(d), c = gc(d), name = gl(d);
      var yTop = padT + i * rowH;
      var yc = yTop + rowH / 2;
      // label
      root.appendChild(svg("text", { x: labelW, y: yc + 4, "text-anchor": "end", class: "c-cat" }, name));
      // current (accent) on top, previous (gray) below
      var wC = Math.max(c <= 0 ? 0 : 2, c / max * barMax);
      var wP = Math.max(p <= 0 ? 0 : 2, p / max * barMax);
      var yC = yc - pairGap / 2 - barH, yP = yc + pairGap / 2;
      var rC = svg("rect", { x: x0, y: yC, width: wC.toFixed(1), height: barH, rx: 3, fill: PALETTE.accent });
      var rP = svg("rect", { x: x0, y: yP, width: wP.toFixed(1), height: barH, rx: 3, fill: PALETTE.gray });
      root.appendChild(rP); root.appendChild(rC);
      root.appendChild(svg("text", { x: (x0 + wC + 6).toFixed(1), y: yC + barH - 2, class: "c-val", fill: PALETTE.accent }, vf(c)));
      root.appendChild(svg("text", { x: (x0 + wP + 6).toFixed(1), y: yP + barH - 2, class: "c-val c-val-dim", fill: PALETTE.gray }, vf(p)));
      // delta chip (reserved right lane, over the pair)
      var dl = opts.showDelta === false ? null : fmt.delta(c, p);
      if (dl != null) {
        var up = dl >= 0, col = up ? PALETTE.good : PALETTE.bad;
        root.appendChild(svg("text", { x: W - 4, y: yc + 4, "text-anchor": "end",
          class: "c-delta", fill: col }, (up ? "▲ " : "▼ ") + fmt.signedPct(dl)));
      }
      var tt = function () {
        var rows = [[String(yrs.curr), vf(c)], [String(yrs.prev), vf(p)]];
        if (dl != null) rows.push(["Change", fmt.signedPct(dl)]);
        return tipRows(name, rows);
      };
      tip.bind(rC, tt); tip.bind(rP, tt);
    });
    return root;
  }

  function legendSwatch(root, x, y, color, text) {
    var g = svg("g", {});
    g.appendChild(svg("rect", { x: x, y: y - 9, width: 12, height: 12, rx: 3, fill: color }));
    g.appendChild(svg("text", { x: x + 18, y: y + 1, class: "c-leg" }, text));
    return g;
  }

  /* =================================================================
     3 · DONUT / DONUT-B — composition ring. Returns a wrapper div with
         inline SVG + an HTML legend (values + shares).
        opts: { data:[{label,value}], value?, label?, colors?, valueFmt?,
                centerValue?, centerLabel?, variant? ('a'|'b') }
        donutB = same ring, but the centre reads the LEADING slice's
        share as a headline (used for single-emphasis distributions).
     ================================================================= */
  function donut(opts) {
    var data = opts.data.slice();
    var getV = accessor(opts.value, "value");
    var getL = accessor(opts.label, "label");
    var vf = opts.valueFmt || fmt.int;
    var variant = opts.variant || "a";
    var total = data.reduce(function (s, d) { return s + getV(d); }, 0) || 1;
    var colors = opts.colors || data.map(function (_, i) { return catColor(i); });

    var S = 220, cx = S / 2, cy = S / 2, R = 96, r = 60;
    var box = svg("svg", { viewBox: "0 0 " + S + " " + S, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Donut chart"), class: "c-svg c-donut" });
    var a0 = -Math.PI / 2;
    data.forEach(function (d, i) {
      var v = getV(d), frac = v / total, a1 = a0 + frac * Math.PI * 2;
      var p = svg("path", { d: arc(cx, cy, R, r, a0, a1), fill: colors[i], stroke: PALETTE.surface, "stroke-width": 2 });
      box.appendChild(p);
      tip.bind(p, (function (d, v, frac) { return function () {
        return tipRows(getL(d), [[opts.metric || "Value", vf(v)], ["Share", fmt.pct(frac * 100)]]);
      }; })(d, v, frac));
      a0 = a1;
    });
    // centre text
    var cvVal, cvLab;
    if (variant === "b") {
      var lead = data.slice().sort(function (a, b) { return getV(b) - getV(a); })[0];
      cvVal = fmt.pct(getV(lead) / total * 100);
      cvLab = opts.centerLabel || getL(lead);
    } else {
      cvVal = opts.centerValue != null ? opts.centerValue : fmt.k(total);
      cvLab = opts.centerLabel || "total";
    }
    box.appendChild(svg("text", { x: cx, y: cy - 2, "text-anchor": "middle", class: "c-center-v" }, cvVal));
    box.appendChild(svg("text", { x: cx, y: cy + 16, "text-anchor": "middle", class: "c-center-l" }, cvLab));

    // HTML legend
    var leg = h("ul", { class: "c-legend" });
    data.forEach(function (d, i) {
      var v = getV(d);
      leg.appendChild(h("li", {}, [
        h("span", { class: "c-sw", style: "background:" + colors[i] }),
        h("span", { class: "c-leg-name", text: getL(d) }),
        h("span", { class: "c-leg-val", text: vf(v) + "  ·  " + fmt.pct(v / total * 100) })
      ]));
    });

    return h("div", { class: "c-donut-wrap" }, [box, leg]);
  }
  function donutB(opts) { opts = shallow(opts); opts.variant = "b"; return donut(opts); }

  /* =================================================================
     4 · STACKED BAR — one stacked row per category (e.g. direction by
         country). Returns wrapper div (svg + HTML legend for the keys).
        opts: { data:[{label, <key>:v,...}], keys:[..], keyLabels?,
                colors?, mode?('value'|'pct'), label?, valueFmt? }
     ================================================================= */
  function stackedBar(opts) {
    var data = opts.data.slice();
    var keys = opts.keys;
    var getL = accessor(opts.label, "label");
    var vf = opts.valueFmt || fmt.int;
    var mode = opts.mode || "value";
    var colors = opts.colors || keys.map(function (_, i) { return catColor(i); });
    var keyLab = opts.keyLabels || {};

    var W = opts.width || 680, rowH = 34, barH = 17;
    var labelW = opts.labelW || 150, valW = 66, gap = 10;
    var x0 = labelW + gap, barMax = W - x0 - valW - 8;
    var rowTot = data.map(function (d) { return keys.reduce(function (s, k) { return s + (+d[k] || 0); }, 0); });
    var max = mode === "pct" ? 1 : Math.max.apply(null, rowTot.concat([0]));
    if (max <= 0) max = 1;
    var padT = 6, H = data.length * rowH + padT + 6;

    var box = svg("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Stacked bars"), class: "c-svg c-stacked" });

    data.forEach(function (d, i) {
      var y = padT + i * rowH + rowH / 2, name = getL(d);
      var tot = rowTot[i] || 1;
      var full = mode === "pct" ? barMax : (tot / max * barMax);
      box.appendChild(svg("text", { x: labelW, y: y + 4, "text-anchor": "end", class: "c-cat" }, name));
      var xx = x0;
      keys.forEach(function (k, ki) {
        var v = +d[k] || 0; if (v <= 0) return;
        // width proportional to v within the row's drawn length `full`
        var w = v / tot * full;
        var seg = svg("rect", { x: xx.toFixed(1), y: y - barH / 2, width: Math.max(0.5, w).toFixed(1), height: barH,
          fill: colors[ki], stroke: PALETTE.surface, "stroke-width": 1.5 });
        box.appendChild(seg);
        tip.bind(seg, (function (name, k, v, tot) { return function () {
          return tipRows(name, [[keyLab[k] || k, vf(v)], ["Share of row", fmt.pct(v / tot * 100)]]);
        }; })(name, k, v, tot));
        xx += w;
      });
      box.appendChild(svg("text", { x: (x0 + full + 6).toFixed(1), y: y + 4, class: "c-val", fill: PALETTE.inkSoft },
        mode === "pct" ? "100%" : vf(tot)));
    });

    var leg = h("ul", { class: "c-legend c-legend-row" });
    keys.forEach(function (k, ki) {
      leg.appendChild(h("li", {}, [
        h("span", { class: "c-sw", style: "background:" + colors[ki] }),
        h("span", { class: "c-leg-name", text: keyLab[k] || k })
      ]));
    });
    return h("div", { class: "c-stacked-wrap" }, [leg, box]);
  }

  /* =================================================================
     5 · CHOROPLETH — world map, single honest hue. Reuses
         data/world_map_paths.json. Skewed counts use a sqrt transform
         so mid values stay visible (documented in DATA_NOTES.md).
        opts: { world, values:{iso:v}, valueFmt?, max?, gamma?,
                legendLabel?, regionOf? }
     ================================================================= */
  function choropleth(opts) {
    var world = opts.world, values = opts.values;
    var vf = opts.valueFmt || fmt.int;
    var gamma = opts.gamma || 0.5; // sqrt by default
    var vals = Object.keys(values).map(function (k) { return values[k]; });
    var max = opts.max != null ? opts.max : Math.max.apply(null, vals.concat([0]));
    if (max <= 0) max = 1;

    function colorFor(iso) {
      var v = values[iso];
      if (v == null) return PALETTE.noData;
      return ramp(Math.pow(v / max, gamma));
    }
    var box = svg("svg", { viewBox: world.viewBox, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "World choropleth"), class: "c-svg c-map" });
    var paths = world.paths;
    Object.keys(paths).forEach(function (iso) {
      var p = svg("path", { d: paths[iso], class: "c-country", fill: colorFor(iso) });
      var v = values[iso];
      if (v != null) tip.bind(p, (function (iso, v) { return function () {
        return tipRows(opts.nameOf ? opts.nameOf(iso) : iso, [[opts.metric || "Value", vf(v)]]);
      }; })(iso, v));
      box.appendChild(p);
    });

    // legend: pale -> deep gradient bar
    var gid = "grad" + Math.round(max) + "_" + Object.keys(values).length;
    var defs = svg("defs", {});
    var lg = svg("linearGradient", { id: gid, x1: "0", x2: "1", y1: "0", y2: "0" });
    [0, 0.5, 1].forEach(function (s) { lg.appendChild(svg("stop", { offset: (s * 100) + "%", "stop-color": ramp(s) })); });
    defs.appendChild(lg); box.appendChild(defs);

    var leg = h("div", { class: "c-map-legend" }, [
      h("span", { class: "c-leg-min", text: fmt.k(0) }),
      h("span", { class: "c-grad", style: "background:linear-gradient(90deg," + ramp(0) + "," + ramp(0.5) + "," + ramp(1) + ")" }),
      h("span", { class: "c-leg-max", text: fmt.k(max) }),
      h("span", { class: "c-leg-cap", text: opts.legendLabel || "low → high" })
    ]);
    return h("div", { class: "c-map-wrap" }, [box, leg]);
  }

  /* =================================================================
     6 · HEATGRID — matrix heatmap, single honest hue.
        opts: { rows:[labels], cols:[labels], matrix:[[..]],
                valueFmt?, gamma?, max?, rowTitle?, colTitle?,
                muteDiagonal? }
     ================================================================= */
  function heatGrid(opts) {
    var rows = opts.rows, cols = opts.cols, m = opts.matrix;
    var vf = opts.valueFmt || fmt.int;
    var gamma = opts.gamma || 0.6;
    var flat = []; m.forEach(function (r) { r.forEach(function (v) { flat.push(+v || 0); }); });
    var max = opts.max != null ? opts.max : Math.max.apply(null, flat.concat([0]));
    if (max <= 0) max = 1;

    var W = opts.width || 700;
    var padL = opts.labelW || 150, padTop = opts.colLabelH || 76, padR = 6, padB = 6;
    var cw = (W - padL - padR) / cols.length;
    var ch = opts.cellH || 30;
    var H = padTop + rows.length * ch + padB;

    var box = svg("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Heat grid"), class: "c-svg c-heat" });

    // column labels (rotated)
    cols.forEach(function (c, j) {
      var x = padL + j * cw + cw / 2;
      var t = svg("text", { x: x, y: padTop - 8, class: "c-heat-col",
        transform: "rotate(-40 " + x + " " + (padTop - 8) + ")", "text-anchor": "start" }, lbl(c));
      box.appendChild(t);
    });
    rows.forEach(function (rlab, i) {
      var y = padTop + i * ch;
      box.appendChild(svg("text", { x: padL - 8, y: y + ch / 2 + 4, "text-anchor": "end", class: "c-heat-row" }, lbl(rlab)));
      cols.forEach(function (clab, j) {
        var v = +m[i][j] || 0;
        var x = padL + j * cw;
        var muted = opts.muteDiagonal && i === j;
        var cell = svg("rect", { x: x + 1.2, y: y + 1.2, width: (cw - 2.4).toFixed(1), height: (ch - 2.4).toFixed(1),
          rx: 2.5, fill: v <= 0 ? PALETTE.noData : ramp(Math.pow(v / max, gamma)),
          opacity: muted ? 0.35 : 1 });
        box.appendChild(cell);
        // value label for the strongest cells (keeps it readable, not noisy)
        if (v > 0 && v / max >= 0.18) {
          var dark = v / max >= 0.42;
          box.appendChild(svg("text", { x: x + cw / 2, y: y + ch / 2 + 4, "text-anchor": "middle",
            class: "c-heat-v", fill: dark ? "#fff" : PALETTE.ink }, fmt.k(v)));
        }
        if (v > 0) tip.bind(cell, (function (rlab, clab, v) { return function () {
          return tipRows(lbl(rlab) + " × " + lbl(clab), [[opts.metric || "Value", vf(v)]]);
        }; })(rlab, clab, v));
      });
    });
    return box;
  }

  /* =================================================================
     7 · OPER PANELS — 2×2 of small hbars:
         location · direction · concealment · detection.
        opts: { location:[{en,cases}], direction:[{en,pct}],
                concealment:[{en,cases}], detection:[{en,pct}], topN? }
        Missing panels are skipped; grid stays clean.
     ================================================================= */
  function operPanels(opts) {
    var topN = opts.topN || 6;
    var panels = [
      { key: "location",    title: "Detection location", data: opts.location,    vf: fmt.int, metric: "Cases", field: "cases" },
      { key: "direction",   title: "Trade direction",    data: opts.direction,   vf: fmt.pct, metric: "Share",  field: "pct" },
      { key: "concealment", title: "Concealment method", data: opts.concealment, vf: fmt.int, metric: "Cases", field: "cases" },
      { key: "detection",   title: "Detection method",   data: opts.detection,   vf: fmt.pct, metric: "Share",  field: "pct" }
    ];
    var grid = h("div", { class: "c-oper" });
    panels.forEach(function (p) {
      if (!p.data || !p.data.length) return;
      var rows = p.data.slice(0, topN);
      var cell = h("div", { class: "c-oper-cell" }, [
        h("h4", { class: "c-oper-title", text: p.title })
      ]);
      cell.appendChild(hbar({
        data: rows, value: p.field, label: "en", metric: p.metric,
        valueFmt: p.vf, color: PALETTE.accent, width: 360, rowH: 26, barH: 12,
        labelW: 128, ariaLabel: p.title
      }));
      grid.appendChild(cell);
    });
    return grid;
  }

  /* =================================================================
     8 · KPI TILE — one headline figure + label (+ optional sub / delta).
        opts: { value, label, sub?, delta?(number, %) , accent? }
     ================================================================= */
  function kpi(opts) {
    var kids = [
      h("div", { class: "c-kpi-v", text: opts.value, style: opts.accent ? "color:" + opts.accent : null }),
      h("div", { class: "c-kpi-l", text: opts.label })
    ];
    if (opts.delta != null) {
      var up = opts.delta >= 0;
      kids.push(h("div", { class: "c-kpi-d " + (up ? "up" : "down"),
        text: (up ? "▲ " : "▼ ") + fmt.signedPct(opts.delta) + (opts.deltaLabel ? " " + opts.deltaLabel : "") }));
    }
    if (opts.sub) kids.push(h("div", { class: "c-kpi-s", text: opts.sub }));
    return h("div", { class: "c-kpi" }, kids);
  }

  /* =================================================================
     9 · VOLUME PROFILE — a compact data table:
         sub-category × (seizures / total / per-seizure). One-decimal
         where a value is a rate, integer counts with thousands
         separators, tabular-nums, minimal chrome. A faint single-hue
         magnitude bar sits behind the "total" column to aid scanning;
         every cell keeps its direct value, so identity is never
         colour-alone. Structural twin of `operPanels` in spirit —
         reused verbatim by Revenue, Environmental Crime and Security.
        opts: { data:[{label,seizures,total,perSeiz}], label?, seizures?,
                total?, perSeiz?, seizFmt?, totalFmt?, perFmt?, unit?,
                catLabel?, totalLabel?, perLabel?, topN?, sort?(=true),
                showTotal?(=true), bar?(=true), ariaLabel? }
     ================================================================= */
  function volumeProfile(opts) {
    var all = opts.data.slice();
    var getL = accessor(opts.label,    "en");
    var getS = accessor(opts.seizures, "seizures");
    var getT = accessor(opts.total,    "qty");
    var getP = accessor(opts.perSeiz,  "perSeiz");
    var sf = opts.seizFmt  || fmt.int;
    var tf = opts.totalFmt || fmt.int;
    var pf = opts.perFmt   || fmt.int;
    var unit = opts.unit || "";
    var withBar = opts.bar !== false;
    if (opts.sort !== false) all.sort(function (a, b) { return getT(b) - getT(a); });

    // full totals — the footer reports EVERY sub-category, not just the shown ones
    var sumS = 0, sumT = 0;
    all.forEach(function (d) { sumS += +getS(d) || 0; sumT += +getT(d) || 0; });

    // display rows; when topN truncates, the tail folds into an explicit
    // "Other" row so the visible rows still reconcile to the footer total
    // (no silent truncation).
    var rows;
    if (opts.topN && all.length > opts.topN) {
      rows = all.slice(0, opts.topN).map(function (d) {
        return { en: getL(d), s: +getS(d) || 0, t: +getT(d) || 0, p: getP(d) };
      });
      var tail = all.slice(opts.topN), oS = 0, oT = 0;
      tail.forEach(function (d) { oS += +getS(d) || 0; oT += +getT(d) || 0; });
      rows.push({ en: (opts.otherLabel || "Other") + " (" + tail.length + ")",
        s: oS, t: oT, p: oS > 0 ? Math.round(oT / oS) : null });
    } else {
      rows = all.map(function (d) { return { en: getL(d), s: +getS(d) || 0, t: +getT(d) || 0, p: getP(d) }; });
    }
    // `rows` are now normalized {en,s,t,p}; read them directly below.
    var maxT = Math.max.apply(null, rows.map(function (d) { return d.t; }).concat([0])) || 1;

    var thead = h("thead", {}, h("tr", {}, [
      h("th", { scope: "col", text: opts.catLabel || "Sub-category" }),
      h("th", { scope: "col", class: "num", text: "Seizures" }),
      h("th", { scope: "col", class: "num", text: opts.totalLabel || ("Total" + (unit ? " (" + unit + ")" : "")) }),
      h("th", { scope: "col", class: "num", text: opts.perLabel || "Per seizure" })
    ]));

    var tbody = h("tbody", {});
    rows.forEach(function (d) {
      var name = d.en, s = d.s, t = d.t, p = d.p;
      var totCell = h("td", { class: "num c-vp-total" });
      if (withBar) totCell.appendChild(h("span", { class: "c-vp-bar",
        style: "width:" + (t / maxT * 100).toFixed(1) + "%" }));
      totCell.appendChild(h("span", { class: "c-vp-num", text: tf(t) }));
      var tr = h("tr", {}, [
        h("td", { class: "c-vp-cat", text: name }),
        h("td", { class: "num", text: sf(s) }),
        totCell,
        h("td", { class: "num", text: p == null ? "–" : pf(p) })
      ]);
      tip.bind(tr, (function (name, s, t, p) { return function () {
        return tipRows(name, [
          ["Seizures", sf(s)],
          [(unit ? "Total (" + unit + ")" : "Total"), tf(t)],
          ["Per seizure", p == null ? "–" : pf(p)],
          ["Share of volume", fmt.pct(t / (sumT || 1) * 100)]
        ]);
      }; })(name, s, t, p));
      tbody.appendChild(tr);
    });

    var kids = [thead, tbody];
    if (opts.showTotal !== false) {
      kids.push(h("tfoot", {}, h("tr", {}, [
        h("td", { class: "c-vp-cat", text: "All sub-categories" }),
        h("td", { class: "num", text: sf(sumS) }),
        h("td", { class: "num", text: tf(sumT) }),
        h("td", { class: "num", text: sumS > 0 ? pf(Math.round(sumT / sumS)) : "–" })
      ])));
    }
    var table = h("table", { class: "c-vp", role: "table",
      "aria-label": (opts.ariaLabel || "Volume profile table") }, kids);
    return h("div", { class: "c-vp-wrap" }, table);
  }

  /* =================================================================
     10 · SCATTER — two continuous measures, one point per entity, with
          optional size, group colour and quadrant reference lines.
          The only component in the library that can answer "does A
          move with B?", which is exactly the RMS monitoring question
          (risk-profiling share vs e-commerce penetration / volume /
          year-on-year change). Points are labelled sparingly — only
          the `annotate` most extreme, because 21 labels collide.
        opts: { data:[{label,x,y,size?,group?}], x?, y?, size?, label?,
                group?, xLabel, yLabel, xFmt?, yFmt?, sizeFmt?, sizeLabel?,
                xScale?('linear'|'log'), colors?, refX?, refY?,
                refXLabel?, refYLabel?, annotate?(n), width?, height?,
                metric?, ariaLabel? }
     ================================================================= */
  function scatter(opts) {
    var data = opts.data.slice();
    var gx = accessor(opts.x, "x"), gy = accessor(opts.y, "y");
    var gl = accessor(opts.label, "label");
    var gs = opts.size ? accessor(opts.size, "size") : null;
    var gg = opts.group ? accessor(opts.group, "group") : null;
    var xf = opts.xFmt || fmt.dec, yf = opts.yFmt || fmt.pct;
    var sf = opts.sizeFmt || fmt.int;
    var logX = opts.xScale === "log";

    var W = opts.width || 680, H = opts.height || 400;
    // mL leaves room for the tick labels AND the rotated axis title inboard of them
    var mL = 72, mR = 18, mT = 14, mB = 46;
    var pw = W - mL - mR, ph = H - mT - mB;

    /* ---- scales (log guards non-positive values) ------------------ */
    var xs = data.map(gx).map(Number), ys = data.map(gy).map(Number);
    var xPos = xs.filter(function (v) { return v > 0; });
    var xLo = logX ? Math.min.apply(null, xPos.concat([1])) : Math.min.apply(null, xs.concat([0]));
    var xHi = Math.max.apply(null, xs.concat([logX ? 10 : 0]));
    var yLo = Math.min.apply(null, ys), yHi = Math.max.apply(null, ys);
    // pad the linear domains a little so points never sit on the frame
    if (!logX) { var xp = (xHi - xLo) * 0.06 || 1; xLo -= xp; xHi += xp; }
    var yp = (yHi - yLo) * 0.08 || 1; yLo -= yp; yHi += yp;
    if (!logX && xLo < 0 && Math.min.apply(null, xs) >= 0) xLo = 0;
    if (yLo < 0 && Math.min.apply(null, ys) >= 0) yLo = 0;

    function sx(v) {
      if (!logX) return mL + (v - xLo) / (xHi - xLo || 1) * pw;
      var lv = Math.log(Math.max(v, xLo)) / Math.LN10;
      var l0 = Math.log(xLo) / Math.LN10, l1 = Math.log(xHi) / Math.LN10;
      return mL + (lv - l0) / (l1 - l0 || 1) * pw;
    }
    function sy(v) { return mT + ph - (v - yLo) / (yHi - yLo || 1) * ph; }

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Scatter plot"), class: "c-svg c-scatter" });

    /* ---- axes: minimal chrome, ticks only ------------------------- */
    var xTicks = logX ? logTicks(xLo, xHi) : niceTicks(xLo, xHi, 6);
    var yTicks = niceTicks(yLo, yHi, 5);
    yTicks.forEach(function (t) {
      var y = sy(t);
      root.appendChild(svg("line", { x1: mL, x2: mL + pw, y1: y.toFixed(1), y2: y.toFixed(1),
        stroke: PALETTE.hairline, "stroke-width": 1 }));
      root.appendChild(svg("text", { x: mL - 8, y: (y + 4).toFixed(1), "text-anchor": "end",
        class: "c-axis" }, yf(t)));
    });
    xTicks.forEach(function (t) {
      var x = sx(t);
      root.appendChild(svg("text", { x: x.toFixed(1), y: mT + ph + 18, "text-anchor": "middle",
        class: "c-axis" }, xf(t)));
    });
    root.appendChild(svg("line", { x1: mL, x2: mL + pw, y1: mT + ph, y2: mT + ph,
      stroke: PALETTE.grayPale, "stroke-width": 1 }));

    /* ---- quadrant reference lines --------------------------------- */
    if (opts.refY != null) {
      var ry = sy(opts.refY);
      root.appendChild(svg("line", { x1: mL, x2: mL + pw, y1: ry.toFixed(1), y2: ry.toFixed(1),
        stroke: PALETTE.gray, "stroke-width": 1.25, "stroke-dasharray": "5 4" }));
      if (opts.refYLabel) root.appendChild(svg("text", { x: mL + pw, y: (ry - 6).toFixed(1),
        "text-anchor": "end", class: "c-ref" }, opts.refYLabel));
    }
    if (opts.refX != null) {
      var rx = sx(opts.refX);
      root.appendChild(svg("line", { x1: rx.toFixed(1), x2: rx.toFixed(1), y1: mT, y2: mT + ph,
        stroke: PALETTE.gray, "stroke-width": 1.25, "stroke-dasharray": "5 4" }));
      if (opts.refXLabel) root.appendChild(svg("text", { x: (rx + 5).toFixed(1), y: mT + 10,
        class: "c-ref" }, opts.refXLabel));
    }

    /* ---- axis titles ---------------------------------------------- */
    if (opts.xLabel) root.appendChild(svg("text", { x: mL + pw / 2, y: H - 6,
      "text-anchor": "middle", class: "c-axis-t" }, opts.xLabel));
    if (opts.yLabel) root.appendChild(svg("text", { x: 14, y: mT + ph / 2,
      "text-anchor": "middle", class: "c-axis-t",
      transform: "rotate(-90 14 " + (mT + ph / 2).toFixed(1) + ")" }, opts.yLabel));

    /* ---- groups -> fixed categorical colours ----------------------- */
    var groups = [];
    if (gg) data.forEach(function (d) {
      var g = gg(d); if (groups.indexOf(g) < 0) groups.push(g);
    });
    var colors = opts.colors || groups.map(function (_, i) { return catColor(i); });
    function colorOf(d) { return gg ? colors[groups.indexOf(gg(d))] : PALETTE.accent; }

    /* ---- radius: area-proportional (sqrt), never linear ----------- */
    var maxS = gs ? Math.max.apply(null, data.map(gs).map(Number).concat([0])) : 0;
    var rMin = 4.5, rMax = 13;
    function rOf(d) {
      if (!gs || maxS <= 0) return 5.5;
      return rMin + (rMax - rMin) * Math.sqrt(Math.max(0, +gs(d)) / maxS);
    }

    /* ---- which points earn a label: the most extreme ones ---------- */
    var cx = opts.refX != null ? sx(opts.refX) : mL + pw / 2;
    var cy = opts.refY != null ? sy(opts.refY) : mT + ph / 2;
    var nLab = opts.annotate == null ? 6 : opts.annotate;
    var minSep = opts.labelSep || 34;          // px; keeps labels from stacking
    var ranked = data.map(function (d, i) {
      var px = sx(+gx(d)), py = sy(+gy(d));
      var dx = (px - cx) / (pw || 1), dy = (py - cy) / (ph || 1);
      return { i: i, px: px, py: py, dist: Math.sqrt(dx * dx + dy * dy) };
    }).sort(function (a, b) { return b.dist - a.dist; });
    // greedily take the most extreme points, but skip any that would sit on
    // top of a label already placed — outliers cluster, and six labels in one
    // corner is worse than three legible ones
    var labelled = {}, placed = [];
    for (var ri = 0; ri < ranked.length && placed.length < nLab; ri++) {
      var cand = ranked[ri], clear = true;
      for (var pi = 0; pi < placed.length; pi++) {
        if (Math.abs(cand.px - placed[pi].px) < minSep * 2.2 &&
            Math.abs(cand.py - placed[pi].py) < minSep) { clear = false; break; }
      }
      if (clear) { labelled[cand.i] = true; placed.push(cand); }
    }

    /* ---- points ---------------------------------------------------- */
    data.forEach(function (d, i) {
      var xv = +gx(d), yv = +gy(d);
      var px = sx(xv), py = sy(yv), r = rOf(d), col = colorOf(d);
      var c = svg("circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: r.toFixed(1),
        fill: col, "fill-opacity": 0.72, stroke: PALETTE.surface, "stroke-width": 1.25 });
      root.appendChild(c);
      tip.bind(c, (function (d, xv, yv) { return function () {
        var rows = [[opts.xLabel || "x", xf(xv)], [opts.yLabel || "y", yf(yv)]];
        if (gs) rows.push([opts.sizeLabel || "Size", sf(+gs(d))]);
        if (gg) rows.push(["Section", String(gg(d))]);
        return tipRows(gl(d), rows);
      }; })(d, xv, yv));

      if (labelled[i]) {
        // flip the label to the left when the point sits near the right edge
        var right = px > mL + pw * 0.72;
        root.appendChild(svg("text", {
          x: (px + (right ? -(r + 5) : r + 5)).toFixed(1), y: (py + 4).toFixed(1),
          "text-anchor": right ? "end" : "start", class: "c-pt" }, gl(d)));
      }
    });

    if (!gg) return root;
    var leg = h("ul", { class: "c-legend c-legend-row" });
    groups.forEach(function (g, i) {
      leg.appendChild(h("li", {}, [
        h("span", { class: "c-sw", style: "background:" + colors[i] }),
        h("span", { class: "c-leg-name", text: String(g) })
      ]));
    });
    return h("div", { class: "c-scatter-wrap" }, [leg, root]);
  }

  /* =================================================================
     11 · DIVERGING BAR — signed bars around a non-zero baseline.
          `hbar` cannot express "above / below a reference"; this can,
          which is what "vs the global risk-profiling baseline" needs.
          Values are absolute; the drawn bar is (value − baseline).
        opts: { data:[{label,value}], baseline(=0), label?, value?,
                valueFmt?, devFmt?, posColor?, negColor?, posLabel?,
                negLabel?, width?, rowH?, labelW?, metric?, ariaLabel? }
     ================================================================= */
  function divergingBar(opts) {
    var data = opts.data.slice();
    var getV = accessor(opts.value, "value");
    var getL = accessor(opts.label, "label");
    var base = opts.baseline || 0;
    var vf = opts.valueFmt || fmt.pct;
    var df = opts.devFmt || fmt.signedPct;
    var posC = opts.posColor || PALETTE.accent;
    var negC = opts.negColor || "#D55E00";      // vermillion — Okabe–Ito, CVD-safe vs the blue

    var W = opts.width || 680, rowH = opts.rowH || 30, barH = opts.barH || 14;
    var labelW = opts.labelW || 176, valW = 62, gap = 10;
    // reserve a value-label lane on BOTH sides — a full-length negative bar
    // would otherwise push its label back over the category name
    var x0 = labelW + gap;
    var half = ((W - x0 - 8) - valW * 2) / 2;
    var mid = x0 + valW + half;
    var maxDev = Math.max.apply(null, data.map(function (d) {
      return Math.abs(getV(d) - base);
    }).concat([0])) || 1;

    var padT = 18, H = data.length * rowH + padT + 8;
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": (opts.ariaLabel || "Deviation from baseline"), class: "c-svg c-diverge" });

    // the baseline itself — the only rule the chart needs
    root.appendChild(svg("line", { x1: mid, x2: mid, y1: padT - 8, y2: H - 6,
      stroke: PALETTE.gray, "stroke-width": 1.25 }));
    root.appendChild(svg("text", { x: mid, y: padT - 12, "text-anchor": "middle", class: "c-ref" },
      (opts.baselineLabel || "baseline") + " " + vf(base)));

    data.forEach(function (d, i) {
      var v = +getV(d), dev = v - base, name = getL(d);
      var y = padT + i * rowH + rowH / 2;
      var w = Math.abs(dev) / maxDev * half;
      var pos = dev >= 0;
      root.appendChild(svg("text", { x: labelW, y: y + 4, "text-anchor": "end", class: "c-cat" }, name));
      var rect = svg("rect", {
        x: (pos ? mid : mid - w).toFixed(1), y: y - barH / 2,
        width: Math.max(w, 1).toFixed(1), height: barH, rx: 3,
        fill: pos ? posC : negC });
      root.appendChild(rect);
      root.appendChild(svg("text", {
        x: (pos ? mid + w + 6 : mid - w - 6).toFixed(1), y: y + 4,
        "text-anchor": pos ? "start" : "end", class: "c-val",
        fill: pos ? posC : negC }, df(dev)));
      tip.bind(rect, (function (name, v, dev) { return function () {
        return tipRows(name, [
          [opts.metric || "Value", vf(v)],
          [opts.baselineLabel || "Baseline", vf(base)],
          ["Difference", df(dev)]
        ]);
      }; })(name, v, dev));
    });
    return root;
  }

  /* ---- small internals -------------------------------------------- */
  /* readable axis ticks: 1 / 2 / 5 × 10^n covering [lo, hi] */
  function niceTicks(lo, hi, n) {
    n = n || 5;
    if (!(hi > lo)) return [lo];
    var step = Math.pow(10, Math.floor(Math.log((hi - lo) / n) / Math.LN10));
    var err = (hi - lo) / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
      out.push(+v.toPrecision(12));
    }
    return out;
  }
  /* decade ticks for a log axis */
  function logTicks(lo, hi) {
    var out = [];
    for (var e = Math.floor(Math.log(lo) / Math.LN10); e <= Math.ceil(Math.log(hi) / Math.LN10); e++) {
      var v = Math.pow(10, e);
      if (v >= lo && v <= hi) out.push(v);
    }
    return out.length ? out : [lo, hi];
  }

  function accessor(spec, dflt) {
    if (typeof spec === "function") return spec;
    var key = spec || dflt;
    return function (d) { return d[key]; };
  }
  function shallow(o) { var n = {}; for (var k in o) n[k] = o[k]; return n; }
  function arc(cx, cy, R, r, a0, a1) {
    var x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    var x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    var xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
    var xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return "M" + x0 + " " + y0 + " A" + R + " " + R + " 0 " + large + " 1 " + x1 + " " + y1 +
           " L" + xi1 + " " + yi1 + " A" + r + " " + r + " 0 " + large + " 0 " + xi0 + " " + yi0 + " Z";
  }

  /* ---- export ----------------------------------------------------- */
  window.ITR = {
    fmt: fmt, palette: PALETTE, catColor: catColor, ramp: ramp, tip: tip,
    hbar: hbar, groupedYoY: groupedYoY, donut: donut, donutB: donutB,
    stackedBar: stackedBar, choropleth: choropleth, heatGrid: heatGrid,
    operPanels: operPanels, kpi: kpi, volumeProfile: volumeProfile,
    scatter: scatter, divergingBar: divergingBar,
    // low-level helpers exposed for the app assembler
    _h: h, _svg: svg, _esc: esc, _lbl: lbl
  };
})();
