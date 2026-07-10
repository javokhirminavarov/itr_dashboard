/* WCO ITR 2025 — Step 2: scrollytelling engine driving ONE sticky transforming
   graphic through all seven beats.

   Progressive enhancement: index.html already renders the full narration plus a
   static spectrum. This script fetches the data (relative paths, Pages-subpath
   safe), replaces the static SVG with an interactive one, and wires a hand-rolled
   IntersectionObserver so scrolling morphs the graphic between states. If any of
   that fails, the static page is left untouched. prefers-reduced-motion snaps
   between states with no tweening. */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var ACCENT = "#2F6DB5";      // e-commerce-native cluster (the accent)
  var ACCENT_DEEP = "#1B4A82"; // dark end of the choropleth ramp
  var GRAY = "#8A8F9A";        // context commodities
  var INK = "#1A1726";         // the physical-trade "floor" emphasis
  var PALE = "#E8F0F9";        // pale end of the choropleth ramp
  var NODATA = "#E4E7ED";      // countries with no WCO region
  var ACCENT_MIN = 55;         // the 55%→34% cliff after Khat is the accent boundary

  var REDUCE = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Geometry (shared with the static fallback in index.html)
  var W = 900, barStart = 360, rightPad = 54, plotW = W - barStart - rightPad;
  var rowH = 26, padTop = 8, barH = 13, H = padTop + 21 * rowH + 6; // 560
  var SEC_BARH = 20;

  var BEATS = ["sections", "spectrum", "ceiling", "floor", "map", "sowhat"];
  var CAPTIONS = {
    sections: "E-commerce share of cases by ITR section — all six, ranked.",
    spectrum: "E-commerce share by commodity — the full 81.9% → 0% spectrum.",
    ceiling: "The e-commerce-native ceiling — the top-7 cluster, plus sub-commodity peaks.",
    floor: "The physical-trade floor — commodities that still move offline.",
    map: "E-commerce share by WCO region — regional averages, shaded onto member countries.",
    sowhat: "The whole spectrum — one 44.8% average hiding a 0–82% range."
  };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmtPct(v) { return (v % 1 === 0 ? v : v.toFixed(1)) + "%"; }
  function specY(i) { return padTop + i * rowH + rowH / 2; }
  function scale(v) { return v / 81.9 * plotW; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // --- colour helpers -------------------------------------------------------
  function hex2rgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb(a) { return "rgb(" + Math.round(a[0]) + "," + Math.round(a[1]) + "," + Math.round(a[2]) + ")"; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpColor(c1, c2, t) {
    var a = hex2rgb(c1), b = hex2rgb(c2);
    return rgb([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
  }

  function fetchJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + " HTTP " + r.status);
      return r.json();
    });
  }

  var GRAPHIC = document.getElementById("graphic");

  Promise.all([
    fetchJSON("./data/ecom_spectrum.json"),
    fetchJSON("./data/ecom_by_section.json"),
    fetchJSON("./data/ecom_by_region.json"),
    fetchJSON("./data/ecom_subcommodity_extremes.json"),
    fetchJSON("./data/world_map_paths.json"),
    fetchJSON("./data/iso3_to_wco_region.json")
  ]).then(function (res) {
    build(res[0], res[1], res[2], res[3], res[4], res[5]);
  }).catch(function (err) {
    // Leave the static fallback in place; just clear the busy flag.
    if (GRAPHIC) GRAPHIC.removeAttribute("aria-busy");
    if (window.console) console.warn("Interactive graphic disabled:", err.message);
  });

  // =========================================================================
  function build(spectrum, sections, regions, extremes, world, iso2reg) {
    spectrum = spectrum.slice().sort(function (a, b) { return b.ecomPct - a.ecomPct; });

    // section index + share lookups
    sections = sections.slice().sort(function (a, b) { return b.ecomPct - a.ecomPct; });
    var secIndex = {}, secShare = {};
    sections.forEach(function (s, i) { secIndex[s.section] = i; secShare[s.section] = s.ecomPct; });
    var nSec = sections.length;

    function secY(i) { return 60 + i * ((H - 120) / (nSec - 1)); } // 6 evenly spread rows

    // ---- build the interactive bar SVG -----------------------------------
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", "100%");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "E-commerce share of illicit-trade cases. Interactive: scrolling moves between " +
      "section totals, the full commodity spectrum, and a regional map.");

    // one <g> per commodity (rect + category label + value label)
    var bars = spectrum.map(function (row, i) {
      var g = document.createElementNS(svgNS, "g");
      var rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", barStart);
      rect.setAttribute("rx", "2.5");
      var cat = document.createElementNS(svgNS, "text");
      cat.setAttribute("class", "cat-label");
      cat.setAttribute("x", "0");
      cat.textContent = row.commodity;
      var val = document.createElementNS(svgNS, "text");
      val.setAttribute("class", "val-label");
      val.setAttribute("text-anchor", "start");
      val.textContent = fmtPct(row.ecomPct);
      g.appendChild(rect); g.appendChild(cat); g.appendChild(val);
      svg.appendChild(g);
      return {
        row: row, i: i, rect: rect, cat: cat, val: val,
        si: secIndex[row.section],
        cur: null // set on first snap
      };
    });

    // section-label layer (visible only in the 'sections' beat)
    var secLayer = document.createElementNS(svgNS, "g");
    secLayer.setAttribute("class", "sec-layer");
    secLayer.style.transition = REDUCE ? "none" : "opacity .5s ease";
    var secTexts = sections.map(function (s, i) {
      var y = secY(i);
      var acc = s.ecomPct >= ACCENT_MIN;
      var name = document.createElementNS(svgNS, "text");
      name.setAttribute("class", "sec-label");
      name.setAttribute("x", "0");
      name.setAttribute("y", y - SEC_BARH / 2 - 6);
      name.textContent = s.section;
      var v = document.createElementNS(svgNS, "text");
      v.setAttribute("class", "val-label");
      v.setAttribute("y", y + 4);
      v.setAttribute("fill", acc ? ACCENT : GRAY);
      v.textContent = fmtPct(s.ecomPct);
      v.setAttribute("x", barStart + scale(s.ecomPct) + 6);
      secLayer.appendChild(name); secLayer.appendChild(v);
      return v;
    });
    svg.appendChild(secLayer);

    // swap the static fallback for the interactive svg
    GRAPHIC.innerHTML = "";
    GRAPHIC.appendChild(svg);
    GRAPHIC.removeAttribute("aria-busy");

    var inner = GRAPHIC.parentNode; // .graphic-inner

    // ---- annotations (beat 4) --------------------------------------------
    var annoWrap = document.createElement("div");
    annoWrap.className = "annotations";
    annoWrap.setAttribute("aria-hidden", "true");
    var wanted = ["Urogenital agents", "Gun silencers", "E-cigarettes"];
    var tops = [8, 34, 60];
    wanted.forEach(function (label, k) {
      var e = null;
      for (var j = 0; j < extremes.length; j++) if (extremes[j].label === label) { e = extremes[j]; break; }
      if (!e) return;
      var card = document.createElement("div");
      card.className = "anno";
      card.style.top = tops[k] + "%";
      card.innerHTML = "<b>" + fmtPct(e.ecomPct) + "</b>" + esc(e.label) +
        "<br><small>" + esc(e.note || e.parent) + "</small>";
      annoWrap.appendChild(card);
    });
    inner.appendChild(annoWrap);

    // ---- choropleth (beat 6) ---------------------------------------------
    var mapWrap = buildMap(world, regions, iso2reg);
    inner.appendChild(mapWrap);

    // ---- progress dots ----------------------------------------------------
    var prog = document.createElement("nav");
    prog.className = "progress";
    prog.setAttribute("aria-label", "Story progress");
    var dots = BEATS.map(function (b, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Go to section " + (i + 1) + " of " + BEATS.length);
      btn.addEventListener("click", function () {
        var el = document.getElementById("step-" + b);
        if (el) el.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "center" });
      });
      prog.appendChild(btn);
      return btn;
    });
    document.body.appendChild(prog);

    // ---- state model ------------------------------------------------------
    function targetFor(beat, bar) {
      var r = bar.row, acc = r.ecomPct >= ACCENT_MIN, i = bar.i;
      if (beat === "sections") {
        var sAcc = secShare[r.section] >= ACCENT_MIN;
        return { yc: secY(bar.si), w: scale(secShare[r.section]), h: SEC_BARH,
                 fill: sAcc ? ACCENT : GRAY, rectOp: 1, catOp: 0, valOp: 0 };
      }
      var base = { yc: specY(i), w: scale(r.ecomPct), h: barH,
                   fill: acc ? ACCENT : GRAY, rectOp: 1, catOp: 1, valOp: 1 };
      if (beat === "ceiling") {
        if (i >= 7) { base.rectOp = 0.12; base.catOp = 0.28; base.valOp = 0.28; }
        return base;
      }
      if (beat === "floor") {
        var isFloor = r.ecomPct <= 1.0;
        if (isFloor) { base.fill = INK; base.rectOp = 1; base.catOp = 1; base.valOp = 1; }
        else { base.rectOp = 0.12; base.catOp = 0.26; base.valOp = 0.26; }
        return base;
      }
      // spectrum, map (hidden), sowhat all use the resting spectrum layout
      return base;
    }

    function paint(bar, s) {
      bar.rect.setAttribute("y", s.yc - s.h / 2);
      bar.rect.setAttribute("height", s.h);
      bar.rect.setAttribute("width", Math.max(0, s.w).toFixed(1));
      bar.rect.setAttribute("fill", s.fill);
      bar.rect.setAttribute("opacity", s.rectOp);
      bar.cat.setAttribute("y", s.yc + 4);
      bar.cat.setAttribute("opacity", s.catOp);
      bar.val.setAttribute("x", (barStart + Math.max(0, s.w) + 6).toFixed(1));
      bar.val.setAttribute("y", s.yc + 4);
      bar.val.setAttribute("fill", s.fill);
      bar.val.setAttribute("opacity", s.valOp);
    }

    var raf = null;
    function applyState(beat, animate) {
      // section labels / annotations / map toggles
      secLayer.style.opacity = (beat === "sections") ? "1" : "0";
      if (beat === "ceiling") annoWrap.classList.add("show");
      else annoWrap.classList.remove("show");
      if (beat === "map") { GRAPHIC.classList.add("is-map"); mapWrap.classList.add("show"); }
      else { GRAPHIC.classList.remove("is-map"); mapWrap.classList.remove("show"); }
      var cap = document.getElementById("graphic-caption");
      if (cap) cap.textContent = CAPTIONS[beat] || CAPTIONS.spectrum;

      var targets = bars.map(function (b) { return targetFor(beat, b); });

      if (!animate || REDUCE || !bars[0].cur) {
        bars.forEach(function (b, k) { b.cur = targets[k]; paint(b, targets[k]); });
        return;
      }
      var starts = bars.map(function (b) { return b.cur; });
      var t0 = null, dur = 620;
      if (raf) cancelAnimationFrame(raf);
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / dur), e = easeInOut(t);
        bars.forEach(function (b, k) {
          var a = starts[k], z = targets[k];
          var s = {
            yc: lerp(a.yc, z.yc, e), w: lerp(a.w, z.w, e), h: lerp(a.h, z.h, e),
            fill: lerpColor(rgbToHexSafe(a.fill), rgbToHexSafe(z.fill), e),
            rectOp: lerp(a.rectOp, z.rectOp, e),
            catOp: lerp(a.catOp, z.catOp, e),
            valOp: lerp(a.valOp, z.valOp, e)
          };
          b.cur = s; paint(b, s);
        });
        if (t < 1) raf = requestAnimationFrame(frame);
        else bars.forEach(function (b, k) { b.cur = targets[k]; });
      }
      raf = requestAnimationFrame(frame);
    }

    // colour values in `cur` may already be rgb(); keep hex for lerp inputs
    function rgbToHexSafe(c) {
      if (c.charAt(0) === "#") return c;
      var m = c.match(/\d+/g);
      if (!m) return "#000000";
      return "#" + m.slice(0, 3).map(function (n) {
        var h = (+n).toString(16); return h.length === 1 ? "0" + h : h;
      }).join("");
    }

    // snap to the first beat
    applyState("sections", false);
    document.documentElement.classList.add("enhanced");

    // ---- scroll detection (hand-rolled IntersectionObserver) --------------
    var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
    var current = "sections";
    function setActive(beat) {
      if (beat === current) return;
      current = beat;
      applyState(beat, true);
      steps.forEach(function (st) { st.classList.toggle("is-active", st.dataset.beat === beat); });
      dots.forEach(function (d, i) { d.classList.toggle("on", BEATS[i] === beat); });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setActive(en.target.dataset.beat);
      });
    }, { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(function (st) { io.observe(st); });

    // initialise active markers on the first step
    steps[0].classList.add("is-active");
    dots[0].classList.add("on");
  }

  // =========================================================================
  function buildMap(world, regions, iso2reg) {
    var svgNS = "http://www.w3.org/2000/svg";
    var wrap = document.createElement("div");
    wrap.className = "mapwrap";

    var regShare = {};
    regions.forEach(function (r) { regShare[r.code] = r.ecomPct; });
    var maxShare = 68; // Americas

    function colorFor(iso) {
      var reg = iso2reg[iso];
      if (!reg || regShare[reg] == null) return NODATA;
      var t = Math.pow(regShare[reg] / maxShare, 0.85);
      // pale -> accent -> deep
      if (t < 0.75) return lerpColor(PALE, ACCENT, t / 0.75);
      return lerpColor(ACCENT, ACCENT_DEEP, (t - 0.75) / 0.25);
    }

    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", world.viewBox);
    svg.setAttribute("width", "100%");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "World map. Each country is shaded by its WCO region's average e-commerce " +
      "case share — Americas 68% (darkest) down to West & Central Africa 0.6% (palest).");
    var paths = world.paths;
    Object.keys(paths).forEach(function (iso) {
      var p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", paths[iso]);
      p.setAttribute("class", "map-country");
      p.setAttribute("fill", colorFor(iso));
      var reg = iso2reg[iso];
      if (reg && regShare[reg] != null) {
        var title = document.createElementNS(svgNS, "title");
        title.textContent = iso + " · " + reg + " · " + fmtPct(regShare[reg]);
        p.appendChild(title);
      }
      svg.appendChild(p);
    });
    wrap.appendChild(svg);

    // legend
    var legend = document.createElement("div");
    legend.className = "map-legend";
    legend.innerHTML =
      '<span>0.6%</span><span class="legend-bar" aria-hidden="true"></span><span>68%</span>' +
      '<span style="margin-left:6px">low → high e-commerce share</span>';
    wrap.appendChild(legend);
    var cap = document.createElement("p");
    cap.className = "legend-caption";
    cap.textContent = "Shading is each country's WCO region average — a regional figure, " +
      "not a country-level value. Grey = no WCO region assigned.";
    wrap.appendChild(cap);

    return wrap;
  }
})();
