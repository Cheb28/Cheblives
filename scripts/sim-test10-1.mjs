import assert from 'node:assert/strict';
import { newGame, serialize, deserialize, continueAsHeir } from '../src/engine/game.js';
import { COUNTRY_BY_NAME } from '../src/engine/countries.js';
import { applyMarriageName, marriageNameChoices, nameChangeProfile, requestLegalNameChange, setChildName } from '../src/engine/names.js';
import { settleEstate } from '../src/engine/inheritance.js';
import { resolveFamily } from '../src/engine/family.js';

console.log('=== Phase 10.1 names and legal-identity checks ===');
const us=COUNTRY_BY_NAME['United States'],japan=COUNTRY_BY_NAME.Japan,italy=COUNTRY_BY_NAME.Italy,germany=COUNTRY_BY_NAME.Germany;

const manual=newGame({countryId:us.id,sex:'female',playerName:'Alex Morgan',seed:10101});
assert.equal(manual.character.identity.birthName,'Alex Morgan');
assert.equal(manual.character.name,'Alex Morgan');
assert(manual.character.family.every(p=>p.name&&p.identity),'every birth relative receives a persistent name');
assert.equal(new Set(manual.character.family.map(p=>p.name)).size,manual.character.family.length,'generated relatives should not receive identical full names');

const jp=newGame({countryId:japan.id,sex:'male',seed:10102}).character;
assert.equal(jp.identity.convention,'family-first');
assert.equal(jp.name.split(' ')[0],jp.identity.familyName);

const multinational=newGame({countryId:us.id,secondNationalityCountryId:germany.id,foreignParentRelation:'Mother',seed:10103}).character;
const foreignMother=multinational.family.find(p=>p.relation==='Mother');
assert.equal(foreignMother.countryId,germany.id);
assert.equal(foreignMother.identity.profileKey,'germanic');
assert(multinational.immigration.citizenships.includes(germany.id));

manual.character.age=25;manual.character.money.bank=100000;
assert.equal(nameChangeProfile(us,manual.character).available,true);
const changed=requestLegalNameChange(manual.character,us,'Alex Rivers');
assert.equal(changed.ok,true);assert.equal(manual.character.identity.currentLegalName,'Alex Rivers');
assert.equal(manual.character.identity.previousNames[0].name,'Alex Morgan');

const partner=newGame({countryId:us.id,sex:'male',seed:10104}).character;
assert(marriageNameChoices(manual.character,partner,us).some(x=>x.id==='adopt'));
applyMarriageName(manual.character,partner,us,'adopt');
assert.equal(manual.character.identity.familyName,partner.identity.familyName);
assert.deepEqual(marriageNameChoices(newGame({countryId:italy.id,seed:10105}).character,partner,italy).map(x=>x.id),['keep']);

const child={id:'named-child',relation:'Child',childNumber:1,alive:true,sex:'female',countryId:us.id,name:null};
manual.character.family.push(child);
assert.equal(setChildName(manual.character,child.id,'Jordan Rivers',us),true);
assert.equal(child.identity.currentLegalName,'Jordan Rivers');

manual.character.identity.preferredName='Lex';
const restored=deserialize(serialize(manual));
assert.equal(restored.character.identity.preferredName,'Lex');
assert.equal(restored.character.family.find(p=>p.id===child.id).name,'Jordan Rivers');

manual.character.stats.charisma=100;
for(let i=0;i<30&&!manual.character.social.friends.length;i++){manual.character.social.friendIntent=true;resolveFamily(manual.character,us,manual.rng);}
assert(manual.character.social.friends[0]?.name,'new friends receive names');

manual.over=true;manual.character.money.bank=10000;manual.estate=settleEstate(manual.character,us);
const heir=continueAsHeir(manual,child.id);
assert.equal(heir.character.name,'Jordan Rivers');
assert.equal(heir.character.identity.birthName,child.identity.birthName);

console.log('Phase 10.1 checks passed.');
