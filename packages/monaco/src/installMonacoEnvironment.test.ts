import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMonacoWorker,
  installMonacoEnvironment,
  resolveMonacoWorkerSource,
} from './installMonacoEnvironment.js';

describe('installMonacoEnvironment', () => {
  afterEach(() => {
    const global = globalThis as { MonacoEnvironment?: unknown };
    delete global.MonacoEnvironment;
    vi.unstubAllGlobals();
  });

  it('routes language labels and falls back to editor', () => {
    const workers = {
      editor: 'editor.js',
      json: 'json.js',
      css: 'css.js',
      html: 'html.js',
      typescript: 'ts.js',
    };

    expect(resolveMonacoWorkerSource('json', workers)).toBe('json.js');
    expect(resolveMonacoWorkerSource('scss', workers)).toBe('css.js');
    expect(resolveMonacoWorkerSource('javascript', workers)).toBe('ts.js');
    expect(resolveMonacoWorkerSource('plaintext', workers)).toBe('editor.js');
  });

  it('creates URL workers and factory workers', () => {
    class FakeWorker {
      constructor(
        readonly url?: string | URL,
        readonly options?: WorkerOptions,
      ) {}
    }
    vi.stubGlobal('Worker', FakeWorker);

    const fromUrl = createMonacoWorker('https://example.test/editor.js', 'editor');
    expect(fromUrl).toBeInstanceOf(FakeWorker);
    expect((fromUrl as FakeWorker).url).toBe('https://example.test/editor.js');

    const fromFactory = createMonacoWorker(() => new FakeWorker() as unknown as Worker, 'json');
    expect(fromFactory).toBeInstanceOf(FakeWorker);
  });

  it('installs getWorker on globalThis', () => {
    class FakeWorker {
      constructor() {}
    }
    vi.stubGlobal('Worker', FakeWorker);

    installMonacoEnvironment({
      editor: () => new FakeWorker() as unknown as Worker,
      json: () => new FakeWorker() as unknown as Worker,
    });

    const env = (globalThis as { MonacoEnvironment?: { getWorker?: Function } }).MonacoEnvironment;
    expect(env?.getWorker?.('', 'json')).toBeInstanceOf(FakeWorker);
    expect(env?.getWorker?.('', 'unknown')).toBeInstanceOf(FakeWorker);
  });
});
