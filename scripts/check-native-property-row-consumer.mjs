import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { verifyNativeControlHosts } from './lib/native-control-hosts.mjs';
import { source as svelteSource } from './fixtures/native-property-row-hosts/svelte-component.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-property-row-'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (command, args, cwd = repoRoot) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4_000_000,
    windowsHide: true,
  });
try {
  run('corepack', ['pnpm', '--filter', '@workbench-kit/platform', 'build']);
  fs.writeFileSync(path.join(consumer, 'package.json'), '{"type":"module","private":true}\n');
  const packs = path.join(consumer, 'packs');
  fs.mkdirSync(packs);
  run(
    'corepack',
    ['pnpm', 'pack', '--pack-destination', packs],
    path.join(repoRoot, 'packages/platform'),
  );
  const tarball = path.join(
    packs,
    fs.readdirSync(packs).find((name) => name.endsWith('.tgz')),
  );
  const platformRoot = path.join(consumer, 'node_modules/@workbench-kit/platform');
  fs.mkdirSync(platformRoot, { recursive: true });
  run('tar', ['-xzf', tarball, '--strip-components=1', '-C', platformRoot]);
  const types = path.join(consumer, 'types.ts');
  fs.writeFileSync(
    types,
    `import { bindNativePropertyRow, type NativePropertyRowBinding, type NativePropertyRowElements, type NativePropertyRowTargets } from '@workbench-kit/platform/native-property-row';
declare const control: HTMLInputElement;
declare const label: HTMLLabelElement;
declare const description: HTMLElement;
declare const error: HTMLElement;
const elements: NativePropertyRowElements = { control, label, description, error };
const binding: NativePropertyRowBinding = bindNativePropertyRow(elements);
const next: NativePropertyRowTargets = { description };
const updated: boolean = binding.update(next); void updated;
binding.update({}); binding.dispose();
// @ts-expect-error the native control contract is not an arbitrary div.
bindNativePropertyRow({ control: document.createElement('div'), label });
// @ts-expect-error omit optional targets instead of passing explicit undefined.
binding.update({ description: undefined });
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
      types,
    ],
    consumer,
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(platformRoot, 'package.json'), 'utf8'));
  if (manifest.exports['./native-property-row.css'] !== './src/browser/native-property-row.css')
    throw new Error('Unexpected native row CSS entry');
  const css = fs.readFileSync(
    path.join(platformRoot, manifest.exports['./native-property-row.css']),
  );
  const cssSha256 = hash(css);
  const browserEntry = path.join(platformRoot, manifest.exports['./native-property-row'].import);
  const imported = await import(pathToFileURL(browserEntry).href);
  if (typeof imported.bindNativePropertyRow !== 'function')
    throw new Error('DOM-free row import failed');
  const entry = path.join(consumer, 'entry.mjs');
  fs.writeFileSync(
    entry,
    "import '@workbench-kit/platform/native-property-row.css';\nexport { bindNativePropertyRow } from '@workbench-kit/platform/native-property-row';\n",
  );
  const modules = [];
  const bundle = path.join(consumer, 'bundle');
  await build({
    configFile: false,
    root: consumer,
    logLevel: 'error',
    plugins: [
      {
        name: 'property-row-graph',
        generateBundle() {
          modules.push(...this.getModuleIds());
        },
      },
    ],
    build: {
      target: 'es2022',
      outDir: bundle,
      minify: false,
      cssMinify: false,
      lib: { entry, formats: ['es'], fileName: () => 'row.js', cssFileName: 'row' },
    },
  });
  if (
    modules.some(
      (id) =>
        !id.startsWith(consumer) ||
        /\/(react|react-dom|vue|svelte|workbench-core|shell-react)\//.test(id),
    )
  )
    throw new Error('Native row bundle imported another framework/capability');
  const cssFiles = fs.readdirSync(bundle).filter((name) => name.endsWith('.css'));
  if (cssFiles.length !== 1) throw new Error('Expected one explicit row CSS asset');
  const bundledCss = fs.readFileSync(path.join(bundle, cssFiles[0]), 'utf8');
  if (
    !bundledCss.includes('.ui-native-property-row') ||
    /\.ui-(field|workbench|input)/.test(bundledCss)
  )
    throw new Error('Unexpected broad CSS closure');
  const result = await verifyNativeControlHosts({
    repoRoot,
    platformRoot,
    outputDir: path.join(consumer, 'hosts'),
    controlName: 'native-property-row',
    fixtureName: 'native-property-row-hosts',
    fixtureApiName: 'nativePropertyRowFixture',
    virtualId: 'virtual:native-property-row-svelte',
    svelteSource,
    caseCount: 12,
    page: (
      host,
    ) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${host} native PropertyRow</title>
<link rel="stylesheet" href="/vendor/native-property-row.css"><style>body{font:14px system-ui;color:CanvasText;background:Canvas;margin:24px}form{display:grid;gap:24px;max-width:320px;padding:16px;border:1px solid var(--color-border,GrayText);box-sizing:border-box}.controls{display:flex;gap:8px;flex-wrap:wrap;max-width:600px;margin-block:16px}#external-help,#later-help{max-width:320px}</style></head><body>
<h1>${host}: native PropertyRow</h1><p>Renderer-owned controls; one shared association binder and explicit component CSS.</p>
<p id="external-help">Changes stay local until you apply them.</p><p id="later-help">Additional host instructions.</p>
<div class="controls"><button id="error-on" type="button">Show errors</button><button id="error-off" type="button">Clear errors</button><button id="reset" type="button">Reset form</button><button id="unmount" type="button">Unmount host</button><button id="mount" type="button">Mount host</button></div>
<div id="host"></div><pre id="status" role="status">Starting</pre><script type="module" src="./entry.mjs"></script></body></html>`,
  });
  const retainedCss = path.join(result.browserOutputDir, 'vendor/native-property-row.css');
  fs.writeFileSync(retainedCss, css);
  if (hash(fs.readFileSync(retainedCss)) !== cssSha256)
    throw new Error('Retained stylesheet changed');
  const receipt = {
    ...result,
    cssSha256,
    cssBytes: css.length,
    tarballSha256: hash(fs.readFileSync(tarball)),
    moduleCount: modules.length,
  };
  fs.writeFileSync(
    path.join(result.browserOutputDir, 'receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}
