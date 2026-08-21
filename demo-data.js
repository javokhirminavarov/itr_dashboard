/* =========================================================================
   demoData — the single source of every word and figure on screen.
   Contract:
   - No figure may appear anywhere in the page that is not defined here.
   - A value written as "{{TOKEN}}" is an awaiting-figure placeholder and
     renders as a visibly unfilled chip. Replace the token with the real
     figure (e.g. "38 min") before the visit — nothing else needs editing.
   - Every metric must carry an `anchor` (a 2018 baseline, a trend, or a
     random-selection comparison). Metrics without one refuse to render.
   - Channel outcomes are the words green / yellow / red only.
   ========================================================================= */
window.demoData = {
  meta: {
    title: "One Consignment — Border to Audit",
    subtitle: "Uzbekistan Customs · Risk-based control, end to end",
    trsMethodology: false, // true → stage 7 prints the WCO Time Release Study footnote
    trsFootnote: "Clearance times measured under WCO Time Release Study methodology.",
    disclosure:
      "The consignment shown is an illustrative composite. All statistics shown are actual figures.",
    theme2026: "Customs protecting society through vigilance and commitment",
    speakers: [
      { stages: [1, 5], credential: "WCO-accredited Risk Management Expert", short: "RISK MGMT EXPERT" },
      { stages: [6, 8], credential: "WCO BACUDA Scholar", short: "BACUDA SCHOLAR" },
      { stages: [9, 10], credential: "WCO Master Trainer Programme Graduate", short: "MASTER TRAINER" }
    ],
    keyHints: "← → navigate · 1–0 jump · ESC overview · R replay"
  },

  stages: {
    baseline: {
      n: 1, rail: "2018", eyebrow: "2018 — BEFORE",
      headline: "Every truck stopped.",
      support: "Every consignment opened by hand. Days at the border. Almost nothing found.",
      overview: "100% physical inspection, ~3% found anything",
      metrics: [
        { value: "100%", label: "consignments physically inspected",
          anchor: { type: "context", text: "2018 — every truck, every time" } },
        { value: "~3%", label: "of inspections found a violation",
          anchor: { type: "context", text: "97 of 100 opened for nothing" } },
        { value: "{{BORDER_WAIT_2018}}", label: "typical wait at the border",
          anchor: { type: "context", text: "2018" } }
      ],
      showDisclosure: true
    },

    flows: {
      n: 2, rail: "FLOWS", eyebrow: "TODAY — THREE FLOWS, ONE SYSTEM",
      headline: "Three flows. One system.",
      support: "Road, rail and air cargo — one risk management system assesses them all.",
      overview: "Road, rail, air — one RMS across all modes",
      overall: {
        value: "{{OVERALL_SELECTIVITY_NOW}}", label: "selected for control, all modes",
        anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" }
      },
      modes: {
        road: { name: "Road",
          metric: { value: "{{ROAD_SELECTIVITY_NOW}}", label: "road consignments selected for control",
            anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" } } },
        rail: { name: "Rail",
          metric: { value: "{{RAIL_SELECTIVITY_NOW}}", label: "rail consignments selected for control",
            anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" } } },
        air: { name: "Air cargo",
          metric: { value: "{{AIR_SELECTIVITY_NOW}}", label: "air consignments selected for control",
            anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" } } }
      }
    },

    border: {
      n: 3, rail: "BORDER", eyebrow: "STAGE 1 · THE GATE",
      headline: "Decided before arrival.",
      support: "Pre-arrival data is assessed before the truck arrives; low-risk cargo clears on the spot.",
      overview: "Channel decided at the gate, before arrival",
      channels: { options: ["green", "yellow", "red"], outcome: "green", note: "this consignment" },
      metrics: [
        { value: "{{GATE_DECISION_TIME_NOW}}", label: "decision at the gate",
          anchor: { type: "baseline2018", text: "vs days of waiting in 2018" } }
      ]
    },

    transit: {
      n: 4, rail: "TRANSIT", eyebrow: "STAGE 2 · INLAND TRANSIT",
      headline: "Supervised, not stopped.",
      support: "Customs CCTV integrated with the national police camera network — every checkpoint passed is on record.",
      overview: "Goods under customs supervision, corridor-wide",
      legalBasis: "{{TRANSIT_LEGAL_BASIS}}",
      trace: ["GATE", "CP·1", "CP·2", "WAREHOUSE"],
      metrics: [
        { value: "{{TRANSIT_SEIZURES_LATEST}}", label: "seizures on supervised transit",
          anchor: { type: "trend", text: "{{TRANSIT_SEIZURES_TREND}}" } }
      ]
    },

    warehouse: {
      n: 5, rail: "WAREHOUSE", eyebrow: "STAGE 3 · CUSTOMS WAREHOUSE",
      headline: "The system decides who attends.",
      support: "The RMS decides whether an officer must attend the unloading.",
      overview: "Officer attendance decided by the RMS",
      metrics: [
        { value: "{{WAREHOUSE_ATTENDANCE_NOW}}", label: "unloadings with an officer attending",
          anchor: { type: "baseline2018", text: "vs 100% in 2018" } }
      ]
    },

    declaration: {
      n: 6, rail: "DECLARATION", eyebrow: "STAGE 4 · IMPORT DECLARATION",
      headline: "Assessed again at declaration.",
      support: "The import declaration is assessed a second time — every stage runs on data analysis.",
      overview: "Second assessment; AI-based RMS as next step",
      channels: { options: ["green", "yellow", "red"], outcome: "yellow", note: "documentary check" },
      metrics: [
        { value: "{{DECL_VIOLATION_RATE_SELECTED}}", label: "violations found on selected declarations",
          anchor: { type: "vsRandom", text: "vs {{DECL_VIOLATION_RATE_RANDOM}} on random selection" } }
      ],
      nextStep: {
        tag: "NEXT STEP — IN DEVELOPMENT",
        title: "AI-based risk assessment",
        text: "Machine-learning assessment, developed with the WCO BACUDA programme."
      }
    },

    release: {
      n: 7, rail: "RELEASE", eyebrow: "STAGE 5 · RELEASE",
      headline: "Faster release, sharper inspections.",
      support: "The consignment releases; inspection effort goes only where the data points.",
      overview: "The payoff: clearance time and inspection efficiency",
      metrics: [
        { value: "{{CLEARANCE_TIME_NOW}}", label: "average clearance time",
          anchor: { type: "baseline2018", text: "vs {{CLEARANCE_TIME_2018}} in 2018" } },
        { value: "{{INSPECTION_HIT_RATE_NOW}}", label: "of inspections finding a violation",
          anchor: { type: "baseline2018", text: "vs ~3% in 2018" } }
      ]
    },

    pca: {
      n: 8, rail: "AUDIT", eyebrow: "STAGE 6 · POST-CLEARANCE AUDIT",
      headline: "Control continues after release.",
      support: "Post-clearance audit findings feed straight back into the risk management system.",
      overview: "The loop closes: audit findings feed the RMS",
      metrics: [
        { value: "{{PCA_RESULTS_LATEST}}", label: "post-clearance audit results",
          anchor: { type: "trend", text: "{{PCA_RESULTS_TREND}}" } },
        { value: "{{PCA_EXTRA_REVENUE_LATEST}}", label: "additional revenue assessed", secondary: true,
          anchor: { type: "trend", text: "secondary to protection — seizures lead" } }
      ]
    },

    passengers: {
      n: 9, rail: "PASSENGERS", eyebrow: "BEYOND CARGO · PASSENGERS",
      headline: "Risk also travels with passengers.",
      support: "Advance passenger information, assessed by a dedicated passenger targeting system before the aircraft lands.",
      overview: "API data + dedicated passenger targeting",
      metrics: [
        { value: "{{PAX_HIT_RATE_TARGETED}}", label: "hit rate on targeted selections",
          anchor: { type: "vsRandom", text: "vs {{PAX_HIT_RATE_RANDOM}} on random checks" } }
      ]
    },

    close: {
      n: 10, rail: "2026", eyebrow: "WCO 2026",
      headline: "Vigilance and commitment.",
      support: "Customs protecting society through vigilance and commitment.",
      overview: "Where this leads — WCO 2026 theme",
      metrics: []
    }
  }
};
