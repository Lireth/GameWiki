/**
 * 从 biligame 星穹铁道 Wiki 抓取光锥 / 遗器 / 卡池与版本数据，
 * 并结合 characters_seed.json 派生资讯事件，产出种子 JSON：
 *   .scrape/light_cones_seed.json / relics_seed.json / news_seed.json
 * 用法：node .scrape/scrape_wiki.cjs [all|news]
 *   all（默认）= 抓光锥 + 遗器 + 资讯；news = 仅重新派生资讯事件（含卡池，不重抓光锥/遗器）。
 *
 * 请求策略：整分类单查询大 limit 一次取回（每类 1-2 个请求）；
 * 请求间隔 2.5s；遇 HTTP 567（B 站 WAF 拦截页）按 15s/30s/60s/120s 退避重试。
 * 抓取后请运行 node .scrape/gen_seed_ts.cjs 重新生成 src/data/seed.ts。
 */
const fs = require('fs');
const path = require('path');

/** 抓取日（UTC 日期，略保守：只排除开始时间晚于今天的未开卡池） */
const TODAY = new Date().toISOString().slice(0, 10);
const API = 'https://wiki.biligame.com/sr/api.php';
const OUT = __dirname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PATH_MAP = {
  毁灭: 'destruction', 巡猎: 'hunt', 智识: 'erudition', 同谐: 'harmony',
  虚无: 'nihility', 存护: 'preservation', 丰饶: 'abundance',
  记忆: 'remembrance', 欢愉: 'joviality',
};
const ACQ_MAP = {
  跃迁: 'warp', 限定跃迁: 'limitedWarp', 活动: 'event', 任务: 'quest',
  探索: 'exploration', 无名勋礼: 'namelessHonor', 商店兑换: 'shopExchange',
  世界商店: 'worldShop', 模拟宇宙: 'simUniverseShop', 行动摘要: 'actionSummary',
  历战余响: 'echoOfWar', 奇珍琳琅: 'treasure', 等级奖励: 'levelReward',
  联动跃迁: 'collabWarp',
};
const RELIC_CATEGORY_MAP = { 隧洞遗器: 'cavern', 隧道遗器: 'cavern', 位面饰品: 'planar' };
const SLOT_MAP = { 头部: 'head', 手部: 'hands', 身体: 'body', 脚部: 'feet', 位面球: 'sphere', 连结绳: 'rope' };

/** 单个 JSON 请求：WAF 拦截（HTTP 567）时指数退避重试 */
async function getJson(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        },
      });
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(attempt * 15000);
      continue;
    }
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith('{')) return JSON.parse(text);
      // WAF 拦截页返回 200 + HTML 的情况
    } else if (res.status !== 567 && attempt === 5) {
      throw new Error(`HTTP ${res.status}: ${url}`);
    }
    await sleep(attempt * 15000);
  }
  throw new Error(`重试耗尽: ${url}`);
}

async function ask(query) {
  const url = `${API}?action=ask&format=json&query=${encodeURIComponent(query)}`;
  const r = await getJson(url);
  if (r.error) throw new Error(`SMW 错误: ${r.error.info}`);
  return r.query.results || {};
}

/** 依次尝试多个分类名，返回首个命中的（分类名, 结果） */
async function askCategory(candidates, props) {
  for (const category of candidates) {
    const query = `[[分类:${category}]]|${props}|limit=500`;
    try {
      const results = await ask(query);
      if (Object.keys(results).length > 0) return { category, results };
      process.stdout.write(`分类「${category}」为空，`);
    } catch (e) {
      console.log(`分类「${category}」查询失败：${e.message}`);
    }
    await sleep(2500);
  }
  return null;
}

function parseDate(s) {
  const m = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(s || '');
  if (!m) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
}

/** 清理富文本：去 HTML 标签、还原常见实体、压缩空白 */
function stripHtml(s) {
  return (s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseRarity(values) {
  const m = /(\d)\s*星/.exec((values || [])[0] || '');
  return m ? Number(m[1]) : null;
}

function firstText(printouts, names) {
  for (const name of names) {
    const raw = (printouts[name] || [])[0];
    if (raw === undefined || raw === '') continue;
    const text = typeof raw === 'object' && raw !== null ? raw.fulltext || String(raw) : String(raw);
    if (text.trim()) return text.trim();
  }
  return undefined;
}

/* ---------------- 光锥 ---------------- */

async function scrapeLightCones() {
  console.log('抓取光锥分类…');
  const results = await ask(
    '[[分类:光锥]]|?名称|?本体名|?外文名|?稀有度|?命途|?实装日期|?实装版本|?获取方式|?技能|?技能描述|?效果|?描述|?介绍|limit=500',
  );
  // 保留已本地化的站内图片路径（scrape_images.cjs 的成果），重抓按 id 回填
  const localImages = new Map(
    loadJson('light_cones_seed.json')
      .filter((c) => c.image && c.image.startsWith('/cones/'))
      .map((c) => [c.id, c.image]),
  );
  const seed = [];
  const skipped = [];
  const unmappedAcq = new Set();
  for (const [title, v] of Object.entries(results)) {
    const p = v.printouts || {};
    const releaseDate = parseDate((p['实装日期'] || [])[0]);
    const releaseVersion = (p['实装版本'] || [])[0];
    if (!releaseDate || releaseDate > TODAY) {
      skipped.push(`${title}（未实装 / 缺日期）`);
      continue;
    }
    const path = PATH_MAP[(p['命途'] || [])[0]];
    const rarity = parseRarity(p['稀有度']);
    if (!path || !rarity) {
      skipped.push(`${title}（命途/稀有度缺失）`);
      continue;
    }
    // 获取方式为多值；schema 为单值枚举，取首个（初始获取方式）并记录无法映射的取值
    const acquisition = (p['获取方式'] || [])
      .map((a) => {
        const text = typeof a === 'object' && a !== null ? a.fulltext || '' : String(a);
        if (ACQ_MAP[text]) return ACQ_MAP[text];
        const prefix = Object.keys(ACQ_MAP).find((k) => text.startsWith(k));
        if (prefix) {
          unmappedAcq.add(text);
          return ACQ_MAP[prefix];
        }
        unmappedAcq.add(text);
        return undefined;
      })
      .find(Boolean);
    const name = firstText(p, ['名称']) || title;
    const aliases = [...new Set([
      ...(p['本体名'] || []),
      ...(p['外文名'] || []),
      ...(p['名称'] || []),
    ].map(String).filter(Boolean))].filter((a) => a !== title && a !== name);
    seed.push({
      id: title,
      name,
      rarity,
      path,
      acquisition,
      releaseDate,
      releaseVersion,
      ...(localImages.has(title) ? { image: localImages.get(title) } : {}),
      aliases: aliases.length ? aliases : undefined,
      description: firstText(p, ['技能', '技能描述', '效果', '描述', '介绍'])
        ? stripHtml(firstText(p, ['技能', '技能描述', '效果', '描述', '介绍']))
        : undefined,
    });
  }
  seed.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.name.localeCompare(b.name, 'zh'));
  fs.writeFileSync(path.join(OUT, 'light_cones_seed.json'), JSON.stringify(seed, null, 2));
  console.log(`光锥：${seed.length} 条，跳过 ${skipped.length} 条${skipped.length ? '：' + skipped.join('；') : ''}`);
  if (unmappedAcq.size) console.log('未精确映射的获取方式取值：', [...unmappedAcq].join('、'));
}

/* ---------------- 遗器 ---------------- */

async function scrapeRelics() {
  console.log('抓取遗器分类…');
  const found = await askCategory(
    ['遗器', '遗器套装', '套装'],
    '?稀有度|?星级|?品质|?类别|?二件套效果|?二件套|?两件套效果|?四件套效果|?实装日期|?实装版本|?头部|?手部|?身体|?脚部|?位面球|?连结绳|?介绍|?描述',
  );
  if (!found) {
    console.log('未找到遗器分类，跳过');
    return;
  }
  console.log(`命中分类「${found.category}」`);
  // 保留已本地化的站内图片路径（scrape_images.cjs 的成果），重抓按 id 回填
  const localImages = new Map(
    loadJson('relics_seed.json')
      .filter((r) => r.image && r.image.startsWith('/relics/'))
      .map((r) => [r.id, r.image]),
  );
  const seed = [];
  const skipped = [];
  const noRarity = [];
  for (const [title, v] of Object.entries(found.results)) {
    const p = v.printouts || {};
    const category = RELIC_CATEGORY_MAP[(p['类别'] || [])[0]];
    const effect2 = stripHtml(firstText(p, ['二件套效果', '二件套', '两件套效果']));
    if (!category || !effect2) {
      skipped.push(`${title}（类别/二件套效果缺失）`);
      continue;
    }
    let rarity = parseRarity(p['稀有度'] ?? p['星级'] ?? p['品质']);
    if (!rarity) {
      rarity = 5;
      noRarity.push(title);
    }
    const releaseDate = parseDate((p['实装日期'] || [])[0]);
    const pieces = Object.entries(SLOT_MAP)
      .map(([label, slot]) => ({ slot, name: firstText(p, [label]) }))
      .filter((piece) => piece.name)
      .map((piece) => ({ slot: piece.slot, name: piece.name }));
    const isPlanar = category === 'planar';
    const effect4 = isPlanar ? undefined : stripHtml(firstText(p, ['四件套效果']));
    seed.push({
      id: title,
      name: firstText(p, ['名称']) || title,
      category,
      rarity,
      effect2,
      effect4: effect4 || undefined,
      releaseDate: releaseDate || undefined,
      releaseVersion: (p['实装版本'] || [])[0] || undefined,
      ...(localImages.has(title) ? { image: localImages.get(title) } : {}),
      pieces: pieces.length > 0 ? pieces : undefined,
      description: firstText(p, ['介绍', '描述'])
        ? stripHtml(firstText(p, ['介绍', '描述']))
        : undefined,
    });
  }
  seed.sort((a, b) => a.id.localeCompare(b.id, 'zh'));
  fs.writeFileSync(path.join(OUT, 'relics_seed.json'), JSON.stringify(seed, null, 2));
  console.log(`遗器：${seed.length} 条，跳过 ${skipped.length} 条${skipped.length ? '：' + skipped.join('；') : ''}`);
  if (noRarity.length) console.log(`稀有度缺失按 5★ 处理（${noRarity.length} 条）：${noRarity.join('、')}`);
}

/* ---------------- 资讯事件 ---------------- */

function loadJson(file) {
  const p = path.join(OUT, file);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

/** 跃迁卡池历史页：每页含一个大版本的若干小版本章节，模板记录每期卡池 */
const BANNER_PAGES = ['跃迁/1.0', '跃迁/2.0', '跃迁/3.0', '跃迁/4.0'];

/** 2024/01/17 12:00 → 2024-01-17（卡池时段只需日期粒度） */
function parseSlashDate(s) {
  const m = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(s || '');
  if (!m) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
}

/** 解析 wikitext 中的 {{跃迁/角色活动跃迁|…}} / {{跃迁/光锥活动跃迁|…}} 模板参数 */
function parseBannerTemplates(wikitext) {
  const out = [];
  const clean = wikitext.replace(/<!--[\s\S]*?-->/g, '');
  const re = /\{\{跃迁\/(角色活动跃迁|光锥活动跃迁)\s*\|([^{}]*)\}\}/g;
  for (const m of clean.matchAll(re)) {
    const params = {};
    for (const part of m[2].split('|')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
    out.push({ kind: m[1], params });
  }
  return out;
}

/**
 * 抓取卡池历史：SMW 无卡池分类（旧方案查不到数据），改为解析
 * 「跃迁/1.0 ~ 4.0」页面的角色/光锥活动跃迁模板。
 * 每期常规卡池一个 UP；4.x「铭心之萃」（卡池类型=3）一期多 UP，
 * 按顿号拆分逐个建事件便于跳转；并发多卡池以「卡池编号」区分，
 * 复刻卡池与首发同样入库，供时间线完整回溯。
 * 开始时间晚于 TODAY 的未开卡池跳过。
 */
async function scrapeBanners(characterIndex, coneIndex) {
  console.log('抓取卡池历史（跃迁/1.0 ~ 4.0 模板）…');
  const events = [];
  const seen = new Set();
  const unmapped = new Set();
  const splitUps = (s) =>
    // 仅按顿号拆分多 UP；UP 名本身可能含全角逗号（如「片刻，留在眼底」），不能一并拆
    (s || '')
      .split(/、/)
      .map((x) => x.trim())
      .filter(Boolean);
  for (const page of BANNER_PAGES) {
    await sleep(2500);
    const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
    const r = await getJson(url);
    if (r.error) throw new Error(`解析 ${page} 失败: ${r.error.info}`);
    for (const { kind, params } of parseBannerTemplates(r.parse.wikitext)) {
      const date = parseSlashDate(params['开始时间']);
      if (!date || date > TODAY) continue;
      const endDate = parseSlashDate(params['结束时间']) || undefined;
      const version = params['版本'] || undefined;
      const slot = `${version || 'x'}-${params['编号'] || 'x'}-${params['卡池编号'] || 'x'}`;
      if (kind === '角色活动跃迁') {
        const ups = splitUps(params['5星角色']);
        for (const up of ups) {
          const relatedCharacterId = characterIndex.get(up);
          if (!relatedCharacterId) {
            unmapped.add(`角色「${up}」`);
            continue;
          }
          const id = `ev-banner-c-${slot}-${up}`;
          if (seen.has(id)) continue;
          seen.add(id);
          events.push({
            id,
            type: 'banner',
            title: ups.length > 1 ? `${params['名称'] || '角色活动跃迁'} · ${up}` : params['名称'] || `角色活动跃迁 · ${up}`,
            date,
            endDate,
            version,
            relatedCharacterId,
          });
        }
      } else {
        for (const upCone of splitUps(params['5星光锥'])) {
          const relatedLightConeId = coneIndex.get(upCone);
          if (!relatedLightConeId) {
            unmapped.add(`光锥「${upCone}」`);
            continue;
          }
          const id = `ev-banner-lc-${slot}-${upCone}`;
          if (seen.has(id)) continue;
          seen.add(id);
          events.push({
            id,
            type: 'banner',
            title: `光锥活动跃迁 · ${upCone}`,
            date,
            endDate,
            version,
            relatedLightConeId,
          });
        }
      }
    }
  }
  if (unmapped.size) {
    console.log(`未能关联到种子数据的 UP（已跳过该期）：${[...unmapped].join('、')}`);
  }
  return events;
}

async function scrapeNews() {
  console.log('派生资讯事件…');
  const characters = loadJson('characters_seed.json');
  const cones = loadJson('light_cones_seed.json');

  const events = [];

  // 名称索引：本名两遍优先，别名不覆盖已有关键字（避免「银狼LV.999」的
  // 别名「银狼」抢走本体的映射）
  const characterIndex = new Map();
  for (const c of characters) characterIndex.set(c.name, c.id);
  for (const c of characters) {
    for (const alias of c.aliases || []) {
      if (!characterIndex.has(alias)) characterIndex.set(alias, c.id);
    }
  }
  const coneIndex = new Map();
  for (const lc of cones) coneIndex.set(lc.name, lc.id);
  for (const lc of cones) {
    for (const alias of lc.aliases || []) {
      if (!coneIndex.has(alias)) coneIndex.set(alias, lc.id);
    }
  }

  // 版本更新：以该版本最早实装日期近似版本上线日（Wiki 无版本结构化数据时）
  const versionDates = new Map();
  for (const c of [...characters, ...cones]) {
    const v = c.releaseVersion;
    if (!v || !c.releaseDate) continue;
    const prev = versionDates.get(v);
    if (!prev || c.releaseDate < prev) versionDates.set(v, c.releaseDate);
  }

  let banners = [];
  try {
    await sleep(2500);
    banners = await scrapeBanners(characterIndex, coneIndex);
  } catch (e) {
    console.log(`卡池抓取失败（资讯事件不含卡池）：${e.message}`);
  }

  for (const [v, date] of versionDates) {
    events.push({ id: `ev-version-${v}`, type: 'version', title: `v${v} 版本更新`, date, version: v });
  }
  for (const c of characters) {
    events.push({
      id: `ev-char-${c.id}`,
      type: 'character',
      title: `${c.name} 实装`,
      date: c.releaseDate,
      version: c.releaseVersion,
      relatedCharacterId: c.id,
    });
  }
  for (const lc of cones) {
    events.push({
      id: `ev-cone-${lc.id}`,
      type: 'lightcone',
      title: `${lc.name} 实装`,
      date: lc.releaseDate,
      version: lc.releaseVersion,
      relatedLightConeId: lc.id,
    });
  }
  events.push(...banners);

  // 结束日期早于开始日期的脏数据直接丢弃日期（recordValidation 会拒绝）
  for (const e of events) {
    if (e.endDate && e.endDate < e.date) delete e.endDate;
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(OUT, 'news_seed.json'), JSON.stringify(events, null, 2));
  const byType = events.reduce((acc, e) => ({ ...acc, [e.type]: (acc[e.type] || 0) + 1 }), {});
  console.log(`资讯事件：${events.length} 条（${JSON.stringify(byType)}）`);
}

(async () => {
  const mode = process.argv[2] || 'all';
  if (mode === 'news') {
    // 仅重新派生资讯事件（含卡池抓取），不重抓光锥 / 遗器
    await scrapeNews();
    console.log('完成。下一步：node .scrape/gen_seed_ts.cjs');
    return;
  }
  await scrapeLightCones();
  await sleep(2500);
  await scrapeRelics();
  await sleep(2500);
  await scrapeNews();
  console.log('完成。下一步：node .scrape/gen_seed_ts.cjs');
})().catch((e) => {
  console.error('抓取失败：', e.message);
  process.exit(1);
});
