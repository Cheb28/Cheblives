import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { canEnrollUniversity, canEnrollVocational, universityTuition, isEnrolledHigher } from '../../engine/education.js';
import { enrollUniversity, enrollVocational, setPrivateSchool, setResistDropout } from '../../engine/actions.js';
import { money } from '../format.js';

const STAGE_LABELS = {
  preschool: 'Not yet in school', primary: 'Primary school', secondary: 'Secondary school',
  secondary_done: 'Finished secondary', university: 'At university', vocational: 'In vocational training',
  graduated: 'Graduated', dropout: 'Left school early', workforce: 'In the workforce',
};

export default function Education({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const ed = ch.education;
  const tuition = universityTuition(country, ch);
  const uniOk = canEnrollUniversity(ch);
  const vocOk = canEnrollVocational(ch);

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Schooling</h3>
        <div className="kv"><span className="k">Stage</span><span className="v">{STAGE_LABELS[ed.stage] || ed.stage}</span></div>
        <div className="kv"><span className="k">Academic skill</span><span className="v">{Math.round(ch.skills.academic)}</span></div>
        <div className="kv"><span className="k">Degree</span><span className="v">{ed.degree ? 'Yes' : 'No'}</span></div>
        <div className="kv"><span className="k">Vocational cert.</span><span className="v">{ed.vocational ? 'Yes' : 'No'}</span></div>
        {isEnrolledHigher(ch) && <div className="kv"><span className="k">Years completed</span><span className="v">{ed.yearsInHigher}</span></div>}
        <div className="kv"><span className="k">Country education tier</span><span className="v">{country.educationTier} / 4</span></div>
        {ch.age >= 6 && ch.age < 18 && !ed.droppedOut && <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={ed.private} onChange={e => { setPrivateSchool(state, e.target.checked); refresh(); }} />
            <span>Attend private school</span>
          </label>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Family-funded at {money(country.gdpPerCapita * 0.55)}/yr; adds +2 Academic each school year.
          </div>
        </>}
        {ch.age >= 6 && ch.age < 18 && country.educationTier <= 2 && ch.wealthIdx <= 1 && !ed.droppedOut && <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={ed.resistDropout} onChange={e => { setResistDropout(state, e.target.checked); refresh(); }} />
            <span>Make sacrifices to stay in school</span>
          </label>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            If your family needs you to leave school, resist when possible at the cost of one family-wealth tier.
          </div>
        </>}
      </div>

      <div className="panel">
        <h3>Further Education</h3>
        {ch.age < 18 && <div className="muted">You're still in school. Options open up at 18.</div>}
        {isEnrolledHigher(ch) && <div className="muted">Currently enrolled. Keep advancing to complete your program.</div>}

        {!isEnrolledHigher(ch) && ch.age >= 16 && <>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            University needs Academic ≥ 50; vocational needs ≥ 30. A degree unlocks professional careers.
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>University (4 years)</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Tuition: {tuition.annual === 0 ? (tuition.scholarship ? 'Free (scholarship)' : 'Free') : money(tuition.annual) + '/yr'}
              {tuition.loanable && tuition.annual > 0 ? ' — student loan available' : ''}
            </div>
            <div className="row">
              <button className="primary" disabled={!uniOk} onClick={() => { enrollUniversity(state, false); refresh(); }}>
                Enroll{tuition.annual > 0 ? ' (pay tuition)' : ''}
              </button>
              {tuition.loanable && tuition.annual > 0 && (
                <button disabled={!uniOk} onClick={() => { enrollUniversity(state, true); refresh(); }}>Enroll with loan</button>
              )}
            </div>
            {!uniOk && ch.age >= 18 && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {ch.skills.academic < 50 ? 'Academic skill too low.' : 'Not eligible right now.'}
            </div>}
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Vocational training (2 years)</div>
            <button disabled={!vocOk} onClick={() => { enrollVocational(state); refresh(); }}>Enroll in vocational program</button>
          </div>
        </>}
      </div>
    </div>
  );
}
