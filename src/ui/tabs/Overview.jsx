import { useState } from 'react';
import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { netWorth } from '../../engine/advance.js';
import { jobTitle } from '../../engine/jobs.js';
import { STAT_COLORS, titleCase, money } from '../format.js';
import { skillLabel } from '../../engine/skills.js';
import { displayName, nameChangeProfile } from '../../engine/names.js';
import { changeLegalName, updateNickname, updatePreferredName } from '../../engine/actions.js';

function StatBar({ label, value, color }) {
  return (
    <div className="stat-row">
      <span className="label">{label}</span>
      <div className="bar" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(value)}><span style={{ width: `${value}%`, background: color }} /></div>
      <span className="val">{Math.round(value)}</span>
    </div>
  );
}

export default function Overview({ state, saveTools, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const s = ch.stats;
  const [preferred,setPreferred]=useState(ch.identity?.preferredName||ch.name||'');
  const [nickname,setNicknameValue]=useState(ch.identity?.nickname||'');
  const [legal,setLegal]=useState(ch.identity?.currentLegalName||ch.name||'');
  const [identityMessage,setIdentityMessage]=useState('');
  const changeProfile=nameChangeProfile(country,ch);

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Vital Stats</h3>
        <StatBar label="Health" value={s.health} color={STAT_COLORS.health} />
        <StatBar label="Happiness" value={s.happiness} color={STAT_COLORS.happiness} />
        <StatBar label="Intelligence" value={s.intelligence} color={STAT_COLORS.intelligence} />
        <StatBar label="Fitness" value={s.fitness} color={STAT_COLORS.fitness} />
        <StatBar label="Charisma" value={s.charisma} color={STAT_COLORS.charisma} />
      </div>

      <div className="panel">
        <h3>Who You Are</h3>
        <div className="kv"><span className="k">Name</span><span className="v">{displayName(ch)}</span></div>
        <div className="kv"><span className="k">Age</span><span className="v">{ch.age}</span></div>
        <div className="kv"><span className="k">Sex</span><span className="v">{titleCase(ch.sex)}</span></div>
        <div className="kv"><span className="k">Location</span><span className="v">{ch.location.name}, {ch.countryName}</span></div>
        <div className="kv"><span className="k">Ethnicity</span><span className="v">{ch.ethnicity}</span></div>
        <div className="kv"><span className="k">Religion</span><span className="v">{ch.religion}</span></div>
        <div className="kv"><span className="k">Citizenship(s)</span><span className="v">{(ch.immigration?.citizenships || [ch.countryId]).map(id => COUNTRY_BY_ID[id]?.name || id).join(', ')}</span></div>
        <div className="kv"><span className="k">Family wealth</span><span className="v">{ch.wealthClass}</span></div>
        <div className="kv"><span className="k">Status</span><span className="v">{ch.job ? jobTitle(ch.job) : titleCase(ch.employmentStatus)}</span></div>
        <div className="kv"><span className="k">Immigration status</span><span className="v">{titleCase(ch.immigration?.residence?.status || 'citizen')}</span></div>
        <div className="kv"><span className="k">Net worth</span><span className="v">{money(netWorth(ch))}</span></div>
      </div>

      <div className="panel">
        <h3>Names & Legal Identity</h3>
        <div className="kv"><span className="k">Birth name</span><span className="v">{ch.identity?.birthName}</span></div>
        <div className="kv"><span className="k">Current legal name</span><span className="v">{ch.identity?.currentLegalName}</span></div>
        <div className="field"><label htmlFor="preferred-name">Preferred display name</label><input id="preferred-name" maxLength="60" value={preferred} onChange={e=>setPreferred(e.target.value)}/><button onClick={()=>{if(updatePreferredName(state,preferred)){setIdentityMessage('Preferred name updated.');refresh();}}}>Use preferred name</button></div>
        <div className="field"><label htmlFor="nickname">Nickname</label><input id="nickname" maxLength="30" value={nickname} onChange={e=>setNicknameValue(e.target.value)}/><button onClick={()=>{updateNickname(state,nickname);setIdentityMessage('Nickname updated.');refresh();}}>Save nickname</button></div>
        <div className="field"><label htmlFor="legal-name">Apply for a legal name change</label><input id="legal-name" maxLength="60" value={legal} onChange={e=>setLegal(e.target.value)}/><button disabled={!changeProfile.available} onClick={()=>{const result=changeLegalName(state,legal);setIdentityMessage(result.message);refresh();}}>Submit application · {money(changeProfile.cost)}</button></div>
        <div className="muted" style={{fontSize:12}}>{changeProfile.label}. {changeProfile.note}</div>
        {ch.identity?.nickname&&<div className="kv"><span className="k">Nickname</span><span className="v">{ch.identity.nickname}</span></div>}
        {(ch.identity?.previousNames||[]).map((x,i)=><div className="kv" key={`${x.age}-${i}`}><span className="k">Previous name · age {x.age}</span><span className="v">{x.name} ({x.reason})</span></div>)}
        {identityMessage&&<div className="notice" role="status">{identityMessage}</div>}
      </div>

      <div className="panel">
        <h3>Skills & Experience</h3>
        {Object.entries(ch.skills).map(([key,value])=><div className="kv" key={key}><span className="k">{titleCase(key)}</span><span className="v">{skillLabel(value)}</span></div>)}
        <div className="kv"><span className="k">Credentials</span><span className="v">{ch.education.credentials?.join(', ')||'None'}</span></div>
      </div>

      <div className="panel">
        <h3>Your Country</h3>
        <div className="kv"><span className="k">Income tier</span><span className="v">{country.incomeTier} / 4</span></div>
        <div className="kv"><span className="k">GDP per capita</span><span className="v">${Math.round(country.gdpPerCapita).toLocaleString()}</span></div>
        <div className="kv"><span className="k">Life expectancy</span><span className="v">{country.lifeExpectancy} yrs</span></div>
        <div className="kv"><span className="k">Healthcare</span><span className="v">{titleCase(country.healthcareArchetype.replace(/-/g, ' '))}</span></div>
        <div className="kv"><span className="k">Rule of law</span><span className="v">{titleCase(country.lawTier)}</span></div>
      </div>

      <div className="panel">
        <h3>Life Log</h3>
        <div className="log">
          {[...state.log].reverse().map((entry, i) => (
            entry.lines.length === 0 ? null : (
              <div key={i}>
                {entry.lines.map((line, j) => {
                  const cls = line.startsWith('Born') ? 'birth' : line.startsWith('Died') ? 'death' : '';
                  return (
                    <div className={`yr ${cls}`} key={j}>
                      <span className="age">Age {entry.age}</span>
                      <span className="txt">{line}</span>
                    </div>
                  );
                })}
              </div>
            )
          ))}
        </div>
      </div>
      {saveTools}
    </div>
  );
}
