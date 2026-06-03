import {
  isWorkspacePatchDeleteFile,
  type WorkspaceFile,
  type WorkspaceFileRepository,
  type WorkspacePatchApplyResult,
  type WorkspacePatchEvent,
  type WorkspacePatchSource,
  type WorkspacePatchWriteFile,
  normalizeServiceFailureMessage,
} from '@newchobo-ui/contracts';
import { normalizeServiceWorkspacePath } from './path';

let patchRequestCounter = 0;

export interface WorkspacePatchServiceOptions {
  repository: WorkspaceFileRepository;
  now?: () => string;
  requestId?: () => string;
}

export class WorkspacePatchService {
  private readonly repository: WorkspaceFileRepository;
  private readonly now: () => string;
  private readonly requestId: () => string;

  constructor({
    now = () => new Date().toISOString(),
    requestId = defaultRequestId,
    repository,
  }: WorkspacePatchServiceOptions) {
    this.now = now;
    this.repository = repository;
    this.requestId = requestId;
  }

  async applyPatch(patch: WorkspacePatchEvent): Promise<WorkspacePatchApplyResult> {
    const requestMetadata = this.createRequestMetadata();
    const path = this.normalizePath(patch.path);
    const normalizedPatch = {
      ...patch,
      path,
    } as WorkspacePatchEvent;
    if (!path) {
      return {
        ...requestMetadata,
        code: 'invalid-path',
        message: 'Patch path is required.',
        patch: normalizedPatch,
        type: 'patch:failed',
      };
    }

    if (isWorkspacePatchDeleteFile(patch)) {
      try {
        const target = await this.repository.getFile(path);
        if (!target) {
          return {
            ...requestMetadata,
            code: 'not-found',
            message: `No file exists at '${path}'.`,
            patch: normalizedPatch,
            type: 'patch:failed',
          };
        }
      } catch (error) {
        return {
          ...requestMetadata,
          code: 'unknown',
          message: normalizeServiceFailureMessage(error),
          patch: normalizedPatch,
          type: 'patch:failed',
        };
      }

      try {
        await this.repository.deleteFile(path);
        return {
          ...requestMetadata,
          patch: normalizedPatch,
          type: 'patch:applied',
        };
      } catch (error) {
        return {
          ...requestMetadata,
          code: 'unknown',
          message: normalizeServiceFailureMessage(error),
          patch: normalizedPatch,
          type: 'patch:failed',
        };
      }
    }

    const writePatch = patch as WorkspacePatchWriteFile;
    const file: WorkspaceFile = {
      content: writePatch.content,
      mimeType: writePatch.mimeType,
      path,
      source: normalizePatchSource(writePatch.source),
      updatedAt: writePatch.updatedAt ?? this.now(),
    };
    try {
      await this.repository.writeFile(file);
      return {
        ...requestMetadata,
        patch: normalizedPatch,
        type: 'patch:applied',
      };
    } catch (error) {
      return {
        ...requestMetadata,
        code: 'unknown',
        message: normalizeServiceFailureMessage(error),
        patch: normalizedPatch,
        type: 'patch:failed',
      };
    }
  }

  private normalizePath(path: string) {
    return normalizeServiceWorkspacePath(path);
  }

  private createRequestMetadata() {
    return {
      requestId: this.requestId(),
      requestedAt: this.now(),
    };
  }
}

function normalizePatchSource(source: WorkspacePatchSource | undefined): WorkspaceFile['source'] {
  return source === 'assistant' || source === 'user' ? source : undefined;
}

function defaultRequestId() {
  patchRequestCounter += 1;
  return `patch-${patchRequestCounter}`;
}
