/* =====================================================================
   WCO ITR 2025 — Explore app  (explore.js)
   ---------------------------------------------------------------------
   App shell + hash router + section rail, and the Drugs section
   assembled ENTIRELY from the ITR.* component library (charts.js).

   · State is deep-linkable:  #section=drugs&flow=cannabis
   · back / forward honoured via hashchange
   · Phase A: Drugs is live; the other five sections render "Coming soon"
   · Relative paths only (GitHub Pages deploy-from-branch, /itr_dashboard/)
   ===================================================================== */
(function () {
  "use strict";

  var C = window.ITR;                    // the component library
  var fmt = C.fmt, P = C.palette;

  /* ---- section registry (all six; order matters) ------------------
     RMS Monitoring sits FIRST and is flagged `xcut` — it is not a
     seventh commodity, it reads across all six typologies, so the rail
     draws a divider under it. */
  var SECTIONS = [
    { id: "rms",     label: "RMS Monitoring",        live: true, xcut: true },
    { id: "drugs",   label: "Drugs",                 live: true  },
    { id: "aml",     label: "AML/CTF",               live: false },
    { id: "env",     label: "Environmental Crime",   live: false },
    { id: "iprhs",   label: "IPR & Health/Safety",   live: true  },
    { id: "revenue", label: "Revenue",               live: false },
    { id: "security",label: "Security",              live: false }
  ];

  /* ---- stream-section scaffold config ----------------------------- */
  /* IPR and Revenue are structural twins: both are a two-stream section
     with the same JSON shape (totals / totalsPrev / split / streamOrder /
     perStream / regional). The overview + sub-flow renderer below is
     generic and driven ENTIRELY by this config, so Phase C (Revenue)
     becomes a data + label swap — add its entry here, nothing more. The
     per-section specifics (which regional keys map to which stream, the
     quantity unit, the drill key, the stream slugs/labels) live in the
     config, never hardcoded in the renderer. */
  var STREAM_CFG = {
    iprhs: {
      id: "iprhs",
      dataKey: "iprhs",
      label: "IPR & Health/Safety",
      drillKey: "IPR, Health and Safety",
      subtitle: "Intellectual-property-rights and medical-product trafficking — "
        + "composition, year-on-year movement, e-commerce penetration, operational "
        + "profile, regional flows and country involvement. Pick a stream to drill in.",
      qty: { unit: "pieces" },                  // section quantity is a piece count
      // which regional.* keys carry stream-0 / stream-1 series
      regionalKeys: { composition: ["iprPct", "medPct"], reporting: ["iprAdmins", "medAdmins"] },
      streams: [
        { name: "IPR products trafficking",     slug: "ipr-products",     label: "IPR products" },
        { name: "Medical products trafficking", slug: "medical-products", label: "Medical products" }
      ]
    }
    /* Phase C — Revenue slots in here:
       revenue: { dataKey:"rev", drillKey:"Revenue", qty:{unit:"pieces"},
                  regionalKeys:{ composition:["s0","s1"], reporting:["a0","a1"] },
                  streams:[{name:"Tobacco products trafficking",…}, …] } */
  };

  /* ---- Drugs sub-flows: slug -> {label, key in perDrug} ----------- */
  var DRUG_FLOWS = [
    { slug: "overview",      label: "Overview", key: null },
    { slug: "cannabis",      label: "Cannabis",       key: "Cannabis" },
    { slug: "cocaine",       label: "Cocaine",        key: "Cocaine" },
    { slug: "opioids",       label: "Opioids/Opiates",key: "Opioids and Opiates" },
    { slug: "psychotropics", label: "Psychotropics",  key: "Psychotropic substances" },
    { slug: "nps",           label: "NPS",            key: "New Psychoactive Substances" },
    { slug: "khat",          label: "Khat",           key: "Khat" }
  ];

  var SOURCE = "WCO Illicit Trade Report 2025 (data year 2025; prior year 2024).";

  /* ---- RMS monitoring --------------------------------------------
     "RMS" = the customs Risk Management System. The ITR's proxy for it
     is the `Risk profiling` detection channel, reported for all six
     sections and all 21 sub-commodities alongside the four other
     channels. Labels come from DETECT_CFG in the source config bundle
     (data/config_bundle.json); colours come from ITR.catColor like
     everywhere else in the Explore app — SEC_THEME.det belongs to the
     old story palette (see PALETTE.md) and is deliberately not used. */
  var RMS_KEY = "Risk profiling";
  var METHODS = ["Risk profiling", "Routine control", "Intelligence",
                 "Investigation", "Random selection"];
  var RMS_FLOWS = [
    { slug: "overview", label: "Overview" },
    { slug: "coverage", label: "Coverage" },
    { slug: "yield",    label: "Yield & blind spots" },
    { slug: "channels", label: "Channel mix" }
  ];
  var SEC_SHORT = {
    "AML/CTF": "AML/CTF", "Drugs": "Drugs", "Environmental Crime": "Env. Crime",
    "IPR, Health and Safety": "IPR & H/S", "Revenue": "Revenue", "Security": "Security"
  };
  var REGION_NAME = {
    EUR: "Europe", AMS: "Americas", MENA: "N. Africa / Near & Middle East",
    "A/P": "Asia / Pacific", ESA: "East & Southern Africa", WCA: "West & Central Africa"
  };

  /* ---- shared app state ------------------------------------------- */
  var state = { section: "drugs", flow: "overview" };
  var DATA = null;                        // loaded payloads
  var rail = document.getElementById("rail");
  var content = document.getElementById("content");

  /* ---- data load -------------------------------------------------- */
  function fetchJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + " HTTP " + r.status);
      return r.json();
    });
  }

  Promise.all([
    fetchJSON("./data/itr_drugs.json"),
    fetchJSON("./data/itr_drill.json"),
    fetchJSON("./data/world_map_paths.json"),
    fetchJSON("./data/cfg_CNAME.json"),
    fetchJSON("./data/itr_meta.json"),
    fetchJSON("./data/itr_iprhs.json"),
    fetchJSON("./data/itr_sections.json"),
    fetchJSON("./data/itr_global.json")
  ]).then(function (res) {
    DATA = { drugs: res[0], drill: res[1], world: res[2], cname: res[3], meta: res[4],
             iprhs: res[5], sections: res[6], global: res[7] };
    // derive the RMS model ONCE; the render path stays presentation-only
    DATA.rms = buildRmsModel(DATA.sections, DATA.drill, DATA.global);
    boot();
  }).catch(function (err) {
    content.innerHTML = "";
    content.appendChild(C._h("div", { class: "state state--error",
      text: "Could not load data: " + err.message }));
    if (window.console) console.error(err);
  });

  /* ---- boot ------------------------------------------------------- */
  function boot() {
    parseHash();
    window.addEventListener("hashchange", function () { parseHash(); render(); });
    render();
  }

  /* =================================================================
     ROUTING  #section=drugs&flow=cannabis
     ================================================================= */
  function parseHash() {
    var hash = location.hash.replace(/^#/, "");
    var q = {};
    hash.split("&").forEach(function (kv) {
      var p = kv.split("=");
      if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
    });
    var sec = SECTIONS.filter(function (s) { return s.id === q.section; })[0];
    state.section = sec ? sec.id : "drugs";
    // validate the flow against the section's own flow list
    var slugs = flowsFor(state.section);
    state.flow = slugs.indexOf(q.flow) >= 0 ? q.flow : "overview";
  }

  /* the ordered list of sub-flow slugs a section exposes (drugs has its
     per-drug flows; a stream-section has overview + one flow per stream) */
  function flowsFor(sectionId) {
    if (sectionId === "rms") return RMS_FLOWS.map(function (f) { return f.slug; });
    if (sectionId === "drugs") return DRUG_FLOWS.map(function (f) { return f.slug; });
    var cfg = STREAM_CFG[sectionId];
    if (cfg) return ["overview"].concat(cfg.streams.map(function (s) { return s.slug; }));
    return ["overview"];
  }

  function go(section, flow) {
    var h = "#section=" + section;
    if (flow && flow !== "overview" && flowsFor(section).indexOf(flow) >= 0) h += "&flow=" + flow;
    if (location.hash === h) { render(); return; }
    location.hash = h;                    // triggers hashchange -> render
  }

  /* =================================================================
     RENDER
     ================================================================= */
  function render() {
    renderRail();
    var sec = SECTIONS.filter(function (s) { return s.id === state.section; })[0];
    content.innerHTML = "";
    window.scrollTo(0, 0);
    if (!sec || !sec.live) { renderComingSoon(sec); return; }
    if (sec.id === "rms") renderRMS();
    else if (sec.id === "drugs") renderDrugs();
    else if (STREAM_CFG[sec.id]) renderStreamSection(STREAM_CFG[sec.id]);
    else renderComingSoon(sec);
  }

  function renderRail() {
    rail.innerHTML = "";
    rail.appendChild(C._h("div", { class: "rail__h", text: "Sections" }));
    SECTIONS.forEach(function (s) {
      var active = s.id === state.section;
      var btn = C._h("button", {
        class: "rail__item" + (active ? " is-active" : "") + (s.live ? "" : " is-soon"),
        type: "button"
      }, [
        C._h("span", { class: "rail__dot" }),
        C._h("span", { class: "rail__label", text: s.label }),
        s.live ? null : C._h("span", { class: "rail__soon", text: "Soon" })
      ]);
      btn.addEventListener("click", function () { go(s.id, "overview"); });
      rail.appendChild(btn);
      // RMS reads across all six typologies — separate it from the list
      if (s.xcut) rail.appendChild(C._h("div", { class: "rail__div" }));
    });
  }

  /* ---- placeholder for the five non-Drugs sections ---------------- */
  function renderComingSoon(sec) {
    var name = sec ? sec.label : "This section";
    content.appendChild(C._h("div", { class: "sec-head" }, [
      C._h("p", { class: "sec-head__eyebrow", text: "Section" }),
      C._h("h1", { class: "sec-head__title", text: name })
    ]));
    content.appendChild(C._h("div", { class: "soon" }, [
      C._h("span", { class: "soon__badge", text: "Coming soon" }),
      C._h("h2", { class: "soon__title", text: name }),
      C._h("p", { class: "soon__text",
        text: "This section is being built from the same component library that powers Drugs. Check back as the Explore app expands across all six ITR sections." })
    ]));
  }

  /* =================================================================
     RMS MONITORING — the cross-cutting section.

     Everything here is DERIVED at load time from files the app already
     ships; nothing under data/ is re-extracted, so there is exactly one
     source of truth. Derivation formulas are documented in
     DATA_NOTES.md.

     Honest-reporting constraints baked into this model:
       · detection shares are case-weighted and round to 99–101, so any
         100% stacked view is normalised before drawing;
       · there is NO detection breakdown by region, country or year —
         the regional figure is a section-mix-weighted ESTIMATE and is
         labelled as derived everywhere it appears;
       · quantity units differ (kg / pieces / Litres / USD), so every
         cross-section panel uses cases or seizures as the common
         denominator and quantity appears only within a single unit.
     ================================================================= */
  function buildRmsModel(sections, drill, global) {
    var secIds = Object.keys(sections);

    /* ---- per-section roll-up ------------------------------------- */
    var secRows = secIds.map(function (id) {
      var sv = sections[id];
      var cases = 0, seiz = 0, prev = 0;
      Object.keys(sv.flows).forEach(function (f) {
        cases += sv.flows[f].c || 0; seiz += sv.flows[f].s || 0; prev += sv.flows[f].p || 0;
      });
      return {
        id: id, label: SEC_SHORT[id] || id, admins: sv.admins,
        cases: cases, seizures: seiz, prev: prev,
        detect: sv.detect, pct: normPct(sv.detect),
        rms: sv.detect[RMS_KEY] || 0,
        perCase: cases > 0 ? seiz / cases : null
      };
    });

    /* ---- global baseline: case-weighted, NOT a mean of six shares -- */
    var num = 0, den = 0;
    secRows.forEach(function (r) { num += r.rms * r.cases; den += r.cases; });
    var baseline = den > 0 ? num / den : 0;
    secRows.forEach(function (r) { r.dev = r.rms - baseline; });

    /* ---- per sub-commodity --------------------------------------- */
    var flowRows = [];
    secIds.forEach(function (id) {
      var sv = sections[id], dsec = drill[id] || {};
      Object.keys(sv.flows).forEach(function (name) {
        var f = sv.flows[name], dd = dsec[name] || {};
        var det = dd.detect || {};
        var q = dd.quantity || {};
        flowRows.push({
          section: id, sectionLabel: SEC_SHORT[id] || id, label: name,
          rms: det[RMS_KEY] || 0,
          routine: det["Routine control"] || 0,
          random: det["Random selection"] || 0,
          intel: det["Intelligence"] || 0,
          invest: det["Investigation"] || 0,
          pct: normPct(det),
          ecom: dd.ecom == null ? null : dd.ecom,
          cases: f.c || 0, seizures: f.s || 0, prev: f.p || 0,
          yoy: fmt.delta(f.s, f.p),
          perCase: f.c > 0 ? f.s / f.c : null,
          qty: q.value == null ? null : q.value, unit: q.en || null
        });
        flowRows[flowRows.length - 1].dev = flowRows[flowRows.length - 1].rms - baseline;
      });
    });

    /* ---- DERIVED regional exposure -------------------------------
       Not reported data. Each region's seizure mix across the six
       sections is weighted by that section's own RMS share:
         expected = Σ(seizures_region,section × rms_section) / Σ seizures
       It answers "given what this region seizes, how RMS-led would we
       expect it to be?" — never "this region's RMS rate is X". */
    var rmsBySec = {};
    secRows.forEach(function (r) { rmsBySec[r.id] = r.rms; });
    var regions = (global.regionSection || []).map(function (rs) {
      var n = 0, d2 = 0;
      Object.keys(rs.sections).forEach(function (s) {
        var v = rs.sections[s] || 0;
        n += (rmsBySec[s] || 0) * v; d2 += v;
      });
      return { code: rs.region, name: REGION_NAME[rs.region] || rs.region,
        seizures: rs.total, expectedRms: d2 > 0 ? n / d2 : 0, derived: true };
    });

    /* ---- headline relationships ---------------------------------- */
    var withEcom = flowRows.filter(function (r) { return r.ecom != null; });
    var seizSorted = flowRows.map(function (r) { return r.seizures; })
      .sort(function (a, b) { return a - b; });

    return {
      baseline: baseline, totalCases: den, methods: METHODS,
      sections: secRows, flows: flowRows, regions: regions,
      stats: {
        corrEcomRms: corr(withEcom.map(function (r) { return r.ecom; }),
                          withEcom.map(function (r) { return r.rms; })),
        corrRandomRms: corr(flowRows.map(function (r) { return r.random; }),
                            flowRows.map(function (r) { return r.rms; })),
        medianSeizures: median(seizSorted),
        belowBaseline: secRows.filter(function (r) { return r.rms < baseline; }).length,
        randomCases: flowRows.reduce(function (s, r) { return s + r.cases * r.random / 100; }, 0)
      }
    };
  }

  /* detection shares are case-weighted and round to 99–101; normalise
     before ANY 100% view so the stack reconciles exactly */
  function normPct(detect) {
    var out = {}, tot = 0;
    METHODS.forEach(function (m) { tot += +detect[m] || 0; });
    METHODS.forEach(function (m) { out[m] = tot > 0 ? (+detect[m] || 0) / tot * 100 : 0; });
    return out;
  }
  function corr(a, b) {
    var n = a.length; if (n < 2) return null;
    var ma = a.reduce(function (s, v) { return s + v; }, 0) / n;
    var mb = b.reduce(function (s, v) { return s + v; }, 0) / n;
    var sab = 0, sa = 0, sb = 0;
    for (var i = 0; i < n; i++) {
      var da = a[i] - ma, db = b[i] - mb;
      sab += da * db; sa += da * da; sb += db * db;
    }
    return (sa > 0 && sb > 0) ? sab / Math.sqrt(sa * sb) : null;
  }
  /* a correlation coefficient is not a rate — two decimals, not one, or
     r = 0.87 would print as the much vaguer 0.9 */
  function rr(v) { return v == null ? "–" : v.toFixed(2); }
  function median(sorted) {
    if (!sorted.length) return 0;
    var m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }

  /* ---- section shell ---------------------------------------------- */
  function renderRMS() {
    var m = DATA.rms;

    content.appendChild(C._h("div", { class: "sec-head" }, [
      C._h("p", { class: "sec-head__eyebrow", text: "Cross-cutting" }),
      C._h("h1", { class: "sec-head__title", text: "RMS Monitoring" }),
      C._h("p", { class: "sec-head__sub",
        text: "How much of the " + DATA.meta.year_current + " caseload the Risk Management System "
          + "actually found. Risk profiling is read as the RMS channel and compared against routine "
          + "control, intelligence, investigation and random selection — across all six typologies, "
          + "21 sub-commodities and " + DATA.meta.wco_regions + " WCO regions." })
    ]));

    var bar = C._h("div", { class: "flowbar" });
    RMS_FLOWS.forEach(function (f) {
      var b = C._h("button", { class: "flowbar__btn" + (f.slug === state.flow ? " is-active" : ""),
        type: "button", text: f.label });
      b.addEventListener("click", function () { go("rms", f.slug); });
      bar.appendChild(b);
    });
    content.appendChild(bar);

    if (state.flow === "coverage") rmsCoverage(m);
    else if (state.flow === "yield") rmsYield(m);
    else if (state.flow === "channels") rmsChannels(m);
    else rmsOverview(m);
  }

  /* ================= RMS · OVERVIEW ================================ */
  function rmsOverview(m) {
    var st = m.stats;
    var best = m.sections.slice().sort(function (a, b) { return b.rms - a.rms; })[0];
    var worst = m.sections.slice().sort(function (a, b) { return a.rms - b.rms; })[0];

    content.appendChild(C._h("div", { class: "kpi-row" }, [
      C.kpi({ value: fmt.pct(m.baseline), label: "Global RMS share", accent: P.accent,
        sub: "Case-weighted across " + fmt.int(m.totalCases) + " cases" }),
      C.kpi({ value: fmt.pct(best.rms - worst.rms), label: "Spread across sections",
        sub: best.label + " " + fmt.pct(best.rms) + " → " + worst.label + " " + fmt.pct(worst.rms) }),
      C.kpi({ value: st.belowBaseline + " of " + m.sections.length, label: "Sections below baseline",
        sub: "Risk profiling finds less than the global rate" }),
      C.kpi({ value: fmt.int(st.randomCases), label: "Cases found by random selection",
        sub: "Volume RMS did not target" })
    ]));

    var grid = C._h("div", { class: "grid" });

    grid.appendChild(card("RMS share by section",
      "Share of cases detected by risk profiling. The global case-weighted baseline is "
        + fmt.pct(m.baseline) + ".",
      C.hbar({ data: sortBy(m.sections.slice(), "rms"), value: "rms", label: "label",
        valueFmt: fmt.pct, metric: "Risk profiling", max: 100,
        ariaLabel: "Risk profiling share by section" }),
      "card--half"));

    grid.appendChild(card("Distance from the global baseline",
      "Percentage points above or below the " + fmt.pct(m.baseline) + " case-weighted global share.",
      C.divergingBar({ data: sortBy(m.sections.slice(), "rms"), value: "rms", label: "label",
        baseline: m.baseline, baselineLabel: "Global", metric: "Risk profiling",
        ariaLabel: "Section deviation from the global risk-profiling baseline" }),
      "card--half"));

    grid.appendChild(cardWide("Detection channel mix by section",
      "All five channels, normalised to 100% (reported shares round to 99–101).",
      C.stackedBar({ data: methodRows(m.sections), keys: METHODS, mode: "pct",
        label: "label", valueFmt: fmt.pct, labelW: 120, width: 1040,
        ariaLabel: "Detection channel mix by section" })));

    grid.appendChild(card("Expected RMS exposure by region — derived estimate",
      "NOT reported data. Each region's seizure mix across the six sections weighted by that "
        + "section's own RMS share; it shows how RMS-led a region's caseload would be expected "
        + "to be, not its measured rate. The ITR reports no detection breakdown by region.",
      C.hbar({ data: sortBy(m.regions.slice(), "expectedRms"), value: "expectedRms", label: "name",
        valueFmt: fmt.pct, metric: "Expected RMS share", max: 100, labelW: 210,
        ariaLabel: "Derived expected risk-profiling exposure by WCO region" }),
      "card--half"));

    grid.appendChild(card("Where RMS is weakest",
      "The sub-commodities with the lowest risk-profiling share — the areas the system is "
        + "least likely to flag before a control.",
      C.hbar({ data: m.flows.slice().sort(function (a, b) { return a.rms - b.rms; }).slice(0, 8),
        value: "rms", label: "label", valueFmt: fmt.pct, metric: "Risk profiling", max: 100,
        labelW: 210, ariaLabel: "Lowest risk-profiling sub-commodities" }),
      "card--half"));

    content.appendChild(grid);
  }

  /* ================= RMS · COVERAGE =============================== */
  function rmsCoverage(m) {
    var grid = C._h("div", { class: "grid" });

    grid.appendChild(cardWide("Section × detection channel",
      "Normalised share of cases, every section against every channel.",
      C.heatGrid({
        rows: m.sections.map(function (r) { return r.label; }),
        cols: METHODS,
        matrix: m.sections.map(function (r) {
          return METHODS.map(function (k) { return r.pct[k]; });
        }),
        valueFmt: fmt.pct, metric: "Share of cases", max: 100, labelW: 130, width: 1040,
        ariaLabel: "Section by detection channel matrix" })));

    grid.appendChild(cardWide("RMS share by sub-commodity",
      "All 21 sub-commodities ranked by risk-profiling share, from NPS down to UAS.",
      C.hbar({ data: sortBy(m.flows.slice(), "rms"), value: "rms", label: "label",
        valueFmt: fmt.pct, metric: "Risk profiling", max: 100, labelW: 260, rowH: 26, barH: 12,
        width: 1040, ariaLabel: "Risk profiling share by sub-commodity" })));

    grid.appendChild(cardWide("Does e-commerce drive risk profiling?",
      "Each point is a sub-commodity: e-commerce penetration against risk-profiling share. "
        + "The relationship is strong (r = " + rr(m.stats.corrEcomRms)
        + " across " + m.flows.filter(function (r) { return r.ecom != null; }).length
        + " sub-commodities) — parcel-borne trade is where RMS earns its keep. Point size = cases.",
      C.scatter({
        data: m.flows.filter(function (r) { return r.ecom != null; }),
        x: "ecom", y: "rms", size: "cases", label: "label", group: "sectionLabel",
        xLabel: "E-commerce penetration (% of cases)", yLabel: "Risk profiling (% of cases)",
        xFmt: fmt.pct, yFmt: fmt.pct, sizeLabel: "Cases",
        refY: m.baseline, refYLabel: "global " + fmt.pct(m.baseline),
        annotate: 6, width: 1040, height: 470,
        ariaLabel: "E-commerce penetration versus risk profiling share" })));

    grid.appendChild(cardWide("Blind-spot quadrant — volume vs RMS",
      "Seizures (log scale, the unit-free common denominator) against risk-profiling share. "
        + "The bottom-right quadrant is the concern: high seizure volume that RMS is not driving.",
      C.scatter({
        data: m.flows, x: "seizures", y: "rms", size: "cases", label: "label",
        group: "sectionLabel", xScale: "log",
        xLabel: "Seizures (log scale)", yLabel: "Risk profiling (% of cases)",
        xFmt: fmt.k, yFmt: fmt.pct, sizeLabel: "Cases",
        refX: m.stats.medianSeizures, refXLabel: "median seizures",
        refY: m.baseline, refYLabel: "global " + fmt.pct(m.baseline),
        annotate: 6, width: 1040, height: 470,
        ariaLabel: "Seizure volume versus risk profiling share" })));

    content.appendChild(grid);
  }

  /* ================= RMS · YIELD & BLIND SPOTS ==================== */
  function rmsYield(m) {
    var grid = C._h("div", { class: "grid" });

    /* seizures per case, grouped into RMS reliance bands */
    var bands = [
      { label: "RMS 75–100%", lo: 75, hi: 101 },
      { label: "RMS 50–75%",  lo: 50, hi: 75 },
      { label: "RMS 25–50%",  lo: 25, hi: 50 },
      { label: "RMS 0–25%",   lo: 0,  hi: 25 }
    ].map(function (b) {
      var rows = m.flows.filter(function (r) { return r.rms >= b.lo && r.rms < b.hi; });
      var c = 0, s = 0;
      rows.forEach(function (r) { c += r.cases; s += r.seizures; });
      return { label: b.label + " (" + rows.length + ")", value: c > 0 ? s / c : 0, cases: c };
    });

    var lo = Math.min.apply(null, bands.map(function (b) { return b.value; }));
    var hi = Math.max.apply(null, bands.map(function (b) { return b.value; }));

    grid.appendChild(card("Seizures per case by RMS reliance band",
      "Sub-commodities grouped by how RMS-led they are; seizures per case is the unit-free yield "
        + "measure that works across every commodity. The finding is a flat one — yield sits "
        + "between " + fmt.dec(lo) + " and " + fmt.dec(hi) + " across all four bands, so risk "
        + "profiling changes WHAT gets found, not how much each case yields.",
      C.hbar({ data: bands, value: "value", label: "label", valueFmt: fmt.dec,
        metric: "Seizures per case", labelW: 150,
        ariaLabel: "Seizures per case by risk-profiling band" }),
      "card--half"));

    grid.appendChild(card("Where random selection is still finding things",
      "Random selection is the inverse signal: when untargeted checks keep producing results "
        + "(r = " + rr(m.stats.corrRandomRms) + " against RMS share), the risk rules are not "
        + "covering that traffic.",
      C.hbar({ data: m.flows.slice().sort(function (a, b) { return b.random - a.random; }).slice(0, 8),
        value: "random", label: "label", valueFmt: fmt.pct, metric: "Random selection",
        color: "#D55E00", labelW: 210,
        ariaLabel: "Highest random-selection sub-commodities" }),
      "card--half"));

    grid.appendChild(cardWide("RMS reliance against year-on-year movement",
      "Risk-profiling share against the change in seizures, " + DATA.meta.year_previous + " → "
        + DATA.meta.year_current + ". This is a cross-section, not a trend in RMS itself — "
        + "the ITR reports no detection breakdown by year.",
      C.scatter({
        data: m.flows.filter(function (r) { return r.yoy != null; }),
        x: "rms", y: "yoy", size: "seizures", label: "label", group: "sectionLabel",
        xLabel: "Risk profiling (% of cases)", yLabel: "Change in seizures (%)",
        xFmt: fmt.pct, yFmt: fmt.signedPct, sizeLabel: "Seizures",
        refX: m.baseline, refXLabel: "global " + fmt.pct(m.baseline),
        refY: 0, refYLabel: "no change", annotate: 6, width: 1040, height: 470,
        ariaLabel: "Risk profiling share versus year-on-year seizure change" })));

    /* volume tables — one per unit, because kg / pieces / Litres / USD
       must never be summed into a single ranking */
    unitGroups(m.flows).forEach(function (g) {
      grid.appendChild(card("Volume behind the caseload — " + g.unit,
        "Sub-commodities reported in " + g.unit + ", with their risk-profiling share alongside. "
          + "Units are never mixed: each table totals only its own unit.",
        C.volumeProfile({
          data: g.rows.map(function (r) {
            return { en: r.label + " — RMS " + fmt.pct(r.rms), seizures: r.seizures,
              qty: r.qty, perSeiz: r.seizures > 0 ? r.qty / r.seizures : null };
          }),
          unit: g.unit, totalFmt: fmt.dec, perFmt: fmt.dec, catLabel: "Sub-commodity",
          ariaLabel: "Volume profile for sub-commodities reported in " + g.unit }),
        "card--half"));
    });

    content.appendChild(grid);
  }

  /* ================= RMS · CHANNEL MIX ============================ */
  function rmsChannels(m) {
    var grid = C._h("div", { class: "grid" });

    /* global channel split, case-weighted across every sub-commodity */
    var tot = {}, cases = 0;
    METHODS.forEach(function (k) { tot[k] = 0; });
    m.flows.forEach(function (r) {
      cases += r.cases;
      METHODS.forEach(function (k) { tot[k] += r.pct[k] * r.cases; });
    });
    var split = METHODS.map(function (k) {
      return { en: k, pct: cases > 0 ? tot[k] / cases : 0 };
    });

    grid.appendChild(card("Global detection channel split",
      "Case-weighted across all 21 sub-commodities — the single picture of how the "
        + DATA.meta.year_current + " caseload was found.",
      C.donutB({ data: split, value: "pct", label: "en", metric: "Share of cases",
        valueFmt: fmt.pct, centerLabel: "risk profiling",
        ariaLabel: "Global detection channel split" }),
      "card--half"));

    var targeted = m.flows.map(function (r) {
      return { label: r.label, value: r.intel + r.invest };
    }).sort(function (a, b) { return b.value - a.value; });

    grid.appendChild(card("The targeted minority",
      "Intelligence and investigation are the deliberate, case-built channels. They are marginal "
        + "across most of the caseload, but not everywhere — the top of this list ("
        + targeted[0].label.toLowerCase() + ", " + fmt.pct(targeted[0].value)
        + ") is made up of the same low-RMS commodities seen elsewhere, where targeting is done "
        + "by hand rather than by the system.",
      C.hbar({ data: targeted.slice(0, 8),
        value: "value", label: "label", valueFmt: fmt.pct,
        metric: "Intelligence + investigation", labelW: 210,
        ariaLabel: "Intelligence and investigation share by sub-commodity" }),
      "card--half"));

    grid.appendChild(cardWide("Sub-commodity × detection channel",
      "The full 21 × 5 matrix, normalised to 100% per row.",
      C.heatGrid({
        rows: sortBy(m.flows.slice(), "rms").map(function (r) { return r.label; }),
        cols: METHODS,
        matrix: sortBy(m.flows.slice(), "rms").map(function (r) {
          return METHODS.map(function (k) { return r.pct[k]; });
        }),
        valueFmt: fmt.pct, metric: "Share of cases", max: 100, labelW: 260, cellH: 24,
        width: 1040, ariaLabel: "Sub-commodity by detection channel matrix" })));

    content.appendChild(grid);
  }

  /* ---- the compact RMS panel embedded in each live section -------- */
  function rmsSectionPanel(sectionId) {
    var m = DATA.rms;
    var row = m.sections.filter(function (r) { return r.id === sectionId; })[0];
    if (!row) return null;

    var head = C._h("div", { class: "rms-mini" }, [
      C.kpi({ value: fmt.pct(row.rms), label: "Detected by risk profiling",
        accent: P.accent,
        sub: (row.dev >= 0 ? "+" : "") + fmt.dec(row.dev) + " pts vs the "
          + fmt.pct(m.baseline) + " global baseline" }),
      C.stackedBar({ data: methodRows([row]), keys: METHODS, mode: "pct", label: "label",
        valueFmt: fmt.pct, labelW: 96, width: 520,
        ariaLabel: "Detection channel mix for this section" })
    ]);

    var link = C._h("button", { class: "rms-link", type: "button",
      text: "View in RMS Monitoring →" });
    link.addEventListener("click", function () { go("rms", "coverage"); });

    return card("Risk Management System — how much of this did RMS find?",
      "The section's risk-profiling share against the global case-weighted baseline, "
        + "and its full detection channel mix.",
      C._h("div", {}, [head, link]), "card--full");
  }

  /* a full-width RMS card: wide charts scroll sideways on a narrow screen
     rather than scaling their type down to nothing (see .c-wide) */
  function cardWide(title, sub, node) {
    return card(title, sub, C._h("div", { class: "c-wide" }, [node]), "card--full");
  }

  /* rows shaped for stackedBar: one object per section, one key per method */
  function methodRows(rows) {
    return rows.map(function (r) {
      var o = { label: r.label };
      METHODS.forEach(function (k) { o[k] = r.pct[k]; });
      return o;
    });
  }

  /* group sub-commodities by reported quantity unit — kg, pieces,
     Litres and USD are NEVER pooled into one ranking */
  function unitGroups(flows) {
    var by = {};
    flows.forEach(function (r) {
      if (r.qty == null || !r.unit) return;
      (by[r.unit] = by[r.unit] || []).push(r);
    });
    // every unit gets a table, including the single-row ones (USD, Litres) —
    // dropping them would silently hide two whole sub-commodities
    return Object.keys(by)
      .map(function (u) { return { unit: u, rows: by[u] }; })
      .sort(function (a, b) { return b.rows.length - a.rows.length; });
  }

  /* =================================================================
     DRUGS SECTION — assembled entirely from the component library.
     ================================================================= */
  function renderDrugs() {
    var d = DATA.drugs;

    // header
    content.appendChild(C._h("div", { class: "sec-head" }, [
      C._h("p", { class: "sec-head__eyebrow", text: "Section" }),
      C._h("h1", { class: "sec-head__title", text: "Drugs" }),
      C._h("p", { class: "sec-head__sub",
        text: "The narcotics caseload for " + DATA.meta.year_current + " — composition, year-on-year movement, "
          + "trade direction, regional concentration and operational profile. Pick a sub-flow to drill in." })
    ]));

    // sub-flow selector
    var bar = C._h("div", { class: "flowbar" });
    DRUG_FLOWS.forEach(function (f) {
      var b = C._h("button", { class: "flowbar__btn" + (f.slug === state.flow ? " is-active" : ""), type: "button", text: f.label });
      b.addEventListener("click", function () { go("drugs", f.slug); });
      bar.appendChild(b);
    });
    content.appendChild(bar);

    if (state.flow === "overview") drugsOverview(d);
    else {
      var flow = DRUG_FLOWS.filter(function (x) { return x.slug === state.flow; })[0];
      drugsFlow(d, flow);
    }
  }

  /* ---- card helper ------------------------------------------------ */
  function card(title, sub, node, cls) {
    var kids = [C._h("h3", { class: "card__title", text: title })];
    if (sub) kids.push(C._h("p", { class: "card__sub", text: sub }));
    kids.push(node);
    kids.push(C._h("p", { class: "card__source", text: "Source: " + SOURCE }));
    return C._h("div", { class: "card" + (cls ? " " + cls : "") }, kids);
  }

  /* ================= DRUGS · OVERVIEW ============================== */
  function drugsOverview(d) {
    var t = d.totals;

    // KPI row
    var kpis = C._h("div", { class: "kpi-row" }, [
      C.kpi({ value: fmt.int(t.cases),      label: "Cases",           accent: P.accent }),
      C.kpi({ value: fmt.int(t.seizures),   label: "Seizures" }),
      C.kpi({ value: fmt.dec(t.quantity_t), label: "Quantity (tonnes)" }),
      C.kpi({ value: fmt.int(t.admins),     label: "Reporting administrations" })
    ]);
    content.appendChild(kpis);

    var grid = C._h("div", { class: "grid" });

    // composition donut by category (seizures)
    grid.appendChild(card("Composition by drug category",
      "Share of seizures across the six drug categories.",
      C.donut({ data: d.composition, value: "seizures", label: "en",
        metric: "Seizures", valueFmt: fmt.int,
        centerValue: fmt.k(t.seizures), centerLabel: "seizures",
        ariaLabel: "Composition of drug seizures by category" }),
      "card--half"));

    // detection donut (single-emphasis)
    grid.appendChild(card("How seizures were detected",
      "Share of cases by detection method — one method dominates.",
      C.donutB({ data: d.detection, value: "pct", label: "en",
        metric: "Share", valueFmt: fmt.pct,
        centerLabel: "risk profiling",
        ariaLabel: "Detection method share" }),
      "card--half"));

    // RMS in context — sits with the detection donut, links to the hub
    var rmsPanel = rmsSectionPanel("Drugs");
    if (rmsPanel) grid.appendChild(rmsPanel);

    // groupedYoY seizures by category
    grid.appendChild(card("Seizures by category — year on year",
      DATA.meta.year_current + " vs " + DATA.meta.year_previous + ", by number of seizures.",
      C.groupedYoY({ data: sortBy(d.byCategorySeiz, "curr"), prev: "prev", curr: "curr", label: "en",
        valueFmt: fmt.int, metric: "Seizures",
        years: { curr: DATA.meta.year_current, prev: DATA.meta.year_previous },
        ariaLabel: "Seizures by category, year on year" }),
      "card--half"));

    // groupedYoY quantity by category
    grid.appendChild(card("Quantity by category — year on year",
      DATA.meta.year_current + " vs " + DATA.meta.year_previous + ", tonnes seized.",
      C.groupedYoY({ data: sortBy(d.byCategoryQty, "curr"), prev: "prev", curr: "curr", label: "en",
        valueFmt: fmt.dec, metric: "Tonnes",
        years: { curr: DATA.meta.year_current, prev: DATA.meta.year_previous },
        ariaLabel: "Quantity by category, year on year" }),
      "card--half"));

    // stacked direction by country
    grid.appendChild(card("Trade direction by country",
      "Reported cases split by direction for the ten most-active countries.",
      C.stackedBar({ data: d.direction, label: "en",
        keys: ["Import", "Export", "Transit", "Internal"],
        keyLabels: { Import: "Import", Export: "Export", Transit: "Transit", Internal: "Internal" },
        valueFmt: fmt.int, ariaLabel: "Trade direction by country" }),
      "card--full"));

    // heatGrid cases by region × category
    var hrc = d.heatRegionCat;
    grid.appendChild(card("Cases by region × drug category",
      "Where each drug category surfaces — case counts across WCO regions (codes shown verbatim).",
      C.heatGrid({ rows: hrc.regions, cols: hrc.cats, matrix: hrc.cases,
        valueFmt: fmt.int, metric: "Cases",
        ariaLabel: "Cases by region and drug category" }),
      "card--half"));

    // heatGrid quantity by region × category
    grid.appendChild(card("Quantity by region × drug category",
      "Tonnes seized across WCO regions and drug categories.",
      C.heatGrid({ rows: hrc.regions, cols: hrc.cats, matrix: hrc.qty,
        valueFmt: fmt.t, metric: "Tonnes",
        ariaLabel: "Quantity by region and drug category" }),
      "card--half"));

    // heatGrid regional trafficking flows (departure -> destination)
    var hf = d.heatFlows;
    grid.appendChild(card("Regional trafficking flows",
      "Cases by departure region (rows) → destination region (columns). The diagonal is intra-region movement.",
      C.heatGrid({ rows: hf.regions, cols: hf.regions, matrix: hf.matrix,
        valueFmt: fmt.int, metric: "Cases", muteDiagonal: true, cellH: 26, labelW: 60, colLabelH: 62,
        ariaLabel: "Regional trafficking flows, departure to destination" }),
      "card--full"));

    // choropleth country involvement
    var invVals = {};
    d.involvement.forEach(function (r) { invVals[r.iso] = r.cases; });
    grid.appendChild(card("Country involvement",
      "Countries named in drug cases (as reporter, origin, transit or destination), shaded by case count. Single-hue scale; a square-root transform keeps mid-range countries visible.",
      C.choropleth({ world: DATA.world, values: invVals, valueFmt: fmt.int,
        metric: "Cases", legendLabel: "cases (√ scale)",
        nameOf: nameOf, ariaLabel: "Country involvement in drug cases" }),
      "card--full"));

    // operational panels
    var op = d.operational;
    grid.appendChild(card("Operational profile",
      "Where seizures happen, which way the goods move, how they are hidden, and how they are found.",
      C.operPanels({ location: op.location, direction: op.direction,
        concealment: op.concealment, detection: op.detection, topN: 6 }),
      "card--full"));

    content.appendChild(grid);
  }

  /* ================= DRUGS · SUB-FLOW ============================== */
  function drugsFlow(d, flow) {
    var pd = d.perDrug[flow.key];
    if (!pd) { content.appendChild(C._h("div", { class: "state", text: "No data for this sub-flow." })); return; }
    var t = pd.totals;

    // KPI row
    content.appendChild(C._h("div", { class: "kpi-row" }, [
      C.kpi({ value: fmt.int(t.cases),      label: "Cases",   accent: P.accent }),
      C.kpi({ value: fmt.int(t.seizures),   label: "Seizures" }),
      C.kpi({ value: fmt.dec(t.quantity_t), label: "Quantity (tonnes)" })
    ]));

    var grid = C._h("div", { class: "grid" });

    // groupedYoY top-10 reporting countries
    grid.appendChild(card("Top reporting countries — year on year",
      "The ten countries reporting the most " + flow.label.toLowerCase() + " seizures, " +
        DATA.meta.year_current + " vs " + DATA.meta.year_previous + ".",
      C.groupedYoY({ data: pd.reporters, prev: "prev", curr: "curr", label: "en",
        valueFmt: fmt.int, metric: "Seizures",
        years: { curr: DATA.meta.year_current, prev: DATA.meta.year_previous },
        ariaLabel: "Top reporting countries year on year" }),
      "card--full"));

    // groupedYoY seizures by sub-commodity
    grid.appendChild(card("Seizures by sub-commodity — year on year",
      "Breakdown of " + flow.label.toLowerCase() + " seizures by sub-type.",
      C.groupedYoY({ data: sortBy(pd.subSeiz, "curr"), prev: "prev", curr: "curr", label: "en",
        valueFmt: fmt.int, metric: "Seizures",
        years: { curr: DATA.meta.year_current, prev: DATA.meta.year_previous },
        ariaLabel: "Seizures by sub-commodity" }),
      "card--half"));

    // groupedYoY quantity by sub-commodity
    grid.appendChild(card("Quantity by sub-commodity — year on year",
      "Tonnes seized by " + flow.label.toLowerCase() + " sub-type.",
      C.groupedYoY({ data: sortBy(pd.subQty, "curr"), prev: "prev", curr: "curr", label: "en",
        valueFmt: fmt.dec, metric: "Tonnes",
        years: { curr: DATA.meta.year_current, prev: DATA.meta.year_previous },
        ariaLabel: "Quantity by sub-commodity" }),
      "card--half"));

    // hbar top countries by quantity
    grid.appendChild(card("Top countries by quantity seized",
      "The ten countries seizing the most " + flow.label.toLowerCase() + " by weight (tonnes).",
      C.hbar({ data: pd.topQty, value: "qty", label: "en", valueFmt: fmt.dec, metric: "Tonnes",
        ariaLabel: "Top countries by quantity seized" }),
      "card--full"));

    // operational panels
    var op = pd.operational;
    grid.appendChild(card("Operational profile",
      "Seizure location, trade direction, concealment method and detection method for " + flow.label.toLowerCase() + ".",
      C.operPanels({ location: op.location, direction: op.direction,
        concealment: op.concealment, detection: op.detection, topN: 6 }),
      "card--full"));

    content.appendChild(grid);
  }

  /* =================================================================
     STREAM SECTION — generalized scaffold for two-stream sections
     (IPR now; Revenue in Phase C). Overview aggregates ACROSS the two
     streams; each sub-flow reads ONE stream directly. Everything the
     renderer needs that is section-specific comes from `cfg`.
     ================================================================= */
  function renderStreamSection(cfg) {
    var d = DATA[cfg.dataKey];
    var streams = cfg.streams.map(function (s) { return { cfg: s, data: d.perStream[s.name] }; });

    // header
    content.appendChild(C._h("div", { class: "sec-head" }, [
      C._h("p", { class: "sec-head__eyebrow", text: "Section" }),
      C._h("h1", { class: "sec-head__title", text: cfg.label }),
      C._h("p", { class: "sec-head__sub", text: cfg.subtitle })
    ]));

    // sub-flow selector (Overview + one tab per stream)
    var flows = [{ slug: "overview", label: "Overview" }].concat(
      cfg.streams.map(function (s) { return { slug: s.slug, label: s.label }; }));
    var bar = C._h("div", { class: "flowbar" });
    flows.forEach(function (f) {
      var b = C._h("button", { class: "flowbar__btn" + (f.slug === state.flow ? " is-active" : ""),
        type: "button", text: f.label });
      b.addEventListener("click", function () { go(cfg.id, f.slug); });
      bar.appendChild(b);
    });
    content.appendChild(bar);

    if (state.flow === "overview") streamOverview(cfg, d, streams);
    else {
      var sel = cfg.streams.filter(function (s) { return s.slug === state.flow; })[0];
      streamFlow(cfg, d.perStream[sel.name], sel);
    }
  }

  /* ================= STREAM · OVERVIEW ============================= */
  function streamOverview(cfg, d, streams) {
    var t = d.totals, tp = d.totalsPrev;
    var drill = (DATA.drill[cfg.drillKey] || {}).__all__ || {};
    var qUnit = cfg.qty.unit;
    var yrObj = { curr: DATA.meta.year_current, prev: DATA.meta.year_previous };
    var yr = DATA.meta.year_current + " vs " + DATA.meta.year_previous;

    // KPI row — cases / seizures (with YoY delta) · admins · total volume
    var kpis = [
      C.kpi({ value: fmt.int(t.cases), label: "Cases", accent: P.accent,
        delta: fmt.delta(t.cases, tp && tp.cases), deltaLabel: "vs " + DATA.meta.year_previous }),
      C.kpi({ value: fmt.int(t.seizures), label: "Seizures",
        delta: fmt.delta(t.seizures, tp && tp.seizures), deltaLabel: "vs " + DATA.meta.year_previous }),
      C.kpi({ value: fmt.int(t.admins), label: "Reporting administrations" })
    ];
    if (drill.quantity && drill.quantity.value != null)
      kpis.push(C.kpi({ value: fmt.k(drill.quantity.value), label: cap(qUnit) + " seized" }));
    content.appendChild(C._h("div", { class: "kpi-row" }, kpis));

    var grid = C._h("div", { class: "grid" });
    var s0 = cfg.streams[0].label, s1 = cfg.streams[1].label;

    // composition donut (by seizures) across the two streams
    grid.appendChild(card("Section composition",
      "Share of seizures across the section's two streams.",
      C.donut({ data: d.split, value: "seizures", label: "en", metric: "Seizures",
        valueFmt: fmt.int, centerValue: fmt.k(t.seizures), centerLabel: "seizures",
        colors: [C.catColor(0), C.catColor(1)],
        ariaLabel: cfg.label + " composition by stream" }),
      "card--half"));

    // e-commerce penetration by stream (hbar)
    var ecomRows = streams.map(function (s) { return { en: s.cfg.label, pct: s.data.ecom }; });
    grid.appendChild(card("E-commerce penetration by stream",
      "Share of cases linked to e-commerce"
        + (drill.ecom != null ? ". Section overall: " + fmt.pct(drill.ecom) + "." : "."),
      C.hbar({ data: ecomRows, value: "pct", label: "en", valueFmt: fmt.pct, max: 100,
        metric: "E-commerce share", labelW: 150,
        ariaLabel: "E-commerce penetration by stream" }),
      "card--half"));

    // reporting administrations by region (two series = the two streams)
    var rk = cfg.regionalKeys.reporting;
    grid.appendChild(card("Reporting administrations by region",
      "How many administrations reported each stream, by WCO region.",
      C.groupedYoY({ data: d.regional.reporting, label: "region", curr: rk[0], prev: rk[1],
        showDelta: false, valueFmt: fmt.int, years: { curr: s0, prev: s1 },
        ariaLabel: "Reporting administrations by region" }),
      "card--half"));

    // composition by stream × region (stacked, normalised to 100%)
    var ck = cfg.regionalKeys.composition, kl = {};
    kl[ck[0]] = s0; kl[ck[1]] = s1;
    grid.appendChild(card("Stream composition by region",
      "Within each region, the split of seizures between " + s0 + " and " + s1 + ".",
      C.stackedBar({ data: d.regional.composition, label: "region", keys: ck, keyLabels: kl,
        mode: "pct", valueFmt: fmt.pct, colors: [C.catColor(0), C.catColor(1)],
        ariaLabel: "Stream composition by region" }),
      "card--half"));

    // top-10 reporters (pooled across streams)
    grid.appendChild(card("Top reporting countries — year on year",
      "The ten administrations reporting the most seizures across both streams, " + yr + ".",
      C.groupedYoY({ data: mergeSum(collect(streams, "reporters"), ["curr", "prev"], "curr", 10),
        label: "en", curr: "curr", prev: "prev", valueFmt: fmt.int, metric: "Seizures",
        years: yrObj, ariaLabel: "Top reporting countries" }),
      "card--full"));

    // seizures by sub-category (pooled commodity, top 12)
    grid.appendChild(card("Seizures by sub-category — year on year",
      "Sub-categories across both streams, ranked by seizures, " + yr + ".",
      C.groupedYoY({ data: mergeSum(collect(streams, "commodity"), ["curr", "prev"], "curr", 12),
        label: "en", curr: "curr", prev: "prev", valueFmt: fmt.int, metric: "Seizures",
        years: yrObj, ariaLabel: "Seizures by sub-category" }),
      "card--full"));

    // quantity by sub-category (pooled qtyByCommodity, top 12)
    grid.appendChild(card("Quantity by sub-category — year on year",
      "Volume seized (" + qUnit + ") by sub-category across both streams, " + yr + ".",
      C.groupedYoY({ data: mergeSum(collect(streams, "qtyByCommodity"), ["curr", "prev"], "curr", 12),
        label: "en", curr: "curr", prev: "prev", valueFmt: fmt.k, metric: cap(qUnit),
        years: yrObj, ariaLabel: "Quantity by sub-category" }),
      "card--full"));

    // volume-profile table (pooled)
    grid.appendChild(card("Volume profile",
      "Seizures, total volume and volume-per-seizure by sub-category, pooled across both "
        + "streams and sorted by total " + qUnit + ".",
      C.volumeProfile({ data: mergeQtyTable(streams), unit: qUnit, topN: 14,
        catLabel: "Sub-category", otherLabel: "Other sub-categories",
        ariaLabel: "Volume profile by sub-category" }),
      "card--full"));

    // operational profile (pooled: cases summed, percentages case-weighted)
    var mo = mergeOper(streams);
    grid.appendChild(card("Operational profile",
      "Detection location, trade direction, concealment and detection method, pooled across "
        + "both streams. Case counts are summed; percentage panels are case-weighted.",
      C.operPanels({ location: mo.location, direction: mo.direction,
        concealment: mo.concealment, detection: mo.detection, topN: 6 }),
      "card--full"));

    // RMS in context — driven by cfg.drillKey, so every stream section
    // (IPR now, Revenue next) gets it with no renderer change
    var rmsPanel = rmsSectionPanel(cfg.drillKey);
    if (rmsPanel) grid.appendChild(rmsPanel);

    // conveyance by direction (pooled, weighted by method volume)
    grid.appendChild(card("Conveyance by trade direction",
      "For each conveyance method, the share of cases by direction — pooled across streams, "
        + "weighted by each method's case volume.",
      C.stackedBar({ data: mergeConv(streams), label: "conv",
        keys: ["Import", "Export", "Transit", "Internal"],
        keyLabels: { Import: "Import", Export: "Export", Transit: "Transit", Internal: "Internal" },
        mode: "pct", valueFmt: fmt.pct, ariaLabel: "Conveyance by trade direction" }),
      "card--full"));

    // regional flows (pooled matrix)
    var mf = mergeFlows(streams);
    grid.appendChild(card("Regional flows",
      "Cases by departure region (rows) → destination region (columns), pooled across streams. "
        + "The diagonal is intra-region movement.",
      C.heatGrid({ rows: mf.regions, cols: mf.regions, matrix: mf.matrix, valueFmt: fmt.int,
        metric: "Cases", muteDiagonal: true, cellH: 26, labelW: 60, colLabelH: 62,
        ariaLabel: "Regional flows, departure to destination" }),
      "card--full"));

    // choropleth country involvement (pooled)
    grid.appendChild(card("Country involvement",
      "Countries named in section cases (reporter, origin, transit or destination), shaded by "
        + "case count. Single-hue scale; a square-root transform keeps mid-range countries visible.",
      C.choropleth({ world: DATA.world, values: mergeInvolvement(streams), valueFmt: fmt.int,
        metric: "Cases", legendLabel: "cases (√ scale)", nameOf: nameOf,
        ariaLabel: "Country involvement" }),
      "card--full"));

    content.appendChild(grid);
  }

  /* ================= STREAM · SUB-FLOW ============================= */
  function streamFlow(cfg, pd, sel) {
    if (!pd) { content.appendChild(C._h("div", { class: "state", text: "No data for this stream." })); return; }
    var t = pd.totals;
    var yrObj = { curr: DATA.meta.year_current, prev: DATA.meta.year_previous };
    var yr = DATA.meta.year_current + " vs " + DATA.meta.year_previous;
    var qUnit = (pd.qtyUnit && pd.qtyUnit.en) ? pd.qtyUnit.en : cfg.qty.unit;
    var name = sel.label.toLowerCase();

    // KPI row
    var kpis = [
      C.kpi({ value: fmt.int(t.cases), label: "Cases", accent: P.accent }),
      C.kpi({ value: fmt.int(t.seizures), label: "Seizures" }),
      C.kpi({ value: fmt.int(t.admins), label: "Reporting administrations" })
    ];
    if (t.pieces != null) kpis.push(C.kpi({ value: fmt.k(t.pieces), label: cap(qUnit) + " seized" }));
    content.appendChild(C._h("div", { class: "kpi-row" }, kpis));

    var grid = C._h("div", { class: "grid" });

    // top-10 reporters
    grid.appendChild(card("Top reporting countries — year on year",
      "The ten administrations reporting the most " + name + " seizures, " + yr + ".",
      C.groupedYoY({ data: pd.reporters, curr: "curr", prev: "prev", label: "en",
        valueFmt: fmt.int, metric: "Seizures", years: yrObj,
        ariaLabel: "Top reporting countries" }),
      "card--full"));

    // seizures by sub-commodity
    grid.appendChild(card("Seizures by sub-commodity — year on year",
      "Breakdown of " + name + " seizures by sub-commodity.",
      C.groupedYoY({ data: sortBy(pd.commodity, "curr"), curr: "curr", prev: "prev", label: "en",
        valueFmt: fmt.int, metric: "Seizures", years: yrObj,
        ariaLabel: "Seizures by sub-commodity" }),
      "card--half"));

    // quantity by sub-commodity
    grid.appendChild(card("Quantity by sub-commodity — year on year",
      "Volume seized (" + qUnit + ") by " + name + " sub-commodity.",
      C.groupedYoY({ data: sortBy(pd.qtyByCommodity, "curr"), curr: "curr", prev: "prev", label: "en",
        valueFmt: fmt.k, metric: cap(qUnit), years: yrObj,
        ariaLabel: "Quantity by sub-commodity" }),
      "card--half"));

    // volume-profile table (full sub-commodity detail)
    grid.appendChild(card("Volume profile",
      "Seizures, total volume and volume-per-seizure for every " + name + " sub-commodity, "
        + "sorted by total " + qUnit + ".",
      C.volumeProfile({ data: pd.qtyTable, unit: qUnit, catLabel: "Sub-commodity",
        ariaLabel: "Volume profile" }),
      "card--full"));

    // e-commerce share by sub-commodity (where present)
    if (pd.ecomByCommodity && pd.ecomByCommodity.length) {
      grid.appendChild(card("E-commerce share by sub-commodity",
        "Share of " + name + " cases linked to e-commerce, by sub-commodity."
          + (pd.ecom != null ? " Stream overall: " + fmt.pct(pd.ecom) + "." : ""),
        C.hbar({ data: sortBy(pd.ecomByCommodity, "pct"), value: "pct", label: "en",
          valueFmt: fmt.pct, max: 100, metric: "E-commerce share", labelW: 200,
          ariaLabel: "E-commerce share by sub-commodity" }),
        "card--half"));
    }

    // conveyance by direction (where present)
    if (pd.convByDirection && pd.convByDirection.length) {
      grid.appendChild(card("Conveyance by trade direction",
        "For each conveyance method, the share of " + name + " cases by direction.",
        C.stackedBar({ data: pd.convByDirection, label: "conv",
          keys: ["Import", "Export", "Transit", "Internal"],
          keyLabels: { Import: "Import", Export: "Export", Transit: "Transit", Internal: "Internal" },
          mode: "pct", valueFmt: fmt.pct, ariaLabel: "Conveyance by trade direction" }),
        "card--half"));
    }

    // top departures (Revenue extra — rendered only if the stream carries it)
    if (pd.departures && pd.departures.length) {
      var dvk = firstKey(pd.departures[0], ["cases", "curr", "v", "value"]);
      grid.appendChild(card("Top departure countries",
        "Countries most often named as the point of departure for " + name + ".",
        C.hbar({ data: pd.departures, value: dvk, label: "en", valueFmt: fmt.int,
          metric: "Cases", ariaLabel: "Top departure countries" }),
        "card--half"));
    }

    // regional flows
    grid.appendChild(card("Regional flows",
      "Cases by departure region (rows) → destination region (columns) for " + name + ". "
        + "The diagonal is intra-region movement.",
      C.heatGrid({ rows: pd.flows.regions, cols: pd.flows.regions, matrix: pd.flows.matrix,
        valueFmt: fmt.int, metric: "Cases", muteDiagonal: true, cellH: 26, labelW: 60, colLabelH: 62,
        ariaLabel: "Regional flows" }),
      "card--full"));

    // choropleth involvement
    var inv = {}; pd.involvement.map.forEach(function (r) { inv[r.iso] = r.cases; });
    grid.appendChild(card("Country involvement",
      "Countries named in " + name + " cases, shaded by case count. Single-hue √ scale.",
      C.choropleth({ world: DATA.world, values: inv, valueFmt: fmt.int, metric: "Cases",
        legendLabel: "cases (√ scale)", nameOf: nameOf, ariaLabel: "Country involvement" }),
      "card--full"));

    // operational profile
    var op = pd.operational;
    grid.appendChild(card("Operational profile",
      "Detection location, trade direction, concealment and detection method for " + name + ".",
      C.operPanels({ location: op.location, direction: op.direction,
        concealment: op.concealment, detection: op.detection, topN: 6 }),
      "card--full"));

    content.appendChild(grid);
  }

  /* ---- cross-stream aggregation helpers (overview) ---------------- */
  // collect the same array from every stream
  function collect(streams, key) { return streams.map(function (s) { return s.data[key]; }); }

  // sum numeric `numKeys` grouped by en/label across several arrays
  function mergeSum(arrays, numKeys, sortKey, topN) {
    var map = {}, order = [];
    arrays.forEach(function (arr) { (arr || []).forEach(function (dd) {
      var k = dd.en != null ? dd.en : dd.label;
      if (!map[k]) { map[k] = { en: k, fr: dd.fr }; numKeys.forEach(function (nk) { map[k][nk] = 0; }); order.push(k); }
      numKeys.forEach(function (nk) { map[k][nk] += (+dd[nk] || 0); });
    }); });
    var out = order.map(function (k) { return map[k]; });
    out.sort(function (a, b) { return (b[sortKey] || 0) - (a[sortKey] || 0); });
    return topN ? out.slice(0, topN) : out;
  }

  // pooled volume-profile: sub-categories are disjoint across streams, so
  // concatenate, then re-derive per-seizure from the pooled totals.
  function mergeQtyTable(streams) {
    var map = {}, order = [];
    streams.forEach(function (s) { (s.data.qtyTable || []).forEach(function (dd) {
      var k = dd.en;
      if (!map[k]) { map[k] = { en: k, fr: dd.fr, seizures: 0, qty: 0 }; order.push(k); }
      map[k].seizures += (+dd.seizures || 0);
      map[k].qty      += (+dd.qty || 0);
    }); });
    return order.map(function (k) {
      var r = map[k]; r.perSeiz = r.seizures > 0 ? Math.round(r.qty / r.seizures) : null; return r;
    });
  }

  // pooled country involvement: sum cases per ISO across streams
  function mergeInvolvement(streams) {
    var out = {};
    streams.forEach(function (s) { (s.data.involvement.map || []).forEach(function (r) {
      out[r.iso] = (out[r.iso] || 0) + (+r.cases || 0);
    }); });
    return out;
  }

  // pooled operational panels: cases summed; percentages case-weighted
  function mergeOper(streams) {
    return {
      location:    mergeCases(streams, "location"),
      concealment: mergeCases(streams, "concealment"),
      direction:   mergeWeightedPct(streams, "direction"),
      detection:   mergeWeightedPct(streams, "detection")
    };
  }
  function mergeCases(streams, panel) {
    var map = {}, order = [];
    streams.forEach(function (s) { (s.data.operational[panel] || []).forEach(function (dd) {
      var k = dd.en; if (!map[k]) { map[k] = { en: k, fr: dd.fr, cases: 0 }; order.push(k); }
      map[k].cases += (+dd.cases || 0);
    }); });
    return order.map(function (k) { return map[k]; }).sort(function (a, b) { return b.cases - a.cases; });
  }
  function mergeWeightedPct(streams, panel) {
    var map = {}, order = [], W = 0;
    streams.forEach(function (s) {
      var w = (s.data.totals && s.data.totals.cases) || 0; W += w;
      (s.data.operational[panel] || []).forEach(function (dd) {
        var k = dd.en; if (!map[k]) { map[k] = { en: k, fr: dd.fr, _w: 0 }; order.push(k); }
        map[k]._w += (+dd.pct || 0) * w;
      });
    });
    return order.map(function (k) {
      return { en: map[k].en, fr: map[k].fr, pct: W > 0 ? +(map[k]._w / W).toFixed(1) : 0 };
    }).sort(function (a, b) { return b.pct - a.pct; });
  }

  // pooled conveyance-by-direction: each method's direction split is weighted
  // by that method's case volume (operational.conveyance `curr`), summed
  // across streams. Every method in convByDirection has a matching count.
  function mergeConv(streams) {
    var dirs = ["Import", "Export", "Transit", "Internal"];
    var map = {}, order = [];
    streams.forEach(function (s) {
      var wmap = {}; (s.data.operational.conveyance || []).forEach(function (c) { wmap[c.en] = (+c.curr || 0); });
      (s.data.convByDirection || []).forEach(function (row) {
        var k = row.conv;
        if (!map[k]) { map[k] = { conv: k, _w: 0 }; dirs.forEach(function (dd) { map[k][dd + "_w"] = 0; }); order.push(k); }
        var w = wmap[k] != null ? wmap[k] : 0;
        map[k]._w += w;
        dirs.forEach(function (dd) { map[k][dd + "_w"] += (+row[dd] || 0) * w; });
      });
    });
    return order.map(function (k) {
      var r = map[k], W = r._w || 1, o = { conv: k, _w: r._w };
      dirs.forEach(function (dd) { o[dd] = +(r[dd + "_w"] / W).toFixed(1); });
      return o;
    }).sort(function (a, b) { return b._w - a._w; });
  }

  // pooled regional flows: union of regions (ordered by total involvement),
  // matrices summed cell-by-cell after aligning region indices by name.
  function mergeFlows(streams) {
    var tot = {}, present = {};
    streams.forEach(function (s) { var f = s.data.flows; f.regions.forEach(function (rg, i) {
      present[rg] = true; var sum = 0;
      for (var j = 0; j < f.regions.length; j++) sum += (+f.matrix[i][j] || 0) + (+f.matrix[j][i] || 0);
      tot[rg] = (tot[rg] || 0) + sum;
    }); });
    var regions = Object.keys(present).sort(function (a, b) { return (tot[b] || 0) - (tot[a] || 0); });
    var idx = {}; regions.forEach(function (rg, i) { idx[rg] = i; });
    var M = regions.map(function () { return regions.map(function () { return 0; }); });
    streams.forEach(function (s) { var f = s.data.flows;
      for (var i = 0; i < f.regions.length; i++) for (var j = 0; j < f.regions.length; j++) {
        var v = +f.matrix[i][j] || 0; if (!v) continue;
        M[idx[f.regions[i]]][idx[f.regions[j]]] += v;
      }
    });
    return { regions: regions, matrix: M };
  }

  /* ---- utils ------------------------------------------------------ */
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function firstKey(obj, keys) {
    for (var i = 0; i < keys.length; i++) if (obj[keys[i]] != null) return keys[i];
    return keys[0];
  }
  function sortBy(arr, key) {
    return arr.slice().sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });
  }
  function nameOf(iso) {
    var c = DATA.cname[iso];
    return c ? (c.en || iso) : iso;
  }
})();
