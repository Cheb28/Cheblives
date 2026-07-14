# Build Progress

Handoff notes for whoever continues this build (see `START_HERE.txt` first, then `docs/`).

## Current status: Phase 9 COMPLETE — roadmap implementation complete

### Phase 9 — Final polishing

- Added versioned, validated save envelopes with exact RNG restoration, three rolling browser
  autosaves, overwriteable named slots, safe deletion confirmation, and JSON export/import. Saves
  can be resumed from character creation or the Overview screen.
- Lazy-loaded every major screen and split React and country data into cacheable production chunks.
  The former 655.6 kB single-script warning is gone; the initial application chunk is 126.7 kB,
  with screens loaded on demand.
- Added accessible form labels, progress-meter semantics, keyboard arrow/Home/End tab navigation,
  visible focus rings, warning-dialog focus and Escape handling, reduced-motion support, responsive
  save controls, clearer empty states, and status notifications.
- Added Phase 9 regression coverage for deterministic saves, damaged/newer-save rejection, the
  traceability state contract, finite numeric state, statement identities, duplicate income, and
  exactly-one-year progression across six substantial complete seeded lives.
- Browser verification covered setup, autosave, named save/restore, keyboard tabs, Finance, Family,
  Health, Travel, and World screens with no console errors or warnings. Full tests and production
  build pass.
- Remaining non-critical depth belongs to `docs/EXPANSION_BACKLOG.md`: detailed pregnancy/custody,
  workplace leave and accommodations, insurance products, deeper social simulation, regional
  disease/law differences, and localization. These are expansions, not progression blockers.

### Phase 8 — Welfare, housing, and household money

- Replaced flat payments with layered social insurance and means-tested safety nets. Country tiers
  produce universal/contributory, targeted, family-reliant, or very limited systems.
- Added contribution-history unemployment insurance, minimum-income assistance, pensions, family
  and parental-leave benefits, caregiver support, disability income, and housing allowance. Legal
  residence, income, assets, household composition, disability, work record, age, and detention
  affect eligibility, and every payment is separately itemized.
- Added living with parents, private renting, social renting, ownership, and unstable housing.
  Market rent, home prices, social-housing supply, queues and priority differ by country profile;
  marriage, parental death, and migration update tenure.
- Personal savings remain separate from household funds. Teenagers and employed adult children can
  contribute up to 50% while retaining the balance; adult children save and can move out. Finance
  and Family screens expose housing and contribution choices.
- Phase 8 regression coverage checks country contrasts, work-history rules, disability, housing
  aid, social allocation, Singapore eligibility, and adult-child fund splitting.

### Phase 7 — Judicial and law

- Added a serializable case system shared by criminal charges, civil disputes, bankruptcy, draft
  evasion, political prosecution, business claims, and estate-plan challenges. Decisions remain
  non-blocking and default to public representation or settlement when ignored.
- The Law tab now shows local police recovery, trial fairness, public-defence quality, corruption,
  active cases, prison/parole status, records, court debt, and deliberate petty theft, smuggling,
  and fraud choices.
- Added evidence and representation effects, guilty pleas, weak-law bribery with failure/backfire,
  fines, convictions, acquittals, appeals, one-turn-per-year prison sentences, parole, and lasting
  health, happiness, relationship-time, career, enlistment, immigration, and citizenship effects.
- Added theft/fraud victim events with 60/30/10% police recovery by law tier, weak-law false
  accusations, authoritarian activism arrests, business litigation, strong/medium/weak bankruptcy
  discharge, and punitive weak-law debt enforcement risk.
- Added flagship law-tier overrides and Phase 7 regression coverage. The complete test suite passes;
  controlled fraud simulations caught 104/150 attempts in Sweden versus 48/150 in Somalia.

### Phase 6 — Immigration and world movement

- Corrected regional mobility distinctions: MERCOSUR and Andean nationality routes now provide a
  two-year temporary residence/work stage before permanent conversion; EAC uses the same permit
  structure. Added OECS full movement, narrowed unrestricted CARICOM to the four-country October
  2025 arrangement, and retained wider CARICOM as a skills-based route.
- Added the Italy–Japan working-holiday agreement effective April 2026. Australian working-holiday
  holders can spend an activity slot on paid specified regional work: 3 months/88 days unlocks year
  two and 6 months during year two unlocks year three. The UI also states the four-month study cap.
- Added compact language proficiency for up to two primary languages per country, a Language study
  activity, proficiency-based wage effects, and explicit language gates for selected naturalization
  destinations. Countries without a modeled requirement are not assigned a fictional universal test.
- Rare multinational birth families can give the player an additional citizenship. Japan and South
  Korea now produce age-based nationality-obligation decisions; ignored obligations create recurring
  enforcement/loss risk, while Korea offers a dual-nationality pledge that preserves military duties.
  Existing non-dual naturalization continues to replace all prior citizenships.
- Corrected conscription intersections: overseas-born male Korean dual nationals receive the age-18
  renunciation/retention deadline, retain overseas deferment while abroad, and become draft-eligible
  when they move back to reside in South Korea. Israel now uses 3 male versus 2 female yearly turns;
  North Korea 10 male versus 7 female; Norway is gender-neutral but selects 25% for a one-year term.
  All sub-year service obligations round upward to one turn.
- Split compulsory liability from actual intake for Brazil, Thailand, Russia, Mexico, Denmark, and
  Norway. Their quota/lottery systems no longer draft every eligible character. Russia can be
  reconsidered in later eligible years; Thailand is male-only at age 21 with a two-year standard
  term, and Mexico's compulsory draw is male-only. The World tab shows modeled intake shares.

- Enabled the **Travel tab** with live destination search and route eligibility across all 208
  countries. Every route shows its requirements, costs, wait time, and the player's current status.
- Added static treaty mobility for EU/EEA/Switzerland, Nordic, UK–Ireland CTA, Trans-Tasman,
  Mercosur residence, GCC, CARICOM, ECOWAS, and Russia–Belarus movement areas.
- Added skilled, foreign-student, investment/golden, family-reunification, asylum, and irregular
  routes. Treaty and qualifying investment residence are immediate; other applications resolve on
  the next one-year turn. Golden-visa capital remains an owned real-estate investment.
- Expanded temporary migration with 2–3 year employer/sector-tied work visas and one-time,
  12-month working-holiday visas for modeled Australia/New Zealand partner passports at ages 18–30.
  Temporary-job limits prevent working-holiday promotion into a permanent career automatically.
- Temporary permissions now count down one year per turn and produce a visible expiry decision:
  return legally (the safe default), pay to request one extension, or overstay. Overstaying ends
  student work rights, creates irregular status, raises enforcement risk, and applies a law-tiered
  3–7 year bar on new legal applications. Graduates can receive a two-year post-study work visa.
- Student visas now expose and enforce part-time work limits, including 24 hours/week equivalent in
  Australia and 25 hours/week in New Zealand. Student work consumes one activity slot and generates
  proportionally limited income; expired permission clears the work selection.
- War and persecution events now unlock asylum for five years. Asylum outcomes use the design's
  60% strong/generous-country versus 25% default acceptance rule; rejection can mean return or
  remaining without status.
- Irregular travel itemizes smuggling cost and its 2% death, 10% robbery, informal-work-only, no-
  benefits, and 3–10% yearly deportation risk by law tier (higher after overstay). Deportation returns
  the player to a citizenship country.
- Movement sells homes/businesses, liquidates investments, converts assets and debts through a
  bounded GDP-PPP factor, moves the household, clears the old job, and records migration history.
- Added a first-year 20% civilian wage penalty when the destination does not share a known language.
  Irregular residents can only seek informal work. Conscription and voluntary enlistment now require
  citizenship in the current country.
- Added residence-year tracking, country-data naturalization countdowns, dual-citizenship handling,
  destination citizenship, jus-soli citizenship for children, and inherited citizenship when
  continuing as an heir. Naturalization can create a new local conscription obligation.
- Overview and Life Summary now show immigration status, citizenship, and migration history.
- Added `sim-test6.mjs`: verifies Nigeria→Germany skilled migration and eight-year naturalization,
  Poland→Germany treaty movement, asylum unlocking, US irregular-route visibility, informal-work
  restriction, temporary-visa limits, working-holiday expiry/return/overstay, student work caps,
  language wage effect, and PPP conversion.

### Phase 1–5 healthcare expansion and polish

- Added `docs/EXPANSION_BACKLOG.md` for approved family, employment, education, finance,
  caregiving, activity, and narrative ideas. The welfare-dependent payments and judicial
  debt-discharge items noted here were subsequently delivered in Phases 8 and 7.
- Replaced generic illness events with named acute conditions including respiratory infection,
  gastroenteritis, pneumonia, malaria, tuberculosis, cancer, stroke, cardiac events, and sepsis.
- Added progressive chronic conditions: asthma, diabetes, hypertension, arthritis, respiratory
  disease, kidney disease, heart disease, dementia, depression, and named post-illness complications.
  Each records diagnosis age, years, severity, control status, management cost, Health decay, and
  mortality contribution.
- Added typed mild/moderate/severe disability (mobility, respiratory, chronic pain, vision, hearing,
  cognitive), activity-time effects, school-progress effects, job-capacity effects, and assumed
  accommodation differences by law tier. No new cash welfare benefit is applied.
- Added explicit age 0→1 infant mortality from country data, declining ages 1–5 child mortality,
  wealth/Health modifiers, and specific infant, childhood, medical, conflict, frailty, and natural
  causes of death. Every click remains exactly one year; there is no childhood fast-forward.
- Added gradual middle/old-age Fitness decline, condition-driven frailty, sensory decline, and
  possible later mobility limitation. The Health tab now shows healthcare access, named conditions,
  severity/control, disability/function, frailty, costs, and medical history. Life Summary includes
  healthy years, disabled years, medical spending, and the medical timeline.
- Added `health-expansion-test.mjs`. Population checks confirm named conditions, typed disability,
  old-age decline, and much higher infant death frequency in Nigeria than Germany. Mortality remains
  within the roadmap's ±8-year country-life-expectancy calibration. Full tests, production build,
  and browser Health-tab verification pass without console errors.

### Phase 5 — Household economy, youth work, investments, housing, and business

- Added a separate **household fund**. Spouse income, child benefits, teen wages, and child-labor
  contributions flow into it; household living costs, rent/mortgage payments, child essentials,
  daycare, and related household taxes flow out before personal funds cover a shortfall.
- The yearly statement now separates personal and household income tax/social contributions,
  identifies household expenses, shows household income/expenses/taxes/net, and separates non-cash
  investment/business value changes so returns are never double-counted as cash.
- Added country-tiered **youth work**. Legal-age teenagers may choose part-time work, which sends
  income to the household and removes one activity slot. Poor households in higher-risk countries
  can generate child work contributions; the child loses academic progress that year.
- Added explicit **child essentials and daycare**. Daycare applies when paid caregivers are
  unavailable and uses welfare-tier subsidies (generous 80%, moderate 50%, minimal 15%, none 0%).
- Added **investments**: bonds, stocks, real-estate funds, gold/informal stores of value, and
  retirement-locked private pensions, with access gates and yearly risk/return.
- Added **home ownership** at local prices, cash or 20%-down mortgages depending on market tier,
  removal of rent, yearly mortgage principal payments, and 2% appreciation.
- Enabled the **Business tab**: informal stalls and registered businesses, business-skill and local-
  climate revenue, employees and wages, 10% loans, sale, insolvency, and guaranteed personal debt.
- Estate settlement and net worth now include household funds, investments, homes, mortgages,
  businesses, business loans, and personal business debt.
- Added `sim-test5.mjs`. Full Phase 1–5 tests and the production build pass; an in-browser walkthrough
  confirmed the Finances and Business screens render with no console errors.

### Phase 4 — Family, inheritance, rights, and heir continuation

- Added the **Family tab**: dating intent from 16, locally generated partners, proposal and
  marriage, spouse employment/income, relationship drift, divorce with an asset split,
  chosen/surprise children, child aging/stat development, widowhood, relative mortality, and
  elderly-parent support in low-welfare countries.
- Added country-sensitive **women's education/employment rights profiles**. The model separates
  formal restrictions, enforcement weakness, and household approval. Severe/restricted profiles
  can reduce female hiring and secondary-school access; the clearest severe profile can require
  a married woman to request household permission before paid work. This is a transparent gameplay
  tier, not a claim about every family. Its dimensions follow the World Bank Women, Business and
  the Law 2026 framework (Work, Marriage, Mobility, Assets, etc.); country tiers use the bundled
  government/legal-system data plus a short explicit override list.
- Family poverty can now explicitly pull a child out of school. The existing "resist dropout"
  policy spends a family-wealth tier where resistance is possible; severe formal restrictions
  can override household wealth.
- Enabled a will-focused **Law tab** in Phase 4. Each country derives inheritance tax (Heavy 20%,
  Moderate 10%, otherwise 0) and either flexible succession or a simplified protected family
  share from its legal system. Wills accept uneven percentage weights; no will means equal shares.
- Death now settles a visible estate, applies tax and succession rules, shows the family tree, and
  offers **Continue as child** for every living child. The selected child keeps their current age,
  generated stats/skills, family relationships, country, and inheritance as generation 2+.
- Fixed the pre-Phase-4 child-age offset bug: siblings shown at birth are now already-born siblings,
  and dependent-child ages use the correct offset direction.
- Added `sim-test4.mjs`: verifies dating → marriage → child, country rights tiers, inheritance tax,
  protected shares, and heir continuation. Full `npm test`, production build, and browser checks pass.

### Phase 1-3 audit and owner-requested UI changes (2026-07-13)

- **One click remains exactly one year.** There is no infancy or other fast-forwarding. The year
  control is now a fixed **Age a Year** button at the bottom center of the screen.
- **Owner-approved warning popup exception:** before advancing, the game warns when no yearly
  activities are selected and/or the character is unemployed. The popup can jump to Activities
  or Career, go back, or continue anyway. Activities now reset after every resolved year so each
  year receives a deliberate plan.
- **Decision fixes:** unanswered job offers now default to Decline as specified; job offers are not
  generated for full-time students; the obsolete draft-choice action now uses `pendingDecisions[]`;
  and decisions no longer render twice on the Events tab.
- **Education fixes/completion:** four-year university and two-year vocational programs now charge
  every tuition year, including graduation year. Character creation now supports locked ethnicity,
  religion, and family wealth in both custom and Born-anywhere modes. Private school and the
  low-income-country "sacrifice to resist dropout" policy are now player controls.
- **Military fixes/completion:** final-year conscripts retain barracks costs and military healthcare;
  voluntary careers receive free healthcare and a real pension after 20 years; early military
  retirees no longer receive the age-65 state pension early; wartime events can generate
  mobilization notices; veteran hiring gets a small bonus.
- **Economy/health fixes:** informal wages are untaxed, lifestyle Happiness effects now apply, and
  dependent students are covered by family for insurance and chronic-condition management.
- Added `npm test` plus targeted regression assertions for one-year stepping, creation locks,
  decision defaults, tuition, final service year benefits, military pension, and yearly activities.
  Production build, all simulation suites, deterministic save replay, and an in-browser walkthrough
  pass with no console errors. The Vite bundle-size warning remains a later performance optimization.

Phases 1–3 are built and verified end-to-end in the browser.

Phase 3 (health + events framework) adds: a **health system** (`health.js`) with minor/serious
illness, accidents + disability, chronic conditions (with per-year decay + management cost),
mental health/depression, and healthcare-archetype costs (insurance premiums + treatment shares;
single-payer free, universal-insurance, mixed insured/uninsured with a Health-tab toggle,
out-of-pocket). Most illnesses **auto-resolve via a player treatment policy** (Always / Treat if
affordable / Never) — honoring requirement #4 (no popup spam) — and are logged to the event feed.
A **data-driven events framework** (`events.js`) rolls economic (recession → doubles layoffs,
hyperinflation, boom), political (unrest, coup, war, persecution — gated by `stability`), and
opportunity events (job offers + mentors as **decision events**). The single `pendingDecision`
was generalized to a `pendingDecisions[]` queue with a per-type resolver; the draft migrated into
it. New tabs: **Health**, **Events** (categorized feed + pending decisions). `DraftBanner` was
replaced by a generalized **`DecisionBanner`**. Run `node scripts/sim-test3.mjs` for Phase 3 checks.

### Phase 3 verification (all passed)
- **Illness → mortality:** US avg death age 76.6 (always-treat) vs 72.7 (never-treat); untreated
  serious illness becomes a chronic condition that decays health and raises death odds.
- **Never blocks:** a full life answering *nothing* completes normally (defaults apply each turn;
  max 1 pending decision at a time).
- **Medical bills by system:** US uninsured ≈ $199k lifetime medical/insurance spend; UK
  single-payer = $0 (verified in-browser: "treated (Universal single-payer), no cost").
- **Instability:** conflict-flagged countries (Somalia/Syria/Afghanistan) produce unrest/war in
  37–40/40 lives within 30 years; stable countries (Switzerland/US/Germany) never have "war."

### Post-Phase-3 bugfixes
- **Children's healthcare covered by family:** a child's illness could show "went untreated"
  because treatment affordability checked the *child's* empty wallet. Now dependents
  (age < 18 or student) are treated using family means (scaled by childhood wealth class) and
  the cost is billed to the family, not the player (`tryTreat` → `billed` flag). Independent
  adults still pay their own way. Also fixed the cost curve: a "minor" illness was charged a full
  median wage; it's now cheap (0.08× median), with serious illness 0.5–3× median per spec.
  Verified: 0/300 children have an untreated *minor* illness; only destitute children in poor
  out-of-pocket countries miss a *serious* one (realistic).

### Phase 3 deviations / notes
- **Data bug fixed (important):** the `conflict.terrorism` flag (from the factbook "Terrorist
  group(s)" listing) was true for ~half of ALL countries — it flagged the US/Germany/Switzerland
  as unstable, tanking every country to `stability 1` and causing "war in the USA." Root cause:
  that listing names groups *present in or targeting* a country, not internal conflict. Also the
  `displacement` (IDP) parse was broken (always false). **Fix:** `displacement` now parses the IDP
  count vs population (Syria 7.4M → flagged; Germany 100 → not), and all derivations (stability,
  lawTier, war/deployment risk) use `displacement` instead of `terrorism`. Rebuilt `countries.json`
  → realistic spread: 37 unstable / 72 moderate / 99 stable. If you re-run the pipeline this is
  baked in; `terrorism`/`idp` remain in the data as informational only.
- **Mortality recalibrated:** the health system lowers health → raises the mortality multiplier, so
  the Gompertz base factor was lowered (0.34 → 0.19) to keep a typical (illness-experiencing)
  player's median death near LE. Healthy players (gym, treat-always) now outlive LE; unhealthy die
  younger — the intended reward structure. All countries pass the ±8 calibration check.
- Health costs now visibly reduce lifetime net worth (US modest worker at 40 fell ~$956k → ~$733k),
  which is a realism improvement, not a regression.

---

## Phase 2 (economy core + conscription) — COMPLETE ✅

Phases 1 and 2 are built and verified end-to-end in the browser.

Phase 2 (economy core + conscription) adds: yearly time-allocation **activities** with
slot budgets + lifestyle; **education** (school stages, dropout risk, university/vocational
enrollment, tuition/scholarship/loans); **jobs** (4 sector ladders with hiring/promotion/
layoff/retirement); **cost of living, taxes** (4 tiers × 3 brackets + social contributions),
**welfare benefits**, bank interest, and a fully itemized **yearly finance statement** with a
net-worth sparkline; and the **military/conscription** system (draft decision with serve/defer/
alternative-service/evade options, conscript service, and a voluntary officer-track career with
deployments). New engine modules: `economy.js`, `activities.js`, `education.js`, `jobs.js`,
`military.js`, `actions.js`. New tabs: Activities, Finances, Career, Education, plus a
non-blocking `DraftBanner`. Run `node scripts/sim-test2.mjs` for the Phase 2 headless checks.

### Phase 2 verification (all passed)
- **Statement integrity:** 0 mismatches across 80+ statements (net = income − tax − expenses).
- **Rich vs poor divergence:** modest worker net worth at age 40 — Germany ~$522k, US ~$956k,
  rural Nigeria ~$87k (≈10× gap). Browser: a German professional held $437k at 40. Meets the
  "comfort vs subsistence" criterion.
- **Draft:** South Korea male → draft notice at 18 with all four options (incl. alternative
  civilian service + study deferment), becomes a veteran after service; SK female → no draft;
  Costa Rica → no military content; Germany → voluntary enlistment only, no draft.
- **Full life narrative** (browser): born Berlin → secondary at 18 → university degree at 22 →
  hired Junior→Senior → laid off at 55 → retired at 65 → died 98. Clean console throughout.

### Phase 2 deviations / notes
- **Hardship floor added** (not in spec but necessary): living costs can no longer push money
  below zero (an unemployed adult was accruing impossible debt). Shortfalls now apply a
  happiness/health penalty and show as a "Could not afford (hardship)" statement line instead of
  infinite borrowing. Serving conscripts pay reduced living costs (barracks) and no rent.
- **Economy magnitudes run high** (built to the spec's exact numbers). A modest US worker nearing
  $1M by 40 is on the rich side; promotions may be slightly too easy and CoL slightly low.
  Phase 9 retained the broad wealth differences after six-life and multi-seed regression runs;
  future economy tuning should preserve the existing country contrast tests.
- **Retirement drawdown:** pensions (< cost of living in expensive cities) mean long-lived
  retirees deplete savings to $0, which is realistic but can feel harsh; note for balancing.
- The `student`→workforce transition after graduation was a bug caught in testing (graduates were
  stuck never earning); fixed in `advance.js` `updateSituation`.

---

## Phase 1 (data pipeline + skeleton life) — COMPLETE ✅

### How to run
- `npm install` (already done)
- `npm run data` — rebuild `src/data/countries.json` from `data/factbook/` (only needed if the pipeline or source data changes)
- `npm run dev` — start the Vite dev server (port 8040 via the repo's `.claude/launch.json`)
- `node scripts/sim-test.mjs` — headless engine calibration/skew/null test (no browser needed)

### What exists
- **`scripts/build-countries.mjs`** — the data pipeline. Emits **208 countries** (validation hard-fails on any other count). Report shows fallbacks firing for the chronically-missing `taxRevenuePct`, `gini`, `schoolLifeExpectancy` (expected — see DATA_PIPELINE §5).
- **`src/engine/`** (pure, no React, node-testable):
  - `rng.js` — seeded mulberry32. ALL randomness routes through this. State is serializable via `rng.state`.
  - `countries.js` — data access, city-tier CoL multipliers, `medianWage`, `birthWeight`.
  - `character.js` — `createCharacter`: Customize + Born-anywhere, distribution rolls, wealth class, family.
  - `advance.js` — `advanceYear`: age drift, happiness setpoint, Gompertz mortality.
  - `game.js` — `newGame` / `stepYear` / `serialize` / `deserialize`; holds the single mutable serializable state object.
- **`src/ui/`** — `CharacterCreation`, `Header`, `TabBar` (all 12 tabs defined; only Overview + World enabled), `tabs/Overview`, `tabs/World`, `LifeSummary`, dark control-room `theme.css`.
- **`src/App.jsx`** — ties creation → play → summary.

### Verified (ROADMAP Phase 1 checklist)
- Pipeline emits exactly 208; spot checks pass (Germany 62800 / natYears 8 / voluntary; SK mandatory; Costa Rica no army; Nigeria→Lagos; West Bank manual cities; EU excluded).
- Mortality calibration: median death age within ±2 yrs of life expectancy across US/DE/NG/KR/MC/JP/IN (400 lives each).
- Born-anywhere skews correctly toward Africa + South Asia (real birth-rate weighting).
- No NaN/undefined in stats/skills; no console errors.
- In-browser: created lives via both Customize (Germany→Munich) and Born-anywhere (Iraq→Baghdad); advanced single-step (age 6→7) and to death (age 54); milestones logged; death → life-summary with timeline; restart works; World tab browses all 208 with correct detail (verified Japan).

## Deviations / decisions made during Phase 1
- **Country count is 208, not the 209 originally in the specs.** The European Union (`ee.json`) had passed the filter — it's a supranational org, not a birthplace. Excluded it via a `SKIP_IDS` set. All docs updated to 208.
- **Name fixes in the pipeline:** short form `"none"` now falls back to long form (fixed UAE, Central African Republic, Micronesia showing as "none"); HTML entities are decoded (fixed "Côte d'Ivoire").
- **React binding pattern:** the engine's game object is intentionally mutable, so `App.jsx` holds it in a `useRef` and calls an explicit force-render after each `stepYear`. Do NOT switch to `useState(prev => { mutate(prev); return prev })` — returning the same reference makes React bail out of re-rendering (this bug was hit and fixed during Phase 1).
- **Mortality constant** in `advance.js` (`0.34`) is empirically tuned so median death ≈ life expectancy *after* the health multiplier drags it down. If you change the health multiplier or age-drift curve, re-run `sim-test.mjs` and retune.

## Known limitations to revisit in later phases
- `lawTier` still begins with government-type keywords plus income tier, but Phase 7 added flagship
  strong/weak overrides (including South Korea and Russia). A country-by-country legal-data audit
  remains optional research depth rather than pretending the heuristic is an exact legal index.
- Ethnicity often rolls "Local" for homogeneous countries whose factbook ethnic-groups text has no percentages (e.g. South Korea). Acceptable; revisit if it matters for events.
- `money.cash` is always $0 in Phase 1 (economy arrives in Phase 2).
