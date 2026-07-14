import { medianWage } from './countries.js';

const SYMBOLS = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', CNY:'¥', KRW:'₩', INR:'₹', RUB:'₽', TRY:'₺', BRL:'R$', CAD:'C$', AUD:'A$', NZD:'NZ$', CHF:'CHF ', SEK:'kr ', NOK:'kr ', DKK:'kr ', PLN:'zł ', ILS:'₪', PKR:'₨ ', ZAR:'R ', AFN:'؋', THB:'฿', KWD:'د.ك ', GHS:'GH₵', VES:'Bs ', ZMW:'ZK ' };
const COUNTRY_CURRENCY_CODES = {Afghanistan:'AFN',Aruba:'AWG',Belarus:'BYN',China:'CNY',Eswatini:'SZL',Ghana:'GHS',Kuwait:'KWD',Mauritania:'MRU',Mozambique:'MZN',Samoa:'WST','Sao Tome and Principe':'STN','Sierra Leone':'SLE',Thailand:'THB',Turkmenistan:'TMT',Venezuela:'VES',Zambia:'ZMW',Zimbabwe:'ZWL'};
const NO_INCOME_TAX = new Set(['United Arab Emirates','Saudi Arabia','Qatar','Kuwait','Bahrain','Oman','Bahamas','Brunei','Monaco']);
const FLAT_TAX = new Set(['Bulgaria','Estonia','Georgia','Hungary','Romania']);
const JOINT_FILING = new Set(['United States','Germany','France','Ireland','Luxembourg','Portugal','Spain']);

export const BUDGET_MODES = {
  proportional:{label:'Proportional to income',playerRate:.55,spouseRate:.55},
  equal:{label:'Equal household amounts',playerRate:.50,spouseRate:.50},
  pooled:{label:'Mostly pooled finances',playerRate:.88,spouseRate:.88},
  separate:{label:'Mostly separate finances',playerRate:.28,spouseRate:.28},
  single:{label:'Single-income household',playerRate:.82,spouseRate:.18},
  custom:{label:'Custom contribution rates',playerRate:.50,spouseRate:.50},
};

export function currencyCode(country){return COUNTRY_CURRENCY_CODES[country?.name]||country?.currency?.match(/\(([A-Z]{3})\)/)?.[1]||'USD';}
export function currencySymbol(country){const code=currencyCode(country);return SYMBOLS[code]||`${code} `;}

export function culturalBudgetDefault(ch,country){
  const religion=String(ch?.religion||'').toLowerCase(),region=country?.region||'';
  if(/muslim|hindu/.test(religion)&&['Middle East','South Asia','Africa'].includes(region))return 'pooled';
  if(['East & Southeast Asia','South Asia'].includes(region))return 'pooled';
  if(['Europe','North America','Australia & Oceania'].includes(region))return 'proportional';
  return 'proportional';
}

export function ensureFinancialState(ch,country){
  ch.financial||={};const f=ch.financial;
  f.currencyCode||=currencyCode(country);f.exchangeRate??=country?.exchangeRate||1;f.exchangeHistory||=[];
  f.goals||={emergency:medianWage(country)*.5,housing:0,retirement:medianWage(country)*5};
  f.personalLoan||={balance:0,rate:0,yearsLeft:0};
  f.creditCard||={open:false,balance:0,limit:0,rate:0};
  f.tax||={};f.tax.compliance||='honest';f.tax.filingChoice||='auto';f.tax.realizedInvestmentGain??=0;f.tax.pensionWithdrawals??=0;f.tax.giftsReceived??=0;f.tax.carryBalance??=0;f.tax.auditHistory||=[];
  f.remittances||=[];
  ch.debts||={};ch.debts.personalLoan??=f.personalLoan.balance||0;ch.debts.creditCard??=f.creditCard.balance||0;ch.debts.tax??=f.tax.carryBalance||0;
  ch.householdBudget||={mode:culturalBudgetDefault(ch,country),playerRate:null,spouseRate:null,pending:null,lastNegotiation:null};
  return f;
}

export function localAmount(country,ch,pppAmount){return pppAmount*(ensureFinancialState(ch,country).exchangeRate||1);}
export function formatLocal(country,ch,pppAmount){
  const value=localAmount(country,ch,pppAmount),symbol=currencySymbol(country);
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

export function exchangeFeeRate(country,kind='bank'){
  const base=country.lawTier==='strong'?.008:country.lawTier==='medium'?.018:.035;
  return kind==='remittance'?base+.012:kind==='cash'?base+.02:base;
}
export function applyMigrationExchange(ch,fromCountry,toCountry){
  const f=ensureFinancialState(ch,fromCountry),base=Math.max(0,(ch.money?.bank||0)+(ch.money?.cash||0)),fee=base*exchangeFeeRate(toCountry,'bank');
  ch.money.bank=Math.max(0,(ch.money.bank||0)-fee);f.currencyCode=currencyCode(toCountry);f.exchangeRate=toCountry.exchangeRate||1;
  f.exchangeHistory.push({age:ch.age,from:currencyCode(fromCountry),to:f.currencyCode,rate:f.exchangeRate,fee});
  return fee;
}

export function bankProfile(country){
  const nominal=Math.max(0,Math.min(50,(country.inflation||2)+(country.incomeTier>=3?1.2:.2)-(country.stability===1?1.5:0)));
  return{nominalRate:nominal/100,realRate:(nominal-(country.inflation||2))/100,loanRate:Math.min(.45,nominal/100+(country.lawTier==='strong'?.045:.10)),creditRate:Math.min(.60,nominal/100+(country.lawTier==='strong'?.14:.25))};
}

export function taxProfile(country){
  const system=NO_INCOME_TAX.has(country.name)?'none':FLAT_TAX.has(country.name)?'flat':'progressive';
  const filing=JOINT_FILING.has(country.name)?'joint optional':'individual';
  const consumption={low:.04,light:.09,moderate:.16,heavy:.22}[country.taxTier]??.09;
  const investment={low:.05,light:.10,moderate:.18,heavy:.25}[country.taxTier]??.10;
  return{system,filing,consumptionRate:consumption,capitalGainsRate:investment,dividendRate:investment*.85,interestRate:investment*.75,pensionWithdrawalRate:investment*.55,
    auditChance:country.lawTier==='strong'?.16:country.lawTier==='medium'?.09:.04};
}

export function budgetRates(ch){
  const b=ch.householdBudget||{},base=BUDGET_MODES[b.mode]||BUDGET_MODES.proportional;
  return{playerRate:b.mode==='custom'?Math.max(0,Math.min(1,b.playerRate??.5)):base.playerRate,spouseRate:b.mode==='custom'?Math.max(0,Math.min(1,b.spouseRate??.5)):base.spouseRate};
}

export function requestBudgetChange(ch,country,mode,playerRate=.5,spouseRate=.5){
  ensureFinancialState(ch,country);if(!BUDGET_MODES[mode])return false;
  if(!ch.spouse?.alive){ch.householdBudget={...ch.householdBudget,mode,playerRate,spouseRate,pending:null,lastNegotiation:'Set while single'};return true;}
  ch.householdBudget.pending={mode,playerRate:Number(playerRate),spouseRate:Number(spouseRate),requestedAge:ch.age};return true;
}

export function resolveBudgetNegotiation(ch,country,rng){
  ensureFinancialState(ch,country);const pending=ch.householdBudget.pending;if(!pending||!ch.spouse?.alive)return null;
  const current=culturalBudgetDefault(ch,country),relationship=(ch.spouse.relationshipScore||50)/100;
  const culturalFit=pending.mode===current?.16:pending.mode==='custom'?-.05:0;
  const accepted=rng.chance(Math.max(.2,Math.min(.92,.42+relationship*.38+culturalFit)));
  if(accepted)Object.assign(ch.householdBudget,{mode:pending.mode,playerRate:pending.playerRate,spouseRate:pending.spouseRate});
  ch.householdBudget.lastNegotiation=accepted?`Accepted at age ${ch.age}`:`Declined at age ${ch.age}`;ch.householdBudget.pending=null;
  if(!accepted)ch.spouse.relationshipScore=Math.max(0,(ch.spouse.relationshipScore||50)-2);
  return accepted?'You and your spouse agreed on a new household budget.':'Your spouse declined the proposed household budget.';
}

export function transferBetweenAccounts(ch,country,direction,amount){
  ensureFinancialState(ch,country);amount=Math.max(0,Number(amount)||0);if(amount<=0)return false;
  if(direction==='personal_to_household'&&ch.money.bank>=amount){ch.money.bank-=amount;ch.money.household+=amount;return true;}
  if(direction==='household_to_personal'&&ch.money.household>=amount){ch.money.household-=amount;ch.money.bank+=amount;return true;}
  return false;
}

export function sendRemittance(ch,country,person,amount){
  const f=ensureFinancialState(ch,country);amount=Math.max(0,Number(amount)||0);const fee=amount*exchangeFeeRate(country,'remittance');
  if(!person?.alive||amount<=0||ch.money.bank<amount+fee)return false;
  ch.money.bank-=amount+fee;person.finances||={personalSavings:0};person.finances.personalSavings=(person.finances.personalSavings||0)+amount;person.personalSavings=person.finances.personalSavings;
  f.remittances.push({age:ch.age,to:person.name||person.relation,amount,fee});if(f.remittances.length>30)f.remittances.shift();return true;
}

export function takePersonalLoan(ch,country){
  const f=ensureFinancialState(ch,country),p=bankProfile(country),amount=medianWage(country)*.5;
  if(ch.age<18||f.personalLoan.balance>0||country.lawTier==='weak'&&ch.wealthIdx<1)return false;
  f.personalLoan={balance:amount,rate:p.loanRate,yearsLeft:5};ch.debts.personalLoan=amount;ch.money.bank+=amount;return true;
}
export function openCreditCard(ch,country){const f=ensureFinancialState(ch,country);if(ch.age<18||f.creditCard.open||country.incomeTier<2)return false;const p=bankProfile(country);f.creditCard={open:true,balance:0,limit:medianWage(country)*.35,rate:p.creditRate};return true;}
export function drawCredit(ch,country,amount){const f=ensureFinancialState(ch,country);amount=Math.max(0,Number(amount)||0);if(!f.creditCard.open||amount<=0||f.creditCard.balance+amount>f.creditCard.limit)return false;f.creditCard.balance+=amount;ch.debts.creditCard=f.creditCard.balance;ch.money.bank+=amount;return true;}
export function repayConsumerDebt(ch,country,kind,amount){const f=ensureFinancialState(ch,country),account=kind==='creditCard'?f.creditCard:f.personalLoan;amount=Math.min(account.balance||0,Math.max(0,Number(amount)||0),ch.money.bank||0);if(amount<=0)return false;account.balance-=amount;ch.debts[kind]=account.balance;ch.money.bank-=amount;return true;}

export function setFinancialGoal(ch,country,key,amount){const f=ensureFinancialState(ch,country);if(!['emergency','housing','retirement'].includes(key))return false;f.goals[key]=Math.max(0,Number(amount)||0);return true;}
export function financialGoalProgress(ch,country,key){const f=ensureFinancialState(ch,country),target=f.goals[key]||0;const held=key==='retirement'?(ch.investments?.pension||0):key==='housing'?(ch.money.bank||0)+(ch.money.household||0):(ch.money.bank||0);return{target,held,pct:target?Math.min(100,held/target*100):100};}

export function recordInvestmentSale(ch,country,id,proceeds,basis){const f=ensureFinancialState(ch,country),gain=Math.max(0,proceeds-basis);f.tax.realizedInvestmentGain+=gain;if(id==='pension')f.tax.pensionWithdrawals+=proceeds;return gain;}

export function setTaxCompliance(ch,country,value){const f=ensureFinancialState(ch,country);f.tax.compliance=value==='underreport'?'underreport':'honest';return true;}
export function setTaxFilingChoice(ch,country,value){const f=ensureFinancialState(ch,country);f.tax.filingChoice=['auto','joint','individual'].includes(value)?value:'auto';return true;}

export function resolveFinancialYear(ch,country,rng){
  const f=ensureFinancialState(ch,country),logs=[],expenses=[];const bank=bankProfile(country);
  const budget=resolveBudgetNegotiation(ch,country,rng);if(budget)logs.push(budget);
  const inflationGap=Math.max(-.15,Math.min(.80,((country.inflation||2)-2)/100+rng.gaussian(0,.025)));
  f.exchangeRate=Math.max(.0001,f.exchangeRate*(1+inflationGap));f.currencyCode=currencyCode(country);f.exchangeHistory.push({age:ch.age,rate:f.exchangeRate});if(f.exchangeHistory.length>30)f.exchangeHistory.shift();
  if(f.personalLoan.balance>0){f.personalLoan.balance*=1+f.personalLoan.rate;const pay=Math.min(f.personalLoan.balance,Math.max(medianWage(country)*.08,f.personalLoan.balance/Math.max(1,f.personalLoan.yearsLeft)));expenses.push({label:'Personal loan payment',amount:pay});f.personalLoan.balance-=pay;f.personalLoan.yearsLeft=Math.max(0,f.personalLoan.yearsLeft-1);ch.debts.personalLoan=f.personalLoan.balance;}
  if(f.creditCard.balance>0){f.creditCard.balance*=1+f.creditCard.rate;const pay=Math.min(f.creditCard.balance,Math.max(f.creditCard.balance*.12,medianWage(country)*.025));expenses.push({label:'Credit-card payment',amount:pay});f.creditCard.balance-=pay;ch.debts.creditCard=f.creditCard.balance;}
  return{logs,expenses,bank};
}
