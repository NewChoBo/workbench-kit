import { describe, expect, it } from 'vitest';

import { parseWorkbenchChatCommandInput } from './chat-command-input.js';

const validCommandIds = new Set([
  'workspace.open',
  'workbench.togglePrimarySidebar',
  'sample.echo',
]);

describe('parseWorkbenchChatCommandInput', () => {
  it('ignores regular chat input', () => {
    expect(parseInput('open the sidebar')).toEqual({ type: 'none' });
  });

  it('returns unknown slash commands', () => {
    expect(parseInput('/missing.command')).toEqual({
      token: 'missing.command',
      type: 'unknown',
    });
  });

  it('parses a command without arguments', () => {
    expect(parseInput('/workbench.togglePrimarySidebar')).toEqual({
      args: [],
      commandId: 'workbench.togglePrimarySidebar',
      type: 'run',
    });
  });

  it('parses a single JSON command argument', () => {
    expect(parseInput('/workspace.open {"paths":["src/App.tsx"]}')).toEqual({
      args: [{ paths: ['src/App.tsx'] }],
      commandId: 'workspace.open',
      type: 'run',
    });
  });

  it('parses a JSON string command argument', () => {
    expect(parseInput('/sample.echo "hello"')).toEqual({
      args: ['hello'],
      commandId: 'sample.echo',
      type: 'run',
    });
  });

  it('rejects non-JSON command arguments', () => {
    expect(parseInput('/workspace.open src/App.tsx')).toEqual({
      commandId: 'workspace.open',
      message:
        'Command arguments must be valid JSON. Use /command.id {"key":"value"} or /command.id "value".',
      type: 'invalid-arguments',
    });
  });
});

function parseInput(input: string) {
  return parseWorkbenchChatCommandInput(input, (commandId) => validCommandIds.has(commandId));
}
