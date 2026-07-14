import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { availableActivities, slotBudget } from '../../engine/activities.js';
import { LIFESTYLES } from '../../engine/economy.js';
import { setActivities, setLifestyle } from '../../engine/actions.js';
import { setPartTimeWork } from '../../engine/actions.js';
import { laborProfile, teenPartTimeIncome } from '../../engine/labor.js';
import { money } from '../format.js';
import { visaWorkFraction } from '../../engine/immigration.js';
import { primaryLanguages, languageLevel } from '../../engine/language.js';

// Activities tab: checkboxes limited by slot budget + lifestyle selector.
export default function Activities({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const budget = slotBudget(ch);
  const avail = availableActivities(ch, country);
  const selected = ch.selectedActivities || [];
  const labor = laborProfile(country);
  const canTeenWork = ch.age >= labor.lightWorkAge && ch.age < 18;
  const canStudentWork = ch.age >= 18 && ch.employmentStatus === 'student' && ch.immigration?.residence?.visa?.kind === 'student';
  const localLanguages=primaryLanguages(country);

  const toggle = (id) => {
    let next;
    if (selected.includes(id)) next = selected.filter(x => x !== id);
    else if (selected.length < budget) next = [...selected, id];
    else next = selected; // at budget limit
    setActivities(state, next);
    refresh();
  };

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Activities — {selected.length} / {budget} slots</h3>
        {ch.age < 6 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            You're just a young child — too little to choose activities. Keep advancing to grow up.
          </div>
        ) : (
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Pick how you spend the coming year. These take effect when you advance.
          Empty slots become rest. Your slots depend on your life stage ({ch.employmentStatus}).
        </div>
        )}
        {ch.age>=6&&localLanguages.length>0&&<div style={{marginBottom:10}}>
          <label className="muted" style={{fontSize:12}}>Language to learn&nbsp;
            <select value={ch.languageStudyTarget||''} onChange={e=>{ch.languageStudyTarget=e.target.value||null;refresh();}}>
              <option value="">Choose a primary local language</option>
              {localLanguages.map(lang=><option value={lang} key={lang}>{lang} ({Math.round(languageLevel(ch,lang))}/100)</option>)}
            </select>
          </label>
        </div>}
        {ch.age >= 6 && avail.map(a => {
          const on = selected.includes(a.id);
          const full = !on && selected.length >= budget;
          return (
            <label key={a.id} className="activity" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px',
              opacity: full ? 0.4 : 1, cursor: full ? 'not-allowed' : 'pointer',
            }}>
              <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(a.id)} />
              <span style={{ flex: 1 }}>{a.label}</span>
              <span className="muted" style={{ fontSize: 12 }}>{a.desc}</span>
            </label>
          );
        })}
        {canTeenWork && <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!ch.partTimeWork} onChange={e => {
              setPartTimeWork(state, e.target.checked);
              const nextBudget = slotBudget(ch);
              if (ch.selectedActivities.length > nextBudget) setActivities(state, ch.selectedActivities.slice(0, nextBudget));
              refresh();
            }} />
            <span><strong>Part-time work</strong><br />
              <span className="muted" style={{ fontSize: 12 }}>
                Earn about {money(teenPartTimeIncome(country, ch))}; your parents may take the displayed household share, and you keep the rest. Work uses one activity slot.
              </span>
            </span>
          </label>
        </div>}
        {canStudentWork && <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!ch.partTimeWork} onChange={e => {
              setPartTimeWork(state, e.target.checked);
              const nextBudget = slotBudget(ch);
              if (ch.selectedActivities.length > nextBudget) setActivities(state, ch.selectedActivities.slice(0, nextBudget));
              refresh();
            }} />
            <span><strong>Work within student-visa conditions</strong><br />
              <span className="muted" style={{ fontSize: 12 }}>
                Up to about {Math.round(visaWorkFraction(ch) * 40)} hours/week equivalent. Earn roughly {money(medianWage(country) * .7 * visaWorkFraction(ch))}, but lose one activity slot.
              </span>
            </span>
          </label>
        </div>}
        {ch.age >= 6 && ch.age < labor.lightWorkAge && <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Part-time work becomes available at age {labor.lightWorkAge} under this country's labor setting.
        </div>}
      </div>

      <div className="panel">
        <h3>Lifestyle</h3>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Higher lifestyle raises cost of living but boosts happiness.
        </div>
        {Object.entries(LIFESTYLES).map(([key, ls]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', cursor: 'pointer' }}>
            <input type="radio" name="lifestyle" checked={(ch.lifestyle || 'normal') === key}
              onChange={() => { setLifestyle(state, key); refresh(); }} />
            <span style={{ flex: 1 }}>{ls.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              CoL ×{ls.colMult}{ls.happiness ? `, ${ls.happiness > 0 ? '+' : ''}${ls.happiness} happiness` : ''}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
