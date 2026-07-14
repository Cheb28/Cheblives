import DecisionBanner from '../DecisionBanner.jsx';

const CATEGORY_COLORS = {
  health: 'var(--health)', economic: 'var(--happiness)', political: 'var(--bad)',
  family: 'var(--accent-2)', opportunity: 'var(--good)', crime: 'var(--warn)',
};

// Events tab (GAME_DESIGN section 14): pending decisions (with buttons) plus a
// feed of recent events. Never blocks — decisions apply their default on advance.
export default function Events({ state, refresh }) {
  const ch = state.character;
  const feed = [...(ch.eventFeed || [])].reverse();

  return (
    <div>
      {ch.pendingDecisions?.length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <h3>Decisions Awaiting You</h3>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            These apply their default when you advance if you don't choose — nothing blocks the game.
          </div>
          <DecisionBanner state={state} refresh={refresh} />
        </div>
      )}

      <div className="panel">
        <h3>Event Feed</h3>
        {feed.length === 0 && <div className="muted">No notable events yet. Life has been quiet.</div>}
        <div className="log">
          {feed.map((e, i) => (
            <div className="yr" key={i}>
              <span className="age">Age {e.age}</span>
              <span className="tag" style={{ marginRight: 8, color: CATEGORY_COLORS[e.category] || 'var(--text-dim)', borderColor: 'var(--border)' }}>
                {e.category}
              </span>
              <span className="txt">{e.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
