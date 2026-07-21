import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fail when tracked sources look like they contain credentials or secret material.
 * Policy: docs/conventions/public-reference-policy.md (Secrets section)
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const selfPath = relative(repoRoot, fileURLToPath(import.meta.url)).replace(/\\/g, '/');

const skippedDirectoryNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'out',
  'build',
  'coverage',
  'storybook-static',
  '.turbo',
  '.vite',
  '.pnpm-store',
]);

const scannedExtensions = new Set([
  '.md',
  '.mdc',
  '.mdx',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.json',
  '.yml',
  '.yaml',
  '.html',
  '.env',
  '.pem',
  '.key',
  '.npmrc',
  '.ps1',
  '.sh',
  '.bash',
]);

const forbiddenFileNamePatterns = [
  /^\.env(\..+)?$/i, // .env, .env.local, … (.env.example allowed below)
  /^credentials\.json$/i,
  /^.*\.(pem|p12|pfx)$/i,
  /^id_rsa$/i,
  /^id_ed25519$/i,
];

const allowedEnvExampleNames = new Set(['.env.example', '.env.sample', '.env.template']);

const linePatterns = [
  {
    name: 'private-key-block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  },
  {
    name: 'aws-access-key-id',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'github-token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/,
  },
  {
    name: 'github-fine-grained-pat',
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  },
  {
    name: 'npm-token',
    regex: /\bnpm_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: 'slack-token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    name: 'openai-style-key',
    regex: /\bsk-[A-Za-z0-9]{20,}\b/,
  },
  {
    name: 'npmrc-auth-token',
    regex: /(?:^|[\s;])_authToken\s*=\s*\S+/,
  },
  {
    name: 'assignment-looking-secret',
    // key/secret/token/password = 'value' in code, comments, or docs
    regex:
      /\b(?:api[_-]?key|access[_-]?key|secret[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|refresh[_-]?token|private[_-]?key|password|passwd|pwd)\b\s*[:=]\s*['"`][^'"`\s]{12,}['"`]/i,
  },
  {
    name: 'bearer-token-literal',
    regex: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/,
  },
  {
    name: 'jwt-looking-literal',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
];

const placeholderValue =
  /(?:your[_-]?|my[_-]?|dummy|example|sample|placeholder|changeme|replace[_-]?me|xxx+|test[_-]?|fake[_-]?|todo\b|<[^>]+>|\$\{|[A-Z][A-Z0-9_]{2,}})/i;

const envReferenceOnly = /process\.env\.|import\.meta\.env\.|Deno\.env/;

function shouldSkipLine(line) {
  if (envReferenceOnly.test(line) && !/['"`][^'"`]{12,}['"`]/.test(line)) {
    return true;
  }
  return false;
}

function isPlaceholderAssignment(line) {
  const match = line.match(/[:=]\s*['"`]([^'"`]+)['"`]/);
  if (!match) {
    return false;
  }
  return placeholderValue.test(match[1]);
}

function isForbiddenFileName(fileName) {
  if (allowedEnvExampleNames.has(fileName)) {
    return false;
  }
  return forbiddenFileNamePatterns.some((pattern) => pattern.test(fileName));
}

function shouldScanFile(relativePath, fileName) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === selfPath || normalized === 'pnpm-lock.yaml') {
    return false;
  }
  if (fileName.startsWith('.') && allowedEnvExampleNames.has(fileName)) {
    return true;
  }
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop().toLowerCase()}` : '';
  if (scannedExtensions.has(ext) || scannedExtensions.has(fileName)) {
    return true;
  }
  // Scan extensionless env-like names
  return isForbiddenFileName(fileName);
}

const violations = [];

function scanDirectory(currentPath) {
  for (const name of readdirSync(currentPath)) {
    if (skippedDirectoryNames.has(name)) {
      continue;
    }

    const next = join(currentPath, name);
    const stat = statSync(next);

    if (stat.isDirectory()) {
      scanDirectory(next);
      continue;
    }

    const relativePath = relative(repoRoot, next).replace(/\\/g, '/');
    if (!shouldScanFile(relativePath, name)) {
      continue;
    }

    if (isForbiddenFileName(basename(next))) {
      violations.push({
        path: relativePath,
        line: 0,
        rule: 'forbidden-secret-filename',
        text: `tracked file name looks like secret material (${name})`,
      });
      continue;
    }

    let content;
    try {
      content = readFileSync(next, 'utf8');
    } catch {
      continue;
    }

    // Skip obvious binaries
    if (content.includes('\u0000')) {
      continue;
    }

    content.split(/\r?\n/).forEach((line, index) => {
      if (shouldSkipLine(line)) {
        return;
      }
      for (const pattern of linePatterns) {
        if (!pattern.regex.test(line)) {
          continue;
        }
        if (pattern.name === 'assignment-looking-secret' && isPlaceholderAssignment(line)) {
          continue;
        }
        violations.push({
          path: relativePath,
          line: index + 1,
          rule: pattern.name,
          text: line.trim().slice(0, 160),
        });
      }
    });
  }
}

scanDirectory(repoRoot);

if (violations.length > 0) {
  console.error('Secret check failed: credential-looking material found in tracked sources.');
  console.error('Never commit API keys, tokens, private keys, or .env secret files.');
  console.error('See docs/conventions/public-reference-policy.md (Secrets and credentials).');
  for (const violation of violations) {
    const loc = violation.line > 0 ? `${violation.path}:${violation.line}` : violation.path;
    console.error(`${loc} [${violation.rule}] ${violation.text}`);
  }
  process.exit(1);
}

console.log('Secret check passed (no credential-looking material in scanned sources).');
process.exit(0);
