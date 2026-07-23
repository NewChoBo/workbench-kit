import { isDevRuntime } from './isDevRuntime';
import { isWorkbenchLogLevel, WORKBENCH_LOG_LEVEL_RANK, type WorkbenchLogLevel } from './levels';

export interface WorkbenchLogEvent {
  readonly data?: unknown;
  readonly label: string;
  readonly level: WorkbenchLogLevel;
  readonly message: string;
  readonly scope: string;
  readonly timestamp: number;
}

export interface WorkbenchLogSink {
  write(event: WorkbenchLogEvent): void;
}

export interface WorkbenchLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
}

export interface WorkbenchLoggerOptions {
  enabled?: boolean | (() => boolean);
  labelPrefix?: string;
  minLevel?: WorkbenchLogLevel | (() => WorkbenchLogLevel);
  /**
   * Additional sinks after the default console sink. Level filtering runs before
   * any sink. Sink errors are swallowed so callers are never interrupted.
   */
  sinks?: readonly WorkbenchLogSink[];
  /** When false, skip the built-in console sink (default true). */
  consoleSink?: boolean;
}

const noopLogger: WorkbenchLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  time: () => undefined,
  timeEnd: () => undefined,
};

function resolveMinLevel(
  minLevel: WorkbenchLogLevel | (() => WorkbenchLogLevel) | undefined,
): WorkbenchLogLevel {
  const resolved = typeof minLevel === 'function' ? minLevel() : minLevel;
  if (resolved && isWorkbenchLogLevel(resolved)) {
    return resolved;
  }

  return isDevRuntime() ? 'debug' : 'warn';
}

function resolveEnabled(enabled: boolean | (() => boolean) | undefined): boolean {
  if (typeof enabled === 'function') {
    return enabled();
  }

  if (enabled === undefined) {
    return isDevRuntime();
  }

  return enabled;
}

function formatLabel(labelPrefix: string, scope: string): string {
  return `[${labelPrefix}:${scope}]`;
}

export function createConsoleWorkbenchLogSink(): WorkbenchLogSink {
  return {
    write(event) {
      const payload =
        event.data === undefined
          ? [event.label, event.message]
          : [event.label, event.message, event.data];

      switch (event.level) {
        case 'debug':
          console.debug(...payload);
          break;
        case 'info':
          console.info(...payload);
          break;
        case 'warn':
          console.warn(...payload);
          break;
        case 'error':
          console.error(...payload);
          break;
        default:
          break;
      }
    },
  };
}

function writeToSinks(sinks: readonly WorkbenchLogSink[], event: WorkbenchLogEvent): void {
  for (const sink of sinks) {
    try {
      sink.write(event);
    } catch {
      // Isolate sink failures from logging callers.
    }
  }
}

export function createWorkbenchLogger(
  scope: string,
  options: WorkbenchLoggerOptions = {},
): WorkbenchLogger {
  const labelPrefix = options.labelPrefix ?? 'workbench-kit';

  if (!resolveEnabled(options.enabled)) {
    return noopLogger;
  }

  const sinks: WorkbenchLogSink[] = [
    ...(options.consoleSink === false ? [] : [createConsoleWorkbenchLogSink()]),
    ...(options.sinks ?? []),
  ];

  const write = (level: WorkbenchLogLevel, message: string, data?: unknown): void => {
    if (
      WORKBENCH_LOG_LEVEL_RANK[level] < WORKBENCH_LOG_LEVEL_RANK[resolveMinLevel(options.minLevel)]
    ) {
      return;
    }

    const label = formatLabel(labelPrefix, scope);
    writeToSinks(sinks, {
      data,
      label,
      level,
      message,
      scope,
      timestamp: Date.now(),
    });
  };

  const timerLabel = (label: string) => `${formatLabel(labelPrefix, scope)} ${label}`;

  return {
    debug: (message, data) => write('debug', message, data),
    info: (message, data) => write('info', message, data),
    warn: (message, data) => write('warn', message, data),
    error: (message, data) => write('error', message, data),
    time: (label) => console.time(timerLabel(label)),
    timeEnd: (label) => console.timeEnd(timerLabel(label)),
  };
}
