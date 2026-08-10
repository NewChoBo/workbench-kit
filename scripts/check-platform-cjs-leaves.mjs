import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from './lib/run-command.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function packWorkspacePackage(packageName, directoryName, fixturePrefix) {
  const packageDir = path.join(repoRoot, 'packages', directoryName);
  console.log(`[check-platform-cjs-leaves] Building ${packageName}…`);
  runCommand('pnpm', ['--filter', packageName, 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), fixturePrefix));
  const packDir = path.join(fixtureRoot, 'pack');
  const consumerDir = path.join(fixtureRoot, 'consumer');
  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(consumerDir, { recursive: true });

  console.log(`[check-platform-cjs-leaves] Packing ${packageName}…`);
  const packOutput = runCommand('npm', ['pack', '--pack-destination', packDir], {
    cwd: packageDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const tarballName = packOutput.trim().split(/\r?\n/u).filter(Boolean).at(-1);
  if (!tarballName) {
    throw new Error(`npm pack did not print a tarball name for ${packageName}.`);
  }

  runCommand('tar', ['-xzf', path.join(packDir, tarballName), '-C', packDir], {
    stdio: 'inherit',
  });
  return {
    consumerDir,
    fixtureRoot,
    packedRoot: path.join(packDir, 'package'),
  };
}

function linkPackedPackage(consumerDir, packedRoot, directoryName) {
  const scopedDir = path.join(consumerDir, 'node_modules', '@workbench-kit');
  fs.mkdirSync(scopedDir, { recursive: true });
  fs.symlinkSync(packedRoot, path.join(scopedDir, directoryName), 'dir');
}

function verifyPlatformLeaves() {
  const fixture = packWorkspacePackage('@workbench-kit/platform', 'platform', 'wbk-platform-cjs-');
  try {
    for (const leaf of ['atomic-write.cjs', 'tray-close-policy.cjs']) {
      const leafPath = path.join(fixture.packedRoot, 'dist', leaf);
      if (!fs.existsSync(leafPath)) {
        throw new Error(`Packed platform tarball missing dist/${leaf}`);
      }
    }

    linkPackedPackage(fixture.consumerDir, fixture.packedRoot, 'platform');
    const consumerEntry = path.join(fixture.consumerDir, 'smoke.cjs');
    fs.writeFileSync(
      consumerEntry,
      [
        "'use strict';",
        "const assert = require('node:assert/strict');",
        "const fs = require('node:fs');",
        "const os = require('node:os');",
        "const path = require('node:path');",
        "const { atomicWriteText } = require('@workbench-kit/platform/atomic-write');",
        'const { shouldHideOnClose, shouldQuitWhenAllWindowsClosed } =',
        "  require('@workbench-kit/platform/tray-close-policy');",
        'assert.equal(typeof atomicWriteText, "function");',
        'assert.equal(shouldHideOnClose({ trayEnabled: true }), true);',
        'assert.equal(',
        "  shouldQuitWhenAllWindowsClosed({ platform: 'darwin', trayEnabled: false }),",
        '  false,',
        ');',
        '(async () => {',
        "  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-atomic-cjs-'));",
        "  const filePath = path.join(dir, 'nested', 'doc.txt');",
        "  await atomicWriteText(filePath, 'hello-cjs');",
        "  assert.equal(fs.readFileSync(filePath, 'utf8'), 'hello-cjs');",
        '  fs.rmSync(dir, { recursive: true, force: true });',
        '})().catch((error) => { console.error(error); process.exit(1); });',
        '',
      ].join('\n'),
    );

    const requireFromConsumer = createRequire(consumerEntry);
    const tray = requireFromConsumer('@workbench-kit/platform/tray-close-policy');
    if (typeof tray.shouldHideOnClose !== 'function') {
      throw new Error('createRequire failed to load tray-close-policy exports.');
    }
    runCommand(process.execPath, [consumerEntry], {
      cwd: fixture.consumerDir,
      stdio: 'inherit',
    });
  } finally {
    fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
  }
}

function verifyElectronShellLeaves() {
  const fixture = packWorkspacePackage(
    '@workbench-kit/electron-shell',
    'electron-shell',
    'wbk-electron-shell-cjs-',
  );
  try {
    for (const leaf of [
      'security/open-allowlisted-external-link.js',
      'security/require-owned-window-for-sender.js',
      'window/window-controls.js',
    ]) {
      if (!fs.existsSync(path.join(fixture.packedRoot, 'dist', leaf))) {
        throw new Error(`Packed electron-shell tarball missing dist/${leaf}`);
      }
    }

    linkPackedPackage(fixture.consumerDir, fixture.packedRoot, 'electron-shell');
    const consumerEntry = path.join(fixture.consumerDir, 'smoke.cjs');
    fs.writeFileSync(
      consumerEntry,
      [
        "'use strict';",
        "const assert = require('node:assert/strict');",
        "const { openAllowlistedExternalLink } = require('@workbench-kit/electron-shell/external-links');",
        "const { requireOwnedWindowForSender } = require('@workbench-kit/electron-shell/sender-security');",
        "const { registerWindowControlIpc } = require('@workbench-kit/electron-shell/window-controls');",
        'assert.equal(typeof openAllowlistedExternalLink, "function");',
        'assert.equal(typeof requireOwnedWindowForSender, "function");',
        'assert.equal(typeof registerWindowControlIpc, "function");',
        'const handlers = new Map();',
        'let maximized = false;',
        'registerWindowControlIpc({',
        '  channels: { close: "close", isMaximized: "state", maximizedChanged: "changed", minimize: "min", toggleMaximized: "toggle" },',
        '  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },',
        '  resolveWindow: () => ({ close() {}, isMaximized: () => maximized, maximize() { maximized = true; }, minimize() {}, unmaximize() { maximized = false; } }),',
        '});',
        'assert.equal(handlers.get("toggle")({ sender: {} }), true);',
        '',
      ].join('\n'),
    );
    runCommand(process.execPath, [consumerEntry], {
      cwd: fixture.consumerDir,
      stdio: 'inherit',
    });
  } finally {
    fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
  }
}

verifyPlatformLeaves();
verifyElectronShellLeaves();
console.log('[check-platform-cjs-leaves] OK');
