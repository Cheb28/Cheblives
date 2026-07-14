import assert from 'node:assert/strict';
import { newGame } from '../src/engine/game.js';
import { COUNTRY_BY_NAME, medianWage } from '../src/engine/countries.js';
import { evaluateBenefits, unemploymentEntitlement, welfareProfile } from '../src/engine/welfare.js';
import { annualHousingCost, applyForSocialHousing, homePrice, housingProfile, resolveHousingYear, setChildContributionPolicy } from '../src/engine/housing.js';
import { resolveFamily } from '../src/engine/family.js';
import { makeRng } from '../src/engine/rng.js';

console.log('=== Phase 8 welfare, housing, and household-fund checks ===');

function adult(country, seed=800) {
  const s=newGame({countryId:country.id,seed,wealthClass:'Poor'}), ch=s.character;
  ch.age=30;ch.employmentStatus='unemployed';ch.money={cash:0,bank:0,household:0};
  ch.immigration.residence={countryId:country.id,status:'citizen',route:'birth',years:30};
  return ch;
}
const sweden=COUNTRY_BY_NAME.Sweden, somalia=COUNTRY_BY_NAME.Somalia;
const swede=adult(sweden);swede.benefits.contributionYears=3;swede.benefits.lastWage=medianWage(sweden);swede.benefits.unemploymentYearsLeft=1;
const generous=evaluateBenefits(swede,sweden,{earnedIncome:0});
assert(generous.some(x=>x.label==='Unemployment insurance'),'contributing worker receives unemployment insurance');
assert.equal(evaluateBenefits(adult(somalia),somalia,{earnedIncome:0}).length,0,'no-welfare profile does not invent a cash safety net');
const newEntrant=adult(sweden);newEntrant.benefits.lastWage=medianWage(sweden);newEntrant.benefits.unemploymentYearsLeft=1;
assert.equal(unemploymentEntitlement(sweden,newEntrant).annual,0,'insurance requires contribution history');

swede.health.disabilities=[{type:'mobility',severity:3}];swede.housing.tenure='private';swede.benefits.unemploymentYearsLeft=0;
const support=evaluateBenefits(swede,sweden,{earnedIncome:0});
assert(support.some(x=>x.label==='Minimum-income assistance'));
assert(support.some(x=>x.label==='Disability income support'));
assert(support.some(x=>x.label==='Housing allowance'));

assert.equal(housingProfile(COUNTRY_BY_NAME.Netherlands).supply,'very_large');
assert.equal(housingProfile(somalia).supply,'minimal');
const dutch=adult(COUNTRY_BY_NAME.Netherlands);dutch.housing.tenure='private';
assert.equal(applyForSocialHousing(dutch,COUNTRY_BY_NAME.Netherlands),true);
resolveHousingYear(dutch,COUNTRY_BY_NAME.Netherlands,{chance:()=>true});
assert.equal(dutch.housing.tenure,'social','priority applicant can receive a social home');
assert(annualHousingCost(COUNTRY_BY_NAME.Netherlands,dutch)<medianWage(COUNTRY_BY_NAME.Netherlands)*.3,'social rent is below modeled market rent');

const singapore=adult(COUNTRY_BY_NAME.Singapore);singapore.housing.tenure='parents';
assert.equal(applyForSocialHousing(singapore,COUNTRY_BY_NAME.Singapore),false,'Singapore public rental models the family-support gate');

const parent=adult(sweden,808);parent.housing.tenure='private';setChildContributionPolicy(parent,'adult',.25);
parent.family.push({id:'adult-child',relation:'Child',childNumber:1,alive:true,ageOffset:10,atHome:true,working:true,wageMult:.6,personalSavings:0,relationshipScore:80,skills:{academic:0}});
const family=resolveFamily(parent,sweden,makeRng(809));
assert(family.incomes.some(x=>x.label.includes('board contribution')&&x.target==='household'));
assert(parent.family.at(-1).personalSavings>0,'working adult child retains personal savings');
assert(homePrice(COUNTRY_BY_NAME.Australia,adult(COUNTRY_BY_NAME.Australia))>homePrice(somalia,adult(somalia)),'housing prices respond to country and market profile');
assert.equal(welfareProfile(sweden).model,'universal-contributory');

console.log('Phase 8 checks passed.');
