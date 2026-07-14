import { deserialize, serialize } from './game.js';

export const SAVE_SCHEMA_VERSION = 1;
const PREFIX = 'chebs-human-atlas.save.';
const SETTINGS_KEY='chebs-human-atlas.settings';
const AUTOS = 3;
export const AUTOSAVE_INTERVALS=[0,1,5,10];

function storage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

function safeName(name) {
  return String(name || 'Manual save').trim().slice(0, 40) || 'Manual save';
}

export function saveEnvelope(state, name = "Cheb's Human Atlas save") {
  return {
    app: "Cheb's Human Atlas", schemaVersion: SAVE_SCHEMA_VERSION, savedAt: new Date().toISOString(),
    name: safeName(name), payload: serialize(state),
  };
}

export function validateSave(value) {
  if (!value || typeof value !== 'object') throw new Error("The file is not a Cheb's Human Atlas save.");
  // Accept valid exported envelopes from earlier project names; newly written saves
  // always use the current brand and storage prefix.
  if (typeof value.app !== 'string' || !value.app || !value.payload) throw new Error('The save header is missing or invalid.');
  if (value.schemaVersion > SAVE_SCHEMA_VERSION) throw new Error("This save was created by a newer version of Cheb's Human Atlas.");
  const p = value.payload;
  if (!Number.isFinite(p.seed) || !Number.isFinite(p.rngState) || !p.character || !Array.isArray(p.log)) {
    throw new Error('The save is incomplete or damaged.');
  }
  if (!Number.isFinite(p.character.age) || !p.character.countryId || !p.character.stats) {
    throw new Error('The character record is incomplete.');
  }
  return value;
}

export function parseSave(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
  return validateSave(value);
}

export function restoreEnvelope(envelope) {
  const valid = validateSave(envelope);
  return deserialize(structuredClone(valid.payload));
}

function write(key, envelope) {
  const s = storage();
  if (!s) throw new Error('Browser storage is unavailable. Use JSON export instead.');
  s.setItem(PREFIX + key, JSON.stringify(envelope));
}

function read(key) {
  const raw = storage()?.getItem(PREFIX + key);
  if (!raw) return null;
  try { return validateSave(JSON.parse(raw)); } catch { return null; }
}

export function getSaveSettings(){
  try{const value=JSON.parse(storage()?.getItem(SETTINGS_KEY)||'{}');return{autosaveInterval:AUTOSAVE_INTERVALS.includes(value.autosaveInterval)?value.autosaveInterval:1};}
  catch{return{autosaveInterval:1};}
}

export function setAutosaveInterval(interval){
  const value=Number(interval),autosaveInterval=AUTOSAVE_INTERVALS.includes(value)?value:1;
  const s=storage();if(!s)throw new Error('Browser storage is unavailable.');
  s.setItem(SETTINGS_KEY,JSON.stringify({autosaveInterval}));return autosaveInterval;
}

export function autosave(state,{force=false}={}) {
  const s = storage();
  if (!s) return false;
  const interval=getSaveSettings().autosaveInterval;
  if(!force&&(interval===0||state.character.age%interval!==0))return false;
  for (let i = AUTOS - 1; i > 0; i--) {
    const previous = s.getItem(PREFIX + `auto.${i - 1}`);
    if (previous) s.setItem(PREFIX + `auto.${i}`, previous);
  }
  write('auto.0', saveEnvelope(state, `Autosave · age ${state.character.age}`));
  return true;
}

export function saveManual(state, name) {
  const label = safeName(name);
  const id = encodeURIComponent(label.toLowerCase());
  write(`manual.${id}`, saveEnvelope(state, label));
  return label;
}

export function listSaves() {
  const s = storage();
  if (!s) return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const shortKey = key.slice(PREFIX.length), envelope = read(shortKey);
    if (!envelope) continue;
    const p = envelope.payload;
    out.push({ key: shortKey, name: envelope.name, savedAt: envelope.savedAt, age: p.character.age,
      country:p.character.countryName,generation:p.generation||1,successionNumber:p.successionNumber||p.generation||1,auto:shortKey.startsWith('auto.') });
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function loadSave(key) {
  const envelope = read(key);
  if (!envelope) throw new Error('That save is missing or damaged.');
  return restoreEnvelope(envelope);
}

export function deleteSave(key) { storage()?.removeItem(PREFIX + key); }

export function exportSaveText(state, name) { return JSON.stringify(saveEnvelope(state, name), null, 2); }
