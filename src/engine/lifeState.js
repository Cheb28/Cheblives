import { medianWage } from './countries.js';
import { makeRng } from './rng.js';

export const INTENSITIES = ['none', 'occasional', 'regular', 'frequent', 'heavy'];
export const INTENSITY_LABELS = { none:'None', occasional:'Occasional', regular:'Regular', frequent:'Frequent', heavy:'Heavy' };

export const HABITS = [
  {id:'exercise',label:'Exercise',minAge:6,benefit:'Improves stamina, sleep, mobility, and long-term health.'},
  {id:'socializing',label:'Social life',minAge:6,benefit:'Supports friendships, confidence, belonging, and enjoyment.'},
  {id:'partying',label:'Partying',minAge:14,benefit:'Can bring enjoyment, friendships, dating, and networking.'},
  {id:'smoking',label:'Smoking',minAge:14,benefit:'May provide temporary perceived calm, alertness, or social bonding.'},
  {id:'alcohol',label:'Alcohol',minAge:18,benefit:'Can support relaxation, celebrations, and social participation.'},
  {id:'gambling',label:'Gambling',minAge:18,benefit:'Provides excitement, social participation, and a chance of winnings.'},
  {id:'gaming',label:'Gaming and online leisure',minAge:6,benefit:'Provides entertainment, friendships, and sometimes technical interests.'},
];

const HABIT_VALUES = {
  exercise:{minutes:[0,45,120,240,420],hours:[0,.75,2,4,7],cost:[0,.002,.006,.015,.035]},
  socializing:{hours:[0,1,3,6,10],cost:[0,.003,.012,.03,.07]},
  partying:{events:[0,2,6,12,20],hours:[0,1,4,9,16],cost:[0,.006,.025,.07,.15]},
  smoking:{cigarettes:[0,1,5,10,20],hours:[0,.2,.5,1,1.5],cost:[0,.003,.018,.045,.09]},
  alcohol:{drinks:[0,.5,3,7,15],hours:[0,.2,.5,1,2],cost:[0,.002,.012,.035,.08]},
  gambling:{hours:[0,.25,1,3,7],cost:[0,.003,.015,.05,.14]},
  gaming:{hours:[0,1,4,9,18],cost:[0,0,.003,.01,.025]},
};

const LEARNING = ['Learns slowly','Typical learner','Quick learner','Exceptional learner'];
const MEMORY = ['Needs repetition','Typical memory','Strong memory'];
const SOCIAL = ['Socially uncomfortable','Reserved','Approachable','Confident','Persuasive'];
const EMPATHY = ['Blunt','Typical empathy','Empathetic','Highly empathetic'];
const REGULATION = ['Emotionally reactive','Developing self-regulation','Usually composed','Highly self-controlled'];

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const intensityIndex=value=>Math.max(0,INTENSITIES.indexOf(value));
function derivedRng(ch,country,salt='birth'){
  const key=`${salt}|${ch.id||ch.identity?.birthName||''}|${ch.sex}|${ch.ethnicity||''}|${ch.religion||''}|${country?.id||ch.countryId||''}|${ch.stats?.intelligence||0}|${ch.stats?.fitness||0}`;
  let seed=2166136261;for(let i=0;i<key.length;i++){seed^=key.charCodeAt(i);seed=Math.imul(seed,16777619);}return makeRng(seed>>>0);
}

function weightedCategory(rng, values, center=1) {
  const n=clamp(Math.round(rng.gaussian(center,.75)),0,values.length-1);return values[n];
}

function adultHeightTarget(ch,country,rng){
  const base=ch.sex==='male'?171:159,development=((country?.incomeTier||2.5)-2.5)*1.4,variation=rng.gaussian(0,6.5);
  return clamp(base+development+variation,ch.sex==='male'?148:140,ch.sex==='male'?198:188);
}
function growthFraction(age){
  if(age<=0)return .30;if(age===1)return .44;if(age===2)return .52;if(age<=5)return .52+(age-2)*.043;
  if(age<=10)return .65+(age-5)*.034;if(age<=15)return .82+(age-10)*.03;if(age<=18)return .97+(age-15)*.01;return 1;
}
function childWeight(age,height){
  if(age<=0)return 3.3;if(age===1)return 9.6;if(age===2)return 12.2;
  const bmi=age<6?15.5:age<12?16.5:age<16?19:21;return bmi*Math.pow(height/100,2);
}

export function initLifeState(ch,country,rng){
  // Use a derived stream so adding body detail never changes unrelated life outcomes.
  rng=derivedRng(ch,country);
  const targetHeight=adultHeightTarget(ch,country,rng),height=targetHeight*growthFraction(ch.age||0);
  const weight=childWeight(ch.age||0,height);
  return {
    version:1,
    body:{targetHeightCm:targetHeight,heightCm:height,weightKg:weight,lastWeightChangeKg:0,
      recorded:{heightCm:height,weightKg:weight,bmi:weight/Math.pow(height/100,2),age:ch.age||0,source:'birth or childhood measurement'}},
    aptitudes:{
      learning:weightedCategory(rng,LEARNING,1.2),memory:weightedCategory(rng,MEMORY,1),
      social:weightedCategory(rng,SOCIAL,2),empathy:weightedCategory(rng,EMPATHY,1.4),
      selfRegulation:weightedCategory(rng,REGULATION,1.5),knowledgeYears:0,
    },
    habits:Object.fromEntries(HABITS.map(x=>[x.id,'none'])),
    diet:'balanced',sleepTargetHours:ch.age<14?9:8,
    exposures:{smokingYears:0,packYears:0,formerSmoker:false,yearsSinceQuitting:0,regularAlcoholYears:0,heavyDrinkingYears:0,partyYears:0,gamblingYears:0},
    measurements:{exerciseMinutesWeek:0,socialHoursWeek:0,partyEventsMonth:0,cigarettesDay:0,drinksWeek:0,gamblingHoursWeek:0,gamingHoursWeek:0,sleepHoursNight:ch.age<14?9:8,freeHoursWeek:0},
    wellbeing:{physicalCondition:'Healthy',physicalTrend:'Stable',function:'Fully independent',emotionalState:'Settled',lifeSatisfaction:'Mixed',stress:'Manageable',energy:'Normal',time:'Some free time',reasons:[]},
    yearlyHistory:[],
  };
}

export function ensureLifeState(ch,country,rng){
  if(!ch.lifeState){
    const fallback={gaussian:(m)=>m,pick:a=>a[0]};ch.lifeState=initLifeState(ch,country,rng||fallback);
  }
  const l=ch.lifeState;
  l.habits||=Object.fromEntries(HABITS.map(x=>[x.id,'none']));for(const h of HABITS)l.habits[h.id]||='none';
  l.exposures||={smokingYears:0,packYears:0,formerSmoker:false,yearsSinceQuitting:0,regularAlcoholYears:0,heavyDrinkingYears:0,partyYears:0,gamblingYears:0};
  l.measurements||={};l.wellbeing||={};l.yearlyHistory||=[];
  l.body||={targetHeightCm:ch.sex==='male'?171:159,heightCm:ch.sex==='male'?171:159,weightKg:65,recorded:null};
  l.aptitudes||={learning:'Typical learner',memory:'Typical memory',social:'Approachable',empathy:'Typical empathy',selfRegulation:'Usually composed'};
  l.aptitudes.knowledgeYears??=0;
  l.diet||='balanced';l.sleepTargetHours??=ch.age<14?9:8;
  return l;
}

export function bmi(ch){const b=ch.lifeState?.body;return b?.heightCm>0?b.weightKg/Math.pow(b.heightCm/100,2):null;}
export function bmiClassification(value){return value==null?'Not recorded':value<18.5?'Below usual range':value<25?'Usual range':value<30?'Above usual range':value<35?'High':value<40?'Very high':'Extremely high';}

export function setHabit(ch,country,id,value){
  const l=ensureLifeState(ch,country);if(!HABITS.some(x=>x.id===id)||!INTENSITIES.includes(value))return false;
  if(ch.age<(HABITS.find(x=>x.id===id)?.minAge||0))return false;
  if(id==='smoking'&&l.habits.smoking!=='none'&&value==='none')l.exposures.formerSmoker=true;
  l.habits[id]=value;return true;
}
export function setDiet(ch,country,value){const l=ensureLifeState(ch,country);if(!['balanced','convenience','comfort','restricted'].includes(value))return false;l.diet=value;return true;}
export function setSleepTarget(ch,country,hours){ensureLifeState(ch,country).sleepTargetHours=clamp(Number(hours)||8,4,12);return true;}

export function learningAptitudeFactor(ch){const v=ch.lifeState?.aptitudes?.learning;return {'Learns slowly':.82,'Typical learner':1,'Quick learner':1.14,'Exceptional learner':1.28}[v]||1;}
export function socialConfidenceFactor(ch){const v=ch.lifeState?.aptitudes?.social;return {'Socially uncomfortable':.75,Reserved:.9,Approachable:1,Confident:1.12,Persuasive:1.22}[v]||1;}

export function physicalCapacityFactor(ch){
  const l=ch.lifeState,exercise=intensityIndex(l?.habits?.exercise),value=bmi(ch),disability=(ch.health?.disabilities||[]).reduce((s,d)=>s+(d.severity||1),0),frailty=ch.health?.frailty||0;
  let factor=.85+exercise*.06-disability*.12-Math.max(0,frailty-20)/120;
  if(value!=null&&(value<17||value>=35))factor-=.12;else if(value>=30)factor-=.06;
  return clamp(factor,.2,1.15);
}

export function weeklyTime(ch){
  const l=ch.lifeState,jobHours=ch.job?(ch.job.partTime?24:40):ch.military?.status==='career'||ch.military?.status==='serving'?50:0;
  const schoolHours=ch.education?.enrolled?ch.education.stage==='university'||ch.education.stage==='vocational'?35:30:0;
  const childcare=(ch.family||[]).filter(x=>x.relation==='Child'&&x.alive!==false&&x.atHome!==false&&Math.max(0,ch.age-(x.ageOffset||0))<12).length*7;
  const care=ch.familyPlans?.caregivingId?10:0,household=ch.age>=14?8:2;
  let habitHours=0;for(const h of HABITS)habitHours+=HABIT_VALUES[h.id]?.hours?.[intensityIndex(l?.habits?.[h.id]||'none')]||0;
  const sleep=(l?.measurements?.sleepHoursNight??l?.sleepTargetHours??8)*7;
  return {jobHours,schoolHours,childcare,care,household,habitHours,sleep,free:clamp(168-jobHours-schoolHours-childcare-care-household-sleep-habitHours,0,80)};
}

function conditionSnapshot(ch){
  const conditions=ch.health?.conditions||[],disabilities=ch.health?.disabilities||[],frailty=ch.health?.frailty||0,severe=ch.health?.lastSevereEvent;
  if(severe?.age===ch.age&&!severe.treated)return 'Critical';
  if(frailty>=60)return 'Frail';
  if(disabilities.reduce((s,d)=>s+(d.severity||1),0)>=2)return 'Physically limited';
  if(conditions.some(c=>(c.severity||1)>=2&&!c.controlled))return 'Managing serious health problems';
  if(conditions.length)return 'Managing health problems';
  const l=ch.lifeState;if(intensityIndex(l?.habits?.exercise)>=2&&(l?.measurements?.sleepHoursNight||0)>=7)return 'Thriving';
  return 'Healthy';
}
function functionSnapshot(ch){const burden=(ch.health?.disabilities||[]).reduce((s,d)=>s+(d.severity||1),0)+(ch.health?.frailty||0)/35;return burden>=5?'Dependent on care':burden>=3?'Needs regular assistance':burden>=1.5?'Needs occasional assistance':burden>=.5?'Independent with difficulty':'Fully independent';}
const PHYSICAL_ORDER=['Thriving','Healthy','Managing health problems','Managing serious health problems','Physically limited','Frail','Critical'];
function trend(previous,current){const a=PHYSICAL_ORDER.indexOf(previous),b=PHYSICAL_ORDER.indexOf(current);return a<0||a===b?'Stable':b<a?'Improving':b-a>=2?'Declining quickly':'Declining';}

export function refreshLifeConditions(ch){
  const l=ch.lifeState;if(!l)return null;const w=l.wellbeing,previous=w.physicalCondition,current=conditionSnapshot(ch),time=weeklyTime(ch),reasons=[];
  let stress=0;if(ch.employmentStatus==='unemployed'&&ch.age>=18)stress+=2;if(ch.lastStatement?.poverty||ch.lastStatement?.hardship)stress+=3;if(ch.familyPlans?.caregivingId)stress+=2;if((ch.health?.conditions||[]).some(c=>!c.controlled))stress+=2;if((l.measurements.sleepHoursNight||8)<6.5)stress+=2;if(ch.judicial?.activeCase)stress+=2;
  const support=(ch.spouse?.alive?2:0)+Math.min(2,(ch.social?.friends||[]).filter(x=>x.alive&&!x.ended).length/2)+(intensityIndex(l.habits.socializing)>=2?1:0);
  const satisfaction=support+(ch.job?1:0)+(ch.housing?.tenure&&!['homeless','parents'].includes(ch.housing.tenure)?1:0)-(ch.lastStatement?.poverty?2:0)-((ch.health?.conditions||[]).some(c=>!c.controlled)?1:0);
  w.physicalTrend=trend(previous,current);w.physicalCondition=current;w.function=functionSnapshot(ch);
  w.stress=stress>=7?'Breaking point':stress>=5?'Overloaded':stress>=3?'Elevated':stress>=1?'Manageable':'Low';
  w.lifeSatisfaction=satisfaction>=5?'Deeply fulfilled':satisfaction>=3?'Satisfied':satisfaction>=0?'Mixed':satisfaction>=-2?'Dissatisfied':'Deeply unhappy';
  w.emotionalState=stress>=7?'In crisis':stress>=5?'Distressed':satisfaction<0?'Discouraged':satisfaction>=4?'Content':'Settled';
  const sleep=l.measurements.sleepHoursNight||8,capacity=physicalCapacityFactor(ch);w.energy=sleep<5.5||capacity<.45?'Severely limited':sleep<6.5||capacity<.65?'Exhausted':sleep<7||capacity<.8?'Tired':sleep>=8&&capacity>=1?'Energetic':'Normal';
  w.time=time.free>=35?'Plenty of free time':time.free>=18?'Some free time':time.free>=8?'Limited free time':'Almost no free time';
  if(ch.lastStatement?.poverty)reasons.push('financial pressure');if(ch.familyPlans?.caregivingId)reasons.push('caregiving');if((ch.health?.conditions||[]).some(c=>!c.controlled))reasons.push('uncontrolled illness');if(sleep<6.5)reasons.push('insufficient sleep');if(support>=3)reasons.push('supportive relationships');w.reasons=reasons;
  return w;
}

export function resolveLifeStateYear(ch,country,rng){
  rng=derivedRng(ch,country,`age-${ch.age}`);
  const l=ensureLifeState(ch,country,rng),expenses=[],incomes=[],logs=[];
  const age=ch.age,b=l.body,oldWeight=b.weightKg;b.heightCm=b.targetHeightCm*growthFraction(age);
  const selected=ch.selectedActivities||[];
  const idx=id=>Math.max(intensityIndex(l.habits[id]),id==='exercise'&&selected.includes('gym')?2:0,id==='socializing'&&selected.includes('socializing')?2:0);
  l.measurements.exerciseMinutesWeek=HABIT_VALUES.exercise.minutes[idx('exercise')];
  l.measurements.socialHoursWeek=HABIT_VALUES.socializing.hours[idx('socializing')];
  l.measurements.partyEventsMonth=HABIT_VALUES.partying.events[idx('partying')];
  l.measurements.cigarettesDay=HABIT_VALUES.smoking.cigarettes[idx('smoking')];
  l.measurements.drinksWeek=HABIT_VALUES.alcohol.drinks[idx('alcohol')];
  l.measurements.gamblingHoursWeek=HABIT_VALUES.gambling.hours[idx('gambling')];
  l.measurements.gamingHoursWeek=HABIT_VALUES.gaming.hours[idx('gaming')];
  const sleepLoss=idx('partying')*.22+idx('gaming')*.12+idx('alcohol')*.08+(ch.familyPlans?.caregivingId?.5:0);
  l.measurements.sleepHoursNight=clamp(l.sleepTargetHours-sleepLoss+(selected.includes('rest') ? .35 : 0),4,10);
  if(age<18)b.weightKg=childWeight(age,b.heightCm)*(1+(ch.wealthIdx-2)*.015);
  else{
    const dietChange={balanced:0,convenience:.7,comfort:1.25,restricted:-.45}[l.diet]||0;
    const activityChange=[.45,.15,-.25,-.65,-1][idx('exercise')],viceChange=idx('alcohol')*.16+idx('partying')*.1;
    b.weightKg=clamp(b.weightKg+dietChange+activityChange+viceChange+rng.gaussian(0,.45),Math.pow(b.heightCm/100,2)*16.5,Math.pow(b.heightCm/100,2)*45);
  }
  b.lastWeightChangeKg=b.weightKg-oldWeight;

  if(l.measurements.cigarettesDay>0){l.exposures.smokingYears+=1;l.exposures.packYears+=l.measurements.cigarettesDay/20;l.exposures.yearsSinceQuitting=0;}else if(l.exposures.formerSmoker)l.exposures.yearsSinceQuitting+=1;
  if(l.measurements.drinksWeek>=3)l.exposures.regularAlcoholYears+=1;if(l.measurements.drinksWeek>=14)l.exposures.heavyDrinkingYears+=1;
  if(l.measurements.partyEventsMonth>0)l.exposures.partyYears+=1;if(l.measurements.gamblingHoursWeek>0)l.exposures.gamblingYears+=1;

  for(const h of HABITS){const cost=medianWage(country)*(HABIT_VALUES[h.id]?.cost?.[idx(h.id)]||0);if(cost>0)expenses.push({label:`Habits & leisure — ${h.label}`,amount:cost});}
  if(idx('gambling')>0&&rng.chance(.12/idx('gambling'))){const win=medianWage(country)*(.04+idx('gambling')*.08)*rng.next();incomes.push({label:'Gambling winnings',amount:win,untaxed:true});if(win>medianWage(country)*.1)logs.push('Gambling produced an unusual win this year, although the long-run expected cost remains negative.');}
  const time=weeklyTime(ch);l.measurements.freeHoursWeek=time.free;
  const measured=age<18?rng.chance(.65):ch.health?.healthPolicy!=='never'&&rng.chance(.12+(country.healthTier||2)*.05);
  if(measured)b.recorded={heightCm:b.heightCm,weightKg:b.weightKg,bmi:bmi(ch),age,source:age<18?'family or school measurement':'healthcare measurement'};
  refreshLifeConditions(ch);
  l.yearlyHistory.push({age,measurements:{...l.measurements},weightKg:b.weightKg,bmi:bmi(ch),habits:{...l.habits},wellbeing:{...l.wellbeing}});if(l.yearlyHistory.length>120)l.yearlyHistory.shift();
  return{expenses,incomes,logs};
}

export function lifeConditionSummary(ch){return refreshLifeConditions(ch)||ensureLifeState(ch,null).wellbeing;}

export function needsAttention(ch){
  const l=ch.lifeState,w=l?.wellbeing||{},items=[];
  if(ch.pendingDecisions?.length)items.push({id:'decisions',label:`${ch.pendingDecisions.length} unresolved decision(s)`,target:'overview'});
  if(ch.age>=18&&ch.employmentStatus==='unemployed')items.push({id:'unemployed',label:'You are unemployed',target:'work'});
  if((ch.health?.conditions||[]).some(c=>!c.controlled&&(c.severity||1)>=2))items.push({id:'health',label:'A serious health condition is uncontrolled',target:'health'});
  if(ch.immigration?.residence?.visa?.yearsRemaining===1)items.push({id:'visa',label:'Your temporary visa expires after this year',target:'places'});
  if(ch.lastStatement?.hardship)items.push({id:'money',label:'Your household could not cover all expenses',target:'finances'});
  if(['Overloaded','Breaking point'].includes(w.stress))items.push({id:'stress',label:`Stress is ${w.stress.toLowerCase()}`,target:'health'});
  if((l?.measurements?.freeHoursWeek||0)<8&&ch.age>=6)items.push({id:'time',label:'You have almost no free time',target:'activities'});
  if(l?.exposures?.packYears>=10)items.push({id:'smoking',label:`Smoking exposure has reached ${l.exposures.packYears.toFixed(1)} pack-years`,target:'activities'});
  const lastCharity=ch.religionState?.charity?.history?.at?.(-1);if(lastCharity?.status==='unaffordable')items.push({id:'charity',label:'Your standing charity commitment was unaffordable',target:'religion'});
  return items;
}
