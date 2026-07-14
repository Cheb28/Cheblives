import { medianWage } from './countries.js';
import { annualHousingCost } from './housing.js';
import { disabilityBurden } from './health.js';

const MODELS = {
  generous: { model: 'universal-contributory', replacement: .58, duration: 2, minimum: .30, pension: .42, child: .055, disability: .28, housing: .65, residenceYears: 1 },
  moderate: { model: 'contributory-targeted', replacement: .45, duration: 1, minimum: .22, pension: .30, child: .03, disability: .20, housing: .45, residenceYears: 2 },
  minimal: { model: 'family-reliant safety net', replacement: .22, duration: 1, minimum: .10, pension: .15, child: .01, disability: .10, housing: .18, residenceYears: 3 },
  none: { model: 'very limited formal safety net', replacement: 0, duration: 0, minimum: 0, pension: .04, child: 0, disability: 0, housing: 0, residenceYears: 5 },
};
const CITIZEN_PRIORITY = new Set(['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Singapore']);

export function welfareProfile(country) {
  return { ...(MODELS[country.welfareTier] || MODELS.none), citizenPriority: CITIZEN_PRIORITY.has(country.name) };
}

export function ensureBenefits(ch) {
  ch.benefits ||= {};
  ch.benefits.unemploymentYearsLeft ??= 0;
  ch.benefits.lastWage ??= 0;
  ch.benefits.contributionYears ??= 0;
  return ch.benefits;
}

export function isWelfareResident(ch, country) {
  const r = ch.immigration?.residence;
  if (!r || ['irregular', 'visa_expiring', 'student', 'temporary_work', 'working_holiday'].includes(r.status)) return false;
  const p = welfareProfile(country);
  if (p.citizenPriority && !(ch.immigration?.citizenships || []).includes(country.id) && r.status !== 'recognized_refugee') return false;
  return r.status === 'citizen' || r.status === 'recognized_refugee' || r.route === 'asylum' || (r.years || 0) >= p.residenceYears;
}

export function unemploymentEntitlement(country, ch) {
  const p = welfareProfile(country), b = ensureBenefits(ch);
  const insured = b.contributionYears >= 1;
  return { annual: insured ? (b.lastWage || medianWage(country)) * p.replacement : 0, years: insured ? p.duration : 0 };
}

export function evaluateBenefits(ch, country, { earnedIncome = 0 } = {}) {
  const lines = [], p = welfareProfile(country), b = ensureBenefits(ch);
  if (!isWelfareResident(ch, country) || ch.employmentStatus === 'prison') return lines;
  const mw = medianWage(country);
  const children = (ch.family || []).filter(x => x.relation === 'Child' && x.alive && x.atHome !== false && ch.age - x.ageOffset < 18).length;
  const assets = (ch.money?.cash || 0) + (ch.money?.bank || 0) + (ch.money?.household || 0);
  const lowIncome = earnedIncome < mw * .45 && assets < mw * 1.5;

  if (ch.employmentStatus === 'unemployed' && b.unemploymentYearsLeft > 0) {
    const ui = unemploymentEntitlement(country, ch);
    if (ui.annual > 0) lines.push({ label: 'Unemployment insurance', amount: ui.annual, untaxed: true });
    b.unemploymentYearsLeft -= 1;
  }
  const hasInsurance = lines.some(x => x.label === 'Unemployment insurance');
  if (ch.age >= 18 && lowIncome && !hasInsurance && p.minimum > 0 && !['student', 'child'].includes(ch.employmentStatus)) {
    lines.push({ label: 'Minimum-income assistance', amount: mw * p.minimum, untaxed: true });
  }
  if (ch.employmentStatus === 'retired' && ch.age >= 65 && p.pension > 0) {
    const contributory = Math.min(1, b.contributionYears / 25);
    lines.push({ label: 'State pension', amount: mw * p.pension * Math.max(.45, contributory), untaxed: true });
  }
  if (children > 0 && ch.age >= 18 && p.child > 0) {
    const means = country.welfareTier === 'generous' ? 1 : lowIncome ? 1 : .45;
    lines.push({ label: 'Child / family benefit', amount: mw * p.child * children * means, untaxed: true, target: 'household' });
  }
  const infant = (ch.family || []).some(x => x.relation === 'Child' && x.alive && x.atHome !== false && ch.age - x.ageOffset < 1);
  if (infant && b.contributionYears >= 1 && ['generous', 'moderate'].includes(country.welfareTier)) {
    lines.push({ label: 'Parental-leave benefit', amount: mw * (country.welfareTier === 'generous' ? .32 : .20), untaxed: true });
  }
  const burden = disabilityBurden(ch);
  if (burden > 0 && p.disability > 0 && (lowIncome || burden >= 3)) {
    lines.push({ label: 'Disability income support', amount: mw * p.disability * Math.min(1.6, .5 + burden * .25), untaxed: true });
  }
  const elderlyCare = (ch.family || []).some(x => ['Father', 'Mother'].includes(x.relation) && x.alive && ch.age - x.ageOffset >= 75);
  if (elderlyCare && lowIncome && !ch.job && ['generous', 'moderate'].includes(country.welfareTier)) {
    lines.push({ label: 'Caregiver support', amount: mw * (country.welfareTier === 'generous' ? .12 : .06), untaxed: true });
  }
  const housingCost = annualHousingCost(country, ch);
  if (housingCost > 0 && lowIncome && p.housing > 0 && ['private', 'social'].includes(ch.housing?.tenure)) {
    lines.push({ label: 'Housing allowance', amount: Math.min(housingCost * p.housing, mw * .25), untaxed: true, target: 'household' });
  }
  return lines;
}
