// Player actions invoked from the UI (deterministic; random outcomes like hiring
// resolve during advanceYear). Each mutates the game state; the UI re-renders after.
import { COUNTRY_BY_ID } from './countries.js';
import { enroll, canEnrollUniversity, canEnrollVocational } from './education.js';
import { enlistVoluntary, canEnlistVoluntary } from './military.js';
import { wageFor } from './jobs.js';
import { needsHusbandWorkApproval } from './genderRights.js';
import { laborProfile } from './labor.js';
import { INVESTMENTS } from './investments.js';
import { medianWage } from './countries.js';
import { submitMigration, naturalize, isIrregular, visaWorkFraction } from './immigration.js';
import { clearPlannedCrime, planCrime } from './judicial.js';
import { applyForSocialHousing, chooseHousing, homePrice, setChildContributionPolicy } from './housing.js';
import { marriageNameChoices, requestLegalNameChange, setChildName, setNickname, setPreferredName } from './names.js';

export function setActivities(state, ids) { state.character.selectedActivities = ids; }
export function setLifestyle(state, ls) { state.character.lifestyle = ls; }
export function setPrivateSchool(state, enabled) { state.character.education.private = enabled; }
export function setResistDropout(state, enabled) { state.character.education.resistDropout = enabled; }

export function setDraftChoice(state, choice) {
  const draft = state.character.pendingDecisions?.find(d => d.type === 'draft' || d.type === 'mobilization');
  if (draft) draft.choice = choice;
}

// Set the sector the player is seeking work in (resolves on advance).
export function setJobSearch(state, sectorKey) {
  const ch = state.character;
  if (ch.employmentStatus === 'prison') return false;
  const country = COUNTRY_BY_ID[ch.countryId];
  if (isIrregular(ch) && sectorKey !== 'informal') return false;
  if (needsHusbandWorkApproval(ch, country)) return false;
  if (['unemployed', 'informal', 'retired'].includes(ch.employmentStatus) || !ch.job) {
    ch.jobSearch.sector = sectorKey;
    return true;
  }
  return false;
}

export function setDatingIntent(state, enabled) { state.character.datingIntent = enabled; }
export function setDatingPreference(state, preference) { state.character.social.datingPreference = ['anyone','opposite','same'].includes(preference) ? preference : 'anyone'; }
export function setFriendIntent(state, enabled) { state.character.social.friendIntent = enabled; }
export function proposeMarriage(state) {
  const ch = state.character;
  if (ch.partner?.alive && ch.partner.yearsTogether >= 1) { ch.proposalIntent = true; return true; }
  return false;
}
export function planMarriage(state) { const ch=state.character;if(ch.partner?.engaged){ch.marriageIntent=true;return true;}return false; }
export function setMarriageNameChoice(state, choice) { const ch=state.character,country=COUNTRY_BY_ID[ch.countryId];if(!ch.partner?.engaged)return false;const allowed=marriageNameChoices(ch,ch.partner,country).some(x=>x.id===choice);if(allowed)ch.identity.pendingMarriageChoice=choice;return allowed; }
export function endPartnership(state) { const ch=state.character;if(ch.partner||ch.spouse){ch.separationIntent=true;return true;}return false; }
export function requestDivorce(state) { const ch=state.character;if(ch.spouse?.alive){ch.divorceIntent=true;return true;}return false; }
export function setChildrenIntent(state, intent) { state.character.childrenIntent = intent; }
export function setContraception(state, method) { state.character.fertility.contraception = ['none','barrier','reliable'].includes(method) ? method : 'none'; }
export function requestFertilityTreatment(state) { const ch=state.character;if(ch.age>=18){ch.fertility.treatment='active';return true;}return false; }
export function requestAdoption(state) { const ch=state.character;if(ch.age>=21){ch.familyPlans.adoption='pending';return true;}return false; }
export function requestFostering(state) { const ch=state.character;if(ch.age>=21){ch.familyPlans.foster=true;return true;}return false; }
export function setCaregiving(state, personId) { state.character.familyPlans.caregivingId=personId||null; }
export function requestReconciliation(state, personId) { state.character.familyPlans.reconciliationId=personId; }
export function seekDomesticHelp(state) { const ch=state.character;if(ch.safety?.concern){ch.safety.seekHelpIntent=true;return true;}return false; }
export function leaveUnsafeHome(state) { const ch=state.character;if(ch.safety?.concern){ch.safety.leaveIntent=true;return true;}return false; }
export function setHouseholdContribution(state, group, rate) { setChildContributionPolicy(state.character, group, rate); return true; }
export function updatePreferredName(state, value) { return setPreferredName(state.character,value); }
export function updateNickname(state, value) { return setNickname(state.character,value); }
export function changeLegalName(state, value) { const ch=state.character;return requestLegalNameChange(ch,COUNTRY_BY_ID[ch.countryId],value); }
export function nameChild(state, id, value) { const ch=state.character;return setChildName(ch,id,value,COUNTRY_BY_ID[ch.countryId]); }
export function requestSocialHousing(state) { const ch=state.character; return applyForSocialHousing(ch,COUNTRY_BY_ID[ch.countryId]); }
export function setHousingTenure(state, tenure) { const ch=state.character; return chooseHousing(ch,COUNTRY_BY_ID[ch.countryId],tenure); }
export function requestWorkPermission(state) { state.character.familyRights.requestWorkPermission = true; }
export function setWillShare(state, beneficiaryId, pct) {
  const ch = state.character;
  ch.will.written = true;
  ch.will.shares[beneficiaryId] = Math.max(0, Math.min(100, Number(pct) || 0));
}
export function clearWill(state) { state.character.will = { written: false, shares: {} }; }
export function setPlannedCrime(state, crimeId) { return crimeId ? planCrime(state.character, crimeId) : (clearPlannedCrime(state.character), true); }
export function applyForMigration(state,targetId,routeId){return submitMigration(state,targetId,routeId);}
export function applyForCitizenship(state){return naturalize(state.character);}
export function setPartTimeWork(state,enabled){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId];if(ch.age>=laborProfile(c).lightWorkAge&&ch.age<18){ch.partTimeWork=enabled;return true;}if(ch.age>=18&&ch.employmentStatus==='student'&&ch.immigration?.residence?.visa?.kind==='student'&&visaWorkFraction(ch)>0){ch.partTimeWork=enabled;return true;}return false;}
export function buyInvestment(state,id,amount){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId],d=INVESTMENTS[id];amount=Math.max(0,Number(amount)||0);if(!d||amount<=0||!d.gate(c,ch)||ch.money.bank<amount)return false;ch.money.bank-=amount;ch.investments[id]=(ch.investments[id]||0)+amount;return true;}
export function sellInvestment(state,id,amount){const ch=state.character,d=INVESTMENTS[id];if(!d||d.locked&&ch.age<65)return false;amount=Math.min(ch.investments[id]||0,Math.max(0,Number(amount)||0));ch.investments[id]-=amount;ch.money.bank+=amount;return true;}
export function buyHome(state){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId],price=homePrice(c,ch),down=c.incomeTier>=3?price*.2:price;if(ch.ownsHome||ch.age<18||ch.money.bank<down)return false;ch.money.bank-=down;ch.debts.mortgage=price-down;ch.homeValue=price;ch.ownsHome=true;ch.housing.tenure='owner';ch.housing.application=null;return true;}
export function foundBusiness(state,type){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId];if(!['informal','registered'].includes(type))return false;const capital=medianWage(c)*(type==='informal'?.5:5);if(ch.age<18||ch.business||ch.money.bank<capital)return false;ch.money.bank-=capital;ch.business={type,capital,employees:0,loan:0,lastProfit:0,lastRevenue:0,lastWages:0,lastInterest:0};return true;}
export function hireEmployee(state){const ch=state.character;if(!ch.business)return false;ch.business.employees+=1;return true;}
export function takeBusinessLoan(state){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId];if(!ch.business||c.incomeTier<2)return false;const a=medianWage(c)*2;ch.business.loan+=a;ch.business.capital+=a;return true;}
export function sellBusiness(state){const ch=state.character;if(!ch.business)return false;ch.money.bank+=Math.max(0,ch.business.capital+ch.business.lastProfit*.5-ch.business.loan);ch.business=null;return true;}

export function quitJob(state) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId];
  if (ch.job) { ch.benefits.lastWage = wageFor(country, ch.job, ch); ch.job = null; ch.employmentStatus = 'unemployed'; }
}

export function enrollUniversity(state, useLoan = false) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId];
  if (canEnrollUniversity(ch)) { enroll(ch, country, 'university', { useLoan }); return true; }
  return false;
}
export function enrollVocational(state) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId];
  if (canEnrollVocational(ch)) { enroll(ch, country, 'vocational'); return true; }
  return false;
}

export function enlistMilitary(state) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId];
  if (canEnlistVoluntary(ch, country)) { enlistVoluntary(ch); return true; }
  return false;
}
