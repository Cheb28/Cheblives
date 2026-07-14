import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { personAge } from '../../engine/family.js';
import { genderRightsProfile, needsHusbandWorkApproval } from '../../engine/genderRights.js';
import { setDatingIntent, proposeMarriage, setChildrenIntent, requestWorkPermission, setHouseholdContribution } from '../../engine/actions.js';
import { ensureHousing } from '../../engine/housing.js';
import { money } from '../format.js';

export default function Family({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const rights = genderRightsProfile(country);
  const relatives = (ch.family || []).filter(p => p.relation !== 'Child');
  const children = (ch.family || []).filter(p => p.relation === 'Child');
  const approvalNeeded = needsHusbandWorkApproval(ch, country);
  const housing = ensureHousing(ch);

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Relationships</h3>
        {!ch.spouse && !ch.partner && ch.age >= 16 && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={ch.datingIntent} onChange={e => { setDatingIntent(state, e.target.checked); refresh(); }} />
            <span>Look for a partner this year</span>
          </label>
        )}
        {ch.age < 16 && <div className="muted">Dating choices become available at age 16.</div>}
        {ch.partner && <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
          <div className="kv"><span className="k">Partner</span><span className="v">{ch.partner.sex}</span></div>
          <div className="kv"><span className="k">Relationship</span><span className="v">{Math.round(ch.partner.relationshipScore)} / 100</span></div>
          <div className="kv"><span className="k">Years together</span><span className="v">{ch.partner.yearsTogether}</span></div>
          <button disabled={ch.partner.yearsTogether < 1 || ch.proposalIntent} style={{ marginTop: 10 }}
            onClick={() => { proposeMarriage(state); refresh(); }}>
            {ch.proposalIntent ? 'Proposal pending' : 'Propose marriage'}
          </button>
        </div>}
        {ch.spouse && <>
          <div className="kv"><span className="k">Spouse</span><span className="v">{ch.spouse.alive ? `${ch.spouse.sex}, age ${personAge(ch, ch.spouse)}` : 'Deceased'}</span></div>
          <div className="kv"><span className="k">Relationship</span><span className="v">{Math.round(ch.spouse.relationshipScore)} / 100</span></div>
          <div className="kv"><span className="k">Employment</span><span className="v">{ch.spouse.working ? 'Working' : 'Not employed'}</span></div>
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>CHILDREN</div>
            {['try', 'neutral', 'avoid'].map(id => (
              <label key={id} style={{ display: 'flex', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                <input type="radio" name="children-intent" checked={ch.childrenIntent === id}
                  onChange={() => { setChildrenIntent(state, id); refresh(); }} />
                <span>{id === 'try' ? 'Try for a child' : id === 'avoid' ? 'Avoid pregnancy' : 'Leave it to chance'}</span>
              </label>
            ))}
          </div>
        </>}
      </div>

      <div className="panel">
        <h3>Rights & Household Rules</h3>
        <div className="kv"><span className="k">Country profile</span><span className="v">{rights.label}</span></div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>{rights.note}</div>
        {ch.sex === 'female' && rights.femaleHireMult < 1 && (
          <div className="tag" style={{ marginTop: 12, color: 'var(--warn)' }}>
            Employment opportunity ×{rights.femaleHireMult.toFixed(2)}
          </div>
        )}
        {approvalNeeded && <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Paid work currently requires household approval under this country profile.</div>
          <button disabled={ch.familyRights.requestWorkPermission} onClick={() => { requestWorkPermission(state); refresh(); }}>
            {ch.familyRights.requestWorkPermission ? 'Request pending' : 'Request permission to work'}
          </button>
        </div>}
      </div>

      <div className="panel">
        <h3>Children</h3>
        {children.length === 0 && <div className="muted">No children.</div>}
        {children.map(p => <div className="kv" key={p.id}>
          <span className="k">{p.name || `Child ${p.childNumber}`} ({p.sex})</span>
          <span className="v">{p.alive ? `Age ${personAge(ch, p)} · relationship ${Math.round(p.relationshipScore)}` : 'Deceased'}</span>
          {p.alive && <span className="muted" style={{fontSize:11}}>{p.atHome===false?'Moved out':'At home'}{p.working?' · working':''} · {money(p.personalSavings||0)} saved</span>}
        </div>)}
        {children.length > 0 && <div style={{marginTop:14,borderTop:'1px solid var(--border)',paddingTop:10}}>
          <div className="muted" style={{fontSize:12,marginBottom:7}}>WORKING CHILD CONTRIBUTIONS</div>
          <label className="kv"><span>Under 18</span><select value={housing.teenContributionRate} onChange={e=>{setHouseholdContribution(state,'teen',e.target.value);refresh();}}>{[0,.1,.25,.5].map(v=><option key={v} value={v}>{v*100}% to household</option>)}</select></label>
          <label className="kv"><span>Adult child at home</span><select value={housing.adultChildContributionRate} onChange={e=>{setHouseholdContribution(state,'adult',e.target.value);refresh();}}>{[0,.1,.25,.5].map(v=><option key={v} value={v}>{v*100}% board</option>)}</select></label>
          <div className="muted" style={{fontSize:11,marginTop:7}}>The remainder stays in the child's savings. Higher board increases the chance an adult child moves out.</div>
        </div>}
      </div>

      <div className="panel">
        <h3>Parents & Siblings</h3>
        {relatives.map(p => <div className="kv" key={p.id}>
          <span className="k">{p.relation}</span>
          <span className="v">{p.alive ? `Age ${personAge(ch, p)} · relationship ${Math.round(p.relationshipScore)}` : 'Deceased'}</span>
        </div>)}
      </div>
    </div>
  );
}
