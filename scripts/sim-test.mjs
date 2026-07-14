// Engine smoke + calibration test (run: node scripts/sim-test.mjs)
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';

function runLife(opts) {
  const state = newGame(opts);
  let guard = 0;
  while (!state.over && guard++ < 130) stepYear(state);
  return state.character;
}

function median(arr) { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }

console.log('=== Mortality calibration (median death age vs life expectancy) ===');
for (const name of ['United States', 'Germany', 'Nigeria', 'South Korea', 'Monaco', 'Japan', 'India']) {
  const c = COUNTRY_BY_NAME[name];
  const deaths = [];
  for (let i = 0; i < 400; i++) {
    const ch = runLife({ countryId: c.id, seed: i * 7919 + 1 });
    deaths.push(ch.age);
  }
  const med = median(deaths);
  const le = c.lifeExpectancy;
  const diff = med - le;
  const flag = Math.abs(diff) <= 8 ? 'ok ' : 'XX ';
  console.log(`  ${flag} ${name.padEnd(14)} median death ${String(med).padStart(3)}  LE ${le}  (diff ${diff.toFixed(1)})`);
}

console.log('\n=== Born-anywhere skew (200 rolls, top regions) ===');
{
  const regionCounts = {};
  for (let i = 0; i < 200; i++) {
    const ch = runLife({ seed: i * 104729 + 3, mode: 'random' });
    const c = COUNTRY_BY_NAME[ch.countryName];
    regionCounts[c.region] = (regionCounts[c.region] || 0) + 1;
  }
  const sorted = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
  for (const [r, n] of sorted) console.log(`  ${String(n).padStart(3)}  ${r}`);
}

console.log('\n=== NaN/undefined scan (5 sample characters) ===');
{
  let bad = 0;
  for (const name of ['United States', 'Nigeria', 'Monaco', 'West Bank', 'Tuvalu?']) {
    const c = COUNTRY_BY_NAME[name];
    const ch = c ? runLife({ countryId: c.id, seed: 42 }) : runLife({ seed: 42 });
    const check = (o, path = '') => {
      for (const [k, v] of Object.entries(o)) {
        if (v == null && k !== 'causeOfDeath' && k !== 'name') { console.log(`  bad ${path}${k}=`, v); bad++; }
        else if (typeof v === 'number' && Number.isNaN(v)) { console.log(`  NaN ${path}${k}`); bad++; }
        else if (v && typeof v === 'object' && !Array.isArray(v)) check(v, path + k + '.');
      }
    };
    check(ch.stats, `${ch.countryName}.stats.`);
    check(ch.skills, `${ch.countryName}.skills.`);
  }
  console.log(bad === 0 ? '  no NaN/undefined in stats/skills' : `  ${bad} issues`);
}
