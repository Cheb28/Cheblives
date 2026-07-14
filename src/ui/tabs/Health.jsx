import { COUNTRY_BY_ID, medianWage } from '../../engine/countries.js';
import { healthcareCoverage, disabilityBurden, severityLabel } from '../../engine/health.js';
import { STAT_COLORS, money } from '../format.js';

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

  return <div className="grid cols-2">
    <div>
      <div className="panel">
        <h3>Your Health</h3>
        <div className="stat-row"><span className="label">Health</span><div className="bar"><span style={{ width: `${ch.stats.health}%`, background: STAT_COLORS.health }} /></div><span className="val">{Math.round(ch.stats.health)}</span></div>
        <div className="stat-row"><span className="label">Fitness</span><div className="bar"><span style={{ width: `${ch.stats.fitness}%`, background: STAT_COLORS.fitness }} /></div><span className="val">{Math.round(ch.stats.fitness)}</span></div>
        <div className="kv"><span className="k">Age-related frailty</span><span className="v">{Math.round(health.frailty || 0)} / 100</span></div>
        <div className="kv"><span className="k">Healthy years recorded</span><span className="v">{health.healthyYears || 0}</span></div>
        <div className="kv"><span className="k">Lifetime personal medical spending</span><span className="v">{money(health.lifetimeMedicalSpend || 0)}</span></div>
      </div>

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
