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
const focusedCommandHostControllerOutputDir = path.join(
  consumerDir,
  'dist-focused-command-host-controller',
);
const focusedOverlayOutputDir = path.join(consumerDir, 'dist-focused-overlay');

// Keep a little deliberate headroom for normal fixes, while forcing larger
// public-surface growth to include an explicit bundle-budget review.
const PACKED_CONSUMER_BUDGETS = Object.freeze({
  cssGzipBytes: 52_000,
  focusedOverlayCssGzipBytes: 11_500,
  // The exact pre-keybinding-management baseline consumed 240,860 bytes. Shared platform grammar,
  // the management model, and its limited status selectors replace the React-local parser and add
  // 4,052 bytes without a second parser or static dependency; retain deliberate repair headroom.
  initialGzipBytes: 246_000,
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
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      '--noUncheckedIndexedAccess',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2022',
      path.join(consumerDir, 'src', 'strict-field-remap.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
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
      path.join(consumerDir, 'src', 'node-design-system.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  runCommand('node', [path.join(consumerDir, 'src', 'node-design-system-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'node-ui-authoring-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'node-ui-authoring-runtime.mjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });

  console.log('[check-packed-consumer] Building external production consumer...');
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, 'vite.config.mjs')],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  const coreMetrics = verifyOutput();

  buildFocusedConsumer('focused-command-host-controller');
  verifyFocusedCommandHostControllerOutput();

  buildFocusedConsumer('focused-overlay');
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
  ExtensionManagementEntry,
  ExtensionManagementPanelProps,
  ExtensionManagementTransition,
} from '@workbench-kit/react';
import type { NodeTypeDescriptor } from '@workbench-kit/contracts';
import type { ValueTransformDefinition } from '@workbench-kit/field-remap';
import type { ExtensionManagementPendingAction } from '@workbench-kit/react/workbench/management';
import {
  ExtensionRegistry,
  type ExtensionRegistrationStore,
  type ThemeRegistryChangeEvent,
} from '@workbench-kit/workbench-core';
import type {
  WorkbenchContextValue,
  WorkbenchExtensionActivationAccess,
  WorkbenchExtensionActivationStateReader,
  WorkbenchExtensionCatalogReader,
  WorkbenchShellCommandHostProps,
  WorkbenchShellCommandRunContext,
  WorkbenchSettingsCapabilityPublication,
  WorkbenchSettingsCapabilityPublisher,
  FieldRemapPreviewState as FieldRemapRootPreviewState,
} from '@workbench-kit/shell-react';
import {
  FieldRemapFlowMapper,
  type FieldRemapFlowMapperProps,
  type FieldRemapPreviewState,
} from '@workbench-kit/shell-react/field-remap';
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
const legacyExtensionManagementEntry: ExtensionManagementEntry = {
  category: 'utility',
  displayName: 'Legacy Extension',
  enabled: true,
  id: 'workbench-kit.consumer.legacy-extension',
  source: 'installed',
};
const legacyExtensionManagementPanelProps: ExtensionManagementPanelProps = {
  browseEntries: [],
  installedEntries: [legacyExtensionManagementEntry],
};
const extensionManagementTransition: ExtensionManagementTransition = {
  kind: 'applied',
  message: 'Applied without a reload.',
};
function consumeLegacyPendingAction(action: ExtensionManagementPendingAction): string {
  const kind = action.kind;
  switch (kind) {
    case 'install':
      return \`install:\${action.entryId}\`;
    case 'toggle':
      return \`toggle:\${action.entryId}\`;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
const legacyPendingAction = consumeLegacyPendingAction({
  entryId: legacyExtensionManagementEntry.id,
  kind: 'toggle',
});
const packedExtensionRegistry = new ExtensionRegistry();
const packedExtensionRegistrations: ExtensionRegistrationStore =
  packedExtensionRegistry.registerExtensions([]);
const packedThemeChange = null as unknown as ThemeRegistryChangeEvent;
const packedFieldRemapPreview: FieldRemapPreviewState = {
  status: 'unavailable',
  reason: 'no-sample',
};
const packedFieldRemapRootPreview: FieldRemapRootPreviewState = packedFieldRemapPreview;
const packedFieldRemapPreviewProps: Pick<
  FieldRemapFlowMapperProps,
  'preview' | 'readOnly' | 'showPreview'
> = { preview: packedFieldRemapPreview, readOnly: true };
async function verifyPackedGraphAuthoring(): Promise<{
  descriptor: NodeTypeDescriptor;
  transform: ValueTransformDefinition;
}> {
  const { verifyPackedGraphAuthoringRuntime } = await import('./graph-authoring-runtime');
  return verifyPackedGraphAuthoringRuntime();
}

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
  legacyExtensionManagementPanelProps,
  legacyPendingAction,
  extensionManagementTransition,
  packedExtensionRegistrations,
  packedThemeChange,
  packedFieldRemapPreview,
  packedFieldRemapRootPreview,
  packedFieldRemapPreviewProps,
  verifyPackedGraphAuthoring,
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
    path.join(consumerDir, 'src', 'graph-authoring-runtime.ts'),
    `import {
  resolveNodeTypeCatalog,
  validateNodeTypeDescriptor,
  type NodeTypeDescriptor,
} from '@workbench-kit/contracts';
import {
  projectValueTransformToNodeType,
  type ValueTransformDefinition,
} from '@workbench-kit/field-remap';

export function verifyPackedGraphAuthoringRuntime(): {
  descriptor: NodeTypeDescriptor;
  transform: ValueTransformDefinition;
} {
  const descriptor: NodeTypeDescriptor = {
    id: 'workbench.consumer.transform',
    version: '1.0.0',
    inputs: [{ id: 'input', value: { type: 'number' }, required: true }],
    outputs: [{ id: 'output', value: { type: 'number' } }],
    designTime: { label: 'Consumer transform' },
  };
  const catalog = resolveNodeTypeCatalog([
    { contributorId: 'packed-consumer', nodeTypes: [descriptor] },
  ]);
  if (validateNodeTypeDescriptor(descriptor).length > 0 || catalog.catalog.nodeTypes().length !== 1) {
    throw new Error('Packed node type runtime validation failed.');
  }

  const transform: ValueTransformDefinition = {
    id: 'consumer:identity-number',
    label: 'Identity number',
    inputTypes: ['number'],
    outputType: 'number',
    apply: (value) => value,
  };
  const projection = projectValueTransformToNodeType(transform, {
    nodeTypeRef: { id: 'workbench.consumer.identity-number', version: '1.0.0' },
  });
  if (projection.descriptor === null || projection.issues.length > 0) {
    throw new Error('Packed transform projection failed.');
  }
  return { descriptor, transform };
}
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
    path.join(consumerDir, 'src', 'node-design-system.ts'),
    `import { DesignSystemPackRegistry } from '@workbench-kit/workbench-core/design-system';

export const packedDesignSystemRegistry = new DesignSystemPackRegistry();
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-design-system-runtime.cjs'),
    `const { DesignSystemPackRegistry } = require('@workbench-kit/workbench-core/design-system');

const registry = new DesignSystemPackRegistry();
if (registry.snapshot().revision !== 0) process.exit(1);
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'ui-authoring-compat.ts'),
    `import type { DesignSystemPackChangeMutation } from '@workbench-kit/contracts';
import {
  applyUiAuthoringSessionCommand,
  applyUiAuthoringSessionCommandV2,
  applyUiDesignSystemPackChange,
  applyUiDesignSystemPackChangeV2,
  applyUiDocumentCommand,
  applyUiDocumentCommandV2,
  createUiAuthoringDetachedPlan,
  createUiAuthoringSession,
  createUiAuthoringSessionV2,
  finalizeUiAuthoringDetachedPlan,
  previewUiAuthoringDetachedPlan,
  projectUiAuthoringDocument,
  redoUiAuthoringSession,
  redoUiAuthoringSessionV2,
  undoUiAuthoringSession,
  undoUiAuthoringSessionV2,
  type ApplyUiDocumentCommandResult,
  type ApplyUiDocumentCommandV2Result,
  type ApplyUiDesignSystemPackChangeResult,
  type ApplyUiDesignSystemPackChangeV2Result,
  type CreateUiAuthoringDetachedPlanInput,
  type UiAuthoringSessionCommandResult,
  type UiAuthoringSessionState,
  type UiAuthoringSessionStateV2,
  type UiAuthoringSessionV2CommandResult,
  type UiAuthoringBindingProvenance,
  type UiAuthoringDesignSystemInputSnapshot,
  type UiAuthoringDetachedPlan,
  type UiAuthoringDocumentProjection,
  type UiAuthoringDocumentNodeProjection,
  type UiAuthoringInputBindingProjection,
  type UiAuthoringPlanDiagnostic,
  type UiAuthoringPlanDiagnosticCode,
  type UiAuthoringPlanFinalizeContext,
  type UiAuthoringPlanFinalizeResult,
  type UiAuthoringPlanPreview,
  type UiAuthoringRecipeRef,
  type UiAuthoringRecipeProvenance,
  type UiDocument,
  type UiDocumentAtomicCommandV2,
  type UiDocumentCommand,
  type UiDocumentCommandV2,
  type UiDocumentCommandV2Context,
  type UiDocumentCommandV2Issue,
  type UiDocumentCommandV2IssueCode,
  type UiDocumentTransaction,
  type UiDocumentTransactionRecordV2,
  type UiDocumentTransactionV2,
} from '@workbench-kit/jdw';

export function consumeLegacyUiDocumentCommand(command: UiDocumentCommand): string {
  switch (command.type) {
    case 'insert-node':
      return 'insert-node';
    case 'remove-node':
      return 'remove-node';
    case 'replace-node':
      return 'replace-node';
    case 'move-node':
      return 'move-node';
    case 'set-property':
      return 'set-property';
    case 'set-layout':
      return 'set-layout';
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

export function consumeLegacyUiDocumentTransaction(transaction: UiDocumentTransaction): string {
  const command = transaction.command;
  switch (command.type) {
    case 'insert-node':
      return 'insert-node';
    case 'remove-node':
      return 'remove-node';
    case 'replace-node':
      return 'replace-node';
    case 'move-node':
      return 'move-node';
    case 'set-property':
      return 'set-property';
    case 'set-layout':
      return 'set-layout';
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

export function consumeUiDocumentCommandV2(command: UiDocumentCommandV2): string {
  switch (command.type) {
    case 'insert-node':
      return 'insert-node';
    case 'remove-node':
      return 'remove-node';
    case 'replace-node':
      return 'replace-node';
    case 'move-node':
      return 'move-node';
    case 'set-property':
      return 'set-property';
    case 'set-layout':
      return 'set-layout';
    case 'set-input-binding':
      return 'set-input-binding';
    case 'clear-input-binding':
      return 'clear-input-binding';
    case 'batch':
      return 'batch';
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

type LegacyApplyUiDocumentCommand = (
  document: UiDocument,
  command: UiDocumentCommand,
) => ApplyUiDocumentCommandResult;
type LegacyApplyUiAuthoringSessionCommand = (
  state: UiAuthoringSessionState,
  command: UiDocumentCommand,
) => UiAuthoringSessionCommandResult;
type LegacyCreateUiAuthoringSession = (
  document: UiDocument,
  selectedNodeIds?: readonly string[],
) => UiAuthoringSessionState;
type LegacyMoveUiAuthoringSessionHistory = (
  state: UiAuthoringSessionState,
) => UiAuthoringSessionState | null;
type LegacyApplyUiDesignSystemPackChange = (
  state: UiAuthoringSessionState,
  mutation: DesignSystemPackChangeMutation,
  currentRegistryRevision: number,
) => ApplyUiDesignSystemPackChangeResult;

export const legacyApplyUiDocumentCommand: LegacyApplyUiDocumentCommand = applyUiDocumentCommand;
export const legacyApplyUiAuthoringSessionCommand: LegacyApplyUiAuthoringSessionCommand =
  applyUiAuthoringSessionCommand;
export const legacyCreateUiAuthoringSession: LegacyCreateUiAuthoringSession =
  createUiAuthoringSession;
export const legacyUndoUiAuthoringSession: LegacyMoveUiAuthoringSessionHistory =
  undoUiAuthoringSession;
export const legacyRedoUiAuthoringSession: LegacyMoveUiAuthoringSessionHistory =
  redoUiAuthoringSession;
export const legacyApplyUiDesignSystemPackChange: LegacyApplyUiDesignSystemPackChange =
  applyUiDesignSystemPackChange;

export type PackedUiAuthoringV2Contracts = {
  atomicCommand: UiDocumentAtomicCommandV2;
  command: UiDocumentCommandV2;
  context: UiDocumentCommandV2Context;
  transaction: UiDocumentTransactionV2;
  transactionRecord: UiDocumentTransactionRecordV2;
  documentResult: ApplyUiDocumentCommandV2Result;
  sessionState: UiAuthoringSessionStateV2;
  sessionResult: UiAuthoringSessionV2CommandResult;
  designSystemResult: ApplyUiDesignSystemPackChangeV2Result;
  recipe: UiAuthoringRecipeRef;
  recipeProvenance: UiAuthoringRecipeProvenance;
  createPlanInput: CreateUiAuthoringDetachedPlanInput;
  designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  plan: UiAuthoringDetachedPlan;
  preview: UiAuthoringPlanPreview;
  planDiagnostic: UiAuthoringPlanDiagnostic;
  planDiagnosticCode: UiAuthoringPlanDiagnosticCode;
  finalizeContext: UiAuthoringPlanFinalizeContext;
  finalizeResult: UiAuthoringPlanFinalizeResult;
  bindingProvenance: UiAuthoringBindingProvenance;
  inputBinding: UiAuthoringInputBindingProjection;
  documentProjection: UiAuthoringDocumentProjection;
  documentNodeProjection: UiAuthoringDocumentNodeProjection;
  commandIssue: UiDocumentCommandV2Issue;
  commandIssueCode: UiDocumentCommandV2IssueCode;
};

export const packedUiAuthoringV2Runtime = Object.freeze({
  applyUiAuthoringSessionCommandV2,
  applyUiDesignSystemPackChangeV2,
  applyUiDocumentCommandV2,
  createUiAuthoringDetachedPlan,
  createUiAuthoringSessionV2,
  finalizeUiAuthoringDetachedPlan,
  previewUiAuthoringDetachedPlan,
  projectUiAuthoringDocument,
  redoUiAuthoringSessionV2,
  undoUiAuthoringSessionV2,
});
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-ui-authoring-runtime.cjs'),
    `const jdw = require('@workbench-kit/jdw');

const requiredFunctions = [
  'applyUiAuthoringSessionCommand',
  'applyUiAuthoringSessionCommandV2',
  'applyUiDesignSystemPackChange',
  'applyUiDesignSystemPackChangeV2',
  'applyUiDocumentCommand',
  'applyUiDocumentCommandV2',
  'createUiAuthoringDetachedPlan',
  'createUiAuthoringSession',
  'createUiAuthoringSessionV2',
  'finalizeUiAuthoringDetachedPlan',
  'previewUiAuthoringDetachedPlan',
  'projectUiAuthoringDocument',
  'redoUiAuthoringSession',
  'redoUiAuthoringSessionV2',
  'undoUiAuthoringSession',
  'undoUiAuthoringSessionV2',
];
for (const name of requiredFunctions) {
  if (typeof jdw[name] !== 'function') {
    throw new TypeError('Packed JDW CommonJS root is missing function export: ' + name);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-ui-authoring-runtime.mjs'),
    `import * as jdw from '@workbench-kit/jdw';

const requiredFunctions = [
  'applyUiAuthoringSessionCommand',
  'applyUiAuthoringSessionCommandV2',
  'applyUiDesignSystemPackChange',
  'applyUiDesignSystemPackChangeV2',
  'applyUiDocumentCommand',
  'applyUiDocumentCommandV2',
  'createUiAuthoringDetachedPlan',
  'createUiAuthoringSession',
  'createUiAuthoringSessionV2',
  'finalizeUiAuthoringDetachedPlan',
  'previewUiAuthoringDetachedPlan',
  'projectUiAuthoringDocument',
  'redoUiAuthoringSession',
  'redoUiAuthoringSessionV2',
  'undoUiAuthoringSession',
  'undoUiAuthoringSessionV2',
];
for (const name of requiredFunctions) {
  if (typeof jdw[name] !== 'function') {
    throw new TypeError('Packed JDW ESM root is missing function export: ' + name);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'strict-field-remap.ts'),
    `import { projectValueTransformToNodeType } from '@workbench-kit/field-remap';

export const packedStrictFieldRemapProjection = projectValueTransformToNodeType(
  {
    id: 'packed:identity',
    label: 'Identity',
    inputTypes: ['string'],
    outputType: 'string',
    apply: (value) => value,
  },
  { nodeTypeRef: { id: 'packed.identity', version: '1.0.0' } },
);
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'focused-command-host-controller.ts'),
    `import {
  WorkbenchCommandHostController,
  type WorkbenchCommandHostControllerProps,
  type WorkbenchCommandHostExecutor,
} from '@workbench-kit/shell-react/command-host-controller';

const executeCommand: WorkbenchCommandHostExecutor = () => undefined;
const props = {
  commands: [],
  executeCommand,
} satisfies WorkbenchCommandHostControllerProps;

(globalThis as typeof globalThis & { __workbenchKitCommandHostController?: unknown })
  .__workbenchKitCommandHostController = Object.freeze({
  WorkbenchCommandHostController,
  props,
});
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
    'focused-command-host-controller',
    path.join(consumerDir, 'src', 'focused-command-host-controller.ts'),
    focusedCommandHostControllerOutputDir,
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
    sourcemap: true,
  },
};
`,
  );
}

function buildFocusedConsumer(name) {
  console.log(`[check-packed-consumer] Building ${name} consumer...`);
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, `vite.${name}.config.mjs`)],
    { cwd: repoRoot, stdio: 'inherit' },
  );
}

function collectInitialJavaScriptSources(outputDirectory, label) {
  const manifest = readJson(path.join(outputDirectory, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error(`${label} consumer emitted no Vite entry.`);

  const sources = [];
  for (const entry of collectStaticEntries(manifest, entryKey).filter((candidate) =>
    candidate.file?.endsWith('.js'),
  )) {
    const chunkPath = path.join(outputDirectory, entry.file);
    const sourceMap = readJson(`${chunkPath}.map`);
    sources.push(...(sourceMap.sources ?? []));
  }
  if (sources.length === 0) throw new Error(`${label} emitted no source-map evidence.`);
  return sources;
}

function verifyFocusedCommandHostControllerOutput() {
  const sources = collectInitialJavaScriptSources(
    focusedCommandHostControllerOutputDir,
    'focused command-host controller',
  );
  const normalizedSources = sources.map((source) =>
    `/${source.replaceAll('\\', '/')}`.toLowerCase(),
  );
  const requiredSourceSegments = [
    '/@workbench-kit/shell-react/src/workbench/command-host-controller.tsx',
    '/@workbench-kit/react/src/workbench/commands/commandpalette.tsx',
    '/@workbench-kit/react/src/workbench/commands/shortcutcommandbridge.tsx',
    '/@workbench-kit/react/src/workbench/commands/workbenchquickopen.tsx',
    '/@workbench-kit/platform/src/commands/command-contributions.ts',
  ];
  const forbiddenSourceSegments = [
    '/@workbench-kit/shell-react/src/shell/provider',
    '/@workbench-kit/shell-react/src/extensions/',
    '/@workbench-kit/workbench-core/',
    '/packages/workbench-core/',
  ];

  for (const requiredSegment of requiredSourceSegments) {
    if (!normalizedSources.some((source) => source.includes(requiredSegment))) {
      throw new Error(
        `Focused command-host controller consumer is missing retained source ${requiredSegment}.`,
      );
    }
  }

  const forbiddenSources = normalizedSources.filter((source) =>
    forbiddenSourceSegments.some((segment) => source.includes(segment)),
  );
  if (forbiddenSources.length > 0) {
    throw new Error(
      `Focused command-host controller pulled the provider/extension graph:\n${[
        ...new Set(forbiddenSources),
      ].join('\n')}`,
    );
  }

  console.log(
    `[check-packed-consumer] focused command-host controller graph OK (${sources.length} source-map entries).`,
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
