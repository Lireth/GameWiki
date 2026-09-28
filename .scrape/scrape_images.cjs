/**
 * 光锥 / 遗器图片资产化：把 light_cones_seed.json / relics_seed.json 的 image
 * 字段本地化为站内缩略图（public/cones/ 与 public/relics/，宽 400px，
 * 由 wiki 缩略服务生成），消除热链依赖并支持离线访问。
 * 文件名探测：Wiki 条目页均有与标题同名的立绘文件（File:<标题>.png），
 * 光锥额外回退「光锥-立绘-<标题>.png」；未命中者保留空 image 并汇总日志。
 * 用法：node .scrape/scrape_images.cjs && node .scrape/gen_seed_ts.cjs
 * 幂等：image 已是 /cones/、/relics/ 站内路径的条目跳过。
 */
const fs = require('fs');
const path = require('path');

const API = 'https://wiki.biligame.com/sr/api.php';
const ROOT = path.join(__dirname, '..');
const THUMB_WIDTH = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    } else if (res.status !== 567 && attempt === 5) {
      throw new Error(`HTTP ${res.status}`);
    }
    await sleep(attempt * 15000);
  }
  throw new Error(`重试耗尽: ${url}`);
}

/** 下载二进制（图片 CDN），失败返回 null */
async function download(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) hsr-wiki-fan-tool' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) throw new Error(`非图片响应: ${type}`);
      return { buffer: Buffer.from(await res.arrayBuffer()), type };
    } catch (e) {
      if (attempt === 3) {
        console.log(`  下载失败 …${url.slice(-36)}: ${e.message}`);
        return null;
      }
      await sleep(attempt * 10000);
    }
  }
  return null;
}

function extFromUrl(url, contentType) {
  const m = /\.(png|jpe?g|webp|gif)(?:$|\?)/i.exec(new URL(url).pathname);
  if (m) return m[1].toLowerCase();
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

/** File: 标题沿 normalization / redirects 链解析到最终页面标题 */
function makeTitleResolver(response) {
  const map = new Map([
    ...(response.query.normalized || []).map((n) => [n.from, n.to]),
    ...(response.query.redirects || []).map((n) => [n.from, n.to]),
  ]);
  return (title) => {
    let current = title;
    for (let hops = 0; hops < 5; hops++) {
      const next = map.get(current);
      if (!next) break;
      current = next;
    }
    return current;
  };
}

/**
 * 批量解析候选文件名的缩略图 URL：
 * entries: { id, title }；candidates: (title) => 文件名（不含 File: 前缀）。
 * 每轮候选一批 imageinfo（≤50 标题/请求），命中即从待解析列表移除。
 */
async function resolveThumbs(entries, candidates) {
  const resolved = new Map();
  let pending = [...entries];
  for (const candidate of candidates) {
    if (pending.length === 0) break;
    for (let i = 0; i < pending.length; i += 50) {
      const batch = pending.slice(i, i + 50);
      const titles = batch.map((e) => `File:${candidate(e.title)}`);
      const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=${THUMB_WIDTH}&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`;
      const r = await getJson(url);
      const resolveTitle = makeTitleResolver(r);
      const thumbByTitle = new Map();
      for (const page of Object.values(r.query.pages || {})) {
        const thumb = page.imageinfo?.[0]?.thumburl;
        if (thumb) thumbByTitle.set(page.title, thumb);
      }
      for (const e of batch) {
        const thumb = thumbByTitle.get(resolveTitle(`File:${candidate(e.title)}`));
        if (thumb) {
          resolved.set(e.id, { thumb, file: candidate(e.title) });
        }
      }
      process.stdout.write(`imageinfo ${Math.min(i + 50, pending.length)}/${pending.length}（${resolved.size} 命中）\n`);
      if (i + 50 < pending.length) await sleep(2500);
    }
    pending = pending.filter((e) => !resolved.has(e.id));
  }
  return { resolved, missing: pending.map((e) => e.id) };
}

async function processKind(kind, seedFile, dirName, candidates) {
  console.log(`\n=== ${kind} 图片本地化 ===`);
  const seedPath = path.join(__dirname, seedFile);
  const entries = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const outDir = path.join(ROOT, 'public', dirName);
  fs.mkdirSync(outDir, { recursive: true });

  const pending = entries
    .filter((e) => !e.image || !(e.image.startsWith(`/${dirName}/`)))
    .map((e) => ({ id: e.id, title: e.name || e.id }));
  const alreadyLocal = entries.length - pending.length;
  console.log(`待本地化 ${pending.length} 张（已本地化 ${alreadyLocal} 张）`);
  if (pending.length === 0) return;

  const { resolved, missing } = await resolveThumbs(pending, candidates);
  let done = 0;
  const failed = [];
  for (const [id, { thumb }] of resolved) {
    const result = await download(thumb);
    await sleep(700);
    if (!result) {
      failed.push(id);
      continue;
    }
    const ext = extFromUrl(thumb, result.type);
    fs.writeFileSync(path.join(outDir, `${id}.${ext}`), result.buffer);
    const record = entries.find((e) => e.id === id);
    record.image = `/${dirName}/${id}.${ext}`;
    done++;
    process.stdout.write(`\r已下载 ${done}/${resolved.size}`);
  }
  console.log();
  fs.writeFileSync(seedPath, JSON.stringify(entries, null, 2));
  console.log(
    `${kind}：本地化 ${done} 张，未找到图片文件 ${missing.length} 张${missing.length ? '：' + missing.join('、') : ''}，下载失败 ${failed.length} 张${failed.length ? '：' + failed.join('、') : ''}`,
  );
  if (missing.length || failed.length) process.exitCode = 1;
}

(async () => {
  await processKind('光锥', 'light_cones_seed.json', 'cones', [
    (title) => `${title}.png`,
    (title) => `光锥-立绘-${title}.png`,
  ]);
  await sleep(2500);
  await processKind('遗器', 'relics_seed.json', 'relics', [
    (title) => `${title}.png`,
  ]);
  console.log('\n完成。下一步：node .scrape/gen_seed_ts.cjs');
})().catch((e) => {
  console.error('图片本地化失败：', e.message);
  process.exit(1);
});
