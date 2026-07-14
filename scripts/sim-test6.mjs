import assert from 'node:assert/strict';
import { newGame, stepYear } from '../src/engine/game.js';
import { COUNTRY_BY_NAME, medianWage } from '../src/engine/countries.js';
import { immigrationOptions, submitMigration, naturalizationStatus, naturalize, pppConversionFactor, moveCharacter, tickTemporaryVisa, resolveVisaExpiry, visaWorkFraction, tickNationalityObligation, resolveNationalityChoice } from '../src/engine/immigration.js';
import { eligibleSectors, wageFor } from '../src/engine/jobs.js';
import { setPartTimeWork } from '../src/engine/actions.js';
import { applyActivities } from '../src/engine/activities.js';
import { calledUp, callUpRateFor, chooseServe, draftDue, serviceYearsFor } from '../src/engine/military.js';

console.log('=== Phase 6 immigration and world checks ===');

const nigeria = COUNTRY_BY_NAME.Nigeria;
const germany = COUNTRY_BY_NAME.Germany;
const us = COUNTRY_BY_NAME['United States'];
const poland = COUNTRY_BY_NAME.Poland;
const australia = COUNTRY_BY_NAME.Australia;
const nz = COUNTRY_BY_NAME['New Zealand'];
const argentina = COUNTRY_BY_NAME.Argentina;
const brazil = COUNTRY_BY_NAME.Brazil;
const italy = COUNTRY_BY_NAME.Italy;
const japan = COUNTRY_BY_NAME.Japan;
const korea = COUNTRY_BY_NAME['South Korea'];
const israel = COUNTRY_BY_NAME.Israel;
const norway = COUNTRY_BY_NAME.Norway;
const northKorea = COUNTRY_BY_NAME['North Korea'];
const switzerland = COUNTRY_BY_NAME.Switzerland;
const givePassport=ch=>ch.transportation.documents.passports.push({countryId:ch.immigration.citizenships[0],issuedAge:ch.age,expiresAge:ch.age+10});

// Nigerian graduate -> skilled route to Germany -> naturalization after real data countdown.
const skilled = newGame({ countryId:nigeria.id, seed:6101, wealthClass:'Middle' });
Object.assign(skilled.character,{age:22,employmentStatus:'unemployed'});
skilled.character.education.degree=true;
skilled.character.education.stage='graduated';
skilled.character.experience.sectors.professional=2;
skilled.character.education.performance=75;
skilled.character.money.bank=medianWage(nigeria)*20;
givePassport(skilled.character);
let routes=immigrationOptions(skilled.character,skilled,germany);
assert.equal(routes.find(r=>r.id==='skilled').eligible,true,'qualified Nigerian graduate can use German skilled route');
const oldBank=skilled.character.money.bank;
assert.equal(submitMigration(skilled,germany.id,'skilled').ok,true);
stepYear(skilled);
assert.equal(skilled.character.countryId,germany.id);
skilled.character.languages.German=60;
assert(pppConversionFactor(nigeria,germany)<1,'moving to richer economy reduces portable PPP purchasing power');
assert(skilled.character.money.bank<oldBank,'fees and PPP conversion reduce destination purchasing power');
for(let i=0;i<germany.citizenship.naturalizationYears;i++)stepYear(skilled);
assert.equal(naturalizationStatus(skilled.character).eligible,true);
assert.equal(naturalize(skilled.character),true);
assert(skilled.character.immigration.citizenships.includes(germany.id));

// Polish citizen -> Germany through EU freedom of movement immediately.
const treaty=newGame({countryId:poland.id,seed:6102,wealthClass:'Middle'});
treaty.character.age=25;treaty.character.employmentStatus='unemployed';treaty.character.money.bank=medianWage(poland)*3;
givePassport(treaty.character);
routes=immigrationOptions(treaty.character,treaty,germany);
assert.equal(routes.find(r=>r.id==='treaty').eligible,true);
const treatyResult=submitMigration(treaty,germany.id,'treaty');
assert.equal(treatyResult.immediate,true);
assert.equal(treaty.character.countryId,germany.id);

// Unskilled Nigerian has no modeled legal route to the US, but sees irregular entry risks.
const unskilled=newGame({countryId:nigeria.id,seed:6103,wealthClass:'Poor'});
unskilled.character.age=25;unskilled.character.employmentStatus='unemployed';unskilled.character.money.bank=medianWage(nigeria)*8;
routes=immigrationOptions(unskilled.character,unskilled,us);
for(const id of ['treaty','skilled','student','golden','family','asylum'])assert.equal(routes.find(r=>r.id===id).eligible,false,`${id} should be closed`);
assert.equal(routes.find(r=>r.id==='irregular').eligible,true);
assert.match(routes.find(r=>r.id==='irregular').reason,/death risk.*robbery risk.*deportation/i);

// Conflict/persecution unlocks asylum.
unskilled.character.immigration.asylumEligibleUntil=unskilled.year+5;
assert.equal(immigrationOptions(unskilled.character,unskilled,germany).find(r=>r.id==='asylum').eligible,true);

// Irregular residents can only access informal jobs and receive a first-year language wage penalty.
const irregular=newGame({countryId:nigeria.id,seed:6104,wealthClass:'Middle'});
irregular.character.age=25;irregular.character.employmentStatus='unemployed';irregular.character.money.bank=medianWage(nigeria)*20;
moveCharacter(irregular.character,us,'irregular',25,{irregular:true});
assert.deepEqual(eligibleSectors(irregular.character).map(s=>s.key),['informal']);
irregular.character.job={sector:'informal',rung:0,yearsAtRung:0};
irregular.character.languages={};
const penalized=wageFor(us,irregular.character.job,irregular.character);
irregular.character.languages.English=60;
assert(Math.abs(penalized/wageFor(us,irregular.character.job,irregular.character)-0.75)<0.001);

console.log(`Skilled migration: Nigeria → Germany; naturalized after ${germany.citizenship.naturalizationYears} qualifying years.`);
// Temporary visas expose their limits, expire after real one-year turns, and
// preserve a genuine player choice between returning, renewing, and overstaying.
const holiday=newGame({countryId:us.id,seed:6105,wealthClass:'Middle'});
holiday.character.age=25;holiday.character.employmentStatus='unemployed';holiday.character.money.bank=medianWage(us)*10;
givePassport(holiday.character);
assert.equal(immigrationOptions(holiday.character,holiday,nz).find(r=>r.id==='working_holiday').eligible,true);
moveCharacter(holiday.character,nz,'working_holiday',25,{});
assert.equal(holiday.character.immigration.residence.visa.yearsRemaining,1);
assert.equal(holiday.character.immigration.residence.visa.temporaryJobsOnly,true);
assert.equal(holiday.character.jobSearch.sector,'informal','first working-holiday year includes a destination job search');
const expiry=tickTemporaryVisa(holiday.character);
assert.equal(expiry.type,'visaExpiry');
assert.equal(expiry.default,'return');
resolveVisaExpiry(holiday.character,holiday,{chance:()=>false},{...expiry,choice:'overstay'},[]);
assert.equal(holiday.character.immigration.residence.status,'irregular');
assert.equal(holiday.character.immigration.barredUntilAge,32,'strong-law NZ applies a seven-year legal-application bar');
assert.equal(holiday.character.partTimeWork,false);

const lawfulReturn=newGame({countryId:us.id,seed:6106,wealthClass:'Middle'});
lawfulReturn.character.age=25;lawfulReturn.character.money.bank=medianWage(us)*10;
moveCharacter(lawfulReturn.character,nz,'working_holiday',25,{});
const returnDecision=tickTemporaryVisa(lawfulReturn.character);
resolveVisaExpiry(lawfulReturn.character,lawfulReturn,{chance:()=>false},returnDecision,[]);
assert.equal(lawfulReturn.character.countryId,us.id,'default visa-expiry action returns to a citizenship country');
assert.equal(lawfulReturn.character.immigration.residence.status,'citizen');

const student=newGame({countryId:us.id,seed:6107,wealthClass:'Middle'});
student.character.age=20;student.character.money.bank=medianWage(us)*10;
moveCharacter(student.character,australia,'student',20,{student:true});
assert.equal(visaWorkFraction(student.character),.60,'Australia student work cap is modeled as 24 hours/week equivalent');
assert.equal(setPartTimeWork(student,true),true,'adult foreign students can choose permitted part-time work');
assert.equal(student.character.partTimeWork,true);

const sponsored=newGame({countryId:us.id,seed:6108,wealthClass:'Middle'});
sponsored.character.age=28;sponsored.character.experience.sectors.industrial=4;
moveCharacter(sponsored.character,germany,'temporary_work',28,{});
assert.equal(sponsored.character.immigration.residence.visa.employerTied,true);
assert.equal(sponsored.character.immigration.residence.visa.countsForResidency,false);
assert.equal(sponsored.character.jobSearch.sector,'industrial');

// South American residence agreements are not mislabeled as unconditional
// freedom of movement: they grant two-year work/residence status first.
const mercosur=newGame({countryId:argentina.id,seed:6109,wealthClass:'Middle'});
mercosur.character.age=25;mercosur.character.money.bank=medianWage(argentina)*10;
givePassport(mercosur.character);
const brazilRoutes=immigrationOptions(mercosur.character,mercosur,brazil);
assert.equal(brazilRoutes.find(r=>r.id==='treaty').eligible,false);
assert.equal(brazilRoutes.find(r=>r.id==='regional_residence').eligible,true);
assert.match(brazilRoutes.find(r=>r.id==='regional_residence').reason,/MERCOSUR.*two years/i);
assert.equal(submitMigration(mercosur,brazil.id,'regional_residence').immediate,true);
assert.equal(mercosur.character.immigration.residence.visa.yearsRemaining,2);

// Italy-Japan working holiday entered force in 2026.
const italyJapan=newGame({countryId:italy.id,seed:6110,wealthClass:'Middle'});
italyJapan.character.age=25;italyJapan.character.money.bank=medianWage(italy)*10;
givePassport(italyJapan.character);
assert.equal(immigrationOptions(italyJapan.character,italyJapan,japan).find(r=>r.id==='working_holiday').eligible,true);

// Australian specified regional work unlocks year two and then year three.
const australiaWh=newGame({countryId:us.id,seed:6111,wealthClass:'Middle'});
australiaWh.character.age=25;australiaWh.character.money.bank=medianWage(us)*10;
moveCharacter(australiaWh.character,australia,'working_holiday',25,{});
assert.equal(australiaWh.character.immigration.residence.visa.studyMonthLimit,4);
applyActivities(australiaWh.character,australia,australiaWh.rng,['regional_work']);
assert.equal(australiaWh.character.immigration.residence.visa.regionalWorkMonths,3);
let auExpiry=tickTemporaryVisa(australiaWh.character);
assert(auExpiry.options.some(o=>o.id==='renew'));
resolveVisaExpiry(australiaWh.character,australiaWh,{chance:()=>true},{...auExpiry,choice:'renew'},[]);
assert.equal(australiaWh.character.immigration.residence.visa.renewals,1);
applyActivities(australiaWh.character,australia,australiaWh.rng,['regional_work']);
assert.equal(australiaWh.character.immigration.residence.visa.regionalWorkMonths,6);
auExpiry=tickTemporaryVisa(australiaWh.character);
resolveVisaExpiry(australiaWh.character,australiaWh,{chance:()=>true},{...auExpiry,choice:'renew'},[]);
assert.equal(australiaWh.character.immigration.residence.visa.renewals,2);

// Language is a real naturalization gate in modeled destinations.
const languageGate=newGame({countryId:us.id,seed:6112,wealthClass:'Middle'});
languageGate.character.age=30;languageGate.character.money.bank=medianWage(us)*10;
moveCharacter(languageGate.character,germany,'skilled',30,{});
languageGate.character.immigration.residence.years=germany.citizenship.naturalizationYears;
assert.equal(naturalizationStatus(languageGate.character).languageMet,false);
languageGate.character.languages.German=60;
assert.equal(naturalizationStatus(languageGate.character).eligible,true);

// Non-dual naturalization replaces the old passport, and nationality-choice
// obligations can remove Japan/Korea citizenship if their deadline is missed.
const singleCitizenship=newGame({countryId:us.id,seed:6113,wealthClass:'Middle'});
singleCitizenship.character.age=30;singleCitizenship.character.money.bank=medianWage(us)*10;
moveCharacter(singleCitizenship.character,japan,'skilled',30,{});
singleCitizenship.character.languages.Japanese=60;
singleCitizenship.character.immigration.residence.years=japan.citizenship.naturalizationYears;
assert.equal(naturalize(singleCitizenship.character),true);
assert.deepEqual(singleCitizenship.character.immigration.citizenships,[japan.id]);

const japanDual=newGame({countryId:us.id,seed:6114,wealthClass:'Middle'});
japanDual.character.age=20;japanDual.character.immigration.citizenships=[us.id,japan.id];
const japanChoice=tickNationalityObligation(japanDual.character);
resolveNationalityChoice(japanDual.character,{chance:()=>true},japanChoice,[]);
assert(!japanDual.character.immigration.citizenships.includes(japan.id));
const koreaDual=newGame({countryId:us.id,seed:6115,wealthClass:'Middle'});
koreaDual.character.age=22;koreaDual.character.immigration.citizenships=[us.id,korea.id];koreaDual.character.immigration.koreanMilitaryChoiceMade=true;
const koreaChoice=tickNationalityObligation(koreaDual.character);
resolveNationalityChoice(koreaDual.character,{chance:()=>false},{...koreaChoice,choice:'pledge'},[]);
assert.equal(koreaDual.character.immigration.citizenships.length,2);

// Sex-specific terms round partial years upward, and Norway selects from both
// sexes rather than drafting every eligible citizen.
const termCharacter={sex:'male'};
assert.equal(serviceYearsFor(termCharacter,israel),3);
termCharacter.sex='female';assert.equal(serviceYearsFor(termCharacter,israel),2);
termCharacter.sex='male';assert.equal(serviceYearsFor(termCharacter,northKorea),10);
termCharacter.sex='female';assert.equal(serviceYearsFor(termCharacter,northKorea),7);
assert.equal(serviceYearsFor(termCharacter,norway),1);
assert.equal(serviceYearsFor(termCharacter,switzerland),1,'sub-year obligations round to one game year');
assert.equal(calledUp(termCharacter,norway,{chance:()=>false}),false);

// Mandatory liability is distinct from actual quota/lottery intake.
const thailand=COUNTRY_BY_NAME.Thailand;
const russia=COUNTRY_BY_NAME.Russia;
const mexico=COUNTRY_BY_NAME.Mexico;
const denmark=COUNTRY_BY_NAME.Denmark;
assert.equal(callUpRateFor(brazil),0.10);
assert.equal(callUpRateFor(thailand),0.20);
assert.equal(callUpRateFor(russia),0.35);
assert.equal(callUpRateFor(mexico),0.25);
assert.equal(callUpRateFor(denmark),0.25);
assert.equal(thailand.military.serviceAge,21);
assert.equal(thailand.military.callUpEndAge,29);
assert.equal(russia.military.callUpEndAge,30);
assert.equal(serviceYearsFor({sex:'male'},thailand),2);
assert.equal(thailand.military.womenConscripted,false);
assert.equal(mexico.military.womenConscripted,false);
assert.equal(russia.military.repeatCallUp,true,'Russia remains eligible after a missed annual quota');

// An overseas-born Korean male can renounce at the age-18 deadline or retain
// citizenship with deferment; returning to reside in Korea reactivates draft eligibility.
const overseasKorean=newGame({countryId:us.id,seed:6116,wealthClass:'Middle'});
overseasKorean.character.sex='male';overseasKorean.character.age=18;
overseasKorean.character.immigration.citizenships=[us.id,korea.id];
const koreanDeadline=tickNationalityObligation(overseasKorean.character);
assert.equal(koreanDeadline.koreanMilitaryDeadline,true);
resolveNationalityChoice(overseasKorean.character,{chance:()=>false},{...koreanDeadline,choice:'retain_korean'},[]);
assert.equal(overseasKorean.character.immigration.koreanMilitaryDeferred,true);
overseasKorean.character.age=20;moveCharacter(overseasKorean.character,korea,'family',20,{});
assert.equal(overseasKorean.character.immigration.koreanMilitaryDeferred,false);
assert.equal(draftDue(overseasKorean.character,korea),true);
chooseServe(overseasKorean.character,korea);
assert.equal(overseasKorean.character.military.remaining,2,'South Korean 1.6-year term rounds to two yearly turns');

let multinationalFamilies=0;
for(let seed=6200;seed<6400;seed++){
  const life=newGame({countryId:us.id,seed});
  if(life.character.family.some(p=>['Father','Mother'].includes(p.relation)&&p.countryId!==us.id))multinationalFamilies++;
}
assert(multinationalFamilies>0&&multinationalFamilies<20,'multinational birth families remain rare but possible');

console.log('Treaty, regional-residence, working-holiday renewal, nationality, language, temporary-visa, work-limit, expiry-choice, and PPP checks passed.');
