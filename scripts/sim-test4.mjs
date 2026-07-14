import assert from 'node:assert/strict';
import { newGame, continueAsHeir } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { resolveFamily } from '../src/engine/family.js';
import { genderRightsProfile } from '../src/engine/genderRights.js';
import { settleEstate } from '../src/engine/inheritance.js';

const us = COUNTRY_BY_NAME['United States'];
const germany = COUNTRY_BY_NAME['Germany'];
const afghanistan = COUNTRY_BY_NAME['Afghanistan'];

console.log('=== Phase 4 family, rights, estate, and heir checks ===');

assert.equal(genderRightsProfile(us).tier, 'equal');
assert.equal(genderRightsProfile(afghanistan).tier, 'severe');

// Dating intent creates a partner; proposal creates a spouse; trying creates a child.
{
  const s = newGame({ countryId: us.id, sex: 'female', seed: 901 });
  const ch = s.character;
  ch.age = 24; ch.stats.charisma = 100; ch.datingIntent = true;
  for (let i = 0; i < 30 && !ch.partner; i++) resolveFamily(ch, us, s.rng);
  assert(ch.partner, 'dating intent should eventually produce a partner');
  ch.partner.yearsTogether = 2; ch.partner.relationshipScore = 100; ch.proposalIntent = true;
  for (let i = 0; i < 10 && !ch.spouse; i++) { ch.proposalIntent = true; resolveFamily(ch, us, s.rng); }
  assert(ch.spouse, 'a high-relationship proposal should eventually produce a spouse');
  ch.childrenIntent = 'try';
  for (let i = 0; i < 40 && !ch.family.some(p => p.relation === 'Child'); i++) resolveFamily(ch, us, s.rng);
  assert(ch.family.some(p => p.relation === 'Child'), 'trying for children should eventually create a child');
}

// Heavy-tax Germany charges 20%; protected-share law prevents full disinheritance.
{
  const s = newGame({ countryId: germany.id, seed: 902 });
  const ch = s.character;
  ch.money.bank = 100_000;
  ch.spouse = { id: 'spouse', relation: 'Spouse', alive: true, relationshipScore: 70, working: false };
  ch.family.push({
    id: 'child-test', relation: 'Child', childNumber: 1, alive: true, ageOffset: 20, sex: 'female',
    ethnicity: ch.ethnicity, religion: ch.religion, relationshipScore: 70,
    stats: { ...ch.stats }, skills: { ...ch.skills },
  });
  ch.will = { written: true, shares: { spouse: 0, 'child-test': 100 } };
  const estate = settleEstate(ch, germany);
  assert.equal(estate.tax, 20_000);
  assert.equal(estate.distributable, 80_000);
  assert.equal(estate.shares.find(x => x.id === 'spouse').pct, 0.25);
  assert.equal(estate.shares.find(x => x.id === 'child-test').pct, 0.75);
}

// A child can inherit and become the next playable generation at their current age.
{
  const s = newGame({ countryId: us.id, seed: 903 });
  const ch = s.character;
  ch.age = 60; ch.money.bank = 50_000;
  ch.family.push({
    id: 'child-heir', relation: 'Child', childNumber: 1, alive: true, ageOffset: 30, sex: 'male',
    ethnicity: ch.ethnicity, religion: ch.religion, relationshipScore: 80,
    stats: { ...ch.stats }, skills: { academic: 45, vocational: 10, business: 0, political: 0 },
  });
  s.over = true; s.estate = settleEstate(ch, us);
  const next = continueAsHeir(s, 'child-heir');
  assert(next && !next.over);
  assert.equal(next.generation, 2);
  assert.equal(next.character.age, 30);
  assert(next.character.money.bank > 0);
}

console.log('Phase 4 checks passed.');
