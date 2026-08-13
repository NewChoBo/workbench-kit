import { writeSync } from 'node:fs';
import { createRequire } from 'node:module';

import { app, BrowserWindow } from 'electron';

const require = createRequire(import.meta.url);
const {
  createApplicationQuitGuard,
} = require('../packages/electron-shell/dist/lifecycle/application-quit-guard.js');

const MAX_RUNTIME_MS = 15_000;
const trace = [];
let beforeQuitCount = 0;
let resumeQuitCalls = 0;
let saveCalls = 0;
let dirty = true;
let timeout;

function write(stream, message) {
  writeSync(stream, `${message}\n`);
}

function fail(error) {
  clearTimeout(timeout);
  const message = error instanceof Error ? error.stack || error.message : String(error);
  write(2, `ELECTRON_QUIT_GUARD_SMOKE_FAIL ${message}`);
  process.exitCode = 1;
  app.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertOrdered(expected) {
  let cursor = -1;
  for (const item of expected) {
    const next = trace.indexOf(item, cursor + 1);
    assert(next !== -1, `Missing lifecycle event ${item}. Trace: ${trace.join(' -> ')}`);
    cursor = next;
  }
}

function assertElectronVersion() {
  const [majorText, minorText] = process.versions.electron.split('.');
  const major = Number(majorText);
  const minor = Number(minorText);
  assert(
    Number.isInteger(major) &&
      Number.isInteger(minor) &&
      (major > 41 || (major === 41 && minor >= 5)),
    `Expected Electron 41.5 or newer, received ${process.versions.electron}.`,
  );
}

function verifyAndReportSuccess() {
  assertElectronVersion();
  assert(beforeQuitCount === 3, `Expected three before-quit events, received ${beforeQuitCount}.`);
  assert(saveCalls === 1, `Expected one save, received ${saveCalls}.`);
  assert(resumeQuitCalls === 1, `Expected one resumed quit, received ${resumeQuitCalls}.`);
  assertOrdered([
    'before-quit:initial-vetoed',
    'coalesced-quit-request',
    'before-quit:coalesced-vetoed',
    'resume-quit',
    'before-quit:resumed-allowed',
    'window-close',
    'will-quit',
    'quit',
  ]);
  clearTimeout(timeout);
  write(
    1,
    `ELECTRON_QUIT_GUARD_SMOKE_PASS ${JSON.stringify({
      electron: process.versions.electron,
      trace,
    })}`,
  );
}

process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);

app.disableHardwareAcceleration();
trace.push('script-start');
app.on('will-quit', () => {
  trace.push('will-quit');
});
app.on('quit', () => {
  trace.push('quit');
  try {
    verifyAndReportSuccess();
  } catch (error) {
    fail(error);
  }
});

timeout = setTimeout(() => {
  fail(new Error(`Timed out waiting for Electron quit lifecycle. Trace: ${trace.join(' -> ')}`));
}, MAX_RUNTIME_MS);

function startSmoke() {
  trace.push('ready');
  try {
    assertElectronVersion();

    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
      },
    });
    window.on('close', () => {
      trace.push('window-close');
    });

    const quitGuard = createApplicationQuitGuard({
      isDirty: () => dirty,
      requestDecision: () => 'save',
      save: () => {
        saveCalls += 1;
        dirty = false;
      },
      discard: () => {
        throw new Error('The save-path smoke test must not discard state.');
      },
      resumeQuit: () => {
        resumeQuitCalls += 1;
        trace.push('resume-quit');
        app.quit();
      },
    });

    app.on('before-quit', (event) => {
      beforeQuitCount += 1;
      const result = quitGuard.handleBeforeQuit(event);
      if (result === undefined) {
        trace.push('before-quit:resumed-allowed');
        return;
      }

      const label = beforeQuitCount === 1 ? 'initial' : 'coalesced';
      trace.push(`before-quit:${label}-vetoed`);
      void result.catch(fail);

      if (beforeQuitCount === 1) {
        queueMicrotask(() => {
          trace.push('coalesced-quit-request');
          app.quit();
        });
      }
    });

    app.quit();
  } catch (error) {
    fail(error);
  }
}

assertElectronVersion();
if (app.isReady()) {
  startSmoke();
} else {
  app.once('ready', startSmoke);
}
