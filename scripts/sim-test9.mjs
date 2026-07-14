import assert from 'node:assert/strict';
import { newGame, serialize, stepYear } from '../src/engine/game.js';
import { exportSaveText, parseSave, restoreEnvelope, SAVE_SCHEMA_VERSION, validateSave } from '../src/engine/saves.js';
import { COUNTRIES, COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { moveCharacter } from '../src/engine/immigration.js';

console.log('=== Phase 9 saves, traceability, and full-life balance checks ===');

// Export/import preserves not only visible state but the exact future RNG sequence.
const original=newGame({countryId:COUNTRY_BY_NAME.Sweden.id,seed:9001,sex:'female'});
for(let i=0;i<12;i++)stepYear(original);
const envelope=parseSave(exportSaveText(original,'Determinism check'));
assert.equal(envelope.schemaVersion,SAVE_SCHEMA_VERSION);
const restored=restoreEnvelope(envelope);
assert.deepEqual(serialize(restored),serialize(original));
stepYear(original);stepYear(restored);
assert.deepEqual(serialize(restored),serialize(original),'restored game follows the identical next year');
assert.throws(()=>parseSave('{bad json'),/valid JSON/);
assert.throws(()=>validateSave({app:"Cheb's Human Atlas",schemaVersion:999,payload:{}}),/newer version/);

// Core traceability contracts: global country coverage and all major state surfaces exist at birth.
assert(COUNTRIES.length>=200,'at least 200 playable country records');
const trace=newGame({countryId:COUNTRY_BY_NAME.Brazil.id,seed:9002}).character;
for(const key of ['stats','skills','money','debts','education','military','health','immigration','judicial','housing','benefits','family'])assert(key in trace,`traceability state: ${key}`);
assert.deepEqual(trace.selectedActivities,[]);
assert.equal(trace.ownsHome,false);

const scenarios=[
  ['Sweden','female','Poor',9100],['United States','male','Middle',9101],['Somalia','female','Destitute',9201],
  ['South Korea','male','Middle',9103],['Brazil','male','Poor',9104],['Nigeria','female','Poor',9200],
];

function scanFinite(value,path='state'){
  if(typeof value==='number')assert(Number.isFinite(value),`${path} is non-finite`);
  else if(Array.isArray(value))value.forEach((v,i)=>scanFinite(v,`${path}[${i}]`));
  else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))if(k!=='rng')scanFinite(v,`${path}.${k}`);
}

const outcomes=[];
for(let i=0;i<scenarios.length;i++){
  const [name,sex,wealthClass,seed]=scenarios[i], country=COUNTRY_BY_NAME[name];
  const s=newGame({countryId:country.id,seed,sex,wealthClass});
  let previousAge=s.character.age, migrated=false, peak=0;
  while(!s.over&&s.character.age<125){
    const ch=s.character;
    if(ch.age>=16){ch.datingIntent=true;ch.childrenIntent='neutral';}
    if(ch.age>=18&&!ch.job&&ch.employmentStatus==='unemployed')ch.jobSearch.sector=ch.skills.academic>35?'professional':'service';
    if(name==='Nigeria'&&ch.age===25&&!migrated){moveCharacter(ch,COUNTRY_BY_NAME.Germany,'skilled',ch.age);migrated=true;}
    stepYear(s);
    assert.equal(s.character.age,previousAge+1,'every click advances exactly one year');previousAge=s.character.age;
    scanFinite(serialize(s));
    const st=s.character.lastStatement;
    if(st){
      const incomeLabels=st.income.map(x=>x.label);
      assert.equal(new Set(incomeLabels).size,incomeLabels.length,`duplicate income at age ${ch.age}`);
      const identity=st.income.reduce((a,x)=>a+x.amount,0)-st.tax.total-st.expenses.reduce((a,x)=>a+x.amount,0);
      assert(Math.abs(identity-st.net)<.02,`statement identity at age ${ch.age}`);
    }
    peak=Math.max(peak,...(ch.netWorthHistory||[0]));
  }
  assert(s.over&&s.character.age>40,`${name} produces a substantial complete life without a progression blocker`);
  outcomes.push(`${name}${migrated?'→Germany':''}: age ${s.character.age}, peak $${Math.round(peak).toLocaleString()}, events ${s.character.eventFeed.length}`);
}
console.log(outcomes.join('\n'));
console.log('Phase 9 checks passed.');
