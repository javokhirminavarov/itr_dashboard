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
    return { src: "assets/plates/vertical/s" + n + ".jpg", w: 3000, h: 1500 };
  }),

  // Traced down the offside lane: right-hand traffic coming toward the camera
  // sits left of the centre line.
  route: {
    // Road half-width at page y, matching tools/build_plates.py exactly:
    //   t        = clamp((y - horizon) / (holdY - horizon), 0, 1)
    //   depth(y) = holdDepth * t * t * (3 - 2t)
    //   halfw(y) = base + span * depth(y) ** exp
    // The corridor opens out over the first `holdY` units and then HOLDS that
    // scale to the foot of the page: a perspective carried all the way down
    // grows everything six-fold between the border and the city, which on a
    // scrolled page reads as a zoom rather than as travel. The page uses this
    // for the flowing chevrons and for the consignment's own size, so a
    // re-traced route must bring these with it.
    width: { horizon: 260, base: 30, span: 150, exp: 1.25, holdY: 620, holdDepth: 0.506608 },
    d: "M 779.8 306 Q 767.9 416 759.1 471 Q 750.3 526 745.5 581 Q 740.8 636 739.2 691 Q 737.6 746 736.1 801 Q 734.5 856 733.1 911 Q 731.6 966 730.4 1021 Q 729.1 1076 728 1131 Q 726.9 1186 726.1 1241 Q 725.4 1296 724.9 1351 Q 724.4 1406 724.4 1461 Q 724.3 1516 724.7 1571 Q 725.1 1626 726.1 1681 Q 727.1 1736 728.6 1791 Q 730.2 1846 732.2 1901 Q 734.2 1956 736.6 2011 Q 739 2066 741.7 2121 Q 744.4 2176 747.2 2231 Q 750 2286 752.9 2341 Q 755.9 2396 758.8 2451 Q 761.7 2506 764.4 2561 Q 767.2 2616 769.8 2671 Q 772.3 2726 774.6 2781 Q 776.8 2836 778.7 2891 Q 780.5 2946 781.9 3001 Q 783.2 3056 783.9 3111 Q 784.7 3166 784.7 3221 Q 784.7 3276 784.1 3331 Q 783.5 3386 782.3 3441 Q 781.1 3496 779.5 3551 Q 777.9 3606 775.9 3661 Q 773.8 3716 771.6 3771 Q 769.3 3826 766.8 3881 Q 764.3 3936 761.8 3991 Q 759.2 4046 756.7 4101 Q 754.2 4156 751.7 4211 Q 749.3 4266 747.1 4321 Q 744.8 4376 742.9 4431 Q 741 4486 739.4 4541 Q 737.9 4596 736.8 4651 Q 735.7 4706 735.4 4740.5 L 735 4775",
    lane: -0.48
  },

  truck: {
    // Fraction of the viewport height the truck holds while scrolling. Slightly
    // below centre so the road ahead of it stays visible.
    focus: 0.56,
    // The consignment is delivered at the importer's premises (y 4304) and the
    // corridor below row 6 is only the run-out to the foot of the page. It
    // fades away over this stretch rather than driving on: the journey the deck
    // describes is over by then, and the road runs out under it either way —
    // held at the last point of the route, the consignment used to sit at the
    // bottom of the page turned across the carriageway.
    exit: { from: 4440, to: 4700 },
    // Page y at which the consignment picks up each state. `scanned` is the
    // inspection portal just past the gate; `sealed` is the GPS electronic seal
    // fitted at the transit gantry, which is what the row-3 copy describes.
    variants: [{ from: 0, name: "closed" }, { from: 1560, name: "scanned" }, { from: 2080, name: "sealed" }]
  },

  // Captions over the two buildings the talk names out loud. They are HTML
  // overlays positioned in these page coordinates, not text baked into a
  // plate: the plates stay wordless (see ASSETS.md), the type stays crisp at
  // any viewport width, and the caption follows the page's own theme.
  //
  // The anchor is the middle of the building's own roofline — x is the centre
  // of the roof as drawn (the warehouse's roof face is skewed back and to the
  // left of its front wall, so that is not the centre of the footprint), and y
  // is its top edge. The caption is centred on that point, so it reads as a
  // sign on the building rather than as a tag floating in the sky above it.
  labels: [
    { y: 848,  x: 772,  text: "Border checkpoint" },
    { y: 2552, x: 1199, text: "Customs warehouse" }
  ],

  // Roadside cameras on the transit passage, in page coordinates. They used to
  // be baked into the plates as 3.4-road-width masts, which at viewport scale
  // read as gantries rather than as cameras. Drawn by the page instead: a
  // camera is small, and small art has to stay vector to stay legible. `side`
  // is which shoulder it stands on (-1 left, +1 right); the mast height and the
  // stand-off from the centreline are multiples of the road half-width at that
  // y, so they hold the corridor's own perspective.
  cameras: [
    { y: 1820, side: -1 },
    { y: 2210, side: 1 }
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
   coordinates.                                                               */
window.BEATS = [
  { key: "cooperation",  section: 1, kind: "screen" },
  { key: "targeting",    section: 2, kind: "screen" },
  { key: "baseline2018", section: 3, kind: "corridor", row: 1 },
  { key: "border",       section: 3, kind: "corridor", row: 2 },
  { key: "transit",      section: 3, kind: "corridor", row: 3, transition: [3, 4] },
  { key: "warehouse",    section: 4, kind: "corridor", row: 4 },
  { key: "declaration",  section: 5, kind: "corridor", row: 5 },
  { key: "audit",        section: 6, kind: "corridor", row: 6 },
  { key: "passengers",   section: 7, kind: "screen" }
];

/* Secondary plates — shown in the markers' modals. Instantiated at load;
   nothing loads later.                                                       */
window.PLATES = {
  warehouseInterior: { src: "assets/plates/warehouse-interior.svg", width: 2560, height: 1440 }
};
