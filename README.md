# 星穹铁道资料站 · Honkai: Star Rail Wiki

一个《崩坏：星穹铁道》游戏资料 Wiki 站点，深色科幻风格，支持桌面端与移动端。

## 技术栈

- **React 19 + TypeScript + Vite 7**：前端框架与构建工具
- **Tailwind CSS 4**：样式（CSS-first 配置，主题见 `src/index.css`）
- **React Router 7**：路由
- **Dexie 4（IndexedDB）**：本地数据存储，配合 `dexie-react-hooks` 实时响应数据变化
- **@fontsource/rajdhani**：本地打包的英文/数字展示字体（中文回退系统字体）

## 页面结构

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | Hero、数据概览、功能入口、站点说明 |
| `/characters` | 角色图鉴 | 搜索 + 稀有度/命途/属性/体型/实装版本筛选 + 排序，状态同步到 URL |
| `/characters/:id` | 角色详情 | 全部字段 + 简介 |
| `/light-cones` | 光锥图鉴 | 搜索 + 稀有度/命途筛选 + 排序 |
| `/light-cones/:id` | 光锥详情 | 全部字段 + 描述 |
| `/matrix` | 命途 × 属性矩阵 | 横轴命途、纵轴战斗属性；桌面端为完整二维矩阵（可横向滚动），移动端按属性分组堆叠展示；单元格内按实装日期从新到旧排列 |
| `/news` | 资讯日历 | 年月日历视图，支持月份切换、类型筛选（版本/角色/光锥/活动/卡池/活动结束）、本月事件列表 |
| `*` | 404 | — |

## 快速开始

```bash
npm install
npm run dev      # 开发：http://localhost:5173
npm run build    # 类型检查 + 生产构建（输出 dist/）
npm run preview  # 预览生产构建
```

## 如何录入数据

**页面代码不包含任何游戏数据**，全部数据存放在浏览器 IndexedDB 中，并通过种子文件录入：

1. 打开 [`src/data/seed.ts`](src/data/seed.ts)，往 `characterSeed` / `lightConeSeed` / `newsEventSeed` 数组中添加条目（文件内有带注释的示例）；
2. 启动应用后，`src/db/bootstrap.ts` 会在对应表为空时自动写入种子数据；
3. 页面通过 `dexie-react-hooks` 的 `useLiveQuery` 实时读取，无需刷新即可看到新数据。

字段与类型定义见 [`src/db/types.ts`](src/db/types.ts)：

- `Character`：id、name、rarity（4/5）、path（命途）、element（战斗属性）、faction（派系）、camp（阵营）、gender、bodyType（体型：成男/男青年/少年/成女/女青年/少女/幼女）、releaseDate（YYYY-MM-DD）、releaseVersion、avatar?、description?
- `LightCone`：id、name、rarity、path、releaseDate?、releaseVersion?、image?、description?
- `NewsEvent`：id、type（version/character/lightcone/event/banner/eventEnd）、title、date、endDate?、version?、description?、relatedCharacterId?、relatedLightConeId?

命途 / 属性 / 事件类型的展示名与主题色、实装版本列表等「分类元数据」在 [`src/lib/meta.ts`](src/lib/meta.ts) 中维护，与具体数据条目分离。

### 注意事项

- `id` 必须唯一（建议英文短横线命名，如 `seele`）；
- 日期一律使用 `YYYY-MM-DD` 格式；
- 需要清空本地数据时，可在浏览器 DevTools → Application → IndexedDB 中删除 `hsr-wiki` 数据库后刷新。

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
- 增加角色/光锥技能、遗器、关卡等更多图鉴模块
- 日历事件与卡池详情页联动
