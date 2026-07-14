import { useMemo, useState } from 'react';
import { COUNTRIES, COUNTRY_BY_ID, medianWage } from '../../engine/countries.js';
import { immigrationOptions, naturalizationStatus, ROUTE_LABELS, pppConversionFactor, ensureImmigration } from '../../engine/immigration.js';
import { applyForMigration, applyForCitizenship } from '../../engine/actions.js';
import { money, titleCase } from '../format.js';
import { naturalizationLanguageRequirement, primaryLanguages, workLanguageMultiplier } from '../../engine/language.js';

export default function Travel({ state, refresh }) {
  const ch = state.character;
  const im = ensureImmigration(ch);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(COUNTRIES.find(c => c.id !== ch.countryId)?.id || ch.countryId);
  const [notice, setNotice] = useState('');
  const current = COUNTRY_BY_ID[ch.countryId];
  const target = COUNTRY_BY_ID[selectedId] || COUNTRIES[0];
  const routes = immigrationOptions(ch, state, target);
  const naturalization = naturalizationStatus(ch);
  const countries = useMemo(() => {
    const q = query.toLowerCase();
    return COUNTRIES.filter(c => c.id !== ch.countryId && (c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
  }, [query, ch.countryId]);

  const apply = route => {
    const result = applyForMigration(state, target.id, route.id);
    setNotice(result.log || result.reason || 'Application could not be submitted.');
    if (result.immediate) setSelectedId(COUNTRIES.find(c => c.id !== target.id)?.id || target.id);
    refresh();
  };

  return <div className="grid cols-2">
    <div>
      <div className="panel">
        <h3>Immigration Status</h3>
        <div className="kv"><span className="k">Current country</span><span className="v">{ch.countryName}</span></div>
        <div className="kv"><span className="k">Status</span><span className="v">{titleCase(im.residence.status)}</span></div>
        <div className="kv"><span className="k">Citizenship(s)</span><span className="v">{im.citizenships.map(id=>COUNTRY_BY_ID[id]?.name).filter(Boolean).join(', ')}</span></div>
        {im.residence.status !== 'citizen' && <>
          <div className="kv"><span className="k">Qualifying residence</span><span className="v">{im.residence.years} year(s)</span></div>
          {im.residence.status === 'irregular' ? <div className="muted" style={{ color:'var(--bad)', marginTop:8 }}>You have no legal work status: only informal work is available, benefits are unavailable, and yearly deportation risk is 3–10% depending on local enforcement (higher after an overstay).</div> : <>
            {im.residence.visa && <div style={{margin:'8px 0',padding:'9px',border:'1px solid var(--border)'}}>
              <div className="kv"><span className="k">Temporary permission</span><span className="v">{ROUTE_LABELS[im.residence.visa.kind]}</span></div>
              <div className="kv"><span className="k">Time remaining</span><span className="v">{im.residence.visa.yearsRemaining} year(s)</span></div>
              <div className="kv"><span className="k">Work allowance</span><span className="v">{Math.round((im.residence.visa.maxWorkFraction||0)*40)} hours/week equivalent</span></div>
              {im.residence.visa.kind==='working_holiday'&&current.name==='Australia'&&<>
                <div className="kv"><span className="k">Specified regional work</span><span className="v">{im.residence.visa.regionalWorkMonths||0} month(s)</span></div>
                <div className="muted" style={{fontSize:11}}>Year 2 requires 3 months (88 days); year 3 requires 6 months during the second visa. Study is limited to four months per visa.</div>
              </>}
              <div className="muted" style={{fontSize:11}}>{im.residence.visa.countsForResidency===false?'Time on this temporary visa does not count toward naturalization.':'This visa time counts toward the modeled residence requirement.'}{im.residence.visa.employerTied?' Work permission becomes tied to the first hiring sector.':''}{im.residence.visa.temporaryJobsOnly?' Permanent jobs and promotions are unavailable.':''}</div>
            </div>}
            <div className="kv"><span className="k">Naturalization requirement</span><span className="v">{naturalization.required} years</span></div>
            <div className="kv"><span className="k">Time remaining</span><span className="v">{naturalization.remaining} years</span></div>
            {naturalization.languageRequired>0&&<div className="kv"><span className="k">Citizenship language</span><span className="v">{naturalization.language}: {Math.round(naturalization.languageLevel)}/{naturalization.languageRequired} required</span></div>}
            <button disabled={!naturalization.eligible} onClick={()=>{const ok=applyForCitizenship(state);setNotice(ok?`You became a citizen of ${ch.countryName}.`:'You are not eligible yet.');refresh();}}>Apply for citizenship</button>
            <div className="muted" style={{fontSize:11,marginTop:5}}>{naturalization.dualAllowed?'This country permits modeled dual citizenship.':'Naturalizing here replaces prior citizenship in the model.'}</div>
          </>}
        </>}
        <div className="kv"><span className="k">Languages</span><span className="v">{Object.entries(ch.languages||{}).map(([name,level])=>`${name} ${Math.round(level)}`).join(', ')||'Not recorded'}</span></div>
        {workLanguageMultiplier(ch,current)<1&&<div className="muted" style={{color:'var(--bad)',marginTop:8}}>Local-language proficiency currently reduces civilian wages by {Math.round((1-workLanguageMultiplier(ch,current))*100)}%. Use Language study in Activities.</div>}
        {im.pending && <div style={{marginTop:12,padding:'10px',border:'1px solid var(--accent)'}}><strong>Pending:</strong> {ROUTE_LABELS[im.pending.route]} — {COUNTRY_BY_ID[im.pending.targetId]?.name}. Resolves when you age a year.</div>}
        {notice && <div className="muted" style={{marginTop:10}}>{notice}</div>}
      </div>

      <div className="panel" style={{marginTop:12}}>
        <h3>Choose a Destination</h3>
        <input aria-label="Search destinations" placeholder="Search country or region…" value={query} onChange={e=>setQuery(e.target.value)} style={{width:'100%',marginBottom:8}} />
        <select aria-label="Destination country" value={selectedId} onChange={e=>setSelectedId(e.target.value)} style={{width:'100%'}}>
          {countries.map(c=><option key={c.id} value={c.id}>{c.name} — {c.region}</option>)}
        </select>
        <div style={{marginTop:12}}>
          <div className="kv"><span className="k">Destination income tier</span><span className="v">{target.incomeTier} / 4</span></div>
          <div className="kv"><span className="k">Typical wage</span><span className="v">{money(medianWage(target))}</span></div>
          <div className="kv"><span className="k">Naturalization</span><span className="v">{target.citizenship.naturalizationYears} years</span></div>
          <div className="kv"><span className="k">PPP conversion</span><span className="v">×{pppConversionFactor(current,target).toFixed(2)}</span></div>
          <div className="kv"><span className="k">Primary destination languages</span><span className="v">{primaryLanguages(target).map(lang=>`${lang} (${Math.round((ch.languages||{})[lang]||0)}/100)`).join(', ') || 'Not listed'}</span></div>
          {naturalizationLanguageRequirement(target).required>0&&<div className="muted" style={{fontSize:11}}>Modeled citizenship language threshold: {naturalizationLanguageRequirement(target).language} {naturalizationLanguageRequirement(target).required}/100.</div>}
        </div>
      </div>
    </div>

    <div className="panel">
      <h3>Entry Routes to {target.name}</h3>
      <p className="muted" style={{fontSize:12}}>Eligibility updates with your citizenship, education, family, finances, military status, and conflict exposure. Legal applications resolve after one year unless marked immediate.</p>
      {routes.map(route=><div key={route.id} style={{padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
        <div className="kv"><span className="k"><strong>{route.label}</strong><br/><span className="muted" style={{fontSize:11}}>{route.reason}</span></span><span className="v">{route.cost>0?money(route.cost):'No fee'}{route.immediate?' · immediate':route.wait?' · 1 year':''}</span></div>
        <button disabled={!route.eligible} onClick={()=>apply(route)}>{route.id==='irregular'?'Attempt dangerous route':route.immediate?'Move through this route':'Submit application'}</button>
      </div>)}
    </div>
  </div>;
}
