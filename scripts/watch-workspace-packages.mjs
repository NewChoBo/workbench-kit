import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, watch, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Serialize builds and retain edits received while a build is in flight. */
export function createBuildQueue(build, reportError = console.error) {
  let pending = false;
  let running = false;
  let stopped = false;
  return {
    async request() {
      if (stopped) return;
      pending = true;
      if (running) return;
      running = true;
      try {
        while (pending && !stopped) {
          pending = false;
          try {
            await build();
          } catch (error) {
            reportError(error);
          }
        }
      } finally {
        running = false;
      }
    },
    stop() {
      stopped = true;
      pending = false;
    },
  };
}

export function watchWorkspacePackages(repository = root) {
  let child;
  let timer;
  const watchers = [];
  const inputs = [];
  const fingerprint = () => {
    const hash = createHash('sha256');
    const add = (file) => {
      if (!existsSync(file)) return;
      hash.update(file);
      hash.update(readFileSync(file));
    };
    const walk = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else add(file);
      }
    };
    for (const { directory, source } of inputs) {
      if (existsSync(source)) walk(source);
      for (const entry of readdirSync(directory)) {
        if (/^(package\.json|tsup\.config\.[cm]?ts|tsconfig.*\.json)$/.test(entry))
          add(join(directory, entry));
      }
    }
    return hash.digest('hex');
  };
  let previousFingerprint;
  const queue = createBuildQueue(
    () =>
      new Promise((resolveBuild, reject) => {
        child = spawn(
          process.execPath,
          [join(repository, 'scripts/build-workspace-packages.mjs')],
          {
            cwd: repository,
            env: { ...process.env, WORKBENCH_KIT_WATCH: '1' },
            stdio: 'inherit',
            windowsHide: true,
          },
        );
        child.once('error', reject);
        child.once('close', (code) => {
          child = undefined;
          if (code !== 0) {
            reject(new Error(`Workspace build failed (${code}); waiting for the next edit.`));
            return;
          }
          const cache = join(repository, '.cache');
          mkdirSync(cache, { recursive: true });
          // Consumers reload only after all package outputs have been rebuilt.
          writeFileSync(
            join(cache, 'workspace-build.json'),
            JSON.stringify({ completedAt: Date.now() }),
          );
          console.log('[watch-workspace] Build complete; consumers can reload.');
          resolveBuild();
        });
      }),
  );
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const next = fingerprint();
        if (next === previousFingerprint) return;
        previousFingerprint = next;
        console.log('[watch-workspace] Source changed; rebuilding package outputs.');
        void queue.request();
      } catch (error) {
        console.error('[watch-workspace] Cannot read build inputs:', error);
      }
    }, 200);
  };
  for (const entry of readdirSync(join(repository, 'packages'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(repository, 'packages', entry.name);
    const source = join(directory, 'src');
    inputs.push({ directory, source });
    if (existsSync(source)) watchers.push(watch(source, { recursive: true }, changed));
    // Root config only; never watch dist/node_modules or trigger a build loop.
    watchers.push(
      watch(directory, (_event, file) => {
        if (file && /^(package\.json|tsup\.config\.[cm]?ts|tsconfig.*\.json)$/.test(String(file)))
          changed();
      }),
    );
  }
  const stop = () => {
    queue.stop();
    clearTimeout(timer);
    watchers.forEach((watcher) => watcher.close());
    if (child?.pid) {
      if (process.platform === 'win32') {
        spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      } else child.kill('SIGTERM');
    }
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  previousFingerprint = fingerprint();
  void queue.request();
  return stop;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  watchWorkspacePackages();
}
