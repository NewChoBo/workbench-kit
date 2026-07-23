/**
 * Bundler-agnostic `MonacoEnvironment.getWorker` bootstrap.
 *
 * Pass worker **URL strings** (Vite `?worker&url`) or **factories** that return
 * a `Worker` (Vite/Storybook `?worker` constructors wrapped as `() => new Ctor()`).
 */

export type MonacoWorkerSource = string | (() => Worker);

export interface MonacoEnvironmentWorkers {
  readonly editor: MonacoWorkerSource;
  readonly json?: MonacoWorkerSource | undefined;
  readonly css?: MonacoWorkerSource | undefined;
  readonly html?: MonacoWorkerSource | undefined;
  readonly typescript?: MonacoWorkerSource | undefined;
}

export interface InstallMonacoEnvironmentOptions {
  /** Worker `type` when the source is a URL string. Defaults to `module`. */
  readonly workerType?: WorkerType | undefined;
}

type MonacoEnvironmentGlobal = typeof globalThis & {
  MonacoEnvironment?: {
    getWorker?: (moduleId: string, label: string) => Worker;
  };
};

/** Resolve the worker source for a Monaco language label (unknown → editor). */
export function resolveMonacoWorkerSource(
  label: string,
  workers: MonacoEnvironmentWorkers,
): MonacoWorkerSource {
  if (label === 'json') {
    return workers.json ?? workers.editor;
  }
  if (label === 'css' || label === 'scss' || label === 'less') {
    return workers.css ?? workers.editor;
  }
  if (label === 'html' || label === 'handlebars' || label === 'razor') {
    return workers.html ?? workers.editor;
  }
  if (label === 'typescript' || label === 'javascript') {
    return workers.typescript ?? workers.editor;
  }
  return workers.editor;
}

export function createMonacoWorker(
  source: MonacoWorkerSource,
  label: string,
  workerType: WorkerType = 'module',
): Worker {
  if (typeof source === 'string') {
    return new Worker(source, { name: `monaco-${label}-worker`, type: workerType });
  }
  return source();
}

/**
 * Installs `globalThis.MonacoEnvironment.getWorker` from a label→source map.
 * Safe to call more than once (replaces `getWorker`).
 */
export function installMonacoEnvironment(
  workers: MonacoEnvironmentWorkers,
  options: InstallMonacoEnvironmentOptions = {},
): void {
  const workerType = options.workerType ?? 'module';
  const monacoGlobal = globalThis as MonacoEnvironmentGlobal;

  monacoGlobal.MonacoEnvironment = {
    ...monacoGlobal.MonacoEnvironment,
    getWorker: (_moduleId: string, label: string) =>
      createMonacoWorker(resolveMonacoWorkerSource(label, workers), label, workerType),
  };
}
