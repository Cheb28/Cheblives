# Cheb's Human Atlas — Data Pipeline Specification

> **You are building** a Node build script, `scripts/build-countries.mjs`, that reads the raw CIA World Factbook JSON in `data/factbook/` (one file per country, organized in region folders) and emits a single compact `src/data/countries.json` consumed by the game described in `GAME_DESIGN.md`. Run it manually (`node scripts/build-countries.mjs`) whenever the source data changes; commit the output. Target output size: **well under 2 MB** (the raw data is ~10 MB).

---

## 1. Source layout

```
data/factbook/
  africa/ ... europe/ ... (12 region folders, 2-letter GEC-coded files: gm.json = Germany)
  meta/categories.json     # ignore
  oceans/ world/           # SKIP — not countries
  *.md, package.json       # ignore
```

**Inclusion rule:** iterate every `*/*.json` except `oceans/`, `world/`, `meta/`, `antarctica/`, and the explicit non-country skip list (currently `ee` = European Union, a supranational org with population/GDP but no country-name fields). Keep an entry only if **all** of: `People and Society → Population → total` parses to ≥ 50,000; a raw `Real GDP per capita` figure exists; and a capital name or a parseable `Major urban areas` entry exists. Additionally, a **hand-tuned include list** forces in entries the rule wrongly drops: **Monaco, Liechtenstein, San Marino** (famous microstates under the population floor) and **West Bank** (3.3M people but null Capital/city fields — supply cities manually: Ramallah, Hebron, Nablus). **Final count: 208** (verified against the shipped data). Everything else (Tuvalu, Palau, Anguilla, etc.) is excluded from play but may still appear in the World tab as non-playable if trivial. `region` = the folder name (prettified, e.g. `east-n-southeast-asia` → "East & Southeast Asia"). Country id = filename code; display name from `Government → Country name → conventional short form`, falling back to `conventional long form` when the short form is missing or the literal string `"none"` (several countries, incl. UAE and Central African Republic, have short form `"none"`), then filename. Decode HTML entities in all kept text (e.g. `&ocirc;` → ô for Côte d'Ivoire).

## 2. Universal parse rules

Nearly every value is an English *string with a number inside*, e.g. `"$62,800 (2024 est.)"`, `"11% (of GDP) (2022 est.)"`, `"62.2 years (2024 est.)"`. Write these helpers and use them everywhere:

- `num(text)` — strip commas/`$`/`%`, return first number; handle `million`/`billion` multipliers. Returns `null` on failure.
- `latest(obj, prefix)` — many fields are year-keyed sub-objects: `{"Real GDP per capita 2024": {text}, "Real GDP per capita 2023": {...}, "note": ...}`. Return `num` of the highest year. **Fields that use this shape:** Real GDP per capita, Real GDP growth rate, Inflation rate, Unemployment rate, Youth unemployment, Gini Index coefficient, Military Expenditures. (Some countries have the plain `{text}` shape for the same field — support both.)
- `pctList(text)` — parse `"Hausa 30%, Yoruba 15.5%, ..., other 24.9% (2018 est.)"` into `[{name, pct}]`; anything unparsed lumps into `other`. Used for ethnic groups, religions, GDP sectors.
- Strip `<b>`, `<strong>`, `<br>` HTML from any text kept verbatim. Notes fields are usually ignorable.
- **Every numeric field must have a fallback** (§5) — coverage is uneven; e.g. Tuvalu has GDP pc, life expectancy, and citizenship but **no Gini and no unemployment rate**. Two fields are missing from ~40% of ALL files, including big countries (Nigeria lacks both — verified): `Taxes and other revenues` and `School life expectancy`. Expect the §5 fallbacks to fire constantly for these; the flagship-country override tables carry the tax model, not the raw field.

## 3. Field map (factbook path → output field)

Output record shape per country (all rates as plain numbers, money in PPP dollars):

| Output field | Factbook path (within country JSON) | Parse |
|---|---|---|
| `name`, `id`, `region` | `Government → Country name`; filename; folder | §1 |
| `population` | `People and Society → Population → total → text` | `num` |
| `lifeExpectancy` / `.male` / `.female` | `People and Society → Life expectancy at birth → {total population, male, female}` | `num` |
| `infantMortality` | `... → Infant mortality rate → total` | `num` (per 1,000) |
| `maternalMortality` | `... → Maternal mortality ratio` | `num` |
| `fertility` | `... → Total fertility rate` | `num` |
| `birthRate` | `... → Birth rate` | `num` (births/1,000 pop — drives random-birth weighting, GAME_DESIGN §2) |
| `medianAge` | `... → Median age → total` | `num` |
| `urbanization` | `... → Urbanization → urban population` | `num` (%) |
| `ethnicGroups` | `... → Ethnic groups → text` | `pctList` |
| `religions` | `... → Religions → text` | `pctList` |
| `languages` | `... → Languages → Languages` (note nested key; sometimes `text`) | split on commas, strip parentheticals, keep ≤ 5 |
| `cities` | `... → Major urban areas - population → text` | §4 |
| `healthExpenditure` | `... → Health expenditure → Health expenditure (as % of GDP)` or `text` | `num` |
| `physicianDensity` | `... → Physician density` | `num` |
| `obesity`, `tobacco`, `alcohol` | `... → Obesity - adult prevalence rate`, `Tobacco use → total`, `Alcohol consumption per capita → total` | `num` |
| `waterAccess`, `sanitation` | `... → Drinking water source → improved: total`, `Sanitation facility access → improved: total` | `num` (%) |
| `educationExpenditure` | `... → Education expenditure` | `num` |
| `schoolLifeExpectancy` | `... → School life expectancy (primary to tertiary education) → total` | `num` (years) |
| `gdpPerCapita` | `Economy → Real GDP per capita` | `latest` |
| `gdpGrowth` | `Economy → Real GDP growth rate` | `latest` |
| `inflation` | `Economy → Inflation rate (consumer prices)` | `latest` |
| `sectors` `{agriculture, industry, services}` | `Economy → GDP - composition, by sector of origin` | `num` each |
| `unemployment`, `youthUnemployment` | `Economy → Unemployment rate`, `→ Youth unemployment rate (ages 15-24)` | `latest` |
| `gini` | `Economy → Gini Index coefficient - distribution of family income` | `latest` |
| `povertyRate` | `Economy → Population below poverty line` | `num` |
| `taxRevenuePct` | `Economy → Taxes and other revenues` | `num` |
| `govType` | `Government → Government type → text` | keep string (lowercased) |
| `capital` | `Government → Capital → name → text` | strip notes/semicolons |
| `coordinates` | `Geography → Geographic coordinates → text` | convert degrees/minutes/seconds to `[longitude, latitude]` |
| `currency` | `Economy → Exchange rates → Currency` | remove the exchange-rate suffix; recognize US-dollar text fallbacks |
| `flagCode` | `Communications → Internet country code` | first two-letter code, with United Kingdom normalized to `GB` |
| `legalSystem` | `Government → Legal system → text` | keep string |
| `citizenship` | `Government → Citizenship` sub-object | §4 |
| `military` | `Military and Security` section | §4 |
| `conflict` | `Terrorism → Terrorist group(s)` exists, or `Transnational Issues → Refugees and internally displaced persons` mentions IDPs from this country | boolean flags `{terrorism, displacement}` |

## 4. Structured sub-parsers

### 4.1 Cities
Input (Nigeria): `"15.946 million Lagos, 4.348 million Kano, 3.875 million Ibadan, 3.840 million ABUJA (capital), 3.480 million Port Harcourt, 1.905 million Benin City (2023)"`
Input (Germany): `"3.574 million BERLIN (capital), 1.788 million Hamburg, ..."`  Input (Tuvalu): `"7,000 FUNAFUTI (capital) (2018)"`

Regex per comma-segment: leading number (`million` multiplier or comma-grouped), then name; `(capital)` flag; ALL-CAPS names → title-case. Drop the trailing year parenthetical. Output `cities: [{name, pop, capital: bool}]`. **Every country additionally gets** the generic entries the game requires (`Secondary city`, `Town`, `Rural`) — the game adds these at load time, not the pipeline; the pipeline only ships real cities. If no parse succeeds, ship the capital as the single city.

### 4.2 Citizenship
From `Government → Citizenship` (verified shape, e.g. Germany):
```json
{"citizenship by birth": {"text": "no"},
 "citizenship by descent only": {"text": "at least one parent must be a German citizen or ..."},
 "dual citizenship recognized": {"text": "yes, but requires prior permission from government"},
 "residency requirement for naturalization": {"text": "8 years"}}
```
Output `citizenship: {jusSoli: bool ("yes" prefix on birth), dualAllowed: bool ("yes" prefix), naturalizationYears: num (default 8 if missing/unparsable)}`.

### 4.3 Military
From `Military and Security`:
- `hasArmedForces`: false if section missing, `Military and security forces` text contains "no regular military forces", or `Military service age and obligation` is absent AND expenditures < 0.5% (Costa Rica's field is absent entirely — verified).
- `Military service age and obligation → text` is free text. Classify `conscription`:
  - contains "mandatory" or "compulsory" → `mandatory` (South Korea: *"mandatory military service for all eligible men 18-35 years of age"* — verified)
  - contains "selective" or "lottery" → `selective`
  - contains "voluntary" only → `voluntary` (Germany: *"17-23 years of age for voluntary military service ... conscription ended in 2011"* — note the note text can mention conscription historically; classify on the main `text` first, and treat "conscription ended/abolished/suspended" in either as forcing `voluntary`)
- `serviceAge`: first age number in text (default 18). `serviceLengthYears`: parse "18-21 months"/"2 years" → years rounded to 1 decimal (default 1.5 for mandatory). `womenConscripted`: "men and women" adjacent to mandatory wording (default false).
- `payTier` 1–3 from `Military expenditures` (`latest`): <1.5% → 1, 1.5–3% → 2, >3% → 3.
- **Hand-tuned override table** (in the script) for countries the regex misclassifies — at minimum verify and pin: South Korea, Israel, Norway (women conscripted), Sweden, Switzerland, Singapore, Egypt, Russia, Ukraine, Eritrea, both Koreas, Costa Rica/Iceland/Panama (`hasArmedForces: false`).

`callUpRate` estimates the share of eligible characters actually incorporated (default 1, or
0.25 for selective systems). `repeatCallUp` retains later-year eligibility after a missed quota.
Overrides cover Brazil's excess contingent, Thailand's draw, Russia's annual quota, Mexico's draw,
and Denmark/Norway's limited intake. These are gameplay assumptions, not statutory rates.

## 5. Fallbacks & derived tiers (computed in the script, shipped in the output)

**Income tier** from `gdpPerCapita` (PPP): <$5k → 1 (low), $5–15k → 2, $15–35k → 3, >$35k → 4 (high).

**Fallback defaults by income tier** when a field is null:

| Field | tier 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| gini | 42 | 40 | 36 | 32 |
| unemployment | 8 | 7 | 6 | 5 |
| youthUnemployment | 2× unemployment | | | |
| taxRevenuePct | 12 | 15 | 20 | 25 |
| healthExpenditure | 4 | 5 | 7 | 9 |
| schoolLifeExpectancy | 9 | 12 | 14 | 16 |
| inflation | 8 | 5 | 3 | 2 |
| Every other numeric | median of countries in same tier | | | |

**Derived tiers** (rules; each also has a hand-tuned override map for ~30 flagship countries — US, UK, DE, FR, IT, ES, SE, NO, CH, PL, RU, UA, TR, CN, JP, KR, IN, PK, ID, VN, SA, AE, IL, EG, NG, ET, ZA, KE, BR, MX, AR, CA, AU — where real systems are well known):

- `educationTier` 1–4: from schoolLifeExpectancy (<10 → 1, <13 → 2, <15 → 3, else 4), capped by income tier +1.
- `healthcareArchetype`: income tier 4 + govType contains "monarchy"/"republic" in Europe/Anglosphere → `single-payer` or `universal-insurance` (override table decides which); income tier 3 → `mixed`; tier 1–2 → `out-of-pocket`. `healthTier` 1–4 = round(avg(income tier, physician-density tier)) where density tier: <1/1k → 1, <2 → 2, <3.5 → 3, else 4.
- `welfareTier`: heavy-tax + income 4 → `generous`; income 3–4 → `moderate`; income 2 → `minimal`; income 1 → `none`. Tax tier from `taxRevenuePct`: <10 low, <17 light, <25 moderate, else heavy (override table: US → moderate, Gulf → low, EU → heavy).
- `lawTier` strong/medium/weak: govType contains "parliamentary"/"federal"/"constitutional" AND income ≥ 3 → strong; contains "authoritarian"/"military"/"transitional"/"theocratic" or `conflict` flags → weak; else medium.
- `bizClimate` 1–3: income tier ≥3 & lawTier strong → 3; lawTier weak → 1; else 2.
- `stability` 1–3 for event weights: conflict flags or govType authoritarian/transitional → 1; income ≥ 3 & lawTier strong → 3; else 2.

**Static game tables that live in game source, not the pipeline:** freedom-of-movement blocs, golden-visa country list, alternative-civilian-service list, retirement ages, inheritance-tax by tax tier (see GAME_DESIGN §7, §8, §10, §12).

## 6. Output & validation

- Emit `src/data/countries.json`: `{ builtAt, countries: [ {record per §3–§5} ] }`, minified.
- The script prints a coverage report: countries emitted, count of fallbacks used per field, and hard-fails if: the emitted count ≠ 208 (update this constant deliberately if the rule or data changes), or any of US/China/Germany/Nigeria/India is missing a raw (non-fallback) value for gdpPerCapita, lifeExpectancy, or cities.
- Spot-check expectations (verified against the shipped data): Germany `gdpPerCapita` ≈ 62800, `citizenship.naturalizationYears` = 8, conscription `voluntary`; South Korea conscription `mandatory`; Costa Rica `hasArmedForces` false; Nigeria cities start with Lagos ≈ 15.9M; Tuvalu/Palau/Anguilla are **excluded** by the population floor; Monaco/Liechtenstein/San Marino/West Bank are present via the include list, West Bank with its manually supplied cities.
