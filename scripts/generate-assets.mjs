/**
 * 生成 PWA 位图图标与社交分享图（零新增依赖，复用 devDependencies 中的
 * Playwright Chromium 作为光栅化引擎）：
 *   public/icon-192.png / icon-512.png          —— any 用途（透明底）
 *   public/icon-maskable-192.png / -512.png     —— maskable 用途（实底 + 安全区）
 *   public/og.png（1200×630）                   —— og:image 分享预览
 * 用法：node scripts/generate-assets.mjs（改站点视觉后重跑即可）
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PUBLIC = new URL('../public/', import.meta.url);
/** fileURLToPath 保证 Windows 下 URL → 系统路径正确（URL.pathname 会带 /D:/ 前缀） */
const publicPath = (name) => fileURLToPath(new URL(name, PUBLIC));
const GOLD = '#e9b45f';
const BG = '#04060c';
const STAR_PATH = 'M12 1.5l2.5 8 8 2.5-8 2.5-2.5 8-2.5-8-8-2.5 8-2.5z';

const starSvg = (size, color = GOLD) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${STAR_PATH}" fill="${color}"/></svg>`;

/** 透明底 any 图标：星形居中，占画布约 78% */
function iconHtml(size) {
  const star = Math.round(size * 0.78);
  return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">${starSvg(star)}</div>`;
}

/** maskable 图标：实底铺满，星形缩至安全区（约占 52%） */
function maskableHtml(size) {
  const star = Math.round(size * 0.52);
  return `<div style="width:${size}px;height:${size}px;background:${BG};display:flex;align-items:center;justify-content:center">${starSvg(star)}</div>`;
}

/** og 分享图：深空底 + 金星 + 站名，低调科幻风 */
function ogHtml() {
  return `<div style="width:1200px;height:630px;position:relative;overflow:hidden;background:${BG};font-family:'Microsoft YaHei','PingFang SC',sans-serif">
    <div style="position:absolute;inset:0;background:
      radial-gradient(900px 520px at 14% -10%, rgba(233,180,95,0.10), transparent 60%),
      radial-gradient(760px 480px at 96% 112%, rgba(96,148,224,0.12), transparent 60%)"></div>
    <svg viewBox="0 0 400 400" width="560" height="560" style="position:absolute;right:-90px;top:35px;opacity:0.22">
      <circle cx="200" cy="200" r="150" fill="none" stroke="${GOLD}" stroke-opacity="0.5" stroke-dasharray="4 10"/>
      <circle cx="200" cy="200" r="108" fill="none" stroke="#7fb4f5" stroke-opacity="0.45"/>
      <circle cx="200" cy="200" r="70" fill="none" stroke="${GOLD}" stroke-opacity="0.35" stroke-dasharray="2 8"/>
      <path d="M200 128l17 47 47 17-47 17-17 47-17-47-47-17 47-17z" fill="${GOLD}" fill-opacity="0.55"/>
    </svg>
    <div style="position:absolute;left:96px;top:172px;max-width:760px">
      <div style="display:flex;align-items:center;gap:22px">
        ${starSvg(64)}
        <span style="font-size:22px;letter-spacing:0.5em;color:${GOLD};font-weight:600">HONKAI: STAR RAIL WIKI</span>
      </div>
      <h1 style="margin:34px 0 0;font-size:88px;line-height:1.15;font-weight:700;color:#f8fafc">星穹铁道资料站</h1>
      <p style="margin:30px 0 0;font-size:26px;line-height:1.7;color:#94a3b8">角色图鉴 · 光锥图鉴 · 遗器图鉴 · 命途×属性矩阵 · 资讯日历 · 卡池时间线</p>
    </div>
    <div style="position:absolute;left:96px;bottom:56px;width:180px;height:3px;background:linear-gradient(90deg,${GOLD},transparent)"></div>
  </div>`;
}

async function shot(page, html, width, height, out, transparent = false) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><meta charset="utf-8"><body style="margin:0;background:${transparent ? 'transparent' : BG}">${html}</body>`,
  );
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height }, omitBackground: transparent });
  console.log(`已生成 ${out}`);
}

mkdirSync(PUBLIC, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

await shot(page, iconHtml(192), 192, 192, publicPath('icon-192.png'), true);
await shot(page, iconHtml(512), 512, 512, publicPath('icon-512.png'), true);
await shot(page, maskableHtml(192), 192, 192, publicPath('icon-maskable-192.png'));
await shot(page, maskableHtml(512), 512, 512, publicPath('icon-maskable-512.png'));
await shot(page, ogHtml(), 1200, 630, publicPath('og.png'));

await browser.close();
