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
    const commandElement = commandHost
      ? '<WorkbenchCommandHost enableCommandPalette={false} enableQuickOpen={false} onOpenSettings={() => undefined} />'
      : '';
    const content = '<><output data-testid="ready">ready</output><Probe /></>';
    const body = hostShell ? `<WorkbenchHostShell editorArea={${content}} />` : content;
    fs.writeFileSync(
      path.join(source, `${name}.jsx`),
      `import React from 'react';\nimport { createRoot } from 'react-dom/client';\n${commandImport}\n${shellImport}\nimport { WorkbenchProvider, useWorkbench } from '@workbench-kit/shell-react/provider';\nconst key = 'wbk-boots-${name}'; sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));\nfunction Probe() { const { layoutService } = useWorkbench(); return <output data-testid="probe">{String(layoutService.isFocusModeActive())}</output>; }\nfunction App() { return <WorkbenchProvider availableExtensions={[]} persistEditorState={false} persistKeybindingOverrides={false} persistLayout={false} persistLocalPreferences={false}>${commandElement}${body}</WorkbenchProvider>; }\ncreateRoot(document.getElementById('root')).render(<App />);\n`,
    );
  }
}

async function runCase([name], browser) {
  let server;
  let context;
  let page;
  let failure;
  const observed = [];
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
