/* =========================================================================
   SCENE_DATA — the short labels the three pictures are annotated with.

   demo-data.js opens with a contract: no figure may appear anywhere in the
   page that is not defined there. This file keeps that contract intact by
   holding NO FIGURES AT ALL. Every number the pictures print is read live
   out of window.demoData, and every label below is a ≤6-word compression of
   a sentence that is still in demo-data.js — `src` names the sentence it
   compresses, so the two can be checked against each other.

   Each picture is one static drawing that shows all of this at once, and it
   also ships the uncompressed sentences as a visually-hidden list — the same
   way every chart in this deck already ships its numbers as a visually-hidden
   table. Nothing is dropped, only redrawn.
   ========================================================================= */
window.SCENE_DATA = {

  /* ---------------------------------------------------- section 2, in page */
  targeting: {
    /* functions[0], "key component of the Risk Management Department", is the
       section's own support line in demo-data.js and is said there, once. */
    open: "24/7",                                        /* functions[7] */
    openSub: "AROUND THE CLOCK",
    feedsTitle: "1 · INPUTS / DATA USAGE",
    feeds: [
      { t: "WCO INFORMATION", s: "databases · CENcomm", src: "functions[2]" },
      { t: "GOVERNMENT AGENCIES", s: "others at the border", src: "functions[3]" },
      { t: "OPERATIONAL INTELLIGENCE", s: "processed and analysed", src: "functions[1]" }
    ],
    capabilityTitle: "2 · OPERATIONAL CAPABILITY",
    channelsTitle: "3 · MONITORED CHANNELS",
    outTitle: "4 · OUTPUTS",
    extras: [
      { t: "TAILORED RULES", s: "non-standard cases", src: "functions[5]" },
      { t: "ADDITIONAL RISKS", s: "detected and mitigated", src: "functions[4]" }
    ],
    handoff: { t: "ON-SITE ASSESSMENT", s: "expert examination", src: "functions[6]" },
  },

  /* ------------------------------------------------- E-Transit, at the gate */
  eTransit: {
    entry: "ENTRY BORDER POST",
    exit: "EXIT BORDER POST",
    inland: "INLAND ROUTE",
    observer: "CENTRALISED CONTROL · TARGETING CENTRE",   /* bullets[6] */
    /* The deck names one agency on this platform and no others (see
       beats.transit). The rest are the presenter's to fill in, so they are
       awaiting-figure chips rather than plausible inventions. */
    barTitle: "ONE PLATFORM · ALL RELEVANT AGENCIES",     /* bullets[1], [4] */
    agencies: ["CUSTOMS", "MINISTRY OF INTERNAL AFFAIRS",
               "{{ETRANSIT_AGENCY_3}}", "{{ETRANSIT_AGENCY_4}}"],
    marks: [
      { t: "ONE LODGEMENT", s: "WCO recommendations · standards", src: "lead + bullets[0]" },
      { t: "FEES SETTLED", s: "automatic, no counter visit", src: "bullets[2]" },
      { t: "RMS SETS THE CHANNEL", s: "legitimate through, rest flagged", src: "bullets[3]" }
    ],
    queue: { t: "SHORTER QUEUES", s: "at the crossing", src: "bullets[7]" },
    simple: { t: "ONE STEP FOR THE TRADER", s: "no specialised knowledge", src: "bullets[5]" },
  },

  /* --------------------------------- Customs and cargo operations, warehouse */
  ccoIS: {
    manyTitle: "CUSTOMS WAREHOUSES",
    platform: "ONE DIGITAL PLATFORM",
    recordTitle: "ONE CONSIGNMENT RECORD",
    /* Exactly the three parties on the slide's "simultaneous monitoring" row. */
    parties: [
      { t: "WAREHOUSE OPERATOR", s: "MONITOR · CONTROL", src: "bullets[1]" },
      { t: "CUSTOMS AUTHORITY", s: "MONITOR · CONTROL", src: "bullets[1]" },
      { t: "DECLARANT", s: "MONITOR", src: "bullets[1]" }
    ],
    sameNote: "SAME RECORD, SAME SECOND",                /* bullets[5] */
    stations: ["ARRIVAL", "RMS ASSESSMENT", "PLACEMENT", "RELEASE"],
    flowNote: "FASTER PLACEMENT OF GOODS",               /* bullets[4] */
    branchNote: "THE RMS DECIDES WHO ATTENDS",           /* bullets[2] */
    gains: "LESS TIME, LOWER COST",                      /* bullets[3] */
    gainsCaption: "Share of placements an officer attended in person",
  }
};
