/**
 * 从 characters_smw.json（SMW ask 抓取结果）生成角色种子数据。
 * 用法：node .scrape/gen_seed.cjs
 * 输出：.scrape/characters_seed.json（供后续写入 src/data/seed.ts）
 */
const fs = require('fs');

const TODAY = '2026-09-28';
const wiki = d => d.query.results;

const PATH_MAP = {
  毁灭: 'destruction', 巡猎: 'hunt', 智识: 'erudition', 同谐: 'harmony',
  虚无: 'nihility', 存护: 'preservation', 丰饶: 'abundance',
  记忆: 'remembrance', 欢愉: 'joviality',
};
const ELEMENT_MAP = {
  物理: 'physical', 火: 'fire', 冰: 'ice', 雷: 'lightning',
  风: 'wind', 量子: 'quantum', 虚数: 'imaginary',
};
const BODY_MAP = {
  成男: 'adultMale', 男青年: 'youngMale', 少年: 'teenBoy',
  成女: 'adultFemale', 女青年: 'youngFemale', 少女: 'teenGirl',
  幼女: 'littleGirl', 星: 'star',
};
const GENDER_MAP = { 男: 'male', 女: 'female' };

function parseDate(s) {
  const m = /(\d{4})年(\d{2})月(\d{2})日/.exec(s || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 清理简介：换行、去 HTML 标签、压缩空白 */
function cleanDescription(s) {
  return (s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** 从页面图片列表中挑选头像文件（wiki 头像命名：角色名竖版头像.png） */
function pickAvatarFile(title, p, images) {
  const names = images.map(f => f.title.replace(/^文件:/, ''));
  const base = (p['本体名'] || [])[0] || (p['名称'] || [])[0] || title;
  const candidates = [
    `${title}竖版头像.png`,
    `${title}.png`,
    `${base}竖版头像.png`,
    `${base}.png`,
    `${base}头像.png`,
  ];
  for (const c of candidates) if (names.includes(c)) return c;
  // 兜底：名称开头且含「头像」的文件
  return (
    names.find(n => n.startsWith(title) && n.includes('头像')) ||
    names.find(n => n.startsWith(base) && n.includes('头像')) ||
    null
  );
}

async function fetchImages(titles) {
  // 分批（每批 10 个标题）+ 处理 continue，拉取各页面完整图片列表
  const map = {};
  for (let i = 0; i < titles.length; i += 10) {
    const batch = titles.slice(i, i + 10);
    let cont = {};
    for (;;) {
      const qs = new URLSearchParams({
        action: 'query', format: 'json', imlimit: '500', prop: 'images',
        titles: batch.join('|'), ...cont,
      });
      const res = await fetch('https://wiki.biligame.com/sr/api.php?' + qs).then(r => r.json());
      for (const page of Object.values(res.query.pages)) {
        if (page.images) {
          map[page.title] = (map[page.title] || []).concat(page.images);
        }
      }
      if (!res.continue) break;
      cont = { imcontinue: res.continue.imcontinue, continue: res.continue['continue'] };
    }
    process.stdout.write(`images ${Math.min(i + 10, titles.length)}/${titles.length}\r`);
  }
  console.log('');
  return map;
}

async function main() {
  const smw = JSON.parse(fs.readFileSync(__dirname + '/characters_smw.json', 'utf8'));
  const results = wiki(smw);

  const records = [];
  const skipped = [];
  for (const [title, v] of Object.entries(results)) {
    const p = v.printouts;
    const releaseDate = parseDate((p['实装日期'] || [])[0]);
    const releaseVersion = (p['实装版本'] || [])[0];
    if (!releaseDate || releaseDate > TODAY) {
      skipped.push(`${title}（未实装 / 未来日期）`);
      continue;
    }
    const path = PATH_MAP[(p['命途'] || [])[0]];
    const element = ELEMENT_MAP[(p['元素属性'] || [])[0]];
    const genderRaw = (p['性别'] || []).filter(g => GENDER_MAP[g]);
    const bodyRaw = (p['体型'] || []).filter(b => BODY_MAP[b]);
    if (!path || !element) {
      skipped.push(`${title}（命途/属性缺失）`);
      continue;
    }
    records.push({
      title,
      p,
      releaseDate,
      releaseVersion,
      path,
      element,
      gender: GENDER_MAP[genderRaw[0] || '男'],
      bodyType: bodyRaw.includes('星') ? 'star' : BODY_MAP[bodyRaw[0]] || null,
    });
  }
  console.log('有效角色:', records.length, '| 跳过:', skipped.join('；'));

  // 拉取头像候选
  const imageMap = await fetchImages(records.map(r => r.title));

  const characters = records.map(r => {
    const { title, p } = r;
    const base = (p['本体名'] || [])[0];
    const en = (p['外文名'] || [])[0];
    const faction = (p['阵营'] || [])[0] || '';
    const camp = (p['派系'] || []).filter(s => s !== faction)[0] || faction;
    const aliases = [...new Set([base, ...(p['名称'] || []), en].filter(Boolean))]
      .filter(a => a !== title);
    const file = pickAvatarFile(title, p, imageMap[title] || []);
    if (!r.bodyType) console.log('注意：', title, '缺体型，回退 youngFemale');
    return {
      id: title,
      name: title,
      rarity: (p['稀有度'] || [])[0] === '4星' ? 4 : 5,
      path: r.path,
      element: r.element,
      faction,
      camp,
      gender: r.gender,
      bodyType: r.bodyType || 'youngFemale',
      releaseDate: r.releaseDate,
      releaseVersion: r.releaseVersion,
      aliases: aliases.length ? aliases : undefined,
      avatar: file
        ? `https://wiki.biligame.com/sr/特殊:FilePath/${encodeURIComponent(file)}`
        : undefined,
      description: cleanDescription((p['介绍'] || [])[0]) || undefined,
    };
  });

  // 按实装日期、名称排序，便于阅读与 diff
  characters.sort(
    (a, b) =>
      a.releaseDate.localeCompare(b.releaseDate) ||
      a.releaseVersion.localeCompare(b.releaseVersion, undefined, { numeric: true }) ||
      a.name.localeCompare(b.name, 'zh'),
  );

  fs.writeFileSync(
    __dirname + '/characters_seed.json',
    JSON.stringify(characters, null, 2),
  );
  console.log('已写出 characters_seed.json，共', characters.length, '条');
  const noAvatar = characters.filter(c => !c.avatar).map(c => c.name);
  if (noAvatar.length) console.log('无头像:', noAvatar.join('、'));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
