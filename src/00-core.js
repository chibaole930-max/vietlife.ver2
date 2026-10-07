// Core constants and game data
'use strict';
/* =========================================================
   VietLife 2D — single-file prototype
   Sections: constants & data · map · state · economy helpers ·
   world tick · events · bots · rendering · input · UI panels · boot
   ========================================================= */

// ---------- Constants ----------
const TS = 32, MW = 84, MH = 56;
const MPS = 3;            // game minutes per real second
const DAY = 960;          // 06:00 -> 22:00 (only waking hours exist; no idle progression)
const SAVE_KEY = 'vietlife_save_v1';
const G = { GRASS:0, ROAD:1, WALK:2, WATER:3, SOIL:4, BLD:5, TREE:6, PLAZA:7, RAIL:8 };

const R = Math.random;
const rint = (a,b) => a + Math.floor(R()*(b-a+1));
const pick = a => a[Math.floor(R()*a.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const uid = () => Math.random().toString(36).slice(2,9);
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad = n => String(n).padStart(2,'0');
const vnd = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
const kf = n => { const a=Math.abs(n), sg=n<0?'-':''; if (a>=1e6) return sg+(a/1e6).toFixed(a>=1e8?0:(a>=1e7?1:2)).replace(/\.?0+$/,'').replace('.',',')+'tr'; if (a>=1e3) return sg+Math.round(a/1e3)+'k'; return sg+Math.round(a)+'đ'; };

// ---------- Data ----------
const ITEMS = {
  seed_rau:{n:'Hạt rau muống',i:'🌱',base:6000},
  seed_lua:{n:'Thóc giống',i:'🌾',base:10000},
  rau:{n:'Rau muống',i:'🥬',base:12000},
  lua:{n:'Lúa',i:'🌾',base:20000},
  gao:{n:'Gạo',i:'🍚',base:35000},
  rau_sach:{n:'Rau sạch đóng gói',i:'🥗',base:30000},
  banh_pho:{n:'Bánh phở',i:'🥢',base:30000},
  thit_bo:{n:'Thịt bò',i:'🥩',base:45000},
  trung:{n:'Trứng',i:'🥚',base:4000},
  phoi:{n:'Phôi bánh mì',i:'🥖',base:4000},
  pho:{n:'Phở bò',i:'🍜',base:40000,dish:1},
  com_rang:{n:'Cơm rang',i:'🍛',base:30000,dish:1},
  banh_mi:{n:'Bánh mì kẹp',i:'🥪',base:28000,dish:1},
};
const VEH = [
  {n:'Đi bộ',i:'🚶',sp:1,cap:1,price:0},
  {n:'Xe đạp cũ',i:'🚲',sp:1.5,cap:2,price:600000},
  {n:'Xe máy',i:'🛵',sp:2.1,cap:3,price:2500000},
  {n:'Xe ba gác',i:'🛺',sp:1.7,cap:5,price:4000000,fame:4,heavy:1},
];
const CROPS = {
  rau:{n:'Rau muống',seed:'seed_rau',out:'rau',yield:10,t:120},
  lua:{n:'Lúa',seed:'seed_lua',out:'lua',yield:8,t:240},
};
const MACH = {
  xay:{n:'Máy xay xát',i:'⚙️',price:600000,in:{lua:4},out:{gao:3},t:60},
  goi:{n:'Máy đóng gói rau',i:'📦',price:450000,in:{rau:4},out:{rau_sach:3},t:45},
  pho:{n:'Máy tráng bánh phở',i:'🥢',price:900000,in:{gao:2},out:{banh_pho:4},t:90},
};
const RECIPES = {
  pho:{in:{banh_pho:1,thit_bo:1,rau:1},out:4,t:30},
  com_rang:{in:{gao:1,trung:2,rau:1},out:3,t:20},
  banh_mi:{in:{phoi:3,thit_bo:1,rau:1},out:3,t:15},
};
const PACKS = [['Bưu kiện','📦',1,0],['Tài liệu gấp','📄',1,0],['Hoa tươi','💐',1.2,0],['Trà sữa','🧋',1.1,0],['Linh kiện máy tính','🖥️',1.3,1],['Bao gạo 25kg','🍚',1.7,1],['Tủ lạnh mini','🧊',2.4,3]];
const PTYPES = [['Sửa lỗi gấp',2,'🐞'],['Landing page',3,'🧩'],['Bot chốt đơn',4,'🤖'],['App đặt lịch',6,'📱'],['Website bán hàng',7,'🛍️'],['Phần mềm quản lý kho',9,'🗄️']];
const CLIENTS = ['Shop hoa Cô Lan','Tiệm trà sữa Mây','Phòng khám Thiện Tâm','Nhà xe Hoàng Long','CLB cầu lông phường','Startup 3 người','Cô giáo Hạnh','Quán nhậu Tám Tếu','Tiệm vàng Kim Phát','Gara Minh Ô Tô'];
const JOBS = {ship:{n:'Giao hàng',i:'🚚'},dev:{n:'Lập trình',i:'💻'},farm:{n:'Nông nghiệp',i:'🌾'},ind:{n:'Sản xuất',i:'🏭'},cook:{n:'Đầu bếp',i:'🍜'}};
const BOTS = [
  {id:'tuan',name:'Tuấn Shipper',job:'ship',color:'#e8893a',honesty:.85,bio:'Chạy đơn từ 6h sáng, thuộc mọi con hẻm.',tags:['Giao hàng thần tốc']},
  {id:'linh',name:'Linh Bánh Mì',job:'cook',color:'#e85d8f',honesty:.9,bio:'Xe bánh mì đầu ngõ, bán hết trước 9h.',tags:['Giữ chữ tín']},
  {id:'khoa',name:'Khoa Dev',job:'dev',color:'#45a9da',honesty:.8,bio:'Freelancer, nhận cả project lẫn sửa máy in.',tags:['Dev có tâm']},
  {id:'sau',name:'Bà Sáu Ruộng',job:'farm',color:'#86b84a',honesty:.96,bio:'Trồng rau 30 năm, chưa cân điêu lần nào.',tags:['Giữ chữ tín','Hay giúp người']},
  {id:'hung',name:'Hùng Xưởng',job:'ind',color:'#a1806f',honesty:.7,bio:'Chủ 2 máy xay, đang tính mua thêm.',tags:['Chủ xưởng']},
  {id:'mai',name:'Mai Đầu Cơ',job:'trade',color:'#b35ad0',honesty:.62,bio:'Mua lúc người ta sợ, bán lúc người ta tham.',tags:['Đầu cơ']},
  {id:'phat',name:'Phát Hay Vay',job:'ship',color:'#f2d53c',honesty:.35,bio:'Sắp giàu rồi, chỉ cần vay thêm chút nữa.',tags:['Hay vay']},
  {id:'ngoc',name:'Ngọc Hay Giúp',job:'cook',color:'#2fb3a5',honesty:.97,bio:'Ai cần gì cứ nhắn.',tags:['Hay giúp người']},
];
const BOT_GOODS = {ship:['trung','phoi'],cook:['banh_mi','com_rang','pho','trung'],dev:['phoi','trung'],farm:['rau','lua','seed_rau','seed_lua'],ind:['gao','rau_sach','banh_pho'],trade:['gao','lua','thit_bo','rau']};
const LENDERS = {sau:{rate:.08,minRep:60,max:800000},ngoc:{rate:.05,minRep:40,max:300000},khoa:{rate:.12,minRep:50,max:1000000},hung:{rate:.15,minRep:45,max:1500000},mai:{rate:.25,minRep:20,max:2000000}};
const REPLIES = ['Hỏi Bà Sáu ấy, bả biết hết.','Giá này chờ thêm vài tiếng nữa xem, hay dao động lắm.','Mình cũng đang thắc mắc y chang!','Ra Hội Vay Vốn hỏi thử, uy tín cao thì dễ vay.','Inbox mình nhé 😄','Đừng nghe Mai, Mai toàn gom hàng rồi xả.','Làm thuê ở Nhà Nông vài buổi là có vốn thôi.','Mua xe đạp trước đi, chạy đơn nhanh gấp rưỡi.','Có ai thấy Phát đâu không, nợ mình 200k từ hôm kia 😤'];

// ---------- Map: Hà Nội thu nhỏ ----------
const grid = new Uint8Array(MW*MH), solid = new Uint8Array(MW*MH), wkind = new Uint8Array(MW*MH), bkind = new Uint8Array(MW*MH), railT = new Uint8Array(MW*MH);
const roadId = new Int16Array(MW*MH).fill(-1), interT = new Uint8Array(MW*MH);
const idx = (x,y) => y*MW + x;
const inb = (x,y) => x>=0 && y>=0 && x<MW && y<MH;
const riverX1 = y => 71 + 1.0*Math.sin(y/7.5);
const riverX2 = y => 77 + 0.55*Math.sin(y/7.5+1.2);
const RAIL = {x:38, y1:0, y2:44};
function spline(pts,step=.25){ // Catmull-Rom through points
  const out=[]; for (let i=0;i<pts.length-1;i++){ const p0=pts[Math.max(0,i-1)], p1=pts[i], p2=pts[i+1], p3=pts[Math.min(pts.length-1,i+2)];
    const n=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
    for (let k=0;k<n;k++){ const t=k/n, t2=t*t, t3=t2*t; out.push([0,1].map(j=>.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3))); } }
  out.push(pts[pts.length-1]); return out; }
function lineSamples(pts,step=.25){ const out=[]; for (let i=0;i<pts.length-1;i++){ const [a,b]=[pts[i],pts[i+1]]; const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step)); for (let k=0;k<n;k++) out.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]); } out.push(pts[pts.length-1]); return out; }
const arc=(cx,cy,rx,ry,a0,a1,n=40)=>Array.from({length:n+1},(_,k)=>{ const a=(a0+(a1-a0)*k/n)*Math.PI/180; return [cx+rx*Math.cos(a),cy+ry*Math.sin(a)]; });
const ROADS = [
  {n:'Phố Phan Đình Phùng',g:1,p:[[25,11],[41,11]]},
  {n:'Phố Hàng Đậu',g:1,p:[[41,11],[69.5,11]]},
  {n:'Cầu Long Biên',g:1,p:[[69.5,11],[78,11]],bridge:1},
  {n:'Đường Ngọc Thụy',g:1,p:[[78,11],[84.5,11]]},
  {n:'Phố Hàng Bạc',g:2,p:[[41,18],[69,18]]},
  {n:'Đường Hoàng Hoa Thám',g:3,p:[[-.5,25],[26,25]]},
  {n:'Phố Hàng Bông',g:3,p:[[26,25],[47,25]]},
  {n:'Phố Đinh Tiên Hoàng',g:3,p:[[47,25],[69,25]]},
  {n:'Phố Quốc Tử Giám',g:4,p:[[-.5,43],[26,43]]},
  {n:'Phố Hai Bà Trưng',g:4,p:[[26,43],[47,43]]},
  {n:'Phố Tràng Tiền',g:4,p:[[47,43],[69,43]]},
  {n:'Phố Trần Hưng Đạo',g:5,p:[[-.5,53],[69,53]]},
  {n:'Đường Thanh Niên',g:6,curve:1,p:[[26,-.5],[25.3,4],[25.4,8],[26,13],[26,18],[26,25]]},
  {n:'Đường Lê Duẩn',g:6,p:[[26,25],[26,56.5]]},
  {n:'Phố Tôn Đức Thắng',g:7,p:[[13,25],[13,56.5]]},
  {n:'Phố Phùng Hưng',g:8,p:[[41,-.5],[41,56.5]]},
  {n:'Phố Hàng Đào',g:9,p:[[55,11],[55,25.6]]},
  {n:'Phố Lê Thái Tổ',g:10,p:arc(53.5,34,7.6,8.6,90,270)},
  {n:'Phố Đinh Tiên Hoàng',g:10,p:arc(53.5,34,7.6,8.6,-90,90)},
  {n:'Phố Trần Quang Khải',g:11,curve:1,p:Array.from({length:30},(_,k)=>{ const y=-.5+k*2; return [riverX1(y)-1.5,y]; })},
];
ROADS.forEach(r=>{ r.pts=r.curve?spline(r.p):lineSamples(r.p); let L=0; r.len=[0]; for (let i=1;i<r.pts.length;i++){ L+=Math.hypot(r.pts[i][0]-r.pts[i-1][0],r.pts[i][1]-r.pts[i-1][1]); r.len.push(L); } r.L=L; });
const LAKES = [
  {id:'tay',name:'Hồ Tây',cx:12,cy:11,rx:10.6,ry:7.6,k:1},
  {id:'trucbach',name:'Hồ Trúc Bạch',cx:32.3,cy:5.2,rx:4.9,ry:3.1,k:1},
  {id:'guom',name:'Hồ Gươm',cx:53.5,cy:34,rx:5.6,ry:6.6,k:2},
];
const RIVER = {name:'Sông Hồng'};
const ISLAND = {x:52,y:29,w:4,h:3};
const TOWER = {x:53,y:37};
const PARK = {x:63,y:33,w:5,h:2,name:'Vườn hoa Lý Thái Tổ'};
const BUILDINGS = [
  {id:'home',kind:'home',name:'Phòng trọ Hàng Bạc',sign:'PHÒNG TRỌ',icon:'🏠',x:42,y:19,w:5,h:4},
  {id:'depot',kind:'depot',name:'Trạm Giao Hàng Phố Cổ',sign:'GIAO HÀNG',icon:'📦',x:47,y:19,w:6,h:4},
  {id:'market',kind:'market',name:'Chợ Đồng Xuân',sign:'CHỢ ĐỒNG XUÂN',icon:'🛒',x:47,y:3,w:12,h:6},
  {id:'bank',kind:'bank',name:'Hội Vay Vốn Ba Đình',sign:'HỘI VAY VỐN',icon:'🤝',x:28,y:13,w:6,h:5},
  {id:'garage',kind:'garage',name:'Tiệm Xe Đinh Tiên Hoàng',sign:'TIỆM XE',icon:'🛵',x:63,y:27,w:5,h:5},
  {id:'farm',kind:'farm',name:'Nhà Nông Bãi Giữa',sign:'NHÀ NÔNG',icon:'🌾',x:78,y:4,w:6,h:5},
  {id:'cowork',kind:'cowork',name:'Co-working Ba Đình',sign:'CO-WORKING',icon:'💻',x:1,y:30,w:9,h:5},
  {id:'food',kind:'food',name:'Quán Ăn Của Bạn',sign:'QUÁN ĂN',icon:'🍜',x:57,y:19,w:6,h:4},
  {id:'factory',kind:'factory',name:'Xưởng Sản Xuất',sign:'XƯỞNG',icon:'🏭',x:14,y:46,w:10,h:5},
  {id:'news',kind:'news',name:'Bảng Tin Bờ Hồ',sign:'BẢNG TIN',icon:'📰',x:63,y:19,w:4,h:4},
];
const LANDMARKS = [
  {id:'vanmieu',kind:'lm',name:'Văn Miếu – Quốc Tử Giám',short:'Văn Miếu',icon:'🏛️',x:15,y:30,w:9,h:11,info:'Xây năm 1070. Quốc Tử Giám ở đây được coi là trường đại học đầu tiên của Việt Nam (1076).'},
  {id:'cotco',kind:'lm',name:'Cột Cờ Hà Nội',short:'Cột Cờ',icon:'🚩',x:28,y:33,w:5,h:6,info:'Xây từ 1805 đến 1812 thời Gia Long, thân cột cao hơn 33 mét.'},
  {id:'nhahat',kind:'lm',name:'Nhà hát Lớn Hà Nội',short:'Nhà hát Lớn',icon:'🎭',x:63,y:36,w:5,h:5,info:'Khánh thành năm 1911, kiến trúc lấy cảm hứng từ Nhà hát Opera Garnier ở Paris.'},
  {id:'ga',kind:'lm',name:'Ga Hà Nội',short:'Ga Hà Nội',icon:'🚉',x:28,y:45,w:10,h:6,info:'Còn gọi là ga Hàng Cỏ, xây xong năm 1902. Tàu Thống Nhất đi TP.HCM xuất phát từ đây.'},
  {id:'ngocson',kind:'lm',name:'Đền Ngọc Sơn',short:'Đền Ngọc Sơn',icon:'🪷',x:52,y:29,w:3,h:2,info:'Đền trên đảo Ngọc giữa Hồ Gươm, đi vào qua cầu Thê Húc sơn đỏ.'},
];
const HOUSES = [];
const PLOTS = [];
[[78,14],[81,14],[78,18],[81,18],[78,22],[81,22]].forEach(([x,y],i)=>PLOTS.push({i,x,y,w:2,h:2,price:[400000,450000,500000,550000,800000,800000][i],premium:i>=4,fame:i>=4?3:0}));
(function(){
  const spots=[
    [42,13],[45,13],[48,13],[51,13],[57,13],[60,13],[63,13],
    [42,6],[60,6],[63,6],
    [28,20],[32,20],[35,20],
    [3,20],[7,20],[11,20],[15,20],[19,20],
    [1,38],[4,38],[7,38],
    [34,38],[34,14],
    [42,48],[45,48],[48,48],[51,48],[54,48],[57,48],[60,48],[63,48],
    [1,48],[4,48],[7,48],
    [78,30],[81,30],[78,40],[81,40],
  ];
  spots.forEach(([x,y],i)=>HOUSES.push({id:'n'+i,kind:'house',x,y,w:3,h:3}));
})();
const ALLB = [...BUILDINGS, ...LANDMARKS, ...HOUSES];
ALLB.forEach(b=>{ b.door={x:b.x+Math.floor(b.w/2),y:b.y+b.h-1}; b.front={x:b.door.x,y:b.y+b.h}; });
const BY = Object.fromEntries(ALLB.map(b=>[b.id,b]));
const streetName = new Array(MW*MH).fill('');
const INTERS = [];   // intersection centres {x,y} in tiles

function hash(x,y){ let h = x*374761393 + y*668265263; h = (h^(h>>>13))*1274126177; return ((h^(h>>>16))>>>0)/4294967295; }
function buildMap(){
  grid.fill(G.GRASS);
  const inLake=(x,y,L)=>{ const dx=(x+.5-L.cx)/L.rx, dy=(y+.5-L.cy)/L.ry; return dx*dx+dy*dy<=1; };
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    for (const L of LAKES) if (inLake(x,y,L)){ grid[idx(x,y)]=G.WATER; wkind[idx(x,y)]=L.k; }
    if (x+.5>riverX1(y+.5) && x+.5<riverX2(y+.5)){ grid[idx(x,y)]=G.WATER; wkind[idx(x,y)]=3; }
  }
  // rasterize roads (2 tiles wide)
  const grp=new Array(MW*MH);
  ROADS.forEach((r,ri)=>{
    for (const [px,py] of r.pts){
      for (let y=Math.floor(py-1.5);y<=Math.ceil(py+1.5);y++) for (let x=Math.floor(px-1.5);x<=Math.ceil(px+1.5);x++){
        if (!inb(x,y)) continue; if (Math.hypot(x+.5-px,y+.5-py)>=1) continue; const i=idx(x,y);
        if (grid[i]===G.WATER) bkind[i]=1;
        if (grid[i]!==G.ROAD){ grid[i]=G.ROAD; roadId[i]=ri; }
        (grp[i]=grp[i]||new Set()).add(r.g);
      }
    }
  });
  for (let i=0;i<MW*MH;i++) if (grp[i]&&grp[i].size>1) interT[i]=1;
  // intersection clusters
  const seen=new Uint8Array(MW*MH);
  for (let i=0;i<MW*MH;i++){ if (!interT[i]||seen[i]) continue; const q=[i]; seen[i]=1; let sx=0,sy=0,n=0;
    while (q.length){ const c=q.pop(); const cx=c%MW, cy=(c/MW)|0; sx+=cx+.5; sy+=cy+.5; n++; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){ const X=cx+dx,Y=cy+dy; if (!inb(X,Y)) continue; const j=idx(X,Y); if (interT[j]&&!seen[j]){ seen[j]=1; q.push(j); } } }
    INTERS.push({x:sx/n,y:sy/n}); }
  // railway (phố đường tàu)
  for (let y=RAIL.y1;y<=RAIL.y2;y++){ const i=idx(RAIL.x,y); railT[i]=1; if (grid[i]!==G.ROAD && grid[i]!==G.WATER) grid[i]=G.RAIL; }
  const isRoad=(x,y)=>inb(x,y)&&grid[idx(x,y)]===G.ROAD&&!bkind[idx(x,y)];
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++) if (grid[idx(x,y)]===G.GRASS && (isRoad(x-1,y)||isRoad(x+1,y)||isRoad(x,y-1)||isRoad(x,y+1))) grid[idx(x,y)]=G.WALK;
  for (let y=ISLAND.y;y<ISLAND.y+ISLAND.h;y++) for (let x=ISLAND.x;x<ISLAND.x+ISLAND.w;x++){ grid[idx(x,y)]=G.GRASS; wkind[idx(x,y)]=0; }
  for (let x=ISLAND.x+ISLAND.w, y=ISLAND.y+1; inb(x,y) && grid[idx(x,y)]===G.WATER; x++){ grid[idx(x,y)]=G.ROAD; bkind[idx(x,y)]=2; }
  for (let y=PARK.y;y<PARK.y+PARK.h;y++) for (let x=PARK.x;x<PARK.x+PARK.w;x++) grid[idx(x,y)]=G.PLAZA;
  for (const p of PLOTS) for (let y=p.y;y<p.y+p.h;y++) for (let x=p.x;x<p.x+p.w;x++) grid[idx(x,y)]=G.SOIL;
  for (const b of ALLB) for (let y=b.y;y<b.y+b.h;y++) for (let x=b.x;x<b.x+b.w;x++) grid[idx(x,y)]=G.BLD;
  const g=(x,y)=>inb(x,y)?grid[idx(x,y)]:-1;
  const fronts=new Set(ALLB.map(b=>b.front.x+','+b.front.y));
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    if (g(x,y)!==G.GRASS || fronts.has(x+','+y)) continue;
    let ok=true;
    for (let dy=-1;dy<=1&&ok;dy++) for (let dx=-1;dx<=1;dx++){ const t=g(x+dx,y+dy); if (t===G.BLD||t===G.TREE||t===G.SOIL||t===G.WATER||t===G.PLAZA||t===G.RAIL||fronts.has((x+dx)+','+(y+dy))) {ok=false;break;} }
    if (!ok) continue;
    if ([g(x-1,y),g(x+1,y),g(x,y-1),g(x,y+1)].some(t=>t!==G.GRASS)) continue;
    if (hash(x,y) < .16) grid[idx(x,y)]=G.TREE;
  }
  for (let i=0;i<MW*MH;i++){ const t=grid[i]; solid[i]=(t===G.WATER||t===G.BLD||t===G.TREE)?1:0; }
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    let best=99, nm='';
    for (let dy=-4;dy<=4;dy++) for (let dx=-4;dx<=4;dx++){ const X=x+dx, Y=y+dy; if (!inb(X,Y)) continue; const i=idx(X,Y); if (roadId[i]<0) continue; const d=Math.abs(dx)+Math.abs(dy); if (d<best){ best=d; nm=ROADS[roadId[i]].n; } }
    streetName[idx(x,y)]=nm;
  }
  const cnt={};
  for (const h of HOUSES){ const st=streetName[idx(h.front.x,Math.min(MH-1,h.front.y))]||'Ngõ nhỏ'; cnt[st]=(cnt[st]||0)+1; h.num=cnt[st]*2+(h.x%2); h.street=st; h.name=`Số ${h.num} ${st}`; }
}
const walkable = (x,y) => inb(x,y) && !solid[idx(x,y)];
const streetAt = (px,py) => { const x=Math.floor(px/TS), y=Math.floor(py/TS); return inb(x,y)?streetName[idx(x,y)]:''; };

// NPCs use sidewalks and pedestrian areas only; vehicle roads are excluded.
const pedestrian = (x,y) => inb(x,y) && !solid[idx(x,y)] && grid[idx(x,y)]!==G.ROAD;
function nearestPedestrian(x,y){
  if (pedestrian(x,y)) return {x,y};
  for (let radius=1;radius<=4;radius++){
    for (let dy=-radius;dy<=radius;dy++) for (let dx=-radius;dx<=radius;dx++){
      if (Math.max(Math.abs(dx),Math.abs(dy))!==radius) continue;
      if (pedestrian(x+dx,y+dy)) return {x:x+dx,y:y+dy};
    }
  }
  return null;
}
function pedestrianPath(sx,sy,tx,ty){
  const start=nearestPedestrian(sx,sy), target=nearestPedestrian(tx,ty);
  if (!start||!target) return null;
  const N=MW*MH, scores=new Float32Array(N).fill(1e9), from=new Int32Array(N).fill(-1), closed=new Uint8Array(N);
  const s0=idx(start.x,start.y), t0=idx(target.x,target.y);
  const H=(x,y)=>{ const dx=Math.abs(x-target.x),dy=Math.abs(y-target.y); return Math.max(dx,dy)+.414*Math.min(dx,dy); };
  const heap=[], values=[];
  const push=(f,n)=>{ heap.push(n); values.push(f); let i=heap.length-1; while(i>0){ const p=(i-1)>>1; if(values[p]<=values[i]) break; [heap[p],heap[i]]=[heap[i],heap[p]]; [values[p],values[i]]=[values[i],values[p]]; i=p; } };
  const pop=()=>{ const top=heap[0], last=heap.pop(), value=values.pop(); if(heap.length){ heap[0]=last; values[0]=value; let i=0; for(;;){ const l=i*2+1,r=l+1; let m=i; if(l<heap.length&&values[l]<values[m])m=l; if(r<heap.length&&values[r]<values[m])m=r; if(m===i)break; [heap[m],heap[i]]=[heap[i],heap[m]]; [values[m],values[i]]=[values[i],values[m]]; i=m; } } return top; };
  const dirs=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  scores[s0]=0; push(H(start.x,start.y),s0);
  while(heap.length){
    const cur=pop(); if(closed[cur])continue; closed[cur]=1;
    if(cur===t0){ const path=[]; let at=cur; while(at!==s0&&at!==-1){path.push({x:at%MW,y:(at/MW)|0});at=from[at];} return path.reverse(); }
    const x=cur%MW,y=(cur/MW)|0;
    for(const [dx,dy,cost] of dirs){ const nx=x+dx,ny=y+dy; if(!pedestrian(nx,ny))continue; if(dx&&dy&&(!pedestrian(x+dx,y)||!pedestrian(x,y+dy)))continue; const ni=idx(nx,ny); if(closed[ni])continue; const ng=scores[cur]+cost*(grid[ni]===G.GRASS?1.15:1); if(ng<scores[ni]){scores[ni]=ng;from[ni]=cur;push(ng+H(nx,ny),ni);} }
  }
  return null;
}

function astar(sx,sy,tx,ty){
  if (!walkable(tx,ty)) return null;
  if (!walkable(sx,sy)) { const n=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].map(([dx,dy])=>[sx+dx,sy+dy]).find(([x,y])=>walkable(x,y)); if (!n) return null; [sx,sy]=n; }
  const N=MW*MH, gS=new Float32Array(N).fill(1e9), from=new Int32Array(N).fill(-1), closed=new Uint8Array(N);
  const s0=idx(sx,sy), t0=idx(tx,ty), H=(x,y)=>{ const dx=Math.abs(x-tx), dy=Math.abs(y-ty); return Math.max(dx,dy)+.414*Math.min(dx,dy); };
  const heap=[], fv=[]; // binary heap of [f, node]
  const push=(f,n)=>{ heap.push(n); fv.push(f); let i=heap.length-1; while (i>0){ const p=(i-1)>>1; if (fv[p]<=fv[i]) break; [heap[p],heap[i]]=[heap[i],heap[p]]; [fv[p],fv[i]]=[fv[i],fv[p]]; i=p; } };
  const pop=()=>{ const top=heap[0]; const ln=heap.pop(), lf=fv.pop(); if (heap.length){ heap[0]=ln; fv[0]=lf; let i=0; for(;;){ const l=2*i+1, r=l+1; let m=i; if (l<heap.length&&fv[l]<fv[m]) m=l; if (r<heap.length&&fv[r]<fv[m]) m=r; if (m===i) break; [heap[m],heap[i]]=[heap[i],heap[m]]; [fv[m],fv[i]]=[fv[i],fv[m]]; i=m; } } return top; };
  gS[s0]=0; push(H(sx,sy),s0);
  const D=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  while (heap.length){
    const cur=pop(); if (closed[cur]) continue; closed[cur]=1;
    if (cur===t0){ const path=[]; let c=cur; while (c!==s0 && c!==-1){ path.push({x:c%MW,y:(c/MW)|0}); c=from[c]; } return path.reverse(); }
    const cx=cur%MW, cy=(cur/MW)|0;
    for (const [dx,dy,cost] of D){
      const nx=cx+dx, ny=cy+dy; if (!walkable(nx,ny)) continue;
      if (dx&&dy && (!walkable(cx+dx,cy)||!walkable(cx,cy+dy))) continue;
      const ni=idx(nx,ny); if (closed[ni]) continue;
      const ng=gS[cur]+cost*(grid[ni]===G.GRASS?1.15:1); if (ng<gS[ni]){ gS[ni]=ng; from[ni]=cur; push(ng+H(nx,ny),ni); }
    }
  }
  return null;
}

