'use strict';
// 机制矩阵：每张图可以默认开哪些可选玩法（工期、地价、事故），玩家可在设置里全局强制开关。
// 解析顺序：设置里的强制值 → 地图 data.mechanics[kind].mode → 老字段回落 → 默认关。
// 所有地图都不声明 mechanics 时，行为与引入本模块之前完全一致。
(function (CM) {
  const CFG = CM.CFG;
  const M = CM.Mech = {};
  M.KINDS = ['buildTime', 'landValue', 'incidents'];
  M.LABEL = { buildTime: '施工工期', landValue: '地价上涨', incidents: '运营事故' };
  M.HINT = {
    buildTime: '新轨道建成前先“在建”，到期才投入运营',
    landValue: '地铁覆盖范围内的地价逐年上涨，后续拆迁更贵',
    incidents: '信号故障、突发大客流与暴雨限速',
  };
  const SETTING = { buildTime: 'mechBuildTime', landValue: 'mechLandValue', incidents: 'mechIncidents' };
  M.SETTING = SETTING;

  // 设置里的强制值（'on' | 'off' | 'auto'）
  const forced = function (kind) {
    const S = CM.Settings;
    if (!S) return 'auto';
    const v = S.get(SETTING[kind]);
    return (v === 'on' || v === 'off') ? v : 'auto';
  };
  // 地图自己的声明（'on' | 'off' | null）
  M.mapMode = function (kind) {
    const m = CM.DATA && CM.DATA.mechanics && CM.DATA.mechanics[kind];
    return m && (m.mode === 'on' || m.mode === 'off') ? m.mode : null;
  };
  M.mode = function (kind) {
    const f = forced(kind);
    if (f !== 'auto') return f;
    const own = M.mapMode(kind);
    if (own) return own;
    // 回落：引入本模块之前只有 CFG.buildTime.enabled 一个开关
    if (kind === 'buildTime') return (CFG.buildTime && CFG.buildTime.enabled) ? 'on' : 'off';
    return 'off';
  };
  M.on = function (kind) { return M.mode(kind) === 'on'; };
  // 参数取用：地图声明优先，其次全局配置块，最后用传入的缺省值
  M.opt = function (kind, key, fallback) {
    const m = CM.DATA && CM.DATA.mechanics && CM.DATA.mechanics[kind];
    if (m && m[key] !== undefined) return m[key];
    const base = CFG[kind];
    if (base && base[key] !== undefined) return base[key];
    return fallback;
  };
})(window.CM);
