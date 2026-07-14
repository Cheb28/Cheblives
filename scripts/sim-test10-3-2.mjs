import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { continueAsSuccessor, newGame, stepYear } from '../src/engine/game.js';
import { eligibleBeneficiaries, priorityRelatives, settleEstate, successorCandidates } from '../src/engine/inheritance.js';

console.log('=== Phase 10.3.2 succession, estate, and family-preservation checks ===');
const us=COUNTRY_BY_NAME['United States'];
const relation=(id,kind,ageOffset=30,extra={})=>({id,relation:kind,alive:true,ageOffset,sex:'female',name:id,identity:{birthName:id,currentLegalName:id,givenName:id,familyName:'Atlas'},countryId:us.id,residenceCountryId:us.id,citizenships:[us.id],relationshipScore:75,...extra});

// The nearest family class has exclusive priority; a spouse is the only automatic exception.
{
  const ch=newGame({countryId:us.id,seed:103201}).character;
  ch.family=[relation('child','Child'),relation('sibling','Sibling',0),relation('parent','Mother',-25)];
  assert.deepEqual(priorityRelatives(ch).map(x=>x.id),['child']);
  ch.spouse=relation('spouse','Spouse',0);assert.deepEqual(eligibleBeneficiaries(ch).map(x=>x.id),['spouse','child']);
  ch.will={written:true,shares:{sibling:100,child:0}};assert(!settleEstate(ch,us).shares.some(x=>x.id==='sibling'),'a will cannot bypass a living child');
  ch.family.find(x=>x.id==='child').alive=false;ch.family[0].grandchildren=[relation('grandchild','Grandchild',55)];
  assert.deepEqual(priorityRelatives(ch).map(x=>x.id),['grandchild']);
  ch.family[0].grandchildren[0].alive=false;assert.deepEqual(priorityRelatives(ch).map(x=>x.id),['sibling']);
}

// Every debt and final cost reduces the taxable estate.
{
  const ch=newGame({countryId:us.id,seed:103202}).character;ch.family=[relation('child','Child')];
  ch.money={cash:10000,bank:300000,household:40000};ch.debts={studentLoan:10000,mortgage:20000,business:30000,personalLoan:40000,creditCard:50000,tax:60000};ch.judicial.finesOwed=70000;
  const estate=settleEstate(ch,us),expectedDebt=280000;
  assert.equal(estate.assets,350000);assert.equal(estate.debts,expectedDebt);assert(estate.funeralCost>0);assert.equal(estate.gross,estate.assets-estate.debts-estate.funeralCost);
}

// A continued child keeps their established life and receives inheritance on top of savings.
{
  const state=newGame({countryId:us.id,seed:103203}),ch=state.character;ch.age=70;ch.money.bank=200000;
  const grandchild=relation('grandchild','Grandchild',55,{sex:'male',stats:{...ch.stats},experience:structuredClone(ch.experience),credentials:['Secondary diploma'],grandchildren:[]});
  const child=relation('child','Child',35,{stats:{...ch.stats},experience:structuredClone(ch.experience),credentials:['Secondary diploma',"Bachelor's degree"],educationPerformance:82,personalSavings:25000,finances:{employmentStatus:'employed',sector:'professional',occupation:'Accountant',yearsWorked:12,personalSavings:25000},healthConditions:['Asthma'],languages:{English:{level:100}},nativeLanguages:['English'],partnerStatus:'married',spouse:relation('child-spouse','Spouse',32,{sex:'male'}),grandchildren:[grandchild],housing:{tenure:'private'},debts:{personalLoan:5000},careerHistory:[{age:25,type:'hired',title:'Accountant'}]});
  ch.family.push(child);state.over=true;state.estate=settleEstate(ch,us);const share=state.estate.shares.find(x=>x.id==='child').amount,next=continueAsSuccessor(state,'child'),heir=next.character;
  assert.equal(heir.money.bank,25000+share);assert(heir.spouse&&heir.relationshipStatus==='married');assert(heir.family.some(x=>x.id==='grandchild'&&x.relation==='Child'));assert(heir.health.conditions.some(x=>x.name==='Asthma'));assert(heir.job);assert.equal(heir.debts.personalLoan,5000);assert.equal(heir.languages.English.level,100);assert.equal(next.successionNumber,2);assert.equal(next.dynastyHistory.length,1);
}

// Sibling and cousin branches are playable only after closer classes are absent.
for(const [kind,id,family] of [
  ['sibling','sib',[relation('sib','Sibling',2,{stats:{health:70,happiness:60,intelligence:55,fitness:50,charisma:50}})]],
  ['cousin','cousin',[relation('cousin','Cousin',0,{stats:{health:70,happiness:60,intelligence:55,fitness:50,charisma:50}})]],
]){
  const state=newGame({countryId:us.id,seed:id==='sib'?103204:103205}),ch=state.character;ch.age=60;ch.family=family;ch.money.bank=50000;state.over=true;state.estate=settleEstate(ch,us);
  assert.equal(successorCandidates(ch)[0].kind,kind);const next=continueAsSuccessor(state,id);assert(next&&!next.over);assert.equal(next.successionNumber,2);assert.equal(next.generation,1,'same-generation branch switches do not invent a new biological generation');
}

// Three real mortality resolutions, two inheritances, and no manual restoration of Generation 2's child.
{
  let state=newGame({countryId:us.id,seed:103206,wealthClass:'Rich'}),deaths=0,inheritances=0;
  const c1=state.character;c1.age=90;c1.money.bank=300000;
  const c3=relation('third','Grandchild',70,{sex:'male',stats:{...c1.stats},experience:structuredClone(c1.experience),credentials:['Secondary diploma'],grandchildren:[]});
  c1.family.push(relation('second','Child',40,{stats:{...c1.stats},experience:structuredClone(c1.experience),credentials:['Secondary diploma'],personalSavings:15000,finances:{personalSavings:15000},grandchildren:[c3]}));
  const die=s=>{s.character.age=105;s.character.stats.health=1;let turns=0;while(!s.over&&turns++<40)stepYear(s);assert(s.over);deaths++;};
  die(state);state=continueAsSuccessor(state,'second');assert(state);inheritances++;assert(state.character.family.some(x=>x.id==='third'&&x.relation==='Child'));
  state.character.family.find(x=>x.id==='third').ageOffset=75;die(state);state=continueAsSuccessor(state,'third');assert(state);inheritances++;
  state.character.family=state.character.family.filter(x=>!['Child','Grandchild'].includes(x.relation));state.character.spouse=null;die(state);
  assert.equal(deaths,3);assert.equal(inheritances,2);assert.equal(state.successionNumber,3);assert.equal(state.estate.successors.length,0);assert(state.estate.escheat>=0);
}

const lawSource=readFileSync(new URL('../src/ui/tabs/Law.jsx',import.meta.url),'utf8'),summarySource=readFileSync(new URL('../src/ui/LifeSummary.jsx',import.meta.url),'utf8');
assert(!/charit(y|able)/i.test(lawSource),'charitable wills remain deferred to the Religion phase');assert(summarySource.includes('No playable family successor remains'));
console.log('Phase 10.3.2 checks passed.');
