# 星穹铁道资料站 · Honkai: Star Rail Wiki

一个《崩坏：星穹铁道》游戏资料 Wiki 站点，深色科幻风格，支持桌面端与移动端。

## 技术栈

- **React 19 + TypeScript + Vite 7**：前端框架与构建工具
- **Tailwind CSS 4**：样式（CSS-first 配置，主题见 `src/index.css`）
- **React Router 7**：路由
- **Dexie 4（IndexedDB）**：本地数据存储，配合 `dexie-react-hooks` 实时响应数据变化
- **@fontsource/rajdhani**：本地打包的英文/数字展示字体（中文回退系统字体）
- **Vitest + fake-indexeddb**：单元 / 数据层集成 / 组件与 hooks 测试（`npm test`）
- **ESLint（typescript-eslint + react-hooks 规则）**：静态检查（`npm lint`），GitHub Actions CI 上随测试与构建一并执行
- **PWA**：manifest + Service Worker（`public/sw.js`，同源资源 stale-while-revalidate），支持安装与离线访问

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
| `/versions/:version` | 版本详情 | 聚合实装于该版本的角色、光锥、遗器与资讯事件（从日历版本标签、详情页实装版本字段进入） |
| `/admin` | 数据管理 | 应用内增删改角色 / 光锥 / 遗器 / 资讯条目，实时写入 IndexedDB（入口在页脚） |
| `*` | 404 | — |

## 快速开始

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 类型检查 + 生产构建（输出 dist/）
npm run preview    # 预览生产构建
npm test           # 运行单元测试（Vitest，覆盖日期工具 / 分面计数 / 版本分组等纯逻辑与组件、hooks、收藏存储）
npm run lint       # ESLint 静态检查
```

## 如何录入数据

**页面代码不包含任何游戏数据**，全部数据存放在浏览器 IndexedDB 中，并通过种子文件录入：

1. 打开 [`src/data/seed.ts`](src/data/seed.ts)，往 `characterSeed` / `lightConeSeed` / `relicSeed` / `newsEventSeed` 数组中添加条目，并把文件末尾的 `SEED_VERSION` 加 1；
2. 启动应用后，`src/db/bootstrap.ts` 会自动同步：对应表为空时全量写入种子数据；表非空但种子版本落后时按 `id` 增量更新（不会删除表中额外条目）；
3. 页面通过 `dexie-react-hooks` 的 `useLiveQuery` 实时读取，无需刷新即可看到新数据。

手工录入的数据与收藏可通过页脚的「导出数据 / 导入数据」按钮备份与恢复（JSON 文件，数据按 `id` 合并导入，收藏取并集）。收藏保存在 IndexedDB（meta 表）中，旧版本存于 localStorage 的收藏会在启动时自动迁移。

字段与类型定义见 [`src/db/types.ts`](src/db/types.ts)：

- `Character`：id、name、rarity（4/5）、path（命途）、element（战斗属性）、faction（派系）、camp（阵营）、gender、bodyType（体型：成男/男青年/少年/成女/女青年/少女/幼女）、releaseDate（YYYY-MM-DD）、releaseVersion、avatar?、description?
- `LightCone`：id、name、rarity（3/4/5，光锥含 3★）、path（命途）、acquisition?（获取方式：跃迁/限定跃迁/活动/任务/探索/无名勋礼/商店兑换/世界商店/模拟宇宙/行动摘要/历战余响/奇珍琳琅/等级奖励/联动跃迁）、releaseDate?、releaseVersion?、image?、description?
- `RelicSet`：id、name、category（cavern 隧道遗器 / planar 位面饰品）、rarity（2-5★）、effect2（二件套效果，必填）、effect4?（四件套效果，位面饰品无）、releaseDate?、releaseVersion?、pieces?（部件列表：slot 为 head/hands/body/feet/sphere/rope）、image?、description?
- `NewsEvent`：id、type（version/character/lightcone/event/banner/eventEnd）、title、date、endDate?、version?、description?、relatedCharacterId?、relatedLightConeId?

命途 / 属性 / 事件类型 / 遗器类别与部位的展示名与主题色、实装版本列表等「分类元数据」在 [`src/lib/meta.ts`](src/lib/meta.ts) 中维护，与具体数据条目分离。

### 注意事项

- `id` 必须唯一（建议英文短横线命名，如 `seele`）；
- 日期一律使用 `YYYY-MM-DD` 格式；
- 需要清空本地数据时，可在浏览器 DevTools → Application → IndexedDB 中删除 `hsr-wiki` 数据库后刷新（应用会按种子重新初始化）。

## 目录结构

```
src/
├── data/seed.ts        # 种子数据（与页面代码分离，当前为空）
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

## 后续可扩展

- 将 `useLiveQuery` 查询替换为远程 API（数据层已与页面解耦，只需改 `src/hooks/useWikiData.ts`）
- 增加角色/光锥技能、关卡等更多图鉴模块
- 日历事件与卡池详情页联动
