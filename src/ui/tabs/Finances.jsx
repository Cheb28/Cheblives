import { useState } from 'react';
import { COUNTRY_BY_ID, medianWage } from '../../engine/countries.js';
import { netWorth } from '../../engine/advance.js';
import { INVESTMENTS, investmentValue } from '../../engine/investments.js';
import { buyInvestment, sellInvestment, buyHome, requestSocialHousing, setHousingTenure } from '../../engine/actions.js';
import { money } from '../format.js';
import { annualHousingCost, canApplyForSocialHousing, homePrice as localHomePrice, housingLabel, housingProfile } from '../../engine/housing.js';
import { welfareProfile } from '../../engine/welfare.js';

function Sparkline({ data }) {
  if (!data || data.length < 2) return <div className="muted" style={{ fontSize: 12 }}>No history yet.</div>;
  const w = 300, h = 50, min = Math.min(...data, 0), max = Math.max(...data, 1), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" /></svg>;
}

export default function Finances({ state, refresh }) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId], st = ch.lastStatement;
  const [amount, setAmount] = useState(Math.round(medianWage(country) * 0.1));
  const homePrice = localHomePrice(country, ch);
  const homeDue = country.incomeTier >= 3 ? homePrice * 0.2 : homePrice;
  const transact = fn => { fn(); refresh(); };

  return <div className="grid cols-2">
    <div>
      <div className="panel">
        <h3>Accounts & Household</h3>
        <div className="kv"><span className="k">Personal cash</span><span className="v">{money(ch.money.cash)}</span></div>
        <div className="kv"><span className="k">Personal savings</span><span className="v">{money(ch.money.bank)}</span></div>
        <div className="kv"><span className="k">Household fund</span><span className="v">{money(ch.money.household || 0)}</span></div>
        <div className="kv"><span className="k">Investments</span><span className="v">{money(investmentValue(ch))}</span></div>
        {ch.ownsHome && <div className="kv"><span className="k">Home value</span><span className="v">{money(ch.homeValue)}</span></div>}
        {Object.entries(ch.debts || {}).filter(([, v]) => v > 0).map(([key, v]) => <div className="kv" key={key}><span className="k">{key === 'studentLoan' ? 'Student loan' : key === 'mortgage' ? 'Mortgage' : 'Business debt'}</span><span className="v" style={{ color: 'var(--bad)' }}>−{money(v)}</span></div>)}
        <div className="kv" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 8 }}><strong>Net worth</strong><span className="v big-num">{money(netWorth(ch))}</span></div>
        <div style={{ marginTop: 14 }}><div className="muted" style={{ fontSize: 12 }}>Net worth over time</div><Sparkline data={ch.netWorthHistory} /></div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Family Economy</h3>
        <div className="kv"><span className="k">Family members employed</span><span className="v">{ch.householdFinance?.employed||0}</span></div>
        <div className="kv"><span className="k">Family earnings paid into household</span><span className="v">{money(ch.householdFinance?.familyGrossIncome||0)}</span></div>
        <div className="kv"><span className="k">Family medical costs</span><span className="v">−{money(ch.householdFinance?.medicalSpend||0)}</span></div>
        <div className="kv"><span className="k">Unmet family care needs</span><span className="v">{ch.householdFinance?.unmetCare||0}</span></div>
        <div className="kv"><span className="k">Family members' separate savings</span><span className="v">{money(ch.householdFinance?.totalFamilySavings||0)}</span></div>
        {ch.familyOriginFinance?.settled&&<><div className="kv"><span className="k">Family-of-origin fund retained by parents</span><span className="v">{money(ch.familyOriginFinance.retainedFund||0)}</span></div><div className="kv"><span className="k">Adult-life starting gift received</span><span className="v">{money(ch.familyOriginFinance.launchGift||0)}</span></div></>}
        <p className="muted" style={{fontSize:11}}>The annual statement lists each contributing family member and household-paid medical bill separately.</p>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Investments</h3>
        <label className="muted" style={{ fontSize: 12 }}>Transaction amount <input type="number" min="1" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{ width: 110, marginLeft: 8 }} /></label>
        {Object.entries(INVESTMENTS).map(([id, d]) => {
          const allowed = d.gate(country, ch), held = ch.investments?.[id] || 0;
          return <div key={id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="kv"><span className="k"><strong>{d.label}</strong><br /><span className="muted" style={{ fontSize: 11 }}>Typical return {Math.round(d.mean * 100)}%, risk {Math.round(d.sd * 100)}%{d.locked ? '; locked until 65' : ''}</span></span><span className="v">{money(held)}</span></div>
            <button disabled={!allowed || amount <= 0 || ch.money.bank < amount} onClick={() => transact(() => buyInvestment(state, id, amount))}>Buy</button>{' '}
            <button disabled={held <= 0 || (d.locked && ch.age < 65)} onClick={() => transact(() => sellInvestment(state, id, Math.min(amount, held)))}>Sell</button>
            {!allowed && <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>Unavailable in your current market/wealth level</span>}
          </div>;
        })}
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Housing</h3>
        <div className="kv"><span className="k">Current tenure</span><span className="v">{housingLabel(ch)}</span></div>
        {!ch.ownsHome && <div className="kv"><span className="k">Annual housing cost</span><span className="v">{money(annualHousingCost(country, ch))}</span></div>}
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: '8px 0' }}>{housingProfile(country).note}</div>
        {ch.housing?.tenure === 'parents' && ch.age >= 18 && <div className="muted" style={{ fontSize: 12 }}>Annual board is {Math.round((ch.housing.parentContributionRate || 0) * 100)}% of a local median wage. The rest of your earnings stays personal.</div>}
        {ch.housing?.application && <div className="tag" style={{ margin: '9px 0' }}>Social-housing wait: {ch.housing.application.waitingYears} year(s)</div>}
        {!ch.ownsHome && <div style={{ display:'flex', gap:7, flexWrap:'wrap', margin:'10px 0' }}>
          <button disabled={!canApplyForSocialHousing(ch,country)} onClick={() => transact(() => requestSocialHousing(state))}>Apply for social housing</button>
          <button disabled={ch.housing?.tenure==='private'||ch.age<18} onClick={() => transact(() => setHousingTenure(state,'private'))}>Rent privately</button>
          <button disabled={ch.housing?.tenure==='parents'||ch.age<18} onClick={() => transact(() => setHousingTenure(state,'parents'))}>Live with parents</button>
        </div>}
        {ch.ownsHome ? <><div className="kv"><span className="k">Current value</span><span className="v">{money(ch.homeValue)}</span></div><p className="muted" style={{ fontSize: 12 }}>Your home replaces rent, appreciates about 2% yearly, and mortgage principal is paid from the household fund.</p></> : <><div className="kv"><span className="k">Local home price</span><span className="v">{money(homePrice)}</span></div><div className="kv"><span className="k">Required now</span><span className="v">{money(homeDue)} {country.incomeTier >= 3 ? '(20% down)' : '(cash purchase)'}</span></div><button disabled={ch.age < 18 || ch.money.bank < homeDue} onClick={() => transact(() => buyHome(state))}>Buy home</button></>}
        <div className="muted" style={{fontSize:11,marginTop:10}}>Safety net: {welfareProfile(country).model}. Housing support is separately eligibility-tested.</div>
      </div>
    </div>

    <div className="panel">
      <h3>Last Year's Financial Statement {st ? `(age ${st.age})` : ''}</h3>
      {!st ? <div className="muted">No statement yet — advance a year.</div> : <>
        {st.income.length > 0 && <div className="muted" style={{ fontSize: 12 }}>INCOME</div>}
        {st.income.map((l, i) => <div className="kv" key={'i' + i}><span className="k">{l.label}{l.household ? ' · household' : ''}</span><span className="v" style={{ color: l.amount < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(l.amount)}</span></div>)}
        {st.tax.total > 0 && <><div className="muted" style={{ fontSize: 12, marginTop: 10 }}>TAXES APPLIED</div>
          <div className="kv"><span className="k">Personal income tax</span><span className="v">−{money(st.tax.personalIncomeTax || 0)}</span></div>
          <div className="kv"><span className="k">Household income tax</span><span className="v">−{money(st.tax.householdIncomeTax || 0)}</span></div>
          <div className="kv"><span className="k">Personal social contributions</span><span className="v">−{money(st.tax.personalSocialContrib || 0)}</span></div>
          <div className="kv"><span className="k">Household social contributions</span><span className="v">−{money(st.tax.householdSocialContrib || 0)}</span></div></>}
        {st.expenses.length > 0 && <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>EXPENSES</div>}
        {st.expenses.map((l, i) => <div className="kv" key={'e' + i}><span className="k">{l.label}{l.household ? ' · household' : ''}</span><span className="v" style={{ color: l.amount < 0 ? 'var(--good)' : 'var(--bad)' }}>{l.amount >= 0 ? '−' : '+'}{money(Math.abs(l.amount))}</span></div>)}
        {st.assetChanges?.length > 0 && <><div className="muted" style={{ fontSize: 12, marginTop: 10 }}>ASSET VALUE CHANGES (NON-CASH)</div>{st.assetChanges.map((l, i) => <div className="kv" key={'a' + i}><span>{l.label}</span><span style={{ color: l.amount >= 0 ? 'var(--good)' : 'var(--bad)' }}>{l.amount >= 0 ? '+' : ''}{money(l.amount)}</span></div>)}</>}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8 }}>
          <div className="kv"><strong>Household income</strong><span>{money(st.household?.income || 0)}</span></div>
          <div className="kv"><strong>Household expenses</strong><span>−{money(st.household?.expenses || 0)}</span></div>
          <div className="kv"><strong>Household taxes</strong><span>−{money(st.household?.taxes || 0)}</span></div>
          <div className="kv"><strong>Household net</strong><span style={{ color: (st.household?.net || 0) >= 0 ? 'var(--good)' : 'var(--bad)' }}>{money(st.household?.net || 0)}</span></div>
          <div className="kv"><strong>Total net this year</strong><span style={{ color: st.net >= 0 ? 'var(--good)' : 'var(--bad)' }}>{st.net >= 0 ? '+' : ''}{money(st.net)}</span></div>
        </div>
      </>}
    </div>
  </div>;
}
