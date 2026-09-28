import { expect, test } from '@playwright/test';

test.describe('数据管理', () => {
  test('新增光锥条目后出现在条目列表', async ({ page }) => {
    await page.goto('/admin');

    // 切换到「光锥」类型（按钮文案含计数）
    await page.getByRole('button', { name: /光锥/ }).first().click();

    await page.getByLabel('ID').fill('e2e-test-cone');
    await page.getByLabel('名称').fill('E2E测试光锥');
    await page.getByRole('button', { name: '新增条目' }).click();

    // 保存成功提示 + 列表出现新条目
    await expect(page.getByText('已保存「E2E测试光锥」')).toBeVisible();
    await expect(page.locator('li', { hasText: 'e2e-test-cone' })).toBeVisible();
  });

  test('删除条目经确认对话框后从列表移除', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: /光锥/ }).first().click();

    await page.getByLabel('ID').fill('e2e-remove-cone');
    await page.getByLabel('名称').fill('E2E待删光锥');
    await page.getByRole('button', { name: '新增条目' }).click();
    await expect(page.locator('li', { hasText: 'e2e-remove-cone' })).toBeVisible();

    const row = page.locator('li', { hasText: 'E2E待删光锥' });
    await row.getByRole('button', { name: '删除' }).click();
    // 统一确认对话框（danger 样式，按钮文案「删除」）
    await page.getByRole('alertdialog').getByRole('button', { name: '删除' }).click();

    await expect(page.getByText(/已删除「E2E待删光锥」/)).toBeVisible();
    await expect(page.locator('li', { hasText: 'e2e-remove-cone' })).toHaveCount(0);
  });
});
