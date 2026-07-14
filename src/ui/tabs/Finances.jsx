import { useState } from 'react';
import { COUNTRY_BY_ID, medianWage } from '../../engine/countries.js';
import { netWorth } from '../../engine/advance.js';
import { INVESTMENTS, investmentValue } from '../../engine/investments.js';
import { applyCreditCard, applyPersonalLoan, buyInvestment, sellInvestment, buyHome, payConsumerDebt, proposeHouseholdBudget, remitToFamily, requestSocialHousing, setHousingTenure, transferAccountFunds, updateFinancialGoal, updateTaxCompliance, updateTaxFilingChoice, useCreditCard } from '../../engine/actions.js';
import { money } from '../format.js';
import { annualHousingCost, canApplyForSocialHousing, homePrice as localHomePrice, housingLabel, housingProfile } from '../../engine/housing.js';
import { welfareProfile } from '../../engine/welfare.js';
import { bankProfile, BUDGET_MODES, budgetRates, ensureFinancialState, financialGoalProgress, formatLocal, taxProfile } from '../../engine/financialSystems.js';
import { displayName } from '../../engine/names.js';

function Sparkline({ data }) {
  if (!data || data.length < 2) return <div className="muted" style={{ fontSize: 12 }}>No history yet.</div>;
  const w = 300, h = 50, min = Math.min(...data, 0), max = Math.max(...data, 1), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" /></svg>;
}

export default function Finances({ state, refresh }) {
  const ch = state.character, country = COUNTRY_BY_ID[ch.countryId], st = ch.lastStatement;
  const [amount, setAmount] = useState(Math.round(medianWage(country) * 0.1));
  const [transferAmount,setTransferAmount]=useState(Math.round(medianWage(country)*.05));
  const [budgetMode,setBudgetMode]=useState(ch.householdBudget?.mode||'proportional');
  const [playerRate,setPlayerRate]=useState(Math.round((budgetRates(ch).playerRate||.5)*100));
  const [spouseRate,setSpouseRate]=useState(Math.round((budgetRates(ch).spouseRate||.5)*100));
  const [remitPerson,setRemitPerson]=useState((ch.family||[]).find(p=>p.alive)?.id||'');
  const financial=ensureFinancialState(ch,country),bank=bankProfile(country),taxModel=taxProfile(country);
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
        {Object.entries(ch.debts || {}).filter(([, v]) => v > 0).map(([key, v]) => {
          const labels={studentLoan:'Student loan',mortgage:'Mortgage',business:'Business debt',personalLoan:'Personal loan',creditCard:'Credit card',tax:'Tax balance'};
          return <div className="kv" key={key}><span className="k">{labels[key]||'Other debt'}</span><span className="v" style={{ color: 'var(--bad)' }}>−{money(v)}</span></div>;
        })}
        <div className="kv" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 8 }}><strong>Net worth</strong><span className="v big-num">{money(netWorth(ch))}</span></div>
        <div style={{ marginTop: 14 }}><div className="muted" style={{ fontSize: 12 }}>Net worth over time</div><Sparkline data={ch.netWorthHistory} /></div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Currency & Banking</h3>
        <div className="kv"><span className="k">Local currency</span><span className="v">{country.currency}</span></div>
        <div className="kv"><span className="k">Annual exchange rate</span><span className="v">1 PPP dollar = {financial.exchangeRate.toFixed(financial.exchangeRate<10?2:0)} {financial.currencyCode}</span></div>
        <div className="kv"><span className="k">Personal savings locally</span><span className="v">{formatLocal(country,ch,ch.money.bank)}</span></div>
        <div className="kv"><span className="k">Household fund locally</span><span className="v">{formatLocal(country,ch,ch.money.household||0)}</span></div>
        <div className="kv"><span className="k">Savings interest</span><span className="v">{(bank.nominalRate*100).toFixed(1)}% nominal · {(bank.realRate*100).toFixed(1)}% after inflation</span></div>
        <label className="kv"><span>Transfer amount</span><input aria-label="Account transfer amount" type="number" min="1" value={transferAmount} onChange={e=>setTransferAmount(Number(e.target.value))} style={{width:120}}/></label>
        <div className="button-row"><button disabled={ch.money.bank<transferAmount} onClick={()=>transact(()=>transferAccountFunds(state,'personal_to_household',transferAmount))}>Personal → household</button><button disabled={(ch.money.household||0)<transferAmount} onClick={()=>transact(()=>transferAccountFunds(state,'household_to_personal',transferAmount))}>Household → personal</button></div>
        <p className="muted" style={{fontSize:11}}>PPP values preserve game balance; local currency uses the annual modeled rate. Migration and remittances apply an exchange fee.</p>
      </div>

      {ch.spouse?.alive&&<div className="panel" style={{marginTop:12}}>
        <h3>Spousal Budget</h3>
        <div className="kv"><span>Spouse personal savings</span><span>{money(ch.spouse.finances?.personalSavings||0)}</span></div>
        <div className="kv"><span>Current arrangement</span><span>{BUDGET_MODES[ch.householdBudget?.mode]?.label}</span></div>
        <div className="kv"><span>Your annual contribution</span><span>{Math.round(budgetRates(ch).playerRate*100)}%</span></div>
        <div className="kv"><span>Spouse annual contribution</span><span>{Math.round(budgetRates(ch).spouseRate*100)}%</span></div>
        <label className="kv"><span>Propose arrangement</span><select value={budgetMode} onChange={e=>setBudgetMode(e.target.value)}>{Object.entries(BUDGET_MODES).map(([id,x])=><option key={id} value={id}>{x.label}</option>)}</select></label>
        {budgetMode==='custom'&&<><label className="kv"><span>Your contribution</span><input type="number" min="0" max="100" value={playerRate} onChange={e=>setPlayerRate(Number(e.target.value))} style={{width:80}}/>%</label><label className="kv"><span>Spouse contribution</span><input type="number" min="0" max="100" value={spouseRate} onChange={e=>setSpouseRate(Number(e.target.value))} style={{width:80}}/>%</label></>}
        <button disabled={!!ch.householdBudget?.pending} onClick={()=>transact(()=>proposeHouseholdBudget(state,budgetMode,playerRate/100,spouseRate/100))}>{ch.householdBudget?.pending?'Negotiation pending':'Negotiate change'}</button>
        <p className="muted" style={{fontSize:11}}>Your spouse keeps a personal account. A proposed change resolves next year according to the relationship and broad cultural context; the Religion phase will deepen those influences.</p>
      </div>}

      <div className="panel" style={{marginTop:12}}>
        <h3>Credit, Loans & Goals</h3>
        <div className="kv"><span>Personal loan</span><span>{money(financial.personalLoan.balance)} · {(financial.personalLoan.rate*100).toFixed(1)}%</span></div>
        <div className="button-row"><button disabled={financial.personalLoan.balance>0||ch.age<18} onClick={()=>transact(()=>applyPersonalLoan(state))}>Apply for personal loan</button><button disabled={!financial.personalLoan.balance||ch.money.bank<=0} onClick={()=>transact(()=>payConsumerDebt(state,'personalLoan',transferAmount))}>Repay loan</button></div>
        <div className="kv"><span>Credit card</span><span>{financial.creditCard.open?`${money(financial.creditCard.balance)} / ${money(financial.creditCard.limit)} · ${(financial.creditCard.rate*100).toFixed(1)}%`:'Not open'}</span></div>
        <div className="button-row"><button disabled={financial.creditCard.open||ch.age<18} onClick={()=>transact(()=>applyCreditCard(state))}>Open credit card</button><button disabled={!financial.creditCard.open||financial.creditCard.balance+transferAmount>financial.creditCard.limit} onClick={()=>transact(()=>useCreditCard(state,transferAmount))}>Borrow on card</button><button disabled={!financial.creditCard.balance||ch.money.bank<=0} onClick={()=>transact(()=>payConsumerDebt(state,'creditCard',transferAmount))}>Repay card</button></div>
        {['emergency','housing','retirement'].map(key=>{const g=financialGoalProgress(ch,country,key);return <div className="subcard" key={key}><label className="kv"><span>{key[0].toUpperCase()+key.slice(1)} goal</span><input type="number" min="0" value={Math.round(g.target)} onChange={e=>{updateFinancialGoal(state,key,e.target.value);refresh();}} style={{width:120}}/></label><div className="muted">{money(g.held)} saved · {Math.round(g.pct)}%</div></div>})}
      </div>

      <div className="panel" style={{marginTop:12}}>
        <h3>Family Remittances</h3>
        <select aria-label="Remittance recipient" value={remitPerson} onChange={e=>setRemitPerson(e.target.value)} style={{width:'100%'}}>{[...(ch.family||[]),...(ch.spouse?[ch.spouse]:[])].filter(p=>p.alive).map(p=><option key={p.id} value={p.id}>{displayName(p)} · {p.relation}</option>)}</select>
        <button style={{marginTop:8}} disabled={!remitPerson||ch.money.bank<transferAmount} onClick={()=>transact(()=>remitToFamily(state,remitPerson,transferAmount))}>Send {money(transferAmount)} plus exchange fee</button>
        {(financial.remittances||[]).slice(-3).reverse().map((x,i)=><div className="kv" key={`${x.age}-${i}`}><span>Age {x.age} · {x.to}</span><span>{money(x.amount)} + {money(x.fee)} fee</span></div>)}
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

    <div>
    <div className="panel">
      <h3>Tax Profile</h3>
      <div className="kv"><span>Income-tax system</span><span>{taxModel.system==='none'?'No personal income tax':taxModel.system==='flat'?'Flat income tax':'Progressive income tax'}</span></div>
      <div className="kv"><span>Spouse filing</span><span>{taxModel.filing}</span></div>
      {taxModel.filing==='joint optional'&&ch.spouse?.alive&&<label className="kv"><span>Filing choice</span><select value={financial.tax.filingChoice} onChange={e=>transact(()=>updateTaxFilingChoice(state,e.target.value))}><option value="auto">Automatic (joint)</option><option value="joint">Joint return</option><option value="individual">Separate returns</option></select></label>}
      <div className="kv"><span>Consumption tax</span><span>{Math.round(taxModel.consumptionRate*100)}%</span></div>
      <div className="kv"><span>Investment-gain tax</span><span>{Math.round(taxModel.capitalGainsRate*100)}%</span></div>
      <div className="kv"><span>Retirement-withdrawal tax</span><span>{Math.round(taxModel.pensionWithdrawalRate*100)}%</span></div>
      <label className="kv"><span>Tax reporting</span><select value={financial.tax.compliance} onChange={e=>transact(()=>updateTaxCompliance(state,e.target.value))}><option value="honest">Report honestly</option><option value="underreport">Underreport income</option></select></label>
      <p className="muted" style={{fontSize:11}}>Underreporting may reduce the current bill, but creates audit, penalty, criminal-case, and tax-debt risk. Tax rules are simplified simulation data.</p>
    </div>

    <div className="panel" style={{marginTop:12}}>
      <h3>Last Year's Financial Statement {st ? `(age ${st.age})` : ''}</h3>
      {!st ? <div className="muted">No statement yet — advance a year.</div> : <>
        {st.income.length > 0 && <div className="muted" style={{ fontSize: 12 }}>INCOME</div>}
        {st.income.map((l, i) => <div className="kv" key={'i' + i}><span className="k">{l.label}{l.household ? ' · household' : ''}</span><span className="v" style={{ color: l.amount < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(l.amount)}</span></div>)}
        {st.tax.total > 0 && <><div className="muted" style={{ fontSize: 12, marginTop: 10 }}>TAXES APPLIED</div>
          <div className="kv"><span className="k">Personal income tax</span><span className="v">−{money(st.tax.personalIncomeTax || 0)}</span></div>
          <div className="kv"><span className="k">Household income tax</span><span className="v">−{money(st.tax.householdIncomeTax || 0)}</span></div>
          <div className="kv"><span className="k">Personal social contributions</span><span className="v">−{money(st.tax.personalSocialContrib || 0)}</span></div>
          <div className="kv"><span className="k">Household social contributions</span><span className="v">−{money(st.tax.householdSocialContrib || 0)}</span></div>
          <div className="kv"><span className="k">Investment taxes</span><span className="v">−{money(st.tax.investmentTax || 0)}</span></div>
          <div className="kv"><span className="k">Retirement taxes</span><span className="v">−{money(st.tax.pensionTax || 0)}</span></div>
          <div className="kv"><span className="k">Gift taxes</span><span className="v">−{money(st.tax.giftTax || 0)}</span></div>
          <div className="kv"><span className="k">Consumption taxes</span><span className="v">−{money(st.tax.consumptionTax || 0)}</span></div>
          <div className="kv"><span className="k">Marginal / effective rate</span><span className="v">{Math.round((st.tax.marginalRate||0)*100)}% / {Math.round((st.tax.effectiveRate||0)*100)}%</span></div>
          <div className="kv"><span className="k">Filing basis</span><span className="v">{st.tax.filing||'individual'} · {st.tax.system||'progressive'}</span></div>
          {(st.tax.refund||0)>0&&<div className="kv"><span className="k">Tax refund</span><span className="v" style={{color:'var(--good)'}}>+{money(st.tax.refund)}</span></div>}
          {(st.tax.balanceDue||0)>0&&<div className="kv"><span className="k">Balance owed at filing</span><span className="v" style={{color:'var(--bad)'}}>−{money(st.tax.balanceDue)}</span></div>}
          {(st.tax.evaded||0)>0&&<div className="kv"><span className="k">Income not reported</span><span className="v" style={{color:'var(--bad)'}}>{money(st.tax.evaded)}</span></div>}</>}
        {st.expenses.length > 0 && <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>EXPENSES</div>}
        {st.expenses.map((l, i) => <div className="kv" key={'e' + i}><span className="k">{l.label}{l.household ? ' · household' : ''}</span><span className="v" style={{ color: l.amount < 0 ? 'var(--good)' : 'var(--bad)' }}>{l.amount >= 0 ? '−' : '+'}{money(Math.abs(l.amount))}</span></div>)}
        {st.assetChanges?.length > 0 && <><div className="muted" style={{ fontSize: 12, marginTop: 10 }}>ASSET VALUE CHANGES (NON-CASH)</div>{st.assetChanges.map((l, i) => <div className="kv" key={'a' + i}><span>{l.label}</span><span style={{ color: l.amount >= 0 ? 'var(--good)' : 'var(--bad)' }}>{l.amount >= 0 ? '+' : ''}{money(l.amount)}</span></div>)}</>}
        {st.transfers?.length > 0&&<><div className="muted" style={{fontSize:12,marginTop:10}}>ACCOUNT TRANSFERS (NOT SPENDING)</div>{st.transfers.map((l,i)=><div className="kv" key={'t'+i}><span>{l.label}</span><span>{money(l.amount)}</span></div>)}</>}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8 }}>
          <div className="kv"><strong>Household income</strong><span>{money(st.household?.income || 0)}</span></div>
          <div className="kv"><strong>Household expenses</strong><span>−{money(st.household?.expenses || 0)}</span></div>
          <div className="kv"><strong>Household taxes</strong><span>−{money(st.household?.taxes || 0)}</span></div>
          <div className="kv"><strong>Household net</strong><span style={{ color: (st.household?.net || 0) >= 0 ? 'var(--good)' : 'var(--bad)' }}>{money(st.household?.net || 0)}</span></div>
          <div className="kv"><strong>Total net this year</strong><span style={{ color: st.net >= 0 ? 'var(--good)' : 'var(--bad)' }}>{st.net >= 0 ? '+' : ''}{money(st.net)}</span></div>
        </div>
      </>}
    </div>
    </div>
  </div>;
}
