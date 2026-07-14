# Cheb's Human Atlas — Game Design Document

> **You are building** a single-player, country-driven life simulator: the player is born in any country on Earth and lives one life, year by year, shaped by that country's economy, healthcare, education, military, legal, and immigration systems. This document is the master design spec. Country data comes from a preprocessed CIA World Factbook dataset — see `DATA_PIPELINE.md` for how raw data in `data/factbook/` becomes `src/data/countries.json`. Build order and per-phase verification live in `ROADMAP.md`. All numbers in this document are starting values, tunable during balancing.

**Tech stack:** React + Vite single-page app, client-only, no backend. All country data is bundled as one preprocessed JSON. State management: a single game-state object (plain reducer or Zustand — builder's choice), serializable to JSON for saves.

---

## 1. Core loop

One turn = **one game year**. The player reviews their situation across tabs, sets their yearly activity allocations and any decisions (job applications, purchases, moves), then presses **Advance Year**. Resolution order each year:

1. **Activities resolve** — stat/skill deltas from checked activities (§4)
2. **Career/education resolves** — schooling progress, job performance, promotion/firing rolls (§5, §6)
3. **Income & expenses** — salary/business/investment income, cost of living, rent, tuition (§8)
4. **Taxes** — yearly tax statement (§8.3)
5. **Health** — illness/accident rolls, condition progression, mortality check (§9)
6. **Relationships** — family relationship drift, partner/children events (§10)
7. **World & random events** — economic, political, opportunity events queued to the Events tab (§14)
8. **Age +1** — stat drift by age bracket, life-stage transitions

Death ends the life unless an **heir** exists (§10.4), in which case the player may continue as one of their children.

There is no win condition; the implicit goals are wealth, happiness, longevity, and family legacy. Show a **life summary screen** at death (net worth, achievements, family tree, timeline of major events).

---

## 2. Character creation

Character creation offers two entry points, prominently side by side:

- **Customize:** the player picks everything themselves — any of the 208 playable countries, city, sex, and optionally ethnicity/religion (otherwise those still roll from local distributions).
- **Random birth ("Born anywhere"):** the game rolls the birthplace by **real-world odds of being born there**. Country weight = `population × birthRate` (its share of the world's actual annual births — so high-fertility Nigeria is far likelier than its population share, aging Japan far less). Within the country, city vs. town vs. rural rolls from the urbanization rate, with named cities weighted by their populations. Everything else (sex, ethnicity, religion, wealth class) rolls from the country's real distributions. Any field the player locks in the UI stays fixed while the rest randomizes — partial customization is allowed.

Field details:

- **Country:** per above; the World tab doubles as a browse screen before choosing.
- **City:** named major cities (from factbook) plus generic tiers: *Secondary city*, *Town*, *Rural* (§8.4).
- **Sex:** choose or random (50/50).
- **Ethnicity, religion, native language:** rolled from the country's real distributions (weighted random); player may also pick manually. These are flavor plus light mechanics: religion enables the Religious Practice activity; minority ethnicity/religion in some countries adds small discrimination modifiers to job rolls and event weights (keep subtle: ±5%).
- **Family wealth class:** rolled from country Gini + GDP per capita. Five classes: Destitute / Poor / Middle / Affluent / Rich. High-Gini countries widen the distribution toward the extremes. Starting family wealth class drives childhood nutrition (small Health/Intelligence modifiers), education access, and inheritance prospects.
- **Family:** generate 2 parents (with jobs appropriate to wealth class) and 0–4 siblings (from country fertility rate).

The player starts at **age 0** and every click advances exactly one year, including infancy and early childhood. The age 0→1 turn applies the country's infant-mortality rate, modified by family wealth, Health, healthcare access, and serious illness. Ages 1–5 use a declining child-mortality risk. There is no infancy fast-forward.

---

## 3. Stats

Core stats, 0–100, visible as bars on the Overview tab:

| Stat | Meaning | Raised by | Lowered by |
|---|---|---|---|
| Health | physical condition | Gym, healthcare, youth | age, illness, accidents, prison |
| Happiness | life satisfaction | family, wealth vs. expectations, leisure | poverty, divorce, unemployment, war |
| Intelligence | learning ability | Reading, Studying, school | (rarely drops; head injuries) |
| Fitness | strength/athleticism | Gym, Sports, military service | age (declines after ~40), sedentary years |
| Charisma | social skill | Socializing, activism, work | isolation, prison |

Qualifications and experience are concrete records rather than abstract XP. Education stores
academic performance, completed years, and credentials. Career history stores years in each sector,
management experience, business ownership, vocational/business training, civic involvement, and
named accomplishments. These records gate applications, promotions, immigration, and business
outcomes.

**Age drift:** Health −0.5/yr from 40, −1.5/yr from 65. Fitness −1/yr from 40 unless Gym checked. Intelligence stable. Happiness has a **setpoint** of 50 modified by circumstances (employed +5, married +5 avg, poverty −10, chronic illness −10, recent bereavement −15 decaying over 3 years); each year Happiness moves 30% toward its setpoint.

---

## 4. Yearly activities (time allocation)

Each year the Activities tab offers checkboxes. **Slot budget by situation:**

| Situation | Slots |
|---|---|
| Child in school (6–17) | 2 |
| University student | 2 |
| Working full-time | 2 |
| Working part-time / informal | 3 |
| Unemployed / homemaker | 4 |
| Retired | 3 |
| In prison / conscript service | 1 (restricted list) |

School and jobs consume time implicitly and are not activities. Activity effects (per year checked):

| Activity | Effect | Notes |
|---|---|---|
| Studying & Reading | +Academic performance, +1 Intelligence, +1 Happiness | larger performance effect while enrolled |
| Gym / Sports | +3 Fitness, +1 Health | requires cost-of-living tier ≥ Poor or free (rural = free) |
| Socializing | +2 Charisma, +2 Happiness, +relationship scores | |
| Political activism | +1 year civic involvement, +1 Charisma | risk in authoritarian countries: yearly 3% arrest event roll (§13) |
| Religious practice | +2 Happiness, community ties (+1 Charisma) | only if religious |
| Side hustle | +small income (5–15% of local median wage), +1 year informal experience | not while imprisoned |
| Business study | +1 year business preparation | |
| Family time | +relationship scores ×2, +1 Happiness | requires spouse or children |
| Rest / leisure | +2 Happiness, +1 Health | |

Unchecked slots default to Rest at half effect. A selected routine persists into later years until
the player changes it. When circumstances make an activity unavailable or reduce the slot budget,
the engine removes invalid choices and trims excess selections in priority order. Effects are the
tunable table for balancing.

---

## 5. Education

Stages: **Primary (6–11) → Secondary (12–17) → University or Vocational (18+, 4 or 2 years)**.

- **Access:** each country has an `educationTier` (1–4, derived per DATA_PIPELINE §Derived tiers). In tier 1–2 countries, children of Destitute/Poor families face a yearly roll to be pulled out of school for work (tier 1: 15%/yr, tier 2: 5%/yr; player can resist at a family-wealth cost). Tier 3–4: schooling through secondary is automatic and free.
- **Quality:** academic performance responds annually to intelligence, health, school quality, private schooling, and Studying & Reading.
- **University:** admission requires academic performance ≥ 60 (vocational: ≥ 45). Tuition by country tier: free (tier 4 public systems, e.g. Germany), subsidized (~20% median wage/yr), expensive (~150% median wage/yr, e.g. US private). Scholarships require performance ≥ 80. Student loans are available in tier 3–4 countries.
- **Degrees** gate professional job ladders and skilled-visa immigration. Adult re-entry allowed at any age.
- **Studying abroad** is an immigration pathway (student visa, §12): pay foreign tuition, gain residence years.

---

## 6. Jobs & income

**Job ladders by sector.** Each country weights sectors by its real GDP composition. Ladders use credentials, relevant years of work, management history, and wage multipliers:

- **Informal/agricultural:** laborer (0.4×) → farmhand (0.6×) → foreman (0.9×). No gates. The only option for illegal immigrants and tier-1 dropouts.
- **Service:** shop clerk (0.7×) → office worker (1.0×) → manager (1.8×) → executive (3.5×). Gates: secondary school, then Academic/Charisma.
- **Industrial/trades:** apprentice (0.6×) → tradesman (1.1×) → master/site boss (2.0×). Gates: Vocational skill.
- **Professional:** junior (1.5×) → senior (2.5×) → top (5×) — doctor/lawyer/engineer flavor by degree. Gate: university degree, Academic ≥ 60.
- **Military:** see §7.
- **Business owner:** see §11.

**Median wage** per country = `GDP per capita (PPP) × 0.55` (household labor share approximation), converted to a single in-game currency display: everything is denominated in **local-PPP dollars** — do not simulate exchange rates; when the player emigrates, convert net worth at a PPP penalty/bonus derived from the GDP-pc ratio of the two countries.

- **Getting hired:** yearly application roll = base 70% − country unemployment rate (youth unemployment for a first job) + qualification and relevant-experience bonuses.
- **Promotion:** yearly roll once the credential and experience gate for the next rung is met (base 20%/yr, +Charisma/200).
- **Firing/layoff:** 3%/yr base, doubled during a national recession event.
- **Retirement:** eligible at country retirement age (default 65, 60 in some); pension per §8.5.

---

## 7. Military service & conscription

Every country carries a `military` block (see DATA_PIPELINE): `hasArmedForces`, `conscription` (none / voluntary / selective / mandatory), `serviceAge`, optional `callUpEndAge`, `serviceLengthYears`, `womenConscripted`, `callUpRate`, `repeatCallUp`, `payTier`.

**The draft.** In `mandatory`/`selective` countries, at `serviceAge` (usually 18) male players (and female where `womenConscripted`) receive a decision event:

- **Serve:** occupies the service years (activity slots reduced to 1). Effects per year served: +4 Fitness, +3 Vocational, small pay (0.3× median wage), 1% injury risk (10% if the country is at war/conflict-flagged → possible Health loss or death). After service: veteran flag (small hiring bonus in some countries).
- **Defer via university:** where education deferment exists (default: yes for mandatory-conscription countries); service is owed after graduation unless aged out.
- **Alternative civilian service:** where recognized (hand-tuned list; default: available in democracies with conscription); longer (×1.5 length), no Fitness bonus, no war risk.
- **Evade:** roll caught 10%/yr until aged out → judicial event (§13): fine or prison (authoritarian: prison likely); evaders may be blocked from passports/legal emigration until resolved.
- `callUpRate` separates legal liability from actual intake. A mandatory system can still use a
  lottery, quota, excess-contingent release, or intake only when volunteers fall short. Rates are
  gameplay estimates, not statutory percentages. Russia retries the quota roll in later eligible
  years; a non-selection elsewhere normally resolves that character's peacetime obligation.

**Sex-specific and overseas rules:** service terms are resolved per character rather than using one
number for both sexes. Israel is 3 yearly turns for men (32 months rounded upward) and 2 for women;
North Korea is 10 for men and 7 for women; Norway has gender-neutral liability but selects only 25%
of eligible players for a 1-year initial term. Every obligation shorter than one year is rounded up to
one playable year.

An overseas-born male who inherited South Korean citizenship receives a separate age-18 nationality/
military deadline. Renouncing Korean citizenship before that deadline removes the obligation. Retaining
it records overseas deferment, but moving back to reside in South Korea reactivates ordinary draft
eligibility. Missing the deadline prevents the model from treating Korean citizenship as freely
relinquishable before service or exemption. Short tourism is not simulated as emigration; Travel moves
residence and therefore counts as returning to live in Korea.

**Voluntary military career** (any country with `hasArmedForces`): enlisted (0.8× median wage) → NCO (1.2×) → officer (2.0×, requires university or Academic ≥ 60). Pay scaled by country `payTier` (from military expenditure %). Benefits: pension after 20 years, free healthcare while serving. **Deployment events** roll yearly (5%, or 25% if conflict-flagged): bonus pay, injury/death risk, Happiness swing. **Wartime mobilization:** a war event (§14) can conscript even in voluntary countries (reserves first, veterans included).

Countries flagged `hasArmedForces: false` (Costa Rica, Iceland, etc.) offer no military tab content and never draft.

---

## 8. Financial system

### 8.1 Accounts, currencies & net worth
- **Cash**, **personal bank savings**, a separate **household fund**, spouse/family personal savings, **Investments** (§8.2), **Property** (home; §8.4), and **Business equity** (§11), minus student, mortgage, business, consumer, tax, and court debts.
- All balancing remains in real PPP dollars, while the interface also shows country currency symbols and annual modeled exchange rates. Migration and remittances charge exchange fees.
- Country-sensitive savings, personal-loan, credit-card, and mortgage rates apply annually. Players can set emergency, housing, and retirement savings goals and seek bankruptcy relief through Law when eligible.
- Couples retain personal accounts and choose a negotiated household contribution arrangement. The yearly statement distinguishes income, expenses, taxes, non-cash asset changes, account transfers, and household versus personal results.

### 8.2 Investment vehicles
Available from age 18 via the Finances tab (availability gated: tier 1–2 countries lack stock/bond access unless Rich — informal alternatives only):

| Vehicle | Real return (mean/σ) | Notes |
|---|---|---|
| Savings | inflation −1% / 0 | always available |
| Government bonds | +1.5% / 2% | tier ≥ 2 |
| Stock index | +6% / 15% | tier ≥ 3 or Affluent+; crash events −30–50% |
| Real estate fund | +4% / 8% | tier ≥ 3 |
| Own home | +2% appreciation + saves rent | anywhere |
| Gold/informal | 0% / 5% | anywhere; safe from bank-freeze events |
| Private pension | +3% / 4%, locked to retirement | tier ≥ 3; employer match if Professional job |

Returns are real (inflation-adjusted); country inflation shocks (hyperinflation event for fragile economies) can wipe savings/bonds but not gold/property.

### 8.3 Taxes
Each country gets a simplified `taxProfile`: progressive, flat, or no personal income tax plus payroll/social-insurance contributions, with optional joint spouse filing where modeled. The annual statement shows marginal and effective rates, investment gains, consumption, gifts, inheritance/estate, retirement withdrawals, withholding refunds/balances, and current tax residency. Deliberate underreporting can trigger audits, penalties, tax debt, and a Law case.

Progressive defaults still use median-wage brackets:

| Tax tier | Brackets (of median-wage multiples: <1× / 1–3× / >3×) | Social contrib. |
|---|---|---|
| Low-tax (Gulf states, tax havens) | 0% / 0% / 5% | 0–5% |
| Light (developing, weak collection) | 2% / 8% / 15% | 5% |
| Moderate (US-like) | 8% / 18% / 28% | 8% |
| Heavy (EU welfare states) | 15% / 30% / 45% | 15% |

Informal/illegal work remains outside ordinary withholding but earns no benefits and risks penalties. Investment rates vary by tax tier and apply when gains are realized; pension withdrawals use a reduced retirement rate. Estate and gift exemptions and spouse treatment come from inheritance rules.

### 8.4 Cost of living & housing
Base yearly cost of living = `0.45 × median wage`, times city-tier multiplier: **capital 1.3× / major city 1.15× / secondary 1.0× / town 0.85× / rural 0.7×**, times household size factor (+25% per dependent, spouse counts half if also working). Rent = 30% of CoL separately; buying a home (price ≈ 6× median wage × city multiplier, mortgage available tier ≥ 3 at 20% down) removes rent. Wealthier lifestyle option (checkbox: Frugal −20% CoL/−2 Happiness, Normal, Lavish +50% CoL/+3 Happiness).

### 8.5 Social benefits
Country `welfareTier` (generous / moderate / minimal / none, per DATA_PIPELINE):

| Benefit | Generous | Moderate | Minimal | None |
|---|---|---|---|---|
| Unemployment | 60% of last wage, 2 yrs | 40%, 1 yr | 15%, 1 yr | — |
| State pension | 50% median wage | 30% | 15% | — |
| Child benefit | 5% median wage/child/yr | 2% | — | — |
| Disability | as pension | as pension | half | — |

Benefits require legal residency; illegal immigrants get none.

---

## 9. Healthcare

### 9.1 System archetypes
Each country has a `healthcareArchetype` (assignment rules in DATA_PIPELINE):

| Archetype | Player cost | Quality basis |
|---|---|---|
| Universal single-payer (UK, Canada) | free, small wait-time penalty on elective care | country health tier |
| Universal insurance (Germany, Japan) | 5% of income premium | health tier |
| Mixed public/private (US, many middle-income) | insurance optional: 8% of income, else pay per treatment | insured: tier; uninsured: tier −1 and bills |
| Out-of-pocket (low-income countries) | pay per treatment | tier, capped low |

`healthTier` 1–4 from health expenditure + physician density. Treatment success and Health restoration scale with tier; the Rich can always buy tier-4 care via **medical tourism** (travel cost + top price).

### 9.2 Illness, chronic conditions, disability, and accidents

Yearly risks use age, country obesity/tobacco/sanitation/water data, Fitness, occupation, and healthcare access. Acute events are named (respiratory infections, gastroenteritis, pneumonia, malaria, tuberculosis, cancer, stroke, cardiac events, and severe infection). Treatment may succeed, fail, be unaffordable, or be unavailable.

Chronic conditions include asthma, diabetes, hypertension, arthritis, respiratory disease, kidney disease, heart disease, dementia, depression, and lasting complications of serious illness. Every condition tracks diagnosis age, duration, mild/moderate/severe status, controlled/uncontrolled status, annual management cost, Health decay, and mortality contribution. Controlled illness progresses more slowly and may improve; unmanaged illness can become more severe.

Accidents retain occupational/country risk modifiers. Lasting disability is typed (mobility, respiratory, chronic pain, vision, hearing, or cognitive), graded mild/moderate/severe, and can reduce free activity time, education progress, physical-job access, and promotion chances. Strong-law settings assume more workplace accommodation. Disability cash support is eligibility-tested through the Phase 8 welfare model.

From middle age, Fitness becomes harder to maintain. From 65+, condition burden, low Fitness, and age can accumulate frailty; severe frailty may produce mobility limitations. Vision and hearing loss can emerge later in life.

### 9.3 Mental health
Happiness < 25 for 2+ consecutive years triggers depression (−treatable condition; therapy available tier ≥ 3).

### 9.4 Mortality
Yearly adult death probability uses a Gompertz age curve calibrated against country life expectancy, then incorporates Health, active serious illness, each chronic condition's severity/control, frailty, and conflict. Age 0→1 uses the country infant-mortality rate; ages 1–5 use a declining child-risk curve. Death records a likely medical, infant, accident/conflict, frailty, or natural cause instead of a generic “infancy” or “poor health” label.

---

## 10. Family & relationships

Deliberately lightweight — no social-sim depth.

1. **Dating:** from age 16+, checkbox intent on Family tab → yearly match roll (Charisma-weighted). Partner is generated from local demographics (same city; ethnicity/religion sampled with in-group weighting).
2. **Marriage:** propose after 1+ year dating; acceptance roll on relationship score. Spouse has own job/income (participation odds by country female-labor data if available, else income tier default); spouse income joins household.
3. **Children:** conceived by choice (or 5%/yr surprise if married); fertility declines with age. Children cost via household CoL, give +2 Happiness/yr while relationship good. Their Intelligence rolls inherit ±10 of parents' average.
4. **Wills & heirs (play-as-kid):** Law tab lets the player write a will splitting wealth among family. On death, estate pays country inheritance tax (Heavy-tax countries 20%, Moderate 10%, else 0), then the player may **continue as any of their children** (who has been aging in the same country with generated stats). No will → equal split. This is the multi-generation loop.
5. **Relationship scores** (0–100 per person) drift −3/yr without Socializing/Family-time; low spouse score risks divorce event (split assets 50/50).
6. **Elderly parents:** may need support payments (event) in welfare-tier minimal/none countries.

---

## 11. Business

From age 18, Business tab:

- **Found:** pick sector (weighted to country GDP mix), invest starting capital (min 0.5× median wage for informal stall, 5× for registered company).
- **Yearly resolution:** revenue = capital × sector base return × business ownership/profit/training experience × country business climate − wages and interest.
- **Grow:** reinvest, hire employees (each adds capacity, costs 1× median wage), take business loan (tier ≥ 2, 10% interest).
- **Exit:** sell at 1.5× trailing profit, or **bankruptcy** if capital ≤ 0 → judicial process (§13): debts discharged in strong-law countries; debt prison risk in weak-law ones.
- Informal businesses (unregistered) pay no tax but capped in size and vulnerable to shakedown events in weak-law countries.

---

## 12. Immigration

Travel/Immigration tab shows any target country with entry routes, costs, and the player's eligibility computed live:

| Route | Requirements | Cost/Notes |
|---|---|---|
| Treaty freedom of movement | citizenship in same bloc (table below) | trivial cost; full work rights |
| Regional residence agreement | nationality in MERCOSUR Residence, Andean Community, or EAC area | two-year temporary work/residence permission, then permanent-residence conversion |
| Skilled visa | university degree + two years of professional experience; target must be income tier ≥ own | fees ~0.5× median wage; work rights |
| Student visa | admitted to university; pay foreign tuition | fixed term; destination-specific part-time work cap; counts toward residency |
| Temporary work visa | Academic or Vocational ≥ 35 | employer/sector-tied permission for 2–3 years; does not initially count toward naturalization |
| Working holiday visa | age 18–30 and eligible partner-country passport | 12-month stay in Australia, New Zealand, Italy/Japan; temporary jobs only |
| Golden visa | invest threshold (10–40× local median wage) in countries offering it (hand-tuned list) | immediate residency |
| Family reunification | spouse or parent is citizen/resident there | modest fee, wait 1 yr |
| Asylum | own country war/persecution-flagged (or player persecuted event) | acceptance roll: generous-welfare democracies 60%, others 25%; rejected → deport or stay illegal |
| Illegal | always available | cost 1–4× median wage to smugglers (higher for richer/farther targets); risk en route (2% death, 10% robbed); thereafter informal work only, no benefits, yearly 3–10% deportation roll by law enforcement (higher after overstay) |

**Full-movement blocs:** EU/EEA+CH, Nordic, CTA (UK–Ireland), Trans-Tasman (AU–NZ),
GCC, ECOWAS, Russia–Belarus, OECS Economic Union, and the four-country CARICOM enhanced
movement area (Barbados, Belize, Dominica, Saint Vincent and the Grenadines). Wider CARICOM is
modeled as skilled-category movement rather than universal unrestricted residence.

**Regional residence:** MERCOSUR Residence Agreement covers Argentina, Bolivia, Brazil, Chile,
Colombia, Ecuador, Paraguay, Peru, and Uruguay. The Andean statute separately covers Bolivia,
Colombia, Ecuador, and Peru. EAC work/residence permission covers Burundi, DRC, Kenya, Rwanda,
Somalia, South Sudan, Tanzania, and Uganda. These begin as two-year permissions with work rights;
the player applies for permanent conversion at expiry.

**Temporary status:** visas count down one year per turn. At expiry, the player chooses to return,
request one permitted extension, or overstay. Returning preserves future options. Overstaying creates
irregular status, ends student work rights, increases enforcement risk, and bars legal applications
for 3–7 years according to the destination's law tier. Student work caps are modeled from destination
rules (Australia 24 hours/week equivalent; New Zealand 25 hours/week); other countries use transparent
income-tier defaults. A graduated student may seek a two-year post-study work permission.

**Naturalization:** from each country's real Citizenship data — residency years required, dual-citizenship allowed?, jus soli for player's children born there. Citizenship unlocks passport (visa-free mobility tier), voting-flavor events, and conscription liability (§7) in the new country.

Emigrating converts net worth per §6's PPP conversion; property must be sold. Household languages
come from family background rather than every language listed for a country. Newborns begin with
exposure, school introduces the main instructional language, and language study consumes one annual
activity slot and adds 20 proficiency. Local proficiency below 60 reduces civilian wages by 5–25%.
Selected common destination countries require 50–70 proficiency for naturalization; the threshold is
shown before applying. Countries without an explicit modeled requirement do not receive an invented test.

Australian working-holiday holders may use **Specified regional work** as an activity. Three months
(the 88-day abstraction) during visa one unlocks visa two; six months during visa two unlocks visa
three. Each visa remains one year and study is capped at four months. Italy–Japan is a reciprocal
one-year working-holiday route from April 2026.

Rare births (about 3% of families, with about half of those children inheriting the extra passport)
can have a multinational parent. Japan at age 20 and South Korea at age 22 generate nationality-choice
obligations for multiple nationals. Missing the choice creates recurring enforcement risk rather than
instant automatic loss; South Korean congenital dual nationals may file the modeled non-exercise pledge,
while military obligations continue. Naturalizing in a country whose source data disallows dual
citizenship replaces prior citizenships.

---

## 13. Judicial system

Country `lawTier`: strong / medium / weak rule of law (per DATA_PIPELINE; from legal-system text + government type).

- **Player as victim** (event): theft/fraud scaled by lawTier and city tier; police recover assets 60/30/10%.
- **Player as accused:** triggered by crime events (false accusation risk in weak-law: 1%/yr), draft evasion, business violations, activism in authoritarian states, or **deliberate crimes** — the player can choose petty crime / smuggling / fraud on the Law tab for money (payout vs. caught-probability by lawTier — strong law: high catch, fair trial; weak law: low catch, unfair trial but bribable).
- **Trial:** outcome roll = evidence base × lawyer spend (none / public defender / expensive ×0.5 conviction odds) × lawTier fairness; weak-law: bribe option (1× median wage, 70% works, 10% backfires).
- **Prison:** each click still advances exactly one year, with a restricted 1-slot activity list,
  −3 Health/yr, −5 Happiness/yr, and −Charisma. Multi-year terms support parole and paid appeals.
  Criminal records penalize hiring/promotion and military enlistment and block most legal
  immigration and naturalization for 10 years unless overturned.
- **Civil:** business disputes, bankruptcy/debt discharge, and estate-plan challenges use the same
  machinery with money stakes. Strong-law bankruptcy normally discharges much more eligible debt;
  weak-law debt enforcement can be punitive.

---

## 14. Events

**Presentation rule (critical):** events never modal-block the game. Each year's events land in the **Events tab** as a list; the tab badge shows counts. Two classes:

- **Informational** (majority): auto-applied, logged (e.g., "Inflation hit 9% this year", "Your sister married").
- **Decision events:** carry option buttons and a **stated default** that auto-applies if the player advances the year without answering (e.g., job offer default: decline; draft notice default: comply). Truly blocking events are only: death of the player (life-summary screen) and heir selection.

**Categories & sample tables** (weights per year; builder should implement as data-driven event definitions):

| Category | Examples | Base weight |
|---|---|---|
| Health | illness/accident (§9) | per §9 |
| Economic | recession (national, every ~10 yrs), hyperinflation (fragile economies), boom, layoffs, currency crisis | 8%/yr country-level |
| Political | election (flavor), unrest, coup (weak states), war (conflict-flagged neighbors/history), persecution of activists | 2–10% by stability |
| Family | births/deaths of relatives, parent illness, sibling emigration | 10% |
| Opportunity | job offer, business partner, lottery-like windfall (rare), mentor (+skill) | 8% |
| Crime | victim events per §13 | by lawTier |

War events raise mortality, crash the local economy (−30% wages), unlock the asylum route for that country's citizens, and can trigger mobilization (§7).

---

## 15. UI

**Top tab bar** (persistent), one window per tab — organized, no mega-screen (user requirement #16):

`Overview | Activities | Finances | Career | Education | Family | Health | Business | Travel | Law | Events | World | Settings`

- **Persistent header:** name, age, location flag+city, cash, Health/Happiness mini-bars, **Advance Year** button (always visible), Events badge.
- **Overview:** stat bars, current situation summary, this-year log digest, net-worth sparkline.
- **World:** browse any country's profile (its stats, systems, tiers) — doubles as the emigration research screen.
- Design language: clean, data-dense control-room panels (dark theme default). No modal popups except death.
- **Save system:** Settings contains rolling autosave controls (Off/every 1, 5, or 10 years), named manual save slots, exact RNG restoration, and validated JSON export/import. Saved lives remain accessible from character creation.

---

## 16. Traceability — the 20 original ideas → sections

| # | Idea | Where |
|---|---|---|
| 1 | Simulate life in many parts of the world | §2, DATA_PIPELINE (208 playable countries) |
| 2 | Sophisticated financial system over relationship sim | §8 (accounts, investments, statements) |
| 3 | Basic family: spouse, kids | §10 |
| 4 | No overbearing event popups; bypassable | §14 presentation rule |
| 5 | Checkbox activities with slot limits by life stage | §4 |
| 6 | Healthcare systems by country | §9 |
| 7 | University/education access by country | §5 |
| 8 | Immigration incl. illegal, skilled, treaty, golden visa | §12 |
| 9 | Country-dependent taxes & tax burden | §8.3 |
| 10 | Multiple investment vehicles | §8.2 |
| 11 | Social benefits for the poor by country | §8.5 |
| 12 | Start a business | §11 |
| 13 | Chance-based accidents | §9.2 |
| 14 | Play as your kid; wills | §10.4 |
| 15 | Judicial system | §13 |
| 16 | Tabbed top-bar UI, organized windows | §15 |
| 17 | Ethnicity, nationality, religion | §2 |
| 18 | Factbook powers country setup | DATA_PIPELINE.md |
| 19 | Purchasing power & cost of living | §6 (PPP wages), §8.4 |
| 20 | Live in any city of the world | §2, §8.4 (named cities + tiers) |

*(User-added requirement: draft & military system → §7.)*
