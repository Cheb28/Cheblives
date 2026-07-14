import { useState } from 'react';
import Country from './Country.jsx';
import World from './World.jsx';
import Travel from './Travel.jsx';
import Mobility from './Mobility.jsx';

const TABS=[['current','Current Country'],['world','Compare Countries'],['travel','Travel & Migration'],['mobility','Transportation & Utilities'],['documents','Travel Documents']];
export default function Places({state,refresh}){
  const [section,setSection]=useState('current');
  return <div><div className="section-tabs" role="tablist" aria-label="Places sections">{TABS.map(([id,label])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>)}</div>{section==='current'&&<Country state={state}/>} {section==='world'&&<World/>} {section==='travel'&&<Travel state={state} refresh={refresh}/>} {section==='mobility'&&<Mobility state={state} refresh={refresh}/>} {section==='documents'&&<Mobility state={state} refresh={refresh} documentsOnly/>}</div>;
}
