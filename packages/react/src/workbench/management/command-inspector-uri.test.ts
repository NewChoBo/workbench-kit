import { describe, expect, it } from 'vitest';
import {
  buildCommandInspectorUri,
  isCommandInspectorUri,
  parseCommandInspectorUri,
} from './command-inspector-uri.js';

describe('command-inspector-uri', () => {
  it('round-trips command ids', () => {
    const commandId = 'workbench-kit.builtin.commands.refresh';
    const uri = buildCommandInspectorUri(commandId);

    expect(uri).toBe('workbench://command/inspect/workbench-kit.builtin.commands.refresh');
    expect(parseCommandInspectorUri(uri)).toBe(commandId);
    expect(isCommandInspectorUri(uri)).toBe(true);
  });

  it('encodes reserved characters', () => {
    const commandId = 'demo/command?id=1';
    const uri = buildCommandInspectorUri(commandId);

    expect(parseCommandInspectorUri(uri)).toBe(commandId);
  });

  it('rejects unrelated resources', () => {
    expect(parseCommandInspectorUri('workspace://file/README.md')).toBeUndefined();
    expect(isCommandInspectorUri('workspace://file/README.md')).toBe(false);
  });
});
