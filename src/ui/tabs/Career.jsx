import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { eligibleSectors, jobTitle, wageFor, SECTORS } from '../../engine/jobs.js';
import { canEnlistVoluntary, careerTitle, careerWage } from '../../engine/military.js';
import { setJobSearch, quitJob, enlistMilitary } from '../../engine/actions.js';
import { money, titleCase } from '../format.js';

export default function Career({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const sectors = eligibleSectors(ch);

  const isMinor = ch.age < 16;
  const isStudent = ch.employmentStatus === 'student';
  const isMilitary = ch.military.status === 'career' || ch.military.status === 'serving';
  const isPrison = ch.employmentStatus === 'prison';

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Current Situation</h3>
        <div className="kv"><span className="k">Status</span><span className="v">{titleCase(ch.employmentStatus)}</span></div>
        {ch.job && <>
          <div className="kv"><span className="k">Job</span><span className="v">{jobTitle(ch.job)}</span></div>
          <div className="kv"><span className="k">Salary</span><span className="v">{money(wageFor(country, ch.job, ch))}/yr</span></div>
          <div className="kv"><span className="k">Years at rung</span><span className="v">{ch.job.yearsAtRung}</span></div>
        </>}
        {ch.military.status === 'career' && <>
          <div className="kv"><span className="k">Rank</span><span className="v">{careerTitle(ch)}</span></div>
          <div className="kv"><span className="k">Pay</span><span className="v">{money(careerWage(country, ch))}/yr</span></div>
          <div className="kv"><span className="k">Years served</span><span className="v">{ch.military.yearsServed}</span></div>
        </>}
        {ch.military.status === 'serving' && <div className="kv"><span className="k">Conscript service</span><span className="v">{ch.military.remaining} yr(s) left</span></div>}
        {ch.veteran && ch.military.status !== 'career' && <div className="kv"><span className="k">Veteran</span><span className="v">Yes</span></div>}
        {ch.jobSearch.sector && <div className="kv"><span className="k">Seeking work in</span><span className="v">{SECTORS[ch.jobSearch.sector].label}</span></div>}

        {ch.job && <button style={{ marginTop: 12 }} onClick={() => { quitJob(state); refresh(); }}>Quit job</button>}
      </div>

      <div className="panel">
        <h3>Opportunities</h3>
        {isMinor && <div className="muted">Too young to work. Focus on school.</div>}
        {isStudent && <div className="muted">You're studying. Finish your program first (see Education).</div>}
        {isMilitary && <div className="muted">You're in the armed forces. See your status at left.</div>}
        {isPrison && <div className="muted">You cannot seek civilian work while imprisoned. Employment options return after release, subject to your record.</div>}

        {!isMinor && !isStudent && !isMilitary && !isPrison && <>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Choose a sector to look for work. The hire resolves when you advance the year
            (chance depends on unemployment and your skills).
          </div>
          {sectors.length === 0 && <div className="muted">No sectors open to you yet — build skills or finish school.</div>}
          {sectors.map(s => (
            <div key={s.key} className="world-item" onClick={() => { setJobSearch(state, s.key); refresh(); }}
              style={{ cursor: 'pointer', opacity: ch.jobSearch.sector === s.key ? 1 : 0.85 }}>
              <span className="nm">{s.label}</span>
              <span className="rg">enter as {s.entryTitle}
                {ch.jobSearch.sector === s.key ? ' ✓ seeking' : ''}</span>
            </div>
          ))}

          {canEnlistVoluntary(ch, country) && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                {country.name} has armed forces you can join voluntarily.
              </div>
              <button onClick={() => { enlistMilitary(state); refresh(); }}>Enlist in the armed forces</button>
            </div>
          )}
        </>}
      </div>
    </div>
  );
}
