/**
 * Sample-host Content-Security-Policy baseline.
 *
 * Intentional relaxations for local Vite + Monaco:
 * - `script-src … 'unsafe-inline' 'unsafe-eval'` — Vite HMR / Monaco language services
 * - `style-src … 'unsafe-inline'` — theme tokens + Monaco editor chrome
 * - `worker-src 'self' blob:` — Monaco `?worker&url` module workers
 * - `connect-src` includes loopback HTTP for the optional dummy backend
 *
 * Hosts shipping production builds should tighten further (nonces/hashes, drop
 * `'unsafe-eval'` when Monaco workers are isolated).
 */
export const WORKBENCH_SAMPLE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: http://127.0.0.1:8787 http://localhost:8787",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self' blob:",
].join('; ');
