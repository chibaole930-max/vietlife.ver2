// HUD and panels
// ---------- Actions ----------
const ACTS = {
  tab(v){ panel.tab=v; },
  confirm(v){ panel.confirm=v||null; },
  nav(v){ navTo(v); },
  sleep(){ const a=s.t; s.t=s.day*DAY; tickWorld(a,s.t); if(online?.status==='connected')onlineAdvanceClock(s.t-a); closePanelSilently(); },
  useVeh(v){ s.veh=+v; toast(`Đổi sang ${VEH[s.veh].n}.`); },
  takeOrder(v){ const o=s.orders.find(x=>x.id===v); if (!o) return; if (s.carry.length>=VEH[s.veh].cap) return toast('Xe đã đầy đơn.','bad');
    s.carry.push({...o,dl:s.t+o.win}); s.orders=s.orders.filter(x=>x.id!==v); toast(`${o.icon} Nhận đơn tới ${BY[o.house].name}. Còn ${o.win} phút.`,'good');
    if (R()<.18){ const tip=pick(['Khách dặn: "Gọi trước 5 phút nhé em."','Khách dặn để hàng ở bác bảo vệ.','Khách nhắn: "Có phụ phí mưa không em?"']); toast('💬 '+tip); } },
  takeProj(v){ const P=s.projects.find(x=>x.id===v); if (!P||s.proj) return; s.proj={...P,done:0,dl:s.t+P.win,cr:null,crFeat:pick(['đăng nhập Zalo','xuất file Excel','dark mode','thanh toán QR','gửi thông báo'])}; s.projects=s.projects.filter(x=>x.id!==v); toast(`💻 Nhận project ${P.title} của ${P.client}.`,'good'); },
  code(v){ const P=s.proj; if (!P) return; const m=+v; if (!advance(m)) return; if (!s.proj) return; const L=lvl('dev'); P.done=Math.min(P.work,P.done+(m/60)*(1+.2*(L-1))); xpAdd('dev',Math.round(m/60*10));
    if (P.cr==null && P.done/P.work>=.4){ P.cr=R()<.45?'ask':'none'; if (P.cr==='ask') toast(`💬 ${P.client} vừa nhắn yêu cầu thêm.`,'ev'); } },
  cr(v){ const P=s.proj; if (!P) return;
    if (v==='yes'){ P.work=Math.round(P.work*1.4*2)/2; P.pay=Math.round(P.pay*1.35/1000)*1000; P.dl+=120; repDelta(1); toast('Khách vui vẻ, thêm 2 giờ deadline.','good'); }
    if (v==='no'){ repDelta(-1); toast('Khách hơi tiếc nhưng hiểu.'); }
    if (v==='haggle'){ if (R()<.5){ P.work=Math.round(P.work*1.4*2)/2; P.pay=Math.round(P.pay*1.7/1000)*1000; P.dl+=120; toast('Khách đồng ý trả thêm. Khéo đấy!','good'); } else { repDelta(-3); toast('Khách bực: "Làm gì mà chặt chém vậy." Uy tín -3.','bad'); news(`${P.client} kể trên bảng tin: freelancer ${s.name} hét giá gấp đôi cho một tính năng nhỏ.`,'drama',['me']); } }
    P.cr='none'; },
  submit(v){ const P=s.proj; if (!P) return;
    if (v==='full'){ gain(P.pay); repDelta(2); s.stats.devFull++; xpAdd('dev',Math.round(P.work*12)); if (P.vip) fameDelta(1,'Project VIP'); toast(`✅ Bàn giao ${P.title}: +${kf(P.pay)}`,'good'); logMe(`Bàn giao ${P.title} cho ${P.client}`); if (P.pay>=500000) news(`${s.name} bàn giao ${P.title} cho ${P.client}, khách khen chạy mượt.`,'good',['me']); }
    if (v==='rush'){ s.stats.devRush++; if (R()<.5){ const a=Math.round(P.pay*.5/1000)*1000; gain(a); repDelta(-5); toast(`🐞 Khách phát hiện bug. Chỉ nhận ${kf(a)}. Uy tín -5.`,'bad'); news(`${P.client} phàn nàn ${s.name} giao project ${P.title} đầy bug.`,'drama',['me']); } else { gain(P.pay); xpAdd('dev',Math.round(P.work*6)); toast(`😅 Giao vội mà trót lọt: +${kf(P.pay)}`,'good'); } logMe(`Giao vội ${P.title}`); }
    if (v==='cancel'){ repDelta(-6); s.stats.cancels++; toast('Huỷ hợp đồng. Uy tín -6.','bad'); news(`${s.name} huỷ ngang project ${P.title} của ${P.client}.`,'drama',['me']); logMe(`Huỷ project ${P.title}`); }
    s.proj=null; },
  unlock(v){ const cost=v==='vip'?5:(v.startsWith('plot')?PLOTS[+v.slice(4)].fame:VEH[+v.slice(3)].fame); if (s.fame<cost) return toast('Chưa đủ Fame.','bad'); s.fame-=cost; s.unlocks[v]=1; toast(`Đã mở khoá bằng ${cost} Fame.`,'fame'); if (v==='vip') s.projAt=-999; },
  hire(){ if (!advance(120)) return; const w=60000+lvl('farm')*5000; gain(w); xpAdd('farm',6); toast(`Làm thuê xong: +${kf(w)}`,'good'); if (R()<.25) toast('💬 Bà Sáu: "Chăm thế, mai lại sang nhé."'); },
  buySeed(v){ const [k,q]=v.split(':'); const c=fair(k)*+q; if (!pay(c)) return; addItem(k,+q); toast(`Mua ${q} ${ITEMS[k].n}: -${kf(c)}`); },
  goPlot(v){ const P=PLOTS[+v]; closePanel(); goTo({type:'p',p:P}); },
  goPlace(v){ const [how,id]=v.split(':'); const t=id.startsWith('plot')?{type:'p',p:PLOTS[+id.slice(4)]}:{type:'b',b:BY[id]}; closePanel(); goTo(t,how==='auto'); if (how!=='auto') toast('🧭 Đã bật chỉ đường. Đi theo mũi tên vàng.','ev'); },
  buyPlot(v){ const i=+v, P=PLOTS[i]; if (!pay(P.price)) return; s.plots[i].owned=true; logMe(`Mua ruộng số ${i+1}`); toast(`🟫 Bạn đã sở hữu ruộng số ${i+1}!`,'good');
    if (!s.milestones.land){ s.milestones.land=1; fameDelta(2,'Mảnh đất đầu tiên'); news(`${s.name} vừa tậu mảnh ruộng đầu tiên ở cánh đồng phường. Bà Sáu sang chúc mừng.`,'good',['me','sau']); } },
  plant(v){ const [i,k]=v.split(':'); const st=s.plots[+i], C=CROPS[k]; if (!takeItem(C.seed,3)) return toast('Không đủ hạt.','bad'); st.crop=k; st.at=s.t; st.ready=s.t+C.t; st.pest=R()<.25; st.told=false; toast(`Đã gieo ${C.n}. Chín lúc ${clockStr(st.ready)}.`,'good'); },
  spray(v){ if (!pay(15000)) return; s.plots[+v].pest=false; toast('Đã phun thuốc, sâu chết sạch.','good'); },
  harvest(v){ const i=+v, st=s.plots[i], C=CROPS[st.crop]; let q=Math.round(C.yield*(PLOTS[i].premium?1.5:1))+lvl('farm')-1; if (st.pest){ q=Math.floor(q/2); } addItem(C.out,q); s.stats.harvests++; xpAdd('farm',20); toast(`🌾 Thu hoạch ${q} ${ITEMS[C.out].n}${st.pest?' (sâu ăn mất một nửa)':''}.`,'good'); logMe(`Thu hoạch ${q} ${ITEMS[C.out].n}`); st.crop=null; st.pest=false; },
  buyMach(v){ const M=MACH[v]; if (!pay(M.price)) return; s.machines.push({type:v,busy:null,broken:false}); toast(`${M.i} Mua ${M.n}.`,'good'); logMe(`Mua ${M.n}`);
    if (!s.milestones.mach){ s.milestones.mach=1; fameDelta(2,'Máy móc đầu tiên'); news(`${s.name} sắm ${M.n}, chính thức có xưởng riêng. Hùng Xưởng có đối thủ.`,'good',['me','hung']); } },
  run(v){ const m=s.machines[+v], M=MACH[m.type]; if (!hasAll(M.in)) return toast('Thiếu nguyên liệu.','bad'); takeAll(M.in); const jam=R()<.12; m.busy={done:jam?null:s.t+M.t}; toast(jam?`${M.i} Máy kẹt ngay khi khởi động!`:`${M.i} Bắt đầu chạy, xong lúc ${clockStr(s.t+M.t)}.`,jam?'bad':'good'); },
  unjam(v){ const [i,how]=v.split(':'); const m=s.machines[+i], M=MACH[m.type]; if (how==='pay'){ if (!pay(40000)) return; } else { if (!advance(60)) return; xpAdd('ind',5); } m.busy={done:s.t+M.t}; toast('Máy chạy lại rồi.','good'); },
  fix(v){ const [i]=v.split(':'); if (!pay(80000)) return; s.machines[+i].broken=false; toast('Đã sửa máy.','good'); },
  cook(v){ const Rc=RECIPES[v]; if (!hasAll(Rc.in)) return; if (!advance(Rc.t)) return; takeAll(Rc.in); const q=Rc.out+(lvl('cook')>=3?1:0); addItem(v,q); xpAdd('cook',8); toast(`${ITEMS[v].i} Nấu xong ${q} ${ITEMS[v].n}.`,'good'); },
  buyIng(v){ const [k,q]=v.split(':'); const c=Math.round(fair(k)*1.15/500)*500*+q; if (!pay(c)) return; addItem(k,+q); toast(`Mua ${q} ${ITEMS[k].n}: -${kf(c)}`); },
  sellFood(){ if (!dishCount()) return; if (!advance(60)) return; const base=3+Math.floor(s.rep/25)+Math.floor(s.fame/4); let n=Math.round((base+rint(0,3))*(s.unlocks.rest?1.8:1)); let sold=0,sum=0;
    while (n-->0 && s.food.length){ const f=pick(s.food); const pr=fair(f.it)*(s.unlocks.rest?1.1:1); takeItem(f.it,1); sold++; sum+=pr; }
    gain(sum); s.stats.dishesSold+=sold; xpAdd('cook',sold*3); toast(`🍜 Bán được ${sold} phần: +${kf(sum)}`,'good'); logMe(`Bán ${sold} món ở quán`);
    if (s.stats.dishesSold>=30 && !s.milestones.cook30){ s.milestones.cook30=1; fameDelta(2,'30 món đã bán'); news(`Quán của ${s.name} bắt đầu có khách quen, tối nào cũng kín bàn.`,'good',['me']); } },
  upRest(){ if (s.fame<8||!pay(3e6)) return; s.fame-=8; s.unlocks.rest=1; news(`${s.name} khai trương nhà hàng. Biển hiệu mới sáng nhất phố.`,'good',['me']); toast('🏮 Khai trương nhà hàng!','fame'); },
  borrow(v){ const o=s.offers.find(x=>x.id===v); if (!o) return; if (s.rep<o.minRep) return toast(`${nameOf(o.from)} từ chối: uy tín chưa đủ.`,'bad');
    gain(o.amount); s.loans.push({id:uid(),from:o.from,owe:Math.round(o.amount*(1+o.rate)/1000)*1000,due:s.day+o.days,paid:false,over:false}); s.offers=s.offers.filter(x=>x.id!==v); s.stats.borrowed++; toast(`Vay ${kf(o.amount)} từ ${nameOf(o.from)}.`,'good'); logMe(`Vay ${kf(o.amount)} từ ${nameOf(o.from)}`); },
  repay(v){ const l=s.loans.find(x=>x.id===v); if (!l||!pay(l.owe)) return; l.paid=true; bstate(l.from).money+=l.owe; s.stats.repaid++; repDelta(l.over?5:3); toast(`Đã trả ${kf(l.owe)} cho ${nameOf(l.from)}.`,'good'); logMe(`Trả nợ ${nameOf(l.from)}`);
    if (l.over) news(`${s.name} cuối cùng đã trả nợ ${nameOf(l.from)}. Muộn còn hơn không.`,'eco',['me',l.from]); else if (l.owe>=500000) news(`${s.name} trả đủ ${kf(l.owe)} cho ${nameOf(l.from)} trước hạn.`,'good',['me',l.from]); },
  lend(v){ const r=s.reqs.find(x=>x.id===v); if (!r||!pay(r.amount)) return; s.lent.push({id:uid(),to:r.from,amount:r.amount,back:r.back,due:s.day+r.days}); s.reqs=s.reqs.filter(x=>x.id!==v); s.stats.lentN++; toast(`Cho ${nameOf(r.from)} vay ${kf(r.amount)}.`); logMe(`Cho ${nameOf(r.from)} vay ${kf(r.amount)}`); },
  profileOf(v){ openPanel('profile',{arg:v}); },
  buyL(v){ const [id,q]=v.split(':'); const L=s.market.listings.find(x=>x.id===id); if (!L) return; const n=q==='all'?L.q:1; if (!pay(n*L.p)) return; L.q-=n; addItem(L.it,n); bstate(L.seller).money+=n*L.p; s.mbought[L.it]=(s.mbought[L.it]||0)+n; s.market.listings=s.market.listings.filter(x=>x.q>0); toast(`Mua ${n} ${ITEMS[L.it].n} của ${nameOf(L.seller)}: -${kf(n*L.p)}`); },
  list(){ const it=$('lsIt').value, q=Math.floor(+$('lsQ').value), pr=Math.round(+$('lsP').value/500)*500; if (!it||q<1||pr<500) return toast('Nhập số lượng và giá hợp lệ.','bad'); if (have(it)<q) return toast('Không đủ hàng.','bad');
    takeItem(it,q); s.market.listings.push({id:uid(),seller:'me',it,q,p:pr,at:s.t}); if ((s.mbought[it]||0)>0){ s.stats.flips++; s.mbought[it]=0; } toast(`Đã đăng bán ${q} ${ITEMS[it].n} giá ${kf(pr)}.`,'good'); },
  unlist(v){ const L=s.market.listings.find(x=>x.id===v); if (!L) return; addItem(L.it,L.q); s.market.listings=s.market.listings.filter(x=>x.id!==v); toast('Đã gỡ tin bán.'); },
  npcSell(v){ const [k,q]=v.split(':'); const n=q==='all'?have(k):1; const pr=Math.round(fair(k)*.65/500)*500; if (!takeItem(k,n)) return; gain(pr*n); toast(`Bán ${n} ${ITEMS[k].n} cho thương lái: +${kf(pr*n)}`,'good'); },
  deliverCt(v){ const c=s.contracts.find(x=>x.id===v); if (!c||!takeItem(c.it,c.qty)) return; c.done=true; gain(c.pay); repDelta(4); fameDelta(1,'Hợp đồng doanh nghiệp'); news(`${s.name} giao đủ hợp đồng ${c.title} cho doanh nghiệp, đúng hẹn.`,'good',['me']); toast(`📑 Giao hợp đồng: +${kf(c.pay)}`,'good'); },
  react(v){ const [id,k]=v.split(':'); const n=s.news.find(x=>x.id===id); if (!n) return; if (n.mine[k]){ n.mine[k]=0; n.r[k]--; } else { n.mine[k]=1; n.r[k]++; } },
  ask(){ const q=$('askQ').value.trim(); if (!q) return; news(`${s.name} hỏi: ${q}`,'ask',['me']); toast('Đã đăng câu hỏi. Người trong phường sẽ trả lời dần.'); },
  openEv(v){ openPanel('event',{arg:v}); },
  choose(v){ const [id,i]=v.split(':'); const e=s.events.find(x=>x.id===id); if (!e||e.st!=='open') return; const c=EV[e.k].c[+i]; if (c.req&&!c.req(e)) return; const r=c.f(e); if (r==null) return; e.st='done'; e.result=r; s.stats.eventsDone=(s.stats.eventsDone||0)+1; logMe(`${EV[e.k].t}: ${c.l}`); },
  saveBio(){ const b=$('bioIn').value.trim(); if (b){ s.bio=b; toast('Đã lưu giới thiệu.'); } },
  saveNow(){ save(); toast('Đã lưu.','good'); },
  reset(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} s=null; panel=null; $('sheetWrap').hidden=true; showWelcome(); },
  nextDay(){ closePanel(); },
  buyVeh(v){ const k=+v, V=VEH[k]; if (!pay(V.price)) return; s.vehs.push(k); s.veh=k; toast(`${V.i} Tậu ${V.n}!`,'good'); logMe(`Mua ${V.n}`); news(`${s.name} vừa tậu ${V.n.toLowerCase()}. Đường phường từ nay nhanh hơn.`,'good',['me']); },
};
function closePanelSilently(){ panel=null; $('sheetWrap').hidden=true; }

// ---------- Save / load ----------
function save(){ if (!s) return; try{ localStorage.setItem(SAVE_KEY,JSON.stringify(s)); }catch(e){} }
function load(){ try{ const t=localStorage.getItem(SAVE_KEY); if (!t) return null; const d=JSON.parse(t); return d&&d.v===1?d:null; }catch(e){ return null; } }
