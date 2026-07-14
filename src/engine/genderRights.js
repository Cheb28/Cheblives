// Country-sensitive gender/economic-rights profile. This is a gameplay tier,
// not a claim about every household. It separates formal restriction from
// enforcement and uses explicit overrides only for the clearest cases.

const SEVERE_RESTRICTIONS = new Set(['Afghanistan']);
const RESTRICTED_OVERRIDES = new Set(['Iran', 'Yemen', 'Sudan']);

export function genderRightsProfile(country) {
  const legal = (country.legalSystem || '').toLowerCase();
  const govt = (country.govType || '').toLowerCase();
  if (SEVERE_RESTRICTIONS.has(country.name)) return {
    tier: 'severe', label: 'Severely restricted', femaleHireMult: 0.18,
    husbandWorkApproval: true, schoolAccessMult: 0.25,
    note: 'Formal and enforced restrictions sharply limit women’s education, mobility, and paid work.',
  };
  const restricted = RESTRICTED_OVERRIDES.has(country.name)
    || ((legal.includes('sharia') || legal.includes('islamic')) && country.lawTier === 'weak')
    || (govt.includes('theocratic') && country.lawTier !== 'strong');
  if (restricted) return {
    tier: 'restricted', label: 'Restricted in practice', femaleHireMult: 0.65,
    husbandWorkApproval: false, schoolAccessMult: 0.75,
    note: 'Legal or enforcement barriers reduce women’s access to some work and family decisions.',
  };
  if (country.lawTier === 'weak' && country.incomeTier <= 2) return {
    tier: 'unequal', label: 'Unequal enforcement', femaleHireMult: 0.82,
    husbandWorkApproval: false, schoolAccessMult: 0.9,
    note: 'Equal rights may exist on paper, but weak enforcement creates a measurable participation gap.',
  };
  return {
    tier: 'equal', label: 'Broad legal equality', femaleHireMult: 1,
    husbandWorkApproval: false, schoolAccessMult: 1,
    note: 'The simulation applies no country-level legal penalty to women’s education or employment.',
  };
}

export function needsHusbandWorkApproval(ch, country) {
  return ch.sex === 'female' && !!ch.spouse?.alive
    && genderRightsProfile(country).husbandWorkApproval
    && !ch.familyRights?.workPermission;
}
