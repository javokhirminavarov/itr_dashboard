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

   UNCONFIRMED FIGURES USE {{TOKEN}} PLACEHOLDERS. Approved figures and the
   complete audit register are documented in ASSETS.md.
   ========================================================================= */
window.demoData = {
  meta: {
    title: "Risk management, end to end",
    subtitle: "Uzbekistan Customs · with the World Customs Organization",
    org: "UZBEKISTAN CUSTOMS",
    trsMethodology: false, // No supplied evidence that the clearance-time figure follows a TRS
    trsFootnote: "Clearance time measured using the WCO Time Release Study methodology.",
    theme2026: "Customs protecting society through vigilance and commitment",
    speakers: [
      { sections: [1, 2], credential: "WCO-accredited Risk Management Expert", short: "RISK MGMT EXPERT" },
      { sections: [3, 5], credential: "WCO BACUDA Scholar", short: "BACUDA SCHOLAR" },
      { sections: [6, 8], credential: "WCO Master Trainer Programme Graduate", short: "MASTER TRAINER" }
    ],
    /* Modals opened from the mini markers pinned on the corridor. */
    modals: {
      eTransit: {
        icon: "doc",
        tag: "INFORMATION SYSTEM",
        title: "E-Transit AAT",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "percent of transit movements", scope: "E-Transit clearances", status: "unconfirmed" },
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
        source: { owner: "Uzbekistan Customs presenter", publication: "figure supplied for the WCO visit", reportingDate: "undated", period: "current at presentation", unit: "warehouses", scope: "warehouses on the digital platform", status: "approved" },
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

  /* The AI material names these four capability groups and their maturity.
     Keep this separate from illustrative operational statistics: these are
     bounded capability claims, not performance claims. */
  aiRisk: {
    section: 8, rail: "AI", eyebrow: "SECTION 8 · AI RISK ANALYSIS",
    headline: "Models assist. Officers decide.",
    support: "Models flag, compare or assist; authorized officers make customs decisions.",
    overview: "Four evidence-bounded AI capabilities, each labelled by maturity and source",
    card: { title: "AI risk analysis", icon: "screen" },
    hub: { title: "AI risk analysis", sub: "HUMAN-LED CUSTOMS CONTROL" },
    oversight: "Models flag, compare or assist; authorized officers make customs decisions.",
    capabilities: [
      { key: "cargo", title: "Cargo / image analysis", action: "Flags cargo images for review.",
        maturity: "DEPLOYED", source: "SUPPLIED AI MATERIAL" },
      { key: "documents", title: "Document integrity & extraction", action: "Compares integrity; assists extraction.",
        maturity: "PILOT", source: "SUPPLIED AI MATERIAL" },
      { key: "classification", title: "Classification / valuation controls", action: "Flags classification or valuation anomalies.",
        maturity: "PILOT", source: "SUPPLIED AI MATERIAL" },
      { key: "legislation", title: "Legislation-grounded officer support", action: "Assists with legislation-grounded answers.",
        maturity: "PLANNED", source: "SUPPLIED AI MATERIAL" }
    ]
  },

  /* ------------------------------------------------------------------ beats */
  beats: {
    /* --- section 1 --------------------------------------------------------- */
    cooperation: {
      section: 1, rail: "WCO", eyebrow: "SECTION 1 · INTERNATIONAL COOPERATION",
      headline: "Built with the WCO.",
      support: "WCO expertise in; Uzbek expertise out.",
      speakerNotes: "Uzbekistan Customs built its risk management system with the World Customs " +
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
      ],
      /* Four reciprocal outcomes are the audience-facing executive summary.
         The complete five-item source account above remains the accessible
         text equivalent and the presenter's notes. */
      outcomes: [
        { icon: "check", tag: "ACCREDITATION", title: "Trusted expertise",
          evidence: "WCO-accredited experts serve on international missions." },
        { icon: "person", tag: "TRAINING", title: "Skills transferred",
          evidence: "Master Trainer and BACUDA learning returns to the service." },
        { icon: "plane", tag: "REGIONAL SUPPORT", title: "Practice shared",
          evidence: "Tashkent workshops and Malaysia benchmarking move knowledge both ways." },
        { icon: "loop", tag: "CAPACITY BUILDING", title: "Capability multiplied",
          evidence: "Uzbekistan convenes the risk-management working group." }
      ]
    },

    /* --- section 2 --------------------------------------------------------- */
    targeting: {
      section: 2, rail: "CENTRE", eyebrow: "SECTION 2 · TARGETING CENTRE",
      headline: "One centre. Every channel.",
      support: "24/7 decisions from shared border intelligence.",
      speakerNotes: "A key component of the risk management system, staffed around the clock.",
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
      headline: "Baseline awaiting confirmation.",
      support: "Inspection share, finding rate and border wait require an authoritative Customs source.",
      overview: "Inspection baseline awaiting confirmation, and the flows since",
      card: { title: "The 2018 baseline", icon: "clock" },
      leftPanel: {
        title: "2018 — before", icon: "clock",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        metrics: [
          { value: "{{BASELINE_INSPECTION_SHARE}}", label: "consignments physically inspected",
            anchor: { type: "context", text: "2018 baseline · {{BASELINE_INSPECTION_ANCHOR}}" } },
          { value: "{{BASELINE_VIOLATION_RATE}}", label: "of inspections found a violation", compact: true,
            anchor: { type: "context", text: "2018 comparison · {{BASELINE_VIOLATION_ANCHOR}}" } },
          { value: "{{BASELINE_BORDER_WAIT}}", label: "typical wait at the border", compact: true,
            anchor: { type: "context", text: "2018" } }
        ]
      },
      rightPanel: {
        title: "Flows since 2018", icon: "layers",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        chart: {
          kind: "line",
          token: "BORDER_FLOW_SERIES",
          caption: "Transport and cargo flow, indexed to 2018 = 100",
          source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
          range: "2018–2025",
          note: "Indexed so that one axis carries both. The 2025 multiple is printed on each line.",
          x: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
          series: [
            { name: "Vehicles crossing", tone: "a", values: ["{{VEHICLE_FLOW_SERIES}}"], end: "{{VEHICLE_FLOW_MULTIPLE}}" },
            { name: "Cargo carried", tone: "b", values: ["{{CARGO_FLOW_SERIES}}"], end: "{{CARGO_FLOW_MULTIPLE}}" }
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
        { label: "Pre-arrival risk", value: "{{PRE_ARRIVAL_RISK}}" },
        { label: "Data sources consulted", value: "{{DATA_SOURCES_CONSULTED}}" }
      ],
      leftPanel: {
        title: "Traffic at the border, 2025", icon: "truck",
        source: { owner: "Uzbekistan Customs", publication: "Statistics at the border (supplied presentation)", reportingDate: "undated", period: "2025", unit: "counts and annual/daily transactions", scope: "national border network", status: "approved" },
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
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        split: [{ name: "green", share: "{{ROAD_GREEN_SHARE}}" }, { name: "yellow", share: "{{ROAD_YELLOW_SHARE}}" }, { name: "red", share: "{{ROAD_RED_SHARE}}" }],
        splitNote: "share of road consignments by channel, 2025",
        metrics: [
          { value: "{{GATE_DECISION_TIME}}", label: "decision at the gate",
            anchor: { type: "baseline2018", text: "vs 2018 · {{GATE_DECISION_BASELINE}}" } },
          { value: "{{BORDER_SEIZURE_CASES}}", label: "seizure cases at the border", compact: true,
            anchor: { type: "trend", text: "trend · {{BORDER_SEIZURE_TREND}}" } }
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
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        facts: [
          { label: "GPS electronic seal", value: "{{GPS_SEAL_STATUS}}" },
          { label: "Checkpoints passed", value: "{{TRANSIT_CHECKPOINTS}}" },
          { label: "Alerts raised", value: "{{TRANSIT_ALERTS}}" }
        ],
        trace: ["GATE", "CP·1", "CP·2", "WAREHOUSE"],
        metrics: [
          { value: "{{TRANSIT_SEIZURES}}", label: "seizures on supervised transit",
            anchor: { type: "trend", text: "trend since 2022 · {{TRANSIT_SEIZURE_TREND}}" } }
        ]
      }
    },

    /* --- section 4 --------------------------------------------------------- */
    warehouse: {
      section: 4, rail: "WAREHOUSE", eyebrow: "SECTION 4 · CUSTOMS WAREHOUSE INFORMATION SYSTEM",
      source: { owner: "Uzbekistan Customs presenter", publication: "figure supplied for the WCO visit", reportingDate: "undated", period: "current at presentation", unit: "warehouses", scope: "warehouses on the digital platform", status: "approved" },
      headline: "430 warehouses, one platform.",
      support: "Operators and officers work the same system, and the RMS decides who has to attend.",
      overview: "One digital platform across the warehouse network",
      card: { title: "Customs warehouse", icon: "box" },
      hint: "Open the marker on the corridor for the Customs and cargo operations system.",
      leftPanel: {
        title: "Growth against 2018", icon: "layers",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        chart: {
          kind: "growth",
          token: "WAREHOUSE_GROWTH_SERIES",
          caption: "2018 compared with 2025",
          source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
          range: "2018 vs 2025",
          note: "Four measures on four scales, so each pair is read against itself — both values printed.",
          rows: [
            { name: "Customs warehouses", from: "{{WAREHOUSES_2018}}", to: 430, fromText: "{{WAREHOUSES_2018}}", toText: "430", mult: "{{WAREHOUSE_GROWTH}}" },
            { name: "Shipments placed", from: "{{SHIPMENTS_2018}}", to: "{{SHIPMENTS_2025}}", fromText: "{{SHIPMENTS_2018}}", toText: "{{SHIPMENTS_2025}}", mult: "{{SHIPMENTS_GROWTH}}" },
            { name: "Value of goods", from: "{{GOODS_VALUE_2018}}", to: "{{GOODS_VALUE_2025}}", fromText: "{{GOODS_VALUE_2018}}", toText: "{{GOODS_VALUE_2025}}", mult: "{{GOODS_VALUE_GROWTH}}" },
            { name: "Weight of goods", from: "{{GOODS_WEIGHT_2018}}", to: "{{GOODS_WEIGHT_2025}}", fromText: "{{GOODS_WEIGHT_2018}}", toText: "{{GOODS_WEIGHT_2025}}", mult: "{{GOODS_WEIGHT_GROWTH}}" }
          ]
        }
      },
      rightPanel: {
        title: "Officer attendance, 2025", icon: "person",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        share: {
          caption: "Share of placements an officer attended in person",
          source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
          range: "2025",
          parts: [
            { name: "Officer attended", value: "{{OFFICER_ATTENDED_SHARE}}", tone: "a" },
            { name: "Remote control only", value: "{{REMOTE_CONTROL_SHARE}}", tone: "n" }
          ]
        },
        metrics: [
          { value: "{{OFFICER_ATTENDED_SHARE}}", label: "placements with an officer attending",
            anchor: { type: "baseline2018", text: "vs 2018 · {{OFFICER_ATTENDANCE_2018}}" } }
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
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "categories, criteria and profiles", scope: "production risk management system", status: "unconfirmed" },
        nodes: [
          { icon: "person", title: "Categorisation of entities", value: "{{RMS_CATEGORIES}}",
            sub: "{{TRADER_RISK_CRITERIA}} risk criteria applied to traders" },
          { icon: "shield", title: "Risk profiles", value: "{{RISK_PROFILES}} profiles",
            sub: "{{UNDERVALUATION_PROFILES}} undervaluation · {{MISCLASSIFICATION_PROFILES}} misclassification · {{AI_PROFILES}} AI-based" },
          { icon: "loop", title: "Random selection module", value: "{{RANDOM_SELECTION_SHARE}} of declarations",
            sub: "the control group everything else is measured against" }
        ]
      },
      leftPanel: {
        title: "Operational flow", icon: "layers", metricsGrid: true,
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        metrics: [
          { value: "{{CUSTOMS_DECLARATIONS}}", label: "customs declarations", compact: true,
            anchor: { type: "baseline2018", text: "vs 2018 · {{DECLARATION_GROWTH}}" } },
          { value: "{{FOREIGN_TRADE_TURNOVER}}", label: "foreign trade turnover", compact: true,
            anchor: { type: "baseline2018", text: "vs 2018 · {{TRADE_TURNOVER_GROWTH}}" } },
          { value: "{{CONSIGNMENTS_DECLARED}}", label: "consignments declared", compact: true,
            anchor: { type: "baseline2018", text: "vs 2018 · {{CONSIGNMENT_GROWTH}}" } },
          { value: "{{REGISTERED_TRADERS}}", label: "traders on the register", compact: true,
            anchor: { type: "baseline2018", text: "vs 2018 · {{TRADER_GROWTH}}" } }
        ]
      },
      rightPanel: {
        title: "What the system produces", icon: "check",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        shift: {
          caption: "Declarations by risk channel",
          source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
          range: "2018 vs 2025",
          rows: [
            { year: "2018", parts: [{ name: "green", value: "{{DECLARATION_CHANNELS_2018}}" }] },
            { year: "2025", parts: [{ name: "green", value: "{{DECLARATION_CHANNELS_2025}}" }] }
          ]
        },
        metrics: [
          { value: "{{AVERAGE_CLEARANCE_TIME}}", label: "average clearance time",
            anchor: { type: "baseline2018", text: "vs 2018 · {{CLEARANCE_TIME_2018}}" } },
          { value: "{{RISK_CONFIRMATION_RATE}}", label: "risk confirmation rate on selected declarations", compact: true,
            anchor: { type: "vsRandom", text: "vs random selection · {{RANDOM_CONFIRMATION_RATE}}" } },
          { value: "{{CUSTOMS_VIOLATIONS}}", label: "customs violations detected", compact: true,
            anchor: { type: "trend", text: "trend vs 2024 · {{VIOLATION_TREND}}" } }
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
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        metrics: [
          { value: "{{AUDITS_CONDUCTED}}", label: "customs audits conducted", compact: true,
            anchor: { type: "trend", text: "trend vs prior year · {{AUDITS_TREND}}" } },
          { value: "{{AUDITS_WITH_FINDINGS}}", label: "audits with findings", compact: true,
            anchor: { type: "trend", text: "trend vs prior year · {{AUDIT_FINDINGS_TREND}}" } },
          { value: "{{AUDIT_FINDING_RATE}}", label: "of audits found something", compact: true,
            anchor: { type: "vsRandom", text: "vs random audits · {{RANDOM_AUDIT_FINDING_RATE}}" } }
        ]
      },
      rightPanel: {
        title: "Feedback to the RMS", icon: "loop", motif: "loop",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        factsNote: "risk profiles rebuilt from audit findings, latest month",
        facts: [{ label: "Risk profiles updated", value: "{{RISK_PROFILES_UPDATED}}" }],
        metrics: [
          { value: "{{ADDITIONAL_REVENUE}}", label: "additional revenue assessed", secondary: true, compact: true,
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
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "passenger channel share", scope: "arriving passengers", status: "unconfirmed" },
        note: "The system assigns the channel by analysing advance passenger information and other data.",
        nodes: [
          { key: "arrive", title: "Arrival", sub: "aircraft on stand" },
          { key: "api", title: "Advance passenger information", sub: "assessed before landing" },
          { key: "passport", title: "Passport control", sub: "identity" },
          { key: "customs", title: "Customs control", sub: "channel assigned" }
        ],
        channels: [
          { name: "green", label: "Green channel", share: "{{PASSENGER_GREEN_SHARE}}", shareText: "{{PASSENGER_GREEN_SHARE}}" },
          { name: "red", label: "Red channel", share: "{{PASSENGER_RED_SHARE}}", shareText: "{{PASSENGER_RED_SHARE}}" }
        ]
      },
      leftPanel: {
        title: "Passenger flow", icon: "plane",
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        chart: {
          kind: "line",
          token: "PASSENGER_FLOW_SERIES",
          caption: "Passengers arriving, indexed to 2018 = 100",
          source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
          range: "2018–2025",
          note: "One series, so the caption names it and no legend box is needed.",
          x: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
          series: [
            { name: "Arriving passengers", tone: "a", values: ["{{PASSENGER_FLOW_SERIES}}"], end: "{{PASSENGER_FLOW_MULTIPLE}}" }
          ]
        }
      },
      rightPanel: {
        title: "Targeting passengers", icon: "person", metricsGrid: true,
        source: { owner: "Uzbekistan Customs", publication: "confirmation required", reportingDate: "unconfirmed", period: "unconfirmed", unit: "see metric", scope: "see metric", status: "unconfirmed" },
        metrics: [
          { value: "{{PASSENGER_RISK_CRITERIA}}", label: "passenger risk criteria in use", compact: true,
            anchor: { type: "baseline2018", text: "from 2018 · {{PASSENGER_CRITERIA_2018}}" } },
          { value: "{{API_AIRLINES}}", label: "airlines providing API data", compact: true,
            anchor: { type: "baseline2018", text: "from 2018 · {{API_AIRLINES_2018}}" } },
          { value: "{{PASSENGER_TARGET_HIT_RATE}}", label: "hit rate on targeted selections",
            anchor: { type: "vsRandom", text: "vs random checks · {{RANDOM_PASSENGER_HIT_RATE}}" } }
        ]
      }
    }
  }
};
