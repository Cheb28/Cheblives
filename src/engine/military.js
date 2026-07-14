// Military service & conscription (GAME_DESIGN section 7).
import { medianWage } from './countries.js';

// Countries that recognize alternative civilian service (hand-tuned; default:
// democracies with conscription). Used when the profile is mandatory/selective.
const ALT_SERVICE_COUNTRIES = new Set([
  'Germany', 'Austria', 'Switzerland', 'Finland', 'Denmark', 'Norway', 'Sweden',
  'Greece', 'Cyprus', 'South Korea', 'Taiwan', 'Israel', 'Estonia', 'Lithuania',
]);

// Source-backed sex-specific terms. The simulation advances in whole years,
// so every partial year rounds upward as requested.
const SERVICE_TERM_BY_SEX = {
  Israel: { male:32/12, female:2 },
  Norway: { male:1, female:1 },
  'North Korea': { male:10, female:7 },
};

export function serviceYearsFor(ch,country,{alternative=false}={}){
  const raw=SERVICE_TERM_BY_SEX[country.name]?.[ch.sex]??country.military.serviceLengthYears??1;
  return Math.max(1,Math.ceil(raw*(alternative?1.5:1)));
}

export function initMilitary() {
  return { status: 'none', yearsServed: 0, rung: 0, obligationMet: false, deferring: false, evading: false };
}

// Is a draft decision due this year? (mandatory/selective at service age, eligible sex)
export function draftDue(ch, country) {
  const m = country.military;
  if (!(ch.immigration?.citizenships || [ch.countryId]).includes(country.id)) return false;
  if (!m.hasArmedForces) return false;
  if (m.conscription !== 'mandatory' && m.conscription !== 'selective') return false;
  if (ch.military.obligationMet || ch.military.status === 'veteran') return false;
  if (ch.sex === 'female' && !m.womenConscripted) return false;
  // must be at/over service age but still within call-up window
  const callUpEndAge = m.callUpEndAge ?? m.serviceAge + 10;
  return ch.age >= m.serviceAge && ch.age <= callUpEndAge && ch.military.status !== 'serving';
}

// Legal liability and actual intake are separate. Some mandatory-service
// countries only incorporate a quota, lottery winners, or the people needed
// after volunteers. callUpRate is a simulation estimate, not a statutory rate.
export function callUpRateFor(country) {
  const rate = country.military.callUpRate;
  if (Number.isFinite(rate)) return Math.max(0, Math.min(1, rate));
  return country.military.conscription === 'selective' ? 0.25 : 1;
}

export function calledUp(ch, country, rng) {
  const rate = callUpRateFor(country);
  return rate >= 1 || rng.chance(rate);
}

export function altServiceAvailable(country) {
  return ALT_SERVICE_COUNTRIES.has(country.name);
}

export function universityDefermentAllowed(country) {
  // default: yes for mandatory-conscription countries
  return country.military.conscription === 'mandatory' || country.military.conscription === 'selective';
}

// The four draft choices. Each returns a resolution applied over subsequent years.
// We model service as setting status='serving' with a remaining counter.
export function chooseServe(ch, country, { alternative = false } = {}) {
  const m = country.military;
  ch.military.status = 'serving';
  ch.military.alternative = alternative;
  ch.military.remaining = serviceYearsFor(ch,country,{alternative});
  ch.employmentStatus = 'military';
  ch.job = null;
}
export function chooseDefer(ch) {
  ch.military.deferring = true; // resolved after graduation / when aged out
}
export function chooseEvade(ch) {
  ch.military.evading = true;
  ch.military.status = 'evading';
}

// Yearly resolution while serving a conscript term. Returns log lines.
export function resolveConscriptService(ch, country, rng) {
  const log = [];
  if (ch.military.status !== 'serving') return log;
  ch._servedThisYear = true;
  const alt = ch.military.alternative;
  // pay
  ch._serviceIncome = 0.3 * medianWage(country);
  if (!alt) {
    ch.stats.fitness = Math.min(100, ch.stats.fitness + 4);
    ch.skills.vocational = Math.min(100, ch.skills.vocational + 3);
    // injury/death risk
    const risk = country.conflict.displacement ? 0.10 : 0.01;
    if (rng.chance(risk)) {
      if (rng.chance(0.2)) { ch.alive = false; ch.causeOfDeath = 'killed in service'; log.push('Killed during military service.'); return log; }
      ch.stats.health = Math.max(1, ch.stats.health - 15);
      log.push('Injured during military service.');
    }
  }
  ch.military.remaining -= 1;
  ch.military.yearsServed += 1;
  if (ch.military.remaining <= 0) {
    ch.military.status = 'veteran';
    ch.military.obligationMet = true;
    ch.veteran = true;
    ch.employmentStatus = 'unemployed';
    log.push(`Completed ${alt ? 'alternative civilian' : 'military'} service.`);
  }
  return log;
}

// Evasion: yearly caught roll until aged out. Returns {caught, log}.
export function resolveEvasion(ch, country, rng) {
  if (ch.military.status !== 'evading') return { caught: false, log: [] };
  const agedOut = ch.age > country.military.serviceAge + 10;
  if (agedOut) {
    ch.military.status = 'none'; ch.military.evading = false; ch.military.obligationMet = true;
    return { caught: false, log: ['Aged out of conscription obligation.'] };
  }
  if (rng.chance(0.10)) {
    return { caught: true, log: ['Caught evading the draft.'] }; // judicial handled in Phase 7; Phase 2: fine
  }
  return { caught: false, log: [] };
}

// ---- Voluntary military career (any country with armed forces) ----------
const CAREER_RUNGS = [
  { title: 'Enlisted', mult: 0.8, gate: () => true },
  { title: 'NCO', mult: 1.2, gate: (ch) => ch.military.yearsServed >= 3 || ch.skills.vocational >= 40 },
  { title: 'Officer', mult: 2.0, gate: (ch) => ch.education.degree || ch.skills.academic >= 60 },
];

export function canEnlistVoluntary(ch, country) {
  const citizen = (ch.immigration?.citizenships || [ch.countryId]).includes(country.id);
  const seriousRecord = (ch.judicial?.records || []).some(r => !r.overturned && r.expiresAge > ch.age && r.severity >= 2);
  return citizen && country.military.hasArmedForces && ch.age >= country.military.serviceAge && ch.age < 45
    && !['military','prison'].includes(ch.employmentStatus) && !seriousRecord;
}

export function enlistVoluntary(ch) {
  ch.military.status = 'career';
  ch.military.rung = 0;
  ch.employmentStatus = 'military';
  ch.job = null;
}

export function careerWage(country, ch) {
  const rung = CAREER_RUNGS[ch.military.rung];
  const payScale = 0.7 + country.military.payTier * 0.15; // tier1~0.85 .. tier3~1.15
  return medianWage(country) * rung.mult * payScale;
}

export function careerTitle(ch) {
  return `${CAREER_RUNGS[ch.military.rung].title} (Armed Forces)`;
}

// Yearly resolution for a voluntary military career. Returns log lines.
export function resolveMilitaryCareer(ch, country, rng) {
  const log = [];
  if (ch.military.status !== 'career') return log;
  ch.military.yearsServed += 1;
  ch.stats.fitness = Math.min(100, ch.stats.fitness + 1);

  // deployment
  const deployRisk = country.conflict.displacement ? 0.25 : 0.05;
  if (rng.chance(deployRisk)) {
    ch._deploymentBonus = 0.5 * medianWage(country);
    if (rng.chance(0.15)) {
      if (rng.chance(0.15)) { ch.alive = false; ch.causeOfDeath = 'killed on deployment'; log.push('Killed on deployment.'); return log; }
      ch.stats.health = Math.max(1, ch.stats.health - 20);
      ch.stats.happiness = Math.max(1, ch.stats.happiness - 10);
      log.push('Wounded on deployment (received hazard pay).');
    } else {
      ch.stats.happiness = Math.max(1, ch.stats.happiness - 3);
      log.push('Returned from a deployment.');
    }
  }

  // promotion
  const next = CAREER_RUNGS[ch.military.rung + 1];
  if (next && next.gate(ch) && rng.chance(0.18)) {
    ch.military.rung += 1;
    log.push(`Promoted to ${next.title}.`);
  }
  return log;
}

export function isCareerPensionEligible(ch) {
  return ch.military.yearsServed >= 20;
}

export function militaryPension(country, ch) {
  const rung = Math.max(0, Math.min(CAREER_RUNGS.length - 1, ch.military.pensionRung ?? ch.military.rung ?? 0));
  const payScale = 0.7 + country.military.payTier * 0.15;
  return medianWage(country) * CAREER_RUNGS[rung].mult * payScale * 0.5;
}
