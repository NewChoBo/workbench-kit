import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageRoot, '../..');

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
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'monaco-editor'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
});
