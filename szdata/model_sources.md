# 模型参考来源

2026-10-29 核对。用户提供的俯视、正面截图仅作为建筑形态参考，未作为游戏纹理或发布素材。

- [Fuksas：宝安机场 T3](https://fuksas.com/shenzen-airport/)：设计说明及多视角照片，蜂窝表皮、低伏有机屋面。
- [MAD：深圳湾文化广场](https://www.i-mad.com/zh/projects/shenzhen-bay-culture-park)：南北主馆、石体、下沉空间与景观屋面；已查看建筑师发布的滨水斜侧实景。
- [深圳龙源精造：深圳湾体育中心](https://www.ly-jz.com/main/detail-tabid-14-aid-21.html)：连续网壳及侧面实景；已查看连续屋盖与场馆开口的工程照片。
- [KPF：China Resources Tower](https://www.kpf.com/project/china-resources-tower)：塔冠及纵向/斜交结构。
- [KPF：Ping An Finance Centre](https://www.kpf.com/project/ping-an-finance-centre/)：转角构件、渐收塔身及裙房关系。
- [星盛商业：COCO Park](https://www.g-cre.com/news/Inner/631)：开敞中央空间及 2006 年启用背景。
- [南山区：深圳湾文化广场开放](https://www.szns.gov.cn/szsnsqrmzfbgswzgkml/szsnsqrmzfbgswzgkml/qt/gzdt/content/post_12512842.html)：2025 年开放。

OSM 建筑数据与来源编号见 `landmarks_osm.json`，© OpenStreetMap 贡献者，ODbL 1.0。新增春茧参考单体为 ways 665408865、665408866、665408867；文化广场 way 1441599159；COCO Park 场地 way 546582690。

`build_landmarks.py` 生成本地米制轮廓；`build_roof_mesh.py` 将三个场馆的占地包络生成连续屋盖，开口及高度函数由参考影像近似，保存在 `js/landmark_meshes_sz.js`。运行需 Python、Shapely。
