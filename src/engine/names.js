import { COUNTRY_BY_ID, medianWage } from './countries.js';
import { makeRng } from './rng.js';

const P = {
  anglo: { male:['James','Liam','Noah','Daniel','Michael','Oliver'], female:['Olivia','Emma','Amelia','Sophia','Charlotte','Grace'], family:['Smith','Brown','Taylor','Wilson','Martin','Clark'] },
  latin: { male:['Mateo','Santiago','Diego','Alejandro','Gabriel','Lucas'], female:['Sofía','Valentina','Camila','Isabella','Lucía','Elena'], family:['García','Rodríguez','Martínez','López','Hernández','Sánchez'], convention:'double' },
  lusophone: { male:['João','Miguel','Tiago','Gabriel','Rafael','André'], female:['Maria','Ana','Beatriz','Inês','Sofia','Mariana'], family:['Silva','Santos','Ferreira','Costa','Oliveira','Pereira'], convention:'double' },
  french: { male:['Louis','Gabriel','Hugo','Arthur','Jules','Thomas'], female:['Emma','Louise','Chloé','Léa','Camille','Manon'], family:['Martin','Bernard','Dubois','Thomas','Robert','Petit'] },
  germanic: { male:['Lukas','Leon','Felix','Jonas','Paul','Maximilian'], female:['Anna','Mia','Emilia','Lena','Lea','Clara'], family:['Müller','Schmidt','Schneider','Fischer','Weber','Wagner'] },
  italian: { male:['Luca','Matteo','Leonardo','Francesco','Alessandro','Marco'], female:['Sofia','Giulia','Aurora','Alice','Ginevra','Chiara'], family:['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano'], spouseKeeps:true },
  nordic: { male:['Erik','Lars','Johan','Emil','Magnus','Oskar'], female:['Anna','Astrid','Ingrid','Freja','Nora','Elsa'], family:['Andersson','Johansson','Hansen','Nielsen','Lindberg','Berg'] },
  slavic: { male:['Jakub','Jan','Marek','Tomasz','Luka','Nikola'], female:['Anna','Maja','Katarina','Zofia','Petra','Ivana'], family:['Novak','Kowalski','Horvat','Jovanović','Kovač','Nowak'] },
  russian: { male:['Aleksandr','Mikhail','Dmitri','Ivan','Nikolai','Sergei'], female:['Anna','Maria','Sofia','Elena','Natalia','Irina'], family:['Ivanov','Smirnov','Kuznetsov','Popov','Sokolov','Volkov'] },
  arabic: { male:['Omar','Ahmed','Yusuf','Ali','Hassan','Ibrahim'], female:['Maryam','Fatima','Aisha','Layla','Noor','Salma'], family:['Haddad','Khalil','Mansour','Nasser','Rahman','Saleh'], spouseKeeps:true },
  turkish: { male:['Mehmet','Mustafa','Emir','Kerem','Ahmet','Yusuf'], female:['Zeynep','Elif','Defne','Ece','Ayşe','Selin'], family:['Yılmaz','Kaya','Demir','Şahin','Çelik','Aydın'] },
  persian: { male:['Amir','Arman','Reza','Kian','Dariush','Navid'], female:['Sara','Neda','Leila','Yasmin','Parisa','Roya'], family:['Ahmadi','Hosseini','Karimi','Rahimi','Moradi','Jafari'], spouseKeeps:true },
  southAsian: { male:['Arjun','Aarav','Rohan','Vikram','Rahul','Kabir'], female:['Aanya','Ananya','Priya','Diya','Meera','Kavya'], family:['Sharma','Patel','Singh','Khan','Das','Rao'] },
  chinese: { male:['Wei','Jun','Hao','Ming','Tao','Jian'], female:['Mei','Ling','Xinyi','Jing','Yan','Lina'], family:['Wang','Li','Zhang','Liu','Chen','Yang'], convention:'family-first', spouseKeeps:true },
  japanese: { male:['Haruto','Ren','Yuto','Sota','Kaito','Daiki'], female:['Yui','Aoi','Hina','Sakura','Rin','Mei'], family:['Satō','Suzuki','Takahashi','Tanaka','Watanabe','Itō'], convention:'family-first' },
  korean: { male:['Min-jun','Seo-jun','Ji-ho','Hyun-woo','Jun-ho','Do-yun'], female:['Seo-yeon','Ji-woo','Min-seo','Ha-eun','Soo-jin','Ye-jin'], family:['Kim','Lee','Park','Choi','Jung','Kang'], convention:'family-first', spouseKeeps:true },
  southeastAsian: { male:['Minh','An','Budi','Arif','Somchai','Niran'], female:['Linh','Mai','Sari','Ayu','Mali','Dara'], family:['Nguyen','Tran','Sari','Putra','Sok','Chai'] },
  westAfrican: { male:['Kwame','Kofi','Chinedu','Tunde','Ibrahim','Mamadou'], female:['Ama','Adwoa','Ngozi','Amina','Fatou','Abena'], family:['Mensah','Okafor','Diallo','Traoré','Adeyemi','Kamara'] },
  eastAfrican: { male:['Abebe','Dawit','Juma','Baraka','Kiptoo','Tesfaye'], female:['Hana','Selam','Asha','Neema','Wanjiku','Liya'], family:['Bekele','Mwangi','Otieno','Tesfaye','Mohamed','Kebede'] },
  southernAfrican: { male:['Thabo','Sibusiso','Tendai','Sipho','Kagiso','Tinashe'], female:['Lerato','Nomsa','Thandi','Rudo','Naledi','Ayanda'], family:['Ndlovu','Dlamini','Moyo','Khumalo','Molefe','Sibanda'] },
};

const COUNTRY = {
  'United States':'anglo','United Kingdom':'anglo','Canada':'anglo','Australia':'anglo','New Zealand':'anglo','Ireland':'anglo',
  Spain:'latin',Mexico:'latin',Argentina:'latin',Chile:'latin',Colombia:'latin',Peru:'latin',Venezuela:'latin',Uruguay:'latin',Ecuador:'latin',Bolivia:'latin',Paraguay:'latin','Costa Rica':'latin',Cuba:'latin',
  Brazil:'lusophone',Portugal:'lusophone',Angola:'lusophone',Mozambique:'lusophone',
  France:'french',Belgium:'french',Monaco:'french',Senegal:'french',
  Germany:'germanic',Austria:'germanic',Switzerland:'germanic',Netherlands:'germanic',
  Italy:'italian','San Marino':'italian',
  Sweden:'nordic',Norway:'nordic',Denmark:'nordic',Finland:'nordic',Iceland:'nordic',
  Poland:'slavic',Croatia:'slavic',Serbia:'slavic',Slovenia:'slavic',Slovakia:'slavic','Czech Republic':'slavic',
  Russia:'russian',Ukraine:'russian',Belarus:'russian',Kazakhstan:'russian',
  Türkiye:'turkish',Turkey:'turkish',Iran:'persian',
  India:'southAsian',Pakistan:'southAsian',Bangladesh:'southAsian',Nepal:'southAsian','Sri Lanka':'southAsian',
  China:'chinese',Taiwan:'chinese',Japan:'japanese','South Korea':'korean','North Korea':'korean',
  Vietnam:'southeastAsian',Thailand:'southeastAsian',Cambodia:'southeastAsian',Laos:'southeastAsian',Indonesia:'southeastAsian',Malaysia:'southeastAsian',Philippines:'southeastAsian',
  Nigeria:'westAfrican',Ghana:'westAfrican','Cote d\'Ivoire':'westAfrican',Mali:'westAfrican',Guinea:'westAfrican',Liberia:'westAfrican','Sierra Leone':'westAfrican',
  Ethiopia:'eastAfrican',Kenya:'eastAfrican',Tanzania:'eastAfrican',Uganda:'eastAfrican',Somalia:'eastAfrican',Rwanda:'eastAfrican',
  'South Africa':'southernAfrican',Zimbabwe:'southernAfrican',Zambia:'southernAfrican',Botswana:'southernAfrican',Namibia:'southernAfrican',
};

const ARAB_COUNTRIES = new Set(['Algeria','Bahrain','Egypt','Iraq','Jordan','Kuwait','Lebanon','Libya','Morocco','Oman','Qatar','Saudi Arabia','Sudan','Syria','Tunisia','United Arab Emirates','West Bank','Yemen']);

function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function isolatedRng(rng,salt){return Number.isFinite(rng?.state)?makeRng((rng.state^hash(salt))>>>0):rng;}

function fallbackKey(country) {
  if (ARAB_COUNTRIES.has(country?.name)) return 'arabic';
  const r=country?.region;
  if(r==='South America'||r==='Central America & Caribbean')return 'latin';
  if(r==='South Asia')return 'southAsian';
  if(r==='East & Southeast Asia')return 'southeastAsian';
  if(r==='Middle East')return 'arabic';
  if(r==='Africa')return 'westAfrican';
  if(r==='Europe')return 'slavic';
  return 'anglo';
}

export function namingProfile(country, person={}) {
  let key=COUNTRY[country?.name]||fallbackKey(country);
  // Religion is a soft influence only; multicultural countries still mostly use their local pool.
  if(/muslim|islam/i.test(person.religion||'')&&ARAB_COUNTRIES.has(country?.name))key='arabic';
  return { key, ...P[key] };
}

function clean(value,max=60){return String(value||'').replace(/[<>\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function partsFromFull(full, profile){
  const pieces=clean(full).split(' ').filter(Boolean);
  if(pieces.length<2)return{given:pieces[0]||'',family:''};
  if(profile.convention==='family-first')return{given:pieces.slice(1).join(' '),family:pieces[0]};
  return{given:pieces[0],family:pieces.slice(1).join(' ')};
}
export function formatName(given,family,profile){
  given=clean(given);family=clean(family);
  return clean(profile?.convention==='family-first'?`${family} ${given}`:`${given} ${family}`);
}

export function generateName(rng,country,{sex='female',familyName='',givenName='',religion='',ethnicity=''}={}){
  const profile=namingProfile(country,{religion,ethnicity});
  const given=clean(givenName)||rng.pick(sex==='male'?profile.male:profile.female);
  const family=clean(familyName)||rng.pick(profile.family);
  return {given,family,full:formatName(given,family,profile),profileKey:profile.key,convention:profile.convention||'given-first'};
}

export function makeIdentity(nameParts,{nickname='',preferredName=''}={}){
  const full=clean(nameParts.full);
  return {birthName:full,currentLegalName:full,givenName:nameParts.given,familyName:nameParts.family,
    preferredName:clean(preferredName)||full,nickname:clean(nickname,30),previousNames:[],profileKey:nameParts.profileKey,
    convention:nameParts.convention||'given-first',pendingMarriageChoice:'keep'};
}

export function displayName(person){return person?.identity?.preferredName||person?.identity?.currentLegalName||person?.name||'Unnamed';}

export function ensureIdentity(person,country,rng){
  if(person.identity){person.name=person.identity.currentLegalName||person.name;return person.identity;}
  rng=isolatedRng(rng,person.id||`${person.relation||'person'}-${person.sex||''}-${country?.id||''}`);
  const profile=namingProfile(country,person);
  const parsed=person.name?partsFromFull(person.name,profile):generateName(rng,country,person);
  const parts=parsed.full?parsed:{...parsed,full:formatName(parsed.given,parsed.family,profile),profileKey:profile.key,convention:profile.convention||'given-first'};
  person.identity=makeIdentity(parts);person.name=person.identity.currentLegalName;return person.identity;
}

export function assignBirthHouseholdNames(ch,rng,homeCountry,manualFullName=''){
  rng=isolatedRng(rng,`birth-household-${homeCountry.id}-${ch.sex}`);
  const father=ch.family.find(p=>p.relation==='Father'),mother=ch.family.find(p=>p.relation==='Mother');
  const fatherCountry=COUNTRY_BY_ID[father?.countryId]||homeCountry,motherCountry=COUNTRY_BY_ID[mother?.countryId]||homeCountry;
  const fatherParts=generateName(rng,fatherCountry,father||{}),motherParts=generateName(rng,motherCountry,mother||{});
  father.identity=makeIdentity(fatherParts);father.name=fatherParts.full;
  mother.identity=makeIdentity(motherParts);mother.name=motherParts.full;
  const homeProfile=namingProfile(homeCountry,ch);
  let childFamily=fatherParts.family;
  if(homeProfile.convention==='double')childFamily=`${fatherParts.family} ${motherParts.family}`;
  else if(rng.chance(.15))childFamily=motherParts.family;
  let playerParts;
  if(clean(manualFullName)){
    const parsed=partsFromFull(manualFullName,homeProfile);
    playerParts={...parsed,full:formatName(parsed.given,parsed.family,homeProfile),profileKey:homeProfile.key,convention:homeProfile.convention||'given-first'};
  }else playerParts=generateName(rng,homeCountry,{...ch,familyName:childFamily});
  ch.identity=makeIdentity(playerParts);ch.name=playerParts.full;
  const usedNames=new Set([father.name,mother.name,ch.name]);
  for(const sibling of ch.family.filter(p=>p.relation==='Sibling')){
    let parts=generateName(rng,homeCountry,{...sibling,familyName:playerParts.family});
    for(let attempt=0;attempt<8&&usedNames.has(parts.full);attempt++)parts=generateName(rng,homeCountry,{...sibling,familyName:playerParts.family});
    sibling.identity=makeIdentity(parts);sibling.name=parts.full;
    usedNames.add(parts.full);
  }
}

export function generateRelatedName(rng,country,person,ch,{familyName}={}){
  rng=isolatedRng(rng,person.id||`${person.relation}-${person.sex}-${country.id}`);
  const base=familyName??ch?.identity?.familyName??'';
  const parts=generateName(rng,country,{...person,familyName:base});
  person.identity=makeIdentity(parts);person.name=parts.full;return person;
}

export function marriageNameChoices(ch,partner,country){
  const profile=namingProfile(country,ch),own=ch.identity?.familyName||'',other=partner?.identity?.familyName||'';
  const choices=[{id:'keep',label:`Keep ${own||'your birth surname'}`}];
  if(profile.spouseKeeps)return choices;
  if(other)choices.push({id:'adopt',label:`Adopt ${other}`});
  if(own&&other){choices.push({id:'append',label:`Append: ${own} ${other}`},{id:'combine',label:`Combine: ${own}-${other}`});}
  return choices;
}

export function applyMarriageName(ch,partner,country,choice='keep'){
  const allowed=new Set(marriageNameChoices(ch,partner,country).map(x=>x.id));if(!allowed.has(choice))choice='keep';
  if(choice==='keep')return false;
  const own=ch.identity.familyName,other=partner.identity?.familyName||'';
  const family=choice==='adopt'?other:choice==='combine'?`${own}-${other}`:`${own} ${other}`;
  setLegalName(ch,formatName(ch.identity.givenName,family,namingProfile(country,ch)),'marriage',country);
  return true;
}

export function nameChangeProfile(country,ch){
  const restricted=new Set(['Afghanistan','Saudi Arabia','Iran','North Korea','Somalia','Yemen']);
  const countryRestricted=restricted.has(country.name),available=ch.age>=18&&!countryRestricted;
  const rate=country.lawTier==='strong'?.012:country.lawTier==='medium'?.03:.07;
  return {available,cost:Math.round(medianWage(country)*rate),label:countryRestricted?'Restricted to exceptional circumstances':ch.age<18?'Available from age 18':'Available by civil application',
    note:countryRestricted?'This simulation limits voluntary changes under the local legal profile.':ch.age<18?'A parent or guardian controls legal-name applications during childhood in this model.':'A simplified filing, identity-check, and fee model applies.'};
}

export function setLegalName(ch,newName,reason,country){
  const next=clean(newName);if(next.length<2||next===ch.identity.currentLegalName)return false;
  ch.identity.previousNames.push({name:ch.identity.currentLegalName,age:ch.age,reason});
  const profile=namingProfile(country,ch),parts=partsFromFull(next,profile);
  ch.identity.currentLegalName=next;ch.identity.givenName=parts.given;ch.identity.familyName=parts.family;
  if(!ch.identity.preferredName||ch.identity.preferredName===ch.name)ch.identity.preferredName=next;
  ch.name=next;return true;
}

export function requestLegalNameChange(ch,country,newName){
  ensureIdentity(ch,country,{pick:a=>a[0]});const profile=nameChangeProfile(country,ch);
  if(!profile.available)return{ok:false,message:profile.note};
  const funds=(ch.money.cash||0)+(ch.money.bank||0);if(funds<profile.cost)return{ok:false,message:'You cannot afford the filing and document fees.'};
  if(!setLegalName(ch,newName,'voluntary legal change',country))return{ok:false,message:'Enter a different valid legal name.'};
  let cost=profile.cost,take=Math.min(ch.money.cash||0,cost);ch.money.cash-=take;cost-=take;ch.money.bank=Math.max(0,(ch.money.bank||0)-cost);
  return{ok:true,message:`Your legal name is now ${ch.identity.currentLegalName}.`};
}

export function setPreferredName(ch,value){const v=clean(value);if(!v)return false;ch.identity.preferredName=v;return true;}
export function setNickname(ch,value){ch.identity.nickname=clean(value,30);return true;}
export function setChildName(ch,id,value,country){const child=ch.family.find(p=>p.id===id&&p.relation==='Child');const v=clean(value);if(!child||!v)return false;ensureIdentity(child,country,{pick:a=>a[0]});child.identity.preferredName=v;child.identity.currentLegalName=v;child.name=v;return true;}

export function hydrateNames(ch,rng){
  const country=COUNTRY_BY_ID[ch.countryId];if(!country)return ch;
  ensureIdentity(ch,country,rng);
  for(const p of ch.family||[])ensureIdentity(p,COUNTRY_BY_ID[p.countryId]||country,rng);
  if(ch.partner)ensureIdentity(ch.partner,COUNTRY_BY_ID[ch.partner.countryId]||country,rng);
  if(ch.spouse)ensureIdentity(ch.spouse,COUNTRY_BY_ID[ch.spouse.countryId]||country,rng);
  for(const f of ch.social?.friends||[])ensureIdentity(f,COUNTRY_BY_ID[f.countryId]||country,rng);
  return ch;
}
