import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { runCommand } from './lib/run-command.mjs';
import { packageDirectoryNameForPackageName } from './npm-publish-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureBase = path.resolve(os.tmpdir());
const fixtureRoot = fs.mkdtempSync(path.join(fixtureBase, 'wbk-packed-consumer-'));
const packDir = path.join(fixtureRoot, 'pack');
const consumerDir = path.join(fixtureRoot, 'consumer');
const nodeModulesDir = path.join(consumerDir, 'node_modules');
const outputDir = path.join(consumerDir, 'dist');

// Runtime closure reached by the public imports in the generated consumer.
// Monaco is installed as it would be for a real consumer, but must not enter the
// manifest's transitive static entry closure.
const packageNames = [
  '@workbench-kit/base',
  '@workbench-kit/contracts',
  '@workbench-kit/platform',
  '@workbench-kit/runtime',
  '@workbench-kit/workspace',
  '@workbench-kit/adapters',
  '@workbench-kit/services',
  '@workbench-kit/tokens',
  '@workbench-kit/jdw',
  '@workbench-kit/monaco',
  '@workbench-kit/field-remap',
  '@workbench-kit/react',
  '@workbench-kit/shell-react',
];
const manifests = new Map(
  packageNames.map((name) => [name, readJson(path.join(packageDir(name), 'package.json'))]),
);

fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(nodeModulesDir, { recursive: true });

try {
  assertExternalFixture();
  packageNames.forEach(packPackage);
  linkExternalPackages();
  writeConsumer();

  console.log('[check-packed-consumer] Building external production consumer...');
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, 'vite.config.mjs')],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  verifyOutput();
} finally {
  assertSafeFixturePath();
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

function packPackage(packageName) {
  console.log(`[check-packed-consumer] Packing ${packageName}...`);
  const output = runCommand(
    'pnpm',
    ['--filter', packageName, 'pack', '--pack-destination', packDir, '--json'],
    { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const tarball = path.resolve(repoRoot, JSON.parse(output.trim()).filename);
  const target = packagePath(nodeModulesDir, packageName);
  fs.mkdirSync(target, { recursive: true });
  runCommand('tar', ['-xzf', tarball, '--strip-components=1', '-C', target], {
    stdio: 'inherit',
  });
}

function linkExternalPackages() {
  const requirements = new Map();

  for (const [packageName, manifest] of manifests) {
    const optional = new Set([
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.entries(manifest.peerDependenciesMeta ?? {})
        .filter(([, meta]) => meta.optional)
        .map(([name]) => name),
    ]);
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    };

    for (const dependencyName of Object.keys(dependencies)) {
      if (dependencyName.startsWith('@workbench-kit/')) continue;
      const previous = requirements.get(dependencyName);
      requirements.set(dependencyName, {
        optional: (previous?.optional ?? true) && optional.has(dependencyName),
        requestedBy: previous?.requestedBy ?? packageName,
      });
    }
  }

  for (const [dependencyName, requirement] of requirements) {
    const source = [repoRoot, ...packageNames.map(packageDir)]
      .map((root) => packagePath(path.join(root, 'node_modules'), dependencyName))
      .find((candidate) => fs.existsSync(candidate));
    if (!source) {
      if (requirement.optional) continue;
      throw new Error(
        `Cannot resolve ${dependencyName}, required by ${requirement.requestedBy}. Run pnpm install.`,
      );
    }

    const target = packagePath(nodeModulesDir, dependencyName);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(
      fs.realpathSync(source),
      target,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
}

function writeConsumer() {
  fs.mkdirSync(path.join(consumerDir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(consumerDir, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body><script type="module" src="/src/main.js"></script></body>
</html>
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'main.js'),
    `import '@workbench-kit/react/styles.css';
import '@workbench-kit/shell-react/field-remap/view.css';
import {
  WorkbenchPreviewCanvas,
  WorkbenchPropertyOverrideLabel,
} from '@workbench-kit/react/layout';
import { ContextMenu } from '@workbench-kit/react/overlay';
import {
  WorkbenchCommandPalette,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  createWorkspaceFilesQuickOpenProvider,
  matchesWorkbenchShortcut,
  resolveQuickOpenItemPath,
} from '@workbench-kit/react/workbench/command-ui';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench/commands';
import { StatusBar } from '@workbench-kit/react/workbench/shell';
import { WorkbenchStandaloneShell } from '@workbench-kit/react/workbench/standalone';
import { resolveWorkbenchTheme } from '@workbench-kit/react/workbench/theme';
import { DARK_THEME_PRESET_OPTIONS } from '@workbench-kit/react/workbench/themePresets';
import { FieldRemapFlowMapper } from '@workbench-kit/shell-react/field-remap';

const quickOpenProvider = createWorkspaceFilesQuickOpenProvider({ files: [] });

globalThis.__workbenchKitPackedConsumer = Object.freeze({
  ContextMenu,
  DARK_THEME_PRESET_OPTIONS,
  FieldRemapFlowMapper,
  StatusBar,
  WorkbenchCommandPalette,
  WorkbenchPreviewCanvas,
  WorkbenchPropertyOverrideLabel,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  WorkbenchStandaloneShell,
  commands: createWorkbenchShellCommands({ activities: [] }),
  quickOpenProvider,
  quickOpenPath: resolveQuickOpenItemPath({ id: 'README.md', label: 'README.md' }),
  resolvedTheme: resolveWorkbenchTheme('dark'),
  shortcutMatches: matchesWorkbenchShortcut({
    event: { ctrlKey: true, key: 'p' },
    shortcut: 'Ctrl+P',
  }),
});
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'vite.config.mjs'),
    `export default {
  root: ${JSON.stringify(consumerDir)},
  build: {
    emptyOutDir: true,
    manifest: true,
    outDir: ${JSON.stringify(outputDir)},
    sourcemap: true,
  },
};
`,
  );
}

function verifyOutput() {
  const manifest = readJson(path.join(outputDir, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error('Production consumer emitted no Vite entry.');

  const staticEntries = collectStaticEntries(manifest, entryKey);
  const cssFiles = new Set(staticEntries.flatMap((entry) => entry.css ?? []));
  const sources = [];
  let bytes = 0;
  let gzipBytes = 0;

  for (const entry of staticEntries.filter((candidate) => candidate.file?.endsWith('.js'))) {
    const chunkPath = path.join(outputDir, entry.file);
    const chunk = fs.readFileSync(chunkPath);
    const sourceMap = readJson(`${chunkPath}.map`);
    bytes += chunk.byteLength;
    gzipBytes += gzipSync(chunk).byteLength;
    sources.push(...(sourceMap.sources ?? []));
  }
  if (sources.length === 0) throw new Error('Initial chunks emitted no source-map evidence.');

  const css = [...cssFiles]
    .map((file) => fs.readFileSync(path.join(outputDir, file), 'utf8'))
    .join('\n');
  for (const selector of ['.ui-button', '.workbench-field-remap-editor-surface']) {
    if (!css.includes(selector)) throw new Error(`Packed consumer CSS is missing ${selector}.`);
  }

  // Vite may emit unreferenced Monaco workers while scanning the React barrel.
  // Only the manifest's transitive static JS closure is part of initial load.
  const forbidden = sources.filter((source) => {
    const normalized = `/${source.replaceAll('\\', '/')}`.toLowerCase();
    return [
      '/node_modules/@workbench-kit/monaco/',
      '/node_modules/@monaco-editor/react/',
      '/node_modules/monaco-editor/',
      '/packages/monaco/',
    ].some((segment) => normalized.includes(segment));
  });
  if (forbidden.length) {
    throw new Error(`Monaco entered the initial bundle:\n${[...new Set(forbidden)].join('\n')}`);
  }

  console.log(
    `[check-packed-consumer] OK (${staticEntries.length} static chunks, ${bytes} bytes / ${gzipBytes} gzip bytes, ${cssFiles.size} CSS assets).`,
  );
}

function collectStaticEntries(manifest, entryKey) {
  const entries = [];
  const pending = [entryKey];
  const visited = new Set();
  while (pending.length) {
    const key = pending.pop();
    if (visited.has(key)) continue;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`Vite manifest references missing import ${key}.`);
    entries.push(entry);
    pending.push(...(entry.imports ?? []));
  }
  return entries;
}

function assertExternalFixture() {
  const relative = path.relative(repoRoot, fixtureRoot);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error(`Packed consumer fixture must stay outside the workspace: ${fixtureRoot}`);
  }
}

function assertSafeFixturePath() {
  if (
    path.dirname(path.resolve(fixtureRoot)) !== fixtureBase ||
    !path.basename(fixtureRoot).startsWith('wbk-packed-consumer-')
  ) {
    throw new Error(`Refusing to remove unexpected fixture path: ${fixtureRoot}`);
  }
}

function packageDir(packageName) {
  return path.join(repoRoot, 'packages', packageDirectoryNameForPackageName(packageName));
}

function packagePath(nodeModulesRoot, packageName) {
  return path.join(nodeModulesRoot, ...packageName.split('/'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
