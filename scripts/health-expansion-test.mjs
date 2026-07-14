import assert from 'node:assert/strict';
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { addDisability, healthWorkCapacity, resolveHealth } from '../src/engine/health.js';
import { makeRng } from '../src/engine/rng.js';

console.log('=== Healthcare expansion checks ===');

// Infant mortality should reflect country data, and deaths should have a named cause.
function infantDeaths(countryName, lives = 1200) {
  const country = COUNTRY_BY_NAME[countryName];
  let deaths = 0;
  const causes = new Set();
  for (let i = 0; i < lives; i++) {
    const state = newGame({ countryId: country.id, seed: 90000 + i, wealthClass: 'Middle' });
    stepYear(state);
    if (state.over) { deaths++; causes.add(state.character.causeOfDeath); }
  }
  return { deaths, causes };
}
const highInfant = infantDeaths('Nigeria');
const lowInfant = infantDeaths('Germany');
assert(highInfant.deaths > lowInfant.deaths * 3, 'higher-IMR country should produce substantially more infant deaths');
assert(!highInfant.causes.has('infancy'), 'infant deaths should use a specific cause');

// Disability is typed and affects physically demanding work more than office work.
const disabilityState = newGame({ countryId: COUNTRY_BY_NAME['United States'].id, seed: 812 });
const disabled = disabilityState.character;
disabled.age = 35;
addDisability(disabled, 'mobility', 2, 'test injury');
assert.equal(disabled.health.disabilities[0].type, 'mobility');
assert(healthWorkCapacity(disabled, 'industrial') < healthWorkCapacity(disabled, 'service'));

// Old-age decline should be gradual and explicit, not applied to young adults.
const youngState = newGame({ countryId: COUNTRY_BY_NAME['Japan'].id, seed: 813 });
youngState.character.age = 30;
resolveHealth(youngState.character, COUNTRY_BY_NAME['Japan'], makeRng(99), { income: 0 });
assert.equal(youngState.character.health.physicalDecline, 0);
const oldState = newGame({ countryId: COUNTRY_BY_NAME['Japan'].id, seed: 814 });
oldState.character.age = 80;
resolveHealth(oldState.character, COUNTRY_BY_NAME['Japan'], makeRng(99), { income: 0 });
assert(oldState.character.health.physicalDecline > 0);

// A population run should produce named conditions rather than generic placeholders.
const names = new Set();
for (let i = 0; i < 80; i++) {
  const state = newGame({ countryId: COUNTRY_BY_NAME['United States'].id, seed: 12000 + i });
  while (!state.over && state.character.age < 75) stepYear(state);
  for (const c of state.character.health.conditions) names.add(c.name);
}
assert(names.size >= 4, 'expanded population should develop several distinct named conditions');
assert(!names.has('Chronic illness') && !names.has('Untreated chronic illness'));

console.log(`Infant deaths/1200: Nigeria ${highInfant.deaths}, Germany ${lowInfant.deaths}.`);
console.log(`Named chronic conditions observed: ${[...names].sort().join(', ')}.`);
console.log('Healthcare expansion checks passed.');
