#!/usr/bin/env python3
"""
Generates the secondary scene plates in assets/plates/ — the images the stage
cards cut to (rail terminal, air apron, warehouse interior, targeting centre,
airport arrivals).

They share the corridor's register deliberately: same dusk palette, same bloom
and grain, same rule that a plate carries no text, no numbers and no UI. A
schematic thumbnail beside a rendered corridor reads as an unfinished asset.

The targeting centre is the one scene with a hard content rule: its screens are
BLANK GLOWS. Nothing on a wall in that room may be legible.

Run:  python3 tools/build_scenes.py
The generated SVGs are committed; the page needs no build step.
"""
import math, os, random, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_plates import mix, shade, rgb, f, window_grid, solid, check_refs, TEAL, WARM

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
      '<radialGradient id="g-pool-t"><stop offset="0" stop-color="#7fe6d6" stop-opacity="0.4"/>'
      '<stop offset="1" stop-color="#7fe6d6" stop-opacity="0"/></radialGradient>'
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

# --------------------------------------------------------- rail terminal ----
def rail_terminal():
    HZ = 380.0
    o = [defs("#080f18", "#28464b", "#1b2422", "#0c1211", HZ)]
    r = random.Random(3)
    # distant yard buildings and mast lights
    for i in range(9):
        bx, bw, bh = r.uniform(-40, 1520), r.uniform(90, 220), r.uniform(50, 130)
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.9"/>' % (
            f(bx), f(HZ - bh), f(bw), f(bh), mix("#16242c", "#2c464e", r.uniform(.1, .5))))
    o.append('<g filter="url(#soft)"><rect y="%s" width="1600" height="10" fill="#3b5a5e" opacity="0.4"/></g>' % f(HZ - 4))
    # tracks running to the vanishing point
    o.append(floorlines(HZ, 830, 14, "#5b6b66", 0.13))
    for i in range(5):
        x0 = 120 + i * 330
        o.append('<path d="M %s 920 L %s %s" stroke="#6d7d78" stroke-width="4" opacity="0.35" fill="none"/>' % (
            f(x0), f(830 - (830 - x0) * 0.06), f(HZ + 6)))
        o.append('<path d="M %s 920 L %s %s" stroke="#6d7d78" stroke-width="4" opacity="0.35" fill="none"/>' % (
            f(x0 + 62), f(830 - (830 - x0 - 62) * 0.06), f(HZ + 6)))
    # gantry crane spanning the yard
    o.append('<rect x="120" y="150" width="1360" height="26" fill="#2b3a40"/>')
    o.append('<rect x="120" y="176" width="1360" height="9" fill="#141d21"/>')
    for lx in (170, 640, 1080, 1430):
        o.append('<rect x="%s" y="185" width="26" height="430" fill="#243239"/>' % f(lx))
        o.append('<rect x="%s" y="600" width="54" height="22" fill="#1a2429"/>' % f(lx - 14))
    o.append('<rect x="700" y="176" width="150" height="70" rx="8" fill="#2f4149"/>')
    o.append('<rect x="716" y="192" width="118" height="34" fill="#9fe8dc" opacity="0.35" filter="url(#bloom-s)"/>')
    o.append('<path d="M 775 246 L 775 340 M 745 340 h 60" stroke="#3a4a50" stroke-width="7" fill="none"/>')
    # wagons + container stacks
    r2 = random.Random(19)
    cols = ["#2f4a4a", "#4a3a2c", "#33403a", "#3d3346", "#2b3d4c"]
    for i in range(4):
        y = 470 + i * 92
        sw = 0.55 + i * 0.16
        for j in range(6):
            bx = 60 + j * (250 * sw) + r2.uniform(-14, 14)
            o.append(solid(bx, y + 60 * sw, 210 * sw, 74 * sw, 26 * sw,
                           r2.choice(cols), "#141c1f", "#2b3940", -0.5))
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#0d1416" opacity="0.45"/>' % (
                f(bx), f(y + 60 * sw - 74 * sw), f(210 * sw), f(5 * sw)))
        o.append('<rect x="0" y="%s" width="1600" height="%s" fill="#0a1012" opacity="0.5" filter="url(#soft)"/>' % (
            f(y + 62 * sw), f(12 * sw)))
    for lx in (250, 800, 1350):
        o.append(lamp(lx, 470, 1.0, WARM, 320))
    o.append('<rect y="%s" width="1600" height="120" fill="#050b0d" opacity="0.35" filter="url(#near)"/>' % f(H - 120))
    return wrap("Rail terminal", "".join(o))

# ------------------------------------------------------------- air apron ----
def air_apron():
    HZ = 400.0
    o = [defs("#070e17", "#2a4750", "#20262a", "#0d1215", HZ)]
    r = random.Random(11)
    o.append('<g filter="url(#soft)"><rect y="%s" width="1600" height="12" fill="#3b5a5e" opacity="0.45"/></g>' % f(HZ - 6))
    for i in range(7):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (
            f(r.uniform(-40, 1500)), f(HZ - r.uniform(30, 90)), f(r.uniform(120, 280)),
            f(90), mix("#16242c", "#2b444c", r.uniform(.1, .5))))
    # apron markings
    o.append(floorlines(HZ, 800, 10, "#c9cfae", 0.09))
    for i in range(3):
        o.append('<path d="M %s 900 L %s %s" stroke="#c9cfae" stroke-width="9" opacity="0.14" '
                 'stroke-dasharray="42 34" fill="none"/>' % (f(300 + i * 500), f(760 + i * 40), f(HZ + 20)))
    # freighter, three-quarter from behind, nose gear off to the left
    o.append('<ellipse cx="820" cy="690" rx="520" ry="52" fill="#04090b" opacity="0.5" filter="url(#soft)"/>')
    o.append('<path d="M 300 520 L 1180 520 q 120 0 120 62 q 0 62 -120 62 L 300 644 q -80 -62 0 -124 Z" fill="#c6cfcd"/>')
    o.append('<path d="M 300 528 L 1180 528 q 100 0 100 54 L 300 582 Z" fill="#e2e8e6" opacity="0.55"/>')
    o.append('<path d="M 1120 520 L 1330 300 L 1400 300 L 1250 520 Z" fill="#aab5b3"/>')
    o.append('<path d="M 1155 520 L 1300 318 L 1330 318 L 1215 520 Z" fill="#8fa4b4" opacity="0.55"/>')
    o.append('<path d="M 700 560 L 470 760 L 590 762 L 830 590 Z" fill="#b3bdbb"/>')
    o.append('<path d="M 700 566 L 980 700 L 900 704 L 660 596 Z" fill="#9aa5a3" opacity="0.8"/>')
    for ex, ey in ((640, 640), (900, 636)):
        o.append('<ellipse cx="%s" cy="%s" rx="46" ry="34" fill="#4a5a5e"/>' % (f(ex), f(ey)))
        o.append('<ellipse cx="%s" cy="%s" rx="30" ry="22" fill="#101a1e"/>' % (f(ex), f(ey)))
    for i in range(11):     # cabin windows
        o.append('<rect x="%s" y="546" width="12" height="9" rx="2" fill="#ffe6b8" opacity="0.7"/>' % f(340 + i * 70))
    o.append('<circle cx="292" cy="560" r="7" fill="#ff5f4d" filter="url(#bloom-s)"/>')
    o.append('<circle cx="1392" cy="308" r="7" fill="#ffffff" filter="url(#bloom-s)"/>')
    # ULD trains and a loader
    r3 = random.Random(31)
    for i in range(6):
        bx = 180 + i * 150
        o.append(solid(bx, 810, 118, 66, 30, r3.choice(["#4a5c60", "#3d4c50", "#55666a"]), "#1a2428", "#5f7074", -0.5))
    o.append(solid(1180, 800, 190, 96, 44, "#2c3a3e", "#1a2428", "#3b4a4e", -0.5))
    o.append('<rect x="1196" y="716" width="120" height="10" fill="#4d5f63"/>')
    o.append('<circle cx="1200" cy="712" r="6" fill="#ffb24a" filter="url(#bloom-s)"/>')
    for lx in (140, 780, 1420):
        o.append(lamp(lx, 470, 1.05, "#dfe9f2", 360))
    return wrap("Air cargo apron", "".join(o))

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
    # dock doors on the back wall — one open onto the night
    for i in range(3):
        dx = 540 + i * 200
        lit = i == 1
        o.append('<rect x="%s" y="%s" width="150" height="150" fill="%s"/>' % (
            f(dx), f(HZ - 150), "#2b4048" if lit else "#121b1f"))
        if lit:
            o.append('<rect x="%s" y="%s" width="150" height="150" fill="#7fd4c4" opacity="0.16" '
                     'filter="url(#glow)"/>' % (f(dx), f(HZ - 150)))
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
def targeting_centre():
    HZ = 300.0
    o = [defs("#0a1114", "#121b1f", "#161d20", "#0a0f11", HZ)]
    o.append('<rect width="1600" height="%s" fill="#0d1417"/>' % f(HZ))
    # video wall: BLANK GLOWS ONLY — nothing legible may appear in this room
    for i in range(4):
        for j in range(2):
            x, y = 360 + i * 226, 60 + j * 116
            o.append('<rect x="%s" y="%s" width="206" height="98" rx="5" fill="#0e1b21"/>' % (f(x), f(y)))
            o.append('<rect x="%s" y="%s" width="196" height="88" rx="4" fill="%s" opacity="%s"/>' % (
                f(x + 5), f(y + 5), ["#1a4c52", "#1d444f", "#174148", "#1f4f4d"][(i + j) % 4], f(0.55 + 0.1 * ((i + j) % 3))))
            o.append('<rect x="%s" y="%s" width="196" height="88" rx="4" fill="#7fe6d6" opacity="0.1" '
                     'filter="url(#glow)"/>' % (f(x + 5), f(y + 5)))
    o.append('<rect x="330" y="292" width="940" height="8" fill="#0a1114"/>')
    o.append('<ellipse cx="800" cy="330" rx="620" ry="120" fill="#7fe6d6" opacity="0.07" filter="url(#glow)"/>')
    o.append(floorlines(HZ, 800, 12, "#5a6a70", 0.1))
    # desk rows, each with its own screen glow and an operator silhouette
    r = random.Random(23)
    for row in range(3):
        y = 420 + row * 155
        sw = 0.8 + row * 0.34
        for i in range(3):
            dx = 800 + (i - 1) * 420 * sw + r.uniform(-10, 10)
            o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#04090b" opacity="0.5" '
                     'filter="url(#soft)"/>' % (f(dx), f(y + 60 * sw), f(150 * sw), f(26 * sw)))
            o.append(solid(dx - 110 * sw, y + 56 * sw, 220 * sw, 40 * sw, 26 * sw, "#182126", "#111a1e", "#222d33", -0.5))
            for k in (-1, 1):
                o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#0f1c22"/>' % (
                    f(dx + k * 52 * sw - 44 * sw), f(y - 6 * sw), f(88 * sw), f(56 * sw), f(4 * sw)))
                o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#256169" opacity="0.8"/>' % (
                    f(dx + k * 52 * sw - 38 * sw), f(y), f(76 * sw), f(44 * sw), f(3 * sw)))
                o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#7fe6d6" opacity="0.13" '
                         'filter="url(#glow)"/>' % (f(dx + k * 52 * sw - 38 * sw), f(y), f(76 * sw), f(44 * sw)))
            # operator, backlit by their own screens
            o.append('<path d="M %s %s q %s %s %s 0 Z" fill="#0a1114"/>' % (
                f(dx - 52 * sw), f(y + 64 * sw), f(52 * sw), f(-64 * sw), f(104 * sw)))
            o.append('<circle cx="%s" cy="%s" r="%s" fill="#0a1114"/>' % (f(dx), f(y + 6 * sw), f(25 * sw)))
            o.append('<path d="M %s %s a %s %s 0 0 1 %s 0" fill="none" stroke="#5fb7ae" '
                     'stroke-width="%s" opacity="0.4"/>' % (
                         f(dx - 25 * sw), f(y + 6 * sw), f(25 * sw), f(25 * sw), f(50 * sw), f(3 * sw)))
    # the wall throwing light back off the polished floor
    o.append('<rect x="330" y="308" width="940" height="150" fill="#7fe6d6" opacity="0.05" filter="url(#glow)"/>')
    o.append('<rect y="700" width="1600" height="200" fill="#050b0d" opacity="0.4" filter="url(#near)"/>')
    return wrap("National targeting centre", "".join(o))

# ---------------------------------------------------- airport arrivals ------
def airport_arrivals():
    HZ = 320.0
    o = [defs("#0b1216", "#18242a", "#1e2529", "#0d1214", HZ)]
    o.append('<rect width="1600" height="%s" fill="#111a1f"/>' % f(HZ))
    for i in range(10):     # ceiling coffers
        o.append('<rect x="%s" y="%s" width="%s" height="14" rx="6" fill="#1d282e"/>' % (
            f(90 + i * 150 - i * 4), f(40 + i * 6), f(120)))
    o.append('<rect x="180" y="34" width="1240" height="9" fill="#ffeec4" opacity="0.75" filter="url(#bloom)"/>')
    o.append('<rect x="330" y="%s" width="940" height="180" fill="#16222a"/>' % f(HZ - 180))
    o.append(window_grid(350, HZ - 170, 900, 150, 12, 2, 5, "#8fd4e6", 0.35))
    o.append(floorlines(HZ, 800, 14, "#6b7b76", 0.11))
    # control booths across the hall, lanes between them
    for i in range(5):
        bx = 250 + i * 270
        o.append('<ellipse cx="%s" cy="640" rx="120" ry="26" fill="#04090b" opacity="0.5" filter="url(#soft)"/>' % f(bx + 60))
        o.append(solid(bx, 640, 150, 120, 60, "#1b262c", "#131c21", "#26333a", -0.5))
        o.append('<rect x="%s" y="486" width="126" height="44" rx="4" fill="#0f1c22"/>' % f(bx + 12))
        o.append('<rect x="%s" y="492" width="114" height="32" rx="3" fill="#2f7f86" opacity="0.85"/>' % f(bx + 18))
        o.append('<rect x="%s" y="492" width="114" height="32" fill="#7fe6d6" opacity="0.14" '
                 'filter="url(#glow)"/>' % f(bx + 18))
        o.append('<rect x="%s" y="430" width="10" height="60" fill="#243036"/>' % f(bx + 70))
        o.append('<ellipse cx="%s" cy="700" rx="150" ry="46" fill="url(#g-pool-t)"/>' % f(bx + 75))
    # lane barriers running toward the viewer
    for i in range(6):
        x0 = 190 + i * 250
        o.append('<path d="M %s 900 L %s 660" stroke="#3c4a50" stroke-width="7" opacity="0.55" fill="none"/>' % (
            f(x0), f(x0 + (800 - x0) * 0.28)))
    return wrap("Airport arrivals hall", "".join(o))

def main():
    scenes = [("rail-terminal.svg", rail_terminal), ("air-apron.svg", air_apron),
              ("warehouse-interior.svg", warehouse_interior), ("targeting-centre.svg", targeting_centre),
              ("airport-arrivals.svg", airport_arrivals)]
    for name, fn in scenes:
        svg = fn()
        check_refs(svg, name)
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(svg)
        print("%-24s %6.1f kB" % (name, len(svg) / 1024.0))

if __name__ == "__main__":
    main()
