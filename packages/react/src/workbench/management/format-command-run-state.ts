import type { CommandManagementRunState } from './types.js';

export function formatCommandRunState(
  lastRun: CommandManagementRunState | undefined,
): string | undefined {
  if (!lastRun) {
    return undefined;
  }

  if (lastRun.status === 'running') {
    return `Running ${lastRun.commandId}…`;
  }

  if (lastRun.status === 'error') {
    return lastRun.message ? `Failed: ${lastRun.message}` : `Failed: ${lastRun.commandId}`;
  }

  return `Ran ${lastRun.commandId}`;
}
