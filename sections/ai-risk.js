/* Section 8 — a static, human-led AI risk-analysis picture. */
(function () {
  "use strict";
  var S = window.SceneCore;
  var W = 1200, H = 470;

  S.registerScreen("aiRisk", function (def, d, HOST) {
    var sec = HOST.screenShell(def, d, "sc-ai");
    var root = S.el("div", "air");
    var stage = S.el("div", "air-stage scene-stage");
    var svg = S.svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": d.headline + " " + d.oversight });
    stage.appendChild(svg);

    var positions = [{ x: 38, y: 42 }, { x: 842, y: 42 },
                     { x: 38, y: 292 }, { x: 842, y: 292 }];
    var hub = { x: 430, y: 158, w: 340, h: 150 };

    d.capabilities.forEach(function (c, i) {
      var p = positions[i], w = 320, h = 136, g = S.put(svg, "g", { "class": "air-cap" });
      var sx = p.x < hub.x ? p.x + w : p.x;
      var sy = p.y + h / 2;
      var tx = p.x < hub.x ? hub.x : hub.x + hub.w;
      S.put(svg, "path", { d: "M " + sx + " " + sy + " L " + tx + " " + (hub.y + hub.h / 2),
        "class": "air-link" });
      S.put(g, "rect", { x: p.x, y: p.y, width: w, height: h, rx: 11 });
      S.text(g, p.x + 18, p.y + 29, "air-title", c.title.toUpperCase());
      S.text(g, p.x + 18, p.y + 57, "air-action", c.action);
      S.put(g, "rect", { x: p.x + 18, y: p.y + 82, width: 86, height: 23, rx: 11, "class": "air-maturity" });
      S.text(g, p.x + 61, p.y + 98, "air-status", c.maturity, "middle");
      S.text(g, p.x + 18, p.y + 122, "air-source", "SOURCE · " + c.source);
    });

    var hg = S.put(svg, "g", { "class": "air-hub" });
    S.put(hg, "rect", { x: hub.x, y: hub.y, width: hub.w, height: hub.h, rx: 16 });
    S.text(hg, 600, 202, "air-hub-title", d.hub.title, "middle");
    S.text(hg, 600, 228, "air-hub-sub", d.hub.sub, "middle");
    S.text(hg, 600, 263, "air-officer", "AUTHORIZED OFFICER", "middle");
    S.text(hg, 600, 286, "air-decision", "MAKES THE CUSTOMS DECISION", "middle");

    root.appendChild(stage);
    root.appendChild(S.el("p", "air-oversight", d.oversight));
    sec.appendChild(HOST.fx(root, 2));
    sec.appendChild(S.srList(d.capabilities.map(function (c) {
      return c.title + " — " + c.action + " Maturity: " + c.maturity + ". Source: " + c.source + ".";
    }).concat([d.oversight]), d.headline));
    return sec;
  });
})();
