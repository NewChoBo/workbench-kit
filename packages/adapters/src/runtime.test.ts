import { describe, expect, it } from 'vitest';
import { createMockWorkbenchRuntime } from '@newchobo-ui/runtime';
import type { ChatStreamEvent } from '@newchobo-ui/contracts';
import { createChatTransportFromRuntime, emitRuntimeWorkspacePatch } from './runtime';

describe('runtime adapter', () => {
  it('forwards chat message send and status events as transport events', async () => {
    const runtime = createMockWorkbenchRuntime({
      response: {
        chunks: ['ok'],
        intervalMs: 1,
      },
      initialStatus: 'idle',
    });
    const transport = createChatTransportFromRuntime({ runtime });
    const events: ChatStreamEvent[] = [];
    const unsubscribe = transport.subscribe((event) => events.push(event));

    const message = await transport.sendMessage('Hello runtime');
    expect(message).toMatchObject({
      source: 'user',
      content: 'Hello runtime',
    });

    expect(events.some((event) => event.type === 'message')).toBe(true);

    unsubscribe();
    runtime.dispose();
  });

  it('translates runtime workspace patch events', () => {
    const runtime = createMockWorkbenchRuntime({
      response: false,
    });
    const transport = createChatTransportFromRuntime({ runtime });
    const events: ChatStreamEvent[] = [];
    const unsubscribe = transport.subscribe((event) => events.push(event));

    emitRuntimeWorkspacePatch({
      patch: { path: 'docs/runtime-notes.md', type: 'delete-file' },
      runtime,
    });
    emitRuntimeWorkspacePatch({
      patch: {
        content: 'runtime content',
        path: 'docs/runtime-notes.md',
        type: 'write-file',
        updatedAt: '2026-06-03T00:00:00.000Z',
      },
      runtime,
    });

    expect(events).toEqual([
      {
        patch: {
          path: 'docs/runtime-notes.md',
          type: 'delete-file',
        },
        type: 'workspace-patch',
      },
      {
        patch: {
          content: 'runtime content',
          mimeType: undefined,
          path: 'docs/runtime-notes.md',
          source: undefined,
          type: 'write-file',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
        type: 'workspace-patch',
      },
    ]);

    unsubscribe();
    runtime.dispose();
  });

  it('maps cancel to runtime cancel behavior', async () => {
    const runtime = createMockWorkbenchRuntime({
      response: false,
    });

    const transport = createChatTransportFromRuntime({ runtime });
    await transport.sendMessage('Cancelable message');
    transport.cancel();
    expect(runtime.getStatus()).toBe('cancelled');
    runtime.dispose();
  });

  it('honors unsubscribe behavior', async () => {
    const runtime = createMockWorkbenchRuntime({
      response: false,
    });
    const transport = createChatTransportFromRuntime({ runtime });
    let count = 0;
    const unsubscribe = transport.subscribe(() => {
      count += 1;
    });

    await transport.sendMessage('first');
    const countAfterFirstSend = count;
    unsubscribe();
    await transport.sendMessage('second');

    expect(count).toBe(countAfterFirstSend);
    runtime.dispose();
  });
});
