import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

import { WORKBENCH_SAMPLE_CONTENT_SECURITY_POLICY } from './csp-policy.js';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageRoot, '../..');
const storybookProxyTarget = process.env.WORKBENCH_SAMPLE_STORYBOOK_PROXY_TARGET?.trim();

function workbenchSampleCspPlugin(): Plugin {
  return {
    name: 'workbench-sample-csp',
    transformIndexHtml(html) {
      if (html.includes('http-equiv="Content-Security-Policy"')) {
        return html;
      }
      return html.replace(
        /<head>/i,
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${WORKBENCH_SAMPLE_CONTENT_SECURITY_POLICY}" />`,
      );
    },
  };
}

function getBasePath(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return '/';
  }

  if (trimmed === './' || /^https?:\/\//.test(trimmed)) {
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig({
  base: getBasePath(process.env.WORKBENCH_SAMPLE_BASE_PATH),
  plugins: [react(), workbenchSampleCspPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom', 'monaco-editor'],
  },
  server: {
    host: '127.0.0.1',
    port: 65173,
    headers: {
      'Content-Security-Policy': WORKBENCH_SAMPLE_CONTENT_SECURITY_POLICY,
    },
    proxy: storybookProxyTarget
      ? {
          '/storybook': {
            target: storybookProxyTarget,
            changeOrigin: true,
            rewrite: (requestPath) => requestPath.replace(/^\/storybook(?=\/|$)/, '') || '/',
            ws: true,
          },
        }
      : undefined,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': WORKBENCH_SAMPLE_CONTENT_SECURITY_POLICY,
    },
  },
});
