import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function runCommand(command, args, options = {}) {
  if (process.platform === 'win32' && !path.isAbsolute(command)) {
    return execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].map(quoteWindowsCommandArg).join(' ')],
      options,
    );
  }

  return execFileSync(command, args, options);
}

export function quoteWindowsCommandArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/u.test(text)) {
    return text;
  }
  return `"${text.replace(/(["^&|<>])/gu, '^$1')}"`;
}
