# STORYBOARD — narrative candidates for the ITR 2025 guided data story

Storyboarding + data-surfacing step. **No code.** Raw material for the two
strongest marquee-narrative candidates, drawn entirely from the already-extracted
data in `/data`. Every figure below is tagged with the file/path it lives in so we
can wire it up later.

Provenance shorthand:
- `itr_<key>.json` = a top-level slice of `window.ITR_DATA` (e.g. `itr_drugs.json`, `itr_global.json`).
- `drill/<section>/<flow>` = `itr_drill.json` (per-flow country/route/quantity/detection/**ecom**).
- `REPORT.*`, `DRUGTX.*`, `CASE_STUDIES.*` = narrative text in `config_bundle.json` / `cfg_*.json`.

---

# CANDIDATE A — "The e-commerce shift" (cross-cutting)

### Big Idea
> **In 2025, e-commerce quietly became the primary logistics channel for illicit
> trade — 44.8 % of all cases now move through parcels and mail — but its grip
> ranges from near-total (synthetic drugs, counterfeit goods, gun silencers) to
> almost nil (bulk alcohol, cash, waste), and that spread *is* the story.**

### The complete e-commerce figure inventory

**Global anchor** — `itr_global.json → totals.ecom` / `REPORT.ecommerce`
| Figure | Value | Location |
|---|---|---|
| Global e-commerce case share | **44.8 %** | `global.totals.ecom` (also `totalsAll.ecom`, `REPORT.ecommerce.sharePct`) |
| E-commerce cases (count) | **73,371** | `REPORT.ecommerce.cases` |

**By region** — `itr_global.json → regions[].ecom` (mirrored in `REPORT.ecommerce.byRegion`)
| Region | E-commerce share |
|---|---|
| Americas (AMS) | **68.0 %** |
| Europe (EUR) | 45.4–45.5 % |
| Asia/Pacific (A/P) | 27.9 % |
| East & Southern Africa (ESA) | 22.7 % |
| MENA | 1.5 % |
| West & Central Africa (WCA) | 0.6 % |

**By section** — `itr_drill.json → <section>/__all__/ecom` (Env/IPR/Rev also in `itr_<key>.json → perStream`)
| Section | E-commerce share |
|---|---|
| IPR, Health and Safety | **67.8 %** |
| Drugs | 59.9 % |
| Environmental Crime | 23.9 % |
| Security | 23.6 % |
| Revenue | 5.6 % |
| AML/CTF | 1.0 % |

**By commodity / flow** — `itr_drill.json → <section>/<flow>/ecom` (drug values also in `itr_drugs.json → perDrug`)
| Commodity (flow) | Section | E-commerce share |
|---|---|---|
| NPS (new psychoactive substances) | Drugs | **81.9 %** *(drill)* — reported as **82.7 %** in `REPORT.ecommerce.byCommodity` ⚠ reconcile |
| IPR products | IPR | 68.2 % |
| Medical products | IPR | 65.1 % |
| Flora (wildlife/timber) | Env Crime | 64.2 % |
| Cannabis | Drugs | 62.6 % |
| Psychotropic substances | Drugs | 57.5 % |
| Khat | Drugs | 55.0 % |
| Opioids & opiates | Drugs | 34.4 % |
| Cocaine | Drugs | 32.1 % |
| Weapons / ammunition | Security | 27.1 % |
| Fauna | Env Crime | 20.1 % |
| Explosives & precursors | Security | 18.5 % |
| Tobacco | Revenue | 6.0 % |
| Gemstones | AML | 5.0 % |
| Cash smuggling | AML | 1.0 % |
| UAS (drones) | Security | 0.8 % |
| ODS & HFCs | Env Crime | 0.6 % |
| Alcohol | Revenue | 0.5 % |
| Gold | AML | 0.4 % |
| Waste | Env Crime | 0.2 % |
| Other hazardous materials | Env Crime | 0.0 % |

**Sub-commodity extremes** (the sharpest single numbers, great for a "how deep does it go" beat):
- `itr_iprhs.json → Medical.../ecomByCommodity`: **Urogenital agents 91 %**, Metabolic agents 77 %, Nervous-system agents 63.3 %.
- `itr_iprhs.json → IPR products/ecomByCommodity`: Accessories 78 %, Footwear 75.2 %, Clothing 73.9 %, Watches 73.8 %.
- `itr_sec.json → Weapons.../commerceByCommodity`: **Silencer 85.1 %**, Receiver 69.5 % (vs assault rifle 2.3 %, ammunition 3.7 %).
- `itr_rev.json → Tobacco/ecomByCommodity`: Raw tobacco 64.7 %, **E-cigarettes 63.8 %** (vs bulk cigarettes near 0).

### Commodity ranking, most → least e-commerce-driven
The dashboard's own headline ranking (`REPORT.ecommerce.byCommodity`, the 8 bars it charts):
1. NPS (drugs) — 82.7 %
2. IPR products — 68.2 %
3. Medical products — 65.1 %
4. Cannabis — 62.6 %
5. Psychotropic substances — 57.5 %
6. Khat — 55.0 %
7. Environmental Crime — 23.9 %
8. Security — 23.6 %

Fuller drill-level ranking (all 21 flows) is the table above — headline top is
**NPS → IPR → Medical → Flora → Cannabis**; floor is **alcohol / gold / waste ≈ 0 %**.

### Story arc (7 beats)
1. **Hook** — One number, full-bleed: *44.8 % of all illicit-trade cases in 2025 moved through e-commerce.* Near-parity with physical trade. (`global.totals.ecom`)
2. **It's everywhere** — Zoom out to all six sections; even the "low" sections aren't zero. Point: this is structural, not a niche. (section table)
3. **But wildly uneven** — Rank the commodities on one axis from 82 % down to ~0 %. Point: the average hides a spectrum. (commodity table)
4. **The synthetic/counterfeit ceiling** — NPS 81.9 %, IPR 68 %, medical 65 %, cannabis 63 %: small, high-value, mailable goods live online. Point: *if it fits in a parcel, it ships like retail.* (drill + sub-commodity extremes)
5. **The bulk-goods floor** — Alcohol 0.5 %, gold 0.4 %, waste 0.2 %, cash 1 %, cigarettes ~0: weight and volume keep trade physical. Point: *the exceptions prove the logic.*
6. **Geography follows infrastructure** — Americas 68 % vs MENA 1.5 % / WCA 0.6 %. Point: e-commerce dominance tracks parcel/postal maturity, not crime intensity. (`regions[].ecom` + `REPORT.ecommerce.note`)
7. **Why it matters / close** — The single silencer stat (85 %) or urogenital-drug stat (91 %) as a kicker; land on the enforcement implication (postal risk-profiling as a core competency). (`REPORT.conclusion.priorities[0]`)

### Narrative text already written (usable verbatim)
- **Headline** (`REPORT.ecommerce.headline`): *"In 2025, e-commerce channels accounted for 73,371 cases globally, 44.8% of all ITR cases. This near parity between online and physical trade reflects a structural transformation that cuts across every section and region."*
- **Regional note** (`REPORT.ecommerce.note`): *"Regional variation is considerable: the Americas reach 68.0% while MENA and West and Central Africa, dominated by bulk tobacco and lower postal infrastructure, sit at 1.5% and 0.6%. E-commerce is a primary challenge wherever parcel and postal networks carry the bulk of seized goods."*
- **Exec-summary shift card** (`REPORT.shifts`, sec=E-commerce): *"E-commerce now accounts for 44.8% of all ITR cases globally, establishing it as a structural cross-section logistics channel rather than a section-specific phenomenon. Market penetration varies markedly across categories…"*
- **Conclusion / priority #1** (`REPORT.conclusion.priorities[0]`): postal & parcel risk profiling *"can no longer be approached as a specialist function… It must become a systemic capability embedded in national risk management frameworks…"*
- Cross-section colour from `REPORT.conclusion.threat`: silencers 85 % / receivers 69 %, NPS 78 % in-mail + 81.9 % e-commerce, firearms fragmented into postal components.

### Where the data is THIN
- **No time series.** Only 2025 vs 2024 exists at the *section*/*category* level (and only for some fields). We cannot draw a multi-year "rise of e-commerce" line — the 44.8 % has **no prior-year comparator stored** (no `ecom_prev`). A "growth over time" beat is unsupported.
- **No absolute e-commerce case counts per commodity** — only percentages per flow. We have the 73,371 global total but can't cleanly size each commodity's online slice without multiplying share × case base ourselves (doable but derived, not stored).
- **Region × commodity e-commerce** is not crossed — we have ecom by region and ecom by commodity separately, but not "NPS-via-e-commerce in the Americas." Any such beat would be a claim we can't back.
- **No channel breakdown of the 44.8 %** (marketplace vs social vs dark web) — the data is binary e-commerce / non-e-commerce only.
- **Sub-commodity e-commerce exists only for IPR, Medical, Tobacco, Alcohol and Weapons** — not for drugs sub-types or environmental sub-streams, so the "how deep does it go" beat is uneven across sections.

---

# CANDIDATE B — "Drugs 2025" (richest single section)

Source: `itr_drugs.json` (totals, composition, category YoY, direction, detection,
heatmaps, involvement, operational, `perDrug`), narrative in `DRUGTX.*`,
`CASE_STUDIES.Drugs`, `REPORT.shifts`.

### Big Idea
> **Drug enforcement in 2025 split into two worlds: a booming postal channel of
> small, synthetic, e-commerce parcels (cannabis, NPS, psychotropics — cases
> exploding) and a heavy maritime channel of bulk cocaine and heroin (tonnage
> surging on a flat case count) — one drug section, two entirely different physics.**

### Section summary (the numbers)
- **Totals** (`totals`): 67,757 cases · 75,270 seizures · 146 reporting administrations · **1,288.3 t** seized. Cases **+43.3 %** vs 2024 (47,280) — the most-reported typology in the CEN.
- **Composition by seizures** (`composition`): Cannabis 37,058 · Psychotropics 18,216 · NPS 8,315 · Cocaine 8,074 · Opioids 2,523 · Khat 1,084. Synthetic families (psychotropics + NPS) = **34.3 %** of seizures.
- **Category YoY — seizures** (`byCategorySeiz`): Cannabis 22,855→37,058 **(+62 %)** · Psychotropics 14,627→18,216 (+25 %) · NPS 3,822→8,315 **(+118 %)** · Cocaine 7,596→8,074 (+6 %) · Opioids 2,729→2,523 **(−8 %)** · Khat 469→1,084 **(+131 %)**.
- **Category YoY — quantity (t)** (`byCategoryQty`): Cannabis 530→549 (+4 %) · **Cocaine 230→400 (+74 %)** · Psychotropics 141→187 (+32 %) · **NPS 168→82 (−51 %)** · Khat 57→46 (−19 %) · Opioids 25→24 (−3 %). *Note the sign-flips vs the seizure trend.*
- **Direction** (`operational.direction`): Import 62.2 % · Export 19.1 % · Transit 14.7 % · Internal 4.1 % — enforcement anchored at arrival.
- **Detection** (`detection`): **Risk profiling 78.4 %** (highest of any typology) · Routine control 17.3 % · Intelligence 2.2 % · Investigation 1.5 % · Random 0.7 %.
- **Operational profile** (`operational`): Locations — Airport 27,502 · **Mail Centre 21,995** · Inland 6,964. Concealment — **In mail 34,471 (leading)** · Unknown 11,452 · In baggage 8,328. E-commerce drives **59.9 %** of cases.

### Per-drug sub-stories (`perDrug`, narrative `DRUGTX.lead/fig/spot`)
| Drug | Cases (YoY) | Quantity t (YoY) | Signature |
|---|---|---|---|
| **Cannabis** | 34,708 (+59 %) | 548.8 (+3.5 %) | 51.2 % of all drug cases; Europe surge (Denmark 667→5,135, Germany 472→4,581, France 0→3,865); herbal 79 %, resin fastest-growing (+86 %); 62.6 % e-commerce. Spotlight: **US→UK corridor** (US 16,278 departures → UK 5,163 destinations). |
| **Psychotropics** | 16,360 (+25 %) | 186.8 (+32 %) | Most chemically diverse; Denmark 4,971 (+356 %); methamphetamine = 57 % of volume; psilocybin +130 %, zopiclone +795 %, nitrous oxide +365 %. Spotlight: **MENA prescription cluster** (Oman/UAE/Saudi, pregabalin/tramadol/captagon). |
| **NPS** | 7,721 (+109 %) | 82.4 (**−51 %**) | The paradox category — cases double, tonnage halves. Synthetic cannabinoids +623 %. **Most postal of all**: 81.9 % e-commerce, 78 % in-mail, 88.7 % risk profiling. Spotlight: **Tanzania = 42,531 kg (51 % of global NPS volume)** from ~1 maritime seizure, yet not a top case reporter. |
| **Cocaine** | 7,613 (+4 %) | 400.1 (**+74 %**) | Flat cases, surging tonnage; refined cocaine = 97.6 % of volume; cocaine base +703 %. Least postal drug (32.1 % e-commerce), highest maritime share. Spotlight: **Antwerp–Rotterdam = 75 t (≈19 % of global volume)**. |
| **Opioids & opiates** | 2,120 (−3 %) | 24.3 (−3 %) | Only category down on both metrics — counter to the "opioid crisis" narrative. **Fentanyl overtakes heroin by seizure count** (30.6 % / 772 vs 24.7 % / 623) *for the first time in CEN history* — but fentanyl itself fell (1,084→772) and **heroin reclaims quantity** (7.6 t vs 6.3 t). |
| **Khat** | 1,029 (+120 %) | 45.9 (−19 %) | Smallest category; atomisation — fresh khat collapses (−78 %), dried rises (+63 %); shelf-life-driven shift to mailable dried product; transit 27.9 % (highest of any drug). |

### Top reporting countries & geography
- **Overall involvement** (`involvement`, 203 countries): USA 29,015 · Denmark 13,114 · Germany 9,915 · France 7,800 · UK 7,582 · Netherlands 7,517 · Spain 5,328. US alone > 40 % of instances.
- **Regional flow heatgrid** (`heatFlows`, 14×14 region matrix): interregional = 66.4 % of cases. **Largest single flow: North America → Western Europe = 14,809 cases**, outweighing the reverse **5.2 : 1** (`DRUGTX.ov.flows`).
- **Region × category heatgrids** (`heatRegionCat`, 13 regions × 6 categories, both cases and quantity): Western Europe + North America = **>80 % of cases**; but quantity concentrates in East & Southern Africa and South America (bulk maritime).

### The 2–3 most striking / surprising data points
1. **The NPS paradox** — cases **+108.8 %** while quantity **−50.9 %** (`byCategoryQty` + `perDrug.NPS`). Doubling and halving at once is the single most counter-intuitive figure in the section, and it has a clean cause: fragmentation into small e-commerce parcels (81.9 % e-commerce, highest recorded).
2. **Fentanyl "overtakes" heroin — with an asterisk** — the headline (30.6 % vs 24.7 % of opioid seizures, first time in CEN history) is technically true *by case count*, yet fentanyl **declined** YoY (1,084→772) and heroin **won on quantity** (7.6 t vs 6.3 t). A rare case where the data undercuts its own headline — a strong "read past the number" beat.
3. **Cocaine's flat-cases / +74 %-tonnage split** — 7,596→8,074 cases but 230→400 t, driven by a handful of Antwerp–Rotterdam maritime hits (75 t ≈ 19 % of global). The perfect foil to the postal drugs — same section, opposite physics.
- (Runner-up) **The reporting gap**: 212 administrations appear in the data but only 146 report their own seizures — a 66-country blind spot in Africa, Central Asia and the Pacific (`DRUGTX.ov.map`).

### Story arc (8 beats)
1. **Hook** — Drugs are the biggest illicit-trade typology in the CEN: 67,757 cases, +43 % in a year. Establish scale. (`totals`, `DRUGTX.ov.intro`)
2. **The pecking order** — Composition donut: cannabis dominates, synthetics rising to a third of seizures. (`composition`)
3. **Two clocks** — Put seizure-YoY and quantity-YoY side by side; watch the signs disagree (NPS up/down, cocaine flat/surging). Set up the central tension. (`byCategorySeiz` vs `byCategoryQty`)
4. **The postal world** — Cannabis / psychotropics / NPS: mail-centre locations, in-mail concealment, e-commerce 55–82 %, risk-profiling detection. Point: small synthetics ship like parcels. (`operational`, `perDrug`, `DRUGTX.*.oper`)
5. **The maritime world** — Cocaine (and heroin by weight): seaports, vessels, containers, Antwerp–Rotterdam. Point: tonnage still moves by sea. (`perDrug.Cocaine`, coc spotlight)
6. **The fentanyl twist** — A single-drug deep-dive that teaches the reader to distrust the headline (count vs quantity). (`CASE_STUDIES.Drugs[0]`, `perDrug.Opioids`)
7. **Follow the flow** — Region→region heatmap; the transatlantic NA→WE 14,809 corridor at 5.2:1. Point: a globalized, directional market. (`heatFlows`, `DRUGTX.ov.flows`)
8. **What we don't see / close** — The 212-vs-146 reporting gap; drugs as the most "operationally mature" typology; land on risk-profiling maturity. (`DRUGTX.ov.map`, `DRUGTX.ov.detection`)

### Narrative text already written (usable verbatim)
Extensive — `DRUGTX` has polished bilingual prose for overview (`ov.intro/comp/byCat/qty/direction/detection/heat/flows/map/oper`), a per-drug `lead`, and per-figure captions (`fig.<drug>.reporters/subSeiz/subQty/oper`), plus `spot.<drug>` spotlights. Highlights:
- `DRUGTX.ov.oper`: *"The operational profile has shifted markedly towards postal and e-commerce channels. Mail-centre seizures rose from 20.3% to 32.5% of cases and in-mail concealment now leads at 50.9%… splitting enforcement into two paradigms: a postal channel for synthetic and semi-synthetic substances and [a freight channel…]."*
- `DRUGTX.lead.nps`: *"NPS display the single most striking paradox of 2025: a doubling of cases combined with a halving of quantities."*
- `DRUGTX.ov.flows`: *"…the transatlantic axis dominates, but in an unexpected direction: North America to Western Europe (14,809 cases) outweighs the reverse by 5.2 to 1…"*
- `CASE_STUDIES.Drugs`: "Fentanyl overtakes heroin in seizures" and "NPS becomes a postal phenomenon" — pre-written, chart-ready callouts.
- `REPORT.shifts` (Drugs ×2) frame both marquee angles at exec-summary level.

### Where the data is THIN
- **Still only 2 years** (2025 vs 2024). Fentanyl "for the first time in CEN history" and "second consecutive year" are asserted in prose but the **stored data holds only prev/curr** — no multi-year series to chart the crossover line.
- **Monthly / seasonal granularity: none.** No within-year trend; every figure is an annual aggregate.
- **Flows are region→region, not country→country.** The US→UK corridor (16,278 / 5,163) exists as spotlight prose but **the bilateral country matrix is not in the data** — we can't build an interactive country-to-country flow map, only the 14-region heatmap.
- **No seizure-size distribution.** The "small parcels vs one big maritime hit" thesis is carried by narrative (e.g. Tanzania's 42.5 t from ~1 seizure); the data gives category totals, **not per-seizure sizes/histograms** to prove bimodality visually.
- **No purity, price, or harm/health data** — purely enforcement (cases, seizures, quantity). Any "impact on users" beat is out of scope.
- **Uneven sub-fields across drugs** — e-commerce/operational splits are richest for cannabis/NPS/psychotropics; opioids/khat have thinner per-subcommodity detail.
- **Detection %s don't reconcile to the decimal** — overview quotes risk profiling 78.3 % (`DRUGTX.ov.detection`) vs 78.4 % (`detection` array); minor, but pick one source before wiring.

---

## Quick comparison for choosing the spine

| | **A — E-commerce shift** | **B — Drugs 2025** |
|---|---|---|
| Scope | Cross-cutting, all 6 sections | One section, deep |
| Single killer number | 44.8 % (near-parity) | +43 % cases / two-paradigm split |
| Best structural tension | 82 % → 0 % spread across commodities | postal vs maritime; cases vs tonnage |
| Pre-written narrative | Moderate (`REPORT.ecommerce`, shifts, conclusion) | **Very rich** (`DRUGTX` full set + spotlights + case studies) |
| Chartable variety | region map, commodity bar ranking, sub-commodity extremes | donut, YoY paired bars, 3 heatgrids, choropleth, operational panels |
| Biggest data gap | no time series; no channel breakdown | no time series; no country-level flows; no per-seizure sizes |
| Surprise factor | silencers 85 %, urogenital drugs 91 % | NPS up-and-down paradox; fentanyl asterisk |

Both are viable. **A** is the more original, "big idea" spine (a number nobody
expects, provable across the whole report). **B** is the richer, more chart-dense
and best-narrated spine (the writing is already done). Neither can support a
multi-year trend line — worth deciding up front whether the story is framed as
"the 2025 snapshot" rather than "the rise over time."
