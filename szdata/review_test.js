// 无界面冒烟测试：加载数据与城市模块，生成深圳地图并逐年推进，检查区域、人口、地标、填海、道路与任务锚点。
// 用法：node szdata/smoke.js [目标年份]
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const noop = function () {};
const ctxStub = new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return { width: 100, height: 100 };
    if (k in t) return t[k];
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop: noop });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return noop;
  },
  set(t, k, v) { t[k] = v; return true; },
});
const canvasStub = () => ({ width: 100, height: 100, getContext: () => ctxStub, style: {}, addEventListener: noop, removeEventListener: noop });

global.window = global;
global.document = {
  getElementById: () => canvasStub(),
  createElement: () => canvasStub(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  documentElement: { dataset: {}, style: { setProperty: noop }, classList: { add: noop, remove: noop } },
  body: { appendChild: noop, classList: { add: noop, remove: noop } },
};
global.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
global.matchMedia = () => ({ matches: false, addEventListener: noop });
global.devicePixelRatio = 1;
global.requestAnimationFrame = noop;
global.performance = { now: () => Date.now() };
global.navigator = { userAgent: 'node' };

const CM = {};
global.CM = CM;
window.CM = CM;

const FILES = ['util.js', 'config.js', 'news.js', 'geo_gz.js', 'geo.js', 'data_gz.js', 'data_tutorial.js',
  'geo_hz.js', 'data_hz.js', 'geo_hk.js', 'data_hk.js', 'geo_tk.js', 'data_tk.js', 'geo_tp.js', 'data_tp.js',
  'geo_sz.js', 'landmarks_sz.js', 'data_sz.js', 'maps.js', 'facility.js', 'city.js', 'metro.js', 'sim.js', 'economy.js', 'macro.js', 'landmark_meshes_sz.js', 'landmark_models_sz.js', 'render.js', 'game.js', 'tools.js'];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  try { eval(src); } catch (e) { console.error('加载失败', f, e.message); process.exit(1); }
}


const assert = require('assert');
global.addEventListener=noop;
global.Path2D=class {moveTo(){}lineTo(){}closePath(){}addPath(){}rect(){}arc(){}};
const passed=[];function check(name,fn){fn();passed.push(name)}
CM.useMap('sz');const city=new CM.City();city.generate(19900101,1990);
const R=new CM.Renderer(canvasStub());R.w=1200;R.h=800;R.game={city,clock:{y:1990}};
check('1990: no premature fallback runway',()=>{const fills=[];ctxStub.fillRect=function(...a){fills.push([this.fillStyle,...a])};R.drawGround(ctxStub,0,0,city.W,city.H,8);assert(!fills.some(a=>a[0]==='#c8d2dd'))});
const park=CM.Geo.parks.find(f=>f.name==='世界之窗');
const pc=city.cellAt((park.bbox[0]+park.bbox[2])/2,(park.bbox[1]+park.bbox[3])/2);
check('1990: World Window is not active',()=>{assert.equal(city.parkCov[pc],0);assert.equal(city.landmarkOn[CM.DATA.landmarks.findIndex(l=>l.id==='ns_world')],0)});
for(let y=1991;y<=1997;y++){city.applyReclaim(y);city.applyRoads(y);city.activateLandmarks(y)}
check('1994: park opens without expo blocks',()=>{const lm=CM.DATA.landmarks.find(l=>l.id==='ns_world');assert.equal(lm.kind,'park');assert(city.parkCov[pc]>.45);assert.equal(city.lu[pc],CM.LU.PARK);let n=0;const save=ctxStub.fill;ctxStub.fill=()=>n++;R.drawLandmark2D(ctxStub,lm,64);R.isoLandmark(ctxStub,()=>{n++;return[0,0]},lm,64);ctxStub.fill=save;assert.equal(n,0)});
R.styleEpoch=Math.floor(1997/5);R.roadVer=city.roadVersion;city.dirty.clear();const tile={stale:false};R.ground.set('64:3:4',tile);
city.applyReclaim(1998);city.applyRoads(1998);city.activateLandmarks(1998);R.game.clock.y=1998;R.markDirty();
check('1998: terminal phase invalidates 2D cache',()=>assert(tile.stale));
for(let y=1999;y<=2026;y++){city.applyReclaim(y);city.applyRoads(y);city.activateLandmarks(y);for(let k=0;k<city.regions.length;k++)if(city.regions[k].open!=null&&city.regions[k].open<=y)city.openRegion(k,y,1)}
check('Airport keeps its operating restriction beneath landmarks',()=>{for(const t of ['surface','elevated'])assert(!CM.Metro.checkSite(city,27.2,32.2,t).ok);assert(CM.Metro.checkSite(city,27.2,32.2,'underground').ok)});
check('Protected footprint corner blocks stations',()=>{const p=[128.01744865000438,77.5587986500046];assert(city.protectedLandmarkAt(...p)>=0);assert(!CM.Metro.checkSite(city,...p,'surface').ok);const n=CM.Metro.empty();CM.Metro.addStation(n,...p,{type:'surface'},city);assert(CM.Metro.evaluate(n,CM.Metro.empty(),city,2026).conflicts.length>0)});
check('Expo gaps are passable and do not add protection cost',()=>{const g=CM.Metro.geomFromControl([[10.2,5.2],[10.8,5.2]],'surface',city);assert.equal(g.protM,0)});
check('Exact collision detects a thin slice and unions duplicate parts',()=>{const span=city.protectedAlong(127.9,77.55879865,128.2,77.55879865);assert(span.fraction>0&&span.fraction<=1);assert(span.names.includes('深圳市民中心'))});
check('Shenzhong gate activates in June, not December',()=>{const f=CM.Fac.byId('sz_zm');assert(!CM.Fac.active(f,2024+4/12,city));assert(CM.Fac.active(f,2024+5/12,city))});
check('2004 MixC demand node is in Luohu',()=>{const f=CM.Fac.byId('sz_mixc');assert(f.x>145&&f.x<151);assert(/^luohu/.test(city.regions[city.region[city.cellAt(f.x,f.y)]].id))});
check('Save restores water, land use, active landmarks and restrictions',()=>{const snap=city.serialize(),c=new CM.City();c.generate(19900101,1990);c.restore(snap,2026);assert.deepEqual(c.lu,city.lu);assert.deepEqual(c.landFrac,city.landFrac);assert.deepEqual(c.landmarkOn,city.landmarkOn);assert(!CM.Metro.checkSite(c,27.2,32.2,'surface').ok)});
check('Generated ordinary buildings do not cross visible road centerlines',()=>{
 const intersects=(p,q,b)=>{let lo=0,hi=1;for(let k=0;k<2;k++){const d=q[k]-p[k];if(Math.abs(d)<1e-12){if(p[k]<=b[k]||p[k]>=b[k+2])return false}else{let a=(b[k]-p[k])/d,z=(b[k+2]-p[k])/d;if(a>z)[a,z]=[z,a];lo=Math.max(lo,a);hi=Math.min(hi,z);if(lo>=hi)return false}}return true};
 for(let c=0;c<city.N;c++)for(const b of R.cellBuildings(c)||[]){
  const x=c%city.W,y=Math.floor(c/city.W),rect=[x+b[0],y+b[1],x+b[2],y+b[3]];
  const ways=[];
  for(const k of CM.Geo.query(city.roadWayBk,...rect)){const w=city.roadWays[k],g=city.roadGroups[w.g];if(city.roadsBuilt[w.g]&&!(g.flags&2))ways.push(w.p)}
  for(const k of CM.Geo.query(CM.Geo.streetBk,...rect)){const p=CM.Geo.streets[k].p;for(let i=0;i+3<p.length;i+=2){const mc=city.cellAt((p[i]+p[i+2])/2,(p[i+1]+p[i+3])/2);if(mc>=0&&city.street[mc]&&city.lu[mc]!==CM.LU.PARK)ways.push(p.slice(i,i+4))}}
  for(const p of ways)for(let i=0;i+3<p.length;i+=2)assert(!intersects([p[i],p[i+1]],[p[i+2],p[i+3]],rect),'road crosses generated building cell '+c);
 }
});
const net=CM.Metro.empty(),sid=CM.Metro.addStation(net,130,78,{type:'underground'},city),sid2=CM.Metro.addStation(net,134,78,{type:'underground'},city),lid=CM.Metro.newLine(net);CM.Metro.addSegment(net,lid,sid,sid2,[],'underground');
const C=CM.Metro.compile(net,city),cs=[...C.segs.values()][0];
Object.assign(R.cam,{cx:132,cy:78,zoom:60,t:1,view:1});
check('Underground depth, station, track and inverse projection agree during transitions',()=>{for(const u of [0,.2,.5,.8,1]){R.cam.under=u;R.computeTransform();R.frame++;const p=R.P(130,78,R.typeHeight('underground')),q=R.unproject(p.x,p.y,R.typeHeight('underground'));assert(Math.abs(q.x-130)<1e-8&&Math.abs(q.y-78)<1e-8);const arr=R.segScreen(cs,CM.U.smooth(u));assert(Math.hypot(p.x-arr[0],p.y-arr[1])<.001);R.drawnC=C;R.segPx=new Map([[cs.seg.id,arr]]);const i=6;const at=R.worldOnSegment(cs.seg.id,arr[i],arr[i+1]);assert(Math.hypot(at.x-cs.g.pts[i/2][0],at.y-cs.g.pts[i/2][1])<.001)}});
check('Station editing handle and no-op drag preserve underground coordinates',()=>{const ui={selection:{kind:'station',id:sid}},T=Object.create(CM.Tools.prototype);T.R=R;T.ui=ui;T.tool='edit';T.buildType='surface';T.net=()=>net;T.game=()=>({city,liveEdit:fn=>fn(net)});const h=T.handles().find(h=>h.kind==='station');const p=R.P(130,78,R.typeHeight('underground'));assert(Math.hypot(h.sx-p.x,h.sy-p.y)<1e-8);T.drag={kind:'station',id:sid};T.dragTo(h.sx,h.sy);assert(Math.hypot(net.stations[sid].x-130,net.stations[sid].y-78)<1e-8)});
check('Airport closure preserves the operating restriction until closure and survives a save',()=>{city.closeAirport();assert(!city.airportAt(27.2,32.2));const c=new CM.City();c.generate(19900101,1990);c.restore(city.serialize(),2026);assert(!c.airportAt(27.2,32.2))});
console.log(JSON.stringify({passed},null,2));
