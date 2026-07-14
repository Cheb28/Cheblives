import { useEffect, useRef, useState } from 'react';
import { deleteSave, exportSaveText, listSaves, loadSave, parseSave, restoreEnvelope, saveManual } from '../engine/saves.js';

export default function SaveManager({ state, onLoad, onNotice, revision = 0 }) {
  const [name, setName] = useState('My life');
  const [saves, setSaves] = useState(() => listSaves());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => setSaves(listSaves()), [revision]);
  const refresh = () => setSaves(listSaves());
  const report = (message, bad = false) => onNotice?.({ message, bad });

  const manual = () => {
    try { const label = saveManual(state, name); refresh(); report(`Saved “${label}”.`); }
    catch (e) { report(e.message, true); }
  };
  const load = key => { try { onLoad(loadSave(key)); report('Save loaded.'); } catch (e) { report(e.message, true); refresh(); } };
  const remove = key => {
    if (confirmDelete !== key) { setConfirmDelete(key); return; }
    deleteSave(key); setConfirmDelete(null); refresh(); report('Save deleted.');
  };
  const exportJson = () => {
    try {
      const blob = new Blob([exportSaveText(state, name)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `reallives-age-${state.character.age}.json`; a.click(); URL.revokeObjectURL(url);
      report('Save exported as JSON.');
    } catch (e) { report(e.message, true); }
  };
  const importJson = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try { onLoad(restoreEnvelope(parseSave(await file.text()))); report(`Imported ${file.name}.`); }
    catch (err) { report(err.message, true); }
    e.target.value = '';
  };

  return <section className="panel save-manager" aria-labelledby="save-heading">
    <h3 id="save-heading">Save & Resume</h3>
    {state && <div className="save-create">
      <label htmlFor="save-name">Save name</label>
      <input id="save-name" maxLength="40" value={name} onChange={e => setName(e.target.value)} />
      <button onClick={manual}>Save slot</button>
      <button onClick={exportJson}>Export JSON</button>
    </div>}
    <input ref={fileRef} className="visually-hidden" tabIndex="-1" aria-hidden="true" type="file" accept="application/json,.json" onChange={importJson} />
    <button onClick={() => fileRef.current?.click()}>Import JSON</button>
    {saves.length === 0 ? <p className="muted">No saves yet. Three rolling autosaves are created as you age.</p> :
      <div className="save-list" aria-label="Saved lives">{saves.map(s => <div className="save-row" key={s.key}>
        <div><strong>{s.name}</strong><div className="muted">Age {s.age} · {s.country} · generation {s.generation} · {new Date(s.savedAt).toLocaleString()}</div></div>
        <div className="save-actions"><button onClick={() => load(s.key)}>Load</button><button aria-label={confirmDelete===s.key?`Confirm deletion of ${s.name}`:`Delete ${s.name}`} onClick={() => remove(s.key)}>{confirmDelete===s.key?'Confirm deletion':'Delete'}</button></div>
      </div>)}</div>}
  </section>;
}
