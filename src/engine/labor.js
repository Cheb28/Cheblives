import { medianWage } from './countries.js';

export function laborProfile(country) {
  const lightWorkAge = country.incomeTier <= 1 ? 12 : country.incomeTier === 2 ? 13 : 15;
  const childLaborRisk = country.incomeTier <= 1 ? 0.28 : country.incomeTier === 2 && country.lawTier !== 'strong' ? 0.12 : 0.01;
  return { lightWorkAge, childLaborRisk, label: childLaborRisk >= 0.2 ? 'High child-labor risk' : childLaborRisk >= 0.08 ? 'Elevated child-labor risk' : 'Low child-labor risk' };
}
export function teenPartTimeIncome(country, ch) { return medianWage(country) * (ch.age < 18 ? 0.18 : 0.28); }
