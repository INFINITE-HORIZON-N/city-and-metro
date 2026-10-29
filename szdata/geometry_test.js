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
  'geo_sz.js', 'landmarks_sz.js', 'data_sz.js', 'maps.js', 'facility.js', 'city.js', 'metro.js', 'sim.js', 'economy.js', 'macro.js', 'landmark_meshes_sz.js', 'landmark_models_sz.js', 'render.js'];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  try { eval(src); } catch (e) { console.error('加载失败', f, e.message); process.exit(1); }
}

const assert = require('node:assert/strict');
CM.useMap('sz');
const city = new CM.City(); city.generate(19900101, 1990);
const renderer = Object.create(CM.Renderer.prototype); renderer.game = {city, clock:{y:1990}};
const satellite = CM.DATA.landmarks.findIndex(l => l.id === 'ba_sat');
assert(satellite >= 0);
const checks = [];
for (const year of [1990,1991,1998,2013,2020,2021,2026]) {
 city.applyReclaim(year);city.applyRoads(year);city.activateLandmarks(year);renderer.game.clock.y=year;
 assert.equal(!!city.landmarkOn[satellite], year >= 2021, 'S1 opening year');
 let buildings = 0;
 for (let c=0;c<city.N;c++) for (const b of renderer.cellBuildings(c)||[]) {
   const ox=(c%city.W)*city.BS,oy=Math.floor(c/city.W)*city.BS;
   for(let y=Math.floor(b[1]*city.BS);y<Math.ceil(b[3]*city.BS);y++) for(let x=Math.floor(b[0]*city.BS);x<Math.ceil(b[2]*city.BS);x++)
     assert.equal(city.bmask[(oy+y)*city.BW+ox+x],0,`building intersects road/water reservation: ${year}/${c}`);
   buildings++;
 }
 checks.push({year,buildings,landmarks:city.landmarkOn.reduce((a,b)=>a+b,0)});
}
// Both renderers must stay inside the declared local site (including rotated shapes).
for (const lm of CM.DATA.landmarks.filter(l=>l.parts)) {
 const a=lm.rot*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
 for (const part of lm.parts) for (const [u,v] of part.p) {
   assert(Math.abs(u)<=lm.w/2+0.03 && Math.abs(v)<=lm.d/2+0.03,`${lm.id} footprint exceeds site`);
 }
 let count=0;
 renderer.isoLandmark(ctxStub,(x,y,h)=>{
   const dx=(x-lm.x)*CM.CFG.CELL_M,dy=(y-lm.y)*CM.CFG.CELL_M;
   assert(Math.abs(dx*ca+dy*sa)<=lm.w/2+0.04 && Math.abs(-dx*sa+dy*ca)<=lm.d/2+0.04,`${lm.id} model exceeds site`);
   count++;return [x,y-h];
 },lm,32);
 assert(count>0);
}
// A 26-landmark legacy snapshot upgrades without losing the new S1 or keeping a ghost site.
const snapshot=city.serialize();delete snapshot.landmarkGeometryVersion;snapshot.landmarkOn=snapshot.landmarkOn.slice(0,26);
const legacyCell=city.cellAt(26.21,44.52);const lu=CM.U.unpackTyped(snapshot.lu);lu[legacyCell]=CM.LU.LANDMARK;snapshot.lu=CM.U.packTyped(lu,'u8');
const restored=new CM.City();restored.generate(19900101,1990);restored.restore(snapshot,2026);
assert.equal(restored.landmarkOn[satellite],1);assert.notEqual(restored.lu[legacyCell],CM.LU.LANDMARK);
const current=restored.serialize(), again=new CM.City();again.generate(19900101,1990);again.restore(current,2026);
assert.deepEqual(Array.from(again.landmarkOn),Array.from(restored.landmarkOn));
assert.deepEqual(Array.from(again.lu),Array.from(restored.lu));
// Ring winding: duplicate sea polygons stay water, islands keep the opposite winding.
const trace={rings:[],moveTo(x,y){this.rings.push([[x,y]])},lineTo(x,y){this.rings.at(-1).push([x,y])},closePath(){}};
CM.Geo.tracePoly(trace,{rings:[{outer:true,p:[0,0,0,4,4,4,4,0]},{outer:false,p:[1,1,2,1,2,2,1,2]}]});
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0);
assert(area(trace.rings[0])>0);assert(area(trace.rings[1])<0);
console.log(JSON.stringify({checks,footprintLandmarks:CM.DATA.landmarks.filter(l=>l.parts).length,saveMigration:'passed',waterWinding:'passed'},null,2));
