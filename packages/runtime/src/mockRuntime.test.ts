import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockWorkbenchRuntime } from './mockRuntime';
import type { WorkbenchRuntimeEvent } from './types';

describe('mock workbench runtime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits user messages and running status on send', () => {
    const runtime = createMockWorkbenchRuntime({ response: false });
    const events: WorkbenchRuntimeEvent[] = [];
    runtime.subscribe((event) => events.push(event));

    const message = runtime.sendMessage('  hello runtime  ');

    expect(message).toMatchObject({
      content: 'hello runtime',
      id: 'runtime-message-1',
      source: 'user',
    });
    expect(runtime.getStatus()).toBe('running');
    expect(events.map((event) => event.type)).toEqual(['message', 'status']);
  });

  it('streams assistant chunks and returns to idle', async () => {
    vi.useFakeTimers();
    const runtime = createMockWorkbenchRuntime({
      response: {
        chunks: ['first ', 'second'],
        intervalMs: 10,
      },
    });

    runtime.sendMessage('summarize');

    await vi.advanceTimersByTimeAsync(20);

    expect(runtime.getStatus()).toBe('idle');
    expect(runtime.getMessages().map((message) => message.content)).toEqual([
      'summarize',
      'first second',
    ]);
  });

  it('cancels pending assistant chunks', async () => {
    vi.useFakeTimers();
    const runtime = createMockWorkbenchRuntime({
      response: {
        chunks: ['first ', 'second'],
        intervalMs: 10,
      },
    });

    runtime.sendMessage('cancel this');
    await vi.advanceTimersByTimeAsync(10);
    runtime.cancel();
    await vi.advanceTimersByTimeAsync(100);

    expect(runtime.getStatus()).toBe('cancelled');
    expect(runtime.getMessages().map((message) => message.content)).toEqual([
      'cancel this',
      'first ',
    ]);
  });

  it('emits workspace patches after streaming finishes', async () => {
    vi.useFakeTimers();
    const runtime = createMockWorkbenchRuntime({
      response: {
        chunks: ['done'],
        intervalMs: 1,
        workspacePatches: [
          {
            content: 'runtime notes',
            path: 'docs/runtime-notes.md',
            source: 'assistant',
            type: 'write-file',
          },
        ],
      },
    });
    const patches: string[] = [];
    runtime.subscribe((event) => {
      if (event.type === 'workspace-patch') {
        patches.push(event.patch.path);
      }
    });

    runtime.sendMessage('write notes');
    await vi.advanceTimersByTimeAsync(1);

    expect(patches).toEqual(['docs/runtime-notes.md']);
  });
});
