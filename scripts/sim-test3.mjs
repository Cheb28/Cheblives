// Phase 3 headless test: health, insurance, events. (node scripts/sim-test3.mjs)
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { setActivities } from '../src/engine/actions.js';

function play(state, policy) {
  const ch = state.character;
  ch.health.healthPolicy = policy;
  if (ch.age < 18) setActivities(state, ['studying']); else setActivities(state, ['rest']);
  // auto-accept nothing special; defaults apply for all decisions (never blocks)
}

function runLife(opts, policy) {
  const s = newGame(opts);
  let g = 0;
  while (!s.over && g++ < 130) { play(s, policy); stepYear(s); }
  return s.character;
}

console.log('=== Untreated illness: "never" treat vs "always" (avg death age, US, 300 lives) ===');
{
  const c = COUNTRY_BY_NAME['United States'];
  for (const policy of ['always', 'never']) {
    let sumAge = 0, chronicCount = 0;
    for (let i = 0; i < 300; i++) {
      const ch = runLife({ countryId: c.id, seed: i * 617 + 5 }, policy);
      sumAge += ch.age;
      if (ch.health.conditions.some(x => x.chronic)) chronicCount++;
    }
    console.log(`  policy=${policy.padEnd(7)} avg death age ${(sumAge / 300).toFixed(1)}, ${chronicCount}/300 died with a chronic condition`);
  }
}

console.log('\n=== Medical bills: US uninsured vs UK (single-payer) — avg lifetime medical spend ===');
for (const nm of ['United States', 'United Kingdom']) {
  const c = COUNTRY_BY_NAME[nm];
  let totalMedical = 0, lives = 40;
  for (let i = 0; i < lives; i++) {
    const s = newGame({ countryId: c.id, seed: i * 313 + 2 });
    let g = 0, med = 0;
    while (!s.over && g++ < 130) {
      s.character.health.healthPolicy = 'affordable';
      setActivities(s, s.character.age < 18 ? ['studying'] : ['rest']);
      stepYear(s);
      const st = s.character.lastStatement;
      if (st) for (const e of st.expenses) if (/Medical|insurance/i.test(e.label)) med += e.amount;
    }
    totalMedical += med;
  }
  console.log(`  ${nm.padEnd(16)} avg lifetime medical+insurance spend $${Math.round(totalMedical / lives).toLocaleString()}`);
}

console.log('\n=== Political instability: unrest/war within 30 years (stability-1 countries) ===');
for (const nm of ['Somalia', 'Syria', 'Afghanistan', 'Switzerland']) {
  const c = COUNTRY_BY_NAME[nm];
  if (!c) { console.log(`  ${nm}: not found`); continue; }
  let sawUnrestWithin30 = 0, wars = 0, trials = 40;
  for (let i = 0; i < trials; i++) {
    const s = newGame({ countryId: c.id, seed: i * 911 + 1 });
    let g = 0, saw = false;
    while (!s.over && s.character.age < 30 && g++ < 40) {
      setActivities(s, ['rest']); stepYear(s);
      const ev = s.character.eventFeed.filter(e => e.category === 'political');
      if (ev.some(e => /war|unrest|coup/i.test(e.text))) saw = true;
      if (ev.some(e => /war/i.test(e.text))) wars++;
    }
    if (saw) sawUnrestWithin30++;
  }
  console.log(`  ${nm.padEnd(12)} stability=${c.stability}: unrest/war within 30yr in ${sawUnrestWithin30}/${trials} lives`);
}

console.log('\n=== Never-blocks check: decisions always auto-resolve via default ===');
{
  const c = COUNTRY_BY_NAME['South Korea'];
  const s = newGame({ countryId: c.id, sex: 'male', seed: 7 });
  let g = 0, maxPending = 0;
  while (!s.over && g++ < 130) {
    // NEVER set any choice — rely purely on defaults
    setActivities(s, ['rest']); stepYear(s);
    maxPending = Math.max(maxPending, s.character.pendingDecisions.length);
  }
  console.log(`  ran a full life answering NOTHING; life completed=${s.over}, died age ${s.character.age}, max pending at once=${maxPending}`);
  console.log(`  (decisions cleared each turn via defaults, so the game never stalls)`);
}
