import { defineConfig } from '@playwright/test';

/**
 * E2E 冒烟测试：起 Vite dev server（PROD=false，Service Worker 不注册，
 * 避免缓存干扰断言）；每个用例独立浏览器上下文，IndexedDB 从空库开始，
 * 由应用启动种子同步自动灌入 —— 顺带覆盖了种子迁移路径。
 * 首次运行前需：npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  webServer: {
    command: 'npm run dev -- --port 5177 --strictPort',
    url: 'http://localhost:5177',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:5177',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
