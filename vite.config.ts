import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// 构建脚本运行于 Node 端；项目未安装 @types/node（保持依赖精简），此处豁免模块类型
// @ts-expect-error Node 内置模块类型未安装，运行时由 esbuild 正常解析
import { copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';

// 仅声明用到的 process.env（子路径部署 base 注入）
declare const process: { env: Record<string, string | undefined> };

/**
 * public 目录复制 + SW 缓存版本注入。
 *
 * Vite 7 在 rollup 钩子全部结束后才复制 public 目录，任何对 dist/sw.js 的
 * 后置补丁都会被原样覆盖；因此这里关闭默认复制（copyPublicDir: false），
 * 在 writeBundle 阶段手动复制 public/，并把 sw.js 中所有 __BUILD_ID__
 * 占位符（replaceAll，注释与代码处各有一个）替换为本次构建时间戳 ——
 * 缓存名随发布自动更新（activate 阶段清理旧缓存），避免手工递增遗漏
 * 导致老用户静态资源长期粘在旧缓存上。
 * 相对路径基于 npm script 的工作目录（项目根）。
 */
function publicCopyWithSwBuildId(): Plugin {
  return {
    name: 'public-copy-with-sw-build-id',
    apply: 'build',
    config() {
      return { build: { copyPublicDir: false } };
    },
    writeBundle() {
      const base = process.env.DEPLOY_BASE || '/';
      cpSync('public', 'dist', { recursive: true });
      // SPA 托管回退：GitHub Pages 等静态托管用 404.html 承接未匹配路由，
      // 应用加载后由 React Router 接管（子路径部署配合 DEPLOY_BASE 使用）
      try {
        copyFileSync('dist/index.html', 'dist/404.html');
      } catch {
        /* index.html 不存在时跳过 */
      }
      // og:image 的 meta content 不在 vite 的资源改写范围内，手动按 base 补齐
      try {
        const html = readFileSync('dist/index.html', 'utf8');
        writeFileSync(
          'dist/index.html',
          html.replaceAll('content="/og.png"', `content="${base}og.png"`),
        );
      } catch {
        /* 无 og:image 时跳过 */
      }
      try {
        const code = readFileSync('dist/sw.js', 'utf8');
        writeFileSync(
          'dist/sw.js',
          code.replaceAll('__BUILD_ID__', Date.now().toString(36)),
        );
      } catch {
        /* dist/sw.js 不存在时跳过 */
      }
    },
  };
}

export default defineConfig({
  // 子路径部署（如 GitHub Pages 项目站点 /GameWiki/）时以
  // DEPLOY_BASE=/GameWiki/ npm run build 构建；默认根路径
  base: process.env.DEPLOY_BASE || '/',
  plugins: [react(), tailwindcss(), publicCopyWithSwBuildId()],
  build: {
    rollupOptions: {
      output: {
        // 框架依赖独立分包：应用代码迭代不再使框架缓存失效，
        // 主包只含应用代码（种子数据由 bootstrap 动态加载，同样不进主包）
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('dexie')) return 'dexie';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
