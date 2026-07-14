import { COUNTRY_BY_ID } from '../engine/countries.js';
import { money, titleCase } from './format.js';
import { personAge } from '../engine/family.js';
import { displayName } from '../engine/names.js';

// Shown at death (GAME_DESIGN section 1). Heir continuation arrives in Phase 4.
export default function LifeSummary({ state, onRestart, onContinueHeir }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const allLines = state.log.flatMap(e => e.lines.map(l => ({ age: e.age, l })));

  return (
    <div className="centered">
      <div className="card">
        <h1>A life concluded</h1>
        <div className="sub">
          {displayName(ch)} lived to age {ch.age} in {ch.countryName}, dying of {ch.causeOfDeath}.
        </div>

        <div className="grid" style={{ marginBottom: 18 }}>
          <div className="panel">
            <div className="kv"><span className="k">Born in</span><span className="v">{ch.location.name}, {ch.countryName}</span></div>
            <div className="kv"><span className="k">Birth name</span><span className="v">{ch.identity?.birthName}</span></div>
            <div className="kv"><span className="k">Final legal name</span><span className="v">{ch.identity?.currentLegalName}</span></div>
            <div className="kv"><span className="k">Lived</span><span className="v">{ch.age} years</span></div>
            <div className="kv"><span className="k">Country life expectancy</span><span className="v">{country.lifeExpectancy} yrs</span></div>
            <div className="kv"><span className="k">Wealth class</span><span className="v">{ch.wealthClass}</span></div>
            <div className="kv"><span className="k">Final estate</span><span className="v">{money(state.estate?.gross || 0)}</span></div>
            <div className="kv"><span className="k">Cause of death</span><span className="v">{titleCase(ch.causeOfDeath || 'unknown')}</span></div>
            <div className="kv"><span className="k">Healthy years recorded</span><span className="v">{ch.health?.healthyYears || 0}</span></div>
            <div className="kv"><span className="k">Years with disability</span><span className="v">{ch.health?.yearsWithDisability || 0}</span></div>
            <div className="kv"><span className="k">Lifetime personal medical spending</span><span className="v">{money(ch.health?.lifetimeMedicalSpend || 0)}</span></div>
            <div className="kv"><span className="k">Citizenship(s)</span><span className="v">{(ch.immigration?.citizenships || [ch.countryId]).map(id => COUNTRY_BY_ID[id]?.name).filter(Boolean).join(', ')}</span></div>
          </div>
        </div>

        {state.estate && <div className="panel" style={{ marginBottom: 18 }}>
          <h3>Estate & Inheritance</h3>
          <div className="kv"><span className="k">Inheritance tax</span><span className="v">−{money(state.estate.tax)} ({Math.round(state.estate.taxRate * 100)}%)</span></div>
          <div className="kv"><span className="k">Distributed</span><span className="v">{money(state.estate.distributable)}</span></div>
          {state.estate.shares.map(s => <div className="kv" key={s.id}>
            <span className="k">{s.label} ({Math.round(s.pct * 100)}%)</span><span className="v">{money(s.amount)}</span>
          </div>)}
          {state.estate.shares.some(s => s.kind === 'child') && <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Continue the family story as:</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {state.estate.shares.filter(s => s.kind === 'child').map(s => (
                <button className="primary" key={s.id} onClick={() => onContinueHeir(s.id)}>{s.label}</button>
              ))}
            </div>
          </div>}
        </div>}

        {(ch.immigration?.history || []).length > 0 && <div className="panel" style={{ marginBottom: 18 }}>
          <h3>Migration History</h3>
          {ch.immigration.history.map((m,i)=><div className="kv" key={i}><span className="k">Age {m.age}</span><span className="v">{m.route === 'naturalization' ? `Naturalized in ${COUNTRY_BY_ID[m.toId]?.name}` : `${COUNTRY_BY_ID[m.fromId]?.name || '—'} → ${COUNTRY_BY_ID[m.toId]?.name || '—'} (${titleCase(m.route)})`}</span></div>)}
        </div>}

        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>Family Tree</h3>
          {ch.spouse && <div className="kv"><span className="k">Spouse · {displayName(ch.spouse)}</span><span className="v">{ch.spouse.alive ? `Age ${personAge(ch, ch.spouse)}` : 'Deceased'}</span></div>}
          {(ch.family || []).map(p => <div className="kv" key={p.id}>
            <span className="k">{p.name || (p.relation === 'Child' ? `Child ${p.childNumber}` : p.relation)}</span>
            <span className="v">{p.alive ? `Age ${personAge(ch, p)}` : 'Deceased'}</span>
          </div>)}
          {!ch.spouse && (ch.family || []).length === 0 && <div className="muted">No surviving family records.</div>}
        </div>

        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>Medical History</h3>
          {(ch.health?.medicalHistory || []).length === 0 && <div className="muted">No major recorded diagnoses.</div>}
          {(ch.health?.medicalHistory || []).map((e, i) => <div className="kv" key={`${e.age}-${i}`}>
            <span className="k">Age {e.age}</span><span className="v">{e.text}</span>
          </div>)}
        </div>

        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>Timeline</h3>
          <div className="log">
            {allLines.map((x, i) => (
              <div className={`yr ${x.l.startsWith('Born') ? 'birth' : x.l.startsWith('Died') ? 'death' : ''}`} key={i}>
                <span className="age">Age {x.age}</span>
                <span className="txt">{x.l}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="primary" onClick={onRestart}>Begin a new life</button>
      </div>
    </div>
  );
}
