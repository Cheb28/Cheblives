import { useMemo, useState } from 'react';
import { COUNTRIES, COUNTRY_BY_ID, locationsFor } from '../engine/countries.js';
import Credits from './Credits.jsx';

export default function CharacterCreation({ onStart, saveTools }) {
  const sorted = useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), []);
  const [mode, setMode] = useState(null);
  const [countryId, setCountryId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [sex, setSex] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [religion, setReligion] = useState('');
  const [wealthClass, setWealthClass] = useState('');
  const [dualNationality, setDualNationality] = useState(false);
  const [secondNationalityCountryId, setSecondNationalityCountryId] = useState('');
  const [foreignParentRelation, setForeignParentRelation] = useState('Father');

  const country = countryId ? COUNTRY_BY_ID[countryId] : null;
  const locations = country ? locationsFor(country) : [];
  const foreignCountries = country ? sorted.filter(c => c.id !== country.id) : [];

  const startCustom = () => {
    if (!country) return;
    const opts = { mode: 'custom', countryId };
    if (locationName) opts.locationName = locationName;
    if (sex) opts.sex = sex;
    if (ethnicity) opts.ethnicity = ethnicity;
    if (religion) opts.religion = religion;
    if (wealthClass) opts.wealthClass = wealthClass;
    if (dualNationality && secondNationalityCountryId) {
      opts.secondNationalityCountryId = secondNationalityCountryId;
      opts.foreignParentRelation = foreignParentRelation;
    }
    onStart(opts);
  };

  const changeCountry = id => {
    setCountryId(id); setLocationName(''); setEthnicity(''); setReligion('');
    setDualNationality(false); setSecondNationalityCountryId(''); setForeignParentRelation('Father');
  };

  return <div className="centered">
    <div className="card">
      <h1>Cheb's Human Atlas</h1>
      <div className="sub">Be born somewhere on Earth. Live one life, year by year.</div>

      {!mode && <>
        <div className="creation-mode-grid">
          <button className="creation-choice primary" onClick={() => onStart({ mode: 'random' })}>
            <strong>Born anywhere</strong>
            <span>Random birthplace, family, identity, and circumstances using real-world birth odds.</span>
          </button>
          <button className="creation-choice" onClick={() => setMode('custom')}>
            <strong>Create a custom life</strong>
            <span>Choose a birthplace and customize the options available there.</span>
          </button>
        </div>
        {saveTools && <div style={{ marginTop: 18 }}>{saveTools}</div>}
      </>}

      {mode === 'custom' && <>
        <div className="field">
          <label htmlFor="birth-country">Birth country</label>
          <select id="birth-country" value={countryId} onChange={e => changeCountry(e.target.value)}>
            <option value="">Choose a country</option>
            {sorted.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {country && <>
          <div className="field">
            <label htmlFor="birth-location">Where in {country.name}</label>
            <select id="birth-location" value={locationName} onChange={e => setLocationName(e.target.value)}>
              <option value="">Random location</option>
              {locations.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="birth-sex">Sex</label>
            <select id="birth-sex" value={sex} onChange={e => setSex(e.target.value)}>
              <option value="">Random</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="birth-ethnicity">Ethnicity in {country.name}</label>
            <select id="birth-ethnicity" value={ethnicity} onChange={e => setEthnicity(e.target.value)}>
              <option value="">Random from local demographics</option>
              {country.ethnicGroups.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="birth-religion">Religion in {country.name}</label>
            <select id="birth-religion" value={religion} onChange={e => setReligion(e.target.value)}>
              <option value="">Random from local demographics</option>
              {country.religions.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="birth-wealth">Family wealth</label>
            <select id="birth-wealth" value={wealthClass} onChange={e => setWealthClass(e.target.value)}>
              <option value="">Random from the country's economy</option>
              {['Destitute', 'Poor', 'Middle', 'Affluent', 'Rich'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>

          <label className="dual-option">
            <input type="checkbox" checked={dualNationality} onChange={e => { setDualNationality(e.target.checked); if (!e.target.checked) setSecondNationalityCountryId(''); }} />
            <span><strong>Start with two nationalities</strong><br /><span className="muted">One parent is a citizen of another country, and you inherit that citizenship.</span></span>
          </label>

          {dualNationality && <div className="dual-fields">
            <div className="field">
              <label htmlFor="foreign-parent">Which parent has the other nationality?</label>
              <select id="foreign-parent" value={foreignParentRelation} onChange={e => setForeignParentRelation(e.target.value)}>
                <option value="Father">Father</option><option value="Mother">Mother</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="second-nationality">Their nationality</label>
              <select id="second-nationality" value={secondNationalityCountryId} onChange={e => setSecondNationalityCountryId(e.target.value)}>
                <option value="">Choose their country</option>
                {foreignCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>}

          <p className="muted" style={{ fontSize: 12 }}>Ethnicity and religion are limited to the options recorded for {country.name}. A foreign-national parent receives identity details from their own country.</p>
        </>}

        <div className="row">
          <button onClick={() => setMode(null)}>Back</button>
          <button className="primary" disabled={!country || (dualNationality && !secondNationalityCountryId)} onClick={startCustom}>
            {country ? `Be born in ${country.name}` : 'Choose a birth country'}
          </button>
        </div>
      </>}
      <Credits />
    </div>
  </div>;
}
