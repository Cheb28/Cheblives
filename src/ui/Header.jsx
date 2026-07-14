import { money, STAT_COLORS } from './format.js';
import { netWorth } from '../engine/advance.js';
import { displayName } from '../engine/names.js';

function MiniBar({ value, color, label }) {
  return (
    <div className="mini-bar" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(value)}>
      <span style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function Header({ character }) {
  const s = character.stats;
  return (
    <div className="header">
      <div className="who">
        <span className="name">{character.sex === 'male' ? '♂' : '♀'} {displayName(character)}, age {character.age}</span>
        <span className="loc">{character.location.name}, {character.countryName}</span>
      </div>

      <div className="stat-mini" title="Health">
        <span className="muted">HP</span><MiniBar label="Health" value={s.health} color={STAT_COLORS.health} />
      </div>
      <div className="stat-mini" title="Happiness">
        <span className="muted">☺</span><MiniBar label="Happiness" value={s.happiness} color={STAT_COLORS.happiness} />
      </div>

      <div className="cash" title="Total net worth including household funds, assets, homes, businesses, and debts">{money(netWorth(character))}</div>

      <div className="spacer" />

    </div>
  );
}
