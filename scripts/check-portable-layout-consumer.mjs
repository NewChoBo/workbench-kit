import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { compile } from 'svelte/compiler';
import { source as svelteSource } from './fixtures/portable-layout-hosts/svelte-component.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const fixtureRoot = path.join(repoRoot, 'scripts/fixtures/portable-layout-hosts');
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-portable-layout-'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const run = (command, args, cwd = repoRoot) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4_000_000,
    windowsHide: true,
  });
const page = (
  host,
) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${host} portable layout</title></head><body>
<h1>${host}: shared layout actions</h1><p>Same packed core, framework-owned rendering and lifetime.</p>
<button id="unmount" type="button">Unmount host</button> <button id="mount" type="button">Mount host</button> <button id="reset" type="button">Reset layout</button>
<div id="host"></div><pre id="status" role="status">Starting</pre><script type="module" src="./entry.mjs"></script></body></html>`;

try {
  fs.writeFileSync(path.join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
  const packs = path.join(consumer, 'packs');
  fs.mkdirSync(packs);
  const tarballs = [];
  for (const name of ['base', 'workbench-core']) {
    run(
      'corepack',
      ['pnpm', 'pack', '--pack-destination', packs],
      path.join(repoRoot, 'packages', name),
    );
    const archive = fs.readdirSync(packs).find((file) => file.startsWith(`workbench-kit-${name}-`));
    if (!archive) throw new Error(`Missing ${name} tarball`);
    tarballs.push({ name, sha256: hash(fs.readFileSync(path.join(packs, archive))) });
    const target = path.join(consumer, 'node_modules/@workbench-kit', name);
    fs.mkdirSync(target, { recursive: true });
    run('tar', ['-xzf', path.join(packs, archive), '--strip-components=1', '-C', target]);
  }
  const typesPath = path.join(consumer, 'types.ts');
  fs.writeFileSync(
    typesPath,
    `import { LayoutService, createWorkbenchLayoutActions, type WorkbenchLayoutActions, type WorkbenchLayoutStateInput } from '@workbench-kit/workbench-core/layout';
const state: WorkbenchLayoutStateInput = {
  activityBar: { itemOrder: undefined, hiddenItemIds: undefined },
  sideBar: { activeViewContainer: undefined, sizePercent: undefined },
  panel: { activeViewContainer: undefined, sizePercent: undefined },
};
const service = new LayoutService(state);
const actions: WorkbenchLayoutActions = createWorkbenchLayoutActions(service);
actions.focusActivity('explorer'); actions.showActivity('explorer');
actions.togglePrimarySidebar(); actions.toggleAuxiliarySidebar(); actions.togglePanel(); actions.toggleFocusMode();
const dispose: () => void = service.onDidChangeLayout(event => { const transient: boolean = event.transient; void transient; }).dispose;
dispose(); service.dispose();
// @ts-expect-error activity identifiers remain strings.
actions.showActivity(42);
`,
  );
  run(
    process.execPath,
    [
      path.join(repoRoot, 'node_modules/typescript/bin/tsc'),
      '--strict',
      '--exactOptionalPropertyTypes',
      '--skipLibCheck',
      '--noEmit',
      '--target',
      'ES2022',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      typesPath,
    ],
    consumer,
  );
  const entry = path.join(consumer, 'entry.mjs');
  fs.writeFileSync(
    entry,
    "export { LayoutService, createWorkbenchLayoutActions } from '@workbench-kit/workbench-core/layout';\n",
  );
  const outputDir = path.join(consumer, 'output');
  const coreModules = [];
  await build({
    configFile: false,
    root: consumer,
    logLevel: 'error',
    plugins: [
      {
        name: 'portable-layout-graph',
        generateBundle() {
          coreModules.push(...this.getModuleIds());
        },
      },
    ],
    build: {
      target: 'es2022',
      outDir: path.join(outputDir, 'vendor'),
      minify: false,
      lib: { entry, formats: ['es'], fileName: () => 'layout.js' },
    },
  });
  if (
    !coreModules.some((id) => id.includes('/workbench-core/src/layout/service.ts')) ||
    coreModules.some(
      (id) => !id.startsWith(consumer) || /\/(react|react-dom|vue|svelte|shell-react)\//.test(id),
    )
  ) {
    throw new Error('Packed layout artifact did not retain the isolated framework-neutral graph');
  }
  fs.writeFileSync(path.join(outputDir, 'package.json'), '{"type":"module"}\n');
  const vendor = path.join(outputDir, 'vendor/layout.js');
  const artifact = fs.readFileSync(vendor);
  if (/^\s*import\s|\bimport\s*\(/m.test(artifact.toString()))
    throw new Error('Core artifact has runtime imports');
  const artifactSha256 = hash(artifact);
  // Plain Node imports and executes the same artifact before DOM globals exist.
  const core = await import(pathToFileURL(vendor).href);
  const service = new core.LayoutService();
  core.createWorkbenchLayoutActions(service).togglePrimarySidebar();
  if (service.getState().sideBar.visible) throw new Error('DOM-free action did not run');
  service.dispose();
  const hosts = [];
  for (const host of ['html', 'react', 'vue', 'svelte']) {
    const hostDir = path.join(outputDir, host);
    fs.mkdirSync(hostDir, { recursive: true });
    if (host === 'html') {
      for (const [source, target] of [
        ['html.mjs', 'entry.mjs'],
        ['common.mjs', 'common.mjs'],
      ]) {
        fs.copyFileSync(path.join(fixtureRoot, source), path.join(hostDir, target));
      }
    } else {
      const modules = [];
      await build({
        configFile: false,
        root: repoRoot,
        mode: 'development',
        logLevel: 'error',
        define: {
          'process.env.NODE_ENV': '"development"',
          __VUE_OPTIONS_API__: 'false',
          __VUE_PROD_DEVTOOLS__: 'false',
          __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
        },
        plugins: [
          {
            name: 'portable-layout-frameworks',
            resolveId(id) {
              if (id === 'virtual:portable-layout-svelte') return '\0portable-layout-svelte';
            },
            load(id) {
              if (id === '\0portable-layout-svelte')
                return compile(svelteSource, {
                  filename: 'PortableLayout.svelte',
                  generate: 'client',
                  dev: true,
                }).js.code;
            },
            generateBundle() {
              modules.push(...this.getModuleIds());
            },
          },
        ],
        build: {
          target: 'es2022',
          outDir: hostDir,
          emptyOutDir: false,
          minify: false,
          rollupOptions: {
            input: path.join(fixtureRoot, `${host}.mjs`),
            external: ['/vendor/layout.js'],
            output: { entryFileNames: 'entry.mjs', inlineDynamicImports: true },
          },
        },
      });
      if (modules.some((id) => /\/packages\/(workbench-core|base)\//.test(id)))
        throw new Error(`${host} inlined workspace core`);
      if (!fs.readFileSync(path.join(hostDir, 'entry.mjs'), 'utf8').includes('/vendor/layout.js'))
        throw new Error(`${host} omitted shared core`);
    }
    fs.writeFileSync(path.join(hostDir, 'index.html'), page(host));
    const summary = JSON.parse(
      run(process.execPath, [
        path.join(repoRoot, 'scripts/lib/native-control-host-child.mjs'),
        path.join(hostDir, 'entry.mjs'),
        vendor,
        '/vendor/layout.js',
        'portableLayoutFixture',
      ]).trim(),
    );
    if (summary.host !== host || summary.cases.length !== 9 || new Set(summary.cases).size !== 9)
      throw new Error(`Incomplete ${host} matrix`);
    if (hash(fs.readFileSync(vendor)) !== artifactSha256)
      throw new Error('Shared artifact changed');
    hosts.push(summary);
  }
  fs.mkdirSync(path.join(repoRoot, 'tmp/portable-layout-hosts'), { recursive: true });
  const retained = fs.mkdtempSync(path.join(repoRoot, 'tmp/portable-layout-hosts/run-'));
  fs.cpSync(outputDir, retained, { recursive: true });
  if (hash(fs.readFileSync(path.join(retained, 'vendor/layout.js'))) !== artifactSha256)
    throw new Error('Retained artifact hash differs');
  const result = {
    artifactSha256,
    artifactBytes: artifact.length,
    tarballs,
    hosts,
    browserOutputDir: retained,
  };
  fs.writeFileSync(path.join(retained, 'receipt.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}
