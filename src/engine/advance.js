// Advance-year engine (Phase 2): resolves the full yearly pipeline.
// Order: pending decision -> age -> education -> military -> activities ->
// employment -> finances/taxes -> drift/happiness -> mortality -> next situation.
import { COUNTRY_BY_ID } from './countries.js';
import { resolveEducation } from './education.js';
import { applyActivities, reconcileActivities } from './activities.js';
import { resolveEmployment, wageFor, RETIREMENT_AGE, attemptHire } from './jobs.js';
const jobsModule = { attemptHire };
import {
  draftDue, calledUp, chooseServe, chooseDefer, chooseEvade,
  resolveConscriptService, resolveEvasion, resolveMilitaryCareer,
  careerWage, isCareerPensionEligible, militaryPension,
} from './military.js';
import {
  costOfLiving, rent, computeTax, bankRealRate, LIFESTYLES,
} from './economy.js';
import { resolveHealth, hasSeriousUntreated, mortalityConditionRisk, likelyMedicalCause } from './health.js';
import { rollEvents, resolveDecision } from './events.js';
import { resolveFamily, spouseIncome } from './family.js';
import { teenPartTimeIncome } from './labor.js';
import { resolveInvestments, investmentValue } from './investments.js';
import { resolveBusiness } from './business.js';
import { resolveImmigration, isLegalResident, tickTemporaryVisa, tickNationalityObligation, visaWorkFraction } from './immigration.js';
import { ensureJudicial, openCivilCase, openCriminalCase, resolveJudicialYear } from './judicial.js';
import { ensureBenefits, evaluateBenefits, unemploymentEntitlement } from './welfare.js';
import { ensureHousing, resolveHousingYear } from './housing.js';

function clamp(v, lo = 1, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

// A player is financially independent (pays own CoL/taxes) once an adult and
// not a dependent student/child.
function isIndependent(ch) {
  return ch.age >= 18 && !['child', 'student'].includes(ch.employmentStatus);
}

// ---- Happiness setpoint (section 3) -------------------------------------
function happinessSetpoint(ch, ctx) {
  let sp = 50;
  const wealthIdx = ch.wealthIdx;
  if (ctx.employed) sp += 5;
  if (ctx.poverty) sp -= 10;
  else if (wealthIdx <= 0 && ch.age < 18) sp -= 6; // born destitute
  if (ch.stats.health < 30) sp -= 10;
  if (ch.spouse) sp += 5;
  return sp;
}

// ---- Age drift (section 3) ----------------------------------------------
function applyAgeDrift(ch, rng, ctx) {
  const a = ch.age;
  const s = ch.stats;
  if (a >= 65) s.health -= 1.5;
  else if (a >= 40) s.health -= 0.5;
  else if (a <= 12) s.health += 0.5;
  s.health += rng.float(-0.5, 0.5);
  const sp = happinessSetpoint(ch, ctx);
  s.happiness += (sp - s.happiness) * 0.3;
  for (const k of Object.keys(s)) s[k] = clamp(s[k]);
}

// ---- Mortality (section 9.4) --------------------------------------------
function baseHazard(country, age) {
  const le = country.lifeExpectancy || 70;
  const B = 0.085;
  // Retuned in Phase 3: a TYPICAL player experiences illness/accidents that erode
  // health (raising the mortality multiplier), so the base is lowered to keep median
  // death near `le`. Healthy players outlive it; unhealthy die younger (intended).
  // Expanded named conditions now contribute their own mortality burden, so the
  // age-only baseline is lower than the earlier generic-health calibration.
  const A = (B / Math.exp(B * le)) * 0.10;
  return A * Math.exp(B * age);
}
function mortalityProbability(ch, country, ageAtStart = Math.max(0, ch.age - 1)) {
  const age = ch.age;
  let p;
  if (ageAtStart === 0) {
    const imr = (country.infantMortality ?? 20) / 1000;
    const wealthMult = [1.3, 1.15, 1, 0.82, 0.68][ch.wealthIdx ?? 2];
    p = imr * wealthMult;
  } else if (ageAtStart < 5) {
    const imr = (country.infantMortality ?? 20) / 1000;
    p = imr * 0.12 * (1.1 - ageAtStart * 0.12);
  } else p = baseHazard(country, age);
  const h = ch.stats.health;
  const healthMult = h >= 100 ? 0.5 : h <= 20 ? 3 : 3 - (h - 20) / 80 * 2.5;
  p *= healthMult;
  const medical = mortalityConditionRisk(ch);
  p *= Math.min(3.5, 1 + medical.total * 0.55);
  return Math.max(0, Math.min(0.99, p));
}

function chooseCauseOfDeath(ch, country, rng, ageAtStart, war) {
  if (war && rng.chance(0.55)) return 'conflict-related injury';
  if (ageAtStart === 0) {
    const sanitationRisk = 1 - (country.sanitation ?? 80) / 100;
    return rng.weighted([
      { name: 'birth or congenital complications', w: 4 },
      { name: 'newborn infection', w: 2 + sanitationRisk * 4 },
      { name: 'pneumonia', w: 2 },
      { name: 'diarrheal disease', w: 0.5 + sanitationRisk * 4 },
      { name: 'malnutrition', w: country.incomeTier <= 2 ? 2 : 0.2 },
    ], x => x.w).name;
  }
  if (ageAtStart < 5) {
    return rng.weighted([
      { name: 'pneumonia', w: 3 },
      { name: 'diarrheal disease', w: country.incomeTier <= 2 ? 3 : 0.5 },
      { name: 'childhood infection', w: 3 },
      { name: 'malnutrition', w: country.incomeTier <= 2 ? 2 : 0.2 },
    ], x => x.w).name;
  }
  const medical = likelyMedicalCause(ch);
  if (medical && rng.chance(0.75)) return medical;
  if ((ch.health?.frailty || 0) >= 40 && ch.age >= 70) return 'age-related frailty';
  if (ch.stats.health < 25) return 'complications of poor health';
  return ch.age > (country.lifeExpectancy || 70) ? 'natural causes in old age' : 'natural causes';
}

// ---- Pending decision resolution ----------------------------------------
// Applies every queued decision's chosen option (or its default if the player
// advanced without answering). Draft is handled specially; others via events.js.
function resolvePendingDecisions(ch, country, state, rng, log) {
  const pending = ch.pendingDecisions || [];
  ch.pendingDecisions = [];
  for (const d of pending) {
    if (d.type === 'draft' || d.type === 'mobilization') {
      const choice = d.choice || d.default;
      if (choice === 'serve') { chooseServe(ch, country); log.push('Reported for military service.'); }
      else if (choice === 'alternative') { chooseServe(ch, country, { alternative: true }); log.push('Began alternative civilian service.'); }
      else if (choice === 'defer') { chooseDefer(ch); log.push('Deferred military service.'); }
      else if (choice === 'evade') { chooseEvade(ch); log.push('Chose to evade the draft.'); }
    } else {
      const before = log.length;
      resolveDecision(ch, country, state, rng, d, log);
      if (['legalCase','legalAppeal','civilCase'].includes(d.type)) {
        for (const line of log.slice(before)) pushEvent(ch, 'crime', line);
      }
    }
  }
}

// ---- Finances (sections 8.1, 8.3, 8.4) ----------------------------------
function resolveFinances(ch, country, rng, incomeLines, log, extraExpenses = []) {
  const independent = isIndependent(ch);
  const statement = {
    age: ch.age, income: [], expenses: [], assetChanges: [], net: 0,
    tax: { incomeTax: 0, socialContrib: 0, total: 0, personalIncomeTax: 0,
      householdIncomeTax: 0, personalSocialContrib: 0, householdSocialContrib: 0 },
    household: { income: 0, expenses: 0, taxes: 0, net: 0 },
  };

  // Income lines (already gathered by caller): {label, amount, untaxed}
  let personalTaxable = 0, householdTaxable = 0, personalIncome = 0, householdIncome = 0;
  for (const l of incomeLines) {
    if (l.nonCash) { if (Math.abs(l.amount) >= 1) statement.assetChanges.push({ label: l.label, amount: l.amount }); continue; }
    if (l.amount <= 0) continue;
    statement.income.push({ label: l.label, amount: l.amount, household: l.target === 'household' });
    if (l.target === 'household') {
      householdIncome += l.amount;
      if (!l.untaxed) householdTaxable += l.amount;
    } else {
      personalIncome += l.amount;
      if (!l.untaxed) personalTaxable += l.amount;
    }
  }

  // Bank interest (real erosion) on existing savings — flows through net, not applied separately.
  if (ch.money.bank > 0) {
    const interest = ch.money.bank * bankRealRate();
    if (Math.abs(interest) >= 1) {
      statement.income.push({ label: 'Bank interest (real)', amount: interest });
      personalIncome += interest;
    }
  }

  const personalTax = computeTax(country, personalTaxable);
  const householdTax = computeTax(country, householdTaxable);
  statement.tax = {
    incomeTax: personalTax.incomeTax + householdTax.incomeTax,
    socialContrib: personalTax.socialContrib + householdTax.socialContrib,
    total: personalTax.total + householdTax.total,
    personalIncomeTax: personalTax.incomeTax,
    householdIncomeTax: householdTax.incomeTax,
    personalSocialContrib: personalTax.socialContrib,
    householdSocialContrib: householdTax.socialContrib,
  };
  statement.household.income = householdIncome;
  statement.household.taxes = householdTax.total;

  // Expenses only once independent (family covers dependents/students).
  // Serving conscripts live in barracks: reduced living cost, no rent.
  let personalExpenses = 0, householdExpenses = 0;
  const addExpense = (line, household = false) => {
    statement.expenses.push({ ...line, household });
    if (household) householdExpenses += line.amount;
    else personalExpenses += line.amount;
  };
  if (independent) {
    const serving = ch.military.status === 'serving' || ch._servedThisYear;
    const imprisoned = ch.employmentStatus === 'prison';
    const col = costOfLiving(country, ch) * (imprisoned ? 0.15 : serving ? 0.4 : 1);
    const rentAmt = serving || imprisoned ? 0 : rent(country, ch, personalTaxable);
    addExpense({ label: imprisoned ? 'Prison necessities' : serving ? 'Living costs (service)' : 'Cost of living', amount: col }, true);
    if (rentAmt > 0) addExpense({ label: 'Rent', amount: rentAmt }, true);
    if (ch.ownsHome && ch.debts.mortgage > 0) {
      const payment = Math.min(ch.debts.mortgage, ch.debts.mortgage * 0.08);
      ch.debts.mortgage -= payment;
      addExpense({ label: 'Mortgage principal payment', amount: payment }, true);
    }
  }

  // Tuition / student loan.
  if (ch.education._tuitionDue && ch.education._tuition > 0) {
    if (ch.education._useLoan) {
      ch.debts.studentLoan += ch.education._tuition;
      statement.expenses.push({ label: 'Tuition (loan)', amount: 0 });
    } else {
      addExpense({ label: 'Tuition', amount: ch.education._tuition });
    }
  }
  ch.education._tuitionDue = false;
  // Student-loan repayment: 10%/yr of salary after graduation.
  const taxableGross = personalTaxable + householdTaxable;
  if (ch.debts.studentLoan > 0 && ch.education.stage === 'graduated' && taxableGross > 0) {
    const repay = Math.min(ch.debts.studentLoan, taxableGross * 0.10);
    ch.debts.studentLoan -= repay;
    addExpense({ label: 'Student loan repayment', amount: repay });
  }
  if ((ch.debts.business || 0) > 0 && personalIncome > 0) {
    const repay = Math.min(ch.debts.business, personalIncome * 0.10);
    ch.debts.business -= repay;
    addExpense({ label: 'Business debt repayment', amount: repay });
  }
  if ((ch.judicial?.finesOwed || 0) > 0 && taxableGross > 0) {
    const repay = Math.min(ch.judicial.finesOwed, taxableGross * 0.15);
    ch.judicial.finesOwed -= repay;
    addExpense({ label: 'Court fine repayment', amount: repay });
  }

  // Extra expenses (medical costs, insurance premiums) from other systems.
  for (const e of extraExpenses) {
    if (e.amount > 0) addExpense({ label: e.label, amount: e.amount }, !!e.household);
  }

  statement.household.expenses = householdExpenses;
  statement.household.net = householdIncome - householdTax.total - householdExpenses;
  let net = personalIncome + householdIncome - statement.tax.total - personalExpenses - householdExpenses;

  // Hardship floor: living costs can't push money below zero (people go without,
  // they don't borrow infinitely). Explicit debts (student loans/fines) are separate.
  const moneyBefore = ch.money.cash + ch.money.bank+(ch.money.household||0);
  if (moneyBefore + net < 0) {
    const shortfall = -(moneyBefore + net);
    // A negative "could not afford" line offsets expenses so net = -moneyBefore exactly.
    statement.expenses.push({ label: 'Could not afford (hardship)', amount: -shortfall });
    net += shortfall;
    ch.stats.happiness = clamp(ch.stats.happiness - 8);
    ch.stats.health = clamp(ch.stats.health - 2);
    statement.hardship = shortfall;
  }
  statement.net = net;

  // Apply net across the money pool (bank first, cash buffer).
  ch.money.household = (ch.money.household || 0) + statement.household.net;
  ch.money.bank += personalIncome - personalTax.total - personalExpenses;
  if (ch.money.household < 0) { ch.money.bank += ch.money.household; ch.money.household = 0; }
  if (ch.money.bank < 0) { ch.money.cash += ch.money.bank; ch.money.bank = 0; }
  if (ch.money.cash < 0) ch.money.cash = 0; // floored by hardship above

  const grossIncome = personalIncome + householdIncome;

  ch.lastStatement = statement;
  ch.netWorthHistory = ch.netWorthHistory || [];
  ch.netWorthHistory.push(Math.round(netWorth(ch)));
  if (ch.netWorthHistory.length > 120) ch.netWorthHistory.shift();
  ch._servedThisYear = false;

  return { grossIncome, poverty: independent && grossIncome < costOfLiving(country, ch) * 0.8, statement };
}

export function netWorth(ch) {
  return (ch.money.cash || 0) + (ch.money.bank || 0)+(ch.money.household||0) - (ch.debts.studentLoan || 0)-(ch.debts.mortgage||0)
    - (ch.debts.business || 0) + investmentValue(ch) + (ch.business?.capital||0)
    - (ch.business?.loan || 0) - (ch.judicial?.finesOwed || 0) + (ch.homeValue || 0);
}

// ---- Main step ----------------------------------------------------------
export function advanceYear(state) {
  const ch = state.character;
  ensureJudicial(ch);
  ensureBenefits(ch);
  ensureHousing(ch);
  const rng = state.rng;
  let country = COUNTRY_BY_ID[ch.countryId];
  const log = [];
  const ctx = { employed: false, poverty: false, gym: (ch.selectedActivities || []).includes('gym') };
  const ageAtStart = ch.age;

  // 0. Resolve any pending decisions from last year (draft, job offers…), defaults apply.
  resolvePendingDecisions(ch, country, state, rng, log);

  // 1. Age up.
  ch.age += 1;

  if (ch.judicial.immigrationViolationDue && !ch.judicial.activeCase) {
    openCriminalCase(ch, country, 'immigration', { guilty: true, source: 'visa overstay' });
    ch.judicial.immigrationViolationDue = false;
    log.push('Your deliberate visa overstay was referred for prosecution.');
  }

  // 1.5 Resolve immigration applications and irregular-status enforcement.
  const migration = resolveImmigration(ch, state, rng);
  for (const line of migration.logs) { log.push(line); pushEvent(ch, 'political', line); }
  if (migration.died) { finalizeDeath(ch, country, log); return { log, died: true }; }
  country = COUNTRY_BY_ID[ch.countryId];

  // 2. Education progression.
  for (const l of resolveEducation(ch, country, rng)) log.push(l);

  // 3. Military resolution.
  if (ch.military.status === 'serving') for (const l of resolveConscriptService(ch, country, rng)) log.push(l);
  else if (ch.military.status === 'evading') {
    const { caught, log: elog } = resolveEvasion(ch, country, rng);
    for (const l of elog) log.push(l);
    if (caught) {
      ch.military.evading = false; ch.military.status = 'none';
      openCriminalCase(ch, country, 'draft_evasion', { guilty: true, source: 'military' });
      log.push('Draft evasion was referred for prosecution.');
    }
  } else if (ch.military.status === 'career') {
    for (const l of resolveMilitaryCareer(ch, country, rng)) log.push(l);
  }
  if (!ch.alive) { finalizeDeath(ch, country, log); return { log, died: true }; }

  // 3.1 Prison/parole, deliberate crimes, victimization, and new legal cases.
  if (ch.judicial.bankruptcyDue > 0 && !ch.judicial.activeCase) {
    openCivilCase(ch, 'bankruptcy', ch.judicial.bankruptcyDue);
    ch.judicial.bankruptcyDue = 0;
  }
  if (ch.judicial.divorceDue >= 0 && ch.judicial.divorceDue != null && !ch.judicial.activeCase) {
    openCivilCase(ch, 'divorce', ch.judicial.divorceDue);
    ch.judicial.divorceDue = null;
  }
  const judicial = resolveJudicialYear(ch, country, rng);
  for (const line of judicial.logs) { log.push(line); pushEvent(ch, 'crime', line); }

  // 3.2 World events (economic/political/opportunity). Effects consumed below.
  const ev = rollEvents(ch, country, state, rng);
  for (const e of ev.logs) { log.push(e.text); pushEvent(ch, e.category, e.text); }
  for (const d of ev.decisions) ch.pendingDecisions.push(d);
  if (ev.effects.war && country.military.hasArmedForces
      && (ch.immigration?.citizenships || [ch.countryId]).includes(country.id)
      && !['serving', 'career'].includes(ch.military.status)
      && ch.age >= country.military.serviceAge && ch.age <= 55) {
    const mobilizeChance = ch.veteran ? 0.45 : 0.12;
    if (rng.chance(mobilizeChance)) {
      ch.pendingDecisions.push({ type: 'mobilization', default: 'serve', choice: null });
      pushEvent(ch, 'political', 'You have been called up for wartime mobilization.');
    }
  }

  // 3.5 Job search: if seeking and a target sector is set, attempt hire this year.
  if (['unemployed', 'informal'].includes(ch.employmentStatus) && ch.jobSearch.sector && !ch.job) {
    const { attemptHire } = jobsModule;
    const res = attemptHire(ch, country, ch.jobSearch.sector, rng, { firstJob: !ch.everEmployed });
    log.push(res.log);
    if (res.hired) { ch.everEmployed = true; ch.jobSearch.sector = null; }
  }

  // 4. Activities (selected for the year).
  const sideIncome = applyActivities(ch, country, rng, ch.selectedActivities);
  ch.stats.happiness = clamp(ch.stats.happiness + (LIFESTYLES[ch.lifestyle || 'normal']?.happiness || 0));
  const family = resolveFamily(ch, country, rng);
  for (const line of family.logs) { log.push(line); pushEvent(ch, 'family', line); }
  // The routine persists. It is reconciled after all status changes below.
  if (ch.age >= 18 && ch.immigration?.residence?.visa?.kind !== 'student') ch.partTimeWork = false;

  // 5. Employment resolution (promotion/layoff) for civilian jobs; recession doubles layoffs.
  if (ch.job) for (const l of resolveEmployment(ch, country, rng, { layoffMult: ev.effects.recession ? 2 : 1 })) log.push(l);
  ctx.employed = !!ch.job || ch.military.status === 'career';
  for (const line of resolveHousingYear(ch, country, rng)) { log.push(line); pushEvent(ch, 'family', line); }

  // 5.5 Health resolution (illness/accidents/chronic/mental). Medical costs -> statement.
  const prelimIncome = (ch.job ? wageFor(country, ch.job, ch) : 0) + (ch.military.status === 'career' ? careerWage(country, ch) : 0);
  const hctx = { income: prelimIncome };
  const health = resolveHealth(ch, country, rng, hctx);
  for (const e of health.logs) { log.push(e.text); pushEvent(ch, e.category, e.text); }
  if (!ch.alive) { finalizeDeath(ch, country, log); return { log, died: true }; }

  // 6. Gather income lines and resolve finances/taxes.
  if (ch.ownsHome && ch.homeValue > 0) ch.homeValue *= 1.02;
  const incomeLines = [];
  incomeLines.push(...family.incomes);
  if (ch.job) {
    let salary = wageFor(country, ch.job, ch);
    if (ev.effects.wageShockPct) salary *= (1 + ev.effects.wageShockPct); // war/recession wage hit
    incomeLines.push({ label: 'Salary', amount: salary, untaxed: ch.job.sector === 'informal' });
  }
  if (ch.military.status === 'career') incomeLines.push({ label: 'Military pay', amount: careerWage(country, ch) });
  if (ch._serviceIncome) { incomeLines.push({ label: 'Service pay', amount: ch._serviceIncome, untaxed: true }); ch._serviceIncome = 0; }
  if (ch._deploymentBonus) { incomeLines.push({ label: 'Deployment pay', amount: ch._deploymentBonus, untaxed: true }); ch._deploymentBonus = 0; }
  if (sideIncome > 0) incomeLines.push({ label: 'Side hustle', amount: sideIncome, untaxed: true });
  if(ch.partTimeWork&&ch.age<18){
    const earned=teenPartTimeIncome(country,ch), share=earned*ensureHousing(ch).parentContributionRate;
    if(earned-share>0)incomeLines.push({label:'Teen part-time work · personal share',amount:earned-share,untaxed:true});
    if(share>0)incomeLines.push({label:'Teen part-time work · parent contribution',amount:share,untaxed:true,target:'household'});
  }
  else if(ch.partTimeWork&&ch.employmentStatus==='student'&&ch.immigration?.residence?.visa?.kind==='student'){
    incomeLines.push({label:'Student-visa part-time work',amount:medianWage(country)*.7*visaWorkFraction(ch)});
  }
  const invGain = resolveInvestments(ch, country, rng, !!ev.effects.recession);
  if (Math.abs(invGain) >= 1) incomeLines.push({ label: 'Investment value change', amount: invGain, nonCash: true });
  const biz = resolveBusiness(ch, country, rng);
  for (const l of biz.logs) log.push(l);
  if (Math.abs(biz.income) >= 1) incomeLines.push({ label: 'Business value change', amount: biz.income, nonCash: true });
  const spousePay = spouseIncome(ch, country);
  if (spousePay > 0) incomeLines.push({ label: 'Spouse income', amount: spousePay, target: 'household' });
  // Layered social insurance and means-tested safety-net benefits.
  const earnedIncome = incomeLines.filter(x => !x.untaxed && !x.nonCash).reduce((s, x) => s + x.amount, 0);
  incomeLines.push(...evaluateBenefits(ch, country, { earnedIncome }));
  if (isLegalResident(ch) && ch.military.pensionEligible) {
    incomeLines.push({ label: 'Military pension', amount: militaryPension(country, ch), untaxed: true });
  }

  // Medical expenses (insurance premium + treatment costs) go into the statement.
  const extraExpenses = [];
  extraExpenses.push(...family.expenses);
  if (hctx.insuranceLine) extraExpenses.push(hctx.insuranceLine);
  if (health.medicalCosts > 0) extraExpenses.push({ label: 'Medical costs', amount: health.medicalCosts });

  const fin = resolveFinances(ch, country, rng, incomeLines, log, extraExpenses);
  if ((ch.job && ch.job.sector !== 'informal') || ch.military.status === 'career') ch.benefits.contributionYears += 1;
  ctx.poverty = fin.poverty;

  // 7. Drift + happiness.
  applyAgeDrift(ch, rng, ctx);

  // 8. Mortality (war and untreated illness raise the odds).
  let mort = mortalityProbability(ch, country, ageAtStart);
  if (ev.effects.war) mort = Math.min(0.99, mort * 3 + 0.01);
  if (hasSeriousUntreated(ch)) mort = Math.min(0.99, mort * 1.35);
  if (rng.chance(mort)) {
    ch.alive = false;
    ch.causeOfDeath = chooseCauseOfDeath(ch, country, rng, ageAtStart, !!ev.effects.war);
    finalizeDeath(ch, country, log);
    return { log, died: true };
  }

  // 9. Compute next-year situation: status transitions, benefits window, draft.
  updateSituation(ch, country, rng, log);

  const expiryDecision=tickTemporaryVisa(ch);
  if(expiryDecision){ch.pendingDecisions.push(expiryDecision);pushEvent(ch,'political',expiryDecision.prompt);log.push(expiryDecision.prompt);}
  const nationalityDecision=tickNationalityObligation(ch);
  if(nationalityDecision){ch.pendingDecisions.push(nationalityDecision);pushEvent(ch,'political',nationalityDecision.prompt);log.push(nationalityDecision.prompt);}

  if ((ch.immigration?.languagePenaltyYears || 0) > 0) ch.immigration.languagePenaltyYears -= 1;

  reconcileActivities(ch, COUNTRY_BY_ID[ch.countryId] || country);

  return { log, died: false };
}

function finalizeDeath(ch, country, log) {
  if (!log.some(l => l.startsWith('Died') || l.includes('Killed'))) {
    log.push(`Died at age ${ch.age} (${ch.causeOfDeath}).`);
  }
}

// Append a structured event to the feed shown on the Events tab (capped).
function pushEvent(ch, category, text) {
  ch.eventFeed.push({ age: ch.age, category, text });
  if (ch.eventFeed.length > 60) ch.eventFeed.shift();
}

// Status transitions and draft scheduling for the upcoming year.
function updateSituation(ch, country, rng, log) {
  // Leaving school at 18 -> workforce.
  if (ch.age === 18 && ch.employmentStatus === 'child') {
    ch.employmentStatus = 'unemployed';
    ch.benefits.unemploymentYearsLeft = 0; // no benefit until they've worked
    if (!log.some(l => l.startsWith('Finished secondary'))) log.push('Finished school and entered adulthood.');
  }
  // Finished higher education (or dropped out mid-study) -> enter the workforce.
  if (ch.employmentStatus === 'student' && ['graduated', 'dropout', 'secondary_done'].includes(ch.education.stage)) {
    ch.employmentStatus = 'unemployed';
  }
  // Just laid off (flagged with -1) -> open a benefits window.
  if (ch.employmentStatus === 'unemployed' && ch.benefits.unemploymentYearsLeft === -1) {
    const b = unemploymentEntitlement(country, ch);
    ch.benefits.unemploymentYearsLeft = b.years;
  }
  // Retirement.
  if (ch.age >= RETIREMENT_AGE && !['retired', 'military'].includes(ch.employmentStatus) && ch.military.status !== 'career') {
    if (ch.job) { ch.benefits.lastWage = wageFor(country, ch.job, ch); ch.job = null; }
    ch.employmentStatus = 'retired';
    log.push('Retired.');
  }
  // Military career pension at 20 years (auto-retire from service around 45+).
  if (ch.military.status === 'career' && isCareerPensionEligible(ch) && ch.age >= 45) {
    ch.military.pensionRung = ch.military.rung;
    ch.military.pensionEligible = true;
    ch.military.status = 'veteran'; ch.veteran = true; ch.employmentStatus = 'retired';
    log.push('Retired from the armed forces with a pension.');
  }

  // Draft decision scheduling.
  if (draftDue(ch, country) && ch.military.status !== 'serving'
      && !(ch.pendingDecisions || []).some(d => d.type === 'draft')) {
    if (calledUp(ch, country, rng)) {
      ch.pendingDecisions.push({ type: 'draft', default: 'serve', choice: null });
    } else if (!country.military.repeatCallUp) {
      ch.military.obligationMet = true; // not called this cycle
    }
  }
}

export { mortalityProbability };
