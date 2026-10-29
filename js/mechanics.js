'use strict';
// 机制矩阵：每张图可以默认开哪些可选玩法（工期、地价、事故），每局再由玩家自己开关。
// 解析顺序：本局存档里的选择 → 地图 data.mechanics[kind].mode → 老字段回落 → 默认关。
// 所有地图都不声明 mechanics 时，行为与引入本模块之前完全一致；新局默认全关。
(function (CM) {
  const CFG = CM.CFG;
  const M = CM.Mech = {};
  M.KINDS = ['buildTime', 'landValue', 'incidents'];
  M.LABEL = { buildTime: '施工工期', landValue: '地价上涨', incidents: '运营事故' };
  M.HINT = {
    buildTime: '新轨道建成前先“在建”，到期才投入运营；工程款可分期，资金不足会停工',
    landValue: '地铁覆盖范围内的地价逐年上涨，后续拆迁更贵',
    incidents: '信号故障、突发大客流与暴雨限速',
  };
  M.DEF = { buildTime: 'off', landValue: 'off', incidents: 'off' };
  M.ctx = null;   // 当前这一局，由 Game.create / Game.fromSave 调用 attach 设置

  M.attach = function (g) { M.ctx = g || null; return M.ctx; };
  // 地图自己的声明（'on' | 'off' | null）
  M.mapMode = function (kind) {
    const m = CM.DATA && CM.DATA.mechanics && CM.DATA.mechanics[kind];
    return m && (m.mode === 'on' || m.mode === 'off') ? m.mode : null;
  };
  M.mode = function (kind) {
    const g = M.ctx;
    const own = g && g.mech && g.mech[kind];
    if (own === 'on' || own === 'off') return own;
    const mm = M.mapMode(kind);
    if (mm) return mm;
    // 回落：引入本模块之前只有 CFG.buildTime.enabled 一个开关
    if (kind === 'buildTime') return (CFG.buildTime && CFG.buildTime.enabled) ? 'on' : 'off';
    return 'off';
  };
  M.on = function (kind) { return M.mode(kind) === 'on'; };
  // 改本局开关（走 Game.setMech，会触发重编译与界面刷新）
  M.set = function (kind, mode) {
    const g = M.ctx;
    return !!(g && g.setMech && g.setMech(kind, mode));
  };
  // 参数取用：地图声明优先，其次全局配置块，最后用传入的缺省值
  M.opt = function (kind, key, fallback) {
    const m = CM.DATA && CM.DATA.mechanics && CM.DATA.mechanics[kind];
    if (m && m[key] !== undefined) return m[key];
    const base = CFG[kind];
    if (base && base[key] !== undefined) return base[key];
    return fallback;
  };
})(window.CM);
