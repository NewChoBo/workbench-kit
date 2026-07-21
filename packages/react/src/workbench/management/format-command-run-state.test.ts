import { describe, expect, it } from 'vitest';

import { formatCommandRunState } from './format-command-run-state.js';
import type { CommandManagementRunState } from './types.js';

function createRunState(overrides: Partial<CommandManagementRunState>): CommandManagementRunState {
  return {
    commandId: 'workbench.test',
    status: 'success',
    timestamp: 1,
    ...overrides,
  };
}

describe('formatCommandRunState', () => {
  it('returns undefined when no command has run', () => {
    expect(formatCommandRunState(undefined)).toBeUndefined();
  });

  it('formats running state', () => {
    expect(formatCommandRunState(createRunState({ status: 'running' }))).toBe(
      'Running workbench.test…',
    );
  });

  it('formats error state with message fallback', () => {
    expect(
      formatCommandRunState(
        createRunState({
          message: 'Command failed',
          status: 'error',
        }),
      ),
    ).toBe('Failed: Command failed');
    expect(formatCommandRunState(createRunState({ status: 'error' }))).toBe(
      'Failed: workbench.test',
    );
  });

  it('formats success state with the sidebar label', () => {
    expect(formatCommandRunState(createRunState({ status: 'success' }))).toBe('Ran workbench.test');
  });
});
