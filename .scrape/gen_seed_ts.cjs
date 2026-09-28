/**
 * 把 .scrape/ 下的种子 JSON 合成 src/data/seed.ts（生成文件，勿手改；
 * 数据修订请改 JSON 或抓取脚本后重新运行）。
 * 用法：node .scrape/gen_seed_ts.cjs
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'data', 'seed.ts');

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
}

/** JSON 值 → TS 字面量（键均为合法标识符，不加引号；undefined 字段跳过） */
function toTsLiteral(value, indent) {
  const pad = ' '.repeat(indent);
  if (value === null) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(
      (item) => `${pad}  ${toTsLiteral(item, indent + 2)},\n`,
    );
    return `[\n${items.join('')}${pad}]`;
  }
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${pad}  ${k}: ${toTsLiteral(v, indent + 2)},\n`);
  return `{\n${entries.join('')}${pad}}`;
}

function arrayBlock(name, type, items, comment) {
  const body = items.map((item) => `  ${toTsLiteral(item, 2)},\n`).join('');
  return `/** ${comment} */\nexport const ${name}: ${type}[] = [\n${body}];\n`;
}

const characters = load('characters_seed.json');
const lightCones = load('light_cones_seed.json');
const relics = load('relics_seed.json');
const news = load('news_seed.json');

const counts = `角色 ${characters.length} · 光锥 ${lightCones.length} · 遗器 ${relics.length} · 资讯 ${news.length}`;
const today = new Date().toISOString().slice(0, 10);

const file = `import type { Character, LightCone, NewsEvent, RelicSet } from '../db/types';

/**
 * ============================================================
 *  种子数据文件（由 .scrape 脚本生成，勿直接手改）
 * ============================================================
 *  生成方式：node .scrape/scrape_wiki.cjs && node .scrape/gen_seed_ts.cjs
 *  当前规模：${counts}（抓取日期 ${today}，仅含已实装内容）。
 *  页面不写死任何游戏数据，所有数据从这里录入 IndexedDB；
 *  字段与类型说明见 README.md 和 src/db/types.ts。
 *  种子内容变化由启动时的内容指纹自动检测，在「数据管理」中删除过的
 *  条目有删除墓碑保护，不会被种子更新复活。
 */

${arrayBlock('characterSeed', 'Character', characters, '角色种子数据 —— 抓取自 biligame 星穹铁道 Wiki「角色图鉴」（SMW 数据）。')}
${arrayBlock('lightConeSeed', 'LightCone', lightCones, '光锥种子数据 —— 抓取自 Wiki「光锥图鉴」；获取方式为多值字段，此处取首个（初始获取方式）。')}
${arrayBlock('relicSeed', 'RelicSet', relics, '遗器套装种子数据 —— 抓取自 Wiki「遗器图鉴」，效果文本已去除富文本标记。')}
${arrayBlock('newsEventSeed', 'NewsEvent', news, '资讯事件种子数据 —— 版本/角色/光锥实装由种子数据派生，卡池抓取自 Wiki；版本上线日以该版本最早实装日期近似。')}
`;

fs.writeFileSync(OUT, file, 'utf8');
console.log(`已写出 src/data/seed.ts（${counts}）`);
