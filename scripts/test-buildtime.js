// 施工工期（buildTime）回归测试：验证工期公式、未开通区段不载客、分段开通拆分路线，
// 以及关闭工期时与引入之前完全一致。不依赖浏览器，也不依赖任何地图的 geodata 管线。
// 用法：node scripts/test-buildtime.js
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

const FILES = ['util.js', 'config.js', 'mechanics.js', 'news.js', 'geo_gz.js', 'geo.js', 'data_gz.js', 'data_tutorial.js',
  'maps.js', 'facility.js', 'city.js', 'metro.js', 'sim.js', 'economy.js', 'macro.js'];
for (const f of FILES) {
  try { eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')); }
  catch (e) { console.error('加载失败', f, e.message); process.exit(1); }
}

CM.useMap('gz');
const U = CM.U, M = CM.Metro, CFG = CM.CFG;
const city = new CM.City();
city.generate(19900101, 1990);

let pass = 0, fail = 0;
// 默认值需在改动之前记录
const DEFAULT_ENABLED = CFG.buildTime.enabled, DEFAULT_REFUND = CFG.buildTime.refundRatio;
const ok = function (cond, label, extra) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? '  — ' + extra : '')); }
};

// 一条 4 站的直线，位于地图中部
const makeLine = function (n) {
  const net = M.empty();
  const lid = M.newLine(net, '测试线');
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(M.addStation(net, 40 + i * 6, 40, { size: 'M', type: 'underground' }, city));
  const segs = [];
  for (let i = 0; i + 1 < ids.length; i++) {
    M.addSegment(net, lid, ids[i], ids[i + 1], [], 'underground');
    segs.push(M.findSeg(net, lid, ids[i], ids[i + 1]));
  }
  return { net: net, lid: lid, ids: ids, segs: segs };
};

console.log('\n== 1. 工期公式 ==');
CFG.buildTime.enabled = true;
const L = makeLine(4);
const g0 = M.segGeom(L.net, L.segs[0], city);
const months = M.buildMonths(g0, 'underground');
ok(months >= CFG.buildTime.minMonths, '最短工期不小于 minMonths（' + months + ' 个月）');
ok(months > 12 && months < 60, '短区间工期落在合理区间（' + months + ' 个月）');
ok(M.buildMonths(g0, 'surface') < M.buildMonths(g0, 'elevated'), '地面工期短于高架');
ok(M.buildMonths(g0, 'elevated') < months, '高架工期短于地下');
CFG.buildTime.enabled = false;
ok(M.buildMonths(g0, 'underground') === 0, '关闭工期时 buildMonths 返回 0');
CFG.buildTime.enabled = true;

console.log('\n== 2. 全部开通（未写入 openAt）==');
const now = U.ymIndex(1990, 1);
let C = M.compile(L.net, city, now);
ok(C.routes.length === 1, '一条完整线路只产生 1 条路线', C.routes.length);
ok(C.serviced.every(Boolean), '4 座车站全部在运营');
ok(C.building.length === 0, '没有在建区段');
ok(C.topo.get(L.lid).topo === 'path', '形态为普通线路');

console.log('\n== 3. 末端区间在建 ==');
L.segs[2].openAt = now + 60;
C = M.compile(L.net, city, now);
ok(C.routes.length === 1, '只剩已开通部分成线', C.routes.length);
ok(C.serviced[0] && C.serviced[1] && C.serviced[2], '前 3 站仍在运营');
ok(!C.serviced[3], '末端站在建，不参与运营');
ok(C.building.length === 1 && C.building[0].seg.id === L.segs[2].id, '在建区段被记录进 C.building');
L.segs[2].openAt = null;

console.log('\n== 4. 中间区间在建（分段开通）==');
L.segs[1].openAt = now + 60;
C = M.compile(L.net, city, now);
const tp = C.topo.get(L.lid);
ok(tp.topo === 'partial', '形态标记为分段开通', tp.topo);
ok(C.routes.length === 2, '断成 2 条独立路线', C.routes.length);
ok(C.serviced.every(Boolean), '两端车站都仍在运营（共用线路服务）');
ok(C.routes.every(function (r) { return r.stIdx.length >= 1; }), '每条路线都至少含 1 座车站');

console.log('\n== 5. 时间越过 openAt 后恢复 ==');
C = M.compile(L.net, city, now + 61);
ok(C.routes.length === 1, '工期结束后重新合成 1 条路线', C.routes.length);
ok(C.topo.get(L.lid).topo === 'path', '形态恢复为普通线路');
ok(C.building.length === 0, '不再有在建区段');

console.log('\n== 6. 省略 now 时与引入工期之前一致 ==');
L.segs[1].openAt = now + 60;
C = M.compile(L.net, city);
ok(C.routes.length === 1, '不传 now 时忽略 openAt，路线完整', C.routes.length);
ok(C.serviced.every(Boolean), '不传 now 时全部车站视为运营');
ok(C.topo.get(L.lid).topo === 'path', '形态为普通线路');
ok(M.segOpen(L.segs[1], null) === true, 'segOpen(null) 视为已开通');

console.log('\n== 7. 默认值 ==');
ok(DEFAULT_ENABLED === false, '默认配置 buildTime.enabled 为 false');
ok(DEFAULT_REFUND === 0.5, '默认退款比例为 50%');
ok(CFG.buildTime.downPayment === 0.4, '默认工程款首付比例为 40%');

console.log('\n== 8. 工程款分期 ==');
const E = CM.Economy;
const e1 = new E('challenge', 1990, 1);
const f0 = e1.funds;
const p1 = e1.addProject({ total: 1200, months: 12, startYm: U.ymIndex(1990, 1), segIds: ['g1'] });
ok(!!p1 && Math.abs(p1.perMonth - 100) < 1e-6, '每月应付 = 总额 ÷ 工期');
e1.openMonth(1990, 1);
const r1 = e1.payProgress(1990, 1);
ok(Math.abs(r1.paid - 100) < 1e-6, '首月支付 1 期');
ok(Math.abs(e1.funds - (f0 - 100)) < 1e-6, '资金按进度款扣减');
ok(Math.abs(e1.cur.construction - 100) < 1e-6, '进度款记入本期建设支出');
for (let k = 2; k <= 12; k++) { e1.openMonth(1990, k); e1.payProgress(1990, k); }
ok(e1.projects.length === 0, '付清后账本清空');
ok(Math.abs(e1.funds - (f0 - 1200)) < 1e-6, '累计支付等于总额');

console.log('\n== 9. 资金不足停工 ==');
const e2 = new E('challenge', 1990, 1);
e2.funds = 0; e2.capex = 0;
e2.openMonth(1990, 1);
const p2 = e2.addProject({ total: 1200, months: 12, startYm: U.ymIndex(1990, 1), segIds: ['g9'] });
const end0 = p2.endYm;
const r2 = e2.payProgress(1990, 1);
ok(r2.stalled.length === 1, '资金不足时登记停工');
ok(p2.halted === 1, '累计停工月数 +1');
ok(p2.endYm === end0 + 1, '停工使工期顺延一个月');
ok(e2.projects.length === 1, '停工不丢失账本');
ok(Math.abs(e2.funds) < 1e-6 && Math.abs(p2.paid) < 1e-6, '停工时不动用资金、不记已付');

console.log('\n== 10. 自由建造与存档 ==');
const e3 = new E('free', 1990, 1);
ok(e3.addProject({ total: 1000, months: 10, startYm: U.ymIndex(1990, 1) }) === null, '自由建造不登记在建工程');
const sv = JSON.parse(JSON.stringify(e2.serialize()));
ok(Array.isArray(sv.projects) && sv.projects.length === 1, '存档包含在建工程账本');
const e4 = E.restore(sv);
ok(e4.projects.length === 1 && e4.projects[0].halted === 1, '读档恢复在建工程与停工月数');

console.log('\n== 11. 机制矩阵解析 ==');
const D = CM.DATA;
CM.Mech.attach(null);
CFG.buildTime.enabled = false;
ok(CM.Mech.on('buildTime') === false, '新局默认关闭');
CFG.buildTime.enabled = true;
ok(CM.Mech.on('buildTime') === true, '老字段 CFG.buildTime.enabled 仍作为回落生效');
CFG.buildTime.enabled = false;
const fakeGame = { mech: { buildTime: 'on', landValue: 'off', incidents: 'off' } };
CM.Mech.attach(fakeGame);
ok(CM.Mech.on('buildTime') === true, '本局开关 on 时开启');
fakeGame.mech.buildTime = 'off';
ok(CM.Mech.on('buildTime') === false, '本局开关 off 时关闭');
CM.Mech.attach({ mech: {} });
D.mechanics = { buildTime: { mode: 'on', downPayment: 0.25 } };
ok(CM.Mech.mapMode('buildTime') === 'on', '地图声明被读到');
ok(CM.Mech.on('buildTime') === true, '本局未声明时跟随地图');
ok(CM.Mech.opt('buildTime', 'downPayment', 0.4) === 0.25, 'M.opt 取地图声明的 downPayment');
delete D.mechanics;
ok(CM.Mech.on('landValue') === false, '未实现的机制默认关闭');
ok(CM.Mech.DEF.buildTime === 'off', '默认值表为全关');
CM.Mech.attach(null);

console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败');
process.exit(fail ? 1 : 0);
