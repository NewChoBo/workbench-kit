import { describe, expect, it, vi } from 'vitest';
import { WorkbenchChatService } from './chat';
import type {
  ChatStreamEvent,
  ChatTransport,
  ChatTransportListener,
} from '@workbench-kit/contracts';

class MockChatTransport implements ChatTransport {
  private listeners = new Set<ChatTransportListener>();
  public messages: string[] = [];
  public contexts: Array<Record<string, unknown> | undefined> = [];
  public cancelled = false;
  public failSend = false;

  async sendMessage(message: string, options?: { context?: Record<string, unknown> }) {
    if (this.failSend) throw new Error('Transport failed');

    this.messages.push(message);
    this.contexts.push(options?.context);
    return {
      content: message,
      id: 'm-user',
      source: 'user' as const,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  subscribe(listener: ChatTransportListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: ChatStreamEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}

describe('WorkbenchChatService', () => {
  it('supports dispose-safe subscriptions and status updates', () => {
    const transport = new MockChatTransport();
    const events: ChatStreamEvent[] = [];
    const service = new WorkbenchChatService({ transport });
    service.subscribe((event) => events.push(event));
    service.dispose();

    transport.emit({
      previousStatus: 'idle',
      status: 'running',
      type: 'status',
    });

    expect(service.getSnapshot().status).toBe('idle');
    expect(events).toEqual([]);
    expect(service.getSnapshot()).toMatchObject({ status: 'idle' });
  });

  it('forwards transport events and tracks runtime status', () => {
    const transport = new MockChatTransport();
    const onPatch = vi.fn();
    const events: ChatStreamEvent[] = [];

    const service = new WorkbenchChatService({
      onPatch,
      transport,
    });
    service.subscribe((event) => events.push(event));

    transport.emit({
      previousStatus: 'idle',
      status: 'running',
      type: 'status',
    });

    transport.emit({
      delta: 'a',
      message: {
        content: 'answer',
        id: 'm-assistant',
        source: 'assistant',
      },
      type: 'message-delta',
    });
    transport.emit({
      patch: { path: 'docs/readme.md', type: 'delete-file' },
      type: 'workspace-patch',
    });

    expect(service.getSnapshot().status).toBe('running');
    expect(onPatch).toHaveBeenCalledWith({ path: 'docs/readme.md', type: 'delete-file' });
    expect(events).toHaveLength(3);
    expect(events[0]?.type).toBe('status');
    expect(events[1]?.type).toBe('message-delta');
    expect(events[2]?.type).toBe('workspace-patch');
  });

  it('preserves message whitespace for transport send and supports cancellation', async () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({ transport });

    await service.sendMessage('  hello world  ');
    service.cancel();

    expect(transport.messages).toEqual(['  hello world  ']);
    expect(transport.cancelled).toBe(true);
    expect(service.getSnapshot().status).toBe('cancelled');
  });

  it('passes send context to transport', async () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({ transport });

    await service.sendMessage('hello', { mode: 'manual' });

    expect(transport.contexts).toEqual([{ mode: 'manual' }]);
  });

  it('does not send after service dispose', async () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({ transport });
    service.dispose();

    await service.sendMessage('send after dispose');

    expect(transport.messages).toEqual([]);
  });

  it('stores error status when transport send fails', async () => {
    const transport = new MockChatTransport();
    transport.failSend = true;
    const service = new WorkbenchChatService({ transport });

    await expect(service.sendMessage('hello')).rejects.toThrow('Transport failed');
    expect(service.getSnapshot().status).toBe('error');
  });

  it('moves to running before transport send starts', async () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({ transport });

    const sendPromise = service.sendMessage('  hello  ');

    expect(service.getSnapshot().status).toBe('running');
    await sendPromise;
  });

  it('isolates onPatch callback failures from listeners and records error status', () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({
      onPatch: () => {
        throw new Error('patch failed');
      },
      transport,
    });

    transport.emit({
      patch: { path: 'docs/readme.md', type: 'delete-file' },
      type: 'workspace-patch',
    });

    expect(service.getSnapshot().status).toBe('error');
  });

  it('still dispatches workspace-patch events after onPatch callback failure', () => {
    const transport = new MockChatTransport();
    const listener = vi.fn();
    const service = new WorkbenchChatService({
      onPatch: () => {
        throw new Error('patch failed');
      },
      transport,
    });

    service.subscribe(listener);
    transport.emit({
      patch: { path: 'docs/readme.md', type: 'delete-file' },
      type: 'workspace-patch',
    });

    expect(service.getSnapshot().status).toBe('error');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      patch: { path: 'docs/readme.md', type: 'delete-file' },
      type: 'workspace-patch',
    });
  });

  it('isolates listener callback failures from future events', () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({ transport });
    const errorSpy = vi.fn();
    service.subscribe(() => {
      throw new Error('listener failed');
    });
    service.subscribe(errorSpy);

    transport.emit({
      patch: { path: 'docs/readme.md', type: 'delete-file' },
      type: 'workspace-patch',
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(service.getSnapshot().status).toBe('error');
  });
});
