import assert from 'node:assert/strict';
import { COUNTRIES, COUNTRY_BY_NAME, medianWage } from '../src/engine/countries.js';
import { newGame, deserialize, serialize, stepYear } from '../src/engine/game.js';
import { computeTax } from '../src/engine/economy.js';
import { moveCharacter } from '../src/engine/immigration.js';
import { settleEstate } from '../src/engine/inheritance.js';
import { openCriminalCase } from '../src/engine/judicial.js';
import { makeRng } from '../src/engine/rng.js';
import {
  bankProfile, currencyCode, ensureFinancialState, financialGoalProgress, requestBudgetChange,
  resolveBudgetNegotiation, sendRemittance, setFinancialGoal, setTaxFilingChoice, taxProfile,
  takePersonalLoan, transferBetweenAccounts,
} from '../src/engine/financialSystems.js';
import { buyInvestment, filePersonalBankruptcy, sellInvestment } from '../src/engine/actions.js';

console.log('=== Phase 10.3 banking, currency, household-budget, and tax checks ===');

for (const country of COUNTRIES) {
  assert(Number.isFinite(country.exchangeRate) && country.exchangeRate > 0, `${country.name} needs an exchange rate`);
  assert.match(currencyCode(country), /^[A-Z]{3}$/, `${country.name} needs a currency code`);
  const bank=bankProfile(country),tax=taxProfile(country);
  assert(bank.nominalRate>=0&&bank.creditRate>=bank.loanRate, `${country.name} banking rates are coherent`);
  assert(['none','flat','progressive'].includes(tax.system));
}

const us=COUNTRY_BY_NAME['United States'],uae=COUNTRY_BY_NAME['United Arab Emirates'];
const bulgaria=COUNTRY_BY_NAME.Bulgaria,japan=COUNTRY_BY_NAME.Japan;
assert.equal(computeTax(uae,medianWage(uae)*4).incomeTax,0,'no-income-tax countries omit personal income tax');
assert.equal(computeTax(bulgaria,medianWage(bulgaria)*4).system,'flat');
assert(computeTax(us,medianWage(us)*4).marginalRate>computeTax(us,medianWage(us)*.5).marginalRate,'progressive rates rise by bracket');

const state=newGame({countryId:us.id,seed:103001,wealthClass:'Rich'}),ch=state.character;
ch.age=30;ch.money.bank=100000;ch.money.household=25000;
const beforeTotal=ch.money.bank+ch.money.household;
assert(transferBetweenAccounts(ch,us,'personal_to_household',5000));
assert.equal(ch.money.bank+ch.money.household,beforeTotal,'account transfers do not create or destroy money');
assert(takePersonalLoan(ch,us),'an eligible adult can receive a personal loan');
assert(ch.debts.personalLoan>0&&ch.money.bank>95000,'loan proceeds and debt are both recorded');

const recipient=ch.family.find(p=>p.alive);recipient.finances||={personalSavings:0};
const recipientBefore=recipient.finances.personalSavings||0,bankBefore=ch.money.bank;
assert(sendRemittance(ch,us,recipient,1000));
assert.equal(recipient.finances.personalSavings,recipientBefore+1000);
assert(ch.money.bank<bankBefore-1000,'remittances charge an exchange/transfer fee');

setFinancialGoal(ch,us,'emergency',20000);
assert.equal(financialGoalProgress(ch,us,'emergency').target,20000);
ch.spouse={id:'spouse-test',name:'Alex',relation:'Spouse',alive:true,working:true,relationshipScore:100,finances:{personalSavings:5000}};
requestBudgetChange(ch,us,'custom',.4,.6);
resolveBudgetNegotiation(ch,us,makeRng(103002));
assert.equal(ch.householdBudget.pending,null,'spousal budget proposals resolve annually');
assert(ch.spouse.finances.personalSavings===5000,'a spouse keeps a separate personal account');
setTaxFilingChoice(ch,us,'individual');assert.equal(ch.financial.tax.filingChoice,'individual');

ch.money.bank+=50000;
assert(buyInvestment(state,'bonds',10000));
ch.investments.bonds+=3000;
assert(sellInvestment(state,'bonds',13000));
assert(ch.financial.tax.realizedInvestmentGain>0,'realized investment gains are tracked for tax');

const oldCurrency=currencyCode(us),cashBeforeMigration=ch.money.bank+ch.money.cash;
moveCharacter(ch,japan,'temporary_work',30);
assert.equal(ch.financial.currencyCode,currencyCode(japan));
assert.notEqual(ch.financial.currencyCode,oldCurrency);
assert(ch.financial.exchangeHistory.at(-1).fee>0,'migration applies and records an exchange fee');
assert(ch.money.bank+ch.money.cash<cashBeforeMigration*2,'migration does not duplicate liquid funds');

ch.countryId=us.id;ch.countryName=us.name;ch.location={name:'Chicago',kind:'city',colMultiplier:1};
ch.age=30;ch.alive=true;ch.education.stage='secondary_done';ch.employmentStatus='employed';ch.job={sector:'service',rung:0,yearsAtRung:0};
ch.money.bank=Math.max(ch.money.bank,100000);ensureFinancialState(ch,us);
stepYear(state);
const statement=ch.lastStatement;
for(const key of ['marginalRate','effectiveRate','withheld','refund','balanceDue','consumptionTax','investmentTax','pensionTax','giftTax','residency'])assert(key in statement.tax,`statement needs ${key}`);
assert.equal(statement.tax.residency,'United States');
assert(Math.abs(statement.income.reduce((s,x)=>s+x.amount,0)-statement.tax.total-statement.expenses.reduce((s,x)=>s+x.amount,0)-statement.net)<.02,'expanded statement balances');

const insolvent=newGame({countryId:us.id,seed:103003});insolvent.character.age=30;insolvent.character.debts.personalLoan=medianWage(us);
assert(filePersonalBankruptcy(insolvent));stepYear(insolvent);
assert(insolvent.character.pendingDecisions.some(x=>x.type==='civilCase'),'bankruptcy is resolved through Law');
const taxCase=newGame({countryId:us.id,seed:103005});openCriminalCase(taxCase.character,us,'tax_evasion',{guilty:true,source:'tax audit'});
assert.equal(taxCase.character.judicial.activeCase.label,'Tax evasion','tax evasion can become a criminal audit case');

const estateCharacter=newGame({countryId:us.id,seed:103004,wealthClass:'Rich'}).character;
estateCharacter.money.bank=medianWage(us)*20;estateCharacter.spouse={id:'s',name:'Sam',alive:true,relation:'Spouse'};
estateCharacter.family.push({id:'heir',name:'Jordan',relation:'Child',alive:true,ageOffset:0});
const estate=settleEstate(estateCharacter,us);
assert(estate.tax>0&&estate.rules.exemption>0&&'giftTaxRate' in estate.rules,'estate exemptions and inheritance/gift taxes are modeled');

const restored=deserialize(serialize(state));
assert(restored.character.financial.exchangeHistory.length>0&&restored.character.householdBudget,'financial state survives save/resume');
console.log(`Phase 10.3 checks passed for ${COUNTRIES.length} countries.`);
