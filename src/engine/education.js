// Education system (GAME_DESIGN section 5).
import { medianWage } from './countries.js';
import { genderRightsProfile } from './genderRights.js';
import { healthEducationMultiplier } from './health.js';

export const SCHOOL = {
  PRIMARY_START: 6, SECONDARY_START: 12, SECONDARY_END: 18,
};

// Initialize education state at birth.
export function initEducation() {
  return {
    stage: 'preschool',   // preschool -> primary -> secondary -> university|vocational|workforce -> graduated|dropout
    enrolled: false,
    private: false,
    degree: false,        // has a university degree
    vocational: false,    // completed a vocational qualification
    yearsInHigher: 0,
    droppedOut: false,
    resistDropout: true,
    familyEducationSpend: 0,
    _tuitionDue: false,
  };
}

// Called each year during resolution. Handles automatic school progression,
// dropout rolls for poor families in low-tier countries, and quality gains.
// Returns log lines.
export function resolveEducation(ch, country, rng) {
  const log = [];
  const ed = ch.education;
  const age = ch.age;
  const rights = genderRightsProfile(country);
  if (ch.employmentStatus === 'prison') {
    if (ed.enrolled) log.push('Imprisonment interrupted your education this year.');
    return log;
  }

  // Enter primary at 6, secondary at 12 (automatic if not dropped out).
  if (!ed.droppedOut && age >= SCHOOL.PRIMARY_START && age < SCHOOL.SECONDARY_END &&
      (ed.stage === 'preschool' || ed.stage === 'primary' || ed.stage === 'secondary')) {
    ed.stage = age >= SCHOOL.SECONDARY_START ? 'secondary' : 'primary';
    ed.enrolled = true;

    // Severe country restrictions can remove girls from secondary education
    // regardless of household income. Restricted profiles create a smaller,
    // resistible pressure layered on top of poverty-related dropout.
    if (ch.sex === 'female' && age >= SCHOOL.SECONDARY_START && rights.schoolAccessMult < 1) {
      const rightsDrop = (1 - rights.schoolAccessMult) * (rights.tier === 'severe' ? 0.8 : 0.18);
      if (rng.chance(rightsDrop)) {
        if (rights.tier !== 'severe' && ed.resistDropout && ch.wealthIdx > 0) {
          ch.wealthIdx -= 1;
          ch.wealthClass = ['Destitute', 'Poor', 'Middle', 'Affluent', 'Rich'][ch.wealthIdx];
          log.push('Your family spent heavily to keep you in school despite local restrictions.');
        } else {
          ed.droppedOut = true; ed.enrolled = false; ed.stage = 'dropout';
          log.push('Country restrictions and family pressure forced you out of school.');
          return log;
        }
      }
    }

    // Dropout risk: tier 1-2 countries, Destitute/Poor families.
    const poor = ch.wealthIdx <= 1;
    const dropRate = poor ? (country.educationTier === 1 ? 0.15 : country.educationTier === 2 ? 0.05 : 0) : 0;
    if (dropRate > 0 && rng.chance(dropRate)) {
      if (ed.resistDropout && ch.wealthIdx > 0) {
        ch.wealthIdx -= 1;
        ch.wealthClass = ['Destitute', 'Poor', 'Middle', 'Affluent', 'Rich'][ch.wealthIdx];
        log.push(`Your family made financial sacrifices to keep you in school.`);
      } else {
        ed.droppedOut = true; ed.enrolled = false; ed.stage = 'dropout';
        log.push(`Your family pulled you out of school at age ${age} to help support the household.`);
        return log;
      }
    }

    // Quality: +2 * tier/2 Academic per year, +2 if private.
    const healthMult = healthEducationMultiplier(ch);
    const gain = (2 * (country.educationTier / 2) + (ed.private ? 2 : 0)) * healthMult;
    ch.skills.academic = Math.min(100, ch.skills.academic + gain);
    if (healthMult < 0.7) log.push('Health limitations and medical absences reduced your school progress this year.');
    if (ed.private) ed.familyEducationSpend += medianWage(country);
  }

  // Finished secondary at 18 -> workforce eligible unless in higher ed.
  if (age === SCHOOL.SECONDARY_END && (ed.stage === 'secondary')) {
    ed.enrolled = false;
    ed.stage = 'secondary_done';
    log.push('Finished secondary school.');
  }

  // Progress through higher education.
  if (ed.stage === 'university' || ed.stage === 'vocational') {
    ed._tuitionDue = true;
    ed.yearsInHigher += 1;
    const needed = ed.stage === 'university' ? 4 : 2;
    // higher-ed academic gains
    const healthMult = healthEducationMultiplier(ch);
    ch.skills.academic = Math.min(100, ch.skills.academic + 3 * healthMult);
    if (healthMult < 0.7) log.push('Health limitations reduced your higher-education progress this year.');
    if (ed.yearsInHigher >= needed) {
      if (ed.stage === 'university') { ed.degree = true; log.push('Graduated university with a degree.'); }
      else { ed.vocational = true; log.push('Completed a vocational qualification.'); }
      ed.stage = 'graduated';
      ed.enrolled = false;
    }
  }

  return log;
}

// Can the player enroll now? (called by UI/career choices)
export function canEnrollUniversity(ch) {
  return ch.skills.academic >= 50 && ['secondary_done', 'graduated', 'dropout', 'workforce'].includes(ch.education.stage)
    && ch.age >= 18 && ch.employmentStatus !== 'prison' && !isEnrolledHigher(ch);
}
export function canEnrollVocational(ch) {
  return ch.skills.academic >= 30 && ['secondary_done', 'graduated', 'dropout', 'workforce'].includes(ch.education.stage)
    && ch.age >= 16 && ch.employmentStatus !== 'prison' && !isEnrolledHigher(ch);
}
export function isEnrolledHigher(ch) {
  return ch.education.stage === 'university' || ch.education.stage === 'vocational';
}

// Tuition for university by country tier (annual). Returns {annual, loanable, scholarship}.
export function universityTuition(country, ch) {
  const mw = medianWage(country);
  let annual;
  if (country.educationTier >= 4 && country.taxTier === 'heavy') annual = 0;          // free (e.g. Germany)
  else if (country.incomeTier >= 3) annual = 1.5 * mw;                                 // expensive (e.g. US)
  else annual = 0.2 * mw;                                                              // subsidized
  const scholarship = ch.skills.academic >= 75;
  if (scholarship) annual = 0;
  const loanable = country.incomeTier >= 3;
  return { annual, loanable, scholarship };
}

// Begin enrollment (mutates). kind: 'university' | 'vocational'. useLoan optional.
export function enroll(ch, country, kind, { useLoan = false } = {}) {
  ch.education.stage = kind;
  ch.education.enrolled = true;
  ch.education.yearsInHigher = 0;
  ch.employmentStatus = 'student';
  // clear any current job
  ch.job = null;
  if (kind === 'university') {
    const t = universityTuition(country, ch);
    ch.education._tuition = t.annual;
    ch.education._useLoan = useLoan && t.loanable && t.annual > 0;
  } else {
    ch.education._tuition = 0.2 * medianWage(country) * 0.5; // vocational cheaper
    ch.education._useLoan = false;
  }
}
