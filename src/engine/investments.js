export const INVESTMENTS = {
  bonds: { label:'Government bonds', mean:.015, sd:.02, gate:c=>c.incomeTier>=2 },
  stocks: { label:'Stock index', mean:.06, sd:.15, gate:(c,ch)=>c.incomeTier>=3||ch.wealthIdx>=3 },
  realEstate: { label:'Real estate fund', mean:.04, sd:.08, gate:c=>c.incomeTier>=3 },
  gold: { label:'Gold / informal', mean:0, sd:.05, gate:()=>true },
  pension: { label:'Private pension', mean:.03, sd:.04, gate:c=>c.incomeTier>=3, locked:true },
};
export function resolveInvestments(ch,country,rng,crash=false){let gain=0;for(const [id,v] of Object.entries(ch.investments||{})){if(v<=0)continue;const d=INVESTMENTS[id];let r=rng.gaussian(d.mean,d.sd);if(id==='stocks'&&crash)r-=.4;const g=v*r;ch.investments[id]+=g;gain+=g;}return gain;}
export function investmentValue(ch){return Object.values(ch.investments||{}).reduce((a,b)=>a+b,0);}
