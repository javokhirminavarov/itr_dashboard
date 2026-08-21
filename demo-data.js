/* =========================================================================
   demoData — the single source of every word and figure on screen.
   Contract:
   - No figure may appear anywhere in the page that is not defined here.
   - Every metric must carry an `anchor` (a 2018 baseline, a trend, or a
     random-selection comparison). Metrics without one refuse to render.
   - A value written as "{{TOKEN}}" is an awaiting-figure placeholder and
     renders as a visibly unfilled chip. `TRANSIT_LEGAL_BASIS` is deliberately
     left as one: inventing a legal citation is a different class of error from
     using an illustrative number, and it keeps that machinery visibly alive.
   - `metrics` are statistics and must be anchored. `panel.facts` are the
     *state of this one illustrative consignment* (its channel, its risk level)
     and are labelled as such on screen — they are not statistics.
   - Channel outcomes are the words green / yellow / red only.

   FIGURES ARE ILLUSTRATIVE. meta.figuresIllustrative below drives the on-screen
   badge. Every value to be replaced before the visit is listed in ASSETS.md.
   ========================================================================= */
window.demoData = {
  meta: {
    title: "One Consignment — Border to Audit",
    subtitle: "Uzbekistan Customs · Risk-based control, end to end",
    org: "UZBEKISTAN CUSTOMS",
    orgSub: "RISK MANAGEMENT JOURNEY",
    figuresIllustrative: true,
    illustrativeBadge: "ILLUSTRATIVE FIGURES",
    trsMethodology: false, // true → stage 7 prints the WCO Time Release Study footnote
    trsFootnote: "Clearance times measured under WCO Time Release Study methodology.",
    disclosure:
      "The consignment shown is an illustrative composite, and the figures on screen are " +
      "illustrative placeholders pending verified Customs data.",
    theme2026: "Customs protecting society through vigilance and commitment",
    speakers: [
      { stages: [1, 5], credential: "WCO-accredited Risk Management Expert", short: "RISK MGMT EXPERT" },
      { stages: [6, 8], credential: "WCO BACUDA Scholar", short: "BACUDA SCHOLAR" },
      { stages: [9, 10], credential: "WCO Master Trainer Programme Graduate", short: "MASTER TRAINER" }
    ],
    tabs: [
      { id: "road", label: "Road", icon: "truck" },
      { id: "rail", label: "Rail", icon: "train" },
      { id: "air", label: "Air cargo", icon: "plane" },
      { id: "pax", label: "Passengers", icon: "person", jumpTo: 9 }
    ],
    scrollHint: "SCROLL DOWN TO CONTINUE THE JOURNEY",
    targetingCentre: {
      link: "TARGETING CENTRE",
      title: "National targeting centre",
      text: "One centre assesses road, rail, air cargo and passenger data against the same " +
            "risk management system, and pushes the result to the officer at the front line."
    },
    keyHints: "↑ ↓ stage · 1–0 jump · ESC overview · R replay"
  },

  stages: {
    baseline: {
      n: 1, rail: "2018", eyebrow: "2018 — BEFORE",
      headline: "Every truck stopped.",
      support: "Every consignment opened by hand. Days at the border. Almost nothing found.",
      overview: "100% physical inspection, ~3% found anything",
      card: { title: "The 2018 baseline", icon: "truck" },
      panel: { title: "Baseline — 2018", icon: "clock" },
      metrics: [
        { value: "100%", label: "consignments physically inspected",
          anchor: { type: "context", text: "2018 — every truck, every time" } },
        { value: "~3%", label: "of inspections found a violation", compact: true,
          anchor: { type: "context", text: "97 of 100 opened for nothing" } },
        { value: "3–5 days", label: "typical wait at the border", compact: true,
          anchor: { type: "context", text: "2018" } }
      ],
      showDisclosure: true
    },

    flows: {
      n: 2, rail: "FLOWS", eyebrow: "TODAY — THREE FLOWS, ONE SYSTEM",
      headline: "Three flows. One system.",
      support: "Road, rail and air cargo — one risk management system assesses them all.",
      overview: "Road, rail, air — one RMS across all modes",
      card: { title: "Three flows, one system", icon: "layers" },
      panel: { title: "Selectivity by mode", icon: "layers" },
      overall: {
        value: "29%", label: "selected for control, all modes",
        anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" }
      },
      modes: {
        road: { name: "Road",
          metric: { value: "29%", label: "road consignments selected for control",
            anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" } } },
        rail: { name: "Rail",
          metric: { value: "18%", label: "rail consignments selected for control",
            anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" } } },
        air: { name: "Air cargo",
          metric: { value: "34%", label: "air consignments selected for control",
            anchor: { type: "baseline2018", text: "vs 100% stopped in 2018" } } }
      }
    },

    border: {
      n: 3, rail: "BORDER", eyebrow: "STAGE 1 · THE GATE",
      headline: "Decided before arrival.",
      support: "Pre-arrival data is assessed before the truck arrives; low-risk cargo clears on the spot.",
      overview: "Channel decided at the gate, before arrival",
      card: { title: "Border checkpoint", icon: "shield" },
      panel: { title: "Border decision", icon: "shield",
        facts: [
          { label: "Pre-arrival risk", value: "MEDIUM" },
          { label: "Data sources consulted", value: "12" }
        ] },
      channels: { options: ["green", "yellow", "red"], outcome: "green", note: "this consignment" },
      split: [
        { name: "green", share: "71%" }, { name: "yellow", share: "24%" }, { name: "red", share: "5%" }
      ],
      splitNote: "share of road consignments by channel",
      metrics: [
        { value: "2.1 min", label: "decision at the gate",
          anchor: { type: "baseline2018", text: "vs days of waiting in 2018" } }
      ]
    },

    transit: {
      n: 4, rail: "TRANSIT", eyebrow: "STAGE 2 · INLAND TRANSIT",
      headline: "Supervised, not stopped.",
      support: "Customs CCTV integrated with the national police camera network — every checkpoint passed is on record.",
      overview: "Goods under customs supervision, corridor-wide",
      card: { title: "Inland transit", icon: "cam" },
      panel: { title: "Transit monitoring", icon: "cam",
        facts: [
          { label: "Checkpoints passed", value: "7" },
          { label: "Alerts raised", value: "0" }
        ] },
      legalBasis: "{{TRANSIT_LEGAL_BASIS}}",
      trace: ["GATE", "CP·1", "CP·2", "WAREHOUSE"],
      metrics: [
        { value: "1,248", label: "seizures on supervised transit",
          anchor: { type: "trend", text: "up ×2 since 2022" } }
      ]
    },

    warehouse: {
      n: 5, rail: "WAREHOUSE", eyebrow: "STAGE 3 · CUSTOMS WAREHOUSE",
      headline: "The system decides who attends.",
      support: "The RMS decides whether an officer must attend the unloading.",
      overview: "Officer attendance decided by the RMS",
      card: { title: "Warehouse / unloading", icon: "box" },
      panel: { title: "Unloading control", icon: "person",
        facts: [{ label: "Officer required", value: "NO — remote control" }] },
      metrics: [
        { value: "28%", label: "unloadings with an officer attending",
          anchor: { type: "baseline2018", text: "vs 100% in 2018" } }
      ]
    },

    declaration: {
      n: 6, rail: "DECLARATION", eyebrow: "STAGE 4 · IMPORT DECLARATION",
      headline: "Assessed again at declaration.",
      support: "The import declaration is assessed a second time — every stage runs on data analysis.",
      overview: "Second assessment; AI-based RMS as next step",
      card: { title: "Final declaration", icon: "doc" },
      panel: { title: "Declaration assessment", icon: "doc",
        facts: [{ label: "Channel selected", value: "YELLOW — documentary check" }] },
      channels: { options: ["green", "yellow", "red"], outcome: "yellow", note: "documentary check" },
      metrics: [
        { value: "18.6%", label: "violations found on selected declarations",
          anchor: { type: "vsRandom", text: "vs 7.3% on random selection" } }
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
      card: { title: "Release", icon: "check" },
      panel: { title: "Release outcome", icon: "check" },
      metrics: [
        { value: "1.6 hrs", label: "average clearance time",
          anchor: { type: "baseline2018", text: "vs 3–5 days in 2018" } },
        { value: "92%", label: "of inspections finding a violation", compact: true,
          anchor: { type: "baseline2018", text: "vs ~3% in 2018" } }
      ]
    },

    pca: {
      n: 8, rail: "AUDIT", eyebrow: "STAGE 6 · POST-CLEARANCE AUDIT",
      headline: "Control continues after release.",
      support: "Post-clearance audit findings feed straight back into the risk management system.",
      overview: "The loop closes: audit findings feed the RMS",
      card: { title: "Post-clearance audit", icon: "loop" },
      panel: { title: "Feedback to RMS", icon: "loop",
        factsNote: "risk profiles rebuilt from audit findings, latest month",
        facts: [{ label: "Risk profiles updated", value: "243" }] },
      metrics: [
        { value: "1,982", label: "post-clearance audit findings",
          anchor: { type: "trend", text: "+14% on the prior year" } },
        { value: "UZS 214 bn", label: "additional revenue assessed", secondary: true, compact: true,
          anchor: { type: "trend", text: "secondary to protection — seizures lead" } }
      ]
    },

    passengers: {
      n: 9, rail: "PASSENGERS", eyebrow: "BEYOND CARGO · PASSENGERS",
      headline: "Risk also travels with passengers.",
      support: "Advance passenger information, assessed by a dedicated passenger targeting system before the aircraft lands.",
      overview: "API data + dedicated passenger targeting",
      card: { title: "Passengers", icon: "person" },
      panel: { title: "Passenger targeting", icon: "person" },
      metrics: [
        { value: "11.4%", label: "hit rate on targeted selections",
          anchor: { type: "vsRandom", text: "vs 0.8% on random checks" } }
      ]
    },

    close: {
      n: 10, rail: "2026", eyebrow: "WCO 2026",
      headline: "Vigilance and commitment.",
      support: "Customs protecting society through vigilance and commitment.",
      overview: "Where this leads — WCO 2026 theme",
      card: { title: "WCO 2026", icon: "flag" },
      panel: { title: "Where this leads", icon: "flag",
        factsNote: "in development with the WCO BACUDA programme",
        facts: [{ label: "Next", value: "AI-based risk assessment · WCO BACUDA" }] },
      metrics: []
    }
  }
};
