import assert from 'node:assert/strict';
import { newGame } from '../src/engine/game.js';
import { COUNTRY_BY_NAME, medianWage } from '../src/engine/countries.js';
import { immigrationOptions, naturalizationStatus } from '../src/engine/immigration.js';
import { makeRng } from '../src/engine/rng.js';
import {
  ensureJudicial, lawProfile, openCivilCase, openCriminalCase, planCrime,
  recordPenalty, resolveAppeal, resolveCivilDecision, resolveJudicialYear,
  resolveLegalDecision,
} from '../src/engine/judicial.js';

console.log('=== Phase 7 judicial and law checks ===');

const sweden=COUNTRY_BY_NAME.Sweden;
const somalia=COUNTRY_BY_NAME.Somalia;
const korea=COUNTRY_BY_NAME['South Korea'];
const russia=COUNTRY_BY_NAME.Russia;
const germany=COUNTRY_BY_NAME.Germany;
assert.equal(sweden.lawTier,'strong');
assert.equal(somalia.lawTier,'weak');
assert.equal(korea.lawTier,'strong');
assert.equal(russia.lawTier,'weak');
assert.equal(lawProfile(sweden).policeRecovery,.60);
assert.equal(lawProfile(somalia).policeRecovery,.10);

function adultLife(country,seed){
  const s=newGame({countryId:country.id,seed});
  s.character.age=30;s.character.employmentStatus='unemployed';
  s.character.money.bank=medianWage(country)*10;
  return s;
}

// Strong-law policing catches substantially more deliberate fraud than weak-law policing.
let strongCaught=0,weakCaught=0;
for(let i=0;i<150;i++){
  for(const [country,key] of [[sweden,'strong'],[somalia,'weak']]){
    const s=adultLife(country,7100+i);
    planCrime(s.character,'fraud');
    resolveJudicialYear(s.character,country,makeRng(9000+i));
    if(s.character.judicial.activeCase){if(key==='strong')strongCaught++;else weakCaught++;}
  }
}
assert(strongCaught>weakCaught+35,`expected stronger detection contrast, got ${strongCaught}/${weakCaught}`);

// A conviction creates a sentence, ten-year record, job penalty, and immigration bar.
const accused=adultLife(sweden,7201),ach=accused.character;
const trial=openCriminalCase(ach,sweden,'fraud',{guilty:true,evidence:.95});
trial.choice='self';
const trialLog=[];
resolveLegalDecision(ach,sweden,{chance:()=>true,next:()=>0},trial,trialLog);
assert.equal(ach.judicial.status,'prison');
assert.equal(ach.employmentStatus,'prison');
assert(ach.judicial.prison.remaining>=4);
assert.equal(ach.judicial.records.length,1);
assert.equal(ach.judicial.barredUntilAge,40);
assert(recordPenalty(ach,'professional')>recordPenalty(ach,'informal'));
const routes=immigrationOptions(ach,accused,germany);
assert.equal(routes.find(r=>r.id==='skilled').eligible,false);
assert.equal(routes.find(r=>r.id==='irregular').eligible,false,'prison blocks even irregular departure');

// Each prison turn is one year and visibly damages health/happiness; a successful appeal releases.
const healthBefore=ach.stats.health,happyBefore=ach.stats.happiness;
resolveJudicialYear(ach,sweden,{chance:()=>false,next:()=>1});
assert.equal(ach.judicial.prison.served,1);
assert.equal(ach.stats.health,healthBefore-3);
assert.equal(ach.stats.happiness,happyBefore-5);
const appeal=ach.pendingDecisions.find(d=>d.type==='legalAppeal');
appeal.choice='appeal';
resolveAppeal(ach,sweden,{chance:()=>true},appeal,[]);
assert.equal(ach.judicial.status,'free');
assert.equal(ach.judicial.records[0].overturned,true);

// Weak-law bribery is available and can dismiss a case, but is deliberately risky.
const bribed=adultLife(somalia,7202),bch=bribed.character;
const weakCase=openCriminalCase(bch,somalia,'smuggling',{guilty:true});
assert(weakCase.options.some(o=>o.id==='bribe'));
weakCase.choice='bribe';
resolveLegalDecision(bch,somalia,{next:()=>.5,chance:()=>false},weakCase,[]);
assert.equal(bch.judicial.status,'free');
assert.equal(bch.judicial.records.length,0);

// Bankruptcy uses the same civil machinery and gives much stronger relief in strong-law systems.
const bankrupt=adultLife(sweden,7203),cch=bankrupt.character;
cch.debts.business=medianWage(sweden)*4;
const civil=openCivilCase(cch,'bankruptcy',cch.debts.business);civil.choice='file';
resolveCivilDecision(cch,sweden,{chance:()=>false},civil,[]);
assert(cch.debts.business<medianWage(sweden),'strong-law bankruptcy discharged most eligible debt');
assert.equal(cch.judicial.activeCase,null);

// A record independently blocks naturalization even after time/language requirements are met.
const migrant=adultLife(sweden,7204).character;
migrant.immigration.residence.status='permanent';
migrant.immigration.residence.years=99;
migrant.judicial.barredUntilAge=migrant.age+5;
assert.equal(naturalizationStatus(migrant).criminalBar,true);
assert.equal(naturalizationStatus(migrant).eligible,false);

// Cases remain plain serializable data.
assert.doesNotThrow(()=>JSON.stringify(ensureJudicial(cch)));
console.log(`Detection contrast: Sweden ${strongCaught}/150, Somalia ${weakCaught}/150.`);
console.log('Phase 7 judicial checks passed.');
