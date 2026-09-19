import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { compile } from 'svelte/compiler';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function retainBrowserOutput(repoRoot, outputDir, fixtureName) {
  const repository = fs.realpathSync(repoRoot);
  const namedRoot = path.resolve(repository, 'tmp', fixtureName);
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

/** Share build/isolation machinery while retaining control-specific behavioral matrices. */
export async function verifyNativeControlHosts({
  repoRoot,
  platformRoot,
  outputDir,
  controlName,
  fixtureName,
  fixtureApiName,
  virtualId,
  svelteSource,
  page,
  caseCount,
}) {
  if (![controlName, fixtureName].every((name) => /^[a-z][a-z0-9-]+$/.test(name)))
    throw new Error('Expected a dedicated native control fixture name');
  const fixtureRoot = fileURLToPath(new URL(`../fixtures/${fixtureName}/`, import.meta.url));
  const artifactPath = `/vendor/${controlName}.js`;
  const virtualModule = `\0${virtualId}`;
  outputDir = path.resolve(outputDir);
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) {
    throw new Error('Native input host output must be an empty dedicated directory');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(platformRoot, 'package.json'), 'utf8'));
  const exported = manifest.exports?.[`./${controlName}`];
  if (
    exported?.import !== `./dist/browser/${controlName}.js` ||
    exported.default !== exported.import
  ) {
    throw new Error('Packed native input must expose the admitted browser artifact');
  }
  const artifact = fs.readFileSync(path.join(platformRoot, exported.import));
  if (/^\s*import\s|\bimport\s*\(/m.test(artifact.toString('utf8')))
    throw new Error('Native control artifact must not import another runtime');
  const artifactSha256 = sha256(artifact);
  fs.mkdirSync(path.join(outputDir, 'vendor'), { recursive: true });
  const vendorPath = path.join(outputDir, 'vendor', `${controlName}.js`);
  fs.writeFileSync(vendorPath, artifact);
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
            name: 'native-control-fixture',
            resolveId(id) {
              if (id === virtualId) return virtualModule;
            },
            load(id) {
              if (id === virtualModule)
                return compile(svelteSource, {
                  filename: 'NativeControlFixture.svelte',
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
            external: [artifactPath],
            output: { entryFileNames: 'entry.mjs', inlineDynamicImports: true },
          },
        },
      });
      if (moduleIds.some((id) => id.replaceAll('\\', '/').includes('/platform/'))) {
        throw new Error(`${host} inlined a platform implementation instead of the shared artifact`);
      }
      const emitted = fs.readFileSync(path.join(hostDir, 'entry.mjs'), 'utf8');
      if (!emitted.includes(artifactPath)) throw new Error(`${host} omitted the external core`);
    }
    fs.writeFileSync(path.join(hostDir, 'index.html'), page(host));
    const result = execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL('./native-control-host-child.mjs', import.meta.url)),
        path.join(hostDir, 'entry.mjs'),
        vendorPath,
        artifactPath,
        fixtureApiName,
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
    if (
      summary.host !== host ||
      summary.cases?.length !== caseCount ||
      new Set(summary.cases).size !== caseCount ||
      !summary.cases.every((name) => typeof name === 'string' && name.length > 0)
    )
      throw new Error(`Incomplete ${host} matrix`);
    if (sha256(fs.readFileSync(vendorPath)) !== artifactSha256) {
      throw new Error('Shared native input artifact changed during host execution');
    }
    hosts.push(summary);
  }
  fs.writeFileSync(
    path.join(outputDir, 'index.html'),
    `<!doctype html><html lang="en"><title>${controlName} hosts</title><h1>Same packed artifact in four hosts</h1><p>SHA-256: ${artifactSha256}</p><ul>${hosts.map(({ host }) => `<li><a href="./${host}/index.html">${host}</a></li>`).join('')}</ul></html>`,
  );
  const browserOutputDir = retainBrowserOutput(repoRoot, outputDir, fixtureName);
  if (
    sha256(fs.readFileSync(path.join(browserOutputDir, 'vendor', `${controlName}.js`))) !==
    artifactSha256
  ) {
    throw new Error('Retained browser artifact hash mismatch');
  }
  return { artifactSha256, hosts, browserOutputDir };
}
