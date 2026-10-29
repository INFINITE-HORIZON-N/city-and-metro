# 给模型看的说明：这是什么、该改哪里

这是一个网页版模拟经营游戏《城市与地铁》的**社区改版**，在原作者 VinsonFung 的仓库基础上新增了一张**深圳**地图。纯前端，无构建、无依赖，`index.html` 直接用 `<script>` 按顺序加载 `js/*.js`。

> 本包包含 `js/geo_*.js` 和 `img/`，可直接打开 `index.html`。建筑修正说明见 `修正说明.md`；已核对地标的坐标与轮廓以 `js/landmarks_sz.js` 为准。

## 文件职责

| 文件 | 作用 | 什么时候该改 |
|---|---|---|
| `js/data_sz.js` | **深圳地图的全部数据**：片区与开放年份、填海、道路通车年、机场/火车站、地标、设施、任务、事件、经济参数 | 改城市内容基本只改这一个 |
| `js/render.js` | 渲染：2D 俯视、2.5D 建筑、地下视图 | 改外观、加专属 3D 地标模型 |
| `js/city.js` | 城市生成：地形、水系、路网、填海、区域、建筑高度 | 改生成规则 |
| `js/sim.js` | 出行模型：四步客流分配、地铁/汽车分担、拥堵 | 改算法 |
| `js/metro.js` | 线网：铺轨、车站、造价、换乘 | 改建设规则 |
| `js/game.js` | 游戏主循环：时钟、月度结算、任务、存档 | 改玩法流程 |
| `js/save.js` | 存档：IndexedDB + JSON 导入导出 | 改存档 |
| `js/geo_*.js` | **生成物，勿手改** | 改 `szdata/` 里的脚本重新生成 |

## 改地标长什么样

`js/data_sz.js` 里的 `landmarks` 数组，一行一座：

```js
lm('ft_pingan', '平安金融中心', 22.5367, 114.0503,
   { w: 88, d: 88, rot: 42, year: 2017, kind: 'skyscraper', h: 599, style: 'east' })
```

- `w` / `d`：占地宽、深（米）；`rot`：朝向（度）
- `year`：落成年份；`h`：高度（米）
- `kind`：造型，决定 2.5D 里怎么画。**现有可用的 kind**：`skyscraper`（含 `style: 'citic' / 'east' / 'west'`）、`stadium`、`expo`、`rail`、`campus`、`hall`、`concert`、`box`、`gallery`、`tvtower`、`lattice`、`pagoda`、`temple`、`church`、`colonial`、`memorial`、`museum`、`opera`、`tower`

`js/render.js` 里有两段按 `kind` 分支的画法：约 **780 行**是 2D 俯视，约 **1246 行起**是 2.5D（带高度、阴影、夜间亮窗）。要加“深圳专属造型”，就在这两处的 `switch (kind)` 里加一个分支，再在数据里用新的 `kind` 名。

## 三个本图新增的可选字段（不声明则其他地图行为不变）

```js
capMul: { '深中通道': 0.55 },   // 按路名乘通行能力
roadDefault: { 1: 2002, 2: 1996 }, // 未列名道路按等级的默认通车年
rampDefault: 1996,             // 立交匝道的默认通车年
```

## 改完怎么验证（不需要浏览器）

```bash
node szdata/smoke.js 2026     # 生成地图、片区统计、填海、深中通道、任务锚点、逐年推进
node szdata/simtest.js 2026   # 按月推进人口 → 建出行模型 → 全网拥堵与主要道路 v/c
```

前者应输出：`21,200 格`、`27 / 27` 地标落成、`12 / 12` 任务锚点合法。

## 别做的事

- 不要手改 `js/geo_*.js`；要改地理数据请改 `szdata/` 里的 `extract.py` / `build_geo.py` 再重新生成
- 不要把 `szdata/guangdong.osm.pbf`（166 MB）或 `features.json`（21 MB）提交进仓库，GitHub 单文件上限 100 MB
- 地理数据来自 OpenStreetMap，ODbL 许可，必须保留 `THIRD_PARTY_NOTICES.txt` 里的署名
- 原作采用非商业许可，改动可以，公开分发要作者同意

## 原始需求文档

`深圳地图-PRD.md`：范围选择、坐标系、范围取舍、深中通道方案，以及 11 条“试玩后修正”（每条都写了现象、原因、改法）。要看某个设计为什么是这样，先查它。
