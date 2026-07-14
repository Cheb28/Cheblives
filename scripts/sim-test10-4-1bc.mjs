import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRY_BY_NAME, medianWage } from '../src/engine/countries.js';
import { newGame } from '../src/engine/game.js';
import { immigrationOptions } from '../src/engine/immigration.js';
import { setChildrenIntent, setContraception } from '../src/engine/actions.js';
import { activityContext, adultLawProfile, maternalTransmissionRisk, resolveAdultLifeYear, setSexualChoice, setSubstanceUse } from '../src/engine/adultLife.js';
import { applyDrivingLicense, applyNationalId, applyPassport, buyVehicle, modeAvailability, passportRequirement, resolveTransportationYear, setDrivingSafety, setTransportMode, setUtilityUse, setVehicleInsurance, utilityEstimate } from '../src/engine/transportation.js';
import { careerOptions } from '../src/engine/jobs.js';

console.log('=== Phase 10.4.1B-C adult life, family organization, transportation, utilities, and document checks ===');
const us=COUNTRY_BY_NAME['United States'],pakistan=COUNTRY_BY_NAME.Pakistan,germany=COUNTRY_BY_NAME.Germany,poland=COUNTRY_BY_NAME.Poland;

// Every adult-life mechanic and pregnancy-planning control has a hard age-18 boundary.
const minorState=newGame({countryId:us.id,seed:104110});minorState.character.age=17;
assert.equal(setSubstanceUse(minorState.character,'cannabis','regular'),false);
assert.equal(setSexualChoice(minorState.character,{pattern:'steady'}),false);
assert.equal(setChildrenIntent(minorState,'try'),false);
assert.equal(setContraception(minorState,'reliable'),false);
resolveAdultLifeYear(minorState.character,us);
assert(Object.values(minorState.character.adultLife.substances).every(x=>x==='none'));
assert.equal(minorState.character.adultLife.sexual.pattern,'none');

const adultState=newGame({countryId:pakistan.id,seed:104111,wealthClass:'Rich'}),adult=adultState.character;adult.age=22;
assert.equal(setSubstanceUse(adult,'cannabis','regular'),true);
assert.equal(setSexualChoice(adult,{pattern:'steady',protection:'usually',testing:'yearly'}),true);
assert.equal(activityContext(pakistan,adult).alcohol.status,'restricted');
assert.match(adultLawProfile(pakistan).note,/Simplified national model/);
adult.adultLife.infections.push({id:'hiv',name:'HIV',treated:false,diagnosed:true});
const untreated=maternalTransmissionRisk(adult).hiv;adult.adultLife.infections[0].treated=true;
assert(maternalTransmissionRisk(adult).hiv<untreated,'treatment must materially lower modeled pregnancy or birth transmission risk');

// Transportation availability follows infrastructure and ownership, while costs are annual and itemized.
const transportState=newGame({countryId:us.id,seed:104112,wealthClass:'Rich'}),driver=transportState.character;driver.age=25;driver.money.bank=medianWage(us)*20;
assert.equal(modeAvailability(driver,us).car.available,false);
assert.equal(applyDrivingLicense(driver,us),true);
assert.equal(buyVehicle(driver,us,'used_car',true),true);
assert.equal(setVehicleInsurance(driver,us,'third_party'),true);
assert.equal(setTransportMode(driver,us,'car','walk'),true);
assert.equal(setUtilityUse(driver,'electricity','reduced'),true);
assert(utilityEstimate(driver,us).electricity>0);
const transportYear=resolveTransportationYear(driver,us);
assert(transportYear.expenses.some(x=>/Utilities/.test(x.label)));
assert(transportYear.expenses.some(x=>/Vehicle (fuel|electricity)/.test(x.label)));
assert(driver.debts.vehicle>0&&driver.transportation.vehicle.value>0);

// Impaired driving is only exposed when the player combines substance use with a risky driving policy.
setSubstanceUse(driver,'stimulants','frequent');setDrivingSafety(driver,'frequent');
let dui=false;for(let age=26;age<100&&!dui;age++){driver.age=age;driver.judicial.activeCase=null;resolveTransportationYear(driver,us);dui=driver.transportation.drivingRecord.some(x=>x.type==='DUI');}
assert(dui,'repeated risky impaired driving should eventually produce a DUI and licence consequence');

// Passports take a year, regional identity cards can substitute only where accepted, and legal routes are document-gated.
const travelerState=newGame({countryId:us.id,seed:104113,wealthClass:'Rich'}),traveler=travelerState.character;traveler.age=25;traveler.money.bank=medianWage(us)*10;
assert.equal(passportRequirement(traveler,germany,'skilled').ok,false);
assert.equal(immigrationOptions(traveler,travelerState,germany).find(x=>x.id==='skilled').eligible,false);
assert.equal(applyPassport(traveler,us,us.id),true);resolveTransportationYear(traveler,us);
assert.equal(passportRequirement(traveler,germany,'skilled').ok,true);

const europeanState=newGame({countryId:poland.id,seed:104114,wealthClass:'Rich'}),european=europeanState.character;european.age=25;european.money.bank=medianWage(poland)*10;
assert.equal(applyNationalId(european,poland,poland.id),true);resolveTransportationYear(european,poland);
const regional=passportRequirement(european,germany,'treaty');assert.equal(regional.ok,true);assert.equal(regional.document,'national identity card');

const labels=careerOptions(driver,us).map(x=>x.label);
for(const expected of ['Local Transportation & Delivery','Trucking & Logistics','Rail & Public Transit','Aviation & Maritime'])assert(labels.includes(expected));

const familySource=readFileSync(new URL('../src/ui/tabs/Family.jsx',import.meta.url),'utf8');
for(const label of ['Overview','Household','Partner & Relationships','Children','Extended Family','Care & Legacy'])assert(familySource.includes(label));
const mobilitySource=readFileSync(new URL('../src/ui/tabs/Mobility.jsx',import.meta.url),'utf8');
for(const label of ['Vehicles','Licence & Insurance','Utilities','Driving Record','Travel Documents'])assert(mobilitySource.includes(label));

console.log('Phase 10.4.1B-C checks passed.');
