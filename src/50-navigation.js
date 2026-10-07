// Navigation and player controls
// ---------- UI: HUD, toasts, tracker ----------
const $=id=>document.getElementById(id);
function toast(text,kind=''){
  const el=document.createElement('div'); el.className='toast '+kind; el.textContent=text; $('toasts').prepend(el);
  const all=$('toasts').children; while (all.length>4) all[all.length-1].remove();
  setTimeout(()=>el.remove(),4200);
}
function updateHUD(){
  if (!s) return;
  $('hAva').style.background=s.color; $('hAva').textContent=s.name.trim()[0]?.toUpperCase()||'?'; $('hName').textContent=s.name;
  $('hMoney').textContent=kf(s.money); $('hFame').textContent=s.fame; $('hRep').textContent=Math.round(s.rep);
  $('hDay').textContent='Ngày '+s.day; $('hTime').textContent=clockStr(Math.min(s.t,s.day*DAY-0.01)).replace(/^N\d+ /,'');
  $('hClock').classList.toggle('late',localMin(s.t)>=840);
  const unread=s.news.filter(n=>n.t>s.newsSeen).length; $('dNews').hidden=!unread; $('dNews').textContent=unread>9?'9+':unread;
  const open=s.events.filter(e=>e.st==='open').length; $('dEv').hidden=!open; $('dEv').textContent=open;
}
function trackerItems(){
  const out=[];
  for (const c of s.carry){ const late=s.t>c.dl; out.push({ic:c.icon,t:`${c.name} → ${BY[c.house].name}`,sub:late?'Đã trễ hạn, vẫn giao được nửa tiền':`Còn ${left(c.dl)} · ${kf(c.pay)}`,cls:late?'warn':'',nav:c.house}); }
  if (s.proj){ const p=s.proj; out.push({ic:'💻',t:`${p.title} · ${Math.floor(p.done/p.work*100)}%`,sub:`Hạn còn ${left(p.dl)}${p.cr==='ask'?' · Khách vừa nhắn!':''}`,cls:(p.dl-s.t<120||p.cr==='ask')?'warn':'',nav:'cowork'}); }
  s.plots.forEach((p,i)=>{ if (p.crop){ const r=s.t>=p.ready; out.push({ic:r?'✨':'🌱',t:`Ruộng ${i+1}: ${CROPS[p.crop].n}${p.pest?' · có sâu':''}`,sub:r?'Thu hoạch được rồi':`Chín sau ${left(p.ready)}`,cls:r?'ready':(p.pest?'warn':''),plot:i}); } });
  s.machines.forEach(m=>{ const M=MACH[m.type]; if (m.busy){ out.push({ic:M.i,t:M.n,sub:m.busy.done==null?'Máy kẹt, cần xử lý':`Xong sau ${left(m.busy.done)}`,cls:m.busy.done==null?'warn':'',nav:'factory'}); } else if (m.broken) out.push({ic:M.i,t:M.n,sub:'Hỏng sau bão, cần sửa',cls:'warn',nav:'factory'}); });
  const df=dishCount(); if (df){ const soon=s.food.reduce((a,f)=>Math.min(a,f.exp),1e9); out.push({ic:'🍜',t:`${df} món ăn trong kho`,sub:`Món gần hỏng nhất còn ${left(soon)}`,cls:soon-s.t<60?'warn':'',nav:'food'}); }
  for (const c of s.contracts.filter(c=>!c.done)) out.push({ic:'📑',t:`Hợp đồng: ${c.title}`,sub:`Có ${have(c.it)}/${c.qty} · hạn ${clockStr(c.dl)}`,cls:'warn',nav:'market'});
  for (const l of s.loans.filter(l=>!l.paid)) out.push({ic:'💸',t:`Nợ ${nameOf(l.from)} ${kf(l.owe)}`,sub:l.over?'QUÁ HẠN':`Hạn hết ngày ${l.due}`,cls:(l.over||l.due<=s.day)?'warn':'',nav:'bank'});
  for (const e of s.events.filter(e=>e.st==='open')) out.push({ic:EV[e.k].i,t:EV[e.k].t,sub:`Sự kiện đang diễn ra · còn ${left(e.exp)}`,cls:'warn',ev:e.id});
  for (const l of s.market.listings.filter(l=>l.seller==='me')) out.push({ic:ITEMS[l.it].i,t:`Đang bán ${l.q} ${ITEMS[l.it].n}`,sub:`${kf(l.p)}/phần · giá chợ ${kf(fair(l.it))}`,cls:'',open:'market'});
  if (!out.length) out.push({ic:'👋',t:'Chưa có việc gì',sub:'Ghé Trạm Giao Hàng (📦) hoặc Nhà Nông (🌾) để bắt đầu kiếm tiền',cls:'',nav:'depot'});
  return out;
}
let trkData=[];
function updateTracker(){
  if (!s) return; trkData=trackerItems();
  const real=trkData.filter(x=>x.t!=='Chưa có việc gì').length; $('trkCount').textContent=real;
  $('trkList').innerHTML=trkData.map((x,i)=>`<button class="trk ${x.cls}" data-i="${i}"><span class="ic">${x.ic}</span><span class="tx">${esc(x.t)}<div class="sub">${esc(x.sub)}</div></span></button>`).join('');
}
$('trkList').addEventListener('click',e=>{
  const b=e.target.closest('.trk'); if (!b) return; const x=trkData[+b.dataset.i]; if (!x) return;
  if (x.ev) openPanel('event',{arg:x.ev}); else if (x.open) openPanel(x.open); else if (x.plot!=null){ goTo({type:'p',p:PLOTS[x.plot]}); } else if (x.nav) navTo(x.nav);
});
$('trkToggle').addEventListener('click',()=>$('tracker').classList.toggle('collapsed'));
if (window.innerWidth<640) $('tracker').classList.add('collapsed');
document.querySelectorAll('#dock button').forEach(b=>b.addEventListener('click',()=>{ if (!s) return; openPanel(b.dataset.open); }));
$('meBtn').addEventListener('click',()=>s&&openPanel('profile'));

// ---------- UI: sheet system ----------
function openPanel(key,o={}){ panel={key,tab:o.tab||null,arg:o.arg??null,at:o.at||(near&&near.type==='b'?near.b.id:null),confirm:null,res:null}; for (const k in keys) keys[k]=false; $('sheetWrap').hidden=false; renderPanel(); $('actBtn').hidden=true; }
function closePanel(){ if (!panel) return; const k=panel.key; panel=null; $('sheetWrap').hidden=true; if (k==='news') s.newsSeen=s.t; if (k==='day') startNextDay(); save(); updateHUD(); }
function renderPanel(){ if (!panel) return; const r=PANELS[panel.key](panel); $('shIcon').textContent=r.icon; $('shTitle').textContent=r.title; const sc=$('shBody').scrollTop; $('shBody').innerHTML=r.html; $('shBody').scrollTop=sc; if (r.after) r.after(); }
$('shClose').addEventListener('click',closePanel);
$('sheetWrap').addEventListener('click',e=>{ if (e.target.id==='sheetWrap') closePanel(); });
$('shBody').addEventListener('click',e=>{
  const b=e.target.closest('[data-a]'); if (!b || b.disabled) return;
  if (b.dataset.a==='onlineConnect'){ onlineConnect(); if(panel)renderPanel(); return; }
  if (b.dataset.a==='onlineDisconnect'){ onlineDisconnect(); if(panel)renderPanel(); return; }
  if (b.dataset.a==='friend'){ onlineFriend(b.dataset.v); return; }
  const fn=ACTS[b.dataset.a]; if (!fn) return;
  fn(b.dataset.v,b); if (panel) renderPanel(); updateHUD(); updateTracker(); save();
});
$('shBody').addEventListener('submit',e=>{if(e.target.id==='onlineChatForm'){e.preventDefault();onlineChatSend();}});
const tabs=(list,cur)=>`<div class="tabs">${list.map(([k,l])=>`<button class="${k===cur?'on':''}" data-a="tab" data-v="${k}">${l}</button>`).join('')}</div>`;
const row=(ic,title,sub,side,cls='')=>`<div class="row ${cls}"><span class="ic">${ic}</span><div class="tx"><b>${title}</b>${sub?`<span>${sub}</span>`:''}</div>${side?`<div class="side">${side}</div>`:''}</div>`;
const btn=(a,v,label,o={})=>`<button class="btn ${o.cls||''}" data-a="${a}" data-v="${esc(v??'')}" ${o.dis?'disabled':''} ${o.title?`title="${esc(o.title)}"`:''}>${label}</button>`;
const atB = id => panel && panel.at===id;

const PANELS = {
  online(){ return onlinePanel(); },
  home(p){
    const c=p.confirm==='sleep';
    return {icon:'🏠',title:'Phòng trọ của bạn',html:`
      <p class="lead">Căn phòng 12m² tầng 3 giữa phố cổ, đi bộ vài phút là ra Hồ Gươm. Tiền trọ 20k mỗi ngày, trừ lúc cuối ngày.</p>
      <div class="kv"><div><small>Tài sản ròng</small><b>${kf(netWorth())}</b></div><div><small>Hôm nay</small><b class="${s.money-s.dayMoney>=0?'pos':'neg'}">${s.money-s.dayMoney>=0?'+':''}${kf(s.money-s.dayMoney)}</b></div><div><small>Giờ</small><b>${clockStr(s.t)}</b></div></div>
      <div class="card"><h3>Đi ngủ</h3><p>Kết thúc ngày sớm và sang ${'ngày '+(s.day+1)}. Việc đang dở (đơn hàng, project) vẫn tính giờ theo hạn của chúng.</p>
      <div class="btns">${c?btn('sleep',1,'Chắc rồi, đi ngủ',{cls:'red'})+btn('confirm','', 'Thôi',{cls:'ghost'}):btn('confirm','sleep','Đi ngủ')}</div></div>
      <div class="card"><h3>Phương tiện</h3><div class="list">${s.vehs.map(k=>row(VEH[k].i,VEH[k].n,`Tốc độ x${VEH[k].sp} · chở ${VEH[k].cap} đơn`,k===s.veh?'<span class="chip good">Đang dùng</span>':btn('useVeh',k,'Dùng',{cls:'sm'}))).join('')}</div></div>`};
  },
  depot(p){
    ensureOrders(); const V=VEH[s.veh], full=s.carry.length>=V.cap;
    return {icon:'📦',title:'Trạm Giao Hàng',html:`
      <p class="lead">Nhận đơn, mang tới đúng nhà trước hạn. Đúng hạn: đủ tiền và cộng uy tín. Trễ: nửa tiền và mất uy tín. Giao sớm được thưởng 10%.</p>
      <div class="chips"><span class="chip">${V.i} ${V.n}</span><span class="chip ${full?'warn':''}">Đang chở ${s.carry.length}/${V.cap}</span><span class="chip">Cấp giao hàng ${lvl('ship')}</span></div>
      ${s.carry.length?`<h3>Đang chở</h3><div class="list">${s.carry.map(c=>row(c.icon,esc(c.name),`Tới ${BY[c.house].name} · ${s.t>c.dl?'<span class="neg">đã trễ</span>':'còn '+left(c.dl)}`,btn('nav',c.house,'Chỉ đường',{cls:'sm ghost'}))).join('')}</div>`:''}
      <h3>Đơn mới</h3><div class="list">${s.orders.map(o=>{ const lack=o.need>s.veh&&!(o.need===1&&s.veh>=1); const needTxt=o.need===3?'Cần xe ba gác':(o.need===1?'Cần xe đạp trở lên':''); const veh3=o.need===3&&s.veh!==3;
        const dis=full||veh3||(o.need===1&&s.veh<1);
        return row(o.icon,`${esc(o.name)} <span class="money">${kf(o.pay)}</span>`,`Tới ${BY[o.house].name} · ${o.dist} ô · hạn ${o.win} phút${o.rush?' · <span class="neg">GẤP</span>':''}${o.partner?` · chia với ${esc(nameOf(o.partner))}`:''}${needTxt?` · ${needTxt}`:''}`,btn('takeOrder',o.id,'Nhận',{dis,cls:'sm'}),dis?'dim':''); }).join('')}</div>
      <p class="note">Danh sách đơn đổi mới mỗi 2 giờ. Mua xe ở Tiệm Xe để chở nhiều đơn và chạy đơn gấp.</p>`};
  },
  cowork(p){
    ensureProjects(); const L=lvl('dev'), rate=1+.2*(L-1); let h='';
    if (s.proj){ const P=s.proj, pct=Math.floor(P.done/P.work*100);
      h+=`<div class="card"><h3>Project đang làm</h3>${row(P.icon,`${esc(P.title)} · ${esc(P.client)}`,`Tiền công ${kf(P.pay)} · hạn ${clockStr(P.dl)} (còn ${left(P.dl)})`)}
        <div class="bar"><i style="width:${pct}%"></i></div><p>${P.done.toFixed(1)}/${P.work} giờ công · tốc độ của bạn ${rate.toFixed(1)} giờ công/giờ</p>
        ${P.cr==='ask'?`<div class="result">💬 <b>${esc(P.client)}</b>: "Em thêm giúp chị tính năng ${esc(P.crFeat)} được không?"</div><div class="btns">${btn('cr','yes','Đồng ý (+40% việc, +35% tiền)',{cls:'sm'})}${btn('cr','no','Từ chối khéo',{cls:'sm ghost'})}${btn('cr','haggle','Đòi gấp đôi phí',{cls:'sm ghost'})}</div>`:''}
        <div class="btns">${btn('code',60,'Code 1 giờ',{dis:P.cr==='ask'})}${btn('code',180,'Code 3 giờ',{dis:P.cr==='ask',cls:'ghost'})}</div>
        <div class="btns">${btn('submit','full','Bàn giao',{dis:pct<100})}${btn('submit','rush','Giao vội (bỏ test)',{dis:pct<60||pct>=100,cls:'ghost',title:'50% khách phát hiện bug'})}${btn('submit','cancel','Huỷ hợp đồng',{cls:'red sm'})}</div>
        <p class="note">Giao vội: 50% bị phát hiện bug, mất nửa tiền và uy tín. Huỷ: uy tín -6, bị tính là lật kèo.</p></div>`;
    }
    h+=`<h3>Bảng project freelance</h3><div class="list">${s.projects.map(P=>row(P.icon,`${esc(P.title)} <span class="money">${kf(P.pay)}</span>${P.vip?' <span class="chip fame">VIP</span>':''}`,`${esc(P.client)} · ${P.work} giờ công · hạn ${Math.round(P.win/60*10)/10} giờ`,btn('takeProj',P.id,'Nhận',{dis:!!s.proj,cls:'sm'}),s.proj?'dim':'')).join('')}</div>`;
    if (!s.unlocks.vip) h+=`<div class="card"><h3>Bảng project VIP</h3><p>Khách lớn, trả gần gấp đôi, xong việc còn được +1 Fame. Mở bằng 5 Fame.</p><div class="btns">${btn('unlock','vip','Mở bằng 5 Fame',{dis:s.fame<5})}</div></div>`;
    return {icon:'💻',title:'Co-working Phường',html:`<p class="lead">Nhận project, ngồi code từng giờ, tự quyết giữa tốc độ, tiền và uy tín. Cấp lập trình: ${L}.</p>`+h};
  },
  farm(p){
    const wage=60000+lvl('farm')*5000;
    return {icon:'🌾',title:'Nhà Nông',html:`
      <p class="lead">Chưa có vốn thì làm thuê. Có vốn thì mua đất ở cánh đồng phía dưới, gieo hạt, chờ chín rồi thu hoạch.</p>
      <div class="card"><h3>Làm thuê</h3><p>Phụ Bà Sáu nhổ cỏ, tưới rau 2 tiếng. Công ${kf(wage)}.</p><div class="btns">${btn('hire','', 'Làm thuê 2 giờ')}</div></div>
      <h3>Hạt giống</h3><div class="list">${['seed_rau','seed_lua'].map(k=>row(ITEMS[k].i,ITEMS[k].n,`${kf(fair(k))}/phần · đang có ${have(k)} · gieo 1 ruộng cần 3 phần`,btn('buySeed',k+':3','Mua 3',{cls:'sm'})+btn('buySeed',k+':9','Mua 9',{cls:'sm ghost'}))).join('')}</div>
      <p class="note">Rau muống: chín sau 2 giờ, được 10 rau. Lúa: chín sau 4 giờ, được 8 lúa. Đất màu mỡ được thêm 50%.</p>
      <h3>Đất ở cánh đồng</h3><div class="list">${PLOTS.map((P,i)=>{ const st=s.plots[i]; return row('🟫',`Ruộng số ${i+1}${P.premium?' · màu mỡ':''}`,st.owned?(st.crop?`${CROPS[st.crop].n} · ${s.t>=st.ready?'đã chín':'chín sau '+left(st.ready)}`:'Đất trống, sẵn sàng gieo'):`Giá ${kf(P.price)}${P.fame&&!s.unlocks['plot'+i]?` · cần mở bằng ${P.fame} Fame`:''}`,btn('goPlot',i,'Ra ruộng',{cls:'sm ghost'})); }).join('')}</div>`};
  },
  plot(p){
    const i=p.arg, P=PLOTS[i], st=s.plots[i]; let h='';
    if (!st.owned){
      const locked=P.fame&&!s.unlocks['plot'+i];
      h=`<p class="lead">Mảnh đất ${P.premium?'màu mỡ ven mương, sản lượng +50%':'2x2 ô, đất thịt nhẹ'}. Giá ${vnd(P.price)}.</p>
        ${locked?`<div class="card"><p>Đất đẹp chỉ bán cho người có tiếng trong phường. Mở quyền mua bằng ${P.fame} Fame (bạn có ${s.fame}).</p><div class="btns">${btn('unlock','plot'+i,`Mở bằng ${P.fame} Fame`,{dis:s.fame<P.fame})}</div></div>`:`<div class="btns">${btn('buyPlot',i,`Mua đất ${kf(P.price)}`,{dis:s.money<P.price})}</div>`}`;
    } else if (!st.crop){
      h=`<p class="lead">Đất trống. Chọn giống để gieo (mỗi lần gieo dùng 3 phần hạt).</p><div class="list">${Object.entries(CROPS).map(([k,C])=>row(ITEMS[C.seed].i,C.n,`Có ${have(C.seed)} hạt · chín sau ${C.t/60} giờ · thu ${Math.round(C.yield*(P.premium?1.5:1))+lvl('farm')-1} ${ITEMS[C.out].n}`,btn('plant',i+':'+k,'Gieo',{dis:have(C.seed)<3,cls:'sm'}))).join('')}</div>
        <p class="note">Hết hạt? Mua ở Nhà Nông ngay bên trên.</p>`;
    } else {
      const ready=s.t>=st.ready, pct=Math.floor(clamp((s.t-st.at)/(st.ready-st.at),0,1)*100);
      h=`${row(ITEMS[CROPS[st.crop].seed].i,CROPS[st.crop].n,ready?'Đã chín, thu hoạch ngay!':`Chín lúc ${clockStr(st.ready)}`)}<div class="bar"><i style="width:${pct}%"></i></div>
        ${st.pest?`<div class="result">🐛 Ruộng có sâu. Không xử lý thì thu hoạch chỉ được một nửa.</div><div class="btns">${btn('spray',i,'Phun thuốc 15k',{cls:'sm'})}</div>`:''}
        <div class="btns">${btn('harvest',i,'Thu hoạch',{dis:!ready})}</div>`;
    }
    return {icon:'🌱',title:`Ruộng số ${i+1}`,html:h};
  },
  factory(p){
    let h=`<p class="lead">Mua máy, nạp nguyên liệu, chờ ra thành phẩm. Máy có thể kẹt; bạn chọn bỏ tiền sửa nhanh hay tự sửa mất thời gian.</p>`;
    if (s.machines.length) h+=`<h3>Máy của bạn</h3><div class="list">${s.machines.map((m,i)=>{ const M=MACH[m.type]; let side, sub;
      if (m.broken){ sub='Hỏng, cần sửa'; side=btn('fix',i+':pay','Sửa 80k',{cls:'sm'}); }
      else if (m.busy && m.busy.done==null){ sub='Kẹt máy giữa mẻ!'; side=btn('unjam',i+':pay','Thợ sửa 40k',{cls:'sm'})+btn('unjam',i+':self','Tự sửa 1 giờ',{cls:'sm ghost'}); }
      else if (m.busy){ sub=`Đang chạy, xong lúc ${clockStr(m.busy.done)}`; side='<span class="chip">Đang chạy</span>'; }
      else { sub=`${reqStr(M.in)} → ${reqStr(M.out)} · ${M.t} phút`; side=btn('run',i,'Chạy mẻ',{dis:!hasAll(M.in),cls:'sm'}); }
      return row(M.i,M.n,sub,side); }).join('')}</div>`;
    h+=`<h3>Mua máy</h3><div class="list">${Object.entries(MACH).map(([k,M])=>row(M.i,`${M.n} <span class="money">${kf(M.price)}</span>`,`${reqStr(M.in)} → ${reqStr(M.out)} · ${M.t} phút`,btn('buyMach',k,'Mua',{dis:s.money<M.price,cls:'sm'}))).join('')}</div>
      <p class="note">Chuỗi gợi ý: Lúa → Gạo (máy xay) → Bánh phở → Phở ở quán ăn.</p>`;
    return {icon:'🏭',title:'Xưởng Sản Xuất',html:h};
  },
  food(p){
    const tab=p.tab||'cook'; let h=tabs([['cook','Bếp'],['buy','Nguyên liệu'],['sell','Bán hàng'],['up','Nâng cấp']],tab);
    if (tab==='cook') h+=`<p>Nấu theo mẻ. Món chín để được 5 giờ rồi hỏng. Cấp đầu bếp ${lvl('cook')}${lvl('cook')>=3?' (+1 phần mỗi mẻ)':''}.</p><div class="list">${Object.entries(RECIPES).map(([k,Rc])=>row(ITEMS[k].i,`${ITEMS[k].n} ×${Rc.out}`,`${reqStr(Rc.in)} · ${Rc.t} phút · giá bán ${kf(fair(k))}/phần`,btn('cook',k,'Nấu',{dis:!hasAll(Rc.in),cls:'sm'}))).join('')}</div>
      <p class="note">Có trong kho: ${['banh_pho','thit_bo','rau','gao','trung','phoi'].map(k=>`${ITEMS[k].i} ${have(k)}`).join(' · ')}</p>`;
    if (tab==='buy') h+=`<p>Mối hàng quen giao tận quán, đắt hơn giá chợ 15%. Muốn rẻ thì tự trồng hoặc mua trên Chợ.</p><div class="list">${['thit_bo','trung','phoi','rau','gao','banh_pho'].map(k=>{ const pr=Math.round(fair(k)*1.15/500)*500; return row(ITEMS[k].i,ITEMS[k].n,`${kf(pr)}/phần · đang có ${have(k)}`,btn('buyIng',k+':1','Mua 1',{cls:'sm'})+btn('buyIng',k+':3','Mua 3',{cls:'sm ghost'})); }).join('')}</div>`;
    if (tab==='sell'){ const n=dishCount(); h+=`<p>Mở bán 1 giờ: khách vãng lai ghé ăn. Uy tín và Fame càng cao càng đông khách${s.mods.dish>1?'. <b class="famec">Lễ hội: giá +60% hôm nay!</b>':''}.</p>
      <div class="kv"><div><small>Món trong kho</small><b>${n}</b></div><div><small>Khách dự kiến</small><b>${custRange()}</b></div></div>
      <div class="list">${s.food.map(f=>row(ITEMS[f.it].i,`${f.q} ${ITEMS[f.it].n}`,`Hỏng sau ${left(f.exp)} · ${kf(fair(f.it))}/phần`)).join('')||'<p>Chưa có món nào. Vào tab Bếp để nấu.</p>'}</div>
      <div class="btns">${btn('sellFood','', 'Mở bán 1 giờ',{dis:!n})}</div>`; }
    if (tab==='up') h+= s.unlocks.rest?`<div class="result">🏮 Quán đã nâng cấp thành nhà hàng: khách gấp 1,8 lần, giá +10%.</div>`:`<div class="card"><h3>Nâng cấp thành nhà hàng</h3><p>Biển hiệu mới, thêm 6 bàn. Khách gấp 1,8 lần, giá +10%. Cần 8 Fame và 3 triệu.</p><div class="btns">${btn('upRest','', 'Nâng cấp (8 Fame + 3tr)',{dis:s.fame<8||s.money<3e6})}</div></div>`;
    return {icon:'🍜',title:s.unlocks.rest?'Nhà Hàng Của Bạn':'Quán Ăn Của Bạn',html:h};
  },
  bank(p){
    const tab=p.tab||'borrow'; let h=tabs([['borrow','Đi vay'],['lend','Cho vay'],['debt','Khoản nợ']],tab);
    if (tab==='borrow') h+=`<p>Người cho vay nhìn uy tín của bạn (hiện ${Math.round(s.rep)}). Quá hạn không trả: uy tín -15 và cả phường biết.</p><div class="list">${s.offers.map(o=>{ const ok=s.rep>=o.minRep; return row('🤝',`${esc(nameOf(o.from))} cho vay <span class="money">${kf(o.amount)}</span>`,`Lãi ${Math.round(o.rate*100)}% · trả ${kf(o.amount*(1+o.rate))} trước hết ngày ${s.day+o.days}${ok?'':` · <span class="neg">Từ chối: cần uy tín ${o.minRep}</span>`}`,btn('borrow',o.id,'Vay',{dis:!ok,cls:'sm'}),ok?'':'dim'); }).join('')||'<p>Hôm nay không ai cho vay.</p>'}</div>`;
    if (tab==='lend') h+=`<p>Người trong phường hỏi vay. Uy tín của họ là gợi ý, không phải lời hứa.</p><div class="list">${s.reqs.map(r=>{ const st=bstate(r.from); return row('🙏',`${esc(nameOf(r.from))} vay <span class="money">${kf(r.amount)}</span>`,`Hứa trả ${kf(r.back)} trước hết ngày ${s.day+r.days} · uy tín ${Math.round(st.rep)}${st.unpaid?` · <span class="neg">từng quỵt ${st.unpaid} lần</span>`:''}`,btn('lend',r.id,'Cho vay',{cls:'sm'})+btn('profileOf',r.from,'Hồ sơ',{cls:'sm ghost'})); }).join('')||'<p>Không ai hỏi vay.</p>'}</div>
      ${s.lent.filter(l=>!l.done).length?`<h3>Đang cho vay</h3><div class="list">${s.lent.filter(l=>!l.done).map(l=>row('📒',`${esc(nameOf(l.to))} nợ ${kf(l.back)}`,`Hạn hết ngày ${l.due}`)).join('')}</div>`:''}`;
    if (tab==='debt'){ const L=s.loans.filter(l=>!l.paid); h+= L.length?`<div class="list">${L.map(l=>row('💸',`Nợ ${esc(nameOf(l.from))} <span class="money">${kf(l.owe)}</span>`,l.over?'<span class="neg">Quá hạn. Trả bây giờ vẫn gỡ lại được chút uy tín.</span>':`Hạn hết ngày ${l.due}`,btn('repay',l.id,'Trả nợ',{dis:s.money<l.owe,cls:'sm'}))).join('')}</div>`:'<p>Bạn không nợ ai. Nhẹ người.</p>'; }
    return {icon:'🤝',title:'Hội Vay Vốn',html:h};
  },
  garage(p){
    return {icon:'🛵',title:'Tiệm Xe Ba Đô',html:`<p class="lead">Xe nhanh hơn thì chạy kịp đơn gấp, chở được nhiều đơn một lúc. Xe ba gác chở được hàng cồng kềnh.</p>
      <div class="list">${VEH.map((V,k)=>{ if (!k) return ''; const own=s.vehs.includes(k), locked=V.fame&&!s.unlocks['veh'+k];
        const side= own?(s.veh===k?'<span class="chip good">Đang dùng</span>':btn('useVeh',k,'Dùng',{cls:'sm'})) : locked?btn('unlock','veh'+k,`Mở bằng ${V.fame} Fame`,{dis:s.fame<V.fame,cls:'sm'}) : btn('buyVeh',k,`Mua ${kf(V.price)}`,{dis:s.money<V.price,cls:'sm'});
        return row(V.i,V.n,`Tốc độ x${V.sp} · chở ${V.cap} đơn${V.heavy?' · chở hàng cồng kềnh':''}`,side); }).join('')}</div>`};
  },
  market(p){
    const tab=p.tab||'buy', here=atB('market'); let h=tabs([['buy','Mua'],['sell','Đăng bán'],['npc','Bán nhanh'],['ct','Hợp đồng']],tab);
    if (tab==='buy'){ const L=s.market.listings.filter(l=>l.seller!=='me').sort((a,b)=>a.it.localeCompare(b.it)||a.p-b.p);
      h+=`<p>Giá do người bán tự đặt. So với giá chợ để biết rẻ hay đắt.</p><div class="list">${L.map(l=>{ const f=fair(l.it), d=Math.round((l.p/f-1)*100); return row(ITEMS[l.it].i,`${l.q} ${ITEMS[l.it].n} · <span class="money">${kf(l.p)}</span>/phần`,`Người bán <button class="who" data-a="profileOf" data-v="${l.seller}">${esc(nameOf(l.seller))}</button> · ${d<=0?`<span class="pos">rẻ hơn chợ ${-d}%</span>`:`<span class="neg">đắt hơn chợ ${d}%</span>`}`,btn('buyL',l.id+':1','Mua 1',{cls:'sm',dis:s.money<l.p})+(l.q>1?btn('buyL',l.id+':all',`Mua hết ${kf(l.p*l.q)}`,{cls:'sm ghost',dis:s.money<l.p*l.q}):'')); }).join('')||'<p>Chợ đang vắng. Quay lại sau.</p>'}</div>`; }
    if (tab==='sell'){ const own=Object.keys(ITEMS).filter(k=>have(k)>0); const mine=s.market.listings.filter(l=>l.seller==='me');
      h+= own.length?`<p>Đăng bán cho cả phường. Giá thấp bán nhanh, giá cao phải chờ.</p><div class="fields"><label class="field">Hàng<select id="lsIt">${own.map(k=>`<option value="${k}">${ITEMS[k].i} ${ITEMS[k].n} (có ${have(k)}, chợ ${kf(fair(k))})</option>`).join('')}</select></label></div>
        <div class="fields"><label class="field">Số lượng<input id="lsQ" type="number" min="1" value="1" inputmode="numeric"></label><label class="field">Giá mỗi phần (đ)<input id="lsP" type="number" min="500" step="500" value="${fair(own[0])}" inputmode="numeric"></label>${btn('list','', 'Đăng bán')}</div>`:'<p>Bạn chưa có hàng để bán.</p>';
      if (mine.length) h+=`<h3>Bạn đang bán</h3><div class="list">${mine.map(l=>row(ITEMS[l.it].i,`${l.q} ${ITEMS[l.it].n} · ${kf(l.p)}/phần`,`Giá chợ ${kf(fair(l.it))}`,btn('unlist',l.id,'Gỡ',{cls:'sm ghost'}))).join('')}</div>`; }
    if (tab==='npc'){ if (!here) h+=`<div class="result">Bán nhanh cho thương lái chỉ làm được khi đứng ở Chợ Đồng Xuân.</div><div class="btns">${btn('nav','market','Chỉ đường tới Chợ')}</div>`;
      else { const own=Object.keys(ITEMS).filter(k=>have(k)>0&&!k.startsWith('seed')); h+=`<p>Thương lái mua ngay, nhưng chỉ trả 65% giá chợ.</p><div class="list">${own.map(k=>{ const pr=Math.round(fair(k)*.65/500)*500; return row(ITEMS[k].i,`${ITEMS[k].n} · có ${have(k)}`,`Thu mua ${kf(pr)}/phần`,btn('npcSell',k+':1','Bán 1',{cls:'sm'})+btn('npcSell',k+':all','Bán hết',{cls:'sm ghost'})); }).join('')||'<p>Không có gì để bán.</p>'}</div>`; } }
    if (tab==='ct'){ const C=s.contracts.filter(c=>!c.done); h+= C.length?`<div class="list">${C.map(c=>row('📑',`${esc(c.title)} · <span class="money">${kf(c.pay)}</span>`,`Có ${have(c.it)}/${c.qty} · hạn ${clockStr(c.dl)}`,here?btn('deliverCt',c.id,'Giao hàng',{dis:have(c.it)<c.qty,cls:'sm'}):'<span class="chip warn">Giao tại Chợ</span>')).join('')}</div>`:'<p>Chưa có hợp đồng nào. Hợp đồng đến từ sự kiện doanh nghiệp.</p>'; }
    return {icon:'🛒',title:'Chợ Đồng Xuân',html:h};
  },
  news(p){
    const tab=p.tab||'feed'; let h=tabs([['feed','Bảng tin'],['ask','Hỏi phường'],['rank','Xếp hạng']],tab);
    const card=n=>`<div class="news ${n.kind}"><div class="meta">${clockStr(n.t).replace(/^N(\d+)/,'Ngày $1')}${Math.floor(n.t/DAY)+1!==s.day?'':' · hôm nay'}</div><div class="txt">${esc(n.text)}</div>
      <div class="reacts">${[['like','👍'],['wow','😮'],['haha','😂']].map(([k,e])=>`<button class="${n.mine[k]?'on':''}" data-a="react" data-v="${n.id}:${k}">${e} ${n.r[k]}</button>`).join('')}${n.who.filter(w=>w!=='me').slice(0,1).map(w=>`<button data-a="profileOf" data-v="${w}">${esc(nameOf(w))}</button>`).join('')}</div>
      ${n.cm.map(c=>`<div class="cmt"><b>${esc(nameOf(c.who))}</b>: ${esc(c.txt)}</div>`).join('')}</div>`;
    if (tab==='feed') h+=`<p>Chuyện trong phường, do chính người chơi tạo ra.</p>${s.news.filter(n=>n.kind!=='ask').slice(0,40).map(card).join('')||'<p>Chưa có tin gì.</p>'}`;
    if (tab==='ask') h+=`<div class="fields"><label class="field">Hỏi cả phường<input id="askQ" maxlength="140" placeholder="VD: Giá gạo mai có lên không mọi người?"></label>${btn('ask','', 'Đăng')}</div>${s.news.filter(n=>n.kind==='ask').map(card).join('')||'<p>Chưa có câu hỏi nào.</p>'}`;
    if (tab==='rank'){ const rows=[{id:'me',name:s.name,v:netWorth(),c:s.color},...BOTS.map(b=>{ const st=bstate(b.id); return {id:b.id,name:b.name,v:st.money+st.assets,c:b.color}; })].sort((a,b)=>b.v-a.v);
      h+=`<p>Tài sản ròng của mọi người trong phường.</p><div class="list">${rows.map((r,i)=>`<div class="lb ${r.id==='me'?'me':''}"><span class="rk">${i+1}</span><button class="who" data-a="profileOf" data-v="${r.id}" style="text-align:left">${esc(r.name)}</button><span class="money">${kf(r.v)}</span></div>`).join('')}</div>`; }
    return {icon:'📰',title:'Tin Phường',html:h};
  },
  events(p){
    const st={wait:['Sắp tới',''],open:['Đang diễn ra','warn'],done:['Đã xử lý','good'],missed:['Bỏ lỡ','bad'],skip:['Huỷ','']};
    const L=s.events.filter(e=>e.st!=='skip');
    return {icon:'📅',title:`Lịch sự kiện ngày ${s.day}`,html:`<p class="lead">Mỗi ngày có 1 sự kiện lớn và vài sự kiện nhỏ. Sự kiện mở trong 3 giờ; bỏ lỡ thì hậu quả vẫn tới.</p>
      <div class="list">${L.map(e=>{ const E=EV[e.k]; return row(E.i,`${clockStr(e.at)} · ${E.t}${E.major?' <span class="chip fame">Lớn</span>':''}`,e.st==='open'?`Còn ${left(e.exp)} để quyết định`:(e.result?esc(e.result):''),`<span class="chip ${st[e.st][1]}">${st[e.st][0]}</span>`+(e.st==='open'?btn('openEv',e.id,'Xử lý',{cls:'sm'}):'')); }).join('')}</div>`};
  },
  event(p){
    const e=s.events.find(x=>x.id===p.arg); if (!e) return {icon:'📅',title:'Sự kiện',html:'<p>Sự kiện không còn.</p>'};
    const E=EV[e.k];
    let h=`<p class="lead">${esc(E.d(e))}</p>`;
    if (e.st==='open') h+=`<div class="btns">${E.c.map((c,i)=>{ const ok=!c.req||c.req(e); return btn('choose',e.id+':'+i,c.l+(ok?'':` (${c.rt})`),{dis:!ok,cls:i?'ghost':''}); }).join('')}</div><p class="note">Còn ${left(e.exp)} để quyết định.</p>`;
    else h+=`<div class="result">${esc(e.result||'')}</div>`;
    return {icon:E.i,title:E.t,html:h};
  },
  inv(p){
    const items=Object.keys(ITEMS).filter(k=>!ITEMS[k].dish&&have(k)>0);
    return {icon:'🎒',title:'Túi đồ & tài sản',html:`
      <div class="kv"><div><small>Tiền</small><b class="money">${kf(s.money)}</b></div><div><small>Tài sản ròng</small><b>${kf(netWorth())}</b></div><div><small>Fame</small><b class="famec">${s.fame}</b></div></div>
      <h3>Kho hàng</h3>${items.length?`<div class="grid">${items.map(k=>`<div class="item"><span class="e">${ITEMS[k].i}</span><b>${have(k)}</b>${ITEMS[k].n}<span class="note">${kf(fair(k))}</span></div>`).join('')}</div>`:'<p>Kho trống.</p>'}
      ${s.food.length?`<h3>Món ăn (có hạn dùng)</h3><div class="list">${s.food.map(f=>row(ITEMS[f.it].i,`${f.q} ${ITEMS[f.it].n}`,`Hỏng sau ${left(f.exp)}`)).join('')}</div>`:''}
      <h3>Tài sản</h3><div class="list">
        ${s.vehs.map(k=>row(VEH[k].i,VEH[k].n,k===s.veh?'Đang dùng':'',k!==s.veh?btn('useVeh',k,'Dùng',{cls:'sm'}):'')).join('')}
        ${s.plots.map((st,i)=>st.owned?row('🟫',`Ruộng số ${i+1}`,st.crop?`${CROPS[st.crop].n} · ${s.t>=st.ready?'đã chín':'chín sau '+left(st.ready)}`:'Đang trống'):'').join('')}
        ${s.machines.map(m=>row(MACH[m.type].i,MACH[m.type].n,m.broken?'Hỏng':(m.busy?'Đang chạy':'Rảnh'))).join('')}
        ${s.unlocks.rest?row('🏮','Nhà hàng','Đã nâng cấp'):''}
      </div>`};
  },
  profile(p){
    const id=p.arg||'me', me=id==='me';
    const B=me?null:bot(id), st=me?null:bstate(id);
    const name=me?s.name:B.name, color=me?s.color:B.color, bio=me?s.bio:B.bio;
    const tags=me?myTags():botTags(id);
    const posts=s.news.filter(n=>n.who.includes(id)).slice(0,8);
    let h=`<div class="prof"><span class="ava" style="background:${color}">${esc(name.trim()[0]?.toUpperCase()||'?')}</span><div><h4>${esc(name)}</h4><p>${esc(bio)}</p></div></div>
      <div class="chips">${tags.map(([t,c])=>`<span class="chip ${c}">${esc(t)}</span>`).join('')||'<span class="chip">Chưa có dấu ấn gì</span>'}</div>
      <div class="kv"><div><small>Uy tín</small><b class="pos">${Math.round(me?s.rep:st.rep)}</b></div><div><small>Fame</small><b class="famec">${me?s.fame:Math.round(st.rep/25)}</b></div><div><small>Tài sản</small><b>${kf(me?netWorth():st.money+st.assets)}</b></div></div>`;
    if (me){
      h+=`<h3>Nghề nghiệp</h3><div class="list">${Object.entries(JOBS).map(([k,J])=>{ const L=lvl(k), nx=Math.pow(L,2)*40, pv=Math.pow(L-1,2)*40, pct=L>=5?100:Math.floor((s.xp[k]-pv)/(nx-pv)*100); return `<div class="row"><span class="ic">${J.i}</span><div class="tx"><b>${J.n} · cấp ${L}</b><div class="bar"><i style="width:${pct}%"></i></div></div></div>`; }).join('')}</div>
        <div class="fields"><label class="field">Giới thiệu<input id="bioIn" maxlength="80" value="${esc(s.bio)}"></label>${btn('saveBio','', 'Lưu',{cls:'ghost'})}</div>
        <h3>Hoạt động gần đây</h3><div class="list">${s.log.slice(0,10).map(l=>`<div class="cmt">${clockStr(l.t).replace(/^N(\d+)/,'Ngày $1')} · ${esc(l.txt)}</div>`).join('')||'<p>Chưa có hoạt động.</p>'}</div>`;
    } else h+=`<p class="note">Nghề chính: ${JOBS[B.job]?.n||'Buôn bán'} · ${st.unpaid?`Đang nợ bạn ${st.unpaid} khoản quá hạn`:'Chưa có vấn đề gì với bạn'}</p>`;
    h+=`<h3>Được nhắc tới trên bảng tin</h3>${posts.map(n=>`<div class="news ${n.kind}"><div class="txt">${esc(n.text)}</div></div>`).join('')||'<p>Chưa có.</p>'}`;
    return {icon:'👤',title:me?'Hồ sơ của bạn':`Hồ sơ ${name}`,html:h};
  },
  map(p){
    const d=b=>meters(Math.hypot(b.front.x*TS+TS/2-s.x,b.front.y*TS+TS/2-s.y));
    const place=(ic,name,sub,id)=>row(ic,name,sub,btn('goPlace','auto:'+id,'Đi tới',{cls:'sm'})+btn('goPlace','guide:'+id,'Chỉ đường',{cls:'sm ghost'}));
    const owned=s.plots.map((st,i)=>st.owned?i:-1).filter(i=>i>=0);
    const order=['garage','depot','market','bank','farm','cowork','food','factory','news','home'];
    return {icon:'🗺️',title:'Bản đồ Hà Nội',after:()=>{ const c=$('bigMap'); drawMapTo(c,{labels:true}); c.onclick=ev=>{ const w=mapToWorld(c,ev); if (!w) return; const t=pickAt(w.x,w.y); if (!t) return toast('Chỗ đó không đi tới được.'); closePanel(); goTo(t); }; },
      html:`<canvas id="bigMap" aria-label="Bản đồ toàn phường"></canvas>
      <div class="legend"><span><i style="background:${s.color};outline:2px solid #231900"></i>Bạn</span><span><i style="background:#f4c534"></i>Đích đang chỉ đường</span><span><i style="background:#d8432f"></i>Nhà cần giao hàng</span><span><i style="background:#9db4c8"></i>Người khác</span></div>
      <p>Chạm vào một chỗ trên bản đồ để tự đi tới. Hoặc chọn bên dưới: <b>Đi tới</b> là tự đi, <b>Chỉ đường</b> là hiện mũi tên để bạn tự lái.</p>
      ${s.carry.length?`<h3>Nhà cần giao hàng</h3><div class="list">${s.carry.map(c=>place('📦',BY[c.house].name,`${esc(c.name)} · ${s.t>c.dl?'đã trễ':'còn '+left(c.dl)} · cách ${d(BY[c.house])}`,c.house)).join('')}</div>`:''}
      <h3>Địa điểm</h3><div class="list">${order.map(id=>{ const b=BY[id]; return place(b.icon,b.name,`${PURPOSE[id]} · cách ${d(b)}`,id); }).join('')}</div>
      <h3>Địa danh Hà Nội <span class="chip">${Object.keys(s.visited||{}).length}/${LANDMARKS.length} đã ghé</span></h3><div class="list">${LANDMARKS.map(b=>place(b.icon,b.name+((s.visited||{})[b.id]?' ✓':''),`Cách ${d(b)} · đi hết cả ${LANDMARKS.length} chỗ được +2 Fame`,b.id)).join('')}</div>
      ${owned.length?`<h3>Ruộng của bạn</h3><div class="list">${owned.map(i=>{ const st=s.plots[i]; return place('🌱','Ruộng số '+(i+1),st.crop?(s.t>=st.ready?'Đã chín':'Chín sau '+left(st.ready)):'Đang trống','plot'+i); }).join('')}</div>`:''}`};
  },
  menu(p){
    return {icon:'☰',title:'Menu',html:`
      <div class="card"><h3>Cách chơi</h3>
        <p>Di chuyển bằng WASD / mũi tên hoặc chạm vào bản đồ. Đứng trước cửa và bấm E (hoặc nút vàng) để vào. Chạm vào nhà là tự đi tới. Không biết chỗ nào ở đâu thì mở 🗺️ Bản đồ (phím M) hoặc bấm vào bản đồ nhỏ góc phải. Phóng to/thu nhỏ bằng nút +/−, con lăn chuột hoặc chụm hai ngón.</p>
        <p>Một ngày trong game kéo dài 06:00 tới 22:00 (khoảng 5 phút thật). Thời gian chỉ chạy khi bạn đang chơi và dừng khi mở bảng. Không có tiến độ khi offline.</p>
        <p>5 nghề: 📦 Giao hàng · 💻 Lập trình · 🌾 Nông nghiệp · 🏭 Sản xuất · 🍜 Đầu bếp. Có thể nối thành chuỗi: Lúa → Gạo → Bánh phở → Phở.</p>
        <p>Uy tín quyết định ai chịu cho bạn vay. Fame hiếm, dùng để mở đất đẹp, xe ba gác, project VIP, nhà hàng.</p></div>
      <div class="btns">${btn('saveNow','', 'Lưu game')}${p.confirm==='reset'?btn('reset','', 'Xoá hết và chơi lại',{cls:'red'})+btn('confirm','', 'Thôi',{cls:'ghost'}):btn('confirm','reset','Chơi lại từ đầu',{cls:'ghost'})}</div>
      <p class="note">Tiến độ lưu trên trình duyệt này. Người chơi khác hiện là bot mô phỏng; bản realtime sẽ thay bằng người thật.</p>`};
  },
  day(p){
    const S=s.summary, d=S.end-S.start;
    return {icon:'🌙',title:`Hết ngày ${S.day}`,html:`<p class="lead">22:00. Phường lên đèn, mọi người về nghỉ.</p>
      <div class="kv"><div><small>Đầu ngày</small><b>${kf(S.start)}</b></div><div><small>Cuối ngày</small><b>${kf(S.end)}</b></div><div><small>Chênh lệch</small><b class="${d>=0?'pos':'neg'}">${d>=0?'+':''}${kf(d)}</b></div><div><small>Tài sản ròng</small><b>${kf(S.worth)}</b></div></div>
      <h3>Trong ngày</h3><div class="list">${S.lines.map(l=>`<div class="cmt">${esc(l)}</div>`).join('')||'<p>Một ngày yên ả.</p>'}</div>
      <div class="btns">${btn('nextDay','', 'Sang ngày mới ☀️')}</div>`};
  },
};
function custRange(){ const base=3+Math.floor(s.rep/25)+Math.floor(s.fame/4); const m=s.unlocks.rest?1.8:1; return `${Math.round(base*m)}–${Math.round((base+3)*m)}`; }
