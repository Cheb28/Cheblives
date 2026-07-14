// Economy: cost of living, taxes, welfare benefits, bank interest.
// GAME_DESIGN sections 6, 8.1, 8.3, 8.4, 8.5. All money in PPP dollars.
import { medianWage } from './countries.js';
import { annualHousingCost } from './housing.js';

export { medianWage };

// ---- Cost of living (section 8.4) ---------------------------------------
export const LIFESTYLES = {
  frugal: { colMult: 0.8, happiness: -2, label: 'Frugal' },
  normal: { colMult: 1.0, happiness: 0, label: 'Normal' },
  lavish: { colMult: 1.5, happiness: +3, label: 'Lavish' },
};

// Yearly cost of living for the household.
export function costOfLiving(country, ch) {
  const base = 0.45 * medianWage(country);
  const city = ch.location.colMultiplier;
  const dependents = countDependents(ch);
  const household = 1 + dependents * 0.25 + (ch.spouse && ch.spouse.working ? 0.125 : ch.spouse ? 0.25 : 0);
  const lifestyle = LIFESTYLES[ch.lifestyle || 'normal'].colMult;
  return base * city * household * lifestyle;
}

export function countDependents(ch) {
  // children under 18 living at home (Phase 4 fills family; safe now)
  return (ch.family || []).filter(p => p.relation === 'Child' && p.alive && p.atHome !== false && (ch.age - p.ageOffset) < 18).length;
}

// Rent is 30% of CoL when not a homeowner (Phase 5 adds home buying).
export function rent(country, ch, earnedIncome = 0) {
  return annualHousingCost(country, ch, earnedIncome);
}

// ---- Taxes (section 8.3) ------------------------------------------------
// Effective 3-bracket rates on income as multiples of median wage: <1x / 1-3x / >3x.
const TAX_BRACKETS = {
  low:      { rates: [0.00, 0.00, 0.05], social: 0.03 },
  light:    { rates: [0.02, 0.08, 0.15], social: 0.05 },
  moderate: { rates: [0.08, 0.18, 0.28], social: 0.08 },
  heavy:    { rates: [0.15, 0.30, 0.45], social: 0.15 },
};

// Returns { incomeTax, socialContrib, total }. Informal income is passed as untaxed=true.
export function computeTax(country, grossIncome, { untaxed = false } = {}) {
  if (untaxed || grossIncome <= 0) return { incomeTax: 0, socialContrib: 0, total: 0 };
  const mw = medianWage(country);
  const b = TAX_BRACKETS[country.taxTier] || TAX_BRACKETS.light;
  // Progressive over the three bands.
  const b1 = Math.min(grossIncome, mw);
  const b2 = Math.min(Math.max(grossIncome - mw, 0), 2 * mw);
  const b3 = Math.max(grossIncome - 3 * mw, 0);
  const incomeTax = b1 * b.rates[0] + b2 * b.rates[1] + b3 * b.rates[2];
  const socialContrib = grossIncome * b.social;
  return { incomeTax, socialContrib, total: incomeTax + socialContrib };
}

// ---- Welfare benefits (section 8.5) -------------------------------------
const WELFARE = {
  generous: { unemp: [0.60, 2], pension: 0.50, child: 0.05, disability: 1.0 },
  moderate: { unemp: [0.40, 1], pension: 0.30, child: 0.02, disability: 1.0 },
  minimal:  { unemp: [0.15, 1], pension: 0.15, child: 0.00, disability: 0.5 },
  none:     { unemp: [0.00, 0], pension: 0.00, child: 0.00, disability: 0.0 },
};

export function welfareParams(country) {
  return WELFARE[country.welfareTier] || WELFARE.none;
}

export function unemploymentBenefit(country, lastWage) {
  const w = welfareParams(country);
  return { annual: (lastWage || medianWage(country)) * w.unemp[0], years: w.unemp[1] };
}

export function statePension(country) {
  return welfareParams(country).pension * medianWage(country);
}

export function childBenefit(country, nKids) {
  return welfareParams(country).child * medianWage(country) * nKids;
}

// ---- Bank interest (section 8.1) ----------------------------------------
// Slightly negative real: nominal ≈ inflation − 1%. We track money in real PPP
// terms, so bank savings grow at −1%/yr in real terms (mild erosion).
export function bankRealRate() { return -0.01; }
