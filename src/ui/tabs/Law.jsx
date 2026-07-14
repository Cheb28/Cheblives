import { useState } from 'react';
import { COUNTRY_BY_ID } from '../../engine/countries.js';
import { eligibleBeneficiaries, inheritanceRules, settleEstate } from '../../engine/inheritance.js';
import { CRIMES, ensureJudicial, lawProfile } from '../../engine/judicial.js';
import { changeLegalName, clearWill, filePersonalBankruptcy, setPlannedCrime, setWillShare } from '../../engine/actions.js';
import { nameChangeProfile } from '../../engine/names.js';
import { money, titleCase } from '../format.js';

export default function Law({ state, refresh }) {
  const ch = state.character;
  const country = COUNTRY_BY_ID[ch.countryId];
  const rules = inheritanceRules(country);
  const estatePreview = settleEstate(ch, country);
  const profile = lawProfile(country);
  const judicial = ensureJudicial(ch);
  const beneficiaries = eligibleBeneficiaries(ch);
  const total = beneficiaries.reduce((sum, b) => sum + (Number(ch.will?.shares?.[b.id]) || 0), 0);
  const activeRecords = judicial.records.filter(r => !r.overturned && r.expiresAge > ch.age);
  const unavailable = ch.age < 14 || judicial.status === 'prison' || !!judicial.activeCase;
  const [legalName,setLegalName]=useState(ch.identity?.currentLegalName||ch.name||'');
  const [identityMessage,setIdentityMessage]=useState('');
  const changeProfile=nameChangeProfile(country,ch);
  const bankruptcyDebt=(ch.debts?.business||0)+(ch.debts?.personalLoan||0)+(ch.debts?.creditCard||0)+(ch.debts?.tax||0);
  const canFileBankruptcy=ch.age>=18&&bankruptcyDebt>=country.gdpPerCapita*.25&&!judicial.activeCase;

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h3>Justice System</h3>
        <div className="kv"><span className="k">Rule of law</span><span className="v">{titleCase(profile.tier)}</span></div>
        <div className="kv"><span className="k">Trial fairness</span><span className="v">{profile.trialFairness}</span></div>
        <div className="kv"><span className="k">Public defence</span><span className="v">{profile.publicDefender}</span></div>
        <div className="kv"><span className="k">Corruption</span><span className="v">{profile.corruption}</span></div>
        <div className="kv"><span className="k">Police recovery</span><span className="v">~{Math.round(profile.policeRecovery * 100)}%</span></div>
      </div>

      <div className="panel">
        <h3>Your Legal Status</h3>
        <div className="kv"><span className="k">Status</span><span className="v">{titleCase(judicial.status.replaceAll('_', ' '))}</span></div>
        {judicial.activeCase && <div className="kv"><span className="k">Active case</span><span className="v">{judicial.activeCase.label || titleCase(judicial.activeCase.civilKind)}</span></div>}
        {judicial.prison && <>
          <div className="kv"><span className="k">Sentence remaining</span><span className="v">{judicial.prison.remaining} year(s)</span></div>
          <div className="kv"><span className="k">Parole eligibility</span><span className="v">after {judicial.prison.paroleEligibleAfter} served</span></div>
        </>}
        <div className="kv"><span className="k">Active records</span><span className="v">{activeRecords.length}</span></div>
        <div className="kv"><span className="k">Outstanding court debt</span><span className="v">{money(judicial.finesOwed || 0)}</span></div>
        <div className="kv"><span className="k">Bankruptcy-eligible debt</span><span className="v">{money(bankruptcyDebt)}</span></div>
        <button disabled={!canFileBankruptcy||judicial.bankruptcyDue>0} onClick={()=>{filePersonalBankruptcy(state);refresh();}}>{judicial.bankruptcyDue>0?'Bankruptcy filing queued':'File for personal bankruptcy'}</button>
        <div className="muted" style={{fontSize:11}}>A filing becomes a civil-law decision next year. The court may discharge consumer, business, and tax debt according to the local legal system; fees and consequences still apply.</div>
        {(judicial.barredUntilAge || 0) > ch.age && <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Most legal immigration and naturalization routes are restricted until age {judicial.barredUntilAge}.
        </div>}
        {activeRecords.map(r => <div className="world-item" key={r.caseId} style={{ marginTop: 8 }}>
          <span className="nm">{r.offence}</span><span className="rg">expires at age {r.expiresAge}</span>
        </div>)}
      </div>

      <div className="panel">
        <h3>Civil and Legal Identity</h3>
        <div className="kv"><span className="k">Birth name</span><span className="v">{ch.identity?.birthName}</span></div>
        <div className="kv"><span className="k">Current legal name</span><span className="v">{ch.identity?.currentLegalName}</span></div>
        <div className="field"><label htmlFor="legal-name">Apply for a legal name change</label><input id="legal-name" maxLength="60" value={legalName} onChange={e=>setLegalName(e.target.value)}/><button disabled={!changeProfile.available} onClick={()=>{const result=changeLegalName(state,legalName);setIdentityMessage(result.message);refresh();}}>Submit application · {money(changeProfile.cost)}</button></div>
        <div className="muted" style={{fontSize:12}}>{changeProfile.label}. {changeProfile.note}</div>
        {(ch.identity?.previousNames||[]).map((x,i)=><div className="kv" key={`${x.age}-${i}`}><span className="k">Previous name · age {x.age}</span><span className="v">{x.name} ({x.reason})</span></div>)}
        {identityMessage&&<div className="notice" role="status">{identityMessage}</div>}
      </div>

      <div className="panel">
        <h3>Deliberate Crime</h3>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Plan one illegal act for the coming year. Strong-law countries detect more crime; weak-law courts are less predictable and may permit bribery.
        </div>
        {Object.entries(CRIMES).map(([id, crime]) => <button type="button" className="world-item crime-choice" key={id}
          disabled={unavailable}
          onClick={() => { setPlannedCrime(state, judicial.plannedCrime === id ? null : id); refresh(); }}
          style={{ opacity: unavailable ? 0.45 : judicial.plannedCrime === id ? 1 : 0.82 }}>
          <span className="nm">{crime.label}{judicial.plannedCrime === id ? ' ✓ planned' : ''}</span>
          <span className="rg">possible proceeds: ~{money(crime.payout * country.gdpPerCapita * 0.55)}</span>
        </button>)}
        {unavailable && <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>Crime planning is unavailable while underage, imprisoned, or already before a court.</div>}
      </div>

      <div className="panel">
        <h3>Inheritance Law</h3>
        <div className="kv"><span className="k">Succession system</span><span className="v">{rules.label}</span></div>
        <div className="kv"><span className="k">Inheritance tax</span><span className="v">{Math.round(rules.taxRate * 100)}%</span></div>
        <div className="kv"><span className="k">Estate exemption</span><span className="v">{money(rules.exemption)}</span></div>
        <div className="kv"><span className="k">Gift-tax rate</span><span className="v">{Math.round(rules.giftTaxRate*100)}%</span></div>
        <div className="kv"><span className="k">Surviving spouse exemption</span><span className="v">{rules.spouseExempt?'Modeled':'Not automatic'}</span></div>
        <div className="kv"><span className="k">Protected spouse minimum</span><span className="v">{Math.round((rules.spouseMinimum||0)*100)}%</span></div>
        <div className="kv"><span className="k">Protected family share</span><span className="v">{Math.round(rules.protectedFamilyShare * 100)}%</span></div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{rules.note}</div>
      </div>

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <h3>Your Will</h3>
        {beneficiaries.length === 0 ? <div className="muted">No eligible family beneficiary is currently modeled.</div> : <>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Enter percentage weights for the nearest eligible family class. Living children prevent gifts to more distant relatives; grandchildren and extended relatives become eligible only when closer descendants do not exist. A spouse may retain a legally required share.
          </div>
          {beneficiaries.map(b => <label className="kv" key={b.id} style={{ alignItems: 'center' }}>
            <span className="k">{b.label}</span>
            <span><input type="number" min="0" max="100" value={ch.will?.shares?.[b.id] || 0}
              onChange={e => { setWillShare(state, b.id, e.target.value); refresh(); }} style={{ width: 80 }} /> %</span>
          </label>)}
          <div className="kv" style={{ marginTop: 8 }}><span className="k">Entered total</span><span className="v">{total}%</span></div>
          <div className="kv"><span className="k">Family-dispute risk</span><span className="v">{Math.round(estatePreview.disputeRisk*100)}%{estatePreview.likelyDispute?' · high':''}</span></div>
          <div className="muted" style={{fontSize:11}}>Unequal shares, estrangement, and poor family relationships increase the likelihood of a challenge.</div>
          <button onClick={() => { clearWill(state); refresh(); }} style={{ marginTop: 12 }}>Use default equal split</button>
        </>}
      </div>
    </div>
  );
}
