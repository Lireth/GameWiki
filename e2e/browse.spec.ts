import { expect, test } from '@playwright/test';

test.describe('首页与图鉴浏览', () => {
  test('首页正常渲染：Hero 与功能入口可见', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: '星穹铁道资料站' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: '浏览资料' })).toBeVisible();
  });

  test('角色图鉴：种子自动灌入，搜索收窄并同步 URL', async ({ page }) => {
    await page.goto('/characters');

    // 首次访问等待种子同步完成（希儿为种子必含角色）
    const seeleCard = page.locator('a', { hasText: '希儿' }).first();
    await expect(seeleCard).toBeVisible({ timeout: 15_000 });

    const searchBox = page.getByPlaceholder('搜索角色名 / 派系 / 阵营…');
    await searchBox.fill('希儿');
    await expect(page).toHaveURL(/q=/);

    // 命中「希儿」的角色卡片恰好一张（名称唯一）
    await expect(
      page.locator('a').filter({ has: page.getByRole('heading', { name: '希儿', exact: true }) }),
    ).toHaveCount(1);
  });

  test('收藏：卡片星标后出现在我的收藏', async ({ page }) => {
    await page.goto('/characters');
    const firstCardStar = page
      .locator('a', { hasText: '希儿' })
      .first()
      .getByRole('button', { name: '加入收藏' });
    await expect(firstCardStar).toBeVisible({ timeout: 15_000 });
    await firstCardStar.click();

    await page.goto('/favorites');
    await expect(
      page.locator('a', { hasText: '希儿' }).first(),
    ).toBeVisible();
  });
});
