import { medianWage } from './countries.js';
import { investmentValue } from './investments.js';
import { displayName } from './names.js';

export function inheritanceRules(country) {
  const taxRate=country.taxTier==='heavy' ? .20 : country.taxTier==='moderate' ? .10 : 0;
  const legal=(country.legalSystem||'').toLowerCase();
  const protectedFamilyShare=/civil law|islamic|sharia|personal law/.test(legal) ? .5 : 0;
  return {
    taxRate,exemption:medianWage(country)*(country.taxTier==='heavy' ? .5 : country.taxTier==='moderate' ? .75 : 1),
    giftTaxRate:taxRate*.65,spouseExempt:country.lawTier==='strong',spouseMinimum:country.lawTier==='strong' ? .25 : country.lawTier==='medium' ? .15 : 0,protectedFamilyShare,
    label:protectedFamilyShare>0?'Protected-family-share succession':'Flexible testamentary succession',
    note:protectedFamilyShare>0?'At least half of the after-tax estate must remain with the surviving spouse and priority descendants.':'A will may divide the estate only among the currently eligible family class.',
  };
}

const alive=p=>p?.alive!==false;
const item=(p,kind,priority,parentId=null)=>({id:p.id,label:displayName(p),kind,relation:p.relation||kind,priority,parentId});
const direct=(ch,relation)=>(ch.family||[]).filter(p=>p.relation===relation&&alive(p));
const nested=(people,keys,kind,priority)=>people.flatMap(parent=>keys.flatMap(key=>(parent[key]||[]).filter(alive).map(p=>item(p,kind,priority,parent.id))));

// Only the nearest living family class inherits. Living children block more distant
// relatives; grandchildren enter only when there are no living children.
export function priorityRelatives(ch){
  const children=direct(ch,'Child');if(children.length)return children.map(p=>item(p,'child',1));
  const allChildren=(ch.family||[]).filter(p=>p.relation==='Child');
  const grandchildren=[...direct(ch,'Grandchild').map(p=>item(p,'grandchild',2)),...nested(allChildren,['grandchildren','children'],'grandchild',2)];
  if(grandchildren.length)return unique(grandchildren);
  const siblings=direct(ch,'Sibling');if(siblings.length)return siblings.map(p=>item(p,'sibling',3));
  const allSiblings=(ch.family||[]).filter(p=>p.relation==='Sibling');
  const niblings=[...direct(ch,'Niece/Nephew').map(p=>item(p,'niece/nephew',4)),...nested(allSiblings,['children','grandchildren'],'niece/nephew',4)];
  if(niblings.length)return unique(niblings);
  const parents=[...direct(ch,'Father'),...direct(ch,'Mother')];if(parents.length)return parents.map(p=>item(p,'parent',5));
  const aunts=[...direct(ch,'Aunt/Uncle'),...direct(ch,'Aunt'),...direct(ch,'Uncle')];if(aunts.length)return aunts.map(p=>item(p,'aunt/uncle',6));
  const allAunts=(ch.family||[]).filter(p=>['Aunt/Uncle','Aunt','Uncle'].includes(p.relation));
  const cousins=[...direct(ch,'Cousin').map(p=>item(p,'cousin',7)),...nested(allAunts,['children'],'cousin',7)];
  if(cousins.length)return unique(cousins);
  const known=new Set(['Child','Grandchild','Sibling','Niece/Nephew','Father','Mother','Aunt/Uncle','Aunt','Uncle','Cousin']);
  return (ch.family||[]).filter(p=>alive(p)&&!known.has(p.relation)).map(p=>item(p,'relative',8));
}

function unique(list){const seen=new Set();return list.filter(x=>x.id&&!seen.has(x.id)&&(seen.add(x.id),true));}

export function eligibleBeneficiaries(ch){
  const relatives=priorityRelatives(ch),out=[];
  if(ch.spouse?.alive)out.push({id:'spouse',label:displayName(ch.spouse),kind:'spouse',relation:'Spouse',priority:0});
  out.push(...relatives);return out;
}

export function successorCandidates(ch){return priorityRelatives(ch);}

export function findRelative(ch,id){
  const visit=(people,parent=null)=>{for(const p of people||[]){if(p.id===id)return{person:p,parent};for(const key of ['children','grandchildren']){const found=visit(p[key],p);if(found)return found;}}return null;};
  return visit(ch.family)||((ch.spouse?.id===id)?{person:ch.spouse,parent:null}:null);
}

export function settleEstate(ch,country){
  const rules=inheritanceRules(country),beneficiaries=eligibleBeneficiaries(ch),successors=successorCandidates(ch);
  const liquid=(ch.money?.cash||0)+(ch.money?.bank||0)+(ch.money?.household||0);
  const assets=liquid+investmentValue(ch)+(ch.business?.capital||0)+(ch.homeValue||0);
  const listedDebt=Object.values(ch.debts||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  const debts=listedDebt+(ch.business?.loan||0)+(ch.judicial?.finesOwed||0);
  const funeralCost=Math.min(Math.max(0,assets-debts),medianWage(country)*.12);
  const gross=Math.max(0,assets-debts-funeralCost);
  const requested=ch.will?.shares||{},hasWill=!!ch.will?.written&&beneficiaries.some(b=>(requested[b.id]||0)>0);
  const weights={};for(const b of beneficiaries)weights[b.id]=hasWill?Math.max(0,Number(requested[b.id])||0):1;
  let total=Object.values(weights).reduce((a,b)=>a+b,0);if(total<=0&&beneficiaries.length){for(const b of beneficiaries)weights[b.id]=1;total=beneficiaries.length;}
  const protectedPart=hasWill?rules.protectedFamilyShare:1,equalProtected=beneficiaries.length?protectedPart/beneficiaries.length:0;
  const sharePlan=beneficiaries.map(b=>{const requestedPart=total>0?weights[b.id]/total:0;return{...b,pct:equalProtected+(1-protectedPart)*requestedPart};});
  const protectedSpouse=sharePlan.find(x=>x.kind==='spouse');
  if(protectedSpouse&&protectedSpouse.pct<rules.spouseMinimum){const deficit=rules.spouseMinimum-protectedSpouse.pct,others=sharePlan.filter(x=>x!==protectedSpouse),available=others.reduce((sum,x)=>sum+x.pct,0);if(available>0)for(const other of others)other.pct=Math.max(0,other.pct-deficit*(other.pct/available));protectedSpouse.pct=rules.spouseMinimum;}
  const spouseShare=rules.spouseExempt?(sharePlan.find(x=>x.kind==='spouse')?.pct||0):0;
  const tax=Math.max(0,gross-rules.exemption)*(1-spouseShare)*rules.taxRate,distributable=Math.max(0,gross-tax);
  const shares=sharePlan.map(x=>({...x,amount:distributable*x.pct}));
  const familyById=new Map((ch.family||[]).map(p=>[p.id,p]));
  const unequal=shares.length>1&&Math.max(...shares.map(s=>s.pct),0)-Math.min(...shares.map(s=>s.pct),1)>.45;
  const strained=shares.some(s=>s.kind!=='spouse'&&(familyById.get(s.id)?.estranged||familyById.get(s.id)?.relationshipScore<25));
  const disputeRisk=Math.min(.9,(hasWill ? .08 : .03)+(unequal ? .35 : 0)+(strained ? .25 : 0));
  return {assets,debts,funeralCost,gross,tax,taxRate:rules.taxRate,distributable,hasWill,rules,shares,successors,escheat:beneficiaries.length?0:distributable,disputeRisk,likelyDispute:disputeRisk>=.5};
}
