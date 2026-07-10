# Explore — the palette (shared across all six sections)

One palette, documented here, reused **verbatim** by every section and every phase.
It is the reference instance for Phases B–F — do not invent new hues per section.

## Anchor + categorical set

The anchor is **WCO blue `#2F6DB5`** (the same accent the story uses). The
categorical set is the **Okabe–Ito** colourblind-safe palette with its blue slot
swapped for the WCO anchor — a restrained, no-neon set that stays legible for
deuteranopia, protanopia and tritanopia.

Assign hues **in this fixed order, by entity, never cycled.** A 9th series is never
a generated hue — it folds into "Other" or a small-multiple.

| # | Hex | Name | Role |
|---|-----|------|------|
| 1 | `#2F6DB5` | WCO blue | anchor / primary series |
| 2 | `#E69F00` | amber | |
| 3 | `#009E73` | green | |
| 4 | `#CC79A7` | mauve | |
| 5 | `#D55E00` | vermillion | |
| 6 | `#56B4E9` | sky | |
| 7 | `#8C6BB1` | violet | |
| 8 | `#B23A3A` | brick | |

Context / reference / previous-year series: **gray `#8A8F9A`**.
Map "no value": **`#ECEEF1`**. Up/down deltas (paired with an arrow + label, never
colour alone): green `#2E8B57` / red `#C1503A`.

## Sequential ramp (choropleths + heatgrids)

Single hue, light → dark, so magnitude reads honestly (never a rainbow):

```
#EAF2FA  (pale)  →  #2F6DB5  (WCO blue)  →  #1B4A82  (deep)
```

Exposed as `ITR.ramp(t)`, `t∈[0,1]`. Because case counts are extremely skewed
(one country/region dominates), choropleth applies a √ transform (`gamma 0.5`) and
heatgrids a `gamma 0.6` **to the position on the ramp only** — the hue stays a
single monotonic-lightness scale, so it remains an honest sequential encoding. The
transform is disclosed in the chart caption and in `DATA_NOTES.md`.

## Validation

Validated with the dataviz skill's `validate_palette.js` (light mode, surface
`#FCFCFB`):

```
[PASS] Lightness band    all 8 inside L 0.43–0.77
[PASS] Chroma floor      all 8 >= 0.1
[PASS] CVD separation    worst adjacent ΔE 17.6 (deuteranopia)   [target ≥ 12]
[WARN] Contrast vs surface   3 lighter hues < 3:1
```

The contrast WARN is discharged by the design language itself: **every mark carries
a direct value label** (the tool never relies on a fill against the white card for
identity), and legends name every series — so identity is never colour-alone.

## Reuse rule for Phases B–F

- Multi-series categorical → `ITR.catColor(i)` in entity order.
- Magnitude (map / heatgrid) → `ITR.ramp(t)`, single hue, honest.
- Previous-year / context → `#8A8F9A`.
- Never add a section-specific hue. If a section needs a 9th category, collapse to
  "Other" or split into small multiples.
