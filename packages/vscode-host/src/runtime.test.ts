import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandRegistry } from '@workbench-kit/core';
import { createCommandRegistry } from '@workbench-kit/core';
import type { HostMessageEnvelope, HostTransport } from './bridge';
import { createHostRuntime } from './runtime';

interface TransportTestHarness {
  emit: (message: HostMessageEnvelope) => void;
  transport: HostTransport;
  posted: HostMessageEnvelope[];
}

function createTransportHarness(): TransportTestHarness {
  const subscribers = new Set<(message: HostMessageEnvelope) => void>();
  const posted: HostMessageEnvelope[] = [];

  return {
    transport: {
      postMessage: (message) => posted.push(message),
      subscribe: (listener) => {
        subscribers.add(listener);
        return () => {
          subscribers.delete(listener);
        };
      },
    },
    posted,
    emit: (message) => {
      subscribers.forEach((listener) => listener(message));
    },
  };
}

function createCommandRuntimeContext<TContext>(
  commandRegistry: CommandRegistry<TContext>,
  options: {
    transport: HostTransport;
    contextFactory?: () => TContext;
  },
) {
  return createHostRuntime({
    commandRegistry,
    transport: options.transport,
    contextFactory: options.contextFactory ?? (() => ({}) as unknown as TContext),
  });
}

describe('createHostRuntime', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('executes a command and posts command result', async () => {
    const run = vi.fn();
    const registry = createCommandRegistry([{ id: 'workbench.test', label: 'Test', run }]);
    const harness = createTransportHarness();
    const runtime = createCommandRuntimeContext(registry, { transport: harness.transport });

    harness.emit({
      type: 'workbench/command',
      requestId: 'r1',
      payload: { commandId: 'workbench.test', context: { user: 'test' } },
    });

    await Promise.resolve();
    expect(run.mock.calls[0]).toEqual([{ user: 'test' }]);
    expect(
      harness.posted.map((message) => ({ type: message.type, payload: message.payload })),
    ).toEqual([
      {
        type: 'workbench/command-result',
        payload: { commandId: 'workbench.test', executed: true },
      },
    ]);

    runtime.dispose();
  });

  it('forwards chat send payload to chat service and trims content', async () => {
    const sendMessage = vi.fn(async () => undefined);
    const chatService = {
      cancel: vi.fn(),
      dispose: vi.fn(),
      sendMessage,
      getSnapshot: vi.fn(() => ({ status: 'idle' })),
      subscribe: vi.fn(() => vi.fn()),
    };
    const harness = createTransportHarness();

    const runtime = createHostRuntime({ chatService, transport: harness.transport });
    harness.emit({
      type: 'workbench/chat/send',
      payload: { content: '  hello world  ', context: { from: 'runtime' } },
    });

    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledWith('hello world', { from: 'runtime' });

    runtime.dispose();
  });

  it('routes patch apply result back to host', async () => {
    const applyPatch = vi.fn(async () => ({
      requestId: 'p-1',
      requestedAt: '2026-01-01T00:00:00.000Z',
      patch: { path: 'src/index.ts', type: 'write-file', content: 'ok' },
      type: 'patch:applied',
    }));
    const patchService = { applyPatch };
    const harness = createTransportHarness();

    const runtime = createHostRuntime({ patchService, transport: harness.transport });
    harness.emit({
      type: 'workbench/patch/apply',
      requestId: 'p1',
      payload: { path: 'src/index.ts', type: 'write-file', content: 'ok' },
    });

    await Promise.resolve();
    expect(applyPatch).toHaveBeenCalledWith({
      path: 'src/index.ts',
      type: 'write-file',
      content: 'ok',
    });
    expect(harness.posted[0]).toMatchObject({ type: 'workbench/patch/result' });

    runtime.dispose();
  });

  it('routes save commit result back to host', async () => {
    const commit = vi.fn(async () => ({
      requestId: 's-1',
      requestedAt: '2026-01-01T00:00:00.000Z',
      kind: 'save:success',
      outcome: 'created',
      file: { path: 'src/index.ts', content: 'ok' },
    }));
    const saveService = { commit };
    const harness = createTransportHarness();

    const runtime = createHostRuntime({ saveService, transport: harness.transport });
    harness.emit({
      type: 'workbench/save/commit',
      requestId: 's1',
      payload: { path: 'src/index.ts', content: 'ok' },
    });

    await Promise.resolve();
    expect(commit).toHaveBeenCalledWith({ path: 'src/index.ts', content: 'ok' });
    expect(harness.posted[0]).toMatchObject({ type: 'workbench/save/result' });

    runtime.dispose();
  });

  it('forwards chat cancel command', async () => {
    const cancel = vi.fn();
    const chatService = {
      cancel,
      dispose: vi.fn(),
      sendMessage: vi.fn(async () => undefined),
      getSnapshot: vi.fn(() => ({ status: 'idle' })),
      subscribe: vi.fn(() => vi.fn()),
    };
    const harness = createTransportHarness();
    const runtime = createHostRuntime({ chatService, transport: harness.transport });

    harness.emit({ type: 'workbench/chat/cancel' });
    runtime.dispose();
    expect(cancel).toHaveBeenCalled();
  });
});
