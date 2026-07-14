import { COUNTRY_BY_ID } from '../engine/countries.js';
import { altServiceAvailable, universityDefermentAllowed, serviceYearsFor } from '../engine/military.js';

// Non-blocking decision events (GAME_DESIGN sections 7, 14). Renders every queued
// decision with option buttons and a stated default. If the player advances without
// choosing, the default applies. Draft has country-specific options; others carry
// their own `options` array.
function draftOptions(country,ch) {
  const opts = [{ id: 'serve', label: 'Serve', desc: `${serviceYearsFor(ch,country)} yr(s), +fitness & skills` }];
  if (universityDefermentAllowed(country)) opts.push({ id: 'defer', label: 'Defer (study)', desc: 'delay via university' });
  if (altServiceAvailable(country)) opts.push({ id: 'alternative', label: 'Civilian service', desc: 'longer, no combat' });
  opts.push({ id: 'evade', label: 'Evade', desc: 'risky — fines or prison if caught' });
  return opts;
}

function DecisionCard({ decision, country, ch, onChoose }) {
  const isDraft = decision.type === 'draft';
  const isMobilization = decision.type === 'mobilization';
  const opts = isDraft ? draftOptions(country,ch) : isMobilization
    ? [{ id: 'serve', label: 'Report for duty', desc: 'serve during wartime' },
      { id: 'evade', label: 'Evade', desc: 'risk fines or prison' }]
    : decision.options;
  const choice = decision.choice || decision.default;
  const prompt = isDraft
    ? `${country.name} has conscripted you. Choose before advancing (default: Serve).`
    : isMobilization ? `${country.name} has called you up during wartime (default: Report for duty).`
    : decision.prompt;
  const title = isDraft || isMobilization ? '⚔ Military notice'
    : decision.type === 'jobOffer' ? '💼 Job offer'
    : decision.type === 'visaExpiry' ? '🛂 Visa expiry'
    : decision.type === 'nationalityChoice' ? '🛂 Citizenship obligation'
    : ['legalCase','legalAppeal','civilCase'].includes(decision.type) ? '⚖ Legal decision'
    : '★ Opportunity';

  return (
    <div style={{
      background: 'var(--panel-2)', border: '1px solid var(--warn)', borderRadius: 'var(--radius)',
      padding: '12px 16px', margin: '0 0 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: 'var(--warn)' }}>{title}</span>
        <span className="muted" style={{ fontSize: 13 }}>{prompt}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {opts.map(o => (
          <button key={o.id} className={choice === o.id ? 'primary' : ''}
            onClick={() => onChoose(decision, o.id)} title={o.desc}>{o.label}</button>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Selected: <strong>{opts.find(o => o.id === choice)?.label}</strong>
        {opts.find(o => o.id === choice)?.desc ? ` — ${opts.find(o => o.id === choice).desc}` : ''}
        {' '}(applies when you advance)
      </div>
    </div>
  );
}

export default function DecisionBanner({ state, refresh }) {
  const ch = state.character;
  const pending = ch.pendingDecisions || [];
  if (pending.length === 0) return null;
  const country = COUNTRY_BY_ID[ch.countryId];

  const choose = (decision, optionId) => { decision.choice = optionId; refresh(); };

  return (
    <div>
      {pending.map((d, i) => <DecisionCard key={i} decision={d} country={country} ch={ch} onChoose={choose} />)}
    </div>
  );
}
