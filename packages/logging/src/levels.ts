export type WorkbenchLogLevel = 'debug' | 'info' | 'warn' | 'error';

export const WORKBENCH_LOG_LEVEL_RANK: Record<WorkbenchLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function isWorkbenchLogLevel(value: string): value is WorkbenchLogLevel {
  return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
}
