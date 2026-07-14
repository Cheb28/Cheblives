// Game orchestration: holds the single serializable game-state object and
// drives it through the engine. UI calls these; it never touches engine internals.
import { makeRng, randomSeed } from './rng.js';
import { createCharacter } from './character.js';
import { advanceYear } from './advance.js';
import { settleEstate } from './inheritance.js';
import { COUNTRY_BY_ID } from './countries.js';
import { displayName, hydrateNames } from './names.js';
import { initializeFamilyEconomy } from './household.js';
import { ensureExperience } from './experience.js';
import { migrateLanguages } from './language.js';
import { ensureFinancialState } from './financialSystems.js';

// Create a fresh game. options passed through to createCharacter.
// If options.seed omitted, a random one is generated (kept for reproducibility).
export function newGame(options = {}) {
  const seed = options.seed ?? randomSeed();
  const rng = makeRng(seed);
  const character = createCharacter(rng, options);

  // The player starts at birth (age 0) and lives every year, including infancy.
  const state = {
    seed,
    rngState: rng.state,
    rng,
    character,
    year: 0,
    log: [{ age: 0, lines: [`Born as ${displayName(character)} in ${character.location.name}, ${character.countryName}.`] }],
    over: false,
    generation: 1,
    estate: null,
  };
  return state;
}

// Advance exactly one year. Returns the state (mutated).
export function stepYear(state) {
  if (state.over) return state;
  const result = advanceYear(state);
  state.year += 1;
  state.rngState = state.rng.state;
  // Only record years that had something happen (keeps the life log a highlight reel;
  // the header shows the age advancing every year regardless).
  if (result.log.length > 0) state.log.push({ age: state.character.age, lines: result.log });
  if (result.died) {
    state.over = true;
    state.estate = settleEstate(state.character, COUNTRY_BY_ID[state.character.countryId]);
  }
  return state;
}

// Serialize to a plain object safe for JSON (drops the live rng closure).
export function serialize(state) {
  const { rng, ...rest } = state;
  return { ...rest, rngState: state.rng.state };
}

// Restore a game from serialized data.
export function deserialize(data) {
  const rng = makeRng(data.rngState ?? data.seed);
  hydrateNames(data.character, rng);
  ensureExperience(data.character);
  for(const p of data.character.family||[])ensureExperience(p);
  const birthCountry=COUNTRY_BY_ID[data.character.immigration?.originCountryId]||COUNTRY_BY_ID[data.character.countryId];
  migrateLanguages(data.character,birthCountry,COUNTRY_BY_ID);
  initializeFamilyEconomy(data.character, COUNTRY_BY_ID[data.character.countryId], rng);
  ensureFinancialState(data.character,COUNTRY_BY_ID[data.character.countryId]);
  return { ...data, rng };
}

export function continueAsHeir(state, childId) {
  if (!state.over || !state.estate) return null;
  const parent = state.character;
  const child = parent.family.find(p => p.id === childId && p.relation === 'Child' && p.alive);
  if (!child) return null;
  const inheritance = state.estate.shares.find(s => s.id === childId)?.amount || 0;
  const rng = state.rng;
  const heir = createCharacter(rng, {
    countryId: parent.countryId, locationName: parent.location.name, sex: child.sex,
    ethnicity: child.ethnicity, religion: child.religion, wealthClass: inheritance > 0 ? 'Middle' : 'Poor',
  });
  const age = Math.max(0, parent.age - child.ageOffset);
  heir.age = age;
  heir.identity = structuredClone(child.identity);
  heir.name = child.name;
  heir.stats = { ...child.stats };
  heir.experience = structuredClone(child.experience||heir.experience);
  heir.education.performance=child.educationPerformance??heir.education.performance;
  heir.education.credentials=[...(child.credentials||[])];
  heir.money.bank = inheritance;
  heir.money.cash = 0;
  if (child.citizenships?.length) heir.immigration.citizenships = [...child.citizenships];
  heir.immigration.originCountryId = child.countryId || parent.countryId;
  heir.immigration.residence = {
    countryId: parent.countryId,
    status: heir.immigration.citizenships.includes(parent.countryId) ? 'citizen' : 'family',
    route: 'heir continuation', years: 0,
  };
  heir.family = parent.family.filter(p => p.relation === 'Child' && p.id !== child.id).map(p => ({
    ...p, relation: 'Sibling', ageOffset: p.ageOffset - child.ageOffset,
  }));
  heir.family.push({
    id: 'deceased-parent', relation: parent.sex === 'male' ? 'Father' : 'Mother', sex: parent.sex,
    alive: false, ageOffset: -child.ageOffset, relationshipScore: 70,
    ethnicity: parent.ethnicity, religion: parent.religion, name: parent.name,
    identity: structuredClone(parent.identity),
  });
  if (age < 6) { heir.education.stage = 'preschool'; heir.employmentStatus = 'child'; }
  else if (age < 12) { heir.education.stage = 'primary'; heir.education.enrolled = true; heir.employmentStatus = 'child'; }
  else if (age < 18) { heir.education.stage = 'secondary'; heir.education.enrolled = true; heir.employmentStatus = 'child'; }
  else { heir.education.stage = 'secondary_done'; heir.employmentStatus = 'unemployed'; }
  return {
    seed: state.seed, rngState: rng.state, rng, character: heir, year: state.year,
    log: [{ age, lines: [`Continued the family story as ${displayName(heir)}, a child of ${displayName(parent)}, inheriting ${Math.round(inheritance).toLocaleString()}.`] }],
    over: false, generation: (state.generation || 1) + 1, estate: null,
  };
}
