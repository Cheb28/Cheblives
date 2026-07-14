import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { netWorth } from '../../engine/advance.js';
import { jobTitle } from '../../engine/jobs.js';
import { STAT_COLORS, titleCase, money } from '../format.js';

function StatBar({ label, value, color }) {
  return (
    <div className="stat-row">
      <span className="label">{label}</span>
      <div className="bar" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(value)}><span style={{ width: `${value}%`, background: color }} /></div>
      <span className="val">{Math.round(value)}</span>
    </div>
  );
}

export default function Overview({ state, saveTools }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const s = ch.stats;

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
        <div className="kv"><span className="k">Age</span><span className="v">{ch.age}</span></div>
        <div className="kv"><span className="k">Sex</span><span className="v">{titleCase(ch.sex)}</span></div>
        <div className="kv"><span className="k">Location</span><span className="v">{ch.location.name}, {ch.countryName}</span></div>
        <div className="kv"><span className="k">Ethnicity</span><span className="v">{ch.ethnicity}</span></div>
        <div className="kv"><span className="k">Religion</span><span className="v">{ch.religion}</span></div>
        <div className="kv"><span className="k">Family wealth</span><span className="v">{ch.wealthClass}</span></div>
        <div className="kv"><span className="k">Status</span><span className="v">{ch.job ? jobTitle(ch.job) : titleCase(ch.employmentStatus)}</span></div>
        <div className="kv"><span className="k">Immigration status</span><span className="v">{titleCase(ch.immigration?.residence?.status || 'citizen')}</span></div>
        <div className="kv"><span className="k">Net worth</span><span className="v">{money(netWorth(ch))}</span></div>
      </div>

      <div className="panel">
        <h3>Skills</h3>
        <StatBar label="Academic" value={ch.skills.academic} color="var(--intelligence)" />
        <StatBar label="Vocational" value={ch.skills.vocational} color="var(--fitness)" />
        <StatBar label="Business" value={ch.skills.business} color="var(--happiness)" />
        <StatBar label="Political" value={ch.skills.political} color="var(--charisma)" />
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
