// Map creation and pathfinding
// ---------- State ----------
let s = null;            // saved game state
let panel = null;        // open sheet {key, tab, arg, at, confirm}
const ents = {};         // non-saved positions for bots
let near = null;         // what the player stands next to
const player = {path:[], pending:null, moving:false, face:1, step:0};
const keys = {};

function newState(name,color,look={}){
  const hf=BY.home.front;
  const st = {
    v:1, name, color, look:{hair:look.hair||0,pants:look.pants||'#2c3a4d',acc:look.acc||0}, bio:'Mới chuyển đến phường, đang tìm việc.',
    money:300000, fame:0, rep:50, t:0, day:1,
    x:hf.x*TS+TS/2, y:hf.y*TS+TS/2,
    veh:0, vehs:[0], inv:{}, food:[], carry:[], orders:[], ordersAt:-999,
    proj:null, projects:[], projAt:-999,
    plots:PLOTS.map(()=>({owned:false,crop:null,at:0,ready:0,pest:false,told:false})),
    machines:[], unlocks:{}, loans:[], lent:[], offers:[], reqs:[], contracts:[],
    events:[], mods:{}, market:{mult:Object.fromEntries(Object.keys(ITEMS).map(k=>[k,1])),listings:[]}, mbought:{},
    news:[], newsSeen:0, log:[], dayLog:[],
    stats:{delivOn:0,delivLate:0,devFull:0,devRush:0,cancels:0,helped:0,borrowed:0,repaid:0,defaulted:0,lentN:0,flips:0,harvests:0,crafts:0,dishesSold:0,mktSold:0,spoiled:0},
    xp:{ship:0,dev:0,farm:0,ind:0,cook:0},
    bots:BOTS.map(b=>({id:b.id,money:rint(4,30)*100000,rep:Math.round(b.honesty*80+rint(0,15)),unpaid:0,assets:rint(2,12)*100000})),
    nextBot:30, nextPrice:60, dayMoney:300000, spoiledDay:0, milestones:{}, seenHelp:false,
  };
  return st;
}

// ---------- Time helpers ----------
const localMin = t => t - (s.day-1)*DAY;
function clockStr(t){ const d=Math.floor(t/DAY)+1, m=360+Math.round(t-(d-1)*DAY); const hh=Math.floor(m/60), mm=m%60; return (d!==s.day?`N${d} `:'')+pad(hh)+':'+pad(mm); }
function left(t){ const m=Math.round(t-s.t); if (m<0) return 'quá hạn'; const h=Math.floor(m/60), mm=m%60; return h?`${h}g${pad(mm)}`:`${mm} phút`; }
const canSpend = m => localMin(s.t)+m <= DAY;
function advance(m){
  if (!canSpend(m)) { toast('Không đủ thời gian trong ngày. Về phòng trọ nghỉ để sang ngày mới.','bad'); return false; }
  const a=s.t; s.t+=m; tickWorld(a,s.t); if(online?.status==='connected')onlineAdvanceClock(m); return true;
}

// ---------- Economy helpers ----------
const lvl = j => Math.min(5, 1+Math.floor(Math.sqrt(s.xp[j]/40)));
function fair(it){ const b=ITEMS[it]; return Math.max(1000, Math.round(b.base*(s.market.mult[it]||1)*(b.dish?(s.mods.dish||1):1)/500)*500); }
function have(it){ return ITEMS[it].dish ? s.food.filter(f=>f.it===it).reduce((a,f)=>a+f.q,0) : (s.inv[it]||0); }
function addItem(it,q){ if (q<=0) return; if (ITEMS[it].dish) s.food.push({it,q,exp:s.t+300}); else s.inv[it]=(s.inv[it]||0)+q; }
function takeItem(it,q){
  if (have(it)<q) return false;
  if (ITEMS[it].dish){ s.food.sort((a,b)=>a.exp-b.exp); for (const f of s.food){ if (f.it!==it||q<=0) continue; const k=Math.min(q,f.q); f.q-=k; q-=k; } s.food=s.food.filter(f=>f.q>0); }
  else { s.inv[it]-=q; if (s.inv[it]<=0) delete s.inv[it]; }
  return true;
}
const hasAll = req => Object.entries(req).every(([k,v])=>have(k)>=v);
const takeAll = req => Object.entries(req).forEach(([k,v])=>takeItem(k,v));
const reqStr = req => Object.entries(req).map(([k,v])=>`${v} ${ITEMS[k].n}`).join(' + ');
function pay(n){ if (s.money<n){ toast(`Không đủ tiền (cần ${vnd(n)}).`,'bad'); return false; } s.money-=n; return true; }
function gain(n){ s.money+=n; }
function repDelta(d){ s.rep=clamp(s.rep+d,0,100); }
function fameDelta(d,why){ s.fame=Math.max(0,s.fame+d); if (d>0) toast(`+${d} Fame${why?' · '+why:''}`,'fame'); }
function xpAdd(j,n){ const b=lvl(j); s.xp[j]+=n; const a=lvl(j); if (a>b){ toast(`${JOBS[j].i} ${JOBS[j].n} lên cấp ${a}!`,'good'); logMe(`Lên cấp ${a} nghề ${JOBS[j].n}`);} }
function logMe(t){ s.log.unshift({t:s.t,txt:t}); s.log.length=Math.min(s.log.length,40); s.dayLog.push(t); }
const bot = id => BOTS.find(b=>b.id===id);
const bstate = id => s.bots.find(b=>b.id===id);
const nameOf = id => id==='me' ? s.name : (bot(id)?.name || '?');
function news(text,kind='eco',who=[]){
  s.news.unshift({id:uid(),t:s.t,text,kind,who,r:{like:rint(0,2),wow:0,haha:0},mine:{},cm:[]});
  if (s.news.length>70) s.news.length=70;
}
function netWorth(){
  let v=s.money;
  for (const [k,q] of Object.entries(s.inv)) v+=q*fair(k)*.8;
  for (const f of s.food) v+=f.q*fair(f.it)*.7;
  s.plots.forEach((p,i)=>{ if (p.owned) v+=PLOTS[i].price*.7; });
  for (const m of s.machines) v+=MACH[m.type].price*.6;
  for (const k of s.vehs) v+=VEH[k].price*.6;
  for (const l of s.market.listings) if (l.seller==='me') v+=l.q*l.p*.8;
  for (const l of s.loans) if (!l.paid) v-=l.owe;
  for (const l of s.lent) if (!l.done) v+=l.back*.7;
  return Math.round(v);
}
function myTags(){
  const t=s.stats, out=[];
  if (t.repaid>=2 && t.defaulted===0) out.push(['Giữ chữ tín','good']);
  if (t.borrowed>=3) out.push(['Hay vay','warn']);
  if (t.cancels>=2 || t.defaulted>=1) out.push(['Chuyên lật kèo','bad']);
  if (t.flips>=3) out.push(['Đầu cơ','warn']);
  if (t.helped>=3) out.push(['Hay giúp người','good']);
  if (t.delivOn>=8) out.push(['Giao hàng thần tốc','good']);
  if (t.devFull>=3) out.push(['Dev có tâm','good']);
  if (t.devRush>=2) out.push(['Code ẩu','bad']);
  if (t.harvests>=5) out.push(['Nông dân chăm chỉ','good']);
  if (s.visited && Object.keys(s.visited).length>=LANDMARKS.length) out.push(['Thổ địa Hà Nội','good']);
  if (t.dishesSold>=20) out.push(['Bếp có tiếng','good']);
  if (t.lentN>=3) out.push(['Chủ nợ','warn']);
  return out;
}
function botTags(id){
  const b=bot(id), st=bstate(id), out=b.tags.map(t=>[t,(t==='Hay vay'||t==='Đầu cơ')?'warn':'good']);
  if (st.unpaid>0) out.push(['Quỵt nợ','bad']);
  return out;
}
