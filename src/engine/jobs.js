// Career families, entry requirements, pay, risk, and progression.
import { medianWage } from './countries.js';
import { genderRightsProfile, needsHusbandWorkApproval } from './genderRights.js';
import { healthWorkCapacity } from './health.js';
import { socialConfidenceFactor } from './lifeState.js';
import { isIrregular } from './immigration.js';
import { workLanguageMultiplier } from './language.js';
import { recordPenalty } from './judicial.js';
import { relevantExperience, recordWorkYear, sectorYears, vocationalYears } from './experience.js';

function secondary(ch){return ['secondary_done','graduated'].includes(ch.education?.stage)||!!ch.education?.degree||!!ch.education?.vocational;}
function degree(ch){return !!ch.education?.degree;}
function vocational(ch){return !!ch.education?.vocational||vocationalYears(ch)>=2;}
const y=(sector,n)=>(ch)=>sectorYears(ch,sector)>=n;
const yd=(sector,n)=>(ch)=>degree(ch)&&sectorYears(ch,sector)>=n;
const rung=(title,mult,gate=()=>true,risk=.01)=>({title,mult,gate,risk});

export const SECTORS={
  agriculture:{label:'Agriculture',managementFrom:3,rungs:[rung('Farm laborer',.48),rung('Farm worker',.68,y('agriculture',2),.025),rung('Skilled grower',.95,y('agriculture',5),.02),rung('Farm supervisor',1.35,y('agriculture',9),.015)]},
  construction:{label:'Construction',managementFrom:3,rungs:[rung('Construction helper',.62,()=>true,.04),rung('Apprentice craft worker',.82,y('construction',2),.035),rung('Qualified craft worker',1.25,ch=>vocational(ch)&&sectorYears(ch,'construction')>=4,.03),rung('Site supervisor',1.65,y('construction',9),.025)]},
  manufacturing:{label:'Manufacturing',managementFrom:3,rungs:[rung('Production worker',.7,()=>true,.035),rung('Machine operator',.9,y('manufacturing',2),.03),rung('Senior technician',1.2,ch=>vocational(ch)&&sectorYears(ch,'manufacturing')>=5,.025),rung('Production supervisor',1.55,y('manufacturing',10),.02)]},
  retail_hospitality:{label:'Retail & Hospitality',managementFrom:3,rungs:[rung('Service crew',.62),rung('Experienced associate',.78,y('retail_hospitality',2)),rung('Team lead',1.0,y('retail_hospitality',5)),rung('Store or venue manager',1.45,y('retail_hospitality',10))]},
  office_admin:{label:'Office & Administration',managementFrom:3,rungs:[rung('Administrative assistant',.82,ch=>secondary(ch)),rung('Coordinator',1.0,y('office_admin',3)),rung('Senior administrator',1.25,y('office_admin',7)),rung('Administration manager',1.65,y('office_admin',12))]},
  education:{label:'Education',managementFrom:3,rungs:[rung('Teaching assistant',.78,ch=>secondary(ch)),rung('Teacher',1.25,ch=>degree(ch)||ch.education?.vocational),rung('Senior teacher',1.55,yd('education',6)),rung('School administrator',2.0,yd('education',12))]},
  healthcare:{label:'Healthcare',managementFrom:3,rungs:[rung('Care aide',.75,ch=>secondary(ch),.025),rung('Licensed health worker',1.35,ch=>degree(ch)||vocational(ch),.025),rung('Senior clinician',2.25,yd('healthcare',7),.02),rung('Clinical director',3.1,yd('healthcare',14),.015)]},
  technology:{label:'Technology',managementFrom:3,rungs:[rung('Technical support worker',.95,ch=>secondary(ch)),rung('Developer or analyst',1.55,ch=>degree(ch)||vocational(ch)),rung('Senior technical specialist',2.25,ch=>sectorYears(ch,'technology')>=6&&(degree(ch)||vocational(ch))),rung('Technology manager',3.0,yd('technology',12))]},
  government:{label:'Government & Civil Service',managementFrom:3,citizen:true,rungs:[rung('Public service assistant',.82,ch=>secondary(ch)),rung('Civil servant',1.15,ch=>secondary(ch)&&sectorYears(ch,'government')>=3),rung('Senior civil servant',1.55,y('government',8)),rung('Department manager',2.1,y('government',14))]},
  public_safety:{label:'Public Safety',managementFrom:3,citizen:true,rungs:[rung('Public safety recruit',.9,ch=>secondary(ch),.04),rung('Public safety officer',1.2,y('public_safety',3),.04),rung('Senior officer',1.55,y('public_safety',8),.035),rung('Command officer',2.05,y('public_safety',14),.025)]},
  law:{label:'Law',managementFrom:3,citizen:true,rungs:[rung('Legal assistant',.9,ch=>secondary(ch)),rung('Lawyer',1.85,ch=>degree(ch)),rung('Senior lawyer',2.8,yd('law',7)),rung('Partner or judge',4.0,ch=>degree(ch)&&sectorYears(ch,'law')>=15)]},
  media_creative:{label:'Media & Creative',managementFrom:3,rungs:[rung('Creative assistant',.68,ch=>secondary(ch)),rung('Creator or reporter',1.0,y('media_creative',2)),rung('Senior creative professional',1.55,y('media_creative',7)),rung('Editor or creative director',2.2,y('media_creative',13))]},
  transport_local:{label:'Local Transportation & Delivery',managementFrom:3,rungs:[rung('Bicycle courier',.58,ch=>ch.age>=18,.035),rung('Delivery or taxi driver',.82,ch=>ch.transportation?.license?.status==='licensed',.04),rung('Bus driver or driving instructor',1.12,ch=>ch.transportation?.license?.commercial&&sectorYears(ch,'transport_local')>=4,.035),rung('Transport supervisor',1.5,y('transport_local',9),.02)]},
  transport_heavy:{label:'Trucking & Logistics',managementFrom:3,rungs:[rung('Warehouse and dispatch worker',.7,ch=>ch.age>=18,.035),rung('Commercial truck driver',1.05,ch=>ch.transportation?.license?.commercial,.05),rung('Senior driver or dispatcher',1.35,y('transport_heavy',6),.04),rung('Fleet and logistics manager',1.85,y('transport_heavy',12),.025)]},
  rail_transit:{label:'Rail & Public Transit',managementFrom:3,rungs:[rung('Station or transit worker',.72,ch=>secondary(ch),.025),rung('Train or metro operator',1.15,ch=>secondary(ch)&&sectorYears(ch,'rail_transit')>=2,.035),rung('Senior rail controller',1.55,y('rail_transit',7),.025),rung('Transit operations manager',2.05,y('rail_transit',13),.02)]},
  aviation_maritime:{label:'Aviation & Maritime',managementFrom:3,rungs:[rung('Ground, port, or cabin worker',.82,ch=>secondary(ch),.03),rung('Licensed flight or ship officer',1.7,ch=>degree(ch)||vocational(ch),.035),rung('Senior pilot or ship officer',2.7,ch=>(degree(ch)||vocational(ch))&&sectorYears(ch,'aviation_maritime')>=7,.025),rung('Aviation or maritime director',3.5,yd('aviation_maritime',14),.018)]},
  informal:{label:'Informal Work',managementFrom:99,rungs:[rung('Casual laborer',.4),rung('Experienced informal worker',.58,y('informal',3),.025),rung('Independent vendor',.78,y('informal',8),.02)]},
  // Kept for old generated lives and historical records, but no longer offered.
  service:{label:'General Service (legacy)',legacy:true,managementFrom:2,rungs:[rung('Shop clerk',.7,ch=>secondary(ch)),rung('Office worker',1,y('service',2)),rung('Manager',1.6,y('service',7))]},
  industrial:{label:'Industrial Trades (legacy)',legacy:true,managementFrom:2,rungs:[rung('Apprentice',.6),rung('Tradesperson',1.1,ch=>vocational(ch)),rung('Site boss',1.8,y('industrial',9))]},
  professional:{label:'Professional (legacy)',legacy:true,managementFrom:2,rungs:[rung('Junior professional',1.5,ch=>degree(ch)),rung('Senior professional',2.3,yd('professional',5)),rung('Partner or chief',3.5,yd('professional',13))]},
};

export const RETIREMENT_AGE=65;

function entryReason(ch,country,key,sec){
  if(sec.legacy)return 'This broad legacy category has been replaced by specific careers.';
  if(ch.employmentStatus==='prison')return 'Unavailable while imprisoned.';
  if(isIrregular(ch)&&key!=='informal')return 'Legal work status is required.';
  const visa=ch.immigration?.residence?.visa;
  if(visa?.employerTied&&visa.employerSector&&key!==visa.employerSector)return 'Your visa is tied to another field.';
  if(sec.citizen&&!(ch.immigration?.citizenships||[ch.countryId]).includes(country.id))return 'Local citizenship is required.';
  if(!sec.rungs[0].gate(ch))return key==='healthcare'||key==='education'||key==='technology'||key==='law'?'A relevant qualification is required.':'Finish secondary school or gain the required training.';
  return null;
}

export function careerOptions(ch,country){return Object.entries(SECTORS).filter(([,s])=>!s.legacy).map(([key,sec])=>({key,label:sec.label,entryTitle:sec.rungs[0].title,risk:sec.rungs[0].risk,reason:entryReason(ch,country,key,sec),eligible:!entryReason(ch,country,key,sec)}));}
export function eligibleSectors(ch,country={id:ch.countryId}){return careerOptions(ch,country).filter(x=>x.eligible);}

export function wageFor(country,job,ch=null){if(!job)return 0;const sec=SECTORS[job.sector],r=sec?.rungs[job.rung];return sec&&r?medianWage(country)*r.mult*workLanguageMultiplier(ch,country):0;}
export function jobTitle(job){if(!job)return null;const sec=SECTORS[job.sector],r=sec?.rungs[job.rung];return r?`${r.title} (${sec.label})`:'Unknown occupation';}
export function recordCareerEvent(ch,type,job,note=''){if(!job)return;ch.careerHistory||=[];const title=SECTORS[job.sector]?.rungs[job.rung]?.title||job.sector;ch.careerHistory.push({age:ch.age,type,sector:job.sector,title,note});if(ch.careerHistory.length>80)ch.careerHistory.shift();}

export function attemptHire(ch,country,sectorKey,rng,{firstJob=false}={}){
  const sec=SECTORS[sectorKey],reason=sec&&entryReason(ch,country,sectorKey,sec);
  if(!sec||reason)return{hired:false,log:reason||'That career does not exist.'};
  if(needsHusbandWorkApproval(ch,country))return{hired:false,log:'Your household’s legal restrictions prevented you from taking paid work.'};
  const unemp=(firstJob?(country.youthUnemployment??country.unemployment*2):country.unemployment)/100;
  const credentialBonus=degree(ch) ? .12 : ch.education?.vocational ? .08 : secondary(ch) ? .04 : 0;
  const margin=Math.min(.28,relevantExperience(ch,sectorKey)*.025)+credentialBonus+(ch.veteran?.05:0);
  const rights=ch.sex==='female'?genderRightsProfile(country).femaleHireMult:1;
  const capacity=healthWorkCapacity(ch,sectorKey),healthMult=Math.max(.35,1-(1-capacity)*(country.lawTier==='strong'?.35:country.lawTier==='medium'?.65:1));
  const p=Math.max(.03,Math.min(.9,(.68-unemp+margin-demographicHiringPenalty(ch,country)-recordPenalty(ch,sectorKey))*rights*healthMult));
  if(!rng.chance(p))return{hired:false,log:'Job search unsuccessful this year.'};
  ch.job={sector:sectorKey,rung:0,yearsAtRung:0};ch.employmentStatus=sectorKey==='informal'?'informal':'employed';
  const visa=ch.immigration?.residence?.visa;if(visa?.employerTied&&!visa.employerSector)visa.employerSector=sectorKey;
  recordCareerEvent(ch,'hired',ch.job);return{hired:true,log:`Hired as ${sec.rungs[0].title} (${sec.label}).`};
}

function demographicHiringPenalty(ch,country){const minority=(list,value)=>{const m=(list||[]).find(x=>x.name===value);return m&&m.pct<10 ? .025 : 0;};return Math.min(.05,minority(country.ethnicGroups,ch.ethnicity)+minority(country.religions,ch.religion));}

export function resolveEmployment(ch,country,rng,{layoffMult=1}={}){
  const log=[],job=ch.job;if(!job)return log;const sec=SECTORS[job.sector];if(!sec)return log;
  job.yearsAtRung++;recordWorkYear(ch,job.sector,job.rung,sec.managementFrom);const capacity=healthWorkCapacity(ch,job.sector);
  const leave=(type,text)=>{recordCareerEvent(ch,type,job,text);ch.benefits||={};ch.benefits.lastWage=wageFor(country,job,ch);ch.job=null;ch.employmentStatus='unemployed';ch.benefits.unemploymentYearsLeft=-1;log.push(text);};
  if(capacity<.45&&rng.chance((.45-capacity)*.35)){leave('health departure',`Health limitations forced you to leave ${sec.rungs[job.rung].title}.`);return log;}
  const injuryRisk=(sec.rungs[job.rung].risk||.01)*(1-Math.max(.25,capacity));if(rng.chance(injuryRisk)){ch.stats.health=Math.max(0,ch.stats.health-rng.int(2,8));log.push(`A workplace injury affected your health in ${sec.label}.`);}
  if(rng.chance(.025*layoffMult)){leave('laid off',`Laid off from ${sec.rungs[job.rung].title}.`);return log;}
  if(job.rung>0&&layoffMult>1&&rng.chance(.015*layoffMult)){
    job.rung--;job.yearsAtRung=0;recordCareerEvent(ch,'demoted',job,'Economic restructuring');log.push(`Economic restructuring moved you to ${sec.rungs[job.rung].title}.`);return log;
  }
  const next=sec.rungs[job.rung+1];if(ch.immigration?.residence?.visa?.temporaryJobsOnly||!next||!next.gate(ch)||job.yearsAtRung<3)return log;
  const economy=Math.max(.55,Math.min(1.15,1-(country.unemployment||7)/100+(country.gdpGrowth||2)/100));
  const vacancy=.55/(1+job.rung*.65),merit=Math.min(.15,(socialConfidenceFactor(ch)-1)*.12+relevantExperience(ch,job.sector)/300),p=Math.max(.025,Math.min(.22,(.07+merit)*vacancy*economy*Math.max(.5,capacity)));
  if(rng.chance(p)){job.rung++;job.yearsAtRung=0;recordCareerEvent(ch,'promoted',job);log.push(`Promoted to ${next.title}.`);}
  return log;
}
