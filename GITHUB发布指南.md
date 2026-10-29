# 把深圳地图发到 GitHub

两条路，选一条：

- **A 只要放上去**（自己仓库，别人能看能玩）→ 第 1、2、3、4 步，第 5 步换成「新建仓库」
- **B 提给原作者**（fork + PR）→ 全部 5 步

---

## 0. 一次性：让本机能推 GitHub

你没有 SSH key，先建一个：

```bash
ssh-keygen -t ed25519 -C "naturezr@icloud.com"     # 一路回车即可
pbcopy < ~/.ssh/id_ed25519.pub                     # 公钥已进剪贴板
```

打开 https://github.com/settings/keys → **New SSH key** → 粘贴 → Add SSH key。

验证（出现 `Hi INFINITE-HORIZON-N!` 就成了）：

```bash
ssh -T git@github.com
```

> 不想用 SSH：也可以用 Personal Access Token 当密码（GitHub → Settings → Developer settings → Tokens (classic) → 勾 `repo`），HTTPS 推送时用户名填 `INFINITE-HORIZON-N`、密码填 token。

---

## 1. 在网页上 fork

打开 https://github.com/VinsonFung/city-and-metro → 右上 **Fork** → Create fork。
得到 `https://github.com/INFINITE-HORIZON-N/city-and-metro`。

## 2. 本地克隆自己的 fork

```bash
cd ~/WorkBuddy
git clone git@github.com:INFINITE-HORIZON-N/city-and-metro.git cm-fork
cd cm-fork
git checkout -b feat/shenzhen-map
```

⚠️ 不要用 `2026-10-23-12-37-17/city-and-metro` 那个旧目录：它是**浅克隆**（`grafted`），推送会出问题；远端还指向 ghproxy 镜像。

## 3. 把改动拷进去

```bash
SRC=~/WorkBuddy/2026-10-23-12-37-17/city-and-metro-sz
rsync -av \
  --exclude .git --exclude dist --exclude .DS_Store \
  --exclude 'szdata/guangdong.osm.pbf' \
  --exclude 'szdata/features.json' \
  --exclude 'szdata/shots' \
  "$SRC"/ ./
```

改了 7 个文件、加了 3 处：

| 类型 | 文件 |
|---|---|
| 新增地图数据 | `js/data_sz.js`、`js/geo_sz.js` |
| 注册 | `index.html`（2 行 script）、`js/maps.js`（mapOrder） |
| 引擎小改 | `js/city.js`（`D.capMul` 5 行）、`js/facility.js`（`gate` 类型）、`js/render.js`（多跑道）、`js/macro.js`（CPI 序列补到 2026） |
| 文档/许可 | `深圳地图-PRD.md`、`THIRD_PARTY_NOTICES.txt`、`szdata/*`（生成与验证脚本） |

## 4. 检查并推送

```bash
git status --short          # 确认没有 pbf / features.json / dist
git add -A
git commit -m "Add Shenzhen 1990 map (212x100, reclaim, 3 runways, Shenzhen-Zhongshan link)"
git push -u origin feat/shenzhen-map
```

> `szdata/guangdong.osm.pbf` 有 166 MB，超过 GitHub 单文件 100 MB 上限，**一定不能提交**；`szdata/.gitignore` 已经挡住了。

## 5. 开 PR

打开 https://github.com/INFINITE-HORIZON-N/city-and-metro → 顶部会出现 **Compare & pull request**。

- base：`VinsonFung/city-and-metro` ← `main`
- head：`INFINITE-HORIZON-N/city-and-metro` ← `feat/shenzhen-map`
- 标题：`[地图] 深圳 · 1990`
- 正文：

```markdown
新增深圳地图（1990 起，212×100 格，52.9×25 km）。

- 区域 26 个，1990 年只开放特区三片，宝安 / 龙华 / 龙岗按年份放开
- 填海走后海（2005）与前海（2014），用现有 reclaim 机制
- 宝安机场三条跑道按 1991 / 2011 / 2025 分期出现
- 深中通道 2024 年通车，跨江车流由新增的「对外门户」设施代表；
  另加 5 行 `D.capMul`（按路名乘通行能力），让这条路在高峰能堵，其他地图无影响
- 数据：OSM（ODbL，署名已写入 THIRD_PARTY_NOTICES）+ 公开史料；年份与规模中的估算项在 PRD 里标注
- 生成脚本在 `szdata/`，可复现；验证：`node szdata/smoke.js 2026`、`node szdata/simtest.js 2026`

未做：试建线拦水面、地下视图、存档往返、教程回归。
```

---

## 网络不通时

```bash
# 方式一：直连超时就套镜像
git config --global url."https://ghproxy.net/https://github.com/".insteadOf "https://github.com/"

# 方式二：SSH 走 443（很多网络封 22 端口）
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
EOF
```

## 常见报错

| 报错 | 原因 | 处理 |
|---|---|---|
| `File ... is 166.00 MB; this exceeds GitHub's file size limit` | 把 pbf 加进去了 | `git rm --cached szdata/guangdong.osm.pbf` 后重新提交 |
| `shallow update not allowed` | 用了那个 `grafted` 的浅克隆 | 按第 2 步重新 clone |
| `Permission denied (publickey)` | 公钥没加到 GitHub | 回到第 0 步 |
| `Everything up-to-date` 但网页没变化 | 提交在别的分支 | `git branch --show-current` 确认在 `feat/shenzhen-map` |
