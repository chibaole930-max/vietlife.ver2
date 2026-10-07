// Game state and economy
// ---------- Generators ----------
function genOrder(){
  const h=pick(HOUSES), dp=BY.depot.front, d=Math.abs(h.front.x-dp.x)+Math.abs(h.front.y-dp.y);
  const p=pick(PACKS), rush=R()<.3;
  const payv=Math.round((12000+d*1100)*p[2]*(rush?1.45:1)*(1+.08*(lvl('ship')-1))/1000)*1000;
  return {id:uid(),house:h.id,name:p[0],icon:p[1],need:p[3],rush,pay:payv,win:Math.round(rush?18+d*.9:25+d*1.8),dist:d};
}
function genProject(vip){
  const L=lvl('dev'), maxT=Math.min(PTYPES.length-1, L+(vip?2:0));
  const ti=rint(0,maxT), pt=PTYPES[ti];
  const work=Math.round(pt[1]*(.9+R()*.35)*2)/2;
  const payv=Math.round(work*60000*(1+.1*ti)*(vip?1.8:1)/10000)*10000;
  return {id:uid(),title:pt[0],icon:pt[2],client:pick(CLIENTS),work,pay:payv,win:Math.round(work*60*1.7+90),vip:!!vip,tier:ti};
}
function ensureOrders(){ if (s.t-s.ordersAt>=120 || s.orders.length<3){ s.orders=Array.from({length:5},genOrder); s.ordersAt=s.t; } }
function ensureProjects(){ if (s.t-s.projAt>=180 || s.projects.length<2){ s.projects=Array.from({length:3},()=>genProject(false)); if (s.unlocks.vip) s.projects.push(genProject(true)); s.projAt=s.t; } }

// ---------- Day cycle ----------
function newDay(){
  const base=(s.day-1)*DAY;
  s.mods={}; s.dayLog=[]; s.dayMoney=s.money;
  const majors=Object.keys(EV).filter(k=>EV[k].major), minors=Object.keys(EV).filter(k=>!EV[k].major);
  const evs=[];
  const mk=(k,at)=>evs.push({id:uid(),k,at:base+at,st:'wait',data:EV[k].init?EV[k].init():{}});
  mk(pick(majors), rint(4,11)*60);
  shuffle(minors).slice(0,rint(2,4)).forEach(k=>mk(k, rint(1,14)*60+rint(0,3)*15));
  s.events=evs.sort((a,b)=>a.at-b.at);
  // loan market
  s.offers=Object.entries(LENDERS).filter(()=>R()<.75).map(([id,L])=>({id:uid(),from:id,amount:Math.round(rint(2,L.max/100000)*100000),rate:L.rate,days:rint(1,3),minRep:L.minRep}));
  s.reqs=s.reqs.filter(r=>false);
  const askers=shuffle(['phat','tuan','linh','khoa','hung']).slice(0,rint(1,2));
  askers.forEach(id=>{ const amt=rint(1,4)*100000; s.reqs.push({id:uid(),from:id,amount:amt,back:Math.round(amt*(1.15+R()*.15)/10000)*10000,days:rint(1,2)}); });
  const mj=s.events.find(e=>EV[e.k].major);
  news(`Ngày ${s.day} bắt đầu. Sự kiện lớn hôm nay: ${EV[mj.k].t} lúc ${clockStr(mj.at)}.`,'eco');
}
function endDay(){
  const res=[];
  if (s.money>=20000){ s.money-=20000; res.push('Trả tiền trọ: -20k'); } else { repDelta(-2); res.push('Không đủ tiền trọ, chủ nhà phàn nàn: Uy tín -2'); }
  for (const l of s.loans){
    if (l.paid || l.over) continue;
    if (l.due<=s.day){ l.over=true; repDelta(-15); s.stats.defaulted++; res.push(`Quá hạn nợ ${nameOf(l.from)} ${kf(l.owe)}: Uy tín -15`);
      news(`${s.name} chưa trả ${kf(l.owe)} cho ${nameOf(l.from)} dù đã tới hạn. ${nameOf(l.from)} đăng status "tin người quá".`,'drama',['me',l.from]); }
  }
  for (const l of s.lent){
    if (l.done || l.due>s.day) continue;
    l.done=true; const b=bot(l.to), st=bstate(l.to);
    if (R()<b.honesty){ gain(l.back); res.push(`${b.name} trả nợ đúng hạn: +${kf(l.back)}`); news(`${b.name} trả đủ ${kf(l.back)} cho ${s.name}, đúng hẹn.`,'good',[l.to,'me']); }
    else { st.unpaid++; st.rep=Math.max(0,st.rep-12); res.push(`${b.name} không trả ${kf(l.back)}. Mất trắng.`); news(`${b.name} lặn mất tăm, chưa trả ${kf(l.back)} vay của ${s.name}. Cả phường đang hóng.`,'drama',[l.to,'me']); }
  }
  s.summary={day:s.day,start:s.dayMoney,end:s.money,worth:netWorth(),lines:[...s.dayLog.slice(-8),...res]};
  if(online?.status==='connected') toast(`🌙 Ngày ${s.day} kết thúc · Tài sản ${kf(s.money)}. Ngày mới sẽ bắt đầu cùng mọi người.`,'ev');
  else openPanel('day');
}
function startNextDay(){ s.day++; s.t=(s.day-1)*DAY; s.nextBot=s.t+30; s.nextPrice=s.t+60; newDay(); save(); toast(`☀️ Ngày ${s.day}, 06:00. Chúc một ngày nhiều đơn.`,'ev'); }

// ---------- World tick ----------
function tickWorld(a,b){
  let guard=0; while (s.nextBot<=b && guard++<40){ botSim(); s.nextBot+=30; }
  guard=0; while (s.nextPrice<=b && guard++<20){ drift(); s.nextPrice+=60; }
  for (const e of s.events){
    if (e.st==='wait' && e.at<=b){
      if (EV[e.k].ok && !EV[e.k].ok(e)){ e.st='skip'; continue; }
      e.st='open'; e.exp=e.at+180; toast(`📅 ${EV[e.k].major?'SỰ KIỆN LỚN':'Sự kiện'}: ${EV[e.k].t}. Mở Sự kiện để xử lý.`,'ev');
    } else if (e.st==='open' && b>=e.exp){
      e.st='missed'; const r=EV[e.k].miss ? EV[e.k].miss(e) : null; e.result=r||'Bạn đã bỏ lỡ sự kiện này.';
      if (r) toast(`Bỏ lỡ: ${EV[e.k].t}. ${r}`,'bad');
    }
  }
  for (const m of s.machines){
    if (m.busy && m.busy.done!=null && m.busy.done<=b){
      const M=MACH[m.type]; const bonus=lvl('ind')>=3?1:0;
      Object.entries(M.out).forEach(([k,v])=>addItem(k,v+bonus)); m.busy=null; s.stats.crafts++; xpAdd('ind',12);
      toast(`${M.i} ${M.n} xong mẻ: ${Object.entries(M.out).map(([k,v])=>`+${v+bonus} ${ITEMS[k].n}`).join(', ')}`,'good');
    }
  }
  const spoiled=s.food.filter(f=>f.exp<=b);
  if (spoiled.length){ const q=spoiled.reduce((x,f)=>x+f.q,0); s.food=s.food.filter(f=>f.exp>b); s.stats.spoiled+=q; s.spoiledDay=s.day; toast(`🤢 ${q} món ăn đã hỏng và bị bỏ đi.`,'bad'); }
  for (const c of s.carry) if (!c.lateTold && b>c.dl){ c.lateTold=true; toast(`⏰ Đơn ${c.name} tới ${BY[c.house].name} đã trễ hạn.`,'bad'); }
  if (s.proj && b>s.proj.dl){
    const p=s.proj; s.proj=null; repDelta(-8); s.stats.cancels++;
    toast(`💻 Trễ deadline project ${p.title}. Khách huỷ hợp đồng. Uy tín -8.`,'bad'); logMe(`Trễ deadline ${p.title} của ${p.client}`);
    news(`${p.client} bóc phốt ${s.name}: nhận project ${p.title} rồi để trễ deadline.`,'drama',['me']);
  }
  for (const c of s.contracts){
    if (!c.done && b>c.dl){ c.done=true; c.failed=true; repDelta(-10); s.stats.cancels++; toast(`📑 Không giao kịp hợp đồng ${c.title}. Uy tín -10.`,'bad');
      news(`${s.name} ký hợp đồng ${c.title} rồi... không giao. Doanh nghiệp đã gạch tên khỏi danh sách đối tác.`,'drama',['me']); }
  }
  s.plots.forEach((p,i)=>{ if (p.crop && !p.told && b>=p.ready){ p.told=true; toast(`🌾 Ruộng số ${i+1} đã chín, ra thu hoạch thôi.`,'good'); } });
}
function drift(){
  for (const k of Object.keys(ITEMS)){ let m=s.market.mult[k]||1; m+= (1-m)*.08 + (R()-.5)*.07; s.market.mult[k]=clamp(m,.5,1.9); }
}

// ---------- Bots ----------
function botSim(){
  for (const b of s.bots){ const d=bot(b.id); b.money+=rint(5,45)*1000*(d.job==='trade'?1.4:1); if (d.id==='phat') b.money-=rint(0,40)*1000; b.money=Math.max(20000,b.money); }
  if (R()<.5){ const b=pick(BOTS); const it=pick(BOT_GOODS[b.job]); const q=rint(2,8); s.market.listings.push({id:uid(),seller:b.id,it,q,p:Math.max(500,Math.round(fair(it)*(.85+R()*.35)/500)*500),at:s.t}); }
  for (const L of s.market.listings.filter(l=>l.seller==='me')){
    const ratio=L.p/fair(L.it), prob=clamp(.6-(ratio-.9)*1.3,.03,.75);
    if (R()<prob){ const q=rint(1,L.q); const buyer=pick(BOTS); L.q-=q; gain(q*L.p); s.stats.mktSold+=q; bstate(buyer.id).money-=q*L.p;
      toast(`🛒 ${buyer.name} mua ${q} ${ITEMS[L.it].n} của bạn: +${kf(q*L.p)}`,'good'); logMe(`Bán ${q} ${ITEMS[L.it].n} cho ${buyer.name}`); }
  }
  s.market.listings=s.market.listings.filter(l=>l.q>0 && (l.seller==='me' || s.t-l.at<480));
  if (s.market.listings.filter(l=>l.seller!=='me').length>26) s.market.listings.splice(s.market.listings.findIndex(l=>l.seller!=='me'),1);
  if (R()<.08) maiGom();
  if (R()<.24) botStory();
  for (const n of s.news.slice(0,8)) if (R()<.3) n.r[pick(['like','like','wow','haha'])]++;
  for (const n of s.news) if (n.kind==='ask' && n.cm.length<3 && R()<.45){ const b=pick(BOTS); n.cm.push({who:b.id,txt:pick(REPLIES)}); if (n.who.includes('me')) toast(`💬 ${b.name} trả lời câu hỏi của bạn trên Tin phường.`,'ev'); }
}
function maiGom(){
  const it=pick(['gao','lua','thit_bo','rau']); const up=rint(10,25);
  s.market.mult[it]=clamp(s.market.mult[it]*(1+up/100),.5,1.9);
  s.market.listings=s.market.listings.filter(l=>!(l.it===it && l.seller!=='me' && R()<.6));
  news(`Mai Đầu Cơ vừa gom ${rint(15,40)} ${ITEMS[it].n.toLowerCase()} trên chợ. Giá ${ITEMS[it].n.toLowerCase()} nhích lên ${up}%.`,'eco',['mai']);
}
function botStory(){
  const t=clockStr(s.t);
  const S=[
    ['tuan',()=>`Tuấn Shipper vừa chạy 12 đơn liên tiếp không trễ đơn nào. Có ai đua được không?`,'good'],
    ['tuan',()=>`Tuấn Shipper kẹt xe ở ngã tư Hàng Đào, 2 đơn trễ hạn. Khách đang gọi liên tục.`,'eco'],
    ['linh',()=>`Xe bánh mì của Linh Bánh Mì hết hàng lúc ${t}. Ai đến muộn thì đành nhịn.`,'good'],
    ['khoa',()=>`Khoa Dev bàn giao project cho ${pick(CLIENTS)}, khách để lại 5 sao.`,'good'],
    ['khoa',()=>`Khoa Dev giao vội project, khách phát hiện 3 bug ngay hôm sau. Comment đang nóng.`,'drama'],
    ['sau',()=>`Bà Sáu Ruộng thu hoạch xong, bán rau rẻ hơn chợ cho hàng xóm.`,'good'],
    ['hung',()=>`Máy xay của Hùng Xưởng kẹt giữa ca, cả xóm nghe tiếng. Giá gạo có khi lên.`,'eco'],
    ['phat',()=>`Phát Hay Vay đăng story khoe xe mới. Mấy người cho Phát vay đang hỏi nhau: tiền đâu ra?`,'drama'],
    ['ngoc',()=>`Ngọc Hay Giúp lại cho Phát Hay Vay mượn thêm 200k. Cả phường lo hộ.`,'drama'],
    ['mai',()=>`Mai Đầu Cơ hỏi trên bảng tin: "Ai đang ôm gạo thì bán lại cho Mai giá tốt nhé." Nhiều người nghi ngờ.`,'eco'],
  ];
  const [id,f,k]=pick(S);
  if (id==='hung') s.market.mult.gao=clamp(s.market.mult.gao*1.08,.5,1.9);
  if (id==='sau') s.market.listings.push({id:uid(),seller:'sau',it:'rau',q:rint(5,10),p:Math.round(fair('rau')*.8/500)*500,at:s.t});
  news(f(),k,[id]);
}
const BOT_DEST = ALLB.filter(b=>b.kind!=='lm').map(b=>b.id);
function botWalkPoint(b){
  const f=b.front, p=nearestPedestrian(f.x,f.y);
  return p||{x:f.x,y:f.y};
}
function spawnBots(){
  for (const b of BOTS){ const d=botWalkPoint(BY[pick(BOT_DEST)]); ents[b.id]={x:d.x*TS+TS/2,y:d.y*TS+TS/2,path:[],wait:R()*3,hidden:false,face:1,step:R()*6}; }
}
function updateBots(dt){
  for (const b of BOTS){
    const e=ents[b.id]; if (!e) continue;
    if (e.wait>0){ e.wait-=dt; if (e.wait<=0) e.hidden=false; continue; }
    if (!e.path.length){
      const d=botWalkPoint(BY[pick(BOT_DEST)]); e.path=pedestrianPath(Math.floor(e.x/TS),Math.floor(e.y/TS),d.x,d.y)||[];
      if (!e.path.length){ e.wait=1; continue; }
    }
    const n=e.path[0], tx=n.x*TS+TS/2, ty=n.y*TS+TS/2, dx=tx-e.x, dy=ty-e.y, dist=Math.hypot(dx,dy), sp=TS*2.3*dt;
    if (dist<=sp){ e.x=tx; e.y=ty; e.path.shift(); if (!e.path.length){ e.wait=2+R()*6; e.hidden=R()<.55; } }
    else { e.x+=dx/dist*sp; e.y+=dy/dist*sp; if (Math.abs(dx)>1) e.face=Math.sign(dx); }
    e.step+=dt*8;
  }
}

// ---------- Events ----------
const EV = {
  granny:{t:'Bà cụ nhờ xách đồ',i:'👵',d:()=>'Bà cụ đầu ngõ xách túi gạo 10kg, nhờ bạn mang giúp về tận nhà. Mất khoảng 30 phút.',
    c:[{l:'Giúp bà (30 phút)',f:()=>{ if(!advance(30)) return null; repDelta(2); s.stats.helped++; if (R()<.5) news(`${s.name} xách gạo giúp bà cụ đầu ngõ. Bà khen nức nở với cả xóm.`,'good',['me']); return 'Bà cảm ơn rối rít, còn dúi cho nắm kẹo lạc. Uy tín +2.'; }},
       {l:'Xin lỗi bà, đang vội',f:()=>'Bạn đi tiếp. Không ai để ý, lần này.'}]},
  wallet:{t:'Nhặt được ví',i:'👛',d:()=>'Bạn nhặt được một cái ví trước cổng chợ: 150 nghìn, căn cước và tấm ảnh gia đình.',
    c:[{l:'Mang trả chủ',f:()=>{ repDelta(4); fameDelta(1,'Trả ví'); news(`${s.name} nhặt được ví và trả lại đủ cho chủ. Chủ ví đăng bài cảm ơn, 40 người thả tim.`,'good',['me']); return 'Chủ ví mừng rơi nước mắt. Uy tín +4, Fame +1.'; }},
       {l:'Giữ 150k',f:()=>{ gain(150000); if (R()<.35){ repDelta(-10); news(`Camera chợ quay được ${s.name} nhặt ví rồi bỏ túi. Bài đăng đang lan khắp phường.`,'drama',['me']); return 'Bạn được 150k... nhưng camera chợ đã quay lại. Uy tín -10.'; } return '+150k. Không ai biết, chắc vậy.'; }}]},
  botLoan:{t:'Có người hỏi vay gấp',i:'🙏',init:()=>{ const id=pick(['phat','tuan','linh','khoa','hung']); const a=rint(1,3)*100000; return {from:id,amount:a,back:Math.round(a*1.25/10000)*10000}; },
    d:e=>`${nameOf(e.data.from)} nhắn: "Cho mình vay ${kf(e.data.amount)}, mai trả ${kf(e.data.back)} nhé, gấp lắm." Uy tín của ${nameOf(e.data.from)} hiện là ${Math.round(bstate(e.data.from).rep)}.`,
    c:[{l:'Cho vay',f:e=>{ if(!pay(e.data.amount)) return null; s.lent.push({id:uid(),to:e.data.from,amount:e.data.amount,back:e.data.back,due:s.day+1}); s.stats.lentN++; logMe(`Cho ${nameOf(e.data.from)} vay ${kf(e.data.amount)}`); return `Đã chuyển ${kf(e.data.amount)}. Hạn trả: hết ngày ${s.day+1}.`; }},
       {l:'Từ chối',f:e=>`Bạn từ chối khéo. ${nameOf(e.data.from)} thả một biểu tượng buồn.`}]},
  tea:{t:'Rủ góp vốn bán trà đá',i:'🧊',d:()=>'Hội bạn rủ góp 200k mở xe trà đá ngay ngã tư, chia lãi cuối ngày. Nghe hấp dẫn, nhưng ngã tư hay bị nhắc nhở.',
    c:[{l:'Góp 200k',f:()=>{ if(!pay(200000)) return null; if (R()<.55){ gain(380000); news(`Xe trà đá ${s.name} góp vốn cháy hàng, lãi gần gấp đôi.`,'good',['me']); return 'Cháy hàng! Nhận về 380k.'; } news(`Xe trà đá ${s.name} góp vốn bị dẹp sau 2 tiếng. Hội bạn đang đổ lỗi cho nhau.`,'drama',['me']); return 'Xe bị dẹp. Mất 200k.'; }},
       {l:'Thôi, không góp',f:()=>'Bạn giữ tiền trong túi.'}]},
  vegSpike:{t:'Cháy hàng rau',i:'🥬',d:()=>'Mưa lớn ở vùng rau ngoại thành, rau về chợ ít hẳn. Giá rau trên chợ đang tăng mạnh.',
    c:[{l:'Đã hiểu',f:()=>{ s.market.mult.rau=clamp(s.market.mult.rau*1.4,.5,1.9); s.market.mult.rau_sach=clamp(s.market.mult.rau_sach*1.25,.5,1.9); news('Giá rau trên chợ tăng 40% do mưa lớn. Ai có ruộng rau đang cười tươi.','eco'); return 'Giá rau +40%. Nếu có rau trong kho, đây là lúc bán.'; }}],
    miss:()=>{ s.market.mult.rau=clamp(s.market.mult.rau*1.4,.5,1.9); return null; }},
  blackout:{t:'Mất điện khu xưởng',i:'🔌',ok:()=>s.machines.some(m=>m.busy&&m.busy.done!=null),d:()=>'Khu xưởng mất điện đột xuất. Máy đang chạy sẽ dừng khoảng 1 giờ, trừ khi bạn thuê máy phát.',
    c:[{l:'Thuê máy phát (50k)',f:()=>{ if(!pay(50000)) return null; return 'Máy phát nổ giòn, dây chuyền chạy tiếp.'; }},
       {l:'Chờ có điện',f:()=>{ s.machines.forEach(m=>{ if (m.busy&&m.busy.done!=null) m.busy.done+=60; }); return 'Các máy đang chạy bị chậm thêm 1 giờ.'; }}],
    miss:()=>{ s.machines.forEach(m=>{ if (m.busy&&m.busy.done!=null) m.busy.done+=60; }); return 'Máy chậm 1 giờ do mất điện.'; }},
  bulk:{t:'Đặt 6 suất cơm trưa',i:'🍱',d:()=>`Văn phòng bên cạnh cần 6 suất ăn bất kỳ, trả gấp rưỡi giá chợ. Bạn đang có ${dishCount()} món.`,
    c:[{l:'Giao 6 suất',req:()=>dishCount()>=6,rt:'Cần 6 món ăn',f:()=>{ let sum=0,n=6; s.food.sort((a,b)=>a.exp-b.exp); while(n>0){ const f=s.food[0]; sum+=fair(f.it)*1.5; takeItem(f.it,1); n--; } gain(sum); s.stats.dishesSold+=6; xpAdd('cook',15); repDelta(1); return `Giao xong 6 suất, nhận ${kf(sum)}. Văn phòng hứa đặt tiếp.`; }},
       {l:'Từ chối',f:()=>'Văn phòng gọi quán khác.'}]},
  coop:{t:'Rủ chạy chung đơn lớn',i:'🤝',init:()=>({partner:pick(['tuan','phat','linh','ngoc'])}),
    d:e=>`${nameOf(e.data.partner)} rủ bạn chạy chung một đơn hàng lớn: tiền chia đôi, mỗi người một nửa quãng đường. Bạn sẽ nhận đơn ở Trạm Giao Hàng.`,
    c:[{l:'Nhận kèo',f:e=>{ const o=genOrder(); o.name='Đơn chung: thùng hàng lớn'; o.icon='🤝'; o.pay=Math.round(o.pay*2.4/1000)*1000; o.win+=40; o.need=0; o.partner=e.data.partner; s.orders.unshift(o); return `Đơn chung đã có ở Trạm Giao Hàng. Tổng ${kf(o.pay)}, chia với ${nameOf(o.partner)}.`; }},
       {l:'Thôi',f:()=>'Bạn từ chối kèo.'}]},
  rent:{t:'Chủ trọ thu tiền điện nước',i:'💡',d:()=>'Chủ trọ gõ cửa thu tiền điện nước tháng này: 60 nghìn.',
    c:[{l:'Trả ngay 60k',f:()=>{ if(!pay(60000)) return null; repDelta(1); return 'Chủ trọ gật gù: "Thuê trọ phải như cháu."'; }},
       {l:'Khất vài hôm',f:()=>{ repDelta(-3); return 'Chủ trọ nhăn mặt. Uy tín -3.'; }}],
    miss:()=>{ repDelta(-2); return 'Chủ trọ không gặp bạn, kể với hàng xóm. Uy tín -2.'; }},
  share:{t:'Đồng nghiệp xin share việc',i:'👩‍💻',ok:()=>!!s.proj,d:()=>'Một dev ở co-working muốn làm chung project của bạn: làm giúp 40% khối lượng, đổi lại lấy 30% tiền.',
    c:[{l:'Chia việc',f:()=>{ if(!s.proj) return null; s.proj.done=Math.min(s.proj.work,s.proj.done+s.proj.work*.4); s.proj.pay=Math.round(s.proj.pay*.7/1000)*1000; return 'Project tiến thêm 40%. Tiền công còn 70%.'; }},
       {l:'Tự làm',f:()=>'Bạn giữ project cho riêng mình.'}]},
  rumor:{t:'Tin đồn gom hàng',i:'🗣️',init:()=>({it:pick(['gao','lua','thit_bo'])}),
    d:e=>`Có tin đồn Mai Đầu Cơ sắp gom ${ITEMS[e.data.it].n.toLowerCase()}. Giá hiện tại ${kf(fair(e.data.it))}. Mua trước 5 phần để đón sóng?`,
    c:[{l:'Mua 5 phần',f:e=>{ const it=e.data.it, c=fair(it)*5; if(!pay(c)) return null; addItem(it,5); s.mbought[it]=(s.mbought[it]||0)+5;
         if (R()<.6){ s.market.mult[it]=clamp(s.market.mult[it]*1.3,.5,1.9); news(`Tin đồn thành thật: Mai Đầu Cơ gom ${ITEMS[it].n.toLowerCase()}, giá tăng 30%. ${s.name} đã kịp lên thuyền.`,'eco',['mai','me']); return `Tin đồn đúng! Giá ${ITEMS[it].n} tăng 30%. Bán trên Chợ để chốt lời.`; }
         s.market.mult[it]=clamp(s.market.mult[it]*.85,.5,1.9); news(`Tin đồn gom ${ITEMS[it].n.toLowerCase()} là giả. Giá giảm 15%, vài người ôm hàng.`,'drama',['me']); return 'Tin đồn giả, giá giảm 15%. Bạn đang ôm hàng.'; }},
       {l:'Không tin',f:()=>'Bạn đứng ngoài cuộc chơi.'}]},
  // ----- major -----
  festival:{major:1,t:'Lễ hội ẩm thực phường',i:'🎪',d:()=>'Cả ngày hôm nay món ăn bán giá cao hơn 60%. Thuê gian hàng 100k để bán toàn bộ món đang có với giá gấp đôi và được lên bảng tin.',
    c:[{l:'Thuê gian hàng (100k)',f:()=>{ s.mods.dish=1.6; if(!pay(100000)) return null; let n=0,sum=0; for (const f of s.food){ sum+=f.q*fair(f.it)*1.25; n+=f.q; } s.food=[]; gain(sum); s.stats.dishesSold+=n; xpAdd('cook',n*3);
         if (n>=5){ fameDelta(2,'Lễ hội'); news(`Gian hàng của ${s.name} bán sạch ${n} món ở lễ hội ẩm thực. Hàng người xếp dài tới tận chợ.`,'good',['me']); }
         return n?`Bán hết ${n} món, thu ${kf(sum)}.${n>=5?' Fame +2.':''}`:'Gian hàng trống trơn vì bạn chưa có món nào. Mất 100k phí thuê.'; }},
       {l:'Chỉ đi dạo xem',f:()=>{ s.mods.dish=1.6; return 'Món ăn bán ở quán hôm nay vẫn được giá +60%.'; }}],
    miss:()=>{ s.mods.dish=1.6; return null; }},
  storm:{major:1,t:'Bão sắp về',i:'🌀',d:()=>'Đài báo bão đổ bộ chiều nay. Ruộng đang trồng và máy móc có thể hỏng. Chằng chống hết mất 80k.',
    c:[{l:'Chằng chống (80k)',f:()=>{ if(!pay(80000)) return null; news(`Bão qua phường. ${s.name} chằng chống kỹ, ruộng và xưởng không hề hấn.`,'good',['me']); return 'Bão qua, mọi thứ an toàn.'; }},
       {l:'Liều, không sao đâu',f:()=>stormHit()}],
    miss:()=>stormHit()},
  hack:{major:1,t:'Hackathon phường',i:'🏆',d:()=>`Cuộc thi code 3 tiếng, giải nhất 800k và rất nhiều tiếng tăm. Cơ hội thắng tăng theo cấp Lập trình (hiện cấp ${lvl('dev')}).`,
    c:[{l:'Tham gia (3 giờ)',f:()=>{ if(!advance(180)) return null; xpAdd('dev',40); if (R()<.15+.12*lvl('dev')){ gain(800000); fameDelta(4,'Vô địch Hackathon'); news(`${s.name} vô địch Hackathon phường! Khoa Dev xin kết bạn.`,'good',['me','khoa']); return 'Bạn vô địch! +800k, Fame +4.'; } fameDelta(1,'Tham gia Hackathon'); return 'Không có giải, nhưng được cộng đồng dev biết tới. Fame +1.'; }},
       {l:'Không tham gia',f:()=>'Bạn tập trung việc của mình.'}]},
  inspect:{major:1,t:'Đoàn kiểm tra VSATTP',i:'🕵️',d:()=>'Đoàn kiểm tra vệ sinh an toàn thực phẩm đang đi từng quán. Quán nào để đồ ăn hỏng hôm nay sẽ bị phạt.',
    c:[{l:'Mời đoàn vào',f:()=>{ if (s.spoiledDay===s.day){ s.money-=200000; repDelta(-5); news(`Quán của ${s.name} bị phạt 200k vì để đồ ăn hỏng.`,'drama',['me']); return 'Đoàn phát hiện đồ ăn hỏng. Phạt 200k, Uy tín -5.'; } repDelta(3); fameDelta(1,'Quán sạch'); news(`Quán của ${s.name} đạt chuẩn vệ sinh, được dán tem xanh.`,'good',['me']); return 'Quán sạch sẽ. Uy tín +3, Fame +1.'; }},
       {l:'Đóng cửa nghỉ',f:()=>{ repDelta(-4); news(`Quán của ${s.name} đóng cửa đúng lúc đoàn kiểm tra tới. Hàng xóm xì xào.`,'drama',['me']); return 'Bạn tránh được kiểm tra, nhưng cả phường thấy. Uy tín -4.'; }}]},
  contract:{major:1,t:'Doanh nghiệp tìm nhà cung cấp',i:'📑',init:()=>{ const it=pick(['gao','rau_sach','banh_pho','rau']); return {it,qty:rint(4,8)}; },
    d:e=>`Công ty thực phẩm cần ${e.data.qty} ${ITEMS[e.data.it].n.toLowerCase()} trước 22:00 hôm nay, trả 1,7 lần giá chợ. Ký rồi không giao là mất uy tín nặng.`,
    c:[{l:'Ký hợp đồng',f:e=>{ const c={id:uid(),title:`${e.data.qty} ${ITEMS[e.data.it].n}`,it:e.data.it,qty:e.data.qty,pay:Math.round(fair(e.data.it)*1.7*e.data.qty/1000)*1000,dl:s.day*DAY-1}; s.contracts.push(c); return `Đã ký. Giao ở Chợ Đồng Xuân (tab Hợp đồng) trước 22:00, nhận ${kf(c.pay)}.`; }},
       {l:'Từ chối',f:()=>'Bạn không nhận.'}]},
  crash:{major:1,t:'Giá lúa sập',i:'📉',d:()=>`Thương lái ép giá, lúa trên chợ giảm 45%. Gom 6 lúa với giá ${kf(Math.round(fair('lua')*.55/500)*500)} một phần?`,
    c:[{l:'Gom 6 lúa',f:()=>{ s.market.mult.lua=clamp(s.market.mult.lua*.55,.5,1.9); const c=fair('lua')*6; if(!pay(c)) return null; addItem('lua',6); s.mbought.lua=(s.mbought.lua||0)+6; news(`Giá lúa sập 45%. ${s.name} gom hàng giá đáy.`,'eco',['me']); return `Đã gom 6 lúa, tổng ${kf(c)}. Giá sẽ hồi dần.`; }},
       {l:'Đứng ngoài',f:()=>{ s.market.mult.lua=clamp(s.market.mult.lua*.55,.5,1.9); return 'Giá lúa giảm 45%.'; }}],
    miss:()=>{ s.market.mult.lua=clamp(s.market.mult.lua*.55,.5,1.9); return null; }},
};
function stormHit(){
  let lost=0, broke=0;
  s.plots.forEach(p=>{ if (p.crop && s.t<p.ready && R()<.5){ p.crop=null; lost++; } });
  s.machines.forEach(m=>{ if (R()<.4){ m.broken=true; broke++; } });
  if (lost||broke) news(`Bão quét qua phường: ${s.name} mất ${lost} ruộng, hỏng ${broke} máy.`,'drama',['me']);
  return `Bão qua. Mất ${lost} ruộng đang trồng, hỏng ${broke} máy.`;
}
const dishCount = () => s.food.reduce((a,f)=>a+f.q,0);
