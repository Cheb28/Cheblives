import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { eligibleBeneficiaries, inheritanceRules } from '../../engine/inheritance.js';
import { CRIMES, ensureJudicial, lawProfile } from '../../engine/judicial.js';
import { clearWill, setPlannedCrime, setWillShare } from '../../engine/actions.js';
import { money, titleCase } from '../format.js';

export default function Law({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const rules = inheritanceRules(country);
  const profile = lawProfile(country);
  const judicial = ensureJudicial(ch);
  const beneficiaries = eligibleBeneficiaries(ch);
  const total = beneficiaries.reduce((sum, b) => sum + (Number(ch.will?.shares?.[b.id]) || 0), 0);
  const activeRecords = judicial.records.filter(r => !r.overturned && r.expiresAge > ch.age);
  const unavailable = ch.age < 14 || judicial.status === 'prison' || !!judicial.activeCase;

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Justice System</h3>
        <div className="kv"><span className="k">Rule of law</span><span className="v">{titleCase(profile.tier)}</span></div>
        <div className="kv"><span className="k">Trial fairness</span><span className="v">{profile.trialFairness}</span></div>
        <div className="kv"><span className="k">Public defence</span><span className="v">{profile.publicDefender}</span></div>
        <div className="kv"><span className="k">Corruption</span><span className="v">{profile.corruption}</span></div>
        <div className="kv"><span className="k">Police recovery</span><span className="v">~{Math.round(profile.policeRecovery * 100)}%</span></div>
      </div>

      <div className="panel">
        <h3>Your Legal Status</h3>
        <div className="kv"><span className="k">Status</span><span className="v">{titleCase(judicial.status.replaceAll('_', ' '))}</span></div>
        {judicial.activeCase && <div className="kv"><span className="k">Active case</span><span className="v">{judicial.activeCase.label || titleCase(judicial.activeCase.civilKind)}</span></div>}
        {judicial.prison && <>
          <div className="kv"><span className="k">Sentence remaining</span><span className="v">{judicial.prison.remaining} year(s)</span></div>
          <div className="kv"><span className="k">Parole eligibility</span><span className="v">after {judicial.prison.paroleEligibleAfter} served</span></div>
        </>}
        <div className="kv"><span className="k">Active records</span><span className="v">{activeRecords.length}</span></div>
        <div className="kv"><span className="k">Outstanding court debt</span><span className="v">{money(judicial.finesOwed || 0)}</span></div>
        {(judicial.barredUntilAge || 0) > ch.age && <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Most legal immigration and naturalization routes are restricted until age {judicial.barredUntilAge}.
        </div>}
        {activeRecords.map(r => <div className="world-item" key={r.caseId} style={{ marginTop: 8 }}>
          <span className="nm">{r.offence}</span><span className="rg">expires at age {r.expiresAge}</span>
        </div>)}
      </div>

      <div className="panel">
        <h3>Deliberate Crime</h3>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Plan one illegal act for the coming year. Strong-law countries detect more crime; weak-law courts are less predictable and may permit bribery.
        </div>
        {Object.entries(CRIMES).map(([id, crime]) => <button type="button" className="world-item crime-choice" key={id}
          disabled={unavailable}
          onClick={() => { setPlannedCrime(state, judicial.plannedCrime === id ? null : id); refresh(); }}
          style={{ opacity: unavailable ? 0.45 : judicial.plannedCrime === id ? 1 : 0.82 }}>
          <span className="nm">{crime.label}{judicial.plannedCrime === id ? ' ✓ planned' : ''}</span>
          <span className="rg">possible proceeds: ~{money(crime.payout * country.gdpPerCapita * 0.55)}</span>
        </button>)}
        {unavailable && <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Crime planning is unavailable while underage, imprisoned, or already before a court.</div>}
      </div>

      <div className="panel">
        <h3>Inheritance Law</h3>
        <div className="kv"><span className="k">Succession system</span><span className="v">{rules.label}</span></div>
        <div className="kv"><span className="k">Inheritance tax</span><span className="v">{Math.round(rules.taxRate * 100)}%</span></div>
        <div className="kv"><span className="k">Protected family share</span><span className="v">{Math.round(rules.protectedFamilyShare * 100)}%</span></div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{rules.note}</div>
      </div>

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <h3>Your Will</h3>
        {beneficiaries.length === 0 ? <div className="muted">You need a spouse or child before you can name a family beneficiary.</div> : <>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Enter percentage weights. If they do not total 100%, the game normalizes them proportionally. An unequal plan can occasionally be challenged under the local civil system.
          </div>
          {beneficiaries.map(b => <label className="kv" key={b.id} style={{ alignItems: 'center' }}>
            <span className="k">{b.label}</span>
            <span><input type="number" min="0" max="100" value={ch.will?.shares?.[b.id] || 0}
              onChange={e => { setWillShare(state, b.id, e.target.value); refresh(); }} style={{ width: 80 }} /> %</span>
          </label>)}
          <div className="kv" style={{ marginTop: 8 }}><span className="k">Entered total</span><span className="v">{total}%</span></div>
          <button onClick={() => { clearWill(state); refresh(); }} style={{ marginTop: 12 }}>Use default equal split</button>
        </>}
      </div>
    </div>
  );
}
