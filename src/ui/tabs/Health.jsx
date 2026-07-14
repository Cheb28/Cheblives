import { COUNTRY_BY_ID, medianWage } from '../../engine/countries.js';
import { healthcareCoverage, disabilityBurden, severityLabel } from '../../engine/health.js';
import { money } from '../format.js';
import { bmiClassification, lifeConditionSummary } from '../../engine/lifeState.js';
import { ensureAdultLife } from '../../engine/adultLife.js';

const POLICIES = [
  { id: 'always', label: 'Always treat', desc: 'seek care even when it strains your finances' },
  { id: 'affordable', label: 'Treat if affordable', desc: 'seek care when available and affordable' },
  { id: 'never', label: 'Avoid treatment', desc: 'avoid care and accept much higher health risk' },
];

const pretty = value => value ? value.replace(/(^|\s)\S/g, x => x.toUpperCase()) : '—';

export default function Health({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const health = ch.health;
  const cov = healthcareCoverage(country, ch);
  const isMixed = country.healthcareArchetype === 'mixed';
  const setPolicy = id => { health.healthPolicy = id; refresh(); };
  const recent = [...(health.medicalHistory || [])].reverse().slice(0, 8);
  const life=ch.lifeState,w=lifeConditionSummary(ch),recorded=life.body.recorded,adult=ensureAdultLife(ch);
  const frailty=health.frailty||0,frailtyLabel=frailty>=60?'Severe':frailty>=35?'Moderate':frailty>=15?'Mild':'Not apparent';

  return <div className="grid cols-2">
    <div>
      <div className="panel">
        <h3>Your Health</h3>
        <div className="kv"><span className="k">Physical condition</span><span className="v">{w.physicalCondition} · {w.physicalTrend}</span></div>
        <div className="kv"><span className="k">Daily function</span><span className="v">{w.function}</span></div>
        <div className="kv"><span className="k">Energy</span><span className="v">{w.energy}</span></div>
        <div className="kv"><span className="k">Age-related frailty</span><span className="v">{frailtyLabel}</span></div>
        <div className="kv"><span className="k">Healthy years recorded</span><span className="v">{health.healthyYears || 0}</span></div>
        <div className="kv"><span className="k">Lifetime personal medical spending</span><span className="v">{money(health.lifetimeMedicalSpend || 0)}</span></div>
      </div>

      <div className="panel" style={{marginTop:12}}><h3>Body Measurements</h3>{recorded?<><div className="kv"><span>Height</span><span>{recorded.heightCm.toFixed(0)} cm · {(recorded.heightCm/2.54).toFixed(0)} in</span></div><div className="kv"><span>Weight</span><span>{recorded.weightKg.toFixed(1)} kg · {(recorded.weightKg*2.20462).toFixed(1)} lb</span></div><div className="kv"><span>BMI</span><span>{recorded.bmi.toFixed(1)} · {bmiClassification(recorded.bmi)}</span></div><p className="muted">Recorded at age {recorded.age} through {recorded.source}. BMI is only one screening measure and does not define overall health.</p></>:<div className="muted">No body measurement has been recorded.</div>}<div className="kv"><span>Usual sleep</span><span>{life.measurements.sleepHoursNight.toFixed(1)} hours/night</span></div><div className="kv"><span>Exercise</span><span>{Math.round(life.measurements.exerciseMinutesWeek)} min/week</span></div><div className="kv"><span>Smoking exposure</span><span>{life.exposures.packYears.toFixed(1)} pack-years</span></div><div className="kv"><span>Alcohol</span><span>{life.measurements.drinksWeek} drinks/week</span></div></div>

      {ch.age>=18&&<div className="panel" style={{marginTop:12}}><h3>Adult Sexual Health</h3><div className="kv"><span>Testing plan</span><span>{adult.sexual.testing}</span></div><div className="kv"><span>Protection plan</span><span>{adult.sexual.protection}</span></div><div className="kv"><span>HIV PrEP plan</span><span>{adult.sexual.prep?'Enabled where available':'Not enabled'}</span></div>{adult.infections.length===0?<div className="muted">No sexually transmitted infection is recorded.</div>:adult.infections.map(x=><div className="kv" key={x.id}><span>{x.diagnosed?x.name:'Undiagnosed infection'}</span><span>{x.diagnosed?(x.treated?'Treated or controlled':'Diagnosed; untreated'):'Not yet detected'}</span></div>)}<p className="muted">This is a non-explicit, consensual-adult health model. Testing and treatment depend on access and your standing healthcare choices.</p></div>}

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Chronic Conditions</h3>
        {(health.conditions || []).length === 0 && <div className="muted">No diagnosed chronic conditions.</div>}
        {(health.conditions || []).map(c => <div key={c.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="kv"><span className="k"><strong>{c.name}</strong><br /><span className="muted" style={{ fontSize: 11 }}>Diagnosed age {c.diagnosedAge}; {c.years || 0} year(s)</span></span><span className="v" style={{ color: c.controlled ? 'var(--good)' : 'var(--bad)' }}>{c.controlled ? 'Controlled' : 'Uncontrolled'}</span></div>
          <div className="kv"><span className="k">Severity</span><span className="v">{severityLabel(c.severity || 1)}</span></div>
          <div className="kv"><span className="k">Typical annual management</span><span className="v">{money((c.mgmtCost || 0) * medianWage(country) * cov.treatmentShare)}</span></div>
        </div>)}
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Disability & Function</h3>
        {(health.disabilities || []).length === 0 ? <div className="muted">No lasting disability recorded.</div> : <>
          <div className="kv"><span className="k">Combined functional burden</span><span className="v">{disabilityBurden(ch)}</span></div>
          {(health.disabilities || []).map(d => <div className="kv" key={d.id}><span className="k"><strong>{pretty(d.type)}</strong><br /><span className="muted" style={{ fontSize: 11 }}>From {d.cause}; onset age {d.onsetAge}</span></span><span className="v">{severityLabel(d.severity)}{d.permanent ? ', lasting' : ', temporary'}</span></div>)}
          <p className="muted" style={{ fontSize: 12 }}>Disability can reduce free time or make some physical work harder. Stronger rule-of-law settings reduce employment penalties through assumed accommodations; no new cash benefit is applied in this phase.</p>
        </>}
      </div>
    </div>

    <div>
      <div className="panel">
        <h3>Healthcare Access</h3>
        <div className="kv"><span className="k">Country system</span><span className="v">{cov.label}</span></div>
        <div className="kv"><span className="k">Care quality</span><span className="v">Tier {cov.qualityTier} / 4</span></div>
        <div className="kv"><span className="k">Estimated access when care is sought</span><span className="v">{Math.round(cov.access * 100)}%</span></div>
        <div className="kv"><span className="k">Your treatment share</span><span className="v">{Math.round(cov.treatmentShare * 100)}%</span></div>
        {cov.premium > 0 && <div className="kv"><span className="k">Insurance premium</span><span className="v">{Math.round(cov.premium * 100)}% of income</span></div>}
        {isMixed && ch.age >= 18 && <div style={{ marginTop: 12 }}><label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}><input type="checkbox" checked={health.insured} onChange={() => { health.insured = !health.insured; refresh(); }} /><span>Buy private health insurance</span></label><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Insurance costs 8% of income and lowers treatment bills while improving access.</div></div>}

        <div style={{ marginTop: 16 }}><div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>STANDING TREATMENT POLICY</div>{POLICIES.map(p => <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 2px', cursor: 'pointer' }}><input type="radio" name="policy" checked={health.healthPolicy === p.id} onChange={() => setPolicy(p.id)} /><span style={{ flex: 1 }}>{p.label}</span><span className="muted" style={{ fontSize: 12 }}>{p.desc}</span></label>)}</div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Medical History</h3>
        {recent.length === 0 && <div className="muted">No major diagnosis or lasting treatment event yet.</div>}
        {recent.map((e, i) => <div className="kv" key={`${e.age}-${i}`}><span className="k">Age {e.age}</span><span className="v" style={{ maxWidth: '72%', textAlign: 'right' }}>{e.text}</span></div>)}
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Last Year</h3>
        <div className="kv"><span className="k">New diagnoses</span><span className="v">{health.lastYear?.diagnoses?.length || 0}</span></div>
        <div className="kv"><span className="k">Major treatments/recoveries</span><span className="v">{health.lastYear?.treatments?.length || 0}</span></div>
        <div className="kv"><span className="k">Direct treatment and management cost</span><span className="v">{money(health.lastYear?.costs || 0)}</span></div>
      </div>
    </div>
  </div>;
}
