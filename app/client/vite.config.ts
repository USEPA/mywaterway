import { defineConfig, loadEnv } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import istanbul from 'vite-plugin-istanbul';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { version } from './package.json';

// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  let productionOnlyPlugins = [];
  if (mode === 'production') {
    productionOnlyPlugins.push(
      createHtmlPlugin({
        minify: {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          collapseBooleanAttributes: true,
          removeEmptyAttributes: true,
          minifyCSS: true,
          minifyJS: true,
        },
      }),
    );
  }

  return defineConfig({
    base: '/',
    build: {
      outDir: 'build',
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: `static/js/[name]-[hash].${version}.js`,
          chunkFileNames: `static/js/[name]-[hash].${version}.js`,
          assetFileNames: ({ name }) => {
            const css = /\.(css)$/.test(name ?? '');
            const font = /\.(woff|woff2|eot|ttf|otf)$/.test(name ?? '');
            const media = /\.(png|jpe?g|gif|svg|webp|webm|mp3)$/.test(name ?? ""); // prettier-ignore
            const type = css ? 'css/' : font ? 'fonts/' : media ? 'media/' : '';
            return `static/${type}[name]-[hash].${version}[extname]`;
          },
        },
      },
    },
    define: {
      'process.env': {},
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin'],
        },
      }),
      istanbul({
        cypress: true,
        requireEnv: false,
      }),
      viteTsconfigPaths(),
      ...productionOnlyPlugins,
    ],
    server: {
      open: true,
      port: 3000,
    },
  });
};
