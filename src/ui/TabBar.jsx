// Top tab bar. Tabs with phase > CURRENT_PHASE are disabled placeholders,
// wired now so the structure matches GAME_DESIGN section 15.
export const CURRENT_PHASE = 10;

export const TABS = [
  { id: 'overview', label: 'Overview', phase: 1 },
  { id: 'country', label: 'Country', phase: 10 },
  { id: 'activities', label: 'Activities', phase: 2 },
  { id: 'finances', label: 'Finances', phase: 2 },
  { id: 'career', label: 'Career', phase: 2 },
  { id: 'education', label: 'Education', phase: 2 },
  { id: 'family', label: 'Family', phase: 4 },
  { id: 'health', label: 'Health', phase: 3 },
  { id: 'business', label: 'Business', phase: 5 },
  { id: 'travel', label: 'Travel', phase: 6 },
  { id: 'law', label: 'Law', phase: 4 },
  { id: 'events', label: 'Events', phase: 3 },
  { id: 'world', label: 'World', phase: 1 },
  { id: 'settings', label: 'Settings', phase: 1 },
];

export default function TabBar({ active, onChange, badges = {} }) {
  const onKeys = (e, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1
      : (index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    e.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
    <div className="tabbar" role="tablist" aria-label="Life screens">
      {TABS.map((t, index) => (
        <button
          key={t.id}
          className={active === t.id ? 'active' : ''}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          onKeyDown={e => onKeys(e, index)}
          disabled={t.phase > CURRENT_PHASE}
          onClick={() => onChange(t.id)}
          title={t.phase > CURRENT_PHASE ? `Coming in Phase ${t.phase}` : t.label}
        >
          {t.label}
          {badges[t.id] ? <span className="badge">{badges[t.id]}</span> : null}
        </button>
      ))}
    </div>
  );
}
