type SidebarDevLogger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
};

const noop = () => {};

function createSidebarDevLogger(): SidebarDevLogger {
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;

  if (!isDev) {
    return { debug: noop, info: noop, time: noop, timeEnd: noop };
  }

  const prefix = '[workbench-kit:sidebar]';

  return {
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
    info: (...args: unknown[]) => console.info(prefix, ...args),
    time: (label: string) => console.time(`${prefix} ${label}`),
    timeEnd: (label: string) => console.timeEnd(`${prefix} ${label}`),
  };
}

export const sidebarDevLogger = createSidebarDevLogger();
