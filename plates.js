/* =========================================================================
   PLATES + STAGES — the only coordinate authority in the page.
   - Final rendered art replaces a plate by swapping `src` (and matching
     `width`/`height`, or updating them here in the same commit).
   - The route path `d` and all camera rects are expressed in MASTER PLATE
     PIXELS (7680×2160). Layout code holds no plate coordinates.
   - Truck anchors are arc-length fractions (0..1) along the route path.
   See ASSETS.md for the art request and drop-in rules.
   ========================================================================= */
window.PLATES = {
  master: {
    src: "assets/plates/master-corridor.svg", width: 7680, height: 2160,
    route: {
      d: "M 340 1340 C 1000 1338, 1600 1334, 2400 1330 C 3100 1326, 3500 1322, 4200 1318 C 4900 1312, 5400 1304, 6000 1294 C 6600 1282, 7050 1262, 7420 1245",
      anchors: {
        approach:    0.040,
        gate:        0.105,
        gateCleared: 0.172,
        transit:     0.350,
        warehouse:   0.530,
        declaration: 0.740,
        exit:        0.940,
        final:       0.970
      }
    }
  },
  railTerminal:      { src: "assets/plates/rail-terminal.svg",      width: 2560, height: 1440 },
  airApron:          { src: "assets/plates/air-apron.svg",          width: 2560, height: 1440 },
  warehouseInterior: { src: "assets/plates/warehouse-interior.svg", width: 2560, height: 1440 },
  targetingCentre:   { src: "assets/plates/targeting-centre.svg",   width: 2560, height: 1440 },
  airportArrivals:   { src: "assets/plates/airport-arrivals.svg",   width: 2560, height: 1440 }
};

/* Per stage:
   - camera: master-plate rect {x, y, w} (16:9 window, h = w * 1080/1920),
     or {fit:"contain"} for the full-corridor pull-back.
   - cut: secondary plate id shown over the corridor (camera still holds the
     master position behind it, so returning to the corridor stays seamless).
   - truck: route anchor name; variant: sprite state at that stage.       */
window.STAGES = [
  { n: 1,  key: "baseline",    cut: null,                camera: { x: 0,    y: 0,   w: 3840 }, truck: "approach",    variant: "closed"  },
  { n: 2,  key: "flows",       cut: null,                camera: { x: 150,  y: 124, w: 3400 }, truck: "gate",        variant: "closed",
    modes: { road: { cut: null }, rail: { cut: "railTerminal" }, air: { cut: "airApron" } } },
  { n: 3,  key: "border",      cut: null,                camera: { x: 120,  y: 420, w: 2400 }, truck: "gateCleared", variant: "scanned" },
  { n: 4,  key: "transit",     cut: null,                camera: { x: 1500, y: 330, w: 2900 }, truck: "transit",     variant: "scanned" },
  { n: 5,  key: "warehouse",   cut: "warehouseInterior", camera: { x: 2950, y: 380, w: 2900 }, truck: "warehouse",   variant: "sealed"  },
  { n: 6,  key: "declaration", cut: "targetingCentre",   camera: { x: 4420, y: 330, w: 2900 }, truck: "declaration", variant: "sealed"  },
  { n: 7,  key: "release",     cut: null,                camera: { x: 4680, y: 300, w: 3000 }, truck: "exit",        variant: "sealed"  },
  { n: 8,  key: "pca",         cut: "targetingCentre",   camera: { x: 4680, y: 300, w: 3000 }, truck: "exit",        variant: "sealed"  },
  { n: 9,  key: "passengers",  cut: "airportArrivals",   camera: { x: 4680, y: 300, w: 3000 }, truck: "exit",        variant: "sealed"  },
  { n: 10, key: "close",       cut: null,                camera: { fit: "contain" },           truck: "final",       variant: "sealed"  }
];
