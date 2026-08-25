#!/usr/bin/env python3
"""
Generates the secondary scene plate in assets/plates/ — the warehouse interior
the "Customs and cargo operations" marker cuts to.

It is an interior, and an interior is lit by its own lights whatever the sky
outside is doing — so it keeps its own register rather than being repainted to
match the daylight corridor. What does have to agree with the corridor is
anything you can see THROUGH: a dock door standing open. That reads as a bright
day.

It shares the corridor's other rules: same grain, and no plate carries text,
numbers or UI. A schematic thumbnail beside a rendered corridor reads as an
unfinished asset.

Run:  python3 tools/build_scenes.py
The generated SVGs are committed; the page needs no build step.
"""
import math, os, random, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_plates import f, window_grid, solid, check_refs, WARM

W, H = 1600, 900
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "plates")

def defs(sky_top, sky_bot, floor_top, floor_bot, horizon):
    return (
      '<defs>'
      '<filter id="gr" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" stitchTiles="stitch"/>'
      '<feColorMatrix values="0 0 0 0 .55 0 0 0 0 .57 0 0 0 0 .54 .7 .7 .7 0 -.78"/></filter>'
      '<pattern id="p-gr" patternUnits="userSpaceOnUse" width="200" height="200">'
      '<rect width="200" height="200" filter="url(#gr)"/></pattern>'
      '<filter id="soft" x="-12%" y="-25%" width="124%" height="150%"><feGaussianBlur stdDeviation="4"/></filter>'
      '<filter id="near" x="-10%" y="-18%" width="120%" height="136%"><feGaussianBlur stdDeviation="2.2"/></filter>'
      '<filter id="bloom" x="-90%" y="-90%" width="280%" height="280%">'
      '<feGaussianBlur stdDeviation="11" result="b"/>'
      '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      '<filter id="bloom-s" x="-90%" y="-90%" width="280%" height="280%">'
      '<feGaussianBlur stdDeviation="4.5" result="b"/>'
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      '<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>'
      # aliases so primitives imported from build_plates (window_grid, lamp)
      # resolve against this file's filter set
      '<filter id="fx-bloom-s" x="-90%" y="-90%" width="280%" height="280%">'
      '<feGaussianBlur stdDeviation="4.5" result="b"/>'
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      '<filter id="fx-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>'
      '<filter id="fx-soft" x="-12%" y="-25%" width="124%" height="150%"><feGaussianBlur stdDeviation="4"/></filter>'
      '<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">'
      '<stop offset="0" stop-color="' + sky_top + '"/><stop offset="1" stop-color="' + sky_bot + '"/></linearGradient>'
      '<linearGradient id="g-floor" x1="0" y1="0" x2="0" y2="1">'
      '<stop offset="0" stop-color="' + floor_top + '"/><stop offset="1" stop-color="' + floor_bot + '"/></linearGradient>'
      '<linearGradient id="g-haze" x1="0" y1="0" x2="0" y2="1">'
      '<stop offset="0" stop-color="#33505a" stop-opacity="0.6"/>'
      '<stop offset="1" stop-color="#33505a" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vl" x1="0" y1="0" x2="1" y2="0">'
      '<stop offset="0" stop-color="#04090b" stop-opacity="0.6"/>'
      '<stop offset="1" stop-color="#04090b" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vr" x1="1" y1="0" x2="0" y2="0">'
      '<stop offset="0" stop-color="#04090b" stop-opacity="0.6"/>'
      '<stop offset="1" stop-color="#04090b" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vb" x1="0" y1="1" x2="0" y2="0">'
      '<stop offset="0" stop-color="#04090b" stop-opacity="0.72"/>'
      '<stop offset="1" stop-color="#04090b" stop-opacity="0"/></linearGradient>'
      '<radialGradient id="g-pool"><stop offset="0" stop-color="' + WARM + '" stop-opacity="0.45"/>'
      '<stop offset="0.55" stop-color="' + WARM + '" stop-opacity="0.12"/>'
      '<stop offset="1" stop-color="' + WARM + '" stop-opacity="0"/></radialGradient>'
      '<radialGradient id="g-pool-t"><stop offset="0" stop-color="#8fd8ff" stop-opacity="0.4"/>'
      '<stop offset="1" stop-color="#8fd8ff" stop-opacity="0"/></radialGradient>'
      '</defs>'
      '<rect width="1600" height="' + f(horizon) + '" fill="url(#g-sky)"/>'
      '<rect y="' + f(horizon) + '" width="1600" height="' + f(H - horizon) + '" fill="url(#g-floor)"/>'
      '<rect y="' + f(horizon - 60) + '" width="1600" height="240" fill="url(#g-haze)"/>')

def finish():
    return ('<rect width="1600" height="900" fill="url(#p-gr)" opacity="0.075"/>'
            '<rect width="420" height="900" fill="url(#g-vl)"/>'
            '<rect x="1180" width="420" height="900" fill="url(#g-vr)"/>'
            '<rect y="620" width="1600" height="280" fill="url(#g-vb)"/>')

def wrap(title, body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">'
            '<title>' + title + '</title>' + body + finish() + '</svg>')

def lamp(x, y, s, col=WARM, h=150):
    top = y - h * s
    return ('<rect x="%s" y="%s" width="%s" height="%s" fill="#1b2529"/>'
            '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" filter="url(#bloom-s)"/>'
            '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>'
            '<path d="M %s %s L %s %s L %s %s Z" fill="%s" opacity="0.08" filter="url(#glow)"/>' % (
                f(x - 3 * s), f(top), f(6 * s), f(h * s),
                f(x), f(top + 6 * s), f(9 * s), f(5 * s), col,
                f(x), f(y + 4 * s), f(90 * s), f(26 * s),
                f(x - 14 * s), f(top + 8 * s), f(96 * s), f(y + 6 * s), f(-96 * s + 2 * x - 2 * x + x * 0), f(y + 6 * s), col))

def floorlines(horizon, vpx, n=16, col="#4a5a55", op=0.16):
    """Perspective lines converging on a vanishing point — the cheapest honest
    depth cue for an interior."""
    o = []
    for i in range(n + 1):
        x = -700 + i * (3000.0 / n)
        o.append('<path d="M %s 920 L %s %s" stroke="%s" stroke-width="2" opacity="%s" fill="none"/>' % (
            f(x), f(vpx), f(horizon), col, f(op)))
    for j in range(7):
        t = (j + 1) / 8.0
        y = horizon + (920 - horizon) * (t ** 2.1)
        o.append('<path d="M 0 %s L 1600 %s" stroke="%s" stroke-width="2" opacity="%s" fill="none"/>' % (
            f(y), f(y), col, f(op * 0.7)))
    return "".join(o)

# ------------------------------------------------- warehouse interior -------
def warehouse_interior():
    HZ = 300.0
    o = [defs("#0e1518", "#1a2427", "#232a26", "#0e1312", HZ)]
    o.append('<rect width="1600" height="%s" fill="#141c1f"/>' % f(HZ))
    # roof structure receding to the back wall
    for i in range(9):
        y = 30 + i * 30
        o.append('<path d="M %s %s L %s %s" stroke="#26333a" stroke-width="%s" opacity="0.8" fill="none"/>' % (
            f(120 - i * 12), f(y), f(1480 + i * 12), f(y), f(7 - i * 0.5)))
    o.append('<rect x="330" y="%s" width="940" height="200" fill="#101a1d"/>' % f(HZ - 200))
    o.append(floorlines(HZ, 800, 12, "#5f6f68", 0.12))
    # racking down both walls
    for side in (-1, 1):
        for lvl in range(4):
            y = 300 + lvl * 96
            x = 800 + side * (520 + lvl * 30)
            o.append(solid(x - 190, y + 150, 380, 120, 46, "#1d272b", "#141c20", "#2a363b", -0.5 * side))
            for c in range(3):
                o.append('<rect x="%s" y="%s" width="86" height="62" fill="%s" opacity="0.85"/>' % (
                    f(x - 170 + c * 118), f(y + 62), ["#4a3a2c", "#2f4a4a", "#3a4038"][c]))
    # dock doors on the back wall — one standing open onto the daylight
    for i in range(3):
        dx = 540 + i * 200
        lit = i == 1
        o.append('<rect x="%s" y="%s" width="150" height="150" fill="%s"/>' % (
            f(dx), f(HZ - 150), "#e6f1f6" if lit else "#121b1f"))
        if lit:
            # daylight spilling in past the door, and the patch of it that
            # lands on the bay floor
            o.append('<rect x="%s" y="%s" width="150" height="150" fill="#ffffff" opacity="0.5" '
                     'filter="url(#glow)"/>' % (f(dx), f(HZ - 150)))
            o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#dcebf2" opacity="0.16" '
                     'filter="url(#soft)"/>' % (f(dx), f(HZ), f(dx + 150), f(HZ),
                                                f(dx + 260), f(HZ + 250), f(dx - 110), f(HZ + 250)))
        for b in range(6):
            o.append('<rect x="%s" y="%s" width="150" height="3" fill="#0b1215" opacity="0.7"/>' % (
                f(dx), f(HZ - 150 + b * 25)))
    # pallets in the bay, and the high-bay lights over them
    r = random.Random(7)
    for i in range(7):
        px, py, sw = r.uniform(420, 1150), r.uniform(470, 780), r.uniform(.7, 1.5)
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#050b0c" opacity="0.45" filter="url(#soft)"/>' % (
            f(px), f(py + 8 * sw), f(80 * sw), f(20 * sw)))
        o.append(solid(px - 55 * sw, py, 110 * sw, 66 * sw, 34 * sw,
                       r.choice(["#5a4a33", "#4a4436", "#63523a"]), "#241d14", "#6d5c42", -0.5))
    for lx in (400, 800, 1200):
        o.append('<rect x="%s" y="90" width="180" height="16" rx="6" fill="#2a373c"/>' % f(lx - 90))
        o.append('<rect x="%s" y="106" width="150" height="8" fill="#ffeec4" filter="url(#bloom)"/>' % f(lx - 75))
        o.append('<ellipse cx="%s" cy="720" rx="300" ry="120" fill="url(#g-pool)"/>' % f(lx))
    return wrap("Customs warehouse, unloading bay", "".join(o))

# ---------------------------------------------------- targeting centre ------
def main():
    scenes = [("warehouse-interior.svg", warehouse_interior)]
    for name, fn in scenes:
        svg = fn()
        check_refs(svg, name)
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(svg)
        print("%-24s %6.1f kB" % (name, len(svg) / 1024.0))

if __name__ == "__main__":
    main()
