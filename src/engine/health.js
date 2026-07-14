// Expanded health model: named acute illnesses, progressive chronic conditions,
// typed disability, healthcare access/cost, mental health, and physical aging.
// Treatment follows one standing player policy so the yearly loop never blocks.
import { medianWage } from './countries.js';

export function initHealth() {
  return {
    conditions: [],
    disabilities: [],
    medicalHistory: [],
    healthPolicy: 'affordable',
    insured: false,
    disabled: false,
    lowHappinessStreak: 0,
    hasDepression: false,
    frailty: 0,
    physicalDecline: 0,
    healthyYears: 0,
    yearsWithDisability: 0,
    lifetimeMedicalSpend: 0,
    lastYear: { diagnoses: [], treatments: [], costs: 0 },
    lastSevereEvent: null,
  };
}

const CHRONIC = {
  asthma: { name: 'Asthma', minAge: 5, annual: () => 0.006, decay: 1.2, mgmtCost: 0.04, mortalityRisk: 0.10, disabilityType: 'respiratory' },
  diabetes: { name: 'Type 2 diabetes', minAge: 25, annual: c => 0.003 + (c.obesity || 15) / 5000, decay: 1.8, mgmtCost: 0.08, mortalityRisk: 0.25, disabilityType: 'mobility' },
  hypertension: { name: 'Hypertension', minAge: 35, annual: c => 0.008 + (c.obesity || 15) / 8000, decay: 1.2, mgmtCost: 0.035, mortalityRisk: 0.22 },
  arthritis: { name: 'Arthritis', minAge: 50, annual: () => 0.012, decay: 0.8, mgmtCost: 0.04, mortalityRisk: 0.03, disabilityType: 'mobility' },
  copd: { name: 'Chronic respiratory disease', minAge: 40, annual: c => 0.002 + (c.tobacco || 20) / 3500, decay: 2.0, mgmtCost: 0.09, mortalityRisk: 0.32, disabilityType: 'respiratory' },
  kidney: { name: 'Chronic kidney disease', minAge: 45, annual: () => 0.003, decay: 2.4, mgmtCost: 0.14, mortalityRisk: 0.38, disabilityType: 'mobility' },
  heart: { name: 'Heart disease', minAge: 45, annual: c => 0.003 + ((c.obesity || 15) + (c.tobacco || 20)) / 9000, decay: 2.2, mgmtCost: 0.10, mortalityRisk: 0.45, disabilityType: 'mobility' },
  dementia: { name: 'Dementia', minAge: 70, annual: (_c, age) => 0.008 + Math.max(0, age - 75) * 0.002, decay: 2.5, mgmtCost: 0.16, mortalityRisk: 0.35, disabilityType: 'cognitive' },
};

const MINOR_ILLNESSES = [
  { id: 'viral', name: 'Viral respiratory infection', weight: () => 5 },
  { id: 'gastro', name: 'Gastroenteritis', weight: (c, age) => (age < 12 ? 4 : 2) * (1.2 - (c.sanitation || 80) / 200) },
  { id: 'migraine', name: 'Migraine episode', weight: (_c, age) => age >= 12 ? 2 : 0.2 },
  { id: 'skin', name: 'Skin infection', weight: () => 1.5 },
];

const SERIOUS_ILLNESSES = [
  { id: 'pneumonia', name: 'Pneumonia', severity: 2, weight: (_c, age) => age < 6 || age >= 65 ? 6 : 2, chronicId: 'respiratory_sequela', chronicName: 'Post-pneumonia lung damage', mortalityRisk: 0.28 },
  { id: 'diarrheal', name: 'Severe diarrheal disease', severity: 2, weight: (c, age) => (age < 6 ? 7 : 1) * (1.3 - (c.waterAccess || 80) / 130), mortalityRisk: 0.25 },
  { id: 'malaria', name: 'Malaria', severity: 2, weight: c => c.incomeTier <= 2 ? 3 : 0.05, mortalityRisk: 0.22 },
  { id: 'tuberculosis', name: 'Tuberculosis', severity: 3, weight: c => c.incomeTier <= 2 ? 2.5 : 0.4, chronicId: 'tb_damage', chronicName: 'Chronic lung damage', mortalityRisk: 0.38 },
  { id: 'cancer', name: 'Cancer', severity: 3, weight: (_c, age) => age >= 45 ? 1 + (age - 45) / 12 : 0.05, chronicId: 'cancer', chronicName: 'Cancer', mortalityRisk: 0.65 },
  { id: 'stroke', name: 'Stroke', severity: 3, weight: (_c, age) => age >= 55 ? 1 + (age - 55) / 10 : 0.02, chronicId: 'stroke_effects', chronicName: 'Effects of stroke', mortalityRisk: 0.75, disabilityType: 'mobility' },
  { id: 'cardiac', name: 'Heart attack', severity: 3, weight: (_c, age) => age >= 50 ? 1 + (age - 50) / 12 : 0.02, chronicId: 'heart', chronicName: 'Heart disease', mortalityRisk: 0.80 },
  { id: 'sepsis', name: 'Severe systemic infection', severity: 3, weight: () => 1, mortalityRisk: 0.55 },
];

function clamp(v, lo = 1, hi = 100) { return Math.max(lo, Math.min(hi, v)); }
function severityLabel(n) { return n >= 3 ? 'Severe' : n >= 2 ? 'Moderate' : 'Mild'; }

function normalizeHealth(ch, resetYear = true) {
  const defaults = initHealth();
  ch.health = { ...defaults, ...(ch.health || {}) };
  ch.health.conditions ||= [];
  ch.health.disabilities ||= [];
  ch.health.medicalHistory ||= [];
  if (ch.health.disabled && ch.health.disabilities.length === 0) {
    ch.health.disabilities.push({ id: 'legacy-disability', type: 'mobility', severity: 1,
      cause: 'previously recorded disability', permanent: true, onsetAge: ch.age });
  }
  if (resetYear || !ch.health.lastYear) ch.health.lastYear = { diagnoses: [], treatments: [], costs: 0 };
  for (const c of ch.health.conditions) {
    c.severity ||= 1;
    c.years ||= 0;
    c.controlled ??= false;
    c.diagnosedAge ??= ch.age;
    c.mortalityRisk ??= c.id === 'depression' ? 0.08 : 0.2;
    c.decay ??= 1;
    c.mgmtCost ??= 0.05;
  }
}

function riskMultiplier(country) {
  const obesity = (country.obesity ?? 15) / 100;
  const tobacco = (country.tobacco ?? 20) / 100;
  const sanitation = (country.sanitation ?? 80) / 100;
  const water = (country.waterAccess ?? 80) / 100;
  return 0.7 + obesity * 0.6 + tobacco * 0.5 + (1 - sanitation) * 0.6 + (1 - water) * 0.6;
}

export function healthcareCoverage(country, ch) {
  if (ch.military?.status === 'career' || ch.military?.status === 'serving' || ch._servedThisYear) {
    return { premium: 0, treatmentShare: 0, qualityTier: Math.max(2, country.healthTier || 2), access: 0.95, label: 'Military healthcare' };
  }
  const arch = country.healthcareArchetype;
  const tier = country.healthTier || 2;
  if (arch === 'single-payer') return { premium: 0, treatmentShare: 0, qualityTier: tier, access: 0.75 + tier * 0.05, label: 'Universal (single-payer)' };
  if (arch === 'universal-insurance') return { premium: 0.05, treatmentShare: 0.1, qualityTier: tier, access: 0.78 + tier * 0.05, label: 'Universal insurance' };
  if (arch === 'mixed') {
    const dependentCoverage=(ch.age<18||ch.employmentStatus==='student')&&ch.family?.some(p=>
      p.alive!==false&&['Father','Mother','Spouse'].includes(p.relation)&&p.health?.insured
    );
    if (ch.health.insured||dependentCoverage) return { premium: 0.08, treatmentShare: 0.15, qualityTier: tier, access: 0.75 + tier * 0.05, label: dependentCoverage&&!ch.health.insured?'Covered as a dependant':'Insured (private)' };
    return { premium: 0, treatmentShare: 1, qualityTier: Math.max(1, tier - 1), access: 0.45 + tier * 0.06, label: 'Uninsured' };
  }
  return { premium: 0, treatmentShare: 1, qualityTier: Math.min(tier, 2), access: 0.35 + tier * 0.08, label: 'Out-of-pocket' };
}

export function insurancePremium(country, ch, income) {
  return healthcareCoverage(country, ch).premium * Math.max(income, medianWage(country) * 0.3);
}

function treatmentCost(country, severity) {
  const mw = medianWage(country);
  if (severity <= 1) return mw * 0.08;
  return mw * (severity === 2 ? 0.5 : 2);
}

function availableFunds(ch, country) {
  const pooled=(ch.money.cash||0)+(ch.money.bank||0)+(ch.money.household||0)+(ch.householdFinance?.familyGrossIncome||0);
  if (ch.age < 18 || ch.employmentStatus === 'student') {
    const familySupport=ch.housing?.tenure==='parents'?(ch.familyOriginFinance?.retainedFund||0):0;
    if(pooled+familySupport>0)return pooled+familySupport;
    // Compatibility fallback for isolated health tests and older saves before their first family turn.
    if(!ch.householdFinance)return medianWage(country)*(0.6+(ch.wealthIdx??2)*1.2);
  }
  return pooled;
}

function tryTreat(ch, country, severity, rng) {
  const cov = healthcareCoverage(country, ch);
  const playerCost = treatmentCost(country, severity) * cov.treatmentShare;
  const dependent = ch.age < 18 || ch.employmentStatus === 'student';
  const funds = availableFunds(ch, country);
  const policy = ch.health.healthPolicy;
  const affordable = playerCost <= funds + (policy === 'always' ? medianWage(country) * 2 : 0);
  const willTreat = policy === 'always' ? affordable : policy === 'affordable' && playerCost <= funds;
  if (!willTreat || !rng.chance(cov.access)) return { treated: false, success: false, cost: 0, billed: false, coverage: cov.label, accessFailed: willTreat };
  const success = rng.chance(0.48 + cov.qualityTier * 0.115);
  return { treated: true, success, cost: playerCost, billed: playerCost > 0, dependent, coverage: cov.label, accessFailed: false };
}

function record(ch, text, category = 'diagnosis') {
  ch.health.medicalHistory.push({ age: ch.age, category, text });
  if (ch.health.medicalHistory.length > 80) ch.health.medicalHistory.shift();
  if (category === 'diagnosis') ch.health.lastYear.diagnoses.push(text);
  else ch.health.lastYear.treatments.push(text);
}

function addCondition(ch, id, overrides = {}) {
  const existing = ch.health.conditions.find(c => c.id === id);
  if (existing) {
    existing.severity = Math.min(3, Math.max(existing.severity || 1, overrides.severity || 1));
    return existing;
  }
  const def = CHRONIC[id] || {};
  const condition = {
    id, name: overrides.name || def.name || 'Chronic illness', chronic: true,
    severity: overrides.severity || 1, diagnosedAge: ch.age, years: 0, controlled: false,
    decay: overrides.decay ?? def.decay ?? 2, mgmtCost: overrides.mgmtCost ?? def.mgmtCost ?? 0.08,
    mortalityRisk: overrides.mortalityRisk ?? def.mortalityRisk ?? 0.25,
    disabilityType: overrides.disabilityType || def.disabilityType || null,
  };
  ch.health.conditions.push(condition);
  return condition;
}

export function addDisability(ch, type, severity = 1, cause = 'medical condition', permanent = true) {
  normalizeHealth(ch, false);
  const existing = ch.health.disabilities.find(d => d.type === type);
  if (existing) existing.severity = Math.min(3, Math.max(existing.severity, severity));
  else ch.health.disabilities.push({ id: `${type}-${ch.age}`, type, severity, cause, permanent, onsetAge: ch.age });
  ch.health.disabled = ch.health.disabilities.length > 0;
}

function disabilityProgression(ch, rng, logs) {
  for (const c of ch.health.conditions) {
    if (c.severity >= 2 && c.disabilityType && !c.controlled && rng.chance(0.035 * c.severity)) {
      addDisability(ch, c.disabilityType, c.severity >= 3 ? 2 : 1, c.name);
      const text = `${c.name} caused a ${severityLabel(c.severity >= 3 ? 2 : 1).toLowerCase()} ${c.disabilityType} disability.`;
      logs.push({ category: 'health', text }); record(ch, text);
    }
  }
  ch.health.disabled = ch.health.disabilities.length > 0;
  if (ch.health.disabled) ch.health.yearsWithDisability += 1;
}

function resolveChronic(ch, country, rng, cov, logs) {
  let costs = 0;
  for (const c of ch.health.conditions) {
    if (!c.chronic) continue;
    c.years += 1;
    const mgmt = c.mgmtCost * medianWage(country) * cov.treatmentShare * (0.75 + c.severity * 0.25);
    const canManage = ch.health.healthPolicy !== 'never' && mgmt <= availableFunds(ch, country) && rng.chance(cov.access);
    c.controlled = canManage;
    if (canManage) {
      if (mgmt > 0) costs += mgmt;
      ch.stats.health = clamp(ch.stats.health - c.decay * c.severity * 0.25);
      if (c.severity > 1 && rng.chance(0.06 * cov.qualityTier)) c.severity -= 1;
    } else {
      ch.stats.health = clamp(ch.stats.health - c.decay * c.severity);
      if (rng.chance(0.08 + c.severity * 0.04)) c.severity = Math.min(3, c.severity + 1);
    }
  }
  return costs;
}

function rollNewChronic(ch, country, rng, logs) {
  for (const [id, def] of Object.entries(CHRONIC)) {
    if (ch.age < def.minAge || ch.health.conditions.some(c => c.id === id)) continue;
    let p = def.annual(country, ch.age);
    p *= 1 - ch.stats.fitness / 400;
    if (rng.chance(p)) {
      addCondition(ch, id);
      const text = `Diagnosed with ${def.name}.`;
      logs.push({ category: 'health', text }); record(ch, text);
      return;
    }
  }
}

function pickWeighted(rng, list, country, age) {
  return rng.weighted(list, x => Math.max(0.001, x.weight(country, age)));
}

function resolveAcute(ch, country, rng, risk, fitFactor, logs) {
  let costs = 0;
  if (rng.chance(0.15 * risk * fitFactor)) {
    const illness = pickWeighted(rng, MINOR_ILLNESSES, country, ch.age);
    const t = tryTreat(ch, country, 1, rng);
    if (t.treated) {
      if (t.billed) costs += t.cost;
      logs.push({ category: 'health', text: `${illness.name} — treated (${t.coverage})${t.billed && t.cost > 0 ? '' : ', no personal cost'}.` });
    } else {
      ch.stats.health = clamp(ch.stats.health - 3);
      logs.push({ category: 'health', text: `${illness.name} went untreated (−3 health)${t.accessFailed ? ' because care was unavailable' : ''}.` });
    }
  }

  const seriousBase = ch.age < 6 ? 0.035 : 0.02 + Math.max(0, ch.age - 20) / 50 * 0.13;
  if (rng.chance(Math.min(0.22, seriousBase) * risk * fitFactor)) {
    const illness = pickWeighted(rng, SERIOUS_ILLNESSES, country, ch.age);
    const t = tryTreat(ch, country, illness.severity, rng);
    ch.health.lastSevereEvent = { age: ch.age, name: illness.name, mortalityRisk: illness.mortalityRisk, treated: t.treated && t.success };
    if (t.treated && t.billed) costs += t.cost;
    if (t.treated && t.success) {
      ch.stats.health = clamp(ch.stats.health - (illness.severity === 3 ? 5 : 3));
      logs.push({ category: 'health', text: `${illness.name} — treatment succeeded (${t.coverage}).` });
      record(ch, `${illness.name} treated successfully.`, 'treatment');
      if (illness.chronicId && rng.chance(0.18)) addCondition(ch, illness.chronicId, { name: illness.chronicName, severity: 1, mortalityRisk: illness.mortalityRisk * 0.4, disabilityType: illness.disabilityType });
    } else {
      ch.stats.health = clamp(ch.stats.health - (illness.severity === 3 ? 14 : 9));
      const id = illness.chronicId || `${illness.id}_sequela`;
      addCondition(ch, id, { name: illness.chronicName || `Complications of ${illness.name}`, severity: t.treated ? 1 : 2, decay: illness.severity + 1, mgmtCost: 0.10, mortalityRisk: illness.mortalityRisk, disabilityType: illness.disabilityType });
      const reason = t.treated ? 'treatment was unsuccessful' : t.accessFailed ? 'care was unavailable' : 'it went untreated';
      const text = `${illness.name} — ${reason}; lasting complications developed.`;
      logs.push({ category: 'health', text }); record(ch, text);
    }
  }
  return costs;
}

function resolveAccident(ch, country, rng, logs) {
  let p = 0.02;
  if (ch.job?.sector === 'industrial' || ch.military.status === 'serving' || ch.military.status === 'career') p *= 2;
  if (country.incomeTier <= 2) p *= 1.5;
  if (!rng.chance(p)) return 0;
  const severe = rng.chance(0.3);
  const t = tryTreat(ch, country, severe ? 3 : 2, rng);
  let costs = t.treated && t.billed ? t.cost : 0;
  ch.stats.health = clamp(ch.stats.health - (severe ? (t.success ? 7 : 18) : (t.success ? 3 : 7)));
  if (severe && !(t.treated && t.success) && rng.chance(0.45)) {
    const type = rng.pick(['mobility', 'chronic pain', 'vision', 'hearing', 'cognitive']);
    addDisability(ch, type, rng.chance(0.25) ? 2 : 1, 'serious accident');
    const text = `A serious accident caused a lasting ${type} disability.`;
    logs.push({ category: 'health', text }); record(ch, text);
  } else logs.push({ category: 'health', text: `${severe ? 'Serious' : 'Moderate'} accident${t.treated ? ` — treated (${t.coverage})` : ' — care was not completed'}.` });
  return costs;
}

function resolveMentalHealth(ch, country, logs) {
  if (ch.stats.happiness < 25) ch.health.lowHappinessStreak += 1; else ch.health.lowHappinessStreak = 0;
  if (ch.age >= 12 && ch.health.lowHappinessStreak >= 2 && !ch.health.hasDepression) {
    ch.health.hasDepression = true;
    addCondition(ch, 'depression', { name: 'Depression', decay: 1.2, mgmtCost: 0.05, mortalityRisk: 0.10 });
    logs.push({ category: 'health', text: 'Developed depression after prolonged severe unhappiness.' });
    record(ch, 'Diagnosed with depression.');
  }
  if (ch.health.hasDepression && country.healthTier >= 3 && ch.health.healthPolicy !== 'never' && ch.stats.happiness > 40) {
    ch.health.hasDepression = false;
    ch.health.conditions = ch.health.conditions.filter(c => c.id !== 'depression');
    logs.push({ category: 'health', text: 'Recovered from depression with treatment and improved circumstances.' });
    record(ch, 'Recovered from depression.', 'treatment');
  }
}

function resolvePhysicalAging(ch, rng, logs) {
  const age = ch.age;
  let decline = age >= 75 ? 1.6 : age >= 65 ? 0.9 : age >= 50 ? 0.4 : age >= 40 ? 0.15 : 0;
  decline *= 1.2 - ch.stats.fitness / 250;
  ch.health.physicalDecline += decline;
  ch.stats.fitness = clamp(ch.stats.fitness - decline);
  if (age >= 65) {
    const conditionBurden = ch.health.conditions.reduce((s, c) => s + c.severity, 0);
    const frailtyGain = Math.max(0, (age - 65) / 80 + conditionBurden / 80 - ch.stats.fitness / 500);
    const before = ch.health.frailty;
    ch.health.frailty = Math.min(100, ch.health.frailty + frailtyGain * 3);
    if (before < 25 && ch.health.frailty >= 25) logs.push({ category: 'health', text: 'Age-related frailty began to limit your physical stamina.' });
    if (before < 60 && ch.health.frailty >= 60) {
      addDisability(ch, 'mobility', 2, 'age-related frailty');
      logs.push({ category: 'health', text: 'Severe frailty caused a moderate mobility disability.' });
    }
  }
  if (age >= 65 && rng.chance(0.015 + Math.max(0, age - 75) * 0.002)) {
    const type = rng.pick(['vision', 'hearing']);
    addDisability(ch, type, 1, 'age-related sensory decline');
    logs.push({ category: 'health', text: `Age-related ${type} loss became a lasting mild disability.` });
  }
}

export function resolveHealth(ch, country, rng, ctx) {
  normalizeHealth(ch);
  const logs = [];
  let medicalCosts = 0;
  const risk = riskMultiplier(country);
  const fitFactor = 1 - ch.stats.fitness / 300;
  const cov = healthcareCoverage(country, ch);

  if (cov.premium > 0 && ch.age >= 18 && ch.employmentStatus !== 'student') {
    const prem = cov.premium * Math.max(ctx.income || 0, medianWage(country) * 0.3);
    ctx.insuranceLine = { label: `Health insurance (${cov.label})`, amount: prem };
  }

  medicalCosts += resolveChronic(ch, country, rng, cov, logs);
  rollNewChronic(ch, country, rng, logs);
  medicalCosts += resolveAcute(ch, country, rng, risk, fitFactor, logs);
  medicalCosts += resolveAccident(ch, country, rng, logs);
  resolveMentalHealth(ch, country, logs);
  resolvePhysicalAging(ch, rng, logs);
  disabilityProgression(ch, rng, logs);

  if (ch.health.conditions.length === 0 && !ch.health.disabled && ch.stats.health >= 60) ch.health.healthyYears += 1;
  ch.health.lastYear.costs = medicalCosts;
  ch.health.lifetimeMedicalSpend += medicalCosts + (ctx.insuranceLine?.amount || 0);
  return { logs, medicalCosts, disabled: ch.health.disabled };
}

export function disabilityBurden(ch) {
  return (ch.health?.disabilities || []).reduce((sum, d) => sum + (d.severity || 1), 0);
}

export function healthWorkCapacity(ch, sector = null) {
  const disabilities = ch.health?.disabilities || [];
  let capacity = 1;
  for (const d of disabilities) {
    const severity = d.severity || 1;
    if (['mobility', 'respiratory', 'chronic pain', 'vision'].includes(d.type) && ['industrial', 'informal'].includes(sector)) capacity -= severity * 0.22;
    else if (d.type === 'cognitive' && sector === 'professional') capacity -= severity * 0.18;
    else capacity -= severity * 0.05;
  }
  capacity -= Math.max(0, (ch.health?.frailty || 0) - 25) / 140;
  return Math.max(0.15, Math.min(1, capacity));
}

export function healthEducationMultiplier(ch) {
  const cognitive = (ch.health?.disabilities || []).filter(d => d.type === 'cognitive').reduce((s, d) => s + d.severity, 0);
  const active = (ch.health?.conditions || []).filter(c => !c.controlled && c.severity >= 2).length;
  return Math.max(0.35, 1 - cognitive * 0.15 - active * 0.12);
}

export function hasSeriousUntreated(ch) {
  return (ch.health?.conditions || []).some(c => c.chronic && !c.controlled && (c.severity || 1) >= 2);
}

export function mortalityConditionRisk(ch) {
  const chronic = (ch.health?.conditions || []).reduce((sum, c) => sum + (c.mortalityRisk || 0.1) * (c.severity || 1) * (c.controlled ? 0.3 : 1), 0);
  const severe = ch.health?.lastSevereEvent;
  const acute = severe?.age === ch.age ? severe.mortalityRisk * (severe.treated ? 0.25 : 1) : 0;
  const frailty = (ch.health?.frailty || 0) / 100;
  return { chronic, acute, frailty, total: chronic + acute + frailty };
}

export function likelyMedicalCause(ch) {
  const severe = ch.health?.lastSevereEvent;
  if (severe?.age === ch.age && !severe.treated) return severe.name;
  const ranked = [...(ch.health?.conditions || [])].sort((a, b) =>
    ((b.mortalityRisk || 0) * (b.severity || 1) * (b.controlled ? 0.3 : 1))
    - ((a.mortalityRisk || 0) * (a.severity || 1) * (a.controlled ? 0.3 : 1)));
  return ranked[0]?.name || null;
}

export { severityLabel };
