// Online multiplayer transport and community panel
const ONLINE_CONFIG_KEY='vietlife_online_url';
const online={socket:null,status:'disconnected',error:'',players:new Map(),chat:[],friends:new Set(),lastSent:0,token:null,autoTried:false,clockReady:false,serverT:0};
const friendRequests=new Map();
function onlineEndpoint(){
  const fromQuery=new URLSearchParams(location.search).get('server');
  const saved=localStorage.getItem(ONLINE_CONFIG_KEY);
  const configured=fromQuery||saved;
  if(configured){
    const url=new URL(configured,location.href);
    if(url.pathname==='/'||url.pathname==='')url.pathname='/ws';
    return url.toString();
  }
  return location.protocol==='https:'?'wss://'+location.host+'/ws':'ws://'+location.hostname+':8787/ws';
}
function onlineStatus(status,message){
  online.status=status; if(status==='connecting'||status==='connected')online.error=''; const dot=$('onlineDot');
  if(dot) dot.className='online-dot '+(status==='connected'?'connected':status==='connecting'?'connecting':status==='error'?'error':'');
  if(message&&status==='error'){online.error=message;toast(message,'bad');}
}
function onlineSend(type,data={}){
  if(online.socket?.readyState===WebSocket.OPEN) online.socket.send(JSON.stringify({type,...data}));
}
function onlineConnect(){
  if(online.socket&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(online.socket.readyState))return;
  onlineStatus('connecting');
  online.clockReady=false;
  let ws;
  try{ws=new WebSocket(onlineEndpoint());}catch(e){onlineStatus('error','Không tạo được kết nối online.');return;}
  online.socket=ws;
  ws.addEventListener('open',()=>{
    onlineStatus('connected');
    onlineSend('join',{name:s.name,color:s.color,x:s.x,y:s.y,veh:s.veh,t:s.t});
    toast('Đã vào phường online.','good');
  });
  ws.addEventListener('message',e=>{
    let msg; try{msg=JSON.parse(e.data)}catch{return;}
    if(msg.type==='welcome'){online.token=msg.id;}
    if(msg.type==='clock'){
      const serverT=Number(msg.t)||0;
      if(!online.clockReady&&s){
        const serverDay=Math.floor(serverT/DAY)+1;
        if(serverDay!==s.day){s.day=serverDay;s.dayMoney=s.money;s.dayLog=[];s.nextBot=serverT+30;s.nextPrice=serverT+60;newDay();save();}
        s.t=serverT;
      }
      online.serverT=serverT;online.clockReady=true;
    }
    if(msg.type==='players'){
      const now=performance.now(),next=new Map();
      for(const p of msg.players||[]){const old=online.players.get(p.id);next.set(p.id,old?{...old,...p}:{...p,fromX:p.x,fromY:p.y,toX:p.x,toY:p.y,fromAt:now,toAt:now});}
      online.players=next;if(panel?.key==='online')renderPanel();
    }
    if(msg.type==='move'){
      const now=performance.now(),old=online.players.get(msg.player.id),p=msg.player;
      online.players.set(p.id,{...old,...p,fromX:old?.toX??p.x,fromY:old?.toY??p.y,toX:p.x,toY:p.y,fromAt:old?.toAt??now,toAt:now});
    }
    if(msg.type==='leave'){online.players.delete(msg.id);if(panel?.key==='online')renderPanel();}
    if(msg.type==='chat'){
      online.chat.push(msg.message); if(online.chat.length>80)online.chat.shift();
      if(panel?.key==='online')renderPanel();
    }
    if(msg.type==='friend'){
      if(msg.action==='request'){friendRequests.set(msg.from.id,msg.from.name);toast(`${msg.from.name} muốn kết bạn. Mở Cộng đồng để xem.`,'ev');}
      if(msg.action==='accepted'){online.friends.add(msg.id);toast(`${msg.name} đã chấp nhận kết bạn.`,'good');}
      if(panel?.key==='online')renderPanel();
    }
    if(msg.type==='error')toast(msg.message||'Lỗi online.','bad');
  });
  ws.addEventListener('close',e=>{onlineStatus('disconnected',e.code!==1000?`WebSocket đóng kết nối (${e.code}${e.reason?': '+e.reason:''}).`:'');online.players.clear();if(panel?.key==='online')renderPanel();});
  ws.addEventListener('error',()=>onlineStatus('error',`Không kết nối được ${onlineEndpoint()}. Xem log terminal của server.`));
}
function onlineDisconnect(){online.socket?.close();online.socket=null;onlineStatus('disconnected');online.players.clear();}
function onlineUpdate(){
  if(!s||!$('welcome').hidden)return;
  if(!online.socket||online.socket.readyState!==WebSocket.OPEN)return;
  const now=performance.now(); if(now-online.lastSent<50) return; online.lastSent=now;
  onlineSend('move',{x:s.x,y:s.y,veh:s.veh,face:player.face,moving:player.moving,name:s.name,color:s.color});
}
function onlineAdvanceClock(minutes){
  const amount=Number(minutes);
  if(Number.isFinite(amount)&&amount>0)onlineSend('timeAdvance',{minutes:Math.min(amount,DAY)});
}
function onlineApplyClock(){
  if(!s||!online.clockReady)return;
  let target=Math.max(s.t,online.serverT),guard=0;
  while((s.t<target||s.t>=s.day*DAY)&&guard++<8){
    if(s.t>=s.day*DAY){endDay();s.day++;s.t=(s.day-1)*DAY;s.nextBot=s.t+30;s.nextPrice=s.t+60;newDay();save();continue;}
    const boundary=s.day*DAY,next=Math.min(target,boundary),from=s.t;
    if(next>from)tickWorld(from,next);
    s.t=next;
    if(s.t>=boundary)continue;
  }
}
function onlineRenderPosition(p,now){
  if(p.fromX==null||p.toX==null)return {x:p.x,y:p.y};
  const span=Math.max(1,p.toAt-p.fromAt),renderAt=now-45;
  if(renderAt<=p.fromAt)return {x:p.fromX,y:p.fromY};
  if(renderAt>=p.toAt){
    const extra=Math.min(90,renderAt-p.toAt),vx=(p.toX-p.fromX)/span,vy=(p.toY-p.fromY)/span;
    return {x:p.toX+vx*extra,y:p.toY+vy*extra};
  }
  const t=(renderAt-p.fromAt)/span;
  return {x:p.fromX+(p.toX-p.fromX)*t,y:p.fromY+(p.toY-p.fromY)*t};
}
function onlineAutoConnect(){if(online.autoTried)return;online.autoTried=true;onlineConnect();}
function onlineChatSend(){
  const input=$('onlineChatInput');const text=input?.value.trim();if(!text)return;
  if(text.length>240)return toast('Tin nhắn tối đa 240 ký tự.','bad');
  onlineSend('chat',{text});input.value='';
}
function onlineFriend(id){onlineSend('friend',{target:id,accept:friendRequests.has(id)});}
function onlinePanel(){
  const connected=online.status==='connected';
  const list=[...online.players.values()].filter(p=>p.id!==online.token);
  const msgs=online.chat.slice(-40).map(m=>`<div class="chat-msg"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`).join('')||'<div class="chat-msg">Chưa có tin nhắn. Hãy chào phường!</div>';
  const people=list.map(p=>`<div class="row friend-row"><span class="ava" style="background:${esc(p.color||'#4b9')}" aria-hidden="true">${esc((p.name||'?')[0])}</span><span class="friend-name">${esc(p.name||'Người chơi')}</span>${online.friends.has(p.id)?'<span class="chip good">Bạn bè</span>':btn('friend',p.id,friendRequests.has(p.id)?'Chấp nhận':'Kết bạn',{cls:'sm ghost'})}</div>`).join('')||'<p>Chưa thấy người chơi nào khác online.</p>';
  return {icon:'👥',title:'Cộng đồng online',html:`<p class="lead">${connected?`Đang kết nối tới ${esc(onlineEndpoint())} · ${list.length+1} người trong phường`:`Chưa kết nối tới server. ${online.error?esc(online.error):''}`}</p><div class="btns">${connected?btn('onlineDisconnect','','Ngắt kết nối',{cls:'ghost'}):btn('onlineConnect','','Kết nối online')}</div><h3>Người đang online</h3><div class="list">${people}</div><h3>Trò chuyện</h3><div class="chat-log" id="onlineChatLog">${msgs}</div><form class="chat-compose" id="onlineChatForm"><input id="onlineChatInput" maxlength="240" placeholder="Nhắn với mọi người…" ${connected?'':'disabled'}><button class="btn" ${connected?'':'disabled'}>Gửi</button></form>` ,after(){const log=$('onlineChatLog');if(log)log.scrollTop=log.scrollHeight;}};
}
