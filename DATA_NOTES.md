# DATA_NOTES — reconciliation of the e-commerce figures

Every number in the hero spectrum (`data/ecom_spectrum.json`) traces to a single
source: `data/itr_drill.json` at path `<section>/<flow>/ecom`. This note records the
one genuine conflict we resolved and the other cross-checks we ran.

> **Step 2 additions** (scrollytelling data files) are documented at the bottom of
> this file under "Step 2 — new data files". The reconciliation below is unchanged
> from Step 1.

## Resolved: NPS e-commerce share = **81.9%**

The New Psychoactive Substances (NPS) e-commerce share appears as two different
values in the extracted data:

| Value | Where | Nature |
|-------|-------|--------|
| **81.9%** | `data/itr_drill.json` → `Drugs/New Psychoactive Substances/ecom` | Granular, cases-basis. Backed by realistic quantity (82,426.5 kg) and full country / route / detection breakdowns. This is what the live drill-down UI renders. |
| 82.7% | `data/cfg_REPORT.json` → `ecommerce.byCommodity[0].v` (and the fabricated `DRILL_FALLBACK` demo block, and Drugs `secSummaries` prose) | A hardcoded summary-chart / prose figure. |

**We use 81.9%.** Reasoning:

1. **It is the value in the instructed authoritative source** (`itr_drill.json`,
   `<section>/<flow>/ecom`) and is what the drill-down UI actually renders.
2. **It is an isolated discrepancy, not a methodology difference.** The other seven
   `byCommodity` entries match `itr_drill.json` *exactly* — IPR 68.2, Medical 65.1,
   Cannabis 62.6, Psychotropic 57.5, Khat 55, Environmental Crime 23.9, Security 23.6.
   Only NPS diverges. A real denominator/basis change would move the others too; it
   doesn't. So 82.7 is a stale/rounding artifact carried in the summary array, not a
   defensible alternate measure.
3. **The report contradicts itself on 82.7 but is consistent on 81.9.** The report's
   own "shifts" narrative states "81.9% e-commerce (cases)". The 82.7% prose pairs NPS
   with cannabis 63.1% and psychotropic 58.1%, yet the chart those same commodities
   feed renders 62.6% and 57.5%. 81.9 is the internally coherent figure.

Note: the *live* dashboard is itself inconsistent — the e-commerce beat's `byCommodity`
chart shows 82.7% while the Drugs drill-down shows 81.9%. The reconciled hero uses
81.9% for the entire spectrum so every bar shares one basis and one source.

## Other mismatches found

- **Cannabis (prose only):** Drugs `secSummaries` prose says **63.1%**; both
  `itr_drill.json` and the `byCommodity` chart say **62.6%**. Spectrum uses 62.6%.
- **Psychotropic substances (prose only):** prose says **58.1%**;
  `itr_drill.json` and the chart say **57.5%**. Spectrum uses 57.5%.
  (Both are narrative-text rounding drift, not data disagreements — the charts and the
  drill data agree.)

## Cross-checks that reconcile cleanly (no mismatch)

- **Global e-commerce share = 44.8%.** `REPORT.ecommerce.sharePct` = 44.8 **and**
  `data/itr_global.json` = 44.8. Consistent.
- **Six section-level shares** (from `itr_drill.json` `<section>/__all__/ecom`):

  | Section | share |
  |---------|-------|
  | AML/CTF | 1.0% |
  | Drugs | 59.9% |
  | Environmental Crime | 23.9% |
  | IPR, Health and Safety | 67.8% |
  | Revenue | 5.6% |
  | Security | 23.6% |

  Cross-check against `REPORT`: the `byCommodity` array carries Environmental Crime
  23.9% and Security 23.6% (match); Drugs 59.9% appears in `secSummaries` prose
  (match). No mismatch.

## Why the spectrum has 21 rows, not the original 8

The original e-commerce `byCommodity` chart shows only 8 items and silently omits
**Flora (64.2%)** — which outranks Cannabis (62.6%). The reconciled spectrum ranks all
21 flow-level commodities (every `<section>/<flow>` with an `ecom` value, excluding the
`__all__` section aggregates), so the full 81.9% → 0% range is shown honestly rather
than a curated top slice.

---

# Step 2 — new data files (scrollytelling)

Four new files back the guided story. Each figure is traced to source below.

## `data/ecom_by_section.json` — the six section-level shares

Sorted descending, taken verbatim from `itr_drill.json` `<section>/__all__/ecom`:

| Section | share | sourcePath |
|---|---|---|
| IPR, Health and Safety | 67.8 | `IPR, Health and Safety/__all__/ecom` |
| Drugs | 59.9 | `Drugs/__all__/ecom` |
| Environmental Crime | 23.9 | `Environmental Crime/__all__/ecom` |
| Security | 23.6 | `Security/__all__/ecom` |
| Revenue | 5.6 | `Revenue/__all__/ecom` |
| AML/CTF | 1.0 | `AML/CTF/__all__/ecom` |

Each row also carries a `members` array — the commodity flows that belong to the
section, derived from the `section` field already present in `ecom_spectrum.json`.
This is the **section→commodity grouping** that drives the beat 2→3 "explode"
transition. `members` holds commodity *names only*; the shares stay single-sourced in
`ecom_spectrum.json` so the two files cannot drift.

## `data/ecom_by_region.json` — the six regional shares

Sorted descending, from `itr_global.json` `regions[].ecom` (the instructed source):

| Region | share | note |
|---|---|---|
| Americas (AMS) | 68.0 | |
| Europe (EUR) | **45.5** | `itr_global.json` says 45.5; `REPORT.ecommerce.byRegion` says 45.4. We use the `itr_global.json` value (45.5) as instructed; the 0.1 gap is display rounding, not a data disagreement. |
| Asia / Pacific (A/P) | 27.9 | |
| East & Southern Africa (ESA) | 22.7 | |
| MENA | 1.5 | |
| West & Central Africa (WCA) | 0.6 | |

## `data/ecom_subcommodity_extremes.json` — beat-4 annotations

The sharpest single sub-commodity figures, each confirmed against source:

| Label | share | source |
|---|---|---|
| Urogenital agents | **91.0** | `itr_iprhs.json` `perStream/Medical products trafficking/ecomByCommodity` → *Urogenital Agents* (`pct`). Highest single sub-commodity share in the report. |
| Gun silencers | **85.1** | `itr_sec.json` `perStream/Weapons, ammunition and tactical equipment/commerceByCommodity` → *Silencer* (`parts."e-commerce"`); assault rifle in the same table is 2.3. |
| Firearm receivers | **69.5** | same weapons table → *Receiver*. The serialised, regulated part — mailed as a component. |
| Nervous-system agents | **63.3** | medical table → *Nervous System Agents*. |
| E-cigarettes | **63.8** | `itr_rev.json` `perStream/Tobacco products trafficking/ecomByCommodity` → *E-cigarettes* (`pct`); bulk *Cigarettes* in the same table are **1.1** — the contrast is the point. |

Note: two shapes in source — Weapons uses `commerceByCommodity.rows[].parts["e-commerce"]`;
Medical/Tobacco use `ecomByCommodity[].pct`. Both are e-commerce case shares.

## `data/iso3_to_wco_region.json` — country → WCO region (DERIVED)

**This is a derived artifact.** The extracted dashboard config has no country→region
map — `REGION_CFG` names the six regions but the live choropleths colour by
*per-country* values, not by region membership, so no such lookup was ever baked in.
We constructed the map from **public WCO regional membership** (the WCO's six
Vice-Chair regions: AMS, A/P, EUR, ESA, WCA, MENA) and keyed it to the 176 ISO-3
codes present in `world_map_paths.json`. Flat `{ISO3: regionCode}`.

Coverage: **175 / 176** map countries placed. Region counts: EUR 52, A/P 30, AMS 30,
ESA 23, WCA 22, MENA 18.

Placement decisions worth flagging (WCO regions do not follow continents):
- **Central Asia & the Caucasus → EUR.** KAZ, KGZ, TJK, TKM, UZB, ARM, AZE, GEO all
  sit in the WCO **Europe** region, as do TUR and ISR.
- **Territories mapped to their administering member's region:** GRL (Greenland,
  Danish) → EUR; PRI (Puerto Rico) → AMS; NCL (New Caledonia, French) → A/P; FLK
  (Falklands) → AMS. Geographically some sit elsewhere; WCO membership follows the
  administering customs authority.
- **Disputed / non-standard codes:** ESH (Western Sahara) → MENA (administered by
  Morocco); SOL (Somaliland, a non-ISO code used by the map geometry) → ESA with
  Somalia; CYN (Northern Cyprus) → EUR; KOS (Kosovo) → EUR; PSE (Palestine) → MENA.
- **Sudan (SDN) → ESA** and **Mauritania (MRT) → WCA**, following WCO's African
  regional split (which is not the UN's). **Mauritania → WCA is confirmed.**
  **Sudan → ESA is PENDING external verification** — the assignment is left as-is
  in the lookup but awaits confirmation against WCO's official regional membership
  list; if WCO places Sudan in MENA rather than ESA, `iso3_to_wco_region.json`
  (key `SDN`) must be updated accordingly.

**Unplaced (1):** `ATF` — French Southern & Antarctic Lands. Uninhabited, no customs
administration and no WCO region; the choropleth renders it in the neutral "no-region"
fill. This is the only gap.

Rebuild scripts for all four files live in the scratchpad (`gen_data.py`,
`gen_map.py`) and read straight from the source JSON, so every figure is reproducible.
