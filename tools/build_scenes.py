#!/usr/bin/env python3
"""
Generates the secondary scene plates in assets/plates/ — the images the section
cards cut to (warehouse interior, targeting centre, airport arrivals).

All three are interiors, and an interior is lit by its own lights whatever the
sky outside is doing — so they keep their own register rather than being
repainted to match the daylight corridor. What does have to agree with the
corridor is anything you can see THROUGH: a dock door standing open, the
glazing along an arrivals hall. Those read as a bright day.

They share the corridor's other rules: same grain, and no plate carries text,
numbers or UI. A schematic thumbnail beside a rendered corridor reads as an
unfinished asset.

The targeting centre is the one scene with a hard content rule: its screens are
BLANK GLOWS. Nothing on a wall in that room may be legible.

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
            o.append('<rect x="%s" y="%s" width="196" height="88" rx="4" fill="#8fd8ff" opacity="0.1" '
                     'filter="url(#glow)"/>' % (f(x + 5), f(y + 5)))
    o.append('<rect x="330" y="292" width="940" height="8" fill="#0a1114"/>')
    o.append('<ellipse cx="800" cy="330" rx="620" ry="120" fill="#8fd8ff" opacity="0.07" filter="url(#glow)"/>')
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
                o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#1d4d7a" opacity="0.8"/>' % (
                    f(dx + k * 52 * sw - 38 * sw), f(y), f(76 * sw), f(44 * sw), f(3 * sw)))
                o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8fd8ff" opacity="0.13" '
                         'filter="url(#glow)"/>' % (f(dx + k * 52 * sw - 38 * sw), f(y), f(76 * sw), f(44 * sw)))
            # operator, backlit by their own screens
            o.append('<path d="M %s %s q %s %s %s 0 Z" fill="#0a1114"/>' % (
                f(dx - 52 * sw), f(y + 64 * sw), f(52 * sw), f(-64 * sw), f(104 * sw)))
            o.append('<circle cx="%s" cy="%s" r="%s" fill="#0a1114"/>' % (f(dx), f(y + 6 * sw), f(25 * sw)))
            o.append('<path d="M %s %s a %s %s 0 0 1 %s 0" fill="none" stroke="#5fb7ae" '
                     'stroke-width="%s" opacity="0.4"/>' % (
                         f(dx - 25 * sw), f(y + 6 * sw), f(25 * sw), f(25 * sw), f(50 * sw), f(3 * sw)))
    # the wall throwing light back off the polished floor
    o.append('<rect x="330" y="308" width="940" height="150" fill="#8fd8ff" opacity="0.05" filter="url(#glow)"/>')
    o.append('<rect y="700" width="1600" height="200" fill="#050b0d" opacity="0.4" filter="url(#near)"/>')
    return wrap("National targeting centre", "".join(o))

# ---------------------------------------------------- airport arrivals ------
# The one scene with an outside. An arrivals hall is only legible as an airport
# if you can see the aircraft it is emptying, so the back wall is glass and the
# stand is on the other side of it: aircraft, jet bridge, apron, tower, runway.
# The hall keeps its own interior register — it is lit by its own lights — and
# what is through the glass reads as the same bright day as the corridor.
#
# Everything with a real-world size — people, cases, gates, carousels, the
# aircraft itself — is drawn from PZ(), the height of a 1.75 m person standing
# at that depth. That single law is what stops it reading as a diagram: the
# fuselage is 3.9 m across because it is 2.2 people across.
HZ_A = 330.0        # the horizon, seen through the glass
APRON_Y = 520.0     # where the aircraft's wheels touch
SILL_Y = 552.0      # the window sill: the hall floor starts here
HEAD_Y = 132.0      # the window head: ceiling above, glazing below

def PZ(y):
    """Drawn height of a 1.75 m person standing at depth y."""
    t = max(0.0, min(1.0, (y - HZ_A) / (900.0 - HZ_A)))
    return 26.0 + 210.0 * t ** 1.55

def metres(y, m):
    return PZ(y) * m / 1.75

def person(x, y, h, tone="#121c1f", op=0.9, case=False):
    """A standing figure, h tall, contact point at (x, y)."""
    o = ['<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#04090b" opacity="0.34" '
         'filter="url(#soft)"/>' % (f(x), f(y + h * .015), f(h * .19), f(h * .045)),
         '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (
             f(x), f(y - h * .915), f(h * .085), tone, f(op)),
         '<path d="M %s %s C %s %s %s %s %s %s L %s %s L %s %s Z" fill="%s" opacity="%s"/>' % (
             f(x - h * .125), f(y - h * .62), f(x - h * .125), f(y - h * .79),
             f(x + h * .125), f(y - h * .79), f(x + h * .125), f(y - h * .62),
             f(x + h * .095), f(y), f(x - h * .095), f(y), tone, f(op))]
    if case:
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" opacity="%s"/>' % (
            f(x + h * .16), f(y - h * .30), f(h * .17), f(h * .28), f(h * .03), tone, f(op * .82)))
        o.append('<path d="M %s %s L %s %s" stroke="%s" stroke-width="%s" opacity="%s" fill="none"/>' % (
            f(x + h * .12), f(y - h * .52), f(x + h * .245), f(y - h * .32), tone,
            f(max(1.0, h * .022)), f(op * .7)))
    return "".join(o)

def _aircraft():
    """A narrow-body on the stand, near side to the glass, nose to the left.

    Sized off the apron's own depth law: the fuselage is 3.9 m across and the
    fin stands 11 m off the ground, so it is 2.2 and 6.3 people tall. The fin
    runs up behind the window head, which is what a fin does when you are
    standing inside the building looking at it."""
    m = lambda v: metres(APRON_Y, v)
    g = APRON_Y
    dia = m(3.9)
    top, bot = g - m(1.9) - dia, g - m(1.9)
    nose, tail = 380.0, 1030.0
    o = ['<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#57655f" opacity="0.32" '
         'filter="url(#soft)"/>' % (f(720), f(g + 5), f(350), f(m(1.6)))]
    # far wing, a sliver over the fuselage
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#bcc8cd"/>' % (
        f(850), f(top + 4), f(1000), f(top - m(1.5)), f(1042), f(top - m(1.3)), f(895), f(top + 6)))
    # tail cone, fin and tailplane
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#e7ecee"/>' % (
        f(tail - 40), f(top), f(1150), f(top - m(0.4)), f(1156), f(bot - dia * .40), f(tail - 40), f(bot)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#6f8894"/>' % (
        f(1002), f(top + 6), f(1092), f(g - m(11.0)), f(1160), f(g - m(11.0)), f(1160), f(top + 6)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#8ea3ad"/>' % (
        f(1044), f(top + dia * .28), f(1184), f(top + dia * .08),
        f(1188), f(top + dia * .32), f(1048), f(top + dia * .52)))
    # fuselage: nose cone, barrel, and the shaded belly under it
    o.append('<path d="M %s %s Q %s %s %s %s L %s %s Q %s %s %s %s Z" fill="#f2f5f6"/>' % (
        f(nose + 62), f(top), f(nose), f(top + dia * .18), f(nose), f(top + dia * .52),
        f(nose), f(bot - dia * .16), f(nose + 6), f(bot), f(nose + 78), f(bot)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#f2f5f6"/>' % (
        f(nose + 64), f(top), f(tail - nose - 24), f(dia)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#c2ced3" opacity="0.9"/>' % (
        f(nose + 8), f(bot - dia * .24), f(tail), f(bot - dia * .24), f(tail), f(bot), f(nose + 24), f(bot)))
    # cockpit, cheatline, cabin windows, two doors
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#2c3a42"/>' % (
        f(nose + 26), f(top + dia * .24), f(nose + 78), f(top + dia * .17),
        f(nose + 80), f(top + dia * .40), f(nose + 24), f(top + dia * .44)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#6f8894"/>' % (
        f(nose + 14), f(top + dia * .70), f(tail + 46), f(top + dia * .62),
        f(tail + 46), f(top + dia * .77), f(nose + 18), f(top + dia * .85)))
    wy, x = top + dia * .38, nose + 116
    while x < tail - 30:
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#2f3f47"/>' % (
            f(x), f(wy), f(m(0.42)), f(m(0.42)), f(m(0.16))))
        x += m(1.1)
    for dx in (nose + 88, tail - 100):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="none" stroke="#a9b8bd" '
                 'stroke-width="1.8"/>' % (f(dx), f(top + dia * .18), f(m(0.9)), f(m(1.9)), f(m(0.2))))
    # near wing, foreshortened toward the camera, with its engine slung under it
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#4f5d58" opacity="0.3" '
             'filter="url(#soft)"/>' % (
                 f(760), f(g + m(0.4)), f(500), f(g + m(0.9)), f(432), f(g + m(1.4)), f(690), f(g + m(0.8))))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#aebdc3"/>' % (
        f(812), f(bot - dia * .10), f(516), f(g - m(0.9)), f(448), f(g - m(0.25)), f(700), f(bot)))
    o.append('<path d="M %s %s L %s %s" stroke="#7e8e94" stroke-width="2" fill="none"/>' % (
        f(448), f(g - m(0.25)), f(700), f(bot)))
    o.append('<path d="M %s %s L %s %s L %s %s Z" fill="#87979d"/>' % (
        f(812), f(bot - dia * .10), f(700), f(bot), f(818), f(bot)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#aab7bc"/>' % (
        f(654), f(bot - m(0.2)), f(m(0.7)), f(m(1.1))))                     # pylon
    o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#c9d4d8"/>' % (
        f(600), f(bot + m(0.5)), f(m(4.6)), f(m(2.3)), f(m(1.1))))
    o.append('<path d="M %s %s a %s %s 0 0 0 %s 0 Z" fill="#8b989d"/>' % (
        f(618), f(bot + m(1.65)), f(m(2.0)), f(m(1.15)), f(m(4.0))))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#aab7bc"/>' % (
        f(608), f(bot + m(1.65)), f(m(0.5)), f(m(1.15))))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#33434a"/>' % (
        f(610), f(bot + m(1.65)), f(m(0.3)), f(m(0.9))))
    # undercarriage
    for gx, n in ((nose + 92, 1), (742, 2)):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8e9a9c"/>' % (
            f(gx - m(0.2)), f(bot - m(0.3)), f(m(0.4)), f(g - bot + m(0.3))))
        for k in range(n):
            o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#232c2f"/>' % (
                f(gx + (k - (n - 1) / 2.0) * m(1.1)), f(g - m(0.45)), f(m(0.55)), f(m(0.45))))
    return "".join(o)

def _jetbridge():
    """Out from under the sill to the forward door — so it reads as the hall's
    own arm, which is exactly what it is."""
    o = ['<path d="M 228 592 L 462 366 L 462 402 L 228 638 Z" fill="#c8cfce"/>',
         '<path d="M 228 638 L 462 402 L 462 414 L 228 652 Z" fill="#98a2a3"/>',
         '<path d="M 228 592 L 462 366 L 462 375 L 228 601 Z" fill="#e2e7e6"/>']
    for i in range(1, 6):               # accordion ribs
        t = i / 6.0
        o.append('<path d="M %s %s L %s %s" stroke="#a7b0b0" stroke-width="2.6" opacity="0.8" '
                 'fill="none"/>' % (f(228 + 234 * t), f(592 - 226 * t), f(228 + 234 * t), f(638 - 236 * t)))
    o.append('<rect x="444" y="352" width="48" height="66" rx="6" fill="#b6c0c1"/>')
    o.append('<rect x="454" y="368" width="18" height="38" rx="3" fill="#33434a"/>')
    o.append('<rect x="344" y="466" width="10" height="52" fill="#9aa4a5"/>')
    o.append('<ellipse cx="349" cy="520" rx="16" ry="7" fill="#2a3437"/>')
    return "".join(o)

def _apron_traffic():
    """A tug and a dolly train, at the size the apron's own depth law gives
    them — the check that says the aircraft is an aircraft and not a shape."""
    o, ty = [], APRON_Y
    o.append('<ellipse cx="920" cy="%s" rx="62" ry="%s" fill="#57655f" opacity="0.26" '
             'filter="url(#soft)"/>' % (f(ty + 3), f(metres(ty, 0.4))))
    o.append('<rect x="876" y="%s" width="88" height="%s" rx="4" fill="#b39a5c"/>' % (
        f(ty - metres(ty, 1.1)), f(metres(ty, 1.1))))
    o.append('<rect x="898" y="%s" width="44" height="%s" rx="4" fill="#8e7333"/>' % (
        f(ty - metres(ty, 1.95)), f(metres(ty, 0.9))))
    for wx in (895, 947):
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#232c2f"/>' % (
            f(wx), f(ty - metres(ty, 0.15)), f(metres(ty, 0.42)), f(metres(ty, 0.36))))
    for i in range(3):
        dx = 1150 + i * 100
        o.append('<ellipse cx="%s" cy="%s" rx="46" ry="%s" fill="#57655f" opacity="0.24" '
                 'filter="url(#soft)"/>' % (f(dx + 36), f(ty + 3), f(metres(ty, 0.34))))
        o.append('<rect x="%s" y="%s" width="76" height="%s" rx="3" fill="#a8b2b1"/>' % (
            f(dx), f(ty - metres(ty, 0.9)), f(metres(ty, 0.62))))
        o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#87999a"/>' % (
            f(dx + 4), f(ty - metres(ty, 0.9)), f(dx + 24), f(ty - metres(ty, 1.95)),
            f(dx + 72), f(ty - metres(ty, 1.95)), f(dx + 72), f(ty - metres(ty, 0.9))))
        for wx in (dx + 15, dx + 61):
            o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#2a3437"/>' % (
                f(wx), f(ty - metres(ty, 0.1)), f(metres(ty, 0.3)), f(metres(ty, 0.26))))
    return "".join(o)

def _carousel(cx_, cy_, rx, ry, tone="#33424a", op=1.0, cases=()):
    """A reclaim island: belt, well, and the hood the bags come down."""
    o = ['<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#04090b" opacity="0.42" '
         'filter="url(#soft)"/>' % (f(cx_), f(cy_ + ry * .36), f(rx * 1.02), f(ry * .52)),
         '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (
             f(cx_), f(cy_), f(rx), f(ry), tone, f(op)),
         '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#162023" opacity="%s"/>' % (
             f(cx_), f(cy_ - ry * .10), f(rx * .74), f(ry * .58), f(op)),
         '<path d="M %s %s a %s %s 0 0 0 %s 0" fill="none" stroke="#a9cdc6" stroke-width="2.6" '
         'opacity="%s"/>' % (f(cx_ - rx), f(cy_), f(rx), f(ry), f(rx * 2), f(op * .38))]
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#25333a" opacity="%s"/>' % (
        f(cx_ - rx * .86), f(cy_ - ry * .3), f(cx_ - rx * .62), f(cy_ - ry * 2.9),
        f(cx_ - rx * .18), f(cy_ - ry * 2.9), f(cx_ - rx * .44), f(cy_ - ry * .3), f(op)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#3a4a52" opacity="%s"/>' % (
        f(cx_ - rx * .44), f(cy_ - ry * .3), f(cx_ - rx * .18), f(cy_ - ry * 2.9),
        f(cx_ - rx * .04), f(cy_ - ry * 2.75), f(cx_ - rx * .3), f(cy_ - ry * .2), f(op)))
    for (bx, by, bw, bh) in cases:
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#54666c" opacity="%s"/>' % (
            f(cx_ + bx), f(cy_ + by), f(bw), f(bh), f(bw * .16), f(op)))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#33434a" opacity="%s"/>' % (
            f(cx_ + bx), f(cy_ + by), f(bw), f(bh * .22), f(op)))
    return "".join(o)

def airport_arrivals():
    o = [defs("#8fb6cf", "#d9e9ef", "#3d4a45", "#232d2f", HZ_A)]
    o.append(
        '<defs>'
        '<linearGradient id="a-sky" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#8ab3ce"/><stop offset="0.72" stop-color="#cfe3ec"/>'
        '<stop offset="1" stop-color="#e6f0f2"/></linearGradient>'
        '<linearGradient id="a-apron" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#b6bcb3"/><stop offset="1" stop-color="#d4d8ce"/></linearGradient>'
        '<linearGradient id="a-glass" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#e8f4fa" stop-opacity="0.18"/>'
        '<stop offset="0.5" stop-color="#cfe4ee" stop-opacity="0.05"/>'
        '<stop offset="1" stop-color="#9fbccb" stop-opacity="0.12"/></linearGradient>'
        '<linearGradient id="a-fhaze" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#dceaf0" stop-opacity="0"/>'
        '<stop offset="1" stop-color="#dceaf0" stop-opacity="0.85"/></linearGradient>'
        '<linearGradient id="a-refl" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#cfe6f2" stop-opacity="0.16"/>'
        '<stop offset="1" stop-color="#cfe6f2" stop-opacity="0"/></linearGradient>'
        '</defs>')
    # ---- outside: sky, tower, runway, apron ------------------------------
    o.append('<rect width="1600" height="%s" fill="url(#a-sky)"/>' % f(HZ_A))
    o.append('<path d="M 118 %s L 208 250 L 246 250 L 246 %s Z" fill="#a9bec8" opacity="0.45"/>' % (
        f(HZ_A), f(HZ_A)))                              # a second aircraft's fin, far off
    o.append('<rect x="1424" y="190" width="28" height="%s" fill="#9aacb4" opacity="0.7"/>' % f(HZ_A - 190))
    o.append('<path d="M 1404 192 L 1414 158 L 1466 158 L 1476 192 Z" fill="#b0c1c8" opacity="0.75"/>')
    o.append('<rect x="1406" y="162" width="66" height="15" fill="#5f7681" opacity="0.45"/>')
    o.append('<rect y="%s" width="1600" height="15" fill="#8d9a96" opacity="0.4"/>' % f(HZ_A - 13))
    o.append('<rect y="248" width="1600" height="92" fill="url(#a-fhaze)"/>')
    o.append('<rect y="%s" width="1600" height="%s" fill="url(#a-apron)"/>' % (
        f(HZ_A), f(SILL_Y + 46 - HZ_A)))
    for k in (-1, 1):                   # stand lead-in and its stop bar
        o.append('<path d="M %s %s L %s %s" stroke="#c9b45e" stroke-width="6" opacity="0.5" '
                 'fill="none"/>' % (f(472 + k * 17), f(APRON_Y - 2), f(180 + k * 160), f(SILL_Y + 46)))
    o.append('<path d="M 400 %s L 546 %s" stroke="#c9b45e" stroke-width="7" opacity="0.45" '
             'fill="none"/>' % (f(APRON_Y + 15), f(APRON_Y + 15)))
    o.append(_aircraft())
    o.append(_apron_traffic())
    o.append(_jetbridge())
    # ---- the glazing itself: a light frame, not a grid over the stand ----
    o.append('<rect y="%s" width="1600" height="%s" fill="url(#a-glass)"/>' % (
        f(HEAD_Y), f(SILL_Y - HEAD_Y)))
    o.append('<path d="M 110 %s L 470 %s L 590 %s L 232 %s Z" fill="#ffffff" opacity="0.05"/>' % (
        f(SILL_Y), f(HEAD_Y), f(HEAD_Y), f(SILL_Y)))
    o.append('<path d="M 990 %s L 1348 %s L 1408 %s L 1050 %s Z" fill="#ffffff" opacity="0.04"/>' % (
        f(SILL_Y), f(HEAD_Y), f(HEAD_Y), f(SILL_Y)))
    for i in range(9):
        o.append('<rect x="%s" y="%s" width="7" height="%s" fill="#3c4a4e" opacity="0.92"/>' % (
            f(i * 200 - 2), f(HEAD_Y), f(SILL_Y - HEAD_Y)))
    o.append('<rect y="242" width="1600" height="9" fill="#3c4a4e" opacity="0.9"/>')
    o.append('<rect y="%s" width="1600" height="20" fill="#141d20"/>' % f(HEAD_Y))
    o.append('<rect y="%s" width="1600" height="26" fill="#222d30"/>' % f(SILL_Y - 12))
    # ---- the hall -------------------------------------------------------
    o.append('<rect width="1600" height="%s" fill="#121a1d"/>' % f(HEAD_Y))
    for i in range(5):                  # ceiling: coffers and their light strips
        k = i - 2.0
        xn, xf = 800 + k * 360, 800 + k * 62
        o.append('<path d="M %s 0 L %s %s L %s %s L %s 0 Z" fill="#1a2429"/>' % (
            f(xn - 140), f(xf - 24), f(HEAD_Y), f(xf + 24), f(HEAD_Y), f(xn + 140)))
        o.append('<path d="M %s 0 L %s %s L %s %s L %s 0 Z" fill="#ffeec4" opacity="0.3" '
                 'filter="url(#bloom-s)"/>' % (
                     f(xn - 11), f(xf - 3), f(HEAD_Y), f(xf + 3), f(HEAD_Y), f(xn + 11)))
    o.append('<rect y="%s" width="1600" height="22" fill="#0d1417"/>' % f(HEAD_Y - 14))
    # The channel signage, hung from the ceiling. Colour only: no plate on this
    # page carries a word, and green beside red is the whole message anyway.
    o.append('<rect x="150" y="170" width="664" height="12" fill="#1a2428"/>')
    for rx_ in (212, 744):
        o.append('<rect x="%s" y="%s" width="5" height="%s" fill="#1a2428"/>' % (
            f(rx_), f(HEAD_Y + 20), f(170 - HEAD_Y - 20)))
    for (px, pw, col, gcol, gop) in ((166, 152, "#31454c", "#8fd8ff", 0.14),
                                     (332, 130, "#31454c", "#8fd8ff", 0.14),
                                     (476, 104, "#2f9e63", "#2f9e63", 0.5),
                                     (594, 86, "#31454c", "#8fd8ff", 0.14),
                                     (694, 104, "#b3453c", "#b3453c", 0.5)):
        o.append('<rect x="%s" y="182" width="%s" height="46" rx="4" fill="%s"/>' % (f(px), f(pw), col))
        o.append('<rect x="%s" y="182" width="%s" height="46" fill="%s" opacity="%s" '
                 'filter="url(#glow)"/>' % (f(px), f(pw), gcol, f(gop)))
    o.append(floorlines(SILL_Y, 800, 14, "#7d8f8a", 0.11))
    o.append('<rect y="%s" width="1600" height="170" fill="url(#a-refl)"/>' % f(SILL_Y + 12))
    for i in range(5):                  # the ceiling strips coming back off the floor
        k = i - 2.0
        o.append('<ellipse cx="%s" cy="%s" rx="104" ry="48" fill="url(#g-pool)" opacity="0.5"/>' % (
            f(800 + k * 230), f(730 + abs(k) * 18)))
    # passport control: a row of e-gates across the hall
    gy = 660.0
    gh, gw = metres(gy, 1.05), metres(gy, 0.42)
    for i in range(6):
        gx = 118 + i * 272
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#04090b" opacity="0.45" '
                 'filter="url(#soft)"/>' % (f(gx + gw * 2.1), f(gy + 5), f(gw * 3.4), f(gh * .16)))
        for k in (0, 1):
            o.append(solid(gx + k * gw * 4.2, gy, gw, gh, gw * .8, "#26333a", "#1b262a", "#33434a", -0.5))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8fd8ff" opacity="0.18"/>' % (
            f(gx + gw * 1.15), f(gy - gh * .78), f(gw * 2.9), f(gh * .74)))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8fd8ff" opacity="0.1" '
                 'filter="url(#glow)"/>' % (f(gx + gw * 1.15), f(gy - gh * .78), f(gw * 2.9), f(gh * .74)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#8fd8ff" opacity="0.85" '
                 'filter="url(#bloom-s)"/>' % (f(gx + gw * .5), f(gy - gh * .82), f(gw * .16)))
    # baggage reclaim, and the people working their way through it
    o.append(_carousel(1250, 748, 250, 46, "#3b4c55", 0.95,
                       cases=((-152, -30, 30, 20), (48, -34, 34, 22), (162, -18, 26, 18))))
    o.append(_carousel(448, 826, 320, 66, "#44565f", 1.0,
                       cases=((-192, -44, 42, 28), (-40, -52, 48, 32),
                              (130, -40, 38, 26), (234, -20, 30, 20))))
    for (px, py, case) in ((214, 636, False), (398, 628, True), (700, 642, False), (964, 632, True),
                           (1372, 640, False), (150, 714, True), (846, 706, False), (1104, 722, True),
                           (1486, 708, False), (318, 792, False), (1020, 806, True), (1428, 820, False),
                           (256, 878, True), (1348, 890, False)):
        o.append(person(px, py, PZ(py), case=case))
    return wrap("Airport arrivals hall", "".join(o))

def main():
    scenes = [("warehouse-interior.svg", warehouse_interior),
              ("targeting-centre.svg", targeting_centre),
              ("airport-arrivals.svg", airport_arrivals)]
    for name, fn in scenes:
        svg = fn()
        check_refs(svg, name)
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(svg)
        print("%-24s %6.1f kB" % (name, len(svg) / 1024.0))

if __name__ == "__main__":
    main()
