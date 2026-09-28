/**
 * 构建产物包体预算检查（零依赖）：对 dist/assets 下各 JS 分包计算 gzip 体积，
 * 超出预算即退出码 1，供 CI 门禁与本地 `npm run check:size` 使用。
 * 预算按 gzip 后 KB 计；分包名由 vite manualChunks 与路由分割决定（带内容哈希）。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// fileURLToPath 保证 Windows 下 URL → 系统路径正确（URL 不能直接用于 path.join）
const DIST_ASSETS = fileURLToPath(new URL('../dist/assets', import.meta.url));

/** 单分包预算（gzip KB）：新增更大分包或调整分割策略时同步维护 */
const CHUNK_BUDGETS = [
  { label: '主包 index（应用代码）', pattern: /^index-.*\.js$/, maxKB: 75 },
  { label: 'vendor（react/router）', pattern: /^vendor-.*\.js$/, maxKB: 100 },
  { label: 'dexie', pattern: /^dexie-.*\.js$/, maxKB: 45 },
  { label: 'seed（种子数据）', pattern: /^seed-.*\.js$/, maxKB: 50 },
];

/** 全部 JS 合计预算（gzip KB） */
const TOTAL_BUDGET_KB = 260;

const files = readdirSync(DIST_ASSETS).filter((name) => name.endsWith('.js'));
if (files.length === 0) {
  console.error('未找到构建产物，请先运行 npm run build');
  process.exit(1);
}

const gzipKB = (name) =>
  gzipSync(readFileSync(join(DIST_ASSETS, name))).length / 1024;

let failed = false;
for (const { label, pattern, maxKB } of CHUNK_BUDGETS) {
  const hit = files.find((name) => pattern.test(name));
  if (!hit) {
    console.log(`⚠ ${label}: 未找到匹配分包（${pattern}），跳过`);
    continue;
  }
  const kb = gzipKB(hit);
  const ok = kb <= maxKB;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${label}: ${kb.toFixed(1)} KB gzip（预算 ${maxKB}）`);
}

let total = 0;
for (const name of files) total += gzipKB(name);
const totalOk = total <= TOTAL_BUDGET_KB;
failed ||= !totalOk;
console.log(
  `${totalOk ? '✓' : '✗'} 全部 JS 合计: ${total.toFixed(1)} KB gzip（预算 ${TOTAL_BUDGET_KB}，${files.length} 个分包）`,
);

process.exit(failed ? 1 : 0);
