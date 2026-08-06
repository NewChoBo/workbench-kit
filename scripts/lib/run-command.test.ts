import { describe, expect, it } from 'vitest';

import { quoteWindowsCommandArg, runCommand } from './run-command.mjs';

describe('run-command', () => {
  it('leaves shell-safe command arguments unquoted', () => {
    expect(quoteWindowsCommandArg('@workbench-kit/react')).toBe('@workbench-kit/react');
    expect(quoteWindowsCommandArg('packages\\react')).toBe('packages\\react');
  });

  it('quotes whitespace and escapes cmd metacharacters', () => {
    expect(quoteWindowsCommandArg('path with spaces')).toBe('"path with spaces"');
    expect(quoteWindowsCommandArg('one&two')).toBe('"one^&two"');
    expect(quoteWindowsCommandArg('say"hello')).toBe('"say^"hello"');
  });

  it('runs absolute executables without losing spaced arguments', () => {
    const output = runCommand(
      process.execPath,
      ['-e', 'process.stdout.write(process.argv[1])', 'a b'],
      {
        encoding: 'utf8',
      },
    );

    expect(output).toBe('a b');
  });
});
