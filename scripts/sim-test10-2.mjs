import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newGame } from '../src/engine/game.js';
import { COUNTRIES, COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { countryFacts, flagEmoji } from '../src/engine/countryFacts.js';
import { moveCharacter } from '../src/engine/immigration.js';

console.log('=== Phase 10.2 country map and information checks ===');

for (const country of COUNTRIES) {
  assert(Array.isArray(country.coordinates) && country.coordinates.length === 2, `${country.name} needs map coordinates`);
  const [lon, lat] = country.coordinates;
  assert(Number.isFinite(lon) && lon >= -180 && lon <= 180, `${country.name} longitude is valid`);
  assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, `${country.name} latitude is valid`);
  assert(country.currency, `${country.name} needs a currency label`);
  assert.match(country.flagCode, /^[A-Z]{2}$/, `${country.name} needs a flag code`);
  assert(flagEmoji(country).length > 0);
  const facts = countryFacts(country, { countryId: country.id, location: { name: country.capital || 'Modeled location' }, immigration: { citizenships: [country.id], residence: { status: 'citizen' } } });
  for (const key of ['capital','location','currency','income','healthcare','education','employment','relationships','military','welfare','housing','tax','inheritance','immigration','economy','conflict']) {
    assert(facts[key] !== undefined && facts[key] !== null && String(facts[key]).length > 0, `${country.name} missing ${key}`);
  }
}

const us = COUNTRY_BY_NAME['United States'], japan = COUNTRY_BY_NAME.Japan;
const state = newGame({ countryId: us.id, seed: 1002 });
const beforeHome = state.character.immigration.originCountryId;
moveCharacter(state.character, japan, 'temporary_work', 24);
assert.equal(state.character.countryId, japan.id, 'migration changes the country shown by the Country tab');
assert.equal(state.character.immigration.originCountryId, beforeHome, 'birth country remains available for the second map marker');
assert.deepEqual(countryFacts(japan, state.character).citizenships, ['United States']);

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const countryTab = await readFile(new URL('../src/ui/tabs/Country.jsx', import.meta.url), 'utf8');
const map = await readFile(new URL('../src/ui/CountryMap.jsx', import.meta.url), 'utf8');
assert.match(app, /lazy\(\(\) => import\('\.\/ui\/tabs\/Country\.jsx'\)\)/, 'Country tab is lazy-loaded');
assert.match(countryTab, /lazy\(\(\) => import\('\.\.\/CountryMap\.jsx'\)\)/, 'Map library is nested behind another lazy import');
assert.match(countryTab, /About This Country Model/);
assert.match(countryTab, /not legal, immigration, financial, or medical advice/);
assert.match(countryTab, /OpenStreetMap contributors/);
assert.match(map, /dark_all\/\{z\}\/\{x\}\/\{y\}\.png/);
assert(!/navigator\.geolocation/.test(map), 'map must not request browser geolocation');
assert.match(countryTab, /flagUrl\(country\.flagCode\)/);
assert.match(countryTab, /Flag of \$\{country\.name\}/);

console.log(`Phase 10.2 checks passed for ${COUNTRIES.length} countries.`);
