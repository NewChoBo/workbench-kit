import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandRegistry } from '@workbench-kit/platform';
import { createCommandRegistry } from '@workbench-kit/platform';
import type {
  ChatStreamEvent,
  ChatTransport,
  ChatTransportListener,
} from '@workbench-kit/contracts';
import type { HostMessageEnvelope, HostTransport } from '@workbench-kit/vscode-host';
import { InMemoryWorkspaceFileRepository } from '@workbench-kit/adapters';
import {
  createWorkbenchExtensionRuntime,
  createWorkbenchExtensionRuntimeFromContributions,
  createWorkbenchExtensionRuntimeFromContributionsAuto,
  resolveCommandContributionConflictPolicy,
  preflightCommandContributionConflict,
} from '.';

interface TransportTestHarness {
  emit: (message: HostMessageEnvelope) => void;
  posted: HostMessageEnvelope[];
  transport: HostTransport;
}

const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

function createTransportHarness(): TransportTestHarness {
  const subscribers = new Set<(message: HostMessageEnvelope) => void>();
  const posted: HostMessageEnvelope[] = [];

  return {
    transport: {
      postMessage: (message) => {
        posted.push(message);
      },
      subscribe: (listener) => {
        subscribers.add(listener);
        return () => {
          subscribers.delete(listener);
        };
      },
    },
    posted,
    emit: (message) => {
      subscribers.forEach((listener) => {
        listener(message);
      });
    },
  };
}

class MockChatTransport implements ChatTransport {
  private readonly listeners = new Set<(event: ChatStreamEvent) => void>();
  public messages: string[] = [];

  async sendMessage(message: string) {
    this.messages.push(message);
    return {
      id: 'chat-message',
      content: message,
      source: 'user' as const,
    };
  }

  cancel() {
    return undefined;
  }

  subscribe(listener: ChatTransportListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: ChatStreamEvent) {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }
}

function createCommandRuntimeOptions(commandRegistry: CommandRegistry): {
  commandRegistry: CommandRegistry;
  contextFactory: () => Record<string, unknown>;
} {
  return {
    commandRegistry,
    contextFactory: () => ({ workspaceReady: true }),
  };
}

describe('createWorkbenchExtensionRuntime', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('routes patch commands from host transport to patch service callbacks', async () => {
    const harness = createTransportHarness();
    const repository = new InMemoryWorkspaceFileRepository([
      { content: 'old', path: 'docs/readme.md' },
    ]);
    const onPatchResult = vi.fn();

    const runtime = createWorkbenchExtensionRuntime({
      ...createCommandRuntimeOptions(createCommandRegistry([])),
      transport: harness.transport,
      repository,
      onPatchResult,
    });

    harness.emit({
      type: 'workbench/patch/apply',
      requestId: 'p-1',
      payload: {
        content: 'new',
        path: 'docs/readme.md',
        type: 'write-file',
      },
    });

    await waitForAsync();

    expect(harness.posted).toHaveLength(1);
    expect(harness.posted[0]?.type).toBe('workbench/patch/result');
    expect(onPatchResult).toHaveBeenCalledWith(
      {
        content: 'new',
        path: 'docs/readme.md',
        type: 'write-file',
      },
      expect.objectContaining({
        type: 'patch:applied',
      }),
      'command',
    );

    const written = await repository.getFile('docs/readme.md');
    expect(written).toMatchObject({ content: 'new' });

    runtime.dispose();
    expect(onPatchResult).toHaveBeenCalledTimes(1);
  });

  it('forwards command messages and emits command-result messages', async () => {
    const run = vi.fn();
    const registry = createCommandRegistry([
      {
        id: 'workbench.ping',
        label: 'Ping',
        run,
      },
    ]);
    const harness = createTransportHarness();
    const repository = new InMemoryWorkspaceFileRepository();

    const runtime = createWorkbenchExtensionRuntime({
      ...createCommandRuntimeOptions(registry),
      transport: harness.transport,
      repository,
    });

    harness.emit({
      payload: { commandId: 'workbench.ping', context: { mode: 'host-runtime' } },
      requestId: 'c1',
      type: 'workbench/command',
    });

    await waitForAsync();

    expect(run).toHaveBeenCalledWith({ mode: 'host-runtime', workspaceReady: true });
    expect(harness.posted).toContainEqual({
      type: 'workbench/command-result',
      payload: { commandId: 'workbench.ping', executed: true },
      requestId: 'c1',
    });

    runtime.dispose();
  });

  it('forwards host save events and invokes save result callback', async () => {
    const onSaveResult = vi.fn();
    const harness = createTransportHarness();
    const repository = new InMemoryWorkspaceFileRepository();

    const runtime = createWorkbenchExtensionRuntime({
      ...createCommandRuntimeOptions(createCommandRegistry([])),
      transport: harness.transport,
      repository,
      onSaveResult,
    });

    harness.emit({
      requestId: 's1',
      type: 'workbench/save/commit',
      payload: {
        content: 'saved',
        path: 'notes/todo.md',
      },
    });

    await waitForAsync();

    expect(harness.posted).toHaveLength(1);
    expect(harness.posted[0]?.type).toBe('workbench/save/result');
    expect(onSaveResult).toHaveBeenCalled();

    runtime.dispose();
  });

  it('forwards host chat message to chat service and triggers patch callback', async () => {
    const chatTransport = new MockChatTransport();
    const onChatPatch = vi.fn();
    const onPatchResult = vi.fn();
    const harness = createTransportHarness();
    const repository = new InMemoryWorkspaceFileRepository([
      { content: 'body', path: 'docs/readme.md' },
    ]);

    const runtime = createWorkbenchExtensionRuntime({
      ...createCommandRuntimeOptions(createCommandRegistry([])),
      transport: harness.transport,
      repository,
      chatTransport,
      onChatPatch,
      onPatchResult,
    });

    await runtime.services.chatService.sendMessage('  hello  ');
    chatTransport.emit({
      patch: { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      type: 'workspace-patch',
    });

    await waitForAsync();

    expect(chatTransport.messages).toEqual(['hello']);
    expect(onChatPatch).toHaveBeenCalledWith(
      { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      expect.objectContaining({ type: 'patch:applied' }),
    );
    expect(onPatchResult).toHaveBeenCalledWith(
      { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      expect.objectContaining({ type: 'patch:applied' }),
      'chat',
    );

    const written = await repository.getFile('docs/readme.md');
    expect(written).toMatchObject({
      content: 'updated',
    });

    runtime.dispose();
  });

  it('isolates chat patch callback failures while preserving patch application', async () => {
    const chatTransport = new MockChatTransport();
    const onChatPatch = vi.fn(() => {
      throw new Error('chat patch callback failed');
    });
    const onPatchResult = vi.fn();
    const harness = createTransportHarness();
    const repository = new InMemoryWorkspaceFileRepository([
      { content: 'body', path: 'docs/readme.md' },
    ]);

    const runtime = createWorkbenchExtensionRuntime({
      ...createCommandRuntimeOptions(createCommandRegistry([])),
      transport: harness.transport,
      repository,
      chatTransport,
      onChatPatch,
      onPatchResult,
    });

    await runtime.services.chatService.sendMessage('  hello  ');
    chatTransport.emit({
      patch: { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      type: 'workspace-patch',
    });

    await waitForAsync();

    expect(onChatPatch).toHaveBeenCalledWith(
      { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      expect.objectContaining({ type: 'patch:applied' }),
    );
    expect(onPatchResult).toHaveBeenCalledWith(
      { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      expect.objectContaining({ type: 'patch:applied' }),
      'chat',
    );

    const written = await repository.getFile('docs/readme.md');
    expect(written).toMatchObject({
      content: 'updated',
    });

    runtime.dispose();
  });

  it('isolates chat patch result callback failures without breaking runtime message flow', async () => {
    const chatTransport = new MockChatTransport();
    const onChatPatch = vi.fn();
    const onPatchResult = vi.fn(() => {
      throw new Error('patch result callback failed');
    });
    const harness = createTransportHarness();
    const repository = new InMemoryWorkspaceFileRepository([
      { content: 'body', path: 'docs/readme.md' },
    ]);

    const runtime = createWorkbenchExtensionRuntime({
      ...createCommandRuntimeOptions(createCommandRegistry([])),
      transport: harness.transport,
      repository,
      chatTransport,
      onChatPatch,
      onPatchResult,
    });

    await runtime.services.chatService.sendMessage('  hello  ');
    chatTransport.emit({
      patch: { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      type: 'workspace-patch',
    });

    await waitForAsync();

    expect(onChatPatch).toHaveBeenCalledTimes(1);
    expect(onPatchResult).toHaveBeenCalledTimes(1);
    expect(onPatchResult).toHaveBeenCalledWith(
      { path: 'docs/readme.md', content: 'updated', type: 'write-file' },
      expect.objectContaining({ type: 'patch:applied' }),
      'chat',
    );

    const written = await repository.getFile('docs/readme.md');
    expect(written).toMatchObject({
      content: 'updated',
    });

    runtime.dispose();
  });

  it('supports hard-fail conflict policy when creating runtime from command contributions', () => {
    const repository = new InMemoryWorkspaceFileRepository([]);
    const onCommandConflict = vi.fn();

    expect(() =>
      createWorkbenchExtensionRuntimeFromContributions({
        repository,
        commandContributions: [
          {
            commands: [
              { id: 'ping', label: 'First' },
              { id: 'ping', label: 'Duplicate' },
            ],
          },
        ],
        commandConflictPolicy: 'hard-fail',
        onCommandConflict,
      }),
    ).toThrow('Duplicate command IDs are not allowed: ping -> duplicate indices: [0, 1]');
    expect(onCommandConflict).toHaveBeenCalledTimes(1);
  });

  it('reports command conflicts without hard-fail when policy is last-write-wins', () => {
    const repository = new InMemoryWorkspaceFileRepository([]);
    const onCommandConflict = vi.fn();
    const runtime = createWorkbenchExtensionRuntimeFromContributions({
      repository,
      commandContributions: [
        {
          commands: [
            { id: 'ping', label: 'First' },
            { id: 'ping', label: 'Duplicate' },
          ],
        },
      ],
      onCommandConflict,
    });

    expect(onCommandConflict).toHaveBeenCalledTimes(1);
    runtime.dispose();
  });

  it('preflights command contribution conflicts and still builds last-write-wins registry', () => {
    const result = preflightCommandContributionConflict([
      {
        commands: [
          { id: 'ping', label: 'First' },
          { id: 'ping', label: 'Duplicate' },
          { id: 'other', label: 'Other' },
        ],
      },
    ]);

    expect(result.commandConflicts).toHaveLength(1);
    expect(result.commandConflicts[0]).toMatchObject({ commandId: 'ping' });
    expect(result.commandRegistry.get('ping')?.label).toBe('Duplicate');
    expect(result.commandRegistry.get('other')?.label).toBe('Other');
  });

  it('resolves hard-fail startup policy only when contribution preflight is conflict-free', () => {
    const cleanPolicy = resolveCommandContributionConflictPolicy([
      {
        commands: [
          { id: 'ping', label: 'First' },
          { id: 'other', label: 'Other' },
        ],
      },
    ]);
    expect(cleanPolicy.shouldUseHardFail).toBe(true);
    expect(cleanPolicy.conflictPolicy).toBe('hard-fail');

    const conflictPolicy = resolveCommandContributionConflictPolicy([
      {
        commands: [
          { id: 'ping', label: 'First' },
          { id: 'ping', label: 'Duplicate' },
        ],
      },
    ]);
    expect(conflictPolicy.shouldUseHardFail).toBe(false);
    expect(conflictPolicy.conflictPolicy).toBe('last-write-wins');
  });

  it('auto mode resolves to hard-fail only when no conflicts are detected', () => {
    const repository = new InMemoryWorkspaceFileRepository([]);

    const cleanRuntime = createWorkbenchExtensionRuntimeFromContributionsAuto({
      repository,
      commandContributions: [
        {
          commands: [
            { id: 'ping', label: 'First' },
            { id: 'other', label: 'Other' },
          ],
        },
      ],
      commandConflictPolicy: 'auto',
    });
    expect(cleanRuntime).toBeDefined();
    cleanRuntime.dispose();

    const onCommandConflict = vi.fn();

    const conflictRuntime = createWorkbenchExtensionRuntimeFromContributionsAuto({
      onCommandConflict,
      repository,
      commandContributions: [
        {
          commands: [
            { id: 'ping', label: 'First' },
            { id: 'ping', label: 'Duplicate' },
          ],
        },
      ],
      commandConflictPolicy: 'auto',
    });

    expect(onCommandConflict).toHaveBeenCalledTimes(1);
    conflictRuntime.dispose();
  });
});
