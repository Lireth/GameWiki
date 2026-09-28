/**
 * 角色头像资产化：把 characters_seed.json 中热链 wiki 的头像
 * 下载为本地缩略图（public/avatars/<id>.<ext>，宽 320px，由 wiki 缩略服务生成），
 * 并把 avatar 字段改写为站内路径 —— 消除第三方热链依赖，头像随站点
 * 部署与 Service Worker 缓存，离线可用。
 * 用法：node .scrape/scrape_avatars.cjs && node .scrape/gen_seed_ts.cjs
 * 幂等：已是 /avatars/ 站内路径的条目跳过；单张失败保留原 URL 并汇总提示。
 */
const fs = require('fs');
const path = require('path');

const API = 'https://wiki.biligame.com/sr/api.php';
const AVATAR_DIR = path.join(__dirname, '..', 'public', 'avatars');
const SEED_JSON = path.join(__dirname, 'characters_seed.json');
const THUMB_WIDTH = 320;
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

/** 下载二进制（缩略图为 wiki 图片 CDN，通常不受 api.php 的 WAF 影响），失败返回 null */
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
        console.log(`  下载失败 ${url.slice(-40)}: ${e.message}`);
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

async function main() {
  const characters = JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
  fs.mkdirSync(AVATAR_DIR, { recursive: true });

  // 收集仍为 wiki 热链的条目：id → 原始文件名（特殊:FilePath/<encoded>）
  const pending = new Map();
  for (const c of characters) {
    if (!c.avatar || c.avatar.startsWith('/avatars/')) continue;
    const marker = '特殊:FilePath/';
    const idx = c.avatar.indexOf(marker);
    if (idx === -1) {
      console.log(`跳过（非 wiki 热链，保持原样）：${c.id}`);
      continue;
    }
    pending.set(c.id, decodeURIComponent(c.avatar.slice(idx + marker.length)));
  }
  console.log(`待本地化头像：${pending.size} 张`);
  if (pending.size === 0) return;

  // imageinfo 批量解析缩略图 URL（每批 50 个标题）
  const ids = [...pending.keys()];
  const thumbUrls = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const batchIds = ids.slice(i, i + 50);
    const titles = batchIds
      .map((id) => `File:${pending.get(id)}`)
      .join('|');
    const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=${THUMB_WIDTH}&redirects=1&titles=${encodeURIComponent(titles)}`;
    const r = await getJson(url);
    // 解析 normalization 与 redirects 链：File:X →（规范化）文件:X →（重定向）目标页。
    // 部分头像文件是重定向页（如「三月七•存护竖版头像.png」→「三月七竖版头像.png」），
    // 开启 redirects=1 后响应页标题是重定向目标，需沿链解析后匹配。
    const normalizedMap = new Map(
      (r.query.normalized || []).map((n) => [n.from, n.to]),
    );
    const redirectMap = new Map(
      (r.query.redirects || []).map((n) => [n.from, n.to]),
    );
    const resolveTitle = (title) => {
      let current = title;
      for (let hops = 0; hops < 5; hops++) {
        const next = normalizedMap.get(current) ?? redirectMap.get(current);
        if (!next) break;
        current = next;
      }
      return current;
    };
    const thumbByTitle = new Map();
    for (const page of Object.values(r.query.pages || {})) {
      const thumb = page.imageinfo?.[0]?.thumburl;
      if (thumb) thumbByTitle.set(page.title, thumb);
    }
    for (const id of batchIds) {
      const thumb = thumbByTitle.get(resolveTitle(`File:${pending.get(id)}`));
      if (thumb) thumbUrls.set(id, thumb);
    }
    console.log(`imageinfo ${Math.min(i + 50, ids.length)}/${ids.length}`);
    if (i + 50 < ids.length) await sleep(2500);
  }

  // 逐张下载（ pacing 0.8s），写 public/avatars/<id>.<ext> 并改写 seed JSON
  let done = 0;
  const failed = [];
  for (const [id, file] of pending) {
    const thumb = thumbUrls.get(id);
    if (!thumb) {
      failed.push(`${id}（无缩略图 URL）`);
      continue;
    }
    const result = await download(thumb);
    await sleep(800);
    if (!result) {
      failed.push(id);
      continue;
    }
    const ext = extFromUrl(thumb, result.type);
    const localPath = `/avatars/${id}.${ext}`;
    fs.writeFileSync(path.join(AVATAR_DIR, `${id}.${ext}`), result.buffer);
    const record = characters.find((c) => c.id === id);
    record.avatar = localPath;
    done++;
    process.stdout.write(`\r已下载 ${done}/${pending.size}`);
  }
  console.log();

  fs.writeFileSync(SEED_JSON, JSON.stringify(characters, null, 2));
  console.log(`完成：本地化 ${done} 张，失败 ${failed.length} 张${failed.length ? '：' + failed.join('、') : ''}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error('头像本地化失败：', e.message);
  process.exit(1);
});
