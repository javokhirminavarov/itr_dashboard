/* =========================================================================
   JOURNEY GEOMETRY — the only coordinate authority in the page.

   The corridor is authored in a PAGE SPACE of 1600 x 4800 units and rendered
   as six stacked 1600 x 800 section plates. The page maps that space to the
   viewport by width, so one page unit is (viewportWidth / 1600) CSS pixels and
   every y below is directly comparable to the art.

   The corridor is SIX rows of 800 units — one row per section plate, which is
   why a landmark and its plate can never drift apart. Each corridor beat's
   landmark sits on its row's centre line (400, 1200, 2000, 2800, 3600, 4400).
   The truck rides the road at the viewport's focus line, so whatever is beside
   it on screen is always the beat being read.

   Note the deck has NINE beats but only six of them are corridor rows: the
   talk opens on two screens (WCO cooperation, the targeting centre) and closes
   on a third (passenger control), and those are not places on this road. See
   window.BEATS at the foot of the file.

   To install final rendered art: drop the image in as assets/plates/vertical/
   sN.jpg (any format the browser reads works — update `src` here if the
   extension changes). If the render moves the road, re-trace JOURNEY.route.d
   against it — the glow trail, the flowing chevrons, the map pins, the
   building captions and the truck all derive from that one path.

   The shipped plates are rendered by tools/build_plates.py (SVG) and
   tools/rasterise.mjs (JPEG). build_plates.py prints the route path to paste
   in below. See ASSETS.md.
   ========================================================================= */
window.JOURNEY = {
  page: { w: 1600, h: 4800 },
  rows: 6,

  sections: [1, 2, 3, 4, 5, 6].map(function (n) {
    return { src: "assets/plates/vertical/s" + n + ".jpg", w: 2000, h: 1000 };
  }),

  // Traced down the offside lane: right-hand traffic coming toward the camera
  // sits left of the centre line.
  route: {
    // Road half-width at page y, matching tools/build_plates.py exactly:
    //   halfw(y) = base + span * ((y - horizon) / (pageH - horizon)) ** exp
    // The page uses it to scale the flowing chevrons, so a re-traced route must
    // bring these with it.
    width: { horizon: 260, base: 30, span: 150, exp: 1.25 },
    d: "M 780.2 306 Q 776.6 416 774.6 471 Q 772.6 526 770.5 581 Q 768.4 636 766.2 691 Q 764 746 761.8 801 Q 759.6 856 757.5 911 Q 755.4 966 753.4 1021 Q 751.4 1076 749.6 1131 Q 747.8 1186 746.3 1241 Q 744.8 1296 743.6 1351 Q 742.3 1406 741.5 1461 Q 740.6 1516 740.2 1571 Q 739.8 1626 740 1681 Q 740.2 1736 740.9 1791 Q 741.6 1846 742.8 1901 Q 744 1956 745.5 2011 Q 747.1 2066 748.8 2121 Q 750.6 2176 752.6 2231 Q 754.5 2286 756.6 2341 Q 758.6 2396 760.6 2451 Q 762.6 2506 764.4 2561 Q 766.3 2616 767.9 2671 Q 769.5 2726 770.9 2781 Q 772.2 2836 773.1 2891 Q 773.9 2946 774.3 3001 Q 774.7 3056 774.4 3111 Q 774.2 3166 773.3 3221 Q 772.3 3276 770.7 3331 Q 769.1 3386 766.9 3441 Q 764.8 3496 762.1 3551 Q 759.5 3606 756.5 3661 Q 753.4 3716 750.1 3771 Q 746.8 3826 743.3 3881 Q 739.8 3936 736.2 3991 Q 732.6 4046 729.1 4101 Q 725.5 4156 722 4211 Q 718.5 4266 715.2 4321 Q 711.9 4376 708.9 4431 Q 705.9 4486 703.3 4541 Q 700.7 4596 698.5 4651 Q 696.4 4706 695.3 4740.5 L 694.2 4775",
    lane: -0.48
  },

  truck: {
    // Fraction of the viewport height the truck holds while scrolling. Slightly
    // below centre so the road ahead of it stays visible.
    focus: 0.56,
    // Page y at which the consignment picks up each state. `scanned` is the
    // inspection portal just past the gate; `sealed` is the GPS electronic seal
    // fitted at the transit gantry, which is what the row-3 copy describes.
    variants: [{ from: 0, name: "closed" }, { from: 1560, name: "scanned" }, { from: 2080, name: "sealed" }]
  },

  // The first corridor beat is the 2018 "before" frame: every truck stopped,
  // every consignment opened by hand. The queue it describes is drawn as an
  // overlay in these coordinates rather than baked into a plate, so the plates
  // stay "today" and the queue can clear as the reader scrolls into the modern
  // system.
  //
  // The gate is at y 1200 and the journey runs downward, so the queue waits
  // above it. It starts below where the consignment holds at the top of the
  // page (y ~504-560 depending on viewport) and runs toward the gate.
  queue2018: {
    from: 600, to: 1170, lane: -0.48,     // the consignment's own lane
    // pulled onto the verge and being opened — what "by hand" looked like
    verge: [{ y: 1055, side: 1, tilt: -14 }, { y: 1140, side: 1, tilt: 9 }]
  },

  // Captions over the two buildings the talk names out loud. They are HTML
  // overlays positioned in these page coordinates, not text baked into a
  // plate: the plates stay wordless (see ASSETS.md), the type stays crisp at
  // any viewport width, and the caption follows the page's own theme.
  //
  // y is the highest point of the roof; the caption sits above it.
  labels: [
    { y: 838,  x: 745,  text: "Border checkpoint" },
    { y: 2470, x: 1230, text: "Customs warehouse" }
  ],

  // Map markers pinned to the corridor, in page coordinates. A marker with a
  // `modal` is a control the presenter can open mid-talk; one without is a
  // label on the scene.
  pins: [
    { y: 1300, x: 545,  icon: "screen", label: "Targeting centre at the border", modal: "tcBorder" },
    { y: 1300, x: 965,  icon: "doc",    label: "E-Transit information system",   modal: "eTransit" },
    { y: 1610, x: 560,  icon: "scan",   label: "Inspection portal" },
    { y: 2100, x: 1010, icon: "cam",    label: "Transit monitoring" },
    { y: 2960, x: 1000, icon: "box",    label: "Customs and cargo operations",   modal: "ccoIS" },
    { y: 3620, x: 1160, icon: "doc",    label: "Declaration processing" },
    { y: 4330, x: 1190, icon: "loop",   label: "Importer's premises" }
  ]
};

/* The seven sections the presenter speaks. These drive the header nav, the
   1-7 keys and the overview grid.                                            */
window.SECTIONS = [
  { n: 1, key: "cooperation", short: "Cooperation" },
  { n: 2, key: "targeting",   short: "Targeting centre" },
  { n: 3, key: "border",      short: "Border" },
  { n: 4, key: "warehouse",   short: "Warehouse" },
  { n: 5, key: "declaration", short: "Declaration" },
  { n: 6, key: "audit",       short: "Audit" },
  { n: 7, key: "passengers",  short: "Passengers" }
];

/* The nine beats the reader actually scrolls through.

   A beat is one screenful of argument; a section is one item on the running
   order. They are not the same count, and forcing them to be would cost the
   page either the 2018 before-frame (section 3 needs the baseline AND the
   arrival at the gate) or the inland-transit passage (which belongs to no
   section — it is the move from one to the next).

   `kind: "corridor"` beats own row `row` of the six-row page above.
   `kind: "screen"` beats are full-viewport panels and hold no corridor
   coordinates. `cut` names a secondary plate in PLATES below.                */
window.BEATS = [
  { key: "cooperation",  section: 1, kind: "screen" },
  { key: "targeting",    section: 2, kind: "screen",   cut: "targetingCentre" },
  { key: "baseline2018", section: 3, kind: "corridor", row: 1 },
  { key: "border",       section: 3, kind: "corridor", row: 2 },
  { key: "transit",      section: 3, kind: "corridor", row: 3, transition: [3, 4] },
  { key: "warehouse",    section: 4, kind: "corridor", row: 4 },
  { key: "declaration",  section: 5, kind: "corridor", row: 5 },
  { key: "audit",        section: 6, kind: "corridor", row: 6 },
  { key: "passengers",   section: 7, kind: "screen",   cut: "airportArrivals" }
];

/* Secondary plates — shown in a beat's cut-in panel and in the modals.
   Instantiated at load; nothing loads later.                                 */
window.PLATES = {
  warehouseInterior: { src: "assets/plates/warehouse-interior.svg", width: 2560, height: 1440 },
  targetingCentre:   { src: "assets/plates/targeting-centre.svg",   width: 2560, height: 1440 },
  airportArrivals:   { src: "assets/plates/airport-arrivals.svg",   width: 2560, height: 1440 }
};
