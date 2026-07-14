import { medianWage } from './countries.js';
import { genderRightsProfile } from './genderRights.js';
import { ensureHousing } from './housing.js';
import { addSkillXp, skillLevel } from './skills.js';
import { canMarry, isSameSexCouple, relationshipLawProfile } from './relationshipLaws.js';
import { applyMarriageName, displayName, generateRelatedName, hydrateNames } from './names.js';
import { ensureMemberEconomy, resolveHouseholdEconomy } from './household.js';

function clamp(v) { return Math.max(0, Math.min(100, v)); }
function pickDistribution(rng, list, fallback) { return list?.length ? rng.weighted(list, x => x.pct || 1).name : fallback; }
const TRAITS = ['ambitious','caring','independent','social','cautious','creative','resilient','curious'];
function traits(rng) { return [...new Set([rng.pick(TRAITS), rng.pick(TRAITS)])]; }
export function personAge(ch, person) { return Math.max(0, ch.age - person.ageOffset); }

function ensurePhase10(ch) {
  ch.social ||= { friendIntent: false, friends: [], datingPreference: 'anyone' };
  ch.relationshipHistory ||= [];
  ch.fertility ||= { contraception: 'none', pregnancy: null, knownInfertility: false, treatment: null };
  ch.familyPlans ||= { adoption: null, foster: false, caregivingId: null, reconciliationId: null };
  ch.safety ||= { concern: false, seekHelpIntent: false, safetyPlan: false };
  ch.relationshipStatus ||= ch.spouse?.alive ? 'married' : ch.partner?.alive ? 'dating' : 'single';
  ch.education.credentials ||= ch.education.degree ? ["Bachelor's degree"] : ch.education.vocational ? ['Vocational certificate'] : [];
  return ch;
}

function makePartner(ch, country, rng) {
  const pref = ch.social?.datingPreference || 'anyone';
  let sex;
  if (pref === 'same') sex = ch.sex;
  else if (pref === 'opposite') sex = ch.sex === 'male' ? 'female' : 'male';
  else sex = rng.chance(.18) ? ch.sex : ch.sex === 'male' ? 'female' : 'male';
  const sameGroup = rng.chance(.7);
  const partner = {
    id: `partner-${ch.age}`, relation: 'Partner', alive: true, sex,
    ageOffset: ch.age - Math.max(16, ch.age + rng.int(-4, 4)),
    ethnicity: sameGroup ? ch.ethnicity : pickDistribution(rng, country.ethnicGroups, ch.ethnicity),
    religion: rng.chance(.75) ? ch.religion : pickDistribution(rng, country.religions, ch.religion),
    personality: traits(rng), relationshipScore: 62 + rng.int(-8, 8), yearsTogether: 0,
    working: false, engaged: false, conflictLevel: rng.int(0, 12),
    countryId: country.id, residenceCountryId: country.id, citizenships: [country.id],
  };
  generateRelatedName(rng,country,partner,ch,{familyName:''});
  partner.compatibility = compatibilityScore(ch, partner);
  return partner;
}

export function compatibilityScore(ch, other) {
  if (!other) return 0;
  let score = 48;
  if (ch.religion === other.religion) score += 12;
  if (ch.ethnicity === other.ethnicity) score += 5;
  const gap = Math.abs(ch.age - personAge(ch, other));
  score += Math.max(-12, 10 - gap * 2);
  const shared = (other.personality || []).filter(x => (ch.personality || []).includes(x)).length;
  score += shared * 8;
  return clamp(score);
}

function spouseWork(ch, country, rng, spouse) {
  const profile = genderRightsProfile(country);
  const base = country.incomeTier >= 4 ? .72 : country.incomeTier >= 2 ? .58 : .42;
  spouse.working = rng.chance(base * (spouse.sex === 'female' ? profile.femaleHireMult : 1));
  spouse.wageMult = .55 + rng.next() * .9;
}

function makeChild(ch, country, rng, origin = 'birth') {
  const n = (ch.family || []).filter(p => p.relation === 'Child').length + 1;
  const citizenships = [...new Set([...(ch.immigration?.citizenships || [ch.countryId]), ...(ch.spouse?.citizenships || ch.partner?.citizenships || []), ...(country.citizenship?.jusSoli ? [country.id] : [])])];
  const child = {
    id: `child-${ch.age}-${n}`, relation: 'Child', childNumber: n, name: null, alive: true,
    sex: rng.chance(.5) ? 'male' : 'female', ageOffset: ch.age,
    ethnicity: origin === 'birth' && rng.chance(.8) ? ch.ethnicity : pickDistribution(rng, country.ethnicGroups, ch.ethnicity),
    religion: rng.chance(.8) ? ch.religion : ch.spouse?.religion || ch.religion,
    countryId: country.id, residenceCountryId: country.id, citizenships,
    relationshipScore: 75, personality: traits(rng), origin,
    educationOutcome: 'not school age', career: null, partnerStatus: 'single', ownChildren: 0,
    healthConditions: [], favoritism: 'neutral', estranged: false,
    stats: { health: clamp(ch.stats.health + rng.int(-10,10)), happiness:60+rng.int(-8,8), intelligence:clamp(ch.stats.intelligence+rng.int(-10,10)), fitness:50+rng.int(-10,10), charisma:45+rng.int(-10,10) },
    skills: { academic:0, vocational:0, business:0, political:0 }, atHome:true, working:false, personalSavings:0, grandchildren:[],
  };
  generateRelatedName(rng,country,child,ch);ensureMemberEconomy(child,ch,country,rng);return child;
}

function resolveFriends(ch, country, rng, social, logs) {
  const friends = ch.social.friends;
  if (ch.social.friendIntent && ch.age >= 6 && rng.chance(.35 + ch.stats.charisma / 300)) {
    const friend = { id:`friend-${ch.age}-${friends.length}`, relation:'Friend', alive:true, sex:rng.chance(.5)?'male':'female', ageOffset:rng.int(-3,3), relationshipScore:55+rng.int(0,20), personality:traits(rng), yearsKnown:0, countryId:country.id };
    generateRelatedName(rng,country,friend,ch,{familyName:''});friends.push(friend); logs.push(`You became friends with ${displayName(friend)}.`);
  }
  ch.social.friendIntent = false;
  for (const f of friends) {
    if (!f.alive) continue;
    f.yearsKnown = (f.yearsKnown || 0) + 1;
    f.relationshipScore = clamp((f.relationshipScore || 50) + (social ? 4 : -2));
    if (f.relationshipScore < 15 && rng.chance(.25)) { f.alive=false; f.ended=true; logs.push('A friendship faded after a long period of distance.'); }
  }
  if (!friends.some(f=>f.alive) && ch.age >= 12) ch.stats.happiness = clamp(ch.stats.happiness - 1);
}

function resolveChildDevelopment(ch, p, country, rng, housing, logs) {
  const age = personAge(ch,p);
  if (p.relationshipScore != null && !(ch.selectedActivities||[]).includes('family')) p.relationshipScore=clamp(p.relationshipScore-2);
  if (age === 6) { p.educationOutcome='primary school'; logs.push(`${p.name||`Child ${p.childNumber}`} started primary school.`); }
  if (age >= 6 && age < 18) {
    addSkillXp(p,'academic',country.educationTier*.8);
    if (rng.chance(.012 * (4-country.incomeTier))) { p.healthConditions.push('childhood chronic condition'); p.stats.health=clamp(p.stats.health-8); logs.push(`${p.name||`Child ${p.childNumber}`} developed a chronic health condition.`); }
  }
  if (age === 18) {
    p.educationOutcome = skillLevel(p.skills.academic)>=5 && country.educationTier>=3 ? 'secondary graduate; pursuing higher education' : skillLevel(p.skills.academic)>=3 ? 'secondary graduate' : 'limited schooling';
    logs.push(`${p.name||`Child ${p.childNumber}`} reached adulthood with ${p.educationOutcome}.`);
  }
  if (age >= 18) {
    if (!p.career && rng.chance(.42+country.incomeTier*.06)) { p.career=skillLevel(p.skills.academic)>=5?'professional work':skillLevel(p.skills.vocational)>=3?'skilled trade':'general work'; logs.push(`${p.name||`Child ${p.childNumber}`} began ${p.career}.`); }
    if (age>=20 && p.partnerStatus==='single' && rng.chance(.12)) { p.partnerStatus='partnered'; logs.push(`${p.name||`Child ${p.childNumber}`} entered a serious relationship.`); }
    if (age>=22 && p.partnerStatus==='partnered' && rng.chance(.12)) { p.partnerStatus='married'; logs.push(`${p.name||`Child ${p.childNumber}`} married.`); }
    if (age>=22 && ['partnered','married'].includes(p.partnerStatus) && rng.chance(Math.min(.18,(country.fertility||2)/18))) { const grandchild={id:`grandchild-${p.id}-${(p.grandchildren||[]).length+1}`,relation:'Grandchild',alive:true,sex:rng.chance(.5)?'male':'female',ageOffset:ch.age,countryId:country.id,relationshipScore:65};generateRelatedName(rng,country,grandchild,ch,{familyName:p.identity?.familyName});p.grandchildren||=[];p.grandchildren.push(grandchild);p.ownChildren=p.grandchildren.length;logs.push(`${displayName(p)} had ${displayName(grandchild)}; you became a grandparent.`); }
    const moveChance=Math.max(0,.04+(age-20)*.025+(p.working?.08:0)+(p.personalSavings>medianWage(country)*.6?.08:0)+housing.adultChildContributionRate*.2);
    if(p.atHome!==false&&rng.chance(Math.min(.65,moveChance))){p.atHome=false;logs.push(`${p.name||`Child ${p.childNumber}`} moved out of the household.`);}
  }
}

function resolvePregnancy(ch,country,rng,logs,expenses) {
  const f=ch.fertility;
  if (f.pregnancy && ch.age > f.pregnancy.conceivedAge) {
    const pregnantAge=f.pregnancy.pregnantPersonAge;
    const miscarriage=.08+(pregnantAge>=35?.12:0)+(pregnantAge>=40?.18:0);
    if(rng.chance(miscarriage)){logs.push('The pregnancy ended in miscarriage.');ch.stats.happiness=clamp(ch.stats.happiness-8);}
    else {ch.family.push(makeChild(ch,country,rng));logs.push(`A child was born after a ${f.pregnancy.planned?'planned':'surprise'} pregnancy.`);expenses.push({label:'Pregnancy and childbirth',amount:medianWage(country)*({generous:.02,moderate:.08,minimal:.18,none:.3}[country.welfareTier]||.1),household:true});}
    f.pregnancy=null;
  }
  if (f.pregnancy) return;
  const mate=ch.spouse?.alive?ch.spouse:ch.partner?.alive?ch.partner:null;
  if (!mate && f.treatment!=='active') return;
  const sameSex=mate ? isSameSexCouple(ch,mate) : false;
  const pregnantAge=ch.sex==='female'?ch.age:mate?.sex==='female'?personAge(ch,mate):null;
  const assisted=f.treatment==='active';
  if(pregnantAge==null&&!assisted)return;
  const ageFactor=pregnantAge==null?1:pregnantAge<30?1:pregnantAge<35?.75:pregnantAge<40?.35:.08;
  const base=Math.min(.30,(country.fertility||2)/12)*ageFactor*(f.knownInfertility?.25:1);
  const contraception={none:1,barrier:.25,reliable:.06}[f.contraception]??1;
  let chance=ch.childrenIntent==='try'?base:ch.childrenIntent==='avoid'?base*contraception:base*.35*contraception;
  if(sameSex)chance=assisted?.28:0;
  if(assisted){expenses.push({label:'Fertility treatment',amount:medianWage(country)*.35,household:true});f.treatment=null;}
  if((pregnantAge==null||pregnantAge>45)&&!assisted)chance=0;
  if(rng.chance(chance)) f.pregnancy={conceivedAge:ch.age,planned:ch.childrenIntent==='try'||assisted,pregnantPersonAge:pregnantAge??Math.min(42,ch.age)};
  else if(ch.childrenIntent==='try'&&rng.chance(.08)){f.knownInfertility=true;logs.push('After difficulty conceiving, fertility problems were identified.');}
}

function endMarriage(ch,country,logs,reason='divorce') {
  const former=ch.spouse;if(!former)return;
  ch.relationshipHistory.push({status:reason,age:ch.age,sex:former.sex,yearsTogether:former.yearsTogether||0});
  if(reason==='divorce'){
    if(ch.judicial){ch.judicial.divorceDue=Math.max(0,(ch.money.bank||0)*.5);logs.push('Your marriage ended in divorce; property and support were referred to court.');}
    else ch.money.bank*=.5;
  }
  ch.spouse=null;ch.partner=null;ch.relationshipStatus=reason==='widowed'?'widowed':'single';ch.familyRights.workPermission=false;
}

export function resolveFamily(ch,country,rng){
  ensurePhase10(ch);hydrateNames(ch,rng);const household=resolveHouseholdEconomy(ch,country,rng),logs=[...household.logs],expenses=[...household.expenses],incomes=[...household.incomes],housing=ensureHousing(ch);
  const social=(ch.selectedActivities||[]).some(x=>x==='socializing'||x==='family');
  resolveFriends(ch,country,rng,social,logs);

  for(const p of ch.family||[]){
    if(!p.alive)continue;const age=personAge(ch,p);
    if(p.relation==='Child')resolveChildDevelopment(ch,p,country,rng,housing,logs);
    else if(p.relationshipScore!=null&&!social)p.relationshipScore=clamp(p.relationshipScore-2);
    if(age>50&&rng.chance(Math.min(.35,.002*Math.exp(.075*(age-50))))){p.alive=false;logs.push(`Your ${p.relation.toLowerCase()} died at age ${age}.`);continue;}
    if(['Father','Mother'].includes(p.relation)&&age>=70&&!p.needsCare&&rng.chance(.08+(p.disabled?.1:0))){p.needsCare=true;logs.push(`Your ${p.relation.toLowerCase()} now needs regular care.`);}
    if(p.needsCare&&ch.familyPlans.caregivingId===p.id){expenses.push({label:`Care for ${p.relation.toLowerCase()}`,amount:medianWage(country)*.08,household:true});p.relationshipScore=clamp((p.relationshipScore||50)+5);ch.stats.happiness=clamp(ch.stats.happiness-1);}
    if(!p.estranged&&p.relationshipScore<15&&rng.chance(.15)){p.estranged=true;logs.push(`You became estranged from your ${p.relation.toLowerCase()}.`);}
    if(p.estranged&&ch.familyPlans.reconciliationId===p.id){if(rng.chance(.35+(p.relationshipScore||0)/200)){p.estranged=false;p.relationshipScore=40;logs.push(`You reconciled with your ${p.relation.toLowerCase()}.`);}else logs.push(`Your attempt at reconciliation was not accepted.`);ch.familyPlans.reconciliationId=null;}
  }

  if(!ch.partner&&!ch.spouse&&ch.datingIntent&&ch.age>=16&&rng.chance(.18+ch.stats.charisma/500)){
    const candidate=makePartner(ch,country,rng),law=relationshipLawProfile(country);
    if(isSameSexCouple(ch,candidate)&&law.status==='criminalized'&&rng.chance(law.safetyRisk)){logs.push('Legal and safety risks prevented a potential same-sex relationship from developing.');}
    else{ch.partner=candidate;ch.relationshipStatus='dating';logs.push(`You began dating ${displayName(candidate)}; compatibility is ${Math.round(candidate.compatibility)}/100.`);}
  }
  if(ch.partner?.alive){
    ch.partner.yearsTogether+=1;ch.partner.relationshipScore=clamp(ch.partner.relationshipScore+(social?3:-2)+(ch.partner.compatibility-50)/50);
    if(ch.proposalIntent){
      const accepted=rng.chance(.25+ch.partner.relationshipScore/170+ch.partner.compatibility/300);
      if(accepted){ch.partner.engaged=true;ch.relationshipStatus='engaged';logs.push(`You and ${displayName(ch.partner)} became engaged.`);}else logs.push(`${displayName(ch.partner)} declined your proposal.`);
      ch.proposalIntent=false;
    }
    if(ch.marriageIntent&&ch.partner.engaged){
      if(canMarry(ch,ch.partner,country)){const partner=ch.partner;applyMarriageName(ch,partner,country,ch.identity?.pendingMarriageChoice);ch.spouse={...partner,id:`spouse-${ch.age}`,relation:'Spouse',engaged:false};spouseWork(ch,country,rng,ch.spouse);ch.partner=null;ch.relationshipStatus='married';ch.relationshipHistory.push({status:'married',age:ch.age,spouseName:displayName(ch.spouse)});logs.push(`You married ${displayName(ch.spouse)}.`);}
      else{ch.relationshipStatus='committed';ch.partner.engaged=false;logs.push('Marriage was unavailable under local law; you remained committed partners.');}
      ch.marriageIntent=false;
    }
    if(ch.separationIntent){ch.relationshipHistory.push({status:'separated',age:ch.age});ch.partner=null;ch.relationshipStatus='single';ch.separationIntent=false;logs.push('You ended the relationship.');}
  }

  if(ch.spouse?.alive){
    const spouseAge=personAge(ch,ch.spouse);
    if(spouseAge>50&&rng.chance(Math.min(.35,.002*Math.exp(.075*(spouseAge-50))))){ch.spouse.alive=false;ch.stats.happiness=clamp(ch.stats.happiness-15);logs.push(`Your spouse died at age ${spouseAge}.`);endMarriage(ch,country,logs,'widowed');}
  }
  if(ch.spouse?.alive){
    const s=ch.spouse;s.yearsTogether=(s.yearsTogether||0)+1;s.relationshipScore=clamp(s.relationshipScore+(social?3:-2)+(s.compatibility-50)/60);
    const stress=(ch.lastStatement?.poverty?8:0)+(s.relationshipScore<35?8:0);s.conflictLevel=clamp((s.conflictLevel||0)+stress-rng.int(1,5));
    if(s.conflictLevel>65&&!ch.safety.concern&&rng.chance(.06)){ch.safety.concern=true;logs.push('Controlling or threatening behavior created a domestic-safety concern. You can seek help or leave from the Family screen.');}
    if(ch.safety.seekHelpIntent){ch.safety.safetyPlan=true;ch.safety.seekHelpIntent=false;s.relationshipScore=clamp(s.relationshipScore-8);logs.push(country.lawTier==='strong'?'You contacted support services and made a safety plan.':'You sought trusted help and made a private safety plan despite limited formal support.');}
    if(ch.separationIntent||ch.divorceIntent||ch.safety.leaveIntent){endMarriage(ch,country,logs,ch.divorceIntent||ch.safety.leaveIntent?'divorce':'separated');ch.separationIntent=false;ch.divorceIntent=false;ch.safety={concern:false,seekHelpIntent:false,safetyPlan:false};}
    else if(s.relationshipScore<20&&rng.chance(.15))endMarriage(ch,country,logs,'divorce');
  }

  resolvePregnancy(ch,country,rng,logs,expenses);
  const law=relationshipLawProfile(country);
  if(ch.familyPlans.adoption){
    const sameSex=isSameSexCouple(ch,ch.spouse||ch.partner),allowed=!sameSex||law.adoptionAllowed;
    if(allowed&&ch.age>=21&&rng.chance(country.lawTier==='strong'?.55:.3)){ch.family.push(makeChild(ch,country,rng,'adopted'));logs.push('An adoption was finalized and a child joined your family.');}
    else logs.push(allowed?'The adoption application was not approved this year.':'The adoption application was legally unavailable for your household.');
    ch.familyPlans.adoption=null;
  }
  if(ch.familyPlans.foster){
    const allowed=!isSameSexCouple(ch,ch.spouse||ch.partner)||law.fosterAllowed;
    if(allowed&&rng.chance(.65)){ch.family.push(makeChild(ch,country,rng,'foster'));logs.push('A foster child joined your household.');}
    else logs.push('The foster-care application could not be completed.');ch.familyPlans.foster=false;
  }

  const children=(ch.family||[]).filter(p=>p.relation==='Child'&&p.alive);
  if(children.length>1&&!children.some(x=>x.favoritism==='favored')&&rng.chance(.08)){const fav=rng.pick(children);fav.favoritism='favored';for(const c of children.filter(x=>x!==fav)){c.favoritism='overlooked';c.relationshipScore=clamp(c.relationshipScore-5);}logs.push('Perceived parental favoritism created tension among the children.');}
  const good=children.filter(p=>p.relationshipScore>=50&&!p.estranged).length;if(good)ch.stats.happiness=clamp(ch.stats.happiness+2);
  if(ch.familyRights?.requestWorkPermission&&ch.spouse?.alive){const granted=rng.chance(.25+ch.spouse.relationshipScore/140);ch.familyRights.workPermission=granted;ch.familyRights.requestWorkPermission=false;logs.push(granted?'Your husband agreed that you may seek paid work.':'Your husband refused permission for you to seek paid work.');}

  const young=children.filter(p=>p.atHome!==false&&personAge(ch,p)<18);if(young.length)expenses.push({label:'Child essentials',amount:medianWage(country)*.08*young.length,household:true});
  const daycare=young.filter(p=>personAge(ch,p)<6).length,playerWorks=!!ch.job||ch.military?.status==='career',caregiverUnavailable=!ch.spouse?.alive||!!ch.spouse.working;
  if(daycare&&playerWorks&&caregiverUnavailable){const subsidy={generous:.8,moderate:.5,minimal:.15,none:0}[country.welfareTier]||0;expenses.push({label:`Daycare (${Math.round(subsidy*100)}% public subsidy)`,amount:medianWage(country)*.18*daycare*(1-subsidy),household:true});}
  return{logs,expenses,incomes};
}
