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

W, TOTAL_H, SECTION_H = 1600, 4800, 800
N_SECTIONS = TOTAL_H // SECTION_H
HORIZON = 260.0
ROW_H = TOTAL_H / 10.0          # the page is ten stage rows

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

def depth(y):
    """0 at the horizon, 1 at the bottom of the page. Everything that has to
    obey the ground plane is driven from this, which is what stops the corridor
    reading as a flat diagram."""
    return max(0.0, y - HORIZON) / (TOTAL_H - HORIZON)

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

# Ground walked down the page: hazed steppe -> irrigated corridor -> city verge
GROUND_STOPS = [(260, "#1e2a20"), (840, "#25321f"), (1680, "#2b3a23"),
                (2640, "#273620"), (3600, "#1f2b1c"), (4320, "#182219"),
                (4800, "#111a17")]

def ground_at(y):
    if y <= GROUND_STOPS[0][0]:
        return GROUND_STOPS[0][1]
    for i in range(len(GROUND_STOPS) - 1):
        y0, c0 = GROUND_STOPS[i]
        y1, c1 = GROUND_STOPS[i + 1]
        if y0 <= y <= y1:
            return mix(c0, c1, (y - y0) / (y1 - y0))
    return GROUND_STOPS[-1][1]

SKY_TOP, SKY_MID, SKY_HORIZON = "#070f18", "#132633", "#2b4a4c"
HAZE = "#33505a"
ASPHALT_FAR, ASPHALT_NEAR = "#161d21", "#0e1418"
TEAL, WARM = "#3fe0c5", "#ffcf8f"
FIELD_TONES = ["#2f3d24", "#26331e", "#33422a", "#1f2b1a", "#2a3626", "#38452b",
               "#3d3a24", "#312d1c", "#474028", "#2a2a1b", "#4a4530", "#22301f"]

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
      '<feColorMatrix values="0 0 0 0 .13 0 0 0 0 .18 0 0 0 0 .10 .9 .7 .4 0 -.85"/></filter>'
      '<pattern id="p-mottle" patternUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">'
      '<rect width="400" height="400" filter="url(#fx-mottle)"/></pattern>'

      '<filter id="fx-tar" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.3 0.09" numOctaves="4" seed="63" stitchTiles="stitch"/>'
      '<feColorMatrix values="0 0 0 0 .42 0 0 0 0 .46 0 0 0 0 .47 .7 .7 .7 0 -.92"/></filter>'
      '<pattern id="p-tar" patternUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">'
      '<rect width="180" height="180" filter="url(#fx-tar)"/></pattern>'

      # --- depth of field + organic edges. objectBoundingBox regions keep each
      #     filter tight around the group it is applied to.
      '<filter id="fx-far" x="-8%" y="-25%" width="116%" height="150%"><feGaussianBlur stdDeviation="5.5"/></filter>'
      '<filter id="fx-soft" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>'
      '<filter id="fx-blob" x="-14%" y="-24%" width="128%" height="148%"><feGaussianBlur stdDeviation="9"/></filter>'
      '<filter id="fx-near" x="-8%" y="-14%" width="116%" height="128%"><feGaussianBlur stdDeviation="3.6"/></filter>'
      '<filter id="fx-warp1" x="-16%" y="-22%" width="132%" height="144%">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="23" result="n"/>'
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>'
      '<filter id="fx-warp2" x="-16%" y="-22%" width="132%" height="144%">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="4" seed="23" result="n"/>'
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G"/></filter>'
      '<filter id="fx-warp3" x="-16%" y="-22%" width="132%" height="144%">'
      '<feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="4" seed="23" result="n"/>'
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="28" xChannelSelector="R" yChannelSelector="G"/></filter>'
      '<filter id="fx-edge" x="-8%" y="-14%" width="116%" height="128%"><feGaussianBlur stdDeviation="1.5"/></filter>'
      # --- bloom: the light, plus blurred copies of it underneath
      '<filter id="fx-bloom" x="-70%" y="-70%" width="240%" height="240%">'
      '<feGaussianBlur stdDeviation="13" result="b"/>'
      '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      '<filter id="fx-bloom-s" x="-90%" y="-90%" width="280%" height="280%">'
      '<feGaussianBlur stdDeviation="4.5" result="b"/>'
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      '<filter id="fx-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>'

      # --- global ramps, all in page space
      '<linearGradient id="g-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + f(HORIZON) + '">'
      '<stop offset="0" stop-color="' + SKY_TOP + '"/><stop offset="0.5" stop-color="' + SKY_MID + '"/>'
      '<stop offset="0.86" stop-color="' + SKY_HORIZON + '"/>'
      '<stop offset="1" stop-color="' + mix(SKY_HORIZON, "#7a5a3c", 0.5) + '"/></linearGradient>'
      '<linearGradient id="g-ground" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + str(TOTAL_H) + '">'
      + gs + '</linearGradient>'
      '<linearGradient id="g-asphalt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + str(TOTAL_H) + '">'
      '<stop offset="0" stop-color="' + ASPHALT_FAR + '"/>'
      '<stop offset="0.55" stop-color="' + mix(ASPHALT_FAR, ASPHALT_NEAR, .5) + '"/>'
      '<stop offset="1" stop-color="' + ASPHALT_NEAR + '"/></linearGradient>'
      # haze thins as the ground comes toward the viewer — the single strongest
      # depth cue on the plate
      '<linearGradient id="g-haze" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(HORIZON - 60) + '" x2="0" y2="1170">'
      '<stop offset="0" stop-color="' + HAZE + '" stop-opacity="0.7"/>'
      '<stop offset="0.14" stop-color="' + HAZE + '" stop-opacity="0.34"/>'
      '<stop offset="0.45" stop-color="' + HAZE + '" stop-opacity="0.13"/>'
      '<stop offset="1" stop-color="' + HAZE + '" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vig-l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="380" y2="0">'
      '<stop offset="0" stop-color="#040a0c" stop-opacity="0.44"/>'
      '<stop offset="1" stop-color="#040a0c" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="g-vig-r" gradientUnits="userSpaceOnUse" x1="1600" y1="0" x2="1220" y2="0">'
      '<stop offset="0" stop-color="#040a0c" stop-opacity="0.44"/>'
      '<stop offset="1" stop-color="#040a0c" stop-opacity="0"/></linearGradient>'
      '<radialGradient id="g-sun" gradientUnits="userSpaceOnUse" cx="1165" cy="245" r="330">'
      '<stop offset="0" stop-color="#d59357" stop-opacity="0.52"/>'
      '<stop offset="0.42" stop-color="#8a5f3c" stop-opacity="0.2"/>'
      '<stop offset="1" stop-color="#8a5f3c" stop-opacity="0"/></radialGradient>'
      '<radialGradient id="g-citylight" gradientUnits="userSpaceOnUse" cx="800" cy="4620" r="640">'
      '<stop offset="0" stop-color="#4a8f92" stop-opacity="0.22"/>'
      '<stop offset="1" stop-color="#4a8f92" stop-opacity="0"/></radialGradient>'
      '<linearGradient id="g-wear" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">'
      '<stop offset="0" stop-color="#465659" stop-opacity="0"/>'
      '<stop offset="0.5" stop-color="#465659" stop-opacity="0.2"/>'
      '<stop offset="1" stop-color="#465659" stop-opacity="0"/></linearGradient>'
      '<radialGradient id="g-pool" cx="0.5" cy="0.5" r="0.5">'
      '<stop offset="0" stop-color="' + WARM + '" stop-opacity="0.5"/>'
      '<stop offset="0.55" stop-color="' + WARM + '" stop-opacity="0.14"/>'
      '<stop offset="1" stop-color="' + WARM + '" stop-opacity="0"/></radialGradient>'
      '<radialGradient id="g-pool-teal" cx="0.5" cy="0.5" r="0.5">'
      '<stop offset="0" stop-color="#7fe6d6" stop-opacity="0.42"/>'
      '<stop offset="1" stop-color="#7fe6d6" stop-opacity="0"/></radialGradient>'
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
    for _ in range(20):
        cy = r.uniform(6, 212)
        t = cy / 230.0
        cl.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (
            f(r.uniform(-140, 1700)), f(cy), f(r.uniform(150, 360)), f(r.uniform(5, 15)),
            mix(SKY_MID, "#8497a6", 0.2 + 0.45 * t), f(0.09 + 0.16 * t)))
    for _ in range(6):       # warm underlit band just above the ridgeline
        cl.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#b87a44" opacity="%s"/>' % (
            f(r.uniform(420, 1620)), f(r.uniform(178, 236)), f(r.uniform(190, 420)),
            f(r.uniform(4, 9)), f(r.uniform(.14, .3))))
    o.append('<g filter="url(#fx-far)">%s</g>' % "".join(cl))
    o.append('<g filter="url(#fx-far)">%s</g>' % _ridge(
        3, HORIZON - 18, 122, mix("#1d3340", SKY_HORIZON, .6), 120, 260, mix("#c08a55", SKY_HORIZON, .4)))
    o.append('<g filter="url(#fx-soft)">%s</g>' % _ridge(
        8, HORIZON - 6, 84, mix("#182b36", SKY_HORIZON, .36), 90, 200, "#8d6640"))
    o.append(_ridge(21, HORIZON + 6, 46, mix("#132430", SKY_HORIZON, .16), 60, 140, None))
    return "".join(o)

# ---------------------------------------------------- ground + field work ---
def furrow_defs():
    """Three ploughing pitches so furrows keep the ground plane's perspective
    instead of printing one flat texture over the whole page."""
    out = []
    for name, pitch, ang in (("f", 11, -18), ("m", 24, -14), ("n", 52, -10)):
        out.append('<pattern id="p-fur-%s" patternUnits="userSpaceOnUse" width="%d" height="%d" '
                   'patternTransform="rotate(%d)"><rect width="%d" height="%s" fill="#000" opacity="0.5"/>'
                   '<rect y="%s" width="%d" height="%s" fill="#fff" opacity="0.22"/></pattern>' % (
                       name, pitch, pitch, ang, pitch, f(pitch * .34), f(pitch * .34), pitch, f(pitch * .2)))
    return "".join(out)

def _poly(r, x, y, hx_, hy_, n=7):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r.uniform(0.72, 1.18)
        pts.append((x + math.cos(a) * hx_ * rr, y + math.sin(a) * hy_ * rr))
    return "M " + " L ".join("%s %s" % (f(p[0]), f(p[1])) for p in pts) + " Z"

_rf = random.Random(4404)
FIELDS = []
# Tile the WHOLE ground plane with fields rather than scattering a few patches.
# Row height and cell width both grow with depth, so the patchwork obeys the
# same perspective as the road and reads as farmland instead of a green wash.
_fy = HORIZON + 6
while _fy < TOTAL_H + 140:
    _rh = 34 + 210 * depth(_fy) ** 1.05
    _fx = -320.0
    while _fx < 1920:
        _cw = (80 + 330 * depth(_fy)) * _rf.uniform(0.65, 1.75)
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
            tone = mix(_rf.choice(FIELD_TONES), ground_at(_fy), _rf.uniform(0, .35))
            tone = mix(tone, HAZE, max(0.0, .5 - depth(_fy) * 2.4))
            piece = '<path d="%s" fill="%s" opacity="%s"/>' % (d, tone, f(_rf.uniform(.55, .95)))
            if _rf.random() < 0.5:
                s_ = sc(_fy)
                pitch = "f" if s_ < 0.38 else ("m" if s_ < 1.0 else "n")
                piece += '<path d="%s" fill="url(#p-fur-%s)" opacity="%s"/>' % (d, pitch, f(_rf.uniform(.12, .3)))
            if _rf.random() < 0.4:          # hedge / treeline along a boundary
                piece += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" opacity="%s"/>' % (
                    d, shade(tone, 0.45), f(max(1.0, 3.2 * sc(_fy))), f(_rf.uniform(.25, .5)))
            FIELDS.append((y0 - 20, y1 + 20, piece))
        _fx += _cw
    _fy += _rh
_rf.shuffle(FIELDS)      # overlap order varies, so no plot looks stamped

# irrigation canals cutting across the plots — the detail that says Uzbekistan
# corridor rather than generic countryside
for _i in range(7):
    _cy = HORIZON + 84 + _i * 672 + _rf.uniform(-70, 70)
    _s = sc(_cy)
    _pts, _px = [], -260.0
    while _px < 1880:
        _pts.append((_px, _cy + _rf.uniform(-1, 1) * 90 * _s))
        _px += 240 * _s + 90
    _d = "M " + " L ".join("%s %s" % (f(a), f(b)) for a, b in _pts)
    FIELDS.append((_cy - 200 * _s, _cy + 200 * _s,
        '<path d="%s" fill="none" stroke="#0e1a18" stroke-width="%s" opacity="0.5"/>'
        '<path d="%s" fill="none" stroke="#5c8f8a" stroke-width="%s" opacity="0.3"/>' % (
            _d, f(max(2.0, 15 * _s)), _d, f(max(1.0, 7 * _s)))))

_rp = random.Random(1207)
PATCHES = []
for _ in range(46):
    py = _rp.uniform(HORIZON, TOTAL_H + 60)
    s_ = sc(py)
    PATCHES.append((py, '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (
        f(_rp.uniform(-140, 1740)), f(py), f(_rp.uniform(200, 560) * s_), f(_rp.uniform(50, 150) * s_),
        shade(ground_at(py), _rp.choice([0.58, 0.7, 1.16])), f(_rp.uniform(.1, .24)))))

def ground(y0, y1):
    a, b = max(HORIZON - 2, y0 - 90), y1 + 90
    o = ['<rect x="0" y="%s" width="1600" height="%s" fill="url(#g-ground)"/>' % (f(a), f(b - a))]
    fl = [s for (fa, fb, s) in FIELDS if fb > a - 40 and fa < b + 40]
    if fl:
        o.append('<g filter="url(#fx-edge)">%s</g>' % "".join(fl))
    px = [s for (py, s) in PATCHES if a - 460 < py < b + 460]
    if px:
        o.append('<g filter="url(#fx-blob)" opacity="0.55">%s</g>' % "".join(px))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="url(#p-mottle)" opacity="0.42"/>' % (f(a), f(b - a)))
    if a < 1170:
        o.append('<rect x="0" y="%s" width="1600" height="%s" fill="url(#g-haze)"/>' % (f(a), f(min(b, 1170) - a)))
    return "".join(o)

# ----------------------------------------------------------------- trees ----
def _canopy(r, x, y, sz):
    out = []
    for _ in range(int(4 + 4 * r.random())):
        rx = sz * r.uniform(.45, .9)
        out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (
            f(x + r.uniform(-1, 1) * sz * .75), f(y + r.uniform(-.75, .1) * sz * .7),
            f(rx), f(rx * r.uniform(.62, .95))))
    return "".join(out)

def _tree(r, x, y, sz, poplar=False):
    """One tree, split into (warp-filter id, canopy, everything else).

    The canopy needs a displacement filter to break its silhouette, but a
    filter per tree means 700+ filter passes when a section rasterises, which
    is what makes the page stutter on scroll. Returning the parts separately
    lets trees() batch every canopy that shares a filter into one group: three
    passes per section instead of seven hundred. feDisplacementMap's scale is
    in user units, so filtering the group displaces each canopy exactly as
    filtering it alone would.

    Sun is upper right, so shadows fall down and to the left.
    """
    g = ground_at(y)
    haze_t = max(0.0, 0.55 - depth(y) * 2.0)
    dark = mix(shade(g, r.uniform(.26, .44)), HAZE, haze_t)
    lit = mix(mix("#3c6b55", "#7ba888", r.uniform(0, .6)), HAZE, haze_t)
    sh = ('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#050b09" opacity="%s"/>' % (
        f(x - sz * .5), f(y + sz * .26), f(sz * (.5 if poplar else 1.0)), f(sz * .3),
        f(0.42 - haze_t * 0.5)))
    if poplar:
        body = ('<path d="M %s %s q %s %s %s %s q %s %s %s %s Z" />' % (
            f(x), f(y - sz * 2.5), f(-sz * .62), f(sz * 1.3), f(-sz * .05), f(sz * 2.5),
            f(sz * .12), f(-sz * 1.2), f(sz * .05), f(-sz * 2.5)))
        trunk = '<rect x="%s" y="%s" width="%s" height="%s" fill="#1a1d16" opacity="0.8"/>' % (
            f(x - sz * .06), f(y - sz * .3), f(sz * .12), f(sz * .3))
        rim = '<path d="M %s %s q %s %s %s %s l %s 0 Z" fill="%s" opacity="0.3"/>' % (
            f(x + sz * .02), f(y - sz * 2.45), f(sz * .34), f(sz * 1.2), f(sz * .02), f(sz * 2.4),
            f(-sz * .08), lit)
        return (None, '<g fill="%s">%s</g>' % (dark, body), sh + trunk + rim)
    trunk = '<rect x="%s" y="%s" width="%s" height="%s" fill="#1a1d16" opacity="0.75"/>' % (
        f(x - sz * .07), f(y - sz * .35), f(sz * .14), f(sz * .4))
    warp = "fx-warp1" if sz < 26 else ("fx-warp2" if sz < 64 else "fx-warp3")
    body = '<g fill="%s">%s</g>' % (dark, _canopy(r, x, y - sz * .55, sz))
    rimr = random.Random(int(abs(x) * 7 + abs(y)))
    rim = '<g fill="%s" opacity="%s">%s</g>' % (
        lit, f(r.uniform(.09, .18)), _canopy(rimr, x + sz * .3, y - sz * .95, sz * .55))
    return (warp, body, sh + trunk + rim)

def _place(r, y, side, dist_mult, sz):
    """x for a tree of half-width sz, kept clear of the carriageway."""
    x = edge(y, side) + side * dist_mult * halfw(y)
    lim = edge(y, side) + side * (sz * 1.1 + 8)
    return max(x, lim) if side > 0 else min(x, lim)

TREES = []   # (y, layer, svg)
_rt = random.Random(90210)
for _ in range(62):                       # woodland belts
    by = HORIZON + 40 + (TOTAL_H + 40 - HORIZON - 40) * (_rt.random() ** 0.82)
    side, dm = _rt.choice([-1, 1]), _rt.uniform(1.6, 7.0)
    layer = 0 if dm > 4.0 else 1
    for _ in range(int(_rt.uniform(6, 17))):
        y = by + _rt.uniform(-1, 1) * 140 * sc(by)
        sz = _rt.uniform(46, 96) * sc(y)
        x = _place(_rt, y, side, dm + _rt.uniform(-1.1, 1.1), sz)
        if -320 < x < 1920:
            TREES.append((y, layer, _tree(_rt, x, y, sz)))
for _ in range(92):                       # scattered singles and pairs
    y = HORIZON + 60 + (TOTAL_H + 60 - HORIZON - 60) * (_rt.random() ** 0.8)
    sz = _rt.uniform(38, 88) * sc(y)
    x = _place(_rt, y, _rt.choice([-1, 1]), _rt.uniform(1.5, 8.5), sz)
    if -320 < x < 1920:
        TREES.append((y, _rt.choice([0, 1, 1]), _tree(_rt, x, y, sz)))
for start, side, count in ((590, 1, 22), (710, -1, 18), (1030, 1, 16), (1430, -1, 24),
                           (1960, -1, 16), (2830, 1, 18), (3290, 1, 15), (3760, -1, 14)):
    y = float(start)                      # roadside poplar rows
    for _ in range(count):
        sz = _rt.uniform(40, 52) * sc(y)
        x = _place(_rt, y, side, _rt.uniform(1.9, 2.25), sz)
        TREES.append((y, 1, _tree(_rt, x, y, sz, poplar=True)))
        y += 58 * sc(y) + _rt.uniform(-4, 8)

def trees(layer, y0, y1, extra=""):
    """Trunks/shadows/rims first, then one group per warp filter."""
    sl = [t for t in TREES if t[1] == layer and y0 - 340 < t[0] < y1 + 340]
    if not sl:
        return ""
    out = ["".join(t[2][2] for t in sl)]
    plain = "".join(t[2][1] for t in sl if t[2][0] is None)
    if plain:
        out.append(plain)
    for wf in ("fx-warp1", "fx-warp2", "fx-warp3"):
        grp = "".join(t[2][1] for t in sl if t[2][0] == wf)
        if grp:
            out.append('<g filter="url(#%s)">%s</g>' % (wf, grp))
    return '<g%s>%s</g>' % (extra, "".join(out))

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
        _strip(a, b, -1.9, 1.9), shade(ground_at((a + b) / 2), 0.66)))
    o.append('<path d="%s" fill="#2b332c" opacity="0.9"/>' % _strip(a, b, -1.32, 1.32))
    o.append('<path d="%s" fill="url(#g-asphalt)"/>' % _strip(a, b, -1, 1))
    o.append('<g clip-path="url(#%s)">' % cid)
    #   wheel-wear bands, the strongest cue that the surface is used
    for k0, k1 in ((-0.64, -0.24), (0.24, 0.64)):
        o.append('<path d="%s" fill="url(#g-wear)"/>' % _strip(a, b, k0, k1))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="url(#p-tar)" opacity="0.45"/>' % (f(a), f(b - a)))
    o.append('</g>')
    for k in (-0.95, 0.95):
        o.append('<path d="%s" fill="#c8d6cd" opacity="0.17"/>' % _strip(a, b, k - 0.03, k + 0.03))
    y = a                                   # centre dashes, scaled by depth
    while y < b:
        s = sc(y)
        seg = max(6.0, 78 * s)
        o.append('<path d="%s" fill="#cfe0d4" opacity="0.2"/>' % _strip(y, min(b, y + seg), -0.024, 0.024, 6))
        y += seg + max(8.0, 96 * s)
    for side in (-1, 1):                # nested strips: a soft edge, no blur
        for k0, k1, op in ((1.18, 1.28, .42), (1.28, 1.36, .26), (1.36, 1.44, .12)):
            o.append('<path d="%s" fill="#050a0c" opacity="%s"/>' % (
                _strip(a, b, side * k0, side * k1), f(op)))
    return "".join(o)

def guardrail(y0, y1):
    a, b = max(HORIZON + 60, y0 - 90), min(TOTAL_H, y1 + 90)
    o = []
    for side in (-1, 1):
        o.append('<path d="%s" fill="#667874" opacity="0.42"/>' % _strip(a, b, side * 1.5, side * 1.5 - side * 0.05))
        y = a
        while y < b:
            s = sc(y)
            x, h = edge(y, side) + side * 0.5 * halfw(y), max(3.0, 30 * s)
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#404d4b" opacity="0.5"/>' % (
                f(x - max(.7, 1.8 * s)), f(y - h), f(max(1.4, 3.6 * s)), f(h)))
            y += max(14.0, 96 * s)
    return "".join(o)

def powerline(y0, y1):
    """Poles and catenary along the left verge — reads instantly as inhabited
    country rather than an empty diagram."""
    a, b = max(660.0, y0 - 260), min(3960.0, y1 + 260)
    if b <= a:
        return ""
    ys, y = [], a
    while y < b:
        ys.append(y)
        y += max(120.0, 300 * sc(y))
    o = []
    for i, y in enumerate(ys):
        s = sc(y)
        x = edge(y, -1) - 2.7 * halfw(y)
        top = y - 190 * s
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#26261f" opacity="0.85"/>' % (
            f(x - 2.4 * s), f(top), f(4.8 * s), f(190 * s)))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#26261f" opacity="0.85"/>' % (
            f(x - 22 * s), f(top + 12 * s), f(44 * s), f(3.4 * s)))
        if i:
            py = ys[i - 1]
            ps, pxx = sc(py), edge(py, -1) - 2.7 * halfw(py)
            for dx in (-16, 16):
                o.append('<path d="M %s %s Q %s %s %s %s" fill="none" stroke="#1d1f1a" '
                         'stroke-width="%s" opacity="0.5"/>' % (
                             f(pxx + dx * ps), f(py - 178 * ps), f((x + pxx) / 2 + dx * s),
                             f((y + py) / 2 - 150 * s), f(x + dx * s), f(top + 12 * s), f(max(.8, 1.5 * s))))
    return "".join(o)

# ------------------------------------------------------- prop primitives ----
def lamp(x, y, s, warm=True, mast=True, h=120):
    col = WARM if warm else "#9fe8dc"
    top = y - h * s
    o = []
    if mast:
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#1b2529"/>' % (
            f(x - 2.6 * s), f(top), f(5.2 * s), f(h * s)))
        o.append('<path d="M %s %s q %s %s %s %s" fill="none" stroke="#1b2529" stroke-width="%s"/>' % (
            f(x), f(top + 3 * s), f(9 * s), f(-1 * s), f(20 * s), f(6 * s), f(4.4 * s)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" filter="url(#fx-bloom-s)"/>' % (
        f(x + 20 * s), f(top + 9 * s), f(5 * s), f(3.4 * s), col))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool%s)"/>' % (
        f(x + 26 * s), f(y + 4 * s), f(62 * s), f(26 * s), "" if warm else "-teal"))
    o.append('<path d="M %s %s L %s %s L %s %s Z" fill="%s" opacity="0.09" filter="url(#fx-glow)"/>' % (
        f(x + 18 * s), f(top + 10 * s), f(x + 68 * s), f(y + 6 * s), f(x - 16 * s), f(y + 6 * s), col))
    return "".join(o)

def window_grid(x, y, w, h, cols, rows, lit_seed, col="#ffd9a0", lit_p=0.55):
    r = random.Random(lit_seed)
    cw, ch = w / max(1, cols), h / max(1, rows)
    dark, glow = [], []
    for i in range(cols):
        for j in range(rows):
            cell = '<rect x="%s" y="%s" width="%s" height="%s"' % (
                f(x + i * cw + cw * .2), f(y + j * ch + ch * .22), f(cw * .6), f(ch * .56))
            if r.random() < lit_p:
                glow.append(cell + ' fill="%s" opacity="%s"/>' % (col, f(r.uniform(.5, 1))))
            else:
                dark.append(cell + ' fill="#0b1418" opacity="0.85"/>')
    return "".join(dark) + ('<g filter="url(#fx-bloom-s)">%s</g>' % "".join(glow) if glow else "")

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

def props(y0, y1):
    return "".join(s for (a, b, s) in PROPS if b > y0 - 60 and a < y1 + 60)

# =========================================================================
# SCENE PROPS
# The journey has ten stages and the page is ten rows of ROW_H units, so each
# stage's landmark sits on its row's centre line, placed with R(n).
# The truck rides the road at the viewport's focus line, which means whatever
# is on screen beside it is always the landmark for the stage being read.
# Everything road-spanning is sized in u = halfw(y), so moving a prop up or
# down the page rescales it correctly for free.
# =========================================================================

# ---------------------------- row 2 · three flows: rail, air and this road --
def _flows():
    y = R(2)
    c, u, s = cx(y), halfw(y), sc(y)
    o = []
    # a rail line crossing the corridor, with a level crossing on the verge
    ry = y + 0.9 * u
    o.append('<path d="M -40 %s L 1640 %s" stroke="#20261f" stroke-width="%s" opacity="0.85"/>' % (
        f(ry + 14 * s), f(ry - 26 * s), f(max(3.0, 26 * s))))
    for rail_off in (-4.5, 4.5):
        o.append('<path d="M -40 %s L 1640 %s" stroke="#6e7d78" stroke-width="%s" opacity="0.5"/>' % (
            f(ry + 14 * s + rail_off * s), f(ry - 26 * s + rail_off * s), f(max(.8, 2.2 * s))))
    for i in range(46):                 # sleepers
        t = i / 45.0
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#2a2b22" opacity="0.6"/>' % (
            f(-40 + t * 1680), f(ry + 14 * s - t * 40 * s - 5 * s), f(max(2.0, 13 * s)), f(max(1.2, 9 * s))))
    for side in (-1, 1):                # crossing lights
        lx = c + side * u * 2.4
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#242a25"/>' % (
            f(lx), f(ry - 42 * s), f(max(1.2, 3 * s)), f(42 * s)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#e8654e" filter="url(#fx-bloom-s)"/>' % (
            f(lx + 1.5 * s), f(ry - 44 * s), f(max(1.4, 3.2 * s))))
    # an aircraft on approach, nav lights on — the third flow, stated in the sky
    ax, ay = 1180.0, 128.0
    o.append('<g opacity="0.9"><path d="M %s %s l 46 0 l 10 5 l -10 5 l -46 0 Z" fill="#23323a"/>'
             '<path d="M %s %s l 16 -20 l 7 0 l -9 20 Z" fill="#1d2a31"/>'
             '<path d="M %s %s l 16 19 l 7 0 l -9 -19 Z" fill="#1d2a31"/></g>' % (
                 f(ax), f(ay), f(ax + 14), f(ay + 2), f(ax + 14), f(ay + 8)))
    o.append('<circle cx="%s" cy="%s" r="2.6" fill="#ff5f4d" filter="url(#fx-bloom-s)"/>' % (f(ax + 30), f(ay - 16)))
    o.append('<circle cx="%s" cy="%s" r="2.6" fill="#7fffb0" filter="url(#fx-bloom-s)"/>' % (f(ax + 30), f(ay + 26)))
    o.append('<circle cx="%s" cy="%s" r="2.2" fill="#ffffff" opacity="0.85" filter="url(#fx-bloom-s)"/>'
             % (f(ax + 56), f(ay + 5)))
    return "".join(o)
prop(0, R(2, 0.62), _flows())

# ------------------------------------------------ row 3 · the border gate ---
def _gate():
    y = R(3)
    c, u, s = cx(y), halfw(y), sc(y)
    o = ['<path d="%s" fill="#333a35" opacity="0.58" filter="url(#fx-soft)"/>'
         % _strip(y - 232, y + 232, -4.6, 4.6)]
    # the apron is painted over the carriageway, so put the road back on top of
    # it — the corridor has to run visibly under the canopy, not stop at it
    o.append('<path d="%s" fill="url(#g-asphalt)"/>' % _strip(y - 226, y + 232, -1, 1))
    for k in (-0.95, 0.95):
        o.append('<path d="%s" fill="#c8d6cd" opacity="0.16"/>' % _strip(y - 226, y + 232, k - .04, k + .04))
    for k in (-0.34, 0.34):
        o.append('<path d="%s" fill="#9fb3a8" opacity="0.1"/>' % _strip(y - 196, y + 202, k - .02, k + .02))
    o.append('<path d="%s" fill="#0a0f11" opacity="0.22" filter="url(#fx-soft)"/>'
             % _strip(y + 24, y + 122, -4.4, 4.4))
    # main hall, set back behind the canopy
    hall_w, hall_h = 10.2 * u, 3.0 * u
    o.append(solid(c - hall_w / 2, y - 2.8 * u, hall_w, hall_h, 1.1 * u, "#1b272d", "#131d22", "#243440", 0.32))
    o.append(window_grid(c - hall_w / 2 + .4 * u, y - 5.2 * u, hall_w - .8 * u, 1.6 * u, 15, 2, 5, "#ffd9a0", 0.5))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#101a1f"/>' % (
        f(c - hall_w / 2), f(y - 6.2 * u), f(hall_w), f(.36 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.55" filter="url(#fx-bloom-s)"/>' % (
        f(c - hall_w / 2), f(y - 5.85 * u), f(hall_w), f(.12 * u), TEAL))
    # canopy slab over the lanes, on four columns
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#27353c"/>' % (
        f(c - 5.9 * u), f(y - 3.0 * u), f(c + 5.9 * u), f(y - 3.0 * u),
        f(c + 6.2 * u), f(y - 2.34 * u), f(c - 6.2 * u), f(y - 2.34 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#0d1418" opacity="0.85"/>' % (
        f(c - 6.2 * u), f(y - 2.34 * u), f(12.4 * u), f(.2 * u)))
    for k in (-0.9, -0.3, 0.3, 0.9):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#1e292e"/>' % (
            f(c + k * 5.9 * u - .1 * u), f(y - 2.14 * u), f(.2 * u), f(2.14 * u)))
    for k in (-0.56, 0.56):             # booths between the lanes
        bx = c + k * 5.9 * u - .33 * u
        o.append(solid(bx, y + .06 * u, .66 * u, .9 * u, .36 * u, "#1c282e", "#141d22", "#243239", 0.4))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#ffd9a0" opacity="0.8" '
                 'filter="url(#fx-bloom-s)"/>' % (f(bx + .1 * u), f(y - .66 * u), f(.45 * u), f(.33 * u)))
    for k in (-0.72, -0.24, 0.24, 0.72):   # lane floods washing the deck
        px = c + k * 5.9 * u
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
            f(px), f(y + .2 * u), f(1.3 * u), f(.45 * u)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s" filter="url(#fx-bloom-s)"/>' % (
            f(px), f(y - 2.24 * u), f(.1 * u), WARM))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c8ccc6" opacity="0.85"/>' % (
        f(c - 5.5 * u), f(y + .55 * u), f(1.75 * u), f(.09 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c8ccc6" opacity="0.7"/>' % (
        f(c + 4.15 * u), f(y - .18 * u), f(.09 * u), f(.78 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#4a5654"/>' % (
        f(c - 7.0 * u), f(y - 7.2 * u), f(.1 * u), f(7.4 * u)))
    o.append('<path d="M %s %s l %s %s l %s %s Z" fill="#2ea3c8"/>'
             '<path d="M %s %s l %s %s l %s %s Z" fill="#e8eee9"/>'
             '<path d="M %s %s l %s %s l %s %s Z" fill="#3fa66a"/>' % (
                 f(c - 6.9 * u), f(y - 7.02 * u), f(1.26 * u), f(.15 * u), f(-1.26 * u), f(.18 * u),
                 f(c - 6.9 * u), f(y - 6.84 * u), f(1.26 * u), f(.15 * u), f(-1.26 * u), f(.15 * u),
                 f(c - 6.9 * u), f(y - 6.6 * u), f(1.26 * u), f(.09 * u), f(-1.26 * u), f(.18 * u)))
    for side in (-1, 1):                # perimeter fence out to the frame edges
        o.append('<path d="M %s %s L %s %s" stroke="#3a4746" stroke-width="2" opacity="0.5" fill="none"/>' % (
            f(c + side * 6.3 * u), f(y + .35 * u), f(c + side * 24 * u), f(y - .1 * u)))
        o.append('<path d="M %s %s L %s %s L %s %s" stroke="#3d4a48" stroke-width="1.6" opacity="0.45" '
                 'fill="none"/>' % (f(c + side * 21 * u), f(y - 4.4 * u), f(c + side * 5.1 * u), f(y - 4.1 * u),
                                    f(c + side * 6.15 * u), f(y + 3.1 * u)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)" opacity="0.5"/>' % (
        f(c), f(y + .35 * u), f(7.5 * u), f(1.6 * u)))
    return "".join(o)
prop(R(3, -0.62), R(3, 0.62), _gate())

# ------------------------------- row 4 · supervised transit: portal, CCTV ---
def _portal(y, tone=None):
    c, u, s = cx(y), halfw(y), sc(y)
    col = tone or TEAL
    h = 2.7 * u
    o = ['<path d="%s" fill="#202c2e" opacity="0.55"/>' % _strip(y - 55, y + 55, -1.6, 1.6)]
    for side in (-1, 1):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#202c31"/>' % (
            f(c + side * u * 1.2 - .16 * u), f(y - h), f(.32 * u), f(h)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#2a383e"/>' % (
        f(c - u * 1.34), f(y - h - .5 * u), f(u * 2.68), f(.56 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.9" filter="url(#fx-bloom-s)"/>' % (
        f(c - u * 1.24), f(y - h + .06 * u), f(u * 2.48), f(.1 * u), col))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool-teal)"/>' % (
        f(c), f(y + 4), f(u * 1.7), f(.9 * u)))
    o.append(lamp(c - u * 2.1, y + 16, s, False, True, 210))
    return "".join(o)
prop(R(3, 0.3), R(3, 0.56), _portal(R(3, 0.42)))

def cctv(y, side, cone=True):
    c, u = cx(y), halfw(y)
    x, h = c + side * u * 2.1, 3.4 * u
    top = y - h
    o = ['<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#050b09" opacity="0.35" filter="url(#fx-soft)"/>' % (
             f(x - .5 * u), f(y + .1 * u), f(.5 * u), f(.16 * u)),
         '<rect x="%s" y="%s" width="%s" height="%s" fill="#1a2428"/>' % (f(x - .09 * u), f(top), f(.18 * u), f(h)),
         '<path d="M %s %s l %s 0" stroke="#1a2428" stroke-width="%s" fill="none"/>' % (
             f(x), f(top + .18 * u), f(-side * u), f(.14 * u)),
         '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#243036"/>' % (
             f(x - side * 1.35 * u), f(top + .06 * u), f(.62 * u), f(.3 * u), f(.08 * u)),
         '<circle cx="%s" cy="%s" r="%s" fill="%s" filter="url(#fx-bloom-s)"/>' % (
             f(x - side * 1.3 * u), f(top + .42 * u), f(.08 * u), TEAL)]
    if cone:
        o.append('<path d="M %s %s L %s %s L %s %s Z" fill="%s" opacity="0.07" filter="url(#fx-glow)"/>' % (
            f(x - side * 1.3 * u), f(top + .3 * u), f(c - u), f(y + 3 * u), f(c + u), f(y + 1.4 * u), TEAL))
    return "".join(o)
for _y, _sd in ((R(4, -0.25), -1), (R(4, 0.27), 1), (R(7, 0.15), -1), (R(8, 0.23), 1)):
    prop(_y - 300, _y + 40, cctv(_y, _sd))

def _checkpoint(y):
    c, u, s = cx(y), halfw(y), sc(y)
    h = 2.9 * u
    o = ['<path d="%s" fill="#232d2e" opacity="0.5"/>' % _strip(y - 48, y + 48, -1.5, 1.5)]
    for side in (-1, 1):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#1e2a2e"/>' % (
            f(c + side * u * 1.32 - .13 * u), f(y - h), f(.26 * u), f(h)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#26333a"/>' % (
        f(c - u * 1.42), f(y - h - .34 * u), f(u * 2.84), f(.36 * u)))
    for k in (-0.62, 0, 0.62):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#2c3a41"/>' % (
            f(c + k * u * 1.2 - .26 * u), f(y - h + .04 * u), f(.52 * u), f(.26 * u), f(.06 * u)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s" filter="url(#fx-bloom-s)"/>' % (
            f(c + k * u * 1.2), f(y - h + .4 * u), f(.07 * u), TEAL))
    o.append(lamp(c - u * 1.9, y + .1 * u, s, True, True, 200))
    o.append(lamp(c + u * 1.9, y + .1 * u, s, True, True, 200))
    return "".join(o)
prop(R(4, -0.1), R(4, 0.34), _checkpoint(R(4, 0.08)))

# ----------------------------------------- row 5 · the customs warehouse ----
def _warehouse():
    y = R(5)
    c, u, s = cx(y), halfw(y), sc(y)
    x0 = c + u * 1.9
    bw, bh, bd = 5.2 * u, 2.05 * u, 0.95 * u
    o = ['<path d="M %s %s L 1600 %s L 1600 %s L %s %s Z" fill="#252c29" opacity="0.66"/>' % (
        f(x0 - .5 * u), f(y + .9 * u), f(y + .9 * u), f(y - 3.1 * u), f(x0 + .3 * u), f(y - 3.1 * u))]
    o.append('<path d="M %s %s L 1600 %s L 1600 %s L %s %s Z" fill="#070d0e" opacity="0.4" '
             'filter="url(#fx-soft)"/>' % (f(x0 - 1.1 * u), f(y + 1.1 * u), f(y + 1.1 * u),
                                           f(y - .2 * u), f(x0 - .4 * u), f(y - .2 * u)))
    o.append(solid(x0, y - .1 * u, bw, bh, bd, "#1d282d", "#151f24", "#28353b", -0.5))
    o.append('<path d="M %s %s L %s %s L %s %s Z" fill="#314045"/>'
             % (f(x0), f(y - .1 * u - bh), f(x0 + bw / 2), f(y - .1 * u - bh - .5 * u), f(x0 + bw), f(y - .1 * u - bh)))
    for i in range(4):                  # dock doors: two shut, two open and lit
        dx = x0 + .35 * u + i * 1.2 * u
        if i in (1, 2):
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c99a4e" opacity="0.5"/>' % (
                f(dx), f(y - 1.2 * u), f(.85 * u), f(1.1 * u)))
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#ffd9a0" opacity="0.3" '
                     'filter="url(#fx-glow)"/>' % (f(dx), f(y - 1.2 * u), f(.85 * u), f(1.1 * u)))
            o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
                f(dx + .42 * u), f(y - .05 * u), f(.75 * u), f(.26 * u)))
        else:
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#131c20"/>' % (
                f(dx), f(y - 1.2 * u), f(.85 * u), f(1.1 * u)))
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#2b383e"/>' % (
                f(dx), f(y - 1.2 * u), f(.85 * u), f(.07 * u)))
    o.append(window_grid(x0 + .12 * u, y - .1 * u - bh + .2 * u, bw - .24 * u, .5 * u, 14, 1, 77, "#9fe8dc", 0.35))
    for tx, ty, tw in ((x0 - 1.75 * u, y - 1.0 * u, 1.5 * u), (x0 - 2.0 * u, y + .2 * u, 1.7 * u)):
        o.append(solid(tx, ty, tw, .55 * u, .3 * u, "#243034", "#1a2327", "#2e3d42", -0.5))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#0c1113"/>' % (f(tx), f(ty), f(tw), f(.06 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#3a4a3a"/>' % (
        f(x0 + .7 * u), f(y + .3 * u), f(.3 * u), f(.24 * u)))
    o.append('<circle cx="%s" cy="%s" r="%s" fill="#ffb24a" filter="url(#fx-bloom-s)"/>' % (
        f(x0 + .85 * u), f(y + .26 * u), f(.05 * u)))
    for lx in (x0 - 2.2 * u, x0 + 2.6 * u, x0 + 5.4 * u):
        o.append(lamp(lx, y + .6 * u, s * 0.95, True, True, 200))
    return "".join(o)
prop(R(5, -0.55), R(5, 0.36), _warehouse())

# ------------------------------------ row 6 · declaration / targeting centre -
def _declaration():
    y = R(6)
    c, u, s = cx(y), halfw(y), sc(y)
    x1 = c - u * 1.85
    bw, bh, bd = 3.4 * u, 2.0 * u, 0.5 * u
    o = ['<path d="M 0 %s L %s %s L %s %s L 0 %s Z" fill="#242b28" opacity="0.66"/>' % (
        f(y + .8 * u), f(x1 + .35 * u), f(y + .8 * u), f(x1 - .35 * u), f(y - 2.6 * u), f(y - 2.6 * u))]
    o.append('<path d="M 0 %s L %s %s L %s %s L 0 %s Z" fill="#070d0e" opacity="0.42" filter="url(#fx-soft)"/>'
             % (f(y + 1.0 * u), f(x1 + .1 * u), f(y + 1.0 * u), f(x1 - .5 * u), f(y - .1 * u), f(y - .1 * u)))
    o.append(solid(x1 - bw, y - .15 * u, bw, bh, bd, "#16232a", "#101a20", "#223038", 0.5))
    o.append(window_grid(x1 - bw + .08 * u, y - .15 * u - bh + .1 * u, bw - .16 * u, bh - .2 * u,
                         9, 5, 91, "#bfe6ff", 0.62))
    for i in range(1, 5):               # spandrels read as a glass curtain wall
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#0e161b" opacity="0.9"/>' % (
            f(x1 - bw), f(y - .15 * u - bh + i * bh / 5), f(bw), f(.05 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#2c3c44"/>' % (
        f(x1 - bw - .06 * u), f(y - .15 * u - bh - .09 * u), f(bw + .12 * u), f(.09 * u)))
    o.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" fill="#243139"/>' % (
        f(x1 - 1.0 * u), f(y - .15 * u), f(x1 + .2 * u), f(y - .15 * u),
        f(x1 + .2 * u), f(y - .5 * u), f(x1 - 1.0 * u), f(y - .5 * u)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
        f(x1 - .4 * u), f(y - .05 * u), f(.95 * u), f(.28 * u)))
    r = random.Random(55)
    for i in range(7):                  # car park
        px, py = x1 - bw + .25 * u + i * .46 * u, y + .38 * u
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" opacity="0.9"/>' % (
            f(px), f(py), f(.32 * u), f(.16 * u), f(.05 * u), r.choice(["#1e262b", "#232c31", "#1a2126"])))
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#2c363c"/>' % (
            f(px + .06 * u), f(py - .05 * u), f(.2 * u), f(.06 * u), f(.02 * u)))
    for lx in (x1 - bw - .25 * u, x1 - .5 * u, x1 + .3 * u):
        o.append(lamp(lx, y + .65 * u, s * 0.9, True, True, 190))
    return "".join(o)
prop(R(6, -0.53), R(6, 0.34), _declaration())

# --------------------------------------------------------- row 7 · release --
prop(R(7, -0.13), R(7, 0.15), _portal(R(7), "#57e08a"))

def _release_plaza():
    y = R(7)
    c, u, s = cx(y), halfw(y), sc(y)
    o = ['<path d="%s" fill="#242b28" opacity="0.45" filter="url(#fx-soft)"/>' % _strip(y - 182, y + 182, -2.9, 2.9)]
    o.append(solid(c + u * 2.0, y + .4 * u, 1.9 * u, .95 * u, .45 * u, "#1d282d", "#151f24", "#28353b", -0.5))
    o.append(window_grid(c + u * 2.1, y - .5 * u, 1.7 * u, .5 * u, 5, 1, 33, "#ffd9a0", 0.7))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#g-pool)"/>' % (
        f(c + u * 2.7), f(y + .55 * u), f(1.7 * u), f(.5 * u)))
    for lx in (c - u * 2.6, c + u * 4.3):
        o.append(lamp(lx, y + .5 * u, s * 0.9, True, True, 190))
    return "".join(o)
prop(R(7, -0.4), R(7, 0.4), _release_plaza())

# ---------------------- row 8 · post-clearance audit: the importer's premises -
def _premises():
    y = R(8)
    c, u, s = cx(y), halfw(y), sc(y)
    x1 = c - u * 2.0
    o = ['<path d="M 0 %s L %s %s L %s %s L 0 %s Z" fill="#232a27" opacity="0.58"/>' % (
        f(y + 1.2 * u), f(x1 + .4 * u), f(y + 1.2 * u), f(x1 - .2 * u), f(y - 2.4 * u), f(y - 2.4 * u))]
    o.append(solid(x1 - 3.6 * u, y - .2 * u, 3.6 * u, 1.5 * u, .55 * u, "#1a252a", "#131c21", "#25333a", 0.5))
    o.append(window_grid(x1 - 3.5 * u, y - 1.6 * u, 3.4 * u, 1.2 * u, 8, 3, 17, "#ffd9a0", 0.45))
    o.append(solid(x1 - 6.4 * u, y - .1 * u, 2.6 * u, 1.0 * u, .4 * u, "#1c2429", "#141b1f", "#26313a", 0.5))
    for i in range(3):                  # a small yard with stacked containers
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.9"/>' % (
            f(x1 - 2.6 * u + i * .8 * u), f(y + .35 * u), f(.7 * u), f(.3 * u),
            ["#2c4a4a", "#4a3a2c", "#33403a"][i]))
    for lx in (x1 - 6.8 * u, x1 - 3.0 * u, x1 - .4 * u):
        o.append(lamp(lx, y + .8 * u, s * 0.85, True, True, 180))
    return "".join(o)
prop(R(8, -0.55), R(8, 0.38), _premises())

# ------------------------------------------------------ row 9 · passengers --
def _airport():
    y = R(9)
    c, u, s = cx(y), halfw(y), sc(y)
    x0 = c + u * 2.1
    o = ['<path d="M %s %s L 1600 %s L 1600 %s L %s %s Z" fill="#262d2b" opacity="0.6"/>' % (
        f(x0 - .4 * u), f(y + 1.4 * u), f(y + 1.4 * u), f(y - 2.6 * u), f(x0 + .2 * u), f(y - 2.6 * u))]
    # apron markings
    for i in range(6):
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#c9cfae" opacity="0.16"/>' % (
            f(x0 + .3 * u + i * .9 * u), f(y - 2.2 * u), f(.08 * u), f(3.4 * u)))
    o.append(solid(x0 + .2 * u, y + 1.0 * u, 5.2 * u, 1.1 * u, .5 * u, "#1b262c", "#141d22", "#26333b", -0.5))
    o.append(window_grid(x0 + .35 * u, y + .1 * u, 4.9 * u, .7 * u, 16, 1, 61, "#cfe6ff", 0.7))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#202c33"/>' % (   # control tower
        f(x0 + 4.7 * u), f(y - 1.9 * u), f(.34 * u), f(2.0 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#2b3b44"/>' % (
        f(x0 + 4.42 * u), f(y - 2.25 * u), f(.9 * u), f(.42 * u), f(.1 * u)))
    o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#bfe6ff" opacity="0.7" '
             'filter="url(#fx-bloom-s)"/>' % (f(x0 + 4.5 * u), f(y - 2.16 * u), f(.74 * u), f(.2 * u)))
    # a widebody on stand, seen from behind
    ax, ay = x0 + 1.9 * u, y - 1.1 * u
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#050b09" opacity="0.4" filter="url(#fx-soft)"/>' % (
        f(ax - .3 * u), f(ay + .5 * u), f(2.3 * u), f(.5 * u)))
    o.append('<path d="M %s %s l %s 0 q %s %s %s %s l 0 %s q %s %s %s %s Z" fill="#a9b3b1"/>' % (
        f(ax - 1.9 * u), f(ay), f(3.0 * u), f(.5 * u), f(0), f(.5 * u), f(.34 * u),
        f(-.02 * u), f(-.5 * u), f(.02 * u), f(-3.5 * u), f(0)))
    o.append('<path d="M %s %s l %s %s l %s %s l %s %s Z" fill="#949e9c"/>' % (
        f(ax - .5 * u), f(ay + .1 * u), f(-.35 * u), f(-1.5 * u), f(.5 * u), f(0), f(.5 * u), f(1.5 * u)))
    o.append('<path d="M %s %s l %s %s l %s %s l %s %s Z" fill="#949e9c"/>' % (
        f(ax - .5 * u), f(ay + .26 * u), f(-.35 * u), f(1.5 * u), f(.5 * u), f(0), f(.5 * u), f(-1.5 * u)))
    o.append('<path d="M %s %s l %s %s l %s %s Z" fill="#6b8698"/>' % (
        f(ax - 1.75 * u), f(ay + .05 * u), f(-.15 * u), f(-.95 * u), f(.55 * u), f(.95 * u)))
    for lx in (x0 + .6 * u, x0 + 2.9 * u, x0 + 5.1 * u):
        o.append(lamp(lx, y + 1.5 * u, s * 0.8, True, True, 210))
    for i in range(5):                  # approach lights out over the fields
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#bfe6ff" opacity="0.8" filter="url(#fx-bloom-s)"/>' % (
            f(x0 - 1.0 * u), f(y - 2.6 * u - i * .7 * u), f(.07 * u)))
    return "".join(o)
prop(R(9, -0.68), R(9, 0.38), _airport())

# ------------------------------------------------ row 10 · into the capital --
def _overpass():
    y = R(10, -0.6)
    c, u = cx(y), halfw(y)
    o = ['<path d="%s" fill="#070d0f" opacity="0.55" filter="url(#fx-soft)"/>'
         % _strip(y + .3 * u, y + .95 * u, -1.35, 1.35)]
    for side in (-1, 1):                # piers outside the shoulders
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#1b2427"/>' % (
            f(c + side * u * 1.55 - .16 * u), f(y - .05 * u), f(.32 * u), f(1.1 * u)))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="#243033"/>' % (f(y - .34 * u), f(.4 * u)))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="#141c1f"/>' % (f(y + .06 * u), f(.09 * u)))
    o.append('<rect x="0" y="%s" width="1600" height="%s" fill="#4a5a5e" opacity="0.7"/>' % (f(y - .55 * u), f(.04 * u)))
    for i in range(46):                 # railing
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#38464a" opacity="0.75"/>' % (
            f(i * 35 + 8), f(y - .53 * u), f(.03 * u), f(.2 * u)))
    for lx in (c - u * 1.55, c + u * 1.55):
        o.append(lamp(lx, y - .36 * u, sc(y) * 0.75, True, True, 150))
    return "".join(o)
prop(R(10, -0.85), R(10, -0.35), _overpass())

def _city():
    o = ['<rect x="0" y="4150" width="1600" height="660" fill="url(#g-citylight)"/>']
    r = random.Random(808)
    far = []
    for i in range(30):                 # hazed skyline behind the near blocks
        bx, bw = r.uniform(-60, 1560), r.uniform(46, 128)
        bh = r.uniform(80, 290)
        far.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (
            f(bx), f(4400 - bh), f(bw), f(bh), mix("#16242c", "#31555c", r.uniform(.1, .45))))
        far.append(window_grid(bx + 4, 4406 - bh, bw - 8, bh - 10, max(2, int(bw / 22)),
                               max(3, int(bh / 30)), i, "#cfe6ff", 0.3))
    o.append('<g filter="url(#fx-soft)" opacity="0.9">%s</g>' % "".join(far))
    tx = 1486.0                         # Tashkent TV tower
    o.append('<path d="M %s 4440 L %s 4080 L %s 4080 L %s 4440 Z" fill="#1a262c"/>' % (
        f(tx - 24), f(tx - 6), f(tx + 6), f(tx + 24)))
    o.append('<ellipse cx="%s" cy="4074" rx="40" ry="15" fill="#22323a"/>' % f(tx))
    o.append('<ellipse cx="%s" cy="4060" rx="27" ry="11" fill="#2b3f47"/>' % f(tx))
    o.append('<rect x="%s" y="4014" width="3.6" height="44" fill="#22323a"/>' % f(tx - 1.8))
    o.append('<circle cx="%s" cy="4012" r="4.5" fill="#ff6b5a" filter="url(#fx-bloom-s)"/>' % f(tx))
    o.append('<g filter="url(#fx-bloom-s)"><rect x="%s" y="4068" width="64" height="3" fill="#9fe8dc" '
             'opacity="0.8"/></g>' % f(tx - 32))
    for side in (-1, 1):                # near blocks flanking the avenue
        for j in range(4):
            y = 4430 + j * 108
            c, u = cx(y), halfw(y)
            bw, bh = r.uniform(1.3, 2.1) * u, r.uniform(1.3, 2.2) * u
            bx = (c - u * 1.75 - bw) if side < 0 else (c + u * 1.75)
            o.append(solid(bx, y + .7 * u, bw, bh, .38 * u, "#141f25", "#0e171c", "#1e2c33", -0.5 * side))
            o.append(window_grid(bx + .05 * u, y + .7 * u - bh + .08 * u, bw - .1 * u, bh - .16 * u,
                                 max(3, int(bw / 34)), max(3, int(bh / 42)), int(y + side), "#ffd9a0", 0.5))
    for j in range(8):                  # avenue lighting + wet-asphalt streaks
        y = 4300 + j * 72
        c, u, s = cx(y), halfw(y), sc(y)
        for side in (-1, 1):
            o.append(lamp(c + side * u * 1.45, y, s * 0.85, True, True, 175))
            o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="0.09" '
                     'filter="url(#fx-near)"/>' % (f(c + side * u * .95), f(y), f(.05 * u), f(1.4 * u), WARM))
    o.append('<rect x="0" y="4720" width="1600" height="90" fill="#060c0e" opacity="0.45" filter="url(#fx-near)"/>')
    return "".join(o)
prop(R(10, -0.65), R(10, 0.6), _city())

# ------------------------------------------------- farm sheds in the fields -
_rs = random.Random(7717)
for _sy, _sx in ((900, 260), (1540, 1390), (2390, 210), (2990, 1440), (3850, 150)):
    _s = sc(_sy)
    _w, _h = _rs.uniform(90, 160) * _s, _rs.uniform(34, 58) * _s
    _shed = solid(_sx, _sy, _w, _h, _h * .5, "#202722", "#171d1a", "#2a332a", -0.5)
    _shed += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#050b09" opacity="0.35" filter="url(#fx-soft)"/>' % (
        f(_sx - _w * .2), f(_sy + _h * .12), f(_w * .7), f(_h * .3))
    _shed += '<rect x="%s" y="%s" width="%s" height="%s" fill="#ffd9a0" opacity="0.55" filter="url(#fx-bloom-s)"/>' % (
        f(_sx + _w * .2), f(_sy - _h * .6), f(_w * .12), f(_h * .22))
    prop(_sy - 120, _sy + 50, _shed)

# foreground framing: a few big, slightly-blurred trees hugging the frame edges
for _ in range(10):
    _y = _rt.uniform(4370, 4855)
    _sz = _rt.uniform(70, 130) * sc(_y)
    _x = _rt.choice([_rt.uniform(-140, 90), _rt.uniform(1510, 1740)])
    TREES.append((_y, 2, _tree(_rt, _x, _y, _sz)))

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
    return ('<rect x="0" y="%s" width="1600" height="52" fill="%s" opacity="0.5" filter="url(#fx-far)"/>'
            % (f(HORIZON - 24), mix(SKY_HORIZON, "#6d5238", .3)))

# --------------------------------------------------------------- assembly --
def section(idx):
    y0, y1 = idx * SECTION_H, (idx + 1) * SECTION_H
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 %d %d %d">'
        % (W, SECTION_H, y0, W, SECTION_H),
        '<title>Uzbekistan customs corridor, section %d of %d</title>' % (idx + 1, N_SECTIONS),
        defs().replace("</defs>", furrow_defs() + "</defs>"),
        '<rect x="0" y="%d" width="%d" height="%d" fill="%s"/>' % (y0, W, SECTION_H, ground_at(y0 + 500)),
        sky(y0, y1),
        ground(y0, y1),
        horizon_glow(y0),
        trees(0, y0, y1, ' filter="url(#fx-soft)" opacity="0.9"'),
        road(idx, y0, y1),
        guardrail(y0, y1),
        powerline(y0, y1),
        trees(1, y0, y1),
        props(y0, y1),
        trees(2, y0, y1, ' filter="url(#fx-near)"'),
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
