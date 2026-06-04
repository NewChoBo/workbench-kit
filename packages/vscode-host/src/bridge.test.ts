import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMessageBridge,
  type HostMessageEnvelope,
  type MessageBridgeOptions,
  createWindowMessageTransport,
} from './bridge';

function createMockTransport() {
  const listeners = new Set<(message: HostMessageEnvelope) => void>();
  const posted: HostMessageEnvelope[] = [];

  const transport = {
    postMessage: (message: HostMessageEnvelope) => {
      posted.push(message);
    },
    subscribe: (listener: (message: HostMessageEnvelope) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    listeners,
    posted,
    transport,
    emit: (message: HostMessageEnvelope) => {
      listeners.forEach((listener) => listener(message));
    },
  };
}

describe('createMessageBridge', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('forwards helper outputs to transport', () => {
    const { transport, posted } = createMockTransport();
    const bridge = createMessageBridge({ transport });

    bridge.sendCommandResult('cmd.open', true, 'request-1');
    bridge.sendChatEvent(
      { type: 'message', message: { id: 'm1', source: 'assistant', content: 'hi' } },
      'request-2',
    );
    bridge.sendPatchResult({
      type: 'patch:applied',
      patch: { path: 'file.ts', type: 'write-file', content: 'ok' },
    });
    bridge.sendSaveResult({
      kind: 'save:success',
      outcome: 'created',
      file: { path: 'file.ts', content: 'ok' },
    });

    expect(posted).toMatchObject([
      {
        type: 'workbench/command-result',
        payload: { commandId: 'cmd.open', executed: true },
        requestId: 'request-1',
      },
      { type: 'workbench/chat/event', requestId: 'request-2' },
      { type: 'workbench/patch/result' },
      { type: 'workbench/save/result' },
    ]);
  });

  it('filters inbound messages and supports subscribe/unsubscribe', () => {
    const { transport, emit, posted } = createMockTransport();
    const options: MessageBridgeOptions = {
      transport,
      filter: (message) => message.type === 'workbench/command',
    };
    const bridge = createMessageBridge(options);
    const received: HostMessageEnvelope[] = [];

    const unsubscribe = bridge.subscribe((message) => received.push(message));
    transport.postMessage({
      type: 'workbench/save/result',
      payload: { kind: 'save:failure', code: 'unknown', path: 'x' },
    });
    emit({ type: 'workbench/command-result', payload: { commandId: 'x', executed: false } });
    emit({ type: 'workbench/command', payload: { commandId: 'x' } });

    expect(received.map((message) => message.type)).toEqual(['workbench/command']);

    unsubscribe();
    emit({ type: 'workbench/command', payload: { commandId: 'x' } });
    expect(received).toHaveLength(1);
    expect(posted).toHaveLength(1);
  });
});

describe('createWindowMessageTransport', () => {
  it('creates a no-op transport when no event target exists', () => {
    const transport = createWindowMessageTransport({ eventTarget: null });
    const unsubscribe = transport.subscribe(() => {
      throw new Error('should not be called');
    });
    transport.postMessage({
      type: 'workbench/command-result',
      payload: { commandId: 'x', executed: true },
    });

    expect(() => unsubscribe()).not.toThrow();
  });
});
