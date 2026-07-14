# Cheb's Human Atlas — Build Roadmap

> **You are building** the game specified in `GAME_DESIGN.md`, powered by data built per `DATA_PIPELINE.md`. Work **one phase at a time, in order**: implement, then run the phase's *Verify* checklist by actually playing the app in a browser before moving on. Each phase leaves a working game. Keep a short `PROGRESS.md` noting the current phase and any deviations from spec.

Stack: React + Vite SPA (`npm create vite@latest . -- --template react`), client-only. One serializable game-state object; all randomness through a single seeded RNG utility so lives are reproducible in testing.

---

## Phase 1 — Data pipeline + skeleton life

**Build:** `scripts/build-countries.mjs` per DATA_PIPELINE.md (including its validation report) → `src/data/countries.json`. App shell: persistent header + tab bar (§15), Overview tab, World tab (country browser proves the data visually). Character creation (§2: country/city/sex/ethnicity/religion/wealth-class rolls, family generation). Advance-year loop with only: age drift (§3), happiness setpoint, mortality (§9.4), and a plain-text year log. Death → life summary screen.

**Verify:** pipeline report shows exactly 208 countries, spot-check values from DATA_PIPELINE §6 (Germany 62800, SK mandatory, Costa Rica no army, West Bank present with manual cities, Tuvalu absent, EU excluded). Play 5 births — US, Germany, Nigeria, South Korea, Monaco — hold Advance Year to death; median death age lands within ±8 years of country life expectancy; no NaN/undefined anywhere in UI. Roll "Born anywhere" 20 times: births should skew visibly toward high-birth-rate countries (Africa/South Asia dominate), never land in an excluded territory, and honor any locked fields.

## Phase 2 — Economy core + conscription

**Build:** Activities tab with slot budgets and effects table (§4). Education stages and access tiers (§5). Job ladders, hiring/promotion/firing, median-wage math (§6). Cost of living, lifestyle, rent (§8.4). Taxes with yearly statement (§8.3). Bank account + Finances tab statement (§8.1). Military: conscription/draft decision event, service years, voluntary career ladder (§7).

**Verify:** finance statement lines sum exactly to net change each year. A life in Germany reaches comfortable savings by 40; the same choices in Nigeria's rural tier stay near subsistence. An 18-year-old male in South Korea gets a draft event (and evasion → later judicial flag stub); in Costa Rica no military content appears; German 18-year-old sees voluntary enlistment only.

## Phase 3 — Health + events framework

**Build:** the data-driven event system and Events tab with the never-blocking rule + decision defaults (§14). Healthcare archetypes, illness/accident/chronic conditions, mental health, refined mortality modifiers (§9). Economic/political event tables wired to country `stability` (war, recession, hyperinflation).

**Verify:** untreated serious illness visibly decays Health then raises death odds. Advance Year is never blocked with unanswered events (defaults apply, log records them). US uninsured life shows medical bills; UK life shows none. A `stability 1` country produces unrest/war within ~30 simulated years.

## Phase 4 — Family + inheritance

**Build:** dating/marriage/children, relationship scores, divorce/widowhood (§10). Wills on the Law tab (tab can exist with only this), inheritance tax, heir continuation flow (§10.4) including heir stat generation and the life-summary → "continue as child" screen.

**Verify:** full two-generation run: marry, 2 kids, write uneven will, die → continue as the favored child with correct inherited wealth after tax; family tree on summary screen is correct.

## Phase 5 — Investments + business

**Build:** investment vehicles with availability gates, returns, crashes, inflation shocks (§8.2); home purchase/mortgage (§8.4). Business tab: found/run/hire/loan/sell/bankruptcy (§11).

**Verify:** 40-year index investing in a tier-4 country beats savings on average across 5 seeded runs (and shows at least one crash). A business in a `bizClimate 1` country fails or gets shaken down far more often than in tier 3. Bankruptcy in a strong-law country discharges debt; weak-law triggers the harsh path.

## Phase 6 — Immigration + world

**Build:** Travel tab with live eligibility for all routes (§12): treaty blocs table, skilled/student/golden/family/asylum/illegal, smuggling risks, deportation, naturalization countdown from citizenship data, PPP net-worth conversion, language wage penalty. War events unlock asylum (ties Phase 3).

**Verify:** a Nigerian graduate with Academic 65 can take a skilled visa to Germany and naturalize after 8 game-years (matches data); an unskilled character's only route to the US is illegal with visible risk; a Pole moves to Germany trivially (EU); asylum unlocks when homeland war fires. Net worth converts sensibly on each move.

## Phase 7 — Judicial and law

**Build:** full judicial system (§13): victim/accused events, deliberate crime options, arrest and investigation, trials, lawyers, legal aid, fines, bribes/corruption, prison years, parole, appeals, and criminal-record effects on jobs, education, immigration, and citizenship. Resolve draft evasion, immigration offences, family-law enforcement, business disputes, bankruptcy/debt discharge, and inheritance challenges through the same system. Audit flagship country `lawTier` overrides before balancing outcomes.

**Verify:** crime in Sweden versus a weak-law state shows the intended detection, corruption, representation, and trial-fairness contrast. Prison consumes one yearly turn at a time and visibly affects health, relationships, finances, education, and employment. Draft evasion, visa offences, bankruptcy, and disputed estates reach appropriate judicial outcomes. Criminal records consistently affect later opportunities.

## Phase 8 — Welfare and benefits

**Status: complete.** Implemented layered contributory and means-tested benefits plus realistic
housing tenure, social-housing availability and queues, parental homes, personal earnings, and
working-child household contributions. Country profiles are comparable simulations rather than
claims that every local program and threshold has been reproduced verbatim.

**Build:** social benefits (§8.5) wired to `welfareTier`, household composition, income/assets, contribution history, disability, caregiving, and legal-residency status. Include unemployment assistance, child/family benefits, disability payments, housing support, pensions, parental leave, caregiver support, and means testing without duplicating taxes or household income.

**Verify:** an eligible unemployed household in a generous-welfare country receives an itemized safety net while an equivalent household in a no-welfare country does not. Benefits change correctly after work, childbirth, disability, migration, detention, and retirement, with no double counting in household finances or taxes. Legal-residency and contribution requirements are consistently enforced.

## Phase 9 — Final polishing

**Status: complete.** Versioned rolling/manual/portable saves, accessibility and feedback polish,
screen-level code splitting, six-life balance coverage, traceability checks, and browser/keyboard
verification are implemented. Remaining optional depth is tracked in the expansion backlog.

**Build:** add the complete save system with autosave, named slots, and JSON export/import (§15). Perform a full UI/UX and accessibility pass, improve feedback and empty/error states, remove remaining placeholder or duplicate mechanics, and optimize startup and JavaScript bundle performance. Play and balance at least six complete seeded lives spanning income, welfare, law, health, sex, family, and migration situations. Tune activities, wages, expenses, taxes, benefits, mortality, events, and selection probabilities without flattening country differences. Finish documentation and the expansion backlog.

**Verify:** export, reload, and import resume an identical life. No broken controls, unreachable decisions, NaN values, duplicate finance entries, or years that advance by more than one occur. Production builds and the full automated suite pass; major screens receive browser and keyboard checks. Run the GAME_DESIGN §16 traceability table from top to bottom and confirm every row is playable. Complete several full lives without progression blockers and record remaining non-critical limitations.

## Phase 10 — Family and Social Life

**Status: complete.** Dating compatibility, friendship, country-specific same-sex relationship
profiles, relationship stages, pregnancy and family building, child development, caregiving,
domestic-safety choices, estrangement/reconciliation/favoritism, inheritance-dispute risk, skill
XP/levels, and education credentials are implemented and tested.

## Phase 10.1 — Names and Legal Identity

**Status: planned.** Let the player enter or generate a name. Generate culturally contextual given
and family names for parents, siblings, partners, friends, children, and grandchildren. Naming
profiles may use paternal, maternal, bilateral, double-surname, patronymic/matronymic, or
family-name-first conventions according to country, culture, religion, and family background.
Multicultural families may draw from either parent's tradition without rigidly assigning every name
by ethnicity or religion. The player can name children.

Track birth name, current legal name, preferred display name, nickname, and previous names. Marriage
offers keeping, adopting, appending, or combining surnames only where culturally and legally
appropriate, including traditions in which spouses normally retain their birth names. Voluntary
legal name changes depend on country eligibility, procedure, restrictions, and cost.

**Verify:** generated households have internally consistent but non-identical names across several
single- and multinational country profiles. Manual player and child names persist through saves,
marriage, migration, divorce, death, and heir continuation.

## Phase 10.2 — Interactive Map and Country Information

**Status: planned.** Add a lazy-loaded MapLibre map using an appropriate CARTO/OpenStreetMap
basemap. Store country and modeled-location coordinates locally rather than depending on live
geocoding. Zoom to the current country/location, update after migration, and highlight home and
destination during travel. Display required map-data attribution on the map and MapLibre licensing
in About/Credits. Do not request browser geolocation.

Add an accessible text facts panel containing flag, country, capital, modeled location, population,
primary languages, currency, income/development tier, life expectancy, healthcare, education,
employment and gender-rights profile, same-sex relationship status, military/conscription,
welfare/housing, tax/inheritance, immigration/citizenship, and current economic/conflict conditions.
Include an “About This Country Model” note explaining that profiles are simplified simulation data,
not legal advice.

**Verify:** maps load only when opened, remain usable on mobile and by keyboard, and always have an
equivalent facts panel. Birth, migration, travel, and return update the correct locations without
increasing the initial bundle excessively or producing tile/attribution errors.

## Phase 10.3 — Religion, Belief, Charity, and Religious Legacy

**Status: planned.** Add a Religion tab. Keep public religious identity, private belief, observance,
sect/denomination, and community standing separate rather than treating piety as a moral judgment.
Model annual obligations and observance choices appropriate to the one-year turn: worship, fasting,
study, ceremonies, pilgrimage, dietary practice, and community participation are yearly commitments
or outcomes rather than daily actions.

Support private or open apostasy, conversion, interfaith households, family/community reactions,
and country-dependent legal or social consequences. Limit sects to major locally relevant branches.
Add tradition-specific religious careers and qualifications, including priests/pastors, Catholic
priests, imams, rabbis, chaplains, teachers/scholars, and monastic vocations where applicable.

Add annual religious and secular giving: zakat, sadaqah, Christian almsgiving/tithing, tzedakah,
dana, sewa, ordinary charity, charitable bequests, and eligible religious/community endowments.
Players choose an amount and purpose such as poverty relief, healthcare, education, disaster relief,
refugees, religious institutions, or community projects. Giving is itemized in finances and may
affect observance, happiness, community reputation, tax treatment, and measurable charitable impact;
it never guarantees repayment or an objectively declared afterlife reward.

End-of-life summaries describe charitable and religious legacy from the viewpoint of the
character's tradition. Outcomes may include respected community member, scholar/teacher, elder,
philanthropist, or founder of a continuing institution/endowment. Traditions that formally recognize
saints may support an exceptionally rare posthumous, multi-generational investigation and recognition
path based on a lifetime of service and later evidence—not donations alone. Other traditions receive
their own appropriate legacy outcomes, and heirs may encounter later events about an ancestor.

Add Aliyah as a reviewed immigration route tied to modeled eligibility, identity/conversion
recognition, documentation, and application review; conversion never produces automatic approval.
All apostasy, conversion, clergy, charity, tax, and immigration profiles require a source and legal-
data audit before implementation.

**Verify:** private belief and public identity can diverge; conversions and religious careers take
annual time and qualifications; consequences vary by country; charitable payments reconcile in the
financial statement; wills/endowments survive death; and legacy events remain rare,
tradition-specific, non-blocking, and compatible with heir continuation.

## Phase 10.4 — Personal and Family Presentation

**Status: planned.** Add a profile card showing legal/preferred name, age, location, citizenships,
languages, occupation, credentials, optionally displayed religious identity, and family status. Add
a family tree covering parents, nationalities, spouses, children, and grandchildren, plus a household
summary. Replace bare relationship numbers with supportive, close, ordinary, strained, hostile, or
estranged descriptions while retaining the underlying simulation score. Add locally contextual
school, workplace, and neighborhood descriptions without commuting mechanics.

**Verify:** profile, family tree, household membership, names, relationship labels, and descriptions
update after birth, marriage, separation, adoption, migration, moving out, death, and heir
continuation. Important information remains understandable without color or the map.

## Phase 10.5 — Personalization Integration and Polish

**Status: planned.** Migrate older saves, complete cultural-data and country-law review, test
multinational and multi-generational naming/religion cases, audit accessibility, lazy-load map and
large cultural datasets, and run full balance/build/browser verification before Phase 11 begins.

**Verify:** existing saves load safely; all Phase 1–10.5 tests pass; no turn advances more than one
year; generated cultural details remain editable where appropriate; the production build has no new
bundle warning; and GitHub Pages works without console, attribution, or accessibility errors.

---

## Deferred / non-goals (do not build unless asked)

Additional optional depth is tracked in `EXPANSION_BACKLOG.md`. The original nine-phase playable
roadmap and Phase 10 are complete. Phases 10.1–10.5 are planned personalization expansions; the
annual employment expansion remains reserved as Phase 11.

Multiplayer, real exchange rates, sub-national regions, deep social simulation, achievements/meta-progression, mobile layout (desktop-first; keep it responsive-friendly but don't invest), localization.
