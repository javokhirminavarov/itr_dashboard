#!/usr/bin/env python3
"""
Generates the vertical corridor plates in assets/plates/vertical/.

The whole 1600x4800 corridor is authored ONCE in page coordinates and then
sliced into six 1600x800 section files. Each file carries
viewBox="0 {y0} 1600 800", so every element is written in global page
coordinates and the seams line up by construction rather than by hand-matching.
Every gradient and pattern is userSpaceOnUse in that same global space, so a
gradient ramp or a noise tile continues across a seam without a step.

Sectioning exists for one reason: one tall SVG scaled to a 1920-wide viewport
rasterises to a texture tens of megabytes large and janks on scroll. Six
sections rasterise independently and offscreen ones are skipped by
content-visibility.

Run:  python3 tools/build_plates.py     # -> tools/build/vertical/*.svg
      node tools/rasterise.mjs          # -> assets/plates/vertical/*.jpg

The SVG is the editable source; the committed artifact is the JPEG, because
painting thousands of vector paths costs 200-300 ms the first time each section
scrolls into view. The page itself needs no build step.
"""
import math, os, random, re
import xml.etree.ElementTree as ET

W, TOTAL_H, SECTION_H = 1600, 4800, 800
N_SECTIONS = TOTAL_H // SECTION_H
HORIZON = 260.0
ROW_H = TOTAL_H / 6.0           # the corridor is six rows, one per section plate

def R(n, off=0.0):
    """Centre of stage row n (1-based), offset by a fraction of a row. Every
    landmark is placed with this, so the art and the ten stages cannot drift
    apart."""
    return (n - 0.5 + off) * ROW_H
OUT = os.path.join(os.path.dirname(__file__), "build", "vertical")

# ---------------------------------------------------------------- geometry --
# Centreline of the road: a gentle Catmull-Rom through control points. The
# first and last entries are tangent handles and are never reached.
CTRL = [(-1600, 800), (0, 800), (1600, 770), (3200, 830),
        (4800, 780), (6400, 815), (8000, 800), (9600, 800)]

def cx(y):
    """Road centreline x at page y."""
    y = max(CTRL[1][0], min(CTRL[-2][0], y))
    for i in range(1, len(CTRL) - 2):
        y0, y1 = CTRL[i][0], CTRL[i + 1][0]
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            p0, p1, p2, p3 = CTRL[i - 1][1], CTRL[i][1], CTRL[i + 1][1], CTRL[i + 2][1]
            t2, t3 = t * t, t * t * t
            return 0.5 * ((2 * p1) + (-p0 + p2) * t +
                          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                          (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
    return 800.0

# The corridor establishes its depth once and then HOLDS it. A perspective run
# all the way to the foot of the page grows the road, the props and the
# consignment about six-fold between the border and the city, which on a page
# that is scrolled reads as a slow zoom rather than as travel. So the ground
# plane opens out over the first HOLD_Y units — the reader still comes over the
# horizon into the corridor — and from there down every drawn thing keeps the
# scale the old perspective reached at HOLD_REF, the middle of the corridor.
HOLD_Y = 620.0                  # page y at which the corridor stops growing
HOLD_REF = 2560.0               # the scale it settles on: mid-corridor
HOLD_DEPTH = (HOLD_REF - HORIZON) / (TOTAL_H - HORIZON)
HAZE_END = HOLD_Y + 300.0       # aerial perspective belongs to the ramp only

def depth(y):
    """0 at the horizon, HOLD_DEPTH from HOLD_Y down.

    Everything that has to obey the ground plane is driven from this. It is no
    longer a straight ramp to the bottom of the page: past HOLD_Y the corridor
    is at a constant scale, so scrolling reads as moving along the road rather
    than as zooming into it. The ramp is smoothstepped so it arrives at the hold
    with no rate of change — the road edges meet the held width tangentially
    instead of turning a corner there."""
    t = max(0.0, min(1.0, (y - HORIZON) / (HOLD_Y - HORIZON)))
    return HOLD_DEPTH * t * t * (3.0 - 2.0 * t)

def halfw(y):
    """Half the carriageway width at page y."""
    return 30 + 150 * depth(y) ** 1.25

def sc(y):
    """Perspective scale for anything standing on the ground at page y."""
    return 0.10 + 1.55 * depth(y) ** 1.3

def edge(y, side):
    return cx(y) + side * halfw(y)

# ------------------------------------------------------------------ colour --
def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))

def rgb(t):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in t)

def mix(a, b, t):
    ca, cb = hx(a), hx(b)
    return rgb(tuple(ca[i] + (cb[i] - ca[i]) * t for i in range(3)))

def shade(c, f):
    return rgb(tuple(v * f for v in hx(c)))

# Ground walked down the page: hazed steppe -> irrigated corridor -> city verge.
# The corridor is lit by a high sun, so the ramp runs the other way from a night
# scene: palest at the horizon where the atmosphere is thickest, most saturated
# in the near field where there is least air between it and the camera.
GROUND_STOPS = [(260, "#ccd6bb"), (840, "#bccaa0"), (1680, "#aec08c"),
                (2640, "#a8bd85"), (3600, "#a4ba80"), (4320, "#a0b67c"),
                (4800, "#9db27a")]

def ground_at(y):
    if y <= GROUND_STOPS[0][0]:
        return GROUND_STOPS[0][1]
    for i in range(len(GROUND_STOPS) - 1):
        y0, c0 = GROUND_STOPS[i]
        y1, c1 = GROUND_STOPS[i + 1]
        if y0 <= y <= y1:
            return mix(c0, c1, (y - y0) / (y1 - y0))
    return GROUND_STOPS[-1][1]

SKY_TOP, SKY_MID, SKY_HORIZON = "#6ea8d8", "#9cc6e6", "#dcebf3"
HAZE = "#d3e2ec"
ASPHALT_FAR, ASPHALT_NEAR = "#a3adaf", "#8b9596"
# SIGNAL is the risk-management system's signature, used for every piece of
# instrumentation in the scene, and it is the deck's blue. On a lit plate it
# has to be a pigment, not a glow: #3fe0c5 only reads against near-black. It
# also cannot be the deck's own #00569b — against asphalt that reads as a dark
# smudge rather than as instrumentation, so this is the deck blue lifted to
# where it still carries at plate scale.
SIGNAL, WARM = "#1a86d0", "#e0912f"
FIELD_TONES = ["#c2cd97", "#b4c489", "#cbd2a2", "#a9bb80", "#d3d2a6", "#bcc08d",
               "#d8cf9c", "#c6bd88", "#e0d7ad", "#b9bd8b", "#e4dcb4", "#aec089"]

# Structures, in daylight. Three tones per solid: the face turned to camera,
# the side turned away from the sun, and the roof catching it.
BLD_FACE, BLD_SIDE, BLD_TOP = "#c4cfce", "#98a6a6", "#e8ece3"
BLD_FACE_D, BLD_SIDE_D, BLD_TOP_D = "#b0bcbb", "#93a1a1", "#cbd4d1"
GLASS, GLASS_DARK = "#cfe2ee", "#5d7079"
STEEL, STEEL_D = "#9daaa9", "#7d8b8b"

def f(v):
    """Trim floats so the emitted SVG stays small."""
    return ("%.1f" % v).rstrip("0").rstrip(".")

# ---------------------------------------------------------------- defs -----
def defs():
    gs = "".join('<stop offset="%s" stop-color="%s"/>' %
                 (f(y / TOTAL_H), c) for y, c in GROUND_STOPS)
    return (
      '<defs>'
      # --- noise tiles. stitchTiles keeps each tile seamless, and the tile is
      #     computed once instead of over the whole plate.
      '<filter id="fx-grain" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" stitchTiles="stitch"/>'
      '<feColorMatrix values="0 0 0 0 .55 0 0 0 0 .57 0 0 0 0 .54 .7 .7 .7 0 -.78"/></filter>'
      '<pattern id="p-grain" patternUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">'
      '<rect width="200" height="200" filter="url(#fx-grain)"/></pattern>'

      '<filter id="fx-mottle" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.0065 0.011" numOctaves="5" seed="19" stitchTiles="stitch"/>'
      '<feColorMatrix values="0 0 0 0 .34 0 0 0 0 .38 0 0 0 0 .27 .9 .7 .4 0 -.85"/></filter>'
      '<pattern id="p-mottle" patternUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">'
      '<rect width="400" height="400" filter="url(#fx-mottle)"/></pattern>'

      '<filter id="fx-tar" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.3 0.09" numOctaves="4" seed="63" stitchTiles="stitch"/>'
      '<feColorMatrix values="0 0 0 0 .28 0 0 0 0 .31 0 0 0 0 .30 .7 .7 .7 0 -.92"/></filter>'
      '<pattern id="p-tar" patternUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">'
      '<rect width="180" height="180" filter="url(#fx-tar)"/></pattern>'

      # --- depth of field + organic edges. objectBoundingBox regions keep each
      #     filter tight around the group it is applied to.
      '<filter id="fx-far" x="-8%" y="-25%" width="116%" height="150%"><feGaussianBlur stdDeviation="5.5"/></filter>'
      '<filter id="fx-soft" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>'
      '<filter id="fx-edge" x="-8%" y="-14%" width="116%" height="128%"><feGaussianBlur stdDeviation="1.5"/></filter>'
      # the one glow left: a camera's field of view, which is a drawn cone
      '<filter id="fx-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>'

      # --- global ramps, all in page space
      '<linearGradient id="g-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + f(HORIZON) + '">'
      '<stop offset="0" stop-color="' + SKY_TOP + '"/><stop offset="0.5" stop-color="' + SKY_MID + '"/>'
      '<stop offset="0.86" stop-color="' + SKY_HORIZON + '"/>'
      '<stop offset="1" stop-color="' + mix(SKY_HORIZON, "#ffffff", 0.45) + '"/></linearGradient>'
      '<linearGradient id="g-ground" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + str(TOTAL_H) + '">'
      + gs + '</linearGradient>'
      '<linearGradient id="g-asphalt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + str(TOTAL_H) + '">'
      '<stop offset="0" stop-color="' + ASPHALT_FAR + '"/>'
      '<stop offset="0.55" stop-color="' + mix(ASPHALT_FAR, ASPHALT_NEAR, .5) + '"/>'
      '<stop offset="1" stop-color="' + ASPHALT_NEAR + '"/></linearGradient>'
      # haze thins as the ground comes toward the viewer — the single strongest
      # depth cue on the plate
      '<linearGradient id="g-haze" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(HORIZON - 50) + '" x2="0" y2="' + f(HAZE_END) + '">'
      '<stop offset="0" stop-color="' + HAZE + '" stop-opacity="0.6"/>'
      '<stop offset="0.1" stop-color="' + HAZE + '" stop-opacity="0.38"/>'
      '<stop offset="0.3" stop-color="' + HAZE + '" stop-opacity="0.19"/>'
      '<stop offset="0.62" stop-color="' + HAZE + '" stop-opacity="0.06"/>'
      '<stop offset="1" stop-color="' + HAZE + '" stop-opacity="0"/></linearGradient>'
      # the ground/sky join, softened by a ramp rather than a blurred band: a
      # blur wide enough to hide the seam also prints a bar at the section edge
      '<linearGradient id="g-horizon" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(HORIZON - 46) + '" x2="0" y2="' + f(HORIZON + 160) + '">'
      # Ramps up to the horizon line (46 of the band's 206 units down) and
      # away again. It used to open at 0.28, which printed a hard-edged white
      # bar across the sky as soon as the ground below it was calm enough to
      # see it against.
      '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>'
      '<stop offset="0.223" stop-color="#ffffff" stop-opacity="0.28"/>'
      '<stop offset="0.45" stop-color="#ffffff" stop-opacity="0.12"/>'
      '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vig-l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="380" y2="0">'
      '<stop offset="0" stop-color="#3d5a63" stop-opacity="0.13"/>'
      '<stop offset="1" stop-color="#3d5a63" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vig-r" gradientUnits="userSpaceOnUse" x1="1600" y1="0" x2="1220" y2="0">'
      '<stop offset="0" stop-color="#3d5a63" stop-opacity="0.13"/>'
      '<stop offset="1" stop-color="#3d5a63" stop-opacity="0"/></linearGradient>'
      '<radialGradient id="g-sun" gradientUnits="userSpaceOnUse" cx="1165" cy="150" r="420">'
      '<stop offset="0" stop-color="#ffffff" stop-opacity="0.62"/>'
      '<stop offset="0.4" stop-color="#fff4d8" stop-opacity="0.22"/>'
      '<stop offset="1" stop-color="#fff4d8" stop-opacity="0"/></radialGradient>'
      '<linearGradient id="g-wear" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">'
      '<stop offset="0" stop-color="#5f6a6b" stop-opacity="0"/>'
      '<stop offset="0.5" stop-color="#5f6a6b" stop-opacity="0.26"/>'
      '<stop offset="1" stop-color="#5f6a6b" stop-opacity="0"/></linearGradient>'
      # In daylight a lamp does not pool light on the ground — it casts a
      # shadow. g-pool keeps its name and every call site, but is now the soft
      # ground contact under a structure.
      '<radialGradient id="g-pool" cx="0.5" cy="0.5" r="0.5">'
      '<stop offset="0" stop-color="#4d5f52" stop-opacity="0.22"/>'
      '<stop offset="0.55" stop-color="#4d5f52" stop-opacity="0.07"/>'
      '<stop offset="1" stop-color="#4d5f52" stop-opacity="0"/></radialGradient>'
      '<radialGradient id="g-pool-teal" cx="0.5" cy="0.5" r="0.5">'
      '<stop offset="0" stop-color="' + SIGNAL + '" stop-opacity="0.2"/>'
      '<stop offset="1" stop-color="' + SIGNAL + '" stop-opacity="0"/></radialGradient>'
      '</defs>')

# ------------------------------------------------------------------- sky ----
def _ridge(seed, base_y, height, color, jag_lo, jag_hi, rim):
    r = random.Random(seed)
    d, pts, x = "M -80 %s" % f(base_y + 40), [], -80.0
    while x < 1680:
        x += r.uniform(jag_lo, jag_hi)
        pts.append((x, base_y - r.uniform(height * 0.3, height)))
    for px, py in pts:
        d += " L %s %s" % (f(px), f(py))
    d += " L 1680 %s Z" % f(base_y + 40)
    out = '<path d="%s" fill="%s"/>' % (d, color)
    if rim:      # sun is off to the upper right; catch it on right-facing slopes
        out += ('<path d="%s" fill="none" stroke="%s" stroke-width="2.4" opacity="0.32" '
                'transform="translate(2.5,1.5)"/>' % (d, rim))
    return out

def sky(y0, y1):
    if y0 > HORIZON + 300:
        return ""
    o = ['<rect x="0" y="-40" width="1600" height="%s" fill="url(#g-sky)"/>' % f(HORIZON + 44),
         '<rect x="0" y="-40" width="1600" height="%s" fill="url(#g-sun)"/>' % f(HORIZON + 44)]
    r = random.Random(11)
    cl = []
    for _ in range(26):      # fair-weather cloud, brightest highest up
        cy = r.uniform(6, 212)
        t = cy / 230.0
        cl.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (
            f(r.uniform(-140, 1700)), f(cy), f(r.uniform(150, 360)), f(r.uniform(5, 15)),
            mix("#ffffff", SKY_MID, 0.1 + 0.34 * t), f(0.36 + 0.36 * t)))
    for _ in range(6):       # the pale band of thick air sitting on the ridgeline
        cl.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#ffffff" opacity="%s"/>' % (
            f(r.uniform(420, 1620)), f(r.uniform(178, 236)), f(r.uniform(190, 420)),
            f(r.uniform(4, 9)), f(r.uniform(.22, .46))))
    o.append('<g filter="url(#fx-far)">%s</g>' % "".join(cl))
    o.append('<g filter="url(#fx-far)">%s</g>' % _ridge(
        3, HORIZON - 18, 122, mix("#7d97ad", SKY_HORIZON, .58), 120, 260, mix("#ffffff", SKY_HORIZON, .25)))
    o.append('<g filter="url(#fx-soft)">%s</g>' % _ridge(
        8, HORIZON - 6, 84, mix("#8ba4b8", SKY_HORIZON, .4), 90, 200, "#f6faff"))
    o.append(_ridge(21, HORIZON + 6, 46, mix("#9db3c4", SKY_HORIZON, .24), 60, 140, None))
    return "".join(o)

# ---------------------------------------------------- ground + field work ---
# The ground is a BACKGROUND. It used to be a quilt: small plots, three
# ploughing pitches hatched over them, irrigation canals cutting across, and
# forty-odd soft blotches on top. All of it competed with the road, the
# landmarks and the two calm bands the cards sit in. What is left is a
# patchwork of large, low-contrast plots — enough to say cultivated plain, not
# enough to look at.
_rf = random.Random(4404)
FIELDS = []
# Tile the WHOLE ground plane with fields rather than scattering a few patches.
# Row height and cell width both grow with depth, so the patchwork obeys the
# same perspective as the road and reads as farmland instead of a green wash.
_fy = HORIZON + 6
while _fy < TOTAL_H + 140:
    _rh = 60 + 420 * depth(_fy) ** 1.05
    _fx = -320.0
    while _fx < 1920:
        _cw = (170 + 700 * depth(_fy)) * _rf.uniform(0.7, 1.7)
        x0, x1 = _fx, _fx + _cw
        y0 = _fy + _rf.uniform(-.3, .3) * _rh
        y1 = y0 + _rh * _rf.choice([0.55, 0.9, 1.0, 1.0, 1.7])
        mid = (x0 + x1) / 2
        if abs(mid - cx((y0 + y1) / 2)) > halfw((y0 + y1) / 2) * 2.15:
            j = min(_cw, y1 - y0) * 0.3
            d = "M %s %s L %s %s L %s %s L %s %s Z" % (
                f(x0 + _rf.uniform(-j, j)), f(y0 + _rf.uniform(-j, j)),
                f(x1 + _rf.uniform(-j, j)), f(y0 + _rf.uniform(-j, j)),
                f(x1 + _rf.uniform(-j, j)), f(y1 + _rf.uniform(-j, j)),
                f(x0 + _rf.uniform(-j, j)), f(y1 + _rf.uniform(-j, j)))
            # Pulled most of the way back to the ground tone: a plot should
            # separate from its neighbour, not from the plain.
            tone = mix(_rf.choice(FIELD_TONES), ground_at(_fy), _rf.uniform(.45, .75))
            tone = mix(tone, HAZE, max(0.0, .5 - depth(_fy) * 2.4))
            piece = '<path d="%s" fill="%s" opacity="%s"/>' % (d, tone, f(_rf.uniform(.25, .5)))
            if _rf.random() < 0.22:         # a ploughed field boundary, not a hedge
                piece += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" opacity="%s"/>' % (
                    d, shade(tone, 0.86), f(max(1.0, 2.0 * sc(_fy))), f(_rf.uniform(.1, .18)))
            FIELDS.append((y0 - 20, y1 + 20, piece))
        _fx += _cw
    _fy += _rh
_rf.shuffle(FIELDS)      # overlap order varies, so no plot looks stamped

def ground(y0, y1):
    a, b = max(HORIZON - 2, y0 - 90), y1 + 90
    o = ['<rect x="0" y="%s" width="1600" height="%s" fill="url(#g-ground)"/>' % (f(a), f(b - a))]
    fl = [s for (fa, fb, s) in FIELDS if fb > a - 40 and fa < b + 40]
    if fl:
        o.append('<g filter="url(#fx-edge)">%s</g>' % "".join(fl))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="url(#p-mottle)" opacity="0.3"/>' % (f(a), f(b - a)))
    return "".join(o)

# ------------------------------------------------------------------ road ----
def _strip(a, b, k1, k2, steps=44):
    """Ribbon between two multiples of the road half-width; widens with the
    road, so every marking keeps the corridor's perspective for free."""
    ys = [a + (b - a) * i / steps for i in range(steps + 1)]
    l = " ".join("L %s %s" % (f(cx(y) + halfw(y) * k1), f(y)) for y in ys)
    r = " ".join("L %s %s" % (f(cx(y) + halfw(y) * k2), f(y)) for y in reversed(ys))
    return "M %s %s %s %s Z" % (f(cx(a) + halfw(a) * k1), f(a), l, r)

def road(idx, y0, y1):
    a, b = max(HORIZON + 2, y0 - 90), min(TOTAL_H + 130, y1 + 90)
    if b <= a:
        return ""
    cid = "rc%d" % idx
    o = ['<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, _strip(a, b, -1, 1))]
    o.append('<path d="%s" fill="%s" opacity="0.7"/>' % (
        _strip(a, b, -1.9, 1.9), mix(ground_at((a + b) / 2), "#cdc4a2", 0.45)))
    o.append('<path d="%s" fill="#bcbdac" opacity="0.9"/>' % _strip(a, b, -1.32, 1.32))
    o.append('<path d="%s" fill="url(#g-asphalt)"/>' % _strip(a, b, -1, 1))
    o.append('<g clip-path="url(#%s)">' % cid)
    #   wheel-wear bands, the strongest cue that the surface is used
    for k0, k1 in ((-0.64, -0.24), (0.24, 0.64)):
        o.append('<path d="%s" fill="url(#g-wear)"/>' % _strip(a, b, k0, k1))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="url(#p-tar)" opacity="0.45"/>' % (f(a), f(b - a)))
    o.append('</g>')
    for k in (-0.95, 0.95):
        o.append('<path d="%s" fill="#fbfdf8" opacity="0.68"/>' % _strip(a, b, k - 0.03, k + 0.03))
    y = a                                   # centre dashes, scaled by depth
    while y < b:
        s = sc(y)
        seg = max(6.0, 78 * s)
        o.append('<path d="%s" fill="#fbfdf8" opacity="0.72"/>' % _strip(y, min(b, y + seg), -0.024, 0.024, 6))
        y += seg + max(8.0, 96 * s)
    for side in (-1, 1):                # nested strips: a soft edge, no blur
        for k0, k1, op in ((1.18, 1.28, .24), (1.28, 1.36, .14), (1.36, 1.44, .07)):
            o.append('<path d="%s" fill="#5d6b53" opacity="%s"/>' % (
                _strip(a, b, side * k0, side * k1), f(op)))
    return "".join(o)

def guardrail(y0, y1):
    a, b = max(HORIZON + 60, y0 - 90), min(TOTAL_H, y1 + 90)
    o = []
    for side in (-1, 1):
        o.append('<path d="%s" fill="#d3d9d4" opacity="0.8"/>' % _strip(a, b, side * 1.5, side * 1.5 - side * 0.05))
        y = a
        while y < b:
            s = sc(y)
            x, h = edge(y, side) + side * 0.5 * halfw(y), max(3.0, 30 * s)
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8e9a95" opacity="0.7"/>' % (
                f(x - max(.7, 1.8 * s)), f(y - h), f(max(1.4, 3.6 * s)), f(h)))
            y += max(14.0, 96 * s)
    return "".join(o)

# ------------------------------------------------------- prop primitives ----
def lamp(x, y, s, warm=True, mast=True, h=120):
    """A lamp standard in daylight: mast, bracket, unlit head, and the shadow
    the sun throws down and to the left of it. The signature is unchanged so
    every call site is; `warm` now only picks the head's tint."""
    col = "#7a8688" if warm else mix("#7a8688", SIGNAL, 0.35)
    top = y - h * s
    o = ['<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#5b6b52" opacity="0.16"/>' % (
        f(x - 2.6 * s), f(y), f(x + 2.6 * s), f(y),
        f(x - h * .34 * s), f(y + h * .2 * s), f(x - h * .38 * s), f(y + h * .2 * s))]
    if mast:
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#98a4a5"/>' % (
            f(x - 2.6 * s), f(top), f(5.2 * s), f(h * s)))
        o.append('<path d="M %s %s q %s %s %s %s" fill="none" stroke="#98a4a5" stroke-width="%s"/>' % (
            f(x), f(top + 3 * s), f(9 * s), f(-1 * s), f(20 * s), f(6 * s), f(4.4 * s)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (
        f(x + 20 * s), f(top + 9 * s), f(5 * s), f(3.4 * s), col))
    return "".join(o)

def window_grid(x, y, w, h, cols, rows, lit_seed, col="#ffd9a0", lit_p=0.55):
    """Glazing in daylight. A window is not a light source at noon — it is a
    mirror, so some panes catch the sky and the rest read as the dark of the
    room behind. `col`, `lit_p` and the call sites are unchanged; `col` now
    tints the reflection instead of colouring a glow."""
    r = random.Random(lit_seed)
    cw, ch = w / max(1, cols), h / max(1, rows)
    sky_pane = mix(GLASS, col, 0.16)
    out = []
    for i in range(cols):
        for j in range(rows):
            cell = '<rect x="%s" y="%s" width="%s" height="%s"' % (
                f(x + i * cw + cw * .2), f(y + j * ch + ch * .22), f(cw * .6), f(ch * .56))
            if r.random() < lit_p:
                out.append(cell + ' fill="%s" opacity="%s"/>' % (sky_pane, f(r.uniform(.55, .95))))
            else:
                out.append(cell + ' fill="%s" opacity="0.7"/>' % GLASS_DARK)
    return "".join(out)

def solid(x, y, w, h, dep, face, side, top, skew=0.5):
    """Axonometric box. Front face is (x, y-h)-(x+w, y); the body recedes
    up-page and sideways by `skew`. Keep `dep` small — the camera is low, so a
    fat roof face is the fastest way to make a building look like a toy."""
    ox, oy = dep * skew, -dep
    sx = x + w if skew > 0 else x
    return (
        '<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="%s"/>'
        '<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="%s"/>'
        '<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (
            f(sx), f(y), f(sx + ox), f(y + oy), f(sx + ox), f(y + oy - h), f(sx), f(y - h), side,
            f(x), f(y - h), f(x + w), f(y - h), f(x + w + ox), f(y - h + oy), f(x + ox), f(y - h + oy), top,
            f(x), f(y - h), f(w), f(h), face))

PROPS = []      # (ymin, ymax, svg) — sliced per section
def prop(ymin, ymax, svg):
    PROPS.append((ymin, ymax, svg))

# A prop is emitted into every section its band reaches, plus a margin: at the
# held scale the tallest structures stand ~7 road half-widths proud of their
# own y, which is most of a section, and a prop missing from the section above
# its band loses its roof at the seam.
PROP_MARGIN = 700.0

def props(y0, y1):
    return "".join(s for (a, b, s) in PROPS
                   if b > y0 - PROP_MARGIN and a < y1 + PROP_MARGIN)

# =========================================================================
# SCENE PROPS
# The journey has ten stages and the page is ten rows of ROW_H units, so each
# stage's landmark sits on its row's centre line, placed with R(n).
# The truck rides the road at the viewport's focus line, which means whatever
# is on screen beside it is always the landmark for the stage being read.
# Everything road-spanning is sized in u = halfw(y), so moving a prop up or
# down the page rescales it correctly for free.
# =========================================================================

# ------------------------------------------------ row 2 · the border gate ---
# The border complex is authored in road half-widths like every other prop, but
# it is by far the widest of them: 12.4 of them across the canopy. That was
# comfortable while the perspective drew this row's road narrow, and fills the
# frame edge to edge now that the corridor holds one scale. GATE_K takes the
# whole composition — structure and apron alike — back to the footprint it had,
# without touching any of its internal proportions.
GATE_K = 0.62

def _gate():
    y = R(2)
    c, u, s = cx(y), halfw(y) * GATE_K, sc(y) * GATE_K
    o = ['<path d="%s" fill="#b9c0b1" opacity="0.58" filter="url(#fx-soft)"/>'
         % _strip(y - 232, y + 232, -4.6 * GATE_K, 4.6 * GATE_K)]
    # the apron is painted over the carriageway, so put the road back on top of
    # it — the corridor has to run visibly under the canopy, not stop at it
    o.append('<path d="%s" fill="url(#g-asphalt)"/>' % _strip(y - 226, y + 232, -1, 1))
    for k in (-0.95, 0.95):
        o.append('<path d="%s" fill="#c8d6cd" opacity="0.16"/>' % _strip(y - 226, y + 232, k - .04, k + .04))
    for k in (-0.34, 0.34):
        o.append('<path d="%s" fill="#e8eee7" opacity="0.1"/>' % _strip(y - 196, y + 202, k - .02, k + .02))
    o.append('<path d="%s" fill="#5b6b52" opacity="0.22" filter="url(#fx-soft)"/>'
             % _strip(y + 24, y + 122, -4.4 * GATE_K, 4.4 * GATE_K))
    # main hall, set back behind the canopy
    hall_w, hall_h = 10.2 * u, 3.0 * u
    o.append(solid(c - hall_w / 2, y - 2.8 * u, hall_w, hall_h, 1.1 * u, BLD_FACE, BLD_SIDE, BLD_TOP, 0.32))
    o.append(window_grid(c - hall_w / 2 + .4 * u, y - 5.2 * u, hall_w - .8 * u, 1.6 * u, 15, 2, 5, "#ffd9a0", 0.5))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8e9b9a"/>' % (
        f(c - hall_w / 2), f(y - 6.2 * u), f(hall_w), f(.36 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.55"/>' % (
        f(c - hall_w / 2), f(y - 5.85 * u), f(hall_w), f(.12 * u), SIGNAL))
    # canopy slab over the lanes, on four columns
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#c3cecd"/>' % (
        f(c - 5.9 * u), f(y - 3.0 * u), f(c + 5.9 * u), f(y - 3.0 * u),
        f(c + 6.2 * u), f(y - 2.34 * u), f(c - 6.2 * u), f(y - 2.34 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#7f8d8c" opacity="0.85"/>' % (
        f(c - 6.2 * u), f(y - 2.34 * u), f(12.4 * u), f(.2 * u)))
    for k in (-0.9, -0.3, 0.3, 0.9):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#9daaa9"/>' % (
            f(c + k * 5.9 * u - .1 * u), f(y - 2.14 * u), f(.2 * u), f(2.14 * u)))
    for k in (-0.56, 0.56):             # booths between the lanes
        bx = c + k * 5.9 * u - .33 * u
        o.append(solid(bx, y + .06 * u, .66 * u, .9 * u, .36 * u, BLD_FACE_D, BLD_SIDE_D, BLD_TOP_D, 0.4))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.85"/>' % (
            f(bx + .1 * u), f(y - .66 * u), f(.45 * u), f(.33 * u), GLASS))
    for k in (-0.72, -0.24, 0.24, 0.72):   # the canopy's shadow on the deck
        px = c + k * 5.9 * u
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
            f(px), f(y + .2 * u), f(1.3 * u), f(.45 * u)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#7a8688"/>' % (
            f(px), f(y - 2.24 * u), f(.1 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c8ccc6" opacity="0.85"/>' % (
        f(c - 5.5 * u), f(y + .55 * u), f(1.75 * u), f(.09 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c8ccc6" opacity="0.7"/>' % (
        f(c + 4.15 * u), f(y - .18 * u), f(.09 * u), f(.78 * u)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)" opacity="0.5"/>' % (
        f(c), f(y + .35 * u), f(7.5 * u), f(1.6 * u)))
    return "".join(o)
prop(R(2, -0.62), R(2, 0.62), _gate())

# ------------------------------------- row 3 · supervised transit: portal ---
def _portal(y, tone=None):
    c, u, s = cx(y), halfw(y), sc(y)
    col = tone or SIGNAL
    h = 2.7 * u
    o = ['<path d="%s" fill="#aeb6a8" opacity="0.55"/>' % _strip(y - 55, y + 55, -1.6, 1.6)]
    for side in (-1, 1):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#9daaa9"/>' % (
            f(c + side * u * 1.2 - .16 * u), f(y - h), f(.32 * u), f(h)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#b3bfbf"/>' % (
        f(c - u * 1.34), f(y - h - .5 * u), f(u * 2.68), f(.56 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.9"/>' % (
        f(c - u * 1.24), f(y - h + .06 * u), f(u * 2.48), f(.1 * u), col))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool-teal)"/>' % (
        f(c), f(y + 4), f(u * 1.7), f(.9 * u)))
    o.append(lamp(c - u * 2.1, y + 16, s, False, True, 210))
    return "".join(o)
prop(R(2, 0.3), R(2, 0.56), _portal(R(2, 0.42)))

def _checkpoint(y):
    c, u, s = cx(y), halfw(y), sc(y)
    h = 2.9 * u
    o = ['<path d="%s" fill="#aeb6a8" opacity="0.5"/>' % _strip(y - 48, y + 48, -1.5, 1.5)]
    for side in (-1, 1):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#9daaa9"/>' % (
            f(c + side * u * 1.32 - .13 * u), f(y - h), f(.26 * u), f(h)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#b3bfbf"/>' % (
        f(c - u * 1.42), f(y - h - .34 * u), f(u * 2.84), f(.36 * u)))
    for k in (-0.62, 0, 0.62):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#8e9c9c"/>' % (
            f(c + k * u * 1.2 - .26 * u), f(y - h + .04 * u), f(.52 * u), f(.26 * u), f(.06 * u)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (
            f(c + k * u * 1.2), f(y - h + .4 * u), f(.07 * u), SIGNAL))
    o.append(lamp(c - u * 1.9, y + .1 * u, s, True, True, 200))
    o.append(lamp(c + u * 1.9, y + .1 * u, s, True, True, 200))
    return "".join(o)
prop(R(3, -0.1), R(3, 0.34), _checkpoint(R(3, 0.08)))

# ----------------------------------------- row 4 · the customs warehouse ----
def _warehouse():
    y = R(4)
    c, u, s = cx(y), halfw(y), sc(y)
    x0 = c + u * 1.9
    bw, bh, bd = 5.2 * u, 2.05 * u, 0.95 * u
    o = ['<path d="M %s %s L 1600 %s L 1600 %s L %s %s Z" fill="#b4bba9" opacity="0.66"/>' % (
        f(x0 - .5 * u), f(y + .9 * u), f(y + .9 * u), f(y - 3.1 * u), f(x0 + .3 * u), f(y - 3.1 * u))]
    o.append('<path d="M %s %s L 1600 %s L 1600 %s L %s %s Z" fill="#586a53" opacity="0.4" '
             'filter="url(#fx-soft)"/>' % (f(x0 - 1.1 * u), f(y + 1.1 * u), f(y + 1.1 * u),
                                           f(y - .2 * u), f(x0 - .4 * u), f(y - .2 * u)))
    o.append(solid(x0, y - .1 * u, bw, bh, bd, BLD_FACE, BLD_SIDE, BLD_TOP, -0.5))
    o.append('<path d="M %s %s L %s %s L %s %s Z" fill="#cdd6d3"/>'
             % (f(x0), f(y - .1 * u - bh), f(x0 + bw / 2), f(y - .1 * u - bh - .5 * u), f(x0 + bw), f(y - .1 * u - bh)))
    for i in range(4):                  # dock doors: two shut, two open and lit
        dx = x0 + .35 * u + i * 1.2 * u
        if i in (1, 2):
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#55636a" opacity="0.9"/>' % (
                f(dx), f(y - 1.2 * u), f(.85 * u), f(1.1 * u)))
            o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
                f(dx + .42 * u), f(y - .05 * u), f(.75 * u), f(.26 * u)))
        else:
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8a9696"/>' % (
                f(dx), f(y - 1.2 * u), f(.85 * u), f(1.1 * u)))
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#7e8c8c"/>' % (
                f(dx), f(y - 1.2 * u), f(.85 * u), f(.07 * u)))
    o.append(window_grid(x0 + .12 * u, y - .1 * u - bh + .2 * u, bw - .24 * u, .5 * u, 14, 1, 77, "#9fe8dc", 0.35))
    # Trailers on the apron, backed toward the docks. They used to be authored
    # at x0 - 1.75u, which on this row's geometry is the middle of the
    # carriageway — invisible on a dark plate, two floating slabs on a lit one.
    for tx, ty, tw in ((x0 + .5 * u, y + .38 * u, 1.5 * u), (x0 + 2.5 * u, y + .55 * u, 1.7 * u)):
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#5b6b52" opacity="0.26"/>' % (
            f(tx + tw * .4), f(ty + .04 * u), f(tw * .62), f(.11 * u)))
        o.append(solid(tx, ty, tw, .55 * u, .3 * u, "#b8c2c1", "#9aa6a6", "#d2dad7", -0.5))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#7e8a89"/>' % (f(tx), f(ty), f(tw), f(.06 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#9aa695"/>' % (
        f(x0 + .7 * u), f(y + .3 * u), f(.3 * u), f(.24 * u)))
    o.append('<circle cx="%s" cy="%s" r="%s" fill="#c8802c"/>' % (
        f(x0 + .85 * u), f(y + .26 * u), f(.05 * u)))
    # The apron's lamp standards. The first used to be authored at x0 - 2.2u,
    # which on this row's geometry is c - 0.3u — a lamp planted in the middle
    # of the carriageway. It stands on the apron with the other two now.
    for lx in (x0 + .1 * u, x0 + 2.6 * u, x0 + 5.4 * u):
        o.append(lamp(lx, y + .6 * u, s * 0.95, True, True, 200))
    return "".join(o)
prop(R(4, -0.55), R(4, 0.36), _warehouse())

# ---------------------------- row 5 · declaration, and the release gantry ----
def _declaration():
    y = R(5)
    c, u, s = cx(y), halfw(y), sc(y)
    x1 = c - u * 1.85
    bw, bh, bd = 3.4 * u, 2.0 * u, 0.5 * u
    o = ['<path d="M 0 %s L %s %s L %s %s L 0 %s Z" fill="#b4bba9" opacity="0.66"/>' % (
        f(y + .8 * u), f(x1 + .35 * u), f(y + .8 * u), f(x1 - .35 * u), f(y - 2.6 * u), f(y - 2.6 * u))]
    o.append('<path d="M 0 %s L %s %s L %s %s L 0 %s Z" fill="#586a53" opacity="0.42" filter="url(#fx-soft)"/>'
             % (f(y + 1.0 * u), f(x1 + .1 * u), f(y + 1.0 * u), f(x1 - .5 * u), f(y - .1 * u), f(y - .1 * u)))
    o.append(solid(x1 - bw, y - .15 * u, bw, bh, bd, BLD_FACE, BLD_SIDE, BLD_TOP, 0.5))
    o.append(window_grid(x1 - bw + .08 * u, y - .15 * u - bh + .1 * u, bw - .16 * u, bh - .2 * u,
                         9, 5, 91, "#bfe6ff", 0.62))
    for i in range(1, 5):               # spandrels read as a glass curtain wall
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#8b9998" opacity="0.9"/>' % (
            f(x1 - bw), f(y - .15 * u - bh + i * bh / 5), f(bw), f(.05 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c0cac8"/>' % (
        f(x1 - bw - .06 * u), f(y - .15 * u - bh - .09 * u), f(bw + .12 * u), f(.09 * u)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#b0bcbb"/>' % (
        f(x1 - 1.0 * u), f(y - .15 * u), f(x1 + .2 * u), f(y - .15 * u),
        f(x1 + .2 * u), f(y - .5 * u), f(x1 - 1.0 * u), f(y - .5 * u)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
        f(x1 - .4 * u), f(y - .05 * u), f(.95 * u), f(.28 * u)))
    r = random.Random(55)
    for i in range(7):                  # car park
        px, py = x1 - bw + .25 * u + i * .46 * u, y + .38 * u
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" opacity="0.9"/>' % (
            f(px), f(py), f(.32 * u), f(.16 * u), f(.05 * u), r.choice(["#8a9496", "#9aa3a4", "#7e888a"])))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#b6bebf"/>' % (
            f(px + .06 * u), f(py - .05 * u), f(.2 * u), f(.06 * u), f(.02 * u)))
    for lx in (x1 - bw - .25 * u, x1 - .5 * u, x1 + .3 * u):
        o.append(lamp(lx, y + .65 * u, s * 0.9, True, True, 190))
    return "".join(o)
prop(R(5, -0.53), R(5, 0.34), _declaration())

# the exit gantry: the same portal, released green, at the foot of the
# declaration row
# the exit gantry on the declaration row is the green channel, so it wears the
# deck's green rather than the corridor's blue signal — lifted the same way
prop(R(5, 0.3), R(5, 0.52), _portal(R(5, 0.42), "#1f9b2e"))

# ---------------------- row 6 · post-clearance audit: the importer's premises -
def _premises():
    y = R(6, -0.12)
    c, u, s = cx(y), halfw(y), sc(y)
    x1 = c - u * 1.5
    o = ['<path d="M 0 %s L %s %s L %s %s L 0 %s Z" fill="#b4bba9" opacity="0.58"/>' % (
        f(y + 1.2 * u), f(x1 + .4 * u), f(y + 1.2 * u), f(x1 - .2 * u), f(y - 2.4 * u), f(y - 2.4 * u))]
    o.append(solid(x1 - 2.4 * u, y - .2 * u, 2.4 * u, 1.4 * u, .5 * u, BLD_FACE, BLD_SIDE, BLD_TOP, 0.5))
    o.append(window_grid(x1 - 2.32 * u, y - 1.5 * u, 2.24 * u, 1.1 * u, 7, 3, 17, "#ffd9a0", 0.45))
    o.append(solid(x1 - 4.3 * u, y - .1 * u, 1.5 * u, .95 * u, .35 * u, BLD_FACE_D, BLD_SIDE_D, BLD_TOP_D, 0.5))
    for i in range(3):                  # a small yard with stacked containers
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.85"/>' % (
            f(x1 - 1.9 * u + i * .62 * u), f(y + .35 * u), f(.55 * u), f(.26 * u),
            ["#4d8580", "#a97244", "#6a8878"][i]))
    for lx in (x1 - 2.2 * u, x1 - .3 * u):
        o.append(lamp(lx, y + .8 * u, s * 0.85, True, True, 180))
    return "".join(o)
prop(R(6, -0.55), R(6, 0.18), _premises())

# ------------------------------------- below row 6 · out into the capital -----
def _outskirts():
    """The edge of the capital, at the foot of the page.

    The corridor recedes upward, so the foot of the page is the nearest ground
    on the plate — a skyline drawn small and hazed here would be a town seen
    from a mile away standing on the hard shoulder. What belongs at this depth
    is low-rise outskirts at true near-field scale: workshops and two-storey
    blocks, sized in u like every other structure. Anything that would cross
    the carriageway is dropped rather than drawn over it, so the corridor runs
    visibly out of the bottom of the frame."""
    r = random.Random(808)
    o = []
    for band in (4560.0, 4760.0):
        u = halfw(band)
        road_l, road_r = cx(band) - 1.8 * u, cx(band) + 1.8 * u
        x = -140.0
        while x < 1660:
            bw = r.uniform(.9, 1.9) * u
            bh = r.uniform(.5, 1.15) * u
            if not (x + bw > road_l and x < road_r):
                skew = -0.5 if x > cx(band) else 0.5
                o.append(solid(x, band, bw, bh, .3 * u, BLD_FACE_D, BLD_SIDE_D, BLD_TOP_D, skew))
                o.append(window_grid(x + .08 * u, band - bh + .12 * u, bw - .16 * u, bh - .3 * u,
                                     max(3, int(bw / (.34 * u))), max(2, int(bh / (.36 * u))),
                                     int(x + band), "#cfe6ff", 0.4))
            x += bw + r.uniform(.25, .8) * u
    return "".join(o)
prop(4380, 4830, _outskirts())


# ------------------------------------------------------------ atmosphere ---
def atmosphere(y0):
    # Vignette is horizontal only. A top/bottom vignette per section would
    # print a dark bar at every seam.
    return ('<rect x="0" y="%s" width="1600" height="%s" fill="url(#p-grain)" opacity="0.075"/>'
            '<rect x="0" y="%s" width="380" height="%s" fill="url(#g-vig-l)"/>'
            '<rect x="1220" y="%s" width="380" height="%s" fill="url(#g-vig-r)"/>' % (
                f(y0), f(SECTION_H), f(y0), f(SECTION_H), f(y0), f(SECTION_H)))

def horizon_glow(y0):
    """A soft band of sky colour bleeding onto the furthest ground. Without it
    the ground/sky join is a ruled line and the depth illusion collapses."""
    if y0 > 0:
        return ""
    return '<rect x="0" y="%s" width="1600" height="206" fill="url(#g-horizon)"/>' % f(HORIZON - 46)

def far_haze(y0, y1):
    """Aerial perspective over everything, drawn after the road and the props.

    This is the one cue that survives the trees. Applied inside ground() it
    only hazed the fields, and the crisp far road and crisp far gate then read
    flat against them; applied here it hazes whatever is standing at that
    depth, which is what air actually does. It stops at HAZE_END: below the
    hold everything stands at the same depth, so there is no air to draw."""
    if y0 > HAZE_END:
        return ""
    b = min(y1 + 2, HAZE_END)
    return '<rect x="0" y="%s" width="1600" height="%s" fill="url(#g-haze)"/>' % (f(y0), f(b - y0))

# --------------------------------------------------------------- assembly --
def section(idx):
    y0, y1 = idx * SECTION_H, (idx + 1) * SECTION_H
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 %d %d %d">'
        % (W, SECTION_H, y0, W, SECTION_H),
        '<title>Uzbekistan customs corridor, section %d of %d</title>' % (idx + 1, N_SECTIONS),
        defs(),
        '<rect x="0" y="%d" width="%d" height="%d" fill="%s"/>' % (y0, W, SECTION_H, ground_at(y0 + 500)),
        sky(y0, y1),
        ground(y0, y1),
        horizon_glow(y0),
        road(idx, y0, y1),
        guardrail(y0, y1),
        props(y0, y1),
        far_haze(y0, y1),
        atmosphere(y0),
        '</svg>']
    return "".join(p for p in parts if p)

def route_d(k=-0.48, y_start=HORIZON + 46.0, y_end=TOTAL_H - 25.0, step=110.0):
    """Path the consignment drives, in page coordinates: the offside lane, so a
    vehicle coming toward the camera sits left of the centre line."""
    pts, y = [], y_start
    while y <= y_end:
        pts.append((cx(y) + halfw(y) * k, y))
        y += step
    if pts[-1][1] < y_end:
        pts.append((cx(y_end) + halfw(y_end) * k, y_end))
    d = "M %s %s" % (f(pts[0][0]), f(pts[0][1]))
    for i in range(1, len(pts) - 1):
        mx, my = (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2
        d += " Q %s %s %s %s" % (f(pts[i][0]), f(pts[i][1]), f(mx), f(my))
    d += " L %s %s" % (f(pts[-1][0]), f(pts[-1][1]))
    return d

def check_well_formed(svg, name):
    """Parse what we are about to write.

    A colour constant spliced into SVG attribute text produces `fill=STEEL_D`,
    which Python is perfectly happy to emit and the rasteriser reports only as a
    30-second image-load timeout. Parsing here names the file and the column."""
    try:
        ET.fromstring(svg)
    except ET.ParseError as e:
        raise SystemExit("%s is not well-formed XML: %s" % (name, e))

def check_refs(svg, name):
    """Every url(#id) must resolve. A dangling reference does not error in the
    browser — the element simply stops painting, which is how the road lost its
    wheel-wear bands without anything complaining."""
    ids = set(re.findall(r'id="([^"]+)"', svg))
    used = set(re.findall(r'url\(#([^)]+)\)', svg))
    missing = sorted(used - ids)
    if missing:
        raise SystemExit("%s references undefined ids: %s" % (name, ", ".join(missing)))

def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for i in range(N_SECTIONS):
        svg = section(i)
        check_well_formed(svg, "s%d.svg" % (i + 1))
        check_refs(svg, "s%d.svg" % (i + 1))
        with open(os.path.join(OUT, "s%d.svg" % (i + 1)), "w", encoding="utf-8") as fh:
            fh.write(svg)
        total += len(svg)
        print("s%d.svg  %6.1f kB" % (i + 1, len(svg) / 1024.0))
    print("total   %6.1f kB" % (total / 1024.0))
    print("\nroute d (paste into plates.js):\n" + route_d())
    print("\nlane half-widths: " + ", ".join("y%d=%s" % (y, f(halfw(y))) for y in (260, 720, 1200, 2400, 3600, 4800)))

if __name__ == "__main__":
    main()
