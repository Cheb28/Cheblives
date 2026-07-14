// Player actions invoked from the UI (deterministic; random outcomes like hiring
// resolve during advanceYear). Each mutates the game state; the UI re-renders after.
import { COUNTRY_BY_ID } from './countries.js';
import { enroll, canEnrollUniversity, canEnrollVocational } from './education.js';
import { enlistVoluntary, canEnlistVoluntary } from './military.js';
import { wageFor, recordCareerEvent } from './jobs.js';
import { needsHusbandWorkApproval } from './genderRights.js';
import { laborProfile } from './labor.js';
import { INVESTMENTS } from './investments.js';
import { medianWage } from './countries.js';
import { submitMigration, naturalize, isIrregular, visaWorkFraction } from './immigration.js';
import { clearPlannedCrime, planCrime } from './judicial.js';
import { applyForSocialHousing, chooseHousing, homePrice, setChildContributionPolicy } from './housing.js';
import { marriageNameChoices, requestLegalNameChange, setChildName } from './names.js';
import { bankProfile, drawCredit, openCreditCard, recordInvestmentSale, repayConsumerDebt, requestBudgetChange, sendRemittance, setFinancialGoal, setTaxCompliance, setTaxFilingChoice, takePersonalLoan, transferBetweenAccounts } from './financialSystems.js';
import { changePublicReligion, planLifetimePilgrimage, reconcileConduct, setPrivateBelief, setReligionCommitment, setReligiousBranch, setReligiousCareer, setReligiousCommunity, updateCharityPlan } from './religion.js';
import { setDiet, setHabit, setSleepTarget } from './lifeState.js';
import { setSexualChoice, setSubstanceUse } from './adultLife.js';
import { applyDrivingLicense, applyNationalId, applyPassport, buyVehicle, sellVehicle, setDrivingSafety, setTransportMode, setUtilityUse, setVehicleInsurance } from './transportation.js';

export function setActivities(state, ids) { state.character.selectedActivities = ids; }
export function setLifestyle(state, ls) { state.character.lifestyle = ls; }
export function updateHabit(state, id, value) { const ch=state.character; return setHabit(ch, COUNTRY_BY_ID[ch.countryId], id, value); }
export function updateDiet(state, value) { const ch=state.character; return setDiet(ch, COUNTRY_BY_ID[ch.countryId], value); }
export function updateSleepTarget(state, hours) { const ch=state.character; return setSleepTarget(ch, COUNTRY_BY_ID[ch.countryId], hours); }
export function updateSubstanceUse(state,id,value){return setSubstanceUse(state.character,id,value);}
export function updateSexualChoice(state,patch){return setSexualChoice(state.character,patch);}
export function updateTransportMode(state,primary,backup){const ch=state.character;return setTransportMode(ch,COUNTRY_BY_ID[ch.countryId],primary,backup);}
export function requestDrivingLicense(state,commercial=false){const ch=state.character;return applyDrivingLicense(ch,COUNTRY_BY_ID[ch.countryId],commercial);}
export function purchaseVehicle(state,type,finance=false){const ch=state.character;return buyVehicle(ch,COUNTRY_BY_ID[ch.countryId],type,finance);}
export function disposeVehicle(state){return sellVehicle(state.character);}
export function updateVehicleInsurance(state,coverage){const ch=state.character;return setVehicleInsurance(ch,COUNTRY_BY_ID[ch.countryId],coverage);}
export function updateDrivingSafety(state,value){return setDrivingSafety(state.character,value);}
export function updateUtilityUse(state,key,value){return setUtilityUse(state.character,key,value);}
export function requestPassport(state,citizenshipId){const ch=state.character;return applyPassport(ch,COUNTRY_BY_ID[ch.countryId],citizenshipId);}
export function requestNationalId(state,citizenshipId){const ch=state.character;return applyNationalId(ch,COUNTRY_BY_ID[ch.countryId],citizenshipId);}
export function setPrivateSchool(state, enabled) { state.character.education.private = enabled; }
export function setResistDropout(state, enabled) { state.character.education.resistDropout = enabled; }
export function updateReligionCommitment(state, id, enabled) { return setReligionCommitment(state.character, id, enabled); }
export function updateReligiousCharity(state, patch) { return updateCharityPlan(state.character, patch); }
export function updatePrivateBelief(state, belief, identity) { return setPrivateBelief(state.character, belief, identity); }
export function convertOrLeaveReligion(state, target) { return changePublicReligion(state.character, target); }
export function updateReligiousBranch(state, branch, fiqh) { return setReligiousBranch(state.character, branch, fiqh); }
export function updateReligiousCommunity(state, member) { return setReligiousCommunity(state.character, member); }
export function requestLifetimePilgrimage(state) { return planLifetimePilgrimage(state.character); }
export function updateReligiousCareer(state, interested, path) { return setReligiousCareer(state.character, interested, path); }
export function addressConduct(state, id, method) { return reconcileConduct(state.character, id, method); }

export function setDraftChoice(state, choice) {
  const draft = state.character.pendingDecisions?.find(d => d.type === 'draft' || d.type === 'mobilization');
  if (draft) draft.choice = choice;
}

// Set the sector the player is seeking work in (resolves on advance).
export function setJobSearch(state, sectorKey) {
  const ch = state.character;
  if (ch.employmentStatus === 'prison') return false;
  const country = COUNTRY_BY_ID[ch.countryId];
  if(ch.education?.enrolled&&['university','vocational'].includes(ch.education.stage))return false;
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
export function setChildrenIntent(state, intent) { if(state.character.age<18)return false;state.character.childrenIntent = intent;return true; }
export function setContraception(state, method) { if(state.character.age<18)return false;state.character.fertility.contraception = ['none','barrier','reliable'].includes(method) ? method : 'none';return true; }
export function requestFertilityTreatment(state) { const ch=state.character;if(ch.age>=18){ch.fertility.treatment='active';return true;}return false; }
export function requestAdoption(state) { const ch=state.character;if(ch.age>=21){ch.familyPlans.adoption='pending';return true;}return false; }
export function requestFostering(state) { const ch=state.character;if(ch.age>=21){ch.familyPlans.foster=true;return true;}return false; }
export function setCaregiving(state, personId) { state.character.familyPlans.caregivingId=personId||null; }
export function requestReconciliation(state, personId) { state.character.familyPlans.reconciliationId=personId; }
export function seekDomesticHelp(state) { const ch=state.character;if(ch.safety?.concern){ch.safety.seekHelpIntent=true;return true;}return false; }
export function leaveUnsafeHome(state) { const ch=state.character;if(ch.safety?.concern){ch.safety.leaveIntent=true;return true;}return false; }
export function setHouseholdContribution(state, group, rate) { setChildContributionPolicy(state.character, group, rate); return true; }
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
export function buyInvestment(state,id,amount){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId],d=INVESTMENTS[id];amount=Math.max(0,Number(amount)||0);if(!d||amount<=0||!d.gate(c,ch)||ch.money.bank<amount)return false;ch.money.bank-=amount;ch.investments[id]=(ch.investments[id]||0)+amount;ch.investmentBasis||={};ch.investmentBasis[id]=(ch.investmentBasis[id]||0)+amount;return true;}
export function sellInvestment(state,id,amount){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId],d=INVESTMENTS[id];if(!d||d.locked&&ch.age<65)return false;const held=ch.investments[id]||0;amount=Math.min(held,Math.max(0,Number(amount)||0));if(amount<=0)return false;ch.investmentBasis||={};const basis=(ch.investmentBasis[id]||held)*(amount/held);ch.investmentBasis[id]=Math.max(0,(ch.investmentBasis[id]||held)-basis);ch.investments[id]-=amount;ch.money.bank+=amount;recordInvestmentSale(ch,c,id,amount,basis);return true;}
export function buyHome(state){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId],price=homePrice(c,ch),down=c.incomeTier>=3?price*.2:price;if(ch.ownsHome||ch.age<18||ch.money.bank<down)return false;ch.money.bank-=down;ch.debts.mortgage=price-down;if(ch.debts.mortgage>0){const termYears=c.incomeTier>=3?30:15;ch.mortgage={rate:bankProfile(c).loanRate*.65,termYears,remainingYears:termYears,originalPrincipal:ch.debts.mortgage};}ch.homeValue=price;ch.ownsHome=true;ch.housing.tenure='owner';ch.housing.application=null;return true;}
export function foundBusiness(state,type){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId];if(!['informal','registered'].includes(type))return false;const capital=medianWage(c)*(type==='informal'?.5:5);if(ch.age<18||ch.business||ch.money.bank<capital)return false;ch.money.bank-=capital;ch.business={type,capital,employees:0,loan:0,lastProfit:0,lastRevenue:0,lastWages:0,lastInterest:0};return true;}
export function hireEmployee(state){const ch=state.character;if(!ch.business)return false;ch.business.employees+=1;return true;}
export function takeBusinessLoan(state){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId];if(!ch.business||c.incomeTier<2)return false;const a=medianWage(c)*2;ch.business.loan+=a;ch.business.capital+=a;return true;}
export function sellBusiness(state){const ch=state.character;if(!ch.business)return false;ch.money.bank+=Math.max(0,ch.business.capital+ch.business.lastProfit*.5-ch.business.loan);ch.business=null;return true;}
export function transferAccountFunds(state,direction,amount){const ch=state.character;return transferBetweenAccounts(ch,COUNTRY_BY_ID[ch.countryId],direction,amount);}
export function proposeHouseholdBudget(state,mode,playerRate,spouseRate){const ch=state.character;return requestBudgetChange(ch,COUNTRY_BY_ID[ch.countryId],mode,playerRate,spouseRate);}
export function remitToFamily(state,personId,amount){const ch=state.character,p=[...(ch.family||[]),...(ch.spouse?[ch.spouse]:[])].find(x=>x.id===personId);return sendRemittance(ch,COUNTRY_BY_ID[ch.countryId],p,amount);}
export function applyPersonalLoan(state){const ch=state.character;return takePersonalLoan(ch,COUNTRY_BY_ID[ch.countryId]);}
export function applyCreditCard(state){const ch=state.character;return openCreditCard(ch,COUNTRY_BY_ID[ch.countryId]);}
export function useCreditCard(state,amount){const ch=state.character;return drawCredit(ch,COUNTRY_BY_ID[ch.countryId],amount);}
export function payConsumerDebt(state,kind,amount){const ch=state.character;return repayConsumerDebt(ch,COUNTRY_BY_ID[ch.countryId],kind,amount);}
export function updateFinancialGoal(state,key,amount){const ch=state.character;return setFinancialGoal(ch,COUNTRY_BY_ID[ch.countryId],key,amount);}
export function updateTaxCompliance(state,value){const ch=state.character;return setTaxCompliance(ch,COUNTRY_BY_ID[ch.countryId],value);}
export function updateTaxFilingChoice(state,value){const ch=state.character;return setTaxFilingChoice(ch,COUNTRY_BY_ID[ch.countryId],value);}
export function filePersonalBankruptcy(state){const ch=state.character,c=COUNTRY_BY_ID[ch.countryId],eligible=(ch.debts.personalLoan||0)+(ch.debts.creditCard||0)+(ch.debts.business||0)+(ch.debts.tax||0);if(ch.age<18||eligible<medianWage(c)*.5||ch.judicial?.activeCase)return false;ch.judicial.bankruptcyDue=eligible;return true;}

export function quitJob(state) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId];
  if (ch.job) { ch.benefits.lastWage = wageFor(country, ch.job, ch); recordCareerEvent(ch,'left',ch.job,'Resigned'); ch.job = null; ch.employmentStatus = 'unemployed'; return true; }
  return false;
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
