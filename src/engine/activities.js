// Yearly time-allocation activities (GAME_DESIGN section 4).
import { medianWage } from './countries.js';
import { disabilityBurden } from './health.js';
import { improveStudiedLanguage } from './language.js';

// Each activity: id, label, effect(ch, ctx) applying stat/skill deltas, and an
// available(ch, country) gate. Effects are the tunable balancing table.
export const ACTIVITIES = [
  { id: 'studying', label: 'Studying', desc: '+Academic, +Intelligence',
    effect: (ch) => { const m = ch.education?.enrolled ? 1.5 : 1; addSkill(ch, 'academic', 3 * m); addStat(ch, 'intelligence', 1 * m); } },
  { id: 'reading', label: 'Reading', desc: '+Intelligence, +Academic, +Happiness',
    effect: (ch) => { addStat(ch, 'intelligence', 1); addSkill(ch, 'academic', 1); addStat(ch, 'happiness', 1); } },
  { id: 'gym', label: 'Gym / Sports', desc: '+Fitness, +Health',
    effect: (ch) => { addStat(ch, 'fitness', 3); addStat(ch, 'health', 1); },
    available: (ch) => ch.location.kind === 'rural' || ch.wealthIdx >= 1 || (ch.money.cash + ch.money.bank) > 0 },
  { id: 'socializing', label: 'Socializing', desc: '+Charisma, +Happiness',
    effect: (ch) => { addStat(ch, 'charisma', 2); addStat(ch, 'happiness', 2); } },
  { id: 'activism', label: 'Political activism', desc: '+Political, +Charisma',
    effect: (ch) => { addSkill(ch, 'political', 3); addStat(ch, 'charisma', 1); } },
  { id: 'religion', label: 'Religious practice', desc: '+Happiness, +Charisma',
    effect: (ch) => { addStat(ch, 'happiness', 2); addStat(ch, 'charisma', 1); },
    available: (ch) => ch.religion && ch.religion !== 'None' },
  { id: 'sidehustle', label: 'Side hustle', desc: '+income, +Vocational',
    effect: (ch, ctx) => { addSkill(ch, 'vocational', 1); ctx.sideIncome += medianWage(ctx.country) * (0.05 + ctx.rng.next() * 0.10); },
    available: (ch) => ch.age >= 14 },
  { id:'language', label:'Language study', desc:'+20 selected-language proficiency',
    effect:(ch)=>{improveStudiedLanguage(ch);}, available:(ch)=>ch.age>=6&&!!ch.languageStudyTarget },
  { id:'regional_work', label:'Specified regional work', desc:'Australian WHV renewal credit + income',
    effect:(ch,ctx)=>{const visa=ch.immigration?.residence?.visa;const months=(visa?.renewals||0)===0?3:6;visa.regionalWorkMonths=(visa.regionalWorkMonths||0)+months;ctx.sideIncome+=medianWage(ctx.country)*.35;},
    available:(ch,country)=>country.name==='Australia'&&ch.immigration?.residence?.visa?.kind==='working_holiday'&&(ch.immigration.residence.visa.renewals||0)<2 },
  { id: 'business', label: 'Business books', desc: '+Business',
    effect: (ch) => { addSkill(ch, 'business', 2); },
    available: (ch) => ch.age >= 14 },
  { id: 'family', label: 'Family time', desc: '+relationships, +Happiness',
    effect: (ch) => { addStat(ch, 'happiness', 1); },
    available: (ch) => ch.spouse || (ch.family || []).some(p => p.relation === 'Child' && p.alive) },
  { id: 'rest', label: 'Rest / leisure', desc: '+Happiness, +Health',
    effect: (ch) => { addStat(ch, 'happiness', 2); addStat(ch, 'health', 1); } },
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));

// Slot budget by situation (section 4).
export function slotBudget(ch) {
  if (ch.age < 6) return 0; // infants/toddlers: no activities yet, just growing up
  let slots;
  switch (ch.employmentStatus) {
    case 'child': slots=2; break;
    case 'student': slots=2; break;
    case 'employed': slots=ch.job&&ch.job.partTime?3:2; break;
    case 'informal': slots=3; break;
    case 'unemployed':
    case 'homemaker': slots=4; break;
    case 'retired': slots=3; break;
    case 'military': slots=1; break;
    case 'prison': slots=1; break;
    default: slots=3;
  }
  const healthTime = disabilityBurden(ch) >= 4 || (ch.health?.frailty || 0) >= 60 ? 1 : 0;
  return Math.max(0, slots - (ch.partTimeWork ? 1 : 0) - healthTime);
}

export function availableActivities(ch, country) {
  if (ch.employmentStatus === 'prison') {
    const prisonActivities = new Set(['reading', 'gym', 'religion', 'rest']);
    return ACTIVITIES.filter(a => prisonActivities.has(a.id) && (!a.available || a.available(ch, country)));
  }
  return ACTIVITIES.filter(a => !a.available || a.available(ch, country));
}

// Apply the player's selected activities for the year. Unchecked slots -> Rest at half.
export function applyActivities(ch, country, rng, selectedIds) {
  const ctx = { country, rng, sideIncome: 0 };
  const budget = slotBudget(ch);
  const avail = new Set(availableActivities(ch, country).map(a => a.id));
  const chosen = (selectedIds || []).filter(id => avail.has(id)).slice(0, budget);
  for (const id of chosen) ACTIVITY_BY_ID[id].effect(ch, ctx);
  // idle slots -> Rest at half effect
  const idle = budget - chosen.length;
  for (let i = 0; i < idle; i++) { addStat(ch, 'happiness', 1); addStat(ch, 'health', 0.5); }
  return ctx.sideIncome;
}

// ---- helpers ----
function clamp(v, lo = 1, hi = 100) { return Math.max(lo, Math.min(hi, v)); }
function addStat(ch, k, d) { ch.stats[k] = clamp((ch.stats[k] || 0) + d); }
function addSkill(ch, k, d) { ch.skills[k] = clamp((ch.skills[k] || 0) + d, 0, 100); }
