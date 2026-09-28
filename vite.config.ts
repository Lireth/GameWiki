import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// 构建脚本运行于 Node 端；项目未安装 @types/node（保持依赖精简），此处豁免模块类型
// @ts-expect-error Node 内置模块类型未安装，运行时由 esbuild 正常解析
import { cpSync, readFileSync, writeFileSync } from 'node:fs';

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
      cpSync('public', 'dist', { recursive: true });
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
  plugins: [react(), tailwindcss(), publicCopyWithSwBuildId()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
