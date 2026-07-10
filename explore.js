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
    { id: "iprhs",   label: "IPR & Health/Safety",   live: false },
    { id: "revenue", label: "Revenue",               live: false },
    { id: "security",label: "Security",              live: false }
  ];

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
    fetchJSON("./data/itr_meta.json")
  ]).then(function (res) {
    DATA = { drugs: res[0], drill: res[1], world: res[2], cname: res[3], meta: res[4] };
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
    // flow only meaningful for drugs
    if (state.section === "drugs") {
      var f = DRUG_FLOWS.filter(function (x) { return x.slug === q.flow; })[0];
      state.flow = f ? f.slug : "overview";
    } else {
      state.flow = "overview";
    }
  }

  function go(section, flow) {
    var h = "#section=" + section;
    if (section === "drugs" && flow && flow !== "overview") h += "&flow=" + flow;
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

  /* ---- utils ------------------------------------------------------ */
  function sortBy(arr, key) {
    return arr.slice().sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });
  }
  function nameOf(iso) {
    var c = DATA.cname[iso];
    return c ? (c.en || iso) : iso;
  }
})();
