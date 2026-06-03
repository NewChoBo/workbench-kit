import { describe, expect, it } from 'vitest';
import {
  type ChatStreamEvent,
  type ChatTransport,
  type ChatTransportListener,
  type WorkspaceFile,
  type WorkspaceFileRepository,
  type WorkspacePatchApplyResult,
  isSaveSuccess,
} from '@newchobo-ui/contracts';
import { WorkbenchChatService, WorkspacePatchService, WorkspaceSaveService } from './index';

class InMemoryWorkspaceFileRepository implements WorkspaceFileRepository {
  private files = new Map<string, WorkspaceFile>();

  async deleteFile(path: string) {
    this.files.delete(path);
  }

  async getFile(path: string) {
    return this.files.get(path) ?? null;
  }

  async listFiles() {
    return [...this.files.values()];
  }

  async writeFile(input: {
    content: string;
    expectedUpdatedAt?: string;
    mimeType?: string;
    path: string;
    source?: WorkspaceFile['source'];
    updatedAt?: string;
  }) {
    const next: WorkspaceFile = {
      content: input.content,
      mimeType: input.mimeType,
      path: input.path,
      source: input.source,
      updatedAt: input.updatedAt,
    };

    this.files.set(input.path, next);
    return next;
  }
}

class MockChatTransport implements ChatTransport {
  private readonly listeners = new Set<ChatTransportListener>();

  cancel() {}

  async sendMessage(_message: string, _options?: Record<string, unknown>) {
    return {
      content: 'assistant echo',
      id: 'assistant',
      source: 'assistant' as const,
    };
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

describe('service flow integration', () => {
  it('routes workspace-patch events to patch service then allows deterministic save follow-up', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    let requestCounter = 0;
    const requestId = () => `result-${++requestCounter}`;
    const patchService = new WorkspacePatchService({
      repository,
      now: () => '2026-06-03T00:00:00.000Z',
      requestId,
    });
    const saveService = new WorkspaceSaveService({
      repository,
      now: () => '2026-06-03T00:00:00.001Z',
      requestId,
    });
    const transport = new MockChatTransport();
    let patchResult: Promise<WorkspacePatchApplyResult> | undefined;

    const chatService = new WorkbenchChatService({
      transport,
      onPatch: (patch) => {
        patchResult = patchService.applyPatch(patch);
      },
    });

    const patched: ChatStreamEvent = {
      patch: {
        content: 'runtime content',
        path: 'docs/runtime-notes.md',
        type: 'write-file',
      },
      type: 'workspace-patch',
    };

    transport.emit(patched);
    const resolvedPatchResult = await patchResult!;

    expect(resolvedPatchResult).toMatchObject({
      type: 'patch:applied',
      patch: { path: 'docs/runtime-notes.md', type: 'write-file' },
      requestId: 'result-1',
      requestedAt: '2026-06-03T00:00:00.000Z',
    });

    const patchFile = await repository.getFile('docs/runtime-notes.md');
    expect(patchFile).toMatchObject({
      content: 'runtime content',
      path: 'docs/runtime-notes.md',
      updatedAt: '2026-06-03T00:00:00.000Z',
    });

    const saveResult = await saveService.saveDraft({
      content: 'runtime content',
      path: 'docs/runtime-notes.md',
      previousUpdatedAt: patchFile?.updatedAt,
    });

    expect(isSaveSuccess(saveResult)).toBe(true);
    expect(saveResult).toMatchObject({
      kind: 'save:success',
      outcome: 'unchanged',
      file: { path: 'docs/runtime-notes.md', content: 'runtime content' },
      requestId: 'result-2',
      requestedAt: '2026-06-03T00:00:00.001Z',
    });

    chatService.dispose();
  });
});
