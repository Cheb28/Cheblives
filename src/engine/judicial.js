// Judicial system (GAME_DESIGN section 13 / Phase 7).
// All cases and decisions are plain data so saves remain serializable.
import { medianWage } from './countries.js';

export const CRIMES = {
  petty: { label: 'Petty theft', payout: 0.25, catch: { strong: 0.58, medium: 0.38, weak: 0.22 }, evidence: 0.70, fine: 0.45, prison: 1, severity: 1 },
  smuggling: { label: 'Smuggling', payout: 1.10, catch: { strong: 0.70, medium: 0.48, weak: 0.30 }, evidence: 0.78, fine: 1.00, prison: 3, severity: 2 },
  fraud: { label: 'Fraud', payout: 2.20, catch: { strong: 0.76, medium: 0.52, weak: 0.32 }, evidence: 0.84, fine: 1.80, prison: 5, severity: 3 },
};

const OFFENCES = {
  petty: CRIMES.petty,
  smuggling: CRIMES.smuggling,
  fraud: CRIMES.fraud,
  draft_evasion: { label: 'Draft evasion', evidence: 0.85, fine: 0.50, prison: 2, severity: 2 },
  immigration: { label: 'Immigration offence', evidence: 0.82, fine: 0.50, prison: 1, severity: 2 },
  activism: { label: 'Prohibited political activity', evidence: 0.38, fine: 0.20, prison: 3, severity: 2 },
  business: { label: 'Business-law violation', evidence: 0.72, fine: 1.00, prison: 2, severity: 2 },
  tax_evasion: { label: 'Tax evasion', evidence: 0.82, fine: 1.20, prison: 2, severity: 2 },
  false_accusation: { label: 'False criminal accusation', evidence: 0.24, fine: 0.35, prison: 2, severity: 1 },
};

export function initJudicial() {
  return {
    status: 'free', plannedCrime: null, activeCase: null, cases: [], records: [],
    prison: null, parole: null, barredUntilAge: 0, finesOwed: 0,
    victimLosses: 0, convictions: 0,
  };
}

export function ensureJudicial(ch) {
  if (!ch.judicial) ch.judicial = initJudicial();
  ch.judicial.cases ||= [];
  ch.judicial.records ||= [];
  return ch.judicial;
}

export function lawProfile(country) {
  const tier = country.lawTier || 'medium';
  return {
    tier,
    policeRecovery: tier === 'strong' ? 0.60 : tier === 'medium' ? 0.30 : 0.10,
    corruption: tier === 'weak' ? 'High' : tier === 'medium' ? 'Moderate' : 'Low',
    trialFairness: tier === 'strong' ? 'High' : tier === 'medium' ? 'Mixed' : 'Low',
    publicDefender: tier === 'strong' ? 'Reliable' : tier === 'medium' ? 'Limited' : 'Weak',
  };
}

export function planCrime(ch, crimeId) {
  const j = ensureJudicial(ch);
  if (!CRIMES[crimeId] || ch.age < 14 || j.status === 'prison' || j.activeCase || j.plannedCrime) return false;
  j.plannedCrime = crimeId;
  return true;
}

export function clearPlannedCrime(ch) {
  ensureJudicial(ch).plannedCrime = null;
}

export function hasRecentRecord(ch) {
  const j = ensureJudicial(ch);
  return j.records.some(r => !r.overturned && (r.expiresAge ?? Infinity) > ch.age);
}

export function recordPenalty(ch, sector = null) {
  const active = ensureJudicial(ch).records.filter(r => !r.overturned && (r.expiresAge ?? Infinity) > ch.age);
  if (!active.length) return 0;
  const worst = Math.max(...active.map(r => r.severity || 1));
  const sectorExtra = sector === 'professional' || sector === 'service' ? 0.06 : 0;
  return Math.min(0.35, 0.07 * active.length + 0.05 * worst + sectorExtra);
}

export function immigrationBarRemaining(ch) {
  return Math.max(0, (ensureJudicial(ch).barredUntilAge || 0) - ch.age);
}

function optionsForCase(country) {
  const options = [
    { id: 'public', label: 'Use public defender', desc: 'No fee; ordinary defence quality.' },
    { id: 'self', label: 'Represent yourself', desc: 'No fee; substantially higher conviction risk.' },
    { id: 'expensive', label: 'Hire an experienced lawyer', desc: 'Costs about 75% of local median income; halves conviction risk.' },
    { id: 'plead', label: 'Plead guilty', desc: 'Certain conviction, but a shorter sentence and smaller fine.' },
  ];
  if (country.lawTier === 'weak') options.push({ id: 'bribe', label: 'Attempt a bribe', desc: 'Costs one local median income; usually works but can backfire.' });
  return options;
}

export function openCriminalCase(ch, country, offence, { guilty = true, evidence, source = 'event' } = {}) {
  const j = ensureJudicial(ch);
  if (j.activeCase || (ch.pendingDecisions || []).some(d => d.type === 'legalCase')) return null;
  const rule = OFFENCES[offence] || OFFENCES.false_accusation;
  const legalCase = {
    id: `${ch.age}-${j.cases.length + 1}`, kind: 'criminal', offence,
    label: rule.label, guilty, evidence: evidence ?? rule.evidence, source,
    fineMultiple: rule.fine, prisonYears: rule.prison, severity: rule.severity,
    status: 'charged', openedAge: ch.age,
  };
  j.activeCase = legalCase;
  j.status = 'awaiting_trial';
  const decision = {
    type: 'legalCase', caseId: legalCase.id, default: 'public', choice: null,
    prompt: `You face a charge of ${legalCase.label.toLowerCase()}. Choose how to respond.`,
    options: optionsForCase(country),
  };
  ch.pendingDecisions ||= [];
  ch.pendingDecisions.push(decision);
  return decision;
}

export function openCivilCase(ch, kind, amount = 0) {
  const j = ensureJudicial(ch);
  if (j.activeCase || (ch.pendingDecisions || []).some(d => d.type === 'civilCase')) return null;
  const prompts = {
    bankruptcy: 'Your insolvent business has entered a personal bankruptcy proceeding.',
    inheritance: 'A close relative is challenging your will and estate plan.',
    business_dispute: 'A business counterparty has filed a civil claim against you.',
    divorce: 'Your divorce has entered court over division of household assets.',
  };
  const legalCase = { id: `${ch.age}-C${j.cases.length + 1}`, kind: 'civil', civilKind: kind, amount, status: 'filed', openedAge: ch.age };
  j.activeCase = legalCase; j.status = 'civil_case';
  const options = kind === 'bankruptcy'
    ? [{ id: 'file', label: 'Seek discharge', desc: 'Ask the court to discharge eligible debt.' }, { id: 'repay', label: 'Keep repaying', desc: 'Avoid court relief and retain the debt.' }]
    : [{ id: 'settle', label: 'Settle', desc: 'Pay a smaller amount and end the dispute.' }, { id: 'contest', label: 'Contest in court', desc: 'Pay legal fees and seek a favorable judgment.' }];
  const decision = { type: 'civilCase', caseId: legalCase.id, default: options[0].id, choice: null, prompt: prompts[kind], options };
  ch.pendingDecisions ||= []; ch.pendingDecisions.push(decision);
  return decision;
}

function payFromPersonalFunds(ch, amount) {
  let remaining = Math.max(0, amount);
  for (const key of ['bank', 'cash']) {
    const paid = Math.min(ch.money[key] || 0, remaining);
    ch.money[key] = (ch.money[key] || 0) - paid;
    remaining -= paid;
  }
  return remaining;
}

function imprison(ch, years, offence) {
  const j = ensureJudicial(ch);
  const total = Math.max(1, Math.ceil(years));
  if (ch.job) { ch.benefits.lastWage = 0; ch.job = null; }
  ch.jobSearch.sector = null;
  ch.employmentStatus = 'prison';
  j.status = 'prison';
  j.prison = { total, remaining: total, served: 0, offence, paroleEligibleAfter: Math.max(1, Math.ceil(total / 2)) };
}

function convictionProbability(legalCase, country, choice) {
  if (choice === 'plead') return 1;
  const lawyer = choice === 'expensive' ? 0.50 : choice === 'self' ? 1.25 : 1;
  let evidence = legalCase.evidence;
  if (!legalCase.guilty) evidence *= country.lawTier === 'strong' ? 0.45 : country.lawTier === 'medium' ? 0.90 : 1.55;
  else evidence *= country.lawTier === 'strong' ? 0.95 : country.lawTier === 'medium' ? 1 : 1.05;
  return Math.max(0.02, Math.min(0.98, evidence * lawyer));
}

export function resolveLegalDecision(ch, country, rng, decision, log) {
  const j = ensureJudicial(ch);
  const legalCase = j.activeCase;
  if (!legalCase || legalCase.id !== decision.caseId) return;
  const choice = decision.choice || decision.default;
  const mw = medianWage(country);
  if (choice === 'expensive') {
    const unpaid = payFromPersonalFunds(ch, mw * 0.75);
    j.finesOwed += unpaid;
    log.push('Paid for experienced legal representation.');
  }
  if (choice === 'bribe') {
    const unpaid = payFromPersonalFunds(ch, mw);
    j.finesOwed += unpaid;
    const roll = rng.next();
    if (roll < 0.70) {
      legalCase.status = 'dismissed_by_corruption'; j.cases.push(legalCase); j.activeCase = null; j.status = 'free';
      log.push('The bribe worked and the charge disappeared.');
      return;
    }
    if (roll < 0.80) {
      legalCase.evidence = Math.min(0.98, legalCase.evidence + 0.18);
      legalCase.bribeBackfired = true;
      log.push('The attempted bribe backfired and strengthened the case against you.');
    } else log.push('The bribe failed without changing the evidence.');
  }
  const convicted = rng.chance(convictionProbability(legalCase, country, choice));
  legalCase.choice = choice;
  legalCase.status = convicted ? 'convicted' : 'acquitted';
  legalCase.resolvedAge = ch.age;
  if (!convicted) {
    j.cases.push(legalCase); j.activeCase = null; j.status = 'free';
    log.push(`Acquitted of ${legalCase.label.toLowerCase()}.`);
    return;
  }
  const pleaMult = choice === 'plead' ? 0.65 : 1;
  const fine = mw * legalCase.fineMultiple * pleaMult;
  j.finesOwed += payFromPersonalFunds(ch, fine);
  legalCase.fine = fine;
  let years = legalCase.prisonYears * pleaMult;
  if (country.lawTier === 'strong' && legalCase.severity === 1) years = rng.chance(0.65) ? 0 : years;
  if (country.lawTier === 'weak' && legalCase.offence === 'activism') years *= 1.5;
  years = years > 0 ? Math.max(1, Math.ceil(years)) : 0;
  legalCase.sentenceYears = years;
  const record = { caseId: legalCase.id, offence: legalCase.label, severity: legalCase.severity, convictionAge: ch.age, expiresAge: ch.age + 10, overturned: false };
  j.records.push(record); j.convictions += 1; j.barredUntilAge = Math.max(j.barredUntilAge || 0, ch.age + 10);
  j.cases.push(legalCase); j.activeCase = null;
  if (legalCase.offence === 'draft_evasion') {
    ch.military.evading = false; ch.military.status = 'none'; ch.military.obligationMet = true;
  }
  if (years > 0) imprison(ch, years, legalCase.offence);
  else j.status = 'free';
  log.push(`Convicted of ${legalCase.label.toLowerCase()}: ${years ? `${years} year(s) in prison and ` : ''}a fine of ${Math.round(fine).toLocaleString()}.`);
  if (years >= 2) {
    ch.pendingDecisions.push({ type: 'legalAppeal', caseId: legalCase.id, default: 'accept', choice: null,
      prompt: 'You may appeal the conviction.', options: [{ id: 'appeal', label: 'Appeal', desc: 'Costs half a local median income; success depends on rule of law.' }, { id: 'accept', label: 'Accept judgment', desc: 'Begin or continue the sentence.' }] });
  }
}

export function resolveAppeal(ch, country, rng, decision, log) {
  const choice = decision.choice || decision.default;
  if (choice !== 'appeal') { log.push('Accepted the court judgment without appeal.'); return; }
  const j = ensureJudicial(ch), mw = medianWage(country);
  j.finesOwed += payFromPersonalFunds(ch, mw * 0.5);
  const success = country.lawTier === 'strong' ? 0.35 : country.lawTier === 'medium' ? 0.20 : 0.10;
  if (rng.chance(success)) {
    const record = j.records.find(r => r.caseId === decision.caseId);
    if (record) record.overturned = true;
    const legalCase = j.cases.find(c => c.id === decision.caseId);
    if (legalCase) legalCase.status = 'overturned_on_appeal';
    if (j.prison?.offence === legalCase?.offence) { j.prison = null; j.status = 'free'; ch.employmentStatus = 'unemployed'; }
    log.push('The appeal succeeded and the conviction was overturned.');
  } else log.push('The appeal was denied.');
}

export function resolveCivilDecision(ch, country, rng, decision, log) {
  const j = ensureJudicial(ch), legalCase = j.activeCase;
  if (!legalCase || legalCase.id !== decision.caseId) return;
  const choice = decision.choice || decision.default, mw = medianWage(country);
  if (legalCase.civilKind === 'bankruptcy') {
    if (choice === 'file') {
      const discharge = country.lawTier === 'strong' ? 0.85 : country.lawTier === 'medium' ? 0.55 : 0.20;
      const before = (ch.debts.business||0)+(ch.debts.personalLoan||0)+(ch.debts.creditCard||0)+(ch.debts.tax||0);
      for(const key of ['business','personalLoan','creditCard','tax'])ch.debts[key]=(ch.debts[key]||0)*(1-discharge);
      if(ch.financial){ch.financial.personalLoan.balance=ch.debts.personalLoan;ch.financial.creditCard.balance=ch.debts.creditCard;ch.financial.tax.carryBalance=ch.debts.tax;}
      j.finesOwed += payFromPersonalFunds(ch, mw * 0.20);
      legalCase.discharged = before * discharge;
      log.push(`Bankruptcy court discharged ${Math.round(discharge * 100)}% of eligible personal and business debt.`);
      if (country.lawTier === 'weak' && before > mw * 2 && rng.chance(0.12)) {
        imprison(ch, 1, 'debt enforcement');
        log.push('A punitive debt-enforcement order sent you to prison for one year.');
      }
    } else log.push('Declined bankruptcy relief and kept the outstanding business debt.');
  } else {
    const settleCost = Math.max(mw * 0.15, legalCase.amount * 0.35);
    if (choice === 'settle') {
      j.finesOwed += payFromPersonalFunds(ch, settleCost);
      if (legalCase.civilKind === 'inheritance') ch.will = { written: false, shares: {} };
      log.push('Settled the civil dispute.');
    } else {
      j.finesOwed += payFromPersonalFunds(ch, mw * 0.40);
      const winChance = country.lawTier === 'strong' ? 0.65 : country.lawTier === 'medium' ? 0.50 : 0.35;
      if (rng.chance(winChance)) log.push('Won the contested civil case.');
      else {
        j.finesOwed += payFromPersonalFunds(ch, Math.max(mw * 0.30, legalCase.amount));
        if (legalCase.civilKind === 'inheritance') ch.will = { written: false, shares: {} };
        log.push('Lost the civil case and paid the judgment.');
      }
    }
  }
  legalCase.status = 'resolved'; legalCase.resolvedAge = ch.age; legalCase.choice = choice;
  j.cases.push(legalCase); j.activeCase = null;
  if (j.status !== 'prison') j.status = 'free';
}

export function resolveJudicialYear(ch, country, rng) {
  const j = ensureJudicial(ch), logs = [], decisions = [];
  if (j.prison && j.status === 'prison') {
    j.prison.served += 1; j.prison.remaining -= 1;
    ch.stats.health = Math.max(1, ch.stats.health - 3);
    ch.stats.happiness = Math.max(1, ch.stats.happiness - 5);
    ch.stats.charisma = Math.max(1, ch.stats.charisma - 2);
    logs.push(`Served a year in prison (${Math.max(0, j.prison.remaining)} remaining).`);
    const eligible = j.prison.served >= j.prison.paroleEligibleAfter && j.prison.remaining > 0;
    const paroleChance = country.lawTier === 'strong' ? 0.35 : country.lawTier === 'medium' ? 0.22 : 0.12;
    if (eligible && rng.chance(paroleChance)) {
      j.parole = { untilAge: ch.age + j.prison.remaining, offence: j.prison.offence };
      j.prison = null; j.status = 'parole'; ch.employmentStatus = 'unemployed';
      logs.push('Released early on parole.');
    } else if (j.prison.remaining <= 0) {
      j.prison = null; j.status = 'free'; ch.employmentStatus = 'unemployed';
      logs.push('Completed the prison sentence and was released.');
    }
    return { logs, decisions };
  }
  if (j.status === 'parole' && j.parole && ch.age >= j.parole.untilAge) {
    j.parole = null; j.status = 'free'; logs.push('Completed parole.');
  }

  if (j.plannedCrime) {
    const crimeId = j.plannedCrime, crime = CRIMES[crimeId]; j.plannedCrime = null;
    const payout = medianWage(country) * crime.payout;
    if (rng.chance(crime.catch[country.lawTier] ?? crime.catch.medium)) {
      const d = openCriminalCase(ch, country, crimeId, { guilty: true, evidence: crime.evidence, source: 'deliberate' });
      if (d) decisions.push(d);
      logs.push(`Authorities caught you attempting ${crime.label.toLowerCase()}.`);
    } else {
      ch.money.bank += payout;
      logs.push(`${crime.label} succeeded and brought in ${Math.round(payout).toLocaleString()} in illegal proceeds.`);
      j.cases.push({ id: `${ch.age}-U${j.cases.length + 1}`, kind: 'criminal', offence: crimeId, label: crime.label, status: 'undetected', openedAge: ch.age, proceeds: payout });
    }
  }
  if (j.activeCase) return { logs, decisions };

  // Crime victimization is more common where rule of law is weak.
  const victimP = country.lawTier === 'strong' ? 0.025 : country.lawTier === 'medium' ? 0.05 : 0.08;
  if (ch.age >= 14 && rng.chance(victimP)) {
    const available = (ch.money.bank || 0) + (ch.money.cash || 0);
    const stolen = Math.min(available, medianWage(country) * rng.float(0.10, 0.45));
    const recovered = stolen * lawProfile(country).policeRecovery;
    payFromPersonalFunds(ch, stolen);
    ch.money.bank += recovered;
    j.victimLosses += stolen - recovered;
    logs.push(`You were a victim of theft or fraud. Police recovered ${Math.round(recovered)} of ${Math.round(stolen)} lost.`);
  }
  const falseP = country.lawTier === 'weak' ? 0.010 : country.lawTier === 'medium' ? 0.003 : 0.001;
  if (ch.age >= 18 && rng.chance(falseP)) {
    const d = openCriminalCase(ch, country, 'false_accusation', { guilty: false, source: 'false accusation' });
    if (d) decisions.push(d);
    logs.push('You were falsely accused of a crime.');
  } else if ((ch.selectedActivities || []).includes('activism') && country.stability === 1 && rng.chance(0.03)) {
    const d = openCriminalCase(ch, country, 'activism', { guilty: false, evidence: country.lawTier === 'weak' ? 0.58 : 0.30, source: 'activism' });
    if (d) decisions.push(d);
    logs.push('Authorities arrested you over political activism.');
  } else if (ch.business && rng.chance(country.lawTier === 'weak' ? 0.035 : 0.012)) {
    const d = openCivilCase(ch, 'business_dispute', medianWage(country) * rng.float(0.4, 1.5));
    if (d) decisions.push(d);
    logs.push('A commercial dispute reached the courts.');
  } else if (ch.will?.written && Object.values(ch.will.shares || {}).filter(Number).length >= 2 && rng.chance(0.008)) {
    const d = openCivilCase(ch, 'inheritance', medianWage(country) * 0.5);
    if (d) decisions.push(d);
    logs.push('A relative challenged your estate plan.');
  }
  return { logs, decisions };
}
