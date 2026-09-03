/* =========================================================================
   JOURNEY GEOMETRY — the only coordinate authority in the page.

   The corridor is authored in a PAGE SPACE of 1600 x 4800 units and drawn by
   the page as six stacked 1600 x 800 sections of SVG. The page maps that space
   to the viewport by width, so one page unit is (viewportWidth / 1600) CSS
   pixels and every y below is directly comparable to the art.

   The corridor is drawn as an OPERATIONS PLAN: one flat orthographic view from
   directly above, in the deck's own white/blue/grey palette. It has no horizon,
   so it has no perspective law — the road is one width from the top of the page
   to the foot of it, and so is everything standing beside it. The scale is
   about 14 page units to the metre, which makes the carriageway below a real
   7.5 m two-lane road.

   The corridor is SIX rows of 800 units — one row per section, which is why a
   landmark and its row can never drift apart. Each corridor beat's landmark
   sits on its row's centre line (400, 1200, 2000, 2800, 3600, 4400). The
   consignment rides the road at the viewport's focus line, so whatever is
   beside it on screen is always the beat being read.

   Note the deck has NINE beats but only six of them are corridor rows: the
   talk opens on two screens (WCO cooperation, the targeting centre) and closes
   on a third (passenger control), and those are not places on this road. See
   window.BEATS at the foot of the file.

   The road is GENERATED FROM route.d rather than traced against a picture of
   one, so the art and the route cannot disagree about where the carriageway is.
   Move the path and the road moves with it, along with the glow trail, the
   flowing chevrons, the consignment and everything measured in road widths.
   See ASSETS.md.
   ========================================================================= */
window.JOURNEY = {
  page: { w: 1600, h: 4800 },
  rows: 6,

  route: {
    // Half the carriageway, in page units, everywhere on the page. A plan has
    // no horizon and therefore no perspective: this replaces the old
    // horizon/base/span/exp/holdY/holdDepth law outright. Everything that has
    // to hold the corridor's scale — the chevrons, the roadside cameras, the
    // consignment, the road art itself — is measured in multiples of it.
    width: { half: 52 },
    // The centreline of the OFFSIDE LANE: right-hand traffic coming toward the
    // top of the page runs left of the road's centre. The road art is drawn
    // around this path, offset back to the middle by `lane` below.
    d: "M 803 -60 Q 791.7 196 779.8 306 Q 767.9 416 759.1 471 Q 750.3 526 745.5 581 Q 740.8 636 739.2 691 Q 737.6 746 736.1 801 Q 734.5 856 733.1 911 Q 731.6 966 730.4 1021 Q 729.1 1076 728 1131 Q 726.9 1186 726.1 1241 Q 725.4 1296 724.9 1351 Q 724.4 1406 724.4 1461 Q 724.3 1516 724.7 1571 Q 725.1 1626 726.1 1681 Q 727.1 1736 728.6 1791 Q 730.2 1846 732.2 1901 Q 734.2 1956 736.6 2011 Q 739 2066 741.7 2121 Q 744.4 2176 747.2 2231 Q 750 2286 752.9 2341 Q 755.9 2396 758.8 2451 Q 761.7 2506 764.4 2561 Q 767.2 2616 769.8 2671 Q 772.3 2726 774.6 2781 Q 776.8 2836 778.7 2891 Q 780.5 2946 781.9 3001 Q 783.2 3056 783.9 3111 Q 784.7 3166 784.7 3221 Q 784.7 3276 784.1 3331 Q 783.5 3386 782.3 3441 Q 781.1 3496 779.5 3551 Q 777.9 3606 775.9 3661 Q 773.8 3716 771.6 3771 Q 769.3 3826 766.8 3881 Q 764.3 3936 761.8 3991 Q 759.2 4046 756.7 4101 Q 754.2 4156 751.7 4211 Q 749.3 4266 747.1 4321 Q 744.8 4376 742.9 4431 Q 741 4486 739.4 4541 Q 737.9 4596 736.8 4651 Q 735.7 4706 735.4 4740.5 L 735 4775",
    // Where that lane sits, as a fraction of the half-width, measured from the
    // road's centre. The art derives the centreline by undoing it.
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

  // Captions over the two facilities the talk names out loud. They are HTML
  // overlays positioned in these page coordinates, never text drawn into the
  // art: the art stays wordless (see ASSETS.md), the type stays crisp at any
  // viewport width, and the caption follows the page's own theme.
  //
  // In a plan there is no roofline to sit on, so the anchor is the CENTRE OF
  // THE FOOTPRINT — the caption reads as the label on a drawing rather than as
  // a tag floating over a building. Move a footprint in app.js and move these.
  labels: [
    { y: 1164, x: 1000, text: "Border checkpoint" },
    { y: 2800, x: 1030, text: "Customs warehouse" }
  ],

  // Roadside cameras on the transit passage, in page coordinates. `side` is
  // which shoulder each stands on (-1 left, +1 right); the glyph and its
  // stand-off are multiples of the road half-width, so they are stated in the
  // corridor's own units rather than in pixels. Seen from above a camera is a
  // pad, an arm over the shoulder and a cone of view across the carriageway —
  // which is more legible in plan than the mast it used to be in elevation.
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

/* The eight sections the presenter speaks. These drive the header nav, the
   1-8 keys and the overview grid.                                            */
window.SECTIONS = [
  { n: 1, key: "cooperation", short: "Cooperation" },
  { n: 2, key: "targeting",   short: "Targeting centre" },
  { n: 3, key: "border",      short: "Border" },
  { n: 4, key: "warehouse",   short: "Warehouse" },
  { n: 5, key: "declaration", short: "Declaration" },
  { n: 6, key: "audit",       short: "Audit" },
  { n: 7, key: "passengers",  short: "Passengers" },
  { n: 8, key: "aiRisk",      short: "AI risk analysis" }
];

/* The ten beats the reader actually scrolls through.

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
  { key: "passengers",   section: 7, kind: "screen" },
  { key: "aiRisk",       section: 8, kind: "screen" }
];

/* Secondary scene — shown in the warehouse marker's modal. Instantiated at
   load; nothing loads later.                                                  */
window.PLATES = {
  warehouseInterior: { src: "assets/plates/warehouse-floor.svg", width: 1600, height: 900 }
};
