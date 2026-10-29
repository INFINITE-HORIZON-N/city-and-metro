# 提交 PR 用（复制到网页）

**开 PR 的链接（直接对上游，别在 fork 页面点）**

https://github.com/VinsonFung/city-and-metro/compare/main...INFINITE-HORIZON-N:city-and-metro:feat/shenzhen-map?expand=1

**标题**

```
[地图] 深圳 · 1990
```

**正文**

```markdown
## 这是什么

新增一张深圳地图：1990 年开局，可推进到 2026。212 × 100 格（52.9 × 25 km），21,200 格。

## 与现有机制的对应

- **片区** 26 个：1990 年只开放特区三片（罗湖、福田、南山一带），宝安 1993、龙华 2000、观澜与石岩 2005、光明 2010
- **填海**：后海 2005、前海 2014，走现有 `reclaim` 机制，成陆后自动获得规划用地
- **机场**：宝安机场三条跑道按 1991 / 2011 / 2025 逐年出现（用新增的 `D.airport.runways` 数组，单跑道的旧字段仍兼容）
- **深中通道**：OSM 里它是 G2518 深岑高速的东段，`extract.py` 按纬度改名入库，2024 年通车
- **跨江车流**：新增 `gate`（对外门户）设施代表「往中山方向」这个目的地；另加 5 行 `D.capMul`，按路名给个别路段乘通行能力（本图 `{'深中通道': 0.55}`），没有该字段的地图完全不受影响

## 改动

| 类型 | 文件 |
|---|---|
| 新增 | `js/data_sz.js`、`js/geo_sz.js` |
| 注册 | `index.html`、`js/maps.js` |
| 引擎 | `js/city.js`（capMul 5 行）、`js/facility.js`（gate 类型）、`js/render.js`（多跑道）、`js/macro.js`（CPI 序列补到 2026） |
| 文档 | `深圳地图-PRD.md`、`THIRD_PARTY_NOTICES.txt`、`szdata/` |

## 数据

- 地理：OpenStreetMap，ODbL，署名已写入 `THIRD_PARTY_NOTICES.txt`
- 年份：公开史料（机场通航、地铁开通、地标落成、深中通道通车）
- 人口、造价、票价、规模为估算，PRD 里逐项标注，没有用下载日期冒充资料年代
- 可复现：`szdata/` 下 `fetch.py → extract.py → make_sea.py → build_geo.py`；原始 PBF 与 `features.json` 体积过大，已在 `szdata/.gitignore` 排除

## 验证

- `node szdata/smoke.js 2026`：21,200 格、生成约 280 ms、25 个地标全部落成、44 个设施运营、12 个任务锚点合法
- `node szdata/simtest.js 2026`：无地铁、人口 1,560 万时，深中通道 46 条弧段，工作日平均 v/c 0.13、峰值 0.55（沿江高速 0.09 / 0.44，北环 0.10 / 0.45）
- 浏览器内：新局、跳 14 个月、2D / 2.5D 视图、地图列表第 7 张、与其他图往返切换均正常

## 未做

试建线拦水面、地下视图、存档 A→B→A、教程 12 步回归。

## 可以商量的地方

21,200 格是广州的 1.84 倍，对低端机不友好。如果要压，可以砍到 132 × 84（11,088 格，只留特区 + 宝安中心 + 龙华），我这边改起来很快。
```
