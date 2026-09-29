import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CONTEXT =
  'These changed inputs appear documentation-only; prefer changed-file formatting and content/link review, and reuse product evidence only when its exact inputs match. No check has run for this invocation; honor any explicitly requested CI, release, or full validation.';

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
}

function readNameStatus(output) {
  const fields = output.split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (/^[RC]/.test(status ?? '') || !/^(?:A|D|M|T|U|X|B)$/.test(status ?? '')) return undefined;
    const filePath = fields[index++];
    if (!filePath) return undefined;
    paths.push(filePath.replaceAll('\\', '/'));
  }
  return paths;
}

function isGuidancePath(filePath) {
  if (filePath === 'AGENTS.md' || filePath === 'CLAUDE.md') return true;
  if (path.posix.basename(filePath) === 'README.md') return true;
  if (filePath.startsWith('docs/') && filePath.endsWith('.md')) return true;
  return /^\.cursor\/rules\/.+\.mdc$/.test(filePath);
}

function recognizedScript(command, scripts) {
  const match = /^pnpm[ \t]+(?:run[ \t]+)?([A-Za-z0-9:_-]+)$/.exec(command);
  if (!match) return false;
  const script = match[1];
  if (!Object.hasOwn(scripts, script)) return false;
  return (
    script === 'validate' ||
    script === 'validate:static' ||
    script === 'validate:fast' ||
    script === 'validate:full' ||
    script === 'validate:ui' ||
    /^validate:ui:[a-z0-9-]+$/.test(script)
  );
}

export function evaluateInput(input) {
  if (!input || typeof input !== 'object' || input.tool_name !== 'Bash') return '';
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') return '';
  const command = toolInput.command;
  // Keep unrelated Bash calls cheap; validate the actual script after resolving the root.
  if (typeof command !== 'string' || !/^pnpm[ \t]+(?:run[ \t]+)?[A-Za-z0-9:_-]+$/.test(command))
    return '';
  const cwd = Object.hasOwn(toolInput, 'workdir') ? toolInput.workdir : input.cwd;
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return '';
  try {
    const root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
    if (!root || path.resolve(cwd).toLowerCase() !== path.resolve(root).toLowerCase()) return '';
    const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (manifest.name !== 'workbench-kit' || !recognizedScript(command, manifest.scripts ?? {}))
      return '';

    const base = git(root, ['merge-base', 'HEAD', 'origin/develop']).trim();
    if (!base) return '';
    const changed = [];
    for (const args of [
      ['diff', '--name-status', '-z', `${base}...HEAD`],
      ['diff', '--cached', '--name-status', '-z'],
      ['diff', '--name-status', '-z'],
    ]) {
      const paths = readNameStatus(git(root, args));
      if (!paths) return '';
      changed.push(...paths);
    }
    changed.push(
      ...git(root, ['ls-files', '--others', '--exclude-standard', '-z'])
        .split('\0')
        .filter(Boolean)
        .map((filePath) => filePath.replaceAll('\\', '/')),
    );
    const unique = [...new Set(changed)];
    if (unique.length === 0 || !unique.every(isGuidancePath)) return '';
    return JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: CONTEXT },
    });
  } catch {
    return '';
  }
}

let payload = '';
for await (const chunk of process.stdin) payload += chunk;
try {
  process.stdout.write(evaluateInput(JSON.parse(payload)));
} catch {
  process.exitCode = 0;
}
