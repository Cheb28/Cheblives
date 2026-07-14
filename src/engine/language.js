// Compact language-proficiency model. Country source strings can include
// percentages and notes; gameplay intentionally exposes at most two primary
// languages per country instead of hundreds of regional/minority languages.

const NATURALIZATION_LANGUAGE = {
  Australia:60, Austria:70, Canada:60, Denmark:60, Finland:55, France:60,
  Germany:60, Italy:50, Japan:60, Netherlands:60, 'New Zealand':60,
  Norway:55, Portugal:50, 'South Korea':60, Spain:50, Sweden:50,
  Switzerland:60, 'United Kingdom':60, 'United States':50,
};

export function canonicalLanguage(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b\d+(?:\.\d+)?%.*$/g, '')
    .split(/\s+or\s+|\//i)[0]
    .replace(/\bofficial\b/gi, '')
    .replace(/\bonly\b/gi, '')
    .replace(/[()]/g,'')
    .replace(/\s+/g, ' ').trim();
}

export function primaryLanguages(country) {
  return [...new Set((country?.languages || []).map(canonicalLanguage).filter(lang=>lang&&!/^(lingua franca|widely spoken|other)$/i.test(lang)))].slice(0,2);
}

export function ensureLanguages(ch, birthCountry) {
  ch.languages ||= {};
  for (const lang of ch.nativeLanguages || primaryLanguages(birthCountry)) ch.languages[canonicalLanguage(lang)] ||= 100;
  return ch.languages;
}

export function languageLevel(ch, language) {
  const wanted=canonicalLanguage(language).toLowerCase();
  const entry=Object.entries(ch.languages||{}).find(([name])=>canonicalLanguage(name).toLowerCase()===wanted);
  return entry ? entry[1] : 0;
}

export function improveStudiedLanguage(ch) {
  const lang=canonicalLanguage(ch.languageStudyTarget);
  if(!lang)return null;
  ch.languages ||= {};
  ch.languages[lang]=Math.min(100,(ch.languages[lang]||0)+20);
  return lang;
}

export function destinationLanguageLevel(ch,country) {
  const langs=primaryLanguages(country);
  if(!langs.length)return 100;
  return Math.max(...langs.map(lang=>languageLevel(ch,lang)));
}

export function workLanguageMultiplier(ch,country) {
  const level=destinationLanguageLevel(ch,country);
  if(level>=60)return 1;
  if(level>=40)return .95;
  if(level>=20)return .85;
  return .75;
}

export function naturalizationLanguageRequirement(country) {
  const required=NATURALIZATION_LANGUAGE[country?.name]||0;
  return {required,language:primaryLanguages(country)[0]||'local language'};
}
