import { medianWage } from './countries.js';
import { makeRng } from './rng.js';
import { openCriminalCase } from './judicial.js';

export const SUBSTANCES=[
  {id:'cannabis',label:'Cannabis',perceived:'Relaxation, enjoyment, and social participation.',risk:'Dependence, impaired driving, memory problems, and legal exposure.'},
  {id:'stimulants',label:'Non-medical stimulants',perceived:'Temporary energy, confidence, and alertness.',risk:'Dependence, heart strain, anxiety, and overdose.'},
  {id:'opioids',label:'Non-medical opioids',perceived:'Temporary pain relief, calm, and escape.',risk:'High dependence and potentially fatal overdose.'},
  {id:'sedatives',label:'Non-medical sedatives',perceived:'Temporary calm and sleepiness.',risk:'Dependence, falls, impaired driving, and overdose when combined with alcohol.'},
  {id:'psychedelics',label:'Psychedelics',perceived:'Novel experiences and altered perception.',risk:'Panic, accidents, psychological distress, and legal exposure.'},
  {id:'inhalants',label:'Inhalants',perceived:'Brief intoxication and availability.',risk:'Organ damage, accidents, and sudden death.'},
  {id:'injecting',label:'Injecting drug use',perceived:'Rapid and intense perceived effect.',risk:'Overdose, dependence, HIV, hepatitis, and serious infection.'},
];
export const USE_LEVELS=['none','occasional','regular','frequent','dependent'];

const ALCOHOL_PROHIBITED=new Set(['Saudi Arabia','Kuwait','Afghanistan','Libya','Somalia','Yemen']);
const ALCOHOL_RESTRICTED=new Set(['Pakistan','Iran','Brunei','Maldives','Bangladesh']);
const CANNABIS_REGULATED=new Set(['Canada','Uruguay','Malta','Luxembourg','Germany','South Africa']);
const SEXWORK_DECRIMINALIZED=new Set(['New Zealand','Belgium']);
const SEXWORK_REGULATED=new Set(['Netherlands','Germany','Austria','Switzerland','Greece','Turkey','Senegal']);
const BUYER_ILLEGAL=new Set(['Sweden','Norway','Iceland','France','Ireland','Canada']);
const HIGH_HIV=new Set(['South Africa','Eswatini','Lesotho','Botswana','Zimbabwe','Zambia','Mozambique','Namibia','Malawi']);
const MEDIUM_HIV=new Set(['Kenya','Uganda','Tanzania','Nigeria','Cameroon','Central African Republic','Gabon','Haiti']);

const levelIndex=v=>Math.max(0,USE_LEVELS.indexOf(v));
function localRng(ch,salt){let h=2166136261;for(const c of `${ch.identity?.birthName||ch.countryId}|${ch.age}|${salt}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return makeRng(h>>>0);}

export function adultLawProfile(country,ch=null){
  const alcohol=ALCOHOL_PROHIBITED.has(country.name)?'prohibited':ALCOHOL_RESTRICTED.has(country.name)?'restricted':'legal with age and sales controls';
  const sexWork=SEXWORK_DECRIMINALIZED.has(country.name)?'decriminalized':SEXWORK_REGULATED.has(country.name)?'legal and regulated':BUYER_ILLEGAL.has(country.name)?'selling permitted; purchasing criminalized':'criminalized or legally restricted';
  return {alcohol,cannabis:CANNABIS_REGULATED.has(country.name)?'regulated adult use':'illegal or medically restricted',otherDrugs:'non-medical possession and supply prohibited',sexWork,
    enforcement:country.lawTier==='strong'?'consistent':country.lawTier==='weak'?'uneven':'moderate',note:'Simplified national model; local rules and enforcement may differ.'};
}

export function initAdultLife(){return{
  substances:Object.fromEntries(SUBSTANCES.map(x=>[x.id,'none'])),
  sexual:{pattern:'none',protection:'always',testing:'yearly',prep:false,sexWork:'none'},
  infections:[],lifetime:{drugSpend:0,sexWorkIncome:0,sexWorkSpend:0,tests:0,diagnoses:0,overdoses:0},lastYear:{},
};}
export function ensureAdultLife(ch){ch.adultLife||=initAdultLife();ch.adultLife.substances||=initAdultLife().substances;for(const x of SUBSTANCES)ch.adultLife.substances[x.id]||='none';ch.adultLife.sexual||=initAdultLife().sexual;ch.adultLife.infections||=[];ch.adultLife.lifetime||=initAdultLife().lifetime;ch.adultLife.lastYear||={};return ch.adultLife;}
export function setSubstanceUse(ch,id,value){const a=ensureAdultLife(ch);if(ch.age<18||!SUBSTANCES.some(x=>x.id===id)||!USE_LEVELS.includes(value))return false;a.substances[id]=value;return true;}
export function setSexualChoice(ch,patch){const a=ensureAdultLife(ch);if(ch.age<18)return false;const next={...a.sexual,...patch};if(!['none','steady','casual','multiple'].includes(next.pattern)||!['always','usually','sometimes','never'].includes(next.protection)||!['never','yearly','after-risk'].includes(next.testing)||!['none','sell','buy'].includes(next.sexWork))return false;a.sexual=next;return true;}

export function activityContext(country,ch){const law=adultLawProfile(country,ch),adult=ch.age>=18;return{
  alcohol:{available:ch.age>=18,status:law.alcohol,illegal:law.alcohol==='prohibited'},
  substances:Object.fromEntries(SUBSTANCES.map(x=>[x.id,{available:adult,status:x.id==='cannabis'?law.cannabis:law.otherDrugs,illegal:x.id==='cannabis'?!CANNABIS_REGULATED.has(country.name):true}])),
  sexual:{available:adult,status:'consensual adult activity only'},sexWork:{available:adult,status:law.sexWork,illegalSell:!['decriminalized','legal and regulated','selling permitted; purchasing criminalized'].includes(law.sexWork),illegalBuy:!['decriminalized','legal and regulated'].includes(law.sexWork)},
};}

function addCondition(ch,id,name,severity=1){if((ch.health?.conditions||[]).some(x=>x.id===id))return;ch.health.conditions.push({id,name,chronic:true,severity,controlled:false,diagnosedAge:ch.age,years:0,mgmtCost:.05,mortalityRisk:id==='hiv'?.22:.03});}
function acquireInfection(a,ch,id,name,diagnosed){if(a.infections.some(x=>x.id===id))return false;a.infections.push({id,name,acquiredAge:ch.age,diagnosed,treated:false});if(diagnosed)addCondition(ch,id,name,id==='hiv'?2:1);return true;}

export function resolveAdultLifeYear(ch,country){
  const a=ensureAdultLife(ch),rng=localRng(ch,'adult-life'),expenses=[],incomes=[],logs=[];a.lastYear={drugSpend:0,sexWorkIncome:0,sexWorkSpend:0,newInfections:[],legalProblems:[]};
  if(ch.age<18){a.substances=Object.fromEntries(SUBSTANCES.map(x=>[x.id,'none']));a.sexual=initAdultLife().sexual;return{expenses,incomes,logs,medicalCosts:0};}
  const ctx=activityContext(country,ch),mw=medianWage(country);
  for(const substance of SUBSTANCES){const level=levelIndex(a.substances[substance.id]);if(!level)continue;const cost=mw*[0,.008,.035,.09,.18][level];expenses.push({label:`Adult habits — ${substance.label}`,amount:cost});a.lastYear.drugSpend+=cost;a.lifetime.drugSpend+=cost;
    if(ctx.substances[substance.id].illegal&&rng.chance([0,.015,.035,.07,.12][level])&&!ch.judicial?.activeCase){openCriminalCase(ch,country,'drug_possession',{guilty:true,source:'adult habit'});a.lastYear.legalProblems.push(substance.label);logs.push(`${substance.label} use led to a possession charge.`);}
    const overdose=[0,.0005,.003,.012,.035][level]*(substance.id==='opioids'?3:substance.id==='sedatives'||substance.id==='stimulants'?1.5:1);if(rng.chance(overdose)){a.lifetime.overdoses++;ch.health.lastSevereEvent={age:ch.age,name:'Drug overdose',mortalityRisk:.12,treated:true};logs.push('A drug overdose required emergency medical treatment.');expenses.push({label:'Emergency overdose treatment',amount:mw*.18});}
    if(level>=3&&rng.chance(.08*level))addCondition(ch,`substance-${substance.id}`,`${substance.label} use disorder`,level>=4?2:1);
  }
  const alcoholLevel=['none','occasional','regular','frequent','heavy'].indexOf(ch.lifeState?.habits?.alcohol||'none');if(alcoholLevel>0&&ctx.alcohol.illegal&&rng.chance(.02*alcoholLevel)&&!ch.judicial?.activeCase){openCriminalCase(ch,country,'prohibited_alcohol',{guilty:true,source:'adult habit'});logs.push('Prohibited alcohol possession led to a criminal charge.');}
  const sex=a.sexual,active=sex.pattern!=='none'||sex.sexWork!=='none';if(active){const protection={always:.12,usually:.35,sometimes:.68,never:1}[sex.protection],partners={none:0,steady:.25,casual:.8,multiple:1.5}[sex.pattern]+(sex.sexWork!=='none'?1.5:0),baseHiv=HIGH_HIV.has(country.name)?.018:MEDIUM_HIV.has(country.name)?.006:.0012;
    if(sex.sexWork==='sell'){const earned=mw*(country.incomeTier>=3?.45:.28);incomes.push({label:'Adult sex-work income',amount:earned,untaxed:true});a.lastYear.sexWorkIncome=earned;a.lifetime.sexWorkIncome+=earned;if(ctx.sexWork.illegalSell&&rng.chance(.09)&&!ch.judicial?.activeCase){openCriminalCase(ch,country,'sex_work',{guilty:true,source:'adult choice'});logs.push('Selling sexual services led to a legal charge.');}}
    if(sex.sexWork==='buy'){const spent=mw*.14;expenses.push({label:'Adult services spending',amount:spent});a.lastYear.sexWorkSpend=spent;a.lifetime.sexWorkSpend+=spent;if(ctx.sexWork.illegalBuy&&rng.chance(.1)&&!ch.judicial?.activeCase){openCriminalCase(ch,country,'purchase_sex',{guilty:true,source:'adult choice'});logs.push('Purchasing sexual services led to a legal charge.');}}
    const prep=sex.prep?.15:1,risks=[['hiv','HIV',baseHiv*partners*protection*prep],['syphilis','Syphilis',.004*partners*protection],['gonorrhoea','Gonorrhoea',.012*partners*protection],['chlamydia','Chlamydia',.016*partners*protection],['herpes','Herpes',.008*partners*(.35+.65*protection)],['hpv','HPV',.012*partners*(.45+.55*protection)],['hepatitis-b','Hepatitis B',.002*partners*protection]];
    const test=sex.testing==='yearly'||sex.testing==='after-risk'&&sex.pattern!=='steady';if(test){a.lifetime.tests++;expenses.push({label:'STI screening',amount:mw*(country.healthTier>=3?.004:.012)});}
    for(const [id,name,p] of risks)if(rng.chance(Math.min(.2,p))&&acquireInfection(a,ch,id,name,test)){a.lastYear.newInfections.push(name);logs.push(test?`${name} was detected through screening.`:'A sexually transmitted infection was acquired but has not yet been diagnosed.');}
  }
  let medicalCosts=0;for(const inf of a.infections){if(!inf.diagnosed&&a.sexual.testing==='yearly'){inf.diagnosed=true;addCondition(ch,inf.id,inf.name,inf.id==='hiv'?2:1);}if(inf.diagnosed&&!inf.treated&&ch.health.healthPolicy!=='never'){const curable=['syphilis','gonorrhoea','chlamydia'].includes(inf.id);inf.treated=true;medicalCosts+=mw*(curable?.018:.04);const condition=ch.health.conditions.find(x=>x.id===inf.id);if(condition)condition.controlled=true;}}
  return{expenses,incomes,logs,medicalCosts};
}

export function maternalTransmissionRisk(ch){const a=ensureAdultLife(ch),hiv=a.infections.find(x=>x.id==='hiv'),syph=a.infections.find(x=>x.id==='syphilis'),hbv=a.infections.find(x=>x.id==='hepatitis-b');return{hiv:hiv?(hiv.treated?.01:.25):0,syphilis:syph&&!syph.treated?.18:0,hepatitisB:hbv&&!hbv.treated?.08:0};}
