// Character creation + birth logic (GAME_DESIGN section 2).
import { COUNTRIES, COUNTRY_BY_ID, locationsFor, birthWeight } from './countries.js';
import { initEducation } from './education.js';
import { initMilitary } from './military.js';
import { initHealth } from './health.js';
import { initImmigration } from './immigration.js';
import { initJudicial } from './judicial.js';
import { canonicalLanguage, primaryLanguages } from './language.js';
import { initialHousing } from './housing.js';
import { assignBirthHouseholdNames } from './names.js';

export const WEALTH_CLASSES = ['Destitute', 'Poor', 'Middle', 'Affluent', 'Rich'];
const PERSONALITY_TRAITS = ['ambitious','caring','independent','social','cautious','creative','resilient','curious'];

// Roll a wealth class from Gini + income tier. Higher Gini widens toward extremes;
// higher income tier shifts the center up.
function rollWealthClass(rng, country) {
  const gini = country.gini ?? 38;
  const spread = (gini - 25) / 25;            // ~0.4 (equal) .. ~1.4 (very unequal)
  const center = 1 + (country.incomeTier - 1) * 0.6; // tier1~1 .. tier4~2.8 on 0..4 scale
  let v = rng.gaussian(center, 0.9 * spread + 0.5);
  v = Math.max(0, Math.min(4, Math.round(v)));
  return WEALTH_CLASSES[v];
}

// Weighted pick from a pctList [{name, pct}]; falls back to a label if empty.
function rollDistribution(rng, list, fallback) {
  if (!list || list.length === 0) return fallback;
  const total = list.reduce((s, x) => s + x.pct, 0);
  if (total <= 0) return rng.pick(list).name;
  let r = rng.next() * total;
  for (const x of list) { r -= x.pct; if (r < 0) return x.name; }
  return list[list.length - 1].name;
}

// Pick a location within a country. If forcedName given, use it; else roll by
// urbanization (urban share -> a named city weighted by pop; rural share -> town/rural).
function rollLocation(rng, country, forcedName) {
  const locs = locationsFor(country);
  if (forcedName) return locs.find(l => l.name === forcedName) || locs[0];
  const urban = (country.urbanization ?? 55) / 100;
  if (rng.chance(urban)) {
    const named = locs.filter(l => l.kind === 'capital' || l.kind === 'major');
    if (named.length) return rng.weighted(named, l => l.pop || 500000);
    return locs.find(l => l.kind === 'secondary');
  }
  // rural-ish
  return rng.chance(0.5) ? locs.find(l => l.kind === 'town') : locs.find(l => l.kind === 'rural');
}

// A generated person (parent/sibling/spouse/child) — light record.
function makePerson(rng, country, { relation, sex, ageOffset = 0, wealthClass }) {
  const chosenSex = sex || (rng.chance(0.5) ? 'male' : 'female');
  return {
    id: `${relation.toLowerCase()}-${Math.abs(ageOffset)}-${rng.int(1, 999999)}`,
    relation,
    sex: chosenSex,
    name: null,
    ethnicity: rollDistribution(rng, country.ethnicGroups, 'Local'),
    religion: rollDistribution(rng, country.religions, 'None'),
    relationshipScore: 70,
    alive: true,
    ageOffset,
    countryId: country.id,
    residenceCountryId: country.id,
    citizenships: [country.id],
  };
}

// options may also include secondNationalityCountryId + foreignParentRelation.
// mode 'random' = born-anywhere (weighted). Any explicitly provided field is locked.
export function createCharacter(rng, options = {}) {
  let country;
  if (options.countryId && COUNTRY_BY_ID[options.countryId]) {
    country = COUNTRY_BY_ID[options.countryId];
  } else {
    country = rng.weighted(COUNTRIES, birthWeight);
  }

  const sex = options.sex || (rng.chance(0.5) ? 'male' : 'female');
  const location = rollLocation(rng, country, options.locationName);
  const localEthnicity = country.ethnicGroups?.some(x => x.name === options.ethnicity) ? options.ethnicity : null;
  const localReligion = country.religions?.some(x => x.name === options.religion) ? options.religion : null;
  const ethnicity = localEthnicity || rollDistribution(rng, country.ethnicGroups, 'Local');
  const religion = localReligion || rollDistribution(rng, country.religions, 'None');
  const wealthClass = options.wealthClass || rollWealthClass(rng, country);
  const wealthIdx = WEALTH_CLASSES.indexOf(wealthClass);

  // childhood nutrition/education modifiers from wealth class
  const wealthMod = (wealthIdx - 2); // -2..+2

  const character = {
    countryId: country.id,
    countryName: country.name,
    location: { name: location.name, kind: location.kind, colMultiplier: location.colMultiplier },
    sex,
    ethnicity,
    religion,
    personality: [...new Set([rng.pick(PERSONALITY_TRAITS), rng.pick(PERSONALITY_TRAITS)])],
    nativeLanguages: country.languages.slice(0, 2),
    languages: Object.fromEntries(primaryLanguages(country).map(lang=>[canonicalLanguage(lang),100])),
    languageStudyTarget: null,
    wealthClass,
    age: 0,
    alive: true,
    causeOfDeath: null,
    stats: {
      health: 70 + rng.int(-5, 5) + wealthMod * 2,
      happiness: 55 + rng.int(-5, 5),
      intelligence: 45 + rng.int(-8, 8) + wealthMod * 2,
      fitness: 50 + rng.int(-8, 8),
      charisma: 45 + rng.int(-8, 8),
    },
    skills: { academic: 0, vocational: 0, business: 0, political: 0 },
    money: { cash: 0, bank: 0, household: 0 },
    debts: { studentLoan: 0, mortgage: 0, business: 0 },
    investments: { bonds:0, stocks:0, realEstate:0, gold:0, pension:0 },
    business: null,
    partTimeWork: false,
    wealthIdx,
    education: initEducation(),
    military: initMilitary(),
    health: initHealth(),
    immigration: initImmigration(country.id),
    judicial: initJudicial(),
    job: null,
    jobSearch: { sector: null },
    everEmployed: false,
    employmentStatus: 'child',
    lifestyle: 'normal',
    selectedActivities: [],
    netWorthHistory: [],
    benefits: { unemploymentYearsLeft: 0, lastWage: 0, contributionYears: 0 },
    veteran: false,
    spouse: null,
    partner: null,
    relationshipStatus: 'single',
    relationshipHistory: [],
    datingIntent: false,
    proposalIntent: false,
    marriageIntent: false,
    separationIntent: false,
    divorceIntent: false,
    childrenIntent: 'neutral',
    social: { friendIntent: false, friends: [], datingPreference: 'anyone' },
    fertility: { contraception: 'none', pregnancy: null, knownInfertility: false, treatment: null },
    familyPlans: { adoption: null, foster: false, caregivingId: null, reconciliationId: null },
    safety: { concern: false, seekHelpIntent: false, safetyPlan: false, leaveIntent: false },
    familyRights: { workPermission: false, requestWorkPermission: false },
    will: { written: false, shares: {} },
    ownsHome: false,
    homeValue: 0,
    housing: initialHousing(wealthIdx),
    pendingDecisions: [],    // decision events awaiting choice — non-blocking, each has a default
    eventFeed: [],           // structured recent events for the Events tab {age, category, text}
    lastStatement: null,
    family: [],
  };

  // clamp stats
  for (const k of Object.keys(character.stats)) {
    character.stats[k] = Math.max(1, Math.min(100, Math.round(character.stats[k])));
  }

  // Family: 2 parents + 0-4 siblings from fertility
  character.family.push(makePerson(rng, country, { relation: 'Father', sex: 'male', ageOffset: -rng.int(24, 38) }));
  character.family.push(makePerson(rng, country, { relation: 'Mother', sex: 'female', ageOffset: -rng.int(22, 36) }));
  const nSiblings = Math.max(0, Math.min(4, Math.round(rng.gaussian((country.fertility ?? 2) - 1, 1))));
  for (let i = 0; i < nSiblings; i++) {
    character.family.push(makePerson(rng, country, {
      // Only siblings already born appear at the player's birth. Younger
      // siblings can arrive later through family events in future tuning.
      relation: 'Sibling', ageOffset: rng.int(-8, 0),
    }));
  }

  const setForeignParent = (foreign, relation, childInherits) => {
    const parent = character.family.find(p => p.relation === relation);
    if (!parent || !foreign) return;
    parent.citizenships = [foreign.id];
    parent.countryId = foreign.id;
    parent.ethnicity = rollDistribution(rng, foreign.ethnicGroups, 'Local');
    parent.religion = rollDistribution(rng, foreign.religions, 'None');
    if (childInherits) character.immigration.citizenships.push(foreign.id);
    character.immigration.citizenships = [...new Set(character.immigration.citizenships)];
  };

  const selectedForeign = COUNTRY_BY_ID[options.secondNationalityCountryId];
  if (selectedForeign && selectedForeign.id !== country.id) {
    setForeignParent(selectedForeign, options.foreignParentRelation === 'Mother' ? 'Mother' : 'Father', true);
  } else if (rng.chance(.03)) {
    const candidates=COUNTRIES.filter(c=>c.id!==country.id);
    const nearby=candidates.filter(c=>c.region===country.region);
    const foreign=rng.pick(rng.chance(.75)&&nearby.length?nearby:candidates);
    setForeignParent(foreign, rng.chance(.5) ? 'Father' : 'Mother', rng.chance(.5));
  }

  assignBirthHouseholdNames(character, rng, country, options.playerName);

  return character;
}
