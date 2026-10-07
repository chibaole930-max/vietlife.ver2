// Welcome screen and startup
let last=performance.now(), hudAcc=0;
function frame(now){
  const dt=Math.min(.1,(now-last)/1000); last=now;
  const onlineClock=s&&online.status==='connected'&&online.clockReady&&$('welcome').hidden;
  if(onlineClock) onlineApplyClock();
  if (s && !panel && $('welcome').hidden){
    if(!onlineClock){const a=s.t; s.t+=dt*MPS;
      if (s.t>=s.day*DAY){ s.t=s.day*DAY; tickWorld(a,s.t); endDay(); }
      else tickWorld(a,s.t);}
    updatePlayer(dt); updateBots(dt); updateTraffic(dt); updateTrain(dt); onlineUpdate();
  }
  if (!s && staticCv){ updateTraffic(dt); updateTrain(dt); updateBots(dt); updateDemo(dt); }
  lastDt=dt; draw(now);
  if (!$('tNew').hidden) drawPreview(now);
  if (s) drawMapTo($('mini'),{view:true});
  hudAcc+=dt; if (hudAcc>.25 && s){ hudAcc=0; updateHUD(); updateTracker(); updateGuide(); const sn=streetAt(s.x,s.y); $('streetNow').textContent='📍 '+(sn||'Hà Nội'); }
  requestAnimationFrame(frame);
}
let saveTimer=setInterval(save,10000);
window.addEventListener('pagehide',save);

function boot(data){
  buildMap(); resize();
  const go=()=>{ renderStatic(); initStreetLife(); spawnBots(); initDemo(); if (data&&data.s){ startGame(data.s); } else showWelcome(); requestAnimationFrame(frame); };
  const fontsReady=document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]):Promise.resolve();
  fontsReady.then(go);
}
window.claude?.hot?.snapshot?.(()=>({s}));
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
