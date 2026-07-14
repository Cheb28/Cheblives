// Phase 2 headless test: economy, careers, draft. (node scripts/sim-test2.mjs)
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { setActivities, setJobSearch, enrollUniversity } from '../src/engine/actions.js';
import { netWorth } from '../src/engine/advance.js';

// A simple "sensible player" policy to exercise the systems.
function autoPlay(state) {
  const ch = state.character;
  // pick activities: study while young, gym+socialize as adult
  if (ch.age < 18) setActivities(state, ['studying', 'reading']);
  else setActivities(state, ['gym', 'socializing']);
  // at 18, try university if eligible else seek work
  if (ch.age === 18) {
    if (!enrollUniversity(state)) setJobSearch(state, 'service');
  }
  // if unemployed adult, seek work (service, fallback informal)
  if (ch.age > 18 && ['unemployed'].includes(ch.employmentStatus) && !ch.job) {
    setJobSearch(state, ch.education.degree ? 'professional' : 'service');
  }
  // resolve any draft by serving (default anyway)
  if (ch.pendingDecisions?.some(d=>d.type==='draft')) ch.pendingDecisions.find(d=>d.type==='draft').choice = 'serve';
}

function runLife(opts) {
  const state = newGame(opts);
  let guard = 0;
  while (!state.over && guard++ < 130) { autoPlay(state); stepYear(state); }
  return state;
}

function summarize(name, seedBase, n = 60) {
  const c = COUNTRY_BY_NAME[name];
  let peakNW = 0, sampleAt40 = [], employedYears = 0, deaths = [];
  for (let i = 0; i < n; i++) {
    const s = runLife({ countryId: c.id, seed: seedBase + i * 131 });
    peakNW += Math.max(...(s.character.netWorthHistory.length ? s.character.netWorthHistory : [0]));
    deaths.push(s.character.age);
  }
  console.log(`  ${name.padEnd(14)} avg peak net worth $${Math.round(peakNW / n).toLocaleString()}`);
}

console.log('=== Economy: avg peak net worth (auto-player, urban) ===');
for (const nm of ['Germany', 'United States', 'Japan', 'Nigeria', 'India']) summarize(nm, 1000);

// Modest worker: finish secondary, take a plain service/informal job, no university.
function modestPlay(state) {
  const ch = state.character;
  if (ch.age < 18) setActivities(state, ['studying', 'rest']);
  else setActivities(state, ['rest', 'socializing']);
  if (ch.age >= 18 && !ch.job && ['unemployed'].includes(ch.employmentStatus)) setJobSearch(state, 'service');
  if (ch.pendingDecisions?.some(d=>d.type==='draft')) ch.pendingDecisions.find(d=>d.type==='draft').choice = 'serve';
}
function netWorthAtAge(state, targetAge, play) {
  let g = 0, recorded = null;
  while (!state.over && g++ < 130) {
    play(state); stepYear(state);
    if (state.character.age === targetAge) recorded = netWorth(state.character);
  }
  return recorded;
}
console.log('\n=== Modest worker net worth at age 40 (avg of 40 lives) ===');
for (const [nm, loc] of [['Germany', null], ['United States', null], ['Nigeria', 'The countryside'], ['Nigeria', null]]) {
  const c = COUNTRY_BY_NAME[nm];
  let sum = 0, cnt = 0;
  for (let i = 0; i < 40; i++) {
    const s = newGame({ countryId: c.id, locationName: loc, seed: 300 + i * 97 });
    const nw = netWorthAtAge(s, 40, modestPlay);
    if (nw != null) { sum += nw; cnt++; }
  }
  console.log(`  ${(nm + (loc ? ' (' + loc + ')' : ' (urban)')).padEnd(28)} $${cnt ? Math.round(sum / cnt).toLocaleString() : 'n/a'}`);
}

console.log('\n=== Draft check ===');
for (const [nm, sex, expect] of [['South Korea', 'male', 'draft'], ['South Korea', 'female', 'no draft'],
    ['Costa Rica', 'male', 'no military'], ['Germany', 'male', 'voluntary only']]) {
  const c = COUNTRY_BY_NAME[nm];
  // find if a draft decision ever appears by age 20
  const s = newGame({ countryId: c.id, sex, seed: 55 });
  let sawDraft = false, g = 0;
  while (!s.over && s.character.age < 22 && g++ < 40) {
    { const dd=s.character.pendingDecisions?.find(d=>d.type==='draft'); if(dd){ sawDraft=true; dd.choice='serve'; } }
    setActivities(s, ['studying']); stepYear(s);
  }
  console.log(`  ${nm} ${sex}: hasArmedForces=${c.military.hasArmedForces}, conscription=${c.military.conscription}, sawDraft=${sawDraft} (expect ${expect})`);
}

console.log('\n=== Statement integrity (net = income - tax - expenses) ===');
{
  const c = COUNTRY_BY_NAME['United States'];
  const s = newGame({ countryId: c.id, seed: 9 });
  let g = 0, checked = 0, bad = 0;
  while (!s.over && g++ < 80) {
    autoPlay(s); stepYear(s);
    const st = s.character.lastStatement;
    if (st) {
      const inc = st.income.reduce((a, l) => a + l.amount, 0);
      const exp = st.expenses.reduce((a, l) => a + l.amount, 0);
      const expectedNet = inc - st.tax.incomeTax - st.tax.socialContrib - exp;
      if (Math.abs(expectedNet - st.net) > 0.5) { bad++; if (bad < 4) console.log(`   MISMATCH age ${st.age}: ${expectedNet.toFixed(0)} vs ${st.net.toFixed(0)}`); }
      checked++;
    }
  }
  console.log(`  checked ${checked} statements, ${bad} mismatches`);
}
