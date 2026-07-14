import { COUNTRIES, COUNTRY_BY_ID, COUNTRY_BY_NAME, locationsFor, medianWage } from './countries.js';
import { enroll } from './education.js';
import { destinationLanguageLevel, ensureLanguages, naturalizationLanguageRequirement, primaryLanguages } from './language.js';

const BLOCS = [
  { id: 'eu-eea', label: 'EU / EEA / Switzerland', members: ['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands','Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Switzerland'] },
  { id: 'nordic', label: 'Nordic mobility', members: ['Denmark','Finland','Iceland','Norway','Sweden'] },
  { id: 'cta', label: 'UK–Ireland Common Travel Area', members: ['United Kingdom','Ireland'] },
  { id: 'trans-tasman', label: 'Trans-Tasman', members: ['Australia','New Zealand'] },
  { id: 'gcc', label: 'Gulf Cooperation Council', members: ['Bahrain','Kuwait','Oman','Qatar','Saudi Arabia','United Arab Emirates'] },
  { id: 'caricom-full', label: 'CARICOM enhanced full movement', members: ['Barbados','Belize','Dominica','Saint Vincent and the Grenadines'] },
  { id: 'oecs', label: 'OECS Economic Union', members: ['Antigua and Barbuda','Dominica','Grenada','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines'] },
  { id: 'ecowas', label: 'ECOWAS', members: ['Benin','Burkina Faso','Cabo Verde',"Côte d'Ivoire",'The Gambia','Ghana','Guinea','Guinea-Bissau','Liberia','Mali','Niger','Nigeria','Senegal','Sierra Leone','Togo'] },
  { id: 'russia-belarus', label: 'Russia–Belarus Union mobility', members: ['Russia','Belarus'] },
];

const RESIDENCE_AREAS = [
  {id:'mercosur-residence',label:'MERCOSUR Residence Agreement',members:['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Paraguay','Peru','Uruguay']},
  {id:'andean-residence',label:'Andean Community Migration Statute',members:['Bolivia','Colombia','Ecuador','Peru']},
  {id:'eac-work-residence',label:'East African Community work/residence permit',members:['Burundi','DRC','Kenya','Rwanda','Somalia','South Sudan','Tanzania','Uganda']},
];

const CARICOM_CSME=['Antigua and Barbuda','The Bahamas','Barbados','Belize','Dominica','Grenada','Guyana','Jamaica','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Suriname','Trinidad and Tobago'];

const GOLDEN_VISA = {
  Portugal: 15, Spain: 15, Greece: 10, Malta: 20, Cyprus: 15,
  'United Arab Emirates': 20, Singapore: 30, 'United States': 20,
  Turkey: 12, 'New Zealand': 30,
};

export const ROUTE_LABELS = {
  treaty: 'Treaty freedom of movement', skilled: 'Skilled visa', student: 'Student visa',
  regional_residence: 'Regional residence agreement',
  temporary_work: 'Temporary work visa', working_holiday: 'Working holiday visa',
  golden: 'Investment / golden visa', family: 'Family reunification', asylum: 'Asylum',
  irregular: 'Irregular / smuggled entry',
};

const WORKING_HOLIDAY_PARTNERS = {
  Australia: ['United Kingdom','Canada','Ireland','Germany','France','Italy','Japan','South Korea','Taiwan','Hong Kong','Netherlands','Sweden','Norway','Denmark','Finland','United States','Chile','Argentina'],
  'New Zealand': ['United Kingdom','Canada','United States','Germany','France','Italy','Japan','South Korea','Taiwan','Hong Kong','Netherlands','Sweden','Norway','Denmark','Finland','Chile','Argentina','Brazil'],
  Italy: ['Japan'],
  Japan: ['Italy'],
};

function studentWorkFraction(target) {
  if (target.name === 'Australia') return 0.60; // 48 hours per fortnight, simplified against a 40h week
  if (target.name === 'New Zealand') return 0.625; // 25 hours per week
  if (target.incomeTier >= 4) return 0.50;
  if (target.incomeTier === 3) return 0.40;
  return 0.25;
}

function visaForRoute(route, target) {
  if (route === 'student') return { kind:'student', yearsRemaining:4, duration:4, maxWorkFraction:studentWorkFraction(target), countsForResidency:true, renewable:true, renewals:0 };
  if (route === 'temporary_work') {
    const duration = target.lawTier === 'strong' ? 3 : 2;
    return { kind:'temporary_work', yearsRemaining:duration, duration, maxWorkFraction:1, countsForResidency:false, renewable:true, renewals:0, employerTied:true };
  }
  if (route === 'regional_residence') return {kind:'regional_residence',yearsRemaining:2,duration:2,maxWorkFraction:1,countsForResidency:true,renewable:true,renewals:0,maxRenewals:1};
  if (route === 'working_holiday') return { kind:'working_holiday', yearsRemaining:1, duration:1, maxWorkFraction:1, countsForResidency:false,
    renewable:target.name==='Australia', renewals:0, maxRenewals:target.name==='Australia'?2:0, temporaryJobsOnly:true,
    regionalWorkMonths:0, studyMonthLimit:target.name==='Australia'?4:null };
  return null;
}

export function initImmigration(countryId) {
  return {
    originCountryId: countryId,
    citizenships: [countryId],
    residence: { countryId, status: 'citizen', route: 'birth', years: 0 },
    pending: null,
    history: [],
    languagePenaltyYears: 0,
    asylumEligibleUntil: -1,
    persecuted: false,
    deportationCount: 0,
  };
}

export function ensureImmigration(ch) {
  ch.immigration ||= initImmigration(ch.countryId);
  ch.immigration.citizenships ||= [ch.immigration.originCountryId || ch.countryId];
  ch.immigration.residence ||= { countryId: ch.countryId, status: 'citizen', route: 'birth', years: 0 };
  ch.immigration.history ||= [];
  ensureLanguages(ch,COUNTRY_BY_ID[ch.immigration.originCountryId||ch.countryId]);
  return ch.immigration;
}

function normalizeLanguage(text) {
  return String(text || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z]+/g, ' ').trim().split(/\s+/)
    .filter(x => x.length >= 4 && !['official','widely','spoken','other','language','languages','lingua','franca'].includes(x));
}

export function sharesLanguage(ch, target) {
  const known = new Set((ch.nativeLanguages || []).flatMap(normalizeLanguage));
  return (target.languages || []).flatMap(normalizeLanguage).some(x => known.has(x));
}

export function treatyFor(ch, target) {
  const im = ensureImmigration(ch);
  const citizenshipNames = im.citizenships.map(id => COUNTRY_BY_ID[id]?.name).filter(Boolean);
  return BLOCS.find(bloc => bloc.members.includes(target.name) && citizenshipNames.some(name => name !== target.name && bloc.members.includes(name))) || null;
}

export function residenceAgreementFor(ch,target){
  const citizenshipNames=ensureImmigration(ch).citizenships.map(id=>COUNTRY_BY_ID[id]?.name).filter(Boolean);
  return RESIDENCE_AREAS.find(area=>area.members.includes(target.name)&&citizenshipNames.some(name=>name!==target.name&&area.members.includes(name)))||null;
}

export function liquidFunds(ch) {
  return (ch.money?.cash || 0) + (ch.money?.bank || 0) + (ch.money?.household || 0);
}

export function portableNetWorth(ch) {
  const investments = Object.values(ch.investments || {}).reduce((a, b) => a + b, 0);
  const homeEquity = Math.max(0, (ch.homeValue || 0) - (ch.debts?.mortgage || 0));
  const businessEquity = Math.max(0, (ch.business?.capital || 0) - (ch.business?.loan || 0));
  return Math.max(0, liquidFunds(ch) + investments + homeEquity + businessEquity
    - (ch.debts?.studentLoan || 0) - (ch.debts?.business || 0));
}

export function pppConversionFactor(from, to) {
  return Math.max(0.35, Math.min(2.5, Math.sqrt((from.gdpPerCapita || 5000) / (to.gdpPerCapita || 5000))));
}

function hasFamilyConnection(ch, targetId) {
  const relatives = [ch.spouse, ...(ch.family || []).filter(p => ['Father','Mother'].includes(p.relation))].filter(Boolean);
  return relatives.some(p => p.alive && (p.countryId === targetId || (p.citizenships || []).includes(targetId)));
}

function smugglingMultiplier(from, target) {
  const distance = from.region === target.region ? 0 : 1;
  return Math.min(4, 1 + distance + Math.max(0, target.incomeTier - from.incomeTier) * 0.55);
}

function blockedReason(ch, target) {
  if (ch.age < 18) return 'You must be 18 unless moving with family.';
  if (['serving','career'].includes(ch.military?.status)) return 'You cannot emigrate while serving in the military.';
  if (ch.employmentStatus === 'prison') return 'You cannot emigrate while imprisoned.';
  if (target.id === ch.countryId) return 'You already live here.';
  if (ensureImmigration(ch).pending) return 'Another immigration application is pending.';
  return null;
}

export function immigrationOptions(ch, state, target) {
  ensureImmigration(ch);
  const from = COUNTRY_BY_ID[ch.countryId];
  const block = blockedReason(ch, target);
  const funds = liquidFunds(ch);
  const treaty = treatyFor(ch, target);
  const residenceAgreement=residenceAgreementFor(ch,target);
  const fee = medianWage(target) * 0.5;
  const goldenMultiple = GOLDEN_VISA[target.name];
  const goldenCost = goldenMultiple ? medianWage(target) * goldenMultiple : 0;
  const convertedPortable = portableNetWorth(ch) * pppConversionFactor(from, target);
  const smuggleCost = medianWage(from) * smugglingMultiplier(from, target);
  const asylumOpen = (ch.immigration.asylumEligibleUntil ?? -1) >= (state.year || 0) || ch.immigration.persecuted;
  const citizenNames = ch.immigration.citizenships.map(id=>COUNTRY_BY_ID[id]?.name).filter(Boolean);
  const whPartners = WORKING_HOLIDAY_PARTNERS[target.name] || [];
  const holidayEligible = ch.age >= 18 && ch.age <= 30 && citizenNames.some(name=>whPartners.includes(name))
    && !ch.immigration.history.some(h=>h.route==='working_holiday'&&h.toId===target.id);
  const currentName=from.name;
  const caricomSkills=CARICOM_CSME.includes(currentName)&&CARICOM_CSME.includes(target.name)
    && currentName!==target.name&&Math.max(ch.skills.academic,ch.skills.vocational)>=45;
  const routes = [
    { id:'treaty', label:ROUTE_LABELS.treaty, cost:medianWage(target)*0.05, immediate:true,
      eligible:!!treaty, reason:treaty ? treaty.label : 'No shared freedom-of-movement bloc.' },
    { id:'regional_residence',label:ROUTE_LABELS.regional_residence,cost:medianWage(target)*.08,immediate:true,
      eligible:!!residenceAgreement,reason:residenceAgreement?`${residenceAgreement.label}: two years of temporary residence with work rights, then apply for permanent residence.`:'No shared regional residence agreement.'},
    { id:'skilled', label:ROUTE_LABELS.skilled, cost:fee, wait:1,
      eligible:caricomSkills||(!!ch.education?.degree && Math.max(ch.skills.academic, ch.skills.vocational) >= 60 && target.incomeTier >= from.incomeTier),
      reason:caricomSkills?'CARICOM skilled-movement category modeled at Academic or Vocational 45+.':'Requires a university degree, Academic or Vocational 60+, and a destination at least as wealthy as your current country.' },
    { id:'student', label:ROUTE_LABELS.student, cost:medianWage(target)*0.2, wait:1,
      eligible:ch.skills.academic >= 50 && !ch.education?.degree && ch.age >= 18,
      reason:`Requires Academic 50+ and foreign-university admission. Modeled work limit: ${Math.round(studentWorkFraction(target)*40)} hours/week equivalent.` },
    { id:'temporary_work', label:ROUTE_LABELS.temporary_work, cost:medianWage(target)*0.3, wait:1,
      eligible:ch.age>=18&&Math.max(ch.skills.vocational,ch.skills.academic)>=35,
      reason:`Requires Academic or Vocational 35+. Employer-tied permission lasts ${target.lawTier==='strong'?3:2} years and does not initially count toward naturalization.` },
    { id:'working_holiday', label:ROUTE_LABELS.working_holiday, cost:medianWage(target)*0.12, wait:1,
      eligible:holidayEligible,
      reason:WORKING_HOLIDAY_PARTNERS[target.name]
        ? `Requires an eligible partner-country passport and age 18–30. One-time 12-month stay; temporary jobs only.${target.name==='Australia'?' A second year requires 3 months (88 days) of specified regional work; a third requires 6 months during year two. Study is limited to four months.':''}`
        : 'No modeled working-holiday program for this destination.' },
    { id:'golden', label:ROUTE_LABELS.golden, cost:goldenCost, immediate:true,
      eligible:!!goldenMultiple && convertedPortable >= goldenCost,
      reason:goldenMultiple ? `Requires an investment worth ${goldenMultiple}× the destination median wage.` : 'This country has no modeled investment-residence route.' },
    { id:'family', label:ROUTE_LABELS.family, cost:medianWage(target)*0.15, wait:1,
      eligible:hasFamilyConnection(ch,target.id), reason:'Requires a spouse or parent who is a citizen or resident there.' },
    { id:'asylum', label:ROUTE_LABELS.asylum, cost:0, wait:1, eligible:asylumOpen,
      reason:'Available after war or recorded persecution in your country of origin. Approval is not guaranteed.' },
    { id:'irregular', label:ROUTE_LABELS.irregular, cost:smuggleCost, wait:1, eligible:true,
      reason:'Always possible if you can pay: 2% death risk, 10% robbery risk, informal work only, and yearly deportation risk.' },
  ];
  for (const r of routes) {
    if (block) { r.eligible = false; r.reason = block; }
    else if (r.eligible && r.id !== 'golden' && funds < r.cost) { r.eligible = false; r.reason = `Insufficient liquid funds; requires ${Math.round(r.cost).toLocaleString()}.`; }
    else if (r.eligible && r.id === 'golden' && convertedPortable < r.cost) { r.eligible = false; r.reason = 'Insufficient total portable wealth after PPP conversion.'; }
    if ((ch.immigration.barredUntilAge||0)>ch.age&&r.id!=='irregular') {
      r.eligible=false;r.reason=`A previous overstay bars new legal applications until age ${ch.immigration.barredUntilAge}.`;
    }
    if ((ch.judicial?.barredUntilAge||0)>ch.age&&r.id!=='irregular') {
      r.eligible=false;r.reason=`A criminal record bars most legal immigration applications until age ${ch.judicial.barredUntilAge}.`;
    }
  }
  return routes;
}

function deductLiquid(ch, amount) {
  for (const key of ['bank','household','cash']) {
    const take = Math.min(ch.money[key] || 0, amount);
    ch.money[key] = (ch.money[key] || 0) - take;
    amount -= take;
  }
  return amount <= 0.01;
}

function liquidateAndConvert(ch, from, target) {
  const factor = pppConversionFactor(from, target);
  const investments = Object.values(ch.investments || {}).reduce((a,b)=>a+b,0);
  const homeEquity = Math.max(0,(ch.homeValue||0)-(ch.debts.mortgage||0));
  const businessEquity = Math.max(0,(ch.business?.capital||0)-(ch.business?.loan||0));
  const assets = liquidFunds(ch) + investments + homeEquity + businessEquity;
  ch.money = { cash:0, household:0, bank:assets*factor };
  for (const id of Object.keys(ch.investments || {})) ch.investments[id]=0;
  ch.ownsHome=false; ch.homeValue=0; ch.debts.mortgage=0; ch.business=null;
  if(ch.housing){ch.housing.tenure='private';ch.housing.application=null;}
  ch.debts.studentLoan=(ch.debts.studentLoan||0)*factor;
  ch.debts.business=(ch.debts.business||0)*factor;
  return factor;
}

export function moveCharacter(ch, target, route, age, { irregular=false, student=false, cost=0 }={}) {
  const from = COUNTRY_BY_ID[ch.countryId];
  const factor = liquidateAndConvert(ch, from, target);
  if (cost > 0) deductLiquid(ch,cost);
  if (route === 'golden' && cost > 0) ch.investments.realEstate = (ch.investments.realEstate || 0) + cost;
  const location = locationsFor(target)[0];
  ch.countryId=target.id; ch.countryName=target.name;
  ch.location={name:location.name,kind:location.kind,colMultiplier:location.colMultiplier};
  ch.job=null; ch.jobSearch.sector=null; ch.partTimeWork=false; ch.benefits.unemploymentYearsLeft=0;
  ch.employmentStatus=student?'student':irregular?'informal':'unemployed';
  if (student) { enroll(ch,target,'university'); ch.education._tuition=medianWage(target)*1.5; }
  const im=ensureImmigration(ch);
  const citizen=im.citizenships.includes(target.id);
  if(target.name==='South Korea'&&citizen&&ch.sex==='male'&&im.originCountryId!==target.id)im.koreanMilitaryDeferred=false;
  im.residence={countryId:target.id,status:citizen?'citizen':irregular?'irregular':route,route,years:0};
  im.residence.visa = citizen || irregular ? null : visaForRoute(route,target);
  // Queue destination work for routes whose permission already implies a
  // temporary job, so their first permitted year is not lost to another turn.
  if (route === 'working_holiday') ch.jobSearch.sector='informal';
  if (route === 'temporary_work') ch.jobSearch.sector=ch.skills.vocational>=ch.skills.academic?'industrial':'service';
  im.languagePenaltyYears=sharesLanguage(ch,target)?0:1;
  if(destinationLanguageLevel(ch,target)<60)ch.languageStudyTarget=primaryLanguages(target)[0]||null;
  im.history.push({age,fromId:from.id,toId:target.id,route,status:im.residence.status,pppFactor:factor});
  if(ch.spouse?.alive){ch.spouse.countryId=target.id;ch.spouse.residenceCountryId=target.id;}
  for(const child of(ch.family||[]).filter(p=>p.relation==='Child'&&p.alive)){child.countryId=target.id;child.residenceCountryId=target.id;}
  return factor;
}

export function submitMigration(state,targetId,routeId){
  const ch=state.character,target=COUNTRY_BY_ID[targetId];
  if(!target)return {ok:false,reason:'Unknown destination.'};
  const route=immigrationOptions(ch,state,target).find(r=>r.id===routeId);
  if(!route?.eligible)return {ok:false,reason:route?.reason||'Not eligible.'};
  if(route.immediate){
    const factor=moveCharacter(ch,target,routeId,ch.age,{cost:route.cost});
    return {ok:true,immediate:true,log:`Moved to ${target.name} through ${route.label}. PPP conversion ×${factor.toFixed(2)}.`};
  }
  if(route.cost>0&&!deductLiquid(ch,route.cost))return {ok:false,reason:'Insufficient liquid funds.'};
  ch.immigration.pending={targetId,route:routeId,yearsRemaining:route.wait||1,cost:route.cost,submittedAge:ch.age};
  return {ok:true,immediate:false,log:`Applied for ${route.label} in ${target.name}.`};
}

function deport(ch,age){
  const im=ensureImmigration(ch);
  const returnId=im.citizenships[0]||im.originCountryId;
  const target=COUNTRY_BY_ID[returnId]||COUNTRY_BY_ID[im.originCountryId];
  const factor=moveCharacter(ch,target,'deportation',age,{});
  im.residence.status=im.citizenships.includes(target.id)?'citizen':'legal';
  im.deportationCount=(im.deportationCount||0)+1;
  return {target,factor};
}

export function resolveImmigration(ch,state,rng){
  const im=ensureImmigration(ch),logs=[];
  let died=false;
  if(im.residence.countryId===ch.countryId&&im.residence.status!=='citizen'&&im.residence.status!=='irregular'
      && im.residence.visa?.countsForResidency!==false)im.residence.years+=1;
  if(im.pending){
    im.pending.yearsRemaining-=1;
    if(im.pending.yearsRemaining<=0){
      const app=im.pending,target=COUNTRY_BY_ID[app.targetId]; im.pending=null;
      if(app.route==='irregular'){
        if(rng.chance(.02)){ch.alive=false;ch.causeOfDeath='death during a smuggled border crossing';logs.push('Died during a dangerous smuggled border crossing.');died=true;}
        else{
          if(rng.chance(.10)){ch.money.bank*=.5;logs.push('Smugglers robbed you of half your remaining liquid money en route.');}
          const factor=moveCharacter(ch,target,'irregular',ch.age,{irregular:true});
          logs.push(`Entered ${target.name} without legal status. PPP conversion ×${factor.toFixed(2)}.`);
        }
      } else if(app.route==='asylum'){
        const accepted=rng.chance(target.welfareTier==='generous'&&target.lawTier==='strong'?.60:.25);
        if(accepted){const factor=moveCharacter(ch,target,'asylum',ch.age,{});logs.push(`Granted asylum in ${target.name}. PPP conversion ×${factor.toFixed(2)}.`);}
        else if(rng.chance(.35)){const factor=moveCharacter(ch,target,'irregular',ch.age,{irregular:true});logs.push(`Asylum was rejected; you remained in ${target.name} without legal status. PPP conversion ×${factor.toFixed(2)}.`);}
        else logs.push(`Asylum application to ${target.name} was rejected; you remained in ${ch.countryName}.`);
      } else {
        const factor=moveCharacter(ch,target,app.route,ch.age,{student:app.route==='student'});
        logs.push(`${ROUTE_LABELS[app.route]} approved. You moved to ${target.name}; PPP conversion ×${factor.toFixed(2)}.`);
      }
    }
  }
  if(!died&&im.residence.status==='irregular'&&!ch.judicial?.activeCase){
    const country=COUNTRY_BY_ID[ch.countryId];
    const enforcement=country.lawTier==='strong'?.10:country.lawTier==='medium'?.06:.03;
    const overstayMult=im.overstayViolations?1.5:1;
    if(rng.chance(enforcement*overstayMult)){
    const {target,factor}=deport(ch,ch.age);logs.push(`Immigration authorities deported you to ${target.name}. PPP conversion ×${factor.toFixed(2)}.`);
    }
  }
  return {logs,died};
}

export function naturalizationStatus(ch){
  const im=ensureImmigration(ch),country=COUNTRY_BY_ID[ch.countryId];
  const required=country.citizenship?.naturalizationYears||8;
  const language=naturalizationLanguageRequirement(country),languageLevel=destinationLanguageLevel(ch,country);
  const languageMet=!language.required||languageLevel>=language.required;
  const criminalBar=(ch.judicial?.barredUntilAge||0)>ch.age;
  const eligible=im.residence.status!=='citizen'&&im.residence.status!=='irregular'&&im.residence.years>=required&&languageMet&&!criminalBar;
  return {eligible,years:im.residence.years,required,remaining:Math.max(0,required-im.residence.years),dualAllowed:!!country.citizenship?.dualAllowed,
    languageRequired:language.required,language:language.language,languageLevel,languageMet,criminalBar};
}

export function tickTemporaryVisa(ch) {
  const im=ensureImmigration(ch),visa=im.residence.visa;
  if(!visa||im.residence.status==='citizen'||im.residence.status==='irregular')return null;
  visa.yearsRemaining-=1;
  if(visa.yearsRemaining>0)return null;
  if((ch.pendingDecisions||[]).some(d=>d.type==='visaExpiry'))return null;
  im.residence.status='visa_expiring';
  const renewalLimit=visa.maxRenewals??1;
  const australiaRegional=visa.kind!=='working_holiday'||ch.countryName!=='Australia'
    ||(visa.regionalWorkMonths||0)>=(visa.renewals===0?3:6);
  const canRenew=visa.renewable&&visa.renewals<renewalLimit&&australiaRegional;
  const options=[
    {id:'return',label:'Return before expiry',desc:'Leave legally and keep future visa options open.'},
    {id:'overstay',label:'Overstay',desc:'Become irregular; risk deportation and a future legal-visa bar.'},
  ];
  if(canRenew)options.splice(1,0,{id:'renew',label:visa.kind==='student'?'Extend / post-study visa':'Request extension',desc:'Pay a fee; approval depends on compliance and destination law.'});
  const regionalMissing=visa.kind==='working_holiday'&&ch.countryName==='Australia'&&visa.renewals<2&&!australiaRegional;
  return {type:'visaExpiry',default:'return',choice:null,visaKind:visa.kind,
    prompt:`Your ${ROUTE_LABELS[visa.kind]||visa.kind.replaceAll('_',' ')} expires now.${regionalMissing?` You did not complete the ${visa.renewals===0?'3-month (88-day)':'6-month'} specified regional-work requirement for another year.`:''}`,options};
}

export function resolveVisaExpiry(ch,state,rng,decision,log){
  const im=ensureImmigration(ch),country=COUNTRY_BY_ID[ch.countryId],visa=im.residence.visa;
  if(!visa)return;
  const choice=decision.choice||decision.default;
  if(choice==='overstay'){
    im.residence.status='irregular';im.residence.route='overstay';im.residence.visa=null;
    im.overstayViolations=(im.overstayViolations||0)+1;
    if(ch.judicial)ch.judicial.immigrationViolationDue=true;
    im.barredUntilAge=ch.age+(country.lawTier==='strong'?7:country.lawTier==='medium'?5:3);
    ch.partTimeWork=false;
    if(ch.education?.stage==='university'){ch.education.stage='dropout';ch.education.enrolled=false;}
    if(!ch.job)ch.employmentStatus='informal';
    log.push(`You overstayed in ${country.name}; your status became irregular and legal applications are barred until age ${im.barredUntilAge}.`);
    return;
  }
  if(choice==='renew'){
    const fee=medianWage(country)*.2;
    const affordable=liquidFunds(ch)>=fee;
    if(affordable)deductLiquid(ch,fee);
    if(visa.kind==='regional_residence'&&affordable){
      im.residence.visa=null;im.residence.status='legal';im.residence.route='regional_permanent';
      log.push(`Converted regional temporary residence into permanent residence in ${country.name}.`);return;
    }
    let approval=visa.kind==='working_holiday'&&country.name==='Australia'?1:country.lawTier==='strong'?.75:country.lawTier==='medium'?.60:.45;
    if(visa.kind==='student'&&ch.education?.stage==='graduated')approval+=.10;
    if(affordable&&rng.chance(approval)){
      visa.renewals+=1;
      if(visa.kind==='student'&&ch.education?.stage==='graduated'){
        visa.kind='temporary_work';visa.yearsRemaining=2;visa.duration=2;visa.maxWorkFraction=1;
        visa.countsForResidency=false;visa.employerTied=false;im.residence.status='temporary_work';
        ch.employmentStatus='unemployed';ch.partTimeWork=false;
        log.push(`Granted a two-year post-study work visa in ${country.name}.`);
      }else{
        visa.yearsRemaining=visa.kind==='working_holiday'?1:Math.max(1,visa.duration);
        if(visa.kind==='working_holiday')visa.regionalWorkMonths=0;
        im.residence.status=visa.kind;
        log.push(`Your temporary visa in ${country.name} was extended.`);
      }
      return;
    }
    log.push(`Your visa extension in ${country.name} was refused; you returned before becoming an overstayer.`);
  }
  const imHome=im.citizenships[0]||im.originCountryId;
  const home=COUNTRY_BY_ID[imHome]||COUNTRY_BY_ID[im.originCountryId];
  const factor=moveCharacter(ch,home,'voluntary_return',ch.age,{});
  log.push(`Returned legally to ${home.name} when your temporary visa ended. PPP conversion ×${factor.toFixed(2)}.`);
}

export function visaWorkFraction(ch){
  const visa=ensureImmigration(ch).residence.visa;
  return visa?.maxWorkFraction??1;
}

export function hasTemporaryVisa(ch){return !!ensureImmigration(ch).residence.visa;}

export function tickNationalityObligation(ch){
  const im=ensureImmigration(ch);
  if(im.citizenships.length<2)return null;
  const japan=COUNTRY_BY_NAME.Japan,korea=COUNTRY_BY_NAME['South Korea'];
  const foreignBornKoreanMale=ch.sex==='male'&&im.citizenships.includes(korea?.id)&&im.originCountryId!==korea?.id;
  if(foreignBornKoreanMale&&ch.age>=18&&!im.koreanMilitaryChoiceMade
    &&!(ch.pendingDecisions||[]).some(d=>d.type==='nationalityChoice'&&d.koreanMilitaryDeadline)){
    return {type:'nationalityChoice',restrictedId:korea.id,koreanMilitaryDeadline:true,default:'retain_korean',choice:null,
      prompt:'The March nationality-renunciation deadline in the year you turn 18 has arrived. Keeping Korean citizenship preserves the military obligation.',
      options:[
        {id:'renounce_korean',label:'Renounce Korean citizenship',desc:'Relinquish it before the military-service deadline.'},
        {id:'retain_korean',label:'Retain Korean citizenship',desc:'Remain liable for Korean military service; overseas deferment applies while you continue living abroad.'},
      ]};
  }
  const restricted=im.citizenships.includes(japan?.id)&&ch.age>=20?japan
    :im.citizenships.includes(korea?.id)&&ch.age>=22?korea:null;
  if(!restricted||(im.nationalityChoices||[]).includes(restricted.id)||(im.nationalityDeferredUntil?.[restricted.id]||0)>ch.age
    ||(ch.pendingDecisions||[]).some(d=>d.type==='nationalityChoice'&&d.restrictedId===restricted.id))return null;
  const koreanServiceLocked=restricted?.name==='South Korea'&&foreignBornKoreanMale&&!ch.military?.obligationMet;
  const selectable=koreanServiceLocked?[korea.id]:im.citizenships;
  const options=selectable.map(id=>({id:`keep:${id}`,label:`Choose ${COUNTRY_BY_ID[id]?.name}`,desc:'Keep this citizenship and relinquish the others.'}));
  if(restricted.name==='South Korea')options.push({id:'pledge',label:'File Korean dual-nationality pledge',desc:'Keep both, while Korean duties including military obligations still apply.'});
  options.push({id:'miss',label:'Miss the deadline',desc:`Risk an enforcement notice and eventual loss of ${restricted.name} citizenship.`});
  return {type:'nationalityChoice',restrictedId:restricted.id,default:'miss',choice:null,
    prompt:`Your ${restricted.name} multiple-nationality choice deadline has arrived.`,options};
}

export function resolveNationalityChoice(ch,rng,decision,log){
  const im=ensureImmigration(ch),restricted=COUNTRY_BY_ID[decision.restrictedId],choice=decision.choice||decision.default;
  im.nationalityChoices||=[];
  if(decision.koreanMilitaryDeadline){
    im.koreanMilitaryChoiceMade=true;
    if(choice==='renounce_korean'){
      im.citizenships=im.citizenships.filter(id=>id!==decision.restrictedId);
      log.push('Renounced Korean citizenship before the overseas-born male military deadline.');
    }else{
      im.koreanMilitaryDeferred=true;
      log.push('Retained Korean citizenship. Military service is deferred while you remain an eligible overseas resident, but returning to reside in South Korea can reactivate the draft.');
    }
    return;
  }
  if(choice==='pledge'){
    im.nationalityChoices.push(decision.restrictedId);
    log.push(`Filed the Korean nationality pledge and retained multiple citizenships; Korean legal and military duties remain.`);
  }
  else if(choice.startsWith('keep:')){
    const id=choice.slice(5);im.citizenships=[id];
    im.nationalityChoices.push(decision.restrictedId);
    log.push(`Chose ${COUNTRY_BY_ID[id]?.name} citizenship and relinquished the others.`);
  }else{
    if(restricted?.name==='South Korea'&&ch.sex==='male'&&!ch.military?.obligationMet){
      im.nationalityDeferredUntil||={};im.nationalityDeferredUntil[decision.restrictedId]=ch.age+2;
      log.push('You missed the Korean nationality filing, but military liability prevents treating Korean citizenship as automatically relinquished.');
      return;
    }
    const enforced=rng.chance(restricted?.name==='Japan'?.35:.25);
    if(enforced){
      im.citizenships=im.citizenships.filter(id=>id!==decision.restrictedId);im.nationalityChoices.push(decision.restrictedId);
      log.push(`After missing the nationality-selection obligation, authorities withdrew your ${restricted?.name} citizenship.`);
    }else{
      im.nationalityDeferredUntil||={};im.nationalityDeferredUntil[decision.restrictedId]=ch.age+2;
      log.push(`You missed the ${restricted?.name} nationality deadline. No loss was enforced yet, but another review may follow.`);
    }
  }
}

export function naturalize(ch){
  const status=naturalizationStatus(ch),im=ensureImmigration(ch),country=COUNTRY_BY_ID[ch.countryId];
  if(!status.eligible)return false;
  im.citizenships=country.citizenship.dualAllowed?[...new Set([...im.citizenships,country.id])]:[country.id];
  im.residence.status='citizen';im.residence.route='naturalized';
  if(ch.age>=country.military.serviceAge&&ch.age<=country.military.serviceAge+5)ch.military.obligationMet=false;
  im.history.push({age:ch.age,toId:country.id,route:'naturalization',status:'citizen'});
  return true;
}

export function isIrregular(ch){return ensureImmigration(ch).residence.status==='irregular';}
export function isLegalResident(ch){return !isIrregular(ch);}
export function treatyBlocs(){return BLOCS;}
export function goldenVisaCountries(){return COUNTRIES.filter(c=>GOLDEN_VISA[c.name]).map(c=>({country:c,multiple:GOLDEN_VISA[c.name]}));}
