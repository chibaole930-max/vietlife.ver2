// Player actions and saving
// ---------- Welcome & boot ----------
const COLORS=['#f4c534','#e8893a','#e85d8f','#45a9da','#86b84a','#b35ad0','#2fb3a5','#f0604f'];
let wColor=COLORS[0];
const TIPS=['Giữ chữ tín thì người ta cho vay, lật kèo thì cả phường biết.','Mua xe đạp trước, chạy đơn gấp nhanh gấp rưỡi.','Ruộng ở bãi giữa sông Hồng, đi qua cầu Long Biên là tới.','Đi hết 5 địa danh Hà Nội được +2 Fame.','Đứng xa đường ray khi tàu chạy qua phố đường tàu.','Lúa → Gạo → Bánh phở → Phở: tự làm cả chuỗi thì lãi nhất.','Món ăn để quá 5 giờ là hỏng, đừng nấu quá tay.','Lạc đường thì bấm M mở bản đồ.'];
let tipI=0; setInterval(()=>{ const el=$('tTip'); if (el && !$('welcome').hidden){ tipI=(tipI+1)%TIPS.length; el.textContent=TIPS[tipI]; } },4500);
function showScreen(id){ ['tMain','tNew','tHow'].forEach(k=>$(k).hidden=k!==id); }
function showNew(){ showScreen('tNew'); setTimeout(()=>{ try{ $('wName').focus(); }catch(e){} },50); }
function showWelcome(){
  $('welcome').hidden=false; $('app').classList.add('title'); showScreen('tMain'); $('tTip').textContent=TIPS[tipI];
  $('wSw').innerHTML=COLORS.map(c=>`<button style="background:${c}" data-c="${c}" class="${c===wColor?'on':''}" aria-label="Màu ${c}"></button>`).join('');
  const sv=load();
  $('tMenu').innerHTML=(sv?`<button class="gbtn" id="wCont">▶ TIẾP TỤC<small>${esc(sv.name)} · Ngày ${sv.day} · ${kf(sv.money)}</small></button>`:'')+
    `<button class="gbtn ${sv?'blue':''}" id="wNew">${sv?'CHƠI MỚI':'▶ CHƠI NGAY'}</button><button class="gbtn blue" id="wHow">CÁCH CHƠI</button>`;
  if (sv) $('wCont').onclick=()=>startGame(sv);
  $('wNew').onclick=showNew; $('wHow').onclick=()=>showScreen('tHow');
}
$('wBack').addEventListener('click',()=>showScreen('tMain'));
$('wHowBack').addEventListener('click',()=>showScreen('tMain'));
$('wVeh').addEventListener('click',e=>{ const b=e.target.closest('[data-v]'); if (!b) return; prevVeh=+b.dataset.v; $('wVeh').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); });
$('wSw').addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if (!b) return; wColor=b.dataset.c; $('wSw').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); });
$('wStart').addEventListener('click',()=>{ const n=$('wName').value.trim()||'Người mới'; const st=newState(n,wColor); startGame(st,true); });
let prevVeh=0, lastDt=.016;
function drawPreview(now){
  const c=$('charPrev'); const w=c.clientWidth, h=c.clientHeight; if (!w) return; const r=Math.min(2,window.devicePixelRatio||1);
  if (c.width!==Math.round(w*r)){ c.width=Math.round(w*r); c.height=Math.round(h*r); }
  const g=c.getContext('2d'); g.setTransform(r,0,0,r,0,0);
  const sky=g.createLinearGradient(0,0,0,h); sky.addColorStop(0,'#f6c57a'); sky.addColorStop(.55,'#f0a35e'); sky.addColorStop(.56,'#c9bfa9'); sky.addColorStop(1,'#b3a68e'); g.fillStyle=sky; g.fillRect(0,0,w,h);
  g.fillStyle='rgba(120,60,40,.35)'; for (let k=0;k<5;k++){ const bh=40+hash(k,3)*40; g.fillRect(k*34-6,h*.56-bh,30,bh); }
  g.fillStyle='rgba(0,0,0,.08)'; for (let x=0;x<w;x+=20) g.fillRect(x,h*.56,1,h);
  const t=now/1000, old=ctx; ctx=g; g.save(); g.translate(w/2,h*.86); g.scale(2.5,2.5);
  const nm=$('wName').value.trim()||'Bạn';
  drawChar(0,0,wColor,nm,prevVeh,true,t*8,1,null,false);
  g.restore(); ctx=old;
}
// ----- Demo character that the title camera follows -----
const DEMO_STOPS=['depot','n3','market','n9','ngocson','n24','garage','food','n12','cotco','n30','home','n35','farm','n20','vanmieu'];
const demo={x:0,y:0,path:[],wait:0,i:0,step:0,face:1,pops:[],cx:0,cy:0};
function initDemo(){ const d=BY.depot.front; demo.x=d.x*TS+16; demo.y=d.y*TS+16; demo.cx=demo.x; demo.cy=demo.y; demo.i=0; demo.path=[]; }
function updateDemo(dt){
  for (const p of demo.pops){ p.t+=dt; } demo.pops=demo.pops.filter(p=>p.t<1.8);
  if (demo.wait>0){ demo.wait-=dt; }
  else if (!demo.path.length){
    demo.i=(demo.i+1)%DEMO_STOPS.length; const b=BY[DEMO_STOPS[demo.i]]; if (b){ demo.path=astar(Math.floor(demo.x/TS),Math.floor(demo.y/TS),b.front.x,b.front.y)||[]; demo.target=b; }
  } else {
    const n=demo.path[0], tx=n.x*TS+16, ty=n.y*TS+16, dx=tx-demo.x, dy=ty-demo.y, d=Math.hypot(dx,dy), sp=TS*6.5*dt;
    if (d<=sp){ demo.x=tx; demo.y=ty; demo.path.shift(); if (!demo.path.length){ demo.wait=1.4; const b=demo.target;
      const msg=b.kind==='house'?`📦 Giao xong +${rint(25,90)}k`:b.kind==='lm'?`📸 Check-in ${b.short}`:b.id==='market'?'🛒 Nhập hàng':b.id==='farm'?'🌾 Thu hoạch +10 rau':b.id==='food'?'🍜 Bán 6 bát phở':b.id==='garage'?'🛵 Ngắm xe mới':b.id==='depot'?'📦 Nhận 3 đơn':'💤 Nghỉ chút';
      demo.pops.push({x:demo.x,y:demo.y-40,t:0,msg}); } }
    else { demo.x+=dx/d*sp; demo.y+=dy/d*sp; if (Math.abs(dx)>1) demo.face=Math.sign(dx); }
    demo.step+=dt*12;
  }
  const k=Math.min(1,dt*2.2); demo.cx+=(demo.x-demo.cx)*k; demo.cy+=(demo.y-demo.cy)*k;
}
function drawTitle(now){
  const z=clamp(Math.min(vw/(TS*20),vh/(TS*13)),.75,1.7), W=vw/z, H=vh/z, tt=now/1000;
  camX=clamp(demo.cx-W/2,0,MW*TS-W); camY=clamp(demo.cy-H/2+H*.08,0,MH*TS-H);
  ctx.setTransform(dpr*z,0,0,dpr*z,-camX*dpr*z,-camY*dpr*z); ctx.imageSmoothingQuality='high'; ctx.drawImage(staticCv,0,0,MW*TS,MH*TS);
  const W0=camX-60,H0=camY-60,W1=camX+W+60,H1=camY+H+60;
  drawTraffic(W0,H0,W1,H1); drawTrain();
  const list=[];
  for (const v of VENDORS){ if (v.x>W0&&v.x<W1&&v.y>H0&&v.y<H1) list.push({y:v.y,f:()=>drawVendor(v,tt)}); }
  for (const b of BOTS){ const e=ents[b.id]; if (e) list.push({y:e.y,f:()=>drawChar(e.x,e.y,b.color,b.name,b.job==='ship'?(b.id==='phat'?2:1):0,false,e.path.length?e.step:0,e.face,b.job,e.hidden)}); }
  list.push({y:demo.y,f:()=>drawChar(demo.x,demo.y,'#f4c534','Bạn',2,true,demo.path.length?demo.step:0,demo.face,null,false)});
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  for (const p of demo.pops){ const a=1-Math.max(0,p.t-1.2)/.6; ctx.globalAlpha=clamp(a,0,1); ctx.font='800 13px "Be Vietnam Pro",sans-serif'; ctx.textAlign='center'; const y=p.y-p.t*22, w=ctx.measureText(p.msg).width+16;
    ctx.fillStyle='#071019'; rr(ctx,p.x-w/2,y-13,w,22,11); ctx.fill(); ctx.fillStyle='#f4c534'; rr(ctx,p.x-w/2+2,y-11,w-4,18,9); ctx.fill(); ctx.fillStyle='#231900'; ctx.fillText(p.msg,p.x,y+2.5); ctx.globalAlpha=1; }
  ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='rgba(30,22,70,.22)'; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(dpr*z,0,0,dpr*z,-camX*dpr*z,-camY*dpr*z); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.45; ctx.drawImage(lightsCv,0,0,MW*TS,MH*TS); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
}
function startGame(st,fresh){
  s=st; $('welcome').hidden=true; $('app').classList.remove('title');
  s.carry=(s.carry||[]).filter(c=>BY[c.house]); s.orders=(s.orders||[]).filter(o=>BY[o.house]);
  if (!walkable(Math.floor(s.x/TS),Math.floor(s.y/TS))){ const hf=BY.home.front; s.x=hf.x*TS+TS/2; s.y=hf.y*TS+TS/2; }
  spawnBots();
  if (fresh){
    newDay();
    news(`${s.name} vừa chuyển đến phường, thuê phòng trọ phố Hàng Bạc. Chào mừng hàng xóm mới!`,'you',['me']);
    s.market.listings.push({id:uid(),seller:'sau',it:'rau',q:6,p:11000,at:s.t},{id:uid(),seller:'hung',it:'gao',q:5,p:36000,at:s.t},{id:uid(),seller:'linh',it:'banh_mi',q:4,p:27000,at:s.t},{id:uid(),seller:'mai',it:'lua',q:8,p:21000,at:s.t});
    save();
    openPanel('menu');
    toast('Mẹo: ghé Trạm Giao Hàng (📦) ngay cạnh phòng trọ để nhận đơn đầu tiên.','ev');
  }
  updateHUD(); updateTracker(); resize();
  onlineAutoConnect();
}
