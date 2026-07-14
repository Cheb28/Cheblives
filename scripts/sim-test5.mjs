import assert from 'node:assert/strict';
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_ID, medianWage } from '../src/engine/countries.js';
import { setPartTimeWork, buyHome, buyInvestment, foundBusiness } from '../src/engine/actions.js';
import { slotBudget } from '../src/engine/activities.js';
import { investmentValue } from '../src/engine/investments.js';

console.log('=== Phase 5 household, youth work, assets, and business checks ===');

const teen = newGame({ seed: 505, countryId: 'us', locationName: 'Chicago', sex: 'female', wealthClass: 'Poor' });
teen.character.age = 15;
teen.character.employmentStatus = 'child';
const beforeSlots = slotBudget(teen.character);
assert.equal(setPartTimeWork(teen, true), true, 'legal-age teenager can select part-time work');
assert.equal(slotBudget(teen.character), beforeSlots - 1, 'part-time work consumes free-time activity slot');
stepYear(teen);
const teenPersonal = teen.character.lastStatement.income.find(x => x.label.includes('Teen part-time work · personal'));
const teenHousehold = teen.character.lastStatement.income.find(x => x.label.includes('Teen part-time work · parent'));
assert(teenPersonal && !teenPersonal.household, 'teen retains a personal share of earnings');
assert(teenHousehold?.household, 'parents can require an explicit household contribution');
assert(teen.character.lastStatement.household.income > 0, 'household statement records the contribution');

const assets = newGame({ seed: 506, countryId: 'us', locationName: 'Chicago', wealthClass: 'Affluent' });
assets.character.age = 30;
assets.character.employmentStatus = 'unemployed';
assets.character.money.bank = medianWage(COUNTRY_BY_ID.us) * 20;
assert.equal(buyInvestment(assets, 'stocks', 10000), true);
assert.equal(investmentValue(assets.character), 10000);
assert.equal(buyHome(assets), true, 'eligible adult can buy a home');
assert(assets.character.homeValue > 0);
assert.equal(foundBusiness(assets, 'informal'), true, 'adult can found an informal business');
stepYear(assets);
assert(!assets.character.lastStatement.expenses.some(x => x.label === 'Rent'), 'homeowner no longer pays rent');
assert(assets.character.lastStatement.assetChanges.some(x => x.label.includes('Investment')), 'investment returns are itemized as non-cash');

const parent = newGame({ seed: 507, countryId: 'us', locationName: 'Chicago', wealthClass: 'Middle' });
parent.character.age = 30;
parent.character.employmentStatus = 'employed';
parent.character.job = { sector: 'professional', rung: 1 };
parent.character.family.push({ id:'baby', relation:'Child', childNumber:1, alive:true, ageOffset:30, relationshipScore:70, stats:{health:60,happiness:60,intelligence:50,fitness:50,charisma:50}, skills:{academic:0,vocational:0,business:0,political:0} });
stepYear(parent);
assert(parent.character.lastStatement.expenses.some(x => x.label === 'Child essentials'), 'child essentials are itemized');
assert(parent.character.lastStatement.expenses.some(x => x.label.startsWith('Daycare')), 'working single parent receives an itemized subsidized daycare cost');

console.log('Phase 5 checks passed.');
