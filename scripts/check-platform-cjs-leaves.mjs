import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platformDir = path.join(repoRoot, 'packages', 'platform');

function run(command, args, options = {}) {
  if (process.platform === 'win32') {
    return execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].map(quoteCmdArg).join(' ')],
      options,
    );
  }

  return execFileSync(command, args, options);
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/(["^&|<>])/g, '^$1')}"`;
}

console.log('[check-platform-cjs-leaves] Building @workbench-kit/platform…');
run('pnpm', ['--filter', '@workbench-kit/platform', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-platform-cjs-'));
const packDir = path.join(fixtureRoot, 'pack');
const consumerDir = path.join(fixtureRoot, 'consumer');
fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(consumerDir, { recursive: true });

try {
  console.log('[check-platform-cjs-leaves] npm pack…');
  const packOutput = run('npm', ['pack', '--pack-destination', packDir], {
    cwd: platformDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const tarballName = packOutput
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .at(-1);
  if (!tarballName) {
    throw new Error('npm pack did not print a tarball name.');
  }

  const tarballPath = path.join(packDir, tarballName);
  run('tar', ['-xzf', tarballPath, '-C', packDir], { stdio: 'inherit' });
  const packedRoot = path.join(packDir, 'package');

  for (const leaf of ['atomic-write.cjs', 'tray-close-policy.cjs']) {
    const leafPath = path.join(packedRoot, 'dist', leaf);
    if (!fs.existsSync(leafPath)) {
      throw new Error(`Packed tarball missing dist/${leaf}`);
    }
  }

  const scopedDir = path.join(consumerDir, 'node_modules', '@workbench-kit');
  fs.mkdirSync(scopedDir, { recursive: true });
  fs.symlinkSync(packedRoot, path.join(scopedDir, 'platform'), 'dir');

  const consumerEntry = path.join(consumerDir, 'smoke.cjs');
  fs.writeFileSync(
    consumerEntry,
    [
      "'use strict';",
      "const assert = require('node:assert/strict');",
      "const fs = require('node:fs');",
      "const os = require('node:os');",
      "const path = require('node:path');",
      "const { atomicWriteText } = require('@workbench-kit/platform/atomic-write');",
      "const {",
      '  shouldHideOnClose,',
      '  shouldQuitWhenAllWindowsClosed,',
      "} = require('@workbench-kit/platform/tray-close-policy');",
      '',
      'assert.equal(typeof atomicWriteText, "function");',
      'assert.equal(shouldHideOnClose({ trayEnabled: true }), true);',
      'assert.equal(shouldHideOnClose({ trayEnabled: false }), false);',
      'assert.equal(',
      "  shouldQuitWhenAllWindowsClosed({ platform: 'win32', trayEnabled: false }),",
      '  true,',
      ');',
      'assert.equal(',
      "  shouldQuitWhenAllWindowsClosed({ platform: 'darwin', trayEnabled: false }),",
      '  false,',
      ');',
      'assert.equal(',
      "  shouldQuitWhenAllWindowsClosed({ platform: 'linux', trayEnabled: true }),",
      '  false,',
      ');',
      '',
      '(async () => {',
      "  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-atomic-cjs-'));",
      "  const filePath = path.join(dir, 'nested', 'doc.txt');",
      "  await atomicWriteText(filePath, 'hello-cjs');",
      "  assert.equal(fs.readFileSync(filePath, 'utf8'), 'hello-cjs');",
      "  fs.rmSync(dir, { recursive: true, force: true });",
      "  console.log('[check-platform-cjs-leaves] require() smoke passed.');",
      '})().catch((error) => {',
      '  console.error(error);',
      '  process.exit(1);',
      '});',
      '',
    ].join('\n'),
  );

  // Also prove resolution via createRequire from this checker (same export map).
  const requireFromConsumer = createRequire(consumerEntry);
  const tray = requireFromConsumer('@workbench-kit/platform/tray-close-policy');
  if (typeof tray.shouldHideOnClose !== 'function') {
    throw new Error('createRequire failed to load tray-close-policy exports.');
  }

  run(process.execPath, [consumerEntry], { cwd: consumerDir, stdio: 'inherit' });
  console.log('[check-platform-cjs-leaves] OK');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
