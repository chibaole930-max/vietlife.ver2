'use strict';
// Minimal WebSocket multiplayer server using Node's built-in HTTP and crypto modules.
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8787);
const players = new Map();
const friends = new Map();
const pendingFriends = new Map();
const clients = new Set();
const GAME_MINUTES_PER_MS = 3 / 1000;
const DAY_MINUTES = 960;
const worldClock = {t:null,lastAt:Date.now()};
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if(url.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,players:players.size}));return;}
  const rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.resolve(root,'.'+rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});res.end(data);});
});
function frame(text){
  const payload=Buffer.from(text);let head;
  if(payload.length<126){head=Buffer.from([0x81,payload.length]);}
  else if(payload.length<65536){head=Buffer.alloc(4);head[0]=0x81;head[1]=126;head.writeUInt16BE(payload.length,2);}
  else {head=Buffer.alloc(10);head[0]=0x81;head[1]=127;head.writeBigUInt64BE(BigInt(payload.length),2);}
  return Buffer.concat([head,payload]);
}
function send(peer,msg){if(!peer.closed)peer.socket.write(frame(JSON.stringify(msg)));}
function broadcast(msg,except){for(const c of clients)if(c!==except)send(c,msg);}
function playerList(){return [...players.values()].map(({token,...p})=>p);}
function parseFrames(peer,chunk){
  peer.buffer=Buffer.concat([peer.buffer,chunk]);
  while(peer.buffer.length>=2){const b0=peer.buffer[0],b1=peer.buffer[1];let len=b1&127,offset=2;if(len===126){if(peer.buffer.length<4)return;len=peer.buffer.readUInt16BE(2);offset=4;}else if(len===127){if(peer.buffer.length<10)return;const n=peer.buffer.readBigUInt64BE(2);if(n>65536n){peer.socket.destroy();return;}len=Number(n);offset=10;}
    const masked=Boolean(b1&128);if(masked)offset+=4;if(peer.buffer.length<offset+len)return;
    let data=peer.buffer.subarray(offset,offset+len);if(masked){const mask=peer.buffer.subarray(offset-4,offset);data=Buffer.from(data);for(let i=0;i<data.length;i++)data[i]^=mask[i%4];}
    peer.buffer=peer.buffer.subarray(offset+len);if((b0&15)===8){peer.socket.end();return;}if((b0&15)===9){peer.socket.write(Buffer.from([0x8a,0]));continue;}if((b0&15)!==1)continue;
    try{handle(peer,JSON.parse(data.toString('utf8')));}catch{send(peer,{type:'error',message:'Tin nhắn không hợp lệ.'});}
  }
}
function cleanName(value){return String(value||'Người chơi').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24)||'Người chơi';}
function handle(peer,msg){
  if(!msg||typeof msg.type!=='string')return;
  const now=Date.now();
  if(msg.type==='join'){
    if(peer.player)return;
    if(players.size===0){worldClock.t=finite(msg.t,0,1e9);worldClock.lastAt=now;}
    const p={id:peer.id,name:cleanName(msg.name),color:/^#[0-9a-f]{6}$/i.test(msg.color)?msg.color:'#f4c534',x:finite(msg.x,0,2688),y:finite(msg.y,0,1792),veh:Math.round(finite(msg.veh,0,3)),face:1,moving:false};
    peer.player=p;players.set(peer.id,{...p,token:peer});const t=clockNow();send(peer,{type:'welcome',id:peer.id});send(peer,{type:'clock',t,day:Math.floor(t/DAY_MINUTES)+1});send(peer,{type:'players',players:playerList()});broadcast({type:'players',players:playerList()},peer);for(const c of clients){if(c.player&&(friends.get(c.id)||new Set()).has(peer.id))send(peer,{type:'friend',action:'accepted',id:c.id,name:c.player.name});}for(const [id,name] of pendingFriends.get(peer.id)||[])send(peer,{type:'friend',action:'request',from:{id,name}});return;
  }
  if(!peer.player)return;
  if(msg.type==='move'){
    if(now-peer.lastMove<70)return;peer.lastMove=now;
    const p=peer.player;p.x=finite(msg.x,p.x,2688);p.y=finite(msg.y,p.y,1792);p.veh=Math.round(finite(msg.veh,p.veh,3));p.face=Number(msg.face)<0?-1:1;p.moving=Boolean(msg.moving);
    players.set(peer.id,{...p,token:peer});broadcast({type:'move',player:p},peer);return;
  }
  if(msg.type==='timeAdvance'){
    const minutes=finite(msg.minutes,0,DAY_MINUTES);
    if(minutes>0){clockNow();worldClock.t+=minutes;worldClock.lastAt=now;broadcast({type:'clock',t:worldClock.t,day:Math.floor(worldClock.t/DAY_MINUTES)+1});}
    return;
  }
  if(msg.type==='chat'){
    const text=String(msg.text||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,240);
    if(!text||now-peer.lastChat<700)return;peer.lastChat=now;
    broadcast({type:'chat',message:{id:crypto.randomUUID(),playerId:peer.id,name:peer.player.name,text,at:now}});return;
  }
  if(msg.type==='friend'){
    const target=String(msg.target||'');const other=players.get(target);if(!other||target===peer.id)return;
    const theirs=friends.get(target)||new Set();
    if(msg.accept||theirs.has(peer.id)){const mine=friends.get(peer.id)||new Set();mine.add(target);theirs.add(peer.id);friends.set(peer.id,mine);friends.set(target,theirs);send(peer,{type:'friend',action:'accepted',id:target,name:other.name});send(other.token,{type:'friend',action:'accepted',id:peer.id,name:peer.player.name});}
    else {const pending=pendingFriends.get(target)||new Map();pending.set(peer.id,peer.player.name);pendingFriends.set(target,pending);send(other.token,{type:'friend',action:'request',from:{id:peer.id,name:peer.player.name}});}
  }
}
function finite(value,fallback,max){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(max,n)):fallback;}
function clockNow(){const now=Date.now();if(worldClock.t===null)worldClock.t=0;if(players.size)worldClock.t+=(now-worldClock.lastAt)*GAME_MINUTES_PER_MS;worldClock.lastAt=now;return worldClock.t;}
function remove(peer){if(peer.closed)return;peer.closed=true;clients.delete(peer);if(peer.player){console.log('WebSocket left:',peer.id);players.delete(peer.id);broadcast({type:'leave',id:peer.id});broadcast({type:'players',players:playerList()});}}
server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname!=='/ws'){socket.destroy();return;}
  const key=req.headers['sec-websocket-key'];if(!key||req.headers['upgrade']?.toLowerCase()!=='websocket'){console.warn('Rejected WebSocket upgrade:',req.url);socket.destroy();return;}
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const peer={id:crypto.randomUUID(),socket,buffer:Buffer.alloc(0),closed:false,lastMove:0,lastChat:0};clients.add(peer);socket.setNoDelay(true);socket.on('data',d=>parseFrames(peer,d));socket.on('close',()=>remove(peer));socket.on('end',()=>remove(peer));socket.on('error',err=>{console.warn('WebSocket socket error:',err.message);remove(peer);});if(head?.length)parseFrames(peer,head);console.log('WebSocket connected:',peer.id);
});
setInterval(()=>{if(!players.size){worldClock.lastAt=Date.now();return;}broadcast({type:'clock',t:clockNow(),day:Math.floor(worldClock.t/DAY_MINUTES)+1});},250);
server.listen(port,'0.0.0.0',()=>console.log(`VietLife online: http://localhost:${port} (WebSocket /ws)`));
