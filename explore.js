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

  /* ---- section registry (all six; order matters) ------------------ */
  var SECTIONS = [
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
    fetchJSON("./data/itr_iprhs.json")
  ]).then(function (res) {
    DATA = { drugs: res[0], drill: res[1], world: res[2], cname: res[3], meta: res[4],
             iprhs: res[5] };
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
    if (sec.id === "drugs") renderDrugs();
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
