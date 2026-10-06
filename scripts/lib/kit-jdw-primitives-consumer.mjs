import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { runCommand } from './run-command.mjs';

/** Uses the caller's fresh extracted cohort. Never builds, packs, installs or publishes it. */
export function verifyPackedKitJdwPrimitives({
  repoRoot,
  fixtureRoot,
  nodeModulesDir,
  expectedVersion,
}) {
  const consumer = fs.mkdtempSync(path.join(path.dirname(nodeModulesDir), 'kit-jdw-primitives-'));
  const input = path.join(consumer, 'consumer.tsx');
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  const require = createRequire(path.join(consumer, 'package.json'));
  const packageRoots = [
    '@workbench-kit/react',
    '@workbench-kit/jdw',
    '@workbench-kit/contracts',
  ].map((name) => {
    const root = path.join(nodeModulesDir, name);
    assertNoSymlinks(root);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(manifest.version, expectedVersion);
    return fs.realpathSync(root);
  });
  assert.ok(isWithin(packageRoots[0], require.resolve('@workbench-kit/react/jdw')));
  assert.ok(isWithin(packageRoots[1], require.resolve('@workbench-kit/jdw')));
  assert.ok(isWithin(packageRoots[2], require.resolve('@workbench-kit/contracts')));
  fs.writeFileSync(input, consumerSource);
  const compilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    jsx: 'react-jsx',
    types: [],
  };
  const config = path.join(consumer, 'tsconfig.json');
  fs.writeFileSync(config, JSON.stringify({ compilerOptions, files: [input] }));
  runCommand('pnpm', ['exec', 'tsc', '--project', config], { cwd: repoRoot, stdio: 'inherit' });

  // Existing public React entries ship source. Match their established exact-optional
  // evidence lane: fresh declarations from those packed bytes, then an exact consumer.
  // Explicit roots include every KJ1 declaration and its real public barrel. Do not
  // pull unrelated, unreachable Storybook-only helpers into a consumer's type graph.
  assert.ok(isWithin(fs.realpathSync(fixtureRoot), fs.realpathSync(consumer)));
  const declarations = fs.mkdtempSync(path.join(consumer, 'declarations-'));
  const emit = path.join(consumer, 'tsconfig.emit.json');
  fs.writeFileSync(
    emit,
    JSON.stringify({
      compilerOptions: {
        ...compilerOptions,
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        rootDir: path.join(packageRoots[0], 'src'),
        outDir: declarations,
      },
      files: [
        require.resolve('@workbench-kit/react/jdw'),
        ...sourceFiles(path.join(packageRoots[0], 'src/jdw/kit-primitives')),
      ],
    }),
  );
  runCommand('pnpm', ['exec', 'tsc', '--project', emit], { cwd: repoRoot, stdio: 'inherit' });
  for (const file of [
    'contracts',
    'createKitJdwRegistry',
    'decode',
    'primitive-specs',
    'neutral-sample',
  ]) {
    assert.ok(
      fs.existsSync(path.join(declarations, 'jdw', 'kit-primitives', `${file}.d.ts`)),
      `Missing emitted public declaration: ${file}`,
    );
  }
  const exactInput = path.join(consumer, 'exact.ts');
  fs.writeFileSync(exactInput, exactSource);
  const exact = path.join(consumer, 'tsconfig.exact.json');
  fs.writeFileSync(
    exact,
    JSON.stringify({
      compilerOptions: {
        ...compilerOptions,
        exactOptionalPropertyTypes: true,
        paths: { '@workbench-kit/react/jdw': [path.join(declarations, 'jdw', 'index.d.ts')] },
      },
      files: [exactInput],
    }),
  );
  runCommand('pnpm', ['exec', 'tsc', '--project', exact], { cwd: repoRoot, stdio: 'inherit' });

  const output = path.join(consumer, 'dist');
  const outputFile = path.join(output, 'consumer.mjs');
  // Use Vite's installed esbuild backend for this bounded public-entry SSR proof.
  // React is a real consumer peer; no Kit package or source path is externalized.
  const toolingRequire = createRequire(path.join(repoRoot, 'package.json'));
  const viteRequire = createRequire(toolingRequire.resolve('vite/package.json'));
  const { buildSync } = viteRequire('esbuild');
  const bundle = buildSync({
    absWorkingDir: consumer,
    entryPoints: [input],
    outfile: outputFile,
    bundle: true,
    platform: 'node',
    target: 'es2020',
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react/*', 'react-dom', 'react-dom/*'],
    loader: { '.ttf': 'file', '.woff': 'file', '.woff2': 'file', '.svg': 'file', '.png': 'file' },
    metafile: true,
    logLevel: 'info',
  });
  fs.writeFileSync(path.join(output, 'metafile.json'), JSON.stringify(bundle.metafile, null, 2));
  const graph = Object.keys(bundle.metafile.inputs).map((id) => path.resolve(consumer, id));
  fs.writeFileSync(path.join(output, 'module-graph.json'), JSON.stringify(graph, null, 2));
  assert.ok(
    graph.some((id) =>
      id.replaceAll('\\', '/').endsWith('/react/src/jdw/kit-primitives/createKitJdwRegistry.tsx'),
    ),
  );
  const workbenchRoot = fs.realpathSync(path.join(nodeModulesDir, '@workbench-kit'));
  for (const id of graph) {
    if (!path.isAbsolute(id)) continue;
    assert.ok(
      !isWithin(path.join(repoRoot, 'packages'), id),
      `Consumer imported repository source: ${id}`,
    );
    if (!id.replaceAll('\\', '/').includes('/@workbench-kit/')) continue;
    const file = id.split('?')[0];
    if (fs.existsSync(file))
      assert.ok(
        isWithin(workbenchRoot, fs.realpathSync(file)),
        `Kit source escaped packed cohort: ${id}`,
      );
  }
  const entry = Object.entries(bundle.metafile.outputs).find(
    ([, value]) => value.entryPoint !== undefined,
  );
  assert.ok(entry?.[1].cssBundle, 'Actual primitive CSS was not included.');
  const css = fs.readFileSync(path.resolve(consumer, entry[1].cssBundle), 'utf8');
  for (const className of [
    'ui-button',
    'ui-icon-button',
    'ui-badge',
    'ui-workbench-media-slot',
    'ui-panel-loading',
  ]) {
    assert.ok(css.includes(className), `Missing primitive CSS: ${className}`);
  }
  runCommand(process.execPath, [outputFile], { cwd: consumer, stdio: 'inherit' });
  console.log(
    '[check-packed-consumer] Kit JDW: strict packed source, exact-optional declarations, builtin identity, descriptors, SSR and CSS passed.',
  );
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : /\.tsx?$/u.test(entry.name) && !/\.(?:test|stories)\.tsx?$/u.test(entry.name)
        ? [file]
        : [];
  });
}

function assertNoSymlinks(directory) {
  assert.ok(!fs.lstatSync(directory).isSymbolicLink(), `Packed path is linked: ${directory}`);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), `Packed file is linked: ${entry.name}`);
    if (entry.isDirectory()) assertNoSymlinks(path.join(directory, entry.name));
  }
}

function isWithin(root, file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

const consumerSource = `
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BUILTIN_JDW_REGISTRY, createKitJdwRegistry, decodeKitJdwPrimitive,
  KIT_JDW_PRIMITIVE_DESCRIPTORS, KIT_JDW_PRIMITIVES_SAMPLE, renderJdwNode,
  type KitJdwHostPort,
} from '@workbench-kit/react/jdw';
import { uiComponentContributionFromWidgetRegistry } from '@workbench-kit/contracts';
const snapshot = Object.freeze({ mode: 'live' as const, contextKey: {} });
let actions = 0;
const host: KitJdwHostPort = {
  getSnapshot: () => snapshot,
  subscribe: () => () => {},
  getAction: (key, context) => context === snapshot.contextKey && key === 'open'
    ? { state: 'ready', run: () => { actions++; } } : undefined,
  resolveMedia: (key, context) => context === snapshot.contextKey && key === 'cover'
    ? { imageUrl: 'https://example.invalid/ephemeral-cover.png' } : undefined,
};
const registry = createKitJdwRegistry({ host });
for (const definition of BUILTIN_JDW_REGISTRY.definitions()) {
  if (registry.definition(definition.type) !== definition || registry.get(definition.type) !== definition.build) throw new Error('Builtin identity changed');
}
if (BUILTIN_JDW_REGISTRY.has('kit.button.v1') || 'bind' in registry) throw new Error('Mutable or implicit registry change');
if (registry.has('kit.button.v2')) throw new Error('Unsupported version accepted');
for (const props of [{ label: 'Unsafe', onClick: 'run' }, { label: 'Unsafe', style: {} }, { label: 'Unsafe', actionKey: 'https://example.invalid' }]) {
  if (decodeKitJdwPrimitive('kit.button.v1', props).status !== 'invalid') throw new Error('Unsafe props accepted');
}
const contribution = uiComponentContributionFromWidgetRegistry('sample.kit', registry);
if (contribution.components.length !== 5 || KIT_JDW_PRIMITIVE_DESCRIPTORS.length !== 5) throw new Error('Descriptor contribution changed');
const original = JSON.stringify(KIT_JDW_PRIMITIVES_SAMPLE);
const markup = renderToStaticMarkup(<>{renderJdwNode(KIT_JDW_PRIMITIVES_SAMPLE, { registry, values: { record: { title: 'Packed sample', status: 'Ready' } } })}</>);
for (const className of ['ui-button', 'ui-icon-button', 'ui-badge', 'ui-workbench-media-slot', 'ui-panel-loading']) {
  if (!markup.includes(className)) throw new Error('Actual primitive missing: ' + className);
}
if (!markup.includes('ephemeral-cover.png') || !markup.includes('aria-label="More actions"')) throw new Error('Host resource or accessibility missing');
if (actions !== 0) throw new Error('SSR invoked an action');
if (JSON.stringify(KIT_JDW_PRIMITIVES_SAMPLE) !== original || original.includes('ephemeral-cover')) throw new Error('Ephemeral data persisted');
const loadingMarkup = (showSpinner?: boolean) => renderToStaticMarkup(<>{renderJdwNode({ type: 'kit.panel-loading.v1', args: { label: '  <Loading & details>  ', ...(showSpinner === undefined ? {} : { showSpinner }) } }, { registry })}</>);
const loading = loadingMarkup();
if (!loading.includes('role="status"') || !loading.includes('aria-live="polite"') || !loading.includes('aria-hidden="true"') || !loading.includes('  &lt;Loading &amp; details&gt;  ')) throw new Error('Loading SSR contract changed');
if (loadingMarkup(false).includes('codicon-loading')) throw new Error('Spinner false ignored');
console.log('Packed Kit JDW runtime passed.');
`;

const exactSource = `
import {
  createKitJdwRegistry, decodeKitJdwPrimitive, validateKitJdwLiteral,
  type CreateKitJdwRegistryOptions, type KitJdwHostPort, type KitJdwHostSnapshot,
  type KitJdwAction, type KitJdwDecodeResult, type KitJdwPanelLoadingProps, type KitJdwPrimitive,
} from '@workbench-kit/react/jdw';
const snapshot: KitJdwHostSnapshot = { mode: 'preview', contextKey: {} };
const action: KitJdwAction = { state: 'ready', run: () => undefined };
const host: KitJdwHostPort = {
  getSnapshot: () => snapshot, subscribe: () => () => undefined,
  getAction: () => action, resolveMedia: () => undefined,
};
type AssertNotAny<T> = 0 extends (1 & T) ? never : T;
const checkedAction: AssertNotAny<KitJdwAction> = action;
const checkedHost: AssertNotAny<KitJdwHostPort> = host;
const checkedFactory: AssertNotAny<typeof createKitJdwRegistry> = createKitJdwRegistry;
void checkedAction; void checkedHost; void checkedFactory;
const options: CreateKitJdwRegistryOptions = { host };
const registry = createKitJdwRegistry(options);
const result: KitJdwDecodeResult = decodeKitJdwPrimitive('kit.button.v1', { label: 'Strict' });
if (result.status === 'valid' && result.value.type === 'kit.button.v1') {
  const compact: boolean = result.value.props.compact;
  void compact;
}
const loadingProps: KitJdwPanelLoadingProps = { label: 'Loading', showSpinner: false };
const loadingPrimitive: Extract<KitJdwPrimitive, { type: 'kit.panel-loading.v1' }> = { type: 'kit.panel-loading.v1', props: loadingProps };
const loadingResult = decodeKitJdwPrimitive('kit.panel-loading.v1', { label: 'Loading' });
if (loadingResult.status === 'valid' && loadingResult.value.type === 'kit.panel-loading.v1') {
  const spinner: boolean = loadingResult.value.props.showSpinner;
  void spinner;
}
// @ts-expect-error Decoded spinner is required.
const missingSpinner: KitJdwPanelLoadingProps = { label: 'Loading' };
// @ts-expect-error Spinner is never undefined in decoded props.
const undefinedSpinner: KitJdwPanelLoadingProps = { label: 'Loading', showSpinner: undefined };
void loadingPrimitive; void missingSpinner; void undefinedSpinner;
const literalResult: string | undefined = validateKitJdwLiteral({ component: { id: 'kit.button.v1', version: '1', kind: 'atomic', designTime: { label: 'Button' } }, nodeId: 'sample', property: { id: 'label', value: { type: 'string' } }, value: 'Strict' });
void literalResult; void registry;
// @ts-expect-error A JSON command string is not a host capability.
const invalidAction: KitJdwAction = { state: 'ready', run: 'command:run' };
void invalidAction;
`;
