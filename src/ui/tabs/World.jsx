import { useState, useMemo } from 'react';
import { COUNTRIES } from '../../engine/countries.js';
import { pop, titleCase } from '../format.js';

// World tab: browse any country's profile. Doubles as emigration research later.
export default function World() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(COUNTRIES[0].id);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return [...COUNTRIES]
      .filter(c => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query]);

  const c = COUNTRIES.find(x => x.id === selectedId);

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Countries ({COUNTRIES.length})</h3>
        <input
          aria-label="Search countries"
          placeholder="Search country or region…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', marginBottom: 10 }}
        />
        <div className="world-list">
          {filtered.map(x => (
            <button type="button" key={x.id} className="world-item" aria-pressed={selectedId === x.id} onClick={() => setSelectedId(x.id)}>
              <span className="nm">{x.name}</span>
              <span className="rg">{x.region}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="muted" style={{padding:12}}>No countries match that search.</div>}
        </div>
      </div>

      {c && (
        <div className="panel">
          <h3>{c.name}</h3>
          <div className="kv"><span className="k">Region</span><span className="v">{c.region}</span></div>
          <div className="kv"><span className="k">Population</span><span className="v">{pop(c.population)}</span></div>
          <div className="kv"><span className="k">Capital</span><span className="v">{c.capital || '—'}</span></div>
          <div className="kv"><span className="k">GDP per capita</span><span className="v">${Math.round(c.gdpPerCapita).toLocaleString()}</span></div>
          <div className="kv"><span className="k">Income tier</span><span className="v">{c.incomeTier} / 4</span></div>
          <div className="kv"><span className="k">Life expectancy</span><span className="v">{c.lifeExpectancy} yrs</span></div>
          <div className="kv"><span className="k">Healthcare</span><span className="v">{titleCase(c.healthcareArchetype.replace(/-/g, ' '))}</span></div>
          <div className="kv"><span className="k">Welfare</span><span className="v">{titleCase(c.welfareTier)}</span></div>
          <div className="kv"><span className="k">Rule of law</span><span className="v">{titleCase(c.lawTier)}</span></div>
          <div className="kv"><span className="k">Tax level</span><span className="v">{titleCase(c.taxTier)}</span></div>
          <div className="kv"><span className="k">Conscription</span><span className="v">
            {c.military.hasArmedForces ? <>
              {titleCase(c.military.conscription)}
              {(c.military.callUpRate ?? 1) < 1
                ? ` · limited intake (~${Math.round(c.military.callUpRate * 100)}%)`
                : ''}
            </> : 'No armed forces'}</span></div>
          <div className="kv"><span className="k">Naturalization</span><span className="v">{c.citizenship.naturalizationYears} yrs</span></div>
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Major cities</div>
            {c.cities.map(city => (
              <span key={city.name} className="tag" style={{ marginRight: 6, marginBottom: 6 }}>
                {city.name}{city.capital ? ' ★' : ''}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Religions</div>
            {c.religions.slice(0, 4).map(r => (
              <span key={r.name} className="tag" style={{ marginRight: 6 }}>{r.name} {r.pct}%</span>
            ))}
            {c.religions.length === 0 && <span className="muted">—</span>}
          </div>
        </div>
      )}
    </div>
  );
}
