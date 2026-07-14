import { medianWage } from './countries.js';
import { genderRightsProfile } from './genderRights.js';
import { laborProfile } from './labor.js';
import { ensureHousing } from './housing.js';

function clamp(v) { return Math.max(0, Math.min(100, v)); }
function pickDistribution(rng, list, fallback) {
  if (!list?.length) return fallback;
  return rng.weighted(list, x => x.pct || 1).name;
}
export function personAge(ch, person) { return Math.max(0, ch.age - person.ageOffset); }

function makePartner(ch, country, rng) {
  const sameGroup = rng.chance(0.7);
  return {
    id: 'partner', relation: 'Partner', alive: true,
    sex: ch.sex === 'male' ? 'female' : ch.sex === 'female' ? 'male' : (rng.chance(0.5) ? 'female' : 'male'),
    ageOffset: ch.age - Math.max(16, ch.age + rng.int(-4, 4)),
    ethnicity: sameGroup ? ch.ethnicity : pickDistribution(rng, country.ethnicGroups, ch.ethnicity),
    religion: rng.chance(0.75) ? ch.religion : pickDistribution(rng, country.religions, ch.religion),
    relationshipScore: 65 + rng.int(-8, 8), yearsTogether: 0, working: false,
    countryId: country.id, residenceCountryId: country.id, citizenships: [country.id],
  };
}

function spouseWork(ch, country, rng, spouse) {
  const profile = genderRightsProfile(country);
  const base = country.incomeTier >= 4 ? 0.72 : country.incomeTier >= 2 ? 0.58 : 0.42;
  const mult = spouse.sex === 'female' ? profile.femaleHireMult : 1;
  spouse.working = rng.chance(base * mult);
  spouse.wageMult = 0.55 + rng.next() * 0.9;
}

function makeChild(ch, country, rng) {
  const n = (ch.family || []).filter(p => p.relation === 'Child').length + 1;
  const parentInt = ch.stats.intelligence;
  const citizenships = [...new Set([
    ...(ch.immigration?.citizenships || [ch.countryId]),
    ...(ch.spouse?.citizenships || []),
    ...(country.citizenship?.jusSoli ? [country.id] : []),
  ])];
  return {
    id: `child-${ch.age}-${n}`, relation: 'Child', childNumber: n, name: null, alive: true,
    sex: rng.chance(0.5) ? 'male' : 'female', ageOffset: ch.age,
    ethnicity: rng.chance(0.8) ? ch.ethnicity : ch.spouse?.ethnicity || ch.ethnicity,
    religion: rng.chance(0.8) ? ch.religion : ch.spouse?.religion || ch.religion,
    countryId: country.id, residenceCountryId: country.id, citizenships,
    relationshipScore: 75,
    stats: {
      health: clamp(ch.stats.health + rng.int(-10, 10)),
      happiness: 60 + rng.int(-8, 8),
      intelligence: clamp(parentInt + rng.int(-10, 10)),
      fitness: 50 + rng.int(-10, 10), charisma: 45 + rng.int(-10, 10),
    },
    skills: { academic: 0, vocational: 0, business: 0, political: 0 },
    atHome: true, working: false, personalSavings: 0,
  };
}

export function spouseIncome(ch, country) {
  return ch.spouse?.alive && ch.spouse.working ? medianWage(country) * (ch.spouse.wageMult || 0.8) : 0;
}

export function resolveFamily(ch, country, rng) {
  const logs = [], expenses = [], incomes = [];
  const housing = ensureHousing(ch);
  const social = (ch.selectedActivities || []).some(x => x === 'socializing' || x === 'family');

  for (const p of ch.family || []) {
    if (!p.alive) continue;
    if (p.relationshipScore != null && !social) p.relationshipScore = clamp(p.relationshipScore - 3);
    const age = personAge(ch, p);
    if (p.relation === 'Child' && age >= 6 && age < 18 && p.atHome !== false) {
      p.skills.academic = clamp((p.skills.academic || 0) + country.educationTier * 0.8);
      const labor=laborProfile(country);
      if(age>=labor.lightWorkAge&&ch.wealthIdx<=1&&rng.chance(labor.childLaborRisk)){
        const earned=medianWage(country)*.08, contribution=earned*housing.teenContributionRate;
        p.working=true; p.personalSavings=(p.personalSavings||0)+(earned-contribution);
        if(contribution>0)incomes.push({label:`${p.name||`Child ${p.childNumber}`} household contribution`,amount:contribution,untaxed:true,target:'household'});
        p.skills.academic=clamp(p.skills.academic-2); logs.push(`${p.name||`Child ${p.childNumber}`} worked to support the household.`);
      }
    }
    if (p.relation === 'Child' && age >= 18 && p.atHome !== false) {
      if (!p.working && rng.chance(.42 + country.incomeTier * .06)) { p.working=true; p.wageMult=.45+rng.next()*.55; logs.push(`${p.name||`Child ${p.childNumber}`} found work while living at home.`); }
      if (p.working) {
        const earned=medianWage(country)*(p.wageMult||.6), contribution=earned*housing.adultChildContributionRate;
        p.personalSavings=(p.personalSavings||0)+(earned-contribution);
        if(contribution>0)incomes.push({label:`${p.name||`Child ${p.childNumber}`} board contribution`,amount:contribution,target:'household',untaxed:true});
      }
      const moveChance=Math.max(0, .04+(age-20)*.025+(p.working?.08:0)+(p.personalSavings>medianWage(country)*.6?.08:0)+housing.adultChildContributionRate*.2);
      if(age>=18&&rng.chance(Math.min(.65,moveChance))){p.atHome=false;logs.push(`${p.name||`Child ${p.childNumber}`} moved out of the household.`);}
    }
    if (age > 50) {
      const annualDeath = Math.min(0.35, 0.002 * Math.exp(0.075 * (age - 50)));
      if (rng.chance(annualDeath)) { p.alive = false; logs.push(`Your ${p.relation.toLowerCase()} died at age ${age}.`); }
    }
    if ((p.relation === 'Father' || p.relation === 'Mother') && age >= 65
        && ['minimal', 'none'].includes(country.welfareTier) && rng.chance(0.08)) {
      const amount = medianWage(country) * 0.12;
      expenses.push({ label: `Support for elderly ${p.relation.toLowerCase()}`, amount });
      p.relationshipScore = clamp((p.relationshipScore || 50) + 5);
      logs.push(`You helped support your elderly ${p.relation.toLowerCase()}.`);
    }
  }

  if (!ch.partner && !ch.spouse && ch.datingIntent && ch.age >= 16 && rng.chance(0.18 + ch.stats.charisma / 500)) {
    ch.partner = makePartner(ch, country, rng);
    logs.push('You began dating someone from your community.');
  }
  if (ch.partner?.alive) {
    ch.partner.yearsTogether += 1;
    ch.partner.relationshipScore = clamp(ch.partner.relationshipScore + (social ? 3 : -3));
    if (ch.proposalIntent) {
      const accepted = rng.chance(0.35 + ch.partner.relationshipScore / 150);
      if (accepted) {
        ch.spouse = { ...ch.partner, id: 'spouse', relation: 'Spouse' };
        spouseWork(ch, country, rng, ch.spouse);
        if (ch.sex === 'female' && genderRightsProfile(country).husbandWorkApproval) {
          ch.familyRights.workPermission = false;
          if (ch.job) {
            ch.job = null;
            ch.employmentStatus = 'unemployed';
            logs.push('Marriage restrictions forced you to leave paid work until household permission is granted.');
          }
        }
        ch.partner = null;
        logs.push('You married your partner.');
      } else logs.push('Your marriage proposal was declined.');
      ch.proposalIntent = false;
    }
  }

  if (ch.spouse?.alive) {
    const spouseAge = personAge(ch, ch.spouse);
    if (spouseAge > 50) {
      const deathP = Math.min(0.35, 0.002 * Math.exp(0.075 * (spouseAge - 50)));
      if (rng.chance(deathP)) {
        ch.spouse.alive = false;
        ch.stats.happiness = clamp(ch.stats.happiness - 15);
        logs.push(`Your spouse died at age ${spouseAge}.`);
      }
    }
  }

  if (ch.spouse?.alive) {
    ch.spouse.relationshipScore = clamp(ch.spouse.relationshipScore + (social ? 3 : -3));
    if (ch.spouse.relationshipScore < 25 && rng.chance(0.18)) {
      if (ch.judicial) {
        ch.judicial.divorceDue = Math.max(0, (ch.money.bank || 0) * 0.5);
        logs.push('Your marriage ended in divorce; division of household assets was referred to court.');
      } else {
        ch.money.bank *= 0.5;
        logs.push('Your marriage ended in divorce; household assets were split equally.');
      }
      ch.spouse = null;
      ch.familyRights.workPermission = false;
    } else {
      const femaleAge = ch.sex === 'female' ? ch.age : personAge(ch, ch.spouse);
      const ageFactor = femaleAge < 30 ? 1 : femaleAge < 35 ? 0.75 : femaleAge < 40 ? 0.35 : 0.08;
      const base = Math.min(0.30, (country.fertility || 2) / 12) * ageFactor;
      const p = ch.childrenIntent === 'try' ? base : ch.childrenIntent === 'avoid' ? 0.05 : base * 0.35;
      if (femaleAge >= 18 && femaleAge <= 45 && rng.chance(p)) {
        const child = makeChild(ch, country, rng);
        ch.family.push(child);
        logs.push(`A child was born into your family.`);
      }
    }
  }

  const goodChildren = (ch.family || []).filter(p => p.relation === 'Child' && p.alive && p.relationshipScore >= 50).length;
  if (goodChildren > 0) ch.stats.happiness = clamp(ch.stats.happiness + 2);

  if (ch.familyRights?.requestWorkPermission && ch.spouse?.alive) {
    const granted = rng.chance(0.25 + ch.spouse.relationshipScore / 140);
    ch.familyRights.workPermission = granted;
    ch.familyRights.requestWorkPermission = false;
    logs.push(granted ? 'Your husband agreed that you may seek paid work.' : 'Your husband refused permission for you to seek paid work.');
  }

  const young=(ch.family||[]).filter(p=>p.relation==='Child'&&p.alive&&p.atHome!==false&&personAge(ch,p)<18);
  if(young.length) expenses.push({label:'Child essentials',amount:medianWage(country)*.08*young.length,household:true});
  const daycare=young.filter(p=>personAge(ch,p)<6).length;
  const playerWorks = !!ch.job || ch.military?.status === 'career';
  const caregiverUnavailable = !ch.spouse?.alive || !!ch.spouse.working;
  if(daycare&&playerWorks&&caregiverUnavailable){const subsidy={generous:.8,moderate:.5,minimal:.15,none:0}[country.welfareTier]||0;expenses.push({label:`Daycare (${Math.round(subsidy*100)}% public subsidy)`,amount:medianWage(country)*.18*daycare*(1-subsidy),household:true});}
  return { logs, expenses, incomes };
}
