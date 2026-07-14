import { medianWage } from './countries.js';

const VERY_LARGE = new Set(['Netherlands', 'Austria', 'Denmark']);
const LARGE = new Set(['United Kingdom', 'France', 'Sweden', 'Finland', 'Ireland', 'Singapore']);
const MODERATE = new Set(['Germany', 'Belgium', 'Norway', 'Iceland', 'New Zealand', 'Australia', 'Canada', 'Japan', 'South Korea', 'Hong Kong']);
const EXPENSIVE = new Set(['Singapore', 'Hong Kong', 'Australia', 'New Zealand', 'Canada', 'United Kingdom', 'Ireland']);

export function housingProfile(country) {
  const supply = VERY_LARGE.has(country.name) ? 'very_large' : LARGE.has(country.name) ? 'large'
    : MODERATE.has(country.name) ? 'moderate' : country.welfareTier === 'generous' ? 'moderate'
      : country.welfareTier === 'moderate' ? 'limited' : 'minimal';
  const allocationChance = { very_large: .34, large: .22, moderate: .13, limited: .06, minimal: .015 }[supply];
  return {
    supply,
    allocationChance,
    socialRentShare: supply === 'minimal' ? .65 : .48,
    marketRentShare: EXPENSIVE.has(country.name) ? .38 : country.incomeTier >= 4 ? .32 : .27,
    homePriceMultiple: EXPENSIVE.has(country.name) ? 8 : country.incomeTier >= 4 ? 6.5 : country.incomeTier >= 2 ? 5 : 3.5,
    familyReliance: ['minimal', 'none'].includes(country.welfareTier),
    note: country.name === 'Singapore'
      ? 'Public rental is narrowly targeted to citizens without family support or another housing option.'
      : `${supply.replace('_', ' ')} social-rental sector (modeled country profile).`,
  };
}

export function initialHousing(wealthIdx = 2) {
  return {
    tenure: 'parents', application: null,
    parentContributionRate: [.35, .25, .15, .10, .05][wealthIdx] ?? .15,
    teenContributionRate: .50, adultChildContributionRate: .20,
  };
}

export function ensureHousing(ch) {
  ch.housing ||= initialHousing(ch.wealthIdx);
  ch.housing.parentContributionRate ??= .15;
  ch.housing.teenContributionRate ??= .50;
  ch.housing.adultChildContributionRate ??= .20;
  if (ch.ownsHome) ch.housing.tenure = 'owner';
  return ch.housing;
}

export function homePrice(country, ch) {
  return medianWage(country) * housingProfile(country).homePriceMultiple * (ch.location?.colMultiplier || 1);
}

export function annualHousingCost(country, ch, earnedIncome = 0) {
  const h = ensureHousing(ch), mw = medianWage(country), city = ch.location?.colMultiplier || 1;
  if (ch.ownsHome || h.tenure === 'owner' || h.tenure === 'homeless') return 0;
  if (h.tenure === 'parents') return ch.age >= 18 ? (earnedIncome || mw) * h.parentContributionRate : 0;
  const market = mw * city * housingProfile(country).marketRentShare;
  return h.tenure === 'social' ? market * housingProfile(country).socialRentShare : market;
}

export function canApplyForSocialHousing(ch, country) {
  const h = ensureHousing(ch), resident = ch.immigration?.residence;
  if (ch.age < 18 || ch.ownsHome || h.tenure === 'social' || h.application) return false;
  if (!resident || ['irregular', 'visa_expiring', 'student', 'temporary_work', 'working_holiday'].includes(resident.status)) return false;
  const assets = (ch.money?.cash || 0) + (ch.money?.bank || 0) + (ch.money?.household || 0);
  if (assets > medianWage(country) * 1.5) return false;
  if (country.name === 'Singapore') {
    const citizen = (ch.immigration?.citizenships || []).includes(country.id);
    const parentsAlive = (ch.family || []).some(p => ['Father', 'Mother'].includes(p.relation) && p.alive);
    if (!citizen || (parentsAlive && h.tenure === 'parents')) return false;
  }
  return housingProfile(country).supply !== 'minimal' || ch.wealthIdx <= 1;
}

export function applyForSocialHousing(ch, country) {
  if (!canApplyForSocialHousing(ch, country)) return false;
  ensureHousing(ch).application = { waitingYears: 0 };
  return true;
}

export function chooseHousing(ch, country, tenure) {
  const h = ensureHousing(ch);
  if (ch.age < 18 || ch.ownsHome || !['parents', 'private'].includes(tenure)) return false;
  if (tenure === 'parents' && !(ch.family || []).some(p => ['Father', 'Mother'].includes(p.relation) && p.alive)) return false;
  h.tenure = tenure;
  return true;
}

export function setChildContributionPolicy(ch, group, rate) {
  const key = group === 'teen' ? 'teenContributionRate' : 'adultChildContributionRate';
  ensureHousing(ch)[key] = Math.max(0, Math.min(.5, Number(rate) || 0));
}

export function resolveHousingYear(ch, country, rng) {
  const h = ensureHousing(ch), logs = [];
  const parentsAlive = (ch.family || []).some(p => ['Father', 'Mother'].includes(p.relation) && p.alive);
  if (h.tenure === 'parents' && !parentsAlive) {
    h.tenure = ch.age >= 18 ? 'private' : 'homeless';
    logs.push('You could no longer remain in the parental home.');
  }
  if (ch.spouse?.alive && h.tenure === 'parents') {
    h.tenure = 'private';
    logs.push('Your new household moved into a private rental home.');
  }
  if (h.application) {
    h.application.waitingYears += 1;
    const children = (ch.family || []).filter(p => p.relation === 'Child' && p.alive && p.atHome !== false && ch.age - p.ageOffset < 18).length;
    const disability = (ch.health?.disabilities || []).reduce((s, d) => s + (d.severity || 1), 0);
    const priority = 1 + Math.min(.9, children * .15 + disability * .18 + h.application.waitingYears * .08);
    if (rng.chance(Math.min(.75, housingProfile(country).allocationChance * priority))) {
      h.tenure = 'social'; h.application = null;
      logs.push('You were allocated a social-rental home.');
    }
  }
  if (h.tenure === 'homeless') { ch.stats.health = Math.max(1, ch.stats.health - 4); ch.stats.happiness = Math.max(1, ch.stats.happiness - 8); }
  return logs;
}

export function housingLabel(ch) {
  return ({ parents: 'Living with parents', private: 'Private rental', social: 'Social housing', owner: 'Owner-occupied', homeless: 'Without stable housing' })[ensureHousing(ch).tenure];
}
