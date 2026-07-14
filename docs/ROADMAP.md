# RealLives Sim — Build Roadmap

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

---

## Deferred / non-goals (do not build unless asked)

Additional optional depth is tracked in `EXPANSION_BACKLOG.md`. The nine-phase playable roadmap is
complete; later work should be treated as expansion or maintenance rather than an unfinished phase.

Multiplayer, real exchange rates, sub-national regions, deep social simulation, achievements/meta-progression, mobile layout (desktop-first; keep it responsive-friendly but don't invest), localization.
