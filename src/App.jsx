import { lazy, Suspense, useEffect, useRef, useReducer, useCallback, useState } from 'react';
import { newGame, stepYear, continueAsHeir } from './engine/game.js';
import { autosave } from './engine/saves.js';
import CharacterCreation from './ui/CharacterCreation.jsx';
import Header from './ui/Header.jsx';
import TabBar from './ui/TabBar.jsx';
import SaveManager from './ui/SaveManager.jsx';
import { slotBudget } from './engine/activities.js';
import Credits from './ui/Credits.jsx';

const Overview = lazy(() => import('./ui/tabs/Overview.jsx'));
const Country = lazy(() => import('./ui/tabs/Country.jsx'));
const World = lazy(() => import('./ui/tabs/World.jsx'));
const Activities = lazy(() => import('./ui/tabs/Activities.jsx'));
const Finances = lazy(() => import('./ui/tabs/Finances.jsx'));
const Career = lazy(() => import('./ui/tabs/Career.jsx'));
const Education = lazy(() => import('./ui/tabs/Education.jsx'));
const Health = lazy(() => import('./ui/tabs/Health.jsx'));
const Events = lazy(() => import('./ui/tabs/Events.jsx'));
const LifeSummary = lazy(() => import('./ui/LifeSummary.jsx'));
const Family = lazy(() => import('./ui/tabs/Family.jsx'));
const Law = lazy(() => import('./ui/tabs/Law.jsx'));
const Business = lazy(() => import('./ui/tabs/Business.jsx'));
const Travel = lazy(() => import('./ui/tabs/Travel.jsx'));
const Settings = lazy(() => import('./ui/tabs/Settings.jsx'));

// The engine's game object is a single MUTABLE state object (by design). We hold
// it in a ref and force a re-render after each mutation, rather than storing it in
// useState — that avoids both the same-reference bailout and StrictMode double-runs.
export default function App() {
  const gameRef = useRef(null);
  const [, forceRender] = useReducer(x => x + 1, 0);
  const [tab, setTab] = useState('overview');
  const [advanceWarnings, setAdvanceWarnings] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saveRevision, setSaveRevision] = useState(0);
  const warningRef = useRef(null);

  const refresh = useCallback(() => forceRender(), []);

  const start = useCallback((opts) => {
    gameRef.current = newGame(opts);
    setTab('overview');
    setAdvanceWarnings(null);
    forceRender();
  }, []);

  const loadGame = useCallback((game) => {
    gameRef.current = game; setTab('overview'); setAdvanceWarnings(null); forceRender();
  }, []);

  const advanceNow = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.over) return;
    setAdvanceWarnings(null);
    stepYear(g);
    try { if(autosave(g))setSaveRevision(x => x + 1); }
    catch { setNotice({ message: 'Autosave failed; JSON export is still available.', bad: true }); }
    forceRender();
  }, []);

  const requestAdvance = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.over) return;
    const ch = g.character;
    const warnings = [];
    if (slotBudget(ch) > 0 && (ch.selectedActivities || []).length === 0) warnings.push('activities');
    if (ch.employmentStatus === 'unemployed') warnings.push('unemployed');
    if (warnings.length > 0) setAdvanceWarnings(warnings);
    else advanceNow();
  }, [advanceNow]);

  const restart = useCallback(() => {
    gameRef.current = null;
    setAdvanceWarnings(null);
    forceRender();
  }, []);

  const continueHeir = useCallback((childId) => {
    const next = continueAsHeir(gameRef.current, childId);
    if (!next) return;
    gameRef.current = next;
    try { if(autosave(next))setSaveRevision(x => x + 1); } catch { /* export remains available */ }
    setTab('overview');
    setAdvanceWarnings(null);
    forceRender();
  }, []);

  useEffect(() => {
    if (!advanceWarnings) return;
    warningRef.current?.focus();
    const escape = e => { if (e.key === 'Escape') setAdvanceWarnings(null); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [advanceWarnings]);

  const state = gameRef.current;
  const saveTools = <SaveManager state={state} onLoad={loadGame} onNotice={setNotice} revision={saveRevision} />;
  if (!state) return <><CharacterCreation onStart={start} saveTools={saveTools} />{notice && <div className={`toast ${notice.bad?'bad':''}`} role="status">{notice.message}</div>}</>;
  if (state.over) return <><Suspense fallback={<div className="loading" role="status">Loading life summary…</div>}><LifeSummary state={state} onRestart={restart} onContinueHeir={continueHeir} /></Suspense><Credits /></>;

  const nPending = state.character.pendingDecisions?.length || 0;
  const badges = {};
  if (nPending > 0) badges.events = nPending;

  const tabProps = { state, refresh };

  return (
    <div className="app">
      <Header character={state.character} />
      <TabBar active={tab} onChange={setTab} badges={badges} />
      <div className="content">
        <Suspense fallback={<div className="loading" role="status">Loading screen…</div>}>
        {tab === 'overview' && <Overview state={state} onOpenCountry={() => setTab('country')} />}
        {tab === 'country' && <Country state={state} />}
        {tab === 'activities' && <Activities {...tabProps} />}
        {tab === 'finances' && <Finances {...tabProps} />}
        {tab === 'career' && <Career {...tabProps} />}
        {tab === 'education' && <Education {...tabProps} />}
        {tab === 'family' && <Family {...tabProps} />}
        {tab === 'health' && <Health {...tabProps} />}
        {tab === 'events' && <Events {...tabProps} />}
        {tab === 'law' && <Law {...tabProps} />}
        {tab === 'business' && <Business {...tabProps} />}
        {tab === 'travel' && <Travel {...tabProps} />}
        {tab === 'world' && <World />}
        {tab === 'settings' && <Settings saveTools={saveTools} onNotice={setNotice} />}
        </Suspense>
      </div>
      <div className="age-action-bar">
        <button className="primary age-button" onClick={requestAdvance} disabled={state.over}>
          Age a Year <span aria-hidden="true">→</span>
        </button>
      </div>

      {advanceWarnings && (
        <div className="modal-backdrop" role="presentation">
          <div ref={warningRef} tabIndex="-1" className="warning-modal" role="dialog" aria-modal="true" aria-labelledby="advance-warning-title">
            <h2 id="advance-warning-title">Before you age a year</h2>
            <div className="warning-list">
              {advanceWarnings.includes('activities') && (
                <p><strong>No activities selected.</strong> Empty activity slots will become rest if you continue.</p>
              )}
              {advanceWarnings.includes('unemployed') && (
                <p><strong>You are unemployed.</strong> You will remain without a job unless a pending search or opportunity succeeds.</p>
              )}
            </div>
            <div className="warning-actions">
              {advanceWarnings.includes('activities') && (
                <button onClick={() => { setTab('activities'); setAdvanceWarnings(null); }}>Set activities</button>
              )}
              {advanceWarnings.includes('unemployed') && (
                <button onClick={() => { setTab('career'); setAdvanceWarnings(null); }}>View career</button>
              )}
              <button onClick={() => setAdvanceWarnings(null)}>Go back</button>
              <button className="primary" onClick={advanceNow}>Continue anyway</button>
            </div>
          </div>
        </div>
      )}
      {notice && <div className={`toast ${notice.bad?'bad':''}`} role="status"><span>{notice.message}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
      <Credits />
    </div>
  );
}
