import assert from 'node:assert/strict';
import { newGame, serialize, deserialize, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { resolveHouseholdEconomy } from '../src/engine/household.js';
import { makeRng } from '../src/engine/rng.js';

console.log('=== Phase 10.1.1 household economy and family healthcare checks ===');
const us=COUNTRY_BY_NAME['United States'],somalia=COUNTRY_BY_NAME.Somalia;

const birth=newGame({countryId:us.id,seed:101110,wealthClass:'Middle'});
assert(birth.character.family.every(p=>p.finances&&p.health),'family jobs, savings, and health exist from birth');
assert(birth.character.family.filter(p=>['Father','Mother'].includes(p.relation)).every(p=>p.finances.employmentStatus),'parents receive employment states');

// Dependent household statements now contain provider earnings and real family living costs.
for(const p of birth.character.family.filter(p=>['Father','Mother'].includes(p.relation))){p.finances.employmentStatus='employed';p.finances.sector='service';p.finances.occupation='Service worker';p.finances.wageMult=.9;p.working=true;}
stepYear(birth);
const st=birth.character.lastStatement;
assert(st.income.some(x=>x.household&&x.label.includes('Service worker')),'parent earnings enter the household statement');
assert(st.expenses.some(x=>x.household&&x.label==='Birth-family living costs'),'dependent family has living expenses');
const identity=st.income.reduce((s,x)=>s+x.amount,0)-st.tax.total-st.expenses.reduce((s,x)=>s+x.amount,0);
assert(Math.abs(identity-st.net)<.02,'expanded household statement still balances');

const sickChild=newGame({countryId:us.id,seed:1,wealthClass:'Poor'});sickChild.character.health.conditions=[{id:'asthma',name:'Asthma',chronic:true,severity:2,years:0,controlled:false,decay:1,mgmtCost:.08,mortalityRisk:.1}];sickChild.character.health.healthPolicy='always';
stepYear(sickChild);
const childMedical=sickChild.character.lastStatement.expenses.find(x=>x.label==='Medical costs');
assert(childMedical?.household,'the player child medical bill is paid and recorded by the parent household');
assert(sickChild.character.householdFinance.familyGrossIncome>0,'actual parent income is available to childhood healthcare');

// With coverage and money, a family member's chronic condition is treated and billed to the household.
const care=newGame({countryId:us.id,seed:101111,wealthClass:'Rich'}).character;care.age=10;care.money.household=500000;
const father=care.family.find(p=>p.relation==='Father');father.health.conditions=[{name:'Asthma',severity:2,chronic:true,controlled:false}];
const guaranteedCoverage={...us,healthTier:5,healthcareArchetype:'universal-insurance'};
const treated=resolveHouseholdEconomy(care,guaranteedCoverage,makeRng(101112));
assert.equal(father.health.lastYear.treated,true);
assert(treated.expenses.some(x=>x.label.includes('medical care')&&x.household),'family care is charged to household finances');
assert(treated.expenses.some(x=>x.label.includes('health coverage')),'family coverage premiums are modeled');

// With no household income, savings, coverage, or welfare, care can remain unmet for financial reasons.
const poor=newGame({countryId:somalia.id,seed:101113,wealthClass:'Destitute'}).character;poor.age=10;poor.money={cash:0,bank:0,household:0};
for(const p of poor.family){if(['Father','Mother'].includes(p.relation)){p.ageOffset=-70;p.finances.employmentStatus='retired';p.health.conditions=[];}else p.alive=false;}
const poorFather=poor.family.find(p=>p.relation==='Father');poorFather.health.conditions=[{name:'Chronic respiratory disease',severity:3,chronic:true,controlled:false}];
const untreated=resolveHouseholdEconomy(poor,somalia,makeRng(101114));
assert.equal(poorFather.health.lastYear.treated,false);
assert.match(poorFather.health.lastYear.status,/unaffordable/);
assert(untreated.summary.unmetCare>0,'unaffordable family care is visible in the household summary');

const grown=newGame({countryId:us.id,seed:101115}).character;grown.age=18;grown.money.household=100000;grown.money.bank=0;
resolveHouseholdEconomy(grown,us,makeRng(101116));
assert.equal(grown.money.household,0,'parents household fund does not become the adult player household fund');
assert(grown.familyOriginFinance.retainedFund>grown.familyOriginFinance.launchGift,'parents retain the family-of-origin fund and may provide a limited launch gift');
assert(!grown.householdFinance.members.some(id=>grown.family.find(p=>p.id===id&&['Father','Mother'].includes(p.relation))),'adult parents are not automatic financial dependants');

const restored=deserialize(serialize(birth));
assert.deepEqual(restored.character.householdFinance,birth.character.householdFinance);
assert(restored.character.family.every(p=>p.finances?.lastYear&&p.health?.lastYear),'family financial and treatment histories survive saves');

console.log('Phase 10.1.1 checks passed.');
