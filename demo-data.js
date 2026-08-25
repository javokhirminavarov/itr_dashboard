/* =========================================================================
   demoData — the single source of every word and figure on screen.
   Contract:
   - No figure may appear anywhere in the page that is not defined here.
   - Every metric must carry an `anchor` (a 2018 baseline, a trend, or a
     random-selection comparison). Metrics without one refuse to render.
   - Every chart must carry a `caption` and a `range`. Charts without them
     refuse to render, for the same reason: a number with nothing to measure it
     against is decoration.
   - A value written as "{{TOKEN}}" is an awaiting-figure placeholder and
     renders as a visibly unfilled chip. `ETRANSIT_SHARE` is one: the presenter's
     own "we will add later", and it keeps that machinery visibly alive.
   - `metrics` are statistics and must be anchored. `facts` are the *state of
     this one illustrative consignment* (its channel, its risk level) and are
     labelled as such on screen — they are not statistics.
   - Channel outcomes are the words green / yellow / red only. Passenger
     control uses the green / red subset.

   FIGURES ARE ILLUSTRATIVE. Every value to be replaced before the visit is
   listed in ASSETS.md.
   ========================================================================= */
window.demoData = {
  meta: {
    title: "Risk management, end to end",
    subtitle: "Uzbekistan Customs · with the World Customs Organization",
    org: "UZBEKISTAN CUSTOMS",
    trsMethodology: false, // true → section 5 prints the WCO Time Release Study footnote
    trsFootnote: "Clearance times measured under WCO Time Release Study methodology.",
    theme2026: "Customs protecting society through vigilance and commitment",
    speakers: [
      { sections: [1, 2], credential: "WCO-accredited Risk Management Expert", short: "RISK MGMT EXPERT" },
      { sections: [3, 5], credential: "WCO BACUDA Scholar", short: "BACUDA SCHOLAR" },
      { sections: [6, 7], credential: "WCO Master Trainer Programme Graduate", short: "MASTER TRAINER" }
    ],
    /* Modals opened from the mini markers pinned on the corridor. */
    modals: {
      eTransit: {
        icon: "doc",
        tag: "INFORMATION SYSTEM",
        title: "E-Transit AAT",
        lead: "Bill-of-lading data reaches Customs before the truck does, and the system clears " +
              "the vehicle at the border on it.",
        bullets: [
          "Developed in line with WCO recommendations",
          "Integrated Border Management through a single platform connecting all relevant " +
            "government agencies",
          "Fully automated fees and payments",
          "The risk management system facilitates legitimate trade while ensuring border security",
          "Integrated information exchange between the relevant authorities",
          "Simple enough that businesses use it without specialised knowledge",
          "Centralised control by the targeting centre",
          "Reduces congestion at border crossing points"
        ],
        /* The deck settles what E-Transit is; it does not say how much of the
           traffic already moves on it, which is the first thing anyone asks. */
        metric: {
          value: "{{ETRANSIT_SHARE}}", label: "share of transit movements cleared on E-Transit",
          anchor: { type: "context", text: "of 5.2 mln cargo and 1.2 mln railway transactions a year" }
        }
      },
      tcBorder: {
        icon: "screen",
        tag: "AT THE BORDER",
        title: "Role of the targeting centre",
        lead: "The centre is live on the crossing while the vehicle is standing there.",
        bullets: [
          "Monitor movements through surveillance cameras",
          "Stop or hold cargo and vehicles when necessary",
          "Change the assigned risk channel",
          "Initiate customs inspections",
          "Place shipments or vehicles under enhanced control"
        ]
      },
      ccoIS: {
        icon: "box",
        tag: "INFORMATION SYSTEM",
        title: "Customs and cargo operations",
        lead: "One digital platform for the whole customs warehouse network.",
        plate: "warehouseInterior",
        bullets: [
          "Around 430 customs warehouses on a single digital platform",
          "Warehouse operators and customs officers monitor and control through the same platform",
          "The risk management system applied to warehouse operations",
          "Less time and lower operating cost for business",
          "Faster processing and placement of goods into customs warehouses",
          "Greater efficiency and transparency of warehouse operations"
        ]
      }
    }
  },

  /* ------------------------------------------------------------------ beats */
  beats: {
    /* --- section 1 --------------------------------------------------------- */
    cooperation: {
      section: 1, rail: "WCO", eyebrow: "SECTION 1 · INTERNATIONAL COOPERATION",
      headline: "Built with the WCO.",
      support: "Uzbekistan Customs built its risk management system with the World Customs " +
               "Organization — and now helps other administrations build theirs.",
      overview: "Accreditation, training, workshops, benchmarking, working group",
      card: { title: "WCO & Uzbekistan", icon: "shield" },
      items: [
        { icon: "check", tag: "ACCREDITATION", title: "Expert accreditation",
          text: "Officers accredited by the WCO as Risk Management Experts, and deployed on WCO missions." },
        { icon: "person", tag: "TRAINING", title: "Master Trainer Programme and BACUDA",
          text: "Graduates of the WCO Master Trainer Programme, and a scholar on the BACUDA " +
                "data-analytics scholarship programme." },
        { icon: "screen", tag: "WORKSHOPS", title: "Workshops delivered by the WCO",
          text: "National risk management workshops, delivered in Tashkent by WCO experts." },
        { icon: "plane", tag: "BENCHMARKING", title: "Malaysia Customs benchmarking visit",
          text: "Malaysia Customs came to study the system — Uzbekistan supporting another " +
                "administration on risk management." },
        { icon: "loop", tag: "WORKING GROUP", title: "Risk management mini working group",
          text: "Uzbekistan organises the group's online sessions." }
      ]
    },

    /* --- section 2 --------------------------------------------------------- */
    targeting: {
      section: 2, rail: "CENTRE", eyebrow: "SECTION 2 · TARGETING CENTRE",
      headline: "One centre. Every channel.",
      support: "A key component of the risk management system, staffed around the clock.",
      overview: "Eight functions, and the six channels it watches at once",
      card: { title: "Targeting centre", icon: "screen" },
      hub: { title: "Targeting Centre", sub: "STATE CUSTOMS COMMITTEE" },
      /* Eight functions, filling the eight perimeter slots of the hub grid.
         Real-time monitoring is not one of them: it is what the centre does
         across all six channels at once, and it has its own band below. */
      functions: [
        { icon: "layers", title: "Key component of the RMS",
          text: "A key component of the Risk Management Department — where the system meets " +
                "the officer on duty." },
        { icon: "doc", title: "Operational intelligence",
          text: "Processing and analysis of operational intelligence from the field." },
        { icon: "shield", title: "WCO information and databases",
          text: "WCO enforcement information and databases, including CENcomm." },
        { icon: "loop", title: "Integration with OGAs",
          text: "Connected to other government agencies working at the border." },
        { icon: "scan", title: "Additional risks",
          text: "Detection and mitigation of risks the profiles did not anticipate." },
        { icon: "flag", title: "Rules for non-standard cases",
          text: "Risk rules tailored to consignments the standing profiles do not cover." },
        { icon: "check", title: "On-site assessment",
          text: "Assessment on site, and expert examination commissioned where it is needed." },
        { icon: "clock", title: "24/7 capability",
          text: "Operational around the clock, every day of the year." }
      ],
      /* The six channels the centre watches at once. */
      monitoring: {
        title: "Real-time monitoring of the customs processes",
        modes: [
          { icon: "plane", label: "Air" },
          { icon: "car", label: "Road vehicles" },
          { icon: "train", label: "Rail" },
          { icon: "truck", label: "Cargo" },
          { icon: "pax", label: "Passengers" },
          { icon: "warehouse", label: "Warehouses" }
        ]
      }
    },

    /* --- section 3, beat one ------------------------------------------------ */
    baseline2018: {
      section: 3, rail: "2018", eyebrow: "SECTION 3 · THE 2018 BASELINE",
      headline: "Every truck stopped.",
      support: "Every consignment opened by hand. Days at the border. Almost nothing found.",
      overview: "100% inspection in 2018, and the flows since",
      card: { title: "The 2018 baseline", icon: "clock" },
      leftPanel: {
        title: "2018 — before", icon: "clock",
        metrics: [
          { value: "100%", label: "consignments physically inspected",
            anchor: { type: "context", text: "2018 — every truck, every time" } },
          { value: "~3%", label: "of inspections found a violation", compact: true,
            anchor: { type: "context", text: "97 of 100 opened for nothing" } },
          { value: "3–5 days", label: "typical wait at the border", compact: true,
            anchor: { type: "context", text: "2018" } }
        ]
      },
      rightPanel: {
        title: "Flows since 2018", icon: "layers",
        chart: {
          kind: "line",
          caption: "Transport and cargo flow, indexed to 2018 = 100",
          range: "2018–2025",
          note: "Indexed so that one axis carries both. The 2025 multiple is printed on each line.",
          x: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
          series: [
            { name: "Vehicles crossing", tone: "a", values: [100, 118, 96, 131, 168, 196, 224, 247], end: "×2.5" },
            { name: "Cargo carried", tone: "b", values: [100, 112, 91, 124, 151, 173, 192, 208], end: "×2.1" }
          ]
        }
      }
    },

    /* --- section 3, beat two ------------------------------------------------ */
    border: {
      section: 3, rail: "BORDER", eyebrow: "SECTION 3 · VEHICLE ENTRY AT THE BORDER",
      headline: "Decided before arrival.",
      support: "Bill-of-lading data arrives ahead of the truck, and the channel is set before it " +
               "reaches the barrier.",
      overview: "Entry at the checkpoint, decided on pre-arrival data",
      card: { title: "Border checkpoint", icon: "shield" },
      hint: "Open the two markers on the corridor for E-Transit and the targeting centre's role here.",
      /* Slide "Statistics at the border": the network the corridor is one road
         through. Counts, not rates — the rates are the metrics below. */
      channels: { options: ["green", "yellow", "red"], outcome: "green", note: "this consignment" },
      facts: [
        { label: "Pre-arrival risk", value: "MEDIUM" },
        { label: "Data sources consulted", value: "12" }
      ],
      leftPanel: {
        title: "Traffic at the border, 2025", icon: "truck",
        tiles: [
          { icon: "flag",      label: "Border",  value: "61",  unit: "customs posts" },
          { icon: "car",       label: "Avto",    value: "4.5", unit: "mln transactions" },
          { icon: "box",       label: "Cargo",   value: "5.2", unit: "mln transactions" },
          { icon: "train",     label: "Railway", value: "1.2", unit: "mln transactions" }
        ],
        metrics: [
          { value: "30 k", label: "vehicles crossing the border a day", compact: true,
            anchor: { type: "baseline2018", text: "×2.9 on 2018" } },
          { value: "87 k", label: "transactions a day", compact: true,
            anchor: { type: "baseline2018", text: "×3.2 on 2018" } },
          /* The argument the whole talk rests on, in one line: the traffic
             nearly tripled and the establishment did not. */
          { value: "3,184", label: "customs officers on daily duty", compact: true,
            anchor: { type: "baseline2018", text: "+10% since 2018, against ×2.9 more vehicles" } }
        ]
      },
      rightPanel: {
        title: "Risk management at the gate", icon: "shield",
        split: [{ name: "green", share: "71%" }, { name: "yellow", share: "24%" }, { name: "red", share: "5%" }],
        splitNote: "share of road consignments by channel, 2025",
        metrics: [
          { value: "2.1 min", label: "decision at the gate",
            anchor: { type: "baseline2018", text: "vs days of waiting in 2018" } },
          { value: "1,860", label: "seizure cases at the border", compact: true,
            anchor: { type: "trend", text: "+18% on 2024" } }
        ]
      }
    },

    /* --- between sections 3 and 4 ------------------------------------------- */
    transit: {
      section: 3, rail: "TRANSIT", eyebrow: "BETWEEN 3 AND 4 · INLAND TRANSIT",
      headline: "Supervised, not stopped.",
      support: "The consignment stays under continuous supervision while it moves inside the country.",
      overview: "Continuous supervision between the border and the warehouse",
      card: { title: "Inland transit", icon: "cam" },
      leftPanel: {
        title: "How it is supervised", icon: "loop",
        bullets: [
          "GPS electronic seals fitted to the load",
          "Vehicle tracking on the main movement platform",
          "Camera data from the Ministry of Internal Affairs"
        ]
      },
      rightPanel: {
        title: "Transit monitoring", icon: "cam",
        facts: [
          { label: "GPS electronic seal", value: "FITTED" },
          { label: "Checkpoints passed", value: "7" },
          { label: "Alerts raised", value: "0" }
        ],
        trace: ["GATE", "CP·1", "CP·2", "WAREHOUSE"],
        metrics: [
          { value: "1,248", label: "seizures on supervised transit",
            anchor: { type: "trend", text: "up ×2 since 2022" } }
        ]
      }
    },

    /* --- section 4 --------------------------------------------------------- */
    warehouse: {
      section: 4, rail: "WAREHOUSE", eyebrow: "SECTION 4 · CUSTOMS WAREHOUSE INFORMATION SYSTEM",
      headline: "430 warehouses, one platform.",
      support: "Operators and officers work the same system, and the RMS decides who has to attend.",
      overview: "One digital platform across the warehouse network",
      card: { title: "Customs warehouse", icon: "box" },
      hint: "Open the marker on the corridor for the Customs and cargo operations system.",
      leftPanel: {
        title: "Growth against 2018", icon: "layers",
        chart: {
          kind: "growth",
          caption: "2018 compared with 2025",
          range: "2018 vs 2025",
          note: "Four measures on four scales, so each pair is read against itself — both values printed.",
          rows: [
            { name: "Customs warehouses", from: 264, to: 430, fromText: "264", toText: "430", mult: "×1.6" },
            { name: "Shipments placed", from: 96, to: 412, fromText: "96 k", toText: "412 k", mult: "×4.3" },
            { name: "Value of goods", from: 18.4, to: 71.9, fromText: "UZS 18.4 tn", toText: "UZS 71.9 tn", mult: "×3.9" },
            { name: "Weight of goods", from: 1.9, to: 6.4, fromText: "1.9 m t", toText: "6.4 m t", mult: "×3.4" }
          ]
        }
      },
      rightPanel: {
        title: "Officer attendance, 2025", icon: "person",
        share: {
          caption: "Share of placements an officer attended in person",
          range: "2025",
          parts: [
            { name: "Officer attended", value: 28, tone: "a" },
            { name: "Remote control only", value: 72, tone: "n" }
          ]
        },
        metrics: [
          { value: "28%", label: "placements with an officer attending",
            anchor: { type: "baseline2018", text: "vs 100% in 2018" } }
        ]
      }
    },

    /* --- section 5 --------------------------------------------------------- */
    declaration: {
      section: 5, rail: "DECLARATION", eyebrow: "SECTION 5 · CUSTOMS DECLARATION CLEARANCE",
      headline: "Assessed again at declaration.",
      support: "Entity category, risk profiles and a random selection module set the channel — and " +
               "the random module is what proves the rest of it works.",
      overview: "The structure of the RMS, and what it produces",
      card: { title: "Final declaration", icon: "doc" },
      channels: { options: ["green", "yellow", "red"], outcome: "yellow", note: "documentary check" },
      structure: {
        caption: "Main structure of the risk management system",
        nodes: [
          { icon: "person", title: "Categorisation of entities", value: "4 categories",
            sub: "312 risk criteria applied to traders" },
          { icon: "shield", title: "Risk profiles", value: "1,146 profiles",
            sub: "186 undervaluation · 143 misclassification · 27 AI-based" },
          { icon: "loop", title: "Random selection module", value: "3% of declarations",
            sub: "the control group everything else is measured against" }
        ]
      },
      leftPanel: {
        title: "Operational flow", icon: "layers", metricsGrid: true,
        metrics: [
          { value: "1.42 m", label: "customs declarations", compact: true,
            anchor: { type: "baseline2018", text: "×2.6 on 2018" } },
          { value: "USD 62.4 bn", label: "foreign trade turnover", compact: true,
            anchor: { type: "baseline2018", text: "×2.2 on 2018" } },
          { value: "3.86 m", label: "consignments declared", compact: true,
            anchor: { type: "baseline2018", text: "×2.4 on 2018" } },
          { value: "38,700", label: "traders on the register", compact: true,
            anchor: { type: "baseline2018", text: "×1.9 on 2018" } }
        ]
      },
      rightPanel: {
        title: "What the system produces", icon: "check",
        shift: {
          caption: "Declarations by risk channel",
          range: "2018 vs 2025",
          rows: [
            { year: "2018", parts: [{ name: "green", value: 0 }, { name: "yellow", value: 0 }, { name: "red", value: 100 }] },
            { year: "2025", parts: [{ name: "green", value: 68 }, { name: "yellow", value: 26 }, { name: "red", value: 6 }] }
          ]
        },
        metrics: [
          { value: "1.6 hrs", label: "average clearance time",
            anchor: { type: "baseline2018", text: "vs 3–5 days in 2018" } },
          { value: "18.6%", label: "risk confirmation rate on selected declarations", compact: true,
            anchor: { type: "vsRandom", text: "vs 7.3% on random selection" } },
          { value: "24,180", label: "customs violations detected", compact: true,
            anchor: { type: "trend", text: "+14% on 2024" } }
        ]
      }
    },

    /* --- section 6 --------------------------------------------------------- */
    audit: {
      section: 6, rail: "AUDIT", eyebrow: "SECTION 6 · CUSTOMS AUDIT",
      headline: "Control continues after release.",
      support: "Audit findings are what rebuild the risk profiles — the loop that keeps the system honest.",
      overview: "Audit indicators, and the findings that feed the RMS",
      card: { title: "Customs audit", icon: "loop" },
      leftPanel: {
        title: "Audit activity", icon: "doc", metricsGrid: true,
        metrics: [
          { value: "3,140", label: "customs audits conducted", compact: true,
            anchor: { type: "trend", text: "+9% on the prior year" } },
          { value: "1,982", label: "audits with findings", compact: true,
            anchor: { type: "trend", text: "+14% on the prior year" } },
          { value: "63%", label: "of audits found something", compact: true,
            anchor: { type: "vsRandom", text: "vs 21% on randomly selected audits" } }
        ]
      },
      rightPanel: {
        title: "Feedback to the RMS", icon: "loop", motif: "loop",
        factsNote: "risk profiles rebuilt from audit findings, latest month",
        facts: [{ label: "Risk profiles updated", value: "243" }],
        metrics: [
          { value: "UZS 214 bn", label: "additional revenue assessed", secondary: true, compact: true,
            anchor: { type: "trend", text: "secondary to protection — seizures lead" } }
        ]
      }
    },

    /* --- section 7 --------------------------------------------------------- */
    passengers: {
      section: 7, rail: "PASSENGERS", eyebrow: "SECTION 7 · PASSENGER CONTROL",
      headline: "Risk travels with passengers.",
      support: "Advance passenger information is assessed before the aircraft lands, so the channel " +
               "is already waiting when the passenger reaches the hall.",
      overview: "API-based targeting through passport and customs control",
      card: { title: "Passenger control", icon: "person" },
      schema: {
        caption: "Arrivals: passport control, then customs control",
        note: "The system assigns the channel by analysing advance passenger information and other data.",
        nodes: [
          { key: "arrive", title: "Arrival", sub: "aircraft on stand" },
          { key: "api", title: "Advance passenger information", sub: "assessed before landing" },
          { key: "passport", title: "Passport control", sub: "identity" },
          { key: "customs", title: "Customs control", sub: "channel assigned" }
        ],
        channels: [
          { name: "green", label: "Green channel", share: 96.4, shareText: "96.4%" },
          { name: "red", label: "Red channel", share: 3.6, shareText: "3.6%" }
        ]
      },
      leftPanel: {
        title: "Passenger flow", icon: "plane",
        chart: {
          kind: "line",
          caption: "Passengers arriving, indexed to 2018 = 100",
          range: "2018–2025",
          note: "One series, so the caption names it and no legend box is needed.",
          x: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
          series: [
            { name: "Arriving passengers", tone: "a", values: [100, 121, 34, 62, 128, 174, 219, 264], end: "×2.6" }
          ]
        }
      },
      rightPanel: {
        title: "Targeting passengers", icon: "person", metricsGrid: true,
        metrics: [
          { value: "148", label: "passenger risk criteria in use", compact: true,
            anchor: { type: "baseline2018", text: "from 26 in 2018" } },
          { value: "34", label: "airlines providing API data", compact: true,
            anchor: { type: "baseline2018", text: "from 6 in 2018" } },
          { value: "11.4%", label: "hit rate on targeted selections",
            anchor: { type: "vsRandom", text: "vs 0.8% on random checks" } }
        ]
      }
    }
  }
};
