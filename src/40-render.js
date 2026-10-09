// Canvas rendering and street life
const MAPNAME={home:'Trọ',depot:'Giao hàng',market:'Đồng Xuân',ngocson:'Ngọc Sơn'};
const PLACES=[...BUILDINGS,...LANDMARKS];
const SHORT={vanmieu:'Văn Miếu',cotco:'Cột Cờ',nhahat:'Nhà hát Lớn',ga:'Ga Hà Nội',ngocson:'Đền Ngọc Sơn',home:'Phòng trọ',depot:'Trạm giao hàng',market:'Chợ Đồng Xuân',bank:'Vay vốn',garage:'Tiệm xe',farm:'Nhà nông',cowork:'Co-working',food:'Quán ăn',factory:'Xưởng',news:'Bảng tin'};
const PURPOSE={home:'Đi ngủ, đổi xe',depot:'Nhận đơn giao hàng',market:'Mua bán, bán nhanh, hợp đồng',bank:'Vay, cho vay, trả nợ',garage:'Mua xe đạp, xe máy, ba gác',farm:'Làm thuê, hạt giống, mua đất',cowork:'Nhận project lập trình',food:'Nấu và bán đồ ăn',factory:'Mua máy, chế biến nông sản',news:'Tin tức và drama trong phường'};
const meters=d=>{ const m=Math.round(d/TS*5/10)*10; return m>=1000?(m/1000).toFixed(1).replace('.',',')+' km':m+' m'; };
// ---------- Guide (chỉ đường) ----------
let guide=null; // {type:'b',id} | {type:'p',i} | {type:'t',x,y}
function guideTarget(){
  if (!guide||!s) return null;
  if (guide.type==='b'){ const b=BY[guide.id]; return {x:b.front.x*TS+TS/2,y:b.front.y*TS+TS/2,icon:b.icon||'🏠',name:b.kind==='house'?b.name:(SHORT[b.id]||b.name)}; }
  if (guide.type==='p'){ const p=PLOTS[guide.i]; return {x:(p.x+p.w/2)*TS,y:(p.y+p.h/2)*TS,icon:'🌱',name:'Ruộng số '+(guide.i+1)}; }
  return {x:guide.x*TS+TS/2,y:guide.y*TS+TS/2,icon:'📍',name:'Điểm đã chọn'};
}
function setGuide(g){ guide=g; updateGuide(); }
function updateGuide(){
  const el=document.getElementById('guide'), g=guideTarget();
  if (!g){ el.hidden=true; return; }
  el.hidden=false; document.getElementById('guideTx').textContent=`🧭 ${g.icon} ${g.name} · còn ${meters(Math.hypot(g.x-s.x,g.y-s.y))}`;
}
function checkGuideArrival(){
  if (!guide) return; const g=guideTarget();
  if (Math.hypot(g.x-s.x,g.y-s.y)<TS*1.1){ toast(`📍 Đã tới ${g.name}.`,'good'); guide=null; updateGuide(); }
}
// ---------- Map drawing (minimap + big map) ----------
function drawMapTo(c,o={}){
  const cw=c.clientWidth, ch=c.clientHeight; if (!cw||!ch||!staticCv||!s) return;
  const r=Math.min(2,window.devicePixelRatio||1);
  if (c.width!==Math.round(cw*r)||c.height!==Math.round(ch*r)){ c.width=Math.round(cw*r); c.height=Math.round(ch*r); }
  const g=c.getContext('2d'); g.setTransform(r,0,0,r,0,0);
  const sc=Math.min(cw/(MW*TS),ch/(MH*TS)), ox=(cw-MW*TS*sc)/2, oy=(ch-MH*TS*sc)/2, P=(x,y)=>[ox+x*sc,oy+y*sc];
  c._map={sc,ox,oy};
  g.fillStyle='#0c1a29'; g.fillRect(0,0,cw,ch);
  g.drawImage(staticCv,ox,oy,MW*TS*sc,MH*TS*sc);
  g.fillStyle='rgba(12,26,41,.28)'; g.fillRect(ox,oy,MW*TS*sc,MH*TS*sc);
  // owned plots
  s.plots.forEach((st,i)=>{ if (!st.owned) return; const p=PLOTS[i]; const [x,y]=P(p.x*TS,p.y*TS); g.strokeStyle=s.t>=st.ready&&st.crop?'#4cc488':'#f4c534'; g.lineWidth=2; g.strokeRect(x,y,p.w*TS*sc,p.h*TS*sc); });
  // viewport
  if (o.view){ const [x,y]=P(camX,camY); g.strokeStyle='rgba(255,255,255,.8)'; g.lineWidth=1.5; g.strokeRect(x,y,vw/zoom*sc,vh/zoom*sc); }
  // guide line
  const gt=guideTarget();
  if (gt){ const [a,b]=P(s.x,s.y), [x,y]=P(gt.x,gt.y); g.strokeStyle='#f4c534'; g.lineWidth=o.labels?3:2; g.setLineDash([4,4]); g.beginPath();
    if (player.path.length){ g.moveTo(a,b); for (const n of player.path){ const [px,py]=P(n.x*TS+TS/2,n.y*TS+TS/2); g.lineTo(px,py); } } else { g.moveTo(a,b); g.lineTo(x,y); }
    g.stroke(); g.setLineDash([]); g.fillStyle='#f4c534'; g.beginPath(); g.arc(x,y,o.labels?7:4,0,7); g.fill(); }
  // delivery targets
  for (const c2 of s.carry){ const h=BY[c2.house]; const [x,y]=P(h.front.x*TS+TS/2,h.front.y*TS); g.fillStyle='#d8432f'; g.beginPath(); g.arc(x,y,o.labels?6:3.5,0,7); g.fill(); g.strokeStyle='#fff'; g.lineWidth=1; g.stroke(); }
  // buildings
  g.textAlign='center'; g.textBaseline='middle';
  if (o.labels){ g.font='italic 700 11px "Be Vietnam Pro",sans-serif'; g.fillStyle='rgba(255,255,255,.85)'; g.textAlign='center'; for (const L0 of LAKES){ const [x,y]=P(L0.cx*TS,(L0.cy+(L0.id==='guom'?3:0))*TS); g.fillText(L0.name,x,y); } const [rx,ry]=P(74*TS,40*TS); g.save(); g.translate(rx,ry); g.rotate(-Math.PI/2); g.fillText('Sông Hồng',0,4); g.restore(); }
  for (const b of PLACES){ const [x,y]=P((b.x+b.w/2)*TS,(b.y+b.h/2)*TS);
    if (o.labels){ const t=b.icon+' '+(MAPNAME[b.id]||SHORT[b.id]); g.font='700 11px "Be Vietnam Pro",sans-serif'; const w=g.measureText(t).width+12;
      g.fillStyle=guide&&guide.type==='b'&&guide.id===b.id?'#f4c534':'rgba(12,26,41,.88)'; g.beginPath(); g.roundRect?g.roundRect(x-w/2,y-10,w,20,10):g.rect(x-w/2,y-10,w,20); g.fill();
      g.fillStyle=guide&&guide.type==='b'&&guide.id===b.id?'#231900':'#fff'; g.fillText(t,x,y+1); }
    else { g.font=(cw<150?'9px':'11px')+' sans-serif'; g.fillText(b.icon,x,y); }
  }
  // bots
  for (const b of BOTS){ const e=ents[b.id]; if (!e||e.hidden) continue; const [x,y]=P(e.x,e.y); g.fillStyle=b.color; g.beginPath(); g.arc(x,y,o.labels?3.5:2,0,7); g.fill(); }
  // player
  const [px,py]=P(s.x,s.y), pr=(o.labels?7:4.5)+Math.sin(performance.now()/200)*1.2;
  g.fillStyle='rgba(244,197,52,.3)'; g.beginPath(); g.arc(px,py,pr+4,0,7); g.fill();
  g.fillStyle=s.color; g.strokeStyle='#231900'; g.lineWidth=2; g.beginPath(); g.arc(px,py,pr,0,7); g.fill(); g.stroke();
  if (o.labels){ g.font='800 11px "Be Vietnam Pro",sans-serif'; g.fillStyle='#fff'; g.fillText('Bạn',px,py-pr-9); }
  g.textBaseline='alphabetic';
}
function mapToWorld(c,ev){ const m=c._map; if (!m) return null; const r=c.getBoundingClientRect(); return {x:(ev.clientX-r.left-m.ox)/m.sc, y:(ev.clientY-r.top-m.oy)/m.sc}; }
function pickAt(wx,wy){
  const tx=Math.floor(wx/TS), ty=Math.floor(wy/TS);
  let b=ALLB.find(b=>tx>=b.x&&tx<b.x+b.w&&ty>=b.y&&ty<b.y+b.h);
  if (!b){ let best=2.2; for (const B of BUILDINGS){ const d=Math.hypot(wx/TS-(B.x+B.w/2),wy/TS-(B.y+B.h/2))-Math.max(B.w,B.h)/2; if (d<best){ best=d; b=B; } } }
  if (b) return {type:'b',b};
  const p=PLOTS.find(p=>tx>=p.x-1&&tx<=p.x+p.w&&ty>=p.y-1&&ty<=p.y+p.h); if (p) return {type:'p',p};
  if (walkable(tx,ty)) return {type:'t',x:tx,y:ty};
  return null;
}
function goTo(t,auto=true){
  if (!t) return;
  if (t.type==='b'){ setGuide({type:'b',id:t.b.id}); if (auto) walkTo(t.b.front.x,t.b.front.y,t); }
  else if (t.type==='p'){ setGuide({type:'p',i:t.p.i}); if (auto) walkTo(t.p.x,t.p.y,t); }
  else { setGuide({type:'t',x:t.x,y:t.y}); if (auto) walkTo(t.x,t.y,null); }
}

// ---------- Player movement & input ----------
function tileOf(x,y){ return {x:Math.floor(x/TS),y:Math.floor(y/TS)}; }
function freeAt(x,y){ const hw=5, hh=3; return walkable(Math.floor((x-hw)/TS),Math.floor((y-hh)/TS)) && walkable(Math.floor((x+hw)/TS),Math.floor((y-hh)/TS)) && walkable(Math.floor((x-hw)/TS),Math.floor((y+hh)/TS)) && walkable(Math.floor((x+hw)/TS),Math.floor((y+hh)/TS)); }
function updatePlayer(dt){
  const sp=TS*2.5*VEH[s.veh].sp*dt;
  let kx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0), ky=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);
  player.moving=false;
  if (kx||ky){
    player.path=[]; player.pending=null;
    const l=Math.hypot(kx,ky); kx/=l; ky/=l;
    if (freeAt(s.x+kx*sp,s.y)) s.x+=kx*sp; if (freeAt(s.x,s.y+ky*sp)) s.y+=ky*sp;
    if (kx) player.face=Math.sign(kx); player.moving=true;
  } else if (player.path.length){
    const n=player.path[0], tx=n.x*TS+TS/2, ty=n.y*TS+TS/2, dx=tx-s.x, dy=ty-s.y, d=Math.hypot(dx,dy);
    if (d<=sp){ s.x=tx; s.y=ty; player.path.shift(); if (!player.path.length && player.pending){ const p=player.pending; player.pending=null; computeNear(); interact(p); } }
    else { s.x+=dx/d*sp; s.y+=dy/d*sp; if (Math.abs(dx)>1) player.face=Math.sign(dx); }
    player.moving=true;
  }
  if (player.moving) player.step+=dt*10*Math.min(VEH[s.veh].sp,1.4);
  computeNear(); checkGuideArrival();
  // auto-deliver
  if (near && near.type==='b' && near.b.kind==='house') tryDeliver(near.b);
}
function computeNear(){
  near=null; let best=1e9;
  for (const b of ALLB){ const fx=b.front.x*TS+TS/2, fy=b.front.y*TS+TS/2, d=Math.hypot(s.x-fx,s.y-fy); if (d<TS*.85 && d<best){ best=d; near={type:'b',b}; } }
  if (!near){ const t=tileOf(s.x,s.y); PLOTS.forEach(p=>{ if (t.x>=p.x-1&&t.x<=p.x+p.w&&t.y>=p.y-1&&t.y<=p.y+p.h){ const d=Math.hypot(t.x-(p.x+(p.w-1)/2),t.y-(p.y+(p.h-1)/2)); if (d<best){ best=d; near={type:'p',p}; } } }); }
  const btn=document.getElementById('actBtn');
  if (near && !panel && !(near.type==='b' && near.b.kind==='house')){
    btn.hidden=false; btn.innerHTML=near.type==='b'?`${near.b.icon} ${near.b.kind==='lm'?'Tham quan':'Vào'} ${esc(near.b.name)}<kbd>E</kbd>`:`🌱 Ruộng số ${near.p.i+1}<kbd>E</kbd>`;
  } else btn.hidden=true;
}
function interact(target){
  const t=target || near; if (!t) return;
  if (t.type==='b'){ if (t.b.kind==='house'){ if (!tryDeliver(t.b)) toast(`${t.b.name}: không có đơn giao ở đây.`); return; } if (t.b.kind==='lm'){ visitLandmark(t.b); return; } openPanel(t.b.kind,{at:t.b.id}); }
  else if (t.type==='p') openPanel('plot',{arg:t.p.i});
}
function walkTo(tx,ty,pending){
  const st=tileOf(s.x,s.y); const p=astar(st.x,st.y,tx,ty);
  if (!p){ toast('Không đi tới đó được.'); return; }
  player.path=p; player.pending=pending||null;
  if (!p.length && pending){ player.pending=null; interact(pending); }
}
function navTo(id){ const b=BY[id]; closePanel(); goTo({type:'b',b}); }
function visitLandmark(b){
  toast(`${b.icon} ${b.name}: ${b.info}`,'ev');
  s.visited=s.visited||{};
  if (!s.visited[b.id]){ s.visited[b.id]=1; logMe(`Tham quan ${b.name}`); if (R()<.6) news(`${s.name} check-in ở ${b.name}.`,'good',['me']);
    const n=Object.keys(s.visited).length; toast(`📸 Đã check-in ${n}/${LANDMARKS.length} địa danh.`);
    if (n>=LANDMARKS.length && !s.milestones.tour){ s.milestones.tour=1; fameDelta(2,'Thổ địa Hà Nội'); news(`${s.name} đã đi hết các địa danh nổi tiếng trong game. Danh hiệu mới: Thổ địa Hà Nội.`,'good',['me']); } save(); }
}
function tryDeliver(h){
  const mine=s.carry.filter(c=>c.house===h.id); if (!mine.length) return false;
  for (const c of mine){
    const onTime=s.t<=c.dl; let amt=onTime?c.pay:Math.round(c.pay*.5/1000)*1000;
    if (onTime && c.dl-s.t > c.win*.4) amt=Math.round(amt*1.1/1000)*1000;
    let split='';
    if (c.partner){ const b=bot(c.partner); if (R()<b.honesty){ amt=Math.round(amt/2/1000)*1000; bstate(c.partner).money+=amt; split=` (đã chia nửa cho ${b.name})`; news(`${s.name} và ${b.name} chạy chung đơn lớn, giao gọn gàng.`,'good',['me',c.partner]); }
      else { bstate(c.partner).rep-=8; split=` (${b.name} bùng kèo nên bạn nhận cả)`; news(`${b.name} hứa chạy chung đơn với ${s.name} rồi bùng kèo giữa đường. ${s.name} một mình gánh trọn.`,'drama',[c.partner,'me']); } }
    gain(amt); xpAdd('ship',8+Math.round(c.dist/4));
    if (onTime){ s.stats.delivOn++; repDelta(.5); } else { s.stats.delivLate++; repDelta(-2); }
    toast(`${c.icon} Giao ${c.name} ${onTime?'đúng hạn':'TRỄ'}: +${kf(amt)}${split}`,onTime?'good':'bad');
    logMe(`Giao ${c.name} tới ${h.name}${onTime?'':' (trễ)'}`);
  }
  s.carry=s.carry.filter(c=>c.house!==h.id);
  if (s.stats.delivOn>=10 && !s.milestones.ship10){ s.milestones.ship10=1; fameDelta(2,'10 đơn đúng hạn'); news(`${s.name} cán mốc 10 đơn đúng hạn. Tuấn Shipper bắt đầu thấy áp lực.`,'good',['me','tuan']); }
  save(); return true;
}

window.addEventListener('keydown',e=>{
  if (e.target.matches('input,textarea,select')) return;
  if (document.getElementById('welcome').hidden===false){ if (e.key==='Enter'){ if (!$('tMain').hidden){ e.preventDefault(); (load()?startGame(load()):showNew()); } else if (!$('tNew').hidden){ e.preventDefault(); $('wStart').click(); } } return; }
  if (e.code==='Escape' && panel){ closePanel(); return; }
  if (panel) return;
  keys[e.code]=true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (e.code==='KeyE'||e.code==='Enter'||e.code==='Space') interact();
  if (e.code==='Equal'||e.code==='NumpadAdd') setUserZoom(userZoom*1.2);
  if (e.code==='Minus'||e.code==='NumpadSubtract') setUserZoom(userZoom/1.2);
  if (e.code==='KeyM'){ keys[e.code]=false; openPanel('map'); }
});
window.addEventListener('keyup',e=>{ keys[e.code]=false; });
window.addEventListener('blur',()=>{ for (const k in keys) keys[k]=false; });
let downPt=null, pinch=null, didPinch=false; const ptrs=new Map();
cv.addEventListener('pointerdown',e=>{ ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if (ptrs.size===1){ downPt={x:e.clientX,y:e.clientY}; didPinch=false; }
  if (ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch={d:Math.max(10,Math.hypot(a.x-b.x,a.y-b.y)),z:userZoom}; didPinch=true; downPt=null; } });
cv.addEventListener('pointerup',e=>{
  ptrs.delete(e.pointerId); if (ptrs.size<2) pinch=null;
  if (didPinch){ if (!ptrs.size) didPinch=false; return; }
  if (!s || !downPt || panel) return; const moved=Math.hypot(e.clientX-downPt.x,e.clientY-downPt.y); downPt=null; if (moved>12) return;
  const r=cv.getBoundingClientRect(); const wx=camX+(e.clientX-r.left)/zoom, wy=camY+(e.clientY-r.top)/zoom;
  for (const b of BOTS){ const en=ents[b.id]; if (en && !en.hidden && Math.hypot(en.x-wx,en.y-12-wy)<16){ openPanel('profile',{arg:b.id}); return; } }
  const tx=Math.floor(wx/TS), ty=Math.floor(wy/TS);
  if (!inb(tx,ty)) return;
  const b=ALLB.find(b=>tx>=b.x&&tx<b.x+b.w&&ty>=b.y&&ty<b.y+b.h);
  if (b){ goTo({type:'b',b}); return; }
  const p=PLOTS.find(p=>tx>=p.x&&tx<p.x+p.w&&ty>=p.y&&ty<p.y+p.h);
  if (p){ goTo({type:'p',p}); return; }
  if (walkable(tx,ty)) walkTo(tx,ty,null);
});
cv.addEventListener('wheel',e=>{ e.preventDefault(); setUserZoom(userZoom*Math.exp(-e.deltaY*.0015)); },{passive:false});
cv.addEventListener('pointermove',e=>{ if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if (pinch && ptrs.size>=2){ const [a,b]=[...ptrs.values()]; setUserZoom(pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d); } });
cv.addEventListener('pointercancel',e=>{ ptrs.delete(e.pointerId); if (ptrs.size<2) pinch=null; if (!ptrs.size) didPinch=false; });
document.getElementById('zIn').addEventListener('click',()=>setUserZoom(userZoom*1.25));
document.getElementById('zOut').addEventListener('click',()=>setUserZoom(userZoom/1.25));
document.getElementById('mini').addEventListener('click',()=>s&&!panel&&openPanel('map'));
document.getElementById('guideX').addEventListener('click',()=>{ setGuide(null); player.path=[]; player.pending=null; });
document.getElementById('actBtn').addEventListener('click',()=>interact());

