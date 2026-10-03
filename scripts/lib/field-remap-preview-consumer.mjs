import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { validatePackedPackageCohort } from './packed-package-cohort.mjs';
import { runCommand } from './run-command.mjs';

const previewPackages = ['@workbench-kit/contracts', '@workbench-kit/field-remap'];
const forbiddenPackages = [
  '@workbench-kit/shell-react',
  '@workbench-kit/react',
  '@workbench-kit/jdw',
  '@workbench-kit/monaco',
  '@workbench-kit/workbench-core',
  'react',
  'react-dom',
  '@xyflow/react',
  'jsonata',
  'monaco-editor',
  '@types/react',
  '@types/react-dom',
];

/** Uses the aggregate's packed bytes; never builds, packs, or installs packages. */
export function verifyPackedFieldRemapPreview({
  repoRoot,
  fixtureRoot,
  nodeModulesDir,
  expectedVersion,
}) {
  const independent = fs.mkdtempSync(path.join(fixtureRoot, 'preview-independent-'));
  const independentModules = path.join(independent, 'node_modules');
  const manifests = new Map();
  const packageRoots = [];

  for (const name of previewPackages) {
    const source = path.join(nodeModulesDir, name);
    assertNoSymlinks(source);
    const target = path.join(independentModules, name);
    fs.cpSync(source, target, { recursive: true });
    assertNoSymlinks(target);
    packageRoots.push(fs.realpathSync(target));
    manifests.set(name, readJson(path.join(target, 'package.json')));
  }
  validatePackedPackageCohort({
    expectedPackageNames: previewPackages,
    expectedVersion,
    manifests,
  });
  for (const [name, manifest] of manifests) {
    const declared = new Set(
      ['dependencies', 'peerDependencies', 'optionalDependencies'].flatMap((field) =>
        Object.keys(manifest[field] ?? {}),
      ),
    );
    assert.deepEqual(
      [...declared].sort(),
      name === '@workbench-kit/field-remap' ? ['@workbench-kit/contracts'] : [],
      `${name} has expanded the neutral preview install closure`,
    );
  }
  assert.deepEqual(fs.readdirSync(independentModules), ['@workbench-kit']);
  assert.deepEqual(fs.readdirSync(path.join(independentModules, '@workbench-kit')).sort(), [
    'contracts',
    'field-remap',
  ]);
  assert.equal(
    manifests.get('@workbench-kit/field-remap').exports['./preview'],
    './src/preview.ts',
  );

  const independentManifest = path.join(independent, 'package.json');
  fs.writeFileSync(
    independentManifest,
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: Object.fromEntries(previewPackages.map((name) => [name, expectedVersion])),
    }),
  );
  const resolveFromFixture = createRequire(independentManifest);
  for (const name of forbiddenPackages) {
    assert.throws(
      () => resolveFromFixture.resolve(name),
      (error) => error?.code === 'MODULE_NOT_FOUND',
      `Independent preview fixture unexpectedly resolves ${name}`,
    );
  }
  assert.ok(
    isWithin(packageRoots[1], resolveFromFixture.resolve('@workbench-kit/field-remap/preview')),
    'Neutral public entry escaped its packed package',
  );

  const input = path.join(independent, 'preview.ts');
  fs.writeFileSync(input, neutralConsumerSource);
  typecheckConsumer(repoRoot, independent, input, {
    jsx: false,
    exactOptionalPropertyTypes: true,
  });
  const output = buildConsumer(repoRoot, independent, input);
  const graph = readJson(path.join(output, 'module-graph.json'));
  assert.ok(Array.isArray(graph) && graph.length > 0, 'Missing preview module graph');
  assert.ok(
    graph.some((id) => id.replaceAll('\\', '/').endsWith('/field-remap/src/preview.ts')),
    'Packed consumer did not resolve the canonical preview implementation',
  );
  for (const id of graph) {
    assert.ok(path.isAbsolute(id), `Preview resolved an external or virtual module: ${id}`);
    const real = fs.realpathSync(id);
    assert.ok(
      real === fs.realpathSync(input) || packageRoots.some((root) => isWithin(root, real)),
      `Preview imported outside the two packed package trees: ${id}`,
    );
    assert.doesNotMatch(id, /\.(?:css|tsx)(?:\?|$)/u, 'Preview imported a UI asset');
  }
  executeConsumer(output, independent);

  // This is a separate full-consumer graph. Its UI dependencies cannot satisfy
  // imports from the sibling independent fixture above.
  const compatibility = fs.mkdtempSync(
    path.join(path.dirname(nodeModulesDir), 'preview-compatibility-'),
  );
  const compatibilityInput = path.join(compatibility, 'preview-compatibility.ts');
  fs.writeFileSync(compatibilityInput, compatibilityConsumerSource);
  // Match the established packed shell source-consumer mode. Only the new
  // neutral entry promises direct exact-optional source consumption here.
  typecheckConsumer(repoRoot, compatibility, compatibilityInput, {
    jsx: true,
    exactOptionalPropertyTypes: false,
  });
  const compatibilityOutput = buildConsumer(repoRoot, compatibility, compatibilityInput);
  executeConsumer(compatibilityOutput, compatibility);

  console.log(
    '[check-packed-consumer] Preview passed: two-package install closure, isolated headless runtime, and public factory identity.',
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isWithin(root, file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function assertNoSymlinks(directory) {
  assert.ok(!fs.lstatSync(directory).isSymbolicLink(), `Packed path is a symlink: ${directory}`);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), `Packed path is a symlink: ${entry.name}`);
    if (entry.isDirectory()) assertNoSymlinks(path.join(directory, entry.name));
  }
}

function typecheckConsumer(repoRoot, directory, input, { jsx, exactOptionalPropertyTypes }) {
  const config = path.join(directory, 'tsconfig.json');
  fs.writeFileSync(
    config,
    JSON.stringify({
      compilerOptions: {
        strict: true,
        exactOptionalPropertyTypes,
        noEmit: true,
        skipLibCheck: true,
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        types: [],
        ...(jsx ? { jsx: 'react-jsx' } : {}),
      },
      files: [input],
    }),
  );
  runCommand('pnpm', ['exec', 'tsc', '--project', config], { cwd: repoRoot, stdio: 'inherit' });
}

function buildConsumer(repoRoot, directory, input) {
  const output = path.join(directory, 'dist');
  const config = path.join(directory, 'vite.config.mjs');
  fs.writeFileSync(
    config,
    `export default {
  root: ${JSON.stringify(directory)},
  plugins: [{
    name: 'packed-preview-module-graph',
    generateBundle(_options, bundle) {
      this.emitFile({ type: 'asset', fileName: 'module-graph.json',
        source: JSON.stringify([...this.getModuleIds()].sort(), null, 2) });
      const rendered = Object.values(bundle).filter((item) => item.type === 'chunk')
        .flatMap((chunk) => Object.entries(chunk.modules)
          .filter(([, module]) => module.renderedLength > 0).map(([id]) => id));
      this.emitFile({ type: 'asset', fileName: 'rendered-module-graph.json',
        source: JSON.stringify([...new Set(rendered)].sort(), null, 2) });
    },
  }],
  build: {
    target: 'esnext',
    emptyOutDir: true,
    manifest: true,
    outDir: ${JSON.stringify(output)},
    rollupOptions: {
      input: ${JSON.stringify(input)},
      treeshake: { moduleSideEffects: false },
      output: { entryFileNames: 'assets/[name]-[hash].mjs' },
    },
  },
};\n`,
  );
  runCommand('pnpm', ['exec', 'vite', 'build', '--config', config], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  return output;
}

function executeConsumer(output, cwd) {
  const manifest = readJson(path.join(output, '.vite', 'manifest.json'));
  const entry = Object.values(manifest).find((candidate) => candidate.isEntry);
  assert.ok(entry?.file && !entry.css?.length, 'Preview fixture must emit JavaScript-only output');
  runCommand(process.execPath, [path.join(output, entry.file)], { cwd, stdio: 'inherit' });
}

const neutralConsumerSource = `
import {
  createFieldRemapPreviewController,
  type FieldRemapPreviewCommand,
  type FieldRemapPreviewController,
  type FieldRemapPreviewState,
} from '@workbench-kit/field-remap/preview';

if (typeof document !== 'undefined' || typeof window !== 'undefined') {
  throw new Error('Preview fixture must run without DOM globals');
}
type Evaluation = Extract<FieldRemapPreviewCommand, { kind: 'evaluate' }>;
type Ready = Extract<FieldRemapPreviewState, { status: 'ready' }>;
const input: Evaluation['input'] = {
  sources: [{ id: 'source.title', path: 'title', label: 'Title' }],
  targets: [{ id: 'target.label', path: 'label', label: 'Label' }],
  edges: [{ id: 'title', sourceFieldId: 'source.title', targetSlotId: 'target.label' }],
  inputs: { source: { title: 'neutral packed' } },
  transforms: { list: () => [], get: () => undefined, register: () => {}, apply: (_id, value) => value },
};
const controller: FieldRemapPreviewController = createFieldRemapPreviewController();
const states: string[] = [];
let finish!: (state: FieldRemapPreviewState) => void;
const completed = new Promise<FieldRemapPreviewState>((resolve) => { finish = resolve; });
const unsubscribe = controller.subscribe(() => {
  const snapshot = controller.getSnapshot();
  states.push(snapshot.status);
  if (snapshot.status === 'ready' || snapshot.status === 'error') finish(snapshot);
});
controller.update({ kind: 'evaluate', revision: 'packed', input });
const result = await completed;
if (result.status !== 'ready' || JSON.stringify(result.result.output) !== '{"label":"neutral packed"}') {
  throw new Error('Neutral packed default evaluator failed');
}
if (states.join(',') !== 'loading,ready') throw new Error('Preview subscription changed');
unsubscribe();
controller.dispose();
controller.update({ kind: 'hidden' });
if (controller.getSnapshot() !== result) throw new Error('Disposed preview owner changed');

const pending: Array<{ signal: AbortSignal; resolve: (result: Ready['result']) => void }> = [];
const latest = createFieldRemapPreviewController((request) => new Promise((resolve) => {
  if (!request.signal) throw new Error('Evaluator received no abort signal');
  pending.push({ signal: request.signal, resolve });
}));
latest.update({ kind: 'evaluate', revision: 'first', input });
latest.update({ kind: 'evaluate', revision: 'first', input });
if (pending.length !== 1) throw new Error('Same revision evaluated twice');
latest.update({ kind: 'evaluate', revision: 'second', input });
if (!pending[0].signal.aborted || pending[1].signal.aborted) throw new Error('Supersession did not abort');
pending[0].resolve({ output: { stale: true }, slots: [] });
await Promise.resolve();
await Promise.resolve();
if (latest.getSnapshot().status !== 'loading') throw new Error('Stale preview was published');
pending[1].resolve({ output: { current: true }, slots: [] });
await Promise.resolve();
await Promise.resolve();
const current = latest.getSnapshot();
if (current.status !== 'ready' || JSON.stringify(current.result.output) !== '{"current":true}') {
  throw new Error('Current preview result was lost');
}
latest.update({ kind: 'evaluate', revision: 'disposed', input });
latest.dispose();
latest.dispose();
if (!pending[2].signal.aborted) throw new Error('Disposal did not abort');
pending[2].resolve({ output: { late: true }, slots: [] });
await Promise.resolve();
await Promise.resolve();
if (latest.getSnapshot().status !== 'loading') throw new Error('Disposed owner published late output');
`;

const compatibilityConsumerSource = `
import {
  createFieldRemapPreviewController as legacyFactory,
  type FieldRemapPreviewCommand as LegacyCommand,
  type FieldRemapPreviewController as LegacyController,
  type FieldRemapPreviewState as LegacyState,
} from '@workbench-kit/shell-react/field-remap';
import {
  createFieldRemapPreviewController as neutralFactory,
  type FieldRemapPreviewCommand as NeutralCommand,
  type FieldRemapPreviewController as NeutralController,
  type FieldRemapPreviewState as NeutralState,
} from '@workbench-kit/field-remap/preview';
import type { FieldRemapPreviewState as RootState } from '@workbench-kit/shell-react';

if (!Object.is(legacyFactory, neutralFactory)) throw new Error('Preview has duplicate factory owners');
const neutral: NeutralController = neutralFactory();
const legacy: LegacyController = neutral;
const roundTrip: NeutralController = legacy;
const command: NeutralCommand = { kind: 'hidden' };
const legacyCommand: LegacyCommand = command;
const roundTripCommand: NeutralCommand = legacyCommand;
const seen: NeutralState[] = [];
const unsubscribe = legacy.subscribe(() => seen.push(neutral.getSnapshot()));
roundTrip.update(roundTripCommand);
const oldState: LegacyState = legacy.getSnapshot();
const rootState: RootState = oldState;
const neutralState: NeutralState = rootState;
if (seen.length !== 1 || seen[0] !== neutralState || legacy !== roundTrip) {
  throw new Error('Compatibility path did not share its preview owner');
}
unsubscribe();
neutral.dispose();
`;
