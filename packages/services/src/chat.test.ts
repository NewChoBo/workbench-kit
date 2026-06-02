import { describe, expect, it, vi } from 'vitest';
import { WorkbenchChatService } from './chat';
import type { ChatStreamEvent, ChatTransport, ChatTransportListener } from '@newchobo-ui/contracts';

class MockChatTransport implements ChatTransport {
  private listeners = new Set<ChatTransportListener>();
  public messages: string[] = [];
  public cancelled = false;

  async sendMessage(message: string) {
    this.messages.push(message);
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

  it('trims message before transport send and supports cancellation', async () => {
    const transport = new MockChatTransport();
    const service = new WorkbenchChatService({ transport });

    await service.sendMessage('  hello world  ');
    service.cancel();

    expect(transport.messages).toEqual(['hello world']);
    expect(transport.cancelled).toBe(true);
    expect(service.getSnapshot().status).toBe('cancelled');
  });
});
