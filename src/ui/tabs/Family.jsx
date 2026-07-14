import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { compatibilityScore, personAge } from '../../engine/family.js';
import { genderRightsProfile, needsHusbandWorkApproval } from '../../engine/genderRights.js';
import { relationshipLawProfile } from '../../engine/relationshipLaws.js';
import {
  setDatingIntent,setDatingPreference,setFriendIntent,proposeMarriage,planMarriage,endPartnership,requestDivorce,
  setChildrenIntent,setContraception,requestFertilityTreatment,requestAdoption,requestFostering,
  setCaregiving,requestReconciliation,seekDomesticHelp,leaveUnsafeHome,requestWorkPermission,setHouseholdContribution,
  setMarriageNameChoice,nameChild,
} from '../../engine/actions.js';
import { ensureHousing } from '../../engine/housing.js';
import { skillLabel } from '../../engine/skills.js';
import { money, titleCase } from '../format.js';
import { displayName, marriageNameChoices } from '../../engine/names.js';

const action = (fn, refresh) => () => { fn(); refresh(); };

export default function Family({ state, refresh }) {
  const ch=state.character,country=COUNTRY_BY_ID[ch.countryId],rights=genderRightsProfile(country),law=relationshipLawProfile(country);
  ch.social ||= {friendIntent:false,friends:[],datingPreference:'anyone'};
  ch.fertility ||= {contraception:'none',pregnancy:null,knownInfertility:false,treatment:null};
  ch.familyPlans ||= {adoption:null,foster:false,caregivingId:null,reconciliationId:null};
  ch.safety ||= {concern:false};
  const relatives=(ch.family||[]).filter(p=>p.relation!=='Child'),children=(ch.family||[]).filter(p=>p.relation==='Child');
  const friends=(ch.social.friends||[]).filter(f=>f.alive),housing=ensureHousing(ch),approvalNeeded=needsHusbandWorkApproval(ch,country);
  const financePeople=[...(ch.spouse?.alive?[ch.spouse]:[]),...(ch.family||[]).filter(p=>p.alive)];

  return <div className="grid cols-2">
    <div className="panel">
      <h3>Dating & Partnership</h3>
      <div className="kv"><span className="k">Relationship status</span><span className="v">{titleCase(ch.relationshipStatus||'single')}</span></div>
      <div className="kv"><span className="k">Local law</span><span className="v">{law.label}</span></div>
      <p className="muted" style={{fontSize:12,lineHeight:1.5}}>{law.note}</p>
      {!ch.spouse&&!ch.partner&&ch.age>=16&&<>
        <label className="kv"><span>People you want to meet</span><select aria-label="Dating preference" value={ch.social.datingPreference} onChange={e=>{setDatingPreference(state,e.target.value);refresh();}}><option value="anyone">Any gender</option><option value="opposite">Another gender</option><option value="same">Same gender</option></select></label>
        <label className="check-row"><input type="checkbox" checked={ch.datingIntent} onChange={e=>{setDatingIntent(state,e.target.checked);refresh();}}/><span>Look for a partner this year</span></label>
      </>}
      {ch.age<16&&<div className="muted">Dating choices become available at age 16.</div>}
      {ch.partner&&<div className="subcard">
        <div className="kv"><span>Partner</span><span>{displayName(ch.partner)} · {titleCase(ch.partner.sex)} · age {personAge(ch,ch.partner)}</span></div>
        <div className="kv"><span>Compatibility</span><span>{Math.round(ch.partner.compatibility??compatibilityScore(ch,ch.partner))}/100</span></div>
        <div className="kv"><span>Relationship</span><span>{Math.round(ch.partner.relationshipScore)}/100 · {ch.partner.yearsTogether} years</span></div>
        <div className="kv"><span>Personality</span><span>{(ch.partner.personality||[]).map(titleCase).join(', ')||'Unknown'}</span></div>
        {!ch.partner.engaged&&<button disabled={ch.partner.yearsTogether<1||ch.proposalIntent} onClick={action(()=>proposeMarriage(state),refresh)}>{ch.proposalIntent?'Proposal pending':'Propose engagement'}</button>}
        {ch.partner.engaged&&<><label className="kv"><span>Name after marriage</span><select aria-label="Name after marriage" value={ch.identity?.pendingMarriageChoice||'keep'} onChange={e=>{setMarriageNameChoice(state,e.target.value);refresh();}}>{marriageNameChoices(ch,ch.partner,country).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><button disabled={ch.marriageIntent} onClick={action(()=>planMarriage(state),refresh)}>{ch.marriageIntent?'Marriage decision pending':law.marriageAllowed||ch.partner.sex!==ch.sex?'Plan marriage':'Commit as partners'}</button></>}
        <button className="secondary" disabled={ch.separationIntent} onClick={action(()=>endPartnership(state),refresh)}>End relationship</button>
      </div>}
      {ch.spouse&&<div className="subcard">
        <div className="kv"><span>Spouse</span><span>{displayName(ch.spouse)} · {titleCase(ch.spouse.sex)} · age {personAge(ch,ch.spouse)}</span></div>
        <div className="kv"><span>Compatibility</span><span>{Math.round(ch.spouse.compatibility||50)}/100</span></div>
        <div className="kv"><span>Relationship</span><span>{Math.round(ch.spouse.relationshipScore)}/100</span></div>
        <div className="kv"><span>Employment</span><span>{ch.spouse.working?'Working':'Not employed'}</span></div>
        <button className="secondary" disabled={ch.separationIntent} onClick={action(()=>endPartnership(state),refresh)}>Separate</button>
        <button className="secondary" disabled={ch.divorceIntent} onClick={action(()=>requestDivorce(state),refresh)}>Request divorce</button>
      </div>}
      {(ch.relationshipHistory||[]).length>0&&<div className="muted" style={{marginTop:10}}>History: {ch.relationshipHistory.map(x=>`${titleCase(x.status)} at ${x.age}`).join(' · ')}</div>}
    </div>

    <div className="panel">
      <h3>Friendships</h3>
      {ch.age>=6&&<label className="check-row"><input type="checkbox" checked={ch.social.friendIntent} onChange={e=>{setFriendIntent(state,e.target.checked);refresh();}}/><span>Make time to meet a new friend this year</span></label>}
      {friends.length===0&&<div className="muted">No active close friendships.</div>}
      {friends.map(f=><div className="kv" key={f.id}><span>{displayName(f)} · {f.yearsKnown||0} years</span><span>{Math.round(f.relationshipScore)}/100 · {(f.personality||[]).map(titleCase).join(', ')}</span></div>)}
    </div>

    <div className="panel">
      <h3>Pregnancy & Family Building</h3>
      <div className="kv"><span>Pregnancy</span><span>{ch.fertility.pregnancy?(ch.fertility.pregnancy.planned?'Planned pregnancy':'Surprise pregnancy'):'None'}</span></div>
      {(ch.spouse||ch.partner)&&<>
        <div className="choice-stack">{[['try','Plan a pregnancy'],['neutral','Open to pregnancy'],['avoid','Avoid pregnancy']].map(([id,label])=><label key={id}><input type="radio" name="children-intent" checked={ch.childrenIntent===id} onChange={()=>{setChildrenIntent(state,id);refresh();}}/> {label}</label>)}</div>
        <label className="kv"><span>Contraception</span><select aria-label="Contraception" value={ch.fertility.contraception} onChange={e=>{setContraception(state,e.target.value);refresh();}}><option value="none">None</option><option value="barrier">Barrier method</option><option value="reliable">Reliable method</option></select></label>
      </>}
      {ch.fertility.knownInfertility&&<div className="notice warn">Fertility problems have been identified.</div>}
      {ch.age>=18&&<button disabled={ch.fertility.treatment==='active'} onClick={action(()=>requestFertilityTreatment(state),refresh)}>Seek fertility treatment</button>}
      {ch.age>=21&&<div className="button-row"><button disabled={!!ch.familyPlans.adoption} onClick={action(()=>requestAdoption(state),refresh)}>Apply to adopt</button><button disabled={ch.familyPlans.foster} onClick={action(()=>requestFostering(state),refresh)}>Apply to foster</button></div>}
      <p className="muted" style={{fontSize:11}}>Applications, treatment access, and same-sex family rights depend on the country profile. Pregnancy can involve miscarriage and childbirth costs.</p>
    </div>

    <div className="panel">
      <h3>Children</h3>
      {children.length===0&&<div className="muted">No children.</div>}
      {children.map(p=><div className="subcard" key={p.id}>
        <div className="kv"><strong>{displayName(p)} · {titleCase(p.sex)}</strong><span>{p.alive?`Age ${personAge(ch,p)} · relationship ${Math.round(p.relationshipScore)}`:'Deceased'}</span></div>
        {p.alive&&<div className="field"><label htmlFor={`child-name-${p.id}`}>Name this child</label><input id={`child-name-${p.id}`} maxLength="60" defaultValue={p.name||''} onBlur={e=>{nameChild(state,p.id,e.target.value);refresh();}}/></div>}
        {p.alive&&<><div className="muted">{titleCase(p.origin||'birth')} · {(p.personality||[]).map(titleCase).join(', ')||'personality developing'} · {p.educationOutcome||'not school age'}</div><div className="muted">Academic {skillLabel(p.skills?.academic)} · {p.career||'no career yet'} · {p.partnerStatus||'single'} · {p.ownChildren||0} children</div><div className="muted">{p.atHome===false?'Moved out':'At home'}{p.working?' · working':''} · {money(p.personalSavings||0)} saved{p.favoritism&&p.favoritism!=='neutral'?` · ${p.favoritism}`:''}{p.estranged?' · estranged':''}</div>{p.estranged&&<button disabled={ch.familyPlans.reconciliationId===p.id} onClick={action(()=>requestReconciliation(state,p.id),refresh)}>Attempt reconciliation</button>}</>}
        {(p.grandchildren||[]).map(g=><div className="muted" key={g.id}>↳ {displayName(g)} · grandchild</div>)}
      </div>)}
      {children.length>0&&<div className="subcard"><strong>Working-child contributions</strong><label className="kv"><span>Under 18</span><select value={housing.teenContributionRate} onChange={e=>{setHouseholdContribution(state,'teen',e.target.value);refresh();}}>{[0,.1,.25,.5].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label><label className="kv"><span>Adult child at home</span><select value={housing.adultChildContributionRate} onChange={e=>{setHouseholdContribution(state,'adult',e.target.value);refresh();}}>{[0,.1,.25,.5].map(v=><option key={v} value={v}>{v*100}% board</option>)}</select></label></div>}
    </div>

    <div className="panel">
      <h3>Household Finances & Medical Care</h3>
      <div className="kv"><span>Family earnings into household</span><span>{money(ch.householdFinance?.familyGrossIncome||0)}</span></div>
      <div className="kv"><span>Family medical spending</span><span>{money(ch.householdFinance?.medicalSpend||0)}</span></div>
      <div className="kv"><span>Unmet family care needs</span><span>{ch.householdFinance?.unmetCare||0}</span></div>
      {financePeople.map(p=><div className="subcard" key={`finance-${p.id}`}>
        <div className="kv"><strong>{displayName(p)} · {p.relation}</strong><span>{titleCase(p.finances?.employmentStatus||'not modeled')}</span></div>
        <div className="kv"><span>{p.finances?.occupation||'No occupation'}</span><span>{money(p.finances?.annualGrossIncome||0)} gross</span></div>
        <div className="kv"><span>Household contribution</span><span>{money(p.finances?.householdContribution||0)}</span></div>
        <div className="kv"><span>Personal savings</span><span>{money(p.finances?.personalSavings||0)}</span></div>
        <div className="muted">Health {Math.round(p.health?.score??70)}/100 · {p.health?.lastYear?.status||'No care record'} · {p.health?.lastYear?.coverage||'coverage not assessed'}</div>
      </div>)}
      <p className="muted" style={{fontSize:11}}>Jobs, income, taxes, savings, household contributions, coverage, medical bills, and unaffordable care update once per year.</p>
    </div>

    <div className="panel">
      <h3>Parents, Care & Reconciliation</h3>
      {relatives.map(p=><div className="subcard" key={p.id}><div className="kv"><span>{p.relation} · {displayName(p)}</span><span>{p.alive?`Age ${personAge(ch,p)} · ${COUNTRY_BY_ID[p.countryId]?.name||ch.countryName} national · ${Math.round(p.relationshipScore)}/100`:'Deceased'}</span></div>{p.needsCare&&<label className="check-row"><input type="checkbox" checked={ch.familyPlans.caregivingId===p.id} onChange={e=>{setCaregiving(state,e.target.checked?p.id:null);refresh();}}/><span>Provide regular care</span></label>}{p.estranged&&<button disabled={ch.familyPlans.reconciliationId===p.id} onClick={action(()=>requestReconciliation(state,p.id),refresh)}>Attempt reconciliation</button>}</div>)}
    </div>

    <div className="panel">
      <h3>Rights, Conflict & Safety</h3>
      <div className="kv"><span>Country profile</span><span>{rights.label}</span></div><p className="muted">{rights.note}</p>
      {approvalNeeded&&<button disabled={ch.familyRights.requestWorkPermission} onClick={action(()=>requestWorkPermission(state),refresh)}>{ch.familyRights.requestWorkPermission?'Request pending':'Request permission to work'}</button>}
      {ch.safety.concern?<div className="notice warn"><strong>Domestic-safety concern</strong><p>This models controlling, threatening, or violent non-sexual behavior. You can seek support, make a plan, or leave.</p><div className="button-row"><button disabled={ch.safety.seekHelpIntent} onClick={action(()=>seekDomesticHelp(state),refresh)}>Seek help</button><button onClick={action(()=>leaveUnsafeHome(state),refresh)}>Leave safely</button></div></div>:<div className="muted">No current domestic-safety warning.</div>}
    </div>
  </div>;
}
