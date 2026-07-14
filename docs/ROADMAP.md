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
domestic-safety choices, estrangement/reconciliation/favoritism, inheritance-dispute risk, recorded
experience, accomplishments, and education credentials are implemented and tested.

## Phase 10.1 — Names and Legal Identity

**Status: complete.** The player can enter or generate a name. Culturally contextual given
and family names for parents, siblings, partners, friends, children, and grandchildren. Naming
profiles may use paternal, maternal, bilateral, double-surname, patronymic/matronymic, or
family-name-first conventions according to country, culture, religion, and family background.
Multicultural families may draw from either parent's tradition without rigidly assigning every name
by ethnicity or religion. The player can name children.

Track birth name, current legal name, and previous names. Marriage
offers keeping, adopting, appending, or combining surnames only where culturally and legally
appropriate, including traditions in which spouses normally retain their birth names. Voluntary
legal name changes depend on country eligibility, procedure, restrictions, and cost.

**Verified:** generated households have internally consistent but non-identical names across several
single- and multinational country profiles. Manual player and child names persist through saves,
marriage, migration, divorce, death, and heir continuation.

## Phase 10.1.1 — Household Economy and Family Healthcare

**Status: complete.** Parents, siblings, spouses, and children have persistent employment states,
occupations, annual earnings, household contributions, personal savings, health, coverage, and care
histories. Provider income, dependent living costs, insurance premiums, treatment bills, and unmet
care appear in the household statement and family-finance summaries. A dependent player's medical
care uses actual household earnings and funds, including parental insurance coverage where the
country model permits it.

Family-of-origin finances separate when the player reaches adulthood: parents retain their fund,
may provide a limited launch gift, and can offer bounded support while the player still lives at
home. Their assets do not automatically become the adult player's net worth.

**Verified:** family income and healthcare reconcile in annual statements; funded care is treated
and billed, unaffordable care is reported as unmet, dependent coverage works, adulthood does not
transfer the parents' fund, and all records survive save/export and restoration.

## Phase 10.1.2 — Identity, Experience, Languages, and Settings

**Status: complete.** Removed preferred-name and nickname fields. Voluntary legal-name changes now
appear under Law → Civil and Legal Identity. Replaced visible XP and levels with academic performance,
formal credentials, years of sector experience, management and business history, training, and
accomplishments. Job, promotion, business, military, education, and immigration gates use those
records, and old XP saves receive a conservative age-limited migration.

Combined Studying and Reading into one annual activity. Country language lists now describe available
languages rather than granting all of them at birth: household languages depend on family background,
multinational parents may pass on a language, newborns begin with exposure, and school introduces the
main instructional language. Corrected incomplete ethnicity lists so an unlisted majority remains
possible instead of making every birth a listed minority.

Save and Resume now lives in a Settings tab. Autosaving can be disabled or set to every 1, 5, or 10
years while manual saves and JSON export remain available.

**Verified:** no new character stores XP; work accumulates real years; credentials and performance
gate education and careers; Turkish and Kurdish household cases differ correctly; multinational
languages and old-save migration work; and all autosave intervals are covered by regression tests.

## Phase 10.2 — Interactive Map and Country Information

**Status: complete.** Added a dedicated, lazy-loaded Country tab with a MapLibre map using CARTO's
Dark Matter/OpenStreetMap basemap. Country coordinates, currencies, and flag codes are generated
locally from the Factbook source rather than live geocoding. The map follows the current country
after migration and shows both current and birth countries when they differ. Required attribution
appears beside and within the map and in Credits; browser geolocation is never requested.

The accessible text facts panel contains flag, country, capital, modeled location, population,
primary languages, currency, income/development tier, life expectancy, healthcare, education,
employment and gender-rights profile, same-sex relationship status, military/conscription,
welfare/housing, tax/inheritance, immigration/citizenship, and current economic/conflict conditions.
It includes an “About This Country Model” note explaining that profiles are simplified simulation
data, not legal advice. Overview retains a compact current-country card linking to this screen,
while World remains the comparison browser.

**Verified:** all 208 playable countries have valid local coordinates, currencies, flag codes, and
complete text facts. The map library is a separate nested lazy chunk and does not increase the
initial JavaScript bundle. Birth and migration keep the correct current/origin locations; responsive
and keyboard-accessible text content remains usable if remote map tiles cannot load.

## Phase 10.3 — Currency, Banking, Household Budgets, and Taxation

**Status: complete.** Added local currencies, annual modeled exchange rates, exchange fees,
country-sensitive savings interest, consumer credit, personal loans, country-rate mortgages,
remittances, investment basis and realized-gain taxation, savings goals, and personal bankruptcy
through the Law system.

Personal savings, spouse savings, and the household fund remain separate. Couples may use
proportional, equal, pooled, mostly separate, single-income, or custom contribution arrangements;
changes are proposed and resolve annually according to relationship strength and broad cultural
context. The later Religion phase may deepen those influences without removing player choice.

Country tax profiles now distinguish progressive, flat, and no-personal-income-tax systems and
itemize marginal/effective rates, income tax, payroll/social insurance, individual or optional joint
spouse filing, investment, consumption, gift, inheritance/estate, and retirement taxes. Annual
filing records withholding, refunds or balances due, tax residency, audits, penalties, tax debt,
and the legal risk of deliberate underreporting.

**Verified:** generated exchange rates and currency codes cover all 208 countries; account transfers
balance; spouses retain personal funds; loans, remittances, investments, migration exchange fees,
goals, bankruptcy, estate exemptions, and tax statements survive saves; every annual financial
statement balances; the complete regression suite and production build pass.

## Phase 10.3.1 — Full-Life Corrections, Career Variety, and Screen Organization

**Status: complete.** This focused correction and expansion pass was based on repeated complete-life
playtests and was completed before Phase 10.4.

1. Correct false tax-evasion audits so honest individual and joint filers are never penalized for a
   legal filing calculation.
2. Stop exponential business wealth, separate retained business earnings from owner income, and add
   realistic revenue, operating-cost, market-demand, tax, and failure limits.
3. Reconcile university, employment, and military states. Full-time education must pause, defer, or
   explicitly become part-time during military service or full-time work.
4. Rebalance promotion and management progression using qualifications, performance, experience,
   vacancies, employer size, economic conditions, and possible demotion or job changes.
5. Replace percentage-of-balance mortgages with country-sensitive interest and a modeled repayment
   term so ordinary mortgages normally conclude within 15–30 years.
6. Organize friendships into a limited close circle, ordinary friends, and faded/former friendships;
   social time must be distributed rather than improving every relationship simultaneously.
7. Reorganize Finance with internal sections for Summary, Accounts, Debt & Credit, Assets & Goals,
   Taxes, and Statements. Only one internal section is displayed at a time.
8. Reorganize Career initially into Current Position, Find Work, Career History, and Qualifications.
   Workplace and Retirement sections remain reserved for the deeper Phase 11 employment systems.
9. Expand civilian career variety with country-sensitive availability, pay, qualifications, risks,
   and progression paths in the following approved groups:
   - Agriculture: farm labor, farming, livestock, plantation work, and farm supervision.
   - Construction: labor, carpentry, electrical work, plumbing, and site management.
   - Manufacturing: factory work, machine operation, technical work, quality inspection, and management.
   - Retail and hospitality: cashiering, shop work, cooking, hotels, and restaurant management.
   - Office and administration: reception, administrative work, accounting, human resources, and management.
   - Education: teaching assistance, primary and secondary teaching, university teaching, and school leadership.
   - Healthcare: care work, nursing assistance, nursing, pharmacy, and medicine.
   - Technology: IT support, programming, systems administration, engineering, and technology management.
   - Government: clerical work, postal work, civil service, diplomacy, and senior administration.
   - Public safety: security, policing, firefighting, investigation, and command.
   - Law: paralegal work, legal practice, prosecution, judging, and senior judicial work.
   - Media and creative work: journalism, photography, design, writing, and editing.
   - Informal work: street vending, domestic work, waste collection, day labor, and informal repair.
10. Run full-life regression and browser tests across multiple countries, education paths, family
    structures, businesses, migrations, disabilities, legal outcomes, and financial profiles.

**Explicitly deferred:** transportation careers and religious careers are not part of Phase 10.3.1.
Transportation belongs with a later transportation/commuting expansion; religious careers remain in
Phase 10.4 after the religion and qualification systems are implemented.

**Save-compatibility rule during active development:** updates may intentionally break saves created
by earlier versions. Do not build save-conversion or migration work for future phases unless the owner
explicitly asks to restore backward compatibility. Current-version saving and resuming should still
work normally.

**Verified:** honest separate and joint filing no longer creates false evasion; owner draws and
retained business value remain separate and bounded; study pauses during service; mortgages
amortize to a fixed term; close friendship circles remain limited; 13 specific civilian career
families provide more than 50 career levels with qualification, citizenship, health, language,
risk, hiring, layoff, and slower promotion rules. Finance and Career now open into focused internal
sections. The dedicated Phase 10.3.1 regression checks, complete legacy suite, and production build
pass.

## Phase 10.3.2 — Dynasty Succession and Estate Corrections

**Status: complete.** Rebuilt heir continuation so a chosen successor keeps their established
identity, age, savings, debts, housing, spouse or partner, descendants, career and career history,
education, health conditions, languages, citizenships, residence, and wider modeled family tree.
Inheritance is added to the successor's existing savings rather than replacing it. The game records
each playable succession and whether control stayed in the same generation or moved to another
family-tree branch.

Estate settlement now itemizes assets, all debts, court fines, business liabilities, funeral/final
costs, inheritance tax, distributable wealth, and heirless wealth. Legal and playable priority is:
living children; then grandchildren only without living children; then siblings; nieces/nephews;
parents; aunts/uncles; cousins; and other modeled relatives. A spouse may receive the share required
by local law but is not automatically a playable dynasty successor. Wills cannot bypass living
children to favor extended relatives. Charity and charitable bequests remain deferred to Phase 10.4.

Siblings, aunts/uncles, and cousins can now form named partnerships and have children, allowing
niece, nephew, cousin, and collateral-branch succession to arise through annual play. If no playable
relative remains, the family story ends and the estate summary explains the local heirless-estate
outcome.

**Verified:** child, grandchild, sibling, niece/nephew, cousin, and no-heir priority; preserved money,
debts, spouse, children, health, career, credentials, languages, citizenship, and family relations;
three deaths with two inheritances; same-generation branch switches; funeral costs; complete debt
deduction; succession history; and the absence of charitable will options before Phase 10.4.

## Phase 10.4 — Religion, Belief, Charity, and Religious Legacy

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

## Phase 10.5 — Personal and Family Presentation

**Status: planned.** Add a profile card showing legal/preferred name, age, location, citizenships,
languages, occupation, credentials, optionally displayed religious identity, and family status. Add
a family tree covering parents, nationalities, spouses, children, and grandchildren, plus a household
summary. Replace bare relationship numbers with supportive, close, ordinary, strained, hostile, or
estranged descriptions while retaining the underlying simulation score. Add locally contextual
school, workplace, and neighborhood descriptions without commuting mechanics.

**Verify:** profile, family tree, household membership, names, relationship labels, and descriptions
update after birth, marriage, separation, adoption, migration, moving out, death, and heir
continuation. Important information remains understandable without color or the map.

## Phase 10.6 — Personalization Integration and Polish

**Status: planned.** Migrate older saves, complete cultural-data and country-law review, test
multinational and multi-generational naming/religion cases, audit accessibility, lazy-load map and
large cultural datasets, and run full balance/build/browser verification before Phase 11 begins.

**Verify:** existing saves load safely; all Phase 1–10.6 tests pass; no turn advances more than one
year; generated cultural details remain editable where appropriate; the production build has no new
bundle warning; and GitHub Pages works without console, attribution, or accessibility errors.

---

## Deferred / non-goals (do not build unless asked)

Additional optional depth is tracked in `EXPANSION_BACKLOG.md`. The original nine-phase playable
roadmap and Phase 10 are complete. Phases 10.1–10.3 are complete; Phases 10.4–10.6 are planned personalization expansions; the
annual employment expansion remains reserved as Phase 11.

Multiplayer, real exchange rates, sub-national regions, deep social simulation, achievements/meta-progression, mobile layout (desktop-first; keep it responsive-friendly but don't invest), localization.
