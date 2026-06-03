import {
  isWorkspacePatchDeleteFile,
  type WorkspaceFile,
  type WorkspaceFileRepository,
  type WorkspacePatchApplyResult,
  type WorkspacePatchEvent,
  type WorkspacePatchSource,
  type WorkspacePatchWriteFile,
} from '@newchobo-ui/contracts';
import { normalizeServiceWorkspacePath } from './path';

export interface WorkspacePatchServiceOptions {
  repository: WorkspaceFileRepository;
  now?: () => string;
}

export class WorkspacePatchService {
  private readonly repository: WorkspaceFileRepository;
  private readonly now: () => string;

  constructor({ now = () => new Date().toISOString(), repository }: WorkspacePatchServiceOptions) {
    this.now = now;
    this.repository = repository;
  }

  async applyPatch(patch: WorkspacePatchEvent): Promise<WorkspacePatchApplyResult> {
    const path = this.normalizePath(patch.path);
    const normalizedPatch = {
      ...patch,
      path,
    } as WorkspacePatchEvent;
    if (!path) {
      return {
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
            code: 'not-found',
            message: `No file exists at '${path}'.`,
            patch: normalizedPatch,
            type: 'patch:failed',
          };
        }
      } catch (error) {
        return {
          code: 'unknown',
          message: this.normalizeError(error),
          patch: normalizedPatch,
          type: 'patch:failed',
        };
      }

      try {
        await this.repository.deleteFile(path);
        return {
          patch: normalizedPatch,
          type: 'patch:applied',
        };
      } catch (error) {
        return {
          code: 'unknown',
          message: this.normalizeError(error),
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
        patch: normalizedPatch,
        type: 'patch:applied',
      };
    } catch (error) {
      return {
        code: 'unknown',
        message: this.normalizeError(error),
        patch: normalizedPatch,
        type: 'patch:failed',
      };
    }
  }

  private normalizePath(path: string) {
    return normalizeServiceWorkspacePath(path);
  }

  private normalizeError(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown repository error';
  }
}

function normalizePatchSource(source: WorkspacePatchSource | undefined): WorkspaceFile['source'] {
  return source === 'assistant' || source === 'user' ? source : undefined;
}
