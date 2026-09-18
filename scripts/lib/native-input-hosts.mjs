import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { compile } from 'svelte/compiler';
import { source as svelteSource } from '../fixtures/native-input-hosts/svelte-component.mjs';

const fixtureRoot = fileURLToPath(new URL('../fixtures/native-input-hosts/', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function page(host) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${host} native input fixture</title></head>
<body><h1>${host}: shared native input</h1><p>One packed browser artifact. Edit callbacks do not save documents.</p>
<p><button id="remote">Set remote value</button> <button id="selection">Check selection</button>
<button id="unmount">Unmount host</button> <button id="mount">Mount host</button></p>
<div id="host"></div><pre id="status" role="status">Starting</pre><script type="module" src="./entry.mjs"></script></body></html>`;
}

function retainBrowserOutput(repoRoot, outputDir) {
  const repository = fs.realpathSync(repoRoot);
  const namedRoot = path.resolve(repository, 'tmp/native-input-hosts');
  fs.mkdirSync(namedRoot, { recursive: true });
  const realRoot = fs.realpathSync(namedRoot);
  if (realRoot !== namedRoot) throw new Error('Browser fixture root must not be a symlink');
  const target = path.resolve(namedRoot, 'dist');
  if (path.dirname(target) !== namedRoot) throw new Error('Unexpected browser fixture target');
  const source = fs.realpathSync(outputDir);
  if (
    source === target ||
    source.startsWith(`${target}${path.sep}`) ||
    target.startsWith(`${source}${path.sep}`)
  ) {
    throw new Error('Browser fixture source and retained output must not overlap');
  }
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== target) {
      throw new Error('Browser fixture output must not be a symlink');
    }
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.cpSync(outputDir, target, { recursive: true });
  return target;
}

export async function verifyNativeInputHosts({ repoRoot, platformRoot, outputDir }) {
  outputDir = path.resolve(outputDir);
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) {
    throw new Error('Native input host output must be an empty dedicated directory');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(platformRoot, 'package.json'), 'utf8'));
  const exported = manifest.exports?.['./native-text-input'];
  if (
    exported?.import !== './dist/browser/native-text-input.js' ||
    exported.default !== exported.import
  ) {
    throw new Error('Packed native input must expose the admitted browser artifact');
  }
  const artifact = fs.readFileSync(path.join(platformRoot, exported.import));
  const artifactSha256 = sha256(artifact);
  fs.mkdirSync(path.join(outputDir, 'vendor'), { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'vendor/native-text-input.js'), artifact);
  fs.writeFileSync(path.join(outputDir, 'package.json'), '{"type":"module"}\n');
  const hosts = [];
  for (const host of ['html', 'react', 'vue', 'svelte']) {
    const hostDir = path.join(outputDir, host);
    fs.mkdirSync(hostDir, { recursive: true });
    if (host === 'html') {
      fs.copyFileSync(path.join(fixtureRoot, 'html.mjs'), path.join(hostDir, 'entry.mjs'));
      fs.copyFileSync(path.join(fixtureRoot, 'common.mjs'), path.join(hostDir, 'common.mjs'));
    } else {
      const moduleIds = [];
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
            name: 'native-input-fixture',
            resolveId(id) {
              if (id === 'virtual:native-input-svelte') return '\0native-input-svelte';
            },
            load(id) {
              if (id === '\0native-input-svelte')
                return compile(svelteSource, {
                  filename: 'NativeInputFixture.svelte',
                  generate: 'client',
                  dev: true,
                }).js.code;
            },
            generateBundle() {
              moduleIds.push(...this.getModuleIds());
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
            external: ['/vendor/native-text-input.js'],
            output: { entryFileNames: 'entry.mjs', inlineDynamicImports: true },
          },
        },
      });
      if (moduleIds.some((id) => id.replaceAll('\\', '/').includes('/platform/'))) {
        throw new Error(`${host} inlined a platform implementation instead of the shared artifact`);
      }
      const emitted = fs.readFileSync(path.join(hostDir, 'entry.mjs'), 'utf8');
      if (!emitted.includes('/vendor/native-text-input.js'))
        throw new Error(`${host} omitted the external core`);
    }
    fs.writeFileSync(path.join(hostDir, 'index.html'), page(host));
    const result = execFileSync(
      process.execPath,
      [
        path.join(fixtureRoot, 'child.mjs'),
        path.join(hostDir, 'entry.mjs'),
        path.join(outputDir, 'vendor/native-text-input.js'),
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 30_000,
        windowsHide: true,
        maxBuffer: 1_000_000,
      },
    );
    const summary = JSON.parse(result.trim());
    if (summary.host !== host || summary.cases?.length !== 10)
      throw new Error(`Incomplete ${host} matrix`);
    if (
      sha256(fs.readFileSync(path.join(outputDir, 'vendor/native-text-input.js'))) !==
      artifactSha256
    ) {
      throw new Error('Shared native input artifact changed during host execution');
    }
    hosts.push(summary);
  }
  fs.writeFileSync(
    path.join(outputDir, 'index.html'),
    `<!doctype html><html lang="en"><title>Native input hosts</title><h1>Same packed artifact in four hosts</h1><p>SHA-256: ${artifactSha256}</p><ul>${hosts.map(({ host }) => `<li><a href="./${host}/index.html">${host}</a></li>`).join('')}</ul></html>`,
  );
  const browserOutputDir = retainBrowserOutput(repoRoot, outputDir);
  if (
    sha256(fs.readFileSync(path.join(browserOutputDir, 'vendor/native-text-input.js'))) !==
    artifactSha256
  ) {
    throw new Error('Retained browser artifact hash mismatch');
  }
  return { artifactSha256, hosts, browserOutputDir };
}
