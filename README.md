# 星穹铁道资料站 · Honkai: Star Rail Wiki

一个《崩坏：星穹铁道》游戏资料 Wiki 站点，深色科幻风格，支持桌面端与移动端。

## 技术栈

- **React 19 + TypeScript + Vite 7**：前端框架与构建工具
- **Tailwind CSS 4**：样式（CSS-first 配置，主题见 `src/index.css`）
- **React Router 7**：路由
- **Dexie 4（IndexedDB）**：本地数据存储，配合 `dexie-react-hooks` 实时响应数据变化
- **@fontsource/rajdhani**：本地打包的英文/数字展示字体（中文回退系统字体）
- **Vitest + fake-indexeddb**：单元 / 数据层集成 / 组件与 hooks 测试（`npm test`）
- **Playwright**：浏览器端 E2E 冒烟测试（`e2e/`，覆盖图鉴浏览、收藏、管理页增删与备份导入导出，`npm run e2e`）
- **ESLint（typescript-eslint + react-hooks 规则）**：静态检查（`npm run lint`），GitHub Actions CI 上随测试与构建一并执行
- **PWA**：manifest + Service Worker（`public/sw.js`，页面导航网络优先 + 离线回退应用壳，静态资源 stale-while-revalidate，本地化游戏图片走独立缓存 + FIFO 数量上限），支持安装与离线访问

## 页面结构

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | Hero、数据概览、功能入口、站点说明 |
| `/characters` | 角色图鉴 | 搜索 + 稀有度/命途/属性/体型/实装版本筛选（维度内可多选）+ 排序，状态同步到 URL |
| `/characters/:id` | 角色详情 | 全部字段 + 简介 + 相关资讯时间线 |
| `/light-cones` | 光锥图鉴 | 搜索 + 稀有度(3-5★)/命途/获取方式/实装版本筛选（维度内可多选）+ 排序，状态同步到 URL |
| `/light-cones/:id` | 光锥详情 | 全部字段 + 描述 + 相关资讯时间线 |
| `/relics` | 遗器图鉴 | 搜索 + 类别（隧道遗器/位面饰品）/稀有度(2-5★)/实装版本筛选（维度内可多选）+ 排序，状态同步到 URL |
| `/relics/:id` | 遗器详情 | 类别 / 稀有度 / 二件套与四件套效果 / 套装部件 |
| `/matrix` | 命途 × 属性矩阵 | 横轴命途、纵轴战斗属性；支持稀有度/性别/版本筛选，表头显示计数；桌面端为完整二维矩阵（可横向滚动），移动端按属性分组堆叠展示；单元格内按实装日期从新到旧排列 |
| `/news` | 资讯日历 | 年月日历视图，支持月份切换、类型筛选（版本/角色/光锥/活动/卡池/活动结束）、本月事件列表；点击日期（或「+N 项」）可查看当日全部事件；年月、日与类型同步到 URL |
| `/banners` | 卡池时间线 | 按版本分组回溯跃迁卡池，UP 角色 / 光锥与开放时段可跳转（聚合「跃迁卡池」类型资讯事件） |
| `/versions` | 版本索引 | 按大版本分组列出全部收录版本及各表条目数 |
| `/versions/:version` | 版本详情 | 聚合实装于该版本的角色、光锥、遗器与资讯事件（从日历版本标签、详情页实装版本字段进入） |
| `/favorites` | 我的收藏 | 聚合展示三类收藏条目（收藏存于 IndexedDB，随导出备份） |
| `/admin` | 数据管理 | 应用内增删改角色 / 光锥 / 遗器 / 资讯条目，实时写入 IndexedDB（入口在页脚）；含数据健康检查（悬挂关联 / 无效枚举 / 日期格式 / 重复名称 / 悬空图片引用）与字段级内联校验 |
| `*` | 404 | — |

## 快速开始

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 类型检查 + 生产构建（输出 dist/）
npm run preview    # 预览生产构建
npm test           # 运行单元测试（Vitest，覆盖日期工具 / 分面计数 / 版本分组等纯逻辑与组件、hooks、收藏存储、种子数据质量门禁）
npm run e2e        # 浏览器端 E2E 冒烟测试（首次需 npx playwright install chromium）
npm run check:size # 构建产物包体预算检查（gzip，超预算退出码 1）
npm run update:data # 一键更新种子数据：抓取 Wiki → 图片本地化 → 重新生成 seed.ts → 门禁验证
npm run lint       # ESLint 静态检查
```

## 如何录入数据

**页面代码不包含任何游戏数据**，全部数据存放在浏览器 IndexedDB 中。种子数据由 `.scrape` 管线从 biligame 星穹铁道 Wiki（SMW 数据）生成，当前规模：角色 93 · 光锥 170 · 遗器 60 · 资讯 578（抓取日期 2026-09-28，仅含已实装内容）。

数据更新方式：

- **一键更新（推荐）**：`npm run update:data` 依次执行角色 SMW 抓取 → 光锥 / 遗器 / 资讯（含卡池）抓取 → 新增图片本地化 → 合成 `src/data/seed.ts` → 种子质量测试 → 构建 → 包体预算检查，任一门禁失败即中止，不会产出可推送的坏数据（脚本为 `scripts/update-data.mjs`）；已本地化的图片按 id 保留不重复下载，个别图片下载失败仅告警、字段回退为 Wiki 热链；
- **自动更新**：`.github/workflows/update-data.yml` 每 3 天（北京时间约 11:00）自动跑一次 `update:data`，有数据变更时提交推送 main 并触发 CI，CI 通过后由 Deploy 工作流上线（坏产物不会发布）；脚本对 B 站 WAF（HTTP 567）有指数退避重试，持续失败会自动在仓库开 / 更新 issue 提醒人工排查，也可在 Actions 页手动 Run workflow；
- **单步抓取**：`node .scrape/scrape_characters.cjs` + `node .scrape/gen_seed.cjs` 生成角色种子，`node .scrape/scrape_wiki.cjs` 抓取光锥 / 遗器 / 卡池并派生资讯事件，再运行 `node .scrape/gen_seed_ts.cjs` 重新生成 `src/data/seed.ts`（生成文件，勿直接手改）；
- **图片资产化**：`node .scrape/scrape_avatars.cjs`（角色头像，宽 320px）与 `node .scrape/scrape_images.cjs`（光锥 / 遗器立绘，宽 400px）把图片下载为本地缩略图（`public/avatars/`、`public/cones/`、`public/relics/`），对应字段改写为站内路径 —— 消除对 Wiki 的热链依赖，图片随站点部署并由 Service Worker 缓存（图片缓存有 FIFO 数量上限），离线可用；
- **手工补充**：直接编辑 `.scrape/*.json` 后运行生成脚本，或在应用内「数据管理」页面录入；
- 种子内容变化由启动时的内容指纹自动检测（无需手动递增版本号），`src/db/bootstrap.ts` 按 `id` 增量更新且不删除表中额外条目；在「数据管理」中删除过的条目有删除墓碑保护，不会被种子更新复活；
- 页面通过 `dexie-react-hooks` 的 `useLiveQuery` 实时读取，无需刷新即可看到新数据。

手工录入的数据与收藏可通过页脚的「导出数据 / 导入数据」按钮备份与恢复（JSON 文件含 schema 版本号，数据按 `id` 合并导入，收藏取并集）；导入前会校验文件大小（上限 50MB）与 app 标识，非本站导出的备份会被拒绝。收藏保存在 IndexedDB（meta 表）中，旧版本存于 localStorage 的收藏会在启动时自动迁移；业务表不再引用的孤儿图片也会在启动时自动回收。

上传到管理页的本地图片经压缩后存入独立的 `images` 表（业务记录只保存 `idb:` 引用，列表页不加载图片载荷）；导出时会自动还原为 data URL，备份文件保持自包含。角色 / 光锥 / 遗器支持「别名 / 英文名」（多行或逗号分隔），搜索时一并匹配。资讯事件可关联角色 / 光锥 / 遗器，关联遗器在遗器详情页展示「相关动态」。

字段与类型定义见 [`src/db/types.ts`](src/db/types.ts)：

- `Character`：id、name、rarity（4/5）、path（命途）、element（战斗属性）、faction（派系）、camp（阵营）、gender、bodyType（体型：成男/男青年/少年/成女/女青年/少女/幼女）、releaseDate（YYYY-MM-DD）、releaseVersion、avatar?、description?
- `LightCone`：id、name、rarity（3/4/5，光锥含 3★）、path（命途）、acquisition?（获取方式：跃迁/限定跃迁/活动/任务/探索/无名勋礼/商店兑换/世界商店/模拟宇宙/行动摘要/历战余响/奇珍琳琅/等级奖励/联动跃迁）、releaseDate?、releaseVersion?、image?、description?
- `RelicSet`：id、name、category（cavern 隧道遗器 / planar 位面饰品）、rarity（2-5★）、effect2（二件套效果，必填）、effect4?（四件套效果，位面饰品无）、releaseDate?、releaseVersion?、pieces?（部件列表：slot 为 head/hands/body/feet/sphere/rope）、image?、description?
- `NewsEvent`：id、type（version/character/lightcone/event/banner/eventEnd）、title、date、endDate?、version?、description?、relatedCharacterId?、relatedLightConeId?

命途 / 属性 / 事件类型 / 遗器类别与部位的展示名与主题色、实装版本列表等「分类元数据」在 [`src/lib/meta.ts`](src/lib/meta.ts) 中维护，与具体数据条目分离。

### 注意事项

- `id` 必须唯一；当前种子沿用 Wiki 页面标题（中文）作为 id，站内 URL 会 percent-encode 但功能与分享完整。如需改为英文短横线 id，须在抓取管线中统一重映射，并同步全部资讯关联字段与收藏键；
- 日期一律使用 `YYYY-MM-DD` 格式；
- 需要清空本地数据时，可在浏览器 DevTools → Application → IndexedDB 中删除 `hsr-wiki` 数据库后刷新（应用会按种子重新初始化）。

## 目录结构

```
src/
├── data/seed.ts        # 种子数据（由 .scrape 脚本生成；与页面代码分离，动态加载不进主包）
├── db/                 # Dexie 数据库、类型定义、初始化逻辑
├── hooks/              # useLiveQuery 数据查询 hooks
├── lib/                # 分类元数据（命途/属性/稀有度/事件类型）、日期工具
├── components/
│   ├── layout/         # 导航栏、页脚、布局壳
│   ├── cards/          # 角色 / 光锥卡片
│   ├── ui/             # Panel、徽标、空状态、页头等基础组件
│   └── icons.tsx       # 内联 SVG 图标
└── pages/              # 各路由页面
```

`.scrape/` 目录为数据抓取与种子生成脚本（Node ≥ 20.19，见 `package.json` 的 `engines`）：`scrape_characters.cjs` + `gen_seed.cjs` 抓取并生成角色种子，`scrape_wiki.cjs` 抓取光锥 / 遗器 / 卡池，`scrape_avatars.cjs` / `scrape_images.cjs` 本地化图片，`gen_seed_ts.cjs` 合成 `src/data/seed.ts`；`*_seed.json` 为可编辑的数据源，`characters_smw.json` 为角色原始抓取物（留存供离线重生成）。`scripts/` 目录为工程脚本：`update-data.mjs`（一键更新）、`check-bundle-size.mjs`（包体预算）、`generate-assets.mjs`（PWA 图标与分享图）。

## 部署

纯静态产物（`dist/`），可托管于任意静态服务：

- **GitHub Pages**：`.github/workflows/deploy.yml` 在 push 到 main 时触发，须先由 CI 工作流（`.github/workflows/ci.yml`：ESLint + Vitest + 构建 + 包体预算检查 + 部署资源断言 + Playwright E2E）全部通过才构建发布到项目站点（`https://<owner>.github.io/<repo>/`），坏产物不会上线；失败时自动通知。需在仓库 Settings → Pages 中把 Source 设为「GitHub Actions」（部署工作流含 configure-pages 自动开通）；子路径经 `DEPLOY_BASE=/<repo>/` 注入构建，React Router（basename）、Service Worker、manifest 与 og:image 均随 base 自适应，未匹配路由由 404.html 回退应用壳；生产构建会注入 CSP meta 标签（脚本 / 字体 / 连接仅限自身域，图片放行 `data:` / `blob:` 与 Wiki 域，兼容个别未本地化的热链回退图片）；
- **其它静态托管**（Vercel / Netlify / Nginx 等）：根路径直接 `npm run build` 发布 `dist/`，SPA 路由回退指向 `index.html` 即可。

PWA 位图图标与社交分享图由 `node scripts/generate-assets.mjs` 生成（调整站点视觉后重跑）；`npm run check:size` 在本地与 CI 校验构建产物包体预算。

## 后续可扩展

- 将 `useLiveQuery` 查询替换为远程 API（数据层已与页面解耦，只需改 `src/hooks/useWikiData.ts`）
- 增加角色/光锥技能、星魂等更多图鉴模块
- 卡池起止日期的精确抓取（Wiki 暂无结构化卡池日期字段；`/banners` 页面已就绪，数据补齐后自动展示）
