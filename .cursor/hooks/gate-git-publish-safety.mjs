#!/usr/bin/env node
/**
 * Cursor beforeShellExecution hook: block agent git commit/push when
 * public-reference or secret checks fail.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hookDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(hookDir, '..', '..');

const checkers = [
  {
    id: 'public-references',
    script: join(repoRoot, 'scripts', 'check-public-references.mjs'),
    docs: 'docs/conventions/public-reference-policy.md',
  },
  {
    id: 'secrets',
    script: join(repoRoot, 'scripts', 'check-secrets.mjs'),
    docs: 'docs/conventions/public-reference-policy.md (Secrets and credentials)',
  },
];

function writePermission(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function allow(agentMessage) {
  const payload = { permission: 'allow' };
  if (agentMessage) {
    payload.agent_message = agentMessage;
  }
  writePermission(payload);
  process.exit(0);
}

function deny(userMessage, agentMessage) {
  writePermission({
    permission: 'deny',
    user_message: userMessage,
    agent_message: agentMessage,
  });
  process.exit(0);
}

function isGitCommitOrPush(command) {
  if (typeof command !== 'string' || command.trim() === '') {
    return false;
  }
  return /\bgit(?:\.exe)?\s+(?:-C\s+\S+\s+)*(?:commit|push)\b/i.test(command);
}

function readStdinWithTimeout(ms) {
  return new Promise((resolve) => {
    let raw = '';
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => done(raw), ms);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      done(raw);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      done(raw);
    });
    if (process.stdin.readableEnded) {
      clearTimeout(timer);
      done(raw);
    }
  });
}

try {
  const raw = (await readStdinWithTimeout(2000)).replace(/^\uFEFF/, '').trim();
  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    allow();
  }

  const command = payload.command ?? payload.tool_input?.command ?? '';
  if (!isGitCommitOrPush(command)) {
    allow();
  }

  const failures = [];
  const missing = [];
  for (const checker of checkers) {
    if (!existsSync(checker.script)) {
      missing.push(checker.id);
      continue;
    }
    const result = spawnSync(process.execPath, [checker.script], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (result.error || result.status === null) {
      missing.push(checker.id);
      continue;
    }
    if (result.status === 0) {
      continue;
    }
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    failures.push({ id: checker.id, docs: checker.docs, details });
  }

  if (failures.length === 0) {
    allow(
      missing.length > 0
        ? `publish-safety: skipped missing checkers (${missing.join(', ')})`
        : undefined,
    );
  }

  const summary = failures
    .map((f) => `pnpm check:${f.id}\n${f.details}\nSee ${f.docs}`)
    .join('\n\n');
  deny(
    `Blocked git commit/push: ${failures.map((f) => f.id).join(', ')} check(s) failed. Fix findings, then rerun.`,
    summary,
  );
} catch (error) {
  allow(
    `publish-safety hook error (allowed): ${error instanceof Error ? error.message : String(error)}`,
  );
}
