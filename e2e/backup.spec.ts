import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const IMPORT_CHARACTER = {
  id: 'e2e-import-char',
  name: 'E2E导入角色',
  rarity: 4,
  path: 'harmony',
  element: 'fire',
  faction: 'E2E 测试派系',
  camp: 'E2E 测试阵营',
  gender: 'male',
  bodyType: 'adultMale',
  releaseDate: '2026-01-01',
  releaseVersion: '9.9',
};

test.describe('备份导出 / 导入', () => {
  test('导出数据下载 JSON 备份且结构完整', async ({ page }) => {
    await page.goto('/');
    // 等待种子同步完成（「最新实装」区块仅在有数据时渲染）
    await expect(page.getByRole('heading', { name: '最新实装' })).toBeVisible({
      timeout: 15_000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出数据' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^hsr-wiki-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const filePath = await download.path();
    const payload = JSON.parse(readFileSync(filePath!, 'utf8'));
    expect(payload.app).toBe('hsr-wiki');
    expect(typeof payload.schemaVersion).toBe('number');
    expect(Array.isArray(payload.characters)).toBe(true);
    expect(payload.characters.length).toBeGreaterThan(0);
  });

  test('导入备份后新条目实时出现在图鉴', async ({ page }) => {
    await page.goto('/characters');
    // 等种子灌入完成再导入，避免断言撞上加载态
    await expect(page.locator('a', { hasText: '希儿' }).first()).toBeVisible({
      timeout: 15_000,
    });

    const backupPath = path.join(os.tmpdir(), 'e2e-import-backup.json');
    writeFileSync(
      backupPath,
      JSON.stringify({
        app: 'hsr-wiki',
        schemaVersion: 6,
        exportedAt: '2026-01-01T00:00:00.000Z',
        favorites: [],
        characters: [IMPORT_CHARACTER],
        lightCones: [],
        relics: [],
        newsEvents: [],
      }),
    );

    await page.setInputFiles(
      'label:has-text("导入数据") input[type="file"]',
      backupPath,
    );

    // 确认对话框（统计明细）→ 导入
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '导入', exact: true })
      .click();
    // 完成提示
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '知道了' })
      .click();

    // liveQuery 实时更新：搜索即可见，无需刷新
    await page.goto('/characters');
    const searchBox = page.getByPlaceholder('搜索角色名 / 派系 / 阵营…');
    await searchBox.fill('E2E导入角色');
    await expect(
      page.locator('a').filter({ has: page.getByRole('heading', { name: 'E2E导入角色' }) }),
    ).toHaveCount(1);
  });
});
