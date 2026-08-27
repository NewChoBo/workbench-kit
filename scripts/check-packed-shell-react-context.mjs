import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runCommand } from './lib/run-command.mjs';
import { NPM_PUBLISH_ORDER, packageDirectoryNameForPackageName } from './npm-publish-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-packed-shell-context-'));
const pack = path.join(fixture, 'pack');
const consumer = path.join(fixture, 'consumer');
const source = path.join(consumer, 'src');
const pnpmVersion = json(path.join(root, 'package.json')).packageManager?.replace(/^pnpm@/u, '');
const cases = [
  ['provider', false, false],
  ['provider-command-host', true, false],
  ['provider-host-shell', false, true],
  ['provider-command-host-host-shell', true, true],
];
const managementCaseName = 'provider-command-host-host-shell';
const selectedCases = process.env.WBK_PACKED_CONTEXT_CASE
  ? cases.filter(([name]) => name === process.env.WBK_PACKED_CONTEXT_CASE)
  : cases;
if (selectedCases.length === 0) throw new Error('Unknown WBK_PACKED_CONTEXT_CASE.');
let primary;
let externalBrowser;
const cleanup = [];
try {
  assertPnpm();
  fs.mkdirSync(pack, { recursive: true });
  fs.mkdirSync(source, { recursive: true });
  const tarballs = packCohort();
  const dependencies = exactDependencies(tarballs);
  writeConsumer(dependencies, scopedOverrides(dependencies));
  generateAndGuardLock(tarballs);
  command('pnpm', ['install', '--offline', '--frozen-lockfile'], consumer);
  assertChromiumIdentity();
  writeCases();
  const playwrightModule = await externalImport('playwright');
  const playwright = playwrightModule.default ?? playwrightModule;
  externalBrowser = await playwright.chromium.launch({ headless: true });
  const results = await Promise.allSettled(
    selectedCases.map(async (testCase) => {
      console.log(`[check-packed-shell-react-context] running ${testCase[0]}.`);
      await runCase(testCase, externalBrowser);
      console.log(`[check-packed-shell-react-context] passed ${testCase[0]}.`);
    }),
  );
  const caseErrors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason);
  if (caseErrors.length) throw new AggregateError(caseErrors, 'Packed context matrix failed.');
  console.log(
    `[check-packed-shell-react-context] ${selectedCases.length} packed Vite/Chromium context case(s) OK.`,
  );
} catch (error) {
  primary = error;
} finally {
  try {
    await externalBrowser?.close();
  } catch (error) {
    cleanup.push(new Error('Failed to close external Chromium.', { cause: error }));
  }
  try {
    assertSafeFixture();
    fs.rmSync(fixture, { recursive: true, force: true });
  } catch (error) {
    cleanup.push(new Error('Failed to remove packed context fixture.', { cause: error }));
  }
}
if (primary || cleanup.length) {
  throw new AggregateError(
    [...(primary ? [primary] : []), ...cleanup],
    'Packed context check failed.',
  );
}

function assertPnpm() {
  if (!pnpmVersion) throw new Error('packageManager must pin pnpm exactly.');
  const actual = command('pnpm', ['--version'], root, true).trim();
  if (actual !== pnpmVersion) throw new Error(`Expected pnpm ${pnpmVersion}; received ${actual}.`);
}

function packCohort() {
  const result = {};
  for (const name of NPM_PUBLISH_ORDER) {
    const directory = path.join(root, 'packages', packageDirectoryNameForPackageName(name));
    const output = command('pnpm', ['pack', '--pack-destination', pack, '--json'], directory, true);
    const tarball = path.join(pack, path.basename(JSON.parse(output.trim()).filename));
    if (!fs.existsSync(tarball)) throw new Error(`Fresh tarball missing for ${name}.`);
    result[name] = `file:${path.relative(consumer, tarball).replaceAll('\\', '/')}`;
  }
  return result;
}

function exactDependencies(tarballs) {
  const result = {};
  for (const name of [
    '@types/react',
    '@types/react-dom',
    '@vitejs/plugin-react',
    'playwright',
    'react',
    'react-dom',
    'vite',
  ]) {
    result[name] = version(name);
  }
  result['@types/node'] = version(
    '@types/node',
    resolveManifest('vite', createRequire(import.meta.url)),
  );
  result['playwright-core'] = result.playwright;
  for (const packageName of NPM_PUBLISH_ORDER) {
    const manifestPath = path.join(
      root,
      'packages',
      packageDirectoryNameForPackageName(packageName),
      'package.json',
    );
    const manifest = json(manifestPath);
    for (const name of [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]) {
      if (name.startsWith('@workbench-kit/')) continue;
      try {
        const resolved = version(name, manifestPath);
        if (result[name] && result[name] !== resolved)
          throw new Error(`Cohort conflict for ${name}.`);
        result[name] = resolved;
      } catch (error) {
        if (manifest.peerDependenciesMeta?.[name]?.optional !== true) throw error;
      }
    }
  }
  return { ...result, ...tarballs };
}

function scopedOverrides(dependencies) {
  const result = new Map();
  const visited = new Set();
  const visit = (name, resolver) => {
    if (name.startsWith('@workbench-kit/')) return;
    const manifestPath = resolveManifest(name, resolver);
    const realManifest = fs.realpathSync(manifestPath);
    if (visited.has(realManifest)) return;
    visited.add(realManifest);
    const manifest = json(realManifest);
    const childResolver = createRequire(realManifest);
    for (const childName of [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}).filter(
        (peer) => manifest.peerDependenciesMeta?.[peer]?.optional !== true,
      ),
    ]) {
      try {
        const childVersion = version(childName, realManifest);
        const selector = `${manifest.name}@${manifest.version}>${childName}`;
        const previous = result.get(selector);
        if (previous && previous !== childVersion)
          throw new Error(
            `Unrepresentable repository graph for ${selector}: ${previous} / ${childVersion}.`,
          );
        result.set(selector, childVersion);
        visit(childName, childResolver);
      } catch (error) {
        if (manifest.optionalDependencies?.[childName] === undefined) throw error;
      }
    }
  };
  const rootResolver = createRequire(import.meta.url);
  for (const [name, specifier] of Object.entries(dependencies)) {
    if (!specifier.startsWith('file:')) {
      const resolver =
        name === 'playwright-core'
          ? createRequire(rootResolver.resolve('playwright'))
          : name === '@types/node'
            ? createRequire(resolveManifest('vite', rootResolver))
            : dependencySeedResolver(name, rootResolver);
      visit(name, resolver);
    }
  }
  return result;
}

function dependencySeedResolver(name, fallback) {
  for (const packageName of NPM_PUBLISH_ORDER) {
    const manifestPath = path.join(
      root,
      'packages',
      packageDirectoryNameForPackageName(packageName),
      'package.json',
    );
    const manifest = json(manifestPath);
    if (
      manifest.dependencies?.[name] !== undefined ||
      manifest.peerDependencies?.[name] !== undefined
    )
      return createRequire(manifestPath);
  }
  return fallback;
}

function writeConsumer(dependencies, overrides) {
  for (const [name, specifier] of Object.entries(dependencies)) {
    if (name.startsWith('@workbench-kit/')) overrides.set(name, specifier);
  }
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    `${JSON.stringify({ name: 'packed-shell-context-consumer', private: true, type: 'module', packageManager: `pnpm@${pnpmVersion}`, dependencies }, null, 2)}\n`,
  );
  const constraints = [...overrides]
    .sort()
    .map(([key, value]) => `  '${key}': ${value}`)
    .join('\n');
  fs.writeFileSync(
    path.join(consumer, 'pnpm-workspace.yaml'),
    `packages:\n  - '.'\nallowBuilds:\n  esbuild: true\noverrides:\n${constraints}\n`,
  );
}

function generateAndGuardLock(tarballs) {
  command('pnpm', ['install', '--lockfile-only', '--offline', '--no-frozen-lockfile'], consumer);
  const repository = lockGraph(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'));
  const generatedPath = path.join(consumer, 'pnpm-lock.yaml');
  const generatedText = fs.readFileSync(generatedPath, 'utf8');
  const generated = lockGraph(generatedText);
  for (const [key, edges] of generated) {
    if (key.includes('@workbench-kit/')) {
      if (!key.includes('file:../pack/'))
        throw new Error(`Workbench snapshot is not a fresh packed input: ${key}.`);
      continue;
    }
    if (key.includes('file:../pack/'))
      throw new Error(`Unexpected non-Workbench packed snapshot: ${key}.`);
    const admitted = repository.get(key);
    if (!admitted) {
      const incoming = [...generated]
        .filter(([, candidateEdges]) =>
          [...candidateEdges].some((edge) => edge.startsWith(`${snapshotPackageName(key)}=`)),
        )
        .map(([parent]) => parent);
      throw new Error(
        `Snapshot absent from repository lock: ${key}. Incoming: ${incoming.join(', ') || 'importer'}.`,
      );
    }
    for (const edge of edges)
      if (!admitted.has(edge))
        throw new Error(`Edge absent from repository lock: ${key} -> ${edge}.`);
  }
  for (const [name, input] of Object.entries(tarballs)) {
    if (!generatedText.includes(input))
      throw new Error(`Packed input is not lock-backed: ${name}.`);
  }
}

function snapshotPackageName(key) {
  const unquoted = key.replace(/^'|'$/gu, '');
  const withoutPeers = unquoted.replace(/\(.+$/u, '');
  const match = /^(?<name>@[^/]+\/[^@]+|[^@]+)@/u.exec(withoutPeers);
  return match?.groups?.name ?? withoutPeers;
}

function lockGraph(text) {
  const result = new Map();
  let snapshots = false;
  let current;
  let deps = false;
  let pending;
  for (const line of text.split(/\r?\n/u)) {
    if (line === 'snapshots:') {
      snapshots = true;
      continue;
    }
    if (snapshots && /^\S/u.test(line)) break;
    if (!snapshots) continue;
    const key = /^ {2}(.+):$/u.exec(line)?.[1];
    if (key) {
      current = key;
      result.set(key, new Set());
      deps = false;
      pending = undefined;
      continue;
    }
    if (/^ {4}(?:dependencies|optionalDependencies):$/u.test(line)) {
      deps = true;
      continue;
    }
    if (/^ {4}\S/u.test(line)) {
      deps = false;
      pending = undefined;
    }
    if (!deps || !current) continue;
    const scalar = /^ {6}([^:]+): (.+)$/u.exec(line);
    if (scalar) result.get(current).add(`${scalar[1]}=${scalar[2]}`);
    const nested = /^ {6}([^:]+):$/u.exec(line);
    if (nested) pending = nested[1];
    const resolved = /^ {8}version: (.+)$/u.exec(line);
    if (resolved && pending) {
      result.get(current).add(`${pending}=${resolved[1]}`);
      pending = undefined;
    }
  }
  return result;
}

function assertChromiumIdentity() {
  const local = chromiumIdentity(createRequire(import.meta.url));
  const external = chromiumIdentity(createRequire(path.join(consumer, 'package.json')));
  if (
    local.version !== external.version ||
    JSON.stringify(local.descriptors) !== JSON.stringify(external.descriptors)
  ) {
    throw new Error(
      'External Playwright/Chromium descriptor or revision differs from repository cohort.',
    );
  }
  if (!fs.existsSync(external.executable))
    throw new Error(`External Chromium executable missing: ${external.executable}.`);
}

function chromiumIdentity(resolver) {
  const playwright = resolver('playwright');
  const playwrightResolver = createRequire(resolver.resolve('playwright'));
  const corePath = playwrightResolver.resolve('playwright-core/package.json');
  const descriptors = json(path.join(path.dirname(corePath), 'browsers.json')).browsers.filter(
    ({ name }) => name === 'chromium' || name === 'chromium-headless-shell',
  );
  if (!descriptors.length) throw new Error('Chromium descriptors are missing.');
  return {
    descriptors,
    executable: playwright.chromium.executablePath(),
    version: json(resolver.resolve('playwright/package.json')).version,
  };
}

function writeCases() {
  fs.writeFileSync(
    path.join(source, 'management.jsx'),
    `import React, { useEffect } from 'react';
import { WorkbenchKeybindingManagementSettingsView as ProductManagementSettingsView } from '@workbench-kit/shell-react/keybinding-management-settings';
const evaluationKey = 'wbk-management-evaluations';
sessionStorage.setItem(evaluationKey, String(Number(sessionStorage.getItem(evaluationKey) ?? '0') + 1));
export function LazyKeybindingManagementSettingsView(props) {
  useEffect(() => {
    const mountKey = 'wbk-management-mounts';
    sessionStorage.setItem(mountKey, String(Number(sessionStorage.getItem(mountKey) ?? '0') + 1));
  }, []);
  return <ProductManagementSettingsView {...props} />;
}
`,
  );
  for (const [name, commandHost, hostShell] of cases) {
    fs.writeFileSync(
      path.join(consumer, `${name}.html`),
      `<!doctype html><html><body><div id="root"></div><script type="module" src="/src/${name}.jsx"></script></body></html>\n`,
    );
    const commandImport = commandHost
      ? "import { WorkbenchCommandHost } from '@workbench-kit/shell-react/command-host';"
      : '';
    const shellImport = hostShell
      ? "import { WorkbenchHostShell } from '@workbench-kit/shell-react/host-shell';"
      : '';
    const management = name === managementCaseName;
    const commandElement = commandHost
      ? `<WorkbenchCommandHost enableCommandPalette={false} ${management ? 'enableExtensionKeybindings={false} enableShortcutBridge ' : ''}enableQuickOpen={false} onOpenSettings={() => undefined} />`
      : '';
    const content = management
      ? '<><output data-testid="ready">ready</output><Probe /><button data-testid="dispatch-target" type="button">Dispatch target</button>{ManagementView ? <ManagementView {...managementBinding} /> : <button type="button" onClick={loadManagement}>Load keyboard management</button>}</>'
      : '<><output data-testid="ready">ready</output><Probe /></>';
    const body = hostShell ? `<WorkbenchHostShell editorArea={${content}} />` : content;
    const reactImport = management
      ? "import React, { useEffect, useState } from 'react';"
      : "import React from 'react';";
    const probe = management
      ? `function Probe() { const { layoutService } = useWorkbench(); const [state, setState] = useState(() => ({ active: layoutService.isFocusModeActive(), transitions: 0 })); useEffect(() => { const disposable = layoutService.onDidChangeLayout(() => setState((current) => ({ active: layoutService.isFocusModeActive(), transitions: current.transitions + 1 }))); return () => disposable.dispose(); }, [layoutService]); return <output data-active={String(state.active)} data-testid="probe" data-transitions={state.transitions}>{String(state.active)}</output>; }`
      : `function Probe() { const { layoutService } = useWorkbench(); return <output data-testid="probe">{String(layoutService.isFocusModeActive())}</output>; }`;
    const managementState = management
      ? `const managementBinding = useWorkbenchKeybindingManagementBinding(); const [ManagementView, setManagementView] = useState(null); const loadManagement = async () => { const module = await import('./management.jsx'); setManagementView(() => module.LazyKeybindingManagementSettingsView); };`
      : '';
    const providerImport = management
      ? 'WorkbenchProvider, useWorkbench, useWorkbenchKeybindingManagementBinding'
      : 'WorkbenchProvider, useWorkbench';
    fs.writeFileSync(
      path.join(source, `${name}.jsx`),
      `${reactImport}\nimport { createRoot } from 'react-dom/client';\n${commandImport}\n${shellImport}\nimport { ${providerImport} } from '@workbench-kit/shell-react/provider';\nconst key = 'wbk-boots-${name}'; sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));\n${probe}\nfunction ProviderChildren() { ${managementState} return <React.Fragment>${commandElement}${body}</React.Fragment>; }\nfunction App() { return <WorkbenchProvider availableExtensions={[]} persistEditorState={false} persistKeybindingOverrides={false} persistLayout={false} persistLocalPreferences={false}><ProviderChildren /></WorkbenchProvider>; }\ncreateRoot(document.getElementById('root')).render(<App />);\n`,
    );
  }
}

async function runCase([name], browser) {
  let server;
  let context;
  let page;
  let failure;
  const observed = [];
  let managementRequestCount = 0;
  const managementRequestTimes = [];
  let managementRequestAllowed = false;
  try {
    const vite = await externalImport('vite');
    const reactPlugin = (await externalImport('@vitejs/plugin-react')).default;
    const port = await reservePort();
    server = await timeout(
      vite.createServer({
        configFile: false,
        cacheDir: path.join(consumer, `.vite-${name}`),
        logLevel: 'error',
        // Prebundle only the public runtime CJS leaves needed by the initial shell graph.
        optimizeDeps: { include: ['@xyflow/react', 'react-markdown'] },
        plugins: [reactPlugin()],
        root: consumer,
        server: { host: '127.0.0.1', port, strictPort: true },
      }),
      15_000,
      `${name}: Vite creation timed out.`,
    );
    await timeout(server.listen(), 15_000, `${name}: Vite readiness timed out.`);
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string' || address.address !== '127.0.0.1')
      throw new Error(`${name}: Vite did not bind fresh IPv4 loopback.`);
    context = await browser.newContext();
    page = await context.newPage();
    let navigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });
    page.on('pageerror', (error) => observed.push(`pageerror: ${error.message}`));
    page.on('request', (request) => {
      if (!request.url().includes('/src/management.jsx')) return;
      managementRequestCount += 1;
      managementRequestTimes.push(Date.now());
      if (!managementRequestAllowed)
        observed.push('Management entry was requested before explicit activation.');
    });
    page.on('console', (message) => {
      const text = message.text();
      const allowed =
        (message.type() === 'debug' &&
          ['[vite] connecting...', '[vite] connected.'].includes(text)) ||
        (message.type() === 'info' && text.startsWith('%cDownload the React DevTools'));
      if (!allowed) observed.push(`console.${message.type()}: ${text}`);
    });
    await page.goto(`http://127.0.0.1:${address.port}/${name}.html`, {
      waitUntil: 'networkidle',
      timeout: 20_000,
    });
    await page.getByTestId('ready').waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByTestId('probe').waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(500);
    const boots = await page.evaluate(
      (key) => Number(sessionStorage.getItem(key)),
      `wbk-boots-${name}`,
    );
    if (boots !== 1 || navigations !== 1)
      throw new Error(
        `${name}: optimizer reload false-pass (${boots} boots, ${navigations} navigations).`,
      );
    if (observed.length) throw new Error(`${name}:\n${observed.join('\n')}`);
    if (name === managementCaseName) {
      const initialMarkers = await managementMarkers(page);
      if (
        managementRequestCount !== 0 ||
        initialMarkers.evaluations !== 0 ||
        initialMarkers.mounts !== 0
      )
        throw new Error(
          `${name}: management ran before activation (requests=${managementRequestCount}, evaluations=${initialMarkers.evaluations}, mounts=${initialMarkers.mounts}).`,
        );
      assertLazyViewOptimizerIsolation(path.join(consumer, `.vite-${name}`));
      managementRequestAllowed = true;
      const activationTimestamp = Date.now();
      await runManagementPhase(page, name);
      assertLazyViewOptimizerIsolation(path.join(consumer, `.vite-${name}`));
      const bootsAfterManagement = await page.evaluate(
        (key) => Number(sessionStorage.getItem(key)),
        `wbk-boots-${name}`,
      );
      if (bootsAfterManagement !== 1 || navigations !== 1)
        throw new Error(
          `${name}: lazy management optimizer reload false-pass (${bootsAfterManagement} boots, ${navigations} navigations).`,
        );
      const activatedMarkers = await managementMarkers(page);
      if (
        managementRequestCount !== 1 ||
        managementRequestTimes[0] < activationTimestamp ||
        activatedMarkers.evaluations !== 1 ||
        activatedMarkers.mounts !== 1
      )
        throw new Error(
          `${name}: invalid lazy activation evidence (requests=${managementRequestCount}, requestTimes=${managementRequestTimes.join(',') || 'none'}, activation=${activationTimestamp}, evaluations=${activatedMarkers.evaluations}, mounts=${activatedMarkers.mounts}).`,
        );
      if (observed.length) throw new Error(`${name}:\n${observed.join('\n')}`);
    }
  } catch (error) {
    const optimizer = collectOptimizerEvidence(path.join(consumer, `.vite-${name}`));
    failure = new Error(`${name}: ${error.message}\n${observed.join('\n')}\n${optimizer}`, {
      cause: error,
    });
    console.error(`[check-packed-shell-react-context] ${failure.message}`);
  } finally {
    const errors = [];
    for (const [label, resource] of [
      ['page', page],
      ['context', context],
      ['server', server],
    ]) {
      try {
        await resource?.close();
      } catch (error) {
        errors.push(new Error(`${name}: failed to close ${label}.`, { cause: error }));
      }
    }
    /* eslint-disable no-unsafe-finally -- Cleanup failures are part of this case's verdict. */
    if (failure || errors.length)
      throw new AggregateError([...(failure ? [failure] : []), ...errors], `${name} failed.`);
    /* eslint-enable no-unsafe-finally */
  }
}

async function managementMarkers(page) {
  return page.evaluate(() => ({
    evaluations: Number(sessionStorage.getItem('wbk-management-evaluations') ?? '0'),
    mounts: Number(sessionStorage.getItem('wbk-management-mounts') ?? '0'),
  }));
}

function assertLazyViewOptimizerIsolation(cacheDir) {
  const depsDir = path.join(cacheDir, 'deps');
  const metadataPath = path.join(depsDir, '_metadata.json');
  if (!fs.existsSync(metadataPath))
    throw new Error(`Focused optimizer metadata is missing: ${metadataPath}.`);
  const metadata = json(metadataPath);
  const providerKey = '@workbench-kit/shell-react/provider';
  const managementKey = '@workbench-kit/shell-react/keybinding-management-settings';
  const providerFile = optionalOptimizedEntryFile(metadata, depsDir, providerKey);
  const managementFile = optimizedEntryFile(metadata, depsDir, managementKey);
  const providerGraph = providerFile ? optimizedImportGraph(providerFile, depsDir) : undefined;
  const managementGraph = optimizedImportGraph(managementFile, depsDir);
  const missingProviderMarker = 'useWorkbench must be used inside WorkbenchProvider.';
  const optimizedFiles = fs
    .readdirSync(depsDir)
    .filter((entry) => entry.endsWith('.js'))
    .map((entry) => path.join(depsDir, entry));
  const ownerFiles = optimizedFiles.filter((file) =>
    fs.readFileSync(file, 'utf8').includes(missingProviderMarker),
  );
  if (ownerFiles.length > 1)
    throw new Error(
      `Expected at most one optimized Provider owner; found ${ownerFiles.length}: ${optimizerFilesEvidence(ownerFiles, depsDir)}.`,
    );
  const ownerFile = ownerFiles[0];
  if (providerGraph && (!ownerFile || !providerGraph.has(ownerFile)))
    throw new Error(
      `Focused Provider optimizer entry does not reach exactly one canonical owner: provider=${optimizerFilesEvidence(providerGraph, depsDir)}; owner=${ownerFile ? path.basename(ownerFile) : 'none'}.`,
    );
  if (ownerFile && managementGraph.has(ownerFile))
    throw new Error(
      `Lazy Settings View graph reaches the Provider owner: management=${optimizerFilesEvidence(managementGraph, depsDir)}; owner=${path.basename(ownerFile)}.`,
    );

  const providerContextFiles = [...managementGraph].filter((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return (
      text.includes(missingProviderMarker) ||
      (text.includes('WorkbenchContext') && text.includes('createContext')) ||
      (text.includes('WorkbenchProvider') && text.includes('createContext'))
    );
  });
  if (providerContextFiles.length)
    throw new Error(
      `Lazy Settings View optimizer graph contains a Provider/context body: ${optimizerFilesEvidence(providerContextFiles, depsDir)}.`,
    );
}

function optionalOptimizedEntryFile(metadata, depsDir, key) {
  if (metadata.optimized?.[key] === undefined) return undefined;
  return optimizedEntryFile(metadata, depsDir, key);
}

function optimizedEntryFile(metadata, depsDir, key) {
  const relative = metadata.optimized?.[key]?.file;
  if (typeof relative !== 'string' || !relative.endsWith('.js'))
    throw new Error(
      `Focused optimized entry is missing for ${key}; available=${Object.keys(metadata.optimized ?? {}).join(', ') || 'none'}.`,
    );
  const file = path.resolve(depsDir, relative);
  if (path.dirname(file) !== path.resolve(depsDir) || !fs.existsSync(file))
    throw new Error(`Unsafe or missing optimized entry for ${key}: ${relative}.`);
  return file;
}

function optimizedImportGraph(entryFile, depsDir) {
  const graph = new Set();
  const pending = [entryFile];
  while (pending.length) {
    const file = pending.pop();
    if (graph.has(file)) continue;
    graph.add(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(
      /(?:\bfrom\s*|\bimport\s*)["'](?<specifier>\.[^"']+)["']/gu,
    )) {
      const specifier = match.groups.specifier.split(/[?#]/u, 1)[0];
      if (!specifier.endsWith('.js')) continue;
      const imported = path.resolve(path.dirname(file), specifier);
      if (path.dirname(imported) !== path.resolve(depsDir) || !imported.endsWith('.js'))
        throw new Error(
          `Optimized entry escaped its cache directory: ${file} -> ${match.groups.specifier}.`,
        );
      if (!fs.existsSync(imported))
        throw new Error(`Optimized import is missing: ${file} -> ${match.groups.specifier}.`);
      pending.push(imported);
    }
  }
  return graph;
}

function optimizerFilesEvidence(files, depsDir) {
  return (
    [...files].map((file) => path.relative(depsDir, file).replaceAll('\\', '/')).join(', ') ||
    'none'
  );
}

async function runManagementPhase(page, name) {
  await page.getByRole('button', { name: 'Load keyboard management' }).click();
  const shortcut = page.getByRole('button', {
    name: 'Keyboard shortcut for workbench.toggleFocusMode',
  });
  try {
    await shortcut.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (error) {
    const diagnostic = await page.locator('body').evaluate((body) => ({
      buttons: [...body.querySelectorAll('button')].map((button) => ({
        ariaLabel: button.getAttribute('aria-label'),
        text: button.textContent?.trim(),
      })),
      html: body.innerHTML,
      text: body.textContent?.trim(),
    }));
    throw new Error(
      `${name}: management did not render the expected command.\n${JSON.stringify(diagnostic)}`,
      {
        cause: error,
      },
    );
  }
  await page.waitForTimeout(500);

  await shortcut.click();
  await page.keyboard.press('Control+Shift+F10');
  await expectText(shortcut, 'Ctrl+Shift+F10', name);
  await settleCaptureBeforeDispatch(page, name, 'capture');

  await assertTransitionCount(page, 0, false, name);
  await page.keyboard.press('Control+Shift+F11');
  await awaitReactEffectTurn(page);
  await assertTransitionCount(page, 0, false, name);
  await page.keyboard.press('Control+Shift+F10');
  await awaitReactEffectTurn(page);
  await assertTransitionCount(page, 1, true, name);

  await page.getByRole('button', { name: 'Reset to default' }).click();
  await expectText(shortcut, 'Ctrl+Shift+F11', name);
  await settleCaptureBeforeDispatch(page, name, 'reset');
  await page.keyboard.press('Control+Shift+F10');
  await awaitReactEffectTurn(page);
  await assertTransitionCount(page, 1, true, name);
  await page.keyboard.press('Control+Shift+F11');
  await awaitReactEffectTurn(page);
  await assertTransitionCount(page, 2, false, name);
}

async function settleCaptureBeforeDispatch(page, name, phase) {
  const target = page.getByTestId('dispatch-target');
  await target.click();
  await assertDispatchTargetState(page, target, name, phase);
  await awaitReactEffectTurn(page);
  await assertDispatchTargetState(page, target, name, `${phase} effect`);
}

async function assertDispatchTargetState(page, target, name, phase) {
  const state = await target.evaluate((element) => ({
    active: globalThis.document.activeElement === element,
    recording: globalThis.document.querySelectorAll(
      '[data-workbench-shortcut-capture-recording="true"]',
    ).length,
  }));
  if (!state.active || state.recording !== 0)
    throw new Error(
      `${name}: ${phase} cleanup did not leave the dispatch target focused with capture inactive (active=${state.active}, recording=${state.recording}).`,
    );
  if (page.isClosed()) throw new Error(`${name}: page closed during ${phase} cleanup.`);
}

async function awaitReactEffectTurn(page) {
  await page.evaluate(() => new Promise((resolve) => globalThis.setTimeout(resolve, 0)));
}

async function expectText(locator, expected, name) {
  await locator.waitFor({ state: 'visible', timeout: 5_000 });
  const actual = (await locator.textContent())?.trim();
  if (actual !== expected)
    throw new Error(`${name}: expected text ${expected}; received ${actual}.`);
}

async function assertTransitionCount(page, transitions, active, name) {
  await page.waitForFunction(
    ({ active: expectedActive, transitions: expectedTransitions }) => {
      const element = globalThis.document.querySelector('[data-testid="probe"]');
      return (
        element?.getAttribute('data-active') === String(expectedActive) &&
        element?.getAttribute('data-transitions') === String(expectedTransitions)
      );
    },
    { active, transitions },
    { timeout: 5_000 },
  );
  const actual = Number(await page.getByTestId('probe').getAttribute('data-transitions'));
  if (actual !== transitions)
    throw new Error(`${name}: expected ${transitions} transitions; received ${actual}.`);
}

function collectOptimizerEvidence(cacheDir) {
  const metadataPath = path.join(cacheDir, 'deps', '_metadata.json');
  const metadata = fs.existsSync(metadataPath) ? fs.readFileSync(metadataPath, 'utf8') : 'missing';
  const hits = [];
  const depsDir = path.join(cacheDir, 'deps');
  if (fs.existsSync(depsDir)) {
    for (const entry of fs.readdirSync(depsDir)) {
      if (!entry.endsWith('.js')) continue;
      const file = path.join(depsDir, entry);
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('WorkbenchContext') || text.includes('useWorkbench must be used inside'))
        hits.push(entry);
    }
  }
  return `optimizer metadata=${metadata}; context chunks=${hits.join(', ') || 'none'}`;
}

async function externalImport(name) {
  const resolver = createRequire(path.join(consumer, 'package.json'));
  return import(pathToFileURL(resolver.resolve(name)).href);
}
function version(name, from = import.meta.url) {
  const resolver = createRequire(from);
  return json(resolveManifest(name, resolver)).version;
}
function resolveManifest(name, resolver) {
  try {
    return fs.realpathSync(resolver.resolve(`${name}/package.json`));
  } catch {
    for (const searchPath of resolver.resolve.paths(name) ?? []) {
      const candidate = path.join(searchPath, ...name.split('/'), 'package.json');
      if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    }
    let directory = path.dirname(fs.realpathSync(resolver.resolve(name)));
    while (directory !== path.dirname(directory)) {
      const manifest = path.join(directory, 'package.json');
      if (fs.existsSync(manifest) && json(manifest).name === name) return manifest;
      directory = path.dirname(directory);
    }
  }
  throw new Error(`Could not resolve package metadata for ${name}.`);
}
function json(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function command(executable, args, cwd, capture = false) {
  return runCommand(executable, args, {
    cwd,
    ...(capture
      ? { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
      : { stdio: 'inherit' }),
  });
}
function timeout(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}
function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not reserve IPv4 loopback port.'));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}
function assertSafeFixture() {
  const resolved = path.resolve(fixture);
  if (
    path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
    !path.basename(resolved).startsWith('wbk-packed-shell-context-')
  )
    throw new Error(`Unsafe fixture path: ${resolved}.`);
}
