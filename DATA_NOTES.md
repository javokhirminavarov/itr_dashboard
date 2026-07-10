# DATA_NOTES — reconciliation of the e-commerce hero figures

Every number in the hero spectrum (`data/ecom_spectrum.json`) traces to a single
source: `data/itr_drill.json` at path `<section>/<flow>/ecom`. This note records the
one genuine conflict we resolved and the other cross-checks we ran.

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
