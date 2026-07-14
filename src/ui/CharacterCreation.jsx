import { useState, useMemo } from 'react';
import { COUNTRIES, COUNTRY_BY_ID, locationsFor } from '../engine/countries.js';

// Character creation: Customize or Born-anywhere. Locked fields stay fixed
// while the rest randomize (handled by createCharacter honoring provided keys).
export default function CharacterCreation({ onStart, saveTools }) {
  const sorted = useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), []);
  const [countryId, setCountryId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [sex, setSex] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [religion, setReligion] = useState('');
  const [wealthClass, setWealthClass] = useState('');

  const country = countryId ? COUNTRY_BY_ID[countryId] : null;
  const locations = country ? locationsFor(country) : [];

  const chosenOptions = (mode) => {
    const opts = {};
    if (mode) opts.mode = mode;
    if (countryId) opts.countryId = countryId;
    if (locationName) opts.locationName = locationName;
    if (sex) opts.sex = sex;
    if (ethnicity) opts.ethnicity = ethnicity;
    if (religion) opts.religion = religion;
    if (wealthClass) opts.wealthClass = wealthClass;
    return opts;
  };

  const startCustom = () => onStart(chosenOptions('custom'));
  const startRandom = () => onStart(chosenOptions('random'));

  return (
    <div className="centered">
      <div className="card">
        <h1>RealLives</h1>
        <div className="sub">Be born somewhere on Earth. Live one life, year by year.</div>

        <div className="field">
          <label htmlFor="birth-country">Country</label>
          <select id="birth-country" value={countryId} onChange={e => {
            setCountryId(e.target.value); setLocationName(''); setEthnicity(''); setReligion('');
          }}>
            <option value="">Random (weighted by real birth odds)</option>
            {sorted.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {country && (
          <div className="field">
            <label htmlFor="birth-location">Where in {country.name}</label>
            <select id="birth-location" value={locationName} onChange={e => setLocationName(e.target.value)}>
              <option value="">Random (by urbanization)</option>
              {locations.map(l => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="birth-sex">Sex</label>
          <select id="birth-sex" value={sex} onChange={e => setSex(e.target.value)}>
            <option value="">Random</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="birth-ethnicity">Ethnicity</label>
          {country ? (
            <select id="birth-ethnicity" value={ethnicity} onChange={e => setEthnicity(e.target.value)}>
              <option value="">Random from local demographics</option>
              {country.ethnicGroups.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
          ) : (
            <input id="birth-ethnicity" value={ethnicity} onChange={e => setEthnicity(e.target.value)} placeholder="Random, or type to lock" />
          )}
        </div>

        <div className="field">
          <label htmlFor="birth-religion">Religion</label>
          {country ? (
            <select id="birth-religion" value={religion} onChange={e => setReligion(e.target.value)}>
              <option value="">Random from local demographics</option>
              {country.religions.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
          ) : (
            <input id="birth-religion" value={religion} onChange={e => setReligion(e.target.value)} placeholder="Random, or type to lock" />
          )}
        </div>

        <div className="field">
          <label htmlFor="birth-wealth">Family wealth</label>
          <select id="birth-wealth" value={wealthClass} onChange={e => setWealthClass(e.target.value)}>
            <option value="">Random from the country's economy</option>
            {['Destitute', 'Poor', 'Middle', 'Affluent', 'Rich'].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        <div className="muted" style={{ fontSize: 12, marginBottom: 18 }}>
          Ethnicity, religion, and family wealth roll from your birthplace's real demographics.
          Anything left on “Random” is decided at birth; anything you pick is locked.
        </div>

        <div className="row">
          <button className="primary" onClick={startCustom}>
            {countryId ? `Be born in ${country.name}` : 'Begin life'}
          </button>
          <button onClick={startRandom}>🎲 Born anywhere</button>
        </div>
        {saveTools && <div style={{ marginTop: 18 }}>{saveTools}</div>}
      </div>
    </div>
  );
}
