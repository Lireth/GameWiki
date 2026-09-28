/**
 * 抓取角色 SMW 原始数据到 characters_smw.json（gen_seed.cjs 的输入）。
 * 用法：node .scrape/scrape_characters.cjs
 * 数据源：bilibili 星穹铁道 Wiki（api.php SMW ask，分类「角色」）；
 * 输出为 SMW 原始响应，字段口径与历史 characters_smw.json 一致，
 * 未实装角色由 gen_seed.cjs 按抓取日期过滤。
 * 请求策略：遇 HTTP 567（B 站 WAF 拦截页）按 15s/30s/60s/120s 退避重试。
 */
const fs = require('fs');
const path = require('path');

const API = 'https://wiki.biligame.com/sr/api.php';
const OUT = path.join(__dirname, 'characters_smw.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERY =
  '[[分类:角色]]|?名称|?本体名|?外文名|?称号|?稀有度|?命途|?元素属性|?阵营|?派系|?性别|?体型|?实装日期|?实装版本|?限定|?介绍|limit=500';

async function main() {
  const url = `${API}?action=ask&format=json&query=${encodeURIComponent(QUERY)}`;
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
      if (text.startsWith('{')) {
        const json = JSON.parse(text);
        if (json.error) throw new Error(`SMW 错误: ${json.error.info}`);
        const count = Object.keys(json.query.results).length;
        // limit=500 无 continuation：达到上限说明仍有角色被静默截断
        if (count >= 500) {
          throw new Error(
            `SMW 结果 ${count} 条达 limit=500 上限，可能被静默截断，请分页抓取或提高 limit`,
          );
        }
        fs.writeFileSync(OUT, JSON.stringify(json, null, 2));
        console.log(`characters_smw.json 已更新：${count} 个角色条目`);
        return;
      }
      // WAF 拦截页返回 200 + HTML 的情况
    } else if (res.status !== 567 && attempt === 5) {
      throw new Error(`HTTP ${res.status}`);
    }
    await sleep(attempt * 15000);
  }
  throw new Error('重试耗尽');
}

main().catch((e) => {
  console.error('角色抓取失败：', e.message);
  process.exit(1);
});
