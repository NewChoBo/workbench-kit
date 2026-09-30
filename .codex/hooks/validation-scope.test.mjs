import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import process from 'node:process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { test } from 'vitest';

const hookPath = fileURLToPath(new URL('./validation-scope.mjs', import.meta.url));

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'validation-scope-'));
  t.onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-b', 'develop');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'workbench-kit',
      scripts: {
        validate: 'true',
        'validate:static': 'true',
        'validate:fast': 'true',
        'validate:full': 'true',
        'validate:ui': 'true',
        'validate:ui:sample': 'true',
      },
    }),
  );
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'base.md'), 'base\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture base');
  git(root, 'remote', 'add', 'origin', 'https://example.invalid/workbench-kit.git');
  git(root, 'update-ref', 'refs/remotes/origin/develop', 'HEAD');
  git(root, 'switch', '-c', 'topic');
  return root;
}

function runHook(cwd, value) {
  const result = spawnSync(process.execPath, [hookPath], {
    cwd,
    encoding: 'utf8',
    input: typeof value === 'string' ? value : JSON.stringify(value),
    windowsHide: true,
  });
  assert.equal(result.status, 0);
  return result.stdout;
}

function input(cwd, command = 'pnpm validate') {
  return { cwd, tool_name: 'Bash', tool_input: { command } };
}

test('advises only when branch, index, worktree, and untracked changes are all guidance', (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'docs', 'branch.md'), 'branch\n');
  git(root, 'add', 'docs/branch.md');
  git(root, 'commit', '-m', 'docs branch change');
  writeFileSync(path.join(root, 'docs', 'base.md'), 'staged\n');
  git(root, 'add', 'docs/base.md');
  writeFileSync(path.join(root, 'docs', 'base.md'), 'unstaged\n');
  writeFileSync(path.join(root, 'README.md'), 'untracked guidance\n');

  const output = runHook(root, input(root, 'pnpm run validate:ui:sample'));
  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(parsed.hookSpecificOutput.additionalContext, /documentation-only/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /No check has run/);
  assert.deepEqual(Object.keys(parsed.hookSpecificOutput).sort(), [
    'additionalContext',
    'hookEventName',
  ]);
});

test('uses only an absolute workdir that resolves to the repository root', (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'docs', 'change.md'), 'docs\n');
  const session = path.dirname(root);
  const withWorkdir = {
    ...input(session),
    tool_input: { command: 'pnpm validate', workdir: root },
  };
  assert.match(runHook(session, withWorkdir), /documentation-only/);
  for (const workdir of [path.join(root, 'docs'), '.', null, 42]) {
    const value = { ...input(root), tool_input: { command: 'pnpm validate', workdir } };
    assert.equal(runHook(root, value), '');
  }
});

test(
  'runs the Windows launcher in cmd.exe and PowerShell',
  { skip: process.platform !== 'win32' },
  (t) => {
    const root = fixture(t);
    const hookDir = path.join(root, '.codex', 'hooks');
    mkdirSync(hookDir, { recursive: true });
    copyFileSync(hookPath, path.join(hookDir, 'validation-scope.mjs'));
    git(root, 'add', '.codex/hooks/validation-scope.mjs');
    git(root, 'commit', '-m', 'include launcher target');
    git(root, 'update-ref', 'refs/remotes/origin/develop', 'HEAD');
    writeFileSync(path.join(root, 'docs', 'change.md'), 'docs\n');
    const config = JSON.parse(readFileSync(new URL('../hooks.json', import.meta.url), 'utf8'));
    const command = config.hooks.PreToolUse[0].hooks[0].commandWindows;
    const payload = JSON.stringify(input(root));
    for (const [shell, args] of [
      ['cmd.exe', ['/d', '/c', command]],
      ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]],
    ]) {
      const result = spawnSync(shell, args, {
        cwd: root,
        encoding: 'utf8',
        input: payload,
        windowsHide: true,
        windowsVerbatimArguments: shell === 'cmd.exe',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /documentation-only/);
    }
  },
);

test('silently falls through when a branch commit includes source', (t) => {
  const root = fixture(t);
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'src', 'change.ts'), 'export {};\n');
  git(root, 'add', 'src/change.ts');
  git(root, 'commit', '-m', 'source change');
  writeFileSync(path.join(root, 'docs', 'change.md'), 'docs\n');
  assert.equal(runHook(root, input(root)), '');
});

test('silently falls through for config paths, missing base, composite commands, and malformed payloads', (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'docs', 'change.md'), 'docs\n');
  mkdirSync(path.join(root, '.codex'));
  writeFileSync(path.join(root, '.codex', 'hooks.json'), '{}');
  git(root, 'add', '.codex/hooks.json');
  assert.equal(runHook(root, input(root)), '');
  git(root, 'reset', '--hard', 'HEAD');
  git(root, 'clean', '-fd');
  writeFileSync(path.join(root, 'docs', 'change.md'), 'docs\n');
  assert.equal(runHook(root, input(root, 'pnpm validate && pnpm test')), '');
  assert.equal(runHook(root, input(root, 'pnpm validate\n&& pnpm test')), '');
  git(root, 'update-ref', '-d', 'refs/remotes/origin/develop');
  assert.equal(runHook(root, input(root)), '');
  assert.equal(runHook(root, '{'), '');
  assert.equal(runHook(root, { tool_name: 'Bash', cwd: root, tool_input: {} }), '');
});
