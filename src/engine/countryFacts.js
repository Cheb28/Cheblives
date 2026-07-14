import { COUNTRY_BY_ID } from './countries.js';
import { genderRightsProfile } from './genderRights.js';
import { housingProfile } from './housing.js';
import { inheritanceRules } from './inheritance.js';
import { lawProfile } from './judicial.js';
import { primaryLanguages } from './language.js';
import { relationshipLawProfile } from './relationshipLaws.js';
import { welfareProfile } from './welfare.js';

const INCOME_LABELS = ['Unclassified', 'Low income', 'Lower-middle income', 'Upper-middle income', 'High income'];

export function flagEmoji(country) {
  const code = country?.flagCode;
  if (!/^[A-Z]{2}$/.test(code || '')) return '🌐';
  return [...code].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
}

export function countryFacts(country, character) {
  const rights = genderRightsProfile(country);
  const relationships = relationshipLawProfile(country);
  const housing = housingProfile(country);
  const welfare = welfareProfile(country);
  const inheritance = inheritanceRules(country);
  const law = lawProfile(country);
  const immigration = character?.immigration || {};
  const citizenships = (immigration.citizenships || [character?.countryId])
    .map(id => COUNTRY_BY_ID[id]?.name).filter(Boolean);
  const military = country.military || {};
  const serviceYears = military.serviceLengthYears ? Math.max(1, Math.ceil(military.serviceLengthYears)) : null;
  return {
    flag: flagEmoji(country),
    name: country.name,
    capital: country.capital || 'Not modeled',
    location: character?.location?.name || country.capital || 'Not modeled',
    population: country.population,
    languages: primaryLanguages(country),
    currency: country.currency || 'Local currency (PPP-modeled in game)',
    income: INCOME_LABELS[country.incomeTier] || 'Unclassified',
    lifeExpectancy: country.lifeExpectancy,
    healthcare: `${country.healthcareArchetype.replace(/-/g, ' ')} · tier ${country.healthTier}/4`,
    education: `tier ${country.educationTier}/4 · about ${country.schoolLifeExpectancy} years of schooling`,
    employment: `${country.unemployment ?? 'Unknown'}% unemployment · ${rights.label}`,
    genderRights: rights.note,
    relationships: relationships.label,
    relationshipNote: relationships.note,
    military: !military.hasArmedForces ? 'No standing armed forces modeled'
      : `${military.conscription}${(military.callUpRate ?? 1) < 1 ? ` · selective intake (~${Math.round(military.callUpRate * 100)}%)` : ''}${serviceYears ? ` · ${serviceYears} year${serviceYears === 1 ? '' : 's'} modeled obligation` : ''}${military.womenConscripted ? ' · applies to women and men in the model' : ' · women not routinely conscripted in the model'}`,
    welfare: `${country.welfareTier} · ${welfare.model}`,
    housing: `${housing.supply.replace('_', ' ')} social-housing supply · ${housing.familyReliance ? 'strong family reliance' : 'formal housing support modeled'}`,
    tax: `${country.taxTier} tax profile · about ${country.taxRevenuePct}% of GDP in revenue`,
    inheritance: `${inheritance.label} · ${Math.round(inheritance.taxRate * 100)}% modeled estate tax`,
    law: `${country.lawTier} rule of law · ${law.trialFairness.toLowerCase()} trial fairness · ${law.corruption.toLowerCase()} corruption risk`,
    immigration: `${immigration.residence?.status || 'citizen'} · ${country.citizenship.naturalizationYears} modeled years to naturalize · ${country.citizenship.dualAllowed ? 'dual citizenship permitted' : 'prior citizenship normally replaced'}`,
    citizenships,
    economy: `${country.gdpGrowth ?? 'Unknown'}% growth · ${country.inflation ?? 'Unknown'}% inflation · stability tier ${country.stability}/3`,
    conflict: country.conflict?.displacement
      ? `Major displacement modeled (${Math.round(country.conflict.idp || 0).toLocaleString()} internally displaced)`
      : 'No major internal-displacement crisis modeled',
  };
}

