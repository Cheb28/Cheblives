import assert from 'node:assert/strict';
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { enroll } from '../src/engine/education.js';
import { chooseServe, enlistVoluntary } from '../src/engine/military.js';
import { healthcareCoverage } from '../src/engine/health.js';
import { resolveDecision } from '../src/engine/events.js';

const us = COUNTRY_BY_NAME['United States'];
const korea = COUNTRY_BY_NAME['South Korea'];

// One button/engine step is always exactly one year. There is no fast-forward.
{
  const s = newGame({ countryId: us.id, seed: 1 });
  const before = s.character.age;
  stepYear(s);
  assert.equal(s.character.age, before + 1);
}

// Character-creation locks survive random-mode creation.
{
  const s = newGame({ mode: 'random', countryId: us.id, sex: 'female', ethnicity: 'Locked ethnicity', religion: 'Locked religion', wealthClass: 'Rich', seed: 2 });
  assert.equal(s.character.countryId, us.id);
  assert.equal(s.character.sex, 'female');
  assert.equal(s.character.ethnicity, 'Locked ethnicity');
  assert.equal(s.character.religion, 'Locked religion');
  assert.equal(s.character.wealthClass, 'Rich');
}

// An unanswered job offer must decline, preserving the current situation.
{
  const s = newGame({ countryId: us.id, seed: 3 });
  const ch = s.character;
  ch.age = 20;
  ch.employmentStatus = 'unemployed';
  const log = [];
  resolveDecision(ch, us, s, s.rng, { type: 'jobOffer', sector: 'industrial', rung: 0, default: 'decline' }, log);
  assert.equal(ch.job, null);
  assert.equal(ch.employmentStatus, 'unemployed');
}

// A four-year program charges all four annual tuition payments.
{
  const s = newGame({ countryId: us.id, seed: 101 });
  const ch = s.character;
  ch.age = 18;
  ch.stats.health = 100;
  ch.skills.academic = 60;
  ch.education.stage = 'secondary_done';
  ch.employmentStatus = 'unemployed';
  enroll(ch, us, 'university', { useLoan: true });
  const annual = ch.education._tuition;
  for (let i = 0; i < 4; i++) stepYear(s);
  assert.equal(ch.education.degree, true);
  assert.equal(ch.debts.studentLoan, annual * 4);
}

// Final conscription year retains barracks and military-healthcare benefits.
{
  const s = newGame({ countryId: korea.id, sex: 'male', seed: 202 });
  const ch = s.character;
  ch.age = 18;
  ch.stats.health = 100;
  ch.employmentStatus = 'unemployed';
  chooseServe(ch, korea);
  while (ch.military.status === 'serving') stepYear(s);
  const labels = ch.lastStatement.expenses.map(x => x.label);
  assert(labels.includes('Living costs (service)'));
  assert(!labels.includes('Rent'));
  assert.equal(healthcareCoverage(korea, { ...ch, _servedThisYear: true }).label, 'Military healthcare');
}

// A 20-year military career produces a military pension and not an early state pension.
{
  const s = newGame({ countryId: us.id, seed: 303 });
  const ch = s.character;
  ch.age = 44;
  ch.stats.health = 100;
  ch.money.bank = 1_000_000;
  enlistVoluntary(ch);
  ch.military.yearsServed = 19;
  stepYear(s);
  stepYear(s);
  const labels = ch.lastStatement.income.map(x => x.label);
  assert(labels.includes('Military pension'));
  assert(!labels.includes('State pension'));
}

// Activities are chosen for one year at a time.
{
  const s = newGame({ countryId: us.id, seed: 404 });
  s.character.age = 10;
  s.character.selectedActivities = ['reading'];
  stepYear(s);
  assert.deepEqual(s.character.selectedActivities, []);
}

console.log('Regression checks passed.');
