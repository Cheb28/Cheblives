import { lazy, Suspense } from 'react';
import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { countryFacts } from '../../engine/countryFacts.js';
import { flagUrl } from '../../data/flagUrls.js';
import { pop, titleCase } from '../format.js';

const CountryMap = lazy(() => import('../CountryMap.jsx'));

function Fact({ label, children }) {
  return <div className="country-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}

function CountryFlag({ country, compact = false }) {
  return <img className={`country-flag-art${compact ? ' compact' : ''}`} src={flagUrl(country.flagCode)} alt={`Flag of ${country.name}`} />;
}

export default function Country({ state }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const homeCountry = COUNTRY_BY_ID[ch.immigration?.originCountryId] || country;
  const facts = countryFacts(country, ch);
  return <div className="country-screen">
    <section className="panel country-hero" aria-labelledby="country-heading">
      <div>
        <CountryFlag country={country} />
        <h2 id="country-heading">{country.name}</h2>
        <p>{ch.location.name} · {country.region}</p>
      </div>
      {homeCountry.id !== country.id && <span className="tag">Born in {homeCountry.name}</span>}
    </section>

    <section className="panel country-map-panel" aria-labelledby="map-heading">
      <h3 id="map-heading">Current Location Map</h3>
      <Suspense fallback={<div className="country-map-placeholder" role="status">Loading the interactive map…</div>}>
        <CountryMap country={country} homeCountry={homeCountry} />
      </Suspense>
      <p className="map-attribution"><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · <a href="https://carto.com/attributions">© CARTO</a> · <a href="https://maplibre.org/">MapLibre</a></p>
    </section>

    <section className="panel" aria-labelledby="facts-heading">
      <h3 id="facts-heading">Country Facts</h3>
      <dl className="country-facts">
        <Fact label="Country and flag"><span className="country-flag-fact"><CountryFlag country={country} compact /> {facts.name}</span></Fact>
        <Fact label="Capital and modeled location">{facts.capital} · {facts.location}</Fact>
        <Fact label="Population">{pop(facts.population)}</Fact>
        <Fact label="Primary languages">{facts.languages.join(', ') || 'Not listed'}</Fact>
        <Fact label="Currency">{facts.currency}</Fact>
        <Fact label="Income / development">{facts.income} · tier {country.incomeTier}/4 · ${Math.round(country.gdpPerCapita).toLocaleString()} GDP per person (PPP)</Fact>
        <Fact label="Life expectancy">{facts.lifeExpectancy} years</Fact>
        <Fact label="Healthcare">{titleCase(facts.healthcare)}</Fact>
        <Fact label="Education">{titleCase(facts.education)}</Fact>
        <Fact label="Employment and gender rights">{facts.employment}<small>{facts.genderRights}</small></Fact>
        <Fact label="Same-sex relationship status">{facts.relationships}<small>{facts.relationshipNote}</small></Fact>
        <Fact label="Military and conscription">{titleCase(facts.military)}</Fact>
        <Fact label="Welfare and housing">{titleCase(facts.welfare)}<small>{titleCase(facts.housing)}</small></Fact>
        <Fact label="Tax and inheritance">{titleCase(facts.tax)}<small>{facts.inheritance}</small></Fact>
        <Fact label="Law and institutions">{titleCase(facts.law)}</Fact>
        <Fact label="Immigration and citizenship">{titleCase(facts.immigration)}<small>Your citizenship(s): {facts.citizenships.join(', ') || 'Not recorded'}</small></Fact>
        <Fact label="Current economic conditions">{facts.economy}</Fact>
        <Fact label="Conflict conditions">{facts.conflict}</Fact>
      </dl>
    </section>

    <aside className="panel country-model-note" aria-labelledby="country-model-heading">
      <h3 id="country-model-heading">About This Country Model</h3>
      <p>These country profiles simplify laws, institutions, economic conditions, and social outcomes for a one-year-turn life simulation. They describe broad modeled conditions, not every person or household, and are not legal, immigration, financial, or medical advice.</p>
    </aside>
  </div>;
}
