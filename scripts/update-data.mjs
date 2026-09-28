/**
 * 一键更新种子数据（数据源：bilibili 星穹铁道 Wiki）。
 * 流程：角色 SMW → 角色种子 → 光锥 / 遗器 / 资讯（含卡池时间线）
 *       → 新增头像 / 图片本地化 → 合成 src/data/seed.ts → 质量门禁与构建验证。
 * 用法：npm run update:data（或 node scripts/update-data.mjs）
 * 已本地化的图片按 id 保留，不会重复下载；头像 / 图片本地化的单张失败
 * 仅告警不阻断（种子回退为 wiki 热链，下次运行重试）。
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  { name: '抓取角色 SMW 数据', cmd: 'node .scrape/scrape_characters.cjs' },
  { name: '生成角色种子', cmd: 'node .scrape/gen_seed.cjs' },
  { name: '抓取光锥 / 遗器 / 资讯（含卡池）', cmd: 'node .scrape/scrape_wiki.cjs all' },
  { name: '本地化新增角色头像', cmd: 'node .scrape/scrape_avatars.cjs', tolerant: true },
  { name: '本地化新增光锥 / 遗器图片', cmd: 'node .scrape/scrape_images.cjs', tolerant: true },
  { name: '合成 src/data/seed.ts', cmd: 'node .scrape/gen_seed_ts.cjs' },
  { name: '种子质量门禁（vitest）', cmd: 'npm run test' },
  { name: '构建验证（tsc + vite）', cmd: 'npm run build' },
];

let failed = false;
for (const [i, step] of steps.entries()) {
  console.log(`\n=== [${i + 1}/${steps.length}] ${step.name} ===`);
  // 命令均为本文件内的静态字符串，shell 拼接无注入风险
  const result = spawnSync(step.cmd, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
  });
  if (result.status !== 0) {
    if (step.tolerant) {
      console.warn(`[警告] ${step.name} 非零退出（个别图片下载失败可容忍，已回退热链），继续。`);
      continue;
    }
    console.error(`[失败] ${step.name}，中止更新。`);
    failed = true;
    break;
  }
}

if (failed) process.exit(1);
console.log('\n✓ 数据更新完成。涉及文件：.scrape/*.json、src/data/seed.ts、public/ 下的图片资产。');
