// Build script: data/factbook/*.json  ->  src/data/countries.json
// See docs/DATA_PIPELINE.md. Run: node scripts/build-countries.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FACTBOOK = join(ROOT, 'data', 'factbook');
const OUT_DIR = join(ROOT, 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'countries.json');

const SKIP_REGIONS = new Set(['oceans', 'world', 'meta', 'antarctica']);

// Non-country entries that pass the population/GDP filter but aren't places to
// be born. 'ee' = European Union (supranational org, no country-name fields).
const SKIP_IDS = new Set(['ee']);

// Minimal HTML-entity decoder for the Latin accents/symbols the factbook uses.
const ENTITIES = {
  '&ocirc;': 'ô', '&ecirc;': 'ê', '&acirc;': 'â', '&icirc;': 'î', '&ucirc;': 'û',
  '&eacute;': 'é', '&egrave;': 'è', '&agrave;': 'à', '&ugrave;': 'ù',
  '&ccedil;': 'ç', '&ntilde;': 'ñ', '&uuml;': 'ü', '&ouml;': 'ö', '&auml;': 'ä',
  '&iuml;': 'ï', '&euml;': 'ë', '&iacute;': 'í', '&oacute;': 'ó', '&aacute;': 'á',
  '&uacute;': 'ú', '&yacute;': 'ý', '&aring;': 'å', '&oslash;': 'ø', '&aelig;': 'æ',
  '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#039;': "'",
};
function decodeEntities(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&[a-zA-Z]+;/g, m => ENTITIES[m] ?? m);
}

// Region folder -> pretty name
const REGION_NAMES = {
  'africa': 'Africa',
  'australia-oceania': 'Australia & Oceania',
  'central-america-n-caribbean': 'Central America & Caribbean',
  'central-asia': 'Central Asia',
  'east-n-southeast-asia': 'East & Southeast Asia',
  'europe': 'Europe',
  'middle-east': 'Middle East',
  'north-america': 'North America',
  'south-america': 'South America',
  'south-asia': 'South Asia',
};

// ---- Parse helpers (DATA_PIPELINE section 2) ----------------------------

function stripHtml(s) {
  return typeof s === 'string' ? decodeEntities(s.replace(/<[^>]+>/g, '')).trim() : s;
}

// First number in a string, honoring million/billion and comma grouping.
function num(text) {
  if (text == null) return null;
  const s = String(text);
  const m = s.match(/(-?\d[\d,]*\.?\d*)\s*(million|billion|trillion)?/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, ''));
  if (isNaN(v)) return null;
  const mult = (m[2] || '').toLowerCase();
  if (mult === 'million') v *= 1e6;
  else if (mult === 'billion') v *= 1e9;
  else if (mult === 'trillion') v *= 1e12;
  return v;
}

// Unwrap {text: "..."} or return string as-is.
function text(node) {
  if (node == null) return null;
  if (typeof node === 'string') return node;
  if (typeof node === 'object' && 'text' in node) return node.text;
  return null;
}

// Many fields are year-keyed sub-objects: {"Field 2024": {text}, "Field 2023": {...}, note}.
// Return num() of the highest year, or of a plain {text} shape.
function latest(node) {
  if (node == null) return null;
  if (typeof node === 'object') {
    if ('text' in node) return num(node.text);
    let bestYear = -Infinity, bestVal = null;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'note') continue;
      const ym = k.match(/(\d{4})/);
      const year = ym ? parseInt(ym[1], 10) : 0;
      const val = num(text(v));
      if (val != null && year >= bestYear) { bestYear = year; bestVal = val; }
    }
    return bestVal;
  }
  return num(node);
}

// Parse "Hausa 30%, Yoruba 15.5%, other 24.9% (2018 est.)" -> [{name, pct}]
function pctList(str) {
  if (!str) return [];
  const s = stripHtml(str).replace(/\([^)]*\)/g, ''); // drop parentheticals like (2018 est.)
  const out = [];
  for (const seg of s.split(',')) {
    const m = seg.match(/^\s*(.+?)\s+(\d+\.?\d*)\s*%/);
    if (m) out.push({ name: m[1].trim(), pct: parseFloat(m[2]) });
  }
  return out;
}

// Safe nested getter
function dig(obj, ...path) {
  let o = obj;
  for (const k of path) {
    if (o && typeof o === 'object' && k in o) o = o[k];
    else return null;
  }
  return o;
}

// Parse Factbook coordinates such as "38 00 N, 97 00 W" into MapLibre's
// [longitude, latitude] order. Some entries include seconds, so accept all
// three components while keeping the generated country file compact.
function parseCoordinates(value) {
  const s = stripHtml(value || '');
  const match = s.match(/(\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?(?:\s+\d+(?:\.\d+)?)?\s+[NS])\s*,\s*(\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?(?:\s+\d+(?:\.\d+)?)?\s+[EW])/i);
  if (!match) return null;
  const parts = [match[1], match[2]];
  const parsePart = (part) => {
    const m = part.match(/^(\d+(?:\.\d+)?)\s+(?:(\d+(?:\.\d+)?)\s+)?(?:(\d+(?:\.\d+)?)\s+)?([NSEW])$/i);
    if (!m) return null;
    const value = Number(m[1]) + Number(m[2] || 0) / 60 + Number(m[3] || 0) / 3600;
    return /[SW]/i.test(m[4]) ? -value : value;
  };
  const lat = parsePart(parts[0]), lon = parsePart(parts[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null;
}

function parseCurrency(exchangeRates, countryName) {
  const currentLabels={Afghanistan:'Afghan afghanis (AFN)',Aruba:'Aruban florins (AWG)',Belarus:'Belarusian rubles (BYN)',China:'Chinese yuan renminbi (CNY)',Eswatini:'Swazi emalangeni (SZL)',Ghana:'Ghanaian cedis (GHS)',Kuwait:'Kuwaiti dinars (KWD)',Mauritania:'Mauritanian ouguiyas (MRU)',Mozambique:'Mozambican meticais (MZN)',Samoa:'Samoan tala (WST)','Sao Tome and Principe':'São Tomé and Príncipe dobras (STN)','Sierra Leone':'Sierra Leonean leones (SLE)',Thailand:'Thai baht (THB)',Turkmenistan:'Turkmenistan manat (TMT)',Venezuela:'Venezuelan bolívares (VES)',Zambia:'Zambian kwacha (ZMW)',Zimbabwe:'Zimbabwean dollars (ZWL)'};
  if(currentLabels[countryName])return currentLabels[countryName];
  const raw = stripHtml(text(exchangeRates?.Currency) || '');
  if (raw) return raw.replace(/\s+per US dollar.*$/i, '').replace(/\s+-\s*$/, '').trim();
  if (/US dollar/i.test(stripHtml(text(exchangeRates) || ''))) return 'US dollars (USD)';
  if (countryName === 'Gaza, Gaza Strip') return 'new Israeli shekels (ILS)';
  if (countryName === 'United States') return 'US dollars (USD)';
  return null;
}

function parseExchangeRate(exchangeRates, countryName) {
  if (countryName === 'United States') return 1;
  const value = latest(exchangeRates);
  if (value != null && value > 0) return value;
  if (/US dollar/i.test(stripHtml(text(exchangeRates) || ''))) return 1;
  if (countryName === 'Gaza, Gaza Strip') return 3.7;
  return 1;
}

function flagCode(raw, countryName) {
  if (countryName === 'United Kingdom') return 'GB';
  const value = text(dig(raw, 'Communications', 'Internet country code')) || '';
  return value.match(/\.([a-z]{2})\b/i)?.[1]?.toUpperCase() || null;
}

// ---- Cities (DATA_PIPELINE section 4.1) ---------------------------------

function titleCaseIfShouting(name) {
  if (name === name.toUpperCase() && /[A-Z]/.test(name)) {
    return name.replace(/\w\S*/g, w => w[0] + w.slice(1).toLowerCase());
  }
  return name;
}

function parseCities(str, capitalFallback) {
  const out = [];
  if (str) {
    let s = stripHtml(str).replace(/\((\d{4})\)\s*$/, ''); // trailing year
    for (const seg of s.split(',')) {
      // number (with optional million) then city name, optional (capital)
      const m = seg.match(/^\s*([\d.,]+)\s*(million|billion)?\s+(.+?)\s*(\(capital\))?\s*$/i);
      if (!m) continue;
      let pop = num(m[1] + (m[2] ? ' ' + m[2] : ''));
      if (pop != null && pop < 10000 && !m[2]) pop = pop * 1000; // "7,000" style already fine; leave
      let name = m[3].replace(/\([^)]*\)/g, '').trim();
      name = titleCaseIfShouting(name);
      if (!name) continue;
      out.push({ name, pop: pop || null, capital: /\(capital\)/i.test(seg) });
    }
  }
  if (out.length === 0 && capitalFallback) {
    out.push({ name: capitalFallback, pop: null, capital: true });
  }
  return out;
}

// ---- Military (DATA_PIPELINE section 4.3) -------------------------------

const MILITARY_OVERRIDES = {
  'South Korea': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 1.6, womenConscripted: false },
  'North Korea': { conscription: 'mandatory', serviceAge: 17, serviceLengthYears: 10, womenConscripted: true },
  'Israel': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 2.5, womenConscripted: true },
  'Norway': { conscription: 'mandatory', serviceAge: 19, serviceLengthYears: 1, womenConscripted: true, callUpRate: 0.25 },
  'Sweden': { conscription: 'selective', serviceAge: 18, serviceLengthYears: 1, womenConscripted: true, callUpRate: 0.25 },
  'Switzerland': { conscription: 'mandatory', serviceAge: 19, serviceLengthYears: 0.7, womenConscripted: false },
  'Singapore': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 2, womenConscripted: false },
  'Egypt': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 1.5, womenConscripted: false },
  // Mandatory liability does not mean that the whole eligible cohort enters
  // active service. These are gameplay estimates of quota/lottery intake.
  'Brazil': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 1, womenConscripted: false, callUpRate: 0.10 },
  'Thailand': { conscription: 'mandatory', serviceAge: 21, callUpEndAge: 29, serviceLengthYears: 2, womenConscripted: false, callUpRate: 0.20 },
  'Turkey': { conscription: 'mandatory', serviceAge: 20, serviceLengthYears: 1, womenConscripted: false },
  'Russia': { conscription: 'mandatory', serviceAge: 18, callUpEndAge: 30, serviceLengthYears: 1, womenConscripted: false, callUpRate: 0.35, repeatCallUp: true },
  'Mexico': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 1, womenConscripted: false, callUpRate: 0.25 },
  'Denmark': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 11 / 12, womenConscripted: true, callUpRate: 0.25 },
  'Ukraine': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 1.5, womenConscripted: false },
  'Eritrea': { conscription: 'mandatory', serviceAge: 18, serviceLengthYears: 5, womenConscripted: true },
  'Costa Rica': { hasArmedForces: false },
  'Iceland': { hasArmedForces: false },
  'Panama': { hasArmedForces: false },
};

function parseMilitary(sec, name, milExpPct) {
  if (MILITARY_OVERRIDES[name]) {
    const base = { hasArmedForces: true, conscription: 'voluntary', serviceAge: 18,
      serviceLengthYears: 1.5, womenConscripted: false, callUpRate: 1,
      repeatCallUp: false, payTier: payTierFrom(milExpPct) };
    return { ...base, ...MILITARY_OVERRIDES[name] };
  }
  const forcesText = (text(dig(sec, 'Military and security forces')) || '').toLowerCase();
  const oblig = dig(sec, 'Military service age and obligation');
  const obligText = (text(oblig) || '') + ' ' + (stripHtml(dig(oblig, 'note') || '') || '');
  const lower = obligText.toLowerCase();

  const hasArmedForces = !(
    !sec ||
    /no regular military forces|no standing army|no armed forces/.test(forcesText) ||
    (!oblig && (milExpPct == null || milExpPct < 0.5))
  );

  let conscription = 'voluntary';
  if (/conscription (ended|abolished|suspended|eliminated)/.test(lower)) conscription = 'voluntary';
  else if (/mandatory|compulsory/.test(lower)) conscription = 'mandatory';
  else if (/selective|lottery/.test(lower)) conscription = 'selective';

  const ageM = lower.match(/(\d{2})\s*(?:-|to)?\s*\d{0,2}\s*years? of age/);
  const serviceAge = ageM ? parseInt(ageM[1], 10) : 18;

  // service length: "18-21 months" or "2 years"
  let serviceLengthYears = conscription === 'mandatory' ? 1.5 : 1;
  const moM = lower.match(/(\d+)(?:-(\d+))?\s*months?\b/);
  const yrM = lower.match(/(\d+)(?:-(\d+))?\s*years?\s*(?:of\s*)?(?:service|obligation)/);
  if (moM) serviceLengthYears = Math.round((parseInt(moM[1], 10) / 12) * 10) / 10;
  else if (yrM) serviceLengthYears = parseInt(yrM[1], 10);

  const womenConscripted = /men and women/.test(lower) && /mandatory|compulsory/.test(lower);

  return { hasArmedForces, conscription, serviceAge, serviceLengthYears, womenConscripted,
    callUpRate: conscription === 'selective' ? 0.25 : 1, repeatCallUp: false,
    payTier: payTierFrom(milExpPct) };
}

function payTierFrom(pct) {
  if (pct == null) return 1;
  if (pct < 1.5) return 1;
  if (pct <= 3) return 2;
  return 3;
}

// ---- Inclusion list (DATA_PIPELINE section 1) ---------------------------

// Forced-in entries the rule wrongly drops. West Bank has null capital/cities.
const FORCE_INCLUDE = {
  'West Bank': ['Ramallah', 'Hebron', 'Nablus'],
  'Monaco': null,
  'Liechtenstein': null,
  'San Marino': null,
};

// ---- Tiers & fallbacks (DATA_PIPELINE section 5) ------------------------

function incomeTier(gdppc) {
  if (gdppc == null) return 2;
  if (gdppc < 5000) return 1;
  if (gdppc < 15000) return 2;
  if (gdppc < 35000) return 3;
  return 4;
}

const TIER_FALLBACK = {
  gini: [42, 40, 36, 32],
  unemployment: [8, 7, 6, 5],
  taxRevenuePct: [12, 15, 20, 25],
  healthExpenditure: [4, 5, 7, 9],
  schoolLifeExpectancy: [9, 12, 14, 16],
  inflation: [8, 5, 3, 2],
  physicianDensity: [0.5, 1.5, 3, 4],
  obesity: [10, 18, 22, 25],
  tobacco: [15, 20, 22, 20],
  urbanization: [35, 50, 65, 80],
  medianAge: [20, 27, 35, 42],
  fertility: [4.2, 2.6, 1.9, 1.6],
  birthRate: [34, 20, 13, 10],
  povertyRate: [40, 25, 15, 10],
};

function fb(val, field, tier) {
  if (val != null) return val;
  const arr = TIER_FALLBACK[field];
  return arr ? arr[tier - 1] : null;
}

// Derived tiers with flagship overrides
const HEALTHCARE_OVERRIDE = {
  'United States': 'mixed', 'United Kingdom': 'single-payer', 'Canada': 'single-payer',
  'Germany': 'universal-insurance', 'France': 'universal-insurance', 'Japan': 'universal-insurance',
  'Sweden': 'single-payer', 'Norway': 'single-payer', 'Italy': 'single-payer', 'Spain': 'single-payer',
  'Australia': 'single-payer', 'Switzerland': 'universal-insurance', 'South Korea': 'universal-insurance',
};
const WELFARE_OVERRIDE = {
  'United States': 'moderate', 'Saudi Arabia': 'moderate', 'United Arab Emirates': 'moderate',
  'Qatar': 'moderate', 'Kuwait': 'moderate',
  'Sweden': 'generous', 'Norway': 'generous', 'Denmark': 'generous', 'France': 'generous',
  'Germany': 'generous', 'Finland': 'generous',
};
const TAXTIER_OVERRIDE = {
  'United States': 'moderate', 'Saudi Arabia': 'low', 'United Arab Emirates': 'low',
  'Qatar': 'low', 'Kuwait': 'low', 'Bahrain': 'low', 'Monaco': 'low',
  'Sweden': 'heavy', 'Denmark': 'heavy', 'France': 'heavy', 'Germany': 'heavy',
  'Belgium': 'heavy', 'Austria': 'heavy', 'Finland': 'heavy',
};
const LAW_OVERRIDE = {
  'South Korea': 'strong', 'Japan': 'strong', 'Singapore': 'strong',
  'United States': 'strong', 'United Kingdom': 'strong', 'Canada': 'strong',
  'Australia': 'strong', 'New Zealand': 'strong', 'Sweden': 'strong',
  'Norway': 'strong', 'Denmark': 'strong', 'Finland': 'strong',
  'Germany': 'strong', 'France': 'strong', 'Netherlands': 'strong',
  'Switzerland': 'strong', 'Austria': 'strong', 'Estonia': 'strong',
  'North Korea': 'weak', 'Russia': 'weak',
};

function physDensityTier(pd) {
  if (pd == null) return 2;
  if (pd < 1) return 1;
  if (pd < 2) return 2;
  if (pd < 3.5) return 3;
  return 4;
}

function taxTier(taxPct, name) {
  if (TAXTIER_OVERRIDE[name]) return TAXTIER_OVERRIDE[name];
  if (taxPct == null) return 'light';
  if (taxPct < 10) return 'low';
  if (taxPct < 17) return 'light';
  if (taxPct < 25) return 'moderate';
  return 'heavy';
}

function deriveTiers(rec) {
  const it = rec.incomeTier;
  // education tier
  const sle = rec.schoolLifeExpectancy;
  let eduTier = sle == null ? 2 : sle < 10 ? 1 : sle < 13 ? 2 : sle < 15 ? 3 : 4;
  eduTier = Math.min(eduTier, it + 1);
  rec.educationTier = eduTier;

  // healthcare
  const healthTier = Math.round((it + physDensityTier(rec.physicianDensity)) / 2);
  rec.healthTier = Math.max(1, Math.min(4, healthTier));
  if (HEALTHCARE_OVERRIDE[rec.name]) rec.healthcareArchetype = HEALTHCARE_OVERRIDE[rec.name];
  else if (it >= 4) rec.healthcareArchetype = 'universal-insurance';
  else if (it === 3) rec.healthcareArchetype = 'mixed';
  else rec.healthcareArchetype = 'out-of-pocket';

  // tax + welfare
  rec.taxTier = taxTier(rec.taxRevenuePct, rec.name);
  if (WELFARE_OVERRIDE[rec.name]) rec.welfareTier = WELFARE_OVERRIDE[rec.name];
  else if (rec.taxTier === 'heavy' && it >= 4) rec.welfareTier = 'generous';
  else if (it >= 3) rec.welfareTier = 'moderate';
  else if (it === 2) rec.welfareTier = 'minimal';
  else rec.welfareTier = 'none';

  // law tier
  const gt = (rec.govType || '').toLowerCase();
  const conflicted = rec.conflict.displacement;
  if (LAW_OVERRIDE[rec.name]) rec.lawTier = LAW_OVERRIDE[rec.name];
  else if (/authoritarian|military|transitional|theocratic|dictatorship/.test(gt) || (conflicted && it <= 2)) {
    rec.lawTier = 'weak';
  } else if (/parliamentary|federal|constitutional|presidential|democracy/.test(gt) && it >= 3) {
    rec.lawTier = 'strong';
  } else rec.lawTier = 'medium';

  // biz climate + stability
  rec.bizClimate = (it >= 3 && rec.lawTier === 'strong') ? 3 : rec.lawTier === 'weak' ? 1 : 2;
  if (conflicted || /authoritarian|transitional|dictatorship/.test(gt)) rec.stability = 1;
  else if (it >= 3 && rec.lawTier === 'strong') rec.stability = 3;
  else if (it <= 1) rec.stability = 2;
  else rec.stability = 2;
}

// ---- Main ----------------------------------------------------------------

const fallbackCounts = {};
function bumpFallback(field) { fallbackCounts[field] = (fallbackCounts[field] || 0) + 1; }

function buildCountry(raw, region, idCode) {
  const Geo = raw['Geography'] || {};
  const P = raw['People and Society'] || {};
  const E = raw['Economy'] || {};
  const G = raw['Government'] || {};
  const M = raw['Military and Security'] || {};
  const T = raw['Terrorism'] || {};
  const X = raw['Transnational Issues'] || {};

  const usable = (s) => (s && s.trim().toLowerCase() !== 'none') ? decodeEntities(s.trim()) : null;
  const name = usable(text(dig(G, 'Country name', 'conventional short form')))
    || usable(text(dig(G, 'Country name', 'conventional long form')))
    || idCode;

  const population = num(text(dig(P, 'Population', 'total')));
  const gdpPerCapita = latest(E['Real GDP per capita']);

  // Cities
  const capitalName = (text(dig(G, 'Capital', 'name')) || '').split(/[;,(]/)[0].trim() || null;
  let cities = parseCities(text(dig(P, 'Major urban areas - population')), capitalName);
  if (FORCE_INCLUDE[name]) {
    const manual = FORCE_INCLUDE[name];
    if (manual && cities.length === 0) cities = manual.map((c, i) => ({ name: c, pop: null, capital: i === 0 }));
  }

  // Languages: nested {Languages:{text}} or {text}
  let langNode = dig(P, 'Languages', 'Languages') || P['Languages'];
  let langStr = text(langNode) || (typeof P['Languages'] === 'object' ? text(P['Languages']) : null);
  const languages = (langStr ? stripHtml(langStr).split(/[;,]/).map(s => s.replace(/\([^)]*\)/g, '')
    .replace(/note.*/i, '').trim()).filter(Boolean) : []).slice(0, 5);

  const it = incomeTier(gdpPerCapita);

  const rec = {
    id: idCode, name, region: REGION_NAMES[region] || region,
    coordinates: parseCoordinates(text(Geo['Geographic coordinates'])),
    currency: parseCurrency(E['Exchange rates'], name),
    exchangeRate: parseExchangeRate(E['Exchange rates'], name),
    flagCode: flagCode(raw, name),
    population,
    gdpPerCapita,
    incomeTier: it,
    gdpGrowth: latest(E['Real GDP growth rate']),
    inflation: fb(latest(E['Inflation rate (consumer prices)']), 'inflation', it),
    sectors: {
      agriculture: num(text(dig(E, 'GDP - composition, by sector of origin', 'agriculture'))),
      industry: num(text(dig(E, 'GDP - composition, by sector of origin', 'industry'))),
      services: num(text(dig(E, 'GDP - composition, by sector of origin', 'services'))),
    },
    unemployment: fb(latest(E['Unemployment rate']), 'unemployment', it),
    youthUnemployment: latest(E['Youth unemployment rate (ages 15-24)']),
    gini: fb(latest(E['Gini Index coefficient - distribution of family income']), 'gini', it),
    povertyRate: fb(num(text(E['Population below poverty line'])), 'povertyRate', it),
    taxRevenuePct: fb(num(text(E['Taxes and other revenues'])), 'taxRevenuePct', it),

    lifeExpectancy: num(text(dig(P, 'Life expectancy at birth', 'total population'))),
    infantMortality: num(text(dig(P, 'Infant mortality rate', 'total'))),
    maternalMortality: num(text(P['Maternal mortality ratio'])),
    fertility: fb(num(text(P['Total fertility rate'])), 'fertility', it),
    birthRate: fb(num(text(P['Birth rate'])), 'birthRate', it),
    medianAge: fb(num(text(dig(P, 'Median age', 'total'))), 'medianAge', it),
    urbanization: fb(num(text(dig(P, 'Urbanization', 'urban population'))), 'urbanization', it),
    ethnicGroups: pctList(text(dig(P, 'Ethnic groups', 'text'))),
    religions: pctList(text(dig(P, 'Religions', 'text'))),
    languages,
    cities,
    healthExpenditure: fb(num(text(dig(P, 'Health expenditure', 'Health expenditure (as % of GDP)'))
      || text(P['Health expenditure'])), 'healthExpenditure', it),
    physicianDensity: fb(num(text(P['Physician density'])), 'physicianDensity', it),
    obesity: fb(num(text(P['Obesity - adult prevalence rate'])), 'obesity', it),
    tobacco: fb(num(text(dig(P, 'Tobacco use', 'total'))), 'tobacco', it),
    alcohol: num(text(dig(P, 'Alcohol consumption per capita', 'total'))),
    waterAccess: num(text(dig(P, 'Drinking water source', 'improved: total'))),
    sanitation: num(text(dig(P, 'Sanitation facility access', 'improved: total'))),
    educationExpenditure: num(text(dig(P, 'Education expenditure', 'Education expenditure (% GDP)'))),
    schoolLifeExpectancy: fb(num(text(dig(P, 'School life expectancy (primary to tertiary education)', 'total'))),
      'schoolLifeExpectancy', it),

    govType: stripHtml(text(dig(G, 'Government type')) || '').toLowerCase() || null,
    capital: capitalName,
    legalSystem: stripHtml(text(dig(G, 'Legal system')) || '') || null,
    citizenship: {
      jusSoli: /^\s*yes/i.test(text(dig(G, 'Citizenship', 'citizenship by birth')) || ''),
      dualAllowed: /^\s*yes/i.test(text(dig(G, 'Citizenship', 'dual citizenship recognized')) || ''),
      naturalizationYears: num(text(dig(G, 'Citizenship', 'residency requirement for naturalization'))) ?? 8,
    },
    conflict: (() => {
      // Real internal conflict signal: a large internally-displaced population
      // relative to the country's size. (The "Terrorist group(s)" listing is far
      // too broad — it flags ~half of all countries — so we don't use it here.)
      const idp = num(text(dig(X, 'Refugees and internally displaced persons', 'IDPs')));
      const displacement = idp != null && idp > 100000 && population != null && idp > population * 0.01;
      return { displacement, idp: idp || 0 };
    })(),
  };

  rec.military = parseMilitary(M, name, latest(M['Military expenditures']));
  deriveTiers(rec);

  // track fallbacks that fired (fb() already applied; recount nulls-that-became-values is noisy,
  // so we only report the two chronically-missing fields)
  if (num(text(E['Taxes and other revenues'])) == null) bumpFallback('taxRevenuePct');
  if (num(text(dig(P, 'School life expectancy (primary to tertiary education)', 'total'))) == null)
    bumpFallback('schoolLifeExpectancy');
  if (latest(E['Gini Index coefficient - distribution of family income']) == null) bumpFallback('gini');

  return rec;
}

function passesInclusion(name, population, gdpPerCapita, cities) {
  if (FORCE_INCLUDE.hasOwnProperty(name)) return true;
  const hasCity = cities && cities.length > 0 && cities[0].name;
  return population != null && population >= 50000 && gdpPerCapita != null && hasCity;
}

function main() {
  const countries = [];
  let scanned = 0;
  const regions = readdirSync(FACTBOOK, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP_REGIONS.has(d.name));

  for (const rd of regions) {
    const region = rd.name;
    const files = readdirSync(join(FACTBOOK, region)).filter(f => f.endsWith('.json'));
    for (const file of files) {
      scanned++;
      const idCode = file.replace('.json', '');
      if (SKIP_IDS.has(idCode)) continue;
      let raw;
      try { raw = JSON.parse(readFileSync(join(FACTBOOK, region, file), 'utf-8')); }
      catch { continue; }
      const rec = buildCountry(raw, region, idCode);
      if (passesInclusion(rec.name, rec.population, rec.gdpPerCapita, rec.cities)) {
        countries.push(rec);
      }
    }
  }

  countries.sort((a, b) => a.name.localeCompare(b.name));

  // ---- Validation report ----
  console.log(`\nScanned ${scanned} files across ${regions.length} regions.`);
  console.log(`Emitted ${countries.length} playable countries.`);
  console.log('\nFallbacks fired (chronically-missing fields):');
  for (const [f, c] of Object.entries(fallbackCounts)) console.log(`  ${f}: ${c}`);

  const byName = Object.fromEntries(countries.map(c => [c.name, c]));
  const flagships = ['United States', 'China', 'Germany', 'Nigeria', 'India'];
  let hardFail = false;
  for (const f of flagships) {
    const c = byName[f];
    if (!c || c.gdpPerCapita == null || c.lifeExpectancy == null || !c.cities.length) {
      console.error(`  HARD FAIL: flagship ${f} missing raw gdpPerCapita/lifeExpectancy/cities`);
      hardFail = true;
    }
  }
  // include-list presence
  for (const inc of Object.keys(FORCE_INCLUDE)) {
    if (!byName[inc]) { console.error(`  HARD FAIL: include-list country ${inc} not emitted`); hardFail = true; }
  }
  if (countries.length !== 208) {
    console.error(`  HARD FAIL: expected 208 countries, got ${countries.length}`);
    hardFail = true;
  }

  // spot checks
  const spot = (n, ok, msg) => { const c = byName[n]; console.log(`  ${ok(c) ? 'ok ' : 'XX '} ${n}: ${msg}`); };
  console.log('\nSpot checks:');
  spot('Germany', c => c && Math.round(c.gdpPerCapita) > 55000 && c.citizenship.naturalizationYears === 8
    && c.military.conscription === 'voluntary', 'gdppc>55k, natYears=8, voluntary');
  spot('South Korea', c => c && c.military.conscription === 'mandatory', 'mandatory conscription');
  spot('Costa Rica', c => c && c.military.hasArmedForces === false, 'no armed forces');
  spot('Nigeria', c => c && c.cities[0] && /Lagos/i.test(c.cities[0].name), 'first city Lagos');
  spot('West Bank', c => c && c.cities.length > 0, 'has manual cities');

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const payload = { builtAt: new Date().toISOString(), count: countries.length, countries };
  writeFileSync(OUT_FILE, JSON.stringify(payload));
  const kb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(0);
  console.log(`\nWrote ${OUT_FILE} (${kb} KB, ${countries.length} countries).`);

  if (hardFail) { console.error('\nVALIDATION FAILED.\n'); process.exit(1); }
  console.log('\nValidation passed.\n');
}

main();
