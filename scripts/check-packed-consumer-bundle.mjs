import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { validatePackedPackageCohort } from './lib/packed-package-cohort.mjs';
import { runCommand } from './lib/run-command.mjs';
import { buildFreshWorkspaceArtifacts } from './lib/workspace-export-targets.mjs';
import { NPM_PUBLISH_ORDER, packageDirectoryNameForPackageName } from './npm-publish-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureBase = path.resolve(os.tmpdir());
const fixtureRoot = fs.mkdtempSync(path.join(fixtureBase, 'wbk-packed-consumer-'));
const packDir = path.join(fixtureRoot, 'pack');
const consumerDir = path.join(fixtureRoot, 'consumer');
const nodeModulesDir = path.join(consumerDir, 'node_modules');
const outputDir = path.join(consumerDir, 'dist');
const focusedOverlayOutputDir = path.join(consumerDir, 'dist-focused-overlay');

// Keep a little deliberate headroom for normal fixes, while forcing larger
// public-surface growth to include an explicit bundle-budget review.
const PACKED_CONSUMER_BUDGETS = Object.freeze({
  cssGzipBytes: 52_000,
  focusedOverlayCssGzipBytes: 11_500,
  initialGzipBytes: 240_000,
});

// Runtime closure reached by the public imports in the generated consumer.
// Monaco is installed as it would be for a real consumer, but must not enter the
// manifest's transitive static entry closure.
const consumerPackageNames = [
  '@workbench-kit/base',
  '@workbench-kit/contracts',
  '@workbench-kit/platform',
  '@workbench-kit/workbench-extension-sdk',
  '@workbench-kit/workbench-config',
  '@workbench-kit/workbench-core',
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
const consumerManifests = new Map(
  consumerPackageNames.map((name) => [name, readJson(path.join(packageDir(name), 'package.json'))]),
);
const expectedVersion = readJson(path.join(repoRoot, 'package.json')).version;

fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(nodeModulesDir, { recursive: true });

try {
  assertExternalFixture();
  buildFreshWorkspaceArtifacts({
    logPrefix: 'check-packed-consumer',
    repoRoot,
  });
  NPM_PUBLISH_ORDER.forEach(packPackage);
  verifyPackedPackageCohort();
  linkExternalPackages();
  writeConsumer();

  console.log('[check-packed-consumer] Typechecking external TypeScript consumer...');
  runCommand('pnpm', ['exec', 'tsc', '--project', path.join(consumerDir, 'tsconfig.json')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'CommonJS',
      '--moduleResolution',
      'Node',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2020',
      path.join(consumerDir, 'src', 'node-context-menu-item.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  console.log('[check-packed-consumer] Building external production consumer...');
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, 'vite.config.mjs')],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  const coreMetrics = verifyOutput();

  buildFocusedStyleConsumer('focused-overlay');
  verifyFocusedStyleOutput({
    budgetBytes: PACKED_CONSUMER_BUDGETS.focusedOverlayCssGzipBytes,
    coreCssGzipBytes: coreMetrics.cssGzipBytes,
    forbiddenSelectors: [
      '.chat-panel-drop-target',
      '.ui-modal',
      '.ui-workbench-activity-bar',
      '.ui-workbench-command-item',
      '.ui-workbench-command-list',
      '.widget-tree-workbench',
      '.workbench-settings-modal',
      '.workspace-editor',
    ],
    label: 'focused overlay',
    maxCoreRatio: 0.25,
    outputDirectory: focusedOverlayOutputDir,
    requiredSelectors: [
      '--font-size-xs:',
      '.codicon',
      '.ui-button',
      '.ui-context-menu',
      '.ui-context-menu__item',
      '.ui-context-menu__item.ui-button',
      '.ui-scroll-area',
    ],
  });
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

  for (const [packageName, manifest] of consumerManifests) {
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

  for (const dependencyName of ['@types/react', '@types/react-dom']) {
    requirements.set(dependencyName, {
      optional: false,
      requestedBy: 'packed TypeScript consumer',
    });
  }

  for (const [dependencyName, requirement] of requirements) {
    const source = [repoRoot, ...consumerPackageNames.map(packageDir)]
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

function verifyPackedPackageCohort() {
  const manifests = new Map(
    NPM_PUBLISH_ORDER.map((packageName) => [
      packageName,
      readJson(path.join(packagePath(nodeModulesDir, packageName), 'package.json')),
    ]),
  );
  const count = validatePackedPackageCohort({
    expectedPackageNames: NPM_PUBLISH_ORDER,
    expectedVersion,
    manifests,
  });
  console.log(
    `[check-packed-consumer] Packed release cohort OK (${count} packages at ${expectedVersion}).`,
  );
}

function writeConsumer() {
  fs.mkdirSync(path.join(consumerDir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(consumerDir, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body><script type="module" src="/src/main.ts"></script></body>
</html>
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'main.ts'),
    `import '@workbench-kit/react/styles/core.css';
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
  getWorkbenchCommandPaletteShortcutLabel,
  getWorkbenchQuickAccessShortcutLabel,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  matchesWorkbenchShortcut,
  resolveQuickOpenItemPath,
} from '@workbench-kit/react/workbench/command-ui';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench/commands';
import { StatusBar } from '@workbench-kit/react/workbench/shell';
import { WorkbenchStandaloneShell } from '@workbench-kit/react/workbench/standalone';
import { resolveWorkbenchTheme } from '@workbench-kit/react/workbench/theme';
import { DARK_THEME_PRESET_OPTIONS } from '@workbench-kit/react/workbench/themePresets';
import type {
  WorkbenchContextValue,
  WorkbenchExtensionActivationAccess,
  WorkbenchExtensionActivationStateReader,
  WorkbenchExtensionCatalogReader,
  WorkbenchShellCommandHostProps,
  WorkbenchShellCommandRunContext,
  WorkbenchSettingsCapabilityPublication,
  WorkbenchSettingsCapabilityPublisher,
} from '@workbench-kit/shell-react';
import { FieldRemapFlowMapper } from '@workbench-kit/shell-react/field-remap';
import { WorkbenchHostShell } from '@workbench-kit/shell-react/host-shell';
import { WorkbenchProvider } from '@workbench-kit/shell-react/provider';
import { DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY } from '@workbench-kit/shell-react/layout-storage';
import { useExtensionRegistryCommandDescriptors } from '@workbench-kit/shell-react/registry-command-descriptors';

const quickOpenProvider = createWorkspaceFilesQuickOpenProvider({ files: [] });
type ExtensionRegistryRemoved = 'extensionRegistry' extends keyof WorkbenchContextValue
  ? never
  : true;
const extensionRegistryRemoved: ExtensionRegistryRemoved = true;
type FocusedExtensionContextContracts = {
  activation: WorkbenchExtensionActivationAccess;
  activationState: WorkbenchExtensionActivationStateReader;
  catalog: WorkbenchExtensionCatalogReader;
  publication: WorkbenchSettingsCapabilityPublication;
  publisher: WorkbenchSettingsCapabilityPublisher;
};
const focusedExtensionContextContracts = null as unknown as FocusedExtensionContextContracts;
type FocusedShellCommandContracts = {
  host: WorkbenchShellCommandHostProps;
  runContext: WorkbenchShellCommandRunContext;
};
const focusedShellCommandContracts = null as unknown as FocusedShellCommandContracts;

(globalThis as typeof globalThis & { __workbenchKitPackedConsumer?: unknown })
  .__workbenchKitPackedConsumer = Object.freeze({
  ContextMenu,
  DARK_THEME_PRESET_OPTIONS,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  FieldRemapFlowMapper,
  StatusBar,
  WorkbenchCommandPalette,
  WorkbenchHostShell,
  WorkbenchPreviewCanvas,
  WorkbenchProvider,
  WorkbenchPropertyOverrideLabel,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  WorkbenchStandaloneShell,
  useExtensionRegistryCommandDescriptors,
  extensionRegistryRemoved,
  focusedExtensionContextContracts,
  focusedShellCommandContracts,
  commands: createWorkbenchShellCommands({ activities: [] }),
  quickOpenProvider,
  quickOpenPath: resolveQuickOpenItemPath({ id: 'README.md', label: 'README.md' }),
  resolvedTheme: resolveWorkbenchTheme('dark'),
  commandPaletteShortcut: getWorkbenchCommandPaletteShortcutLabel(),
  commandPaletteShortcutMatches: matchesWorkbenchCommandPaletteShortcut({
    ctrlKey: true,
    key: 'p',
    shiftKey: true,
  }),
  quickAccessShortcut: getWorkbenchQuickAccessShortcutLabel(),
  quickAccessShortcutMatches: matchesWorkbenchQuickAccessShortcut({ ctrlKey: true, key: 'p' }),
  shortcutMatches: matchesWorkbenchShortcut({
    event: { ctrlKey: true, key: 'p' },
    shortcut: 'Ctrl+P',
  }),
});
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'builtins.ts'),
    `import { BUILTIN_WORKBENCH_EXTENSIONS } from '@workbench-kit/shell-react';

export const packedBuiltins = BUILTIN_WORKBENCH_EXTENSIONS;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-context-menu-item.ts'),
    `import type { ContextMenuItem } from '@workbench-kit/react/overlay/context-menu-item';

export type NodeResolvedContextMenuItem = ContextMenuItem;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'focused-overlay.ts'),
    `import '@workbench-kit/react/styles/foundation.css';
import '@workbench-kit/react/styles/overlay.css';
import { ContextMenu } from '@workbench-kit/react/overlay';

(globalThis as typeof globalThis & { __workbenchKitFocusedOverlay?: unknown })
  .__workbenchKitFocusedOverlay = Object.freeze({ ContextMenu });
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react-jsx',
          lib: ['ES2022', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
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
  writeFocusedViteConfig(
    'focused-overlay',
    path.join(consumerDir, 'src', 'focused-overlay.ts'),
    focusedOverlayOutputDir,
  );
}

function writeFocusedViteConfig(name, input, outputDirectory) {
  fs.writeFileSync(
    path.join(consumerDir, `vite.${name}.config.mjs`),
    `export default {
  root: ${JSON.stringify(consumerDir)},
  build: {
    emptyOutDir: true,
    manifest: true,
    outDir: ${JSON.stringify(outputDirectory)},
    rollupOptions: { input: ${JSON.stringify(input)} },
  },
};
`,
  );
}

function buildFocusedStyleConsumer(name) {
  console.log(`[check-packed-consumer] Building ${name} CSS consumer...`);
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, `vite.${name}.config.mjs`)],
    { cwd: repoRoot, stdio: 'inherit' },
  );
}

function verifyOutput() {
  const manifest = readJson(path.join(outputDir, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error('Production consumer emitted no Vite entry.');

  const staticEntries = collectStaticEntries(manifest, entryKey);
  const cssFiles = new Set(staticEntries.flatMap((entry) => entry.css ?? []));
  const staticAssetFiles = new Set(staticEntries.flatMap((entry) => entry.assets ?? []));
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

  const cssAssets = [...cssFiles].map((file) => fs.readFileSync(path.join(outputDir, file)));
  const css = cssAssets.map((asset) => asset.toString('utf8')).join('\n');
  for (const selector of ['.ui-button', '.workbench-field-remap-editor-surface']) {
    if (!css.includes(selector)) throw new Error(`Packed consumer CSS is missing ${selector}.`);
  }
  for (const selector of ['.workbench-profile-card', '.chat-panel-drop-target']) {
    if (css.includes(selector)) {
      throw new Error(`Core Workbench CSS unexpectedly includes optional selector ${selector}.`);
    }
  }

  const cssBytes = cssAssets.reduce((total, asset) => total + asset.byteLength, 0);
  const cssGzipBytes = gzipSync(Buffer.concat(cssAssets)).byteLength;
  const staticAssets = [...staticAssetFiles].map((file) =>
    fs.readFileSync(path.join(outputDir, file)),
  );
  const staticAssetBytes = staticAssets.reduce((total, asset) => total + asset.byteLength, 0);
  const staticAssetGzipBytes = staticAssets.reduce(
    (total, asset) => total + gzipSync(asset).byteLength,
    0,
  );
  const initialGzipBytes = gzipBytes + cssGzipBytes + staticAssetGzipBytes;

  assertWithinBudget('CSS gzip', cssGzipBytes, PACKED_CONSUMER_BUDGETS.cssGzipBytes);
  assertWithinBudget('initial gzip', initialGzipBytes, PACKED_CONSUMER_BUDGETS.initialGzipBytes);

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
    `[check-packed-consumer] OK (${staticEntries.length} static chunks, JS ${bytes} bytes / ${gzipBytes} gzip bytes, CSS ${cssBytes} bytes / ${cssGzipBytes} gzip bytes in ${cssFiles.size} assets, static assets ${staticAssetBytes} bytes / ${staticAssetGzipBytes} gzip bytes in ${staticAssetFiles.size} files, initial ${initialGzipBytes} / ${PACKED_CONSUMER_BUDGETS.initialGzipBytes} gzip bytes).`,
  );

  return { cssBytes, cssGzipBytes };
}

function verifyFocusedStyleOutput({
  budgetBytes,
  coreCssGzipBytes,
  forbiddenSelectors,
  label,
  maxCoreRatio,
  outputDirectory,
  requiredSelectors,
}) {
  const manifest = readJson(path.join(outputDirectory, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error(`${label} consumer emitted no Vite entry.`);

  const staticEntries = collectStaticEntries(manifest, entryKey);
  const cssFiles = new Set(staticEntries.flatMap((entry) => entry.css ?? []));
  const cssAssets = [...cssFiles].map((file) => fs.readFileSync(path.join(outputDirectory, file)));
  const css = cssAssets.map((asset) => asset.toString('utf8')).join('\n');

  for (const selector of requiredSelectors) {
    if (!css.includes(selector)) throw new Error(`${label} CSS is missing ${selector}.`);
  }
  for (const selector of forbiddenSelectors) {
    if (css.includes(selector)) {
      throw new Error(`${label} CSS unexpectedly includes ${selector}.`);
    }
  }

  const cssBytes = cssAssets.reduce((total, asset) => total + asset.byteLength, 0);
  const cssGzipBytes = gzipSync(Buffer.concat(cssAssets)).byteLength;
  assertWithinBudget(`${label} CSS gzip`, cssGzipBytes, budgetBytes);

  const ratio = cssGzipBytes / coreCssGzipBytes;
  if (ratio > maxCoreRatio) {
    throw new Error(
      `${label} CSS lost its focused advantage: ${(ratio * 100).toFixed(1)}% of core > ${(maxCoreRatio * 100).toFixed(0)}%.`,
    );
  }

  console.log(
    `[check-packed-consumer] ${label} OK (CSS ${cssBytes} bytes / ${cssGzipBytes} gzip bytes, ${(ratio * 100).toFixed(1)}% of core).`,
  );
}

function assertWithinBudget(label, actualBytes, budgetBytes) {
  if (actualBytes <= budgetBytes) return;
  throw new Error(
    `Packed consumer ${label} exceeds its budget: ${actualBytes} > ${budgetBytes} bytes. Review the initial dependency and CSS surface before raising the budget.`,
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
