export function inheritanceRules(country) {
  const taxRate = country.taxTier === 'heavy' ? 0.20 : country.taxTier === 'moderate' ? 0.10 : 0;
  const legal = (country.legalSystem || '').toLowerCase();
  const protectedFamilyShare = /civil law|islamic|sharia|personal law/.test(legal) ? 0.5 : 0;
  return {
    taxRate,
    protectedFamilyShare,
    label: protectedFamilyShare > 0
      ? 'Protected-family-share succession'
      : 'Flexible testamentary succession',
    note: protectedFamilyShare > 0
      ? 'At least half of the after-tax estate must remain with the surviving spouse and children.'
      : 'The will may freely divide the estate among the listed close family.',
  };
}

export function eligibleBeneficiaries(ch) {
  const out = [];
  if (ch.spouse?.alive) out.push({ id: 'spouse', label: 'Spouse', kind: 'spouse' });
  for (const child of (ch.family || []).filter(p => p.relation === 'Child' && p.alive)) {
    out.push({ id: child.id, label: child.name || `Child ${child.childNumber}`, kind: 'child' });
  }
  return out;
}

export function settleEstate(ch, country) {
  const rules = inheritanceRules(country);
  const beneficiaries = eligibleBeneficiaries(ch);
  const gross = Math.max(0, (ch.money.cash || 0) + (ch.money.bank || 0) + (ch.money.household || 0)
    - (ch.debts.studentLoan || 0) - (ch.debts.mortgage || 0) - (ch.debts.business || 0)
    + investmentValue(ch) + (ch.business?.capital || 0) - (ch.business?.loan || 0) + (ch.homeValue || 0));
  const tax = gross * rules.taxRate;
  const distributable = gross - tax;
  const requested = ch.will?.shares || {};
  const hasWill = ch.will?.written && beneficiaries.some(b => (requested[b.id] || 0) > 0);
  let weights = {};
  if (hasWill) {
    for (const b of beneficiaries) weights[b.id] = Math.max(0, Number(requested[b.id]) || 0);
  } else {
    for (const b of beneficiaries) weights[b.id] = 1;
  }
  let total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total <= 0 && beneficiaries.length) {
    for (const b of beneficiaries) weights[b.id] = 1;
    total = beneficiaries.length;
  }
  const protectedPart = hasWill ? rules.protectedFamilyShare : 1;
  const equalProtected = beneficiaries.length ? protectedPart / beneficiaries.length : 0;
  const shares = beneficiaries.map(b => {
    const requestedPart = total > 0 ? weights[b.id] / total : 0;
    const pct = equalProtected + (1 - protectedPart) * requestedPart;
    return { ...b, pct, amount: distributable * pct };
  });
  return { gross, tax, taxRate: rules.taxRate, distributable, hasWill, rules, shares };
}
import { investmentValue } from './investments.js';
