// Game orchestration: holds the single serializable game-state object and
// drives it through the engine. UI calls these; it never touches engine internals.
import { makeRng, randomSeed } from './rng.js';
import { createCharacter } from './character.js';
import { advanceYear } from './advance.js';
import { findRelative, settleEstate } from './inheritance.js';
import { COUNTRY_BY_ID } from './countries.js';
import { displayName, hydrateNames } from './names.js';
import { initializeFamilyEconomy } from './household.js';
import { ensureExperience } from './experience.js';
import { migrateLanguages } from './language.js';
import { ensureFinancialState } from './financialSystems.js';

// Create a fresh game. options passed through to createCharacter.
// If options.seed omitted, a random one is generated (kept for reproducibility).
export function newGame(options = {}) {
  const seed = options.seed ?? randomSeed();
  const rng = makeRng(seed);
  const character = createCharacter(rng, options);

  // The player starts at birth (age 0) and lives every year, including infancy.
  const state = {
    seed,
    rngState: rng.state,
    rng,
    character,
    year: 0,
    log: [{ age: 0, lines: [`Born as ${displayName(character)} in ${character.location.name}, ${character.countryName}.`] }],
    over: false,
    generation: 1,
    successionNumber: 1,
    dynastyHistory: [],
    estate: null,
  };
  return state;
}

// Advance exactly one year. Returns the state (mutated).
export function stepYear(state) {
  if (state.over) return state;
  const result = advanceYear(state);
  state.year += 1;
  state.rngState = state.rng.state;
  // Only record years that had something happen (keeps the life log a highlight reel;
  // the header shows the age advancing every year regardless).
  if (result.log.length > 0) state.log.push({ age: state.character.age, lines: result.log });
  if (result.died) {
    state.over = true;
    state.estate = settleEstate(state.character, COUNTRY_BY_ID[state.character.countryId]);
  }
  return state;
}

// Serialize to a plain object safe for JSON (drops the live rng closure).
export function serialize(state) {
  const { rng, ...rest } = state;
  return { ...rest, rngState: state.rng.state };
}

// Restore a game from serialized data.
export function deserialize(data) {
  const rng = makeRng(data.rngState ?? data.seed);
  hydrateNames(data.character, rng);
  ensureExperience(data.character);
  for(const p of data.character.family||[])ensureExperience(p);
  const birthCountry=COUNTRY_BY_ID[data.character.immigration?.originCountryId]||COUNTRY_BY_ID[data.character.countryId];
  migrateLanguages(data.character,birthCountry,COUNTRY_BY_ID);
  initializeFamilyEconomy(data.character, COUNTRY_BY_ID[data.character.countryId], rng);
  ensureFinancialState(data.character,COUNTRY_BY_ID[data.character.countryId]);
  return { ...data, rng };
}

const clone=value=>value==null?value:structuredClone(value);
const withRelation=(person,relation,ageOffset)=>({...clone(person),relation,ageOffset});
const parentRelation=sex=>sex==='male'?'Father':'Mother';
const grandparentRelation=sex=>sex==='male'?'Grandfather':'Grandmother';

function mappedJob(person,age){
  if(person.job)return clone(person.job);
  const status=person.finances?.employmentStatus;
  if(status!=='employed'&&!person.working)return null;
  const map={professional:'office_admin',service:'retail_hospitality',industrial:'manufacturing',agriculture:'agriculture',informal:'informal'};
  const sector=map[person.finances?.sector]||'retail_hospitality',years=person.finances?.yearsWorked||Math.max(0,age-18);
  return{sector,rung:years>=12?2:years>=4?1:0,yearsAtRung:Math.max(0,years%5)};
}

function successorFamily(parent,person,found,kind){
  const offset=person.ageOffset||0,out=[],push=p=>{if(p?.id&&!out.some(x=>x.id===p.id))out.push(p);};
  for(const descendant of [...(person.children||[]),...(person.grandchildren||[])])push(withRelation(descendant,'Child',(descendant.ageOffset||0)-offset));
  if(kind==='child'){
    for(const sibling of (parent.family||[]).filter(p=>p.relation==='Child'&&p.id!==person.id))push(withRelation(sibling,'Sibling',(sibling.ageOffset||0)-offset));
    push({id:`deceased-${parent.identity?.personId||parent.name}`,relation:parentRelation(parent.sex),sex:parent.sex,alive:false,ageOffset:-offset,relationshipScore:70,ethnicity:parent.ethnicity,religion:parent.religion,name:parent.name,identity:clone(parent.identity),countryId:parent.countryId,citizenships:[...(parent.immigration?.citizenships||[parent.countryId])]});
    const other=parent.spouse||parent.partner;if(other)push(withRelation(other,parentRelation(other.sex),(other.ageOffset||0)-offset));
    for(const p of parent.family||[]){
      if(['Father','Mother'].includes(p.relation))push(withRelation(p,grandparentRelation(p.sex),(p.ageOffset||0)-offset));
      else if(p.relation==='Sibling')push(withRelation(p,'Aunt/Uncle',(p.ageOffset||0)-offset));
    }
  }else if(kind==='grandchild'){
    const owner=found.parent;if(owner)push(withRelation(owner,parentRelation(owner.sex),(owner.ageOffset||0)-offset));
    for(const p of (parent.family||[]).filter(p=>p.relation==='Child'&&p.id!==owner?.id))push(withRelation(p,'Aunt/Uncle',(p.ageOffset||0)-offset));
    push({id:`deceased-grandparent-${parent.identity?.personId||parent.name}`,relation:grandparentRelation(parent.sex),sex:parent.sex,alive:false,ageOffset:-offset,name:parent.name,identity:clone(parent.identity),countryId:parent.countryId});
  }else if(kind==='sibling'){
    for(const p of parent.family||[]){if(['Father','Mother'].includes(p.relation))push(withRelation(p,p.relation,(p.ageOffset||0)-offset));else if(p.relation==='Sibling'&&p.id!==person.id)push(withRelation(p,'Sibling',(p.ageOffset||0)-offset));else if(p.relation==='Child')push(withRelation(p,'Niece/Nephew',(p.ageOffset||0)-offset));}
    push({id:`deceased-sibling-${parent.identity?.personId||parent.name}`,relation:'Sibling',sex:parent.sex,alive:false,ageOffset:-offset,name:parent.name,identity:clone(parent.identity),countryId:parent.countryId});
  }else if(kind==='parent'){
    for(const p of parent.family||[]){if(['Father','Mother'].includes(p.relation)&&p.id!==person.id)continue;if(p.relation==='Sibling')push(withRelation(p,'Child',(p.ageOffset||0)-offset));}
    push({id:`deceased-child-${parent.identity?.personId||parent.name}`,relation:'Child',sex:parent.sex,alive:false,ageOffset:-offset,name:parent.name,identity:clone(parent.identity),countryId:parent.countryId});
  }else{
    const relation=kind==='niece/nephew'?'Aunt/Uncle':kind==='aunt/uncle'?'Niece/Nephew':'Cousin';
    push({id:`deceased-relative-${parent.identity?.personId||parent.name}`,relation,sex:parent.sex,alive:false,ageOffset:-offset,name:parent.name,identity:clone(parent.identity),countryId:parent.countryId});
  }
  const remap=(relation)=>{
    if(kind==='child')return {'Grandfather':'Great-Grandfather','Grandmother':'Great-Grandmother','Aunt':'Great-Aunt/Uncle','Uncle':'Great-Aunt/Uncle','Aunt/Uncle':'Great-Aunt/Uncle','Niece/Nephew':'Cousin','Cousin':'Cousin Once Removed'}[relation]||relation;
    if(kind==='grandchild')return {'Father':'Great-Grandfather','Mother':'Great-Grandmother','Grandfather':'Great-Great-Grandfather','Grandmother':'Great-Great-Grandmother','Sibling':'Great-Aunt/Uncle','Aunt/Uncle':'Great-Great-Aunt/Uncle','Cousin':'Cousin Twice Removed'}[relation]||relation;
    return relation;
  };
  for(const relative of parent.family||[]){if(relative.id!==person.id)push(withRelation(relative,remap(relative.relation),(relative.ageOffset||0)-offset));}
  return out;
}

export function continueAsSuccessor(state, successorId) {
  if (!state.over || !state.estate) return null;
  const parent = state.character;
  const candidate=state.estate.successors?.find(x=>x.id===successorId);
  const found=findRelative(parent,successorId),person=found?.person;
  if(!candidate||!person||person.alive===false)return null;
  const inheritance=state.estate.shares.find(s=>s.id===successorId)?.amount||0;
  const rng = state.rng;
  const residenceId=person.residenceCountryId||person.immigration?.residence?.countryId||person.countryId||parent.countryId;
  const residence=COUNTRY_BY_ID[residenceId]||COUNTRY_BY_ID[parent.countryId];
  const heir = createCharacter(rng, {
    countryId:residence.id,locationName:person.location?.name||(residence.id===parent.countryId?parent.location.name:undefined),sex:person.sex,
    ethnicity:person.ethnicity,religion:person.religion,wealthClass:inheritance>0?'Middle':'Poor',
  });
  const age=Math.max(0,parent.age-(person.ageOffset||0));
  heir.age = age;
  if(person.identity)heir.identity=clone(person.identity);if(person.name)heir.name=person.name;
  if(person.stats)heir.stats={...person.stats};heir.experience=clone(person.experience||heir.experience);
  if(person.education)heir.education=clone(person.education);else{heir.education.performance=person.educationPerformance??heir.education.performance;heir.education.credentials=[...(person.credentials||[])];heir.education.degree=heir.education.credentials.some(x=>/bachelor|master|doctor|university/i.test(x));heir.education.vocational=heir.education.credentials.some(x=>/vocational|trade|apprentice/i.test(x));}
  const existingSavings=person.money?(person.money.bank||0)+(person.money.cash||0):(person.finances?.personalSavings??person.personalSavings??0);
  heir.money=person.money?clone(person.money):{cash:0,bank:0,household:0};heir.money.bank=(heir.money.bank||0)+(!person.money?existingSavings:0)+inheritance;
  if(person.debts)heir.debts=clone(person.debts);if(person.investments)heir.investments=clone(person.investments);if(person.business)heir.business=clone(person.business);
  if(person.health)heir.health=clone(person.health);else if(person.healthConditions?.length)heir.health.conditions=person.healthConditions.map((name,i)=>({id:`inherited-${i}`,name,chronic:true,severity:1,controlled:false,decay:1,mgmtCost:.05,mortalityRisk:.08}));
  if(person.languages)heir.languages=clone(person.languages);if(person.nativeLanguages)heir.nativeLanguages=[...person.nativeLanguages];
  if(person.careerHistory)heir.careerHistory=clone(person.careerHistory);heir.job=mappedJob(person,age);heir.everEmployed=!!heir.job||person.everEmployed;
  if(person.housing)heir.housing=clone(person.housing);heir.ownsHome=!!person.ownsHome;heir.homeValue=person.homeValue||0;
  for(const key of ['will','judicial','military','benefits','social','fertility','familyPlans','safety','familyRights','relationshipHistory','financial','householdBudget','netWorthHistory'])if(person[key]!=null)heir[key]=clone(person[key]);
  if(person.veteran!=null)heir.veteran=person.veteran;if(person.lifestyle)heir.lifestyle=person.lifestyle;if(person.selectedActivities)heir.selectedActivities=[...person.selectedActivities];
  const partner=person.spouse||person.partner;
  if((partner&&person.partnerStatus==='married')||person.spouse){heir.spouse=clone(partner);heir.spouse.relation='Spouse';heir.spouse.ageOffset=(partner.ageOffset||0)-(person.ageOffset||0);heir.relationshipStatus='married';}
  else if(partner){heir.partner=clone(partner);heir.partner.relation='Partner';heir.partner.ageOffset=(partner.ageOffset||0)-(person.ageOffset||0);heir.relationshipStatus=person.partnerStatus||'dating';}
  else if(person.partnerStatus)heir.relationshipStatus=person.partnerStatus;
  if(person.citizenships?.length)heir.immigration.citizenships=[...person.citizenships];else if(person.immigration)heir.immigration=clone(person.immigration);
  heir.immigration.originCountryId=person.countryId||parent.countryId;
  heir.immigration.residence = {
    ...(person.immigration?.residence||{}),countryId:residence.id,
    status:heir.immigration.citizenships.includes(residence.id)?'citizen':'family',
    route: 'heir continuation', years: 0,
  };
  heir.family=successorFamily(parent,person,found,candidate.kind);
  if(age<6){heir.education.stage='preschool';heir.employmentStatus='child';}
  else if(age<12){heir.education.stage='primary';heir.education.enrolled=true;heir.employmentStatus='child';}
  else if(age<18){heir.education.stage='secondary';heir.education.enrolled=true;heir.employmentStatus='child';}
  else if(heir.job)heir.employmentStatus=heir.job.sector==='informal'?'informal':'employed';
  else if(person.finances?.employmentStatus)heir.employmentStatus=person.finances.employmentStatus;
  else heir.employmentStatus='unemployed';
  initializeFamilyEconomy(heir,residence,rng);ensureFinancialState(heir,residence);
  const generationDelta={child:1,grandchild:2,sibling:0,'niece/nephew':1,parent:-1,'aunt/uncle':-1,cousin:0,relative:0}[candidate.kind]||0;
  const dynastyHistory=[...(state.dynastyHistory||[]),{succession:(state.successionNumber||state.generation||1)+1,year:state.year,from:displayName(parent),to:displayName(heir),relation:candidate.kind,inheritance}];
  return {
    seed: state.seed, rngState: rng.state, rng, character: heir, year: state.year,
    log:[{age,lines:[`Continued the family story as ${displayName(heir)}, the ${candidate.kind} of ${displayName(parent)}, inheriting ${Math.round(inheritance).toLocaleString()}.`]}],
    over:false,generation:Math.max(1,(state.generation||1)+generationDelta),successionNumber:(state.successionNumber||state.generation||1)+1,dynastyHistory,estate:null,
  };
}

export function continueAsHeir(state,id){return continueAsSuccessor(state,id);}
