/* =========================================================================
   SCENE_DATA — the short labels the three scenes are annotated with.

   demo-data.js opens with a contract: no figure may appear anywhere in the
   page that is not defined there. This file keeps that contract intact by
   holding NO FIGURES AT ALL. Every number the scenes print is read live out
   of window.demoData at build time, and every label below is a ≤6-word
   compression of a sentence that is still in demo-data.js — `src` names the
   sentence it compresses, so the two can be checked against each other.

   The scenes also ship the uncompressed sentences as a visually-hidden list,
   the same way every chart in this deck already ships its numbers as a
   visually-hidden table. Nothing is dropped, only redrawn.

   A {{TOKEN}} here is the deck's own awaiting-figure device: a value the
   presenter has not settled yet, rendered as a visibly unfilled chip rather
   than invented. See ASSETS.md.
   ========================================================================= */
window.SCENE_DATA = {

  /* ---------------------------------------------------- section 2, in page */
  targeting: {
    key: "KEY COMPONENT · RISK MANAGEMENT DEPARTMENT",   /* functions[0] */
    consoleTitle: "TARGETING CENTRE",
    clockNote: "AROUND THE CLOCK · EVERY DAY",           /* functions[7] */
    clockZone: 5,                                        /* Tashkent, UTC+5 */
    feedsTitle: "INBOUND FEEDS",
    feeds: [
      { label: "WCO INFORMATION", sub: "databases · CENcomm", src: "functions[2]" },
      { label: "GOVERNMENT AGENCIES", sub: "other agencies at the border", src: "functions[3]" },
      { label: "OPERATIONAL INTELLIGENCE", sub: "processed and analysed", src: "functions[1]" }
    ],
    gate: "RISK SCORING",
    binsTitle: "CHANNELLED",
    /* Which channel each item takes, lane by lane. A literal table, not a
       generator: the same press must give the same frame in front of an
       audience, every time. The one `r` in the cargo lane is the consignment
       the flagged step annotates. */
    script: [
      ["g", "y", "g", "g"],
      ["g", "g", "y", "g"],
      ["g", "g", "g", "y"],
      ["g", "y", "g", "r"],
      ["g", "g", "y", "g"],
      ["g", "g", "g", "y"]
    ],
    flagLane: 3, flagItem: 3,
    flagCallouts: [
      { t: "TAILORED RULE APPLIED", s: "non-standard case", src: "functions[5]" },
      { t: "ADDITIONAL RISK DETECTED", s: "outside the profiles", src: "functions[4]" }
    ],
    handoff: { t: "ON-SITE ASSESSMENT", s: "EXPERT EXAMINATION", src: "functions[6]" },
    steps: [
      { label: "All channels", say: "six channels, one console" },
      { label: "Inbound feeds", say: "what the centre runs on" },
      { label: "Scored, channelled", say: "green, yellow, red" },
      { label: "Flagged", say: "non-standard case held" },
      { label: "Handed off", say: "on-site assessment" }
    ],
    modeAll: "All channels",
    hint: "TAB IN · ← → STEP · DIGITS JUMP"
  },

  /* ------------------------------------------------- E-Transit, at the gate */
  eTransit: {
    posts: { entry: "ENTRY BORDER POST", exit: "EXIT BORDER POST", inland: "INLAND ROUTE" },
    /* The deck names one agency on this platform and no others (see
       beats.transit). The rest are the presenter's to fill in, so they are
       awaiting-figure chips rather than plausible inventions. */
    barTitle: "ONE PLATFORM · ONE LODGEMENT",
    barNote: "ONE EXCHANGE, NOT SIX",
    agencies: ["CUSTOMS", "MINISTRY OF INTERNAL AFFAIRS", "{{ETRANSIT_AGENCY_3}}", "{{ETRANSIT_AGENCY_4}}"],
    observer: "CENTRALISED CONTROL · TARGETING CENTRE",
    queueLabel: "AT THE CROSSING",
    traderLabel: "TRADER STEPS",
    traderNote: "EVERYTHING ELSE AUTOMATIC",
    stamps: ["WCO RECOMMENDATIONS", "INTERNATIONAL STANDARDS", "GLOBAL BEST PRACTICE"],
    steps: [
      { label: "Before", say: "the queue at the crossing", src: "bullets[7]" },
      { label: "One lodgement", say: "data before the vehicle", src: "lead + bullets[0]" },
      { label: "Agencies notified", say: "one platform, every agency", src: "bullets[1] + bullets[4]" },
      { label: "Fees settled", say: "automatic, no counter visit", src: "bullets[2]" },
      { label: "RMS decides", say: "legitimate through, rest held", src: "bullets[3]" },
      { label: "Queue drains", say: "congestion at the crossing", src: "bullets[7]" },
      { label: "Observed", say: "the targeting centre rides along", src: "bullets[6]" },
      { label: "Exit cleared", say: "one step for the trader", src: "bullets[5]" }
    ]
  },

  /* --------------------------------- Customs and cargo operations, warehouse */
  ccoIS: {
    mapTitle: "CUSTOMS WAREHOUSES",
    platform: "ONE DIGITAL PLATFORM",
    parties: [
      { t: "WAREHOUSE OPERATOR", badge: "MONITOR · CONTROL" },
      { t: "CUSTOMS AUTHORITY", badge: "MONITOR · CONTROL" },
      { t: "DECLARANT", badge: "MONITOR" }
    ],
    sameNote: "SAME RECORD · SAME SECOND",
    /* The record all three parties are looking at. These are the STATE of one
       illustrative consignment, not statistics — the same distinction
       demo-data.js draws between `facts` and `metrics`, and the panes carry
       the same note under them that Facts() carries everywhere else.
       Deliberately no figures: every figure in this deck lives in
       demo-data.js, and a made-up package count would be one that does not.
       The channel words are the deck's law — green, yellow, red, nothing
       else. */
    recordTitle: "ONE CONSIGNMENT RECORD",
    recordNote: "state of this illustrative consignment",
    record: [
      { k: "STATUS", v: "IN TRANSIT", alt: "PLACED" },
      { k: "CHANNEL", v: "GREEN", alt: "YELLOW" },
      { k: "GPS SEAL", v: "FITTED", alt: "VERIFIED" }
    ],
    change: "CHANGE IT HERE",
    stations: ["ARRIVAL", "RMS ASSESSMENT", "PLACEMENT", "RELEASE"],
    branch: { yes: "OFFICER ATTENDS", no: "REMOTE CONTROL ONLY" },
    gainsTitle: "LESS TIME, LOWER COST",
    gainsCaption: "Share of placements an officer attended in person",
    gainsRange: "2018 vs 2025",
    gainsNote: "The officer's journey to the warehouse is the time and the cost. Both ends are printed.",
    gainTokens: [
      { label: "time to place a consignment", value: "{{CCO_TIME_SAVING}}" },
      { label: "operating cost to business", value: "{{CCO_COST_SAVING}}" }
    ],
    steps: [
      { label: "430 warehouses", say: "across the country", src: "bullets[0]" },
      { label: "One platform", say: "consolidated onto one system", src: "bullets[0]" },
      { label: "Three parties", say: "one record, seen at once", src: "bullets[1]" },
      { label: "Change once", say: "seen by all three", src: "bullets[5]" },
      { label: "Arrival", say: "the consignment reaches the warehouse", src: "bullets[4]" },
      { label: "RMS decides", say: "must an officer attend?", src: "bullets[2]" },
      { label: "Placed, released", say: "faster placement of goods", src: "bullets[4]" },
      { label: "Time and cost", say: "2018 against 2025", src: "bullets[3]" }
    ]
  }
};
