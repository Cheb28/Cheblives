// Events framework (GAME_DESIGN section 14): data-driven yearly events.
// Informational events apply immediately and log to the feed. Decision events
// queue onto ch.pendingDecisions (resolved next advance, default applies if the
// player ignores them — never blocking). Health events live in health.js.
import { medianWage } from './countries.js';
import { wageFor, SECTORS } from './jobs.js';
import { resolveVisaExpiry, resolveNationalityChoice } from './immigration.js';
import { resolveAppeal, resolveCivilDecision, resolveLegalDecision } from './judicial.js';

// ---- Decision resolver (by type, keeps decisions serializable) ----------
export function resolveDecision(ch, country, state, rng, decision, log) {
  const choice = decision.choice || decision.default;
  switch (decision.type) {
    case 'draft':
      // handled in advance.js (military-specific); kept here for completeness
      break;
    case 'jobOffer': {
      if (choice === 'accept') {
        ch.job = { sector: decision.sector, rung: decision.rung, yearsAtRung: 0 };
        ch.employmentStatus = decision.sector === 'informal' ? 'informal' : 'employed';
        ch.jobSearch.sector = null;
        ch.everEmployed = true;
        log.push(`Accepted a job offer: ${SECTORS[decision.sector].rungs[decision.rung].title}.`);
      } else {
        log.push('Declined a job offer.');
      }
      break;
    }
    case 'mentor': {
      if (choice === 'accept') {
        ch.skills[decision.skill] = Math.min(100, ch.skills[decision.skill] + 8);
        log.push(`Took up a mentor's guidance (+${decision.skill}).`);
      }
      break;
    }
    case 'visaExpiry':
      resolveVisaExpiry(ch,state,rng,decision,log);
      break;
    case 'nationalityChoice':
      resolveNationalityChoice(ch,rng,decision,log);
      break;
    case 'legalCase':
      resolveLegalDecision(ch,country,rng,decision,log);
      break;
    case 'legalAppeal':
      resolveAppeal(ch,country,rng,decision,log);
      break;
    case 'civilCase':
      resolveCivilDecision(ch,country,rng,decision,log);
      break;
    default: break;
  }
}

// ---- Yearly world events ------------------------------------------------
// Returns { logs:[{category,text}], decisions:[...], effects:{recession, war, wageShockPct, inflationShock} }.
export function rollEvents(ch, country, state, rng) {
  const logs = [];
  const decisions = [];
  const effects = { recession: false, war: false, wageShockPct: 0 };
  const stability = country.stability ?? 2;
  const adult = ch.age >= 18;

  // --- Economic ---
  // Recession roughly every ~10 years (higher in unstable economies).
  if (rng.chance(stability === 1 ? 0.15 : stability === 2 ? 0.10 : 0.07)) {
    effects.recession = true;
    effects.wageShockPct = -0.1;
    logs.push({ category: 'economic', text: 'A national recession hit — jobs are precarious this year.' });
  } else if (rng.chance(0.06)) {
    logs.push({ category: 'economic', text: 'The economy is booming.' });
    effects.boom = true;
  }
  // Hyperinflation in fragile economies.
  if ((country.inflation ?? 3) > 12 && stability <= 2 && rng.chance(0.12)) {
    const wipe = 0.3 + rng.next() * 0.4;
    ch.money.bank *= (1 - wipe);
    logs.push({ category: 'economic', text: `Hyperinflation wiped out ${Math.round(wipe * 100)}% of your bank savings.` });
  }

  // --- Political (by stability) ---
  const politicalP = stability === 1 ? 0.10 : stability === 2 ? 0.04 : 0.015;
  if (rng.chance(politicalP)) {
    // War only breaks out in unstable or conflict-flagged countries; stable
    // developed states get unrest/elections instead (no "war in the USA").
    const warProne = stability <= 2 || country.conflict.displacement;
    const warWeight = !warProne ? 0 : country.conflict.displacement ? 0.5 : 0.3;
    const r = rng.next();
    if (r < warWeight) {
      effects.war = true;
      effects.wageShockPct = -0.3;
      state.atWar = (state.atWar || 0) + 1;
      if (ch.immigration) ch.immigration.asylumEligibleUntil = (state.year || 0) + 5;
      logs.push({ category: 'political', text: 'War has broken out. Daily life is upended and dangerous.' });
    } else if (r < warWeight + 0.3) {
      logs.push({ category: 'political', text: 'Political unrest and protests grip the country.' });
      ch.stats.happiness = Math.max(1, ch.stats.happiness - 4);
    } else if (r < warWeight + 0.45 && stability === 1) {
      logs.push({ category: 'political', text: 'A coup has overthrown the government.' });
    } else {
      logs.push({ category: 'political', text: 'An election dominates the national mood.' });
    }
    // persecution of activists in authoritarian states
    if (stability === 1 && (ch.selectedActivities || []).includes('activism') && rng.chance(0.3)) {
      logs.push({ category: 'political', text: 'You were harassed by authorities for your activism.' });
      ch.stats.happiness = Math.max(1, ch.stats.happiness - 6);
      if (ch.immigration) {
        ch.immigration.persecuted = true;
        ch.immigration.asylumEligibleUntil = (state.year || 0) + 5;
      }
    }
  }

  // --- Opportunity (decision events) ---
  if (adult && !['student','prison'].includes(ch.employmentStatus) && rng.chance(0.06)) {
    // Job offer: a role in the player's best eligible sector, one rung above entry
    // if qualified, else entry. Only offer if it beats current job.
    const offer = buildJobOffer(ch, country, rng);
    if (offer) decisions.push(offer);
  }
  if (adult && ch.age < 55 && ch.employmentStatus !== 'prison' && rng.chance(0.03)) {
    const skill = rng.pick(['academic', 'vocational', 'business']);
    decisions.push({ type: 'mentor', skill, default: 'accept',
      prompt: `A mentor offers to sharpen your ${skill} skills.`,
      options: [{ id: 'accept', label: 'Accept', desc: `+8 ${skill}` }, { id: 'decline', label: 'Decline', desc: 'no change' }] });
  }
  // Rare windfall (informational).
  if (rng.chance(0.01)) {
    const amt = medianWage(country) * (1 + rng.next() * 4);
    ch.money.bank += amt;
    logs.push({ category: 'opportunity', text: `Unexpected windfall of about ${Math.round(amt).toLocaleString()} (inheritance, prize, or luck).` });
  }

  return { logs, decisions, effects };
}

function buildJobOffer(ch, country, rng) {
  // Find the highest sector rung the player currently qualifies for.
  let best = null;
  for (const [key, sec] of Object.entries(SECTORS)) {
    if (ch.immigration?.residence?.status === 'irregular' && key !== 'informal') continue;
    for (let r = sec.rungs.length - 1; r >= 0; r--) {
      if (sec.rungs[r].gate(ch)) {
        const mult = sec.rungs[r].mult;
        if (!best || mult > best.mult) best = { sector: key, rung: r, mult, title: sec.rungs[r].title };
        break;
      }
    }
  }
  if (!best) return null;
  const offeredWage = medianWage(country) * best.mult;
  const currentWage = ch.job ? wageFor(country, ch.job, ch) : 0;
  if (offeredWage <= currentWage * 1.05) return null; // only offer a real improvement
  return {
    type: 'jobOffer', sector: best.sector, rung: best.rung, default: 'decline',
    prompt: `Job offer: ${best.title} (${SECTORS[best.sector].label}) at ~${Math.round(offeredWage).toLocaleString()}/yr.`,
    options: [{ id: 'accept', label: 'Accept', desc: `${Math.round(offeredWage).toLocaleString()}/yr` },
      { id: 'decline', label: 'Decline', desc: ch.job ? 'keep current job' : 'stay as you are' }],
  };
}
