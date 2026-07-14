import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRY_BY_NAME, medianWage } from '../src/engine/countries.js';
import { newGame, stepYear } from '../src/engine/game.js';
import { buyHome, setJobSearch } from '../src/engine/actions.js';
import { careerOptions, attemptHire, resolveEmployment, SECTORS } from '../src/engine/jobs.js';
import { resolveBusiness } from '../src/engine/business.js';
import { resolveEducation, enroll } from '../src/engine/education.js';
import { makeRng } from '../src/engine/rng.js';

console.log('=== Phase 10.3.1 life corrections, careers, and organization checks ===');
const us=COUNTRY_BY_NAME['United States'];

// Honest separate filers must never be treated as tax evaders merely because a spouse earns money.
const honest=newGame({countryId:us.id,seed:103101,wealthClass:'Rich'});const hc=honest.character;
hc.age=30;hc.education.stage='secondary_done';hc.employmentStatus='employed';hc.job={sector:'office_admin',rung:0,yearsAtRung:0};
hc.spouse={id:'spouse-tax',relation:'Spouse',alive:true,working:true,wageMult:1.5,relationshipScore:80,finances:{personalSavings:0}};
hc.financial.tax.filingChoice='individual';hc.financial.tax.compliance='honest';
for(let i=0;i<15&&hc.alive;i++)stepYear(honest);
assert(!hc.judicial?.history?.some(x=>x.offenseId==='tax_evasion'||x.label==='Tax evasion'),'honest separate filing cannot create a tax-evasion case');

// Business growth must remain bounded and distinguish owner cash from retained value.
const owner=newGame({countryId:us.id,seed:103102,wealthClass:'Rich'}).character;owner.age=30;
owner.business={type:'registered',capital:medianWage(us)*5,employees:2,loan:0,lastProfit:0};
let largest=owner.business.capital;
for(let i=0;i<60&&owner.business;i++){const result=resolveBusiness(owner,us,makeRng(2000+i));assert(Number.isFinite(result.income)&&Number.isFinite(result.valueChange));largest=Math.max(largest,owner.business?.capital||0);}
assert(largest<medianWage(us)*1e5,'business value cannot grow exponentially beyond the simulation economy');

// Full-time education pauses for service and cannot simultaneously seek a civilian career.
const student=newGame({countryId:us.id,seed:103103}).character;student.age=20;student.education.stage='university';student.education.enrolled=true;student.education.yearsRemaining=3;student.employmentStatus='student';
const before=student.education.yearsRemaining;student.military.status='serving';student.military.remaining=1;
resolveEducation(student,us,makeRng(3));assert.equal(student.education.yearsRemaining,before);assert.equal(student.education.paused,true);
const studentState={character:student};assert.equal(setJobSearch(studentState,'office_admin'),false,'full-time students cannot apply for regular careers');

// Mortgage terms should amortize and finish instead of surviving indefinitely.
const buyer=newGame({countryId:us.id,seed:103104,wealthClass:'Rich'});const bc=buyer.character;bc.age=25;bc.employmentStatus='unemployed';bc.money.bank=medianWage(us)*30;
assert(buyHome(buyer));assert(bc.mortgage?.remainingYears>0);const term=bc.mortgage.remainingYears;
for(let i=0;i<term+2&&bc.alive;i++){bc.money.household+=medianWage(us)*5;stepYear(buyer);}
assert((bc.debts.mortgage||0)<1||!bc.alive,'a funded mortgage clears by its scheduled term');

// All approved career families are offered, including the transportation expansion; religion remains separate.
const worker=newGame({countryId:us.id,seed:103105}).character;worker.age=30;worker.education.stage='secondary_done';worker.education.degree="Bachelor's degree";worker.education.vocational=true;worker.employmentStatus='unemployed';
const options=careerOptions(worker,us),labels=options.map(x=>x.label);
assert.equal(options.length,17);assert(!labels.some(x=>/relig/i.test(x)));
for(const expected of ['Agriculture','Construction','Healthcare','Technology','Government & Civil Service','Law','Media & Creative'])assert(labels.includes(expected));
for(const expected of ['Local Transportation & Delivery','Trucking & Logistics','Rail & Public Transit','Aviation & Maritime'])assert(labels.includes(expected));
const hired=attemptHire(worker,us,'technology',{chance:()=>true},{});assert(hired.hired);assert(worker.careerHistory.some(x=>x.type==='hired'));
worker.job.yearsAtRung=20;worker.experience.sectors.technology=20;let rolls=0;resolveEmployment(worker,us,{chance:()=>++rolls>=3,int:()=>2});assert(worker.careerHistory.some(x=>x.type==='promoted'));
assert(Object.keys(SECTORS).length>=17);

// Social circles remain human-sized even after years of actively meeting people.
const social=newGame({countryId:us.id,seed:103106});social.character.age=12;social.character.selectedActivities=['social'];
for(let i=0;i<55&&social.character.alive;i++){social.character.social.friendIntent=true;stepYear(social);}
assert((social.character.social.friends||[]).filter(f=>f.alive&&!f.ended&&f.circle==='close').length<=6);

const financeSource=readFileSync(new URL('../src/ui/tabs/Finances.jsx',import.meta.url),'utf8');
const careerSource=readFileSync(new URL('../src/ui/tabs/Career.jsx',import.meta.url),'utf8');
for(const label of ['Summary','Accounts','Debt & Credit','Assets & Goals','Taxes','Statements'])assert(financeSource.includes(label));
for(const label of ['Current','Find Work','History','Qualifications'])assert(careerSource.includes(label));

// Ten complete lives exercise annual integration, career entry, finances, mortality, and friendships.
const lifeCountries=['United States','Nigeria','Germany','Brazil','India','Japan','South Korea','Sweden','Pakistan','Australia'];
for(let index=0;index<lifeCountries.length;index++){
  const country=COUNTRY_BY_NAME[lifeCountries[index]],life=newGame({countryId:country.id,seed:103200+index});
  let turns=0;
  while(life.character.alive&&turns++<130){
    const person=life.character;
    person.selectedActivities=person.age>=6?['social']:[];
    if(person.age>=16&&!person.job&&!person.education?.enrolled&&!['serving','career','prison'].includes(person.military.status))setJobSearch(life,person.age<19?'agriculture':'retail_hospitality');
    if(person.age>=12&&turns%4===0)person.social.friendIntent=true;
    stepYear(life);
    assert(Number.isFinite(person.money.bank)&&Number.isFinite(person.money.household));
    assert((person.social.friends||[]).filter(f=>f.alive&&!f.ended&&f.circle==='close').length<=6);
  }
  assert(!life.character.alive,`${country.name} test life should reach a modeled death`);
}
console.log('Phase 10.3.1 checks passed.');
