// Country data access + derived helpers (city tiers, median wage, etc.)
import data from '../data/countries.json' with { type: 'json' };

export const COUNTRIES = data.countries;
export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
export const COUNTRY_BY_NAME = Object.fromEntries(COUNTRIES.map(c => [c.name, c]));

// City-tier cost-of-living multipliers (GAME_DESIGN section 8.4).
export const CITY_TIERS = {
  capital: 1.30,
  major: 1.15,
  secondary: 1.00,
  town: 0.85,
  rural: 0.70,
};

// Full location list for a country: named factbook cities + generic tiers.
// Returns [{name, kind, colMultiplier, pop}] where kind drives CoL.
export function locationsFor(country) {
  const out = [];
  for (const c of country.cities) {
    const kind = c.capital ? 'capital' : 'major';
    out.push({ name: c.name, kind, colMultiplier: CITY_TIERS[kind], pop: c.pop });
  }
  out.push({ name: 'A secondary city', kind: 'secondary', colMultiplier: CITY_TIERS.secondary });
  out.push({ name: 'A small town', kind: 'town', colMultiplier: CITY_TIERS.town });
  out.push({ name: 'The countryside', kind: 'rural', colMultiplier: CITY_TIERS.rural });
  return out;
}

// Median wage in PPP dollars (GAME_DESIGN section 6).
export function medianWage(country) {
  return (country.gdpPerCapita || 5000) * 0.55;
}

// World annual-birth weight for "Born anywhere" (population x birth rate).
export function birthWeight(country) {
  return (country.population || 0) * (country.birthRate || 0);
}
