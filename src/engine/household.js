import { medianWage } from './countries.js';
import { genderRightsProfile } from './genderRights.js';
import { healthcareCoverage } from './health.js';
import { ensureHousing } from './housing.js';
import { laborProfile } from './labor.js';
import { makeRng } from './rng.js';
import { displayName } from './names.js';

const OCCUPATIONS = {
  professional:['Office professional','Teacher','Technical specialist','Healthcare worker'],
  service:['Retail worker','Hospitality worker','Care worker','Driver'],
  industrial:['Factory worker','Construction worker','Machine operator','Skilled laborer'],
  agriculture:['Farm worker','Fisher','Agricultural worker','Livestock worker'],
  informal:['Market vendor','Casual laborer','Domestic worker','Self-employed trader'],
};
const WAGE = {professional:1.25,service:.82,industrial:1,agriculture:.62,informal:.55};

function clamp(v,lo=0,hi=100){return Math.max(lo,Math.min(hi,v));}
function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function memberRng(rng,person,ch,salt=''){return makeRng(((rng?.state||rng?.seed||1)^hash(`${person.id}-${ch.age}-${salt}`))>>>0);}
function ageOf(ch,p){return Math.max(0,ch.age-(p.ageOffset||0));}
function retirementAge(country){return country.incomeTier>=3?65:country.incomeTier===2?63:60;}

function chooseSector(country,rng){
  const weights=[
    ['agriculture',Math.max(1,country.sectors?.agriculture||8)],
    ['industrial',Math.max(1,country.sectors?.industry||20)],
    ['service',Math.max(1,(country.sectors?.services||50)*.72)],
    ['professional',Math.max(1,(country.sectors?.services||50)*.28*(country.educationTier||2)/3)],
    ['informal',country.incomeTier<=2?22:6],
  ];
  return rng.weighted(weights,x=>x[1])[0];
}

function familyCoverage(country,person,ch){
  const familyProviders=[...(ch.family||[]),...(ch.spouse?[ch.spouse]:[])];
  const insured=person.finances?.employmentStatus==='employed'||(ch.job&&ch.job.sector!=='informal')||familyProviders.some(p=>isHouseholdMember(ch,p)&&p.finances?.employmentStatus==='employed');
  return healthcareCoverage(country,{health:{insured},military:{status:'none'}});
}

export function ensureMemberEconomy(person,ch,country,rng){
  const age=ageOf(ch,person),r=memberRng(rng,person,ch,'initialize');
  person.finances||={employmentStatus:'child',sector:null,occupation:null,wageMult:0,annualGrossIncome:0,personalSavings:person.personalSavings||0,householdContribution:0,yearsWorked:0,lastYear:null};
  person.finances.personalSavings??=person.personalSavings||0;
  person.health||={score:person.stats?.health??70,conditions:[],insured:false,medicalHistory:[],lastYear:{status:'No care needed',cost:0,treated:true}};
  person.health.conditions||=[];person.health.medicalHistory||=[];
  for(const old of person.healthConditions||[]){if(!person.health.conditions.some(c=>c.name===old))person.health.conditions.push({name:old,severity:1,chronic:true,controlled:false});}
  if(person.working&&age>=18&&person.finances.employmentStatus!=='employed'){
    person.finances.employmentStatus='employed';person.finances.sector=person.finances.sector||chooseSector(country,r);
    person.finances.occupation=person.career||r.pick(OCCUPATIONS[person.finances.sector]);person.finances.wageMult=person.wageMult||WAGE[person.finances.sector];
  }
  if(!person.finances.lastYear){
    if(age>=retirementAge(country))person.finances.employmentStatus='retired';
    else if(age>=18&&person.finances.employmentStatus==='child'){
      const rights=genderRightsProfile(country),participation=person.sex==='female'?rights.femaleHireMult:1;
      const employed=r.chance(Math.max(.08,(1-(country.unemployment||8)/100)*.78*participation));
      person.finances.employmentStatus=employed?'employed':'unemployed';
      if(employed){person.finances.sector=chooseSector(country,r);person.finances.occupation=r.pick(OCCUPATIONS[person.finances.sector]);person.finances.wageMult=WAGE[person.finances.sector]*(.78+r.next()*.45);}
    }else if(age>=6&&age<18)person.finances.employmentStatus='student';
  }
  person.working=person.finances.employmentStatus==='employed';person.wageMult=person.finances.wageMult||person.wageMult||0;
  person.personalSavings=person.finances.personalSavings;
  return person;
}

export function initializeFamilyEconomy(ch,country,rng){for(const p of ch.family||[])ensureMemberEconomy(p,ch,country,rng);if(ch.spouse)ensureMemberEconomy(ch.spouse,ch,country,rng);return ch;}

export function isHouseholdMember(ch,p){
  if(!p?.alive)return false;
  if(p.relation==='Spouse')return true;
  if(p.relation==='Child')return p.atHome!==false;
  if(['Father','Mother','Sibling'].includes(p.relation))return ch.age<18;
  return false;
}

function updateEmployment(person,ch,country,r){
  const f=person.finances,age=ageOf(ch,person),retire=retirementAge(country);
  if(age>=retire){f.employmentStatus='retired';f.sector=null;f.occupation='Retired';}
  else if(age<18){
    const labor=laborProfile(country),eligible=age>=labor.lightWorkAge;
    if(eligible&&f.employmentStatus!=='employed'&&r.chance(labor.childLaborRisk*.45)){
      f.employmentStatus='employed';f.sector='informal';f.occupation='Youth work';f.wageMult=.16;
    }else if(f.employmentStatus!=='employed')f.employmentStatus=age>=6?'student':'child';
  }else if(f.employmentStatus==='employed'){
    const healthPenalty=(person.health?.score||70)<35?.08:0;
    if(r.chance(.035+healthPenalty)){f.employmentStatus='unemployed';f.sector=null;f.occupation=null;f.wageMult=0;}
  }else{
    const rights=genderRightsProfile(country),participation=person.sex==='female'?rights.femaleHireMult:1;
    if(r.chance(Math.max(.05,(1-(country.unemployment||8)/100)*.48*participation))){f.employmentStatus='employed';f.sector=chooseSector(country,r);f.occupation=r.pick(OCCUPATIONS[f.sector]);f.wageMult=WAGE[f.sector]*(.75+r.next()*.5);}
  }
  let income=0;
  if(f.employmentStatus==='employed')income=medianWage(country)*(f.wageMult||.7);
  else if(f.employmentStatus==='retired')income=medianWage(country)*({generous:.42,moderate:.28,minimal:.12,none:0}[country.welfareTier]||0);
  f.annualGrossIncome=income;f.yearsWorked+=(f.employmentStatus==='employed'?1:0);
  person.working=f.employmentStatus==='employed';person.wageMult=f.wageMult;person.career=f.occupation||person.career;f.lastYear={age:ch.age,status:f.employmentStatus,occupation:f.occupation,grossIncome:income};return income;
}

function contributionFor(person,ch,income){
  if(income<=0||!isHouseholdMember(ch,person))return 0;
  const age=ageOf(ch,person),housing=ensureHousing(ch);
  if(person.relation==='Spouse')return income;
  if(['Father','Mother'].includes(person.relation)&&ch.age<18)return income;
  if(person.relation==='Sibling'&&ch.age<18)return age<18?income*.6:income*.35;
  if(person.relation==='Child')return income*(age<18?housing.teenContributionRate:housing.adultChildContributionRate);
  return 0;
}

function normalizeCondition(person){
  if(!person.health.conditions.length)return null;
  return person.health.conditions.sort((a,b)=>(b.severity||1)-(a.severity||1))[0];
}

function resolveMemberHealth(person,ch,country,r,available,household){
  const age=ageOf(ch,person),h=person.health,cov=familyCoverage(country,person,ch),mw=medianWage(country);
  h.insured=cov.treatmentShare<1;
  const premium=household&&age>=18&&cov.premium>0?cov.premium*Math.max(person.finances?.annualGrossIncome||0,mw*.3):0;
  if(r.chance(.007+(age<6?.018:0)+(age>55?(age-55)*.0012:0))){
    const condition={name:r.pick(age>50?['Heart disease','Arthritis','Type 2 diabetes','Chronic respiratory disease']:['Asthma','Chronic respiratory condition','Chronic pain condition']),severity:r.chance(.2)?2:1,chronic:true,controlled:false};
    if(!h.conditions.some(c=>c.name===condition.name)){h.conditions.push(condition);h.medicalHistory.push({age:ch.age,text:`Diagnosed with ${condition.name}.`});}
  }
  const chronic=normalizeCondition(person),acute=r.chance(.10+(age<6?.06:0));
  if(!chronic&&!acute){h.lastYear={status:'No care needed',cost:0,premium,treated:true,coverage:cov.label};return{cost:0,premium,unmet:false,log:null};}
  const severity=chronic?.severity||1,base=mw*(chronic?.chronic?.07:.06)*(1+severity*.65),cost=base*cov.treatmentShare;
  const canPay=!household||cost<=Math.max(0,available-premium);
  const accessed=r.chance(cov.access),treated=canPay&&accessed;
  if(chronic)chronic.controlled=treated;
  h.score=clamp((h.score??70)+(treated?1:-(2+severity*2)),1,100);
  const issue=chronic?.name||'acute illness';
  const status=treated?`Treated ${issue}`:!canPay?`Untreated ${issue} · unaffordable`:`Untreated ${issue} · care unavailable`;
  h.lastYear={status,cost:treated?cost:0,premium,treated,coverage:cov.label};h.medicalHistory.push({age:ch.age,text:status});if(h.medicalHistory.length>40)h.medicalHistory.shift();
  return{cost:treated?cost:0,premium,unmet:!treated,log:treated?`${displayName(person)} received treatment for ${issue} (${cov.label}).`:`${displayName(person)} could not complete treatment for ${issue}${!canPay?' because the household could not afford it':''}.`};
}

export function resolveHouseholdEconomy(ch,country,rng){
  const incomes=[],expenses=[],logs=[],people=[...(ch.family||[])];if(ch.spouse?.alive)people.push(ch.spouse);
  ch.familyOriginFinance||={settled:false,retainedFund:0,launchGift:0};
  if(ch.age>=18&&!ch.familyOriginFinance.settled){
    const originFund=ch.money.household||0,gift=Math.min(originFund*.05,medianWage(country)*.25);
    ch.money.household=0;ch.money.bank=(ch.money.bank||0)+gift;ch.familyOriginFinance={settled:true,retainedFund:Math.max(0,originFund-gift),launchGift:gift};
    if(originFund>0)logs.push(`Your parents retained the family-of-origin fund; you received ${Math.round(gift).toLocaleString()} as a start in adult life.`);
  }
  let projectedIncome=0,medicalSpend=0,unmetCare=0;
  for(const p of people){
    if(!p.alive)continue;ensureMemberEconomy(p,ch,country,rng);const r=memberRng(rng,p,ch,'employment'),income=updateEmployment(p,ch,country,r);
    const contribution=contributionFor(p,ch,income);p.finances.householdContribution=contribution;
    if(contribution>0){const provider=['Father','Mother','Spouse'].includes(p.relation),age=ageOf(ch,p);const label=p.relation==='Child'?`${displayName(p)} · ${age<18?'household contribution':'board contribution'}`:`${displayName(p)} · ${p.finances.occupation||p.finances.employmentStatus}`;incomes.push({label,amount:contribution,target:'household',untaxed:!provider});projectedIncome+=contribution;}
    const retained=Math.max(0,income-contribution)*(p.finances.employmentStatus==='employed'?.55:.7);p.finances.personalSavings=(p.finances.personalSavings||0)+retained;p.personalSavings=p.finances.personalSavings;
  }
  if(ch.age>=18&&ensureHousing(ch).tenure==='parents'&&!ch.job&&!['child','student'].includes(ch.employmentStatus)&&ch.familyOriginFinance.retainedFund>0){
    const support=Math.min(ch.familyOriginFinance.retainedFund,medianWage(country)*.35);ch.familyOriginFinance.retainedFund-=support;
    incomes.push({label:'Parental household support',amount:support,target:'household',untaxed:true});projectedIncome+=support;
  }
  if(ch.age<18){
    const members=people.filter(p=>isHouseholdMember(ch,p)),adults=members.filter(p=>ageOf(ch,p)>=18).length,children=members.length-adults+1;
    expenses.push({label:'Birth-family living costs',amount:medianWage(country)*.45*(ch.location?.colMultiplier||1)*(1+Math.max(0,adults-1)*.42+Math.max(0,children-1)*.22),household:true});
  }
  let available=(ch.money.cash||0)+(ch.money.bank||0)+(ch.money.household||0)+projectedIncome;
  for(const p of people.filter(p=>p.alive)){
    const household=isHouseholdMember(ch,p),r=memberRng(rng,p,ch,'health');
    const result=resolveMemberHealth(p,ch,country,r,available,household);
    if(result.log)logs.push(result.log);
    if(result.unmet)unmetCare+=1;
    if((result.premium||0)>0&&household){expenses.push({label:`${displayName(p)} · health coverage`,amount:result.premium,household:true});available-=result.premium;medicalSpend+=result.premium;}
    else if((result.premium||0)>0){p.finances.personalSavings=Math.max(0,p.finances.personalSavings-result.premium);p.personalSavings=p.finances.personalSavings;}
    if(result.cost>0){
      if(household){expenses.push({label:`${displayName(p)} · medical care`,amount:result.cost,household:true});available-=result.cost;medicalSpend+=result.cost;}
      else{p.finances.personalSavings=Math.max(0,p.finances.personalSavings-result.cost);p.personalSavings=p.finances.personalSavings;}
    }
  }
  ch.householdFinance={age:ch.age,members:people.filter(p=>isHouseholdMember(ch,p)).map(p=>p.id),familyGrossIncome:projectedIncome,medicalSpend,unmetCare,
    employed:people.filter(p=>p.finances?.employmentStatus==='employed').length,totalFamilySavings:people.reduce((s,p)=>s+(p.finances?.personalSavings||0),0)};
  return{incomes,expenses,logs,summary:ch.householdFinance};
}
