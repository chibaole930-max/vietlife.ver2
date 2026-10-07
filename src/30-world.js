// Day cycle, bots and events
// ---------- Rendering ----------
const cv=document.getElementById('cv'); let ctx=cv.getContext('2d');
let dpr=1, vw=0, vh=0, zoom=1, baseZoom=1, userZoom=1, camX=0, camY=0, staticCv=null;
try{ userZoom=clamp(+localStorage.getItem('vietlife_zoom')||1,.45,2.2); }catch(e){}
function applyZoom(){ zoom=clamp(baseZoom*userZoom,.35,2.6); const el=document.getElementById('zLvl'); if (el) el.textContent=Math.round(userZoom*100)+'%'; }
function setUserZoom(z){ userZoom=clamp(z,.45,2.2); applyZoom(); try{ localStorage.setItem('vietlife_zoom',String(userZoom)); }catch(e){} }
function resize(){ dpr=Math.min(2,window.devicePixelRatio||1); vw=cv.clientWidth; vh=cv.clientHeight; cv.width=Math.round(vw*dpr); cv.height=Math.round(vh*dpr); baseZoom=clamp(Math.min(vw/(TS*26),vh/(TS*16)),.85,1.55); applyZoom(); }
window.addEventListener('resize',resize);

// ===== Art: procedural 2.5D Vietnamese street style =====
let SS=1.5, lightsCv=null; const LAMPS=[];
function mkCanvas(sc){ const c=document.createElement('canvas'); c.width=Math.round(MW*TS*sc); c.height=Math.round(MH*TS*sc); const g=c.getContext('2d'); g.scale(sc,sc); return [c,g]; }
function shade(hex,amt){ const n=parseInt(hex.slice(1),16); let r=n>>16, gg=(n>>8)&255, b=n&255; const f=amt<0?0:255, t=Math.abs(amt); r=Math.round(r+(f-r)*t); gg=Math.round(gg+(f-gg)*t); b=Math.round(b+(f-b)*t); return `rgb(${r},${gg},${b})`; }
function rr(g,x,y,w,h,r){ g.beginPath(); if (g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); }
const HOUSE_COLS=['#f2d16b','#f4b9b2','#a9dcc8','#f3e4c4','#bcd5ee','#f6c58f','#d9c7ee'];
const KSTYLE={
  home:{roof:'flat',rc:'#d3cbbd',wall:'#f2d16b',sign:'#2f6fa3',st:'#fff',front:'door'},
  depot:{roof:'metal',rc:'#4f86b5',wall:'#e3e9ee',sign:'#1f5aa6',st:'#fff',front:'boxes'},
  market:{roof:'tile',rc:'#c0392b',wall:'#f1e2c4',sign:'#d8432f',st:'#ffe066',front:'stalls'},
  bank:{roof:'flat',rc:'#cfc8bb',wall:'#ebe6db',sign:'#2e7d57',st:'#fff',front:'columns'},
  garage:{roof:'metal',rc:'#6a5e94',wall:'#dfe6e9',sign:'#d8432f',st:'#ffe066',front:'bikes'},
  farm:{roof:'thatch',rc:'#b8913f',wall:'#e9d6a8',sign:'#2e7d57',st:'#ffe066',front:'sacks'},
  cowork:{roof:'flat',rc:'#c4c9ce',wall:'#bcd6ea',sign:'#1b2b3a',st:'#7fe0ff',front:'glass'},
  food:{roof:'tile',rc:'#c2562b',wall:'#f3dfc6',sign:'#d8432f',st:'#ffe066',front:'stools'},
  factory:{roof:'metal',rc:'#7d8790',wall:'#cfd4d8',sign:'#f4c534',st:'#231900',front:'rolldoor'},
  news:{roof:'tile',rc:'#a8322a',wall:'#e9e3d2',sign:'#d8432f',st:'#fff',front:'board'},
};
function roadPos(r,s){ // point + tangent at arc length s (tile units)
  s=clamp(s,0,r.L); let lo=0, hi=r.len.length-1; while (hi-lo>1){ const m=(lo+hi)>>1; if (r.len[m]<=s) lo=m; else hi=m; }
  const a=r.pts[lo], b=r.pts[Math.min(lo+1,r.pts.length-1)], seg=(r.len[lo+1]-r.len[lo])||1, t=(s-r.len[lo])/seg;
  const dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1; return {x:a[0]+dx*t, y:a[1]+dy*t, tx:dx/l, ty:dy/l};
}
const nearInter=(x,y,d)=>INTERS.some(c=>Math.hypot(c.x-x,c.y-y)<d);
function strokeRoad(g,r){ g.beginPath(); r.pts.forEach(([x,y],i)=>i?g.lineTo(x*TS,y*TS):g.moveTo(x*TS,y*TS)); g.stroke(); }
function renderStatic(){
  const want = Math.max(screen.width||0,screen.height||0)*(window.devicePixelRatio||1) > 1500 ? 2 : 1.5;
  SS = Math.min(want, Math.sqrt(14e6/(MW*TS*MH*TS)));
  let g; [staticCv,g]=mkCanvas(SS); let L; [lightsCv,L]=mkCanvas(1); LAMPS.length=0;
  const tile=(x,y)=>inb(x,y)?grid[idx(x,y)]:-1;
  const fronts=new Set(ALLB.map(b=>b.front.x+','+b.front.y));
  // 1. grass everywhere
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    const px=x*TS, py=y*TS, h=hash(x,y), n=(hash(x>>2,y>>2)*.6+hash(x>>1,y>>1)*.4);
    g.fillStyle=n<.33?'#6cab4f':(n<.66?'#67a54b':'#71b055'); g.fillRect(px,py,TS,TS);
    for (let k=0;k<9;k++){ const a=hash(x*13+k,y*7+k*3), b2=hash(x*5+k*2,y*11+k); const bx=px+a*TS, by=py+b2*TS;
      g.strokeStyle=k%3?'rgba(44,96,34,.35)':'rgba(190,230,140,.45)'; g.lineWidth=1; g.beginPath(); g.moveTo(bx,by); g.lineTo(bx+(a-.5)*3,by-4); g.stroke(); }
    if (h<.035 && grid[idx(x,y)]===G.GRASS){ const c=['#fff6d8','#f3d34a','#f39ac0'][Math.floor(hash(y,x)*3)]; g.fillStyle=c; for (let k=0;k<4;k++){ g.beginPath(); g.arc(px+10+hash(x+k,y)*12,py+10+hash(x,y+k)*12,1.7,0,7); g.fill(); } }
    if (grid[idx(x,y)]===G.PLAZA){ for (let j=0;j<4;j++) for (let ii=0;ii<2;ii++){ const a=hash(x*5+ii,y*5+j); g.fillStyle=a<.5?'#c98d6a':'#bb7d5b'; g.fillRect(px+ii*16+(j%2?4:0),py+j*8,14,7); } }
    if (grid[idx(x,y)]===G.SOIL){ g.fillStyle='#7a5737'; g.fillRect(px,py,TS,TS); }
  }
  // 2. sidewalks (smooth bands), curbs, asphalt
  const pc=document.createElement('canvas'); pc.width=pc.height=32; const pg=pc.getContext('2d'); pg.fillStyle='#b0a38b'; pg.fillRect(0,0,32,32);
  [['#d3c8b2',1,1],['#cbbfa7',17,1],['#c6b9a0',1,17],['#cfc3ab',17,17]].forEach(([c,x,y])=>{ pg.fillStyle=c; pg.fillRect(x,y,14,14); pg.fillStyle='rgba(255,255,255,.18)'; pg.fillRect(x,y,14,1.5); });
  const pave=g.createPattern(pc,'repeat');
  g.lineJoin='round'; g.lineCap='round';
  const normal=ROADS.filter(r=>!r.bridge);
  g.strokeStyle=pave; g.lineWidth=TS*4; normal.forEach(r=>strokeRoad(g,r));
  g.strokeStyle='#e7e0d1'; g.lineWidth=TS*2+6; normal.forEach(r=>strokeRoad(g,r));
  g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=TS*2+1; normal.forEach(r=>strokeRoad(g,r));
  g.strokeStyle='#454a51'; g.lineWidth=TS*2-2; normal.forEach(r=>strokeRoad(g,r));
  g.lineCap='butt';
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ const i=idx(x,y); if (grid[i]!==G.ROAD||bkind[i]) continue; const px=x*TS, py=y*TS, h=hash(x,y);
    for (let k=0;k<5;k++){ const a=hash(x*9+k,y*7-k); g.fillStyle=a<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.12)'; g.fillRect(px+4+hash(x+k,y*3)*24,py+4+a*24,2,2); }
    if (h<.02 && !interT[i]){ g.fillStyle='#2c3036'; g.beginPath(); g.arc(px+16,py+16,6,0,7); g.fill(); g.strokeStyle='#5a6068'; g.lineWidth=1; g.beginPath(); g.arc(px+16,py+16,4.5,0,7); g.stroke(); } }
  // 3. river (smooth banks) + lakes
  const rv=[]; for (let y=-1;y<=MH+1;y+=.25) rv.push(y);
  g.beginPath(); rv.forEach((y,i)=>i?g.lineTo(riverX1(y)*TS,y*TS):g.moveTo(riverX1(y)*TS,y*TS)); for (let i=rv.length-1;i>=0;i--) g.lineTo(riverX2(rv[i])*TS,rv[i]*TS); g.closePath();
  const rg=g.createLinearGradient(70*TS,0,78*TS,0); rg.addColorStop(0,'#9c5f37'); rg.addColorStop(.5,'#b0703f'); rg.addColorStop(1,'#a3653b'); g.fillStyle=rg; g.fill();
  g.strokeStyle='rgba(255,225,190,.16)'; g.lineWidth=1.3; for (let k=0;k<70;k++){ const y=hash(k,9)*MH, x=riverX1(y)+.6+hash(9,k)*(riverX2(y)-riverX1(y)-1.2); g.beginPath(); g.moveTo(x*TS,y*TS); g.quadraticCurveTo(x*TS+4,y*TS+14,x*TS,y*TS+28); g.stroke(); }
  g.lineWidth=6; g.strokeStyle='#8d9196'; g.beginPath(); rv.forEach((y,i)=>i?g.lineTo(riverX1(y)*TS,y*TS):g.moveTo(riverX1(y)*TS,y*TS)); g.stroke();
  g.lineWidth=2; g.strokeStyle='#c2c5c8'; g.beginPath(); rv.forEach((y,i)=>i?g.lineTo(riverX1(y)*TS-2,y*TS):g.moveTo(riverX1(y)*TS-2,y*TS)); g.stroke();
  g.lineWidth=12; g.strokeStyle='#d8c38f'; g.beginPath(); rv.forEach((y,i)=>i?g.lineTo(riverX2(y)*TS+4,y*TS):g.moveTo(riverX2(y)*TS+4,y*TS)); g.stroke();
  for (const L0 of LAKES){ const cx=L0.cx*TS, cy=L0.cy*TS, rx=L0.rx*TS, ry=L0.ry*TS;
    g.fillStyle='#8d958f'; g.beginPath(); g.ellipse(cx,cy,rx+5,ry+5,0,0,7); g.fill();
    const lg=g.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry)); const c=L0.k===2?['#2f7768','#46998a']:['#2b6f9f','#4592c2']; lg.addColorStop(0,c[0]); lg.addColorStop(1,c[1]); g.fillStyle=lg; g.beginPath(); g.ellipse(cx,cy,rx,ry,0,0,7); g.fill();
    for (let k=0;k<Math.round((rx+ry)/5);k++){ const a=k/Math.round((rx+ry)/5)*Math.PI*2; g.fillStyle=k%2?'#a2aaa5':'#7e8782'; g.beginPath(); g.ellipse(cx+Math.cos(a)*(rx+2),cy+Math.sin(a)*(ry+2),4,3,a,0,7); g.fill(); }
    g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=1.2; for (let k=0;k<(rx*ry)/900;k++){ const a=hash(k,L0.cx)*Math.PI*2, r2=Math.sqrt(hash(L0.cy,k))*.85; const x=cx+Math.cos(a)*rx*r2, y=cy+Math.sin(a)*ry*r2; g.beginPath(); g.moveTo(x-8,y); g.quadraticCurveTo(x,y-4,x+8,y); g.stroke(); }
    if (L0.k===1){ for (let k=0;k<(rx*ry)/1400;k++){ const a=hash(k*3,L0.cx*2)*Math.PI*2, r2=.55+hash(L0.cy*3,k)*.35; const lx=cx+Math.cos(a)*rx*r2, ly=cy+Math.sin(a)*ry*r2;
      g.fillStyle='#4f9a4a'; g.beginPath(); g.arc(lx,ly,6,.4,2*Math.PI); g.lineTo(lx,ly); g.fill(); g.fillStyle='#5fae58'; g.beginPath(); g.arc(lx+.5,ly-.5,3,0,7); g.fill();
      if (k%3===0){ g.fillStyle='#f6a6c4'; for (let j=0;j<5;j++){ const an=j/5*Math.PI*2; g.beginPath(); g.ellipse(lx+8+Math.cos(an)*2.5,ly-4+Math.sin(an)*2.5,2.4,1.4,an,0,7); g.fill(); } g.fillStyle='#f5d76e'; g.beginPath(); g.arc(lx+8,ly-4,1.4,0,7); g.fill(); } } }
  }
  // island
  { const x=ISLAND.x*TS, y=ISLAND.y*TS, w=ISLAND.w*TS, h=ISLAND.h*TS; g.fillStyle='#8d958f'; rr(g,x-4,y-4,w+8,h+8,18); g.fill(); g.fillStyle='#6cab4f'; rr(g,x-1,y-1,w+2,h+2,15); g.fill(); }
  // swan boats
  for (const [sx,sy] of [[9,8],[15,13],[6,13],[17,7],[31,5]]){ const x=sx*TS, y=sy*TS; g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x,y+6,14,4,0,0,7); g.fill(); g.fillStyle='#fbfbf8'; g.beginPath(); g.ellipse(x,y,11,6,0,0,7); g.fill(); g.strokeStyle='#fbfbf8'; g.lineWidth=3; g.beginPath(); g.moveTo(x+7,y-2); g.quadraticCurveTo(x+13,y-6,x+10,y-13); g.stroke(); g.fillStyle='#f39a2b'; g.beginPath(); g.moveTo(x+10,y-14); g.lineTo(x+15,y-12); g.lineTo(x+10,y-11); g.fill(); g.fillStyle='#e35a5a'; g.fillRect(x-5,y-4,6,4); }
  // 4. bridges
  for (const r of ROADS.filter(r=>r.bridge)){
    g.lineCap='butt'; g.strokeStyle='rgba(0,0,0,.3)'; g.lineWidth=TS*2+6; g.save(); g.translate(0,6); strokeRoad(g,r); g.restore();
    g.strokeStyle='#55585c'; g.lineWidth=TS*2; strokeRoad(g,r);
    const a=r.pts[0], b=r.pts[r.pts.length-1], x0=a[0]*TS, x1=b[0]*TS, y0=(a[1]-1)*TS, y1=(a[1]+1)*TS;
    g.strokeStyle='#8a4b32'; g.lineWidth=4; g.beginPath(); g.moveTo(x0,y0+1); g.lineTo(x1,y0+1); g.moveTo(x0,y1-1); g.lineTo(x1,y1-1); g.stroke();
    g.lineWidth=2; g.strokeStyle='#9c5a3c'; for (let x=x0; x<x1-1; x+=24){ g.beginPath(); g.moveTo(x,y0+1); g.lineTo(Math.min(x1,x+24),y1-1); g.moveTo(Math.min(x1,x+24),y0+1); g.lineTo(x,y1-1); g.stroke(); }
    g.font='800 11px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.fillStyle='rgba(255,236,200,.95)'; g.fillText('CẦU LONG BIÊN',(x0+x1)/2,y0-8);
  }
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ const i=idx(x,y); if (bkind[i]!==2) continue; const px=x*TS, py=y*TS;
    g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(px,py+8,TS,TS-10); g.fillStyle='#c3342a'; g.fillRect(px,py+6,TS,TS-12); g.fillStyle='#8f2219'; for (let k=0;k<TS;k+=5) g.fillRect(px+k,py+6,1.5,TS-12); g.fillStyle='#e25a45'; g.fillRect(px,py+4,TS,3); g.fillRect(px,py+TS-7,TS,3); }
  // 5. railway — phố đường tàu
  { const x=RAIL.x*TS, cx=x+TS/2;
    for (let y=RAIL.y1;y<=RAIL.y2;y++){ const i=idx(RAIL.x,y), py=y*TS; const onRoad=grid[i]===G.ROAD;
      if (!onRoad){ g.fillStyle='#8a8378'; g.fillRect(x+3,py,TS-6,TS); for (let k=0;k<14;k++){ g.fillStyle=k%2?'#9f988b':'#6f695f'; g.fillRect(x+4+hash(k,y)*22,py+hash(y,k)*30,2,2); }
        g.fillStyle='#5b4330'; for (let k=0;k<4;k++) g.fillRect(x+5,py+3+k*8,TS-10,3.5); }
      else { g.fillStyle='rgba(255,255,255,.75)'; for (let k=0;k<4;k++){ g.fillStyle=k%2?'#d8432f':'#fff'; g.fillRect(x-4,py+8*k,4,8); g.fillRect(x+TS,py+8*k,4,8); } }
      g.fillStyle='#b9bec3'; g.fillRect(cx-8,py,2.2,TS); g.fillRect(cx+6,py,2.2,TS); g.fillStyle='rgba(255,255,255,.5)'; g.fillRect(cx-8,py,.8,TS); g.fillRect(cx+6,py,.8,TS); }
    g.fillStyle='#d6cfbf'; g.fillRect(x-2,RAIL.y2*TS+TS-4,TS+4,6);
    g.save(); g.translate(x-6,20*TS); g.rotate(-Math.PI/2); g.font='700 10px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.fillStyle='rgba(255,255,255,.9)'; g.fillText('PHỐ ĐƯỜNG TÀU',0,0); g.restore(); }
  // 6. road markings: centre dashes, zebras
  g.strokeStyle='rgba(244,214,110,.9)'; g.lineWidth=2.2; g.setLineDash([12,10]); g.lineCap='butt';
  for (const r of normal){ g.beginPath(); let on=false;
    for (const [x,y] of r.pts){ const ok=!nearInter(x,y,1.9) && inb(Math.floor(x),Math.floor(y)) && !railT[idx(Math.floor(x),Math.floor(y))]; if (ok){ if (on) g.lineTo(x*TS,y*TS); else g.moveTo(x*TS,y*TS); on=true; } else on=false; }
    g.stroke(); }
  g.setLineDash([]);
  g.fillStyle='rgba(255,255,255,.85)';
  for (const c of INTERS) for (const r of normal){
    let bi=-1, bd=1.8; r.pts.forEach(([x,y],i)=>{ const d=Math.hypot(x-c.x,y-c.y); if (d<bd){ bd=d; bi=i; } }); if (bi<0) continue;
    for (const dir of [-1,1]){ const s0=r.len[bi]+dir*2.15; if (s0<.3||s0>r.L-.3) continue; const p=roadPos(r,s0); const tx=Math.floor(p.x), ty=Math.floor(p.y);
      if (!inb(tx,ty)||grid[idx(tx,ty)]!==G.ROAD||interT[idx(tx,ty)]||bkind[idx(tx,ty)]) continue;
      g.save(); g.translate(p.x*TS,p.y*TS); g.rotate(Math.atan2(p.ty,p.tx)); for (let k=0;k<5;k++) g.fillRect(-11,-TS+5+k*12.4,22,6); g.restore(); }
  }
  // 7. street names on the asphalt
  g.font='700 10px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  for (const r of ROADS){ if (r.bridge) continue; const n=Math.max(1,Math.floor(r.L/13));
    for (let k=0;k<n;k++){ const s0=r.L/n*(k+.5); const p=roadPos(r,s0); if (nearInter(p.x,p.y,2.8)||p.x<1||p.x>MW-1||p.y<1||p.y>MH-1) continue; if (railT[idx(Math.floor(p.x),Math.floor(p.y))]) continue;
      let a=Math.atan2(p.ty,p.tx); if (a>Math.PI/2) a-=Math.PI; if (a<-Math.PI/2) a+=Math.PI;
      g.save(); g.translate(p.x*TS,p.y*TS); g.rotate(a); const w=g.measureText(r.n).width+10; g.fillStyle='rgba(30,34,40,.78)'; rr(g,-w/2,-7,w,14,3); g.fill(); g.fillStyle='rgba(255,255,255,.9)'; g.fillText(r.n,0,.5); g.restore(); } }
  g.textBaseline='alphabetic';
  // water labels + Tháp Rùa
  g.font='800 15px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.fillStyle='rgba(255,255,255,.9)';
  for (const L0 of LAKES){ const ly=L0.id==='guom'?(L0.cy+L0.ry-1.4)*TS:L0.cy*TS+5; g.fillText(L0.name,L0.cx*TS,ly); }
  g.save(); g.translate(74*TS,32*TS); g.rotate(-Math.PI/2); g.font='800 18px "Be Vietnam Pro",sans-serif'; g.fillStyle='rgba(255,240,220,.85)'; g.fillText('SÔNG HỒNG',0,6); g.restore();
  { const x=TOWER.x*TS+16, y=TOWER.y*TS+20; g.fillStyle='#6f8f5e'; g.beginPath(); g.ellipse(x,y+2,15,6,0,0,7); g.fill(); g.fillStyle='rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x,y+10,12,3,0,0,7); g.fill();
    for (let k=0;k<3;k++){ const w=16-k*4, hh=9-k; g.fillStyle=k?'#cfc6ad':'#bdb397'; g.fillRect(x-w/2,y-6-k*9,w,hh); g.fillStyle='#4a4436'; g.fillRect(x-2,y-4-k*9,4,4); g.fillStyle='#8a7f63'; g.fillRect(x-w/2-1,y-7-k*9,w+2,2); }
    g.fillStyle='#8a7f63'; g.beginPath(); g.moveTo(x-4,y-31); g.lineTo(x,y-37); g.lineTo(x+4,y-31); g.fill();
    g.font='700 10px "Be Vietnam Pro",sans-serif'; g.fillStyle='rgba(255,255,255,.9)'; g.fillText('Tháp Rùa',x,y+20); }
  // plots, park
  for (const p of PLOTS){ const x=p.x*TS, y=p.y*TS, w=p.w*TS, h=p.h*TS;
    g.fillStyle='#6e4d30'; g.fillRect(x,y,w,h);
    for (let k=0;k<6;k++){ const yy=y+5+k*h/6; g.fillStyle='#82603f'; g.fillRect(x+3,yy,w-6,5); g.fillStyle='#5c3f26'; g.fillRect(x+3,yy+5,w-6,2); }
    g.fillStyle='#8b6a45'; g.fillRect(x-2,y-2,w+4,2); g.fillRect(x-2,y+h,w+4,2); g.fillRect(x-2,y,2,h); g.fillRect(x+w,y,2,h); }
  g.font='800 11px "Be Vietnam Pro",sans-serif'; g.fillStyle='rgba(255,255,255,.92)'; g.fillText('BÃI GIỮA SÔNG HỒNG',80.5*TS,13.4*TS);
  { const x=(PARK.x+PARK.w/2)*TS, y=(PARK.y+1)*TS; g.fillStyle='#4f8f3c'; g.beginPath(); g.ellipse(x,y+4,34,12,0,0,7); g.fill(); g.strokeStyle='#e6dccb'; g.lineWidth=2; g.stroke();
    for (let k=0;k<16;k++){ const a=hash(k,55)*Math.PI*2; g.fillStyle=['#f39ac0','#f3d34a','#fff','#e8573f'][k%4]; g.beginPath(); g.arc(x+Math.cos(a)*26,y+4+Math.sin(a)*8,2,0,7); g.fill(); }
    g.fillStyle='#9a9182'; g.fillRect(x-7,y-6,14,10); g.fillStyle='#3e4a3f'; g.fillRect(x-3,y-22,6,16); g.beginPath(); g.arc(x,y-24,3.5,0,7); g.fill(); g.fillRect(x+3,y-20,5,2);
    g.font='600 10px "Be Vietnam Pro",sans-serif'; g.fillStyle='rgba(255,255,255,.9)'; g.fillText('Vườn hoa Lý Thái Tổ',x,y+26); }
  // 8. parked motorbikes in front of doors
  for (const b of ALLB){ if (b.kind==='lm') continue; const fx=b.front.x, fy=b.front.y; if (tile(fx,fy)!==G.WALK) continue;
    const n=b.kind==='house'?2:3; for (let k=0;k<n;k++){ const side=k%2?1:-1, off=(1+Math.floor(k/2)*.55)*side; const tx=Math.floor(fx+off+.5); if (tile(tx,fy)===G.ROAD) continue; parkedBike(g,(fx+.5+off)*TS,fy*TS+10,-.35*side,['#c0392b','#2f6fa3','#1d1f22','#e8e3d8','#3f8f5a'][Math.floor(hash(b.x+k,b.y)*5)]); } }
  // 9. buildings (back to front)
  [...ALLB].sort((a,b)=>(a.y+a.h)-(b.y+b.h)).forEach(b=>b.kind==='lm'?drawLandmark(g,L,b):drawBuilding(g,L,b));
  // 10. trees, willows, street trees, trà đá, poles & lamps
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++) if (grid[idx(x,y)]===G.TREE) drawTree(g,x*TS+TS/2,y*TS+TS/2,hash(x,y));
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ const t=tile(x,y); if ((t!==G.GRASS&&t!==G.WALK)||(x+y)%2||fronts.has(x+','+y)) continue; let nearG=false; for (const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){ const X=x+dx,Y=y+dy; if (inb(X,Y)&&grid[idx(X,Y)]===G.WATER&&wkind[idx(X,Y)]===2) nearG=true; } if (nearG) willow(g,x*TS+16,y*TS+20,hash(x,y)); }
  const okSpot=(x,y)=>{ const tx=Math.floor(x), ty=Math.floor(y), t=tile(tx,ty); return (t===G.WALK||t===G.GRASS)&&!fronts.has(tx+','+ty)&&tile(tx,ty-1)!==G.BLD&&!railT[idx(tx,ty)]; };
  for (const r of normal){
    const poles=[];
    const noPole=r.g===10||r.n==='Đường Thanh Niên';
    for (let s0=2;s0<r.L-1;s0+=5){ const p=roadPos(r,s0), nx=-p.ty, ny=p.tx; const X=p.x+nx*1.5, Y=p.y+ny*1.5; if (noPole||nearInter(p.x,p.y,2.2)||!okSpot(X,Y)){ poles.push(null); continue; } poles.push([X*TS,Y*TS]); }
    for (let i=0;i+1<poles.length;i++){ const a=poles[i], b=poles[i+1]; if (!a||!b) continue; g.lineWidth=.8; for (let k=0;k<4;k++){ g.strokeStyle=`rgba(25,25,28,${.55+k*.08})`; g.beginPath(); g.moveTo(a[0],a[1]-32+k*1.5); g.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2-20+k*2.5,b[0],b[1]-32+k*1.5); g.stroke(); } }
    for (const p of poles) if (p) pole(g,p[0],p[1],hash(Math.round(p[0]),Math.round(p[1])));
    for (let s0=4.5;s0<r.L-1;s0+=7){ const p=roadPos(r,s0), nx=-p.ty, ny=p.tx; const X=p.x-nx*1.5, Y=p.y-ny*1.5; if (nearInter(p.x,p.y,2)||!okSpot(X,Y)) continue; lamp(g,X*TS,Y*TS); }
    for (let s0=7.5;s0<r.L-1;s0+=8){ const p=roadPos(r,s0), nx=-p.ty, ny=p.tx; const side=Math.floor(s0)%2?1:-1; const X=p.x+nx*1.6*side, Y=p.y+ny*1.6*side; if (nearInter(p.x,p.y,2.4)||!okSpot(X,Y)) continue; drawTree(g,X*TS,Y*TS-4,hash(Math.round(X*7),Math.round(Y*3))); }
  }
  for (const c of INTERS){ if (hash(Math.round(c.x*3),Math.round(c.y*5))>.55) continue; for (const [dx,dy] of [[-2.2,-2.2],[2.2,2.2],[2.2,-2.2],[-2.2,2.2]]){ if (okSpot(c.x+dx,c.y+dy)&&tile(Math.floor(c.x+dx),Math.floor(c.y+dy)+1)!==G.BLD){ traDa(g,(c.x+dx)*TS,(c.y+dy)*TS,L); break; } } }
  for (const l of LAMPS){ const gr=L.createRadialGradient(l.x,l.y+18,2,l.x,l.y+18,64); gr.addColorStop(0,'rgba(255,200,120,.55)'); gr.addColorStop(1,'rgba(255,200,120,0)'); L.fillStyle=gr; L.fillRect(l.x-64,l.y-46,128,128); L.fillStyle='rgba(255,236,170,1)'; L.beginPath(); L.arc(l.x,l.y-26,4,0,7); L.fill(); }
}
function pole(g,x,py,h){
  g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x+3,py+2,5,2,0,0,7); g.fill();
  g.fillStyle='#9b9d9f'; g.fillRect(x-2.5,py-36,5,38); g.fillStyle='#7d7f81'; g.fillRect(x+1,py-36,1.5,38);
  g.fillStyle='#6d6f71'; g.fillRect(x-9,py-32,18,2.5);
  if (h<.6){ g.strokeStyle='rgba(20,20,22,.8)'; g.lineWidth=.8; for (let k=0;k<6;k++){ g.beginPath(); g.ellipse(x+(hash(k,Math.round(x))-.5)*6,py-26+k,6+k,3+hash(Math.round(x),k)*3,hash(k,k+Math.round(x)),0,7); g.stroke(); } }
  g.fillStyle='#3a3c3f'; g.fillRect(x-4,py-24,8,6);
  if (h<.3){ g.fillStyle='#f4c534'; g.fillRect(x-7,py-18,14,9); g.fillStyle='#c0392b'; g.fillRect(x-6,py-16,12,1.5); g.fillRect(x-6,py-13,9,1.5); }
}
function parkedBike(g,x,y,a,c){
  g.save(); g.translate(x,y); g.rotate(Math.PI/2+a);
  g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(2,2,11,4.5,0,0,7); g.fill();
  g.fillStyle='#1d1f22'; rr(g,-12,-2,5,4,2); g.fill(); rr(g,7,-2,5,4,2); g.fill();
  g.fillStyle=c; rr(g,-8,-3.5,15,7,3.5); g.fill(); g.fillStyle='#222'; rr(g,-5,-2.5,8,5,2.5); g.fill();
  g.strokeStyle='#666'; g.lineWidth=1.2; g.beginPath(); g.moveTo(8,-5); g.lineTo(8,5); g.stroke();
  g.restore();
}
function traDa(g,x,y,L){
  g.fillStyle='rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x+2,y+4,18,8,0,0,7); g.fill();
  g.fillStyle='#2f6fa3'; g.fillRect(x-7,y-5,14,9); g.fillStyle='rgba(255,255,255,.3)'; g.fillRect(x-7,y-5,14,2);
  g.fillStyle='#f4f4f0'; for (const [cx,cy] of [[-3,-2],[1,0],[4,-3]]){ g.beginPath(); g.arc(x+cx,y+cy,1.6,0,7); g.fill(); }
  for (const [sx,sy,c] of [[-13,-2,'#e8402a'],[12,-1,'#2f6fa3'],[-2,9,'#e8402a'],[1,-12,'#f4c534']]){ g.fillStyle='rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x+sx+1,y+sy+2,4.5,2.5,0,0,7); g.fill(); g.fillStyle=c; rr(g,x+sx-4,y+sy-4,8,7,2.5); g.fill(); g.fillStyle='rgba(255,255,255,.25)'; g.fillRect(x+sx-3,y+sy-3,6,1.5); }
  g.fillStyle='#c0392b'; rr(g,x+16,y-14,6,12,2); g.fill(); g.fillStyle='#ddd'; g.fillRect(x+16.5,y-15,5,2);
  g.font='700 8px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.fillStyle='rgba(30,30,30,.85)'; g.fillRect(x-14,y-26,28,10); g.fillStyle='#ffe066'; g.fillText('TRÀ ĐÁ',x,y-18.5);
  L.fillStyle='rgba(255,190,110,.5)'; L.beginPath(); L.arc(x,y,18,0,7); L.fill();
}
function willow(g,x,y,h){
  g.fillStyle='rgba(20,40,20,.22)'; g.beginPath(); g.ellipse(x+4,y+8,14,5,0,0,7); g.fill();
  g.fillStyle='#5b4128'; g.fillRect(x-2,y-10,4,18);
  g.fillStyle=h<.5?'#5f9e45':'#6aa84c'; g.beginPath(); g.arc(x,y-16,11,0,7); g.fill();
  g.strokeStyle=h<.5?'#7fbf5a':'#8dcb66'; g.lineWidth=1.3;
  for (let k=0;k<11;k++){ const sx=x-11+k*2.2; g.beginPath(); g.moveTo(sx,y-20+Math.abs(k-5)*.8); g.quadraticCurveTo(sx+1.5,y-8,sx+(k-5)*.4,y+2-Math.abs(k-5)*.6); g.stroke(); }
}
function curvedRoof(g,x,y,w,h,c,ridge){
  g.fillStyle=shade(c,-.35); g.beginPath(); g.moveTo(x-6,y+h); g.quadraticCurveTo(x+w/2,y+h-4,x+w+6,y+h); g.lineTo(x+w+9,y+h-7); g.lineTo(x+w-4,y); g.lineTo(x+4,y); g.lineTo(x-9,y+h-7); g.closePath(); g.fill();
  const gr=g.createLinearGradient(0,y,0,y+h); gr.addColorStop(0,shade(c,.15)); gr.addColorStop(1,shade(c,-.15)); g.fillStyle=gr;
  g.beginPath(); g.moveTo(x-4,y+h-3); g.quadraticCurveTo(x+w/2,y+h-7,x+w+4,y+h-3); g.lineTo(x+w-4,y+2); g.lineTo(x+4,y+2); g.closePath(); g.fill();
  g.strokeStyle=shade(c,-.3); g.lineWidth=.8; for (let xx=x+4; xx<x+w-2; xx+=4){ g.beginPath(); g.moveTo(xx,y+3); g.lineTo(xx+(xx-x-w/2)*.08,y+h-5); g.stroke(); }
  g.fillStyle=ridge||shade(c,-.45); g.fillRect(x+2,y,w-4,3);
  g.beginPath(); g.moveTo(x+2,y); g.quadraticCurveTo(x-2,y-2,x-3,y-6); g.lineTo(x+4,y); g.fill(); g.beginPath(); g.moveTo(x+w-2,y); g.quadraticCurveTo(x+w+2,y-2,x+w+3,y-6); g.lineTo(x+w-4,y); g.fill();
}
function drawLandmark(g,L,b){
  const px=b.x*TS, py=b.y*TS, w=b.w*TS, h=b.h*TS, dx=b.door.x*TS+TS/2;
  const label=(t,x,y)=>{ g.font='800 11px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; const tw=g.measureText(t).width+14; g.fillStyle='rgba(120,24,16,.92)'; g.fillRect(x-tw/2,y-9,tw,17); g.fillStyle='#ffe066'; g.fillText(t,x,y+3.5); };
  g.fillStyle='rgba(20,35,20,.3)'; g.fillRect(px+6,py+6,w,h);
  if (b.id==='vanmieu'){
    g.fillStyle='#7cb25b'; g.fillRect(px,py,w,h);
    g.fillStyle='#a0452e'; g.fillRect(px,py,w,5); g.fillRect(px,py+h-5,w,5); g.fillRect(px,py,5,h); g.fillRect(px+w-5,py,5,h);
    g.fillStyle='#6f3020'; g.fillRect(px,py,w,1.5); g.fillRect(px,py+h-5,w,1.5);
    g.fillStyle='#d9cfb8'; g.fillRect(dx-6,py+h*.35,12,h*.65-5);
    // Thiên Quang Tỉnh + bia tiến sĩ
    const pw=w*.5, ph=h*.16, pxx=px+(w-pw)/2, pyy=py+h*.42; g.fillStyle='#8a8f87'; g.fillRect(pxx-3,pyy-3,pw+6,ph+6); g.fillStyle='#3f8f7c'; g.fillRect(pxx,pyy,pw,ph); g.fillStyle='rgba(255,255,255,.25)'; g.fillRect(pxx+4,pyy+4,pw*.4,2);
    for (let k=0;k<5;k++){ for (const sx of [px+12, px+w-24]){ const sy=pyy-6+k*10; g.fillStyle='#5f6b62'; g.beginPath(); g.ellipse(sx+6,sy+6,6,3.5,0,0,7); g.fill(); g.fillStyle='#a9a99e'; g.fillRect(sx+3,sy-2,6,7); } }
    curvedRoof(g,px+16,py+12,w-32,40,'#b8562f'); g.fillStyle='#e8c66a'; g.fillRect(px+20,py+50,w-40,12); g.fillStyle='#8a2d1c'; for (let k=0;k<5;k++) g.fillRect(px+28+k*((w-56)/4)-4,py+52,8,10);
    curvedRoof(g,dx-18,py+h*.26,36,18,'#c4632f'); g.fillStyle='#d8c39b'; g.fillRect(dx-12,py+h*.26+18,24,10); g.fillStyle='#3a2a20'; g.beginPath(); g.arc(dx,py+h*.26+23,4,0,7); g.fill();
    for (const [tx,ty] of [[px+22,py+h*.7],[px+w-22,py+h*.7],[px+22,py+h*.28],[px+w-22,py+h*.28]]){ g.fillStyle='#3f8a3c'; g.beginPath(); g.arc(tx,ty,9,0,7); g.fill(); g.fillStyle='#fff3e0'; for (let k=0;k<4;k++){ g.beginPath(); g.arc(tx-4+k*3,ty-3+(k%2)*3,1.6,0,7); g.fill(); } }
    curvedRoof(g,dx-28,py+h-34,56,20,'#b8562f'); g.fillStyle='#e7d5b0'; g.fillRect(dx-22,py+h-14,44,11); g.fillStyle='#7a2416'; g.fillRect(dx-6,py+h-14,12,11); g.fillStyle='#4a2014'; g.fillRect(dx-16,py+h-12,5,8); g.fillRect(dx+11,py+h-12,5,8);
    L.fillStyle='rgba(255,180,90,.6)'; L.fillRect(dx-6,py+h-14,12,11);
    label('VĂN MIẾU',dx,py+h-42);
  } else if (b.id==='cotco'){
    g.fillStyle='#7cb25b'; g.fillRect(px,py,w,h);
    for (let k=0;k<3;k++){ const ins=6+k*12, top=py+h*.38+k*6; g.fillStyle=k%2?'#a69a86':'#b9ad97'; g.fillRect(px+ins,top,w-ins*2,py+h-top-ins*.4); g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(px+ins,py+h-ins*.4-4,w-ins*2,4); g.fillStyle='rgba(255,255,255,.2)'; g.fillRect(px+ins,top,w-ins*2,2); }
    g.fillStyle='#4a3a2c'; rr(g,dx-6,py+h-16,12,13,6); g.fill();
    const tx=dx, base=py+h*.5; const tg=g.createLinearGradient(tx-10,0,tx+10,0); tg.addColorStop(0,'#c27a58'); tg.addColorStop(.5,'#a85f42'); tg.addColorStop(1,'#7f4430'); g.fillStyle=tg; g.fillRect(tx-10,base-80,20,82);
    g.fillStyle='rgba(0,0,0,.2)'; for (let k=0;k<6;k++) g.fillRect(tx-10,base-74+k*13,20,1); g.fillStyle='#2f2620'; for (let k=0;k<4;k++) g.fillRect(tx-2,base-68+k*16,4,6);
    g.fillStyle='#8f513a'; g.fillRect(tx-14,base-86,28,8); g.fillStyle='#c9b9a0'; g.fillRect(tx-12,base-84,24,1.5);
    g.strokeStyle='#d9d4c9'; g.lineWidth=1.5; g.beginPath(); g.moveTo(tx,base-86); g.lineTo(tx,base-118); g.stroke();
    g.fillStyle='#da251d'; g.beginPath(); g.moveTo(tx,base-118); g.quadraticCurveTo(tx+12,base-122,tx+24,base-117); g.lineTo(tx+24,base-102); g.quadraticCurveTo(tx+12,base-107,tx,base-103); g.closePath(); g.fill();
    star(g,tx+12,base-110.5,4.5,'#ffcd00');
    L.fillStyle='rgba(255,210,150,.5)'; L.fillRect(tx-10,base-80,20,82);
    label('CỘT CỜ',dx,py+h+14);
  } else if (b.id==='nhahat'){
    const rh=h*.45, fy=py+rh;
    g.fillStyle='#6f8796'; g.fillRect(px-2,py,w+4,rh); g.fillStyle='rgba(255,255,255,.15)'; for (let x=px; x<px+w; x+=5) g.fillRect(x,py,1.5,rh);
    g.fillStyle='#5d7584'; g.beginPath(); g.ellipse(px+w/2,py+rh*.55,w*.22,rh*.42,0,0,7); g.fill(); g.fillStyle='#8aa2b0'; g.beginPath(); g.ellipse(px+w/2-4,py+rh*.45,w*.12,rh*.22,0,0,7); g.fill();
    g.fillStyle='#e6d9b8'; g.fillRect(px+w/2-2,py+2,4,8);
    const fg=g.createLinearGradient(0,fy,0,py+h); fg.addColorStop(0,'#f5e6bf'); fg.addColorStop(1,'#dcc794'); g.fillStyle=fg; g.fillRect(px,fy,w,h-rh);
    g.fillStyle='#e9dbb3'; g.beginPath(); g.moveTo(px+w*.25,fy+2); g.lineTo(px+w/2,fy-12); g.lineTo(px+w*.75,fy+2); g.fill(); g.strokeStyle='#bfa77a'; g.lineWidth=1; g.stroke();
    for (let k=0;k<6;k++){ const cx=px+12+k*((w-24)/5); g.fillStyle='#fffaf0'; g.fillRect(cx-3,fy+16,6,h-rh-22); g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(cx+1.5,fy+16,1.5,h-rh-22); g.fillStyle='#fffaf0'; g.fillRect(cx-4.5,fy+14,9,3); }
    for (let k=0;k<5;k++){ const wx=px+12+(k+.5)*((w-24)/5)-5; g.fillStyle='#3d5363'; g.beginPath(); g.moveTo(wx,fy+40); g.lineTo(wx,fy+24); g.arc(wx+5,fy+24,5,Math.PI,0); g.lineTo(wx+10,fy+40); g.fill(); L.fillStyle='rgba(255,200,120,.95)'; L.fillRect(wx,fy+20,10,20); }
    g.fillStyle='#cdbb92'; g.fillRect(px+10,py+h-6,w-20,3); g.fillStyle='#bba878'; g.fillRect(px+16,py+h-3,w-32,3);
    label('NHÀ HÁT LỚN',px+w/2,fy+8);
  } else if (b.id==='ga'){
    const rh=h*.42, fy=py+rh;
    g.fillStyle='#c8c2b5'; g.fillRect(px,py,w,rh); g.strokeStyle='#e3ddd0'; g.lineWidth=3; g.strokeRect(px+1.5,py+1.5,w-3,rh-3);
    g.fillStyle='#9ea7ad'; g.fillRect(px+w*.35,py-8,w*.3,rh+8);
    for (const [ox,ow] of [[0,w*.35],[w*.65,w*.35]]){ const fg=g.createLinearGradient(0,fy,0,py+h); fg.addColorStop(0,'#f4d97e'); fg.addColorStop(1,'#dcbc5a'); g.fillStyle=fg; g.fillRect(px+ox,fy,ow,h-rh); for (let k=0;k<3;k++) win(g,L,px+ox+10+k*(ow-20)/3,fy+12,16,22,'#3f8f5a'); }
    g.fillStyle='#b9c1c6'; g.fillRect(px+w*.35,fy-8,w*.3,h-rh+8); g.fillStyle='#4c5a63'; for (let k=0;k<6;k++) g.fillRect(px+w*.35+8+k*((w*.3-16)/5)-1,fy+18,2,h-rh-22);
    g.fillStyle='#fff'; g.beginPath(); g.arc(px+w/2,fy+2,9,0,7); g.fill(); g.strokeStyle='#333'; g.lineWidth=1.5; g.stroke(); g.beginPath(); g.moveTo(px+w/2,fy+2); g.lineTo(px+w/2,fy-4); g.moveTo(px+w/2,fy+2); g.lineTo(px+w/2+4,fy+3); g.stroke();
    g.fillStyle='#2e4d63'; g.fillRect(dx-14,py+h-26,28,23); g.fillStyle='#9fd0ee'; g.fillRect(dx-12,py+h-24,24,21); L.fillStyle='rgba(255,220,150,.9)'; L.fillRect(dx-12,py+h-24,24,21);
    g.fillStyle='#c0392b'; g.fillRect(px+w/2-34,fy+12,68,14); g.fillStyle='#fff'; g.font='800 10px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.fillText('GA HÀ NỘI',px+w/2,fy+22.5);
  } else if (b.id==='ngocson'){
    curvedRoof(g,px+4,py-4,w-8,30,'#9d3b22','#5c1f12');
    g.fillStyle='#e9c36a'; g.fillRect(px+8,py+26,w-16,h-29); g.fillStyle='#7a1f12'; g.fillRect(dx-6,py+h-15,12,12); L.fillStyle='rgba(255,170,80,.8)'; L.fillRect(dx-6,py+h-15,12,12);
    g.fillStyle='#c0392b'; g.fillRect(px+10,py+28,3,h-31); g.fillRect(px+w-13,py+28,3,h-31);
  }
}
function star(g,x,y,r,c){ g.fillStyle=c; g.beginPath(); for (let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, rr2=k%2?r*.4:r; g.lineTo(x+Math.cos(a)*rr2,y+Math.sin(a)*rr2); } g.closePath(); g.fill(); }
function lamp(g,x,y){
  LAMPS.push({x,y});
  g.fillStyle='rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x+2,y+2,4,1.8,0,0,7); g.fill();
  g.fillStyle='#4b5a66'; g.fillRect(x-1.5,y-26,3,28);
  g.strokeStyle='#4b5a66'; g.lineWidth=2; g.beginPath(); g.moveTo(x,y-24); g.quadraticCurveTo(x,y-30,x+6,y-30); g.stroke();
  g.fillStyle='#2f3b44'; rr(g,x+3,y-32,9,4,2); g.fill(); g.fillStyle='#fff2c2'; g.fillRect(x+5,y-28.5,5,1.5);
}
function drawTree(g,cx,cy,h){
  g.fillStyle='rgba(20,40,20,.28)'; g.beginPath(); g.ellipse(cx+5,cy+11,15,6,0,0,7); g.fill();
  g.fillStyle='#6b4a2b'; g.fillRect(cx-2.5,cy-2,5,13); g.fillStyle='#57391f'; g.fillRect(cx+.5,cy-2,2,13);
  const base=h<.5?['#2e6f35','#3b8a40','#57a650','#7cc067']:['#356f2e','#4a8f37','#69ad4a','#93c86a'];
  const blobs=[[-7,-8,9],[7,-8,9],[0,-15,10],[-3,-4,9],[5,-3,8]];
  g.fillStyle=base[0]; for (const [dx,dy,r] of blobs){ g.beginPath(); g.arc(cx+dx+1,cy+dy+1.5,r+1.5,0,7); g.fill(); }
  g.fillStyle=base[1]; for (const [dx,dy,r] of blobs){ g.beginPath(); g.arc(cx+dx,cy+dy,r,0,7); g.fill(); }
  g.fillStyle=base[2]; for (const [dx,dy,r] of blobs){ g.beginPath(); g.arc(cx+dx-2,cy+dy-2.5,r*.6,0,7); g.fill(); }
  g.fillStyle=base[3]; g.beginPath(); g.arc(cx-4,cy-18,3,0,7); g.arc(cx+5,cy-11,2.2,0,7); g.fill();
}
function roofTile(g,x,y,w,h,c){
  const gr=g.createLinearGradient(0,y,0,y+h); gr.addColorStop(0,shade(c,.15)); gr.addColorStop(.45,c); gr.addColorStop(1,shade(c,-.28)); g.fillStyle=gr; g.fillRect(x,y,w,h);
  g.strokeStyle=shade(c,-.32); g.lineWidth=1;
  for (let yy=y+6, row=0; yy<y+h-2; yy+=6, row++){ g.beginPath(); for (let xx=x-(row%2)*5; xx<x+w; xx+=10){ g.moveTo(xx,yy); g.quadraticCurveTo(xx+5,yy+3.5,xx+10,yy); } g.stroke(); }
  g.fillStyle=shade(c,-.1); g.fillRect(x,y+3,w,4); g.fillStyle=shade(c,.35); g.fillRect(x,y+3,w,1.2);
  g.fillStyle=shade(c,-.5); g.fillRect(x,y+h-3,w,3);
}
function roofFlat(g,x,y,w,h,c,H,big){
  g.fillStyle=c; g.fillRect(x,y,w,h);
  for (let k=0;k<w*h/90;k++){ g.fillStyle=k%2?'rgba(0,0,0,.05)':'rgba(255,255,255,.07)'; g.fillRect(x+hash(k,H*99)*w,y+hash(H*77,k)*h,2,2); }
  g.strokeStyle=shade(c,.3); g.lineWidth=3; g.strokeRect(x+1.5,y+1.5,w-3,h-3); g.strokeStyle=shade(c,-.18); g.lineWidth=1; g.strokeRect(x+4,y+4,w-8,h-8);
  // inox water tank
  const tx=x+w-30, ty=y+7; g.fillStyle='rgba(0,0,0,.2)'; rr(g,tx+2,ty+3,22,12,6); g.fill();
  const tg=g.createLinearGradient(0,ty,0,ty+12); tg.addColorStop(0,'#f6f8fa'); tg.addColorStop(.4,'#b9c1c8'); tg.addColorStop(.7,'#e6eaee'); tg.addColorStop(1,'#8b949c'); g.fillStyle=tg; rr(g,tx,ty,22,12,6); g.fill();
  g.strokeStyle='rgba(90,100,110,.6)'; g.beginPath(); g.moveTo(tx+7,ty); g.lineTo(tx+7,ty+12); g.moveTo(tx+15,ty); g.lineTo(tx+15,ty+12); g.stroke();
  if (h>40){
    if (H<.5){ for (let k=0;k<3;k++){ const px=x+10+k*12, py=y+h-14; g.fillStyle='#a0522d'; g.fillRect(px-4,py,8,7); g.fillStyle=k%2?'#3f8f3a':'#56a64a'; g.beginPath(); g.arc(px,py-1,6,0,7); g.fill(); if (k===1){ g.fillStyle='#f06a8a'; g.beginPath(); g.arc(px+2,py-3,1.8,0,7); g.fill(); } } }
    else { const ly=y+h-16; g.strokeStyle='#555'; g.lineWidth=.8; g.beginPath(); g.moveTo(x+8,ly); g.lineTo(x+Math.min(w-40,60),ly); g.stroke(); ['#e85d5d','#4a90d9','#f2d16b','#fff','#7cc067'].forEach((cl,k)=>{ g.fillStyle=cl; g.fillRect(x+12+k*9,ly,6,8); }); }
  }
  if (big){ for (let k=0;k<2;k++){ const ax=x+10+k*20, ay=y+8; g.fillStyle='#d9dde1'; g.fillRect(ax,ay,16,12); g.fillStyle='#8f989f'; g.beginPath(); g.arc(ax+8,ay+6,4.5,0,7); g.fill(); g.strokeStyle='#d9dde1'; g.beginPath(); g.moveTo(ax+4,ay+6); g.lineTo(ax+12,ay+6); g.stroke(); } }
}
function roofMetal(g,x,y,w,h,c,factory){
  g.fillStyle=c; g.fillRect(x,y,w,h);
  for (let xx=x; xx<x+w; xx+=5){ g.fillStyle=shade(c,.14); g.fillRect(xx,y,2,h); g.fillStyle=shade(c,-.14); g.fillRect(xx+2.5,y,1.5,h); }
  const gr=g.createLinearGradient(0,y,0,y+h); gr.addColorStop(0,'rgba(255,255,255,.12)'); gr.addColorStop(1,'rgba(0,0,0,.18)'); g.fillStyle=gr; g.fillRect(x,y,w,h);
  for (let k=0;k<Math.floor(w/70);k++){ const sx=x+20+k*70, sy=y+10; g.fillStyle='#8ec3e6'; g.fillRect(sx,sy,26,Math.min(18,h-20)); g.fillStyle='rgba(255,255,255,.5)'; g.fillRect(sx,sy,26,3); }
  g.fillStyle=shade(c,-.45); g.fillRect(x,y+h-3,w,3);
  if (factory){ const cx=x+w-24, cy=y+18; g.fillStyle='#6b6f73'; g.beginPath(); g.arc(cx,cy,9,0,7); g.fill(); g.fillStyle='#3d4043'; g.beginPath(); g.arc(cx,cy,6,0,7); g.fill();
    g.fillStyle='rgba(230,232,235,.65)'; for (let k=0;k<4;k++){ g.beginPath(); g.arc(cx+6+k*7,cy-6-k*6,5+k*2,0,7); g.fill(); } }
}
function roofThatch(g,x,y,w,h,c){
  g.fillStyle=c; g.fillRect(x,y,w,h);
  for (let k=0;k<w*h/18;k++){ const a=hash(k,3), b2=hash(5,k); g.strokeStyle=k%3?shade(c,-.2):shade(c,.25); g.lineWidth=1; const sx=x+a*w, sy=y+b2*h; g.beginPath(); g.moveTo(sx,sy); g.lineTo(sx+1,sy+6); g.stroke(); }
  g.fillStyle=shade(c,-.3); g.fillRect(x,y+h/2-2,w,3); g.fillStyle=shade(c,-.5); g.fillRect(x,y+h-3,w,3);
}
function win(g,L,x,y,w,h,shutter){
  g.fillStyle='#3d5363'; g.fillRect(x,y,w,h); g.fillStyle='#7fb0cf'; g.fillRect(x+1.5,y+1.5,w-3,h-3);
  g.fillStyle='rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(x+2,y+h-2); g.lineTo(x+w*.5,y+2); g.lineTo(x+w*.7,y+2); g.lineTo(x+w*.2,y+h-2); g.fill();
  g.fillStyle='#3d5363'; g.fillRect(x+w/2-.5,y,1,h);
  if (shutter){ g.fillStyle=shutter; g.fillRect(x-6,y-1,5,h+2); g.fillRect(x+w+1,y-1,5,h+2); g.fillStyle='rgba(0,0,0,.2)'; for (let k=1;k<h;k+=3){ g.fillRect(x-6,y+k,5,1); g.fillRect(x+w+1,y+k,5,1); } }
  L.fillStyle='rgba(255,196,110,.85)'; L.fillRect(x+1,y+1,w-2,h-2);
}
function awning(g,x,y,w,c1,c2){
  for (let xx=x, i=0; xx<x+w; xx+=8, i++){ g.fillStyle=i%2?c2:c1; g.fillRect(xx,y,Math.min(8,x+w-xx),7); g.beginPath(); g.arc(xx+4,y+7,4,0,Math.PI); g.fill(); }
  g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(x,y,w,1.5);
}
function signBoard(g,b,st,x,y,w){
  const t=b.sign; g.font='800 11.5px "Be Vietnam Pro",sans-serif'; const tw=g.measureText(t).width; const sw=Math.min(w-8,tw+34);
  const sx=x+w/2-sw/2; g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(sx+2,y+2,sw,17); g.fillStyle=shade(st.sign,-.35); g.fillRect(sx-1.5,y-1.5,sw+3,20); g.fillStyle=st.sign; g.fillRect(sx,y,sw,17);
  g.fillStyle='rgba(255,255,255,.15)'; g.fillRect(sx,y,sw,3);
  g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=st.st; g.fillText(t,x+w/2+8,y+9.5); g.font='11px sans-serif'; g.fillText(b.icon,sx+11,y+9); g.textBaseline='alphabetic';
}
function drawBuilding(g,L,b){
  const px=b.x*TS, py=b.y*TS, w=b.w*TS, h=b.h*TS, house=b.kind==='house', H=hash(b.x*3,b.y*7);
  const st=house?{roof:H<.55?'flat':'tile',rc:H<.55?'#d3cbbd':['#c4643f','#b3473a','#a65a3a'][Math.floor(H*3)],wall:HOUSE_COLS[Math.floor(hash(b.x,b.y*5)*HOUSE_COLS.length)],front:'door'}:KSTYLE[b.kind];
  const fh=house?56:Math.min(80,h-44), rh=h-fh, fy=py+rh;
  // ground shadow
  g.fillStyle='rgba(20,35,20,.3)'; g.beginPath(); g.moveTo(px+w,py+4); g.lineTo(px+w+9,py+12); g.lineTo(px+w+9,py+h+5); g.lineTo(px+6,py+h+5); g.lineTo(px,py+h); g.lineTo(px+w,py+h); g.closePath(); g.fill();
  // roof
  if (st.roof==='tile') roofTile(g,px-3,py,w+6,rh,st.rc);
  else if (st.roof==='flat') roofFlat(g,px,py,w,rh,st.rc,H,b.kind==='cowork'||b.kind==='bank');
  else if (st.roof==='metal') roofMetal(g,px-2,py,w+4,rh,st.rc,b.kind==='factory');
  else roofThatch(g,px-3,py,w+6,rh,st.rc);
  if (!house && st.roof!=='flat'){ g.font='20px sans-serif'; g.textAlign='center'; g.fillText(b.icon,px+w/2,py+rh/2+7); }
  // facade
  const wall=st.wall, fg=g.createLinearGradient(0,fy,0,fy+fh); fg.addColorStop(0,shade(wall,.1)); fg.addColorStop(1,shade(wall,-.12)); g.fillStyle=fg; g.fillRect(px,fy,w,fh);
  g.fillStyle='rgba(0,0,0,.2)'; g.fillRect(px,fy,w,4);
  g.fillStyle='rgba(0,0,0,.08)'; g.fillRect(px,fy,3,fh); g.fillRect(px+w-3,fy,3,fh);
  g.fillStyle=shade(wall,-.4); g.fillRect(px,py+h-3,w,3);
  const dx=b.door.x*TS+TS/2;
  if (house){
    // upper floor: window + balcony
    win(g,L,px+w/2-14,fy+6,28,15,'#3f8f5a');
    g.fillStyle=shade(wall,-.2); g.fillRect(px+8,fy+22,w-16,3);
    g.strokeStyle='#2f3437'; g.lineWidth=1; g.beginPath(); g.moveTo(px+8,fy+16); g.lineTo(px+w-8,fy+16); for (let xx=px+10; xx<px+w-8; xx+=4){ g.moveTo(xx,fy+16); g.lineTo(xx,fy+22); } g.stroke();
    for (let k=0;k<3;k++){ const fx=px+14+k*((w-28)/2); g.fillStyle='#4f9a3f'; g.beginPath(); g.arc(fx,fy+14,4,0,7); g.fill(); g.fillStyle=['#f06a8a','#f3d34a','#fff'][Math.floor(hash(k,b.x)*3)]; g.beginPath(); g.arc(fx+1,fy+12,1.6,0,7); g.fill(); }
    if (hash(b.x*7,b.y*3)<.5){ g.strokeStyle='#666'; g.lineWidth=1.2; g.beginPath(); g.moveTo(px+6,fy+20); g.lineTo(px-4,fy+4); g.stroke(); g.fillStyle='#da251d'; g.beginPath(); g.moveTo(px-4,fy+4); g.lineTo(px-17,fy+1); g.lineTo(px-15,fy+10); g.lineTo(px-3,fy+12); g.closePath(); g.fill(); star(g,px-9.5,fy+6.5,2.4,'#ffcd00'); }
    if (H>.3){ g.fillStyle='#e9edf0'; g.fillRect(px+w-17,fy+5,12,8); g.fillStyle='#aab3ba'; g.beginPath(); g.arc(px+w-11,fy+9,2.5,0,7); g.fill(); }
    // ground
    if (H<.5){ // roller shutter half up
      g.fillStyle='#4a3020'; g.fillRect(dx-16,fy+29,32,24); L.fillStyle='rgba(255,190,110,.8)'; L.fillRect(dx-16,fy+38,32,15);
      g.fillStyle='#a8b0b6'; g.fillRect(dx-16,fy+29,32,10); g.fillStyle='rgba(0,0,0,.18)'; for (let k=0;k<10;k+=2) g.fillRect(dx-16,fy+29+k,32,1);
    } else {
      g.fillStyle=shade('#7a4a2a',-.2); g.fillRect(dx-11,fy+28,22,25); g.fillStyle='#8a5530'; g.fillRect(dx-10,fy+29,9.5,24); g.fillRect(dx+.5,fy+29,9.5,24); g.fillStyle='#e0b25a'; g.fillRect(dx-2.5,fy+41,1.5,3); g.fillRect(dx+1,fy+41,1.5,3);
    }
    g.fillStyle='#1f5aa6'; rr(g,px+5,fy+31,16,11,2); g.fill(); g.fillStyle='#fff'; g.font='700 8px "Be Vietnam Pro",sans-serif'; g.textAlign='center'; g.fillText(String(b.num),px+13,fy+39.5);
    return;
  }
  if (b.id==='market'){ const n=5, gw=w/n; for (let k=0;k<n;k++){ const gx=px+k*gw; g.fillStyle='#efe2c2'; g.beginPath(); g.moveTo(gx+3,fy+2); g.lineTo(gx+gw/2,fy-16); g.lineTo(gx+gw-3,fy+2); g.closePath(); g.fill(); g.strokeStyle='#bfa77a'; g.lineWidth=1.2; g.stroke(); g.fillStyle='#3d5363'; g.beginPath(); g.arc(gx+gw/2,fy-2,5,Math.PI,0); g.fill(); } }
  const two=fh>=72, gy=py+h-32;
  if (two){ const n=Math.max(2,Math.floor(w/34)); for (let k=0;k<n;k++){ const wx=px+(w/n)*(k+.5)-9; win(g,L,wx,fy+8,18,16,st.front==='glass'?null:(k%2?'#3f8f5a':'#3f8f5a')); } }
  signBoard(g,b,st,px,two?fy+29:fy+6,w);
  const aw=two?fy+48:fy+25;
  const AW={stalls:['#d8432f','#fff2e0'],stools:['#d8432f','#f4c534'],food:['#d8432f','#f4c534'],bikes:['#2f6fa3','#fff'],sacks:['#3f8f5a','#f3e4c4'],boxes:['#1f5aa6','#e9eef2'],board:['#a8322a','#f3e4c4']}[st.front];
  const F=st.front;
  if (F==='glass'){
    g.fillStyle='#2a4c66'; g.fillRect(px+4,gy-2,w-8,30);
    for (let xx=px+4; xx<px+w-4; xx+=16){ g.fillStyle='#7fb7da'; g.fillRect(xx+1,gy-1,14,28); g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(xx+2,gy+26); g.lineTo(xx+9,gy); g.lineTo(xx+13,gy); g.lineTo(xx+6,gy+26); g.fill(); }
    L.fillStyle='rgba(200,230,255,.6)'; L.fillRect(px+4,gy-2,w-8,30);
    for (let k=0;k<3;k++){ const sx=px+30+k*60; if (Math.abs(sx-dx)<18) continue; g.fillStyle='rgba(20,40,60,.55)'; g.beginPath(); g.arc(sx,gy+11,3.5,0,7); g.fill(); g.fillRect(sx-5,gy+15,10,9); g.fillStyle='rgba(240,250,255,.7)'; g.fillRect(sx+4,gy+17,7,5); }
    g.fillStyle='#1d3346'; g.fillRect(dx-10,gy+2,20,26); g.fillStyle='#9fd0ee'; g.fillRect(dx-9,gy+3,8.5,25); g.fillRect(dx+.5,gy+3,8.5,25);
  } else if (F==='columns'){
    for (let k=0;k<4;k++){ const cx=px+12+k*((w-24)/3); g.fillStyle='#f7f4ec'; g.fillRect(cx-4,aw-2,8,32); g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(cx+2,aw-2,2,32); }
    g.fillStyle='#2d4a3e'; g.fillRect(dx-13,gy,26,28); g.fillStyle='#8cc5ad'; g.fillRect(dx-12,gy+1,11.5,27); g.fillRect(dx+.5,gy+1,11.5,27); L.fillStyle='rgba(255,220,150,.8)'; L.fillRect(dx-12,gy+1,24,27);
    g.fillStyle='#d8d2c4'; g.fillRect(dx-18,py+h-5,36,3);
  } else if (F==='rolldoor'){
    const rw=w*.5, rx=px+w*.12; g.fillStyle='#f4c534'; g.fillRect(rx-4,gy-6,rw+8,34); g.fillStyle='#231900'; for (let k=0;k<rw+8;k+=10){ g.beginPath(); g.moveTo(rx-4+k,gy-6); g.lineTo(rx+2+k,gy-6); g.lineTo(rx-4+k,gy); g.fill(); }
    g.fillStyle='#a3abb2'; g.fillRect(rx,gy,rw,28); g.fillStyle='rgba(0,0,0,.15)'; for (let k=0;k<28;k+=3) g.fillRect(rx,gy+k,rw,1);
    g.fillStyle='#5e676f'; g.fillRect(dx-9,gy+4,18,24); g.fillStyle='#9fc7e0'; g.fillRect(dx-6,gy+7,12,8); L.fillStyle='rgba(255,220,150,.8)'; L.fillRect(dx-6,gy+7,12,8);
    g.strokeStyle='#7c858c'; g.lineWidth=3; g.beginPath(); g.moveTo(px+w-14,fy+4); g.lineTo(px+w-14,gy+20); g.lineTo(px+w-4,gy+20); g.stroke();
    for (let k=0;k<2;k++){ g.fillStyle='#3e7bbf'; g.beginPath(); g.ellipse(px+w-30-k*14,py+h-12,6,8,0,0,7); g.fill(); g.fillStyle='rgba(255,255,255,.3)'; g.fillRect(px+w-33-k*14,py+h-19,2,12); }
  } else if (F==='board'){
    g.fillStyle='#5a3a24'; g.fillRect(px+8,gy-4,w-16,30); g.fillStyle='#d9c3a0'; g.fillRect(px+11,gy-1,w-22,24);
    for (let k=0;k<7;k++){ const nx=px+14+hash(k,9)*(w-36), ny=gy+1+hash(9,k)*12; g.fillStyle=['#fff','#fff6c2','#cfe8ff','#ffd7d7'][k%4]; g.fillRect(nx,ny,12,9); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(nx+2,ny+3,8,1); g.fillRect(nx+2,ny+5,6,1); g.fillStyle='#d8432f'; g.beginPath(); g.arc(nx+6,ny+1,1.3,0,7); g.fill(); }
    L.fillStyle='rgba(255,220,150,.5)'; L.fillRect(px+11,gy-1,w-22,24);
  } else {
    // open shopfront with awning
    g.fillStyle=shade(wall,-.25); g.fillRect(px+5,aw+4,4,py+h-aw-7); g.fillRect(px+w-9,aw+4,4,py+h-aw-7);
    const ox=px+9, ow=w-18, oy=aw+6, oh=py+h-3-oy;
    const ig=g.createLinearGradient(0,oy,0,oy+oh); ig.addColorStop(0,'#3a2418'); ig.addColorStop(1,'#6a4329'); g.fillStyle=ig; g.fillRect(ox,oy,ow,oh);
    L.fillStyle='rgba(255,180,90,.9)'; L.fillRect(ox,oy,ow,oh);
    g.fillStyle='rgba(255,210,140,.25)'; g.fillRect(ox,oy,ow,4);
    if (AW) awning(g,px+3,aw,w-6,AW[0],AW[1]);
    if (F==='stalls'){ for (let k=0;k<Math.floor(ow/22);k++){ const cx=ox+4+k*22, cy=py+h-14; g.fillStyle='#a7743f'; g.fillRect(cx,cy,18,10); g.fillStyle='#8a5e31'; g.fillRect(cx,cy+4,18,1.5);
        const fc=['#e8573f','#f3a43a','#7cc067','#f3d34a','#b04a8a'][k%5]; g.fillStyle=fc; for (let j=0;j<5;j++){ g.beginPath(); g.arc(cx+3+j*3,cy-1-(j%2)*2,2.6,0,7); g.fill(); } } }
    if (F==='stools'||F==='food'){ for (let k=0;k<4;k++){ const lx=ox+12+k*((ow-24)/3); g.strokeStyle='#5a2a1a'; g.lineWidth=.8; g.beginPath(); g.moveTo(lx,aw+7); g.lineTo(lx,aw+10); g.stroke(); g.fillStyle='#e8402a'; g.beginPath(); g.ellipse(lx,aw+14,4,5,0,0,7); g.fill(); g.fillStyle='#f4c534'; g.fillRect(lx-3,aw+13,6,1.2); L.fillStyle='rgba(255,90,60,.9)'; L.beginPath(); L.arc(lx,aw+14,6,0,7); L.fill(); }
      for (let k=0;k<3;k++){ const tx=ox+10+k*(ow/3); g.fillStyle='#2f6fa3'; g.fillRect(tx,py+h-15,16,3); g.fillRect(tx+2,py+h-12,2,8); g.fillRect(tx+12,py+h-12,2,8); g.fillStyle='#e8402a'; rr(g,tx-7,py+h-11,6,4,1.5); g.fill(); rr(g,tx+17,py+h-11,6,4,1.5); g.fill(); g.fillRect(tx-6,py+h-7,1.2,4); g.fillRect(tx+18,py+h-7,1.2,4); }
      g.fillStyle='#c9ccd0'; rr(g,ox+ow-22,oy+4,14,10,3); g.fill(); g.fillStyle='rgba(255,255,255,.6)'; for (let k=0;k<3;k++){ g.beginPath(); g.arc(ox+ow-15+k*2,oy+1-k*3,2+k,0,7); g.fill(); } }
    if (F==='bikes'){ for (let k=0;k<2;k++){ const bx=ox+18+k*(ow-50); bike(g,bx,py+h-8,k?'#2f6fa3':'#d8432f'); } g.fillStyle='#222'; for (let k=0;k<3;k++){ g.beginPath(); g.ellipse(ox+ow/2,py+h-8-k*5,8,3,0,0,7); g.fill(); g.fillStyle='#555'; g.beginPath(); g.ellipse(ox+ow/2,py+h-8-k*5,3,1.2,0,0,7); g.fill(); g.fillStyle='#222'; } }
    if (F==='boxes'){ for (let k=0;k<6;k++){ const bx=ox+6+(k%3)*16+(k>2?ow-58:0), by=py+h-14-(k%2)*9; g.fillStyle=k%2?'#c6955a':'#b9864b'; g.fillRect(bx,by,14,10); g.fillStyle='#e8d8b5'; g.fillRect(bx+6,by,2,10); } }
    if (F==='sacks'){ for (let k=0;k<5;k++){ const bx=ox+8+k*((ow-24)/4); if (Math.abs(bx-dx)<12) continue; g.fillStyle='#e8dcc0'; rr(g,bx-6,py+h-17,12,13,4); g.fill(); g.fillStyle='#c9b893'; g.fillRect(bx-6,py+h-14,12,1.5); } g.fillStyle='#e0bf5e'; rr(g,ox+ow-16,py+h-20,18,15,5); g.fill(); g.strokeStyle='#b8913f'; g.lineWidth=1; for (let k=0;k<4;k++){ g.beginPath(); g.moveTo(ox+ow-14,py+h-17+k*3.5); g.lineTo(ox+ow,py+h-17+k*3.5); g.stroke(); } }
    if (F==='door'){ g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(ox,oy,ow,oh); }
  }
}
function bike(g,x,y,c){ g.fillStyle='#1d1f22'; g.beginPath(); g.arc(x-8,y,4.5,0,7); g.arc(x+9,y,4.5,0,7); g.fill(); g.fillStyle='#9aa'; g.beginPath(); g.arc(x-8,y,1.6,0,7); g.arc(x+9,y,1.6,0,7); g.fill();
  g.fillStyle=c; g.beginPath(); g.moveTo(x-9,y-4); g.quadraticCurveTo(x-4,y-11,x+6,y-8); g.lineTo(x+10,y-3); g.lineTo(x-2,y-2); g.closePath(); g.fill(); g.fillStyle='#222'; rr(g,x-8,y-10,10,3,1.5); g.fill(); g.fillStyle='#fff6c2'; g.fillRect(x+9,y-8,2,2); }
const HAIR=['#2a1f1a','#3b2a20','#1b1714','#5a3a25'];
const nameSeed=n=>{ let h=0; for (const c of n) h=(h*31+c.charCodeAt(0))>>>0; return h; };
function drawChar(x,y,color,name,veh,me,step,face,job,hidden){
  if (hidden) return;
  const seed=nameSeed(name), hair=HAIR[seed%4], style=seed%3, moving=!!step;
  const sw=moving?Math.sin(step):0, bob=moving?Math.abs(Math.cos(step))*1.4:0;
  ctx.fillStyle='rgba(15,25,15,.3)'; ctx.beginPath(); ctx.ellipse(x,y+2,veh?16:8,4,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(x,y); ctx.scale(face<0?-1:1,1);
  const OL='rgba(25,22,30,.9)';
  if (veh===1){ ctx.strokeStyle='#1d1f22'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-9,-4,5,0,7); ctx.arc(9,-4,5,0,7); ctx.stroke(); ctx.strokeStyle='#9aa4ab'; ctx.lineWidth=.6; ctx.beginPath(); ctx.moveTo(-14,-4); ctx.lineTo(-4,-4); ctx.moveTo(-9,-9); ctx.lineTo(-9,1); ctx.moveTo(4,-4); ctx.lineTo(14,-4); ctx.moveTo(9,-9); ctx.lineTo(9,1); ctx.stroke();
    ctx.strokeStyle='#2f9e8f'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(-2,-12); ctx.lineTo(7,-12); ctx.lineTo(9,-4); ctx.moveTo(-2,-12); ctx.lineTo(0,-4); ctx.lineTo(-9,-4); ctx.moveTo(7,-12); ctx.lineTo(6,-16); ctx.stroke(); ctx.fillStyle='#222'; ctx.fillRect(-4,-14,6,2); }
  if (veh===2||veh===3){
    if (veh===3){ ctx.fillStyle='#8b5e3c'; ctx.fillRect(-34,-14,20,8); ctx.fillStyle='#6d4529'; ctx.fillRect(-34,-8,20,2); ctx.fillStyle='#c6955a'; ctx.fillRect(-32,-22,8,8); ctx.fillRect(-23,-20,7,6); ctx.fillStyle='#1d1f22'; ctx.beginPath(); ctx.arc(-24,-3,4.5,0,7); ctx.fill(); }
    ctx.fillStyle='#1d1f22'; ctx.beginPath(); ctx.arc(-10,-4,5,0,7); ctx.arc(11,-4,5,0,7); ctx.fill(); ctx.fillStyle='#b9c0c6'; ctx.beginPath(); ctx.arc(-10,-4,2,0,7); ctx.arc(11,-4,2,0,7); ctx.fill();
    const bc=veh===3?'#3e6fa8':'#c0392b'; ctx.fillStyle=bc; ctx.beginPath(); ctx.moveTo(-13,-8); ctx.quadraticCurveTo(-8,-16,4,-12); ctx.lineTo(12,-14); ctx.lineTo(14,-8); ctx.lineTo(2,-6); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.3)'; ctx.fillRect(-8,-14,8,1.5); ctx.fillStyle='#1d1f22'; ctx.fillRect(-11,-16,13,3); ctx.strokeStyle='#555'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(11,-13); ctx.lineTo(9,-21); ctx.stroke(); ctx.fillStyle='#fff3b0'; ctx.beginPath(); ctx.arc(13.5,-12,1.8,0,7); ctx.fill(); }
  const by=-(veh?11:0)-bob;
  // legs
  ctx.fillStyle='#2c3a4d';
  if (!veh){ ctx.save(); ctx.translate(-2,by-9); ctx.rotate(sw*.5); ctx.fillRect(-2,0,4,9); ctx.fillStyle='#1a1a1a'; ctx.fillRect(-2,8,5,2.2); ctx.restore(); ctx.fillStyle='#2c3a4d'; ctx.save(); ctx.translate(2,by-9); ctx.rotate(-sw*.5); ctx.fillRect(-2,0,4,9); ctx.fillStyle='#1a1a1a'; ctx.fillRect(-2,8,5,2.2); ctx.restore(); }
  else { ctx.fillRect(-3,by-9,9,4); ctx.fillRect(3,by-7,3,7+(veh===1?Math.sin(step*2)*1.5:0)); }
  // back arm
  ctx.fillStyle=shade(color,-.3); ctx.save(); ctx.translate(-1,by-19); ctx.rotate(veh?-.9:-sw*.6); rr(ctx,-1.8,0,3.6,9,1.8); ctx.fill(); ctx.restore();
  // body
  const bg=ctx.createLinearGradient(-6,0,6,0); bg.addColorStop(0,shade(color,.15)); bg.addColorStop(1,shade(color,-.2)); ctx.fillStyle=bg; rr(ctx,-6,by-21,12,13,4); ctx.fill(); ctx.strokeStyle=OL; ctx.lineWidth=1; ctx.stroke();
  // front arm
  ctx.fillStyle=shade(color,-.05); ctx.save(); ctx.translate(1,by-19); ctx.rotate(veh?-1.1:sw*.6); rr(ctx,-1.8,0,3.6,9,1.8); ctx.fill(); ctx.fillStyle='#f0c8a0'; ctx.beginPath(); ctx.arc(0,9.5,1.8,0,7); ctx.fill(); ctx.restore();
  // head
  const hy=by-27.5;
  if (style===1 && !(veh>=2)){ ctx.fillStyle=hair; rr(ctx,-7,hy-3,10,12,4); ctx.fill(); }
  ctx.fillStyle='#f3cfa8'; ctx.beginPath(); ctx.arc(0,hy,6.5,0,7); ctx.fill(); ctx.strokeStyle=OL; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#2a1f1a'; ctx.beginPath(); ctx.arc(3,hy+.5,1,0,7); ctx.fill(); ctx.fillStyle='rgba(240,120,110,.45)'; ctx.beginPath(); ctx.arc(3.5,hy+3,1.5,0,7); ctx.fill();
  if (veh>=2){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(0,hy-1,7.5,Math.PI*1.05,Math.PI*2.05); ctx.fill(); ctx.strokeStyle=OL; ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.4)'; ctx.fillRect(-3,hy-6,4,1.5); }
  else if (job==='farm'){ ctx.fillStyle='#ead9a0'; ctx.beginPath(); ctx.moveTo(-12,hy-2); ctx.lineTo(0,hy-14); ctx.lineTo(12,hy-2); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#b89d58'; ctx.stroke(); }
  else { ctx.fillStyle=hair; ctx.beginPath(); ctx.arc(0,hy-1,6.8,Math.PI*1.0,Math.PI*2.0); ctx.fill(); ctx.fillRect(-6.8,hy-2,4,4); if (style===2){ ctx.beginPath(); ctx.arc(-5,hy-6,3,0,7); ctx.fill(); } }
  ctx.restore();
  // name tag
  ctx.font='700 10px "Be Vietnam Pro",sans-serif'; ctx.textAlign='center';
  const tw=ctx.measureText(name).width+12, ty=y+by-50;
  ctx.fillStyle=me?'rgba(244,197,52,.97)':'rgba(12,26,41,.8)'; rr(ctx,x-tw/2,ty,tw,15,7.5); ctx.fill();
  if (me){ ctx.beginPath(); ctx.moveTo(x-4,ty+15); ctx.lineTo(x,ty+19); ctx.lineTo(x+4,ty+15); ctx.fill(); }
  ctx.fillStyle=me?'#231900':'#fff'; ctx.fillText(name,x,ty+11);
}
// ---------- Street life: traffic, train, street vendors ----------
const TRAFFIC=[], VENDORS=[];
const BIKE_COLS=['#c0392b','#2f6fa3','#1d1f22','#e8e3d8','#3f8f5a','#d35400','#8e44ad','#7f8c8d'];
const SHIRTS=['#e74c3c','#3498db','#f1c40f','#2ecc71','#ecf0f1','#9b59b6','#e67e22','#34495e'];
function spawnVeh(v){ const tot=ROADS.reduce((a,r)=>a+r.L,0); let pick2=R()*tot, ri=0; for (;ri<ROADS.length-1;ri++){ if (pick2<ROADS[ri].L) break; pick2-=ROADS[ri].L; }
  Object.assign(v,{r:ri,s:R()*ROADS[ri].L,dir:R()<.5?1:-1,sp:2.2+R()*2.4,col:pick(BIKE_COLS),shirt:pick(SHIRTS),helm:pick(['#e74c3c','#f1c40f','#ecf0f1','#2c3e50','#3498db','#e91e63']),cargo:R()<.28?rint(1,4):0,pass:R()<.25}); return v; }
function initStreetLife(){
  TRAFFIC.length=0; for (let k=0;k<70;k++) TRAFFIC.push(spawnVeh({}));
  VENDORS.length=0; const fronts=new Set(ALLB.map(b=>b.front.x+','+b.front.y));
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ if (grid[idx(x,y)]!==G.WALK||fronts.has(x+','+y)||railT[idx(x,y)]) continue; const h=hash(x*11,y*17);
    const nearHoan=Math.hypot(x-53.5,(y-34)*.9)<11; if (h<(nearHoan?.06:.022)) VENDORS.push({x:x*TS+16,y:y*TS+20,type:nearHoan&&h<.03?'flower':'ganh',ph:h*50,face:h<.5?1:-1,goods:Math.floor(h*1000)%3}); }
}
function updateTraffic(dt){ for (const v of TRAFFIC){ const r=ROADS[v.r]; v.s+=v.dir*v.sp*dt; if (v.s<0||v.s>r.L) spawnVeh(v); } }
function drawBikeTop(x,y,a,v){
  ctx.save(); ctx.translate(x,y); ctx.rotate(a);
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(1,2,12,5,0,0,7); ctx.fill();
  ctx.fillStyle='#1d1f22'; rr(ctx,-13,-2,6,4,2); ctx.fill(); rr(ctx,8,-2,6,4,2); ctx.fill();
  ctx.fillStyle=v.col; rr(ctx,-9,-4,18,8,4); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.25)'; ctx.fillRect(-6,-3.5,10,1.5);
  ctx.strokeStyle='#444'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(8,-6); ctx.lineTo(8,6); ctx.stroke();
  if (v.cargo===1){ ctx.fillStyle='#b9864b'; ctx.fillRect(-16,-6,9,12); ctx.fillStyle='#e8d8b5'; ctx.fillRect(-12.5,-6,2,12); }
  if (v.cargo===2){ ctx.fillStyle='#4f9a3f'; ctx.beginPath(); ctx.arc(-13,0,6.5,0,7); ctx.fill(); for (let k=0;k<6;k++){ ctx.fillStyle=['#f06a8a','#fff','#f3d34a'][k%3]; ctx.beginPath(); ctx.arc(-13+Math.cos(k)*4,Math.sin(k*1.7)*4,1.8,0,7); ctx.fill(); } }
  if (v.cargo===3){ ctx.fillStyle='#d35400'; rr(ctx,-17,-4,8,8,3); ctx.fill(); ctx.fillStyle='#95a5a6'; ctx.fillRect(-14,-1.5,2,3); }
  if (v.cargo===4){ ctx.fillStyle='#2980b9'; rr(ctx,-18,-7,10,14,2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(-16,-5,6,2); }
  if (v.pass){ ctx.fillStyle=pick2col(v.shirt); ctx.beginPath(); ctx.ellipse(-6,0,3.5,5.5,0,0,7); ctx.fill(); ctx.fillStyle='#ecf0f1'; ctx.beginPath(); ctx.arc(-6,0,3,0,7); ctx.fill(); }
  ctx.fillStyle=v.shirt; ctx.beginPath(); ctx.ellipse(-1,0,4,6.5,0,0,7); ctx.fill();
  ctx.strokeStyle='#f0c8a0'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(7,-5); ctx.moveTo(0,4); ctx.lineTo(7,5); ctx.stroke();
  ctx.fillStyle=v.helm; ctx.beginPath(); ctx.arc(0,0,3.6,0,7); ctx.fill(); ctx.fillStyle='rgba(30,40,50,.8)'; ctx.fillRect(2,-2,1.5,4);
  ctx.restore();
}
const pick2col=c=>c==='#ecf0f1'?'#e67e22':'#ecf0f1';
function drawTraffic(x0,y0,x1,y1){
  for (const v of TRAFFIC){ const r=ROADS[v.r], p=roadPos(r,v.s); const lane=r.bridge?.45:.5; const nx=-p.ty*v.dir, ny=p.tx*v.dir;
    const x=(p.x+nx*lane)*TS, y=(p.y+ny*lane)*TS; v.px=x; v.py=y; if (x<x0||x>x1||y<y0||y>y1) { v.vis=false; continue; } v.vis=true;
    v.a=Math.atan2(p.ty*v.dir,p.tx*v.dir); drawBikeTop(x,y,v.a,v); }
}
// train on phố đường tàu
const train={phase:'wait',t:25,head:-3,told:false};
const TRAIN_LEN=13;
function updateTrain(dt){
  const stop=RAIL.y2+.7;
  if (train.phase==='wait'){ train.t-=dt; if (train.t<=0){ train.phase='in'; train.head=-1; train.told=false; } }
  else if (train.phase==='in'){ train.head+=dt*5.5; if (s && !train.told && Math.abs(s.x/TS-RAIL.x)<10){ train.told=true; toast('🚂 Tàu sắp chạy qua phố đường tàu. Đứng sát vào nhà nhé!','ev'); } if (train.head>=stop){ train.head=stop; train.phase='stop'; train.t=6; } }
  else if (train.phase==='stop'){ train.t-=dt; if (train.t<=0) train.phase='out'; }
  else if (train.phase==='out'){ train.head-=dt*5.5; if (train.head<-2){ train.phase='wait'; train.t=70+R()*60; } }
  if (s && (train.phase==='in'||train.phase==='out')){ const tx=Math.floor(s.x/TS), ty=s.y/TS; if (tx===RAIL.x && ty<=train.head+.6 && ty>=train.head-TRAIN_LEN){ const nx=walkable(RAIL.x-1,Math.floor(ty))?RAIL.x-1:RAIL.x+1; s.x=nx*TS+TS/2; player.path=[]; toast('Tàu tới! Bạn vội lùi sát vào nhà 😅','bad'); } }
}
function drawTrain(){
  if (train.phase==='wait') return; const cx=(RAIL.x+.5)*TS, hy=train.head*TS;
  for (let k=0;k<4;k++){ const top=hy-(k+1)*3.25*TS, bot=hy-k*3.25*TS-4; if (bot<-20) continue;
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(cx-12,top+4,28,bot-top);
    const loco=k===0; ctx.fillStyle=loco?'#1f5aa6':'#2d6db5'; rr(ctx,cx-13,top,26,bot-top,loco?8:3); ctx.fill();
    ctx.fillStyle='#e8eef3'; ctx.fillRect(cx-13,top+6,26,4); ctx.fillStyle='#c0392b'; ctx.fillRect(cx-13,top+10,26,2);
    ctx.fillStyle='#9fb6c8'; ctx.fillRect(cx-9,top+16,18,bot-top-24); ctx.fillStyle='rgba(255,255,255,.35)'; for (let j=top+20;j<bot-10;j+=12) ctx.fillRect(cx-9,j,18,1.5);
    if (loco){ ctx.fillStyle='#f4c534'; ctx.fillRect(cx-13,bot-8,26,6); ctx.fillStyle='#fff6c2'; ctx.beginPath(); ctx.arc(cx-7,bot-3,2.5,0,7); ctx.arc(cx+7,bot-3,2.5,0,7); ctx.fill(); }
  }
}
function drawVendor(v,tt){
  const x=v.x, y=v.y, b=Math.sin(tt*2+v.ph)*1;
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x,y+2,v.type==='flower'?16:18,4,0,0,7); ctx.fill();
  if (v.type==='flower'){
    ctx.strokeStyle='#1d1f22'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x-10,y-4,5,0,7); ctx.arc(x+10,y-4,5,0,7); ctx.stroke();
    ctx.strokeStyle='#2f9e8f'; ctx.beginPath(); ctx.moveTo(x-10,y-4); ctx.lineTo(x-2,y-12); ctx.lineTo(x+8,y-12); ctx.lineTo(x+10,y-4); ctx.stroke();
    ctx.fillStyle='#a7743f'; ctx.fillRect(x-18,y-22,16,10);
    for (let k=0;k<14;k++){ ctx.fillStyle=['#f06a8a','#fff','#f3d34a','#e8402a','#f39ac0'][k%5]; ctx.beginPath(); ctx.arc(x-18+hash(k,7)*16,y-24-hash(7,k)*10,2.6,0,7); ctx.fill(); }
    ctx.fillStyle='#4f9a3f'; for (let k=0;k<5;k++) ctx.fillRect(x-17+k*3.4,y-24,1,6);
    // standing vendor
    vendorBody(x+16,y,b,'#7fb3d5'); return;
  }
  // gánh hàng rong: pole + two baskets
  const gx=x, gy=y-24+b;
  ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(gx-18,gy); ctx.quadraticCurveTo(gx,gy-3,gx+18,gy); ctx.stroke();
  for (const sx of [-16,16]){ ctx.strokeStyle='#5b4330'; ctx.lineWidth=.8; ctx.beginPath(); ctx.moveTo(gx+sx-5,gy+12); ctx.lineTo(gx+sx,gy); ctx.lineTo(gx+sx+5,gy+12); ctx.stroke();
    ctx.fillStyle='#c9a46a'; ctx.beginPath(); ctx.ellipse(gx+sx,gy+16,8,6,0,0,7); ctx.fill(); ctx.strokeStyle='#9c7a45'; ctx.stroke();
    const cols=[['#f3d34a','#e67e22'],['#e74c3c','#7cc067'],['#f4f0e6','#c9b893']][v.goods]; for (let k=0;k<5;k++){ ctx.fillStyle=cols[k%2]; ctx.beginPath(); ctx.arc(gx+sx-5+k*2.5,gy+11-(k%2)*2,2.4,0,7); ctx.fill(); } }
  vendorBody(x,y,b,'#a3c9a8');
}
function vendorBody(x,y,b,shirt){
  ctx.fillStyle='#2c3a4d'; ctx.fillRect(x-4,y-10,3.5,10); ctx.fillRect(x+.5,y-10,3.5,10);
  ctx.fillStyle=shirt; rr(ctx,-6+x,y-22+b,12,13,4); ctx.fill(); ctx.strokeStyle='rgba(25,22,30,.8)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#f3cfa8'; ctx.beginPath(); ctx.arc(x,y-27+b,5.5,0,7); ctx.fill();
  ctx.fillStyle='#ead9a0'; ctx.beginPath(); ctx.moveTo(x-12,y-27+b); ctx.lineTo(x,y-39+b); ctx.lineTo(x+12,y-27+b); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#b89d58'; ctx.stroke();
}
function draw(now){
  ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#0c1a29'; ctx.fillRect(0,0,cv.width,cv.height);
  if (!staticCv) return;
  if (!s){ drawTitle(now); return; }
  const W=vw/zoom, H=vh/zoom;
  camX = W>=MW*TS ? (MW*TS-W)/2 : clamp(s.x-W/2,0,MW*TS-W);
  camY = H>=MH*TS ? (MH*TS-H)/2 : clamp(s.y-H/2+20,-60,MH*TS-H+40);
  ctx.setTransform(dpr*zoom,0,0,dpr*zoom,-camX*dpr*zoom,-camY*dpr*zoom);
  ctx.imageSmoothingQuality='high'; ctx.drawImage(staticCv,0,0,MW*TS,MH*TS);
  const tt=now/1000;
  // plots
  PLOTS.forEach((p,i)=>{
    const st=s.plots[i], x0=p.x*TS, y0=p.y*TS, cx=(p.x+p.w/2)*TS, cy=(p.y+p.h/2)*TS;
    if (!st.owned){
      ctx.fillStyle='rgba(40,25,10,.28)'; ctx.fillRect(x0,y0,p.w*TS,p.h*TS);
      ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx+3,cy+14,10,3,0,0,7); ctx.fill();
      ctx.fillStyle='#7a5230'; ctx.fillRect(cx-1.5,cy-6,3,20);
      ctx.fillStyle='#f6efe0'; rr(ctx,cx-22,cy-18,44,24,3); ctx.fill(); ctx.strokeStyle='#7a5230'; ctx.lineWidth=1.5; ctx.stroke();
      const lock=p.fame&&!s.unlocks['plot'+i]; ctx.textAlign='center'; ctx.fillStyle='#c0392b'; ctx.font='800 9px "Be Vietnam Pro",sans-serif'; ctx.fillText(lock?'🔒 FAME':'BÁN ĐẤT',cx,cy-8); ctx.fillStyle='#231900'; ctx.font='700 9px "Be Vietnam Pro",sans-serif'; ctx.fillText(kf(p.price),cx,cy+2);
    } else if (st.crop){
      const prog=clamp((s.t-st.at)/(st.ready-st.at),0,1), ready=prog>=1, sz=.35+prog*.65;
      for (let r2=0;r2<3;r2++) for (let k=0;k<4;k++){ const sx=x0+9+k*15, sy=y0+18+r2*20;
        ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sx+1,sy+1,6*sz,2.5*sz,0,0,7); ctx.fill();
        if (st.crop==='lua'){ ctx.strokeStyle=ready?'#d9b444':(prog>.6?'#a9c04a':'#6fb34a'); ctx.lineWidth=1.4; for (let j=-2;j<=2;j++){ ctx.beginPath(); ctx.moveTo(sx,sy); ctx.quadraticCurveTo(sx+j*2,sy-8*sz,sx+j*3.5,sy-15*sz); ctx.stroke(); } if (ready){ ctx.fillStyle='#f1d36a'; for (let j=-1;j<=1;j++){ ctx.beginPath(); ctx.ellipse(sx+j*3.5,sy-15,1.6,3,j*.4,0,7); ctx.fill(); } } }
        else { for (const [lx,ly,a] of [[-3,-3,-.6],[3,-3,.6],[0,-6,0]]){ ctx.fillStyle=ready?'#3f9e3a':'#62b552'; ctx.beginPath(); ctx.ellipse(sx+lx*sz,sy+ly*sz,3.5*sz+1,6*sz+1,a,0,7); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.25)'; ctx.fillRect(sx+lx*sz-.4,sy+ly*sz-4*sz,.8,6*sz); } }
      }
      if (ready){ ctx.font='15px sans-serif'; ctx.textAlign='center'; ctx.fillText('✨',cx,y0-4+Math.sin(tt*4)*2); }
      if (st.pest){ ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.fillText('🐛',cx+16+Math.sin(tt*3)*3,cy+12); }
    } else { ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='700 10px "Be Vietnam Pro",sans-serif'; ctx.textAlign='center'; ctx.fillText('Đất trống',cx,cy+4); }
  });
  // delivery pins
  const targets=new Set(s.carry.map(c=>c.house));
  for (const id of targets){ const b=BY[id]; const x=b.front.x*TS+TS/2, base=b.front.y*TS+TS/2, y=b.y*TS+8+Math.sin(tt*5)*4;
    ctx.fillStyle='rgba(216,67,47,.25)'; ctx.beginPath(); ctx.ellipse(x,base,14+Math.sin(tt*5)*3,6,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(x+2,y-8,12,0,7); ctx.fill();
    ctx.fillStyle='#d8432f'; ctx.beginPath(); ctx.arc(x,y-10,12,0,7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x-8,y-3); ctx.lineTo(x,y+8); ctx.lineTo(x+8,y-3); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y-10,12,0,7); ctx.stroke();
    ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('📦',x,y-6); }
  // near highlight
  if (near && near.type==='b'){ const b=near.b; ctx.strokeStyle='rgba(244,197,52,'+(.6+.4*Math.sin(tt*6))+')'; ctx.lineWidth=3; ctx.strokeRect(b.front.x*TS+3,b.front.y*TS+3,TS-6,TS-6); }
  // path preview
  if (player.path.length){
    ctx.strokeStyle='rgba(244,197,52,.85)'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.setLineDash([2,10]); ctx.lineDashOffset=-tt*30;
    ctx.beginPath(); ctx.moveTo(s.x,s.y); for (const n of player.path) ctx.lineTo(n.x*TS+TS/2,n.y*TS+TS/2); ctx.stroke(); ctx.setLineDash([]);
    const n=player.path[player.path.length-1]; ctx.fillStyle='#f4c534'; ctx.beginPath(); ctx.arc(n.x*TS+TS/2,n.y*TS+TS/2,6,0,7); ctx.fill();
  }
  const W0=camX-60, H0=camY-60, W1=camX+vw/zoom+60, H1=camY+vh/zoom+60;
  drawTraffic(W0,H0,W1,H1); drawTrain();
  // characters
  const list=[];
  for (const v of VENDORS){ if (v.x>W0&&v.x<W1&&v.y>H0&&v.y<H1) list.push({y:v.y,f:()=>drawVendor(v,tt)}); }
  if(online.status!=='connected') for (const b of BOTS){ const e=ents[b.id]; if (e) list.push({y:e.y,f:()=>drawChar(e.x,e.y,b.color,b.name,b.job==='ship'?(b.id==='phat'?2:1):0,false,e.path.length?e.step:0,e.face,b.job,e.hidden)}); }
  if(online.status==='connected') for(const p of online.players.values()){if(p.id===online.token)continue;const pos=onlineRenderPosition(p,now);list.push({y:pos.y,f:()=>drawChar(pos.x,pos.y,p.color,p.name,p.veh||0,false,p.moving?now/100:0,p.face||1,null,false)});}
  list.push({y:s.y,f:()=>drawChar(s.x,s.y,s.color,s.name,s.veh,true,player.moving?player.step:0,player.face,null,false)});
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  // dusk tint
  const lm=localMin(Math.min(s.t,s.day*DAY));
  ctx.setTransform(1,0,0,1,0,0);
  if (lm>660){ const a=Math.min(.5,(lm-660)/300*.5); ctx.fillStyle=`rgba(16,22,64,${a})`; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.setTransform(dpr*zoom,0,0,dpr*zoom,-camX*dpr*zoom,-camY*dpr*zoom); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(1,a/.32)*.85; ctx.drawImage(lightsCv,0,0,MW*TS,MH*TS); for (const v of TRAFFIC){ if (!v.vis) continue; const hx=v.px+Math.cos(v.a)*20, hy=v.py+Math.sin(v.a)*20; const hg=ctx.createRadialGradient(hx,hy,1,hx,hy,22); hg.addColorStop(0,'rgba(255,240,190,.7)'); hg.addColorStop(1,'rgba(255,240,190,0)'); ctx.fillStyle=hg; ctx.fillRect(hx-22,hy-22,44,44); } ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.setTransform(1,0,0,1,0,0); }
  else if (lm<60){ ctx.fillStyle=`rgba(255,190,120,${.12*(1-lm/60)})`; ctx.fillRect(0,0,cv.width,cv.height); }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const vg=ctx.createRadialGradient(vw/2,vh/2,Math.min(vw,vh)*.45,vw/2,vh/2,Math.max(vw,vh)*.75); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(5,15,30,.28)'); ctx.fillStyle=vg; ctx.fillRect(0,0,vw,vh);
  const toS=(wx,wy)=>[(wx-camX)*zoom,(wy-camY)*zoom];
  // place labels when zoomed out
  if (zoom<1.05){
    ctx.font='700 12px "Be Vietnam Pro",sans-serif'; ctx.textAlign='center';
    for (const b of PLACES){ const [x,y]=toS((b.x+b.w/2)*TS,b.y*TS); if (x<-80||x>vw+80||y<-20||y>vh+20) continue; const t=b.icon+' '+SHORT[b.id]; const w=ctx.measureText(t).width+14;
      ctx.fillStyle='rgba(12,26,41,.85)'; ctx.beginPath(); ctx.roundRect?ctx.roundRect(x-w/2,y-24,w,20,10):ctx.rect(x-w/2,y-24,w,20); ctx.fill(); ctx.fillStyle='#f4c534'; ctx.fillText(t,x,y-10); }
  }
  // guide arrow
  const g=guideTarget();
  if (g){
    const [x,y]=toS(g.x,g.y), top=70, bot=150, m=34;
    if (x>m && x<vw-m && y>top && y<vh-bot){
      const by=y-TS*zoom*1.6+Math.sin(tt*5)*5;
      ctx.fillStyle='#f4c534'; ctx.strokeStyle='#231900'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,by+14); ctx.lineTo(x-11,by-2); ctx.lineTo(x+11,by-2); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const cx=vw/2, cy=(top+vh-bot)/2, dx=x-cx, dy=y-cy;
      const k=Math.min(Math.abs((vw/2-m)/(dx||1e-6)), Math.abs(((vh-bot-top)/2-6)/(dy||1e-6)));
      const ax=cx+dx*k, ay=cy+dy*k, ang=Math.atan2(dy,dx);
      ctx.save(); ctx.translate(ax,ay);
      ctx.fillStyle='rgba(12,26,41,.9)'; ctx.strokeStyle='#f4c534'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,22,0,7); ctx.fill(); ctx.stroke();
      ctx.rotate(ang); ctx.fillStyle='#f4c534'; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-6,-9); ctx.lineTo(-2,0); ctx.lineTo(-6,9); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font='700 11px "Be Vietnam Pro",sans-serif'; ctx.textAlign='center'; ctx.fillStyle='#fff';
      const ly=ay>vh/2?ay-30:ay+36; ctx.fillText(g.icon+' '+meters(Math.hypot(g.x-s.x,g.y-s.y)),ax,ly);
    }
  }
}
