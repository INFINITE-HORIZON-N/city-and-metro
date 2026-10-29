// 无界面跑完一整段时间，把结果导出成可导入的存档 JSON。
// 用法：node szdata/make_save.js [目标年份] [输出文件] [模式 challenge|free]
// 例：  node szdata/make_save.js 2026 szdata/sz-2026.json free
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
  getElementById: () => canvasStub(), createElement: () => canvasStub(),
  querySelector: () => null, querySelectorAll: () => [], addEventListener: noop,
  documentElement: { dataset: {}, style: { setProperty: noop }, classList: { add: noop, remove: noop } },
  body: { appendChild: noop, classList: { add: noop, remove: noop } },
};
global.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
global.matchMedia = () => ({ matches: false, addEventListener: noop });
global.devicePixelRatio = 1;
global.requestAnimationFrame = noop;
global.performance = { now: () => Date.now() };
global.navigator = { userAgent: 'node' };

const CM = {}; global.CM = CM; window.CM = CM;
const FILES = ['util.js', 'config.js', 'news.js', 'geo_gz.js', 'geo.js', 'data_gz.js', 'data_tutorial.js',
  'geo_hz.js', 'data_hz.js', 'geo_hk.js', 'data_hk.js', 'geo_tk.js', 'data_tk.js', 'geo_tp.js', 'data_tp.js',
  'geo_sz.js', 'landmarks_sz.js', 'data_sz.js', 'maps.js', 'facility.js', 'city.js', 'metro.js', 'sim.js', 'economy.js', 'macro.js',
  'game.js', 'milestones.js', 'save.js'];
for (const f of FILES) eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'));

const target = +(process.argv[2] || 2026);
const out = process.argv[3] || path.join(ROOT, 'szdata', 'sz-' + target + '.json');
const mode = process.argv[4] || 'free';

CM.useMap('sz');
const t0 = Date.now();
const g = CM.Game.create({ map: 'sz', mode: mode, name: '深圳 ' + target + '（无地铁推演）' });
console.log('开局：' + g.clock.y + '/' + g.clock.m + '，人口 ' + Math.round(g.city.totals().pop).toLocaleString());

const months = (target - g.clock.y) * 12 + (1 - g.clock.m);
if (months > 0) {
  g.startJump(months);
  let last = 0;
  while (g.jumping) {
    g.stepJump();
    const p = Math.round(g.jumping ? g.jumping.progress * 100 : 100);
    if (p >= last + 10) { last = p; console.log('  ' + p + '%  ' + g.clock.y + '/' + g.clock.m + '  人口 ' + Math.round(g.city.totals().pop).toLocaleString()); }
  }
}
console.log('推进完成：' + g.clock.y + '/' + g.clock.m + '，用时 ' + ((Date.now() - t0) / 1000).toFixed(0) + ' 秒');
const tot = g.city.totals();
console.log('人口 ' + Math.round(tot.pop).toLocaleString() + '，岗位 ' + Math.round(tot.jobs).toLocaleString() + '，站点 ' + (g.compiled ? g.compiled.stations.length : 0));

const env = CM.Save.envelope(g);
fs.writeFileSync(out, JSON.stringify(env));
console.log('存档已写入 ' + out + '（' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB）');
