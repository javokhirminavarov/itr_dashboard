/* =========================================================================
   JOURNEY GEOMETRY — the only coordinate authority in the page.

   The corridor is authored in a PAGE SPACE of 1600 x 4800 units and rendered
   as six stacked 1600 x 800 section plates. The page maps that space to the
   viewport by width, so one page unit is (viewportWidth / 1600) CSS pixels and
   every y below is directly comparable to the art.

   The page is ten rows of 480 units, one per stage, and each stage's landmark
   in the art sits on its row's centre line (240, 720, 1200 ... 4560). The
   truck rides the road at the viewport's focus line, so whatever is beside it
   on screen is always the landmark for the stage being read.

   To install final rendered art: drop the image in as assets/plates/vertical/
   sN.jpg (any format the browser reads works — update `src` here if the
   extension changes). If the render moves the road, re-trace
   JOURNEY.route.d against it — the glow trail, the flowing chevrons, the map
   pins and the truck all derive from that one path.

   The shipped plates are rendered by tools/build_plates.py (SVG) and
   tools/rasterise.mjs (JPEG). build_plates.py prints the route path to paste
   in below. See ASSETS.md.
   ========================================================================= */
window.JOURNEY = {
  page: { w: 1600, h: 4800 },
  rows: 10,

  sections: [1, 2, 3, 4, 5, 6].map(function (n) {
    return { src: "assets/plates/vertical/s" + n + ".jpg", w: 2000, h: 1000 };
  }),

  // Traced down the offside lane: right-hand traffic coming toward the camera
  // sits left of the centre line.
  route: {
    // Road half-width at page y, matching tools/build_plates.py exactly:
    //   halfw(y) = base + span * ((y - horizon) / (pageH - horizon)) ** exp
    // The page uses it to scale the flowing chevrons and to place map pins,
    // so a re-traced route must bring these with it.
    width: { horizon: 260, base: 30, span: 150, exp: 1.25 },
    d: "M 780.2 306 Q 776.6 416 774.6 471 Q 772.6 526 770.5 581 Q 768.4 636 766.2 691 Q 764 746 761.8 801 Q 759.6 856 757.5 911 Q 755.4 966 753.4 1021 Q 751.4 1076 749.6 1131 Q 747.8 1186 746.3 1241 Q 744.8 1296 743.6 1351 Q 742.3 1406 741.5 1461 Q 740.6 1516 740.2 1571 Q 739.8 1626 740 1681 Q 740.2 1736 740.9 1791 Q 741.6 1846 742.8 1901 Q 744 1956 745.5 2011 Q 747.1 2066 748.8 2121 Q 750.6 2176 752.6 2231 Q 754.5 2286 756.6 2341 Q 758.6 2396 760.6 2451 Q 762.6 2506 764.4 2561 Q 766.3 2616 767.9 2671 Q 769.5 2726 770.9 2781 Q 772.2 2836 773.1 2891 Q 773.9 2946 774.3 3001 Q 774.7 3056 774.4 3111 Q 774.2 3166 773.3 3221 Q 772.3 3276 770.7 3331 Q 769.1 3386 766.9 3441 Q 764.8 3496 762.1 3551 Q 759.5 3606 756.5 3661 Q 753.4 3716 750.1 3771 Q 746.8 3826 743.3 3881 Q 739.8 3936 736.2 3991 Q 732.6 4046 729.1 4101 Q 725.5 4156 722 4211 Q 718.5 4266 715.2 4321 Q 711.9 4376 708.9 4431 Q 705.9 4486 703.3 4541 Q 700.7 4596 698.5 4651 Q 696.4 4706 695.3 4740.5 L 694.2 4775",
    lane: -0.48
  },

  truck: {
    // Fraction of the viewport height the truck holds while scrolling. Slightly
    // below centre so the road ahead of it stays visible.
    focus: 0.56,
    // Page y at which the consignment picks up each state.
    variants: [{ from: 0, name: "closed" }, { from: 1420, name: "scanned" }, { from: 2180, name: "sealed" }]
  },

  // Stage 1 is the 2018 "before" frame: every truck stopped, every consignment
  // opened by hand. The queue it describes is drawn as an overlay in these
  // coordinates rather than baked into a plate, so the plates stay "today" and
  // the queue can clear as the reader scrolls into the modern system.
  //
  // The gate is at y 1200 and the journey runs downward, so the queue waits
  // above it. It starts below where the consignment holds at the top of the
  // page (y ~504-560 depending on viewport) and runs toward the gate.
  queue2018: {
    from: 600, to: 1170, lane: -0.48,     // the consignment's own lane
    // pulled onto the verge and being opened — what "by hand" looked like
    verge: [{ y: 1055, side: 1, tilt: -14 }, { y: 1140, side: 1, tilt: 9 }]
  },

  // Map markers pinned to the corridor, in page coordinates.
  pins: [
    { y: 1200, side: 1,  icon: "shield", label: "Border checkpoint" },
    { y: 1402, side: -1, icon: "scan",   label: "Inspection portal" },
    { y: 1560, side: -1, icon: "cam",    label: "Customs CCTV" },
    { y: 1810, side: 1,  icon: "cam",    label: "Police camera network" },
    { y: 2160, side: 1,  icon: "box",    label: "Customs warehouse" },
    { y: 2640, side: -1, icon: "doc",    label: "Declaration processing" },
    { y: 3120, side: 1,  icon: "check",  label: "Release" },
    { y: 3600, side: -1, icon: "loop",   label: "Importer premises" },
    { y: 4080, side: 1,  icon: "plane",  label: "Passenger terminal" }
  ]
};

/* Per stage: which secondary plate (if any) this stage can cut to, the truck
   state at its row, and — stage 2 only — the per-mode overrides. Row order is
   array order; row n owns page y (n-1)*800 .. n*800.                        */
window.STAGES = [
  { n: 1,  key: "baseline",    cut: null },
  { n: 2,  key: "flows",       cut: null,
    modes: { road: { cut: null }, rail: { cut: "railTerminal" }, air: { cut: "airApron" } } },
  { n: 3,  key: "border",      cut: null },
  { n: 4,  key: "transit",     cut: null },
  { n: 5,  key: "warehouse",   cut: "warehouseInterior" },
  { n: 6,  key: "declaration", cut: "targetingCentre" },
  { n: 7,  key: "release",     cut: null },
  { n: 8,  key: "pca",         cut: "targetingCentre" },
  { n: 9,  key: "passengers",  cut: "airportArrivals" },
  { n: 10, key: "close",       cut: null }
];

/* Secondary plates — shown in the stage's cut-in panel and the targeting
   centre modal. Instantiated at load; nothing loads later.                  */
window.PLATES = {
  roadCorridor:      { src: "assets/plates/vertical/s2.jpg",        width: 2000, height: 1000 },
  railTerminal:      { src: "assets/plates/rail-terminal.svg",      width: 2560, height: 1440 },
  airApron:          { src: "assets/plates/air-apron.svg",          width: 2560, height: 1440 },
  warehouseInterior: { src: "assets/plates/warehouse-interior.svg", width: 2560, height: 1440 },
  targetingCentre:   { src: "assets/plates/targeting-centre.svg",   width: 2560, height: 1440 },
  airportArrivals:   { src: "assets/plates/airport-arrivals.svg",   width: 2560, height: 1440 }
};
